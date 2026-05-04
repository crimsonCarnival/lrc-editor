import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { SkeletonPlayer } from '@ui/skeleton';
import Player from '@features/player/Player';

/**
 * Docked player bar — desktop bottom, mobile above tab bar.
 * Hidden during setup phase but stays mounted to keep playerRef alive.
 */
export function AppPlayer({
  isReady,
  isProjectLoading,
  playerRef,
  mediaTitle,
  setMediaTitle,
  setIsPlaying,
  setPlaybackSpeed,
  handleTimeUpdate,
  handleDurationChange,
  handleMediaChange,
  handleYtUrlChange,
  handleCloudinaryUpload,
  restoredYtUrl,
  restoredCloudinaryUpload,
  restoredPosition,
  restoredSpeed,
  projectMetadata,
  lines,
  playbackPosition,
  syncMode,
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div
      className={`lg:relative lg:z-raised lg:w-full lg:mt-1 lg:border-t lg:border-zinc-700/50 lg:bg-zinc-900/80 lg:backdrop-blur-md lg:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] max-lg:fixed max-lg:inset-x-0 max-lg:bottom-14 max-lg:z-player ${
        !isReady ? 'hidden' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto max-lg:p-0 lg:px-6 lg:py-3">
        {isProjectLoading && isReady ? (
          <SkeletonPlayer />
        ) : (
          <Player
            ref={playerRef}
            mediaTitle={mediaTitle}
            onPlayingChange={setIsPlaying}
            onSpeedChange={setPlaybackSpeed}
            onTitleChange={(newTitle) => {
              const isSetupPhase = location.pathname === '/project/new';
              if (
                isSetupPhase ||
                !mediaTitle ||
                mediaTitle === t('library.untitled') ||
                mediaTitle === 'Untitled'
              ) {
                setMediaTitle(newTitle);
              }
            }}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onMediaChange={handleMediaChange}
            onYtUrlChange={handleYtUrlChange}
            onCloudinaryUpload={handleCloudinaryUpload}
            initialYtUrl={restoredYtUrl}
            initialCloudinaryUpload={restoredCloudinaryUpload}
            initialSeek={restoredPosition}
            initialSpeed={restoredSpeed}
            projectMetadata={projectMetadata}
            lines={lines}
            playbackPosition={playbackPosition}
            syncMode={syncMode}
          />
        )}
      </div>
    </div>
  );
}
