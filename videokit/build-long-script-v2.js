const fs = require('fs');

const RAW_SCENES = [
  // Part 1: Intro & Hook
  { s: "reimu", t: "「日本の税金は高すぎる！海外に出たほうが絶対に豊かになれる！」ネットの書き込みでよく見る意見だけど、ぶっちゃけどうなのかな？", role: "hook", pop: "KineticText", popTitle: "「日本は税金が高い」は本当か？" },
  { s: "marisa", t: "多くの人がそう思い込んでいるが、実際のデータを比較すると、まったく違う景色が見えてくるんだぜ。結論から言うと、大半の日本人にとって、日本の税や社会保険の仕組みは『世界でもトップクラスに恵まれている』のさ。", role: "conclusion", pop: "TwoColumnComparison", popLeft: "世間のイメージ", popRight: "実際のデータ", popLVal: "日本は搾取されている", popRVal: "大半は日本の方が手取りが多い" },
  { s: "reimu", t: "ええっ！本当に？でも給料から毎月ものすごい額が引かれて手取りが減ってる気がするけど…。", role: "context" },
  { s: "marisa", t: "気持ちはわかるぜ。だが、今回はアメリカの３つの州と、ヨーロッパの主要４カ国を対象に、税金や健康保険のリアルな負担額を比較してみるぜ。", role: "context" },
  { s: "reimu", t: "アメリカのニューヨーク、カリフォルニア、テキサス。それにヨーロッパはイギリス、ドイツ、フランス、スイスね！", role: "context" },
  { s: "marisa", t: "そうだ。年収４００万円の一般的な層から、年収２５００万円の富裕層まで、すべてのケースでどこが一番手取りが残るかをデータで証明していくぜ。", role: "context" },
  
  // Part 2: Macro (OECD Tax Wedge)
  { s: "marisa", t: "まずはマクロな視点だ。オーイーシーディーという経済協力開発機構のデータによれば、単身世帯の税負担を示す「タックス・ウェッジ」の順位で、日本は加盟３８カ国中、なんと２６カ国よりも負担が軽いんだ。", role: "chart-read", pop: "BarChart", popTitle: "オーイーシーディー 各国の税負担率 (Tax Wedge)", popData: [["フランス", 46.8], ["ドイツ", 47.9], ["イギリス", 31.5], ["日本", 32.7], ["アメリカ", 29.8]], popTag: "日本は意外と真ん中より下" },
  { s: "reimu", t: "あれ？日本って上位じゃないの？フランスやドイツは４６パーセント以上も取られてるじゃない！", role: "reaction" },
  { s: "marisa", t: "そう、ヨーロッパの主要国は日本よりもはるかに税負担が重いんだ。例えばフランスなんて、企業の負担も含めると労働コストの半分近くが税金と社会保険料で消えていくんだぜ。", role: "context" },
  { s: "reimu", t: "半分も！？一生懸命働いたお給料の半分が国に持っていかれるなんて、モチベーション下がりそうね。", role: "reaction" },
  { s: "marisa", t: "ドイツも同様だ。連帯付加税や教会税といった独自の税制もあり、独身者への風当たりは特に強い。手取りが増えないから、共働きが必須の社会構造が出来上がっているんだ。", role: "context" },

  // Part 3: Europe Reality
  { s: "reimu", t: "でも、ヨーロッパは医療費や学費がタダだから、トータルでは向こうの方がいいんじゃないの？", role: "question" },
  { s: "marisa", t: "確かに医療費や大学の学費は無料の国が多い。しかし、その分消費税がえげつない。イギリス、フランス、ドイツなどは消費税、いわゆる付加価値税が２０パーセント前後もあるんだぜ。", role: "chart-read", pop: "TwoColumnComparison", popLeft: "日本の消費税", popRight: "欧州の付加価値税", popLVal: "10%", popRVal: "約20%" },
  { s: "reimu", t: "消費税が２０パーセント！？１００円のりんごが１２０円になるってこと？毎日の生活費にかかるんだから、貯金なんて全然できないじゃない！", role: "reaction" },
  { s: "marisa", t: "その通り。それに、ヨーロッパ特有のエネルギー問題で電気代やガス代も日本の２倍から３倍に高騰している。税金で引かれた少ない手取りに、２０パーセントの消費税と鬼のような光熱費が襲いかかるんだ。", role: "context" },
  { s: "reimu", t: "そ、それは……想像しただけで息が詰まりそうね。", role: "reaction" },
  { s: "marisa", t: "そして無料の医療も問題だらけだ。イギリスの公的医療は原則無料だが、深刻な医師不足で何ヶ月待ちなんてザラにあるんだぜ。", role: "context" },
  { s: "reimu", t: "え！？病気なのにすぐ診てもらえないの？", role: "question" },
  { s: "marisa", t: "ああ。専門医に診てもらう前に病気が悪化することもあるから、お金持ちは結局高いプライベート保険を使うんだ。つまり「無料だけど使えない公的医療」と「高額な民間医療」の二極化が進んでいるのさ。", role: "context" },
  { s: "reimu", t: "日本なら、風邪を引いたらその日に近所のクリニックでパッと診てもらえるのに。あれって当たり前じゃなかったのね……。", role: "reaction" },
  
  // Part 4: Education vs Reality
  { s: "marisa", t: "教育費も同じだ。スウェーデンやドイツなどは大学の学費が無料だが、大学に入るまでの競争が激烈だし、大学生は生活費を稼ぐためにアルバイト漬けになることが多い。", role: "context" },
  { s: "marisa", t: "おまけに高負担ゆえに、若者の独立や結婚のハードルも上がっている。実家を出たくても資金がない若者が急増中だ。", role: "context" },
  { s: "reimu", t: "なんとなく北欧イコール、ユートピアみたいなイメージがあったけど、現実はシビアね。", role: "reaction" },
  
  // Part 5: USA Illusion
  { s: "reimu", t: "なるほど、ヨーロッパが厳しいのはわかったわ。でもアメリカはどう？あっちの方が給料高いし、テキサスなんて所得税がないんでしょ？", role: "question", pop: "KineticText", popTitle: "アメリカン・ドリームの真実" },
  { s: "marisa", t: "確かにテキサス州のような場所は、州の所得税がゼロだ。おまけに平均給与も日本よりずっと高いから、一見するとパラダイスに見える。しかし、ここには最大の罠が潜んでいるんだぜ。", role: "context" },
  { s: "reimu", t: "最大の罠？まさか、物価が高いとかそういう話？", role: "reaction" },
  { s: "marisa", t: "物価もあるが、最大の問題は「健康保険」のシステムだ。日本は公的皆保険があって、収入に応じて保険料が決まるだろ？", role: "context" },
  { s: "marisa", t: "ところがアメリカには全国民一律の公的な健康保険が存在しない。基本的に民間の保険会社から自分で大金を払って買うか、会社を通じて買うしかないんだ。", role: "context" },
  { s: "reimu", t: "民間保険って、医療保険のテレビシーエムでやってるみたいなやつ？高そうだけど、いくらくらいするの？", role: "question" },
  { s: "marisa", t: "ニューヨークで標準的な単身保険に入ると、なんと年間約１３５万円。所得税ゼロのテキサス州でも、年間約１６６万円もの保険料がかかるんだぜ。家族がいればこの２倍、３倍に跳ね上がる。", role: "chart-read", pop: "BarChart", popTitle: "年間の健康保険料目安 (単身・アメリカ)", popData: [["日本 (年収460万)", 23], ["米国ニューヨーク", 135], ["米国テキサス", 166]] },
  { s: "reimu", t: "ひぇえええ！！年間１６６万円！？月に１０万円以上も保険料だけで消えるの！？家賃並みの出費じゃないの！", role: "reaction" },
  { s: "marisa", t: "これでもまだ序の口だ。恐ろしいのは、この保険料を毎月ちゃんと払っていても、実際に病院にかかったときの医療費が完全無料になるわけじゃないことだ。", role: "context" },
  { s: "reimu", t: "え？保険に入ってるのに無料じゃないの？日本の３割負担みたいにお金を取られるってこと？", role: "question" },
  { s: "marisa", t: "いや、もっとエグい。アメリカの保険には「免責額」、英語でディダクティブルと呼ばれるものがあるんだ。", role: "context" },
  { s: "reimu", t: "めんせきがく？", role: "question" },
  { s: "marisa", t: "つまり、例えば「年間で治療費が７５万円を超えるまでは、全額自己負担してね。７５万円を超えた分からやっと保険がカバーするからね」という鬼畜システムのことだ。", role: "context", pop: "ImpactNumber", popTitle: "免責額(自己負担)の壁", popValue: "約75万円以上" },
  { s: "reimu", t: "えええ！毎月１３万円の保険料を払った上で、さらに風邪や怪我で７５万円使うまでは保険が一切効かないの！？そんなの詐欺じゃない！", role: "reaction" },
  { s: "marisa", t: "そう。だからちょっと怪我をして救急車を呼んで、病院で数針縫っただけで請求書が５０万円届き、免責額に達していないから全額自腹、なんてことが普通に起きるんだぜ。", role: "context" },
  { s: "reimu", t: "なにそれ、絶対に生きていけないわ……。ちょっとでも体調崩したら人生終了級のダメージじゃないの。", role: "reaction" },

  // Part 6: Average Income Simulation
  { s: "marisa", t: "ここで、具体的な年収でシミュレーションしてみよう。まずは日本の平均年収に近い、年収４６０万円の人がいたとする。", role: "comparison", pop: "KineticText", popTitle: "シミュレーション：年収460万円" },
  { s: "marisa", t: "日本の場合、所得税や住民税、社会保険料をすべて引いても、実質的な手取りは約３５０万円残る。健康保険料も年間２３万円程度で済むんだ。", role: "context" },
  { s: "reimu", t: "３５０万円も残るなら、一人暮らしなら十分に生活できる額ね！しかも病気になっても医療費は３割負担だし安心だわ。", role: "reaction" },
  { s: "marisa", t: "一方、カリフォルニア州で年収４６０万円の場合、税金自体は約７０万円と日本より少し軽い。しかし、先ほどのバカ高い民間医療保険料１３５万円が重くのしかかる。", role: "context" },
  { s: "marisa", t: "結果として、保険料支払い後の実質的な手取りは、なんと約２５０万円まで減ってしまうんだ。", role: "chart-read", pop: "TwoColumnComparison", popLeft: "日本 (手取り)", popRight: "米国カリフォルニア (手取り)", popLVal: "約350万円", popRVal: "約250万円" },
  { s: "reimu", t: "ええっ！？カリフォルニアだと同じ年収なのに手取りが１００万円も低くなるの！？物価も高いのに、手取りが少ないなんて地獄よ！", role: "reaction" },
  { s: "marisa", t: "そう。アメリカは低所得者や中所得者にとっては、固定費である医療保険があまりにも重すぎる。日本のように所得連動で保険料が下がる配慮がないから、残酷なほど貧困層に厳しいんだぜ。", role: "context" },
  { s: "reimu", t: "じゃあ、テキサス州ならいくらかマシなんじゃない？州の所得税がゼロだし！", role: "question" },
  { s: "marisa", t: "甘いな。テキサスは州税がない分、財源を別のところで回収している。実は全米でトップクラスに「固定資産税」が高いんだ。家を持つだけで強烈な税金をもっていかれる。", role: "context" },
  { s: "marisa", t: "さらにテキサスの健康保険料はカリフォルニアより高い。結局、トータルの負担を計算すると、年収４６０万円ならやはり日本の手取りの圧勝になるんだぜ。", role: "context" },

  // Part 7: High Earners
  { s: "reimu", t: "うーん、平均年収付近だと逆立ちしてもアメリカには勝てないのね。でも、アイティーエンジニアとか金融のプロなら、年収１５００万円とか２０００万円稼げるからアメリカのほうがいいんでしょ？", role: "question" },
  { s: "marisa", t: "そこが最高に面白いところなんだが、実は年収１３６０万円までは、テキサス州よりも日本の方が実質的な手取りが多いんだぜ。", role: "comparison" },
  { s: "reimu", t: "ええっ！？年収１３００万円でも日本の方が有利なの！？信じられない！", role: "reaction" },
  { s: "marisa", t: "年収が上がれば当然日本の税率も上がるが、それでもアメリカのバカ高い保険料をペイできるほど日米の税率差は開かないんだ。ニューヨーク州との比較に至っては、さらに衝撃だぜ。", role: "context" },
  { s: "marisa", t: "ニューヨーク州の場合、州の所得税や市の所得税も重くのしかかる。その結果、なんと年収２５００万円の富裕層でも、まだ日本の方が実質的な手取りが多いというデータが出ているんだ。", role: "chart-read", pop: "BarChart", popTitle: "年収2500万円の実質手取り", popData: [["日本", 1475], ["米国カリフォルニア", 1422], ["米国ニューヨーク", 1406]], popTag: "ニューヨークより日本の方がまだ多い" },
  { s: "reimu", t: "年収２５００万円の富裕層ですら日本のほうが手取りが多いなんて……。世間で言われてる「富裕層は税金が高いから海外へ逃げる」って完全に間違った認識じゃないの！", role: "reaction" },
  { s: "marisa", t: "そういうことだ。海外脱出で確実に得をするのは、配当収入メインの超大富豪か、シンガポールやドバイのような極端なタックスヘイブンに行ける一部の特権層だけだぜ。", role: "context" },

  // Part 8: Quality of Life & Hidden Benefits
  { s: "marisa", t: "さらに言えば、生活の質も考慮する必要がある。仮に手取り額が向こうで少し増えたとしても、アメリカと日本では支出の基準額が狂っているほど違うからな。", role: "context", pop: "KineticText", popTitle: "狂った海外物価" },
  { s: "marisa", t: "ニューヨークで日本と同じレベルの治安、清潔さ、利便性を求めれば、家賃はワンルームでも月に４０万円から５０万円は下らない。カリフォルニアも同様だぜ。", role: "context" },
  { s: "reimu", t: "月に５０万円の家賃！？年収１０００万円あっても余裕で破産しそうね……。ラーメン一杯３０００円とかいうニュースも見たことあるわ。", role: "reaction" },
  { s: "marisa", t: "日本では東京都内でも７万円から８万円出せば、安全で清潔なワンルームが借りられる。コンビニやスーパーでは数百円で驚くほど美味しいお弁当が買えるし、チップを払う必要もないだろ？", role: "context" },
  { s: "reimu", t: "日本って、めちゃくちゃ物価が安くて恵まれてるのね。お金の価値が全然違うわ。", role: "reaction" },
  { s: "marisa", t: "おまけに日本の社会保険の隠れた最強カード、「高額療養費制度」の存在を忘れてはならない。", role: "context" },
  { s: "reimu", t: "あ！重病になっても自己負担の上限が決まってるっていう、あの制度ね？", role: "context" },
  { s: "marisa", t: "その通り。日本の健康保険には高額療養費制度があり、例えば心臓の手術で１０００万円かかっても、一般的な所得なら月々の負担上限は８万から９万円程度で済むんだ。", role: "chart-read", pop: "ImpactNumber", popTitle: "日本の高額療養費制度", popValue: "月額の基本上限 約8万円" },
  { s: "marisa", t: "アメリカの民間保険だと、免辞額を払った上で、さらにそこから治療費の数十パーセントを負担させられたりして、上限に達するまで何百万円も請求されるリスクが常にある。", role: "context" },
  { s: "reimu", t: "アメリカで盲腸の手術を受けたら３００万円請求されて家を売った、なんて体験談を聞いたことがあるけど、あながち嘘じゃないのね。日本がいかに守られているかよくわかるわ。", role: "reaction" },

  // Part 9: Further considerations (Pension, Infrastructure)
  { s: "marisa", t: "まだまだあるぜ。日本の社会保険料には、医療保険だけでなく、年金や雇用保険、さらに一定年齢からは介護保険も含まれている。", role: "context" },
  { s: "marisa", t: "アメリカにもソーシャルセキュリティという公的年金はあるが、リタイア後の生活を保障するには到底足りず、結局個人で確定拠出年金などに多額の積み立てをしなければ老後を生き抜けない。", role: "context" },
  { s: "reimu", t: "ということは、同じ手取りに見えても、日本では老後のベースが国から保証されているのに、アメリカでは手取りの中からさらに老後資金を大量に削らなきゃいけないってこと？", role: "question" },
  { s: "marisa", t: "まさにその通りだ。さらに公共交通機関の正確さや発達度合いも段違い。日本なら月１万円の定期券で電車通勤できるが、アメリカでは車が必須になり、車体代、ガソリン代、バカ高い自動車保険料がかかる。", role: "context" },
  { s: "reimu", t: "もはや、数字上の手取り額だけで「日本は負けてる」なんて言ってる場合じゃないわね。目に見えないコストが海外には多すぎるわ。", role: "reaction" },

  // Part 10: Conclusion
  { s: "marisa", t: "一部の超絶エリートや、外資系のトップ層にとって、税金が安くて給料が青天井のアメリカに行くメリットはある。それこそ年収５０００万円や１億円を狙うような層だな。", role: "context" },
  { s: "marisa", t: "だが、９９パーセントの国民にとって、これほどまで安全で、清潔で、安価に高度な医療が受けられて、美味しいご飯が安く食べられて、かつ大半の年収帯で手取りも残る国は、世界中を探しても他にないんだぜ。", role: "conclusion", pop: "BulletList", popTitle: "日本の強みまとめ", popBullets: ["大半の年収帯で残る手取り", "最強の『高額療養費制度』", "物価安と最高レベルの治安", "死角のない公共インフラ"], popTag: "大半の人にとって最適解の国" },
  { s: "reimu", t: "なるほどね！隣の芝生は青く見えるだけだったのね。給料明細とにらめっこして文句ばかり言う前に、日本のシステムにどれだけ守られているかを正しく理解することが大切だわ！", role: "summary" },
  { s: "marisa", t: "その通りだ。税金や社会保険のニュースはネガティブにばかり報道されがちだが、数字と事実を冷静に比べてみると圧倒的な日本の底力が見えてくる。", role: "summary" },
  { s: "marisa", t: "みんなもネットの根拠のない噂や、極端な海外を無条件に賛美する意見に惑わされないように気をつけてくれよな！", role: "summary" },
  { s: "reimu", t: "今回の動画が参考になったら、チャンネル登録と高評価をお願いするわね！それではまた次回の動画でお会いしましょう！", role: "outro" },
  { s: "marisa", t: "ご視聴ありがとうございました！", role: "outro" }
];

const scenes = RAW_SCENES.map((raw, idx) => {
  const sceneId = `scene_${String(idx).padStart(2, '0')}`;
  const s = {
    id: sceneId,
    sceneRole: raw.role || "context",
    speaker: raw.s,
    text: raw.t,
    speedScale: 1.6,
    asset_query: "data technology graph money",
    bg_image: `assets/images/berkshire_${(idx % 4 === 0 ? 'intro' : idx % 3 === 0 ? 'growth' : idx % 2 === 0 ? 'flow' : 'risk')}_bg.svg`,
    sceneEffect: idx % 5 === 0 ? { stylePreset: "documentary" } : {},
    popups: [],
    se: [],
    voiceFile: `${sceneId}.wav`
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
console.log(`Successfully generated ${scenes.length} scenes to src/data/script.json!`);
