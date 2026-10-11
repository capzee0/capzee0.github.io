import type { Transcript, Segment, Word } from './index.js';

/**
 * Phonetic transliteration tables for Indic scripts into Roman (Latin) alphabet (Tanglish, Hinglish, etc.).
 * Retains casing, punctuation, and emoji intact.
 */

// ── Tamil (U+0B80 - U+0BFF) ──────────────────────────────────────────────────
const TAMIL_VOWELS: Record<string, string> = {
  '\u0B85': 'a',
  '\u0B86': 'aa',
  '\u0B87': 'i',
  '\u0B88': 'ee',
  '\u0B89': 'u',
  '\u0B8A': 'oo',
  '\u0B8E': 'e',
  '\u0B8F': 'ae',
  '\u0B90': 'ai',
  '\u0B92': 'o',
  '\u0B93': 'oa',
  '\u0B94': 'au',
};

const TAMIL_CONSONANTS: Record<string, string> = {
  '\u0B95': 'k',
  '\u0B99': 'ng',
  '\u0B9A': 'ch',
  '\u0B9C': 'j',
  '\u0B9E': 'ny',
  '\u0B9F': 't',
  '\u0BA3': 'n',
  '\u0BA4': 'th',
  '\u0BA8': 'n',
  '\u0BA9': 'n',
  '\u0BAA': 'p',
  '\u0BAE': 'm',
  '\u0BAF': 'y',
  '\u0BB0': 'r',
  '\u0BB1': 'r',
  '\u0BB2': 'l',
  '\u0BB3': 'l',
  '\u0BB4': 'zh',
  '\u0BB5': 'v',
  '\u0BB6': 'sh',
  '\u0BB7': 'sh',
  '\u0BB8': 's',
  '\u0BB9': 'h',
};

const TAMIL_MATRAS: Record<string, string> = {
  '\u0BBE': 'aa',
  '\u0BBF': 'i',
  '\u0BC0': 'ee',
  '\u0BC1': 'u',
  '\u0BC2': 'oo',
  '\u0BC6': 'e',
  '\u0BC7': 'ae',
  '\u0BC8': 'ai',
  '\u0BCA': 'o',
  '\u0BCB': 'oa',
  '\u0BCC': 'au',
};

const TAMIL_VIRAMA = '\u0BCD'; // Pulli (்)
const TAMIL_AYTHAM = '\u0B83'; // ஃ

function transliterateTamil(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === TAMIL_AYTHAM) {
      result += 'k';
    } else if (TAMIL_VOWELS[char]) {
      result += TAMIL_VOWELS[char];
    } else if (TAMIL_CONSONANTS[char]) {
      const base = TAMIL_CONSONANTS[char];
      if (nextChar === TAMIL_VIRAMA) {
        result += base;
        i++; // skip virama
      } else if (nextChar && TAMIL_MATRAS[nextChar]) {
        result += base + TAMIL_MATRAS[nextChar];
        i++; // skip matra
      } else {
        // Inherent 'a'
        result += base + 'a';
      }
    } else {
      result += char;
    }
  }
  return result;
}

// ── Devanagari (Hindi, Marathi - U+0900 - U+097F) ─────────────────────────────
const DEVA_VOWELS: Record<string, string> = {
  '\u0905': 'a',
  '\u0906': 'aa',
  '\u0907': 'i',
  '\u0908': 'ee',
  '\u0909': 'u',
  '\u090A': 'oo',
  '\u090B': 'ri',
  '\u090F': 'e',
  '\u0910': 'ai',
  '\u0913': 'o',
  '\u0914': 'au',
};

const DEVA_CONSONANTS: Record<string, string> = {
  '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
  '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
  '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
  '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
  '\u092A': 'p', '\u092B': 'ph', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
  '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0933': 'l', '\u0935': 'v',
  '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's', '\u0939': 'h',
};

const DEVA_MATRAS: Record<string, string> = {
  '\u093E': 'aa',
  '\u093F': 'i',
  '\u0940': 'ee',
  '\u0941': 'u',
  '\u0942': 'oo',
  '\u0943': 'ri',
  '\u0947': 'e',
  '\u0948': 'ai',
  '\u094B': 'o',
  '\u094C': 'au',
  '\u0902': 'n', // Anusvara
  '\u0901': 'n', // Chandrabindu
  '\u0903': 'h', // Visarga
};

