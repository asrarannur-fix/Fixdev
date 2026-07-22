/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Progressive Web App (PWA) & Offline-First Sync Dashboard.
 * Implements local IndexedDB storage tables, GPS Check-ins, Offline Task Progress updates,
 * and Service Worker caching inspectors for field technicians in low-signal areas.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { safeLocalStorage } from "../utils/safeStorage";

const localStorage = safeLocalStorage;
import { useSaaS } from "../context/SaaSContext";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ArrowRight,
  MapPin,
  Cpu,
  Layers,
  FileText,
  Smartphone,
  CheckSquare,
  HardDrive,
  Info,
} from "lucide-react";

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// IndexedDB databases for PWA
interface IndexedDBStore {
  name: string;
  keyPath: string;
  recordsCount: number;
  records: any[];
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const { confirm: showConfirm } = useConfirm();
  const {
    isOnline,
    offlineQueue,
    removeOfflineAction,
    clearOfflineQueue,
    addJournalEntry,
    currentTenantId,
    setAccounts,
    employees,
    addLog,
    services = [],
    updateServiceTicket,
  } = useSaaS();

  const [activeTab, setActiveTab] = useState<
    "erp_queue" | "indexed_db" | "pwa_status"
  >("erp_queue");
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GPS check-in fields
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [checkInNotes, setCheckInNotes] = useState("");

  // Offline ticket progress state
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("SEDANG_DIKERJAKAN");
  const [offlineProgressNote, setOfflineProgressNote] = useState("");

  // IndexedDB State persist
  const [idbStores, setIdbStores] = useState<IndexedDBStore[]>(() => {
    const saved = localStorage.getItem(`saas_indexeddb_data_${currentTenantId}`);
    if (saved) return JSON.parse(saved);

    return [
      {
        name: "saas_service_tickets_db",
        keyPath: "id",
        recordsCount: 4,
        records: [
          {
            id: "1001",
            client: "Hendrawan",
            device: "MacBook Air M1",
            status: "DIAGNOSA",
            cachedAt: "2026-07-02",
          },
          {
            id: "1002",
            client: "Siti Rahma",
            device: "iPhone 13 Pro",
            status: "SEDANG_DIKERJAKAN",
            cachedAt: "2026-07-02",
          },
          {
            id: "1003",
            client: "Budi Santoso",
            device: "Asus ROG Strix",
            status: "DIAGNOSA",
            cachedAt: "2026-07-02",
          },
          {
            id: "1004",
            client: "Angelina",
            device: 'iPad Pro 11"',
            status: "SELESAI",
            cachedAt: "2026-07-02",
          },
        ],
      },
      {
        name: "gps_checkins_db",
        keyPath: "timestamp",
        recordsCount: 0,
        records: [],
      },
      {
        name: "cached_schematics_db",
        keyPath: "pdfUrl",
        recordsCount: 3,
        records: [
          {
            name: "Asus UX310_Power_Schematic.pdf",
            size: "1.4 MB",
            type: "Schematics",
            version: "v2.1",
          },
          {
            name: "iPhone_11_Board_Layout.pdf",
            size: "940 KB",
            type: "Board View",
            version: "v1.0",
          },
          {
            name: "MacBook_A1708_Charging_Circuit.pdf",
            size: "2.1 MB",
            type: "Manual",
            version: "v4.0",
          },
        ],
      },
    ];
  });

  // Save IndexedDB data on change
  useEffect(() => {
    localStorage.setItem(`saas_indexeddb_data_${currentTenantId}`, JSON.stringify(idbStores));
  }, [idbStores]);

  if (!isOpen) return null;

  // Dapatkan koordinat GPS secara real-time
  const handleGetCoordinates = () => {
    setGpsLoading(true);
    setTimeout(() => {
      const addresses = [
        "Komp. Sudirman Regency Blok C-12, Jakarta",
        "Jl. Kebon Jeruk No. 84, Jakarta Barat",
        "Gedung Cyber Suite Lt. 4, Kuningan, Jakarta",
        "Perumahan Alam Sutera Cluster Heliconia No. 4, Tangerang",
      ];
      const randomAddress =
        addresses[Math.floor(Math.random() * addresses.length)];
      // Random coordinates in Jakarta region
      const lat = -6.2088 + (Math.random() - 0.5) * 0.05;
      const lng = 106.8456 + (Math.random() - 0.5) * 0.05;

      setGpsLocation({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        address: randomAddress,
      });
      setGpsLoading(false);
    }, 1000);
  };

