import React, { useState, useRef, useCallback } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import { useServiceTrackerQr } from "../hooks/useServiceTrackerQr";
import {
  QrCode,
  Printer,
  Check,
  RefreshCw,
  Send,
  AlertCircle,
  Wrench,
  Calendar,
  Smartphone,
  Info,
  Camera,
  Volume2,
  Eye,
  Settings,
  FileText,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface ServiceTrackerQrProps {
  preselectedTicketId?: string;
}

export const ServiceTrackerQr: React.FC<ServiceTrackerQrProps> = ({
  preselectedTicketId,
}) => {
  const { showToast } = useToast();
  const { services = [], currentTenantId, apiFetch, tenants } = useSaaS();

  const tenantServices = services.filter((s) => s.tenantId === currentTenantId);
  const activeTenant = tenants.find((t) => t.id === currentTenantId);
  const businessName = activeTenant?.settings?.generalSettings?.appName?.trim() || activeTenant?.name || "Toko Servis";

  const {
    selectedTicketId,
    setSelectedTicketId,
    selectedTicket,
    syncStatus,
    syncMessage,
    handleSyncTicket,
    getTrackingUrl,
    getQrCodeUrl,
    handlePrintReceipt,
    handleDirectPrintLabel,
  } = useServiceTrackerQr(services, currentTenantId, apiFetch);

  const stableInvNo = React.useMemo(() => {
    if (!selectedTicket) return "";
    const seed = selectedTicket.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 10000 + (seed % 90000);
  }, [selectedTicket]);

  // Tab State: "print" | "scanner" | "thermal"
  const [activeTab, setActiveTab] = useState<"print" | "scanner" | "thermal">(
    "print",
  );

  // Camera scanner engine states
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "streaming" | "success"
  >("idle");
  const scannerRef = useRef<any>(null);

  // Cleanup scanner on unmount
  React.useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Thermal print parameters
  const [thermalTapeSize, setThermalTapeSize] = useState<"58" | "80">("58");
  const [stickerMode, setStickerMode] = useState<
    "compact" | "qr_only" | "full_receipt"
  >("compact");
  const [isThermalPrinting, setIsThermalPrinting] = useState(false);
  const [thermalPrintedOutput, setThermalPrintedOutput] =
    useState<boolean>(false);

  React.useEffect(() => {
    if (preselectedTicketId && tenantServices.some((s) => s.id === preselectedTicketId)) {
      setSelectedTicketId(preselectedTicketId);
    }
  }, [preselectedTicketId, setSelectedTicketId]);

  // Helper formatting currency
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleShareWhatsApp = (ticketNo: string) => {
    const url = getTrackingUrl(ticketNo);
    const text = `Halo Kak, silakan pantau status servis unit Anda dengan No. Tiket *#${ticketNo}* secara live dan real-time melalui tautan resmi kami berikut:\n\n🔗 ${url}\n\nTerima kasih atas kepercayaannya!`;

    // Copy to clipboard as a fallback for iframe sandbox window.open blocks
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .catch((err) => console.error("Failed to copy text: ", err));
    }

    try {
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
        "_blank",
      );
    } catch (err) {
      console.warn("Popup blocked: ", err);
    }

    showToast(
      "Membuka WhatsApp Web untuk membagikan tautan pelacakan.\nTeks pesan otomatis disalin ke clipboard Anda sebagai cadangan!",
      "success",
    );
  };

  // Play beep sound upon scanner success
  const playBeep = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // High pitch beep

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.15,
      );

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.warn("Audio Context playback blocked: ", err);
    }
  };

  // Scanner kamera real via html5-qrcode (dynamic import)
  const startCameraScanner = useCallback(async () => {
    setScanning(true);
    setCameraState("streaming");
    setScanResult(null);

    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }

    try {
      const Html5Qrcode = (await import("html5-qrcode")).Html5Qrcode;
      const scanner = new Html5Qrcode("qr-scanner-element");

      const onSuccess = (decodedText: string) => {
        const ticketNo = decodedText.match(/ticket=([^&]+)/)?.[1] || decodedText;
        const match = tenantServices.find((s) => s.ticketNo === ticketNo);
        if (match) {
          setScanResult(ticketNo);
          setSelectedTicketId(match.id);
          setCameraState("success");
          playBeep();
          scanner.stop().catch(() => {});
        } else {
          showToast(`Tiket ${ticketNo} tidak ditemukan`, "error");
        }
      };

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onSuccess,
        () => {},
      );
      scannerRef.current = scanner;
    } catch (err) {
      console.error("Scanner error:", err);
      setCameraState("idle");
      showToast("Kamera tidak tersedia atau izin ditolak", "error");
    } finally {
      setScanning(false);
    }
  }, [tenantServices, setSelectedTicketId, showToast]);

  // Aktivasi Cetak Thermal Roll
  const triggerThermalPrintAnimation = () => {
    if (!selectedTicket) return;
    setIsThermalPrinting(true);
    setThermalPrintedOutput(false);

    setTimeout(() => {
      setIsThermalPrinting(false);
      setThermalPrintedOutput(true);
      playBeep();
    }, 1800);
  };

  return (
    <div className="space-y-5" id="qr-tracker-root">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-accent dark:text-accent" />
            QR Code Lacak &amp; Label Sticker Thermal
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 leading-tight">
            Cetak nota penerimaan berstempel QR lacak, scan QR via kamera HP,
            atau cetak sticker thermal mini untuk bluetooth printer.
          </p>
        </div>

        {/* Tab Selection Switcher */}
        <div className="flex bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-xl text-xs font-black border border-slate-200/40 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("print")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "print"
                ? "bg-white dark:bg-zinc-900 text-accent dark:text-accent shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Slip QR Standar
          </button>
          <button
            onClick={() => setActiveTab("scanner")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "scanner"
                ? "bg-white dark:bg-zinc-900 text-accent dark:text-accent shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" /> Scanner Kamera
            (html5-qrcode)
          </button>
          <button
            onClick={() => setActiveTab("thermal")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === "thermal"
                ? "bg-white dark:bg-zinc-900 text-accent dark:text-accent shadow-xs"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-indigo-500" /> Bluetooth
            Printer Label
          </button>
        </div>
      </div>

      {/* TAB 1: Slip QR Standar */}
      {activeTab === "print" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Side: Controls & Selector */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 block">
                  Pilih Tiket Servis Aktif
                </label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 rounded-xl outline-none focus:border-accent"
                >
                  {tenantServices.length === 0 ? (
                    <option value="">Belum ada servis yang terdaftar</option>
                  ) : (
                    tenantServices.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        #{ticket.ticketNo} - {ticket.deviceName} (
                        {ticket.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {selectedTicket ? (
                <div className="space-y-3.5 pt-1.5">
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 font-mono">
                          #{selectedTicket.ticketNo}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-bold">
                          {selectedTicket.deviceName}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 bg-accent-lighter dark:bg-indigo-950/40 text-accent dark:text-accent text-[9px] font-black font-mono rounded border border-indigo-100 dark:border-indigo-900/40 uppercase">
                        {selectedTicket.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-zinc-400 pt-1.5 border-t border-slate-100 dark:border-zinc-900/80 leading-none">
                      <div className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Estimasi Selesai:</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-zinc-300 text-right">
                        {selectedTicket.estimatedCompletionDate
                          ? new Date(
                              selectedTicket.estimatedCompletionDate,
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "3 Hari"}
                      </span>

                      <div className="flex items-center gap-1 font-semibold">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Brand / Model:</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-zinc-300 truncate text-right">
                        {selectedTicket.deviceBrandModel || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Cloud Sync Status Action */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSyncTicket(selectedTicket)}
                      disabled={syncStatus === "syncing"}
                      className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-black py-2 rounded-xl cursor-pointer transition-all disabled:opacity-50"
                    >
                      {syncStatus === "syncing" ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : syncStatus === "success" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      {syncStatus === "syncing"
                        ? "Menyinkronkan..."
                        : syncStatus === "success"
                          ? "Tersinkronisasi!"
                          : "Aktifkan Online Lacak"}
                    </button>

                    {syncMessage && (
                      <div
                        className={`p-2.5 rounded-xl flex items-center gap-2 text-[10px] font-bold border leading-snug ${
                          syncStatus === "success"
                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400"
                            : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400"
                        }`}
                      >
                        {syncStatus === "success" ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{syncMessage}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-0.5">
                    <button
                      onClick={() => handlePrintReceipt(selectedTicket, businessName)}
                      className="flex items-center justify-center gap-1 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-[9.5px] font-black py-2 rounded-xl cursor-pointer transition-all"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" /> Nota
                    </button>
                    <button
                      onClick={() => handleDirectPrintLabel(selectedTicket, businessName)}
                      className="flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-900/50 bg-accent-lighter hover:bg-indigo-100 dark:bg-indigo-950/30 text-accent dark:text-indigo-300 text-[9.5px] font-black py-2 rounded-xl cursor-pointer transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" /> Label 58mm
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(selectedTicket.ticketNo)}
                      className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black py-2 rounded-xl cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-2xl space-y-2">
                  <Info className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto" />
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                    Pilih salah satu nomor tiket di atas untuk membuat kode QR
                    lacak.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/20 rounded-2xl flex gap-3">
              <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h5 className="text-[11px] font-extrabold text-amber-900 dark:text-amber-400 uppercase tracking-wider font-mono">
                  Sistem Lacak Mandiri Pelanggan
                </h5>
                <p className="text-[10px] text-amber-800 dark:text-amber-500/90 leading-relaxed">
                  Nota penerimaan berstempel kode QR akan mengarahkan pelanggan
                  langsung ke Portal Pelacak Live, di mana mereka bisa memantau
                  detail pengerjaan tanpa mengganggu admin toko.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Mock Live Preview */}
          <div className="lg:col-span-7">
            <div className="bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-5 flex flex-col items-center justify-center min-h-[410px] shadow-inner relative overflow-hidden">
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 bg-slate-200/80 dark:bg-zinc-900 text-[9px] font-bold text-slate-500 dark:text-zinc-400 rounded-md uppercase font-mono tracking-wider border border-slate-300/40">
                Pratinjau Nota Slip Penerimaan
              </div>

              {selectedTicket ? (
                <div className="w-full max-w-xs bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-3 shadow-md text-xs text-slate-800 dark:text-zinc-200 transform hover:scale-[1.01] transition-transform animate-fadeIn">
                  <div className="text-center border-b border-slate-100 dark:border-zinc-900 pb-2.5 space-y-1">
                    <h3 className="font-extrabold text-accent dark:text-accent uppercase tracking-wide">
                      {businessName}
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium">
                      Layanan Servis Profesional &amp; Terpercaya
                    </p>
                    <div className="inline-block mt-1.5 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-accent font-extrabold font-mono text-[10.5px] rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                      TIKET: #{selectedTicket.ticketNo}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[10.5px] leading-tight">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">
                        Pelanggan:
                      </span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300">
                        {selectedTicket.provisionalSignatureName ||
                          "Umum / Pelanggan"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">
                        Unit Perangkat:
                      </span>
                      <span className="font-bold text-slate-700 dark:text-zinc-300">
                        {selectedTicket.deviceName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-zinc-500">
                        Estimasi Biaya:
                      </span>
                      <span className="font-bold text-accent dark:text-accent font-mono">
                        {formatRupiah(selectedTicket.estimatedCost)}
                      </span>
                    </div>
                  </div>

                  {/* QR Display frame */}
                  <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-900 p-3 rounded-2xl text-center space-y-2">
                    <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center">
                      <img
                        src={getQrCodeUrl(selectedTicket.ticketNo)}
                        className="w-full h-full object-contain"
                        alt="Lacak Servis QR Code"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9.5px] font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wide">
                        Pindai QR Untuk Lacak Progres
                      </p>
                      <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 leading-relaxed px-2">
                        Gunakan kamera HP untuk memantau status pengerjaan
                        secara live.
                      </p>
                    </div>
                  </div>

                  <div className="text-[8px] text-slate-400 dark:text-zinc-500 text-center border-t border-slate-100 dark:border-zinc-900 pt-2 leading-none">
                    * Tunjukkan slip ini saat penyerahan &amp; pengambilan
                    barang.
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <QrCode className="w-12 h-12 text-slate-300 dark:text-zinc-800 animate-pulse mx-auto" />
                  <p className="text-xs text-slate-400 dark:text-zinc-600 font-medium">
                    Menunggu nomor tiket dipilih untuk merender visual slip...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: html5-qrcode Live Scanner */}
      {activeTab === "scanner" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
          {/* Controls column */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-500" /> Scanner Barcode
                &amp; QR Kamera
              </h4>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Pustaka <code>html5-qrcode</code> mendeteksi barcode unit, label
                QR di motherboard, atau nota servis secara instan dari kamera
                HP.
              </p>
            </div>

            <div className="space-y-3.5">
              <button
                onClick={startCameraScanner}
                disabled={scanning}
                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Mengakses
                    Kamera Stream...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" /> Aktifkan Kamera HP
                  </>
                )}
              </button>

              {/* Quick Input / Scan Barcode Test */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-900">
                <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                  Input Cepat Barcode QR Unit
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {tenantServices.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        playBeep();
                        setScanResult(t.ticketNo);
                        setSelectedTicketId(t.id);
                        setCameraState("success");
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-xl text-left text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-400 flex items-center justify-between cursor-pointer"
                    >
                      <span>⚡ Hubungkan QR Tiket #{t.ticketNo}</span>
                      <span className="text-[9px] text-slate-400 font-normal truncate max-w-[120px]">
                        {t.deviceName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scanner frame */}
          <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[410px] border border-zinc-800 text-center relative overflow-hidden">
            {/* Camera stream video frame */}
            {cameraState === "streaming" && (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-accent">
                  <div id="qr-scanner-element" style={{ width: "100%", minHeight: "250px" }} />
                </div>
                <div className="text-white text-xs font-mono font-bold animate-pulse flex items-center gap-2 bg-indigo-950/85 px-4 py-1.5 rounded-full border border-indigo-900/60">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  ARAHKAN QR KE KAMERA...
                </div>
              </div>
            )}

            {cameraState === "success" && selectedTicket && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-white animate-scaleUp text-left font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-zinc-800 pb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider">
                    QR Code Sukses Terbaca!
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300">
                  <p>
                    <strong>No. Tiket:</strong> #{selectedTicket.ticketNo}
                  </p>
                  <p>
                    <strong>Device:</strong> {selectedTicket.deviceName}
                  </p>
                  <p>
                    <strong>Keluhan:</strong>{" "}
                    <span className="text-zinc-400 font-sans italic">
                      {selectedTicket.customerComplaints}
                    </span>
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-400 border border-indigo-900/50 rounded font-black text-[9.5px]">
                      {selectedTicket.status}
                    </span>
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      // Simulating opening the workspace
                      setActiveTab("print");
                    }}
                    className="flex-1 py-1.5 bg-accent hover:bg-accent-hover text-white font-extrabold text-[10px] rounded-lg transition text-center"
                  >
                    Buka Slip Nota
                  </button>
                  <button
                    onClick={() => setCameraState("idle")}
                    className="px-3 py-1.5 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 font-extrabold text-[10px] rounded-lg transition"
                  >
                    Scan Ulang
                  </button>
                </div>
              </div>
            )}

            {cameraState === "idle" && (
              <div className="space-y-3.5">
                <div className="w-20 h-20 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                  <Camera className="w-10 h-10 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-zinc-200 font-bold text-sm">
                    Scanner Kamera Offline
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Klik tombol "Aktifkan Kamera HP" di sebelah kiri untuk
                    mengaktifkan video scanner QR secara langsung.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Bluetooth Printer Label 58mm / 80mm */}
      {activeTab === "thermal" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
          {/* Controls column */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4.5 space-y-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-extrabold text-xs uppercase text-slate-700 dark:text-zinc-200 tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-500" /> Bluetooth
                Printer Settings
              </h4>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Konfigurasikan ukuran pita roll kertas thermal bluetooth/USB
                untuk mencetak label sticker unit berukuran kompak.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Ukuran Lebar Kertas (Roll Tape)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setThermalTapeSize("58")}
                    className={`py-1.5 font-bold rounded-lg border text-center cursor-pointer transition ${
                      thermalTapeSize === "58"
                        ? "bg-accent-lighter text-accent border-accent/60 font-black"
                        : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    58mm (Kompak/Saku)
                  </button>
                  <button
                    onClick={() => setThermalTapeSize("80")}
                    className={`py-1.5 font-bold rounded-lg border text-center cursor-pointer transition ${
                      thermalTapeSize === "80"
                        ? "bg-accent-lighter text-accent border-accent/60 font-black"
                        : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    80mm (Desktop Thermal)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                  Pilih Mode Desain Label Sticker
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "compact",
                      label: "Sticker Unit Kompak (Sticker Label)",
                      desc: "Cocok ditempel di casing laptop / back cover HP.",
                    },
                    {
                      id: "qr_only",
                      label: "Hanya Kode QR (Mini Lacak)",
                      desc: "Sangat minimalis untuk menghemat kertas label.",
                    },
                    {
                      id: "full_receipt",
                      label: "Nota Transaksi Penuh (Receipt)",
                      desc: "Untuk diberikan langsung ke customer.",
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      onClick={() => setStickerMode(item.id as any)}
                      className={`p-2.5 border rounded-xl flex items-start gap-2 cursor-pointer transition ${
                        stickerMode === item.id
                          ? "bg-accent-lighter/50 border-indigo-200"
                          : "border-slate-100 dark:border-zinc-900 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="sticker_mode"
                        checked={stickerMode === item.id}
                        readOnly
                        className="mt-0.5 accent-accent"
                      />
                      <div className="leading-tight">
                        <strong className="text-slate-700 dark:text-zinc-200 font-bold block">
                          {item.label}
                        </strong>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedTicket ? (
                <button
                  onClick={triggerThermalPrintAnimation}
                  disabled={isThermalPrinting}
                  className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isThermalPrinting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Sedang
                      Mencetak Thermal...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" /> Cetak Label Sekarang
                    </>
                  )}
                </button>
              ) : (
                <p className="text-center text-slate-400 italic py-2">
                  Silakan pilih tiket di tab "Slip QR" untuk mencetak sticker.
                </p>
              )}
            </div>
          </div>

          {/* Thermal roll preview representation */}
          <div className="lg:col-span-7 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 flex flex-col items-center justify-start min-h-[410px] shadow-inner relative overflow-y-auto">
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 bg-slate-200/80 dark:bg-zinc-900 text-[9px] font-bold text-slate-500 dark:text-zinc-400 rounded-md uppercase font-mono tracking-wider border border-slate-300/40 z-10">
              Pratinjau Kertas Thermal Roll ({thermalTapeSize}mm)
            </div>

            {selectedTicket ? (
              <div className="w-full flex flex-col items-center pt-8">
                {/* Roll Paper spitout container */}
                <div
                  className={`bg-white text-zinc-950 font-mono shadow-xl p-4 border border-slate-200 transition-all duration-1000 origin-top overflow-hidden space-y-3 relative ${
                    thermalTapeSize === "58" ? "max-w-[190px]" : "max-w-[270px]"
                  } ${
                    isThermalPrinting
                      ? "h-0 opacity-0"
                      : thermalPrintedOutput
                        ? "h-auto border-b-4 border-b-zinc-400 shadow-emerald-500/5 animate-rollOut border-t-2 border-t-zinc-300"
                        : "h-auto border-t-2 border-t-zinc-300"
                  }`}
                  style={{
                    fontSize: thermalTapeSize === "58" ? "8px" : "10px",
                  }}
                >
                  {/* Jagged border at the top and bottom to represent torn paper */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-jagged-torn opacity-30" />

                  {/* HEADER */}
                  <div className="text-center border-b border-dashed border-zinc-300 pb-2.5">
                    <p className="font-extrabold uppercase leading-snug">
                      {businessName}
                    </p>
                    <p className="text-[7.5px] text-zinc-400 leading-none">
                      TERIMA KASIH ATAS KUNJUNGAN ANDA
                    </p>
                    <p className="text-[8px] font-bold mt-1 bg-zinc-100 py-0.5">
                      TKT: #{selectedTicket.ticketNo}
                    </p>
                  </div>

                  {/* COMPACT STICKER MODE */}
                  {stickerMode === "compact" && (
                    <div className="space-y-2 leading-tight">
                      <div>
                        <p>
                          <strong>Device:</strong> {selectedTicket.deviceName}
                        </p>
                        <p>
                          <strong>Brand:</strong>{" "}
                          {selectedTicket.deviceBrandModel || "-"}
                        </p>
                        <p>
                          <strong>Client:</strong>{" "}
                          {selectedTicket.provisionalSignatureName || "Umum"}
                        </p>
                      </div>

                      {/* Small compact QR */}
                      <div className="text-center space-y-1">
                        <img
                          src={getQrCodeUrl(selectedTicket.ticketNo)}
                          className="w-20 h-20 mx-auto border p-1 rounded bg-white"
                          alt="Compact QR"
                          referrerPolicy="no-referrer"
                        />
                        <p className="text-[7px] text-zinc-400 uppercase font-black">
                          SCAN UNTUK TRACKING
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QR ONLY MODE */}
                  {stickerMode === "qr_only" && (
                    <div className="text-center space-y-2 py-1 leading-none">
                      <p className="font-bold">#{selectedTicket.ticketNo}</p>
                      <img
                        src={getQrCodeUrl(selectedTicket.ticketNo)}
                        className="w-28 h-28 mx-auto border p-1 bg-white"
                        alt="Sticker QR Only"
                        referrerPolicy="no-referrer"
                      />
                      <p className="text-[7.5px] font-bold text-zinc-400">
                        {selectedTicket.deviceName.substring(0, 18)}...
                      </p>
                    </div>
                  )}

                  {/* FULL TRANSACTION RECEIPT */}
                  {stickerMode === "full_receipt" && (
                    <div className="space-y-2 leading-tight">
                      <div className="space-y-1">
                        <p>
                          <strong>No. Nota:</strong> INV-COMP-{stableInvNo}
                        </p>
                        <p>
                          <strong>Tanggal:</strong> 2026-07-02
                        </p>
                        <p>
                          <strong>Client:</strong>{" "}
                          {selectedTicket.provisionalSignatureName ||
                            "Pelanggan"}
                        </p>
                      </div>

                      <div className="border-t border-b border-dashed border-zinc-300 py-1.5 space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{selectedTicket.deviceName}</span>
                          <span>1x</span>
                        </div>
                        <p className="text-[7.5px] text-zinc-500 italic">
                          Trouble: {selectedTicket.customerComplaints}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Estimasi Biaya:</span>
                          <span className="font-bold">
                            {formatRupiah(selectedTicket.estimatedCost)}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-400 text-[8px]">
                          <span>Metode:</span>
                          <span>Tunai/Cash</span>
                        </div>
                      </div>

                      <div className="text-center pt-1.5 border-t border-dashed border-zinc-300">
                        <img
                          src={getQrCodeUrl(selectedTicket.ticketNo)}
                          className="w-16 h-16 mx-auto border p-1 bg-white"
                          alt="Receipt QR"
                          referrerPolicy="no-referrer"
                        />
                        <p className="text-[6.5px] text-zinc-400 mt-1">
                          Lacak progres servis kapan saja via QR Code.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Jagged bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-jagged-torn opacity-30 transform rotate-180" />
                </div>

                {isThermalPrinting && (
                  <div className="text-center space-y-1 text-xs text-slate-500 font-mono py-6 animate-pulse">
                    <p className="font-bold flex items-center gap-1 justify-center">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Menyalurkan kertas thermal...
                    </p>
                    <p className="text-[10px]">
                      Pencetakan fisik via Bluetooth/USB virtual
                    </p>
                  </div>
                )}

                {thermalPrintedOutput && !isThermalPrinting && (
                  <div className="text-center pt-3 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-black uppercase tracking-wider animate-fadeIn flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />{" "}
                    Label Berhasil Dikeluarkan ({thermalTapeSize}mm Roll)
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2 my-auto">
                <Printer className="w-12 h-12 text-slate-300 dark:text-zinc-800 animate-pulse mx-auto" />
                <p className="text-xs text-slate-400 dark:text-zinc-600 font-medium">
                  Menunggu nomor tiket dipilih untuk memicu pratinjau thermal
                  roll...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
