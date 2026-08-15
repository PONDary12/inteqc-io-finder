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

// Load PDF page map if it exists (now keyed by locationId)
let pdfPageMap = {};
const MAP_PATH = path.resolve(__dirname, '../public/data/pdf-page-map.json');
try {
  if (fs.existsSync(MAP_PATH)) {
    pdfPageMap = require(MAP_PATH);
    console.log('📖 Loaded PDF Page Map successfully.');
  }
} catch (e) {
  console.warn('⚠ Could not load pdf-page-map.json — drawing mapping will be disabled.');
}

const CABINET_BASE_PAGES = {
  'MCC2': 200,
  'MCC3': 300,
  'MCC7': 600,
  'MCC8_9': 700,
  'MCC11': 900,
  'MCC12_13': 1100,
  'MCC18': 1400,
  'PLC': 1900,
  'LCB_1': 2000,
  'LCB_2': 2100,
  'LCB_4': 2200,
  'LCB_5': 2300,
  'LCB_6A': 2400,
  'LCB_6B': 2500,
  'LCB_8': 2600,
  'LCB_9': 2700,
  'LCB_10': 2800,
};

// ──────────────────────── Normalization Helpers ────────────────────────

function normalizeCode(code) {
  if (!code) return '';
  return String(code)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-\.\,\/\\]/g, '');
}

const RCB4_EQUIP_INTERNAL_PAGES = {
  'WAV_1001': '1702',
  'WAV_1002': '1703',
  'WAV_1003': '1704',
  'WAV_2001': '1705',
  'WAV_2002': '1706',
  'WAV_2003': '1707',
  'WAV_2004': '1708',
  'WAV_2005': '1709',
  'WBYV1': '1710',
  'WBYV2': '1711',
  'WBYV3': '1712',
  'WLSH_1001': '1715',
  'WLSL_1001': '1715',
  'WLSH_2001': '1715',
  'WLSM_2001': '1715',
  'WLSL_2001': '1715',
};

const DATA_OVERRIDES = {
  'tower2_p2': {
    'Q660.6': { equipmentCode: 'VE05', equipmentName: 'Butterfly Valve', signalName: 'Open' },
    'I901.4': { signalName: 'TO 2D01' },
    'I901.5': { signalName: 'TO 2D02' },
    'I901.6': { signalName: 'TO 2D03' },
    'I901.7': { signalName: 'TO 2D04' },
    'I902.0': { signalName: 'TO 2D05' },
    'I902.1': { signalName: 'TO 2D06' },
    'I902.2': { signalName: 'TO 2D07' },
    'I902.3': { signalName: 'TO 2D08' },
    'I902.4': { signalName: 'TO 2D09' },
    'I902.5': { signalName: 'TO 2D10' },

    'I802.4': { signalName: 'TO 2D11' },
    'I802.5': { signalName: 'TO 2D12' },
    'I802.6': { signalName: 'TO 2D13' },
    'I802.7': { signalName: 'TO 2D14' },
    'I803.0': { signalName: 'TO 2D15' },
    'I803.1': { signalName: 'TO 2D16' },
    'I803.2': { signalName: 'TO 2D17' },
    'I803.3': { signalName: 'TO 2D18' },
    'I803.4': { signalName: 'TO 2D19' },
    'I803.5': { signalName: 'TO 2D20' },
    'I803.6': { signalName: 'TO 2D21' },
    'I803.7': { signalName: 'TO 2D22' },
  },
  'tower2_p1': {
    'I206.6': { equipmentCode: 'G0104_2', equipmentName: 'Conveyor', signalName: 'FOR. Limit' },
    'Q205.5': { equipmentCode: 'G0104_2', equipmentName: 'Conveyor', signalName: 'REV.' },
    'I228.3': { equipmentCode: 'G0203_2', equipmentName: 'Conveyor', signalName: 'FOR. Limit' },
    'Q220.3': { equipmentCode: 'G0203_2', equipmentName: 'Conveyor', signalName: 'REV.' },
    'I246.7': { equipmentCode: 'B0108' },
    'I247.0': { equipmentCode: 'B0108' },
    'Q233.5': { equipmentCode: 'B0108' },
    'I247.1': { equipmentCode: 'B0109' },
    'I247.2': { equipmentCode: 'B0109' },
    'Q233.6': { equipmentCode: 'B0109' },
    'I286.0': { equipmentCode: 'AV-4003', equipmentName: 'Pneumatic Valve', signalName: 'Openning' },
    'I286.1': { equipmentCode: 'AV-4003', equipmentName: 'Pneumatic Valve', signalName: 'Closing' },
  }
};



