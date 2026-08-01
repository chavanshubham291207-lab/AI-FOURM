// List of blacklisted demo email addresses
const BLACKLISTED_DEMO_EMAILS = [
  'demo@gmail.com',
  'test@gmail.com',
  'example@gmail.com',
  'sample@gmail.com',
  'admin@gmail.com',
  'abc@gmail.com',
  'xyz@gmail.com'
];

// List of blacklisted disposable email domains
const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'temp-mail.org'
];

const validateEmailAddress = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Basic regex check for valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  // Check against blacklisted demo emails
  if (BLACKLISTED_DEMO_EMAILS.includes(cleanEmail)) {
    return { valid: false, message: 'Demo or disposable email addresses are not allowed.' };
  }

  // Extract domain
  const domain = cleanEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, message: 'Demo or disposable email addresses are not allowed.' };
  }

  // Check demo prefixes (e.g., test.user@, demo.account@)
  const localPart = cleanEmail.split('@')[0];
  if (['demo', 'test', 'example', 'sample', 'fake'].includes(localPart)) {
    return { valid: false, message: 'Demo or disposable email addresses are not allowed.' };
  }

  return { valid: true, cleanEmail };
};

module.exports = { validateEmailAddress };
