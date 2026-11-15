import React from 'react';
import { ArrowDown, ArrowUp, Wifi } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Sparkline } from '../ui/Sparkline';
import type { WidgetProps } from '../../types/widgets';

export const NetworkWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const { network } = snapshot;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03]">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold">Down</span>
          </div>
          <span className="text-sm font-bold font-mono text-white">
            {network.downMbps.toFixed(0)} <span className="text-[9px] font-normal text-slate-400">M</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.03]">
          <div className="flex items-center gap-1.5 text-violet-400">
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-bold">Up</span>
          </div>
          <span className="text-sm font-bold font-mono text-white">
            {network.upMbps.toFixed(0)} <span className="text-[9px] font-normal text-slate-400">M</span>
          </span>
        </div>
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400 inline" />
              <span className="text-xl font-bold font-mono text-white">
                {network.downMbps.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Mbps</span>
            </div>
            <div className="flex items-baseline gap-1">
              <ArrowUp className="w-3.5 h-3.5 text-violet-400 inline" />
              <span className="text-xl font-bold font-mono text-white">
                {network.upMbps.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400">Mbps</span>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {network.pingMs} ms
          </span>
        </div>

        <div className="my-0.5">
          <Sparkline data={network.historyDown} color="cyan" height={28} />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>Active Interface</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Wifi className="w-2.5 h-2.5 text-emerald-400" /> Connected
          </span>
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
            Network Activity
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            {network.pingMs} ms Latency
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          Throughput & Interface Statistics
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-cyan-400 flex items-center gap-1">
              <ArrowDown className="w-3 h-3" /> Inbound
            </span>
            <span className="text-white font-bold">{network.downMbps.toFixed(1)} Mbps</span>
          </div>
          <Sparkline data={network.historyDown} color="cyan" height={40} />
        </div>

        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-violet-400 flex items-center gap-1">
              <ArrowUp className="w-3 h-3" /> Outbound
            </span>
            <span className="text-white font-bold">{network.upMbps.toFixed(1)} Mbps</span>
          </div>
          <Sparkline data={network.historyUp} color="violet" height={40} />
        </div>
      </div>

      <div className="flex justify-between items-center text-xs font-mono p-2 rounded-xl bg-white/[0.02] border border-white/5">
        <span className="text-slate-400">DNS Gateway</span>
        <span className="text-slate-200">1.1.1.1 (Cloudflare)</span>
      </div>
    </div>
  );
};

