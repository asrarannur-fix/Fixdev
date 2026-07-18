/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { safeLocalStorage } from "../utils/safeStorage";

const localStorage = safeLocalStorage;
import { useSaaS } from "../context/SaaSContext";
import {
  Layers,
  Plus,
  Users,
  Wrench,
  TrendingDown,
  QrCode,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Cpu,
  Trash2,
  Bookmark,
  Activity,
  ArrowRight,
  Clipboard,
  ShieldAlert,
  Search,
  ScanLine,
  Bell,
  MessageSquare,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface Asset {
  id: string;
  name: string;
  category: "LAPTOP" | "PRINTER" | "VEHICLE" | "TECH_TOOL" | "FURNITURE";
  serialNo: string;
  purchaseDate: string;
  purchaseCost: number;
  residualValue: number;
  usefulLifeYears: number;
  currentValue: number;
  location: string;
  custodianId: string; // Employee ID or Empty
  status: "ACTIVE" | "MAINTENANCE" | "RETIRED" | "SCRAPPED" | string;
}

interface MaintenanceRecord {
  id: string;
  assetId: string;
  maintenanceDate: string;
  type: "ROUTINE" | "REPAIR" | "CALIBRATION";
  cost: number;
  notes: string;
  status: "SCHEDULED" | "COMPLETED";
}

interface AssignmentLog {
  id: string;
  assetId: string;
  employeeName: string;
  assignDate: string;
  returnDate: string | null;
  notes: string;
}

export const AssetManager: React.FC = () => {
  const {
    employees,
    currentTenantId,
    addJournalEntry,
    accounts,
    setAccounts,
    isOnline,
    addOfflineAction,
  } = useSaaS();

  // 1. Core Assets State (loaded from localStorage with dynamic fallback)
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem(
      "saas_assets_" + (currentTenantId || "default"),
    );
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "AST-1001",
            name: "Apple MacBook Air M1 2020 Admin (Makassar)",
            category: "LAPTOP",
            serialNo: "C02DG3G2Q6L4",
            purchaseDate: "2024-01-15",
            purchaseCost: 12500000,
            residualValue: 2000000,
            usefulLifeYears: 5,
            currentValue: 8300000,
            location: "Cabang Makassar",
            custodianId: "emp-2", // Siti Rahma
            status: "ACTIVE",
          },
          {
            id: "AST-1002",
            name: "Printer Thermal Zebra ZD220 POS Label",
            category: "PRINTER",
            serialNo: "ZBR-ZD220-4491",
            purchaseDate: "2024-06-10",
            purchaseCost: 2800000,
            residualValue: 300000,
            usefulLifeYears: 4,
            currentValue: 1800000,
            location: "Gudang Utama",
            custodianId: "",
            status: "ACTIVE",
          },
          {
            id: "AST-1003",
            name: "Stasiun Solder Inframerah Jovy RE-7500",
            category: "TECH_TOOL",
            serialNo: "JVY-RE7500-291",
            purchaseDate: "2023-03-01",
            purchaseCost: 18500000,
            residualValue: 2500000,
            usefulLifeYears: 6,
            currentValue: 10500000,
            location: "Divisi Reparasi Utama",
            custodianId: "emp-1", // Andi
            status: "MAINTENANCE",
          },
          {
            id: "AST-1004",
            name: "Motor Listrik Gesits Kurir Makassar",
            category: "VEHICLE",
            serialNo: "GST-E-MKS-992",
            purchaseDate: "2025-01-10",
            purchaseCost: 24000000,
            residualValue: 6000000,
            usefulLifeYears: 6,
            currentValue: 22000000,
            location: "Gudang Logistik",
            custodianId: "",
            status: "ACTIVE",
          },
        ];
  });

  // 2. Maintenance Logs
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >(() => {
    const saved = localStorage.getItem(
      "saas_maintenance_records_" + (currentTenantId || "default"),
    );
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "MNT-101",
            assetId: "AST-1003",
            maintenanceDate: "2026-06-28",
            type: "CALIBRATION",
            cost: 450000,
            notes: "Kalibrasi sensor suhu inframerah bga rework station",
            status: "COMPLETED",
          },
          {
            id: "MNT-102",
            assetId: "AST-1004",
            maintenanceDate: "2026-07-05",
            type: "ROUTINE",
            cost: 150000,
            notes: "Servis rutin kelistrikan & rem berkala motor",
            status: "SCHEDULED",
          },
        ];
  });

  // 3. Assignment Logs
  const [assignmentLogs, setAssignmentLogs] = useState<AssignmentLog[]>(() => {
    const saved = localStorage.getItem(
      "saas_assignment_logs_" + (currentTenantId || "default"),
    );
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "ASG-001",
            assetId: "AST-1001",
            employeeName: "Siti Rahma",
            assignDate: "2024-01-20",
            returnDate: null,
            notes: "Dipinjamkan untuk operasional kasir & rekap data",
          },
          {
            id: "ASG-002",
            assetId: "AST-1003",
            employeeName: "Andi",
            assignDate: "2023-03-05",
            returnDate: null,
            notes: "Peralatan utama servis motherboard level 3",
          },
        ];
  });

  // Persist local state changes to localStorage
  React.useEffect(() => {
    localStorage.setItem(
      "saas_assets_" + (currentTenantId || "default"),
      JSON.stringify(assets),
    );
  }, [assets, currentTenantId]);

  React.useEffect(() => {
    localStorage.setItem(
      "saas_maintenance_records_" + (currentTenantId || "default"),
      JSON.stringify(maintenanceRecords),
    );
  }, [maintenanceRecords, currentTenantId]);

  React.useEffect(() => {
    localStorage.setItem(
      "saas_assignment_logs_" + (currentTenantId || "default"),
      JSON.stringify(assignmentLogs),
    );
  }, [assignmentLogs, currentTenantId]);

  // Synchronize on storage changes (e.g., when OfflineSyncModal triggers changes)
  React.useEffect(() => {
    const handleStorageSync = () => {
      const savedAssets = localStorage.getItem(
        "saas_assets_" + (currentTenantId || "default"),
      );
      const savedMnt = localStorage.getItem(
        "saas_maintenance_records_" + (currentTenantId || "default"),
      );
      const savedAsg = localStorage.getItem(
        "saas_assignment_logs_" + (currentTenantId || "default"),
      );
      if (savedAssets) setAssets(JSON.parse(savedAssets));
      if (savedMnt) setMaintenanceRecords(JSON.parse(savedMnt));
      if (savedAsg) setAssignmentLogs(JSON.parse(savedAsg));
    };

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("saas-assets-updated", handleStorageSync);
    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("saas-assets-updated", handleStorageSync);
    };
  }, []);

  // Background scheduler task state
  const [isCheckingScheduler, setIsCheckingScheduler] = useState(false);
  const [schedulerLogs, setSchedulerLogs] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    id: string;
    title: string;
    body: string;
  } | null>(null);

  const runSchedulerCheck = () => {
    setIsCheckingScheduler(true);
    setSchedulerLogs([
      "[Scheduler Server] Memulai crawler pemeriksaan pemeliharaan aset...",
      "[Crawler] Melakukan pemindaian ERP Asset Registry...",
    ]);

    setTimeout(() => {
      setSchedulerLogs((prev) => [
        ...prev,
        `[Crawler] Terdeteksi ${assets.length} aset operasional aktif. Memeriksa tanggal kalibrasi...`,
      ]);

      setTimeout(() => {
        const upcoming = maintenanceRecords.filter(
          (m) => m.status === "SCHEDULED",
        );
        setSchedulerLogs((prev) => [
          ...prev,
          `[Crawler] Terdeteksi ${upcoming.length} jadwal perawatan terjadwal.`,
        ]);

        setTimeout(() => {
          if (upcoming.length > 0) {
            upcoming.forEach((record) => {
              const asset = assets.find((a) => a.id === record.assetId);
              if (asset) {
                setSchedulerLogs((prev) => [
                  ...prev,
                  `⚠️ [CRITICAL ALERT] Aset ${asset.id} (${asset.name}) mendekati batas tanggal kalibrasi (${record.maintenanceDate})!`,
                  `[Auto Push Alert] Mengirimkan alert WhatsApp otomatis ke staff Penanggung Jawab...`,
                ]);

                // Trigger real browser notification
                setNotification({
                  id: "notif-" + Date.now(),
                  title: `⚠️ Kalibrasi Aset Tetap Terjadwal!`,
                  body: `Aset ${asset.name} (${asset.id}) membutuhkan perawatan rutin pada ${record.maintenanceDate}. Estimasi biaya: Rp ${(record.cost ?? 0).toLocaleString()}`,
                });

                // Add SaaS CRM notification/journal
                addJournalEntry(
                  "ALRT-" + record.id,
                  `[Auto Alert] Background Scheduler Triggered: Servis Aset ${asset.id}`,
                  [],
                );
              }
            });
          } else {
            setSchedulerLogs((prev) => [
              ...prev,
              "✓ Seluruh aset dalam kondisi prima. Tidak ada tanggal kalibrasi terlampaui.",
            ]);
          }
          setIsCheckingScheduler(false);
        }, 1000);
      }, 1000);
    }, 1200);
  };

  // 4. Form states
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCategory, setNewAssetCategory] =
    useState<Asset["category"]>("LAPTOP");
  const [newAssetSerial, setNewAssetSerial] = useState("");
  const [newAssetCost, setNewAssetCost] = useState("");
  const [newAssetResidual, setNewAssetResidual] = useState("");
  const [newAssetLife, setNewAssetLife] = useState("5");
  const [newAssetLocation, setNewAssetLocation] = useState("Cabang Makassar");

  // Maintenance Planner form states
  const [mntAssetId, setMntAssetId] = useState("AST-1001");
  const [mntType, setMntType] = useState<MaintenanceRecord["type"]>("ROUTINE");
  const [mntCost, setMntCost] = useState("");
  const [mntNotes, setMntNotes] = useState("");
  const [mntDate, setMntDate] = useState("2026-07-01");

  // Assignment Modal/Form states
  const [asgAssetId, setAsgAssetId] = useState("AST-1001");
  const [asgEmployeeId, setAsgEmployeeId] = useState("");
  const [asgNotes, setAsgNotes] = useState("");

  // QR scanner state engine
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);

  // Active view tabs
  const [activeSubView, setActiveSubView] = useState<
    "DIRECTORY" | "MAINTENANCE" | "DEPRECIATION" | "ANALYTICS"
  >("DIRECTORY");

  // Toasts
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "warning" | "error" = "success",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Create Asset
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAssetName.trim();
    const cleanSerial = newAssetSerial.trim().toUpperCase();
    const cleanLocation = newAssetLocation.trim();
    const costNum = Math.max(0, Number(newAssetCost) || 0);
    const residualNum = Math.min(
      costNum,
      Math.max(0, Number(newAssetResidual) || Math.round(costNum * 0.1)),
    );
    const lifeYears = Math.min(
      100,
      Math.max(1, Math.trunc(Number(newAssetLife) || 5)),
    );

    // If offline, save action to local queue
    if (!isOnline) {
      addOfflineAction({
        type: "CREATE_ASSET",
        label: `Daftar Aset Baru: ${cleanName}`,
        payload: {
          name: cleanName,
          category: newAssetCategory,
          serialNo: cleanSerial,
          purchaseCost: costNum,
          residualValue: residualNum,
          usefulLifeYears: lifeYears,
          location: cleanLocation,
        },
      });
      setNewAssetName("");
      setNewAssetSerial("");
      setNewAssetCost("");
      setNewAssetResidual("");
      showToast(
        "Koneksi terputus! Tindakan pendaftaran aset disimpan ke Antrean Offline.",
        "warning",
      );
      return;
    }

    const newAsset: Asset = {
      id: "AST-" + Date.now().toString().slice(-6),
      name: cleanName,
      category: newAssetCategory,
      serialNo: cleanSerial,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseCost: costNum,
      residualValue: residualNum,
      usefulLifeYears: lifeYears,
      currentValue: costNum,
      location: cleanLocation,
      custodianId: "",
      status: "ACTIVE",
    };

    setAssets((prev) => [newAsset, ...prev]);

    // Book accounting entry for Asset Capitalization!
    const assetAccountId = `coa-${currentTenantId}-10400`; // Persediaan/Peralatan (or Asset)
    const bankAccountId = `coa-${currentTenantId}-10100`; // Kas Utama

    addJournalEntry(
      newAsset.id + "-CAP",
      `Kapitalisasi Aset Tetap Baru: ${newAsset.name}`,
      [
        { accountId: assetAccountId, debit: costNum, credit: 0 },
        { accountId: bankAccountId, debit: 0, credit: costNum },
      ],
    );

    // Subtract bank balance & Add to asset register
    if (setAccounts) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === bankAccountId)
            return { ...acc, balance: acc.balance - costNum };
          if (acc.id === assetAccountId)
            return { ...acc, balance: acc.balance + costNum };
          return acc;
        }),
      );
    }

    setNewAssetName("");
    setNewAssetSerial("");
    setNewAssetCost("");
    setNewAssetResidual("");

    showToast(
      `Aset ${newAsset.id} berhasil didaftarkan dan diposting di Buku Besar!`,
      "success",
    );
  };

  // 2. Assign Custodian
  const handleAssignCustodian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgEmployeeId) {
      showToast("Pilih karyawan untuk bertanggung jawab!", "warning");
      return;
    }

    const emp = employees.find((e) => e.id === asgEmployeeId);
    if (!emp) return;

    if (!isOnline) {
      addOfflineAction({
        type: "ASSIGN_CUSTODIAN",
        label: `Penugasan Tanggung Jawab Aset ${asgAssetId}`,
        payload: {
          assetId: asgAssetId,
          employeeId: asgEmployeeId,
          notes: asgNotes,
        },
      });
      setAsgNotes("");
      showToast(
        "Koneksi terputus! Penugasan disimpan ke Antrean Offline.",
        "warning",
      );
      return;
    }

    setAssets((prev) =>
      prev.map((a) =>
        a.id === asgAssetId ? { ...a, custodianId: asgEmployeeId } : a,
      ),
    );

    const newLog: AssignmentLog = {
      id: "ASG-" + Date.now().toString().slice(-6),
      assetId: asgAssetId,
      employeeName: emp.name,
      assignDate: new Date().toISOString().slice(0, 10),
      returnDate: null,
      notes: asgNotes || "Penugasan aset operasional rutin.",
    };

    setAssignmentLogs((prev) => [newLog, ...prev]);
    setAsgNotes("");
    showToast(
      `Tanggung jawab aset didelegasikan kepada ${emp.name}!`,
      "success",
    );
  };

  // 3. Return Asset
  const handleReturnAsset = (assetId: string) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, custodianId: "" } : a)),
    );

    setAssignmentLogs((prev) =>
      prev.map((log) =>
        log.assetId === assetId && log.returnDate === null
          ? { ...log, returnDate: new Date().toISOString().slice(0, 10) }
          : log,
      ),
    );

    showToast(
      "Aset berhasil dikembalikan ke status Standby di cabang.",
      "success",
    );
  };

  // 4. Create Scheduled Maintenance
  const handleScheduleMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mntCost) {
      showToast("Lengkapi estimasi biaya perawatan!", "warning");
      return;
    }

    if (!isOnline) {
      addOfflineAction({
        type: "SCHEDULE_MAINTENANCE",
        label: `Jadwal Pemeliharaan Aset ${mntAssetId}`,
        payload: {
          assetId: mntAssetId,
          type: mntType,
          cost: Number(mntCost),
          notes: mntNotes,
          maintenanceDate: mntDate,
        },
      });
      setMntCost("");
      setMntNotes("");
      showToast(
        "Koneksi terputus! Tindakan pemeliharaan disimpan ke Antrean Offline.",
        "warning",
      );
      return;
    }

    const newMnt: MaintenanceRecord = {
      id: "MNT-" + Date.now().toString().slice(-6),
      assetId: mntAssetId,
      maintenanceDate: mntDate,
      type: mntType,
      cost: Number(mntCost),
      notes: mntNotes || "Perawatan preventif standar.",
      status: "SCHEDULED",
    };

    setMaintenanceRecords((prev) => [newMnt, ...prev]);
    setMntCost("");
    setMntNotes("");

    showToast(
      `Jadwal perawatan ${newMnt.id} berhasil direncanakan!`,
      "success",
    );
  };

  // 5. Complete Maintenance & Post Expense
  const handleCompleteMaintenance = (id: string) => {
    const record = maintenanceRecords.find((m) => m.id === id);
    if (!record) return;

    // Mutate state
    setMaintenanceRecords((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "COMPLETED" } : m)),
    );

    setAssets((prev) =>
      prev.map((a) =>
        a.id === record.assetId ? { ...a, status: "ACTIVE" } : a,
      ),
    );

    // Book accounting entry for Maintenance Expense!
    // Debit Beban Pemeliharaan (Expense): Cost
    // Credit Cash/Bank: Cost
    const maintenanceExpenseAccountId = `coa-${currentTenantId}-50100`; // Beban Pemeliharaan (using standard expense)
    const bankAccountId = `coa-${currentTenantId}-10100`; // Kas Utama

    addJournalEntry(
      record.id + "-EXP",
      `Beban Perawatan & Servis Aset ${record.assetId}`,
      [
        {
          accountId: maintenanceExpenseAccountId,
          debit: record.cost,
          credit: 0,
        },
        { accountId: bankAccountId, debit: 0, credit: record.cost },
      ],
    );

    // Update Cash Balance in COA
    if (setAccounts) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === bankAccountId)
            return { ...acc, balance: acc.balance - record.cost };
          if (acc.id === maintenanceExpenseAccountId)
            return { ...acc, balance: acc.balance + record.cost };
          return acc;
        }),
      );
    }

    showToast(
      `Servis ${id} selesai! Biaya Rp ${(record.cost ?? 0).toLocaleString()} diposting sebagai beban operasional Buku Besar.`,
      "success",
    );
  };

  // 6. Post Monthly Depreciation Jurnal
  const postAssetDepreciation = () => {
    let totalDepreciationAmount = 0;

    // Straight line depreciation: (Cost - Residual) / (Life * 12) per month
    const updatedAssets = assets.map((asset) => {
      if (asset.status === "RETIRED" || asset.status === "SCRAPPED")
        return asset;

      const monthlyDep =
        (asset.purchaseCost - asset.residualValue) /
        (asset.usefulLifeYears * 12);
      const newBookValue = Math.max(
        asset.residualValue,
        asset.currentValue - Math.round(monthlyDep),
      );

      totalDepreciationAmount += Math.round(asset.currentValue - newBookValue);
      return {
        ...asset,
        currentValue: newBookValue,
        status: newBookValue <= asset.residualValue ? "RETIRED" : asset.status,
      };
    });

    if (totalDepreciationAmount === 0) {
      showToast(
        "Semua aset sudah mencapai nilai residu minimum (penyusutan penuh).",
        "warning",
      );
      return;
    }

    setAssets(updatedAssets);

    // Book accounting entry!
    // Debit Beban Penyusutan Aset (Expense): Total
    // Credit Akumulasi Penyusutan Aset (Contra-Asset / Cash reduction for simple display): Total
    const depExpenseAccountId = `coa-${currentTenantId}-50100`; // Beban Operasional Suku Cadang/Servis
    const accumDepAccountId = `coa-${currentTenantId}-10400`; // Persediaan Peralatan (reducing asset value)

    addJournalEntry(
      "DEP-" + new Date().toISOString().slice(0, 7),
      "Jurnal Penyusutan Aset Bulanan (Straight-Line)",
      [
        {
          accountId: depExpenseAccountId,
          debit: totalDepreciationAmount,
          credit: 0,
        },
        {
          accountId: accumDepAccountId,
          debit: 0,
          credit: totalDepreciationAmount,
        },
      ],
    );

    if (setAccounts) {
      setAccounts((prevAccounts) =>
        prevAccounts.map((acc) => {
          if (acc.id === depExpenseAccountId)
            return { ...acc, balance: acc.balance + totalDepreciationAmount };
          if (acc.id === accumDepAccountId)
            return { ...acc, balance: acc.balance - totalDepreciationAmount };
          return acc;
        }),
      );
    }

    showToast(
      `Penyusutan Bulanan Berhasil Diposting! Total: Rp ${totalDepreciationAmount.toLocaleString()} dipotong dari nilai buku seluruh aset operasional.`,
      "success",
    );
  };

  // Pindai Barcode/QR Code Aset
  const handleSimulateScan = (id: string) => {
    const matchedAsset = assets.find((a) => a.id === id);
    if (matchedAsset) {
      setScannedAsset(matchedAsset);
    }
  };

  // Math Calculations
  const totalPurchaseValue = assets.reduce((sum, a) => sum + a.purchaseCost, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciatedAmount = totalPurchaseValue - totalBookValue;
  const maintenanceExpenses = maintenanceRecords
    .filter((m) => m.status === "COMPLETED")
    .reduce((sum, m) => sum + m.cost, 0);

  // Dynamic projected depreciation data based on current active assets (Straight-Line method)
  const generateDepreciationProjectionData = () => {
    const labels = [
      "Sekarang",
      "Tahun 1",
      "Tahun 2",
      "Tahun 3",
      "Tahun 4",
      "Tahun 5",
    ];
    return labels.map((lbl, idx) => {
      const dataPoint: any = { year: lbl };
      let totalValue = 0;
      assets.forEach((ast) => {
        const annualDep =
          (ast.purchaseCost - ast.residualValue) / ast.usefulLifeYears;
        const projectedValue = Math.max(
          ast.residualValue,
          ast.purchaseCost - idx * annualDep,
        );
        const rounded = Math.round(projectedValue);
        dataPoint[ast.name] = rounded;
        totalValue += rounded;
      });
      dataPoint["Total Aset Tetap"] = totalValue;
      return dataPoint;
    });
  };

  const projectionData = generateDepreciationProjectionData();

  return (
    <div className="space-y-6" id="asset-manager-root">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold animate-fadeIn ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-zinc-950 dark:text-emerald-400 dark:border-emerald-900/40"
              : toast.type === "warning"
                ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-zinc-950 dark:text-amber-400 dark:border-amber-900/40"
                : "bg-red-50 text-red-800 border-red-200 dark:bg-zinc-950 dark:text-red-400 dark:border-red-900/40"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          )}
          {toast.type === "warning" && (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
          {toast.type === "error" && (
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Dynamic Notification Popup */}
      {notification && (
        <div className="fixed top-20 right-5 z-50 max-w-sm w-full bg-slate-900/95 dark:bg-zinc-950/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 dark:border-zinc-800/80 animate-slideDown flex gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl h-fit">
            <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-xs text-amber-400">
              {notification.title}
            </h4>
            <p className="text-[10px] text-slate-300 dark:text-slate-400 leading-relaxed">
              {notification.body}
            </p>
            <div className="flex items-center gap-2 pt-1.5">
              <button
                onClick={() => {
                  showToast(
                    "Staff penanggung jawab telah diberi alert WhatsApp otomatis!",
                  );
                  setNotification(null);
                }}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Kirim WhatsApp CRM</span>
              </button>
              <button
                onClick={() => setNotification(null)}
                className="px-2 py-1 bg-slate-800 dark:bg-zinc-900 hover:bg-slate-700 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 font-extrabold text-[9px] rounded-lg cursor-pointer transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 text-white rounded-3xl p-6 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded-full">
                EAM System Active
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-1">
              Sistem Manajemen Aset Perusahaan
            </h2>
            <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 max-w-xl">
              Catat laptop, printer, kendaraan, dan toolkit teknisi. Delegasikan
              tanggung jawab custodian staff, jadwalkan kalibrasi, dan
              akumulasikan penyusutan aset otomatis ke Jurnal Buku Besar ERP.
            </p>
          </div>
          <button
            onClick={postAssetDepreciation}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer select-none"
          >
            <TrendingDown className="w-4 h-4" />
            <span>Posting Jurnal Penyusutan Bulanan</span>
          </button>
        </div>
      </div>

      {/* EAM Inner Sub-nav */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-850 pb-0.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveSubView("DIRECTORY");
            setScannedAsset(null);
          }}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeSubView === "DIRECTORY"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Daftar & Penugasan Aset
        </button>
        <button
          onClick={() => {
            setActiveSubView("MAINTENANCE");
            setScannedAsset(null);
          }}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeSubView === "MAINTENANCE"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Pemeliharaan & Servis Alat
        </button>
        <button
          onClick={() => {
            setActiveSubView("DEPRECIATION");
            setScannedAsset(null);
          }}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeSubView === "DEPRECIATION"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Garis Penyusutan (Depreciation)
        </button>
        <button
          onClick={() => {
            setActiveSubView("ANALYTICS");
            setScannedAsset(null);
          }}
          className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer select-none whitespace-nowrap ${
            activeSubView === "ANALYTICS"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          Laporan Siklus Hidup Aset
        </button>
      </div>

      {/* RENDER VIEW: DIRECTORY */}
      {activeSubView === "DIRECTORY" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Bento Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                  Nilai Aset Tetap Terkapitalisasi
                </p>
                <p className="text-xl font-black text-slate-900 dark:text-zinc-100 mt-1 font-mono">
                  Rp {totalPurchaseValue.toLocaleString()}
                </p>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Total Nilai Perolehan
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <Bookmark className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                  Nilai Buku Saat Ini (Book Value)
                </p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                  Rp {totalBookValue.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Setelah dikurangi akumulasi penyusutan
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                  Akumulasi Penyusutan Berjalan
                </p>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  Rp {totalDepreciatedAmount.toLocaleString()}
                </p>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                  Depreciation Rate 16.7%
                </span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Core asset lists */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Clipboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Katalog Inventaris & Registrasi Aset Perusahaan</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-3 py-2">ID & Nama Aset</th>
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Suku/Lokasi</th>
                      <th className="px-3 py-2 text-right">Nilai Buku</th>
                      <th className="px-3 py-2 text-center">Custodian</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {assets.map((ast) => {
                      const custodianName =
                        employees.find((e) => e.id === ast.custodianId)?.name ||
                        "Not Assigned (Standby)";
                      return (
                        <tr
                          key={ast.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                        >
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                              {ast.name}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              SN: {ast.serialNo} · Tag:{" "}
                              <strong>{ast.id}</strong>
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-zinc-300 font-mono">
                              {ast.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-500 dark:text-slate-400 font-medium">
                            {ast.location}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <p className="font-mono text-slate-800 dark:text-zinc-200 font-bold">
                              Rp {ast.currentValue.toLocaleString()}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              Cost: Rp {ast.purchaseCost.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {ast.custodianId ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                                  {custodianName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">
                                Tersedia
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right space-x-1.5">
                            <button
                              onClick={() => setShowQRModal(ast.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-zinc-400 cursor-pointer inline-flex items-center"
                              title="Generate QR Label"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            {ast.custodianId && (
                              <button
                                onClick={() => handleReturnAsset(ast.id)}
                                className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 font-bold text-[9px] rounded border border-rose-100 dark:border-rose-900/35"
                              >
                                Return
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar registration form & Delegation */}
            <div className="space-y-6">
              {/* Asset Register Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Registrasi Aset Tetap</span>
                </h3>
                <form
                  onSubmit={handleCreateAsset}
                  className="mt-3 space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Nama Deskriptif Aset
                    </label>
                    <input
                      type="text"
                      placeholder="Laptop Dell XPS 13 Karyawan"
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Kategori
                      </label>
                      <select
                        value={newAssetCategory}
                        onChange={(e) =>
                          setNewAssetCategory(e.target.value as any)
                        }
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      >
                        <option value="LAPTOP">Laptop / Komputer</option>
                        <option value="PRINTER">Printer / Zebra Label</option>
                        <option value="VEHICLE">Kendaraan Operasional</option>
                        <option value="TECH_TOOL">
                          Alat Reparasi / Solder
                        </option>
                        <option value="FURNITURE">Mebel Kantor / Rak</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Nomor Serial / SN
                      </label>
                      <input
                        type="text"
                        placeholder="SN-991244"
                        value={newAssetSerial}
                        onChange={(e) => setNewAssetSerial(e.target.value)}
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Harga Perolehan (HPP)
                      </label>
                      <input
                        type="number"
                        placeholder="Rp 7.500.000"
                        value={newAssetCost}
                        onChange={(e) => setNewAssetCost(e.target.value)}
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                        Nilai Sisa (Residual)
                      </label>
                      <input
                        type="number"
                        placeholder="Rp 500.000"
                        value={newAssetResidual}
                        onChange={(e) => setNewAssetResidual(e.target.value)}
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Masa Manfaat (Tahun)
                      </label>
                      <select
                        value={newAssetLife}
                        onChange={(e) => setNewAssetLife(e.target.value)}
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      >
                        <option value="3">
                          3 Tahun (Peralatan Elektronik Ringan)
                        </option>
                        <option value="4">4 Tahun (Printer / Scanner)</option>
                        <option value="5">5 Tahun (Komputer / Laptop)</option>
                        <option value="6">6 Tahun (Toolkit / Mesin BGA)</option>
                        <option value="8">8 Tahun (Kendaraan / Mobil)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mb-1">
                        Lokasi Awal Cabang
                      </label>
                      <input
                        type="text"
                        value={newAssetLocation}
                        onChange={(e) => setNewAssetLocation(e.target.value)}
                        className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all cursor-pointer"
                  >
                    Keluarkan Dana & Didaftarkan
                  </button>
                </form>
              </div>

              {/* Assignment Form */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Delegasikan Custodian Aset</span>
                </h3>
                <form
                  onSubmit={handleAssignCustodian}
                  className="mt-3 space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                      Pilih Unit Aset Standby
                    </label>
                    <select
                      value={asgAssetId}
                      onChange={(e) => setAsgAssetId(e.target.value)}
                      className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    >
                      {assets
                        .filter((a) => !a.custodianId)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.id} - {a.name}
                          </option>
                        ))}
                      {assets.filter((a) => !a.custodianId).length === 0 && (
                        <option value="">Semua aset sudah terdelegasi</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                      Pilih Staff Penanggung Jawab
                    </label>
                    <select
                      value={asgEmployeeId}
                      onChange={(e) => setAsgEmployeeId(e.target.value)}
                      className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    >
                      <option value="">Pilih Karyawan</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.position})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-555 uppercase mb-1">
                      Catatan Penyerahan
                    </label>
                    <input
                      type="text"
                      placeholder="Kondisi prima, baterai 100%, lengkap casan"
                      value={asgNotes}
                      onChange={(e) => setAsgNotes(e.target.value)}
                      className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-white dark:text-zinc-200 font-bold rounded-xl shadow transition-all cursor-pointer"
                  >
                    Serahkan Tanggung Jawab Aset
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: MAINTENANCE */}
      {activeSubView === "MAINTENANCE" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            {/* Scheduled logs */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Pelacakan & Penjadwalan Servis Alat Perusahaan</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-550 text-[10px] font-mono uppercase">
                    <tr>
                      <th className="px-3 py-2">ID Servis</th>
                      <th className="px-3 py-2">Aset / Unit</th>
                      <th className="px-3 py-2">Tanggal Perbaikan</th>
                      <th className="px-3 py-2">Kategori Servis</th>
                      <th className="px-3 py-2 text-right">Biaya Perawatan</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {maintenanceRecords.map((mnt) => {
                      const asset = assets.find((a) => a.id === mnt.assetId);
                      return (
                        <tr
                          key={mnt.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20"
                        >
                          <td className="px-3 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {mnt.id}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-800 dark:text-zinc-200">
                              {asset ? asset.name : "Unknown"}
                            </p>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              ID: {mnt.assetId}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-500 dark:text-slate-400">
                            {mnt.maintenanceDate}
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">
                            {mnt.type}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-700 dark:text-zinc-300">
                            Rp {(mnt.cost ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                mnt.status === "COMPLETED"
                                  ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400"
                                  : "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 animate-pulse"
                              }`}
                            >
                              {mnt.status === "COMPLETED"
                                ? "Selesai & Buku Jurnal"
                                : "Scheduled"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {mnt.status === "SCHEDULED" ? (
                              <button
                                onClick={() =>
                                  handleCompleteMaintenance(mnt.id)
                                }
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded cursor-pointer"
                              >
                                Tandai Selesai & Posting
                              </button>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono">
                                Closed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Background Task Scheduler Checker Card */}
              <div className="mt-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-zinc-200">
                        Background Task Scheduler Alert Engine
                      </h4>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">
                        Memeriksa tanggal kalibrasi / kalibrasi terjadwal aset
                        secara berkala.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={runSchedulerCheck}
                    disabled={isCheckingScheduler}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isCheckingScheduler
                      ? "Memindai..."
                      : "Jalankan Background Task"}
                  </button>
                </div>

                {schedulerLogs.length > 0 && (
                  <div className="bg-slate-900 rounded-xl p-3 font-mono text-[10px] text-blue-400 space-y-1.5 border border-slate-800 max-h-40 overflow-y-auto shadow-inner">
                    {schedulerLogs.map((log, lidx) => (
                      <p key={lidx} className="leading-relaxed">
                        <span className="text-slate-500 font-sans mr-1">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Planner Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm h-fit">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Rencanakan Maintenance Baru</span>
              </h3>
              <form
                onSubmit={handleScheduleMaintenance}
                className="mt-3 space-y-3"
              >
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                    Pilih Peralatan / Aset
                  </label>
                  <select
                    value={mntAssetId}
                    onChange={(e) => setMntAssetId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} - {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                    Jenis Perawatan
                  </label>
                  <select
                    value={mntType}
                    onChange={(e) => setMntType(e.target.value as any)}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                  >
                    <option value="ROUTINE">
                      Servis Rutin / Kalibrasi Ringan
                    </option>
                    <option value="REPAIR">
                      Perbaikan Sparepart / Kerusakan
                    </option>
                    <option value="CALIBRATION">
                      Kalibrasi Presisi Akurasi
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                    Estimasi Biaya (Rp)
                  </label>
                  <input
                    type="number"
                    placeholder="Rp 250.000"
                    value={mntCost}
                    onChange={(e) => setMntCost(e.target.value)}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-550 uppercase mb-1">
                    Tanggal Rencana Servis
                  </label>
                  <input
                    type="date"
                    value={mntDate}
                    onChange={(e) => setMntDate(e.target.value)}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-slate-400 dark:text-slate-555 uppercase mb-1">
                    Deskripsi & Keluhan
                  </label>
                  <textarea
                    placeholder="Ganti pasta thermal, ganti karet belt motor, kalibrasi sensor inframerah solder..."
                    value={mntNotes}
                    onChange={(e) => setMntNotes(e.target.value)}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-lg p-1.5 bg-white dark:bg-zinc-950 text-slate-800 dark:text-zinc-200 outline-none h-20 resize-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  Daftarkan Jadwal Maintenance
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: DEPRECIATION */}
      {activeSubView === "DEPRECIATION" && (
        <div className="space-y-6 animate-fadeIn text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <TrendingDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Garis Amortisasi & Penyusutan Nilai Buku Aset (Straight-Line
                Method)
              </span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              Metode Garis Lurus (Straight-Line) mengalokasikan beban penyusutan
              secara merata setiap bulan selama masa manfaat aset hingga
              menyentuh nilai residu akhir. Klik tombol "Posting Penyusutan
              Bulanan" di header atas untuk menyusutkan nilai buku seluruh aset
              real-time dan menerbitkan Ledger penyesuaian.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Table of depreciation schedule per asset */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 font-bold text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                  Timeline Proyeksi Penyusutan Per Tahun (Projections)
                </div>
                <div className="p-3 space-y-4">
                  {assets.map((ast) => {
                    const annualDep =
                      (ast.purchaseCost - ast.residualValue) /
                      ast.usefulLifeYears;
                    return (
                      <div
                        key={ast.id}
                        className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800/80"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-zinc-200 text-[11px]">
                            {ast.name}
                          </span>
                          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            Tag: {ast.id}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          <div>
                            <span>Harga Perolehan</span>
                            <p className="font-bold text-slate-700 dark:text-zinc-300 mt-0.5 font-mono">
                              Rp {ast.purchaseCost.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span>Penyusutan Tahunan</span>
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                              -Rp {Math.round(annualDep).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span>Nilai Buku Sekarang</span>
                            <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                              Rp {ast.currentValue.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Interactive timeline bar */}
                        <div>
                          <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mb-1 font-mono">
                            <span>Sisa Manfaat: {ast.usefulLifeYears} Thn</span>
                            <span>
                              Limit Residu: Rp{" "}
                              {ast.residualValue.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.max(10, ((ast.currentValue - ast.residualValue) / (ast.purchaseCost - ast.residualValue)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Straight line explanation, accounting rules and logs */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-zinc-200 text-xs uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Prinsip Akuntansi PSAK 16 (Aset Tetap)</span>
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Penyusutan didefinisikan sebagai alokasi sistematis jumlah
                  yang dapat disusutkan dari suatu aset selama umur manfaatnya.
                  Biaya penyusutan diakui dalam laba rugi bulanan sebagai beban
                  operasional (Beban Non-Kas).
                </p>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h5 className="font-bold text-[10px] font-mono text-blue-900 dark:text-blue-400 uppercase">
                    Alur Buku Jurnal Akuntansi:
                  </h5>
                  <div className="space-y-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                      <span>1. Beban Penyusutan Peralatan (Debit)</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold font-mono">
                        Rp {totalDepreciatedAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1 pl-4">
                      <span>Akumulasi Penyusutan Peralatan (Kredit)</span>
                      <span className="text-slate-800 dark:text-zinc-300 font-bold font-mono">
                        Rp {totalDepreciatedAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                    *Alur ini mengurangi nilai bersih neraca aset tetap tanpa
                    mengurangi arus kas (Non-cash reduction).
                  </p>
                </div>
              </div>
            </div>

            {/* Projected Depreciation Chart (Recharts) */}
            <div className="bg-slate-900 dark:bg-zinc-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span>
                      Visualisasi Proyeksi Penyusutan Nilai Buku 5 Tahun
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Grafik interaktif garis amortisasi akumulatif per aset
                    operasional.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>Total Estimasi Aset</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={projectionData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickFormatter={(value) =>
                        `Rp ${(value / 1000000).toFixed(1)} jt`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#1e293b",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                      formatter={(value: any) => [
                        `Rp ${Number(value).toLocaleString()}`,
                        "Nilai Buku",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ color: "#94a3b8", fontSize: "9px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Total Aset Tetap"
                      stroke="#6366f1"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      name="Total Buku Gabungan"
                      activeDot={{ r: 8 }}
                    />
                    {assets.map((ast, idx) => {
                      const colors = [
                        "#f97316",
                        "#10b981",
                        "#3b82f6",
                        "#ec4899",
                        "#8b5cf6",
                      ];
                      const strokeColor = colors[idx % colors.length];
                      return (
                        <Line
                          key={ast.id}
                          type="monotone"
                          dataKey={ast.name}
                          stroke={strokeColor}
                          strokeWidth={1.5}
                          dot={{ r: 2 }}
                          name={
                            ast.name.length > 25
                              ? ast.name.slice(0, 25) + "..."
                              : ast.name
                          }
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: ANALYTICS & LIFECYCLE */}
      {activeSubView === "ANALYTICS" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Custom SVG Dashboard visual graphs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Value Lifecycle bar chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                Perbandingan Nilai Aset vs Penyusutan
              </h3>

              {/* SVG simple bar comparison */}
              <div className="h-60 flex flex-col justify-end space-y-4 pt-4">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Harga Perolehan Aset (Capitalized Cost)
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                      Rp {totalPurchaseValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-6 rounded-xl overflow-hidden relative border border-slate-200/50 dark:border-slate-800/80">
                    <div
                      className="bg-blue-600 h-6 rounded-xl text-[10px] text-white font-extrabold flex items-center pl-3"
                      style={{ width: "100%" }}
                    >
                      100% Capitalized
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Nilai Buku Berjalan (Current Book Value)
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rp {totalBookValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-6 rounded-xl overflow-hidden relative border border-slate-200/50 dark:border-slate-800/80">
                    <div
                      className="bg-emerald-500 h-6 rounded-xl text-[10px] text-white font-extrabold flex items-center pl-3"
                      style={{
                        width: `${(totalBookValue / totalPurchaseValue) * 100}%`,
                      }}
                    >
                      {Math.round((totalBookValue / totalPurchaseValue) * 100)}%
                      Book Value
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Total Akumulasi Penyusutan (Depreciation)
                    </span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      Rp {totalDepreciatedAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-6 rounded-xl overflow-hidden relative border border-slate-200/50 dark:border-slate-800/80">
                    <div
                      className="bg-rose-500 h-6 rounded-xl text-[10px] text-white font-extrabold flex items-center pl-3"
                      style={{
                        width: `${(totalDepreciatedAmount / totalPurchaseValue) * 100}%`,
                      }}
                    >
                      {Math.round(
                        (totalDepreciatedAmount / totalPurchaseValue) * 100,
                      )}
                      % Depreciated
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category asset count donut chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Distribusi Sektor Aset Operasional
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Total {assets.length} Aset terdaftar lintas divisi
                  operasional.
                </p>
              </div>

              {/* Bento sector breakdowns */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
                  <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 uppercase font-bold">
                    Laptops & PCs
                  </span>
                  <p className="text-base font-black text-slate-800 dark:text-zinc-250 mt-1">
                    2 Unit
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    Penyusutan 5 Thn
                  </span>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl">
                  <span className="text-[9px] font-mono text-amber-500 dark:text-amber-400 uppercase font-bold">
                    Printers POS
                  </span>
                  <p className="text-base font-black text-slate-800 dark:text-zinc-250 mt-1">
                    1 Unit
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    Penyusutan 4 Thn
                  </span>
                </div>
                <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-xl">
                  <span className="text-[9px] font-mono text-purple-500 dark:text-purple-400 uppercase font-bold">
                    Toolkit Repair
                  </span>
                  <p className="text-base font-black text-slate-800 dark:text-zinc-250 mt-1">
                    1 Unit
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    Penyusutan 6 Thn
                  </span>
                </div>
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl">
                  <span className="text-[9px] font-mono text-rose-500 dark:text-rose-400 uppercase font-bold">
                    Vehicles
                  </span>
                  <p className="text-base font-black text-slate-800 dark:text-zinc-250 mt-1">
                    1 Unit
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    Penyusutan 6 Thn
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] leading-relaxed text-blue-900 mt-4 flex items-center gap-1.5 dark:bg-zinc-800 dark:border-zinc-700 dark:text-blue-400">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  Rekomendasi Siklus Hidup: Seluruh komputer memiliki kesehatan
                  prima. Toolkit inframerah butuh kalibrasi ulang dalam 5 hari.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR LABEL MODAL */}
      {showQRModal &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-scaleUp">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="font-extrabold text-xs uppercase text-blue-900 dark:text-blue-400 tracking-wider font-mono">
                  Print Asset Tag Label
                </span>
                <button
                  onClick={() => {
                    setShowQRModal(null);
                    setScannedAsset(null);
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:text-zinc-400 text-xs font-bold font-mono cursor-pointer"
                >
                  CLOSE
                </button>
              </div>

              {/* Printable asset label with QR */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 bg-blue-600 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded-br-lg uppercase">
                  Enterprise ID
                </div>
                <p className="font-black text-slate-900 dark:text-zinc-100 text-sm mt-3">
                  {assets.find((a) => a.id === showQRModal)?.name}
                </p>

                {/* Real Generated QR Code */}
                <div className="w-32 h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mx-auto flex items-center justify-center p-2 rounded-xl shadow-inner relative group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(
                      JSON.stringify({
                        id: showQRModal,
                        name: assets.find((a) => a.id === showQRModal)?.name,
                        serial: assets.find((a) => a.id === showQRModal)
                          ?.serialNo,
                        value: assets.find((a) => a.id === showQRModal)
                          ?.currentValue,
                        location: assets.find((a) => a.id === showQRModal)
                          ?.location,
                        status: assets.find((a) => a.id === showQRModal)
                          ?.status,
                      }),
                    )}`}
                    alt="Asset QR Code"
                    className="w-28 h-28 object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-blue-600/90 text-white rounded-xl">
                    <button
                      onClick={() => handleSimulateScan(showQRModal)}
                      className="px-2.5 py-1.5 bg-white text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-md hover:bg-slate-50 transition-all"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Scan Tag</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-1">
                  <p>
                    Asset ID:{" "}
                    <strong className="font-mono dark:text-zinc-200">
                      {showQRModal}
                    </strong>
                  </p>
                  <p>
                    Branch: {assets.find((a) => a.id === showQRModal)?.location}
                  </p>
                </div>
              </div>

              {/* Scanned Scan HUD result with Maintenance and Assignments timelines */}
              {scannedAsset && (
                <div className="p-4 bg-slate-950 dark:bg-zinc-950 text-white rounded-2xl text-xs space-y-4 border border-blue-950 dark:border-blue-900/60 animate-fadeIn max-h-96 overflow-y-auto">
                  <div className="flex items-center gap-1.5 border-b border-blue-950 dark:border-blue-900/40 pb-2">
                    <ScanLine className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-[10px] font-mono uppercase text-emerald-400">
                      Scan Decrypted: 100% Verified
                    </span>
                  </div>

                  {/* Asset Details */}
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p>
                      • Aset ID:{" "}
                      <strong className="font-mono text-blue-300 dark:text-blue-400">
                        {scannedAsset.id}
                      </strong>
                    </p>
                    <p>
                      • Name:{" "}
                      <strong className="text-slate-200 dark:text-zinc-100">
                        {scannedAsset.name}
                      </strong>
                    </p>
                    <p>
                      • Serial S/N:{" "}
                      <strong className="font-mono text-slate-300 dark:text-zinc-300">
                        {scannedAsset.serialNo}
                      </strong>
                    </p>
                    <p>
                      • Buku Value:{" "}
                      <strong className="text-emerald-400 font-mono">
                        Rp {(scannedAsset.currentValue ?? 0).toLocaleString()}
                      </strong>
                    </p>
                    <p>
                      • Lokasi Aktif:{" "}
                      <strong className="text-slate-300 dark:text-zinc-300">
                        {scannedAsset.location}
                      </strong>
                    </p>
                    <p>
                      • Status Unit:{" "}
                      <strong className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-900 dark:bg-blue-950 text-blue-200 dark:text-blue-300 font-mono">
                        {scannedAsset.status}
                      </strong>
                    </p>
                  </div>

                  {/* Current Custodian / Assignment Status */}
                  <div className="border-t border-blue-950 dark:border-blue-900/40 pt-3 space-y-1.5">
                    <h4 className="font-extrabold text-[9px] font-mono uppercase text-blue-400 dark:text-blue-300 tracking-wider">
                      Status Assignment Custodian
                    </h4>
                    {scannedAsset.custodianId ? (
                      <div className="bg-slate-900 dark:bg-slate-950 p-2 rounded-xl text-[10px] space-y-1 border border-blue-950/40 dark:border-blue-900/30">
                        <p className="font-bold text-slate-200 dark:text-zinc-100 font-mono">
                          ID Personel: {scannedAsset.custodianId}
                        </p>
                        <p className="text-slate-400 dark:text-slate-550">
                          Nama:{" "}
                          {employees.find(
                            (e) => e.id === scannedAsset.custodianId,
                          )?.name || "Karyawan"}
                        </p>
                        {assignmentLogs.find(
                          (l) =>
                            l.assetId === scannedAsset.id &&
                            l.returnDate === null,
                        ) && (
                          <p className="text-[9px] text-slate-500 dark:text-slate-550 italic mt-1">
                            Catatan: "
                            {
                              assignmentLogs.find(
                                (l) =>
                                  l.assetId === scannedAsset.id &&
                                  l.returnDate === null,
                              )?.notes
                            }
                            "
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-550 text-[10px] italic">
                        Standby di Gudang (Tidak ditugaskan ke personel)
                      </p>
                    )}
                  </div>

                  {/* Maintenance & Calibration History Timeline */}
                  <div className="border-t border-blue-950 dark:border-blue-900/40 pt-3 space-y-2">
                    <h4 className="font-extrabold text-[9px] font-mono uppercase text-blue-400 dark:text-blue-300 tracking-wider">
                      Histori Pemeliharaan & Kalibrasi (
                      {
                        maintenanceRecords.filter(
                          (m) => m.assetId === scannedAsset.id,
                        ).length
                      }
                      )
                    </h4>
                    <div className="space-y-2">
                      {maintenanceRecords.filter(
                        (m) => m.assetId === scannedAsset.id,
                      ).length > 0 ? (
                        maintenanceRecords
                          .filter((m) => m.assetId === scannedAsset.id)
                          .map((record) => (
                            <div
                              key={record.id}
                              className="p-2 bg-slate-900 dark:bg-slate-950 rounded-xl text-[10px] border border-blue-950/40 dark:border-blue-900/30 space-y-1"
                            >
                              <div className="flex justify-between font-mono text-[9px]">
                                <span className="text-blue-400 dark:text-blue-300 font-bold">
                                  {record.id} ({record.type})
                                </span>
                                <span className="text-slate-500 dark:text-slate-550">
                                  {record.maintenanceDate}
                                </span>
                              </div>
                              <p className="text-slate-300 dark:text-zinc-300 font-medium">
                                "{record.notes}"
                              </p>
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="text-slate-400 dark:text-slate-550 font-mono">
                                  Biaya: Rp{" "}
                                  {(record.cost ?? 0).toLocaleString()}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                    record.status === "COMPLETED"
                                      ? "bg-emerald-950 text-emerald-400"
                                      : "bg-amber-950 text-amber-400"
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-slate-400 dark:text-slate-550 text-[10px] italic font-mono">
                          Belum ada histori pemeliharaan terdaftar.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
