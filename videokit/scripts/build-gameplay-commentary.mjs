/* eslint-env node */
/* global process, console */
import path from 'node:path';
import {
  CUT_MANIFEST_PATH,
  GENERATED_GAMEPLAY_SCRIPT_PATH,
  SCRIPT_OUTLINE_PATH,
  SCRIPT_PATH,
  dedupe,
  readJson,
  sanitizeStem,
  secondsToFrame,
  toProjectRelativeAsset,
  writeJson,
} from './gameplay-pipeline-utils.mjs';
import { buildGameplayAudioPlan, chooseBgmTrack, chooseSeForSegment } from './audio-asset-optimizer.mjs';
import { normalizeSpeechText, toDisplayText } from './text-normalization.mjs';

const SHORT_TARGET_SEC = 58;

const parseArgs = () => {
  const args = process.argv.slice(2);
  let input = null;
  let outline = SCRIPT_OUTLINE_PATH;
  let cutVideo = null;
  let cutManifest = CUT_MANIFEST_PATH;
  let output = GENERATED_GAMEPLAY_SCRIPT_PATH;
  let variant = 'long';
  let syncScriptJson = true;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--input' && args[index + 1]) {
      input = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--input=')) {
      input = arg.slice('--input='.length);
      continue;
    }
    if (arg === '--outline' && args[index + 1]) {
      outline = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--outline=')) {
      outline = arg.slice('--outline='.length);
      continue;
    }
    if (arg === '--cut-video' && args[index + 1]) {
      cutVideo = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--cut-video=')) {
      cutVideo = arg.slice('--cut-video='.length);
      continue;
    }
    if (arg === '--cut-manifest' && args[index + 1]) {
      cutManifest = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--cut-manifest=')) {
      cutManifest = arg.slice('--cut-manifest='.length);
      continue;
    }
    if (arg === '--output' && args[index + 1]) {
      output = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length);
      continue;
    }
    if (arg === '--variant' && args[index + 1]) {
      variant = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith('--variant=')) {
      variant = arg.slice('--variant='.length);
      continue;
    }
    if (arg === '--no-sync-script-json') {
      syncScriptJson = false;
    }
  }

  if (!input) {
    throw new Error('Missing required --input <video>.');
  }

  if (!cutVideo) {
    throw new Error('Missing required --cut-video <path>.');
  }

  if (!['long', 'short'].includes(variant)) {
    throw new Error('Variant must be long or short.');
  }

  return {
    input: path.resolve(input),
    outline: path.resolve(outline),
    cutVideo: path.resolve(cutVideo),
    cutManifest: path.resolve(cutManifest),
    output: path.resolve(output),
    variant,
    syncScriptJson,
  };
};

const weightForRole = (sceneRole) => {
  switch (sceneRole) {
    case 'victory':
      return 1.0;
    case 'risk':
      return 0.92;
    case 'escalation':
      return 0.86;
    case 'reaction':
      return 0.72;
    case 'context':
    default:
      return 0.48;
  }
};

const mapIntensityToEmphasis = (intensity, sceneRole) => {
  if (intensity === 'victory') return 'victory';
  if (intensity === 'panic') return 'panic';
  if (sceneRole === 'escalation') return 'boss';
  if (intensity === 'hype') return 'hype';
  if (intensity === 'calm') return 'calm';
  return 'normal';
};

const shortCandidateScore = (item) => {
  let score = weightForRole(item.sceneRole) * 100;
  if (item.intensity === 'panic') score += 24;
  if (item.intensity === 'victory') score += 18;
  if (item.intensity === 'hype') score += 12;
  if (item.banterType === 'panic-tsukkomi') score += 10;
  if (item.expectedCommentaryRole === 'comedy-beat') score += 8;
  if (item.sceneRole === 'reaction') score += 6;
  return score;
};

