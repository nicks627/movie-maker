const DISPLAY_TO_SPEECH_REPLACEMENTS = [
  [/OpenAI/gi, 'オープンエーアイ'],
  [/\bSiCインターポーザ\b/gi, 'エスアイシー インターポーザ'],
  [/\bSiC\b/gi, 'エスアイシー'],
  [/\bCoWoS\b/gi, 'コワース'],
  [/\bRubin\b/gi, 'ルービン'],
  [/\bAMD\b/gi, 'エーエムディー'],
  [/\bCTE\b/gi, 'シーティーイー'],
  [/\bRF\b/gi, 'アールエフ'],
  [/\bTCV\b/gi, 'ティーシーブイ'],
  [/\bTGV\b/gi, 'ティージーブイ'],
  [/\bABF\b/gi, 'エービーエフ'],
  [/\bDARPA\b/gi, 'ダーパ'],
  [/\bMEMS\b/gi, 'メムス'],
  [/\bDRIE\b/gi, 'ドライ'],
  [/\bICP\b/gi, 'アイシーピー'],
  [/\bDISCO\b/gi, 'ディスコ'],
  [/\bKABRA\b/gi, 'カブラ'],
  [/\bDNP\b/gi, 'ディーエヌピー'],
  [/\bJOINT2\b/gi, 'ジョイント ツー'],
  [/Agent-App/gi, 'エージェント アプリ'],
  [/Skill Apps?/gi, 'スキル アプリ'],
  [/Google Assistant/gi, 'グーグル アシスタント'],
  [/Interactive Canvas/gi, 'インタラクティブ キャンバス'],
  [/Human in the Loop/gi, 'ヒューマン イン ザ ループ'],
  [/State as Context/gi, 'ステート アズ コンテキスト'],
  [/Artifact as Output/gi, 'アーティファクト アズ アウトプット'],
  [/Artifact as Medium/gi, 'アーティファクト アズ ミディアム'],
  [/CopilotKit/gi, 'コパイロットキット'],
  [/useCoAgent/gi, '専用フック'],
  [/Agent sprawl/gi, 'エージェント スプロール'],
  [/A2UI/gi, 'エーツーユーアイ'],
  [/AG-UI/gi, 'エージーユーアイ'],
  [/\bUI\b/gi, 'ユーアイ'],
  [/\bTools\b/gi, 'ツール'],
  [/\bResources\b/gi, 'リソース'],
  [/\bPrompts\b/gi, 'プロンプト'],
  [/\bBox\b/gi, 'ボックス'],
  [/\bAgentic\b/gi, 'エージェンティック'],
  [/\bAgent\b/gi, 'エージェント'],
  [/\bApps\b/gi, 'アプリ'],
  [/\bApp\b/gi, 'アプリ'],
  [/\bSkill\b/gi, 'スキル'],
  [/\bAPI\b/gi, 'エーピーアイ'],
  [/\bDOM\b/gi, 'ドム'],
  [/\bHTML\b/gi, 'エイチティーエムエル'],
  [/\bJavaScript\b/gi, 'ジャバスクリプト'],
  [/\bJSON\b/gi, 'ジェイソン'],
  [/\bReact\b/gi, 'リアクト'],
  [/\bAngular\b/gi, 'アングラー'],
  [/\bFlutter\b/gi, 'フラッター'],
  [/\bProps\b/gi, 'プロップス'],
  [/\bHITL\b/gi, 'エイチ アイ ティー エル'],
  [/\bSEO\b/gi, 'エスイーオー'],
  [/\bUCP\b/gi, 'ユーシーピー'],
  [/\bWeb\b/gi, 'ウェブ'],
  [/GPT[-–−ー]?\s*5(?:\.|．)?2[-–−ー]?\s*Codex/gi, 'ジーピーティー ごーてんに コーデックス'],
  [/\bCodex\b/gi, 'コーデックス'],
  [/HashiCorp/gi, 'ハシコープ'],
  [/Mitchell Hashimoto/gi, 'ミッチェル ハシモト'],
  [/\bVagrant\b/gi, 'ベイグラント'],
  [/\bTerraform\b/gi, 'テラフォーム'],
  [/LangChain/gi, 'ラングチェーン'],
  [/Vercel/gi, 'ヴァーセル'],
  [/Terminal Bench/gi, 'ターミナル ベンチ'],
  [/トップ\s*5/gi, 'トップファイブ'],
  [/\bGPT\b/gi, 'ジーピーティー'],
  [/Claude Code/gi, 'クロード コード'],
  [/Anthropic/gi, 'アンソロピック'],
  [/\.cursor\/rules/gi, 'ドットカーソル スラッシュ ルールズ'],
  [/\bCursor\b/gi, 'カーソル'],
  [/AGENTS\.md/gi, 'エージェンツ エムディー'],
  [/CLAUDE\.md/gi, 'クロード エムディー'],
  [/\bMCP\b/gi, 'エムシーピー'],
  [/SWE-?bench/gi, 'エスダブリューイー ベンチ'],
  [/\bTDD\b/gi, 'ティーディーディー'],
  [/\bCI\b/gi, 'シーアイ'],
  [/\bCIA\b/gi, 'シーアイエー'],
  [/Stripe/gi, 'ストライプ'],
  [/Can\.ac/gi, 'キャン エーシー'],
  [/Hashline/gi, 'ハッシュライン'],
  [/LayerX/gi, 'レイヤーエックス'],
  [/AIDD\.jp/gi, 'エーアイディーディー ジェーピー'],
  [/\bIDC\b/gi, 'アイディーシー'],
  [/\bPoC\b/gi, 'ピーオーシー'],
  [/\bCTO\b/gi, 'シーティーオー'],
  [/\bRust\b/gi, 'ラスト'],
  [/Qiita/gi, 'キータ'],
  [/README/gi, 'リードミー'],
  [/Google Docs/gi, 'グーグルドキュメント'],
  [/Slack/gi, 'スラック'],
  [/PRs?(?=\b|\/|$)/gi, 'ピーアール'],
  [/Git/gi, 'ギット'],
  [/\bKLAC\b/gi, 'ケーエルエーシー'],
  [/\bKLA\b/gi, 'ケーエルエー'],
  [/\bApplied Materials\b/gi, 'アプライドマテリアルズ'],
  [/\bUSPTO\b/gi, 'ユーエスピーティーオー'],
  [/\bASML\b/gi, 'エーエスエムエル'],
  [/\bAMAT\b/gi, 'エーマット'],
  [/\bHMI\b/gi, 'エイチエムアイ'],
  [/\bYieldStar\b/gi, 'イールドスター'],
  [/\bEUV\b/gi, 'イーユーブイ'],
  [/\bDUV\b/gi, 'ディーユーブイ'],
  [/\bGAA\b/gi, 'ジーエーエー'],
  [/\bGDS\b/gi, 'ジーディーエス'],
  [/\bOASIS\b/gi, 'オアシス'],
  [/\bDOI\b/gi, 'ディーオーアイ'],
  [/\bLLM\b/gi, 'エルエルエム'],
  [/\bRAG\b/gi, 'ラグ'],
  [/\bWFE\b/gi, 'ダブリューエフイー'],
  [/\bVAE\b/gi, 'ブイエーイー'],
  [/\bIR\b/gi, 'アイアール'],
  [/\bR&D\b/gi, 'アールアンドディー'],
  [/\bOS\b/gi, 'オーエス'],
  [/\bGAAP\b/gi, 'ギャップ'],
  [/\bNon-GAAP\b/gi, 'ノンギャップ'],
  [/\bEPS\b/gi, 'イーピーエス'],
  [/\bFCF\b/gi, 'エフシーエフ'],
  [/\bQ2\b/gi, 'キューツー'],
  [/\bQ3\b/gi, 'キュースリー'],
  [/\bQ4\b/gi, 'キューフォー'],
  [/\bimec\b/gi, 'アイメック'],
  [/\bAutomotive Chiplet Program\b/gi, 'オートモーティブ チップレット プログラム'],
  [/\bACP\b/gi, 'エーシーピー'],
  [/\bSMARTS\b/gi, 'スマーツ'],
  [/\bACTIS\b/gi, 'アクティス'],
  [/\bLasertec\b/gi, 'レーザーテック'],
  [/\bOnto Innovation\b/gi, 'オント イノベーション'],
  [/\bKronos\b/gi, 'クロノス'],
  [/\bPWG\b/gi, 'ピー ダブリュー ジー'],
  [/\bICOS\b/gi, 'アイコス'],
  [/\bRTX PRO\b/gi, 'アールティーエックス プロ'],
  [/\bServer Edition\b/gi, 'サーバーエディション'],
  [/2\.5D/gi, 'にてんごディー'],
  [/3D/gi, 'スリーディー'],
  [/HealthCare\.gov/gi, 'ヘルスケアドットガブ'],
  [/\bACA Marketplace\b/gi, 'アカマーケットプレイス'],
  [/\bACA\b/gi, 'エーシーエー'],
  [/\bNHS\b/gi, 'エヌエイチエス'],
  [/\bKFF\b/gi, 'ケイエフエフ'],
  [/\bOECD\b/gi, 'オーイーシーディー'],
  [/\bSNS\b/gi, 'エスエヌエス'],
  [/NVIDIA/gi, 'エヌビディア'],
  [/Blackwell/gi, 'ブラックウェル'],
  [/Apple/gi, 'アップル'],
  [/GPU/gi, 'ジーピーユー'],
  [/HBM/gi, 'エイチビーエム'],
  [/DRAM/gi, 'ディーラム'],
  [/TSV/gi, 'ティーエスブイ'],
  [/TSMC/gi, 'ティーエスエムシー'],
  [/SoIC/gi, 'ソイック'],
  [/Foveros/gi, 'フォベロス'],
  [/Cu-Cu/gi, '銅どうし'],
  [/PLP/gi, 'ピーエルピー'],
  [/JASM/gi, 'ジャスム'],
  [/EV Group/gi, 'イーブイグループ'],
  [/SUSS MicroTec/gi, 'ズース マイクロテック'],
  [/BESI/gi, 'ベシ'],
  [/Intel/gi, 'インテル'],
  [/Amkor/gi, 'アムコー'],
  [/ROIC/gi, 'アールオーアイシー'],
  [/SCREEN/gi, 'スクリーン'],
  [/BiCS FLASH/gi, 'ビックス フラッシュ'],
  [/3D NAND/gi, 'スリーディー ナンド'],
  [/NAND/gi, 'ナンド'],
  [/CBA/gi, 'シービーエー'],
  [/CUA/gi, 'シーユーエー'],
  [/CMOS/gi, 'シーモス'],
  [/CMP/gi, 'シーエムピー'],
  [/I\/O/gi, 'アイオー'],
  [/SK hynix/gi, 'エスケーハイニックス'],
  [/Samsung/gi, 'サムスン'],
  [/Micron/gi, 'マイクロン'],
  [/Clarivate/gi, 'クラリベイト'],
  [/ChatGPT/gi, 'チャットジーピーティー'],
  [/Gemini/gi, 'ジェミニ'],
  [/Claude/gi, 'クロード'],
  [/Google Cloud/gi, 'グーグルクラウド'],
  [/Google/gi, 'グーグル'],
  [/AWS/gi, 'エーダブリューエス'],
  [/Azure/gi, 'アジュール'],
  [/VOICEVOX/gi, 'ボイスボックス'],
  [/Fine Hybrid Magnetic Particles/gi, 'ファイン ハイブリッド マグネティック パーティクルズ'],
  [/Enterprise/gi, 'エンタープライズ'],
  [/Native/gi, 'ネイティブ'],
  [/Open/gi, 'オープン'],
  [/Close/gi, 'クローズ'],
  [/Aramid/gi, 'アラミド'],
  [/SrFe/gi, 'エスアールエフイー'],
  [/BaFe/gi, 'ビーエーエフイー'],
  [/OEM/gi, 'オーイーエム'],
  [/ESG/gi, 'イーエスジー'],
  [/IBM/gi, 'アイビーエム'],
  [/TS1170/gi, 'ティーエス イレブンセブンティ'],
  [/HDD/gi, 'ハードディスク'],
  [/CO2/gi, 'シーオーツー'],
  [/AI\/ML/gi, 'エーアイ エムエル'],
  [/AI/gi, 'エーアイ'],
  [/ML/gi, 'エムエル'],
];

