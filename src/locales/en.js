export default {
  "translation": {
    "app": {
      "name": "LRC Syncer",
      "footer": "Lyrics Syncer — Runs entirely in your browser. No data leaves your device."
    },

    "player": {
      "title": "Player",
      "localFile": "Local File",
      "youtube": "YouTube",
      "remove": "Remove media",
      "dropAudio": "Drop or click to load audio file",
      "pasteUrl": "Paste YouTube URL...",
      "load": "Load",
      "noMedia": "Load an audio file or YouTube link\nto start syncing lyrics",
      "speed": "Speed",
      "customSpeed": "Custom",
      "invalidUrl": "Invalid YouTube URL. Please check the link.",
      "volume": "Volume",
      "mute": "Mute",
      "unmute": "Unmute"
    },

    "editor": {
      "title": "Editor",
      "syncMode": "Editor",
      "removeAll": "Remove all lyrics",
      "pastePlaceholder": "Pasted lyrics will appear here, one line per line...",
      "startSyncing": "Start Syncing",
      "importFile": "Import ",
      "mark": "Mark",
      "undo": "Undo",
      "redo": "Redo",
      "clear": "Clear",
      "edit": "Edit",
      "undoTitle": "Undo (Ctrl+Z)",
      "redoTitle": "Redo (Ctrl+Y)",
      "jumpSync": "Jump to sync time",
      "minusTime": "-0.1s",
      "plusTime": "+0.1s",
      "clearTimestamp": "Clear timestamp",
      "markInstruction": "Press Space or click Mark to stamp the highlighted line",
      "markEndInstruction": "Press Space again to mark end time",
      "markInstructionSRT": "Press Space to mark start, Space again for end time",
      "dragToReorder": "Drag to reorder",
      "addLine": "Add line",
      "removeLine": "Remove this line",
      "editLine": "Edit text (Double-click)",
      "shiftAll": "Shift All",
      "shiftAllTitle": "Shift all timestamps by a value",
      "modeLRC": "LRC",
      "modeSRT": "SRT",
      "startTime": "Start",
      "endTime": "End",
      "syncModeOnly": "Editor only",
      "selection": {
        "hint": "Shift+Click: range · Ctrl+Click: toggle · Esc: deselect",
        "selected": "selected",
        "clearTimestamps": "Clear timestamps",
        "deleteSelected": "Delete selected",
        "deselectAll": "Deselect all",
        "selectAll": "Select all",
        "rangeHint": "Shift+Click to select range"
      }
    },

    "preview": {
      "title": "Preview",
      "placeholder": "Start syncing to see the karaoke preview...",
      "toggleTranslations": "Toggle translations",
      "secondaryLyrics": "Secondary",
      "translation": "Translation",
      "lyricsHeader": "Lyrics",
      "pasteInstruction": "Paste one line per line. They will be matched in order from top to bottom with your main lyrics timestamps.",
      "pastePlaceholder": "Paste text here...",
      "saveTracks": "Save Tracks",
      "clickToSeek": "Click to jump to this line",
      "locked": "Click to unlock line",
      "hoverHint": "Click to jump to this line",
      "copyToClipboard": "Copy",
      "includeTranslations": "Include translations"
    },

    "export": {
      "title": "Export",
      "format": "Format",
      "filename": "Filename",
      "download": "Download",
      "metadata": "LRC Metadata",
      "metaTitle": "Title",
      "metaArtist": "Artist",
      "metaAlbum": "Album",
      "metaLanguage": "Language",
      "continue": "Export",
      "success": "File downloaded",
      "copyFailed": "Failed to copy to clipboard"
    },

    "session": {
      "restored": "Previous session restored",
      "restoreTitle": "Session Found",
      "restoreMessage": "Your sync data from a previous session was saved. Please re-load your audio file to continue editing.",
      "restoreLines": "synced lines saved",
      "restore": "Restore",
      "discard": "Discard"
    },

    "confirm": {
      "action": "Whoah there...",
      "confirm": "Confirm",
      "cancel": "Cancel",
      "clearTimestamps": "Clear all timestamps?",
      "deleteLine": "Delete this line?",
      "bulkClear": "Clear timestamps for selected lines?",
      "bulkDelete": "Delete selected lines?",
      "removeAll": "Remove all lyrics?",
      "removeMedia": "Remove currently loaded media?"
    },

    "import": {
      "success": "Imported {{count}} lines",
      "failed": "Failed to parse lyrics file",
      "noLines": "No lyrics found in file",
      "tooLarge": "File too large (max 5 MB)"
    },

    "network": {
      "offline": "No internet connection",
      "online": "Back online"
    },

    "common": {
      "paste": "Paste",
      "apply": "Apply",
      "copied": "Copied!",
      "saved": "Saved!",
      "global": "Global"
    },

    "shortcuts": {
      "title": "Keyboard Shortcuts",
      "playPause": "Play / Pause",
      "mark": "Mark current line",
      "nudgeLeft": "Nudge timestamp -{{val}}s",
      "nudgeRight": "Nudge timestamp +{{val}}s",
      "undo": "Undo",
      "redo": "Redo",
      "help": "Show shortcuts",
      "seekBackward": "Seek back {{val}}s",
      "seekForward": "Seek forward {{val}}s",
      "mute": "Mute / Unmute",
      "speedUp": "Speed up",
      "speedDown": "Speed down",
      "toggleTranslation": "Toggle translations",
      "addSecondary": "Add secondary lyrics",
      "addTranslation": "Add translations",
      "selection": {
        "title": "Selection",
        "click": "Click",
        "dblClick": "Double-click",
        "rangeSelect": "Select range of lines",
        "toggleSelect": "Toggle line selection",
        "deselect": "Deselect all / Close",
        "deleteSelected": "Delete selected lines",
        "editLine": "Edit line text"
      },
      "tabs": {
        "player": "Player",
        "editor": "Editor",
        "preview": "Preview"
      },
      "sections": {
        "playback": "Playback",
        "preview": "Preview"
      }
    },

    "settings": {
      "title": "Settings",
      "search": "Search settings...",
      "searchTitle": "Search settings by name or description...",
      "reset": "Reset defaults",
      "manualSave": "Save Session",
      "applyChanges": "Apply Changes",

      "playback": {
        "label": "Playback",
        "autoRewind": "Auto-rewind on pause",
        "autoRewindDesc": "Seconds to jump back when pausing playback",
        "autoPauseOnMark": "Auto-pause on mark",
        "autoPauseOnMarkDesc": "Pause playback momentarily after marking a line",
        "minSpeed": "Minimum speed",
        "minSpeedDesc": "Lowest playback speed available",
        "maxSpeed": "Maximum speed",
        "maxSpeedDesc": "Highest playback speed available",
        "showWaveform": "Waveform",
        "showWaveformDesc": "Show the audio waveform visualization",
        "seekTime": "Seek time",
        "seekTimeDesc": "Seconds to seek when using seek shortcuts"
      },

      "editor": {
        "label": "Editor",
        "nudgeIncrement": "Nudge increment",
        "nudgeIncrementDesc": "Seconds to shift when nudging timestamps",
        "autoAdvance": "Auto-advance after mark",
        "autoAdvanceDesc": "Move to the next line after marking",
        "skipBlank": "Skip blank lines",
        "skipBlankDesc": "Skip empty or ♪ lines when advancing",
        "showShiftAll": "Show Shift All",
        "showShiftAllDesc": "Show the global timestamp offset buttons",
        "shiftAllAmount": "Shift All amount",
        "shiftAllAmountDesc": "Seconds applied per Shift All press",
        "showLineNumbers": "Show line numbers",
        "showLineNumbersDesc": "Display line numbers in the editor",
        "timestampPrecision": "Timestamp precision",
        "timestampPrecisionDesc": "Decimal places in editor timestamps"
      },

      "export": {
        "label": "Export",
        "copyFormat": "Copy format",
        "copyFormatDesc": "File format used when copying to clipboard",
        "downloadFormat": "Download format",
        "downloadFormatDesc": "File format used when downloading",
        "timestampPrecision": "Timestamp precision",
        "timestampPrecisionDesc": "Decimal places in exported timestamps",
        "filenamePattern": "Default filename",
        "filenamePatternDesc": "How the export filename is pre-filled",
        "filenameFixed": "Fixed (\"lyrics\")",
        "filenameMedia": "From media title",
        "lineEndings": "Line endings",
        "lineEndingsDesc": "Format for newlines in exported files"
      },

      "interface": {
        "label": "Interface",
        "language": "Default language",
        "languageDesc": "Default application language and menus",
        "theme": "Theme",
        "themeDesc": "Application color scheme",
        "scrollBehavior": "Scroll animation",
        "scrollBehaviorDesc": "How the active line scrolls into view",
        "scrollSmooth": "Smooth",
        "scrollInstant": "Instant",
        "scrollBlock": "Scroll alignment",
        "scrollBlockDesc": "Where the active line is positioned",
        "scrollCenter": "Center",
        "scrollNearest": "Nearest",
        "previewAlignment": "Preview alignment",
        "previewAlignmentDesc": "Text alignment in the preview panel",
        "alignLeft": "Left",
        "alignCenter": "Center",
        "alignRight": "Right",
        "fontSize": "Font size",
        "fontSizeDesc": "Size of the lyrics text",
        "spacing": "Spacing",
        "spacingDesc": "Vertical space between lines",
        "activeLineHighlight": "Active line style",
        "activeLineHighlightDesc": "How the current line is highlighted in preview"
      },

      "advanced": {
        "label": "Advanced",
        "autoSave": "Auto-save",
        "autoSaveDesc": "Automatically save session data",
        "autoSaveInterval": "Save interval",
        "autoSaveIntervalDesc": "How often to auto-save",
        "confirmDestructive": "Confirm destructive actions",
        "confirmDestructiveDesc": "Ask before clearing or deleting",
        "timezone": "Timezone",
        "timezoneDesc": "Override detected timezone for saved timestamps",
        "timezoneAuto": "Auto"
      },

      "shortcuts": {
        "label": "Shortcuts",
        "playerSection": "Player",
        "previewSection": "Preview",
        "clickModifiersSection": "Click Modifiers",
        "markLabel": "Mark Timestamp",
        "markDesc": "Key to mark start/end times",
        "nudgeLeftLabel": "Nudge Left",
        "nudgeLeftDesc": "Subtract {{val}}s from timestamp",
        "nudgeRightLabel": "Nudge Right",
        "nudgeRightDesc": "Add {{val}}s to timestamp",
        "addLineLabel": "Add Line",
        "addLineDesc": "Add new line below active line",
        "deleteLineLabel": "Delete Line",
        "deleteLineDesc": "Delete active line (or selection)",
        "clearTimestampLabel": "Clear Timestamp",
        "clearTimestampDesc": "Clear timestamp on active line",
        "switchModeLabel": "Switch Mode",
        "switchModeDesc": "Toggle LRC/SRT editor mode",
        "deselectLabel": "Deselect / Close",
        "deselectDesc": "Clear selection or close dialogs",
        "showHelpLabel": "Show Shortcuts",
        "showHelpDesc": "Open the keyboard shortcuts dialog",
        "rangeSelectLabel": "Select a range",
        "rangeSelectDesc": "Hold this key + Click to select a continuous block of lines",
        "toggleSelectLabel": "Pick individual lines",
        "toggleSelectDesc": "Hold this key + Click to add/remove single lines from the selection",
        "playPauseLabel": "Play / Pause",
        "playPauseDesc": "Toggle playback",
        "seekBackwardLabel": "Seek Backward",
        "seekBackwardDesc": "Seek back {{val}}s",
        "seekForwardLabel": "Seek Forward",
        "seekForwardDesc": "Seek forward {{val}}s",
        "muteLabel": "Mute / Unmute",
        "muteDesc": "Toggle audio mute",
        "speedUpLabel": "Speed Up",
        "speedUpDesc": "Increase playback speed by nudge amount",
        "speedDownLabel": "Speed Down",
        "speedDownDesc": "Decrease playback speed by nudge amount",
        "toggleTranslationLabel": "Toggle Translations",
        "toggleTranslationDesc": "Show or hide translations in preview",
        "addSecondaryLabel": "Add Secondary Lyrics",
        "addSecondaryDesc": "Open secondary lyrics paste panel",
        "addTranslationLabel": "Add Translations",
        "addTranslationDesc": "Open translation paste panel"
      },

      "options": {
        "sizes": {
          "small": "Small",
          "normal": "Normal",
          "large": "Large",
          "xLarge": "Extra Large"
        },
        "spacing": {
          "compact": "Compact",
          "normal": "Normal",
          "relaxed": "Relaxed"
        },
        "themes": {
          "dark": "Dark",
          "light": "Light",
          "system": "System"
        },
        "highlights": {
          "glow": "Glow",
          "zoom": "Zoom",
          "color": "Bright Color",
          "dim": "Dim Others"
        }
      }
    }
  }
};
