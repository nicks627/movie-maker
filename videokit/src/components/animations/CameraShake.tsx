import React from 'react';

/**
 * CameraShake
 *
 * 複数の非公約数的な sin 波を重ね合わせることで
 * Perlin ノイズに近い有機的なカメラシェイクを生成するラッパーコンポーネント。
 * sceneEffect.cameraShake で使用 (YukkuriVideo.tsx 内で直接計算)。
 *
 * このファイルは shake 量を計算するユーティリティ関数もエクスポートする。
 */

export interface CameraShakeConfig {
  intensity?: number;  // 0〜1 (default: 0.5) 振れ幅の強さ
  speed?: number;      // 周波数倍率 (default: 1.0) 高いほど速い揺れ
}

/**
 * shakeTransform
 * 現在のフレームと設定から translate + rotate の CSS transform 文字列を返す。
 * YukkuriVideo.tsx から呼び出す。
 */
export function calcShakeTransform(frame: number, config: CameraShakeConfig): string {
  const { intensity = 0.5, speed = 1.0 } = config;
  const amp = intensity * 7; // 最大 7px

  // 互いに公約数が小さい周波数を組み合わせ → 繰り返しを感じにくくする
  const x = (
    Math.sin(frame * 0.23 * speed) * 0.50 +
    Math.sin(frame * 0.57 * speed) * 0.28 +
    Math.sin(frame * 1.13 * speed) * 0.14 +
    Math.sin(frame * 2.31 * speed) * 0.08
  ) * amp;

  const y = (
    Math.sin(frame * 0.31 * speed + 1.10) * 0.50 +
    Math.sin(frame * 0.73 * speed + 0.70) * 0.28 +
    Math.sin(frame * 1.47 * speed + 1.90) * 0.14 +
    Math.sin(frame * 2.89 * speed + 0.40) * 0.08
  ) * amp;

  const rot = (
    Math.sin(frame * 0.17 * speed + 2.30) * 0.5 +
    Math.sin(frame * 0.43 * speed + 0.90) * 0.5
  ) * intensity * 0.25; // 最大 0.25deg

  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
}

/**
 * CameraShakeWrapper
 *
 * React コンポーネントとしても使用可能（シーン外の用途向け）。
 */
export const CameraShakeWrapper: React.FC<{
  frame: number;
  config: CameraShakeConfig;
  children: React.ReactNode;
}> = ({ frame, config, children }) => {
  const { intensity = 0.5 } = config;
  const overflow = Math.ceil(intensity * 10); // シェイクで切れないよう余白

  return (
    <div
      style={{
        position: 'absolute',
        inset: -overflow,
        transform: calcShakeTransform(frame, config),
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
};