const SPEECH_TO_DISPLAY_REPLACEMENTS = [
  ['オープンエーアイ', 'OpenAI'],
  ['エスアイシー インターポーザ', 'SiCインターポーザ'],
  ['エスアイシー', 'SiC'],
  ['コワース', 'CoWoS'],
  ['ルービン', 'Rubin'],
  ['エーエムディー', 'AMD'],
  ['シーティーイー', 'CTE'],
  ['アールエフ', 'RF'],
  ['ティーシーブイ', 'TCV'],
  ['ティージーブイ', 'TGV'],
  ['エービーエフ', 'ABF'],
  ['ダーパ', 'DARPA'],
  ['メムス', 'MEMS'],
  ['ドライ', 'DRIE'],
  ['アイシーピー', 'ICP'],
  ['ディスコ', 'DISCO'],
  ['カブラ', 'KABRA'],
  ['ディーエヌピー', 'DNP'],
  ['ジョイント ツー', 'JOINT2'],
  ['コーデックス', 'Codex'],
  ['ハシコープ', 'HashiCorp'],
  ['ミッチェル ハシモト', 'Mitchell Hashimoto'],
  ['ベイグラント', 'Vagrant'],
  ['テラフォーム', 'Terraform'],
  ['ラングチェーン', 'LangChain'],
  ['ヴァーセル', 'Vercel'],
  ['ターミナル ベンチ', 'Terminal Bench'],
  ['ジーピーティー ごーてんに コーデックス', 'GPT-5.2-Codex'],
  ['ジーピーティー', 'GPT'],
  ['クロード コード', 'Claude Code'],
  ['アンソロピック', 'Anthropic'],
  ['カーソル', 'Cursor'],
  ['エージェンツ エムディー', 'AGENTS.md'],
  ['クロード エムディー', 'CLAUDE.md'],
  ['エムシーピー', 'MCP'],
  ['エスダブリューイー ベンチ', 'SWE-bench'],
  ['ティーディーディー', 'TDD'],
  ['シーアイ', 'CI'],
  ['シーアイエー', 'CIA'],
  ['ストライプ', 'Stripe'],
  ['レイヤーエックス', 'LayerX'],
  ['エーアイディーディー ジェーピー', 'AIDD.jp'],
  ['アイディーシー', 'IDC'],
  ['ピーオーシー', 'PoC'],
  ['シーティーオー', 'CTO'],
  ['キータ', 'Qiita'],
  ['リードミー', 'README'],
  ['グーグルドキュメント', 'Google Docs'],
  ['スラック', 'Slack'],
  ['ケーエルエーシー', 'KLAC'],
  ['ケーエルエー', 'KLA'],
  ['アプライドマテリアルズ', 'Applied Materials'],
  ['ユーエスピーティーオー', 'USPTO'],
  ['エーエスエムエル', 'ASML'],
  ['エーマット', 'AMAT'],
  ['エイチエムアイ', 'HMI'],
  ['イールドスター', 'YieldStar'],
  ['イーユーブイ', 'EUV'],
  ['ディーユーブイ', 'DUV'],
  ['ジーエーエー', 'GAA'],
  ['ジーディーエス', 'GDS'],
  ['オアシス', 'OASIS'],
  ['ディーオーアイ', 'DOI'],
  ['エルエルエム', 'LLM'],
  ['ダブリューエフイー', 'WFE'],
  ['ブイエーイー', 'VAE'],
  ['アイアール', 'IR'],
  ['アールアンドディー', 'R&D'],
  ['オーエス', 'OS'],
  ['ギャップ', 'GAAP'],
  ['ノンギャップ', 'Non-GAAP'],
  ['イーピーエス', 'EPS'],
  ['エフシーエフ', 'FCF'],
  ['キューツー', 'Q2'],
  ['キュースリー', 'Q3'],
  ['キューフォー', 'Q4'],
  ['アイメック', 'imec'],
  ['オートモーティブ チップレット プログラム', 'Automotive Chiplet Program'],
  ['エーシーピー', 'ACP'],
  ['スマーツ', 'SMARTS'],
  ['アクティス', 'ACTIS'],
  ['オント イノベーション', 'Onto Innovation'],
  ['クロノス', 'Kronos'],
  ['ピー ダブリュー ジー', 'PWG'],
  ['アイコス', 'ICOS'],
  ['アールティーエックス プロ', 'RTX PRO'],
  ['サーバーエディション', 'Server Edition'],
  ['にてんごディー', '2.5D'],
  ['スリーディー', '3D'],
  ['ヘルスケアドットガブ', 'HealthCare.gov'],
  ['ヘルスケア・ドット・ガブ', 'HealthCare.gov'],
  ['アカマーケットプレイス', 'ACA Marketplace'],
  ['アカ・マーケットプレイス', 'ACA Marketplace'],
  ['エーシーエー', 'ACA'],
  ['エヌエイチエス', 'NHS'],
  ['ケイエフエフ', 'KFF'],
  ['オーイーシーディー', 'OECD'],
  ['エスエヌエス', 'SNS'],
  ['エックス', 'X'],
];

