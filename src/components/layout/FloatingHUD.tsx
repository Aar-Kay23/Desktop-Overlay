import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Database, Music, ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { SystemVitals } from '../modules/SystemVitals';
import { AIQuotaCockpit } from '../modules/AIQuotaCockpit';
import { MediaStudio } from '../modules/MediaStudio';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';

export const FloatingHUD: React.FC = () => {
  const { snapshot } = useTelemetry();
  const { cpu, gpu, memory, media, quotas } = snapshot;
  const [expanded, setExpanded] = useState(false);

  const topQuota = quotas[0];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* Floating Pill (Dynamic Island) */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="glass-panel rounded-full px-4 py-2 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center gap-4 cursor-pointer hover:border-cyan-500/40 hover:bg-black/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* CPU */}
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold font-mono text-slate-100">
            {Math.round(cpu.loadPct)}%
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/10" />

        {/* GPU */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-bold font-mono text-slate-100">
            {Math.round(gpu.loadPct)}%
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/10" />

        {/* RAM */}
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold font-mono text-slate-100">
            {Math.round(memory.pct)}%
          </span>
        </div>

        <div className="w-px h-3.5 bg-white/10" />

        {/* AI Quota */}
        {topQuota && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold font-mono text-slate-100">
              {Math.round(topQuota.sessionLimit.usedPct)}%
            </span>
          </div>
        )}

        <div className="w-px h-3.5 bg-white/10" />

        {/* Music indicator */}
        <div className="flex items-center gap-1.5 max-w-[140px] truncate">
          <Music className={`w-3.5 h-3.5 text-cyan-400 ${media.isPlaying ? 'animate-bounce' : ''}`} />
          <span className="text-xs text-slate-300 truncate">{media.title}</span>
        </div>

        {/* Expand toggle */}
        <div className="ml-1 text-slate-400">
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
            className="w-[92vw] max-w-[680px] max-h-[85vh] overflow-y-auto glass-panel rounded-2xl p-4 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col gap-4 mt-2"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Expanded Desktop HUD
              </span>
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

