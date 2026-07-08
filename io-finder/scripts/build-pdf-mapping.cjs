/**
 * build-pdf-mapping.cjs
 * ────────────────────────────────────────────────────────────
 * Scans the Tower 3 PDF drawing file page-by-page, extracts
 * internal page numbers, and maps them to cabinet locations
 * based on standard page number ranges.
 * Generates public/data/pdf-page-map.json.
 * ────────────────────────────────────────────────────────────
 * Usage: node scripts/build-pdf-mapping.cjs
 */

const fs = require('fs');
const path = require('path');
const p = require('pdf-parse');

const PDF_PATH = path.resolve(__dirname, '../public/drawings/inteqc_cabinet_drawing.pdf');
const OUT_PATH = path.resolve(__dirname, '../public/data/pdf-page-map.json');

function getCabinetForPage(pageNum) {
  const n = parseInt(pageNum, 10);
  if (isNaN(n)) return null;
  if (n >= 200 && n <= 299) return 'MCC2';
  if (n >= 300 && n <= 399) return 'MCC3';
  if (n >= 600 && n <= 699) return 'MCC7';
  if (n >= 700 && n <= 899) return 'MCC8_9';
  if (n >= 900 && n <= 1099) return 'MCC11';
  if (n >= 1100 && n <= 1399) return 'MCC12_13';
  if (n >= 1400 && n <= 1599) return 'MCC18';
  if (n >= 1900 && n <= 1999) return 'PLC';
  if (n >= 2000 && n <= 2108) return 'LCB_1';
  if (n >= 2109 && n <= 2199) return 'LCB_2';
  if (n >= 2200 && n <= 2299) return 'LCB_4';
  if (n >= 2300 && n <= 2399) return 'LCB_5';
  if (n >= 2400 && n <= 2499) return 'LCB_6A';
  if (n >= 2500 && n <= 2599) return 'LCB_6B';
  if (n >= 2600 && n <= 2699) return 'LCB_8';
  if (n >= 2700 && n <= 2799) return 'LCB_9';
  if (n >= 2800 && n <= 2899) return 'LCB_10';
  return null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  PDF Drawing Page Mapping Builder              ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(PDF_PATH)) {
    console.error(`❌ PDF file not found at: ${PDF_PATH}`);
    process.exit(1);
  }

  console.log('📂 Reading PDF: ' + path.basename(PDF_PATH));
  const dataBuffer = fs.readFileSync(PDF_PATH);
  
  const pdfParser = new p.PDFParse({ data: dataBuffer });
  console.log('⚙ Loading and parsing PDF text...');
  await pdfParser.load();
  
  console.log('⚙ Extracting text structure...');
  const res = await pdfParser.getText();
  console.log(`📊 Total pages: ${res.pages.length}`);

  const pageMap = {};

  res.pages.forEach(page => {
    const text = page.text;
    const pageNum = page.num; // 1-based index in PDF file

    // Extract internal page number
    const pageMatch = text.match(/页数\s+([0-9a-zA-Z\.\-_]+)/i);
    const internalPage = pageMatch ? pageMatch[1].trim() : null;

    if (!internalPage) return;

    // Determine which cabinet this page belongs to
    const cabinet = getCabinetForPage(internalPage);
    if (!cabinet) return;

    if (!pageMap[cabinet]) {
      pageMap[cabinet] = {};
    }

    // Save mapping: internalPage -> pdfPage
    pageMap[cabinet][internalPage] = pageNum;
  });

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  // Write mapping JSON
  fs.writeFileSync(OUT_PATH, JSON.stringify(pageMap, null, 2), 'utf8');
  console.log(`✅ Success! Created: ${OUT_PATH}`);

  // Summary stats
  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  Object.keys(pageMap).sort().forEach(cab => {
    const pages = Object.keys(pageMap[cab]);
    const minPage = Math.min(...pages.map(Number));
    const maxPage = Math.max(...pages.map(Number));
    console.log(`  📦 ${cab}: ${pages.length} pages mapped (Internal pages: ${minPage} - ${maxPage})`);
  });

  await pdfParser.destroy();
}

main().catch(err => {
  console.error('❌ Error during execution:', err);
  process.exit(1);
});
