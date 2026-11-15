import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { CircularGauge } from '../ui/CircularGauge';
import { Sparkline } from '../ui/Sparkline';
import { ProgressBar } from '../ui/ProgressBar';
import { formatMegabytes } from '../../lib/utils';
import type { WidgetProps } from '../../types/widgets';

export const MemoryWidget: React.FC<WidgetProps> = React.memo(({ size }) => {
  const { snapshot } = useTelemetry();
  const { memory, topProcesses } = snapshot;

  const freeGb = ((memory.totalMb - memory.usedMb) / 1024).toFixed(1);

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <CircularGauge
          value={memory.pct}
          size={90}
          strokeWidth={8}
          unit="%"
          color="violet"
          subLabel={`${freeGb} GB Free`}
        />
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between pb-0.5">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight text-white font-mono">
              {Math.round(memory.pct)}
            </span>
            <span className="text-xs text-slate-400 font-medium">% RAM</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {formatMegabytes(memory.usedMb)} / {formatMegabytes(memory.totalMb)}
          </span>
        </div>

        <div className="my-0.5">
          <Sparkline data={memory.history} color="violet" height={24} />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>{freeGb} GB Available</span>
          <span>Swap: {memory.swapUsedMb ? formatMegabytes(memory.swapUsedMb) : '0 MB'}</span>
        </div>
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-2.5">
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-white">
              {Math.round(memory.pct)}
            </span>
            <span className="text-sm text-slate-400 font-medium">%</span>
          </div>
          <span className="text-xs font-mono text-violet-400 font-semibold">
            {freeGb} GB Free
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          Physical: {formatMegabytes(memory.usedMb)} / {formatMegabytes(memory.totalMb)}
        </p>
      </div>

      {/* 30s History */}
      <div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
          Allocation History (30s)
        </span>
        <Sparkline data={memory.history} color="violet" height={44} showMinMax />
      </div>

      {/* Memory Breakdown */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Physical RAM</span>
            <span className="text-slate-200">{Math.round(memory.pct)}%</span>
          </div>
          <ProgressBar value={memory.pct} color="violet" height={5} />
        </div>

        {memory.swapTotalMb && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Pagefile / Swap</span>
              <span className="text-slate-200">
                {Math.round(((memory.swapUsedMb || 0) / memory.swapTotalMb) * 100)}%
              </span>
            </div>
            <ProgressBar
              value={((memory.swapUsedMb || 0) / memory.swapTotalMb) * 100}
              color="violet"
              height={5}
            />
          </div>
        )}
      </div>

      {/* Top Memory Hogging Processes */}
      <div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
          Largest In-Memory Apps
        </span>
        <div className="flex flex-col gap-1">
          {topProcesses.slice(0, 2).map((p) => (
            <div key={p.pid} className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-300 truncate max-w-[180px]">{p.name}</span>
              <span className="text-violet-400 font-semibold">{formatMegabytes(p.memMb)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

