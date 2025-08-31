import { QRCodeParams, validateAndParseParams, QRParamError } from './validators';
import { generateQRCode, getMimeType } from './qr-generator';

export interface Env {
  // Define any environment variables here if needed
}

async function handleQRCodeRequest(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Parse parameters from both GET and POST
    const params: Record<string, string> = {};
    
    // Get URL parameters (GET)
    for (const [key, value] of url.searchParams.entries()) {
      params[key] = value;
    }
    
    // Get POST parameters if available
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type');
      
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        for (const [key, value] of formData.entries()) {
          // GET parameters take precedence over POST as per API spec
          if (!params[key]) {
            params[key] = value.toString();
          }
        }
      } else if (contentType?.includes('application/json')) {
        const jsonData = await request.json() as Record<string, unknown>;
        for (const [key, value] of Object.entries(jsonData)) {
          // GET parameters take precedence over POST as per API spec
          if (!params[key] && typeof value === 'string') {
            params[key] = value;
          }
        }
      }
    }

    // Validate and parse parameters
    const parsedParams = validateAndParseParams(params as unknown as QRCodeParams);
    
  // Generate QR code based on format
    let responseBody: ArrayBuffer | string;
    let mimeType: string;
    
    // The generateQRCode function handles all formats internally
    responseBody = await generateQRCode(parsedParams);
    mimeType = getMimeType(parsedParams.format);

    // Compute ETag from normalized params (avoids recomputing over bytes)
    const norm = {
      data: parsedParams.data,
      size: parsedParams.size,
      ecc: parsedParams.ecc,
      color: parsedParams.color,
      bgcolor: parsedParams.bgcolor,
      margin: parsedParams.margin,
      qzone: parsedParams.qzone,
      charsetSource: parsedParams.charsetSource,
      charsetTarget: parsedParams.charsetTarget,
      format: parsedParams.format,
    };
    const normStr = JSON.stringify(norm);
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < normStr.length; i++) {
      h ^= normStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const etag = 'W/"' + h.toString(16) + '"';
    const ifNoneMatch = request.headers.get('If-None-Match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Prepare headers
  const headers = new Headers({
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    });

  if (etag) headers.set('ETag', etag);

  // Handle different response types
    if (typeof responseBody === 'string') {
      headers.set('Content-Length', String(new TextEncoder().encode(responseBody).length));
      return new Response(responseBody, { headers });
    } else {
      headers.set('Content-Length', String((responseBody as ArrayBuffer).byteLength));
      return new Response(responseBody, { headers });
    }

  } catch (error) {
    console.error('QR Code generation error:', error);
    
    if (error instanceof QRParamError) {
      return new Response(error.message, { 
        status: error.statusCode,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

async function handleOptionsRequest(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

async function handleInfoRequest(): Promise<Response> {
  const info = {
    name: 'QR Code API',
    version: '1.0.0',
    description: 'QR Code generation API (PNG default; SVG optional)',
    endpoints: {
      'POST/GET /': 'Generate QR code with parameters'
    },
    parameters: {
      data: 'Text to encode (mandatory)',
      size: 'Image size in format WIDTHxHEIGHT (optional, default: 200x200)',
      'charset-source': 'Source charset: UTF-8 or ISO-8859-1 (optional, default: UTF-8)',
      'charset-target': 'Target charset: UTF-8 or ISO-8859-1 (optional, default: UTF-8)',
      ecc: 'Error correction level: L, M, Q, H (optional, default: L)',
      color: 'Foreground color in RGB format (optional, default: 0-0-0)',
      bgcolor: 'Background color in RGB format (optional, default: 255-255-255)',
      margin: 'Pixel-based margin: 0-50 (optional, default: 1)',
  qzone: 'Module-based quiet zone: 0-100 (optional, default: 0)',
  format: 'Output format: png (default) or svg'
    },
    examples: [
  '/?data=Hello%20World!&size=200x200',
  '/?data=https://example.com&size=300x300&color=ff0000&bgcolor=ffffff&format=svg'
    ]
  };

  return new Response(JSON.stringify(info, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptionsRequest();
    }
    
    // Handle API info endpoint
    if (url.pathname === '/info') {
      return handleInfoRequest();
    }

    // QR generation on root path '/'
    if (url.pathname === '/' || url.pathname === '') {
      return handleQRCodeRequest(request);
    }

    // Handle any other endpoints
    return new Response('Not Found. Use / for QR creation or /info', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
};
