/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../../context/SaaSContext";
import { UserRole } from "../../types";
import { Sparkles, X, Send } from "lucide-react";

export const AICopilot: React.FC = () => {
  const { currentUser } = useSaaS();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<
    { role: "user" | "model"; text: string }[]
  >([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize welcome messages based on role
  useEffect(() => {
    let welcomeText = `Halo ${currentUser.name}! Saya adalah AssistSaaS AI Copilot, asisten cerdas yang terintegrasi langsung dalam ERP multi-tenant ini. Saya siap membantu Anda mengelola bisnis secara optimal.`;

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      welcomeText += ` Sebagai Super Admin, saya bisa memberikan panduan tentang manajemen tenant, penagihan, database isolasi, audit trail, atau metrik sistem global. Apa yang ingin Anda ketahui hari ini?`;
    } else if (currentUser.role === UserRole.OWNER) {
      welcomeText += ` Sebagai Owner bisnis, Anda memiliki akses penuh ke laba rugi, kontrol staff, kustomisasi merek, audit log keamanan, serta proteksi fraud. Bagaimana saya bisa membantu memantau bisnis Anda hari ini?`;
    } else if (currentUser.role === UserRole.KASIR) {
      welcomeText += ` Sebagai Kasir Utama, Anda bertanggung jawab untuk terminal transaksi, shift laci kasir harian, hold transaction, serta rekonsiliasi kas. Ada kendala dalam operasional kasir hari ini?`;
    } else if (currentUser.role === UserRole.TEKNISI) {
      welcomeText += ` Sebagai Teknisi Ahli, Anda mengelola antrian reparasi, diagnosa cerdas Gemini AI, checklist QC penyerahan, hingga kanibalisasi unit cadangan. Butuh bantuan memecahkan masalah perangkat?`;
    } else {
      welcomeText += ` Bagaimana saya bisa membantu operasional cabang atau manajemen tim Anda hari ini?`;
    }

    setMessages([{ role: "model", text: welcomeText }]);
  }, [currentUser.role, currentUser.name]);

  const getSmartSuggestions = () => {
    switch (currentUser.role) {
      case UserRole.SUPER_ADMIN:
        return [
          "Bagaimana cara mengisolasi database tenant?",
          "Bagaimana model penagihan SaaS Multi-Tenant ini?",
          "Di mana saya bisa mengecek audit trail global?",
        ];
      case UserRole.OWNER:
        return [
          "Bagaimana cara kustomisasi logo / white-label?",
          "Bagaimana cara memproteksi kasir dari fraud?",
          "Di mana letak pengaturan S3 bucket penyimpanan?",
        ];
      case UserRole.KASIR:
        return [
          "Bagaimana alur buka & tutup shift kasir?",
          "Cara memproses void nota / pembatalan?",
          "Apakah POS mendukung integrasi marketplace?",
        ];
      case UserRole.TEKNISI:
        return [
          "Bagaimana alur Diagnosa AI bekerja?",
          "Langkah kanibalisasi suku cadang laptop?",
          "Cara memperbarui status tiket jadi QC Passed",
        ];
      default:
        return [
          "Apa fungsi Workflow Builder (Automasi)?",
          "Cara mengatur hak akses kustom untuk staff?",
          "Bagaimana cara broadcast WhatsApp ke pelanggan?",
        ];
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (loading) return;
    const cleanText = textToSend.trim().slice(0, 1000);
    if (!cleanText) return;
    const updatedMessages = [
      ...messages,
      { role: "user" as const, text: cleanText },
    ];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userRole: currentUser.role,
        }),
      });
      const data = await response.json();
      setMessages([...updatedMessages, { role: "model", text: data.text }]);
    } catch (err) {
      console.error("Copilot Chat Error:", err);
      setMessages([
        ...updatedMessages,
        {
          role: "model",
          text: "Maaf, terjadi kesalahan koneksi saat berkomunikasi dengan server. Silakan coba lagi.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Copilot Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 border border-white/10 group animate-bounce"
        style={{ animationDuration: "3s" }}
        title="Buka AssistSaaS AI Copilot"
        id="copilot-floating-btn"
      >
        <Sparkles className="w-5 h-5 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-bold text-xs pl-0 group-hover:pl-2 whitespace-nowrap">
          AI Copilot
        </span>
      </button>

      {/* Copilot Sidebar Drawer */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex justify-end"
          id="copilot-drawer"
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800 animate-slideIn">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-sky-50/50 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-450 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-450" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    AssistSaaS AI Copilot
                  </h3>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold font-mono mt-0.5 uppercase tracking-wide">
                    Simulasi Peran: {currentUser.role.replace("_", " ")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none bg-slate-50/50 dark:bg-slate-950/20">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {msg.role !== "user" && (
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-450 shrink-0 font-bold text-[10px] uppercase font-mono">
                      AI
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm/5"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-450 animate-pulse shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-semibold animate-pulse rounded-tl-none">
                    Memikirkan jawaban terbaik...
                  </div>
                </div>
              )}
            </div>

            {/* Recommendation Chips / Shortcut suggestions */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-[9px] font-mono uppercase text-slate-400 mb-1.5 tracking-wider">
                Saran Pintar untuk Anda:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getSmartSuggestions().map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="bg-blue-50/80 hover:bg-blue-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-700 border border-blue-100/30 dark:border-zinc-700 text-blue-700 dark:text-blue-400 font-semibold text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-[1.02] active:scale-95 text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) {
                  handleSendMessage(input.trim());
                }
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Tanyakan operasional, POS, kasir, reparasi..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-2 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
