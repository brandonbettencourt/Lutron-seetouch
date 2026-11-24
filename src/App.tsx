import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  Moon,
  Share2,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import {
  getConfiguration,
  type ConfigCode,
  type KeypadStyle,
} from './data/configurations';
import { getFinishById, LUTRON_FINISHES } from './data/colors';
import { SeeTouchScene } from './three/SeeTouchScene';
import { ControlPanel } from './components/ControlPanel';
import {
  decodeStateFromHash,
  encodeStateToHash,
  getLutronSku,
  type CameraPresetId,
  type MockupState,
  type TextAlignment,
  type TextCasing,
  type WallpaperRepeatMode,
} from './types';

function createInitialState(): MockupState {
  const defaultConfig = getConfiguration('W5BRL');
  const mainSlots = defaultConfig.slots.filter((s) => !s.isRaiseLower);
  const fallback: MockupState = {
    style: 'designer',
    configCode: 'W5BRL',
    finishId: 'satin-SW',
    labels: mainSlots.map((s) => s.defaultLabel),
    activeLeds: mainSlots.map((s) => Boolean(s.defaultActive)),
    textAlignment: 'left',
    textCasing: 'as-typed',
    roomLight: 90,
    backlight: 72,
    dimmerLevel: 75,
    wallPresetId: 'gallery-white',
    wallColor: '#e5e2da',
    wallpaper: {
      imageUrl: null,
      fileName: '',
      repeatWidthInches: 12,
      repeatMode: 'tile',
      naturalAspect: 1,
    },
  };
  return decodeStateFromHash(window.location.hash, fallback);
}

