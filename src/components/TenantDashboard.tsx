import React, { useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { X, Wrench } from "lucide-react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { PaymentMethod } from "../types";
import { usePrintConfig } from "../hooks/usePrintConfig";
import { printFrame } from "../utils/printJob";
import {
  getPrintBaseCss,
  getPrintHeaderHtml,
  getPrintFooterHtml,
  getPrintTermsHtml,
} from "../utils/print";

// Lazy loading all tenant module components
const ServicesTab = React.lazy(() =>
  import("./tenant/ServicesTab").then((m) => ({ default: m.ServicesTab }))
);
const POSTab = React.lazy(() =>
  import("./tenant/POSTab").then((m) => ({ default: m.POSTab }))
);
const InventoryTab = React.lazy(() =>
  import("./tenant/InventoryTab").then((m) => ({ default: m.InventoryTab }))
);
const AccountingTab = React.lazy(() =>
  import("./tenant/AccountingTab").then((m) => ({ default: m.AccountingTab }))
);
const HRTab = React.lazy(() =>
  import("./tenant/HRTab").then((m) => ({ default: m.HRTab }))
);
const CRMTab = React.lazy(() =>
  import("./tenant/CRMTab").then((m) => ({ default: m.CRMTab }))
);
const SettingsTab = React.lazy(() =>
  import("./tenant/SettingsTab").then((m) => ({ default: m.SettingsTab }))
);
const FraudTab = React.lazy(() =>
  import("./tenant/FraudTab").then((m) => ({ default: m.FraudTab }))
);
const CustomerApprovalPanel = React.lazy(() =>
  import("./tenant/CustomerApprovalPanel").then((m) => ({ default: m.CustomerApprovalPanel }))
);
const WarrantyClaims = React.lazy(() =>
  import("./tenant/WarrantyClaims").then((m) => ({ default: m.WarrantyClaims }))
);
const OwnerReports = React.lazy(() =>
  import("./tenant/OwnerReports").then((m) => ({ default: m.OwnerReports }))
);
const TechnicianOverview = React.lazy(() =>
  import("./TechnicianOverview").then((m) => ({ default: m.TechnicianOverview }))
);
const SystemBackup = React.lazy(() =>
  import("./tenant/SystemBackup").then((m) => ({ default: m.SystemBackup }))
);
const DataExplorer = React.lazy(() =>
  import("./tenant/DataExplorer").then((m) => ({ default: m.DataExplorer }))
);

interface TenantDashboardProps {
  activeTab: string;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onSetTab?: (tab: string, subTab?: string) => void;
  navigationMode?: string;
}

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">Memuat Modul ERP...</p>
  </div>
);

