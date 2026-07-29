import * as React from 'react';
import { ServiceStatus } from '../../../types';
import { SERVICE_TRANSITIONS, canServiceTransition, WORKFLOW_STEPS } from '../../../domain/serviceWorkflow';
import {
  Activity,
  Check,
  Timer,
  PackagePlus,
  PlusCircle,
  Send,
  CheckCircle2,
  ShieldCheck,
  Handshake,
  AlertTriangle,
} from 'lucide-react';

interface ServiceTicketActionsProps {
  ticket: { status: ServiceStatus };
  onStatusChange: (status: ServiceStatus, note: string) => void;
  onPartOrder: () => void;
  onAdditionalCost: () => void;
  onHandover?: () => void;
  canChangeStatus: boolean;
  canRequestParts: boolean;
  canAddCost: boolean;
  canHandover: boolean;
  liveTimerSeconds?: number;
  repairStartTime?: string;
}

const canTransition = (from: ServiceStatus, to: ServiceStatus): boolean =>
  from === to || canServiceTransition(from, to);

export { SERVICE_TRANSITIONS, canTransition };

const stepGradients = [
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-cyan-400 to-teal-500',
  'from-teal-400 to-emerald-500',
  'from-emerald-400 to-green-500',
  'from-violet-400 to-purple-500',
  'from-slate-400 to-gray-500',
];

export const ServiceTicketActions: React.FC<ServiceTicketActionsProps> = ({
  ticket,
  onStatusChange,
  onPartOrder,
  onAdditionalCost,
  onHandover,
  canChangeStatus,
  canRequestParts,
  canAddCost,
  canHandover,
  liveTimerSeconds = 0,
  repairStartTime,
}) => {
  const [showHandoverConfirm, setShowHandoverConfirm] = React.useState(false);

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
        return 4;
      case ServiceStatus.SIAP_DIAMBIL:
        return 5;
      case ServiceStatus.DIAMBIL:
        return 6;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStepIndex(ticket.status);

  return (
    <div data-testid="service-actions" className="space-y-4">
      {/* Workflow Stepper */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/40 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 dark:from-indigo-600 dark:via-purple-600 dark:to-fuchsia-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />

        <div className="relative p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-widest">
              <Activity className="h-4 w-4" /> Alur Servis
            </h4>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
              Tahap {activeStep + 1}/{WORKFLOW_STEPS.length}
            </span>
          </div>

          <div className="relative flex items-start justify-between px-1">
            <div className="absolute left-6 right-6 top-4 z-0 h-1 rounded-full bg-white/20" />
            <div
              className="absolute left-6 top-4 z-0 h-1 rounded-full bg-white transition-all duration-500"
              style={{ width: `${(activeStep / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
            />

            {WORKFLOW_STEPS.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isActive = idx === activeStep;
              const gradient = stepGradients[idx] || stepGradients[0];

              return (
                <div key={idx} className="relative z-10 flex flex-1 flex-col items-center">
                  <button
                    type="button"
                     disabled={!canChangeStatus || !canTransition(ticket.status, step.status)}
                    onClick={() => {
                       if (!canChangeStatus || !canTransition(ticket.status, step.status)) return;
                      const note = `Status diperbarui via Visual Workflow ke: ${step.label}`;
                      onStatusChange(step.status, note);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all border-2 outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                      isCompleted
                        ? 'bg-white border-white text-emerald-600 shadow-lg shadow-white/30 scale-110'
                          : isActive
                            ? `bg-gradient-to-br ${gradient} border-white text-white shadow-lg shadow-white/30 ring-4 ring-white/30 scale-110`
                            : 'bg-white/10 border-white/30 text-white/60 hover:bg-white/20 hover:border-white/50'
                    }`}
                    title={`Ubah status ke ${step.label}`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </button>
                  <span
                    className={`mt-1.5 hidden max-w-[70px] text-center text-[8px] font-bold leading-tight transition-colors sm:block sm:max-w-none sm:text-[9px] ${
                      isActive
                        ? 'text-white font-extrabold'
                        : isCompleted
                          ? 'text-white/90'
                          : 'text-white/50'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-center text-[10px] font-bold text-white/90 sm:hidden">
            {WORKFLOW_STEPS[activeStep]?.label}
          </p>
        </div>
      </div>

      {/* Tech Control Center */}
      <div className="relative overflow-hidden rounded-2xl border border-white/20 dark:border-zinc-800/40 shadow-lg shadow-slate-200/30 dark:shadow-zinc-900/30">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-400 to-orange-400 dark:from-rose-600 dark:via-pink-600 dark:to-orange-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-white/10" />
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl" />

        <div className="relative p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl text-white">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-xs uppercase text-white tracking-widest">
                  Pusat Kendali Teknisi
                </h4>
                <p className="text-[10px] text-white/70">
                  SLA Timer, Catatan & Permintaan Suku Cadang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
               {canRequestParts &&
                 (ticket.status === ServiceStatus.SEDANG_DIKERJAKAN ||
                 ticket.status === ServiceStatus.REWORK) && (
                <>
                  <button
                    type="button"
                    onClick={onPartOrder}
                    className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20 transition-all"
                  >
                    <PackagePlus className="w-3.5 h-3.5" /> Spare Part
                  </button>
                  {canAddCost && (
                    <button
                      type="button"
                      onClick={onAdditionalCost}
                      className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/20 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Tambahan Biaya
                    </button>
                  )}
                </>
              )}

              {canHandover && ticket.status === ServiceStatus.SELESAI && (
                <button
                  type="button"
                  onClick={() => setShowHandoverConfirm(true)}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-600 text-[10px] font-black flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all"
                >
                  <Handshake className="w-3.5 h-3.5" /> Ambil Unit
                </button>
              )}

              {/* SLA Timer */}
              {repairStartTime && (
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20">
                  <span className="text-xs font-mono font-black text-white">
                    {Math.floor(liveTimerSeconds / 3600)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {Math.floor((liveTimerSeconds % 3600) / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(liveTimerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                  {liveTimerSeconds > 48 * 3600 && (
                    <span className="text-[8px] font-black text-white bg-white/30 px-2 py-0.5 rounded-full animate-pulse">
                      SLA BREACH
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Handover Confirmation Dialog */}
      {showHandoverConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative overflow-hidden w-80 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-white/10" />
            <div className="relative p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl text-white">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-white">Konfirmasi Ambil Unit</h3>
                  <p className="mt-1 text-[11px] text-white/80">
                    Tandai tiket ini sebagai <strong>diambil</strong> oleh pemilik? Pastikan unit sudah diserahkan dan pembayaran lunas.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverConfirm(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold border border-white/20"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowHandoverConfirm(false);
                    if (onHandover) onHandover();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-orange-600 text-[10px] font-black shadow-lg"
                >
                  Ya, Ambil Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
