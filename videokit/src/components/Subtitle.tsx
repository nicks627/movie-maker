import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { SubtitleStyle } from '../types';
import { getSubtitleLayoutDefaults, getSubtitleLineUnitLimit } from './subtitle-layout';

interface SubtitleProps {
  character: string;
  text: string;
  durationInFrames: number;
  style?: SubtitleStyle;
  positionX?: number; // 0-100 percentage left offset
  positionY?: number; // 0-100 percentage bottom offset
  maxWidthPct?: number; // percentage of parent width, default 75
  maxHeightPct?: number; // percentage of parent height, optional
}

interface SubtitlePage {
  text: string;
  weight: number;
}

const MAX_LINES_PER_PAGE = 2;
const NO_PLATE_VERTICAL_PADDING_PX = 16;
const NO_PLATE_HORIZONTAL_PADDING_PX = 8;
const NATURAL_BREAK_SUFFIXES = [
  'では',
  'には',
  'とは',
  'でも',
  'から',
  'まで',
  'より',
  'ので',
  'のに',
  'のが',
  'のは',
  'として',
  'だけ',
  'ほど',
  'など',
  'って',
  'たり',
  'つつ',
  'した',
  'して',
  'する',
  'なの',
  'んだ',
  'のだ',
  'は',
  'が',
  'を',
  'に',
  'で',
  'へ',
  'も',
  'や',
  'の',
  'よ',
  'ね',
  'ぞ',
  'わ',
];
const FORBIDDEN_LINE_START = new Set([
  '、',
  '。',
  '！',
  '？',
  '」',
  '』',
  '）',
  ')',
  'ぁ',
  'ぃ',
  'ぅ',
  'ぇ',
  'ぉ',
  'っ',
  'ゃ',
  'ゅ',
  'ょ',
  'ァ',
  'ィ',
  'ゥ',
  'ェ',
  'ォ',
  'ッ',
  'ャ',
  'ュ',
  'ョ',
  'ー',
]);

const normalizeText = (value: string) => {
  return value.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
};

const measureUnits = (value: string) => {
  return Array.from(value).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 0.3;
    }

    if (/[A-Za-z0-9]/.test(char)) {
      return total + 0.58;
    }

    return total + 1;
  }, 0);
};

const getCanvasContext = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
};

const measureRenderedLineWidth = (params: {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
  strokeWidth: number;
}) => {
  const { text, fontSize, fontFamily, fontWeight, fontStyle, strokeWidth } = params;
  const context = getCanvasContext();
  const letters = Array.from(text);

  if (!context) {
    return (
      measureUnits(text) * fontSize * 0.94 +
      Math.max(0, letters.length - 1) * fontSize * 0.01 +
      strokeWidth * 2.5
    );
  }

  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  const letterSpacingPx = Math.max(0, letters.length - 1) * fontSize * 0.01;
  return context.measureText(text).width + letterSpacingPx + strokeWidth * 2.5;
};

const splitPhraseByUnits = (phrase: string, unitLimit: number) => {
  const parts: string[] = [];
  let current = '';
  let currentUnits = 0;

  Array.from(phrase).forEach((char) => {
    const charUnits = measureUnits(char);
    const nextUnits = currentUnits + charUnits;
    if (current && nextUnits > unitLimit) {
      parts.push(current);
      current = char;
      currentUnits = charUnits;
      return;
    }

    current += char;
    currentUnits = nextUnits;
  });

  if (current) {
    parts.push(current);
  }

  return parts;
};

const isBreakPunctuation = (char: string) => /[、。!?！？]/.test(char);
const isAsciiContinuation = (char: string) => /[A-Za-z0-9+\-./:%]/.test(char);
const shouldDelaySuffixBreak = (matchedSuffix: string, next: string) => {
  if (matchedSuffix === 'の' && ['が', 'は', 'に', 'で', 'だ'].includes(next)) {
    return true;
  }

  if (matchedSuffix === 'に' && ['よ'].includes(next)) {
    return true;
  }

  return false;
};

