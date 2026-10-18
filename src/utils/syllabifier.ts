export type ColorUnitMode = 'syllable' | 'word' | 'sentence';

export interface SyllableSegment {
  id: string;
  text: string;
  defaultColorIndex: number;
  wordIndex: number;
  sentenceIndex: number;
}

export interface TokenNode {
  id: string;
  type: 'word' | 'separator' | 'newline';
  raw: string;
  syllables: SyllableSegment[];
  wordIndex?: number;
  sentenceIndex: number;
  defaultColorIndex: number;
}

const VOWELS = 'aeiouyàâäéèêëîïôöùûüÿœæAEIOUYÀÂÄÉÈÊËÎÏÔÖÙÛÜŸŒÆ';

const INDIVISIBLE_CLUSTERS = new Set([
  'ch', 'ph', 'th', 'gn', 'gu', 'qu',
  'br', 'bl', 'cr', 'cl', 'dr', 'fl', 'fr',
  'gl', 'gr', 'pl', 'pr', 'tr', 'vr'
]);

const VOWEL_NUCLEUS_GROUPS = [
  'eaux', 'oient', 'aient', 'ouie', 'ouies', 'ée', 'ées',
  'eau', 'oie', 'aie', 'oui', 'eui', 'œui', 'uei', 'ieu', 'ion', 'ien', 'ier', 'iè', 'ié', 'ia', 'io',
  'au', 'ou', 'oi', 'ai', 'ei', 'eu', 'œu', 'ui', 'ue', 'ua', 'uo', 'ie', 'ye'
];

export function isVowelChar(ch: string): boolean {
  return ch.length === 1 && VOWELS.includes(ch);
}

/**
 * Segments a French word into orthographic/phonetic reading syllables.
 * Supports manual forced cuts if the user inserts '/' or '|' inside a word.
 */