const DEVA_VIRAMA = '\u094D';

function transliterateDevanagari(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (DEVA_VOWELS[char]) {
      result += DEVA_VOWELS[char];
    } else if (DEVA_CONSONANTS[char]) {
      const base = DEVA_CONSONANTS[char];
      if (nextChar === DEVA_VIRAMA) {
        result += base;
        i++; // skip virama
      } else if (nextChar && DEVA_MATRAS[nextChar]) {
        result += base + DEVA_MATRAS[nextChar];
        i++; // skip matra
      } else {
        // If it's the last character of a word in Hindi, schwa deletion often drops final 'a'
        const isWordEnd = !nextChar || /\s|[.,!?]/.test(nextChar);
        result += isWordEnd ? base : base + 'a';
      }
    } else if (DEVA_MATRAS[char]) {
      result += DEVA_MATRAS[char];
    } else {
      result += char;
    }
  }
  return result;
}

// ── Telugu (U+0C00 - U+0C7F) ──────────────────────────────────────────────────
const TELUGU_VOWELS: Record<string, string> = {
  '\u0C05': 'a', '\u0C06': 'aa', '\u0C07': 'i', '\u0C08': 'ee',
  '\u0C09': 'u', '\u0C0A': 'oo', '\u0C0E': 'e', '\u0C0F': 'ae',
  '\u0C10': 'ai', '\u0C12': 'o', '\u0C13': 'oa', '\u0C14': 'au',
};
const TELUGU_CONSONANTS: Record<string, string> = {
  '\u0C15': 'k', '\u0C16': 'kh', '\u0C17': 'g', '\u0C18': 'gh', '\u0C19': 'ng',
  '\u0C1A': 'ch', '\u0C1B': 'chh', '\u0C1C': 'j', '\u0C1D': 'jh', '\u0C1E': 'ny',
  '\u0C1F': 't', '\u0C20': 'th', '\u0C21': 'd', '\u0C22': 'dh', '\u0C23': 'n',
  '\u0C24': 'th', '\u0C25': 'th', '\u0C26': 'd', '\u0C27': 'dh', '\u0C28': 'n',
  '\u0C2A': 'p', '\u0C2B': 'ph', '\u0C2C': 'b', '\u0C2D': 'bh', '\u0C2E': 'm',
  '\u0C2F': 'y', '\u0C30': 'r', '\u0C32': 'l', '\u0C33': 'l', '\u0C35': 'v',
  '\u0C36': 'sh', '\u0C37': 'sh', '\u0C38': 's', '\u0C39': 'h',
};
const TELUGU_MATRAS: Record<string, string> = {
  '\u0C3E': 'aa', '\u0C3F': 'i', '\u0C40': 'ee', '\u0C41': 'u', '\u0C42': 'oo',
  '\u0C46': 'e', '\u0C47': 'ae', '\u0C48': 'ai', '\u0C4A': 'o', '\u0C4B': 'oa', '\u0C4C': 'au',
  '\u0C02': 'm',
};
const TELUGU_VIRAMA = '\u0C4D';

function transliterateTelugu(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (TELUGU_VOWELS[char]) {
      result += TELUGU_VOWELS[char];
    } else if (TELUGU_CONSONANTS[char]) {
      const base = TELUGU_CONSONANTS[char];
      if (nextChar === TELUGU_VIRAMA) {
        result += base;
        i++;
      } else if (nextChar && TELUGU_MATRAS[nextChar]) {
        result += base + TELUGU_MATRAS[nextChar];
        i++;
      } else {
        result += base + 'a';
      }
    } else if (TELUGU_MATRAS[char]) {
      result += TELUGU_MATRAS[char];
    } else {
      result += char;
    }
  }
  return result;
}

/**
 * Automatically detects Indic script and converts to Roman (Latin) alphabet.
 */
