import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  getConfiguration,
  type KeypadConfiguration,
} from '../data/configurations';
import {
  getFinishById,
  WALL_PRESETS,
  type LutronFinish,
} from '../data/colors';
import {
  ARCHITECTURAL_DIMS,
  DESIGNER_DIMS,
  KEYPAD_BAY,
  createBezelFillerBarGeometry,
  createBezelInsertGeometry,
  createLedLensGeometry,
  createMetalBackTrimGeometry,
  createSeeTouchButtonGeometry,
  createSubplateGeometry,
  createWallplateGeometry,
} from './GeometryBuilder';
import {
  createBrushedMetalTextures,
  createButtonEngravingTextures,
  createPolymerMicroGrainTexture,
  createRaiseLowerTextures,
  createStudioEnvironment,
  createWallTextures,
} from './TextureFactory';
import {
  formatEngravingText,
  type CameraPresetId,
  type MockupState,
  type WallpaperState,
} from '../types';

const WALL_SIZE_MM = 780;

interface InteractiveButtonHandle {
  kind: 'main' | 'raise' | 'lower';
  index: number;
  group: THREE.Group;
  buttonMesh: THREE.Mesh;
  buttonMaterial: THREE.MeshPhysicalMaterial;
  ledMesh?: THREE.Mesh;
  ledMaterial?: THREE.MeshPhysicalMaterial;
  pressProgress: number; // 0 = rest, 1 = fully depressed
  pressTarget: number;
  releaseTimer: number;
  widthMm: number;
  heightMm: number;
}

interface CameraGoal {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_PRESETS: Record<CameraPresetId, { pos: [number, number, number]; target: [number, number, number] }> = {
  hero: { pos: [-96, 24, 214], target: [0, -1, 5] },
  front: { pos: [0, 0, 238], target: [0, 0, 5] },
  side: { pos: [-168, -6, 66], target: [0, 0, 7] },
  macro: { pos: [-46, 15, 96], target: [-1, 3, 9] },
};

export interface SceneCallbacks {
  onButtonClick: (index: number) => void;
  onRaiseLowerClick: (direction: 'up' | 'down') => void;
}

export class SeeTouchScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private studioEnv: THREE.Texture;
  private satinGrainTex: THREE.CanvasTexture;
  private matteGrainTex: THREE.CanvasTexture;
  private brushedMetalTex: { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
  private antiqueMetalTex: { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };

  private wallMesh: THREE.Mesh;
  private wallMaterial: THREE.MeshStandardMaterial;
  private wallTextures: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } | null = null;
  private wallpaperTexture: THREE.Texture | null = null;
  private loadedWallpaperUrl: string | null = null;
  private wallpaperLoadToken = 0;

  private keypadRoot: THREE.Group;
  private interactiveButtons: InteractiveButtonHandle[] = [];

  // Lighting rig
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ledSpillLight: THREE.PointLight;

  // Animation & interaction
  private rafId: number | null = null;
  private lastFrameMs = performance.now();
  private needsRender = true;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDownPos = new THREE.Vector2();
  private cameraGoal: CameraGoal | null = null;

  // Cached state keys to avoid redundant rebuilds
  private lastStructureKey = '';
  private lastEngravingKey = '';
  private lastWallKey = '';

  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialState: MockupState,
    callbacks: SceneCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;

    // Renderer configured for photorealistic PBR + crisp PNG snapshots
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    // Scene & Studio PMREM Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x131519);

    this.studioEnv = createStudioEnvironment(this.renderer);
    this.scene.environment = this.studioEnv;

    // Shared procedural surface micro-textures
    this.satinGrainTex = createPolymerMicroGrainTexture(0.85);
    this.matteGrainTex = createPolymerMicroGrainTexture(1.35);
    this.brushedMetalTex = createBrushedMetalTextures('vertical', 1.0);
    this.antiqueMetalTex = createBrushedMetalTextures('vertical', 0.65);

    // Perspective camera (36° architectural studio lens — minimal distortion)
    const aspect =
      (container.clientWidth || 800) / (container.clientHeight || 600);
    this.camera = new THREE.PerspectiveCamera(34, aspect, 1, 1500);
    const hero = CAMERA_PRESETS.hero;
    this.camera.position.set(...hero.pos);

