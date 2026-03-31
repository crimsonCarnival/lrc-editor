import { useTranslation } from 'react-i18next';
import NumberInput from '../../shared/NumberInput';
import { Section, SettingRow, Toggle } from '../shared';
import { useEditorSettings } from '../hooks/useEditorSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, PauseCircle, SlidersHorizontal, ChevronDown, SkipForward, MoveHorizontal, Hash, Clock } from 'lucide-react';

export default function EditorSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleAutoPauseChange,
    handleNudgeChange,
    handleAutoAdvanceChange,
    handleSkipBlankChange,
    handleShowShiftAllChange,
    handleShowLineNumbersChange,
    handleTimestampPrecisionChange,
  } = useEditorSettings(updateSetting);

  return (
    <Section title={t('settingsEditor')} icon={FileText} searchTerm={searchTerm}>
      <SettingRow
        icon={PauseCircle}
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
        icon={SlidersHorizontal}
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
      <SettingRow icon={ChevronDown} label={t('settingsAutoAdvance')} description={t('settingsAutoAdvanceDesc')}>
        <Toggle
          id="toggle-auto-advance"
          checked={settings.editor?.autoAdvance?.enabled ?? true}
          onChange={handleAutoAdvanceChange}
        />
      </SettingRow>
      <SettingRow icon={SkipForward} label={t('settingsSkipBlank')} description={t('settingsSkipBlankDesc')}>
        <Toggle
          id="toggle-skip-blank"
          checked={settings.editor?.autoAdvance?.skipBlank ?? false}
          onChange={handleSkipBlankChange}
        />
      </SettingRow>
      <SettingRow icon={MoveHorizontal} label={t('settingsShowShiftAll')} description={t('settingsShowShiftAllDesc')}>
        <Toggle
          id="toggle-shift-all"
          checked={settings.editor?.showShiftAll ?? true}
          onChange={handleShowShiftAllChange}
        />
      </SettingRow>
      <SettingRow icon={Hash} label={t('settingsShowLineNumbers') || 'Line numbers'} description={t('settingsShowLineNumbersDesc') || 'Show line numbers in the editor'}>
        <Toggle
          id="toggle-line-numbers"
          checked={settings.editor?.showLineNumbers ?? true}
          onChange={handleShowLineNumbersChange}
        />
      </SettingRow>
      <SettingRow
        icon={Clock}
        label={t('settingsEditorTimestampPrecision')}
        description={t('settingsEditorTimestampPrecisionDesc')}
      >
        <Select
          value={settings.editor?.timestampPrecision ?? 'hundredths'}
          onValueChange={(val) => handleTimestampPrecisionChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="hundredths">mm:ss.xx</SelectItem>
            <SelectItem value="thousandths">mm:ss.xxx</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </Section>
  );
}
