import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { NEXT_STEP } from '../../../domain/serviceWorkflow';
import { ServiceStatus } from '../../../types';

interface ServiceNextStepBannerProps {
  status: ServiceStatus;
}

export const ServiceNextStepBanner: React.FC<ServiceNextStepBannerProps> = ({ status }) => {
  const step = NEXT_STEP[status];
  if (!step) return null;

  return (
    <div data-testid="next-step-banner" className="relative mx-3 mt-3 flex items-start gap-2 overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-2.5">
      <ArrowRight className="relative mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-zinc-300" />
      <div className="relative text-xs">
        <p className="font-black text-slate-900 dark:text-zinc-100">Langkah Selanjutnya: {step.label}</p>
        <p className="text-slate-600 dark:text-zinc-300">{step.hint}</p>
      </div>
    </div>
  );
};
