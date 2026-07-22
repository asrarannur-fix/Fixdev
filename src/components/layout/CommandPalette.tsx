/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  Package,
  BookOpen,
  Users,
  Settings,
  Smartphone,
  Globe,
  MessageSquare,
  Bell,
  GitBranch,
  Key,
  Sliders,
  Printer,
  Code,
  CreditCard,
  PlusCircle,
  ShieldCheck,
  Search,
  X,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSetTab: (tab: string, subTab?: string) => void;
}

interface SearchItem {
  id: string;
  category:
    | "Modul Utama"
    | "Fitur & Pengaturan"
    | "Tindakan Cepat"
    | "Data Pelanggan & Unit";
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSetTab,
}) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape, navigate with Arrow Up/Down, trigger with Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + filteredItems.length) % filteredItems.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[activeIndex]) {
          filteredItems[activeIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  // Static list of searchable items
  const items: SearchItem[] = [
    // 1. Modul Utama
    {
      id: "overview",
      category: "Modul Utama",
      title: "Dashboard & Analytics",
      subtitle:
        "Pusat statistik laba-rugi, performa teknisi, status tiket, dan notifikasi",
      icon: LayoutDashboard,
      action: () => {
        onSetTab("overview", "overview");
        onClose();
      },
    },
    {
      id: "services-list",
      category: "Modul Utama",
      title: "Servis",
      subtitle:
        "Daftar tiket servis, diagnosa teknisi, kualitas kontrol (QC), dan status pembayaran",
      icon: Wrench,
      action: () => {
        onSetTab("services", "list");
        onClose();
      },
    },
    {
      id: "pos-cashier",
      category: "Modul Utama",
      title: "POS",
      subtitle:
        "Terminal kasir, shift, riwayat transaksi, dan marketplace",
      icon: ShoppingBag,
      action: () => {
        onSetTab("pos", "cashier");
        onClose();
      },
    },
    {
      id: "inventory-stock",
      category: "Modul Utama",
      title: "Inventory",
      subtitle:
        "Stok, lokasi gudang, transfer barang, dan manajemen kanibal",
      icon: Package,
      action: () => {
        onSetTab("inventory", "stock");
        onClose();
      },
    },
    {
      id: "accounting-statements",
      category: "Modul Utama",
      title: "Keuangan",
      subtitle:
        "Laporan keuangan, COA, jurnal, dan buku besar",
      icon: BookOpen,
      action: () => {
        onSetTab("accounting", "statements");
        onClose();
      },
    },
    {
      id: "hr-payroll",
      category: "Modul Utama",
      title: "HR",
      subtitle:
        "Absensi, payroll, komisi, dan kasbon staff",
      icon: Users,
      action: () => {
        onSetTab("hr", "payroll");
        onClose();
      },
    },
    {
      id: "crm-customers",
      category: "Modul Utama",
      title: "CRM",
      subtitle:
        "Database pelanggan, riwayat, dan kampanye promosi",
      icon: Users,
      action: () => {
        onSetTab("crm", "customers");
        onClose();
      },
    },
    {
      id: "settings-general",
      category: "Modul Utama",
      title: "Pusat Pengaturan Sistem (Setting Center)",
      subtitle:
        "Akses lengkap kustomisasi branding, peran RBAC, printer thermal, dan konfigurasi modul",
      icon: Settings,
      action: () => {
        onSetTab("settings", "modules-config");
        onClose();
      },
    },

    // 2. Fitur & Pengaturan Spesifik
    {
      id: "settings-branding",
      category: "Fitur & Pengaturan",
      title: "White-Label Branding & Custom Domain",
      subtitle:
        "Ubah logo bisnis, nama aplikasi, skema warna, dan mapping URL domain mandiri",
      icon: Smartphone,
      action: () => {
        onSetTab("settings", "branding");
        onClose();
      },
    },
    {
      id: "settings-branches",
      category: "Fitur & Pengaturan",
      title: "Multi-Cabang & Lokasi Toko",
      subtitle:
        "Kelola jaringan ekspansi fisik, alamat kantor, dan koordinat GPS masing-masing cabang",
      icon: Globe,
      action: () => {
        onSetTab("settings", "branches");
        onClose();
      },
    },
    {
      id: "settings-whatsapp",
      category: "Fitur & Pengaturan",
      title: "Meta WhatsApp Gateway Connector",
      subtitle:
        "Setup server Meta Cloud API resmi untuk pengiriman draf struk dan status unit otomatis",
      icon: MessageSquare,
      action: () => {
        onSetTab("settings", "whatsapp");
        onClose();
      },
    },
    {
      id: "settings-notifications",
      category: "Fitur & Pengaturan",
      title: "Integrasi & Notifikasi Sistem",
      subtitle:
        "Konfigurasi integrasi webhook, channel notifikasi, dan template pesan multi-channel",
      icon: Bell,
      action: () => {
        onSetTab("settings", "notifications");
        onClose();
      },
    },
    {
      id: "settings-workflows",
      category: "Fitur & Pengaturan",
      title: "Workflow Builder (Automasi)",
      subtitle:
        "Bangun alur kerja otomatis, jalankan API trigger, dan buat kondisi routing dinamis untuk bisnis Anda",
      icon: GitBranch,
      action: () => {
        onSetTab("settings", "workflows");
        onClose();
      },
    },
    {
      id: "settings-rbac",
      category: "Fitur & Pengaturan",
      title: "Hak Akses & Manajemen Staff",
      subtitle:
        "Definisikan hierarki peran, hak akses module granular, dan penetapan RBAC secara real-time",
      icon: Key,
      action: () => {
        onSetTab("settings", "rbac");
        onClose();
      },
    },
    {
      id: "settings-modules-config",
      category: "Fitur & Pengaturan",
      title: "Parameter & Konfigurasi Modul",
      subtitle:
        "Atur parameter aplikasi, konfigurasi modul master, dan pengaturan konfigurasi sistem secara global",
      icon: Sliders,
      action: () => {
        onSetTab("settings", "modules-config");
        onClose();
      },
    },
    {
      id: "settings-printer-terms",
      category: "Fitur & Pengaturan",
      title: "Printer & Ketentuan Nota",
      subtitle:
        "Konfigurasi profil printer thermal, format nota, ketentuan footer nota, dan API klien cetak",
      icon: Printer,
      action: () => {
        onSetTab("settings", "printer-terms");
        onClose();
      },
    },
    {
      id: "settings-developer-api",
      category: "Fitur & Pengaturan",
      title: "Developer REST API & Sanctum",
      subtitle:
        "Aktifkan SANCTUM API key, buat akses user role, dan kelola credential server REST API",
      icon: Code,
      action: () => {
        onSetTab("settings", "developer-api");
        onClose();
      },
    },
    {
      id: "settings-subscription",
      category: "Fitur & Pengaturan",
      title: "Billing & Paket Langganan",
      subtitle:
        "Kelola paket SaaS, siklus penagihan, konfigurasi pricing tiers, dan status langganan pelanggan",
      icon: CreditCard,
      action: () => {
        onSetTab("settings", "subscription");
        onClose();
      },
    },

    // 3. Tindakan Cepat (Quick Actions)
    {
      id: "action-new-ticket",
      category: "Tindakan Cepat",
      title: "Buat Tiket Servis Baru",
      subtitle:
        "Terima unit rusak dari pelanggan, input keluhan, estimasi biaya, dan cetak tanda terima",
      icon: PlusCircle,
      action: () => {
        onSetTab("services", "new-ticket");
        onClose();
      },
    },
    {
      id: "action-pos-cashier-open",
      category: "Tindakan Cepat",
      title: "Buka Terminal POS",
      subtitle:
        "Mulai transaksi checkout retail baru atau kelola status shift kasir",
      icon: ShoppingBag,
      action: () => {
        onSetTab("pos", "cashier");
        onClose();
      },
    },
    {
      id: "action-new-rental",
      category: "Tindakan Cepat",
      title: "Mulai Transaksi Sewa Unit",
      subtitle:
        "Formulir penyewaan unit laptop/proyektor dengan verifikasi jaminan KTP & deposit",
      icon: Package,
      action: () => {
        onSetTab("services", "rental");
        onClose();
      },
    },
    {
      id: "action-wa-broadcast",
      category: "Tindakan Cepat",
      title: "Broadcast Kampanye WhatsApp",
      subtitle:
        "Kirim pesan siaran promo atau pengingat massal ke basis data pelanggan CRM",
      icon: MessageSquare,
      action: () => {
        onSetTab("crm", "marketing");
        onClose();
      },
    },

    // 4. Data Pelanggan & Unit (Mock Records for Instant Deep Search)
    {
      id: "data-cust-budi",
      category: "Data Pelanggan & Unit",
      title: "Budi Santoso (Pelanggan Premium - CRM)",
      subtitle:
        "ID: CUST-0021 | Sering servis laptop & beli aksesoris | Total Loyalitas: 840 Poin",
      icon: Users,
      action: () => {
        onSetTab("crm", "customers");
        onClose();
      },
    },
    {
      id: "data-cust-ahmad",
      category: "Data Pelanggan & Unit",
      title: "Ahmad Hidayat (Pelanggan Retail - CRM)",
      subtitle:
        "ID: CUST-0043 | HP iPhone 13 Pro Max | Terdaftar Cabang Tamalanrea",
      icon: Users,
      action: () => {
        onSetTab("crm", "customers");
        onClose();
      },
    },
    {
      id: "data-srv-001",
      category: "Data Pelanggan & Unit",
      title: "SRV-2026-0001: Asus ROG Screen Replacement (Servis)",
      subtitle:
        "Status: MENUNGGU SPAREPART | Estimasi: Rp 1.850.000 | Teknisi: Rian Wijaya",
      icon: Wrench,
      action: () => {
        onSetTab("services", "list");
        onClose();
      },
    },
    {
      id: "data-srv-002",
      category: "Data Pelanggan & Unit",
      title: "SRV-2026-0002: iPhone 13 Battery Service (Servis)",
      subtitle:
        "Status: SELESAI & LOLOS QC | Biaya: Rp 750.000 | Pelanggan: Ahmad Hidayat",
      icon: ShieldCheck,
      action: () => {
        onSetTab("services", "list");
        onClose();
      },
    },
    {
      id: "data-item-ssd",
      category: "Data Pelanggan & Unit",
      title: "SSD Samsung Evo 870 500GB (Spareparts)",
      subtitle:
        "Suku Cadang | Stok: 18 Unit | Lokasi Rak B-1 | Harga Jual: Rp 950.000",
      icon: Package,
      action: () => {
        onSetTab("inventory", "stock");
        onClose();
      },
    },
  ];

  // Perform search matching both title, subtitle, and category
  const filteredItems = items.filter((item) => {
    const sQuery = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(sQuery) ||
      item.subtitle.toLowerCase().includes(sQuery) ||
      item.category.toLowerCase().includes(sQuery)
    );
  });

  return (
    createPortal(
      <div className="fixed inset-0 z-[9999] bg-slate-950/60 dark:bg-zinc-950/85 backdrop-blur-md flex items-start justify-center pt-[10vh] p-4 transition-all duration-300">
      <div
        ref={containerRef}
        className="max-w-2xl w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[75vh] animate-scaleUp"
        id="command-palette-modal"
      >
        {/* Header Search Input */}
        <div className="relative border-b border-slate-100 dark:border-zinc-800 flex items-center bg-slate-50/50 dark:bg-zinc-950/20 px-4.5 py-4 shrink-0">
          <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari modul, pengaturan, tindakan, atau rekam data..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            className="w-full text-sm bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-bold"
            id="command-palette-search-input"
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 max-h-[450px]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <HelpCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                Hasil pencarian tidak ditemukan
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 leading-normal max-w-sm mx-auto">
                Coba cari kata kunci lain seperti <strong>"servis"</strong>,{" "}
                <strong>"pos"</strong>, <strong>"budi"</strong>, atau{" "}
                <strong>"pengaturan"</strong>.
              </p>
            </div>
          ) : (
            (() => {
              // Group by category to show beautifully organized headers
              const categories = Array.from(
                new Set(filteredItems.map((item) => item.category)),
              );
              let globalIndexCounter = 0;

              return categories.map((cat) => {
                const catItems = filteredItems.filter(
                  (item) => item.category === cat,
                );
                return (
                  <div key={cat} className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase text-indigo-500/80 dark:text-indigo-400/80 tracking-widest px-2.5">
                      {cat}
                    </p>
                    <div className="space-y-0.5">
                      {catItems.map((item) => {
                        const currentGlobalIndex = globalIndexCounter++;
                        const isSelected = activeIndex === currentGlobalIndex;
                        const ItemIcon = item.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() =>
                              setActiveIndex(currentGlobalIndex)
                            }
                            className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                              isSelected
                                ? "bg-accent-lighter dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200"
                                : "bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl shrink-0 border ${
                                isSelected
                                  ? "bg-accent border-accent text-white shadow-md"
                                  : "bg-slate-100 dark:bg-zinc-800 border-slate-200/50 dark:border-zinc-800 text-slate-500 dark:text-zinc-400"
                              }`}
                            >
                              <ItemIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-xs font-bold ${
                                    isSelected
                                      ? "text-indigo-950 dark:text-indigo-200"
                                      : "text-slate-800 dark:text-zinc-100"
                                  }`}
                                >
                                  {item.title}
                                </p>
                                {isSelected && (
                                  <span className="text-[9px] font-extrabold text-accent dark:text-accent bg-indigo-100/60 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-900/40 rounded-full px-2 py-0.5 leading-none flex items-center gap-1 font-mono uppercase">
                                    PILIH <ArrowRight className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-0.5 leading-relaxed truncate">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="bg-slate-50 dark:bg-zinc-950/40 border-t border-slate-100 dark:border-zinc-800 px-4.5 py-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 font-bold uppercase font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1">
                ↑↓
              </kbd>{" "}
              Navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1">
                ↵
              </kbd>{" "}
              Pilih
            </span>
          </div>
          <p className="text-[9px] text-slate-400 dark:text-zinc-600">
            Omni Command &amp; Action Center
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
);
};
