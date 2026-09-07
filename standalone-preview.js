/**
 * CloudPulse - Zero-Dependency Instant Live Preview Server
 * Built with native Node.js 'http' and 'fs' modules.
 * Runs instantly on any machine without needing 'npm install'!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// In-Memory Database Store for Instant Preview
const store = {
  services: [
    { id: 'srv-01', name: 'API Gateway (US-East)', type: 'api-gateway', status: 'HEALTHY', region: 'us-east-1', latency_ms: 22, uptime_percent: 99.98 },
    { id: 'srv-02', name: 'Managed PostgreSQL RDS Cluster', type: 'database', status: 'HEALTHY', region: 'us-east-1', latency_ms: 12, uptime_percent: 99.99 },
    { id: 'srv-03', name: 'Redis Cache Fleet', type: 'cache', status: 'HEALTHY', region: 'us-east-1', latency_ms: 3, uptime_percent: 99.99 },
    { id: 'srv-04', name: 'Kubernetes Worker Nodes (EKS)', type: 'compute', status: 'HEALTHY', region: 'us-east-1', latency_ms: 45, uptime_percent: 99.95 },
    { id: 'srv-05', name: 'Cloudflare Edge CDN', type: 'cdn', status: 'HEALTHY', region: 'global', latency_ms: 18, uptime_percent: 100.00 }
  ],
  incidents: [
    {
      id: 'inc-101',
      title: 'Elevated 5xx Error Rate on Checkout Microservice',
      service_name: 'API Gateway (US-East)',
      severity: 'HIGH',
      status: 'RESOLVED',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      resolved_at: new Date(Date.now() - 3600000).toISOString(),
      root_cause: 'Transient database connection saturation during flash sale spike. Mitigated via auto-scaling pool.'
    }
  ],
  history: Array.from({ length: 15 }, (_, i) => ({
    timestamp: new Date(Date.now() - (15 - i) * 5000).toLocaleTimeString(),
    requests: Math.floor(Math.random() * 20) + 10,
    errors: Math.random() < 0.2 ? 1 : 0,
    avgLatency: (Math.random() * 15 + 18).toFixed(2)
  })),
  totalRequests: 142,
  totalErrors: 3
};

// Periodic simulated metric generator
setInterval(() => {
  const reqs = Math.floor(Math.random() * 15) + 5;
  const errs = Math.random() < 0.1 ? 1 : 0;
  store.totalRequests += reqs;
  store.totalErrors += errs;

  store.history.push({
    timestamp: new Date().toLocaleTimeString(),
    requests: reqs,
    errors: errs,
    avgLatency: (Math.random() * 10 + 16).toFixed(2)
  });
  if (store.history.length > 20) store.history.shift();
}, 5000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
    });
    return res.end();
  }

  // 1. Health Probes
  if (pathname === '/health' || pathname === '/healthz' || pathname === '/live') {
    return sendJson(res, 200, {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: 'preview'
    });
  }

  if (pathname === '/ready') {
    return sendJson(res, 200, {
      status: 'READY',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: { status: 'UP', type: 'In-Memory Preview Engine' },
        memory: { status: 'OK', heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) }
      }
    });
  }

  // 2. Prometheus Exposition
  if (pathname === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
    const memMb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const metricsPayload = `# HELP http_requests_total Total number of HTTP requests processed
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/services",status_code="200"} ${store.totalRequests}
http_requests_total{method="POST",route="/api/v1/checkout",status_code="500"} ${store.totalErrors}

# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05"} 120
http_request_duration_seconds_bucket{le="0.1"} 135
http_request_duration_seconds_bucket{le="0.5"} 140
http_request_duration_seconds_bucket{le="+Inf"} ${store.totalRequests}
http_request_duration_seconds_sum 3.42
http_request_duration_seconds_count ${store.totalRequests}

# HELP nodejs_heap_size_used_bytes Process heap memory used
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}

# HELP cloudpulse_app_info Application version metadata
# TYPE cloudpulse_app_info gauge
cloudpulse_app_info{version="1.0.0",environment="preview"} 1
`;
    return res.end(metricsPayload);
  }

  // 3. REST API Routes
  if (pathname === '/api/v1/system/summary') {
    return sendJson(res, 200, {
      history: store.history,
      system: {
        memoryUsageMb: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version
      }
    });
  }

  if (pathname === '/api/v1/services') {
    if (req.method === 'GET') {
      return sendJson(res, 200, { services: store.services });
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const newSrv = {
            id: `srv-0${store.services.length + 1}`,
            name: data.name,
            type: data.type,
            region: data.region,
            status: 'HEALTHY',
            latency_ms: Math.floor(Math.random() * 20) + 12,
            uptime_percent: 100.00
          };
          store.services.push(newSrv);
          return sendJson(res, 201, { message: 'Service registered', service: newSrv });
        } catch (e) {
          return sendJson(res, 400, { error: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  if (pathname.startsWith('/api/v1/services/') && pathname.endsWith('/status')) {
    const id = pathname.split('/')[4];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const srv = store.services.find(s => s.id === id);
        if (srv) {
          srv.status = data.status || 'HEALTHY';
          return sendJson(res, 200, { message: 'Updated', service: srv });
        }
        return sendJson(res, 404, { error: 'Not found' });
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (pathname === '/api/v1/incidents') {
    if (req.method === 'GET') {
      return sendJson(res, 200, { incidents: store.incidents });
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const newInc = {
            id: `inc-${Math.floor(Math.random() * 900) + 100}`,
            title: data.title,
            service_name: data.service_name,
            severity: data.severity,
            status: 'OPEN',
            created_at: new Date().toISOString(),
            resolved_at: null,
            root_cause: data.root_cause || 'Investigating alert signals.'
          };
          store.incidents.unshift(newInc);
          return sendJson(res, 201, { message: 'Incident created', incident: newInc });
        } catch (e) {
          return sendJson(res, 400, { error: 'Invalid JSON' });
        }
      });
      return;
    }
  }

  if (pathname.includes('/incidents/') && pathname.endsWith('/resolve')) {
    const id = pathname.split('/')[4];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const inc = store.incidents.find(i => i.id === id);
        if (inc) {
          inc.status = 'RESOLVED';
          inc.resolved_at = new Date().toISOString();
          if (data.root_cause) inc.root_cause = data.root_cause;
          return sendJson(res, 200, { message: 'Incident resolved', incident: inc });
        }
        return sendJson(res, 404, { error: 'Not found' });
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  if (pathname === '/api/v1/simulate/traffic') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const parsed = body ? JSON.parse(body) : { count: 25 };
      const count = parsed.count || 25;
      store.totalRequests += count;
      store.history.push({
        timestamp: new Date().toLocaleTimeString(),
        requests: count,
        errors: 0,
        avgLatency: (Math.random() * 8 + 14).toFixed(2)
      });
      return sendJson(res, 200, { status: 'SUCCESS', simulatedRequests: count });
    });
    return;
  }

  if (pathname === '/api/v1/simulate/error') {
    store.totalErrors += 5;
    store.history.push({
      timestamp: new Date().toLocaleTimeString(),
      requests: 8,
      errors: 5,
      avgLatency: 45.00
    });
    return sendJson(res, 500, { error: 'Internal Server Error (Simulated Chaos)' });
  }

  if (pathname === '/api/v1/simulate/latency') {
    setTimeout(() => {
      return sendJson(res, 200, { status: 'COMPLETED', simulatedDelayMs: 850 });
    }, 850);
    return;
  }

  if (pathname === '/api/v1/simulate/chaos') {
    return sendJson(res, 200, { status: 'OK_DEGRADED', latencyMs: 320 });
  }

  if (pathname === '/api/v1/auth/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.email === 'admin@cloudpulse.io' && data.password === 'Admin@DevOps2026!') {
          return sendJson(res, 200, {
            token: 'mock-jwt-token-capstone-2026',
            user: { id: 'usr-admin-1', name: 'DevOps Lead Admin', email: 'admin@cloudpulse.io', role: 'admin' }
          });
        }
        return sendJson(res, 401, { error: 'Invalid email or password' });
      } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }

  // 4. Serve Static Frontend Files
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(filePath).pipe(res);
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log('=============================================================');
  console.log(`⚡ CloudPulse Instant Preview Server active on port ${PORT}`);
  console.log(`🌐 Live Dashboard:   http://localhost:${PORT}/`);
  console.log(`📊 Prometheus:       http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health Probe:    http://localhost:${PORT}/health`);
  console.log(`🩺 Readiness Probe: http://localhost:${PORT}/ready`);
  console.log('=============================================================');
});
