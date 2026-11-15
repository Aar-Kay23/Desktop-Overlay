import React from 'react';
import { cn } from '../../lib/utils';

interface SparklineProps {
  data: number[];
  color?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
  height?: number;
  width?: number | string;
  showMinMax?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = 'cyan',
  height = 42,
  showMinMax = false,
  className,
}) => {
  if (!data || data.length < 2) {
    return <div style={{ height }} className="w-full bg-white/5 rounded-md animate-pulse" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;

  // ViewBox coordinates
  const svgWidth = 200;
  const svgHeight = 60;
  const padding = 6;
  const innerHeight = svgHeight - padding * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * svgWidth;
    const y = svgHeight - padding - ((val - min) / range) * innerHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  const colorMap = {
    cyan: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.25)', glow: 'rgba(6, 182, 212, 0.6)' },
    emerald: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', glow: 'rgba(16, 185, 129, 0.6)' },
    violet: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.25)', glow: 'rgba(139, 92, 246, 0.6)' },
    amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', glow: 'rgba(245, 158, 11, 0.6)' },
    rose: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.25)', glow: 'rgba(244, 63, 94, 0.6)' },
  };

  const c = colorMap[color];
  const lastVal = data[data.length - 1];
  const lastPoint = points[points.length - 1].split(',');

  return (
    <div className={cn('relative w-full flex flex-col justify-end', className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.fill} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Gradient Area */}
        <path d={areaD} fill={`url(#grad-${color})`} />

        {/* Stroke Line */}
        <path
          d={pathD}
          fill="none"
          stroke={c.stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current Active Dot */}
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="3.5"
          fill={c.stroke}
          style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }}
        />
      </svg>

      {showMinMax && (
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1">
          <span>{min}</span>
          <span className="text-slate-400 font-semibold">{lastVal}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
};
