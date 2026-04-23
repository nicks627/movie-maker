import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface Props {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export const ImpactNumber: React.FC<Props> = ({
  label,
  value,
  sub,
  accent = '#38bdf8',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });
  const valueScale = interpolate(enterProgress, [0, 1], [0.4, 1]);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#000000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: 72,
        fontWeight: 900,
        fontFamily: 'sans-serif',
        letterSpacing: '0.1em',
        opacity: labelOpacity,
      }}>
        {label}
      </div>

      <div style={{
        color: accent,
        fontSize: 200,
        fontWeight: 900,
        fontFamily: 'sans-serif',
        lineHeight: 1,
        transform: `scale(${valueScale})`,
        textShadow: `0 0 60px ${accent}88`,
      }}>
        {value}
      </div>

      {sub && (
        <div style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: 52,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          opacity: subOpacity,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};
