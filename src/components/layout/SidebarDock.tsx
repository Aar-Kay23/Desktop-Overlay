import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, SlidersHorizontal, RotateCcw, GripHorizontal, LayoutGrid } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { WIDGET_CATALOG, WIDGET_ICONS } from '../../lib/widgetRegistry';
import { setGlobalDragging } from '../../hooks/useClickThrough';
import { WidgetShell } from '../widgets/WidgetShell';
import { WidgetGallery } from '../widgets/WidgetGallery';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';
import type { WidgetInstance, WidgetType, WidgetSize } from '../../types/widgets';

const DEFAULT_DOCK_LAYOUT: WidgetInstance[] = [
  { id: 'dock-1', type: 'clock', size: 'S' },
  { id: 'dock-2', type: 'battery', size: 'S' },
  { id: 'dock-3', type: 'cpu', size: 'M' },
  { id: 'dock-4', type: 'memory', size: 'M' },
  { id: 'dock-5', type: 'ai-quota', size: 'M' },
  { id: 'dock-6', type: 'media', size: 'M' },
  { id: 'dock-7', type: 'network', size: 'M' },
];

export const SidebarDock: React.FC = () => {
  const { setMode } = useTelemetry();

  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_dock_layout');
      return saved ? JSON.parse(saved) : DEFAULT_DOCK_LAYOUT;
    } catch {
      return DEFAULT_DOCK_LAYOUT;
    }
  });

  const [editMode, setEditMode] = useState<boolean>(false);
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);

  // Persist dock layout
  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_dock_layout', JSON.stringify(widgets));
    } catch (err) {
      console.error('Failed to save dock layout', err);
    }
  }, [widgets]);

  const handleResize = (id: string, newSize: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size: newSize } : w))
    );
  };

  const handleRemove = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAddWidget = (type: WidgetType, size: WidgetSize) => {
    const newWidget: WidgetInstance = {
      id: `dock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      size,
    };
    setWidgets((prev) => [...prev, newWidget]);
  };

  const handleResetLayout = () => {
    setWidgets(DEFAULT_DOCK_LAYOUT);
  };

  return (
    <div className="min-h-screen p-4 flex justify-end items-start pointer-events-none select-none">
      {/* Floating Draggable macOS Dock Container */}
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.05}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onDragStart={() => setGlobalDragging(true)}
        onDragEnd={() => setGlobalDragging(false)}
        data-interactive="true"
        className="w-full max-w-[380px] macos-glass macos-squircle p-4 shadow-2xl border border-white/10 flex flex-col gap-3 pointer-events-auto max-h-[94vh] overflow-y-auto"
      >
        {/* Dock Header & Drag Handle */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-white/40" />
            <span className="text-xs font-bold text-white tracking-tight">
              macOS Dock
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({widgets.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setGalleryOpen(true)}
              title="Add widget to dock"
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setEditMode(!editMode)}
              title="Toggle Edit Mode (Resize / Remove)"
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                editMode ? 'bg-white text-slate-950 font-bold' : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {editMode && (
              <button
                onClick={handleResetLayout}
                title="Reset Dock layout"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setMode('canvas')}
              title="Switch back to Desktop Widgets canvas"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Priority Approvals */}
        <ClaudeApprovals />

        {/* Modular Stack */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {widgets.map((widget) => {
              const def = WIDGET_CATALOG[widget.type];
              if (!def) return null;
              const Icon = WIDGET_ICONS[widget.type];
              const Component = def.component;

              return (
                <motion.div
                  key={widget.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="flex justify-center"
                >
                  <WidgetShell
                    id={widget.id}
                    title={def.title}
                    icon={<Icon className="w-3.5 h-3.5" />}
                    size={widget.size}
                    supportedSizes={def.supportedSizes}
                    onResize={(newSize) => handleResize(widget.id, newSize)}
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

        {/* Empty Dock State */}
        {widgets.length === 0 && (
          <div className="py-8 text-center flex flex-col items-center">
            <span className="text-xs text-slate-400 mb-3">No widgets pinned to dock</span>
            <button
              onClick={() => setGalleryOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-950 font-bold text-xs cursor-pointer hover:bg-slate-200"
            >
              Add Widget
            </button>
          </div>
        )}
      </motion.div>

      {/* Widget Gallery Modal */}
      <WidgetGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
};
