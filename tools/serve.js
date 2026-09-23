/**
 * Dev/preview server with one job `python3 -m http.server` can't do: serve
 * 404.html (with a real 404 status) for unmatched paths, so the custom error
 * page is exercised locally exactly as it will be in production.
 *
 * Run:  node serve.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 12000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

const send = (res, code, body, type) => {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let rel = path.normalize(url).replace(/^(\.\.[/\\])+/, '');
    let file = path.join(ROOT, rel);

    if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');

    // Directory -> index.html
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    // Extensionless path -> .html
    if (!fs.existsSync(file) && !path.extname(file) && fs.existsSync(file + '.html')) {
      file += '.html';
    }

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
    }

    const notFound = path.join(ROOT, '404.html');
    send(res, 404, fs.readFileSync(notFound), TYPES['.html']);
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`serving ${ROOT} on http://127.0.0.1:${PORT} (custom 404 enabled)`);
  });
