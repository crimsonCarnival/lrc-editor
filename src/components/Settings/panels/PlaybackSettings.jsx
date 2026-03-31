import { useTranslation } from 'react-i18next';
import NumberInput from '../../shared/NumberInput';
import { Section, SettingRow, Toggle } from '../shared';
import { usePlaybackSettings } from '../hooks/usePlaybackSettings';
import { Headphones, RotateCcw, ChevronsDown, ChevronsUp, ActivitySquare } from 'lucide-react';

export default function PlaybackSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleAutoRewindChange,
    handleMinSpeedChange,
    handleMaxSpeedChange,
    handleShowWaveformChange,
  } = usePlaybackSettings(settings, updateSetting);

  return (
    <Section title={t('settingsPlayback')} icon={Headphones} searchTerm={searchTerm}>
      <SettingRow icon={RotateCcw} label={t('settingsAutoRewind')} description={t('settingsAutoRewindDesc')}>
        <NumberInput
          min={0}
          max={10}
          step={1}
          value={settings.playback?.autoRewindOnPause?.seconds ?? 0}
          onChange={handleAutoRewindChange}
          className="w-20"
        />
      </SettingRow>
      <SettingRow icon={ChevronsDown} label={t('settingsMinSpeed')} description={t('settingsMinSpeedDesc')}>
        <NumberInput
          min={0.05}
          max={(settings.playback?.speedBounds?.max || 3) - 0.05}
          step={0.05}
          value={settings.playback?.speedBounds?.min ?? 0.25}
          onChange={handleMinSpeedChange}
          className="w-20"
        />
      </SettingRow>
      <SettingRow icon={ChevronsUp} label={t('settingsMaxSpeed')} description={t('settingsMaxSpeedDesc')}>
        <NumberInput
          min={(settings.playback?.speedBounds?.min || 0.25) + 0.05}
          max={10}
          step={0.05}
          value={settings.playback?.speedBounds?.max ?? 3}
          onChange={handleMaxSpeedChange}
          className="w-20"
        />
      </SettingRow>
      <SettingRow icon={ActivitySquare} label={t('settingsShowWaveform')} description={t('settingsShowWaveformDesc')}>
        <Toggle
          id="toggle-waveform"
          checked={settings.playback?.showWaveform ?? true}
          onChange={handleShowWaveformChange}
        />
      </SettingRow>
    </Section>
  );
}
