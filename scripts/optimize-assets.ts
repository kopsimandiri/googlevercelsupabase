import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

interface ImageStat {
  file: string;
  originalSize: number;
  newSize: number;
  webpSize: number;
  avifSize: number;
  width?: number;
  height?: number;
}

async function optimizeImages() {
  const assetsDir = path.resolve(process.cwd(), 'public/assets');
  console.log('Starting High-Speed Asset Optimization for directory:', assetsDir);

  const imageExtensions = ['.jpg', '.jpeg', '.png'];
  const allFiles: string[] = [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'gas-legacy') {
          scanDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (
          imageExtensions.includes(ext) &&
          !entry.name.endsWith('.webp') &&
          !entry.name.endsWith('.avif') &&
          !entry.name.includes('.tmp')
        ) {
          allFiles.push(fullPath);
        }
      }
    }
  }

  scanDir(assetsDir);
  console.log(`Found ${allFiles.length} original images to optimize.`);

  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalWebp = 0;
  const stats: ImageStat[] = [];

  for (const filePath of allFiles) {
    const origStat = fs.statSync(filePath);
    const origSize = origStat.size;
    totalOriginal += origSize;

    const ext = path.extname(filePath).toLowerCase();
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, ext);
    const meta = await sharp(filePath).metadata();

    // Determine smart max dimensions
    let maxWidth = 1280;
    let maxHeight = 960;
    if (baseName.includes('logo')) {
      maxWidth = 512;
      maxHeight = 512;
    } else if (['hamdan', 'nunung', 'yudi'].includes(baseName)) {
      maxWidth = 640;
      maxHeight = 640;
    }

    const shouldResize =
      (meta.width && meta.width > maxWidth) || (meta.height && meta.height > maxHeight);

    let pipeline = sharp(filePath);
    if (shouldResize) {
      pipeline = pipeline.resize({
        width: meta.width && meta.width > maxWidth ? maxWidth : undefined,
        height: meta.height && meta.height > maxHeight ? maxHeight : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // 1. Generate WebP
    const webpPath = path.join(dir, `${baseName}.webp`);
    await pipeline
      .clone()
      .webp({ quality: 80, effort: 4 })
      .toFile(webpPath);

    // 2. Generate AVIF (effort: 2 is fast and highly compressed)
    const avifPath = path.join(dir, `${baseName}.avif`);
    await pipeline
      .clone()
      .avif({ quality: 75, effort: 2 })
      .toFile(avifPath);

    // 3. Compress original fallback format
    const tempOriginal = path.join(dir, `${baseName}.tmp${ext}`);
    if (ext === '.png') {
      await pipeline
        .clone()
        .png({ compressionLevel: 9, palette: true, quality: 85 })
        .toFile(tempOriginal);
    } else {
      await pipeline
        .clone()
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toFile(tempOriginal);
    }

    const tempStat = fs.statSync(tempOriginal);
    if (tempStat.size < origSize) {
      fs.copyFileSync(tempOriginal, filePath);
    }
    if (fs.existsSync(tempOriginal)) {
      fs.unlinkSync(tempOriginal);
    }

    const newStat = fs.statSync(filePath);
    const webpStat = fs.statSync(webpPath);
    const avifStat = fs.statSync(avifPath);
    totalOptimized += newStat.size;
    totalWebp += webpStat.size;

    stats.push({
      file: path.relative(process.cwd(), filePath),
      originalSize: origSize,
      newSize: newStat.size,
      webpSize: webpStat.size,
      avifSize: avifStat.size,
      width: meta.width,
      height: meta.height,
    });

    console.log(
      `✓ ${path.basename(filePath)} (${meta.width}x${meta.height}): ${(origSize / 1024).toFixed(1)} KB -> ${(newStat.size / 1024).toFixed(1)} KB | WebP: ${(webpStat.size / 1024).toFixed(1)} KB | AVIF: ${(avifStat.size / 1024).toFixed(1)} KB`
    );
  }

  console.log('\n================ ASSET OPTIMIZATION SUMMARY ================');
  console.log(`Baseline Original Total: ${(totalOriginal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Optimized Fallback Total: ${(totalOptimized / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Modern WebP Total: ${(totalWebp / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Payload Reduction: ${((totalOriginal - totalOptimized) / (1024 * 1024)).toFixed(2)} MB saved (${(((totalOriginal - totalOptimized) / totalOriginal) * 100).toFixed(1)}% drop)`);
  console.log('============================================================\n');
}

optimizeImages().catch(console.error);
