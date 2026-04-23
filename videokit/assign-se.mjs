/**
 * assign-se.mjs
 *
 * script.json の各シーンに SE を自動割り当てします。
 *
 * Layer 1: se-dictionary.json のキーワード辞書
 * Layer 2: se-context-rules.json のステートマシンルール
 * Layer 3: se-manifest.json から role / mood / strength に合う実ファイルを解決
 *
 * 使い方:
 *   node assign-se.mjs
 *   node assign-se.mjs --dry-run
 *   node assign-se.mjs --apply-review
 *   node assign-se.mjs --variant long
 *   node assign-se.mjs --variant short
 *   node assign-se.mjs --variant all
 */

import fs from 'fs';

const SCRIPT_PATH = 'src/data/script.json';
const DICT_PATH = 'se-dictionary.json';
const RULES_PATH = 'se-context-rules.json';
const MANIFEST_PATH = 'se-manifest.json';
const REVIEW_PATH = 'se-review.json';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY_REVIEW = args.includes('--apply-review');

const getArgValue = (name, fallback) => {
  const exactIndex = args.findIndex((arg) => arg === name);
  if (exactIndex !== -1 && args[exactIndex + 1]) {
    return args[exactIndex + 1];
  }

  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  return fallback;
};

const REQUESTED_VARIANT = getArgValue('--variant', 'active');

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
};

const normalizeStrength = (value) => {
  if (value === 'light' || value === 'medium' || value === 'heavy') {
    return value;
  }
  return undefined;
};

const isIntent = (value) => {
  return isObject(value) && (typeof value.file === 'string' || typeof value.role === 'string');
};

const sanitizeIntentMap = (map) => {
  if (!isObject(map)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(map).filter(([, value]) => isIntent(value))
  );
};

const parseManifest = (manifestData) => {
  const fallbackVolume = manifestData?.defaults?.fallbackVolume ?? 0.65;
  const fallbackDurationFrames = manifestData?.defaults?.fallbackDurationFrames ?? 36;
  const assets = Array.isArray(manifestData?.assets)
    ? manifestData.assets
        .filter((asset) => isObject(asset) && typeof asset.file === 'string' && asset.file.length > 0)
        .map((asset) => ({
          file: asset.file,
          role: typeof asset.role === 'string' ? asset.role : undefined,
          mood: normalizeList(asset.mood),
          strength: normalizeStrength(asset.strength),
          texture: normalizeList(asset.texture),
          aliases: normalizeList(asset.aliases),
          recommendedVolume:
            typeof asset.recommendedVolume === 'number'
              ? asset.recommendedVolume
              : fallbackVolume,
          durationFrames:
            typeof asset.durationFrames === 'number'
              ? asset.durationFrames
              : fallbackDurationFrames,
          notes: typeof asset.notes === 'string' ? asset.notes : '',
        }))
    : [];

  return {
    fallbackVolume,
    fallbackDurationFrames,
    assets,
  };
};

const resolveVariantKeys = (data, requestedVariant) => {
  if (requestedVariant === 'all') {
    return ['timeline', 'long', 'short'].filter((key) => Array.isArray(data?.[key]?.scenes));
  }

  if (requestedVariant === 'active') {
    const active = data?.activeVariant;
    if (typeof active === 'string' && Array.isArray(data?.[active]?.scenes)) {
      return [active];
    }
    if (Array.isArray(data?.long?.scenes)) return ['long'];
    if (Array.isArray(data?.short?.scenes)) return ['short'];
    if (Array.isArray(data?.timeline?.scenes)) return ['timeline'];
    return [];
  }

  if (Array.isArray(data?.[requestedVariant]?.scenes)) {
    return [requestedVariant];
  }

  return [];
};

const getScenesForVariant = (data, variantKey) => data?.[variantKey]?.scenes ?? [];

const setScenesForVariant = (data, variantKey, scenes) => {
  if (!data?.[variantKey]) {
    data[variantKey] = {};
  }
  data[variantKey].scenes = scenes;
};

const calcTemperatures = (scenes, dict) => {
  const weights = dict.emotionWeights ?? {};
  let temp = 0.25;
  const alpha = 0.35;

  return scenes.map((scene) => {
    const weight = weights[scene.emotion ?? ''] ?? 0.2;
    temp = temp * (1 - alpha) + weight * alpha;
    return Math.round(temp * 100) / 100;
  });
};

