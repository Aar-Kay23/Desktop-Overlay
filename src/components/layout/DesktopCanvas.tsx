import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pencil,
  RotateCcw,
  Sparkles,
  Settings,
  Sidebar,
  Magnet,
  LayoutGrid,
  X,
  Maximize2,
  Columns,
  ZoomIn,
} from 'lucide-react';
import { useTelemetry, type ScalePreset } from '../../context/TelemetryContext';
import { WIDGET_CATALOG, WIDGET_ICONS, DEFAULT_WIDGET_LAYOUT } from '../../lib/widgetRegistry';
import {
  clampPosition,
  snapCoordinate,
  computeAutoLayout,
  computeRightShelfLayout,
  computePerimeterGridLayout,
  getScaledDimensions,
  BASE_WIDGET_DIMENSIONS,
} from '../../lib/layoutUtils';
import { setGlobalDragging } from '../../hooks/useClickThrough';
import { WidgetShell } from '../widgets/WidgetShell';
import { WidgetGallery } from '../widgets/WidgetGallery';
import type { WidgetInstance, WidgetType, WidgetSize } from '../../types/widgets';

export const DesktopCanvas: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { setMode, glassSettings, setGlassSettings, widgetScale, scalePreset, setScalePreset } = useTelemetry();

  const [snapToGrid, setSnapToGrid] = useState<boolean>(() => {
    try {
      return localStorage.getItem('desktop_overlay_snap_grid') === 'true';
    } catch {
      return true;
    }
  });

  const [showGlassModal, setShowGlassModal] = useState<boolean>(false);
  const [showScaleModal, setShowScaleModal] = useState<boolean>(false);
  const [alignVersion, setAlignVersion] = useState<number>(0);

  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_widget_layout');
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetInstance[];
        const auto = computeAutoLayout(parsed, typeof window !== 'undefined' ? window.innerWidth : 1920, false, widgetScale, 'shelf');
        return parsed.map((w) => {
          const matching = auto.find((a) => a.id === w.id);
          return {
            ...w,
            position: w.position || (matching ? { x: matching.x, y: matching.y } : { x: 50, y: 100 }),
          };
        });
      }
      const initialWithPos = computeAutoLayout(DEFAULT_WIDGET_LAYOUT, typeof window !== 'undefined' ? window.innerWidth : 1920, true, widgetScale, 'shelf');
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

  // When any modal or gallery is open, ensure mouse events are active so clicks aren't lost to desktop
  useEffect(() => {
    const isAnyModalOpen = galleryOpen || showGlassModal || showScaleModal;
    if (window.electronAPI?.setInteractive) {
      if (isAnyModalOpen) {
        window.electronAPI.setInteractive(true);
      }
    }
  }, [galleryOpen, showGlassModal, showScaleModal]);

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

  // Window resize handler: automatically re-clamp any widgets outside the viewport
  useEffect(() => {
    const handleResize = () => {
      setWidgets((prev) =>
        prev.map((w) => {
          if (!w.position) return w;
          const dim = getScaledDimensions(w.size, widgetScale);
          const clamped = clampPosition(w.position.x, w.position.y, dim.width, dim.height);
          return { ...w, position: clamped };
        })
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [widgetScale]);

  const handleUpdatePosition = useCallback((id: string, x: number, y: number) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, position: { x, y } } : w))
    );
  }, []);

  const handleResizeWidget = (id: string, newSize: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const newDim = getScaledDimensions(newSize, widgetScale);
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
    const dim = getScaledDimensions(size, widgetScale);
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    // Place new widget near right shelf
    const nextX = vpW - dim.width - 24;
    const nextY = 60 + (widgets.length % 4) * 30;
    const clamped = clampPosition(nextX, nextY, dim.width, dim.height);

    const newWidget: WidgetInstance = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      size,
      position: clamped,
    };
    setWidgets((prev) => [...prev, newWidget]);
  };

  // macOS Sonoma Right-Shelf Alignment (Clean right side, leaves desktop icons and wallpaper 100% free)
  const handleRightShelfAlign = () => {
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vpH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const shelfPositions = computeRightShelfLayout(widgets, vpW, vpH, widgetScale);
    setWidgets((prev) =>
      prev.map((w) => {
        const match = shelfPositions.find((a) => a.id === w.id);
        return match ? { ...w, position: { x: match.x, y: match.y } } : w;
      })
    );
    setAlignVersion((v) => v + 1);
  };

  // Perimeter Grid Alignment (Avoids left desktop icons and skips Dynamic Island)
  const handlePerimeterGridAlign = () => {
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const gridPositions = computePerimeterGridLayout(widgets, vpW, widgetScale);
    setWidgets((prev) =>
      prev.map((w) => {
        const match = gridPositions.find((a) => a.id === w.id);
        return match ? { ...w, position: { x: match.x, y: match.y } } : w;
      })
    );
    setAlignVersion((v) => v + 1);
  };

  const handleResetLayout = () => {
    const vpW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vpH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const initialWithPos = computeRightShelfLayout(DEFAULT_WIDGET_LAYOUT, vpW, vpH, widgetScale);
    setWidgets(
      DEFAULT_WIDGET_LAYOUT.map((w) => {
        const matching = initialWithPos.find((a) => a.id === w.id);
        return {
          ...w,
          position: matching ? { x: matching.x, y: matching.y } : { x: 50, y: 100 },
        };
      })
    );
    setAlignVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen relative w-full h-full overflow-hidden select-none selection:bg-white/20 pointer-events-none">
      {/* Click-outside backdrop for Popovers */}
      {(showGlassModal || showScaleModal) && (
        <div
          data-interactive="true"
          onClick={() => {
            setShowGlassModal(false);
            setShowScaleModal(false);
          }}
          className="fixed inset-0 z-30 bg-transparent pointer-events-auto"
        />
      )}

      {/* Sleek Floating Capsule Toolbar (Top-Right Corner - leaves wallpaper & icons completely clean) */}
      <div
        data-interactive="true"
        className="fixed top-3 right-5 z-40 flex items-center gap-1.5 p-1 rounded-full macos-glass border border-white/10 shadow-xl pointer-events-auto backdrop-blur-md"
      >
        {/* Status Indicator */}
        <div className="flex items-center gap-2 pl-2.5 pr-2 py-0.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-semibold tracking-tight text-white/90">
            Widgets
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {widgets.length}
          </span>
        </div>

        <div className="h-3.5 w-px bg-white/10" />

        {/* Add Widget Button */}
        <button
          onClick={() => setGalleryOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/10 shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
          <span>Add</span>
        </button>

        {/* Right-Shelf Layout (Sonoma Style) */}
        <button
          onClick={handleRightShelfAlign}
          title="Sonoma Right-Shelf: Align all widgets along right edge (Keeps desktop icons & wallpaper clean)"
          className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium border border-transparent hover:border-white/10 transition-colors cursor-pointer"
        >
          <Columns className="w-3 h-3" />
          <span className="hidden md:inline">Shelf</span>
        </button>

        {/* Perimeter Grid Layout */}
        <button
          onClick={handlePerimeterGridAlign}
          title="Tidy Grid: Align widgets cleanly avoiding desktop icons & Dynamic Island"
          className="p-1.5 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* Magnet Snap */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={snapToGrid ? 'Snap to Grid: ON (16px)' : 'Snap to Grid: OFF (Free Float)'}
          className={`p-1.5 rounded-full transition-all cursor-pointer ${
            snapToGrid
              ? 'bg-white text-slate-950 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>

        {/* Scale / Zoom Control */}
        <button
          onClick={() => {
            setShowScaleModal((prev) => !prev);
            setShowGlassModal(false);
          }}
          title="Display Scaling (Laptop / Large Display zoom presets)"
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            showScaleModal
              ? 'bg-white text-slate-950 font-bold'
              : 'hover:bg-white/15 text-slate-300 hover:text-white'
          }`}
        >
          <ZoomIn className="w-3 h-3" />
          <span>{Math.round(widgetScale * 100)}%</span>
        </button>

        {/* Glass Customization Button */}
        <button
          onClick={() => {
            setShowGlassModal((prev) => !prev);
            setShowScaleModal(false);
          }}
          title="Customize Glassmorphism (Opacity, Blur, Frosting Sliders)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
            showGlassModal
              ? 'bg-white text-slate-950 font-bold'
              : 'hover:bg-white/15 text-slate-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Glass</span>
        </button>

        {/* Layout Edit Mode Toggle */}
        <button
          onClick={() => setEditMode(!editMode)}
          title={editMode ? 'Done arranging widgets' : 'Arrange / drag widgets layout'}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            editMode
              ? 'bg-cyan-400 text-slate-950 font-bold shadow-md'
              : 'hover:bg-white/15 text-slate-300 hover:text-white'
          }`}
        >
          <Pencil className="w-3 h-3" />
          <span>{editMode ? 'Done' : 'Arrange'}</span>
        </button>

        {editMode && (
          <button
            onClick={handleResetLayout}
            title="Reset to Factory Widgets"
            className="p-1.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-3.5 w-px bg-white/10" />

        {/* Dock / Island Switchers */}
        <button
          onClick={() => setMode('sidebar')}
          title="Switch to Mobile Dock Mode"
          className="p-1.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Sidebar className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setMode('hud')}
          title="Switch to Pinned Dynamic Island"
          className="p-1.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-1.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Scale Popover (Anchored cleanly to Toolbar Right Edge) */}
        <AnimatePresence>
          {showScaleModal && (
            <motion.div
              data-interactive="true"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute right-0 top-11 z-50 w-44 macos-glass macos-squircle p-2 border border-white/15 shadow-2xl flex flex-col gap-1 text-white pointer-events-auto"
            >
              <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Display Scale
              </div>
              {(['auto', '75%', '85%', '100%', '115%'] as ScalePreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setScalePreset(preset);
                    setShowScaleModal(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                    scalePreset === preset
                      ? 'bg-white/20 text-white font-bold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="capitalize">{preset === 'auto' ? 'Auto (Recommended)' : preset}</span>
                  {scalePreset === preset && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glass Customization Popover (Anchored cleanly to Toolbar Right Edge - never extends under Island) */}
        <AnimatePresence>
          {showGlassModal && (
            <motion.div
              data-interactive="true"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute right-0 top-11 z-50 w-72 macos-glass macos-squircle p-4 border border-white/15 shadow-2xl flex flex-col gap-3.5 text-white pointer-events-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white tracking-wide">Glassmorphism Settings</span>
                <button onClick={() => setShowGlassModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Opacity Slider */}
              <div data-interactive="true" className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Background Opacity</span>
                  <span className="font-mono text-cyan-400">{Math.round(glassSettings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.20"
                  max="0.95"
                  step="0.05"
                  value={glassSettings.opacity}
                  onChange={(e) => setGlassSettings({ opacity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Blur Slider */}
              <div data-interactive="true" className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Backdrop Blur</span>
                  <span className="font-mono text-cyan-400">{glassSettings.blur}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="45"
                  step="1"
                  value={glassSettings.blur}
                  onChange={(e) => setGlassSettings({ blur: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Border Opacity Slider */}
              <div data-interactive="true" className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span>Border Frosting</span>
                  <span className="font-mono text-cyan-400">{Math.round(glassSettings.borderOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.30"
                  step="0.02"
                  value={glassSettings.borderOpacity}
                  onChange={(e) => setGlassSettings({ borderOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <button
                onClick={() => setGlassSettings({ opacity: 0.65, blur: 28, borderOpacity: 0.09 })}
                className="mt-1 w-full py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer text-center"
              >
                Reset Glass to Default
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Widget Canvas Layer */}
      <div className="w-full h-full relative p-0 m-0 pointer-events-none">
        <AnimatePresence>
          {widgets.map((widget) => {
            const def = WIDGET_CATALOG[widget.type];
            if (!def) return null;

            const Component = def.component;
            const Icon = WIDGET_ICONS[widget.type];

            const baseDim = BASE_WIDGET_DIMENSIONS[widget.size] || BASE_WIDGET_DIMENSIONS.M;
            const scaledDim = getScaledDimensions(widget.size, widgetScale);

            const posX = widget.position?.x ?? 80;
            const posY = widget.position?.y ?? 100;

            return (
              <motion.div
                key={`${widget.id}-${alignVersion}`}
                drag
                dragMomentum={false}
                dragElastic={0.06}
                animate={{ x: posX, y: posY }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                onDragStart={() => setGlobalDragging(true)}
                onDragEnd={(_, info) => {
                  setGlobalDragging(false);
                  let newX = posX + info.offset.x;
                  let newY = posY + info.offset.y;
                  if (snapToGrid) {
                    newX = snapCoordinate(newX, 16);
                    newY = snapCoordinate(newY, 16);
                  }
                  const clamped = clampPosition(newX, newY, scaledDim.width, scaledDim.height);
                  handleUpdatePosition(widget.id, clamped.x, clamped.y);
                }}
                data-interactive="true"
                className="absolute top-0 left-0 pointer-events-auto select-none"
                style={{ width: scaledDim.width, height: scaledDim.height }}
              >
                {/* Hardware-accelerated GPU scaled container: preserves exact vector typography & crisp rendering */}
                <div
                  style={{
                    width: baseDim.width,
                    height: baseDim.height,
                    transform: `scale(${widgetScale})`,
                    transformOrigin: 'top left',
                  }}
                  className="w-full h-full"
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
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {widgets.length === 0 && (
          <div data-interactive="true" className="h-full flex flex-col items-center justify-center pointer-events-auto">
            <Sparkles className="w-10 h-10 text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-white">No Desktop Widgets</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Click Add Widget to choose live hardware monitors, clocks, and media tiles for your desktop.
            </p>
            <button
              onClick={() => setGalleryOpen(true)}
              className="px-4 py-2 rounded-full bg-white text-slate-950 font-semibold text-xs shadow-lg hover:bg-white/90 transition-transform active:scale-95 cursor-pointer"
            >
              Add First Widget
            </button>
          </div>
        )}
      </div>

      {/* Widget Gallery Modal */}
      <WidgetGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
};
