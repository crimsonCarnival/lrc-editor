import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '@/contexts/useAuthContext';
import { Button } from '@ui/button';
import { Loader2, Unplug } from 'lucide-react';
import SpotifyIcon from "@shared/SpotifyIcon";
import toast from 'react-hot-toast';

export default function ConnectionsSettings({ searchTerm }) {
  const { t } = useTranslation();
  const { user, connectSpotify, disconnectSpotify } = useAuthContext();
  const [spotifyLoading, setSpotifyLoading] = useState(false);

  // When searching, hide if not matching
  if (searchTerm && !t('settings.connections.label').toLowerCase().includes(searchTerm.toLowerCase())) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {t('settings.spotify.label') || 'Spotify'}
        </h3>
        <p className="text-xs text-zinc-500 mb-4">{t('settings.spotify.connectDesc')}</p>

        {user?.spotify?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-950/20 border border-green-900/30">
              {user.spotify.profilePictureUrl ? (
                <img 
                  src={user.spotify.profilePictureUrl} 
                  alt="Spotify profile" 
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-green-900/40"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div className={user.spotify.profilePictureUrl ? 'hidden' : 'flex'} style={{ width: '2.5rem', height: '2.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <SpotifyIcon className="w-5 h-5 text-green-400 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-300">{t('settings.spotify.connected')}</p>
                {user.spotify.spotifyId && (
                  <p className="text-xs text-zinc-500 truncate">{user.spotify.spotifyId}</p>
                )}
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${user.spotify.isPremium ? 'bg-green-600/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                {user.spotify.isPremium ? t('settings.spotify.premium') : t('settings.spotify.free')}
              </span>
            </div>
            {!user.spotify.isPremium && (
              <p className="text-xs text-amber-400/80 px-2">{t('settings.spotify.premiumRequired')}</p>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={spotifyLoading}
              onClick={async () => {
                setSpotifyLoading(true);
                try {
                  await disconnectSpotify();
                  toast.success(t('settings.spotify.disconnected'));
                } catch {
                  toast.error(t('settings.spotify.connectFailed'));
                } finally {
                  setSpotifyLoading(false);
                }
              }}
              className="gap-2 text-red-400 hover:text-red-300 border-red-900/20 rounded-xl"
            >
              {spotifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
              {t('settings.spotify.disconnect')}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            disabled={spotifyLoading}
            onClick={async () => {
              setSpotifyLoading(true);
              try {
                await connectSpotify();
              } catch (err) {
                if (err.message !== 'State mismatch') {
                  toast.error(t('settings.spotify.connectFailed'));
                }
              } finally {
                setSpotifyLoading(false);
              }
            }}
            className="gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl h-10 px-6 font-bold shadow-lg shadow-green-900/20"
          >
            {spotifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SpotifyIcon className="w-3.5 h-3.5" />}
            {t('settings.spotify.connect')}
          </Button>
        )}
      </div>
    </div>
  );
}
