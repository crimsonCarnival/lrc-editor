import { useTranslation } from 'react-i18next';
import { Section, SettingRow } from '../shared';
import { useExportSettings } from '../hooks/useExportSettings';

export default function ExportSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleTimestampPrecisionChange,
    handleFilenamePatternChange,
  } = useExportSettings(updateSetting);

  const selectClass =
    'bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer';

  return (
    <Section title={t('settingsExport')} searchTerm={searchTerm}>
      <SettingRow label={t('settingsLineEndings')} description={t('settingsLineEndingsDesc')}>
        <select
          value={settings.export?.lineEndings ?? 'lf'}
          onChange={handleLineEndingsChange}
          className={selectClass}
        >
          <option value="lf">Unix (LF)</option>
          <option value="crlf">Windows (CRLF)</option>
        </select>
      </SettingRow>
      <SettingRow label={t('settingsCopyFormat')} description={t('settingsCopyFormatDesc')}>
        <select
          value={settings.export?.copyFormat ?? 'lrc'}
          onChange={handleCopyFormatChange}
          className={selectClass}
        >
          <option value="lrc">.lrc</option>
          <option value="srt">.srt</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsDownloadFormat')}
        description={t('settingsDownloadFormatDesc')}
      >
        <select
          value={settings.export?.downloadFormat ?? 'lrc'}
          onChange={handleDownloadFormatChange}
          className={selectClass}
        >
          <option value="lrc">.lrc</option>
          <option value="srt">.srt</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsTimestampPrecision')}
        description={t('settingsTimestampPrecisionDesc')}
      >
        <select
          value={settings.export?.timestampPrecision ?? 'hundredths'}
          onChange={handleTimestampPrecisionChange}
          className={selectClass}
        >
          <option value="hundredths">mm:ss.xx</option>
          <option value="thousandths">mm:ss.xxx</option>
        </select>
      </SettingRow>
      <SettingRow
        label={t('settingsFilenamePattern')}
        description={t('settingsFilenamePatternDesc')}
      >
        <select
          value={settings.export?.defaultFilenamePattern ?? 'fixed'}
          onChange={handleFilenamePatternChange}
          className={selectClass}
        >
          <option value="fixed">{t('settingsFilenameFixed')}</option>
          <option value="media">{t('settingsFilenameMedia')}</option>
        </select>
      </SettingRow>
    </Section>
  );
}
