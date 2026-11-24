import type { KeypadStyle } from './configurations';

export type FinishCategory = 'gloss' | 'satin' | 'arch-matte' | 'metal';

export type SurfaceType =
  | 'gloss'
  | 'satin'
  | 'matte'
  | 'metal-brushed'
  | 'metal-polished'
  | 'metal-antique'
  | 'metal-anodized';

export interface LutronFinish {
  /** Unique identifier combining category & code (since WH/BL/TP exist in multiple finish families) */
  id: string;
  /** Official Lutron 2- or 3-letter finish code */
  code: string;
  name: string;
  category: FinishCategory;
  /** Compatible keypad wallplate style */
  style: KeypadStyle;
  surface: SurfaceType;
  /** Calibrated wallplate base hex color */
  hex: string;
  /** Optional metallic gradient for swatch preview */
  swatchGradient?: string;
  /** PBR properties for the wallplate */
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /**
   * True if engraving ink/etching renders light-on-dark (white/silver text),
   * false if dark charcoal text on light buttons.
   */
  isDarkButton: boolean;
  /**
   * For Metal wallplates, Lutron pairs Midnight (MN) or Matte Black (BL) polymer buttons/insert.
   */
  pairedButton?: {
    code: string;
    name: string;
    hex: string;
    surface: 'satin' | 'matte';
    roughness: number;
    isDarkButton: boolean;
  };
}

export interface FinishCategoryMeta {
  id: FinishCategory;
  label: string;
  shortLabel: string;
  style: KeypadStyle;
  subtitle: string;
}

/**
 * Official currently-available Lutron seeTouch® finish families
 * per Lutron Satin Finishes Matrix (P/N 367-2918) and seeTouch spec sheets
 * (369324c, 369354f, 369969b, 369353d).
 */
export const FINISH_CATEGORIES: FinishCategoryMeta[] = [
  {
    id: 'gloss',
    label: 'Claro® Gloss',
    shortLabel: 'Gloss',
    style: 'designer',
    subtitle: '7 Designer Gloss finishes',
  },
  {
    id: 'satin',
    label: 'Satin Colors®',
    shortLabel: 'Satin',
    style: 'designer',
    subtitle: '6 official seeTouch Satin finishes',
  },
  {
    id: 'arch-matte',
    label: 'Architectural Matte',
    shortLabel: 'Arch. Matte',
    style: 'architectural',
    subtitle: '10 Nova T*® Matte finishes',
  },
  {
    id: 'metal',
    label: 'Metal Wallplates',
    shortLabel: 'Metals',
    style: 'architectural',
    subtitle: 'Stainless Steel + 12 Architectural Metals',
  },
];

const PAIRED_MIDNIGHT = {
  code: 'MN',
  name: 'Satin Midnight',
  hex: '#1c1d20',
  surface: 'satin' as const,
  roughness: 0.46,
  isDarkButton: true,
};

const PAIRED_ARCH_BLACK = {
  code: 'BL',
  name: 'Architectural Matte Black',
  hex: '#191a1c',
  surface: 'matte' as const,
  roughness: 0.62,
  isDarkButton: true,
};

