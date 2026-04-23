import type {
  CameraMotionType,
  SceneEffect,
  SceneOverlayType,
  SceneStylePreset,
} from '../types';

type LabelOption<T extends string> = {
  value: T;
  label: string;
};

export const SCENE_STYLE_PRESET_OPTIONS: LabelOption<SceneStylePreset>[] = [
  { value: 'none', label: 'カスタム / なし' },
  { value: 'yukkuri-rich', label: 'ゆっくり解説' },
  { value: 'shorts-punch', label: 'Shorts / テンポ重視' },
  { value: 'documentary', label: 'ドキュメンタリー' },
  { value: 'variety', label: 'バラエティ' },
  { value: 'product-showcase', label: '商品紹介 / 比較' },
];

export const CAMERA_MOTION_OPTIONS: LabelOption<CameraMotionType>[] = [
  { value: 'none', label: 'なし' },
  { value: 'ken-burns', label: 'Ken Burns / ゆっくりズーム' },
  { value: 'pan-left', label: 'パン 左' },
  { value: 'pan-right', label: 'パン 右' },
  { value: 'pan-up', label: 'パン 上' },
  { value: 'pan-down', label: 'パン 下' },
  { value: 'push-in', label: 'プッシュイン' },
  { value: 'pull-out', label: 'プルアウト' },
  { value: 'parallax', label: 'パララックス' },
  { value: 'documentary-drift', label: 'ドキュメンタリー漂い' },
  { value: 'short-punch', label: 'Shorts パンチイン' },
];

export const SCENE_OVERLAY_OPTIONS: LabelOption<SceneOverlayType>[] = [
  { value: 'none', label: 'なし' },
  { value: 'light-leak', label: 'ライトリーク' },
  { value: 'letterbox', label: 'レターボックス' },
  { value: 'archive-frame', label: 'アーカイブ / 記録映像枠' },
  { value: 'broadcast-hud', label: 'ブロードキャスト HUD' },
  { value: 'variety-glow', label: 'バラエティ発光' },
];

export const COLOR_GRADE_OPTIONS: NonNullable<SceneEffect['colorGrade']>['preset'][] = [
  'cinematic',
  'warm',
  'cold',
  'vibrant',
  'muted',
  'retro',
  'neon',
  'horror',
];

