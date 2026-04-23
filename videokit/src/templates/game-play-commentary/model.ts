import { ProjectPopup, ProjectScene, SoundEffect, SubtitleStyle } from '../../types';
import { VideoCompositionProps } from '../../script/schema';

type RawGameplaySegment = {
  id?: string;
  title?: string;
  chapter?: string;
  speaker?: string;
  text?: string;
  speechText?: string;
  subtitleBeats?: string[];
  startTime?: number;
  duration?: number;
  video?: string;
  trimBefore?: number;
  trimAfter?: number;
  sourceStartFrame?: number;
  sourceDuration?: number;
  voiceFile?: string;
  voiceBlobUrl?: string;
  playbackRate?: number;
  emphasis?: 'normal' | 'hype' | 'panic' | 'boss' | 'calm' | 'victory';
  subtitleStyle?: SubtitleStyle;
  se?: SoundEffect[];
  popups?: ProjectPopup[];
  focusX?: number;
  focusY?: number;
  zoom?: number;
  sceneRole?: string;
  analysisTags?: string[];
  sourceSegmentId?: string;
  draftLayer?: string;
};

type RawGameplayTimeline = {
  title?: string;
  series?: string;
  video?: string;
  streamerName?: string;
  streamerHandle?: string;
  accentColor?: string;
  secondaryColor?: string;
  facecamImage?: string;
  playGameplayAudio?: boolean;
  displayMode?: 'broadcast' | 'explainer';
  showHud?: boolean;
  showCommentatorAvatar?: boolean;
  subtitleStyle?: SubtitleStyle;
  showProgress?: boolean;
  showTimer?: boolean;
  segments?: RawGameplaySegment[];
};

export type NormalizedGameplaySegment = {
  id: string;
  title: string;
  chapter?: string;
  speaker: string;
  text: string;
  speechText?: string;
  subtitleBeats?: string[];
  startTime: number;
  duration: number;
  video?: string;
  trimBefore?: number;
  trimAfter?: number;
  voiceFile?: string;
  voiceBlobUrl?: string;
  playbackRate: number;
  emphasis: NonNullable<RawGameplaySegment['emphasis']>;
  subtitleStyle?: SubtitleStyle;
  se: SoundEffect[];
  popups: ProjectPopup[];
  focusX?: number;
  focusY?: number;
  zoom?: number;
  sceneRole?: string;
  analysisTags?: string[];
  sourceSegmentId?: string;
  draftLayer?: string;
};

