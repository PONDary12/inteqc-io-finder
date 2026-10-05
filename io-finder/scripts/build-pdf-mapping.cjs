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
  'MCCB1', 'MCCB2', 'MCCB3', 'MCCB4', 'MCCB5', 'MCCB6', 'MCCB7', 'MCCB8', 'MCCB9',
  'MCCB10', 'MCCB13', 'MCCB18', 'MCCB19', 'PLC2', 'RCB5', 'RCB6', 'RCB7', 'RCB8',
  'RCB9', 'RCB10', '2#膨化', '2#烘干', '3#膨化', '3#烘干', '4#膨化', '4#烘干'
];

const CAB_RANGES_P1 = [
  { min: 100, max: 299, minPdf: 8, maxPdf: 100, cabinet: 'MCC1-2' },
  { min: 300, max: 399, minPdf: 101, maxPdf: 156, cabinet: 'MCC3-4' },
  { min: 400, max: 499, minPdf: 157, maxPdf: 219, cabinet: 'MCC5-6' },
  { min: 500, max: 599, minPdf: 220, maxPdf: 282, cabinet: 'MCC7-8' },
  { min: 600, max: 799, minPdf: 283, maxPdf: 374, cabinet: 'MCC9_10' },
  { min: 800, max: 1199, minPdf: 375, maxPdf: 523, cabinet: 'MCC11' },
  { min: 1200, max: 1229, minPdf: 524, maxPdf: 550, cabinet: 'PLC1' },
  { min: 1230, max: 1399, minPdf: 551, maxPdf: 613, cabinet: 'RCB2' },
  { min: 1400, max: 1499, minPdf: 614, maxPdf: 667, cabinet: 'RCB3' },
  { min: 1500, max: 1699, minPdf: 668, maxPdf: 743, cabinet: 'RCB1' },
  { min: 1700, max: 1799, minPdf: 744, maxPdf: 770, cabinet: 'RCB4' },
];

const CAB_RANGES_P2 = [
  { min: 2000, max: 2199, minPdf: 24, maxPdf: 124, cabinet: 'MCCB1' },
  { min: 2200, max: 2299, minPdf: 125, maxPdf: 189, cabinet: 'MCCB2' },
  { min: 2300, max: 2399, minPdf: 190, maxPdf: 224, cabinet: 'MCCB3' },
  { min: 2400, max: 2499, minPdf: 225, maxPdf: 256, cabinet: 'MCCB4' },
  { min: 2500, max: 2599, minPdf: 257, maxPdf: 288, cabinet: 'MCCB5' },
  { min: 2600, max: 2699, minPdf: 289, maxPdf: 319, cabinet: 'MCCB6' },
  { min: 2700, max: 2799, minPdf: 320, maxPdf: 347, cabinet: 'MCCB7' },
  { min: 2800, max: 2899, minPdf: 348, maxPdf: 378, cabinet: 'MCCB8' },
  { min: 2900, max: 2999, minPdf: 379, maxPdf: 408, cabinet: 'MCCB9' },
  { min: 3000, max: 3099, minPdf: 409, maxPdf: 450, cabinet: 'MCCB10' },
  { min: 3100, max: 3199, minPdf: 451, maxPdf: 496, cabinet: 'MCCB11' },
  { min: 3200, max: 3299, minPdf: 497, maxPdf: 540, cabinet: 'MCCB12' },
  { min: 3300, max: 3399, minPdf: 541, maxPdf: 581, cabinet: 'MCCB13' },
  { min: 3400, max: 3499, minPdf: 582, maxPdf: 621, cabinet: 'MCCB14' },
  { min: 3500, max: 3599, minPdf: 622, maxPdf: 671, cabinet: 'MCCB15' },
  { min: 3600, max: 3699, minPdf: 672, maxPdf: 718, cabinet: 'MCCB16' },
  { min: 3700, max: 3799, minPdf: 719, maxPdf: 761, cabinet: 'MCCB17' },
  { min: 3800, max: 3899, minPdf: 762, maxPdf: 803, cabinet: 'MCCB18' },
  { min: 3900, max: 3999, minPdf: 804, maxPdf: 846, cabinet: 'MCCB19' },
  { min: 4000, max: 4199, minPdf: 847, maxPdf: 986, cabinet: 'PLC2' },
  { min: 4200, max: 4299, minPdf: 987, maxPdf: 1029, cabinet: 'RCB5' },
  { min: 4300, max: 4399, minPdf: 1030, maxPdf: 1073, cabinet: 'RCB6' },
  { min: 4400, max: 4499, minPdf: 1074, maxPdf: 1107, cabinet: 'RCB7' },
  { min: 4500, max: 4599, minPdf: 1108, maxPdf: 1147, cabinet: 'RCB8' },
  { min: 4600, max: 4699, minPdf: 1148, maxPdf: 1183, cabinet: 'RCB9' },
  { min: 4700, max: 4799, minPdf: 1184, maxPdf: 1206, cabinet: 'RCB10' },
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
    cabinetRanges: CAB_RANGES_P1,
  },
  {
    locationId: 'tower2_p2',
    folder: 'Tower 2',
    pdfFile: 'Electrical schematic diagram_Feed mill Tower2 revamp phase2.pdf',
    drawingUrl: '/drawings/tower2_p2/electrical_schematic.pdf',
    cabinetList: CABINETS_P2,
    cabinetRanges: CAB_RANGES_P2,
  },
  {
    locationId: 'tower3',
    folder: 'Tower 3',
    pdfFile: 'INTELQCTower3.pdf',
    drawingUrl: '/drawings/tower3/INTELQCTower3.pdf',
    cabinetRanges: [
      { min: 100, max: 199, minPdf: 61, maxPdf: 64, cabinet: 'MCC1' },
      { min: 200, max: 299, minPdf: 65, maxPdf: 108, cabinet: 'MCC2' },
      { min: 300, max: 399, minPdf: 109, maxPdf: 166, cabinet: 'MCC3' },
      { min: 400, max: 499, minPdf: 167, maxPdf: 216, cabinet: 'MCC4' },
      { min: 500, max: 519, minPdf: 217, maxPdf: 241, cabinet: 'MCC5' },
      { min: 520, max: 599, minPdf: 242, maxPdf: 273, cabinet: 'MCC6' },
      { min: 600, max: 699, minPdf: 274, maxPdf: 319, cabinet: 'MCC7' },
      { min: 700, max: 799, minPdf: 320, maxPdf: 372, cabinet: 'MCC8_9' },
      { min: 800, max: 899, minPdf: 373, maxPdf: 376, cabinet: 'MCC10' },
      { min: 900, max: 999, minPdf: 377, maxPdf: 429, cabinet: 'MCC11' },
      { min: 1000, max: 1199, minPdf: 430, maxPdf: 481, cabinet: 'MCC12_13' },
      { min: 1200, max: 1299, minPdf: 482, maxPdf: 511, cabinet: 'MCC14' },
      { min: 1300, max: 1399, minPdf: 512, maxPdf: 515, cabinet: 'MCC15' },
      { min: 1400, max: 1499, minPdf: 516, maxPdf: 566, cabinet: 'MCC16_17' },
      { min: 1500, max: 1599, minPdf: 567, maxPdf: 620, cabinet: 'MCC18' },
      { min: 1600, max: 1699, minPdf: 621, maxPdf: 648, cabinet: 'MCC19' },
      { min: 1700, max: 1799, minPdf: 649, maxPdf: 652, cabinet: 'MCC20' },
      { min: 1800, max: 1899, minPdf: 653, maxPdf: 715, cabinet: 'MCC21_22' },
      { min: 1900, max: 1999, minPdf: 716, maxPdf: 762, cabinet: 'MCC23_24' },
      { min: 2000, max: 2099, minPdf: 763, maxPdf: 825, cabinet: 'MCC25_26' },
      { min: 4000, max: 4099, minPdf: 826, maxPdf: 891, cabinet: 'MCC27' },
      { min: 2100, max: 2199, minPdf: 892, maxPdf: 927, cabinet: 'PLC' },
      { min: 2200, max: 2299, minPdf: 928, maxPdf: 977, cabinet: 'LCB_1' },
      { min: 2300, max: 2399, minPdf: 978, maxPdf: 1015, cabinet: 'LCB_2' },
      { min: 2100, max: 2510, minPdf: 1016, maxPdf: 1089, cabinet: 'LCB_4' },
      { min: 2511, max: 2599, minPdf: 1090, maxPdf: 1110, cabinet: 'LCB_5' },
      { min: 2600, max: 2699, minPdf: 1111, maxPdf: 1160, cabinet: 'LCB_6A' },
      { min: 2100, max: 2799, minPdf: 1161, maxPdf: 1230, cabinet: 'LCB_6B' },
      { min: 2800, max: 2899, minPdf: 1231, maxPdf: 1294, cabinet: 'LCB_8' },
      { min: 2900, max: 2999, minPdf: 1295, maxPdf: 1343, cabinet: 'LCB_9' },
      { min: 3000, max: 3109, minPdf: 1344, maxPdf: 1377, cabinet: 'LCB_10' },
      { min: 3100, max: 3199, minPdf: 1378, maxPdf: 1400, cabinet: 'Field' },
    ],
  },
];

