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
        sceneEffect: { stylePreset: "yukkuri-rich" },
        popups,
        se: [],
        subtitleText: text,
        subtitleStyle: { backgroundColor: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8, textAlign: "center", fontSize: 64, color: "#f8fafc", textShadow: "0 4px 18px rgba(2, 6, 23, 0.78)" },
        subtitleWidth: 82, subtitleHeight: 12, subtitleY: 4, speechText: text
    });
};

addScene('metan', 'hook', 'イーロン・マスクによる「テラファブ」構想。月間100万枚のウェハー処理というTSMCの70%に匹敵する大風呂敷は本物か？第一原理で読み解きますわ。', 'elon musk futuristic semiconductor factory', 'assets/images/placeholder.svg', [
    { component: "HookHeadline", props: { title: "Terafab構想を読み解く", subtitle: "第一原理が壊す半導体の常識", tag: "2026.03.21", accentColor: "#ef4444", secondaryColor: "#38bdf8" }, imageX: 50, imageY: 48, imageWidth: 86, imageHeight: 34, startOffset: 10, duration: 200, effect: { type: "fadeIn", duration: 18 } }
]);
addScene('metan', 'setup', 'この構想の根本にある「第一原理思考」。これはSpaceXでロケットを再利用し、テスラで6000トンのギガプレスを生み出した思考法ですの。', 'spacex tesla innovation history', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', '既存の常識をすべて捨てて、物理法則だけをベースに最適解を出すやり方なのだ！半導体産業の天文学的な部品コストにメスを入れるのだな。', 'shocked character big numbers', 'assets/images/placeholder.svg');
addScene('metan', 'explanation', 'なぜテラファブが必要か。テスラの完全自動運転用チップや、Optimus、xAIのスーパーコンピューター「Colossus」など、マスクのエコシステムは深刻な半導体不足に直面しているからですわ。', 'chip shortage bottleneck supply chain', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', '既存のファウンドリじゃ全然生産スピードが足りないから、「自分で作るしかない」ってことなのだ！', 'halted business process wall', 'assets/images/placeholder.svg');

addScene('metan', 'reveal', 'マスクが壊す4つの常識。一つ目は「ファブ全体のクリーンルーム化」です。汚染から守るべきは建物全体ではなくウェハーの表面だけ。これが「ダーティ・ファブ」構想ですわ。', 'dirty factory vs clean container', 'assets/images/placeholder.svg', [
    { component: "TwoColumnComparison", props: { left: { title: "従来ファブ", items: ["建物全体がISOクラス5", "莫大な空調・電力", "工期が数年単位"], titleColor: "#a8a29e", arrows: true }, right: { title: "ダーティ・ファブ", items: ["容器内のみ極限密封", "建屋は一般工場レベル", "コスト・工期を劇的圧縮"], titleColor: "#eab308", highlight: true } }, imageX: 50, imageY: 44, imageWidth: 86, imageHeight: 38, startOffset: 10, duration: 250, effect: { type: "slideIn", duration: 16, direction: "up" } }
]);
addScene('zundamon', 'context', '人間を排除してOptimusロボットに搬送させれば、部分的なクリーン化だけでコストと工期が劇的に下がるのだ！', 'humanoid robot handling semiconductor container', 'assets/images/placeholder.svg');
addScene('metan', 'setup', '二つ目は「サプライチェーンの分業」。設計からテストまでを一つの巨大施設に統合し、「再帰的ループ」で超高速なチップ改善サイクルを回しますの。', 'recursive loop cycle fast', 'assets/images/placeholder.svg');
addScene('zundamon', 'reaction', '三つ目は「モノリシック3D統合」なのだ！ロジックとメモリをZ軸に重ねて、データの転送渋滞である「メモリの壁」を一気に解決するシリコンのギガプレスなのだ！', '3d monolithic integration chips stacked', 'assets/images/placeholder.svg');
addScene('metan', 'reveal', '四つ目が極めつけ。「データセンターを宇宙に置く」。D3チップを高温動作させ、真空の深宇宙へ熱輻射冷却する軌道上データセンター計画ですわ。', 'space data center satellite orbit shocked', 'assets/images/placeholder.svg');
addScene('zundamon', 'escalation', '燃料費ゼロ、冷却水ゼロ！Starshipで安く打ち上げれば地上のコスト構造を完全に破壊できるのだ！', 'starship launch zero cost infinite energy', 'assets/images/placeholder.svg');

addScene('metan', 'risk', 'しかし実現の壁は厚いですわ。EUVリソグラフィの有機汚染問題や、軌道上の放射線劣化など未解決課題は山積みですのよ。', 'euv lithography extreme precision organic contamination microscope', 'assets/images/placeholder.svg');
addScene('zundamon', 'explanation', 'それでも「再帰的ループ」によるAIプロセスの最適化は、テスラの垂直統合ノウハウが生きるから実現性が高いのだ。', 'ai optimization feedback loop fast technology', 'assets/images/placeholder.svg');
addScene('metan', 'summary', 'TSMCには中長期的に最強の交渉カードとなり、ASMLや日本の素材・検査装置メーカー（東京エレクトロン等）には特大の恩恵をもたらすポテンシャルがありますわ。', 'japan stock market rising tokyo electronics', 'assets/images/placeholder.svg');
addScene('zundamon', 'victory', '半導体投資の未来を占う「SpaceXモーメント」。今後の装置発注動向から絶対に目が離せないのだ！', 'investor looking at glowing chart data insight', 'assets/images/placeholder.svg');

const finalJson = {
    project: { title: "イーロン・マスクの「テラファブ」構想を第一原理で読み解く", defaultVariant: "long" },
    template: { id: "yukkuri-explainer" },
    output: { preset: "landscape-fhd" },
    audio: { bgmVolume: 0.08, voiceVolume: 1.24, seVolume: 0.76, voiceDucking: 0.4, duckFadeFrames: 12, masterVolume: 1 },
    activeVariant: "long",
    long: { characterScale: 0, bgm_sequence: [ { at_scene: 0, file: "2_23_AM.mp3" }, { at_scene: 7, file: "Chilled_Cow.mp3" } ], scenes },
    short: { generationMode: "summary", themeColor: "#0ea5e9", subtitleStyle: { fontSize: 72, padding: 16 }, scenes: [] }
};

const outPath = path.join(__dirname, 'src', 'data', 'script.json');
fs.writeFileSync(outPath, JSON.stringify(finalJson, null, 2), 'utf-8');
console.log('Script written.');
