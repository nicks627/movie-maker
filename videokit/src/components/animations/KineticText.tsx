import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * KineticText
 *
 * 単語ごと・文字ごとにスプリングアニメーションを適用するキネティックテキスト。
 * popup component として script.json の popups[].component に指定して使う。
 *
 * Usage:
 * ```json
 * {
 *   "component": "KineticText",
 *   "props": {
 *     "text": "すごい発見！",
 *     "style": "bounce",
 *     "accentColor": "#38bdf8",
 *     "fontSize": 80
 *   }
 * }
 * ```
 */
export interface KineticTextProps {
  text: string;
  style?: 'bounce' | 'wave' | 'pop' | 'cascade' | 'char-bounce';
  fontSize?: number;
  color?: string;
  accentColor?: string;
  staggerFrames?: number;  // 単語間の遅延フレーム (default: 4)
  fontWeight?: number | string;
  shadow?: boolean;
}

const SPRING_CFG = { damping: 12, mass: 0.8, stiffness: 140 };

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  style = 'bounce',
  fontSize = 72,
  color = '#ffffff',
  accentColor = '#38bdf8',
  staggerFrames = 4,
  fontWeight = 900,
  shadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // char-bounce は文字単位、それ以外は単語単位
  const tokens = style === 'char-bounce' ? text.split('') : text.split(' ');

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: style === 'char-bounce' ? 2 : 10,
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {tokens.map((token, i) => {
        const tokenFrame = frame - i * staggerFrames;
        const reveal = spring({ frame: Math.max(0, tokenFrame), fps, config: SPRING_CFG });

        let transform = 'none';
        let opacity = 1;

        switch (style) {
          case 'bounce':
            transform = `translateY(${(1 - reveal) * 60}px) scale(${0.75 + reveal * 0.25})`;
            opacity = reveal;
            break;

          case 'wave': {
            const wave = Math.sin((frame * 0.14) + i * 0.85) * 14;
            transform = `translateY(${wave}px) scale(${Math.max(0, reveal)})`;
            opacity = reveal;
            break;
          }

          case 'pop': {
            const overshoot = tokenFrame >= 0 && tokenFrame <= 4
              ? interpolate(tokenFrame, [0, 2, 4], [0, 1.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              : reveal;
            transform = `scale(${Math.max(0, overshoot)})`;
            opacity = tokenFrame < 0 ? 0 : 1;
            break;
          }

          case 'cascade':
            transform = `translateX(${(1 - reveal) * -50}px)`;
            opacity = reveal;
            break;

          case 'char-bounce':
            transform = `translateY(${(1 - reveal) * 40}px) scale(${0.8 + reveal * 0.2})`;
            opacity = reveal;
            break;
        }

        // アクセントカラーを3トークンに1回使用
        const tokenColor = i % 3 === 1 ? accentColor : color;

        return (
          <span
            key={i}
            style={{
              fontSize,
              color: tokenColor,
              fontWeight,
              opacity: Math.max(0, Math.min(1, opacity)),
              transform,
              display: 'inline-block',
              textShadow: shadow
                ? `0 4px 24px rgba(0,0,0,0.55), 0 2px 0 rgba(0,0,0,0.3)`
                : undefined,
              letterSpacing: '0.02em',
              lineHeight: 1.1,
            }}
          >
            {token}
            {style !== 'char-bounce' && ' '}
          </span>
        );
      })}
    </AbsoluteFill>
  );
};
