/**
 * CloudPulse - Enterprise Cloud Infrastructure & Incident Management SaaS Platform
 * Capstone Project Core Server
 */

const express = require('express');
const path = require('path');
const config = require('./src/config');
const requestLogger = require('./src/middleware/requestLogger');
const { register } = require('./src/metrics/prometheus');
const { initializeDatabase, healthCheck } = require('./src/db');

// Route Modules
const authRoutes = require('./src/routes/auth');
const servicesRoutes = require('./src/routes/services');
const incidentsRoutes = require('./src/routes/incidents');
const simulateRoutes = require('./src/routes/simulate');
const systemRoutes = require('./src/routes/system');

const app = express();

// Global Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Structured JSON Request Logging & Metrics Tracing
app.use(requestLogger);

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// Cloud & Container Health Probes (Kubernetes / Render / AWS ECS compatible)
// -----------------------------------------------------------------------------

// Liveness Probe: Quick check that the Node process is running
app.get(['/health', '/healthz', '/live'], (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    version: config.appVersion,
    environment: config.nodeEnv
  });
});

// Readiness Probe: Verifies dependencies (Database, Memory)
app.get(['/ready', '/readyz'], async (req, res) => {
  try {
    const dbStatus = await healthCheck();
    const isReady = dbStatus.status === 'UP';

    const payload = {
      status: isReady ? 'READY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        memory: {
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          status: 'OK'
        }
      }
    };

    res.status(isReady ? 200 : 503).json(payload);
  } catch (err) {
    res.status(503).json({ status: 'NOT_READY', error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Prometheus Metrics Scraping Endpoint
// -----------------------------------------------------------------------------
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// -----------------------------------------------------------------------------
// REST API v1 Routes
// -----------------------------------------------------------------------------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/services', servicesRoutes);
app.use('/api/v1/incidents', incidentsRoutes);
app.use('/api/v1/simulate', simulateRoutes);
app.use('/api/v1/system', systemRoutes);

// Root Fallback to Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Endpoint ${req.method} ${req.path} does not exist.`,
    requestId: req.id
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[FATAL] Unhandled Exception on ${req.id}:`, err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred.',
    requestId: req.id
  });
});

// -----------------------------------------------------------------------------
// Server Initialization & Graceful Shutdown
// -----------------------------------------------------------------------------
let server = null;

async function startServer() {
  await initializeDatabase();

  server = app.listen(config.port, () => {
    console.log(`=============================================================`);
    console.log(`🚀 CloudPulse SaaS Platform is running on port ${config.port}`);
    console.log(`🌐 Dashboard UI:     http://localhost:${config.port}/`);
    console.log(`📊 Prometheus:       http://localhost:${config.port}/metrics`);
    console.log(`❤️  Health Probe:    http://localhost:${config.port}/health`);
    console.log(`🩺 Readiness Probe: http://localhost:${config.port}/ready`);
    console.log(`⚙️  Environment:     ${config.nodeEnv}`);
    console.log(`=============================================================`);
  });

  // Handle graceful shutdowns for Docker & Kubernetes
  const shutdown = (signal) => {
    console.log(`\n[SHUTDOWN] Received ${signal}. Gracefully terminating CloudPulse...`);
    if (server) {
      server.close(() => {
        console.log('[SHUTDOWN] HTTP server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startServer();
}

module.exports = app;
