import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import ConfirmModal from './ConfirmModal';
import NumberInput from './NumberInput';

const ALL_SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

export default function Player({ onTimeUpdate, onDurationChange, onMediaChange, playerRef, mediaTitle, onTitleChange }) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();

  const MIN_SPEED = settings.playback?.speedBounds?.min ?? 0.25;
  const MAX_SPEED = settings.playback?.speedBounds?.max ?? 3;
  const SPEED_PRESETS = useMemo(() =>
    (settings.playback?.speedPresets || ALL_SPEED_PRESETS).filter(s => s >= MIN_SPEED && s <= MAX_SPEED),
    [MIN_SPEED, MAX_SPEED, settings.playback?.speedPresets]
  );
  const [source, setSource] = useState('local'); // 'local' | 'youtube'
  const [localUrl, setLocalUrl] = useState(null);
  const [ytUrl, setYtUrl] = useState('');
  const [ytReady, setYtReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [speedMenuPos, setSpeedMenuPos] = useState(null);
  const [customSpeedInput, setCustomSpeedInput] = useState('');
  const [ytError, setYtError] = useState('');
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  const requestConfirm = (message, action) => {
    if (settings.advanced?.confirmDestructive) {
      setConfirmConfig({ isOpen: true, message, onConfirm: action });
    } else {
      action();
    }
  };

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytInnerRef = useRef(null);
  const rafIdRef = useRef(null);
  const apiLoadedRef = useRef(false);
  const wavesurferRef = useRef(null);
  const waveContainerRef = useRef(null);
  const localBlobRef = useRef(null);
  const speedMenuRef = useRef(null);
  const speedBtnRef = useRef(null);

  // Whether media is currently loaded
  const hasMedia = (source === 'local' && localUrl) || (source === 'youtube' && ytReady);

  // ——————— WAVEFORM ———————

  const initWaveform = useCallback(async (url, audioElement) => {
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
      media: audioElement,
      backend: 'MediaElement',
    });

    ws.on('seeking', (time) => {
      onTimeUpdate?.(time);
    });

    // Cursor following state
    let isFollowingCursor = false;
    let tooltipElement = null;

    const formatWaveTime = (s) => {
      if (!s || isNaN(s)) return '0:00.00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor(parseFloat((s % 1).toFixed(3)) * 100);
      return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

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
      const time = percentage * (audioElement.duration || 0);

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
        const time = percentage * (audioElement.duration || 0);

        audioElement.currentTime = time;
        onTimeUpdate?.(time);
      }
      updateTooltip(e);
    };

    const handleMouseDown = (e) => {
      const rect = waveContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(x / rect.width, 1));
      const time = percentage * (audioElement.duration || 0);

      isFollowingCursor = true;
      audioElement.currentTime = time;
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

  // ——————— REMOVE MEDIA ———————

  const removeMedia = () => {
    requestConfirm(t('confirmRemoveMedia') || 'Remove currently loaded media?', () => {
      if (source === 'local') {
        if (audioRef.current) audioRef.current.pause();
        if (localUrl) URL.revokeObjectURL(localUrl);
        setLocalUrl(null);
        localBlobRef.current = null;
        // Destroy waveform
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy();
          wavesurferRef.current = null;
        }
      } else if (source === 'youtube') {
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
          ytPlayerRef.current = null;
        }
        // Recreate the inner div for future use
        if (ytContainerRef.current) {
          ytContainerRef.current.innerHTML = '';
          const inner = document.createElement('div');
          inner.id = 'yt-player-inner';
          ytContainerRef.current.appendChild(inner);
          ytInnerRef.current = inner;
        }
        setYtReady(false);
        setYtUrl('');
        setYtError('');
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackSpeed(1);
      onTimeUpdate?.(0);
      onDurationChange?.(0);
      onTitleChange?.('');
      onMediaChange?.(false);
    });
  };

  // ——————— LOCAL AUDIO ———————

  const handleFileChange = useCallback((e) => {
    const file = e.type === 'change' ? e.target.files?.[0] : e;
    if (!file) return;
    localBlobRef.current = file;
    const url = URL.createObjectURL(file);
    setSource('local');
    setLocalUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    onTitleChange?.(file.name.replace(/\.[^/.]+$/, ""));
    onMediaChange?.(true);
  }, [onTitleChange, onMediaChange]);

  // Initialize waveform when localUrl changes
  useEffect(() => {
    if (!settings.playback?.showWaveform) {
      // Destroy if waveform was hidden while active
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      return;
    }
    if (localUrl && audioRef.current && waveContainerRef.current) {
      // Small delay to ensure audio element has loaded
      const timer = setTimeout(() => {
        initWaveform(localUrl, audioRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localUrl, initWaveform, settings.playback?.showWaveform]);

  const handleLocalTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
    }
  }, [onTimeUpdate]);

  const handleLocalLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(d);
      onDurationChange?.(d);
      audioRef.current.volume = settings.playback.muted ? 0 : settings.playback.volume;
    }
  };

  // Sync volume state when settings change
  useEffect(() => {
    if (source === 'local' && audioRef.current) {
      audioRef.current.volume = settings.playback.muted ? 0 : settings.playback.volume;
    } else if (source === 'youtube' && ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(settings.playback.muted ? 0 : (settings.playback.volume * 100));
    }
  }, [settings.playback.volume, settings.playback.muted, source, ytReady]);


  // ——————— YOUTUBE ———————

  const extractVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (apiLoadedRef.current) return;
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      apiLoadedRef.current = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    apiLoadedRef.current = true;
  }, []);

  // Create inner div for YT player on mount
  useEffect(() => {
    if (ytContainerRef.current && !ytInnerRef.current) {
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      ytContainerRef.current.appendChild(inner);
      ytInnerRef.current = inner;
    }
  }, []);

  const loadYouTube = () => {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) {
      setYtError(t('invalidUrl') || 'Invalid YouTube URL');
      return;
    }
    setYtError('');

    // Destroy existing player
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }

    // Recreate the inner element
    if (ytContainerRef.current) {
      ytContainerRef.current.innerHTML = '';
      const inner = document.createElement('div');
      inner.id = 'yt-player-inner';
      ytContainerRef.current.appendChild(inner);
      ytInnerRef.current = inner;
    }

    setYtReady(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const initPlayer = () => {
      if (!ytInnerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytInnerRef.current, {
        videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            setYtReady(true);
            const d = e.target.getDuration();
            setDuration(d);
            onDurationChange?.(d);
            e.target.setVolume(settings.playback.muted ? 0 : (settings.playback.volume * 100));

            const title = e.target.getVideoData()?.title;
            if (title) onTitleChange?.(title);
            onMediaChange?.(true);
          },
          onStateChange: (e) => {
            const playing = e.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(playing);
            if (e.data === window.YT.PlayerState.PAUSED && settings.playback?.autoRewindOnPause?.enabled) {
              const current = ytPlayerRef.current.getCurrentTime();
              const dur = ytPlayerRef.current.getDuration();
              if (current > 0 && current < dur) {
                const newTime = Math.max(0, current - (settings.playback?.autoRewindOnPause?.seconds || 2));
                ytPlayerRef.current.seekTo(newTime, true);
                setCurrentTime(newTime);
                onTimeUpdate?.(newTime);
              }
            }
          },
          onError: (e) => {
            const errorCodes = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video cannot be embedded',
              150: 'Video cannot be embedded',
            };
            setYtError(errorCodes[e.data] || `YouTube error (code ${e.data})`);
            setYtReady(false);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  };

  // Poll YouTube time with requestAnimationFrame for precision
  useEffect(() => {
    if (source !== 'youtube' || !ytReady || !isPlaying) {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }

    let lastPoll = 0;
    const poll = (timestamp) => {
      if (timestamp - lastPoll >= 50) {
        lastPoll = timestamp;
        if (ytPlayerRef.current?.getCurrentTime) {
          const t = ytPlayerRef.current.getCurrentTime();
          setCurrentTime(t);
          onTimeUpdate?.(t);
        }
      }
      rafIdRef.current = requestAnimationFrame(poll);
    };
    rafIdRef.current = requestAnimationFrame(poll);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [source, ytReady, isPlaying, onTimeUpdate]);

  // ——————— UNIFIED CONTROLS ———————

  const togglePlay = useCallback(() => {
    if (source === 'local' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (source === 'youtube' && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
      } else {
        ytPlayerRef.current.playVideo();
      }
    }
  }, [source, isPlaying]);

  const seek = useCallback((time) => {
    if (source === 'local' && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    } else if (source === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [source, onTimeUpdate]);

  const applySpeed = useCallback((speed) => {
    const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, parseFloat(speed) || 1));
    setPlaybackSpeed(clamped);
    if (source === 'local' && audioRef.current) {
      audioRef.current.playbackRate = clamped;
    } else if (source === 'youtube' && ytPlayerRef.current?.setPlaybackRate) {
      ytPlayerRef.current.setPlaybackRate(clamped);
    }
    setShowSpeedMenu(false);
  }, [source, MIN_SPEED, MAX_SPEED]);

  const handleCustomSpeedSubmit = useCallback(() => {
    const val = parseFloat(customSpeedInput);
    if (!isNaN(val) && val >= MIN_SPEED && val <= MAX_SPEED) {
      applySpeed(val);
      setCustomSpeedInput('');
    }
  }, [customSpeedInput, applySpeed, MIN_SPEED, MAX_SPEED]);

  // Close speed menu on outside click
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handler = (e) => {
      const inMenu = speedMenuRef.current && speedMenuRef.current.contains(e.target);
      const inBtn = speedBtnRef.current && speedBtnRef.current.contains(e.target);
      if (!inMenu && !inBtn) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSpeedMenu]);

  // Expose player API via ref
  useEffect(() => {
    if (playerRef) {
      playerRef.current = {
        getCurrentTime: () => {
          if (source === 'local' && audioRef.current) {
            return audioRef.current.currentTime;
          }
          if (source === 'youtube' && ytPlayerRef.current?.getCurrentTime) {
            return ytPlayerRef.current.getCurrentTime();
          }
          return 0;
        },
        play: () => {
          if (!isPlaying) togglePlay();
        },
        pause: () => {
          if (isPlaying) togglePlay();
        },
        seek: (time) => {
          seek(time);
        },
        getAudioBlob: () => {
          return localBlobRef.current || null;
        },
        loadLocalAudio: (file) => {
          handleFileChange(file);
        }
      };
    }
  }, [source, isPlaying, playerRef, togglePlay, seek, handleFileChange]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00.00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor(parseFloat((s % 1).toFixed(3)) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleLocalPause = () => {
    if (settings.playback?.autoRewindOnPause?.enabled && audioRef.current && audioRef.current.currentTime > 0) {
      if (audioRef.current.currentTime < audioRef.current.duration) {
        const newTime = Math.max(0, audioRef.current.currentTime - (settings.playback?.autoRewindOnPause?.seconds || 2));
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        onTimeUpdate?.(newTime);
      }
    }
  };

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-1.5 sm:space-y-3 animate-fade-in overflow-visible">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 mb-1">
        <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-0.5 min-w-0">
          <span className="uppercase shrink-0 text-xs sm:text-sm">{t('playerTitle')}</span>
          {mediaTitle && (
            <>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs min-w-0 flex-1">
                <svg className="w-2.5 h-2.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                </svg>
                <div className="flex-1 min-w-0 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' }}>
                  <span className="text-primary normal-case tracking-normal animate-marquee inline-block whitespace-nowrap">{mediaTitle}</span>
                </div>
              </div>
            </>
          )}
        </h2>
        {!hasMedia ? (
          <div className="flex gap-0.5 bg-zinc-800/60 rounded-lg p-0.5 shrink-0 flex-nowrap">
            <button
              id="source-local"
              onClick={() => setSource('local')}
              className={`px-2 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'local'
                ? 'bg-primary text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {t('localFile')}
            </button>
            <button
              id="source-youtube"
              onClick={() => setSource('youtube')}
              className={`px-2 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'youtube'
                ? 'bg-primary text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {t('youtube')}
            </button>
          </div>
        ) : (
          <button
            id="remove-media-btn"
            onClick={removeMedia}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
            title={t('remove')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Local Source */}
      {source === 'local' && !localUrl && (
        <div className="space-y-3 animate-fade-in">
          <label
            htmlFor="audio-file-input"
            className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t('dropAudio')}
            </span>
            <input
              id="audio-file-input"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
      {source === 'local' && localUrl && (
        <div className="animate-fade-in space-y-3">
          {/* Waveform container */}
          {settings.playback?.showWaveform && (
            <div
              ref={waveContainerRef}
              className="w-full rounded-lg overflow-hidden bg-zinc-900/40 border border-zinc-800/50 cursor-pointer"
            />
          )}

          <audio
            ref={audioRef}
            src={localUrl}
            onTimeUpdate={handleLocalTimeUpdate}
            onLoadedMetadata={handleLocalLoadedMetadata}
            onPause={handleLocalPause}
            className="hidden"
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* YouTube Source */}
      {source === 'youtube' && !ytReady && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex gap-2">
            <input
              id="youtube-url-input"
              type="text"
              value={ytUrl}
              onChange={(e) => { setYtUrl(e.target.value); setYtError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && loadYouTube()}
              placeholder={t('pasteUrl')}
              className={`flex-1 bg-zinc-800/60 border rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all ${ytError ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/25' : 'border-zinc-700 focus:border-primary/50 focus:ring-primary/25'}`}
            />
            <button
              id="load-youtube-btn"
              onClick={loadYouTube}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('load')}
            </button>
          </div>
          {ytError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {ytError}
            </p>
          )}
        </div>
      )}
      <div
        ref={ytContainerRef}
        className={`fixed -top-[9999px] -left-[9999px] w-0 h-0 opacity-0 pointer-events-none ${source === 'youtube' && ytReady ? '' : 'hidden'
          }`}
      />

      {(localUrl || ytReady) && (
        <div className="space-y-1 sm:space-y-2 pt-1 sm:pt-2 animate-fade-in">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <button
              id="play-pause-btn"
              onClick={togglePlay}
              className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-full bg-primary hover:bg-primary-dim text-zinc-950 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer glow-primary flex-shrink-0"
            >
              {isPlaying ? (
                <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-3 sm:w-4 h-3 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            <input
              id="seek-slider"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 min-w-0"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255, 255, 255, 0.15) ${duration ? (currentTime / duration) * 100 : 0}%)`
              }}
            />

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-left shrink-0">
              {formatTime(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1 sm:gap-1.5 group/volume relative">
              <button
                onClick={() => updateSetting('playback.muted', !settings.playback.muted)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer flex-shrink-0"
                title={settings.playback.muted ? t('unmute') || 'Unmute' : t('mute') || 'Mute'}
              >
                {settings.playback.muted || settings.playback.volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6.75h-2.25A2.25 2.25 0 002.25 9.75v4.5a2.25 2.25 0 002.25 2.25h2.25l6.75 6.75V3.75l-6.75 6.75z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>
              <div className="overflow-hidden w-0 group-hover/volume:w-24 focus-within/volume:w-24 transition-all duration-300 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.playback.volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateSetting('playback.volume', val);
                    if (val > 0 && settings.playback.muted) {
                      updateSetting('playback.muted', false);
                    }
                  }}
                  className="w-20 mx-2"
                  style={{
                    background: `linear-gradient(to right, var(--color-primary) ${settings.playback.volume * 100}%, rgba(255, 255, 255, 0.15) ${settings.playback.volume * 100}%)`
                  }}
                />
              </div>
            </div>


            {/* Speed Control Dropdown */}
            <div className="relative">
              <button
                ref={speedBtnRef}
                id="speed-btn"
                onClick={() => {
                  setShowSpeedMenu(prev => {
                    if (!prev && speedBtnRef.current) {
                      const rect = speedBtnRef.current.getBoundingClientRect();
                      setSpeedMenuPos({
                        top: rect.bottom + 8,
                        right: window.innerWidth - rect.right,
                      });
                    }
                    return !prev;
                  });
                }}
                title={t('speed')}
                className={`h-8 sm:h-9 px-2 sm:px-2.5 flex items-center gap-1 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 text-xs font-mono font-semibold ${playbackSpeed !== 1
                  ? 'bg-primary text-zinc-950 shadow-lg shadow-primary/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
              >
                {playbackSpeed}x
                <svg className={`w-2.5 h-2.5 transition-transform duration-200 ${showSpeedMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSpeedMenu && speedMenuPos && createPortal(
                <div
                  ref={speedMenuRef}
                  className="fixed w-44 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-[9999]"
                  style={{
                    top: speedMenuPos.top,
                    right: speedMenuPos.right,
                  }}
                >
                  <div className="p-1.5 max-h-52 overflow-y-auto speed-menu-scroll">
                    {SPEED_PRESETS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => applySpeed(speed)}
                        className={`w-full text-left px-3 py-1.5 text-xs font-mono rounded-lg transition-all duration-150 cursor-pointer ${playbackSpeed === speed
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                          }`}
                      >
                        {speed}x {speed === 1 && <span className="text-zinc-500 font-sans">(normal)</span>}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-zinc-700/60 p-2">
                    <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-1 block">{t('customSpeed') || 'Custom'} ({MIN_SPEED}–{MAX_SPEED}x)</label>
                    <div className="flex gap-1.5">
                      <NumberInput
                        id="custom-speed-input"
                        min={MIN_SPEED}
                        max={MAX_SPEED}
                        step={0.05}
                        value={customSpeedInput}
                        onChange={(e) => setCustomSpeedInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomSpeedSubmit()}
                        placeholder="e.g. 1.3"
                        className="flex-1 w-0"
                      />
                      <button
                        onClick={handleCustomSpeedSubmit}
                        disabled={!customSpeedInput || isNaN(parseFloat(customSpeedInput)) || parseFloat(customSpeedInput) < MIN_SPEED || parseFloat(customSpeedInput) > MAX_SPEED}
                        className="px-2.5 py-1.5 bg-primary hover:bg-primary-dim disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        message={confirmConfig.message}
        onConfirm={() => {
          const action = confirmConfig.onConfirm;
          setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
          if (action) setTimeout(action, 0);
        }}
        onCancel={() => setConfirmConfig({ isOpen: false, message: '', onConfirm: null })}
      />
    </div>
  );
}
