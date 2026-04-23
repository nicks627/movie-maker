import React from 'react';
import { Img, interpolate, spring, staticFile } from 'remotion';

export type MapRegionPattern = 'solid' | 'stripe' | 'dot';

export interface MapRegion {
  label: string;
  path: string;
  color: string;
  secondaryColor?: string;
  pattern?: MapRegionPattern;
  description?: string;
}

export interface MapLegendItem {
  label: string;
  color: string;
  secondaryColor?: string;
  pattern?: MapRegionPattern;
  description?: string;
}

export interface MapCallout {
  label: string;
  description?: string;
  x: number;
  y: number;
  color?: string;
  align?: 'left' | 'right';
}

export const DEFAULT_LEBANON_OUTLINE_PATH =
  'M708 54 C734 62 752 90 757 128 C761 166 750 208 760 248 C773 304 758 352 747 396 C737 434 744 478 735 526 C728 564 706 594 681 588 C652 581 642 542 635 504 C627 462 607 426 597 382 C586 334 588 290 598 248 C607 210 621 176 627 136 C634 96 652 66 681 56 C691 52 701 51 708 54 Z';

export const DEFAULT_LEBANON_REGIONS: MapRegion[] = [
  {
    label: 'イスラム教シーア派',
    color: '#4d9f7f',
    path: 'M672 166 C708 174 736 207 735 251 C734 294 706 334 671 355 C637 374 612 360 602 325 C592 288 603 246 625 213 C639 191 651 173 672 166 Z',
  },
  {
    label: 'イスラム教スンナ派',
    color: '#245d42',
    path: 'M680 82 C712 94 731 119 731 151 C731 178 712 201 684 202 C660 203 644 188 638 165 C632 136 641 108 660 92 C666 87 673 83 680 82 Z',
  },
  {
    label: 'イスラム系ドルーズ派',
    color: '#a16c67',
    path: 'M628 320 C655 319 680 336 685 362 C691 388 673 412 642 420 C620 425 602 413 598 394 C592 366 603 339 628 320 Z',
  },
  {
    label: 'キリスト教マロン派',
    color: '#d1aa1b',
    path: 'M628 188 C657 196 674 220 671 246 C668 268 649 286 624 289 C606 291 593 282 587 267 C580 250 583 226 595 209 C603 198 614 190 628 188 Z',
  },
  {
    label: 'その他キリスト教系',
    color: '#a08d26',
    secondaryColor: '#d7b23a',
    pattern: 'stripe',
    path: 'M681 120 C708 126 724 143 725 164 C726 181 713 194 695 196 C675 198 659 190 651 176 C645 165 644 150 649 139 C654 128 665 120 681 120 Z',
  },
  {
    label: 'その他キリスト教系',
    color: '#a08d26',
    secondaryColor: '#d7b23a',
    pattern: 'stripe',
    path: 'M649 420 C680 426 707 446 713 478 C719 510 705 542 680 554 C659 563 640 548 632 521 C621 488 626 452 649 420 Z',
  },
  {
    label: 'イスラム教スンナ派',
    color: '#2d704d',
    path: 'M661 462 C683 470 696 489 695 514 C694 535 682 553 663 560 C647 566 635 558 629 540 C621 517 625 491 637 474 C643 465 651 460 661 462 Z',
  },
];

export const DEFAULT_LEBANON_LEGEND: MapLegendItem[] = [
  { label: 'イスラム教シーア派', color: '#4d9f7f' },
  { label: 'イスラム教スンナ派', color: '#245d42' },
  { label: 'イスラム系ドルーズ派', color: '#a16c67' },
  { label: 'キリスト教マロン派', color: '#d1aa1b' },
  {
    label: 'その他キリスト教系',
    color: '#a08d26',
    secondaryColor: '#d7b23a',
    pattern: 'stripe',
  },
];

export const DEFAULT_LEBANON_CALLOUTS: MapCallout[] = [
  { label: 'ベイルート', description: '沿岸の政治・経済中心地', x: 620, y: 334, color: '#f8fafc', align: 'left' },
  { label: 'ベカー高原', description: '東部の広い内陸地帯', x: 728, y: 250, color: '#38bdf8', align: 'right' },
  { label: '南部', description: '宗派が複雑に混在', x: 690, y: 510, color: '#facc15', align: 'right' },
];

