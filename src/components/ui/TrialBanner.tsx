import React from "react";
import { useSaaS } from "../../context/SaaSContext";
import { CreditCard, AlertTriangle, ExternalLink, X } from "lucide-react";

interface TrialBannerProps {
  onClose?: () => void;
  onUpgrade?: () => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ onClose, onUpgrade }) => {
  const { tenants, currentTenantId, currentUser } = useSaaS();
  const activeTenant = tenants.find((t) => t.id === currentTenantId);

  if (!activeTenant || activeTenant.status !== "TRIAL") return null;

  const trialEnds = new Date(activeTenant.trialEndsAt);
  const trialEndTime = trialEnds.getTime();
  if (!Number.isFinite(trialEndTime)) return null;

  const diffTime = trialEndTime - Date.now();
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  if (diffTime < 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-red-800 dark:text-red-200">
            Trial Berakhir
          </p>
          <p className="text-[11px] text-red-600 dark:text-red-300 mt-0.5">
            Masa trial telah berakhir. Segera upgrade untuk melanjutkan akses.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Upgrade Sekarang
            </button>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-red-400 hover:text-red-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const isUrgent = diffDays <= 3;
  const bgColor = isUrgent
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
  const textColor = isUrgent
    ? "text-red-800 dark:text-red-200"
    : "text-amber-800 dark:text-amber-200";
  const subTextColor = isUrgent
    ? "text-red-600 dark:text-red-300"
    : "text-amber-600 dark:text-amber-300";
  const btnColor = isUrgent
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-amber-600 hover:bg-amber-700 text-white";

  return (
    <div className={`${bgColor} border rounded-xl p-3 flex items-start gap-3`}>
      <CreditCard className={`w-5 h-5 shrink-0 mt-0.5 ${textColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${textColor}`}>
          {isUrgent ? "Segera Upgrade!" : "Masa Trial"}
        </p>
        <p className={`text-[11px] ${subTextColor} mt-0.5`}>
          {diffDays} hari tersisa. Trial berakhir{" "}
          {trialEnds.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${btnColor} px-3 py-1.5 rounded-lg transition-colors`}
          >
            <ExternalLink className="w-3 h-3" />
            Upgrade Sekarang
          </button>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} className={`${subTextColor} hover:opacity-70 shrink-0`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
