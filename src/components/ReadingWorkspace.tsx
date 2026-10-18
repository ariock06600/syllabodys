import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  TokenNode,
  SyllableSegment,
  ColorUnitMode,
  computeReadingStats,
} from '../utils/syllabifier';
import {
  FontFamilyOption,
  FONT_OPTIONS,
  SAMPLE_TEXTS,
  SampleTextItem,
} from '../utils/palettes';
import {
  FileText,
  MousePointerClick,
  Trash2,
  FileDown,
  BookOpen,
  RefreshCw,
  Paintbrush,
  X,
} from 'lucide-react';

interface ReadingWorkspaceProps {
  theme: 'light' | 'dark';
  documentTitle: string;
  onSetDocumentTitle: (title: string) => void;
  rawText: string;
  onSetRawText: (text: string) => void;
  tokens: TokenNode[];
  fontFamily: FontFamilyOption;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  unitMode: ColorUnitMode;
  colors: string[];
  colorCount: number;
  customSyllableColors: Record<string, string>;
  onApplyColorToSyllableIds: (syllableIds: string[], colorHex: string) => void;
  showSyllableArcs: boolean;
  onExportPdf: () => void;
  isExporting: boolean;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}

export const ReadingWorkspace: React.FC<ReadingWorkspaceProps> = ({
  theme,
  documentTitle,
  onSetDocumentTitle,
  rawText,
  onSetRawText,
  tokens,
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
  wordSpacing,
  unitMode,
  colors,
  colorCount,
  customSyllableColors,
  onApplyColorToSyllableIds,
  showSyllableArcs,
  onExportPdf,
  isExporting,
  sheetRef,
}) => {
  const isDark = theme === 'dark';
  // Scope when clicking or selecting: syllable, word, or sentence
  const [clickTargetScope, setClickTargetScope] = useState<ColorUnitMode>('syllable');
  const clickTargetScopeRef = useRef<ColorUnitMode>('syllable');
  const [selectedSyllableIds, setSelectedSyllableIds] = useState<string[]>([]);
  const [customPickerHex, setCustomPickerHex] = useState<string>('#E11D48');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const readingAreaRef = useRef<HTMLDivElement | null>(null);

  // Whenever customSyllableColors is cleared (e.g., when applying a global preset), clear active selection
  useEffect(() => {
    if (Object.keys(customSyllableColors).length === 0) {
      setSelectedSyllableIds([]);
      setStatusFeedback(null);
    }
  }, [customSyllableColors]);

  const fontObj = FONT_OPTIONS.find((f) => f.id === fontFamily) || FONT_OPTIONS[0];
  const stats = computeReadingStats(tokens);

  // Flatten all syllables for quick lookup by wordIndex and sentenceIndex
  const allSyllables = useMemo(() => {
    return tokens.flatMap((t) => t.syllables);
  }, [tokens]);

  const syllableMap = useMemo(() => {
    const map = new Map<string, SyllableSegment>();
    for (const s of allSyllables) {
      map.set(s.id, s);
    }
    return map;
  }, [allSyllables]);

  const getSyllableIdsByScope = (targetSyl: SyllableSegment, scope: ColorUnitMode): string[] => {
    if (scope === 'syllable') return [targetSyl.id];
    if (scope === 'word') {
      return allSyllables
        .filter((s) => s.wordIndex === targetSyl.wordIndex)
        .map((s) => s.id);
    }
    if (scope === 'sentence') {
      return allSyllables
        .filter((s) => s.sentenceIndex === targetSyl.sentenceIndex)
        .map((s) => s.id);
    }
    return [targetSyl.id];
  };

  // Detect browser text selection inside the reading area to support coloring any selected words or phrases
  const handleDetectTextSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !readingAreaRef.current) {
      return;
    }

    const range = sel.getRangeAt(0);
    if (!readingAreaRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const spanNodes = readingAreaRef.current.querySelectorAll<HTMLElement>('[data-syllable-id]');
    const matchedIds: string[] = [];

    spanNodes.forEach((span) => {
      if (sel.containsNode(span, true)) {
        const id = span.getAttribute('data-syllable-id');
        if (id) matchedIds.push(id);
      }
    });

    if (matchedIds.length > 0) {
      const activeScope = clickTargetScopeRef.current;
      if (activeScope !== 'syllable') {
        const expandedSet = new Set<string>();
        matchedIds.forEach((id) => {
          const seg = syllableMap.get(id);
          if (seg) {
            getSyllableIdsByScope(seg, activeScope).forEach((sid) => expandedSet.add(sid));
          }
        });
        setSelectedSyllableIds(Array.from(expandedSet));
      } else {
        setSelectedSyllableIds(matchedIds);
      }
    }
  };

  const handleExpandSelectionToScope = (scope: ColorUnitMode) => {
    if (selectedSyllableIds.length === 0) return;
    const expandedSet = new Set<string>();
    selectedSyllableIds.forEach((id) => {
      const seg = syllableMap.get(id);
      if (seg) {
        getSyllableIdsByScope(seg, scope).forEach((sid) => expandedSet.add(sid));
      }
    });
    const nextIds = Array.from(expandedSet);
    setSelectedSyllableIds(nextIds);
    const label =
      scope === 'word'
        ? 'au mot entier'
        : scope === 'sentence'
        ? 'à la phrase'
        : 'à la syllabe';
    setStatusFeedback(`Sélection ajustée ${label} (${nextIds.length} syllabes)`);
  };

  const handleChangeClickTargetScope = (scope: ColorUnitMode) => {
    clickTargetScopeRef.current = scope;
    setClickTargetScope(scope);
    if (selectedSyllableIds.length > 0) {
      handleExpandSelectionToScope(scope);
    }
  };

  const handleApplyColorToSelection = (hexColor: string) => {
    if (selectedSyllableIds.length === 0) return;
    onApplyColorToSyllableIds(selectedSyllableIds, hexColor);
    setStatusFeedback(
      `Couleur ${hexColor.toUpperCase()} appliquée à ${selectedSyllableIds.length} syllabe${
        selectedSyllableIds.length > 1 ? 's' : ''
      }`
    );
  };

  const handleLoadSample = (sample: SampleTextItem) => {
    onSetDocumentTitle(sample.title);
    onSetRawText(sample.content);
    setSelectedSyllableIds([]);
  };

  const selectedSet = useMemo(() => new Set(selectedSyllableIds), [selectedSyllableIds]);

  return (
    <div className="flex-1 min-w-0 space-y-5">
      {/* Zone 1: Saisie et modification du texte (masquée à l'export PDF) */}
      <section
        aria-labelledby="heading-raw-input"
        className={`no-print rounded-xl border p-5 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 id="heading-raw-input" className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" />
              <span>Saisie et modification du texte</span>
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Collez ou modifiez votre texte ci-dessous. Astuce : insérez{' '}
              <code className="font-mono px-1 py-0.5 rounded bg-sky-500/10 text-sky-500">/</code>{' '}
              dans un mot (ex: <span className="font-mono">or/tho/pho/nie</span>) pour forcer une
              coupure syllabique personnalisée.
            </p>
          </div>

          {/* Sample Text Quick Loaders */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SAMPLE_TEXTS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => handleLoadSample(sample)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-sky-500 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-sky-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>{sample.title.split(' (')[0]}</span>
              </button>
            ))}

            {rawText.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSetRawText('');
                  setSelectedSyllableIds([]);
                }}
                aria-label="Effacer le texte"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-slate-800 text-rose-400 hover:bg-rose-950/40'
                    : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            )}
          </div>
        </div>

        <label htmlFor="raw-text-textarea" className="sr-only">
          Texte à découper en syllabes
        </label>
        <textarea
          id="raw-text-textarea"
          rows={4}
          value={rawText}
          onChange={(e) => {
            onSetRawText(e.target.value);
          }}
          placeholder="Collez ou saisissez ici le texte destiné à l'élève..."
          className={`w-full rounded-lg border p-3.5 text-sm leading-relaxed transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
          }`}
        />

        {/* Clean unboxed metadata statistics bar */}
        <div
          className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span>{stats.wordCount} mots</span>
            <span aria-hidden="true">·</span>
            <span>{stats.syllableCount} syllabes</span>
            <span aria-hidden="true">·</span>
            <span>{stats.characterCount} caractères</span>
          </div>
          <div>
            <span>Police : {fontObj.label}</span>
            <span aria-hidden="true" className="mx-2">
              ·
            </span>
            <span>
              Mode :{' '}
              {unitMode === 'syllable'
                ? 'Syllabe'
                : unitMode === 'word'
                ? 'Mot à mot'
                : 'Phrase'}{' '}
              ({colorCount} couleurs)
            </span>
          </div>
        </div>
      </section>

      {/* Zone 2: Barre d'outils de sélection (Syllabe / Mot / Phrase) et d'application de couleur */}
      <div
        className={`no-print rounded-xl border p-4 space-y-3 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Granularité du clic / de la sélection (Syllabe, Mot, Phrase) */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <MousePointerClick className="w-4 h-4 text-sky-500" />
              <span>Cible de coloration au clic ou à la sélection :</span>
            </span>
            <div
              role="group"
              aria-label="Cible de sélection pour la couleur"
              className={`inline-flex items-center gap-1 p-1 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              {(
                [
                  { id: 'syllable', label: 'Syllabe' },
                  { id: 'word', label: 'Mot' },
                  { id: 'sentence', label: 'Phrase' },
                ] as { id: ColorUnitMode; label: string }[]
              ).map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => handleChangeClickTargetScope(scope.id)}
                  aria-pressed={clickTargetScope === scope.id}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    clickTargetScope === scope.id
                      ? isDark
                        ? 'bg-sky-600 text-white'
                        : 'bg-white text-slate-900 shadow-xs'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting || rawText.trim().length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExporting ? 'Export PDF en cours...' : 'Exporter la fiche en PDF'}</span>
          </button>
        </div>

        {/* Barre d'application de couleur sur la sélection (Syllabe, Mot, Phrase ou Sélection souris) */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Paintbrush className="w-3.5 h-3.5 text-sky-500" />
              <span>
                {selectedSyllableIds.length > 0
                  ? `Appliquer une couleur à la sélection (${selectedSyllableIds.length} syllabe${
                      selectedSyllableIds.length > 1 ? 's' : ''
                    }) :`
                  : 'Sélectionnez du texte à la souris ou cliquez sur la fiche pour le colorer :'}
              </span>
            </span>

            {/* Palette Swatches to apply directly to current selection */}
            <div className="flex items-center gap-1.5">
              {colors.slice(0, colorCount).map((hex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplyColorToSelection(hex)}
                  disabled={selectedSyllableIds.length === 0}
                  title={`Appliquer la couleur ${idx + 1} (${hex}) à la sélection`}
                  aria-label={`Appliquer la couleur ${idx + 1} à la sélection`}
                  style={{ backgroundColor: hex }}
                  className="w-6 h-6 rounded-md border border-black/20 disabled:opacity-40 hover:scale-110 transition-transform cursor-pointer disabled:cursor-not-allowed"
                />
              ))}

              {/* Custom free color picker for selection */}
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="color"
                  aria-label="Choisir une couleur libre pour la sélection"
                  value={customPickerHex}
                  onChange={(e) => {
                    setCustomPickerHex(e.target.value);
                    if (selectedSyllableIds.length > 0) {
                      handleApplyColorToSelection(e.target.value);
                    }
                  }}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleApplyColorToSelection(customPickerHex)}
                  disabled={selectedSyllableIds.length === 0}
                  className={`px-2 py-1 rounded border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Appliquer couleur libre
                </button>
              </div>
            </div>
          </div>

          {/* Quick selection expansion actions when something is selected */}
          {selectedSyllableIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleExpandSelectionToScope('word')}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Étendre au mot
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleExpandSelectionToScope('sentence')}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Étendre à la phrase
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSyllableIds([]);
                  window.getSelection()?.removeAllRanges();
                }}
                aria-label="Effacer la sélection"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isDark
                    ? 'border-slate-700 text-slate-400 hover:text-white'
                    : 'border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Désélectionner</span>
              </button>
            </div>
          ) : (
            statusFeedback && (
              <span className={`text-xs ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                {statusFeedback}
              </span>
            )
          )}
        </div>
      </div>

      {/* Zone 3: Feuille de lecture mise en forme (Seule zone incluse dans l'export PDF) */}
      <div
        ref={sheetRef}
        id="reading-pdf-sheet"
        className={`print-only-sheet rounded-xl border p-8 md:p-10 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* En-tête de la fiche de lecture */}
        <div
          className={`pb-4 mb-6 border-b flex items-center justify-between gap-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <input
            type="text"
            aria-label="Titre de la fiche de lecture"
            value={documentTitle}
            onChange={(e) => onSetDocumentTitle(e.target.value)}
            placeholder="Titre de la fiche de lecture..."
            className={`w-full text-xl md:text-2xl font-bold bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded px-1 -ml-1 ${
              isDark ? 'text-slate-100 placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
            }`}
          />
          <span
            className={`no-print text-xs whitespace-nowrap shrink-0 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {`Cible : ${
              clickTargetScope === 'syllable'
                ? 'syllabe'
                : clickTargetScope === 'word'
                ? 'mot entier'
                : 'phrase entière'
            }`}
          </span>
        </div>

        {/* Zone de lecture interactive (sans contenteditable pour éviter tout crash DOM React) */}
        {rawText.trim().length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              La feuille de lecture est vide. Saisissez votre texte dans le champ ci-dessus ou
              chargez un exemple pédagogique.
            </p>
            <button
              type="button"
              onClick={() => handleLoadSample(SAMPLE_TEXTS[0])}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Charger « Le petit renard curieux »</span>
            </button>
          </div>
        ) : (
          <div
            ref={readingAreaRef}
            id="syllable-reading-area"
            data-testid="syllable-reading-area"
            aria-label="Zone de lecture syllabique interactive"
            onMouseUp={handleDetectTextSelection}
            onKeyUp={handleDetectTextSelection}
            style={{
              fontFamily: fontObj.cssFamily,
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}em`,
              wordSpacing: `${wordSpacing}em`,
            }}
            className="min-h-[300px] rounded-lg whitespace-pre-wrap break-words select-text"
          >
            {tokens.map((token) => {
              if (token.type === 'newline') {
                return <br key={token.id} />;
              }
              if (token.type === 'separator') {
                const sepColor =
                  unitMode === 'sentence'
                    ? colors[token.defaultColorIndex % colorCount] || colors[0]
                    : undefined;
                return (
                  <span key={token.id} style={sepColor ? { color: sepColor } : undefined}>
                    {token.raw}
                  </span>
                );
              }

              return (
                <span
                  key={token.id}
                  data-word-index={token.wordIndex}
                  className="inline-block"
                >
                  {token.syllables.map((syl) => {
                    const defaultHex = colors[syl.defaultColorIndex % colorCount] || colors[0];
                    const hexColor = customSyllableColors[syl.id] || defaultHex;
                    const isSelected = selectedSet.has(syl.id);

                    return (
                      <span
                        key={syl.id}
                        data-syllable-id={syl.id}
                        data-word-index={syl.wordIndex}
                        data-sentence-index={syl.sentenceIndex}
                        title="Cliquez ou sélectionnez pour modifier la couleur (syllabe, mot ou phrase)"
                        onClick={(e) => {
                          const sel = window.getSelection();
                          if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
                            return;
                          }
                          e.stopPropagation();
                          const activeScope = clickTargetScopeRef.current;
                          const targetIds = getSyllableIdsByScope(syl, activeScope);
                          setSelectedSyllableIds(targetIds);

                          const currentColorIdx = colors
                            .slice(0, colorCount)
                            .findIndex((c) => c.toLowerCase() === hexColor.toLowerCase());
                          const nextColorIdx =
                            currentColorIdx >= 0
                              ? (currentColorIdx + 1) % colorCount
                              : (syl.defaultColorIndex + 1) % colorCount;
                          const nextHex = colors[nextColorIdx] || colors[0];
                          onApplyColorToSyllableIds(targetIds, nextHex);

                          const scopeLabel =
                            activeScope === 'syllable'
                              ? `Syllabe « ${syl.text} »`
                              : activeScope === 'word'
                              ? `Mot « ${token.raw} »`
                              : `Phrase #${syl.sentenceIndex + 1}`;
                          setStatusFeedback(`${scopeLabel} → ${nextHex.toUpperCase()}`);
                        }}
                        style={{
                          color: hexColor,
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(56, 189, 248, 0.22)'
                              : 'rgba(2, 132, 199, 0.14)'
                            : undefined,
                          borderBottom: showSyllableArcs
                            ? `2px solid ${hexColor}`
                            : isSelected
                            ? `2px dashed ${hexColor}`
                            : undefined,
                          paddingBottom: showSyllableArcs ? '2px' : undefined,
                          marginRight: showSyllableArcs ? '1px' : undefined,
                        }}
                        className="rounded-xs transition-colors cursor-pointer hover:bg-sky-500/15"
                      >
                        {syl.text}
                      </span>
                    );
                  })}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
