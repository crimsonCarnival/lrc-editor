import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@ui/button';
import { FloatingInput } from '@ui/floating-input';
import { Textarea } from '@ui/textarea';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Badge } from '@ui/badge';
import { Switch } from '@ui/switch';
import {
  FolderOpen, Music2, FileText, Upload, Check, ArrowRight, Trash2,
  Video, Cloud, Link2, Loader2, Lock, Globe, Sparkles, X, LockKeyhole, Lightbulb
} from 'lucide-react';
import { useSetupContext } from '@/contexts/SetupContext';
import { lyrics as lyricsApi, uploads as uploadsApi, spotify as spotifyApi, getAccessToken } from '@/api';
import { SkeletonMediaItem } from '@ui/skeleton';
import SpotifyBrowser from '@features/player/SpotifyBrowser';
import SpotifyIcon from '@shared/SpotifyIcon';
import { useAuthContext } from '@/contexts/useAuthContext';
import YoutubeSearchPanel from '@features/projects/YoutubeSearchPanel';
import toast from 'react-hot-toast';
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth';

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024;

export default function SetupScreen({ onComplete, playerRef, onShowAllUploads }) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { login: handleSpotifyLogin } = useSpotifyAuth();
  const { step, setStep } = useSetupContext();

  useEffect(() => { setStep(1); }, [setStep]);

  const tips = t('home.tips', { returnObjects: true });
  const hasTips = Array.isArray(tips) && tips.length > 0;
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    if (!hasTips) return;
    const id = setInterval(() => setTipIndex(p => (p + 1) % tips.length), 20000);
    return () => clearInterval(id);
  }, [hasTips, tips.length]);

  const audioInputRef = useRef(null);
  const lyricsInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const autoLoadPendingRef = useRef(false);

  // Audio state
  const [audioReady, setAudioReady] = useState(false);
  const [audioName, setAudioName] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [audioTab, setAudioTab] = useState('youtube'); // 'youtube' | 'spotify' | 'local'
  const [audioSource, setAudioSource] = useState(null);

  // Media library state
  const [mediaUploads, setMediaUploads] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(!!getAccessToken());

  // Lyrics state
  const [lyricsText, setLyricsText] = useState('');
  const [parsedLines, setParsedLines] = useState(null);
  const [lyricsFileName, setLyricsFileName] = useState('');
  const [editorMode, setEditorMode] = useState('lrc');

  // Metadata state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectTags, setProjectTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const hasLyrics = parsedLines ? parsedLines.length > 0 : lyricsText.trim().length > 0;
  const canContinue = audioReady && hasLyrics;

  // Fetch user's media library on mount
  useEffect(() => {
    if (!getAccessToken()) return;
    uploadsApi.listMedia()
      .then((uploads) => setMediaUploads(uploads || []))
      .catch(() => { })
      .finally(() => setMediaLoading(false));
  }, []);

  // Pre-fill YouTube URL if coming from the YouTube search panel
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingYtUrl');
    if (pending) {
      setYtUrl(pending);
      autoLoadPendingRef.current = true;
      sessionStorage.removeItem('pendingYtUrl');
      sessionStorage.removeItem('pendingYtTitle');
    }
  }, []);

  // Sync project name to audio name if empty when reaching step 2
  useEffect(() => {
    if (step === 2 && !projectName && audioName && !audioName.includes('://') && audioName !== t('setup.youtubeVideo')) {
      setProjectName(audioName);
    }
  }, [step, projectName, audioName, t]);

  const saveUploadRecord = useCallback(async (data) => {
    if (!getAccessToken()) return;
    try {
      await uploadsApi.saveMedia(data);
      const uploads = await uploadsApi.listMedia();
      setMediaUploads(uploads || []);
    } catch { /* ignore */ }
  }, []);

  // ── URL / pattern helpers ──

  const CDN_PATTERN = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\//;
  const AUDIO_URL_PATTERN = /^https?:\/\/.+\.(mp3|mp4|wav|ogg|flac|aac|m4a|webm)(\?.*)?$/i;
  const YT_PATTERN = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|watch\?.+&v=)|youtu\.be\/)([^&?/\s]{11})/;

  const detectedUrlType = (() => {
    const v = ytUrl.trim().split(/\s+/)[0];
    if (!v) return 'none';
    if (CDN_PATTERN.test(v) || AUDIO_URL_PATTERN.test(v)) return 'cdn';
    if (YT_PATTERN.test(v) || v.length === 11) return 'youtube';
    return 'unknown';
  })();

  // ── Audio handlers ──

  const handleAudioFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error(t('setup.invalidAudioType'));
      if (audioInputRef.current) audioInputRef.current.value = '';
      return;
    }
    if (playerRef.current?.loadLocalAudio) playerRef.current.loadLocalAudio(file);
    setAudioName(file.name);
    setAudioReady(true);
    setAudioSource('local');
    setSelectedUpload(null);
  };

  const handleLoadUrl = async () => {
    const trimmed = ytUrl.trim().split(/\s+/)[0];
    if (!trimmed) return;

    if (detectedUrlType === 'cdn') {
      const pathOnly = trimmed.split('?')[0].split('#')[0];
      const lastSegment = pathOnly.split('/').pop() || 'audio';
      const dotIdx = lastSegment.lastIndexOf('.');
      const rawName = dotIdx > 0 ? lastSegment.slice(0, dotIdx) : lastSegment;
      const ext = dotIdx > 0 ? lastSegment.slice(dotIdx + 1).toLowerCase() : 'mp4';
      const title = rawName.length > 30 ? 'Cloud Audio' : rawName;
      if (playerRef.current?.loadFromUrl) playerRef.current.loadFromUrl(trimmed, title);
      setAudioName(title);
      setAudioReady(true);
      setAudioSource('cloud');
      setSelectedUpload(null);
      saveUploadRecord({ source: 'cloudinary', cloudinaryUrl: trimmed, fileName: `${rawName}.${ext}`, title });
      return;
    }

    const videoId = trimmed.match(YT_PATTERN)?.[1] || (trimmed.length === 11 ? trimmed : null);
    if (!videoId) { toast.error(t('player.invalidUrl')); return; }

    setYtLoading(true);
    if (playerRef.current?.loadYouTube) playerRef.current.loadYouTube(trimmed);
    setAudioName(t('setup.youtubeVideo'));
    setAudioReady(true);
    setAudioSource('youtube');
    setSelectedUpload(null);
    setYtLoading(false);
    setYtUrl('');
  };

  useEffect(() => {
    if (autoLoadPendingRef.current && ytUrl) {
      autoLoadPendingRef.current = false;
      handleLoadUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytUrl]);

  const handleSelectUpload = (upload) => {
    setSelectedUpload(upload);
    setAudioName(upload.title || upload.fileName || upload.youtubeUrl || 'Media');
    setAudioReady(true);
    setAudioSource(upload.source === 'youtube' ? 'youtube' : upload.source === 'spotify' ? 'spotify' : 'cloud');

    if (upload.source === 'youtube' && upload.youtubeUrl) {
      setYtUrl(upload.youtubeUrl);
      playerRef.current?.loadYouTube?.(upload.youtubeUrl);
    } else if (upload.source === 'cloudinary' && upload.cloudinaryUrl) {
      playerRef.current?.loadFromUrl?.(upload.cloudinaryUrl, upload.title || upload.fileName);
    } else if (upload.source === 'spotify' && (upload.spotifyTrackId || upload.trackId)) {
      const sId = upload.spotifyTrackId || (upload.trackId?.length !== 24 ? upload.trackId : null);
      if (sId) playerRef.current?.loadSpotify?.(sId, upload.title || upload.fileName || 'Spotify Track', false);
    }
  };

  const handleDeleteUpload = async (e, uploadId) => {
    e.stopPropagation();
    try {
      await uploadsApi.deleteMedia(uploadId);
      setMediaUploads((prev) => prev.filter((u) => u.id !== uploadId));
      if (selectedUpload?.id === uploadId) { setSelectedUpload(null); setAudioReady(false); setAudioName(''); }
    } catch { toast.error(t('setup.deleteFailed')); }
  };

  const handleYtKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleLoadUrl(); } };

  const handleSpotifyBrowserSelect = useCallback(async (track) => {
    if (playerRef.current?.loadSpotify) playerRef.current.loadSpotify(track.trackId, track.title || track.name || '', false);
    else if (playerRef.current?.playTrack) playerRef.current.playTrack(track.trackId, track.title || track.name || '', false);
    setAudioName(track.title || track.name || 'Spotify track');
    setAudioReady(true);
    setAudioSource('spotify');
    setSelectedUpload(null);
    if (getAccessToken()) {
      try {
        await spotifyApi.createUpload(`spotify:track:${track.trackId}`);
        const uploads = await uploadsApi.listMedia();
        setMediaUploads(uploads || []);
      } catch { /* ignore */ }
    }
  }, [playerRef]);

  // ── Lyrics handlers ──

  const handleLyricsFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['lrc', 'srt', 'txt'].includes(ext)) { toast.error(t('import.unsupportedFormat')); return; }
    if (file.size > MAX_IMPORT_FILE_SIZE) { toast.error(t('import.tooLarge')); return; }
    try {
      const text = await file.text();
      const { lines } = await lyricsApi.parse(text, file.name);
      if (lines.length === 0) { toast.error(t('import.noLines')); return; }
      setParsedLines(lines);
      setLyricsFileName(file.name);
      setEditorMode(ext === 'srt' ? 'srt' : 'lrc');
      setLyricsText('');
    } catch { toast.error(t('import.failed')); }
  };

  // ── Metadata handlers ──

  const addTag = (text) => {
    const trimmed = text.trim();
    if (trimmed && !projectTags.includes(trimmed)) setProjectTags((prev) => [...prev, trimmed]);
  };
  const removeTag = (index) => setProjectTags((prev) => prev.filter((_, i) => i !== index));

  const handleTagInputChange = (e) => {
    const value = e.target.value;
    if (value.includes(',') || value.includes(' ')) {
      const parts = value.split(/[, ]+/);
      parts.slice(0, -1).forEach((p) => addTag(p));
      setTagInput(parts[parts.length - 1]);
    } else { setTagInput(value); }
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { addTag(tagInput); setTagInput(''); } }
    else if (e.key === 'Backspace' && !tagInput && projectTags.length > 0) removeTag(projectTags.length - 1);
  };

  const handleProceed = () => {
    let finalLines = parsedLines;
    if (!finalLines) {
      finalLines = lyricsText.split('\n').map((text) => ({
        text: text.trimEnd(), timestamp: null, endTime: null, secondary: '', translation: '', id: crypto.randomUUID(),
      }));
    }
    const finalTags = tagInput.trim() ? [...projectTags, tagInput.trim()] : projectTags;
    onComplete({ lines: finalLines, editorMode, audioSource, ytUrl, audioName: (audioName && !audioName.includes('://')) ? audioName : null, selectedUpload, name: projectName.trim(), description: projectDescription.trim(), tags: finalTags, isPublic });
  };

  // ── Audio source badge ──
  const audioBadge = audioSource && (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
      audioSource === 'spotify' ? 'bg-green-500/15 text-green-400'
      : audioSource === 'youtube' ? 'bg-red-500/15 text-red-400'
      : 'bg-zinc-700/50 text-zinc-300'
    }`}>
      {audioSource === 'spotify' && <SpotifyIcon className="w-3 h-3" />}
      {audioSource === 'youtube' && <Video className="w-3 h-3" />}
      {audioSource === 'local' && <FolderOpen className="w-3 h-3" />}
      {audioSource === 'cloud' && <Cloud className="w-3 h-3" />}
      {audioSource === 'spotify' ? 'Spotify' : audioSource === 'youtube' ? 'YouTube' : audioSource === 'local' ? t('setup.local') : t('setup.cloud')}
    </span>
  );

  return (
    <>
    <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 pt-3 pb-12 animate-fade-in w-full h-full min-h-0 overflow-hidden gap-4">

      {/* ── STEP 1: Media + Lyrics ── */}
      {step === 1 && (
        <>
          {/* Page title */}
          <div className="flex-shrink-0 animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {t('app.name')} — {t('setup.stepSetup', 'Setup')}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mt-0.5">
              {t('setup.setupPageTitle', 'Media & Lyrics')}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('setup.setupPageSubtitle', 'Choose an audio source and add your lyrics to get started.')}
            </p>
          </div>

          {/* Two-column panels */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">

            {/* ── Left: Audio panel ── */}
            <div className="glass rounded-2xl flex flex-col gap-3 overflow-hidden min-h-0 p-4 sm:p-5">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-semibold text-zinc-200">{t('setup.uploadAudio')}</span>
                </div>
                {audioReady && audioBadge}
              </div>

              {audioReady ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 min-h-[140px]">
                  <div className="w-11 h-11 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/5">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-semibold text-zinc-200">{t('setup.audioReady')}</p>
                    <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{audioName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => { setAudioReady(false); setAudioName(''); setYtUrl(''); setSelectedUpload(null); setAudioSource(null); }}
                    className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                  >
                    {t('setup.changeAudio')}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                  {/* Source tabs */}
                  <div className="flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 shrink-0">
                    {[
                      { id: 'youtube', label: t('setup.tabYoutube', 'YouTube') },
                      { id: 'spotify', label: t('setup.tabSpotify', 'Spotify') },
                      { id: 'local',   label: t('setup.tabLocal', 'File / URL') },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setAudioTab(tab.id)}
                        className={`flex-1 h-7 rounded-lg text-[11px] font-semibold transition-all ${
                          audioTab === tab.id
                            ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

                    {audioTab === 'youtube' && (
                      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/50">
                        <YoutubeSearchPanel
                          onSelect={({ url }) => {
                            setYtUrl(url);
                            autoLoadPendingRef.current = true;
                          }}
                        />
                      </div>
                    )}

                    {audioTab === 'spotify' && (
                      <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/50">
                        {!user ? (
                          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                              <SpotifyIcon className="w-6 h-6 text-zinc-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-300">{t('setup.searchSpotify')}</p>
                            <p className="text-xs text-zinc-500">{t('setup.spotifyRequiresAccount')}</p>
                            <Button
                              onClick={() => navigate('/auth?action=signup')}
                              className="h-9 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold rounded-xl"
                              variant="ghost"
                            >
                              {t('auth.signUp')}
                            </Button>
                          </div>
                        ) : user?.spotify?.spotifyId ? (
                          <div className="h-full overflow-y-auto scrollbar-thin">
                            <SpotifyBrowser onSelectTrack={handleSpotifyBrowserSelect} />
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <SpotifyIcon className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-zinc-200">{t('settings.spotify.connectAccount', 'Connect Spotify Account')}</p>
                            <p className="text-xs text-zinc-500">{t('settings.spotify.connectToAccess', 'Connect to access your library')}</p>
                            <Button
                              onClick={handleSpotifyLogin}
                              className="h-9 px-4 bg-primary hover:bg-primary-dim text-zinc-950 text-xs font-bold rounded-xl"
                            >
                              {t('settings.spotify.connectAccount', 'Connect Spotify')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {audioTab === 'local' && (
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-0.5">
                        {/* URL + file input */}
                        <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/60 focus-within:border-primary/40 transition-all shrink-0">
                          <button
                            onClick={() => audioInputRef.current?.click()}
                            title={t('setup.uploadAudio')}
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-primary hover:bg-zinc-700/50 transition-all shrink-0 border border-zinc-700/40 cursor-pointer"
                          >
                            <FolderOpen className="w-5 h-5" />
                            <input ref={audioInputRef} id="setup-audio-input" type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
                          </button>
                          <div className="relative flex-1 flex items-center">
                            <FloatingInput
                              type="text"
                              label={t('setup.urlPlaceholder')}
                              hasIcon={true}
                              value={ytUrl}
                              onChange={(e) => setYtUrl(e.target.value)}
                              onKeyDown={handleYtKeyDown}
                              className="pl-12 bg-transparent border-none text-sm h-11 focus-visible:ring-0"
                            />
                            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                          </div>
                          <Button
                            onClick={handleLoadUrl}
                            disabled={!ytUrl.trim() || ytLoading}
                            className={`h-11 px-4 text-zinc-950 font-bold text-xs rounded-xl shrink-0 ${detectedUrlType === 'cdn' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary-dim'}`}
                          >
                            {ytLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('player.load')}
                          </Button>
                        </div>

                        {!user && (
                          <p className="text-[11px] text-zinc-500 px-1 flex items-center gap-1.5 shrink-0">
                            <Lock className="w-3 h-3 text-zinc-600 shrink-0" />
                            {t('setup.guestUploadNote')}{' '}
                            <button onClick={() => navigate('/auth?action=signup')} className="text-primary hover:text-primary/80 underline underline-offset-2 font-medium">
                              {t('auth.signUp')}
                            </button>{' '}
                            {t('setup.guestUploadNoteKeep')}
                          </p>
                        )}

                        {/* Media library */}
                        {(mediaLoading || mediaUploads.length > 0) && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('setup.yourMedia')}</span>
                              {!mediaLoading && mediaUploads.length > 4 && onShowAllUploads && (
                                <button onClick={onShowAllUploads} className="text-[10px] font-medium text-primary hover:text-primary/80 uppercase tracking-wider">
                                  {t('setup.viewAll')}
                                </button>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {mediaLoading ? (
                                <><SkeletonMediaItem /><SkeletonMediaItem /></>
                              ) : mediaUploads.slice(0, 4).map((upload) => (
                                <div
                                  key={upload.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleSelectUpload(upload)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectUpload(upload); } }}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-zinc-700/40 hover:border-primary/40 hover:bg-zinc-800/60 transition-all group cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0">
                                    {upload.source === 'youtube' ? <Video className="w-3.5 h-3.5 text-red-400" />
                                      : upload.source === 'spotify' ? <SpotifyIcon className="w-3.5 h-3.5 text-green-400" />
                                      : <Cloud className="w-3.5 h-3.5 text-zinc-400" />}
                                  </div>
                                  <p className="flex-1 text-xs font-medium text-zinc-300 group-hover:text-zinc-100 truncate">
                                    {upload.title || upload.fileName || upload.youtubeUrl || 'Untitled'}
                                  </p>
                                  <button
                                    onClick={(e) => handleDeleteUpload(e, upload.id)}
                                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Lyrics panel ── */}
            <div className="glass rounded-2xl flex flex-col gap-3 overflow-hidden min-h-0 p-4 sm:p-5">
              <div className="flex items-center gap-2 shrink-0">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-zinc-200">{t('setup.pasteLyrics')}</span>
              </div>

              {parsedLines ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 min-h-[140px]">
                  <div className="w-11 h-11 rounded-full bg-green-500/15 flex items-center justify-center ring-4 ring-green-500/5">
                    <Check className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-semibold text-zinc-200">{t('setup.lyricsReady')}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{t('setup.linesCount', { count: parsedLines.length })}</p>
                    {lyricsFileName && <p className="text-xs text-zinc-400 truncate max-w-xs mt-0.5">{lyricsFileName}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => { setParsedLines(null); setLyricsFileName(''); setLyricsText(''); }}
                    className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-lg"
                  >
                    {t('setup.changeLyrics')}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-3 min-h-0">
                  <Textarea
                    value={lyricsText}
                    onChange={(e) => setLyricsText(e.target.value)}
                    placeholder={t('setup.pasteLyricsDesc')}
                    className="flex-1 min-h-0 bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-500 resize-none text-sm p-3 leading-relaxed focus:border-primary/50 overflow-y-auto scrollbar-thin rounded-xl"
                  />
                  <label
                    htmlFor="setup-lyrics-input"
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer group transition-colors rounded-xl bg-zinc-800/40 border border-zinc-700/40 hover:border-primary/30 hover:bg-zinc-800/80 shrink-0"
                  >
                    <Upload className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('setup.importFile')}</span>
                    <span className="text-[10px] text-zinc-500 ml-1 hidden sm:inline">.lrc, .srt, .txt</span>
                    <input ref={lyricsInputRef} id="setup-lyrics-input" type="file" accept=".lrc,.srt,.txt" onChange={handleLyricsFile} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Continue button */}
          <div className="flex items-center justify-between shrink-0 pt-1">
            <p className={`text-xs transition-colors ${canContinue ? 'text-zinc-500' : 'text-zinc-600'}`}>
              {!audioReady && !hasLyrics
                ? t('setup.setupPageSubtitle', 'Choose an audio source and add your lyrics to get started.')
                : !audioReady ? t('setup.uploadAudio')
                : !hasLyrics ? t('setup.pasteLyrics')
                : ''}
            </p>
            <Button
              onClick={() => setStep(2)}
              disabled={!canContinue}
              className="h-11 px-7 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 shadow-lg shadow-primary/10 transition-all text-sm disabled:opacity-40"
            >
              {t('setup.continue', 'Continue')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* ── STEP 2: Metadata ── */}
      {step === 2 && (
        <>
          {/* Page title */}
          <div className="flex-shrink-0 animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {t('app.name')} — {t('setup.stepDetails', 'Details')}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 mt-0.5">
              {t('setup.detailsPageTitle', 'Project Details')}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {t('setup.detailsPageSubtitle', 'Name and configure your project.')}
            </p>
          </div>

          <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden animate-fade-in border border-zinc-800/50 shadow-elevated min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project-name" className="text-sm font-bold text-zinc-300">
                    {t('setup.projectName')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder={t('setup.projectNamePlaceholder')}
                    autoFocus
                    maxLength={200}
                    className="bg-zinc-900/80 border-zinc-700/60 h-10 text-sm px-4 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project-desc" className="text-sm font-bold text-zinc-300">
                    {t('setup.projectDescription')}
                  </Label>
                  <Textarea
                    id="project-desc"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder={t('setup.projectDescriptionPlaceholder')}
                    maxLength={1000}
                    className="min-h-[100px] bg-zinc-900/80 border-zinc-700/60 resize-none text-sm p-3 focus-visible:ring-primary/40 focus-visible:border-primary/50"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project-tags" className="text-sm font-bold text-zinc-300">
                    {t('setup.projectTags')}
                  </Label>
                  <div
                    className="flex flex-wrap items-center gap-2 min-h-[48px] px-2 py-1.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl cursor-text focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all"
                    onClick={() => tagInputRef.current?.focus()}
                  >
                    {projectTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1 text-xs bg-zinc-800 text-zinc-200 border-zinc-700 animate-fade-in rounded-lg">
                        {tag}
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-zinc-100">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      ref={tagInputRef}
                      id="project-tags"
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagKeyDown}
                      placeholder={projectTags.length === 0 ? t('setup.projectTagsPlaceholder') : ''}
                      maxLength={100}
                      className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:ring-0 p-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 lg:px-6 bg-zinc-900/40 border-t border-zinc-800/60 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <Switch id="project-privacy" checked={isPublic} onCheckedChange={setIsPublic} disabled={!user} className="data-[state=checked]:bg-primary shrink-0" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Label htmlFor="project-privacy" className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer leading-none">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    {t('setup.publicProject')}
                  </Label>
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    {!user
                      ? <span className="flex items-center gap-1"><LockKeyhole className="w-3 h-3 shrink-0" />{t('setup.privacyRequiresAuth')}</span>
                      : t('setup.publicProjectDesc')
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleProceed}
                disabled={!projectName.trim()}
                className="h-11 px-8 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all shrink-0 text-sm"
              >
                {t('setup.startToSync')}
                <Sparkles className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

    </div>

    {/* Tips bar */}
    {hasTips && (
      <div className="fixed bottom-4 inset-x-0 flex items-center justify-center pointer-events-none z-40 animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800/60 rounded-full backdrop-blur-md shadow-lg max-w-sm sm:max-w-md">
          <Lightbulb className="w-3 h-3 text-amber-400/80 shrink-0" />
          <p className="text-[11px] font-medium text-zinc-400 truncate">{tips[tipIndex]}</p>
        </div>
      </div>
    )}
    </>
  );
}
