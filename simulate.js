/**
 * CloudPulse - Chaos Engineering & Traffic Simulation Routes
 * Used to demonstrate live Prometheus/Grafana metric changes and alert triggering.
 */

const express = require('express');
const { recordRequest } = require('../metrics/prometheus');

const router = express.Router();

// Generate synthetic traffic batch
router.post('/traffic', (req, res) => {
  const count = Math.min(parseInt(req.body.count, 10) || 25, 200);
  const endpoints = ['/api/v1/services', '/api/v1/incidents', '/api/v1/auth/me', '/api/v1/dashboard'];

  for (let i = 0; i < count; i++) {
    const route = endpoints[Math.floor(Math.random() * endpoints.length)];
    const duration = (Math.random() * 0.08 + 0.01); // 10ms - 90ms
    recordRequest('GET', route, 200, duration);
  }

  res.json({
    status: 'SUCCESS',
    message: `Generated ${count} synthetic HTTP 200 requests across microservices. Telemetry updated.`,
    simulatedRequests: count
  });
});

// Trigger 500 Internal Server Error (to test error alerts)
router.post('/error', (req, res) => {
  const errorType = req.body.type || 'DATABASE_TIMEOUT';
  const duration = 0.45;
  recordRequest('POST', '/api/v1/checkout', 500, duration);

  res.status(500).json({
    error: 'Internal Server Error (Simulated Chaos)',
    faultType: errorType,
    message: 'Artificial 500 error triggered for Prometheus RED metrics and Grafana alert verification.',
    timestamp: new Date().toISOString()
  });
});

// Trigger High Latency (to test P95 latency alerts)
router.post('/latency', async (req, res) => {
  const delayMs = parseInt(req.body.delayMs, 10) || 850;
  await new Promise(resolve => setTimeout(resolve, delayMs));

  res.json({
    status: 'COMPLETED',
    simulatedDelayMs: delayMs,
    message: `Simulated slow database query completed in ${delayMs}ms. P95 latency histogram observed.`
  });
});

// Chaos Mode: Randomly inject faults
router.post('/chaos', (req, res) => {
  const roll = Math.random();
  if (roll < 0.4) {
    // 40% chance of 503
    recordRequest('GET', '/api/v1/payment-gateway', 503, 0.25);
    return res.status(503).json({ error: 'Service Unavailable (Chaos Test)', status: 503 });
  } else if (roll < 0.7) {
    // 30% chance of slow response
    setTimeout(() => {
      res.json({ status: 'OK_DEGRADED', latencyMs: 600 });
    }, 600);
    return;
  }
  // 30% normal
  res.json({ status: 'HEALTHY', message: 'Chaos test passed without incident' });
});

module.exports = router;
