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
      alignItems: 'stretch', justifyContent: 'center',
      padding: '22px 26px',
      boxSizing: 'border-box',
      gap: 14,
    }}>
      <div style={{
        color: 'white', fontSize: 42, fontWeight: 900,
        fontFamily: 'sans-serif', opacity: titleOpacity,
        textAlign: 'center',
        lineHeight: 1.08,
      }}>
        {title}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'stretch', justifyContent: 'center',
        width: '100%', gap: 6,
      }}>
        {steps.map((step, i) => {
          const delay = i * 8;
          const opacity = interpolate(frame, [delay + 5, delay + 18], [0, 1], { extrapolateRight: 'clamp' });
          const scale = interpolate(frame, [delay + 5, delay + 18], [0.7, 1], { extrapolateRight: 'clamp' });

          return (
            <React.Fragment key={i}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr',
                alignItems: 'center',
                background: step.highlight ? `${accent}22` : 'rgba(255,255,255,0.06)',
                border: `2px solid ${step.highlight ? accent : 'rgba(255,255,255,0.2)'}`,
                borderRadius: 16,
                padding: '12px 14px',
                gap: 12,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: step.highlight ? `0 0 24px ${accent}44` : 'none',
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: step.highlight ? `${accent}28` : 'rgba(255,255,255,0.08)',
                  color: step.highlight ? accent : 'white',
                  fontSize: 22,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                  textAlign: 'center',
                  lineHeight: '40px',
                }}>
                  {i + 1}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{
                    color: step.highlight ? accent : 'white',
                    fontSize: 28,
                    fontWeight: 900,
                    fontFamily: 'sans-serif',
                    lineHeight: 1.14,
                  }}>
                    {step.label}
                  </div>
                  {step.sub && (
                    <div style={{
                      color: 'rgba(255,255,255,0.68)',
                      fontSize: 20,
                      fontFamily: 'sans-serif',
                      lineHeight: 1.16,
                    }}>
                      {step.sub}
                    </div>
                  )}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  width: 4,
                  height: 14,
                  borderRadius: 999,
                  background: `${accent}88`,
                  alignSelf: 'center',
                  opacity: interpolate(frame, [(i + 0.5) * 8 + 5, (i + 0.5) * 8 + 18], [0, 1], { extrapolateRight: 'clamp' }),
                }}>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
