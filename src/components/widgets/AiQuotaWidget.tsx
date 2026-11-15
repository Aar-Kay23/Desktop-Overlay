import React from 'react';
import { Sparkles, Terminal, Flame, Clock } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { CircularGauge } from '../ui/CircularGauge';
import { ProgressBar } from '../ui/ProgressBar';
import type { WidgetProps } from '../../types/widgets';

export const AiQuotaWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot } = useTelemetry();
  const { quotas } = snapshot;

  const primary = quotas[0] || {
    displayName: 'Antigravity',
    activeModel: 'Gemini 3.8 Flash',
    sessionLimit: { label: 'Session', usedPct: 34, resetsInHours: 2.5 },
    weeklyLimit: { label: 'Weekly', usedPct: 52 },
    burnRateTokensPerMin: 1450,
  };

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <CircularGauge
          value={primary.sessionLimit.usedPct}
          size={90}
          strokeWidth={8}
          unit="%"
          color="cyan"
          label="Session"
          subLabel={primary.activeModel}
        />
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">{primary.displayName}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              {primary.activeModel}
            </span>
          </div>

          {primary.burnRateTokensPerMin && (
            <span className="text-[10px] font-mono text-amber-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10">
              <Flame className="w-3 h-3 text-amber-400" />
              {primary.burnRateTokensPerMin} t/m
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 my-auto">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">5h Burst Limit</span>
              <span className="text-white font-semibold">{Math.round(primary.sessionLimit.usedPct)}%</span>
            </div>
            <ProgressBar value={primary.sessionLimit.usedPct} color="cyan" height={4} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Weekly Pool</span>
              <span className="text-slate-300">{Math.round(primary.weeklyLimit.usedPct)}%</span>
            </div>
            <ProgressBar value={primary.weeklyLimit.usedPct} color="violet" height={4} />
          </div>
        </div>

        {primary.sessionLimit.resetsInHours && (
          <div className="flex justify-end items-center text-[10px] text-slate-500 font-mono gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>Resets in {primary.sessionLimit.resetsInHours}h</span>
          </div>
        )}
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-baseline justify-between mb-0.5">
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" /> AI Coding Quotas
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          Model Token Pools & Rate Limits
        </p>
      </div>

      <div className="flex flex-col gap-2.5 my-auto">
        {quotas.map((q) => (
          <div key={q.provider} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {q.provider === 'claude' ? (
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span className="text-xs font-semibold text-slate-200">{q.displayName}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{q.activeModel}</span>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Usage</span>
                <span className="text-white font-bold">{Math.round(q.sessionLimit.usedPct)}%</span>
              </div>
              <ProgressBar
                value={q.sessionLimit.usedPct}
                color={q.provider === 'claude' ? 'amber' : 'cyan'}
                height={5}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
