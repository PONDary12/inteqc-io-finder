/**
 * parse-excel.cjs
 * ────────────────────────────────────────────────────────────
 * Parses inteqc I/O Excel files and produces:
 *   public/data/io-data.json     – full I/O data by location → cabinet
 *   public/data/search-index.json – unique equipment search entries
 * ────────────────────────────────────────────────────────────
 * Usage:  node scripts/parse-excel.cjs
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ──────────────────────── Configuration ────────────────────────

const DATA_DIR = path.resolve(__dirname, '../../data');
const OUT_DIR = path.resolve(__dirname, '../public/data');

const FILES = [
  {
    file: 'inteqc_PREMIXER_IO.xlsx',
    locationId: 'premixer',
    locationName: 'Premixer',
    sheets: ['MCCY1_2', 'MCCY3', 'PLC'],
  },
  {
    file: 'inteqc Tower3_IO.xlsx',
    locationId: 'tower3',
    locationName: 'Tower 3',
    sheets: [
      'MCC2', 'MCC3', 'MCC7', 'MCC8_9', 'MCC11', 'MCC12_13',
      'MCC18', 'MCC21_22', 'MCC23_24', 'MCC25_26', 'MCC27',
      'PLC', 'LCB_1', 'LCB_2', 'LCB_4', 'LCB_5',
      'LCB_6A', 'LCB_6B', 'LCB_8', 'LCB_9', 'LCB_10',
    ],
  },
];

// ──────────────────────── Helpers ────────────────────────

/** Trim a cell value to a clean string. */
function cell(row, idx) {
  const v = row[idx];
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\r\n]+/g, ' ').trim();
}

/** Check if a cell looks like a section marker. */
function isMarker(text, marker) {
  return text.includes(marker);
}

/** Detect the column format from a header row.
 *  Wide format  → cols 4 AND 5 are both '设备名称'
 *  Narrow format → only col 4 is '设备名称'
 *
 *  Returns a column-index map: { address, symbol, code, equipCN, signalCN, equipEN, signalEN, cabinet }
 */
function detectColumns(headerRow) {
  const col4 = cell(headerRow, 4);
  const col5 = cell(headerRow, 5);

  if (col4 === '设备名称' && col5 === '设备名称') {
    // Wide format (18 cols, e.g., MCCY1_2)
    return {
      format: 'wide',
      address: 1,
      symbol: 2,
      code: 3,
      equipCN: 4,  // cols 4-5 duplicated
      signalCN: 6,
      equipEN: 7,
      signalEN: 8,
      cabinet: 9,
    };
  }

  // Narrow format (17 cols)
  return {
    format: 'narrow',
    address: 1,
    symbol: 2,
    code: 3,
    equipCN: 4,
    signalCN: 5,
    equipEN: 6,
    signalEN: 7,
    cabinet: 8,
  };
}

/** Detect columns for 4AI sections.
 *  4AI header is always: 序号, 地址, 符号表, 编号, 设备名称, 信号名称, 标签, 备注, 柜号
 *  (no EN columns — equipment names are Chinese only)
 */
function detectColumnsAI(headerRow) {
  // 4AI sections always have this layout regardless of wide/narrow
  return {
    format: 'ai',
    address: 1,
    symbol: 2,
    code: 3,
    equipCN: 4,
    signalCN: 5,
    // No EN columns in 4AI sections
    equipEN: -1,
    signalEN: -1,
    cabinet: 8,  // typically col 8
  };
}

/** Determine the cabinet column for 4AI by finding the column
 *  with header '柜号' in the header row. */
function findCabinetCol(headerRow) {
  for (let i = 0; i < headerRow.length; i++) {
    if (cell(headerRow, i) === '柜号') return i;
  }
  return 8; // fallback
}

/** Check if a row is a valid data row (has numeric sequence number in col 0). */
function isDataRow(row) {
  const seq = row[0];
  if (seq === undefined || seq === null || seq === '') return false;
  return typeof seq === 'number' || /^\d+$/.test(String(seq).trim());
}

/** Parse a section (DI, AI, or DO) starting after the marker row.
 *  Returns array of I/O point objects.
 */
function parseSection(rows, startIdx, sectionType, sheetName) {
  if (startIdx >= rows.length) return [];

  const headerRow = rows[startIdx];
  let cols;

  if (sectionType === 'AI') {
    cols = detectColumnsAI(headerRow);
    cols.cabinet = findCabinetCol(headerRow);
  } else {
    cols = detectColumns(headerRow);
  }

  const points = [];

  for (let i = startIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const cellA = cell(row, 0);

    // Stop conditions: empty row, another section marker, or non-data row
    if (cellA === '' || isMarker(cellA, '输入') || isMarker(cellA, '输出') || isMarker(cellA, '4AI')) {
      break;
    }

    if (!isDataRow(row)) continue;

    const address = cell(row, cols.address);
    const equipmentCode = cell(row, cols.code);
    let equipmentName = '';
    let signalName = '';

    if (cols.equipEN >= 0) {
      equipmentName = cell(row, cols.equipEN);
      signalName = cell(row, cols.signalEN);
    }

    // Fallback to CN names if EN names are empty
    if (!equipmentName) {
      equipmentName = cell(row, cols.equipCN);
    }
    if (!signalName) {
      signalName = cell(row, cols.signalCN);
    }

    const cabinet = cell(row, cols.cabinet) || sheetName;

    // Skip rows where address is empty or equipment info is empty
    if (!address) continue;
    if (!equipmentName && !equipmentCode) continue;

    points.push({
      type: sectionType,
      seq: Number(row[0]),
      address,
      equipmentCode,
      equipmentName,
      signalName,
      cabinet,
    });
  }

  return points;
}

