import { Clip } from '../../types';
import { NormalizedVideoScript } from '../../script/normalize';
import { EditorTemplateAdapter } from './types';

export const readOnlyEditorAdapter: EditorTemplateAdapter = {
  id: 'read-only',
  label: 'Read-Only Preview',
  supportsClipTimeline: false,
  createInitialClips: () => [],
  buildPreviewProps: (config: NormalizedVideoScript, clips: Clip[]) => ({
    ...config.props,
    clips: clips.length > 0 ? clips : config.props.clips,
    scenes: config.props.scenes,
    timeline: config.props.timeline,
    template: config.props.template,
    output: config.props.output,
    project: config.props.project,
  }),
};
