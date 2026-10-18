import React from 'react';
import { Sun, Moon, FileDown, RotateCcw } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onExportPdf: () => void;
  onResetAll: () => void;
  isExporting: boolean;
  activeSection: 'atelier' | 'modeles' | 'guide';
  onSelectSection: (sec: 'atelier' | 'modeles' | 'guide') => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onExportPdf,
  onResetAll,
  isExporting,
  activeSection,
  onSelectSection,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`no-print flex items-center justify-between gap-8 px-6 py-3.5 border-b transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Zone 1: Brand Title (Single element wordmark per Top Bar Contract) */}
      <a
        href="#atelier"
        onClick={(e) => {
          e.preventDefault();
          onSelectSection('atelier');
        }}
        className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
      >
        SyllaboDys
      </a>

      {/* Zone 2: Clean single-line navigation links */}
      <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-6 text-sm font-medium">
        <a
          href="#atelier"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('atelier');
          }}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
            activeSection === 'atelier'
              ? isDark
                ? 'border-sky-400 text-white'
                : 'border-sky-600 text-slate-900'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-100'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Atelier de lecture
        </a>
        <a
          href="#modeles"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('modeles');
          }}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
            activeSection === 'modeles'
              ? isDark
                ? 'border-sky-400 text-white'
                : 'border-sky-600 text-slate-900'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-100'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Textes pédagogiques
        </a>
        <a
          href="#guide"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('guide');
          }}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
            activeSection === 'guide'
              ? isDark
                ? 'border-sky-400 text-white'
                : 'border-sky-600 text-slate-900'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-slate-100'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Règles syllabiques
        </a>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
            isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          <span>{isDark ? 'Mode Clair' : 'Mode Sombre'}</span>
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Réinitialiser</span>
        </button>
      </nav>

      {/* Zone 3: 1 Primary CTA button */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <FileDown className="w-4 h-4" />
          <span>{isExporting ? 'Génération PDF...' : 'Exporter en PDF'}</span>
        </button>
      </div>
    </header>
  );
};
