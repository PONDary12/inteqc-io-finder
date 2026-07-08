// Deeper probe - check Premixer format and 4AI sections
const XLSX = require('xlsx');
const path = require('path');

const dataDir = path.resolve(__dirname, '../../data');

// Probe Premixer
const wb1 = XLSX.readFile(path.join(dataDir, 'inteqc_PREMIXER_IO.xlsx'));
console.log('=== Premixer ===');
console.log('Sheets:', wb1.SheetNames);

for (const name of wb1.SheetNames) {
  const ws = wb1.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\n  Sheet "${name}": ${range.e.r+1} rows x ${range.e.c+1} cols`);
  
  // Print rows with markers and a few data rows after each marker
  for (let i = 0; i < data.length; i++) {
    const cellA = String(data[i][0] || '').trim();
    if (cellA.includes('输入') || cellA.includes('输出') || cellA.includes('4AI')) {
      console.log(`    Row ${i} [MARKER]: "${cellA}"`);
      // Print header + 2 data rows
      for (let j = i+1; j <= Math.min(i+4, data.length-1); j++) {
        console.log(`    Row ${j}: [${data[j].slice(0,10).map(v => String(v).substring(0,20)).join(' | ')}]`);
      }
    }
  }
}

// Probe Tower3 MCC11 (has 4AI)
const wb2 = XLSX.readFile(path.join(dataDir, 'inteqc Tower3_IO.xlsx'));
console.log('\n\n=== Tower3 MCC11 (4AI example) ===');
const ws11 = wb2.Sheets['MCC11'];
const data11 = XLSX.utils.sheet_to_json(ws11, { header: 1, defval: '' });
for (let i = 0; i < data11.length; i++) {
  const cellA = String(data11[i][0] || '').trim();
  if (cellA.includes('输入') || cellA.includes('输出') || cellA.includes('4AI') || cellA.includes('序号')) {
    console.log(`  Row ${i}: "${cellA}" -> [${data11[i].slice(0,10).map(v => String(v).substring(0,20)).join(' | ')}]`);
    // Print 2 data rows after headers
    if (cellA.includes('序号')) {
      for (let j = i+1; j <= Math.min(i+3, data11.length-1); j++) {
        console.log(`  Row ${j}: [${data11[j].slice(0,10).map(v => String(v).substring(0,20)).join(' | ')}]`);
      }
    }
  }
}

// Check which Tower3 sheets have 4AI
console.log('\n\n=== Tower3 sheets with 4AI ===');
const t3Sheets = ['MCC2','MCC3','MCC7','MCC8_9','MCC11','MCC12_13','MCC18','MCC21_22','MCC23_24','MCC25_26','MCC27','PLC','LCB_1','LCB_2','LCB_4','LCB_5','LCB_6A','LCB_6B','LCB_8','LCB_9','LCB_10'];
for (const name of t3Sheets) {
  const ws = wb2.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let has4AI = false;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0] || '').includes('4AI')) {
      has4AI = true;
      break;
    }
  }
  if (has4AI) console.log(`  ${name}: HAS 4AI`);
}
