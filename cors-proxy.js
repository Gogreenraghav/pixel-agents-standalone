// Simple CORS Proxy Server
// Run with: node cors-proxy.js
// Then use: http://localhost:8768/proxy?url=...

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 8768;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/proxy') {
    const targetUrl = parsedUrl.query.url;
    
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }
    
    console.log('Proxying to:', targetUrl);
    
    const protocol = targetUrl.startsWith('https') ? https : http;
    
    const proxyReq = protocol.request(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: url.parse(targetUrl).host,
      }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('CORS Proxy Server\nUsage: /proxy?url=https://api.example.com/endpoint');
  }
});

server.listen(PORT, () => {
  console.log(`CORS Proxy running on http://localhost:${PORT}`);
  console.log('Usage: http://localhost:' + PORT + '/proxy?url=https://api.example.com/endpoint');
});
