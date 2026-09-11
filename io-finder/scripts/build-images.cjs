/**
 * build-images.cjs
 * ────────────────────────────────────────────────────────────
 * Slices the large 40MB PDF drawing into crisp PNG page images (approx 90KB each)
 * and saves them directly to public/drawings/tower3/cabinets/images/.
 * This completely resolves slow loading and ignored PDF page hashes on mobile devices.
 * ────────────────────────────────────────────────────────────
 * Usage: node scripts/build-images.cjs
 */

const fs = require('fs');
const path = require('path');
const { pdfToPng } = require('pdf-to-png-converter');

const DATA_DIR = path.resolve(__dirname, '../../data');
const MAP_PATH = path.resolve(__dirname, '../public/data/pdf-page-map.json');
const DRAWINGS_OUT_DIR = path.resolve(__dirname, '../public/drawings');

// Configurations matching our locations
const LOCATIONS = [
  {
    locationId: 'tower2_p1',
    folder: 'Tower 2',
    pdfFile: 'Electrical schematic diagram_Feed mill Tower2 revamp phase1.pdf',
  },
  {
    locationId: 'tower2_p2',
    folder: 'Tower 2',
    pdfFile: 'Electrical schematic diagram_Feed mill Tower2 revamp phase2.pdf',
  },
  {
    locationId: 'tower3',
    folder: 'Tower 3',
    pdfFile: '泰国inteqc Cabinet drawing.pdf',
  },
  {
    locationId: 'silo',
    folder: 'Silo',
    pdfFile: '泰国inteqc.pdf',
  }
];

async function generateImagesForLocation(loc, locMap) {
  const pdfPath = path.join(DATA_DIR, loc.folder, loc.pdfFile);
  if (!fs.existsSync(pdfPath)) {
    console.log(`  ⚠ Main PDF not found: ${pdfPath} — skipping image generation.`);
    return;
  }

  if (!locMap || !locMap.cabinets) {
    console.log(`  ⚠ No cabinet mapping found for location: ${loc.locationId} — skipping.`);
    return;
  }

  console.log(`  📂 Loading main PDF: ${loc.pdfFile}...`);
  const totalPages = locMap.addresses ? Math.max(...Object.values(locMap.addresses).map(a => a.page)) : 1000;
  console.log(`  📊 Main PDF has approx ${totalPages} pages.`);

  const destFolder = path.join(DRAWINGS_OUT_DIR, loc.locationId, 'cabinets', 'images');
  fs.mkdirSync(destFolder, { recursive: true });

  const cabinets = Object.keys(locMap.cabinets);
  for (const cabinet of cabinets) {
    const pagesMap = locMap.cabinets[cabinet];
    const pdfPageNumbers = Object.values(pagesMap).map(Number).filter(n => !isNaN(n) && n > 0);

    if (pdfPageNumbers.length === 0) continue;

    const minPage = Math.min(...pdfPageNumbers); // 1-based index
    const maxPage = Math.max(...pdfPageNumbers); // 1-based index

    // Also include pages referenced by address lookup that weren't added to the cabinet map
    // This handles cases where an address is found on a page but the cabinet title text failed
    if (locMap.addresses) {
      const pageSet = new Set(pdfPageNumbers);
      for (const addrInfo of Object.values(locMap.addresses)) {
        const addrPage = Number(addrInfo.page);
        if (addrPage >= minPage && addrPage <= maxPage && !pageSet.has(addrPage)) {
          pdfPageNumbers.push(addrPage);
          pageSet.add(addrPage);
        }
      }
    }

    // Also include pages referenced by equipmentDrawings
    if (locMap.equipmentDrawings) {
      const pageSet = new Set(pdfPageNumbers);
      for (const drawings of Object.values(locMap.equipmentDrawings)) {
        for (const d of drawings) {
          const eqPage = Number(d.pdfPage);
          if (eqPage >= minPage && eqPage <= maxPage && !pageSet.has(eqPage)) {
            pdfPageNumbers.push(eqPage);
            pageSet.add(eqPage);
          }
        }
      }
    }

    // Filter out pages that are already generated
    const pagesToProcess = [];
    pdfPageNumbers.forEach(pageNum => {
      const pageOffset = pageNum - minPage + 1;
      const destPath = path.join(destFolder, `${cabinet}_page_${pageOffset}.png`);
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size === 0) {
        pagesToProcess.push(pageNum);
      }
    });

    if (pagesToProcess.length === 0) {
      console.log(`  ⏩ All ${pdfPageNumbers.length} pages already generated for cabinet "${cabinet}" — skipping.`);
      continue;
    }

    console.log(`\n  🗄️ Converting cabinet "${cabinet}": processing ${pagesToProcess.length}/${pdfPageNumbers.length} missing pages`);

    // Slices and renders only the specific pages of this cabinet in chunks to prevent OOM
    try {
      const chunkSize = 30;
      let pngPages = [];
      for (let j = 0; j < pagesToProcess.length; j += chunkSize) {
        const chunk = pagesToProcess.slice(j, j + chunkSize);
        const chunkPages = await pdfToPng(pdfPath, {
          viewportScale: 1.5,
          pagesToProcess: chunk,
          processPagesInParallel: true,
          concurrencyLimit: 4
        });
        pngPages = pngPages.concat(chunkPages);
      }

      console.log(`  🎨 Generated ${pngPages.length} sheets for cabinet "${cabinet}"`);

      // Write each page image, using the INPUT page numbers from our chunk
      // (NOT page.pageNumber from the library, which may differ by 1 from pdf-parse numbering)
      let savedCount = 0;
      pngPages.forEach((page, idx) => {
        // Find which chunk this belongs to (j=current chunk offset, i=position within chunk)
        // Since we accumulate in order, index idx maps to pagesToProcess[idx]
        const inputPageNum = pagesToProcess[idx];
        if (inputPageNum === undefined) return;
        const pageOffset = inputPageNum - minPage + 1;
        const destPath = path.join(destFolder, `${cabinet}_page_${pageOffset}.png`);
        fs.writeFileSync(destPath, page.content);
        savedCount++;
      });

      
      console.log(`  ✅ Finished: ${cabinet} images saved successfully.`);
    } catch (err) {
      console.error(`  ❌ Failed to convert cabinet "${cabinet}":`, err.message);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  PDF to PNG Drawing Sheet Renderer (V1)        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(MAP_PATH)) {
    console.error(`❌ Mapping file not found at: ${MAP_PATH}. Please run build-pdf-mapping.cjs first.`);
    process.exit(1);
  }

  const pdfPageMap = require(MAP_PATH);

  for (const loc of LOCATIONS) {
    console.log(`\n📍 Rendering sheets for location: ${loc.locationId.toUpperCase()}`);
    await generateImagesForLocation(loc, pdfPageMap[loc.locationId]);
  }

  console.log('\n🎉 Drawing sheet image rendering completed successfully!');
}

main().catch(err => {
  console.error('❌ Error rendering sheets:', err);
  process.exit(1);
});
