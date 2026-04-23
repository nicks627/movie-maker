const fs = require('fs');

const RAW_SCENES = [
  // Part 1: Intro & Hook
  { s: "reimu", t: "「日本の税金は高すぎる！海外に出たほうが絶対に豊かになれる！」ネットの書き込みでよく見る意見だけど、ぶっちゃけどうなのかな？", role: "hook", pop: "KineticText", popTitle: "「日本は税金が高い」は本当か？" },
  { s: "marisa", t: "多くの人がそう思い込んでいるが、実際のデータを比較すると、まったく違う景色が見えてくるんだぜ。結論から言うと、大半の日本人にとって、日本の税や社会保険の仕組みは『世界でもトップクラスに恵まれている』のさ。", role: "conclusion", pop: "TwoColumnComparison", popLeft: "世間のイメージ", popRight: "実際のデータ", popLVal: "日本は搾取されている", popRVal: "大半は日本の方が手取りが多い" },
  { s: "reimu", t: "ええっ！本当に？でも給料から毎月ものすごい額が引かれて手取りが減ってる気がするけど…。", role: "context" },
  { s: "marisa", t: "気持ちはわかるぜ。だが、今回はアメリカの３つの州と、ヨーロッパの主要４カ国を対象に、税金や健康保険のリアルな負担額を比較してみるぜ。", role: "context" },
  { s: "reimu", t: "アメリカのニューヨーク、カリフォルニア、テキサス。それにヨーロッパはイギリス、ドイツ、フランス、スイスね！", role: "context" },
  
  // Part 2: Macro (OECD Tax Wedge)
  { s: "marisa", t: "まずはマクロな視点だ。オーイーシーディーという経済協力開発機構のデータによれば、単身世帯の税負担を示す「タックス・ウェッジ」の順位で、日本は加盟３８カ国中、なんと２６カ国よりも負担が軽いんだ。", role: "chart-read", pop: "BarChart", popTitle: "オーイーシーディー 各国の税負担率 (Tax Wedge)", popData: [["フランス", 46.8], ["ドイツ", 47.9], ["イギリス", 31.5], ["日本", 32.7], ["アメリカ", 29.8]], popTag: "日本は意外と真ん中より下" },
  { s: "reimu", t: "あれ？日本って上位じゃないの？フランスやドイツは４６パーセント以上も取られてるじゃない！", role: "reaction" },
  { s: "marisa", t: "そう、ヨーロッパの主要国は日本よりもはるかに税負担が重いんだ。例えばフランスなんて、企業の負担も含めると労働コストの半分近くが税金と社会保険料で消えていくんだぜ。", role: "context" },
  { s: "reimu", t: "でも、ヨーロッパは医療費や学費がタダだから、トータルでは向こうの方がいいんじゃないの？", role: "question" },
  { s: "marisa", t: "確かに医療費や大学の学費は無料の国が多い。しかし、その分消費税がえげつない。イギリス、フランス、ドイツなどは消費税、いわゆる付加価値税が２０パーセント前後もあるんだぜ。", role: "chart-read", pop: "TwoColumnComparison", popLeft: "日本の消費税", popRight: "欧州の付加価値税", popLVal: "10%", popRVal: "約20%" },
  { s: "reimu", t: "消費税が２０パーセント！？１００円のりんごが１２０円になるってこと？毎日の生活費にかかるんだから、貯金なんて全然できないじゃない！", role: "reaction" },
  { s: "marisa", t: "その通り。そして無料の医療も問題だらけだ。イギリスの公的医療は無料だが、数ヶ月待ちなんてザラにあるんだぜ。専門医に診てもらう前に病気が悪化することもあるから、お金持ちは結局高いプライベート保険を使うんだ。", role: "context" },
  
  // Part 3: USA Illusion
  { s: "reimu", t: "なるほど、ヨーロッパが厳しいのはわかったわ。でもアメリカはどう？あっちの方が給料高いし、テキサスなんて所得税がないんでしょ？", role: "question", pop: "KineticText", popTitle: "アメリカン・ドリームの真実" },
  { s: "marisa", t: "確かにテキサス州のような場所は、州の所得税がゼロだ。おまけに平均給与も日本よりずっと高いから、手取りが多く見える。しかし、ここには最大の罠が潜んでいるんだぜ。", role: "context" },
  { s: "reimu", t: "最大の罠？まさか、物価が高いとかそういう話？", role: "reaction" },
  { s: "marisa", t: "物価もあるが、最大の問題は「健康保険」のシステムだ。日本は公的皆保険があって、収入に応じて保険料が決まるだろ？", role: "context" },
  { s: "marisa", t: "ところがアメリカには全国民一律の公的な健康保険が存在しない。基本的に民間の保険会社から自分で買うか、会社を通じて買うしかないんだ。", role: "context" },
  { s: "reimu", t: "民間保険って、医療保険のＣＭでやってるみたいなやつ？高そうだけど、いくらくらいするの？", role: "question" },
  { s: "marisa", t: "ニューヨークで標準的な単身保険に入ると、なんと年間約１３５万円。所得税ゼロのテキサス州でも、年間約１６６万円もの保険料がかかるんだぜ。家族がいればこの２倍、３倍に跳ね上がる。", role: "chart-read", pop: "BarChart", popTitle: "年間の健康保険料目安 (単身・アメリカ)", popData: [["日本 (年収460万)", 23], ["米国NY", 135], ["米国テキサス", 166]] },
  { s: "reimu", t: "ひぇえええ！！年間１６６万円！？月に１０万円以上も保険料だけで消えるの！？", role: "reaction" },
  { s: "marisa", t: "これでもまだ序の口だ。恐ろしいのは、この保険料を払っていても、医療費が完全無料になるわけじゃないことだ。アメリカの保険には「免責額」というものがある。", role: "context" },
  { s: "reimu", t: "めんせきがく？", role: "question" },
  { s: "marisa", t: "つまり、例えば「年間で治療費が７５万円を超えるまでは、全額自己負担してね。７５万円を超えた分からやっと保険がカバーするからね」というシステムのことだ。", role: "context", pop: "ImpactNumber", popTitle: "免責額(自己負担)の壁", popValue: "約75万円以上" },
  { s: "reimu", t: "えええ！毎月１３万円の保険料を払った上で、さらに風邪や怪我で７５万円使うまでは保険が効かないの！？", role: "reaction" },
  { s: "marisa", t: "そう。だからちょっと怪我をして救急車を呼んで、病院で数針縫っただけで請求書が５０万円届き、免責額に達していないから全額自腹、なんてことが普通に起きるんだぜ。", role: "context" },
  { s: "reimu", t: "なにそれ、保険の意味あるの！？自己破産する人が多いのも納得だわ……。", role: "reaction" },

  // Part 4: Average Income Simulation
  { s: "marisa", t: "ここで、具体的な年収でシミュレーションしてみよう。まずは日本の平均年収に近い、年収４６０万円の人がいたとする。", role: "comparison", pop: "KineticText", popTitle: "シミュレーション：年収460万円" },
  { s: "marisa", t: "日本の場合、所得税や住民税、社会保険料をすべて引いても、実質的な手取りは約３５０万円残る。健康保険料も年間２３万円程度で済むんだ。", role: "context" },
  { s: "reimu", t: "３５０万円も残るなら、一人暮らしなら十分に生活できる額ね！病気になっても医療費は３割負担だし安心だわ。", role: "reaction" },
  { s: "marisa", t: "一方、カリフォルニア州で年収４６０万円の場合、税金自体は約７０万円と日本より少し軽い。しかし、先ほどのバカ高い民間医療保険料１３５万円が重くのしかかる。", role: "context" },
  { s: "marisa", t: "結果として、保険料支払い後の実質的な手取りは、なんと約２５０万円まで減ってしまうんだ。", role: "chart-read", pop: "TwoColumnComparison", popLeft: "日本 (手取り)", popRight: "米国CA (手取り)", popLVal: "約350万円", popRVal: "約250万円" },
  { s: "reimu", t: "ええっ！？カリフォルニアだと同じ年収なのに手取りが１００万円も低くなるの！？生活できないじゃない！", role: "reaction" },
  { s: "marisa", t: "そう。アメリカは低〜中所得者にとっては、固定費である医療保険があまりにも重すぎる。日本のように所得連動で保険料が下がる配慮がないから、残酷なほど貧困層に厳しいんだぜ。", role: "context" },

  // Part 5: High Earners
  { s: "reimu", t: "でも、ＩＴエンジニアとか金融のプロなら、年収１５００万円とか２０００万円稼げるからアメリカのほうがいいんでしょ？", role: "question" },
  { s: "marisa", t: "そこが面白いところなんだが、実は年収１３６０万円までは、テキサス州よりも日本の方が実質的な手取りが多いんだぜ。", role: "comparison" },
  { s: "reimu", t: "年収１３００万円でも日本の方が有利なの！？信じられない！", role: "reaction" },
  { s: "marisa", t: "年収が上がれば税率は上がるが、それでもアメリカの高額な保険料をペイできるほど日米の税率差は開かないんだ。ニューヨーク州との比較に至っては、さらに衝撃だぜ。", role: "context" },
  { s: "marisa", t: "ニューヨーク州の場合、州や市の所得税も加わるから、なんと年収２５００万円の層でも、まだ日本の方が実質的な手取りが多いという結果になるんだ。", role: "chart-read", pop: "BarChart", popTitle: "年収2500万円の実質手取り", popData: [["日本", 1475], ["米国CA", 1422], ["米国NY", 1406]], popTag: "NYより日本の方がまだ多い" },
  { s: "reimu", t: "年収２５００万円の富裕層でも日本のほうが手取りが多いなんて……。ネットで言われてる「日本は罰ゲーム」って完全に嘘じゃないの！", role: "reaction" },

  // Part 6: Quality of Life
  { s: "marisa", t: "さらに言えば、生活の質も考慮する必要がある。手取り額が同じだったとしても、アメリカと日本では支出額が全く違うからな。", role: "context", pop: "KineticText", popTitle: "本当の豊かさとは？" },
  { s: "marisa", t: "ニューヨークで日本と同じレベルの治安、清潔さ、利便性を求めれば、家賃はワンルームでも月に４０万円から５０万円は下らない。カリフォルニアも同様だぜ。", role: "context" },
  { s: "reimu", t: "月に５０万円の家賃！？年収１０００万円あっても余裕で破産しそうね……。", role: "reaction" },
  { s: "marisa", t: "日本では東京都内でも７、８万円出せば、安全で清潔なワンルームが借りられる。コンビニやスーパーでは数百円で驚くほど美味しいお弁当が買えるだろ？アメリカではサンドイッチとコーラで３０００円飛ぶことも普通だぜ。", role: "context" },
  { s: "reimu", t: "日本って、めちゃくちゃ物価が安くて恵まれてるのね。しかも、高額療養費制度とかいう最強のシステムのおかげで、重病になっても自己負担の上限が決まってるんでしょ？", role: "context" },
  { s: "marisa", t: "その通り。日本の健康保険には高額療養費制度があり、例えば心臓の手術で１０００万円かかっても、一般的な所得なら月々の負担上限は８万円程度で済むんだ。", role: "chart-read", pop: "ImpactNumber", popTitle: "日本の高額療養費制度", popValue: "月額の基本上限 約8万円" },
  { s: "reimu", t: "アメリカの民間保険だと、免責額を払った上で、さらにそこから治療費の数十パーセントを負担させられたりして、天井知らずなんでしょ？日本がいかに安心かよくわかるわ。", role: "reaction" },

  // Part 7: Conclusion
  { s: "marisa", t: "一部の超絶エリートや、外資系のトップ層にとって、税金が安くて給料が青天井のアメリカに行くメリットはある。それこそ年収５０００万円を狙うような層だな。", role: "context" },
  { s: "marisa", t: "だが、９９パーセントの国民にとって、これほどまで安全で、清潔で、安価に高度な医療が受けられて、美味しいご飯が安く食べられて、かつ手取りも残る国は、世界中を探しても他にないんだぜ。", role: "conclusion", pop: "BulletList", popTitle: "日本の強みまとめ", popBullets: ["低〜中所得でも適正な保険料", "最強の『高額療養費制度』", "物価安と治安の良さ", "欧米より低い消費税率(10%)"], popTag: "大半の人にとって最適解の国" },
  { s: "reimu", t: "なるほどね！隣の芝生は青く見えるだけだったのね。文句ばかり言う前に、日本のシステムのありがたさを正しく理解することが大切だわ！", role: "summary" },
  { s: "marisa", t: "その通りだ。税金や社会保険のニュースはネガティブに報道されがちだが、数字を比べてみると日本の底力が見えてくる。みんなもネットの噂に惑わされないように気をつけてくれよな！", role: "summary" },
  { s: "reimu", t: "それではご視聴ありがとうございました！", role: "outro" }
];