const FULLWIDTH_DIGIT_MAP = {
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
};

const KANJI_DIGIT_MAP = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const DIGIT_KANA = ['れい', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const LARGE_NUMBER_SUFFIXES = ['兆', '億', '万', '千'];
const RANGE_CONNECTOR_SOURCE = '[〜～~\\-－]';
const RATE_UNITS = ['スイスフラン', 'ポンド', 'ユーロ', 'ドル', 'フラン', '円'];

const NUMERIC_UNITS = [
  'スイスフラン',
  'パーセント',
  'ポイント',
  'カ月間',
  'か月間',
  'ヶ月間',
  '万人',
  '兆',
  '億',
  '万',
  '千',
  'モデル',
  'タスク',
  'ツール',
  '種類',
  '圏内',
  '年度',
  '年代',
  '時点',
  '日間',
  '週間',
  'ヶ月',
  'か月',
  'カ月',
  '時間',
  'ポンド',
  'ユーロ',
  'ドル',
  'フラン',
  '円',
  '前後',
  '以下',
  '以上',
  '未満',
  '最大',
  '最低',
  '最高',
  '程度',
  'ベース',
  'ライン',
  '帯',
  'ケース',
  '割',
  '倍',
  'カ国',
  'か国',
  '国',
  '州',
  '年',
  '月',
  '日',
  '時',
  '分',
  '秒',
  '人',
  '社',
  '個',
  '行',
  '回',
  '位',
  '件',
  '歳',
  '才',
  '戸',
];

const DISPLAY_NUMBER_PATTERN = /[0-9０-９,，]+(?:[.．][0-9０-９]+)?|[〇零一二三四五六七八九十百千万億兆]+(?:点[〇零一二三四五六七八九〇零]+)?/g;
const SPEECH_NUMBER_PATTERN = /[〇零一二三四五六七八九十百千万億兆]+(?:点[〇零一二三四五六七八九〇零]+)?/g;
const VISUAL_UNITS = [...NUMERIC_UNITS].sort((left, right) => right.length - left.length);
const UNIT_PATTERN = VISUAL_UNITS.join('|');
const RATE_UNIT_PATTERN = RATE_UNITS.join('|');
const RATE_CHUNK_PATTERN = `(?:${DISPLAY_NUMBER_PATTERN.source})(?:${RATE_UNIT_PATTERN})`;

export const toAsciiDigits = (value = '') =>
  value.replace(/[０-９]/g, (char) => FULLWIDTH_DIGIT_MAP[char] ?? char);

export const parseJapaneseInteger = (value = '') => {
  const ascii = toAsciiDigits(value).replace(/[,\s，]/g, '');
  if (/^\d+$/.test(ascii)) {
    return Number.parseInt(ascii, 10);
  }

  const normalized = toAsciiDigits(value).replace(/[，,]/g, '');
  let total = 0;
  let section = 0;
  let current = 0;
  let digitBuffer = '';

  const flushDigitBuffer = () => {
    if (!digitBuffer) {
      return;
    }

    current = Number.parseInt(digitBuffer, 10);
    digitBuffer = '';
  };

  for (const char of Array.from(normalized)) {
    if (/\d/.test(char)) {
      digitBuffer += char;
      continue;
    }

    if (char in KANJI_DIGIT_MAP) {
      flushDigitBuffer();
      current = KANJI_DIGIT_MAP[char];
      continue;
    }

    if (char === '十') {
      flushDigitBuffer();
      section += (current || 1) * 10;
      current = 0;
      continue;
    }

    if (char === '百') {
      flushDigitBuffer();
      section += (current || 1) * 100;
      current = 0;
      continue;
    }

    if (char === '千') {
      flushDigitBuffer();
      section += (current || 1) * 1000;
      current = 0;
      continue;
    }

    if (char === '万') {
      flushDigitBuffer();
      total += (section + current || 1) * 10000;
      section = 0;
      current = 0;
      continue;
    }

    if (char === '億') {
      flushDigitBuffer();
      total += (section + current || 1) * 100000000;
      section = 0;
      current = 0;
      continue;
    }

    if (char === '兆') {
      flushDigitBuffer();
      total += (section + current || 1) * 1000000000000;
      section = 0;
      current = 0;
    }
  }

  flushDigitBuffer();
  return total + section + current;
};

const toKanaDigit = (char) => {
  if (char in FULLWIDTH_DIGIT_MAP) {
    return DIGIT_KANA[Number(FULLWIDTH_DIGIT_MAP[char])];
  }

  if (/\d/.test(char)) {
    return DIGIT_KANA[Number(char)];
  }

  if (char in KANJI_DIGIT_MAP) {
    return DIGIT_KANA[KANJI_DIGIT_MAP[char]];
  }

  return char;
};

const renderUnder10000 = (value) => {
  if (value === 0) {
    return '';
  }

  let remaining = value;
  let result = '';

  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    if (thousands === 1) result += 'せん';
    else if (thousands === 3) result += 'さんぜん';
    else if (thousands === 8) result += 'はっせん';
    else result += `${DIGIT_KANA[thousands]}せん`;
    remaining %= 1000;
  }

  const hundreds = Math.floor(remaining / 100);
  if (hundreds > 0) {
    if (hundreds === 1) result += 'ひゃく';
    else if (hundreds === 3) result += 'さんびゃく';
    else if (hundreds === 6) result += 'ろっぴゃく';
    else if (hundreds === 8) result += 'はっぴゃく';
    else result += `${DIGIT_KANA[hundreds]}ひゃく`;
    remaining %= 100;
  }

  const tens = Math.floor(remaining / 10);
  if (tens > 0) {
    if (tens === 1) result += 'じゅう';
    else result += `${DIGIT_KANA[tens]}じゅう`;
    remaining %= 10;
  }

  if (remaining > 0) {
    result += DIGIT_KANA[remaining];
  }

  return result;
};

