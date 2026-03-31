import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Section, SettingRow, ShortcutInput, ModifierInput } from '../shared';
import { useShortcutsSettings } from '../hooks/useShortcutsSettings';
import { Button } from '@/components/ui/button';
import {
  MapPin, ChevronLeft, ChevronRight, Plus, Trash2, X, RefreshCw, LogOut, HelpCircle,
  MousePointer, MousePointerClick, Keyboard,
  Headphones, Play, SkipBack, SkipForward, VolumeX, ChevronsUp, ChevronsDown,
  Eye, Music2, Languages,
} from 'lucide-react';

export default function ShortcutsSettings({ settings, updateSetting, searchTerm, validateShortcut }) {
  const { t } = useTranslation();
  const { handleShortcutChange } = useShortcutsSettings(updateSetting);
  const [subTab, setSubTab] = useState('editor');

  const SUB_TABS = [
    { id: 'editor',    icon: Keyboard,          label: t('settingsShortcuts') || 'Editor' },
    { id: 'player',    icon: Headphones,         label: t('settingsPlayerShortcutsSection') || 'Player' },
    { id: 'preview',   icon: Eye,               label: t('settingsPreviewShortcutsSection') || 'Preview' },
    { id: 'modifiers', icon: MousePointerClick,  label: t('settingsShortcutClickModifiersSection') || 'Modifiers' },
  ];

  // When searching, show all; otherwise show only the active sub-tab
  const show = (id) => !!searchTerm || subTab === id;

  return (
    <>
      {/* Sub-tab bar — hidden during search */}
      {!searchTerm && (
        <div className="flex gap-0.5 mb-4 bg-zinc-800/40 rounded-xl p-1">
          {SUB_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 h-auto text-[10px] font-medium rounded-lg transition-colors ${
                subTab === tab.id
                  ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      )}

      {show('editor') && (
        <Section title={t('settingsShortcuts') || 'Editor'} icon={Keyboard} searchTerm={searchTerm}>
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
      )}

      {show('player') && (
        <Section title={t('settingsPlayerShortcutsSection') || 'Player'} icon={Headphones} searchTerm={searchTerm}>
          <SettingRow
            icon={Play}
            label={t('settingsShortcutPlayPauseLabel') || 'Play / Pause'}
            description={t('settingsShortcutPlayPauseDesc') || 'Toggle playback'}
          >
            <ShortcutInput
              value={settings.shortcuts?.playPause?.[0] || 'Enter'}
              onChange={handleShortcutChange('playPause')}
              onValidate={(v) => validateShortcut(v, 'playPause')}
            />
          </SettingRow>
          <SettingRow
            icon={SkipBack}
            label={t('settingsShortcutSeekBackwardLabel') || 'Seek Backward'}
            description={t('settingsShortcutSeekBackwardDesc', { val: settings.playback?.seekTime ?? 5 }) || `Seek back ${settings.playback?.seekTime ?? 5}s`}
          >
            <ShortcutInput
              value={settings.shortcuts?.seekBackward?.[0] || 'Alt+ArrowLeft'}
              onChange={handleShortcutChange('seekBackward')}
              onValidate={(v) => validateShortcut(v, 'seekBackward')}
            />
          </SettingRow>
          <SettingRow
            icon={SkipForward}
            label={t('settingsShortcutSeekForwardLabel') || 'Seek Forward'}
            description={t('settingsShortcutSeekForwardDesc', { val: settings.playback?.seekTime ?? 5 }) || `Seek forward ${settings.playback?.seekTime ?? 5}s`}
          >
            <ShortcutInput
              value={settings.shortcuts?.seekForward?.[0] || 'Alt+ArrowRight'}
              onChange={handleShortcutChange('seekForward')}
              onValidate={(v) => validateShortcut(v, 'seekForward')}
            />
          </SettingRow>
          <SettingRow
            icon={VolumeX}
            label={t('settingsShortcutMuteLabel') || 'Mute / Unmute'}
            description={t('settingsShortcutMuteDesc') || 'Toggle audio mute'}
          >
            <ShortcutInput
              value={settings.shortcuts?.mute?.[0] || 'm'}
              onChange={handleShortcutChange('mute')}
              onValidate={(v) => validateShortcut(v, 'mute')}
            />
          </SettingRow>
          <SettingRow
            icon={ChevronsUp}
            label={t('settingsShortcutSpeedUpLabel') || 'Speed Up'}
            description={t('settingsShortcutSpeedUpDesc') || 'Increase playback speed by nudge amount'}
          >
            <ShortcutInput
              value={settings.shortcuts?.speedUp?.[0] || '+'}
              onChange={handleShortcutChange('speedUp')}
              onValidate={(v) => validateShortcut(v, 'speedUp')}
            />
          </SettingRow>
          <SettingRow
            icon={ChevronsDown}
            label={t('settingsShortcutSpeedDownLabel') || 'Speed Down'}
            description={t('settingsShortcutSpeedDownDesc') || 'Decrease playback speed by nudge amount'}
          >
            <ShortcutInput
              value={settings.shortcuts?.speedDown?.[0] || '-'}
              onChange={handleShortcutChange('speedDown')}
              onValidate={(v) => validateShortcut(v, 'speedDown')}
            />
          </SettingRow>
        </Section>
      )}

      {show('preview') && (
        <Section title={t('settingsPreviewShortcutsSection') || 'Preview'} icon={Eye} searchTerm={searchTerm}>
          <SettingRow
            icon={Eye}
            label={t('settingsShortcutToggleTranslationLabel') || 'Toggle Translations'}
            description={t('settingsShortcutToggleTranslationDesc') || 'Show or hide translations in preview'}
          >
            <ShortcutInput
              value={settings.shortcuts?.toggleTranslation?.[0] || 't'}
              onChange={handleShortcutChange('toggleTranslation')}
              onValidate={(v) => validateShortcut(v, 'toggleTranslation')}
            />
          </SettingRow>
          <SettingRow
            icon={Music2}
            label={t('settingsShortcutAddSecondaryLabel') || 'Add Secondary Lyrics'}
            description={t('settingsShortcutAddSecondaryDesc') || 'Open secondary lyrics paste panel'}
          >
            <ShortcutInput
              value={settings.shortcuts?.addSecondary?.[0] || 'Shift+H'}
              onChange={handleShortcutChange('addSecondary')}
              onValidate={(v) => validateShortcut(v, 'addSecondary')}
            />
          </SettingRow>
          <SettingRow
            icon={Languages}
            label={t('settingsShortcutAddTranslationLabel') || 'Add Translations'}
            description={t('settingsShortcutAddTranslationDesc') || 'Open translation paste panel'}
          >
            <ShortcutInput
              value={settings.shortcuts?.addTranslation?.[0] || 'Shift+T'}
              onChange={handleShortcutChange('addTranslation')}
              onValidate={(v) => validateShortcut(v, 'addTranslation')}
            />
          </SettingRow>
        </Section>
      )}

      {show('modifiers') && (
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
      )}
    </>
  );
}
