import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Volume2 } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatDuration } from '../../lib/utils';
import type { WidgetProps } from '../../types/widgets';

export const MediaWidget: React.FC<WidgetProps> = ({ size }) => {
  const { snapshot, controlMedia, setVolume } = useTelemetry();
  const { media } = snapshot;

  const progressPct = media.durationSec > 0 ? (media.positionSec / media.durationSec) * 100 : 0;

  if (size === 'S') {
    return (
      <div className="flex-1 flex flex-col items-center justify-between py-1">
        <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center relative shadow-sm my-auto">
          {media.albumArtUrl ? (
            <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-7 h-7 text-slate-400" />
          )}
        </div>

        <div className="w-full flex items-center justify-between px-1">
          <div className="truncate text-left max-w-[90px]">
            <p className="text-[11px] font-semibold text-slate-100 truncate">{media.title}</p>
            <p className="text-[9px] text-slate-400 truncate">{media.artist}</p>
          </div>
          <button
            onClick={() => controlMedia('playpause')}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            {media.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        </div>
      </div>
    );
  }

  if (size === 'M') {
    return (
      <div className="flex-1 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
            {media.albumArtUrl ? (
              <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{media.title}</h4>
            <p className="text-xs text-slate-400 truncate">{media.artist}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 my-1">
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div className="bg-white/80 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>{formatDuration(media.positionSec)}</span>
            <span>{formatDuration(media.durationSec)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button onClick={() => controlMedia('prev')} className="text-slate-400 hover:text-white cursor-pointer">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => controlMedia('playpause')}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
            >
              {media.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={() => controlMedia('next')} className="text-slate-400 hover:text-white cursor-pointer">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Volume2 className="w-3.5 h-3.5" />
            <span className="font-mono">{media.volumePct}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Large (L)
  return (
    <div className="flex-1 flex flex-col justify-between gap-3">
      <div className="flex flex-col items-center text-center my-auto">
        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-lg mb-3">
          {media.albumArtUrl ? (
            <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-10 h-10 text-slate-400" />
          )}
        </div>

        <h3 className="text-base font-bold text-white max-w-[280px] truncate">{media.title}</h3>
        <p className="text-xs text-slate-400 truncate max-w-[240px]">{media.artist} • {media.album || 'Soundtrack'}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div className="bg-white/80 h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>{formatDuration(media.positionSec)}</span>
          <span>{formatDuration(media.durationSec)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => controlMedia('prev')} className="text-slate-400 hover:text-white cursor-pointer">
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={() => controlMedia('playpause')}
          className="w-11 h-11 rounded-full bg-white text-slate-950 flex items-center justify-center cursor-pointer shadow-md transition-transform active:scale-95"
        >
          {media.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        <button onClick={() => controlMedia('next')} className="text-slate-400 hover:text-white cursor-pointer">
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-2 pt-1 border-t border-white/5">
        <Volume2 className="w-4 h-4 text-slate-400" />
        <input
          type="range"
          min="0"
          max="100"
          value={media.volumePct}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
        />
        <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{media.volumePct}%</span>
      </div>
    </div>
  );
};
