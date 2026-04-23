import { Clip, ProjectScene } from '../../types';

export const getDurationFromScenes = (scenes?: ProjectScene[]) => {
  if (!scenes?.length) {
    return 60;
  }

  const maxEndFrame = scenes.reduce((max, scene) => {
    const endFrame = (scene.startTime ?? 0) + (scene.duration ?? 90);
    return Math.max(max, endFrame);
  }, 0);

  return Math.max(maxEndFrame + 60, 60);
};

export const getDurationFromClips = (clips?: Clip[]) => {
  if (!clips?.length) {
    return 60;
  }

  const maxEndFrame = clips.reduce((max, clip) => {
    return Math.max(max, clip.startTime + clip.duration);
  }, 0);

  return Math.max(maxEndFrame + 60, 60);
};