export default function App() {
  const [state, setState] = useState<MockupState>(createInitialState);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('hero');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SeeTouchScene | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  }, []);

  // Mount Three.js studio scene once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const scene = new SeeTouchScene(mount, state, {
      onButtonClick: (index) => {
        setState((prev) => {
          const nextLeds = [...prev.activeLeds];
          nextLeds[index] = !nextLeds[index];
          return { ...prev, activeLeds: nextLeds };
        });
      },
      onRaiseLowerClick: (direction) => {
        setState((prev) => {
          const delta = direction === 'up' ? 10 : -10;
          const nextLevel = Math.max(0, Math.min(100, prev.dimmerLevel + delta));
          showToast(
            `${direction === 'up' ? 'Raise ▲' : 'Lower ▼'} — Dimmer Level ${nextLevel}%`
          );
          return { ...prev, dimmerLevel: nextLevel };
        });
      },
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync React state changes into the Three.js scene smoothly
  useEffect(() => {
    sceneRef.current?.updateState(state);
  }, [state]);

  // Keep URL hash synced gently when user copies share link (avoid spamming history)
  const finish = getFinishById(state.finishId);
  const config = getConfiguration(state.configCode);
  const sku = getLutronSku(state.style, state.configCode, finish.code);

  const handleStyleChange = (nextStyle: KeypadStyle) => {
    setState((prev) => {
      const currFinish = getFinishById(prev.finishId);
      let nextFinishId = prev.finishId;
      // Ensure selected finish is authentic to the chosen wallplate style
      if (currFinish.style !== nextStyle) {
        const sameCode = LUTRON_FINISHES.find(
          (f) => f.style === nextStyle && f.code === currFinish.code
        );
        if (sameCode) {
          nextFinishId = sameCode.id;
        } else {
          nextFinishId =
            nextStyle === 'architectural' ? 'arch-WH' : 'satin-SW';
        }
      }
      return { ...prev, style: nextStyle, finishId: nextFinishId };
    });
  };

  const handleConfigChange = (nextCode: ConfigCode) => {
    const nextCfg = getConfiguration(nextCode);
    const nextMain = nextCfg.slots.filter((s) => !s.isRaiseLower);
    setState((prev) => {
      const prevLen = prev.labels.length;
      const lastPrev = prev.labels[prevLen - 1]?.trim().toLowerCase();
      const hadBottomOff = lastPrev === 'all off' || lastPrev === 'off';

      const nextLabels = nextMain.map((slot, i) => {
        if (nextMain.length > prevLen && hadBottomOff) {
          if (i < prevLen - 1) return prev.labels[i] || slot.defaultLabel;
          if (i === nextMain.length - 1) return prev.labels[prevLen - 1];
          return slot.defaultLabel;
        }
        return prev.labels[i] || slot.defaultLabel;
      });

      const nextLeds = nextMain.map((slot, i) =>
        i < prev.activeLeds.length
          ? prev.activeLeds[i]
          : Boolean(slot.defaultActive)
      );
      return {
        ...prev,
        configCode: nextCode,
        labels: nextLabels,
        activeLeds: nextLeds,
      };
    });
  };

  const handleFinishChange = (finishId: string) => {
    const target = getFinishById(finishId);
    setState((prev) => ({
      ...prev,
      finishId: target.id,
      style: target.style,
    }));
  };

  const handleLabelChange = (index: number, value: string) => {
    setState((prev) => {
      const next = [...prev.labels];
      next[index] = value;
      return { ...prev, labels: next };
    });
  };

  const handleApplyRoomPreset = (presetLabels: string[]) => {
    const mainSlots = config.slots.filter((s) => !s.isRaiseLower);
    setState((prev) => ({
      ...prev,
      labels: mainSlots.map((_, idx) => {
        // Put "All Off" / "Off" on the final button when fewer than 6 buttons
        if (idx === mainSlots.length - 1 && mainSlots.length < presetLabels.length) {
          return presetLabels[presetLabels.length - 1];
        }
        return presetLabels[idx] ?? `Scene ${idx + 1}`;
      }),
    }));
  };

  const handleToggleLed = (index: number) => {
    sceneRef.current?.triggerButtonPressAnimation('main', index);
    setState((prev) => {
      const next = [...prev.activeLeds];
      next[index] = !next[index];
      return { ...prev, activeLeds: next };
    });
  };

  const handleCameraPreset = (preset: CameraPresetId) => {
    setActiveCamera(preset);
    sceneRef.current?.setCameraPreset(preset);
  };

  const handleQuickNightToggle = () => {
    setState((prev) => ({
      ...prev,
      roomLight: prev.roomLight > 25 ? 8 : 90,
      backlight: prev.roomLight > 25 ? Math.max(prev.backlight, 85) : prev.backlight,
    }));
  };

  const handleCopyShareUrl = async () => {
    const hash = encodeStateToHash(state);
    window.history.replaceState(null, '', hash);
    const fullUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast('Shareable configuration URL copied');
    } catch {
      showToast('URL updated in address bar');
    }
  };

  const wallpaperUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (wallpaperUrlRef.current) {
        URL.revokeObjectURL(wallpaperUrlRef.current);
      }
    };
  }, []);

  const handleUploadWallpaper = (file: File) => {
    if (wallpaperUrlRef.current) {
      URL.revokeObjectURL(wallpaperUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    wallpaperUrlRef.current = objectUrl;

    const img = new Image();
    img.onload = () => {
      const aspect =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : 1;
      setState((prev) => ({
        ...prev,
        wallpaper: {
          ...prev.wallpaper,
          imageUrl: objectUrl,
          fileName: file.name,
          naturalAspect: aspect,
        },
      }));
      showToast(`Applied wallpaper: ${file.name}`);
    };
    img.src = objectUrl;
  };

  const handleClearWallpaper = () => {
    if (wallpaperUrlRef.current) {
      URL.revokeObjectURL(wallpaperUrlRef.current);
      wallpaperUrlRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      wallpaper: {
        ...prev.wallpaper,
        imageUrl: null,
        fileName: '',
      },
    }));
  };

  const handleExportPng = () => {
    if (!sceneRef.current) return;
    const dataUrl = sceneRef.current.exportSnapshotPng();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `lutron-seetouch-${sku}.png`;
    link.click();
    showToast(`Saved ${sku}.png`);
  };

  const isDarkRoom = state.roomLight <= 25;

  return (
    <div className="studio-shell">
      <main className="viewport-stage">
        {/* Three.js Photorealistic Canvas */}
        <div
          ref={canvasMountRef}
          className="canvas-mount"
          role="img"
          aria-label={`Interactive 3D Lutron seeTouch ${config.name} keypad in ${finish.name} finish`}
        />

        {/* Top-Left Architectural Spec Readout */}
        <header className="spec-overlay">
          <div className="spec-header-row">
            <h1 className="spec-title">Lutron seeTouch®</h1>
            <span className="sku-badge" title="Equivalent HomeWorks Model Number">
              {sku}
            </span>
          </div>
          <div className="spec-meta">
            <span>{config.name}</span>
            <span className="spec-meta-sep">·</span>
            <span>
              {finish.name} ({finish.code})
            </span>
            <span className="spec-meta-sep">·</span>
            <span>
              {state.style === 'designer'
                ? 'Designer 4 11/16" × 2 15/16"'
                : 'Architectural 4 9/16" × 2 3/4"'}
            </span>
          </div>
        </header>

        {/* Live Feedback Toast */}
        {toastMsg && (
          <div className="status-toast" role="status" aria-live="polite">
            <span className="status-toast-dot" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Reopen Inspector Button when Collapsed */}
        {panelCollapsed && (
          <button
            type="button"
            id="open-inspector-btn"
            className="panel-toggle-fab"
            onClick={() => setPanelCollapsed(false)}
          >
            <SlidersHorizontal size={15} />
            <span>Configure</span>
          </button>
        )}

        {/* Bottom-Left Controls Hint */}
        <div className="viewport-hint">
          Drag to orbit · Click buttons
        </div>

        {/* Bottom-Center Studio Camera & Action Dock */}
        <nav className="studio-dock" aria-label="Camera views and export actions">
          <div className="dock-group" role="group" aria-label="Camera presets">
            <button
              type="button"
              id="cam-hero"
              className="dock-btn"
              aria-pressed={activeCamera === 'hero'}
              onClick={() => handleCameraPreset('hero')}
            >
              <Camera size={13} />
              <span>3/4</span>
            </button>
            <button
              type="button"
              id="cam-front"
              className="dock-btn"
              aria-pressed={activeCamera === 'front'}
              onClick={() => handleCameraPreset('front')}
            >
              <span>Front</span>
            </button>
            <button
              type="button"
              id="cam-side"
              className="dock-btn"
              aria-pressed={activeCamera === 'side'}
              onClick={() => handleCameraPreset('side')}
            >
              <span>Profile</span>
            </button>
            <button
              type="button"
              id="cam-macro"
              className="dock-btn"
              aria-pressed={activeCamera === 'macro'}
              onClick={() => handleCameraPreset('macro')}
            >
              <span>Macro</span>
            </button>
          </div>

          <span className="dock-divider" aria-hidden="true" />

          <div className="dock-group">
            <button
              type="button"
              id="quick-night-btn"
              className="dock-btn"
              aria-pressed={isDarkRoom}
              onClick={handleQuickNightToggle}
              title="Toggle Daylight / Dark Room backlight preview"
            >
              {isDarkRoom ? <Moon size={13} /> : <Sun size={13} />}
              <span>{isDarkRoom ? 'Night' : 'Day'}</span>
            </button>
            <button
              type="button"
              id="share-url-btn"
              className="dock-btn"
              onClick={handleCopyShareUrl}
              title="Copy shareable configuration link"
            >
              <Share2 size={13} />
              <span>Share</span>
            </button>
            <button
              type="button"
              id="export-png-btn"
              className="dock-btn dock-btn--primary"
              onClick={handleExportPng}
              title="Download high-resolution PNG snapshot"
            >
              <Download size={13} />
              <span>PNG</span>
            </button>
          </div>
        </nav>
      </main>

      {/* Collapsible Right Studio Inspector */}
      <ControlPanel
        state={state}
        collapsed={panelCollapsed}
        onToggleCollapse={() => setPanelCollapsed((c) => !c)}
        onChangeStyle={handleStyleChange}
        onChangeConfig={handleConfigChange}
        onChangeFinish={handleFinishChange}
        onChangeLabel={handleLabelChange}
        onApplyRoomPreset={handleApplyRoomPreset}
        onToggleLed={handleToggleLed}
        onChangeAlignment={(textAlignment: TextAlignment) =>
          setState((p) => ({ ...p, textAlignment }))
        }
        onChangeCasing={(textCasing: TextCasing) =>
          setState((p) => ({ ...p, textCasing }))
        }
        onChangeRoomLight={(roomLight) =>
          setState((p) => ({ ...p, roomLight }))
        }
        onChangeBacklight={(backlight) =>
          setState((p) => ({ ...p, backlight }))
        }
        onSelectWallPreset={(wallPresetId, wallColor) => {
          handleClearWallpaper();
          setState((p) => ({
            ...p,
            wallPresetId,
            wallColor,
            wallpaper: { ...p.wallpaper, imageUrl: null, fileName: '' },
          }));
        }}
        onChangeWallColor={(wallColor) => {
          handleClearWallpaper();
          setState((p) => ({
            ...p,
            wallColor,
            wallpaper: { ...p.wallpaper, imageUrl: null, fileName: '' },
          }));
        }}
        onUploadWallpaper={handleUploadWallpaper}
        onClearWallpaper={handleClearWallpaper}
        onChangeWallpaperScale={(repeatWidthInches) =>
          setState((p) => ({
            ...p,
            wallpaper: { ...p.wallpaper, repeatWidthInches },
          }))
        }
        onChangeWallpaperRepeatMode={(repeatMode: WallpaperRepeatMode) =>
          setState((p) => ({
            ...p,
            wallpaper: { ...p.wallpaper, repeatMode },
          }))
        }
      />
    </div>
  );
}
