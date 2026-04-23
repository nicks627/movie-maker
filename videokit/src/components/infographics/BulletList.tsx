import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface Props {
  title: string;
  bullets: string[];
  tagline?: string;
  accent?: string;
}

export const BulletList: React.FC<Props> = ({ title, bullets, tagline, accent = '#38bdf8' }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      padding: '32px 64px',
      boxSizing: 'border-box',
      gap: 20,
    }}>
      <div style={{
        color: 'white', fontSize: 62, fontWeight: 900,
        fontFamily: 'sans-serif', width: '100%',
        opacity: titleOpacity,
        borderBottom: `3px solid ${accent}`,
        paddingBottom: 10,
      }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        {bullets.map((bullet, i) => {
          const delay = i * 8 + 10;
          const opacity = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateRight: 'clamp' });
          const translateX = interpolate(frame, [delay, delay + 14], [-30, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'row',
              alignItems: 'center', gap: 20,
              opacity,
              transform: `translateX(${translateX}px)`,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: accent,
                flexShrink: 0,
                boxShadow: `0 0 12px ${accent}88`,
              }} />
              <div style={{
                color: 'white', fontSize: 52, fontWeight: 800,
                fontFamily: 'sans-serif',
              }}>
                {bullet}
              </div>
            </div>
          );
        })}
      </div>

      {tagline && (
        <div style={{
          color: '#facc15', fontSize: 50, fontWeight: 900,
          fontFamily: 'sans-serif', textAlign: 'center', width: '100%',
          opacity: interpolate(frame, [32, 44], [0, 1], { extrapolateRight: 'clamp' }),
          marginTop: 4,
        }}>
          {tagline}
        </div>
      )}
    </div>
  );
};
