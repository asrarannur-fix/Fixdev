import React from "react";
import { UserRole } from "../../types";
import {
  ShieldAlert,
  Crown,
  ShieldCheck,
  UserCheck,
  LineChart,
  CreditCard,
  Wrench,
  UserCircle,
} from "lucide-react";

interface RoleAvatarProps {
  role: UserRole;
  name?: string;
  size?: "sm" | "md" | "lg";
}

export const RoleAvatar: React.FC<RoleAvatarProps> = ({
  role,
  name,
  size = "md",
}) => {
  // Determine dimensions
  const dimClass = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-10 w-10 text-sm",
  }[size];

  const iconDimClass = {
    sm: "w-4 h-4",
    md: "w-4.5 h-4.5",
    lg: "w-5 h-5",
  }[size];

  // Configure visually distinctive visual assets for each role
  const config = {
    [UserRole.SUPER_ADMIN]: {
      bg: "bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-800 text-amber-400 border border-amber-500/30",
      icon: Crown,
      label: "SA",
    },
    [UserRole.OWNER]: {
      bg: "bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 text-white border border-purple-400/20",
      icon: ShieldCheck,
      label: "OW",
    },
    [UserRole.ADMIN]: {
      bg: "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white border border-blue-400/20",
      icon: UserCheck,
      label: "AD",
    },
    [UserRole.MANAGER]: {
      bg: "bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 text-white border border-orange-400/20",
      icon: LineChart,
      label: "MN",
    },
    [UserRole.KASIR]: {
      bg: "bg-gradient-to-tr from-emerald-600 via-teal-600 to-green-500 text-white border border-emerald-400/20",
      icon: CreditCard,
      label: "KS",
    },
    [UserRole.TEKNISI]: {
      bg: "bg-gradient-to-tr from-sky-600 via-blue-600 to-slate-800 text-white border border-sky-400/20",
      icon: Wrench,
      label: "TK",
    },
    [UserRole.SALES]: {
      bg: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white border border-rose-400/20",
      icon: UserCircle,
      label: "SL",
    },
    [UserRole.HR]: {
      bg: "bg-gradient-to-tr from-teal-500 to-emerald-500 text-white border border-teal-400/20",
      icon: UserCircle,
      label: "HR",
    },
    [UserRole.CUSTOMER]: {
      bg: "bg-gradient-to-tr from-slate-500 to-slate-700 text-white border border-slate-400/20",
      icon: UserCircle,
      label: "CU",
    },
    [UserRole.ANONYMOUS]: {
      bg: "bg-gradient-to-tr from-zinc-600 to-zinc-800 text-zinc-300 border border-zinc-600/20",
      icon: ShieldAlert,
      label: "AN",
    },
  };

  const current = config[role] || {
    bg: "bg-gradient-to-tr from-slate-500 to-slate-600 text-white",
    icon: UserCircle,
    label: name ? name.slice(0, 2).toUpperCase() : "U",
  };

  const IconComponent = current.icon;

  return (
    <div className="relative group shrink-0" id={`role-avatar-${role}`}>
      {/* Visual background ripple border glow for premium feel */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-tr rounded-xl opacity-0 group-hover:opacity-40 blur-xs transition duration-300 ${
          role === UserRole.SUPER_ADMIN
            ? "from-amber-400 to-indigo-500"
            : "from-blue-600 to-indigo-600"
        }`}
      />
      <div
        className={`relative ${dimClass} rounded-xl ${current.bg} flex items-center justify-center font-extrabold shadow-sm select-none`}
      >
        {/* Render a highly polished vector icon */}
        <div className="flex flex-col items-center justify-center relative">
          <IconComponent className={`${iconDimClass} drop-shadow-sm`} />
        </div>
        {/* Small live active status indicator dot */}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs shadow-emerald-500/50 animate-pulse" />
      </div>
    </div>
  );
};
