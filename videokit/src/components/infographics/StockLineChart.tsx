import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type ChartPoint = {
  label: string;
  value: number;
};

type Highlight = {
  index: number;
  label: string;
  tone?: 'bull' | 'bear' | 'neutral';
};

interface Props {
  title: string;
  symbol?: string;
  timeframe?: string;
  points: ChartPoint[];
  benchmark?: {
    name: string;
    color?: string;
    points: ChartPoint[];
  };
  highlights?: Highlight[];
  prefix?: string;
  suffix?: string;
  decimals?: number;
  note?: string;
  positiveColor?: string;
  negativeColor?: string;
}

const formatNumber = (
  value: number,
  prefix = '',
  suffix = '',
  decimals = 0,
) => `${prefix}${value.toFixed(decimals)}${suffix}`;

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  if (!points.length) {
    return '';
  }
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
};

const buildAreaPath = (points: Array<{ x: number; y: number }>, floorY: number) => {
  if (!points.length) {
    return '';
  }

  const line = buildLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${floorY} L ${first.x} ${floorY} Z`;
};

export const StockLineChart: React.FC<Props> = ({
  title,
  symbol,
  timeframe,
  points,
  benchmark,
  highlights = [],
  prefix = '',
  suffix = '',
  decimals = 0,
  note,
  positiveColor = '#22c55e',
  negativeColor = '#ef4444',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!points.length) {
    return null;
  }

  const allValues = [
    ...points.map((point) => point.value),
    ...(benchmark?.points ?? []).map((point) => point.value),
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(1, maxValue - minValue);
  const paddedMin = minValue - range * 0.15;
  const paddedMax = maxValue + range * 0.15;
  const plotLeft = 120;
  const plotRight = 930;
  const plotTop = 150;
  const plotBottom = 540;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const pointGap = points.length > 1 ? plotWidth / (points.length - 1) : plotWidth;

  const primarySeries = points.map((point, index) => ({
    ...point,
    x: plotLeft + index * pointGap,
    y: plotBottom - ((point.value - paddedMin) / (paddedMax - paddedMin)) * plotHeight,
  }));
  const benchmarkSeries = benchmark?.points?.length
    ? benchmark.points.map((point, index) => ({
        ...point,
        x: plotLeft + index * pointGap,
        y: plotBottom - ((point.value - paddedMin) / (paddedMax - paddedMin)) * plotHeight,
      }))
    : null;
  const benchmarkColor = benchmark?.color ?? '#a78bfa';
  const benchmarkName = benchmark?.name ?? 'Benchmark';

  const firstValue = points[0].value;
  const lastValue = points[points.length - 1].value;
  const delta = lastValue - firstValue;
  const deltaPct = firstValue === 0 ? 0 : (delta / firstValue) * 100;
  const lineColor = delta >= 0 ? positiveColor : negativeColor;
  const lineProgress = spring({
    frame,
    fps,
    config: {
      damping: 20,
      mass: 0.9,
    },
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
        gap: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ color: 'white', fontSize: 58, fontWeight: 900, fontFamily: 'sans-serif', letterSpacing: '-0.04em' }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {symbol ? (
              <div
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'rgba(56,189,248,0.16)',
                  color: '#7dd3fc',
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                }}
              >
                {symbol}
              </div>
            ) : null}
            {timeframe ? (
              <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' }}>
                {timeframe}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            minWidth: 260,
            padding: '14px 18px',
            borderRadius: 24,
            background: 'rgba(15,23,42,0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 32px rgba(2,6,23,0.28)',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
            Latest
          </div>
          <div style={{ color: 'white', fontSize: 44, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1.05 }}>
            {formatNumber(lastValue, prefix, suffix, decimals)}
          </div>
          <div style={{ color: lineColor, fontSize: 24, fontWeight: 900, fontFamily: 'sans-serif', marginTop: 4 }}>
            {delta >= 0 ? '+' : ''}{formatNumber(delta, prefix, suffix, decimals)} ({deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1000 640" style={{ width: '100%', flex: 1, overflow: 'visible' }}>
        <defs>
          <linearGradient id="stock-line-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((tick) => {
          const y = plotTop + (plotHeight / 4) * tick;
          const value = paddedMax - ((paddedMax - paddedMin) / 4) * tick;
          return (
            <g key={tick}>
              <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="rgba(148,163,184,0.16)" strokeWidth="1" />
              <text
                x={plotLeft - 18}
                y={y + 8}
                textAnchor="end"
                fill="rgba(255,255,255,0.48)"
                style={{ fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}
              >
                {formatNumber(value, prefix, suffix, decimals)}
              </text>
            </g>
          );
        })}

        {benchmarkSeries?.length ? (
          <path
            d={buildLinePath(benchmarkSeries)}
            fill="none"
            stroke={benchmarkColor}
            strokeWidth="5"
            strokeDasharray="1"
            strokeDashoffset={1 - lineProgress}
            pathLength={1}
            opacity={0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        <path
          d={buildAreaPath(primarySeries, plotBottom)}
          fill="url(#stock-line-area)"
          opacity={lineProgress}
        />

        <path
          d={buildLinePath(primarySeries)}
          fill="none"
          stroke={lineColor}
          strokeWidth="8"
          strokeDasharray="1"
          strokeDashoffset={1 - lineProgress}
          pathLength={1}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 18px ${lineColor}66)` }}
        />

        {primarySeries.map((point, index) => {
          const pointReveal = spring({
            frame: Math.max(0, frame - 10 - index * 3),
            fps,
            config: { damping: 18 },
          });
          return (
            <g key={point.label} opacity={pointReveal}>
              <circle cx={point.x} cy={point.y} r={10} fill={lineColor} />
              <circle cx={point.x} cy={point.y} r={19} fill="transparent" stroke={`${lineColor}66`} strokeWidth="2" />
              <text
                x={point.x}
                y={plotBottom + 42}
                textAnchor="middle"
                fill="rgba(255,255,255,0.64)"
                style={{ fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}
              >
                {point.label}
              </text>
            </g>
          );
        })}

        {highlights.map((highlight, index) => {
          const point = primarySeries[highlight.index];
          if (!point) {
            return null;
          }

          const color =
            highlight.tone === 'bear'
              ? '#f87171'
              : highlight.tone === 'bull'
                ? '#4ade80'
                : '#facc15';

          return (
            <g
              key={`${highlight.label}-${index}`}
              opacity={interpolate(frame, [26 + index * 5, 36 + index * 5], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })}
            >
              <line x1={point.x} y1={point.y - 14} x2={point.x} y2={point.y - 92} stroke={color} strokeWidth="3" strokeDasharray="6 6" />
              <rect x={point.x - 92} y={point.y - 142} width="184" height="40" rx="18" fill="rgba(15,23,42,0.88)" stroke={color} strokeWidth="2" />
              <text
                x={point.x}
                y={point.y - 116}
                textAnchor="middle"
                fill={color}
                style={{ fontSize: 20, fontWeight: 900, fontFamily: 'sans-serif' }}
              >
                {highlight.label}
              </text>
            </g>
          );
        })}

        {benchmarkSeries?.length ? (
          <g opacity={interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <rect x="676" y="64" width="234" height="58" rx="18" fill="rgba(15,23,42,0.82)" />
            <circle cx="708" cy="93" r="8" fill={benchmarkColor} />
            <text x="726" y="101" fill="rgba(255,255,255,0.76)" style={{ fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif' }}>
              {benchmarkName}
            </text>
          </g>
        ) : null}
      </svg>

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
