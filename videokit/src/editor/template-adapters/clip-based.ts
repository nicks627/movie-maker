import { Clip, createClipsFromProjectData } from '../../types';
import { NormalizedVideoScript } from '../../script/normalize';
import { EditorTemplateAdapter } from './types';

export const clipBasedEditorAdapter: EditorTemplateAdapter = {
  id: 'clip-based',
  label: 'Clip-Based Timeline',
  supportsClipTimeline: true,
  createInitialClips: (config: NormalizedVideoScript, numLayers: number) => {
    const directClips = Array.isArray(config.props.clips)
      ? (config.props.clips as Clip[])
      : null;

    const clips = directClips?.length
      ? directClips
      : createClipsFromProjectData({
          scenes: Array.isArray(config.props.scenes) ? config.props.scenes : [],
          bgm_sequence: Array.isArray(config.props.bgm_sequence) ? config.props.bgm_sequence : [],
        });

    return clips.map((clip) =>
      clip.type === 'bgm' ? { ...clip, layer: numLayers - 1 } : clip
    );
  },
  buildPreviewProps: (config: NormalizedVideoScript, clips: Clip[]) => ({
    ...config.props,
    bgmVolume: config.props.bgmVolume ?? 0.15,
    characterScale: config.props.characterScale ?? 0,
    enablePopups: config.props.enablePopups ?? true,
    enableTransitions: config.props.enableTransitions ?? true,
    clips: clips.length > 0 ? clips : config.props.clips,
    scenes: clips.length > 0 ? undefined : config.props.scenes,
    timeline: config.props.timeline,
    template: config.props.template,
    output: config.props.output,
    project: config.props.project,
  }),
};
