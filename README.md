# Lyrics Syncer 🎵

A modern web-based application for synchronizing song lyrics with audio. Create, edit, and play LRC (Lyric) files with real-time preview and precise timing control.

## Features

- **Audio Player**: Play your music files and monitor playback in real-time
- **LRC Editor**: Create and edit lyrics with precise timing synchronization
- **Secondary Lyrics**: Support for romaji, hiragana, translations, and other secondary text layers
- **Live Preview**: See your lyrics sync with the music as it plays
- **History Management**: Undo/redo support for editing operations
- **LRC File Export**: Save your synchronized lyrics in standard LRC format
- **Multi-language Support**: Interface available in multiple languages via i18n

## Getting Started

### Step 1: Load Your Audio or Load a Youtube URL

- Click the **Player** panel on the left side.
- Select your audio file (MP3, WAV, or other supported formats) or enter a YouTube URL to load the audio
- The audio will load and display playback controls

### Step 2: Create Your Lyrics

- In the **Editor** panel under the **Player** panel, start adding your lyrics
- Type each line of lyrics you want to synchronize
- Each line will be matched with a timestamp
- **Add Secondary Lyrics** (optional): Add romaji, hiragana, translations, or other secondary text
  - These can be added as additional layers for each timestamp
  - Perfect for learning languages or providing translations alongside original lyrics
  - Automatically sync secondary lyrics with the primary lyrics for consistent timing

### Step 3: Synchronize Timing

- Click the **Sync** button as each lyric line appears during playback
- The editor will automatically record the exact timestamp
- Or manually adjust timestamps by entering them in `[MM:SS.ms]` format

### Step 4: Preview

- The **Preview** panel in the center shows your lyrics synced with the audio
- Play the track and verify the timing is accurate
- Make adjustments in the Editor as needed

### Step 5: Export

- Once satisfied, export your lyrics as an LRC file
- The file will contain all lyrics with their synchronized timestamps
- Use undo/redo (Ctrl+Z / Ctrl+Y) to revise as needed

## LRC File Format

LRC files are text-based with the format:

```lrc
[00:10.50]First line of lyrics
[00:15.20]Second line of lyrics
[00:20.75]Third line of lyrics
```

The timestamps indicate when each lyric should display during playback.

### Extended Format with Secondary Lyrics

For secondary lyrics like romaji, translations, or hiragana:

```lrc
[00:10.50]Original lyrics - Romaji - Translation
[00:15.20]Next line - Romaji - English translation
[00:20.75]Final line - Romaji - English translation
```

Or with separate lines:

```lrc
[00:10.50]Original lyrics in Japanese
[00:10.50]Romaji version
[00:10.50]English translation
```

This allows you to display multiple language layers or versions simultaneously during playback, making it ideal for language learning or providing context for your audience.
