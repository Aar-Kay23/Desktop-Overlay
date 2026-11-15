import React from 'react';
import { Layers, XCircle } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatMegabytes } from '../../lib/utils';
import type { WidgetProps } from '../../types/widgets';

export const ProcessWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot, killProcess } = useTelemetry();
  const { topProcesses } = snapshot;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Layers className="w-8 h-8 text-slate-400 mb-1" />
        <span className="text-2xl font-bold font-mono text-white">
          {topProcesses.length}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
          Active Tasks
        </span>
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-slate-400">
          <span>Top Resource Apps</span>
          <span>{topProcesses.length} Monitored</span>
        </div>

        <div className="flex flex-col gap-1.5 my-auto">
          {topProcesses.slice(0, 3).map((p) => (
            <div key={p.pid} className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300 truncate max-w-[170px]">{p.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{p.cpuPct.toFixed(1)}%</span>
                <button
                  onClick={() => killProcess(p.name, p.pid)}
                  title="End Process"
                  className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xl font-bold text-white tracking-tight">Active Processes</span>
        <span className="text-xs font-mono text-slate-400">{topProcesses.length} items</span>
      </div>

      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[260px] pr-1">
        {topProcesses.slice(0, 6).map((p) => (
          <div
            key={p.pid}
            className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs font-mono"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-slate-200 truncate font-semibold">{p.name}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-white">{p.cpuPct.toFixed(1)}%</span>
              <span className="text-slate-400 w-16 text-right">{formatMegabytes(p.memMb)}</span>
              <button
                onClick={() => killProcess(p.name, p.pid)}
                title="End Process"
                className="text-slate-500 hover:text-rose-400 p-0.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

