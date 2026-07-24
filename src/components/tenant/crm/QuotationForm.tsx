import React, { useState, useEffect } from "react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { CRMQuotation, QuotationItem } from "../../../types";
import { Save, X, Plus, Trash2 } from "lucide-react";

interface QuotationFormProps {
  customerId: string;
  quotation?: CRMQuotation;
  onClose: () => void;
}

export const QuotationForm: React.FC<QuotationFormProps> = ({ customerId, quotation, onClose }) => {
  const { customers, currentTenantId, addQuotation, updateQuotation } = useSaaS();
  const { showToast } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId);
  const [subject, setSubject] = useState(quotation?.subject || "");
  const [description, setDescription] = useState(quotation?.description || "");
  const [validUntil, setValidUntil] = useState(quotation?.validUntil || "");
  const [items, setItems] = useState<QuotationItem[]>(
    quotation?.items || [{ id: "item-1", description: "", quantity: 1, unitPrice: 0, total: 0 }],
  );
  const [discount, setDiscount] = useState(quotation?.discount || 0);
  const [tax, setTax] = useState(quotation?.tax || 11);
  const [notes, setNotes] = useState(quotation?.notes || "");

  const tenantCustomers = customers.filter((c) => c.tenantId === currentTenantId);

  useEffect(() => {
    if (quotation) {
      setSelectedCustomerId(quotation.customerId);
      setSubject(quotation.subject);
      setDescription(quotation.description);
      setValidUntil(quotation.validUntil);
      setItems(quotation.items);
      setDiscount(quotation.discount);
      setTax(quotation.tax);
      setNotes(quotation.notes || "");
    }
  }, [quotation]);

  const updateItem = (idx: number, field: keyof QuotationItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        updated.total = updated.quantity * updated.unitPrice;
      }
      return updated;
    }));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: `item-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (tax / 100);
  const total = afterDiscount + taxAmount;

  const handleSave = (status: "DRAFT" | "SENT") => {
    if (!selectedCustomerId) {
      showToast("Pilih pelanggan terlebih dahulu", "error");
      return;
    }
    if (!subject) {
      showToast("Isi subjek penawaran", "error");
      return;
    }

    const data = {
      customerId: selectedCustomerId,
      date: quotation?.date || new Date().toISOString().split("T")[0],
      validUntil,
      subject,
      description,
      items,
      subtotal,
      discount,
      tax,
      total,
      status,
      notes,
      sentAt: status === "SENT" ? new Date().toISOString() : quotation?.sentAt,
    };

    if (quotation) {
      updateQuotation(quotation.customerId, quotation.id, data);
      showToast("Penawaran diperbarui", "success");
    } else {
      addQuotation(data as any);
      showToast("Penawaran baru dibuat", "success");
    }
    onClose();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
          {quotation ? "Edit Penawaran" : "Buat Penawaran Baru"}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="p-5 space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Pelanggan</label>
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none">
              <option value="">Pilih Pelanggan</option>
              {tenantCustomers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Berlaku Hingga</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Subjek</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Contoh: Servis MacBook Pro 2023" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Deskripsi</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none resize-none" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-mono text-slate-400 uppercase">Item Penawaran</label>
            <button onClick={addItem} className="text-blue-600 hover:text-blue-700 text-[10px] font-bold flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah Item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-2 sm:items-center p-2 sm:p-0 bg-slate-50 sm:bg-transparent rounded-lg">
                <input type="text" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Deskripsi item" className="w-full sm:flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                <div className="flex gap-2 items-center">
                <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-20 px-3 py-2 border border-slate-200 rounded-lg outline-none text-center" />
                <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))} className="w-32 px-3 py-2 border border-slate-200 rounded-lg outline-none text-right" />
                <span className="w-32 text-right font-mono font-bold">Rp {item.total.toLocaleString()}</span>
                </div>
                <button onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded self-end sm:self-center">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Diskon (%)</label>
            <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Pajak (%)</label>
            <input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-right">
              <p className="text-[10px] text-slate-400 uppercase">Total</p>
              <p className="text-lg font-bold font-mono text-emerald-600">Rp {total.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Catatan</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none resize-none" />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={() => handleSave("DRAFT")} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1">
            <Save className="w-3 h-3" /> Simpan Draft
          </button>
          <button onClick={() => handleSave("SENT")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg">
            Simpan & Kirim
          </button>
        </div>
      </div>
    </div>
  );
};
