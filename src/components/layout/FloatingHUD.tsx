import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Database, Music, ChevronDown, ChevronUp, Sparkles, X, LayoutGrid, GripHorizontal, BatteryCharging } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { setGlobalDragging } from '../../hooks/useClickThrough';
import { SystemVitals } from '../modules/SystemVitals';
import { AIQuotaCockpit } from '../modules/AIQuotaCockpit';
import { MediaStudio } from '../modules/MediaStudio';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';

export const FloatingHUD: React.FC = () => {
  const { snapshot, setMode } = useTelemetry();
  const { cpu, gpu, memory, media, quotas, battery } = snapshot;
  const [expanded, setExpanded] = useState(false);

  const topQuota = quotas[0];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-none">
      {/* Freely Draggable Floating Pill (Dynamic Island) */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.06}
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onDragStart={() => setGlobalDragging(true)}
        onDragEnd={() => setGlobalDragging(false)}
        data-interactive="true"
        className="pointer-events-auto macos-glass rounded-full px-4 py-2 border border-white/10 shadow-2xl flex items-center gap-3.5 cursor-grab active:cursor-grabbing hover:border-white/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripHorizontal className="w-3.5 h-3.5 text-white/30 shrink-0" />

        {/* CPU */}
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs font-bold font-mono text-white">
            {Math.round(cpu.loadPct)}%
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/10" />

        {/* GPU */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs font-bold font-mono text-white">
            {Math.round(gpu.loadPct)}%
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/10" />

        {/* Memory */}
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs font-bold font-mono text-white">
            {Math.round(memory.pct)}%
          </span>
        </div>

        {battery && (
          <>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold font-mono text-white">
                {battery.percent}%
              </span>
            </div>
          </>
        )}

        {topQuota && (
          <>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs font-bold font-mono text-white">
                {Math.round(topQuota.sessionLimit.usedPct)}%
              </span>
            </div>
          </>
        )}

        {media.title && (
          <>
            <div className="w-px h-3.5 bg-white/10" />
            <div className="flex items-center gap-1.5 max-w-[140px] truncate">
              <Music className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-xs text-slate-200 truncate">{media.title}</span>
            </div>
          </>
        )}

        {/* Canvas button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMode('canvas');
          }}
          title="Switch to Desktop Canvas"
          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* Expand toggle */}
        <div className="text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </motion.div>

      {/* Expanded Floating Modal HUD */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 12, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            data-interactive="true"
            className="w-[92vw] max-w-[680px] max-h-[85vh] overflow-y-auto pointer-events-auto macos-glass macos-squircle p-5 border border-white/10 shadow-2xl flex flex-col gap-4 mt-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Expanded Cockpit
                </span>
                <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 text-[10px]">
                  <button
                    onClick={() => setMode('canvas')}
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setMode('sidebar')}
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Dock
                  </button>
                  <button
                    onClick={() => setMode('minibar')}
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    MiniBar
                  </button>
                  <button
                    onClick={() => setMode('dashboard')}
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Full
                  </button>
                </div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ClaudeApprovals />
            <AIQuotaCockpit />
            <SystemVitals />
            <MediaStudio />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
