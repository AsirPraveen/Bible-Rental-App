import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Uploads a local file to Cloudinary using a server-issued signature.
 *
 * The app no longer carries unsigned upload presets. Anything placed in
 * expo.extra is compiled into the bundle and readable from a shipped APK, so
 * an unsigned preset let anyone upload arbitrary files into the account. Now
 * the server signs each upload, chooses the destination folder from the
 * caller's organization, and keeps the API secret to itself.
 *
 * @param uri   local file uri from the picker or camera
 * @param kind  which folder to write to — the server maps this and enforces
 *              who is allowed to use it
 * @param resourceType 'image' (default) or 'video' for voice notes
 */
export type UploadKind = 'profile' | 'post' | 'book' | 'note' | 'about';

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  uri: string,
  kind: UploadKind,
  resourceType: 'image' | 'video' = 'image'
): Promise<UploadResult> => {
  // 1. Ask the server to authorise this upload.
  const sigRes = await axios.post(`${API_BASE_URL}/api/cloudinary/signature`, { kind });
  if (sigRes.data?.status !== 'Ok') {
    throw new Error(sigRes.data?.data || 'Could not prepare the upload.');
  }
  const { signature, timestamp, folder, apiKey, cloudName } = sigRes.data.data;

  // 2. Send the file straight to Cloudinary with that signature.
  const guessedName = uri.split('/').pop() || (resourceType === 'video' ? 'upload.m4a' : 'upload.jpg');
  const mime = resourceType === 'video' ? 'video/mp4' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: guessedName, type: mime } as any);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
  );

  if (!res.data?.secure_url) {
    throw new Error('Upload failed — no URL returned.');
  }

  return { secureUrl: res.data.secure_url, publicId: res.data.public_id };
};

export default uploadToCloudinary;
