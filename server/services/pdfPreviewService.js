const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PNG } = require('pngjs');

/**
 * Extract embedded image from PDF Page 1 data using pdfjs-dist and pngjs
 *
 * @param {Buffer} pdfBuffer - Raw PDF file buffer
 * @returns {Promise<Buffer|null>} PNG image buffer or null
 */
async function extractPage1ImageFromPdfBuffer(pdfBuffer) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdfDoc = await loadingTask.promise;

    if (pdfDoc.numPages <= 0) return null;

    const page = await pdfDoc.getPage(1);
    const operatorList = await page.getOperatorList();

    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];

      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
        const imgName = args[0];
        const imgObj = await new Promise((resolve) => page.objs.get(imgName, resolve));

        if (imgObj && imgObj.data && imgObj.width > 0 && imgObj.height > 0) {
          const width = imgObj.width;
          const height = imgObj.height;
          const png = new PNG({ width, height });
          const rawData = imgObj.data;

          if (rawData.length === width * height * 4) {
            // Direct RGBA buffer
            png.data = Buffer.from(rawData);
          } else if (rawData.length === width * height * 3) {
            // RGB to RGBA buffer conversion
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 3;
                const dstIdx = (y * width + x) * 4;
                png.data[dstIdx] = rawData[srcIdx];         // Red
                png.data[dstIdx + 1] = rawData[srcIdx + 1]; // Green
                png.data[dstIdx + 2] = rawData[srcIdx + 2]; // Blue
                png.data[dstIdx + 3] = 255;                // Alpha
              }
            }
          } else {
            continue;
          }

          return PNG.sync.write(png);
        }
      }
    }
  } catch (err) {
    console.error('[PDFjs Extract Error]:', err.message);
  }
  return null;
}

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

  const errors = [];

  // Strategy A: If Google Drive File ID present, try Google Drive Thumbnail CDN APIs
  if (fileId) {
    const driveThumbnailUrls = [
      { name: 'Drive Thumbnail API (1200px)', url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` },
      { name: 'Google LH3 CDN (1200px)', url: `https://lh3.googleusercontent.com/d/${fileId}=w1200` }
    ];

    for (const ep of driveThumbnailUrls) {
      try {
        const response = await axios.get(ep.url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
            console.log(`✅ Cached Page 1 preview for logo ${logoIdStr} via ${ep.name} (${buffer.length} bytes)`);
            return previewPath;
          }
        }
      } catch (err) {
        errors.push(`${ep.name}: ${err.message}`);
      }
    }

    // Strategy B: Direct PDF Download & Page 1 Extraction for Google Drive PDFs
    const pdfDownloadUrls = [
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
      `https://drive.google.com/uc?export=download&id=${fileId}`
    ];

    for (const downloadUrl of pdfDownloadUrls) {
      try {
        const pdfRes = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (pdfRes.status === 200 && pdfRes.data && pdfRes.data.length > 500) {
          const buffer = Buffer.from(pdfRes.data);
          const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;

          if (isPdf) {
            const pngBuffer = await extractPage1ImageFromPdfBuffer(buffer);
            if (pngBuffer && pngBuffer.length > 500) {
              fs.writeFileSync(previewPath, pngBuffer);
              console.log(`🎉 Extracted & Cached Page 1 PNG preview for logo ${logoIdStr} (${pngBuffer.length} bytes)`);
              return previewPath;
            } else {
              errors.push(`Drive PDF Download (${downloadUrl}): Page 1 image extraction failed`);
            }
          }
        }
      } catch (err) {
        errors.push(`Drive PDF Download (${downloadUrl}): ${err.message}`);
      }
    }
  }

  // Strategy C: Local File Upload (.pdf or image)
  if (targetUrl.includes('/uploads/')) {
    const fileName = targetUrl.split('/uploads/').pop();
    const localPath = path.join(__dirname, '..', 'uploads', fileName);

    if (fs.existsSync(localPath)) {
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        return localPath; // Non-PDF image file
      }

      try {
        const localPdfBuffer = fs.readFileSync(localPath);
        const pngBuffer = await extractPage1ImageFromPdfBuffer(localPdfBuffer);
        if (pngBuffer && pngBuffer.length > 500) {
          fs.writeFileSync(previewPath, pngBuffer);
          console.log(`🎉 Extracted Page 1 PNG preview from local PDF ${fileName} (${pngBuffer.length} bytes)`);
          return previewPath;
        }
      } catch (err) {
        errors.push(`Local PDF extraction (${fileName}): ${err.message}`);
      }
    } else {
      errors.push(`Local file not found on disk: ${localPath}`);
    }
  }

  // Log exact error details for debugging
  console.error(`❌ PDF preview generation failed for logo ${logoIdStr} (${logo.title || 'Untitled'}):`);
  errors.forEach(e => console.error(`   - ${e}`));

  return null;
}

module.exports = {
  getOrGeneratePdfPreview
};
