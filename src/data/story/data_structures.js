// data_structures.js
// 敘事結構參數表、劇情類型參數表、張力曲線模式定義

// ─────────────────────────────────────────────
// 張力數值區間（設計標記 → 系統數值）
// ─────────────────────────────────────────────
export const TENSION_LEVELS = {
  "低":   { min: 0,  max: 30 },
  "中":   { min: 31, max: 60 },
  "高":   { min: 61, max: 80 },
  "極限": { min: 81, max: 100 },
};

export const TENSION_INITIAL = 10;

// 判斷數值對應哪個等級
export function getTensionLevel(value) {
  for (const [label, range] of Object.entries(TENSION_LEVELS)) {
    if (value >= range.min && value <= range.max) return label;
  }
  return value > 100 ? "極限" : "低";
}

// ─────────────────────────────────────────────
// 張力曲線模式（三種）
// targets 長度為示意，SkeletonGenerator 會依 total_nodes 動態插值
// ─────────────────────────────────────────────
export const TENSION_CURVES = {
  "線性累積": {
    name: "線性累積",
    description: "張力從低慢慢爬升到高，節奏穩定，感覺在醞釀",
    ending_bias: ["正向"],
    // 6節點示意，生成時按比例縮放
    sample_targets: ["低", "低", "中", "中", "高", "極限"],
    pattern: "ascending",
  },
  "震盪起伏": {
    name: "震盪起伏",
    description: "張力高低交替，有緊張有喘息，像雲霄飛車",
    ending_bias: ["正向", "負向"],
    sample_targets: ["低", "高", "中", "高", "低", "極限"],
    pattern: "oscillating",
  },
  "突然崩潰": {
    name: "突然崩潰",
    description: "長時間低張力，最後一兩節點急速飆升",
    ending_bias: ["負向", "中性"],
    sample_targets: ["低", "低", "低", "低", "高", "極限"],
    pattern: "sudden",
  },
};

// ─────────────────────────────────────────────
// 敘事結構參數表（三種）
// ─────────────────────────────────────────────
export const NARRATIVE_STRUCTURES = {
  "線性": {
    name: "線性",
    node_range: [3, 5],
    has_hub: false,
    spatial_memory: false,
    confrontation_allowed: true,
    preferred_curves: ["線性累積", "突然崩潰", "震盪起伏"],
    slot_sequence: ["開場", "轉折", "危機", "結局"],
    // 各節點預設槽位（依 total_nodes 選取）
    slot_tables: {
      3: ["開場", "危機", "結局"],
      4: ["開場", "轉折", "危機", "結局"],
      5: ["開場", "轉折", "危機", "危機", "結局"],
    },
  },
  "Hub循環": {
    name: "Hub循環",
    node_range: [6, 8],
    has_hub: true,
    spatial_memory: false,
    confrontation_allowed: true,
    confrontation_position: "tail", // 通常在尾段
    preferred_curves: ["震盪起伏"],
    slot_sequence: ["開場", "Hub", "轉折", "Hub", "危機", "結局"],
    slot_tables: {
      6: ["開場", "Hub", "轉折", "Hub", "危機", "結局"],
      7: ["開場", "Hub", "轉折", "危機", "Hub", "危機", "結局"],
      8: ["開場", "Hub", "轉折", "Hub", "危機", "危機", "Hub", "結局"],
    },
  },
  "箱庭探索": {
    name: "箱庭探索",
    node_range: [5, 7],
    has_hub: false,
    spatial_memory: true, // 用 world tag 記錄已訪問空間，防重複框架
    confrontation_allowed: true,
    preferred_curves: ["線性累積"],
    slot_sequence: ["開場", "轉折", "轉折", "危機", "結局"],
    slot_tables: {
      5: ["開場", "轉折", "轉折", "危機", "結局"],
      6: ["開場", "轉折", "轉折", "危機", "危機", "結局"],
      7: ["開場", "轉折", "轉折", "危機", "危機", "危機", "結局"],
    },
  },
};

