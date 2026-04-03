# Lyrics Syncer — Feature Implementation Map

Recommendations ordered by estimated impact vs. effort. Each item includes
the files most likely to be touched.

---

## Tier 3 — Larger Features

### 11. Undo/Redo for Player State

Undo currently covers line edits only.  Wrapping media-load / mode changes
would allow a complete session rollback.

| File | Change |
|------|--------|
| `src/hooks/useHistory.js` | Extend snapshot shape |
| `src/hooks/useAppState.js` | Push history on media/mode change |

---

### 12. Keyboard-Shortcut Conflict Detection

Two shortcuts can be set to the same key with no warning.

| File | Change |
|------|--------|
| `src/components/Settings/panels/ShortcutsSettings.jsx` | Compute duplicates and render inline warning badges |
| `src/locales/en.js` / `es.js` | Add "Conflict with {{key}}" label |

---

### 13. Cloud / URL Import for LRC/SRT

Allow pasting a URL to a raw LRC/SRT file (e.g., from a CDN or GitHub Gist).

| File | Change |
|------|--------|
| `src/components/Editor/parts/EditorPasteArea.jsx` | Add URL input field |
| `src/hooks/useAppState.js` | Fetch + parse via existing `parseLRC` |
| `src/locales/en.js` / `es.js` | Add label / error keys |

---

### 14. Word-Level Karaoke Timestamps (Enhanced LRC)

Extended LRC `<mm:ss.xx>word` inline word timing is used by many modern
players.  Requires a new parsing mode and an enhanced editor view.

| File | Change |
|------|--------|
| `src/utils/lrc.js` | Parse / compile `<time>word` tokens |
| `src/components/Editor/parts/EditorLineItem.jsx` | Render per-word timestamp chips |
| `src/components/Preview/PreviewLine.jsx` | Animate word-by-word highlight |
| `src/locales/en.js` / `es.js` | New section of keys |

---

### 15. Shareable Session URL

Encode the current lines + settings into a URL fragment (base64 / compression)
so a session can be shared or bookmarked without a server.

| File | Change |
|------|--------|
| `src/hooks/useAppState.js` | Add export-to-URL / import-from-URL helpers |
| `src/App.jsx` | Read URL hash on mount |
| `src/components/Settings/` | Add "Share Session" button |

---

*Generated 2026-04-01. Reflects current codebase state at the time of analysis.*
