export type SubtitleViewportParams = {
  width: number;
  height: number;
  hasOverlap?: boolean;
};

export type SubtitleLayoutDefaults = {
  widthPct: number;
  heightPct: number;
  bottomPct: number;
  fontSize: number;
};

export const isPortraitOutput = (width: number, height: number) => height > width;

export const getSubtitleLayoutDefaults = ({
  width,
  height,
  hasOverlap = false,
}: SubtitleViewportParams): SubtitleLayoutDefaults => {
  const portrait = isPortraitOutput(width, height);

  if (portrait) {
    if (hasOverlap) {
      return {
        widthPct: 46,
        heightPct: 15,
        bottomPct: 7,
        fontSize: 62,
      };
    }

    return {
      widthPct: 90,
      heightPct: 18,
      bottomPct: 7,
      fontSize: 74,
    };
  }

  if (hasOverlap) {
    return {
      widthPct: 38,
      heightPct: 12,
      bottomPct: 4,
      fontSize: 72,
    };
  }

  return {
    widthPct: 66,
    heightPct: 14,
    bottomPct: 4,
    fontSize: 78,
  };
};

export const getSubtitleLineUnitLimit = (params: {
  width: number;
  height: number;
  widthPct: number;
  fontSize: number;
  horizontalPaddingPx?: number;
}) => {
  const portrait = isPortraitOutput(params.width, params.height);
  const availableWidthPx =
    params.width * (params.widthPct / 100) - (params.horizontalPaddingPx ?? 0);
  const unitPixelRatio = portrait ? 0.94 : 0.68;
  const workingFontSize = params.fontSize * (portrait ? 1 : 0.9);
  const baseLimit = Math.floor(
    availableWidthPx / Math.max(1, workingFontSize * unitPixelRatio)
  );

  return Math.max(6, Math.min(portrait ? 13 : 20, baseLimit));
};

export const getAutoSubtitleSlot = (params: {
  width: number;
  height: number;
  side: 'left' | 'right';
  index: number;
}) => {
  const defaults = getSubtitleLayoutDefaults({
    width: params.width,
    height: params.height,
    hasOverlap: true,
  });
  const portrait = isPortraitOutput(params.width, params.height);
  const baseX = params.side === 'left'
    ? (portrait ? 4 : 8)
    : (portrait ? 52 : 54);
  const gap = portrait ? 3.5 : 3;

  return {
    x: baseX,
    y: defaults.bottomPct + params.index * (defaults.heightPct + gap),
    width: defaults.widthPct,
    height: defaults.heightPct,
  };
};
