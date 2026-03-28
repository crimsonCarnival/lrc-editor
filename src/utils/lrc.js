/**
 * LRC utilities — format timestamps, compile LRC, trigger download.
 */

/**
 * Formats a number of seconds into LRC timestamp format [mm:ss.xx] or [mm:ss.xxx]
 * @param {number} seconds
 * @param {'hundredths'|'thousandths'} precision
 */
export function formatTimestamp(seconds, precision = 'hundredths') {
  if (seconds == null || seconds < 0) {
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
 */
export function parseTimestamp(str) {
  const match = str.match(/\[(\d{2}):(\d{2}\.\d{2,3})\]/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseFloat(match[2]);
}

/**
 * Compiles an array of { text, timestamp } into a valid .lrc string
 * @param {Array} lines
 * @param {boolean} includeTranslations
 * @param {'hundredths'|'thousandths'} precision
 */
export function compileLRC(lines, includeTranslations = false, precision = 'hundredths') {
  return lines
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
}

/**
 * Triggers a browser download of the given text content as a file.
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
 */
export function formatSrtTimestamp(seconds) {
  if (seconds == null || seconds < 0) return '00:00:00,000';
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
 */
export function compileSRT(lines, duration, includeTranslations = false) {
  const synced = lines.filter((l) => l.timestamp != null);
  if (synced.length === 0) return '';
  
  return synced.map((line, i) => {
    const start = line.timestamp;
    const nextLine = synced[i + 1];
    let end = start + 5; // Default 5 seconds duration
    if (nextLine && nextLine.timestamp != null) {
      end = nextLine.timestamp;
    } else if (duration) {
      end = Math.max(start + 2, duration);
    }
    
    return `${i + 1}\n${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}\n${
      (includeTranslations && line.secondary) ? line.secondary + '\n' : ''
    }${line.text}${
      (includeTranslations && line.translation) ? '\n' + line.translation : ''
    }\n`;
  }).join('\n');
}

export function parseLrcSrtFile(content, filename) {
  const isSrt = filename.toLowerCase().endsWith('.srt');
  const parsedLines = [];
  
  if (isSrt) {
    const blocks = content.replace(/\r\n/g, '\n').split('\n\n');
    blocks.forEach(block => {
      const parts = block.trim().split('\n');
      if (parts.length >= 3) {
        const timeMatch = parts[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const s = parseInt(timeMatch[3], 10);
          const ms = parseInt(timeMatch[4], 10);
          const timestamp = h * 3600 + m * 60 + s + ms / 1000;
          
          let secondary = '', text = '', translation = '';
          const textLines = parts.slice(2);
          if (textLines.length === 1) {
            text = textLines[0];
          } else if (textLines.length === 2) {
            text = textLines[0];
            translation = textLines.slice(1).join('\n');
          } else {
            secondary = textLines[0];
            text = textLines[1];
            translation = textLines.slice(2).join('\n');
          }
          parsedLines.push({ text, timestamp, secondary, translation });
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
        parsedLines.push({ text, timestamp: m * 60 + s });
      } else if (line.trim() !== '') {
        parsedLines.push({ text: line.trim(), timestamp: null });
      }
    });
  }
  
  const mergedLines = [];
  for (const line of parsedLines) {
    if (line.timestamp == null) {
      mergedLines.push(line);
      continue;
    }

    let existingIndex = -1;
    for (let i = 0; i < mergedLines.length; i++) {
      if (
        mergedLines[i].timestamp != null &&
        Math.abs(mergedLines[i].timestamp - line.timestamp) < 0.01
      ) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex !== -1) {
      const existing = mergedLines[existingIndex];
      if (!existing.translation) {
        existing.translation = line.text;
      } else if (!existing.secondary) {
        existing.secondary = existing.text;
        existing.text = existing.translation;
        existing.translation = line.text;
      }
    } else {
      mergedLines.push({ ...line });
    }
  }

  return mergedLines;
}