export const getLegendItems = (
  regions: MapRegion[],
  legendItems?: MapLegendItem[],
): MapLegendItem[] => {
  if (legendItems?.length) {
    return legendItems;
  }

  const deduped = new Map<string, MapLegendItem>();
  regions.forEach((region) => {
    if (!deduped.has(region.label)) {
      deduped.set(region.label, {
        label: region.label,
        color: region.color,
        secondaryColor: region.secondaryColor,
        pattern: region.pattern,
        description: region.description,
      });
    }
  });

  return Array.from(deduped.values());
};

const swatchBackground = (item: MapLegendItem) => {
  if (item.pattern === 'stripe') {
    return `repeating-linear-gradient(135deg, ${item.color} 0 10px, ${item.secondaryColor ?? '#f8fafc'} 10px 18px)`;
  }

  if (item.pattern === 'dot') {
    return `radial-gradient(circle, ${item.secondaryColor ?? '#f8fafc'} 0 18%, transparent 20%), ${item.color}`;
  }

  return item.color;
};

const getRegionFill = (prefix: string, region: MapRegion, index: number) => {
  if (region.pattern === 'stripe') {
    return `url(#${prefix}_stripe_${index})`;
  }

  if (region.pattern === 'dot') {
    return `url(#${prefix}_dot_${index})`;
  }

  return region.color;
};

