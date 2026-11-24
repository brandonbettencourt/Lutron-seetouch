import * as THREE from 'three';
import type { TextAlignment } from '../types';

/**
 * Deterministic PRNG so procedural surface grains look identical across reloads.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds an architectural studio environment map using PMREMGenerator with
 * overhead softbox, crisp architectural key strip, warm bounce fill, and dark
 * studio contrast flags so gloss plastics and metals reflect realistically.
 */
export function createStudioEnvironment(
  renderer: THREE.WebGLRenderer
): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x16181c);

  // Overhead studio softbox
  const topBox = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 2.38, 2.32),
      side: THREE.DoubleSide,
    })
  );
  topBox.position.set(0, 10, 4);
  topBox.rotation.x = Math.PI / 2.2;
  envScene.add(topBox);

  // Left vertical architectural window strip light (gives crisp edge highlights)
  const leftStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.2, 3.25, 3.35),
      side: THREE.DoubleSide,
    })
  );
  leftStrip.position.set(-10, 2, 7);
  leftStrip.lookAt(0, 0, 0);
  envScene.add(leftStrip);

  // Secondary narrow rim strip on upper left for chrome/brass speculars
  const rimStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 14),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(4.5, 4.4, 4.2),
      side: THREE.DoubleSide,
    })
  );
  rimStrip.position.set(-4.5, 5.5, 11);
  rimStrip.lookAt(0, 0, 0);
  envScene.add(rimStrip);

  // Right warm architectural bounce card
  const rightBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 14),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.45, 1.32, 1.16),
      side: THREE.DoubleSide,
    })
  );
  rightBounce.position.set(11, 0, 6);
  rightBounce.lookAt(0, 0, 0);
  envScene.add(rightBounce);

  // Subtle floor bounce
  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.55, 0.52, 0.48),
      side: THREE.DoubleSide,
    })
  );
  floorBounce.position.set(0, -10, 2);
  floorBounce.rotation.x = -Math.PI / 2;
  envScene.add(floorBounce);

  // Dark contrast flags for crisp metallic reflections
  const darkFlag = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.05, 0.055, 0.065),
      side: THREE.DoubleSide,
    })
  );
  darkFlag.position.set(4, 1, 10);
  darkFlag.lookAt(0, 0, 0);
  envScene.add(darkFlag);

  const envRT = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();

  // Clean up temp scene geometries/materials
  envScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) obj.material.dispose();
    }
  });

  return envRT.texture;
}

/**
 * Generates a fine micro-bead polymer bump texture for Satin and Matte Lutron plastics.
 */
export function createPolymerMicroGrainTexture(
  contrast: number = 1.0
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rand = mulberry32(4219);

  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 44 * contrast + 128;
    const v = Math.max(0, Math.min(255, Math.round(n)));
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 11);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates directional brushed metal bump & roughness maps (vertical grain,
 * authentic to Lutron Satin Brass / Stainless Steel / Satin Nickel wallplates).
 */
export function createBrushedMetalTextures(
  direction: 'vertical' | 'horizontal' = 'vertical',
  intensity: number = 1.0
): { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 512;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const rand = mulberry32(8831);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#c8c8c8';
  rCtx.fillRect(0, 0, size, size);

  const lineCount = 2200;
  for (let i = 0; i < lineCount; i++) {
    const pos = rand() * size;
    const delta = (rand() - 0.5) * 68 * intensity;
    const bv = Math.max(40, Math.min(220, Math.round(128 + delta)));
    const rv = Math.max(150, Math.min(250, Math.round(205 + delta * 0.48)));
    const alpha = 0.08 + rand() * 0.2;
    const thickness = 0.6 + rand() * 1.4;

    bCtx.strokeStyle = `rgba(${bv},${bv},${bv},${alpha})`;
    bCtx.lineWidth = thickness;
    rCtx.strokeStyle = `rgba(${rv},${rv},${rv},${alpha})`;
    rCtx.lineWidth = thickness;

    bCtx.beginPath();
    rCtx.beginPath();
    if (direction === 'vertical') {
      const y0 = rand() * size;
      const len = 80 + rand() * 340;
      bCtx.moveTo(pos, y0);
      bCtx.lineTo(pos, y0 + len);
      rCtx.moveTo(pos, y0);
      rCtx.lineTo(pos, y0 + len);
    } else {
      const x0 = rand() * size;
      const len = 80 + rand() * 340;
      bCtx.moveTo(x0, pos);
      bCtx.lineTo(x0 + len, pos);
      rCtx.moveTo(x0, pos);
      rCtx.lineTo(x0 + len, pos);
    }
    bCtx.stroke();
    rCtx.stroke();
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);

  return { bumpMap, roughnessMap };
}

