export type KeypadStyle = 'designer' | 'architectural';

export type ConfigCode =
  | 'W3BS'
  | 'W3BSRL'
  | 'W3S'
  | 'W4BS'
  | 'W4S'
  | 'W5B'
  | 'W5BRL'
  | 'W6B'
  | 'W6BRL';

export interface ButtonSlotSpec {
  id: string;
  /** Center Y position in mm within the keypad opening (0 = vertical center, +Y = up) */
  centerY: number;
  /** Button height in mm */
  height: number;
  /** Default engraving label */
  defaultLabel: string;
  /** Whether this button is initially lit with its green status LED */
  defaultActive?: boolean;
  /** True for the Raise/Lower dimming split rocker at bottom */
  isRaiseLower?: boolean;
}

export interface KeypadConfiguration {
  code: ConfigCode;
  name: string;
  shortName: string;
  buttonCount: number;
  hasRaiseLower: boolean;
  isSceneGroup: boolean;
  description: string;
  slots: ButtonSlotSpec[];
}

/**
 * Computes evenly stacked button vertical positions (centerY, height) inside
 * the 62.2 mm interior bay of a Lutron seeTouch keypad.
 */
function buildUniformSlots(
  count: number,
  hasRaiseLower: boolean,
  labels: string[],
  options: {
    bayHeight?: number;
    gap?: number;
    rlGap?: number;
    rlHeight?: number;
    buttonHeight?: number;
  } = {}
): ButtonSlotSpec[] {
  const bayHeight = options.bayHeight ?? 62.2;
  const gap = options.gap ?? 0.68;
  const rlHeight = options.rlHeight ?? 8.2;
  const rlGap = options.rlGap ?? 0.95;

  let btnHeight = options.buttonHeight;
  if (!btnHeight) {
    if (hasRaiseLower) {
      const remaining = bayHeight - rlHeight - rlGap - (count - 1) * gap;
      btnHeight = remaining / count;
    } else {
      const remaining = bayHeight - (count - 1) * gap;
      btnHeight = remaining / count;
    }
  }

  const totalStack =
    count * btnHeight +
    (count - 1) * gap +
    (hasRaiseLower ? rlGap + rlHeight : 0);

  let cursorY = totalStack / 2;
  const slots: ButtonSlotSpec[] = [];

  for (let i = 0; i < count; i++) {
    const centerY = cursorY - btnHeight / 2;
    slots.push({
      id: `btn-${i + 1}`,
      centerY,
      height: btnHeight,
      defaultLabel: labels[i] ?? `Scene ${i + 1}`,
      defaultActive: i === 0,
    });
    cursorY -= btnHeight + (i < count - 1 ? gap : 0);
  }

  if (hasRaiseLower) {
    cursorY -= rlGap;
    slots.push({
      id: 'raise-lower',
      centerY: cursorY - rlHeight / 2,
      height: rlHeight,
      defaultLabel: 'Raise / Lower',
      isRaiseLower: true,
    });
  }

  return slots;
}

/**
 * Computes Lutron W3S / W4S "Scene + Off + Raise/Lower" grouped layout:
 * Top scene buttons tightly stacked, distinct bezel divider bar, single "Off"
 * button, then Raise/Lower dimming rocker at bottom.
 */
function buildSceneOffSlots(
  sceneCount: 3 | 4,
  labels: string[]
): ButtonSlotSpec[] {
  const bayHeight = 62.2;
  const tightGap = 0.85;
  const rlGap = 1.1;
  const dividerGap = sceneCount === 3 ? 7.6 : 4.4;
  const rlHeight = sceneCount === 3 ? 8.5 : 8.0;
  const btnHeight =
    (bayHeight -
      rlHeight -
      rlGap -
      dividerGap -
      (sceneCount - 1) * tightGap) /
    (sceneCount + 1);

  let cursorY = bayHeight / 2;
  const slots: ButtonSlotSpec[] = [];

  for (let i = 0; i < sceneCount; i++) {
    slots.push({
      id: `btn-${i + 1}`,
      centerY: cursorY - btnHeight / 2,
      height: btnHeight,
      defaultLabel: labels[i] ?? `Scene ${i + 1}`,
      defaultActive: i === 0,
    });
    cursorY -= btnHeight + (i < sceneCount - 1 ? tightGap : 0);
  }

  // Divider bar gap between scenes and Off button
  cursorY -= dividerGap;
  slots.push({
    id: `btn-${sceneCount + 1}`,
    centerY: cursorY - btnHeight / 2,
    height: btnHeight,
    defaultLabel: labels[sceneCount] ?? 'Off',
    defaultActive: false,
  });
  cursorY -= btnHeight + rlGap;

  slots.push({
    id: 'raise-lower',
    centerY: cursorY - rlHeight / 2,
    height: rlHeight,
    defaultLabel: 'Raise / Lower',
    isRaiseLower: true,
  });

  return slots;
}

