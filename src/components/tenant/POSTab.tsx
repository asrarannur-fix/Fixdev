import * as React from "react";
import { useState } from "react";
declare global { interface Window { __splitPaymentDetails?: string } }
import {
  Barcode,
  Lock,
  CheckCircle2,
  History,
  X,
  Printer,
  Store,
  DollarSign,
} from "lucide-react";
import {
  InventoryProduct,
  PaymentMethod,
  Customer,
  POSTransaction,
  POSShift,
  UserRole,
} from "../../types";
import { MarketplaceHub } from "../MarketplaceHub";
import { useToast } from "../ui/Toast";
import { useSaaS } from "../../context/SaaSContext";

interface POSTabProps {
  activeSubTab: string;
  tenantProducts?: InventoryProduct[];
  getBranchStock?: (p: InventoryProduct) => number;
  addToCart?: (p: InventoryProduct) => void;
  posCart?: { product: InventoryProduct; qty: number; discount: number }[];
  posPaymentMethod?: PaymentMethod;
  setPosPaymentMethod?: (m: PaymentMethod) => void;
  posAmountPaid?: string;
  setPosAmountPaid?: (v: string) => void;
  depositUsed?: number;
  handlePOSCheckout?: (paymentDetails?: string) => void;
  customers?: Customer[];
  selectedPosCust?: string;
  setSelectedPosCust?: (id: string) => void;
  activeShift?: POSShift | null;
  shiftStartCash?: string;
  setShiftStartCash?: (v: string) => void;
  shiftEndCash?: string;
  setShiftEndCash?: (v: string) => void;
  openShift?: (startCash: number) => Promise<any>;
  closeShift?: (endCash: number, reason?: string) => Promise<any>;
  transactions?: POSTransaction[];
  currentTenantId?: string;
  refundTransaction?: (txId: string, reason: string) => Promise<any>;
  handlePrintPOSReceipt?: (tx: POSTransaction) => void;
  currentUser?: { role: UserRole; name: string };
  currentUserPermissions?: string[];
  createPOSTransaction?: any;
}

