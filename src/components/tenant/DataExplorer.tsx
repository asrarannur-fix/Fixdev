import React from "react";
import {
  Users,
  Package,
  Wrench,
  MapPin,
  Globe,
  BookOpen,
  FileSpreadsheet,
  CheckSquare,
  Database,
} from "lucide-react";
import { CrudManager, CrudField, Column } from "../CrudManager";
import { getModuleById } from "../../config/nav.config";

interface ResourceConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  columns: Column<any>[];
  fields: CrudField[];
}

const RESOURCES: Record<string, ResourceConfig> = {
  customers: {
    title: "Pelanggan",
    icon: Users,
    columns: [
      { key: "name", header: "Nama", accessor: "name", sortable: true, filterable: true },
      { key: "phone", header: "Telepon", accessor: "phone", filterable: true },
      { key: "email", header: "Email", accessor: "email", filterable: true },
      { key: "segment", header: "Segmen", accessor: "segment", filterable: true },
    ],
    fields: [
      { name: "name", label: "Nama", required: true },
      { name: "phone", label: "Telepon", required: true },
      { name: "email", label: "Email" },
      {
        name: "segment",
        label: "Segmen",
        type: "select",
        options: [
          { label: "Personal", value: "PERSONAL" },
          { label: "Corporate", value: "CORPORATE" },
        ],
      },
      { name: "address", label: "Alamat", type: "textarea" },
    ],
  },
  products: {
    title: "Produk",
    icon: Package,
    columns: [
      { key: "name", header: "Nama", accessor: "name", sortable: true, filterable: true },
      { key: "sku", header: "SKU", accessor: "sku", filterable: true },
      { key: "category", header: "Kategori", accessor: "category", filterable: true },
      { key: "sellPrice", header: "Harga Jual", accessor: "sellPrice", align: "right" },
      { key: "stockQty", header: "Stok", accessor: "stockQty", align: "right" },
    ],
    fields: [
      { name: "name", label: "Nama", required: true },
      { name: "sku", label: "SKU", required: true },
      { name: "barcode", label: "Barcode" },
      {
        name: "category",
        label: "Kategori",
        type: "select",
        required: true,
        options: [
          { label: "Sparepart", value: "SPAREPART" },
          { label: "Aksesoris", value: "AKSESORIS" },
          { label: "Jasa", value: "JASA" },
          { label: "Lainnya", value: "LAINNYA" },
        ],
      },
      { name: "purchaseCost", label: "Harga Beli", type: "number" },
      { name: "sellPrice", label: "Harga Jual", type: "number", required: true },
      { name: "stockQty", label: "Stok Awal", type: "number" },
      { name: "unit", label: "Satuan" },
    ],
  },
  service_tickets: {
    title: "Tiket Servis",
    icon: Wrench,
    columns: [
      { key: "ticketNo", header: "No Tiket", accessor: "ticketNo" },
      { key: "deviceName", header: "Device", accessor: "deviceName", sortable: true },
      { key: "status", header: "Status", accessor: "status" },
      { key: "customerApprovalStatus", header: "Approval", accessor: "customerApprovalStatus" },
    ],
    fields: [
      { name: "customerId", label: "Customer ID", required: true },
      { name: "deviceName", label: "Nama Device", required: true },
      { name: "deviceBrandModel", label: "Merk/Model" },
      { name: "deviceCategory", label: "Kategori Device" },
      { name: "customerComplaints", label: "Keluhan", type: "textarea", required: true },
      { name: "estimatedCost", label: "Estimasi Biaya", type: "number" },
      { name: "status", label: "Status" },
    ],
  },
  warehouses: {
    title: "Gudang",
    icon: MapPin,
    columns: [
      { key: "name", header: "Nama", accessor: "name", sortable: true },
      { key: "branchId", header: "Branch ID", accessor: "branchId" },
    ],
    fields: [
      { name: "name", label: "Nama", required: true },
      { name: "branchId", label: "Branch ID" },
    ],
  },
  branches: {
    title: "Cabang",
    icon: Globe,
    columns: [
      { key: "name", header: "Nama", accessor: "name", sortable: true },
      { key: "address", header: "Alamat", accessor: "address" },
      { key: "phone", header: "Telepon", accessor: "phone" },
    ],
    fields: [
      { name: "name", label: "Nama", required: true },
      { name: "address", label: "Alamat", type: "textarea" },
      { name: "phone", label: "Telepon" },
    ],
  },
  coa_accounts: {
    title: "COA",
    icon: BookOpen,
    columns: [
      { key: "code", header: "Kode", accessor: "code" },
      { key: "name", header: "Nama", accessor: "name", sortable: true },
      { key: "type", header: "Tipe", accessor: "type" },
    ],
    fields: [
      { name: "code", label: "Kode", required: true },
      { name: "name", label: "Nama", required: true },
      {
        name: "type",
        label: "Tipe",
        type: "select",
        required: true,
        options: [
          { label: "Aset", value: "ASSET" },
          { label: "Liabilitas", value: "LIABILITY" },
          { label: "Ekuitas", value: "EQUITY" },
          { label: "Pendapatan", value: "REVENUE" },
          { label: "Beban", value: "EXPENSE" },
        ],
      },
      { name: "isGroup", label: "Kelompok", type: "checkbox" },
    ],
  },
  journal_entries: {
    title: "Jurnal",
    icon: FileSpreadsheet,
    columns: [
      { key: "date", header: "Tanggal", accessor: "date" },
      { key: "description", header: "Keterangan", accessor: "description" },
    ],
    fields: [
      { name: "date", label: "Tanggal", type: "date" },
      { name: "description", label: "Keterangan", type: "textarea" },
      { name: "reference", label: "Referensi" },
    ],
  },
  pos_shifts: {
    title: "Shift",
    icon: CheckSquare,
    columns: [
      { key: "openedAt", header: "Buka", accessor: "openedAt" },
      { key: "status", header: "Status", accessor: "status" },
    ],
    fields: [
      { name: "status", label: "Status" },
      { name: "openingCash", label: "Kas Awal", type: "number" },
      { name: "notes", label: "Catatan", type: "textarea" },
    ],
  },
};

export const DataExplorer: React.FC<{
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
}> = ({ activeSubTab, setActiveSubTab }) => {
  const module = getModuleById("data-explorer");
  const current = RESOURCES[activeSubTab || ""] ? activeSubTab! : "customers";
  const config = RESOURCES[current];

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <Database className="w-4 h-4 text-indigo-500" />
        <span>Pilih jenis data master untuk dikelola.</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {module?.subtabs.map((sub) => {
          const Icon = sub.icon;
          const isActive = sub.id === current;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubTab?.(sub.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30"
                  : "bg-white dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-zinc-800 hover:border-indigo-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {sub.label}
            </button>
          );
        })}
      </div>

      <CrudManager
        table={current}
        title={config.title}
        icon={config.icon}
        columns={config.columns}
        fields={config.fields}
      />
    </div>
  );
};
