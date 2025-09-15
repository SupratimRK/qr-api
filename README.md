# QR Code API

QR Code generation API for Cloudflare Workers. PNG is the default output; SVG is available via `format=svg`.

## Features

- 🚀 **Cloudflare Workers** - Serverless deployment with global edge locations  
- 🎨 **Formats** - PNG (default) and SVG
- 🌈 **Color Customization** - Custom foreground and background colors
- 📏 **Size Control** - Custom dimensions with margin and quiet zone options
- 🔧 **Error Correction** - Configurable ECC levels (L, M, Q, H)
- 🌍 **Charset Support** - UTF-8 and ISO-8859-1 encoding

## API Endpoints

### Generate QR Code
```
GET / POST /
```
```
https://qr-api.supratimrk.workers.dev/
```
Provide parameters via query string (GET) or body (POST). If the same parameter appears in both places, the GET value wins (as implemented in `src/index.ts`).

### API Information
```
GET /info
```
```
https://qr-api.supratimrk.workers.dev/info
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `data` | string | ✅ Yes | - | Text to encode in QR code |
| `size` | string | ❌ No | `200x200` | Image size (format: `WIDTHxHEIGHT`) |
| `charset-source` | string | ❌ No | `UTF-8` | Source charset (`UTF-8` or `ISO-8859-1`) |
| `charset-target` | string | ❌ No | `UTF-8` | Target charset (`UTF-8` or `ISO-8859-1`) |
| `ecc` | string | ❌ No | `L` | Error correction level (`L`, `M`, `Q`, `H`) |
| `color` | string | ❌ No | `0-0-0` | Foreground color (RGB decimal or hex) |
| `bgcolor` | string | ❌ No | `255-255-255` | Background color (RGB decimal or hex) |
| `margin` | number | ❌ No | `1` | Pixel-based margin (0-50) |
| `qzone` | number | ❌ No | `0` | Module-based quiet zone (0-100) |
| `format` | string | ❌ No | `png` | Output format (`png` or `svg`) |

Notes:
- Size must be square (width equals height). Raster (PNG) max is 1000x1000; vector (SVG) max is 1,000,000 x 1,000,000.
- Colors support decimal `R-G-B` and hex `fff`/`ffffff` styles.
- Charset conversion supports `UTF-8` and `ISO-8859-1`.
- `margin` is pixel-based padding; `qzone` is module-based quiet zone. Both are applied. Actual output size may be slightly less than requested due to integer module sizing.

## Usage Examples

### Basic QR Code
[
https://qr-api.supratimrk.workers.dev/?data=Hello%20World!"
](https://qr-api.supratimrk.workers.dev/?data=Hello%20World!)


PowerShell (Windows):
```powershell
Invoke-WebRequest -UseBasicParsing "https://qr-api.supratimrk.workers.dev/?data=Hello%20World!" -OutFile hello.png
```

### Custom Size and Colors
[https://qr-api.supratimrk.workers.dev/?data=https://example.com&size=300x300&color=ff0000&bgcolor=ffffff](https://qr-api.supratimrk.workers.dev/?data=https://example.com&size=300x300&color=ff0000&bgcolor=ffffff)

PowerShell:
```powershell
Invoke-WebRequest -UseBasicParsing "https://qr-api.supratimrk.workers.dev/?data=https://example.com&size=300x300&color=ff0000&bgcolor=ffffff" -OutFile site.png
```

### SVG Format with High Error Correction

[https://qr-api.supratimrk.workers.dev/?data=Important%20Data&format=svg&ecc=H&qzone=4](https://qr-api.supratimrk.workers.dev/?data=Important%20Data&format=svg&ecc=H&qzone=4)

PowerShell:
```powershell
Invoke-WebRequest -UseBasicParsing "https://qr-api.supratimrk.workers.dev/?data=Important%20Data&format=svg&ecc=H&qzone=4" -OutFile code.svg
```

### POST Request Example
```bash
curl -X POST "https://qr-api.supratimrk.workers.dev/" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "data=Hello%20World&size=250x250&color=0-0-255"
```

JSON body:
```bash
curl -X POST "https://qr-api.supratimrk.workers.dev/" \
  -H "Content-Type: application/json" \
  -d '{"data":"Hello JSON","size":"220x220","format":"png"}'