// ─────────────────────────────────────────────
// 劇情類型參數表（六種）
// ─────────────────────────────────────────────
export const GENRES = {
  "恐怖": {
    name: "恐怖",
    ending_bias: ["負向", "中性"],
    confrontation_prob: 0.2,    // 20%
    preferred_curves: ["突然崩潰"],
    max_options: 3,
    world_tag_bias: ["world:醫院", "world:廢棄", "world:森林", "world:密室"],
    special: "框架語感偏向恐懼壓迫，張力曲線偏向突然崩潰",
  },
  "戀愛": {
    name: "戀愛",
    ending_bias: ["正向", "中性"],
    confrontation_prob: 0.4,    // 40%
    preferred_curves: ["線性累積"],
    max_options: 3,
    world_tag_bias: ["world:學校", "world:都市", "world:現代"],
    special: "結局可為多路線，不限好/壞二元",
  },
  "推理": {
    name: "推理",
    ending_bias: ["正向"],      // 含「查明真相」
    confrontation_prob: 0.75,   // 75%（幾乎必出）
    preferred_curves: ["線性累積"],
    max_options: 3,
    world_tag_bias: ["world:都市", "world:現代", "world:醫院"],
    special: "Plot tag 以線索蒐集為主，對峙序列幾乎必出",
  },
  "宮鬥": {
    name: "宮鬥",
    ending_bias: ["負向"],      // 含「鋃鐺入獄」「株連九族」
    confrontation_prob: 0.7,    // 70%
    preferred_curves: ["震盪起伏"],
    max_options: 3,
    world_tag_bias: ["world:宮廷", "world:古代"],
    special: "對峙序列為朝堂/宮廷互揭模式",
  },
  "搞笑": {
    name: "搞笑",
    ending_bias: ["中性"],
    confrontation_prob: 0.2,    // 20%
    preferred_curves: ["線性累積", "震盪起伏", "突然崩潰"],
    max_options: 3,
    world_tag_bias: ["world:學校", "world:都市", "world:現代"],
    special: "框架語感輕鬆，縫合怪效果加分",
  },
  "生存": {
    name: "生存",
    ending_bias: ["負向", "正向"], // 含「生存」「死亡」「慘烈犧牲」
    confrontation_prob: 0.4,    // 40%
    preferred_curves: ["突然崩潰", "線性累積"],
    max_options: 3,
    world_tag_bias: ["world:森林", "world:廢棄", "world:戰場", "world:未來"],
    special: "高度依賴 state:受傷 和 state:武裝 的 tag 互動",
  },
};

// ─────────────────────────────────────────────
// 環境元素（年代 × 地點 × 氣候）
// ─────────────────────────────────────────────
export const ENV_YEAR = ["古代", "現代", "未來"];
export const ENV_LOCATION = [
  "醫院", "學校", "宮廷", "森林", "都市",
  "密室", "海邊", "廢棄", "戰場", "旅館"
];
export const ENV_CLIMATE = ["雨夜", "晴天", "暴風雪", "霧天", "酷熱", "深夜"];

// 氣候 → 追加 World Tag
export const CLIMATE_TAGS = {
  "雨夜":  ["world:雨夜"],
  "晴天":  [],
  "暴風雪": ["world:暴風雪"],
  "霧天":  ["world:濃霧"],
  "酷熱":  [],
  "深夜":  ["world:深夜"],
};

// ─────────────────────────────────────────────
// 對峙序列規格
// ─────────────────────────────────────────────
export const CONFRONTATION_SPEC = {
  node_count_range: [2, 3],   // 連續節點數
  position: "pre_ending",     // 倒數第 2～4 個節點
  slot: "對峙",
  chain_tag_pairs: [
    // 前節點輸出 → 後節點 require_tags 的串聯 tag 對
    ["plot:對峙交鋒一", "plot:對峙交鋒二"],
  ],
};
