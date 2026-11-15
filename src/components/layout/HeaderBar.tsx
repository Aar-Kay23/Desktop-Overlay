import React from 'react';
import {
  Layers,
  LayoutGrid,
  Sidebar as SidebarIcon,
  Maximize2,
  Pin,
  PinOff,
  Radio,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatClockTime } from '../../lib/utils';
import type { OverlayMode } from '../../types/telemetry';

export const HeaderBar: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { mode, setMode, source, setSource, agentOnline, isPinned, togglePin, snapshot } = useTelemetry();
  const [time, setTime] = React.useState(formatClockTime());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(formatClockTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const modes: { id: OverlayMode; label: string; icon: React.ReactNode }[] = [
    { id: 'sidebar', label: 'Sidebar Dock', icon: <SidebarIcon className="w-3.5 h-3.5" /> },
    { id: 'hud', label: 'Dynamic HUD', icon: <Maximize2 className="w-3.5 h-3.5" /> },
    { id: 'dashboard', label: 'Full Grid', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'minibar', label: 'Mini Bar', icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="glass-panel sticky top-0 z-50 px-4 py-2.5 flex items-center justify-between border-b border-white/10 gap-3">
      {/* Brand & Hostname */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-violet-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-[0_0_15px_rgba(6,182,212,0.5)]">
          DO
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Desktop Overlay
            </h1>
            <span className="text-[9px] px-1.5 py-0.2 rounded-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              v1.0
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono block">
            {snapshot.hostname} • {time}
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              mode === m.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
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
          title={source === 'live-agent' ? 'Connected to PhoneBox Agent' : 'Running in Simulation Mode'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            source === 'live-agent'
              ? agentOnline
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
          }`}
        >
          {source === 'live-agent' ? (
            <>
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{agentOnline ? 'Live Agent' : 'Agent Offline'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span>Simulated</span>
            </>
          )}
        </button>

        {/* Pin Button */}
        <button
          onClick={togglePin}
          title={isPinned ? 'Window Pinned' : 'Pin to Top'}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            isPinned
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
          }`}
        >
          {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:text-white transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};