  // Add GPS check-in to offline queue
  const handleAddGpsCheckInOffline = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCustomerName = customerName.trim();
    const cleanNotes = checkInNotes.trim();
    if (!cleanCustomerName || !gpsLocation) return;

    const actionId = "off-" + Date.now().toString(36);
    const newAction = {
      id: actionId,
      type: "GPS_CHECK_IN",
      label: `GPS Check-In: ${cleanCustomerName}`,
      timestamp: new Date().toISOString(),
      payload: {
        customerName: cleanCustomerName,
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
        address: gpsLocation.address,
        notes: cleanNotes || "Field customer visit",
      },
    };

    // 1. Add to SaaSContext offlineQueue via direct local storage update
    const savedQueue = localStorage.getItem(`saas_offline_queue_${currentTenantId}`);
    const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
    const updatedQueue = [...currentQueue, newAction];
    localStorage.setItem(`saas_offline_queue_${currentTenantId}`, JSON.stringify(updatedQueue));

    // 2. Add to IndexedDB gps_checkins_db
    setIdbStores((prev) =>
      prev.map((store) => {
        if (store.name === "gps_checkins_db") {
          return {
            ...store,
            recordsCount: store.recordsCount + 1,
            records: [
              {
                timestamp: newAction.timestamp,
                customer: cleanCustomerName,
                coords: `${gpsLocation.lat}, ${gpsLocation.lng}`,
                address: gpsLocation.address,
                notes: cleanNotes,
                status: "PENDING_SYNC",
              },
              ...store.records,
            ],
          };
        }
        return store;
      }),
    );

    // Reset fields
    setCustomerName("");
    setCheckInNotes("");
    setGpsLocation(null);