const tokenizePhrase = (phrase: string) => {
  const tokens: string[] = [];
  const chars = Array.from(phrase);
  let current = '';

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) {
      tokens.push(trimmed);
    }
    current = '';
  };

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const next = chars[index + 1] ?? '';
    current += char;

    if (/\s/.test(char)) {
      pushCurrent();
      continue;
    }

    if (isBreakPunctuation(char) || /[」』）)]/.test(char)) {
      pushCurrent();
      continue;
    }

    if (/[A-Za-z0-9]/.test(char) && next && isAsciiContinuation(next)) {
      continue;
    }

    const matchedSuffix = NATURAL_BREAK_SUFFIXES.find((suffix) => current.endsWith(suffix));
    if (
      matchedSuffix &&
      next &&
      !/\s/.test(next) &&
      !FORBIDDEN_LINE_START.has(next) &&
      !shouldDelaySuffixBreak(matchedSuffix, next)
    ) {
      pushCurrent();
    }
  }

  pushCurrent();

  return tokens.length > 0 ? tokens : [phrase.trim()].filter(Boolean);
};

const expandOversizedTokens = (tokens: string[], unitLimit: number) => {
  return tokens.flatMap((token) => {
    if (measureUnits(token) <= unitLimit) {
      return token;
    }

    return splitPhraseByUnits(token, unitLimit);
  });
};

const getLinePenalty = (params: {
  text: string;
  units: number;
  targetUnits: number;
  isLastLine: boolean;
}) => {
  const { text, units, targetUnits, isLastLine } = params;
  const textChars = Array.from(text);
  const firstChar = textChars[0] ?? '';
  const lastChar = textChars[textChars.length - 1] ?? '';
  let penalty = Math.pow(units - targetUnits, 2);

  if (!isLastLine && units < targetUnits * 0.58) {
    penalty += 18;
  }

  if (FORBIDDEN_LINE_START.has(firstChar)) {
    penalty += 140;
  }

  if (!isLastLine && /[（「『【]/.test(lastChar)) {
    penalty += 180;
  }

  return penalty;
};

const fitTokensToLines = (
  tokens: string[],
  unitLimit: number,
  options?: { preferTwoLines?: boolean }
) => {
  const normalizedTokens = expandOversizedTokens(tokens, unitLimit);
  const tokenUnits = normalizedTokens.map((token) => measureUnits(token));
  const prefixUnits = tokenUnits.reduce<number[]>((acc, value) => {
    acc.push(acc[acc.length - 1] + value);
    return acc;
  }, [0]);
  const totalUnits = prefixUnits[prefixUnits.length - 1] ?? 0;
  const minLineCount = Math.max(1, Math.ceil(totalUnits / unitLimit));
  const preferredMinLineCount =
    options?.preferTwoLines && totalUnits > unitLimit * 0.58 && normalizedTokens.length > 1
      ? 2
      : 1;
  const preferredLineCount = Math.max(minLineCount, preferredMinLineCount);
  const fallbackLineCount = Math.min(normalizedTokens.length, preferredLineCount + 1);

  const solveForLineCount = (lineCount: number) => {
    const targetUnits = totalUnits / lineCount;
    const memo = new Map<string, { cost: number; lines: string[] } | null>();

    const solve = (startIndex: number, remainingLines: number): { cost: number; lines: string[] } | null => {
      const key = `${startIndex}:${remainingLines}`;
      if (memo.has(key)) {
        return memo.get(key) ?? null;
      }

      if (remainingLines === 1) {
        const text = normalizedTokens.slice(startIndex).join('');
        const units = prefixUnits[normalizedTokens.length] - prefixUnits[startIndex];
        if (!text || units > unitLimit) {
          memo.set(key, null);
          return null;
        }

        const result = {
          cost: getLinePenalty({ text, units, targetUnits, isLastLine: true }),
          lines: [text],
        };
        memo.set(key, result);
        return result;
      }

      let best: { cost: number; lines: string[] } | null = null;

      for (
        let endIndex = startIndex + 1;
        endIndex <= normalizedTokens.length - remainingLines + 1;
        endIndex += 1
      ) {
        const text = normalizedTokens.slice(startIndex, endIndex).join('');
        const units = prefixUnits[endIndex] - prefixUnits[startIndex];
        if (units > unitLimit) {
          break;
        }

        const rest = solve(endIndex, remainingLines - 1);
        if (!rest) {
          continue;
        }

        const cost =
          getLinePenalty({ text, units, targetUnits, isLastLine: false }) + rest.cost;
        if (!best || cost < best.cost) {
          best = {
            cost,
            lines: [text, ...rest.lines],
          };
        }
      }

      memo.set(key, best);
      return best;
    };

    return solve(0, lineCount);
  };

  const preferredResult = solveForLineCount(preferredLineCount);
  if (preferredResult) {
    return preferredResult.lines.map((line) => line.trim()).filter(Boolean);
  }

  if (fallbackLineCount !== preferredLineCount) {
    const fallbackResult = solveForLineCount(fallbackLineCount);
    if (fallbackResult) {
      return fallbackResult.lines.map((line) => line.trim()).filter(Boolean);
    }
  }

  return expandOversizedTokens(tokens, unitLimit).map((line) => line.trim()).filter(Boolean);
};

