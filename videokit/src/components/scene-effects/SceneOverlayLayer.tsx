import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { SceneEffect } from '../../types';
import { LightLeakOverlay } from './LightLeakOverlay';

export const SceneOverlayLayer: React.FC<{
  sceneEffect?: SceneEffect | null;
}> = ({ sceneEffect }) => {
  const frame = useCurrentFrame();
  const overlay = sceneEffect?.overlay;

  if (!overlay || overlay.type === 'none') {
    return null;
  }

  const intensity = overlay.intensity ?? 1;
  const color = overlay.color ?? '#fbbf24';
  const secondaryColor = overlay.secondaryColor ?? '#38bdf8';
  const timecode = `REC ${String(Math.floor(frame / 1800)).padStart(2, '0')}:${String(
    Math.floor((frame / 30) % 60),
  ).padStart(2, '0')}:${String(frame % 30).padStart(2, '0')}`;

  if (overlay.type === 'light-leak') {
    return (
      <LightLeakOverlay
        opacity={0.22 * intensity}
        intensity={0.9 * intensity}
        color={color}
        secondaryColor={secondaryColor}
      />
    );
  }

  if (overlay.type === 'letterbox') {
    const barHeight = 5 + intensity * 2.6;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${barHeight}%`, background: '#000' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${barHeight}%`, background: '#000' }} />
      </AbsoluteFill>
    );
  }

  if (overlay.type === 'archive-frame') {
    const flicker = 0.88 + (Math.sin(frame * 0.2) + 1) * 0.03;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: flicker }}>
        <div style={{ position: 'absolute', inset: '2.2%', border: '2px solid rgba(248,250,252,0.42)', borderRadius: 10 }} />
        <div style={{ position: 'absolute', top: '4%', left: '4%', color: 'rgba(248,250,252,0.78)', fontSize: 20, fontWeight: 800, letterSpacing: '0.16em' }}>
          ARCHIVE
        </div>
        <div style={{ position: 'absolute', top: '4%', right: '4%', color, fontSize: 18, fontWeight: 700, letterSpacing: '0.12em' }}>
          {timecode}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 6px)',
            opacity: 0.24 + intensity * 0.08,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (overlay.type === 'broadcast-hud') {
    const pulse = 0.72 + (Math.sin(frame * 0.05) + 1) * 0.07;
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: '2.4%', border: `1px solid ${secondaryColor}66`, borderRadius: 16, opacity: 0.46 }} />
        <div
          style={{
            position: 'absolute',
            top: '4%',
            left: '4%',
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(2,6,23,0.68)',
            color: secondaryColor,
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '0.12em',
            boxShadow: `0 0 0 1px ${secondaryColor}33`,
          }}
        >
          INFO LAYER
        </div>
        <div
          style={{
            position: 'absolute',
            right: '4%',
            top: '4%',
            width: 18,
            height: 18,
            borderRadius: 999,
            background: color,
            opacity: pulse,
            boxShadow: `0 0 20px ${color}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '4%',
            right: '4%',
            bottom: '5%',
            height: 54,
            borderRadius: 14,
            background: 'linear-gradient(90deg, rgba(2,6,23,0.75), rgba(15,23,42,0.28))',
            boxShadow: `0 0 0 1px ${secondaryColor}22`,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (overlay.type === 'variety-glow') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            left: '-8%',
            top: '-12%',
            width: '42%',
            height: '34%',
            borderRadius: '999px',
            background: `radial-gradient(circle, ${color} 0%, rgba(253,224,71,0.22) 34%, transparent 70%)`,
            filter: 'blur(18px)',
            opacity: 0.42 * intensity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '-10%',
            bottom: '-8%',
            width: '46%',
            height: '38%',
            borderRadius: '999px',
            background: `radial-gradient(circle, ${secondaryColor} 0%, rgba(56,189,248,0.18) 34%, transparent 74%)`,
            filter: 'blur(20px)',
            opacity: 0.34 * intensity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.16) 0 1.2px, transparent 1.2px), radial-gradient(circle at 80% 18%, rgba(255,255,255,0.14) 0 1.2px, transparent 1.2px), radial-gradient(circle at 76% 72%, rgba(255,255,255,0.12) 0 1.4px, transparent 1.4px)',
            opacity: 0.4,
          }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};
