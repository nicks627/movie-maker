import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface Props {
  line1: string;
  connector: string;
  line2: string;
  sub?: string;
  accent?: string;
}

export const PosterCard: React.FC<Props> = ({
  line1,
  connector,
  line2,
  sub,
  accent = '#38bdf8',
}) => {
  const frame = useCurrentFrame();

  const line1Opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const connectorOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' });
  const line2Opacity = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' });
  const subOpacity = interpolate(frame, [24, 36], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 60px',
      boxSizing: 'border-box',
      gap: 12,
    }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 }}>
        <div style={{
          color: 'white', fontSize: 100, fontWeight: 900,
          fontFamily: 'sans-serif', opacity: line1Opacity,
        }}>
          {line1}
        </div>
        <div style={{
          color: accent, fontSize: 100, fontWeight: 900,
          fontFamily: 'sans-serif', opacity: connectorOpacity,
        }}>
          {connector}
        </div>
        <div style={{
          color: accent, fontSize: 100, fontWeight: 900,
          fontFamily: 'sans-serif', opacity: line2Opacity,
        }}>
          {line2}
        </div>
      </div>

      {sub && (
        <div style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 52,
          fontFamily: 'sans-serif',
          fontWeight: 700,
          textAlign: 'center',
          opacity: subOpacity,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
};
