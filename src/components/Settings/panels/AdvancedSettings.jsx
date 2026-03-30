import { useTranslation } from 'react-i18next';
import { Section, SettingRow, Toggle } from '../shared';
import { useAdvancedSettings } from '../hooks/useAdvancedSettings';

export default function AdvancedSettings({ settings, updateSetting, searchTerm }) {
  const { t } = useTranslation();
  const {
    handleAutoSaveToggle,
    handleAutoSaveIntervalChange,
    handleConfirmDestructiveChange,
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
            value={settings.advanced?.autoSave?.interval ?? 3000}
            onChange={handleAutoSaveIntervalChange}
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
    </Section>
  );
}
