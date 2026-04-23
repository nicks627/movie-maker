import { Clip, ProjectLongData, ProjectScene } from '../types';
import { resolveTemplateDuration } from '../templates';
import { getDurationFromClips, getDurationFromScenes } from '../templates/shared/duration';
import {
  OUTPUT_PRESETS,
  OutputPresetId,
  ResolvedOutputSettings,
  getOrientationFromDimensions,
  inferPresetFromDimensions,
  resolveOutputPreset,
} from './presets';
import { CanonicalVideoScript, VideoCompositionProps } from './schema';

type LegacyVariant = {
  config?: {
    width?: number;
    height?: number;
    fps?: number;
  };
  bgm?: string;
  bgm_sequence?: ProjectLongData['bgm_sequence'];
  scenes?: ProjectScene[];
};

type LegacyRootScript = {
  project?: CanonicalVideoScript['project'];
  audio?: CanonicalVideoScript['audio'];
  renderVariant?: 'short' | 'long';
  activeVariant?: 'short' | 'long';
  template?: CanonicalVideoScript['template'];
  output?: CanonicalVideoScript['output'];
  short?: LegacyVariant;
  long?: LegacyVariant;
};

export type NormalizedVideoScript = {
  variant: 'short' | 'long';
  project: CanonicalVideoScript['project'];
  template: {
    id: string;
    variant?: string;
  };
  output: ResolvedOutputSettings;
  props: VideoCompositionProps;
  durationInFrames: number;
};

type NormalizeOptions = {
  forceVariant?: boolean;
};

const DEFAULT_TEMPLATE_ID = 'yukkuri-explainer';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isCanonicalScript = (value: unknown): value is CanonicalVideoScript => {
  return isObject(value) && ('timeline' in value || 'output' in value || 'template' in value);
};

const hasLegacyVariants = (value: unknown): value is LegacyRootScript => {
  return isObject(value) && ('long' in value || 'short' in value);
};

const resolveOutput = (params: {
  output?: CanonicalVideoScript['output'];
  config?: LegacyVariant['config'];
  templateDefaultPreset?: OutputPresetId;
}): ResolvedOutputSettings => {
  const configWidth = params.config?.width;
  const configHeight = params.config?.height;
  const configFps = params.config?.fps;
  const inferredPreset = inferPresetFromDimensions(
    params.output?.width ?? configWidth,
    params.output?.height ?? configHeight
  );
  const presetId = resolveOutputPreset(
    params.output?.preset ?? inferredPreset ?? params.templateDefaultPreset ?? 'landscape-fhd'
  );
  const preset = OUTPUT_PRESETS[presetId];
  const width = params.output?.width ?? configWidth ?? preset.width;
  const height = params.output?.height ?? configHeight ?? preset.height;
  const fps = params.output?.fps ?? configFps ?? preset.fps;
  const safeArea = {
    top: params.output?.safeArea?.top ?? preset.safeArea.top,
    right: params.output?.safeArea?.right ?? preset.safeArea.right,
    bottom: params.output?.safeArea?.bottom ?? preset.safeArea.bottom,
    left: params.output?.safeArea?.left ?? preset.safeArea.left,
  };

  return {
    preset: presetId,
    width,
    height,
    fps,
    safeArea,
    orientation: getOrientationFromDimensions(width, height),
  };
};

const getSceneTimingText = (scene: ProjectScene) =>
  (scene.speechText ?? scene.text ?? scene.subtitleText ?? '').trim();

const estimateSceneDurationInFrames = (
  scene: ProjectScene,
  variant: 'short' | 'long'
) => {
  const text = getSceneTimingText(scene);
  const speedScale = Math.max(0.6, scene.speedScale ?? 1.6);
  const popupBonus = (scene.popups?.length ?? 0) * (variant === 'short' ? 8 : 12);
  const charsPerFrame = variant === 'short' ? 3.3 : 4.4;
  const baseFrames = Math.round((text.length * charsPerFrame) / speedScale);
  const minFrames = variant === 'short' ? 66 : 90;
  const maxFrames = variant === 'short' ? 180 : 360;

  return Math.min(maxFrames, Math.max(minFrames, baseFrames + popupBonus));
};

const normalizeSceneTimeline = (
  scenes: ProjectScene[] | undefined,
  variant: 'short' | 'long'
) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return [];
  }

  let cursor = 0;

  return scenes.map((scene) => {
    const duration =
      typeof scene.duration === 'number' && Number.isFinite(scene.duration) && scene.duration > 0
        ? scene.duration
        : estimateSceneDurationInFrames(scene, variant);
    const startTime =
      typeof scene.startTime === 'number' && Number.isFinite(scene.startTime) && scene.startTime >= 0
        ? scene.startTime
        : cursor;

    cursor = Math.max(cursor, startTime + duration);

    return {
      ...scene,
      duration,
      startTime,
    };
  });
};

