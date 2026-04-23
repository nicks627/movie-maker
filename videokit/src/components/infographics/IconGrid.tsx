import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface GridItem {
  emoji: string;
  label: string;
}

interface Props {
  title: string;
  items: GridItem[];
  accent?: string;
}

export const IconGrid: React.FC<Props> = ({ title, items, accent = '#38bdf8' }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '36px 48px',
      boxSizing: 'border-box',
      gap: 24,
    }}>
      <div style={{
        color: 'white', fontSize: 62, fontWeight: 900,
        fontFamily: 'sans-serif', opacity: titleOpacity,
        letterSpacing: '0.05em',
      }}>
        {title}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        width: '100%',
      }}>
        {items.map((item, i) => {
          const opacity = interpolate(frame, [i * 6 + 8, i * 6 + 20], [0, 1], { extrapolateRight: 'clamp' });
          const scale = interpolate(frame, [i * 6 + 8, i * 6 + 20], [0.7, 1], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8,
              background: 'rgba(56,189,248,0.08)',
              borderRadius: 16,
              padding: '20px 12px',
              opacity,
              transform: `scale(${scale})`,
            }}>
              <div style={{
                width: 64, height: 64,
                borderRadius: '50%',
                background: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
              }}>
                {item.emoji}
              </div>
              <div style={{
                color: 'white', fontSize: 48, fontWeight: 900,
                fontFamily: 'sans-serif', textAlign: 'center',
              }}>
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
