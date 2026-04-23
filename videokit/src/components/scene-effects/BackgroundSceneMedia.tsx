import React from 'react';
import {
  AbsoluteFill,
  Img,
  Video,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Clip, SceneEffect } from '../../types';
import { getSceneReadableZones } from '../popup-layout';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const portraitBackgroundOverrides: Record<string, string> = {
  'assets/images/quant-opening-board.svg': 'assets/images/quant-opening-board-portrait.svg',
  'assets/images/quant-7stage-board.svg': 'assets/images/quant-7stage-board-portrait.svg',
  'assets/images/quant-overfit-board.svg': 'assets/images/quant-overfit-board-portrait.svg',
  'assets/images/quant-metrics-board.svg': 'assets/images/quant-metrics-board-portrait.svg',
  'assets/images/quant-bias-board.svg': 'assets/images/quant-bias-board-portrait.svg',
  'assets/images/quant-risk-board.svg': 'assets/images/quant-risk-board-portrait.svg',
  'assets/images/quant-bionic-board.svg': 'assets/images/quant-bionic-board-portrait.svg',
  'assets/images/sic-opening-board.svg': 'assets/images/sic-opening-board-portrait.svg',
  'assets/images/sic-basics-board.svg': 'assets/images/sic-basics-board-portrait.svg',
  'assets/images/sic-metrics-board.svg': 'assets/images/sic-metrics-board-portrait.svg',
  'assets/images/sic-compare-board.svg': 'assets/images/sic-compare-board-portrait.svg',
  'assets/images/sic-process-board.svg': 'assets/images/sic-process-board-portrait.svg',
  'assets/images/sic-market-board.svg': 'assets/images/sic-market-board-portrait.svg',
  'assets/images/sic-watch-board.svg': 'assets/images/sic-watch-board-portrait.svg',
};

const resolveBackgroundImage = (src: string, isPortrait: boolean) => {
  if (!isPortrait) {
    return src;
  }

  return portraitBackgroundOverrides[src] ?? src;
};

