import React from 'react';
import { Sparkles, Terminal, Bot, Flame, Clock } from 'lucide-react';
import { CircularGauge } from '../ui/CircularGauge';
import { GlassBadge } from '../ui/GlassBadge';
import { ProgressBar } from '../ui/ProgressBar';
import { useTelemetry } from '../../context/TelemetryContext';

export const AIQuotaCockpit: React.FC = () => {
  const { snapshot } = useTelemetry();
  const { quotas } = snapshot;

  const providerIcons = {
    antigravity: <Sparkles className="w-4 h-4 text-cyan-400" />,
    claude: <Terminal className="w-4 h-4 text-amber-400" />,
    codex: <Bot className="w-4 h-4 text-violet-400" />,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs uppercase font-bold tracking-wider text-slate-300">
            AI Assistant Quotas & Burn Rates
          </h2>
        </div>
        <GlassBadge label="Active Monitoring" variant="cyan" pulse />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {quotas.map((q) => (
          <div
            key={q.provider}
            className="glass-card rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group border border-white/5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  {providerIcons[q.provider]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">
                    {q.displayName}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {q.activeModel}
                  </span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
                {q.planName}
              </span>
            </div>

            {/* Circular Gauge for Primary Session Limit */}
            <div className="my-2 flex flex-col items-center justify-center">
              <CircularGauge
                value={q.sessionLimit.usedPct}
                size={116}
                strokeWidth={9}
                label="Session"
                unit="%"
                subLabel={q.sessionLimit.label}
                color={q.provider === 'antigravity' ? 'cyan' : q.provider === 'claude' ? 'amber' : 'violet'}
              />
            </div>

            {/* Secondary Weekly Pool Bar */}
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-medium">{q.weeklyLimit.label}</span>
                <span className="text-slate-200 font-mono font-semibold">
                  {Math.round(q.weeklyLimit.usedPct)}%
                </span>
              </div>
              <ProgressBar
                value={q.weeklyLimit.usedPct}
                color={q.provider === 'antigravity' ? 'cyan' : q.provider === 'claude' ? 'amber' : 'violet'}
                height={5}
              />

              {/* Burn Rate & Time Till Reset */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                {q.burnRateTokensPerMin ? (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Flame className="w-3 h-3 text-amber-400" />
                    {q.burnRateTokensPerMin.toLocaleString()} tok/m
                  </span>
                ) : (
                  <span />
                )}

                {q.sessionLimit.resetsInHours ? (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    resets {q.sessionLimit.resetsInHours}h
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

