export type SpeakerEngine = 'voicevox' | 'aquestalk';

export type SpeakerMeta = {
  key: string;
  label: string;
  engine: SpeakerEngine;
  styleId?: number;
  defaultEmotion: string;
  side: 'left' | 'right';
  quickLabel: string;
  emoji: string;
  theme: 'rose' | 'emerald' | 'amber' | 'red' | 'yellow' | 'violet' | 'sky' | 'cyan' | 'lime' | 'indigo' | 'pink' | 'slate';
  quickAdd?: boolean;
  aquestalkBas?: number;
  aquestalkBasePitch?: number;
};

export const SPEAKER_OPTIONS: SpeakerMeta[] = [
  { key: 'metan', label: '四国めたん', engine: 'voicevox', styleId: 2, defaultEmotion: '通常', side: 'left', quickLabel: 'めたん', emoji: '👩‍💼', theme: 'rose', quickAdd: true },
  { key: 'zundamon', label: 'ずんだもん', engine: 'voicevox', styleId: 3, defaultEmotion: '無', side: 'right', quickLabel: 'ずんだもん', emoji: '🥦', theme: 'emerald', quickAdd: true },
  { key: 'tsumugi', label: '春日部つむぎ', engine: 'voicevox', styleId: 8, defaultEmotion: 'ノーマル', side: 'left', quickLabel: 'つむぎ', emoji: '🧢', theme: 'amber', quickAdd: true },
  { key: 'himari', label: '冥鳴ひまり', engine: 'voicevox', styleId: 14, defaultEmotion: 'ノーマル', side: 'left', quickLabel: 'ひまり', emoji: '🌙', theme: 'violet', quickAdd: true },
  { key: 'hau', label: '雨晴はう', engine: 'voicevox', styleId: 10, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'はう', emoji: '☀️', theme: 'sky', quickAdd: true },
  { key: 'sora', label: '九州そら', engine: 'voicevox', styleId: 16, defaultEmotion: 'ノーマル', side: 'left', quickLabel: 'そら', emoji: '☁️', theme: 'cyan', quickAdd: true },
  { key: 'kiritan', label: '東北きりたん', engine: 'voicevox', styleId: 108, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'きりたん', emoji: '🎋', theme: 'red', quickAdd: true },
  { key: 'zunko', label: '東北ずん子', engine: 'voicevox', styleId: 107, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'ずん子', emoji: '🫛', theme: 'lime' },
  { key: 'itako', label: '東北イタコ', engine: 'voicevox', styleId: 109, defaultEmotion: 'ノーマル', side: 'left', quickLabel: 'イタコ', emoji: '🦊', theme: 'pink' },
  { key: 'whitecul', label: 'WhiteCUL', engine: 'voicevox', styleId: 23, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'WhiteCUL', emoji: '❄️', theme: 'slate' },
  { key: 'usagi', label: '中国うさぎ', engine: 'voicevox', styleId: 61, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'うさぎ', emoji: '🐰', theme: 'pink' },
  { key: 'ryusei', label: '青山龍星', engine: 'voicevox', styleId: 13, defaultEmotion: 'ノーマル', side: 'right', quickLabel: '龍星', emoji: '🐉', theme: 'indigo' },
  { key: 'sayo', label: '小夜/SAYO', engine: 'voicevox', styleId: 46, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'SAYO', emoji: '🌃', theme: 'sky' },
  { key: 'mico', label: '櫻歌ミコ', engine: 'voicevox', styleId: 43, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'ミコ', emoji: '🎀', theme: 'rose' },
  { key: 'zonko_jikkyofuu', label: 'ぞん子（実況風）', engine: 'voicevox', styleId: 93, defaultEmotion: 'ノーマル', side: 'right', quickLabel: 'ぞん子', emoji: '🎮', theme: 'amber', quickAdd: true },
  { key: 'reimu', label: 'ゆっくり霊夢', engine: 'aquestalk', defaultEmotion: '普通', side: 'right', quickLabel: '霊夢', emoji: '🏮', theme: 'red', quickAdd: true, aquestalkBas: 0, aquestalkBasePitch: 100 },
  { key: 'marisa', label: 'ゆっくり魔理沙', engine: 'aquestalk', defaultEmotion: '普通', side: 'left', quickLabel: '魔理沙', emoji: '🧹', theme: 'yellow', quickAdd: true, aquestalkBas: 1, aquestalkBasePitch: 100 },
];

export const SPEAKER_MAP: Record<string, SpeakerMeta> = Object.fromEntries(
  SPEAKER_OPTIONS.map((speaker) => [speaker.key, speaker])
);

export const getSpeakerMeta = (speaker?: string) => {
  if (!speaker) {
    return SPEAKER_MAP.zundamon;
  }

  return SPEAKER_MAP[speaker] ?? SPEAKER_MAP.zundamon;
};

export const isAquesTalkSpeaker = (speaker?: string) => {
  return getSpeakerMeta(speaker).engine === 'aquestalk';
};

export const isLeftSpeaker = (speaker?: string) => {
  return getSpeakerMeta(speaker).side === 'left';
};
