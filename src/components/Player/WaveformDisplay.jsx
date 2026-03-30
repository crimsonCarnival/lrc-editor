import React, { useEffect, useRef, useCallback } from 'react';
import { formatTime } from '../../utils/formatTime';

const WaveformDisplay = React.memo(function WaveformDisplay({ 
  audioRef, 
  localUrl, 
  showWaveform, 
  onTimeUpdate 
}) {
  const wavesurferRef = useRef(null);
  const waveContainerRef = useRef(null);

  const initWaveform = useCallback(async (url, audioEl) => {
    // Dynamically import wavesurfer.js
    const WaveSurfer = (await import('wavesurfer.js')).default;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    if (!waveContainerRef.current) return;

    const ws = WaveSurfer.create({
      container: waveContainerRef.current,
      waveColor: 'rgba(29, 185, 84, 0.4)',
      progressColor: '#1DB954',
      cursorColor: '#1DB954',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 48,
      normalize: true,
      interact: false,
      media: audioEl,
      backend: 'MediaElement',
    });

    ws.on('seeking', (time) => {
      onTimeUpdate?.(time);
    });

    // Cursor following state
    let isFollowingCursor = false;
    let tooltipElement = null;

    const formatWaveTime = formatTime;

    const createTooltip = () => {
      if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.style.cssText = `
          position: absolute;
          background: rgba(0, 0, 0, 0.85);
          color: #1DB954;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
          pointer-events: none;
          z-index: 1000;
          display: none;
          white-space: nowrap;
          border: 1px solid rgba(29, 185, 84, 0.3);
        `;
        waveContainerRef.current?.appendChild(tooltipElement);
      }
      return tooltipElement;
    };

    const updateTooltip = (e) => {
      const tooltip = createTooltip();
      const rect = waveContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(x / rect.width, 1));
      const time = percentage * (audioEl.duration || 0);

      tooltip.textContent = formatWaveTime(time);
      tooltip.style.left = (x - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = '-28px';
      tooltip.style.display = 'block';
    };

    const handleMouseMove = (e) => {
      if (isFollowingCursor) {
        const rect = waveContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(x / rect.width, 1));
        const time = percentage * (audioEl.duration || 0);

        audioEl.currentTime = time;
        onTimeUpdate?.(time);
      }
      updateTooltip(e);
    };

    const handleMouseDown = (e) => {
      const rect = waveContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(x / rect.width, 1));
      const time = percentage * (audioEl.duration || 0);

      isFollowingCursor = true;
      audioEl.currentTime = time;
      onTimeUpdate?.(time);
    };

    const handleMouseUp = () => {
      isFollowingCursor = false;
    };

    waveContainerRef.current?.addEventListener('mouseenter', createTooltip);
    waveContainerRef.current?.addEventListener('mousemove', handleMouseMove, { passive: true });
    waveContainerRef.current?.addEventListener('mouseleave', () => {
      if (tooltipElement) tooltipElement.style.display = 'none';
      isFollowingCursor = false;
    });
    waveContainerRef.current?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    wavesurferRef.current = ws;
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!showWaveform) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      return;
    }
    
    if (localUrl && audioRef.current && waveContainerRef.current) {
      // Small delay to ensure audio element has loaded before binding WaveSurfer
      const timer = setTimeout(() => {
        initWaveform(localUrl, audioRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localUrl, initWaveform, showWaveform, audioRef]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, []);

  if (!showWaveform) return null;

  return (
    <div
      ref={waveContainerRef}
      className="w-full rounded-lg overflow-hidden bg-zinc-900/40 border border-zinc-800/50 cursor-pointer"
    />
  );
});

export default WaveformDisplay;
