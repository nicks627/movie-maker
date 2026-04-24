/* eslint-env node */

export const OUTPUT_PRESETS = {
	'landscape-fhd': {
		width: 1920,
		height: 1080,
		fps: 30,
	},
	'portrait-fhd': {
		width: 1080,
		height: 1920,
		fps: 30,
	},
	square: {
		width: 1080,
		height: 1080,
		fps: 30,
	},
	'landscape-hd': {
		width: 1280,
		height: 720,
		fps: 30,
	},
	'portrait-hd': {
		width: 720,
		height: 1280,
		fps: 30,
	},
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const createRectFromTop = (left, top, width, height) => ({
	left,
	top,
	width,
	height,
	right: left + width,
	bottom: 100 - top - height,
	centerX: left + width / 2,
	centerY: top + height / 2,
});

export const createRectFromBottom = ({left, bottom, width, height}) =>
	createRectFromTop(left, 100 - bottom - height, width, height);

export const rectArea = (rect) => Math.max(0, rect.width) * Math.max(0, rect.height);

export const getIntersectionRect = (leftRect, rightRect) => {
	const left = Math.max(leftRect.left, rightRect.left);
	const right = Math.min(leftRect.right, rightRect.right);
	const top = Math.max(leftRect.top, rightRect.top);
	const bottomTop = Math.min(leftRect.top + leftRect.height, rightRect.top + rightRect.height);

	if (right <= left || bottomTop <= top) {
		return null;
	}

	return createRectFromTop(left, top, right - left, bottomTop - top);
};

export const getIntersectionRatio = (leftRect, rightRect) => {
	const intersection = getIntersectionRect(leftRect, rightRect);
	if (!intersection) {
		return 0;
	}

	return rectArea(intersection) / Math.max(1, Math.min(rectArea(leftRect), rectArea(rightRect)));
};

export const isPortraitOutput = (width, height) => height > width;

export const getSubtitleLayoutDefaults = ({width, height, hasOverlap = false}) => {
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

const zoneRectFromSafe = (safeRect, zone, portrait) => {
	const {left, top, width, height} = safeRect;

	if (portrait) {
		switch (zone) {
			case 'upperBand':
				return createRectFromTop(left + width * 0.02, top + height * 0.02, width * 0.96, height * 0.24);
			case 'middleBand':
				return createRectFromTop(left + width * 0.04, top + height * 0.34, width * 0.92, height * 0.32);
			case 'leftRail':
				return createRectFromTop(left + width * 0.04, top + height * 0.18, width * 0.38, height * 0.42);
			case 'rightRail':
				return createRectFromTop(left + width * 0.58, top + height * 0.18, width * 0.38, height * 0.42);
			case 'full':
			case 'auto':
			default:
				return createRectFromTop(left + width * 0.06, top + height * 0.14, width * 0.88, height * 0.34);
		}
	}

	switch (zone) {
		case 'upperBand':
			return createRectFromTop(left + width * 0.04, top + height * 0.02, width * 0.92, height * 0.4);
		case 'middleBand':
			return createRectFromTop(left + width * 0.08, top + height * 0.28, width * 0.84, height * 0.28);
		case 'leftRail':
			return createRectFromTop(left + width * 0.04, top + height * 0.05, width * 0.29, height * 0.68);
		case 'rightRail':
			return createRectFromTop(left + width * 0.67, top + height * 0.05, width * 0.29, height * 0.68);
		case 'full':
		case 'auto':
		default:
			return createRectFromTop(left + width * 0.1, top + height * 0.12, width * 0.8, height * 0.54);
	}
};

const resolvePopupZone = ({visualMode, popupZone, portrait}) => {
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
}) => {
	if (!hasPopup || resolvedPopupZone === 'full') {
		return safeRect;
	}

	const gap = portrait ? 2.5 : 3;

	if (resolvedPopupZone === 'upperBand') {
		const remainingTop = popupRect.top + popupRect.height + gap;
		const safeBottomEdge = safeRect.top + safeRect.height;
		return createRectFromTop(
			safeRect.left,
			remainingTop,
			safeRect.width,
			Math.max(12, safeBottomEdge - remainingTop),
		);
	}

	if (resolvedPopupZone === 'middleBand') {
		const topStageHeight = portrait ? safeRect.height * 0.3 : safeRect.height * 0.34;
		if (visualMode === 'backgroundFocus') {
			return createRectFromTop(
				safeRect.left,
				popupRect.top + popupRect.height + gap,
				safeRect.width,
				Math.max(12, safeRect.top + safeRect.height - (popupRect.top + popupRect.height + gap)),
			);
		}

		return createRectFromTop(safeRect.left, safeRect.top, safeRect.width, topStageHeight);
	}

	if (resolvedPopupZone === 'leftRail') {
		return createRectFromTop(
			popupRect.right + gap,
			safeRect.top,
			Math.max(18, safeRect.right - (popupRect.right + gap)),
			visualMode === 'split' ? safeRect.height * (portrait ? 0.62 : 0.82) : safeRect.height,
		);
	}

	if (resolvedPopupZone === 'rightRail') {
		return createRectFromTop(
			safeRect.left,
			safeRect.top,
			Math.max(18, popupRect.left - safeRect.left - gap),
			visualMode === 'split' ? safeRect.height * (portrait ? 0.62 : 0.82) : safeRect.height,
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
}) => {
	const portrait = isPortraitOutput(width, height);
	const sidePaddingPct = portrait ? 3.5 : 4;
	const topPaddingPct = portrait ? 4.5 : 5;
	const subtitleDefaults = getSubtitleLayoutDefaults({width, height, hasOverlap: false});
	const subtitleGapPct = portrait ? 3 : 2.5;
	const subtitleTop = 100 - subtitleDefaults.bottomPct - subtitleDefaults.heightPct;
	const subtitleRect = createRectFromTop(
		(100 - subtitleDefaults.widthPct) / 2,
		subtitleTop,
		subtitleDefaults.widthPct,
		subtitleDefaults.heightPct,
	);
	const safeBottom = subtitleTop - subtitleGapPct;
	const safeRect = createRectFromTop(
		sidePaddingPct,
		topPaddingPct,
		100 - sidePaddingPct * 2,
		Math.max(14, safeBottom - topPaddingPct),
	);

	const resolvedVisualMode = visualMode ?? 'popupFocus';
	const resolvedPopupZone = resolvePopupZone({
		visualMode: resolvedVisualMode,
		popupZone,
		portrait,
	});
	const popupRect = hasPopup
		? zoneRectFromSafe(safeRect, resolvedPopupZone, portrait)
		: createRectFromTop(safeRect.centerX, safeRect.centerY, 0, 0);
	const backgroundRect = resolveBackgroundRect({
		safeRect,
		popupRect,
		resolvedPopupZone,
		visualMode: resolvedVisualMode,
		portrait,
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
}) => {
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
		zone.right - resolvedWidth / 2,
	);
	const desiredTop = y !== undefined ? 100 - y - resolvedHeight : zone.top + (zone.height - resolvedHeight) / 2;
	const top = clamp(desiredTop, zone.top, zone.top + zone.height - resolvedHeight);
	const left = centerX - resolvedWidth / 2;

	return createRectFromTop(left, top, resolvedWidth, resolvedHeight);
};

export const resolveOutputSettings = ({script, variant}) => {
	const topLevelOutput = script?.output ?? {};
	const variantConfig = script?.[variant]?.config ?? {};
	const templateId = script?.template?.id ?? 'yukkuri-explainer';
	const presetName =
		topLevelOutput.preset
		?? variantConfig.preset
		?? (templateId === 'line-chat' ? 'portrait-fhd' : 'landscape-fhd');
	const preset = OUTPUT_PRESETS[presetName] ?? OUTPUT_PRESETS['landscape-fhd'];

	return {
		preset: presetName,
		width: Number(topLevelOutput.width ?? variantConfig.width ?? preset.width),
		height: Number(topLevelOutput.height ?? variantConfig.height ?? preset.height),
		fps: Number(topLevelOutput.fps ?? variantConfig.fps ?? preset.fps),
	};
};