export const KEYPAD_CONFIGURATIONS: KeypadConfiguration[] = [
  {
    code: 'W3BS',
    name: '3-Button Spaced',
    shortName: '3-Btn',
    buttonCount: 3,
    hasRaiseLower: false,
    isSceneGroup: false,
    description: '3 extra-large generously spaced buttons without dimming rocker.',
    slots: buildUniformSlots(3, false, ['Welcome', 'Evening', 'All Off'], {
      buttonHeight: 14.0,
      gap: 5.4,
    }),
  },
  {
    code: 'W3BSRL',
    name: '3-Button w/ Raise/Lower',
    shortName: '3-Btn R/L',
    buttonCount: 3,
    hasRaiseLower: true,
    isSceneGroup: false,
    description: '3 large spaced buttons paired with bottom Raise/Lower dimming rocker.',
    slots: buildUniformSlots(3, true, ['Bright', 'Relax', 'All Off'], {
      buttonHeight: 12.2,
      gap: 4.1,
      rlGap: 5.2,
      rlHeight: 8.6,
    }),
  },
  {
    code: 'W3S',
    name: '3-Scene + Off w/ Raise/Lower',
    shortName: '3-Scene R/L',
    buttonCount: 4,
    hasRaiseLower: true,
    isSceneGroup: true,
    description: '3 grouped scene buttons, bezel divider, dedicated Off button, and Raise/Lower.',
    slots: buildSceneOffSlots(3, ['Daytime', 'Entertain', 'Dine', 'Off']),
  },
  {
    code: 'W4BS',
    name: '4-Button Spaced',
    shortName: '4-Btn',
    buttonCount: 4,
    hasRaiseLower: false,
    isSceneGroup: false,
    description: '4 large evenly spaced buttons across the full opening.',
    slots: buildUniformSlots(4, false, ['Bright', 'Cook', 'Dine', 'All Off'], {
      buttonHeight: 12.2,
      gap: 3.6,
    }),
  },
  {
    code: 'W4S',
    name: '4-Scene + Off w/ Raise/Lower',
    shortName: '4-Scene R/L',
    buttonCount: 5,
    hasRaiseLower: true,
    isSceneGroup: true,
    description: 'Classic 4 grouped scene buttons, bezel divider, dedicated Off button, and Raise/Lower.',
    slots: buildSceneOffSlots(4, ['Welcome', 'Entertain', 'Relax', 'Night', 'Off']),
  },
  {
    code: 'W5B',
    name: '5-Button',
    shortName: '5-Btn',
    buttonCount: 5,
    hasRaiseLower: false,
    isSceneGroup: false,
    description: '5 full-width stacked buttons without dimming rocker.',
    slots: buildUniformSlots(
      5,
      false,
      ['Bright', 'Cooking', 'Dining', 'Evening', 'All Off'],
      { gap: 0.72 }
    ),
  },
  {
    code: 'W5BRL',
    name: '5-Button w/ Raise/Lower',
    shortName: '5-Btn R/L',
    buttonCount: 5,
    hasRaiseLower: true,
    isSceneGroup: false,
    description: 'Most popular seeTouch layout: 5 stacked buttons + bottom Raise/Lower rocker.',
    slots: buildUniformSlots(
      5,
      true,
      ['Welcome', 'Entertain', 'Relax', 'Pathway', 'All Off'],
      { gap: 0.68, rlGap: 0.95, rlHeight: 8.4 }
    ),
  },
  {
    code: 'W6B',
    name: '6-Button',
    shortName: '6-Btn',
    buttonCount: 6,
    hasRaiseLower: false,
    isSceneGroup: false,
    description: '6 full-width stacked buttons without dimming rocker.',
    slots: buildUniformSlots(
      6,
      false,
      ['Kitchen', 'Island', 'Dining', 'Living', 'Patio', 'All Off'],
      { gap: 0.66 }
    ),
  },
  {
    code: 'W6BRL',
    name: '6-Button w/ Raise/Lower',
    shortName: '6-Btn R/L',
    buttonCount: 6,
    hasRaiseLower: true,
    isSceneGroup: false,
    description: 'Maximum density seeTouch layout: 6 buttons + bottom Raise/Lower rocker.',
    slots: buildUniformSlots(
      6,
      true,
      ['Bright', 'Entertain', 'Dine', 'Movie', 'Night', 'All Off'],
      { gap: 0.62, rlGap: 0.85, rlHeight: 8.1 }
    ),
  },
];

export function getConfiguration(code: ConfigCode): KeypadConfiguration {
  return (
    KEYPAD_CONFIGURATIONS.find((c) => c.code === code) ??
    KEYPAD_CONFIGURATIONS[6]
  );
}

export interface RoomLabelPreset {
  id: string;
  name: string;
  labels: string[];
}

export const ROOM_LABEL_PRESETS: RoomLabelPreset[] = [
  {
    id: 'living',
    name: 'Living Room',
    labels: ['Welcome', 'Entertain', 'Relax', 'Reading', 'Pathway', 'All Off'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    labels: ['Bright', 'Cooking', 'Island', 'Dining', 'Nightlight', 'All Off'],
  },
  {
    id: 'primary',
    name: 'Primary Suite',
    labels: ['Morning', 'Evening', 'Bedside', 'Shades', 'Goodnight', 'All Off'],
  },
  {
    id: 'theater',
    name: 'Media Room',
    labels: ['Full On', 'Lounge', 'Movie', 'Intermission', 'Sconces', 'All Off'],
  },
  {
    id: 'entry',
    name: 'Foyer / Entry',
    labels: ['Home', 'Guests', 'Exterior', 'Landscape', 'Away', 'All Off'],
  },
];
