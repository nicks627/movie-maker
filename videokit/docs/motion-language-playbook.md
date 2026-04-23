# Motion Language Playbook

このプロジェクトでは、`動きを後付けする` のではなく、`シーン演出をプリセットとして選ぶ` 方向で再利用できるようにしています。  
使う入口は主に 3 つです。

- 背景クリップの `sceneEffect.stylePreset`
- 背景クリップの `sceneEffect.cameraMotion`
- 背景クリップの `sceneEffect.overlay`

加えて、画像や Remotion 図版は `popup.effect`、場面切替は `transition` で演出できます。

## 1. 追加したモジュール

- `src/effects/scene-effect-presets.ts`
  - シーン演出プリセット
  - カメラモーション定義
  - オーバーレイ定義
- `src/effects/scene-transition-presets.ts`
  - トランジション一覧
  - 方向指定可否の共通定義
- `src/components/scene-effects/BackgroundSceneMedia.tsx`
  - Ken Burns
  - パン
  - プッシュイン / プルアウト
  - パララックス
  - ドキュメンタリー漂い
  - Shorts 向けパンチイン
- `src/components/scene-effects/SceneOverlayLayer.tsx`
  - ライトリーク
  - レターボックス
  - アーカイブ枠
  - Broadcast HUD
  - Variety Glow
- `src/components/scene-effects/LightLeakOverlay.tsx`
  - トランジションとシーンオーバーレイの共通ライトリーク

## 2. シーン演出プリセット

背景クリップの右ペインから次を選べます。

- `yukkuri-rich`
  - ゆっくりズーム中心
  - 彩度少し高め
  - 強すぎないビネット
- `shorts-punch`
  - 冒頭のパンチイン
  - 少し強めのライトリーク
  - テンポ重視
- `documentary`
  - 漂うようなカメラ
  - アーカイブ枠
  - muted 寄りの色
- `variety`
  - パララックス
  - 発光オーバーレイ
  - にぎやかな色
- `product-showcase`
  - ゆるい push-in
  - HUD 風の情報レイヤー
  - 比較や商品説明向き

## 3. 背景カメラモーション

`sceneEffect.cameraMotion.type`

- `none`
- `ken-burns`
- `pan-left`
- `pan-right`
- `pan-up`
- `pan-down`
- `push-in`
- `pull-out`
- `parallax`
- `documentary-drift`
- `short-punch`

調整できる主な値:

- `intensity`
- `speed`
- `focusX`
- `focusY`
- `parallaxDepth`

## 4. シーンオーバーレイ

`sceneEffect.overlay.type`

- `none`
- `light-leak`
- `letterbox`
- `archive-frame`
- `broadcast-hud`
- `variety-glow`

調整できる主な値:

- `intensity`
- `color`
- `secondaryColor`

## 5. 追加した popup エフェクト

`popup.effect.type`

- `popIn`
  - サムネ風にポンと出る
- `hover`
  - ふわりと浮かぶ
- `reactionJump`
  - リアクション用のジャンプ

既存の `ripple / pulse / float / drift / glitch / chromatic` と組み合わせて使えます。

## 6. 追加したトランジション

`transition.type`

- `lightLeak`
  - Shorts や商品紹介でよくある明るいリーク切替
- `whip`
  - スピード感のある横流し切替

既存の `dissolve / wipe / slide / push / zoom / blur / flash / iris / split / spin / glitch` も引き続き使えます。

## 7. script での例

```json
{
  "id": "scene_05",
  "speaker": "metan",
  "text": "この場面はドキュメンタリーっぽく見せたいです",
  "duration": 150,
  "bg_image": "assets/images/factory.jpg",
  "sceneEffect": {
    "stylePreset": "documentary",
    "cameraMotion": {
      "type": "documentary-drift",
      "intensity": 0.8,
      "focusX": 58,
      "focusY": 42
    },
    "overlay": {
      "type": "archive-frame",
      "intensity": 0.9,
      "color": "#f8fafc",
      "secondaryColor": "#38bdf8"
    },
    "colorGrade": {
      "preset": "muted",
      "intensity": 0.7
    },
    "filmGrain": {
      "opacity": 0.08
    }
  },
  "transition": {
    "type": "lightLeak",
    "duration": 18
  },
  "popups": [
    {
      "component": "KineticText",
      "props": {
        "text": "重要ポイント",
        "style": "pop",
        "accentColor": "#38bdf8"
      },
      "startOffset": 18,
      "duration": 54,
      "effect": {
        "type": "popIn",
        "duration": 16,
        "intensity": 1.1
      }
    }
  ]
}
```

## 8. どのジャンルで何を使うか

- ゆっくり解説
  - `yukkuri-rich`
  - `ken-burns`
  - `dissolve`
  - `lightLeak` は要所だけ
- Shorts
  - `shorts-punch`
  - `short-punch`
  - `whip`
  - `popIn`
- ドキュメンタリー
  - `documentary`
  - `documentary-drift`
  - `archive-frame`
  - `letterbox`
- バラエティ
  - `variety`
  - `parallax`
  - `variety-glow`
  - `reactionJump`
- 商品紹介
  - `product-showcase`
  - `push-in`
  - `broadcast-hud`
  - `lightLeak`

## 9. 参考にした表現の方向性

今回のモジュール化は、次の方向性を参照して整理しています。

- Remotion 公式の `interpolate` と transitions の考え方
- Ken Burns 的な静止画へのゆっくりしたズーム・パン
- レイヤー速度差で奥行きを出す parallax
- lower-third のような情報整理用の画面要素
- Shorts やバラエティでよく見る light leak / whip / punch-in

参考:

- https://www.remotion.dev/docs/interpolate/
- https://www.remotion.dev/docs/transitions/
- https://photography.tutsplus.com/articles/how-and-why-to-add-movement-to-still-images--cms-32772
- https://helpx.adobe.com/animate/using/layer-depth.html
- https://www.adobe.com/express/learn/blog/lower-third
- https://designshack.net/articles/trends/video-motion-graphics-trends/
