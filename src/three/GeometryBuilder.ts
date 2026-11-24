import * as THREE from 'three';
import type { KeypadStyle } from '../data/configurations';

export const DESIGNER_DIMS = {
  width: 74.6, // 2 15/16 in
  height: 119.1, // 4 11/16 in
  depth: 7.6, // 5/16 in
  cornerRadius: 2.4,
  openingWidth: 33.4,
  openingHeight: 66.8,
  openingRadius: 0.9,
} as const;

export const ARCHITECTURAL_DIMS = {
  width: 69.85, // 2 3/4 in
  height: 115.9, // 4 9/16 in
  depth: 7.6, // 5/16 in
  cornerRadius: 0.35,
  openingWidth: 33.2,
  openingHeight: 66.8,
  openingRadius: 0.35,
} as const;

export const KEYPAD_BAY = {
  bezelOuterW: 32.9,
  bezelOuterH: 66.3,
  bayW: 28.5,
  bayH: 62.6,
  buttonWidth: 28.05,
  bezelFrontZ: 7.45,
  cavityBackZ: 5.85,
} as const;

function createRoundedRectShape(
  w: number,
  h: number,
  r: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const cr = Math.min(r, hw, hh);

  shape.moveTo(-hw + cr, -hh);
  shape.lineTo(hw - cr, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cr);
  shape.lineTo(hw, hh - cr);
  shape.quadraticCurveTo(hw, hh, hw - cr, hh);
  shape.lineTo(-hw + cr, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cr);
  shape.lineTo(-hw, -hh + cr);
  shape.quadraticCurveTo(-hw, -hh, -hw + cr, -hh);
  return shape;
}

function createRoundedRectHole(
  w: number,
  h: number,
  r: number
): THREE.Path {
  const path = new THREE.Path();
  const hw = w / 2;
  const hh = h / 2;
  const cr = Math.min(r, hw, hh);

  // Clockwise winding for hole
  path.moveTo(-hw + cr, -hh);
  path.quadraticCurveTo(-hw, -hh, -hw, -hh + cr);
  path.lineTo(-hw, hh - cr);
  path.quadraticCurveTo(-hw, hh, -hw + cr, hh);
  path.lineTo(hw - cr, hh);
  path.quadraticCurveTo(hw, hh, hw, hh - cr);
  path.lineTo(hw, -hh + cr);
  path.quadraticCurveTo(hw, -hh, hw - cr, -hh);
  path.lineTo(-hw + cr, -hh);
  return path;
}

/**
 * Re-normalizes extruded geometry planar UVs to [0..1] across the bounding
 * width & height so procedural textures (brushed metal, satin grain) scale uniformly.
 */
function normalizePlanarUVs(
  geom: THREE.BufferGeometry,
  width: number,
  height: number
): void {
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  if (!pos || !uv) return;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uv.setXY(i, x / width + 0.5, y / height + 0.5);
  }
  uv.needsUpdate = true;
}

/**
 * Creates the screwless snap-on Lutron wallplate (Designer Claro/Satin or
 * Architectural Nova T*, plus two-layer Metal wallplate front shell).
 */
