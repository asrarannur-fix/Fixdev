import React from "react";
import { useSaaS } from "../../context/SaaSContext";
import { HRPayrollPanel } from "./HRPayrollPanel";
import { HRKasbonPanel } from "./HRKasbonPanel";
import { HRAttendancePanel } from "./HRAttendancePanel";
import { CommissionPanel } from "./hr/CommissionPanel";
import { OvertimePanel } from "./hr/OvertimePanel";
import { ContractTracker } from "./hr/ContractTracker";
import { EmployeeDocuments } from "./hr/EmployeeDocuments";
import { PerformanceAppraisal } from "./hr/PerformanceAppraisal";
import { DisciplinaryPanel } from "./hr/DisciplinaryPanel";
import { ResignationPanel } from "./hr/ResignationPanel";
import { AttendanceExport } from "./hr/AttendanceExport";
import { HRReports } from "./hr/HRReports";
import { PayrollBreakdown } from "./hr/PayrollBreakdown";

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

  return (
    <>
      <div className="space-y-6 dark:text-zinc-300 dark:[&_.bg-white]:bg-zinc-950 dark:[&_.bg-slate-50]:bg-zinc-900 dark:[&_.border-slate-100]:border-zinc-800 dark:[&_.border-slate-200]:border-zinc-800 dark:[&_.text-slate-900]:text-zinc-100 dark:[&_.text-slate-800]:text-zinc-100 dark:[&_.text-slate-700]:text-zinc-200 dark:[&_.text-slate-600]:text-zinc-300 dark:[&_tr:hover]:bg-zinc-900" id="hr-pane">
        {activeSubTab === "payroll" && (
          <div className="space-y-6">
            <HRPayrollPanel generatePayroll={generatePayroll} />
            <PayrollBreakdown activeSubTab={activeSubTab} />
          </div>
        )}

        {activeSubTab === "kasbon" && (
          <HRKasbonPanel
            activeSubTab={activeSubTab}
            employees={employees}
            currentTenantId={currentTenantId}
            currentBranchId={currentBranchId}
            currentUser={currentUser}
            accounts={accounts}
            updateEmployee={updateEmployee}
            approveCashAdvance={approveCashAdvance}
          />
        )}

        {activeSubTab === "attendance" && (
          <HRAttendancePanel 
            activeSubTab={activeSubTab}
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

        {activeSubTab === "commission" && (
          <CommissionPanel activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "overtime" && (
          <OvertimePanel activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "contracts" && (
          <ContractTracker activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "documents" && (
          <EmployeeDocuments activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "performance" && (
          <PerformanceAppraisal activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "disciplinary" && (
          <DisciplinaryPanel activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "resignation" && (
          <ResignationPanel activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "export-attendance" && (
          <AttendanceExport activeSubTab={activeSubTab} />
        )}

        {activeSubTab === "reports" && (
          <HRReports activeSubTab={activeSubTab} />
        )}
      </div>
    </>
  );
}
