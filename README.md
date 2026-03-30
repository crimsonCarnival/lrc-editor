# Lyrics Syncer

A modern web-based application for synchronizing song lyrics with audio. Create, edit, and play LRC (Lyric) files with real-time preview and precise timing control.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://crimsonCarnival.github.io/lrc-editor/)

## Features

- **Audio Player**: Play your music files and monitor playback in real-time. Load local audio files or YouTube URLs.
- **LRC Editor**: Create and edit lyrics with precise timing synchronization.
- **Secondary Lyrics**: Support for romaji, hiragana, translations, and other secondary text layers.
- **Live Preview**: See your lyrics sync with the music as it plays.
- **History Management**: Undo/redo support for editing operations.
- **LRC File Export**: Save your synchronized lyrics in standard LRC format.
- **Multi-language Support**: Interface available in multiple languages via i18n.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:

  ```bash
   git clone https://github.com/crimsonCarnival/lrc-editor.git
   cd lrc-editor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Tech Stack

- **Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Audio Processing**: [WaveSurfer.js](https://wavesurfer-js.org/)
- **Internationalization**: [i18next](https://www.i18next.com/)

## Usage Guide

### Step 1: Load Audio

- Click the **Player** panel on the left side.
- Select your audio file or enter a YouTube URL to load the audio.

### Step 2: Create Lyrics

- In the **Editor** panel, type each line of lyrics you want to synchronize.
- Add secondary lyrics (optional) for translations or phonetic guides.

### Step 3: Synchronize Timing

- Click the **Sync** button as each lyric line appears during playback.
- Or manually adjust timestamps by entering them in `[MM:SS.ms]` format.

### Step 4: Preview & Export

- Verify the timing in the **Preview** panel.
- Export your lyrics as an LRC or SRT file once satisfied.

## LRC File Format

LRC files are text-based with the format:

```lrc
[00:10.50]First line of lyrics
[00:15.20]Second line of lyrics
```

### Extended Format with Secondary Lyrics

For secondary lyrics like romaji, translations, or hiragana, multiple lines with the same timestamp can be used:

```lrc
[00:10.50]Romaji version
[00:10.50]Original lyrics in Japanese
[00:10.50]English translation
```

## License

This project is open-source and available under the MIT License.
