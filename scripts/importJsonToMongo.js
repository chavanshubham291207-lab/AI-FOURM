const path = require('path');
const fs = require('fs');

const serverDir = path.join(__dirname, '..', 'server');
require(path.join(serverDir, 'node_modules', 'dotenv')).config({ path: path.join(serverDir, '.env') });

const connectDB = require(path.join(serverDir, 'config', 'db'));
const mongoose = require(path.join(serverDir, 'node_modules', 'mongoose'));
const QRCode = require(path.join(serverDir, 'node_modules', 'qrcode'));

const Logo = require(path.join(serverDir, 'models', 'Logo'));

async function importJsonToMongo() {
  console.log('🔌 Initializing Database Connection...');
  await connectDB();

  // Safely drop problematic legacy indexes on logos collection if they exist
  try {
    const collection = mongoose.connection.collection('logos');
    const indexes = await collection.indexes();
    const indexNames = indexes.map(idx => idx.name);

    if (indexNames.includes('studentId_1')) {
      await collection.dropIndex('studentId_1');
      console.log('🧹 Dropped legacy index: studentId_1');
    }
    if (indexNames.includes('localFileName_1')) {
      await collection.dropIndex('localFileName_1');
      console.log('🧹 Dropped legacy index: localFileName_1');
    }
    if (indexNames.includes('driveFileId_1')) {
      await collection.dropIndex('driveFileId_1');
      console.log('🧹 Dropped legacy index: driveFileId_1');
    }
  } catch (err) {
    // ignore index drop errors if collection doesn't exist yet
  }

  const jsonPath = path.join(__dirname, '..', 'data', 'logos.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(rawData);
  console.log(`📋 Found ${items.length} records in data/logos.json`);

  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const email = item.email_address ? item.email_address.trim().toLowerCase() : null;
    const studentName = item.name_of_the_participant ? item.name_of_the_participant.trim() : 'Anonymous';
    const studentDepartment = item.branch ? item.branch.trim() : 'General';
    const description = item.description_of_logo_tagline ? item.description_of_logo_tagline.trim() : `Logo submission by ${studentName}`;
    const image = item.logo_file ? item.logo_file.trim() : 'https://via.placeholder.com/300?text=Logo+Entry';
    const title = studentName !== 'Anonymous' ? `${studentName}'s Logo` : `Logo Entry #${i + 1}`;

    // Extract driveFileId if available & format direct image URL
    let driveFileId = null;
    let formattedImage = image;
    if (image.includes('id=')) {
      const match = image.match(/id=([a-zA-Z0-9_-]+)/);
      if (match) driveFileId = match[1];
    } else if (image.includes('/d/')) {
      const match = image.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) driveFileId = match[1];
    }
    const rawImage = image;

    // Check if logo entry already exists
    let existingLogo = null;
    if (email) {
      existingLogo = await Logo.findOne({ studentEmail: email });
    }
    if (!existingLogo && driveFileId) {
      existingLogo = await Logo.findOne({ driveFileId });
    }

    if (existingLogo) {
      existingLogo.studentName = studentName;
      existingLogo.studentDepartment = studentDepartment;
      existingLogo.description = description;
      existingLogo.image = rawImage;
      existingLogo.title = title;
      if (driveFileId) existingLogo.driveFileId = driveFileId;

      if (!existingLogo.qrCode) {
        const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
        const qrData = `${clientOrigin}/vote-logo/${existingLogo._id}`;
        existingLogo.qrCode = await QRCode.toDataURL(qrData);
      }

      await existingLogo.save();
      updatedCount++;
    } else {
      const anonymousCode = `LOGO-${String(i + 1)}`;

      const newLogo = new Logo({
        title,
        description,
        image: rawImage,
        studentName,
        studentEmail: email || `student_${Date.now()}_${i}@jspmrscoe.edu.in`,
        studentDepartment,
        driveFileId: driveFileId || undefined,
        anonymousCode,
        status: 'approved'
      });

      await newLogo.save();

      const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
      const qrData = `${clientOrigin}/vote-logo/${newLogo._id}`;
      newLogo.qrCode = await QRCode.toDataURL(qrData);
      await newLogo.save();

      importedCount++;
    }
  }

  console.log(`🎉 Success! Imported ${importedCount} new logos, updated ${updatedCount} existing logos in MongoDB.`);
  await mongoose.disconnect();
}

importJsonToMongo().catch((err) => {
  console.error('❌ Import failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