function getCabinetForPage(pageNum, ranges, pdfPageNum = null) {
  const n = parseInt(pageNum, 10);
  if (isNaN(n)) return null;
  for (const r of ranges) {
    if (n >= r.min && n <= r.max) {
      if (r.minPdf && r.maxPdf && pdfPageNum) {
        if (pdfPageNum >= r.minPdf && pdfPageNum <= r.maxPdf) return r.cabinet;
        continue;
      }
      return r.cabinet;
    }
  }
  return null;
}

function extractInternalPage(text) {
  // 1. Try matching "格式 A4" pattern (e.g. Tower 2 Phase 2 cover/overview sheets: 2101, 2102, 2201...)
  let m = text.match(/格式\s+A4\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) {
    const val = m[1].trim();
    if (!['state', 'check', 'design', 'date', 'mcc', 'plc', 'rcb'].includes(val.toLowerCase())) {
      return val;
    }
  }

  // 2. Tower 2 Title Block: Date follower pattern (100% accurate for Tower 2 Phase 1 & 2 schematic pages)
  //    In the title block column, the date (YYYY/M/D) is immediately followed by the current page number in the "页号 Page" cell.
  //    (NOTE: Do NOT match before WZB/魏正彪 which captures the previous-sheet cross-reference margin number).
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(lines[i])) {
      const nextToken = lines[i + 1];
      if (nextToken && /^[0-9a-zA-Z\.\-_]+$/.test(nextToken)) {
        const lower = nextToken.toLowerCase();
        if (!['state', 'check', 'design', 'date', 'mcc', 'plc', 'rcb', 'efs', 'total', 'g1', 'r1', 'conveyor', 'grinder'].includes(lower)) {
          return nextToken;
        }
      }
    }
  }

  // 3. Try matching "页数" pattern, excluding "总页数" (Muyang-WEM, e.g. Tower 3)
  m = text.match(/(?<!总)页数\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) return m[1].trim();

  // 4. Try matching "页号" pattern, excluding "总页号"
  m = text.match(/(?<!总)页号\s+([0-9a-zA-Z\.\-_]+)/i);
  if (m) return m[1].trim();

  // 5. Try matching date modification block pattern
  m = text.match(/([0-9a-zA-Z\.\-_]+)\s+日期\s+修改\s+姓名/i);
  if (m) return m[1].trim();

  // 6. English title block pattern (Muyang-WEM, e.g. Tower 3)
  //    TOTAL ... 1000|1400 ... 4 <internalPage> 2
  if (text.includes('PAGE') && text.includes('TOTAL')) {
    m = text.match(/\b(?:1000|1400)\b[\s\S]{1,30}?\b4\b\s+(\d{3,4})\s+2/);
    if (m) return m[1].trim();
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

const CAB_PREFIXES = [
  'MCCB10', 'MCCB13', 'MCCB18', 'MCCB19', 'MCCB1', 'MCCB2', 'MCCB3', 'MCCB4', 'MCCB5', 'MCCB6', 'MCCB7', 'MCCB8', 'MCCB9',
  'MCC1_2', 'MCC1-2', 'MCC3_4', 'MCC3-4', 'MCC5_6', 'MCC5-6', 'MCC7_8', 'MCC7-8', 'MCC9_10', 'MCC9-10', 'MCC11',
  'RCB10', 'RCB1', 'RCB2', 'RCB3', 'RCB4', 'RCB5', 'RCB6', 'RCB7', 'RCB8', 'RCB9', 'RCB12', '新增RCB4',
  'PLC1', 'PLC2', 'PLC', 'MCC', 'RCB'
];

function extractEquipFromTitleLine(line) {
  let s = line.replace(/^日期\s*/, '').trim();
  for (const cab of CAB_PREFIXES) {
    if (s.startsWith(cab)) {
      s = s.slice(cab.length).trim();
      break;
    }
  }
  // Match codes with internal hyphens first (e.g. AG-3101-), then fallback to standard code before hyphen
  const m = s.match(/^([A-Z0-9_]+(?:-[A-Z0-9_]+)+)\s*[-–]?/i) || s.match(/^([A-Z0-9_]+)\s*[-–]/i);
  if (m) {
    const code = m[1].toUpperCase().replace(/-/g, '_');
    if (!['MCC', 'RCB', 'PLC', 'EFS', 'WZB', '1511', '1515', '1515_2PN'].includes(code)) {
      return code;
    }
  }
  return null;
}

const SUBDEVICE_SUFFIX_REGEX = /[\._](KM\d*|QF\d*|K\d*|ATS|KA\d*|KT\d*|BS\d*|BST\d*|BQS\d*|SKM\d*|YKM\d*|TA\d*|VF\d*|FR\d*|FU\d*|SA\d*|HL\d*|LL\d*|HA\d*|SQ\d*|SP\d*|ST\d*|BF\d*|BZSO\d*|PT\d*|TT\d*|LT\d*|QK\d*|SES\d*|PU\d*|YV\d*|SV\d*|AH\d*|F|[UVW]|[AB])$/i;

function stripSubdeviceSuffix(str) {
  if (!str) return '';
  let s = str;
  while (SUBDEVICE_SUFFIX_REGEX.test(s)) {
    s = s.replace(SUBDEVICE_SUFFIX_REGEX, '');
  }
  return s;
}

const IEC_SUFFIX_REGEX = SUBDEVICE_SUFFIX_REGEX;

function isWireMarkerOrCoordinate(str) {
  if (!str) return false;
  // CAD wire coordinates like 719.21, 719.42, 714.22
  if (/^\d{3,4}\.\d{2,}$/.test(str)) return true;
  // Branch ferrules like 2_9.1A, 2_9.1B, 2_9.1a
  if (/[\._]\d+[A-Za-z]$/i.test(str)) return true;
  // Sensor tags like 2_9TM1, 2_9TM2
  if (/[\._]?TM\d+$/i.test(str)) return true;
  return false;
}

function classifySchematicPage(text, title) {
  const titleLower = (title || '').toLowerCase();
  const textLower = (text || '').toLowerCase();

  // 1. Terminal Schedule Table check (端子接线图 / 端子排):
  // Tabular wiring schedule with destination columns (下端目标, 上端目标, 端子号, 线号)
  if (
    textLower.includes('下端目标') ||
    textLower.includes('上端目标') ||
    textLower.includes('端子号') ||
    textLower.includes('端子接线') ||
    textLower.includes('端子图') ||
    textLower.includes('端子排') ||
    titleLower.includes('端子接线') ||
    titleLower.includes('端子排') ||
    titleLower.includes('端子') ||
    /=-?[a-z0-9_]+\+-x[a-z0-9_]+/i.test(titleLower)
  ) {
    return { label: 'Terminal Schedule Table', type: 'terminal' };
  }

  // 2. Layout / Enclosure / Field Control Box check:
  // Mechanical layout or physical box drawing with dimensions (现场箱, control box, 外形, 尺寸)
  if (
    titleLower.includes('布置') ||
    titleLower.includes('排布') ||
    titleLower.includes('mounting plate') ||
    titleLower.includes('安装板') ||
    titleLower.includes('柜体布置') ||
    titleLower.includes('排布图') ||
    titleLower.includes('cabinet layout') ||
    titleLower.includes('现场箱') ||
    titleLower.includes('control box') ||
    titleLower.includes('controlbox') ||
    titleLower.includes('外形') ||
    titleLower.includes('尺寸') ||
    textLower.includes('柜体布置图') ||
    textLower.includes('元件排布图') ||
    textLower.includes('柜体排布')
  ) {
    return { label: 'Cabinet Layout', type: 'layout' };
  }

  // 3. Power Metering (Sheet 719, Acrel, PZ80, etc. Strictly genuine meters)
  if (
    titleLower.includes('计量') ||
    titleLower.includes('电量') ||
    titleLower.includes('meter') ||
    textLower.includes('pz80') ||
    textLower.includes('acrel') ||
    textLower.includes('安科瑞') ||
    textLower.includes('测量电量') ||
    textLower.includes('电量计量') ||
    textLower.includes('wpj') ||
    textLower.includes('pj1') ||
    textLower.includes('电度')
  ) {
    return { label: 'Power Metering', type: 'meter' };
  }

  // 4. Soft Starter Circuit (PSTX, ATS, 软起)
  if (
    titleLower.includes('软起') ||
    titleLower.includes('soft start') ||
    textLower.includes('pstx') ||
    textLower.includes('-ats') ||
    textLower.includes('软起动器') ||
    textLower.includes('软起') ||
    textLower.includes('soft start')
  ) {
    return { label: 'Soft Starter Circuit', type: 'starter' };
  }

  // 5. VFD Drive Circuit (变频器, Inverter, VFD)
  if (
    titleLower.includes('变频') ||
    titleLower.includes('vfd') ||
    titleLower.includes('inverter') ||
    textLower.includes('变频器') ||
    textLower.includes('inverter') ||
    textLower.includes('atv') ||
    textLower.includes('g120')
  ) {
    return { label: 'VFD Drive Circuit', type: 'vfd' };
  }

  // 6. Speed Monitoring (提升机测速, 刮板机测速, 绞龙测速, 测速开关, -BST)
  if (
    titleLower.includes('测速') ||
    titleLower.includes('speed') ||
    textLower.includes('测速开关') ||
    textLower.includes('提升机测速') ||
    textLower.includes('刮板机测速') ||
    textLower.includes('绞龙测速') ||
    textLower.includes('速度开关') ||
    /-[a-z0-9_\.]*-bst\b/i.test(text)
  ) {
    return { label: 'Speed Monitoring', type: 'speed' };
  }

  // 7. Level Sensor Circuit (料位开关, 上料位, 下料位, 高料位, 低料位, 阻旋料位, 音叉料位, -HL/-LL)
  if (
    titleLower.includes('料位') ||
    titleLower.includes('level') ||
    textLower.includes('上料位') ||
    textLower.includes('下料位') ||
    textLower.includes('高料位') ||
    textLower.includes('低料位') ||
    textLower.includes('阻旋料位') ||
    textLower.includes('音叉料位') ||
    /-[a-z0-9_\.]*-(hl|ll)\b/i.test(text)
  ) {
    return { label: 'Level Sensor Circuit', type: 'level' };
  }

  // 8. Temperature Monitoring (安全栅, 测温, PT100, YB930H, 轴承温度)
  if (
    titleLower.includes('测温') ||
    titleLower.includes('温度') ||
    titleLower.includes('temperature') ||
    textLower.includes('yb930') ||
    textLower.includes('测温') ||
    textLower.includes('热电阻') ||
    textLower.includes('pt100') ||
    textLower.includes('安全栅') ||
    textLower.includes('bearing temp') ||
    textLower.includes('chamber temp')
  ) {
    return { label: 'Temperature Monitoring', type: 'monitoring' };
  }

  // 9. Valve & Actuator (电磁阀, 气动阀, 闸门, 换向)
  if (
    titleLower.includes('阀') ||
    titleLower.includes('valve') ||
    titleLower.includes('换向') ||
    titleLower.includes('闸门') ||
    textLower.includes('电磁阀') ||
    textLower.includes('导向阀') ||
    textLower.includes('气动阀') ||
    textLower.includes('开门到位') ||
    textLower.includes('关门到位') ||
    textLower.includes('slide gate') ||
    textLower.includes('v型闸门')
  ) {
    return { label: 'Valve & Actuator', type: 'valve' };
  }

  // 10. Auxiliary Controller (步进电机控制仪, 喂料器控制器, step controller)
  if (
    titleLower.includes('步进') ||
    titleLower.includes('控制仪') ||
    titleLower.includes('feeder') ||
    textLower.includes('步进电机控制仪') ||
    textLower.includes('step controller') ||
    textLower.includes('喂料器控制')
  ) {
    return { label: 'Auxiliary Controller', type: 'auxiliary' };
  }

  // 11. Power Distribution Circuit (打包秤电源, 打包称供电, 喷涂机供电, etc.)
  if (
    titleLower.includes('供电') ||
    titleLower.includes('电源') ||
    textLower.includes('打包秤电源') ||
    textLower.includes('打包称供电') ||
    textLower.includes('喷涂机供电')
  ) {
    return { label: 'Power Distribution Circuit', type: 'power' };
  }

  // 12. Combined DOL Motor Starter & Control vs Pure Main Power vs Pure Motor Control (IEC standards)
  const hasPowerBreaker = textLower.includes('-qf') || textLower.includes('gv2') || textLower.includes('nsc') || textLower.includes('ae1');
  const hasPowerContactor = /-[a-z0-9_\.]*-km\b/i.test(text) && (textLower.includes('1 2') || textLower.includes('3 4') || textLower.includes('5 6') || textLower.includes('zkm') || textLower.includes('fkm') || textLower.includes('d09') || textLower.includes('d18') || textLower.includes('d25') || textLower.includes('d32'));
  const hasMotor = textLower.includes('3~m') || /[-_]m\d*\b/i.test(text) || /(?:\b|_)\d+(?:\.\d+)?kw(?:\b|_)/i.test(text);
  const isScrewFeederPower = (textLower.includes('配料绞龙') || titleLower.includes('配料绞龙')) && (textLower.includes('-km') || textLower.includes('-fr') || textLower.includes('contactor') || textLower.includes('lrd'));
  const isPowerCircuit = titleLower.includes('主回路') || textLower.includes('主回路') || (hasPowerBreaker && (hasPowerContactor || hasMotor)) || /\b(250KW|355KW|200KW|160KW|132KW|110KW)\b/i.test(text) || isScrewFeederPower;

  const hasControlCoils = (textLower.includes('a1') && textLower.includes('a2')) || textLower.includes('coil');
  const hasControlRelays = textLower.includes('-ka') || textLower.includes('-k1') || textLower.includes('-k2');
  const hasControlPower = textLower.includes('1dc24v') || textLower.includes('dc0v') || textLower.includes('ac220v.e2') || textLower.includes('1ac220v');
  const hasPlcSignals = textLower.includes('10i') || textLower.includes('10q') || (textLower.includes('start') && textLower.includes('running'));
  const isControlCircuit = titleLower.includes('控制') || textLower.includes('控制回路') || (hasControlCoils && (hasControlRelays || hasControlPower || hasPlcSignals));

  // Combined motor sheets and mixer control sheets take precedence over Safety & Interlock
  const isCombinedMotorOrMixer = hasPowerContactor || hasMotor || hasControlCoils || isScrewFeederPower;

  if (isCombinedMotorOrMixer) {
    if (isPowerCircuit && isControlCircuit) {
      return { label: 'Motor Starter & Control', type: 'starter' };
    }
    if (isPowerCircuit) {
      return { label: 'Main Power Circuit', type: 'power' };
    }
    if (isControlCircuit) {
      return { label: 'Motor Control Circuit', type: 'control' };
    }
  }

  // 13. Safety & Interlock (门保, 急停, 正反转选择, FOR/REV, 跑偏, 拉绳)
  if (
    titleLower.includes('门保') ||
    titleLower.includes('急停') ||
    titleLower.includes('安全') ||
    titleLower.includes('正反转') ||
    textLower.includes('门保') ||
    textLower.includes('door protect') ||
    textLower.includes('防堵') ||
    textLower.includes('跑偏') ||
    textLower.includes('拉绳') ||
    textLower.includes('正反转选择') ||
    textLower.includes('for./rev.') ||
    textLower.includes('estop')
  ) {
    return { label: 'Safety & Interlock', type: 'safety' };
  }

  // Fallback for remaining motor/power/control circuits
  if (isPowerCircuit && isControlCircuit) {
    return { label: 'Motor Starter & Control', type: 'starter' };
  }
  if (isPowerCircuit) {
    return { label: 'Main Power Circuit', type: 'power' };
  }
  if (isControlCircuit) {
    return { label: 'Motor Control Circuit', type: 'control' };
  }

  // 14. PLC Control Circuit (ET200, WAGO, PLC DI/DQ)
  if (
    textLower.includes('plc') ||
    textLower.includes('di') ||
    textLower.includes('dq') ||
    textLower.includes('et200') ||
    textLower.includes('wago')
  ) {
    return { label: 'PLC Control Circuit', type: 'control' };
  }

  return { label: 'Schematic Diagram', type: 'schematic' };
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
  const equipmentDrawings = {};
  const tempAddressRecords = {};
  const addrRegex = /\b\d*(?:I|Q)\d+\.\d+\b|\b(?:PIW|PQW|IW|QW)\d+\b/g;

  const pageInfos = res.pages.map(page => ({
    num: page.num,
    text: page.text,
    internalPageStr: extractInternalPage(page.text)
  }));

  // Interpolate missing internal page numbers where PDF page gap equals internal page gap
  for (let i = 0; i < pageInfos.length; i++) {
    if (!pageInfos[i].internalPageStr) {
      let prevIdx = i - 1;
      while (prevIdx >= 0 && !pageInfos[prevIdx].internalPageStr) prevIdx--;
      let nextIdx = i + 1;
      while (nextIdx < pageInfos.length && !pageInfos[nextIdx].internalPageStr) nextIdx++;

      if (prevIdx >= 0 && nextIdx < pageInfos.length) {
        const prevP = parseInt(pageInfos[prevIdx].internalPageStr, 10);
        const nextP = parseInt(pageInfos[nextIdx].internalPageStr, 10);
        const pdfGap = pageInfos[nextIdx].num - pageInfos[prevIdx].num;
        const intGap = nextP - prevP;

        if (!isNaN(prevP) && !isNaN(nextP) && pdfGap === intGap) {
          const offset = pageInfos[i].num - pageInfos[prevIdx].num;
          pageInfos[i].internalPageStr = String(prevP + offset);
        }
      }
    }
  }

  pageInfos.forEach(page => {
    const text = page.text;
    const pageNum = page.num;

    const internalPageStr = page.internalPageStr;
    if (!internalPageStr) return;
    // Skip TOC / overview index pages (e.g. 1.a, 1.c) in Tower 2 drawings
    if (loc.cabinetList && internalPageStr.includes('.')) return;


    // A. Cabinet mapping
    let cabinet = null;
    if (loc.cabinetRanges && loc.cabinetRanges.length > 0) {
      cabinet = getCabinetForPage(internalPageStr, loc.cabinetRanges, pageNum);
    } else if (loc.cabinetList) {
      const sortedCabinetList = [...loc.cabinetList].sort((a, b) => b.length - a.length);
      const title = extractTitle(text);
      
      // 1. Try exact title block match (highest reliability)
      for (const cab of sortedCabinetList) {
        const cleanCab = cab.replace(/[_\-]/g, '').toLowerCase();
        const cleanTitle = title.replace(/[_\-]/g, '').toLowerCase();
        if (cleanTitle.includes(cleanCab)) {
          cabinet = cab;
          break;
        }
      }
      
      // 2. Try scoring matches in full text if title match failed
      if (!cabinet) {
        let bestCab = null;
        let maxScore = 0;
        for (const cab of sortedCabinetList) {
          let score = 0;
          const cleanCab = cab.replace(/[_\-]/g, '').toLowerCase();
          
          // 2a. Title Block Line check (High priority)
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            const isTitleLine = 
              line.includes('日期') || 
              line.includes('设计') || 
              line.includes('审核') || 
              line.includes('++MCC') || 
              line.includes('页号') || 
              line.includes('Page') ||
              line.includes('WZB') ||
              line.includes('魏正彪');
              
            if (isTitleLine) {
              const cleanLine = line.replace(/[_\-]/g, '').toLowerCase();
              const titleRegex = new RegExp(`\\b${cleanCab}\\b|\\b${cleanCab}\\d*[a-zA-Z]`, 'i');
              if (titleRegex.test(cleanLine)) {
                score += 500;
              }
            }
          }

          // 2b. Cabinet header patterns (e.g. "=++MCC+MCCB3" or "+MCCB4 -XDI24")
          const headerRegexes = [
            new RegExp(`\\+\\+mcc\\+${cleanCab}\\b`, 'i'),
            new RegExp(`\\+\\+mcc\\s+${cleanCab}\\b`, 'i'),
            new RegExp(`\\+mcc\\+${cleanCab}\\b`, 'i'),
            new RegExp(`\\+\\s*${cleanCab}\\b`, 'i'),
            new RegExp(`\\b${cleanCab}\\s*=\\s*\\+\\+mcc`, 'i'),
            new RegExp(`\\b${cleanCab}\\d*[a-zA-Z]`, 'i'),
            new RegExp(`\\b${cleanCab}\\s*(?:魏正彪|WZB|日期)`, 'i')
          ];
          for (const regex of headerRegexes) {
            if (regex.test(text)) score += 100;
          }
          
          // Exact word boundary matches
          const wordRegex = new RegExp(`\\b${cleanCab}\\b`, 'gi');
          const matches = text.replace(/[_\-]/g, '').match(wordRegex);
          if (matches) score += matches.length * 10;
          
          if (score > maxScore) {
            maxScore = score;
            bestCab = cab;
          }
        }
        
        if (bestCab && maxScore >= 50) {
          cabinet = bestCab;
        }
      }
      
      // 3. Fallback: simple substring include
      if (!cabinet) {
        for (const cab of sortedCabinetList) {
          if (text.toLowerCase().includes(cab.toLowerCase())) {
            cabinet = cab;
            break;
          }
        }
      }
    }

    if (cabinet) {
      if (!cabinetMap[cabinet]) cabinetMap[cabinet] = {};
      cabinetMap[cabinet][internalPageStr] = pageNum;
    }

    // B. Equipment Schematic Mapping (Capture Power, Soft Starter/VFD, and PLC Control pages)
    const title = loc.cabinetList ? extractTitle(text) : '';
    const tLower = title.toLowerCase();
    const textLower = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const foundEquips = new Set();

    if (!internalPageStr.includes('.')) {
      if (loc.cabinetList) {
        // ─── Tower 2 Style (WZB / 魏正彪) ───
        for (const line of lines) {
          if (line.includes('日期') && !line.includes('修订日期') && !line.includes('布置') && !line.includes('排布') && !line.includes('端子') && !line.includes('目录') && !line.includes('总览') && !line.includes('布局') && !line.includes('拓扑图') && !line.includes('汇总表') && !line.includes('回路') && !line.includes('电源') && !line.includes('供电') && !line.includes('空开')) {
            const eq = extractEquipFromTitleLine(line);
            if (eq) {
              const cleanEq = stripSubdeviceSuffix(eq);
              if (cleanEq && !SUBDEVICE_SUFFIX_REGEX.test(cleanEq)) {
                foundEquips.add(cleanEq);
              }
            }
          }
        }

        if (foundEquips.size > 0) {
          const classification = classifySchematicPage(text, lines.find(l => l.includes('日期')) || '');
          if (classification.type !== 'layout' && classification.type !== 'terminal') {
            foundEquips.forEach(eq => {
              if (!equipmentDrawings[eq]) equipmentDrawings[eq] = [];
              if (!equipmentDrawings[eq].some(d => d.internalPage === internalPageStr)) {
                equipmentDrawings[eq].push({
                  pdfPage: pageNum,
                  internalPage: internalPageStr,
                  label: classification.label,
                  type: classification.type,
                  cabinet: cabinet || null,
                });
              }

              // If code ends with 'V' or '_1', also index the parent machine code if applicable
              if (eq.endsWith('V') && eq.length > 3) {
                const parentEq = eq.slice(0, -1);
                if (!equipmentDrawings[parentEq]) equipmentDrawings[parentEq] = [];
                if (!equipmentDrawings[parentEq].some(d => d.internalPage === internalPageStr)) {
                  equipmentDrawings[parentEq].push({
                    pdfPage: pageNum,
                    internalPage: internalPageStr,
                    label: classification.label,
                    type: classification.type,
                    cabinet: cabinet || null,
                  });
                }
              }
            });
          }
        }
      } else if (loc.cabinetRanges && loc.cabinetRanges.length > 0) {
        // ─── Tower 3 Style (MUYANG-WEM / 泰国inteqc) ───
        let pageTitle = '';

        // 1. Title block: '版权声明 设计 泰国inteqc <REST>'
        const mTitle = text.match(/版权声明\s+设计\s+泰国inteqc\s+([^\n\r]+)/);
        if (mTitle) {
          pageTitle = mTitle[1].trim();
          const eqMatch = pageTitle.match(/^([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*(?:\/[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*|~[Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*)?|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?(?:[A-Za-z0-9_\.\-]*))\b/i);
          if (eqMatch) {
            const raw = eqMatch[1];
            const addCode = (r) => {
              const code = stripSubdeviceSuffix(r.trim().toUpperCase().replace(/-/g, '_'));
              if (code && !SUBDEVICE_SUFFIX_REGEX.test(code)) foundEquips.add(code);
            };
            if (raw.includes('~')) {
              raw.split('~').forEach(addCode);
            } else if (raw.includes('/')) {
              raw.split('/').forEach(addCode);
            } else {
              addCode(raw);
            }
          }
        }

        // 2. Title block: 'DRAWN <Cab> <Sub> <REST>'
        for (let j = 0; j < lines.length; j++) {
          if (lines[j].includes('DRAWN')) {
            const next1 = lines[j+1] || '';
            const next2 = lines[j+2] || '';
            const combo = next1 + ' ' + next2;
            pageTitle = pageTitle || combo;
            const eqMatch = combo.match(/\b([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?(?:[A-Za-z0-9_\.\-]*))\b/i);
            if (eqMatch) {
              const code = stripSubdeviceSuffix(eqMatch[1].trim().toUpperCase().replace(/-/g, '_'));
              if (code && !SUBDEVICE_SUFFIX_REGEX.test(code)) {
                foundEquips.add(code);
              }
            }
          }
        }

        // 3. Device tags: '-5_69-KM1' or '-2_9-PM' or '-V6.4_1-K' or '-6.83-HL' or '-LA101_1-KM'
        const tagMatches = text.match(/-([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.]*|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?[A-Za-z0-9_\.]*)-(KM\d*|QF\d*|K\d*|ATS|KA\d*|W|M\d*|SQ\d*|SES|QK|PU|YV|SV|HA|SP|ST|BF|BZSO|HL|LL|PT|TT|LT|FU\d*|SA|PM\d*|L\d*|U\d*)\b/gi);
        if (tagMatches) {
          tagMatches.forEach(tag => {
            const tm = tag.match(/-([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.]*|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?[A-Za-z0-9_\.]*)-(KM\d*|QF\d*|K\d*|ATS|KA\d*|W|M\d*|SQ\d*|SES|QK|PU|YV|SV|HA|SP|ST|BF|BZSO|HL|LL|PT|TT|LT|FU\d*|SA|PM\d*|L\d*|U\d*)\b/i);
            if (tm) {
              const code = stripSubdeviceSuffix(tm[1].trim().toUpperCase().replace(/-/g, '_'));
              if (code && !SUBDEVICE_SUFFIX_REGEX.test(code) && !isWireMarkerOrCoordinate(code)) {
                foundEquips.add(code);
              }
            }
          });
        }

        const isUnitOrRating = (str) => /^[0-9]+(\.[0-9]+)?(KW|A|V|W|HZ|RPM|MA|KVA)$/i.test(str);

        // Check if this sheet is a shared rack card, power distribution, or system layout sheet
        // NOTE: Strictly check '安装板' only on pageTitle, NEVER on textLower (ABB soft starter earthing notes mention '安装板')
        const isSharedCardOrLayout = 
          pageTitle.includes('Wago DI') ||
          pageTitle.includes('Wago DO') ||
          pageTitle.includes('Wago AI') ||
          pageTitle.includes('Wago AO') ||
          pageTitle.includes('CPU1215') ||
          pageTitle.includes('SM1223') ||
          pageTitle.includes('SM1231') ||
          pageTitle.includes('SM1234') ||
          pageTitle.includes('远程站模块布局') ||
          pageTitle.includes('模块分布') ||
          pageTitle.includes('电源进线') ||
          pageTitle.includes('电源分配') ||
          pageTitle.includes('控制电源') ||
          pageTitle.includes('照明') ||
          pageTitle.includes('急停') ||
          pageTitle.includes('目录') ||
          pageTitle.includes('封页') ||
          pageTitle.includes('标题页') ||
          pageTitle.includes('端子') ||
          pageTitle.includes('网络图') ||
          pageTitle.includes('触摸电脑') ||
          pageTitle.includes('布置') ||
          pageTitle.includes('排布') ||
          pageTitle.includes('mounting plate') ||
          pageTitle.includes('安装板') ||
          pageTitle.includes('柜体') ||
          pageTitle.includes('现场箱') ||
          pageTitle.includes('control Box') ||
          pageTitle.includes('controlbox') ||
          pageTitle.includes('外形') ||
          pageTitle.includes('尺寸') ||
          pageTitle.includes('AI ZWP') ||
          pageTitle.includes('DO ZWP') ||
          pageTitle.includes('DI ZWP') ||
          pageTitle.includes('AO ZWP') ||
          textLower.includes('下端目标') ||
          textLower.includes('上端目标') ||
          textLower.includes('端子号') ||
          textLower.includes('端子接线') ||
          textLower.includes('柜体布置图') ||
          textLower.includes('元件排布图') ||
          textLower.includes('排布图');

        // 4. Lines matching plant equipment pattern ([0-9]+[_\.][0-9]+) - Only if NOT a shared sheet and no title/tag match found
        if (!isSharedCardOrLayout && foundEquips.size === 0) {
          for (const line of lines) {
            const trimmed = line.trim().toUpperCase().replace(/-/g, '_');
            if (/[0-9]+/.test(trimmed) && trimmed.length <= 15 && !isUnitOrRating(trimmed) && !isWireMarkerOrCoordinate(trimmed)) {
              if (/^(?:[Vv]?[0-9]+[_\.][0-9]+|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?)[A-Za-z0-9_\.]*$/i.test(trimmed)) {
                const code = stripSubdeviceSuffix(trimmed);
                if (code && !SUBDEVICE_SUFFIX_REGEX.test(code) && !isWireMarkerOrCoordinate(code)) {
                  foundEquips.add(code);
                }
              }
            }
          }
        }

        const ignoreWords = new Set(['MCC', 'PLC', 'LCB', 'PCB', 'TOTAL', 'PAGE', 'DRAWN', 'WAGO', 'DATE', 'SA', 'CA', 'ZWP', 'WEM', 'FIELD']);

        if (!isSharedCardOrLayout && foundEquips.size > 0) {
          const classification = classifySchematicPage(text, pageTitle);
          if (classification.type !== 'layout' && classification.type !== 'terminal') {
            foundEquips.forEach(rawEq => {
              const eq = stripSubdeviceSuffix(rawEq);
              if (ignoreWords.has(eq) || isUnitOrRating(eq) || /^\d+KW$/i.test(eq) || /^\d+A$/i.test(eq) || SUBDEVICE_SUFFIX_REGEX.test(eq) || isWireMarkerOrCoordinate(eq)) return;
              if (!equipmentDrawings[eq]) equipmentDrawings[eq] = [];
              if (!equipmentDrawings[eq].some(d => d.internalPage === internalPageStr)) {
                equipmentDrawings[eq].push({
                  pdfPage: pageNum,
                  internalPage: internalPageStr,
                  label: classification.label,
                  type: classification.type,
                  cabinet: cabinet || null,
                });
              }
            });
          }
        }
      }
    }

    // C. Address mapping — prefer wiring diagram pages over terminal connection tables
    const matches = text.match(addrRegex);
    if (matches) {
      const internalPageNum = parseInt(internalPageStr, 10);
      
      // Determine priority of this page:
      // Priority 2: Wiring schematic diagram (preferred)
      // Priority 1: Overview / I/O list / general table
      // Priority 0: Terminal connection table (.a, .b sheets, 端子接线图) - lowest priority
      const isTerminalTable =
        /\.[a-z]$/i.test(internalPageStr) ||
        textLower.includes('端子接线') ||
        textLower.includes('端子号') ||
        textLower.includes('端子排') ||
        textLower.includes('端子图') ||
        textLower.includes('下端目标') ||
        textLower.includes('上端目标') ||
        textLower.includes('下级目标') ||
        textLower.includes('上级目标') ||
        textLower.includes('down target') ||
        textLower.includes('up target') ||
        (typeof pageTitle !== 'undefined' && pageTitle && pageTitle.includes('端子')) ||
        tLower.includes('端子');

      const isOverview =
        tLower.includes('信号总览') ||
        tLower.includes('信号分配') ||
        tLower.includes('overview') ||
        tLower.includes('i/o list') ||
        tLower.includes('iolist') ||
        tLower.includes('loop diagram') ||
        /-x[a-z]\d+/i.test(tLower) ||
        tLower.includes('照明') ||
        tLower.includes('插座') ||
        tLower.includes('布置') ||
        tLower.includes('layout') ||
        tLower.includes('目录') ||
        tLower.includes('index') ||
        tLower.includes('title') ||
        tLower.includes('cover') ||
        tLower.includes('说明') ||
        tLower.includes('revision');

      let priority = 2; // Default: Wiring schematic diagram
      if (isTerminalTable) {
        priority = 0; // Lowest priority: Terminal connection table
      } else if (isOverview) {
        priority = 1; // Medium priority: Signal overview
      }

      matches.forEach(addr => {
        const key = addr.toUpperCase();
        
        let shouldReplace = false;
        if (!tempAddressRecords[key]) {
          shouldReplace = true;
        } else {
          const oldPriority = tempAddressRecords[key].priority !== undefined ? tempAddressRecords[key].priority : 2;
          if (priority > oldPriority) {
            shouldReplace = true;
          } else if (priority === oldPriority) {
            if (!isNaN(internalPageNum) && internalPageNum < tempAddressRecords[key].internalPage) {
              shouldReplace = true;
            }
          }
        }

        if (shouldReplace) {
          tempAddressRecords[key] = {
            pdfPage: pageNum,
            internalPage: isNaN(internalPageNum) ? Infinity : internalPageNum,
            internalPageStr,
            priority
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

  // For Tower 3: Also scan TOC pages (pages 1 to 53) to link official machine titles to internal pages
  if (loc.locationId === 'tower3') {
    for (let i = 0; i < 54 && i < res.pages.length; i++) {
      const text = res.pages[i].text;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const m = line.match(/(.*?)(?:2021\/\d+\/\d+.*?|\s+)(\d{3,4})$/);
        if (m) {
          const title = m[1].trim();
          const intP = m[2];
          const isTocShared = 
            title.includes('Wago') ||
            title.includes('CPU1215') ||
            title.includes('SM1223') ||
            title.includes('SM1231') ||
            title.includes('SM1234') ||
            title.includes('布局') ||
            title.includes('电源') ||
            title.includes('照明') ||
            title.includes('急停') ||
            title.includes('端子') ||
            title.includes('网络图') ||
            title.includes('触摸电脑') ||
            title.includes('布置') ||
            title.includes('排布') ||
            title.includes('安装板');

          if (isTocShared) continue;

          const eqMatch = title.match(/^([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*(?:\/[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*|~[Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*)?|(?:LA|LW|Y)[0-9]+(?:[_\.][0-9]+)?(?:[A-Za-z0-9_\.\-]*))\b/i);
          if (eqMatch) {
            const raw = eqMatch[1];
            const codes = [];
            const addCode = (r) => {
              const c = stripSubdeviceSuffix(r.trim().toUpperCase().replace(/-/g, '_'));
              if (c && !SUBDEVICE_SUFFIX_REGEX.test(c) && !isWireMarkerOrCoordinate(c)) codes.push(c);
            };
            if (raw.includes('~')) {
              raw.split('~').forEach(addCode);
            } else if (raw.includes('/')) {
              raw.split('/').forEach(addCode);
            } else {
              addCode(raw);
            }

            // Find pdfPage and cabinet for intP
            let targetPdfPage = null;
            let targetCab = null;
            for (const [cabName, pages] of Object.entries(cabinetMap)) {
              if (pages[intP]) {
                targetPdfPage = pages[intP];
                targetCab = cabName;
                break;
              }
            }

            if (targetPdfPage) {
              const pageText = res.pages[targetPdfPage - 1] ? res.pages[targetPdfPage - 1].text : '';
              const classification = classifySchematicPage(pageText, title);

              if (classification.type !== 'layout' && classification.type !== 'terminal') {
                const isUnitOrRating = (str) => /^[0-9]+(\.[0-9]+)?(KW|A|V|W|HZ|RPM|MA|KVA)$/i.test(str);
                const ignoreWords = new Set(['MCC', 'PLC', 'LCB', 'PCB', 'TOTAL', 'PAGE', 'DRAWN', 'WAGO', 'DATE', 'SA', 'CA', 'ZWP', 'WEM', 'FIELD']);

                codes.forEach(rawCode => {
                  const code = stripSubdeviceSuffix(rawCode);
                  if (ignoreWords.has(code) || isUnitOrRating(code) || /^\d+KW$/i.test(code) || /^\d+A$/i.test(code) || SUBDEVICE_SUFFIX_REGEX.test(code) || isWireMarkerOrCoordinate(code)) return;
                  if (!equipmentDrawings[code]) equipmentDrawings[code] = [];
                  if (!equipmentDrawings[code].some(d => d.internalPage === intP)) {
                    equipmentDrawings[code].push({
                      pdfPage: targetPdfPage,
                      internalPage: intP,
                      label: classification.label,
                      type: classification.type,
                      cabinet: targetCab,
                    });
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  // Remove any stray subdevice suffix keys, wire markers, or layout sheets from equipmentDrawings
  for (const eq of Object.keys(equipmentDrawings)) {
    if (SUBDEVICE_SUFFIX_REGEX.test(eq) || isWireMarkerOrCoordinate(eq)) {
      // Re-map drawings to parent machine if possible, then delete
      let parentEq = stripSubdeviceSuffix(eq);
      if (isWireMarkerOrCoordinate(parentEq)) {
        parentEq = parentEq.replace(/[\._]\d+[A-Za-z]$/i, '').replace(/[\._]?TM\d+$/i, '');
      }
      if (parentEq && !SUBDEVICE_SUFFIX_REGEX.test(parentEq) && !isWireMarkerOrCoordinate(parentEq)) {
        if (!equipmentDrawings[parentEq]) equipmentDrawings[parentEq] = [];
        for (const dwg of equipmentDrawings[eq]) {
          if (!equipmentDrawings[parentEq].some(d => d.internalPage === dwg.internalPage)) {
            equipmentDrawings[parentEq].push(dwg);
          }
        }
      }
      delete equipmentDrawings[eq];
      continue;
    }
    // Filter out any layout drawings or terminal schedule tables (.a, .b sheets, or type === 'terminal') that might have slipped through
    equipmentDrawings[eq] = equipmentDrawings[eq].filter(d => d.type !== 'layout' && d.type !== 'terminal' && !/\.[a-z]$/i.test(d.internalPage));
    if (equipmentDrawings[eq].length === 0) {
      delete equipmentDrawings[eq];
    }
  }

  // Sort equipmentDrawings by internal page
  for (const eq of Object.keys(equipmentDrawings)) {
    equipmentDrawings[eq].sort((a, b) => {
      const numA = parseInt(a.internalPage, 10);
      const numB = parseInt(b.internalPage, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.pdfPage - b.pdfPage;
    });
  }

  await pdfParser.destroy();

  console.log(`  🔗 Addresses mapped: ${Object.keys(flatAddresses).length}`);
  console.log(`  📦 Cabinets mapped: ${Object.keys(cabinetMap).length}`);
  console.log(`  ⚡ Machines with schematics: ${Object.keys(equipmentDrawings).length}`);

  return {
    drawingUrl: loc.drawingUrl,
    cabinets: cabinetMap,
    addresses: flatAddresses,
    equipmentDrawings: equipmentDrawings,
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
