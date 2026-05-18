import { InlineTimestampEdit } from '../line/InlineTimestampEdit';
import { TimestampBadge } from '../line/TimestampBadge';

export default function LrcModeColumn({
  line,
  lineIndex,
  isSynced,
  isActive,
  settings,
  editingTimestamp,
  setEditingTimestamp,
  focusedTimestamp,
  setFocusedTimestamp,
  handleSetTimestamp,
  handleTimestampWheel,
  nudgeIndicator,
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {editingTimestamp === 'start' && isSynced ? (
          <InlineTimestampEdit
            value={line.timestamp}
            precision={settings.editor?.timestampPrecision || 'hundredths'}
            onChange={(val) => { handleSetTimestamp(lineIndex, 'start', val); setEditingTimestamp(null); }}
            onCancel={() => setEditingTimestamp(null)}
          />
        ) : (
          <TimestampBadge
            value={line.timestamp}
            isSynced={isSynced}
            isFocused={focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start'}
            isActive={isActive}
            precision={settings.editor?.timestampPrecision || 'hundredths'}
            onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === lineIndex && focusedTimestamp?.type === 'start' ? null : { lineIndex: lineIndex, type: 'start' })}
            onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
            onWheel={(e) => { if (isSynced) handleTimestampWheel(e, lineIndex, 'start'); }}
            nudgeIndicator={isSynced ? nudgeIndicator : null}
          />
        )}
      </div>
    </div>
  );
}
