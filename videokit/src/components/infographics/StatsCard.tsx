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
      alignItems: 'stretch', justifyContent: 'center',
      padding: '28px 30px',
      boxSizing: 'border-box',
      gap: 18,
    }}>
      <div style={{
        color: 'white', fontSize: 46, fontWeight: 900,
        fontFamily: 'sans-serif', letterSpacing: '0.04em',
        lineHeight: 1.08,
        textAlign: 'center',
        opacity: titleOpacity,
        borderBottom: '2px solid #38bdf8',
        paddingBottom: 8,
      }}>
        {title}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'stretch',
        width: '100%', gap: 10,
      }}>
        {stats.map((stat, i) => {
          const opacity = interpolate(frame, [i * 8 + 8, i * 8 + 22], [0, 1], { extrapolateRight: 'clamp' });
          const translateY = interpolate(frame, [i * 8 + 8, i * 8 + 22], [20, 0], { extrapolateRight: 'clamp' });
          const valueFontSize = stat.value.length > 8 ? 28 : stat.value.length > 4 ? 34 : 42;
          const labelFontSize = stat.label.length > 9 ? 22 : 24;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'row',
              alignItems: 'center', justifyContent: 'space-between',
              gap: 14,
              opacity,
              transform: `translateY(${translateY}px)`,
              border: `1.5px solid ${stat.color}55`,
              borderRadius: 18,
              padding: '14px 16px',
              background: `${stat.color}14`,
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `${stat.color}22`,
                color: stat.color,
                fontSize: 24,
                fontWeight: 900,
                fontFamily: 'sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div style={{
                minWidth: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                <div style={{
                  color: 'rgba(255,255,255,0.74)',
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  fontFamily: 'sans-serif',
                  lineHeight: 1.14,
                }}>
                  {stat.label}
                </div>
              </div>
              <div style={{
                color: stat.color,
                fontSize: valueFontSize,
                fontWeight: 900,
                fontFamily: 'sans-serif',
                lineHeight: 1.06,
                maxWidth: '48%',
                textAlign: 'right',
              }}>
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
