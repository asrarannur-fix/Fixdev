/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POS & Shift domain hook extracted from SaaSContext.tsx
 * Updated to use real backend endpoints for atomic execution, stock, and journals.
 */
import type { POSShift, POSTransaction, InventoryProduct, PaymentMethod, CashTransaction } from "../types";
import api from "../lib/api/client"; // Use standard Axios instance

export interface UseSaaSPOSProps {
  currentTenantId: string;
  currentBranchId: string;
  currentUser: { id: string; name: string };
  shifts: POSShift[];
  transactions: POSTransaction[];
  warehouses: { id: string; branchId: string; tenantId: string }[];
  setShifts: React.Dispatch<React.SetStateAction<POSShift[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<POSTransaction[]>>;
  setProducts: React.Dispatch<React.SetStateAction<InventoryProduct[]>>;
  setCashTransactions: React.Dispatch<React.SetStateAction<CashTransaction[]>>;
  verifyScope: (tenantId?: string) => { tenantId: string; branchId: string };
  tenants: any[];
}

export function useSaaSPOS(props: UseSaaSPOSProps) {
  const {
    currentTenantId,
    currentBranchId,
    currentUser,
    shifts,
    transactions,
    setShifts,
    setTransactions,
    setProducts,
    verifyScope,
    tenants,
  } = props;

  // Helper for auth headers + tenant routing
  const getHeaders = () => {
    // Rely on SaaSContext's global sync logic or interceptor if possible,
    // but explicitly sending headers ensures tenant isolation works.
    return {
      "X-Tenant-ID": currentTenantId,
      "X-Branch-ID": currentBranchId,
    };
  };

  const openShift = async (startingCash: number) => {
    verifyScope(currentTenantId);
    if (!Number.isFinite(startingCash) || startingCash < 0) {
      throw new Error("Saldo awal tidak boleh negatif.");
    }

    // Call server
    const res = await api.post("/pos/shifts/open", { startingCash }, { headers: getHeaders() });
    const newShift = res.data.data;

    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  };

  const closeShift = async (actualEndingCash: number, notes: string) => {
    verifyScope(currentTenantId);
    if (!Number.isFinite(actualEndingCash) || actualEndingCash < 0) {
      throw new Error("Saldo akhir aktual tidak boleh negatif.");
    }

    const res = await api.post("/pos/shifts/close", { actualEndingCash, notes }, { headers: getHeaders() });
    const updatedShift = res.data.data;

    setShifts((prev) =>
      prev.map((s) => (s.id === updatedShift.id ? updatedShift : s))
    );

    if (updatedShift.difference !== 0) {
       window.dispatchEvent(
          new CustomEvent("saas-toast", { detail: { message: `Shift ditutup dengan selisih Rp${updatedShift.difference.toLocaleString()}`, type: "warning" } }),
       );
    }
    return updatedShift;
  };

  const createPOSTransaction = async (
    customerId: string | undefined,
    cart: { product: InventoryProduct; qty: number; discount: number }[],
    paymentMethod: PaymentMethod,
    amountPaid: number,
    depositUsed: number,
    paymentDetails?: string,
  ) => {
    verifyScope(currentTenantId);
    if (!cart.length) throw new Error("Keranjang POS kosong.");

    const payload = {
      customerId: customerId || null,
      paymentMethod,
      amountPaid,
      depositUsed,
      paymentDetails,
      discountAmount: cart.reduce((acc, c) => acc + c.discount, 0), // sum from items for simplicity
      items: cart.map(c => ({
        productId: c.product.id,
        name: c.product.name,
        quantity: c.qty,
        unitPrice: c.product.sellPrice,
        discount: c.discount
      }))
    };

    const res = await api.post("/pos/sales", payload, { headers: getHeaders() });
    const newTx = res.data.data;

    // Refresh products to sync deducted stock locally immediately
    // In a real robust system we'd refetch or merge the response, doing a simple map here based on cart:
    setProducts((prev) =>
      prev.map((p) => {
        const cartItem = cart.find((c) => c.product.id === p.id);
        if (cartItem && p.category !== "JASA") {
           // We just optimistic-update the total qty, exact warehouse object needs a full refetch
           return { ...p, stockQty: Math.max(0, p.stockQty - cartItem.qty) };
        }
        return p;
      })
    );

    setTransactions((prev) => [newTx, ...prev]);
    return newTx;
  };

  const refundTransaction = async (txId: string, reason: string) => {
    verifyScope(currentTenantId);

    const res = await api.post(`/pos/sales/${txId}/void`, { reason }, { headers: getHeaders() });

    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId) {
          return { ...t, isRefunded: true, status: "VOIDED", refundReason: reason };
        }
        return t;
      })
    );

    // We ideally should refresh products here too.
    return res.data.data;
  };

  // Keep these available for the frontend to query history, though they should ideally fetch from server now.
  return { openShift, closeShift, createPOSTransaction, refundTransaction };
}
