import express from "express";
import {
  requireRoles,
  requireSuperAdmin,
  requireSuperAdminConsoleSession,
  requireTenantOrSuperAdminPermission,
  requireSupabaseJwt,
} from "../../middleware/auth.middleware";
import {
  approveManualPayment,
  createManualProofUpload,
  createManualQrisUpload,
  getManualPaymentConfig,
  updateManualPaymentConfig,
  getManualProofUrl,
  listManualPayments,
  rejectManualPayment,
  submitManualPayment,
} from "../controllers/manualPayment.controller";
import {
  getBillingPlans,
  updateBillingPlans,
  getSubscription,
  createInvoice,
  toggleRenew,
  simulateRecurringCron,
  getGatewayConfig,
  updateGatewayConfig,
  notifyDueReminders,
  notifyOverdueAlerts,
  sendPaymentConfirmation,
  handleMidtransWebhook,
} from "../controllers/billing.controller";

const router = express.Router();

// Public: called directly by Midtrans servers (no user session available).
// Authenticity is verified inside the handler via HMAC signature check.
router.post("/midtrans-webhook", handleMidtransWebhook);

// Everything else requires an authenticated Supabase session.
router.use(requireSupabaseJwt);

router.get("/plans", getBillingPlans);
router.post("/plans", requireSuperAdmin, requireSuperAdminConsoleSession, updateBillingPlans);
router.get("/subscription", requireTenantOrSuperAdminPermission("billing:view"), getSubscription);
router.post("/create-invoice", requireTenantOrSuperAdminPermission("billing:approve"), requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), createInvoice);
router.post("/pay-invoice", (_req, res) => res.status(410).json({
  error: "Direct payment confirmation has been removed. Use a verified Midtrans payment or manual payment review.",
}));
router.post("/toggle-renew", requireTenantOrSuperAdminPermission("billing:approve"), requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"), toggleRenew);
router.post("/simulate-recurring-cron", requireSuperAdmin, requireSuperAdminConsoleSession, simulateRecurringCron);
router.post("/notify-due-reminders", requireSuperAdmin, requireSuperAdminConsoleSession, notifyDueReminders);
router.post("/notify-overdue-alerts", requireSuperAdmin, requireSuperAdminConsoleSession, notifyOverdueAlerts);
router.post("/notify-payment-confirmation", requireSuperAdmin, requireSuperAdminConsoleSession, sendPaymentConfirmation);
router.get("/gateway-config", requireSuperAdmin, getGatewayConfig);
router.post("/gateway-config", requireSuperAdmin, requireSuperAdminConsoleSession, updateGatewayConfig);
router.get("/manual-payment-config", getManualPaymentConfig);
router.post("/manual-payment-config/qris-upload", requireSuperAdmin, requireSuperAdminConsoleSession, createManualQrisUpload);
router.put("/manual-payment-config", requireSuperAdmin, requireSuperAdminConsoleSession, updateManualPaymentConfig);
router.get("/manual-payments", listManualPayments);
router.post(
  "/invoices/:invoiceId/manual-payments/upload-url",
  requireTenantOrSuperAdminPermission("billing:approve"),
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  createManualProofUpload,
);
router.post(
  "/invoices/:invoiceId/manual-payments",
  requireTenantOrSuperAdminPermission("billing:approve"),
  requireRoles("OWNER", "ADMIN", "SUPER_ADMIN"),
  submitManualPayment,
);
router.get("/manual-payments/:id/proof-url", getManualProofUrl);
router.post("/manual-payments/:id/approve", requireSuperAdmin, requireSuperAdminConsoleSession, approveManualPayment);
router.post("/manual-payments/:id/reject", requireSuperAdmin, requireSuperAdminConsoleSession, rejectManualPayment);

export default router;
