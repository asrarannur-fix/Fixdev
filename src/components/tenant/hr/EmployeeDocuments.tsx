import * as React from "react";
import { useState, useMemo } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Filter,
  User,
  Shield,
  Award,
  Briefcase,
  File,
  AlertTriangle,
  Calendar,
  ChevronDown,
  X,
} from "lucide-react";
import { useSaaS } from "../../../context/SaaSContext";
import { useToast } from "../../ui/Toast";
import { Employee, EmployeeDocument } from "../../../types";

interface EmployeeDocumentsProps {
  activeSubTab: string;
}

const DOC_TYPE_OPTIONS: EmployeeDocument["type"][] = ["KTP", "SK", "CONTRACT", "CV", "CERTIFICATE", "OTHER"];

const DOC_TYPE_CONFIG: Record<EmployeeDocument["type"], { label: string; icon: React.ReactNode; badgeCls: string }> = {
  KTP: {
    label: "KTP",
    icon: <Shield className="w-5 h-5" />,
    badgeCls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  SK: {
    label: "SK",
    icon: <FileText className="w-5 h-5" />,
    badgeCls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  CONTRACT: {
    label: "Kontrak",
    icon: <Briefcase className="w-5 h-5" />,
    badgeCls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  CV: {
    label: "CV",
    icon: <File className="w-5 h-5" />,
    badgeCls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  CERTIFICATE: {
    label: "Sertifikat",
    icon: <Award className="w-5 h-5" />,
    badgeCls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  OTHER: {
    label: "Lainnya",
    icon: <FileText className="w-5 h-5" />,
    badgeCls: "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

function fmtDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

export const EmployeeDocuments: React.FC<EmployeeDocumentsProps> = ({ activeSubTab }) => {
  const { employees, updateEmployee } = useSaaS();
  const { showToast } = useToast();

  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<EmployeeDocument["type"]>("KTP");
  const [formName, setFormName] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");

  const activeEmployees = useMemo(
    () => employees.filter((e) => !e.status || e.status === "ACTIVE"),
    [employees],
  );

  const selectedEmp = useMemo(
    () => activeEmployees.find((e) => e.id === selectedEmpId) || null,
    [activeEmployees, selectedEmpId],
  );

  const documents = useMemo(() => {
    if (!selectedEmp) return [];
    return selectedEmp.documents || [];
  }, [selectedEmp]);

  const filteredDocs = useMemo(() => {
    if (filterType === "ALL") return documents;
    return documents.filter((d) => d.type === filterType);
  }, [documents, filterType]);

  const docCountByType = useMemo(() => {
    const counts: Record<string, number> = { ALL: documents.length };
    for (const t of DOC_TYPE_OPTIONS) {
      counts[t] = documents.filter((d) => d.type === t).length;
    }
    return counts;
  }, [documents]);

  const handleAddDocument = () => {
    if (!selectedEmp) return;
    if (!formName.trim() || !formFileUrl.trim()) {
      showToast("Nama dokumen dan URL file wajib diisi.", "error");
      return;
    }
    const newDoc: EmployeeDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: formType,
      name: formName.trim(),
      fileUrl: formFileUrl.trim(),
      uploadedAt: new Date().toISOString(),
      expiresAt: formExpiresAt || undefined,
    };
    const existing = selectedEmp.documents || [];
    updateEmployee(selectedEmp.id, { documents: [...existing, newDoc] });
    showToast("Dokumen berhasil diunggah.", "success");
    setFormType("KTP");
    setFormName("");
    setFormFileUrl("");
    setFormExpiresAt("");
    setShowForm(false);
  };

  const handleDeleteDocument = (docId: string) => {
    if (!selectedEmp) return;
    const existing = selectedEmp.documents || [];
    updateEmployee(selectedEmp.id, {
      documents: existing.filter((d) => d.id !== docId),
    });
    showToast("Dokumen berhasil dihapus.", "info");
  };

  if (activeSubTab !== "documents") return null;

  return (
    <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-lg text-slate-900">Dokumen Karyawan</h3>
              <p className="text-xs text-slate-500 mt-0.5">Kelola KTP, SK, kontrak, CV, sertifikat, dan dokumen lainnya.</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!selectedEmpId) {
                showToast("Pilih karyawan terlebih dahulu.", "warning");
                return;
              }
              setShowForm(!showForm);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Upload Dokumen
          </button>
        </div>
      </div>

      {/* Employee Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <User className="w-4 h-4" />
            Pilih Karyawan
          </div>
          <select
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              setFilterType("ALL");
              setShowForm(false);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
          >
            <option value="">-- Pilih Karyawan --</option>
            {activeEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} — {emp.position}
              </option>
            ))}
          </select>
          {selectedEmp && (
            <span className="text-[10px] font-mono text-slate-400">
              {documents.length} dokumen
            </span>
          )}
        </div>
      </div>

      {/* Upload Form */}
      {showForm && selectedEmp && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-sm text-slate-900">Upload Dokumen Baru — {selectedEmp.name}</h4>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tipe Dokumen *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as EmployeeDocument["type"])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {DOC_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{DOC_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nama Dokumen *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: KTP Ahmad"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">URL File *</label>
              <input
                type="url"
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Kedaluwarsa</label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAddDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Simpan Dokumen
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Document Type Tabs + Content */}
      {selectedEmp && documents.length > 0 && (
        <>
          {/* Type Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border cursor-pointer transition-all whitespace-nowrap ${
                filterType === "ALL"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
              }`}
            >
              Semua ({docCountByType["ALL"]})
            </button>
            {DOC_TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border cursor-pointer transition-all whitespace-nowrap ${
                  filterType === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                }`}
              >
                {DOC_TYPE_CONFIG[t].label} ({docCountByType[t]})
              </button>
            ))}
          </div>

          {/* Document Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => {
              const cfg = DOC_TYPE_CONFIG[doc.type];
              const expired = isExpired(doc.expiresAt);
              return (
                <div
                  key={doc.id}
                  className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
                    expired
                      ? "border-red-300 dark:border-red-800"
                      : "border-slate-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${expired ? "bg-red-50 dark:bg-red-950/30" : "bg-slate-50 dark:bg-zinc-800"}`}>
                      <span className={expired ? "text-red-500" : "text-slate-400"}>{cfg.icon}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus dokumen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate mb-1">{doc.name}</h4>
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full ${cfg.badgeCls} mb-2`}>
                    {cfg.label}
                  </span>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-mono">
                      Upload: {fmtDate(doc.uploadedAt)}
                    </p>
                    {doc.expiresAt && (
                      <p className={`text-[10px] font-mono font-bold ${expired ? "text-red-500" : "text-slate-400"}`}>
                        {expired && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                        Expired: {fmtDate(doc.expiresAt)}
                        {expired && " (kedaluwarsa)"}
                      </p>
                    )}
                  </div>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Buka File &rarr;
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty State */}
      {selectedEmp && documents.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">Belum ada dokumen untuk {selectedEmp.name}</p>
          <p className="text-xs text-slate-400 mt-1">Klik "Upload Dokumen" untuk menambahkan dokumen pertama.</p>
        </div>
      )}

      {!selectedEmp && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-semibold">Pilih karyawan untuk melihat dokumen</p>
        </div>
      )}
    </div>
  );
};
