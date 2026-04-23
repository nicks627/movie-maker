import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * CountUp
 *
 * 数値がカウントアップ（またはダウン）するアニメーションコンポーネント。
 * ImpactNumber との違い: より汎用的で、単位・プレフィックス・コンマ区切り対応。
 *
 * Usage:
 * ```json
 * {
 *   "component": "CountUp",
 *   "props": {
 *     "from": 0,
 *     "to": 12800,
 *     "prefix": "約",
 *     "suffix": "億円",
 *     "separateThousands": true,
 *     "accentColor": "#38bdf8",
 *     "fontSize": 96
 *   }
 * }
 * ```
 */
export interface CountUpProps {
  from?: number;
  to: number;
  decimals?: number;         // 小数点以下桁数 (default: 0)
  prefix?: string;           // 数値の前に付けるテキスト (例: "約")
  suffix?: string;           // 数値の後に付けるテキスト (例: "億円")
  separateThousands?: boolean; // カンマ区切り (default: false)
  fontSize?: number;
  color?: string;
  accentColor?: string;      // 数値部分の色
  label?: string;            // 数値の下に表示するラベル
  durationRatio?: number;    // 0〜1 何割のフレームでカウントを終わらせるか (default: 0.8)
  easing?: 'linear' | 'ease-out' | 'ease-in-out';
}

function formatNumber(value: number, decimals: number, separateThousands: boolean): string {
  const fixed = value.toFixed(decimals);
  if (!separateThousands) return fixed;
  const [int, dec] = fixed.split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${formatted}.${dec}` : formatted;
}

export const CountUp: React.FC<CountUpProps> = ({
  from = 0,
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  separateThousands = false,
  fontSize = 96,
  color = 'rgba(255,255,255,0.85)',
  accentColor = '#38bdf8',
  label,
  durationRatio = 0.8,
  easing = 'ease-out',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const endFrame = Math.floor(durationInFrames * durationRatio);

  let rawProgress = interpolate(frame, [0, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // イージング
  if (easing === 'ease-out') {
    rawProgress = 1 - Math.pow(1 - rawProgress, 3);
  } else if (easing === 'ease-in-out') {
    rawProgress = rawProgress < 0.5
      ? 4 * rawProgress ** 3
      : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
  }

  const currentValue = from + (to - from) * rawProgress;

  // エントリーアニメーション
  const entryScale = interpolate(frame, [0, 12], [0.7, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const entryOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const displayValue = formatNumber(currentValue, decimals, separateThousands);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: entryOpacity,
        transform: `scale(${entryScale})`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          lineHeight: 1,
        }}
      >
        {prefix && (
          <span style={{ fontSize: fontSize * 0.55, color, fontWeight: 700, marginRight: 4 }}>
            {prefix}
          </span>
        )}
        <span
          style={{
            fontSize,
            fontWeight: 900,
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 40px ${accentColor}66, 0 4px 20px rgba(0,0,0,0.4)`,
            letterSpacing: '-0.02em',
          }}
        >
          {displayValue}
        </span>
        {suffix && (
          <span style={{ fontSize: fontSize * 0.5, color, fontWeight: 700, marginLeft: 4 }}>
            {suffix}
          </span>
        )}
      </div>
      {label && (
        <div
          style={{
            fontSize: fontSize * 0.28,
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            marginTop: 10,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      )}
    </AbsoluteFill>
  );
};
