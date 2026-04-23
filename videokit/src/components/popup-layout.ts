import type { PopupZone, SceneVisualMode } from '../types';
import { getSubtitleLayoutDefaults } from './subtitle-layout';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type PopupLayoutParams = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  popupWidth?: number;
  popupHeight?: number;
  visualMode?: SceneVisualMode;
  popupZone?: PopupZone;
  hasPopup?: boolean;
};

export type PopupLayoutBox = {
  centerX: number;
  centerY: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

export type SceneReadableZones = {
  safeRect: PopupLayoutBox;
  popupRect: PopupLayoutBox;
  backgroundRect: PopupLayoutBox;
  subtitleRect: PopupLayoutBox;
  resolvedPopupZone: PopupZone;
  resolvedVisualMode: SceneVisualMode;
};

const createRect = (left: number, top: number, width: number, height: number): PopupLayoutBox => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: 100 - top - height,
  centerX: left + width / 2,
  centerY: top + height / 2,
});

const insetRect = (
  rect: PopupLayoutBox,
  inset: { left?: number; right?: number; top?: number; bottom?: number }
) => {
  const left = rect.left + (inset.left ?? 0);
  const right = rect.right - (inset.right ?? 0);
  const top = rect.top + (inset.top ?? 0);
  const bottom = rect.bottom + (inset.bottom ?? 0);
  return createRect(left, top, Math.max(8, right - left), Math.max(8, 100 - top - bottom));
};

const zoneRectFromSafe = (
  safeRect: PopupLayoutBox,
  zone: PopupZone,
  portrait: boolean
): PopupLayoutBox => {
  const { left, top, width, height } = safeRect;

  if (portrait) {
    switch (zone) {
      case 'upperBand':
        return createRect(left + width * 0.02, top + height * 0.02, width * 0.96, height * 0.24);
      case 'middleBand':
        return createRect(left + width * 0.04, top + height * 0.34, width * 0.92, height * 0.32);
      case 'leftRail':
        return createRect(left + width * 0.04, top + height * 0.18, width * 0.38, height * 0.42);
      case 'rightRail':
        return createRect(left + width * 0.58, top + height * 0.18, width * 0.38, height * 0.42);
      case 'full':
      case 'auto':
      default:
        return createRect(left + width * 0.06, top + height * 0.14, width * 0.88, height * 0.34);
    }
  }

  switch (zone) {
    case 'upperBand':
      return createRect(left + width * 0.04, top + height * 0.02, width * 0.92, height * 0.4);
    case 'middleBand':
      return createRect(left + width * 0.08, top + height * 0.28, width * 0.84, height * 0.28);
    case 'leftRail':
      return createRect(left + width * 0.04, top + height * 0.05, width * 0.29, height * 0.68);
    case 'rightRail':
      return createRect(left + width * 0.67, top + height * 0.05, width * 0.29, height * 0.68);
    case 'full':
    case 'auto':
    default:
      return createRect(left + width * 0.1, top + height * 0.12, width * 0.8, height * 0.54);
  }
};

const resolvePopupZone = ({
  visualMode,
  popupZone,
  portrait,
}: {
  visualMode: SceneVisualMode;
  popupZone?: PopupZone;
  portrait: boolean;
}): PopupZone => {
  if (popupZone && popupZone !== 'auto') {
    return popupZone;
  }

  if (visualMode === 'backgroundFocus') {
    return 'upperBand';
  }

  if (visualMode === 'split') {
    return portrait ? 'middleBand' : 'rightRail';
  }

  return portrait ? 'middleBand' : 'full';
};

