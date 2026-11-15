import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import type { WidgetProps } from '../../types/widgets';

export const ClockWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const dayName = now.toLocaleDateString([], { weekday: 'short' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-light tracking-tight text-white font-mono">
          {hours}:{minutes}
        </span>
        <span className="text-xs text-slate-400 font-medium mt-1">
          {dayName}, {dateStr}
        </span>
      </div>
    );
  }

  if (size === 'V') {
    return (
      <div className="flex-1 flex flex-col justify-between py-2 text-center">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {dayName}
          </span>
          <div className="text-4xl font-extralight tracking-tighter text-white font-mono my-1">
            {hours}
            <span className="text-slate-500">:</span>
            {minutes}
          </div>
          <div className="text-[11px] text-slate-300 font-medium">
            {dateStr}, {now.getFullYear()}
          </div>
        </div>

        <div className="flex flex-col gap-2 my-2 py-2 border-y border-white/10 text-xs font-mono">
          <div className="flex justify-between items-center px-1">
            <span className="text-slate-400">Seconds</span>
            <span className="text-white font-bold">{seconds}s</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-slate-400">Uptime</span>
            <span className="text-white">{snapshot.uptimeHours}h</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-slate-400">UTC</span>
            <span className="text-slate-300">
              {now.getUTCHours().toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="px-2 py-1.5 rounded-xl bg-white/[0.04] text-[10px] text-slate-400 font-mono">
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-light tracking-tight text-white font-mono">
              {hours}:{minutes}
            </span>
            <span className="text-sm font-mono text-slate-400">:{seconds}</span>
          </div>
          <span className="text-xs text-slate-300 font-medium">
            {dayName}, {dateStr}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 my-auto pt-2 border-t border-white/5 text-[11px] font-mono">
          <div className="flex flex-col">
            <span className="text-slate-500">Uptime</span>
            <span className="text-slate-200">{snapshot.uptimeHours}h</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">UTC</span>
            <span className="text-slate-200">
              {now.getUTCHours().toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">Tokyo</span>
            <span className="text-slate-200">
              {((now.getUTCHours() + 9) % 24).toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-4xl font-light tracking-tight text-white font-mono">
            {hours}:{minutes}
          </span>
          <span className="text-base font-mono text-slate-400">:{seconds}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white">{dayName}</p>
          <p className="text-xs text-slate-400">{dateStr}, {now.getFullYear()}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 my-auto">
        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
          Global Financial Centers
        </span>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-white/[0.02] flex justify-between">
            <span className="text-slate-400">London</span>
            <span className="text-white">
              {now.getUTCHours().toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] flex justify-between">
            <span className="text-slate-400">New York</span>
            <span className="text-white">
              {((now.getUTCHours() - 5 + 24) % 24).toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] flex justify-between">
            <span className="text-slate-400">Tokyo</span>
            <span className="text-white">
              {((now.getUTCHours() + 9) % 24).toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.02] flex justify-between">
            <span className="text-slate-400">San Francisco</span>
            <span className="text-white">
              {((now.getUTCHours() - 8 + 24) % 24).toString().padStart(2, '0')}:{now.getUTCMinutes().toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-white/5 text-slate-400">
        <span>System Uptime</span>
        <span className="text-slate-200 font-semibold">{snapshot.uptimeHours} Hours</span>
      </div>
    </div>
  );
};

