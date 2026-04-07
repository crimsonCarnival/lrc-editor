import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { Tip } from '@/components/ui/tip';

export function SharePanel({ url, ytUrl, linesCount, hasSynced, isPublic = true, onPrivacyChange }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Privacy state (public/private)
  const [privacy, setPrivacy] = useState(isPublic ? 'public' : 'private');

  const handlePrivacyToggle = () => {
    const newPrivacy = privacy === 'public' ? 'private' : 'public';
    setPrivacy(newPrivacy);
    if (onPrivacyChange) onPrivacyChange(newPrivacy);
  };

  useEffect(() => {
    setTimeout(() => { inputRef.current?.select(); }, 80);
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      inputRef.current?.select();
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Privacy/visibility toggle */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-zinc-400 font-medium">
          {t('share.privacy', 'Visibility:')}
        </span>
        <Button
          variant={privacy === 'public' ? 'outline' : 'secondary'}
          size="sm"
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${privacy === 'public' ? 'text-emerald-400 border-emerald-400/60 bg-emerald-400/10' : 'text-zinc-400 border-zinc-700 bg-zinc-800'}`}
          onClick={handlePrivacyToggle}
        >
          {privacy === 'public' ? (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-7 0-9 7.5-9 7.5s2 7.5 9 7.5 9-7.5 9-7.5-2-7.5-9-7.5z" /><circle cx="12" cy="12" r="3" /></svg>
              {t('share.public', 'Anyone with link')}
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 17a5 5 0 100-10 5 5 0 000 10zm0 0v2m0-2v-2" /></svg>
              {t('share.private', 'Only me')}
            </>
          )}
        </Button>
      </div>
      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
          ytUrl
            ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue'
            : 'border-zinc-700 bg-zinc-800 text-zinc-500'
        }`}>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          {ytUrl ? t('share.youtubeIncluded', 'YouTube included') : t('share.noYoutube', 'No YouTube loaded')}
        </span>

        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
          hasSynced
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-zinc-700 bg-zinc-800 text-zinc-500'
        }`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          {linesCount} {hasSynced ? t('share.syncedLines', 'synced lines') : t('share.lines', 'lines (unsynced)')}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-400 leading-relaxed">
        {privacy === 'public'
          ? t('share.description', 'Anyone with this link can open the app, watch the lyrics sync in real time, and listen to the YouTube video.')
          : t('share.privateDescription', 'Only you can access this project. Others will be denied.')}
      </p>

      {/* Warning: no YouTube */}
      {!ytUrl && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300 leading-relaxed">
            {t('share.noYoutubeWarning', 'Load a YouTube video before sharing so viewers can listen along.')}
          </p>
        </div>
      )}

      {/* URL + copy */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          onClick={() => inputRef.current?.select()}
          className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 cursor-text"
        />
        <Tip content={copied ? t('share.copied', 'Copied!') : t('share.copy', 'Copy link')}>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="icon"
            className={`flex-shrink-0 border transition-all duration-200 ${
              copied
                ? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/20 scale-110'
                : 'bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
            }`}
          >
          {copied
            ? <Check className="w-4 h-4" />
            : <Copy className="w-4 h-4" />
          }
          </Button>
        </Tip>
      </div>
    </div>
  );
}