const integerToKana = (value) => {
  if (!Number.isFinite(value) || value === 0) {
    return 'れい';
  }

  let remaining = Math.trunc(value);
  let result = '';
  const largeUnits = [
    { value: 1000000000000, reading: 'ちょう' },
    { value: 100000000, reading: 'おく' },
    { value: 10000, reading: 'まん' },
  ];

  for (const unit of largeUnits) {
    const chunk = Math.floor(remaining / unit.value);
    if (chunk > 0) {
      result += `${renderUnder10000(chunk)}${unit.reading}`;
      remaining %= unit.value;
    }
  }

  result += renderUnder10000(remaining);
  return result || 'れい';
};

const numericTokenToKana = (token) => {
  const normalized = toAsciiDigits(token).replace(/[,\s，]/g, '');

  if (normalized.includes('.') || normalized.includes('点')) {
    const separator = normalized.includes('.') ? '.' : '点';
    const [integerPartRaw, decimalPartRaw = ''] = normalized.split(separator);
    const integerPart = integerPartRaw ? integerToKana(parseJapaneseInteger(integerPartRaw)) : 'れい';
    const decimalPart = Array.from(decimalPartRaw).map((char) => toKanaDigit(char)).join('');
    return decimalPart ? `${integerPart}てん${decimalPart}` : integerPart;
  }

  return integerToKana(parseJapaneseInteger(normalized));
};

