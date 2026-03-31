import { useTranslation } from 'react-i18next';
import { Section, SettingRow } from '../shared';
import { useInterfaceSettings } from '../hooks/useInterfaceSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Moon, Sparkles, Globe, ScrollText, AlignCenter, AlignLeft, Type, Rows2 } from 'lucide-react';

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

  return (
    <Section title={t('settingsInterface')} icon={Monitor} searchTerm={searchTerm}>
      <SettingRow icon={Moon} label={t('settingsTheme')} description={t('settingsThemeDesc')}>
        <Select
          value={settings.interface?.theme ?? 'dark'}
          onValueChange={(val) => handleThemeChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="dark">{t('themeDark')}</SelectItem>
            <SelectItem value="light">{t('themeLight')}</SelectItem>
            <SelectItem value="system">{t('themeSystem')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Sparkles} label={t('settingsActiveLineHighlight')} description={t('settingsActiveLineHighlightDesc')}>
        <Select
          value={settings.editor?.display?.activeHighlight ?? 'glow'}
          onValueChange={(val) => handleActiveHighlightChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="glow">{t('highlightGlow')}</SelectItem>
            <SelectItem value="zoom">{t('highlightZoom')}</SelectItem>
            <SelectItem value="color">{t('highlightColor')}</SelectItem>
            <SelectItem value="dim">{t('highlightDim')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Globe} label={t('settingsLanguage')} description={t('settingsLanguageDesc')}>
        <Select
          value={settings.interface?.defaultLanguage ?? 'en'}
          onValueChange={(val) => handleLanguageChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Español</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={ScrollText} label={t('settingsScrollBehavior')} description={t('settingsScrollBehaviorDesc')}>
        <Select
          value={settings.editor?.scroll?.mode ?? 'smooth'}
          onValueChange={(val) => handleScrollModeChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="smooth">{t('settingsScrollSmooth')}</SelectItem>
            <SelectItem value="instant">{t('settingsScrollInstant')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={AlignCenter} label={t('settingsScrollBlock')} description={t('settingsScrollBlockDesc')}>
        <Select
          value={settings.editor?.scroll?.alignment ?? 'center'}
          onValueChange={(val) => handleScrollAlignmentChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="center">{t('settingsScrollCenter')}</SelectItem>
            <SelectItem value="nearest">{t('settingsScrollNearest')}</SelectItem>
            <SelectItem value="start">Top</SelectItem>
            <SelectItem value="none">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={AlignLeft} label={t('settingsPreviewAlignment')} description={t('settingsPreviewAlignmentDesc')}>
        <Select
          value={settings.interface?.previewAlignment ?? 'left'}
          onValueChange={(val) => handlePreviewAlignmentChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="left">{t('settingsAlignLeft')}</SelectItem>
            <SelectItem value="center">{t('settingsAlignCenter')}</SelectItem>
            <SelectItem value="right">{t('settingsAlignRight')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Type} label={t('settingsFontSize')} description={t('settingsFontSizeDesc')}>
        <Select
          value={settings.interface?.fontSize ?? 'normal'}
          onValueChange={(val) => handleFontSizeChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="small">{t('sizeSmall')}</SelectItem>
            <SelectItem value="normal">{t('sizeNormal')}</SelectItem>
            <SelectItem value="large">{t('sizeLarge')}</SelectItem>
            <SelectItem value="xlarge">{t('sizeXLarge')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Rows2} label={t('settingsSpacing')} description={t('settingsSpacingDesc')}>
        <Select
          value={settings.interface?.spacing ?? 'normal'}
          onValueChange={(val) => handleSpacingChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="compact">{t('spacingCompact')}</SelectItem>
            <SelectItem value="normal">{t('spacingNormal')}</SelectItem>
            <SelectItem value="relaxed">{t('spacingRelaxed')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </Section>
  );
}
