/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || ".env",
  override: true,
});
import http from "http";
import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { logger } from "./src/lib/logger.js";
import { requireAdminToken, requireSuperAdmin, requireSuperAdminPermission, requireJwt, requireTenantScope, requireRoles, requireSettingsDomain } from "./src/middleware/auth.middleware.js";
import { requireFeature } from "./src/middleware/feature.middleware.js";
import { databaseTestHandler, databaseMigrateHandler } from "./src/server/controllers/database.controller.js";
import { auditMiddleware } from "./src/server/controllers/audit.controller.js";
import auditRoutes from "./src/server/routes/audit.routes.js";
import authRoutes from "./src/server/routes/auth.routes.js";
import whatsappRoutes from "./src/server/routes/whatsapp.routes.js";
import systemRoutes from "./src/server/routes/system.routes.js"; // New import
import { createCrudRouter } from "./src/server/plugins/crudPlugin.js";
import tenantRoutes from "./src/server/routes/tenant.routes.js";
import serviceTrackerRoutes from "./src/server/routes/serviceTracker.routes.js";
import serviceReceptionRoutes from "./src/server/routes/serviceReception.routes.js";
import serviceWorkflowRoutes from "./src/server/routes/serviceWorkflow.routes.js";
import microComponentsRoutes from "./src/server/routes/microComponents.routes.js";
import apiV1Routes from "./src/server/routes/apiV1.routes.js";
import posRoutes from "./src/server/routes/pos.routes.js";
import accountingRoutes from "./src/server/routes/accounting.routes.js";
import purchasingRoutes from "./src/server/routes/purchasing.routes.js";
import complaintTemplateRoutes from "./src/server/routes/complaintTemplate.routes.js";
import monitoringRoutes from "./src/server/routes/monitoring.routes.js";
import superadminRoutes from "./src/server/routes/superadmin.routes.js";
import { telegramTestHandler } from "./src/server/controllers/telegram.controller.js"; // Keep for now
import { whatsappTestHandler } from "./src/server/controllers/whatsappTest.controller.js"; // Keep for now
import { publicTenantContextHandler } from "./src/server/controllers/publicTenant.controller.js";
import { tenantHostResolver } from "./src/middleware/tenantHost.middleware.js"; // Re-import
import billingRoutes from "./src/server/routes/billing.routes.js"; // Re-import

