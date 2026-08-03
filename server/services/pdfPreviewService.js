const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Ensures that a preview image exists for the given logo.
 * If the preview is already cached on disk, returns its absolute filepath.
 * If not, attempts to generate and save a page 1 PNG preview image.
 *
 * @param {Object} logo - Logo mongoose document or plain object
 * @returns {Promise<string|null>} Absolute filepath to preview image, or null if generation fails
 */
async function getOrGeneratePdfPreview(logo) {
  if (!logo || !logo._id) return null;

  const logoIdStr = logo._id.toString();
  const previewsDir = path.join(__dirname, '..', 'uploads', 'previews');
  const previewPath = path.join(previewsDir, `preview-${logoIdStr}.png`);

  // 1. If cached preview exists and is valid, return cached file path immediately
  if (fs.existsSync(previewPath)) {
    const stats = fs.statSync(previewPath);
    if (stats.size > 500) {
      return previewPath;
    }
  }

  // Ensure previews directory exists
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }

  let fileId = logo.driveFileId;
  const targetUrl = logo.image || logo.rawImage || '';

  // Extract Google Drive File ID if missing
  if (!fileId && targetUrl) {
    if (targetUrl.includes('id=')) {
      const match = targetUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match) fileId = match[1];
    } else if (targetUrl.includes('/d/')) {
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) fileId = match[1];
    }
  }

  // Strategy A: If Google Drive File ID present, fetch high-res Page 1 PNG from Drive Thumbnail API
  if (fileId) {
    const driveThumbnailUrls = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
      `https://lh3.googleusercontent.com/d/${fileId}=w1200`,
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];

    for (const url of driveThumbnailUrls) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 12000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });

        if (response.status === 200 && response.data && response.data.length > 500) {
          const buffer = Buffer.from(response.data);
          const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
          const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8;
          const isWebp = buffer.length > 12 && buffer.toString('utf8', 8, 12) === 'WEBP';
          const contentType = (response.headers['content-type'] || '').toLowerCase();

          if (isPng || isJpg || isWebp || contentType.includes('image')) {
            fs.writeFileSync(previewPath, buffer);
            console.log(`✅ Cached Page 1 preview for logo ${logoIdStr} (${buffer.length} bytes)`);
            return previewPath;
          }
        }
      } catch (err) {
        // Continue to next thumbnail endpoint option
      }
    }
  }

  // Strategy B: If local upload path
  if (targetUrl.includes('/uploads/')) {
    const fileName = targetUrl.split('/uploads/').pop();
    const localPath = path.join(__dirname, '..', 'uploads', fileName);

    if (fs.existsSync(localPath)) {
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        // If it's already an image (PNG/JPG/WEBP), return directly
        return localPath;
      }

      // If it's a local PDF file, try generating preview with pdfjs-dist
      try {
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const pdfData = new Uint8Array(fs.readFileSync(localPath));
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;

        if (pdfDocument.numPages > 0) {
          // Page 1 parsed successfully
          console.log(`📄 Local PDF ${fileName} has ${pdfDocument.numPages} page(s).`);
        }
      } catch (err) {
        console.error(`❌ Local PDF preview generation failed for ${fileName}:`, err.message);
      }
    }
  }

  // Strategy C: Generic Remote Image URL
  if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    try {
      const response = await axios.get(targetUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxRedirects: 5
      });
      if (response.status === 200 && response.data && response.data.length > 500) {
        const contentType = (response.headers['content-type'] || '').toLowerCase();
        if (contentType.includes('image')) {
          fs.writeFileSync(previewPath, Buffer.from(response.data));
          return previewPath;
        }
      }
    } catch (err) {
      console.error(`❌ Remote image fetch failed for logo ${logoIdStr}:`, err.message);
    }
  }

  console.warn(`⚠️ Preview unavailable for logo ${logoIdStr}`);
  return null;
}

module.exports = {
  getOrGeneratePdfPreview
};
