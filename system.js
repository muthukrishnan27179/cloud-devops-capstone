/**
 * CloudPulse - System Telemetry & Health Summary Routes
 */

const express = require('express');
const os = require('os');
const config = require('../config');
const { getMetricsSummary } = require('../metrics/prometheus');
const { healthCheck } = require('../db');

const router = express.Router();

// System Metadata & Runtime Statistics
router.get('/info', async (req, res) => {
  const mem = process.memoryUsage();
  const dbHealth = await healthCheck();

  res.json({
    appName: config.appName,
    version: config.appVersion,
    environment: config.nodeEnv,
    buildId: config.buildId,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    runtime: {
      nodeVersion: process.version,
      platform: os.platform(),
      cpus: os.cpus().length,
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      processMemoryHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    database: dbHealth
  });
});

// Telemetry Summary for Frontend Charts
router.get('/summary', (req, res) => {
  res.json(getMetricsSummary());
});

module.exports = router;