const chooseSegmentsForVariant = ({ variant, outlineItems, manifestById }) => {
  const approvedItems = outlineItems.filter((item) => item.approved !== false && item.keepRecommendation !== 'trim');
  if (variant === 'long') {
    return approvedItems;
  }

  const manifestItems = approvedItems
    .map((item) => ({ item, manifest: manifestById.get(item.sourceSegmentId) }))
    .filter((entry) => entry.manifest);
  if (manifestItems.length === 0) {
    return [];
  }

  const chosenIds = new Set();
  const addId = (id) => {
    if (id) chosenIds.add(id);
  };

  addId(manifestItems[0].item.sourceSegmentId);

  const victoryCandidate = manifestItems.find((entry) => entry.item.sceneRole === 'victory')
    ?? manifestItems[manifestItems.length - 1];
  addId(victoryCandidate.item.sourceSegmentId);

  const targetSourceCount = 3;
  const ranked = [...manifestItems].sort((left, right) => {
    const scoreDelta = shortCandidateScore(right.item) - shortCandidateScore(left.item);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    return left.manifest.cutStartSec - right.manifest.cutStartSec;
  });

  for (const entry of ranked) {
    if (chosenIds.has(entry.item.sourceSegmentId)) {
      continue;
    }

    addId(entry.item.sourceSegmentId);
    if (chosenIds.size >= targetSourceCount) {
      break;
    }
  }

  return approvedItems
    .filter((item) => chosenIds.has(item.sourceSegmentId))
    .sort((left, right) => left.sourceStartSec - right.sourceStartSec);
};

const pickOpening = (styleHints, fallback) => styleHints.openings?.[0] ?? fallback;

const pickReactionWord = (styleHints, index) => {
  const reactionWords = Array.isArray(styleHints.reactionWords) ? styleHints.reactionWords : [];
  return reactionWords[index % Math.max(reactionWords.length, 1)] ?? 'うわ';
};

const pickFailPhrase = (styleHints) => styleHints.failPhrases?.[0] ?? 'これは痛い';
const pickClosing = (styleHints, fallback) => styleHints.closings?.[0] ?? fallback;

const summarizeMentions = (mentions) => {
  const values = dedupe((mentions ?? []).filter(Boolean));
  if (values.length === 0) {
    return '画面の流れ';
  }
  if (values.length === 1) {
    return values[0];
  }
  return `${values[0]}と${values[1]}`;
};

