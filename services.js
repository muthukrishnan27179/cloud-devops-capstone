/**
 * CloudPulse - Cloud Services & Resource Management Routes
 */

const express = require('express');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../auth/jwt');
const { isPgConnected, query, memoryStore } = require('../db');

const router = express.Router();

// Get all monitored cloud services
router.get('/', async (req, res) => {
  try {
    if (isPgConnected()) {
      const result = await query('SELECT * FROM services ORDER BY name ASC');
      return res.json({ services: result.rows });
    }
    res.json({ services: memoryStore.services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
});

// Register new cloud service (requires authentication)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, region } = req.body;
    if (!name || !type || !region) {
      return res.status(400).json({ error: 'Name, type, and region are required' });
    }

    const serviceId = `srv-${crypto.randomBytes(3).toString('hex')}`;
    const newService = {
      id: serviceId,
      name,
      type,
      status: 'HEALTHY',
      region,
      latency_ms: Math.floor(Math.random() * 30) + 10,
      uptime_percent: 100.00,
      updated_at: new Date().toISOString()
    };

    if (isPgConnected()) {
      await query(
        'INSERT INTO services (id, name, type, status, region, latency_ms, uptime_percent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [newService.id, newService.name, newService.type, newService.status, newService.region, newService.latency_ms, newService.uptime_percent]
      );
    } else {
      memoryStore.services.push(newService);
    }

    res.status(201).json({ message: 'Service successfully registered', service: newService });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service', details: err.message });
  }
});

// Update Service Status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['HEALTHY', 'DEGRADED', 'DOWN'].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Allowed: 'HEALTHY', 'DEGRADED', 'DOWN'" });
    }

    if (isPgConnected()) {
      const result = await query(
        'UPDATE services SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
      return res.json({ message: 'Service status updated', service: result.rows[0] });
    }

    const service = memoryStore.services.find(s => s.id === id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    service.status = status;
    service.updated_at = new Date().toISOString();

    res.json({ message: 'Service status updated', service });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service', details: err.message });
  }
});

// Delete Service (Admin Only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (isPgConnected()) {
      await query('DELETE FROM services WHERE id = $1', [id]);
    } else {
      memoryStore.services = memoryStore.services.filter(s => s.id !== id);
    }
    res.json({ message: `Service ${id} successfully deregistered` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service', details: err.message });
  }
});

module.exports = router;
