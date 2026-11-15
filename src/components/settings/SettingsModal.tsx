import React, { useState } from 'react';
import { X, Server, Sliders, Shield, Info, Check } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { source, setSource, agentOnline, agentUrl, setAgentUrl } = useTelemetry();
  const [localUrl, setLocalUrl] = useState(agentUrl);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setAgentUrl(localUrl);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-panel rounded-2xl p-5 border border-white/15 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Overlay Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Agent Endpoint */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              PhoneBox Host Agent Endpoint
            </label>
            <input
              type="text"
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-400"
            />
            <span className="text-[10px] text-slate-400">
              Default is http://127.0.0.1:8765. Status:{' '}
              <span className={agentOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {agentOnline ? 'Connected' : 'Offline / Unreachable'}
              </span>
            </span>
          </div>

          {/* Source Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Telemetry Data Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSource('live-agent')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  source === 'live-agent'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Live PhoneBox Agent
              </button>
              <button
                onClick={() => setSource('simulation')}
                className={`py-2 px-3 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  source === 'simulation'
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                Simulation Demo
              </button>
            </div>
          </div>

          {/* Desktop Launcher Info */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5 text-slate-300">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <Info className="w-3.5 h-3.5" />
              Windows Desktop Window Mode
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              Launch borderless desktop app window:
              <br />
              <code className="text-slate-200 bg-black/50 px-1 py-0.5 rounded">
                msedge.exe --app=http://localhost:5173 --window-size=420,950
              </code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4 stroke-[3]" /> : null}
            {saved ? 'Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
