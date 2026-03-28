import { useState, useRef, useEffect, useCallback } from 'react';
import { createVocalIsolation } from '../utils/audioProcessing';
import { useTranslation } from 'react-i18next';

export default function Player({ onTimeUpdate, onDurationChange, onMediaChange, playerRef, mediaTitle, onTitleChange }) {
  const { t } = useTranslation();
  const [source, setSource] = useState('local'); // 'local' | 'youtube'
  const [localFile, setLocalFile] = useState(null);
  const [localUrl, setLocalUrl] = useState(null);
  const [ytUrl, setYtUrl] = useState('');
  const [ytReady, setYtReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vocalIsolation, setVocalIsolation] = useState(false);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const rafIdRef = useRef(null);
  const apiLoadedRef = useRef(false);
  const wavesurferRef = useRef(null);
  const waveContainerRef = useRef(null);
  const vocalIsolationRef = useRef(null);
  const localBlobRef = useRef(null);

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
      height: 60,
      normalize: true,
      interact: true,
      media: audioElement,
      backend: 'MediaElement',
    });

    ws.on('seeking', (time) => {
      onTimeUpdate?.(time);
    });

    wavesurferRef.current = ws;
  }, [onTimeUpdate]);

  // ——————— REMOVE MEDIA ———————

  const removeMedia = () => {
    if (source === 'local') {
      if (audioRef.current) audioRef.current.pause();
      if (localUrl) URL.revokeObjectURL(localUrl);
      setLocalFile(null);
      setLocalUrl(null);
      localBlobRef.current = null;
      // Destroy waveform
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      // Destroy vocal isolation
      if (vocalIsolationRef.current) {
        vocalIsolationRef.current.destroy();
        vocalIsolationRef.current = null;
      }
      setVocalIsolation(false);
    } else if (source === 'youtube') {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      setYtReady(false);
      setYtUrl('');
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onTimeUpdate?.(0);
    onDurationChange?.(0);
    onTitleChange?.('');
    onMediaChange?.(false);
  };

  // ——————— LOCAL AUDIO ———————

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalFile(file);
    localBlobRef.current = file;
    const url = URL.createObjectURL(file);
    setLocalUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    onTitleChange?.(file.name.replace(/\.[^/.]+$/, ""));
    onMediaChange?.(true);
  };

  // Initialize waveform when localUrl changes
  useEffect(() => {
    if (localUrl && audioRef.current && waveContainerRef.current) {
      // Small delay to ensure audio element has loaded
      const timer = setTimeout(() => {
        initWaveform(localUrl, audioRef.current);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [localUrl, initWaveform]);

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
    }
  };

  // ——————— VOCAL ISOLATION ———————

  const toggleVocalIsolation = () => {
    if (!audioRef.current) return;

    if (!vocalIsolationRef.current) {
      vocalIsolationRef.current = createVocalIsolation(audioRef.current);
      vocalIsolationRef.current.init();
    }

    vocalIsolationRef.current.toggle();
    setVocalIsolation(vocalIsolationRef.current.isEnabled());
  };

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

  const loadYouTube = () => {
    const videoId = extractVideoId(ytUrl);
    if (!videoId) return;

    // Destroy existing player
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }

    setYtReady(false);
    setIsPlaying(false);
    setCurrentTime(0);

    const initPlayer = () => {
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            setYtReady(true);
            const d = e.target.getDuration();
            setDuration(d);
            onDurationChange?.(d);

            const title = e.target.getVideoData()?.title;
            if (title) onTitleChange?.(title);
            onMediaChange?.(true);
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
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

  const togglePlay = () => {
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
  };

  const seek = (time) => {
    if (source === 'local' && audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    } else if (source === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

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
      };
    }
  });

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00.00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor(parseFloat((s % 1).toFixed(3)) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
          <span className="uppercase shrink-0">{t('playerTitle')}</span>
          {mediaTitle && (
            <>
              <span className="text-zinc-600 shrink-0">•</span>
              <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
                <span className="text-primary normal-case tracking-normal animate-marquee">{mediaTitle}</span>
              </div>
            </>
          )}
        </h2>
        {!hasMedia ? (
          <div className="flex gap-1 bg-zinc-800/60 rounded-lg p-0.5">
            <button
              id="source-local"
              onClick={() => setSource('local')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'local'
                  ? 'bg-primary text-zinc-950 shadow-lg'
                  : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {t('localFile')}
            </button>
            <button
              id="source-youtube"
              onClick={() => setSource('youtube')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'youtube'
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('remove')}
          </button>
        )}
      </div>

      {/* Local Source */}
      {source === 'local' && !localUrl && (
        <div className="space-y-3 animate-fade-in">
          <label
            htmlFor="audio-file-input"
            className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-primary/50 rounded-xl p-6 cursor-pointer transition-colors duration-200 group"
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
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/40 rounded-lg">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            <span className="text-sm text-zinc-300 truncate">{localFile?.name}</span>
          </div>

          {/* Waveform container */}
          <div
            ref={waveContainerRef}
            className="w-full rounded-lg overflow-hidden bg-zinc-900/40 border border-zinc-800/50 cursor-pointer"
          />

          <audio
            ref={audioRef}
            src={localUrl}
            onTimeUpdate={handleLocalTimeUpdate}
            onLoadedMetadata={handleLocalLoadedMetadata}
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
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadYouTube()}
              placeholder={t('pasteUrl')}
              className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all"
            />
            <button
              id="load-youtube-btn"
              onClick={loadYouTube}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('load')}
            </button>
          </div>
        </div>
      )}
      <div
        ref={ytContainerRef}
        className={`w-full rounded-lg overflow-hidden bg-zinc-900 transition-all duration-300 ${source === 'youtube' && ytReady ? 'aspect-video' : 'hidden'
          }`}
      />

      {(localUrl || ytReady) && (
        <div className="space-y-2 pt-2 animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              id="play-pause-btn"
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary hover:bg-primary-dim text-zinc-950 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer glow-primary"
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <span className="text-xs text-zinc-400 font-mono w-[60px] text-right shrink-0">
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
              className="flex-1"
            />

            <span className="text-xs text-zinc-400 font-mono w-[60px] text-left shrink-0">
              {formatTime(duration)}
            </span>

            {/* Vocal Isolation Toggle — only for local audio */}
            {source === 'local' && localUrl && (
              <button
                id="vocal-isolation-btn"
                onClick={toggleVocalIsolation}
                title={vocalIsolation ? t('disableVocals') : t('focusVocals')}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer shrink-0 ${vocalIsolation
                    ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/30 scale-110'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
