import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { z } from 'zod';
import { Subtitle } from './components/Subtitle';
import { getBottomSubtitleText } from './components/subtitle-source';
import { CharacterSkin } from './components/CharacterSkin';
import { getPopupLayoutBox } from './components/popup-layout';
import { getAutoSubtitleSlot, getSubtitleLayoutDefaults } from './components/subtitle-layout';
import { infographicRegistry } from './components/infographics';
import { animationRegistry } from './components/animations';
import { FilmGrain } from './components/animations/FilmGrain';
import { Vignette } from './components/animations/Vignette';
import { ColorGrade } from './components/animations/ColorGrade';
import { calcShakeTransform } from './components/animations/CameraShake';
import {
  BackgroundSceneMedia,
  LightLeakOverlay,
  SceneOverlayLayer,
} from './components/scene-effects';
import { compositionInputSchema } from './script/schema';
import { isLeftSpeaker } from './voice/speakers';
import {
  Clip,
  ClipEffect,
  PopupZone,
  ProjectLongData,
  ProjectScene,
  SceneVisualMode,
  SceneTransition,
  clipsToScenes,
  createClipsFromProjectData,
} from './types';

// infographic + animation を統合したレジストリ
const componentRegistry: Record<string, React.FC<Record<string, unknown>>> = {
  ...infographicRegistry,
  ...animationRegistry,
};

export const FPS = 30;

interface SubtitleAutoLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const hasSceneTransition = (
  transition?: SceneTransition
): transition is SceneTransition => {
  return !!transition && transition.type !== 'none' && transition.duration > 0;
};

const invertDirection = (
  direction: SceneTransition['direction'] = 'left'
): NonNullable<SceneTransition['direction']> => {
  const map: Record<NonNullable<SceneTransition['direction']>, NonNullable<SceneTransition['direction']>> = {
    left: 'right',
    right: 'left',
    up: 'down',
    down: 'up',
  };

  return map[direction];
};

const getDirectionalOffset = (
  direction: SceneTransition['direction'] = 'left',
  distance: number
) => {
  switch (direction) {
    case 'right':
      return { x: distance, y: 0 };
    case 'up':
      return { x: 0, y: -distance };
    case 'down':
      return { x: 0, y: distance };
    case 'left':
    default:
      return { x: -distance, y: 0 };
  }
};

const getWipeClipPath = (
  direction: SceneTransition['direction'] = 'left',
  progress: number
) => {
  const percent = Math.round(clamp01(progress) * 100);

  switch (direction) {
    case 'right':
      return `inset(0 0 0 ${100 - percent}%)`;
    case 'up':
      return `inset(0 0 ${100 - percent}% 0)`;
    case 'down':
      return `inset(${100 - percent}% 0 0 0)`;
    case 'left':
    default:
      return `inset(0 ${100 - percent}% 0 0)`;
  }
};

const getIrisClipPath = (progress: number) => {
  const percent = Math.round(clamp01(progress) * 85);
  return `circle(${percent}% at 50% 50%)`;
};

const getSplitClipPath = (
  direction: SceneTransition['direction'] = 'left',
  progress: number
) => {
  const inset = Math.round((1 - clamp01(progress)) * 50);

  if (direction === 'up' || direction === 'down') {
    return `inset(${inset}% 0 ${inset}% 0)`;
  }

  return `inset(0 ${inset}% 0 ${inset}%)`;
};

const glitchJitter = (frame: number, strength: number) => {
  return Math.sin(frame * 2.7) * strength;
};

const formatCalcOffset = (base: string, percentOffset: number, pxOffset: number) => {
  const percentPart =
    Math.abs(percentOffset) > 0.001
      ? ` ${percentOffset >= 0 ? '+' : '-'} ${Math.abs(percentOffset).toFixed(2)}%`
      : '';
  const pxPart =
    Math.abs(pxOffset) > 0.01
      ? ` ${pxOffset >= 0 ? '+' : '-'} ${Math.abs(pxOffset).toFixed(2)}px`
      : '';

  return `calc(${base}${percentPart}${pxPart})`;
};

