require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const Book = require('../models/Book');
const Post = require('../models/Post');
const MessageNote = require('../models/MessageNote');

// A just-uploaded asset that no document references yet can be cleaned up by
// whoever is holding the upload screen. Keep the window short.
const ORPHAN_GRACE_MS = 15 * 60 * 1000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Derives the Cloudinary public id from a delivery URL.
 * Mirrors the extraction bookController.deleteBook uses.
 */
const publicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const parts = url.split('/');
  const versionIndex = parts.findIndex(p => p.startsWith('v') && /^\d+$/.test(p.substring(1)));
  const tail = versionIndex !== -1 && versionIndex < parts.length - 1
    ? parts.slice(versionIndex + 1).join('/')
    : parts[parts.length - 1];
  return tail.split('.')[0] || null;
};

/**
 * Confirms the caller is allowed to destroy this asset, by finding a document
 * they own (or administer, within their own org) that actually references it.
 *
 * Without this the endpoint took any public id and destroyed it — letting any
 * signed-in user wipe every image and video in the account, across all tenants.
 */
const callerOwnsAsset = async (req, publicId) => {
  const { user, orgId, orgRole } = req;

  // The caller's own profile image.
  if (publicIdFromUrl(user.image) === publicId) return true;

  // Voice notes and attachments on the caller's own sermon notes.
  const ownNotes = await MessageNote.find({ user: user._id }).select('voiceNotes').lean();
  const ownsVoiceNote = ownNotes.some(n =>
    (n.voiceNotes || []).some(v => publicIdFromUrl(v.uri) === publicId)
  );
  if (ownsVoiceNote) return true;

  // Book and post imagery in the caller's own organization — admin-managed,
  // so only admins of that org (and platform SuperAdmins) may remove it.
  const isOrgAdmin = orgRole === 'Admin' || user.globalRole === 'SuperAdmin';
  if (isOrgAdmin && orgId) {
    const books = await Book.find({ organization: orgId })
      .select('cover_image thumbnail1 thumbnail2').lean();
    const bookMatch = books.some(b =>
      [b.cover_image, b.thumbnail1, b.thumbnail2].some(u => publicIdFromUrl(u) === publicId)
    );
    if (bookMatch) return true;

    const posts = await Post.find({ organization: orgId }).select('imageUrl').lean();
    if (posts.some(p => publicIdFromUrl(p.imageUrl) === publicId)) return true;
  }

  return false;
};

/**
 * Several screens upload to Cloudinary first and save the document afterwards,
 * then delete the orphan if the user cancels. Nothing references those assets
 * yet, so ownership cannot be proven — allow them only while they are brand new.
 */
const isFreshOrphan = async (publicId, resourceType) => {
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    const age = Date.now() - new Date(resource.created_at).getTime();
    return age >= 0 && age < ORPHAN_GRACE_MS;
  } catch (_) {
    // Missing asset, or no permission to read it — deny.
    return false;
  }
};

/**
 * Issues a short-lived signature so the client can upload directly to
 * Cloudinary WITHOUT an unsigned upload preset in the app bundle.
 *
 * Unsigned presets are readable from a shipped APK, which lets anyone upload
 * arbitrary files into the account. Signing here means the server decides the
 * folder and the expiry, and the API secret never leaves the server.
 *
 * The folder is derived from the caller's organization and role, never from
 * the request, so one org's uploads cannot be written into another's.
 */
exports.getUploadSignature = async (req, res) => {
  try {
    const { kind } = req.body;

    const FOLDERS = {
      profile: `orgs/${req.orgId}/profiles`,
      post:    `orgs/${req.orgId}/posts`,
      book:    `orgs/${req.orgId}/books`,
      note:    `orgs/${req.orgId}/notes/${req.user._id}`,
      about:   `orgs/${req.orgId}/about`,
    };

    const folder = FOLDERS[kind];
    if (!folder) {
      return res.status(400).json({ status: 'error', data: 'Unknown upload kind.' });
    }

    // Only admins may write org-wide imagery; members upload their own things.
    const adminOnly = ['post', 'book', 'about'];
    const isAdmin = req.orgRole === 'Admin' || req.user.globalRole === 'SuperAdmin';
    if (adminOnly.includes(kind) && !isAdmin) {
      return res.status(403).json({ status: 'error', data: 'Admin access required for this upload.' });
    }

    if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY) {
      return res.status(503).json({ status: 'error', data: 'Uploads are not configured on the server.' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    // Cloudinary signs the alphabetically sorted params, excluding file,
    // api_key, resource_type and cloud_name.
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      status: 'Ok',
      data: {
        signature,
        timestamp,
        folder,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      },
    });
  } catch (error) {
    console.error('getUploadSignature error:', error);
    res.status(500).json({ status: 'error', data: 'Could not prepare the upload.' });
  }
};

exports.deleteImage = async (req, res) => {
  const { publicId, resourceType } = req.body;

  try {
    if (!publicId) {
      return res.status(400).send({ status: "error", data: "Public ID is required" });
    }

    const type = resourceType === 'video' ? 'video' : 'image';

    const allowed = await callerOwnsAsset(req, publicId)
      || await isFreshOrphan(publicId, type);

    if (!allowed) {
      return res.status(403).send({
        status: "error",
        data: "You do not have permission to delete this asset."
      });
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: type });

    if (result.result === 'ok' || result.result === 'not found') {
      // "not found" means it is already gone — the caller's intent is satisfied.
      return res.send({ status: "Ok", data: "Image deleted successfully" });
    }

    res.status(502).send({ status: "error", data: "Failed to delete image" });
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    res.status(500).send({ status: "error", data: "Failed to delete image" });
  }
};