export function splitFrenchWordIntoSyllables(word: string): string[] {
  if (!word) return [];

  if (word.includes('/') || word.includes('|')) {
    return word
      .split(/[\/|]+/)
      .filter((part) => part.length > 0);
  }

  const apostropheMatch = word.match(/^([cdjlmnstCDJLMNST]|qu|Qu|QU)(['’])(.+)$/);
  if (apostropheMatch && apostropheMatch[3].length > 0) {
    const prefix = apostropheMatch[1] + apostropheMatch[2];
    const restSyllables = splitFrenchWordIntoSyllables(apostropheMatch[3]);
    if (restSyllables.length > 0) {
      restSyllables[0] = prefix + restSyllables[0];
      return restSyllables;
    }
  }

  if (word.includes('-') && word.length > 1) {
    const parts = word.split('-');
    const result: string[] = [];
    parts.forEach((part, idx) => {
      const sub = splitFrenchWordIntoSyllables(part);
      if (sub.length > 0) {
        if (idx < parts.length - 1) {
          sub[sub.length - 1] = sub[sub.length - 1] + '-';
        }
        result.push(...sub);
      } else if (idx < parts.length - 1) {
        result.push('-');
      }
    });
    return result;
  }

  const len = word.length;
  if (len <= 2) return [word];

  const lower = word.toLowerCase();

  interface Nucleus {
    start: number;
    end: number;
  }

  const nuclei: Nucleus[] = [];
  let i = 0;

  while (i < len) {
    if (
      (lower.startsWith('qu', i) || lower.startsWith('gu', i)) &&
      i + 2 < len &&
      isVowelChar(lower[i + 2])
    ) {
      i += 2;
      continue;
    }

    if (isVowelChar(lower[i])) {
      const start = i;
      let matchedGroup = false;

      for (const group of VOWEL_NUCLEUS_GROUPS) {
        if (lower.startsWith(group, i)) {
          let groupEnd = i + group.length;
          while (groupEnd > i + 1 && !isVowelChar(lower[groupEnd - 1])) {
            groupEnd--;
          }
          i = groupEnd;
          matchedGroup = true;
          break;
        }
      }

      if (!matchedGroup) {
        i++;
      }

      while (
        i < len &&
        lower[i] === 'e' &&
        (i === len - 1 || (i === len - 2 && (lower[len - 1] === 's' || lower[len - 1] === 'nt')))
      ) {
        i++;
      }

      nuclei.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }

  if (nuclei.length <= 1) {
    return [word];
  }

  const cutIndices: number[] = [];

  for (let n = 0; n < nuclei.length - 1; n++) {
    const currentNucleus = nuclei[n];
    const nextNucleus = nuclei[n + 1];

    const cStart = currentNucleus.end + 1;
    const cEnd = nextNucleus.start - 1;
    const cCount = cEnd - cStart + 1;

    if (cCount <= 0) {
      cutIndices.push(nextNucleus.start);
    } else if (cCount === 1) {
      const cChar = lower[cStart];
      if (cChar === 'x' && currentNucleus.start === 0 && lower.startsWith('ex')) {
        cutIndices.push(cStart + 1);
      } else {
        cutIndices.push(cStart);
      }
    } else if (cCount === 2) {
      const cluster = lower.slice(cStart, cStart + 2);
      if (INDIVISIBLE_CLUSTERS.has(cluster)) {
        cutIndices.push(cStart);
      } else {
        cutIndices.push(cStart + 1);
      }
    } else {
      const lastTwo = lower.slice(cEnd - 1, cEnd + 1);
      if (INDIVISIBLE_CLUSTERS.has(lastTwo)) {
        cutIndices.push(cEnd - 1);
      } else {
        cutIndices.push(cStart + 2);
      }
    }
  }

  const rawSyllables: string[] = [];
  let prevIndex = 0;
  for (const cut of cutIndices) {
    if (cut > prevIndex && cut < len) {
      rawSyllables.push(word.slice(prevIndex, cut));
      prevIndex = cut;
    }
  }
  rawSyllables.push(word.slice(prevIndex));

  return rawSyllables;
}

/**
 * Tokenizes full French text into words, syllables, spaces, and newlines.
 * Supports automatic color alternation by 'syllable', 'word', or 'sentence'.
 */
export function tokenizeAndSyllabifyText(
  text: string,
  colorCount: number,
  resetColorPerWord: boolean = false,
  unitMode: ColorUnitMode = 'syllable'
): TokenNode[] {
  if (!text) return [];

  const safeColorCount = Math.max(2, Math.min(5, colorCount));
  const regex = /([a-zA-ZÀ-ÿœæŒÆ]+(?:['’\-/|][a-zA-ZÀ-ÿœæŒÆ]+)*)|(\r?\n)|([^\n\ra-zA-ZÀ-ÿœæŒÆ]+)/g;

  const tokens: TokenNode[] = [];
  let globalSyllableCounter = 0;
  let wordCounter = 0;
  let sentenceCounter = 0;

  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, wordMatch, newlineMatch] = match;
    const nodeId = `tok-${tokenIndex}`;

    if (wordMatch) {
      const currentWordIndex = wordCounter;
      const currentSentenceIndex = sentenceCounter;

      const syllableStrings = splitFrenchWordIntoSyllables(wordMatch);
      let wordSyllableCounter = 0;

      const computeColorIndex = (sylCounterInWord: number, globalSylCounter: number): number => {
        if (unitMode === 'word') {
          return currentWordIndex % safeColorCount;
        }
        if (unitMode === 'sentence') {
          return currentSentenceIndex % safeColorCount;
        }
        return resetColorPerWord
          ? sylCounterInWord % safeColorCount
          : globalSylCounter % safeColorCount;
      };

      const syllables: SyllableSegment[] = syllableStrings.map((sylText, sIdx) => {
        const colorIdx = computeColorIndex(wordSyllableCounter, globalSyllableCounter);
        wordSyllableCounter++;
        globalSyllableCounter++;
        return {
          id: `${nodeId}-syl-${sIdx}`,
          text: sylText,
          defaultColorIndex: colorIdx,
          wordIndex: currentWordIndex,
          sentenceIndex: currentSentenceIndex,
        };
      });

      tokens.push({
        id: nodeId,
        type: 'word',
        raw: wordMatch,
        syllables,
        wordIndex: currentWordIndex,
        sentenceIndex: currentSentenceIndex,
        defaultColorIndex: syllables[0]?.defaultColorIndex ?? 0,
      });

      wordCounter++;
    } else if (newlineMatch) {
      tokens.push({
        id: nodeId,
        type: 'newline',
        raw: '\n',
        syllables: [],
        sentenceIndex: sentenceCounter,
        defaultColorIndex: sentenceCounter % safeColorCount,
      });
    } else {
      const currentSentenceIndex = sentenceCounter;
      const sepColorIdx =
        unitMode === 'sentence' ? currentSentenceIndex % safeColorCount : 0;

      tokens.push({
        id: nodeId,
        type: 'separator',
        raw: fullMatch,
        syllables: [],
        sentenceIndex: currentSentenceIndex,
        defaultColorIndex: sepColorIdx,
      });

      // Advance sentence counter when encountering sentence-ending punctuation (. ! ? …)
      if (/[.!?…]/.test(fullMatch)) {
        sentenceCounter++;
      }
    }

    tokenIndex++;
  }

  return tokens;
}

export function computeReadingStats(tokens: TokenNode[]): {
  wordCount: number;
  syllableCount: number;
  characterCount: number;
} {
  let wordCount = 0;
  let syllableCount = 0;
  let characterCount = 0;

  for (const token of tokens) {
    characterCount += token.raw.length;
    if (token.type === 'word') {
      wordCount++;
      syllableCount += token.syllables.length;
    }
  }

  return { wordCount, syllableCount, characterCount };
}
