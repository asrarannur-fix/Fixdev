/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { logger } from "./src/lib/logger.js";
import { requireAdminToken, requireSuperAdmin, requireSupabaseJwt, requireTenantScope } from "./src/middleware/auth.middleware.js";
import { requireFeature } from "./src/middleware/feature.middleware.js";
import {
  bootstrapHandler,
  platformBootstrapHandler,
} from "./src/server/controllers/bootstrap.controller.js";
import {
  authProfileHandler,
  adminResetPasswordHandler,
  onboardingRegisterHandler,
  upgradeTrialHandler,
  extendTrialHandler,
} from "./src/server/controllers/auth.controller.js";
import {
  moduleRecordsGetHandler,
  moduleRecordsPostHandler,
  dataSyncHandler,
} from "./src/server/controllers/data.controller.js";
import {
  supabaseTestHandler,
  supabaseMigrateHandler,
} from "./src/server/controllers/supabase.controller.js";
import {
  whatsappGetLogsHandler,
  whatsappPostLogsHandler,
  whatsappGetQueueHandler,
  whatsappPostQueueHandler,
} from "./src/server/controllers/whatsapp.controller.js";
import { auditMiddleware } from "./src/server/controllers/audit.controller.js";
import auditRoutes from "./src/server/routes/audit.routes.js";
import billingRoutes from "./src/server/routes/billing.routes.js";
import aiRoutes from "./src/server/routes/ai.routes.js";
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
import { platformHealthHandler } from "./src/server/controllers/monitoring.controller.js";
import { acceptInvitation, validateInvitation } from "./src/server/controllers/invitation.controller.js";
import { telegramTestHandler } from "./src/server/controllers/telegram.controller.js";
import { whatsappTestHandler } from "./src/server/controllers/whatsappTest.controller.js";
import { qzPublicCertHandler, qzSignHandler } from "./src/server/controllers/qz.controller.js";
import { qzCertDownloadHandler, qzInstallerBatHandler } from "./src/server/controllers/qzinstaller.controller.js";

dotenv.config();

const app = express();
// Cloudflare Tunnel is the only public proxy hop. Trust its forwarded client IP
// so express-rate-limit keys requests by visitor instead of rejecting X-Forwarded-For.
app.set("trust proxy", 1);

// Security headers (helmet-light equivalent)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");  // Deprecated; modern browsers ignore it.
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
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

const PORT = Number(process.env.PORT || 3000);

// ==========================================
// SECURITY: Manual CORS Configuration
// ==========================================
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",") 
    : [process.env.APP_URL || "https://fixdev.web.id"];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Tenant-ID,X-Branch-ID,X-SuperAdmin-Mode,X-SuperAdmin-Permissions,x-supabase-admin-token");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

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

// Apply rate limiting
app.use("/api/", (req, res, next) => {
  const path = req.path;
  if (path.startsWith("/admin/") || path.startsWith("/billing/")) {
    return adminBillingLimiter(req, res, next);
  }
  if (path.startsWith("/monitoring/health")) {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Apply Multi-Tenant Audit Middleware
app.use(auditMiddleware);

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/supabase/env-status", (req, res) => {
  // Public client needs only its public project URL and readiness state.
  // Never expose server credential or database topology metadata.
  const url = process.env.VITE_SUPABASE_URL || "";
  const isConfigured = Boolean(url && process.env.VITE_SUPABASE_ANON_KEY);
  res.json({ url, hasAnonKey: isConfigured, hasDbUrl: Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY) });
});

const requireSupabaseAdmin = requireAdminToken;

app.post("/api/admin/auth/reset-password", requireSupabaseAdmin, adminResetPasswordHandler);

app.get("/api/whatsapp/logs", requireSupabaseJwt, requireTenantScope, whatsappGetLogsHandler);
app.post("/api/whatsapp/logs", requireSupabaseJwt, requireTenantScope, whatsappPostLogsHandler);
app.get("/api/whatsapp/queue", requireSupabaseJwt, requireTenantScope, whatsappGetQueueHandler);
app.post("/api/whatsapp/queue", requireSupabaseJwt, requireTenantScope, whatsappPostQueueHandler);

app.get("/api/auth/profile", requireSupabaseJwt, authProfileHandler);

