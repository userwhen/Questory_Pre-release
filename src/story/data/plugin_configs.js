// src/data/story/plugin_configs.js
// 各 pluginType 的遊戲參數設定（非文字的遊戲資料：房間/回合數/行動清單/結局對照表等）
// 跟劇情池（純文字外殼）分開存放，由 NarrativeEngine.loadPluginConfigs() 載入
//
// 目前只填了 raising 供測試，其餘 pluginType 之後陸續補上即可，
// 沒填的 pluginType 呼叫 start() 時會用空物件初始化（等同目前的狀況）

export const PluginConfigs = {
  raising: {
    totalRounds: 3,
    targets: { mode: 'single', keys: ['武藝', '學識'] },
    actions: [
      { actionTag: 'train_martial', label: '練武藝', targetKey: '武藝', delta: 10 },
      { actionTag: 'train_study',   label: '讀書',   targetKey: '學識', delta: 10 },
    ],
    routeEndings: {
      '武藝': 'raising_swordsman_end',
      '學識': 'raising_strategist_end',
    },
    defaultEndingId: 'raising_default_end',
  },

  escape_room: {
    worldTagPool: [['world:密室']],
    rooms: [
      { id: 'hall', name: '大廳' },
      { id: 'vault', name: '密室', reqTags: ['state:key_a'] },
    ],
    startRoomId: 'hall',
    exitRoomId: 'vault',
    requiredKeyTags: ['state:key_a'],
    itemsPerRoom: { hall: ['state:key_a'] },
    successEndingId: 'escape_success',
    catchEndingId: 'escape_caught',
  },

  deduction: {
    rooms: [
      { id: 'kitchen', name: '廚房' },
      { id: 'study', name: '書房' },
    ],
    startRoomId: 'kitchen',
    npcs: [{ id: 'maid', name: '女僕' }],
    itemsPerRoom: {
      kitchen: ['state:clue_poison'],
      study: ['state:clue_letter'],
    },
    questionEffects: { maid: ['state:clue_testimony'] },
    hasDebate: false,
    minEvidenceToAccuse: 2,
    accuseCandidates: [
      { requiredTags: ['state:clue_poison', 'state:clue_letter'], endingId: 'deduction_correct', endingType: '正向' },
    ],
    defaultAccuseEndingId: 'deduction_wrong',
    caughtEndingId: 'deduction_caught',
  },

  horror: {
    worldTagPool: [['world:醫院'], ['world:廢棄'], ['world:森林']],
    rooms: [
      { id: 'corridor', name: '長廊' },
      { id: 'exit_door', name: '出口', reqTags: ['state:key_ward'] },
    ],
    startRoomId: 'corridor',
    exitRoomId: 'exit_door',
    requiredKeyTags: ['state:key_ward'],
    itemsPerRoom: { corridor: ['state:key_ward'] },
    successEndingId: 'horror_escape_success',
    catchEndingId: 'horror_caught',
  },

  deduction_debate: {
    rooms: [{ id: 'court', name: '法庭' }],
    startRoomId: 'court',
    npcs: [{ id: 'witness', name: '證人' }],
    itemsPerRoom: { court: ['state:clue_receipt'] },
    questionEffects: { witness: ['state:clue_alibi_gap'] },
    hasDebate: true,
    minEvidenceToAccuse: 2,
    testimonyConfig: {
      statements: [
        { id: 'stmt1', contradiction: { requiredEvidenceTag: 'state:clue_alibi_gap' } },
        { id: 'stmt2', contradiction: null },
      ],
    },
    accuseCandidates: [
      { requiredTags: ['state:clue_receipt', 'state:clue_alibi_gap'], endingId: 'debate_win', endingType: '正向' },
    ],
    defaultAccuseEndingId: 'debate_lose',
    caughtEndingId: 'debate_caught',
  },

  relationship_truth: {
    rooms: [
      { id: 'office', name: '辦公室樓下' },
      { id: 'cafe', name: '常去的咖啡廳' },
    ],
    startRoomId: 'office',
    npcs: [{ id: 'friend', name: '共同朋友' }],
    itemsPerRoom: { office: ['state:clue_receipt2'], cafe: ['state:clue_photo'] },
    questionEffects: { friend: ['state:clue_rumor'] },
    hasDebate: false,
    minEvidenceToAccuse: 2,
    accuseCandidates: [
      { requiredTags: ['state:clue_receipt2', 'state:clue_photo'], endingId: 'truth_confirmed', endingType: '負向' },
    ],
    defaultAccuseEndingId: 'truth_misunderstanding',
    caughtEndingId: 'truth_exposed',
  },

  harem: {
    totalRounds: 3,
    targets: { mode: 'multi', keys: ['角色A', '角色B'] },
    actions: [
      { actionTag: 'visit_a', label: '拜訪角色A', targetKey: '角色A', delta: 10 },
      { actionTag: 'visit_b', label: '拜訪角色B', targetKey: '角色B', delta: 10 },
    ],
    routeEndings: { '角色A': 'harem_route_a', '角色B': 'harem_route_b' },
    defaultEndingId: 'harem_default_end',
  },

  career: {
    totalRounds: 3,
    targets: { mode: 'single', keys: ['技能', '人脈'] },
    actions: [
      { actionTag: 'upskill', label: '進修', targetKey: '技能', delta: 10 },
      { actionTag: 'network', label: '社交應酬', targetKey: '人脈', delta: 10 },
    ],
    routeEndings: { '技能': 'career_expert_end', '人脈': 'career_manager_end' },
    defaultEndingId: 'career_default_end',
  },

  social_climb: {
    totalRounds: 4,
    targets: { mode: 'single', keys: ['好感'] },
    actions: [
      { actionTag: 'flatter', label: '討好', targetKey: '好感', delta: 10 },
      { actionTag: 'gift', label: '送禮', targetKey: '好感', delta: 8 },
    ],
    criticalRounds: {
      2: { validTags: ['flatter'], failEndingId: 'social_climb_exposed_early' },
    },
    routeEndings: { '好感': 'social_climb_success' },
    defaultEndingId: 'social_climb_default_end',
  },

  intrigue: {
    totalRounds: 5,
    selfTargets: { mode: 'single', keys: ['地位'] },
    rivalThreshold: 60,
    rivalRatePerRound: 10,
    actions: [
      { actionTag: 'consolidate', label: '鞏固地位', kind: 'safe', targetKey: '地位', delta: 12 },
      { actionTag: 'investigate', label: '打探情報', kind: 'evidence', threatDelta: 5 },
      {
        actionTag: 'scheme', label: '暗中設計對手', kind: 'scheme', successChance: 0.5,
        successEffect: { rivalInterrupt: 20 }, failEffect: { threatDelta: 20 },
      },
    ],
    evidencePool: ['state:intrigue_clue_1', 'state:intrigue_clue_2'],
    minEvidenceToExpose: 2,
    statusWinThreshold: 50,
  },

  learning: {
    totalQuestions: 3,
    allowSkip: true,
  },
};