const runtimeMode = process.env.NODE_ENV || "development";
if (!["development", "production", "test"].includes(runtimeMode)) throw new Error(`Invalid NODE_ENV: ${runtimeMode}`);
const isProduction = runtimeMode === "production";
const runtimeProfile = process.env.FIXDEV_PROFILE;
if (runtimeProfile && runtimeProfile !== runtimeMode) {
  throw new Error(`FIXDEV_PROFILE=${runtimeProfile} does not match NODE_ENV=${runtimeMode}.`);
}
if (runtimeMode !== "test" && process.env.FIXDEV_DATABASE_NAME && process.env.DATABASE_URL) {
  try {
    const databaseName = new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "");
    if (databaseName !== process.env.FIXDEV_DATABASE_NAME) {
      throw new Error(`FIXDEV_DATABASE_NAME=${process.env.FIXDEV_DATABASE_NAME} does not match DATABASE_URL database.`);
    }
  } catch (error: any) {
    if (error instanceof TypeError) throw new Error("DATABASE_URL must be a valid URL.");
    throw error;
  }
}
const portValue = isProduction ? process.env.PORT || "3000" : process.env.DEV_PORT || "3001";
const PORT = Number(portValue);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error(`Invalid server port: ${portValue}`);
const appUrl = process.env.APP_URL || (isProduction ? "https://fixdev.web.id" : `http://localhost:${PORT}`);
const parsedAppUrl = new URL(appUrl);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || appUrl).split(",").map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
if (isProduction) {
  const required = ["DATABASE_URL", "JWT_SECRET", "ADMIN_TOKEN", "APP_URL", "ALLOWED_ORIGINS", "TENANT_ROOT_DOMAIN"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing production environment variables: ${missing.join(", ")}`);
  if (parsedAppUrl.protocol !== "https:") throw new Error("Production APP_URL must use HTTPS.");
  if (process.env.ALLOW_DEV_API_TOKENS === "true") throw new Error("ALLOW_DEV_API_TOKENS must be false in production.");
  const rootDomain = process.env.TENANT_ROOT_DOMAIN;
  const allowedList = (process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim());
  const cleaned = allowedList.map((origin) => new URL(origin).hostname).filter((host) => host !== "localhost");
  const isTenantHost = (host: string) => host === rootDomain || host.endsWith(`.${rootDomain}`);
  if (!cleaned.some(isTenantHost) || !cleaned.includes(parsedAppUrl.hostname)) throw new Error(`APP_URL host ${parsedAppUrl.hostname} is not allowed by ALLOWED_ORIGINS.`);
}

const app = express();
// Cloudflare Tunnel is the only public proxy hop. Trust its forwarded client IP
// so express-rate-limit keys requests by visitor instead of rejecting X-Forwarded-For.
app.set("trust proxy", 1);

// Security headers (helmet-light equivalent)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");  // Deprecated; modern browsers ignore it.
  if (isProduction) res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// Body parser with size & error handling
app.use(express.json({ limit: "10mb" }));
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn({ err: err.message }, "Invalid JSON body");
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  if (err.type === "entity.too.large") {
    logger.warn({ err: err.message }, "Request body too large");
    return res.status(413).json({ error: "Request body too large" });
  }
  next(err);
});

// ==========================================
// SECURITY: Manual CORS Configuration
// ==========================================
app.use((req, res, next) => {
  const origin = req.headers.origin?.replace(/\/$/, "");
  res.setHeader("Vary", "Origin");
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Tenant-ID,X-Branch-ID,X-SuperAdmin-Mode,X-SuperAdmin-Permissions,X-SuperAdmin-Session-Id,X-Impersonation-Session-Id,x-admin-token");
  if (req.method === "OPTIONS") return origin && !allowedOrigins.includes(origin) ? res.sendStatus(403) : res.sendStatus(204);
  next();
});

app.use(tenantHostResolver);

// ==========================================
// SECURITY: Rate Limiting
// ==========================================
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 1000),
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: (req) => req.path.startsWith("/monitoring/health"),
});

const adminBillingLimiter = rateLimit({
  windowMs: Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.ADMIN_RATE_LIMIT_MAX || 300),
  message: { error: "Too many admin/billing requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicApiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30, // 30 req/min for public tracking
  message: { error: "Terlalu banyak permintaan. Silakan tunggu 1 menit." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiRateLimiterMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const path = req.path;
  if (path.startsWith("/public/") || path.startsWith("/healthz")) {
    return next();
  }
  if (path.startsWith("/admin/") || path.startsWith("/billing/")) {
    return adminBillingLimiter(req, res, next);
  }
  if (path.startsWith("/monitoring/health")) {
    return next();
  }
  return apiLimiter(req, res, next);
};

app.use("/api/", apiRateLimiterMiddleware);

// Apply stricter rate limiting to sensitive public endpoints
app.use("/api/service-tracking", publicApiLimiter);
app.use("/api/invitations", publicApiLimiter); // This is general for auth.routes now

// Apply Multi-Tenant Audit Middleware
app.use(auditMiddleware);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/whatsapp", requireJwt, requireTenantScope, whatsappRoutes); // New: use whatsappRoutes
app.use("/api", systemRoutes); // New: use systemRoutes for shared system routes

app.get("/api/public/tenant-context", publicTenantContextHandler);

// Health check (Internal/Liveness) - moved to systemRoutes, but keep for legacy/direct
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Public health check for Load Balancers / External Monitoring - moved to systemRoutes, but keep for legacy/direct
app.get("/api/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Mounted Modular Routes (Secured)
app.use("/api/admin", requireJwt, requireTenantScope, auditRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/superadmin", superadminRoutes);

app.use("/api/tenant", requireJwt, requireTenantScope, tenantRoutes);
app.post("/api/tenant/telegram/test", requireJwt, requireTenantScope, requireSettingsDomain("notification"), telegramTestHandler);
app.post("/api/tenant/whatsapp/test", requireJwt, requireTenantScope, requireSettingsDomain("whatsapp"), whatsappTestHandler);
app.use("/api/service-receptions", serviceReceptionRoutes);
app.use("/api/services", serviceWorkflowRoutes);
app.use("/api/micro-components", microComponentsRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/accounting", requireJwt, requireTenantScope, requireFeature("ACCOUNTING"), accountingRoutes);
app.use("/api/purchasing", requireJwt, requireTenantScope, purchasingRoutes);
app.use("/api/complaint-templates", requireJwt, requireTenantScope, complaintTemplateRoutes);

// Public / Service routes
app.use("/api/service-tracking", serviceTrackerRoutes);
app.use("/api/v1", apiV1Routes);
app.use("/api/monitoring", requireJwt, requireSuperAdmin, monitoringRoutes);

// Generic CRUD API plugin (tenant-isolated, column-whitelisted)
app.use("/api/crud", createCrudRouter());

app.post("/api/database/test", requireAdminToken, databaseTestHandler);
app.post("/api/database/migrate", requireAdminToken, databaseMigrateHandler);

// API requests must never fall through to Vite's SPA HTML fallback.
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});


// ==========================================
// VITE OR STATIC ASSETS SERVING MIDDLEWARE
// ==========================================

async function startServer() {
  const isDev = runtimeMode === "development";
  const distPath = path.join(process.cwd(), "dist");

  // Create HTTP server first so we can share it with Vite's HMR WebSocket
  const httpServer = http.createServer(app);

  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    logger.info({ port: PORT }, "[Dev Server] Vite middleware active (HMR on)");
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api/")) {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
      }
    });
  }

  process.on("uncaughtException", (err) => {
    logger.error({ err: err.message, stack: err.stack }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled rejection");
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    httpServer.close(() => {
      logger.info("Server closed.");
      process.exit(0);
    });
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  });

  function listenWithRetry(attempt = 1) {
    httpServer.once("error", (err: any) => {
      if (err.code === "EADDRINUSE" && attempt < 5) {
        logger.warn({ port: PORT, attempt }, "Port in use, retrying in 2s…");
        httpServer.close();
        setTimeout(() => listenWithRetry(attempt + 1), 2000);
      } else {
        logger.error({ err: err.message }, "Fatal server error");
        process.exit(1);
      }
    });

    httpServer.listen(PORT, process.env.BIND_HOST || "127.0.0.1", () => {
      logger.info({ port: PORT, env: isDev ? "development" : "production" }, "[ERP SaaS Server] Started");
    });
  }

  listenWithRetry();
}

startServer();
