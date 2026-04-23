export const OUTPUT_PRESETS = {
  'landscape-fhd': {
    width: 1920,
    height: 1080,
    fps: 30,
    safeArea: { top: 80, right: 96, bottom: 96, left: 96 },
  },
  'portrait-fhd': {
    width: 1080,
    height: 1920,
    fps: 30,
    safeArea: { top: 96, right: 72, bottom: 140, left: 72 },
  },
  square: {
    width: 1080,
    height: 1080,
    fps: 30,
    safeArea: { top: 80, right: 80, bottom: 96, left: 80 },
  },
  'landscape-hd': {
    width: 1280,
    height: 720,
    fps: 30,
    safeArea: { top: 54, right: 64, bottom: 64, left: 64 },
  },
  'portrait-hd': {
    width: 720,
    height: 1280,
    fps: 30,
    safeArea: { top: 72, right: 48, bottom: 96, left: 48 },
  },
} as const;

export type OutputPresetId = keyof typeof OUTPUT_PRESETS;

export type ResolvedOutputSettings = {
  preset: OutputPresetId;
  width: number;
  height: number;
  fps: number;
  orientation: 'landscape' | 'portrait' | 'square';
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
};

export const getOrientationFromDimensions = (
  width: number,
  height: number
): ResolvedOutputSettings['orientation'] => {
  if (width === height) {
    return 'square';
  }

  return width > height ? 'landscape' : 'portrait';
};

export const inferPresetFromDimensions = (
  width?: number,
  height?: number
): OutputPresetId | null => {
  if (!width || !height) {
    return null;
  }

  const match = (Object.entries(OUTPUT_PRESETS) as Array<[OutputPresetId, (typeof OUTPUT_PRESETS)[OutputPresetId]]>)
    .find(([, preset]) => preset.width === width && preset.height === height);

  return match?.[0] ?? null;
};

export const resolveOutputPreset = (
  preset?: OutputPresetId | null
): OutputPresetId => {
  if (preset && preset in OUTPUT_PRESETS) {
    return preset;
  }

  return 'landscape-fhd';
};
