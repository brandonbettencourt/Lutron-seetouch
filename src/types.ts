import type { ConfigCode, KeypadStyle } from './data/configurations';

export type TextAlignment = 'left' | 'center' | 'right';
export type TextCasing = 'as-typed' | 'title' | 'upper';
export type CameraPresetId = 'hero' | 'front' | 'side' | 'macro';
export type WallpaperRepeatMode = 'tile' | 'mirror';

export interface WallpaperState {
  /** Object URL or data URL of uploaded custom wallpaper image (null = use preset wall) */
  imageUrl: string | null;
  fileName: string;
  /** Real-world horizontal pattern repeat width in inches (2..36 in) */
  repeatWidthInches: number;
  repeatMode: WallpaperRepeatMode;
  /** Natural image aspect ratio (width / height) to preserve exact pattern proportions */
  naturalAspect: number;
}

export interface MockupState {
  style: KeypadStyle;
  configCode: ConfigCode;
  finishId: string;
  /** Custom labels keyed by button slot index (0..5) */
  labels: string[];
  /** Active green status LED states keyed by button slot index (0..5) */
  activeLeds: boolean[];
  textAlignment: TextAlignment;
  textCasing: TextCasing;
  /** Ambient room light 0 (dark bedroom) .. 100 (bright architectural daylight) */
  roomLight: number;
  /** Green backlit engraving intensity 0 .. 100 */
  backlight: number;
  /** Simulated dimmer level controlled by Raise/Lower rocker (0..100) */
  dimmerLevel: number;
  /** Wall backdrop preset ID */
  wallPresetId: string;
  /** Custom wall color override (hex) */
  wallColor: string;
  /** Optional custom uploaded wallpaper image & repeat scaling */
  wallpaper: WallpaperState;
}

export function formatEngravingText(
  raw: string,
  casing: TextCasing
): string {
  const trimmed = raw.slice(0, 18);
  if (casing === 'upper') return trimmed.toUpperCase();
  if (casing === 'title') {
    return trimmed.replace(
      /\w\S*/g,
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }
  return trimmed;
}

export function getLutronSku(
  style: KeypadStyle,
  configCode: ConfigCode,
  finishCode: string
): string {
  if (style === 'architectural') {
    return `HQWA-${configCode}N-${finishCode}`;
  }
  return `HQRD-${configCode}-${finishCode}`;
}

export function encodeStateToHash(state: MockupState): string {
  const params = new URLSearchParams();
  params.set('s', state.style);
  params.set('c', state.configCode);
  params.set('f', state.finishId);
  params.set('l', state.labels.join('|'));
  params.set(
    'led',
    state.activeLeds.map((b) => (b ? '1' : '0')).join('')
  );
  params.set('a', state.textAlignment);
  params.set('tc', state.textCasing);
  params.set('rl', String(Math.round(state.roomLight)));
  params.set('bl', String(Math.round(state.backlight)));
  params.set('wp', state.wallPresetId);
  params.set('wc', state.wallColor.replace('#', ''));
  return `#${params.toString()}`;
}

export function decodeStateFromHash(
  hash: string,
  fallback: MockupState
): MockupState {
  if (!hash || hash.length < 2) return fallback;
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const style = params.get('s');
    const configCode = params.get('c');
    const finishId = params.get('f');
    const labelsRaw = params.get('l');
    const ledRaw = params.get('led');
    const align = params.get('a');
    const casing = params.get('tc');
    const rl = params.get('rl');
    const bl = params.get('bl');
    const wp = params.get('wp');
    const wc = params.get('wc');

    return {
      ...fallback,
      style:
        style === 'designer' || style === 'architectural'
          ? style
          : fallback.style,
      configCode: (configCode as ConfigCode) || fallback.configCode,
      finishId: finishId || fallback.finishId,
      labels: labelsRaw ? labelsRaw.split('|') : fallback.labels,
      activeLeds: ledRaw
        ? ledRaw.split('').map((ch) => ch === '1')
        : fallback.activeLeds,
      textAlignment:
        align === 'left' || align === 'center' || align === 'right'
          ? align
          : fallback.textAlignment,
      textCasing:
        casing === 'as-typed' || casing === 'title' || casing === 'upper'
          ? casing
          : fallback.textCasing,
      roomLight: rl !== null && !Number.isNaN(Number(rl)) ? Number(rl) : fallback.roomLight,
      backlight: bl !== null && !Number.isNaN(Number(bl)) ? Number(bl) : fallback.backlight,
      wallPresetId: wp || fallback.wallPresetId,
      wallColor:
        wc && /^[0-9a-fA-F]{6}$/.test(wc) ? `#${wc}` : fallback.wallColor,
    };
  } catch {
    return fallback;
  }
}
