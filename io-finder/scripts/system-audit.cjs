const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ioData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/io-data.json'), 'utf8'));
const searchIndex = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/search-index.json'), 'utf8'));
const pdfMap = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data/pdf-page-map.json'), 'utf8'));

console.log('====================================================');
console.log('           SYSTEM HEALTH & AUDIT REPORT             ');
console.log('====================================================\n');

// 1. LOCATION & CABINET BREAKDOWN
console.log('--- 1. LOCATIONS & DATA POINTS ---');
let totalPoints = 0;
let totalWithDrawing = 0;
let totalMissingDrawingFile = 0;
let chineseCharsFound = [];
let edgeCaseCodes = [];

ioData.locations.forEach(loc => {
  let locPoints = 0;
  let locWithDrawing = 0;
  let locMissingFile = 0;
  
  loc.cabinets.forEach(cab => {
    cab.io.forEach(pt => {
      locPoints++;
      totalPoints++;
      
      // Check drawing file
      if (pt.drawingPdfUrl) {
        locWithDrawing++;
        totalWithDrawing++;
        const absPath = path.join(PUBLIC_DIR, pt.drawingPdfUrl);
        if (!fs.existsSync(absPath)) {
          locMissingFile++;
          totalMissingDrawingFile++;
          console.log(`[404 Drawing] Loc: ${loc.id}, Cab: ${cab.name}, Addr: ${pt.address} -> File not found: ${pt.drawingPdfUrl}`);
        }
      }
      
      // Check Chinese characters (Rule: English only for UI/equipment names)
      const hasChinese = /[\u4e00-\u9fa5]/.test(pt.equipmentName || '') || 
                         /[\u4e00-\u9fa5]/.test(pt.signalName || '') ||
                         /[\u4e00-\u9fa5]/.test(cab.name || '');
      if (hasChinese) {
        chineseCharsFound.push({
          location: loc.name,
          cabinet: cab.name,
          address: pt.address,
          name: pt.equipmentName,
          signal: pt.signalName
        });
      }

      // Check equipmentCode edge cases (empty, slash, special chars that might break URL)
      if (!pt.equipmentCode || pt.equipmentCode.trim() === '' || pt.equipmentCode === '-' || pt.equipmentCode === '—') {
        edgeCaseCodes.push({
          location: loc.name,
          cabinet: cab.name,
          address: pt.address,
          code: pt.equipmentCode
        });
      }
    });
  });
  
  console.log(`[Location] ${loc.name} (${loc.id}): ${loc.cabinets.length} cabinets, ${locPoints} I/O points, ${locWithDrawing} with drawings (${((locWithDrawing/locPoints)*100).toFixed(1)}%)`);
});

console.log(`\nTotal points: ${totalPoints}, With drawings: ${totalWithDrawing}, Missing files (404): ${totalMissingDrawingFile}`);

// 2. CHINESE CHARACTERS AUDIT
console.log('\n--- 2. CHINESE TEXT AUDIT (Language Compliance) ---');
console.log(`Total items containing Chinese characters: ${chineseCharsFound.length}`);
if (chineseCharsFound.length > 0) {
  console.log('Sample items with Chinese text:');
  chineseCharsFound.slice(0, 10).forEach(item => {
    console.log(`  [${item.location} | ${item.cabinet}] Addr: ${item.address}, Name: "${item.name}", Signal: "${item.signal}"`);
  });
  if (chineseCharsFound.length > 10) {
    console.log(`  ... and ${chineseCharsFound.length - 10} more items.`);
  }
}

// 3. UNASSIGNED / EMPTY MACHINE CODES
console.log('\n--- 3. EMPTY / UNASSIGNED MACHINE CODES ---');
console.log(`Total I/O points with empty or unassigned machineCode: ${edgeCaseCodes.length}`);
if (edgeCaseCodes.length > 0) {
  const byLoc = {};
  edgeCaseCodes.forEach(item => {
    byLoc[item.location] = (byLoc[item.location] || 0) + 1;
  });
  console.log('Breakdown by location:', byLoc);
}

// 4. SEARCH INDEX AUDIT
console.log('\n--- 4. SEARCH INDEX AUDIT ---');
console.log(`Total search index entries: ${searchIndex.length}`);
let emptyCodeSearchEntries = searchIndex.filter(e => !e.code || e.code === '');
console.log(`Search entries with empty machine code: ${emptyCodeSearchEntries.length}`);

// 5. DRAWING IMAGES AUDIT
console.log('\n--- 5. DRAWING IMAGES STORAGE AUDIT ---');
['tower2_p1', 'tower2_p2', 'tower3'].forEach(locId => {
  const imgDir = path.join(PUBLIC_DIR, 'drawings', locId, 'cabinets', 'images');
  if (fs.existsSync(imgDir)) {
    const files = fs.readdirSync(imgDir);
    console.log(`  ${locId}: ${files.length} PNG drawing sheets in public/drawings/${locId}/cabinets/images/`);
  } else {
    console.log(`  ${locId}: No image folder found`);
  }
});

// 6. EQUIPMENT DRAWINGS AUDIT (Schematics linked to machines)
console.log('\n--- 6. EQUIPMENT DRAWINGS AUDIT ---');
let totalEquipSchematics = 0;
let totalMissingSchematicFiles = 0;
let badEquipKeys = [];
let schematicChineseChars = [];

ioData.locations.forEach(loc => {
  const eqMap = loc.equipmentDrawings || {};
  const keys = Object.keys(eqMap);
  let locSchematics = 0;
  let locMissing = 0;

  keys.forEach(k => {
    if (/^[0-9]+(\.[0-9]+)?(KW|A|V|W|HZ|RPM|MA|KVA)$/i.test(k)) {
      badEquipKeys.push({ loc: loc.id, key: k });
    }
    eqMap[k].forEach(s => {
      totalEquipSchematics++;
      locSchematics++;
      const absPath = path.join(PUBLIC_DIR, s.drawingPdfUrl);
      if (!fs.existsSync(absPath)) {
        totalMissingSchematicFiles++;
        locMissing++;
        if (locMissing <= 5) {
          console.log(`[404 Schematic] Loc: ${loc.id}, Eq: ${k}, Sheet: ${s.internalPage} -> File not found: ${s.drawingPdfUrl}`);
        }
      }
      if (/[\u4e00-\u9fa5]/.test(s.label || '') || /[\u4e00-\u9fa5]/.test(s.type || '')) {
        schematicChineseChars.push({ loc: loc.id, eq: k, label: s.label, type: s.type });
      }
    });
  });

  console.log(`[Location] ${loc.name} (${loc.id}): ${keys.length} machines with schematics, ${locSchematics} total sheet links, ${locMissing} missing files (404)`);
});

console.log(`\nTotal equipment schematic links: ${totalEquipSchematics}, Missing files: ${totalMissingSchematicFiles}`);
console.log(`Junk / rating equipment keys found: ${badEquipKeys.length}`);
if (badEquipKeys.length > 0) {
  console.log('Sample bad keys:', badEquipKeys.slice(0, 10));
}
console.log(`Schematic labels containing Chinese characters: ${schematicChineseChars.length}`);

