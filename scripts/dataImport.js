/**
 * AI Forum – Data Import Utility
 * Fetches the Google Sheet as CSV and generates data/logos.json
 * Usage: node scripts/dataImport.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SHEET_ID = '1aQH6PiNEq4sL9Mwxws_4bPJun7wp07sR7xaXKQWCMDE';
const GID      = '683717226';
const CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

// ── HTTP fetch with redirect support ─────────────────────────────────────────
function fetchUrl(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    let hops = 0;
    function get(u) {
      https.get(u, (res) => {
        const { statusCode, headers } = res;
        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          if (++hops > maxRedirects) return reject(new Error('Too many redirects'));
          return get(headers.location);
        }
        if (statusCode !== 200) {
          return reject(new Error(`HTTP ${statusCode} fetching ${u}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end',  () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

// ── RFC 4180 CSV parser ───────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch   = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"')             { inQuotes = false; }
      else                             { cell += ch; }
    } else {
      if      (ch === '"')  { inQuotes = true; }
      else if (ch === ',')  { row.push(cell); cell = ''; }
      else if (ch === '\r' && next === '\n') {
        row.push(cell); rows.push(row); row = []; cell = ''; i++;
      } else if (ch === '\n') {
        row.push(cell); rows.push(row); row = []; cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ── Normalise a column name ───────────────────────────────────────────────────
function normalizeKey(raw) {
  return raw.trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
}

// ── Loose date-like check (DD/MM/YYYY HH:MM:SS) ──────────────────────────────
const TIMESTAMP_RE = /^\d{1,2}\/\d{1,2}\/\d{4}/;

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let csv;
  try {
    csv = await fetchUrl(CSV_URL);
  } catch (err) {
    console.error(`❌ Cannot access the Google Sheet: ${err.message}`);
    console.error('   Make sure it is shared as "Anyone with the link → Viewer".');
    process.exit(1);
  }

  const allRows = parseCsv(csv);
  if (allRows.length < 2) {
    console.error('❌ Sheet appears empty or unreadable.');
    process.exit(1);
  }

  // Raw header row
  const rawHeaders = allRows[0];
  const keys       = rawHeaders.map(normalizeKey);

  // Find important column indices
  const emailIdx     = keys.findIndex(k => k.includes('email'));
  const tsIdx        = keys.findIndex(k => k.includes('timestamp'));

  const results  = [];
  const seenEmail = new Set();

  for (let r = 1; r < allRows.length; r++) {
    const cols = allRows[r];

    // Skip completely empty rows
    if (cols.every(c => c.trim() === '')) continue;

    // Require a valid timestamp-like value in the timestamp column
    const ts = tsIdx >= 0 ? (cols[tsIdx] || '').trim() : '';
    if (!TIMESTAMP_RE.test(ts)) continue;

    // Build object
    const obj = {};
    for (let c = 0; c < keys.length; c++) {
      const raw = (cols[c] !== undefined ? cols[c] : '').trim();
      obj[keys[c]] = raw === '' ? null : raw;
    }

    // Deduplicate on email
    if (emailIdx >= 0) {
      const email = (cols[emailIdx] || '').trim().toLowerCase();
      if (!email) continue;          // skip rows without an email
      if (seenEmail.has(email)) continue;
      seenEmail.add(email);
    }

    results.push(obj);
  }

  // Write output
  const outDir  = path.resolve(__dirname, '..', 'data');
  await fs.promises.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'logos.json');
  await fs.promises.writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');

  console.log(`✅ Imported ${results.length} records → ${outFile}`);
}

main();