export const LUTRON_FINISHES: LutronFinish[] = [
  // =========================================================================
  // 1. CLARO GLOSS FINISHES (7) — Designer Style (Spec 369324c / 369354f)
  // =========================================================================
  {
    id: 'gloss-WH',
    code: 'WH',
    name: 'White',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#f4f4f2',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: false,
  },
  {
    id: 'gloss-IV',
    code: 'IV',
    name: 'Ivory',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#e9dec8',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: false,
  },
  {
    id: 'gloss-LA',
    code: 'LA',
    name: 'Light Almond',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#e8dfd0',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: false,
  },
  {
    id: 'gloss-AL',
    code: 'AL',
    name: 'Almond',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#d9cbb3',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: false,
  },
  {
    id: 'gloss-GR',
    code: 'GR',
    name: 'Gray',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#84878a',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: true,
  },
  {
    id: 'gloss-BR',
    code: 'BR',
    name: 'Brown',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#463329',
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    isDarkButton: true,
  },
  {
    id: 'gloss-BL',
    code: 'BL',
    name: 'Black',
    category: 'gloss',
    style: 'designer',
    surface: 'gloss',
    hex: '#141517',
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    isDarkButton: true,
  },

  // =========================================================================
  // 2. SATIN COLORS (6) — Official Current seeTouch Satin Finishes
  //    (Lutron P/N 367-2918 & Spec 369324c / 369354f / 369969b)
  //    Note: Expanded 20-color "New Satin Finishes" apply to Sunnata/Diva,
  //    while seeTouch supports these 6 Satin finishes.
  // =========================================================================
  {
    id: 'satin-SW',
    code: 'SW',
    name: 'Snow',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#f0efeb',
    roughness: 0.48,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    isDarkButton: false,
  },
  {
    id: 'satin-BI',
    code: 'BI',
    name: 'Biscuit',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#e4dac9',
    roughness: 0.48,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    isDarkButton: false,
  },
  {
    id: 'satin-TP',
    code: 'TP',
    name: 'Taupe',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#afa495',
    roughness: 0.49,
    metalness: 0.0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.52,
    isDarkButton: false,
  },
  {
    id: 'satin-PD',
    code: 'PD',
    name: 'Palladium',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#b9b8b4',
    roughness: 0.48,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    isDarkButton: false,
  },
  {
    id: 'satin-MN',
    code: 'MN',
    name: 'Midnight',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#1c1d20',
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.48,
    isDarkButton: true,
  },
  {
    id: 'satin-HT',
    code: 'HT',
    name: 'Hot',
    category: 'satin',
    style: 'designer',
    surface: 'satin',
    hex: '#9c2529',
    roughness: 0.47,
    metalness: 0.0,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    isDarkButton: true,
  },

  // =========================================================================
  // 3. ARCHITECTURAL MATTE FINISHES (10) — Nova T* Architectural Style (369353d)
  // =========================================================================
  {
    id: 'arch-WH',
    code: 'WH',
    name: 'White',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#efeee9',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-IV',
    code: 'IV',
    name: 'Ivory',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#e6dbc4',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-LA',
    code: 'LA',
    name: 'Light Almond',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#e4dac9',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-AL',
    code: 'AL',
    name: 'Almond',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#d5c6ae',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-BE',
    code: 'BE',
    name: 'Beige',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#c9bba4',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-TP',
    code: 'TP',
    name: 'Taupe',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#aba091',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: false,
  },
  {
    id: 'arch-GR',
    code: 'GR',
    name: 'Gray',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#7f8387',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: true,
  },
  {
    id: 'arch-SI',
    code: 'SI',
    name: 'Sienna',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#573a2f',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: true,
  },
  {
    id: 'arch-BR',
    code: 'BR',
    name: 'Brown',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#45342a',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: true,
  },
  {
    id: 'arch-BL',
    code: 'BL',
    name: 'Black',
    category: 'arch-matte',
    style: 'architectural',
    surface: 'matte',
    hex: '#191a1c',
    roughness: 0.62,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.7,
    isDarkButton: true,
  },

  // =========================================================================
  // 4. METAL WALLPLATES (1 Designer + 12 Architectural Metals)
  // =========================================================================
  {
    id: 'metal-SS',
    code: 'SS',
    name: 'Stainless Steel',
    category: 'metal',
    style: 'designer',
    surface: 'metal-brushed',
    hex: '#c4c7ca',
    swatchGradient: 'linear-gradient(135deg, #d8dcdf 0%, #9fa3a8 50%, #e1e4e7 100%)',
    roughness: 0.28,
    metalness: 0.95,
    clearcoat: 0.05,
    clearcoatRoughness: 0.3,
    isDarkButton: true,
    pairedButton: PAIRED_MIDNIGHT,
  },
  {
    id: 'metal-SB',
    code: 'SB',
    name: 'Satin Brass',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-brushed',
    hex: '#cbb074',
    swatchGradient: 'linear-gradient(135deg, #dfc68d 0%, #a5884a 50%, #e5cf9b 100%)',
    roughness: 0.29,
    metalness: 0.94,
    clearcoat: 0.08,
    clearcoatRoughness: 0.25,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-BB',
    code: 'BB',
    name: 'Bright Brass',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-polished',
    hex: '#d9be76',
    swatchGradient: 'linear-gradient(135deg, #f3de9b 0%, #b39246 48%, #f8e9b5 100%)',
    roughness: 0.11,
    metalness: 1.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.08,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-QB',
    code: 'QB',
    name: 'Antique Brass',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-antique',
    hex: '#7d6640',
    swatchGradient: 'linear-gradient(135deg, #987e52 0%, #594629 52%, #8e754a 100%)',
    roughness: 0.36,
    metalness: 0.88,
    clearcoat: 0.1,
    clearcoatRoughness: 0.3,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-QZ',
    code: 'QZ',
    name: 'Antique Bronze',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-antique',
    hex: '#4a3c31',
    swatchGradient: 'linear-gradient(135deg, #655344 0%, #31271f 52%, #59483b 100%)',
    roughness: 0.38,
    metalness: 0.84,
    clearcoat: 0.08,
    clearcoatRoughness: 0.35,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-SN',
    code: 'SN',
    name: 'Satin Nickel',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-brushed',
    hex: '#bab6ae',
    swatchGradient: 'linear-gradient(135deg, #d2cec6 0%, #928e86 50%, #dcd8d0 100%)',
    roughness: 0.28,
    metalness: 0.95,
    clearcoat: 0.05,
    clearcoatRoughness: 0.28,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-BN',
    code: 'BN',
    name: 'Bright Nickel',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-polished',
    hex: '#ccc7bd',
    swatchGradient: 'linear-gradient(135deg, #e7e3da 0%, #9b968c 48%, #f0ece4 100%)',
    roughness: 0.11,
    metalness: 1.0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.08,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-SC',
    code: 'SC',
    name: 'Satin Chrome',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-brushed',
    hex: '#c8cccf',
    swatchGradient: 'linear-gradient(135deg, #dfe3e6 0%, #9fa5aa 50%, #e7ebee 100%)',
    roughness: 0.25,
    metalness: 0.96,
    clearcoat: 0.06,
    clearcoatRoughness: 0.25,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-BC',
    code: 'BC',
    name: 'Bright Chrome',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-polished',
    hex: '#d9dde0',
    swatchGradient: 'linear-gradient(135deg, #f5f7f9 0%, #9da4aa 48%, #ffffff 100%)',
    roughness: 0.07,
    metalness: 1.0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.05,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-AU',
    code: 'AU',
    name: 'Gold',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-polished',
    hex: '#e0b958',
    swatchGradient: 'linear-gradient(135deg, #f9df8e 0%, #b88c2f 48%, #fce7a6 100%)',
    roughness: 0.12,
    metalness: 1.0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.08,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-CLA',
    code: 'CLA',
    name: 'Clear Anodized Aluminum',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-anodized',
    hex: '#c6c9cc',
    swatchGradient: 'linear-gradient(135deg, #d7dadd 0%, #aeb2b6 50%, #dce0e3 100%)',
    roughness: 0.35,
    metalness: 0.9,
    clearcoat: 0.04,
    clearcoatRoughness: 0.38,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-BRA',
    code: 'BRA',
    name: 'Brass Anodized Aluminum',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-anodized',
    hex: '#b99f68',
    swatchGradient: 'linear-gradient(135deg, #ccb47e 0%, #987e4b 50%, #d4be8a 100%)',
    roughness: 0.35,
    metalness: 0.9,
    clearcoat: 0.04,
    clearcoatRoughness: 0.38,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
  {
    id: 'metal-BLA',
    code: 'BLA',
    name: 'Black Anodized Aluminum',
    category: 'metal',
    style: 'architectural',
    surface: 'metal-anodized',
    hex: '#222427',
    swatchGradient: 'linear-gradient(135deg, #36393e 0%, #151618 52%, #2f3237 100%)',
    roughness: 0.36,
    metalness: 0.88,
    clearcoat: 0.05,
    clearcoatRoughness: 0.38,
    isDarkButton: true,
    pairedButton: PAIRED_ARCH_BLACK,
  },
];

export function getFinishById(id: string): LutronFinish {
  return (
    LUTRON_FINISHES.find((f) => f.id === id) ??
    LUTRON_FINISHES.find((f) => f.id === 'satin-SW')!
  );
}

export interface WallPreset {
  id: string;
  name: string;
  textureType: 'drywall' | 'plaster' | 'wood' | 'concrete';
  color: string;
  roughness: number;
}

export const WALL_PRESETS: WallPreset[] = [
  {
    id: 'gallery-white',
    name: 'Gallery Drywall',
    textureType: 'drywall',
    color: '#e5e2da',
    roughness: 0.88,
  },
  {
    id: 'warm-plaster',
    name: 'Limestone Plaster',
    textureType: 'plaster',
    color: '#d4cabd',
    roughness: 0.84,
  },
  {
    id: 'sage-paint',
    name: 'Architectural Sage',
    textureType: 'drywall',
    color: '#8f998c',
    roughness: 0.88,
  },
  {
    id: 'charcoal-wall',
    name: 'Charcoal Matte',
    textureType: 'drywall',
    color: '#2e3136',
    roughness: 0.9,
  },
  {
    id: 'white-oak',
    name: 'White Oak Panel',
    textureType: 'wood',
    color: '#b5926b',
    roughness: 0.68,
  },
  {
    id: 'concrete',
    name: 'Poured Concrete',
    textureType: 'concrete',
    color: '#9e9c97',
    roughness: 0.86,
  },
];