const GlitchArtifacts: React.FC<{ intensity: number }> = ({ intensity }) => {
  const alpha = Math.min(0.35, intensity * 0.3);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(transparent 0%, rgba(255,255,255,0.12) 8%, transparent 16%, transparent 58%, rgba(255,255,255,0.1) 66%, transparent 74%)',
          opacity: alpha,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${18 + intensity * 14}%`,
          height: `${5 + intensity * 4}%`,
          background:
            'linear-gradient(90deg, rgba(0,255,255,0.25), rgba(255,0,128,0.15), rgba(255,255,255,0.08))',
          opacity: alpha,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: `${20 + intensity * 10}%`,
          height: `${4 + intensity * 3}%`,
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,0,128,0.2), rgba(0,255,255,0.22))',
          opacity: alpha * 0.9,
          mixBlendMode: 'lighten',
        }}
      />
    </AbsoluteFill>
  );
};

interface TransitionVisualState {
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateDeg: number;
  clipPath?: string;
  filter?: string;
  glitchIntensity: number;
  flashOpacity: number;
  lightLeakOpacity: number;
}

const getSingleClipTransitionState = (
  frame: number,
  durationInFrames: number,
  transition?: SceneTransition
): TransitionVisualState => {
  const state: TransitionVisualState = {
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotateDeg: 0,
    glitchIntensity: 0,
    flashOpacity: 0,
    lightLeakOpacity: 0,
  };

  if (!hasSceneTransition(transition) || durationInFrames <= 0) {
    return state;
  }

  const enterProgress = clamp01(frame / transition.duration);
  const exitProgress = clamp01(
    (frame - Math.max(0, durationInFrames - transition.duration)) / transition.duration
  );
  const filters: string[] = [];

  switch (transition.type) {
    case 'dissolve':
      state.opacity *= enterProgress * (1 - exitProgress);
      break;
    case 'wipe':
      if (exitProgress > 0) {
        state.clipPath = getWipeClipPath(transition.direction, 1 - exitProgress);
      } else {
        state.clipPath = getWipeClipPath(transition.direction, enterProgress);
      }
      break;
    case 'slide':
    case 'push': {
      const enterOffset = getDirectionalOffset(transition.direction, (1 - enterProgress) * 100);
      const exitOffset = getDirectionalOffset(invertDirection(transition.direction), exitProgress * 100);
      state.translateX += enterOffset.x + exitOffset.x;
      state.translateY += enterOffset.y + exitOffset.y;
      state.opacity *= (0.88 + enterProgress * 0.12) * (1 - exitProgress * 0.15);
      break;
    }
    case 'zoom':
      state.scale *= (1.16 - enterProgress * 0.16) * (1 - exitProgress * 0.12);
      state.opacity *= enterProgress * (1 - exitProgress);
      break;
    case 'blur': {
      const blurAmount = Math.max(1 - enterProgress, exitProgress) * 18;
      state.opacity *= (0.2 + enterProgress * 0.8) * (1 - exitProgress * 0.75);
      state.scale *= 1.04 - enterProgress * 0.04;
      filters.push(`blur(${blurAmount}px)`);
      filters.push(`brightness(${1.05 + blurAmount / 60})`);
      break;
    }
    case 'flash': {
      const flashAmount = Math.max(1 - enterProgress, exitProgress);
      state.opacity *= (0.35 + enterProgress * 0.65) * (1 - exitProgress * 0.65);
      state.scale *= 1.02 - enterProgress * 0.02;
      state.flashOpacity = Math.min(0.9, flashAmount * 0.95);
      filters.push(`brightness(${1.1 + flashAmount * 0.45})`);
      filters.push(`saturate(${1.02 + flashAmount * 0.2})`);
      break;
    }
    case 'lightLeak': {
      const leakAmount = Math.max(1 - enterProgress, exitProgress);
      state.opacity *= (0.5 + enterProgress * 0.5) * (1 - exitProgress * 0.35);
      state.scale *= 1.04 - enterProgress * 0.04;
      state.lightLeakOpacity = Math.min(0.9, leakAmount * 0.82);
      filters.push(`brightness(${1.08 + leakAmount * 0.28})`);
      filters.push(`saturate(${1.08 + leakAmount * 0.32})`);
      break;
    }
    case 'iris':
      state.clipPath = exitProgress > 0 ? getIrisClipPath(1 - exitProgress) : getIrisClipPath(enterProgress);
      break;
    case 'split':
      state.clipPath = exitProgress > 0
        ? getSplitClipPath(transition.direction, 1 - exitProgress)
        : getSplitClipPath(transition.direction, enterProgress);
      break;
    case 'whip': {
      const enterOffset = getDirectionalOffset(transition.direction, (1 - enterProgress) * 48);
      const exitOffset = getDirectionalOffset(invertDirection(transition.direction), exitProgress * 48);
      const blurAmount = Math.max(1 - enterProgress, exitProgress) * 26;
      state.translateX += enterOffset.x + exitOffset.x;
      state.translateY += enterOffset.y + exitOffset.y;
      state.scale *= (1.08 - enterProgress * 0.08) * (1 - exitProgress * 0.05);
      state.opacity *= (0.62 + enterProgress * 0.38) * (1 - exitProgress * 0.18);
      filters.push(`blur(${blurAmount}px)`);
      filters.push(`brightness(${1.04 + blurAmount / 90})`);
      break;
    }
    case 'spin':
      state.rotateDeg += (1 - enterProgress) * -16 + exitProgress * 16;
      state.scale *= (0.82 + enterProgress * 0.18) * (1 - exitProgress * 0.08);
      state.opacity *= enterProgress * (1 - exitProgress * 0.55);
      break;
    case 'glitch': {
      const intensity = Math.max(1 - enterProgress, exitProgress);
      const flicker = frame % 2 === 0 ? 1 : 0.7;
      state.translateX += glitchJitter(frame, 1.5 * intensity);
      state.translateY += glitchJitter(frame + 4, 0.7 * intensity);
      state.opacity *= (0.55 + enterProgress * 0.45) * (1 - exitProgress * 0.75) * flicker;
      filters.push(`contrast(${1.2 + intensity * 0.6})`);
      filters.push(`saturate(${1.1 + intensity * 1.0})`);
      filters.push(`hue-rotate(${intensity * 24}deg)`);
      state.glitchIntensity = 0.35 + intensity * 0.65;
      break;
    }
    default:
      break;
  }

  if (filters.length > 0) {
    state.filter = filters.join(' ');
  }

  return state;
};

const VisualTransitionWrapper: React.FC<{
  frame: number;
  durationInFrames: number;
  transition?: SceneTransition;
  children: React.ReactNode;
}> = ({ frame, durationInFrames, transition, children }) => {
  const state = getSingleClipTransitionState(frame, durationInFrames, transition);
  const transform = `translate(${state.translateX}%, ${state.translateY}%) scale(${state.scale}) rotate(${state.rotateDeg}deg)`;

  return (
    <AbsoluteFill
      style={{
        overflow: 'visible',
        opacity: state.opacity,
        clipPath: state.clipPath,
        filter: state.filter,
        transform,
      }}
    >
      {children}
      {state.flashOpacity > 0 ? (
        <AbsoluteFill
          style={{
            opacity: Math.min(0.85, state.flashOpacity),
            backgroundColor: 'rgba(255,255,255,0.94)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {state.lightLeakOpacity > 0 ? (
        <LightLeakOverlay opacity={Math.min(0.72, state.lightLeakOpacity)} intensity={0.95} />
      ) : null}
      {state.glitchIntensity > 0 ? (
        <>
          <AbsoluteFill
            style={{
              opacity: Math.min(0.22, state.glitchIntensity * 0.2),
              mixBlendMode: 'screen',
              transform: `translate(${state.translateX + 1.1}%, ${state.translateY}%) scale(${state.scale})`,
              filter: 'hue-rotate(80deg) saturate(1.6)',
              overflow: 'visible',
            }}
          >
            {children}
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              opacity: Math.min(0.18, state.glitchIntensity * 0.18),
              mixBlendMode: 'lighten',
              transform: `translate(${state.translateX - 1.1}%, ${state.translateY + 0.4}%) scale(${state.scale})`,
              filter: 'hue-rotate(-35deg) saturate(1.4)',
              overflow: 'visible',
            }}
          >
            {children}
          </AbsoluteFill>
          <GlitchArtifacts intensity={state.glitchIntensity} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const BackgroundTransitionLayer: React.FC<{
  clip: Clip;
  nextClip: Clip | null;
  enableTransitions: boolean;
  hasPopup: boolean;
}> = ({ clip, nextClip, enableTransitions, hasPopup }) => {
  const frame = useCurrentFrame();
  const incomingTransition = enableTransitions && hasSceneTransition(clip.transition)
    ? clip.transition
    : null;
  const outgoingTransition = enableTransitions && hasSceneTransition(nextClip?.transition)
    ? nextClip.transition
    : null;
  const outgoingStart = nextClip ? Math.max(0, nextClip.startTime - clip.startTime) : null;

  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  let rotateDeg = 0;
  let clipPath: string | undefined;
  let glitchIntensity = 0;
  let flashOpacity = 0;
  let lightLeakOpacity = 0;
  const filters: string[] = [];
  const motionDuration = outgoingStart !== null && outgoingTransition
    ? Math.max(clip.duration, outgoingStart + outgoingTransition.duration)
    : clip.duration;

  if ((clip.fadeInDuration ?? 0) > 0) {
    opacity *= interpolate(frame, [0, clip.fadeInDuration ?? 0], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  if ((clip.fadeOutDuration ?? 0) > 0) {
    opacity *= interpolate(frame, [clip.duration - (clip.fadeOutDuration ?? 0), clip.duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  if (incomingTransition) {
    const progress = clamp01(frame / incomingTransition.duration);

    switch (incomingTransition.type) {
      case 'dissolve':
        opacity *= progress;
        break;
      case 'wipe':
        clipPath = getWipeClipPath(incomingTransition.direction, progress);
        break;
      case 'slide':
      case 'push': {
        const offset = getDirectionalOffset(
          incomingTransition.direction,
          (1 - progress) * 100
        );
        translateX += offset.x;
        translateY += offset.y;
        opacity *= 0.88 + progress * 0.12;
        break;
      }
      case 'zoom':
        scale *= 1.16 - progress * 0.16;
        opacity *= progress;
        break;
      case 'blur': {
        const blurAmount = (1 - progress) * 22;
        scale *= 1.05 - progress * 0.05;
        opacity *= 0.2 + progress * 0.8;
        filters.push(`blur(${blurAmount}px)`);
        filters.push(`brightness(${1.08 + blurAmount / 70})`);
        break;
      }
      case 'flash': {
        const settle = 1 - progress;
        opacity *= 0.35 + progress * 0.65;
        scale *= 1.02 - progress * 0.02;
        flashOpacity = Math.max(flashOpacity, settle * 0.9);
        filters.push(`brightness(${1.12 + settle * 0.45})`);
        break;
      }
      case 'lightLeak': {
        const settle = 1 - progress;
        opacity *= 0.48 + progress * 0.52;
        scale *= 1.04 - progress * 0.04;
        lightLeakOpacity = Math.max(lightLeakOpacity, settle * 0.82);
        filters.push(`brightness(${1.08 + settle * 0.3})`);
        filters.push(`saturate(${1.08 + settle * 0.34})`);
        break;
      }
      case 'iris':
        clipPath = getIrisClipPath(progress);
        break;
      case 'split':
        clipPath = getSplitClipPath(incomingTransition.direction, progress);
        break;
      case 'whip': {
        const offset = getDirectionalOffset(
          incomingTransition.direction,
          (1 - progress) * 48
        );
        translateX += offset.x;
        translateY += offset.y;
        opacity *= 0.62 + progress * 0.38;
        scale *= 1.08 - progress * 0.08;
        filters.push(`blur(${(1 - progress) * 26}px)`);
        filters.push(`brightness(${1.05 + (1 - progress) * 0.22})`);
        break;
      }
      case 'spin':
        rotateDeg += (1 - progress) * -14;
        scale *= 0.84 + progress * 0.16;
        opacity *= progress;
        break;
      case 'glitch': {
        const flicker = frame % 2 === 0 ? 1 : 0.68;
        const settle = 1 - progress;
        translateX += glitchJitter(frame, 1.8 * settle);
        translateY += glitchJitter(frame + 5, 0.9 * settle);
        opacity *= (0.5 + progress * 0.5) * flicker;
        filters.push(`contrast(${1.35 + settle * 0.55})`);
        filters.push(`saturate(${1.1 + settle * 1.1})`);
        filters.push(`hue-rotate(${settle * 28}deg)`);
        glitchIntensity = Math.max(glitchIntensity, 0.45 + settle * 0.55);
        break;
      }
      default:
        break;
    }
  }

  if (outgoingTransition && outgoingStart !== null && frame >= outgoingStart) {
    const progress = clamp01((frame - outgoingStart) / outgoingTransition.duration);

    switch (outgoingTransition.type) {
      case 'dissolve':
        opacity *= 1 - progress;
        break;
      case 'push': {
        const offset = getDirectionalOffset(
          invertDirection(outgoingTransition.direction),
          progress * 100
        );
        translateX += offset.x;
        translateY += offset.y;
        break;
      }
      case 'zoom':
        scale *= 1 - progress * 0.12;
        opacity *= 1 - progress;
        break;
      case 'blur': {
        opacity *= 1 - progress * 0.8;
        filters.push(`blur(${progress * 18}px)`);
        filters.push(`brightness(${1.02 + progress * 0.18})`);
        break;
      }
      case 'flash':
        opacity *= 1 - progress * 0.65;
        flashOpacity = Math.max(flashOpacity, progress * 0.82);
        filters.push(`brightness(${1.05 + progress * 0.35})`);
        break;
      case 'lightLeak':
        opacity *= 1 - progress * 0.45;
        lightLeakOpacity = Math.max(lightLeakOpacity, progress * 0.72);
        filters.push(`brightness(${1.04 + progress * 0.24})`);
        filters.push(`saturate(${1.06 + progress * 0.26})`);
        break;
      case 'whip': {
        const offset = getDirectionalOffset(
          invertDirection(outgoingTransition.direction),
          progress * 48
        );
        translateX += offset.x;
        translateY += offset.y;
        opacity *= 1 - progress * 0.18;
        scale *= 1 - progress * 0.05;
        filters.push(`blur(${progress * 22}px)`);
        filters.push(`brightness(${1.02 + progress * 0.18})`);
        break;
      }
      case 'spin':
        rotateDeg += progress * 12;
        scale *= 1 - progress * 0.08;
        opacity *= 1 - progress * 0.55;
        break;
      case 'glitch': {
        translateX += glitchJitter(frame, 1.6 * progress);
        translateY += glitchJitter(frame + 3, 0.8 * progress);
        opacity *= 1 - progress * 0.8;
        filters.push(`contrast(${1.15 + progress * 0.6})`);
        filters.push(`saturate(${1.05 + progress * 0.8})`);
        filters.push(`hue-rotate(${progress * 18}deg)`);
        glitchIntensity = Math.max(glitchIntensity, 0.35 + progress * 0.65);
        break;
      }
      default:
        break;
    }
  }

  const wrapperTransform = `translate(${translateX}%, ${translateY}%) scale(${scale}) rotate(${rotateDeg}deg)`;
  const filter = filters.length > 0 ? filters.join(' ') : undefined;

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        opacity,
        clipPath,
        filter,
        transform: wrapperTransform,
      }}
    >
      <BackgroundSceneMedia
        clip={clip}
        durationInFrames={motionDuration}
        sceneEffect={clip.sceneEffect}
        hasPopup={hasPopup}
      />
      {flashOpacity > 0 ? (
        <AbsoluteFill
          style={{
            opacity: Math.min(0.85, flashOpacity),
            backgroundColor: 'rgba(255,255,255,0.94)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {lightLeakOpacity > 0 ? (
        <LightLeakOverlay opacity={Math.min(0.72, lightLeakOpacity)} intensity={1} />
      ) : null}
      {glitchIntensity > 0 ? (
        <>
          <AbsoluteFill
            style={{
              opacity: Math.min(0.22, glitchIntensity * 0.2),
              mixBlendMode: 'screen',
              transform: `translate(${translateX + 1.1}%, ${translateY}%) scale(${scale})`,
              filter: 'hue-rotate(80deg) saturate(1.6)',
            }}
          >
            <BackgroundSceneMedia
              clip={clip}
              durationInFrames={motionDuration}
              sceneEffect={clip.sceneEffect}
              hasPopup={hasPopup}
            />
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              opacity: Math.min(0.18, glitchIntensity * 0.18),
              mixBlendMode: 'lighten',
              transform: `translate(${translateX - 1.3}%, ${translateY + 0.4}%) scale(${scale})`,
              filter: 'hue-rotate(-35deg) saturate(1.4)',
            }}
          >
            <BackgroundSceneMedia
              clip={clip}
              durationInFrames={motionDuration}
              sceneEffect={clip.sceneEffect}
              hasPopup={hasPopup}
            />
          </AbsoluteFill>
          <GlitchArtifacts intensity={glitchIntensity} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const Popup: React.FC<{
  children: React.ReactNode;
  duration: number;
  effect?: ClipEffect;
  transition?: SceneTransition;
  backgroundSrc?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  visualMode?: SceneVisualMode;
  popupZone?: PopupZone;
}> = ({
  children,
  duration,
  effect,
  transition,
  backgroundSrc,
  x,
  y,
  width,
  height,
  scale = 1,
  rotation = 0,
  opacity: baseOpacity = 1,
  visualMode,
  popupZone,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: videoWidth, height: videoHeight } = useVideoConfig();
  const eff = effect ?? { type: 'none', duration: 15 };
  const effDur = eff.duration ?? 15;

  const baseScale = spring({ frame, fps, config: { damping: 12 } });
  const px = x ?? 50;
  const py = y ?? 90;
  const pw = width ?? 25;
  const ph = height ?? 40;
  const layoutBox = getPopupLayoutBox({
    width: videoWidth,
    height: videoHeight,
    x: px,
    y: py,
    popupWidth: pw,
    popupHeight: ph,
    visualMode,
    popupZone,
  });

  const baseExitOpacity = interpolate(frame, [duration - 15, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const effectDuration = Math.max(1, effDur);
  const introProgress = clamp01(frame / effectDuration);
  const timelineProgress = clamp01(duration > 1 ? frame / (duration - 1) : 1);
  const intensity = eff.intensity ?? 1;
  const frequency = eff.frequency ?? 1;
  const accentColor = eff.color ?? '#38bdf8';
  const secondaryColor = eff.secondaryColor ?? '#ff4d8d';
  const phase = ((frame / fps) * Math.PI * 2 * frequency);

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${layoutBox.top}%`,
    left: `${layoutBox.centerX}%`,
    zIndex: 10,
    height: `${layoutBox.height}%`,
    width: `${layoutBox.width}%`,
    borderRadius: '0px',
    overflow: 'visible',
    transformOrigin: '50% 50%',
    willChange: 'transform, opacity, filter, clip-path',
  };
  const readingMat = (
    <>
      <div
        style={{
          position: 'absolute',
          inset: '-4% -3.5% -5% -3.5%',
          zIndex: 1,
          borderRadius: '42px',
          background:
            'radial-gradient(circle at 50% 38%, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.28) 34%, rgba(2,6,23,0.7) 76%, rgba(2,6,23,0.9) 100%)',
          filter: 'blur(20px)',
          opacity: 0.92,
          transform: 'scale(1.04)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '-1.2% -1.4% -2% -1.4%',
          zIndex: 2,
          borderRadius: '34px',
          background:
            'linear-gradient(180deg, rgba(2,6,23,0.08) 0%, rgba(2,6,23,0.18) 100%)',
          backdropFilter: 'blur(10px) saturate(0.86)',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
    </>
  );
  const backdrop = backgroundSrc ? (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 4, opacity: baseOpacity }}>
      <Img
        src={staticFile(backgroundSrc)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.34,
          filter: 'blur(22px) saturate(0.9)',
          transform: 'scale(1.06)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(2,6,23,0.32) 0%, rgba(2,6,23,0.62) 100%)',
        }}
      />
    </AbsoluteFill>
  ) : null;

  const renderContentLayer = (style?: React.CSSProperties, key?: string) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        ...style,
      }}
    >
      {children}
    </div>
  );

  let opacity = baseExitOpacity * baseOpacity;
  let translatePercentX = 0;
  let translatePercentY = 0;
  let translatePxX = 0;
  let translatePxY = 0;
  let scaleValue = baseScale;
  let rotateDeg = 0;
  let clipPath: string | undefined;
  const filters: string[] = [];
  let overlay: React.ReactNode = null;

  if (eff.type === 'popIn') {
    scaleValue = interpolate(
      introProgress,
      [0, 0.65, 1],
      [eff.startScale ?? 0.55, (eff.endScale ?? 1) * (1.08 + intensity * 0.06), eff.endScale ?? 1]
    );
    opacity = Math.min(0.18 + introProgress * 0.82, baseExitOpacity);
  } else if (eff.type === 'fadeIn') {
    const fadeIn = interpolate(frame, [0, effectDuration], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    opacity = Math.min(fadeIn, baseExitOpacity);
  } else if (eff.type === 'fadeOut') {
    opacity = interpolate(frame, [duration - effectDuration, duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (eff.type === 'slideIn') {
    const slideOffset = getDirectionalOffset(
      eff.direction,
      (1 - introProgress) * (110 * intensity)
    );
    translatePercentX += slideOffset.x;
    translatePercentY += slideOffset.y;
    opacity = Math.min(0.2 + introProgress * 0.8, baseExitOpacity);
  } else if (eff.type === 'zoom') {
    scaleValue = interpolate(
      introProgress,
      [0, 1],
      [eff.startScale ?? 0.7, eff.endScale ?? 1]
    );
    opacity = Math.min(0.24 + introProgress * 0.76, baseExitOpacity);
  } else if (eff.type === 'blur') {
    const blurProgress = interpolate(frame, [0, effectDuration], [eff.blurAmount ?? 14, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    filters.push(`blur(${blurProgress}px)`);
    filters.push(`brightness(${1.02 + blurProgress / 70})`);
  } else if (eff.type === 'flash') {
    const flashOpacity = interpolate(frame, [0, effectDuration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <VisualTransitionWrapper frame={frame} durationInFrames={duration} transition={transition}>
        <>
          {readingMat}
          {backdrop}
          <div
            style={{
              ...containerStyle,
              transform: `translateX(-50%) translateY(0%) rotate(${rotation}deg) scale(${scale})`,
              opacity: baseExitOpacity * baseOpacity,
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {renderContentLayer()}
            </div>
          </div>
          <AbsoluteFill
            style={{
              backgroundColor: eff.color ?? '#ffffff',
              opacity: flashOpacity,
              zIndex: 11,
              pointerEvents: 'none',
            }}
          />
        </>
      </VisualTransitionWrapper>
    );
  } else if (eff.type === 'wipe') {
    clipPath = getWipeClipPath(eff.direction, introProgress);
  } else if (eff.type === 'pulse') {
    const pulse = Math.sin(phase) * 0.045 * intensity;
    scaleValue = baseScale * (1 + pulse);
    filters.push(`drop-shadow(0 0 ${16 + intensity * 10}px ${accentColor})`);
    overlay = (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: '10%',
            borderRadius: '999px',
            boxShadow: `inset 0 0 ${26 + intensity * 18}px ${accentColor}`,
            opacity: 0.12 + (Math.sin(phase) + 1) * 0.08,
            mixBlendMode: 'screen',
          }}
        />
      </AbsoluteFill>
    );
  } else if (eff.type === 'ripple') {
    const rippleA = (((frame / fps) * frequency * 0.7) % 1 + 1) % 1;
    const rippleB = (rippleA + 0.5) % 1;
    scaleValue = baseScale * (1 + Math.sin(phase) * 0.025 * intensity);
    overlay = (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {[rippleA, rippleB].map((progress, index) => (
          <div
            key={`ripple_${index}`}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${26 + progress * 92}%`,
              height: `${26 + progress * 92}%`,
              transform: 'translate(-50%, -50%)',
              borderRadius: '999px',
              border: `${2 + intensity}px solid ${accentColor}`,
              opacity: (1 - progress) * 0.42,
              mixBlendMode: 'screen',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '26%',
            height: '26%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '999px',
            background: accentColor,
            opacity: 0.12,
            filter: 'blur(10px)',
            mixBlendMode: 'screen',
          }}
        />
      </AbsoluteFill>
    );
  } else if (eff.type === 'float') {
    translatePxY += Math.sin(phase) * 18 * intensity;
    scaleValue = baseScale * (1 + Math.sin(phase + Math.PI / 2) * 0.015 * intensity);
  } else if (eff.type === 'hover') {
    translatePxY += Math.sin(phase) * 11 * intensity;
    translatePxX += Math.cos(phase * 0.7) * 6 * intensity;
    rotateDeg += Math.sin(phase * 0.55) * 2.8 * intensity;
    scaleValue = baseScale * (1 + Math.sin(phase + Math.PI / 2) * 0.01 * intensity);
  } else if (eff.type === 'bounce') {
    translatePxY += -Math.abs(Math.sin(phase)) * 24 * intensity;
    scaleValue = baseScale * (1 + Math.abs(Math.sin(phase)) * 0.02 * intensity);
  } else if (eff.type === 'reactionJump') {
    const jumpProgress = clamp01(frame / effectDuration);
    const jumpArc = Math.sin(jumpProgress * Math.PI);
    translatePxY += -jumpArc * 42 * intensity;
    scaleValue = baseScale * (1 + jumpArc * 0.08 * intensity);
    rotateDeg += Math.sin(jumpProgress * Math.PI * 1.2) * 4 * intensity;
  } else if (eff.type === 'swing') {
    rotateDeg += Math.sin(phase) * (eff.rotation ?? 8) * intensity;
    translatePxX += Math.sin(phase * 0.5) * 6 * intensity;
  } else if (eff.type === 'orbit') {
    translatePxX += Math.cos(phase) * 18 * intensity;
    translatePxY += Math.sin(phase) * 12 * intensity;
    scaleValue = baseScale * (1 + Math.sin(phase * 0.5) * 0.02 * intensity);
  } else if (eff.type === 'glitch') {
    const chromaOffset = 2.5 * intensity;
    translatePxX += glitchJitter(frame, 4 * intensity);
    translatePxY += glitchJitter(frame + 3, 1.6 * intensity);
    filters.push(`contrast(${1.12 + intensity * 0.2})`);
    filters.push(`saturate(${1.08 + intensity * 0.24})`);
    overlay = (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {renderContentLayer(
          {
            transform: `translate(${chromaOffset}px, 0px)`,
            opacity: 0.18,
            mixBlendMode: 'screen',
            filter: 'hue-rotate(70deg) saturate(1.7)',
          },
          'glitch_screen',
        )}
        {renderContentLayer(
          {
            transform: `translate(${-chromaOffset}px, ${1.2 * intensity}px)`,
            opacity: 0.14,
            mixBlendMode: 'lighten',
            filter: 'hue-rotate(-30deg) saturate(1.6)',
          },
          'glitch_lighten',
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 7px)',
            opacity: 0.1 + intensity * 0.04,
            mixBlendMode: 'screen',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${22 + (Math.sin(phase) + 1) * 16}%`,
            height: `${4 + intensity * 2}%`,
            background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})`,
            opacity: 0.18,
            mixBlendMode: 'screen',
          }}
        />
      </AbsoluteFill>
    );
  } else if (eff.type === 'spin') {
    scaleValue = interpolate(
      introProgress,
      [0, 1],
      [eff.startScale ?? 0.8, eff.endScale ?? 1]
    );
    rotateDeg += interpolate(introProgress, [0, 1], [eff.rotation ?? 18, 0]);
    opacity = Math.min(0.18 + introProgress * 0.82, baseExitOpacity);
  } else if (eff.type === 'drift') {
    const driftVector = getDirectionalOffset(eff.direction, 30 * intensity);
    translatePxX += interpolate(timelineProgress, [0, 1], [-driftVector.x / 2, driftVector.x / 2]);
    translatePxY += interpolate(timelineProgress, [0, 1], [-driftVector.y / 2, driftVector.y / 2]);
    scaleValue = baseScale * (1 + timelineProgress * 0.035 * intensity);
  } else if (eff.type === 'spotlight') {
    const spotlightRadius = 24 + introProgress * 58 + Math.sin(phase) * 3 * intensity;
    clipPath = `circle(${spotlightRadius}% at 50% 50%)`;
    overlay = (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 50%, transparent 0%, transparent 42%, rgba(2,6,23,0.34) 72%, rgba(2,6,23,0.82) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: '999px',
            boxShadow: `0 0 ${36 + intensity * 18}px ${accentColor}`,
            opacity: 0.14,
            mixBlendMode: 'screen',
          }}
        />
      </AbsoluteFill>
    );
  } else if (eff.type === 'chromatic') {
    const split = (1.5 + intensity * 2) * (0.6 + Math.abs(Math.sin(phase)));
    translatePxX += Math.sin(phase * 0.65) * 4 * intensity;
    filters.push(`contrast(${1.08 + intensity * 0.16})`);
    filters.push(`saturate(${1.12 + intensity * 0.18})`);
    overlay = (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        {renderContentLayer(
          {
            transform: `translate(${split}px, 0px)`,
            opacity: 0.16,
            mixBlendMode: 'screen',
            boxShadow: `0 0 0 1px ${accentColor}`,
          },
          'chromatic_a',
        )}
        {renderContentLayer(
          {
            transform: `translate(${-split}px, 0px)`,
            opacity: 0.16,
            mixBlendMode: 'screen',
            boxShadow: `0 0 0 1px ${secondaryColor}`,
          },
          'chromatic_b',
        )}
      </AbsoluteFill>
    );
  }

  const filter = filters.length > 0 ? filters.join(' ') : undefined;
  const transform = [
    `translateX(${formatCalcOffset('-50%', translatePercentX, translatePxX)})`,
    `translateY(${formatCalcOffset('0%', translatePercentY, translatePxY)})`,
    `rotate(${rotateDeg + rotation}deg)`,
    `scale(${scaleValue * scale})`,
  ].join(' ');
  const content = (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {renderContentLayer()}
      {overlay}
    </div>
  );

  return (
    <VisualTransitionWrapper frame={frame} durationInFrames={duration} transition={transition}>
      <>
        {readingMat}
        {backdrop}
        <div style={{ ...containerStyle, transform, opacity, filter, clipPath }}>
          {content}
        </div>
      </>
    </VisualTransitionWrapper>
  );
};

export const YukkuriVideo: React.FC<z.infer<typeof compositionInputSchema>> = ({
  clips = [],
  scenes = [],
  bgm_sequence = [],
  bgmVolume = 0.15,
  voiceVolume = 1,
  seVolume = 0.9,
  voiceDucking = 0.58,
  duckFadeFrames = 12,
  masterVolume = 1,
  characterScale = 1.0,
  enableTransitions = true,
}) => {
  const currentFrame = useCurrentFrame();
  const { width: compositionWidth, height: compositionHeight } = useVideoConfig();
  const showCharacters = characterScale > 0.01;
  const clipProps = React.useMemo(() => (Array.isArray(clips) ? (clips as Clip[]) : []), [clips]);
  const sceneProps = React.useMemo(
    () => (Array.isArray(scenes) ? (scenes as ProjectScene[]) : []),
    [scenes]
  );
  const bgmSequenceProps = React.useMemo(
    () =>
      Array.isArray(bgm_sequence)
        ? ((bgm_sequence as ProjectLongData['bgm_sequence']) ?? [])
        : [],
    [bgm_sequence]
  );
  const hasClipProps = clipProps.length > 0;

  const resolvedClips = React.useMemo(
    () =>
      hasClipProps
        ? clipProps
        : createClipsFromProjectData({
            scenes: sceneProps,
            bgm_sequence: bgmSequenceProps,
          }),
    [bgmSequenceProps, clipProps, hasClipProps, sceneProps]
  );

  const resolvedScenes = React.useMemo(
    () => (hasClipProps ? clipsToScenes(resolvedClips) : sceneProps),
    [hasClipProps, resolvedClips, sceneProps]
  );

  const activeScenes = React.useMemo(
    () =>
      resolvedScenes.filter(
        (scene: ProjectScene) =>
          currentFrame >= (scene.startTime || 0) &&
          currentFrame < (scene.startTime || 0) + (scene.duration || 90)
      ),
    [resolvedScenes, currentFrame]
  );

  const activeCharacterScenes = React.useMemo(() => {
    const latestBySpeaker = new Map<string, ProjectScene>();
    activeScenes.forEach((scene) => {
      if (scene.characterVisible === false) {
        return;
      }
      const speakerKey = scene.speaker ?? 'unknown';
      const previous = latestBySpeaker.get(speakerKey);
      if (!previous || (scene.startTime ?? 0) >= (previous.startTime ?? 0)) {
        latestBySpeaker.set(speakerKey, scene);
      }
    });
    return Array.from(latestBySpeaker.values());
  }, [activeScenes]);

  const activeSubtitleLayouts = React.useMemo(() => {
    const layoutMap = new Map<string, SubtitleAutoLayout>();
    if (activeScenes.length <= 1) {
      return layoutMap;
    }

    const autoScenes = activeScenes.filter(
      (scene) => scene.id && scene.subtitleX === undefined && scene.subtitleY === undefined
    );

    const groups = {
      left: autoScenes.filter((scene) => isLeftSpeaker(scene.speaker)),
      right: autoScenes.filter((scene) => !isLeftSpeaker(scene.speaker)),
    };

    const applyGroupLayout = (
      scenes: ProjectScene[],
      side: 'left' | 'right'
    ) => {
      if (scenes.length === 0) {
        return;
      }

      scenes
        .sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))
        .forEach((scene, index) => {
          if (!scene.id) {
            return;
          }

          const slot = getAutoSubtitleSlot({
            width: compositionWidth,
            height: compositionHeight,
            side,
            index,
          });

          layoutMap.set(scene.id, {
            x: slot.x,
            y: slot.y,
            width: slot.width,
            height: slot.height,
          });
        });
    };

    applyGroupLayout(groups.left, 'left');
    applyGroupLayout(groups.right, 'right');

    return layoutMap;
  }, [activeScenes, compositionHeight, compositionWidth]);

  const defaultSubtitleLayout = React.useMemo(
    () =>
      getSubtitleLayoutDefaults({
        width: compositionWidth,
        height: compositionHeight,
        hasOverlap: false,
      }),
    [compositionHeight, compositionWidth]
  );
  const overlapSubtitleLayout = React.useMemo(
    () =>
      getSubtitleLayoutDefaults({
        width: compositionWidth,
        height: compositionHeight,
        hasOverlap: true,
      }),
    [compositionHeight, compositionWidth]
  );

  const backgroundClips = React.useMemo(
    () =>
      resolvedClips
        .filter((clip): clip is Clip => clip.type === 'bg')
        .sort((a, b) => a.startTime - b.startTime),
    [resolvedClips]
  );

  const popupPresenceByBackgroundClipId = React.useMemo(() => {
    const sceneById = new Map<string, ProjectScene>();
    resolvedScenes.forEach((scene) => {
      if (scene.id) {
        sceneById.set(scene.id, scene);
      }
    });

    const resolveSceneForBackgroundClip = (clip: Clip) => {
      if (clip.id.startsWith('bg_')) {
        const sceneId = clip.id.slice(3);
        const matchedById = sceneById.get(sceneId);
        if (matchedById) {
          return matchedById;
        }
      }

      return resolvedScenes.find(
        (scene) =>
          (scene.startTime || 0) === clip.startTime &&
          (scene.duration || 90) === clip.duration &&
          ((scene.bg_image && scene.bg_image === clip.bg_image) ||
            (scene.bg_video && scene.bg_video === clip.bg_video))
      );
    };

    const map = new Map<string, boolean>();
    backgroundClips.forEach((clip) => {
      const scene = resolveSceneForBackgroundClip(clip);
      map.set(clip.id, (scene?.popups?.length ?? 0) > 0);
    });
    return map;
  }, [backgroundClips, resolvedScenes]);

  const voiceClips = React.useMemo(
    () => resolvedClips.filter((clip): clip is Clip => clip.type === 'voice'),
    [resolvedClips]
  );

  const bgmDuckMultiplier = React.useMemo(() => {
    if (voiceClips.length === 0) {
      return 1;
    }

    let multiplier = 1;
    for (const clip of voiceClips) {
      const start = clip.startTime;
      const end = clip.startTime + clip.duration;

      if (currentFrame >= start && currentFrame < end) {
        multiplier = Math.min(multiplier, voiceDucking);
        continue;
      }

      if (duckFadeFrames > 0 && currentFrame >= start - duckFadeFrames && currentFrame < start) {
        const eased = interpolate(currentFrame, [start - duckFadeFrames, start], [1, voiceDucking], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        multiplier = Math.min(multiplier, eased);
        continue;
      }

      if (duckFadeFrames > 0 && currentFrame >= end && currentFrame < end + duckFadeFrames) {
        const eased = interpolate(currentFrame, [end, end + duckFadeFrames], [voiceDucking, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        multiplier = Math.min(multiplier, eased);
      }
    }

    return clamp01(multiplier);
  }, [currentFrame, duckFadeFrames, voiceClips, voiceDucking]);

  const effectiveBgmVolume = React.useMemo(
    () => clamp01(bgmVolume * bgmDuckMultiplier * masterVolume),
    [bgmDuckMultiplier, bgmVolume, masterVolume]
  );

  const effectiveSeVolume = React.useMemo(
    () => Math.max(0, seVolume * masterVolume),
    [masterVolume, seVolume]
  );

  const effectiveVoiceVolume = React.useMemo(
    () => Math.max(0, voiceVolume * masterVolume),
    [masterVolume, voiceVolume]
  );

  const resolvedPopups = React.useMemo(() => {
    const getDefaultStartOffset = (scene: ProjectScene, popupIndex: number) => {
      const sceneDuration = scene.duration || 90;
      if (scene.sceneVisualMode === 'backgroundFocus') {
        return Math.min(
          Math.max(Math.round(sceneDuration * 0.36) + popupIndex * 18, 20),
          Math.max(20, sceneDuration - 48)
        );
      }

      if (scene.sceneVisualMode === 'split') {
        return Math.min(
          Math.max(10 + popupIndex * 14, 8),
          Math.max(8, sceneDuration - 40)
        );
      }

      return popupIndex * 8;
    };

    const popupEntries = resolvedScenes
      .flatMap((scene, sceneIndex) =>
        (scene.popups ?? []).map((popup, popupIndex) => {
          const startOffset = popup.startOffset ?? getDefaultStartOffset(scene, popupIndex);
          const from = (scene.startTime || 0) + startOffset;
          const sceneEnd = (scene.startTime || 0) + (scene.duration || 90);
          const maxDurationWithinScene = Math.max(1, sceneEnd - from);

          return {
            sceneIndex,
            popupIndex,
            popup,
            sceneVisualMode: scene.sceneVisualMode ?? 'popupFocus',
            popupZone: popup.popupZone ?? scene.popupZone,
            from,
            sceneEnd,
            duration: Math.min(popup.duration || 90, maxDurationWithinScene),
            key: `popup_${sceneIndex}_${popupIndex}`,
          };
        })
      )
      .sort((a, b) => a.from - b.from || a.sceneIndex - b.sceneIndex || a.popupIndex - b.popupIndex);

    return popupEntries.map((entry, index) => {
      const hasComponent = !!entry.popup.component && entry.popup.component in componentRegistry;
      if (!hasComponent) {
        return entry;
      }

      const nextComponent = popupEntries
        .slice(index + 1)
        .find((candidate) => !!candidate.popup.component && candidate.popup.component in componentRegistry);

      const heldDuration = nextComponent
        ? Math.max(entry.duration, nextComponent.from - entry.from)
        : entry.duration;

      return {
        ...entry,
        duration: Math.max(1, Math.min(heldDuration, entry.sceneEnd - entry.from)),
      };
    });
  }, [resolvedScenes]);

  // ── SceneEffect: アクティブシーンのエフェクト設定を取得 ──────────────────
  const activeSceneEffect = React.useMemo(() => {
    const s = activeScenes.find((scene) => !!scene.sceneEffect);
    return s?.sceneEffect ?? null;
  }, [activeScenes]);

  const shakeTransform = React.useMemo(() => {
    if (!activeSceneEffect?.cameraShake) return 'none';
    return calcShakeTransform(currentFrame, activeSceneEffect.cameraShake);
  }, [activeSceneEffect, currentFrame]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#050510',
        // cameraShake: outer AbsoluteFill ごとシフトさせる
        transform: shakeTransform !== 'none' ? shakeTransform : undefined,
        willChange: shakeTransform !== 'none' ? 'transform' : undefined,
      }}
    >
      {resolvedClips
        .filter((clip) => clip.type === 'bgm')
        .map((clip) => (
          <Sequence key={clip.id} from={clip.startTime} durationInFrames={clip.duration}>
            <Audio
              src={staticFile(`assets/bgm/${clip.bgmFile}`)}
              volume={effectiveBgmVolume}
              playbackRate={clip.playbackRate ?? 1}
              loop
            />
          </Sequence>
        ))}

      {resolvedClips
        .filter((clip) => clip.type === 'se' && !!clip.seFile)
        .map((clip) => (
          <Sequence key={clip.id} from={clip.startTime} durationInFrames={clip.duration}>
            <Audio
              src={staticFile(`assets/se/${clip.seFile}`)}
              volume={(clip.volumeScale ?? 0.8) * effectiveSeVolume}
            />
          </Sequence>
        ))}

      {backgroundClips.map((clip, index) => {
        const nextClip = backgroundClips[index + 1] ?? null;
        const nextTransitionDuration =
          enableTransitions && hasSceneTransition(nextClip?.transition)
            ? nextClip.transition.duration
            : 0;
        const extendedDuration = nextClip
          ? Math.max(clip.duration, nextClip.startTime - clip.startTime + nextTransitionDuration)
          : clip.duration;

        return (
          <Sequence
            key={clip.id}
            from={clip.startTime}
            durationInFrames={Math.max(clip.duration, extendedDuration)}
          >
            <BackgroundTransitionLayer
              clip={clip}
              nextClip={nextClip}
              enableTransitions={enableTransitions}
              hasPopup={popupPresenceByBackgroundClipId.get(clip.id) ?? false}
            />
          </Sequence>
        );
      })}

      {resolvedPopups.map(({ key, popup, from, duration, sceneVisualMode, popupZone }) => {
        const hasImage = !!popup.image;
        const hasComponent = !!popup.component && popup.component in componentRegistry;
        if (!hasImage && !hasComponent) {
          return null;
        }

        const infographicContent = hasComponent
          ? React.createElement(componentRegistry[popup.component!], popup.props ?? {})
          : null;

        return (
          <Sequence
            key={key}
            from={from}
            durationInFrames={duration}
          >
            <Popup
              duration={duration}
              effect={popup.effect}
              transition={popup.transition}
              backgroundSrc={hasImage ? popup.image : undefined}
              x={popup.imageX}
              y={popup.imageY}
              width={popup.imageWidth}
              height={popup.imageHeight}
              scale={popup.imageScale}
              rotation={popup.imageRotation}
              opacity={popup.imageOpacity}
              visualMode={sceneVisualMode}
              popupZone={popupZone}
            >
              {hasImage
                ? (
                  <Img
                    src={staticFile(popup.image!)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      transform: 'scale(1.015)',
                    }}
                  />
                )
                : infographicContent}
            </Popup>
          </Sequence>
        );
      })}

      {resolvedScenes.map((scene: ProjectScene) => {
        const voiceClip = resolvedClips.find((clip) => clip.type === 'voice' && clip.id === scene.id);
        if (!voiceClip) {
          return null;
        }

        const hasOverlap = activeScenes.length > 1;
        const subtitleLayout = scene.id ? activeSubtitleLayouts.get(scene.id) : undefined;

        const effectiveStyle = scene.subtitleStyle;

        const voicePath = voiceClip.voiceFile
          ? `voices/${voiceClip.voiceFile}`
          : `voices/${scene.id}.wav`;

        return (
          <Sequence
            key={`voice_seq_${voiceClip.id}`}
            from={scene.startTime || 0}
            durationInFrames={scene.duration || 90}
          >
            {(() => {
              const sequenceFrame = currentFrame - (scene.startTime || 0);
              const fadeIn = scene.fadeInDuration ?? 0;
              const fadeOut = scene.fadeOutDuration ?? 0;

              let opacity = 1;
              if (fadeIn > 0 && sequenceFrame < fadeIn) {
                opacity = interpolate(sequenceFrame, [0, fadeIn], [0, 1], {
                  extrapolateRight: 'clamp',
                });
              } else if (fadeOut > 0 && sequenceFrame > (scene.duration || 90) - fadeOut) {
                opacity = interpolate(
                  sequenceFrame,
                  [(scene.duration || 90) - fadeOut, scene.duration || 90],
                  [1, 0],
                  { extrapolateLeft: 'clamp' }
                );
              }

              return (
                <div style={{ opacity, width: '100%', height: '100%' }}>
                  {showCharacters ? (
                    <AbsoluteFill
                      style={{
                        transform: `scale(${characterScale})`,
                        transformOrigin: 'bottom center',
                      }}
                    >
                      {activeCharacterScenes.map((activeScene: ProjectScene, activeIndex: number) => (
                        <VisualTransitionWrapper
                          key={`${activeScene.speaker ?? 'unknown'}_${activeIndex}`}
                          frame={currentFrame - (activeScene.startTime ?? 0)}
                          durationInFrames={activeScene.duration ?? 90}
                          transition={
                            resolvedClips.find(
                              (clip) => clip.type === 'voice' && clip.id === activeScene.id
                            )?.transition
                          }
                        >
                          <CharacterSkin
                            character={activeScene.speaker ?? 'zundamon'}
                            emotion={activeScene.emotion ?? ''}
                            side={isLeftSpeaker(activeScene.speaker) ? 'left' : 'right'}
                            posX={activeScene.characterX}
                            posY={activeScene.characterY}
                            sizeScale={activeScene.characterScale}
                            rotation={activeScene.characterRotation}
                            opacity={activeScene.characterOpacity}
                          />
                        </VisualTransitionWrapper>
                      ))}
                    </AbsoluteFill>
                  ) : null}

                  <Subtitle
                    character={scene.speaker ?? 'zundamon'}
                    text={getBottomSubtitleText(scene)}
                    durationInFrames={scene.duration || 90}
                    style={effectiveStyle}
                    positionX={scene.subtitleX ?? subtitleLayout?.x}
                    positionY={
                      scene.subtitleY
                      ?? subtitleLayout?.y
                      ?? (hasOverlap ? overlapSubtitleLayout.bottomPct : defaultSubtitleLayout.bottomPct)
                    }
                    maxWidthPct={
                      scene.subtitleWidth
                      ?? subtitleLayout?.width
                      ?? (hasOverlap ? overlapSubtitleLayout.widthPct : defaultSubtitleLayout.widthPct)
                    }
                    maxHeightPct={
                      scene.subtitleHeight
                      ?? subtitleLayout?.height
                      ?? (hasOverlap ? overlapSubtitleLayout.heightPct : defaultSubtitleLayout.heightPct)
                    }
                  />

                  <Audio
                    key={`audio_${voiceClip.id}`}
                    src={scene.voiceBlobUrl ?? staticFile(voicePath)}
                    playbackRate={voiceClip.playbackRate ?? 1}
                    volume={(voiceClip.volumeScale ?? 1) * effectiveVoiceVolume}
                  />
                </div>
              );
            })()}
          </Sequence>
        );
      })}

      {/* ── SceneEffect オーバーレイ (scene overlay / filmGrain / vignette / colorGrade) ── */}
      {resolvedScenes.map((scene: ProjectScene) => {
        const fx = scene.sceneEffect;
        if (!fx?.overlay && !fx?.filmGrain && !fx?.vignette && !fx?.colorGrade) return null;
        return (
          <Sequence
            key={`fx_${scene.id}`}
            from={scene.startTime || 0}
            durationInFrames={scene.duration || 90}
          >
            <SceneOverlayLayer sceneEffect={fx} />
            {fx.filmGrain  && <FilmGrain  {...fx.filmGrain} />}
            {fx.vignette   && <Vignette   {...fx.vignette} />}
            {fx.colorGrade && <ColorGrade {...fx.colorGrade} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
