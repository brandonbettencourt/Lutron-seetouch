import { useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Grid2x2,
  ImagePlus,
  LampCeiling,
  Palette,
  PanelRightClose,
  Type,
  X,
} from 'lucide-react';
import {
  KEYPAD_CONFIGURATIONS,
  ROOM_LABEL_PRESETS,
  getConfiguration,
  type ConfigCode,
  type KeypadStyle,
} from '../data/configurations';
import {
  FINISH_CATEGORIES,
  LUTRON_FINISHES,
  WALL_PRESETS,
  getFinishById,
  type FinishCategory,
} from '../data/colors';
import type {
  MockupState,
  TextAlignment,
  TextCasing,
  WallpaperRepeatMode,
} from '../types';
import { KeypadSchematic } from './KeypadSchematic';

type InspectorTab = 'layout' | 'finish' | 'labels' | 'studio';

interface ControlPanelProps {
  state: MockupState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChangeStyle: (style: KeypadStyle) => void;
  onChangeConfig: (code: ConfigCode) => void;
  onChangeFinish: (finishId: string) => void;
  onChangeLabel: (index: number, value: string) => void;
  onApplyRoomPreset: (labels: string[]) => void;
  onToggleLed: (index: number) => void;
  onChangeAlignment: (align: TextAlignment) => void;
  onChangeCasing: (casing: TextCasing) => void;
  onChangeRoomLight: (val: number) => void;
  onChangeBacklight: (val: number) => void;
  onSelectWallPreset: (presetId: string, color: string) => void;
  onChangeWallColor: (color: string) => void;
  onUploadWallpaper: (file: File) => void;
  onClearWallpaper: () => void;
  onChangeWallpaperScale: (repeatWidthInches: number) => void;
  onChangeWallpaperRepeatMode: (mode: WallpaperRepeatMode) => void;
}

