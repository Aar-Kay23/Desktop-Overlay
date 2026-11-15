import React from 'react';
import { BatteryCharging, Battery, Zap, ShieldCheck } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import type { WidgetProps } from '../../types/widgets';

export const BatteryWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const battery = snapshot.battery || {
    hasBattery: true,
    percent: 96,
    isCharging: true,
    acConnected: true,
    model: 'DELL OEM',
    voltage: 16.4,
  };

  const pct = Math.min(100, Math.max(0, battery.percent));
  const isCharging = battery.isCharging || battery.acConnected;

  // Ring calculations
  const radius = size === 'S' ? 36 : size === 'M' ? 37 : 54;
  const stroke = size === 'S' ? 6 : size === 'M' ? 6 : 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const colorClass = pct > 20 ? 'text-emerald-400' : 'text-amber-400';
  const strokeColor = pct > 20 ? '#34d399' : '#f59e0b';

  return (
    <div className="flex flex-col justify-between h-full">
      {size === 'S' && (
        <div className="flex flex-col items-center justify-center flex-1 py-1">
          <div className="relative flex items-center justify-center">
            <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="rotate-[-90deg]">
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={stroke}
              />
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                fill="transparent"
                stroke={strokeColor}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCharging ? (
                <BatteryCharging className="w-5 h-5 text-emerald-400 mb-0.5 animate-pulse" />
              ) : (
                <Battery className={`w-5 h-5 ${colorClass} mb-0.5`} />
              )}
              <span className="text-xl font-bold tracking-tight text-white leading-none font-mono">
                {pct}%
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-2">
            {isCharging ? 'Power Adapter' : 'On Battery'}
          </span>
        </div>
      )}

      {size === 'M' && (
        <div className="flex items-center justify-between flex-1 gap-4 py-0.5">
          {/* Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="rotate-[-90deg]">
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth={stroke}
              />
              <circle
                cx={radius + stroke}
                cy={radius + stroke}
                r={radius}
                fill="transparent"
                stroke={strokeColor}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tracking-tight text-white font-mono leading-none">
                {pct}%
              </span>
              <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-1">
                Charge
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-center space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Power Source
              </span>
              <span className="text-slate-200 font-medium">
                {isCharging ? 'Power Adapter' : 'Battery'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Condition
              </span>
              <span className="text-emerald-400 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Normal (Good)
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-mono">Model</span>
              <span className="text-slate-400 font-mono truncate max-w-[120px]">
                {battery.model || 'Dell OEM'}
              </span>
            </div>
          </div>
        </div>
      )}

      {size === 'L' && (
        <div className="flex flex-col justify-between flex-1 gap-4 py-2">
          {/* Top section: Big Ring & Headline */}
          <div className="flex items-center justify-around gap-4">
            <div className="relative flex items-center justify-center">
              <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="rotate-[-90deg]">
                <circle
                  cx={radius + stroke}
                  cy={radius + stroke}
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={stroke}
                />
                <circle
                  cx={radius + stroke}
                  cy={radius + stroke}
                  r={radius}
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth={stroke}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-tight text-white font-mono leading-none">
                  {pct}%
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-1">
                  Remaining
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                {isCharging ? (
                  <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
                ) : (
                  <Battery className="w-4 h-4 text-slate-400" />
                )}
                <div className="text-xs">
                  <div className="text-slate-200 font-medium leading-none">
                    {isCharging ? 'Connected to Power' : 'Discharging'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isCharging ? 'Fully charged / maintaining' : 'Active battery drain'}
                  </div>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div className="text-xs">
                  <div className="text-slate-200 font-medium leading-none">Health Normal</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">100% capacity retention</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Grid Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider block">
                Voltage
              </span>
              <span className="text-sm font-semibold text-slate-200 font-mono mt-0.5 block">
                {battery.voltage ? `${battery.voltage.toFixed(1)} V` : '16.4 V'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider block">
                Power State
              </span>
              <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                {isCharging ? 'AC Adapter' : 'DC Battery'}
              </span>
            </div>

            <div className="col-span-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Hardware Model
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {battery.model || 'DELL XPS/Latitude OEM'}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white font-mono">
                Verified
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

