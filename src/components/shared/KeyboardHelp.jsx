import { useEffect } from 'react';
import useDraggable from '../../hooks/useDraggable';
import { useTranslation } from 'react-i18next';
import { Kbd, KbdGroup } from './Kbd';
import { useSettings } from '../../contexts/useSettings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { KEY_SYMBOLS } from '../Settings/shared';
import { matchKey } from '../../utils/keyboard';

// Split a shortcut string like 'Ctrl+M' into display parts ['Ctrl', 'M']
const resolveShortcut = (shortcut) =>
  shortcut.split('+').map((k) => KEY_SYMBOLS[k] ?? k);

export default function KeyboardHelp({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { position, handleMouseDown } = useDraggable(isOpen);

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

  const shortcuts = [
    { section: t('syncModeOnly'), items: [
      { keys: resolveShortcut(settings.shortcuts?.mark?.[0] || 'Space'), desc: t('shortcutMark') },
      { keys: resolveShortcut(settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft'), desc: t('shortcutNudgeLeft', { val: settings.editor?.nudge?.default || 0.1 }) },
      { keys: resolveShortcut(settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight'), desc: t('shortcutNudgeRight', { val: settings.editor?.nudge?.default || 0.1 }) },
    ]},
    { section: t('shortcutSelectionSection'), items: [
      { keys: [...resolveModifier(settings.shortcuts?.rangeSelect?.[0] || 'Shift'), t('shortcutClick')], desc: t('shortcutRangeSelect') },
      { keys: [...resolveModifier(settings.shortcuts?.toggleSelect?.[0] || 'Ctrl'), t('shortcutClick')], desc: t('shortcutToggleSelect') },
      { keys: resolveShortcut(settings.shortcuts?.deselect?.[0] || 'Escape'), desc: t('shortcutDeselect') },
      { keys: resolveShortcut(settings.shortcuts?.deleteLine?.[0] || 'Delete'), desc: t('shortcutDeleteSelected') },
      { keys: [t('shortcutDblClick')], desc: t('shortcutEditLine') },
    ]},
    { section: t('global'), items: [
      { keys: ['Ctrl', 'Z'], desc: t('shortcutUndo') },
      { keys: ['Ctrl', 'Y'], desc: t('shortcutRedo') },
      { keys: resolveShortcut(settings.shortcuts?.showHelp?.[0] || '?'), desc: t('shortcutHelp') },
    ]},
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-zinc-900 border border-zinc-700 shadow-2xl p-0 max-w-sm w-full [&>button]:hidden"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <div className="p-6">
          <div
            className="flex items-center justify-between mb-5 cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleMouseDown}
          >
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              {t('keyboardShortcuts')}
            </h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-5">
            {shortcuts.map((group) => (
              <div key={group.section}>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">
                  {group.section}
                </p>
                <div className="space-y-2">
                  {group.items.map((s) => (
                    <div key={s.desc} className="flex items-center justify-between">
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

          <p className="text-xs text-zinc-600 text-center mt-5">
            {t('shortcutHelp')}: <Kbd>?</Kbd>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
