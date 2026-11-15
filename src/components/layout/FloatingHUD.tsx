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
  const { snapshot, setMode, controlMedia, setVolume, toggleMute } = useTelemetry();
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
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] pointer-events-auto transition-opacity"
        />
      )}

      {/* Floating Dynamic Island Pinned Above All Windows */}
      <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-none">
        <AnimatePresence mode="wait">
          {!expanded ? (
            /* Compact iPhone-style Collapsed Dynamic Island Pill */
            <motion.div
              key="pill"
              initial={{ scale: 0.88, opacity: 0, y: -6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              data-interactive="true"
              onClick={() => setExpanded(true)}
              className="pointer-events-auto bg-black/92 hover:bg-black text-white rounded-full px-2.5 py-1 border border-white/15 shadow-[0_10px_28px_rgba(0,0,0,0.65)] flex items-center gap-2 cursor-pointer transition-colors group origin-top"
            >
              {/* Album Art / Music Icon */}
              <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
                {media.albumArtUrl ? (
                  <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-3 h-3 text-cyan-400" />
                )}
              </div>

              {/* Compact Track Marquee */}
              <div className="flex flex-col min-w-0 max-w-[120px] leading-tight">
                <span className="text-[11px] font-semibold tracking-tight text-slate-100 truncate">
                  {media.title || 'No Media'}
                </span>
                <span className="text-[9px] text-slate-400 truncate -mt-0.5">
                  {media.artist || media.sourceApp || 'Idle'}
                </span>
              </div>

              {/* Animated Audio Equalizer Waveform */}
              <div className="flex items-end gap-[1.5px] h-3 px-0.5 shrink-0">
                {[0.4, 0.9, 0.6, 0.7].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={
                      media.isPlaying
                        ? {
                            height: ['3px', '12px', '5px', '10px'],
                            transition: {
                              repeat: Infinity,
                              duration: 0.55 + i * 0.12,
                              ease: 'easeInOut',
                            },
                          }
                        : { height: `${Math.round(h * 10)}px` }
                    }
                    className={`w-[2px] rounded-full ${
                      media.isPlaying ? 'bg-emerald-400' : 'bg-slate-500'
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
                className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-90"
              >
                {media.isPlaying ? (
                  <Pause className="w-2.5 h-2.5 fill-current" />
                ) : (
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                )}
              </button>

              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
            </motion.div>
          ) : (
            /* Seamlessly Expanded Dynamic Island Card (Originating from Top-Center) */
            <motion.div
              key="card"
              initial={{ scale: 0.85, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 480, damping: 30 }}
              data-interactive="true"
              className="w-[360px] pointer-events-auto bg-black/92 backdrop-blur-3xl text-white rounded-[26px] p-4 border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col gap-3 origin-top"
            >
              {/* Header & Source Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
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

              {/* Album Art & Track Metadata */}
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-2xl bg-white/10 overflow-hidden shrink-0 border border-white/10 shadow-md flex items-center justify-center">
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
                    className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{formatDuration(media.positionSec)}</span>
                  <span>{formatDuration(media.durationSec)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6 pt-0.5">
                <button
                  onClick={() => controlMedia('prev')}
                  title="Previous Track"
                  className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={() => controlMedia('playpause')}
                  title={media.isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10 rounded-full bg-white text-slate-950 flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  {media.isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={() => controlMedia('next')}
                  title="Next Track"
                  className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Master Volume & Quick Mode Switcher */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-3">
                {/* Real Volume Slider & Mute Toggle */}
                <div className="flex items-center gap-2 max-w-[130px] flex-1">
                  <button
                    onClick={toggleMute}
                    title={media.isMuted ? 'Unmute' : 'Mute'}
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
                    value={media.isMuted ? 0 : media.volumePct}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-6">
                    {media.isMuted ? '0%' : `${media.volumePct}%`}
                  </span>
                </div>

                {/* Quick Desktop Mode Switcher */}
                <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10 text-[10px]">
                  <button
                    onClick={() => {
                      setExpanded(false);
                      setMode('canvas');
                    }}
                    title="Switch to Desktop Canvas"
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => {
                      setExpanded(false);
                      setMode('sidebar');
                    }}
                    title="Switch to Floating Dock"
                    className="px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    Dock
                  </button>
                  <button
                    onClick={() => {
                      setExpanded(false);
                      setMode('minibar');
                    }}
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