function normalizeAddress(addr) {
  if (!addr) return '';
  return String(addr)
    .trim()
    .toLowerCase()
    .replace(/[_\-]/g, '.')
    .replace(/o/g, '0');
}

const CN_DICT = [
  ['备用 Spare', 'Spare'],
  ['备用', 'Spare'],
  ['改备用', 'Spare (Modified)'],
  ['改 Spare', 'Spare (Modified)'],
  ['设备编号', ''],
  ['超微粉碎机', 'Micro Pulverizer'],
  ['超微粉', 'Micro Pulverizer'],
  ['粉碎风机', 'Grinder Fan'],
  ['粉碎机', 'Hammer Mill'],
  ['关风器', 'Air Lock'],
  ['脉冲电源', 'Pulse Power'],
  ['投料口门锁到位信号', 'Inlet Door Lock In-Position'],
  ['回料手投口气锤', 'Return Material Manual Inlet Hammer'],
  ['给烘干膨化后段超载机连锁', 'Extruder Post-Dryer Overload Interlock'],
  ['给烘干机连锁', 'Dryer Interlock'],
  ['小料小料气锤', 'Micro Ingredient Hammer '],
  ['喷涂仓三通左通', 'Coating Bin Diverter Left'],
  ['喷涂仓三通右通', 'Coating Bin Diverter Right'],
  ['除铁门保', 'Iron Separator Door Guard'],
  ['风门执行器', 'Damper Actuator'],
  ['风门门保', 'Damper Door Guard'],
  ['1气锁关门', 'Air Lock 1 Door Close'],
  ['2气锁关门', 'Air Lock 2 Door Close'],
  ['气密封', 'Air Seal'],
  ['喂料器', 'Feeder'],
  ['喂料斗料位', 'Feed Hopper Level'],
  ['提升机箱', 'Elevator Casing'],
  ['提升机', 'Bucket Elevator'],
  ['混合机', 'Mixer'],
  ['喷涂机', 'Coater'],
  ['水罐上料位', 'Water Tank High Level'],
  ['水罐下料位', 'Water Tank Low Level'],
  ['水罐', 'Water Tank'],
  ['水路', 'Water Line'],
  ['除尘料位', 'Dust Collector Level'],
  ['气动三通', 'Pneumatic Diverter'],
  ['等比例阀', 'Proportional Valve'],
  ['水调节阀', 'Water Control Valve'],
  ['蒸汽调节阀', 'Steam Control Valve'],
  ['蒸汽阀', 'Steam Valve'],
  ['伸缩阀', 'Telescopic Valve'],
  ['旁通阀', 'Bypass Valve'],
  ['调节阀', 'Control Valve'],
  ['螺杆换向阀', 'Screw Reversing Valve'],
  ['螺杆液压油缸', 'Screw Hydraulic Cylinder'],
  ['齿轮箱', 'Gearbox'],
  ['管路架', 'Pipe Rack'],
  ['管路', 'Pipeline'],
  ['摊布器上方斗', 'Spreader Upper Hopper'],
  ['出料缓冲斗', 'Discharge Buffer Hopper'],
  ['摊布器', 'Spreader'],
  ['调质器', 'Conditioner'],
  ['膨化腔蒸汽流量计', 'Extruder Steam Flowmeter'],
  ['调质器蒸汽流量计', 'Conditioner Steam Flowmeter'],
  ['膨化腔水流量计', 'Extruder Water Flowmeter'],
  ['调质器水流量计', 'Conditioner Water Flowmeter'],
  ['Extruder 腔', 'Extrusion Chamber'],
  ['Extruder 机', 'Extruder'],
  ['罐子蒸汽加热', 'Tank Steam Heating'],
  ['压力开关报警', 'Pressure Switch Alarm'],
  ['温度开关报警', 'Temp Switch Alarm'],
  ['开度反馈', 'Opening Feedback'],
  ['开度调节', 'Opening Regulation'],
  ['电流检测', 'Current Detection'],
  ['压力检测', 'Pressure Detection'],
  ['流量检测', 'Flow Detection'],
  ['扭矩检测', 'Torque Detection'],
  ['变频故障', 'VFD Fault'],
  ['测湿度', 'Moisture Sensor'],
  ['测温', 'Temp Sensor'],
  ['测速', 'Speed Sensor'],
  ['门保', 'Door Guard'],
  ['防堵', 'Anti-Choke'],
  ['左通到位', 'Left In-Position'],
  ['右通到位', 'Right In-Position'],
  ['关门到位', 'Close In-Position'],
  ['开门到位', 'Open In-Position'],
  ['关门信号', 'Door Close Signal'],
  ['锁开门', 'Door Unlock'],
  ['开始添加', 'Start Dosing'],
  ['添加完成', 'Dosing Complete'],
  ['上料位', 'High Level'],
  ['下料位', 'Low Level'],
  ['中料位', 'Middle Level'],
  ['料位', 'Level'],
  ['温度', 'Temperature'],
  ['急停', 'Emergency Stop'],
  ['关门', 'Door Close'],
  ['开门', 'Door Open'],
  ['开阀', 'Valve Open'],
  ['伸出', 'Extend'],
  ['回缩', 'Retract'],
  ['震动', 'Vibrator'],
  ['气锤', 'Pneumatic Hammer'],
  ['风机', 'Blower'],
  ['烘干机', 'Dryer'],
  ['烘干', 'Dryer'],
  ['膨化', 'Extruder'],
  ['称1校称阀', 'Scale 1 Calibration Valve '],
  ['称2校称阀', 'Scale 2 Calibration Valve '],
  ['称3校称阀', 'Scale 3 Calibration Valve '],
  ['进D23仓', 'To D23 Bin'],
  ['信号控制', 'Signal Control '],
  ['左通', 'Left'],
  ['右通', 'Right'],
  ['启动', 'Start'],
  ['输出', 'Output'],
  ['电流', 'Current'],
  ['压力', 'Pressure'],
  ['流量', 'Flow'],
  ['5层', 'Deck 5'],
  ['9层', 'Deck 9'],
  ['1#位', 'Pos 1'],
  ['2#位', 'Pos 2'],
  ['3#位', 'Pos 3'],
  ['4#位', 'Pos 4'],
  ['5#位', 'Pos 5'],
  ['20240123改', 'Mod 2024-01-23'],
  ['后改', 'Modified'],
  ['后加', 'Added Later'],
  ['新加', 'Newly Added'],
  ['新增', 'New Addition'],
  ['蒸汽', 'Steam'],
  ['水', 'Water'],
  ['腔', 'Chamber'],
  ['计', 'Meter'],
  ['机', 'Machine'],
  ['仓', 'Bin'],
  ['号', 'No.'],
];

