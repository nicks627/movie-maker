/* eslint-env node */
/* global process */
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const BGM_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'bgm');
const SE_DIR = path.join(PROJECT_ROOT, 'public', 'assets', 'se');
const AUDIO_DIRECTION_PATH = path.join(PROJECT_ROOT, 'config', 'audio-direction-presets.json');
const SE_MANIFEST_PATH = path.join(PROJECT_ROOT, 'se-manifest.json');
const BGM_MANIFEST_PATH = path.join(PROJECT_ROOT, 'bgm-manifest.json');

const normalizeName = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[_\-\s]+/g, ' ');

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const scanDirFiles = (dirPath) =>
  fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath).filter((file) => fs.statSync(path.join(dirPath, file)).isFile())
    : [];

const inferBgmRolesFromName = (filename) => {
  const normalized = normalizeName(filename);
  const roles = [];
  const moods = [];

  if (normalized.includes('chilled') || normalized.includes('cow')) {
    roles.push('calm-explainer', 'documentary-ambient');
    moods.push('neutral', 'clean', 'calm');
  }

  if (normalized.includes('energetic')) {
    roles.push('battle-tension', 'market-momentum');
    moods.push('urgent', 'fast', 'energetic');
  }

  if (normalized.includes('creeping') || normalized.includes('spider')) {
    roles.push('battle-tension', 'corporate-tension');
    moods.push('tense', 'danger', 'suspense');
  }

  if (normalized.includes('2 23') || normalized.includes('am')) {
    roles.push('comedy-light', 'hook-tech');
    moods.push('playful', 'light', 'modern');
  }

  if (normalized.includes('夕暮れ') || normalized.includes('avenue')) {
    roles.push('victory-resolve', 'documentary-ambient');
    moods.push('relief', 'warm', 'resolution');
  }

  if (roles.length === 0) {
    roles.push('calm-explainer');
  }

  return {
    roles: dedupe(roles),
    moods: dedupe(moods),
  };
};

const inferSeMetaFromName = (filename) => {
  const normalized = normalizeName(filename);

  if (normalized.includes('ツッコミ') || normalized.includes('げんこつ')) {
    return {
      role: 'tsukkomi',
      mood: ['comedy', 'snappy'],
      strength: 'medium',
      recommendedVolume: 0.76,
      durationFrames: 24,
    };
  }

  if (normalized.includes('間抜け') || normalized.includes('チーン') || normalized.includes('ショック') || normalized.includes('自主規制')) {
    return {
      role: 'deflate',
      mood: ['fail', 'awkward', 'comedy'],
      strength: 'light',
      recommendedVolume: 0.6,
      durationFrames: 28,
    };
  }

  if (normalized.includes('きら') || normalized.includes('イエーイ') || normalized.includes('イヤッホー') || normalized.includes('ちゃんちゃん')) {
    return {
      role: 'success-sting',
      mood: ['positive', 'uplift'],
      strength: 'light',
      recommendedVolume: 0.62,
      durationFrames: 36,
    };
  }

  if (normalized.includes('ドドン') || normalized.includes('ドン') || normalized.includes('運命')) {
    return {
      role: 'impact-soft',
      mood: ['dramatic', 'serious'],
      strength: 'heavy',
      recommendedVolume: 0.82,
      durationFrames: 34,
    };
  }

  if (normalized.includes('シャキーン') || normalized.includes('パッ') || normalized.includes('チャイム') || normalized.includes('紙を捲')) {
    return {
      role: 'accent-ping',
      mood: ['clean', 'tech'],
      strength: 'light',
      recommendedVolume: 0.64,
      durationFrames: 24,
    };
  }

  return {
    role: 'accent-ping',
    mood: ['clean'],
    strength: 'light',
    recommendedVolume: 0.62,
    durationFrames: 24,
  };
};

const buildSeAssetIndex = () => {
  const manifest = readJson(SE_MANIFEST_PATH, { assets: [], defaults: {} });
  const manifestByFile = new Map(
    (Array.isArray(manifest.assets) ? manifest.assets : []).map((asset) => [asset.file, asset]),
  );

  return scanDirFiles(SE_DIR).map((file) => {
    const manifestAsset = manifestByFile.get(file);
    const inferred = inferSeMetaFromName(file);
    return {
      file,
      role: manifestAsset?.role ?? inferred.role,
      mood: dedupe([...(manifestAsset?.mood ?? []), ...(inferred.mood ?? [])]),
      strength: manifestAsset?.strength ?? inferred.strength,
      recommendedVolume: manifestAsset?.recommendedVolume ?? inferred.recommendedVolume,
      durationFrames: manifestAsset?.durationFrames ?? inferred.durationFrames,
      aliases: manifestAsset?.aliases ?? [],
    };
  });
};

