import React from 'react';
import {
  Radio,
  Sparkles,
  Settings,
  LayoutGrid,
  Sidebar as SidebarIcon,
  Maximize2,
  Layers,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatClockTime } from '../../lib/utils';
import type { OverlayMode } from '../../types/telemetry';

export const HeaderBar: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { mode, setMode, source, setSource, agentOnline, snapshot } = useTelemetry();
  const [time, setTime] = React.useState(formatClockTime());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(formatClockTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const modes: { id: OverlayMode; label: string; icon: React.ReactNode }[] = [
    { id: 'canvas', label: 'Desktop Widgets', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'sidebar', label: 'Dock', icon: <SidebarIcon className="w-3.5 h-3.5" /> },
    { id: 'hud', label: 'HUD Island', icon: <Maximize2 className="w-3.5 h-3.5" /> },
    { id: 'minibar', label: 'MiniBar', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="macos-glass sticky top-0 z-50 px-5 py-2.5 flex items-center justify-between border-b border-white/10 gap-3 select-none">
      {/* Brand & Hostname */}
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
          DO
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-semibold text-white tracking-tight">
              Desktop-Overlay
            </h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              v1.0
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            {snapshot.hostname} • {time}
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-black/40 border border-white/10">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === m.id
                ? 'bg-white text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Controls & Connection Status */}
      <div className="flex items-center gap-2">
        {/* Source Toggle */}
        <button
          onClick={() => setSource(source === 'live-agent' ? 'simulation' : 'live-agent')}
          title={source === 'live-agent' ? 'Connected to PhoneBox Agent' : 'Running in Standalone OS Telemetry'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            source === 'live-agent'
              ? agentOnline
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-white/10 text-white border-white/10 hover:bg-white/15'
          }`}
        >
          {source === 'live-agent' ? (
            <>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{agentOnline ? 'Agent' : 'Offline'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-slate-300" />
              <span>Native OS</span>
            </>
          )}
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