function translateCN(str) {
  if (!str) return '';
  let result = String(str).trim();
  for (const [cn, en] of CN_DICT) {
    if (result.includes(cn)) {
      result = result.split(cn).join(en ? ` ${en} ` : ' ');
    }
  }
  // Clean multiple spaces and colon separators
  result = result
    .replace(/\s+/g, ' ')
    .replace(/:\s*:/g, ':')
    .replace(/^[:\s\-_]+|[:\s\-_]+$/g, '')
    .trim();
  return result;
}

function getMappedCabinet(cabinetName) {
  if (!cabinetName) return '';
  const clean = cabinetName.trim();
  
  const aliases = {
    '膨化烘干9-10': 'MCC9_10',
    'MCC9-10': 'MCC9_10',
    'MCC9_10': 'MCC9_10',
    '新增RCB4': 'RCB4',
    'MCC1-2': 'MCC1_2',
    'MCC3-4': 'MCC3_4',
    'MCC5-6': 'MCC5_6',
    'MCC7-8': 'MCC7_8',
    '2#膨化': 'Extruder_2',
    '2#烘干': 'Dryer_2',
    '3#膨化': 'Extruder_3',
    '3#烘干': 'Dryer_3',
    '4#膨化': 'Extruder_4',
    '4#烘干': 'Dryer_4',
  };
  if (aliases[clean]) return aliases[clean];
  
  // MCCB1-RI11 -> MCCB1
  let m = clean.match(/^(MCCB?\d+)/i);
  if (m) return m[1].toUpperCase();

  return translateCN(clean) || clean;
}

