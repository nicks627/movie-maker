import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * ParticleBurst
 *
 * 指定の原点から粒子が放射状に飛び散るお祝いエフェクト。
 * 勝利シーン・クリアシーン・重要ポイントの強調などに使用。
 *
 * Usage:
 * ```json
 * {
 *   "component": "ParticleBurst",
 *   "props": {
 *     "count": 40,
 *     "originX": 50,
 *     "originY": 50,
 *     "colors": ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6"],
 *     "speed": 1.0
 *   }
 * }
 * ```
 */
export interface ParticleBurstProps {
  count?: number;      // パーティクル数 (default: 30)
  originX?: number;    // 0〜100 (%) 発生X座標 (default: 50)
  originY?: number;    // 0〜100 (%) 発生Y座標 (default: 50)
  colors?: string[];
  speed?: number;      // 飛び散り速度 (default: 1.0)
  size?: number;       // 粒子の基本サイズ (default: 14)
  gravity?: number;    // 重力係数 (default: 0.6)
  shapes?: Array<'circle' | 'rect' | 'triangle'>; // 粒子の形
}

const DEFAULT_COLORS = ['#38bdf8', '#fb923c', '#a78bfa', '#34d399', '#f472b6', '#facc15'];

// シード付き擬似乱数（同じシードなら同じ値）
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

export const ParticleBurst: React.FC<ParticleBurstProps> = ({
  count = 30,
  originX = 50,
  originY = 50,
  colors = DEFAULT_COLORS,
  speed = 1.0,
  size = 14,
  gravity = 0.6,
  shapes = ['circle', 'rect'],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 展開アニメーション（1.2秒で展開→フェードアウト）
  const totalDuration = Math.round(fps * 1.8);
  const progress = interpolate(frame, [0, totalDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const sceneOpacity = interpolate(frame, [totalDuration * 0.6, totalDuration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const originPx = { x: (originX / 100) * width, y: (originY / 100) * height };

  const particles = Array.from({ length: count }, (_, i) => {
    // 各粒子のプロパティをシードから決定（再現性あり）
    const angle   = seededRandom(i * 7 + 1) * Math.PI * 2;
    const dist    = (0.25 + seededRandom(i * 7 + 2) * 0.75) * 420 * speed;
    const delay   = seededRandom(i * 7 + 3) * 0.15; // 少し時差
    const pSize   = size * (0.5 + seededRandom(i * 7 + 4) * 1.0);
    const colorIdx = Math.floor(seededRandom(i * 7 + 5) * colors.length);
    const shapeIdx = Math.floor(seededRandom(i * 7 + 6) * shapes.length);
    const spin    = seededRandom(i * 7 + 7) * 720 - 360;

    const adjProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
    const sp = spring({ frame: Math.round(adjProgress * fps), fps, config: { damping: 14, mass: 0.7 } });

    const px = originPx.x + Math.cos(angle) * dist * sp;
    const py = originPx.y + Math.sin(angle) * dist * sp
      + gravity * dist * adjProgress * adjProgress * 0.5; // 放物線
    const rot = spin * adjProgress;
    const particleOpacity = sceneOpacity * (1 - adjProgress * 0.2);

    const shape = shapes[shapeIdx];
    const color = colors[colorIdx];

    return { px, py, rot, particleOpacity, pSize, color, shape, i };
  });

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <svg
        style={{ position: 'absolute', inset: 0 }}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {particles.map(({ px, py, rot, particleOpacity, pSize, color, shape, i }) => {
          const transform = `translate(${px}, ${py}) rotate(${rot})`;

          if (shape === 'rect') {
            return (
              <rect
                key={i}
                x={-pSize / 2}
                y={-pSize / 2}
                width={pSize}
                height={pSize * 0.6}
                rx={2}
                fill={color}
                opacity={particleOpacity}
                transform={transform}
              />
            );
          }
          if (shape === 'triangle') {
            const s = pSize;
            return (
              <polygon
                key={i}
                points={`0,${-s * 0.6} ${s * 0.5},${s * 0.4} ${-s * 0.5},${s * 0.4}`}
                fill={color}
                opacity={particleOpacity}
                transform={transform}
              />
            );
          }
          // circle (default)
          return (
            <circle
              key={i}
              cx={0}
              cy={0}
              r={pSize / 2}
              fill={color}
              opacity={particleOpacity}
              transform={transform}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
