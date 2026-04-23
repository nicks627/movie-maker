import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

type Candle = {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

interface Props {
  title: string;
  symbol?: string;
  candles: Candle[];
  prefix?: string;
  suffix?: string;
  decimals?: number;
  note?: string;
  upColor?: string;
  downColor?: string;
}

const formatNumber = (
  value: number,
  prefix = '',
  suffix = '',
  decimals = 0,
) => `${prefix}${value.toFixed(decimals)}${suffix}`;

export const CandlestickChart: React.FC<Props> = ({
  title,
  symbol,
  candles,
  prefix = '',
  suffix = '',
  decimals = 0,
  note,
  upColor = '#22c55e',
  downColor = '#ef4444',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!candles.length) {
    return null;
  }

  const allValues = candles.flatMap((candle) => [candle.high, candle.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = Math.max(1, maxValue - minValue);
  const paddedMin = minValue - range * 0.12;
  const paddedMax = maxValue + range * 0.12;
  const plotLeft = 120;
  const plotRight = 930;
  const plotTop = 150;
  const plotBottom = 540;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const candleGap = plotWidth / candles.length;
  const bodyWidth = Math.min(44, candleGap * 0.5);
  const latest = candles[candles.length - 1];
  const change = latest.close - candles[0].open;
  const changePct = candles[0].open === 0 ? 0 : (change / candles[0].open) * 100;

  const toY = (value: number) =>
    plotBottom - ((value - paddedMin) / (paddedMax - paddedMin)) * plotHeight;

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
        <div>
          <div style={{ color: 'white', fontSize: 58, fontWeight: 900, fontFamily: 'sans-serif', letterSpacing: '-0.04em' }}>
            {title}
          </div>
          {symbol ? (
            <div style={{ color: '#7dd3fc', fontSize: 26, fontWeight: 900, fontFamily: 'sans-serif', marginTop: 8 }}>
              {symbol}
            </div>
          ) : null}
        </div>
        <div
          style={{
            minWidth: 280,
            padding: '14px 18px',
            borderRadius: 24,
            background: 'rgba(15,23,42,0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
            Close
          </div>
          <div style={{ color: 'white', fontSize: 44, fontWeight: 900, fontFamily: 'sans-serif', lineHeight: 1.05 }}>
            {formatNumber(latest.close, prefix, suffix, decimals)}
          </div>
          <div style={{ color: change >= 0 ? upColor : downColor, fontSize: 24, fontWeight: 900, fontFamily: 'sans-serif', marginTop: 4 }}>
            {change >= 0 ? '+' : ''}{formatNumber(change, prefix, suffix, decimals)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%)
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1000 640" style={{ width: '100%', flex: 1, overflow: 'visible' }}>
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

        {candles.map((candle, index) => {
          const progress = spring({
            frame: Math.max(0, frame - 8 - index * 3),
            fps,
            config: { damping: 20 },
          });
          const x = plotLeft + candleGap * index + candleGap / 2;
          const openY = toY(candle.open);
          const closeY = toY(candle.close);
          const highY = toY(candle.high);
          const lowY = toY(candle.low);
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(8, Math.abs(closeY - openY));
          const color = candle.close >= candle.open ? upColor : downColor;

          return (
            <g key={candle.label} opacity={progress}>
              <line
                x1={x}
                x2={x}
                y1={lowY}
                y2={highY}
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <rect
                x={x - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                rx="8"
                fill={candle.close >= candle.open ? `${upColor}CC` : `${downColor}CC`}
                stroke={color}
                strokeWidth="3"
              />
              <text
                x={x}
                y={plotBottom + 42}
                textAnchor="middle"
                fill="rgba(255,255,255,0.64)"
                style={{ fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif' }}
              >
                {candle.label}
              </text>
            </g>
          );
        })}
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
