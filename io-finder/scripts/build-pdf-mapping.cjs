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
    pdfFile: '泰国inteqc Cabinet drawing.pdf',
    drawingUrl: '/drawings/tower3/inteqc_cabinet_drawing.pdf',
    cabinetRanges: [
      { min: 100, max: 199, cabinet: 'MCC1' },
      { min: 200, max: 299, cabinet: 'MCC2' },
      { min: 300, max: 399, cabinet: 'MCC3' },
      { min: 400, max: 499, cabinet: 'MCC4' },
      { min: 500, max: 509, cabinet: 'MCC5' },
      { min: 510, max: 599, cabinet: 'MCC6' },
      { min: 600, max: 699, cabinet: 'MCC7' },
      { min: 700, max: 799, cabinet: 'MCC8_9' },
      { min: 800, max: 899, cabinet: 'MCC10' },
      { min: 900, max: 999, cabinet: 'MCC11' },
      { min: 1000, max: 1199, cabinet: 'MCC12_13' },
      { min: 1200, max: 1299, cabinet: 'MCC14' },
      { min: 1300, max: 1399, cabinet: 'MCC15' },
      { min: 1400, max: 1499, cabinet: 'MCC18' },
      { min: 1500, max: 1599, cabinet: 'MCC19' },
      { min: 1600, max: 1699, cabinet: 'MCC20_21' },
      { min: 1700, max: 1799, cabinet: 'MCC22_23' },
      { min: 1800, max: 1899, cabinet: 'MCC24_25' },
      { min: 1900, max: 1999, cabinet: 'PLC' },
      { min: 2000, max: 2099, cabinet: 'LCB_1' },
      { min: 2100, max: 2199, cabinet: 'LCB_2' },
      { min: 2200, max: 2299, cabinet: 'LCB_4' },
      { min: 2300, max: 2399, cabinet: 'LCB_5' },
      { min: 2400, max: 2499, cabinet: 'LCB_6A' },
      { min: 2500, max: 2599, cabinet: 'LCB_6B' },
      { min: 2600, max: 2699, cabinet: 'LCB_8' },
      { min: 2700, max: 2799, cabinet: 'LCB_9' },
      { min: 2800, max: 2899, cabinet: 'LCB_10' },
      { min: 3000, max: 3099, cabinet: 'CB' },
    ],
  },
  {
    locationId: 'silo',
    folder: 'Silo',
    pdfFile: '泰国inteqc.pdf',
    drawingUrl: '/drawings/silo/electrical_schematic.pdf',
    cabinetList: [
      'CB_01', 'CB_02', 'PLC1', 'PLC2',
      'TB_10', 'TB_11', 'TB_12', 'TB_13', 'TB_14', 'TB_15', 'TB_16', 'TB_17', 'TB_18', 'TB_19',
      'TB_1', 'TB_2', 'TB_3', 'TB_4', 'TB_5', 'TB_6', 'TB_7', 'TB_8', 'TB_9'
    ],
    cabinetRanges: [],
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
  //    TOTAL ... 1000 ... 4 <internalPage> 2
  if (text.includes('PAGE') && text.includes('TOTAL')) {
    m = text.match(/\b1000\b[\s\S]{1,30}?\b4\b\s+(\d{3,4})\s+2/);
    if (m) return m[1].trim();
  }

  // 8. Silo style date-based page number extraction (e.g. 2022/1/4 \n 102)
  const datePageMatch = text.match(/\b\d{4}\/\d{1,2}\/\d{1,2}\s*\n\s*([0-9a-zA-Z\.\-_]+)/);
  if (datePageMatch) {
    return datePageMatch[1].trim();
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

function classifySchematicPage(text, title) {
  const t = (title + '\n' + text).toLowerCase();
  
  if (t.includes('rs485') || t.includes('pz80') || t.includes('acrel') || t.includes('meter') || t.includes('wpj') || t.includes('pj1') || t.includes('电度') || t.includes('电流检测') || t.includes('电流变送器') || t.includes('power calculate') || t.includes('power incoming')) {
    return { label: 'Power & Metering', type: 'power' };
  }
  if ((t.includes('pstx') || t.includes('软起') || t.includes('soft start') || t.includes('星形') || t.includes('三角形') || t.includes('ykm') || t.includes('skm')) && !t.includes('软起故障') && (t.includes('zkm') || t.includes('fkm') || t.includes('km1') || t.includes('qf1') || t.includes('接触器') || t.includes('355kw') || t.includes('250kw') || t.includes('主回路') || t.includes('ykm') || t.includes('skm'))) {
    if (t.includes('pstx') || t.includes('软起') || t.includes('soft start')) {
      return { label: 'Soft Starter Circuit', type: 'starter' };
    }
    return { label: 'Starter Circuit', type: 'starter' };
  }
  if (t.includes('变频') || t.includes('vfd') || t.includes('inverter') || t.includes('atv') || t.includes('g120')) {
    return { label: 'VFD Drive Circuit', type: 'vfd' };
  }
  if (t.includes('启动') || t.includes('start') || t.includes('合闸') || t.includes('运行') || t.includes('running') || t.includes('breaker on')) {
    return { label: 'PLC Control Circuit', type: 'control' };
  }
  if (t.includes('门保') || t.includes('door protect') || t.includes('防堵') || t.includes('跑偏') || t.includes('拉绳') || t.includes('接近开关') || t.includes('急停') || t.includes('estop') || t.includes('speed') || t.includes('belt alignment')) {
    return { label: 'Safety & Interlock', type: 'safety' };
  }
  if (t.includes('导向阀') || t.includes('电磁阀') || t.includes('valve') || t.includes('换向') || t.includes('开门到位') || t.includes('关门到位') || t.includes('风门') || t.includes('slide gate') || t.includes('闸门') || t.includes('v型闸门')) {
    return { label: 'Valve & Actuator', type: 'valve' };
  }
  if (t.includes('接触器') || t.includes('km1') || t.includes('zkm') || t.includes('fkm') || t.includes('kw_') || t.includes('电机') || t.includes('main contact') || t.includes('△ contact') || t.includes('y contact')) {
    if (t.includes('di') || t.includes('dq') || t.includes('plc') || t.includes('ri1-') || t.includes('ri2-')) {
      return { label: 'PLC Control Circuit', type: 'control' };
    }
    return { label: 'Power Circuit', type: 'power' };
  }
  if (t.includes('plc') || t.includes('di') || t.includes('dq') || t.includes('ai') || t.includes('ao') || t.includes('et200') || t.includes('wago')) {
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
      // 4. Silo section fallback for unassigned WAGO IO / control pages
      if (!cabinet && loc.locationId === 'silo') {
        if (pageNum >= 6 && pageNum <= 167) {
          cabinet = 'PLC1';
        } else if (pageNum >= 168 && pageNum <= 342) {
          cabinet = 'PLC2';
        } else if (pageNum === 343) {
          cabinet = 'CB_01';
        } else if (pageNum === 344) {
          cabinet = 'CB_02';
        }
      }
    } else {
      cabinet = getCabinetForPage(internalPageStr, loc.cabinetRanges, pageNum);
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
        // ─── Tower 2 & Silo Style ───
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (line.includes('日期') && !line.includes('修订') && !line.includes('布置') && !line.includes('端子') && !line.includes('目录') && !line.includes('总览') && !line.includes('布局') && !line.includes('拓扑图') && !line.includes('汇总表') && !line.includes('回路') && !line.includes('电源') && !line.includes('供电') && !line.includes('空开')) {
            const eq = extractEquipFromTitleLine(line);
            if (eq) {
              foundEquips.add(eq);
            }
            // Also check adjacent lines for Silo format (e.g. "20.9-1 气动闸门")
            if (loc.locationId === 'silo') {
              const target = [line, lines[j+1] || '', lines[j+2] || ''].join(' ');
              const mSilo = target.match(/\b(\d+[\.\-]\d+[A-Za-z0-9\.\-]*)\b/);
              if (mSilo) {
                foundEquips.add(mSilo[1].replace(/-/g, '_').toUpperCase());
                foundEquips.add(mSilo[1].toUpperCase()); // Also keep raw hyphen format e.g. 22.24-2
              }

              // Also scan for device tags on this sheet: -20.6-BST, -21.1-BQS, etc.
              const tagMatches = text.match(/[-+](\d+[\.\-]\d+[A-Za-z0-9\.\-]*)-[A-Za-z0-9]+/g);
              if (tagMatches) {
                tagMatches.forEach(tm => {
                  const sub = tm.match(/[-+](\d+[\.\-]\d+[A-Za-z0-9\.\-]*)-[A-Za-z0-9]+/);
                  if (sub) {
                    foundEquips.add(sub[1].replace(/-/g, '_').toUpperCase());
                    foundEquips.add(sub[1].toUpperCase());
                  }
                });
              }

              // Also scan for Chinese label patterns: 20.6刮板, 22.1提升机, etc.
              const labelMatches = text.match(/\b(\d+[\.\-]\d+[A-Za-z0-9\.\-]*)[\u4e00-\u9fa5]/g);
              if (labelMatches) {
                labelMatches.forEach(lm => {
                  const sub = lm.match(/\b(\d+[\.\-]\d+[A-Za-z0-9\.\-]*)[\u4e00-\u9fa5]/);
                  if (sub) {
                    foundEquips.add(sub[1].replace(/-/g, '_').toUpperCase());
                    foundEquips.add(sub[1].toUpperCase());
                  }
                });
              }
            }
          }
        }

        if (foundEquips.size > 0) {
          const classification = classifySchematicPage(text, lines.find(l => l.includes('日期')) || '');
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
      } else if (loc.cabinetRanges && loc.cabinetRanges.length > 0) {
        // ─── Tower 3 Style (MUYANG-WEM / 泰国inteqc) ───
        let pageTitle = '';

        // 1. Title block: '版权声明 设计 泰国inteqc <REST>'
        const mTitle = text.match(/版权声明\s+设计\s+泰国inteqc\s+([^\n\r]+)/);
        if (mTitle) {
          pageTitle = mTitle[1].trim();
          const eqMatch = pageTitle.match(/^([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*(?:\/[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*|~[Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*)?)\b/);
          if (eqMatch) {
            const raw = eqMatch[1];
            if (raw.includes('~')) {
              raw.split('~').forEach(r => foundEquips.add(r.trim().toUpperCase().replace(/-/g, '_')));
            } else if (raw.includes('/')) {
              raw.split('/').forEach(r => foundEquips.add(r.trim().toUpperCase().replace(/-/g, '_')));
            } else {
              foundEquips.add(raw.trim().toUpperCase().replace(/-/g, '_'));
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
            const eqMatch = combo.match(/\b([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*)\b/);
            if (eqMatch) {
              foundEquips.add(eqMatch[1].trim().toUpperCase().replace(/-/g, '_'));
            }
          }
        }

        // 3. Device tags: '-5_69-KM1' or '-V6.4_1-K' or '-6.83-HL'
        const tagMatches = text.match(/-([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.]*)-(KM\d*|QF\d*|K\d*|ATS|KA\d*|W|M\d*|SQ\d*|SES|QK|PU|YV|SV|HA|SP|ST|BF|BZSO|HL|LL|PT|TT|LT|FU|SA)\b/g);
        if (tagMatches) {
          tagMatches.forEach(tag => {
            const tm = tag.match(/-([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.]*)-(KM\d*|QF\d*|K\d*|ATS|KA\d*|W|M\d*|SQ\d*|SES|QK|PU|YV|SV|HA|SP|ST|BF|BZSO|HL|LL|PT|TT|LT|FU|SA)\b/);
            if (tm) {
              foundEquips.add(tm[1].trim().toUpperCase().replace(/-/g, '_'));
              if (['HL', 'LL', 'HA', 'SQ', 'SP', 'ST'].includes(tm[2])) {
                if (!tm[1].toUpperCase().endsWith(tm[2])) {
                  foundEquips.add((tm[1] + '_' + tm[2]).trim().toUpperCase().replace(/-/g, '_'));
                }
              }
            }
          });
        }

        const isUnitOrRating = (str) => /^[0-9]+(\.[0-9]+)?(KW|A|V|W|HZ|RPM|MA|KVA)$/i.test(str);

        // Check if this sheet is a shared rack card, power distribution, or system layout sheet
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
          pageTitle.includes('触摸电脑');

        // 4. Lines matching plant equipment pattern ([0-9]+[_\.][0-9]+) - Only if NOT a shared sheet and no title/tag match found
        if (!isSharedCardOrLayout && foundEquips.size === 0) {
          for (const line of lines) {
            const trimmed = line.trim().toUpperCase().replace(/-/g, '_');
            if (/[0-9]+[_\.][0-9]+/.test(trimmed) && trimmed.length <= 15 && !isUnitOrRating(trimmed)) {
              if (/^[Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.]*$/.test(trimmed)) {
                foundEquips.add(trimmed);
              }
            }
          }
        }

        const ignoreWords = new Set(['MCC', 'PLC', 'LCB', 'PCB', 'TOTAL', 'PAGE', 'DRAWN', 'WAGO', 'DATE', 'SA', 'CA', 'ZWP', 'WEM', 'FIELD']);

        if (!isSharedCardOrLayout && foundEquips.size > 0) {
          const classification = classifySchematicPage(text, pageTitle);
          foundEquips.forEach(eq => {
            if (ignoreWords.has(eq) || isUnitOrRating(eq) || /^\d+KW$/i.test(eq) || /^\d+A$/i.test(eq)) return;
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

    // C. Address mapping — prefer wiring diagram pages over terminal connection tables
    const matches = text.match(addrRegex);
    if (matches) {
      const internalPageNum = parseInt(internalPageStr, 10);
      
      // Determine priority of this page: 3/4 for Field Equipment Circuit, 2 for WAGO Module, 1 for Terminal List, 0 for Layout/TOC
      let isTerminalOrOverview =
        tLower.includes('信号总览') ||
        tLower.includes('信号分配') ||
        tLower.includes('端子') ||
        tLower.includes('接线') ||
        tLower.includes('terminal') ||
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
        tLower.includes('revision') ||
        textLower.includes('down target') ||
        textLower.includes('up target') ||
        textLower.includes('端子图') ||
        textLower.includes('端子排');

      let priority = isTerminalOrOverview ? 1 : 2;

      if (loc.locationId === 'silo') {
        if (textLower.includes('排布图') || textLower.includes('模块布局') || textLower.includes('目录') || textLower.includes('封面') || textLower.includes('说明')) {
          priority = 0;
        } else if (textLower.includes('端子图') || textLower.includes('端子排') || textLower.includes('端子') || textLower.includes('接线')) {
          priority = 1;
        } else if (textLower.includes('wago-1405') || textLower.includes('wago-1500') || textLower.includes('wago ai') || textLower.includes('wago ao')) {
          priority = 2;
        } else if (textLower.includes('气动闸门') || textLower.includes('控制') || textLower.includes('保护开关') || textLower.includes('回路') || textLower.includes('料位') || textLower.includes('pneumatic') || textLower.includes('valve') || textLower.includes('gate') || textLower.includes('conveyor') || textLower.includes('elevator')) {
          priority = 4;
        }
      }

      matches.forEach(addr => {
        const key = addr.toUpperCase();
        
        let shouldReplace = false;
        if (!tempAddressRecords[key]) {
          shouldReplace = true;
        } else {
          const oldPriority = tempAddressRecords[key].priority || 2;
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

  // For Tower 3: Also scan TOC pages (pages 2 to 40) to link official machine titles to internal pages
  if (loc.locationId === 'tower3') {
    for (let i = 1; i < 40 && i < res.pages.length; i++) {
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
            title.includes('触摸电脑');

          if (isTocShared) continue;

          const eqMatch = title.match(/^([Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*(?:\/[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*|~[Vv]?[0-9]+[_\.][0-9]+[A-Za-z0-9_\.\-]*)?)\b/);
          if (eqMatch) {
            const raw = eqMatch[1];
            const codes = [];
            if (raw.includes('~')) {
              raw.split('~').forEach(r => codes.push(r.trim().toUpperCase().replace(/-/g, '_')));
            } else if (raw.includes('/')) {
              raw.split('/').forEach(r => codes.push(r.trim().toUpperCase().replace(/-/g, '_')));
            } else {
              codes.push(raw.trim().toUpperCase().replace(/-/g, '_'));
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

              const isUnitOrRating = (str) => /^[0-9]+(\.[0-9]+)?(KW|A|V|W|HZ|RPM|MA|KVA)$/i.test(str);
              const ignoreWords = new Set(['MCC', 'PLC', 'LCB', 'PCB', 'TOTAL', 'PAGE', 'DRAWN', 'WAGO', 'DATE', 'SA', 'CA', 'ZWP', 'WEM', 'FIELD']);

              codes.forEach(code => {
                if (ignoreWords.has(code) || isUnitOrRating(code) || /^\d+KW$/i.test(code) || /^\d+A$/i.test(code)) return;
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

// ──────────────────────── Intake 2 Deterministic Mapping ────────────────────────

function buildIntake2Mapping() {
  console.log(`\n📍 INTAKE2 (Deterministic Image Mapping):`);
  const xlsxPath = path.join(DATA_DIR, 'Intake2', 'PLC_1PLCAllTags.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.warn(`  ⚠ ${xlsxPath} not found!`);
    return null;
  }

  const XLSX = require('xlsx');
  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets['PLC Tags '] || wb.Sheets['PLC Tags'];
  if (!ws) {
    console.warn(`  ⚠ Sheet "PLC Tags " not found in ${xlsxPath}`);
    return null;
  }

  const rows = XLSX.utils.sheet_to_json(ws);

  // Control Motor Sheets (Q output address -> sheet number)
  const cmMap = {
    'Q200.0': 2, 'Q200.1': 2, 'Q200.2': 2, 'Q200.3': 2, 'Q200.4': 2, 'Q200.5': 2, 'Q200.6': 2, 'Q200.7': 2,
    'Q201.0': 3, 'Q201.1': 3, 'Q201.2': 3, 'Q201.3': 3, 'Q201.4': 3, 'Q201.5': 3, 'Q201.6': 3, 'Q201.7': 3,
    'Q202.0': 4, 'Q202.1': 4, 'Q202.2': 4, 'Q202.4': 4, 'Q202.5': 4, 'Q202.6': 4, 'Q202.7': 4,
    'Q203.0': 5, 'Q203.1': 5, 'Q203.2': 5, 'Q203.3': 5, 'Q203.4': 5,
    'Q203.6': 6, 'Q203.7': 6,
    'Q204.2': 7, 'Q204.3': 7,
    'Q204.1': 8, 'Q203.5': 8,
    'Q204.4': 9, 'Q204.0': 9
  };

  // Output Motor DQ Sheets (Q output byte -> sheet number)
  const omMap = {
    200: 2, 201: 3, 202: 4, 203: 5, 204: 6, 205: 7, 206: 8,
    326: 9, 327: 10,
    207: 11, 208: 12,
    210: 14, 211: 15, 212: 16, 213: 17
  };

  function getSheetsForAddr(addr) {
    const list = [];
    if (cmMap[addr]) {
      const pad = String(cmMap[addr]).padStart(3, '0');
      list.push({
        drawingPdfUrl: `/drawings/intake2/cabinets/images/Control_Motor_Intake2_sheet_${pad}.png`,
        internalPage: String(cmMap[addr]),
        page: cmMap[addr],
        label: 'Motor Control Diagram',
        type: 'control',
        cabinet: 'MCC_Intake'
      });
    }
    const mQ = addr.match(/^Q(\d+)\.(\d+)$/);
    if (mQ) {
      const b = parseInt(mQ[1], 10);
      if (omMap[b]) {
        const pad = String(omMap[b]).padStart(3, '0');
        list.push({
          drawingPdfUrl: `/drawings/intake2/cabinets/images/Output_Motor_Intake_2_sheet_${pad}.png`,
          internalPage: String(omMap[b]),
          page: omMap[b],
          label: 'Digital Output Diagram (DQ)',
          type: 'output',
          cabinet: 'MCC_Intake'
        });
      }
    }
    const mI = addr.match(/^I(\d+)\.(\d+)$/);
    if (mI) {
      const b = parseInt(mI[1], 10);
      if (b >= 200 && b <= 231) {
        const sNum = b - 200 + 2;
        const pad = String(sNum).padStart(3, '0');
        list.push({
          drawingPdfUrl: `/drawings/intake2/cabinets/images/MCC_Remote_IO_Intake2_F1_sheet_${pad}.png`,
          internalPage: String(sNum),
          page: sNum,
          label: b <= 216 ? 'Digital Input (Motor Feedback)' : 'Digital Input (Sensors & Gates)',
          type: 'input',
          cabinet: 'MCC_Intake'
        });
      }
      if (b >= 232 && b <= 239) {
        const sNum = b - 232 + 2;
        const pad = String(sNum).padStart(3, '0');
        list.push({
          drawingPdfUrl: `/drawings/intake2/cabinets/images/Input_Desription_Intake2_sheet_${pad}.png`,
          internalPage: String(sNum),
          page: sNum,
          label: 'Digital Input Diagram (DI)',
          type: 'input',
          cabinet: 'MCC_Intake'
        });
      }
    }
    return list;
  }

  const addressesMap = {};
  const eqDrawings = {};

  rows.forEach(r => {
    const name = String(r.Name || '').trim();
    const addr = String(r['Logical Address'] || '').replace('%', '').trim();
    if (!addr) return;

    const sheets = getSheetsForAddr(addr);
    if (sheets.length > 0) {
      addressesMap[addr] = {
        pdfPage: sheets[0].page,
        internalPage: sheets[0].internalPage,
        drawingPdfUrl: sheets[0].drawingPdfUrl,
        label: sheets[0].label,
        type: sheets[0].type,
        cabinet: sheets[0].cabinet
      };
    }

    let eqCode = '';
    const mBracket = name.match(/[\(\[]\s*([A-Za-z0-9_\-]+)\s*[\)\]]/);
    if (mBracket && !/^(Open|Close|Fwd|Rev|Left|Right|\d+)$/i.test(mBracket[1])) {
      eqCode = mBracket[1].toUpperCase();
    }
    if (!eqCode) {
      const mM = name.match(/\b(M\d+(?:[A-Za-z]\d*|-[\w\d]+)?)\b/i);
      const mY = name.match(/\b(Y\d+(?:-[A-Za-z0-9]+)?|YF\d+(?:-[A-Za-z0-9]+)?)\b/i);
      const mF = name.match(/\b(F\d+(?:-[A-Za-z0-9]+)?|ZC\d+)\b/i);

      if (mM) eqCode = mM[1].toUpperCase();
      else if (mY) eqCode = mY[1].toUpperCase();
      else if (mF) eqCode = mF[1].toUpperCase();
    }

    if (eqCode) {
      sheets.forEach(s => {
        if (!eqDrawings[eqCode]) eqDrawings[eqCode] = [];
        if (!eqDrawings[eqCode].some(x => x.drawingPdfUrl === s.drawingPdfUrl)) {
          eqDrawings[eqCode].push(s);
        }
      });
    }
  });

  console.log(`  ⚡ Intake 2 Mapped Addresses: ${Object.keys(addressesMap).length}`);
  console.log(`  ⚡ Intake 2 Mapped Equipments: ${Object.keys(eqDrawings).length}`);

  return {
    drawingUrl: '/drawings/intake2/cabinets/images/MCC_Remote_IO_Intake2_sheet_001.png',
    cabinets: {
      MCC_Intake: { '1': 1, '2': 2 },
      PLC_Intake: { '1': 1 },
      Remote_1: { '1': 1 },
      Remote_2: { '1': 1 },
      Main_Cabinet: { '1': 1 }
    },
    addresses: addressesMap,
    equipmentDrawings: eqDrawings
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

  // Build Intake 2 deterministic mapping
  const intake2Result = buildIntake2Mapping();
  if (intake2Result) {
    output['intake2'] = intake2Result;
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Output: ${OUT_PATH}`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
