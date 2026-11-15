import React from 'react';
import { cn } from '../../lib/utils';

interface CircularGaugeProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  subLabel?: string;
  color?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'dynamic';
  className?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  size = 110,
  strokeWidth = 9,
  label,
  unit = '%',
  subLabel,
  color = 'dynamic',
  className,
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Determine dynamic gradient / colors based on value
  const getGradientId = () => {
    if (color === 'dynamic') {
      if (clamped >= 85) return 'gauge-rose';
      if (clamped >= 70) return 'gauge-amber';
      return 'gauge-cyan';
    }
    return `gauge-${color}`;
  };

  const getTextColor = () => {
    if (color === 'dynamic') {
      if (clamped >= 85) return 'text-rose-400';
      if (clamped >= 70) return 'text-amber-400';
      return 'text-cyan-400';
    }
    const map = {
      cyan: 'text-cyan-400',
      emerald: 'text-emerald-400',
      violet: 'text-violet-400',
      amber: 'text-amber-400',
    };
    return map[color];
  };

  const gradientId = getGradientId();

  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          <defs>
            <linearGradient id="gauge-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="gauge-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="gauge-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
            <linearGradient id="gauge-amber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="gauge-rose" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Foreground Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className={cn('text-2xl font-bold tracking-tight transition-colors duration-300', getTextColor())}>
              {Math.round(clamped)}
            </span>
            {unit && <span className="text-xs font-semibold text-slate-400 ml-0.5">{unit}</span>}
          </div>
          {label && <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">{label}</span>}
        </div>
      </div>

      {subLabel && (
        <span className="text-xs text-slate-300 font-medium mt-2">{subLabel}</span>
      )}
    </div>
  );
};

