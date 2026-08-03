require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const dns = require('dns');

try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const Logo = require('../models/Logo');

let uri = process.env.MONGO_URI || 'mongodb+srv://AIFOURM:jspm%402026@cluster00.vujlpwx.mongodb.net/ai-forum?retryWrites=true&w=majority&appName=Cluster00';
if (uri.includes(':jspm@2026@')) {
  uri = uri.replace(':jspm@2026@', ':jspm%402026@');
}

const targetParticipants = [
  'Pushpendra Ulhas Patil',
  'Sukhiram Sarpa Sastya',
  'Prachi Shivraj Borgaonkar',
  'Ms. Alka Vijaykumar Londhe',
  'Sarthak Sanjay Gaikwad',
  'Rutuja Sushil Chavan',
  'Sakshi Bhagat'
];

async function extractImageFromPdfBuffer(pdfBuffer) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdfDoc = await loadingTask.promise;

    if (pdfDoc.numPages <= 0) return null;

    // Use page containing logo or page 1
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
          const rawData = imgObj.data;

          const rgbaData = Buffer.alloc(width * height * 4);
          if (rawData.length === width * height * 4) {
            rgbaData.set(rawData);
          } else if (rawData.length === width * height * 3) {
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const srcIdx = (y * width + x) * 3;
                const dstIdx = (y * width + x) * 4;
                rgbaData[dstIdx] = rawData[srcIdx];
                rgbaData[dstIdx + 1] = rawData[srcIdx + 1];
                rgbaData[dstIdx + 2] = rawData[srcIdx + 2];
                rgbaData[dstIdx + 3] = 255;
              }
            }
          } else {
            continue;
          }

          // Generate PNG Buffer using PNGJS
          const png = new PNG({ width, height });
          png.data = rgbaData;
          const pngBuffer = PNG.sync.write(png);

          // Generate JPEG Buffer using jpeg-js
          const rawImageData = {
            data: rgbaData,
            width: width,
            height: height
          };
          const jpegBuffer = jpeg.encode(rawImageData, 90).data;

          return { pngBuffer, jpegBuffer, width, height };
        }
      }
    }
  } catch (err) {
    console.error('Extraction error:', err.message);
  }
  return null;
}

async function processPdfParticipants() {
  console.log('🔄 Connecting to MongoDB to process PDF-only participant submissions...');
  const report = [];

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB Atlas.\n');

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const previewsDir = path.join(__dirname, '..', 'uploads', 'previews');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });

    for (const name of targetParticipants) {
      console.log(`--------------------------------------------------`);
      console.log(`Processing Participant: ${name}`);
      console.log(`--------------------------------------------------`);

      const itemReport = {
        name,
        pdfFound: 'No',
        pngGenerated: 'No',
        jpegGenerated: 'No',
        previewUpdated: 'No'
      };

      const logo = await Logo.findOne({
        $or: [
          { studentName: new RegExp(name, 'i') },
          { title: new RegExp(name, 'i') }
        ]
      });

      if (!logo) {
        console.warn(`⚠️ Logo record not found for ${name}`);
        report.push(itemReport);
        continue;
      }

      let fileId = logo.driveFileId;
      const targetUrl = logo.image || logo.rawImage || '';

      if (!fileId && targetUrl) {
        if (targetUrl.includes('id=')) {
          const match = targetUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];
        } else if (targetUrl.includes('/d/')) {
          const match = targetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
          if (match) fileId = match[1];
        }
      }

      if (!fileId) {
        console.warn(`⚠️ File ID not found for ${name}`);
        report.push(itemReport);
        continue;
      }

      // Download raw PDF binary
      const pdfDownloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
      let pdfBuffer = null;

      try {
        console.log(`📥 Downloading PDF submission for ${name} (${fileId})...`);
        const res = await axios.get(pdfDownloadUrl, { responseType: 'arraybuffer', timeout: 20000 });
        if (res.status === 200 && res.data && res.data.length > 500) {
          pdfBuffer = Buffer.from(res.data);
          itemReport.pdfFound = 'Yes';
          console.log(`  ✅ PDF Downloaded (${pdfBuffer.length} bytes)`);
        }
      } catch (err) {
        console.error(`  ❌ Download error: ${err.message}`);
      }

      if (!pdfBuffer) {
        report.push(itemReport);
        continue;
      }

      // Extract image and convert to PNG & JPEG
      const result = await extractImageFromPdfBuffer(pdfBuffer);
      if (result) {
        const logoIdStr = logo._id.toString();
        const pngFilename = `pdf-preview-${logoIdStr}.png`;
        const jpegFilename = `pdf-preview-${logoIdStr}.jpg`;

        const pngPath = path.join(uploadsDir, pngFilename);
        const jpegPath = path.join(uploadsDir, jpegFilename);
        const previewCachePath = path.join(previewsDir, `preview-${logoIdStr}.png`);

        fs.writeFileSync(pngPath, result.pngBuffer);
        itemReport.pngGenerated = 'Yes';
        console.log(`  ✅ Generated PNG Logo: ${pngPath} (${result.pngBuffer.length} bytes)`);

        fs.writeFileSync(jpegPath, result.jpegBuffer);
        itemReport.jpegGenerated = 'Yes';
        console.log(`  ✅ Generated JPEG Logo: ${jpegPath} (${result.jpegBuffer.length} bytes)`);

        fs.writeFileSync(previewCachePath, result.pngBuffer);

        // Preserve rawImage as original PDF link and update image path
        if (!logo.rawImage) {
          logo.rawImage = targetUrl;
        }
        logo.image = `/uploads/${pngFilename}`;
        await logo.save();
        itemReport.previewUpdated = 'Yes';
        console.log(`  ✨ Logo record updated in MongoDB! Image set to /uploads/${pngFilename}`);
      } else {
        console.error(`  ❌ Failed to extract image from PDF for ${name}`);
      }

      report.push(itemReport);
    }

    console.log(`\n==================================================`);
    console.log(`🎉 PDF PARTICIPANT PROCESSING REPORT`);
    console.log(`==================================================`);
    console.table(report);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Processing Error:', error.message);
    process.exit(1);
  }
}

processPdfParticipants();
