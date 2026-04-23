import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface PoliticalShockBannerProps {
  kicker?: string;
  headline: string;
  subline?: string;
  accentColor?: string;
}

export const PoliticalShockBanner: React.FC<PoliticalShockBannerProps> = ({
  kicker,
  headline,
  subline,
  accentColor = '#ef4444',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.9 },
  });

  const opacity = interpolate(frame, [0, 4, 12], [0, 0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(reveal, [0, 1], [42, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 5, 12], [0.86, 1.05, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const skew = interpolate(frame, [0, 5, 12], [-8, 2, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {kicker ? (
          <div
            style={{
              padding: '6px 18px',
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.82)',
              color: '#f8fafc',
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textShadow: '0 6px 18px rgba(0,0,0,0.45)',
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            minWidth: '72%',
            maxWidth: '94%',
            padding: '18px 28px 14px',
            background: 'rgba(0, 0, 0, 0.88)',
            border: '4px solid rgba(255,255,255,0.16)',
            boxShadow: '0 26px 60px rgba(0,0,0,0.48)',
            transform: `scale(${scale}) skewX(${skew}deg)`,
          }}
        >
          <div
            style={{
              color: accentColor,
              fontSize: 96,
              fontWeight: 1000,
              textAlign: 'center',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              WebkitTextStroke: '4px #020617',
              paintOrder: 'stroke fill',
              textShadow: '0 10px 24px rgba(0,0,0,0.45)',
            }}
          >
            {headline}
          </div>
        </div>
        {subline ? (
          <div
            style={{
              color: '#f8fafc',
              fontSize: 30,
              fontWeight: 900,
              textAlign: 'center',
              lineHeight: 1.2,
              textShadow: '0 8px 20px rgba(0,0,0,0.45)',
            }}
          >
            {subline}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
