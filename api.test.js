/**
 * CloudPulse - Integration & Unit Test Suite (Jest + Supertest)
 */

const request = require('supertest');
const app = require('../server');

describe('CloudPulse Cloud & DevOps Test Suite', () => {
  let authToken = '';

  // 1. Health Probes
  describe('Kubernetes & Container Probes', () => {
    it('GET /health - should return 200 with status UP', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body).toHaveProperty('uptimeSeconds');
    });

    it('GET /ready - should return 200 with database readiness', async () => {
      const res = await request(app).get('/ready');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.dependencies.database.status).toBe('UP');
    });
  });

  // 2. Prometheus Metrics Exposition
  describe('Observability & Prometheus Telemetry', () => {
    it('GET /metrics - should return Prometheus metrics exposition format', async () => {
      const res = await request(app).get('/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('http_request_duration_seconds');
    });

    it('GET /api/v1/system/summary - should return JSON telemetry summary for dashboards', async () => {
      const res = await request(app).get('/api/v1/system/summary');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(res.body).toHaveProperty('system');
    });
  });

  // 3. Authentication & RBAC
  describe('Authentication & User Management', () => {
    it('POST /api/v1/auth/login - should authenticate with demo credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@cloudpulse.io', password: 'Admin@DevOps2026!' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('admin@cloudpulse.io');
      expect(res.body.user.role).toBe('admin');
      authToken = res.body.token;
    });

    it('POST /api/v1/auth/login - should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@cloudpulse.io', password: 'WrongPassword' });

      expect(res.statusCode).toBe(401);
    });

    it('GET /api/v1/auth/me - should return profile when authenticated with JWT', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe('admin@cloudpulse.io');
    });
  });

  // 4. Cloud Services & Managed Resources
  describe('Cloud Services Resource API', () => {
    it('GET /api/v1/services - should list all monitored cloud services', async () => {
      const res = await request(app).get('/api/v1/services');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.services)).toBe(true);
      expect(res.body.services.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/services - should create new service when authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Elasticsearch Log Cluster',
          type: 'database',
          region: 'us-west-2'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.service.name).toBe('Elasticsearch Log Cluster');
    });
  });

  // 5. Chaos & Traffic Simulation
  describe('Traffic & Chaos Simulation Lab', () => {
    it('POST /api/v1/simulate/traffic - should handle batch traffic generation', async () => {
      const res = await request(app)
        .post('/api/v1/simulate/traffic')
        .send({ count: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.simulatedRequests).toBe(10);
    });

    it('POST /api/v1/simulate/error - should return 500 internal server error for alert tests', async () => {
      const res = await request(app)
        .post('/api/v1/simulate/error')
        .send({ type: 'TEST_FAULT' });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toContain('Internal Server Error');
    });
  });
});
