import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ProjectLongData, ProjectPopup } from '../../types';
import { VideoCompositionProps } from '../../script/schema';
import { getSpeakerMeta } from '../../voice/speakers';
import {
  NormalizedGameplaySegment,
  resolveGameplayTemplateData,
} from './model';
import { Subtitle } from '../../components/Subtitle';
import { getBottomSubtitleText } from '../../components/subtitle-source';

const SPEAKER_AVATARS: Record<string, string> = {
  metan: 'metan.png',
  zundamon: 'zundamon.png',
  reimu: 'reimu.svg',
  marisa: 'marisa.svg',
};

const emphasisTone = (accentColor: string, emphasis: NormalizedGameplaySegment['emphasis']) => {
  switch (emphasis) {
    case 'hype':
      return { accent: '#fb7185', glow: 'rgba(251,113,133,0.45)' };
    case 'panic':
      return { accent: '#f97316', glow: 'rgba(249,115,22,0.42)' };
    case 'boss':
      return { accent: '#facc15', glow: 'rgba(250,204,21,0.4)' };
    case 'victory':
      return { accent: '#22c55e', glow: 'rgba(34,197,94,0.35)' };
    case 'calm':
      return { accent: '#38bdf8', glow: 'rgba(56,189,248,0.32)' };
    case 'normal':
    default:
      return { accent: accentColor, glow: 'rgba(34,197,94,0.3)' };
  }
};

const popupCardStyle = (popup: ProjectPopup): React.CSSProperties => ({
  position: 'absolute',
  left: `${popup.imageX ?? 75}%`,
  bottom: `${popup.imageY ?? 72}%`,
  width: `${popup.imageWidth ?? 18}%`,
  height: `${popup.imageHeight ?? 24}%`,
  transform: 'translateX(-50%) translateY(100%)',
  borderRadius: 24,
  overflow: 'hidden',
  border: '3px solid rgba(255,255,255,0.88)',
  boxShadow: '0 18px 40px rgba(0,0,0,0.38)',
  backgroundColor: 'rgba(2,6,23,0.8)',
});

const GameplayTextBadge: React.FC<{ popup: ProjectPopup; accent: string }> = ({ popup, accent }) => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const localFrame = frame - (popup.startOffset ?? 0);
  const text = typeof popup.props?.text === 'string' ? popup.props.text : '';
  const label = typeof popup.props?.label === 'string' ? popup.props.label : 'OCR';
  const tone = popup.props?.tone === 'info' ? 'info' : 'accent';

  if (localFrame < 0 || localFrame >= (popup.duration ?? fps * 3) || !text) {
    return null;
  }

  const reveal = spring({ frame: localFrame, fps, config: { damping: 14 } });
  const opacity = interpolate(localFrame, [0, 8, (popup.duration ?? fps * 3) - 8, popup.duration ?? fps * 3], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...popupCardStyle(popup),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 8,
        padding: '16px 18px',
        opacity,
        transform: `translateX(-50%) translateY(100%) scale(${0.9 + reveal * 0.1})`,
        border: `2px solid ${tone === 'accent' ? accent : 'rgba(255,255,255,0.42)'}`,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(2,6,23,0.92))',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: '0.08em',
          color: tone === 'accent' ? accent : '#93c5fd',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          lineHeight: 1.18,
          fontWeight: 800,
          color: '#f8fafc',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
};

const GameplayPopup: React.FC<{ popup: ProjectPopup; accent: string }> = ({ popup, accent }) => {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  const localFrame = frame - (popup.startOffset ?? 0);

  if (popup.component === 'GameplayTextBadge') {
    return <GameplayTextBadge popup={popup} accent={accent} />;
  }

  if (localFrame < 0 || localFrame >= (popup.duration ?? fps * 3) || !popup.image) {
    return null;
  }

  const reveal = spring({ frame: localFrame, fps, config: { damping: 14 } });
  const opacity = interpolate(localFrame, [0, 8, (popup.duration ?? fps * 3) - 8, popup.duration ?? fps * 3], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        ...popupCardStyle(popup),
        opacity,
        transform: `translateX(-50%) translateY(100%) scale(${0.9 + reveal * 0.1})`,
        boxShadow: `0 18px 40px rgba(0,0,0,0.38), 0 0 0 3px ${accent}22`,
      }}
    >
      <Img
        src={staticFile(popup.image)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
};

