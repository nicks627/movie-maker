import type { SceneTransition } from '../types';

type TransitionOption = {
  value: SceneTransition['type'];
  label: string;
};

export const SCENE_TRANSITION_OPTIONS: TransitionOption[] = [
  { value: 'none', label: 'なし' },
  { value: 'dissolve', label: 'ディゾルブ / クロスフェード' },
  { value: 'wipe', label: 'ワイプ' },
  { value: 'slide', label: 'スライド' },
  { value: 'push', label: 'プッシュ' },
  { value: 'zoom', label: 'ズーム' },
  { value: 'glitch', label: 'グリッチ' },
  { value: 'blur', label: 'ブラー / ピンぼけ' },
  { value: 'flash', label: 'フラッシュ' },
  { value: 'lightLeak', label: 'ライトリーク' },
  { value: 'whip', label: 'ウィップ / スピードランプ風' },
  { value: 'iris', label: 'アイリス' },
  { value: 'split', label: 'スプリット / シャッター' },
  { value: 'spin', label: 'スピン' },
];

export const DIRECTION_OPTIONS: { value: NonNullable<SceneTransition['direction']>; label: string }[] = [
  { value: 'left', label: '左から' },
  { value: 'right', label: '右から' },
  { value: 'up', label: '上から' },
  { value: 'down', label: '下から' },
];

export const transitionSupportsDirection = (type: SceneTransition['type']) =>
  type === 'wipe' ||
  type === 'slide' ||
  type === 'push' ||
  type === 'split' ||
  type === 'whip';
