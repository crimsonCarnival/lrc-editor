import { useEditor } from './useEditor';
import EditorToolbar from './EditorToolbar';
import EditorPasteArea from './EditorPasteArea';
import EditorLineItem from './EditorLineItem';
import SelectionActionBar from './SelectionActionBar';
import EditorSyncControls from './EditorSyncControls';

export default function Editor({
  lines,
  setLines,
  syncMode,
  setSyncMode,
  activeLineIndex,
  setActiveLineIndex,
  playbackPosition,
  playerRef,
  undo,
  redo,
  canUndo,
  canRedo,
  editorMode,
  setEditorMode,
}) {
  const {
    rawText,
    setRawText,
    editingLineIndex,
    setEditingLineIndex,
    editingText,
    setEditingText,
    dragIndex,
    dragOverIndex,
    offsetValue,
    setOffsetValue,
    selectedLines,
    setSelectedLines,
    awaitingEndMark,
    focusedTimestamp,
    setFocusedTimestamp,
    displayedActiveIndex,
    isActiveLineLocked,
    handleLineHover,
    handleLineHoverEnd,
    activeLineRef,
    listRef,
    fileInputRef,
    handleConfirmLyrics,
    handleFileUpload,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleSaveLineText,
    handleDeleteLine,
    handleAddLine,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleApplyOffset,
    handleLineClick,
    clearSelection,
    handleBulkClearTimestamps,
    handleBulkDelete,
    handleBulkShift,
    requestConfirm,
    confirmModal,
    settings,
    updateSetting,
  } = useEditor({
    lines,
    setLines,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    playerRef,
    editorMode,
    setEditorMode,
  });

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in">
      <EditorToolbar
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        updateSetting={updateSetting}
        syncMode={syncMode}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        lines={lines}
        setSelectedLines={setSelectedLines}
        handleClearTimestamps={handleClearTimestamps}
        requestConfirm={requestConfirm}
        setLines={setLines}
        setRawText={setRawText}
        setSyncMode={setSyncMode}
      />

      {/* Edit Mode */}
      {!syncMode && (
        <EditorPasteArea
          rawText={rawText}
          setRawText={setRawText}
          handleConfirmLyrics={handleConfirmLyrics}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
        />
      )}

      {/* Sync Mode */}
      {syncMode && (
        <div className="flex flex-col flex-1 gap-3 animate-fade-in min-h-0">
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 mask-edges">
            {lines.map((line, i) => {
              const isActive = i === displayedActiveIndex;
              const isSynced = line.timestamp != null;
              let nextTimestamp = null;
              for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].timestamp != null) {
                  nextTimestamp = lines[j].timestamp;
                  break;
                }
              }

              return (
                <EditorLineItem
                  key={line.id || i}
                  line={{ ...line, nextTimestamp }}
                  i={i}
                  isActive={isActive}
                  isLocked={isActiveLineLocked && i === activeLineIndex}
                  isSynced={isSynced}
                  editorMode={editorMode}
                  awaitingEndMark={awaitingEndMark}
                  focusedTimestamp={focusedTimestamp}
                  setFocusedTimestamp={setFocusedTimestamp}
                  activeLineRef={activeLineRef}
                  handleLineClick={handleLineClick}
                  handleLineHover={handleLineHover}
                  handleLineHoverEnd={handleLineHoverEnd}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDragEnd={handleDragEnd}
                  handleDrop={handleDrop}
                  dragOverIndex={dragOverIndex}
                  dragIndex={dragIndex}
                  selectedLines={selectedLines}
                  settings={settings}
                  editingLineIndex={editingLineIndex}
                  setEditingLineIndex={setEditingLineIndex}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  handleSaveLineText={handleSaveLineText}
                  playerRef={playerRef}
                  shiftTime={shiftTime}
                  handleAddLine={handleAddLine}
                  handleClearLine={handleClearLine}
                  handleDeleteLine={handleDeleteLine}
                  isLastLine={i === lines.length - 1}
                />
              );
            })}
          </div>

          <SelectionActionBar
            selectedLines={selectedLines}
            settings={settings}
            handleBulkClearTimestamps={handleBulkClearTimestamps}
            handleBulkShift={handleBulkShift}
            handleBulkDelete={handleBulkDelete}
            clearSelection={clearSelection}
          />

          <EditorSyncControls
            handleMark={handleMark}
            settings={settings}
            offsetValue={offsetValue}
            setOffsetValue={setOffsetValue}
            handleApplyOffset={handleApplyOffset}
            selectedLines={selectedLines}
            editorMode={editorMode}
            awaitingEndMark={awaitingEndMark}
          />
        </div>
      )}

      {confirmModal}
    </div>
  );
}
