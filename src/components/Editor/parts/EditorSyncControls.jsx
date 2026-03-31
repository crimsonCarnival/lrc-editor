import { useTranslation } from 'react-i18next';
import NumberInput from '../../shared/NumberInput';
import { Kbd } from '../../shared/Kbd';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { KEY_SYMBOLS } from '../../Settings/keySymbols';

export default function EditorSyncControls({
  handleMark,
  settings,
  offsetValue,
  setOffsetValue,
  handleApplyOffset,
  selectedLines,
  editorMode,
  awaitingEndMark
}) {
  const { t } = useTranslation();

  const rangeKey = settings.shortcuts?.rangeSelect?.[0] || 'Shift';
  const toggleKey = settings.shortcuts?.toggleSelect?.[0] || 'Ctrl';
  const deselectKey = settings.shortcuts?.deselect?.[0] || 'Escape';
  const selectionHintText = `${KEY_SYMBOLS[rangeKey] ?? rangeKey}+Click: range · ${KEY_SYMBOLS[toggleKey] ?? toggleKey}+Click: toggle · ${KEY_SYMBOLS[deselectKey] ?? deselectKey}: deselect`;

  return (
    <>
      <div className="flex flex-row gap-2 pt-2 border-t border-zinc-800/50 overflow-x-auto items-center">
        <Button
          id="mark-btn"
          onClick={handleMark}
          title={t('mark')}
          className="px-4 sm:px-6 h-8 sm:h-9 gap-1.5 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-lg glow-primary flex-shrink-0"
        >
          <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs sm:text-sm">{t('mark')}</span>
          <Kbd className="ml-1 hidden sm:inline-flex">{settings.shortcuts?.mark?.[0] === 'Space' ? '␣' : (settings.shortcuts?.mark?.[0] || 'Space')}</Kbd>
        </Button>

        {/* Global offset shift */}
        {settings.editor?.showShiftAll && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-px h-6 bg-zinc-800/80 mx-1 hidden sm:block" />
            <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0 hidden md:inline">{t('shiftAll')}</span>
            <NumberInput
              step={0.1}
              value={offsetValue}
              onChange={(e) => setOffsetValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyOffset()}
              placeholder="±0.0s"
              className="w-20"
              id="shift-all-input"
            />
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-600 text-center">
        {selectedLines.size > 0
          ? selectionHintText
          : editorMode === 'srt'
            ? (awaitingEndMark != null ? t('markEndInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space') : t('markInstructionSRT').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space'))
            : t('markInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
        }
      </p>
    </>
  );
}