// ──────────────────────── Configuration ────────────────────────

const DATA_DIR = path.resolve(__dirname, '../../data');
const OUT_DIR = path.resolve(__dirname, '../public/data');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const FILES = [
  {
    folder: 'Premixer',
    file: 'inteqc_PREMIXER_IO.xlsx',
    locationId: 'premixer',
    locationName: 'Premixer',
    sheets: ['MCCY1_2', 'MCCY3', 'PLC'],
  },
  {
    folder: 'Tower 2',
    file: 'INTEQC-T2-IO_20240311_phase1.xlsx',
    locationId: 'tower2_p1',
    locationName: 'Tower 2 (Phase 1)',
    sheets: [
      'MCC1-2', 'MCC3-4', 'MCC5-6', 'MCC7-8', 'MCC11', 'PLC1',
      'RCB2', 'RCB3', 'RCB1', '新增RCB4', '膨化烘干9-10'
    ],
  },
  {
    folder: 'Tower 2',
    file: 'INTEQC-T2-IO_20240528_phase2.xlsx',
    locationId: 'tower2_p2',
    locationName: 'Tower 2 (Phase 2)',
    sheets: [
      'MCCB1-RI11', 'MCCB1-RI12', 'MCCB1-RI21', 'MCCB2-RI22',
      'MCCB3,4-RI23', 'MCC5,6,7-RI25', 'MCCB8,9-RI28', 'MCCB10-RI30',
      'MCCB13-RI31', 'MCCB18-RI32', 'MCCB19-RI33', 'PLC2',
      'RCB5', 'RCB6', 'RCB7', 'RCB8', 'RCB9', 'RCB10',
      '2#膨化', '2#烘干', '3#膨化', '3#烘干', '4#膨化', '4#烘干'
    ],
  },
  {
    folder: 'Tower 3',
    file: 'PLCTags.xlsx',
    locationId: 'tower3',
    locationName: 'Tower 3',
    format: 'plctags',          // PLCTags format: single sheet, English columns
    sheets: ['PLC Tags'],
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

/** Check if a row is a valid data row.
 *  Accepts:
 *   - Numeric sequence number in the sequence column (normal case)
 *   - Empty sequence (offset col) when the address column (offset+1) has a valid I/O address
 *     (e.g. RCB10 AI section where 序号 is always blank)
 *   - YES / PASS in the sequence column (verification markers) when address column is valid
 *     (e.g. rows marked as checked/passed before the user's Excel fix)
 */
function isDataRow(row, offset = 0) {
  const seq = row[offset];
  // Numeric value: always valid
  if (typeof seq === 'number') return true;
  const seqStr = seq === undefined || seq === null ? '' : String(seq).trim();
  // Pure numeric string: valid
  if (/^\d+$/.test(seqStr)) return true;
  // Empty sequence or YES/PASS marker: validate by address column
  if (seqStr === '' || seqStr.toUpperCase() === 'YES' || seqStr.toUpperCase() === 'PASS') {
    const addr = row[offset + 1];
    const addrStr = addr === undefined || addr === null ? '' : String(addr).trim();
    return /^(I|Q|PIW|PQW)\d/i.test(addrStr);
  }
  return false;
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

/** Parse a single sheet into an array of I/O points row-by-row. */
function parseSheet(wb, sheetName, locationId) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠ Sheet "${sheetName}" not found, skipping.`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const allPoints = [];
  let cols = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if this row contains '序号' and the next cell is '地址'
    let offset = -1;
    for (let c = 0; c < row.length - 1; c++) {
      if (cell(row, c) === '序号' && cell(row, c + 1) === '地址') {
        offset = c;
        break;
      }
    }

    // If we find a header row, update our column mapping
    if (offset >= 0) {
      const format = (cell(row, offset + 4) === '设备名称' && cell(row, offset + 5) === '设备名称') ? 'wide' : 'narrow';
      
      // Find cabinet column by name
      let cabIdx = -1;
      for (let c = 0; c < row.length; c++) {
        if (cell(row, c) === '柜号') {
          cabIdx = c;
          break;
        }
      }

      cols = {
        format,
        offset,
        address: offset + 1,
        symbol: offset + 2,
        code: offset + 3,
        equipCN: offset + 4,
        signalCN: format === 'wide' ? offset + 6 : offset + 5,
        equipEN: format === 'wide' ? offset + 7 : offset + 6,
        signalEN: format === 'wide' ? offset + 8 : offset + 7,
        cabinet: cabIdx >= 0 ? cabIdx : (format === 'wide' ? offset + 9 : offset + 8),
      };
      continue;
    }

    // Process data rows
    if (cols && isDataRow(row, cols.offset)) {
      const address = cell(row, cols.address);
      if (!address) continue;

      // Determine I/O type from address format
      let type = 'DI';
      if (address.startsWith('I')) {
        type = 'DI';
      } else if (address.startsWith('Q')) {
        type = 'DO';
      } else if (address.startsWith('PIW')) {
        type = 'AI';
      } else if (address.startsWith('PQW')) {
        type = 'AO';
      } else {
        // Fallback
        continue;
      }

      // Read Chinese values
      const nameCN = cell(row, cols.equipCN);
      const signalCN = cell(row, cols.signalCN);

      // Read English values (AI and AO usually have tag/remarks in col 6/7, so we fall back to CN)
      let nameEN = '';
      let signalEN = '';
      if (type !== 'AI' && type !== 'AO') {
        nameEN = cell(row, cols.equipEN);
        signalEN = cell(row, cols.signalEN);
      }

      let equipmentName = nameEN || nameCN;
      let signalName = signalEN || signalCN;
      let equipmentCode = cell(row, cols.code);

      // Apply data overrides if present
      if (DATA_OVERRIDES[locationId] && DATA_OVERRIDES[locationId][address]) {
        const ov = DATA_OVERRIDES[locationId][address];
        if (ov.equipmentCode) equipmentCode = ov.equipmentCode;
        if (ov.equipmentName) equipmentName = ov.equipmentName;
        if (ov.signalName) signalName = ov.signalName;
      }

      // Fix truncated codes like "2#", "3#", "4#" where the Excel stores the code across
      // two columns: 设备编号="2#"  and  设备名称="烘干机" → combine into "2#烘干机"
      if (/^\d+#$/.test(equipmentCode) && nameCN) {
        equipmentCode = equipmentCode + nameCN;
      }

      // Extract Bin/Silo codes like E02, B62, P15 from Chinese name if not in code/name
      // Examples: E02仓下料位, P15仓下料位, B62仓...
      const binMatch = nameCN.match(/^([PBE]\d+)(?:仓|号仓|主仓|副仓)?(.*)$/i);
      if (binMatch) {
        const binCode = binMatch[1].toUpperCase(); // E.g., "E02", "P15"
        
        // 1. Update equipmentCode to include both the Bin code and original PLC code
        if (equipmentCode) {
          if (!equipmentCode.toUpperCase().includes(binCode)) {
            equipmentCode = `${binCode} (${equipmentCode})`;
          }
        } else {
          equipmentCode = binCode;
        }

        // 2. Normalize and beautify English name
        // Translate suffix terms from Chinese to English
        let suffix = binMatch[2] ? binMatch[2].trim() : '';
        let enSuffix = '';
        if (suffix.includes('下料位')) {
          enSuffix = 'Low Level';
        } else if (suffix.includes('上料位')) {
          enSuffix = 'High Level';
        } else if (suffix.includes('中料位')) {
          enSuffix = 'Middle Level';
        } else if (suffix.includes('料位')) {
          enSuffix = 'Level';
        } else if (suffix.includes('温度')) {
          enSuffix = 'Temperature';
        }

        const baseEN = (nameEN && nameEN.toLowerCase() !== 'low level' && nameEN.toLowerCase() !== 'high level') 
          ? nameEN 
          : 'Silo';

        if (enSuffix) {
          equipmentName = `${binCode} ${baseEN} ${enSuffix}`;
        } else if (nameEN) {
          equipmentName = nameEN.toLowerCase().includes(binCode.toLowerCase()) 
            ? nameEN 
            : `${binCode} ${nameEN}`;
        } else {
          equipmentName = `${binCode} Silo`;
        }
      }

      const cabinet = cell(row, cols.cabinet) || sheetName;
      const mappedCabinet = getMappedCabinet(cabinet);

      // Extract drawing page offset dynamically from columns index 8 onwards
      let drawingPageOffset = null;
      for (let c = 8; c < row.length; c++) {
        const val = cell(row, c);
        const m = val.match(/^-?(\d+)[A-Z]\d+$/);
        if (m) {
          drawingPageOffset = parseInt(m[1], 10);
          break;
        }
      }

      let drawingPage = null;
      let internalPage = null;
      let drawingPdfUrl = null;

      // Get the location-specific PDF map
      const locMap = pdfPageMap[locationId] || {};

      // 1. Direct address lookup (most accurate wiring page)
      const uppercaseAddr = address.toUpperCase();
      if (locMap.addresses && locMap.addresses[uppercaseAddr]) {
        drawingPage = locMap.addresses[uppercaseAddr].page;
        internalPage = locMap.addresses[uppercaseAddr].internalPage;
        drawingPdfUrl = locMap.drawingUrl || null;
      }

      // 2. Base page calculation fallback
      const basePage = CABINET_BASE_PAGES[mappedCabinet];
      if (!drawingPage && basePage !== undefined && drawingPageOffset !== null) {
        internalPage = String(basePage + drawingPageOffset);
        if (locMap.cabinets && locMap.cabinets[mappedCabinet] && locMap.cabinets[mappedCabinet][internalPage]) {
          drawingPage = locMap.cabinets[mappedCabinet][internalPage];
          drawingPdfUrl = locMap.drawingUrl || null;
        }
      }

      // 2b. Special fallback for 新增RCB4 equipment
      if (!drawingPage && mappedCabinet === 'RCB4' && RCB4_EQUIP_INTERNAL_PAGES[equipmentCode]) {
        internalPage = RCB4_EQUIP_INTERNAL_PAGES[equipmentCode];
        if (locMap.cabinets && locMap.cabinets['RCB4'] && locMap.cabinets['RCB4'][internalPage]) {
          drawingPage = locMap.cabinets['RCB4'][internalPage];
          drawingPdfUrl = locMap.drawingUrl || null;
        }
      }


      // 3. Convert to cabinet-specific PNG image link if mapped
      if (drawingPage && locMap.cabinets) {
        let actualCabinet = mappedCabinet;
        for (const [cabName, pagesMap] of Object.entries(locMap.cabinets)) {
          if (Object.values(pagesMap).map(Number).includes(drawingPage)) {
            actualCabinet = cabName;
            break;
          }
        }

        if (locMap.cabinets[actualCabinet]) {
          const pages = Object.values(locMap.cabinets[actualCabinet]).map(Number);
          if (pages.length > 0) {
            const cabinetMinPage = Math.min(...pages);
            if (drawingPage >= cabinetMinPage) {
              const pageOffset = drawingPage - cabinetMinPage + 1;
              drawingPdfUrl = `/drawings/${locationId}/cabinets/images/${actualCabinet}_page_${pageOffset}.png`;
              drawingPage = pageOffset;
            }
          }
        }
      }

      // 4. Validate that the PNG file actually exists on disk
      if (drawingPdfUrl && !fs.existsSync(path.join(PUBLIC_DIR, drawingPdfUrl))) {
        drawingPage = null;
        internalPage = null;
        drawingPdfUrl = null;
      }

      const cleanCode = translateCN(equipmentCode);
      const cleanName = translateCN(equipmentName);
      const cleanSignal = translateCN(signalName);
      const cleanCabinet = getMappedCabinet(cabinet);

      allPoints.push({
        type,
        seq: Number(row[cols.offset]),
        address,
        equipmentCode: cleanCode,
        equipmentName: cleanName,
        signalName: cleanSignal,
        cabinet: cleanCabinet,
        drawingPage,
        internalPage,
        drawingPdfUrl,
        normalizedCode: normalizeCode(cleanCode),
        normalizedAddress: normalizeAddress(address),
      });
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
            addresses: new Set(),
            drawings: new Set(),
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
        if (io.address) entry.addresses.add(io.address);
        entry.types.add(io.type);
        entry.cabinets.add(io.cabinet);
        if (io.drawingPage) {
          entry.drawings.add(JSON.stringify({
            cabinet: io.cabinet,
            page: io.drawingPage,
            internalPage: io.internalPage,
            drawingPdfUrl: io.drawingPdfUrl
          }));
        }
      }
    }
  }

  // Convert Sets to sorted Arrays
  const index = [];
  for (const entry of equipMap.values()) {
    index.push({
      code: entry.code,
      name: entry.name,
      normalizedCode: normalizeCode(entry.code),
      signals: [...entry.signals].sort(),
      addresses: [...entry.addresses].sort(),
      types: [...entry.types].sort(),
      cabinets: [...entry.cabinets].sort(),
      drawings: [...entry.drawings].map(JSON.parse),
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

// ──────────────────────── PLCTags Parser (Tower 3) ────────────────────────

/**
 * Parse a PLCTags-format sheet (e.g. Tower 3 PLCTags.xlsx).
 * Columns used:
 *   0: Name          → equipmentName
 *   3: Logical Address → address  (strip leading '%')
 *   4: Machine Code   → equipmentCode
 *   5: Cabinet        → cabinet  (for grouping)
 *   6: Signal Name    → signalName
 *
 * Returns a Map<cabinetName, ioPoint[]> so the caller can build cabinet objects.
 */
function parsePLCTagsSheet(wb, sheetName, locationId) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.warn(`  ⚠ Sheet "${sheetName}" not found, skipping.`);
    return new Map();
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const cabinetMap = new Map();   // cabinetName → ioPoint[]

  // Get the location-specific PDF map
  const locMap = pdfPageMap[locationId] || {};

  // Skip header row (row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const name        = cell(row, 0);   // Name (full PLC tag name)
    const logicalAddr = cell(row, 3);   // Logical Address (e.g. %I0.0)
    const machineCode = cell(row, 4);   // Machine Code (e.g. 1_3)
    let cabinet       = cell(row, 5);   // Cabinet (e.g. MCC2)
    const signalName  = cell(row, 6);   // Signal Name (e.g. Running)

    // Skip rows without a valid I/O address
    if (!logicalAddr || !logicalAddr.match(/^(%?)(I|Q|IW|QW|PIW|PQW|\d+I|\d+Q)/i)) continue;
    // Skip memory addresses (%M...)
    if (/^%M/i.test(logicalAddr)) continue;

    // Strip leading '%' from address to match existing format
    const address = logicalAddr.replace(/^%/, '');
    const uppercaseAddr = address.toUpperCase();

    // If cabinet is missing or '-', try to determine cabinet from pdf-page-map address lookup
    if (!cabinet || cabinet === '-' || cabinet === '—') {
      if (locMap.addresses && locMap.addresses[uppercaseAddr]) {
        const dPage = locMap.addresses[uppercaseAddr].page;
        if (dPage && locMap.cabinets) {
          for (const [cabName, pagesMap] of Object.entries(locMap.cabinets)) {
            if (Object.values(pagesMap).map(Number).includes(dPage)) {
              cabinet = cabName;
              break;
            }
          }
        }
      }
      if (!cabinet || cabinet === '-' || cabinet === '—') {
        cabinet = 'PLC'; // Fallback cabinet
      }
    }

    // Determine I/O type from address
    let type = 'DI';
    if (/^IW/i.test(address) || /^PIW/i.test(address)) {
      type = 'AI';
    } else if (/^QW/i.test(address) || /^PQW/i.test(address)) {
      type = 'AO';
    } else if (/^Q/i.test(address) || /^\d+Q/i.test(address)) {
      type = 'DO';
    } else if (/^I/i.test(address) || /^\d+I/i.test(address)) {
      type = 'DI';
    }

    // Drawing page lookup via pdf-page-map
    let drawingPage = null;
    let internalPage = null;
    let drawingPdfUrl = null;

    if (locMap.addresses && locMap.addresses[uppercaseAddr]) {
      drawingPage = locMap.addresses[uppercaseAddr].page;
      internalPage = locMap.addresses[uppercaseAddr].internalPage;
      drawingPdfUrl = locMap.drawingUrl || null;
    }

    // Cabinet-based fallback for drawing page
    const mappedCabinet = getMappedCabinet(cabinet);
    const basePage = CABINET_BASE_PAGES[mappedCabinet];
    // Note: PLCTags format doesn't have page offsets, so only address lookup works

    // Convert to cabinet-specific PNG image link if mapped
    if (drawingPage && locMap.cabinets) {
      let actualCabinet = mappedCabinet;
      for (const [cabName, pagesMap] of Object.entries(locMap.cabinets)) {
        if (Object.values(pagesMap).map(Number).includes(drawingPage)) {
          actualCabinet = cabName;
          break;
        }
      }

      if (locMap.cabinets[actualCabinet]) {
        const pages = Object.values(locMap.cabinets[actualCabinet]).map(Number);
        if (pages.length > 0) {
          const cabinetMinPage = Math.min(...pages);
          if (drawingPage >= cabinetMinPage) {
            const pageOffset = drawingPage - cabinetMinPage + 1;
            drawingPdfUrl = `/drawings/${locationId}/cabinets/images/${actualCabinet}_page_${pageOffset}.png`;
            drawingPage = pageOffset;
          }
        }
      }
    }

    // Validate that the PNG file actually exists on disk
    if (drawingPdfUrl && !fs.existsSync(path.join(PUBLIC_DIR, drawingPdfUrl))) {
      drawingPage = null;
      internalPage = null;
      drawingPdfUrl = null;
    }

    const cleanCode = translateCN(machineCode);
    const cleanName = translateCN(name);
    const cleanSignal = translateCN(signalName);
    const cleanCabinet = getMappedCabinet(cabinet);

    const point = {
      type,
      seq: i,
      address,
      equipmentCode: cleanCode,
      equipmentName: cleanName,
      signalName: cleanSignal,
      cabinet: cleanCabinet,
      drawingPage,
      internalPage,
      drawingPdfUrl,
      normalizedCode: normalizeCode(cleanCode),
      normalizedAddress: normalizeAddress(address),
    };

    if (!cabinetMap.has(cabinet)) {
      cabinetMap.set(cabinet, []);
    }
    cabinetMap.get(cabinet).push(point);
  }

  return cabinetMap;
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
    const filePath = path.join(DATA_DIR, config.folder, config.file);
    console.log(`📂 Reading: ${config.folder}/${config.file}`);

    const wb = XLSX.readFile(filePath);
    const cabinets = [];

    if (config.format === 'plctags') {
      // ── PLCTags format (e.g. Tower 3) ──
      for (const sheetName of config.sheets) {
        process.stdout.write(`  📋 Parsing PLCTags sheet: ${sheetName} ... `);
        const cabinetMap = parsePLCTagsSheet(wb, sheetName, config.locationId);
        let sheetTotal = 0;

        // Sort cabinets alphabetically for consistent output
        const sortedCabinets = [...cabinetMap.keys()].sort();
        for (const cabName of sortedCabinets) {
          const ioPoints = cabinetMap.get(cabName);
          sheetTotal += ioPoints.length;
          cabinets.push({
            id: cabName,
            name: cabName,
            io: ioPoints,
          });
        }
        console.log(`${sheetTotal} I/O points across ${sortedCabinets.length} cabinets`);
      }
    } else {
      // ── Original multi-sheet format (Premixer, Tower 2) ──
      for (const sheetName of config.sheets) {
        process.stdout.write(`  📋 Parsing sheet: ${sheetName} ... `);
        const ioPoints = parseSheet(wb, sheetName, config.locationId);
        console.log(`${ioPoints.length} I/O points`);

        if (ioPoints.length > 0) {
          cabinets.push({
            id: sheetName,
            name: sheetName,
            io: ioPoints,
          });
        }
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