export const POSTab: React.FC<POSTabProps> = ({
  activeSubTab,
  tenantProducts = [],
  getBranchStock,
  addToCart,
  posCart = [],
  posPaymentMethod,
  setPosPaymentMethod,
  posAmountPaid,
  setPosAmountPaid,
  depositUsed,
  handlePOSCheckout,
  customers = [],
  selectedPosCust,
  setSelectedPosCust,
  activeShift,
  shiftStartCash,
  setShiftStartCash,
  shiftEndCash,
  setShiftEndCash,
  openShift,
  closeShift,
  transactions = [],
  currentTenantId,
  refundTransaction,
  handlePrintPOSReceipt,
  currentUser,
  currentUserPermissions,
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [refundReasonText, setRefundReasonText] = useState("");
  const [barcodeScan, setBarcodeScan] = useState("");
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitPaymentMethod, setSplitPaymentMethod] = useState<PaymentMethod>(PaymentMethod.QRIS);
  const [splitAmount, setSplitAmount] = useState("");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const { showToast } = useToast();
  const { currentTenantId: contextTenantId, currentUser: contextCurrentUser, products: ctxProducts, tenants, apiFetch } = useSaaS();
  const canViewInvoice = currentUser?.role === UserRole.OWNER || currentUserPermissions?.includes("action-pos-invoice-view");
  const canVoidTransaction = currentUser?.role === UserRole.OWNER || currentUserPermissions?.includes("action-pos-void-approve");

  // ponytail: Internal fallback when parent doesn't pass cart props.
  // Upgrade to full useReducer when checkout flow is centralized.
  const [internalCart, setInternalCart] = useState<{ product: InventoryProduct; qty: number; discount: number }[]>([]);
  const [internalDeposit, setInternalDeposit] = useState(0);
  const internalTenantProducts = React.useMemo(
    () => ctxProducts.filter((p: any) => p.tenantId === contextTenantId),
    [ctxProducts, contextTenantId],
  );

  const effectiveProducts = tenantProducts ?? internalTenantProducts;
  const effectiveCart = posCart ?? internalCart;
  const effectiveDeposit = depositUsed || internalDeposit;

  const effectiveAddToCart = addToCart ?? ((p: InventoryProduct) => {
    setInternalCart((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product: p, qty: 1, discount: 0 }];
    });
  });

  const effectiveHandleCheckout = React.useCallback(() => {
    if (!handlePOSCheckout) {
      showToast("Fungsi checkout tidak tersedia.", "error");
      return;
    }
    const details = splitEnabled && splitAmount
      ? JSON.stringify({ splitMethod: splitPaymentMethod, splitNominal: Number(splitAmount) || 0 })
      : "";
    handlePOSCheckout(details);
    setSplitEnabled(false);
    setSplitAmount("");
  }, [handlePOSCheckout, splitEnabled, splitPaymentMethod, splitAmount]);

  const effectiveGetBranchStock = getBranchStock ?? (() => 10);

  const subtotal = effectiveCart.reduce(
    (sum, item) => sum + (item.product.sellPrice || 0) * item.qty,
    0,
  );
  const discountAmount = effectiveCart.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const activePOS = tenants.find((t: any) => t.id === (currentTenantId || contextTenantId));
  const taxRatePct = activePOS?.settings?.taxRate ?? 11;
  const [heldCarts, setHeldCarts] = useState<any[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    apiFetch("/api/module-records?module=pos_held_carts")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Held carts HTTP ${r.status}`);
        const body = await r.json();
        const rows = Array.isArray(body) ? body : body.data || body.items || [];
        const loaded = rows.map((row: any) => row.payload || row).filter((x: any) => x.tenantId === contextTenantId);
        if (!cancelled) setHeldCarts(loaded);
      })
      .catch((e: any) => showToast(e.message || "Held cart gagal dimuat.", "error"));
    return () => { cancelled = true; };
  }, [apiFetch, contextTenantId, showToast]);

  const persistHeldCart = async (cart: any, action: "insert" | "update" | "delete") => {
    const r = await apiFetch("/api/module-records", { method: "POST", body: JSON.stringify({ module: "pos_held_carts", recordId: cart.id, payload: cart, action }) });
    if (!r.ok) throw new Error(`Held cart sync HTTP ${r.status}`);
  };


  const taxAmount = Math.max(0, (subtotal - discountAmount) * (taxRatePct / 100));
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount - effectiveDeposit);

  const handleHoldSale = async () => {
    if (effectiveCart.length === 0) {
      showToast("Tidak ada item di keranjang untuk ditahan.", "warning");
      return;
    }
    try {
      const newHeld = {
        id: Date.now().toString(),
        cart: effectiveCart,
        deposit: effectiveDeposit,
        timestamp: new Date().toISOString(),
      };
      await persistHeldCart(newHeld, "insert");
      const updated = [...heldCarts, newHeld];
      setHeldCarts(updated);
      // Clear current cart/deposit
      if (posCart) {
        // Parent cart: rely on parent handler to clear (or clear local state if fallback)
        setInternalCart([]);
        setInternalDeposit(0);
      } else {
        setInternalCart([]);
        setInternalDeposit(0);
      }
      showToast("Pesanan ditahan (hold). Bisa dilanjutkan nanti.", "success");
    } catch {
      showToast("Gagal menyimpan hold sale.", "error");
    }
  };

  const handleRecallSale = async (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    // Restore cart
    setInternalCart(target.cart);
    setInternalDeposit(target.deposit);
    // Remove from held
    await persistHeldCart(target, "delete");
    const updated = heldCarts.filter((h) => h.id !== heldId);
    setHeldCarts(updated);
    showToast("Pesanan berhasil dipulihkan ke keranjang!", "success");
  };

  const handleRemoveHeldSale = async (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    try {
      await persistHeldCart(target, "delete");
      setHeldCarts(heldCarts.filter((h) => h.id !== heldId));
      showToast("Pesanan ditahan berhasil dihapus.", "success");
    } catch (error: any) {
      showToast(error?.message || "Held cart gagal dihapus.", "error");
    }
  };

  return (
    <>
      <div className="space-y-6" id="pos-pane">
        {/* Subtab: CASHIER */}
        {activeSubTab === "cashier" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Selectors */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                  Katalog Produk & Suku Cadang
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Scan barcode..."
                    value={barcodeScan}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBarcodeScan(v);
                      // Auto lookup on Enter
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && barcodeScan.trim()) {
                        const found = effectiveProducts.find(
                          (p: any) => p.sku === barcodeScan.trim() || p.barcode === barcodeScan.trim()
                        );
                        if (found) {
                          effectiveAddToCart(found);
                          showToast(`Barang ${found.name} ditambahkan!`, "success");
                          setBarcodeScan("");
                        } else {
                          showToast(`Produk dengan SKU/barcode "${barcodeScan}" tidak ditemukan.`, "error");
                        }
                      }
                    }}
                    className="w-36 text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" /> Scanner
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {effectiveProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (p.category !== "JASA" && effectiveGetBranchStock(p) <= 0) {
                        showToast("Stok produk habis.", "warning");
                        return;
                      }
                      effectiveAddToCart(p);
                    }}
                    className={`p-3 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-left cursor-pointer transition-all flex flex-col justify-between h-28 ${
                      p.category !== "JASA" && effectiveGetBranchStock(p) <= 0
                        ? "opacity-60 bg-slate-100/80 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[8px] font-mono uppercase">
                          {p.category}
                        </span>
                        {p.category !== "JASA" && (
                          <span
                            className={`text-[8px] font-mono font-bold px-1 rounded ${
                              effectiveGetBranchStock(p) <= 0
                                ? "bg-rose-100 text-rose-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            Stok: {effectiveGetBranchStock(p)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-700 text-xs mt-1.5 line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                    </div>
                    <p className="font-semibold text-blue-600 text-xs font-mono mt-1">
                      Rp {(p.sellPrice ?? 0).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Register Drawer */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit">
              <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider border-b border-slate-100 pb-3 mb-3 flex justify-between items-center">
                <span>Struk Transaksi POS</span>
                {heldCarts.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                    {heldCarts.length} Ditahan
                  </span>
                )}
              </h3>

              {/* Held Sales Section */}
              {heldCarts.length > 0 && (
                <div className="mb-4 bg-amber-50/50 border border-amber-200/60 rounded-xl p-2.5 space-y-2">
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider">Daftar Antrian Ditahan:</p>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {heldCarts.map((hc) => {
                      const totalCartItems = (Array.isArray(hc.cart) ? hc.cart : []).reduce((sum: number, item: any) => sum + (item.qty ?? 0), 0);
                      return (
                        <div key={hc.id} className="flex justify-between items-center text-[10px] bg-white p-2 border border-slate-200 rounded-lg shadow-2xs">
                          <div>
                            <p className="font-semibold text-slate-700">{totalCartItems} barang</p>
                            <p className="text-[8px] text-slate-400 font-mono">{new Date(Number(hc.id)).toLocaleTimeString()}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleRecallSale(hc.id)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-md text-[9px] cursor-pointer"
                            >
                              Buka
                            </button>
                            <button
                              onClick={() => handleRemoveHeldSale(hc.id)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mb-4">
                {effectiveCart.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Keranjang kosong. Pilih barang di katalog.
                  </p>
                ) : (
                  effectiveCart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs border-b border-slate-50 pb-2"
                    >
                      <div>
                        <p className="font-bold text-slate-700 leading-snug">
                          {item.product.name}
                        </p>
                        <p className="text-slate-400 text-[10px] mt-0.5 font-mono">
                          {item.qty} x Rp{" "}
                          {(item.product.sellPrice ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-800 font-mono shrink-0 pl-2">
                        Rp{" "}
                        {(
                          (item.product.sellPrice ?? 0) * item.qty
                        ).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              {effectiveCart.length > 0 && (
                <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      Rp{" "}
                      {effectiveCart
                        .reduce(
                          (sum, item) =>
                            sum + (item.product.sellPrice ?? 0) * item.qty,
                          0,
                        )
                        .toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>PPN ({taxRatePct}% Tax)</span>
                    <span className="font-mono">
                      Rp{" "}
                      {Math.round(
                        effectiveCart.reduce(
                          (sum, item) =>
                            sum + (item.product.sellPrice ?? 0) * item.qty,
                          0,
                        ) * (taxRatePct / 100),
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-dashed border-slate-200 pt-2">
                    <span>Total Bayar</span>
                    <span className="font-mono text-blue-600">
                      Rp{" "}
                      {grandTotal.toLocaleString()}
                    </span>
                  </div>

                  {/* Checkout Panel Controls */}
                  <div className="space-y-3 pt-3">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Pilih Customer
                      </label>
                      <select
                        value={selectedPosCust ?? ""}
                        onChange={(e) => setSelectedPosCust?.(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-accent"
                      >
                        <option value="">-- Pilih Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.phone ? ` (${c.phone})` : ""}
                          </option>
                        ))}
                      </select>
                      {customers.length === 0 && (
                        <p className="mt-1 text-[10px] text-rose-500 font-medium">
                          Belum ada customer untuk tenant ini. Tambahkan customer dulu di CRM.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Metode Bayar
                      </label>
                      <select
                        value={posPaymentMethod}
                        onChange={(e) =>
                          setPosPaymentMethod(e.target.value as PaymentMethod)
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none"
                      >
                        <option value={PaymentMethod.CASH}>CASH / TUNAI</option>
                        <option value={PaymentMethod.BANK_TRANSFER}>
                          TRANSFER BANK
                        </option>
                        <option value={PaymentMethod.QRIS}>
                          QRIS (AUTO SETTLEMENT)
                        </option>
                        <option value={PaymentMethod.DEPOSIT}>
                          DEPOSIT / STORE CREDIT
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Nominal Bayar
                      </label>
                      <input
                        type="number"
                        placeholder="Rp..."
                        value={posAmountPaid}
                        onChange={(e) => setPosAmountPaid(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg outline-none"
                      />
                    </div>

                    {/* Split Payment Toggle */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="split-payment-toggle"
                        checked={splitEnabled}
                        onChange={(e) => setSplitEnabled(e.target.checked)}
                        className="cursor-pointer"
                      />
                      <label htmlFor="split-payment-toggle" className="text-[10px] font-mono text-slate-500 uppercase cursor-pointer">
                        Bayar Ganda (Split)
                      </label>
                    </div>

                    {splitEnabled && (
                      <div className="space-y-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">
                            Metode Kedua
                          </label>
                          <select
                            value={splitPaymentMethod}
                            onChange={(e) => setSplitPaymentMethod(e.target.value as PaymentMethod)}
                            className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded-lg bg-white outline-none"
                          >
                            <option value={PaymentMethod.CASH}>CASH / TUNAI</option>
                            <option value={PaymentMethod.BANK_TRANSFER}>TRANSFER BANK</option>
                            <option value={PaymentMethod.QRIS}>QRIS</option>
                            <option value={PaymentMethod.DEPOSIT}>DEPOSIT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 uppercase mb-1">
                            Nominal Kedua
                          </label>
                          <input
                            type="number"
                            placeholder="Rp..."
                            value={splitAmount}
                            onChange={(e) => setSplitAmount(String(Math.max(0, Number(e.target.value) || 0)))}
                            className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded-lg outline-none"
                          />
                        </div>
                        <p className="text-[9px] text-emerald-600 font-bold">
                          Total: Rp {((Number(posAmountPaid) || 0) + (Number(splitAmount) || 0)).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleHoldSale}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs py-2 rounded-lg cursor-pointer font-semibold"
                      >
                        Tahan (Hold)
                      </button>
                      <button
                        onClick={effectiveHandleCheckout}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-lg cursor-pointer font-bold shadow-md shadow-blue-500/10"
                      >
                        Bayar Lunas
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtab: SHIFTS */}
        {activeSubTab === "shifts" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-md">
            <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider mb-4">
              Membuka / Menutup Laci Kasir
            </h3>
            {activeShift ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs leading-relaxed">
                  POSShift kasir Anda sedang aktif sejak{" "}
                  {new Date(activeShift.openedAt).toLocaleTimeString()}.
                  <br />
                  Laci kasir saat ini mencatat setoran saldo awal:{" "}
                  <strong>
                    Rp {(activeShift?.startingCash ?? 0).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Total Kas Aktual dalam Laci (Rp)
                  </label>
                  <input
                    type="number"
                    value={shiftEndCash}
                    onChange={(e) => setShiftEndCash(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (shiftLoading) return;
                    setShiftLoading(true);
                    try {
                      if (closeShift) {
                        await closeShift(Number(shiftEndCash) || 0, "Shift ditutup reguler.");
                      }
                      showToast("Shift kasir berhasil ditutup!", "success");
                    } catch (e: any) {
                      showToast(e?.message || "Gagal menutup shift.", "error");
                    } finally {
                      setShiftLoading(false);
                    }
                  }}
                  disabled={shiftLoading}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
                >
                  {shiftLoading ? "Menutup..." : "Tutup POSShift Kasir (Closing)"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Modal Kas Awal Laci (Starting Cash)
                  </label>
                  <input
                    type="number"
                    value={shiftStartCash}
                    onChange={(e) => setShiftStartCash(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-accent"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (shiftLoading) return;
                    setShiftLoading(true);
                    try {
                      if (openShift) {
                        await openShift(Number(shiftStartCash) || 0);
                      }
                      showToast("Shift kasir berhasil dibuka!", "success");
                    } catch (e: any) {
                      showToast(e?.message || "Gagal membuka shift.", "error");
                    } finally {
                      setShiftLoading(false);
                    }
                  }}
                  disabled={shiftLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
                >
                  {shiftLoading ? "Membuka..." : "Buka POSShift Kasir Baru"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Subtab: HISTORY */}
        {activeSubTab === "history" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                  Riwayat Transaksi Nota POS
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {
                    transactions.filter((tx) => tx.tenantId === currentTenantId)
                      .length
                  }{" "}
                  Transaksi terdaftar
                </span>
              </div>

              <div className="responsive-table-container max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                    <tr>
                      <th className="px-4 py-3">No Invoice</th>
                      <th className="px-4 py-3">Tanggal & Waktu</th>
                      <th className="px-4 py-3">Pelanggan</th>
                      <th className="px-4 py-3">Metode Bayar</th>
                      <th className="px-4 py-3 text-right">Total Bayar</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.filter(
                      (tx) => tx.tenantId === currentTenantId,
                    ).length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-slate-400 italic"
                        >
                          Belum ada riwayat transaksi penjualan.
                        </td>
                      </tr>
                    ) : (
                      transactions
                        .filter((tx) => tx.tenantId === currentTenantId)
                        .map((tx) => {
                          const custName =
                            customers.find((c) => c.id === tx.customerId)
                              ?.name || "Umum";
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3.5 font-bold font-mono text-blue-600">
                                {tx.invoiceNo}
                              </td>
                              <td className="px-4 py-3.5 text-slate-500">
                                {new Date(tx.timestamp).toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="font-bold text-slate-800">
                                  {custName}
                                </p>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px] font-mono">
                                  {tx.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold font-mono text-slate-800">
                                Rp {(tx.grandTotal ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5">
                                {tx.isRefunded ? (
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded font-mono">
                                    VOID / REFUNDED
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded font-mono">
                                    LUNAS (PAID)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    if (!canViewInvoice) {
                                      showToast(
                                        "Akses Ditolak: Peran Anda tidak memiliki izin 'View Invoice Details' (Lihat Rincian Nota) untuk melihat struk transaksi ini.",
                                        "error",
                                      );
                                      return;
                                    }
                                    setSelectedTxId(tx.id);
                                    setRefundReasonText("");
                                  }}
                                  className={`font-semibold px-2.5 py-1 rounded text-[10px] cursor-pointer flex items-center gap-1 transition-all ${
                                    canViewInvoice
                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                                  }`}
                                >
                                  {!canViewInvoice && (
                                    <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  )}
                                  Detail / Void
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction Detail Slide-Over / Modal */}
            {selectedTxId &&
              (() => {
                const tx = transactions.find((t) => t.id === selectedTxId);
                if (!tx) return null;
                const custName =
                  customers.find((c) => c.id === tx.customerId)?.name || "Umum";
                return (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-xl animate-fadeIn space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
                          Rincian Invoice POS
                        </h4>
                        <p className="text-xs text-blue-600 font-mono font-bold mt-1">
                          {tx.invoiceNo}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTxId(null)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                      >
                        Tutup
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-slate-400 font-mono text-[10px] uppercase">
                          Pelanggan
                        </p>
                        <p className="font-bold text-slate-700 mt-1">
                          {custName}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-mono text-[10px] uppercase">
                          Metode Pembayaran
                        </p>
                        <p className="font-bold text-slate-700 mt-1">
                          {tx.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 font-mono text-[9px] uppercase">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                            <th className="px-3 py-2 text-right">Harga</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tx.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-semibold text-slate-700">
                                {item.name}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-600">
                                Rp {(item.unitPrice ?? 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">
                                Rp {(item.total ?? 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-mono">
                          Rp {(tx.subtotal ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Diskon:</span>
                        <span className="font-mono text-rose-600">
                          - Rp {(tx.discountAmount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>PPN (11%):</span>
                        <span className="font-mono">
                          Rp {(tx.taxAmount ?? 0).toLocaleString()}
                        </span>
                      </div>
                      {(tx.depositUsed ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Kredit Deposit Digunakan:</span>
                          <span className="font-mono text-blue-600">
                            - Rp {(tx.depositUsed ?? 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 text-sm border-t border-dashed border-slate-100 pt-2">
                        <span>Total Pembayaran:</span>
                        <span className="font-mono text-blue-600">
                          Rp {(tx.grandTotal ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {tx.isRefunded ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                        <p className="font-bold uppercase tracking-wider text-[10px] text-rose-700 font-mono">
                          Transaksi Telah Dibatalkan / Void
                        </p>
                        <p className="mt-1 leading-relaxed">
                          <strong>Alasan Void:</strong> “{tx.refundReason}”
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                        <p className="font-bold text-slate-800 text-[10px] font-mono uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Pembatalan Transaksi (Void & Jurnal Koreksi)
                        </p>
                        {canVoidTransaction ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Alasan pembatalan nota (wajib)..."
                              value={refundReasonText}
                              onChange={(e) =>
                                setRefundReasonText(e.target.value)
                              }
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none"
                            />
                            <button
                              onClick={async () => {
                                if (!refundReasonText) {
                                  showToast("Harap masukkan alasan pembatalan.", "error");
                                  return;
                                }
                                if (voidLoading) return;
                                setVoidLoading(true);
                                try {
                                  if (refundTransaction) {
                                    await refundTransaction(tx.id, refundReasonText);
                                  }
                                  showToast("Nota transaksi berhasil di-void! Jurnal pembalik otomatis dipos ke ledger.", "success");
                                  setSelectedTxId(null);
                                } catch (e: any) {
                                  showToast(e?.message || "Gagal void transaksi.", "error");
                                } finally {
                                  setVoidLoading(false);
                                }
                              }}
                              disabled={voidLoading}
                              className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
                            >
                              {voidLoading ? "Memproses Void..." : "Void Nota Transaksi Ini"}
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[11px] text-amber-800 leading-normal space-y-1">
                            <div className="flex items-center gap-1 font-bold">
                              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              Otorisasi Void Ditangguhkan
                            </div>
                            <p>
                              Peran Anda (
                              <strong className="font-mono uppercase">
                                {currentUser.role}
                              </strong>
                              ) tidak diberikan otorisasi{" "}
                              <strong className="font-mono">
                                Approve Refund / Void Transaction
                              </strong>
                              . Silakan minta Owner atau Admin untuk memberikan
                              izin pada menu Matriks RBAC.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        )}

        {activeSubTab === "marketplace-hub" && <MarketplaceHub />}
      </div>
    </>
  );
};
