import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';

const VolumeControl = React.memo(function VolumeControl() {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();

  return (
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
  );
});

export default VolumeControl;
