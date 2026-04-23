import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface Bar {
  label: string;
  value: number;
  color: string;
  valueLabel?: string;
}

interface Props {
  title: string;
  bars: Bar[];
  unit?: string;
  tagline?: string;
}

export const BarChart: React.FC<Props> = ({ title, bars, unit = '', tagline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const maxValue = Math.max(...bars.map(b => b.value));

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      padding: '32px 56px',
      boxSizing: 'border-box',
      gap: 20,
    }}>
      <div style={{
        color: 'white', fontSize: 60, fontWeight: 900,
        fontFamily: 'sans-serif', textAlign: 'center',
        opacity: titleOpacity,
      }}>
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
        {bars.map((bar, i) => {
          const barSpring = spring({ frame: frame - i * 5, fps, config: { damping: 20 } });
          const barWidth = interpolate(barSpring, [0, 1], [0, (bar.value / maxValue) * 100]);
          const labelOpacity = interpolate(frame, [i * 5, i * 5 + 12], [0, 1], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, opacity: labelOpacity }}>
              <div style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 44,
                fontWeight: 800,
                fontFamily: 'sans-serif',
                width: 220,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {bar.label}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 52, position: 'relative' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  background: bar.color,
                  borderRadius: 8,
                  boxShadow: bar.color === '#38bdf8' ? `0 0 20px ${bar.color}66` : 'none',
                  transition: 'none',
                }} />
              </div>
              <div style={{
                color: bar.color,
                fontSize: 44,
                fontWeight: 900,
                fontFamily: 'sans-serif',
                width: 140,
                flexShrink: 0,
              }}>
                {bar.valueLabel ?? `${bar.value}${unit}`}
              </div>
            </div>
          );
        })}
      </div>

      {tagline && (
        <div style={{
          color: '#facc15', fontSize: 44, fontWeight: 800,
          fontFamily: 'sans-serif', textAlign: 'center',
          opacity: interpolate(frame, [25, 38], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {tagline}
        </div>
      )}
    </div>
  );
};
