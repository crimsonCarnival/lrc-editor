import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

const VolumeControl = React.memo(function VolumeControl() {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 group/volume relative" role="group" aria-label={t('player.volume') || 'Volume'}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => updateSetting('playback.muted', !settings.playback.muted)}
        className="rounded-full bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 flex-shrink-0"
        aria-label={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}
        title={settings.playback.muted ? t('player.unmute') || 'Unmute' : t('player.mute') || 'Mute'}
      >
        {settings.playback.muted || settings.playback.volume === 0 ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </Button>
      <div className="overflow-hidden w-0 group-hover/volume:w-24 focus-within/volume:w-24 transition-all duration-300 flex items-center">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={settings.playback.volume}
          aria-label={t('player.volume') || 'Volume'}
          aria-valuenow={Math.round(settings.playback.volume * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
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
  );
});

export default VolumeControl;
