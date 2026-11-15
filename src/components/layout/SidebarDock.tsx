import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, SlidersHorizontal, RotateCcw, GripHorizontal, LayoutGrid, Columns2 } from 'lucide-react';
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

  const [pairSmallWidgets, setPairSmallWidgets] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_dock_pair_small');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [editMode, setEditMode] = useState<boolean>(false);
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);

  // Persist dock layout & pair setting
  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_dock_layout', JSON.stringify(widgets));
    } catch (err) {
      console.error('Failed to save dock layout', err);
    }
  }, [widgets]);

  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_dock_pair_small', String(pairSmallWidgets));
    } catch {}
  }, [pairSmallWidgets]);

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

  // Group consecutive 'S' widgets when pairing is enabled
  const renderGroups = useMemo(() => {
    if (!pairSmallWidgets || editMode) {
      return widgets.map((w) => ({ id: w.id, type: 'single' as const, items: [w] }));
    }

    const groups: Array<{ id: string; type: 'pair' | 'single'; items: WidgetInstance[] }> = [];
    let i = 0;
    while (i < widgets.length) {
      const current = widgets[i];
      const next = widgets[i + 1];

      if (current.size === 'S' && next && next.size === 'S') {
        groups.push({ id: `${current.id}_${next.id}`, type: 'pair', items: [current, next] });
        i += 2;
      } else {
        groups.push({ id: current.id, type: 'single', items: [current] });
        i += 1;
      }
    }
    return groups;
  }, [widgets, pairSmallWidgets, editMode]);

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
        className="w-full max-w-[390px] macos-glass macos-squircle p-4 shadow-2xl border border-white/10 flex flex-col gap-3 pointer-events-auto max-h-[94vh] overflow-y-auto"
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

            {/* Toggle 2-column pairing for small widgets */}
            <button
              onClick={() => setPairSmallWidgets(!pairSmallWidgets)}
              title={pairSmallWidgets ? 'Small Widgets: 2-Column Paired (Click to Unpair)' : 'Small Widgets: Single Column (Click to Pair 2x)'}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                pairSmallWidgets ? 'bg-white/20 text-white shadow-sm' : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setEditMode(!editMode)}
              title="Toggle Edit Mode (Resize / Remove / Reorder)"
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

        {/* Reorderable Modular Stack */}
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {renderGroups.map((group) => {
              if (group.type === 'pair') {
                const [w1, w2] = group.items;
                const def1 = WIDGET_CATALOG[w1.type];
                const def2 = WIDGET_CATALOG[w2.type];
                if (!def1 || !def2) return null;

                const Icon1 = WIDGET_ICONS[w1.type];
                const Icon2 = WIDGET_ICONS[w2.type];
                const Comp1 = def1.component;
                const Comp2 = def2.component;

                return (
                  <motion.div
                    key={group.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="grid grid-cols-2 gap-2.5 w-full max-w-[344px] mx-auto select-none"
                  >
                    <WidgetShell
                      id={w1.id}
                      title={def1.title}
                      icon={<Icon1 className="w-3.5 h-3.5" />}
                      size="S"
                      supportedSizes={def1.supportedSizes}
                      onResize={(newSize) => handleResize(w1.id, newSize)}
                      onRemove={() => handleRemove(w1.id)}
                      editMode={editMode}
                    >
                      <Comp1 size="S" />
                    </WidgetShell>

                    <WidgetShell
                      id={w2.id}
                      title={def2.title}
                      icon={<Icon2 className="w-3.5 h-3.5" />}
                      size="S"
                      supportedSizes={def2.supportedSizes}
                      onResize={(newSize) => handleResize(w2.id, newSize)}
                      onRemove={() => handleRemove(w2.id)}
                      editMode={editMode}
                    >
                      <Comp2 size="S" />
                    </WidgetShell>
                  </motion.div>
                );
              }

              const widget = group.items[0];
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
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex justify-center cursor-default select-none"
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
