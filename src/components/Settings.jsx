import React, { useEffect, useState } from 'react';
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

function Section({ title, children, searchTerm }) {
  let hasVisibleChild = false;
  const filteredChildren = React.Children.map(children, child => {
    if (!React.isValidElement(child)) return child;

    if (searchTerm) {
      const label = typeof child.props.label === 'string' ? child.props.label : (child.props.label?.props?.children || '');
      const desc = typeof child.props.description === 'string' ? child.props.description : '';

      const match = label.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        desc.toString().toLowerCase().includes(searchTerm.toLowerCase());

      if (!match) return null;
    }

    hasVisibleChild = true;
    return child;
  });

  if (searchTerm && !hasVisibleChild) return null;

  return (
    <div className={`mb-5 ${searchTerm ? 'animate-fade-in' : ''}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
        {title}
      </h4>
      <div className="bg-zinc-800/40 rounded-xl px-4 divide-y divide-zinc-700/40">
        {filteredChildren}
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
  const [searchTerm, setSearchTerm] = useState('');
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
      const keys = key.split('.');
      const nextSettings = JSON.parse(JSON.stringify(prev));
      let current = nextSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;

      if (nextSettings.advanced.autoSave.enabled || prev.advanced?.autoSave?.enabled) {
        updateAllSettings(nextSettings);
      }
      return nextSettings;
    });
  };

  const handleLanguageChange = (lang) => {
    updateSetting('interface.defaultLanguage', lang);
  };

  const validateShortcut = (newKey, currentKeyName) => {
    const shortcutKeys = [
      'mark', 'nudgeLeft', 'nudgeRight',
      'addLine', 'deleteLine', 'clearTimestamp', 'switchMode',
      'nudgeLeftFine', 'nudgeRightFine' // New
    ];
    for (const k of shortcutKeys) {
      if (k !== currentKeyName && settings.shortcuts[k]?.includes(newKey)) return false;
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
              className={`flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-800/60 flex-shrink-0 cursor-grab active:cursor-grabbing select-none`}
              onPointerDown={handleMouseDown}
            >
              <div className="flex items-center gap-4 flex-1">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest shrink-0">
                  {t('settingsTitle')}
                </h3>
                <input
                  type="text"
                  placeholder={t('searchSettings')}
                  title={t('searchSettingsTitle')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-zinc-800/50 border border-zinc-700/60 rounded-md px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-primary/50 transition-colors w-full max-w-[200px]"
                />
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer ml-4"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            {!searchTerm && (
              <div className="flex px-4 sm:px-6 pt-2 w-full gap-0.5 bg-zinc-950/40 no-scrollbar flex-shrink-0">
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
                    title={tab.label}
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
            )}
            {/* Scrollable Content Container (CSS Grid forces it to the max height of all tabs!) */}
            <div className={`flex-1 min-h-0 ${searchTerm ? 'overflow-y-auto settings-scroll flex flex-col p-6' : 'grid'}`}>
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'playback' ? 'visible z-10' : 'invisible z-0'}`}>
                {/* ——— PLAYBACK ——— */}
                <Section title={t('settingsPlayback')} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsAutoRewind')} description={t('settingsAutoRewindDesc')}>
                    <NumberInput
                      min={0}
                      max={10}
                      step={1}
                      value={settings.playback?.autoRewindOnPause?.seconds ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        updateSetting('playback.autoRewindOnPause', { enabled: val > 0, seconds: val });
                      }}
                      className="w-20"
                    />
                  </SettingRow>              <SettingRow label={t('settingsMinSpeed')} description={t('settingsMinSpeedDesc')}>
                    <NumberInput
                      min={0.05}
                      max={(settings.playback?.speedBounds?.max || 3) - 0.05}
                      step={0.05}
                      value={settings.playback?.speedBounds?.min ?? 0.25}
                      onChange={(e) => updateSetting('playback.speedBounds.min', Math.max(0.05, parseFloat(e.target.value) || 0.05))}
                      className="w-20"
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsMaxSpeed')} description={t('settingsMaxSpeedDesc')}>
                    <NumberInput
                      min={(settings.playback?.speedBounds?.min || 0.25) + 0.05}
                      max={10}
                      step={0.05}
                      value={settings.playback?.speedBounds?.max ?? 3}
                      onChange={(e) => updateSetting('playback.speedBounds.max', Math.max((settings.playback?.speedBounds?.min || 0.25) + 0.05, parseFloat(e.target.value) || 1))}
                      className="w-20"
                    />
                  </SettingRow>

                  <SettingRow label={t('settingsShowWaveform')} description={t('settingsShowWaveformDesc')}>
                    <Toggle
                      id="toggle-waveform"
                      checked={settings.playback?.showWaveform ?? true}
                      onChange={(v) => updateSetting('playback.showWaveform', v)}
                    />
                  </SettingRow>
                </Section>

                {/* ——— EDITOR ——— */}
              </div>
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'editor' ? 'visible z-10' : 'invisible z-0'}`}>
                <Section title={t('settingsEditor')} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsAutoPauseOnMark')} description={t('settingsAutoPauseOnMarkDesc')}>
                    <Toggle
                      id="toggle-auto-pause-on-mark"
                      checked={settings.editor?.autoPauseOnMark ?? false}
                      onChange={(v) => updateSetting('editor.autoPauseOnMark', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsNudgeIncrement')} description={t('settingsNudgeIncrementDesc')}>
                    <NumberInput
                      min={0.01}
                      max={5}
                      step={0.01}
                      value={settings.editor?.nudge?.default ?? 0.1}
                      onChange={(e) => updateSetting('editor.nudge.default', Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                      className="w-20"
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsAutoAdvance')} description={t('settingsAutoAdvanceDesc')}>
                    <Toggle
                      id="toggle-auto-advance"
                      checked={settings.editor?.autoAdvance?.enabled ?? true}
                      onChange={(v) => updateSetting('editor.autoAdvance.enabled', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsSkipBlank')} description={t('settingsSkipBlankDesc')}>
                    <Toggle
                      id="toggle-skip-blank"
                      checked={settings.editor?.autoAdvance?.skipBlank ?? false}
                      onChange={(v) => updateSetting('editor.autoAdvance.skipBlank', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShowShiftAll')} description={t('settingsShowShiftAllDesc')}>
                    <Toggle
                      id="toggle-shift-all"
                      checked={settings.editor?.showShiftAll ?? true}
                      onChange={(v) => updateSetting('editor.showShiftAll', v)}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsEditorTimestampPrecision')} description={t('settingsEditorTimestampPrecisionDesc')}>
                    <select
                      value={settings.editor?.timestampPrecision ?? 'hundredths'}
                      onChange={(e) => updateSetting('editor.timestampPrecision', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="hundredths">mm:ss.xx</option>
                      <option value="thousandths">mm:ss.xxx</option>
                    </select>
                  </SettingRow>
                </Section>

                {/* ——— EXPORT ——— */}
              </div>
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'export' ? 'visible z-10' : 'invisible z-0'}`}>
                <Section title={t('settingsExport')} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsLineEndings')} description={t('settingsLineEndingsDesc')}>
                    <select
                      value={settings.export?.lineEndings ?? 'lf'}
                      onChange={(e) => updateSetting('export.lineEndings', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="lf">Unix (LF)</option>
                      <option value="crlf">Windows (CRLF)</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsCopyFormat')} description={t('settingsCopyFormatDesc')}>
                    <select
                      value={settings.export?.copyFormat ?? 'lrc'}
                      onChange={(e) => updateSetting('export.copyFormat', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="lrc">.lrc</option>
                      <option value="srt">.srt</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsDownloadFormat')} description={t('settingsDownloadFormatDesc')}>
                    <select
                      value={settings.export?.downloadFormat ?? 'lrc'}
                      onChange={(e) => updateSetting('export.downloadFormat', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="lrc">.lrc</option>
                      <option value="srt">.srt</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsTimestampPrecision')} description={t('settingsTimestampPrecisionDesc')}>
                    <select
                      value={settings.export?.timestampPrecision ?? 'hundredths'}
                      onChange={(e) => updateSetting('export.timestampPrecision', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="hundredths">mm:ss.xx</option>
                      <option value="thousandths">mm:ss.xxx</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsFilenamePattern')} description={t('settingsFilenamePatternDesc')}>
                    <select
                      value={settings.export?.defaultFilenamePattern ?? 'fixed'}
                      onChange={(e) => updateSetting('export.defaultFilenamePattern', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="fixed">{t('settingsFilenameFixed')}</option>
                      <option value="media">{t('settingsFilenameMedia')}</option>
                    </select>
                  </SettingRow>
                </Section>

                {/* ——— INTERFACE ——— */}
              </div>
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'interface' ? 'visible z-10' : 'invisible z-0'}`}>
                <Section title={t('settingsInterface')} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsTheme')} description={t('settingsThemeDesc')}>
                    <select
                      value={settings.interface?.theme ?? 'dark'}
                      onChange={(e) => updateSetting('interface.theme', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="dark">{t('themeDark')}</option>
                      <option value="light">{t('themeLight')}</option>
                      <option value="system">{t('themeSystem')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsActiveLineHighlight')} description={t('settingsActiveLineHighlightDesc')}>
                    <select
                      value={settings.editor?.display?.activeHighlight ?? 'glow'}
                      onChange={(e) => updateSetting('editor.display.activeHighlight', e.target.value)}
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
                      value={settings.interface?.defaultLanguage ?? 'en'}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsScrollBehavior')} description={t('settingsScrollBehaviorDesc')}>
                    <select
                      value={settings.editor?.scroll?.mode ?? 'smooth'}
                      onChange={(e) => updateSetting('editor.scroll.mode', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="smooth">{t('settingsScrollSmooth')}</option>
                      <option value="instant">{t('settingsScrollInstant')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsScrollBlock')} description={t('settingsScrollBlockDesc')}>
                    <select
                      value={settings.editor?.scroll?.alignment ?? 'center'}
                      onChange={(e) => updateSetting('editor.scroll.alignment', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="center">{t('settingsScrollCenter')}</option>
                      <option value="nearest">{t('settingsScrollNearest')}</option>                    <option value="start">Top</option>
                      <option value="none">Disabled</option>                </select>
                  </SettingRow>
                  <SettingRow label={t('settingsPreviewAlignment')} description={t('settingsPreviewAlignmentDesc')}>
                    <select
                      value={settings.interface?.previewAlignment ?? 'left'}
                      onChange={(e) => updateSetting('interface.previewAlignment', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="left">{t('settingsAlignLeft')}</option>
                      <option value="center">{t('settingsAlignCenter')}</option>
                      <option value="right">{t('settingsAlignRight')}</option>
                    </select>
                  </SettingRow>
                  <SettingRow label={t('settingsFontSize')} description={t('settingsFontSizeDesc')}>
                    <select
                      value={settings.interface?.fontSize ?? 'normal'}
                      onChange={(e) => updateSetting('interface.fontSize', e.target.value)}
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
                      value={settings.interface?.spacing ?? 'normal'}
                      onChange={(e) => updateSetting('interface.spacing', e.target.value)}
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
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'shortcuts' ? 'visible z-10' : 'invisible z-0'}`}>
                <Section title={t('settingsShortcuts') || 'Shortcuts'} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsShortcutMarkLabel') || 'Mark Timestamp'} description={t('settingsShortcutMarkDesc') || 'Key to mark start/end times'}>
                    <ShortcutInput
                      value={settings.shortcuts?.mark?.[0] || 'Space'}
                      onChange={(v) => updateSetting('shortcuts.mark', [v])}
                      onValidate={(v) => validateShortcut(v, 'mark')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutNudgeLeftLabel') || 'Nudge Left'} description={t('settingsShortcutNudgeLeftDesc', { val: settings.editor?.nudge?.default || 0.1 }) || `Subtract ${settings.editor?.nudge?.default || 0.1}s`}>
                    <ShortcutInput
                      value={settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft'}
                      onChange={(v) => updateSetting('shortcuts.nudgeLeft', [v])}
                      onValidate={(v) => validateShortcut(v, 'nudgeLeft')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutNudgeRightLabel') || 'Nudge Right'} description={t('settingsShortcutNudgeRightDesc', { val: settings.editor?.nudge?.default || 0.1 }) || `Add ${settings.editor?.nudge?.default || 0.1}s`}>
                    <ShortcutInput
                      value={settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight'}
                      onChange={(v) => updateSetting('shortcuts.nudgeRight', [v])}
                      onValidate={(v) => validateShortcut(v, 'nudgeRight')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutAddLineLabel') || 'Add Line'} description={t('settingsShortcutAddLineDesc') || 'Add new line below active line'}>
                    <ShortcutInput
                      value={settings.shortcuts?.addLine?.[0] || 'Ctrl+Enter'}
                      onChange={(v) => updateSetting('shortcuts.addLine', [v])}
                      onValidate={(v) => validateShortcut(v, 'addLine')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutDeleteLineLabel') || 'Delete Line'} description={t('settingsShortcutDeleteLineDesc') || 'Delete active line (or selection)'}>
                    <ShortcutInput
                      value={settings.shortcuts?.deleteLine?.[0] || 'Delete'}
                      onChange={(v) => updateSetting('shortcuts.deleteLine', [v])}
                      onValidate={(v) => validateShortcut(v, 'deleteLine')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutClearTimestampLabel') || 'Clear Timestamp'} description={t('settingsShortcutClearTimestampDesc') || 'Clear timestamp on active line'}>
                    <ShortcutInput
                      value={settings.shortcuts?.clearTimestamp?.[0] || 'Backspace'}
                      onChange={(v) => updateSetting('shortcuts.clearTimestamp', [v])}
                      onValidate={(v) => validateShortcut(v, 'clearTimestamp')}
                    />
                  </SettingRow>
                  <SettingRow label={t('settingsShortcutSwitchModeLabel') || 'Switch Mode'} description={t('settingsShortcutSwitchModeDesc') || 'Toggle LRC/SRT editor mode'}>
                    <ShortcutInput
                      value={settings.shortcuts?.switchMode?.[0] || 'Ctrl+M'}
                      onChange={(v) => updateSetting('shortcuts.switchMode', [v])}
                      onValidate={(v) => validateShortcut(v, 'switchMode')}
                    />
                  </SettingRow>
                </Section>
                {/* ——— ADVANCED ——— */}
              </div>
              <div className={searchTerm ? 'flex flex-col' : `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col ${activeTab === 'advanced' ? 'visible z-10' : 'invisible z-0'}`}>
                <Section title={t('settingsAdvanced')} searchTerm={searchTerm}>
                  <SettingRow label={t('settingsAutoSave')} description={t('settingsAutoSaveDesc')}>
                    <Toggle
                      id="toggle-auto-save"
                      checked={settings.advanced?.autoSave?.enabled ?? false}
                      onChange={(v) => updateSetting('advanced.autoSave.enabled', v)}
                    />
                  </SettingRow>

                  {settings.advanced?.autoSave?.enabled && (
                    <SettingRow label={t('settingsAutoSaveInterval')} description={t('settingsAutoSaveIntervalDesc')}>
                      <select
                        value={settings.advanced?.autoSave?.interval ?? 3000}
                        onChange={(e) => updateSetting('advanced.autoSave.interval', parseInt(e.target.value, 10))}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                      >
                        <option value={1000}>1s</option>
                        <option value={3000}>3s</option>
                        <option value={5000}>5s</option>
                        <option value={10000}>10s</option>
                        <option value={30000}>30s</option>
                      </select>
                    </SettingRow>
                  )}
                  <SettingRow label={t('settingsConfirmDestructive')} description={t('settingsConfirmDestructiveDesc')}>
                    <Toggle
                      id="toggle-confirm-destructive"
                      checked={settings.advanced?.confirmDestructive ?? true}
                      onChange={(v) => updateSetting('advanced.confirmDestructive', v)}
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
                  if (settings.advanced?.autoSave?.enabled || DEFAULT_SETTINGS.advanced.autoSave.enabled) {
                    updateAllSettings(DEFAULT_SETTINGS);
                  }
                }}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('settingsReset') || 'Reset Options'}
              </button>
              {!settings.advanced?.autoSave?.enabled && (
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
