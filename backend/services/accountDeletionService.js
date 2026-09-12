const User = require('../models/UserDetails');
const Message = require('../models/Message');
const Fellowship = require('../models/Fellowship');
const PrayerRequest = require('../models/PrayerRequest');
const ForumQuestion = require('../models/ForumQuestion');
const Post = require('../models/Post');
const MessageNote = require('../models/MessageNote');
const ReadingStat = require('../models/ReadingStat');
const StandaloneReminder = require('../models/StandaloneReminder');
const FastingPlan = require('../models/FastingPlan');
const GeneratedPdf = require('../models/GeneratedPdf');
const Invite = require('../models/Invite');
const Organization = require('../models/Organization');

/**
 * Deleting a member's account without leaving holes in everyone else's.
 *
 * Google Play requires that an app offering account creation also lets the
 * user delete that account from inside the app.
 *
 * Authored content is NOT deleted, for two reasons. Practically, `sender` on
 * Message and `user` on PrayerRequest/ForumQuestion are `required: true`, so
 * they cannot be set to null. Editorially, removing one member's messages
 * tears holes in conversations that belong to everybody in the fellowship.
 *
 * So the content is re-pointed at a single shared tombstone account. Nothing
 * personal survives — the name shows as "Deleted member" — while `populate()`
 * keeps working everywhere and no screen has to learn to render a null author.
 */

/**
 * How long a member has to change their mind.
 *
 * Deletion is irreversible once it runs, and people ask for it in a bad hour.
 * The request is recorded, the account stays usable, and nothing is destroyed
 * until the period has run out.
 */
const GRACE_PERIOD_DAYS = 7;

/** Reserved TLD (RFC 2606), so nobody can ever register it and sign in as this. */
const TOMBSTONE_EMAIL = 'deleted-member@youthroom.invalid';
const TOMBSTONE_NAME = 'Deleted member';

/**
 * The shared stand-in author. Created on first use.
 *
 * It has no password and no memberships, so it cannot be logged into and is
 * never returned by an organization's member list.
 */
async function getTombstoneUser() {
  const existing = await User.findOne({ email: TOMBSTONE_EMAIL });
  if (existing) return existing;

  return User.create({
    name: TOMBSTONE_NAME,
    email: TOMBSTONE_EMAIL,
    memberships: [],
    activeOrganizationId: null,
  });
}

/**
 * Reasons an account cannot be deleted yet.
 *
 * Letting the last admin of an organization delete themselves would strand
 * every other member with nobody able to administer it, so this refuses and
 * says what to do instead.
 */
async function findDeletionBlockers(user) {
  const blockers = [];

  if (user.globalRole === 'SuperAdmin') {
    blockers.push(
      'This is a super-admin account. Contact support so the role can be handed over first.'
    );
  }

  const adminOrgIds = (user.memberships || [])
    .filter(m => m.role === 'Admin' && m.isActive !== false)
    .map(m => m.organization);

  for (const orgId of adminOrgIds) {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      memberships: { $elemMatch: { organization: orgId, role: 'Admin', isActive: { $ne: false } } },
    });

    if (otherAdmins === 0) {
      const org = await Organization.findById(orgId).select('name');
      blockers.push(
        `You are the only admin of "${org?.name || 'an organization'}". ` +
        'Make someone else an admin first, or delete the organization.'
      );
    }
  }

  return blockers;
}

/**
 * Erases the account and hands its authored content to the tombstone user.
 *
 * The order matters: everything that references the user is rewritten first
 * and the account document is removed last. A failure part-way therefore
 * leaves the account intact and the whole thing safe to retry, rather than
 * stranding content that points at a user who no longer exists.
 */
