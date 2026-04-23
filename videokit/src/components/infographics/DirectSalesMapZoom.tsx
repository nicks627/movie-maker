import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const regions = [
  { id: 'hokkaido', x: 74, y: 10, width: 16, height: 10, rotate: -10 },
  { id: 'tohoku', x: 66, y: 24, width: 12, height: 18, rotate: 8 },
  { id: 'kanto', x: 61, y: 44, width: 14, height: 14, rotate: -8, focus: true },
  { id: 'chubu', x: 49, y: 48, width: 16, height: 12, rotate: 6 },
  { id: 'kansai', x: 41, y: 56, width: 12, height: 11, rotate: -4 },
  { id: 'chugoku', x: 31, y: 58, width: 12, height: 10, rotate: -12 },
  { id: 'shikoku', x: 38, y: 69, width: 10, height: 7, rotate: -6 },
  { id: 'kyushu', x: 20, y: 66, width: 15, height: 12, rotate: -15 },
];

const nodes = [
  { name: '本社営業', x: 68, y: 49, emphasis: true },
  { name: '仙台', x: 64, y: 33 },
  { name: '名古屋', x: 53, y: 56 },
  { name: '大阪', x: 44, y: 61 },
  { name: '広島', x: 34, y: 62 },
  { name: '福岡', x: 24, y: 69 },
];

const lineLength = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const DirectSalesMapZoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 16,
      mass: 0.9,
    },
  });
  const zoomProgress = spring({
    frame: Math.max(0, frame - 22),
    fps,
    config: {
      damping: 20,
      mass: 0.9,
    },
  });

  const mapScale = interpolate(zoomProgress, [0, 1], [1, 1.38]);
  const mapTranslateX = interpolate(zoomProgress, [0, 1], [0, -12]);
  const mapTranslateY = interpolate(zoomProgress, [0, 1], [0, -9]);

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
        gap: 18,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div>
          <div
            style={{
              color: 'white',
              fontSize: 62,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              letterSpacing: '-0.04em',
            }}
          >
            全国へ直販できる営業網
          </div>
          <div
            style={{
              color: '#38bdf8',
              fontSize: 34,
              fontWeight: 800,
              fontFamily: 'sans-serif',
              marginTop: 6,
            }}
          >
            代理店を挟まず、そのまま顧客へ届く
          </div>
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderRadius: 20,
            background: 'rgba(8,47,73,0.75)',
            border: '1px solid rgba(56,189,248,0.35)',
            boxShadow: '0 12px 34px rgba(56,189,248,0.14)',
          }}
        >
          <div style={{ color: '#38bdf8', fontSize: 22, fontWeight: 900, fontFamily: 'sans-serif' }}>
            中間マージン
          </div>
          <div style={{ color: 'white', fontSize: 46, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1.05 }}>
            0
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          borderRadius: 28,
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 70% 28%, rgba(56,189,248,0.18), transparent 26%), linear-gradient(180deg, rgba(8,47,73,0.55) 0%, rgba(2,6,23,0.96) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            opacity: 0.38,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${mapTranslateX}%, ${mapTranslateY}%) scale(${mapScale})`,
            transformOrigin: '60% 46%',
          }}
        >
          {regions.map((region, index) => {
            const opacity = interpolate(frame, [index * 4 + 4, index * 4 + 16], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={region.id}
                style={{
                  position: 'absolute',
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  transform: `rotate(${region.rotate}deg)`,
                  borderRadius: 28,
                  border: `2px solid ${region.focus ? 'rgba(56,189,248,0.95)' : 'rgba(125,211,252,0.38)'}`,
                  background: region.focus ? 'rgba(56,189,248,0.15)' : 'rgba(15,23,42,0.55)',
                  boxShadow: region.focus ? '0 0 34px rgba(56,189,248,0.35)' : 'none',
                  opacity,
                }}
              />
            );
          })}

          <svg
            viewBox="0 0 100 100"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible',
            }}
          >
            {nodes.slice(1).map((node, index) => {
              const pathProgress = spring({
                frame: Math.max(0, frame - 12 - index * 5),
                fps,
                config: { damping: 18 },
              });
              const dash = lineLength(nodes[0].x, nodes[0].y, node.x, node.y);
              return (
                <line
                  key={node.name}
                  x1={nodes[0].x}
                  y1={nodes[0].y}
                  x2={node.x}
                  y2={node.y}
                  stroke="rgba(56,189,248,0.88)"
                  strokeWidth={1.1}
                  strokeDasharray={dash}
                  strokeDashoffset={dash * (1 - pathProgress)}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {nodes.map((node, index) => {
            const opacity = interpolate(frame, [14 + index * 4, 24 + index * 4], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const pulse = 1 + Math.sin((frame + index * 5) / 5) * 0.12;
            return (
              <div
                key={node.name}
                style={{
                  position: 'absolute',
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: 'translate(-50%, -50%)',
                  opacity,
                }}
              >
                <div
                  style={{
                    width: node.emphasis ? 26 : 18,
                    height: node.emphasis ? 26 : 18,
                    borderRadius: '999px',
                    background: node.emphasis ? '#38bdf8' : '#f8fafc',
                    boxShadow: node.emphasis
                      ? `0 0 26px rgba(56,189,248,${0.28 + reveal * 0.24})`
                      : `0 0 18px rgba(248,250,252,${0.18 + reveal * 0.12})`,
                    transform: `scale(${pulse})`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: node.emphasis ? 30 : 24,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    color: node.emphasis ? '#38bdf8' : 'white',
                    fontSize: node.emphasis ? 24 : 20,
                    fontWeight: 800,
                    fontFamily: 'sans-serif',
                    background: 'rgba(2,6,23,0.72)',
                    padding: '4px 8px',
                    borderRadius: 999,
                  }}
                >
                  {node.name}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 28,
            bottom: 24,
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(15,23,42,0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: interpolate(frame, [28, 40], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div style={{ color: '#facc15', fontSize: 20, fontWeight: 900, fontFamily: 'sans-serif' }}>
            全国の顧客へ
          </div>
          <div style={{ color: 'white', fontSize: 30, fontWeight: 900, fontFamily: 'sans-serif' }}>
            自社営業が直接アプローチ
          </div>
        </div>
      </div>
    </div>
  );
};