export function createWallplateGeometry(
  style: KeypadStyle,
  isMetal: boolean
): THREE.BufferGeometry {
  const dims = style === 'designer' ? DESIGNER_DIMS : ARCHITECTURAL_DIMS;

  const bevelSize = isMetal ? 0.75 : style === 'designer' ? 1.15 : 1.35;
  const bevelThickness = isMetal ? 0.85 : style === 'designer' ? 1.35 : 1.55;
  const bevelSegments = style === 'designer' ? 8 : 3;

  // Metal plates sit on top of a 2.3mm black polycarbonate rear trim adapter
  const plateStartZ = isMetal ? 2.3 : 0.7;
  const targetFrontZ = dims.depth;
  const extrudeDepth = Math.max(
    1.2,
    targetFrontZ - plateStartZ - bevelThickness * 2
  );

  // Pre-compensate outer dimensions & inner cutout for ExtrudeGeometry bevel expansion
  const shape = createRoundedRectShape(
    dims.width - bevelSize * 2,
    dims.height - bevelSize * 2,
    Math.max(0.15, dims.cornerRadius - bevelSize * 0.45)
  );
  const hole = createRoundedRectHole(
    dims.openingWidth + bevelSize * 2,
    dims.openingHeight + bevelSize * 2,
    Math.max(0.15, dims.openingRadius + bevelSize * 0.45)
  );
  shape.holes.push(hole);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments,
    curveSegments: style === 'designer' ? 20 : 8,
  });

  // Position front face accurately at z = targetFrontZ
  geom.translate(0, 0, plateStartZ + bevelThickness);
  normalizePlanarUVs(geom, dims.width, dims.height);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates the thin black polycarbonate rear adapter trim visible along the
 * side edges of Lutron Architectural Metal & Stainless Steel wallplates.
 */
export function createMetalBackTrimGeometry(
  style: KeypadStyle
): THREE.BufferGeometry {
  const dims = style === 'designer' ? DESIGNER_DIMS : ARCHITECTURAL_DIMS;
  const shape = createRoundedRectShape(
    dims.width - 0.5,
    dims.height - 0.5,
    dims.cornerRadius
  );
  shape.holes.push(
    createRoundedRectHole(
      dims.openingWidth,
      dims.openingHeight,
      dims.openingRadius
    )
  );
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 2.35,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.18,
    bevelSegments: 2,
    curveSegments: 16,
  });
  geom.translate(0, 0, 0.35);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates the recessed wallplate sub-plate creating the crisp shadow reveal
 * where the screwless plate meets the painted wall.
 */
export function createSubplateGeometry(
  style: KeypadStyle
): THREE.BufferGeometry {
  const dims = style === 'designer' ? DESIGNER_DIMS : ARCHITECTURAL_DIMS;
  const shape = createRoundedRectShape(
    dims.width - 2.8,
    dims.height - 2.8,
    Math.max(0.4, dims.cornerRadius - 0.6)
  );
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 1.2,
    bevelEnabled: false,
    curveSegments: 12,
  });
  geom.translate(0, 0, 0.02);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates the flush-recessed keypad insert surround frame inside the wallplate
 * opening, leaving a realistic ~0.2mm hairline tolerance seam around its perimeter.
 */
export function createBezelInsertGeometry(
  style: KeypadStyle
): THREE.BufferGeometry {
  const bevel = 0.32;
  const outerR = style === 'designer' ? 0.75 : 0.3;
  const shape = createRoundedRectShape(
    KEYPAD_BAY.bezelOuterW - bevel * 2,
    KEYPAD_BAY.bezelOuterH - bevel * 2,
    Math.max(0.15, outerR)
  );
  shape.holes.push(
    createRoundedRectHole(
      KEYPAD_BAY.bayW + bevel * 2,
      KEYPAD_BAY.bayH + bevel * 2,
      0.5
    )
  );

  const depth = 2.4;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });

  geom.translate(0, 0, KEYPAD_BAY.bezelFrontZ - depth - bevel);
  normalizePlanarUVs(geom, KEYPAD_BAY.bezelOuterW, KEYPAD_BAY.bezelOuterH);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates solid horizontal bezel divider bars that fill wide gaps in
 * spaced configurations (W3BS, W3BSRL, W3S, W4BS, W4S), matching Lutron's
 * real snap-in button-kit faceplate where blank areas are solid flush plastic.
 */
