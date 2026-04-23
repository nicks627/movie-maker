import currentScriptData from '../data/script.json';
import explainerSampleData from '../data/explainer.sample.json';
import gameplaySampleData from '../data/gameplay-commentary.sample.json';
import lineChatSampleData from '../data/line-chat.sample.json';

export type EditorStarterId = 'explainer' | 'gameplay' | 'line-chat' | 'current';

export type EditorStarterDefinition = {
  id: EditorStarterId;
  title: string;
  shortLabel: string;
  description: string;
  templateId?: string;
  variantHint?: 'long' | 'short';
  accentClassName: string;
};

export const editorStarterCatalog: EditorStarterDefinition[] = [
  {
    id: 'explainer',
    title: '解説動画',
    shortLabel: 'Explainer',
    description: '背景と字幕で見せる汎用の解説動画スターターを開きます。',
    templateId: 'yukkuri-explainer',
    variantHint: 'long',
    accentClassName: 'from-amber-300 via-orange-400 to-rose-500',
  },
  {
    id: 'gameplay',
    title: 'ゲーム実況',
    shortLabel: 'Gameplay',
    description: 'ゲーム映像と実況字幕を重ねるサンプルを開きます。',
    templateId: 'game-play-commentary',
    variantHint: 'long',
    accentClassName: 'from-lime-300 via-emerald-400 to-cyan-500',
  },
  {
    id: 'line-chat',
    title: 'LINEチャット',
    shortLabel: 'LINE Chat',
    description: '縦型のチャットドラマ用サンプルを開きます。',
    templateId: 'line-chat',
    accentClassName: 'from-sky-300 via-cyan-400 to-blue-500',
  },
  {
    id: 'current',
    title: 'その他',
    shortLabel: 'Current Script',
    description: 'いまの `src/data/script.json` をそのまま開きます。',
    accentClassName: 'from-slate-300 via-slate-400 to-slate-500',
  },
];

const starterMap: Record<EditorStarterId, unknown> = {
  explainer: explainerSampleData,
  gameplay: gameplaySampleData,
  'line-chat': lineChatSampleData,
  current: currentScriptData,
};

export const resolveStarterFromSearch = (
  search: string | undefined
): EditorStarterId | null => {
  const params = new URLSearchParams(search ?? '');
  const requested = params.get('starter');
  if (
    requested === 'explainer' ||
    requested === 'gameplay' ||
    requested === 'line-chat' ||
    requested === 'current'
  ) {
    return requested;
  }

  return null;
};

export const resolveStarterScriptData = (starter: EditorStarterId | null | undefined): unknown => {
  return starter ? starterMap[starter] : currentScriptData;
};

export const resolveStarterDefinition = (
  starter: EditorStarterId | null | undefined
): EditorStarterDefinition => {
  return editorStarterCatalog.find((item) => item.id === starter) ?? editorStarterCatalog[3];
};
