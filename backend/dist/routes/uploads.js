"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const DEFAULT_UPLOAD_FOLDER = process.env.CLOUDINARY_UPLOAD_FOLDER || 'connections';
function signCloudinaryParams(params) {
    const filteredEntries = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '');
    const toSign = filteredEntries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    const shasum = crypto_1.default.createHash('sha1');
    shasum.update(toSign + CLOUDINARY_API_SECRET);
    return shasum.digest('hex');
}
router.post('/sign', (req, res) => {
    try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
            return res.status(500).json({ error: 'Cloudinary env vars are not configured on the server' });
        }
        const { folder } = (req.body || {});
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Failed to generate signature', message: err?.message });
    }
});
exports.default = router;
//# sourceMappingURL=uploads.js.map