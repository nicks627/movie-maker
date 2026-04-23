import { GamePlayCommentaryTemplate } from './game-play-commentary/component';
import { getGameplayTemplateDuration } from './game-play-commentary/model';
import { LineChatTemplate } from './line-chat/component';
import { getLineChatTemplateDuration } from './line-chat/model';
import { YukkuriExplainerTemplate } from './yukkuri-explainer/component';
import { getYukkuriExplainerDuration } from './yukkuri-explainer/model';
import { TemplateDefinition } from './types';

const DEFAULT_TEMPLATE_ID = 'yukkuri-explainer';
const GAMEPLAY_TEMPLATE_ID = 'game-play-commentary';
const LINE_CHAT_TEMPLATE_ID = 'line-chat';

export const templateRegistry: Record<string, TemplateDefinition> = {
  [DEFAULT_TEMPLATE_ID]: {
    id: DEFAULT_TEMPLATE_ID,
    label: 'Yukkuri Explainer',
    defaultOutputPreset: 'landscape-fhd',
    editorAdapterId: 'clip-based',
    Component: YukkuriExplainerTemplate,
    resolveDurationInFrames: getYukkuriExplainerDuration,
  },
  [GAMEPLAY_TEMPLATE_ID]: {
    id: GAMEPLAY_TEMPLATE_ID,
    label: 'Game Play Commentary',
    defaultOutputPreset: 'landscape-fhd',
    editorAdapterId: 'clip-based',
    Component: GamePlayCommentaryTemplate,
    resolveDurationInFrames: getGameplayTemplateDuration,
  },
  [LINE_CHAT_TEMPLATE_ID]: {
    id: LINE_CHAT_TEMPLATE_ID,
    label: 'LINE Chat Drama',
    defaultOutputPreset: 'portrait-fhd',
    editorAdapterId: 'read-only',
    Component: LineChatTemplate,
    resolveDurationInFrames: getLineChatTemplateDuration,
  },
};

export const resolveTemplate = (templateId?: string): TemplateDefinition => {
  if (templateId && templateRegistry[templateId]) {
    return templateRegistry[templateId];
  }

  return templateRegistry[DEFAULT_TEMPLATE_ID];
};

export const resolveTemplateDuration = (
  templateId: string | undefined,
  props: Parameters<NonNullable<TemplateDefinition['resolveDurationInFrames']>>[0]
) => {
  const template = resolveTemplate(templateId);
  return template.resolveDurationInFrames?.(props);
};
