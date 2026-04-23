import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type Slice = {
  label: string;
  value: number;
  color: string;
};

interface Props {
  title: string;
  centerLabel?: string;
  centerValue?: string;
  slices: Slice[];
  note?: string;
}

export const AllocationDonutChart: React.FC<Props> = ({
  title,
  centerLabel = 'Portfolio',
  centerValue,
  slices,
  note,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = Math.max(1, slices.reduce((sum, slice) => sum + slice.value, 0));
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 18,
      mass: 0.9,
    },
  });

  let currentAngle = -90;
  const gradients: string[] = [];
  slices.forEach((slice) => {
    const sweep = (slice.value / total) * 360 * reveal;
    gradients.push(`${slice.color} ${currentAngle}deg ${currentAngle + sweep}deg`);
    currentAngle += (slice.value / total) * 360;
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        padding: '34px 42px',
        boxSizing: 'border-box',
        gap: 22,
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: 58,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: '-0.04em',
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 28 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 420,
              height: 420,
              borderRadius: '50%',
              background: `conic-gradient(${gradients.join(', ')})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${0.86 + reveal * 0.14})`,
              boxShadow: '0 24px 48px rgba(2,6,23,0.28)',
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: '#020617',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' }}>
                {centerLabel}
              </div>
              <div style={{ color: 'white', fontSize: 40, fontWeight: 900, fontFamily: 'sans-serif', textAlign: 'center' }}>
                {centerValue ?? `${Math.round(total)}%`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {slices.map((slice, index) => {
            const itemOpacity = interpolate(frame, [10 + index * 4, 20 + index * 4], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const pct = (slice.value / total) * 100;
            return (
              <div
                key={slice.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 22,
                  background: 'rgba(15,23,42,0.76)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: itemOpacity,
                  transform: `translateY(${(1 - itemOpacity) * 12}px)`,
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 999, background: slice.color, flexShrink: 0 }} />
                <div style={{ flex: 1, color: 'white', fontSize: 28, fontWeight: 800, fontFamily: 'sans-serif' }}>
                  {slice.label}
                </div>
                <div style={{ color: slice.color, fontSize: 34, fontWeight: 900, fontFamily: 'sans-serif' }}>
                  {pct.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {note ? (
        <div
          style={{
            color: '#f8fafc',
            fontSize: 24,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            opacity: interpolate(frame, [22, 36], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
};
