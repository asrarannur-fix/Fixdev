import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSaaS } from "../context/SaaSContext";
import { useToast } from "./ui/Toast";
import {
  CheckCircle2,
  Wrench,
  Clock,
  AlertCircle,
  ArrowRight,
  BookOpen,
  QrCode,
  Search,
  Battery,
  Cpu,
  Activity,
  Zap,
  Trophy,
  PlusCircle,
  PenTool,
  Play,
  Square,
  FastForward,
  CheckSquare,
  UserCheck,
  MessageSquare,
  Bell,
  Send,
  Volume2,
  Sparkles,
} from "lucide-react";
import { ServiceStatus } from "../types";

interface TechnicianOverviewProps {
  onViewTicket?: (ticketId: string) => void;
  onSetTab?: (tab: string, subTab?: string) => void;
  onOpenKnowledgeBase?: () => void;
}

export const TechnicianOverview: React.FC<TechnicianOverviewProps> = ({
  onViewTicket,
  onSetTab,
  onOpenKnowledgeBase,
}) => {
  const { showToast } = useToast();
  const {
    scopedServices: tenantServices,
    scopedEmployees,
    currentUser,
    payroll,
    updateServiceTicket,
    requestCashAdvance,
    recordAttendance,
    scopedInternalMessages,
    addInternalMessage,
    addEmployee,
  } = useSaaS();

  const myEmployeeRecord = scopedEmployees.find(
    (e) => e.email === currentUser.email || e.id === currentUser.id,
  );
  const employeeTechId = myEmployeeRecord
    ? myEmployeeRecord.id
    : currentUser.id;
  const myTasks = tenantServices.filter(
    (s) => s.assignedTechId === employeeTechId,
  );
  const completedTasks = tenantServices.filter(
    (s) =>
      s.assignedTechId === employeeTechId && s.status === ServiceStatus.SELESAI,
  );
  const pendingTasks = myTasks.filter(
    (s) =>
      s.status === ServiceStatus.SEDANG_DIKERJAKAN ||
      s.status === ServiceStatus.DIAGNOSA,
  );
  const unassignedTasks = tenantServices.filter(
    (s) => s.status === ServiceStatus.DITERIMA && !s.assignedTechId,
  );
  const criticalTasks = pendingTasks.filter(
    (s) => s.status === ServiceStatus.DIAGNOSA,
  );

  const activeTask = pendingTasks.find(
    (s) => s.repairStartTime && !s.repairEndTime,
  );
  const nextTasks = pendingTasks.filter((s) => s.id !== activeTask?.id);

  const myPayrolls = (payroll || []).filter(
    (p) => p.employeeId === employeeTechId,
  );
  const totalCommission = myPayrolls.reduce(
    (sum, p) => sum + (p.commissions || 0),
    0,
  );

  // Live Timer for active task
  const [activeTimerSeconds, setActiveTimerSeconds] = useState<number>(0);

  const [activeAttendanceModal, setActiveAttendanceModal] = useState(false); // rename temporarily or use original
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showKasbonModal, setShowKasbonModal] = useState(false);
  const [kasbonAmount, setKasbonAmount] = useState("");
  const [kasbonReason, setKasbonReason] = useState("");
  const myAttendanceToday = myEmployeeRecord?.attendanceHistory?.find(
    (h) => h.date === new Date().toISOString().split("T")[0],
  );

  const [activePanelTab, setActivePanelTab] = useState<
    "tasks" | "chat" | "gamified_dashboard"
  >("tasks");
  const [chatInput, setChatInput] = useState("");
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState<number>(
    () => {
      return parseInt(
        localStorage.getItem(`saas_seen_msg_${currentUser.id}`) || "0",
      );
    },
  );

  const unreadMessagesCount = Math.max(
    0,
    (scopedInternalMessages || []).length - lastSeenMessageCount,
  );

  const playNotificationSound = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.35,
      );

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch {
      // Audio blocked by browser policy — no action needed
    }
  };

  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        playNotificationSound();
      }
    };
    window.addEventListener("live_notification", handleNotification);
    return () => {
      window.removeEventListener("live_notification", handleNotification);
    };
  }, []);

  useEffect(() => {
    if (activePanelTab === "chat") {
      const currentCount = (scopedInternalMessages || []).length;
      setLastSeenMessageCount(currentCount);
      localStorage.setItem(
        `saas_seen_msg_${currentUser.id}`,
        String(currentCount),
      );
    }
  }, [activePanelTab, scopedInternalMessages, currentUser.id]);

  const ticketUpdates = React.useMemo(() => {
    const list: {
      ticketNo: string;
      deviceName: string;
      status: string;
      note: string;
      timestamp: string;
      operator?: string;
    }[] = [];
    myTasks.forEach((t) => {
      (t.timeline || []).forEach((evt) => {
        list.push({
          ticketNo: t.ticketNo,
          deviceName: t.deviceName,
          status: evt.status,
          note: evt.note,
          timestamp: evt.timestamp,
          operator: evt.operator,
        });
      });
    });
    return list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [myTasks]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (activeTask && activeTask.repairStartTime && !activeTask.repairEndTime) {
      const startMs = new Date(activeTask.repairStartTime).getTime();
      setActiveTimerSeconds(Math.floor((Date.now() - startMs) / 1000));

      interval = setInterval(() => {
        setActiveTimerSeconds(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTask]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header and Welcome */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-3 backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                Terminal Teknisi Aktif
              </span>
            </div>
            <p className="text-slate-300 text-sm max-w-md leading-relaxed">
              Halo,{" "}
              <span className="font-bold text-white">{currentUser.name}</span>.
              Ada{" "}
              <span className="font-bold text-emerald-400">
                {pendingTasks.length} unit
              </span>{" "}
              dalam antrian Anda hari ini.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px] flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Total Insentif Bulan Ini
              </p>
              <p className="text-xl font-black text-emerald-400">
                Rp {totalCommission.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (!myEmployeeRecord) {
                    addEmployee({
                      name: currentUser.name,
                      email: currentUser.email,
                      position: "Teknisi",
                      division: "Teknisi",
                      contractStatus: "PERMANENT",
                      basicSalary: 3000000,
                      phone: "0800000000",
                      branchId: currentUser.branchIds?.[0] || "default-branch",
                    });
                    setTimeout(() => setShowAttendanceModal(true), 100);
                    return;
                  }
                  setShowAttendanceModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl border border-blue-500 shadow-lg cursor-pointer transition-all h-full"
              >
                Absen Kehadiran
              </button>
              <button
                onClick={() => {
                  if (!myEmployeeRecord) {
                    addEmployee({
                      name: currentUser.name,
                      email: currentUser.email,
                      position: "Teknisi",
                      division: "Teknisi",
                      contractStatus: "PERMANENT",
                      basicSalary: 3000000,
                      phone: "0800000000",
                      branchId: currentUser.branchIds?.[0] || "default-branch",
                    });
                    setTimeout(() => setShowKasbonModal(true), 100);
                    return;
                  }
                  setShowKasbonModal(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl border border-amber-400 shadow-lg cursor-pointer transition-all h-full"
                id="btn-kasbon"
              >
                Pengajuan Kasbon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Control Panel (Active Task Highlight) */}
      {activeTask && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 w-full">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-accent text-white text-[10px] font-bold rounded uppercase tracking-widest animate-pulse">
                  Sedang Dikerjakan
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                  #{activeTask.ticketNo}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100 mb-1">
                {activeTask.deviceName}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 border-l-2 border-indigo-200 pl-3">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Keluhan:
                </span>{" "}
                {activeTask.customerComplaints}
              </p>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="text-center sm:text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Durasi Pengerjaan (SLA)
                </p>
                <div className="text-3xl font-mono font-black text-slate-800 dark:text-zinc-100 tracking-tight">
                  {Math.floor(activeTimerSeconds / 3600)
                    .toString()
                    .padStart(2, "0")}
                  :
                  {Math.floor((activeTimerSeconds % 3600) / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(activeTimerSeconds % 60).toString().padStart(2, "0")}
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block mx-2"></div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onViewTicket && onViewTicket(activeTask.id)}
                  className="flex-1 sm:flex-none px-4 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
                >
                  Buka Workspace <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => onSetTab && onSetTab("services", "new-ticket")}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-accent/50 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-accent-lighter text-accent rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Terima Unit Baru
          </span>
        </button>

        <button
          onClick={() => onSetTab && onSetTab("services", "list")}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <QrCode className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Scan / Cari Tiket
          </span>
        </button>

        <button
          onClick={() => onSetTab && onSetTab("inventory", "small-parts")}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-amber-300 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all">
            <Cpu className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Cari Komponen
          </span>
        </button>

        <button
          onClick={() => onOpenKnowledgeBase && onOpenKnowledgeBase()}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:border-rose-300 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Skema & Panduan
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-blue-50 opacity-50">
            <PenTool className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <PenTool className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Total Ditugaskan
              </span>
            </div>
            <span className="text-3xl font-black text-slate-800">
              {myTasks.length}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-amber-50 opacity-50">
            <Activity className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Dalam Antrian
              </span>
            </div>
            <span className="text-3xl font-black text-slate-800">
              {pendingTasks.length}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-emerald-50 opacity-50">
            <CheckCircle2 className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Selesai
              </span>
            </div>
            <span className="text-3xl font-black text-slate-800">
              {completedTasks.length}
            </span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-rose-50 opacity-50">
            <AlertCircle className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Butuh Diagnosa
              </span>
            </div>
            <span className="text-3xl font-black text-slate-800">
              {criticalTasks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Antrian Tugas & Hub Komunikasi Multi-Tab */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
          {/* Panel Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit flex-wrap gap-1">
              <button
                onClick={() => setActivePanelTab("tasks")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activePanelTab === "tasks"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FastForward className="w-4 h-4 text-indigo-500" />
                Antrian Perbaikan
                <span className="bg-accent-lighter text-accent px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {nextTasks.length}
                </span>
              </button>
              <button
                onClick={() => setActivePanelTab("chat")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                  activePanelTab === "chat"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Komunikasi
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] text-white font-bold items-center justify-center">
                      {unreadMessagesCount}
                    </span>
                  </span>
                )}
              </button>
              <button
                onClick={() => setActivePanelTab("gamified_dashboard")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activePanelTab === "gamified_dashboard"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                Insentif &amp; Leaderboard
              </button>
            </div>

            {activePanelTab === "tasks" ? (
              <span className="text-[10px] uppercase font-mono font-black text-slate-400 tracking-wider">
                SLA Garansi & Kecepatan Kerja
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[9px] uppercase tracking-widest font-black">
                  Admin Terhubung
                </span>
              </div>
            )}
          </div>

          {/* TAB CONTENT: TASKS */}
          {activePanelTab === "tasks" && (
            <div className="flex-1 flex flex-col justify-between">
              {nextTasks.length > 0 ? (
                <div className="space-y-3 flex-1 max-h-[400px] overflow-y-auto pr-2">
                  {nextTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-accent/50 hover:shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            #{task.ticketNo}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                              task.status === ServiceStatus.DIAGNOSA
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {task.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800">
                          {task.deviceName}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 border-l-2 border-slate-200 pl-2">
                          <span className="font-bold text-slate-600">
                            Keluhan:
                          </span>{" "}
                          {task.customerComplaints}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {!task.repairStartTime &&
                          task.status !== ServiceStatus.DIAGNOSA && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateServiceTicket(task.id, {
                                  repairStartTime: new Date().toISOString(),
                                  status: ServiceStatus.SEDANG_DIKERJAKAN,
                                });
                              }}
                              className="flex-1 sm:flex-none px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                            >
                              <Play className="w-3.5 h-3.5" /> Mulai
                            </button>
                          )}
                        <button
                          onClick={() => onViewTicket && onViewTicket(task.id)}
                          className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 transition"
                        >
                          Buka <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-3" />
                  <p className="text-sm font-bold text-slate-600">
                    Antrian Kosong!
                  </p>
                  <p className="text-xs mt-1 max-w-[200px] leading-relaxed">
                    Anda tidak memiliki unit tertunda selain yang sedang
                    dikerjakan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: CHAT & NOTIFICATIONS */}
          {activePanelTab === "chat" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* KOLOM KIRI: DIRECT MESSAGING CHATBOX WITH ADMIN */}
              <div className="border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 bg-slate-50 dark:bg-zinc-900/40 flex flex-col justify-between min-h-[360px] md:h-[420px]">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 dark:border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-50 rounded-full animate-pulse" />
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-slate-600">
                          AG
                        </div>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-100 leading-tight">
                          Agus Admin (Pusat)
                        </h4>
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Online • Kantor Pusat
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={playNotificationSound}
                      title="Tes Suara Notifikasi"
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-accent rounded-lg transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chat Bubble Area */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2 max-h-[220px]">
                  {scopedInternalMessages &&
                  scopedInternalMessages.length > 0 ? (
                    [...(scopedInternalMessages || [])].reverse().map((msg) => {
                      const isOwn = msg.senderRole === "TEKNISI";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${isOwn ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">
                            {isOwn ? "Saya" : msg.sender}
                          </span>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isOwn
                                ? "bg-accent text-white rounded-tr-none"
                                : "bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-tl-none text-slate-800 dark:text-zinc-100"
                            }`}
                          >
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-slate-400 font-mono mt-0.5 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                      <p className="text-xs font-bold">Belum ada obrolan</p>
                      <p className="text-[10px]">
                        Tulis pesan di bawah untuk menghubungi admin pusat.
                      </p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-zinc-800 space-y-3">
                  {/* Admin Quick Pills */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[8px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />{" "}
                      Respon Cepat Admin:
                    </span>
                    <button
                      onClick={() => {
                        addInternalMessage(
                          "Agus Admin (Pusat)",
                          "ADMIN",
                          "Kasbon Anda senilai Rp 500.000 telah disetujui oleh Owner! Silakan berkoordinasi dengan kasir cabang.",
                        );
                      }}
                      className="text-[9px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full transition"
                    >
                      💵 Setuju Kasbon
                    </button>
                    <button
                      onClick={() => {
                        addInternalMessage(
                          "Agus Admin (Pusat)",
                          "ADMIN",
                          `Tolong prioritaskan unit ${nextTasks[0]?.deviceName || "iPhone 13"} #1003 ya. Pelanggan minta dipercepat.`,
                        );
                      }}
                      className="text-[9px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full transition"
                    >
                      ⚡ Prioritas Tiket
                    </button>
                    <button
                      onClick={() => {
                        addInternalMessage(
                          "Agus Admin (Pusat)",
                          "ADMIN",
                          "Kerja bagus untuk pencapaian SLA QC 100% Anda minggu ini! Bonus insentif dihitung otomatis.",
                        );
                      }}
                      className="text-[9px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full transition"
                    >
                      ⭐ Apresiasi SLA
                    </button>
                  </div>

                  {/* Keyboard Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      addInternalMessage(
                        currentUser.name,
                        "TEKNISI",
                        chatInput,
                      );
                      setChatInput("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ketik pesan balasan ke admin cabang..."
                      className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      className="p-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl transition flex items-center justify-center shadow-md shadow-accent/10 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* KOLOM KANAN: REAL-TIME SERVICE TICKET STATUS UPDATES */}
              <div className="border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-950 flex flex-col justify-between min-h-[360px] md:h-[420px]">
                <div className="mb-2">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800 pb-2">
                    <Bell className="w-4 h-4 text-amber-500" /> Riwayat
                    Notifikasi Sistem & SLA
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Status dan pembaruan real-time pada tiket penugasan Anda.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1 max-h-[320px]">
                  {ticketUpdates && ticketUpdates.length > 0 ? (
                    ticketUpdates.slice(0, 15).map((log, idx) => {
                      const isSuccess =
                        log.status === ServiceStatus.SELESAI ||
                        log.status === ServiceStatus.DIAMBIL;
                      const isDanger =
                        log.status === ServiceStatus.DIAGNOSA ||
                        log.status === ServiceStatus.KLAIM_GARANSI;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs transition bg-slate-50 dark:bg-zinc-900 flex items-start gap-2.5 ${
                            isSuccess
                              ? "border-l-4 border-l-emerald-500 border-slate-100 dark:border-zinc-800"
                              : isDanger
                                ? "border-l-4 border-l-rose-500 border-slate-100 dark:border-zinc-800"
                                : "border-l-4 border-l-amber-500 border-slate-100 dark:border-zinc-800"
                          }`}
                        >
                          <div className="mt-0.5">
                            {isSuccess ? (
                              <span className="text-emerald-500">✅</span>
                            ) : isDanger ? (
                              <span className="text-rose-500">🚨</span>
                            ) : (
                              <span className="text-amber-500">🔧</span>
                            )}
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[10px] text-slate-700 dark:text-zinc-200">
                                #{log.ticketNo} - {log.deviceName}
                              </span>
                              <span className="text-[8px] text-slate-400 font-mono">
                                {new Date(log.timestamp).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                              {log.note}
                            </p>
                            <div className="text-[9px] text-slate-400 flex justify-between pt-1">
                              <span>
                                Oleh:{" "}
                                <span className="font-semibold">
                                  {log.operator || "System"}
                                </span>
                              </span>
                              <span>
                                {new Date(log.timestamp).toLocaleDateString(
                                  "id-ID",
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <Bell className="w-8 h-8 mb-2 text-slate-300" />
                      <p className="text-xs font-bold">Belum ada aktivitas</p>
                      <p className="text-[10px]">
                        Lakukan update status tiket Anda untuk memicu log
                        notifikasi.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: GAMIFIED LEADERBOARD & INSENTIF */}
          {activePanelTab === "gamified_dashboard" && (
            <div className="space-y-6 flex-1 animate-fadeIn">
              {/* Top summary row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-1">
                  <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 block uppercase font-bold tracking-wider">
                    Peringkat Bulan Ini
                  </span>
                  <strong className="text-amber-950 dark:text-amber-300 text-lg font-black block">
                    🏆 Rank #2 di Cabang
                  </strong>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Selisih 40 poin dari Rank #1 (Budi Teknisi).
                  </p>
                </div>

                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs space-y-1">
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 block uppercase font-bold tracking-wider">
                    Total Insentif Bulan Ini
                  </span>
                  <strong className="text-emerald-950 dark:text-emerald-300 text-lg font-black block">
                    Rp {totalCommission.toLocaleString()}
                  </strong>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Dihitung otomatis per unit sukses (20% bonus SLA).
                  </p>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-accent/20 rounded-2xl text-xs space-y-1">
                  <span className="text-[9px] font-mono text-accent dark:text-accent block uppercase font-bold tracking-wider">
                    Rating Kepuasan (CSAT)
                  </span>
                  <strong className="text-indigo-950 dark:text-indigo-300 text-lg font-black block">
                    ⭐ 4.95 / 5.0
                  </strong>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Berdasarkan 24 masukan ulasan pelanggan live.
                  </p>
                </div>
              </div>

              {/* Bottom split: Leaderboard vs Badge Achievements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Cabang Leaderboard */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-zinc-800">
                    <Trophy className="w-4 h-4 text-amber-500" /> Klasemen
                    Teknisi Teraktif (Gamified)
                  </h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {[
                      {
                        rank: 1,
                        name: "Budi Santoso",
                        points: 1420,
                        completed: 38,
                        csat: 4.9,
                        active: false,
                      },
                      {
                        rank: 2,
                        name: currentUser.name + " (Saya)",
                        points: 1380,
                        completed: 35,
                        csat: 4.95,
                        active: true,
                      },
                      {
                        rank: 3,
                        name: "Hendra Wijaya",
                        points: 1120,
                        completed: 28,
                        csat: 4.8,
                        active: false,
                      },
                      {
                        rank: 4,
                        name: "Siti Rahma",
                        points: 940,
                        completed: 21,
                        csat: 4.75,
                        active: false,
                      },
                    ].map((user, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition ${
                          user.active
                            ? "bg-amber-500/10 border-amber-300 shadow-sm"
                            : "bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                              user.rank === 1
                                ? "bg-amber-400 text-amber-950"
                                : user.rank === 2
                                  ? "bg-slate-300 text-slate-800"
                                  : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {user.rank}
                          </span>
                          <div>
                            <strong className="text-slate-800 dark:text-zinc-200 block font-bold">
                              {user.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {user.completed} Unit Perbaikan • CSAT ⭐
                              {user.csat}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-slate-700 dark:text-zinc-300">
                          {user.points} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Badge Achievements */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs uppercase text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 border-b pb-2 border-slate-100 dark:border-zinc-800">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> Medali
                    &amp; Lencana Prestasi Kerja
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        name: "SLA Master",
                        desc: "Ketepatan waktu >90%",
                        icon: "⚡",
                        earned: true,
                      },
                      {
                        name: "CSAT Champion",
                        desc: "Rating bintang 4.9+",
                        icon: "⭐",
                        earned: true,
                      },
                      {
                        name: "Soldering IC Pro",
                        desc: "Pemasangan chip mikro",
                        icon: "🔬",
                        earned: true,
                      },
                      {
                        name: "Backlight Guru",
                        desc: "Reparasi IC Display",
                        icon: "💡",
                        earned: false,
                      },
                    ].map((badge, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border text-center space-y-1 relative ${
                          badge.earned
                            ? "bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-200/60 dark:border-indigo-900/40"
                            : "bg-slate-50/50 dark:bg-zinc-900/30 border-slate-100 dark:border-zinc-900 opacity-40"
                        }`}
                      >
                        <span className="text-2xl block">{badge.icon}</span>
                        <strong className="text-[11px] font-black text-slate-800 dark:text-zinc-200 block">
                          {badge.name}
                        </strong>
                        <p className="text-[9px] text-slate-400 leading-tight block">
                          {badge.desc}
                        </p>
                        {badge.earned && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.2 bg-emerald-500 text-white text-[7px] font-bold rounded-full uppercase leading-none">
                            Aktif
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right side widgets */}
        <div className="space-y-6 flex flex-col">
          {/* Performa Kinerja */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Statistik Servis
                </h3>
              </div>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg border border-emerald-100">
                AHLI ⭐⭐⭐⭐⭐
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Penyelesaian SLA (94%)</span>
                  <span className="text-emerald-600">Sangat Baik</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: "94%" }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Skor Lolos QC (98/100)</span>
                  <span className="text-blue-600">Luar Biasa</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: "98%" }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 mt-2">
                <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                  <span>Rata-rata Waktu Servis:</span>
                  <span className="font-bold text-slate-700">
                    1 Jam 45 Menit
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Unit Baru Masuk */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Unit Terbengkalai
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                {unassignedTasks.length}
              </span>
            </div>

            {unassignedTasks.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                {unassignedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 flex flex-col gap-2 transition cursor-pointer"
                    onClick={() => onViewTicket && onViewTicket(task.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        #{task.ticketNo}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateServiceTicket(task.id, {
                            assignedTechId: employeeTechId,
                            status: ServiceStatus.DIAGNOSA,
                          });
                        }}
                        className="text-[9px] font-bold bg-accent-lighter text-accent hover:bg-indigo-100 px-2 py-1 rounded transition"
                      >
                        Ambil
                      </button>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                        {task.deviceName}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {task.customerComplaints}
                      </p>
                    </div>
                  </div>
                ))}
                {unassignedTasks.length > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-[10px] text-slate-400 font-bold hover:text-accent cursor-pointer transition">
                      Tampilkan {unassignedTasks.length - 5} tiket lainnya
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-6 h-6 text-slate-300 mb-2" />
                <p className="text-[11px] font-bold text-slate-500">Aman!</p>
                <p className="text-[9px] mt-1">Semua tiket memiliki teknisi.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAttendanceModal && myEmployeeRecord && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto shadow-2xl relative">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Absen Kehadiran
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Terminal Mandiri Teknisi
                </p>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-accent-lighter text-accent rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-10 h-10" />
                </div>
                <h4 className="font-bold text-slate-800">
                  {myEmployeeRecord.name}
                </h4>
                <p className="text-xs text-slate-500">
                  {myEmployeeRecord.position}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Tanggal
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {new Date().toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Status Hari Ini
                  </span>
                  {myAttendanceToday ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md">
                      SUDAH ABSEN
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-md">
                      BELUM ABSEN
                    </span>
                  )}
                </div>
                {myAttendanceToday && (
                  <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      Jam Masuk
                    </span>
                    <span className="text-sm font-black text-slate-800 font-mono">
                      {myAttendanceToday.checkIn}
                    </span>
                  </div>
                )}
                {myAttendanceToday?.checkOut &&
                  myAttendanceToday.checkOut !== "-" && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Jam Keluar
                      </span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {myAttendanceToday.checkOut}
                      </span>
                    </div>
                  )}
              </div>

              {!myAttendanceToday && (
                <button
                  onClick={() => {
                    const timeStr = new Date()
                      .toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      .replace(/\./g, ":");
                    recordAttendance(
                      myEmployeeRecord.id,
                      new Date().toISOString().split("T")[0],
                      timeStr,
                      undefined,
                      "PRESENT",
                    );
                    setShowAttendanceModal(false);
                  }}
                  className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 rounded-xl transition"
                >
                  Clock-In Sekarang
                </button>
              )}

              {myAttendanceToday &&
                (!myAttendanceToday.checkOut ||
                  myAttendanceToday.checkOut === "-") && (
                  <button
                    onClick={() => {
                      const timeStr = new Date()
                        .toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                        .replace(/\./g, ":");
                      recordAttendance(
                        myEmployeeRecord.id,
                        new Date().toISOString().split("T")[0],
                        myAttendanceToday.checkIn,
                        timeStr,
                        myAttendanceToday.status,
                      );
                      setShowAttendanceModal(false);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition"
                  >
                    Clock-Out Pulang
                  </button>
                )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {showKasbonModal && myEmployeeRecord && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto shadow-2xl relative">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Pengajuan Kasbon
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Isi detail pinjaman / kasbon
                </p>
              </div>
              <button
                onClick={() => setShowKasbonModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  value={kasbonAmount}
                  onChange={(e) => setKasbonAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Contoh: 500000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keperluan
                </label>
                <textarea
                  value={kasbonReason}
                  onChange={(e) => setKasbonReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none h-24 resize-none"
                  placeholder="Jelaskan alasan/keperluan..."
                />
              </div>

              <button
                onClick={() => {
                  const amount = Math.max(0, parseInt(kasbonAmount) || 0);
                  const cleanReason = kasbonReason.trim();
                  if (amount <= 0 || !cleanReason) {
                    showToast("Masukkan nominal kasbon dan alasan yang valid.", "error");
                    return;
                  }

                  if (requestCashAdvance && myEmployeeRecord) {
                    const today = new Date().toISOString().split("T")[0];
                    requestCashAdvance(myEmployeeRecord.id, {
                      amount,
                      reason: cleanReason,
                      date: today,
                    });
                    setShowKasbonModal(false);
                    setKasbonAmount("");
                    setKasbonReason("");
                  }
                }}
                disabled={!kasbonAmount || !kasbonReason}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition mt-4"
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
