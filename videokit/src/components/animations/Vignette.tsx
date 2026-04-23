import React from 'react';
import { AbsoluteFill } from 'remotion';

/**
 * Vignette
 *
 * 画面周辺を暗くするシネマティックなビネット効果。
 * radial-gradient による AbsoluteFill オーバーレイとして実装。
 *
 * Usage (popup component):
 * ```json
 * { "component": "Vignette", "props": { "intensity": 0.6 } }
 * ```
 *
 * Usage (sceneEffect):
 * ```json
 * { "sceneEffect": { "vignette": { "intensity": 0.6 } } }
 * ```
 */
export interface VignetteProps {
  intensity?: number;  // 0〜1 (default: 0.5)
  color?: string;      // 暗くする色 (default: "#000000")
  shape?: 'circle' | 'ellipse'; // default: 'ellipse'
  softness?: number;   // 0〜1 グラデーション開始位置 (default: 0.45)
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.5,
  color = '#000000',
  shape = 'ellipse',
  softness = 0.45,
}) => {
  // intensity を hex の透明度に変換 (0〜0.85 にクランプ)
  const alpha = Math.round(Math.min(0.85, intensity) * 255)
    .toString(16)
    .padStart(2, '0');

  const gradient =
    shape === 'circle'
      ? `radial-gradient(circle at center, transparent ${Math.round(softness * 100)}%, ${color}${alpha} 100%)`
      : `radial-gradient(ellipse at center, transparent ${Math.round(softness * 100)}%, ${color}${alpha} 100%)`;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 98,
        background: gradient,
      }}
    />
  );
};