export const TenantDashboard = ({
  activeTab,
  activeSubTab,
  setActiveSubTab,
  onSetTab,
  navigationMode,
}) => {
  const {
    currentTenantId,
    currentBranchId,
    products,
    warehouses,
    branches,
    currentUser,
    addInventoryProduct,
    updateInventoryProduct,
    createInventoryTransfer,
    updateInventoryTransferStatus,
    createPOSTransaction,
    transactions,
    openShift,
    closeShift,
    refundTransaction,
    customers,
    tenants,
  } = useSaaS();
  const { showToast } = useToast();
  const printConfig = usePrintConfig();
  const activeTenant = tenants.find((tenant) => tenant.id === currentTenantId);
  const tenantName = activeTenant?.name || "Toko";
  const tenantLogoUrl = activeTenant?.branding?.logoUrl;

  const tenantProducts = products.filter((p) => p.tenantId === currentTenantId);
  const tenantWhs = warehouses.filter((w) => w.tenantId === currentTenantId);
  // Sum warehouseStock for warehouses belonging to current branch
  const branchStock = (p: any) => {
    if (!currentBranchId || !p.warehouseStock) return p.stockQty ?? 0;
    const branchWhIds = tenantWhs
      .filter((w) => w.branchId === currentBranchId)
      .map((w) => w.id);
    if (branchWhIds.length === 0) return p.stockQty ?? 0;
    return branchWhIds.reduce((sum, whId) => sum + (Number(p.warehouseStock[whId]) || 0), 0);
  };

  // POS State
  const [posCart, setPosCart] = useState<{ product: any; qty: number; discount: number }[]>([]);
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [posAmountPaid, setPosAmountPaid] = useState("");
  const [depositUsed, setDepositUsed] = useState(0);
  const [selectedPosCust, setSelectedPosCust] = useState("");
  const [shiftStartCash, setShiftStartCash] = useState("");
  const [shiftEndCash, setShiftEndCash] = useState("");
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);

  const handlePOSCheckout = React.useCallback(async (details: string = "") => {
    if (posCart.length === 0) { showToast("Keranjang kosong!", "error"); return; }
    if (!selectedPosCust) { showToast("Pilih customer!", "error"); return; }
    try {
      const newTx = await createPOSTransaction(selectedPosCust, posCart, posPaymentMethod, Number(posAmountPaid) || 0, depositUsed, details);
      if (newTx && details) {
        newTx.paymentDetails = details;
        try {
          const parsed = JSON.parse(details);
          newTx.notes = `Split: ${posPaymentMethod} (Rp ${(Number(posAmountPaid) || 0).toLocaleString()}) + ${parsed.splitMethod} (Rp ${(parsed.splitNominal || 0).toLocaleString()})`;
        } catch (_) {}
      }
      setPosCart([]);
      setPosAmountPaid("");
      setSelectedPosCust("");
      showToast(`Transaksi berhasil! No: ${newTx?.invoiceNo || "-"}`, "success");
      // Auto-print receipt
      if (newTx) handlePrintPOSReceipt(newTx as any);
    } catch (e: any) {
      showToast(e.message || "Gagal checkout", "error");
    }
  }, [posCart, selectedPosCust, posPaymentMethod, posAmountPaid, depositUsed, createPOSTransaction]);

  const handlePrintPOSReceipt = React.useCallback((tx: any) => {
    const branchName = branches.find(b => b.id === currentBranchId)?.name || "";
    const cust = customers.find(c => c.id === tx.customerId);
    const win = window.open("", "_blank");
    if (!win) { showToast("Popup diblokir! Izinkan popup untuk cetak.", "error"); return; }
    const escapeHtml = (value: string) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
    const safeBranchName = escapeHtml(branchName);
    const safeInvoiceNo = escapeHtml(tx.invoiceNo || "-");
    const safeCustomerName = escapeHtml(cust?.name || "Walk-in");
    const safePaymentMethod = escapeHtml(tx.paymentMethod || "CASH");
    const headerHtml = getPrintHeaderHtml(printConfig, {
      businessName: tenantName,
      subtitle: "STRUK TRANSAKSI POS",
      logoUrl: tenantLogoUrl,
    });
    const footerHtml = getPrintFooterHtml(printConfig, "Terima kasih telah berbelanja di " + tenantName);
    const termsHtml = getPrintTermsHtml(printConfig, "sales");
    win.document.write(`
      <html><head><title>Struk POS - ${safeInvoiceNo}</title>
      <style>
        ${getPrintBaseCss(printConfig)}
        .line { border-top: 1px dashed #999; margin: 8px 0; }
        .right { text-align: right; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
      </style></head><body>
      ${headerHtml}
      <p><strong>No:</strong> ${safeInvoiceNo}</p>
      <p><strong>Cabang:</strong> ${safeBranchName}</p>
      <p><strong>Tanggal:</strong> ${new Date(tx.timestamp || Date.now()).toLocaleString("id-ID")}</p>
      <p><strong>Pelanggan:</strong> ${safeCustomerName}</p>
      <div class="line"></div>
      <table style="width:100%;border-collapse:collapse;">${(tx.items || []).map((i: any) => `<tr><td>${escapeHtml(i.name)}</td><td class="right">${i.quantity}x</td><td class="right">Rp ${(i.total || 0).toLocaleString()}</td></tr>`).join("")}</table>
      <div class="line"></div>
      <table style="width:100%;border-collapse:collapse;"><tr><td class="bold">Total</td><td class="right bold">Rp ${(tx.grandTotal || 0).toLocaleString()}</td></tr></table>
      <p class="center">Bayar: Rp ${(tx.amountPaid || 0).toLocaleString()} | Kembali: Rp ${(tx.changeAmount || 0).toLocaleString()}</p>
      <p class="center">Metode: ${safePaymentMethod}</p>
      ${footerHtml}
      ${termsHtml}
      </body></html>
    `);
    win.document.close();
    printFrame({ contentWindow: win } as unknown as HTMLIFrameElement, printConfig, "POS Receipt");
  }, [branches, currentBranchId, customers, printConfig, showToast]);

  // Auto-send WhatsApp notification on stock shortage events
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.category !== "stock") return;
      const waCfg = (tenants.find((t: any) => t.id === currentTenantId))?.settings?.waConfig as any;
      const phone = waCfg?.adminPhone || "6281245762330"; // fallback owner
      if (!phone) return;
      const msg = `⚠️ *PERINGATAN STOK KRITIS* ⚠️\n\n${detail.message || ""}\n\nCabang: ${branches.find((b: any) => b.id === currentBranchId)?.name || "N/A"}\n\n_Mohon segera lakukan restock._`;
      const sendingMethod = waCfg?.sendingMethod || "MANUAL";
      if (sendingMethod === "MANUAL") {
        const digits = String(phone).replace(/\D/g, "");
        const waPhone = digits.startsWith("62")
          ? digits
          : digits.startsWith("0")
            ? `62${digits.slice(1)}`
            : digits.startsWith("8")
              ? `62${digits}`
              : digits;
        if (waPhone) window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`, "_blank");
        return;
      }

      // API mode is intentionally not simulated through a nonexistent webhook.
      // The configured API connector owns automatic delivery and its own credentials.
    };
    window.addEventListener("live_notification", handler);
    return () => window.removeEventListener("live_notification", handler);
  }, [currentTenantId, currentBranchId, branches, tenants]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100">
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === "overview" && (
          <OwnerReports
            activeSubTab={activeSubTab}
            onSetTab={(tab, subTab) => {
              if (onSetTab) onSetTab(tab, subTab);
              else setActiveSubTab(subTab || activeSubTab);
            }}
          />
        )}
        {activeTab === "services" && (
          <ServicesTab
            activeSubTab={activeSubTab}
            currentTenantId={currentTenantId}
            onSetTab={(tab, sub) => onSetTab ? onSetTab(tab, sub) : setActiveSubTab(sub)}
          />
        )}
        {activeTab === "pos" && (
          <POSTab
            activeSubTab={activeSubTab}
            tenantProducts={tenantProducts}
            getBranchStock={branchStock}
            currentTenantId={currentTenantId}
            posCart={posCart}
            addToCart={(p: any) => {
              setPosCart((prev) => {
                const ex = prev.find((i) => i.product.id === p.id);
                return ex
                  ? prev.map((i) => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i)
                  : [...prev, { product: p, qty: 1, discount: 0 }];
              });
            }}
            posPaymentMethod={posPaymentMethod}
            setPosPaymentMethod={setPosPaymentMethod}
            posAmountPaid={posAmountPaid}
            setPosAmountPaid={setPosAmountPaid}
            depositUsed={depositUsed}
            handlePOSCheckout={handlePOSCheckout}
            transactions={transactions}
            customers={customers.filter((c) => c.tenantId === currentTenantId)}
            selectedPosCust={selectedPosCust}
            setSelectedPosCust={setSelectedPosCust}
            shiftStartCash={shiftStartCash}
            setShiftStartCash={setShiftStartCash}
            shiftEndCash={shiftEndCash}
            setShiftEndCash={setShiftEndCash}
            openShift={async (startCash: number) => {
              await openShift(startCash);
              showToast("Shift kasir dibuka!", "success");
            }}
            closeShift={async (endCash: number, reason?: string) => {
              await closeShift(endCash, reason || "");
              showToast("Shift ditutup!", "success");
            }}
            currentUser={currentUser}
            currentUserPermissions={currentUser.permissions}
            refundTransaction={async (txId: string, reason: string) => {
              await refundTransaction(txId, reason);
              showToast("Transaksi dibatalkan!", "success");
            }}
            handlePrintPOSReceipt={handlePrintPOSReceipt}
          />
        )}
        {activeTab === "inventory" && (
          <InventoryTab
            activeSubTab={activeSubTab}
            tenantProducts={tenantProducts}
            warehouses={tenantWhs}
            currentTenantId={currentTenantId}
            getBranchStock={branchStock}
            addInventoryProduct={addInventoryProduct}
            updateInventoryProduct={updateInventoryProduct}
            createInventoryTransfer={createInventoryTransfer}
            updateInventoryTransferStatus={updateInventoryTransferStatus}
            tenantWhs={tenantWhs}
            currentBranchId={currentBranchId}
          />
        )}
        {activeTab === "accounting" && (
          <AccountingTab activeSubTab={activeSubTab} />
        )}
        {activeTab === "hr" && (
          <HRTab activeSubTab={activeSubTab} />
        )}
        {activeTab === "crm" && (
          <CRMTab activeSubTab={activeSubTab} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            activeSubTab={activeSubTab}
            currentTenantId={currentTenantId}
            setActiveSubTab={setActiveSubTab}
          />
        )}
        {activeTab === "fraud" && (
          <FraudTab
            activeSubTab={activeSubTab}
          />
        )}
        {activeTab === "data-explorer" && (
          <DataExplorer
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
          />
        )}
        {activeTab === "customer-approval" && (
          <CustomerApprovalPanel />
        )}
        {activeTab === "warranty-claims" && (
          <WarrantyClaims />
        )}
        {activeTab === "owner-reports" && (
          <OwnerReports
            activeSubTab={activeSubTab}
            onSetTab={(tab, subTab) => {
              if (onSetTab) onSetTab(tab, subTab);
              else setActiveSubTab(subTab || activeSubTab);
            }}
          />
        )}
        {activeTab === "system-backup" && (
          <SystemBackup />
        )}
        {showTechnicianModal && createPortal(
          <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowTechnicianModal(false)}>
            <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-zinc-800 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white dark:bg-zinc-950 z-10 flex justify-between items-center p-4 border-b border-slate-200 dark:border-zinc-800">
                <button onClick={() => setShowTechnicianModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4"><TechnicianOverview /></div>
            </div>
          </div>,
          document.body
        )}
      </Suspense>

      {/* Floating Technician Button */}
      <button
        onClick={() => setShowTechnicianModal(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-accent hover:bg-accent-hover text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer"
        title="Dashboard Teknisi"
      >
        <Wrench className="w-5 h-5" />
      </button>
    </div>
  );
};
