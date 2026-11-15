import React from 'react';
import { X, GripVertical } from 'lucide-react';
import type { WidgetSize } from '../../types/widgets';

interface WidgetShellProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  size: WidgetSize;
  supportedSizes?: WidgetSize[];
  onResize?: (newSize: WidgetSize) => void;
  onRemove?: () => void;
  editMode?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export const WidgetShell: React.FC<WidgetShellProps> = React.memo(({
  title,
  icon,
  size,
  supportedSizes = ['S', 'M', 'V', 'L'] as WidgetSize[],
  onResize,
  onRemove,
  editMode = false,
  children,
  badge,
}) => {
  // Spacing and inner padding mapping
  const sizeClasses = {
    S: 'p-3',
    M: 'pt-2 pb-2 px-3',
    V: 'pt-2 pb-2.5 px-3',
    L: 'p-3.5',
  };

  return (
    <div
      data-interactive="true"
      className={`w-full h-full macos-glass macos-squircle flex flex-col justify-between relative group select-none transition-shadow duration-200 pointer-events-auto ${
        sizeClasses[size]
      } ${editMode ? 'ring-1 ring-white/20 shadow-2xl' : 'hover:shadow-xl'}`}
    >
      {/* Top Header & Drag Handle */}
      <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
          <div className="w-5 h-5 rounded-md bg-white/[0.08] flex items-center justify-center text-slate-300 shrink-0">
            {icon}
          </div>
          <span className="text-[11px] font-semibold text-slate-300 tracking-tight truncate">
            {title}
          </span>
        </div>

        {/* Hover / Edit Controls */}
        <div className="flex items-center gap-1.5">
          {badge}

          <div
            className={`flex items-center gap-1 transition-opacity duration-200 ${
              editMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {/* Size Switcher */}
            {onResize && supportedSizes.length > 1 && (
              <div className="flex items-center bg-black/40 rounded-md p-0.5 border border-white/10 text-[9px] font-medium">
                {supportedSizes.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      onResize(s);
                    }}
                    className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                      size === s ? 'bg-white/20 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Remove Button */}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="w-4 h-4 rounded-full bg-white/10 hover:bg-rose-500/30 hover:text-rose-300 flex items-center justify-center text-slate-400 text-[10px] transition-colors cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Widget Content Body */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden pb-0.5">
        {children}
      </div>
    </div>
  );
});

