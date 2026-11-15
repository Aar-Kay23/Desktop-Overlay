import React from 'react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    text: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subValue,
  icon,
  badge,
  children,
  onClick,
  className,
  trend,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group',
        onClick && 'cursor-pointer active:scale-[0.99]',
        className
      )}
    >
      {/* Ambient background glow on hover */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-cyan-500/[0.08] transition-all duration-500 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
              {icon}
            </div>
          )}
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            {title}
          </span>
        </div>
        {badge}
      </div>

      {/* Value & Subvalue */}
      <div className="flex items-baseline justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors">
            {value}
          </span>
          {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
        </div>

        {subValue && (
          <span className="text-xs font-medium text-slate-400 font-mono">
            {subValue}
          </span>
        )}

        {trend && (
          <span
            className={cn(
              'text-[11px] font-mono font-medium flex items-center gap-0.5',
              trend.direction === 'up' && 'text-emerald-400',
              trend.direction === 'down' && 'text-rose-400',
              trend.direction === 'neutral' && 'text-slate-400'
            )}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.text}
          </span>
        )}
      </div>

      {/* Slot for Sparkline, Gauge or Progress */}
      {children && <div className="relative z-10 mt-auto pt-1">{children}</div>}
    </div>
  );
};

