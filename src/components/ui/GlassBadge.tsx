import React from 'react';
import { cn } from '../../lib/utils';

interface GlassBadgeProps {
  label: string;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'neutral';
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  label,
  variant = 'cyan',
  pulse = false,
  icon,
  className,
}) => {
  const variantStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_-2px_rgba(6,182,212,0.3)]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3)]',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20 shadow-[0_0_12px_-2px_rgba(139,92,246,0.3)]',
    neutral: 'bg-white/5 text-slate-400 border-white/10',
  };

  const dotColors = {
    cyan: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
    emerald: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
    amber: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
    rose: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
    violet: 'bg-violet-400 shadow-[0_0_8px_#a78bfa]',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase border backdrop-blur-md transition-all duration-300',
        variantStyles[variant],
        className
      )}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColors[variant])} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColors[variant])} />
        </span>
      ) : icon ? (
        <span className="w-3 h-3 flex items-center justify-center">{icon}</span>
      ) : null}
      {label}
    </span>
  );
};

