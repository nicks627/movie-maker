import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  DEFAULT_LEBANON_CALLOUTS,
  DEFAULT_LEBANON_OUTLINE_PATH,
  DEFAULT_LEBANON_REGIONS,
  MapCallout,
  MapRegion,
  RegionMapCanvas,
} from './mapTemplateUtils';

interface Props {
  title?: string;
  subtitle?: string;
  locationLabel?: string;
  focusLabel?: string;
  mapLabel?: string;
  note?: string;
  outlinePath?: string;
  regions?: MapRegion[];
  callouts?: MapCallout[];
  backgroundImage?: string;
  accentColor?: string;
  secondaryColor?: string;
}

const StarField: React.FC = () => {
  const stars = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    x: ((index * 37) % 100) + ((index % 3) * 2),
    y: ((index * 19) % 100) + ((index % 5) * 1.4),
    size: 1.6 + (index % 4),
    opacity: 0.3 + (index % 6) * 0.08,
  }));

  return (
    <>
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '999px',
            background: 'white',
            opacity: star.opacity,
            boxShadow: '0 0 12px rgba(255,255,255,0.55)',
          }}
        />
      ))}
    </>
  );
};

export const OrbitalMapZoom: React.FC<Props> = ({
  title = '宇宙から目的地へズーム',
  subtitle = 'Google Earth 風の導入から、そのまま地域説明へ接続',
  locationLabel = 'Middle East',
  focusLabel = 'Lebanon',
  mapLabel = 'レバノン',
  note = '企業の展開地域、紛争地帯、物流拠点、観光地の導入演出として使えます。',
  outlinePath = DEFAULT_LEBANON_OUTLINE_PATH,
  regions = DEFAULT_LEBANON_REGIONS,
  callouts = DEFAULT_LEBANON_CALLOUTS,
  backgroundImage,
  accentColor = '#38bdf8',
  secondaryColor = '#facc15',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introReveal = spring({
    frame,
    fps,
    config: { damping: 20, mass: 0.9 },
  });
  const planetZoom = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 24, mass: 0.95 },
  });
  const planetScale = interpolate(planetZoom, [0, 1], [0.95, 7.6]);
  const planetX = interpolate(planetZoom, [0, 1], [0, -450]);
  const planetY = interpolate(planetZoom, [0, 1], [0, 270]);
  const globeOpacity = interpolate(frame, [0, 56, 80], [1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mapOpacity = interpolate(frame, [52, 82], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mapScale = interpolate(frame, [52, 82], [1.12, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 50% 20%, rgba(29,78,216,0.22), transparent 26%), radial-gradient(circle at 20% 10%, rgba(56,189,248,0.16), transparent 24%), linear-gradient(180deg, #020617 0%, #081327 48%, #0b1730 100%)',
      }}
    >
      <StarField />

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 8,
          opacity: interpolate(frame, [0, 12], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 54,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.05em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: 'rgba(255,255,255,0.72)',
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
          position: 'absolute',
          right: 38,
          top: 34,
          zIndex: 8,
          padding: '14px 18px',
          borderRadius: 22,
          background: 'rgba(8,15,33,0.66)',
          border: '1px solid rgba(125,211,252,0.22)',
          boxShadow: '0 18px 36px rgba(2,6,23,0.28)',
          opacity: interpolate(frame, [8, 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.56)',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'sans-serif',
          }}
        >
          Zoom Target
        </div>
        <div
          style={{
            color: accentColor,
            fontSize: 34,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            marginTop: 2,
          }}
        >
          {focusLabel}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '54%',
          width: 520,
          height: 520,
          marginLeft: -260,
          marginTop: -260,
          transform: `translate(${planetX}px, ${planetY}px) scale(${planetScale})`,
          opacity: globeOpacity,
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            background:
              'radial-gradient(circle at 34% 30%, rgba(255,255,255,0.9) 0%, rgba(145,205,255,0.55) 10%, rgba(15,23,42,0) 24%), radial-gradient(circle at 56% 44%, rgba(34,197,94,0.78) 0%, rgba(22,101,52,0.95) 22%, rgba(20,83,45,0.92) 40%, rgba(8,47,73,1) 78%)',
            boxShadow: '0 0 84px rgba(56,189,248,0.26)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '999px',
              background:
                'radial-gradient(circle at 56% 40%, rgba(250,204,21,0.16), transparent 12%), radial-gradient(circle at 60% 43%, rgba(255,255,255,0.16), transparent 8%), linear-gradient(180deg, rgba(255,255,255,0.14), transparent 34%, rgba(255,255,255,0.06) 72%, rgba(255,255,255,0.18) 100%)',
            }}
          />
          <svg viewBox="0 0 520 520" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <defs>
              <clipPath id="planet_clip">
                <circle cx="260" cy="260" r="258" />
              </clipPath>
            </defs>
            <g clipPath="url(#planet_clip)">
              <path
                d="M60 210 C110 150 185 128 250 138 C320 148 362 182 410 232 C436 258 442 300 418 338 C390 381 328 392 292 378 C252 362 220 328 170 318 C130 309 92 290 70 258 C56 240 52 225 60 210 Z"
                fill="rgba(20,83,45,0.94)"
              />
              <path
                d="M286 162 C332 166 375 188 404 224 C428 252 436 292 426 326 C418 352 394 367 367 362 C338 357 327 334 310 316 C289 294 258 280 244 252 C232 228 236 202 250 186 C258 176 270 168 286 162 Z"
                fill="rgba(34,197,94,0.78)"
              />
              <path
                d="M314 214 C330 214 343 226 343 242 C343 260 330 274 312 274 C295 274 282 260 282 243 C282 228 296 214 314 214 Z"
                fill="rgba(255,255,255,0.20)"
              />
            </g>
          </svg>

          <div
            style={{
              position: 'absolute',
              left: 302,
              top: 224,
              width: 20,
              height: 20,
              borderRadius: '999px',
              background: accentColor,
              boxShadow: `0 0 28px ${accentColor}`,
              transform: `scale(${1 + Math.sin(frame / 6) * 0.12 * introReveal})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 286,
              top: 208,
              width: 52,
              height: 52,
              borderRadius: '999px',
              border: `2px solid ${accentColor}`,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 324,
              top: 182,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(2,6,23,0.78)',
              color: 'white',
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            {locationLabel}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            inset: -40,
            borderRadius: '999px',
            border: `1px solid ${secondaryColor}55`,
            opacity: 0.28,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          opacity: mapOpacity,
          transform: `scale(${mapScale})`,
          transformOrigin: '50% 60%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 24,
            borderRadius: 34,
            overflow: 'hidden',
            background: 'rgba(231,221,198,0.12)',
            boxShadow: '0 24px 48px rgba(2,6,23,0.34)',
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

        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 34,
            padding: '16px 20px',
            borderRadius: 22,
            background: 'rgba(2,6,23,0.72)',
            border: `1px solid ${accentColor}44`,
            boxShadow: '0 18px 40px rgba(2,6,23,0.3)',
          }}
        >
          <div
            style={{
              color: secondaryColor,
              fontSize: 18,
              fontWeight: 900,
              fontFamily: 'sans-serif',
            }}
          >
            Focus
          </div>
          <div
            style={{
              color: 'white',
              fontSize: 32,
              fontWeight: 900,
              fontFamily: 'sans-serif',
              lineHeight: 1.08,
              marginTop: 2,
            }}
          >
            {focusLabel}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.72)',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'sans-serif',
              marginTop: 8,
              maxWidth: 380,
              lineHeight: 1.35,
            }}
          >
            {note}
          </div>
        </div>
      </div>
    </div>
  );
};
