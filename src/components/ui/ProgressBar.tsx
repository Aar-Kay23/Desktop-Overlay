import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'gradient';
  height?: number;
  showLabel?: boolean;
  glow?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = 'cyan',
  height = 6,
  showLabel = false,
  glow = false,
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  const colorStyles = {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    violet: 'bg-violet-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    gradient: 'bg-gradient-to-r from-cyan-400 via-violet-400 to-rose-400',
  };

  const glowStyles = {
    cyan: 'shadow-[0_0_10px_#22d3ee]',
    emerald: 'shadow-[0_0_10px_#34d399]',
    violet: 'shadow-[0_0_10px_#a78bfa]',
    amber: 'shadow-[0_0_10px_#fbbf24]',
    rose: 'shadow-[0_0_10px_#f43f5e]',
    gradient: 'shadow-[0_0_12px_rgba(139,92,246,0.6)]',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1', className)}>
      <div
        className="w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5"
        style={{ height: height + 2 }}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            colorStyles[color],
            glow && glowStyles[color]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>Usage</span>
          <span className="font-semibold text-slate-200">{Math.round(clamped)}%</span>
        </div>
      )}
    </div>
  );
};

