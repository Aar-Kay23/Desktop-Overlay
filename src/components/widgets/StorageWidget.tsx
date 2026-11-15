import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { CircularGauge } from '../ui/CircularGauge';
import { ProgressBar } from '../ui/ProgressBar';
import type { WidgetProps } from '../../types/widgets';

export const StorageWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const { disks } = snapshot;

  const primary = disks[0] || { mount: 'C:', usedGb: 400, totalGb: 512, pct: 78 };
  const freeGb = primary.totalGb - primary.usedGb;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <CircularGauge
          value={primary.pct}
          size={90}
          strokeWidth={8}
          unit="%"
          color="cyan"
          label={primary.mount}
          subLabel={`${freeGb} GB Free`}
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
              {primary.pct}
            </span>
            <span className="text-xs text-slate-400 font-medium">% Full</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {freeGb} GB Free on {primary.mount}
          </span>
        </div>

        <div className="flex flex-col gap-2 my-auto">
          {disks.slice(0, 2).map((d) => (
            <div key={d.mount} className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-300 font-medium">{d.mount}</span>
                <span className="text-slate-400">
                  {d.usedGb} / {d.totalGb} GB
                </span>
              </div>
              <ProgressBar value={d.pct} color="cyan" height={5} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold tracking-tight text-white">
            Volume Storage
          </span>
          <span className="text-xs font-mono text-slate-400">
            {disks.length} Drives
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          NVMe Solid State & Logical Mounts
        </p>
      </div>

      <div className="flex flex-col gap-3 my-auto">
        {disks.map((d) => (
          <div key={d.mount} className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-200 font-semibold">{d.mount} ({d.name})</span>
              <span className="text-slate-400">
                {d.usedGb} / {d.totalGb} GB ({d.pct}%)
              </span>
            </div>
            <ProgressBar value={d.pct} color={d.pct > 85 ? 'rose' : 'cyan'} height={6} />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>{d.totalGb - d.usedGb} GB Free</span>
              <span>Healthy</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

