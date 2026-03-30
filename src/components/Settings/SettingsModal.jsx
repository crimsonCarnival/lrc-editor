import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import { DEFAULT_SETTINGS } from '../../contexts/settingsDefaults';
import { useSettingsModal } from './useSettingsModal';
import PlaybackSettings from './panels/PlaybackSettings';
import EditorSettings from './panels/EditorSettings';
import ExportSettings from './panels/ExportSettings';
import InterfaceSettings from './panels/InterfaceSettings';
import ShortcutsSettings from './panels/ShortcutsSettings';
import AdvancedSettings from './panels/AdvancedSettings';

const TABS = [
  { id: 'playback', labelKey: 'settingsPlayback' },
  { id: 'editor', labelKey: 'settingsEditor' },
  { id: 'export', labelKey: 'settingsExport' },
  { id: 'interface', labelKey: 'settingsInterface' },
  { id: 'shortcuts', labelKey: 'settingsShortcuts', fallback: 'Shortcuts' },
  { id: 'advanced', labelKey: 'settingsAdvanced' },
];

function tabPanelClass(tabId, activeTab, searchTerm) {
  if (searchTerm) return 'flex flex-col';
  const isActive = activeTab === tabId;
  return `col-start-1 row-start-1 px-6 py-4 overflow-y-auto settings-scroll flex flex-col transition-opacity duration-150 ${
    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
  }`;
}

export default function SettingsModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { settings: globalSettings, updateAllSettings } = useSettings();
  const {
    settings,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    position,
    handleMouseDown,
    updateSetting,
    validateShortcut,
    handleReset,
    handleApply,
  } = useSettingsModal(isOpen, onClose, globalSettings, updateAllSettings);

  if (!isOpen) return null;

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
              <div className="flex px-4 sm:px-6 pt-2 w-full gap-0.5 bg-zinc-950/40 no-scrollbar flex-shrink-0 overflow-x-auto">
                {TABS.map((tab) => {
                  const label = t(tab.labelKey) || tab.fallback || tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex-1 min-w-0 px-1 sm:px-2 py-2.5 text-[10px] sm:text-xs font-semibold text-center whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-150 cursor-pointer outline-none rounded-t-xl ${
                        activeTab === tab.id
                          ? 'bg-zinc-900 text-primary z-10'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                      }`}
                      title={label}
                    >
                      {label}
                      {activeTab === tab.id && (
                        <>
                          <div className="absolute bottom-0 -left-3 w-3 h-3 rounded-br-xl shadow-[4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                          <div className="absolute bottom-0 -right-3 w-3 h-3 rounded-bl-xl shadow-[-4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Content — CSS grid forces consistent height across all tabs */}
            <div
              className={`flex-1 min-h-0 ${
                searchTerm ? 'overflow-y-auto settings-scroll flex flex-col p-6' : 'grid'
              }`}
            >
              <div className={tabPanelClass('playback', activeTab, searchTerm)}>
                <PlaybackSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                />
              </div>
              <div className={tabPanelClass('editor', activeTab, searchTerm)}>
                <EditorSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                />
              </div>
              <div className={tabPanelClass('export', activeTab, searchTerm)}>
                <ExportSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                />
              </div>
              <div className={tabPanelClass('interface', activeTab, searchTerm)}>
                <InterfaceSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                />
              </div>
              <div className={tabPanelClass('shortcuts', activeTab, searchTerm)}>
                <ShortcutsSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                  validateShortcut={validateShortcut}
                />
              </div>
              <div className={tabPanelClass('advanced', activeTab, searchTerm)}>
                <AdvancedSettings
                  settings={settings}
                  updateSetting={updateSetting}
                  searchTerm={searchTerm}
                />
              </div>
            </div>

            {/* Footer — Reset & Apply */}
            <div className="px-6 py-4 border-t border-zinc-800/60 flex-shrink-0 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 font-medium text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('settingsReset') || 'Reset to defaults'}
              </button>
              <button
                onClick={handleApply}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('applyChanges') || 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
