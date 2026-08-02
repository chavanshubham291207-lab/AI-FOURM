const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const Logo = require('../models/Logo');

/**
 * Scan the local logos directory and import any new images into MongoDB.
 * Returns the number of newly imported logos.
 */
async function autoImportLocalLogos() {
  try {
    const localDir = path.join(__dirname, '..', 'uploads', 'logos');
    const uploadsPath = path.join(__dirname, '..', 'uploads');

    // Ensure directories exist
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const files = fs.readdirSync(localDir);
    let newImportCount = 0;

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        continue; // ignore non‑image files
      }

      // Skip if already in DB (based on stored original filename)
      const existing = await Logo.findOne({ localFileName: filename });
      if (existing) continue;

      // Copy to public uploads folder with a unique name
      const cleanFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const destFilename = `local-${Date.now()}-${cleanFileName}`;
      const srcPath = path.join(localDir, filename);
      const destPath = path.join(uploadsPath, destFilename);
      fs.copyFileSync(srcPath, destPath);

      // Derive simple title & student name from filename
      const baseName = path.parse(filename).name.trim();
      const parts = baseName.split(' - ');
      let title = baseName;
      let studentName = 'Anonymous Student';
      if (parts.length > 1) {
        studentName = parts.pop().trim();
        title = parts.join(' - ').trim();
      } else if (baseName.includes(' ')) {
        studentName = baseName;
        title = `${studentName} Design`;
      }

      // Simple deterministic email & department (mirrors manual import logic)
      const cleanName = studentName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const studentEmail = cleanName ? `${cleanName}@jspmrscoe.edu.in` : 'student@jspmrscoe.edu.in';
      const departments = [
        'Computer Engineering',
        'Information Technology',
        'AI & Data Science',
        'Electronics & Telecommunication',
        'Mechanical Engineering'
      ];
      let hash = 0;
      for (let i = 0; i < studentName.length; i++) {
        hash = studentName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const studentDepartment = departments[Math.abs(hash) % departments.length];

      const anonymousCode = `LOGO-${String(count + 1)}`;

      const protocol = 'http'; // dev default
      const host = 'localhost:5001'; // matches server port
      const imageUrl = `${protocol}://${host}/uploads/${destFilename}`;

      const logo = await Logo.create({
        title,
        description: `Imported design entry by ${studentName}.`,
        image: imageUrl,
        localFileName: filename,
        anonymousCode,
        studentName,
        studentEmail,
        studentDepartment,
        status: 'approved'
      });

      // Generate QR code for voting page
      const clientOrigin = `${protocol}://${host}`;
      const qrData = `${clientOrigin}/vote-logo/${logo._id}`;
      logo.qrCode = await QRCode.toDataURL(qrData);
      await logo.save();

      newImportCount++;
    }
    return newImportCount;
  } catch (err) {
    console.error('Automatic logo import failed:', err);
    return 0;
  }
}

/**
 * Import entries from data/logos.json into MongoDB.
 * Returns the number of newly imported logos.
 */
async function autoImportJsonLogos() {
  try {
    const jsonPath = path.join(__dirname, '..', '..', 'data', 'logos.json');
    if (!fs.existsSync(jsonPath)) {
      return 0;
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const items = JSON.parse(rawData);
    let newImportCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const email = item.email_address ? item.email_address.trim().toLowerCase() : null;
      const studentName = item.name_of_the_participant ? item.name_of_the_participant.trim() : 'Anonymous';
      const studentDepartment = item.branch ? item.branch.trim() : 'General';
      const description = item.description_of_logo_tagline ? item.description_of_logo_tagline.trim() : `Logo submission by ${studentName}`;
      const image = item.logo_file ? item.logo_file.trim() : 'https://via.placeholder.com/300?text=Logo+Entry';
      const title = studentName !== 'Anonymous' ? `${studentName}'s Logo` : `Logo Entry #${i + 1}`;

      let driveFileId = null;
      let formattedImage = image;
      if (image.includes('id=')) {
        const match = image.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      } else if (image.includes('/d/')) {
        const match = image.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      }
      if (driveFileId) {
        formattedImage = `https://lh3.googleusercontent.com/d/${driveFileId}`;
      }

      let existing = null;
      if (email) {
        existing = await Logo.findOne({ studentEmail: email });
      }
      if (!existing && driveFileId) {
        existing = await Logo.findOne({ driveFileId });
      }
      const rawImage = image;

      if (existing) {
        // Update fields if changed
        existing.studentName = studentName;
        existing.studentDepartment = studentDepartment;
        existing.description = description;
        existing.image = rawImage;
        existing.title = title;
        if (driveFileId) existing.driveFileId = driveFileId;

        if (!existing.qrCode) {
          const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
          const qrData = `${clientOrigin}/vote-logo/${existing._id}`;
          existing.qrCode = await QRCode.toDataURL(qrData);
        }

        await existing.save();
        continue;
      }

      const anonymousCode = `LOGO-${String(i + 1)}`;

      const logo = await Logo.create({
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

      const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
      const qrData = `${clientOrigin}/vote-logo/${logo._id}`;
      logo.qrCode = await QRCode.toDataURL(qrData);
      await logo.save();

      newImportCount++;
    }

    return newImportCount;
  } catch (err) {
    console.error('Automatic logos.json import failed:', err);
    return 0;
  }
}

module.exports = { autoImportLocalLogos, autoImportJsonLogos };