app.get("/api/platform/bootstrap", requireSupabaseJwt, requireSuperAdmin, platformBootstrapHandler);
app.get("/api/platform/health", requireSupabaseJwt, requireSuperAdmin, platformHealthHandler);
app.get("/api/bootstrap", requireSupabaseJwt, requireTenantScope, bootstrapHandler);
app.get("/api/module-records", requireSupabaseJwt, requireTenantScope, moduleRecordsGetHandler);
app.post("/api/module-records", requireSupabaseJwt, requireTenantScope, moduleRecordsPostHandler);

app.post("/api/data/sync", requireSupabaseJwt, requireTenantScope, dataSyncHandler);
app.get("/api/qz/certificate", qzPublicCertHandler);
app.get("/api/qz/certificate/download", qzCertDownloadHandler);
app.get("/api/qz/installer.bat", qzInstallerBatHandler);
app.post("/api/qz/sign", requireSupabaseJwt, requireTenantScope, qzSignHandler);

app.post("/api/onboarding/register", onboardingRegisterHandler);
app.get("/api/invitations/validate", validateInvitation);
app.post("/api/invitations/accept", acceptInvitation);
app.post("/api/onboarding/upgrade-trial", requireSupabaseJwt, requireTenantScope, upgradeTrialHandler);
app.post("/api/onboarding/extend-trial", requireSupabaseJwt, requireTenantScope, extendTrialHandler);

// Mounted Modular Routes (Secured)
app.use("/api/admin", requireSupabaseJwt, requireTenantScope, auditRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/ai", requireSupabaseJwt, requireTenantScope, requireFeature("AI_DIAGNOSE"), aiRoutes);
app.use("/api/tenant", requireSupabaseJwt, requireTenantScope, tenantRoutes);
app.post("/api/tenant/telegram/test", requireSupabaseJwt, requireTenantScope, telegramTestHandler);
app.post("/api/tenant/whatsapp/test", requireSupabaseJwt, requireTenantScope, whatsappTestHandler);
app.use("/api/service-receptions", serviceReceptionRoutes);
app.use("/api/services", serviceWorkflowRoutes);
app.use("/api/micro-components", microComponentsRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/accounting", requireSupabaseJwt, requireTenantScope, requireFeature("ACCOUNTING"), accountingRoutes);
app.use("/api/purchasing", requireSupabaseJwt, requireTenantScope, purchasingRoutes);
app.use("/api/complaint-templates", requireSupabaseJwt, requireTenantScope, complaintTemplateRoutes);

// Public / Service routes
app.use("/api/service-tracking", serviceTrackerRoutes);
app.use("/api/v1", apiV1Routes);
app.use("/api/monitoring", monitoringRoutes);

// Generic CRUD API plugin (tenant-isolated, column-whitelisted)
app.use("/api/crud", createCrudRouter());

app.post("/api/supabase/test", requireSupabaseAdmin, supabaseTestHandler);
app.post("/api/supabase/migrate", requireSupabaseAdmin, supabaseMigrateHandler);

// API requests must never fall through to Vite's SPA HTML fallback.
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});


// ==========================================
// VITE OR STATIC ASSETS SERVING MIDDLEWARE
// ==========================================

async function startServer() {
  // Production only: Serve built static files
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(distPath, "index.html"));
    } else {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
    }
  });

  // Global uncaught exception / rejection handlers
  process.on("uncaughtException", (err) => {
    logger.error({ err: err.message, stack: err.stack }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled rejection");
  });

  function listenWithRetry(attempt = 1) {
    const server = app.listen(PORT, "0.0.0.0");

    // Graceful shutdown handler - defined after server variable
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      server.close(() => {
        logger.info("Server closed.");
        process.exit(0);
      });
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE" && attempt < 5) {
        logger.warn({ port: PORT, attempt }, "Port in use, retrying in 2s…");
        server.close();
        setTimeout(() => listenWithRetry(attempt + 1), 2000);
      } else {
        logger.error({ err: err.message }, "Fatal server error");
        process.exit(1); // Let PM2 restart us
      }
    });
    server.on("listening", () => {
      logger.info({ port: PORT, env: "production" }, "[ERP SaaS Server] Started");
    });
  }

  listenWithRetry();
}

startServer();
