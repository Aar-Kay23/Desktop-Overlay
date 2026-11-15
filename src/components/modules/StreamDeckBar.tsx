import React, { useState } from 'react';
import { Mic, MicOff, Lock, Trash2, Terminal, Code2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeColor: string;
}

export const StreamDeckBar: React.FC = () => {
  const [micMuted, setMicMuted] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const triggerAction = (id: string) => {
    setActiveAction(id);
    if (id === 'mic') setMicMuted(!micMuted);

    if (id === 'clean') {
      try {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.9 },
          colors: ['#06b6d4', '#8b5cf6'],
        });
      } catch {}
    }

    setTimeout(() => {
      setActiveAction(null);
    }, 1200);
  };

  const actions: QuickAction[] = [
    {
      id: 'mic',
      label: micMuted ? 'Muted' : 'Mic On',
      icon: micMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />,
      activeColor: micMuted ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/40 bg-emerald-500/10',
    },
    {
      id: 'clean',
      label: 'Trim RAM',
      icon: <Trash2 className="w-4 h-4 text-cyan-400" />,
      activeColor: 'border-cyan-500/40 bg-cyan-500/10',
    },
    {
      id: 'code',
      label: 'VS Code',
      icon: <Code2 className="w-4 h-4 text-blue-400" />,
      activeColor: 'border-blue-500/40 bg-blue-500/10',
    },
    {
      id: 'term',
      label: 'Terminal',
      icon: <Terminal className="w-4 h-4 text-amber-400" />,
      activeColor: 'border-amber-500/40 bg-amber-500/10',
    },
    {
      id: 'lock',
      label: 'Lock PC',
      icon: <Lock className="w-4 h-4 text-violet-400" />,
      activeColor: 'border-violet-500/40 bg-violet-500/10',
    },
  ];

  return (
    <div className="glass-card rounded-xl p-3 flex flex-col gap-2 relative border border-white/5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Quick Desktop Actions
        </span>
        <span className="text-[10px] font-mono text-cyan-400">StreamDeck Ready</span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {actions.map((act) => {
          const isFired = activeAction === act.id;

          return (
            <button
              key={act.id}
              onClick={() => triggerAction(act.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all duration-200 cursor-pointer group active:scale-95 ${
                isFired
                  ? `${act.activeColor} shadow-md`
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="mb-1 transition-transform group-hover:scale-110">
                {isFired && act.id !== 'mic' ? <Check className="w-4 h-4 text-emerald-400" /> : act.icon}
              </div>
              <span className="text-[10px] font-medium text-slate-300 group-hover:text-white truncate w-full text-center">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