const monthToKana = (token) => {
  const value = parseJapaneseInteger(token);
  const readings = {
    1: 'いちがつ',
    2: 'にがつ',
    3: 'さんがつ',
    4: 'しがつ',
    5: 'ごがつ',
    6: 'ろくがつ',
    7: 'しちがつ',
    8: 'はちがつ',
    9: 'くがつ',
    10: 'じゅうがつ',
    11: 'じゅういちがつ',
    12: 'じゅうにがつ',
  };

  return readings[value] ?? `${numericTokenToKana(token)}がつ`;
};

const dayToKana = (token) => {
  const value = parseJapaneseInteger(token);
  const irregularReadings = {
    1: 'ついたち',
    2: 'ふつか',
    3: 'みっか',
    4: 'よっか',
    5: 'いつか',
    6: 'むいか',
    7: 'なのか',
    8: 'ようか',
    9: 'ここのか',
    10: 'とおか',
    14: 'じゅうよっか',
    20: 'はつか',
    24: 'にじゅうよっか',
  };

  if (irregularReadings[value]) {
    return irregularReadings[value];
  }

  if (value >= 11 && value <= 19 && value !== 14) {
    return `${integerToKana(value)}にち`;
  }

  return `${numericTokenToKana(token)}にち`;
};

const peopleToKana = (token) => {
  const value = parseJapaneseInteger(token);
  const irregularReadings = {
    1: 'ひとり',
    2: 'ふたり',
  };

  if (irregularReadings[value]) {
    return irregularReadings[value];
  }

  return `${numericTokenToKana(token)}にん`;
};

