import { useEffect, useState } from 'react';
import useDraggable from '../utils/useDraggable';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import { DEFAULT_SETTINGS } from '../contexts/settingsDefaults';
import NumberInput from './NumberInput';

function Toggle({ checked, onChange, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 ${checked ? 'bg-primary' : 'bg-zinc-700'
        }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
      />
    </button>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
        {title}
      </h4>
      <div className="bg-zinc-800/40 rounded-xl px-4 divide-y divide-zinc-700/40">
        {children}
      </div>
    </div>
  );
}

function ShortcutInput({ value, onChange, onValidate }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(false);

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return; // don't record just modifiers

    let keyName = e.code === 'Space' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    parts.push(keyName);
    const newKey = parts.join('+');

    if (onValidate && !onValidate(newKey)) {
      setError(true);
      setTimeout(() => setError(false), 800);
      setRecording(false);
      return;
    }
    onChange(newKey);
    setRecording(false);
  };

  return (
    <button
      className={`px-3 py-1.5 rounded-lg text-xs font-mono min-w-[80px] transition-all ${error ? 'bg-red-500/20 text-red-400 border border-red-500 ring-2 ring-red-500/50' : recording ? 'bg-primary text-zinc-950 ring-2 ring-primary/50' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
      onClick={() => setRecording(true)}
      onKeyDown={recording ? handleKeyDown : undefined}
      onBlur={() => setRecording(false)}
    >
      {error ? 'Taken!' : recording ? '...' : (value || 'None')}
    </button>
  );
}

export default function Settings({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { settings: globalSettings, updateAllSettings } = useSettings();
  const [settings, setSettings] = useState(globalSettings || DEFAULT_SETTINGS); 
  const [activeTab, setActiveTab] = useState('playback');
  const { position, handleMouseDown } = useDraggable(isOpen);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(globalSettings);
    }
  }, [isOpen, globalSettings]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const nextSettings = { ...prev, [key]: value };
      if (nextSettings.autoSaveEnabled || prev.autoSaveEnabled) {
        updateAllSettings(nextSettings);
      }
      return nextSettings;
    });
  };

  const handleLanguageChange = (lang) => {
    updateSetting('defaultLanguage', lang);
  };

  const validateShortcut = (newKey, currentKeyName) => {
    const shortcutKeys = [
      'shortcutMark', 'shortcutNudgeLeft', 'shortcutNudgeRight',
      'shortcutAddLine', 'shortcutDeleteLine', 'shortcutClearTimestamp', 'shortcutSwitchMode'
    ];
    for (const k of shortcutKeys) {
      if (k !== currentKeyName && settings[k] === newKey) return false;
    }
    return true;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-md pointer-events-auto flex flex-col max-h-[85vh]"
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full flex flex-col h-full animate-fade-in overflow-hidden">
            {/* Header (drag handle) */}
            <div
              className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
              onPointerDown={handleMouseDown}
            >
              <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
                {t('settingsTitle')}
              </h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex px-4 sm:px-6 pt-2 w-full gap-0.5 bg-zinc-950/40 border-b border-zinc-800/60 no-scrollbar flex-shrink-0">
               {[
                 { id: 'playback', label: t('settingsPlayback') },
                 { id: 'editor', label: t('settingsEditor') },
                 { id: 'export', label: t('settingsExport') },
                 { id: 'interface', label: t('settingsInterface') },
                 { id: 'shortcuts', label: t('settingsShortcuts') || 'Shortcuts' },
                 { id: 'advanced', label: t('settingsAdvanced') }
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`relative flex-1 px-1 sm:px-2 py-2.5 text-[10px] sm:text-xs font-semibold text-center truncate transition-colors cursor-pointer outline-none rounded-t-xl ${activeTab === tab.id ? 'bg-zinc-900 text-primary z-10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                 >
                   {tab.label}
                   {activeTab === tab.id && (
                     <>
                       {/* Chrome-like bottom curves */}
                       <div className="absolute bottom-0 -left-3 w-3 h-3 rounded-br-xl shadow-[4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                       <div className="absolute bottom-0 -right-3 w-3 h-3 rounded-bl-xl shadow-[-4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                     </>
                   )}
                 </button>
               ))}
            </div>
            {/* Scrollable Content Container (CSS Grid forces it to the max height of all tabs!) */}
            <div className="flex-1 min-h-0 grid">
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'playback' ? 'visible z-10' : 'invisible z-0'}`}>
              {/* ——— PLAYBACK ——— */}
              <Section title={t('settingsPlayback')}>                <SettingRow label={t('settingsDefaultVolume')} description={t('settingsDefaultVolumeDesc')}>
                <NumberInput
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.defaultVolume}
                  onChange={(e) => updateSetting('defaultVolume', Math.min(1, Math.max(0, parseFloat(e.target.value) || 1)))}
                  className="w-20"
                />
              </SettingRow>
                <SettingRow label={t('settingsAutoRewind')} description={t('settingsAutoRewindDesc')}>
                  <NumberInput
                    min={0}
                    max={10}
                    step={1}
                    value={settings.autoRewindOnPause}
                    onChange={(e) => updateSetting('autoRewindOnPause', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20"
                  />
                </SettingRow>              <SettingRow label={t('settingsMinSpeed')} description={t('settingsMinSpeedDesc')}>
                  <NumberInput
                    min={0.05}
                    max={settings.maxSpeed - 0.05}
                    step={0.05}
                    value={settings.minSpeed}
                    onChange={(e) => updateSetting('minSpeed', Math.max(0.05, parseFloat(e.target.value) || 0.05))}
                    className="w-20"
                  />
                </SettingRow>
                <SettingRow label={t('settingsMaxSpeed')} description={t('settingsMaxSpeedDesc')}>
                  <NumberInput
                    min={settings.minSpeed + 0.05}
                    max={10}
                    step={0.05}
                    value={settings.maxSpeed}
                    onChange={(e) => updateSetting('maxSpeed', Math.max(settings.minSpeed + 0.05, parseFloat(e.target.value) || 1))}
                    className="w-20"
                  />
                </SettingRow>
                <SettingRow label={t('settingsShowEQ')} description={t('settingsShowEQDesc')}>
                  <Toggle
                    id="toggle-eq"
                    checked={settings.showEQ}
                    onChange={(v) => updateSetting('showEQ', v)}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShowWaveform')} description={t('settingsShowWaveformDesc')}>
                  <Toggle
                    id="toggle-waveform"
                    checked={settings.showWaveform}
                    onChange={(v) => updateSetting('showWaveform', v)}
                  />
                </SettingRow>
              </Section>

              {/* ——— EDITOR ——— */}
              </div>
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'editor' ? 'visible z-10' : 'invisible z-0'}`}>
              <Section title={t('settingsEditor')}>
                <SettingRow label={t('settingsAutoPauseOnMark')} description={t('settingsAutoPauseOnMarkDesc')}>
                  <Toggle
                    id="toggle-auto-pause-on-mark"
                    checked={settings.autoPauseOnMark}
                    onChange={(v) => updateSetting('autoPauseOnMark', v)}
                  />
                </SettingRow>
                <SettingRow label={t('settingsNudgeIncrement')} description={t('settingsNudgeIncrementDesc')}>
                  <NumberInput
                    min={0.01}
                    max={5}
                    step={0.01}
                    value={settings.nudgeIncrement}
                    onChange={(e) => updateSetting('nudgeIncrement', Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                    className="w-20"
                  />
                </SettingRow>
                <SettingRow label={t('settingsAutoAdvance')} description={t('settingsAutoAdvanceDesc')}>
                  <Toggle
                    id="toggle-auto-advance"
                    checked={settings.autoAdvance}
                    onChange={(v) => updateSetting('autoAdvance', v)}
                  />
                </SettingRow>
                <SettingRow label={t('settingsSkipBlank')} description={t('settingsSkipBlankDesc')}>
                  <Toggle
                    id="toggle-skip-blank"
                    checked={settings.skipBlankLines}
                    onChange={(v) => updateSetting('skipBlankLines', v)}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShowShiftAll')} description={t('settingsShowShiftAllDesc')}>
                  <Toggle
                    id="toggle-shift-all"
                    checked={settings.showShiftAll}
                    onChange={(v) => updateSetting('showShiftAll', v)}
                  />
                </SettingRow>
                <SettingRow label={t('settingsEditorTimestampPrecision')} description={t('settingsEditorTimestampPrecisionDesc')}>
                  <select
                    value={settings.editorTimestampPrecision}
                    onChange={(e) => updateSetting('editorTimestampPrecision', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="hundredths">mm:ss.xx</option>
                    <option value="thousandths">mm:ss.xxx</option>
                  </select>
                </SettingRow>
              </Section>

              {/* ——— EXPORT ——— */}
              </div>
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'export' ? 'visible z-10' : 'invisible z-0'}`}>
              <Section title={t('settingsExport')}>
                <SettingRow label={t('settingsLineEndings')} description={t('settingsLineEndingsDesc')}>
                  <select
                    value={settings.lineEndings}
                    onChange={(e) => updateSetting('lineEndings', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="lf">Unix (LF)</option>
                    <option value="crlf">Windows (CRLF)</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsCopyFormat')} description={t('settingsCopyFormatDesc')}>
                  <select
                    value={settings.copyFormat}
                    onChange={(e) => updateSetting('copyFormat', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="lrc">.lrc</option>
                    <option value="srt">.srt</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsDownloadFormat')} description={t('settingsDownloadFormatDesc')}>
                  <select
                    value={settings.downloadFormat}
                    onChange={(e) => updateSetting('downloadFormat', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="lrc">.lrc</option>
                    <option value="srt">.srt</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsTimestampPrecision')} description={t('settingsTimestampPrecisionDesc')}>
                  <select
                    value={settings.timestampPrecision}
                    onChange={(e) => updateSetting('timestampPrecision', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="hundredths">mm:ss.xx</option>
                    <option value="thousandths">mm:ss.xxx</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsFilenamePattern')} description={t('settingsFilenamePatternDesc')}>
                  <select
                    value={settings.defaultFilenamePattern}
                    onChange={(e) => updateSetting('defaultFilenamePattern', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="fixed">{t('settingsFilenameFixed')}</option>
                    <option value="media">{t('settingsFilenameMedia')}</option>
                  </select>
                </SettingRow>
              </Section>

              {/* ——— INTERFACE ——— */}
              </div>
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'interface' ? 'visible z-10' : 'invisible z-0'}`}>
              <Section title={t('settingsInterface')}>
                <SettingRow label={t('settingsTheme')} description={t('settingsThemeDesc')}>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSetting('theme', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="dark">{t('themeDark')}</option>
                    <option value="light">{t('themeLight')}</option>
                    <option value="system">{t('themeSystem')}</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsActiveLineHighlight')} description={t('settingsActiveLineHighlightDesc')}>
                  <select
                    value={settings.activeLineHighlight}
                    onChange={(e) => updateSetting('activeLineHighlight', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="glow">{t('highlightGlow')}</option>
                    <option value="zoom">{t('highlightZoom')}</option>
                    <option value="color">{t('highlightColor')}</option>
                    <option value="dim">{t('highlightDim')}</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsLanguage')} description={t('settingsLanguageDesc')}>
                  <select
                    value={settings.defaultLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsScrollBehavior')} description={t('settingsScrollBehaviorDesc')}>
                  <select
                    value={settings.scrollBehavior}
                    onChange={(e) => updateSetting('scrollBehavior', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="smooth">{t('settingsScrollSmooth')}</option>
                    <option value="instant">{t('settingsScrollInstant')}</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsScrollBlock')} description={t('settingsScrollBlockDesc')}>
                  <select
                    value={settings.scrollBlock}
                    onChange={(e) => updateSetting('scrollBlock', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="center">{t('settingsScrollCenter')}</option>
                    <option value="nearest">{t('settingsScrollNearest')}</option>                    <option value="start">Top</option>
                    <option value="none">Disabled</option>                </select>
                </SettingRow>
                <SettingRow label={t('settingsPreviewAlignment')} description={t('settingsPreviewAlignmentDesc')}>
                  <select
                    value={settings.previewAlignment}
                    onChange={(e) => updateSetting('previewAlignment', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="left">{t('settingsAlignLeft')}</option>
                    <option value="center">{t('settingsAlignCenter')}</option>
                    <option value="right">{t('settingsAlignRight')}</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsFontSize')} description={t('settingsFontSizeDesc')}>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="small">{t('sizeSmall')}</option>
                    <option value="normal">{t('sizeNormal')}</option>
                    <option value="large">{t('sizeLarge')}</option>
                    <option value="xlarge">{t('sizeXLarge')}</option>
                  </select>
                </SettingRow>
                <SettingRow label={t('settingsSpacing')} description={t('settingsSpacingDesc')}>
                  <select
                    value={settings.spacing}
                    onChange={(e) => updateSetting('spacing', e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="compact">{t('spacingCompact')}</option>
                    <option value="normal">{t('spacingNormal')}</option>
                    <option value="relaxed">{t('spacingRelaxed')}</option>
                  </select>
                </SettingRow>
              </Section>
              {/* ——— SHORTCUTS ——— */}
              </div>
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'shortcuts' ? 'visible z-10' : 'invisible z-0'}`}>
              <Section title={t('settingsShortcuts') || 'Shortcuts'}>
                <SettingRow label={t('settingsShortcutMarkLabel') || 'Mark Timestamp'} description={t('settingsShortcutMarkDesc') || 'Key to mark start/end times'}>
                  <ShortcutInput
                    value={settings.shortcutMark}
                    onChange={(v) => updateSetting('shortcutMark', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutMark')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutNudgeLeftLabel') || 'Nudge Left'} description={t('settingsShortcutNudgeLeftDesc', { val: settings.nudgeIncrement }) || `Subtract ${settings.nudgeIncrement}s from timestamp`}>
                  <ShortcutInput
                    value={settings.shortcutNudgeLeft}
                    onChange={(v) => updateSetting('shortcutNudgeLeft', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutNudgeLeft')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutNudgeRightLabel') || 'Nudge Right'} description={t('settingsShortcutNudgeRightDesc', { val: settings.nudgeIncrement }) || `Add ${settings.nudgeIncrement}s to timestamp`}>
                  <ShortcutInput
                    value={settings.shortcutNudgeRight}
                    onChange={(v) => updateSetting('shortcutNudgeRight', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutNudgeRight')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutAddLineLabel') || 'Add Line'} description={t('settingsShortcutAddLineDesc') || 'Add new line below active line'}>
                  <ShortcutInput
                    value={settings.shortcutAddLine}
                    onChange={(v) => updateSetting('shortcutAddLine', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutAddLine')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutDeleteLineLabel') || 'Delete Line'} description={t('settingsShortcutDeleteLineDesc') || 'Delete active line (or selection)'}>
                  <ShortcutInput
                    value={settings.shortcutDeleteLine}
                    onChange={(v) => updateSetting('shortcutDeleteLine', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutDeleteLine')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutClearTimestampLabel') || 'Clear Timestamp'} description={t('settingsShortcutClearTimestampDesc') || 'Clear timestamp on active line'}>
                  <ShortcutInput
                    value={settings.shortcutClearTimestamp}
                    onChange={(v) => updateSetting('shortcutClearTimestamp', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutClearTimestamp')}
                  />
                </SettingRow>
                <SettingRow label={t('settingsShortcutSwitchModeLabel') || 'Switch Mode'} description={t('settingsShortcutSwitchModeDesc') || 'Toggle LRC/SRT editor mode'}>
                  <ShortcutInput
                    value={settings.shortcutSwitchMode}
                    onChange={(v) => updateSetting('shortcutSwitchMode', v)}
                    onValidate={(v) => validateShortcut(v, 'shortcutSwitchMode')}
                  />
                </SettingRow>
              </Section>
              {/* ——— ADVANCED ——— */}
              </div>
              <div className={`col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'advanced' ? 'visible z-10' : 'invisible z-0'}`}>
              <Section title={t('settingsAdvanced')}>
                <SettingRow label={t('settingsAutoSave')} description={t('settingsAutoSaveDesc')}>
                  <Toggle
                    id="toggle-auto-save"
                    checked={settings.autoSaveEnabled}
                    onChange={(v) => updateSetting('autoSaveEnabled', v)}
                  />
                </SettingRow>

                {settings.autoSaveEnabled && (
                  <SettingRow label={t('settingsAutoSaveInterval')} description={t('settingsAutoSaveIntervalDesc')}>
                    <select
                      value={settings.autoSaveInterval}
                      onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value, 10))}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value={1000}>1s</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                      <option value={30000}>30s</option>
                    </select>
                  </SettingRow>
                )}
                <SettingRow label={t('settingsConfirmDestructive')} description={t('settingsConfirmDestructiveDesc')}>
                  <Toggle
                    id="toggle-confirm-destructive"
                    checked={settings.confirmDestructive}
                    onChange={(v) => updateSetting('confirmDestructive', v)}
                  />
                </SettingRow>
              </Section>
              </div>
            </div>

            {/* Footer — Apply & Reset */}
            <div className="px-6 py-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-3">
              <button
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS);
                  if (settings.autoSaveEnabled || DEFAULT_SETTINGS.autoSaveEnabled) {
                    updateAllSettings(DEFAULT_SETTINGS);
                  }
                }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('settingsReset') || 'Reset Options'}
              </button>
              {!settings.autoSaveEnabled && (
                <button
                  onClick={() => {
                    updateAllSettings(settings);
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg glow-primary"
                >
                  {t('applyChanges')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