// Mapper logic
const scenes = RAW_SCENES.map((raw, idx) => {
  const sceneId = \`scene_\${String(idx).padStart(2, '0')}\`;
  const s = {
    id: sceneId,
    sceneRole: raw.role || "context",
    speaker: raw.s,
    text: raw.t,
    speedScale: 1.6, // Force globally
    asset_query: "data technology graph money",
    bg_image: \`assets/images/berkshire_\${(idx % 4 === 0 ? 'intro' : idx % 3 === 0 ? 'growth' : idx % 2 === 0 ? 'flow' : 'risk')}_bg.svg\`,
    sceneEffect: idx % 5 === 0 ? { stylePreset: "documentary" } : {},
    popups: [],
    se: [],
    voiceFile: \`\${sceneId}.wav\`
  };

  if (raw.pop === "KineticText") {
    s.popups.push({
      component: "KineticText",
      props: { text: raw.popTitle },
      imageX: 50, imageY: 50, imageWidth: 80, imageHeight: 30,
      duration: 300, startOffset: 10
    });
  } else if (raw.pop === "TwoColumnComparison") {
    s.popups.push({
      component: "TwoColumnComparison",
      props: { title: raw.popTitle || "比較", leftTitle: raw.popLeft, rightTitle: raw.popRight, leftValue: String(raw.popLVal), rightValue: String(raw.popRVal) },
      imageX: 50, imageY: 50, imageWidth: 90, imageHeight: 60,
      duration: 400, startOffset: 10
    });
  } else if (raw.pop === "BarChart") {
    s.popups.push({
      component: "BarChart",
      props: { title: raw.popTitle, data: raw.popData.map(d => ({ label: d[0], value: d[1] })), tagline: raw.popTag || "", accent: "#3b82f6" },
      imageX: 50, imageY: 50, imageWidth: 80, imageHeight: 60,
      duration: 400, startOffset: 10
    });
  } else if (raw.pop === "BulletList") {
    s.popups.push({
      component: "BulletList",
      props: { title: raw.popTitle, bullets: raw.popBullets, tagline: raw.popTag || "", accent: "#10b981" },
      imageX: 50, imageY: 50, imageWidth: 80, imageHeight: 60,
      duration: 400, startOffset: 10
    });
  } else if (raw.pop === "ImpactNumber") {
    s.popups.push({
      component: "ImpactNumber",
      props: { title: raw.popTitle, value: String(raw.popValue), suffix: "", tagline: raw.popTag || "", accent: "#ef4444" },
      imageX: 50, imageY: 50, imageWidth: 80, imageHeight: 40,
      duration: 300, startOffset: 10
    });
  }
  return s;
});

const outJson = {
  activeVariant: "long",
  long: { scenes },
  short: { scenes: scenes.slice(0, 20) } 
};

fs.writeFileSync('src/data/script.json', JSON.stringify(outJson, null, 2), 'utf8');
console.log(\`Successfully generated \${scenes.length} scenes to src/data/script.json!\`);
