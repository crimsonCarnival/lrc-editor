import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appName: 'LRC Syncer',
      appSubtitle: 'Sync · Preview · Export',
      export: 'Export',
      format: 'Format',
      filename: 'Filename',
      includeTranslations: 'Include translations',
      download: 'Download',
      footerText: 'Lyrics Syncer — Runs entirely in your browser. No data leaves your device.',

      playerTitle: 'Player',
      localFile: 'Local File',
      youtube: 'YouTube',
      remove: 'Remove',
      dropAudio: 'Drop or click to load audio file',
      pasteUrl: 'Paste YouTube URL...',
      load: 'Load',
      focusVocals: 'Focus vocals (EQ)',
      disableVocals: 'Disable vocal focus',
      noMediaText: 'Load an audio file or YouTube link\nto start syncing lyrics',

      syncMode: 'Sync Mode',
      editor: 'Editor',
      removeAllLyrics: 'Remove all lyrics',
      pasteLyricsPlaceholder: 'Pasted lyrics will appear here, one line per line...',
      startSyncing: 'Start Syncing',
      importFile: 'Import ',
      mark: 'Mark',
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear',
      edit: 'Edit',
      undoTitle: 'Undo (Ctrl+Z)',
      redoTitle: 'Redo (Ctrl+Y)',
      jumpSync: 'Jump to sync time',
      minusTime: '-0.1s',
      plusTime: '+0.1s',
      clearTimestamp: 'Clear timestamp',
      markInstruction: 'Press Space or click Mark to stamp the highlighted line',

      previewTitle: 'Preview',
      previewPlaceholder: 'Start syncing to see the karaoke preview...',
      secondaryRomaji: 'Secondary / Romaji',
      translation: 'Translation',
      paste: 'Paste',
      lyricsHeader: 'Lyrics',
      pasteMatchesLineInstruction: 'Paste one line per line. They will be matched in order from top to bottom with your main lyrics timestamps.',
      pasteTextPlaceholder: 'Paste text here...',
      saveTracks: 'Save Tracks',
      cancel: 'Cancel',
      removeLine: 'Remove this line',
      addLine: 'Add line'
    }
  },
  es: {
    translation: {
      appName: 'LRC Syncer',
      appSubtitle: 'Sincronizar · Previsualizar · Exportar',
      export: 'Exportar',
      format: 'Formato',
      filename: 'Archivo',
      includeTranslations: 'Incluir traducciones',
      download: 'Descargar',
      footerText: 'Lyrics Syncer — Se ejecuta íntegramente en el navegador. Ningún dato sale de tu dispositivo.',


      playerTitle: 'Reproductor',
      localFile: 'Archivo Local',
      youtube: 'YouTube',
      remove: 'Eliminar',
      dropAudio: 'Suelta o haz clic para cargar un archivo de audio',
      pasteUrl: 'Pega la URL de YouTube...',
      load: 'Cargar',
      focusVocals: 'Enfocar voces (EQ)',
      disableVocals: 'Desactivar enfoque de voces',
      noMediaText: 'Carga un archivo de audio o enlace de YouTube\npara empezar a sincronizar letras',

      syncMode: 'Modo Sincronizar',
      editor: 'Editor',
      removeAllLyrics: 'Eliminar todas las letras',
      pasteLyricsPlaceholder: 'Las letras pegadas aparecerán aquí, una línea por línea...',
      startSyncing: 'Empezar ',
      importFile: 'Importar ',
      mark: 'Marcar',
      undo: 'Deshacer',
      redo: 'Rehacer',
      clear: 'Limpiar',
      edit: 'Editar',
      undoTitle: 'Deshacer (Ctrl+Z)',
      redoTitle: 'Rehacer (Ctrl+Y)',
      jumpSync: 'Saltar a esta marca',
      minusTime: '-0.1s',
      plusTime: '+0.1s',
      clearTimestamp: 'Borrar marca de tiempo',
      markInstruction: 'Presiona Espacio o haz clic en Marcar para el tiempo de la línea',

      previewTitle: 'Previsualización',
      previewPlaceholder: 'Empieza a sincronizar para ver la vista previa de karaoke...',
      secondaryRomaji: 'Secundaria / Romaji',
      translation: 'Traducción',
      paste: 'Pegar Letra',
      lyricsHeader: '',
      pasteMatchesLineInstruction: 'Pega una línea por línea. Se organizarán en orden de arriba a abajo con las marcas de tiempo de las letras principales.',
      pasteTextPlaceholder: 'Pega tu texto aquí...',
      saveTracks: 'Guardar Pistas',
      cancel: 'Cancelar',
      removeLine: 'Eliminar esta línea',
      addLine: 'Añadir línea'
    }
  },
  ja: {
    translation: {
      appName: 'LRC Syncer',
      appSubtitle: '同期 · プレビュー · エクスポート',
      export: 'エクスポート',
      format: 'フォーマット',
      filename: 'ファイル名',
      includeTranslations: '翻訳を含める',
      download: 'ダウンロード',
      footerText: 'Lyrics Syncer — ブラウザ上で完全に動作します。データはデバイスから送信されません。',


      playerTitle: 'プレイヤー',
      localFile: 'ローカルファイル',
      youtube: 'YouTube',
      remove: '削除',
      dropAudio: '音声ファイルをドロップまたはクリック',
      pasteUrl: 'YouTubeのURLを貼り付け...',
      load: '読み込む',
      focusVocals: 'ボーカルフォーカス(EQ)',
      disableVocals: 'ボーカルフォーカスを無効化',
      noMediaText: '歌詞を同期するには音声ファイルまたは\nYouTubeリンクを読み込んでください',

      syncMode: '同期モード',
      editor: 'エディター',
      removeAllLyrics: 'すべての歌詞を削除',
      pasteLyricsPlaceholder: '貼り付けた歌詞はここに表示されます。一行ずつ...',
      startSyncing: '同期を開始 ',
      importFile: 'インポート ',
      mark: 'マーク',
      undo: '元に戻す',
      redo: 'やり直す',
      clear: 'クリア',
      edit: '編集',
      undoTitle: '元に戻す (Ctrl+Z)',
      redoTitle: 'やり直す (Ctrl+Y)',
      jumpSync: 'この時間にジャンプ',
      minusTime: '-0.1s',
      plusTime: '+0.1s',
      clearTimestamp: 'タイムスタンプをクリア',
      markInstruction: 'Spaceキーを押すか、マークをクリックして時間を記録します',

      previewTitle: 'プレビュー',
      previewPlaceholder: '歌詞の同期を開始すると、カラオケプレビューが表示されます...',
      secondaryRomaji: 'サブ / ローマ字',
      translation: '翻訳',
      paste: '貼り付け',
      lyricsHeader: '歌詞',
      pasteMatchesLineInstruction: '1行ずつ貼り付けてください。メインの歌詞のタイムスタンプと上から順に一致します。',
      pasteTextPlaceholder: 'ここにテキストを貼り付け...',
      saveTracks: 'トラックを保存',
      cancel: 'キャンセル',
      removeLine: 'この行を削除',
      addLine: '行を追加'
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
