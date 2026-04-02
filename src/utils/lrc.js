/**
 * LRC / SRT utilities — format timestamps, compile, parse, download.
 */

/**
 * Formats a number of seconds into LRC timestamp format [mm:ss.xx] or [mm:ss.xxx]
 * @param {number} seconds
 * @param {'hundredths'|'thousandths'} precision
 * @returns {string}
 */
export function formatTimestamp(seconds, precision = 'hundredths') {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return precision === 'thousandths' ? '[00:00.000]' : '[00:00.00]';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, '0');
  const decimals = precision === 'thousandths' ? 3 : 2;
  const padLen = decimals + 3; // "ss." + decimals
  const ss = secs.toFixed(decimals).padStart(padLen, '0');
  return `[${mm}:${ss}]`;
}

/**
 * Parses an LRC timestamp string like "[01:23.45]" or "[01:23.456]" into seconds
 * @param {string} str
 * @returns {number|null}
 */
export function parseTimestamp(str) {
  const match = str.match(/\[(\d{2}):(\d{2}\.\d{2,3})\]/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseFloat(match[2]);
}

/**
 * Sanitizes a string for use inside LRC bracket tags.
 * @param {string} s
 * @returns {string}
 */
function sanitizeLrcTag(s) {
  return s.replace(/[[\]]/g, '');
}

/**
 * Compiles an array of { text, timestamp } into a valid .lrc string
 * @param {Array} lines
 * @param {boolean} includeTranslations
 * @param {'hundredths'|'thousandths'} precision
 * @param {object} metadata
 * @param {'lf'|'crlf'} lineEndings
 * @returns {string}
 */
export function compileLRC(lines, includeTranslations = false, precision = 'hundredths', metadata = {}, lineEndings = 'lf') {
  let header = '';
  if (metadata.ti) header += `[ti:${sanitizeLrcTag(metadata.ti)}]\n`;
  if (metadata.ar) header += `[ar:${sanitizeLrcTag(metadata.ar)}]\n`;
  if (metadata.al) header += `[al:${sanitizeLrcTag(metadata.al)}]\n`;
  if (metadata.lg) header += `[lg:${sanitizeLrcTag(metadata.lg)}]\n`;

  const body = lines
    .map((line) => {
      if (line.timestamp != null) {
        let output = `${formatTimestamp(line.timestamp, precision)} ${line.text}`;
        if (includeTranslations && line.translation) {
          output += `\n${formatTimestamp(line.timestamp, precision)} ${line.translation}`;
        }
        return output;
      }
      return line.text;
    })
    .join('\n');
    
  let result = header + body;
  return lineEndings === 'crlf' ? result.replace(/\n/g, '\r\n') : result;
}

/**
 * Triggers a browser download of the given text content as a file.
 * @param {string} content
 * @param {string} filename
 */
export function downloadLRC(content, filename = 'lyrics.lrc') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a number of seconds into SRT timestamp format HH:MM:SS,mmm
 * @param {number} seconds
 * @returns {string}
 */
export function formatSrtTimestamp(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) return '00:00:00,000';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  const h = String(hrs).padStart(2, '0');
  const m = String(mins).padStart(2, '0');
  const s = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(3, '0');
  return `${h}:${m}:${s},${msStr}`;
}

/**
 * Compiles an array of { text, timestamp } into a valid .srt string
 * @param {Array} lines
 * @param {number} duration
 * @param {boolean} includeTranslations
 * @param {'lf'|'crlf'} lineEndings
 * @param {object} srtConfig
 * @returns {string}
 */
export function compileSRT(lines, duration, includeTranslations = false, lineEndings = 'lf', srtConfig = {}) {
  const minGap = srtConfig.minSubtitleGap || 0.05;
  const defaultDur = srtConfig.defaultSubtitleDuration || 5;

  const synced = lines.filter((l) => l.timestamp != null);
  if (synced.length === 0) return '';

  const body = synced.map((line, i) => {
    const start = line.timestamp;
    let end;
    if (line.endTime != null) {
      end = line.endTime;
    } else {
      const nextLine = synced[i + 1];
      if (nextLine && nextLine.timestamp != null) {
        end = Math.max(start + minGap, nextLine.timestamp - minGap);
      } else if (duration) {
        // Cap at start + defaultDur, but not beyond the track duration
        end = Math.min(start + defaultDur, duration);
      } else {
        end = start + defaultDur;
      }
    }

    return `${i + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${
      (includeTranslations && line.secondary) ? line.secondary + '\n' : ''
    }${line.text}${
      (includeTranslations && line.translation) ? '\n' + line.translation : ''
    }\n`;
  }).join('\n');
  
  return lineEndings === 'crlf' ? body.replace(/\n/g, '\r\n') : body;
}

