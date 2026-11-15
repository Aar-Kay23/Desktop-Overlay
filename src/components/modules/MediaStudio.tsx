import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music } from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatDuration } from '../../lib/utils';

export const MediaStudio: React.FC = () => {
  const { snapshot, controlMedia, setVolume } = useTelemetry();
  const { media } = snapshot;

  const progressPct = media.durationSec > 0 ? (media.positionSec / media.durationSec) * 100 : 0;

  return (
    <div className="glass-card rounded-xl p-3.5 flex flex-col gap-3 relative overflow-hidden group border border-white/5">
      {/* Background ambient album art glow */}
      {media.albumArtUrl && (
        <div
          className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20 blur-3xl pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${media.albumArtUrl})`, backgroundSize: 'cover' }}
        />
      )}

      {/* Track Info Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center relative shadow-md">
          {media.albumArtUrl ? (
            <img src={media.albumArtUrl} alt="Album Art" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-6 h-6 text-slate-400" />
          )}
          {media.isPlaying && (
            <div className="absolute bottom-1 right-1 flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-emerald-400 h-full animate-pulse" />
              <span className="w-0.5 bg-emerald-400 h-2/3 animate-pulse delay-75" />
              <span className="w-0.5 bg-emerald-400 h-4/5 animate-pulse delay-150" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
              Now Playing
            </span>
          </div>
          <h4 className="text-sm font-semibold text-slate-100 truncate">
            {media.title}
          </h4>
          <p className="text-xs text-slate-400 truncate">
            {media.artist || 'Unknown Artist'} {media.album ? `• ${media.album}` : ''}
          </p>
        </div>
      </div>

      {/* Progress Bar & Timers */}
      <div className="flex flex-col gap-1 relative z-10">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-cyan-400 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>{formatDuration(media.positionSec)}</span>
          <span>{formatDuration(media.durationSec)}</span>
        </div>
      </div>

      {/* Media & Volume Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 relative z-10">
        {/* Playback buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => controlMedia('prev')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => controlMedia('playpause')}
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-[0_0_15px_-2px_#06b6d4] active:scale-95 transition-all cursor-pointer"
          >
            {media.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            onClick={() => controlMedia('next')}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVolume(media.isMuted ? 50 : 0)}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {media.isMuted || media.volumePct === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={media.isMuted ? 0 : media.volumePct}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-20 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
            {media.isMuted ? '0%' : `${media.volumePct}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

