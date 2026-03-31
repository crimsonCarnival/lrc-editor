import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput, ModifierInput } from '../shared';
import { useShortcutsSettings } from '../hooks/useShortcutsSettings';
import { MapPin, ChevronLeft, ChevronRight, Plus, Trash2, X, RefreshCw, LogOut, HelpCircle, MousePointer, MousePointerClick, Keyboard } from 'lucide-react';

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }) {
  const { t } = useTranslation();
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);

  return (
    <>
      <Section title={t('settingsShortcuts') || 'Shortcuts'} icon={Keyboard} searchTerm={searchTerm}>
        <SettingRow
          icon={MapPin}
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
          icon={ChevronLeft}
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
          icon={ChevronRight}
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
          icon={Plus}
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
          icon={Trash2}
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
          icon={X}
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
          icon={RefreshCw}
          label={t('settingsShortcutSwitchModeLabel') || 'Switch Mode'}
          description={t('settingsShortcutSwitchModeDesc') || 'Toggle LRC/SRT editor mode'}
        >
          <ShortcutInput
            value={settings.shortcuts?.switchMode?.[0] || 'Ctrl+M'}
            onChange={handleShortcutChange('switchMode')}
            onValidate={(v) => validateShortcut(v, 'switchMode')}
          />
        </SettingRow>
        <SettingRow
          icon={LogOut}
          label={t('settingsShortcutDeselectLabel') || 'Deselect / Close'}
          description={t('settingsShortcutDeselectDesc') || 'Clear selection or close dialogs'}
        >
          <ShortcutInput
            value={settings.shortcuts?.deselect?.[0] || 'Escape'}
            onChange={handleShortcutChange('deselect')}
            onValidate={(v) => validateShortcut(v, 'deselect')}
          />
        </SettingRow>
        <SettingRow
          icon={HelpCircle}
          label={t('settingsShortcutShowHelpLabel') || 'Show Shortcuts'}
          description={t('settingsShortcutShowHelpDesc') || 'Open the keyboard shortcuts dialog'}
        >
          <ShortcutInput
            value={settings.shortcuts?.showHelp?.[0] || '?'}
            onChange={handleShortcutChange('showHelp')}
            onValidate={(v) => validateShortcut(v, 'showHelp')}
          />
        </SettingRow>
      </Section>

      <Section title={t('settingsShortcutClickModifiersSection') || 'Click Modifiers'} icon={MousePointerClick} searchTerm={searchTerm}>
        <SettingRow
          icon={MousePointer}
          label={t('settingsShortcutRangeSelectLabel') || 'Select a range'}
          description={t('settingsShortcutRangeSelectDesc') || 'Hold + Click to select a continuous block of lines'}
        >
          <ModifierInput
            value={settings.shortcuts?.rangeSelect?.[0] || 'Shift'}
            onChange={handleShortcutChange('rangeSelect')}
            validateModifier={(v) => v !== (settings.shortcuts?.toggleSelect?.[0] || 'Ctrl')}
          />
        </SettingRow>
        <SettingRow
          icon={MousePointerClick}
          label={t('settingsShortcutToggleSelectLabel') || 'Pick individual lines'}
          description={t('settingsShortcutToggleSelectDesc') || 'Hold + Click to add/remove single lines from the selection'}
        >
          <ModifierInput
            value={settings.shortcuts?.toggleSelect?.[0] || 'Ctrl'}
            onChange={handleShortcutChange('toggleSelect')}
            validateModifier={(v) => v !== (settings.shortcuts?.rangeSelect?.[0] || 'Shift')}
          />
        </SettingRow>
      </Section>
    </>
  );
}
