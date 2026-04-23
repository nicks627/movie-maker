import { z } from 'zod';
import { OUTPUT_PRESETS } from './presets';

export const outputPresetSchema = z.enum(
  Object.keys(OUTPUT_PRESETS) as [keyof typeof OUTPUT_PRESETS, ...(keyof typeof OUTPUT_PRESETS)[]]
);

export const outputSchema = z.object({
  preset: outputPresetSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().int().positive().optional(),
  safeArea: z.object({
    top: z.number().int().nonnegative().optional(),
    right: z.number().int().nonnegative().optional(),
    bottom: z.number().int().nonnegative().optional(),
    left: z.number().int().nonnegative().optional(),
  }).partial().optional(),
}).partial();

export const templateSchema = z.object({
  id: z.string().default('yukkuri-explainer'),
  variant: z.string().optional(),
}).partial();

export const gameplaySegmentSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  chapter: z.string().optional(),
  speaker: z.string().optional(),
  text: z.string().optional(),
  speechText: z.string().optional(),
  subtitleBeats: z.array(z.string()).optional(),
  startTime: z.number().int().nonnegative().optional(),
  duration: z.number().int().positive().optional(),
  video: z.string().optional(),
  trimBefore: z.number().int().nonnegative().optional(),
  trimAfter: z.number().int().nonnegative().optional(),
  sourceStartFrame: z.number().int().nonnegative().optional(),
  sourceDuration: z.number().int().positive().optional(),
  voiceFile: z.string().optional(),
  voiceBlobUrl: z.string().optional(),
  playbackRate: z.number().positive().optional(),
  emphasis: z.enum(['normal', 'hype', 'panic', 'boss', 'calm', 'victory']).optional(),
  subtitleStyle: z.any().optional(),
  se: z.any().optional(),
  popups: z.any().optional(),
  focusX: z.number().min(0).max(100).optional(),
  focusY: z.number().min(0).max(100).optional(),
  zoom: z.number().min(1).max(2.5).optional(),
  sceneRole: z.string().optional(),
  analysisTags: z.array(z.string()).optional(),
  sourceSegmentId: z.string().optional(),
  draftLayer: z.string().optional(),
}).passthrough();

export const gameplayTimelineSchema = z.object({
  title: z.string().optional(),
  series: z.string().optional(),
  video: z.string().optional(),
  streamerName: z.string().optional(),
  streamerHandle: z.string().optional(),
  accentColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  facecamImage: z.string().optional(),
  playGameplayAudio: z.boolean().optional(),
  showProgress: z.boolean().optional(),
  showTimer: z.boolean().optional(),
  segments: z.array(gameplaySegmentSchema).optional(),
}).passthrough();

export const compositionInputSchema = z.object({
  bgmVolume: z.number().min(0).max(1).default(0.15),
  voiceVolume: z.number().min(0).max(2).default(1),
  seVolume: z.number().min(0).max(2).default(0.9),
  voiceDucking: z.number().min(0).max(1).default(0.58),
  duckFadeFrames: z.number().int().min(0).max(90).default(12),
  masterVolume: z.number().positive().max(2).default(1),
  characterScale: z.number().min(0).max(1.5).default(0),
  enablePopups: z.boolean().default(true),
  enableTransitions: z.boolean().default(true),
  scenes: z.any().optional(),
  bgm_sequence: z.any().optional(),
  clips: z.any().optional(),
  output: outputSchema.optional(),
  template: templateSchema.optional(),
  project: z.any().optional(),
  timeline: z.object({
    scenes: z.any().optional(),
    bgm: z.any().optional(),
    gameplay: gameplayTimelineSchema.optional(),
  }).passthrough().optional(),
}).passthrough();

export const canonicalVideoScriptSchema = z.object({
  project: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    version: z.number().optional(),
    defaultLocale: z.string().optional(),
    defaultVariant: z.enum(['short', 'long']).optional(),
  }).partial().optional(),
  renderVariant: z.enum(['short', 'long']).optional(),
  activeVariant: z.enum(['short', 'long']).optional(),
  output: outputSchema.optional(),
  template: templateSchema.optional(),
  audio: z.object({
    bgmVolume: z.number().min(0).max(1).optional(),
    voiceVolume: z.number().min(0).max(2).optional(),
    seVolume: z.number().min(0).max(2).optional(),
    voiceDucking: z.number().min(0).max(1).optional(),
    duckFadeFrames: z.number().int().min(0).max(90).optional(),
    masterVolume: z.number().positive().optional(),
  }).partial().optional(),
  timeline: z.object({
    scenes: z.any().optional(),
    bgm: z.array(z.object({
      atScene: z.number().int().nonnegative(),
      file: z.string(),
    })).optional(),
    gameplay: gameplayTimelineSchema.optional(),
  }).partial().optional(),
  clips: z.any().optional(),
  short: z.any().optional(),
  long: z.any().optional(),
}).passthrough();

export type VideoCompositionProps = z.infer<typeof compositionInputSchema>;
export type CanonicalVideoScript = z.infer<typeof canonicalVideoScriptSchema>;