const CommentatorAvatar: React.FC<{
  speaker: string;
  facecamImage?: string;
  accent: string;
  isPortrait: boolean;
}> = ({ speaker, facecamImage, accent, isPortrait }) => {
  const src = facecamImage ?? SPEAKER_AVATARS[speaker];

  return (
    <div
      style={{
        width: isPortrait ? 148 : 124,
        height: isPortrait ? 148 : 124,
        borderRadius: 28,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.94))',
        border: `3px solid ${accent}`,
        boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 0 8px ${accent}16`,
        flexShrink: 0,
      }}
    >
      {src ? (
        <Img
          src={staticFile(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e2e8f0',
            fontSize: isPortrait ? 44 : 36,
            fontWeight: 900,
          }}
        >
          {speaker.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
};

const GameplayLowerThird: React.FC<{
  segment: NormalizedGameplaySegment;
  streamerName: string;
  streamerHandle?: string;
  facecamImage?: string;
  accentColor: string;
  showCommentatorAvatar: boolean;
}> = ({ segment, streamerName, streamerHandle, facecamImage, accentColor, showCommentatorAvatar }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const isPortrait = height > width;
  const reveal = spring({ frame, fps, config: { damping: 18 } });
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const displayText = getBottomSubtitleText(segment);
  const tone = emphasisTone(accentColor, segment.emphasis);
  const boxWidth = isPortrait ? '86%' : '78%';
  const speakerLabel = getSpeakerMeta(segment.speaker).label;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: isPortrait ? '6%' : '5.5%',
        width: boxWidth,
        transform: `translateX(-50%) translateY(${(1 - reveal) * 26}px)`,
        opacity,
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showCommentatorAvatar
            ? (isPortrait ? '148px 1fr' : '124px 1fr')
            : '1fr',
          gap: isPortrait ? 18 : 16,
          alignItems: 'center',
        }}
      >
        {showCommentatorAvatar ? (
          <CommentatorAvatar
            speaker={segment.speaker}
            facecamImage={facecamImage}
            accent={tone.accent}
            isPortrait={isPortrait}
          />
        ) : null}
        <div
          style={{
            borderRadius: 28,
            padding: isPortrait ? '22px 28px' : '18px 24px',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.88), rgba(2,6,23,0.92))',
            border: `3px solid ${tone.accent}`,
            boxShadow: `0 18px 40px rgba(0,0,0,0.45), 0 0 0 8px ${tone.glow}`,
            color: 'white',
            minHeight: isPortrait ? 152 : 126,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: isPortrait ? 28 : 22,
                  fontWeight: 900,
                  letterSpacing: '0.03em',
                }}
              >
                <span>{speakerLabel}</span>
                <span
                  style={{
                    fontSize: isPortrait ? 16 : 13,
                    padding: '4px 10px',
                    borderRadius: 999,
                    backgroundColor: `${tone.accent}22`,
                    border: `1px solid ${tone.accent}`,
                  }}
                >
                  LIVE COMMENTARY
                </span>
              </div>
              <div style={{ color: 'rgba(226,232,240,0.78)', fontSize: isPortrait ? 18 : 14, fontWeight: 700 }}>
                {streamerName}{streamerHandle ? `  ${streamerHandle}` : ''}
              </div>
            </div>
            <div
              style={{
                fontSize: isPortrait ? 16 : 13,
                color: tone.accent,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {segment.title}
            </div>
          </div>
          <div
            style={{
              fontSize: isPortrait ? 34 : 28,
              lineHeight: 1.28,
              fontWeight: 800,
              color: '#f8fafc',
              textShadow: '0 6px 20px rgba(15,23,42,0.45)',
              wordBreak: 'break-word',
            }}
          >
            {displayText}
          </div>
        </div>
      </div>
    </div>
  );
};

const SegmentHud: React.FC<{
  segment: NormalizedGameplaySegment;
  title: string;
  series?: string;
  accentColor: string;
  progress: number;
  showProgress: boolean;
  showTimer: boolean;
}> = ({ segment, title, series, accentColor, progress, showProgress, showTimer }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const isPortrait = height > width;
  const tone = emphasisTone(accentColor, segment.emphasis);
  const seconds = Math.floor(frame / fps);
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(2,6,23,0.52) 0%, transparent 26%, transparent 62%, rgba(2,6,23,0.62) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: isPortrait ? 42 : 34,
          left: isPortrait ? 34 : 44,
          right: isPortrait ? 34 : 44,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              alignSelf: 'flex-start',
              padding: isPortrait ? '10px 16px' : '8px 14px',
              borderRadius: 999,
              color: '#f8fafc',
              backgroundColor: 'rgba(2,6,23,0.72)',
              border: `1px solid ${tone.accent}`,
              boxShadow: `0 10px 30px ${tone.glow}`,
              fontSize: isPortrait ? 16 : 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: tone.accent }} />
            <span>GAMEPLAY TEMPLATE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ color: '#f8fafc', fontSize: isPortrait ? 32 : 28, fontWeight: 950 }}>
              {title}
            </div>
            {series ? (
              <div style={{ color: 'rgba(226,232,240,0.84)', fontSize: isPortrait ? 18 : 15, fontWeight: 700 }}>
                {series}
              </div>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div
            style={{
              padding: isPortrait ? '12px 16px' : '10px 14px',
              borderRadius: 22,
              backgroundColor: 'rgba(2,6,23,0.78)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#f8fafc',
              minWidth: isPortrait ? 210 : 190,
            }}
          >
            <div style={{ fontSize: isPortrait ? 15 : 12, color: tone.accent, fontWeight: 900, letterSpacing: '0.06em' }}>
              {segment.chapter ?? 'CURRENT SEGMENT'}
            </div>
            <div style={{ fontSize: isPortrait ? 22 : 18, fontWeight: 900, marginTop: 4 }}>
              {segment.title}
            </div>
          </div>
          {showTimer ? (
            <div
              style={{
                padding: isPortrait ? '8px 14px' : '7px 12px',
                borderRadius: 999,
                backgroundColor: 'rgba(2,6,23,0.72)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#f8fafc',
                fontSize: isPortrait ? 20 : 16,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {minutes}:{remainder}
            </div>
          ) : null}
        </div>
      </div>
      {showProgress ? (
        <div
          style={{
            position: 'absolute',
            left: isPortrait ? 34 : 44,
            right: isPortrait ? 34 : 44,
            bottom: isPortrait ? '2.8%' : '2.4%',
            height: isPortrait ? 10 : 8,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
            zIndex: 24,
          }}
        >
          <div
            style={{
              width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${tone.accent}, #f8fafc)`,
              boxShadow: `0 0 24px ${tone.glow}`,
            }}
          />
        </div>
      ) : null}
    </>
  );
};

