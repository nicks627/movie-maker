import './index.css';
import React from 'react';
import { Composition } from 'remotion';
import scriptData from './data/script.json';
import { normalizeProjectScript } from './script/normalize';
import { compositionInputSchema } from './script/schema';
import { TemplateComposition } from './templates/TemplateComposition';

export const mySchema = compositionInputSchema;

const resolvedActiveScript = normalizeProjectScript(scriptData, 'long');
const resolvedLongScript = normalizeProjectScript(scriptData, 'long', { forceVariant: true });
const resolvedShortScript = normalizeProjectScript(scriptData, 'short', { forceVariant: true });

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="YukkuriVideo"
        component={TemplateComposition}
        durationInFrames={resolvedActiveScript.durationInFrames}
        fps={resolvedActiveScript.output.fps}
        width={resolvedActiveScript.output.width}
        height={resolvedActiveScript.output.height}
        schema={mySchema}
        defaultProps={resolvedActiveScript.props}
      />
      <Composition
        id="YukkuriVideoLong"
        component={TemplateComposition}
        durationInFrames={resolvedLongScript.durationInFrames}
        fps={resolvedLongScript.output.fps}
        width={resolvedLongScript.output.width}
        height={resolvedLongScript.output.height}
        schema={mySchema}
        defaultProps={resolvedLongScript.props}
      />
      <Composition
        id="YukkuriVideoShort"
        component={TemplateComposition}
        durationInFrames={resolvedShortScript.durationInFrames}
        fps={resolvedShortScript.output.fps}
        width={resolvedShortScript.output.width}
        height={resolvedShortScript.output.height}
        schema={mySchema}
        defaultProps={resolvedShortScript.props}
      />
    </>
  );
};