/**
 * Parses an LRC or SRT file into an array of line objects.
 * @param {string} content
 * @param {string} filename
 * @returns {Array<{text: string, timestamp: number|null, endTime?: number, secondary?: string, translation?: string, id: string}>}
 */
export function parseLrcSrtFile(content, filename) {
  const isSrt = filename.toLowerCase().endsWith('.srt');
  const parsedLines = [];
  
  if (isSrt) {
    const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
    blocks.forEach(block => {
      const parts = block.trim().split('\n');
      if (parts.length >= 3) {
        const timeMatch = parts[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const s = parseInt(timeMatch[3], 10);
          const ms = parseInt(timeMatch[4], 10);
          const timestamp = h * 3600 + m * 60 + s + ms / 1000;
          
          const eh = parseInt(timeMatch[5], 10);
          const em = parseInt(timeMatch[6], 10);
          const es = parseInt(timeMatch[7], 10);
          const ems = parseInt(timeMatch[8], 10);
          const endTime = eh * 3600 + em * 60 + es + ems / 1000;
          
          // SRT multi-line text is joined as plain text by default
          const textLines = parts.slice(2);
          const text = textLines.join('\n');

          parsedLines.push({ text, timestamp, endTime, secondary: '', translation: '', id: crypto.randomUUID() });
        }
      }
    });
  } else {
    const lrcLines = content.replace(/\r\n/g, '\n').split('\n');
    lrcLines.forEach(line => {
      const match = line.match(/\[(\d{1,2}):(\d{2}\.\d{2,3})\](.*)/);
      if (match) {
        const m = parseInt(match[1], 10);
        const s = parseFloat(match[2]);
        const text = match[3].trim();
        parsedLines.push({ text, timestamp: m * 60 + s, id: crypto.randomUUID() });
      } else if (line.trim() !== '' && !/^\[[^\]]*:[^\]]*\]/.test(line.trim())) {
        parsedLines.push({ text: line.trim(), timestamp: null, id: crypto.randomUUID() });
      }
    });
  }
  
  // Merge duplicate timestamps (for LRC bilingual files) using a Map for O(n) lookup
  const mergedLines = [];
  const timestampMap = new Map();

  for (const line of parsedLines) {
    if (line.timestamp == null) {
      mergedLines.push(line);
      continue;
    }

    const key = Math.round(line.timestamp * 100); // group within 0.01s
    if (timestampMap.has(key)) {
      const existingIndex = timestampMap.get(key);
      const existing = mergedLines[existingIndex];
      if (!existing.translation) {
        existing.translation = line.text;
      } else if (!existing.secondary) {
        existing.secondary = existing.text;
        existing.text = existing.translation;
        existing.translation = line.text;
      }
    } else {
      const idx = mergedLines.length;
      mergedLines.push({ ...line });
      timestampMap.set(key, idx);
    }
  }

  return mergedLines;
}

/**
 * Infers end times for lines that don't have them.
 * Uses the next line's start time (minus a tiny gap) or a default duration for the last line.
 * @param {Array} lines
 * @param {number} duration - total media duration
 * @param {object} srtConfig
 * @returns {Array} new array with endTime populated
 */
export function inferEndTimes(lines, duration, srtConfig = {}) {
  const minGap = srtConfig.minSubtitleGap || 0.05;
  const defaultDur = srtConfig.defaultSubtitleDuration || 5;

  return lines.map((line, i) => {
    // If already has an endTime, keep it
    if (line.endTime != null) return line;
    // If no start time, nothing to infer
    if (line.timestamp == null) return line;

    // Find the next synced line after this one
    let nextStart = null;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].timestamp != null) {
        nextStart = lines[j].timestamp;
        break;
      }
    }

    let endTime;
    if (nextStart != null) {
      endTime = Math.max(line.timestamp + minGap, nextStart - minGap);
    } else if (duration) {
      // Cap at start + defaultDur, but not beyond the track duration
      endTime = Math.min(line.timestamp + defaultDur, duration);
    } else {
      endTime = line.timestamp + defaultDur;
    }

    return { ...line, endTime };
  });
}