const GameplayStage: React.FC<{
  segment: NormalizedGameplaySegment;
  accentColor: string;
  playGameplayAudio: boolean;
  totalDuration: number;
  title: string;
  series?: string;
  showHud: boolean;
  showProgress: boolean;
  showTimer: boolean;
}> = ({
  segment,
  accentColor,
  playGameplayAudio,
  totalDuration,
  title,
  series,
  showHud,
  showProgress,
  showTimer,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isPortrait = height > width;
  const tone = emphasisTone(accentColor, segment.emphasis);
  const zoom = segment.zoom ?? (isPortrait ? 1.15 : 1.06);
  const focusX = segment.focusX ?? 50;
  const focusY = segment.focusY ?? 50;
  const xShift = (50 - focusX) * 0.45;
  const yShift = (50 - focusY) * 0.32;

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {segment.video ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            transform: `scale(${zoom}) translate(${xShift}%, ${yShift}%)`,
            transformOrigin: 'center center',
          }}
        >
          <Video
            src={staticFile(segment.video)}
            trimBefore={segment.trimBefore}
            playbackRate={segment.playbackRate}
            muted={!playGameplayAudio}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      ) : (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at top, ${tone.accent}28 0%, transparent 38%), linear-gradient(180deg, #0f172a 0%, #020617 100%)`,
          }}
        />
      )}

      {showHud ? (
        <SegmentHud
          segment={segment}
          title={title}
          series={series}
          accentColor={accentColor}
          progress={(segment.startTime + frame) / totalDuration}
          showProgress={showProgress}
          showTimer={showTimer}
        />
      ) : null}

      {segment.popups.map((popup, index) => (
        <GameplayPopup key={`${segment.id}_popup_${index}`} popup={popup} accent={tone.accent} />
      ))}
    </AbsoluteFill>
  );
};

