# Motion Effect Templates

`image` / `popup.component` で使える演出テンプレートです。`scene.popups[].effect` に設定すると、静止画像や Remotion 図版でも動画らしい動きを付けられます。

## Available Effects

- `fadeIn`: ゆっくり表示
- `fadeOut`: ゆっくり退場
- `slideIn`: 画面端から流入
- `zoom`: 拡大しながら表示
- `blur`: ピンぼけから合焦
- `flash`: フラッシュで切替
- `wipe`: ワイプ表示
- `pulse`: 鼓動のように脈打つ
- `ripple`: 中央から波紋が広がる
- `float`: ふわっと上下に漂う
- `bounce`: 軽く跳ねる
- `swing`: 看板のように揺れる
- `orbit`: 中心の周りをゆるく回り込む
- `glitch`: デジタルノイズで揺らす
- `spin`: 回転しながら導入
- `drift`: ゆっくり流れる
- `spotlight`: 中央フォーカスで見せる
- `chromatic`: 色収差っぽい分離演出

## Common Parameters

- `duration`: エフェクトの長さ
- `intensity`: 動きの強さ
- `frequency`: 動きの細かさ
- `direction`: `slideIn` `wipe` `drift` の方向
- `startScale` / `endScale`: `zoom` `spin` の拡大率
- `blurAmount`: `blur` のぼかし量
- `color`: 発光やアクセント色
- `secondaryColor`: `chromatic` の副色
- `rotation`: `swing` `spin` の回転量

## Example

```json
{
  "image": "assets/images/chart.png",
  "startOffset": 24,
  "duration": 120,
  "imageX": 50,
  "imageY": 20,
  "imageWidth": 72,
  "imageHeight": 58,
  "effect": {
    "type": "ripple",
    "duration": 28,
    "intensity": 1.2,
    "frequency": 1.1,
    "color": "#38bdf8"
  }
}
```

## Suggested Use

- `ripple` / `spotlight`: 地図、注目指標、重要ニュース
- `drift` / `float`: 風景、背景資料、説明用の図版
- `pulse` / `chromatic`: サムネ風の強調、煽り気味の演出
- `glitch` / `spin`: サイバー、速報、切り札の場面