const wrapPhraseToLines = (
  phrase: string,
  unitLimit: number,
  options?: { preferTwoLines?: boolean }
) => {
  const tokens = tokenizePhrase(phrase);
  return fitTokensToLines(tokens, unitLimit, options);
};

const splitIntoPhrases = (value: string) => {
  const matches = normalizeText(value).match(/[^。!?！？、,]+[。!?！？、,]*/g);
  if (!matches || matches.length === 0) {
    return [normalizeText(value)].filter(Boolean);
  }

  return matches.map((part) => part.trim()).filter(Boolean);
};

const buildSubtitlePages = (
  value: string,
  unitLimit: number,
  options?: { preferTwoLines?: boolean }
) => {
  const phrases = splitIntoPhrases(value);
  const pages: SubtitlePage[] = [];
  let currentLines: string[] = [];
  let currentWeight = 0;

  const pushCurrentPage = () => {
    if (currentLines.length === 0) {
      return;
    }

    pages.push({
      text: currentLines.join('\n'),
      weight: Math.max(1, currentWeight),
    });
    currentLines = [];
    currentWeight = 0;
  };

  phrases.forEach((phrase) => {
    const phraseLines = wrapPhraseToLines(phrase, unitLimit, options);
    const phraseWeight = measureUnits(phrase);

    if (currentLines.length > 0 && currentLines.length + phraseLines.length > MAX_LINES_PER_PAGE) {
      pushCurrentPage();
    }

    if (phraseLines.length <= MAX_LINES_PER_PAGE) {
      currentLines.push(...phraseLines);
      currentWeight += phraseWeight;
      if (currentLines.length >= MAX_LINES_PER_PAGE) {
        pushCurrentPage();
      }
      return;
    }

    let remainingWeight = phraseWeight;
    const totalLineUnits = phraseLines.reduce((sum, line) => sum + measureUnits(line), 0);

    phraseLines.forEach((line) => {
      if (currentLines.length >= MAX_LINES_PER_PAGE) {
        pushCurrentPage();
      }

      currentLines.push(line);
      const lineUnits = measureUnits(line);
      const lineWeight =
        totalLineUnits > 0 ? Math.max(1, Math.round((phraseWeight * lineUnits) / totalLineUnits)) : 1;
      currentWeight += lineWeight;
      remainingWeight -= lineWeight;

      if (currentLines.length >= MAX_LINES_PER_PAGE) {
        pushCurrentPage();
      }
    });

    if (remainingWeight > 0 && pages.length > 0) {
      pages[pages.length - 1].weight += remainingWeight;
    }
  });

  pushCurrentPage();

  return pages.length > 0 ? pages : [{ text: '', weight: 1 }];
};

const getSpeakerPalette = (character: string, style: SubtitleStyle) => {
  const paletteBySpeaker: Record<string, { outlineColor: string; glowColor: string }> = {
    zundamon: {
      outlineColor: '#41b35d',
      glowColor: 'rgba(65, 179, 93, 0.35)',
    },
    reimu: {
      outlineColor: '#ef4444',
      glowColor: 'rgba(239, 68, 68, 0.34)',
    },
    marisa: {
      outlineColor: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.34)',
    },
    metan: {
      outlineColor: '#f0327f',
      glowColor: 'rgba(240, 50, 127, 0.35)',
    },
  };
  const palette = paletteBySpeaker[character] ?? {
    outlineColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.32)',
  };

  return {
    textColor: style.textColor ?? '#ffffff',
    outlineColor: style.borderColor ?? palette.outlineColor,
    glowColor: palette.glowColor,
    plateColor: style.backgroundColor ?? 'transparent',
  };
};