export function createBezelFillerBarGeometry(
  width: number,
  height: number
): THREE.BufferGeometry {
  const bevel = 0.28;
  const shape = createRoundedRectShape(
    width - bevel * 2,
    Math.max(0.4, height - bevel * 2),
    0.22
  );
  const depth = 1.9;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geom.translate(0, 0, KEYPAD_BAY.bezelFrontZ - depth - bevel - 0.05);
  normalizePlanarUVs(geom, width, height);
  geom.computeVertexNormals();
  return geom;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Evaluates the iconic Lutron seeTouch upward-angled rounded/pillowed button
 * Z-height (mm above frontBaseZ) at normalized button coordinates (u, v) in [0, 1].
 *
 * - Steep rounded nose/crown near bottom (v ≈ 0.25)
 * - Gently upward-tilted convex reading face (v = 0.25 .. 0.88)
 * - Soft top fillet into the parting seam (v = 0.88 .. 1.0)
 * - Smooth left/right edge chamfers and subtle pillow crown across width
 */
export function evalSeeTouchSurfaceZ(
  u: number,
  v: number,
  width: number,
  height: number,
  maxProtrusion: number
): number {
  // Distance from bottom/top edges in mm for consistent physical bevel radii
  const dyBottom = v * height;
  const dyTop = (1 - v) * height;
  const bottomRadius = Math.min(2.15, height * 0.27);
  const topRadius = Math.min(1.55, height * 0.19);

  // Upward-sloping seeTouch angle: bottom crown is taller than top edge
  // giving ~11° upward tilt so standing users can read backlit engraving clearly
  const tiltSlope = 1.0 - 0.34 * v;
  // Subtle pillow dome across the sloped reading face
  const pillowV = 1.0 + 0.075 * Math.sin(Math.PI * v);

  // Smooth C1/C2 edge roll-off at bottom and top
  const bMask =
    dyBottom < bottomRadius
      ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - dyBottom / bottomRadius, 2)))
      : 1.0;
  const tMask =
    dyTop < topRadius
      ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - dyTop / topRadius, 2)))
      : 1.0;

  // Horizontal edge chamfer & gentle crown
  const dxEdge = Math.min(u, 1 - u) * width;
  const sideRadius = Math.min(1.25, width * 0.12);
  const sMask =
    dxEdge < sideRadius
      ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - dxEdge / sideRadius, 2)))
      : 1.0;
  const crownU = 0.945 + 0.055 * Math.sin(Math.PI * u);

  // Blend cleanly so corners round gracefully
  const edgeBlend = bMask * tMask * (0.28 + 0.72 * sMask);
  const smoothCorner = smoothstep(0.0, 0.18, edgeBlend);
  const combined = edgeBlend * (0.85 + 0.15 * smoothCorner);

  return maxProtrusion * tiltSlope * pillowV * crownU * combined;
}

/**
 * Generates a high-resolution parametric sculpted Lutron seeTouch button mesh
 * with upward-angled pillowed face, crisp molded side skirts extending into the
 * dark chassis cavity, and distortion-free front-face UVs for laser engraving.
 */
