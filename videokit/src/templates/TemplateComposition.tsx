import React from 'react';
import { VideoCompositionProps } from '../script/schema';
import { resolveTemplate } from './index';

export const TemplateComposition: React.FC<VideoCompositionProps> = (props) => {
  const template = resolveTemplate(props.template?.id);
  const Component = template.Component;

  return <Component {...props} />;
};
