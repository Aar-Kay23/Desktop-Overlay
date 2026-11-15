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
  LayoutGrid,
  Sidebar,
  Minimize2,
} from 'lucide-react';
import { useTelemetry } from '../../context/TelemetryContext';
import { formatDuration } from '../../lib/utils';

interface FloatingHUDProps {
  isStandaloneWindow?: boolean;
}

export const FloatingHUD: React.FC<FloatingHUDProps> = ({ isStandaloneWindow = false }) => {
  const { snapshot, setMode, controlMedia, setVolume, toggleMute } = useTelemetry();
  const { media } = snapshot;
  const [expanded, setExpanded] = useState(false);
  const [showPillMenu, setShowPillMenu] = useState(false);

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
      <div
        className={
          isStandaloneWindow
            ? 'w-full flex flex-col items-center select-none pointer-events-none pt-1'
            : 'fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-none'
        }
      >
        <motion.div
          initial={false}
          animate={{
            width: expanded ? 364 : media.isPlaying ? 208 : 164,
            height: expanded ? 222 : 32,
            borderRadius: expanded ? 26 : 9999,
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 32,
            mass: 0.8,
          }}
          data-interactive="true"
          onClick={() => {
            if (!expanded) setExpanded(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPillMenu((prev) => !prev);
          }}
          className="pointer-events-auto bg-black text-white border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col justify-start relative select-none cursor-pointer overflow-hidden origin-top"
        >
          <AnimatePresence mode="wait">
            {!expanded ? (
              /* Compact iPhone-style Collapsed Dynamic Island Pill */
              <motion.div
                key="pill-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="w-full h-[32px] px-2.5 py-1 flex items-center justify-between gap-1.5"
              >
                {/* Album Art / Music Icon */}
                <div className="w-4.5 h-4.5 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
                  {media.albumArtUrl ? (
                    <img src={media.albumArtUrl} alt="Art" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-2.5 h-2.5 text-cyan-400" />
                  )}
                </div>

                {/* Compact Track Marquee */}
                <div className="flex flex-col min-w-0 flex-1 leading-tight overflow-hidden">
                  <span className="text-[11px] font-semibold tracking-tight text-slate-100 truncate">
                    {media.title || 'No Media'}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate -mt-0.5">
                    {media.artist || media.sourceApp || 'Idle'}
                  </span>
                </div>

                {/* GPU-Accelerated CSS Equalizer Waveform (0 JS main-thread load, butter smooth) */}
                <div className="flex items-end gap-[1.5px] h-3 px-0.5 shrink-0">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`w-[2px] rounded-full h-3 ${
                        media.isPlaying
                          ? `bg-emerald-400 eq-bar eq-bar-${idx}`
                          : 'bg-slate-500 scale-y-25'
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
                  className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-transform active:scale-90 shrink-0"
                >
                  {media.isPlaying ? (
                    <Pause className="w-2.5 h-2.5 fill-current" />
                  ) : (
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Quick Switch back to Desktop Mode button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode('canvas');
                  }}
                  title="Switch back to Desktop Widgets (Right-click for more modes)"
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0"
                >
                  <LayoutGrid className="w-2.5 h-2.5" />
                </button>

                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </motion.div>
            ) : (
              /* Expanded Dynamic Island Full Card */
              <motion.div
                key="card-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="w-full h-full p-4 flex flex-col justify-between"
              >
                {/* Header: Dynamic Island badge & Prominent Mode Switcher */}
                <div className="flex items-center justify-between gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      Island
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                      {media.sourceApp || 'Spotify'}
                    </span>
                  </div>

                  {/* Prominent Mode Switcher right in the header (100% visible, never cut off) */}
                  <div className="flex items-center bg-white/10 rounded-full p-0.5 border border-white/10 text-[10px] shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                        setMode('canvas');
                      }}
                      title="Switch to Desktop Widgets Canvas"
                      className="px-2 py-0.5 rounded-full text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Desktop
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                        setMode('sidebar');
                      }}
                      title="Switch to Floating Dock"
                      className="px-2 py-0.5 rounded-full text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Dock
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                        setMode('minibar');
                      }}
                      title="Switch to MiniBar"
                      className="px-2 py-0.5 rounded-full text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      Mini
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(false);
                    }}
                    title="Collapse Dynamic Island"
                    className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/25 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Album Art & Track Metadata */}
                <div className="flex items-center gap-3 my-1">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      controlMedia('prev');
                    }}
                    title="Previous Track"
                    className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      controlMedia('playpause');
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      controlMedia('next');
                    }}
                    title="Next Track"
                    className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer active:scale-90"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>
                </div>

                {/* Master Volume & Secondary Mode Switcher */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10 gap-3">
                  {/* Real Volume Slider & Mute Toggle */}
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
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
                    <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                      {media.isMuted ? '0%' : `${media.volumePct}%`}
                    </span>
                  </div>

                  {/* Secondary Quick Switcher */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                        setMode('canvas');
                      }}
                      title="Switch to Desktop Canvas"
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1 px-1.5"
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span>Desktop</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Collapsed Right-Click Context Menu for Quick Mode Switching */}
        <AnimatePresence>
          {showPillMenu && !expanded && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              data-interactive="true"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 bg-black/95 text-white rounded-xl p-1.5 border border-white/15 shadow-2xl flex flex-col gap-1 text-[11px] min-w-[140px] pointer-events-auto"
            >
              <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/10">
                Switch Mode
              </div>
              <button
                onClick={() => {
                  setShowPillMenu(false);
                  setMode('canvas');
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Desktop Widgets</span>
              </button>
              <button
                onClick={() => {
                  setShowPillMenu(false);
                  setMode('sidebar');
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
              >
                <Sidebar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Floating Dock</span>
              </button>
              <button
                onClick={() => {
                  setShowPillMenu(false);
                  setMode('minibar');
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer text-left"
              >
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>MiniBar</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
