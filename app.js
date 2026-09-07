/**
 * CloudPulse - Frontend Controller & Real-Time Telemetry Client
 */

(function () {
  'use strict';

  // Application State
  const state = {
    token: localStorage.getItem('cloudpulse_token') || null,
    user: JSON.parse(localStorage.getItem('cloudpulse_user') || 'null'),
    services: [],
    incidents: [],
    systemInfo: null,
    pollInterval: null
  };

  // DOM Elements Cache
  const el = {
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    pageTitle: document.getElementById('page-title'),
    statRequestRate: document.getElementById('stat-request-rate'),
    statErrorRate: document.getElementById('stat-error-rate'),
    statLatency: document.getElementById('stat-latency'),
    statActiveIncidents: document.getElementById('stat-active-incidents'),
    trafficBarChart: document.getElementById('traffic-bar-chart'),
    gaugeMemoryVal: document.getElementById('gauge-memory-val'),
    gaugeMemoryBar: document.getElementById('gauge-memory-bar'),
    overviewServicesTbody: document.getElementById('overview-services-tbody'),
    fullServicesTbody: document.getElementById('full-services-tbody'),
    incidentsContainer: document.getElementById('incidents-container'),
    terminalLogs: document.getElementById('terminal-logs'),
    
    // Auth
    btnOpenLogin: document.getElementById('btn-open-login'),
    loginModal: document.getElementById('login-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    formLogin: document.getElementById('form-login'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    btnAutofillDemo: document.getElementById('btn-autofill-demo'),
    loggedOutView: document.getElementById('logged-out-view'),
    loggedInView: document.getElementById('logged-in-view'),
    userName: document.getElementById('user-name'),
    userRole: document.getElementById('user-role'),
    userAvatar: document.getElementById('user-avatar'),
    btnLogout: document.getElementById('btn-logout'),

    // Modals
    serviceModal: document.getElementById('service-modal'),
    incidentModal: document.getElementById('incident-modal'),
    formService: document.getElementById('form-service'),
    formIncident: document.getElementById('form-incident'),
    btnAddServiceModal: document.getElementById('btn-add-service-modal'),
    btnCreateIncidentModal: document.getElementById('btn-create-incident-modal'),
    btnQuickSpike: document.getElementById('btn-quick-spike'),
    btnClearLogs: document.getElementById('btn-clear-logs'),
    btnRefreshServices: document.getElementById('btn-refresh-services')
  };

  // Helper: Append log line to terminal window
  function logToTerminal(message, type = 'info') {
    if (!el.terminalLogs) return;
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `[${time}] ${message}`;
    el.terminalLogs.appendChild(line);
    el.terminalLogs.scrollTop = el.terminalLogs.scrollHeight;
  }

  // Client-Side Simulated Store (Active on GitHub Pages / Static Hosting)
  const clientStore = {
    isStaticMode: false,
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
    }))
  };

  // API Client Wrapper with Intelligent Static / GitHub Pages Fallback
  async function apiCall(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(endpoint, { ...options, headers });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, data };
      }
      // If 404 on API endpoint, we might be on GitHub Pages or static host
      if (res.status === 404 && endpoint.startsWith('/api/')) {
        return fallbackStaticResponse(endpoint, options);
      }
      return { ok: false, status: res.status, data: await res.json().catch(() => ({})) };
    } catch (err) {
      // Network failure or file:// protocol -> activate client fallback
      return fallbackStaticResponse(endpoint, options);
    }
  }

  // Fallback simulator for GitHub Pages / static hosting
  function fallbackStaticResponse(endpoint, options) {
    if (!clientStore.isStaticMode) {
      clientStore.isStaticMode = true;
      const envTag = document.getElementById('env-tag');
      if (envTag) {
        envTag.textContent = 'LIVE CLIENT SIMULATION';
        envTag.style.background = '#059669';
      }
    }

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    if (endpoint === '/api/v1/system/summary') {
      const last = clientStore.history[clientStore.history.length - 1];
      const newReqs = Math.floor(Math.random() * 15) + 8;
      const newErrors = Math.random() < 0.15 ? 1 : 0;
      clientStore.history.push({
        timestamp: new Date().toLocaleTimeString(),
        requests: newReqs,
        errors: newErrors,
        avgLatency: (Math.random() * 10 + 16).toFixed(2)
      });
      if (clientStore.history.length > 20) clientStore.history.shift();

      return {
        ok: true,
        status: 200,
        data: {
          history: clientStore.history,
          system: {
            memoryUsageMb: (36 + Math.sin(Date.now() / 10000) * 4).toFixed(2),
            uptimeSeconds: Math.floor(performance.now() / 1000) + 1200,
            nodeVersion: 'v20.12.0'
          }
        }
      };
    }

    if (endpoint === '/api/v1/services') {
      if (method === 'GET') return { ok: true, status: 200, data: { services: clientStore.services } };
      if (method === 'POST') {
        const newSrv = {
          id: `srv-0${clientStore.services.length + 1}`,
          name: body.name || 'New Microservice',
          type: body.type || 'microservice',
          status: 'HEALTHY',
          region: body.region || 'us-east-1',
          latency_ms: Math.floor(Math.random() * 20) + 15,
          uptime_percent: 100.00
        };
        clientStore.services.push(newSrv);
        return { ok: true, status: 201, data: { service: newSrv } };
      }
    }

    if (endpoint.startsWith('/api/v1/services/') && endpoint.endsWith('/status')) {
      const parts = endpoint.split('/');
      const id = parts[4];
      const srv = clientStore.services.find(s => s.id === id);
      if (srv) {
        srv.status = body.status || 'HEALTHY';
        return { ok: true, status: 200, data: { service: srv } };
      }
    }

    if (endpoint === '/api/v1/incidents') {
      if (method === 'GET') return { ok: true, status: 200, data: { incidents: clientStore.incidents } };
      if (method === 'POST') {
        const newInc = {
          id: `inc-${Math.floor(Math.random() * 900) + 100}`,
          title: body.title,
          service_name: body.service_name,
          severity: body.severity,
          status: 'OPEN',
          created_at: new Date().toISOString(),
          resolved_at: null,
          root_cause: body.root_cause || 'Investigating alert signals.'
        };
        clientStore.incidents.unshift(newInc);
        return { ok: true, status: 201, data: { incident: newInc } };
      }
    }

    if (endpoint.includes('/incidents/') && endpoint.endsWith('/resolve')) {
      const parts = endpoint.split('/');
      const id = parts[4];
      const inc = clientStore.incidents.find(i => i.id === id);
      if (inc) {
        inc.status = 'RESOLVED';
        inc.resolved_at = new Date().toISOString();
        if (body.root_cause) inc.root_cause = body.root_cause;
        return { ok: true, status: 200, data: { incident: inc } };
      }
    }

    if (endpoint === '/api/v1/simulate/traffic') {
      const count = body.count || 25;
      clientStore.history.push({
        timestamp: new Date().toLocaleTimeString(),
        requests: count,
        errors: 0,
        avgLatency: (Math.random() * 8 + 14).toFixed(2)
      });
      return { ok: true, status: 200, data: { status: 'SUCCESS', simulatedRequests: count } };
    }

    if (endpoint === '/api/v1/simulate/error') {
      clientStore.history.push({
        timestamp: new Date().toLocaleTimeString(),
        requests: 10,
        errors: 8,
        avgLatency: 45.00
      });
      return { ok: false, status: 500, data: { error: 'Internal Server Error (Simulated Chaos)' } };
    }

    if (endpoint === '/api/v1/simulate/latency') {
      return { ok: true, status: 200, data: { status: 'COMPLETED', simulatedDelayMs: 850 } };
    }

    if (endpoint === '/api/v1/simulate/chaos') {
      return { ok: true, status: 200, data: { status: 'OK_DEGRADED', latencyMs: 320 } };
    }

    if (endpoint === '/api/v1/auth/login') {
      if (body.email === 'admin@cloudpulse.io' && body.password === 'Admin@DevOps2026!') {
        return {
          ok: true,
          status: 200,
          data: {
            token: 'mock-jwt-token-capstone-2026',
            user: { id: 'usr-admin', name: 'DevOps Lead Admin', email: 'admin@cloudpulse.io', role: 'admin' }
          }
        };
      }
      return { ok: false, status: 401, data: { error: 'Invalid email or password' } };
    }

    return { ok: true, status: 200, data: {} };
  }

  // Navigation Logic
  function initNav() {
    el.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        el.navItems.forEach(b => b.classList.remove('active'));
        el.tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetTab = btn.getAttribute('data-tab');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');

        // Update title
        const titles = {
          'tab-overview': 'Operational Telemetry & Observability',
          'tab-services': 'Managed Cloud Infrastructure Services',
          'tab-incidents': 'Production Incident & Alert Management',
          'tab-chaos': 'Chaos Engineering & Synthetic Load Lab',
          'tab-cicd': 'Automated CI/CD Pipeline & System Architecture'
        };
        el.pageTitle.textContent = titles[targetTab] || 'CloudPulse Dashboard';
      });
    });
  }

  // Auth Management
  function updateAuthUI() {
    if (state.token && state.user) {
      el.loggedOutView.classList.add('hidden');
      el.loggedInView.classList.remove('hidden');
      el.userName.textContent = state.user.name || state.user.email;
      el.userRole.textContent = (state.user.role || 'ENGINEER').toUpperCase();
      el.userAvatar.textContent = (state.user.name || 'CP').substring(0, 2).toUpperCase();
    } else {
      el.loggedOutView.classList.remove('hidden');
      el.loggedInView.classList.add('hidden');
    }
  }

  function initAuth() {
    el.btnOpenLogin.addEventListener('click', () => {
      el.loginModal.classList.remove('hidden');
    });

    el.btnCloseModal.addEventListener('click', () => {
      el.loginModal.classList.add('hidden');
    });

    el.btnAutofillDemo.addEventListener('click', () => {
      el.loginEmail.value = 'admin@cloudpulse.io';
      el.loginPassword.value = 'Admin@DevOps2026!';
    });

    el.formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = el.loginEmail.value.trim();
      const password = el.loginPassword.value;

      const res = await apiCall('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (res.ok && res.data.token) {
        state.token = res.data.token;
        state.user = res.data.user;
        localStorage.setItem('cloudpulse_token', state.token);
        localStorage.setItem('cloudpulse_user', JSON.stringify(state.user));
        updateAuthUI();
        el.loginModal.classList.add('hidden');
        logToTerminal(`User ${state.user.email} authenticated successfully (Role: ${state.user.role})`, 'success');
      } else {
        alert(res.data.error || 'Login failed. Please verify credentials.');
      }
    });

    el.btnLogout.addEventListener('click', () => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('cloudpulse_token');
      localStorage.removeItem('cloudpulse_user');
      updateAuthUI();
      logToTerminal('User session logged out.', 'info');
    });

    updateAuthUI();
  }

  // Render Telemetry & Charts
  function renderChart(history) {
    if (!el.trafficBarChart || !history || history.length === 0) return;

    el.trafficBarChart.innerHTML = '';
    const maxVal = Math.max(...history.map(h => h.requests + h.errors), 10);

    history.forEach(item => {
      const group = document.createElement('div');
      group.className = 'chart-bar-group';
      group.title = `${item.timestamp}: ${item.requests} reqs, ${item.errors} errs, ${item.avgLatency}ms`;

      const total = item.requests + item.errors;
      const heightPercent = Math.min((total / maxVal) * 100, 100);

      const bar = document.createElement('div');
      bar.className = item.errors > 0 ? 'chart-bar error' : 'chart-bar success';
      bar.style.height = `${Math.max(heightPercent, 6)}%`;

      group.appendChild(bar);
      el.trafficBarChart.appendChild(group);
    });
  }

  // Poll Metrics and Update Live Dashboard
  async function pollTelemetry() {
    const res = await apiCall('/api/v1/system/summary');
    if (res.ok && res.data) {
      const { history, system } = res.data;

      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        const reqPerSec = (latest.requests / 5).toFixed(1);
        el.statRequestRate.innerHTML = `${reqPerSec} <span class="unit">req/sec</span>`;

        const totalReq = latest.requests + latest.errors;
        const errPercent = totalReq > 0 ? ((latest.errors / totalReq) * 100).toFixed(2) : '0.00';
        el.statErrorRate.innerHTML = `${errPercent} <span class="unit">%</span>`;

        if (parseFloat(errPercent) > 1.0) {
          el.statErrorRate.classList.add('text-danger');
        } else {
          el.statErrorRate.classList.remove('text-danger');
        }

        el.statLatency.innerHTML = `${latest.avgLatency || 18} <span class="unit">ms</span>`;
        renderChart(history);
      }

      if (system) {
        el.gaugeMemoryVal.textContent = `${system.memoryUsageMb} MB`;
        const memPercent = Math.min((parseFloat(system.memoryUsageMb) / 256) * 100, 100);
        el.gaugeMemoryBar.style.width = `${memPercent}%`;
      }
    }
  }

  // Load and Render Cloud Services
  async function loadServices() {
    const res = await apiCall('/api/v1/services');
    if (res.ok && res.data.services) {
      state.services = res.data.services;
      renderServicesTable();
    }
  }

  function renderServicesTable() {
    const renderRow = (s, isOverview = false) => `
      <tr>
        ${!isOverview ? `<td><code>${s.id}</code></td>` : ''}
        <td><strong>${s.name}</strong></td>
        <td><span class="badge badge-info">${s.type}</span></td>
        <td><code>${s.region}</code></td>
        <td>${s.latency_ms} ms</td>
        <td>${s.uptime_percent}%</td>
        <td><span class="badge ${s.status === 'HEALTHY' ? 'badge-success' : s.status === 'DEGRADED' ? 'badge-warning' : 'badge-danger'}">${s.status}</span></td>
        ${!isOverview ? `
          <td>
            <button class="btn btn-outline btn-xs" onclick="window.cloudPulse.toggleServiceStatus('${s.id}', '${s.status === 'HEALTHY' ? 'DEGRADED' : 'HEALTHY'}')">
              Toggle
            </button>
          </td>
        ` : ''}
      </tr>
    `;

    if (el.overviewServicesTbody) {
      el.overviewServicesTbody.innerHTML = state.services.map(s => renderRow(s, true)).join('');
    }

    if (el.fullServicesTbody) {
      el.fullServicesTbody.innerHTML = state.services.map(s => renderRow(s, false)).join('');
    }
  }

  // Load and Render Incidents
  async function loadIncidents() {
    const res = await apiCall('/api/v1/incidents');
    if (res.ok && res.data.incidents) {
      state.incidents = res.data.incidents;
      const openCount = state.incidents.filter(i => i.status === 'OPEN').length;
      el.statActiveIncidents.textContent = openCount;

      el.incidentsContainer.innerHTML = state.incidents.map(inc => `
        <div class="incident-card ${inc.status === 'OPEN' ? 'open' : 'resolved'}">
          <div class="incident-left">
            <h4>${inc.title}</h4>
            <p style="font-size: 0.8rem; color: #d1d5db; margin-top: 4px;">${inc.root_cause || 'Investigating...'}</p>
            <div class="incident-meta">
              <span><strong>Service:</strong> ${inc.service_name}</span>
              <span><strong>Severity:</strong> <span class="badge ${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}">${inc.severity}</span></span>
              <span><strong>Created:</strong> ${new Date(inc.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
          <div class="incident-right">
            ${inc.status === 'OPEN' ? `
              <button class="btn btn-success btn-sm" onclick="window.cloudPulse.resolveIncident('${inc.id}')">Resolve Incident</button>
            ` : `
              <span class="badge badge-success">RESOLVED</span>
            `}
          </div>
        </div>
      `).join('');
    }
  }

  // Chaos & Traffic Simulators
  async function simulateTraffic(count) {
    logToTerminal(`Dispatched ${count} high-concurrency requests to microservices...`, 'info');
    const res = await apiCall('/api/v1/simulate/traffic', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
    if (res.ok) {
      logToTerminal(`Traffic batch completed: 200 OK across endpoints. Prometheus counters incremented.`, 'success');
      pollTelemetry();
    }
  }

  async function simulateError() {
    logToTerminal(`Injecting synthetic 500 Internal Server Error into checkout microservice...`, 'warn');
    const res = await apiCall('/api/v1/simulate/error', {
      method: 'POST',
      body: JSON.stringify({ type: 'DATABASE_TIMEOUT_SIMULATION' })
    });
    logToTerminal(`500 Internal Server Error returned. Error rate gauge updated.`, 'error');
    pollTelemetry();
  }

  async function simulateLatency() {
    logToTerminal(`Triggering slow database query with 850ms artificial delay...`, 'warn');
    const res = await apiCall('/api/v1/simulate/latency', {
      method: 'POST',
      body: JSON.stringify({ delayMs: 850 })
    });
    if (res.ok) {
      logToTerminal(`Slow query completed in 850ms. Observed in P95 latency histogram.`, 'info');
      pollTelemetry();
    }
  }

  async function simulateChaos() {
    logToTerminal(`Running Chaos Monkey injection...`, 'warn');
    const res = await apiCall('/api/v1/simulate/chaos', { method: 'POST' });
    if (res.ok) {
      logToTerminal(`Chaos response: ${res.data.status || 'OK'}`, 'info');
    } else {
      logToTerminal(`Chaos fault injected: HTTP ${res.status}`, 'error');
    }
    pollTelemetry();
  }

  // Modals & Form Handlers
  function initModals() {
    el.btnAddServiceModal.addEventListener('click', () => {
      if (!state.token) {
        alert('Please sign in as Admin to register new cloud services.');
        el.loginModal.classList.remove('hidden');
        return;
      }
      el.serviceModal.classList.remove('hidden');
    });

    el.btnCreateIncidentModal.addEventListener('click', () => {
      if (!state.token) {
        alert('Please sign in to report operational incidents.');
        el.loginModal.classList.remove('hidden');
        return;
      }
      el.incidentModal.classList.remove('hidden');
    });

    el.formService.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('service-name').value.trim();
      const type = document.getElementById('service-type').value;
      const region = document.getElementById('service-region').value;

      const res = await apiCall('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({ name, type, region })
      });

      if (res.ok) {
        el.serviceModal.classList.add('hidden');
        el.formService.reset();
        logToTerminal(`Cloud resource "${name}" (${region}) provisioned and added to monitoring.`, 'success');
        loadServices();
      } else {
        alert(res.data.error || 'Failed to create service.');
      }
    });

    el.formIncident.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('incident-title').value.trim();
      const service_name = document.getElementById('incident-service').value.trim();
      const severity = document.getElementById('incident-severity').value;
      const root_cause = document.getElementById('incident-cause').value.trim();

      const res = await apiCall('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify({ title, service_name, severity, root_cause })
      });

      if (res.ok) {
        el.incidentModal.classList.add('hidden');
        el.formIncident.reset();
        logToTerminal(`Alert triggered: ${title} [${severity}] on ${service_name}`, 'error');
        loadIncidents();
      } else {
        alert(res.data.error || 'Failed to create incident.');
      }
    });

    el.btnQuickSpike.addEventListener('click', () => simulateTraffic(50));
    el.btnClearLogs.addEventListener('click', () => { el.terminalLogs.innerHTML = ''; });
    el.btnRefreshServices.addEventListener('click', loadServices);
  }

  // Public Interface for Inline HTML Event Handlers
  window.cloudPulse = {
    simulateTraffic,
    simulateError,
    simulateLatency,
    simulateChaos,
    closeModals() {
      el.serviceModal.classList.add('hidden');
      el.incidentModal.classList.add('hidden');
      el.loginModal.classList.add('hidden');
    },
    async toggleServiceStatus(id, newStatus) {
      if (!state.token) {
        alert('Please sign in to update service states.');
        el.loginModal.classList.remove('hidden');
        return;
      }
      const res = await apiCall(`/api/v1/services/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        logToTerminal(`Service ${id} status updated to ${newStatus}`, 'info');
        loadServices();
      }
    },
    async resolveIncident(id) {
      if (!state.token) {
        alert('Please sign in to resolve incidents.');
        el.loginModal.classList.remove('hidden');
        return;
      }
      const root_cause = prompt('Enter resolution notes / root cause summary:', 'Resolved via automated container failover and scale-out.');
      if (root_cause === null) return;

      const res = await apiCall(`/api/v1/incidents/${id}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ root_cause })
      });
      if (res.ok) {
        logToTerminal(`Incident ${id} marked as RESOLVED.`, 'success');
        loadIncidents();
      }
    }
  };

  // Initialization
  function init() {
    initNav();
    initAuth();
    initModals();
    loadServices();
    loadIncidents();
    pollTelemetry();
    state.pollInterval = setInterval(pollTelemetry, 3000);
    logToTerminal('Connected to CloudPulse telemetry stream via HTTP polling & Prometheus.', 'success');
  }

  window.addEventListener('DOMContentLoaded', init);
})();
