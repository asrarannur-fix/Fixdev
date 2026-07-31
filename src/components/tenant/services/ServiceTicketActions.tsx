import * as React from 'react';
import { ServiceStatus } from '../../../types';
import { WORKFLOW_STEPS } from '../../../domain/serviceWorkflow';
import { Check, PackagePlus, PlusCircle } from 'lucide-react';

interface ServiceTicketActionsProps {
  ticket: { status: ServiceStatus };
  onPartOrder: () => void;
  onAdditionalCost: () => void;
  canRequestParts: boolean;
  canAddCost: boolean;
}

export const ServiceTicketActions: React.FC<ServiceTicketActionsProps> = ({
  ticket,
  onPartOrder,
  onAdditionalCost,
  canRequestParts,
  canAddCost,
}) => {
  const activeStep = Math.max(0, WORKFLOW_STEPS.findIndex((step) => step.status === ticket.status));

  return (
    <div data-testid="service-actions" className="min-w-0 space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">Alur Servis</h4>
          <span className="text-xs font-semibold text-slate-500">Tahap {activeStep + 1}/{WORKFLOW_STEPS.length}</span>
        </div>
        <div className="flex min-w-0 items-start overflow-x-auto pb-2">
          {WORKFLOW_STEPS.map((step, index) => (
            <div key={step.status} className="flex min-w-20 flex-1 flex-col items-center text-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${index < activeStep ? 'border-emerald-600 bg-emerald-600 text-white' : index === activeStep ? 'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-zinc-900' : 'border-slate-300 bg-white text-slate-500 dark:border-zinc-700 dark:bg-zinc-900'}`}>
                {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="mt-2 hidden text-xs font-medium text-slate-600 dark:text-zinc-300 sm:block">{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">Aksi Pendukung</h4>
        <div className="flex flex-wrap gap-2">
          {canRequestParts && (
            <button type="button" onClick={onPartOrder} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <PackagePlus className="h-4 w-4" /> Part
            </button>
          )}
          {canAddCost && (
            <button type="button" onClick={onAdditionalCost} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
              <PlusCircle className="h-4 w-4" /> Biaya
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
