/**
 * build-pdf-mapping.cjs
 * ────────────────────────────────────────────────────────────
 * Scans per-location PDF drawing files page-by-page, extracts
 * internal page numbers, and maps both:
 *  1) Cabinet names to PDF pages (by standard ranges)
 *  2) I/O Addresses (like I166.2, Q118.1) directly to their
 *     wiring diagram pages.
 * Generates public/data/pdf-page-map.json keyed by locationId.
 * ────────────────────────────────────────────────────────────
 * Usage: node scripts/build-pdf-mapping.cjs
 */

const fs = require('fs');
const path = require('path');
const p = require('pdf-parse');

const DATA_DIR = path.resolve(__dirname, '../../data');
const OUT_PATH = path.resolve(__dirname, '../public/data/pdf-page-map.json');

// ─── Location config: each location has a data subfolder and optional PDF ───
const LOCATIONS = [
  {
    locationId: 'premixer',
    folder: 'Premixer',
    pdfFile: null,                             // No drawing PDF yet
    drawingUrl: null,
    cabinetRanges: [],                         // Will be defined when PDF is added
  },
  {
    locationId: 'tower3',
    folder: 'Tower 3',
    pdfFile: '泰国inteqc Cabinet drawing.pdf',
    drawingUrl: '/drawings/tower3/inteqc_cabinet_drawing.pdf',
    cabinetRanges: [
      { min: 200, max: 299, cabinet: 'MCC2' },
      { min: 300, max: 399, cabinet: 'MCC3' },
      { min: 600, max: 699, cabinet: 'MCC7' },
      { min: 700, max: 899, cabinet: 'MCC8_9' },
      { min: 900, max: 1099, cabinet: 'MCC11' },
      { min: 1100, max: 1399, cabinet: 'MCC12_13' },
      { min: 1400, max: 1599, cabinet: 'MCC18' },
      { min: 1900, max: 1999, cabinet: 'PLC' },
      { min: 2000, max: 2108, cabinet: 'LCB_1' },
      { min: 2109, max: 2199, cabinet: 'LCB_2' },
      { min: 2200, max: 2299, cabinet: 'LCB_4' },
      { min: 2300, max: 2399, cabinet: 'LCB_5' },
      { min: 2400, max: 2499, cabinet: 'LCB_6A' },
      { min: 2500, max: 2599, cabinet: 'LCB_6B' },
      { min: 2600, max: 2699, cabinet: 'LCB_8' },
      { min: 2700, max: 2799, cabinet: 'LCB_9' },
      { min: 2800, max: 2899, cabinet: 'LCB_10' },
    ],
  },
];

function getCabinetForPage(pageNum, ranges) {
  const n = parseInt(pageNum, 10);
  if (isNaN(n)) return null;
  for (const r of ranges) {
    if (n >= r.min && n <= r.max) return r.cabinet;
  }
  return null;
}

async function scanPdf(loc) {
  const pdfPath = path.join(DATA_DIR, loc.folder, loc.pdfFile);

  if (!fs.existsSync(pdfPath)) {
    console.log(`  ⚠ PDF not found: ${pdfPath} — skipping.`);
    return null;
  }

  console.log(`  📂 Reading: ${loc.pdfFile}`);
  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfParser = new p.PDFParse({ data: dataBuffer });
  await pdfParser.load();
  const res = await pdfParser.getText();
  console.log(`  📊 Pages: ${res.pages.length}`);

  const cabinetMap = {};
  const addressMap = {};
  const tempAddressRecords = {};
  const addrRegex = /\b(?:I|Q)\d+\.\d+\b|\b(?:PIW|PQW)\d+\b/g;

  res.pages.forEach(page => {
    const text = page.text;
    const pageNum = page.num;

    const pageMatch = text.match(/页数\s+([0-9a-zA-Z\.\-_]+)/i);
    const internalPageStr = pageMatch ? pageMatch[1].trim() : null;
    if (!internalPageStr) return;

    // A. Cabinet mapping
    const cabinet = getCabinetForPage(internalPageStr, loc.cabinetRanges);
    if (cabinet) {
      if (!cabinetMap[cabinet]) cabinetMap[cabinet] = {};
      cabinetMap[cabinet][internalPageStr] = pageNum;
    }

    // B. Address mapping — prefer wiring diagram pages (lowest internal page number)
    const matches = text.match(addrRegex);
    if (matches) {
      const internalPageNum = parseInt(internalPageStr, 10);
      matches.forEach(addr => {
        const key = addr.toUpperCase();
        if (!tempAddressRecords[key] ||
            (!isNaN(internalPageNum) && internalPageNum < tempAddressRecords[key].internalPage)) {
          tempAddressRecords[key] = {
            pdfPage: pageNum,
            internalPage: isNaN(internalPageNum) ? Infinity : internalPageNum,
            internalPageStr
          };
        }
      });
    }
  });

  // Flatten address records
  const flatAddresses = {};
  for (const [addr, rec] of Object.entries(tempAddressRecords)) {
    flatAddresses[addr] = { page: rec.pdfPage, internalPage: rec.internalPageStr };
  }

  await pdfParser.destroy();

  console.log(`  🔗 Addresses mapped: ${Object.keys(flatAddresses).length}`);
  console.log(`  📦 Cabinets mapped: ${Object.keys(cabinetMap).length}`);

  return {
    drawingUrl: loc.drawingUrl,
    cabinets: cabinetMap,
    addresses: flatAddresses,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  PDF Drawing Page Mapping Builder (V3)         ║');
  console.log('║  Multi-Location Support                        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const output = {};

  for (const loc of LOCATIONS) {
    console.log(`\n📍 ${loc.locationId.toUpperCase()}:`);
    if (!loc.pdfFile) {
      console.log('  ℹ No PDF configured — skipping.');
      continue;
    }
    const result = await scanPdf(loc);
    if (result) {
      output[loc.locationId] = result;
    }
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Output: ${OUT_PATH}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
