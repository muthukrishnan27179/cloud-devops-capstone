# 🌐 CloudPulse - Step-by-Step Live Cloud Deployment Guide

Follow this guide to deploy your **Cloud & DevOps Capstone Project** live on the internet in **under 3 minutes** for **100% free**, giving you the **Live Website Link** required for your final submission.

---

## 🚀 Option 1: 1-Click Deployment on Render (Recommended & 100% Free)

Render natively reads the included `render.yaml` blueprint and provisions both your **Web Service** and your **Managed PostgreSQL Database** automatically.

### Step 1: Push Project to Your GitHub Account
1. Create a new public repository on GitHub named `cloud-devops-capstone`.
2. Push your project code:
   ```bash
   cd cloud-devops-capstone
   git init
   git add .
   git commit -m "feat: initial release of CloudPulse Capstone Platform"
   git branch -M main
   git remote add origin https://github.com/muthukrishnan27179/cloud-devops-capstone.git
   git push -u origin main
   ```
   *(Or simply run `./push-to-github.bat` on Windows)*

### Step 2: Deploy on Render
1. Visit [dashboard.render.com](https://dashboard.render.com) and sign in with your GitHub account.
2. Click the **"New +"** button in the top navigation bar and select **"Blueprint"**.
3. Select your newly pushed `cloud-devops-capstone` repository.
4. Render will automatically detect `render.yaml` and show:
   - **Service:** `cloudpulse-platform` (Docker Web Service)
   - **Database:** `cloudpulse-postgres` (Managed PostgreSQL 16)
5. Click **"Apply"**.
6. Render will build the Docker container and start your service!
7. Once the build completes (approx. 90 seconds), you will receive your live URL:
   ```
   https://cloudpulse-platform.onrender.com
   ```
   *(Or similar `.onrender.com` subdomain)*

---

## 🚂 Option 2: Deploy on Railway (Alternative Free Cloud)

Railway provides another instant deployment option:

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Choose your `cloud-devops-capstone` repo.
4. Railway automatically detects the `Dockerfile` and deploys your service.
5. In your Railway service settings, click **"Generate Domain"** to get your public live URL (e.g. `https://cloudpulse-production.up.railway.app`).

---

## ✈️ Option 3: Deploy on Fly.io (Container Global Edge)

If you prefer deploying via the `flyctl` CLI:
```bash
# 1. Install Flyctl and authenticate
fly auth login

# 2. Launch application
fly launch --name cloudpulse-capstone

# 3. Deploy
fly deploy
```

---

## ✅ Post-Deployment Verification Checklist

Once your live website is running, verify all capstone features:

1. **Dashboard Home:** Visit `https://<YOUR-LIVE-URL>/` and confirm the dark glassmorphic dashboard loads with healthy status.
2. **Prometheus Telemetry:** Open `https://<YOUR-LIVE-URL>/metrics` and verify that `http_requests_total` and Node.js metrics are actively streaming.
3. **Container Health Probe:** Open `https://<YOUR-LIVE-URL>/health` and ensure it responds with `{"status":"UP"}`.
4. **Dependency Readiness Probe:** Open `https://<YOUR-LIVE-URL>/ready` and verify database connectivity.
5. **Interactive Chaos Test:** Click the **"Chaos & Traffic Lab"** tab in your dashboard, send 25 requests, and watch the live telemetry bar chart update in real time!
6. **Authentication:** Click **"Sign In / Demo"**, autofill the demo credentials (`admin@cloudpulse.io`), and log in to verify JWT authentication.

---

## 📋 Ready to Submit!
Copy your live URL and paste it into the **Submission Deliverables** sheet:
- **Live Website Link:** `https://your-cloudpulse-app.onrender.com`
