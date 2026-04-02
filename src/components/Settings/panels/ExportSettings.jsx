import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useExportSettings } from '../hooks/useExportSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, WrapText, Clipboard, FileDown, Clock, FileText, FilterX, ArrowUpDown } from 'lucide-react';

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
    <Section title={t('settings.export.label')} icon={Download} searchTerm={searchTerm}>
      <SettingRow icon={WrapText} label={t('settings.export.lineEndings')} description={t('settings.export.lineEndingsDesc')}>
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
      <SettingRow icon={Clipboard} label={t('settings.export.copyFormat')} description={t('settings.export.copyFormatDesc')}>
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
      <SettingRow icon={FileDown} label={t('settings.export.downloadFormat')} description={t('settings.export.downloadFormatDesc')}>
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
      <SettingRow icon={Clock} label={t('settings.export.timestampPrecision')} description={t('settings.export.timestampPrecisionDesc')}>
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
      <SettingRow icon={FileText} label={t('settings.export.filenamePattern')} description={t('settings.export.filenamePatternDesc')}>
        <Select
          value={settings.export?.defaultFilenamePattern ?? 'fixed'}
          onValueChange={(val) => handleFilenamePatternChange({ target: { value: val } })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 focus:border-primary/50 h-8 w-auto">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="fixed">{t('settings.export.filenameFixed')}</SelectItem>
            <SelectItem value="media">{t('settings.export.filenameMedia')}</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow icon={FilterX} label={t('settings.export.stripEmptyLines')} description={t('settings.export.stripEmptyLinesDesc')}>
        <Toggle
          id="toggle-strip-empty"
          checked={settings.export?.stripEmptyLines ?? false}
          onChange={(v) => updateSetting('export.stripEmptyLines', v)}
        />
      </SettingRow>
      <SettingRow icon={ArrowUpDown} label={t('settings.export.normalizeTimestamps')} description={t('settings.export.normalizeTimestampsDesc')}>
        <Toggle
          id="toggle-normalize-ts"
          checked={settings.export?.normalizeTimestamps ?? false}
          onChange={(v) => updateSetting('export.normalizeTimestamps', v)}
        />
      </SettingRow>
    </Section>
  );
}