export const Subtitle: React.FC<SubtitleProps> = ({
  character,
  text,
  durationInFrames,
  style = {},
  positionX,
  positionY,
  maxWidthPct,
  maxHeightPct,
}) => {
  const frame = useCurrentFrame();
  const { width: videoWidth, height: videoHeight } = useVideoConfig();
  const { textColor, outlineColor, glowColor, plateColor } = React.useMemo(
    () => getSpeakerPalette(character, style),
    [character, style]
  );
  const showPlate = plateColor !== 'transparent';

  const inferredOverlap = React.useMemo(() => {
    if (maxWidthPct === undefined) {
      return false;
    }

    return maxWidthPct <= (videoHeight > videoWidth ? 52 : 40);
  }, [maxWidthPct, videoHeight, videoWidth]);
  const layoutDefaults = React.useMemo(
    () =>
      getSubtitleLayoutDefaults({
        width: videoWidth,
        height: videoHeight,
        hasOverlap: inferredOverlap,
      }),
    [inferredOverlap, videoHeight, videoWidth]
  );
  const isPortrait = videoHeight > videoWidth;
  const fontSize = style.fontSize ?? layoutDefaults.fontSize;
  const animation = style.animation ?? 'none';
  const fontFamily = style.fontFamily ?? "'Inter', sans-serif";
  const fontWeight = style.fontWeight ?? '900';
  const fontStyle = style.fontStyle ?? 'normal';
  const textAlign = style.textAlign ?? 'center';
  const borderRadius = style.borderRadius ?? (isPortrait ? 32 : 28);
  const padding = style.padding ?? (isPortrait ? 14 : 12);
  const boxShadow = style.boxShadow ?? (isPortrait
    ? '0 22px 56px rgba(0, 0, 0, 0.52)'
    : '0 18px 40px rgba(0, 0, 0, 0.38)');
  const opacity = style.opacity ?? 1;
  const rotation = style.rotation ?? 0;
  const scale = style.scale ?? 1;
  const baseStrokeWidth = style.borderSize ?? Math.max(6, Math.round(fontSize * 0.18));

  const pw = maxWidthPct ?? layoutDefaults.widthPct;
  const ph = maxHeightPct ?? layoutDefaults.heightPct;
  const horizontalPaddingPx = showPlate ? padding * 3.2 : NO_PLATE_HORIZONTAL_PADDING_PX * 2;
  const isAutoPos = positionX === undefined || positionY === undefined;
  const lineUnitLimit = React.useMemo(() => {
    return getSubtitleLineUnitLimit({
      width: videoWidth,
      height: videoHeight,
      widthPct: pw,
      fontSize,
      horizontalPaddingPx,
    });
  }, [fontSize, horizontalPaddingPx, pw, videoHeight, videoWidth]);
  const preferTwoLinePortrait = isPortrait;
  const pages = React.useMemo(
    () =>
      buildSubtitlePages(text, lineUnitLimit, {
        preferTwoLines: preferTwoLinePortrait,
      }),
    [lineUnitLimit, preferTwoLinePortrait, text]
  );
  const totalWeight = React.useMemo(
    () => pages.reduce((sum, page) => sum + page.weight, 0),
    [pages]
  );

  let currentPage = pages[pages.length - 1] ?? { text: '', weight: 1 };
  let pageStartFrame = 0;
  let pageDuration = durationInFrames;
  let consumedWeight = 0;
  const targetWeight = clamp01(durationInFrames <= 1 ? 1 : frame / (durationInFrames - 1)) * totalWeight;

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const nextWeight = consumedWeight + page.weight;
    if (targetWeight <= nextWeight || index === pages.length - 1) {
      currentPage = page;
      pageStartFrame = Math.floor((consumedWeight / totalWeight) * durationInFrames);
      pageDuration = Math.max(
        1,
        Math.ceil((page.weight / totalWeight) * durationInFrames)
      );
      break;
    }
    consumedWeight = nextWeight;
  }

  let displayText = currentPage.text;
  const currentLines = React.useMemo(
    () => currentPage.text.split('\n').map((line) => line.trim()).filter(Boolean),
    [currentPage.text]
  );
  const fittedFontSize = React.useMemo(() => {
    const availableWidthPx = Math.max(
      180,
      videoWidth * (pw / 100) - horizontalPaddingPx - baseStrokeWidth * 3
    );
    const widestMeasuredLinePx = currentLines.reduce((max, line) => {
      return Math.max(
        max,
        measureRenderedLineWidth({
          text: line,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          strokeWidth: baseStrokeWidth,
        })
      );
    }, 1);
    const estimatedMaxFontSize = Math.floor(
      fontSize * Math.min(1, availableWidthPx / Math.max(1, widestMeasuredLinePx))
    );
    const minFontSize = Math.max(
      isPortrait ? 38 : 52,
      Math.round(fontSize * (isPortrait ? 0.44 : 0.8))
    );

    return Math.min(fontSize, Math.max(minFontSize, estimatedMaxFontSize));
  }, [
    baseStrokeWidth,
    currentLines,
    fontFamily,
    fontSize,
    fontStyle,
    fontWeight,
    horizontalPaddingPx,
    pw,
    isPortrait,
    videoHeight,
    videoWidth,
  ]);
  const strokeWidth = style.borderSize ?? Math.max(6, Math.round(fittedFontSize * 0.18));
  const resolvedHeightPct = React.useMemo(() => {
    const lineCount = Math.max(1, currentLines.length);
    const verticalPaddingPx = showPlate ? padding * 2 : NO_PLATE_VERTICAL_PADDING_PX;
    const requiredHeightPx =
      lineCount * fittedFontSize * 1.18 +
      verticalPaddingPx +
      strokeWidth * 3;

    return Math.max(ph, Math.ceil((requiredHeightPx / videoHeight) * 100));
  }, [currentLines.length, fittedFontSize, padding, ph, showPlate, strokeWidth, videoHeight]);
  if (animation === 'typewriter') {
    const localFrame = Math.max(0, frame - pageStartFrame);
    const charsToShow = Math.min(
      displayText.length,
      Math.floor(interpolate(localFrame, [0, pageDuration], [1, displayText.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }))
    );
    displayText = displayText.slice(0, charsToShow);
  }

  const shakeOffset = animation === 'shake' ? Math.sin(frame * 0.8) * 4 : 0;

  const transforms = [
    isAutoPos ? 'translateX(-50%)' : '',
    `translateX(${shakeOffset}px)`,
    `rotate(${rotation}deg)`,
    `scale(${scale})`,
  ].filter(Boolean);

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: isAutoPos ? '50%' : `${positionX}%`,
    bottom: isAutoPos ? `${layoutDefaults.bottomPct}%` : `${positionY}%`,
    width: `${pw}%`,
    minHeight: `${resolvedHeightPct}%`,
    opacity,
    transform: transforms.join(' '),
    transformOrigin: 'center bottom',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxSizing: 'border-box',
    zIndex: 10,
    pointerEvents: 'none',
  };

  const innerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    minHeight: '100%',
    padding: showPlate ? `${padding}px ${padding * (isPortrait ? 1.85 : 1.6)}px` : '8px 0',
    borderRadius: `${borderRadius}px`,
    backgroundColor: showPlate ? plateColor : 'transparent',
    border: showPlate ? `6px solid ${outlineColor}` : 'none',
    boxShadow: showPlate ? boxShadow : 'none',
    display: 'flex',
    justifyContent: textAlign === 'center' ? 'center' : textAlign === 'left' ? 'flex-start' : 'flex-end',
    alignItems: 'center',
    textAlign,
    boxSizing: 'border-box',
  };

  const textStyle: React.CSSProperties = {
    color: textColor,
    fontSize: `${fittedFontSize}px`,
    fontWeight,
    fontStyle,
    fontFamily,
    lineHeight: 1.18,
    letterSpacing: isPortrait ? '0.015em' : '0.01em',
    whiteSpace: 'pre-wrap',
    wordBreak: isPortrait ? 'normal' : 'keep-all',
    maxWidth: '100%',
    WebkitTextStroke: `${strokeWidth}px ${outlineColor}`,
    paintOrder: 'stroke fill',
    textShadow: [
      `0 ${Math.max(8, Math.round(fittedFontSize * 0.14))}px 0 rgba(0, 0, 0, ${isPortrait ? '0.42' : '0.34'})`,
      `0 0 ${Math.max(12, Math.round(fittedFontSize * 0.22))}px ${glowColor}`,
      isPortrait ? '0 10px 28px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.42)',
    ].join(', '),
    filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.18))',
  };

  return (
    <div style={posStyle}>
      <div style={innerStyle}>
        <div style={textStyle}>{displayText}</div>
      </div>
    </div>
  );
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
