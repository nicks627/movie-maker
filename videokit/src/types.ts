import { isLeftSpeaker } from './voice/speakers';

export interface SoundEffect {
  file: string;         // public/assets/se/ 以下のファイル名
  startOffset?: number; // シーン開始からのオフセット（フレーム）
  volume?: number;      // 0〜1
  duration?: number;    // 再生フレーム数（省略時は defaultSEDurationFrames=60）
}

export type SceneStylePreset =
  | 'none'
  | 'yukkuri-rich'
  | 'shorts-punch'
  | 'documentary'
  | 'variety'
  | 'product-showcase';

export type CameraMotionType =
  | 'none'
  | 'ken-burns'
  | 'pan-left'
  | 'pan-right'
  | 'pan-up'
  | 'pan-down'
  | 'push-in'
  | 'pull-out'
  | 'parallax'
  | 'documentary-drift'
  | 'short-punch';

export type SceneOverlayType =
  | 'none'
  | 'light-leak'
  | 'letterbox'
  | 'archive-frame'
  | 'broadcast-hud'
  | 'variety-glow';

export type SceneVisualMode = 'popupFocus' | 'backgroundFocus' | 'split';

export type PopupZone =
  | 'auto'
  | 'full'
  | 'upperBand'
  | 'middleBand'
  | 'leftRail'
  | 'rightRail';

/**
 * SceneEffect — シーン単位で適用するシネマティックエフェクト設定。
 * YukkuriVideo.tsx が AbsoluteFill オーバーレイとしてレンダリングする。
 *
 * script.json での使い方:
 * ```json
 * {
 *   "sceneEffect": {
 *     "filmGrain":  { "opacity": 0.07 },
 *     "vignette":   { "intensity": 0.55 },
 *     "colorGrade": { "preset": "cinematic" },
 *     "cameraShake":{ "intensity": 0.6, "speed": 1.2 }
 *   }
 * }
 * ```
 */
export interface SceneEffect {
  /** ジャンル別の即戦力プリセット */
  stylePreset?: SceneStylePreset;
  /** 背景のゆっくりズーム・パン・パララックスなど */
  cameraMotion?: {
    type: CameraMotionType;
    intensity?: number;   // 0〜2
    speed?: number;       // 0.5〜2
    focusX?: number;      // 0〜100
    focusY?: number;      // 0〜100
    parallaxDepth?: number; // 0〜2
  };
  /** ライトリーク / レターボックス / HUD など */
  overlay?: {
    type: SceneOverlayType;
    intensity?: number;   // 0〜2
    color?: string;
    secondaryColor?: string;
  };
  /** フィルムグレイン（SVG feTurbulence で毎フレーム変化） */
  filmGrain?: {
    opacity?: number;    // 0〜1 (default: 0.06)
    frequency?: number;  // ノイズ周波数 (default: 0.8)
  };
  /** ビネット（画面周辺を暗くするシネマティック効果） */
  vignette?: {
    intensity?: number;  // 0〜1 (default: 0.5)
    color?: string;      // (default: "#000000")
    shape?: 'circle' | 'ellipse';
    softness?: number;   // 0〜1 (default: 0.45)
  };
  /** カラーグレーディング (blend-mode オーバーレイ) */
  colorGrade?: {
    preset: 'cinematic' | 'warm' | 'cold' | 'vibrant' | 'muted' | 'retro' | 'neon' | 'horror';
    intensity?: number;  // 0〜1 (default: 1.0)
  };
  /** カメラシェイク（複数 sin 波による有機的な揺れ） */
  cameraShake?: {
    intensity?: number;  // 0〜1 (default: 0.5) 最大振れ幅
    speed?: number;      // 周波数倍率 (default: 1.0)
  };
}

