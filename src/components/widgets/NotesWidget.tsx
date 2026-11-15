import React, { useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';
import type { WidgetProps } from '../../types/widgets';

export const NotesWidget: React.FC<WidgetProps> = () => {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem('desktop_overlay_scratchpad_notes') || '';
    } catch {
      return '';
    }
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('desktop_overlay_scratchpad_notes', content);
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 1200);
      return () => clearTimeout(timer);
    } catch {}
  }, [content]);

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="flex-1 flex flex-col relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type quick thoughts, to-dos, or snippets..."
          className="w-full flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs resize-none outline-none font-sans leading-relaxed select-text"
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5">
          {saved ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-2.5 h-2.5" /> Saved
            </span>
          ) : (
            <span>{content.length} chars</span>
          )}
        </div>

        {content.length > 0 && (
          <button
            onClick={() => setContent('')}
            title="Clear note"
            className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer p-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
