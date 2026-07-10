/**
 * split-pdf.cjs
 * ────────────────────────────────────────────────────────────
 * Slices the large 40MB PDF drawing into lightweight, cabinet-specific
 * PDFs (approx 1-2MB each) based on the mapped page ranges in pdf-page-map.json.
 * This makes drawing load times 40x faster on mobile devices.
 * ────────────────────────────────────────────────────────────
 * Usage: node scripts/split-pdf.cjs
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const DATA_DIR = path.resolve(__dirname, '../../data');
const MAP_PATH = path.resolve(__dirname, '../public/data/pdf-page-map.json');
const DRAWINGS_OUT_DIR = path.resolve(__dirname, '../public/drawings');

// Configurations matching our locations
const LOCATIONS = [
  {
    locationId: 'tower3',
    folder: 'Tower 3',
    pdfFile: '泰国inteqc Cabinet drawing.pdf',
  }
];

async function splitPdfForLocation(loc, locMap) {
  const pdfPath = path.join(DATA_DIR, loc.folder, loc.pdfFile);
  if (!fs.existsSync(pdfPath)) {
    console.log(`  ⚠ Main PDF not found: ${pdfPath} — skipping split.`);
    return;
  }

  if (!locMap || !locMap.cabinets) {
    console.log(`  ⚠ No cabinet mapping found for location: ${loc.locationId} — skipping.`);
    return;
  }

  console.log(`  📂 Loading main PDF: ${loc.pdfFile}...`);
  const srcBytes = fs.readFileSync(pdfPath);
  const srcDoc = await PDFDocument.load(srcBytes);
  const totalPages = srcDoc.getPageCount();
  console.log(`  📊 Main PDF has ${totalPages} pages.`);

  const destFolder = path.join(DRAWINGS_OUT_DIR, loc.locationId, 'cabinets');
  fs.mkdirSync(destFolder, { recursive: true });

  const cabinets = Object.keys(locMap.cabinets);
  for (const cabinet of cabinets) {
    const pagesMap = locMap.cabinets[cabinet];
    const pdfPageNumbers = Object.values(pagesMap).map(Number);

    if (pdfPageNumbers.length === 0) continue;

    const minPage = Math.min(...pdfPageNumbers); // 1-based index
    const maxPage = Math.max(...pdfPageNumbers); // 1-based index

    console.log(`  🗄️ Splitting cabinet "${cabinet}": pages ${minPage} to ${maxPage} (${maxPage - minPage + 1} pages)`);

    // Create a new PDF Document
    const subDoc = await PDFDocument.create();

    // Pages inside pdf-lib copyPages are 0-based indices
    const indicesToCopy = [];
    for (let i = minPage - 1; i <= maxPage - 1; i++) {
      if (i >= 0 && i < totalPages) {
        indicesToCopy.push(i);
      }
    }

    const copiedPages = await subDoc.copyPages(srcDoc, indicesToCopy);
    copiedPages.forEach(page => subDoc.addPage(page));

    const subPdfBytes = await subDoc.save();
    const destPath = path.join(destFolder, `${cabinet}.pdf`);
    fs.writeFileSync(destPath, subPdfBytes);

    console.log(`  ✅ Created: ${loc.locationId}/cabinets/${cabinet}.pdf (${(subPdfBytes.length / 1024 / 1024).toFixed(2)} MB)`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  PDF Cabinet-level Slicer & Compressor         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(MAP_PATH)) {
    console.error(`❌ Mapping file not found at: ${MAP_PATH}. Please run build-pdf-mapping.cjs first.`);
    process.exit(1);
  }

  const pdfPageMap = require(MAP_PATH);

  for (const loc of LOCATIONS) {
    console.log(`\n📍 Slicing PDF for location: ${loc.locationId.toUpperCase()}`);
    await splitPdfForLocation(loc, pdfPageMap[loc.locationId]);
  }

  console.log('\n🎉 PDF Slicing completed successfully!');
}

main().catch(err => {
  console.error('❌ Error splitting PDFs:', err);
  process.exit(1);
});
