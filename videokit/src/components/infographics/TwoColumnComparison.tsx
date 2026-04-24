import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

interface Column {
  title: string;
  titleColor: string;
  items: string[];
  arrows?: boolean;
  highlight?: boolean;
}

interface Props {
  left: Column;
  right: Column;
  tagline?: string;
}

export const TwoColumnComparison: React.FC<Props> = ({ left, right, tagline }) => {
  const frame = useCurrentFrame();
  const containerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const renderColumn = (col: Column, side: 'left' | 'right') => {
    const delay = side === 'left' ? 0 : 8;
    return (
      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'stretch', gap: 10,
        opacity: interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        <div style={{
          color: col.titleColor,
          fontSize: 34,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          lineHeight: 1.08,
          borderBottom: `2px solid ${col.titleColor}`,
          paddingBottom: 6,
          width: '100%',
        }}>
          {col.title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, width: '100%' }}>
          {col.items.map((item, i) => (
            <React.Fragment key={i}>
              <div style={{
                background: col.highlight ? `${col.titleColor}22` : 'rgba(255,255,255,0.07)',
                border: `2px solid ${col.highlight ? col.titleColor : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 10,
                padding: '10px 12px',
                color: 'white',
                fontSize: 28,
                fontWeight: 800,
                fontFamily: 'sans-serif',
                textAlign: 'center',
                width: '100%',
                boxSizing: 'border-box' as const,
                lineHeight: 1.18,
              }}>
                {item}
              </div>
              {i < col.items.length - 1 && col.arrows && (
                <div style={{ color: col.titleColor, fontSize: 20, fontWeight: 900, textAlign: 'center' }}>▼</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#020617',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '18px 20px 22px',
      boxSizing: 'border-box',
      gap: 10,
      opacity: containerOpacity,
    }}>
      <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: 0, flex: 1, alignItems: 'center' }}>
        {renderColumn(left, 'left')}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', alignSelf: 'stretch', margin: '0 8px' }} />
        {renderColumn(right, 'right')}
      </div>
      {tagline && (
        <div style={{
          color: '#facc15', fontSize: 24, fontWeight: 800,
          fontFamily: 'sans-serif', textAlign: 'center',
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
          lineHeight: 1.18,
        }}>
          {tagline}
        </div>
      )}
    </div>
  );
};
