/**
 * upload-to-r2.cjs
 * ────────────────────────────────────────────────────────────
 * Syncs drawing page images from public/drawings/ to Cloudflare R2
 * with multi-threaded concurrent uploads, resume capability, and progress bar.
 * ────────────────────────────────────────────────────────────
 * Usage:
 *   node scripts/upload-to-r2.cjs           (Full upload)
 *   node scripts/upload-to-r2.cjs --test    (Test upload with 3 files)
 */

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// 1. Simple .env parser to avoid extra dependency
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'inteqc-drawings';
const PUBLIC_DEV_URL = process.env.NEXT_PUBLIC_DRAWINGS_BASE_URL || 'https://pub-8b37b69cd7a04c01b038f3473a303fe2.r2.dev';

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
  console.error('[ERROR] Missing R2 credentials in .env.local');
  console.error('Please ensure R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT are set.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const DRAWINGS_DIR = path.resolve(__dirname, '../public/drawings');

// Recursive file scanner
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

async function uploadFile(filePath, key, fileSize) {
  const fileContent = fs.readFileSync(filePath);
  const contentType = getContentType(filePath);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await s3.send(command);
}

async function checkFileExists(key, expectedSize) {
  try {
    const head = await s3.send(new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }));
    return head.ContentLength === expectedSize;
  } catch (err) {
    return false;
  }
}

async function run() {
  const isTest = process.argv.includes('--test');
  console.log('======================================================');
  console.log('         INTEQC Drawing Sync -> Cloudflare R2         ');
  console.log('======================================================');
  console.log(`Bucket:   ${R2_BUCKET_NAME}`);
  console.log(`Endpoint: ${R2_ENDPOINT}`);
  console.log(`Mode:     ${isTest ? 'TEST (3 files only)' : 'FULL SYNC'}`);
  console.log('------------------------------------------------------');

  if (!fs.existsSync(DRAWINGS_DIR)) {
    console.error(`[ERROR] Drawings directory not found at: ${DRAWINGS_DIR}`);
    process.exit(1);
  }

  console.log('Scanning files in public/drawings...');
  let files = getAllFiles(DRAWINGS_DIR);
  console.log(`Found ${files.length} files in total.`);

  if (isTest) {
    files = files.slice(0, 3);
  }

  const totalFiles = files.length;
  let totalBytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  let uploadedBytes = 0;
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  console.log(`Total payload: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log('Starting upload...\n');

  const startTime = Date.now();
  const CONCURRENCY = 25; // Concurrent uploads
  let queueIndex = 0;

  async function worker() {
    while (queueIndex < files.length) {
      const currentIdx = queueIndex++;
      const file = files[currentIdx];
      const relPath = path.relative(path.resolve(__dirname, '../public'), file).replace(/\\/g, '/');
      const key = relPath; // e.g. "drawings/tower2_p1/cabinets/images/MCC1_2_page_1.png"
      const stat = fs.statSync(file);

      try {
        // Check if already in R2
        const exists = await checkFileExists(key, stat.size);
        if (exists) {
          skippedCount++;
          uploadedBytes += stat.size;
        } else {
          await uploadFile(file, key, stat.size);
          uploadedCount++;
          uploadedBytes += stat.size;
        }
      } catch (err) {
        errorCount++;
        console.error(`\n[ERROR] Failed to upload ${key}:`, err.message);
      }

      // Progress reporting
      const processed = uploadedCount + skippedCount + errorCount;
      if (processed % 25 === 0 || processed === totalFiles) {
        const percent = ((processed / totalFiles) * 100).toFixed(1);
        const mbProgress = (uploadedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
        process.stdout.write(`\r[${processed}/${totalFiles}] ${percent}% | ${mbProgress}/${totalMb} MB | Skipped: ${skippedCount} | Uploaded: ${uploadedCount} | Errors: ${errorCount} (${elapsedSec}s)`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, files.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n\n======================================================');
  console.log(`[OK] Upload complete in ${duration}s!`);
  console.log(`   - Uploaded: ${uploadedCount}`);
  console.log(`   - Skipped (already up-to-date): ${skippedCount}`);
  console.log(`   - Errors:   ${errorCount}`);
  console.log('======================================================');

  if (files.length > 0) {
    const sampleRel = path.relative(path.resolve(__dirname, '../public'), files[0]).replace(/\\/g, '/');
    const sampleUrl = `${PUBLIC_DEV_URL}/${sampleRel}`;
    console.log(`\nTest URL: ${sampleUrl}\n`);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
