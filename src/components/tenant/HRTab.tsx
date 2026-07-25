import React from 'react';
import { useSaaS } from '../../context/SaaSContext';
import { HRPayrollPanel } from './HRPayrollPanel';
import { HRKasbonPanel } from './HRKasbonPanel';
import { HRAttendancePanel } from './HRAttendancePanel';
import { CommissionPanel } from './hr/CommissionPanel';
import { OvertimePanel } from './hr/OvertimePanel';
import { ContractTracker } from './hr/ContractTracker';
import { EmployeeDocuments } from './hr/EmployeeDocuments';
import { PerformanceAppraisal } from './hr/PerformanceAppraisal';
import { DisciplinaryPanel } from './hr/DisciplinaryPanel';
import { ResignationPanel } from './hr/ResignationPanel';
import { AttendanceExport } from './hr/AttendanceExport';
import { HRReports } from './hr/HRReports';
import { PayrollBreakdown } from './hr/PayrollBreakdown';
import { ShiftManagement } from './hr/ShiftManagement';
import { HRHero } from './hr/HRHero';

// Grup HR: 13 panel lama dikonsolidasi jadi 5 grup.
// Tiap grup punya sub-nav internal yang mengirim id panel asli ke tiap komponen
// (komponen nge-gate lewat prop activeSubTab, jadi id asli harus dipertahankan).
const HR_GROUPS: Record<string, { id: string; label: string }[]> = {
  attendance: [
    { id: 'attendance', label: 'Presensi' },
    { id: 'shifts', label: 'Shift' },
    { id: 'overtime', label: 'Lembur' },
    { id: 'export-attendance', label: 'Export Absen' },
  ],
  payroll: [
    { id: 'payroll', label: 'Payroll' },
    { id: 'commission', label: 'Komisi' },
    { id: 'kasbon', label: 'Kasbon' },
  ],
  contracts: [
    { id: 'contracts', label: 'Kontrak' },
    { id: 'documents', label: 'Dokumen' },
    { id: 'resignation', label: 'Resign' },
  ],
  performance: [
    { id: 'performance', label: 'Kinerja' },
    { id: 'disciplinary', label: 'SP & Disiplin' },
  ],
  reports: [{ id: 'reports', label: 'Laporan HR' }],
};

export function HRTab({ activeSubTab }: { activeSubTab: string }) {
  const {
    currentTenantId,
    currentBranchId,
    currentUser,
    employees,
    branches,
    addEmployee,
    updateEmployee,
    recordAttendance,
    approveLeave,
    submitLeave,
    approveCashAdvance,
    accounts,
    bulkCheckIn,
    generatePayroll,
    services,
  } = useSaaS();

  const currentUserPermissions = currentUser?.permissions || [];

  // activeSubTab dari nav utama = id grup. Default ke panel pertama grup itu.
  const group = HR_GROUPS[activeSubTab] ? activeSubTab : 'attendance';
  const tabs = HR_GROUPS[group];
  const [active, setActive] = React.useState(tabs[0].id);

  // Saat grup berganti (nav utama), reset ke panel pertama grup baru.
  React.useEffect(() => {
    setActive(HR_GROUPS[group][0].id);
  }, [group]);

  const view = active;

  return (
    <div
      className="space-y-4 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_tr:hover]:bg-zinc-900"
      id="hr-pane"
    >
      {/* Hero khusus grup non-Kehadiran (grup attendance punya hero sendiri di panelnya) */}
      {group !== 'attendance' && <HRHero group={group} />}

      {/* Sub-nav internal grup (sembunyikan bila grup cuma punya 1 panel) */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1.5 overflow-x-auto rounded-xl bg-slate-100/70 p-1 dark:bg-zinc-900/70">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={
                'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ' +
                (view === t.id
                  ? 'bg-white text-sky-700 shadow-sm ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-sky-300 dark:ring-zinc-700'
                  : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {view === 'payroll' && (
        <div className="space-y-6">
          <HRPayrollPanel generatePayroll={generatePayroll} />
          <PayrollBreakdown activeSubTab="payroll" />
        </div>
      )}

      {view === 'kasbon' && (
        <HRKasbonPanel
          activeSubTab="kasbon"
          employees={employees}
          currentTenantId={currentTenantId}
          currentBranchId={currentBranchId}
          currentUser={currentUser}
          accounts={accounts}
          updateEmployee={updateEmployee}
          approveCashAdvance={approveCashAdvance}
        />
      )}

      {view === 'attendance' && (
        <HRAttendancePanel
          activeSubTab="attendance"
          addEmployee={addEmployee}
          approveLeave={approveLeave}
          branches={branches}
          bulkCheckIn={bulkCheckIn}
          currentBranchId={currentBranchId}
          currentTenantId={currentTenantId}
          currentUser={currentUser}
          currentUserPermissions={currentUserPermissions}
          employees={employees}
          recordAttendance={recordAttendance}
          services={services}
          submitLeave={submitLeave}
          updateEmployee={updateEmployee}
        />
      )}

      {view === 'commission' && <CommissionPanel activeSubTab="commission" />}
      {view === 'shifts' && <ShiftManagement activeSubTab="shifts" />}
      {view === 'overtime' && <OvertimePanel activeSubTab="overtime" />}
      {view === 'contracts' && <ContractTracker activeSubTab="contracts" />}
      {view === 'documents' && <EmployeeDocuments activeSubTab="documents" />}
      {view === 'performance' && <PerformanceAppraisal activeSubTab="performance" />}
      {view === 'disciplinary' && <DisciplinaryPanel activeSubTab="disciplinary" />}
      {view === 'resignation' && <ResignationPanel activeSubTab="resignation" />}
      {view === 'export-attendance' && <AttendanceExport activeSubTab="export-attendance" />}
      {view === 'reports' && <HRReports activeSubTab="reports" />}
    </div>
  );
}