const calcMotionState = (
  frame: number,
  durationInFrames: number,
  sceneEffect?: SceneEffect,
) => {
  const motion = sceneEffect?.cameraMotion;
  const type = motion?.type ?? 'none';
  const intensity = motion?.intensity ?? 1;
  const speed = motion?.speed ?? 1;
  const focusX = motion?.focusX ?? 50;
  const focusY = motion?.focusY ?? 50;
  const progress = clamp01(frame / Math.max(1, durationInFrames - 1));
  const focusOffsetX = (50 - focusX) * 0.12;
  const focusOffsetY = (50 - focusY) * 0.08;
  const slowSine = Math.sin(frame * 0.018 * speed);
  const slowCos = Math.cos(frame * 0.014 * speed);

  let x = focusOffsetX;
  let y = focusOffsetY;
  let scale = 1.08;
  let rotate = 0;

  switch (type) {
    case 'ken-burns':
      x += interpolate(progress, [0, 1], [-2.5 * intensity, 3.5 * intensity]);
      y += interpolate(progress, [0, 1], [1.4 * intensity, -2.2 * intensity]);
      scale += interpolate(progress, [0, 1], [0.02, 0.18 * intensity]);
      break;
    case 'pan-left':
      x += interpolate(progress, [0, 1], [4.8 * intensity, -5.8 * intensity]);
      scale += 0.08;
      break;
    case 'pan-right':
      x += interpolate(progress, [0, 1], [-4.8 * intensity, 5.8 * intensity]);
      scale += 0.08;
      break;
    case 'pan-up':
      y += interpolate(progress, [0, 1], [4 * intensity, -5.2 * intensity]);
      scale += 0.08;
      break;
    case 'pan-down':
      y += interpolate(progress, [0, 1], [-4 * intensity, 5.2 * intensity]);
      scale += 0.08;
      break;
    case 'push-in':
      scale += interpolate(progress, [0, 1], [0.03, 0.22 * intensity]);
      x += slowSine * 0.9 * intensity;
      y += slowCos * 0.7 * intensity;
      break;
    case 'pull-out':
      scale += interpolate(progress, [0, 1], [0.22 * intensity, 0.02]);
      x += slowSine * 0.8 * intensity;
      y += slowCos * 0.6 * intensity;
      break;
    case 'documentary-drift':
      x += interpolate(progress, [0, 1], [-1.5 * intensity, 3.2 * intensity]) + slowSine * 0.8 * intensity;
      y += interpolate(progress, [0, 1], [1.6 * intensity, -1.6 * intensity]) + slowCos * 0.7 * intensity;
      scale += interpolate(progress, [0, 1], [0.05, 0.14 * intensity]);
      rotate = slowSine * 0.45 * intensity;
      break;
    case 'short-punch': {
      const punch = frame <= 14
        ? interpolate(frame, [0, 4, 10, 14], [0.18, 0.3, 0.08, 0.03], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 0.03;
      scale += punch * intensity + progress * 0.05 * intensity;
      x += Math.sin(frame * 0.25) * 0.85 * intensity;
      y += Math.cos(frame * 0.18) * 0.55 * intensity;
      break;
    }
    case 'parallax':
      x += interpolate(progress, [0, 1], [-3.4 * intensity, 4.2 * intensity]);
      y += interpolate(progress, [0, 1], [1.8 * intensity, -1.4 * intensity]);
      scale += 0.12 + progress * 0.08 * intensity;
      break;
    case 'none':
    default:
      x += slowSine * 0.28;
      y += slowCos * 0.22;
      scale += 0.02;
      break;
  }

  return { type, x, y, scale, rotate };
};

export const BackgroundSceneMedia: React.FC<{
  clip: Clip;
  durationInFrames: number;
  sceneEffect?: SceneEffect;
  hasPopup?: boolean;
}> = ({ clip, durationInFrames, sceneEffect, hasPopup }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const motion = sceneEffect?.cameraMotion;
  const parallaxDepth = motion?.parallaxDepth ?? 0.8;
  const { type, x, y, scale, rotate } = calcMotionState(frame, durationInFrames, sceneEffect);
  const isVideo = !!clip.bg_video;
  const isPortrait = height > width;
  const imageSrc = resolveBackgroundImage(clip.bg_image || '', isPortrait);
  const isValidImage = imageSrc && imageSrc !== 'bg.png';
  const effectiveHasPopup = hasPopup ?? !!clip.popupZone;
  const zones = getSceneReadableZones({
    width,
    height,
    visualMode: clip.sceneVisualMode,
    popupZone: clip.popupZone,
    hasPopup: effectiveHasPopup,
  });
  const backgroundStage = zones.backgroundRect;
  const backgroundUsesStage = effectiveHasPopup && !!clip.popupZone && zones.resolvedPopupZone !== 'full';
  
  if (!isVideo && !isValidImage) {
    return <AbsoluteFill style={{ background: '#020617' }} />;
  }

  const hasPortraitLayoutAsset = isPortrait && /-portrait\.(svg|png|jpe?g|webp)$/i.test(imageSrc);
  const isImageOnlyFocus = !isVideo && isValidImage && !effectiveHasPopup;
  const imageTransform = `translate3d(${x * 0.24}%, ${y * 0.2}%, 0) scale(${Math.min(scale, 1.03)}) rotate(${rotate * 0.18}deg)`;
  const portraitImageTransform = `translate3d(${x * 0.12}%, ${y * 0.1}%, 0) scale(${Math.min(scale, 1.04)}) rotate(${rotate * 0.08}deg)`;
  const imageBackdrop = isImageOnlyFocus
    ? 'radial-gradient(circle at 50% 40%, rgba(15,23,42,0.1) 0%, rgba(2,6,23,0.24) 72%, rgba(2,6,23,0.42) 100%)'
    : 'radial-gradient(circle at 50% 42%, rgba(15,23,42,0.2) 0%, rgba(2,6,23,0.46) 78%, rgba(2,6,23,0.68) 100%)';
  const imageOverlay = isImageOnlyFocus
    ? 'linear-gradient(180deg, rgba(2,6,23,0.015) 0%, rgba(2,6,23,0.01) 52%, rgba(2,6,23,0.06) 100%)'
    : 'linear-gradient(180deg, rgba(2,6,23,0.03) 0%, rgba(2,6,23,0.01) 45%, rgba(2,6,23,0.12) 100%)';
  const portraitImageOverlay =
    'linear-gradient(180deg, rgba(2,6,23,0.02) 0%, rgba(2,6,23,0.05) 48%, rgba(2,6,23,0.16) 100%)';
  const videoOverlay =
    'linear-gradient(180deg, rgba(2,6,23,0.1) 0%, rgba(2,6,23,0.03) 45%, rgba(2,6,23,0.22) 100%)';
  const imageSafeArea = backgroundUsesStage
    ? {
        top: `${backgroundStage.top}%`,
        right: `${100 - backgroundStage.right}%`,
        bottom: `${backgroundStage.bottom}%`,
        left: `${backgroundStage.left}%`,
      }
    : isImageOnlyFocus
      ? isPortrait
        ? { top: '1.5%', right: '1.25%', bottom: '21%', left: '1.25%' }
        : { top: '2%', right: '2%', bottom: '18.5%', left: '2%' }
    : isPortrait
      ? { top: '2%', right: '1.5%', bottom: '24%', left: '1.5%' }
      : { top: '4%', right: '4%', bottom: '22%', left: '4%' };
  const videoIntroOpacity = interpolate(frame, [0, 4, 10], [0, 0.74, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stageBackdrop = backgroundUsesStage ? (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: isVideo
          ? 'linear-gradient(180deg, rgba(2,6,23,0.18) 0%, rgba(2,6,23,0.42) 100%)'
          : 'linear-gradient(180deg, rgba(2,6,23,0.12) 0%, rgba(2,6,23,0.34) 100%)',
        pointerEvents: 'none',
      }}
    />
  ) : null;

  const renderAsset = (style: React.CSSProperties, key?: string) => {
    if (clip.bg_video) {
      const { opacity: overrideOpacity, ...restStyle } = style;
      const resolvedOpacity = typeof overrideOpacity === 'number' ? overrideOpacity : 1;
      const sharedStyle: React.CSSProperties = {
        position: 'absolute',
        left: backgroundUsesStage ? `${backgroundStage.left}%` : '-8%',
        top: backgroundUsesStage ? `${backgroundStage.top}%` : '-8%',
        width: backgroundUsesStage ? `${backgroundStage.width}%` : '116%',
        height: backgroundUsesStage ? `${backgroundStage.height}%` : '116%',
        objectFit: 'cover',
        opacity: 0.84 * resolvedOpacity * videoIntroOpacity,
        ...restStyle,
      };
      return (
        <Video
          key={key}
          src={staticFile(clip.bg_video)}
          playbackRate={clip.playbackRate ?? 1}
          trimBefore={clip.bgVideoTrimBefore ?? 0}
          trimAfter={clip.bgVideoTrimAfter}
          style={sharedStyle}
          muted
        />
      );
    }

    if (hasPortraitLayoutAsset) {
      return (
        <Img
          key={key}
          src={staticFile(imageSrc)}
          style={{
            position: 'absolute',
            top: backgroundUsesStage ? `${backgroundStage.top}%` : 0,
            left: backgroundUsesStage ? `${backgroundStage.left}%` : 0,
            width: backgroundUsesStage ? `${backgroundStage.width}%` : '100%',
            height: backgroundUsesStage ? `${backgroundStage.height}%` : '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 1,
            ...style,
          }}
        />
      );
    }

    return (
      <>
        {isPortrait ? (
          <Img
            key={`${key}_backdrop`}
            src={staticFile(imageSrc)}
            style={{
              position: 'absolute',
              left: '-18%',
              top: '-14%',
              width: '136%',
              height: '128%',
              objectFit: 'cover',
              opacity: 0.48,
              filter: 'blur(32px) saturate(0.96)',
              transform: `translate3d(${x * 0.18}%, ${y * 0.12}%, 0) scale(1.12)`,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: imageBackdrop,
          }}
        />
        <Img
          key={key}
          src={staticFile(imageSrc)}
          style={{
            position: 'absolute',
            top: imageSafeArea.top,
            right: imageSafeArea.right,
            bottom: imageSafeArea.bottom,
            left: imageSafeArea.left,
            width: `calc(100% - ${imageSafeArea.left} - ${imageSafeArea.right})`,
            height: `calc(100% - ${imageSafeArea.top} - ${imageSafeArea.bottom})`,
            objectFit: 'contain',
            objectPosition: isImageOnlyFocus ? 'center center' : 'center top',
            opacity: 1,
            ...style,
          }}
        />
      </>
    );
  };

  const baseTransform = isVideo
    ? `translate3d(${x}%, ${y}%, 0) scale(${scale}) rotate(${rotate}deg)`
    : hasPortraitLayoutAsset
      ? portraitImageTransform
      : imageTransform;

  if (type === 'parallax' && isVideo) {
    return (
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        {renderAsset(
          {
            transform: `translate3d(${x * 0.28}%, ${y * 0.22}%, 0) scale(${scale + 0.1 * parallaxDepth})`,
            opacity: 0.35,
            filter: 'blur(24px) saturate(0.84)',
          },
          'bg_back',
        )}
        {renderAsset(
          {
            transform: `translate3d(${x * 0.58}%, ${y * 0.48}%, 0) scale(${scale + 0.05 * parallaxDepth})`,
            opacity: 0.54,
            filter: 'blur(8px) saturate(1.02)',
          },
          'bg_mid',
        )}
        {renderAsset(
          {
            transform: `translate3d(${x}%, ${y}%, 0) scale(${scale}) rotate(${rotate}deg)`,
            opacity: 0.84,
          },
          'bg_front',
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: videoOverlay,
          }}
        />
        {stageBackdrop}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {renderAsset({ transform: baseTransform })}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isVideo ? videoOverlay : hasPortraitLayoutAsset ? portraitImageOverlay : imageOverlay,
        }}
      />
      {stageBackdrop}
    </AbsoluteFill>
  );
};
