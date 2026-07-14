/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mobile-only bottom navigation bar. Replaces the desktop Topbar on small
 * screens so the app feels like a native mobile app (no bulky header).
 */

import React from "react";
import { LayoutDashboard, Wrench, ShoppingBag, Package, Menu } from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  onSetTab: (tab: string, subTab?: string) => void;
  onOpenMenu: () => void;
}

const ITEMS = [
  { id: "overview", label: "Beranda", icon: LayoutDashboard },
  { id: "services", label: "Servis", icon: Wrench },
  { id: "pos", label: "POS", icon: ShoppingBag },
  { id: "inventory", label: "Stok", icon: Package },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSetTab,
  onOpenMenu,
}) => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-slate-200/70 dark:border-zinc-800/70 pb-[env(safe-area-inset-bottom)]"
      id="bottom-nav"
    >
      <div className="flex items-stretch justify-around max-w-xl mx-auto">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSetTab(item.id)}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors cursor-pointer ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={onOpenMenu}
          aria-label="Menu"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
};