    // OrbitControls tuned for smooth studio product inspection
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...hero.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = true;
    this.controls.minDistance = 58;
    this.controls.maxDistance = 310;
    this.controls.minPolarAngle = Math.PI * 0.14;
    this.controls.maxPolarAngle = Math.PI * 0.86;
    this.controls.minAzimuthAngle = -Math.PI * 0.48;
    this.controls.maxAzimuthAngle = Math.PI * 0.48;
    this.controls.addEventListener('start', () => {
      this.cameraGoal = null;
      this.needsRender = true;
    });
    this.controls.addEventListener('change', () => {
      this.needsRender = true;
    });

    // Studio lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xf6f7fa, 0x3b3835, 0.52);
    this.scene.add(this.hemiLight);

    // Main architectural key light (upper-left) casting crisp soft contact shadows
    this.keyLight = new THREE.DirectionalLight(0xfffaf2, 2.15);
    this.keyLight.position.set(-88, 122, 165);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 40;
    this.keyLight.shadow.camera.far = 420;
    this.keyLight.shadow.camera.left = -115;
    this.keyLight.shadow.camera.right = 115;
    this.keyLight.shadow.camera.top = 125;
    this.keyLight.shadow.camera.bottom = -125;
    this.keyLight.shadow.bias = -0.00025;
    this.keyLight.shadow.normalBias = 0.09;
    this.keyLight.shadow.radius = 2.6;
    this.scene.add(this.keyLight);

    // Cool architectural window fill (right)
    this.fillLight = new THREE.DirectionalLight(0xdce8fa, 0.72);
    this.fillLight.position.set(118, 36, 125);
    this.scene.add(this.fillLight);

    // Low warm edge-definition rim light (reveals seeTouch button bevel curvature)
    this.rimLight = new THREE.DirectionalLight(0xffe6cc, 0.5);
    this.rimLight.position.set(-55, -108, 95);
    this.scene.add(this.rimLight);

    // Subtle Lutron emerald backlight ambient bounce in dark rooms
    this.ledSpillLight = new THREE.PointLight(0x3cff78, 0, 95, 1.8);
    this.ledSpillLight.position.set(-4, 0, 24);
    this.scene.add(this.ledSpillLight);

