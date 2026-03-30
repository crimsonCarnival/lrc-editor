import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useAdvancedSettings } from '../hooks/useAdvancedSettings';

const COMMON_TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Bogota', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Mexico_City',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Seoul', 'Asia/Dubai',
  'Australia/Sydney', 'Pacific/Auckland', 'Africa/Cairo', 'Africa/Nairobi',
];

export default function AdvancedSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleAutoSaveToggle,
    handleAutoSaveIntervalChange,
    handleConfirmDestructiveChange,
    handleTimezoneChange,
  } = useAdvancedSettings(updateSetting);

  return (
    <Section title={t('settingsAdvanced')} searchTerm={searchTerm}>
      <SettingRow label={t('settingsAutoSave')} description={t('settingsAutoSaveDesc')}>
        <Toggle
          id="toggle-auto-save"
          checked={settings.advanced?.autoSave?.enabled ?? false}
          onChange={handleAutoSaveToggle}
        />
      </SettingRow>

      {settings.advanced?.autoSave?.enabled && (
        <SettingRow
          label={t('settingsAutoSaveInterval')}
          description={t('settingsAutoSaveIntervalDesc')}
        >
          <select
            value={settings.advanced?.autoSave?.interval}
            onChange={handleAutoSaveIntervalChange}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
          >
            {/* <option value={1000}>1s</option> */}
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={45000}>45s</option>
            <option value={60000}>1m</option>
          </select>
        </SettingRow>
      )}

      <SettingRow
        label={t('settingsConfirmDestructive')}
        description={t('settingsConfirmDestructiveDesc')}
      >
        <Toggle
          id="toggle-confirm-destructive"
          checked={settings.advanced?.confirmDestructive ?? true}
          onChange={handleConfirmDestructiveChange}
        />
      </SettingRow>

      <SettingRow
        label={t('settingsTimezone') || 'Timezone'}
        description={t('settingsTimezoneDesc') || 'Override detected timezone for saved timestamps'}
      >
        <select
          value={settings.advanced?.timezone ?? 'auto'}
          onChange={handleTimezoneChange}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer max-w-[200px]"
        >
          <option value="auto">
            {t('settingsTimezoneAuto') || 'Auto'} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
          </option>
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </SettingRow>
    </Section>
  );
}
