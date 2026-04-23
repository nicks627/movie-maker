import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

/**
 * Typewriter
 *
 * カーソル付きタイプライターテキストエフェクト。
 * 1文字ずつ出現し、ブリンクするカーソルが末尾に付く。
 * コード表示・ターミナル風テロップ・劇的な情報公開演出に使用。
 *
 * Usage:
 * ```json
 * {
 *   "component": "Typewriter",
 *   "props": {
 *     "text": "機密情報を解読中...",
 *     "framesPerChar": 3,
 *     "style": "terminal",
 *     "color": "#00ff88"
 *   }
 * }
 * ```
 */
export type TypewriterStyle = 'default' | 'terminal' | 'redacted' | 'subtitle';

export interface TypewriterProps {
  text: string;
  framesPerChar?: number;    // 1文字あたりのフレーム数 (default: 2)
  style?: TypewriterStyle;
  fontSize?: number;
  color?: string;
  cursorChar?: string;       // カーソル文字 (default: '|')
  cursorBlinkHz?: number;    // カーソル点滅速度Hz (default: 2)
  showCursor?: boolean;      // カーソル表示 (default: true)
  align?: 'left' | 'center' | 'right';
  maxWidth?: string;
}

const STYLE_PRESETS: Record<TypewriterStyle, React.CSSProperties> = {
  default: {
    color: '#ffffff',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
  },
  terminal: {
    color: '#00ff88',
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textShadow: '0 0 12px rgba(0,255,136,0.6)',
    background: 'rgba(0,0,0,0.82)',
    padding: '16px 24px',
    borderRadius: 8,
    border: '1px solid rgba(0,255,136,0.3)',
  },
  redacted: {
    color: '#ff3838',
    fontFamily: "'Courier New', monospace",
    fontWeight: 900,
    textShadow: '0 0 16px rgba(255,56,56,0.5)',
    letterSpacing: '0.08em',
  },
  subtitle: {
    color: '#ffffff',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 800,
    textShadow: '0 2px 0 rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)',
  },
};

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  framesPerChar = 2,
  style = 'default',
  fontSize = 52,
  color,
  cursorChar = '|',
  cursorBlinkHz = 2,
  showCursor = true,
  align = 'center',
  maxWidth = '80%',
}) => {
  const frame = useCurrentFrame();

  const charsToShow = Math.min(text.length, Math.floor(frame / framesPerChar) + 1);
  const displayText = text.slice(0, charsToShow);
  const isComplete = charsToShow >= text.length;

  // カーソル点滅 (完了後のみ点滅、タイプ中は常に表示)
  const cursorOpacity = isComplete
    ? Math.abs(Math.sin(frame * cursorBlinkHz * Math.PI / 30)) > 0.5 ? 1 : 0
    : 1;

  const baseStyle = STYLE_PRESETS[style];
  const effectiveColor = color ?? (baseStyle.color as string);

  // エントリーフェードイン
  const opacity = interpolate(frame, [0, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent:
          align === 'left' ? 'flex-start' :
          align === 'right' ? 'flex-end' : 'center',
        padding: '0 5%',
        opacity,
      }}
    >
      <div
        style={{
          ...baseStyle,
          fontSize,
          color: effectiveColor,
          textAlign: align,
          maxWidth,
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {displayText}
        {showCursor && (
          <span
            style={{
              opacity: cursorOpacity,
              color: effectiveColor,
              marginLeft: 2,
              fontWeight: 900,
            }}
          >
            {cursorChar}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};
