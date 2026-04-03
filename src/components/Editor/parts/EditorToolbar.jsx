import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Undo2, Redo2, ListChecks, TimerOff, Trash2, MousePointerClick, FileText, Repeat, Pencil, Save, Check, Eraser, SquareX, MoreHorizontal, X } from 'lucide-react';

function ActionsDropdown({ children, t }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          title={t('editor.actions', 'Actions')}
        >
          {open ? <X className="w-3.5 h-3.5" /> : <MoreHorizontal className="w-3.5 h-3.5" />}
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}

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
  handleClearActiveLineWordTimestamps,
  requestConfirm,
  setLines,
  setRawText,
  setSyncMode,
  handleManualSave,
  isAutosaving,
  compact,
  overlappingLines,
}) {
  const { t } = useTranslation();
  const hasAnyTimestamp = lines.some((l) => l.timestamp != null);

  const syncProgress = useMemo(() => {
    if (!lines.length) return null;
    const synced = lines.filter(l => l.timestamp != null).length;
    return { synced, total: lines.length };
  }, [lines]);

  // Compact vertical sidebar mode
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 py-1 border-r border-zinc-700/60 pr-2 flex-shrink-0">
        {/* Mode toggle */}
        {lines.length > 0 && (
          <ToggleGroup
            type="single"
            value={editorMode}
            onValueChange={(val) => {
              if (!val) return;
              setEditorMode(val);
              const exportFmt = val === 'words' ? 'lrc' : val;
              updateSetting('export.copyFormat', exportFmt);
              updateSetting('export.downloadFormat', exportFmt);
            }}
            orientation="vertical"
            className="flex flex-col bg-zinc-800/80 rounded-lg border border-zinc-700/60 overflow-hidden p-0 gap-0"
          >
            <ToggleGroupItem
              value="lrc"
              className="px-1.5 py-1 text-[9px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto leading-none"
            >
              LRC
            </ToggleGroupItem>
            <ToggleGroupItem
              value="srt"
              className="px-1.5 py-1 text-[9px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto leading-none"
            >
              SRT
            </ToggleGroupItem>
            <ToggleGroupItem
              value="words"
              disabled={!hasAnyTimestamp}
              className="px-1.5 py-1 text-[9px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto leading-none disabled:opacity-40"
            >
              W
            </ToggleGroupItem>
          </ToggleGroup>
        )}

        {syncMode && (
          <>
            <div className="w-4 h-px bg-zinc-700/80" />
            {/* Back to edit */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setRawText(lines.map(l => l.text).join('\n'));
                setSyncMode(false);
              }}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              title={t('editor.backToEdit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {/* Loop */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => isActiveLineLocked && updateSetting('playback.loopCurrentLine', !settings?.playback?.loopCurrentLine)}
              disabled={!isActiveLineLocked}
              className={`${
                !isActiveLineLocked
                  ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                  : settings?.playback?.loopCurrentLine
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={t('editor.loopCurrentLine')}
            >
              <Repeat className="w-3.5 h-3.5" />
            </Button>
            <div className="w-4 h-px bg-zinc-700/80" />
            {/* Select all */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (selectedLines?.size === lines.length) {
                  setSelectedLines(new Set());
                } else {
                  setSelectedLines(new Set(lines.map((_, i) => i)));
                }
              }}
              className={`${
                selectedLines?.size > 0
                  ? 'text-primary hover:text-zinc-300 hover:bg-zinc-800'
                  : 'text-zinc-400 hover:text-primary hover:bg-primary/20'
              }`}
              title={selectedLines?.size === lines.length ? t('editor.selection.deselectAll') : t('editor.selection.selectAll')}
            >
              {selectedLines?.size > 0
                ? <ListChecks className="w-3.5 h-3.5" />
                : <MousePointerClick className="w-3.5 h-3.5" />
              }
            </Button>
            {/* Clear timestamps */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClearTimestamps}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
              title={t('editor.selection.clearTimestamps')}
            >
              <TimerOff className="w-3.5 h-3.5" />
            </Button>
            <div className="w-4 h-px bg-zinc-700/80" />
            {/* Actions dropdown */}
            <ActionsDropdown t={t}>
              <DropdownMenuContent className="w-44 bg-zinc-900 border-zinc-700/80" side="right" align="start">
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={undo}
                  disabled={!canUndo}
                  className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer gap-2"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {t('editor.undo')} <span className="ml-auto text-[10px] text-zinc-500">Ctrl+Z</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={redo}
                  disabled={!canRedo}
                  className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer gap-2"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  {t('editor.redo')} <span className="ml-auto text-[10px] text-zinc-500">Ctrl+Y</span>
                </DropdownMenuItem>
                {editorMode === 'words' && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700/50" />
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={handleClearAllWordTimestamps}
                      className="text-xs text-orange-400 focus:bg-orange-500/10 focus:text-orange-300 cursor-pointer gap-2"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      {t('editor.clearWordTimestamps')}
                    </DropdownMenuItem>
                    {isActiveLineLocked && (
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={handleClearActiveLineWordTimestamps}
                        className="text-xs text-yellow-500 focus:bg-yellow-500/10 focus:text-yellow-400 cursor-pointer gap-2"
                      >
                        <SquareX className="w-3.5 h-3.5" />
                        {t('editor.clearActiveLineWordTimestamps')}
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {handleManualSave && !settings.advanced?.autoSave?.enabled && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-700/50" />
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      onClick={handleManualSave}
                      className={`text-xs cursor-pointer gap-2 ${
                        isAutosaving
                          ? 'text-primary focus:bg-primary/10 focus:text-primary'
                          : 'text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100'
                      }`}
                    >
                      {isAutosaving ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      {isAutosaving ? (t('session.saved') || 'Saved') : (t('session.save') || 'Save')}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-zinc-700/50" />
                <DropdownMenuItem
                  onClick={() => {
                    requestConfirm(t('confirm.removeAll'), () => {
                      setLines([]);
                      setRawText('');
                      setSyncMode(false);
                    });
                  }}
                  className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('editor.removeAll')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </ActionsDropdown>
          </>
        )}

        {/* Sync progress */}
        {syncMode && syncProgress && (
          <>
            <div className="flex-1" />
            <span className={`text-[9px] font-mono tabular-nums select-none writing-mode-vertical ${
              syncProgress.synced === syncProgress.total
                ? 'text-primary'
                : 'text-zinc-500'
            }`} style={{ writingMode: 'vertical-lr' }}>
              {syncProgress.synced}/{syncProgress.total}
            </span>
          </>
        )}
      </div>
    );
  }

  // Normal horizontal toolbar
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
              const exportFmt = val === 'words' ? 'lrc' : val;
              updateSetting('export.copyFormat', exportFmt);
              updateSetting('export.downloadFormat', exportFmt);
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
              disabled={!hasAnyTimestamp}
              title={!hasAnyTimestamp ? t('editor.wordsNeedsTimestamps') : undefined}
              className="px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('editor.modeWords')}
            </ToggleGroupItem>
          </ToggleGroup>
        )}
        {/* Sync progress badge */}
        {syncMode && syncProgress && (
          <Badge
            variant="outline"
            className={`text-[10px] font-mono tabular-nums border-zinc-700/60 select-none ${
              syncProgress.synced === syncProgress.total
                ? 'text-primary border-primary/40 bg-primary/10'
                : 'text-zinc-500'
            }`}
          >
            {t('editor.syncProgress', { synced: syncProgress.synced, total: syncProgress.total })}
          </Badge>
        )}
        {/* Overlap warning */}
        {syncMode && overlappingLines?.size > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] font-mono tabular-nums border-orange-500/40 bg-orange-500/10 text-orange-400 select-none animate-pulse"
          >
            {t('editor.overlappingTimestamps', { count: overlappingLines.size }) || `${overlappingLines.size} overlapping`}
          </Badge>
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
          {editorMode === 'words' && isActiveLineLocked && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClearActiveLineWordTimestamps}
              className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 flex-shrink-0"
              title={t('editor.clearActiveLineWordTimestamps')}
            >
              <SquareX className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </Button>
          )}
          <div className="w-px h-4 bg-zinc-700/80" />
          {/* Actions dropdown: undo/redo/save/delete */}
          <ActionsDropdown t={t}>
            <DropdownMenuContent className="w-40 bg-zinc-900 border-zinc-700/80" align="end">
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                onClick={undo}
                disabled={!canUndo}
                className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer gap-2"
              >
                <Undo2 className="w-3.5 h-3.5" />
                {t('editor.undo')} <span className="ml-auto text-[10px] text-zinc-500">Ctrl+Z</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                onClick={redo}
                disabled={!canRedo}
                className="text-xs text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer gap-2"
              >
                <Redo2 className="w-3.5 h-3.5" />
                {t('editor.redo')} <span className="ml-auto text-[10px] text-zinc-500">Ctrl+Y</span>
              </DropdownMenuItem>
              {handleManualSave && !settings.advanced?.autoSave?.enabled && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-700/50" />
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    onClick={handleManualSave}
                    className={`text-xs cursor-pointer gap-2 ${
                      isAutosaving
                        ? 'text-primary focus:bg-primary/10 focus:text-primary'
                        : 'text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100'
                    }`}
                  >
                    {isAutosaving
                      ? <Check className="w-3.5 h-3.5" />
                      : <Save className="w-3.5 h-3.5" />}
                    {isAutosaving ? (t('session.saved') || 'Saved') : (t('session.save') || 'Save')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-zinc-700/50" />
              <DropdownMenuItem
                onClick={() => {
                  requestConfirm(t('confirm.removeAll'), () => {
                    setLines([]);
                    setRawText('');
                    setSyncMode(false);
                  });
                }}
                className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('editor.removeAll')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </ActionsDropdown>
        </div>
      )}
    </div>
  );
}
