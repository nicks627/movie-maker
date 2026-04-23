import { Clip } from '../../types';
import { NormalizedVideoScript } from '../../script/normalize';
import { VideoCompositionProps } from '../../script/schema';

export type EditorTemplateAdapter = {
  id: string;
  label: string;
  supportsClipTimeline: boolean;
  createInitialClips: (config: NormalizedVideoScript, numLayers: number) => Clip[];
  buildPreviewProps: (config: NormalizedVideoScript, clips: Clip[]) => VideoCompositionProps;
};