const timesToKana = (token) => {
  const value = parseJapaneseInteger(token);

  if (value === 1) {
    return 'いっかい';
  }

  if (value === 6) {
    return 'ろっかい';
  }

  if (value === 8) {
    return 'はっかい';
  }

  if (value === 10) {
    return 'じゅっかい';
  }

  return `${numericTokenToKana(token)}かい`;
};

const countryCountToKana = (token) => `${numericTokenToKana(token)}かこく`;

const applyCounterReadings = (text) =>
  text
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})月`, 'g'), (_, token) => monthToKana(token))
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})日`, 'g'), (_, token) => dayToKana(token))
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})人`, 'g'), (_, token) => peopleToKana(token))
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})回`, 'g'), (_, token) => timesToKana(token))
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})カ国`, 'g'), (_, token) => countryCountToKana(token))
    .replace(new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})か国`, 'g'), (_, token) => countryCountToKana(token));

const japaneseNumberToDisplay = (token) => {
  if (!token) {
    return token;
  }

  const normalized = token.replace(/点/g, '.');
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return normalized;
  }

  if (normalized.includes('.')) {
    const [integerPart, decimalPart = ''] = normalized.split('.');
    return `${parseJapaneseInteger(integerPart)}.${Array.from(decimalPart)
      .map((char) => (char in KANJI_DIGIT_MAP ? KANJI_DIGIT_MAP[char] : char))
      .join('')}`;
  }

  return String(parseJapaneseInteger(normalized));
};