const trimToLength = (value, maxChars) => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(1, maxChars - 1))}…`;
};

const normalizeCommentaryText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const fallbackLongLength = (styleHints, multiplier, minimum) =>
  Math.max(minimum, Math.round((styleHints.averageSentenceLength ?? minimum) * multiplier));

const normalizeFps = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 30;
  }

  const commonFps = [24, 25, 30, 48, 50, 60];
  const nearest = commonFps.reduce((best, candidate) =>
    Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best,
  30);

  return nearest;
};

const createBanterState = () => ({
  challengeSeed: null,
  lastMention: null,
  callbackCount: 0,
});

const splitSubtitleBeats = (text, maxBeats = 2) => {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [];
  }

  const rawParts = normalized
    .split(/(?<=[、。！？!?])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawParts.length <= 1) {
    return [normalized];
  }

  if (rawParts.length <= maxBeats) {
    return rawParts;
  }

  const beats = [];
  const chunkSize = Math.ceil(rawParts.length / maxBeats);
  for (let index = 0; index < rawParts.length; index += chunkSize) {
    beats.push(rawParts.slice(index, index + chunkSize).join(''));
  }
  return beats.slice(0, maxBeats);
};

const buildExplanationText = ({ item, styleHints, variant }) => {
  if (item.explanationText) {
    return normalizeCommentaryText(item.explanationText);
  }

  const opening = pickOpening(styleHints, 'まずはここ');
  const closing = pickClosing(styleHints, 'ここが見どころです');
  const mention = summarizeMentions(item.mustMention);
  const base = (() => {
    switch (item.sceneRole) {
      case 'victory':
        return `結論から言うと、ここが決着です。なぜなら${mention}がそのまま勝因につながっているからです。${closing}`;
      case 'risk':
        return `結論から言うと、ここは危ないです。なぜなら${mention}で判断が割れやすいからです。${closing}`;
      case 'escalation':
        return `結論から言うと、ここから一気に見どころが増えます。なぜなら${mention}を軸に流れが大きく動くからです。${closing}`;
      case 'context':
      default:
        return `結論から言うと、この場面は先に整理すると見やすいです。なぜなら${mention}を押さえるだけで流れを追いやすくなるからです。${closing}`;
    }
  })();

  return trimToLength(base, variant === 'short' ? 38 : fallbackLongLength(styleHints, 1.35, 42));
};

const buildBanterText = ({ item, styleHints, variant, index, banterState }) => {
  if (item.banterText) {
    return normalizeCommentaryText(item.banterText);
  }

  const reactionWord = pickReactionWord(styleHints, index);
  const mention = summarizeMentions(item.mustMention);
  const challengeSeed = banterState.challengeSeed ?? mention;
  const banterType = item.banterType ?? 'dry-tsukkomi';
  const base = (() => {
    switch (banterType) {
      case 'challenge-setup':
        banterState.challengeSeed = mention;
        banterState.lastMention = mention;
        return `${reactionWord}、ところで今回は${mention}で本当に押し切るんですか。計画というより、フラグの立て売りなんですが。`;
      case 'rule-reminder':
        banterState.lastMention = mention;
        return `${reactionWord}、さっきの${challengeSeed}、まだ一切安心できません。${mention}の時点で、嫌なフラグを丁寧に回収しに行ってます。`;
      case 'overconfidence-break':
        banterState.lastMention = mention;
        return `${reactionWord}、ここで強気になるのが一番危ないやつです。${mention}を見てると、後で「聞いてない」が始まる未来しか見えません。`;
      case 'panic-tsukkomi':
        banterState.callbackCount += 1;
        banterState.lastMention = mention;
        return `${reactionWord}、ほら言わんこっちゃないです。${challengeSeed}でイキった分だけ、今きれいに請求が来ています。`;
      case 'payoff-callback':
        banterState.callbackCount += 1;
        banterState.lastMention = mention;
        return `${reactionWord}、なんだかんだ${challengeSeed}を通したのはえらいです。あの無茶振り、最後にちゃんとオチまで付きました。`;
      case 'dry-tsukkomi':
      default:
        banterState.lastMention = mention;
        if (item.sceneRole === 'victory') {
          return `${reactionWord}、きっちり決めました。${mention}まで噛み合うと気持ちいいです。`;
        }
        if (item.sceneRole === 'risk') {
          return `${reactionWord}、それは怖いです。${mention}で一気に空気が張るし、ボケる余裕まで消えました。`;
        }
        if (item.sceneRole === 'reaction') {
          return `${reactionWord}、これはツッコミどころです。${pickFailPhrase(styleHints)}っていうか、行動がもう前フリなんですよ。`;
        }
        if (item.sceneRole === 'escalation') {
          return `${reactionWord}、ここから一気に熱くなります。${mention}でもう笑う余裕がありません。`;
        }
        return `${reactionWord}、準備は大事です。${mention}を外すと、あとで自分の発言に自分でツッコむ羽目になります。`;
    }
  })();

  return trimToLength(base, variant === 'short' ? 34 : fallbackLongLength(styleHints, 1.18, 36));
};

const buildPopupBadges = (item, variant) => {
  const keywords = dedupe((item.mustMention ?? []).filter(Boolean)).slice(0, variant === 'short' ? 1 : 2);
  return keywords.map((keyword, index) => ({
    component: 'GameplayTextBadge',
    props: {
      label: index === 0 ? 'CHECK' : 'OCR',
      text: keyword,
      tone: index === 0 ? 'accent' : 'info',
    },
    startOffset: index === 0 ? 8 : 24,
    duration: variant === 'short' ? 48 : 72,
    imageX: 78,
    imageY: 24 + index * 12,
    imageWidth: variant === 'short' ? 26 : 20,
    imageHeight: variant === 'short' ? 12 : 10,
  }));
};

const buildBgmSequence = (renderSegments, audioPlan) => {
  const bgm = [];
  let previousFile = null;

  renderSegments.forEach((segment, index) => {
    const file = chooseBgmTrack({
      bgmAssets: audioPlan.bgmAssets,
      sceneRole: segment.sceneRole,
      banterType: segment.banterType,
    });
    if (file !== previousFile) {
      bgm.push({
        atScene: index,
        file,
      });
      previousFile = file;
    }
  });

  if (bgm.length === 0 && audioPlan.bgmAssets[0]) {
    bgm.push({ atScene: 0, file: audioPlan.bgmAssets[0].file });
  }

  return bgm;
};

const main = () => {
  const options = parseArgs();
  const outline = readJson(options.outline);
  const manifest = readJson(options.cutManifest);
  const manifestSegments = Array.isArray(manifest.segments) ? manifest.segments : [];
  const manifestById = new Map(manifestSegments.map((segment) => [segment.id, segment]));
  const outlineItems = Array.isArray(outline.items) ? outline.items : [];
  const styleHints = outline.styleHints ?? {};
  const commentaryProfile = outline.commentaryProfile ?? {};
  const audioPlan = buildGameplayAudioPlan();

  const selectedOutline = chooseSegmentsForVariant({
    variant: options.variant,
    outlineItems,
    manifestById,
  });

  if (selectedOutline.length === 0) {
    throw new Error('No approved outline items found to build gameplay commentary.');
  }

  const cutVideoAsset = toProjectRelativeAsset(options.cutVideo);
  const fps = normalizeFps(commentaryProfile.outputFps ?? manifest.fps ?? 30);
  const renderSegments = [];
  let timelineCursorFrame = 0;
  const banterState = createBanterState();
  const safeInputStem = sanitizeStem(path.basename(options.input, path.extname(options.input))) || 'gameplay-commentary';
  const projectId = commentaryProfile.projectId ?? `gameplay-commentary-${safeInputStem}`;
  const projectTitle = commentaryProfile.projectTitle ?? `${safeInputStem} 実況台本`;
  const gameplayTitle = commentaryProfile.gameplayTitle ?? `${safeInputStem} 実況`;
  const gameplaySeries = commentaryProfile.series ?? (options.variant === 'short' ? 'Auto Short Draft' : 'Auto Long Draft');
  const streamerName = commentaryProfile.streamerName ?? '四国めたん';
  const streamerHandle = commentaryProfile.streamerHandle ?? '@auto_commentary';
  const accentColor = commentaryProfile.accentColor ?? '#22c55e';
  const secondaryColor = commentaryProfile.secondaryColor ?? '#0f172a';
  const playGameplayAudio = commentaryProfile.playGameplayAudio ?? false;
  const displayMode = commentaryProfile.displayMode ?? 'broadcast';
  const showHud = commentaryProfile.showHud ?? (displayMode !== 'explainer');
  const showCommentatorAvatar = commentaryProfile.showCommentatorAvatar ?? (displayMode !== 'explainer');
  const defaultSubtitleStyle = commentaryProfile.subtitleStyle ?? (
    displayMode === 'explainer'
      ? {
          backgroundColor: 'transparent',
          textAlign: 'center',
        }
      : {}
  );

  selectedOutline.forEach((item, sourceIndex) => {
    const source = manifestById.get(item.sourceSegmentId);
    if (!source) {
      return;
    }

    const totalFrames = Math.max(36, secondsToFrame(source.cutDurationSec, fps));
    const shouldSplit = totalFrames >= (options.variant === 'short' ? 84 : 114);
    const explanationFrames = shouldSplit
      ? Math.max(42, Math.min(totalFrames - 36, Math.round(totalFrames * 0.56)))
      : totalFrames;
    const banterFrames = shouldSplit ? totalFrames - explanationFrames : 0;
    const sceneRole = item.sceneRole ?? 'context';
    const emphasis = mapIntensityToEmphasis(item.intensity, sceneRole);

    const explanationText = buildExplanationText({
      item,
      styleHints,
      variant: options.variant,
    });
    const explanationSubtitleBeats = splitSubtitleBeats(explanationText, options.variant === 'short' ? 2 : 3);
    const explanationStartTime = timelineCursorFrame;
    const explanationSe = chooseSeForSegment({
      seAssets: audioPlan.seAssets,
      sceneRole,
      banterType: item.banterType,
      draftLayer: 'explanation',
      text: explanationText,
      emphasis,
    });
    renderSegments.push({
      id: `${item.sourceSegmentId}_explanation`,
      sourceSegmentId: item.sourceSegmentId,
      draftLayer: 'explanation',
      analysisTags: [sceneRole, item.expectedCommentaryRole, item.banterType].filter(Boolean),
      sceneRole,
      chapter: item.chapter,
      title: `${item.chapter} / 解説`,
      speaker: item.speakerPlan?.explanation ?? 'metan',
      text: toDisplayText(explanationText),
      speechText: normalizeSpeechText(explanationText),
      subtitleBeats: explanationSubtitleBeats,
      startTime: explanationStartTime,
      duration: explanationFrames,
      video: cutVideoAsset,
      trimBefore: source.cutStartFrame,
      sourceDuration: explanationFrames,
      voiceFile: `${item.sourceSegmentId}_explanation.wav`,
      playbackRate: 1,
      emphasis,
      banterType: item.banterType,
      subtitleStyle: defaultSubtitleStyle,
      se: explanationSe,
      popups: buildPopupBadges(item, options.variant),
      focusX: 50,
      focusY: 50,
      zoom: options.variant === 'short' ? 1.16 : 1.08,
    });
    timelineCursorFrame += explanationFrames;

    if (banterFrames >= 30) {
      const banterText = buildBanterText({
        item,
        styleHints,
        variant: options.variant,
        index: sourceIndex,
        banterState,
      });
      const banterSubtitleBeats = splitSubtitleBeats(banterText, options.variant === 'short' ? 3 : 3);
      const banterStartTime = timelineCursorFrame;
      const banterSceneRole = sceneRole === 'context' ? 'reaction' : sceneRole;
      const banterEmphasis = mapIntensityToEmphasis(
        item.sceneRole === 'victory' ? 'victory' : item.intensity,
        banterSceneRole,
      );
      const banterSe = chooseSeForSegment({
        seAssets: audioPlan.seAssets,
        sceneRole: banterSceneRole,
        banterType: item.banterType,
        draftLayer: 'banter',
        text: banterText,
        emphasis: banterEmphasis,
      });
      renderSegments.push({
        id: `${item.sourceSegmentId}_banter`,
        sourceSegmentId: item.sourceSegmentId,
        draftLayer: 'banter',
        analysisTags: [sceneRole, 'banter', item.banterType].filter(Boolean),
        sceneRole: banterSceneRole,
        chapter: item.chapter,
        title: `${item.chapter} / 反応`,
        speaker: item.speakerPlan?.banter ?? 'zundamon',
        text: toDisplayText(banterText),
        speechText: normalizeSpeechText(banterText),
        subtitleBeats: banterSubtitleBeats,
        startTime: banterStartTime,
        duration: banterFrames,
        video: cutVideoAsset,
        trimBefore: source.cutStartFrame + explanationFrames,
        sourceDuration: banterFrames,
        voiceFile: `${item.sourceSegmentId}_banter.wav`,
        playbackRate: 1,
        emphasis: banterEmphasis,
        banterType: item.banterType,
        subtitleStyle: defaultSubtitleStyle,
        se: banterSe,
        popups: buildPopupBadges(item, options.variant),
        focusX: 52,
        focusY: 48,
        zoom: options.variant === 'short' ? 1.18 : 1.1,
      });
      timelineCursorFrame += banterFrames;
    }
  });

  const script = {
    project: {
      id: projectId,
      title: projectTitle,
      version: 2,
      defaultVariant: options.variant,
    },
    renderVariant: options.variant,
    activeVariant: options.variant,
    template: {
      id: 'game-play-commentary',
    },
    output: {
      preset: options.variant === 'short' ? 'portrait-fhd' : 'landscape-fhd',
      fps,
    },
    audio: {
      bgmVolume: options.variant === 'short' ? 0.12 : 0.11,
      voiceVolume: 1,
      seVolume: 0.78,
      voiceDucking: 0.5,
      duckFadeFrames: 10,
      masterVolume: 1,
    },
    timeline: {
      bgm: buildBgmSequence(renderSegments, audioPlan),
      gameplay: {
        title: gameplayTitle,
        series: gameplaySeries,
        video: cutVideoAsset,
        streamerName,
        streamerHandle,
        accentColor,
        secondaryColor,
        playGameplayAudio,
        displayMode,
        showHud,
        showCommentatorAvatar,
        subtitleStyle: defaultSubtitleStyle,
        showProgress: commentaryProfile.showProgress ?? showHud,
        showTimer: commentaryProfile.showTimer ?? showHud,
        segments: renderSegments,
      },
    },
  };

  writeJson(GENERATED_GAMEPLAY_SCRIPT_PATH, script);
  if (options.output !== GENERATED_GAMEPLAY_SCRIPT_PATH) {
    writeJson(options.output, script);
  }
  if (options.syncScriptJson) {
    writeJson(SCRIPT_PATH, script);
  }

  console.log(`Wrote ${GENERATED_GAMEPLAY_SCRIPT_PATH}`);
  if (options.output !== GENERATED_GAMEPLAY_SCRIPT_PATH) {
    console.log(`Wrote ${options.output}`);
  }
  if (options.syncScriptJson) {
    console.log(`Wrote ${SCRIPT_PATH}`);
  }
};

main();
