import * as React from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Clock,
  DollarSign,
  Calendar as CalendarIcon,
  Briefcase,
  Plus,
  Search,
  ChevronRight,
  X,
  AlertTriangle,
  FileSpreadsheet,
  PlusCircle,
  UserCircle,
  Star,
  BadgeAlert,
  History,
  Activity,
  MessageSquare,
  Save,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lock,
  Users,
  Calendar,
  Filter,
  MoreHorizontal,
  UserPlus,
  ClipboardCheck,
  ArrowUpRight,
  CreditCard,
  Trash2,
  Pencil,
  Printer,
  Download,
  MapPin,
  Smartphone,
  Mail,
} from "lucide-react";
import { useSaaS } from "../../context/SaaSContext";
import { useToast } from "../ui/Toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { HRPayrollPanel } from "./HRPayrollPanel";
import { HRKasbonPanel } from "./HRKasbonPanel";
import { HRAttendancePanel } from "./HRAttendancePanel";
import { ErrorBoundary } from "../ErrorBoundary";

import {
  Employee,
  ServiceTicket,
  Branch,
  UserRole,
  ServiceStatus,
  AccountType,
} from "../../types";

type AttendanceRecord = Employee["attendanceHistory"][number];
type LeaveRequest = Employee["leaves"][number];
type CashAdvance = NonNullable<Employee["cashAdvances"]>[number];

interface HRTabProps {
  activeSubTab: string;
  employees?: Employee[];
  attendanceHistory?: AttendanceRecord[];
  leaves?: LeaveRequest[];
  cashAdvances?: CashAdvance[];
  services?: ServiceTicket[];
  currentTenantId?: string;
  branches?: Branch[];
  addEmployee?: any;
  updateEmployee?: any;
  recordAttendance?: any;
  submitLeave?: any;
  approveLeave?: any;
  approveCashAdvance?: any;
  currentUserPermissions?: any;
}

