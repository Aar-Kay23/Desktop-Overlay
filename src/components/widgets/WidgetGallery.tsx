import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { WIDGET_CATALOG, WIDGET_ICONS } from '../../lib/widgetRegistry';
import type { WidgetType, WidgetSize } from '../../types/widgets';

interface WidgetGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType, size: WidgetSize) => void;
}

export const WidgetGallery: React.FC<WidgetGalleryProps> = ({
  isOpen,
  onClose,
  onAddWidget,
}) => {
  const [selectedType, setSelectedType] = useState<WidgetType>('cpu');
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('M');
  const [added, setAdded] = useState(false);

  if (!isOpen) return null;

  const currentDef = WIDGET_CATALOG[selectedType];

  const handleAdd = () => {
    onAddWidget(selectedType, selectedSize);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 500);
  };

  const categories = ['System', 'AI & Dev', 'Media & Info'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl macos-glass macos-squircle p-6 shadow-2xl flex flex-col gap-4 border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-semibold text-white">Widget Gallery</h3>
            <p className="text-xs text-slate-400">Choose widgets to place on your Windows desktop</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Catalog Grid & Preview */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-1">
          {/* List of Widgets (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const widgets = Object.values(WIDGET_CATALOG).filter((w) => w.category === cat);
              if (widgets.length === 0) return null;

              return (
                <div key={cat} className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {cat}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {widgets.map((w) => {
                      const Icon = WIDGET_ICONS[w.type];
                      const isSelected = selectedType === w.type;

                      return (
                        <button
                          key={w.type}
                          onClick={() => {
                            setSelectedType(w.type);
                            setSelectedSize(w.defaultSize);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/15 border-white/30 text-white shadow-sm'
                              : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.06] hover:border-white/10'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-200 shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate">{w.title}</span>
                            <span className="text-[10px] text-slate-400 line-clamp-1">{w.category}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Widget Preview & Size Config (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between p-3.5 rounded-2xl bg-black/40 border border-white/10">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                Widget Details
              </span>
              <h4 className="text-sm font-bold text-white mb-1">{currentDef.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                {currentDef.description}
              </p>

              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Select Size
              </span>
              <div className="flex gap-2">
                {currentDef.supportedSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      selectedSize === s
                        ? 'bg-white text-slate-950 border-white shadow-sm'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {s === 'S' ? 'Small' : s === 'M' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="w-full py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all cursor-pointer shadow-md mt-4 active:scale-95"
            >
              {added ? <Check className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4" />}
              {added ? 'Added to Desktop' : 'Add Widget'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