const buildBgmAssetIndex = () => {
  const manifest = readJson(BGM_MANIFEST_PATH, { assets: [] });
  const manifestByFile = new Map(
    (Array.isArray(manifest.assets) ? manifest.assets : []).map((asset) => [asset.file, asset]),
  );

  return scanDirFiles(BGM_DIR).map((file) => {
    const manifestAsset = manifestByFile.get(file);
    const inferred = inferBgmRolesFromName(file);
    return {
      file,
      roles: dedupe([...(manifestAsset?.roles ?? []), ...inferred.roles]),
      moods: dedupe([...(manifestAsset?.moods ?? []), ...inferred.moods]),
      reusable: manifestAsset?.reusable ?? true,
      licenseLabel: manifestAsset?.licenseLabel ?? 'library-needs-verification',
      sourceUrl: manifestAsset?.sourceUrl ?? null,
      notes: manifestAsset?.notes ?? '',
    };
  });
};

const scoreBgmAsset = ({ asset, desiredRole, desiredMoods }) => {
  let score = 0;
  if (asset.roles.includes(desiredRole)) {
    score += 50;
  }

  const moodMatches = desiredMoods.filter((mood) => asset.moods.includes(mood));
  score += moodMatches.length * 8;

  return score;
};

const gameplayRoleToBgmRole = ({ sceneRole, banterType }) => {
  if (sceneRole === 'victory') return 'victory-resolve';
  if (sceneRole === 'risk') return 'battle-tension';
  if (sceneRole === 'escalation') return 'battle-tension';
  if (banterType === 'challenge-setup') return 'comedy-light';
  if (banterType === 'payoff-callback') return 'victory-resolve';
  if (banterType === 'rule-reminder') return 'comedy-light';
  if (sceneRole === 'reaction') return 'comedy-light';
  return 'calm-explainer';
};

const explainerRoleToBgmRole = ({ sceneRole }) => {
  if (sceneRole === 'hook') return 'hook-tech';
  if (sceneRole === 'risk') return 'corporate-tension';
  if (sceneRole === 'reveal') return 'market-momentum';
  if (sceneRole === 'summary' || sceneRole === 'cta') return 'victory-resolve';
  if (sceneRole === 'map-explain') return 'documentary-ambient';
  if (sceneRole === 'comedy-beat' || sceneRole === 'reaction') return 'comedy-light';
  if (sceneRole === 'silence') return 'none';
  return 'calm-explainer';
};

const bgmRoleToMoods = {
  'battle-tension': ['urgent', 'danger', 'tense'],
  'calm-explainer': ['neutral', 'clean', 'calm'],
  'comedy-light': ['playful', 'light', 'modern'],
  'corporate-tension': ['serious', 'strategic', 'tense'],
  'documentary-ambient': ['wide', 'reflective', 'factual'],
  'victory-resolve': ['relief', 'warm', 'resolution'],
  'hook-tech': ['modern', 'curious'],
  'market-momentum': ['upward', 'positive', 'energetic'],
};

const resolveDesiredBgmRole = ({ audioDirection, templateId, sceneRole, banterType }) => {
  const sceneRoleRules = audioDirection?.templates?.[templateId]?.sceneRoleRules;
  const preferredRule = Array.isArray(sceneRoleRules)
    ? sceneRoleRules.find((rule) => rule.sceneRole === sceneRole)
    : null;
  if (preferredRule?.preferredBgmRole) {
    return preferredRule.preferredBgmRole;
  }

  if (templateId === 'yukkuri-explainer') {
    return explainerRoleToBgmRole({ sceneRole });
  }

  return gameplayRoleToBgmRole({ sceneRole, banterType });
};

const chooseBgmTrack = ({
  bgmAssets,
  sceneRole,
  banterType,
  templateId = 'game-play-commentary',
  audioDirection = null,
}) => {
  const desiredRole = resolveDesiredBgmRole({
    audioDirection,
    templateId,
    sceneRole,
    banterType,
  });
  const desiredMoods = bgmRoleToMoods[desiredRole] ?? [];
  const reusablePool = bgmAssets.filter((asset) => asset.reusable !== false);
  const candidatePool = reusablePool.length > 0 ? reusablePool : bgmAssets;

  const ranked = [...candidatePool]
    .map((asset) => ({
      asset,
      score: scoreBgmAsset({ asset, desiredRole, desiredMoods }),
    }))
    .sort((left, right) => right.score - left.score || left.asset.file.localeCompare(right.asset.file));

  return ranked[0]?.asset?.file ?? null;
};