const resolveBackgroundRect = ({
  safeRect,
  popupRect,
  resolvedPopupZone,
  visualMode,
  portrait,
  hasPopup,
}: {
  safeRect: PopupLayoutBox;
  popupRect: PopupLayoutBox;
  resolvedPopupZone: PopupZone;
  visualMode: SceneVisualMode;
  portrait: boolean;
  hasPopup: boolean;
}): PopupLayoutBox => {
  if (!hasPopup || resolvedPopupZone === 'full') {
    return safeRect;
  }

  const gap = portrait ? 2.5 : 3;

  if (resolvedPopupZone === 'upperBand') {
    const remainingTop = popupRect.top + popupRect.height + gap;
    const safeBottomEdge = safeRect.top + safeRect.height;
    return createRect(
      safeRect.left,
      remainingTop,
      safeRect.width,
      Math.max(12, safeBottomEdge - remainingTop)
    );
  }

  if (resolvedPopupZone === 'middleBand') {
    const topStageHeight = portrait ? safeRect.height * 0.3 : safeRect.height * 0.34;
    const topStage = createRect(safeRect.left, safeRect.top, safeRect.width, topStageHeight);
    return visualMode === 'backgroundFocus'
      ? insetRect(safeRect, {
          top: popupRect.top + popupRect.height + gap - safeRect.top,
        })
      : topStage;
  }

  if (resolvedPopupZone === 'leftRail') {
    return createRect(
      popupRect.right + gap,
      safeRect.top,
      Math.max(18, safeRect.right - (popupRect.right + gap)),
      visualMode === 'split' ? safeRect.height * (portrait ? 0.62 : 0.82) : safeRect.height
    );
  }

  if (resolvedPopupZone === 'rightRail') {
    return createRect(
      safeRect.left,
      safeRect.top,
      Math.max(18, popupRect.left - safeRect.left - gap),
      visualMode === 'split' ? safeRect.height * (portrait ? 0.62 : 0.82) : safeRect.height
    );
  }

  return safeRect;
};

export const getSceneReadableZones = ({
  width,
  height,
  visualMode = 'popupFocus',
  popupZone = 'auto',
  hasPopup = true,
}: {
  width: number;
  height: number;
  visualMode?: SceneVisualMode;
  popupZone?: PopupZone;
  hasPopup?: boolean;
}): SceneReadableZones => {
  const isPortrait = height > width;
  const sidePaddingPct = isPortrait ? 3.5 : 4;
  const topPaddingPct = isPortrait ? 4.5 : 5;
  const subtitleDefaults = getSubtitleLayoutDefaults({ width, height, hasOverlap: false });
  const subtitleGapPct = isPortrait ? 3 : 2.5;
  const subtitleTop = 100 - subtitleDefaults.bottomPct - subtitleDefaults.heightPct;
  const subtitleRect = createRect(
    (100 - subtitleDefaults.widthPct) / 2,
    subtitleTop,
    subtitleDefaults.widthPct,
    subtitleDefaults.heightPct
  );
  const safeBottom = subtitleTop - subtitleGapPct;
  const safeRect = createRect(
    sidePaddingPct,
    topPaddingPct,
    100 - sidePaddingPct * 2,
    Math.max(14, safeBottom - topPaddingPct)
  );

  const resolvedVisualMode = visualMode ?? 'popupFocus';
  const resolvedPopupZone = resolvePopupZone({
    visualMode: resolvedVisualMode,
    popupZone,
    portrait: isPortrait,
  });
  const popupRect = hasPopup
    ? zoneRectFromSafe(safeRect, resolvedPopupZone, isPortrait)
    : createRect(safeRect.centerX, safeRect.centerY, 0, 0);
  const backgroundRect = resolveBackgroundRect({
    safeRect,
    popupRect,
    resolvedPopupZone,
    visualMode: resolvedVisualMode,
    portrait: isPortrait,
    hasPopup,
  });

  return {
    safeRect,
    popupRect,
    backgroundRect,
    subtitleRect,
    resolvedPopupZone,
    resolvedVisualMode,
  };
};

export const getPopupLayoutBox = ({
  width,
  height,
  x,
  y,
  popupWidth = 25,
  popupHeight = 40,
  visualMode = 'popupFocus',
  popupZone = 'auto',
  hasPopup = true,
}: PopupLayoutParams): PopupLayoutBox => {
  const zones = getSceneReadableZones({
    width,
    height,
    visualMode,
    popupZone,
    hasPopup,
  });
  const zone = zones.popupRect;

  const resolvedWidth = clamp(popupWidth, 8, zone.width);
  const resolvedHeight = clamp(popupHeight, 8, zone.height);
  const centerX = clamp(
    x ?? zone.centerX,
    zone.left + resolvedWidth / 2,
    zone.right - resolvedWidth / 2
  );
  const desiredTop = y !== undefined ? 100 - y : zone.top + (zone.height - resolvedHeight) / 2;
  const top = clamp(desiredTop, zone.top, zone.top + zone.height - resolvedHeight);
  const left = centerX - resolvedWidth / 2;

  return createRect(left, top, resolvedWidth, resolvedHeight);
};
