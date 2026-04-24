import {getPopupLayoutBox, getSceneReadableZones} from '../components/popup-layout';
import {getSubtitleLayoutDefaults} from '../components/subtitle-layout';
import type {PopupZone, ProjectPopup, SceneVisualMode} from '../types';

export type LayoutContractRect = {
	left: number;
	top: number;
	width: number;
	height: number;
	right: number;
	bottom: number;
	centerX: number;
	centerY: number;
};

export type SceneLayoutContract = {
	safeRect: LayoutContractRect;
	subtitleRect: LayoutContractRect;
	popupRect: LayoutContractRect;
	backgroundRect: LayoutContractRect;
	resolvedPopupZone: PopupZone;
	resolvedVisualMode: SceneVisualMode;
	popupBoxes: LayoutContractRect[];
};

const rectFromBottom = ({
	left,
	bottom,
	width,
	height,
}: {
	left: number;
	bottom: number;
	width: number;
	height: number;
}): LayoutContractRect => ({
	left,
	top: 100 - bottom - height,
	width,
	height,
	right: left + width,
	bottom,
	centerX: left + width / 2,
	centerY: 100 - bottom - height / 2,
});

export const resolveSubtitleRect = ({
	width,
	height,
	subtitleX,
	subtitleY,
	subtitleWidth,
	subtitleHeight,
	hasOverlap = false,
}: {
	width: number;
	height: number;
	subtitleX?: number;
	subtitleY?: number;
	subtitleWidth?: number;
	subtitleHeight?: number;
	hasOverlap?: boolean;
}) => {
	const defaults = getSubtitleLayoutDefaults({width, height, hasOverlap});
	const resolvedWidth = subtitleWidth ?? defaults.widthPct;
	const resolvedHeight = subtitleHeight ?? defaults.heightPct;
	const left = subtitleX ?? (100 - resolvedWidth) / 2;
	const bottom = subtitleY ?? defaults.bottomPct;

	return rectFromBottom({
		left,
		bottom,
		width: resolvedWidth,
		height: resolvedHeight,
	});
};

export const resolvePopupBoxes = ({
	width,
	height,
	popups,
	visualMode = 'popupFocus',
	popupZone = 'auto',
}: {
	width: number;
	height: number;
	popups: ProjectPopup[];
	visualMode?: SceneVisualMode;
	popupZone?: PopupZone;
}) =>
	popups.map((popup) =>
		getPopupLayoutBox({
			width,
			height,
			x: popup.imageX,
			y: popup.imageY,
			popupWidth: popup.imageWidth ?? 25,
			popupHeight: popup.imageHeight ?? 40,
			visualMode,
			popupZone: popup.popupZone ?? popupZone,
			hasPopup: true,
		}),
	);

export const resolveSceneLayoutContract = ({
	width,
	height,
	popups = [],
	visualMode = 'popupFocus',
	popupZone = 'auto',
	subtitleX,
	subtitleY,
	subtitleWidth,
	subtitleHeight,
	hasOverlap = false,
}: {
	width: number;
	height: number;
	popups?: ProjectPopup[];
	visualMode?: SceneVisualMode;
	popupZone?: PopupZone;
	subtitleX?: number;
	subtitleY?: number;
	subtitleWidth?: number;
	subtitleHeight?: number;
	hasOverlap?: boolean;
}): SceneLayoutContract => {
	const zones = getSceneReadableZones({
		width,
		height,
		visualMode,
		popupZone,
		hasPopup: popups.length > 0,
	});

	return {
		...zones,
		subtitleRect: resolveSubtitleRect({
			width,
			height,
			subtitleX,
			subtitleY,
			subtitleWidth,
			subtitleHeight,
			hasOverlap,
		}),
		popupBoxes: resolvePopupBoxes({
			width,
			height,
			popups,
			visualMode,
			popupZone,
		}),
	};
};
