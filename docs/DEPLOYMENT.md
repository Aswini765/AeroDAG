# AeroDAG — Production Deployment & Operations Guide

This guide covers building, configuring, deploying, monitoring, and operating AeroDAG in local, containerized, and production cloud environments.

---

## 1. Prerequisites & System Requirements

- **Runtime**: Node.js >= 18.0.0 (Recommended: Node.js 20 LTS or Node.js 24)
- **Package Manager**: npm >= 9.0.0
- **Operating System**: Linux (Ubuntu 22.04+ / Debian 12), macOS, or Windows 11
- **Hardware Minimum**: 1 vCPU, 1 GB RAM (Standard cloud container)
- **Hardware Recommended**: 2 vCPU, 2 GB RAM (for high-concurrency multi-agent synthesis)

---

## 2. Environment Variables Specification

All sensitive credentials and API keys remain strictly server-side. The frontend bundle receives only non-sensitive flags via `getSafePublicConfig()`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `3000` | Port for Express production server |
| `NODE_ENV` | Optional | `production` | Execution mode (`development`, `test`, `production`) |
| `GEMINI_API_KEY` | Optional | `""` | Google AI Studio API key for Gemini 2.5 Flash / Pro |
| `ADMIN_KEY` | Optional | `""` | Key required for accessing internal observability endpoints in production |
| `DEMO_MODE` | Optional | `true` | Enables deterministic reviewer demonstration mode without live credentials |
| `JWT_SECRET` | Optional | Auto-generated | Secret key used for signing session tokens |

---

## 3. Build & Local Startup

### 1. Build Production Assets
```bash
# Clean previous build artifacts and build static frontend
npm run build
```
This runs Vite build, bundling client assets into `dist/` with gzip compression.

### 2. Run Type Checks
```bash
# Validate strict TypeScript compilation
npm run lint
```

### 3. Launch the Server
```bash
# Launch Express production server
npm run start
```
The server serves static client assets from `dist/` and mounts all API endpoints on `http://localhost:3000`.

---

## 4. Container & Render Deployment Configuration

AeroDAG is deployment-ready for **Render**, **Railway**, **Fly.io**, or standalone Docker.

### Render Deployment Blueprint (`render.yaml`):
```yaml
services:
  - type: web
    name: aerodag-travel
    env: node
    plan: standard
    buildCommand: npm install && npm run build
    startCommand: npm run start
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: DEMO_MODE
        value: true
      - key: GEMINI_API_KEY
        sync: false
```

### Standalone Dockerfile:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## 5. Health & Readiness Probes

### 1. Liveness Probe (`GET /health`)
Used by load balancers and container orchestrators to detect crashed processes:
```http
GET /health HTTP/1.1
Host: localhost:3000
```
**Response (200 OK):**
```json
{
  "status": "UP",
  "service": "AeroDAG Travel Orchestration Engine",
  "timestamp": "2026-10-11T15:45:00.000Z",
  "uptimeSeconds": 1420,
  "memoryMb": 84,
  "environment": "production"
}
```

### 2. Readiness Probe (`GET /ready`)
Verifies that database migrations, provider registries, and telemetry stores are initialized:
```http
GET /ready HTTP/1.1
Host: localhost:3000
```
**Response (200 OK):**
```json
{
  "status": "READY",
  "timestamp": "2026-10-11T15:45:00.000Z",
  "components": {
    "database": "UP",
    "migrationsCount": 2,
    "providerRegistry": "UP",
    "telemetry": "UP"
  }
}
```

---

## 6. Observability & Operational Monitoring

- **Traces**: Distributed trace spans are captured per request via `getTelemetryTracer()`.
- **Metrics**: Request duration, success rate, and error categories are tracked in `getTelemetryMetricsCollector()`.
- **Internal Endpoints**: Accessible in development or protected by `x-admin-key: <ADMIN_KEY>` in production:
  - `GET /internal/observability/traces`
  - `GET /internal/observability/metrics`

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **Port 3000 in use** | Existing server or dev instance running | Run on alternate port: `PORT=3001 npm run start` |
| **Vite build memory limit** | Node process heap exhausted | Increase memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run build` |
| **Gemini 429 Quota Exceeded** | Free tier API request spike | System automatically degrades to deterministic engine; set `DEMO_MODE=true` |
| **Cross-origin CORS errors** | Client origin mismatch | Server automatically sets permissive CORS headers for local and hosted frontends |
