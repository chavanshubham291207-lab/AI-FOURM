const mongoose = require('mongoose');
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const Logo = require('../models/Logo');
const { getOrGeneratePdfPreview } = require('../services/pdfPreviewService');

let uri = process.env.MONGO_URI || 'mongodb+srv://AIFOURM:jspm%402026@cluster00.vujlpwx.mongodb.net/ai-forum?retryWrites=true&w=majority&appName=Cluster00';
if (uri.includes(':jspm@2026@')) {
  uri = uri.replace(':jspm@2026@', ':jspm%402026@');
}

async function testPdfPreviews() {
  console.log('🔄 Connecting to MongoDB to test PDF preview generation...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB Atlas.');

    const logos = await Logo.find();
    console.log(`📋 Found ${logos.length} candidate logo entries.`);

    let successCount = 0;
    let failCount = 0;

    for (const logo of logos.slice(0, 10)) { // test first 10 entries
      const previewPath = await getOrGeneratePdfPreview(logo);
      if (previewPath) {
        successCount++;
        console.log(`  [${logo.anonymousCode}] ${logo.title} -> ${previewPath}`);
      } else {
        failCount++;
        console.warn(`  [${logo.anonymousCode}] ${logo.title} -> Preview unavailable`);
      }
    }

    console.log(`\n🎉 Preview Test Completed: ${successCount} Success, ${failCount} Failed.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

testPdfPreviews();
