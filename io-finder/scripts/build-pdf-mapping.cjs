/**
 * build-pdf-mapping.cjs
 * ────────────────────────────────────────────────────────────
 * Scans the Tower 3 PDF drawing file page-by-page, extracts
 * internal page numbers, and maps both:
 *  1) Cabinet names to PDF pages (by standard ranges)
 *  2) I/O Addresses (like I166.2, Q118.1) directly to their 
 *     wiring diagram pages.
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
  console.log('║  PDF Drawing Page Mapping Builder (V2)         ║');
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

  const cabinetMap = {};
  const addressMap = {};
  const tempAddressRecords = {}; // For resolving multiple page references

  const addrRegex = /\b(?:I|Q)\d+\.\d+\b|\b(?:PIW|PQW)\d+\b/g;

  res.pages.forEach(page => {
    const text = page.text;
    const pageNum = page.num; // 1-based index in PDF file

    // Extract internal page number
    const pageMatch = text.match(/页数\s+([0-9a-zA-Z\.\-_]+)/i);
    const internalPageStr = pageMatch ? pageMatch[1].trim() : null;

    if (!internalPageStr) return;

    // A. Cabinet mapping
    const cabinet = getCabinetForPage(internalPageStr);
    if (cabinet) {
      if (!cabinetMap[cabinet]) {
        cabinetMap[cabinet] = {};
      }
      cabinetMap[cabinet][internalPageStr] = pageNum;
    }

    // B. Address mapping
    const matches = text.match(addrRegex);
    if (matches) {
      const internalPageNum = parseInt(internalPageStr, 10);
      matches.forEach(addr => {
        const uppercaseAddr = addr.toUpperCase();
        
        // If we haven't seen this address, or this page has a smaller internal page number
        // (which usually points to the wiring diagram sheet rather than the overview sheet)
        if (!tempAddressRecords[uppercaseAddr] || 
            (!isNaN(internalPageNum) && internalPageNum < tempAddressRecords[uppercaseAddr].internalPage)) {
          
          tempAddressRecords[uppercaseAddr] = {
            pdfPage: pageNum,
            internalPage: isNaN(internalPageNum) ? Infinity : internalPageNum,
            internalPageStr
          };
        }
      });
    }
  });

  // Convert tempAddressRecords to flat addressMap
  Object.keys(tempAddressRecords).forEach(addr => {
    addressMap[addr] = {
      page: tempAddressRecords[addr].pdfPage,
      internalPage: tempAddressRecords[addr].internalPageStr
    };
  });

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  const finalOutput = {
    cabinets: cabinetMap,
    addresses: addressMap
  };

  // Write mapping JSON
  fs.writeFileSync(OUT_PATH, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`\n✅ Success! Created: ${OUT_PATH}`);

  // Summary stats
  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🔗 Unique I/O Addresses mapped: ${Object.keys(addressMap).length}`);
  console.log(`  📦 Cabinets mapped: ${Object.keys(cabinetMap).length}`);
  
  await pdfParser.destroy();
}

main().catch(err => {
  console.error('❌ Error during execution:', err);
  process.exit(1);
});