    // Architectural wall backdrop plane
    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5e2da,
      roughness: 0.88,
      metalness: 0.0,
    });
    const wallGeom = new THREE.PlaneGeometry(780, 780);
    this.wallMesh = new THREE.Mesh(wallGeom, this.wallMaterial);
    this.wallMesh.position.set(0, 0, 0);
    this.wallMesh.receiveShadow = true;
    this.scene.add(this.wallMesh);

    // Root container for keypad assembly
    this.keypadRoot = new THREE.Group();
    this.scene.add(this.keypadRoot);

    // Build initial state
    this.updateState(initialState);

    // Pointer listeners for interactive button clicking & hover cursor
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);

    // Responsive resize handling
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start render loop
    this.animate();
  }

  public updateState(state: MockupState): void {
    const finish = getFinishById(state.finishId);
    const config = getConfiguration(state.configCode);

    const structureKey = `${state.style}|${state.configCode}|${state.finishId}`;
    const engravingKey = `${structureKey}|${state.labels.join('\u0001')}|${state.textAlignment}|${state.textCasing}`;
    const wallKey = state.wallpaper.imageUrl
      ? `wp|${state.wallpaper.imageUrl}|${state.wallpaper.repeatWidthInches}|${state.wallpaper.repeatMode}|${state.wallpaper.naturalAspect}`
      : `preset|${state.wallPresetId}|${state.wallColor}`;

    if (wallKey !== this.lastWallKey) {
      if (state.wallpaper.imageUrl) {
        this.updateWallpaper(state.wallpaper);
      } else {
        this.clearWallpaperTexture();
        this.updateWall(state.wallPresetId, state.wallColor);
      }
      this.lastWallKey = wallKey;
    }

    if (structureKey !== this.lastStructureKey) {
      this.rebuildKeypad(state, config, finish);
      this.lastStructureKey = structureKey;
      this.lastEngravingKey = engravingKey;
    } else if (engravingKey !== this.lastEngravingKey) {
      this.refreshEngravingTextures(state, config, finish);
      this.lastEngravingKey = engravingKey;
    }

    this.updateLightingAndLeds(state, finish);
    this.needsRender = true;
  }

  public setCameraPreset(preset: CameraPresetId): void {
    const p = CAMERA_PRESETS[preset];
    this.cameraGoal = {
      position: new THREE.Vector3(...p.pos),
      target: new THREE.Vector3(...p.target),
    };
    this.needsRender = true;
  }

  public triggerButtonPressAnimation(
    kind: 'main' | 'raise' | 'lower',
    index: number = 0
  ): void {
    const handle = this.interactiveButtons.find(
      (b) => b.kind === kind && (kind !== 'main' || b.index === index)
    );
    if (handle) {
      handle.pressTarget = 1;
      handle.releaseTimer = 0.14;
      this.needsRender = true;
    }
  }

  public exportSnapshotPng(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png', 1.0);
  }

  private clearWallpaperTexture(): void {
    this.wallpaperLoadToken++;
    if (this.wallpaperTexture) {
      this.wallpaperTexture.dispose();
      this.wallpaperTexture = null;
    }
    this.loadedWallpaperUrl = null;
  }

  private applyWallpaperTransform(
    tex: THREE.Texture,
    wallpaper: WallpaperState
  ): void {
    const wrap =
      wallpaper.repeatMode === 'mirror'
        ? THREE.MirroredRepeatWrapping
        : THREE.RepeatWrapping;
    tex.wrapS = wrap;
    tex.wrapT = wrap;

    // Exact physical scaling: our wall plane is WALL_SIZE_MM (780mm ≈ 30.71 in).
    // repeatWidthInches defines how wide one full horizontal tile of the print is in real life.
    const repeatWidthMm = Math.max(25.4, wallpaper.repeatWidthInches * 25.4);
    const repeatX = WALL_SIZE_MM / repeatWidthMm;
    const aspect = wallpaper.naturalAspect > 0 ? wallpaper.naturalAspect : 1;
    const repeatY = repeatX * aspect;

    tex.repeat.set(repeatX, repeatY);
    // Keep pattern centered behind the keypad as user scales print size
    tex.offset.set(0.5 - repeatX / 2, 0.5 - repeatY / 2);
    tex.needsUpdate = true;
  }

  private updateWallpaper(wallpaper: WallpaperState): void {
    const url = wallpaper.imageUrl;
    if (!url) return;

    // Fast path: same uploaded image already loaded — update repeat/scale in-place at 60fps
    if (this.wallpaperTexture && this.loadedWallpaperUrl === url) {
      this.applyWallpaperTransform(this.wallpaperTexture, wallpaper);
      this.wallMaterial.map = this.wallpaperTexture;
      this.wallMaterial.bumpMap = this.matteGrainTex;
      this.wallMaterial.bumpScale = 0.08;
      this.wallMaterial.color.set(0xffffff);
      this.wallMaterial.roughness = 0.87;
      this.wallMaterial.needsUpdate = true;
      this.needsRender = true;
      return;
    }

    const token = ++this.wallpaperLoadToken;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (token !== this.wallpaperLoadToken) return;
      if (this.wallpaperTexture) {
        this.wallpaperTexture.dispose();
      }
      const tex = new THREE.Texture(img);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;

      const resolvedAspect =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : wallpaper.naturalAspect;

      this.applyWallpaperTransform(tex, {
        ...wallpaper,
        naturalAspect: resolvedAspect,
      });

      this.wallpaperTexture = tex;
      this.loadedWallpaperUrl = url;

      this.wallMaterial.map = tex;
      this.wallMaterial.bumpMap = this.matteGrainTex;
      this.wallMaterial.bumpScale = 0.08;
      this.wallMaterial.color.set(0xffffff);
      this.wallMaterial.roughness = 0.87;
      this.wallMaterial.needsUpdate = true;
      this.needsRender = true;
    };
    img.src = url;
  }

  private updateWall(presetId: string, colorHex: string): void {
    const preset =
      WALL_PRESETS.find((p) => p.id === presetId) ?? WALL_PRESETS[0];

    if (this.wallTextures) {
      this.wallTextures.map.dispose();
      this.wallTextures.bumpMap.dispose();
    }

    const textures = createWallTextures(preset.textureType, colorHex);
    this.wallTextures = textures;

    this.wallMaterial.map = textures.map;
    this.wallMaterial.bumpMap = textures.bumpMap;
    this.wallMaterial.bumpScale =
      preset.textureType === 'drywall'
        ? 0.22
        : preset.textureType === 'plaster'
          ? 0.42
          : preset.textureType === 'wood'
            ? 0.35
            : 0.48;
    this.wallMaterial.color.set(0xffffff);
    this.wallMaterial.roughness = preset.roughness;
    this.wallMaterial.needsUpdate = true;
  }

  private createWallplateMaterial(finish: LutronFinish): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(finish.hex),
      roughness: finish.roughness,
      metalness: finish.metalness,
      clearcoat: finish.clearcoat,
      clearcoatRoughness: finish.clearcoatRoughness,
      envMapIntensity: finish.metalness > 0.5 ? 1.25 : 0.95,
    });

    if (finish.surface === 'satin') {
      mat.bumpMap = this.satinGrainTex;
      mat.bumpScale = 0.045;
    } else if (finish.surface === 'matte') {
      mat.bumpMap = this.matteGrainTex;
      mat.bumpScale = 0.08;
    } else if (
      finish.surface === 'metal-brushed' ||
      finish.surface === 'metal-anodized'
    ) {
      mat.bumpMap = this.brushedMetalTex.bumpMap;
      mat.bumpScale = finish.surface === 'metal-anodized' ? 0.05 : 0.085;
      mat.roughnessMap = this.brushedMetalTex.roughnessMap;
    } else if (finish.surface === 'metal-antique') {
      mat.bumpMap = this.antiqueMetalTex.bumpMap;
      mat.bumpScale = 0.075;
      mat.roughnessMap = this.antiqueMetalTex.roughnessMap;
    }

    return mat;
  }

  private getButtonSurfaceParams(finish: LutronFinish): {
    hex: string;
    surface: 'gloss' | 'satin' | 'matte';
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    isDarkButton: boolean;
  } {
    if (finish.pairedButton) {
      return {
        hex: finish.pairedButton.hex,
        surface: finish.pairedButton.surface,
        roughness: finish.pairedButton.roughness,
        clearcoat: finish.pairedButton.surface === 'satin' ? 0.06 : 0.0,
        clearcoatRoughness: 0.5,
        isDarkButton: finish.pairedButton.isDarkButton,
      };
    }
    const surface: 'gloss' | 'satin' | 'matte' =
      finish.surface === 'gloss'
        ? 'gloss'
        : finish.surface === 'matte'
          ? 'matte'
          : 'satin';
    return {
      hex: finish.hex,
      surface,
      roughness: finish.roughness,
      clearcoat: finish.clearcoat,
      clearcoatRoughness: finish.clearcoatRoughness,
      isDarkButton: finish.isDarkButton,
    };
  }

  private disposeKeypadGroup(): void {
    this.keypadRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshPhysicalMaterial || m instanceof THREE.MeshStandardMaterial) {
            // Only dispose per-button dynamically created textures (not shared grain/metal maps)
            const shared = new Set<THREE.Texture | null>([
              this.satinGrainTex,
              this.matteGrainTex,
              this.brushedMetalTex.bumpMap,
              this.brushedMetalTex.roughnessMap,
              this.antiqueMetalTex.bumpMap,
              this.antiqueMetalTex.roughnessMap,
            ]);
            if (m.map && !shared.has(m.map)) m.map.dispose();
            if (m.emissiveMap && !shared.has(m.emissiveMap)) m.emissiveMap.dispose();
            if (m.bumpMap && !shared.has(m.bumpMap)) m.bumpMap.dispose();
            if (m.roughnessMap && !shared.has(m.roughnessMap)) m.roughnessMap.dispose();
          }
          m.dispose();
        }
      }
    });
    this.keypadRoot.clear();
    this.interactiveButtons = [];
  }

  private rebuildKeypad(
    state: MockupState,
    config: KeypadConfiguration,
    finish: LutronFinish
  ): void {
    this.disposeKeypadGroup();

    const isMetal = finish.category === 'metal';
    const buttonParams = this.getButtonSurfaceParams(finish);
    const plateDims =
      state.style === 'designer' ? DESIGNER_DIMS : ARCHITECTURAL_DIMS;

    // 1. Sub-plate dark reveal shadow ring against the wall
    const subplateMat = new THREE.MeshStandardMaterial({
      color: 0x101114,
      roughness: 0.85,
      metalness: 0.0,
    });
    const subplateMesh = new THREE.Mesh(
      createSubplateGeometry(state.style),
      subplateMat
    );
    subplateMesh.castShadow = true;
    subplateMesh.receiveShadow = true;
    this.keypadRoot.add(subplateMesh);

    // 2. Metal wallplate authentic matte-black polycarbonate side adapter trim
    if (isMetal) {
      const trimMat = new THREE.MeshPhysicalMaterial({
        color: 0x18191c,
        roughness: 0.56,
        metalness: 0.0,
        bumpMap: this.matteGrainTex,
        bumpScale: 0.05,
      });
      const trimMesh = new THREE.Mesh(
        createMetalBackTrimGeometry(state.style),
        trimMat
      );
      trimMesh.castShadow = true;
      trimMesh.receiveShadow = true;
      this.keypadRoot.add(trimMesh);
    }

    // 3. Screwless snap-on Wallplate (Claro Designer or Nova T* Architectural)
    const wallplateMat = this.createWallplateMaterial(finish);
    const wallplateMesh = new THREE.Mesh(
      createWallplateGeometry(state.style, isMetal),
      wallplateMat
    );
    wallplateMesh.castShadow = true;
    wallplateMesh.receiveShadow = true;
    this.keypadRoot.add(wallplateMesh);

    // 4. Molded interior carrier backing (color-matched & naturally shadowed so button seams look realistic)
    const carrierColor = new THREE.Color(buttonParams.hex).multiplyScalar(
      buttonParams.isDarkButton ? 0.35 : 0.62
    );
    const cavityMat = new THREE.MeshStandardMaterial({
      color: carrierColor,
      roughness: 0.85,
      metalness: 0.0,
    });
    const cavityMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(plateDims.openingWidth - 0.6, plateDims.openingHeight - 0.6),
      cavityMat
    );
    cavityMesh.position.set(0, 0, KEYPAD_BAY.cavityBackZ);
    cavityMesh.receiveShadow = true;
    this.keypadRoot.add(cavityMesh);

    // 5. Recessed snap-in Keypad Bezel surround frame
    const bezelMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(buttonParams.hex),
      roughness: buttonParams.roughness,
      metalness: 0.0,
      clearcoat: buttonParams.clearcoat,
      clearcoatRoughness: buttonParams.clearcoatRoughness,
      bumpMap:
        buttonParams.surface === 'gloss'
          ? null
          : buttonParams.surface === 'matte'
            ? this.matteGrainTex
            : this.satinGrainTex,
      bumpScale: buttonParams.surface === 'matte' ? 0.075 : 0.045,
      envMapIntensity: 0.9,
    });
    const bezelMesh = new THREE.Mesh(
      createBezelInsertGeometry(state.style),
      bezelMat
    );
    bezelMesh.castShadow = true;
    bezelMesh.receiveShadow = true;
    this.keypadRoot.add(bezelMesh);

    // 6. Solid horizontal bezel filler bars for wide spacing in W3BS/W3BSRL/W3S/W4BS/W4S
    //    (just like real Lutron seeTouch Replacement Kits)
    const slots = config.slots;
    const bayTop = KEYPAD_BAY.bayH / 2;
    const bayBottom = -KEYPAD_BAY.bayH / 2;

    const addFillerIfWide = (upperY: number, lowerY: number) => {
      const gapH = upperY - lowerY;
      // Wide bezel filler bars appear whenever spacing exceeds standard parting seam (~2.2mm)
      if (gapH > 2.2) {
        const fillerH = gapH - 1.3; // leaves clean 0.65mm shadow seam on top & bottom
        const fillerCenterY = (upperY + lowerY) / 2;
        const fillerMesh = new THREE.Mesh(
          createBezelFillerBarGeometry(KEYPAD_BAY.buttonWidth + 0.5, fillerH),
          bezelMat
        );
        fillerMesh.position.set(0, fillerCenterY, 0);
        fillerMesh.castShadow = true;
        fillerMesh.receiveShadow = true;
        this.keypadRoot.add(fillerMesh);
      }
    };

    if (slots.length > 0) {
      addFillerIfWide(bayTop, slots[0].centerY + slots[0].height / 2);
      for (let i = 0; i < slots.length - 1; i++) {
        const bottomOfCurr = slots[i].centerY - slots[i].height / 2;
        const topOfNext = slots[i + 1].centerY + slots[i + 1].height / 2;
        addFillerIfWide(bottomOfCurr, topOfNext);
      }
      const last = slots[slots.length - 1];
      addFillerIfWide(last.centerY - last.height / 2, bayBottom);
    }

    // 7. Individual Sculpted Upward-Angled seeTouch Buttons + Flush Status LEDs
    let mainBtnIdx = 0;
    for (const slot of slots) {
      if (!slot.isRaiseLower) {
        const idx = mainBtnIdx++;
        const rawLabel = state.labels[idx] ?? slot.defaultLabel;
        const formattedLabel = formatEngravingText(rawLabel, state.textCasing);

        const group = new THREE.Group();
        group.position.set(0, slot.centerY, 0);

        const textures = createButtonEngravingTextures({
          text: formattedLabel,
          buttonHex: buttonParams.hex,
          isDarkButton: buttonParams.isDarkButton,
          alignment: state.textAlignment,
          buttonHeightMm: slot.height,
          surface: buttonParams.surface,
        });

        const buttonMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          map: textures.map,
          emissive: new THREE.Color(0x36ff72),
          emissiveMap: textures.emissiveMap,
          emissiveIntensity: 0.4,
          bumpMap: textures.bumpMap,
          bumpScale: 0.14,
          roughness: buttonParams.roughness,
          metalness: 0.0,
          clearcoat: buttonParams.clearcoat,
          clearcoatRoughness: buttonParams.clearcoatRoughness,
          envMapIntensity: 0.95,
        });

        const buttonGeom = createSeeTouchButtonGeometry(
          KEYPAD_BAY.buttonWidth,
          slot.height,
          3.15
        );
        const buttonMesh = new THREE.Mesh(buttonGeom, buttonMat);
        buttonMesh.castShadow = true;
        buttonMesh.receiveShadow = true;
        buttonMesh.userData = { interactive: true, kind: 'main', index: idx };
        group.add(buttonMesh);

        // Flush sculpted green status LED lens on the left side of the button
        const ledMat = new THREE.MeshPhysicalMaterial({
          color: buttonParams.isDarkButton ? 0x2c362e : 0xbcc5bc,
          emissive: new THREE.Color(0x3aff74),
          emissiveIntensity: 0,
          roughness: 0.2,
          metalness: 0.0,
          clearcoat: 0.85,
          clearcoatRoughness: 0.1,
        });
        const ledGeom = createLedLensGeometry(
          KEYPAD_BAY.buttonWidth,
          slot.height,
          3.15
        );
        const ledMesh = new THREE.Mesh(ledGeom, ledMat);
        ledMesh.userData = { interactive: true, kind: 'main', index: idx };
        group.add(ledMesh);

        this.keypadRoot.add(group);
        this.interactiveButtons.push({
          kind: 'main',
          index: idx,
          group,
          buttonMesh,
          buttonMaterial: buttonMat,
          ledMesh,
          ledMaterial: ledMat,
          pressProgress: 0,
          pressTarget: 0,
          releaseTimer: 0,
          widthMm: KEYPAD_BAY.buttonWidth,
          heightMm: slot.height,
        });
      } else {
        // 8. Split Bottom Raise / Lower Dimming Rocker: Left = Lower (▼), Right = Raise (▲)
        const centerGap = 0.95;
        const halfW = (KEYPAD_BAY.buttonWidth - centerGap) / 2;
        const sides: Array<{ kind: 'lower' | 'raise'; dir: 'down' | 'up'; offsetX: number }> = [
          { kind: 'lower', dir: 'down', offsetX: -(halfW + centerGap) / 2 },
          { kind: 'raise', dir: 'up', offsetX: (halfW + centerGap) / 2 },
        ];

        for (const side of sides) {
          const group = new THREE.Group();
          group.position.set(side.offsetX, slot.centerY, 0);

          const textures = createRaiseLowerTextures({
            direction: side.dir,
            buttonHex: buttonParams.hex,
            isDarkButton: buttonParams.isDarkButton,
            halfWidthMm: halfW,
            heightMm: slot.height,
            surface: buttonParams.surface,
          });

          const rlMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            map: textures.map,
            emissive: new THREE.Color(0x36ff72),
            emissiveMap: textures.emissiveMap,
            emissiveIntensity: 0.4,
            bumpMap: textures.bumpMap,
            bumpScale: 0.15,
            roughness: buttonParams.roughness,
            metalness: 0.0,
            clearcoat: buttonParams.clearcoat,
            clearcoatRoughness: buttonParams.clearcoatRoughness,
            envMapIntensity: 0.95,
          });

          const rlGeom = createSeeTouchButtonGeometry(halfW, slot.height, 2.95);
          const rlMesh = new THREE.Mesh(rlGeom, rlMat);
          rlMesh.castShadow = true;
          rlMesh.receiveShadow = true;
          rlMesh.userData = { interactive: true, kind: side.kind, index: -1 };
          group.add(rlMesh);

          this.keypadRoot.add(group);
          this.interactiveButtons.push({
            kind: side.kind,
            index: -1,
            group,
            buttonMesh: rlMesh,
            buttonMaterial: rlMat,
            pressProgress: 0,
            pressTarget: 0,
            releaseTimer: 0,
            widthMm: halfW,
            heightMm: slot.height,
          });
        }
      }
    }
  }

  private refreshEngravingTextures(
    state: MockupState,
    config: KeypadConfiguration,
    finish: LutronFinish
  ): void {
    const buttonParams = this.getButtonSurfaceParams(finish);
    const mainSlots = config.slots.filter((s) => !s.isRaiseLower);

    for (const handle of this.interactiveButtons) {
      if (handle.kind !== 'main') continue;
      const slot = mainSlots[handle.index];
      if (!slot) continue;

      const rawLabel = state.labels[handle.index] ?? slot.defaultLabel;
      const formattedLabel = formatEngravingText(rawLabel, state.textCasing);

      const prevMap = handle.buttonMaterial.map;
      const prevEmissive = handle.buttonMaterial.emissiveMap;
      const prevBump = handle.buttonMaterial.bumpMap;

      const textures = createButtonEngravingTextures({
        text: formattedLabel,
        buttonHex: buttonParams.hex,
        isDarkButton: buttonParams.isDarkButton,
        alignment: state.textAlignment,
        buttonHeightMm: handle.heightMm,
        surface: buttonParams.surface,
      });

      handle.buttonMaterial.map = textures.map;
      handle.buttonMaterial.emissiveMap = textures.emissiveMap;
      handle.buttonMaterial.bumpMap = textures.bumpMap;
      handle.buttonMaterial.needsUpdate = true;

      prevMap?.dispose();
      prevEmissive?.dispose();
      prevBump?.dispose();
    }
  }

  private updateLightingAndLeds(
    state: MockupState,
    finish: LutronFinish
  ): void {
    const room = Math.max(0, Math.min(1, state.roomLight / 100));
    const bl = Math.max(0, Math.min(1, state.backlight / 100));
    const buttonParams = this.getButtonSurfaceParams(finish);

    // Smoothly transition studio lighting from bright daylight -> warm dusk -> dark night
    const keyFactor = 0.055 + 0.945 * Math.pow(room, 1.2);
    this.keyLight.intensity = 2.25 * keyFactor;
    this.fillLight.intensity = 0.72 * (0.07 + 0.93 * room);
    this.rimLight.intensity = 0.52 * (0.12 + 0.88 * room);
    this.hemiLight.intensity = 0.52 * (0.08 + 0.92 * room);

    // Subtle warm shift in dusk/evening range (around 25%..60% roomLight)
    const duskWeight = Math.sin(room * Math.PI) * (1 - room * 0.45);
    const keyColor = new THREE.Color(0xfffaf2).lerp(
      new THREE.Color(0xffcfa0),
      duskWeight * 0.55
    );
    if (room < 0.22) {
      // Cool subtle moonlight tint in near-dark rooms
      keyColor.lerp(new THREE.Color(0x8aa8d8), (0.22 - room) / 0.22 * 0.6);
    }
    this.keyLight.color.copy(keyColor);

    // Environment reflection intensity scales with room ambient light
    this.scene.environmentIntensity = 0.14 + 0.92 * room;

    // Scene background shifts slightly darker in night mode
    const bgLuma = 0.025 + 0.055 * room;
    (this.scene.background as THREE.Color).setRGB(
      bgLuma,
      bgLuma * 1.04,
      bgLuma * 1.14
    );

    // Exposure adapts naturally so night backlighting glows richly without blowing out daylight
    this.renderer.toneMappingExposure = 0.92 + 0.16 * room;

    // Backlit engraving emissive intensity:
    // Very subtle in bright daylight (authentic charcoal/white laser-etch legibility),
    // ramping smoothly into rich luminous Lutron green as room light dims!
    const darkness = 1 - room;
    const daylightMask = 0.06 + 1.75 * Math.pow(darkness, 1.55);
    const darkPlasticBoost = buttonParams.isDarkButton ? 1.25 : 1.0;
    const engravingEmissive = bl * daylightMask * darkPlasticBoost * 1.4;

    let activeCount = 0;
    for (const handle of this.interactiveButtons) {
      handle.buttonMaterial.emissiveIntensity = engravingEmissive;

      if (handle.kind === 'main' && handle.ledMaterial) {
        const isActive = Boolean(state.activeLeds[handle.index]);
        if (isActive) activeCount++;

        if (isActive) {
          handle.ledMaterial.color.setHex(0x16db52);
          handle.ledMaterial.emissive.setHex(0x22ff64);
          handle.ledMaterial.emissiveIntensity = 1.9 + darkness * 2.4;
        } else {
          handle.ledMaterial.color.setHex(
            buttonParams.isDarkButton ? 0x28302a : 0xc8cfc8
          );
          handle.ledMaterial.emissive.setHex(0x1f6e36);
          // Tiny faint ambient backlight bleed when backlight is high in dark rooms
          handle.ledMaterial.emissiveIntensity = bl * darkness * 0.14;
        }
      }
    }

    // Soft emerald light spill onto keypad bezel & wallplate in dim/night rooms
    const nightSpill = (1 - room) * (bl * 0.85 + Math.min(3, activeCount) * 0.25);
    this.ledSpillLight.intensity = nightSpill * 24;
  }

  private getHitButton(event: PointerEvent): InteractiveButtonHandle | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes: THREE.Object3D[] = [];
    for (const b of this.interactiveButtons) {
      meshes.push(b.buttonMesh);
      if (b.ledMesh) meshes.push(b.ledMesh);
    }

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;

    const hitObj = hits[0].object;
    return (
      this.interactiveButtons.find(
        (b) => b.buttonMesh === hitObj || b.ledMesh === hitObj
      ) ?? null
    );
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDownPos.set(event.clientX, event.clientY);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (event.buttons !== 0) {
      this.renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const hit = this.getHitButton(event);
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  };

  private onPointerUp = (event: PointerEvent): void => {
    // Only trigger button click if user didn't drag-orbit the camera
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    if (Math.hypot(dx, dy) > 5) return;

    const hit = this.getHitButton(event);
    if (!hit) return;

    hit.pressTarget = 1;
    hit.releaseTimer = 0.13;
    this.needsRender = true;

    if (hit.kind === 'main') {
      this.callbacks.onButtonClick(hit.index);
    } else if (hit.kind === 'raise') {
      this.callbacks.onRaiseLowerClick('up');
    } else {
      this.callbacks.onRaiseLowerClick('down');
    }
  };

  private handleResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.needsRender = true;
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameMs) / 1000);
    this.lastFrameMs = now;

    let animating = false;

    // Smooth camera preset glide
    if (this.cameraGoal) {
      animating = true;
      const alpha = 1 - Math.exp(-7.5 * dt);
      this.camera.position.lerp(this.cameraGoal.position, alpha);
      this.controls.target.lerp(this.cameraGoal.target, alpha);
      if (
        this.camera.position.distanceTo(this.cameraGoal.position) < 0.25 &&
        this.controls.target.distanceTo(this.cameraGoal.target) < 0.15
      ) {
        this.camera.position.copy(this.cameraGoal.position);
        this.controls.target.copy(this.cameraGoal.target);
        this.cameraGoal = null;
      }
    }

    // Spring tactile depression animation on pressed buttons
    for (const b of this.interactiveButtons) {
      if (b.releaseTimer > 0) {
        animating = true;
        b.releaseTimer -= dt;
        if (b.releaseTimer <= 0) {
          b.pressTarget = 0;
        }
      }
      if (b.pressProgress !== b.pressTarget) {
        animating = true;
        const speed = b.pressTarget > b.pressProgress ? 28 : 16;
        b.pressProgress += (b.pressTarget - b.pressProgress) * Math.min(1, dt * speed);
        if (Math.abs(b.pressProgress - b.pressTarget) < 0.002) {
          b.pressProgress = b.pressTarget;
        }
        // Realistic ~1.15mm tactile switch travel
        b.group.position.z = -b.pressProgress * 1.15;
      }
    }

    const controlsMoved = this.controls.update();
    if (animating || controlsMoved || this.needsRender) {
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  };

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);

    this.disposeKeypadGroup();
    this.clearWallpaperTexture();
    this.wallMesh.geometry.dispose();
    this.wallMaterial.dispose();
    this.wallTextures?.map.dispose();
    this.wallTextures?.bumpMap.dispose();
    this.studioEnv.dispose();
    this.satinGrainTex.dispose();
    this.matteGrainTex.dispose();
    this.brushedMetalTex.bumpMap.dispose();
    this.brushedMetalTex.roughnessMap.dispose();
    this.antiqueMetalTex.bumpMap.dispose();
    this.antiqueMetalTex.roughnessMap.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
