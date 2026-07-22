import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  Users,
  Search,
} from "lucide-react";
import { InventoryProduct, ItemGrade } from "../types";

export const ConsignmentManager: React.FC = () => {
  const {
    products: ctxProducts,
    scopedCustomers = [],
    addInventoryProduct,
    addLog,
    currentTenantId = "",
    currentBranchId = "",
    warehouses = [],
  } = useSaaS();

  const { showToast } = useToast();

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState("");

  // New Consignment Item Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("1000000"); // Target selling price
  const [consignmentFee, setConsignmentFee] = useState("15"); // 15% commission fee
  const [warehouseId, setWarehouseId] = useState("");

  // Auto select default customer/warehouse
  React.useEffect(() => {
    if (scopedCustomers.length > 0 && !selectedCustId) {
      setSelectedCustId(scopedCustomers[0].id);
    }
    const tenantWhs = warehouses.filter((w) => w.tenantId === currentTenantId);
    if (tenantWhs.length > 0 && !warehouseId) {
      setWarehouseId(tenantWhs[0].id);
    }
  }, [scopedCustomers, warehouses, selectedCustId, warehouseId]);

  // Derived consignment products
  const consignmentProducts = React.useMemo(() => {
    return ctxProducts.filter(
      (p: any) =>
        p.tenantId === currentTenantId &&
        p.isConsignment &&
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.consignorId && p.consignorId.includes(searchTerm))),
    );
  }, [ctxProducts, currentTenantId, searchTerm]);

  const handleAddConsignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !selectedCustId || !warehouseId) {
      showToast("Data form tidak lengkap.", "error");
      return;
    }

    const sellVal = Math.max(0, Number(itemPrice) || 0);
    const feePct = Math.min(100, Math.max(0, Number(consignmentFee) || 0));
    const consignorPay = sellVal * (1 - feePct / 100);

    const newProd = {
      tenantId: currentTenantId,
      name: `[TITIPAN] ${itemName.trim()}`,
      category: "SPAREPART" as const,
      sellPrice: sellVal,
      purchaseCost: consignorPay,
      sku: `CNS-${Date.now().toString().slice(-6)}`,
      barcode: `CNS-${Date.now().toString().slice(-6)}`,
      unit: "PICS",
      minStock: 0,
      reorderLevel: 0,
      stockQty: 1,
      warehouseStock: { [warehouseId]: 1 },
      grade: ItemGrade.NEW,
      isConsignment: true,
      consignorId: selectedCustId,
      consignmentPrice: sellVal,
    };

    if (addInventoryProduct) {
      addInventoryProduct(newProd);
      showToast("Produk titipan berhasil didaftarkan!", "success");

      if (addLog) {
        addLog(
          "Pendaftaran barang konsinyasi",
          `Harga Jual: Rp ${sellVal.toLocaleString()}`,
          "INVENTORY",
        );
      }

      setItemName("");
      setShowAddModal(false);
    } else {
      showToast("Fungsi tambah inventaris tidak aktif.", "error");
    }
  };

  return (
    <div className="space-y-6" id="consignment-pane">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" /> Manajemen Konsinyasi
            (Titip Jual)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Daftarkan barang titipan dari pelanggan, atur bagi hasil komisi, dan
            kelola settlement penjualan.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Titipan Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active List (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-2">
            <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider">
              Daftar Barang Konsinyasi Aktif
            </h3>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari barang titipan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-3 py-2">Produk & SKU</th>
                  <th className="px-3 py-2">Consignor (Pemilik)</th>
                  <th className="px-3 py-2 text-right">Harga Jual</th>
                  <th className="px-3 py-2 text-right">Settlement (HPP)</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {consignmentProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-slate-400 italic"
                    >
                      Tidak ada barang konsinyasi terdaftar.
                    </td>
                  </tr>
                ) : (
                  consignmentProducts.map((p: any) => {
                    const consignor = scopedCustomers.find(
                      (c) => c.id === p.consignorId,
                    );
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-700">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {p.sku}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {consignor ? consignor.name : "Pelanggan Umum"}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-600">
                          Rp {(p.sellPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                          Rp {(p.costPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px] uppercase tracking-wider">
                            Ready Stock
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Settlement Summary (1 Column) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Ringkasan Komisi
            & Settlement
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-slate-500">Titipan Terjual</span>
              <span className="font-bold text-slate-800 font-mono">0 Item</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-slate-500">Komisi Konsinyasi (Pendapatan)</span>
              <span className="font-bold text-emerald-600 font-mono">Rp 0</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Hutang Consignor (Settlement)
              </span>
              <span className="font-bold text-amber-600 font-mono">Rp 0</span>
            </div>
          </div>
          <button
            onClick={() =>
              showToast("Tidak ada settlement tertunda saat ini.", "info")
            }
            className="w-full py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all text-center cursor-pointer"
          >
            Proses Settlement Kemitraan
          </button>
        </div>
      </div>

      {/* Add Consignment Modal */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl w-full max-w-md animate-scaleIn">
              <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" /> Daftarkan Barang
                Titip Jual Baru
              </h3>

              <form onSubmit={handleAddConsignment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Pemilik Barang (Consignor)
                  </label>
                  <select
                    value={selectedCustId}
                    onChange={(e) => setSelectedCustId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Pilih Pelanggan...</option>
                    {scopedCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || "No HP"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Nama Barang
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: LCD iPhone 11 Original Cabutan"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Harga Target Jual (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Bagi Hasil Komisi (%)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={consignmentFee}
                      onChange={(e) => setConsignmentFee(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Gudang Penyimpanan
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Pilih Gudang...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shadow-sm"
                  >
                    Daftarkan Barang
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
