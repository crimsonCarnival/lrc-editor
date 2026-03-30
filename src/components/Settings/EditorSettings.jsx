import { useTranslation } from 'react-i18next';
import NumberInput from '../NumberInput';
import { Section, SettingRow, Toggle } from './shared';
import { useEditorSettings } from './useEditorSettings';

export default function EditorSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleAutoPauseChange,
    handleNudgeChange,
    handleAutoAdvanceChange,
    handleSkipBlankChange,
    handleShowShiftAllChange,
    handleTimestampPrecisionChange,
  } = useEditorSettings(updateSetting);

  return (
    <Section title={t('settingsEditor')} searchTerm={searchTerm}>
      <SettingRow
        label={t('settingsAutoPauseOnMark')}
        description={t('settingsAutoPauseOnMarkDesc')}
      >
        <Toggle
          id="toggle-auto-pause-on-mark"
          checked={settings.editor?.autoPauseOnMark ?? false}
          onChange={handleAutoPauseChange}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsNudgeIncrement')}
        description={t('settingsNudgeIncrementDesc')}
      >
        <NumberInput
          min={0.01}
          max={5}
          step={0.01}
          value={settings.editor?.nudge?.default ?? 0.1}
          onChange={handleNudgeChange}
          className="w-20"
        />
      </SettingRow>
      <SettingRow label={t('settingsAutoAdvance')} description={t('settingsAutoAdvanceDesc')}>
        <Toggle
          id="toggle-auto-advance"
          checked={settings.editor?.autoAdvance?.enabled ?? true}
          onChange={handleAutoAdvanceChange}
        />
      </SettingRow>
      <SettingRow label={t('settingsSkipBlank')} description={t('settingsSkipBlankDesc')}>
        <Toggle
          id="toggle-skip-blank"
          checked={settings.editor?.autoAdvance?.skipBlank ?? false}
          onChange={handleSkipBlankChange}
        />
      </SettingRow>
      <SettingRow label={t('settingsShowShiftAll')} description={t('settingsShowShiftAllDesc')}>
        <Toggle
          id="toggle-shift-all"
          checked={settings.editor?.showShiftAll ?? true}
          onChange={handleShowShiftAllChange}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsEditorTimestampPrecision')}
        description={t('settingsEditorTimestampPrecisionDesc')}
      >
        <select
          value={settings.editor?.timestampPrecision ?? 'hundredths'}
          onChange={handleTimestampPrecisionChange}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
        >
          <option value="hundredths">mm:ss.xx</option>
          <option value="thousandths">mm:ss.xxx</option>
        </select>
      </SettingRow>
    </Section>
  );
}
