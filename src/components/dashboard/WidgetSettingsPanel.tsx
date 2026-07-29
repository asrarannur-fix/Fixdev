import React from "react";
import { Settings, RotateCcw, Eye, EyeOff, X, GripVertical } from "lucide-react";
import { WidgetConfig, WidgetLayout, saveWidgetLayout, resetWidgetLayout } from "./widgetTypes";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WidgetSettingsPanelProps {
  widgets: WidgetConfig[];
  layout: WidgetLayout;
  onLayoutChange: (layout: WidgetLayout) => void;
  isOpen: boolean;
  onClose: () => void;
}

const WIDGET_COLORS: Record<string, string> = {
  "kpi-revenue": "from-emerald-400 to-teal-500",
  "kpi-operations": "from-pink-400 to-rose-500",
  "kpi-billing": "from-orange-400 to-amber-500",
  "stock-alerts": "from-rose-400 to-red-500",
  "ops-overview": "from-indigo-400 to-blue-500",
  "cash-flow": "from-violet-400 to-purple-500",
  "analytics": "from-emerald-400 to-teal-500",
};

const SortableItem: React.FC<{
  id: string;
  widget: WidgetConfig;
  idx: number;
  visible: boolean;
  gradient: string;
  onToggle: (id: string) => void;
}> = ({ id, widget, idx, visible, gradient, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200 cursor-grab active:cursor-grabbing ${
        visible
          ? "border-slate-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm shadow-sm hover:shadow-md"
          : "border-slate-100/60 dark:border-zinc-900/60 bg-slate-50/50 dark:bg-zinc-900/50 opacity-50"
      }`}
    >
      <div className="shrink-0 text-slate-300 dark:text-zinc-600">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
        <span className="text-white text-[10px] font-black">{idx + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate">{widget.label}</p>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        className={`p-1.5 rounded-xl transition-all duration-200 ${
          visible
            ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
            : "text-slate-300 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700"
        }`}
      >
        {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
};

export const WidgetSettingsPanel: React.FC<WidgetSettingsPanelProps> = ({
  widgets,
  layout,
  onLayoutChange,
  isOpen,
  onClose,
}) => {
  const [localLayout, setLocalLayout] = React.useState<WidgetLayout>(layout);
  React.useEffect(() => {
    setLocalLayout(layout);
  }, [layout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const toggleVisible = (id: string) => {
    const next = {
      ...localLayout,
      visible: { ...localLayout.visible, [id]: !localLayout.visible[id] },
    };
    setLocalLayout(next);
    saveWidgetLayout(next);
    onLayoutChange(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localLayout.order.indexOf(active.id as string);
    const newIndex = localLayout.order.indexOf(over.id as string);
    const newOrder = arrayMove(localLayout.order, oldIndex, newIndex);
    const next = { ...localLayout, order: newOrder };
    setLocalLayout(next);
    saveWidgetLayout(next);
    onLayoutChange(next);
  };

  const handleReset = () => {
    const fresh = resetWidgetLayout();
    setLocalLayout(fresh);
    onLayoutChange(fresh);
  };

  if (!isOpen) return null;
  const widgetMap = new Map(widgets.map((w) => [w.id, w]));

  return (
    <>
      <div
        className="fixed inset-0 bg-violet-900/20 dark:bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col rounded-l-3xl overflow-hidden border-l border-slate-200/60 dark:border-zinc-800/60">
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-white" />
              <h3 className="text-sm font-black text-white">Widget Dashboard</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localLayout.order}
              strategy={verticalListSortingStrategy}
            >
              {localLayout.order.map((id, idx) => {
                const widget = widgetMap.get(id);
                if (!widget) return null;
                const visible = localLayout.visible[id] !== false;
                const gradient = WIDGET_COLORS[id] || "from-slate-400 to-slate-500";
                return (
                  <SortableItem
                    key={id}
                    id={id}
                    widget={widget}
                    idx={idx}
                    visible={visible}
                    gradient={gradient}
                    onToggle={toggleVisible}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
        <div className="px-4 py-3 border-t border-slate-100/80 dark:border-zinc-800/80">
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 py-2.5 text-xs font-black text-white hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-900/30 transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset ke Default
          </button>
        </div>
      </div>
    </>
  );
};