const resolveBgmDurations = (
  bgmSequence: ProjectLongData['bgm_sequence'] | undefined,
  segments: NormalizedGameplaySegment[]
) => {
  if (!bgmSequence?.length || !segments.length) {
    return [];
  }

  return bgmSequence
    .map((entry, index, sequence) => {
      const startSegment = segments[entry.at_scene];
      if (!startSegment) {
        return null;
      }

      const nextEntry = sequence[index + 1];
      const nextStart = nextEntry ? segments[nextEntry.at_scene]?.startTime : undefined;
      const endFrame = nextStart ?? segments[segments.length - 1].startTime + segments[segments.length - 1].duration;

      return {
        file: entry.file,
        from: startSegment.startTime,
        duration: Math.max(1, endFrame - startSegment.startTime),
      };
    })
    .filter((item): item is { file: string; from: number; duration: number } => item !== null);
};

export const GamePlayCommentaryTemplate: React.FC<VideoCompositionProps> = (props) => {
  const templateData = React.useMemo(() => resolveGameplayTemplateData(props), [props]);
  const totalDuration = templateData.segments.length
    ? templateData.segments.reduce((max, segment) => {
        return Math.max(max, segment.startTime + segment.duration);
      }, 0)
    : 60;
  const bgmTracks = React.useMemo(
    () => resolveBgmDurations(props.bgm_sequence as ProjectLongData['bgm_sequence'] | undefined, templateData.segments),
    [props.bgm_sequence, templateData.segments]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {bgmTracks.map((track) => (
        <Sequence key={`${track.file}_${track.from}`} from={track.from} durationInFrames={track.duration}>
          <Audio src={staticFile(`assets/bgm/${track.file}`)} volume={() => props.bgmVolume ?? 0.15} loop />
        </Sequence>
      ))}

      {templateData.segments.map((segment) => {
        const voiceSrc = segment.voiceBlobUrl ?? (segment.voiceFile ? staticFile(`voices/${segment.voiceFile}`) : null);
        const spokenSubtitleText = getBottomSubtitleText(segment);
        const subtitleStyle = {
          ...(templateData.subtitleStyle ?? {}),
          ...(segment.subtitleStyle ?? {}),
        };

        return (
          <Sequence key={segment.id} from={segment.startTime} durationInFrames={segment.duration}>
            <GameplayStage
              segment={segment}
              accentColor={templateData.accentColor}
              playGameplayAudio={templateData.playGameplayAudio}
              totalDuration={Math.max(totalDuration, 1)}
              title={templateData.title}
              series={templateData.series}
              showHud={templateData.showHud}
              showProgress={templateData.showHud && templateData.showProgress}
              showTimer={templateData.showHud && templateData.showTimer}
            />
            {templateData.displayMode === 'explainer' ? (
              <Subtitle
                character={segment.speaker}
                text={spokenSubtitleText}
                durationInFrames={segment.duration}
                style={subtitleStyle}
              />
            ) : (
              <GameplayLowerThird
                segment={segment}
                streamerName={templateData.streamerName}
                streamerHandle={templateData.streamerHandle}
                facecamImage={templateData.facecamImage}
                accentColor={templateData.accentColor}
                showCommentatorAvatar={templateData.showCommentatorAvatar}
              />
            )}
            {voiceSrc ? <Audio src={voiceSrc} playbackRate={segment.playbackRate} /> : null}
            {segment.se.map((entry, index) => (
              <Sequence key={`${segment.id}_se_${index}`} from={entry.startOffset ?? 0} durationInFrames={entry.duration ?? 36}>
                <Audio
                  src={staticFile(`assets/se/${entry.file}`)}
                  volume={() => (entry.volume ?? 0.8) * (props.seVolume ?? 1)}
                />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