```

## Code Examples

### JavaScript/TypeScript

```javascript
// Using Node.js
const fs = require('fs');
const https = require('https');

const url = 'https://qr-api.supratimrk.workers.dev/?data=Hello%20World!';

https.get(url, (res) => {
  const fileStream = fs.createWriteStream('hello.png');
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('QR code saved as hello.png');
  });
}).on('error', (err) => {
  console.error('Error downloading QR code:', err);
});
```

### Python

```python
import requests

url = 'https://qr-api.supratimrk.workers.dev/?data=Hello%20World!'
response = requests.get(url)

if response.status_code == 200:
    with open('hello.png', 'wb') as f:
        f.write(response.content)
    print('QR code saved as hello.png')
else:
    print('Error downloading QR code')
```

### Java

```java
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

public class QRDownloader {
    public static void main(String[] args) {
        String url = "https://qr-api.supratimrk.workers.dev/?data=Hello%20World!";
        try (InputStream in = new URL(url).openStream();
             FileOutputStream out = new FileOutputStream("hello.png")) {
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            System.out.println("QR code saved as hello.png");
        } catch (IOException e) {
            System.err.println("Error downloading QR code: " + e.getMessage());
        }
    }
}
```

## Color Formats

Colors can be specified in multiple formats:

### RGB Decimal
- `255-0-0` (red)
- `0-255-0` (green)  
- `0-0-255` (blue)

### Hex Short Format
- `f00` (red)
- `0f0` (green)
- `00f` (blue)

### Hex Long Format
- `ff0000` (red)
- `00ff00` (green)
- `0000ff` (blue)

## Error Correction Levels

| Level | Recovery | Description |
|-------|----------|-------------|
| `L` | ~7% | Low - Smallest QR code |
| `M` | ~15% | Medium - Balanced |
| `Q` | ~25% | Quality - Good for damaged codes |
| `H` | ~30% | High - Maximum recovery |

## Size Limits

### Raster Format (PNG)
- Minimum: `10x10`
- Maximum: `1000x1000`

### Vector Format (SVG)
- Minimum: `10x10`
- Maximum: `1000000x1000000`

## Installation & Deployment

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Setup
```bash
# Clone and install dependencies
npm install

# Login to Cloudflare
wrangler auth login

# Deploy to Cloudflare Workers
npm run deploy
```

### Local Development
```bash
# Start development server
npm run dev
```

If Wrangler shows an out-of-date warning, upgrade:
```bash
npm i -D wrangler@4
```

## Project Structure
```
qr-api/
├── src/
│   ├── index.ts           # Main worker handler
│   ├── validators.ts      # Parameter validation
│   └── qr-generator.ts    # QR code generation logic
├── package.json
├── wrangler.toml         # Cloudflare Workers config
└── tsconfig.json         # TypeScript config
```

## Compatibility note

This API follows a similar parameter model to goqr.me but only supports PNG and SVG, and the path is simplified to the root `/`.

Implementation highlights:
- Library: `qrcode-generator` to produce the QR module matrix
- PNG: encoded with `upng-js` (Workers compatible)
- Central format dispatch in `generateQRCode()` reduces branching and mismatches

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (invalid endpoint)
- `500` - Internal Server Error

Error messages are returned as plain text with CORS headers enabled.

Caching: The API sets `Cache-Control: public, max-age=3600` and a weak `ETag`. Clients can send `If-None-Match` and receive `304 Not Modified` when the content is unchanged.

## Rate Limiting

Cloudflare Workers provide automatic protection against abuse. For high-volume usage, consider implementing additional rate limiting based on your needs.

## License

MIT License - Feel free to use this in your projects!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

For issues and questions:
- Check the [Issues](../../issues) page
- Test your parameters with the `/info` endpoint
