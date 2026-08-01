const Logo = require('../models/Logo');

const generateAnonymousCode = async () => {
  try {
    const totalLogos = await Logo.countDocuments();
    const nextNum = totalLogos + 1;
    const formattedNum = String(nextNum).padStart(3, '0');
    return `AI-${formattedNum}`;
  } catch (error) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `AI-${randomSuffix}`;
  }
};

module.exports = { generateAnonymousCode };
