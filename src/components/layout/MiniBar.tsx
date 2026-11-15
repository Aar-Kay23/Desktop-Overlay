import React from 'react';
import { Cpu, Zap, Database, ArrowDown, ArrowUp, Music, Sparkles } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

export const MiniBar: React.FC = () => {
  const { snapshot } = useTelemetry();
  const { cpu, gpu, memory, network, media, quotas } = snapshot;

  const topQuota = quotas[0];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full px-5 py-2 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)] flex items-center gap-5 text-xs font-mono">
      {/* CPU */}
      <div className="flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-slate-400">CPU</span>
        <span className="font-bold text-slate-100">{Math.round(cpu.loadPct)}%</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* GPU */}
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-slate-400">GPU</span>
        <span className="font-bold text-slate-100">{Math.round(gpu.loadPct)}%</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* RAM */}
      <div className="flex items-center gap-1.5">
        <Database className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-slate-400">RAM</span>
        <span className="font-bold text-slate-100">{Math.round(memory.pct)}%</span>
      </div>

      <div className="w-px h-3 bg-white/10" />

      {/* Net */}
      <div className="flex items-center gap-1.5">
        <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-slate-100">{network.downMbps.toFixed(0)}</span>
        <ArrowUp className="w-3.5 h-3.5 text-violet-400 ml-1" />
        <span className="font-bold text-slate-100">{network.upMbps.toFixed(0)}</span>
        <span className="text-[10px] text-slate-500">M</span>
      </div>

      {topQuota && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Quota</span>
            <span className="font-bold text-slate-100">{Math.round(topQuota.sessionLimit.usedPct)}%</span>
          </div>
        </>
      )}

      {media.title && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 max-w-[180px] truncate">
            <Music className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-200 truncate">{media.title}</span>
          </div>
        </>
      )}
    </div>
  );
};

