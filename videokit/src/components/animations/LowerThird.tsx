import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * LowerThird
 *
 * テロップ（ロワーサード）コンポーネント。
 * 話者名・役職・SNSハンドルなどを画面下部に表示するスライドイン UI。
 *
 * Usage:
 * ```json
 * {
 *   "component": "LowerThird",
 *   "props": {
 *     "title": "四国めたん",
 *     "subtitle": "解説担当",
 *     "accentColor": "#e91e63",
 *     "style": "modern"
 *   }
 * }
 * ```
 */
export type LowerThirdStyle = 'modern' | 'minimal' | 'bold' | 'broadcast';

export interface LowerThirdProps {
  title: string;
  subtitle?: string;
  tag?: string;             // タグ / 役職バッジ（例: "LIVE"）
  accentColor?: string;
  style?: LowerThirdStyle;
  position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  title,
  subtitle,
  tag,
  accentColor = '#38bdf8',
  style = 'modern',
  position = 'bottom-left',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({ frame, fps, config: { damping: 18, stiffness: 160 } });
  const exitFrame = 999999; // popupのdurationで制御するので内部はほぼ無限
  const fadeOut = interpolate(frame, [exitFrame - 10, exitFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const slideX = (1 - reveal) * -80;
  const opacity = reveal * fadeOut;

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '9%',
    ...(position === 'bottom-left'   ? { left: '4%' } :
        position === 'bottom-right'  ? { right: '4%' } :
        { left: '50%', transform: `translateX(-50%) translateX(${slideX}px)` }),
    ...(position !== 'bottom-center' ? { transform: `translateX(${slideX}px)` } : {}),
  };

  if (style === 'minimal') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ ...posStyle, opacity }}>
          <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            {tag && (
              <span style={{
                fontSize: 18,
                fontWeight: 700,
                color: accentColor,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>{tag}</span>
            )}
            <span style={{
              fontSize: 40,
              fontWeight: 900,
              color: '#ffffff',
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
              letterSpacing: '0.01em',
            }}>{title}</span>
            {subtitle && (
              <span style={{
                fontSize: 22,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}>{subtitle}</span>
            )}
            <div style={{ height: 3, background: accentColor, borderRadius: 2, marginTop: 4 }} />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === 'bold') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ ...posStyle, opacity }}>
          <div style={{
            background: accentColor,
            padding: '10px 28px 10px 20px',
            borderRadius: '0 8px 8px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 3px ${accentColor}44`,
          }}>
            {tag && (
              <span style={{
                fontSize: 16,
                fontWeight: 800,
                color: 'rgba(0,0,0,0.8)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.2)',
                padding: '3px 8px',
                borderRadius: 4,
              }}>{tag}</span>
            )}
            <div>
              <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{subtitle}</div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (style === 'broadcast') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ ...posStyle, opacity }}>
          <div style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 0,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          }}>
            {/* アクセントバー */}
            <div style={{ width: 6, background: accentColor, borderRadius: '3px 0 0 3px' }} />
            {/* コンテンツ */}
            <div style={{
              background: 'rgba(2,6,23,0.88)',
              backdropFilter: 'blur(12px)',
              padding: '10px 22px',
              borderRadius: '0 6px 6px 0',
            }}>
              {tag && (
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: accentColor,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}>{tag}</div>
              )}
              <div style={{ fontSize: 38, fontWeight: 900, color: '#f8fafc', lineHeight: 1.15 }}>{title}</div>
              {subtitle && (
                <div style={{ fontSize: 20, fontWeight: 500, color: 'rgba(248,250,252,0.7)', marginTop: 3 }}>{subtitle}</div>
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // default: modern
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ ...posStyle, opacity }}>
        <div style={{
          background: 'rgba(2,6,23,0.82)',
          backdropFilter: 'blur(16px)',
          borderRadius: 12,
          padding: '12px 24px 12px 18px',
          borderLeft: `4px solid ${accentColor}`,
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}30`,
          display: 'inline-flex',
          flexDirection: 'column',
          gap: 4,
          minWidth: 220,
        }}>
          {tag && (
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: accentColor,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>{tag}</span>
          )}
          <span style={{
            fontSize: 36,
            fontWeight: 900,
            color: '#f8fafc',
            lineHeight: 1.15,
          }}>{title}</span>
          {subtitle && (
            <span style={{
              fontSize: 19,
              fontWeight: 500,
              color: 'rgba(248,250,252,0.72)',
              marginTop: 1,
            }}>{subtitle}</span>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
