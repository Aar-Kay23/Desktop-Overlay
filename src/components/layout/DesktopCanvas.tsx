import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, SlidersHorizontal, RotateCcw, Sparkles, Settings, Sidebar } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { WIDGET_CATALOG, WIDGET_ICONS, DEFAULT_WIDGET_LAYOUT } from '../../lib/widgetRegistry';
import { WidgetShell } from '../widgets/WidgetShell';
import { WidgetGallery } from '../widgets/WidgetGallery';
import { ClaudeApprovals } from '../modules/ClaudeApprovals';
import type { WidgetInstance, WidgetType, WidgetSize } from '../../types/widgets';

export const DesktopCanvas: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const { setMode } = useTelemetry();
  const [widgets, setWidgets] = useState<WidgetInstance[]>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_widget_layout');
      return saved ? JSON.parse(saved) : DEFAULT_WIDGET_LAYOUT;
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
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      size,
    };
    setWidgets((prev) => [...prev, newWidget]);
  };

  const handleResetLayout = () => {
    setWidgets(DEFAULT_WIDGET_LAYOUT);
  };

  return (
    <div className="min-h-screen p-5 flex flex-col justify-between selection:bg-white/20">
      {/* Top Desktop Bar */}
      <div className="flex items-center justify-between gap-4 mb-4 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="text-xs font-semibold tracking-tight text-slate-200">
            Desktop Widgets
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {widgets.length} active
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGalleryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md border border-white/10 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Widget</span>
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all cursor-pointer ${
              editMode
                ? 'bg-white text-slate-950 border-white font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{editMode ? 'Done' : 'Edit'}</span>
          </button>

          {editMode && (
            <button
              onClick={handleResetLayout}
              title="Reset to default widgets"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={() => setMode('sidebar')}
            title="Switch to Sidebar Dock mode"
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Sidebar className="w-3.5 h-3.5" />
          </button>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings & Connections"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Claude Approvals Banner if active */}
      <div className="max-w-xl mx-auto w-full mb-3">
        <ClaudeApprovals />
      </div>

      {/* Dynamic Responsive Widget Canvas */}
      <div className="flex-1 flex items-start justify-center">
        <div className="flex flex-wrap gap-4 max-w-[1200px] justify-start items-start">
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
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
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
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto p-8">
          <Sparkles className="w-10 h-10 text-slate-500 mb-2" />
          <h3 className="text-base font-semibold text-white">No Widgets on Desktop</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Click Add Widget to choose metrics, clocks, and media cards for your desktop.
          </p>
          <button
            onClick={() => setGalleryOpen(true)}
            className="px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs cursor-pointer hover:bg-slate-200 transition-colors"
          >
            Open Widget Gallery
          </button>
        </div>
      )}

      {/* Widget Gallery Drawer/Modal */}
      <WidgetGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
};
