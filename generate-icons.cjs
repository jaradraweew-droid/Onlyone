// Generate PNG icon files for the PWA manifest.
// Run: node generate-icons.cjs
// Outputs: public/icons/icon-192.png and public/icons/icon-512.png

const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 transparent PNG (base for larger icons)
// We'll generate proper icons using a simple approach
function generateIconPNG(size) {
  // Create a minimal but valid PNG file with a green leaf circle
  // PNG structure: signature + IHDR + IDAT + IEND
  
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch { return { createCanvas: null }; }
  })();
  
  if (createCanvas) {
    // If canvas is available, generate a proper icon
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#F5FFFA';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Leaf shape
    const cx = size / 2;
    const cy = size / 2;
    const s = size * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = '#81C784';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    return canvas.toBuffer('image/png');
  }
  
  // Fallback: create a minimal valid PNG (solid green square)
  return createMinimalPNG(size);
}

function createMinimalPNG(size) {
  // PNG file signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type (RGB)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - uncompressed RGB data for a sage green square
  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < size; x++) {
      // Create a circular gradient: mint background with sage green center
      const dx = x - size/2;
      const dy = y - size/2;
      const dist = Math.sqrt(dx*dx + dy*dy) / (size/2);
      
      if (dist < 0.7) {
        // Sage green center (leaf area)
        rawData.push(0x81, 0xC7, 0x84); // #81C784
      } else if (dist < 1.0) {
        // Mint border
        rawData.push(0xF5, 0xFF, 0xFA); // #F5FFFA
      } else {
        // Transparent (but we're RGB so just use mint)
        rawData.push(0xF5, 0xFF, 0xFA);
      }
    }
  }
  
  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Main
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

for (const size of [192, 512]) {
  const pngBuffer = generateIconPNG(size);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${outPath} (${pngBuffer.length} bytes)`);
}

console.log('Done!');
