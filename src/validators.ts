export interface QRCodeParams {
  data: string; // mandatory
  size?: string; // optional, format: [integer]x[integer], min: 10x10, max: 1000x1000 for raster
  'charset-source'?: 'UTF-8' | 'ISO-8859-1'; // optional, default: UTF-8
  'charset-target'?: 'UTF-8' | 'ISO-8859-1'; // optional, default: UTF-8
  ecc?: 'L' | 'M' | 'Q' | 'H'; // optional, default: L
  color?: string; // optional, RGB format, default: 0-0-0 (black)
  bgcolor?: string; // optional, RGB format, default: 255-255-255 (white)
  margin?: string; // optional, pixel-based margin, min: 0, max: 50, default: 1
  qzone?: string; // optional, module-based quiet zone, min: 0, max: 100, default: 0
  format?: 'png' | 'svg'; // optional, default: png
}

export interface ParsedQRParams {
  data: string;
  size: { width: number; height: number };
  charsetSource: 'UTF-8' | 'ISO-8859-1';
  charsetTarget: 'UTF-8' | 'ISO-8859-1';
  ecc: 'L' | 'M' | 'Q' | 'H';
  color: { r: number; g: number; b: number };
  bgcolor: { r: number; g: number; b: number };
  margin: number;
  qzone: number;
  format: 'png' | 'svg';
}

export class QRParamError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'QRParamError';
  }
}

export function parseColor(colorStr: string): { r: number; g: number; b: number } {
  if (!colorStr) {
    throw new QRParamError('Color parameter is required');
  }

  // Handle decimal format: 255-0-0
  if (colorStr.includes('-')) {
    const parts = colorStr.split('-');
    if (parts.length !== 3) {
      throw new QRParamError('Invalid color format. Use RGB format like 255-0-0');
    }
    
    const [r, g, b] = parts.map(part => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new QRParamError('RGB values must be between 0 and 255');
      }
      return num;
    });
    
    return { r, g, b };
  }

  // Handle hex format: ff0000, f00, FF0000
  const hex = colorStr.replace(/^#/, '');
  
  if (hex.length === 3) {
    // Short format: f00 -> ff0000
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new QRParamError('Invalid hex color format');
    }
    
    return { r, g, b };
  } else if (hex.length === 6) {
    // Long format: ff0000
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new QRParamError('Invalid hex color format');
    }
    
    return { r, g, b };
  }

  throw new QRParamError('Invalid color format. Use RGB decimal (255-0-0) or hex (ff0000, f00)');
}

export function parseSize(sizeStr: string, format: string): { width: number; height: number } {
  if (!sizeStr) {
    return { width: 200, height: 200 }; // default
  }

  const parts = sizeStr.split('x');
  if (parts.length !== 2) {
    throw new QRParamError('Invalid size format. Use format like 200x200');
  }

  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);

  if (isNaN(width) || isNaN(height)) {
    throw new QRParamError('Size values must be numbers');
  }

  if (width !== height) {
    throw new QRParamError('QR codes must be square (width must equal height)');
  }

  const minSize = 10;
  let maxSize = 1000; // for raster formats
  if (format === 'svg') {
    maxSize = 1000000; // for vector formats
  }

  if (width < minSize || height < minSize) {
    throw new QRParamError(`Size must be at least ${minSize}x${minSize}`);
  }

  if (width > maxSize || height > maxSize) {
    throw new QRParamError(`Size cannot exceed ${maxSize}x${maxSize} for ${format} format`);
  }

  return { width, height };
}

export function validateAndParseParams(params: QRCodeParams): ParsedQRParams {
  // Validate mandatory data parameter
  if (!params.data) {
    throw new QRParamError('data parameter is mandatory');
  }

  if (params.data.length === 0) {
    throw new QRParamError('data parameter cannot be empty');
  }

  if (params.data.length > 900) {
    throw new QRParamError('data parameter is too long (max 900 characters)');
  }

  // Parse format first as it affects size validation
  const format = params.format || 'png';
  const validFormats = ['png', 'svg'];
  if (!validFormats.includes(format)) {
    throw new QRParamError('Invalid format. Supported formats: png, svg');
  }

  // Parse size
  const size = parseSize(params.size || '200x200', format);

  // Parse charset parameters
  const charsetSource = params['charset-source'] || 'UTF-8';
  const charsetTarget = params['charset-target'] || 'UTF-8';
  
  const validCharsets = ['UTF-8', 'ISO-8859-1'];
  if (!validCharsets.includes(charsetSource)) {
    throw new QRParamError('Invalid charset-source. Use UTF-8 or ISO-8859-1');
  }
  if (!validCharsets.includes(charsetTarget)) {
    throw new QRParamError('Invalid charset-target. Use UTF-8 or ISO-8859-1');
  }

  // Parse ECC level
  const ecc = params.ecc || 'L';
  const validEcc = ['L', 'M', 'Q', 'H'];
  if (!validEcc.includes(ecc)) {
    throw new QRParamError('Invalid ecc level. Use L, M, Q, or H');
  }

  // Parse colors
  const color = parseColor(params.color || '0-0-0');
  const bgcolor = parseColor(params.bgcolor || '255-255-255');

  // Parse margin
  let margin = 1; // default
  if (params.margin !== undefined) {
    margin = parseInt(params.margin, 10);
    if (isNaN(margin) || margin < 0 || margin > 50) {
      throw new QRParamError('margin must be between 0 and 50');
    }
  }

  // Parse qzone (quiet zone)
  let qzone = 0; // default
  if (params.qzone !== undefined) {
    qzone = parseInt(params.qzone, 10);
    if (isNaN(qzone) || qzone < 0 || qzone > 100) {
      throw new QRParamError('qzone must be between 0 and 100');
    }
  }

  return {
    data: params.data,
    size,
    charsetSource: charsetSource as 'UTF-8' | 'ISO-8859-1',
    charsetTarget: charsetTarget as 'UTF-8' | 'ISO-8859-1',
    ecc: ecc as 'L' | 'M' | 'Q' | 'H',
    color,
    bgcolor,
    margin,
    qzone,
  format: format as 'png' | 'svg'
  };
}
