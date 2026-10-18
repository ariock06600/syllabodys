import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitFrenchWordIntoSyllables,
  tokenizeAndSyllabifyText,
  computeReadingStats,
} from './syllabifier.ts';

test('French syllabifier splits basic V-CV words accurately', () => {
  assert.deepEqual(splitFrenchWordIntoSyllables('camarade'), ['ca', 'ma', 'ra', 'de']);
  assert.deepEqual(splitFrenchWordIntoSyllables('école'), ['é', 'co', 'le']);
  assert.deepEqual(splitFrenchWordIntoSyllables('matin'), ['ma', 'tin']);
  assert.deepEqual(splitFrenchWordIntoSyllables('lapin'), ['la', 'pin']);
});

test('French syllabifier splits double consonants and VC-CV clusters', () => {
  assert.deepEqual(splitFrenchWordIntoSyllables('bonjour'), ['bon', 'jour']);
  assert.deepEqual(splitFrenchWordIntoSyllables('belle'), ['bel', 'le']);
  assert.deepEqual(splitFrenchWordIntoSyllables('pomme'), ['pom', 'me']);
  assert.deepEqual(splitFrenchWordIntoSyllables('partir'), ['par', 'tir']);
  assert.deepEqual(splitFrenchWordIntoSyllables('escargot'), ['es', 'car', 'got']);
  assert.deepEqual(splitFrenchWordIntoSyllables('noisette'), ['noi', 'set', 'te']);
  assert.deepEqual(splitFrenchWordIntoSyllables('terrier'), ['ter', 'rier']);
});

test('French syllabifier preserves indivisible consonant clusters and vowel endings', () => {
  assert.deepEqual(splitFrenchWordIntoSyllables('tableau'), ['ta', 'bleau']);
  assert.deepEqual(splitFrenchWordIntoSyllables('abricot'), ['a', 'bri', 'cot']);
  assert.deepEqual(splitFrenchWordIntoSyllables('éléphant'), ['é', 'lé', 'phant']);
  assert.deepEqual(splitFrenchWordIntoSyllables('apprendre'), ['ap', 'pren', 'dre']);
  assert.deepEqual(splitFrenchWordIntoSyllables('montagne'), ['mon', 'ta', 'gne']);
  assert.deepEqual(splitFrenchWordIntoSyllables('dorée'), ['do', 'rée']);
  assert.deepEqual(splitFrenchWordIntoSyllables('continue'), ['con', 'ti', 'nue']);
});

test('tokenizeAndSyllabifyText supports syllable, word, and sentence modes', () => {
  const text = 'Le chat dort. Il rêve\nSous l’arbre.';
  const bySyllable = tokenizeAndSyllabifyText(text, 3, false, 'syllable');
  const stats = computeReadingStats(bySyllable);
  assert.equal(stats.wordCount, 7);

  // Word mode: each word gets a single consistent color index cycling 0, 1
  const byWord = tokenizeAndSyllabifyText('Petit renard agile', 2, false, 'word');
  const wordTokens = byWord.filter((t) => t.type === 'word');
  assert.deepEqual(
    wordTokens[0].syllables.map((s) => s.defaultColorIndex),
    [0, 0]
  );
  assert.deepEqual(
    wordTokens[1].syllables.map((s) => s.defaultColorIndex),
    [1, 1]
  );

  // Sentence mode: first sentence words get index 0, second sentence words get index 1
  const bySentence = tokenizeAndSyllabifyText('Bonjour matin. Bonsoir nuit.', 2, false, 'sentence');
  const sentenceWords = bySentence.filter((t) => t.type === 'word');
  assert.equal(sentenceWords[0].syllables[0].defaultColorIndex, 0);
  assert.equal(sentenceWords[1].syllables[0].defaultColorIndex, 0);
  assert.equal(sentenceWords[2].syllables[0].defaultColorIndex, 1);
  assert.equal(sentenceWords[3].syllables[0].defaultColorIndex, 1);
});
