import React from 'react';
import { AbsoluteFill } from 'remotion';

/**
 * ColorGrade
 *
 * CSS blend-mode オーバーレイによるカラーグレーディング。
 * CSS filter をラッパーに適用できないため、blend-mode 付き半透明オーバーレイで
 * 映像の色調をコントロールする。
 *
 * Usage (popup component):
 * ```json
 * { "component": "ColorGrade", "props": { "preset": "cinematic" } }
 * ```
 *
 * Usage (sceneEffect):
 * ```json
 * { "sceneEffect": { "colorGrade": { "preset": "warm" } } }
 * ```
 */
export type ColorGradePreset =
  | 'cinematic'  // 低彩度・コントラスト強め・ティール&オレンジ
  | 'warm'       // オレンジ系 暖色トーン
  | 'cold'       // ブルー系 寒色トーン
  | 'vibrant'    // 彩度高め・鮮やか
  | 'muted'      // 彩度低め・落ち着いたトーン
  | 'retro'      // セピア調・ヴィンテージ
  | 'neon'       // ネオン・サイバーパンク風
  | 'horror';    // 赤みを抑えた暗いトーン

export interface ColorGradeProps {
  preset: ColorGradePreset;
  intensity?: number; // 0〜1 (default: 1.0)
}

interface GradeLayer {
  background: string;
  blendMode: React.CSSProperties['mixBlendMode'];
  opacity: number;
}

const GRADE_LAYERS: Record<ColorGradePreset, GradeLayer[]> = {
  cinematic: [
    { background: 'rgba(0,30,60,0.18)',    blendMode: 'multiply',  opacity: 1 },
    { background: 'rgba(255,140,0,0.08)', blendMode: 'screen',    opacity: 1 },
  ],
  warm: [
    { background: 'rgba(255,160,60,0.14)', blendMode: 'screen',   opacity: 1 },
    { background: 'rgba(20,10,0,0.08)',    blendMode: 'multiply', opacity: 1 },
  ],
  cold: [
    { background: 'rgba(40,80,200,0.14)',  blendMode: 'screen',   opacity: 1 },
    { background: 'rgba(0,0,20,0.1)',      blendMode: 'multiply', opacity: 1 },
  ],
  vibrant: [
    { background: 'rgba(255,50,100,0.08)', blendMode: 'screen',   opacity: 1 },
    { background: 'rgba(0,200,255,0.08)',  blendMode: 'screen',   opacity: 1 },
  ],
  muted: [
    { background: 'rgba(128,128,128,0.22)', blendMode: 'color',   opacity: 1 },
  ],
  retro: [
    { background: 'rgba(200,140,60,0.22)', blendMode: 'multiply', opacity: 1 },
    { background: 'rgba(255,220,150,0.08)', blendMode: 'screen',  opacity: 1 },
  ],
  neon: [
    { background: 'rgba(60,255,180,0.1)',  blendMode: 'screen',   opacity: 1 },
    { background: 'rgba(200,0,255,0.08)',  blendMode: 'screen',   opacity: 1 },
  ],
  horror: [
    { background: 'rgba(0,0,0,0.2)',       blendMode: 'multiply', opacity: 1 },
    { background: 'rgba(80,0,0,0.1)',      blendMode: 'screen',   opacity: 1 },
  ],
};

export const ColorGrade: React.FC<ColorGradeProps> = ({
  preset,
  intensity = 1.0,
}) => {
  const layers = GRADE_LAYERS[preset] ?? [];

  return (
    <>
      {layers.map((layer, i) => (
        <AbsoluteFill
          key={i}
          style={{
            pointerEvents: 'none',
            zIndex: 97,
            background: layer.background,
            mixBlendMode: layer.blendMode,
            opacity: layer.opacity * intensity,
          }}
        />
      ))}
    </>
  );
};
