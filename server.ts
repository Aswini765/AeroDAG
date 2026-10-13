/**
 * AeroDAG Production & Standalone Express Server
 * Hardened with security headers, rate limiting, request validation, and safe error responses.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { handleGeminiChat } from './src/server/geminiHandler.ts';
import { handleParseTrip } from './src/server/parseTripHandler.ts';
import {
  getTelemetryTracer,
  getTelemetryMetricsCollector,
  defaultTelemetryStore
} from './src/services/telemetry/index.ts';
import { getRateLimiter, ErrorSanitizer, getAuthProvider, RBACAuthorizer } from './src/services/security/index.ts';
import { getSafePublicConfig } from './src/config/env.ts';

import { DatabaseAdapter } from './src/services/persistence/index.ts';

const app = express();
const port = process.env.PORT || 3000;

// 1. Security Headers Middleware (CSP, CORS, X-Frame-Options, Nosniff)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co" +
      (process.env.NODE_ENV !== 'production' ? ' ws://localhost:* ws://127.0.0.1:*' : '') +
      "; img-src 'self' data: https:;"
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trace-id, x-request-id, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 2. Request body size limit (prevent denial of service with huge payloads)
app.use(express.json({ limit: '1mb' }));

// 3. Health & Liveness Probe
app.get('/health', (_req, res) => {
  res.json({
    status: 'UP',
    service: 'AeroDAG Travel Orchestration Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    environment: process.env.NODE_ENV || 'production'
  });
});

// 4. Readiness Probe
app.get('/ready', (_req, res) => {
  const db = DatabaseAdapter.getInstance();
  const migrations = db.getAppliedMigrations();
  const isDbReady = migrations.length > 0;

  res.json({
    status: isDbReady ? 'READY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    components: {
      database: isDbReady ? 'UP' : 'INITIALIZING',
      migrationsCount: migrations.length,
      providerRegistry: 'UP',
      telemetry: 'UP'
    }
  });
});

// 5. Public Safe Configuration Endpoint (Zero secrets)
app.get('/api/config', (_req, res) => {
  res.json(getSafePublicConfig());
});

// 4. API: Server-side Gemini AI chat endpoint with telemetry and rate limiting
app.post('/api/chat', async (req, res) => {
  const tracer = getTelemetryTracer();
  const metrics = getTelemetryMetricsCollector();
  const incomingTraceId = req.headers['x-trace-id'] as string | undefined;
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client_default';

  // Rate Limiting Check
  const rateLimiter = getRateLimiter();
  const rateStatus = rateLimiter.consume('chat', clientIp);
  if (!rateStatus.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateStatus.retryAfterSec,
      requestId
    });
  }

  // Request validation
  if (!req.body || (typeof req.body !== 'object')) {
    return res.status(400).json({
      error: 'Invalid request body',
      code: 'INVALID_REQUEST',
      requestId
    });
  }

  const apiSpan = incomingTraceId
    ? tracer.startSpan('api_chat_request', 'api', { traceId: incomingTraceId, spanId: `req_span_${Date.now()}` }, {
        endpoint: '/api/chat',
        method: 'POST',
        requestId
      })
    : tracer.startTrace('api_chat_request', 'api', {
        endpoint: '/api/chat',
        method: 'POST',
        requestId
      });

  res.setHeader('x-trace-id', apiSpan.context.traceId);
  const startMs = Date.now();

  try {
    const result = await handleGeminiChat(req.body, apiSpan.context);
    const durationMs = Date.now() - startMs;
    tracer.endSpan(apiSpan.spanId, 'SUCCESS', {
      statusCode: 200,
      durationMs
    });
    metrics.recordRequest(durationMs, true);
    res.json(result);
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    tracer.endSpan(apiSpan.spanId, 'ERROR', {
      statusCode: 500,
      durationMs,
      error: ErrorSanitizer.sanitizeForInternalLog(err),
      errorCategory: 'INTERNAL_ERROR'
    });
    metrics.recordRequest(durationMs, false);

    // Return sanitized, non-leaking error response to consumer
    const safeError = ErrorSanitizer.sanitizeForConsumer(err, requestId);
    res.status(500).json(safeError);
  }
});

// POST /api/parse-trip – server‑side Gemini parsing
app.post('/api/parse-trip', handleParseTrip);

// 5. User Resource Ownership Verification Endpoints
const mockUserTrips: Record<string, { id: string; ownerId: string; destination: string }> = {
  'trip-101': { id: 'trip-101', ownerId: 'user_alice', destination: 'Tokyo' },
  'trip-102': { id: 'trip-102', ownerId: 'user_bob', destination: 'Paris' }
};

const mockUserBookings: Record<string, { id: string; ownerId: string; status: string }> = {
  'book-201': { id: 'book-201', ownerId: 'user_alice', status: 'CONFIRMED' },
  'book-202': { id: 'book-202', ownerId: 'user_bob', status: 'HELD' }
};

app.get('/api/trips/:tripId', (req, res) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const authProvider = getAuthProvider();
  const identity = authProvider.getUserIdentity(token);

  if (!identity) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  }

  const trip = mockUserTrips[req.params.tripId];
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found', code: 'NOT_FOUND' });
  }

  if (!RBACAuthorizer.canAccessTrip(identity, trip.ownerId)) {
    return res.status(403).json({ error: 'Forbidden: You cannot access another user\'s trip', code: 'FORBIDDEN' });
  }

  return res.json(trip);
});

app.get('/api/bookings/:bookingId', (req, res) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const authProvider = getAuthProvider();
  const identity = authProvider.getUserIdentity(token);

  if (!identity) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  }

  const booking = mockUserBookings[req.params.bookingId];
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found', code: 'NOT_FOUND' });
  }

  if (!RBACAuthorizer.canAccessBooking(identity, booking.ownerId)) {
    return res.status(403).json({ error: 'Forbidden: You cannot access another user\'s booking', code: 'FORBIDDEN' });
  }

  return res.json(booking);
});

// =============================================================================
// INTERNAL DEVELOPER OBSERVABILITY API (Internal/Admin only)
// Never exposed to public consumers; protected in production
// =============================================================================
const internalAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Allow freely in development/test environments
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  // Enforce admin key in production
  const adminKey = req.headers['x-admin-key'];
  if (process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Internal developer endpoint' });
};

app.get('/internal/observability/traces', internalAuthMiddleware, (_req, res) => {
  res.json(defaultTelemetryStore.getRecentTraces());
});

app.get('/internal/observability/traces/:traceId', internalAuthMiddleware, (req, res) => {
  const trace = defaultTelemetryStore.getTrace(req.params.traceId);
  if (!trace) {
    return res.status(404).json({ error: 'Trace not found' });
  }
  return res.json(trace);
});

app.get('/internal/observability/metrics', internalAuthMiddleware, (_req, res) => {
  res.json(getTelemetryMetricsCollector().getSnapshot());
});

app.delete('/internal/observability/traces', internalAuthMiddleware, (_req, res) => {
  defaultTelemetryStore.clear();
  getTelemetryMetricsCollector().reset();
  res.json({ cleared: true });
});

// =============================================================================
// FRONTEND SERVING
// Development: Vite middleware serves the LIVE source (src/) with hot reload,
//   so the browser never runs a stale build. Registered after all /api routes.
// Production (NODE_ENV=production): serve the pre-built dist/ folder.
// =============================================================================
async function attachFrontend() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('[AeroDAG Server] Frontend: live source via Vite dev middleware');
      return;
    } catch (err) {
      console.warn('[AeroDAG Server] Vite dev middleware unavailable, falling back to dist/:', err);
    }
  }
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('[AeroDAG Server] Frontend: pre-built dist/ (run `npm run build` after changes)');
}

if (process.env.NODE_ENV !== 'test') {
  attachFrontend().then(() => {
    app.listen(port, () => {
      console.log(`[AeroDAG Server] Running on http://localhost:${port}`);
    });
  });
}

export default app;
