/**
 * animations/index.ts
 *
 * アニメーションコンポーネントのレジストリ。
 * infographicRegistry と同様に、popup の component フィールドから参照できる。
 *
 * script.json での使い方:
 * ```json
 * {
 *   "popups": [{
 *     "component": "KineticText",
 *     "props": { "text": "すごい！", "style": "bounce" },
 *     "startOffset": 0,
 *     "duration": 90
 *   }]
 * }
 * ```
 */
import React from 'react';
import { KineticText }    from './KineticText';
import { HookHeadline }   from './HookHeadline';
import { LowerThird }     from './LowerThird';
import { ParticleBurst }  from './ParticleBurst';
import { CountUp }        from './CountUp';
import { Typewriter }     from './Typewriter';
import { FilmGrain }      from './FilmGrain';
import { Vignette }       from './Vignette';
import { ColorGrade }     from './ColorGrade';
import { PoliticalShockBanner } from './PoliticalShockBanner';

type AnimationComponent = React.FC<Record<string, unknown>>;

export const animationRegistry: Record<string, AnimationComponent> = {
  // ── テキスト系 ──────────────────────────────
  KineticText:   KineticText   as unknown as AnimationComponent,
  HookHeadline:  HookHeadline  as unknown as AnimationComponent,
  Typewriter:    Typewriter    as unknown as AnimationComponent,
  CountUp:       CountUp       as unknown as AnimationComponent,
  PoliticalShockBanner: PoliticalShockBanner as unknown as AnimationComponent,

  // ── UI オーバーレイ系 ─────────────────────────
  LowerThird:    LowerThird    as unknown as AnimationComponent,
  ParticleBurst: ParticleBurst as unknown as AnimationComponent,

  // ── シネマティックエフェクト系 ──────────────────
  // (sceneEffect 経由でも使えるが popup としても単体利用可)
  FilmGrain:    FilmGrain    as unknown as AnimationComponent,
  Vignette:     Vignette     as unknown as AnimationComponent,
  ColorGrade:   ColorGrade   as unknown as AnimationComponent,
};

// 全コンポーネントと型定義を re-export
export { KineticText }    from './KineticText';
export { HookHeadline }   from './HookHeadline';
export { LowerThird }     from './LowerThird';
export { ParticleBurst }  from './ParticleBurst';
export { CountUp }        from './CountUp';
export { Typewriter }     from './Typewriter';
export { FilmGrain }      from './FilmGrain';
export { Vignette }       from './Vignette';
export { ColorGrade }     from './ColorGrade';
export { PoliticalShockBanner } from './PoliticalShockBanner';
export { CameraShakeWrapper, calcShakeTransform } from './CameraShake';
export type { KineticTextProps }    from './KineticText';
export type { HookHeadlineProps }   from './HookHeadline';
export type { LowerThirdProps }     from './LowerThird';
export type { ParticleBurstProps }  from './ParticleBurst';
export type { CountUpProps }        from './CountUp';
export type { TypewriterProps }     from './Typewriter';
export type { FilmGrainProps }      from './FilmGrain';
export type { VignetteProps }       from './Vignette';
export type { ColorGradeProps, ColorGradePreset } from './ColorGrade';
export type { PoliticalShockBannerProps } from './PoliticalShockBanner';
export type { CameraShakeConfig }   from './CameraShake';
