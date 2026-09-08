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
      { min: 400, max: 499, cabinet: 'MCC4' },
      { min: 500, max: 599, cabinet: 'MCC6' },
      { min: 600, max: 699, cabinet: 'MCC7' },
      { min: 700, max: 899, cabinet: 'MCC8_9' },
      { min: 900, max: 1099, cabinet: 'MCC11' },
      { min: 1100, max: 1399, cabinet: 'MCC12_13' },
      { min: 1400, max: 1599, cabinet: 'MCC18' },
      { min: 1600, max: 1659, cabinet: 'MCC20_21' },
      { min: 1660, max: 1699, cabinet: 'MCC21_22' },
      { min: 1700, max: 1799, cabinet: 'MCC22_23' },
      { min: 1800, max: 1899, cabinet: 'MCC24_25' },
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
  const m = s.match(/^([A-Z0-9_]+)\s*[-–]/i);
  if (m) {
    const code = m[1].toUpperCase().replace(/-/g, '_');
    if (!['MCC', 'RCB', 'PLC', 'EFS', 'WZB'].includes(code)) {
      return code;
    }
  }
  return null;
}

function classifySchematicPage(text, title) {
  const t = (title + '\n' + text).toLowerCase();
  
  if (t.includes('rs485') || t.includes('pz80') || t.includes('acrel') || t.includes('meter') || t.includes('wpj') || t.includes('pj1') || t.includes('电度') || t.includes('电流检测')) {
    return { label: 'Power & Metering', type: 'power' };
  }
  if ((t.includes('pstx') || t.includes('软起') || t.includes('soft start')) && !t.includes('软起故障') && (t.includes('zkm') || t.includes('fkm') || t.includes('km1') || t.includes('qf1') || t.includes('接触器') || t.includes('355kw') || t.includes('主回路'))) {
    return { label: 'Soft Starter Circuit', type: 'starter' };
  }
  if (t.includes('变频') || t.includes('vfd') || t.includes('inverter') || t.includes('atv') || t.includes('g120')) {
    return { label: 'VFD Drive Circuit', type: 'vfd' };
  }
  if (t.includes('启动') || t.includes('start') || t.includes('合闸') || t.includes('运行') || t.includes('running') || t.includes('breaker on')) {
    return { label: 'PLC Control Circuit', type: 'control' };
  }
  if (t.includes('门保') || t.includes('door protect') || t.includes('防堵') || t.includes('跑偏') || t.includes('拉绳') || t.includes('接近开关') || t.includes('急停') || t.includes('estop')) {
    return { label: 'Safety & Interlock', type: 'safety' };
  }
  if (t.includes('导向阀') || t.includes('电磁阀') || t.includes('valve') || t.includes('换向') || t.includes('开门到位') || t.includes('关门到位') || t.includes('风门')) {
    return { label: 'Valve & Actuator', type: 'valve' };
  }
  if (t.includes('接触器') || t.includes('km1') || t.includes('zkm') || t.includes('fkm') || t.includes('kw_') || t.includes('电机')) {
    if (t.includes('di') || t.includes('dq') || t.includes('plc') || t.includes('ri1-') || t.includes('ri2-')) {
      return { label: 'PLC Control Circuit', type: 'control' };
    }
    return { label: 'Power Circuit', type: 'power' };
  }
  if (t.includes('plc') || t.includes('di') || t.includes('dq') || t.includes('ai') || t.includes('ao') || t.includes('et200')) {
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


    // A. Cabinet mapping
    let cabinet = null;
    if (loc.cabinetList) {
      const title = extractTitle(text);
      
      // 1. Try exact title block match (highest reliability)
      for (const cab of loc.cabinetList) {
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
        for (const cab of loc.cabinetList) {
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
        for (const cab of loc.cabinetList) {
          if (text.toLowerCase().includes(cab.toLowerCase())) {
            cabinet = cab;
            break;
          }
        }
      }
    } else {
      cabinet = getCabinetForPage(internalPageStr, loc.cabinetRanges);
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
      for (const line of lines) {
        if (line.includes('日期') && !line.includes('布置') && !line.includes('端子') && !line.includes('目录') && !line.includes('总览')) {
          const eq = extractEquipFromTitleLine(line);
          if (eq) {
            foundEquips.add(eq);
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
    }

    // C. Address mapping — prefer wiring diagram pages over terminal connection tables
    const matches = text.match(addrRegex);
    if (matches) {
      const internalPageNum = parseInt(internalPageStr, 10);
      
      // Determine priority of this page: 2 for Schematic, 1 for Terminal List / Overview Table
      const isTerminalOrOverview =
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
        
      const priority = isTerminalOrOverview ? 1 : 2;

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