const PatternDefs: React.FC<{ prefix: string; regions: MapRegion[] }> = ({ prefix, regions }) => {
  return (
    <defs>
      {regions.map((region, index) => {
        if (region.pattern === 'stripe') {
          return (
            <pattern
              key={`${prefix}_stripe_${index}`}
              id={`${prefix}_stripe_${index}`}
              patternUnits="userSpaceOnUse"
              width="18"
              height="18"
              patternTransform="rotate(28)"
            >
              <rect width="18" height="18" fill={region.color} />
              <rect width="7" height="18" fill={region.secondaryColor ?? '#f8fafc'} opacity="0.42" />
            </pattern>
          );
        }

        if (region.pattern === 'dot') {
          return (
            <pattern
              key={`${prefix}_dot_${index}`}
              id={`${prefix}_dot_${index}`}
              patternUnits="userSpaceOnUse"
              width="16"
              height="16"
            >
              <rect width="16" height="16" fill={region.color} />
              <circle cx="8" cy="8" r="3.2" fill={region.secondaryColor ?? '#f8fafc'} opacity="0.38" />
            </pattern>
          );
        }

        return null;
      })}

      <filter id={`${prefix}_shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="rgba(15,23,42,0.36)" />
      </filter>
    </defs>
  );
};

interface RegionMapCanvasProps {
  frame: number;
  fps: number;
  outlinePath?: string;
  regions?: MapRegion[];
  callouts?: MapCallout[];
  backgroundImage?: string;
  mapLabel?: string;
  accentColor?: string;
}

export const RegionMapCanvas: React.FC<RegionMapCanvasProps> = ({
  frame,
  fps,
  outlinePath = DEFAULT_LEBANON_OUTLINE_PATH,
  regions = DEFAULT_LEBANON_REGIONS,
  callouts = DEFAULT_LEBANON_CALLOUTS,
  backgroundImage,
  mapLabel = 'レバノン',
  accentColor = '#38bdf8',
}) => {
  const reveal = spring({
    frame,
    fps,
    config: {
      damping: 18,
      mass: 0.9,
    },
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 28,
        background:
          'linear-gradient(180deg, rgba(239,222,187,0.96) 0%, rgba(231,213,178,0.98) 100%)',
      }}
    >
      {backgroundImage ? (
        <Img
          src={staticFile(backgroundImage)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(0.85) sepia(0.24) contrast(0.95)',
            opacity: 0.42,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 75% 32%, rgba(255,255,255,0.18), transparent 24%), radial-gradient(circle at 20% 72%, rgba(0,0,0,0.06), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.08), transparent 32%)',
          mixBlendMode: 'multiply',
          opacity: 0.9,
        }}
      />

      <svg viewBox="0 0 1000 640" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <PatternDefs prefix="region_map" regions={regions} />
        <path
          d={outlinePath}
          fill="rgba(214,196,161,0.96)"
          stroke="rgba(102,82,55,0.38)"
          strokeWidth="8"
          filter="url(#region_map_shadow)"
        />

        {regions.map((region, index) => {
          const regionOpacity = interpolate(frame, [index * 5 + 6, index * 5 + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <path
              key={`${region.label}_${index}`}
              d={region.path}
              fill={getRegionFill('region_map', region, index)}
              stroke="rgba(68,55,38,0.22)"
              strokeWidth="4"
              opacity={regionOpacity}
              style={{
                transformOrigin: '50% 50%',
                transform: `scale(${0.96 + regionOpacity * 0.04})`,
              }}
            />
          );
        })}

        <path
          d={outlinePath}
          fill="transparent"
          stroke="rgba(255,255,255,0.44)"
          strokeWidth="2.5"
          opacity={0.78}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          right: '17%',
          top: '8%',
          padding: '10px 18px',
          borderRadius: 18,
          background: 'rgba(38,31,23,0.72)',
          color: '#f8fafc',
          fontSize: 34,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: '-0.03em',
          opacity: interpolate(frame, [8, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          boxShadow: '0 14px 28px rgba(30,23,14,0.18)',
        }}
      >
        {mapLabel}
      </div>

      {callouts.map((callout, index) => {
        const calloutOpacity = interpolate(frame, [18 + index * 6, 30 + index * 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const alignRight = callout.align !== 'left';
        const labelLeft = alignRight ? callout.x + 32 : callout.x - 250;

        return (
          <div
            key={`${callout.label}_${index}`}
            style={{
              position: 'absolute',
              left: labelLeft,
              top: callout.y - 16,
              width: 220,
              opacity: calloutOpacity,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: alignRight ? -26 : 226,
                top: 18,
                width: 26,
                height: 2,
                background: callout.color ?? accentColor,
              }}
            />
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 4,
                padding: '10px 14px',
                borderRadius: 16,
                background: 'rgba(38,31,23,0.75)',
                border: `1px solid ${(callout.color ?? accentColor)}66`,
                boxShadow: '0 14px 28px rgba(30,23,14,0.18)',
              }}
            >
              <div
                style={{
                  color: callout.color ?? accentColor,
                  fontSize: 22,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                  lineHeight: 1.1,
                }}
              >
                {callout.label}
              </div>
              {callout.description ? (
                <div
                  style={{
                    color: 'rgba(255,255,255,0.78)',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                    lineHeight: 1.25,
                  }}
                >
                  {callout.description}
                </div>
              ) : null}
            </div>
            <div
              style={{
                position: 'absolute',
                left: alignRight ? -34 : 236,
                top: 14,
                width: 10,
                height: 10,
                borderRadius: '999px',
                background: callout.color ?? accentColor,
                boxShadow: `0 0 16px ${(callout.color ?? accentColor)}aa`,
                transform: `scale(${1 + Math.sin((frame + index * 8) / 7) * 0.12 * reveal})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export const LegendPanel: React.FC<{
  title: string;
  items: MapLegendItem[];
  note?: string;
}> = ({ title, items, note }) => {
  return (
    <div
      style={{
        width: 320,
        padding: '26px 28px',
        borderRadius: 28,
        background: 'rgba(255,247,233,0.92)',
        boxShadow: '0 22px 36px rgba(30,23,14,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div
        style={{
          alignSelf: 'flex-start',
          padding: '14px 20px',
          borderRadius: 20,
          background: 'rgba(38,31,23,0.88)',
          color: 'white',
          fontSize: 28,
          fontWeight: 900,
          fontFamily: 'sans-serif',
          letterSpacing: '-0.03em',
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, index) => (
          <div key={`${item.label}_${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 34,
                height: 34,
                marginTop: 2,
                borderRadius: 6,
                background: swatchBackground(item),
                border: '1px solid rgba(68,55,38,0.16)',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  color: '#2c251d',
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: 'sans-serif',
                  lineHeight: 1.1,
                }}
              >
                {item.label}
              </div>
              {item.description ? (
                <div
                  style={{
                    color: 'rgba(44,37,29,0.68)',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'sans-serif',
                    lineHeight: 1.25,
                  }}
                >
                  {item.description}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {note ? (
        <div
          style={{
            color: 'rgba(44,37,29,0.72)',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1.35,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
};