/** Parse a single sheet into an array of I/O points. */
function parseSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠ Sheet "${sheetName}" not found, skipping.`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const allPoints = [];

  for (let i = 0; i < rows.length; i++) {
    const cellA = cell(rows[i], 0);

    if (cellA === '输入' || isMarker(cellA, '输入') && !cellA.includes('模块')) {
      // Digital Input section — header is next row
      if (cellA === '输入') {
        const points = parseSection(rows, i + 1, 'DI', sheetName);
        allPoints.push(...points);
      }
    } else if (isMarker(cellA, '4AI')) {
      // Analog Input section
      const points = parseSection(rows, i + 1, 'AI', sheetName);
      allPoints.push(...points);
    } else if (cellA === '输出' || isMarker(cellA, '输出') && !cellA.includes('模块')) {
      if (cellA === '输出') {
        // Digital Output section
        const points = parseSection(rows, i + 1, 'DO', sheetName);
        allPoints.push(...points);
      }
    }
  }

  return allPoints;
}

// ──────────────────────── Search Index Builder ────────────────────────

function buildSearchIndex(locations) {
  // Key = equipmentCode + '|' + locationId
  const equipMap = new Map();

  for (const loc of locations) {
    for (const cab of loc.cabinets) {
      for (const io of cab.io) {
        const key = (io.equipmentCode || io.equipmentName) + '|' + loc.id;

        if (!equipMap.has(key)) {
          equipMap.set(key, {
            code: io.equipmentCode,
            name: io.equipmentName,
            signals: new Set(),
            types: new Set(),
            cabinets: new Set(),
            location: loc.name,
            locationId: loc.id,
          });
        }

        const entry = equipMap.get(key);
        // Update name if current entry has empty name but this row has one
        if (!entry.name && io.equipmentName) {
          entry.name = io.equipmentName;
        }
        if (io.signalName) entry.signals.add(io.signalName);
        entry.types.add(io.type);
        entry.cabinets.add(io.cabinet);
      }
    }
  }

  // Convert Sets to sorted Arrays
  const index = [];
  for (const entry of equipMap.values()) {
    index.push({
      code: entry.code,
      name: entry.name,
      signals: [...entry.signals].sort(),
      types: [...entry.types].sort(),
      cabinets: [...entry.cabinets].sort(),
      location: entry.location,
      locationId: entry.locationId,
    });
  }

  // Sort by code, then location
  index.sort((a, b) => {
    const codeCompare = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
    if (codeCompare !== 0) return codeCompare;
    return a.locationId.localeCompare(b.locationId);
  });

  return index;
}

// ──────────────────────── Main ────────────────────────

function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  I/O Excel Parser — inteqc Project            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Ensure output directory exists
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const locations = [];

  for (const config of FILES) {
    const filePath = path.join(DATA_DIR, config.file);
    console.log(`📂 Reading: ${config.file}`);

    const wb = XLSX.readFile(filePath);
    const cabinets = [];

    for (const sheetName of config.sheets) {
      process.stdout.write(`  📋 Parsing sheet: ${sheetName} ... `);
      const ioPoints = parseSheet(wb, sheetName);
      console.log(`${ioPoints.length} I/O points`);

      if (ioPoints.length > 0) {
        cabinets.push({
          id: sheetName,
          name: sheetName,
          io: ioPoints,
        });
      }
    }

    locations.push({
      id: config.locationId,
      name: config.locationName,
      cabinets,
    });

    console.log('');
  }

  // Build output data
  const ioData = { locations };
  const searchIndex = buildSearchIndex(locations);

  // Write files
  const ioDataPath = path.join(OUT_DIR, 'io-data.json');
  const searchIndexPath = path.join(OUT_DIR, 'search-index.json');

  fs.writeFileSync(ioDataPath, JSON.stringify(ioData, null, 2), 'utf8');
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2), 'utf8');

  // ──────── Summary ────────
  console.log('═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Locations: ${locations.length}`);

  let totalPoints = 0;
  for (const loc of locations) {
    const locPoints = loc.cabinets.reduce((sum, c) => sum + c.io.length, 0);
    totalPoints += locPoints;
    console.log(`  📍 ${loc.name}: ${loc.cabinets.length} cabinets, ${locPoints} I/O points`);
    for (const cab of loc.cabinets) {
      const di = cab.io.filter(p => p.type === 'DI').length;
      const ai = cab.io.filter(p => p.type === 'AI').length;
      const do_ = cab.io.filter(p => p.type === 'DO').length;
      console.log(`     └ ${cab.name}: DI=${di}  AI=${ai}  DO=${do_}  Total=${cab.io.length}`);
    }
  }

  console.log(`\n  Total I/O points: ${totalPoints}`);
  console.log(`  Search index entries: ${searchIndex.length}`);
  console.log(`\n  Sample search index (first 3):`);
  for (const entry of searchIndex.slice(0, 3)) {
    console.log(`    ${JSON.stringify(entry)}`);
  }

  console.log(`\n✅ Output files:`);
  console.log(`   ${ioDataPath}`);
  console.log(`   ${searchIndexPath}`);
}

main();
