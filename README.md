# Lutron seeTouch® 3D Keypad Studio

An interactive, photorealistic Three.js configurator for **Lutron seeTouch®** wall-mount lighting keypads.

## Features

- **Wallplate Styles (True-to-Scale mm CAD Geometry)**
  - **Designer (Claro® / Satin Colors®)**: `4 11/16" × 2 15/16" × 5/16"` (`119 × 75 × 8 mm`) screwless wallplate with rounded corners and crisp edges.
  - **Architectural (Nova T*® Matte & Metal)**: `4 9/16" × 2 3/4" × 5/16"` (`116 × 70 × 8 mm`) square-corner beveled wallplate, including authentic matte-black polycarbonate side adapter trim on metal finishes.
- **Official 3–6 Button Configurations**
  - `W3BS`, `W3BSRL`, `W3S`, `W4BS`, `W4S`, `W5B`, `W5BRL`, `W6B`, `W6BRL` — featuring upward-angled sculpted pillowed seeTouch buttons, flush green status LEDs, and optional bottom Raise/Lower (`▼`/`▲`) dimming rockers.
- **Official Lutron Color & Finish Catalog**
  - **Claro® Gloss** (7 colors), **Satin Colors® Core** (6), **Satin Colors® Classic** (12), **New Satin Finishes** (16), **Architectural Matte** (10), and **Metal Wallplates** (Stainless Steel + 12 Architectural Metals paired with Midnight/Black buttons).
- **Custom Backlit Engraving & Interactive Controls**
  - Live per-button engraving labels, room presets, alignment (`Left` / `Center` / `Right`), casing (`As Typed` / `Title Case` / `ALL CAPS`), and green Lutron laser-etched backlighting.
  - Click any 3D button directly on the keypad to animate tactile switch travel and toggle its green status LED.
- **Studio Lighting, Wall Surfaces & Export**
  - Continuous Ambient Room Light (`Daylight` → `Evening` → `Dark Room`) & Backlight Intensity sliders.
  - Procedural architectural wall surfaces (Gallery Drywall, Limestone Plaster, White Oak Millwork, Poured Concrete) + custom wall paint picker.
  - Camera presets (`3/4`, `Front`, `Profile`, `Macro`), shareable URL hash, and high-resolution PNG mockup export.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```
