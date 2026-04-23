import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

export const LightLeakOverlay: React.FC<{
  opacity?: number;
  intensity?: number;
  color?: string;
  secondaryColor?: string;
}> = ({
  opacity = 0.35,
  intensity = 1,
  color = '#ffd27a',
  secondaryColor = '#fb7185',
}) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin(frame * 0.035) * 8 * intensity;
  const driftY = Math.cos(frame * 0.028) * 6 * intensity;
  const rotate = Math.sin(frame * 0.015) * 8 * intensity;
  const pulse = 0.78 + (Math.sin(frame * 0.06) + 1) * 0.12;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '-18%',
          top: '-10%',
          width: '68%',
          height: '88%',
          opacity: opacity * pulse,
          transform: `translate(${driftX}%, ${driftY}%) rotate(${rotate}deg)`,
          background: `radial-gradient(circle at 25% 35%, ${color} 0%, rgba(255,214,122,0.65) 18%, rgba(255,214,122,0.12) 46%, transparent 72%)`,
          filter: 'blur(22px)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-20%',
          bottom: '-14%',
          width: '72%',
          height: '88%',
          opacity: opacity * 0.7,
          transform: `translate(${-driftX * 0.7}%, ${-driftY * 0.55}%) rotate(${-rotate * 0.8}deg)`,
          background: `radial-gradient(circle at 65% 55%, ${secondaryColor} 0%, rgba(251,113,133,0.42) 18%, rgba(251,113,133,0.08) 48%, transparent 74%)`,
          filter: 'blur(30px)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(110deg, rgba(255,255,255,0.06) 0%, transparent 24%, rgba(255,255,255,0.03) 52%, transparent 76%)',
          opacity: opacity * 0.4,
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
