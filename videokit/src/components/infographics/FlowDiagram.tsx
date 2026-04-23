import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface Step {
  label: string;
  sub?: string;
  highlight?: boolean;
}

interface Props {
  title: string;
  steps: Step[];
  accent?: string;
}

export const FlowDiagram: React.FC<Props> = ({ title, steps, accent = '#38bdf8' }) => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 48px',
      boxSizing: 'border-box',
      gap: 24,
    }}>
      <div style={{
        color: 'white', fontSize: 60, fontWeight: 900,
        fontFamily: 'sans-serif', opacity: titleOpacity,
        textAlign: 'center',
      }}>
        {title}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center',
        width: '100%', gap: 0,
      }}>
        {steps.map((step, i) => {
          const delay = i * 8;
          const opacity = interpolate(frame, [delay + 5, delay + 18], [0, 1], { extrapolateRight: 'clamp' });
          const scale = interpolate(frame, [delay + 5, delay + 18], [0.7, 1], { extrapolateRight: 'clamp' });

          return (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: step.highlight ? `${accent}22` : 'rgba(255,255,255,0.06)',
                border: `3px solid ${step.highlight ? accent : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 16,
                padding: '16px 20px',
                minWidth: 180,
                gap: 6,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: step.highlight ? `0 0 24px ${accent}44` : 'none',
              }}>
                <div style={{
                  color: step.highlight ? accent : 'white',
                  fontSize: 46,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {step.label}
                </div>
                {step.sub && (
                  <div style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 34,
                    fontFamily: 'sans-serif',
                    textAlign: 'center',
                  }}>
                    {step.sub}
                  </div>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  color: accent,
                  fontSize: 36,
                  fontWeight: 900,
                  padding: '0 8px',
                  opacity: interpolate(frame, [(i + 0.5) * 8 + 5, (i + 0.5) * 8 + 18], [0, 1], { extrapolateRight: 'clamp' }),
                }}>
                  ▶
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
