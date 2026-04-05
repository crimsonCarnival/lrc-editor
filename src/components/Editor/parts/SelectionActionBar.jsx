import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TimerOff, ChevronLeft, ChevronRight, Trash2, X, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Tip } from '@/components/ui/tip';

export default function SelectionActionBar({
  selectedLines,
  settings,
  handleBulkClearTimestamps,
  handleBulkShift,
  handleBulkDelete,
  clearSelection,
  handleApplyOffset,
}) {
  const { t } = useTranslation();

  if (selectedLines.size === 0) return null;

  const shiftAmount = settings.editor?.shiftAllAmount || 0.5;

  return (
    <div className="flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/95 border border-primary/30 rounded-lg shadow-lg animate-fade-in backdrop-blur-md">
      <Badge variant="outline" className="text-[10px] font-bold text-primary border-0 bg-transparent tabular-nums px-1.5">
        {selectedLines.size}
      </Badge>
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.clearTimestamps') || 'Clear timestamps'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleBulkClearTimestamps}
          className="text-orange-400 hover:bg-orange-500/15 hover:text-orange-300"
        >
          <TimerOff className="w-3.5 h-3.5" />
        </Button>
      </Tip>
      <Tip content={`(-${settings.editor?.nudge?.default || 0.1}s)`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleBulkShift(-(settings.editor?.nudge?.default || 0.1))}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
      </Tip>
      <Tip content={`(+${settings.editor?.nudge?.default || 0.1}s)`}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleBulkShift((settings.editor?.nudge?.default || 0.1))}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </Tip>
      {/* Shift All (larger offset) */}
      {settings.editor?.showShiftAll && handleApplyOffset && (
        <>
          <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
          <Tip content={`${t('editor.shiftAll')} (-${shiftAmount}s)`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleApplyOffset(-shiftAmount)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
          </Tip>
          <Tip content={`${t('editor.shiftAll')} (+${shiftAmount}s)`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleApplyOffset(shiftAmount)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </Tip>
        </>
      )}
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.deleteSelected') || 'Delete selected'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleBulkDelete}
          className="text-red-400 hover:bg-red-500/15 hover:text-red-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </Tip>
      <Separator orientation="vertical" className="h-4 bg-zinc-700/50" />
      <Tip content={t('editor.selection.deselectAll') || 'Deselect all (Esc)'}>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={clearSelection}
          className="text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </Tip>
    </div>
  );
}
