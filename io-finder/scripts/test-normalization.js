/**
 * test-normalization.js
 * ────────────────────────────────────────────────────────────
 * Unit tests to verify that the normalization of separators
 * (. vs _ vs -) and character confusion (letter O vs number 0)
 * behave exactly as expected.
 * ────────────────────────────────────────────────────────────
 * Usage: node scripts/test-normalization.js
 */

const assert = require('assert');

// Port the helper functions directly from parse-excel.cjs
function normalizeCode(code) {
  if (!code) return '';
  return String(code)
    .trim()
    .toLowerCase()
    .replace(/[_\-]/g, '.');
}

function normalizeAddress(addr) {
  if (!addr) return '';
  return String(addr)
    .trim()
    .toLowerCase()
    .replace(/[_\-]/g, '.')
    .replace(/o/g, '0');
}

function runTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  Normalization Unit Verification Tests         ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ Passed: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ Failed: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Test Code (编号) Normalization
  test('Code normalizes dots, underscores, and dashes identically', () => {
    const val1 = normalizeCode('6.10');
    const val2 = normalizeCode('6_10');
    const val3 = normalizeCode('6-10');
    
    assert.strictEqual(val1, '6.10');
    assert.strictEqual(val2, '6.10');
    assert.strictEqual(val3, '6.10');
    
    assert.strictEqual(val1, val2);
    assert.strictEqual(val2, val3);
  });

  test('Code normalizes trim and lowercase', () => {
    assert.strictEqual(normalizeCode('  6_10A  '), '6.10a');
    assert.strictEqual(normalizeCode('MCC_11'), 'mcc.11');
  });

  // 2. Test Address (地址) Normalization
  test('Address normalizes O and 0 interchangeably', () => {
    const addr1 = normalizeAddress('IO.0');
    const addr2 = normalizeAddress('I0.0');
    
    assert.strictEqual(addr1, 'i0.0');
    assert.strictEqual(addr2, 'i0.0');
    assert.strictEqual(addr1, addr2);
  });

  test('Address normalizes dots, underscores, dashes, and lowercase', () => {
    const addr1 = normalizeAddress('IO.0');
    const addr2 = normalizeAddress('I0_0');
    const addr3 = normalizeAddress('io-0');
    
    assert.strictEqual(addr1, 'i0.0');
    assert.strictEqual(addr2, 'i0.0');
    assert.strictEqual(addr3, 'i0.0');
    
    assert.strictEqual(addr1, addr2);
    assert.strictEqual(addr2, addr3);
  });

  test('Address handles complicated mixing', () => {
    assert.strictEqual(normalizeAddress('  PIW_256  '), 'piw.256');
    assert.strictEqual(normalizeAddress('PQW-O.0'), 'pqw.0.0');
  });

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  VERIFICATION RESULTS:`);
  console.log(`    Total Tests: ${passed + failed}`);
  console.log(`    Passed:      ${passed}`);
  console.log(`    Failed:      ${failed}`);
  console.log('═══════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('❌ Some tests failed.');
    process.exit(1);
  } else {
    console.log('🎉 All normalization unit tests passed successfully!');
  }
}

runTests();
