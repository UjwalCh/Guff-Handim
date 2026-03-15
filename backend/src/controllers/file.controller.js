const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

async function uploadFile(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { file } = req;
    const ext = mime.extension(file.mimetype) || 'bin';
    const relPath = `/${path.relative(path.join(__dirname, '../../'), file.path).replace(/\\/g, '/')}`;

    let thumbnailUrl = null;

    // Generate thumbnail for images
    if (file.mimetype.startsWith('image/')) {
      const thumbName = `thumb_${uuidv4()}.jpg`;
      const thumbPath = path.join(path.dirname(file.path), thumbName);
      await sharp(file.path)
        .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(thumbPath);
      thumbnailUrl = `/${path.relative(path.join(__dirname, '../../'), thumbPath).replace(/\\/g, '/')}`;
    }

    res.json({
      fileUrl: relPath,
      thumbnailUrl,
      fileName: file.originalname || file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
    });
  } catch (err) { next(err); }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const { file } = req;
    const outName = `${uuidv4()}.jpg`;
    const outPath = path.join(path.dirname(file.path), outName);

    // Resize & normalize avatar
    await sharp(file.path)
      .resize(256, 256, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(outPath);

    const relPath = `/${path.relative(path.join(__dirname, '../../'), outPath).replace(/\\/g, '/')}`;
    res.json({ avatarUrl: relPath });
  } catch (err) { next(err); }
}

module.exports = { uploadFile, uploadAvatar };
