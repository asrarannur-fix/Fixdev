import React, { useState, useEffect } from "react";
import { Plus, Loader2, Trash2, Pencil, Save, X } from "lucide-react";
import { useSaaS } from "../../../../context/SaaSContext";
import { useToast } from "../../../ui/Toast";
import {
  getComplaintTemplates,
  createComplaintTemplate,
  updateComplaintTemplate,
  deleteComplaintTemplate,
  useComplaintTemplate,
} from "../../../../lib/api/complaintTemplates";

interface TemplateManagerProps {
  currentTenantId: string;
  showToast: (message: string, type?: string) => void;
}

interface ComplaintTemplate {
  id: string;
  tenantId: string;
  label: string;
  value: string;
  category: string;
  deviceType: string[];
  isActive: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export const ComplaintTemplateSettings: React.FC<TemplateManagerProps> = ({ currentTenantId, showToast }) => {
  const { currentUser } = useSaaS();
  
  const [templates, setTemplates] = useState<ComplaintTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<ComplaintTemplate | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Form state
  const [formLabel, setFormLabel] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formCategory, setFormCategory] = useState("hardware");
  const [formDeviceType, setFormDeviceType] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const deviceTypes = [
    "smartphone", "tablet", "laptop", "desktop", 
    "printer", "audio", "smartwatch", "lainnya"
  ];

  const categoryLabels: Record<string, string> = {
    hardware: "Hardware",
    software: "Software",
    repair: "Repair",
    accessory: "Accessory",
    other: "Lainnya",
  };

  // Check permissions based on role
  const userRole = currentUser?.role || "ANONYMOUS";
  const canEdit = ["SUPER_ADMIN", "OWNER", "ADMIN", "MANAGER"].includes(userRole);
  const canDelete = ["SUPER_ADMIN", "OWNER", "ADMIN"].includes(userRole);
  const canEditDefault = ["SUPER_ADMIN", "OWNER"].includes(userRole);

  // Load templates from API
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getComplaintTemplates();
        setTemplates(data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to load templates");
        showToast("Gagal memuat template: " + (err.message || "Unknown error"), "error");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [currentTenantId]);

