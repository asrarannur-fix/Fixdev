import React, { useState, useEffect } from "react";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  MapPin,
  Compass,
  Navigation,
  Truck,
  Camera,
  CheckCircle2,
  Search,
  ClipboardList,
  Clock,
  DollarSign,
  PenTool,
  Check,
} from "lucide-react";
import { Employee } from "../types";

export const FieldServiceGps: React.FC = () => {
  const { showToast } = useToast();
  const {
    fieldVisits,
    employees,
    currentTenantId,
    currentBranchId,
    checkInFieldService,
    checkOutFieldService,
    addLog,
  } = useSaaS();

  const [selectedVisitId, setSelectedVisitId] = useState<string>("visit-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [simLat, setSimLat] = useState(-5.1476);
  const [simLng, setSimLng] = useState(119.4327);
  const [simAddress, setSimAddress] = useState(
    "Jl. AP Pettarani No. 10, Makassar",
  );
  const [photoUrl, setPhotoUrl] = useState("");
  const [reportText, setReportText] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [activeStep, setActiveStep] = useState<
    "IDLE" | "EN_ROUTE" | "ARRIVED" | "COMPLETED"
  >("IDLE");
  const [routeProgress, setRouteProgress] = useState(0);
  const [tripLogs, setTripLogs] = useState<string[]>([
    "Sistem: Menunggu petugas memulai perjalanan.",
  ]);

  const scopedVisits = fieldVisits.filter((v) => v.tenantId === currentTenantId && (!v.branchId || v.branchId === currentBranchId));
  const activeVisit = scopedVisits.find((v) => v.id === selectedVisitId);
  const technician = employees.find((e) => e.id === activeVisit?.techId && e.tenantId === currentTenantId);

  // Live routing tracking engine
  useEffect(() => {
    let timer: any;
    if (activeStep === "EN_ROUTE") {
      setRouteProgress(0);
      setTripLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Petugas mulai meluncur ke lokasi.`,
      ]);

      timer = setInterval(() => {
        setRouteProgress((p) => {
          if (p >= 100) {
            clearInterval(timer);
            setActiveStep("ARRIVED");
            setSimLat(-5.1558);
            setSimLng(119.4412);
            setSimAddress("Pangkep Office & Server Room, Makassar");
            setTripLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] GPS: Petugas terdeteksi mendekati radius 20 meter dari target.`,
              `[${new Date().toLocaleTimeString()}] GPS: Petugas tiba di lokasi dan melakukan Check-In.`,
            ]);
            // Automatically trigger check-in
            checkInFieldService(
              selectedVisitId,
              -5.1558,
              119.4412,
              "Pangkep Office & Server Room, Makassar",
            );
            return 100;
          }
          const nextP = p + 20;
          const currentLocs = [
            "Jl. AP Pettarani (Kecepatan 42 km/jam)",
            "Menembus Flyover Urip Sumoharjo",
            "Memasuki area Tol Reformasi",
            "Hampir sampai di gerbang Kawasan Industri",
          ];
          const locName = currentLocs[Math.floor(p / 25)] || "Dalam perjalanan";
          setTripLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] GPS: Petugas melintasi ${locName}.`,
          ]);
          return nextP;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [activeStep]);

  const handleStartTrip = () => {
    setActiveStep("EN_ROUTE");
    addLog(
      "Dispatch Field",
      `Petugas ${technician?.name || "Teknisi"} didelegasikan untuk kunjungan ${activeVisit?.id}`,
      "CRM",
      "LOW",
    );
  };

  const handlePhotoCapture = () => {
    setPhotoUrl(
      "https://images.unsplash.com/photo-1601524909162-be87252be298?auto=format&fit=crop&w=400&q=80",
    );
    setTripLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Kamera: Foto bukti fisik terlampir.`,
    ]);
  };

  const handleCheckout = () => {
    if (!activeVisit) {
      showToast("Kunjungan tidak valid untuk tenant aktif.", "error");
      return;
    }
    const cleanReportText = reportText.trim();
    if (!cleanReportText) {
      showToast("Mohon isi laporan hasil kunjungan servis!", "error");
      return;
    }
    if (!signatureDone) {
      showToast("Mohon lengkapi tanda tangan elektronik pelanggan!", "error");
      return;
    }
    checkOutFieldService(
      selectedVisitId,
      simLat,
      simLng,
      simAddress,
      "base64_sig_data_production",
      cleanReportText,
      photoUrl,
    );
    setActiveStep("COMPLETED");
    setTripLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Sistem: Kunjungan selesai. Komisi Rp ${(activeVisit?.commissionEarned ?? 0).toLocaleString()} dikreditkan ke teknisi.`,
    ]);
    addLog(
      "Field Service Checkout",
      `Check-out berhasil untuk tugas ${selectedVisitId} oleh ${technician?.name}`,
      "CRM",
      "MEDIUM",
    );
    showToast(
      "Kunjungan Lapangan berhasil diselesaikan! Laporan & komisi teknisi telah diposting.",
      "success",
    );
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      id="field-service-gps-container"
    >
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" /> GPS
            &amp; Field Dispatcher (Home Service)
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Modul pelacakan koordinat real-time teknisi panggilan ke rumah &amp;
            kantor klien B2B.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold font-mono">
            {fieldVisits.length} Tugas Kunjungan
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
            Live Satelit Online
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left Column: List of Jobs */}
        <div className="xl:col-span-4 border-r border-slate-100 p-5 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari klien atau tugas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl outline-none focus:border-accent font-medium text-slate-700 dark:text-zinc-300"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {scopedVisits.map((visit) => {
              const tech = employees.find((e) => e.id === visit.techId);
              const isSelected = visit.id === selectedVisitId;
              return (
                <div
                  key={visit.id}
                  onClick={() => {
                    setSelectedVisitId(visit.id);
                    setActiveStep("IDLE");
                    setRouteProgress(0);
                    setSignatureDone(false);
                    setReportText("");
                    setPhotoUrl("");
                  }}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 shadow-sm"
                      : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-extrabold font-mono uppercase ${
                        visit.checkOutTime
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : visit.checkInTime
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                      }`}
                    >
                      {visit.checkOutTime
                        ? "SELESAI"
                        : visit.checkInTime
                          ? "SEDANG BERJALAN"
                          : "DIJADWALKAN"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {visit.scheduledAt}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-blue-950 dark:text-zinc-200">
                    ID Tugas: {visit.id.toUpperCase()}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mt-1">
                    Teknisi: {tech?.name || "Belum Ditugaskan"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Catatan: {visit.notes}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />{" "}
                      Komisi: Rp{" "}
                      {(visit.commissionEarned ?? 0).toLocaleString()}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Peta GPS &rsaquo;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive GPS Satellite Map & Dispatcher */}
        <div className="xl:col-span-8 p-6 space-y-6 bg-slate-50/50">
          {activeVisit ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map View */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />{" "}
                    Radar Satelit (Makassar Area)
                  </h4>
                  <div className="text-[10px] font-mono text-slate-500">
                    LAT:{" "}
                    <span className="font-bold text-slate-700">
                      {simLat.toFixed(4)}
                    </span>{" "}
                    | LNG:{" "}
                    <span className="font-bold text-slate-700">
                      {simLng.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* SVG Map Canvas */}
                <div className="w-full h-[280px] bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center shadow-inner">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>

                  {/* Roads representation */}
                  <svg
                    className="absolute inset-0 w-full h-full text-slate-300 pointer-events-none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M 0 50 L 400 50 L 600 280"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="8"
                    />
                    <path
                      d="M 120 0 L 120 300"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="6"
                    />
                    <path
                      d="M 300 0 L 300 300"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="12"
                    />
                    <path
                      d="M 0 200 L 400 200"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="10"
                    />
                    <circle
                      cx="120"
                      cy="50"
                      r="14"
                      fill="#3b82f6"
                      fillOpacity="0.2"
                    />
                    <circle
                      cx="300"
                      cy="200"
                      r="18"
                      fill="#e11d48"
                      fillOpacity="0.2"
                    />
                  </svg>

                  {/* HQ (Branch) Marker */}
                  <div className="absolute left-[120px] top-[50px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md animate-pulse"></div>
                    <span className="text-[8px] bg-blue-950 dark:bg-blue-900 text-white font-black font-mono px-1 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                      HQ KANTOR
                    </span>
                  </div>

                  {/* Target Client Marker */}
                  <div className="absolute left-[300px] top-[200px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <MapPin className="w-6 h-6 text-rose-600 filter drop-shadow animate-bounce" />
                    <span className="text-[8px] bg-rose-600 text-white font-black font-mono px-1 py-0.5 rounded shadow whitespace-nowrap">
                      KLIEN TARGET
                    </span>
                  </div>

                  {/* Technician Moving Car Indicator */}
                  {activeStep === "EN_ROUTE" && (
                    <div
                      className="absolute transition-all duration-1000 ease-linear flex flex-col items-center"
                      style={{
                        left: `${120 + (300 - 120) * (routeProgress / 100)}px`,
                        top: `${50 + (200 - 50) * (routeProgress / 100)}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="bg-amber-500 text-white p-1 rounded-full shadow-md animate-bounce">
                        <Truck className="w-4 h-4" />
                      </div>
                      <span className="text-[8px] bg-slate-900 text-amber-400 font-bold px-1 py-0.2 rounded mt-0.5 whitespace-nowrap font-mono">
                        ON WAY
                      </span>
                    </div>
                  )}

                  {/* Arrived Indicator */}
                  {activeStep === "ARRIVED" && (
                    <div className="absolute left-[300px] top-[170px] -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full shadow-md animate-pulse">
                      <Truck className="w-4 h-4" />
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-[10px] font-semibold text-slate-700 dark:text-zinc-300 shadow-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="truncate max-w-[180px]">
                        {simAddress}
                      </span>
                    </div>
                    <span className="text-emerald-600 font-mono font-bold animate-pulse">
                      GPS Lokasi
                    </span>
                  </div>
                </div>

                {/* Live Trip Logs */}
                <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4 font-mono text-[9px] h-[135px] overflow-y-auto space-y-1.5 shadow-inner">
                  <p className="text-blue-400 font-bold border-b border-slate-800 pb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> SATELIT NAVIGATION LOGS
                  </p>
                  {tripLogs.map((log, lIdx) => (
                    <p key={lIdx} className="leading-relaxed">
                      {log}
                    </p>
                  ))}
                </div>
              </div>

              {/* Action Controller Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 mb-3">
                    <h4 className="font-extrabold text-xs text-blue-950 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />{" "}
                      Kontrol Operasi Kunjungan
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pantau dan kelola progress laporan kunjungan teknisi
                      aktif.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block mb-1 uppercase">
                        Nama Klien / Perusahaan
                      </span>
                      <p className="font-bold text-blue-950 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                        {activeVisit.notes.split("-")[0] ||
                          "Tugas Klien Corporate"}
                      </p>
                    </div>

                    {/* Step-by-Step action flow */}
                    <div className="space-y-3.5 pt-1">
                      {activeStep === "IDLE" && !activeVisit.checkInTime && (
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl space-y-2">
                          <p className="font-bold text-xs text-blue-950 dark:text-zinc-200">
                            Mulai Dispatch Tugas
                          </p>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Kirim notifikasi koordinat target GPS ke WhatsApp HP
                            teknisi dan mulai navigasi tracker.
                          </p>
                          <button
                            onClick={handleStartTrip}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition"
                          >
                            <Navigation className="w-4 h-4" /> Berangkatkan
                            Teknisi Sekarang
                          </button>
                        </div>
                      )}

                      {activeStep === "EN_ROUTE" && (
                        <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-center space-y-2.5">
                          <div className="inline-flex p-1.5 bg-amber-100 text-amber-700 rounded-full animate-bounce">
                            <Truck className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-amber-900">
                            Petugas Sedang Di Perjalanan
                          </p>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-500 h-full transition-all duration-1000"
                              style={{ width: `${routeProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-[9px] text-slate-500">
                            Pelacakan satelit GPS otomatis mentransfer status
                            ketika tiba.
                          </p>
                        </div>
                      )}

                      {(activeStep === "ARRIVED" || activeVisit.checkInTime) &&
                        !activeVisit.checkOutTime && (
                          <div className="space-y-3.5">
                            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div>
                                <p className="font-bold text-emerald-950 text-xs">
                                  Petugas Telah Check-In
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                  Waktu:{" "}
                                  {activeVisit.checkInTime ||
                                    new Date().toLocaleTimeString()}
                                </p>
                              </div>
                            </div>

                            {/* Foto Fisik */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                Ambil Foto Bukti Kerusakan / Hasil Kerja
                              </label>
                              {photoUrl ? (
                                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                                  <img
                                    src={photoUrl}
                                    className="w-full h-24 object-cover"
                                    alt="Captured"
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    onClick={() => setPhotoUrl("")}
                                    className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                                  >
                                    Ulangi
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={handlePhotoCapture}
                                  className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-600 transition bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 cursor-pointer"
                                >
                                  <Camera className="w-6 h-6" />
                                  <span className="text-[9px] font-bold">
                                    Ambil Foto Lokasi & Unit
                                  </span>
                                </button>
                              )}
                            </div>

                            {/* Laporan Laporan */}
                            <div>
                              <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                                Laporan Hasil Pekerjaan (Report)
                              </label>
                              <textarea
                                rows={2}
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                                placeholder="Cth: Mengganti kapasitor motherboard yang bocor, tes nyala normal, tegangan stabil..."
                                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-750 rounded-xl outline-none focus:border-accent dark:text-white"
                              />
                            </div>

                            {/* Tanda Tangan Digital */}
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                Tanda Tangan Digital Pelanggan
                              </label>
                              {signatureDone ? (
                                <div className="p-3 bg-slate-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800">
                                  <span className="flex items-center gap-1">
                                    <PenTool className="w-4 h-4 text-emerald-600" />{" "}
                                    Signed_e_signature.svg
                                  </span>
                                  <button
                                    onClick={() => setSignatureDone(false)}
                                    className="text-[9px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
                                  >
                                    Ulangi
                                  </button>
                                </div>
                              ) : (
                                <div
                                  onClick={() => {
                                    setIsSigning(true);
                                    setTimeout(() => {
                                      setSignatureDone(true);
                                      setIsSigning(false);
                                    }, 800);
                                  }}
                                  className="h-16 bg-slate-50 hover:bg-slate-100/80 border border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-center cursor-pointer transition text-slate-400 hover:text-blue-600 dark:bg-zinc-900 dark:border-zinc-800"
                                >
                                  {isSigning ? (
                                    <span className="text-[10px] font-mono animate-pulse">
                                      Sedang Menandatangani...
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <PenTool className="w-4 h-4 mb-0.5" />
                                      <span className="text-[9px] font-bold">
                                        Klik untuk Tanda Tangan Instant
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Checkout Button */}
                            <button
                              onClick={handleCheckout}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Selesaikan
                              Kunjungan &amp; Checkout
                            </button>
                          </div>
                        )}

                      {activeVisit.checkOutTime && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2 text-center text-xs text-emerald-950 font-medium">
                          <div className="inline-flex p-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                            <Check className="w-5 h-5" />
                          </div>
                          <p className="font-extrabold text-sm">
                            Pekerjaan Rampung Sempurna
                          </p>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Seluruh laporan terunggah dan komisi insentif
                            sebesar{" "}
                            <strong>
                              Rp{" "}
                              {(
                                activeVisit?.commissionEarned ?? 0
                              ).toLocaleString()}
                            </strong>{" "}
                            telah terkreditkan ke buku kas besar teknisi.
                          </p>
                          <div className="bg-white/80 p-2.5 border border-emerald-100/60 rounded-xl text-left text-[10px] font-mono text-slate-600 space-y-1">
                            <p>
                              <strong>Laporan:</strong>{" "}
                              {activeVisit.visitReport || "Tidak ada laporan"}
                            </p>
                            <p>
                              <strong>Check-In:</strong>{" "}
                              {activeVisit.checkInTime}
                            </p>
                            <p>
                              <strong>Check-Out:</strong>{" "}
                              {activeVisit.checkOutTime}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>GPS ID: {activeVisit.id.toUpperCase()}</span>
                  <span>COMM_ID: COM-{activeVisit.techId.toUpperCase()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
              <Truck className="w-12 h-12 text-slate-300" />
              <p className="font-bold text-sm">Tidak Ada Tugas Dipilih</p>
              <p className="text-xs">
                Silakan pilih salah satu tugas kunjungan lapangan di panel kiri
                untuk melihat navigasi satelit GPS.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
