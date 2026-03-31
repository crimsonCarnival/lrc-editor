import { useState, useEffect } from 'react';
import useDraggable from '../../hooks/useDraggable';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useTranslation } from 'react-i18next';
import { Kbd, KbdGroup } from './Kbd';
import { useSettings } from '../../contexts/useSettings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Headphones, FileText, Eye } from 'lucide-react';
import { KEY_SYMBOLS } from '../Settings/keySymbols';
import { matchKey } from '../../utils/keyboard';

// Split a shortcut string like 'Ctrl+M' into display parts ['Ctrl', 'M']
const resolveShortcut = (shortcut) =>
  shortcut.split('+').map((k) => KEY_SYMBOLS[k] ?? k);

const HELP_TABS = [
  { id: 'player', icon: Headphones, labelKey: 'helpTabPlayer' },
  { id: 'editor', icon: FileText,   labelKey: 'helpTabEditor' },
  { id: 'preview', icon: Eye,       labelKey: 'helpTabPreview' },
];

export default function KeyboardHelp({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { position, handleMouseDown } = useDraggable(isOpen);
  const [activeTab, setActiveTab] = useState('player');
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        e.key === 'Escape' ||
        matchKey(e, settings.shortcuts?.showHelp?.[0] || '?')
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, settings.shortcuts?.showHelp]);

  const resolveModifier = (key) => [KEY_SYMBOLS[key] ?? key];

  const seekTime = settings.playback?.seekTime ?? 5;
  const nudge = settings.editor?.nudge?.default || 0.1;

  const tabContent = {
    player: [
      { section: t('helpSectionPlayback'), items: [
        { keys: resolveShortcut(settings.shortcuts?.playPause?.[0] || 'Enter'),            desc: t('shortcutPlayPause') },
        { keys: resolveShortcut(settings.shortcuts?.seekBackward?.[0] || 'Alt+ArrowLeft'), desc: t('shortcutSeekBackward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.seekForward?.[0] || 'Alt+ArrowRight'), desc: t('shortcutSeekForward', { val: seekTime }) },
        { keys: resolveShortcut(settings.shortcuts?.mute?.[0] || 'm'),                    desc: t('shortcutMute') },
        { keys: resolveShortcut(settings.shortcuts?.speedUp?.[0] || '+'),                  desc: t('shortcutSpeedUp') },
        { keys: resolveShortcut(settings.shortcuts?.speedDown?.[0] || '-'),                desc: t('shortcutSpeedDown') },
      ]},
    ],
    editor: [
      { section: t('syncModeOnly'), items: [
        { keys: resolveShortcut(settings.shortcuts?.mark?.[0] || 'Space'),       desc: t('shortcutMark') },
        { keys: resolveShortcut(settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft'),  desc: t('shortcutNudgeLeft', { val: nudge }) },
        { keys: resolveShortcut(settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight'), desc: t('shortcutNudgeRight', { val: nudge }) },
      ]},
      { section: t('shortcutSelectionSection'), items: [
        { keys: [...resolveModifier(settings.shortcuts?.rangeSelect?.[0] || 'Shift'), t('shortcutClick')],  desc: t('shortcutRangeSelect') },
        { keys: [...resolveModifier(settings.shortcuts?.toggleSelect?.[0] || 'Ctrl'), t('shortcutClick')], desc: t('shortcutToggleSelect') },
        { keys: resolveShortcut(settings.shortcuts?.deselect?.[0] || 'Escape'),    desc: t('shortcutDeselect') },
        { keys: resolveShortcut(settings.shortcuts?.deleteLine?.[0] || 'Delete'),   desc: t('shortcutDeleteSelected') },
        { keys: [t('shortcutDblClick')],                                            desc: t('shortcutEditLine') },
      ]},
      { section: t('global'), items: [
        { keys: ['Ctrl', 'Z'],                                                        desc: t('shortcutUndo') },
        { keys: ['Ctrl', 'Y'],                                                        desc: t('shortcutRedo') },
        { keys: resolveShortcut(settings.shortcuts?.showHelp?.[0] || '?'),           desc: t('shortcutHelp') },
      ]},
    ],
    preview: [
      { section: t('helpSectionPreview'), items: [
        { keys: resolveShortcut(settings.shortcuts?.toggleTranslation?.[0] || 't'),  desc: t('shortcutToggleTranslation') },
        { keys: resolveShortcut(settings.shortcuts?.addSecondary?.[0] || 'Shift+H'), desc: t('shortcutAddSecondary') },
        { keys: resolveShortcut(settings.shortcuts?.addTranslation?.[0] || 'Shift+T'), desc: t('shortcutAddTranslation') },
      ]},
    ],
  };

  const groups = tabContent[activeTab] || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-zinc-900 border border-zinc-700 shadow-2xl p-0 max-w-sm w-full [&>button]:hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-800/60 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleMouseDown}
          >
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              {t('keyboardShortcuts')}
            </h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex px-3 pt-2 gap-0.5 bg-zinc-950/40">
            {HELP_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 h-auto text-[10px] font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(tab.labelKey)}
                </Button>
              );
            })}
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5 space-y-5">
            {groups.map((group) => (
              <div key={group.section}>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">
                  {group.section}
                </p>
                <div className="space-y-2">
                  {group.items.map((s) => (
                    <div key={s.desc} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">{s.desc}</span>
                      <KbdGroup>
                        {s.keys.map((k, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            {i > 0 && <span className="text-zinc-600 text-[10px]">+</span>}
                            <Kbd>{k}</Kbd>
                          </span>
                        ))}
                      </KbdGroup>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