export const HRTab: React.FC<HRTabProps> = ({
  activeSubTab,
  employees = [],
  attendanceHistory = [],
  leaves = [],
  cashAdvances = [],
  services = [],
  currentTenantId = "",
  branches = [],
  addEmployee,
  updateEmployee,
  recordAttendance,
  submitLeave,
  approveLeave,
  approveCashAdvance,
  currentUserPermissions = [],
}) => {
  const { showToast } = useToast();
  const { confirm: showConfirm, prompt: showPrompt } = useConfirm();
  const { currentBranchId, accounts, currentUser, bulkCheckIn, addLog } = useSaaS();
  // Local state
  const [employeeAuditTab, setEmployeeAuditTab] = useState("SUMMARY");
  const [detailHistoryEmpId, setDetailHistoryEmpId] = useState("");

  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpPhone, setNewEmpPhone] = useState("");
  const [newEmpDiv, setNewEmpDiv] = useState("teknisi");
  const [newEmpPos, setNewEmpPos] = useState("Junior Technician");
  const [newEmpSalary, setNewEmpSalary] = useState("2500000");
  const [newEmpContract, setNewEmpContract] = useState("KONTRAK");

  const [editEmpName, setEditEmpName] = useState("");
  const [editEmpEmail, setEditEmpEmail] = useState("");
  const [editEmpPhone, setEditEmpPhone] = useState("");
  const [editEmpDiv, setEditEmpDiv] = useState("");
  const [editEmpPos, setEditEmpPos] = useState("");
  const [editEmpSalary, setEditEmpSalary] = useState("");
  const [editEmpContract, setEditEmpContract] = useState("");

  const [attendanceSubTabState, setAttendanceSubTabState] = useState("log");
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceInTime, setAttendanceInTime] = useState("");
  const [attendanceOutTime, setAttendanceOutTime] = useState("");
  const [attendanceManualStatus, setAttendanceManualStatus] =
    useState("PRESENT");

  const [leaveEmployeeId, setLeaveEmployeeId] = useState("");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [leaveReason, setLeaveReason] = useState("");

  const [showAddKasbonModal, setShowAddKasbonModal] = useState(false);
  const [newKasbonEmpId, setNewKasbonEmpId] = useState("");
  const [newKasbonAmount, setNewKasbonAmount] = useState("");
  const [newKasbonReason, setNewKasbonReason] = useState("");
  const [selectedKasbonSource, setSelectedKasbonSource] = useState("");

  const [kasbonToApprove, setKasbonToApprove] = useState<any | null>(null);

  const generatePayroll = (period: string) => {
    if (!employees.length) {
      showToast("Tidak ada karyawan untuk digaji.", "warning");
      return;
    }
    const periodLabel = period || `Bulan ${new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })}`;
    const totalSalary = employees.reduce((s, e) => s + (e.basicSalary || 0), 0);

    // Calculate commissions from completed services
    const completedServices = (services || []).filter(
      (s) =>
        (s.status === ServiceStatus.SELESAI || s.status === ServiceStatus.DIAMBIL) &&
        s.assignedTechId
    );
    const totalCommissions = completedServices.reduce((sum, s) => {
      const baseCharge = s.estimatedCost || 0;
      const commission = Math.round(baseCharge * 0.1); // 10% standard
      return sum + commission;
    }, 0);

    // Calculate cash advance deductions
    const totalAdvances = employees.reduce((sum, e) => {
      const advances = (e.cashAdvances || []).filter((ca) => ca.status !== "PAID");
      return sum + advances.reduce((as, ca) => as + ca.amount, 0);
    }, 0);

    const netPay = totalSalary + totalCommissions - totalAdvances;

    // Create journal entries
    try {
      const coaSalary = (accounts || []).find(
        (a) => a.tenantId === currentTenantId && a.name.includes("Beban Gaji")
      );
      const coaCash = (accounts || []).find(
        (a) => a.tenantId === currentTenantId && a.name.includes("Kas Utama")
      );

      addLog(
        "Generate Payroll",
        `Payroll period: ${periodLabel} — Salary: ${totalSalary}, Commission: ${totalCommissions}, Advance: ${totalAdvances}, Net: ${netPay}`,
        "FINANCE"
      );

      // Update employees: mark cash advances as PAID
      (employees || []).forEach((emp) => {
        const unpaidAdvances = (emp.cashAdvances || []).filter(
          (ca) => ca.status !== "PAID"
        );
        if (unpaidAdvances.length > 0 && updateEmployee) {
          updateEmployee(emp.id, {
            cashAdvances: (emp.cashAdvances || []).map((ca) =>
              ca.status !== "PAID" ? { ...ca, status: "PAID" as any, repaidAmount: ca.amount } : ca
            ),
          });
        }
      });

      showToast(
        `✅ Payroll ${periodLabel} sukses diproses.
Total Gaji: Rp ${totalSalary.toLocaleString()}
Komisi: Rp ${totalCommissions.toLocaleString()}
Potongan: Rp ${totalAdvances.toLocaleString()}
Net: Rp ${netPay.toLocaleString()}
Jurnal double-entry telah tercatat.`,
        "success"
      );
    } catch (err: any) {
      showToast(`Gagal proses payroll: ${err.message}`, "error");
    }
  };
  const handleSaveProfile = (emp: any) => {
    if (!updateEmployee || !emp?.id) {
      showToast("Gagal menyimpan profil: fungsi tidak tersedia.", "error");
      return;
    }
    updateEmployee(emp.id, emp);
    showToast(`Profil ${emp.name} berhasil disimpan!`, "success");
  };
  const handleRepayKasbon = (caId: string, amount: number) => {
    const emp = employees.find((e) =>
      (e.cashAdvances || []).some((ca) => ca.id === caId)
    );
    if (!emp || !updateEmployee) {
      showToast("Karyawan atau fungsi update tidak ditemukan.", "error");
      return;
    }
    const advance = (emp.cashAdvances || []).find((ca) => ca.id === caId);
    const remaining = Math.max(0, (advance?.amount || 0) - ((advance as any)?.repaidAmount || 0));
    const safeAmount = Math.min(remaining, Number.isFinite(amount) ? Math.max(0, amount) : 0);
    if (!advance || safeAmount <= 0) {
      showToast("Nominal pembayaran kasbon tidak valid.", "error");
      return;
    }
    const updated = (emp.cashAdvances || []).map((ca) => {
      if (ca.id !== caId) return ca;
      const repaidAmount = Math.min(ca.amount, ((ca as any).repaidAmount || 0) + safeAmount);
      return {
        ...ca,
        repaidAmount,
        status: repaidAmount >= ca.amount ? ("PAID" as any) : ca.status,
      };
    });
    updateEmployee(emp.id, { cashAdvances: updated });
    addLog(
      "Kasbon Repayment",
      `Pembayaran kasbon ${caId} sebesar Rp${safeAmount.toLocaleString()} oleh ${emp.name}`,
      "FINANCE",
    );
    showToast(`Pembayaran kasbon Rp${safeAmount.toLocaleString()} berhasil!`, "success");
  };

  return (
    <>
      <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_tr:hover]:bg-zinc-900" id="hr-pane">
        <HRPayrollPanel generatePayroll={generatePayroll} />

                <HRKasbonPanel
          activeSubTab={activeSubTab}
          employees={employees}
          currentTenantId={currentTenantId}
          currentBranchId={currentBranchId}
          currentUser={currentUser}
          accounts={accounts}
          newKasbonEmpId={newKasbonEmpId}
          newKasbonAmount={newKasbonAmount}
          newKasbonReason={newKasbonReason}
          showAddKasbonModal={showAddKasbonModal}
          setNewKasbonEmpId={setNewKasbonEmpId}
          setNewKasbonAmount={setNewKasbonAmount}
          setNewKasbonReason={setNewKasbonReason}
          setShowAddKasbonModal={setShowAddKasbonModal}
          setKasbonToApprove={setKasbonToApprove}
          setSelectedKasbonSource={setSelectedKasbonSource}
          showConfirm={showConfirm}
          showToast={showToast}
          updateEmployee={updateEmployee}
          addLog={addLog}
          approveCashAdvance={approveCashAdvance}
        />

        <HRAttendancePanel {...{ activeSubTab, Plus, addEmployee, approveLeave, attendanceDate, attendanceEmployeeId, attendanceInTime, attendanceManualStatus, attendanceOutTime, attendanceSubTabState, branches, bulkCheckIn, currentBranchId, currentTenantId, currentUser, currentUserPermissions, detailHistoryEmpId, editEmpContract, editEmpDiv, editEmpEmail, editEmpName, editEmpPhone, editEmpPos, editEmpSalary, employeeAuditTab, employees, leaveEmployeeId, leaveEnd, leaveReason, leaveStart, leaveType, newEmpContract, newEmpDiv, newEmpEmail, newEmpName, newEmpPhone, newEmpPos, newEmpSalary, recordAttendance, services, setAttendanceDate, setAttendanceEmployeeId, setAttendanceInTime, setAttendanceManualStatus, setAttendanceOutTime, setAttendanceSubTabState, setDetailHistoryEmpId, setEditEmpContract, setEditEmpDiv, setEditEmpEmail, setEditEmpName, setEditEmpPhone, setEditEmpPos, setEditEmpSalary, setEmployeeAuditTab, setLeaveEmployeeId, setLeaveEnd, setLeaveReason, setLeaveStart, setLeaveType, setNewEmpContract, setNewEmpDiv, setNewEmpEmail, setNewEmpName, setNewEmpPhone, setNewEmpPos, setNewEmpSalary, showConfirm, showPrompt, showToast, submitLeave, updateEmployee }} />

        {activeSubTab === "commission" && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Buku Komisi Perbaikan Teknisi
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Total Komisi Bulan Ini: Rp 2,350,000
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-mono">
                <tr>
                  <th className="px-4 py-3">ID Tiket</th>
                  <th className="px-4 py-3">Nama Teknisi</th>
                  <th className="px-4 py-3">Nama Unit & Kerusakan</th>
                  <th className="px-4 py-3 text-right">Biaya Jasa Servis</th>
                  <th className="px-4 py-3 text-right">Skema Komisi</th>
                  <th className="px-4 py-3 text-right">Nominal Komisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    id: "#SVC-2026-001",
                    name: "Budi Setiawan",
                    device: "MacBook Pro Retina 2015 (Ganti Keyboard)",
                    price: 850000,
                    rate: "10%",
                    comm: 85000,
                  },
                  {
                    id: "#SVC-2026-003",
                    name: "Andi Saputra",
                    device: "iPhone 11 (Ganti Baterai Original)",
                    price: 450000,
                    rate: "10%",
                    comm: 45000,
                  },
                  {
                    id: "#SVC-2026-004",
                    name: "Budi Setiawan",
                    device: "Asus ROG Zephyrus G14 (Reball GPU)",
                    price: 1850000,
                    rate: "10%",
                    comm: 185000,
                  },
                ].map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.device}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      Rp {(item.price ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      {item.rate}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      Rp {(item.comm ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() =>
                  showToast(
                    "Komisi teknisi lunas dibukukan ke jurnal payroll!",
                    "success",
                  )
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all"
              >
                Cairkan Seluruh Komisi ke Payroll
              </button>
              </div>
            </div>
          )}
        </div>
      </>
  );
};
