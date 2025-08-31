import * as QR from 'qrcode-generator';
import * as UPNG from 'upng-js';
import { ParsedQRParams } from './validators';

// Type definition for error correction levels
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export function getMimeType(format: string): string {
  switch (format) {
    case 'svg':
      return 'image/svg+xml';
    case 'png':
    default:
      return 'image/png';
  }
}

export function colorToHex(color: { r: number; g: number; b: number }): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function convertCharset(text: string, from: string, to: string): string {
  if (from === to) return text;

  // UTF-8 -> ISO-8859-1: replace any non-Latin1 codepoint with '?'
  if (from === 'UTF-8' && to === 'ISO-8859-1') {
    return text.replace(/[^\u0000-\u00FF]/g, '?');
  }

  // ISO-8859-1 -> UTF-8: code points 0..255 map directly
  if (from === 'ISO-8859-1' && to === 'UTF-8') {
    // Each charCode (0..255) is a valid Unicode scalar value
    // so returning the string is sufficient.
    return text;
  }

  return text;
}

// Map ECC levels to qrcode-generator levels
function getErrorCorrectionLevel(ecc: string): ErrorCorrectionLevel {
  switch (ecc) {
    case 'L': return 'L';
    case 'M': return 'M';
    case 'Q': return 'Q';
    case 'H': return 'H';
    default: return 'L';
  }
}

export async function generateQRCode(params: ParsedQRParams): Promise<ArrayBuffer> {
  const convertedData = convertCharset(params.data, params.charsetSource, params.charsetTarget);
  
  // Create QR code using the library
  const qr = QR.default(0, getErrorCorrectionLevel(params.ecc));
  if (params.charsetTarget === 'ISO-8859-1') {
    // Provide raw bytes for ISO-8859-1
    const bytes: number[] = new Array(convertedData.length);
    for (let i = 0; i < convertedData.length; i++) {
      bytes[i] = convertedData.charCodeAt(i) & 0xff;
    }
  qr.addData(bytes as any);
  } else {
    // UTF-8 path
    qr.addData(convertedData);
  }
  qr.make();

  if (params.format === 'svg') {
    const svg = generateQRCodeSVG(qr, params);
    return new TextEncoder().encode(svg).buffer;
  } else {
    // Default and only raster format is PNG
    const png = generatePNG(qr, params);
    return png;
  }
}

export function generateQRCodeSVG(qr: any, params: ParsedQRParams): string {
  const size = params.size.width; // requested width/height
  const dark = colorToHex(params.color);
  const light = colorToHex(params.bgcolor);
  
  const moduleCount = qr.getModuleCount();
  const marginPx = Math.max(0, Math.floor(params.margin));
  const totalModules = moduleCount + 2 * params.qzone;
  const available = Math.max(0, size - 2 * marginPx);
  const moduleSize = Math.max(1, Math.floor(available / totalModules));
  const contentSize = moduleSize * totalModules;
  const leftover = Math.max(0, available - contentSize);
  const actualWidth = size; // force exact requested size
  const offset = marginPx + Math.floor(leftover / 2) + params.qzone * moduleSize;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${actualWidth}" height="${actualWidth}" viewBox="0 0 ${actualWidth} ${actualWidth}">
<rect width="${actualWidth}" height="${actualWidth}" fill="#${light}"/>`;

  // Draw QR modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#${dark}"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

function generatePNG(qr: any, params: ParsedQRParams): ArrayBuffer {
  // Build RGBA bitmap
  const moduleCount = qr.getModuleCount();
  const size = params.size.width; // requested
  const marginPx = Math.max(0, Math.floor(params.margin));
  const totalModules = moduleCount + 2 * params.qzone;
  const available = Math.max(0, size - 2 * marginPx);
  const moduleSize = Math.max(1, Math.floor(available / totalModules));
  const contentSize = moduleSize * totalModules;
  const leftover = Math.max(0, available - contentSize);
  const actualSize = size; // force exact requested size
  const offset = marginPx + Math.floor(leftover / 2) + params.qzone * moduleSize;

  const imageData = new Uint8Array(actualSize * actualSize * 4); // RGBA

  // Fill background
  for (let i = 0; i < imageData.length; i += 4) {
    imageData[i] = params.bgcolor.r;
    imageData[i + 1] = params.bgcolor.g;
    imageData[i + 2] = params.bgcolor.b;
    imageData[i + 3] = 255;
  }

  // Draw modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const startX = offset + col * moduleSize;
        const startY = offset + row * moduleSize;
        for (let y = 0; y < moduleSize; y++) {
          for (let x = 0; x < moduleSize; x++) {
            const pixelX = startX + x;
            const pixelY = startY + y;
            if (pixelX < actualSize && pixelY < actualSize) {
              const index = (pixelY * actualSize + pixelX) * 4;
              imageData[index] = params.color.r;
              imageData[index + 1] = params.color.g;
              imageData[index + 2] = params.color.b;
              imageData[index + 3] = 255;
            }
          }
        }
      }
    }
  }

  // Encode PNG using upng-js (works in Workers/browser)
  const pngBuffer = UPNG.encode([imageData.buffer], actualSize, actualSize, 0);
  return pngBuffer as ArrayBuffer;
}

// EPS and other formats removed; only PNG and SVG are supported
