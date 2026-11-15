import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { CircularGauge } from '../ui/CircularGauge';
import { Sparkline } from '../ui/Sparkline';
import { ProgressBar } from '../ui/ProgressBar';
import { formatMegabytes } from '../../lib/utils';
import type { WidgetProps } from '../../types/widgets';

export const GpuWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const { gpu } = snapshot;

  const vramPct = (gpu.vramUsedMb / (gpu.vramTotalMb || 8192)) * 100;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <CircularGauge
          value={gpu.loadPct}
          size={90}
          strokeWidth={8}
          unit="%"
          color="emerald"
          subLabel={`${Math.round(vramPct)}% VRAM`}
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
              {Math.round(gpu.loadPct)}
            </span>
            <span className="text-xs text-slate-400 font-medium">% GPU</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            {formatMegabytes(gpu.vramUsedMb)} / {formatMegabytes(gpu.vramTotalMb)}
          </div>
        </div>

        <div className="my-0.5">
          <Sparkline data={gpu.history} color="emerald" height={28} />
        </div>

        <div className="flex flex-col gap-1">
          <ProgressBar value={vramPct} color="emerald" height={4} />
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span className="truncate max-w-[200px]">{gpu.name}</span>
            <span>{gpu.tempC || 54}°C</span>
          </div>
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
              {Math.round(gpu.loadPct)}
            </span>
            <span className="text-sm text-slate-400 font-medium">% Load</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {gpu.tempC || 54}°C
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate font-mono">
          {gpu.name}
        </p>
      </div>

      {/* Sparkline */}
      <div>
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
          Engine Activity (30s)
        </span>
        <Sparkline data={gpu.history} color="emerald" height={44} showMinMax />
      </div>

      {/* VRAM Pool */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Video Memory</span>
          <span className="text-slate-200">
            {formatMegabytes(gpu.vramUsedMb)} / {formatMegabytes(gpu.vramTotalMb)}
          </span>
        </div>
        <ProgressBar value={vramPct} color="emerald" height={6} />
      </div>

      {/* Thermal & Power */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
        <div className="flex justify-between p-2 rounded-lg bg-white/[0.02]">
          <span className="text-slate-400">Power</span>
          <span className="text-slate-200">{gpu.powerWatts || 145}W</span>
        </div>
        <div className="flex justify-between p-2 rounded-lg bg-white/[0.02]">
          <span className="text-slate-400">Fan</span>
          <span className="text-slate-200">{gpu.fanPct || 42}%</span>
        </div>
      </div>
    </div>
  );
};