export type NormalizedGameplayTemplateData = {
  title: string;
  series?: string;
  streamerName: string;
  streamerHandle?: string;
  accentColor: string;
  secondaryColor: string;
  facecamImage?: string;
  playGameplayAudio: boolean;
  displayMode: 'broadcast' | 'explainer';
  showHud: boolean;
  showCommentatorAvatar: boolean;
  subtitleStyle?: SubtitleStyle;
  showProgress: boolean;
  showTimer: boolean;
  segments: NormalizedGameplaySegment[];
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asGameplayTimeline = (value: unknown): RawGameplayTimeline | null => {
  if (!isObject(value)) {
    return null;
  }

  const gameplay = value.gameplay;
  if (!isObject(gameplay)) {
    return null;
  }

  return gameplay as RawGameplayTimeline;
};

const inferDuration = (segment: {
  duration?: number;
  sourceDuration?: number;
  text?: string;
  voiceFile?: string;
}) => {
  if (segment.duration && segment.duration > 0) {
    return segment.duration;
  }

  if (segment.sourceDuration && segment.sourceDuration > 0) {
    return segment.sourceDuration;
  }

  if (segment.voiceFile) {
    return 150;
  }

  const textLength = segment.text?.length ?? 0;
  return Math.max(90, 36 + textLength * 3);
};

const inferTitle = (segment: { title?: string; chapter?: string; text?: string }, index: number) => {
  if (segment.title?.trim()) {
    return segment.title.trim();
  }

  if (segment.chapter?.trim()) {
    return segment.chapter.trim();
  }

  if (segment.text?.trim()) {
    return segment.text.trim().slice(0, 28);
  }

  return `Segment ${index + 1}`;
};

const normalizeRawSegments = (
  segments: RawGameplaySegment[],
  fallbackVideo?: string
): NormalizedGameplaySegment[] => {
  let cursor = 0;

  return segments.map((segment, index) => {
    const startTime = segment.startTime ?? cursor;
    const duration = inferDuration(segment);
    const trimBefore = segment.trimBefore ?? segment.sourceStartFrame;
    const trimAfter = segment.trimAfter ?? (
      trimBefore !== undefined
        ? trimBefore + (segment.sourceDuration ?? duration)
        : undefined
    );

    cursor = Math.max(cursor, startTime + duration);

    return {
      id: segment.id ?? `gameplay_segment_${index}`,
      title: inferTitle(segment, index),
      chapter: segment.chapter,
      speaker: segment.speaker ?? 'commentary',
      text: segment.text ?? '',
      speechText: segment.speechText,
      subtitleBeats: segment.subtitleBeats,
      startTime,
      duration,
      video: segment.video ?? fallbackVideo,
      trimBefore,
      trimAfter,
      voiceFile: segment.voiceFile,
      voiceBlobUrl: segment.voiceBlobUrl,
      playbackRate: segment.playbackRate ?? 1,
      emphasis: segment.emphasis ?? 'normal',
      subtitleStyle: segment.subtitleStyle,
      se: segment.se ?? [],
      popups: segment.popups ?? [],
      focusX: segment.focusX,
      focusY: segment.focusY,
      zoom: segment.zoom,
      sceneRole: segment.sceneRole,
      analysisTags: segment.analysisTags,
      sourceSegmentId: segment.sourceSegmentId,
      draftLayer: segment.draftLayer,
    };
  });
};

const normalizeSceneFallback = (scenes: ProjectScene[]): NormalizedGameplaySegment[] => {
  return scenes.map((scene, index) => ({
    id: scene.id ?? `scene_${index}`,
    title: inferTitle(scene, index),
    chapter: scene.id,
    speaker: scene.speaker ?? 'commentary',
    text: scene.text ?? '',
    speechText: scene.speechText,
    subtitleBeats: undefined,
    startTime: scene.startTime ?? (index === 0 ? 0 : index * 150),
    duration: scene.duration ?? inferDuration(scene),
    video: scene.bg_video,
    trimBefore: undefined,
    trimAfter: undefined,
    voiceFile: scene.voiceFile,
    voiceBlobUrl: scene.voiceBlobUrl,
    playbackRate: 1,
    emphasis: 'normal',
    subtitleStyle: scene.subtitleStyle,
    se: scene.se ?? [],
    popups: scene.popups ?? [],
    focusX: undefined,
    focusY: undefined,
    zoom: undefined,
    sceneRole: undefined,
    analysisTags: undefined,
    sourceSegmentId: undefined,
    draftLayer: undefined,
  }));
};

export const resolveGameplayTemplateData = (
  props: VideoCompositionProps
): NormalizedGameplayTemplateData => {
  const gameplay = asGameplayTimeline(props.timeline);
  const explicitSegments = gameplay?.segments ?? [];
  const sceneFallback = Array.isArray(props.scenes) ? (props.scenes as ProjectScene[]) : [];
  const segments = explicitSegments.length > 0
    ? normalizeRawSegments(explicitSegments, gameplay?.video)
    : normalizeSceneFallback(sceneFallback);

  return {
    title: gameplay?.title ?? 'Gameplay Commentary',
    series: gameplay?.series,
    streamerName: gameplay?.streamerName ?? '実況プレイ',
    streamerHandle: gameplay?.streamerHandle,
    accentColor: gameplay?.accentColor ?? '#22c55e',
    secondaryColor: gameplay?.secondaryColor ?? '#0f172a',
    facecamImage: gameplay?.facecamImage,
    playGameplayAudio: gameplay?.playGameplayAudio ?? false,
    displayMode: gameplay?.displayMode ?? 'broadcast',
    showHud: gameplay?.showHud ?? ((gameplay?.displayMode ?? 'broadcast') !== 'explainer'),
    showCommentatorAvatar: gameplay?.showCommentatorAvatar ?? ((gameplay?.displayMode ?? 'broadcast') !== 'explainer'),
    subtitleStyle: gameplay?.subtitleStyle,
    showProgress: gameplay?.showProgress ?? (gameplay?.showHud ?? ((gameplay?.displayMode ?? 'broadcast') !== 'explainer')),
    showTimer: gameplay?.showTimer ?? (gameplay?.showHud ?? ((gameplay?.displayMode ?? 'broadcast') !== 'explainer')),
    segments,
  };
};

export const getGameplayTemplateDuration = (props: Pick<VideoCompositionProps, 'timeline' | 'scenes'>) => {
  const gameplay = asGameplayTimeline(props.timeline);

  if (gameplay?.segments?.length) {
    const segments = normalizeRawSegments(gameplay.segments, gameplay.video);
    const maxEnd = segments.reduce((max, segment) => Math.max(max, segment.startTime + segment.duration), 0);
    return Math.max(maxEnd + 30, 60);
  }

  if (Array.isArray(props.scenes) && props.scenes.length > 0) {
    const maxEnd = props.scenes.reduce((max, scene) => {
      return Math.max(max, (scene.startTime ?? 0) + (scene.duration ?? 90));
    }, 0);
    return Math.max(maxEnd + 30, 60);
  }

  return 60;
};