const convertSpeechNumberWithUnit = (token, unit) => `${numericTokenToKana(token)}`;

const convertDisplayNumberWithUnit = (token, unit) => {
  const suffix = LARGE_NUMBER_SUFFIXES.find((candidate) => token.endsWith(candidate));
  if (suffix) {
    return `${japaneseNumberToDisplay(token.slice(0, -suffix.length))}${suffix}`;
  }

  return japaneseNumberToDisplay(token);
};

const humanizeNumericRanges = (text) => {
  const rangeRegex = new RegExp(
    `(${DISPLAY_NUMBER_PATTERN.source})\\s*${RANGE_CONNECTOR_SOURCE}\\s*(${DISPLAY_NUMBER_PATTERN.source})(?=(${UNIT_PATTERN}))`,
    'g',
  );

  return text.replace(rangeRegex, (_, start, end) => `${numericTokenToKana(start)}から${numericTokenToKana(end)}`);
};

const humanizeRateExpressions = (text) => {
  const pairWithSymbolRegex = new RegExp(
    `(${RATE_CHUNK_PATTERN})\\s*[=＝:：]\\s*(${RATE_CHUNK_PATTERN})`,
    'g',
  );
  const adjacentPairRegex = new RegExp(
    `(${RATE_CHUNK_PATTERN})\\s*(?=(${RATE_CHUNK_PATTERN}))`,
    'g',
  );

  return text
    .replace(pairWithSymbolRegex, '$1、$2')
    .replace(adjacentPairRegex, '$1、');
};

const humanizeNumericReadings = (text) => {
  const simpleUnitRegex = new RegExp(`(${DISPLAY_NUMBER_PATTERN.source})(?=(${UNIT_PATTERN}))`, 'g');
  return text.replace(simpleUnitRegex, (match) => {
    if (LARGE_NUMBER_SUFFIXES.includes(match)) {
      return match;
    }

    return convertSpeechNumberWithUnit(match);
  });
};

