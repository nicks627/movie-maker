import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const leftSteps = ['工場', '代理店 ⚠', '顧客'];
const rightSteps = ['工場', '顧客'];

export const DirectSalesComparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const containerOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = (delay: number) =>
    spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: {
        damping: 14,
        mass: 0.8,
      },
    });

  const renderBox = (
    label: string,
    accent: string,
    delay: number,
    background: string,
    width = '82%',
  ) => {
    const progress = reveal(delay);
    return (
      <div
        style={{
          width,
          minHeight: 112,
          borderRadius: 26,
          background,
          color: 'white',
          fontSize: 64,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          letterSpacing: '-0.04em',
          transform: `translateY(${(1 - progress) * 22}px) scale(${0.94 + progress * 0.06})`,
          opacity: progress,
          boxShadow: `0 18px 40px ${accent}26`,
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#020617',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '40px 48px',
        boxSizing: 'border-box',
        opacity: containerOpacity,
        gap: 28,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            color: '#ef4444',
            fontSize: 76,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.04em',
          }}
        >
          一般メーカー
        </div>

        {leftSteps.map((step, index) => (
          <React.Fragment key={step}>
            {renderBox(step, '#ef4444', index * 7, 'rgba(30,41,59,0.96)')}
            {index < leftSteps.length - 1 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  opacity: reveal(8 + index * 7),
                }}
              >
                <div
                  style={{
                    color: '#ef4444',
                    fontSize: 46,
                    fontWeight: 900,
                    fontFamily: 'sans-serif',
                  }}
                >
                  ¥ロス
                </div>
                <div
                  style={{
                    color: '#ef4444',
                    fontSize: 48,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  ▼
                </div>
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          width: 4,
          alignSelf: 'stretch',
          background: 'rgba(255,255,255,0.14)',
          borderRadius: 999,
        }}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <div
          style={{
            color: '#38bdf8',
            fontSize: 76,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.04em',
          }}
        >
          キーエンス
        </div>

        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
          }}
        >
          {renderBox(rightSteps[0], '#38bdf8', 10, 'rgba(12,36,63,0.98)', '30%')}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              minWidth: 220,
              opacity: reveal(16),
            }}
          >
            <div
              style={{
                color: '#38bdf8',
                fontSize: 42,
                fontWeight: 900,
                fontFamily: 'sans-serif',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              直接販売 ✓
            </div>
            <div
              style={{
                position: 'relative',
                width: 190,
                height: 12,
                borderRadius: 999,
                background: '#38bdf8',
                boxShadow: '0 0 24px rgba(56,189,248,0.42)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  top: -10,
                  width: 0,
                  height: 0,
                  borderTop: '16px solid transparent',
                  borderBottom: '16px solid transparent',
                  borderLeft: '26px solid #38bdf8',
                }}
              />
            </div>
          </div>

          {renderBox(rightSteps[1], '#38bdf8', 18, 'rgba(12,36,63,0.98)', '30%')}
        </div>
      </div>
    </div>
  );
};