export function transliterateIndicText(text: string, langCode?: string): string {
  if (!text) return '';

  const normalizedLang = (langCode || '').toLowerCase().trim();

  // If specific language is known or detected
  if (normalizedLang === 'ta' || /[\u0B80-\u0BFF]/.test(text)) {
    return transliterateTamil(text);
  }
  if (normalizedLang === 'hi' || normalizedLang === 'mr' || /[\u0900-\u097F]/.test(text)) {
    return transliterateDevanagari(text);
  }
  if (normalizedLang === 'te' || /[\u0C00-\u0C7F]/.test(text)) {
    return transliterateTelugu(text);
  }

  // Fallback if no specific script matches
  return text;
}

/**
 * Transliterates an entire Transcript (segments and individual word timings) to Roman script.
 * Keeps timestamps and word boundaries 100% accurate.
 */
export function transliterateTranscript(transcript: Transcript, langCode?: string): Transcript {
  const code = langCode || transcript.language;
  return {
    ...transcript,
    language: `${transcript.language}-roman`,
    segments: transcript.segments.map((seg) => ({
      ...seg,
      text: transliterateIndicText(seg.text, code),
      words: seg.words
        ? seg.words.map((w) => ({
            ...w,
            text: transliterateIndicText(w.text, code),
          }))
        : undefined,
    })),
  };
}

/**
 * Splits any long segment into punchy, accurate viral subtitle chunks (default 2-3 words).
 * Keeps exact word-level start & end timestamps without paragraph clutter.
 */
export function chunkWordsIntoSegments(rawSegments: Segment[], maxWords: number = 5): Segment[] {
  const result: Segment[] = [];
  let segCounter = 1;

  for (const seg of rawSegments) {
    if (!seg.words || seg.words.length <= maxWords) {
      result.push({
        ...seg,
        id: seg.id || `seg-${segCounter++}`,
      });
      continue;
    }

    const words = seg.words;
    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords);
      if (chunk.length === 0) continue;
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const text = chunk.map((w: Word) => w.text).join(' ').trim();
      result.push({
        id: `seg-${segCounter++}`,
        start: Number(start.toFixed(2)),
        end: Number(end.toFixed(2)),
        text,
        words: chunk,
      });
    }
  }

  return result;
}

