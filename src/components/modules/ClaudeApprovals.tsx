import React, { useState } from 'react';
import { ShieldAlert, Check, X, Terminal } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import confetti from 'canvas-confetti';

export const ClaudeApprovals: React.FC = () => {
  const { snapshot, decideApproval } = useTelemetry();
  const { pendingApprovals } = snapshot;
  const [actingId, setActingId] = useState<string | null>(null);

  if (!pendingApprovals || pendingApprovals.length === 0) {
    return null;
  }

  const handleDecision = async (id: string, decision: 'allow' | 'deny') => {
    setActingId(id);
    if (decision === 'allow') {
      try {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#10b981', '#3b82f6'],
        });
      } catch {}
    }
    await decideApproval(id, decision);
    setActingId(null);
  };

  return (
    <div className="flex flex-col gap-2.5 my-1">
      {pendingApprovals.map((req) => (
        <div
          key={req.id}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-3.5 backdrop-blur-xl shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)] animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {req.source} Permission Request
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              {req.project}
            </span>
          </div>

          {/* Action details */}
          <div className="flex items-center gap-2 mb-2 bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-xs text-slate-200">
            <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{req.description}</span>
          </div>

          {req.detail && (
            <p className="text-[11px] text-slate-400 mb-3 px-1 leading-relaxed">
              {req.detail}
            </p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              disabled={actingId === req.id}
              onClick={() => handleDecision(req.id, 'deny')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Deny
            </button>
            <button
              disabled={actingId === req.id}
              onClick={() => handleDecision(req.id, 'allow')}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_15px_-2px_#34d399] active:scale-95 transition-all flex items-center gap-1 cursor-pointer font-bold"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Allow Action
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
