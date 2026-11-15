import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, SlidersHorizontal, RotateCcw, Sparkles, Settings, Sidebar, Magnet, LayoutGrid } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { WIDGET_CATALOG, WIDGET_ICONS, DEFAULT_WIDGET_LAYOUT } from '../../lib/widgetRegistry';
import { clampPosition, snapCoordinate, computeAutoLayout, WIDGET_DIMENSIONS } from '../../lib/layoutUtils';
import { setGlobalDragging } from '../../hooks/useClickThrough';
import { WidgetShell } from '../widgets/WidgetShell';
import { WidgetGallery } from '../widgets/WidgetGallery';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';
import type { WidgetInstance, WidgetType, WidgetSize } from '../../types/widgets';

export const DesktopCanvas: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { setMode } = useTelemetry();

  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    try {
      return localStorage.getItem('desktop_overlay_snap_grid') === 'true';
    } catch {
      return true;
    }
  });

  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_widget_layout');
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetInstance[];
        // Ensure all widgets have valid initial positions
        const auto = computeAutoLayout(parsed);
        return parsed.map((w) => {
          const matching = auto.find((a) => a.id === w.id);
          return {
            ...w,
            position: w.position || (matching ? { x: matching.x, y: matching.y } : { x: 50, y: 100 }),
          };
        });
      }
      const initialWithPos = computeAutoLayout(DEFAULT_WIDGET_LAYOUT);
      return DEFAULT_WIDGET_LAYOUT.map((w) => {
        const matching = initialWithPos.find((a) => a.id === w.id);
        return {
          ...w,
          position: matching ? { x: matching.x, y: matching.y } : { x: 50, y: 100 },
        };
      });
    } catch {
      return DEFAULT_WIDGET_LAYOUT;
    }
  });

  const [editMode, setEditMode] = useState<boolean>(false);
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_widget_layout', JSON.stringify(widgets));
    } catch (err) {
      console.error('Failed to save layout', err);
    }
  }, [widgets]);

  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_snap_grid', String(snapToGrid));
    } catch {}
  }, [snapToGrid]);

  // Window resize handler: automatically re-clamp any widgets that might end up outside the viewport
  useEffect(() => {
    const handleResize = () => {
      setWidgets((prev) =>
        prev.map((w) => {
          if (!w.position) return w;
          const dim = WIDGET_DIMENSIONS[w.size];
          const clamped = clampPosition(w.position.x, w.position.y, dim.width, dim.height);
          return { ...w, position: clamped };
        })
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position: { x, y } } : w))
    );
  }, []);

  const handleResizeWidget = (id: string, newSize: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const newDim = WIDGET_DIMENSIONS[newSize];
        const currentPos = w.position || { x: 50, y: 100 };
        const clamped = clampPosition(currentPos.x, currentPos.y, newDim.width, newDim.height);
        return { ...w, size: newSize, position: clamped };
      })
    );
  };

  const handleRemove = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAddWidget = (type: WidgetType, size: WidgetSize) => {
    const dim = WIDGET_DIMENSIONS[size];
    // Find an open spot on the desktop
    const nextX = 40 + (widgets.length % 4) * 40;
    const nextY = 80 + (widgets.length % 3) * 40;
    const clamped = clampPosition(nextX, nextY, dim.width, dim.height);

    const newWidget: WidgetInstance = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      size,
      position: clamped,
    };
    setWidgets((prev) => [...prev, newWidget]);
  };

  const handleAutoAlign = () => {
    const autoPositions = computeAutoLayout(widgets);
    setWidgets((prev) =>
      prev.map((w) => {
        const match = autoPositions.find((a) => a.id === w.id);
        return match ? { ...w, position: { x: match.x, y: match.y } } : w;
      })
    );
  };

  const handleResetLayout = () => {
    const initialWithPos = computeAutoLayout(DEFAULT_WIDGET_LAYOUT);
    setWidgets(
      DEFAULT_WIDGET_LAYOUT.map((w) => {
        const matching = initialWithPos.find((a) => a.id === w.id);
        return {
          ...w,
          position: matching ? { x: matching.x, y: matching.y } : { x: 50, y: 100 },
        };
      })
    );
  };

  return (
    <div className="min-h-screen relative w-full h-full overflow-hidden select-none selection:bg-white/20 pointer-events-none">
      {/* Top Floating Glass Toolbar */}
      <div data-interactive="true" className="fixed top-4 left-6 right-6 z-40 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full macos-glass macos-squircle border border-white/10 shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-semibold tracking-tight text-white">
            Desktop Widgets
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {widgets.length} active
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full macos-glass hover:bg-white/20 text-white text-xs font-semibold border border-white/10 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Widget</span>
          </button>

          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            title={snapToGrid ? 'Snap to Grid: ON (20px)' : 'Snap to Grid: OFF (Free Float)'}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              snapToGrid
                ? 'bg-white text-slate-950 border-white shadow-sm'
                : 'macos-glass text-slate-400 hover:text-white border-white/10'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleAutoAlign}
            title="Auto-Tile / Align All Widgets"
            className="p-1.5 rounded-full macos-glass hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              editMode
                ? 'bg-white text-slate-950 border-white font-bold shadow-md'
                : 'macos-glass hover:bg-white/15 text-slate-300 border-white/10'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{editMode ? 'Done' : 'Edit'}</span>
          </button>

          {editMode && (
            <button
              onClick={handleResetLayout}
              title="Reset to Factory Widgets"
              className="p-1.5 rounded-full macos-glass hover:bg-white/20 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setMode('sidebar')}
            title="Switch to Floating Dock Mode"
            className="p-1.5 rounded-full macos-glass hover:bg-white/20 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Sidebar className="w-3.5 h-3.5" />
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings & Host Telemetry"
              className="p-1.5 rounded-full macos-glass hover:bg-white/20 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Claude Approvals Floating Toast if active */}
      <div data-interactive="true" className="fixed top-16 left-1/2 -translate-x-1/2 z-30 max-w-xl w-full px-4 pointer-events-auto">
        <ClaudeApprovals />
      </div>

      {/* Freeform Draggable Canvas: Background passes clicks straight through */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence>
          {widgets.map((widget) => {
            const def = WIDGET_CATALOG[widget.type];
            if (!def) return null;
            const Icon = WIDGET_ICONS[widget.type];
            const Component = def.component;
            const posX = widget.position?.x ?? 50;
            const posY = widget.position?.y ?? 100;
            const dim = WIDGET_DIMENSIONS[widget.size];

            return (
              <motion.div
                key={widget.id}
                drag
                dragMomentum={false}
                dragElastic={0.06}
                animate={{ x: posX, y: posY }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onDragStart={() => setGlobalDragging(true)}
                onDragEnd={(_, info) => {
                  setGlobalDragging(false);
                  let newX = posX + info.offset.x;
                  let newY = posY + info.offset.y;
                  if (snapToGrid) {
                    newX = snapCoordinate(newX, 20);
                    newY = snapCoordinate(newY, 20);
                  }
                  const clamped = clampPosition(newX, newY, dim.width, dim.height);
                  handleUpdatePosition(widget.id, clamped.x, clamped.y);
                }}
                style={{ position: 'absolute', top: 0, left: 0 }}
                data-interactive="true"
                className="touch-none pointer-events-auto"
              >
                <WidgetShell
                  id={widget.id}
                  title={def.title}
                  icon={<Icon className="w-3.5 h-3.5" />}
                  size={widget.size}
                  supportedSizes={def.supportedSizes}
                  onResize={(newSize) => handleResizeWidget(widget.id, newSize)}
                  onRemove={() => handleRemove(widget.id)}
                  editMode={editMode}
                >
                  <Component size={widget.size} />
                </WidgetShell>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-20 pointer-events-none">
          <div data-interactive="true" className="macos-glass macos-squircle p-8 max-w-sm flex flex-col items-center border border-white/10 shadow-2xl pointer-events-auto">
            <Sparkles className="w-10 h-10 text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-white">No Desktop Widgets</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Click Add Widget to choose live hardware monitors, clocks, and media tiles for your desktop.
            </p>
            <button
              onClick={() => setGalleryOpen(true)}
              className="px-5 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs cursor-pointer hover:bg-slate-200 transition-colors shadow-md"
            >
              Open Widget Gallery
            </button>
          </div>
        </div>
      )}

      {/* Widget Gallery Drawer/Modal */}
      <div data-interactive="true" className="pointer-events-auto">
        <WidgetGallery
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onAddWidget={handleAddWidget}
        />
      </div>
    </div>
  );
};
