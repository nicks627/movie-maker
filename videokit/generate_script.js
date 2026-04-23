const fs = require('fs');
const path = require('path');

const scenes = [];

const addScene = (speaker, sceneRole, text, assetQuery, bgImage, popups = [], speedScale = 1.3) => {
    scenes.push({
        id: `scene_${scenes.length.toString().padStart(2, '0')}`,
        speaker,
        sceneRole,
        text,
        speedScale,
        asset_query: assetQuery,
        bg_image: bgImage,
        bg_video: null,
        sceneEffect: {
            stylePreset: "yukkuri-rich"
        },
        popups,
        se: [],
        subtitleText: text,
        subtitleStyle: {
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: 12,
            borderRadius: 8,
            textAlign: "center",
            fontSize: 64,
            color: "#f8fafc",
            textShadow: "0 4px 18px rgba(2, 6, 23, 0.78)"
        },
        subtitleWidth: 82,
        subtitleHeight: 12,
        subtitleY: 4,
        speechText: text
    });
};

addScene('metan', 'hook', 'イーロン・マスクによる半導体製造の常識破壊、「Terafab（テラファブ）」プロジェクト。今回はこれを第一原理で読み解きますわ。', 'elon musk futuristic semiconductor factory', 'assets/images/placeholder.svg', [
    {
        component: "HookHeadline",
        props: {
            title: "Terafab構想",
            subtitle: "第一原理で読む半導体の未来",
            tag: "2026.03.21 発表",
            accentColor: "#ef4444",
            secondaryColor: "#38bdf8"
        },
        imageX: 50, imageY: 48, imageWidth: 86, imageHeight: 34,
        startOffset: 10, duration: 200, effect: { type: "fadeIn", duration: 18 }
    }
]);
addScene('metan', 'setup', '2026年3月21日、テキサス州オースティンで発表されたこの計画。総投資額は250億ドル、日本円で約3.8兆円という凄まじい規模ですの。', 'money investment big scale', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', '月間100万枚のウェハー処理！？それってTSMCの全世界生産能力の70%に匹敵するって言われてるのだ！大風呂敷じゃないのか！？', 'shocked character big numbers', 'assets/images/placeholder.svg');
addScene('metan', 'context', '普通はそう思いますわ。しかし、スペースXやテスラで「第一原理思考」を使って常識を覆してきた彼ですから、大風呂敷で終わるかはまだ分かりませんの。', 'spacex tesla innovation history', 'assets/images/placeholder.svg');
addScene('zundamon', 'setup', 'なるほど！人類史上最も複雑な製造プロセスである半導体に、あの思考法を適用しようとしているのだな！', 'complex semiconductor microchip', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', 'ええ。まず、なぜテラファブが必要なのか。それはマスクのエコシステム全体が「深刻な半導体不足」に直面しているからですわ。', 'chip shortage bottleneck supply chain', 'assets/images/placeholder.svg');
addScene('zundamon', 'context', 'テスラの完全自動運転（FSD）用AIチップやCybercab、人間型ロボットOptimus。これらが爆発的にチップを消費するのだ。', 'tesla optimus robot cybercab car', 'assets/images/placeholder.svg', [
    {
        component: "BarChart",
        props: {
            title: "テスラの칩需要予測 (指数関数的増加)",
            labels: ["2023", "2025", "2027(Est)", "2030(Est)"],
            series: [{ name: "Demand", data: [100, 300, 1500, 5000], color: "#eab308" }],
            yAxisLabel: "Relative Demand"
        },
        imageX: 50, imageY: 46, imageWidth: 80, imageHeight: 40,
        startOffset: 10, duration: 250, effect: { type: "zoomIn", duration: 16 }
    }
]);
addScene('metan', 'escalation', 'さらにxAIの巨大スーパーコンピューター「Colossus」を2ギガワット規模へ拡張する計画もありますの。既存ファウンドリの成長速度では全く足りませんの。', 'supercomputer glowing server data center', 'assets/images/placeholder.svg');
addScene('zundamon', 'summary', '既存のTSMC等は巨額投資のリスクを恐れて保守的にならざるを得ないから、「自作しないと全社が止まる」レベルの死活問題ってわけなのだ。', 'halted business process wall', 'assets/images/placeholder.svg');

// 4つの常識
addScene('metan', 'setup', 'ここからが本題です。第一原理に基づく「4つの常識破壊」。一つ目は「ファブ全体をクリーンルームにしなければならない」という常識の破壊です。', 'clean room sterile factory', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', 'え？半導体工場って、チリ一つ無い超清浄な部屋で作るのが当たり前でしょ？ショートしちゃうのだ！', 'dust particle destroying circuit', 'assets/images/placeholder.svg');
addScene('metan', 'reveal', 'マスクは「汚染から守るべきは建物全体か？それともウェハーの表面か？」という物理的な問いを立てました。', 'silicon wafer surface extreme zoom', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', '……確かに、装置と装置の間にある無駄に広い空間まで綺麗にする必要は、物理的には無いのだ……！', 'realization spark bulb', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', 'その通りですわ。ウェハーが外気に晒される瞬間だけを極限まで保護し、建屋全体の清浄度は下げる。これを彼は「ダーティ・ファブ」と呼んでいますの。', 'dirty factory vs clean container', 'assets/images/placeholder.svg', [
        {
        component: "TwoColumnComparison",
        props: {
            left: { title: "従来ファブ", items: ["建物全体がISOクラス5", "莫大な空調・電力", "工期が数年単位"], titleColor: "#a8a29e", arrows: true },
            right: { title: "ダーティ・ファブ", items: ["容器内のみ極限密封", "建屋は一般工場レベル", "コスト・工期を劇的圧縮"], titleColor: "#eab308", highlight: true }
        },
        imageX: 50, imageY: 44, imageWidth: 86, imageHeight: 38,
        startOffset: 10, duration: 250, effect: { type: "slideIn", duration: 16, direction: "up" }
    }
]);
addScene('zundamon', 'context', '一番の汚染源である「人間」を排除し、テスラのOptimusロボットに搬送させるからこそ成立する強烈な発想なのだ！', 'humanoid robot handling semiconductor container', 'assets/images/placeholder.svg');
addScene('metan', 'setup', '続いて二つ目、「サプライチェーンは分業が最適」の破壊ですわ。現在、設計からテストまで世界中に分散し、サイクルタイムが数ヶ月もかかっていますの。', 'global shipping logistics map complicated', 'assets/images/placeholder.svg');
addScene('zundamon', 'explanation', 'ファブレス、ファウンドリ、OSAT…って専門特化して分業するのが今の最先端なのだ！', 'different company logos fragmented', 'assets/images/placeholder.svg');
addScene('metan', 'reveal', 'マスクは「全てを一カ所に集めろ」と言っていますの。一つの巨大な建物で設計、製造、テストまで再帰的ループを回すのです。', 'recursive loop cycle fast', 'assets/images/placeholder.svg');
addScene('zundamon', 'context', 'スペースXが部品の85%を内製化してコストを75%削減したのと同じロジックなのだ。距離と分業は開発を遅らせる悪なのだ！', 'spacex rocket engine manufacturing', 'assets/images/placeholder.svg');

// 常識 ③ ④
addScene('metan', 'setup', '三つ目の常識破壊は、「ロジックとメモリは別々に作る」ですわ。', 'logic vs memory chips separated', 'assets/images/placeholder.svg');
addScene('zundamon', 'explanation', '計算する場所と記憶する場所は分かれているから、その間でデータの渋滞が起きる。「メモリの壁」ってやつなのだ。', 'data bottleneck wall computer', 'assets/images/placeholder.svg');
addScene('metan', 'reveal', 'だから、ロジックとメモリをZ軸方向に重ねる「モノリシック3D統合」で配線距離をナノミリ単位まで縮める計画ですわ。', '3d monolithic integration chips stacked', 'assets/images/placeholder.svg', [
    {
        component: "TwoColumnComparison",
        props: {
            left: { title: "2D配置", items: ["平面にロジックとメモリ", "ミリ規模の配線", "データの転送渋滞が発生"], titleColor: "#ef4444" },
            right: { title: "3D統合", items: ["Z軸に高密度積層", "ナノ規模の極短配線", "消費電力激減＆帯域幅急増"], titleColor: "#3b82f6", highlight: true }
        },
        imageX: 50, imageY: 42, imageWidth: 86, imageHeight: 38,
        startOffset: 10, duration: 250, effect: { type: "fadeIn", duration: 16 }
    }
]);
addScene('zundamon', 'reaction', 'まるでテスラの巨大なギガプレスのシリコン版なのだ！情報の移動距離を物理的にもっとも短くするってことか！', 'giga press electric car molding', 'assets/images/placeholder.svg');
addScene('metan', 'setup', 'そして最後の四つ目、「データセンターは地上に置くもの」という最も強固な常識の破壊ですわ。', 'server farm datacenter earth', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', 'えっ！？まさか、データセンターを宇宙に持っていくのだ！？', 'space data center satellite orbit shocked', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', 'なんと、テラファブで生産されるチップの約80%は宇宙へ打ち上げ、軌道上データセンター専用の「D3」チップとする計画ですの。', 'orbit satellite emitting data signals', 'assets/images/placeholder.svg');
addScene('zundamon', 'context', '宇宙なら太陽光パネルで強力な電力を確保できるけど、真空だと空冷が使えなくて熱暴走するんじゃないのだ！？', 'satellite solar panel burning heat', 'assets/images/placeholder.svg');
addScene('metan', 'reveal', 'そこがミソですわ。D3チップは地上とは逆転の発想で設計されます。100℃以上の高温で動作させるのですの。', 'high temperature chip glowing red', 'assets/images/placeholder.svg');
addScene('zundamon', 'escalation', '温度が高いほど熱輻射エネルギーが大きくなる物理法則を利用し、深宇宙への熱輻射効率を極大化するのだな！', 'radiation heat transfer deep space cooling', 'assets/images/placeholder.svg');
addScene('metan', 'summary', '燃料費ゼロ、冷却水ゼロ、グリッド接続費ゼロ！スターシップで安く打ち上げられれば、地上のデータセンターのコスト構造を完全に破壊できるという第一原理計算ですわ。', 'starship launch zero cost infinite energy', 'assets/images/placeholder.svg');

// 現実性
addScene('zundamon', 'setup', '理屈は凄いけど、これって本当に実現するのだ？理論と量産の壁は厚いのだ。', 'investor analyzing risk chart doubt', 'assets/images/placeholder.svg');
addScene('metan', 'risk', '冷静な評価は不可欠ですわ。たとえば「ダーティ・ファブ」については、微細化の壁となる「EUVリソグラフィ」の性質上、FOUPの密封だけでは有機汚染を防ぎきれないという専門家の指摘がありますのよ。', 'euv lithography extreme precision organic contamination microscope', 'assets/images/placeholder.svg');
addScene('zundamon', 'context', '完全なダーティ化はまだ先でも、建屋の清浄度をクラス5から7へ緩和する「部分的なダーティ化」だけでも大幅なコスト削減にはなるのだ。', 'partial clean room optimization diagram factory', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', '一方で実現性が高いのは「再帰的ループ」ですわ。AIを活用してプロセスを最適化するシステムは、テスラの垂直統合ノウハウが十二分に生きるはずですの。', 'ai optimization feedback loop fast technology', 'assets/images/placeholder.svg');
addScene('zundamon', 'risk', '軌道上のデータセンターは一番革命的だけど、一番リスクが高いのだ。打ち上げコストが計算通りに下がらないと成り立たないのだ。', 'high risk space business rocket cost money burning', 'assets/images/placeholder.svg');
addScene('metan', 'summary', '全要素が100%計画通りにならなくても、構成要素の一部が実現するだけで市場のコスト構造に激震が走るポテンシャルを持っていますわ。', 'earthquake shattering market dominance infrastructure', 'assets/images/placeholder.svg');

// インパクト
addScene('zundamon', 'setup', 'もしテラファブが本格稼働し始めたら、TSMCやサムスンはどうなってしまうのだ！？', 'tsmc samsung factory worried executives', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', '短期的には直接の脅威にはなりませんわ。しかし中長期的には、テラファブの存在自体が「条件を呑まないなら自分で作る」という最強の交渉カードとして機能しますのよ。', 'poker game business negotiation powerful card leverage', 'assets/images/placeholder.svg');
addScene('zundamon', 'reveal', 'それに新しい製造装置が大量に必要になるから、ASMLや日本の素材・検査装置メーカーには特大のビジネスチャンスが生まれるのだ！', 'asml tokyo electron semiconductor equipment profit japan', 'assets/images/placeholder.svg');
addScene('metan', 'summary', 'おっしゃる通りですわ。テラファブの月産100万枚というスケールアップは、日本の関連企業に多大な恩恵をもたらす可能性が高いですの。', 'japan stock market rising tokyo electronics', 'assets/images/placeholder.svg');
addScene('zundamon', 'context', '歩留まりのリスクや、まだまだ解決すべき課題は山積みだけど、半導体業界にとっての「スペースXモーメント」になる可能性を秘めているのだ。', 'spacex launch breakthrough paradigm shift universe', 'assets/images/placeholder.svg');
addScene('metan', 'cta', '今後の装置調達動向や歩留まりデータにこそ、半導体投資の未来を占う鍵が隠されていますわ。決して目を離してはいけませんの。', 'investor looking at glowing chart data insight', 'assets/images/placeholder.svg');
addScene('zundamon', 'victory', '今回の解説はここまでなのだ！テラファブの続報が出たらまた深掘りするのだ！', 'happy thumbs up ending character cute', 'assets/images/placeholder.svg');
addScene('metan', 'cta', 'チャンネル登録と高評価、ぜひよろしくお願いいたしますわ！それではまた次回お会いしましょう。', 'subscribe like button glowing red youtube', 'assets/images/placeholder.svg');

const finalJson = {
    project: {
        title: "イーロン・マスク「テラファブ」構想を第一原理で読み解く (新)",
        defaultVariant: "long"
    },
    template: { id: "yukkuri-explainer" },
    output: { preset: "landscape-fhd" },
    audio: {
        bgmVolume: 0.08,
        voiceVolume: 1.24,
        seVolume: 0.76,
        voiceDucking: 0.4,
        duckFadeFrames: 12,
        masterVolume: 1
    },
    activeVariant: "long",
    long: {
        characterScale: 0,
        bgm_sequence: [
            { at_scene: 0, file: "2_23_AM.mp3" },
            { at_scene: 15, file: "Chilled_Cow.mp3" },
            { at_scene: 30, file: "夕暮れアベニュー.mp3" }
        ],
        scenes
    },
    short: {
        generationMode: "summary",
        themeColor: "#0ea5e9",
        subtitleStyle: {
            "fontSize": 72,
            "padding": 16
        },
        scenes: []
    }
};

const outPath = path.join(__dirname, 'src', 'data', 'script.json');
fs.writeFileSync(outPath, JSON.stringify(finalJson, null, 2), 'utf-8');
console.log('Done!');
