import React from 'react';
import { OutputPresetId } from '../script/presets';
import { VideoCompositionProps } from '../script/schema';

export type TemplateDefinition = {
  id: string;
  label: string;
  defaultOutputPreset: OutputPresetId;
  editorAdapterId: string;
  Component: React.FC<VideoCompositionProps>;
  resolveDurationInFrames?: (props: VideoCompositionProps) => number;
};