const getTemperatureMultiplier = (temp, dict) => {
  const thresholds = dict.temperatureThresholds ?? {};
  if (temp <= (thresholds.low?.max ?? 0.3)) return thresholds.low?.intensityMultiplier ?? 0.7;
  if (temp <= (thresholds.mid?.max ?? 0.6)) return thresholds.mid?.intensityMultiplier ?? 1.0;
  return thresholds.high?.intensityMultiplier ?? 1.35;
};

const applyTemperature = (intent, tempMult, emotionMult) => {
  if (!intent) return null;
  const volume = Math.min(1.0, (intent.volume ?? 0.7) * tempMult * emotionMult);
  return {
    ...intent,
    volume: Math.round(volume * 100) / 100,
  };
};

const matchRule = (rule, scene, prevScene, temp) => {
  const conditions = rule.conditions ?? {};

  if (conditions.prevEmotion && prevScene?.emotion !== conditions.prevEmotion) return false;
  if (conditions.currentEmotionOneOf && !conditions.currentEmotionOneOf.includes(scene.emotion ?? '')) return false;
  if (conditions.speaker && conditions.speaker !== scene.speaker) return false;
  if (conditions.temperatureMin !== undefined && temp < conditions.temperatureMin) return false;
  if (conditions.temperatureMax !== undefined && temp > conditions.temperatureMax) return false;

  if (conditions.keywordOneOf) {
    const text = scene.text ?? '';
    if (!conditions.keywordOneOf.some((keyword) => text.includes(keyword))) return false;
  }

  return true;
};

const matchKeyword = (text, keywordMap) => {
  for (const [keyword, intent] of Object.entries(keywordMap)) {
    if (text.includes(keyword)) {
      return intent;
    }
  }
  return null;
};

const strengthDistance = (a, b) => {
  const order = ['light', 'medium', 'heavy'];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai === -1 || bi === -1) return undefined;
  return Math.abs(ai - bi);
};