function getRawDemoTranscript(
  language: string = 'en',
  captionOutput: 'native' | 'roman' | 'translate' = 'native'
): Transcript {
  const lang = (language || 'auto').toLowerCase();

  // 1. Tamil
  if (lang === 'ta') {
    if (captionOutput === 'native') {
      return {
        schemaVersion: 1,
        language: 'ta',
        segments: [
          {
            id: 'seg-1',
            start: 0.5,
            end: 4.2,
            text: 'வணக்கம் கேப்ஸீ வீடியோ எடிட்டருக்கு உங்களை வரவேற்கிறோம்',
            words: [
              { id: 'w-1', text: 'வணக்கம்', start: 0.5, end: 1.1 },
              { id: 'w-2', text: 'கேப்ஸீ', start: 1.1, end: 1.8 },
              { id: 'w-3', text: 'வீடியோ', start: 1.8, end: 2.4 },
              { id: 'w-4', text: 'எடிட்டருக்கு', start: 2.4, end: 3.2 },
              { id: 'w-5', text: 'உங்களை', start: 3.2, end: 3.6 },
              { id: 'w-6', text: 'வரவேற்கிறோம்', start: 3.6, end: 4.2 },
            ],
          },
          {
            id: 'seg-2',
            start: 4.8,
            end: 8.9,
            text: 'ரீல்ஸ் மற்றும் ஷார்ட்ஸ்க்கு உடனடி தமிழ் சப்டைட்டில் உருவாக்குங்கள்',
            words: [
              { id: 'w-7', text: 'ரீல்ஸ்', start: 4.8, end: 5.4 },
              { id: 'w-8', text: 'மற்றும்', start: 5.4, end: 5.9 },
              { id: 'w-9', text: 'ஷார்ட்ஸ்க்கு', start: 5.9, end: 6.8 },
              { id: 'w-10', text: 'உடனடி', start: 6.8, end: 7.3 },
              { id: 'w-11', text: 'தமிழ்', start: 7.3, end: 7.7 },
              { id: 'w-12', text: 'சப்டைட்டில்', start: 7.7, end: 8.3 },
              { id: 'w-13', text: 'உருவாக்குங்கள்', start: 8.3, end: 8.9 },
            ],
          },
          {
            id: 'seg-3',
            start: 9.6,
            end: 14.2,
            text: 'சைலன்ஸ் ரிமூவர் மூலம் தேவையில்லாத இடைவெளிகளை சுலபமாக நீக்குங்கள்',
            words: [
              { id: 'w-14', text: 'சைலன்ஸ்', start: 9.6, end: 10.3 },
              { id: 'w-15', text: 'ரிமூவர்', start: 10.3, end: 11.0 },
              { id: 'w-16', text: 'மூலம்', start: 11.0, end: 11.5 },
              { id: 'w-17', text: 'தேவையில்லாத', start: 11.5, end: 12.4 },
              { id: 'w-18', text: 'இடைவெளிகளை', start: 12.4, end: 13.3 },
              { id: 'w-19', text: 'சுலபமாக', start: 13.3, end: 13.7 },
              { id: 'w-20', text: 'நீக்குங்கள்', start: 13.7, end: 14.2 },
            ],
          },
        ],
      };
    }

    if (captionOutput === 'roman') {
      return {
        schemaVersion: 1,
        language: 'ta-Latn',
        segments: [
          {
            id: 'seg-1',
            start: 0.5,
            end: 4.2,
            text: 'Vanakkam Capzee video editor-ku ungalai varaverkirom',
            words: [
              { id: 'w-1', text: 'Vanakkam', start: 0.5, end: 1.1 },
              { id: 'w-2', text: 'Capzee', start: 1.1, end: 1.8 },
              { id: 'w-3', text: 'video', start: 1.8, end: 2.4 },
              { id: 'w-4', text: 'editor-ku', start: 2.4, end: 3.2 },
              { id: 'w-5', text: 'ungalai', start: 3.2, end: 3.6 },
              { id: 'w-6', text: 'varaverkirom', start: 3.6, end: 4.2 },
            ],
          },
          {
            id: 'seg-2',
            start: 4.8,
            end: 8.9,
            text: 'Reels matrum Shorts-kku udanadi Tamil subtitle uruvaakkungal',
            words: [
              { id: 'w-7', text: 'Reels', start: 4.8, end: 5.4 },
              { id: 'w-8', text: 'matrum', start: 5.4, end: 5.9 },
              { id: 'w-9', text: 'Shorts-kku', start: 5.9, end: 6.8 },
              { id: 'w-10', text: 'udanadi', start: 6.8, end: 7.3 },
              { id: 'w-11', text: 'Tamil', start: 7.3, end: 7.7 },
              { id: 'w-12', text: 'subtitle', start: 7.7, end: 8.3 },
              { id: 'w-13', text: 'uruvaakkungal', start: 8.3, end: 8.9 },
            ],
          },
          {
            id: 'seg-3',
            start: 9.6,
            end: 14.2,
            text: 'Silence remover moolam thevaiyilladha idaiveligalai sulabamaaga neekkungal',
            words: [
              { id: 'w-14', text: 'Silence', start: 9.6, end: 10.3 },
              { id: 'w-15', text: 'remover', start: 10.3, end: 11.0 },
              { id: 'w-16', text: 'moolam', start: 11.0, end: 11.5 },
              { id: 'w-17', text: 'thevaiyilladha', start: 11.5, end: 12.4 },
              { id: 'w-18', text: 'idaiveligalai', start: 12.4, end: 13.3 },
              { id: 'w-19', text: 'sulabamaaga', start: 13.3, end: 13.7 },
              { id: 'w-20', text: 'neekkungal', start: 13.7, end: 14.2 },
            ],
          },
        ],
      };
    }
  }

  // 2. Hindi
  if (lang === 'hi') {
    if (captionOutput === 'native') {
      return {
        schemaVersion: 1,
        language: 'hi',
        segments: [
          {
            id: 'seg-1',
            start: 0.5,
            end: 4.2,
            text: 'नमस्ते कैपज़ी एआई वीडियो एडिटर में आपका स्वागत है',
            words: [
              { id: 'w-1', text: 'नमस्ते', start: 0.5, end: 1.1 },
              { id: 'w-2', text: 'कैपज़ी', start: 1.1, end: 1.8 },
              { id: 'w-3', text: 'एआई', start: 1.8, end: 2.3 },
              { id: 'w-4', text: 'वीडियो', start: 2.3, end: 2.9 },
              { id: 'w-5', text: 'एडिटर', start: 2.9, end: 3.4 },
              { id: 'w-6', text: 'में', start: 3.4, end: 3.6 },
              { id: 'w-7', text: 'आपका', start: 3.6, end: 3.9 },
              { id: 'w-8', text: 'स्वागत', start: 3.9, end: 4.2 },
            ],
          },
          {
            id: 'seg-2',
            start: 4.8,
            end: 8.9,
            text: 'रील्स और शॉर्ट्स के लिए तुरंत आकर्षक कैप्शन बनाएं',
            words: [
              { id: 'w-9', text: 'रील्स', start: 4.8, end: 5.4 },
              { id: 'w-10', text: 'और', start: 5.4, end: 5.8 },
              { id: 'w-11', text: 'शॉर्ट्स', start: 5.8, end: 6.5 },
              { id: 'w-12', text: 'के', start: 6.5, end: 6.7 },
              { id: 'w-13', text: 'लिए', start: 6.7, end: 7.0 },
              { id: 'w-14', text: 'तुरंत', start: 7.0, end: 7.5 },
              { id: 'w-15', text: 'आकर्षक', start: 7.5, end: 8.2 },
              { id: 'w-16', text: 'कैप्शन', start: 8.2, end: 8.6 },
              { id: 'w-17', text: 'बनाएं', start: 8.6, end: 8.9 },
            ],
          },
          {
            id: 'seg-3',
            start: 9.6,
            end: 14.2,
            text: 'स्मार्ट साइलेंस ट्रिमर से अनचाहे पॉज़ को आसानी से हटाएं',
            words: [
              { id: 'w-18', text: 'स्मार्ट', start: 9.6, end: 10.2 },
              { id: 'w-19', text: 'साइलेंस', start: 10.2, end: 10.9 },
              { id: 'w-20', text: 'ट्रिमर', start: 10.9, end: 11.5 },
              { id: 'w-21', text: 'से', start: 11.5, end: 11.8 },
              { id: 'w-22', text: 'अनचाहे', start: 11.8, end: 12.5 },
              { id: 'w-23', text: 'पॉज़', start: 12.5, end: 13.0 },
              { id: 'w-24', text: 'को', start: 13.0, end: 13.2 },
              { id: 'w-25', text: 'आसानी', start: 13.2, end: 13.7 },
              { id: 'w-26', text: 'से', start: 13.7, end: 13.9 },
              { id: 'w-27', text: 'हटाएं', start: 13.9, end: 14.2 },
            ],
          },
        ],
      };
    }

    if (captionOutput === 'roman') {
      return {
        schemaVersion: 1,
        language: 'hi-Latn',
        segments: [
          {
            id: 'seg-1',
            start: 0.5,
            end: 4.2,
            text: 'Namaste Capzee AI video editor mein aapka swagat hai',
            words: [
              { id: 'w-1', text: 'Namaste', start: 0.5, end: 1.1 },
              { id: 'w-2', text: 'Capzee', start: 1.1, end: 1.8 },
              { id: 'w-3', text: 'AI', start: 1.8, end: 2.3 },
              { id: 'w-4', text: 'video', start: 2.3, end: 2.9 },
              { id: 'w-5', text: 'editor', start: 2.9, end: 3.4 },
              { id: 'w-6', text: 'mein', start: 3.4, end: 3.6 },
              { id: 'w-7', text: 'aapka', start: 3.6, end: 3.9 },
              { id: 'w-8', text: 'swagat', start: 3.9, end: 4.2 },
            ],
          },
          {
            id: 'seg-2',
            start: 4.8,
            end: 8.9,
            text: 'Reels aur Shorts ke liye turant attractive captions banayein',
            words: [
              { id: 'w-9', text: 'Reels', start: 4.8, end: 5.4 },
              { id: 'w-10', text: 'aur', start: 5.4, end: 5.8 },
              { id: 'w-11', text: 'Shorts', start: 5.8, end: 6.5 },
              { id: 'w-12', text: 'ke', start: 6.5, end: 6.7 },
              { id: 'w-13', text: 'liye', start: 6.7, end: 7.0 },
              { id: 'w-14', text: 'turant', start: 7.0, end: 7.5 },
              { id: 'w-15', text: 'attractive', start: 7.5, end: 8.2 },
              { id: 'w-16', text: 'captions', start: 8.2, end: 8.6 },
              { id: 'w-17', text: 'banayein', start: 8.6, end: 8.9 },
            ],
          },
          {
            id: 'seg-3',
            start: 9.6,
            end: 14.2,
            text: 'Smart silence trimmer se anchahe pause ko aasani se hatayein',
            words: [
              { id: 'w-18', text: 'Smart', start: 9.6, end: 10.2 },
              { id: 'w-19', text: 'silence', start: 10.2, end: 10.9 },
              { id: 'w-20', text: 'trimmer', start: 10.9, end: 11.5 },
              { id: 'w-21', text: 'se', start: 11.5, end: 11.8 },
              { id: 'w-22', text: 'anchahe', start: 11.8, end: 12.5 },
              { id: 'w-23', text: 'pause', start: 12.5, end: 13.0 },
              { id: 'w-24', text: 'ko', start: 13.0, end: 13.2 },
              { id: 'w-25', text: 'aasani', start: 13.2, end: 13.7 },
              { id: 'w-26', text: 'se', start: 13.7, end: 13.9 },
              { id: 'w-27', text: 'hatayein', start: 13.9, end: 14.2 },
            ],
          },
        ],
      };
    }
  }

  // Default English / Translated demo
  return {
    schemaVersion: 1,
    language: captionOutput === 'translate' ? 'en' : (lang === 'auto' ? 'en' : lang),
    segments: [
      {
        id: 'seg-1',
        start: 0.5,
        end: 4.2,
        text: 'Welcome to Capzee, the spicy-fast AI video caption platform',
        words: [
          { id: 'w-1', text: 'Welcome', start: 0.5, end: 1.0 },
          { id: 'w-2', text: 'to', start: 1.0, end: 1.2 },
          { id: 'w-3', text: 'Capzee,', start: 1.2, end: 1.8 },
          { id: 'w-4', text: 'the', start: 1.8, end: 2.0 },
          { id: 'w-5', text: 'spicy-fast', start: 2.0, end: 2.7 },
          { id: 'w-6', text: 'AI', start: 2.7, end: 3.0 },
          { id: 'w-7', text: 'video', start: 3.0, end: 3.3 },
          { id: 'w-8', text: 'caption', start: 3.3, end: 3.7 },
          { id: 'w-9', text: 'platform', start: 3.7, end: 4.2 },
        ],
      },
      {
        id: 'seg-2',
        start: 4.8,
        end: 8.9,
        text: 'Create viral TikToks and Reels with automatic animated subtitles',
        words: [
          { id: 'w-10', text: 'Create', start: 4.8, end: 5.3 },
          { id: 'w-11', text: 'viral', start: 5.3, end: 5.8 },
          { id: 'w-12', text: 'TikToks', start: 5.8, end: 6.5 },
          { id: 'w-13', text: 'and', start: 6.5, end: 6.7 },
          { id: 'w-14', text: 'Reels', start: 6.7, end: 7.3 },
          { id: 'w-15', text: 'with', start: 7.3, end: 7.6 },
          { id: 'w-16', text: 'automatic', start: 7.6, end: 8.2 },
          { id: 'w-17', text: 'animated', start: 8.2, end: 8.5 },
          { id: 'w-18', text: 'subtitles', start: 8.5, end: 8.9 },
        ],
      },
      {
        id: 'seg-3',
        start: 9.6,
        end: 14.2,
        text: 'Smart silence trimmer removes awkward hesitation and pauses',
        words: [
          { id: 'w-19', text: 'Smart', start: 9.6, end: 10.1 },
          { id: 'w-20', text: 'silence', start: 10.1, end: 10.7 },
          { id: 'w-21', text: 'trimmer', start: 10.7, end: 11.4 },
          { id: 'w-22', text: 'removes', start: 11.4, end: 12.0 },
          { id: 'w-23', text: 'awkward', start: 12.0, end: 12.7 },
          { id: 'w-24', text: 'hesitation', start: 12.7, end: 13.5 },
          { id: 'w-25', text: 'and', start: 13.5, end: 13.7 },
          { id: 'w-26', text: 'pauses', start: 13.7, end: 14.2 },
        ],
      },
    ],
  };
}