export function ControlPanel({
  state,
  collapsed,
  onToggleCollapse,
  onChangeStyle,
  onChangeConfig,
  onChangeFinish,
  onChangeLabel,
  onApplyRoomPreset,
  onToggleLed,
  onChangeAlignment,
  onChangeCasing,
  onChangeRoomLight,
  onChangeBacklight,
  onSelectWallPreset,
  onChangeWallColor,
  onUploadWallpaper,
  onClearWallpaper,
  onChangeWallpaperScale,
  onChangeWallpaperRepeatMode,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>('layout');
  const [isDraggingWallpaper, setIsDraggingWallpaper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentFinish = getFinishById(state.finishId);
  const currentConfig = getConfiguration(state.configCode);

  const [selectedCategory, setSelectedCategory] = useState<FinishCategory>(
    currentFinish.category
  );

  const finishesInCategory = useMemo(
    () => LUTRON_FINISHES.filter((f) => f.category === selectedCategory),
    [selectedCategory]
  );

  const categoryMeta =
    FINISH_CATEGORIES.find((c) => c.id === selectedCategory) ??
    FINISH_CATEGORIES[1];

  const mainSlots = useMemo(
    () => currentConfig.slots.filter((s) => !s.isRaiseLower),
    [currentConfig]
  );

  const handleStyleSelect = (nextStyle: KeypadStyle) => {
    onChangeStyle(nextStyle);
    if (nextStyle === 'architectural') {
      if (selectedCategory === 'gloss' || selectedCategory === 'satin') {
        setSelectedCategory('arch-matte');
      }
    } else if (selectedCategory === 'arch-matte') {
      setSelectedCategory('satin');
    }
  };

  const handleFileSelected = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    onUploadWallpaper(file);
  };

  const wallpaperScalePercent = Math.round(
    ((state.wallpaper.repeatWidthInches - 2) / (36 - 2)) * 100
  );

  return (
    <aside
      className={`inspector-panel${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Keypad configurator controls"
    >
      <div className="inspector-top">
        <span className="inspector-heading">Configure Keypad</span>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleCollapse}
          aria-label="Collapse inspector panel"
          title="Collapse panel"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="inspector-tabs" role="tablist" aria-label="Configuration sections">
        <button
          type="button"
          role="tab"
          id="tab-layout"
          className="tab-btn"
          aria-selected={activeTab === 'layout'}
          onClick={() => setActiveTab('layout')}
        >
          <Grid2x2 size={15} />
          <span>Layout</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-finish"
          className="tab-btn"
          aria-selected={activeTab === 'finish'}
          onClick={() => setActiveTab('finish')}
        >
          <Palette size={15} />
          <span>Finish</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-labels"
          className="tab-btn"
          aria-selected={activeTab === 'labels'}
          onClick={() => setActiveTab('labels')}
        >
          <Type size={15} />
          <span>Labels</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-studio"
          className="tab-btn"
          aria-selected={activeTab === 'studio'}
          onClick={() => setActiveTab('studio')}
        >
          <LampCeiling size={15} />
          <span>Studio</span>
        </button>
      </div>

      <div className="inspector-body">
        {/* ===============================================================
            TAB 1: LAYOUT & WALLPLATE STYLE
           =============================================================== */}
        {activeTab === 'layout' && (
          <>
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Wallplate Style</span>
              </div>
              <div className="segmented-control" role="group" aria-label="Wallplate style">
                <button
                  type="button"
                  id="style-designer"
                  className="seg-btn"
                  aria-pressed={state.style === 'designer'}
                  onClick={() => handleStyleSelect('designer')}
                >
                  <span>Designer (Claro)</span>
                  <span className="seg-btn-sub">4 11/16&quot; × 2 15/16&quot;</span>
                </button>
                <button
                  type="button"
                  id="style-architectural"
                  className="seg-btn"
                  aria-pressed={state.style === 'architectural'}
                  onClick={() => handleStyleSelect('architectural')}
                >
                  <span>Architectural (Nova T*)</span>
                  <span className="seg-btn-sub">4 9/16&quot; × 2 3/4&quot;</span>
                </button>
              </div>
            </section>

            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Button Configuration</span>
                <span className="section-sub">3–6 Buttons</span>
              </div>

              <div className="config-grid">
                {KEYPAD_CONFIGURATIONS.map((cfg) => {
                  const isActive = cfg.code === state.configCode;
                  return (
                    <button
                      type="button"
                      key={cfg.code}
                      id={`config-${cfg.code}`}
                      className="config-card"
                      aria-pressed={isActive}
                      onClick={() => onChangeConfig(cfg.code)}
                      title={cfg.name}
                    >
                      <KeypadSchematic
                        config={cfg}
                        style={state.style}
                        active={isActive}
                      />
                      <span className="config-code">{cfg.code}</span>
                      <span className="config-label">{cfg.shortName}</span>
                    </button>
                  );
                })}
              </div>

              <div className="config-note">
                <strong>{currentConfig.name}:</strong> {currentConfig.description}
              </div>
            </section>
          </>
        )}

        {/* ===============================================================
            TAB 2: FINISHES & OFFICIAL LUTRON SEETOUCH COLORS
           =============================================================== */}
        {activeTab === 'finish' && (
          <>
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">seeTouch Finish Collection</span>
              </div>
              <div className="category-pills" role="group" aria-label="Finish families">
                {FINISH_CATEGORIES.map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    id={`cat-${cat.id}`}
                    className="cat-pill"
                    aria-pressed={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.shortLabel}
                  </button>
                ))}
              </div>
            </section>

            <section className="control-section">
              <div className="section-header">
                <span className="section-label">{categoryMeta.label}</span>
                <span className="section-sub">{finishesInCategory.length} available</span>
              </div>

              <div className="swatch-grid">
                {finishesInCategory.map((finish) => {
                  const isSelected = finish.id === state.finishId;
                  return (
                    <button
                      type="button"
                      key={finish.id}
                      id={`finish-${finish.id}`}
                      className="swatch-card"
                      aria-pressed={isSelected}
                      onClick={() => onChangeFinish(finish.id)}
                    >
                      <span
                        className={`swatch-chip${finish.surface === 'gloss' ? ' swatch-chip--gloss' : ''}`}
                        style={{
                          background: finish.swatchGradient ?? finish.hex,
                        }}
                      />
                      <span className="swatch-info">
                        <span className="swatch-name">{finish.name}</span>
                        <span className="swatch-code">{finish.code}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCategory === 'satin' && (
                <div className="config-note">
                  <strong>seeTouch Satin Availability:</strong> Per Lutron spec
                  (P/N 367-2918), seeTouch keypads are offered in these{' '}
                  <strong>6 Satin finishes</strong>. The expanded 20-color Satin
                  palette applies to Sunnata and Diva controls.
                </div>
              )}

              {currentFinish.pairedButton && (
                <div className="config-note">
                  <strong>Lutron Metal Pairing:</strong> Per Lutron spec,{' '}
                  <strong>{currentFinish.name} ({currentFinish.code})</strong>{' '}
                  wallplates include a matte black rear adapter trim and pair
                  with{' '}
                  <strong>
                    {currentFinish.pairedButton.name} (
                    {currentFinish.pairedButton.code})
                  </strong>{' '}
                  keypad buttons.
                </div>
              )}
            </section>
          </>
        )}

        {/* ===============================================================
            TAB 3: CUSTOM BUTTON ENGRAVING & LEDS
           =============================================================== */}
        {activeTab === 'labels' && (
          <>
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Room Presets</span>
              </div>
              <div className="preset-chips">
                {ROOM_LABEL_PRESETS.map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    className="preset-chip"
                    onClick={() => onApplyRoomPreset(preset.labels)}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Button Engraving</span>
                <span className="section-sub">Click LED to toggle</span>
              </div>

              <div className="label-list">
                {mainSlots.map((slot, idx) => {
                  const isLit = Boolean(state.activeLeds[idx]);
                  return (
                    <div className="label-row" key={slot.id}>
                      <button
                        type="button"
                        className="led-toggle-btn"
                        aria-pressed={isLit}
                        aria-label={`Toggle status LED for button ${idx + 1}`}
                        title={isLit ? 'LED On — click to turn off' : 'LED Off — click to light'}
                        onClick={() => onToggleLed(idx)}
                      >
                        <span className="led-pill" />
                      </button>

                      <div className="text-input-wrap">
                        <input
                          type="text"
                          id={`btn-label-${idx + 1}`}
                          className="label-input"
                          maxLength={18}
                          value={state.labels[idx] ?? ''}
                          placeholder={slot.defaultLabel}
                          aria-label={`Button ${idx + 1} engraving label`}
                          onChange={(e) => onChangeLabel(idx, e.target.value)}
                        />
                        <span className="label-slot-tag">B{idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Alignment &amp; Casing</span>
              </div>

              <div className="segmented-control" role="group" aria-label="Text alignment">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textAlignment === 'left'}
                  onClick={() => onChangeAlignment('left')}
                >
                  <AlignLeft size={14} />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textAlignment === 'center'}
                  onClick={() => onChangeAlignment('center')}
                >
                  <AlignCenter size={14} />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textAlignment === 'right'}
                  onClick={() => onChangeAlignment('right')}
                >
                  <AlignRight size={14} />
                  <span>Right</span>
                </button>
              </div>

              <div className="segmented-control" role="group" aria-label="Letter casing">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textCasing === 'as-typed'}
                  onClick={() => onChangeCasing('as-typed')}
                >
                  <span>As Typed</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textCasing === 'title'}
                  onClick={() => onChangeCasing('title')}
                >
                  <span>Title Case</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.textCasing === 'upper'}
                  onClick={() => onChangeCasing('upper')}
                >
                  <span>ALL CAPS</span>
                </button>
              </div>
            </section>
          </>
        )}

        {/* ===============================================================
            TAB 4: STUDIO LIGHTING, WALL BACKDROP & CUSTOM WALLPAPER
           =============================================================== */}
        {activeTab === 'studio' && (
          <>
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Room Environment</span>
              </div>

              <div className="segmented-control" role="group" aria-label="Room light presets">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.roomLight >= 75}
                  onClick={() => onChangeRoomLight(92)}
                >
                  <span>Daylight</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.roomLight > 20 && state.roomLight < 75}
                  onClick={() => onChangeRoomLight(38)}
                >
                  <span>Evening</span>
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={state.roomLight <= 20}
                  onClick={() => onChangeRoomLight(6)}
                >
                  <span>Dark Room</span>
                </button>
              </div>

              <div className="slider-field">
                <div className="slider-row">
                  <label htmlFor="room-light-slider">Ambient Room Light</label>
                  <span className="slider-val">{Math.round(state.roomLight)}%</span>
                </div>
                <input
                  id="room-light-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={state.roomLight}
                  className="studio-range"
                  style={{ '--progress': `${state.roomLight}%` } as React.CSSProperties}
                  onChange={(e) => onChangeRoomLight(Number(e.target.value))}
                />
              </div>

              <div className="slider-field">
                <div className="slider-row">
                  <label htmlFor="backlight-slider">Backlit Engraving Intensity</label>
                  <span className="slider-val">{Math.round(state.backlight)}%</span>
                </div>
                <input
                  id="backlight-slider"
                  type="range"
                  min={0}
                  max={100}
                  value={state.backlight}
                  className="studio-range"
                  style={{ '--progress': `${state.backlight}%` } as React.CSSProperties}
                  onChange={(e) => onChangeBacklight(Number(e.target.value))}
                />
              </div>
            </section>

            {/* Custom Wallpaper Uploader */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Custom Wallpaper</span>
                <span className="section-sub">Repeating print</span>
              </div>

              <input
                ref={fileInputRef}
                id="wallpaper-upload-input"
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => {
                  handleFileSelected(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />

              {!state.wallpaper.imageUrl ? (
                <label
                  htmlFor="wallpaper-upload-input"
                  className={`wallpaper-dropzone${isDraggingWallpaper ? ' is-dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingWallpaper(true);
                  }}
                  onDragLeave={() => setIsDraggingWallpaper(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingWallpaper(false);
                    handleFileSelected(e.dataTransfer.files?.[0]);
                  }}
                >
                  <ImagePlus size={18} />
                  <span className="wallpaper-drop-title">
                    Upload wallpaper image
                  </span>
                  <span className="wallpaper-drop-sub">
                    Drop PNG, JPG, or WebP swatch — tiles automatically
                  </span>
                </label>
              ) : (
                <div className="wallpaper-active-card">
                  <div className="wallpaper-preview-row">
                    <img
                      src={state.wallpaper.imageUrl}
                      alt="Uploaded wallpaper preview"
                      className="wallpaper-thumb"
                    />
                    <div className="wallpaper-meta">
                      <span className="wallpaper-filename">
                        {state.wallpaper.fileName || 'Custom Wallpaper'}
                      </span>
                      <div className="wallpaper-actions">
                        <button
                          type="button"
                          className="wallpaper-link-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          id="clear-wallpaper-btn"
                          className="wallpaper-link-btn wallpaper-link-btn--danger"
                          onClick={onClearWallpaper}
                          aria-label="Remove custom wallpaper"
                        >
                          <X size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="slider-field">
                    <div className="slider-row">
                      <label htmlFor="wallpaper-scale-slider">
                        Print Repeat Width
                      </label>
                      <span className="slider-val">
                        {state.wallpaper.repeatWidthInches.toFixed(1)}&quot;
                      </span>
                    </div>
                    <input
                      id="wallpaper-scale-slider"
                      type="range"
                      min={2}
                      max={36}
                      step={0.5}
                      value={state.wallpaper.repeatWidthInches}
                      className="studio-range"
                      style={
                        {
                          '--progress': `${wallpaperScalePercent}%`,
                        } as React.CSSProperties
                      }
                      onChange={(e) =>
                        onChangeWallpaperScale(Number(e.target.value))
                      }
                    />
                    <span className="slider-hint">
                      True-to-scale vs. {state.style === 'designer' ? '4.69"' : '4.56"'} wallplate height
                    </span>
                  </div>

                  <div
                    className="segmented-control"
                    role="group"
                    aria-label="Wallpaper repeat mode"
                  >
                    <button
                      type="button"
                      id="wp-mode-tile"
                      className="seg-btn"
                      aria-pressed={state.wallpaper.repeatMode === 'tile'}
                      onClick={() => onChangeWallpaperRepeatMode('tile')}
                    >
                      <span>Standard Tile</span>
                    </button>
                    <button
                      type="button"
                      id="wp-mode-mirror"
                      className="seg-btn"
                      aria-pressed={state.wallpaper.repeatMode === 'mirror'}
                      onClick={() => onChangeWallpaperRepeatMode('mirror')}
                    >
                      <span>Mirror Seamless</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Built-in Architectural Wall Presets */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-label">Wall Surfaces &amp; Paint</span>
              </div>

              <div className="wall-grid">
                {WALL_PRESETS.map((wp) => {
                  const isActive =
                    !state.wallpaper.imageUrl && state.wallPresetId === wp.id;
                  return (
                    <button
                      type="button"
                      key={wp.id}
                      id={`wall-${wp.id}`}
                      className="swatch-card"
                      aria-pressed={isActive}
                      onClick={() => onSelectWallPreset(wp.id, wp.color)}
                    >
                      <span
                        className="swatch-chip"
                        style={{ backgroundColor: wp.color }}
                      />
                      <span className="swatch-info">
                        <span className="swatch-name">{wp.name}</span>
                        <span className="swatch-code">{wp.textureType}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="color-picker-row">
                <label htmlFor="custom-wall-color">Custom Wall Paint</label>
                <div className="color-picker-controls">
                  <span className="color-hex-code">{state.wallColor}</span>
                  <input
                    id="custom-wall-color"
                    type="color"
                    className="native-color-input"
                    value={state.wallColor}
                    onChange={(e) => onChangeWallColor(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
