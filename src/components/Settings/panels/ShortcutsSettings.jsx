import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput } from '../shared';
import { useShortcutsSettings } from '../hooks/useShortcutsSettings';

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }) {
  const { t } = useTranslation();
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);

  return (
    <Section title={t('settingsShortcuts') || 'Shortcuts'} searchTerm={searchTerm}>
      <SettingRow
        label={t('settingsShortcutMarkLabel') || 'Mark Timestamp'}
        description={t('settingsShortcutMarkDesc') || 'Key to mark start/end times'}
      >
        <ShortcutInput
          value={settings.shortcuts?.mark?.[0] || 'Space'}
          onChange={handleShortcutChange('mark')}
          onValidate={(v) => validateShortcut(v, 'mark')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutNudgeLeftLabel') || 'Nudge Left'}
        description={
          t('settingsShortcutNudgeLeftDesc', { val: settings.editor?.nudge?.default || 0.1 }) ||
          `Subtract ${settings.editor?.nudge?.default || 0.1}s`
        }
      >
        <ShortcutInput
          value={settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft'}
          onChange={handleShortcutChange('nudgeLeft')}
          onValidate={(v) => validateShortcut(v, 'nudgeLeft')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutNudgeRightLabel') || 'Nudge Right'}
        description={
          t('settingsShortcutNudgeRightDesc', { val: settings.editor?.nudge?.default || 0.1 }) ||
          `Add ${settings.editor?.nudge?.default || 0.1}s`
        }
      >
        <ShortcutInput
          value={settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight'}
          onChange={handleShortcutChange('nudgeRight')}
          onValidate={(v) => validateShortcut(v, 'nudgeRight')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutAddLineLabel') || 'Add Line'}
        description={t('settingsShortcutAddLineDesc') || 'Add new line below active line'}
      >
        <ShortcutInput
          value={settings.shortcuts?.addLine?.[0] || 'Ctrl+Enter'}
          onChange={handleShortcutChange('addLine')}
          onValidate={(v) => validateShortcut(v, 'addLine')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutDeleteLineLabel') || 'Delete Line'}
        description={t('settingsShortcutDeleteLineDesc') || 'Delete active line (or selection)'}
      >
        <ShortcutInput
          value={settings.shortcuts?.deleteLine?.[0] || 'Delete'}
          onChange={handleShortcutChange('deleteLine')}
          onValidate={(v) => validateShortcut(v, 'deleteLine')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutClearTimestampLabel') || 'Clear Timestamp'}
        description={t('settingsShortcutClearTimestampDesc') || 'Clear timestamp on active line'}
      >
        <ShortcutInput
          value={settings.shortcuts?.clearTimestamp?.[0] || 'Backspace'}
          onChange={handleShortcutChange('clearTimestamp')}
          onValidate={(v) => validateShortcut(v, 'clearTimestamp')}
        />
      </SettingRow>
      <SettingRow
        label={t('settingsShortcutSwitchModeLabel') || 'Switch Mode'}
        description={t('settingsShortcutSwitchModeDesc') || 'Toggle LRC/SRT editor mode'}
      >
        <ShortcutInput
          value={settings.shortcuts?.switchMode?.[0] || 'Ctrl+M'}
          onChange={handleShortcutChange('switchMode')}
          onValidate={(v) => validateShortcut(v, 'switchMode')}
        />
      </SettingRow>
    </Section>
  );
}