/**
 * Creates realistic, timed demo speech segments tailored to language and caption output mode.
 * Automatically chunks speech into punchy, accurate 2-3 word segments (not paragraphs).
 */
export function getDemoTranscript(
  language: string = 'en',
  captionOutput: 'native' | 'roman' | 'translate' = 'native'
): Transcript {
  const raw = getRawDemoTranscript(language, captionOutput);
  return {
    ...raw,
    segments: chunkWordsIntoSegments(raw.segments, 5),
  };
}

/**
 * Returns dynamic user-visible labels, badges, and explanatory hints for Caption Output modes
 * based on selected spoken language (e.g. Tanglish for Tamil, Hinglish for Hindi).
 */
export function getCaptionOutputMeta(language: string = 'auto') {
  const lang = (language || 'auto').toLowerCase().trim();

  let nativeLabel = 'Native';
  let romanLabel = 'Roman (abc)';
  let translateLabel = 'Translate';

  let nativeHint = 'Subtitles in original native script.';
  let romanHint = 'Speech written phonetically in Latin alphabet (abc).';
  let translateHint = 'Translates spoken audio directly into English subtitles.';

  if (lang === 'ta') {
    nativeLabel = 'Native (தமிழ்)';
    romanLabel = 'Roman (Tanglish)';
    translateLabel = 'Translate (EN)';
    nativeHint = 'தமிழ் எழுத்துருவில் சப்டைட்டில் (e.g. "வணக்கம்")';
    romanHint = 'Tanglish: தமிழ் பேச்சை ஆங்கில எழுத்துக்களில் (e.g. "Vanakkam")';
    translateHint = 'Translate: தமிழை நேரடியாக ஆங்கில சப்டைட்டிலாக மொழிபெயர்க்கும்';
  } else if (lang === 'hi') {
    nativeLabel = 'Native (हिन्दी)';
    romanLabel = 'Roman (Hinglish)';
    translateLabel = 'Translate (EN)';
    nativeHint = 'देवनागरी लिपि में कैप्शन (e.g. "नमस्ते")';
    romanHint = 'Hinglish: हिन्दी भाषण अंग्रेजी अक्षरों में (e.g. "Namaste")';
    translateHint = 'Translate: Translates Hindi speech to English subtitles';
  } else if (lang === 'te') {
    nativeLabel = 'Native (తెలుగు)';
    romanLabel = 'Roman (Tenglish)';
    translateLabel = 'Translate (EN)';
    nativeHint = 'తెలుగు లిపిలో శీర్షికలు (e.g. "నమస్కారం")';
    romanHint = 'Tenglish: Telugu speech in English letters (e.g. "Namaskaram")';
    translateHint = 'Translate: Translates Telugu speech to English subtitles';
  } else if (lang === 'ml') {
    nativeLabel = 'Native (മലയാളം)';
    romanLabel = 'Roman (Manglish)';
    translateLabel = 'Translate (EN)';
    nativeHint = 'മലയാളം ലിപിയിൽ (e.g. "നമസ്കാരം")';
    romanHint = 'Manglish: Malayalam speech in English letters (e.g. "Namaskaram")';
    translateHint = 'Translate: Translates Malayalam speech to English subtitles';
  } else if (lang === 'kn') {
    nativeLabel = 'Native (ಕನ್ನಡ)';
    romanLabel = 'Roman (Kanglish)';
    translateLabel = 'Translate (EN)';
    nativeHint = 'ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ (e.g. "ನಮಸ್ಕಾರ")';
    romanHint = 'Kanglish: Kannada speech in English letters (e.g. "Namaskara")';
    translateHint = 'Translate: Translates Kannada speech to English subtitles';
  }

  return {
    nativeLabel,
    romanLabel,
    translateLabel,
    nativeHint,
    romanHint,
    translateHint,
    options: [
      { id: 'native' as const, label: nativeLabel, hint: nativeHint },
      { id: 'roman' as const, label: romanLabel, hint: romanHint },
      { id: 'translate' as const, label: translateLabel, hint: translateHint },
    ],
  };
}
