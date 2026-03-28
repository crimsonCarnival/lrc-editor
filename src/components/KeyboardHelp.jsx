import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function KeyboardHelp({ isOpen, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { section: t('syncModeOnly'), items: [
      { keys: ['Space'], desc: t('shortcutMark') },
      { keys: ['←'], desc: t('shortcutNudgeLeft') },
      { keys: ['→'], desc: t('shortcutNudgeRight') },
    ]},
    { section: t('shortcutSelectionSection'), items: [
      { keys: ['Shift', t('shortcutClick')], desc: t('shortcutRangeSelect') },
      { keys: ['Ctrl', t('shortcutClick')], desc: t('shortcutToggleSelect') },
      { keys: ['Esc'], desc: t('shortcutDeselect') },
      { keys: ['Del'], desc: t('shortcutDeleteSelected') },
      { keys: [t('shortcutDblClick')], desc: t('shortcutEditLine') },
    ]},
    { section: t('global'), items: [
      { keys: ['Ctrl', 'Z'], desc: t('shortcutUndo') },
      { keys: ['Ctrl', 'Y'], desc: t('shortcutRedo') },
      { keys: ['?'], desc: t('shortcutHelp') },
    ]},
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm pointer-events-auto animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-widest">
              {t('keyboardShortcuts')}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, i) => (
                          <span key={i}>
                            <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300 shadow-sm">
                              {k}
                            </kbd>
                            {i < s.keys.length - 1 && (
                              <span className="text-zinc-600 mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 text-center mt-5">
            {t('shortcutHelp')}: <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono">?</kbd>
          </p>
        </div>
      </div>
    </>
  );
}
