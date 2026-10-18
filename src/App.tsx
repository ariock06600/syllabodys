import { useState, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ReadingWorkspace } from './components/ReadingWorkspace';
import {
  PALETTE_PRESETS,
  PalettePreset,
  SAMPLE_TEXTS,
  FontFamilyOption,
  FONT_OPTIONS,
} from './utils/palettes';
import { tokenizeAndSyllabifyText, ColorUnitMode } from './utils/syllabifier';
import { BookOpen, CheckCircle2, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    html2pdf?: () => {
      set: (opt: Record<string, unknown>) => {
        from: (el: HTMLElement) => {
          save: () => Promise<void>;
        };
      };
    };
  }
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeSection, setActiveSection] = useState<'atelier' | 'modeles' | 'guide'>('atelier');

  // Document content state
  const [documentTitle, setDocumentTitle] = useState<string>(SAMPLE_TEXTS[0].title);
  const [rawText, setRawText] = useState<string>(SAMPLE_TEXTS[0].content);

  // Accessibility & Typography state
  const [fontFamily, setFontFamily] = useState<FontFamilyOption>('opendyslexic');
  const [fontSize, setFontSize] = useState<number>(24);
  const [lineHeight, setLineHeight] = useState<number>(2.0);
  const [letterSpacing, setLetterSpacing] = useState<number>(0.06);
  const [wordSpacing, setWordSpacing] = useState<number>(0.25);

  // Palette & Alternation state
  const [unitMode, setUnitMode] = useState<ColorUnitMode>('syllable');
  const [colorCount, setColorCount] = useState<number>(2);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PALETTE_PRESETS[0].id);
  const [lightColors, setLightColors] = useState<string[]>([...PALETTE_PRESETS[0].lightColors]);
  const [darkColors, setDarkColors] = useState<string[]>([...PALETTE_PRESETS[0].darkColors]);
  const [resetColorPerWord, setResetColorPerWord] = useState<boolean>(false);
  const [showSyllableArcs, setShowSyllableArcs] = useState<boolean>(false);

  // Manual color overrides mapped by syllable ID -> hex string
  const [customSyllableColors, setCustomSyllableColors] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const sheetRef = useRef<HTMLDivElement | null>(null);

  const activeColors = theme === 'dark' ? darkColors : lightColors;

  const tokens = useMemo(
    () => tokenizeAndSyllabifyText(rawText, colorCount, resetColorPerWord, unitMode),
    [rawText, colorCount, resetColorPerWord, unitMode]
  );

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    // Clear manual overrides when switching theme so preset contrast colors apply across the whole text
    setCustomSyllableColors({});
  };

  /**
   * Selecting a preset applies immediately to the ENTIRE text, clearing any previous manual changes.
   */
  const handleSelectPreset = (preset: PalettePreset) => {
    setSelectedPresetId(preset.id);
    setLightColors([...preset.lightColors]);
    setDarkColors([...preset.darkColors]);
    setCustomSyllableColors({});
  };

  const handleUpdateSingleColor = (index: number, hex: string) => {
    setLightColors((prev) => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
    setDarkColors((prev) => {
      const next = [...prev];
      next[index] = hex;
      return next;
    });
    setCustomSyllableColors({});
  };

  const handleApplyColorToSyllableIds = (syllableIds: string[], colorHex: string) => {
    setCustomSyllableColors((prev) => {
      const next = { ...prev };
      for (const id of syllableIds) {
        next[id] = colorHex;
      }
      return next;
    });
  };

  const handleResetAll = () => {
    setTheme('light');
    setFontFamily('opendyslexic');
    setFontSize(24);
    setLineHeight(2.0);
    setLetterSpacing(0.06);
    setWordSpacing(0.25);
    setUnitMode('syllable');
    setColorCount(2);
    setSelectedPresetId(PALETTE_PRESETS[0].id);
    setLightColors([...PALETTE_PRESETS[0].lightColors]);
    setDarkColors([...PALETTE_PRESETS[0].darkColors]);
    setResetColorPerWord(false);
    setShowSyllableArcs(false);
    setCustomSyllableColors({});
  };

  const handleExportPdf = async () => {
    const readingAreaEl = document.getElementById('syllable-reading-area');
    if (!readingAreaEl) return;

    setIsExporting(true);
    let tempWrapper: HTMLDivElement | null = null;

    try {
      const safeFilename =
        (documentTitle || 'lecture-syllabique')
          .toLowerCase()
          .replace(/[^a-z0-9à-ÿ]+/gi, '-')
          .replace(/^-|-$/g, '') + '.pdf';

      const fontObj = FONT_OPTIONS.find((f) => f.id === fontFamily) || FONT_OPTIONS[0];
      // Always export on a white background with dark text to avoid wasting ink when printing
      const bgHex = '#ffffff';
      const fgHex = '#0f172a';
      const borderHex = '#e2e8f0';
      const printPalette = lightColors;

      const resolvePrintColor = (rawHex: string): string => {
        const idxInDark = darkColors.findIndex(
          (c) => c.toLowerCase() === rawHex.toLowerCase()
        );
        if (idxInDark >= 0 && printPalette[idxInDark]) {
          return printPalette[idxInDark];
        }
        return rawHex;
      };

      tempWrapper = document.createElement('div');
      tempWrapper.id = 'pdf-clean-export-root';
      tempWrapper.style.cssText = [
        `background-color: ${bgHex}`,
        `color: ${fgHex}`,
        'padding: 28px 32px',
        'width: 740px',
        'box-sizing: border-box',
        "font-family: 'Plus Jakarta Sans', Arial, sans-serif",
      ].join(';');

      if (documentTitle.trim()) {
        const titleEl = document.createElement('h1');
        titleEl.textContent = documentTitle;
        titleEl.style.cssText = [
          `color: ${fgHex}`,
          `border-bottom: 1px solid ${borderHex}`,
          'padding-bottom: 12px',
          'margin: 0 0 20px 0',
          'font-size: 22px',
          'font-weight: 700',
        ].join(';');
        tempWrapper.appendChild(titleEl);
      }

      const contentClone = document.createElement('div');
      contentClone.style.cssText = [
        `font-family: ${fontObj.cssFamily}`,
        `font-size: ${fontSize}px`,
        `line-height: ${lineHeight}`,
        `letter-spacing: ${letterSpacing}em`,
        `word-spacing: ${wordSpacing}em`,
        `color: ${fgHex}`,
        'white-space: pre-wrap',
        'word-break: break-word',
      ].join(';');

      tokens.forEach((token) => {
        if (token.type === 'newline') {
          contentClone.appendChild(document.createElement('br'));
          return;
        }
        if (token.type === 'separator') {
          const sepSpan = document.createElement('span');
          sepSpan.textContent = token.raw;
          if (unitMode === 'sentence') {
            sepSpan.style.color =
              printPalette[token.defaultColorIndex % colorCount] || printPalette[0];
          }
          contentClone.appendChild(sepSpan);
          return;
        }

        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';

        token.syllables.forEach((syl) => {
          const defaultHex = printPalette[syl.defaultColorIndex % colorCount] || printPalette[0];
          const hexColor = customSyllableColors[syl.id]
            ? resolvePrintColor(customSyllableColors[syl.id])
            : defaultHex;
          const sylSpan = document.createElement('span');
          sylSpan.textContent = syl.text;
          sylSpan.style.color = hexColor;
          if (showSyllableArcs) {
            sylSpan.style.borderBottom = `2px solid ${hexColor}`;
            sylSpan.style.paddingBottom = '2px';
            sylSpan.style.marginRight = '1px';
          }
          wordSpan.appendChild(sylSpan);
        });

        contentClone.appendChild(wordSpan);
      });

      tempWrapper.appendChild(contentClone);

      if (typeof window.html2pdf === 'function') {
        await window
          .html2pdf()
          .set({
            margin: [12, 12, 12, 12],
            filename: safeFilename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              onclone: (clonedDoc: Document) => {
                clonedDoc.querySelectorAll('style').forEach((styleTag) => {
                  if (
                    styleTag.textContent &&
                    (styleTag.textContent.includes('oklch') ||
                      styleTag.textContent.includes('oklab') ||
                      styleTag.textContent.includes('color-mix'))
                  ) {
                    styleTag.remove();
                  }
                });
              },
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(tempWrapper)
          .save();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Erreur export PDF, bascule vers impression native:', err);
      window.print();
    } finally {
      if (tempWrapper && tempWrapper.parentNode) {
        tempWrapper.parentNode.removeChild(tempWrapper);
      }
      setIsExporting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onExportPdf={handleExportPdf}
        onResetAll={handleResetAll}
        isExporting={isExporting}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeSection === 'modeles' && (
          <section
            aria-label="Bibliothèque de textes pédagogiques"
            className={`no-print rounded-xl border p-5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  <span>Textes pédagogiques prêts à l'emploi</span>
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Sélectionnez un texte adapté au niveau de l'élève pour l'ouvrir dans l'atelier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('atelier')}
                className="text-xs font-semibold text-sky-500 hover:underline cursor-pointer"
              >
                Retour à l'atelier
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SAMPLE_TEXTS.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 flex flex-col justify-between ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.level}
                    </div>
                    <h3 className="text-sm font-bold mt-1">{item.title}</h3>
                    <p
                      className={`text-xs mt-2 line-clamp-3 leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {item.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentTitle(item.title);
                      setRawText(item.content);
                      setCustomSyllableColors({});
                      setActiveSection('atelier');
                    }}
                    className="mt-4 w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Charger dans l'atelier
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'guide' && (
          <section
            aria-label="Règles de segmentation syllabique française"
            className={`no-print rounded-xl border p-5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  <span>Règles de découpage et de coloration</span>
                </h2>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Principes phonologiques et outils de coloration multi-niveaux (syllabe, mot,
                  phrase).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSection('atelier')}
                className="text-xs font-semibold text-sky-500 hover:underline cursor-pointer"
              >
                Masquer l'aide
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
              <div
                className={`p-3.5 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>1. Alternance Syllabe, Mot ou Phrase</span>
                </div>
                <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Choisissez dans le panneau gauche si l'alternance automatique se fait par{' '}
                  <strong>syllabe</strong>, <strong>mot à mot</strong> ou{' '}
                  <strong>par phrase</strong> sur l'ensemble du texte.
                </p>
              </div>
              <div
                className={`p-3.5 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. Coloration par sélection de texte</span>
                </div>
                <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Surlignez à la souris un mot ou une phrase entière dans la fiche puis cliquez sur
                  une pastille de couleur pour l'appliquer à toute la sélection.
                </p>
              </div>
              <div
                className={`p-3.5 rounded-lg border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3. Préréglages globaux</span>
                </div>
                <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Cliquer sur un préréglage de palette réapplique immédiatement ses couleurs à
                  l'intégralité du texte, quelles que soient les retouches précédentes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Main Two-Column Workbench */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <ControlPanel
            theme={theme}
            onSetTheme={(newTheme) => {
              setTheme(newTheme);
              setCustomSyllableColors({});
            }}
            fontFamily={fontFamily}
            onSetFontFamily={setFontFamily}
            fontSize={fontSize}
            onSetFontSize={setFontSize}
            lineHeight={lineHeight}
            onSetLineHeight={setLineHeight}
            letterSpacing={letterSpacing}
            onSetLetterSpacing={setLetterSpacing}
            wordSpacing={wordSpacing}
            onSetWordSpacing={setWordSpacing}
            unitMode={unitMode}
            onSetUnitMode={(mode) => {
              setUnitMode(mode);
              setCustomSyllableColors({});
            }}
            colorCount={colorCount}
            onSetColorCount={(count) => {
              setColorCount(count);
              setCustomSyllableColors({});
            }}
            colors={activeColors}
            onUpdateSingleColor={handleUpdateSingleColor}
            selectedPresetId={selectedPresetId}
            onSelectPreset={handleSelectPreset}
            resetColorPerWord={resetColorPerWord}
            onSetResetColorPerWord={(val) => {
              setResetColorPerWord(val);
              setCustomSyllableColors({});
            }}
            showSyllableArcs={showSyllableArcs}
            onSetShowSyllableArcs={setShowSyllableArcs}
            customOverridesCount={Object.keys(customSyllableColors).length}
            onClearCustomOverrides={() => setCustomSyllableColors({})}
          />

          <ReadingWorkspace
            theme={theme}
            documentTitle={documentTitle}
            onSetDocumentTitle={setDocumentTitle}
            rawText={rawText}
            onSetRawText={(val) => {
              setRawText(val);
              setCustomSyllableColors({});
            }}
            tokens={tokens}
            fontFamily={fontFamily}
            fontSize={fontSize}
            lineHeight={lineHeight}
            letterSpacing={letterSpacing}
            wordSpacing={wordSpacing}
            unitMode={unitMode}
            colors={activeColors}
            colorCount={colorCount}
            customSyllableColors={customSyllableColors}
            onApplyColorToSyllableIds={handleApplyColorToSyllableIds}
            showSyllableArcs={showSyllableArcs}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            sheetRef={sheetRef}
          />
        </div>
      </main>
    </div>
  );
}
