import { useTranslation } from 'react-i18next';
import { Section, SettingRow } from '../shared';
import { useExportSettings } from '../hooks/useExportSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, WrapText, Clipboard, FileDown, Clock, FileText } from 'lucide-react';

export default function ExportSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleTimestampPrecisionChange,
    handleFilenamePatternChange,
  } = useExportSettings(updateSetting);

  return (
    <Section title={t('settingsExport')} icon={Download} searchTerm={searchTerm}>
      <SettingRow icon={WrapText} label={t('settingsLineEndings')} description={t('settingsLineEndingsDesc')}>
        <Select
          value={settings.export?.lineEndings ?? 'lf'}
          onValueChange={(val) => handleLineEndingsChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="lf">Unix (LF)</SelectItem>
            <SelectItem value="crlf">Windows (CRLF)</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Clipboard} label={t('settingsCopyFormat')} description={t('settingsCopyFormatDesc')}>
        <Select
          value={settings.export?.copyFormat ?? 'lrc'}
          onValueChange={(val) => handleCopyFormatChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="lrc">.lrc</SelectItem>
            <SelectItem value="srt">.srt</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={FileDown} label={t('settingsDownloadFormat')} description={t('settingsDownloadFormatDesc')}>
        <Select
          value={settings.export?.downloadFormat ?? 'lrc'}
          onValueChange={(val) => handleDownloadFormatChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="lrc">.lrc</SelectItem>
            <SelectItem value="srt">.srt</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={Clock} label={t('settingsTimestampPrecision')} description={t('settingsTimestampPrecisionDesc')}>
        <Select
          value={settings.export?.timestampPrecision ?? 'hundredths'}
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
      <SettingRow icon={FileText} label={t('settingsFilenamePattern')} description={t('settingsFilenamePatternDesc')}>
        <Select
          value={settings.export?.defaultFilenamePattern ?? 'fixed'}
          onValueChange={(val) => handleFilenamePatternChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="fixed">{t('settingsFilenameFixed')}</SelectItem>
            <SelectItem value="media">{t('settingsFilenameMedia')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
    </Section>
  );
}