const normalizeCanonicalScript = (
  source: CanonicalVideoScript,
  preferredVariant: 'short' | 'long',
  options: NormalizeOptions
): NormalizedVideoScript => {
  const template = {
    id: source.template?.id ?? DEFAULT_TEMPLATE_ID,
    variant: source.template?.variant,
  };
  const output = resolveOutput({
    output: source.output,
    templateDefaultPreset: 'landscape-fhd',
  });
  const normalizedScenes = Array.isArray(source.timeline?.scenes)
    ? normalizeSceneTimeline(source.timeline.scenes, preferredVariant)
    : undefined;
  const bgmSequence = (source.timeline?.bgm ?? []).map((entry) => ({
    at_scene: entry.atScene,
    file: entry.file,
  }));
  const props: VideoCompositionProps = {
    bgmVolume: source.audio?.bgmVolume ?? 0.15,
    voiceVolume: source.audio?.voiceVolume ?? 1,
    seVolume: source.audio?.seVolume ?? 0.9,
    voiceDucking: source.audio?.voiceDucking ?? 0.58,
    duckFadeFrames: source.audio?.duckFadeFrames ?? 12,
    masterVolume: source.audio?.masterVolume ?? 1,
    characterScale: 0,
    enablePopups: true,
    enableTransitions: true,
    clips: Array.isArray(source.clips) ? source.clips : undefined,
    scenes: normalizedScenes,
    bgm_sequence: bgmSequence,
    output,
    template,
    project: source.project,
    timeline: source.timeline,
  };
  const templateDuration = resolveTemplateDuration(template.id, props);
  const durationInFrames = templateDuration
    ?? (Array.isArray(props.clips) && props.clips.length > 0
      ? getDurationFromClips(props.clips as Clip[])
      : Array.isArray(normalizedScenes) && normalizedScenes.length > 0
      ? getDurationFromScenes(normalizedScenes)
      : 60);

  return {
    variant: options.forceVariant
      ? preferredVariant
      : source.activeVariant ?? source.renderVariant ?? source.project?.defaultVariant ?? preferredVariant,
    project: source.project,
    template,
    output,
    props,
    durationInFrames,
  };
};

const normalizeLegacyScript = (
  source: LegacyRootScript,
  preferredVariant: 'short' | 'long',
  options: NormalizeOptions
): NormalizedVideoScript => {
  const requestedVariant = options.forceVariant
    ? preferredVariant
    : source.activeVariant ?? source.renderVariant ?? source.project?.defaultVariant ?? preferredVariant;
  const hasRequestedVariant = requestedVariant === 'short' ? !!source.short : !!source.long;
  const variant = options.forceVariant
    ? requestedVariant
    : hasRequestedVariant
      ? requestedVariant
      : requestedVariant === 'short'
        ? (source.long ? 'long' : 'short')
        : (source.short ? 'short' : 'long');
  const selectedVariant = (variant === 'short' ? source.short : source.long) ?? source.long ?? source.short ?? {};
  const variantScopedOutput = options.forceVariant && source.output
    ? { ...source.output, preset: undefined }
    : source.output;
  const template = {
    id: source.template?.id ?? DEFAULT_TEMPLATE_ID,
    variant: source.template?.variant,
  };
  const output = resolveOutput({
    output: variantScopedOutput,
    config: selectedVariant.config,
    templateDefaultPreset: variant === 'short' ? 'portrait-fhd' : 'landscape-fhd',
  });
  const normalizedScenes = normalizeSceneTimeline(selectedVariant.scenes ?? [], variant);
  const props: VideoCompositionProps = {
    bgmVolume: source.audio?.bgmVolume ?? 0.15,
    voiceVolume: source.audio?.voiceVolume ?? 1,
    seVolume: source.audio?.seVolume ?? 0.9,
    voiceDucking: source.audio?.voiceDucking ?? 0.58,
    duckFadeFrames: source.audio?.duckFadeFrames ?? 12,
    masterVolume: source.audio?.masterVolume ?? 1,
    characterScale: (selectedVariant as { characterScale?: number }).characterScale ?? 0,
    enablePopups: true,
    enableTransitions: true,
    scenes: normalizedScenes,
    bgm_sequence: selectedVariant.bgm_sequence ?? (
      selectedVariant.bgm
        ? [{ at_scene: 0, file: selectedVariant.bgm }]
        : []
    ),
    output,
    template,
    project: source.project,
  };

  return {
    variant,
    project: source.project,
    template,
    output,
    props,
    durationInFrames: getDurationFromScenes(normalizedScenes),
  };
};

const normalizeDirectTimeline = (
  source: LegacyVariant,
  preferredVariant: 'short' | 'long'
): NormalizedVideoScript => {
  const output = resolveOutput({
    config: source.config,
    templateDefaultPreset: preferredVariant === 'short' ? 'portrait-fhd' : 'landscape-fhd',
  });
  const template = { id: DEFAULT_TEMPLATE_ID };
  const normalizedScenes = normalizeSceneTimeline(source.scenes ?? [], preferredVariant);
  const props: VideoCompositionProps = {
    bgmVolume: 0.15,
    voiceVolume: 1,
    seVolume: 0.9,
    voiceDucking: 0.58,
    duckFadeFrames: 12,
    masterVolume: 1,
    characterScale: 0,
    enablePopups: true,
    enableTransitions: true,
    scenes: normalizedScenes,
    bgm_sequence: source.bgm_sequence ?? [],
    output,
    template,
  };

  return {
    variant: preferredVariant,
    project: undefined,
    template,
    output,
    props,
    durationInFrames: getDurationFromScenes(normalizedScenes),
  };
};

export const normalizeProjectScript = (
  source: unknown,
  preferredVariant: 'short' | 'long' = 'long',
  options: NormalizeOptions = {}
): NormalizedVideoScript => {
  if (hasLegacyVariants(source)) {
    return normalizeLegacyScript(source, preferredVariant, options);
  }

  if (isCanonicalScript(source)) {
    return normalizeCanonicalScript(source, preferredVariant, options);
  }

  if (isObject(source) && ('scenes' in source || 'bgm_sequence' in source)) {
    return normalizeDirectTimeline(source as LegacyVariant, preferredVariant);
  }

  return normalizeDirectTimeline({}, preferredVariant);
};