async function deleteAccount(user) {
  const userId = user._id;
  const tombstone = await getTombstoneUser();
  const tombstoneId = tombstone._id;

  // 1. Re-point authored content at the tombstone. senderName is denormalised
  //    on Message, so it has to be overwritten too or the old name stays
  //    visible in the chat history.
  await Message.updateMany(
    { sender: userId },
    { $set: { sender: tombstoneId, senderName: TOMBSTONE_NAME } }
  );
  await PrayerRequest.updateMany({ user: userId }, { $set: { user: tombstoneId } });
  await ForumQuestion.updateMany({ user: userId }, { $set: { user: tombstoneId } });
  await ForumQuestion.updateMany(
    { 'answers.user': userId },
    { $set: { 'answers.$[a].user': tombstoneId } },
    { arrayFilters: [{ 'a.user': userId }] }
  );
  await Post.updateMany({ user: userId }, { $set: { user: tombstoneId } });
  // Q&A answers carry a denormalised username alongside the reference.
  await Message.updateMany(
    { 'qnaData.answers.user': userId },
    { $set: { 'qnaData.answers.$[a].user': tombstoneId, 'qnaData.answers.$[a].username': TOMBSTONE_NAME } },
    { arrayFilters: [{ 'a.user': userId }] }
  );
  await Fellowship.updateMany({ createdBy: userId }, { $set: { createdBy: tombstoneId } });
  await Organization.updateMany({ createdBy: userId }, { $set: { createdBy: tombstoneId } });
  await Invite.updateMany({ invitedBy: userId }, { $set: { invitedBy: tombstoneId } });

  // 2. Remove the traces that are merely participation rather than authorship.
  //    These are pulled instead of re-pointed: rolling one person's reactions
  //    and read receipts into the tombstone would inflate everyone's counts.
  await Fellowship.updateMany({}, { $pull: { members: { user: userId } } });
  await Message.updateMany({}, { $pull: { readBy: userId } });
  await Message.updateMany({}, { $pull: { reactions: { user: userId } } });
  await Message.updateMany(
    {},
    { $pull: { 'pollData.options.$[].votes': userId } }
  );
  await PrayerRequest.updateMany({}, { $pull: { prayedBy: userId } });
  await Post.updateMany({}, { $pull: { likedBy: String(userId) } });

  // 3. Delete what is private to this person and meaningless to anyone else.
  await Promise.all([
    MessageNote.deleteMany({ user: userId }),
    ReadingStat.deleteMany({ user: userId }),
    StandaloneReminder.deleteMany({ user: userId }),
    FastingPlan.deleteMany({ user: userId }),
    GeneratedPdf.deleteMany({ createdBy: userId }),
  ]);

  // 4. Finally the account itself. Everything above is idempotent, so a retry
  //    after a failure here is harmless.
  await User.deleteOne({ _id: userId });
}

/** The moment a request made now would be carried out. */
function deletionDueDate(requestedAt) {
  const due = new Date(requestedAt);
  due.setDate(due.getDate() + GRACE_PERIOD_DAYS);
  return due;
}

/** Records the request. Nothing is destroyed here. */
async function scheduleDeletion(user) {
  const requestedAt = new Date();
  await User.updateOne({ _id: user._id }, { $set: { deletionRequestedAt: requestedAt } });
  return { requestedAt, scheduledFor: deletionDueDate(requestedAt) };
}

/** Takes the request back. Safe to call when none is outstanding. */
async function cancelDeletion(user) {
  await User.updateOne({ _id: user._id }, { $set: { deletionRequestedAt: null } });
}

/**
 * Erases every account whose grace period has run out.
 *
 * Accounts are handled one at a time rather than in one sweeping query: each
 * deletion touches a dozen collections, and one failure must not stop the
 * others from being processed.
 */
async function purgeDueAccounts() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GRACE_PERIOD_DAYS);

  const due = await User.find({ deletionRequestedAt: { $ne: null, $lte: cutoff } });
  let deleted = 0;

  for (const user of due) {
    try {
      await deleteAccount(user);
      deleted++;
    } catch (err) {
      console.error(`[Deletion] Failed to purge account ${user._id}:`, err.message);
    }
  }

  return { considered: due.length, deleted };
}

module.exports = {
  GRACE_PERIOD_DAYS,
  deletionDueDate,
  scheduleDeletion,
  cancelDeletion,
  purgeDueAccounts,
  TOMBSTONE_EMAIL,
  TOMBSTONE_NAME,
  findDeletionBlockers,
  deleteAccount,
};
