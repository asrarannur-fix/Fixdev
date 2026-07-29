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
    <div data-testid="next-step-banner" className="relative mx-3 mt-3 flex items-start gap-2 overflow-hidden rounded-xl border border-white/30 px-3 py-2.5 shadow-md">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-white/10" />
      <ArrowRight className="relative mt-0.5 h-4 w-4 shrink-0 text-white" />
      <div className="relative text-xs">
        <p className="font-black text-white">Langkah Selanjutnya: {step.label}</p>
        <p className="text-white/80">{step.hint}</p>
      </div>
    </div>
  );
};
