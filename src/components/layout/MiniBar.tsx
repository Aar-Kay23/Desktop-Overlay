import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Zap,
  Database,
  ArrowDown,
  ArrowUp,
  Music,
  Sparkles,
  GripHorizontal,
  LayoutGrid,
  BatteryCharging,
  SlidersHorizontal,
  Plus,
  X,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { WIDGET_CATALOG } from '../../lib/widgetRegistry';
import { setGlobalDragging } from '../../hooks/useClickThrough';
import type { WidgetType } from '../../types/widgets';

interface MiniBarItem {
  id: string;
  type: WidgetType;
}

const DEFAULT_MINIBAR_ITEMS: MiniBarItem[] = [
  { id: 'mb-1', type: 'cpu' },
  { id: 'mb-2', type: 'gpu' },
  { id: 'mb-3', type: 'memory' },
  { id: 'mb-4', type: 'battery' },
  { id: 'mb-5', type: 'network' },
  { id: 'mb-6', type: 'ai-quota' },
  { id: 'mb-7', type: 'media' },
];

export const MiniBar: React.FC = () => {
  const { snapshot, setMode } = useTelemetry();
  const { cpu, gpu, memory, network, media, quotas, battery } = snapshot;

  const [items, setItems] = useState<MiniBarItem[]>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_minibar_items');
      return saved ? JSON.parse(saved) : DEFAULT_MINIBAR_ITEMS;
    } catch {
      return DEFAULT_MINIBAR_ITEMS;
    }
  });

  const [editMode, setEditMode] = useState<boolean>(false);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_minibar_items', JSON.stringify(items));
    } catch {}
  }, [items]);

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAdd = (type: WidgetType) => {
    const newItem: MiniBarItem = {
      id: `mb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
    };
    setItems((prev) => [...prev, newItem]);
    setPickerOpen(false);
  };

  const renderWidgetChip = (type: WidgetType) => {
    switch (type) {
      case 'cpu':
        return (
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400">CPU</span>
            <span className="font-semibold text-white font-mono">{Math.round(cpu.loadPct)}%</span>
          </div>
        );
      case 'gpu':
        return (
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400">GPU</span>
            <span className="font-semibold text-white font-mono">{Math.round(gpu.loadPct)}%</span>
          </div>
        );
      case 'memory':
        return (
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400">RAM</span>
            <span className="font-semibold text-white font-mono">{Math.round(memory.pct)}%</span>
          </div>
        );
      case 'battery':
        return (
          <div className="flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Bat</span>
            <span className="font-semibold text-white font-mono">{battery?.percent ?? 96}%</span>
          </div>
        );
      case 'network':
        return (
          <div className="flex items-center gap-1.5 font-mono">
            <ArrowDown className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-white">{network.downMbps.toFixed(0)}</span>
            <ArrowUp className="w-3 h-3 text-slate-400 ml-0.5" />
            <span className="font-semibold text-white">{network.upMbps.toFixed(0)}</span>
            <span className="text-[10px] text-slate-500">M</span>
          </div>
        );
      case 'ai-quota':
        const topQuota = quotas[0];
        return (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-slate-400">AI</span>
            <span className="font-semibold text-white font-mono">
              {topQuota ? `${Math.round(topQuota.sessionLimit.usedPct)}%` : 'Active'}
            </span>
          </div>
        );
      case 'media':
        return (
          <div className="flex items-center gap-1.5 max-w-[160px] truncate">
            <Music className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="text-slate-200 truncate">{media.title || 'No Media'}</span>
          </div>
        );
      case 'clock':
        return (
          <span className="font-mono text-white font-semibold">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      default:
        const def = WIDGET_CATALOG[type];
        return <span className="text-slate-300 font-medium">{def?.title || type}</span>;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-50 flex items-end justify-center pb-6">
      {/* Freely Draggable Floating MiniBar */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.06}
        onDragStart={() => setGlobalDragging(true)}
        onDragEnd={() => setGlobalDragging(false)}
        data-interactive="true"
        className="pointer-events-auto macos-glass rounded-full px-4 py-2 border border-white/10 shadow-2xl flex items-center gap-3 text-xs cursor-grab active:cursor-grabbing"
      >
        <GripHorizontal className="w-3.5 h-3.5 text-white/30 shrink-0" />

        {/* Dynamic Chips */}
        <div className="flex items-center gap-3.5" onClick={(e) => e.stopPropagation()}>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <div className="w-px h-3.5 bg-white/10 shrink-0" />}
              <div className="flex items-center gap-1.5 group relative">
                {renderWidgetChip(item.type)}
                {editMode && (
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="w-3.5 h-3.5 rounded-full bg-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white flex items-center justify-center text-[8px] cursor-pointer ml-1"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Mini Controls */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            title="Add widget to MiniBar"
            className="p-1 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            title="Edit MiniBar items"
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              editMode ? 'bg-white text-slate-950 font-bold' : 'hover:bg-white/10 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>

          <button
            onClick={() => setMode('canvas')}
            title="Switch back to Desktop Canvas"
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Add Menu */}
        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: -45, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 macos-glass macos-squircle p-3 border border-white/10 shadow-2xl flex flex-wrap gap-1.5 max-w-xs z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full text-[10px] uppercase font-bold text-slate-400 mb-1">
                Add to MiniBar
              </div>
              {Object.keys(WIDGET_CATALOG).map((key) => {
                const k = key as WidgetType;
                return (
                  <button
                    key={k}
                    onClick={() => handleAdd(k)}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/20 text-slate-200 text-[11px] font-medium border border-white/5 cursor-pointer transition-colors"
                  >
                    {WIDGET_CATALOG[k].title}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
