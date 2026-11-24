import type { KeypadConfiguration, KeypadStyle } from '../data/configurations';

interface KeypadSchematicProps {
  config: KeypadConfiguration;
  style: KeypadStyle;
  active: boolean;
}

/**
 * Minimal architectural SVG schematic depicting exact button heights, scene
 * divider gaps, left LED dots, and Raise/Lower split rocker for each layout.
 */
export function KeypadSchematic({
  config,
  style,
  active,
}: KeypadSchematicProps) {
  const plateW = style === 'designer' ? 44 : 42;
  const plateH = 68;
  const plateX = (52 - plateW) / 2;
  const plateRx = style === 'designer' ? 3 : 0.8;

  // Map bay mm [-31.3 .. +31.3] into SVG opening y [11 .. 57]
  const bayH = 62.6;
  const svgOpenTop = 11;
  const svgOpenH = 46;
  const scale = svgOpenH / bayH;

  const toSvgY = (mmY: number) => svgOpenTop + (bayH / 2 - mmY) * scale;

  return (
    <svg
      width="42"
      height="56"
      viewBox="0 0 52 68"
      fill="none"
      aria-hidden="true"
    >
      {/* Wallplate outer frame */}
      <rect
        x={plateX}
        y="1"
        width={plateW}
        height={plateH - 2}
        rx={plateRx}
        fill={active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)'}
        stroke={active ? 'rgba(56,217,104,0.65)' : 'rgba(255,255,255,0.22)'}
        strokeWidth="1.2"
      />
      {/* Inner keypad opening */}
      <rect
        x="14"
        y="10"
        width="24"
        height="48"
        rx="1.2"
        fill="rgba(0,0,0,0.45)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.8"
      />
      {/* Button slots */}
      {config.slots.map((slot) => {
        const yTop = toSvgY(slot.centerY + slot.height / 2);
        const h = Math.max(2.5, slot.height * scale - 0.5);

        if (slot.isRaiseLower) {
          return (
            <g key={slot.id}>
              <rect
                x="15.8"
                y={yTop}
                width="9.7"
                height={h}
                rx="0.8"
                fill={active ? '#c8d1cc' : '#8a909b'}
              />
              <rect
                x="26.5"
                y={yTop}
                width="9.7"
                height={h}
                rx="0.8"
                fill={active ? '#c8d1cc' : '#8a909b'}
              />
            </g>
          );
        }

        return (
          <g key={slot.id}>
            <rect
              x="15.8"
              y={yTop}
              width="20.4"
              height={h}
              rx="0.9"
              fill={active ? '#e6ebe7' : '#9ca2ad'}
            />
            {/* Tiny left status LED pip */}
            <rect
              x="17.3"
              y={yTop + h * 0.28}
              width="1.4"
              height={Math.max(1.4, h * 0.44)}
              rx="0.6"
              fill={active && slot.defaultActive ? '#38d968' : '#2a2f36'}
            />
          </g>
        );
      })}
    </svg>
  );
}
