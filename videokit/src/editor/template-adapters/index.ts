import { resolveTemplate } from '../../templates';
import { clipBasedEditorAdapter } from './clip-based';
import { readOnlyEditorAdapter } from './read-only';
import { EditorTemplateAdapter } from './types';

const editorTemplateAdapters: Record<string, EditorTemplateAdapter> = {
  [clipBasedEditorAdapter.id]: clipBasedEditorAdapter,
  [readOnlyEditorAdapter.id]: readOnlyEditorAdapter,
};

export const resolveEditorTemplateAdapter = (templateId?: string): EditorTemplateAdapter => {
  const template = resolveTemplate(templateId);
  return editorTemplateAdapters[template.editorAdapterId] ?? clipBasedEditorAdapter;
};