export interface Clip {
  id: string;
  type: 'voice' | 'image' | 'bgm' | 'bg' | 'se';
  layer: number;
  startTime: number;
  duration: number;
  transition?: SceneTransition;
  sceneEffect?: SceneEffect;
  // Transitions
  fadeInDuration?: number; // In frames
  fadeOutDuration?: number; // In frames
  // Voice fields
  speaker?: string;
  text?: string;
  speechText?: string;
  subtitleText?: string;
  emotion?: string;
  voiceBlobUrl?: string;
  subtitleStyle?: SubtitleStyle;
  subtitleX?: number;  // 0-100 percentage
  subtitleY?: number;  // 0-100 percentage
  subtitleWidth?: number;  // percentage of video width
  subtitleHeight?: number; // percentage of video height
  characterX?: number; // 0-100 percentage
  characterY?: number; // 0-100 percentage
  characterScale?: number;
  characterVisible?: boolean;
  characterRotation?: number;
  characterOpacity?: number;
  playbackRate?: number;
  voiceType?: 'original' | 'generated';
  voiceFile?: string; 
  shortTexts?: {
    lead?: string;
    summary?: string;
    trim?: string;
  };
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  // Image fields
  image?: string;
  effect?: ClipEffect;
  imageX?: number; // 0-100 percentage
  imageY?: number; // 0-100 percentage
  imageWidth?: number; // percentage of video width
  imageHeight?: number; // percentage of video height
  imageScale?: number;
  imageRotation?: number;
  imageOpacity?: number;
  component?: string;
  props?: Record<string, unknown>;
  // BGM fields
  bgmFile?: string;
  // SE fields
  seFile?: string;
  // Background fields
  bg_image?: string;
  bg_video?: string;
  bgVideoTrimBefore?: number;
  bgVideoTrimAfter?: number;
  sceneVisualMode?: SceneVisualMode;
  popupZone?: PopupZone;
  // Legacy
  asset_query?: string;
}

export interface SubtitleStyle {
  fontSize?: number;
  textColor?: string;
  borderColor?: string;
  borderSize?: number;
  animation?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  borderRadius?: number;
  padding?: number;
  boxShadow?: string;
  backgroundColor?: string;
  opacity?: number;
  rotation?: number;
  scale?: number;
}

export interface ClipEffect {
  type:
    | 'popIn'
    | 'fadeIn'
    | 'fadeOut'
    | 'slideIn'
    | 'zoom'
    | 'blur'
    | 'flash'
    | 'wipe'
    | 'pulse'
    | 'ripple'
    | 'float'
    | 'hover'
    | 'bounce'
    | 'reactionJump'
    | 'swing'
    | 'orbit'
    | 'glitch'
    | 'spin'
    | 'drift'
    | 'spotlight'
    | 'chromatic'
    | 'none';
  duration: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  startScale?: number;
  endScale?: number;
  blurAmount?: number;
  color?: string;
  intensity?: number;
  frequency?: number;
  rotation?: number;
  secondaryColor?: string;
}

