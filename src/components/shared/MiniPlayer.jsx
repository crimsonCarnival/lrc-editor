import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, FolderOpen } from 'lucide-react';
import { formatTime } from '../../utils/formatTime';

const SPEED_CYCLE = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Lightweight persistent mini-player bar for mobile.
 * Polls playerRef for isPlaying/currentTime/speed rather than owning audio state.
 * Shows: load button (no media) | skip-back · play/pause · skip-fwd · seekbar · speed · mark
 */
export default function MiniPlayer({ playerRef, playbackPosition, duration, syncMode, hasMedia }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef(null);
  const fileInputRef = useRef(null);

  // Poll playing state + speed at ~4 Hz
  useEffect(() => {
    const poll = () => {
      if (playerRef?.current) {
        if (playerRef.current.isPlaying) setIsPlaying(playerRef.current.isPlaying());
        if (playerRef.current.getSpeed)  setSpeed(playerRef.current.getSpeed());
      }
      rafRef.current = setTimeout(poll, 250);
    };
    poll();
    return () => clearTimeout(rafRef.current);
  }, [playerRef]);

  const togglePlay = useCallback(() => {
    playerRef?.current?.togglePlay?.();
  }, [playerRef]);

  const handleSeek = useCallback((e) => {
    playerRef?.current?.seek?.(parseFloat(e.target.value));
  }, [playerRef]);

  const skipBack = useCallback(() => {
    const t = playerRef?.current?.getCurrentTime?.() ?? 0;
    playerRef?.current?.seek?.(Math.max(0, t - 10));
  }, [playerRef]);

  const skipForward = useCallback(() => {
    const t = playerRef?.current?.getCurrentTime?.() ?? 0;
    playerRef?.current?.seek?.(Math.min(duration || 0, t + 10));
  }, [playerRef, duration]);

  const cycleSpeed = useCallback(() => {
    const current = playerRef?.current?.getSpeed?.() ?? 1;
    const idx = SPEED_CYCLE.findIndex((s) => Math.abs(s - current) < 0.05);
    const next = SPEED_CYCLE[(idx + 1) % SPEED_CYCLE.length];
    playerRef?.current?.adjustSpeed?.(next - current);
  }, [playerRef]);

  const handleMark = useCallback(() => {
    window.dispatchEvent(new CustomEvent('editor:mark'));
  }, []);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) playerRef?.current?.loadLocalAudio?.(file);
    e.target.value = '';
  }, [playerRef]);

  const progress = duration > 0 ? (playbackPosition / duration) * 100 : 0;
  const speedLabel = Number.isInteger(speed) ? speed.toFixed(1) : String(speed);

  if (!hasMedia) {
    return (
      <div className="flex items-center gap-2 px-4 h-12 border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-md">
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Load audio file"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Load audio
        </button>
        <div className="flex-1 h-1 rounded-full bg-zinc-800/60" />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*"
          className="sr-only"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 h-12 border-t border-zinc-700/50 bg-zinc-900/90 backdrop-blur-md">
      {/* Skip back 10s */}
      <button
        onClick={skipBack}
        aria-label="Skip back 10 seconds"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 active:text-zinc-100 active:scale-95 transition-all flex-shrink-0"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
      >
        {isPlaying
          ? <Pause className="w-3.5 h-3.5 text-zinc-950" fill="currentColor" />
          : <Play  className="w-3.5 h-3.5 text-zinc-950 ml-0.5" fill="currentColor" />}
      </button>

      {/* Skip forward 10s */}
      <button
        onClick={skipForward}
        aria-label="Skip forward 10 seconds"
        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 active:text-zinc-100 active:scale-95 transition-all flex-shrink-0"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Current time */}
      <span className="text-[10px] font-mono tabular-nums text-zinc-400 w-9 shrink-0 text-right">
        {formatTime(playbackPosition)}
      </span>

      {/* Seekbar */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={playbackPosition}
        onChange={handleSeek}
        aria-label="Seek"
        aria-valuenow={Math.round(playbackPosition)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        className="flex-1 min-w-0"
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
        }}
      />

      {/* Duration */}
      <span className="text-[10px] font-mono tabular-nums text-zinc-400 w-9 shrink-0">
        {formatTime(duration)}
      </span>

      {/* Speed toggle */}
      <button
        onClick={cycleSpeed}
        aria-label={`Playback speed ${speedLabel}×, tap to change`}
        className="h-6 px-1.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] font-bold tabular-nums text-zinc-300 active:scale-95 active:bg-zinc-700 transition-all flex-shrink-0 min-w-[2.5rem] text-center"
      >
        {speedLabel}×
      </button>

      {/* Mark button — only in sync mode */}
      {syncMode && (
        <button
          onPointerDown={(e) => { e.preventDefault(); handleMark(); }}
          aria-label="Mark timestamp"
          className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600/60 flex items-center justify-center flex-shrink-0 active:scale-95 active:bg-primary/20 transition-all"
        >
          <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        </button>
      )}
    </div>
  );
}