const resolveIntentToAsset = (intent, manifest, defaultDurationFrames) => {
  if (!intent) {
    return { se: null, resolution: null };
  }

  const assets = manifest.assets;
  if (!assets.length) {
    return {
      se: null,
      resolution: {
        status: 'missing-manifest-assets',
        requested: intent,
      },
    };
  }

  const exactFile = typeof intent.file === 'string' ? assets.find((asset) => asset.file === intent.file) : null;
  if (exactFile) {
    return {
      se: {
        file: exactFile.file,
        volume: intent.volume ?? exactFile.recommendedVolume ?? manifest.fallbackVolume,
        startOffset: intent.startOffset ?? 0,
        duration: intent.duration ?? exactFile.durationFrames ?? defaultDurationFrames,
      },
      resolution: {
        status: 'resolved',
        strategy: 'exact-file',
        requested: intent,
        chosen: exactFile.file,
        chosenRole: exactFile.role,
        score: 999,
      },
    };
  }

  const desiredMoods = normalizeList(intent.mood);
  const desiredTextures = normalizeList(intent.texture);
  const desiredAliases = normalizeList(intent.aliases);
  const desiredStrength = normalizeStrength(intent.strength);

  const scored = assets.map((asset) => {
    let score = 0;
    const reasons = [];

    if (intent.file && asset.aliases.includes(intent.file)) {
      score += 45;
      reasons.push('alias-file');
    }

    if (typeof intent.role === 'string' && asset.role === intent.role) {
      score += 40;
      reasons.push('role');
    }

    const aliasMatches = desiredAliases.filter((alias) => asset.aliases.includes(alias));
    if (aliasMatches.length > 0) {
      score += aliasMatches.length * 10;
      reasons.push(`alias:${aliasMatches.join(',')}`);
    }

    const moodMatches = desiredMoods.filter((mood) => asset.mood.includes(mood));
    if (moodMatches.length > 0) {
      score += moodMatches.length * 8;
      reasons.push(`mood:${moodMatches.join(',')}`);
    }

    const textureMatches = desiredTextures.filter((texture) => asset.texture.includes(texture));
    if (textureMatches.length > 0) {
      score += textureMatches.length * 4;
      reasons.push(`texture:${textureMatches.join(',')}`);
    }

    if (desiredStrength && asset.strength) {
      const distance = strengthDistance(desiredStrength, asset.strength);
      if (distance === 0) {
        score += 10;
        reasons.push('strength-exact');
      } else if (distance === 1) {
        score += 4;
        reasons.push('strength-near');
      }
    }

    return {
      asset,
      score,
      reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score || b.asset.recommendedVolume - a.asset.recommendedVolume || a.asset.file.localeCompare(b.asset.file));
  const winner = scored[0];

  if (!winner || winner.score <= 0) {
    return {
      se: null,
      resolution: {
        status: 'unresolved',
        strategy: 'role-match',
        requested: intent,
      },
    };
  }

  return {
    se: {
      file: winner.asset.file,
      volume: intent.volume ?? winner.asset.recommendedVolume ?? manifest.fallbackVolume,
      startOffset: intent.startOffset ?? 0,
      duration: intent.duration ?? winner.asset.durationFrames ?? defaultDurationFrames,
    },
    resolution: {
      status: 'resolved',
      strategy: 'scored-match',
      requested: intent,
      chosen: winner.asset.file,
      chosenRole: winner.asset.role,
      score: winner.score,
      reasons: winner.reasons,
    },
  };
};

const assignSEForVariant = (scenes, dict, rules, manifest, variantKey) => {
  const temperatures = calcTemperatures(scenes, dict);
  const keywords = sanitizeIntentMap(dict.keywords);
  const emotions = dict.emotions ?? {};
  const emphasisMap = sanitizeIntentMap(dict.emphasisEmotionSE);
  const defaultDurationFrames = dict.defaultSEDurationFrames ?? manifest.fallbackDurationFrames ?? 36;
  const activeRules = Array.isArray(rules)
    ? rules.filter((rule) => isObject(rule) && (rule.result === null || isIntent(rule.result)))
    : [];
  const sortedRules = [...activeRules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return scenes.map((scene, index) => {
    const previousScene = index > 0 ? scenes[index - 1] : null;
    const temperature = temperatures[index];
    const tempMult = getTemperatureMultiplier(temperature, dict);
    const emotionMult = emotions[scene.emotion ?? '']?.intensityMultiplier ?? 1.0;
    const text = scene.text ?? '';

    let matchedIntent = null;
    let matchedSe = null;
    let layerUsed = null;
    let ruleApplied = null;
    let resolution = null;

    for (const rule of sortedRules) {
      if (!matchRule(rule, scene, previousScene, temperature)) {
        continue;
      }

      layerUsed = 2;
      ruleApplied = rule.id ?? null;
      if (rule.result === null) {
        break;
      }

      matchedIntent = applyTemperature(rule.result, tempMult, emotionMult);
      const resolved = resolveIntentToAsset(matchedIntent, manifest, defaultDurationFrames);
      matchedSe = resolved.se;
      resolution = resolved.resolution;
      break;
    }

    if (!matchedIntent && layerUsed === null) {
      const keywordIntent = matchKeyword(text, keywords);
      if (keywordIntent) {
        layerUsed = 1;
        matchedIntent = applyTemperature(keywordIntent, tempMult, emotionMult);
        const resolved = resolveIntentToAsset(matchedIntent, manifest, defaultDurationFrames);
        matchedSe = resolved.se;
        resolution = resolved.resolution;
      }
    }

    if (!matchedIntent && layerUsed === null) {
      const emotionIntent = emphasisMap[scene.emotion ?? ''];
      if (emotionIntent) {
        layerUsed = 1.5;
        matchedIntent = applyTemperature(emotionIntent, tempMult * 0.8, 1.0);
        const resolved = resolveIntentToAsset(matchedIntent, manifest, defaultDurationFrames);
        matchedSe = resolved.se;
        resolution = resolved.resolution;
      }
    }

    return {
      variant: variantKey,
      sceneId: scene.id ?? `scene_${index}`,
      text: text.slice(0, 60),
      speaker: scene.speaker ?? '',
      emotion: scene.emotion ?? '',
      temperature,
      se: matchedSe ? [matchedSe] : [],
      _meta: {
        layerUsed,
        ruleApplied,
        tempMult,
        emotionMult,
        requestedIntent: matchedIntent,
        resolution,
      },
    };
  });
};

const applyReview = (data, reviewEntries) => {
  const entriesByVariant = new Map();
  for (const entry of reviewEntries) {
    const variantKey = entry.variant ?? data.activeVariant ?? 'long';
    if (!entriesByVariant.has(variantKey)) {
      entriesByVariant.set(variantKey, new Map());
    }
    entriesByVariant.get(variantKey).set(entry.sceneId, entry.se);
  }

  for (const [variantKey, reviewMap] of entriesByVariant.entries()) {
    const scenes = getScenesForVariant(data, variantKey);
    const updated = scenes.map((scene, index) => {
      const key = scene.id ?? `scene_${index}`;
      if (reviewMap.has(key)) {
        return { ...scene, se: reviewMap.get(key) };
      }
      return scene;
    });
    setScenesForVariant(data, variantKey, updated);
  }
};

const data = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8'));
const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
const rules = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));
const manifest = parseManifest(JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')));
const targetVariants = resolveVariantKeys(data, REQUESTED_VARIANT);

if (targetVariants.length === 0) {
  console.warn(`⚠️ variant "${REQUESTED_VARIANT}" に対応する scenes が見つかりませんでした。`);
  process.exit(0);
}

if (APPLY_REVIEW) {
  if (!fs.existsSync(REVIEW_PATH)) {
    console.error(`se-review.json が見つかりません: ${REVIEW_PATH}`);
    process.exit(1);
  }

  const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'));
  applyReview(data, review);
  fs.writeFileSync(SCRIPT_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ ${REVIEW_PATH} の内容を ${SCRIPT_PATH} に適用しました`);
} else {
  const allResults = [];

  for (const variantKey of targetVariants) {
    const scenes = getScenesForVariant(data, variantKey);
    if (!Array.isArray(scenes) || scenes.length === 0) {
      continue;
    }

    const results = assignSEForVariant(scenes, dict, rules, manifest, variantKey);
    allResults.push(...results);

    if (!DRY_RUN) {
      const updatedScenes = scenes.map((scene, index) => ({
        ...scene,
        se: results[index].se,
      }));
      setScenesForVariant(data, variantKey, updatedScenes);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(SCRIPT_PATH, JSON.stringify(data, null, 2));
    console.log(`✅ ${targetVariants.join(', ')} に SE を割り当てました -> ${SCRIPT_PATH}`);
  }

  const review = allResults.map((result) => ({
    variant: result.variant,
    sceneId: result.sceneId,
    text: result.text,
    speaker: result.speaker,
    emotion: result.emotion,
    temperature: result.temperature,
    se: result.se,
    _meta: result._meta,
  }));
  fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2));

  if (DRY_RUN) {
    console.log('🔍 Dry-run: script.json は変更していません');
  }

  console.log(`📋 レビュー用ファイルを出力しました -> ${REVIEW_PATH}`);
  console.log('   確認・修正後に: node assign-se.mjs --apply-review');

  const withSE = allResults.filter((result) => result.se.length > 0).length;
  const layer1 = allResults.filter((result) => result._meta.layerUsed === 1).length;
  const layer15 = allResults.filter((result) => result._meta.layerUsed === 1.5).length;
  const layer2 = allResults.filter((result) => result._meta.layerUsed === 2 && result.se.length > 0).length;
  const explicitSilence = allResults.filter((result) => result._meta.layerUsed === 2 && result.se.length === 0).length;
  const unresolved = allResults.filter((result) => result._meta.resolution?.status === 'unresolved').length;

  console.log('\n📊 割り当て統計:');
  console.log(`   variant:   ${targetVariants.join(', ')}`);
  console.log(`   総シーン数: ${allResults.length}`);
  console.log(`   SE あり:   ${withSE} (Layer1: ${layer1}, emotionFB: ${layer15}, Layer2: ${layer2})`);
  console.log(`   明示無音:  ${explicitSilence}`);
  console.log(`   未解決:    ${unresolved}`);
}
