# Map Templates

地図を使った説明向けのテンプレートです。`scene.popups[].component` に指定すると、静止画を用意しなくても Remotion 上でそのまま描画できます。

## Components

### `GeoPoliticalMap`

色分けした地域マップ、凡例、補足ラベルをまとめて表示します。宗派、勢力圏、売上エリア、出店地域、物流網などに向いています。

主な props:

- `title`
- `subtitle`
- `legendTitle`
- `mapLabel`
- `note`
- `backgroundImage`
- `outlinePath`
- `regions`
- `legendItems`
- `callouts`
- `accentColor`

`outlinePath` と `regions[].path` を指定すると任意の地図シルエットを使えます。未指定ならレバノン風のサンプルマップで動きます。

### `OrbitalMapZoom`

宇宙空間から目的地へズームし、最後に地域マップへ着地する導入テンプレートです。Google Earth 風の「引きから寄る」演出に向いています。

主な props:

- `title`
- `subtitle`
- `locationLabel`
- `focusLabel`
- `mapLabel`
- `note`
- `backgroundImage`
- `outlinePath`
- `regions`
- `callouts`
- `accentColor`
- `secondaryColor`

## Example

```json
{
  "component": "GeoPoliticalMap",
  "props": {
    "title": "レバノン国内の主な宗派",
    "subtitle": "地図を色分けして勢力の分布を説明",
    "legendTitle": "主要宗派",
    "mapLabel": "レバノン",
    "note": "凡例、色分け、注釈をまとめて表示"
  },
  "imageX": 50,
  "imageY": 46,
  "imageWidth": 92,
  "imageHeight": 74,
  "duration": 140,
  "effect": {
    "type": "ripple",
    "duration": 28,
    "intensity": 1.1,
    "frequency": 0.9,
    "color": "#38bdf8"
  }
}
```

```json
{
  "component": "OrbitalMapZoom",
  "props": {
    "title": "宇宙からレバノンへ",
    "subtitle": "広域から局地へズームして導入",
    "locationLabel": "Middle East",
    "focusLabel": "Lebanon",
    "mapLabel": "レバノン"
  },
  "imageX": 50,
  "imageY": 46,
  "imageWidth": 92,
  "imageHeight": 74,
  "duration": 150,
  "effect": {
    "type": "spotlight",
    "duration": 24,
    "intensity": 1.0,
    "color": "#38bdf8"
  }
}
```
