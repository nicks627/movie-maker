import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * FilmGrain
 *
 * SVG feTurbulence を使ったフレームごとに変化するフィルムグレイン。
 * `seed={frame}` により毎フレーム別ノイズが生成され、リアルなフィルム粒子感を出す。
 *
 * Usage (popup component):
 * ```json
 * { "component": "FilmGrain", "props": { "opacity": 0.07 } }
 * ```
 *
 * Usage (sceneEffect):
 * ```json
 * { "sceneEffect": { "filmGrain": { "opacity": 0.07 } } }
 * ```
 */
export interface FilmGrainProps {
  opacity?: number;      // 0〜1 (default: 0.06) グレインの強さ
  frequency?: number;    // ノイズ周波数 (default: 0.8) 高いほど細かい粒子
  octaves?: number;      // 重ね合わせ回数 (default: 4)
}

export const FilmGrain: React.FC<FilmGrainProps> = ({
  opacity = 0.06,
  frequency = 0.8,
  octaves = 4,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  // 毎フレーム異なるシードにすることでアニメーション粒子を実現
  const seed = (frame * 7919 + 13) % 65535;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 99 }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0 }}
        width={width}
        height={height}
      >
        <defs>
          <filter id="film-grain-filter" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={frequency}
              numOctaves={octaves}
              seed={seed}
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          filter="url(#film-grain-filter)"
          opacity={opacity}
          fill="white"
        />
      </svg>
    </AbsoluteFill>
  );
};