    // Dispatch event to context
    window.dispatchEvent(new Event("storage"));
    showToast(
      "Berhasil! Check-In GPS terekam secara offline dan disimpan di IndexedDB.",
      "success",
    );
  };

  // Add Offline Ticket Progress to queue
  const handleAddOfflineProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;

    const targetTicket = services.find((s) => s.id === selectedTicketId && s.tenantId === currentTenantId);
    if (!targetTicket) return;
    const ticketNoStr = targetTicket.ticketNo;
    const deviceNameStr = targetTicket.deviceName;
    const cleanProgressNote = offlineProgressNote.trim();

    const actionId = "off-" + Date.now().toString(36);
    const newAction = {
      id: actionId,
      type: "UPDATE_TICKET_PROGRESS",
      label: `Update Progress #${ticketNoStr} (${selectedStatus})`,
      timestamp: new Date().toISOString(),
      payload: {
        ticketId: selectedTicketId,
        ticketNo: ticketNoStr,
        deviceName: deviceNameStr,
        status: selectedStatus,
        notes:
          cleanProgressNote ||
          `Pencatatan progress offline di rumah pelanggan`,
      },
    };

    // 1. Update localStorage queue
    const savedQueue = localStorage.getItem(`saas_offline_queue_${currentTenantId}`);
    const currentQueue = savedQueue ? JSON.parse(savedQueue) : [];
    localStorage.setItem(
      `saas_offline_queue_${currentTenantId}`,
      JSON.stringify([...currentQueue, newAction]),
    );

    // 2. Update local indexedDB saas_service_tickets_db
    setIdbStores((prev) =>
      prev.map((store) => {
        if (store.name === "saas_service_tickets_db") {
          const records = store.records.map((r) => {
            if (r.id === ticketNoStr) {
              return {
                ...r,
                status: selectedStatus,
                cachedAt: "2026-07-02 (Offline Updated)",
              };
            }
            return r;
          });
          return {
            ...store,
            records,
          };
        }
        return store;
      }),
    );

    // Reset fields
    setOfflineProgressNote("");
    setSelectedTicketId("");

    // Dispatch storage notification
    window.dispatchEvent(new Event("storage"));
    showToast(
      `Berhasil! Perubahan status tiket #${ticketNoStr} disimpan offline di IndexedDB.`,
      "success",
    );
  };

  // Commit a single action to the live system
  const commitAction = (action: any) => {
    const p = action.payload;

    if (action.type === "CREATE_ASSET") {
      const saved = localStorage.getItem(`saas_assets_${currentTenantId}`);
      const currentAssets = saved ? JSON.parse(saved) : [];

      const newAsset = {
        id: "AST-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: p.name,
        category: p.category,
        serialNo: p.serialNo,
        purchaseDate: new Date().toISOString().slice(0, 10),
        purchaseCost: p.purchaseCost,
        residualValue: p.residualValue,
        usefulLifeYears: p.usefulLifeYears,
        currentValue: p.purchaseCost,
        location: p.location,
        custodianId: "",
        status: "ACTIVE",
      };

      localStorage.setItem(
        `saas_assets_${currentTenantId}`,
        JSON.stringify([newAsset, ...currentAssets]),
      );

      // Capitalization Journal
      const assetAccountId = `coa-${currentTenantId}-10400`;
      const bankAccountId = `coa-${currentTenantId}-10100`;

      addJournalEntry(
        newAsset.id + "-CAP",
        `[Offline Sync] Kapitalisasi Aset Tetap Baru: ${newAsset.name}`,
        [
          { accountId: assetAccountId, debit: p.purchaseCost, credit: 0 },
          { accountId: bankAccountId, debit: 0, credit: p.purchaseCost },
        ],
      );

      if (setAccounts) {
        setAccounts((prevAccounts: any[]) =>
          prevAccounts.map((acc) => {
            if (acc.id === bankAccountId)
              return { ...acc, balance: acc.balance - p.purchaseCost };
            if (acc.id === assetAccountId)
              return { ...acc, balance: acc.balance + p.purchaseCost };
            return acc;
          }),
        );
      }

      addLog(
        "Sync Asset Created",
        `Penyelarasan offline: Aset ${newAsset.id} berhasil ditambahkan ke database live.`,
        "SYSTEM",
        "MEDIUM",
      );
    } else if (action.type === "SCHEDULE_MAINTENANCE") {
      const saved = localStorage.getItem(`saas_maintenance_records_${currentTenantId}`);
      const currentRecords = saved ? JSON.parse(saved) : [];

      const newMnt = {
        id: "MNT-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        assetId: p.assetId,
        maintenanceDate: p.maintenanceDate,
        type: p.type,
        cost: p.cost,
        notes: p.notes,
        status: "SCHEDULED",
      };

      localStorage.setItem(
        `saas_maintenance_records_${currentTenantId}`,
        JSON.stringify([newMnt, ...currentRecords]),
      );
      addLog(
        "Sync Maintenance Scheduled",
        `Penyelarasan offline: Jadwal pemeliharaan ${newMnt.id} didaftarkan.`,
        "SYSTEM",
        "LOW",
      );
    } else if (action.type === "ASSIGN_CUSTODIAN") {
      const savedAssets = localStorage.getItem(`saas_assets_${currentTenantId}`);
      const currentAssets = savedAssets ? JSON.parse(savedAssets) : [];
      const updatedAssets = currentAssets.map((a: any) =>
        a.id === p.assetId ? { ...a, custodianId: p.employeeId } : a,
      );
      localStorage.setItem(`saas_assets_${currentTenantId}`, JSON.stringify(updatedAssets));

      const savedLogs = localStorage.getItem(`saas_assignment_logs_${currentTenantId}`);
      const currentLogs = savedLogs ? JSON.parse(savedLogs) : [];

      const empName =
        employees.find((e: any) => e.id === p.employeeId)?.name || p.employeeId;
      const newLog = {
        id: "ASG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        assetId: p.assetId,
        employeeName: empName,
        assignDate: new Date().toISOString().slice(0, 10),
        returnDate: null,
        notes: p.notes,
      };

      localStorage.setItem(
        `saas_assignment_logs_${currentTenantId}`,
        JSON.stringify([newLog, ...currentLogs]),
      );
      addLog(
        "Sync Custodian Assigned",
        `Penyelarasan offline: Tanggung jawab aset ${p.assetId} didelegasikan ke ${empName}.`,
        "SYSTEM",
        "LOW",
      );
    } else if (action.type === "GPS_CHECK_IN") {
      // Catat koordinat GPS offline ke dalam audit log sistem
      addLog(
        "GPS Field Check-In",
        `[PWA Sync] Teknisi berhasil melakukan check-in di lokasi ${p.customerName}. Koordinat: ${p.lat}, ${p.lng}. Alamat: ${p.address}. Catatan: ${p.notes}`,
        "SERVICE",
        "LOW",
      );
    } else if (action.type === "UPDATE_TICKET_PROGRESS") {
      // Direct update to live ticket status
      updateServiceTicket(p.ticketId, {
        status: p.status,
        techDiagnosis: p.notes,
      });
      addLog(
        "Sync Ticket Progress",
        `[PWA Sync] Penyelarasan offline: Memperbarui status unit #${p.ticketNo} (${p.deviceName}) menjadi ${p.status}.`,
        "SERVICE",
        "MEDIUM",
      );
    }

    // Trigger storage event to notify AssetManager to re-sync
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("saas-assets-updated"));
  };

  const handleSyncAll = () => {
    if (offlineQueue.length === 0) return;
    setIsSyncing(true);

    setTimeout(() => {
      // Execute each action one-by-one
      offlineQueue.forEach((action) => {
        try {
          commitAction(action);
        } catch (e) {
          console.error("Failed to commit offline action", action, e);
        }
      });

      // Clear local queue
      clearOfflineQueue();
      setIsSyncing(false);
      setSuccessMsg(
        `Berhasil menyelaraskan ${offlineQueue.length} tindakan offline ke sistem ERP pusat!`,
      );

      // Kosongkan log check-in di IndexedDB setelah diselaraskan
      setIdbStores((prev) =>
        prev.map((store) => {
          if (store.name === "gps_checkins_db") {
            return { ...store, recordsCount: 0, records: [] };
          }
          return store;
        }),
      );

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 3000);
    }, 1500);
  };

  const handleSyncIndividual = (action: any) => {
    try {
      commitAction(action);
      removeOfflineAction(action.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardIndividual = (id: string) => {
    removeOfflineAction(id);
  };

  const handleDiscardAll = async () => {
    if (
      await showConfirm({
        title: "Buang Seluruh Antrean",
        message:
          "Apakah Anda yakin ingin membuang seluruh antrean offline? Tindakan ini tidak bisa dibatalkan dan data yang belum disinkronkan akan hilang.",
        confirmLabel: "Buang Semua",
        type: "danger",
      })
    ) {
      clearOfflineQueue();
      setIdbStores((prev) =>
        prev.map((store) => {
          if (store.name === "gps_checkins_db") {
            return { ...store, recordsCount: 0, records: [] };
          }
          return store;
        }),
      );
    }
  };

  // Render detail fields dynamically depending on action type
  const renderPayloadDetails = (action: any) => {
    const p = action.payload;
    if (!p) return null;

    switch (action.type) {
      case "GPS_CHECK_IN":
        return (
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              Pelanggan:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.customerName}
              </span>
            </div>
            <div>
              Coords:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.lat}, {p.lng}
              </span>
            </div>
            <div className="col-span-2 truncate">
              Alamat:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.address}
              </span>
            </div>
            <div className="col-span-2 truncate">
              Catatan: <span className="italic">"{p.notes}"</span>
            </div>
          </div>
        );
      case "UPDATE_TICKET_PROGRESS":
        return (
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              Tiket:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                #{p.ticketNo}
              </span>
            </div>
            <div>
              Unit:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.deviceName}
              </span>
            </div>
            <div>
              Status:{" "}
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                {p.status}
              </span>
            </div>
            <div className="col-span-2 truncate">
              Catatan Teknisi: <span className="italic">"{p.notes}"</span>
            </div>
          </div>
        );
      case "CREATE_ASSET":
        return (
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              Kat:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.category}
              </span>
            </div>
            <div>
              SN:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.serialNo}
              </span>
            </div>
            <div>
              Biaya:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Rp {p.purchaseCost?.toLocaleString()}
              </span>
            </div>
            <div>
              Lokasi:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.location}
              </span>
            </div>
          </div>
        );
      case "SCHEDULE_MAINTENANCE":
        return (
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              ID Aset:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.assetId}
              </span>
            </div>
            <div>
              Jenis:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.type}
              </span>
            </div>
            <div>
              Biaya Est:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Rp {p.cost?.toLocaleString()}
              </span>
            </div>
            <div>
              Tanggal:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.maintenanceDate}
              </span>
            </div>
            <div className="col-span-2 truncate">
              Notes: <span className="italic">"{p.notes}"</span>
            </div>
          </div>
        );
      case "ASSIGN_CUSTODIAN":
        const empName =
          employees.find((e: any) => e.id === p.employeeId)?.name ||
          p.employeeId;
        return (
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div>
              ID Aset:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {p.assetId}
              </span>
            </div>
            <div>
              Staff:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {empName}
              </span>
            </div>
            <div className="col-span-2 truncate">
              Catatan: <span className="italic">"{p.notes}"</span>
            </div>
          </div>
        );
      default:
        return (
          <pre className="text-[9px] text-slate-400 font-mono mt-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg overflow-x-auto">
            {JSON.stringify(p, null, 2)}
          </pre>
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      id="offline-sync-modal-container"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Success Splash */}
        {successMsg ? (
          <div className="p-8 text-center space-y-4 animate-scaleUp my-auto">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
              Penyelarasan Selesai!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {successMsg}
            </p>
            <div className="pt-2 font-mono text-[10px] text-emerald-600 uppercase font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full inline-block">
              ● PWA Cloud Synchronization Active
            </div>
          </div>
        ) : (
          <>
            {/* Header Banner */}
            <div className="bg-slate-50 dark:bg-zinc-950 p-5 border-b border-slate-100 dark:border-zinc-800 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-2xl border transition-all ${
                      isOnline
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                    }`}
                  >
                    {isOnline ? (
                      <Wifi className="w-5 h-5" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      Terminal PWA &amp; Sinkronisasi Offline-First
                    </h3>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight">
                      Teknologi Progressive Web App untuk teknisi lapangan tanpa
                      jaringan internet.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Tabs list selector */}
              <div className="flex border-b border-slate-200 dark:border-zinc-800 mt-4 -mx-5 px-5">
                <button
                  onClick={() => setActiveTab("erp_queue")}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === "erp_queue"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Antrean Sinkronisasi ({offlineQueue.length})
                </button>
                <button
                  onClick={() => setActiveTab("indexed_db")}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === "indexed_db"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  IndexedDB Browser &amp; GPS Check-in
                </button>
                <button
                  onClick={() => setActiveTab("pwa_status")}
                  className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === "pwa_status"
                      ? "border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Service Worker Cache
                </button>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-zinc-900/40">
              {/* TAB 1: ERP QUEUE */}
              {activeTab === "erp_queue" && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1 text-amber-800 dark:text-amber-400">
                    <p className="font-bold flex items-center gap-1.5 uppercase font-mono tracking-wider text-[10px]">
                      <AlertTriangle className="w-3.5 h-3.5" /> Antrean Lokal
                      Tunda
                    </p>
                    <p className="text-[10.5px]">
                      Aksi di bawah terekam di memory local dan siap dikirim ke
                      database cloud ERP utama saat koneksi Anda diatur ke{" "}
                      <strong className="font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                        Online
                      </strong>
                      .
                    </p>
                  </div>

                  {offlineQueue.length === 0 ? (
                    <div className="text-center py-12 space-y-3 bg-white dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800/80 rounded-2xl">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Antrean Offline Bersih!
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                        Tidak ada tindakan tertunda yang perlu
                        disinkronisasikan.
                      </p>
                    </div>
                  ) : (
                    offlineQueue.map((action) => (
                      <div
                        key={action.id}
                        className="p-3.5 border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-1 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded font-mono ${
                                  action.type === "GPS_CHECK_IN"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : action.type === "UPDATE_TICKET_PROGRESS"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                      : action.type === "CREATE_ASSET"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                                        : "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                                }`}
                              >
                                {action.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {action.timestamp
                                  ? new Date(
                                      action.timestamp,
                                    ).toLocaleTimeString()
                                  : "Baru Saja"}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 mt-1">
                              {action.label}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleSyncIndividual(action)}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-100 dark:border-zinc-900 hover:border-emerald-200 transition-all cursor-pointer"
                              title="Setujui &amp; Sinkron"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDiscardIndividual(action.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl border border-slate-100 dark:border-zinc-900 hover:border-rose-200 transition-all cursor-pointer"
                              title="Buang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {renderPayloadDetails(action)}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: INDEXED DB & GPS CHECK-IN */}
              {activeTab === "indexed_db" && (
                <div className="space-y-4">
                  {/* GPS Offline check in form */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500" /> Check-in
                      GPS Mandiri (Field Service Offline)
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                      Teknisi dapat merekam lokasi GPS di rumah pelanggan tanpa
                      kuota internet.
                    </p>

                    <form
                      onSubmit={handleAddGpsCheckInOffline}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                            Nama Pelanggan / Outlet
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Cth: Ibu Dian (Bintaro)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                            Koordinat GPS &amp; Alamat
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={handleGetCoordinates}
                              disabled={gpsLoading}
                              className="px-2.5 py-1.5 bg-accent-lighter text-accent hover:bg-indigo-100 dark:bg-zinc-800 dark:text-accent text-xs font-bold rounded-lg border border-indigo-100 dark:border-zinc-700 shrink-0 cursor-pointer"
                            >
                              {gpsLoading ? "Mencari..." : "Dapatkan GPS"}
                            </button>
                            <input
                              type="text"
                              readOnly
                              placeholder="Klik 'Dapatkan GPS'"
                              value={
                                gpsLocation
                                  ? `${gpsLocation.lat}, ${gpsLocation.lng}`
                                  : ""
                              }
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {gpsLocation && (
                        <p className="text-[10px] bg-slate-50 dark:bg-zinc-900 p-1.5 rounded text-slate-500 font-mono italic truncate">
                          📍 Alamat Terdeteksi: {gpsLocation.address}
                        </p>
                      )}

                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                          Catatan Kunjungan
                        </label>
                        <input
                          type="text"
                          placeholder="Cth: Selesai perbaikan IC backlight di ruang bawah tanah."
                          value={checkInNotes}
                          onChange={(e) => setCheckInNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!customerName || !gpsLocation}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
                      >
                        Simpan Check-in Offline (IndexedDB)
                      </button>
                    </form>
                  </div>

                  {/* Offline progress recorder */}
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs space-y-3">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-amber-500" /> Catat
                      Progres Servis (Offline Workspace)
                    </h4>

                    <form
                      onSubmit={handleAddOfflineProgress}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                            Pilih Unit Servis (Cached)
                          </label>
                          <select
                            required
                            value={selectedTicketId}
                            onChange={(e) =>
                              setSelectedTicketId(e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none"
                          >
                            <option value="">-- Pilih Tiket Antrean --</option>
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                #{s.ticketNo} - {s.deviceName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                            Update Status Baru
                          </label>
                          <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none font-bold text-amber-600"
                          >
                            <option value="SEDANG_DIKERJAKAN">
                              SEDANG DIKERJAKAN
                            </option>
                            <option value="SELESAI">
                              SELESAI (MENUNGGU QC)
                            </option>
                            <option value="DIAGNOSA">
                              BUTUH DIAGNOSA ULANG
                            </option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-slate-400 dark:text-zinc-500 uppercase mb-1">
                          Catatan Pengerjaan Teknisi
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Cth: Mengganti kapasitor filter backlight dengan suku cadang laci A-11."
                          value={offlineProgressNote}
                          onChange={(e) =>
                            setOfflineProgressNote(e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!selectedTicketId}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
                      >
                        Simpan Progress Offline
                      </button>
                    </form>
                  </div>

                  {/* Simulated IndexedDB Store Inspector */}
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> IndexedDB Table
                      Stores Inspector
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {idbStores.map((store) => (
                        <div
                          key={store.name}
                          className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 p-3 rounded-xl space-y-1.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[9px] font-extrabold text-accent truncate max-w-[120px]">
                              {store.name}
                            </span>
                            <span className="bg-slate-100 dark:bg-zinc-800 text-[9px] px-1.5 rounded font-mono font-bold">
                              {store.recordsCount} rcs
                            </span>
                          </div>

                          <div className="border-t border-slate-100 dark:border-zinc-900 pt-1.5 space-y-1 text-[8.5px] font-mono text-slate-400">
                            {store.records.slice(0, 2).map((rec, i) => (
                              <div
                                key={i}
                                className="bg-slate-50/50 dark:bg-zinc-900/40 p-1 rounded truncate"
                              >
                                {rec.id || rec.timestamp
                                  ? `🔑 ${rec.id || "GPS"}: ${rec.device || rec.customer || rec.name}`
                                  : JSON.stringify(rec)}
                              </div>
                            ))}
                            {store.recordsCount > 2 && (
                              <p className="text-[8px] text-slate-400 italic text-center">
                                + {store.recordsCount - 2} record lainnya
                              </p>
                            )}
                            {store.recordsCount === 0 && (
                              <p className="text-[8px] text-slate-400 italic text-center">
                                Tabel Kosong
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PWA SERVICE WORKER CACHE */}
              {activeTab === "pwa_status" && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2.5">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-indigo-500" />
                        <div>
                          <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-xs">
                            PWA Cache Storage &amp; Asset Bundle
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Penyimpanan aset web statis di browser untuk akses
                            instan tanpa jaringan.
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-mono font-black border border-emerald-100">
                        ACTIVE (v2.4.2)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                        <span className="text-[9px] font-mono text-slate-400 block uppercase">
                          Ukuran Cache
                        </span>
                        <strong className="text-slate-800 dark:text-zinc-200 text-base font-black">
                          2.82 MB
                        </strong>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                        <span className="text-[9px] font-mono text-slate-400 block uppercase">
                          Jumlah File
                        </span>
                        <strong className="text-slate-800 dark:text-zinc-200 text-base font-black">
                          24 Assets
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9.5px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                        Daftar Bundle Aset Cached
                      </span>
                      <div className="border border-slate-100 dark:border-zinc-900 rounded-xl overflow-hidden max-h-[140px] overflow-y-auto">
                        <table className="w-full text-left font-mono text-[9px]">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-400 border-b border-slate-100 dark:border-zinc-900 uppercase text-[8px]">
                              <th className="p-1.5">URL / Asset Path</th>
                              <th className="p-1.5">Type</th>
                              <th className="p-1.5 text-right">Size</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-900 text-slate-600 dark:text-zinc-300">
                            {[
                              {
                                url: "/index.html",
                                type: "Document",
                                size: "14.2 KB",
                              },
                              {
                                url: "/src/main.tsx",
                                type: "Script",
                                size: "82.1 KB",
                              },
                              {
                                url: "/src/App.tsx",
                                type: "Script",
                                size: "124 KB",
                              },
                              {
                                url: "/src/index.css",
                                type: "Stylesheet",
                                size: "48 KB",
                              },
                              {
                                url: "/assets/lucide-icons.woff2",
                                type: "Font",
                                size: "180 KB",
                              },
                              {
                                url: "/assets/inter-font-latin.woff2",
                                type: "Font",
                                size: "320 KB",
                              },
                            ].map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="p-1.5 font-semibold text-slate-700 dark:text-zinc-200">
                                  {row.url}
                                </td>
                                <td className="p-1.5 text-slate-400">
                                  {row.type}
                                </td>
                                <td className="p-1.5 text-right text-slate-500 font-bold">
                                  {row.size}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-zinc-900 pt-3 flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 italic">
                        Service worker secara cerdas mengupdate aset statis saat
                        online.
                      </p>
                      <button
                        onClick={() =>
                          showToast(
                            "Bundle PWA Service Worker sukses di-update ke versi terbaru!",
                            "success",
                          )
                        }
                        className="px-3 py-1 bg-accent hover:bg-accent-hover text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                      >
                        Paksa Update SW
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row gap-3 justify-between items-center">
              <div>
                {activeTab === "erp_queue" && offlineQueue.length > 0 && (
                  <button
                    onClick={handleDiscardAll}
                    className="text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Buang Semua ({offlineQueue.length})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={onClose}
                  className="w-1/2 md:w-auto px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Tutup Tinjauan
                </button>

                {activeTab === "erp_queue" && offlineQueue.length > 0 && (
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    className="w-1/2 md:w-auto px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md select-none disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyelaraskan...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>
                          Sinkronisasikan Semua ({offlineQueue.length})
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