export const normalizeSpeechText = (text = '') => {
  let normalized = text;

  for (const [pattern, replacement] of DISPLAY_TO_SPEECH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})(?=(?:\D|$))/g, '$1年$2月$3日')
    .replace(/(\d{4})[\/.-](\d{1,2})(?=(?:\D|$))/g, '$1年$2月')
    .replace(/%/g, 'パーセント')
    .replace(/BiCS\s*-?\s*(\d+)/gi, 'ビックス $1')
    .replace(/LTO-?(\d+)/gi, 'エルティーオー $1')
    .replace(/(\d+(?:\.\d+)?)\s*EB\b/gi, '$1エクサバイト')
    .replace(/(\d+(?:\.\d+)?)\s*PB\b/gi, '$1ペタバイト')
    .replace(/(\d+(?:\.\d+)?)\s*TB\b/gi, '$1テラバイト')
    .replace(/(\d+(?:\.\d+)?)\s*GB\b/gi, '$1ギガバイト')
    .replace(/(\d+(?:\.\d+)?)\s*Mbps\b/gi, '$1メガビーピーエス')
    .replace(/(\d+(?:\.\d+)?)\s*Gbps\b/gi, '$1ギガビーピーエス')
    .replace(/(\d+(?:\.\d+)?)\s*°?C\b/gi, '$1度')
    .replace(/(\d+(?:\.\d+)?)\s*kg\b/gi, '$1キログラム')
    .replace(/(\d+(?:\.\d+)?)\s*g\b/gi, '$1グラム')
    .replace(/(\d+(?:\.\d+)?)\s*mg\b/gi, '$1ミリグラム')
    .replace(/(\d+(?:\.\d+)?)\s*km\b/gi, '$1キロメートル')
    .replace(/(\d+(?:\.\d+)?)\s*cm\b/gi, '$1センチメートル')
    .replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, '$1ミリメートル')
    .replace(/(\d+(?:\.\d+)?)\s*m\b/gi, '$1メートル')
    .replace(/(\d+(?:\.\d+)?)\s*μm\b/gi, '$1マイクロメートル')
    .replace(/(\d+(?:\.\d+)?)\s*μs\b/gi, '$1マイクロ秒')
    .replace(/\bvs\b/gi, 'バーサス')
    .replace(/\s+/g, ' ')
    .trim();

  normalized = humanizeRateExpressions(normalized);
  normalized = humanizeNumericRanges(normalized);
  normalized = applyCounterReadings(normalized);
  normalized = humanizeNumericReadings(normalized);

  return normalized;
};

export const toDisplayText = (value = '') => {
  let next = value;

  for (const [speech, display] of SPEECH_TO_DISPLAY_REPLACEMENTS) {
    next = next.replaceAll(speech, display);
  }

  const unitRegex = new RegExp(`(${SPEECH_NUMBER_PATTERN.source})(${UNIT_PATTERN})`, 'g');
  next = next.replace(unitRegex, (_, token, unit) => `${convertDisplayNumberWithUnit(token, unit)}${unit}`);

  next = next
    .replace(/(\d+(?:\.\d+)?)パーセント/g, '$1%')
    .replace(/(\d+)カ国/g, '$1カ国')
    .replace(/(\d+)か国/g, '$1か国');

  return next;
};

const DISPLAY_VALUE_SKIP_KEYS = new Set([
  'accent',
  'color',
  'secondaryColor',
  'backgroundColor',
  'borderColor',
  'stroke',
  'fill',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'image',
  'bg_image',
  'bg_video',
  'file',
  'src',
  'href',
  'url',
  'component',
  'icon',
  'style',
  'className',
]);

const looksLikeAssetReference = (value = '') =>
  /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
  || /^rgba?\(/i.test(value)
  || /^hsla?\(/i.test(value)
  || /^https?:\/\//i.test(value)
  || /^assets\//i.test(value)
  || /^[./\\]/.test(value)
  || /\.(?:svg|png|jpe?g|webp|gif|mp4|webm|mov|mp3|wav|m4a|aac|ogg)$/i.test(value);

export const normalizeDisplayValue = (value, key = '') => {
  if (typeof value === 'string') {
    if (DISPLAY_VALUE_SKIP_KEYS.has(key) || looksLikeAssetReference(value)) {
      return value;
    }

    return toDisplayText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDisplayValue(item, key));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        normalizeDisplayValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
};