export interface SceneTransition {
  type: 'none' | 'dissolve' | 'wipe' | 'slide' | 'push' | 'zoom' | 'glitch' | 'blur' | 'flash' | 'iris' | 'split' | 'spin' | 'lightLeak' | 'whip';
  duration: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export interface ProjectScene {
  id?: string;
  speaker?: string;
  text?: string;
  speechText?: string;
  subtitleText?: string;
  startTime?: number;
  duration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  emotion?: string;
  bg_image?: string;
  bg_video?: string;
  bgVideoTrimBefore?: number;
  bgVideoTrimAfter?: number;
  sceneVisualMode?: SceneVisualMode;
  popupZone?: PopupZone;
  asset_query?: string;
  voiceBlobUrl?: string;
  voiceFile?: string;
  shortTexts?: {
    lead?: string;
    summary?: string;
    trim?: string;
  };
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  subtitleStyle?: SubtitleStyle;
  subtitleX?: number;
  subtitleY?: number;
  subtitleWidth?: number;
  subtitleHeight?: number;
  characterX?: number;
  characterY?: number;
  characterScale?: number;
  characterVisible?: boolean;
  characterRotation?: number;
  characterOpacity?: number;
  characterTransition?: SceneTransition;
  transition?: SceneTransition;
  se?: SoundEffect[];
  sceneEffect?: SceneEffect;
  popups?: Array<{
    image?: string;
    component?: string;
    props?: Record<string, unknown>;
    startOffset?: number;
    duration?: number;
    popupZone?: PopupZone;
    effect?: ClipEffect;
    transition?: SceneTransition;
    imageX?: number;
    imageY?: number;
    imageWidth?: number;
    imageHeight?: number;
    imageScale?: number;
    imageRotation?: number;
    imageOpacity?: number;
  }>;
}

export type ProjectPopup = NonNullable<ProjectScene['popups']>[number];

export interface ProjectLongData {
  scenes?: ProjectScene[];
  bgm_sequence?: Array<{
    at_scene: number;
    file: string;
  }>;
}

export function createClipsFromProjectData(longData?: ProjectLongData | null): Clip[] {
  if (!longData?.scenes?.length) {
    return [];
  }

  const clips: Clip[] = [];
  const scenes = longData.scenes;

  scenes.forEach((scene, idx) => {
    const voiceLayer = isLeftSpeaker(scene.speaker) ? 1 : 0;
    const sceneId = scene.id || `scene_${idx}`;

    clips.push({
      id: sceneId,
      type: 'voice',
      layer: voiceLayer,
      startTime: scene.startTime || 0,
      duration: scene.duration || 90,
      speaker: scene.speaker,
      text: scene.text,
      speechText: scene.speechText,
      subtitleText: scene.subtitleText,
      emotion: scene.emotion,
      asset_query: scene.asset_query,
      voiceBlobUrl: scene.voiceBlobUrl,
      voiceFile: scene.voiceFile,
      shortTexts: scene.shortTexts,
      subtitleStyle: scene.subtitleStyle,
      subtitleX: scene.subtitleX,
      subtitleY: scene.subtitleY,
      subtitleWidth: scene.subtitleWidth,
      subtitleHeight: scene.subtitleHeight,
      characterX: scene.characterX,
      characterY: scene.characterY,
      characterScale: scene.characterScale,
      characterVisible: scene.characterVisible,
      characterRotation: scene.characterRotation,
      characterOpacity: scene.characterOpacity,
      transition: scene.characterTransition,
      fadeInDuration: scene.fadeInDuration,
      fadeOutDuration: scene.fadeOutDuration,
      sceneVisualMode: scene.sceneVisualMode,
      popupZone: scene.popupZone,
    });

    if (scene.bg_image || scene.bg_video) {
      clips.push({
        id: `bg_${sceneId}`,
        type: 'bg',
        layer: 3,
        startTime: scene.startTime || 0,
        duration: scene.duration || 90,
        bg_image: scene.bg_image,
        bg_video: scene.bg_video,
        bgVideoTrimBefore: scene.bgVideoTrimBefore,
        bgVideoTrimAfter: scene.bgVideoTrimAfter,
        sceneVisualMode: scene.sceneVisualMode,
        popupZone: scene.popupZone,
        transition: scene.transition,
        sceneEffect: scene.sceneEffect,
      });
    }

    scene.popups?.forEach((popup, pIdx) => {
      clips.push({
        id: `img_${sceneId}_${pIdx}`,
        type: 'image',
        layer: 4,
        startTime: (scene.startTime || 0) + (popup.startOffset || 0),
        duration: popup.duration || 90,
        image: popup.image,
        component: popup.component,
        props: popup.props,
        sceneVisualMode: scene.sceneVisualMode,
        popupZone: popup.popupZone ?? scene.popupZone,
        effect: popup.effect ?? { type: 'none', duration: 15 },
        transition: popup.transition,
        imageX: popup.imageX,
        imageY: popup.imageY,
        imageWidth: popup.imageWidth,
        imageHeight: popup.imageHeight,
        imageScale: popup.imageScale,
        imageRotation: popup.imageRotation,
        imageOpacity: popup.imageOpacity,
      });
    });

    scene.se?.forEach((se, seIdx) => {
      clips.push({
        id: `se_${sceneId}_${seIdx}`,
        type: 'se',
        layer: 6,
        startTime: (scene.startTime || 0) + (se.startOffset || 0),
        duration: se.duration || 60,
        seFile: se.file,
        volumeScale: se.volume ?? 0.8,
      });
    });
  });

  (longData.bgm_sequence ?? []).forEach((bgm, idx, sequence) => {
    const startScene = scenes[bgm.at_scene];
    if (!startScene) {
      return;
    }

    const nextBgm = sequence[idx + 1];
    const endScene = nextBgm ? scenes[nextBgm.at_scene] : scenes[scenes.length - 1];
    const startFrame = startScene.startTime ?? 0;
    const endFrame = endScene
      ? (endScene.startTime ?? 0) + (endScene.duration ?? 90)
      : startFrame + 300;

    clips.push({
      id: `bgm_${idx}`,
      type: 'bgm',
      layer: 7,
      startTime: startFrame,
      duration: Math.max(1, endFrame - startFrame),
      bgmFile: bgm.file,
    });
  });

  return clips;
}

// ---- Convert clips back to legacy scenes format for Remotion rendering ----
export function clipsToScenes(clips: Clip[]): ProjectScene[] {
  const voiceClips = clips.filter(c => c.type === 'voice');
  const imageClips = clips.filter(c => c.type === 'image');

  return voiceClips.map(vc => {
    const popups = imageClips
      .filter(ic => {
        const icEnd = ic.startTime + ic.duration;
        const vcEnd = vc.startTime + vc.duration;
        return ic.startTime < vcEnd && icEnd > vc.startTime;
      })
      .map(ic => ({
        image: ic.image,
        component: ic.component,
        props: ic.props,
        startOffset: Math.max(0, ic.startTime - vc.startTime),
        duration: ic.duration,
        popupZone: ic.popupZone,
        effect: ic.effect,
        transition: ic.transition,
        imageX: ic.imageX,
        imageY: ic.imageY,
        imageWidth: ic.imageWidth,
        imageHeight: ic.imageHeight,
        imageScale: ic.imageScale,
        imageRotation: ic.imageRotation,
        imageOpacity: ic.imageOpacity,
      }));

    // Find overlapping bg clip for this voice
    const bgClips = clips.filter(c => c.type === 'bg');
    const bgClip = bgClips.find(bc => {
      const bcEnd = bc.startTime + bc.duration;
      const vcEnd = vc.startTime + vc.duration;
      return bc.startTime < vcEnd && bcEnd > vc.startTime;
    });

    return {
      id: vc.id,
      speaker: vc.speaker,
      text: vc.text,
      speechText: vc.speechText,
      subtitleText: vc.subtitleText,
      startTime: vc.startTime,
      duration: vc.duration,
      fadeInDuration: vc.fadeInDuration,
      fadeOutDuration: vc.fadeOutDuration,
      emotion: vc.emotion,
      bg_image: bgClip?.bg_image || '',
      bg_video: bgClip?.bg_video || '',
      bgVideoTrimBefore: bgClip?.bgVideoTrimBefore,
      bgVideoTrimAfter: bgClip?.bgVideoTrimAfter,
      sceneVisualMode: bgClip?.sceneVisualMode ?? vc.sceneVisualMode,
      popupZone: bgClip?.popupZone ?? vc.popupZone,
      transition: bgClip?.transition,
      sceneEffect: bgClip?.sceneEffect,
      asset_query: vc.asset_query,
      voiceBlobUrl: vc.voiceBlobUrl,
      voiceFile: vc.voiceFile,
      shortTexts: vc.shortTexts,
      subtitleStyle: vc.subtitleStyle,
      subtitleX: vc.subtitleX,
      subtitleY: vc.subtitleY,
      subtitleWidth: vc.subtitleWidth,
      subtitleHeight: vc.subtitleHeight,
      characterX: vc.characterX,
      characterY: vc.characterY,
      characterScale: vc.characterScale,
      characterVisible: vc.characterVisible,
      characterRotation: vc.characterRotation,
      characterOpacity: vc.characterOpacity,
      characterTransition: vc.transition,
      popups,
    };
  });
}

export function clipsToProjectData(clips: Clip[]): ProjectLongData {
  const scenes = clipsToScenes(clips);
  const voiceClips = clips
    .filter((clip): clip is Clip => clip.type === 'voice')
    .sort((a, b) => a.startTime - b.startTime);
  const bgm_sequence = clips
    .filter((clip): clip is Clip => clip.type === 'bgm' && !!clip.bgmFile)
    .sort((a, b) => a.startTime - b.startTime)
    .map((clip) => {
      const overlappingSceneIndex = voiceClips.findIndex(
        (voiceClip) => clip.startTime >= voiceClip.startTime && clip.startTime < voiceClip.startTime + voiceClip.duration
      );
      const latestStartedSceneIndex = voiceClips.reduce((bestIndex, voiceClip, index) => {
        if (voiceClip.startTime <= clip.startTime) {
          return index;
        }
        return bestIndex;
      }, -1);

      let at_scene = overlappingSceneIndex;
      if (at_scene === -1) {
        at_scene = latestStartedSceneIndex;
      }
      if (at_scene === -1) {
        at_scene = 0;
      }

      return {
        at_scene,
        file: clip.bgmFile as string,
      };
    });

  return {
    scenes,
    bgm_sequence,
  };
}
