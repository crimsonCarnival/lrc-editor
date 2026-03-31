import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Undo2, Redo2, ListChecks, TimerOff, Trash2, MousePointerClick, FileText } from 'lucide-react';

export default function EditorToolbar({
  editorMode,
  setEditorMode,
  updateSetting,
  syncMode,
  undo,
  redo,
  canUndo,
  canRedo,
  lines,
  setSelectedLines,
  selectedLines,
  handleClearTimestamps,
  requestConfirm,
  setLines,
  setRawText,
  setSyncMode
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t('editor')}
        </h2>
        <ToggleGroup
          type="single"
          value={editorMode}
          onValueChange={(val) => {
            if (!val) return;
            setEditorMode(val);
            updateSetting('export.copyFormat', val);
            updateSetting('export.downloadFormat', val);
          }}
          className="bg-zinc-800/80 rounded-lg border border-zinc-700/60 overflow-hidden h-auto p-0 gap-0"
        >
          <ToggleGroupItem
            value="lrc"
            className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto"
          >
            {t('editorModeLRC')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="srt"
            className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto"
          >
            {t('editorModeSRT')}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {syncMode && (
        <div className="flex items-center justify-end gap-1 sm:gap-2 w-full">
          <Button
            id="undo-btn"
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={!canUndo}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            title={t('undoTitle')}
          >
            <Undo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          <Button
            id="redo-btn"
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={!canRedo}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            title={t('redoTitle')}
          >
            <Redo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
          {selectedLines?.size > 0 && (
            <span className="text-[10px] font-mono tabular-nums text-primary/80 select-none whitespace-nowrap">
              {selectedLines.size}/{lines.length}
            </span>
          )}
          <Button
            id="select-all-btn"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (selectedLines?.size === lines.length) {
                setSelectedLines(new Set());
              } else {
                setSelectedLines(new Set(lines.map((_, i) => i)));
              }
            }}
            className={`flex-shrink-0 ${
              selectedLines?.size > 0
                ? 'text-primary hover:text-zinc-300 hover:bg-zinc-800'
                : 'text-zinc-400 hover:text-primary hover:bg-primary/20'
            }`}
            title={selectedLines?.size === lines.length ? t('deselectAll') : t('selectAll')}
          >
            {selectedLines?.size > 0
              ? <ListChecks className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              : <MousePointerClick className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            }
          </Button>
          <Button
            id="clear-timestamps-btn"
            variant="ghost"
            size="icon-sm"
            onClick={handleClearTimestamps}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 flex-shrink-0"
            title={t('clearTimestamps')}
          >
            <TimerOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              requestConfirm(t('confirmRemoveAll'), () => {
                setLines([]);
                setRawText('');
                setSyncMode(false);
              });
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
            title={t('removeAllLyrics')}          >
            <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
