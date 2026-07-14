import * as React from "react";

type AttendanceSummaryCardsProps = {
  employees: any[];
  currentTenantId: string;
  currentBranchId: string;
  attendanceDate: string;
};

export const AttendanceSummaryCards: React.FC<AttendanceSummaryCardsProps> = ({
  employees,
  currentTenantId,
  currentBranchId,
  attendanceDate,
}) => {
  const branchEmployees = employees.filter(
    (e) => e.tenantId === currentTenantId && e.branchId === currentBranchId,
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Total Karyawan
        </span>
        <span className="text-2xl font-black text-slate-850 mt-1 block">
          {branchEmployees.length} Orang
        </span>
        <span className="text-[10px] text-slate-400 block mt-1">
          Aktif di cabang ini
        </span>
      </div>
      <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
          Hadir Hari Ini
        </span>
        <span className="text-2xl font-black text-emerald-700 mt-1 block">
          {
            branchEmployees.filter((e) =>
              e.attendanceHistory?.some(
                (h) =>
                  h.date === attendanceDate &&
                  (h.status === "PRESENT" || h.status === "LATE"),
              ),
            ).length
          } Staff
        </span>
        <span className="text-[10px] text-emerald-600 block mt-1">
          Disiplin kerja 100%
        </span>
      </div>
      <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
          Terlambat (Late)
        </span>
        <span className="text-2xl font-black text-amber-700 mt-1 block">
          {
            branchEmployees.filter((e) =>
              e.attendanceHistory?.some(
                (h) => h.date === attendanceDate && h.status === "LATE",
              ),
            ).length
          } Staff
        </span>
        <span className="text-[10px] text-amber-600 block mt-1">
          Toleransi s/d 15 menit
        </span>
      </div>
      <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
          Izin / Cuti / Sakit
        </span>
        <span className="text-2xl font-black text-rose-700 mt-1 block">
          {
            branchEmployees.filter((e) =>
              e.attendanceHistory?.some(
                (h) =>
                  h.date === attendanceDate &&
                  (h.status === "LEAVE" || h.status === "ABSENT"),
              ),
            ).length
          } Staff
        </span>
        <span className="text-[10px] text-rose-600 block mt-1">
          Cuti sah terverifikasi
        </span>
      </div>
    </div>
  );
};
