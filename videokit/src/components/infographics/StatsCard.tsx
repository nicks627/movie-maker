import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface Stat {
  icon: string;
  label: string;
  value: string;
  color: string;
}

interface Props {
  title: string;
  stats: Stat[];
}

export const StatsCard: React.FC<Props> = ({ title, stats }) => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 60px',
      boxSizing: 'border-box',
      gap: 32,
    }}>
      <div style={{
        color: 'white', fontSize: 64, fontWeight: 900,
        fontFamily: 'sans-serif', letterSpacing: '0.15em',
        opacity: titleOpacity,
        borderBottom: '3px solid #38bdf8',
        paddingBottom: 12,
      }}>
        {title}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'row',
        justifyContent: 'space-around', alignItems: 'stretch',
        width: '100%', gap: 12,
      }}>
        {stats.map((stat, i) => {
          const opacity = interpolate(frame, [i * 8 + 8, i * 8 + 22], [0, 1], { extrapolateRight: 'clamp' });
          const translateY = interpolate(frame, [i * 8 + 8, i * 8 + 22], [20, 0], { extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8,
              opacity,
              transform: `translateY(${translateY}px)`,
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
              padding: '0 16px',
            }}>
              <div style={{ fontSize: 40 }}>{stat.icon}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 44, fontWeight: 700, fontFamily: 'sans-serif' }}>
                {stat.label}
              </div>
              <div style={{ color: stat.color, fontSize: 62, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1.1 }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
