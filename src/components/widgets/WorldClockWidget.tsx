import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import type { WidgetProps } from '../../types/widgets';

interface CityTime {
  name: string;
  tz: string;
  flag: string;
}

const CITIES: CityTime[] = [
  { name: 'Local', tz: Intl.DateTimeFormat().resolvedOptions().timeZone, flag: '📍' },
  { name: 'London', tz: 'Europe/London', flag: '🇬🇧' },
  { name: 'New York', tz: 'America/New_York', flag: '🇺🇸' },
  { name: 'Tokyo', tz: 'Asia/Tokyo', flag: '🇯🇵' },
];

function getTimeForZone(tz: string, now: Date) {
  const timeStr = now.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const hour = parseInt(timeStr.split(':')[0], 10);
  const isDay = hour >= 6 && hour < 19;
  return { timeStr, isDay };
}

export const WorldClockWidget: React.FC<WidgetProps> = ({ size }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // S: Dual Compact Clock
  if (size === 'S') {
    const local = getTimeForZone(CITIES[0].tz, now);
    const ny = getTimeForZone(CITIES[2].tz, now);
    return (
      <div className="flex flex-col justify-between h-full py-1">
        <div className="p-2 rounded-xl bg-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Local</span>
            {local.isDay ? <Sun className="w-2.5 h-2.5 text-amber-300" /> : <Moon className="w-2.5 h-2.5 text-indigo-300" />}
          </div>
          <span className="text-xl font-bold font-mono text-white">{local.timeStr}</span>
        </div>
        <div className="p-2 rounded-xl bg-white/[0.04]">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>New York</span>
            {ny.isDay ? <Sun className="w-2.5 h-2.5 text-amber-300" /> : <Moon className="w-2.5 h-2.5 text-indigo-300" />}
          </div>
          <span className="text-xl font-bold font-mono text-white">{ny.timeStr}</span>
        </div>
      </div>
    );
  }

  // V: Vertical Stack (164x344 Portrait)
  if (size === 'V') {
    return (
      <div className="flex flex-col justify-between h-full py-1 gap-2">
        {CITIES.map((c) => {
          const { timeStr, isDay } = getTimeForZone(c.tz, now);
          return (
            <div key={c.name} className="flex-1 p-2 rounded-xl bg-white/[0.04] flex flex-col justify-center">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                <span>{c.flag} {c.name}</span>
                {isDay ? <Sun className="w-3 h-3 text-amber-300" /> : <Moon className="w-3 h-3 text-indigo-300" />}
              </div>
              <span className="text-lg font-bold font-mono text-white tracking-tight">{timeStr}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // M: Landscape Row (344x164)
  return (
    <div className="grid grid-cols-3 gap-2.5 h-full items-center">
      {CITIES.slice(0, 3).map((c) => {
        const { timeStr, isDay } = getTimeForZone(c.tz, now);
        return (
          <div key={c.name} className="p-3 rounded-xl bg-white/[0.04] flex flex-col justify-center h-full">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>{c.flag} {c.name}</span>
              {isDay ? <Sun className="w-3 h-3 text-amber-300" /> : <Moon className="w-3 h-3 text-indigo-300" />}
            </div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
};
