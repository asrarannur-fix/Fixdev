/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  BookOpen,
  Search,
  FileText,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Send,
} from "lucide-react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";

interface SchematicGuide {
  id: string;
  title: string;
  category: "Smartphone" | "Laptop" | "Console" | "Tablet" | "MacBook";
  deviceModel: string;
  fileSize: string;
  author: string;
  downloads: number;
  pdfUrl?: string;
  keyTroubleshoots: string[];
}

const INITIAL_GUIDES: SchematicGuide[] = [
  {
    id: "guide-1",
    title: "iPhone 13 Pro Max - Motherboard Schematic Diagram v2.4",
    category: "Smartphone",
    deviceModel: "iPhone 13 Pro Max",
    fileSize: "18.4 MB",
    author: "Zillion Repair Center",
    downloads: 342,
    keyTroubleshoots: [
      "Instabilitas IC Charger (U2)",
      "Jalur lampu latar layar (Backlight Coil)",
      "Sirkuit tombol volume & Power flex",
    ],
  },
  {
    id: "guide-2",
    title: "MacBook Pro M1 (A2338) - Boardview & Power Rail Guide",
    category: "MacBook",
    deviceModel: "MacBook Pro M1 2020",
    fileSize: "24.1 MB",
    author: "Apple Certified Lab Team",
    downloads: 189,
    keyTroubleshoots: [
      "Jalur pengisian daya USB-C (IC CD3217)",
      "Short pada sirkuit 3.3V G3Hot",
      "Koneksi Display Port LVDS Backlight",
    ],
  },
  {
    id: "guide-3",
    title: "Samsung Galaxy S22 Ultra - Charging Block & Antenna Layout",
    category: "Smartphone",
    deviceModel: "Samsung Galaxy S22 Ultra",
    fileSize: "12.8 MB",
    author: "S-Service Lab",
    downloads: 275,
    keyTroubleshoots: [
      "Kerusakan Konektor FPC Charging",
      "Masalah Sinyal RF / Transceiver IC",
      "Sensor suhu pengisian daya (Thermistor)",
    ],
  },
  {
    id: "guide-4",
    title: "Asus ROG Phone 6 - Dual Battery System Schematic",
    category: "Smartphone",
    deviceModel: "Asus ROG Phone 6",
    fileSize: "15.2 MB",
    author: "ROG Tech Forum",
    downloads: 95,
    keyTroubleshoots: [
      "Sinkronisasi tegangan Dual-Battery",
      "Pengisian daya Bypass-charging IC",
      "Controller kipas pendingin eksternal",
    ],
  },
  {
    id: "guide-5",
    title: "PlayStation 5 (CFI-1200) - Power Supply & HDMI Encoder Guide",
    category: "Console",
    deviceModel: "Sony PlayStation 5",
    fileSize: "32.0 MB",
    author: "ConsoleFix Worldwide",
    downloads: 412,
    keyTroubleshoots: [
      "Masalah 'No Display' - IC Encoder HDMI (Panasonic)",
      "Kegagalan Liquid Metal & Overheating",
      "Tegangan standby 12V Power Supply",
    ],
  },
];

