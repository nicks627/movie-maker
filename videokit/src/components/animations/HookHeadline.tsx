import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface HookHeadlineProps {
  title: string;
  subtitle?: string;
  tag?: string;
  accentColor?: string;
  secondaryColor?: string;
}

export const HookHeadline: React.FC<HookHeadlineProps> = ({
  title,
  subtitle,
  tag = 'SNS定番説',
  accentColor = '#f59e0b',
  secondaryColor = '#fb7185',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reveal = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 170, mass: 0.9 },
  });
  const opacity = interpolate(frame, [0, 8, 18], [0, 0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const glowScale = interpolate(frame, [0, 12], [0.84, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const yLift = (1 - reveal) * 42;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity,
        transform: `translateY(${yLift}px)`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '10% 6%',
            borderRadius: 44,
            background: `radial-gradient(circle at 50% 20%, ${accentColor}33, transparent 55%), radial-gradient(circle at 80% 50%, ${secondaryColor}25, transparent 45%)`,
            filter: 'blur(32px)',
            transform: `scale(${glowScale})`,
          }}
        />
        <div
          style={{
            minWidth: '72%',
            maxWidth: '90%',
            borderRadius: 38,
            padding: '26px 34px 22px',
            background:
              'linear-gradient(180deg, rgba(8,15,29,0.92) 0%, rgba(9,18,34,0.82) 100%)',
            border: `2px solid ${accentColor}88`,
            boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${secondaryColor}44, inset 0 1px 0 rgba(255,255,255,0.08)`,
            backdropFilter: 'blur(18px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${secondaryColor}, ${accentColor})`,
              color: '#fff7ed',
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: '0.12em',
              boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
            }}
          >
            {tag}
          </div>
          <div
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 1000,
              lineHeight: 1.02,
              textAlign: 'center',
              letterSpacing: '-0.03em',
              textShadow: `0 8px 24px rgba(0,0,0,0.46), 0 0 40px ${accentColor}33`,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                color: 'rgba(255,255,255,0.84)',
                fontSize: 34,
                fontWeight: 800,
                lineHeight: 1.25,
                textAlign: 'center',
                textShadow: '0 6px 18px rgba(0,0,0,0.35)',
              }}
            >
              {subtitle}
            </div>
          ) : null}
          <div
            style={{
              width: '74%',
              height: 10,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${secondaryColor}, ${accentColor})`,
              boxShadow: `0 0 30px ${accentColor}55`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
