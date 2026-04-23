import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  DEFAULT_LEBANON_CALLOUTS,
  DEFAULT_LEBANON_LEGEND,
  DEFAULT_LEBANON_OUTLINE_PATH,
  DEFAULT_LEBANON_REGIONS,
  getLegendItems,
  LegendPanel,
  MapCallout,
  MapLegendItem,
  MapRegion,
  RegionMapCanvas,
} from './mapTemplateUtils';

interface Props {
  title?: string;
  subtitle?: string;
  legendTitle?: string;
  mapLabel?: string;
  note?: string;
  outlinePath?: string;
  regions?: MapRegion[];
  legendItems?: MapLegendItem[];
  callouts?: MapCallout[];
  backgroundImage?: string;
  accentColor?: string;
}

export const GeoPoliticalMap: React.FC<Props> = ({
  title = '国内の主な勢力分布',
  subtitle = '地域ごとの色分けと補足説明を同時に表示',
  legendTitle = '主要勢力',
  mapLabel = 'レバノン',
  note = '宗派・勢力・経済圏などの地図テンプレートとしてそのまま流用できます。',
  outlinePath = DEFAULT_LEBANON_OUTLINE_PATH,
  regions = DEFAULT_LEBANON_REGIONS,
  legendItems,
  callouts = DEFAULT_LEBANON_CALLOUTS,
  backgroundImage,
  accentColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolvedLegend = getLegendItems(regions, legendItems ?? DEFAULT_LEBANON_LEGEND);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#e7d2a9',
        display: 'flex',
        flexDirection: 'column',
        padding: '30px 30px 28px',
        boxSizing: 'border-box',
        gap: 18,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 18,
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              color: '#2b241d',
              fontSize: 54,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              letterSpacing: '-0.05em',
              lineHeight: 1.02,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: 'rgba(43,36,29,0.72)',
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'sans-serif',
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderRadius: 20,
            background: 'rgba(255,248,236,0.82)',
            boxShadow: '0 18px 30px rgba(48,35,21,0.10)',
            minWidth: 240,
          }}
        >
          <div
            style={{
              color: 'rgba(43,36,29,0.64)',
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'sans-serif',
            }}
          >
            注目ポイント
          </div>
          <div
            style={{
              color: accentColor,
              fontSize: 30,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              marginTop: 2,
            }}
          >
            色・模様・注釈を同時表示
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          flex: 1,
          borderRadius: 34,
          overflow: 'hidden',
          background: 'rgba(255,244,224,0.56)',
          boxShadow: 'inset 0 0 0 1px rgba(68,55,38,0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.08) 26%, transparent 32%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: 28,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 4,
            opacity: interpolate(frame, [8, 22], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <LegendPanel title={legendTitle} items={resolvedLegend} note={note} />
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            left: 260,
            padding: '14px 18px 14px 0',
            boxSizing: 'border-box',
          }}
        >
          <RegionMapCanvas
            frame={frame}
            fps={fps}
            outlinePath={outlinePath}
            regions={regions}
            callouts={callouts}
            backgroundImage={backgroundImage}
            mapLabel={mapLabel}
            accentColor={accentColor}
          />
        </div>
      </div>
    </div>
  );
};