const PRESET_MAP: Record<Exclude<SceneStylePreset, 'none'>, SceneEffect> = {
  'yukkuri-rich': {
    stylePreset: 'yukkuri-rich',
    cameraMotion: { type: 'ken-burns', intensity: 0.75, speed: 0.9, focusX: 50, focusY: 48, parallaxDepth: 0.6 },
    overlay: { type: 'none', intensity: 0.6, color: '#38bdf8', secondaryColor: '#f97316' },
    filmGrain: { opacity: 0.04, frequency: 0.7 },
    vignette: { intensity: 0.38, shape: 'ellipse', softness: 0.5, color: '#020617' },
    colorGrade: { preset: 'vibrant', intensity: 0.55 },
    cameraShake: { intensity: 0.12, speed: 0.7 },
  },
  'shorts-punch': {
    stylePreset: 'shorts-punch',
    cameraMotion: { type: 'short-punch', intensity: 1.1, speed: 1.15, focusX: 50, focusY: 50, parallaxDepth: 0.5 },
    overlay: { type: 'light-leak', intensity: 0.7, color: '#fbbf24', secondaryColor: '#fb7185' },
    filmGrain: { opacity: 0.03, frequency: 0.9 },
    vignette: { intensity: 0.3, shape: 'ellipse', softness: 0.58, color: '#020617' },
    colorGrade: { preset: 'vibrant', intensity: 0.78 },
    cameraShake: { intensity: 0.18, speed: 1.15 },
  },
  documentary: {
    stylePreset: 'documentary',
    cameraMotion: { type: 'documentary-drift', intensity: 0.72, speed: 0.85, focusX: 52, focusY: 46, parallaxDepth: 0.4 },
    overlay: { type: 'archive-frame', intensity: 0.85, color: '#f8fafc', secondaryColor: '#38bdf8' },
    filmGrain: { opacity: 0.08, frequency: 0.95 },
    vignette: { intensity: 0.48, shape: 'ellipse', softness: 0.42, color: '#000000' },
    colorGrade: { preset: 'muted', intensity: 0.68 },
    cameraShake: { intensity: 0.08, speed: 0.65 },
  },
  variety: {
    stylePreset: 'variety',
    cameraMotion: { type: 'parallax', intensity: 0.95, speed: 1.05, focusX: 50, focusY: 50, parallaxDepth: 1.1 },
    overlay: { type: 'variety-glow', intensity: 0.95, color: '#fde047', secondaryColor: '#38bdf8' },
    filmGrain: { opacity: 0.02, frequency: 0.75 },
    vignette: { intensity: 0.22, shape: 'ellipse', softness: 0.62, color: '#020617' },
    colorGrade: { preset: 'neon', intensity: 0.4 },
    cameraShake: { intensity: 0.16, speed: 1.0 },
  },
  'product-showcase': {
    stylePreset: 'product-showcase',
    cameraMotion: { type: 'push-in', intensity: 0.72, speed: 0.9, focusX: 50, focusY: 46, parallaxDepth: 0.45 },
    overlay: { type: 'broadcast-hud', intensity: 0.72, color: '#22c55e', secondaryColor: '#38bdf8' },
    filmGrain: { opacity: 0.025, frequency: 0.6 },
    vignette: { intensity: 0.32, shape: 'ellipse', softness: 0.56, color: '#020617' },
    colorGrade: { preset: 'cinematic', intensity: 0.46 },
    cameraShake: { intensity: 0.06, speed: 0.72 },
  },
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type SceneEffectOverride = Omit<Partial<SceneEffect>, 'cameraMotion' | 'overlay'> & {
  cameraMotion?: Partial<NonNullable<SceneEffect['cameraMotion']>>;
  overlay?: Partial<NonNullable<SceneEffect['overlay']>>;
};

const mergeSceneEffect = (base: SceneEffect, override?: SceneEffectOverride): SceneEffect => {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    cameraMotion: {
      ...(base.cameraMotion ?? { type: 'none' as const }),
      ...override.cameraMotion,
    },
    overlay: {
      ...(base.overlay ?? { type: 'none' as const }),
      ...override.overlay,
    },
    filmGrain: {
      ...base.filmGrain,
      ...override.filmGrain,
    },
    vignette: {
      ...base.vignette,
      ...override.vignette,
    },
    colorGrade: override.colorGrade
      ? {
          ...base.colorGrade,
          ...override.colorGrade,
        }
      : base.colorGrade,
    cameraShake: {
      ...base.cameraShake,
      ...override.cameraShake,
    },
  };
};

export const createSceneEffectPreset = (
  preset: SceneStylePreset,
  override?: SceneEffectOverride,
): SceneEffect => {
  if (preset === 'none') {
    return mergeSceneEffect(
      {
        stylePreset: 'none',
        cameraMotion: { type: 'none', intensity: 1, speed: 1, focusX: 50, focusY: 50, parallaxDepth: 0.6 },
        overlay: { type: 'none', intensity: 1, color: '#38bdf8', secondaryColor: '#f97316' },
      },
      override,
    );
  }

  return mergeSceneEffect(clone(PRESET_MAP[preset]), override);
};

export const createDefaultCameraMotion = (
  type: CameraMotionType,
  previous?: NonNullable<SceneEffect['cameraMotion']>,
): NonNullable<SceneEffect['cameraMotion']> => ({
  type,
  intensity: previous?.intensity ?? 1,
  speed: previous?.speed ?? 1,
  focusX: previous?.focusX ?? 50,
  focusY: previous?.focusY ?? 50,
  parallaxDepth: previous?.parallaxDepth ?? 0.8,
});

export const createDefaultSceneOverlay = (
  type: SceneOverlayType,
  previous?: NonNullable<SceneEffect['overlay']>,
): NonNullable<SceneEffect['overlay']> => ({
  type,
  intensity: previous?.intensity ?? 1,
  color: previous?.color ?? '#fbbf24',
  secondaryColor: previous?.secondaryColor ?? '#38bdf8',
});
