/**
 * Furigana utility functions for Japanese text processing.
 * Converts kuromoji tokenizer output into per-character readings.
 */

const HIRAGANA_RE = /[\u3040-\u309F]/;
const KATAKANA_RE = /[\u30A0-\u30FF]/;
const KANJI_RE = /[\u4E00-\u9FAF\u3400-\u4DBF\uF900-\uFAFF]/;
const CJK_RE = /[\u3000-\u9FFF\uF900-\uFAFF]/;

/**
 * Convert katakana string to hiragana.
 * Kuromoji returns readings in katakana — we normalize to hiragana.
 */
export function toHiragana(katakana) {
  if (!katakana) return '';
  return katakana.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

/**
 * Convert hiragana string to katakana.
 */
export function toKatakana(hiragana) {
  if (!hiragana) return '';
  return hiragana.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/**
 * Check if a character is kanji (CJK Unified Ideograph).
 */
export function isKanji(ch) {
  return KANJI_RE.test(ch);
}

/**
 * Check if a character is hiragana.
 */
export function isHiragana(ch) {
  return HIRAGANA_RE.test(ch);
}

/**
 * Check if a character is katakana.
 */
export function isKatakana(ch) {
  return KATAKANA_RE.test(ch);
}

/**
 * Check if a string contains any CJK characters.
 */
export function hasCJK(text) {
  return CJK_RE.test(text);
}

/**
 * Parse {word|reading} ruby markup into plain text and annotated segments.
 * Supports single-char ({字|じ}) and multi-char ({二人|ふたり}) annotations.
 *
 * @param {string} input  e.g. "{二人|ふたり}で{歌|うた}いましょう"
 * @returns {{ plainText: string, segments: Array<{text: string, reading: string|null}> }}
 */
export function parseRubyMarkup(input) {
  if (!input) return { plainText: '', segments: [] };
  const segments = [];
  let plainText = '';
  let i = 0;
  while (i < input.length) {
    if (input[i] === '{') {
      const close = input.indexOf('}', i + 1);
      if (close === -1) {
        const raw = input.slice(i);
        plainText += raw;
        if (raw) segments.push({ text: raw, reading: null });
        break;
      }
      const inner = input.slice(i + 1, close);
      const pipeIdx = inner.indexOf('|');
      if (pipeIdx === -1) {
        plainText += inner;
        if (inner) segments.push({ text: inner, reading: null });
      } else {
        const word = inner.slice(0, pipeIdx);
        const reading = inner.slice(pipeIdx + 1).trim();
        plainText += word;
        if (word) segments.push({ text: word, reading: reading || null });
      }
      i = close + 1;
    } else {
      let j = i;
      while (j < input.length && input[j] !== '{') j++;
      const raw = input.slice(i, j);
      plainText += raw;
      if (raw) segments.push({ text: raw, reading: null });
      i = j;
    }
  }
  return { plainText, segments };
}

/**
 * Serialize a words array back to {word|reading} markup for use in the edit input.
 * Words that carry a reading are wrapped in {word|reading}; others are plain text.
 * Adds spaces after Latin/alphanumeric words to preserve original formatting.
 */
export function serializeToRubyMarkup(words) {
  if (!words?.length) return '';
  return words.map((w, i) => {
    const serialized = w.reading ? `{${w.word}|${w.reading}}` : w.word;
    // Add space after Latin/alphanumeric words (but not after the last word)
    const needsSpace = i < words.length - 1 && /[a-zA-Z0-9]/.test(w.word);
    return needsSpace ? serialized + ' ' : serialized;
  }).join('');
}



