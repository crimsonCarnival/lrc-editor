import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../../../contexts/useAuthContext';
import { uploads as uploadsApi, auth as authApi } from '../../../api';
import { Button } from '@/components/ui/button';
import { User, Upload, Trash2, Loader2, Unplug } from 'lucide-react';
import SpotifyIcon from '../../shared/SpotifyIcon';
import toast from 'react-hot-toast';

export default function ProfileSettings({ searchTerm }) {
  const { t } = useTranslation();
  const { user, setUser, connectSpotify, disconnectSpotify } = useAuthContext();
  const [uploading, setUploading] = useState(false);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const fileInputRef = useRef(null);

  // When searching, hide profile section as it doesn't have searchable settings
  if (searchTerm) {
    return null;
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.profile.invalidImageType'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.profile.imageTooLarge'));
      return;
    }

    setUploading(true);

    try {
      // Upload to Cloudinary
      const { secure_url, public_id } = await uploadsApi.uploadImage(
        file,
        () => uploadsApi.getAvatarSignature()
      );

      // Update user profile
      const { user: updatedUser } = await authApi.updateProfile({
        avatarUrl: secure_url,
        avatarPublicId: public_id,
      });

      setUser(updatedUser);
      toast.success(t('settings.profile.avatarUpdated'));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast.error(t('settings.profile.avatarUploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl) return;

    setUploading(true);

    try {
      const { user: updatedUser } = await authApi.updateProfile({
        avatarUrl: null,
        avatarPublicId: null,
      });

      setUser(updatedUser);
      toast.success(t('settings.profile.avatarRemoved'));
    } catch (err) {
      console.error('Avatar removal failed:', err);
      toast.error(t('settings.profile.avatarRemoveFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {t('settings.profile.label')}
        </h3>

        {/* Avatar section */}
        <div className="flex items-start gap-4">
          <div className="relative group">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={t('settings.profile.avatar')}
                className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                <User className="w-10 h-10 text-zinc-600" />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                {user?.avatarUrl ? t('settings.profile.changeAvatar') : t('settings.profile.uploadAvatar')}
              </Button>
              {user?.avatarUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                  className="gap-2 text-red-400 hover:text-red-300 border-red-900/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('settings.profile.removeAvatar')}
                </Button>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {t('settings.profile.avatarHint')}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* User info */}
        <div className="mt-6 space-y-2">
          {user?.username && (
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-xs text-zinc-500">{t('settings.profile.username')}</span>
              <span className="text-xs text-zinc-300 font-medium">{user.username}</span>
            </div>
          )}
          {user?.email && (
            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
              <span className="text-xs text-zinc-500">{t('settings.profile.email')}</span>
              <span className="text-xs text-zinc-300 font-medium">{user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Spotify connection */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {t('settings.spotify.label')}
        </h3>
        <p className="text-xs text-zinc-500 mb-3">{t('settings.spotify.connectDesc')}</p>

        {user?.spotify?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-950/20 border border-green-900/30">
              {user.spotify.profilePictureUrl ? (
                <img 
                  src={user.spotify.profilePictureUrl} 
                  alt="Spotify profile" 
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <div className={user.spotify.profilePictureUrl ? 'hidden' : 'flex'} style={{ width: '2.5rem', height: '2.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <SpotifyIcon className="w-5 h-5 text-green-400 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-300">{t('settings.spotify.connected')}</p>
                {user.spotify.spotifyId && (
                  <p className="text-xs text-zinc-500 truncate">{user.spotify.spotifyId}</p>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${user.spotify.isPremium ? 'bg-green-600/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                {user.spotify.isPremium ? t('settings.spotify.premium') : t('settings.spotify.free')}
              </span>
            </div>
            {!user.spotify.isPremium && (
              <p className="text-xs text-amber-400/80">{t('settings.spotify.premiumRequired')}</p>
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
              className="gap-2 text-red-400 hover:text-red-300 border-red-900/20"
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
                toast.success(t('settings.spotify.connected'));
              } catch (err) {
                if (err.message !== 'State mismatch') {
                  toast.error(t('settings.spotify.connectFailed'));
                }
              } finally {
                setSpotifyLoading(false);
              }
            }}
            className="gap-2 bg-green-600 hover:bg-green-500 text-white"
          >
            {spotifyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SpotifyIcon className="w-3.5 h-3.5" />}
            {t('settings.spotify.connect')}
          </Button>
        )}
      </div>
    </div>
  );
}
