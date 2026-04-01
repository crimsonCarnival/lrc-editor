import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import { DEFAULT_SETTINGS } from '../../contexts/settingsDefaults';
import { useSettingsModal } from './useSettingsModal';
import { useScrollLock } from '../../hooks/useScrollLock';
import PlaybackSettings from './panels/PlaybackSettings';
import EditorSettings from './panels/EditorSettings';
import ExportSettings from './panels/ExportSettings';
import InterfaceSettings from './panels/InterfaceSettings';
import ShortcutsSettings from './panels/ShortcutsSettings';
import AdvancedSettings from './panels/AdvancedSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Headphones, FileText, Download, Monitor, Keyboard, SlidersHorizontal } from 'lucide-react';

const TABS = [
  { id: 'playback', labelKey: 'settings.playback.label', icon: Headphones },
  { id: 'editor', labelKey: 'settings.editor.label', icon: FileText },
  { id: 'export', labelKey: 'settings.export.label', icon: Download },
  { id: 'interface', labelKey: 'settings.interface.label', icon: Monitor },
  { id: 'shortcuts', labelKey: 'settings.shortcuts.label', fallback: 'Shortcuts', icon: Keyboard },
  { id: 'advanced', labelKey: 'settings.advanced.label', icon: SlidersHorizontal },
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

  useScrollLock(isOpen);

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
          className="w-full max-w-lg pointer-events-auto flex flex-col max-h-[85vh]"
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
                  {t('settings.title')}
                </h3>
                <Input
                  type="text"
                  placeholder={t('settings.search')}
                  title={t('settings.searchTitle')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="bg-zinc-800/50 border-zinc-700/60 text-zinc-200 placeholder-zinc-500 focus-visible:border-primary/50 w-full max-w-[200px] h-7 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 ml-4"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            {!searchTerm && (
              <div className="flex px-4 sm:px-6 pt-2 w-full gap-0.5 bg-zinc-950/40 no-scrollbar flex-shrink-0 overflow-x-auto">
                {TABS.map((tab) => {
                  const label = t(tab.labelKey) || tab.fallback || tab.id;
                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex flex-1 min-w-0 flex-col items-center gap-0.5 px-1 sm:px-2 py-2 text-[9px] sm:text-[10px] font-semibold text-center whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-150 outline-none rounded-t-xl h-auto ${
                        activeTab === tab.id
                          ? 'bg-zinc-900 text-primary z-10 hover:bg-zinc-900 hover:text-primary'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
                      }`}
                      title={label}
                    >
                      {tab.icon && <tab.icon className="w-3.5 h-3.5 shrink-0" />}
                      {label}
                      {activeTab === tab.id && (
                        <>
                          <div className="absolute bottom-0 -left-3 w-3 h-3 rounded-br-xl shadow-[4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                          <div className="absolute bottom-0 -right-3 w-3 h-3 rounded-bl-xl shadow-[-4px_4px_0_0_var(--color-zinc-900)] pointer-events-none" />
                        </>
                      )}
                    </Button>
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
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700 font-medium text-sm rounded-xl h-10"
              >
                {t('settings.reset') || 'Reset to defaults'}
              </Button>
              {!settings.advanced?.autoSave?.enabled && (
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10"
                >
                  {t('settings.applyChanges') || 'Apply Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
