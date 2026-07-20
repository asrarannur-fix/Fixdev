import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  FileText,
  Download,
  Save,
  Clock,
  Filter,
  CheckCircle2,
  Plus,
  Calendar,
  Settings,
  Trash2,
  X,
  FileSpreadsheet,
  Play,
} from "lucide-react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";

interface ReportTemplate {
  id: string;
  name: string;
  module: string;
  fields: string[];
  dateRange: string;
  schedule: string;
  tenantId?: string;
}

export const TenantCustomReports: React.FC = () => {
  const { showToast } = useToast();
  const { currentTenantId, tenants } = useSaaS();
  const [activeTab, setActiveTab] = useState<"builder" | "saved" | "scheduled">(
    "builder",
  );

  // Builder state
  const [selectedModule, setSelectedModule] = useState<string>("services");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>("last_30_days");
  const [reportFormat, setReportFormat] = useState<"pdf" | "csv" | "excel">(
    "csv",
  );

  // Saved reports mock
  const [savedReports, setSavedReports] = useState<ReportTemplate[]>([
    {
      id: "rep-1",
      name: "Laporan Pendapatan Kasir Bulanan",
      module: "pos",
      fields: ["transaction_date", "total_amount", "payment_method"],
      dateRange: "this_month",
      schedule: "monthly",
    },
    {
      id: "rep-2",
      name: "Performa Teknisi Mingguan",
      module: "services",
      fields: ["technician_name", "tickets_completed", "avg_repair_time"],
      dateRange: "this_week",
      schedule: "weekly",
    },
  ]);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [scheduleType, setScheduleType] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none");

  const modules = [
    { id: "services", label: "Servis" },
    { id: "pos", label: "POS" },
    { id: "inventory", label: "Inventory" },
    { id: "hr", label: "HR" },
    { id: "crm", label: "CRM" },
  ];

  const fieldOptions: Record<string, { id: string; label: string }[]> = {
    services: [
      { id: "ticket_no", label: "No. Tiket" },
      { id: "customer_name", label: "Nama Pelanggan" },
      { id: "device", label: "Perangkat" },
      { id: "status", label: "Status Akhir" },
      { id: "cost", label: "Total Biaya" },
      { id: "technician", label: "Teknisi" },
    ],
    pos: [
      { id: "receipt_no", label: "No. Nota" },
      { id: "transaction_date", label: "Tanggal" },
      { id: "cashier", label: "Kasir" },
      { id: "total_amount", label: "Total Nominal" },
      { id: "payment_method", label: "Metode Pembayaran" },
    ],
    inventory: [
      { id: "product_code", label: "Kode Produk" },
      { id: "product_name", label: "Nama Produk" },
      { id: "category", label: "Kategori" },
      { id: "current_stock", label: "Stok Saat Ini" },
      { id: "warehouse", label: "Gudang/Cabang" },
    ],
    hr: [
      { id: "employee_name", label: "Nama Karyawan" },
      { id: "role", label: "Jabatan" },
      { id: "attendance_rate", label: "Tingkat Kehadiran" },
      { id: "total_shifts", label: "Total Shift" },
    ],
    crm: [
      { id: "customer_name", label: "Nama Pelanggan" },
      { id: "join_date", label: "Tanggal Bergabung" },
      { id: "total_spent", label: "Total Belanja" },
      { id: "last_visit", label: "Kunjungan Terakhir" },
    ],
  };

  const handleToggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId],
    );
  };

  const handleSaveReport = () => {
    const cleanName = newReportName.trim();
    if (!cleanName || selectedFields.length === 0) {
      showToast("Nama laporan dan minimal 1 field wajib dipilih.", "error");
      return;
    }
    const newReport: ReportTemplate = {
      id: `rep-${currentTenantId}-${Date.now()}`,
      name: cleanName,
      module: selectedModule,
      fields: selectedFields,
      dateRange,
      schedule: scheduleType,
      tenantId: currentTenantId,
    };
    setSavedReports([...savedReports, newReport]);
    setShowSaveModal(false);
    setNewReportName("");
    setScheduleType("none");
    setActiveTab("saved");
  };

  const handleDeleteReport = (id: string) => {
    setSavedReports((prev) => prev.filter((r) => !(r.id === id && (!r.tenantId || r.tenantId === currentTenantId))));
  };

  const handleGeneratePreview = () => {
    showToast(
      "Menghasilkan laporan berdasarkan kriteria yang dipilih...",
      "info",
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent dark:text-accent" />
            Laporan Kustom Tenant
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Buat, simpan, dan jadwalkan laporan sesuai kebutuhan analitik bisnis
            Anda.
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("builder")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "builder"
              ? "border-accent text-accent dark:border-accent/60 dark:text-accent"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          Builder Laporan
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "saved"
              ? "border-accent text-accent dark:border-accent/60 dark:text-accent"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          Laporan Tersimpan
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "scheduled"
              ? "border-accent text-accent dark:border-accent/60 dark:text-accent"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          Jadwal Pengiriman
        </button>
      </div>

      {activeTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-500" /> Kriteria Laporan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Pilih Modul / Sumber Data
                  </label>
                  <select
                    value={selectedModule}
                    onChange={(e) => {
                      setSelectedModule(e.target.value);
                      setSelectedFields([]);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Rentang Waktu
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="yesterday">Kemarin</option>
                    <option value="this_week">Minggu Ini</option>
                    <option value="last_7_days">7 Hari Terakhir</option>
                    <option value="this_month">Bulan Ini</option>
                    <option value="last_30_days">30 Hari Terakhir</option>
                    <option value="this_year">Tahun Ini</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Kolom Data (Metriks & Dimensi)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {fieldOptions[selectedModule]?.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleToggleField(field.id)}
                        className="rounded text-accent focus:ring-accent bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm font-medium">{field.label}</span>
                    </label>
                  ))}
                </div>
                {selectedFields.length === 0 && (
                  <p className="text-xs text-rose-500 mt-2">
                    * Pilih minimal satu kolom data
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" /> Format & Output
              </h3>
              <div className="flex gap-4">
                <label
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${reportFormat === "csv" ? "border-accent bg-accent-lighter dark:bg-indigo-900/20" : "border-slate-200 dark:border-slate-700 hover:border-accent/50"}`}
                >
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={reportFormat === "csv"}
                    onChange={() => setReportFormat("csv")}
                    className="hidden"
                  />
                  <FileText
                    className={`w-8 h-8 mb-2 ${reportFormat === "csv" ? "text-accent" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-bold">CSV</span>
                </label>
                <label
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${reportFormat === "excel" ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"}`}
                >
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={reportFormat === "excel"}
                    onChange={() => setReportFormat("excel")}
                    className="hidden"
                  />
                  <FileSpreadsheet
                    className={`w-8 h-8 mb-2 ${reportFormat === "excel" ? "text-emerald-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-bold">Excel (.xlsx)</span>
                </label>
                <label
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${reportFormat === "pdf" ? "border-rose-600 bg-rose-50 dark:bg-rose-900/20" : "border-slate-200 dark:border-slate-700 hover:border-rose-300"}`}
                >
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={reportFormat === "pdf"}
                    onChange={() => setReportFormat("pdf")}
                    className="hidden"
                  />
                  <FileText
                    className={`w-8 h-8 mb-2 ${reportFormat === "pdf" ? "text-rose-600" : "text-slate-400"}`}
                  />
                  <span className="text-sm font-bold">PDF</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-accent text-white rounded-xl p-5 shadow-lg">
              <h3 className="font-bold mb-2">Tindakan Laporan</h3>
              <p className="text-indigo-100 text-sm mb-6">
                Anda dapat membuat pratinjau data atau menyimpan pengaturan ini
                sebagai template laporan kustom.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleGeneratePreview}
                  disabled={selectedFields.length === 0}
                  className="w-full bg-white text-accent hover:bg-accent-lighter font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4" /> Preview Data
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={selectedFields.length === 0}
                  className="w-full bg-accent-hover hover:bg-indigo-800 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" /> Simpan Template
                </button>
                <button
                  disabled={selectedFields.length === 0}
                  className="w-full bg-transparent border border-accent/60 hover:bg-accent-hover text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> Ekspor Langsung
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedReports.filter((r) => !r.tenantId || r.tenantId === currentTenantId).map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  className="p-1.5 bg-rose-100 text-rose-600 rounded-md hover:bg-rose-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-accent dark:text-accent mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                {report.name}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Modul:{" "}
                <span className="font-semibold uppercase">{report.module}</span>
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Rentang</span>
                  <span className="font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {report.dateRange}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Kolom</span>
                  <span className="font-medium">
                    {report.fields.length} Field
                  </span>
                </div>
                {report.schedule !== "none" && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Jadwal</span>
                    <span className="font-medium flex items-center gap-1 text-emerald-600">
                      <Clock className="w-3 h-3" /> {report.schedule}
                    </span>
                  </div>
                )}
              </div>

              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" /> Generate Sekarang
              </button>
            </div>
          ))}
          {savedReports.filter((r) => !r.tenantId || r.tenantId === currentTenantId).length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              Belum ada template laporan tersimpan.
            </div>
          )}
        </div>
      )}

      {activeTab === "scheduled" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Nama Laporan</th>
                  <th className="px-6 py-4">Jadwal Pengiriman</th>
                  <th className="px-6 py-4">Modul</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {savedReports
                  .filter((r) => (!r.tenantId || r.tenantId === currentTenantId) && r.schedule !== "none")
                  .map((report) => (
                    <tr
                      key={report.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {report.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-md text-xs font-semibold w-fit uppercase">
                          <Clock className="w-3.5 h-3.5" />
                          {report.schedule}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-mono uppercase">
                          {report.module}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> Aktif
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-accent hover:text-indigo-800 font-medium text-xs">
                          Edit Jadwal
                        </button>
                      </td>
                    </tr>
                  ))}
                {savedReports.filter((r) => (!r.tenantId || r.tenantId === currentTenantId) && r.schedule !== "none").length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      Tidak ada jadwal pengiriman laporan otomatis aktif.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">Simpan Template Laporan</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Laporan
                </label>
                <input
                  type="text"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder="Contoh: Laporan Penjualan Akhir Bulan"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Jadwal Otomatis (Opsional)
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                >
                  <option value="none">Tidak Dijadwalkan</option>
                  <option value="daily">Harian (Pukul 23:59)</option>
                  <option value="weekly">Mingguan (Setiap Minggu Malam)</option>
                  <option value="monthly">Bulanan (Akhir Bulan)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Laporan terjadwal akan dikirim ke email admin Anda.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveReport}
                disabled={!newReportName}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};
