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

// ─── Cabinets for Tower 2 Phase 1 & 2 ───
const CABINETS_P1 = [
  'MCC1-2', 'MCC1_2', 'MCC3-4', 'MCC3_4', 'MCC5-6', 'MCC5_6', 'MCC7-8', 'MCC7_8',
  'MCC11', 'PLC1', 'RCB1', 'RCB2', 'RCB3', 'RCB4', '新增RCB4', 'MCC9_10', 'MCC9-10', '膨化烘干9-10'
];

const CABINETS_P2 = [
  'MCCB1', 'MCCB2', 'MCCB3', 'MCCB4', 'MCC5', 'MCC6', 'MCC7', 'MCCB8', 'MCCB9',
  'MCCB10', 'MCCB13', 'MCCB18', 'MCCB19', 'PLC2', 'RCB5', 'RCB6', 'RCB7', 'RCB8',
  'RCB9', 'RCB10', '2#膨化', '2#烘干', '3#膨化', '3#烘干', '4#膨化', '4#烘干'
];

// ─── Location config: each location has a data subfolder and optional PDF ───
const LOCATIONS = [
  {
    locationId: 'premixer',
    folder: 'Premixer',
    pdfFile: null,                             // No drawing PDF yet
    drawingUrl: null,
    cabinetRanges: [],
  },
  {
    locationId: 'tower2_p1',
    folder: 'Tower 2',
    pdfFile: 'Electrical schematic diagram_Feed mill Tower2 revamp phase1.pdf',
    drawingUrl: '/drawings/tower2_p1/electrical_schematic.pdf',
    cabinetList: CABINETS_P1,
    cabinetRanges: [],
  },
  {
    locationId: 'tower2_p2',
    folder: 'Tower 2',
    pdfFile: 'Electrical schematic diagram_Feed mill Tower2 revamp phase2.pdf',
    drawingUrl: '/drawings/tower2_p2/electrical_schematic.pdf',
    cabinetList: CABINETS_P2,
    cabinetRanges: [],
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

function extractInternalPage(text) {
  // 1. Try matching the designer label pattern (highly reliable for Tower 2)
  //    e.g. "4631 WZB 审核" or "4631 魏正彪 审核"
  //    But exclude single-digit values (1-9) which are typically revision numbers
  let m = text.match(/([0-9a-zA-Z\.\-_]+)\s+(?:魏正彪|WZB)\s+审核/i);
  if (m) {
    const val = m[1].trim();
    if (val !== 'EFA' && val !== 'EEC' && val !== 'MCC' && val !== 'PLC' && val !== 'RCB' && val.toLowerCase() !== 'state') {
      // Skip single-digit values — these are revision numbers, not page numbers
      if (/^\d$/.test(val)) {
        // Do not return; fall through to try other patterns
      } else {
        return val;
      }
    }
  }

  // 2. Try matching "页数" pattern, excluding "总页数"
  m = text.match(/(?<!总)页数\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) return m[1].trim();

  // 3. Try matching "页号" pattern, excluding "总页号"
  m = text.match(/(?<!总)页号\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) return m[1].trim();

  // 4. Try matching "格式 A4" pattern (seen in Pet Food)
  m = text.match(/格式\s+A4\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) return m[1].trim();

  // 5. Try matching date modification block pattern
  m = text.match(/([0-9a-zA-Z\.\-_]+)\s+日期\s+修改\s+姓名/i);
  if (m) return m[1].trim();

  // 6. For Tower 2 Phase 2 style: look for a standalone 4-digit page number (4000-9999 range)
  //    appearing near audit keywords on the same page
  if ((text.includes('WZB') || text.includes('魏正彪') || text.includes('审核')) && !text.includes('总页数')) {
    m = text.match(/\b([4-9]\d{3})\b/);
    if (m) return m[1];
  }

  return null;
}

function extractTitle(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('日期') && i > 0) {
      const prev = lines[i-1];
      if (prev && !prev.includes('修订') && !prev.includes('审核') && prev.length > 3) {
        return prev;
      }
    }
  }
  for (const line of lines) {
    if (/^(?:MCC|PLC|RCB)/i.test(line) && line.length > 5) {
      return line;
    }
  }
  return '';
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
  const tempAddressRecords = {};
  const addrRegex = /\b(?:I|Q)\d+\.\d+\b|\b(?:PIW|PQW)\d+\b/g;

  res.pages.forEach(page => {
    const text = page.text;
    const pageNum = page.num;

    const internalPageStr = extractInternalPage(text);
    if (!internalPageStr) return;

    // A. Cabinet mapping
    let cabinet = null;
    if (loc.cabinetList) {
      const title = extractTitle(text);
      for (const cab of loc.cabinetList) {
        const cleanCab = cab.replace(/[_\-]/g, '').toLowerCase();
        const cleanTitle = title.replace(/[_\-]/g, '').toLowerCase();
        if (cleanTitle.includes(cleanCab) || text.toLowerCase().includes(cab.toLowerCase())) {
          cabinet = cab;
          break;
        }
      }
    } else {
      cabinet = getCabinetForPage(internalPageStr, loc.cabinetRanges);
    }

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