/**
 * Generates procedural architectural wall textures (drywall eggshell stipple,
 * venetian plaster, natural white oak grain, or architectural poured concrete).
 */
export function createWallTextures(
  type: 'drywall' | 'plaster' | 'wood' | 'concrete',
  baseHex: string
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const baseColor = new THREE.Color(baseHex);
  const br = Math.round(baseColor.r * 255);
  const bg = Math.round(baseColor.g * 255);
  const bb = Math.round(baseColor.b * 255);

  cCtx.fillStyle = baseHex;
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const rand = mulberry32(
    type === 'drywall' ? 101 : type === 'plaster' ? 202 : type === 'wood' ? 303 : 404
  );

  if (type === 'drywall') {
    // Subtle eggshell paint roller stipple
    const imgC = cCtx.getImageData(0, 0, size, size);
    const imgB = bCtx.getImageData(0, 0, size, size);
    for (let i = 0; i < imgC.data.length; i += 4) {
      const n = (rand() - 0.5) * 9;
      imgC.data[i] = Math.max(0, Math.min(255, br + n * 0.6));
      imgC.data[i + 1] = Math.max(0, Math.min(255, bg + n * 0.6));
      imgC.data[i + 2] = Math.max(0, Math.min(255, bb + n * 0.6));
      const bVal = Math.max(0, Math.min(255, 128 + n * 3.8));
      imgB.data[i] = bVal;
      imgB.data[i + 1] = bVal;
      imgB.data[i + 2] = bVal;
      imgB.data[i + 3] = 255;
    }
    cCtx.putImageData(imgC, 0, 0);
    bCtx.putImageData(imgB, 0, 0);

    // Larger faint roller blotches
    for (let i = 0; i < 400; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 6 + rand() * 18;
      const light = rand() > 0.5 ? 255 : 0;
      bCtx.fillStyle = `rgba(${light},${light},${light},0.035)`;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    }
  } else if (type === 'plaster') {
    // Soft organic lime-wash / Venetian plaster clouds & trowel sweeps
    for (let i = 0; i < 240; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rx = 26 + rand() * 90;
      const ry = 14 + rand() * 45;
      const angle = (rand() - 0.5) * 1.4;
      const shift = (rand() - 0.5) * 26;
      cCtx.save();
      cCtx.translate(x, y);
      cCtx.rotate(angle);
      cCtx.fillStyle = `rgba(${Math.max(0, Math.min(255, br + shift))},${Math.max(0, Math.min(255, bg + shift))},${Math.max(0, Math.min(255, bb + shift))},0.09)`;
      cCtx.beginPath();
      cCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.restore();

      const bv = Math.max(60, Math.min(200, Math.round(128 + shift * 1.6)));
      bCtx.save();
      bCtx.translate(x, y);
      bCtx.rotate(angle);
      bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.12)`;
      bCtx.beginPath();
      bCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.restore();
    }
  } else if (type === 'wood') {
    // Vertical architectural white-oak millwork grain
    for (let x = 0; x < size; x += 2) {
      const wave =
        Math.sin(x * 0.045) * 12 +
        Math.sin(x * 0.13) * 5 +
        (rand() - 0.5) * 10;
      const r = Math.max(0, Math.min(255, Math.round(br + wave)));
      const g = Math.max(0, Math.min(255, Math.round(bg + wave * 0.85)));
      const b = Math.max(0, Math.min(255, Math.round(bb + wave * 0.65)));
      cCtx.fillStyle = `rgb(${r},${g},${b})`;
      cCtx.fillRect(x, 0, 2, size);

      const bv = Math.max(60, Math.min(200, Math.round(128 + wave * 2.1)));
      bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
      bCtx.fillRect(x, 0, 2, size);
    }
    // Fine open-pore streaks
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 30 + rand() * 140;
      cCtx.strokeStyle = `rgba(${Math.max(0, br - 36)},${Math.max(0, bg - 34)},${Math.max(0, bb - 30)},0.18)`;
      cCtx.lineWidth = 0.8 + rand() * 1.1;
      cCtx.beginPath();
      cCtx.moveTo(x, y);
      cCtx.lineTo(x + (rand() - 0.5) * 3, y + len);
      cCtx.stroke();

      bCtx.strokeStyle = 'rgba(70,70,70,0.22)';
      bCtx.lineWidth = 1;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x, y + len);
      bCtx.stroke();
    }
  } else {
    // Architectural poured concrete
    for (let i = 0; i < 320; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 14 + rand() * 54;
      const shift = (rand() - 0.5) * 30;
      cCtx.fillStyle = `rgba(${Math.max(0, Math.min(255, br + shift))},${Math.max(0, Math.min(255, bg + shift))},${Math.max(0, Math.min(255, bb + shift))},0.08)`;
      cCtx.beginPath();
      cCtx.arc(x, y, r, 0, Math.PI * 2);
      cCtx.fill();

      const bv = Math.max(40, Math.min(215, Math.round(128 + shift * 2)));
      bCtx.fillStyle = `rgba(${bv},${bv},${bv},0.12)`;
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    }
    // Tiny concrete air pinholes
    for (let i = 0; i < 220; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 0.7 + rand() * 1.9;
      cCtx.fillStyle = 'rgba(0,0,0,0.12)';
      cCtx.beginPath();
      cCtx.arc(x, y, r, 0, Math.PI * 2);
      cCtx.fill();

      bCtx.fillStyle = 'rgba(30,30,30,0.38)';
      bCtx.beginPath();
      bCtx.arc(x, y, r, 0, Math.PI * 2);
      bCtx.fill();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  return { map, bumpMap };
}

export interface ButtonEngravingTextures {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Generates synchronized high-res (1024x384) albedo, laser-recess bump, and
 * Lutron-green backlight emissive textures for a single seeTouch button face.
 */
export function createButtonEngravingTextures(params: {
  text: string;
  buttonHex: string;
  isDarkButton: boolean;
  alignment: TextAlignment;
  buttonHeightMm: number;
  surface: 'gloss' | 'satin' | 'matte';
}): ButtonEngravingTextures {
  const width = 1024;
  const height = 384;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Base fills
  aCtx.fillStyle = params.buttonHex;
  aCtx.fillRect(0, 0, width, height);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // Subtle molded grain baked gently into bump map for Satin / Matte buttons
  if (params.surface !== 'gloss') {
    const rand = mulberry32(991 + Math.round(params.buttonHeightMm * 10));
    const grainAmp = params.surface === 'matte' ? 14 : 9;
    const bImg = bCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < bImg.data.length; i += 4) {
      const v = Math.round(128 + (rand() - 0.5) * grainAmp);
      bImg.data[i] = v;
      bImg.data[i + 1] = v;
      bImg.data[i + 2] = v;
    }
    bCtx.putImageData(bImg, 0, 0);
  }

  const label = params.text.trim();
  if (label.length > 0) {
    // Aspect correction: canvas is 1024x384 (2.667:1), physical button face is
    // 27.6mm x buttonHeightMm. Stretch font horizontally/vertically inversely
    // so text renders with true 1:1 geometric proportions on every button height!
    const physAspect = 27.6 / params.buttonHeightMm;
    const canvasAspect = width / height;
    const scaleX = canvasAspect / physAspect;

    // Safe text zone: leaves room for the left status LED (left ~17% of width)
    const ledClearLeft = 185;
    const rightMargin = 82;
    const maxTextPxWidth = (width - ledClearLeft - rightMargin) / scaleX;

    // Consistent real-world cap height (~2.35mm on tall buttons, ~2.05mm on compact 6BRL)
    const targetMmCap = Math.min(2.45, Math.max(2.05, params.buttonHeightMm * 0.25));
    let fontSize = (targetMmCap / params.buttonHeightMm) * height * 1.16;

    const fontStack = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    aCtx.font = `500 ${fontSize}px ${fontStack}`;
    const measured = aCtx.measureText(label).width;
    if (measured > maxTextPxWidth) {
      fontSize *= maxTextPxWidth / measured;
    }

    const fontDecl = `500 ${fontSize}px ${fontStack}`;
    // Center vertically slightly above center so text sits squarely on the upward-sloped facet
    const textY = height * 0.49;

    let anchorX: number;
    let textAlign: CanvasTextAlign;
    if (params.alignment === 'left') {
      anchorX = ledClearLeft / scaleX;
      textAlign = 'left';
    } else if (params.alignment === 'right') {
      anchorX = (width - rightMargin) / scaleX;
      textAlign = 'right';
    } else {
      // Visual center across the usable right-of-LED text region
      anchorX = ((ledClearLeft + (width - rightMargin)) / 2) / scaleX;
      textAlign = 'center';
    }

    // 1. Albedo engraving ink (authentic Lutron dark charcoal on light, crisp off-white on dark)
    const inkColor = params.isDarkButton
      ? 'rgba(234, 238, 235, 0.90)'
      : 'rgba(42, 46, 52, 0.88)';

    aCtx.save();
    aCtx.scale(scaleX, 1);
    aCtx.font = fontDecl;
    aCtx.textAlign = textAlign;
    aCtx.textBaseline = 'middle';
    aCtx.fillStyle = inkColor;
    aCtx.fillText(label, anchorX, textY);
    aCtx.restore();

    // 2. Backlit emissive map — soft translucent Lutron green glow + subtle halo
    eCtx.save();
    eCtx.scale(scaleX, 1);
    eCtx.font = fontDecl;
    eCtx.textAlign = textAlign;
    eCtx.textBaseline = 'middle';
    eCtx.shadowColor = '#32e864';
    eCtx.shadowBlur = 10;
    eCtx.fillStyle = '#52ff82';
    eCtx.fillText(label, anchorX, textY);
    // Crisp core stroke
    eCtx.shadowBlur = 0;
    eCtx.fillStyle = '#8affaa';
    eCtx.fillText(label, anchorX, textY);
    eCtx.restore();

    // 3. Laser-etched micro-recess bump map (darker = recessed into plastic)
    bCtx.save();
    bCtx.scale(scaleX, 1);
    bCtx.font = fontDecl;
    bCtx.textAlign = textAlign;
    bCtx.textBaseline = 'middle';
    bCtx.fillStyle = '#383838';
    bCtx.fillText(label, anchorX, textY);
    bCtx.restore();
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 8;

  return { map, emissiveMap, bumpMap };
}

/**
 * Generates synchronized albedo, bump, and backlit emissive textures for
 * the Raise (▲) or Lower (▼) half of the bottom dimming rocker.
 */
export function createRaiseLowerTextures(params: {
  direction: 'up' | 'down';
  buttonHex: string;
  isDarkButton: boolean;
  halfWidthMm: number;
  heightMm: number;
  surface: 'gloss' | 'satin' | 'matte';
}): ButtonEngravingTextures {
  const width = 512;
  const height = 384;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;

  aCtx.fillStyle = params.buttonHex;
  aCtx.fillRect(0, 0, width, height);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, width, height);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  if (params.surface !== 'gloss') {
    const rand = mulberry32(params.direction === 'up' ? 771 : 772);
    const grainAmp = params.surface === 'matte' ? 14 : 9;
    const bImg = bCtx.getImageData(0, 0, width, height);
    for (let i = 0; i < bImg.data.length; i += 4) {
      const v = Math.round(128 + (rand() - 0.5) * grainAmp);
      bImg.data[i] = v;
      bImg.data[i + 1] = v;
      bImg.data[i + 2] = v;
    }
    bCtx.putImageData(bImg, 0, 0);
  }

  const physAspect = params.halfWidthMm / params.heightMm;
  const canvasAspect = width / height;
  const scaleX = canvasAspect / physAspect;

  const drawTriangle = (ctx: CanvasRenderingContext2D) => {
    const cx = width / 2 / scaleX;
    const cy = height * 0.49;
    const halfBase = 52;
    const halfH = 33;

    ctx.save();
    ctx.scale(scaleX, 1);
    ctx.beginPath();
    if (params.direction === 'up') {
      ctx.moveTo(cx, cy - halfH);
      ctx.lineTo(cx + halfBase, cy + halfH);
      ctx.lineTo(cx - halfBase, cy + halfH);
    } else {
      ctx.moveTo(cx, cy + halfH);
      ctx.lineTo(cx + halfBase, cy - halfH);
      ctx.lineTo(cx - halfBase, cy - halfH);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  aCtx.fillStyle = params.isDarkButton
    ? 'rgba(232, 236, 232, 0.86)'
    : 'rgba(38, 42, 46, 0.80)';
  drawTriangle(aCtx);

  eCtx.shadowColor = '#32e864';
  eCtx.shadowBlur = 12;
  eCtx.fillStyle = '#5cff88';
  drawTriangle(eCtx);

  bCtx.fillStyle = '#383838';
  drawTriangle(bCtx);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 8;

  return { map, emissiveMap, bumpMap };
}
