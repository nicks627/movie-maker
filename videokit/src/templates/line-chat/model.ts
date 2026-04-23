import { VideoCompositionProps } from '../../script/schema';

export type ChatMode = 'dm' | 'group';

export type LineChatMember = {
  name: string;
  avatar?: string;
  color?: string;
};

export type LineChatMessage = {
  id: string;
  sender: string;
  text?: string;
  speechText?: string;
  sticker?: string;
  timestamp?: string;
  readReceipt?: string;
  typingFrames: number;
  revealFrame: number;
  duration: number;
  voiceFile?: string;
  reaction?: string;
};

export type ResolvedLineChatData = {
  mode: ChatMode;
  roomName: string;
  groupName?: string;
  groupIcon?: string;
  myName: string;
  myAvatar?: string;
  partnerName?: string;
  partnerAvatar?: string;
  partnerColor: string;
  bgColor: string;
  members: LineChatMember[];
  messages: LineChatMessage[];
};

const DEFAULT_COLORS = ['#FF6B6B', '#A78BFA', '#38BDF8', '#FB923C', '#34D399', '#F472B6'];

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

const toNumber = (value: unknown, fallback = 0) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asChatTimeline = (timeline: unknown) => {
  if (!isObject(timeline)) {
    return null;
  }

  const chat = timeline.chat;
  return isObject(chat) ? chat : null;
};

const normalizeMessages = (rawMessages: unknown[]) => {
  let cursor = 0;

  return rawMessages
    .filter(isObject)
    .map((message, index) => {
      const typingFrames = Math.max(0, toNumber(message.typingFrames, 0));
      const duration = Math.max(45, toNumber(message.duration, 90));
      const revealFrame = toNumber(message.revealFrame, cursor + typingFrames);
      cursor = revealFrame + duration;

      return {
        id: toString(message.id, `msg_${index + 1}`),
        sender: toString(message.sender, 'me'),
        text: typeof message.text === 'string' ? message.text : undefined,
        speechText: typeof message.speechText === 'string' ? message.speechText : undefined,
        sticker: typeof message.sticker === 'string' ? message.sticker : undefined,
        timestamp: typeof message.timestamp === 'string' ? message.timestamp : undefined,
        readReceipt: typeof message.readReceipt === 'string' ? message.readReceipt : undefined,
        typingFrames,
        revealFrame,
        duration,
        voiceFile: typeof message.voiceFile === 'string' ? message.voiceFile : undefined,
        reaction: typeof message.reaction === 'string' ? message.reaction : undefined,
      } satisfies LineChatMessage;
    });
};

const normalizeMembers = (rawMembers: unknown[]) => {
  return rawMembers
    .filter(isObject)
    .map((member, index) => ({
      name: toString(member.name, `member_${index + 1}`),
      avatar: typeof member.avatar === 'string' ? member.avatar : undefined,
      color: typeof member.color === 'string' ? member.color : DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
};

export const resolveLineChatTemplateData = (props: VideoCompositionProps): ResolvedLineChatData => {
  const chat = asChatTimeline(props.timeline) ?? {};
  const mode = toString(chat.mode, 'dm') === 'group' ? 'group' : 'dm';
  const members = normalizeMembers(Array.isArray(chat.members) ? chat.members : []);
  const partnerName = toString(chat.partnerName, '相手');
  const defaultMembers = members.length > 0
    ? members
    : mode === 'group'
      ? [{ name: partnerName, color: DEFAULT_COLORS[0] }]
      : [{ name: partnerName, avatar: toString(chat.partnerAvatar), color: toString(chat.partnerColor, DEFAULT_COLORS[2]) }];

  return {
    mode,
    roomName: toString(chat.roomName, partnerName || 'LINE'),
    groupName: toString(chat.groupName),
    groupIcon: toString(chat.groupIcon),
    myName: toString(chat.myName, '私'),
    myAvatar: toString(chat.myAvatar),
    partnerName,
    partnerAvatar: toString(chat.partnerAvatar),
    partnerColor: toString(chat.partnerColor, DEFAULT_COLORS[2]),
    bgColor: toString(chat.bgColor, '#B2DFDB'),
    members: defaultMembers,
    messages: normalizeMessages(Array.isArray(chat.messages) ? chat.messages : []),
  };
};

export const getLineChatTemplateDuration = (
  props: Pick<VideoCompositionProps, 'timeline'>
) => {
  const chat = asChatTimeline(props.timeline);
  const messages = normalizeMessages(Array.isArray(chat?.messages) ? chat.messages : []);

  if (messages.length === 0) {
    return 120;
  }

  const maxEnd = messages.reduce((max, message) => Math.max(max, message.revealFrame + message.duration), 0);
  return Math.max(maxEnd + 30, 120);
};
