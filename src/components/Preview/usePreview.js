import { useEffect, useRef, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import { compileLRC, compileSRT, downloadLRC } from '../../utils/lrc';
import { matchKey } from '../../utils/keyboard';

export function usePreview({ lines, setLines, playbackPosition, playerRef, duration, mediaTitle, editorMode }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [pastingType, setPastingType] = useState(null);
  const [pasteText, setPasteText] = useState('');

  const [exportFilename, setExportFilename] = useState(() =>
    settings.export?.defaultFilenamePattern === 'media' && mediaTitle ? mediaTitle : 'lyrics'
  );
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [includeTranslations, setIncludeTranslations] = useState(false);
  const [includeSecondary, setIncludeSecondary] = useState(true);
  const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [showTranslationsInPreview, setShowTranslationsInPreview] = useState(true);
  const [wasCopied, setWasCopied] = useState(false);
  const [metadata, setMetadata] = useState({ ti: '', ar: '', al: '', lg: '' });

  const [prevMediaTitle, setPrevMediaTitle] = useState(mediaTitle);
  if (mediaTitle !== prevMediaTitle) {
    setPrevMediaTitle(mediaTitle);
    if (settings.export?.defaultFilenamePattern === 'media' && mediaTitle) {
      setExportFilename(mediaTitle);
    }
  }

  const sizeOption = settings.interface?.fontSize || 'normal';
  const spacingOption = settings.interface?.spacing || 'normal';

  const activeFontSizes = {
    small: 'text-base sm:text-lg',
    normal: 'text-lg sm:text-2xl',
    large: 'text-xl sm:text-3xl',
    xlarge: 'text-2xl sm:text-4xl'
  };
  const inactiveFontSizes = {
    small: 'text-xs sm:text-sm',
    normal: 'text-sm sm:text-lg',
    large: 'text-base sm:text-xl',
    xlarge: 'text-lg sm:text-2xl'
  };
  const activeSecondarySizes = {
    small: 'text-[10px] sm:text-xs',
    normal: 'text-xs sm:text-sm',
    large: 'text-sm sm:text-base',
    xlarge: 'text-base sm:text-lg'
  };
  const inactiveSecondarySizes = {
    small: 'text-[9px] sm:text-[10px]',
    normal: 'text-xs',
    large: 'text-sm',
    xlarge: 'text-sm sm:text-base'
  };
  const wrapperSpacing = {
    compact: 'space-y-0',
    normal: 'space-y-1',
    relaxed: 'space-y-3'
  };
  const activeMargin = {
    compact: 'my-0.5 sm:my-1',
    normal: 'my-1 sm:my-2',
    relaxed: 'my-2 sm:my-4'
  };

  const syncedIndices = useMemo(() => {
    const indices = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestamp != null) {
        indices.push(i);
      }
    }
    return indices;
  }, [lines]);

  // Expanded flat list of {lineIdx, ts} including extraTimestamps, sorted by ts.
  // Used for binary-search active-line detection so repeated-chorus lines activate at every timestamp.
  const syncedEntries = useMemo(() => {
    const entries = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.timestamp != null) {
        entries.push({ lineIdx: i, ts: line.timestamp });
        if (line.extraTimestamps?.length) {
          for (const ts of line.extraTimestamps) {
            entries.push({ lineIdx: i, ts });
          }
        }
      }
    }
    entries.sort((a, b) => a.ts - b.ts);
    return entries;
  }, [lines]);

  const currentIndex = useMemo(() => {
    if (!syncedEntries.length) return -1;

    let low = 0;
    let high = syncedEntries.length - 1;
    let bestIdx = -1;

    while (low <= high) {
      const mid = (low + high) >>> 1;
      const { lineIdx, ts } = syncedEntries[mid];
      const line = lines[lineIdx];

      if (ts <= playbackPosition) {
        if (editorMode === 'srt') {
          if (line.endTime != null && playbackPosition >= line.endTime) {
            low = mid + 1;
          } else {
            bestIdx = lineIdx;
            low = mid + 1;
          }
        } else {
          bestIdx = lineIdx;
          low = mid + 1;
        }
      } else {
        high = mid - 1;
      }
    }

    return bestIdx;
  }, [syncedEntries, lines, playbackPosition, editorMode]);

  useEffect(() => {
    if (activeRef.current && containerRef.current && settings.editor?.scroll?.alignment !== 'none') {
      const container = containerRef.current;
      const element = activeRef.current;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      const elementTop = elementRect.top - containerRect.top + container.scrollTop;
      let scrollTo = container.scrollTop;

      if (settings.editor?.scroll?.alignment === 'center') {
        scrollTo = elementTop - (containerRect.height / 2) + (elementRect.height / 2);
      } else if (settings.editor?.scroll?.alignment === 'start') {
        scrollTo = elementTop;
      } else if (settings.editor?.scroll?.alignment === 'end') {
        scrollTo = elementTop - containerRect.height + elementRect.height;
      } else {
        if (elementRect.top < containerRect.top) {
          scrollTo = elementTop;
        } else if (elementRect.bottom > containerRect.bottom) {
          scrollTo = elementTop - containerRect.height + elementRect.height;
        }
      }

      container.scrollTo({
        top: scrollTo,
        behavior: settings.editor?.scroll?.mode || 'smooth',
      });
    }
  }, [currentIndex, settings.editor?.scroll?.mode, settings.editor?.scroll?.alignment]);

  const hasSyncedLines = syncedIndices.length > 0;
  const hasTranslations = lines.some(l => l.translation);
  const hasSecondary = lines.some(l => l.secondary);
  const hasWords = lines.some(l => l.words?.length);

  // ——— Preview keyboard shortcuts ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (pastingType) return; // paste panel open — don't intercept
      if (matchKey(e, settings.shortcuts?.toggleTranslation?.[0] || 't')) {
        e.preventDefault();
        setShowTranslationsInPreview((prev) => !prev);
      } else if (matchKey(e, settings.shortcuts?.addSecondary?.[0] || 'Shift+H')) {
        e.preventDefault();
        setPastingType('secondary');
        setPasteText(lines.map((l) => l.secondary || '').join('\n'));
      } else if (matchKey(e, settings.shortcuts?.addTranslation?.[0] || 'Shift+T')) {
        e.preventDefault();
        setPastingType('translation');
        setPasteText(lines.map((l) => l.translation || '').join('\n'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts, lines, pastingType]);

  const handleSavePaste = () => {
    if (!pastingType) return;
    const newTexts = pasteText.split('\n');
    setLines((prev) =>
      prev.map((l, i) => ({
        ...l,
        [pastingType]: newTexts[i] !== undefined ? newTexts[i].trim() : l[pastingType],
      }))
    );
    setPastingType(null);
    setPasteText('');
    setShowMenu(false);
  };

  const handleLineClick = (line) => {
    if (line.timestamp != null && playerRef?.current?.seek) {
      playerRef.current.seek(line.timestamp);
      playerRef.current.play();
    }
  };

  const prepareExportLines = (inputLines) => {
    let result = inputLines;
    if (settings.export?.stripEmptyLines) {
      result = result.filter(l => l.text.trim() !== '');
    }
    if (settings.export?.normalizeTimestamps) {
      result = [...result].sort((a, b) => {
        if (a.timestamp == null && b.timestamp == null) return 0;
        if (a.timestamp == null) return 1;
        if (b.timestamp == null) return -1;
        return a.timestamp - b.timestamp;
      });
    }
    return result;
  };

  const applyIncludeFlags = (inputLines) => {
    let result = inputLines;
    if (!includeSecondary) {
      result = result.map(l => ({ ...l, secondary: undefined }));
    }
    if (!includeWordTimestamps) {
      result = result.map(l => ({ ...l, words: undefined }));
    }
    return result;
  };

  const handleExport = () => {
    const name = exportFilename.trim() || 'lyrics';
    const exportLines = applyIncludeFlags(prepareExportLines(lines));
    let content = '';

    if (settings.export?.downloadFormat === 'srt') {
      content = compileSRT(exportLines, duration, includeTranslations, settings.export?.lineEndings, settings.editor?.srt);
      downloadLRC(content, `${name}.srt`);
    } else {
      const filteredMetadata = includeMetadata
        ? Object.fromEntries(Object.entries(metadata).filter(([, v]) => v.trim() !== ''))
        : {};
      content = compileLRC(exportLines, includeTranslations, settings.export?.timestampPrecision, filteredMetadata, settings.export?.lineEndings);
      downloadLRC(content, `${name}.lrc`);
    }

    setShowExportPanel(false);
    toast.success(t('export.success') || 'File downloaded');
  };

  const handleCopy = async () => {
    const exportLines = applyIncludeFlags(prepareExportLines(lines));
    let content = '';

    if (settings.export?.copyFormat === 'srt') {
      content = compileSRT(exportLines, duration, includeTranslations, settings.export?.lineEndings, settings.editor?.srt);
    } else {
      const filteredMetadata = includeMetadata
        ? Object.fromEntries(Object.entries(metadata).filter(([, v]) => v.trim() !== ''))
        : {};
      content = compileLRC(exportLines, includeTranslations, settings.export?.timestampPrecision, filteredMetadata, settings.export?.lineEndings);
    }
    try {
      await navigator.clipboard.writeText(content);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
      toast.error(t('export.copyFailed') || 'Failed to copy to clipboard');
    }
  };

  return {
    t,
    settings,
    containerRef,
    activeRef,
    showMenu,
    setShowMenu,
    pastingType,
    setPastingType,
    pasteText,
    setPasteText,
    exportFilename,
    setExportFilename,
    showExportPanel,
    setShowExportPanel,
    includeTranslations,
    setIncludeTranslations,
    includeSecondary,
    setIncludeSecondary,
    includeWordTimestamps,
    setIncludeWordTimestamps,
    includeMetadata,
    setIncludeMetadata,
    showTranslationsInPreview,
    setShowTranslationsInPreview,
    wasCopied,
    metadata,
    setMetadata,
    sizeOption,
    spacingOption,
    activeFontSizes,
    inactiveFontSizes,
    activeSecondarySizes,
    inactiveSecondarySizes,
    wrapperSpacing,
    activeMargin,
    currentIndex,
    hasSyncedLines,
    hasTranslations,
    hasSecondary,
    hasWords,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  };
}
