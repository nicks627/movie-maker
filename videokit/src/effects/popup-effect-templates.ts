import type { ClipEffect } from '../types';

type EffectOption = {
  value: ClipEffect['type'];
  label: string;
};

export const POPUP_EFFECT_OPTIONS: EffectOption[] = [
  { value: 'none', label: 'なし' },
  { value: 'popIn', label: 'ポップイン / 弾み' },
  { value: 'fadeIn', label: 'フェードイン' },
  { value: 'fadeOut', label: 'フェードアウト' },
  { value: 'slideIn', label: 'スライドイン' },
  { value: 'zoom', label: 'ズーム' },
  { value: 'blur', label: 'ぼかし' },
  { value: 'flash', label: 'フラッシュ' },
  { value: 'wipe', label: 'ワイプ' },
  { value: 'pulse', label: 'パルス / 鼓動' },
  { value: 'ripple', label: '中央リップル / 波紋' },
  { value: 'float', label: 'フロート / 浮遊' },
  { value: 'hover', label: 'ホバー / ふわり' },
  { value: 'bounce', label: 'バウンス' },
  { value: 'reactionJump', label: 'リアクションジャンプ' },
  { value: 'swing', label: 'スイング' },
  { value: 'orbit', label: 'オービット' },
  { value: 'glitch', label: 'グリッチモーション' },
  { value: 'spin', label: 'スピンイン' },
  { value: 'drift', label: 'ドリフト' },
  { value: 'spotlight', label: 'スポットライト' },
  { value: 'chromatic', label: 'クロマティック' },
];

const DEFAULT_EFFECTS: Record<ClipEffect['type'], ClipEffect> = {
  none: { type: 'none', duration: 15 },
  popIn: { type: 'popIn', duration: 18, startScale: 0.55, endScale: 1, intensity: 1 },
  fadeIn: { type: 'fadeIn', duration: 18 },
  fadeOut: { type: 'fadeOut', duration: 18 },
  slideIn: { type: 'slideIn', duration: 20, direction: 'left', intensity: 1 },
  zoom: { type: 'zoom', duration: 20, startScale: 0.7, endScale: 1, intensity: 1 },
  blur: { type: 'blur', duration: 18, blurAmount: 14 },
  flash: { type: 'flash', duration: 12, color: '#ffffff' },
  wipe: { type: 'wipe', duration: 18, direction: 'left' },
  pulse: { type: 'pulse', duration: 24, intensity: 1, frequency: 1, color: '#38bdf8' },
  ripple: { type: 'ripple', duration: 28, intensity: 1, frequency: 1, color: '#38bdf8' },
  float: { type: 'float', duration: 26, intensity: 1, frequency: 1 },
  hover: { type: 'hover', duration: 30, intensity: 1, frequency: 1 },
  bounce: { type: 'bounce', duration: 22, intensity: 1, frequency: 1 },
  reactionJump: { type: 'reactionJump', duration: 18, intensity: 1, frequency: 1 },
  swing: { type: 'swing', duration: 24, intensity: 1, frequency: 1, rotation: 8 },
  orbit: { type: 'orbit', duration: 26, intensity: 1, frequency: 1 },
  glitch: { type: 'glitch', duration: 16, intensity: 1, frequency: 1, color: '#ff4d8d' },
  spin: { type: 'spin', duration: 20, startScale: 0.8, endScale: 1, rotation: 18, intensity: 1 },
  drift: { type: 'drift', duration: 28, direction: 'right', intensity: 1, frequency: 1 },
  spotlight: { type: 'spotlight', duration: 22, intensity: 1, color: '#38bdf8' },
  chromatic: { type: 'chromatic', duration: 20, intensity: 1, frequency: 1, color: '#ff4d8d', secondaryColor: '#38bdf8' },
};

export const createClipEffectTemplate = (
  type: ClipEffect['type'],
  previous?: Partial<ClipEffect>,
): ClipEffect => {
  const defaults = DEFAULT_EFFECTS[type] ?? DEFAULT_EFFECTS.none;

  const next: ClipEffect = {
    ...defaults,
    duration: previous?.duration ?? defaults.duration,
  };

  if ('direction' in defaults && previous?.direction) {
    next.direction = previous.direction;
  }

  if ('startScale' in defaults && previous?.startScale !== undefined) {
    next.startScale = previous.startScale;
  }

  if ('endScale' in defaults && previous?.endScale !== undefined) {
    next.endScale = previous.endScale;
  }

  if ('blurAmount' in defaults && previous?.blurAmount !== undefined) {
    next.blurAmount = previous.blurAmount;
  }

  if ('color' in defaults && previous?.color) {
    next.color = previous.color;
  }

  if ('secondaryColor' in defaults && previous?.secondaryColor) {
    next.secondaryColor = previous.secondaryColor;
  }

  if ('intensity' in defaults && previous?.intensity !== undefined) {
    next.intensity = previous.intensity;
  }

  if ('frequency' in defaults && previous?.frequency !== undefined) {
    next.frequency = previous.frequency;
  }

  if ('rotation' in defaults && previous?.rotation !== undefined) {
    next.rotation = previous.rotation;
  }

  return next;
};

export const effectSupportsDirection = (type: ClipEffect['type']) =>
  type === 'slideIn' || type === 'wipe' || type === 'drift';

export const effectSupportsScale = (type: ClipEffect['type']) =>
  type === 'popIn' || type === 'zoom' || type === 'spin';

export const effectSupportsBlur = (type: ClipEffect['type']) => type === 'blur';

export const effectSupportsColor = (type: ClipEffect['type']) =>
  type === 'flash' || type === 'pulse' || type === 'ripple' || type === 'glitch' || type === 'spotlight' || type === 'chromatic';

export const effectSupportsSecondaryColor = (type: ClipEffect['type']) => type === 'chromatic';

export const effectSupportsIntensity = (type: ClipEffect['type']) =>
  type === 'popIn' ||
  type === 'slideIn' ||
  type === 'zoom' ||
  type === 'pulse' ||
  type === 'ripple' ||
  type === 'float' ||
  type === 'hover' ||
  type === 'bounce' ||
  type === 'reactionJump' ||
  type === 'swing' ||
  type === 'orbit' ||
  type === 'glitch' ||
  type === 'spin' ||
  type === 'drift' ||
  type === 'spotlight' ||
  type === 'chromatic';

export const effectSupportsFrequency = (type: ClipEffect['type']) =>
  type === 'pulse' ||
  type === 'ripple' ||
  type === 'float' ||
  type === 'hover' ||
  type === 'bounce' ||
  type === 'reactionJump' ||
  type === 'swing' ||
  type === 'orbit' ||
  type === 'glitch' ||
  type === 'drift' ||
  type === 'chromatic';

export const effectSupportsRotation = (type: ClipEffect['type']) =>
  type === 'swing' || type === 'spin';
