import express from "express";
import {
  requireRoles,
  requireSuperAdminConsoleSession,
  requireSuperAdminPermission,
  requireTenantOrSuperAdminPermission,
  requireJwt,
  requireTenantScope,
} from "../../middleware/auth.middleware.js";
import {
  approveManualPayment,
  createManualProofUpload,
  createManualQrisUpload,
  uploadManualQris,
  uploadManualProof,
  getManualPaymentConfig,
  updateManualPaymentConfig,
  getManualProofUrl,
  listManualPayments,
  rejectManualPayment,
  submitManualPayment,
  streamManualProof,
} from "../controllers/manualPayment.controller.js";
import {
  getBillingPlans,
  getPublicBillingPlans,
  updateBillingPlans,
  getSubscription,
  createInvoice,
  toggleRenew,
  simulateRecurringCron,
  simulateTrialExpiryCron,
  getGatewayConfig,
  updateGatewayConfig,
  notifyDueReminders,
  notifyOverdueAlerts,
  sendPaymentConfirmation,
  handleMidtransWebhook,
} from "../controllers/billing.controller.js";

const router = express.Router();

// Public: called directly by Midtrans servers (no user session available).
// Authenticity is verified inside the handler via HMAC signature check.
router.post("/midtrans-webhook", handleMidtransWebhook);
router.get("/public-plans", getPublicBillingPlans);

// Everything else requires an authenticated session.
router.use(requireJwt);

router.get("/plans", requireTenantOrSuperAdminPermission("billing:view_plans", true), getBillingPlans);
router.post("/plans", requireSuperAdminPermission("billing:manage_plans"), requireSuperAdminConsoleSession, updateBillingPlans);
router.get("/subscription", requireTenantOrSuperAdminPermission("billing:view_subscription"), getSubscription);
router.post("/create-invoice", requireTenantOrSuperAdminPermission("billing:manage_invoices"), requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), requireSuperAdminConsoleSession, createInvoice);
router.post("/pay-invoice", (_req, res) => res.status(410).json({
  error: "Direct payment confirmation has been removed. Use a verified Midtrans payment or manual payment review.",
}));
router.post("/toggle-renew", requireTenantOrSuperAdminPermission("billing:manage_subscription"), requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), requireSuperAdminConsoleSession, toggleRenew);
router.post("/simulate-recurring-cron", requireSuperAdminPermission("operations:run_cron"), requireSuperAdminConsoleSession, simulateRecurringCron);
router.post("/simulate-trial-expiry", requireSuperAdminPermission("operations:run_cron"), requireSuperAdminConsoleSession, simulateTrialExpiryCron);
router.post("/notify-due-reminders", requireSuperAdminPermission("operations:run_cron"), requireSuperAdminConsoleSession, notifyDueReminders);
router.post("/notify-overdue-alerts", requireSuperAdminPermission("operations:run_cron"), requireSuperAdminConsoleSession, notifyOverdueAlerts);
router.post("/notify-payment-confirmation", requireTenantOrSuperAdminPermission("operations:run_cron"), requireSuperAdminConsoleSession, sendPaymentConfirmation);
router.get("/gateway-config", requireSuperAdminPermission("billing:view_config"), getGatewayConfig);
router.post("/gateway-config", requireSuperAdminPermission("billing:manage_config"), requireSuperAdminConsoleSession, updateGatewayConfig);
router.get("/manual-payment-config", requireTenantOrSuperAdminPermission("billing:view_config", true), getManualPaymentConfig);
router.post("/manual-payment-config/qris-upload", requireSuperAdminPermission("billing:manage_config"), requireSuperAdminConsoleSession, createManualQrisUpload);
router.put("/manual-payment-config/qris-upload/:fileName", requireSuperAdminPermission("billing:manage_config"), requireSuperAdminConsoleSession, express.raw({ type: ["image/jpeg", "image/png"], limit: "2mb" }), uploadManualQris);
router.put("/manual-payment-config", requireSuperAdminPermission("billing:manage_config"), requireSuperAdminConsoleSession, updateManualPaymentConfig);
router.get("/manual-payments", requireTenantOrSuperAdminPermission("billing:view_manual_payments", true), listManualPayments);
router.post(
  "/invoices/:invoiceId/manual-payments/upload-url",
  requireTenantOrSuperAdminPermission("billing:manage_manual_payments"),
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  requireSuperAdminConsoleSession,
  createManualProofUpload,
);
router.put(
  "/invoices/:invoiceId/manual-payments/uploads/:fileName",
  requireTenantOrSuperAdminPermission("billing:manage_manual_payments"),
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  requireSuperAdminConsoleSession,
  express.raw({ type: ["image/jpeg", "image/png", "application/pdf"], limit: "5mb" }),
  uploadManualProof,
);
router.post(
  "/invoices/:invoiceId/manual-payments",
  requireTenantOrSuperAdminPermission("billing:manage_manual_payments"),
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  requireSuperAdminConsoleSession,
  submitManualPayment,
);
router.get("/manual-payments/:id/proof-url", requireTenantOrSuperAdminPermission("billing:view_manual_payments", true), getManualProofUrl);
router.get("/manual-payments/:id/proof", requireTenantOrSuperAdminPermission("billing:view_manual_payments", true), streamManualProof);
router.post("/manual-payments/:id/approve", requireSuperAdminPermission("billing:manage_manual_payments"), requireSuperAdminConsoleSession, approveManualPayment);
router.post("/manual-payments/:id/reject", requireSuperAdminPermission("billing:manage_manual_payments"), requireSuperAdminConsoleSession, rejectManualPayment);

export default router;
