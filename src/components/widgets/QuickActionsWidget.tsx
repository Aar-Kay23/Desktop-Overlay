import React, { useState } from 'react';
import { VolumeX, Volume2, Lock, Activity, Pin, PinOff } from 'lucide-react';
import type { WidgetProps } from '../../types/widgets';

export const QuickActionsWidget: React.FC<WidgetProps> = ({ size }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [pinned, setPinned] = useState(false);

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (window.electronAPI?.systemAction) {
      window.electronAPI.systemAction('mute');
    }
  };

  const handleLock = () => {
    if (window.electronAPI?.systemAction) {
      window.electronAPI.systemAction('lock');
    }
  };

  const handleTaskMgr = () => {
    if (window.electronAPI?.systemAction) {
      window.electronAPI.systemAction('taskmgr');
    }
  };

  const handlePin = () => {
    setPinned(!pinned);
    if (window.electronAPI?.toggleAlwaysOnTop) {
      window.electronAPI.toggleAlwaysOnTop();
    }
  };

  const actions = [
    {
      id: 'mute',
      label: isMuted ? 'Muted' : 'Mute',
      icon: isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-white" />,
      onClick: handleMute,
      active: isMuted,
    },
    {
      id: 'lock',
      label: 'Lock PC',
      icon: <Lock className="w-4 h-4 text-amber-300" />,
      onClick: handleLock,
      active: false,
    },
    {
      id: 'taskmgr',
      label: 'Task Mgr',
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      onClick: handleTaskMgr,
      active: false,
    },
    {
      id: 'pin',
      label: pinned ? 'Pinned' : 'Float Top',
      icon: pinned ? <PinOff className="w-4 h-4 text-cyan-400" /> : <Pin className="w-4 h-4 text-slate-300" />,
      onClick: handlePin,
      active: pinned,
    },
  ];

  // S: 2x2 Grid
  if (size === 'S') {
    return (
      <div className="grid grid-cols-2 gap-2 h-full py-1">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
              act.active
                ? 'bg-white/20 border border-white/30 text-white'
                : 'bg-white/[0.05] hover:bg-white/10 border border-white/5 text-slate-200'
            }`}
          >
            {act.icon}
            <span className="text-[10px] font-medium mt-1 truncate">{act.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // V: Vertical Stack (164x344 Portrait)
  if (size === 'V') {
    return (
      <div className="flex flex-col justify-between h-full py-1 gap-2.5">
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
            className={`flex-1 flex items-center gap-3 px-3 rounded-xl transition-all cursor-pointer active:scale-95 ${
              act.active
                ? 'bg-white/20 border border-white/30 text-white'
                : 'bg-white/[0.05] hover:bg-white/10 border border-white/5 text-slate-200'
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
              {act.icon}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold">{act.label}</span>
              <span className="text-[9px] text-slate-400">Quick Toggle</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // M: 4-Item Horizontal Row
  return (
    <div className="grid grid-cols-4 gap-3 h-full items-center">
      {actions.map((act) => (
        <button
          key={act.id}
          onClick={act.onClick}
          className={`h-full flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
            act.active
              ? 'bg-white/20 border border-white/30 text-white'
              : 'bg-white/[0.05] hover:bg-white/10 border border-white/5 text-slate-200'
          }`}
        >
          <div className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center mb-1.5">
            {act.icon}
          </div>
          <span className="text-xs font-semibold">{act.label}</span>
        </button>
      ))}
    </div>
  );
};
