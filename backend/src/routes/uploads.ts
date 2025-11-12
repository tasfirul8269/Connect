import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY as string | undefined;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET as string | undefined;
const DEFAULT_UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'connections';

function signCloudinaryParams(params: Record<string, string | number>): string {
  const filteredEntries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '');
  const toSign = filteredEntries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const shasum = crypto.createHash('sha1');
  shasum.update(toSign + CLOUDINARY_API_SECRET);
  return shasum.digest('hex');
}

router.post('/sign', (req, res) => {
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary env vars are not configured on the server' });
    }

    const { folder } = (req.body || {}) as { folder?: string };
    const resolvedFolder = folder && typeof folder === 'string' ? folder : DEFAULT_UPLOAD_FOLDER;

    const timestamp = Math.floor(Date.now() / 1000);
    const params = { folder: resolvedFolder, timestamp };
    const signature = signCloudinaryParams(params);

    return res.json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: resolvedFolder,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate signature', message: err?.message });
  }
});

export default router;