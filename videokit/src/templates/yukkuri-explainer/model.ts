import { Clip, ProjectScene } from '../../types';
import { VideoCompositionProps } from '../../script/schema';
import { getDurationFromClips, getDurationFromScenes } from '../shared/duration';

export const getYukkuriExplainerDuration = (
  props: Pick<VideoCompositionProps, 'clips' | 'scenes'>
) => {
  if (Array.isArray(props.clips) && props.clips.length > 0) {
    return getDurationFromClips(props.clips as Clip[]);
  }

  if (Array.isArray(props.scenes) && props.scenes.length > 0) {
    return getDurationFromScenes(props.scenes as ProjectScene[]);
  }

  return 60;
};
