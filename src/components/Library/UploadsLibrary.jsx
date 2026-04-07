import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { uploads as uploadsApi } from '../../api';
import { formatTime } from '../../utils/formatTime';
import { Button } from '@/components/ui/button';
import { Cloud, Video, Trash2, ArrowLeft, Loader2, Music2, Clock } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/skeleton';

function SourceIcon({ source }) {
  if (source === 'youtube') return <Video className="w-4 h-4 text-red-400" />;
  return <Cloud className="w-4 h-4 text-blue-400" />;
}

function SourceLabel({ source }) {
  if (source === 'youtube') return 'YouTube';
  if (source === 'cloudinary') return 'Cloud';
  if (source === 'spotify') return 'Spotify';
  return source;
}

export default function UploadsLibrary({ onSelect, onBack }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUploads = useCallback(async () => {
    try {
      const { uploads } = await uploadsApi.listMedia();
      setItems(uploads || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  const handleDelete = async (e, uploadId) => {
    e.stopPropagation();
    setDeletingId(uploadId);
    try {
      await uploadsApi.deleteMedia(uploadId);
      setItems((prev) => prev.filter((u) => u.id !== uploadId));
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
          {t('uploads.title')}
        </h2>
        <span className="text-xs text-zinc-500 ml-auto">
          {!loading && t('uploads.count', { count: items.length })}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 space-y-2 animate-fade-in">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center">
            <Music2 className="w-7 h-7 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">{t('uploads.empty')}</p>
          <p className="text-xs text-zinc-500">{t('uploads.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 settings-scroll">
          {items.map((upload) => (
            <div
              key={upload.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(upload)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(upload); } }}
              className="w-full group relative flex items-start gap-3 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-700/40 hover:border-zinc-600/60 transition-all duration-150 text-left cursor-pointer"
            >
              {/* Source icon */}
              <div className="w-9 h-9 rounded-lg bg-zinc-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <SourceIcon source={upload.source} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100 truncate">
                    {upload.title || upload.fileName || upload.youtubeUrl || t('uploads.untitled')}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-zinc-500 bg-zinc-700/50 px-1.5 py-0.5 rounded flex-shrink-0">
                    <SourceLabel source={upload.source} />
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  {upload.fileName && (
                    <span className="text-xs text-zinc-500 truncate max-w-[200px]">
                      {upload.fileName}
                    </span>
                  )}
                  {upload.duration > 0 && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(upload.duration)}
                    </span>
                  )}
                </div>

                {upload.createdAt && (
                  <span className="text-[10px] text-zinc-600 mt-1 block">
                    {new Date(upload.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Delete action */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => handleDelete(e, upload.id)}
                  disabled={deletingId === upload.id}
                  className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-7 h-7"
                >
                  {deletingId === upload.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
