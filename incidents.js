/**
 * CloudPulse - Incident & Alert Management Routes
 */

const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../auth/jwt');
const { isPgConnected, query, memoryStore } = require('../db');
const { metrics } = require('../metrics/prometheus');

const router = express.Router();

// Helper to refresh active incident metric
async function syncIncidentMetric() {
  let openCount = 0;
  if (isPgConnected()) {
    const res = await query("SELECT COUNT(*) as count FROM incidents WHERE status = 'OPEN'");
    openCount = parseInt(res.rows[0].count, 10);
  } else {
    openCount = memoryStore.incidents.filter(i => i.status === 'OPEN').length;
  }
  metrics.activeIncidentsGauge.labels('HIGH').set(openCount);
}

// Get all incidents
router.get('/', async (req, res) => {
  try {
    if (isPgConnected()) {
      const result = await query('SELECT * FROM incidents ORDER BY created_at DESC');
      return res.json({ incidents: result.rows });
    }
    res.json({ incidents: memoryStore.incidents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incidents', details: err.message });
  }
});

// Report a new incident
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, service_name, severity, root_cause } = req.body;
    if (!title || !service_name || !severity) {
      return res.status(400).json({ error: 'Title, service_name, and severity are required' });
    }

    const incidentId = `inc-${crypto.randomBytes(3).toString('hex')}`;
    const newIncident = {
      id: incidentId,
      title,
      service_name,
      severity: severity.toUpperCase(),
      status: 'OPEN',
      created_at: new Date().toISOString(),
      resolved_at: null,
      root_cause: root_cause || 'Investigating anomalies detected by monitoring alarms.'
    };

    if (isPgConnected()) {
      await query(
        'INSERT INTO incidents (id, title, service_name, severity, status, root_cause) VALUES ($1, $2, $3, $4, $5, $6)',
        [newIncident.id, newIncident.title, newIncident.service_name, newIncident.severity, newIncident.status, newIncident.root_cause]
      );
    } else {
      memoryStore.incidents.unshift(newIncident);
    }

    await syncIncidentMetric();
    res.status(201).json({ message: 'Incident reported successfully', incident: newIncident });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create incident', details: err.message });
  }
});

// Resolve an incident
router.put('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { root_cause } = req.body;
    const resolvedAt = new Date().toISOString();

    if (isPgConnected()) {
      const result = await query(
        "UPDATE incidents SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, root_cause = COALESCE($1, root_cause) WHERE id = $2 RETURNING *",
        [root_cause, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
      await syncIncidentMetric();
      return res.json({ message: 'Incident resolved', incident: result.rows[0] });
    }

    const incident = memoryStore.incidents.find(i => i.id === id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    incident.status = 'RESOLVED';
    incident.resolved_at = resolvedAt;
    if (root_cause) incident.root_cause = root_cause;

    await syncIncidentMetric();
    res.json({ message: 'Incident resolved', incident });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve incident', details: err.message });
  }
});

module.exports = router;