  const handleSaveTemplate = async () => {
    if (!formLabel.trim() || !formValue.trim()) {
      showToast("Label dan value harus diisi!", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing
        if (editingTemplate.isDefault && !canEditDefault) {
          showToast("Hanya Super Admin/Owner yang bisa edit template default", "error");
          return;
        }

        const updated = await updateComplaintTemplate({
          id: editingTemplate.id,
          label: formLabel.trim(),
          value: formValue.trim(),
          category: formCategory,
          deviceType: formDeviceType,
          isActive: formIsActive,
        });

        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        showToast("Template berhasil diperbarui!", "success");
      } else {
        // Create new
        const created = await createComplaintTemplate({
          label: formLabel.trim(),
          value: formValue.trim(),
          category: formCategory,
          deviceType: formDeviceType,
          isActive: formIsActive,
        });

        setTemplates(prev => [...prev, created]);
        showToast("Template berhasil ditambahkan!", "success");
      }

      resetForm();
    } catch (err: any) {
      showToast("Gagal menyimpan: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, isDefault: boolean) => {
    if (!canDelete) {
      showToast("Anda tidak memiliki akses untuk menghapus template", "error");
      return;
    }

    if (isDefault && !canEditDefault) {
      showToast("Hanya Super Admin/Owner yang bisa hapus template default", "error");
      return;
    }

    if (!confirm("Yakin ingin menghapus template ini?")) return;

    try {
      await deleteComplaintTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      showToast("Template berhasil dihapus!", "success");
    } catch (err: any) {
      showToast("Gagal menghapus: " + (err.response?.data?.error || err.message), "error");
    }
  };

  const handleEditTemplate = (template: ComplaintTemplate) => {
    if (template.isDefault && !canEditDefault) {
      showToast("Hanya Super Admin/Owner yang bisa edit template default", "error");
      return;
    }

    setEditingTemplate(template);
    setFormLabel(template.label);
    setFormValue(template.value);
    setFormCategory(template.category || "hardware");
    setFormDeviceType(template.deviceType || []);
    setFormIsActive(template.isActive ?? true);
    setIsAddingNew(false);
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      await useComplaintTemplate(templateId);
      setTemplates(prev => prev.map(t => 
        t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t
      ));
    } catch (err) {
      // Silent fail - usage tracking is not critical
    }
  };

  const handleToggleDeviceType = (type: string) => {
    if (formDeviceType.includes(type)) {
      setFormDeviceType(formDeviceType.filter(t => t !== type));
    } else {
      setFormDeviceType([...formDeviceType, type]);
    }
  };

  const resetForm = () => {
    setFormLabel("");
    setFormValue("");
    setFormCategory("hardware");
    setFormDeviceType([]);
    setFormIsActive(true);
    setEditingTemplate(null);
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, template) => {
    const cat = template.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, ComplaintTemplate[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-sm text-slate-500">Memuat template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-600 font-bold">⚠️ {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-sm text-slate-800 dark:text-zinc-100">
              Kelola Template Keluhan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tambah, edit, atau hapus template keluhan untuk form penerimaan servis.
            </p>
          </div>
          {canEdit && !isAddingNew && !editingTemplate && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Tambah Template
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(isAddingNew || editingTemplate) && canEdit && (
          <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 mb-6">
            <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase">
              {editingTemplate ? "Edit Template" : "Tambah Template Baru"}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                  Label *
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Contoh: Layar Retak"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-accent"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                  Kategori
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-accent"
                >
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="repair">Repair</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                Device Type (Kosongkan untuk semua)
              </label>
              <div className="flex flex-wrap gap-2">
                {deviceTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleDeviceType(type)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-full border transition-all ${
                      formDeviceType.includes(type)
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                        : "bg-white dark:bg-zinc-950 text-slate-500 border-slate-200 dark:border-zinc-800 hover:border-blue-400"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-zinc-400 uppercase mb-1">
                Deskripsi Template *
              </label>
              <textarea
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Masukkan deskripsi lengkap keluhan..."
                rows={4}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:border-accent resize-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300"
              />
              <label htmlFor="isActive" className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Aktif
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingTemplate ? "Update Template" : "Tambah Template"}
                  </>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs rounded-lg transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Template List by Category */}
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">Belum ada template. Tambah template pertama Anda.</p>
            </div>
          ) : (
            Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase flex items-center gap-2">
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-accent dark:text-indigo-300 rounded">
                    {categoryLabels[category] || category}
                  </span>
                  <span className="text-slate-400">({categoryTemplates.filter(t => t.isActive).length})</span>
                </h4>
                
                <div className="space-y-2">
                  {categoryTemplates
                    .sort((a, b) => (b.isDefault ? 0 : 1) - (a.isDefault ? 0 : 1))
                    .map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 rounded-xl border transition-all ${
                        template.isActive !== false
                          ? "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800"
                          : "bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                              {template.label}
                            </h5>
                            {template.isDefault && (
                              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[9px] font-bold uppercase rounded">
                                Default
                              </span>
                            )}
                            {template.deviceType && template.deviceType.length > 0 && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-mono rounded">
                                {template.deviceType.join(", ")}
                              </span>
                            )}
                            {template.usageCount > 0 && (
                              <span className="text-[9px] text-slate-400">
                                Used {template.usageCount}x
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                            {template.value}
                          </p>
                        </div>
                        
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              disabled={template.isDefault && !canEditDefault}
                              className="p-2 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteTemplate(template.id, template.isDefault)}
                                disabled={template.isDefault && !canEditDefault}
                                className="p-2 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <strong>ℹ️ Info:</strong> Template bertanda "Default" adalah template bawaan sistem. 
          {canEditDefault 
            ? " Anda bisa mengedit atau menghapusnya." 
            : " Hanya Super Admin/Owner yang bisa mengedit template default."}
        </p>
        <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
          Role Anda: <strong className="uppercase">{userRole}</strong> | 
          Akses: {canEdit ? "Edit ✓" : "Read-only"} | 
          Hapus: {canDelete ? "✓" : "✗"}
        </p>
      </div>
    </div>
  );
};