import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { CircularGauge } from '../ui/CircularGauge';
import { Sparkline } from '../ui/Sparkline';
import type { WidgetProps } from '../../types/widgets';

export const CpuWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const { cpu, topProcesses } = snapshot;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <CircularGauge
          value={cpu.loadPct}
          size={90}
          strokeWidth={8}
          unit="%"
          color="cyan"
          subLabel={cpu.freqGhz ? `${cpu.freqGhz.toFixed(1)} GHz` : undefined}
        />
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-white">
              {Math.round(cpu.loadPct)}
            </span>
            <span className="text-xs text-slate-400 font-medium">% Load</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            {cpu.freqGhz && <span>{cpu.freqGhz.toFixed(2)} GHz</span>}
            {cpu.tempC && <span className="text-slate-300">{cpu.tempC}°C</span>}
          </div>
        </div>

        <div className="my-1">
          <Sparkline data={cpu.history} color="cyan" height={42} />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Active Core Average</span>
          <span>{cpu.cores?.length || 8} Cores</span>
        </div>
      </div>
    );
  }

  // Large (L: 2x2)
  return (
    <div className="flex-1 flex flex-col justify-between gap-2.5">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight text-white">
            {Math.round(cpu.loadPct)}
          </span>
          <span className="text-sm text-slate-400 font-medium">%</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{cpu.freqGhz?.toFixed(2) || '4.2'} GHz</span>
          <span className="text-slate-300">{cpu.tempC || 52}°C</span>
        </div>
      </div>

      {/* 30s History */}
      <div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
          Activity (30s)
        </span>
        <Sparkline data={cpu.history} color="cyan" height={44} showMinMax />
      </div>

      {/* Per-Core Distribution */}
      {cpu.cores && cpu.cores.length > 0 && (
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1.5">
            Core Distribution ({cpu.cores.length})
          </span>
          <div className="grid grid-cols-8 gap-1">
            {cpu.cores.slice(0, 16).map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-7 w-full bg-white/5 rounded-xs overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-cyan-400 rounded-2xs transition-all duration-300"
                    style={{ height: `${c}%` }}
                  />
                </div>
                <span className="text-[8px] text-slate-500 font-mono">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top CPU Consumer Processes */}
      <div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
          Top Consumers
        </span>
        <div className="flex flex-col gap-1">
          {topProcesses.slice(0, 2).map((p) => (
            <div key={p.pid} className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-300 truncate max-w-[180px]">{p.name}</span>
              <span className="text-cyan-400 font-semibold">{p.cpuPct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
