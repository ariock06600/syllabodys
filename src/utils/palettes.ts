export interface PalettePreset {
  id: string;
  name: string;
  description: string;
  lightColors: string[];
  darkColors: string[];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'dys-classique',
    name: 'Classique Orthophonie',
    description: 'Contraste franc Bleu / Rouge / Vert testé en cabinet',
    lightColors: ['#0369A1', '#DC2626', '#15803D', '#7E22CE', '#B45309'],
    darkColors: ['#38BDF8', '#F87171', '#4ADE80', '#C084FC', '#FBBF24'],
  },
  {
    id: 'bicolore-doux',
    name: 'Duo Marine & Corail',
    description: 'Repérage binaire apaisant sans saturation excessive',
    lightColors: ['#1E3A8A', '#C2410C', '#0F766E', '#6D28D9', '#BE123C'],
    darkColors: ['#60A5FA', '#FB923C', '#2DD4BF', '#A78BFA', '#FB7185'],
  },
  {
    id: 'foret-ambre',
    name: 'Émeraude & Ocre',
    description: 'Idéal pour les profils sensibles au rouge vif (daltonisme)',
    lightColors: ['#0F766E', '#B45309', '#1D4ED8', '#7C2D12', '#4338CA'],
    darkColors: ['#2DD4BF', '#FBBF24', '#60A5FA', '#FDBA74', '#818CF8'],
  },
  {
    id: 'contraste-maximal',
    name: 'Haute Visibilité',
    description: 'Contraste maximal WCAG AAA sur papier et écran',
    lightColors: ['#0F172A', '#B91C1C', '#0369A1', '#047857', '#6B21A8'],
    darkColors: ['#F8FAFC', '#FCA5A5', '#7DD3FC', '#6EE7B7', '#D8B4FE'],
  },
];

export interface SampleTextItem {
  id: string;
  title: string;
  level: string;
  content: string;
}

export const SAMPLE_TEXTS: SampleTextItem[] = [
  {
    id: 'renard',
    title: 'Le petit renard curieux (CE1)',
    level: 'Cycle 2 · Décodage',
    content: `Ce matin, le petit renard roux sort doucement de son terrier.\nIl regarde les papillons voler autour du grand chêne de la forêt.\nSoudain, un écureuil agile saute de branche en branche avec une noisette dorée.\nLe renard sourit et continue sa promenade sur le chemin de mousse.`,
  },
  {
    id: 'systeme-solaire',
    title: 'Voyage autour du Soleil (CM1)',
    level: 'Cycle 3 · Sciences',
    content: `Notre système solaire compte huit planètes qui tournent continuellement autour d'une étoile lumineuse : le Soleil.\nLes quatre premières planètes possèdent une surface rocheuse solide.\nPlus loin, Jupiter et Saturne sont des géantes gazeuses entourées d'impressionnants anneaux de glace et de poussière.`,
  },
  {
    id: 'phonologie',
    title: 'Sons complexes et consonnes doubles',
    level: 'Orthophonie · Entraînement',
    content: `L'éléphant traverse tranquillement la grande plaine africaine.\nLes hirondelles annoncent l'arrivée prochaine du printemps en tourbillonnant dans le ciel bleu.\nL'apprenti boulanger prépare de croustillantes baguettes chaudes pour tout le village.`,
  },
];

export type FontFamilyOption = 'opendyslexic' | 'lexend' | 'comicsans' | 'arial';

export const FONT_OPTIONS: {
  id: FontFamilyOption;
  label: string;
  cssFamily: string;
  badge: string;
}[] = [
  {
    id: 'opendyslexic',
    label: 'OpenDyslexic',
    cssFamily: "'OpenDyslexicRegular', 'OpenDyslexic', 'Comic Sans MS', sans-serif",
    badge: 'Spécialisée Dys',
  },
  {
    id: 'lexend',
    label: 'Lexend',
    cssFamily: "'Lexend', sans-serif",
    badge: 'Fluidité visuelle',
  },
  {
    id: 'comicsans',
    label: 'Comic Sans MS',
    cssFamily: "'Comic Sans MS', 'Comic Neue', cursive, sans-serif",
    badge: 'Lettres distinctes',
  },
  {
    id: 'arial',
    label: 'Arial / Verdana',
    cssFamily: 'Arial, Verdana, Helvetica, sans-serif',
    badge: 'Standard sans-serif',
  },
];
