import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Undo2, Redo2, ListChecks, TimerOff, Trash2, MousePointerClick, FileText, Repeat, Pencil, Save, Check, Eraser } from 'lucide-react';

export default function EditorToolbar({
  editorMode,
  setEditorMode,
  updateSetting,
  settings,
  isActiveLineLocked,
  syncMode,
  undo,
  redo,
  canUndo,
  canRedo,
  lines,
  setSelectedLines,
  selectedLines,
  handleClearTimestamps,
  handleClearAllWordTimestamps,
  requestConfirm,
  setLines,
  setRawText,
  setSyncMode,
  handleManualSave,
  isAutosaving,
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t('editor.title')}
        </h2>
        {syncMode && lines.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setRawText(lines.map(l => l.text).join('\n'));
              setSyncMode(false);
            }}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            title={t('editor.backToEdit')}
          >
            <Pencil className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
        )}
        {lines.length > 0 && (
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
              {t('editor.modeLRC')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="srt"
              className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto"
            >
              {t('editor.modeSRT')}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="words"
              className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto"
            >
              {t('editor.modeWords')}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
      {syncMode && (
        <div className="flex items-center justify-end gap-1.5 w-full">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => isActiveLineLocked && updateSetting('playback.loopCurrentLine', !settings?.playback?.loopCurrentLine)}
            disabled={!isActiveLineLocked}
            className={`flex-shrink-0 transition-colors ${
              !isActiveLineLocked
                ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                : settings?.playback?.loopCurrentLine
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={t('editor.loopCurrentLine')}
          >
            <Repeat className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-700/80" />
          <Button
            id="undo-btn"
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={!canUndo}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            title={t('editor.undoTitle')}
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
            title={t('editor.redoTitle')}
          >
            <Redo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-700/80" />
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
            title={selectedLines?.size === lines.length ? t('editor.selection.deselectAll') : t('editor.selection.selectAll')}
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
            title={t('editor.selection.clearTimestamps')}
          >
            <TimerOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </Button>
          {editorMode === 'words' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClearAllWordTimestamps}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 flex-shrink-0"
              title={t('editor.clearWordTimestamps')}
            >
              <Eraser className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Button>
          )}
          {handleManualSave && !settings.advanced?.autoSave?.enabled && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleManualSave}
              className={`flex-shrink-0 transition-colors ${
                isAutosaving
                  ? 'text-primary hover:text-primary hover:bg-primary/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={isAutosaving ? (t('session.saved') || 'Saved') : (t('session.save') || 'Save')}
            >
              {isAutosaving
                ? <Check className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                : <Save className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
            </Button>
          )}
          <div className="w-px h-4 bg-zinc-700/80" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              requestConfirm(t('confirm.removeAll'), () => {
                setLines([]);
                setRawText('');
                setSyncMode(false);
              });
            }}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-shrink-0"
            title={t('editor.removeAll')}          >
            <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
