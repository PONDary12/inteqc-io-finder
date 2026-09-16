/**
 * clean-vercel.cjs
 * ────────────────────────────────────────────────────────────
 * Runs automatically before `next build` on Vercel (via prebuild hook).
 * When running in Vercel CI (process.env.VERCEL is set), it purges
 * the local `public/drawings` folder so that Next.js does NOT bundle
 * 1.68 GB of static images into the Vercel deployment artifact.
 *
 * Drawings are hosted externally and streamed via Cloudflare R2 CDN.
 * On local machines (process.env.VERCEL not set), this script does nothing,
 * preserving all local drawings for offline factory use (start-local.bat).
 * ────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || Boolean(process.env.NOW_BUILDER);

if (isVercel) {
  console.log('[Vercel Build] Environment detected: VERCEL=1');
  console.log('Purging public/drawings from build container to prevent deployment storage bloat...');
  
  const drawingsDir = path.resolve(__dirname, '../public/drawings');
  if (fs.existsSync(drawingsDir)) {
    try {
      fs.rmSync(drawingsDir, { recursive: true, force: true });
      console.log('Successfully removed public/drawings for Vercel deployment!');
      console.log('Deployment bundle will be ultra-lightweight (~15 MB).');
      console.log('Images will be served dynamically via Cloudflare R2 CDN.');
    } catch (err) {
      console.error('[WARN] Failed to remove drawings directory:', err.message);
    }
  } else {
    console.log('[INFO] public/drawings does not exist in build container.');
  }
} else {
  console.log('[Local Build] Running locally. Preserving public/drawings for offline factory use.');
}