const TROUBLESHOOT_TIPS = [
  {
    title: "iPhone Boot Loop (Stuck di Logo Apple)",
    cause:
      "Sering kali disebabkan oleh memori internal penuh (NAND full), kamera depan rusak (proximity sensor flex short), atau baterai drop.",
    steps: [
      "Coba putuskan sambungan flex kamera depan / proximity sensor dan hidupkan kembali.",
      "Lakukan update sistem via recovery mode (DFU) tanpa hapus data.",
      "Ukur tegangan VCC_MAIN apakah stabil di 3.8V - 4.2V.",
    ],
  },
  {
    title: "Laptop No Display (Lampu Indikator Menyala, Kipas Berputar)",
    cause:
      "Instabilitas pada sirkuit RAM, korosi jalur BIOS, atau kegagalan chip grafis (GPU).",
    steps: [
      "Bersihkan kaki-kaki RAM menggunakan penghapus karet dan pasang di slot alternatif.",
      "Lakukan flash ulang IC BIOS menggunakan programmer hardware (RT809H/CH341A).",
      "Ukur tegangan pada coil memori dan coil CPU (pastikan berkisar 0.9V - 1.2V).",
    ],
  },
  {
    title: "Kerusakan Jalur Pengisian Daya (Tidak Mengisi Daya sama sekali)",
    cause:
      "Konektor fisik kotor/longgar, IC Charger rusak, atau sekering (fuse) input putus.",
    steps: [
      "Periksa pin dalam konektor port pengisian daya di bawah mikroskop.",
      "Lakukan pengetesan USB-C Ammeter untuk melihat arus input (apakah 0.00A atau stuck di 0.10A).",
      "Ukur sirkuit VBUS (5V - 20V) sebelum masuk ke IC Charger.",
    ],
  },
];

export const KnowledgeBase: React.FC = () => {
  const { showToast } = useToast();
  const { currentTenantId, currentUser } = useSaaS();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Smartphone",
    "Laptop",
    "Console",
    "Tablet",
    "MacBook",
  ];

  const filteredGuides = INITIAL_GUIDES.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guide.deviceModel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || guide.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 overflow-y-auto max-h-full pr-1 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-6 pointer-events-none">
          <BookOpen className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 border border-accent/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Pusat Pengetahuan Teknis
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Perpustakaan Skema & Panduan Diagnosis
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Akses diagram boardview sirkuit cetak (PCB), skema kelistrikan
            resmi, dan gunakan panduan diagnosis untuk memecahkan masalah
            perangkat keras yang kompleks.
          </p>
        </div>
      </div>

      <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  Perpustakaan Diagram Skema & Boardview
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Download diagram jalur sirkuit PCB resmi dari server pusat.
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                      selectedCategory === cat
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan model (misal: iPhone, MacBook, PS5...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-accent text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Guides List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {filteredGuides.length > 0 ? (
                filteredGuides.map((guide) => (
                  <div
                    key={guide.id}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-accent/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded ${
                            guide.category === "MacBook"
                              ? "bg-blue-100 text-blue-700"
                              : guide.category === "Smartphone"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {guide.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {guide.fileSize}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-800 leading-snug">
                        {guide.title}
                      </h4>

                      {/* Key Troubleshoot Nodes */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {guide.keyTroubleshoots.map((node, i) => (
                          <span
                            key={i}
                            className="text-[8.5px] font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md"
                          >
                            💡 {node}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        showToast(`Memulai unduhan PDF: ${guide.title}`, "info")
                      }
                      className="flex-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      Unduh <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">
                    Skema tidak ditemukan
                  </p>
                  <p className="text-[10px] mt-1">
                    Coba gunakan kata kunci pencarian yang berbeda.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* TIPS & TRIK TROUBLESHOOTING TERPOPULER */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <HelpCircle className="w-5 h-5 text-accent" />
              Prosedur Kerja & Tips Troubleshooting Cepat
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TROUBLESHOOT_TIPS.map((tip, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-accent-lighter/40 border border-indigo-100/50 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <h5 className="font-black text-xs text-indigo-950 leading-snug">
                      {tip.title}
                    </h5>
                    <p className="text-[10px] text-slate-600 leading-relaxed italic border-l border-accent/50 pl-2">
                      {tip.cause}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/50 space-y-1">
                    <span className="text-[8px] font-black uppercase text-accent tracking-wider block">
                      Langkah Penting:
                    </span>
                    <ul className="space-y-1">
                      {tip.steps.map((st, i) => (
                        <li
                          key={i}
                          className="text-[9.5px] text-slate-700 flex items-start gap-1"
                        >
                          <span className="text-indigo-500 font-bold">•</span>
                          <span className="leading-relaxed">{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};
