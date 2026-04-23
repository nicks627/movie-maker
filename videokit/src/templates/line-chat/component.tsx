import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { VideoCompositionProps } from '../../script/schema';
import { Subtitle } from '../../components/Subtitle';
import { getBottomSubtitleText } from '../../components/subtitle-source';
import { LineChatMember, ResolvedLineChatData, resolveLineChatTemplateData } from './model';

const LINE_CHAT_SUBTITLE_STYLE = {
  fontSize: 72,
  backgroundColor: 'rgba(2, 6, 23, 0.82)',
  borderRadius: 26,
  padding: 22,
};

const findMember = (data: ResolvedLineChatData, sender: string): LineChatMember | undefined => {
  if (sender === 'me' || sender === data.myName) {
    return {
      name: data.myName,
      avatar: data.myAvatar,
      color: '#06C755',
    };
  }

  if (data.mode === 'dm') {
    return {
      name: data.partnerName ?? sender,
      avatar: data.partnerAvatar,
      color: data.partnerColor,
    };
  }

  return data.members.find((member) => member.name === sender);
};

const Avatar: React.FC<{ name: string; color: string; imageFile?: string; size: number }> = ({
  name,
  color,
  imageFile,
  size,
}) => {
  const initials = name.slice(0, 2) || '?';

  if (imageFile) {
    return (
      <Img
        src={staticFile(imageFile)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="40" fill={color} />
      <text x="40" y="50" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">
        {initials}
      </text>
    </svg>
  );
};

const TypingBubble: React.FC<{ align: 'left' | 'right'; xOffset?: number }> = ({ align, xOffset = 0 }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        marginLeft: align === 'left' ? xOffset : 0,
        marginRight: align === 'right' ? xOffset : 0,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 20px',
          borderRadius: 24,
          background: '#ffffff',
          boxShadow: '0 12px 20px rgba(15,23,42,0.10)',
        }}
      >
        {[0, 1, 2].map((dot) => (
          <div
            key={dot}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#94a3b8',
              transform: `translateY(${Math.sin(frame * 0.3 + dot * 1.0) * -6}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{
  data: ResolvedLineChatData;
  message: ResolvedLineChatData['messages'][number];
  previousSender?: string;
}> = ({ data, message, previousSender }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isMe = message.sender === 'me' || message.sender === data.myName;
  const sender = findMember(data, message.sender);
  const isGrouped = previousSender === message.sender;
  const reveal = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.9 },
  });
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bubbleColor = isMe ? '#06C755' : '#FFFFFF';
  const bubbleTextColor = isMe ? '#FFFFFF' : '#111111';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        gap: 12,
        marginBottom: 12,
        opacity,
        transform: `translateY(${(1 - reveal) * 24}px)`,
      }}
    >
      {!isMe ? (
        <div style={{ width: 48, display: 'flex', justifyContent: 'center' }}>
          {!isGrouped ? (
            <Avatar
              name={sender?.name ?? message.sender}
              color={sender?.color ?? '#38BDF8'}
              imageFile={sender?.avatar}
              size={48}
            />
          ) : (
            <div style={{ width: 48 }} />
          )}
        </div>
      ) : null}

      <div
        style={{
          maxWidth: '72%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMe ? 'flex-end' : 'flex-start',
        }}
      >
        {!isMe && data.mode === 'group' && !isGrouped ? (
          <div
            style={{
              marginLeft: 4,
              marginBottom: 4,
              color: sender?.color ?? '#475569',
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'sans-serif',
            }}
          >
            {sender?.name ?? message.sender}
          </div>
        ) : null}

        <div
          style={{
            padding: '16px 18px',
            borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
            background: bubbleColor,
            color: bubbleTextColor,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            lineHeight: 1.38,
            boxShadow: '0 12px 20px rgba(15,23,42,0.10)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.text}
        </div>

        <div
          style={{
            marginTop: 6,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            color: isMe ? '#16a34a' : 'rgba(15,23,42,0.52)',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'sans-serif',
          }}
        >
          {isMe && message.readReceipt ? <span>{message.readReceipt}</span> : null}
          {message.timestamp ? <span>{message.timestamp}</span> : null}
          {message.reaction ? <span style={{ fontSize: 20 }}>{message.reaction}</span> : null}
        </div>
      </div>
    </div>
  );
};

export const LineChatTemplate: React.FC<VideoCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const data = resolveLineChatTemplateData(props);
  const hasVoiceSubtitles = data.messages.some((message) => message.voiceFile);
  const headerTitle = data.mode === 'group' ? data.groupName || 'グループ' : data.roomName;
  const partnerForHeader = data.mode === 'group'
    ? { name: headerTitle, avatar: data.groupIcon, color: '#38BDF8' }
    : { name: data.partnerName ?? '相手', avatar: data.partnerAvatar, color: data.partnerColor };

  const chatRows = data.messages.map((message, index) => {
    const isVisible = frame >= message.revealFrame;
    const typingVisible =
      message.typingFrames > 0 &&
      frame >= message.revealFrame - message.typingFrames &&
      frame < message.revealFrame;

    return {
      key: message.id,
      revealFrame: message.revealFrame,
      typingVisible,
      content: isVisible ? (
        <Sequence key={message.id} from={message.revealFrame} durationInFrames={message.duration}>
          <MessageBubble
            data={data}
            message={message}
            previousSender={data.messages[index - 1]?.sender}
          />
        </Sequence>
      ) : null,
      typing: typingVisible ? (
        <TypingBubble
          key={`${message.id}_typing`}
          align={message.sender === 'me' || message.sender === data.myName ? 'right' : 'left'}
          xOffset={message.sender === 'me' || message.sender === data.myName ? 0 : 60}
        />
      ) : null,
    };
  });

  let visibleIndex = -1;
  data.messages.forEach((message, index) => {
    if (frame >= message.revealFrame) {
      visibleIndex = index;
    }
  });
  const scrollProgress = visibleIndex <= 2 ? 0 : Math.min(1, (visibleIndex - 2) / Math.max(1, data.messages.length - 3));
  const scrollY = interpolate(scrollProgress, [0, 1], [0, Math.max(0, height * 0.34)], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const activeVoiceMessage = data.messages.find((message) => {
    if (!message.voiceFile) {
      return false;
    }

    return frame >= message.revealFrame && frame < message.revealFrame + message.duration;
  });
  const activeSubtitleText = activeVoiceMessage
    ? getBottomSubtitleText(activeVoiceMessage)
    : '';

  return (
    <AbsoluteFill style={{ backgroundColor: data.bgColor, fontFamily: 'sans-serif' }}>
      <div
        style={{
          height: 88,
          background: '#00B900',
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 22px',
          color: 'white',
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900 }}>←</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            name={partnerForHeader.name}
            color={partnerForHeader.color}
            imageFile={partnerForHeader.avatar}
            size={56}
          />
          <div style={{ fontSize: 30, fontWeight: 900 }}>{headerTitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 18, fontSize: 26, fontWeight: 900 }}>
          <span>⌕</span>
          <span>☰</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 88,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 18%), linear-gradient(135deg, rgba(255,255,255,0.06) 25%, transparent 25%)',
          backgroundSize: '100% 100%, 48px 48px',
        }}
      >
        <div
          style={{
            padding: `26px 22px ${hasVoiceSubtitles ? 280 : 80}px`,
            transform: `translateY(${-scrollY}px)`,
          }}
        >
          {chatRows.map((row) => (
            <React.Fragment key={row.key}>
              {row.typing}
              {row.content}
            </React.Fragment>
          ))}
        </div>
      </div>

      {data.messages.map((message) =>
        message.voiceFile ? (
          <Sequence key={`${message.id}_audio`} from={message.revealFrame} durationInFrames={message.duration}>
            <Audio src={staticFile(`voices/${message.voiceFile}`)} />
          </Sequence>
        ) : null
      )}

      {activeSubtitleText ? (
        <Subtitle
          character={activeVoiceMessage?.sender ?? 'line-chat'}
          text={activeSubtitleText}
          durationInFrames={activeVoiceMessage?.duration ?? 90}
          style={LINE_CHAT_SUBTITLE_STYLE}
          positionY={4.2}
          maxWidthPct={88}
          maxHeightPct={14}
        />
      ) : null}
    </AbsoluteFill>
  );
};
