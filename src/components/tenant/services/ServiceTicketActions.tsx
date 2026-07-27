import * as React from 'react';
import { ServiceStatus } from '../../../types';
import { SERVICE_TRANSITIONS, canServiceTransition } from '../../../domain/serviceWorkflow';
import {
  Activity,
  Check,
  Timer,
  PackagePlus,
  PlusCircle,
  Send,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface ServiceTicketActionsProps {
  ticket: any;
  currentUser?: any;
  onStatusChange: (status: ServiceStatus, note: string) => void;
  onPartOrder: () => void;
  onAdditionalCost: () => void;
  onHandover?: () => void;
  liveTimerSeconds?: number;
  repairStartTime?: string;
}

const canTransition = (from: ServiceStatus, to: ServiceStatus): boolean =>
  from === to || canServiceTransition(from, to);

export { SERVICE_TRANSITIONS, canTransition };

const WORKFLOW_STEPS = [
  { status: ServiceStatus.DIAGNOSA, label: 'Diagnosa' },
  { status: ServiceStatus.MENUGGU_APPROVAL, label: 'Menunggu Persetujuan' },
  { status: ServiceStatus.SEDANG_DIKERJAKAN, label: 'Proses Perbaikan' },
  { status: ServiceStatus.QC, label: 'QC/Testing' },
  { status: ServiceStatus.SELESAI, label: 'Siap Diambil' },
];

export const ServiceTicketActions: React.FC<ServiceTicketActionsProps> = ({
  ticket,
  currentUser,
  onStatusChange,
  onPartOrder,
  onAdditionalCost,
  onHandover,
  liveTimerSeconds = 0,
  repairStartTime,
}) => {
  const getActiveStepIndex = (st: ServiceStatus) => {
    switch (st) {
      case ServiceStatus.DITERIMA:
      case ServiceStatus.ANTRIAN:
      case ServiceStatus.DIAGNOSA:
        return 0;
      case ServiceStatus.MENUGGU_APPROVAL:
      case ServiceStatus.APPROVAL_DITOLAK:
        return 1;
      case ServiceStatus.SEDANG_DIKERJAKAN:
      case ServiceStatus.MENUGGU_SPAREPART:
        return 2;
      case ServiceStatus.QC:
      case ServiceStatus.REWORK:
        return 3;
      case ServiceStatus.SELESAI:
      case ServiceStatus.SIAP_DIAMBIL:
      case ServiceStatus.DIAMBIL:
        return 4;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStepIndex(ticket.status);

  return (
    <div className="space-y-3">
      {/* Visual Workflow Tracker */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-500" /> Visual Repair Workflow
        </h4>
        <div className="flex items-center gap-1.5 bg-accent-lighter border border-indigo-100 px-2 py-0.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span className="text-[9px] font-mono font-bold text-accent">Live Tracker & Control</span>
        </div>
      </div>

      <div className="flex items-center justify-between relative mt-4 px-2">
        <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 z-0 rounded" />

        {WORKFLOW_STEPS.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
              <button
                type="button"
                disabled={!canTransition(ticket.status, step.status)}
                onClick={() => {
                  if (!canTransition(ticket.status, step.status)) return;
                  const note = `Status diperbarui via Visual Workflow ke: ${step.label}`;
                  onStatusChange(step.status, note);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2 outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : isActive
                      ? 'bg-accent border-accent text-white ring-4 ring-indigo-100 shadow-md shadow-accent/20'
                      : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600'
                }`}
                title={`Ubah status ke ${step.label}`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </button>
              <span
                className={`text-[9px] font-bold mt-1.5 text-center transition-colors ${
                  isActive
                    ? 'text-accent font-extrabold'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tech Control Center */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase text-slate-800 tracking-wider">
              Pusat Kendali Teknisi
            </h4>
            <p className="text-[10px] text-slate-400">
              SLA Timer, Catatan & Permintaan Suku Cadang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(ticket.status === ServiceStatus.SEDANG_DIKERJAKAN ||
            ticket.status === ServiceStatus.REWORK) && (
            <>
              <button
                type="button"
                onClick={onPartOrder}
                className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Menunggu Spare Part
              </button>
              <button
                type="button"
                onClick={onAdditionalCost}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Tambahan Biaya Disetujui
              </button>
            </>
          )}

          {/* SLA Timer */}
          {repairStartTime && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-mono font-bold text-slate-700">
                {Math.floor(liveTimerSeconds / 3600)
                  .toString()
                  .padStart(2, '0')}
                :
                {Math.floor((liveTimerSeconds % 3600) / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(liveTimerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
