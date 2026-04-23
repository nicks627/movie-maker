# Investment Chart Templates

投資銘柄や市況解説で使える Remotion ネイティブ図版テンプレートです。  
すべて `scene.popups[].component` と `scene.popups[].props` で呼び出せます。

## Available Templates

### `BarChart`
- 用途: 売上成長率、営業利益率比較、PER 比較
- 主要 props:
  - `title`
  - `bars[]`
  - `unit`
  - `tagline`

### `StockLineChart`
- 用途: 株価推移、売上推移、EPS 成長、指数比較
- 主要 props:
  - `title`
  - `symbol`
  - `timeframe`
  - `points[]`
  - `benchmark`
  - `highlights[]`
  - `prefix`
  - `suffix`
  - `decimals`
  - `note`

### `CandlestickChart`
- 用途: ローソク足、日足/週足の値動き解説
- 主要 props:
  - `title`
  - `symbol`
  - `candles[]`
  - `prefix`
  - `suffix`
  - `decimals`
  - `note`

### `AllocationDonutChart`
- 用途: 売上構成、地域別比率、事業ポートフォリオ
- 主要 props:
  - `title`
  - `centerLabel`
  - `centerValue`
  - `slices[]`
  - `note`

### `StatsCard`
- 用途: 時価総額、営業利益率、ROE、営業CF などの KPI まとめ
- 主要 props:
  - `title`
  - `stats[]`

## Script Example

```json
{
  "id": "scene_stock_line",
  "speaker": "metan",
  "text": "まずは株価のトレンドを見てみましょう。",
  "duration": 120,
  "popups": [
    {
      "component": "StockLineChart",
      "props": {
        "title": "株価推移",
        "symbol": "AAPL",
        "timeframe": "2024 Q1 - 2025 Q1",
        "prefix": "$",
        "decimals": 0,
        "points": [
          { "label": "Q1", "value": 182 },
          { "label": "Q2", "value": 188 },
          { "label": "Q3", "value": 205 },
          { "label": "Q4", "value": 212 },
          { "label": "Q1", "value": 226 }
        ],
        "benchmark": {
          "name": "S&P 500",
          "color": "#a78bfa",
          "points": [
            { "label": "Q1", "value": 180 },
            { "label": "Q2", "value": 184 },
            { "label": "Q3", "value": 192 },
            { "label": "Q4", "value": 198 },
            { "label": "Q1", "value": 204 }
          ]
        },
        "highlights": [
          { "index": 2, "label": "決算後に上昇", "tone": "bull" }
        ],
        "note": "指数より強い上昇トレンド"
      },
      "imageX": 50,
      "imageY": 74,
      "imageWidth": 100,
      "imageHeight": 46,
      "startOffset": 8,
      "duration": 96,
      "effect": { "type": "fadeIn", "duration": 16 }
    }
  ]
}
```

## Tips

- `imageWidth: 100`, `imageHeight: 46` 前後にすると、縦動画でも「資料」ではなく「動画内 UI」っぽく見えやすいです。
- 数値が多い図版ほど、`startOffset` を少し遅らせて `duration` を長めに取ると読みやすくなります。
- 比較グラフは 3-5 項目までに絞ると、ショート動画でも理解されやすいです。
