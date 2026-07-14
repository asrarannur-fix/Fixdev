import React from "react";
import { Settings, RotateCcw, GripVertical, Eye, EyeOff, X, Sparkles } from "lucide-react";
import { WidgetConfig, WidgetLayout, saveWidgetLayout, resetWidgetLayout } from "./widgetTypes";

interface WidgetSettingsPanelProps {
  widgets: WidgetConfig[];
  layout: WidgetLayout;
  onLayoutChange: (layout: WidgetLayout) => void;
  isOpen: boolean;
  onClose: () => void;
}

const WIDGET_COLORS: Record<string, string> = {
  "quick-actions": "from-pink-400 to-rose-500",
  "kpi-revenue": "from-emerald-400 to-teal-500",
  "kpi-operations": "from-pink-400 to-rose-500",
  "kpi-billing": "from-emerald-400 to-green-500",
  "stock-alerts": "from-rose-400 to-red-500",
  "cash-flow": "from-violet-400 to-purple-500",
  "analytics": "from-emerald-400 to-teal-500",
};

export const WidgetSettingsPanel: React.FC<WidgetSettingsPanelProps> = ({
  widgets, layout, onLayoutChange, isOpen, onClose,
}) => {
  const [localLayout, setLocalLayout] = React.useState<WidgetLayout>(layout);
  React.useEffect(() => { setLocalLayout(layout); }, [layout]);

  const toggleVisible = (id: string) => {
    const next = { ...localLayout, visible: { ...localLayout.visible, [id]: !localLayout.visible[id] } };
    setLocalLayout(next); saveWidgetLayout(next); onLayoutChange(next);
  };

  const moveUp = (id: string) => {
    const idx = localLayout.order.indexOf(id);
    if (idx <= 0) return;
    const newOrder = [...localLayout.order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    const next = { ...localLayout, order: newOrder };
    setLocalLayout(next); saveWidgetLayout(next); onLayoutChange(next);
  };

  const moveDown = (id: string) => {
    const idx = localLayout.order.indexOf(id);
    if (idx < 0 || idx >= localLayout.order.length - 1) return;
    const newOrder = [...localLayout.order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    const next = { ...localLayout, order: newOrder };
    setLocalLayout(next); saveWidgetLayout(next); onLayoutChange(next);
  };

  const handleReset = () => {
    const fresh = resetWidgetLayout();
    setLocalLayout(fresh); onLayoutChange(fresh);
  };

  if (!isOpen) return null;
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  return (
    <>
      <div className="fixed inset-0 bg-pink-900/20 dark:bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-zinc-950 shadow-2xl z-50 flex flex-col rounded-l-3xl overflow-hidden border-l border-slate-200 dark:border-zinc-800">
        <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <h3 className="text-sm font-black text-white">Widget Dashboard</h3>
            </div>
            <button onClick={onClose} className="p-1 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {localLayout.order.map((id, idx) => {
            const widget = widgetMap.get(id);
            if (!widget) return null;
            const visible = localLayout.visible[id] !== false;
            const gradient = WIDGET_COLORS[id] || "from-slate-400 to-slate-500";
            return (
              <div key={id} className={`flex items-center gap-2.5 rounded-2xl border px-3 py-3 transition-all ${
                visible ? "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm" : "border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900 opacity-50"
              }`}>
                <GripVertical className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0 cursor-grab" />
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-[10px] font-black">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate">{widget.label}</p>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveUp(id)} disabled={idx === 0} className="text-[10px] font-black text-slate-400 hover:text-slate-600 disabled:opacity-30 leading-none">▲</button>
                  <button onClick={() => moveDown(id)} disabled={idx === localLayout.order.length - 1} className="text-[10px] font-black text-slate-400 hover:text-slate-600 disabled:opacity-30 leading-none">▼</button>
                </div>
                <button onClick={() => toggleVisible(id)} className={`p-1.5 rounded-xl transition-colors ${
                  visible ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100" : "text-slate-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200"
                }`}>
                  {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 dark:border-zinc-800">
          <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 py-2.5 text-xs font-black text-white hover:shadow-lg hover:shadow-pink-200 dark:hover:shadow-pink-900/30 transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Reset ke Default
          </button>
        </div>
      </div>
    </>
  );
};