const buildBgmSequenceForScenes = ({
  scenes,
  bgmAssets,
  templateId = 'yukkuri-explainer',
  audioDirection = null,
}) => {
  const bgmSequence = [];
  let previousFile = null;

  (Array.isArray(scenes) ? scenes : []).forEach((scene, index) => {
    const file = chooseBgmTrack({
      bgmAssets,
      sceneRole: scene.sceneRole,
      banterType: scene.banterType,
      templateId,
      audioDirection,
    });
    if (file && file !== previousFile) {
      bgmSequence.push({
        at_scene: index,
        file,
      });
      previousFile = file;
    }
  });

  return bgmSequence;
};

const scoreSeAsset = ({ asset, role, moods, strength }) => {
  let score = 0;
  if (asset.role === role) score += 50;
  score += moods.filter((mood) => asset.mood.includes(mood)).length * 8;
  if (strength && asset.strength === strength) score += 10;
  return score;
};

const chooseSeIntent = ({ sceneRole, banterType, draftLayer, text, emphasis }) => {
  const normalized = normalizeName(text);

  if (draftLayer === 'banter') {
    if (banterType === 'challenge-setup') {
      return { role: 'tsukkomi', moods: ['comedy', 'snappy'], strength: 'medium', startOffset: 6 };
    }
    if (banterType === 'panic-tsukkomi') {
      return { role: normalized.includes('痛') || normalized.includes('まず') ? 'deflate' : 'tsukkomi', moods: ['fail', 'comedy'], strength: 'medium', startOffset: 4 };
    }
    if (banterType === 'payoff-callback') {
      return { role: 'success-sting', moods: ['positive', 'uplift'], strength: 'light', startOffset: 4 };
    }
    if (banterType === 'overconfidence-break') {
      return { role: 'tsukkomi', moods: ['comedy', 'snappy'], strength: 'medium', startOffset: 6 };
    }
  }

  if (sceneRole === 'victory') {
    return { role: 'success-sting', moods: ['positive', 'uplift'], strength: 'light', startOffset: 8 };
  }

  if (sceneRole === 'risk' || emphasis === 'panic') {
    return { role: 'impact-soft', moods: ['dramatic', 'serious'], strength: 'heavy', startOffset: 4 };
  }

  if (sceneRole === 'escalation' || emphasis === 'boss' || emphasis === 'hype') {
    return { role: 'impact-soft', moods: ['dramatic', 'energetic'], strength: 'heavy', startOffset: 6 };
  }

  if (normalized.includes('!') || normalized.includes('！')) {
    return { role: 'accent-ping', moods: ['clean', 'tech'], strength: 'light', startOffset: 0 };
  }

  return null;
};

const chooseSeForSegment = ({ seAssets, sceneRole, banterType, draftLayer, text, emphasis, globalSeVolume = 0.78 }) => {
  const intent = chooseSeIntent({ sceneRole, banterType, draftLayer, text, emphasis });
  if (!intent) {
    return [];
  }

  const ranked = [...seAssets]
    .map((asset) => ({
      asset,
      score: scoreSeAsset({
        asset,
        role: intent.role,
        moods: intent.moods ?? [],
        strength: intent.strength,
      }),
    }))
    .sort((left, right) => right.score - left.score || left.asset.file.localeCompare(right.asset.file));

  const winner = ranked[0]?.asset;
  if (!winner) {
    return [];
  }

  return [
    {
      file: winner.file,
      startOffset: intent.startOffset ?? 0,
      volume: Number(Math.min(0.95, (winner.recommendedVolume ?? 0.65) * globalSeVolume).toFixed(2)),
      duration: winner.durationFrames ?? 36,
    },
  ];
};

export const buildGameplayAudioPlan = () => {
  const audioDirection = readJson(AUDIO_DIRECTION_PATH, {});
  return {
    audioDirection,
    bgmAssets: buildBgmAssetIndex(),
    seAssets: buildSeAssetIndex(),
  };
};

export const buildExplainerAudioPlan = () => {
  const audioDirection = readJson(AUDIO_DIRECTION_PATH, {});
  return {
    audioDirection,
    bgmAssets: buildBgmAssetIndex(),
  };
};

export {
  buildBgmSequenceForScenes,
  chooseBgmTrack,
  chooseSeForSegment,
  explainerRoleToBgmRole,
  gameplayRoleToBgmRole,
};