export function createSeeTouchButtonGeometry(
  width: number,
  height: number,
  maxProtrusion: number = 3.15
): THREE.BufferGeometry {
  const segX = 44;
  const segY = 30;
  const frontBaseZ = KEYPAD_BAY.bezelFrontZ + 0.08;
  const skirtBackZ = KEYPAD_BAY.cavityBackZ + 0.35;
  const draft = 0.14; // subtle injection-mold wall draft

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 1. Front sculpted surface grid: (segX + 1) * (segY + 1) vertices
  const cols = segX + 1;
  const rows = segY + 1;

  for (let iy = 0; iy < rows; iy++) {
    const v = iy / segY;
    const y = (v - 0.5) * height;
    for (let ix = 0; ix < cols; ix++) {
      const u = ix / segX;
      const x = (u - 0.5) * width;
      const z =
        frontBaseZ + evalSeeTouchSurfaceZ(u, v, width, height, maxProtrusion);
      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < segY; iy++) {
    for (let ix = 0; ix < segX; ix++) {
      const a = iy * cols + ix;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  // 2. Molded perimeter side skirts extending back to skirtBackZ
  // (Uses clean corner UV (0.02, 0.02) so engraving text never bleeds onto side walls)
  const addSkirtStrip = (
    frontCoords: Array<[number, number, number]>,
    flipWinding: boolean
  ) => {
    const startIdx = positions.length / 3;
    for (let i = 0; i < frontCoords.length; i++) {
      const [fx, fy, fz] = frontCoords[i];
      const bx = fx * (1 - (draft * 2) / width);
      const by = fy * (1 - (draft * 2) / height);
      positions.push(fx, fy, fz);
      uvs.push(0.02, 0.02);
      positions.push(bx, by, skirtBackZ);
      uvs.push(0.02, 0.02);
    }
    for (let i = 0; i < frontCoords.length - 1; i++) {
      const p0 = startIdx + i * 2;
      const p1 = p0 + 1;
      const p2 = p0 + 2;
      const p3 = p0 + 3;
      if (flipWinding) {
        indices.push(p0, p2, p3);
        indices.push(p0, p3, p1);
      } else {
        indices.push(p0, p3, p2);
        indices.push(p0, p1, p3);
      }
    }
  };

  // Bottom skirt (iy = 0, ix = 0..segX)
  const bottomEdge: Array<[number, number, number]> = [];
  for (let ix = 0; ix < cols; ix++) {
    const idx = ix * 3;
    bottomEdge.push([positions[idx], positions[idx + 1], positions[idx + 2]]);
  }
  addSkirtStrip(bottomEdge, true);

  // Top skirt (iy = segY, ix = 0..segX)
  const topEdge: Array<[number, number, number]> = [];
  for (let ix = 0; ix < cols; ix++) {
    const idx = (segY * cols + ix) * 3;
    topEdge.push([positions[idx], positions[idx + 1], positions[idx + 2]]);
  }
  addSkirtStrip(topEdge, false);

  // Left skirt (ix = 0, iy = 0..segY)
  const leftEdge: Array<[number, number, number]> = [];
  for (let iy = 0; iy < rows; iy++) {
    const idx = iy * cols * 3;
    leftEdge.push([positions[idx], positions[idx + 1], positions[idx + 2]]);
  }
  addSkirtStrip(leftEdge, false);

  // Right skirt (ix = segX, iy = 0..segY)
  const rightEdge: Array<[number, number, number]> = [];
  for (let iy = 0; iy < rows; iy++) {
    const idx = (iy * cols + segX) * 3;
    rightEdge.push([positions[idx], positions[idx + 1], positions[idx + 2]]);
  }
  addSkirtStrip(rightEdge, true);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates a curved pill-shaped translucent LED diffuser lens that conforms
 * directly to the sculpted upward-angled button surface on its left side.
 */
export function createLedLensGeometry(
  buttonWidth: number,
  buttonHeight: number,
  maxProtrusion: number = 3.15
): THREE.BufferGeometry {
  const lensW = 1.45;
  const lensH = Math.min(3.55, Math.max(2.55, buttonHeight * 0.34));
  const lensCenterX = -buttonWidth / 2 + 2.95;
  const lensCenterY = 0; // vertically centered on the angled facet

  const frontBaseZ = KEYPAD_BAY.bezelFrontZ + 0.08;
  const shape = createRoundedRectShape(lensW, lensH, lensW * 0.45);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: 0.45,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: 2,
    curveSegments: 10,
  });

  // Project each vertex onto the exact curved surface of the button
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i) + lensCenterX;
    const ly = pos.getY(i) + lensCenterY;
    const lz = pos.getZ(i); // -0.09 .. +0.54
    const u = Math.max(0.01, Math.min(0.99, lx / buttonWidth + 0.5));
    const v = Math.max(0.01, Math.min(0.99, ly / buttonHeight + 0.5));
    const surfZ =
      frontBaseZ + evalSeeTouchSurfaceZ(u, v, buttonWidth, buttonHeight, maxProtrusion);
    // Keep rear embedded inside button and front proud by ~0.12mm like real light pipe
    const mappedZ = surfZ - 0.32 + lz;
    pos.setXYZ(i, lx, ly, mappedZ);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}
