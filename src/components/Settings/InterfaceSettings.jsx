import { useTranslation } from 'react-i18next';
import { Section, SettingRow } from './shared';
import { useInterfaceSettings } from './useInterfaceSettings';

export default function InterfaceSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleLanguageChange,
    handleThemeChange,
    handleActiveHighlightChange,
    handleScrollModeChange,
    handleScrollAlignmentChange,
    handlePreviewAlignmentChange,
    handleFontSizeChange,
    handleSpacingChange,
  } = useInterfaceSettings(updateSetting);

  const selectClass =
    'bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer';

  return (
    <Section title={t('settingsInterface')} searchTerm={searchTerm}>
      <SettingRow label={t('settingsTheme')} description={t('settingsThemeDesc')}>
        <select
          value={settings.interface?.theme ?? 'dark'}
          onChange={handleThemeChange}
          className={selectClass}
        >
          <option value="dark">{t('themeDark')}</option>
          <option value="light">{t('themeLight')}</option>
          <option value="system">{t('themeSystem')}</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsActiveLineHighlight')}
        description={t('settingsActiveLineHighlightDesc')}
      >
        <select
          value={settings.editor?.display?.activeHighlight ?? 'glow'}
          onChange={handleActiveHighlightChange}
          className={selectClass}
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
          onChange={handleLanguageChange}
          className={selectClass}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsScrollBehavior')}
        description={t('settingsScrollBehaviorDesc')}
      >
        <select
          value={settings.editor?.scroll?.mode ?? 'smooth'}
          onChange={handleScrollModeChange}
          className={selectClass}
        >
          <option value="smooth">{t('settingsScrollSmooth')}</option>
          <option value="instant">{t('settingsScrollInstant')}</option>
        </select>
      </SettingRow>
      <SettingRow label={t('settingsScrollBlock')} description={t('settingsScrollBlockDesc')}>
        <select
          value={settings.editor?.scroll?.alignment ?? 'center'}
          onChange={handleScrollAlignmentChange}
          className={selectClass}
        >
          <option value="center">{t('settingsScrollCenter')}</option>
          <option value="nearest">{t('settingsScrollNearest')}</option>
          <option value="start">Top</option>
          <option value="none">Disabled</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsPreviewAlignment')}
        description={t('settingsPreviewAlignmentDesc')}
      >
        <select
          value={settings.interface?.previewAlignment ?? 'left'}
          onChange={handlePreviewAlignmentChange}
          className={selectClass}
        >
          <option value="left">{t('settingsAlignLeft')}</option>
          <option value="center">{t('settingsAlignCenter')}</option>
          <option value="right">{t('settingsAlignRight')}</option>
        </select>
      </SettingRow>
      <SettingRow label={t('settingsFontSize')} description={t('settingsFontSizeDesc')}>
        <select
          value={settings.interface?.fontSize ?? 'normal'}
          onChange={handleFontSizeChange}
          className={selectClass}
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
          onChange={handleSpacingChange}
          className={selectClass}
        >
          <option value="compact">{t('spacingCompact')}</option>
          <option value="normal">{t('spacingNormal')}</option>
          <option value="relaxed">{t('spacingRelaxed')}</option>
        </select>
      </SettingRow>
    </Section>
  );
}
