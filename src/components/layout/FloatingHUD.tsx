import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatDuration } from '../../lib/utils';

export const FloatingHUD: React.FC = () => {
  const { snapshot, setMode, controlMedia, setVolume } = useTelemetry();
  const { media } = snapshot;
  const [expanded, setExpanded] = useState(false);

  const progressPct = media.durationSec > 0 ? (media.positionSec / media.durationSec) * 100 : 0;

  return (
    <>
      {/* Click-outside backdrop when expanded to collapse cleanly */}
      {expanded && (
        <div
          data-interactive="true"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-40 bg-black/20 pointer-events-auto"
        />
      )}

      {/* Floating Dynamic Island Pinned Above All Windows */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-none">
        {/* Dynamic Island Collapsed Pill */}
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          data-interactive="true"
          onMouseEnter={() => {}}
          onClick={() => setExpanded(!expanded)}
          className="pointer-events-auto bg-black/85 hover:bg-black/95 backdrop-blur-2xl text-white rounded-full px-3 py-1.5 border border-white/15 shadow-[0_8px_30px_rgb(0,0,0,0.6)] flex items-center gap-2.5 cursor-pointer transition-colors group"
        >
          {/* Album Art / Icon */}
          <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
            {media.albumArtUrl ? (
              <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
            ) : (
              <Music className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </div>

          {/* Track & Artist Title */}
          <div className="flex flex-col min-w-0 max-w-[170px] leading-tight">
            <span className="text-xs font-semibold tracking-tight text-slate-100 truncate">
              {media.title || 'No Media Playing'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {media.artist || media.sourceApp || 'Idle'}
            </span>
          </div>

          {/* Animated Audio Equalizer Waveform */}
          <div className="flex items-end gap-0.5 h-3.5 px-1 shrink-0">
            {[0.4, 0.9, 0.6, 0.7].map((h, i) => (
              <motion.div
                key={i}
                animate={
                  media.isPlaying
                    ? {
                        height: ['4px', '14px', '6px', '12px'],
                        transition: {
                          repeat: Infinity,
                          duration: 0.6 + i * 0.15,
                          ease: 'easeInOut',
                        },
                      }
                    : { height: `${Math.round(h * 12)}px` }
                }
                className={`w-[2.5px] rounded-full ${
                  media.isPlaying ? 'bg-cyan-400' : 'bg-slate-500'
                }`}
              />
            ))}
          </div>

          {/* Mini Play / Pause Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              controlMedia('playpause');
            }}
            title={media.isPlaying ? 'Pause' : 'Play'}
            className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-90"
          >
            {media.isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </motion.div>

        {/* Expanded Dynamic Island Card */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 8, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              data-interactive="true"
              className="w-[390px] pointer-events-auto bg-black/90 backdrop-blur-3xl text-white rounded-3xl p-4 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-3 mt-1.5"
            >
              {/* Header & App Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Dynamic Island
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                    {media.sourceApp || 'Now Playing'}
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Album Art & Track Meta */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-white/10 shadow-md flex items-center justify-center">
                  {media.albumArtUrl ? (
                    <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate leading-snug">
                    {media.title || 'No Media Playing'}
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {media.artist || 'Waiting for playback...'}
                  </p>
                  {media.album && (
                    <p className="text-[10px] text-slate-500 truncate">{media.album}</p>
                  )}
                </div>
              </div>

              {/* Progress Scrubber */}
              <div className="flex flex-col gap-1">
                <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{formatDuration(media.positionSec)}</span>
                  <span>{formatDuration(media.durationSec)}</span>
                </div>
              </div>

              {/* Interactive Playback Controls */}
              <div className="flex items-center justify-center gap-5 pt-1">
                <button
                  onClick={() => controlMedia('prev')}
                  title="Previous"
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={() => controlMedia('playpause')}
                  title={media.isPlaying ? 'Pause' : 'Play'}
                  className="w-11 h-11 rounded-full bg-white text-slate-950 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  {media.isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => controlMedia('next')}
                  title="Next"
                  className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Volume & Mode Switcher Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                {/* Volume Slider */}
                <div className="flex items-center gap-2 max-w-[130px] flex-1">
                  <button
                    onClick={() => setVolume(media.isMuted ? 50 : 0)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {media.isMuted || media.volumePct === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={media.volumePct}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Quick Desktop Mode Switcher */}
                <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10 text-[10px]">
                  <button
                    onClick={() => setMode('canvas')}
                    title="Switch to Desktop Canvas"
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setMode('sidebar')}
                    title="Switch to Floating Dock"
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Dock
                  </button>
                  <button
                    onClick={() => setMode('minibar')}
                    title="Switch to MiniBar"
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    MiniBar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
