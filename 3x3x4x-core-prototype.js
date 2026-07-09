(() => {
  "use strict";

  const PLAYERS = ["A", "B"];
  const HOME = { A: 1, B: 9 };
  const MAX_ASSETS = 3;
  const MAX_PIECES = 3;
  const MAX_TURN = 10;
  const CELLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const ADJACENT = {
    1: [2, 4],
    2: [1, 3, 5],
    3: [2, 6],
    4: [1, 5, 7],
    5: [2, 4, 6, 8],
    6: [3, 5, 9],
    7: [4, 8],
    8: [5, 7, 9],
    9: [6, 8]
  };
  const LINES = [
    { id: "r1", label: "1-2-3", cells: [1, 2, 3] },
    { id: "r2", label: "4-5-6", cells: [4, 5, 6] },
    { id: "r3", label: "7-8-9", cells: [7, 8, 9] },
    { id: "c1", label: "1-4-7", cells: [1, 4, 7] },
    { id: "c2", label: "2-5-8", cells: [2, 5, 8] },
    { id: "c3", label: "3-6-9", cells: [3, 6, 9] }
  ];
  const ACTIONS = ["Explore", "Exploit", "Fortify", "Exterminate", "Produce", "Move"];
  const ACTION_LABELS = {
    Explore: "探索",
    Exploit: "開発",
    Fortify: "要塞化",
    Exterminate: "侵攻",
    Produce: "生産",
    Move: "移動"
  };
  const MAX_CARDS = 2;
  const CARD_USE_COST = {
    "CRD-001": 0,
    "CRD-002": 1,
    "CRD-003": 2,
    "CRD-004": 2,
    "CRD-005": 1,
    "CRD-006": 2,
    "CRD-007": 1,
    "CRD-008": 0,
    "CRD-009": 2,
    "CRD-010": 1,
    "CRD-011": 0,
    "CRD-012": 2
  };
  const CARD_SET = [
    {
      id: "CRD-001",
      name: "キャラバン宿",
      icon: "路",
      flavor: "交易路の休息地。荷馬車と噂が集まり、周囲の未踏地へ足が伸びる。",
      useEffect: "自軍支配地1つを選ぶ。その土地から隣接する中立地への探索コストをこのターンだけ-1する。下限は0。",
      landEffect: "この土地が2P以上なら、隣接する中立地1つの中立コストを-1する。下限は0。",
      cost: "0資産",
      assetNo: "AST-001"
    },
    {
      id: "CRD-002",
      name: "前線基地",
      icon: "営",
      flavor: "簡易な兵舎と物資置き場。兵が集まり、戦線を押し上げる足場になる。",
      useEffect: "自軍支配地1つを選ぶ。その土地に自軍駒を1個追加する。駒上限は超えない。",
      landEffect: "この土地が2P以上なら、この土地に自軍駒が1個以上ある場合に資産+1。",
      cost: "1資産",
      assetNo: "AST-002"
    },
    {
      id: "CRD-003",
      name: "厩舎",
      icon: "馬",
      flavor: "速い馬と騎手を抱える土地。攻め手の初速が上がる。",
      useEffect: "このターン、自軍が行う最初の侵攻1つの攻撃側戦力を+1する。",
      landEffect: "この土地が2P以上なら、この土地から行う侵攻の攻撃側戦力を+1する。",
      cost: "2資産",
      assetNo: "AST-003"
    },
    {
      id: "CRD-004",
      name: "砲兵陣地",
      icon: "砲",
      flavor: "丘に据えられた火砲の列。近づく敵に重い圧をかける。",
      useEffect: "本拠地以外の自軍支配地1つを要塞化する。通常の要塞化条件を満たす必要がある。",
      landEffect: "この土地が2P以上なら、この土地が攻撃された時の防衛側戦力を+1する。",
      cost: "2資産",
      assetNo: "AST-004"
    },
    {
      id: "CRD-005",
      name: "職人街",
      icon: "工",
      flavor: "石工、鍛冶、測量士が集まる街区。土地そのものの価値を底上げする。",
      useEffect: "要塞化されていない自軍支配地1つの価値を+1する。上限は3P。",
      landEffect: "この土地が2P以上なら、この土地が本拠地と接続している場合に資産+1。",
      cost: "1資産",
      assetNo: "AST-005"
    },
    {
      id: "CRD-006",
      name: "城塞都市",
      icon: "城",
      flavor: "壁に囲まれた中核都市。人と物資を抱え込み、部隊を送り出す。",
      useEffect: "自軍の2P土地1つを3Pにする。対象は要塞化されていない土地に限る。",
      landEffect: "この土地が2P以上なら、この土地を生産拠点として扱う。3P都市でなくても生産予約の対象にできる。",
      cost: "2資産",
      assetNo: "AST-006"
    },
    {
      id: "CRD-007",
      name: "道標の丘",
      icon: "標",
      flavor: "中央へ続く道を見下ろす高台。進軍路がはっきり見える。",
      useEffect: "中央5番が中立なら中立コストを0にする。敵支配なら、このターン中央5番への侵攻コストを-1する。下限は1。",
      landEffect: "この土地が2P以上なら、中央5番に対する自軍の探索または侵攻コストを-1する。下限は0または1。",
      cost: "1資産",
      assetNo: "AST-007"
    },
    {
      id: "CRD-008",
      name: "狼煙台",
      icon: "煙",
      flavor: "遠くの動きを煙で知らせる監視拠点。危険な境界が見えやすくなる。",
      useEffect: "このターン、相手のカード利用予定を公開する。カード利用がない場合は「利用なし」と表示する。",
      landEffect: "この土地が2P以上なら、隣接する敵支配地と中立地を強調表示する。資産効果はない。",
      cost: "0資産",
      assetNo: "AST-008"
    },
    {
      id: "CRD-009",
      name: "毒沼",
      icon: "毒",
      flavor: "泥と毒気に沈む湿地。支配はできるが、周囲の発展を鈍らせる。",
      useEffect: "隣接する敵支配地1つを選ぶ。その土地の価値を1Pに下げる。ただし所有者は変わらない。",
      landEffect: "この土地が2P以上なら、隣接する敵3P土地1つの価値を2Pに下げる。対象がない場合は効果なし。",
      cost: "2資産",
      assetNo: "AST-009"
    },
    {
      id: "CRD-010",
      name: "民兵屯所",
      icon: "兵",
      flavor: "住民が武器を取り、土地を守るための詰所。空いた守りを埋める。",
      useEffect: "自軍本拠地または自軍支配地1つに自軍駒を1個追加する。駒上限は超えない。",
      landEffect: "この土地が2P以上なら、この土地に自軍駒がない場合、自軍駒を1個置く。",
      cost: "1資産",
      assetNo: "AST-010"
    },
    {
      id: "CRD-011",
      name: "山道の関所",
      icon: "関",
      flavor: "尾根道を押さえる小さな関所。自軍だけが近道を使える。",
      useEffect: "自軍駒1個を、自軍支配地を通って最大2マス移動する。通常の移動制限を満たす必要がある。",
      landEffect: "この土地が2P以上なら、この土地からの移動距離上限を+1する。",
      cost: "0資産",
      assetNo: "AST-011"
    },
    {
      id: "CRD-012",
      name: "練兵場",
      icon: "練",
      flavor: "地面を踏み固めた演習地。次の衝突に向けて兵の呼吸が揃う。",
      useEffect: "このターン、自軍が行う最初の戦闘で攻撃側または防衛側戦力を+1する。",
      landEffect: "この土地が2P以上なら、この土地に隣接する敵支配地への侵攻コストを-1する。下限は1。",
      cost: "2資産",
      assetNo: "AST-012"
    }
  ];
  const CARD_BY_ID = new Map(CARD_SET.map((card) => [card.id, card]));
  const CARD_SCORE = {
    "CRD-001": 22,
    "CRD-002": 28,
    "CRD-003": 24,
    "CRD-004": 21,
    "CRD-005": 30,
    "CRD-006": 34,
    "CRD-007": 26,
    "CRD-008": 10,
    "CRD-009": 25,
    "CRD-010": 29,
    "CRD-011": 20,
    "CRD-012": 23
  };

  const CONTROL_MODES = {
    human: "手動",
    weak: "弱CPU",
    normal: "ノーマルCPU",
    strategist: "軍師CPU"
  };
  const CPU_MODES = new Set(["weak", "normal", "strategist"]);
  const CPU_PERSONALITIES = {
    balanced: {
      label: "均衡型",
      description: "盤面・内政・軍事を均等に見ます。",
      actionMultiplier: {},
      actionBias: {},
      evalBias: {},
      jitter: 4
    },
    expansion: {
      label: "開拓型",
      description: "探索、ビンゴ、前線拡大を強めに重視します。",
      actionMultiplier: { Explore: 1.38, Move: 1.18, Fortify: 0.86 },
      actionBias: { Explore: 24, Move: 10, Fortify: -14 },
      evalBias: { bingo: 0.9, center: 0.15, land: 0.35, production: 0.18, fortress: -0.12, threat: -0.08 },
      jitter: 7
    },
    domestic: {
      label: "内政型",
      description: "開発、収入、本拠地価値、3P都市を強めに重視します。",
      actionMultiplier: { Exploit: 1.42, Produce: 1.12, Fortify: 0.78 },
      actionBias: { Exploit: 30, Produce: 8, Fortify: -24 },
      evalBias: { land: 0.46, income: 0.78, home: 0.65, assets: 0.35, production: 0.5, city: 0.72, fortress: -0.28, center: -0.06 },
      jitter: 6
    },
    militarist: {
      label: "軍事型",
      description: "侵攻、要塞攻撃、敵3P都市の焼き討ちを強めに重視します。",
      actionMultiplier: { Exterminate: 1.46, Fortify: 1.22, Produce: 1.12 },
      actionBias: { Exterminate: 34, Fortify: 8, Produce: 8 },
      evalBias: { pieces: 0.72, enemyThreat: 0.7, fortress: 0.42, fortressPressure: 0.72, enemyCity: 0.46, threat: 0.1, land: -0.08 },
      jitter: 8
    },
    center: {
      label: "中央型",
      description: "中央都市国家の取得・維持・奪取と中央要塞を強めに重視します。",
      actionMultiplier: { Explore: 1.2, Exterminate: 1.24, Exploit: 1.14, Fortify: 1.08 },
      actionBias: {},
      evalBias: { center: 1.28, income: 0.32, production: 0.22, fortress: 0.24, fortressPressure: 0.22, threat: -0.06 },
      centerActionBias: 62,
      jitter: 7
    },
    defensive: {
      label: "防衛型",
      description: "本拠地、防衛、重要拠点の要塞化、危険回避を強めに重視します。",
      actionMultiplier: { Fortify: 1.44, Move: 1.14, Produce: 1.1, Exterminate: 0.96 },
      actionBias: { Fortify: 26, Move: 8 },
      evalBias: { threat: 0.98, home: 0.55, pieces: 0.24, fortress: 0.78, production: 0.2, importantRisk: 0.7, enemyThreat: -0.08 },
      jitter: 6
    }
  };
  const CPU_PERSONALITY_KEYS = Object.keys(CPU_PERSONALITIES);
  const PHASE_STEPS = [
    { key: "card-use", number: 1, label: "カード使用", note: "コマンド前" },
    { key: "command", number: 2, label: "コマンド予約", note: "同時入力" },
    { key: "resolve", number: 3, label: "ターン解決", note: "移動/戦闘" },
    { key: "card-reserve", number: 4, label: "カード取得予約", note: "土地取得後" },
    { key: "card-commit", number: 5, label: "同時確定", note: "全予約後" },
    { key: "start", number: 6, label: "次ターン開始", note: "土地効果/資産" },
    { key: "result", number: 7, label: "勝敗判定", note: "終了確認" }
  ];

  const TUTORIAL_STEPS = [
    {
      target: ".board-panel",
      title: "まず盤面を見る",
      body: "1番がA本拠地、9番がB本拠地です。中央5番やビンゴの列を取りに行くと、土地価値と展開が一気に動きます。"
    },
    {
      target: ".control-panel",
      title: "行動を予約する",
      body: "起点、行動、対象、駒数を選びます。選べない行動はグレー表示なので、まずは本拠地から探索を出すだけで遊び始められます。"
    },
    {
      target: "#resolveButton",
      title: "同時に解決する",
      body: "両プレイヤーの予約が入ったらターン解決です。相手も同時に動くので、中央の取り合い、侵攻、すれ違いが読み合いになります。"
    },
    {
      target: ".replay-strip",
      title: "結果を見る",
      body: "解決後はリプレイとログで、どの駒がどこへ動いたかを確認できます。矢印と変化したマスを見ると次の一手が決めやすくなります。"
    },
    {
      target: ".reference-panel",
      title: "勝ち方を狙う",
      body: "敵本拠地を落とす、土地価値11P以上を作る、10ターン後の判定で上回る。この3つのどれを狙うかがプレイの軸です。"
    }
  ];


  const els = {
    board: document.getElementById("board"),
    players: document.getElementById("players"),
    turnSummary: document.getElementById("turnSummary"),
    resolveButton: document.getElementById("resolveButton"),
    newGameButton: document.getElementById("newGameButton"),
    undoButton: document.getElementById("undoButton"),
    copyLogButton: document.getElementById("copyLogButton"),
    logList: document.getElementById("logList"),
    phaseRail: document.getElementById("phaseRail"),
    validationMessage: document.getElementById("validationMessage"),
    centralSeed: document.getElementById("centralSeed"),
    replayButton: document.getElementById("replayButton"),
    skipReplayButton: document.getElementById("skipReplayButton"),
    replayStatus: document.getElementById("replayStatus"),
    tutorialButton: document.getElementById("tutorialButton")
  };

  let state;
  let history = [];
  let actionSerial = 1;
  let playerPanelOpen = { A: true, B: true };
  let controlModes = { A: "human", B: "human" };
  let lastVisualChanges = new Map();
  let lastReplayEvents = [];
  let currentReplayEvent = null;
  let replayTimer = null;
  let replayBusy = false;
  let replayEventSerial = 1;
  let turnReplayEvents = null;
  let tutorialIndex = 0;
  let tutorialOverlay = null;
  let simulationDepth = 0;

  function opponent(player) {
    return player === "A" ? "B" : "A";
  }

  function randomCpuPersonalityKey() {
    return CPU_PERSONALITY_KEYS[Math.floor(Math.random() * CPU_PERSONALITY_KEYS.length)];
  }

  function cpuPersonality(player, snapshot = state) {
    const key = snapshot?.players?.[player]?.personality || "balanced";
    return CPU_PERSONALITIES[key] || CPU_PERSONALITIES.balanced;
  }

  function cpuPersonalityLabel(player, snapshot = state) {
    return cpuPersonality(player, snapshot).label;
  }

  function emptyCell(id) {
    return {
      id,
      owner: null,
      value: 0,
      fort: false,
      neutralCost: 0,
      traitCardId: null,
      traitAssignedBy: null,
      pieces: { A: 0, B: 0 }
    };
  }

  function rollCentralCost() {
    const die = Math.floor(Math.random() * 6) + 1;
    return {
      die,
      cost: die <= 2 ? 0 : die <= 4 ? 1 : 2
    };
  }

  function createTurnModifiers() {
    return {
      neutralDiscounts: [],
      invasionDiscounts: [],
      firstInvasionAttackBonus: { A: 0, B: 0 },
      firstCombatBonus: { A: 0, B: 0 },
      revealedCardUse: { A: false, B: false }
    };
  }

  function createInitialState() {
    const seed = els.centralSeed.value;
    const central = seed === "random" ? rollCentralCost() : { die: null, cost: Number(seed) };
    const cells = {};
    CELLS.forEach((id) => {
      cells[id] = emptyCell(id);
    });

    cells[1].owner = "A";
    cells[1].value = 1;
    cells[1].pieces.A = 2;
    cells[9].owner = "B";
    cells[9].value = 1;
    cells[9].pieces.B = 2;
    cells[5].neutralCost = central.cost;

    const centralText = central.die === null
      ? `中央5の初期中立コストを${central.cost}に設定。`
      : `ダイス${central.die}: 中央5の初期中立コストは${central.cost}。`;
    const personalityA = randomCpuPersonalityKey();
    const personalityB = randomCpuPersonalityKey();
    const personalityText = `CPU性格: A=${CPU_PERSONALITIES[personalityA].label}、B=${CPU_PERSONALITIES[personalityB].label}。`;

    return {
      turn: 1,
      gameOver: false,
      winner: null,
      result: "",
      cells,
      players: {
        A: { assets: 0, pending: [], bingoUsed: [], personality: personalityA, cards: [] },
        B: { assets: 0, pending: [], bingoUsed: [], personality: personalityB, cards: [] }
      },
      cardChoices: [],
      awaitingCardChoices: false,
      cardUseReservations: {},
      awaitingCardUse: false,
      cardUseCommittedTurn: 0,
      turnModifiers: createTurnModifiers(),
      nextCardChoiceId: 1,
      log: [
        "ゲーム開始。",
        centralText,
        personalityText,
        "ターン1: 生産予約なし、収入なし。"
      ]
    };
  }

  function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cell(id) {
    return state.cells[id];
  }

  function totalPieces(player) {
    return CELLS.reduce((sum, id) => sum + cell(id).pieces[player], 0);
  }

  function landScore(player) {
    return CELLS.reduce((sum, id) => {
      const current = cell(id);
      if (current.owner !== player || current.fort) {
        return sum;
      }
      return sum + current.value;
    }, 0);
  }

  function actionLimit(player) {
    if (state.turn <= 2) {
      return totalPieces(player) > 0 ? 1 : 0;
    }
    return totalPieces(player);
  }

  function isAdjacent(from, to) {
    return ADJACENT[from]?.includes(to);
  }

  function capAssets(player) {
    state.players[player].assets = Math.max(0, Math.min(MAX_ASSETS, state.players[player].assets));
  }

  function pushLog(messages) {
    if (Array.isArray(messages)) {
      state.log.push(...messages.filter(Boolean));
    } else if (messages) {
      state.log.push(messages);
    }
    if (state.log.length > 220) {
      state.log = state.log.slice(-220);
    }
  }

  function cardDefinition(cardId) {
    return CARD_BY_ID.get(cardId) || null;
  }

  function playerCards(player) {
    if (!state.players[player].cards) {
      state.players[player].cards = [];
    }
    return state.players[player].cards;
  }

  function ensureCardUseState() {
    if (!state.cardUseReservations) {
      state.cardUseReservations = {};
    }
    if (typeof state.awaitingCardUse !== "boolean") {
      state.awaitingCardUse = false;
    }
    if (typeof state.cardUseCommittedTurn !== "number") {
      state.cardUseCommittedTurn = 0;
    }
    if (!state.turnModifiers) {
      state.turnModifiers = createTurnModifiers();
    }
    state.turnModifiers.neutralDiscounts ||= [];
    state.turnModifiers.invasionDiscounts ||= [];
    state.turnModifiers.firstInvasionAttackBonus ||= { A: 0, B: 0 };
    state.turnModifiers.firstCombatBonus ||= { A: 0, B: 0 };
    state.turnModifiers.revealedCardUse ||= { A: false, B: false };
  }

  function cardUseCost(cardId) {
    return CARD_USE_COST[cardId] ?? 0;
  }

  function findCardRecord(player, recordId) {
    return playerCards(player).find((record) => record.id === recordId) || null;
  }

  function hasPendingCardUse() {
    ensureCardUseState();
    return Boolean(state.awaitingCardUse);
  }

  function cardUseReservation(player) {
    ensureCardUseState();
    return state.cardUseReservations[player] || null;
  }

  function allCardUsesReserved() {
    ensureCardUseState();
    return PLAYERS.every((player) => Boolean(state.cardUseReservations[player]));
  }

  function cardUseReservationSummary() {
    ensureCardUseState();
    const reserved = PLAYERS.filter((player) => state.cardUseReservations[player]).length;
    return { reserved, total: PLAYERS.length };
  }

  function hasPendingCardChoices() {
    return Boolean(state?.cardChoices?.length);
  }

  function pendingCardChoiceFor(player) {
    return state.cardChoices?.find((choice) => choice.player === player && !choice.reservation)
      || state.cardChoices?.find((choice) => choice.player === player)
      || null;
  }

  function reservedNewCardCount(player, excludeChoiceId = null) {
    return (state.cardChoices || []).filter((choice) => choice.player === player
      && choice.id !== excludeChoiceId
      && choice.reservation?.kind === "new").length;
  }

  function availableCardSlots(player, excludeChoiceId = null) {
    return Math.max(0, MAX_CARDS - playerCards(player).length - reservedNewCardCount(player, excludeChoiceId));
  }

  function allCardChoicesReserved() {
    return !hasPendingCardChoices() || state.cardChoices.every((choice) => Boolean(choice.reservation));
  }

  function reservationSummary(player) {
    const choices = (state.cardChoices || []).filter((choice) => choice.player === player);
    const reserved = choices.filter((choice) => choice.reservation).length;
    return { choices, reserved };
  }

  function drawCardOptions(count = 3, exclude = []) {
    const excluded = new Set(exclude.filter(Boolean));
    const pool = CARD_SET.filter((card) => !excluded.has(card.id));
    const shuffled = pool
      .map((card) => ({ card, rank: Math.random() }))
      .sort((left, right) => left.rank - right.rank)
      .map((item) => item.card.id);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  function cardRecord(player, cardId, cellId) {
    return {
      id: `${player}-${cardId}-${cellId}-${state.turn}-${state.nextCardChoiceId}`,
      cardId,
      cellId,
      acquiredTurn: state.turn
    };
  }

  function removePlayerCardForCell(player, cellId) {
    if (!player || !state.players[player]?.cards) {
      return;
    }
    state.players[player].cards = state.players[player].cards.filter((record) => record.cellId !== cellId);
  }

  function removePlayerCardRecord(player, recordId) {
    if (!player || !state.players[player]?.cards) {
      return null;
    }
    const removed = state.players[player].cards.find((record) => record.id === recordId) || null;
    state.players[player].cards = state.players[player].cards.filter((record) => record.id !== recordId);
    return removed;
  }

  function activeTrait(player, cellId, cardId = null) {
    const current = state.cells?.[cellId];
    if (!current || current.owner !== player || current.value < 2 || !current.traitCardId) {
      return false;
    }
    return cardId ? current.traitCardId === cardId : true;
  }

  function activeTraitCells(player, cardId = null) {
    return CELLS
      .map((id) => cell(id))
      .filter((current) => current.owner === player
        && current.value >= 2
        && current.traitCardId
        && (!cardId || current.traitCardId === cardId));
  }

  function addAssets(player, amount) {
    const before = state.players[player].assets;
    state.players[player].assets = Math.min(MAX_ASSETS, before + amount);
    return state.players[player].assets - before;
  }

  function registerLandAcquisition(player, cellId, messages, options = {}) {
    if (simulationDepth > 0 || state.gameOver) {
      return;
    }
    const current = cell(cellId);
    if (!current || current.owner !== player) {
      return;
    }
    const existingCardId = options.existingCardId || current.traitCardId || null;
    const canGainNewCard = playerCards(player).length < MAX_CARDS;
    if (!canGainNewCard) {
      if (existingCardId) {
        messages.push(`${player}はカード上限のため、${cellId}番の既存特性「${cardDefinition(existingCardId)?.name || existingCardId}」を維持。`);
      } else {
        messages.push(`${player}はカード上限${MAX_CARDS}枚のため、${cellId}番のカードを入手できない。`);
      }
      return;
    }
    const choice = {
      id: state.nextCardChoiceId++,
      player,
      cellId,
      mode: existingCardId ? "capture" : "new",
      existingCardId,
      options: drawCardOptions(3, [existingCardId])
    };
    state.cardChoices.push(choice);
    messages.push(existingCardId
      ? `${player}は${cellId}番を奪取。既存特性維持か新規カード3択を選べる。`
      : `${player}は${cellId}番を取得。土地特性カード3択を選択待ち。`);
  }

  function chooseCardForCpu(choice) {
    const current = cell(choice.cellId);
    const options = choice.options
      .map((cardId) => cardDefinition(cardId))
      .filter(Boolean)
      .sort((left, right) => cardScoreForLand(right, current, choice.player) - cardScoreForLand(left, current, choice.player));
    return options[0]?.id || choice.options[0];
  }

  function cardScoreForLand(card, current, player) {
    let score = CARD_SCORE[card.id] || 10;
    if (!current) {
      return score;
    }
    if (current.id === 5 && (card.id === "CRD-007" || card.id === "CRD-006")) score += 12;
    if (current.value >= 2 && (card.id === "CRD-002" || card.id === "CRD-005")) score += 8;
    if (current.value >= 3 && card.id === "CRD-006") score -= 8;
    if (ADJACENT[current.id]?.some((id) => cell(id).owner === opponent(player))) {
      if (card.id === "CRD-003" || card.id === "CRD-004" || card.id === "CRD-012" || card.id === "CRD-009") score += 10;
    }
    if (current.pieces[player] <= 0 && card.id === "CRD-010") score += 10;
    return score;
  }

  function cardUseFields(cardId) {
    if (cardId === "CRD-001") {
      return [{ key: "source", label: "効果元" }];
    }
    if (cardId === "CRD-011") {
      return [
        { key: "from", label: "移動元" },
        { key: "target", label: "移動先" }
      ];
    }
    if (["CRD-002", "CRD-004", "CRD-005", "CRD-006", "CRD-009", "CRD-010"].includes(cardId)) {
      return [{ key: "target", label: "対象" }];
    }
    return [];
  }

  function cardUseTargetInstruction(cardId) {
    if (cardId === "CRD-001") return "探索コストを下げる起点を選択";
    if (cardId === "CRD-002" || cardId === "CRD-010") return "駒を追加する自軍土地を選択";
    if (cardId === "CRD-004") return "要塞化する自軍土地を選択";
    if (cardId === "CRD-005") return "価値を+1する自軍土地を選択";
    if (cardId === "CRD-006") return "3Pにする2P自軍土地を選択";
    if (cardId === "CRD-009") return "価値を1Pに下げる隣接敵土地を選択";
    if (cardId === "CRD-011") return "移動元と移動先を選択";
    return "対象指定なし";
  }

  function cardUseFieldOptions(player, record, key, selected = {}) {
    const cardId = record.cardId;
    if (cardId === "CRD-001" && key === "source") {
      return CELLS.filter((id) => cell(id).owner === player);
    }
    if ((cardId === "CRD-002" || cardId === "CRD-010") && key === "target") {
      if (totalPieces(player) >= MAX_PIECES) {
        return [];
      }
      return CELLS.filter((id) => {
        const current = cell(id);
        return current.owner === player && current.pieces[player] < MAX_PIECES;
      });
    }
    if (cardId === "CRD-004" && key === "target") {
      return CELLS.filter((id) => canCardFortifyTarget(player, id));
    }
    if (cardId === "CRD-005" && key === "target") {
      return CELLS.filter((id) => {
        const current = cell(id);
        return current.owner === player && !current.fort && current.value > 0 && current.value < 3;
      });
    }
    if (cardId === "CRD-006" && key === "target") {
      return CELLS.filter((id) => {
        const current = cell(id);
        return current.owner === player && !current.fort && current.value === 2;
      });
    }
    if (cardId === "CRD-009" && key === "target") {
      return (ADJACENT[record.cellId] || []).filter((id) => cell(id).owner === opponent(player));
    }
    if (cardId === "CRD-011" && key === "from") {
      return CELLS.filter((id) => {
        const current = cell(id);
        return current.owner === player && current.pieces[player] > 0;
      });
    }
    if (cardId === "CRD-011" && key === "target") {
      const from = Number(selected.from || 0);
      return CELLS.filter((id) => {
        const current = cell(id);
        return id !== from
          && current.owner === player
          && current.pieces[player] < MAX_PIECES;
      });
    }
    return [];
  }

  function cardUseTargetLabel(id, player) {
    const current = cell(id);
    const owner = current.owner || "中立";
    const fort = current.fort ? "要塞" : "";
    const pieces = current.owner ? ` 駒${current.pieces[current.owner]}` : ` C${current.neutralCost}`;
    return `${id} ${owner}${current.value || ""}P${fort}${pieces}`;
  }

  function canCardFortifyTarget(player, id) {
    if (id === HOME[player]) {
      return false;
    }
    const current = cell(id);
    return current.owner === player
      && current.pieces[player] > 0
      && !current.fort
      && current.value > 0;
  }

  function normalizeCardUseReservation(player, reservation) {
    if (!reservation || reservation.kind !== "use") {
      return reservation || { kind: "skip", player };
    }
    const record = findCardRecord(player, reservation.recordId);
    const targets = {};
    cardUseFields(record?.cardId || reservation.cardId).forEach((field) => {
      const value = Number(reservation.targets?.[field.key]);
      if (CELLS.includes(value)) {
        targets[field.key] = value;
      }
    });
    return {
      kind: "use",
      player,
      recordId: reservation.recordId,
      cardId: record?.cardId || reservation.cardId,
      cost: cardUseCost(record?.cardId || reservation.cardId),
      targets
    };
  }

  function validateCardUseReservation(player, reservation) {
    ensureCardUseState();
    if (!state.awaitingCardUse) {
      return { ok: false, reason: "現在はカード使用フェイズではありません。" };
    }
    if (!reservation || reservation.kind === "skip") {
      return { ok: true, reason: "" };
    }
    const normalized = normalizeCardUseReservation(player, reservation);
    const record = findCardRecord(player, normalized.recordId);
    const card = cardDefinition(normalized.cardId);
    if (!record || !card) {
      return { ok: false, reason: "使用できるカードがありません。" };
    }
    if (record.cardId !== card.id) {
      return { ok: false, reason: "カード情報が一致しません。" };
    }
    const cardLand = cell(record.cellId);
    if (!cardLand || cardLand.owner !== player) {
      return { ok: false, reason: `${record.cellId}番を失っているため、そのカードは使用できません。` };
    }
    const cost = cardUseCost(card.id);
    if (state.players[player].assets < cost) {
      return { ok: false, reason: `資産が不足しています（必要${cost}）。` };
    }

    const target = Number(normalized.targets.target);
    const source = Number(normalized.targets.source);
    const from = Number(normalized.targets.from);
    if (card.id === "CRD-001") {
      return cell(source)?.owner === player
        ? { ok: true, reason: "" }
        : { ok: false, reason: "自軍支配地を選んでください。" };
    }
    if (card.id === "CRD-002" || card.id === "CRD-010") {
      const current = cell(target);
      return current?.owner === player && current.pieces[player] < MAX_PIECES && totalPieces(player) < MAX_PIECES
        ? { ok: true, reason: "" }
        : { ok: false, reason: "自軍駒を追加できる自軍支配地を選んでください。" };
    }
    if (card.id === "CRD-004") {
      return canCardFortifyTarget(player, target)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "要塞化できる自軍支配地を選んでください。" };
    }
    if (card.id === "CRD-005") {
      const current = cell(target);
      return current?.owner === player && !current.fort && current.value > 0 && current.value < 3
        ? { ok: true, reason: "" }
        : { ok: false, reason: "価値を上げられる未要塞の自軍支配地を選んでください。" };
    }
    if (card.id === "CRD-006") {
      const current = cell(target);
      return current?.owner === player && !current.fort && current.value === 2
        ? { ok: true, reason: "" }
        : { ok: false, reason: "3Pにできる2P・未要塞の自軍支配地を選んでください。" };
    }
    if (card.id === "CRD-009") {
      const current = cell(target);
      return current?.owner === opponent(player) && ADJACENT[record.cellId]?.includes(target)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "カードの土地に隣接する敵支配地を選んでください。" };
    }
    if (card.id === "CRD-011") {
      const sourceCell = cell(from);
      const targetCell = cell(target);
      return from !== target
        && sourceCell?.owner === player
        && sourceCell.pieces[player] > 0
        && targetCell?.owner === player
        && targetCell.pieces[player] < MAX_PIECES
        && pathWithinDistance(player, from, target, 2)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "自軍支配地を通る2マス以内の移動先を選んでください。" };
    }
    return { ok: true, reason: "" };
  }

  function cardUseTargetCombinations(player, record) {
    const fields = cardUseFields(record.cardId);
    if (fields.length === 0) {
      return [{}];
    }
    if (record.cardId === "CRD-011") {
      const combinations = [];
      cardUseFieldOptions(player, record, "from").forEach((from) => {
        cardUseFieldOptions(player, record, "target", { from }).forEach((target) => {
          combinations.push({ from, target });
        });
      });
      return combinations;
    }
    const field = fields[0];
    return cardUseFieldOptions(player, record, field.key).map((id) => ({ [field.key]: id }));
  }

  function legalCardUseReservations(player) {
    const reservations = [];
    playerCards(player).forEach((record) => {
      const card = cardDefinition(record.cardId);
      if (!card || state.players[player].assets < cardUseCost(card.id)) {
        return;
      }
      cardUseTargetCombinations(player, record).forEach((targets) => {
        const reservation = normalizeCardUseReservation(player, {
          kind: "use",
          recordId: record.id,
          cardId: record.cardId,
          targets
        });
        if (validateCardUseReservation(player, reservation).ok) {
          reservations.push(reservation);
        }
      });
    });
    return reservations;
  }

  function cardUseHeuristic(player, reservation) {
    const card = cardDefinition(reservation.cardId);
    if (!card) {
      return -Infinity;
    }
    const enemy = opponent(player);
    const target = reservation.targets?.target ? cell(reservation.targets.target) : null;
    let score = (CARD_SCORE[card.id] || 10) * 0.35 - cardUseCost(card.id) * 12;
    if (card.id === "CRD-001") {
      const source = cell(reservation.targets.source);
      const bestNeutral = source ? ADJACENT[source.id].filter((id) => cell(id).owner === null && cell(id).neutralCost > 0).length : 0;
      score += bestNeutral > 0 ? 22 : -12;
    }
    if (card.id === "CRD-002" || card.id === "CRD-010") {
      score += totalPieces(player) < totalPieces(enemy) ? 42 : 18;
      if (target && ADJACENT[target.id].some((id) => cell(id).owner === enemy)) score += 18;
    }
    if (card.id === "CRD-003" || card.id === "CRD-012") {
      score += legalActionCandidates(player).some((action) => action.type === "Exterminate") ? 44 : -10;
    }
    if (card.id === "CRD-004" && target) {
      score += fortressActionUtility(player, target.id) + 18;
    }
    if (card.id === "CRD-005" && target) {
      score += target.value === 2 ? 42 : 24;
      if (target.id === HOME[player] || target.id === 5) score += 18;
    }
    if (card.id === "CRD-006" && target) {
      score += 52;
      if (target.id === 5) score += 18;
    }
    if (card.id === "CRD-007") {
      const center = cell(5);
      score += center.owner === null && center.neutralCost > 0 ? 42 : center.owner === enemy ? 32 : -18;
    }
    if (card.id === "CRD-008") {
      score += 4;
    }
    if (card.id === "CRD-009" && target) {
      score += target.value * 18 + (target.id === HOME[enemy] || target.id === 5 ? 20 : 0);
    }
    return score;
  }

  function chooseCardUseForCpu(player) {
    const candidates = legalCardUseReservations(player)
      .map((reservation) => ({ reservation, score: cardUseHeuristic(player, reservation) }))
      .sort((left, right) => right.score - left.score);
    const best = candidates[0];
    return best && best.score > 12 ? best.reservation : { kind: "skip", player };
  }

  function reserveCardUse(player, reservation, messages, options = {}) {
    ensureCardUseState();
    if (!state.awaitingCardUse || !PLAYERS.includes(player) || state.cardUseReservations[player]) {
      return false;
    }
    if (!reservation || reservation.kind === "skip") {
      state.cardUseReservations[player] = {
        kind: "skip",
        player,
        autoNoCard: Boolean(options.autoNoCard)
      };
      if (!options.silent) {
        messages.push(`${player}はカード使用予約を完了。`);
      }
      return true;
    }

    const normalized = normalizeCardUseReservation(player, reservation);
    const validation = validateCardUseReservation(player, normalized);
    if (!validation.ok) {
      messages.push(validation.reason);
      return false;
    }
    state.cardUseReservations[player] = normalized;
    if (!options.silent) {
      messages.push(`${player}はカード使用予約を完了。`);
    }
    return true;
  }

  function autoResolveCpuCardUses(messages) {
    ensureCardUseState();
    if (!state.awaitingCardUse) {
      return;
    }
    PLAYERS.forEach((player) => {
      if (state.cardUseReservations[player]) {
        return;
      }
      if (playerCards(player).length === 0) {
        reserveCardUse(player, { kind: "skip" }, messages, { silent: true, autoNoCard: true });
        return;
      }
      if (isCpuPlayer(player)) {
        reserveCardUse(player, chooseCardUseForCpu(player), messages, { silent: false });
      }
    });
  }

  function beginCardUsePhase(messages) {
    ensureCardUseState();
    state.cardUseReservations = {};
    if (!PLAYERS.some((player) => playerCards(player).length > 0)) {
      state.awaitingCardUse = false;
      state.cardUseCommittedTurn = state.turn;
      return false;
    }
    state.awaitingCardUse = true;
    autoResolveCpuCardUses(messages);
    if (finishCardUsePhase(messages)) {
      return true;
    }
    messages.push("カード使用予約待ち。全員の予約後、同時公開してコマンド予約に進みます。");
    return true;
  }

  function finishCardUsePhase(messages) {
    ensureCardUseState();
    if (!state.awaitingCardUse || !allCardUsesReserved()) {
      return false;
    }
    commitCardUseReservations(messages);
    state.awaitingCardUse = false;
    state.cardUseCommittedTurn = state.turn;
    state.cardUseReservations = {};
    return true;
  }

  function commitCardUseReservations(messages) {
    ensureCardUseState();
    messages.push("カード使用予約を同時公開。");
    const paidUses = [];
    PLAYERS.forEach((player) => {
      const reservation = state.cardUseReservations[player] || { kind: "skip", player, autoNoCard: true };
      if (reservation.kind !== "use") {
        if (!reservation.autoNoCard) {
          messages.push(`${player}はカード使用なし。`);
        }
        return;
      }
      const card = cardDefinition(reservation.cardId);
      const validation = validateCardUseReservation(player, reservation);
      if (!card || !validation.ok) {
        messages.push(`${player}のカード使用は失敗。${validation.reason || ""}`);
        return;
      }
      const cost = cardUseCost(card.id);
      if (state.players[player].assets < cost) {
        messages.push(`${player}は資産不足で「${card.name}」を使用できない。`);
        return;
      }
      state.players[player].assets -= cost;
      paidUses.push(reservation);
      messages.push(cost > 0
        ? `${player}は${cost}資産を支払い「${card.name}」を使用。`
        : `${player}は「${card.name}」を使用。`);
    });
    paidUses.forEach((reservation) => applyCardUseEffect(reservation, messages, paidUses));
    paidUses.forEach((reservation) => discardUsedCard(reservation, messages));
    PLAYERS.forEach(capAssets);
  }

  function discardUsedCard(reservation, messages) {
    const card = cardDefinition(reservation.cardId);
    const removed = removePlayerCardRecord(reservation.player, reservation.recordId);
    if (card && removed) {
      messages.push(`${reservation.player}の「${card.name}」は使用済みとなり、手札一覧から除外。`);
    }
  }

  function applyCardUseEffect(reservation, messages, allUses = []) {
    const player = reservation.player;
    const card = cardDefinition(reservation.cardId);
    const record = findCardRecord(player, reservation.recordId);
    const targets = reservation.targets || {};
    if (!card || !record) {
      return;
    }
    if (card.id === "CRD-001") {
      const source = cell(targets.source);
      state.turnModifiers.neutralDiscounts.push({ player, from: source.id, amount: 1 });
      messages.push(`${player}の「${card.name}」: このターン、${source.id}番から隣接中立地への探索コスト-1。`);
      addCardUseReplay(player, card, [source.id], "CARD USE", `${source.id}番 探索支援`);
      return;
    }
    if (card.id === "CRD-002" || card.id === "CRD-010") {
      const target = cell(targets.target);
      if (target && totalPieces(player) < MAX_PIECES && target.pieces[player] < MAX_PIECES) {
        target.pieces[player] += 1;
        messages.push(`${player}の「${card.name}」: ${target.id}番に1駒追加。`);
        addCardUseReplay(player, card, [target.id], "UNIT +1", `${player} ${target.id}番`);
      }
      return;
    }
    if (card.id === "CRD-003") {
      state.turnModifiers.firstInvasionAttackBonus[player] += 1;
      messages.push(`${player}の「${card.name}」: このターン最初の侵攻攻撃側戦力+1。`);
      addCardUseReplay(player, card, [record.cellId], "CHARGE +1", `${player} 初回侵攻`);
      return;
    }
    if (card.id === "CRD-004") {
      const target = cell(targets.target);
      if (target && canCardFortifyTarget(player, target.id)) {
        target.fort = true;
        messages.push(`${player}の「${card.name}」: ${target.id}番を要塞化。`);
        addCardUseReplay(player, card, [target.id], "FORTRESS!", `${player} ${target.id}番`);
      }
      return;
    }
    if (card.id === "CRD-005" || card.id === "CRD-006") {
      const target = cell(targets.target);
      if (target && target.owner === player && !target.fort) {
        const before = target.value;
        target.value = card.id === "CRD-006" ? Math.max(target.value, 3) : Math.min(3, target.value + 1);
        messages.push(`${player}の「${card.name}」: ${target.id}番${before}P→${target.value}P。`);
        addCardUseReplay(
          player,
          card,
          [target.id],
          target.value >= 3 && before < 3 ? "3P CITY!" : "VALUE +1",
          `${player} ${target.id}番`
        );
      }
      return;
    }
    if (card.id === "CRD-007") {
      const center = cell(5);
      if (center.owner === null) {
        const before = center.neutralCost;
        center.neutralCost = 0;
        messages.push(`${player}の「${card.name}」: 中央5番の中立コスト${before}→0。`);
      } else if (center.owner === opponent(player)) {
        state.turnModifiers.invasionDiscounts.push({ player, target: 5, amount: 1 });
        messages.push(`${player}の「${card.name}」: このターン中央5番への侵攻コスト-1。`);
      } else {
        messages.push(`${player}の「${card.name}」: 中央5番は自軍支配のため効果なし。`);
      }
      addCardUseReplay(player, card, [5], "CENTER ROUTE", `${player} 中央圧力`);
      return;
    }
    if (card.id === "CRD-008") {
      const enemy = opponent(player);
      state.turnModifiers.revealedCardUse[player] = true;
      const enemyUse = allUses.find((item) => item.player === enemy);
      const enemyCard = enemyUse ? cardDefinition(enemyUse.cardId) : null;
      messages.push(`${player}の「${card.name}」: ${enemy}のカード使用予定は${enemyCard ? `「${enemyCard.name}」` : "使用なし"}。`);
      addCardUseReplay(player, card, [record.cellId], "SIGNAL", `${player} 情報公開`);
      return;
    }
    if (card.id === "CRD-009") {
      const target = cell(targets.target);
      if (target && target.owner === opponent(player)) {
        const before = target.value;
        target.value = 1;
        messages.push(`${player}の「${card.name}」: ${target.id}番${before}P→1P。`);
        addCardUseReplay(player, card, [target.id], "WITHER", `${target.id}番 価値低下`);
      }
      return;
    }
    if (card.id === "CRD-011") {
      const source = cell(targets.from);
      const target = cell(targets.target);
      if (source && target && source.pieces[player] > 0 && target.pieces[player] < MAX_PIECES) {
        source.pieces[player] -= 1;
        target.pieces[player] += 1;
        messages.push(`${player}の「${card.name}」: 1駒を${source.id}番から${target.id}番へ再配置。`);
        addCardUseReplay(player, card, [source.id, target.id], "REDEPLOY", `${source.id}→${target.id}`);
      }
      return;
    }
    if (card.id === "CRD-012") {
      state.turnModifiers.firstCombatBonus[player] += 1;
      messages.push(`${player}の「${card.name}」: このターン最初の戦闘で戦力+1。`);
      addCardUseReplay(player, card, [record.cellId], "BATTLE +1", `${player} 初回戦闘`);
    }
  }

  function addCardUseReplay(player, card, cells, title, detail) {
    addReplayEvent({
      kind: "card-use",
      player,
      label: `${player}: ${card.name}`,
      effect: "card",
      effectTitle: title,
      effectDetail: detail,
      cells,
      targets: cells.slice(-1),
      duration: 1200
    });
  }

  function autoResolveCpuCardChoices(messages) {
    let resolved = true;
    while (resolved) {
      resolved = false;
      const choice = state.cardChoices.find((item) => isCpuPlayer(item.player) && !item.reservation);
      if (!choice) {
        break;
      }
      if (availableCardSlots(choice.player, choice.id) <= 0) {
        reserveCardChoice(choice.id, choice.existingCardId ? { kind: "keep" } : { kind: "skip" }, messages);
      } else {
        reserveCardChoice(choice.id, { kind: "new", cardId: chooseCardForCpu(choice) }, messages);
      }
      resolved = true;
    }
  }

  function reserveCardChoice(choiceId, reservation, messages) {
    const choice = state.cardChoices.find((item) => item.id === Number(choiceId));
    if (!choice) {
      return false;
    }
    const current = cell(choice.cellId);
    if (!current || current.owner !== choice.player) {
      messages.push(`${choice.cellId}番の所有者が変わったため、カード取得予約は破棄された。`);
      choice.reservation = { kind: "skip" };
      return true;
    }

    if (reservation.kind === "keep") {
      choice.reservation = { kind: "keep" };
      messages.push(`${choice.player}は${choice.cellId}番の既存特性維持を予約。`);
      return true;
    }

    if (reservation.kind === "skip" || availableCardSlots(choice.player, choice.id) <= 0) {
      choice.reservation = { kind: choice.existingCardId ? "keep" : "skip" };
      messages.push(`${choice.player}は${choice.cellId}番のカード取得なしを予約。`);
      return true;
    }

    const card = cardDefinition(reservation.cardId);
    if (!card || !choice.options.includes(card.id)) {
      return false;
    }

    choice.reservation = { kind: "new", cardId: card.id };
    messages.push(`${choice.player}は${choice.cellId}番のカード取得を予約。`);
    return true;
  }

  function commitReservedCardChoices(messages) {
    if (!hasPendingCardChoices() || !allCardChoicesReserved()) {
      return false;
    }
    const choices = state.cardChoices.slice();
    state.cardChoices = [];
    choices.forEach((choice) => applyReservedCardChoice(choice, messages));
    return true;
  }

  function applyReservedCardChoice(choice, messages) {
    const current = cell(choice.cellId);
    if (!current || current.owner !== choice.player) {
      messages.push(`${choice.cellId}番の所有者が変わったため、カード取得予約は破棄された。`);
      return;
    }

    const reservation = choice.reservation || { kind: "skip" };
    if (reservation.kind === "keep") {
      const existing = cardDefinition(choice.existingCardId);
      messages.push(`${choice.player}は${choice.cellId}番の既存特性「${existing?.name || "不明"}」を維持。カード入手なし。`);
      return;
    }
    if (reservation.kind !== "new") {
      messages.push(`${choice.player}は${choice.cellId}番のカードを入手しない。`);
      return;
    }

    const card = cardDefinition(reservation.cardId);
    if (!card || playerCards(choice.player).length >= MAX_CARDS) {
      messages.push(`${choice.player}はカード上限${MAX_CARDS}枚のため、${choice.cellId}番のカードを入手できない。`);
      return;
    }

    current.traitCardId = card.id;
    current.traitAssignedBy = choice.player;
    removePlayerCardForCell(choice.player, choice.cellId);
    playerCards(choice.player).push(cardRecord(choice.player, card.id, choice.cellId));
    messages.push(`${choice.player}は${choice.cellId}番に土地特性「${card.name}」を同時確定。カード${playerCards(choice.player).length}/${MAX_CARDS}。`);
  }

  function render() {
    ensureCardUseState();
    renderSummary();
    renderBoard();
    renderPlayers();
    updatePlotAvailability();
    updateCardUseAvailability();
    renderLog();
    renderPhaseRail();
    updateReplayControls();
    els.resolveButton.disabled = state.gameOver || replayBusy || hasPendingCardChoices() || hasPendingCardUse();
    els.undoButton.disabled = history.length === 0 || replayBusy;
    refreshValidationMessage();
  }

  function renderSummary() {
    const scoreA = landScore("A");
    const scoreB = landScore("B");
    els.turnSummary.innerHTML = `
      <div class="metric"><span>ターン</span><span>${state.turn}/${MAX_TURN}</span></div>
      <div class="metric"><span>A</span><span>${state.players.A.assets}資産 / ${scoreA}P</span></div>
      <div class="metric"><span>B</span><span>${state.players.B.assets}資産 / ${scoreB}P</span></div>
    `;
  }

  function renderBoard() {
    els.board.innerHTML = "";
    CELLS.forEach((id) => {
      const current = cell(id);
      const owner = current.owner ?? "N";
      const square = document.createElement("article");
      square.className = `cell owner-${owner}`;
      square.classList.add(`value-${current.value}`);
      if (id === HOME.A || id === HOME.B) {
        square.classList.add("home-cell");
      }
      if (id === 5) {
        square.classList.add("central-cell");
      }
      if (current.neutralCost > 0) {
        square.classList.add("cost-cell");
      }
      square.dataset.cellId = String(id);
      if (current.fort) {
        square.classList.add("fortified");
      }
      const productionLabel = current.owner ? productionSiteLabel(current.owner, current) : "";
      if (productionLabel) {
        square.classList.add("production-site");
      }
      const trait = cardDefinition(current.traitCardId);
      if (trait) {
        square.classList.add("trait-cell");
      }
      applyVisualClasses(square, id);

      const tags = [];
      if (id === HOME.A) tags.push("A本拠");
      if (id === HOME.B) tags.push("B本拠");
      if (id === 5) tags.push("中央");
      if (current.owner && id !== HOME.A && id !== HOME.B && id !== 5 && current.value >= 3) tags.push("3P都市");
      if (productionLabel) tags.push("生産可");
      if (current.fort) tags.push("要塞");
      if (current.fort) tags.push("攻防+1");
      if (trait) tags.push(trait.name);

      const value = current.owner
        ? `${current.value}P`
        : `C${current.neutralCost}`;
      const ownerText = current.owner ? `${current.owner}支配` : "中立";
      const foot = current.owner
        ? trait
          ? `土地特性: ${trait.name}${current.value >= 2 ? " 発動中" : " 休眠"}`
          : productionLabel || (current.fort ? `${current.value}P要塞・攻防+1` : "通常土地")
        : current.neutralCost > 0 ? "中立コストあり" : "開放中立地";

      square.innerHTML = `
        <div class="cell-top">
          <span class="cell-id">${id}</span>
          <span class="cell-tags">${tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</span>
        </div>
        <div class="cell-main">
          <span class="owner-label ${owner}">${ownerText}</span>
          <span class="value-label">${value}</span>
          <div class="pieces">${renderPieceStack("A", current.pieces.A)}${renderPieceStack("B", current.pieces.B)}</div>
          ${trait ? renderLandTraitBadge(trait, current.value >= 2) : ""}
        </div>
        <div class="cell-foot">${foot}</div>
      `;
      els.board.appendChild(square);
    });
    els.board.insertAdjacentHTML("beforeend", renderArrowOverlay());
  }

  function applyVisualClasses(square, id) {
    const changeTypes = lastVisualChanges.get(id) || [];
    if (changeTypes.length > 0) {
      square.classList.add("cell-changed");
      changeTypes.forEach((type) => square.classList.add(`changed-${type}`));
    }
    if (!currentReplayEvent) {
      return;
    }
    const sources = currentReplayEvent.sources || [];
    const targets = currentReplayEvent.targets || [];
    const cells = currentReplayEvent.cells || [];
    if (sources.includes(id)) {
      square.classList.add("replay-source");
    }
    if (targets.includes(id)) {
      square.classList.add("replay-target");
    }
    if (cells.includes(id)) {
      square.classList.add("replay-active");
    }
    if (currentReplayEvent.kind === "bingo" && cells.includes(id)) {
      square.classList.add("bingo-cell", `bingo-${currentReplayEvent.player || "N"}`);
    }
    if (currentReplayEvent.kind === "bingo" && targets.includes(id)) {
      square.classList.add("bingo-bonus");
    }
    const effect = currentReplayEvent.effect || "";
    if (effect && cells.includes(id)) {
      square.classList.add("event-cell", `event-${effect}`);
    }
    if (effect && targets.includes(id)) {
      square.classList.add("event-target", `event-${effect}-target`);
    }
  }

  function renderArrowOverlay() {
    const arrows = currentReplayEvent?.arrows || [];
    const arrowMarkup = arrows.map((arrow) => renderArrow(arrow)).join("");
    const bingoMarkup = renderBingoOverlay();
    const activeClass = arrows.length > 0 || bingoMarkup ? " active" : "";
    return `<svg class="board-arrow-layer${activeClass}" viewBox="0 0 100 100" aria-hidden="true">${bingoMarkup}${arrowMarkup}</svg>${renderEventCallout()}`;
  }

  function renderBingoOverlay() {
    if (currentReplayEvent?.kind !== "bingo" || !currentReplayEvent.cells || currentReplayEvent.cells.length < 3) {
      return "";
    }
    const cells = currentReplayEvent.cells;
    const start = cellCenter(cells[0]);
    const end = cellCenter(cells[cells.length - 1]);
    const target = cellCenter(currentReplayEvent.targets?.[0] || cells[1]);
    const player = currentReplayEvent.player || "N";
    return `
      <path class="bingo-line bingo-line-${player}" d="M ${start.x} ${start.y} L ${end.x} ${end.y}"></path>
      <circle class="bingo-ring bingo-ring-${player}" cx="${target.x}" cy="${target.y}" r="15"></circle>
      <circle class="bingo-spark bingo-spark-${player}" cx="${target.x}" cy="${target.y}" r="3.2"></circle>
    `;
  }

  function renderEventCallout() {
    if (!currentReplayEvent) {
      return "";
    }
    const calloutTarget = currentReplayEvent.targets?.[0] || currentReplayEvent.cells?.[0];
    const position = CELLS.includes(Number(calloutTarget))
      ? cellCenter(Number(calloutTarget))
      : { x: 50, y: 50 };
    const positionStyle = `--callout-x: ${position.x}%; --callout-y: ${position.y}%;`;
    if (currentReplayEvent.kind === "bingo") {
      const player = currentReplayEvent.player || "";
      return `
        <div class="bingo-callout bingo-callout-${player}" style="${positionStyle}" aria-hidden="true">
          <strong>BINGO!</strong>
          <span>${player} ${currentReplayEvent.lineLabel || ""}</span>
        </div>
      `;
    }
    if (!currentReplayEvent.effectTitle) {
      return "";
    }
    const effect = currentReplayEvent.effect || currentReplayEvent.kind || "system";
    return `
      <div class="event-callout event-callout-${effect}" style="${positionStyle}" aria-hidden="true">
        <strong>${currentReplayEvent.effectTitle}</strong>
        <span>${currentReplayEvent.effectDetail || currentReplayEvent.label || ""}</span>
      </div>
    `;
  }

  function renderArrow(arrow) {
    const shape = arrowShape(arrow.from, arrow.to);
    if (!shape) {
      return "";
    }
    const classes = ["board-arrow", `arrow-${arrow.player || "N"}`, `arrow-${arrow.kind || "move"}`].join(" ");
    return `
      <path class="${classes}" d="M ${shape.x1} ${shape.y1} L ${shape.x2} ${shape.y2}"></path>
      <polygon class="${classes} arrow-head" points="${shape.points}"></polygon>
    `;
  }

  function arrowShape(from, to) {
    if (!CELLS.includes(from) || !CELLS.includes(to) || from === to) {
      return null;
    }
    const start = cellCenter(from);
    const end = cellCenter(to);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const x1 = start.x + ux * 5.5;
    const y1 = start.y + uy * 5.5;
    const x2 = end.x - ux * 7.5;
    const y2 = end.y - uy * 7.5;
    const headLength = 3.8;
    const headWidth = 2.2;
    const leftX = x2 - ux * headLength - uy * headWidth;
    const leftY = y2 - uy * headLength + ux * headWidth;
    const rightX = x2 - ux * headLength + uy * headWidth;
    const rightY = y2 - uy * headLength - ux * headWidth;
    const round = (value) => Number(value.toFixed(2));
    return {
      x1: round(x1),
      y1: round(y1),
      x2: round(x2),
      y2: round(y2),
      points: `${round(x2)},${round(y2)} ${round(leftX)},${round(leftY)} ${round(rightX)},${round(rightY)}`
    };
  }

  function cellCenter(id) {
    const index = id - 1;
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: ((col + 0.5) / 3) * 100,
      y: ((row + 0.5) / 3) * 100
    };
  }

  function renderPieceStack(player, count) {
    if (count <= 0) {
      return "";
    }
    const soldiers = Array.from({ length: count }, () => renderSoldierIcon(player)).join("");
    return `<span class="piece-stack ${player}">${soldiers}<span>${player}x${count}</span></span>`;
  }

  function renderLandTraitBadge(trait, active) {
    return `
      <div class="land-trait ${active ? "active" : "inactive"}" title="${trait.landEffect}">
        <span class="trait-icon">${trait.icon}</span>
        <span>${trait.name}</span>
      </div>
    `;
  }

  function renderSoldierIcon(player) {
    return `
      <svg class="piece-soldier ${player}" viewBox="0 0 32 42" aria-hidden="true" focusable="false">
        <path class="soldier-shadow" d="M7 39c2.1 1.4 15.9 1.4 18 0 1.5-1 0.4-2.8-2-3.4-3.7-0.9-10.3-0.9-14 0-2.4 0.6-3.5 2.4-2 3.4z"></path>
        <path class="soldier-body" d="M16 3c4.1 0 7.2 2.8 7.2 6.9 0 2.4-1 4.5-2.7 5.8 4.6 2.1 7.5 7 7.5 13.6v3.3c0 1.8-1.5 3.2-3.3 3.2H7.3C5.5 35.8 4 34.4 4 32.6v-3.3c0-6.6 2.9-11.5 7.5-13.6-1.7-1.3-2.7-3.4-2.7-5.8C8.8 5.8 11.9 3 16 3z"></path>
        <path class="soldier-crest" d="M16 5.5c2.4 0 4.4 1.6 5 3.8H11c0.6-2.2 2.6-3.8 5-3.8z"></path>
        <path class="soldier-shield" d="M7.3 22.2c2.9 0.7 5 3.3 5 6.3v4.1H7.2c-0.8 0-1.4-0.6-1.4-1.4v-2.6c0-2.4 0.5-4.6 1.5-6.4z"></path>
        <path class="soldier-spear" d="M23.5 11.5l1.8-4.5 1.9 4.5-1.2 0.4v21.2h-1.4V11.9l-1.1-0.4z"></path>
      </svg>
    `;
  }

  function renderPlayers() {
    document.querySelectorAll("[data-player-panel]").forEach((panel) => {
      playerPanelOpen[panel.dataset.playerPanel] = panel.open;
    });
    els.players.innerHTML = "";
    PLAYERS.forEach((player) => {
      const card = document.createElement("details");
      card.className = "player-card player-collapse";
      card.dataset.playerPanel = player;
      card.open = playerPanelOpen[player];
      const pending = state.players[player].pending.map((item) => item.cell).join(", ") || "-";
      card.innerHTML = `
        <summary class="player-head">
          <div class="player-name"><span class="player-mark ${player}">${player}</span><span>プレイヤー${player}</span></div>
          <div class="player-stats">
            <span class="stat-pill">資産 ${state.players[player].assets}/3</span>
            <span class="stat-pill">駒 ${totalPieces(player)}/3</span>
            <span class="stat-pill">行動枠 ${actionLimit(player)}</span>
            <span class="stat-pill">カード ${playerCards(player).length}/2</span>
            <span class="stat-pill">予約 ${pending}</span>
            <span class="stat-pill cpu-mode-pill">${CONTROL_MODES[controlModes[player]]}</span>
            <span class="stat-pill cpu-personality-pill">性格 ${cpuPersonalityLabel(player)}</span>
          </div>
        </summary>
        <div class="cpu-control-row">
          <label class="field cpu-mode-field">
            <span>操作</span>
            <select data-cpu-mode="${player}">
              ${renderControlModeOptions(player)}
            </select>
          </label>
          <p class="cpu-mode-help">${controlModes[player] === "human" ? `手動で行動を入力します。CPUに切り替えた場合は${cpuPersonalityLabel(player)}として動きます。` : `${cpuPersonalityLabel(player)}: ${cpuPersonality(player).description}`}</p>
        </div>
        ${renderCardUsePanel(player)}
        ${renderPlayerCardArea(player)}
        ${renderCardChoicePanel(player)}
        <div class="plot-grid ${controlModes[player] !== "human" ? "cpu-controlled-grid" : ""}" data-player="${player}">
          ${[0, 1, 2].map((index) => renderPlotRow(player, index)).join("")}
        </div>
      `;
      els.players.appendChild(card);
    });
  }

  function renderPlayerCardArea(player) {
    const records = playerCards(player);
    const cards = records.map((record) => {
      const card = cardDefinition(record.cardId);
      if (!card) {
        return "";
      }
      return `
        <article class="held-card" title="${card.landEffect}">
          <div class="held-card-top">
            <span class="trait-icon">${card.icon}</span>
            <strong>${card.name}</strong>
            <span>${record.cellId}番</span>
          </div>
          <p>${card.flavor}</p>
        </article>
      `;
    }).join("");
    return `
      <section class="public-cards" aria-label="プレイヤー${player}の公開カード">
        <div class="mini-heading">
          <strong>公開カード</strong>
          <span>${records.length}/${MAX_CARDS}</span>
        </div>
        <div class="held-card-grid">
          ${cards || `<p class="empty-card-note">まだカードなし</p>`}
        </div>
      </section>
    `;
  }

  function renderCardUsePanel(player) {
    if (!hasPendingCardUse()) {
      return "";
    }
    const records = playerCards(player);
    const reservation = cardUseReservation(player);
    const summary = cardUseReservationSummary();
    if (reservation) {
      return `
        <section class="card-use-panel reserved">
          <div class="mini-heading">
            <strong>カード使用予約済み</strong>
            <span>${summary.reserved}/${summary.total}</span>
          </div>
          <p class="choice-reserved-note">全員の予約が揃うと同時に公開・解決します。</p>
        </section>
      `;
    }
    if (records.length === 0) {
      return `
        <section class="card-use-panel reserved">
          <div class="mini-heading">
            <strong>カード使用なし</strong>
            <span>${summary.reserved}/${summary.total}</span>
          </div>
          <p class="choice-reserved-note">使用できるカードがないため自動で予約されます。</p>
        </section>
      `;
    }
    if (isCpuPlayer(player)) {
      return `
        <section class="card-use-panel reserved">
          <div class="mini-heading">
            <strong>CPUカード使用予約</strong>
            <span>${summary.reserved}/${summary.total}</span>
          </div>
          <p class="choice-reserved-note">CPUがカード使用を自動予約します。</p>
        </section>
      `;
    }

    const cards = records.map((record) => renderCardUseCard(player, record)).join("");
    return `
      <section class="card-use-panel" data-card-use-panel="${player}">
        <div class="mini-heading">
          <strong>カード使用予約</strong>
          <span>${summary.reserved}/${summary.total}予約 / ターン1枚</span>
        </div>
        <div class="use-card-grid">
          ${cards}
        </div>
        <button type="button" class="skip-card-button" data-card-use-skip="${player}">
          カードを使用しないで予約
        </button>
      </section>
    `;
  }

  function renderCardUseCard(player, record) {
    const card = cardDefinition(record.cardId);
    if (!card) {
      return "";
    }
    const cost = cardUseCost(card.id);
    return `
      <article class="use-card" data-card-use-card="${record.id}" data-card-use-player="${player}">
        <div class="held-card-top">
          <span class="trait-icon">${card.icon}</span>
          <strong>${card.name}</strong>
          <span>${cost}資産</span>
        </div>
        <p>${card.useEffect}</p>
        ${renderCardUseFields(player, record)}
        <button type="button" class="use-card-button" data-card-use-record="${record.id}" data-card-use-player="${player}">
          2. このカードを予約
        </button>
      </article>
    `;
  }

  function renderCardUseFields(player, record) {
    const fields = cardUseFields(record.cardId);
    if (fields.length === 0) {
      return `<p class="card-use-no-target">対象指定なし</p>`;
    }
    const selected = {};
    return `
      <div class="card-use-target-box">
        <div class="card-use-target-head">
          <strong>1. 対象選択</strong>
          <span>${cardUseTargetInstruction(record.cardId)}</span>
        </div>
        <div class="card-use-fields">
          ${fields.map((field) => {
            const options = cardUseFieldOptions(player, record, field.key, selected);
            const chosen = selected[field.key] || options[0] || "";
            selected[field.key] = chosen;
            return `
              <label class="field card-use-field">
                <span>${field.label}</span>
                <select data-card-use-field="${field.key}">
                  ${renderCardUseOptionMarkup(options, player, chosen)}
                </select>
              </label>
            `;
          }).join("")}
        </div>
        <p class="card-use-target-note">対象候補がないカードは、条件を満たすまで予約できません。</p>
      </div>
    `;
  }

  function renderCardUseOptionMarkup(options, player, selected = "") {
    if (!options.length) {
      return `<option value="">対象候補なし</option>`;
    }
    return `<option value="">-</option>${options.map((id) => `<option value="${id}"${id === Number(selected) ? " selected" : ""}>${cardUseTargetLabel(id, player)}</option>`).join("")}`;
  }

  function refreshCardUseDependentFields(cardElement) {
    const player = cardElement.dataset.cardUsePlayer;
    const record = findCardRecord(player, cardElement.dataset.cardUseCard);
    if (!record || record.cardId !== "CRD-011") {
      return;
    }
    const fromSelect = cardElement.querySelector('[data-card-use-field="from"]');
    const targetSelect = cardElement.querySelector('[data-card-use-field="target"]');
    if (!fromSelect || !targetSelect) {
      return;
    }
    const selectedTarget = Number(targetSelect.value || 0);
    const options = cardUseFieldOptions(player, record, "target", { from: Number(fromSelect.value || 0) });
    const nextSelected = options.includes(selectedTarget) ? selectedTarget : options[0] || "";
    targetSelect.innerHTML = renderCardUseOptionMarkup(options, player, nextSelected);
  }

  function cardUseReservationFromElement(cardElement) {
    const player = cardElement.dataset.cardUsePlayer;
    const recordId = cardElement.dataset.cardUseCard;
    const record = findCardRecord(player, recordId);
    const targets = {};
    cardElement.querySelectorAll("[data-card-use-field]").forEach((field) => {
      const value = Number(field.value);
      if (CELLS.includes(value)) {
        targets[field.dataset.cardUseField] = value;
      }
    });
    return normalizeCardUseReservation(player, {
      kind: "use",
      recordId,
      cardId: record?.cardId,
      targets
    });
  }

  function updateCardUseAvailability() {
    if (!state || !hasPendingCardUse()) {
      return;
    }
    document.querySelectorAll(".use-card").forEach((cardElement) => {
      const player = cardElement.dataset.cardUsePlayer;
      const button = cardElement.querySelector("[data-card-use-record]");
      if (!button) {
        return;
      }
      const reservation = cardUseReservationFromElement(cardElement);
      const validation = validateCardUseReservation(player, reservation);
      button.disabled = !validation.ok;
      button.title = validation.reason;
      cardElement.classList.toggle("unavailable", !validation.ok);
    });
    document.querySelectorAll("[data-card-use-skip]").forEach((button) => {
      const player = button.dataset.cardUseSkip;
      button.disabled = Boolean(cardUseReservation(player));
    });
  }

  function renderCardChoicePanel(player) {
    const summary = reservationSummary(player);
    const choice = summary.choices.find((item) => !item.reservation);
    if (!choice && summary.choices.length === 0) {
      return "";
    }
    if (!choice) {
      return `
        <section class="card-choice-panel reserved">
          <div class="mini-heading">
            <strong>カード取得予約済み</strong>
            <span>${summary.reserved}/${summary.choices.length}</span>
          </div>
          <p class="choice-reserved-note">全員の予約が揃うと同時に公開・確定します。</p>
        </section>
      `;
    }

    const existing = cardDefinition(choice.existingCardId);
    const options = choice.options.map((cardId) => cardDefinition(cardId)).filter(Boolean);
    const slots = availableCardSlots(player, choice.id);
    return `
      <section class="card-choice-panel" data-card-choice-panel="${choice.id}">
        <div class="mini-heading">
          <strong>${choice.cellId}番のカード取得予約</strong>
          <span>${summary.reserved}/${summary.choices.length}予約</span>
        </div>
        ${existing ? `
          <button type="button" class="keep-trait-button" data-card-keep="${choice.id}">
            既存効果を維持: ${existing.name}
          </button>
        ` : ""}
        ${slots <= 0 ? `
          <button type="button" class="skip-card-button" data-card-skip="${choice.id}">
            カード取得なしで予約
          </button>
        ` : `
          <div class="choice-card-grid">
            ${options.map((card) => `
              <button type="button" class="choice-card" data-card-choice="${choice.id}" data-card-id="${card.id}">
                <span class="choice-card-name"><span class="trait-icon">${card.icon}</span>${card.name}</span>
                <span class="choice-card-flavor">${card.flavor}</span>
                <span class="choice-card-effect">${card.landEffect}</span>
              </button>
            `).join("")}
          </div>
        `}
      </section>
    `;
  }

  function renderControlModeOptions(player) {
    return Object.entries(CONTROL_MODES)
      .map(([value, label]) => `<option value="${value}"${controlModes[player] === value ? " selected" : ""}>${label}</option>`)
      .join("");
  }

  function isCpuPlayer(player) {
    return CPU_MODES.has(controlModes[player]);
  }

  function renderPlotRow(player, index) {
    const cellOptions = [`<option value="">-</option>`]
      .concat(CELLS.map((id) => `<option value="${id}">${id}</option>`))
      .join("");
    const actionOptions = [`<option value="">なし</option>`]
      .concat(ACTIONS.map((action) => `<option value="${action}">${ACTION_LABELS[action]}</option>`))
      .join("");
    return `
      <div class="plot-row" data-row="${index + 1}" data-player="${player}">
        <span class="plot-index">${index + 1}</span>
        <label class="field"><span>起点</span><select data-field="from">${cellOptions}</select></label>
        <label class="field"><span>行動</span><select data-field="type">${actionOptions}</select></label>
        <label class="field"><span>対象</span><select data-field="target">${cellOptions}</select></label>
        <label class="field"><span>駒数</span><input data-field="units" type="number" min="1" max="3" value="1"></label>
        <label class="field"><span>優先</span><input data-field="priority" type="number" min="1" max="9" value="${index + 1}"></label>
      </div>
    `;
  }

  function updatePlotAvailability() {
    document.querySelectorAll(".plot-row").forEach((row) => {
      const player = row.dataset.player;
      const fromSelect = row.querySelector('[data-field="from"]');
      const typeSelect = row.querySelector('[data-field="type"]');
      const targetSelect = row.querySelector('[data-field="target"]');
      const unitsInput = row.querySelector('[data-field="units"]');
      const priorityInput = row.querySelector('[data-field="priority"]');
      const from = Number(fromSelect.value);
      const slot = Number(row.dataset.row);
      const cpuControlled = isCpuPlayer(player);
      const waitingForCards = hasPendingCardChoices();
      const waitingForCardUse = hasPendingCardUse();
      const slotEnabled = slot <= actionLimit(player) && !cpuControlled && !replayBusy && !waitingForCards && !waitingForCardUse;

      fromSelect.disabled = !slotEnabled;
      typeSelect.disabled = !slotEnabled;
      unitsInput.disabled = !slotEnabled;
      priorityInput.disabled = !slotEnabled;
      row.classList.toggle("cpu-controlled-row", cpuControlled);

      if (!slotEnabled) {
        targetSelect.disabled = true;
        row.classList.add("unavailable");
        row.title = cpuControlled
          ? `${CONTROL_MODES[controlModes[player]]}がこのターンの行動を自動生成します。`
          : waitingForCards
            ? "カード取得予約を完了すると次のターンへ進みます。"
            : waitingForCardUse
              ? "カード使用予約を完了するとコマンド入力に進みます。"
              : `このターンの行動枠は${actionLimit(player)}枠です。`;
        return;
      }

      updateSourceOptions(player, fromSelect);
      updateUnitsInput(player, from, typeSelect.value, unitsInput);
      const units = Number(unitsInput.value || 1);
      updateActionOptions(player, from, typeSelect);

      if (typeSelect.value && typeSelect.selectedOptions[0]?.disabled) {
        typeSelect.value = "";
      }

      updateTargetOptions(player, from, typeSelect.value, targetSelect, units);
      targetSelect.disabled = !needsTarget(typeSelect.value);
      if (targetSelect.value && targetSelect.selectedOptions[0]?.disabled) {
        targetSelect.value = "";
      }

      const hasInvalidSource = Boolean(fromSelect.value) && !canUseSource(player, from);
      row.classList.toggle("unavailable", hasInvalidSource);
      row.title = hasInvalidSource ? "この起点には自軍駒がありません。" : "";
    });
  }

  function updateSourceOptions(player, fromSelect) {
    [...fromSelect.options].forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        option.title = "";
        return;
      }
      const source = cell(Number(option.value));
      option.disabled = source.pieces[player] <= 0;
      option.title = option.disabled ? "自軍駒がありません。" : "";
    });
  }

  function updateUnitsInput(player, from, type, unitsInput) {
    const maxUnits = maxUnitsForAction(player, from, type);
    unitsInput.max = String(maxUnits);
    if (Number(unitsInput.value || 1) > maxUnits) {
      unitsInput.value = String(maxUnits);
    }
    if (Number(unitsInput.value || 1) < 1) {
      unitsInput.value = "1";
    }
  }

  function maxUnitsForAction(player, from, type) {
    if (!CELLS.includes(from)) {
      return 1;
    }
    const source = cell(from);
    let maxUnits = Math.max(1, source.pieces[player]);
    if (type === "Exploit") {
      maxUnits = Math.min(maxUnits, Math.max(1, 3 - source.value));
    }
    if (type === "Fortify" || type === "Produce") {
      maxUnits = 1;
    }
    return Math.min(MAX_PIECES, actionLimit(player), maxUnits);
  }

  function updateActionOptions(player, from, typeSelect) {
    const availability = actionAvailability(player, from);
    [...typeSelect.options].forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        option.title = "";
        return;
      }
      const info = availability[option.value];
      option.disabled = !info.enabled;
      option.title = info.reason;
      option.textContent = ACTION_LABELS[option.value];
    });
  }

  function actionAvailability(player, from) {
    const unavailable = (reason) => ({ enabled: false, reason });
    const available = { enabled: true, reason: "" };
    const result = Object.fromEntries(ACTIONS.map((action) => [action, unavailable("起点を選んでください。")]));
    if (!CELLS.includes(from)) {
      return result;
    }

    const source = cell(from);
    if (source.pieces[player] <= 0) {
      return Object.fromEntries(ACTIONS.map((action) => [action, unavailable("起点に自軍駒がありません。")]));
    }

    result.Explore = hasTargetFor(player, from, "Explore", 1)
      ? available
      : unavailable("隣接する探索可能な中立地がありません。");
    result.Exterminate = hasTargetFor(player, from, "Exterminate", 1)
      ? available
      : unavailable("隣接する侵攻可能な敵土地がありません。");
    result.Move = hasTargetFor(player, from, "Move", 1)
      ? available
      : unavailable("移動可能な自国支配地がありません。");
    result.Exploit = canExploit(player, from)
      ? available
      : unavailable("開発できる自国土地ではありません。");
    result.Fortify = canFortify(player, from)
      ? available
      : unavailable("要塞化には未要塞の自国土地・自軍駒・資産3が必要です。");
    result.Produce = canProduceNow(player, from)
      ? available
      : unavailable("本拠地・中央・3P都市のいずれかで、自軍駒・駒上限・資産3を満たす必要があります。");
    return result;
  }

  function updateTargetOptions(player, from, type, targetSelect, units) {
    [...targetSelect.options].forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        option.textContent = "-";
        option.title = "";
        return;
      }
      const target = Number(option.value);
      const info = targetAvailability(player, from, type, target, units);
      option.disabled = !info.enabled;
      option.textContent = targetLabel(target, player, from, type);
      option.title = info.reason;
    });
  }

  function targetAvailability(player, from, type, target, units) {
    const unavailable = (reason) => ({ enabled: false, reason });
    if (!type) {
      return unavailable("行動を選んでください。");
    }
    if (type === "Exploit" || type === "Fortify" || type === "Produce") {
      return unavailable("この行動に対象マス指定は不要です。");
    }
    if (!canUseSource(player, from)) {
      return unavailable("起点に自軍駒がありません。");
    }
    if (!CELLS.includes(target)) {
      return unavailable("対象が不正です。");
    }
    if (type === "Explore") {
      return canExploreTarget(player, from, target)
        ? { enabled: true, reason: "" }
        : unavailable("隣接する中立地、または支払い可能な中立コストではありません。");
    }
    if (type === "Exterminate") {
      return canExterminateTarget(player, from, target)
        ? { enabled: true, reason: "" }
        : unavailable("隣接する敵土地、または支払い可能な侵攻コストではありません。");
    }
    if (type === "Move") {
      return canMoveTarget(player, from, target, units)
        ? { enabled: true, reason: "" }
        : unavailable("移動経路、支配、または移動先の駒上限を満たしていません。");
    }
    return unavailable("未対応の行動です。");
  }

  function needsTarget(type) {
    return type === "Explore" || type === "Exterminate" || type === "Move";
  }

  function targetLabel(id, player = null, from = null, type = null) {
    const current = cell(id);
    if (!current.owner) {
      const cost = player && from && type === "Explore" ? effectiveNeutralCost(player, from, id) : current.neutralCost;
      return `${id} C${cost}`;
    }
    const fort = current.fort ? "要塞" : "";
    const cost = player && from && type === "Exterminate" ? ` / 侵攻${effectiveInvasionCost(player, from, id)}` : "";
    return `${id} ${current.owner}${current.value}P${fort}${cost}`;
  }

  function canUseSource(player, from) {
    return CELLS.includes(from) && cell(from).pieces[player] > 0;
  }

  function hasTargetFor(player, from, type, units) {
    return CELLS.some((target) => targetAvailability(player, from, type, target, units).enabled);
  }

  function canExploreTarget(player, from, target) {
    const targetCell = cell(target);
    return isAdjacent(from, target)
      && targetCell.owner === null
      && state.players[player].assets >= effectiveNeutralCost(player, from, target);
  }

  function canExterminateTarget(player, from, target) {
    const targetCell = cell(target);
    return isAdjacent(from, target)
      && targetCell.owner === opponent(player)
      && state.players[player].assets >= effectiveInvasionCost(player, from, target);
  }

  function canMoveTarget(player, from, target, units) {
    const targetCell = cell(target);
    return target !== from
      && targetCell.owner === player
      && validMovePath(player, from, target)
      && targetCell.pieces[player] + units <= MAX_PIECES;
  }

  function canExploit(player, from) {
    if (state.turn <= 2) {
      return false;
    }
    const source = cell(from);
    return source.owner === player
      && source.pieces[player] > 0
      && !source.fort
      && source.value > 0
      && source.value < 3;
  }

  function canFortify(player, from) {
    if (from === HOME[player]) {
      return false;
    }
    const source = cell(from);
    return source.owner === player
      && source.pieces[player] > 0
      && !source.fort
      && source.value > 0
      && state.players[player].assets >= 3;
  }

  function isProductionSite(player, from) {
    if (!CELLS.includes(from)) {
      return false;
    }
    const source = cell(from);
    return isProductionSiteCell(player, source);
  }

  function isProductionSiteCell(player, source) {
    if (!source || source.owner !== player) {
      return false;
    }
    return source.id === HOME[player]
      || source.id === 5
      || source.value >= 3
      || activeTrait(player, source.id, "CRD-006");
  }

  function productionSiteLabel(player, source) {
    if (!source || source.owner !== player) {
      return "";
    }
    if (source.id === HOME[player]) {
      return "本拠生産拠点";
    }
    if (source.id === 5) {
      return "中央生産拠点";
    }
    if (source.value >= 3) {
      return "3P都市・生産可";
    }
    if (activeTrait(player, source.id, "CRD-006")) {
      return "城塞都市・生産可";
    }
    return "";
  }

  function canProduceNow(player, from) {
    const source = cell(from);
    return isProductionSite(player, from)
      && source.pieces[player] > 0
      && totalPieces(player) < MAX_PIECES
      && source.pieces[player] < MAX_PIECES
      && state.players[player].assets >= 3;
  }

  function renderLog() {
    els.logList.innerHTML = "";
    state.log.slice(-100).forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      if (entry.includes("勝利") || entry.includes("敗北") || entry.includes("終了")) {
        item.className = "danger-text";
      }
      els.logList.appendChild(item);
    });
    els.logList.scrollTop = els.logList.scrollHeight;
  }

  function currentPhaseKey() {
    if (state.gameOver) {
      return "result";
    }
    if (hasPendingCardUse()) {
      return "card-use";
    }
    if (hasPendingCardChoices()) {
      return "card-reserve";
    }
    if (replayBusy || currentReplayEvent) {
      return "resolve";
    }
    return "command";
  }

  function renderPhaseRail() {
    if (!els.phaseRail) {
      return;
    }
    const activeKey = currentPhaseKey();
    const activeIndex = PHASE_STEPS.findIndex((step) => step.key === activeKey);
    els.phaseRail.innerHTML = PHASE_STEPS.map((step, index) => {
      const status = index < activeIndex ? "done" : index === activeIndex ? "active" : "next";
      const cardUseHint = step.key === "card-use" && activeKey === "command" && playerCards("A").length + playerCards("B").length > 0 ? " nearby" : "";
      return `
        <li class="phase-step ${status}${cardUseHint}">
          <span class="phase-dot">${step.number}</span>
          <span class="phase-text">
            <strong>${step.label}</strong>
            <small>${step.note}</small>
          </span>
        </li>
      `;
    }).join("");
  }

  function buildVisualChanges(before, after) {
    const changes = new Map();
    CELLS.forEach((id) => {
      const prev = before.cells[id];
      const next = after.cells[id];
      const types = [];
      if (prev.owner !== next.owner) types.push("owner");
      if (prev.value !== next.value) types.push(next.value > prev.value ? "value-up" : "value-down");
      if (prev.fort !== next.fort) types.push("fort");
      if (prev.neutralCost !== next.neutralCost) types.push("neutral");
      if (prev.traitCardId !== next.traitCardId) types.push("trait");
      if (prev.pieces.A !== next.pieces.A || prev.pieces.B !== next.pieces.B) types.push("pieces");
      if (types.length > 0) {
        changes.set(id, types);
      }
    });
    return changes;
  }

  function addReplayEvent(event) {
    if (!turnReplayEvents) {
      return;
    }
    const normalized = {
      id: replayEventSerial++,
      kind: "system",
      player: null,
      label: "",
      cells: [],
      sources: [],
      targets: [],
      arrows: [],
      ...event
    };
    normalized.cells = uniqueNumbers(normalized.cells);
    normalized.sources = uniqueNumbers(normalized.sources);
    normalized.targets = uniqueNumbers(normalized.targets);
    normalized.arrows = (normalized.arrows || []).filter((arrow) => CELLS.includes(arrow.from) && CELLS.includes(arrow.to));
    turnReplayEvents.push(normalized);
  }

  function uniqueNumbers(values) {
    return [...new Set((values || []).map(Number).filter((value) => CELLS.includes(value)))];
  }

  function arrowsFromEntries(entries, kind) {
    return entries.map((entry) => ({
      from: entry.from,
      to: entry.target,
      player: entry.player,
      kind
    }));
  }

  function playReplay(events = lastReplayEvents) {
    stopReplay({ keepStatus: true, renderBoardOnly: true });
    if (!events || events.length === 0) {
      currentReplayEvent = null;
      updateReplayControls("リプレイできるイベントはありません。");
      renderBoard();
      return;
    }

    replayBusy = true;
    let index = 0;
    const step = () => {
      if (!replayBusy) {
        return;
      }
      if (index >= events.length) {
        currentReplayEvent = null;
        replayBusy = false;
        renderBoard();
        renderPhaseRail();
        updatePlotAvailability();
        updateCardUseAvailability();
        updateReplayControls(`リプレイ完了：${events.length}件`);
        refreshValidationMessage();
        return;
      }
      currentReplayEvent = events[index];
      renderBoard();
      renderPhaseRail();
      updatePlotAvailability();
      updateCardUseAvailability();
      updateReplayControls(`${index + 1}/${events.length} ${currentReplayEvent.label}`);
      index += 1;
      replayTimer = window.setTimeout(step, currentReplayEvent.duration || 900);
    };
    step();
  }

  function stopReplay(options = {}) {
    if (replayTimer) {
      window.clearTimeout(replayTimer);
      replayTimer = null;
    }
    replayBusy = false;
    currentReplayEvent = null;
    if (!options.keepStatus) {
      updateReplayControls();
    }
    if (!options.renderBoardOnly) {
      renderBoard();
    }
  }

  function updateReplayControls(statusText) {
    if (!els.replayButton || !els.skipReplayButton || !els.replayStatus) {
      return;
    }
    const hasEvents = lastReplayEvents.length > 0;
    els.replayButton.disabled = !hasEvents || replayBusy;
    els.skipReplayButton.disabled = !replayBusy;
    if (els.resolveButton && state) {
      els.resolveButton.disabled = state.gameOver || replayBusy || hasPendingCardChoices() || hasPendingCardUse();
    }
    if (els.undoButton) {
      els.undoButton.disabled = history.length === 0 || replayBusy;
    }
    if (statusText) {
      els.replayStatus.textContent = statusText;
      return;
    }
    if (replayBusy && currentReplayEvent) {
      els.replayStatus.textContent = currentReplayEvent.label;
      return;
    }
    els.replayStatus.textContent = hasEvents
      ? `直近ターン：${lastReplayEvents.length}件の演出を再生できます。`
      : "まだリプレイはありません。";
  }

  function readActionsFromDom({ assignIds = true } = {}) {
    const actions = [];
    document.querySelectorAll(".plot-row").forEach((row) => {
      const player = row.dataset.player;
      if (isCpuPlayer(player)) {
        return;
      }
      const rowNumber = Number(row.dataset.row);
      const type = row.querySelector('[data-field="type"]').value;
      if (!type) {
        return;
      }
      const from = Number(row.querySelector('[data-field="from"]').value);
      const targetValue = row.querySelector('[data-field="target"]').value;
      const target = targetValue ? Number(targetValue) : null;
      const units = Math.max(1, Math.min(MAX_PIECES, Number(row.querySelector('[data-field="units"]').value || 1)));
      const priority = Math.max(1, Number(row.querySelector('[data-field="priority"]').value || rowNumber));
      actions.push({
        id: assignIds ? `${player}-${state.turn}-${actionSerial++}` : `${player}-${state.turn}-preview-${rowNumber}`,
        player,
        row: rowNumber,
        type,
        from,
        target,
        units,
        priority,
        paid: !requiresPayment(type),
        costKey: null,
        cost: 0,
        failed: false,
        source: "human"
      });
    });
    return actions;
  }

  function readActions() {
    return readActionsFromDom({ assignIds: true });
  }

  function requiresPayment(type) {
    return type === "Explore" || type === "Exterminate" || type === "Produce" || type === "Fortify";
  }

  function actionName(action) {
    const target = action.target ? ` -> ${action.target}` : "";
    return `${action.player}${action.row}: ${action.from}${target} ${ACTION_LABELS[action.type] || action.type} x${action.units}`;
  }

  function validateActionCapacity(actions) {
    const errors = [];
    PLAYERS.forEach((player) => {
      const playerActions = actions.filter((action) => action.player === player);
      const total = playerActions.reduce((sum, action) => sum + action.units, 0);
      const limit = actionLimit(player);
      if (total > limit) {
        errors.push(`${player}の行動数が上限${limit}を超えています。`);
      }

      const bySource = new Map();
      playerActions.forEach((action) => {
        if (!CELLS.includes(action.from)) {
          errors.push(`${action.player}${action.row}の起点が未指定です。`);
          return;
        }
        bySource.set(action.from, (bySource.get(action.from) || 0) + action.units);
        if ((action.type === "Explore" || action.type === "Exterminate" || action.type === "Move") && !CELLS.includes(action.target)) {
          errors.push(`${action.player}${action.row}の対象が未指定です。`);
        }
      });

      const oncePerSource = new Set();
      playerActions.forEach((action) => {
        if (action.type !== "Fortify" && action.type !== "Produce") {
          return;
        }
        const key = `${action.type}:${action.from}`;
        if (oncePerSource.has(key)) {
          errors.push(`${player}は${action.from}番で${ACTION_LABELS[action.type]}を複数回指定しています。`);
        }
        oncePerSource.add(key);
      });

      bySource.forEach((units, from) => {
        const available = cell(from).pieces[player];
        if (units > available) {
          errors.push(`${player}は${from}番の駒${available}個に対して${units}個分の行動を指定しています。`);
        }
      });
    });
    return errors;
  }


  function costGroupForValidation(action) {
    if (!requiresPayment(action.type)) {
      return null;
    }
    if (!CELLS.includes(action.from)) {
      return null;
    }
    const source = cell(action.from);
    if (!source || source.pieces[action.player] < action.units) {
      return null;
    }
    const target = action.target ? cell(action.target) : null;

    if (action.type === "Explore") {
      if (!target || !isAdjacent(action.from, action.target) || target.owner !== null) {
        return null;
      }
      return {
        key: `${action.player}:Explore:${action.target}`,
        player: action.player,
        cost: effectiveNeutralCost(action.player, action.from, action.target),
        priority: action.priority,
        order: action.row,
        label: `${action.target}番探索`
      };
    }

    if (action.type === "Exterminate") {
      if (!target || !isAdjacent(action.from, action.target) || target.owner !== opponent(action.player)) {
        return null;
      }
      return {
        key: `${action.player}:Exterminate:${action.target}`,
        player: action.player,
        cost: effectiveInvasionCost(action.player, action.from, action.target),
        priority: action.priority,
        order: action.row,
        label: `${action.target}番侵攻`
      };
    }

    if (action.type === "Fortify") {
      if (action.from === HOME[action.player] || source.owner !== action.player || source.fort || source.value < 1) {
        return null;
      }
      return {
        key: `${action.player}:Fortify:${action.from}:${action.row}`,
        player: action.player,
        cost: 3,
        priority: action.priority,
        order: action.row,
        label: `${action.from}番要塞化`
      };
    }

    if (action.type === "Produce") {
      const canReserveProduction = isProductionSite(action.player, action.from)
        && source.pieces[action.player] > 0
        && totalPieces(action.player) < MAX_PIECES
        && source.pieces[action.player] < MAX_PIECES;
      if (!canReserveProduction) {
        return null;
      }
      return {
        key: `${action.player}:Produce:${action.from}:${action.row}`,
        player: action.player,
        cost: 3,
        priority: action.priority,
        order: action.row,
        label: `${action.from}番生産`
      };
    }

    return null;
  }

  function plannedCostGroups(actions) {
    const groups = new Map();
    actions.forEach((action) => {
      const group = costGroupForValidation(action);
      if (!group) {
        return;
      }
      const existing = groups.get(group.key);
      if (existing) {
        existing.actions.push(action);
        existing.priority = Math.min(existing.priority, action.priority);
        existing.rows.push(action.row);
        existing.cost = Math.min(existing.cost, group.cost);
      } else {
        groups.set(group.key, { ...group, actions: [action], rows: [action.row] });
      }
    });
    return [...groups.values()].sort((left, right) => left.player.localeCompare(right.player)
      || left.priority - right.priority
      || left.order - right.order);
  }

  function formatCostGroup(group) {
    return `${group.label}:${group.cost}`;
  }

  function validatePaymentCapacity(actions) {
    const errors = [];
    PLAYERS.forEach((player) => {
      const playerGroups = plannedCostGroups(actions.filter((action) => action.player === player));
      const totalCost = playerGroups.reduce((sum, group) => sum + group.cost, 0);
      const assets = state.players[player].assets;
      if (totalCost > assets) {
        const detail = playerGroups.filter((group) => group.cost > 0).map(formatCostGroup).join(" / ");
        errors.push(`${player}の支払い予定が資産${assets}を超えています（必要${totalCost}：${detail}）。`);
      }
    });
    return errors;
  }

  function validateCurrentInput() {
    if (!state || state.gameOver) {
      return [];
    }
    const actions = readActionsFromDom({ assignIds: false });
    return [
      ...validateActionCapacity(actions),
      ...validatePaymentCapacity(actions)
    ];
  }

  function refreshValidationMessage() {
    if (!els.validationMessage) {
      return;
    }
    if (state.gameOver) {
      els.validationMessage.textContent = state.result;
      return;
    }
    if (hasPendingCardUse()) {
      const summary = cardUseReservationSummary();
      els.validationMessage.textContent = `カード使用予約中です（${summary.reserved}/${summary.total}）。全員の予約後にコマンド入力へ進みます。`;
      return;
    }
    if (hasPendingCardChoices()) {
      els.validationMessage.textContent = "カード取得予約を完了すると次のターンへ進みます。";
      return;
    }
    const errors = validateCurrentInput();
    els.validationMessage.textContent = errors.join(" ");
  }

  function createAction(player, row, type, from, target, units, priority, source = "human") {
    return {
      id: `${player}-${source}-${state.turn}-${actionSerial++}`,
      player,
      row,
      type,
      from,
      target: target ?? null,
      units: Math.max(1, Math.min(MAX_PIECES, units || 1)),
      priority: Math.max(1, priority || row || 1),
      paid: !requiresPayment(type),
      costKey: null,
      cost: 0,
      failed: false,
      source
    };
  }

  function cloneActionForSimulation(action) {
    return {
      ...action,
      paid: !requiresPayment(action.type),
      costKey: null,
      cost: 0,
      failed: false
    };
  }

  function actionCostEstimate(action) {
    if (action.type === "Explore" && CELLS.includes(action.target)) {
      return effectiveNeutralCost(action.player, action.from, action.target);
    }
    if (action.type === "Exterminate" && CELLS.includes(action.target)) {
      return effectiveInvasionCost(action.player, action.from, action.target);
    }
    if (action.type === "Produce" || action.type === "Fortify") {
      return 3;
    }
    return 0;
  }

  function planCostEstimate(plan, player) {
    const groups = new Map();
    plan.forEach((action) => {
      if (!requiresPayment(action.type)) {
        return;
      }
      let key = `${action.type}:${action.from}:${action.target}:${action.row}`;
      if (action.type === "Explore" || action.type === "Exterminate") {
        key = `${action.type}:${action.target}`;
      }
      if (!groups.has(key)) {
        groups.set(key, actionCostEstimate(action));
      } else {
        groups.set(key, Math.min(groups.get(key), actionCostEstimate(action)));
      }
    });
    return [...groups.values()].reduce((sum, cost) => sum + cost, 0);
  }

  function canAddCandidateToPlan(player, plan, candidate) {
    const totalUnits = plan.reduce((sum, action) => sum + action.units, 0) + candidate.units;
    if (totalUnits > actionLimit(player)) {
      return false;
    }
    const usedFrom = plan
      .filter((action) => action.from === candidate.from)
      .reduce((sum, action) => sum + action.units, 0) + candidate.units;
    if (usedFrom > cell(candidate.from).pieces[player]) {
      return false;
    }
    if (planCostEstimate([...plan, candidate], player) > state.players[player].assets) {
      return false;
    }
    const duplicateProduce = candidate.type === "Produce" && plan.some((action) => action.type === "Produce" && action.from === candidate.from);
    if (duplicateProduce) {
      return false;
    }
    const duplicateFortify = candidate.type === "Fortify" && plan.some((action) => action.type === "Fortify" && action.from === candidate.from);
    return !duplicateFortify;
  }

  function legalActionCandidates(player) {
    const candidates = [];
    const limit = actionLimit(player);
    if (limit <= 0) {
      return candidates;
    }

    CELLS.forEach((from) => {
      const source = cell(from);
      const available = Math.min(source.pieces[player], limit);
      if (available <= 0) {
        return;
      }

      if (canExploit(player, from)) {
        const maxExploitUnits = Math.min(available, Math.max(1, 3 - source.value));
        for (let units = 1; units <= maxExploitUnits; units += 1) {
          candidates.push(createAction(player, 1, "Exploit", from, null, units, 1, "cpu"));
        }
      }
      if (canFortify(player, from)) {
        candidates.push(createAction(player, 1, "Fortify", from, null, 1, 1, "cpu"));
      }
      if (canProduceNow(player, from)) {
        candidates.push(createAction(player, 1, "Produce", from, null, 1, 1, "cpu"));
      }

      CELLS.forEach((target) => {
        if (target === from) {
          return;
        }
        if (canExploreTarget(player, from, target)) {
          const maxUnits = Math.min(available, MAX_PIECES);
          for (let units = 1; units <= maxUnits; units += 1) {
            candidates.push(createAction(player, 1, "Explore", from, target, units, 1, "cpu"));
          }
        }
        if (canExterminateTarget(player, from, target)) {
          const maxUnits = Math.min(available, MAX_PIECES);
          for (let units = 1; units <= maxUnits; units += 1) {
            candidates.push(createAction(player, 1, "Exterminate", from, target, units, 1, "cpu"));
          }
        }
        if (canMoveTarget(player, from, target, 1)) {
          const maxUnits = Math.min(available, MAX_PIECES - cell(target).pieces[player]);
          for (let units = 1; units <= maxUnits; units += 1) {
            if (canMoveTarget(player, from, target, units)) {
              candidates.push(createAction(player, 1, "Move", from, target, units, 1, "cpu"));
            }
          }
        }
      });
    });
    return candidates;
  }

  function lineWouldComplete(player, target) {
    return LINES.some((line) => {
      if (!line.cells.includes(target) || state.players[player].bingoUsed.includes(line.id)) {
        return false;
      }
      return line.cells.every((id) => id === target || cell(id).owner === player)
        && lineConnectedToHomeAssuming(player, line.cells, target);
    });
  }

  function lineConnectedToHomeAssuming(player, lineCells, assumedOwned) {
    const visited = new Set([HOME[player]]);
    const queue = [HOME[player]];
    while (queue.length > 0) {
      const current = queue.shift();
      ADJACENT[current].forEach((next) => {
        const owned = cell(next).owner === player || next === assumedOwned;
        if (!visited.has(next) && owned) {
          visited.add(next);
          queue.push(next);
        }
      });
    }
    return lineCells.some((id) => visited.has(id));
  }

  function enemyAdjacentCount(player, id) {
    const enemy = opponent(player);
    return ADJACENT[id].filter((next) => cell(next).owner === enemy || cell(next).pieces[enemy] > 0).length;
  }

  function distanceToCell(start, target) {
    const queue = [{ id: start, distance: 0 }];
    const visited = new Set([start]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.id === target) {
        return current.distance;
      }
      ADJACENT[current.id].forEach((next) => {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ id: next, distance: current.distance + 1 });
        }
      });
    }
    return 9;
  }

  function applyCpuPersonalityToActionScore(score, action, player) {
    const profile = cpuPersonality(player);
    const multiplier = profile.actionMultiplier?.[action.type] ?? 1;
    const bias = profile.actionBias?.[action.type] ?? 0;
    let adjusted = score * multiplier + bias;
    if ((action.from === 5 || action.target === 5) && profile.centerActionBias) {
      adjusted += profile.centerActionBias;
    }
    if (action.type === "Explore" && action.target && lineWouldComplete(player, action.target)) {
      adjusted += (profile.evalBias?.bingo ?? 0) * 24;
    }
    if (action.type === "Exterminate" && action.target === HOME[opponent(player)]) {
      adjusted += 120;
    }
    if ((action.type === "Fortify" || action.type === "Move") && action.from === HOME[player]) {
      adjusted += (profile.evalBias?.threat ?? 0) * 26;
    }
    return adjusted;
  }

  function isImportantProductionSite(player, id, current) {
    return current.owner === player && (
      id === HOME[player]
      || id === 5
      || current.value >= 3
    );
  }

  function adjacentEnemyOwnedCount(player, id) {
    const enemy = opponent(player);
    return ADJACENT[id].filter((next) => cell(next).owner === enemy).length;
  }

  function adjacentEnemyFortressPressure(player, id) {
    const enemy = opponent(player);
    return ADJACENT[id].filter((next) => {
      const adjacent = cell(next);
      return adjacent.owner === enemy && adjacent.fort && adjacent.pieces[enemy] > 0;
    }).length;
  }

  function fortressActionUtility(player, from) {
    const source = cell(from);
    if (!source || source.owner !== player) {
      return 0;
    }
    const enemy = opponent(player);
    let utility = 0;
    if (from === HOME[player]) utility -= 999;
    if (from === 5) utility += 62;
    if (source.value >= 3) utility += 72;
    if (source.value === 2) utility += 14;
    if (source.value <= 1 && from !== HOME[player] && from !== 5) utility -= 34;

    const adjacentEnemies = ADJACENT[from].filter((id) => cell(id).owner === enemy);
    if (adjacentEnemies.length > 0) utility += 24 + adjacentEnemies.length * 12;
    if (adjacentEnemies.some((id) => id === HOME[enemy])) utility += 48;
    if (adjacentEnemies.some((id) => cell(id).value >= 3)) utility += 30;
    if (enemyAdjacentCount(player, from) > 0) utility += 24;

    if (from !== HOME[player] && from !== 5 && source.value >= 2 && landScore(player) >= 9) {
      utility -= source.value * 14;
    }
    if (source.value < 3 && from !== HOME[player] && from !== 5 && adjacentEnemies.length === 0) {
      utility -= 28;
    }
    return utility;
  }

  function scoreActionHeuristic(action, player) {
    const enemy = opponent(player);
    const source = cell(action.from);
    const target = action.target ? cell(action.target) : null;
    let score = 0;
    if (action.type === "Exterminate" && target) {
      const targetDefense = target.pieces[enemy]
        + (target.fort && target.pieces[enemy] > 0 ? 1 : 0)
        + (activeTrait(enemy, action.target, "CRD-004") && target.pieces[enemy] > 0 ? 1 : 0);
      const sourceAttackBonus = (source.fort ? 1 : 0) + (activeTrait(player, action.from, "CRD-003") ? 1 : 0);
      const attackEstimate = action.units + sourceAttackBonus;
      const targetIsProduction = isImportantProductionSite(enemy, action.target, target);
      score += 36 + target.value * 18 + action.units * 10;
      if (sourceAttackBonus > 0) score += 48;
      if (action.target === HOME[enemy]) score += 1000;
      if (action.target === 5) score += 76;
      if (targetIsProduction) score += 46;
      if (target.value >= 3) score += target.fort ? 38 : 72;
      if (target.pieces[enemy] === 0) score += 45;
      if (attackEstimate > targetDefense) score += 58;
      if (attackEstimate === targetDefense) score += 16;
      if (target.fort) score += 16;
      if (source.fort && target.value >= 2) score += 16;
    }
    if (action.type === "Explore" && target) {
      const exploreCost = effectiveNeutralCost(player, action.from, action.target);
      score += 34 + action.units * 4;
      if (action.target === 5) score += 62 - exploreCost * 14;
      if (lineWouldComplete(player, action.target)) score += 80;
      if (ADJACENT[action.target].includes(5)) score += 14;
      score -= exploreCost * 8;
    }
    if (action.type === "Exploit") {
      const nextValue = Math.min(3, source.value + action.units);
      score += 30 + action.units * 18;
      if (action.from === HOME[player]) score += source.value === 2 ? 42 : 26;
      if (action.from === 5) score += 48;
      if (source.value === 1) score += 24;
      if (source.value === 2) score += 44;
      if (nextValue >= 3) score += 52;
      if (source.value < 3 && nextValue >= 3 && action.from !== HOME[player] && action.from !== 5) score += 36;
      if (enemyAdjacentCount(player, action.from) > 0 && source.value >= 2) score -= 10;
      if (adjacentEnemyFortressPressure(player, action.from) > 0 && source.value >= 2) score -= 12;
    }
    if (action.type === "Produce") {
      score += 72;
      if (totalPieces(player) <= totalPieces(enemy)) score += 26;
      if (action.from === 5) score += 16;
      if (action.from !== HOME[player] && action.from !== 5 && source.value >= 3) score += 28;
      if (source.fort) score += 18;
      if (ADJACENT[action.from].some((id) => cell(id).owner === enemy)) score += 12;
    }
    if (action.type === "Fortify") {
      score += 12 + fortressActionUtility(player, action.from);
      if (source.value >= 3 && source.pieces[player] > 0) score += 26;
      if (action.from === HOME[player]) score -= 999;
      if (action.from === 5) score += 18;
      score -= 34; // 資産3を使い切る重さを明確化
    }
    if (action.type === "Move" && target) {
      score += 6;
      if (target.value >= 2 && target.pieces[player] === 0 && !target.fort) score += 26;
      if (target.value >= 3 && target.pieces[player] === 0) score += 24;
      if (target.fort && target.pieces[player] === 0) score += 16;
      score += Math.max(0, 18 - distanceToCell(action.target, 5) * 6);
      score += Math.max(0, 16 - distanceToCell(action.target, HOME[enemy]) * 5);
      if (source.pieces[player] > 1) score += 6;
    }
    return applyCpuPersonalityToActionScore(score, action, player);
  }

  function enumerateCpuPlans(player, maxPlans = 48) {
    const candidates = legalActionCandidates(player)
      .map((action) => ({ ...action, cpuScore: scoreActionHeuristic(action, player) }))
      .sort((left, right) => right.cpuScore - left.cpuScore)
      .slice(0, 20);
    const plans = [[]];
    const limit = actionLimit(player);

    function search(startIndex, plan) {
      if (plans.length >= maxPlans * 3) {
        return;
      }
      if (plan.reduce((sum, action) => sum + action.units, 0) >= limit) {
        return;
      }
      for (let index = startIndex; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (!canAddCandidateToPlan(player, plan, candidate)) {
          continue;
        }
        const nextPlan = [...plan, candidate];
        plans.push(nextPlan);
        search(index + 1, nextPlan);
      }
    }

    search(0, []);
    return plans
      .filter((plan) => plan.length > 0)
      .map((plan) => plan.slice().sort((left, right) => right.cpuScore - left.cpuScore))
      .sort((left, right) => planHeuristicScore(right, player) - planHeuristicScore(left, player))
      .slice(0, maxPlans);
  }

  function planHeuristicScore(plan, player) {
    return plan.reduce((sum, action) => sum + (action.cpuScore ?? scoreActionHeuristic(action, player)), 0)
      - Math.max(0, planCostEstimate(plan, player) - state.players[player].assets) * 100;
  }

  function generateWeakCpuPlan(player) {
    const plan = [];
    const candidates = legalActionCandidates(player);
    let guard = 0;
    while (guard < 20 && plan.reduce((sum, action) => sum + action.units, 0) < actionLimit(player)) {
      guard += 1;
      const legal = candidates.filter((candidate) => canAddCandidateToPlan(player, plan, candidate));
      if (legal.length === 0 || Math.random() < 0.18) {
        break;
      }
      const movement = legal.filter((action) => action.type === "Move" || action.type === "Explore");
      const pool = movement.length > 0 && Math.random() < 0.65 ? movement : legal;
      const selected = pool[Math.floor(Math.random() * pool.length)];
      plan.push(selected);
    }
    return finalizeCpuPlan(player, plan, "weak");
  }

  function generateNormalCpuPlan(player) {
    const baseState = cloneState(state);
    const playerPlans = enumerateCpuPlans(player, 42);
    if (playerPlans.length === 0) {
      return [];
    }
    const enemy = opponent(player);
    const enemyPlans = enumerateCpuPlans(enemy, 16);
    const opponentSamples = enemyPlans.length > 0 ? enemyPlans.slice(0, 14) : [[]];
    let bestPlan = playerPlans[0];
    let bestScore = -Infinity;

    playerPlans.forEach((plan) => {
      const scores = opponentSamples.map((enemyPlan) => {
        const actions = [
          ...plan.map(cloneActionForSimulation),
          ...enemyPlan.map(cloneActionForSimulation)
        ];
        const simulated = simulateTurnSnapshot(baseState, actions);
        return evaluateSnapshot(simulated, player);
      });
      const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      const worst = Math.min(...scores);
      const best = Math.max(...scores);
      const jitter = (Math.random() * 2 - 1) * (cpuPersonality(player).jitter ?? 4);
      const score = average * 0.62 + worst * 0.32 + best * 0.06 + planHeuristicScore(plan, player) * 0.08 + jitter;
      if (score > bestScore) {
        bestScore = score;
        bestPlan = plan;
      }
    });

    return finalizeCpuPlan(player, bestPlan, "normal");
  }

  function withSnapshot(snapshot, callback) {
    const savedState = state;
    const savedReplay = turnReplayEvents;
    const savedReplayBusy = replayBusy;
    const savedCurrentReplayEvent = currentReplayEvent;
    const savedVisualChanges = lastVisualChanges;
    const savedReplayEvents = lastReplayEvents;
    const savedSerial = actionSerial;
    state = cloneState(snapshot);
    turnReplayEvents = null;
    replayBusy = false;
    currentReplayEvent = null;
    lastVisualChanges = new Map();
    lastReplayEvents = [];
    try {
      return callback();
    } finally {
      state = savedState;
      turnReplayEvents = savedReplay;
      replayBusy = savedReplayBusy;
      currentReplayEvent = savedCurrentReplayEvent;
      lastVisualChanges = savedVisualChanges;
      lastReplayEvents = savedReplayEvents;
      actionSerial = savedSerial;
    }
  }

  function enumerateCpuPlansForSnapshot(snapshot, player, maxPlans) {
    return withSnapshot(snapshot, () => enumerateCpuPlans(player, maxPlans));
  }

  function planHeuristicScoreForSnapshot(snapshot, plan, player) {
    return withSnapshot(snapshot, () => planHeuristicScore(plan, player));
  }

  function aggregateCpuScores(scores, weights) {
    if (!scores.length) {
      return 0;
    }
    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    const worst = Math.min(...scores);
    const best = Math.max(...scores);
    return average * weights.average + worst * weights.worst + best * weights.best;
  }

  function evaluateStrategistContinuation(snapshot, player) {
    if (snapshot.gameOver) {
      return evaluateSnapshot(snapshot, player);
    }
    const enemy = opponent(player);
    const ownPlans = enumerateCpuPlansForSnapshot(snapshot, player, 7);
    if (ownPlans.length === 0) {
      return evaluateSnapshot(snapshot, player);
    }
    const enemyPlans = enumerateCpuPlansForSnapshot(snapshot, enemy, 5);
    const opponentSamples = enemyPlans.length > 0 ? enemyPlans : [[]];
    let bestLine = -Infinity;

    ownPlans.forEach((plan) => {
      const scores = opponentSamples.map((enemyPlan) => {
        const simulated = simulateTurnSnapshot(snapshot, [
          ...plan.map(cloneActionForSimulation),
          ...enemyPlan.map(cloneActionForSimulation)
        ]);
        return evaluateSnapshot(simulated, player);
      });
      const lineScore = aggregateCpuScores(scores, { average: 0.58, worst: 0.36, best: 0.06 })
        + planHeuristicScoreForSnapshot(snapshot, plan, player) * 0.05;
      if (lineScore > bestLine) {
        bestLine = lineScore;
      }
    });
    return bestLine;
  }

  function generateStrategistCpuPlan(player) {
    const baseState = cloneState(state);
    const playerPlans = enumerateCpuPlans(player, 18);
    if (playerPlans.length === 0) {
      return [];
    }
    const enemy = opponent(player);
    const enemyPlans = enumerateCpuPlans(enemy, 8);
    const opponentSamples = enemyPlans.length > 0 ? enemyPlans.slice(0, 6) : [[]];
    let bestPlan = playerPlans[0];
    let bestScore = -Infinity;

    playerPlans.forEach((plan) => {
      const scores = opponentSamples.map((enemyPlan) => {
        const afterFirst = simulateTurnSnapshot(baseState, [
          ...plan.map(cloneActionForSimulation),
          ...enemyPlan.map(cloneActionForSimulation)
        ]);
        const immediate = evaluateSnapshot(afterFirst, player);
        if (afterFirst.gameOver) {
          return immediate;
        }
        const continuation = evaluateStrategistContinuation(afterFirst, player);
        return immediate * 0.32 + continuation * 0.68;
      });
      const jitter = (Math.random() * 2 - 1) * ((cpuPersonality(player).jitter ?? 4) * 0.55);
      const score = aggregateCpuScores(scores, { average: 0.54, worst: 0.4, best: 0.06 })
        + planHeuristicScore(plan, player) * 0.07
        + jitter;
      if (score > bestScore) {
        bestScore = score;
        bestPlan = plan;
      }
    });

    return finalizeCpuPlan(player, bestPlan, "strategist");
  }

  function finalizeCpuPlan(player, plan, source) {
    const limited = [];
    let usedUnits = 0;
    plan.forEach((action) => {
      if (usedUnits + action.units > actionLimit(player)) {
        return;
      }
      usedUnits += action.units;
      limited.push(action);
    });
    return limited.slice(0, 3).map((action, index) => createAction(
      player,
      index + 1,
      action.type,
      action.from,
      action.target,
      action.units,
      index + 1,
      source
    ));
  }

  function simulateTurnSnapshot(baseState, actions) {
    const savedState = state;
    const savedReplay = turnReplayEvents;
    const savedReplayBusy = replayBusy;
    const savedCurrentReplayEvent = currentReplayEvent;
    const savedVisualChanges = lastVisualChanges;
    const savedReplayEvents = lastReplayEvents;
    const savedSerial = actionSerial;
    simulationDepth += 1;
    state = cloneState(baseState);
    turnReplayEvents = null;
    replayBusy = false;
    currentReplayEvent = null;
    lastVisualChanges = new Map();
    lastReplayEvents = [];

    try {
      const simActions = actions.map(cloneActionForSimulation);
      const messages = [];
      payActionCosts(simActions, messages);
      const battleCells = new Set();
      resolveMoves(simActions, messages);
      resolveExplores(simActions, messages);
      resolveExterminates(simActions, messages, battleCells);
      resolveDomesticActions(simActions, messages, battleCells);
      resolveBingo(messages);

      const result = checkVictory();
      if (result.gameOver) {
        state.gameOver = true;
        state.winner = result.winner;
        state.result = result.message;
      }
      if (!state.gameOver) {
        if (state.turn >= MAX_TURN) {
          const final = finalJudgement("10ターン終了");
          state.gameOver = true;
          state.winner = final.winner;
          state.result = final.message;
        } else {
          state.turn += 1;
          startTurn(messages);
        }
      }
      return cloneState(state);
    } finally {
      simulationDepth = Math.max(0, simulationDepth - 1);
      state = savedState;
      turnReplayEvents = savedReplay;
      replayBusy = savedReplayBusy;
      currentReplayEvent = savedCurrentReplayEvent;
      lastVisualChanges = savedVisualChanges;
      lastReplayEvents = savedReplayEvents;
      actionSerial = savedSerial;
    }
  }

  function snapshotTotalPieces(snapshot, player) {
    return CELLS.reduce((sum, id) => sum + snapshot.cells[id].pieces[player], 0);
  }

  function snapshotLandScore(snapshot, player) {
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      return current.owner === player && !current.fort ? sum + current.value : sum;
    }, 0);
  }

  function snapshotIncomePotential(snapshot, player) {
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player || current.fort || current.pieces[player] <= 0) {
        return sum;
      }
      if (id === HOME[player]) {
        return sum + (current.value === 3 ? 3 : current.value === 2 ? 1 : 0);
      }
      if (id === 5) {
        return sum + (current.value >= 2 ? 2 : 0);
      }
      return sum + (current.value >= 2 ? 1 : 0);
    }, 0);
  }


  function snapshotProductionPotential(snapshot, player) {
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player || current.pieces[player] <= 0) {
        return sum;
      }
      if (id === HOME[player]) {
        return sum + (current.fort ? 1.65 : 1.45);
      }
      if (id === 5) {
        return sum + (current.fort ? 1.75 : 1.35);
      }
      if (current.value >= 3) {
        return sum + (current.fort ? 1.5 : 1.15);
      }
      return sum;
    }, 0);
  }

  function snapshotThreePointCityValue(snapshot, player) {
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player || current.value < 3) {
        return sum;
      }
      let value = 1;
      if (!current.fort) value += 0.7;
      if (current.pieces[player] > 0) value += 0.9;
      if (id === 5) value += 0.6;
      if (id === HOME[player]) value += 0.5;
      return sum + value;
    }, 0);
  }

  function snapshotFortressValue(snapshot, player) {
    const enemy = opponent(player);
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player || !current.fort) {
        return sum;
      }
      let value = 1.2 + current.value * 0.42;
      if (current.pieces[player] > 0) value += 0.9;
      if (id === HOME[player]) value -= 1.2;
      if (id === 5) value += 1.35;
      if (current.value >= 3) value += 1.35;
      if (id !== HOME[player] && id !== 5 && current.value <= 1) value -= 0.7;
      const adjacentEnemyLand = ADJACENT[id].filter((next) => snapshot.cells[next].owner === enemy);
      value += adjacentEnemyLand.length * 0.42;
      if (adjacentEnemyLand.some((next) => next === HOME[enemy])) value += 1.1;
      if (adjacentEnemyLand.some((next) => snapshot.cells[next].value >= 3)) value += 0.8;
      return sum + value;
    }, 0);
  }

  function snapshotFortressPressure(snapshot, player) {
    const enemy = opponent(player);
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player || !current.fort || current.pieces[player] <= 0) {
        return sum;
      }
      return sum + ADJACENT[id].reduce((inner, next) => {
        const target = snapshot.cells[next];
        if (target.owner !== enemy) {
          return inner;
        }
        let pressure = 0.7 + target.value * 0.28;
        if (next === HOME[enemy]) pressure += 3.2;
        if (next === 5) pressure += 1.4;
        if (target.value >= 3) pressure += 1.8;
        if (target.fort) pressure += 0.6;
        return inner + pressure;
      }, 0);
    }, 0);
  }

  function snapshotImportantRiskFromEnemyFortress(snapshot, player) {
    const enemy = opponent(player);
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player) {
        return sum;
      }
      const adjacentEnemyFortresses = ADJACENT[id].filter((next) => {
        const adjacent = snapshot.cells[next];
        return adjacent.owner === enemy && adjacent.fort && adjacent.pieces[enemy] > 0;
      }).length;
      if (adjacentEnemyFortresses <= 0) {
        return sum;
      }
      let importance = current.value * 0.8;
      if (id === HOME[player]) importance += 3.2;
      if (id === 5) importance += 1.8;
      if (current.value >= 3) importance += 2.2;
      if (current.pieces[player] > 0) importance += 0.6;
      return sum + adjacentEnemyFortresses * importance;
    }, 0);
  }

  function snapshotThreatPenalty(snapshot, player) {
    const enemy = opponent(player);
    return CELLS.reduce((sum, id) => {
      const current = snapshot.cells[id];
      if (current.owner !== player) {
        return sum;
      }
      const adjacentEnemyPieces = ADJACENT[id].reduce((count, next) => count + snapshot.cells[next].pieces[enemy], 0);
      if (adjacentEnemyPieces <= 0) {
        return sum;
      }
      const valueWeight = id === HOME[player] ? 30 : id === 5 ? 18 : current.value * 6;
      return sum + adjacentEnemyPieces * valueWeight;
    }, 0);
  }

  function snapshotBingoPotential(snapshot, player) {
    return LINES.reduce((sum, line) => {
      const owned = line.cells.filter((id) => snapshot.cells[id].owner === player).length;
      if (owned === 3) return sum + 18;
      if (owned === 2) return sum + 8;
      return sum;
    }, 0);
  }

  function applyCpuPersonalityToSnapshotScore(score, snapshot, player) {
    const enemy = opponent(player);
    const profile = cpuPersonality(player, snapshot);
    const bias = profile.evalBias || {};
    const ownScore = snapshotLandScore(snapshot, player);
    const enemyScore = snapshotLandScore(snapshot, enemy);
    const ownPieces = snapshotTotalPieces(snapshot, player);
    const enemyPieces = snapshotTotalPieces(snapshot, enemy);
    const ownHome = snapshot.cells[HOME[player]];
    const enemyHome = snapshot.cells[HOME[enemy]];
    const incomeDiff = snapshotIncomePotential(snapshot, player) - snapshotIncomePotential(snapshot, enemy);
    const assetsDiff = snapshot.players[player].assets - snapshot.players[enemy].assets;
    const centerDiff = snapshot.cells[5].owner === player ? 1 : snapshot.cells[5].owner === enemy ? -1 : 0;
    const threatOwn = snapshotThreatPenalty(snapshot, player);
    const threatEnemy = snapshotThreatPenalty(snapshot, enemy);
    const bingoDiff = snapshotBingoPotential(snapshot, player) - snapshotBingoPotential(snapshot, enemy);
    const productionDiff = snapshotProductionPotential(snapshot, player) - snapshotProductionPotential(snapshot, enemy);
    const cityDiff = snapshotThreePointCityValue(snapshot, player) - snapshotThreePointCityValue(snapshot, enemy);
    const fortressDiff = snapshotFortressValue(snapshot, player) - snapshotFortressValue(snapshot, enemy);
    const fortressPressureDiff = snapshotFortressPressure(snapshot, player) - snapshotFortressPressure(snapshot, enemy);
    const importantRiskDiff = snapshotImportantRiskFromEnemyFortress(snapshot, player) - snapshotImportantRiskFromEnemyFortress(snapshot, enemy);
    return score
      + (ownScore - enemyScore) * 10 * (bias.land ?? 0)
      + (ownPieces - enemyPieces) * 24 * (bias.pieces ?? 0)
      + assetsDiff * 10 * (bias.assets ?? 0)
      + (ownHome.value - enemyHome.value) * 22 * (bias.home ?? 0)
      + incomeDiff * 18 * (bias.income ?? 0)
      + productionDiff * 22 * (bias.production ?? 0)
      + cityDiff * 26 * (bias.city ?? 0)
      - cityDiff * 18 * (bias.enemyCity ?? 0)
      + fortressDiff * 24 * (bias.fortress ?? 0)
      + fortressPressureDiff * 22 * (bias.fortressPressure ?? 0)
      + centerDiff * 44 * (bias.center ?? 0)
      + bingoDiff * 1.4 * (bias.bingo ?? 0)
      - threatOwn * 0.45 * Math.max(0, bias.threat ?? 0)
      + threatOwn * 0.18 * Math.min(0, bias.threat ?? 0)
      + threatEnemy * 0.28 * (bias.enemyThreat ?? 0)
      - importantRiskDiff * 18 * (bias.importantRisk ?? 0);
  }

  function evaluateSnapshot(snapshot, player) {
    const enemy = opponent(player);
    if (snapshot.gameOver) {
      if (snapshot.winner === player) return 100000;
      if (snapshot.winner === enemy) return -100000;
      return 0;
    }
    const ownHome = snapshot.cells[HOME[player]];
    const enemyHome = snapshot.cells[HOME[enemy]];
    const ownScore = snapshotLandScore(snapshot, player);
    const enemyScore = snapshotLandScore(snapshot, enemy);
    const ownPieces = snapshotTotalPieces(snapshot, player);
    const enemyPieces = snapshotTotalPieces(snapshot, enemy);
    let score = 0;
    score += (ownScore - enemyScore) * 14;
    score += (ownPieces - enemyPieces) * 34;
    score += (snapshot.players[player].assets - snapshot.players[enemy].assets) * 6;
    score += (ownHome.value - enemyHome.value) * 18;
    score += (snapshotIncomePotential(snapshot, player) - snapshotIncomePotential(snapshot, enemy)) * 16;
    score += (snapshotProductionPotential(snapshot, player) - snapshotProductionPotential(snapshot, enemy)) * 18;
    score += (snapshotThreePointCityValue(snapshot, player) - snapshotThreePointCityValue(snapshot, enemy)) * 16;
    score += (snapshotFortressValue(snapshot, player) - snapshotFortressValue(snapshot, enemy)) * 11;
    score += (snapshotFortressPressure(snapshot, player) - snapshotFortressPressure(snapshot, enemy)) * 9;
    score -= snapshotImportantRiskFromEnemyFortress(snapshot, player) * 8;
    score += snapshotImportantRiskFromEnemyFortress(snapshot, enemy) * 5;
    score += snapshot.cells[5].owner === player ? 42 : 0;
    score -= snapshot.cells[5].owner === enemy ? 42 : 0;
    score += snapshotBingoPotential(snapshot, player) - snapshotBingoPotential(snapshot, enemy);
    score -= snapshotThreatPenalty(snapshot, player) * 0.35;
    score += snapshotThreatPenalty(snapshot, enemy) * 0.22;
    if (ownScore >= 9) score += (ownScore - 8) * 18;
    if (enemyScore >= 9) score -= (enemyScore - 8) * 22;
    return applyCpuPersonalityToSnapshotScore(score, snapshot, player);
  }

  function generateCpuActions(player) {
    if (controlModes[player] === "weak") {
      return generateWeakCpuPlan(player);
    }
    if (controlModes[player] === "normal") {
      return generateNormalCpuPlan(player);
    }
    if (controlModes[player] === "strategist") {
      return generateStrategistCpuPlan(player);
    }
    return [];
  }

  function formatActionForLog(action) {
    const target = action.target ? `→${action.target}` : "";
    return `${action.from}${target} ${ACTION_LABELS[action.type]} x${action.units}`;
  }

  function advanceToNextTurn(messages) {
    if (state.turn >= MAX_TURN) {
      const final = finalJudgement("10ターン終了");
      state.gameOver = true;
      state.winner = final.winner;
      state.result = final.message;
      state.cardChoices = [];
      state.awaitingCardChoices = false;
      messages.push(final.message);
      return;
    }
    state.turn += 1;
    startTurn(messages);
  }

  function finishCardChoicePhase(messages) {
    if (!hasPendingCardChoices() || !state.awaitingCardChoices || state.gameOver || !allCardChoicesReserved()) {
      return false;
    }
    commitReservedCardChoices(messages);
    state.awaitingCardChoices = false;
    advanceToNextTurn(messages);
    return true;
  }

  function resolveTurn() {
    if (state.gameOver) {
      return;
    }
    if (hasPendingCardUse()) {
      els.validationMessage.textContent = "カード使用予約を完了するとコマンド入力に進みます。";
      return;
    }
    if (hasPendingCardChoices()) {
      els.validationMessage.textContent = "カード取得予約を完了すると次のターンへ進みます。";
      return;
    }

    const actions = readActions();
    const cpuMessages = [];
    PLAYERS.forEach((player) => {
      if (!isCpuPlayer(player)) {
        return;
      }
      const cpuActions = generateCpuActions(player);
      actions.push(...cpuActions);
      const label = CONTROL_MODES[controlModes[player]];
      const personalityLabel = cpuPersonalityLabel(player);
      cpuMessages.push(cpuActions.length > 0
        ? `${player} ${label}（${personalityLabel}）: ${cpuActions.map(formatActionForLog).join(" / ")}`
        : `${player} ${label}（${personalityLabel}）: 行動なし`);
    });

    const validationErrors = [
      ...validateActionCapacity(actions),
      ...validatePaymentCapacity(actions)
    ];
    if (validationErrors.length > 0) {
      els.validationMessage.textContent = validationErrors.join(" ");
      return;
    }

    stopReplay({ renderBoardOnly: true });
    const beforeState = cloneState(state);
    history.push(cloneState(state));
    if (history.length > 40) {
      history = history.slice(-40);
    }

    turnReplayEvents = [];
    const messages = [`ターン${state.turn}解決開始。`, ...cpuMessages];
    payActionCosts(actions, messages);

    const battleCells = new Set();
    resolveMoves(actions, messages);
    resolveExplores(actions, messages);
    resolveExterminates(actions, messages, battleCells);
    resolveDomesticActions(actions, messages, battleCells);
    resolveBingo(messages);

    const result = checkVictory();
    if (result.gameOver) {
      state.gameOver = true;
      state.winner = result.winner;
      state.result = result.message;
      state.cardChoices = [];
      state.awaitingCardChoices = false;
      messages.push(result.message);
    }

    if (!state.gameOver) {
      if (state.turn >= MAX_TURN) {
        advanceToNextTurn(messages);
      } else {
        autoResolveCpuCardChoices(messages);
        if (hasPendingCardChoices()) {
          state.awaitingCardChoices = true;
          if (!finishCardChoicePhase(messages)) {
            messages.push("カード取得予約待ち。全員の予約後、同時確定して次ターン開始処理に進みます。");
          }
        } else {
          advanceToNextTurn(messages);
        }
      }
    }

    const generatedReplay = turnReplayEvents || [];
    turnReplayEvents = null;
    lastVisualChanges = buildVisualChanges(beforeState, state);
    lastReplayEvents = generatedReplay;

    pushLog(messages);
    render();
    window.setTimeout(() => playReplay(generatedReplay), 120);
  }

  function payActionCosts(actions, messages) {
    const groups = new Map();
    actions.forEach((action) => {
      if (!requiresPayment(action.type)) {
        return;
      }

      const group = makeCostGroup(action, messages);
      if (!group) {
        action.failed = true;
        return;
      }

      const existing = groups.get(group.key);
      if (existing) {
        existing.actions.push(action);
        existing.priority = Math.min(existing.priority, action.priority);
        existing.cost = Math.min(existing.cost, group.cost);
      } else {
        group.actions = [action];
        groups.set(group.key, group);
      }
      action.costKey = group.key;
      action.cost = group.cost;
    });

    [...groups.values()]
      .sort((left, right) => left.priority - right.priority || left.order - right.order)
      .forEach((group) => {
        const playerState = state.players[group.player];
        if (playerState.assets >= group.cost) {
          playerState.assets -= group.cost;
          group.actions.forEach((action) => {
            action.paid = true;
          });
          if (group.cost > 0) {
            messages.push(`${group.player}は${group.label}に${group.cost}資産を支払った。`);
          }
        } else {
          group.actions.forEach((action) => {
            action.failed = true;
            action.paid = false;
          });
          messages.push(`${group.player}は${group.label}の支払い不可。`);
        }
      });
  }

  function makeCostGroup(action, messages) {
    const source = cell(action.from);
    const target = action.target ? cell(action.target) : null;
    if (!source || source.pieces[action.player] < action.units) {
      messages.push(`${actionName(action)}は起点の駒不足で失敗。`);
      return null;
    }

    if (action.type === "Explore") {
      if (!target || !isAdjacent(action.from, action.target) || target.owner !== null) {
        messages.push(`${actionName(action)}は探索条件を満たさない。`);
        return null;
      }
      return {
        key: `${action.player}:Explore:${action.target}`,
        player: action.player,
        cost: effectiveNeutralCost(action.player, action.from, action.target),
        priority: action.priority,
        order: action.row,
        label: `${action.target}番探索`
      };
    }

    if (action.type === "Exterminate") {
      if (!target || !isAdjacent(action.from, action.target) || target.owner !== opponent(action.player)) {
        messages.push(`${actionName(action)}は侵攻条件を満たさない。`);
        return null;
      }
      return {
        key: `${action.player}:Exterminate:${action.target}`,
        player: action.player,
        cost: effectiveInvasionCost(action.player, action.from, action.target),
        priority: action.priority,
        order: action.row,
        label: `${action.target}番侵攻`
      };
    }

    if (action.type === "Fortify") {
      if (action.from === HOME[action.player] || source.owner !== action.player || source.fort || source.value < 1) {
        messages.push(`${actionName(action)}は要塞化条件を満たさない。`);
        return null;
      }
      return {
        key: `${action.player}:Fortify:${action.from}:${action.row}`,
        player: action.player,
        cost: 3,
        priority: action.priority,
        order: action.row,
        label: `${action.from}番要塞化`
      };
    }

    if (action.type === "Produce") {
      const canPayForProduction = isProductionSite(action.player, action.from)
        && source.pieces[action.player] > 0
        && totalPieces(action.player) < MAX_PIECES
        && source.pieces[action.player] < MAX_PIECES;
      if (!canPayForProduction) {
        messages.push(`${actionName(action)}は生産条件を満たさない。生産は本拠地・中央・3P都市でのみ可能です。`);
        return null;
      }
      return {
        key: `${action.player}:Produce:${action.from}:${action.row}`,
        player: action.player,
        cost: 3,
        priority: action.priority,
        order: action.row,
        label: `${action.from}番生産`
      };
    }

    return null;
  }

  function invasionCost(target) {
    return Math.max(1, target.value);
  }

  function effectiveNeutralCost(player, from, target) {
    const targetCell = cell(target);
    if (!targetCell || targetCell.owner !== null) {
      return 0;
    }
    let cost = targetCell.neutralCost;
    if (activeTrait(player, from, "CRD-001")) {
      cost -= 1;
    }
    if (target === 5 && activeTraitCells(player, "CRD-007").length > 0) {
      cost -= 1;
    }
    (state.turnModifiers?.neutralDiscounts || []).forEach((modifier) => {
      if (modifier.player === player && modifier.from === from) {
        cost -= modifier.amount || 0;
      }
    });
    return Math.max(0, cost);
  }

  function effectiveInvasionCost(player, from, target) {
    const targetCell = cell(target);
    if (!targetCell || targetCell.owner !== opponent(player)) {
      return 1;
    }
    let cost = invasionCost(targetCell);
    if (activeTrait(player, from, "CRD-012")) {
      cost -= 1;
    }
    if (target === 5 && activeTraitCells(player, "CRD-007").length > 0) {
      cost -= 1;
    }
    (state.turnModifiers?.invasionDiscounts || []).forEach((modifier) => {
      if (modifier.player === player && modifier.target === target) {
        cost -= modifier.amount || 0;
      }
    });
    return Math.max(1, cost);
  }

  function activeActions(actions, type) {
    return actions.filter((action) => action.type === type && !action.failed && action.paid);
  }

  function resolveMoves(actions, messages) {
    activeActions(actions, "Move").forEach((action) => {
      const source = cell(action.from);
      const target = cell(action.target);
      if (!source || !target || source.pieces[action.player] < action.units) {
        messages.push(`${actionName(action)}は駒不足で失敗。`);
        return;
      }
      if (source.owner !== action.player || target.owner !== action.player) {
        messages.push(`${actionName(action)}は自国支配地間ではないため失敗。`);
        return;
      }
      if (!validMovePath(action.player, action.from, action.target)) {
        messages.push(`${actionName(action)}は移動経路が不正で失敗。`);
        return;
      }
      if (target.pieces[action.player] + action.units > MAX_PIECES) {
        messages.push(`${actionName(action)}は移動先の駒上限で失敗。`);
        return;
      }
      source.pieces[action.player] -= action.units;
      target.pieces[action.player] += action.units;
      messages.push(`${action.player}は${action.units}駒を${action.from}番から${action.target}番へ移動。`);
      addReplayEvent({
        kind: "move",
        player: action.player,
        label: `${action.player}: ${action.from}→${action.target} 移動`,
        sources: [action.from],
        targets: [action.target],
        cells: [action.from, action.target],
        arrows: [{ from: action.from, to: action.target, player: action.player, kind: "move" }]
      });
    });
  }

  function validMovePath(player, from, target) {
    if (from === target) {
      return false;
    }
    const maxDistance = (state.turn <= 2 ? 1 : 2) + (activeTrait(player, from, "CRD-011") ? 1 : 0);
    if (state.turn <= 2) {
      return maxDistance <= 1 ? isAdjacent(from, target) : pathWithinDistance(player, from, target, maxDistance);
    }

    return pathWithinDistance(player, from, target, maxDistance);
  }

  function pathWithinDistance(player, from, target, maxDistance) {
    const queue = [{ id: from, distance: 0 }];
    const visited = new Set([from]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.id === target && current.distance <= maxDistance) {
        return true;
      }
      if (current.distance >= maxDistance) {
        continue;
      }
      ADJACENT[current.id].forEach((next) => {
        if (!visited.has(next) && cell(next).owner === player) {
          visited.add(next);
          queue.push({ id: next, distance: current.distance + 1 });
        }
      });
    }
    return false;
  }

  function resolveExplores(actions, messages) {
    const reserves = reserveActions(activeActions(actions, "Explore"), (action) => {
      const target = cell(action.target);
      return target
        && target.owner === null
        && isAdjacent(action.from, action.target);
    }, messages);

    const byTarget = groupBy(reserves, (entry) => entry.target);
    byTarget.forEach((entries, targetId) => {
      const target = cell(Number(targetId));
      const countA = sumUnits(entries.filter((entry) => entry.player === "A"));
      const countB = sumUnits(entries.filter((entry) => entry.player === "B"));
      if (countA > 0 && countB > 0 && countA === countB) {
        target.neutralCost = Math.min(3, target.neutralCost + 1);
        messages.push(`${targetId}番探索は同数衝突。中立コストは${target.neutralCost}。`);
        addReplayEvent({
          kind: "explore-conflict",
          label: `${targetId}番 探索衝突`,
          cells: [Number(targetId), ...entries.map((entry) => entry.from)],
          sources: entries.map((entry) => entry.from),
          targets: [Number(targetId)],
          arrows: arrowsFromEntries(entries, "explore")
        });
        return;
      }

      const winner = countA > countB ? "A" : "B";
      const winningEntries = entries.filter((entry) => entry.player === winner);
      moveReservedPieces(winningEntries, Number(targetId), winner);
      target.owner = winner;
      target.value = 1;
      target.fort = false;
      target.neutralCost = 0;
      target.traitCardId = null;
      target.traitAssignedBy = null;
      messages.push(`${winner}が${targetId}番探索に成功。${sumUnits(winningEntries)}駒が進入。`);
      registerLandAcquisition(winner, Number(targetId), messages);
      addReplayEvent({
        kind: "explore",
        player: winner,
        label: `${winner}: ${targetId}番 探索成功`,
        effect: Number(targetId) === 5 ? "center" : "",
        effectTitle: Number(targetId) === 5 ? "CENTER!" : "",
        effectDetail: Number(targetId) === 5 ? `${winner} 中央制圧` : "",
        cells: [Number(targetId), ...winningEntries.map((entry) => entry.from)],
        sources: winningEntries.map((entry) => entry.from),
        targets: [Number(targetId)],
        arrows: arrowsFromEntries(winningEntries, "explore"),
        duration: Number(targetId) === 5 ? 1400 : undefined
      });
    });
  }

  function reserveActions(actions, predicate, messages) {
    const available = {};
    PLAYERS.forEach((player) => {
      available[player] = {};
      CELLS.forEach((id) => {
        available[player][id] = cell(id).pieces[player];
      });
    });

    const reserves = [];
    actions.forEach((action) => {
      if (!predicate(action)) {
        messages.push(`${actionName(action)}は解決時条件を満たさず失敗。`);
        return;
      }
      if (available[action.player][action.from] < action.units) {
        messages.push(`${actionName(action)}は解決時の駒不足で失敗。`);
        return;
      }
      available[action.player][action.from] -= action.units;
      reserves.push({
        player: action.player,
        from: action.from,
        target: action.target,
        units: action.units,
        action
      });
    });
    return reserves;
  }

  function moveReservedPieces(entries, targetId, player) {
    entries.forEach((entry) => {
      cell(entry.from).pieces[player] -= entry.units;
      cell(targetId).pieces[player] += entry.units;
    });
    cell(targetId).pieces[player] = Math.min(MAX_PIECES, cell(targetId).pieces[player]);
  }

  function sumUnits(entries) {
    return entries.reduce((sum, entry) => sum + entry.units, 0);
  }

  function fortressAttackBonus(entries) {
    const fortBonus = entries.some((entry) => cell(entry.from)?.fort) ? 1 : 0;
    const stableBonus = entries.some((entry) => activeTrait(entry.player, entry.from, "CRD-003")) ? 1 : 0;
    return fortBonus + stableBonus;
  }

  function attackStrength(entries) {
    return sumUnits(entries) + fortressAttackBonus(entries);
  }

  function fortressAttackText(bonus) {
    return bonus > 0 ? `攻撃補正+${bonus}、` : "";
  }

  function compareCombatEntries(left, right) {
    return (left.action.priority || 99) - (right.action.priority || 99)
      || (left.action.row || 99) - (right.action.row || 99)
      || String(left.action.id).localeCompare(String(right.action.id));
  }

  function firstAttackActionIdsByPlayer(reserves) {
    const result = {};
    PLAYERS.forEach((player) => {
      const first = reserves
        .filter((entry) => entry.player === player)
        .sort(compareCombatEntries)[0];
      if (first) {
        result[player] = first.action.id;
      }
    });
    return result;
  }

  function firstCombatSlotsByPlayer(reserves) {
    const result = {};
    PLAYERS.forEach((player) => {
      const attack = reserves
        .filter((entry) => entry.player === player)
        .sort(compareCombatEntries)[0];
      const defense = reserves
        .filter((entry) => entry.player === opponent(player) && cell(entry.target)?.owner === player)
        .sort(compareCombatEntries)[0];
      if (!attack && !defense) {
        return;
      }
      if (!defense || (attack && compareCombatEntries(attack, defense) <= 0)) {
        result[player] = { mode: "attack", actionId: attack.action.id };
      } else {
        result[player] = { mode: "defense", actionId: defense.action.id, target: defense.target };
      }
    });
    return result;
  }

  function turnAttackBonus(entries, firstAttackIds, firstCombatSlots) {
    const player = entries[0]?.player;
    if (!player) {
      return 0;
    }
    let bonus = 0;
    if (firstAttackIds[player] && entries.some((entry) => entry.action.id === firstAttackIds[player])) {
      bonus += state.turnModifiers?.firstInvasionAttackBonus?.[player] || 0;
    }
    const combatSlot = firstCombatSlots[player];
    if (combatSlot?.mode === "attack" && entries.some((entry) => entry.action.id === combatSlot.actionId)) {
      bonus += state.turnModifiers?.firstCombatBonus?.[player] || 0;
    }
    return bonus;
  }

  function turnDefenseBonus(defender, targetId, entries, firstCombatSlots) {
    const combatSlot = firstCombatSlots[defender];
    if (combatSlot?.mode !== "defense" || Number(combatSlot.target) !== Number(targetId)) {
      return 0;
    }
    return entries.some((entry) => entry.action.id === combatSlot.actionId)
      ? state.turnModifiers?.firstCombatBonus?.[defender] || 0
      : 0;
  }

  function defenseBonusText(bonus) {
    return bonus > 0 ? `防衛補正+${bonus}、` : "";
  }

  function groupBy(items, keyFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return map;
  }

  function resolveExterminates(actions, messages, battleCells) {
    const reserves = reserveActions(activeActions(actions, "Exterminate"), (action) => {
      const target = cell(action.target);
      return target
        && target.owner === opponent(action.player)
        && isAdjacent(action.from, action.target);
    }, messages);

    if (reserves.length === 0) {
      return;
    }

    const firstAttackIds = firstAttackActionIdsByPlayer(reserves);
    const firstCombatSlots = firstCombatSlotsByPlayer(reserves);

    reserves.forEach((entry) => {
      cell(entry.from).pieces[entry.player] -= entry.units;
    });

    const consumed = new Set();
    resolveFrontCollisions(reserves, consumed, messages, battleCells, firstAttackIds, firstCombatSlots);

    const normalEntries = reserves.filter((entry, index) => !consumed.has(index));
    const byTarget = groupBy(normalEntries, (entry) => entry.target);
    byTarget.forEach((entries, targetId) => {
      const attacker = entries[0].player;
      const target = cell(Number(targetId));
      if (target.owner !== opponent(attacker)) {
        messages.push(`${targetId}番への侵攻は対象所有者が変わり失敗。攻撃駒は失われた。`);
        return;
      }
      battleCells.add(Number(targetId));
      addReplayEvent({
        kind: "attack",
        player: attacker,
        label: `${attacker}: ${targetId}番へ侵攻`,
        effect: "battle",
        effectTitle: "BATTLE!",
        effectDetail: `${attacker} 侵攻 ${targetId}番`,
        cells: [Number(targetId), ...entries.map((entry) => entry.from)],
        sources: entries.map((entry) => entry.from),
        targets: [Number(targetId)],
        arrows: arrowsFromEntries(entries, "attack"),
        duration: 1250
      });

      const defender = target.owner;
      const attackUnits = sumUnits(entries);
      const attackBonus = fortressAttackBonus(entries) + turnAttackBonus(entries, firstAttackIds, firstCombatSlots);
      const attackerStrength = attackUnits + attackBonus;
      const defenderUnits = target.pieces[defender];
      const directions = new Set(entries.map((entry) => entry.from)).size;
      const siege = directions >= 2;
      let defenseStrength = defenderUnits;
      if (siege) {
        defenseStrength = Math.max(0, defenseStrength - 1);
      }
      if (target.fort && defenderUnits > 0) {
        defenseStrength += 1;
      }
      if (activeTrait(defender, Number(targetId), "CRD-004") && defenderUnits > 0) {
        defenseStrength += 1;
      }
      const cardDefenseBonus = turnDefenseBonus(defender, Number(targetId), entries, firstCombatSlots);
      defenseStrength += cardDefenseBonus;

      if (defenderUnits === 0) {
        captureTarget(target, attacker, attackUnits, messages, `${attacker}が${targetId}番を無血占領。`);
        return;
      }

      const siegeText = siege ? "包囲攻撃、" : "";
      const fortText = fortressAttackText(attackBonus);
      const defenseText = defenseBonusText(cardDefenseBonus);
      if (attackerStrength > defenseStrength) {
        const survivors = Math.max(1, Math.min(attackUnits, attackerStrength - defenseStrength));
        captureTarget(
          target,
          attacker,
          survivors,
          messages,
          `${attacker}が${targetId}番で${siegeText}${fortText}${defenseText}戦闘勝利。${survivors}駒が残存。`
        );
      } else if (attackerStrength < defenseStrength) {
        applyInvasionDamage(target);
        const defenderLoss = Math.min(defenderUnits, attackerStrength);
        let survivors = defenderUnits - defenderLoss;
        if (survivors <= 0 && defenderUnits > 0) {
          survivors = 1;
        }
        target.pieces[defender] = Math.min(MAX_PIECES, survivors);
        messages.push(`${defender}が${targetId}番で${siegeText}${fortText}${defenseText}防衛成功。${target.pieces[defender]}駒が残存。`);
      } else {
        applyInvasionDamage(target);
        target.pieces[defender] = 0;
        messages.push(`${targetId}番の戦闘は${siegeText}${fortText}${defenseText}相打ち。土地所有者は${defender}のまま。`);
      }
    });
  }

  function resolveFrontCollisions(reserves, consumed, messages, battleCells, firstAttackIds, firstCombatSlots) {
    reserves.forEach((entry, index) => {
      if (consumed.has(index)) {
        return;
      }
      const pairIndexes = [];
      reserves.forEach((candidate, candidateIndex) => {
        if (consumed.has(candidateIndex)) {
          return;
        }
        const sameDirection = candidate.player === entry.player
          && candidate.from === entry.from
          && candidate.target === entry.target;
        const oppositeDirection = candidate.player !== entry.player
          && candidate.from === entry.target
          && candidate.target === entry.from;
        if (sameDirection || oppositeDirection) {
          pairIndexes.push(candidateIndex);
        }
      });

      const hasOpposition = pairIndexes.some((candidateIndex) => {
        const candidate = reserves[candidateIndex];
        return candidate.player !== entry.player;
      });
      if (!hasOpposition) {
        return;
      }

      const sideA = reserves.filter((candidate, candidateIndex) => pairIndexes.includes(candidateIndex) && candidate.player === entry.player);
      const sideB = reserves.filter((candidate, candidateIndex) => pairIndexes.includes(candidateIndex) && candidate.player !== entry.player);
      const unitsA = sumUnits(sideA);
      const unitsB = sumUnits(sideB);
      const bonusA = fortressAttackBonus(sideA) + turnAttackBonus(sideA, firstAttackIds, firstCombatSlots);
      const bonusB = fortressAttackBonus(sideB) + turnAttackBonus(sideB, firstAttackIds, firstCombatSlots);
      const strengthA = unitsA + bonusA;
      const strengthB = unitsB + bonusB;
      pairIndexes.forEach((candidateIndex) => consumed.add(candidateIndex));
      battleCells.add(entry.from);
      battleCells.add(entry.target);
      addReplayEvent({
        kind: "front-collision",
        label: `${entry.from}-${entry.target} 正面衝突`,
        effect: "battle",
        effectTitle: "CLASH!",
        effectDetail: `${entry.from}-${entry.target} 正面衝突`,
        cells: [entry.from, entry.target],
        sources: [entry.from, entry.target],
        targets: [entry.target, entry.from],
        arrows: arrowsFromEntries([...sideA, ...sideB], "attack"),
        duration: 1250
      });

      if (strengthA === strengthB) {
        messages.push(`${entry.from}-${entry.target}間で正面衝突。${fortressAttackText(bonusA || bonusB)}戦力${strengthA}同士で相打ち。`);
        return;
      }

      const winnerIsA = strengthA > strengthB;
      const winner = winnerIsA ? entry.player : opponent(entry.player);
      const loser = opponent(winner);
      const loserSource = winnerIsA ? sideB[0].from : sideA[0].from;
      const winnerUnits = winnerIsA ? unitsA : unitsB;
      const winnerStrength = winnerIsA ? strengthA : strengthB;
      const loserStrength = winnerIsA ? strengthB : strengthA;
      const winnerBonus = winnerIsA ? bonusA : bonusB;
      const survivors = Math.max(1, Math.min(winnerUnits, winnerStrength - loserStrength));
      captureTarget(
        cell(loserSource),
        winner,
        survivors,
        messages,
        `${winner}が${fortressAttackText(winnerBonus)}正面衝突に勝利し、${loser}の${loserSource}番を奪取。${survivors}駒が残存。`
      );
    });
  }

  function applyInvasionDamage(target) {
    if (target.id !== 5 && !target.fort && target.owner !== null) {
      target.value = 1;
    }
  }

  function captureTarget(target, attacker, survivors, messages, message) {
    const defender = opponent(attacker);
    const previousOwner = target.owner;
    const existingCardId = target.traitCardId;
    removePlayerCardForCell(previousOwner, target.id);
    applyInvasionDamage(target);
    target.owner = attacker;
    target.neutralCost = 0;
    target.pieces[defender] = 0;
    target.pieces[attacker] = Math.min(MAX_PIECES, survivors);
    messages.push(message);
    registerLandAcquisition(attacker, target.id, messages, { existingCardId });
    if (target.id === 5) {
      addReplayEvent({
        kind: "center-capture",
        player: attacker,
        label: `${attacker}: 中央5番制圧`,
        effect: "center",
        effectTitle: "CENTER!",
        effectDetail: `${attacker} 中央制圧`,
        cells: [5],
        targets: [5],
        duration: 1400
      });
    }
  }

  function resolveDomesticActions(actions, messages, battleCells) {
    const phaseActions = ["Exploit", "Fortify", "Produce"];
    const available = {};
    PLAYERS.forEach((player) => {
      available[player] = {};
      CELLS.forEach((id) => {
        available[player][id] = cell(id).pieces[player];
      });
    });

    phaseActions.forEach((type) => {
      activeActions(actions, type).forEach((action) => {
        if (available[action.player][action.from] < action.units) {
          messages.push(`${actionName(action)}は解決時の駒不足で失敗。`);
          return;
        }
        if (battleCells.has(action.from)) {
          messages.push(`${actionName(action)}は戦闘発生地のため失敗。`);
          return;
        }

        const source = cell(action.from);
        if (type === "Exploit") {
          if (source.owner !== action.player || source.fort || source.value >= 3) {
            messages.push(`${actionName(action)}は開発条件を満たさず失敗。`);
            return;
          }
          const before = source.value;
          source.value = Math.min(3, source.value + action.units);
          available[action.player][action.from] -= action.units;
          messages.push(`${action.player}は${action.from}番を${before}Pから${source.value}Pへ開発。`);
          addReplayEvent({
            kind: "exploit",
            player: action.player,
            label: `${action.player}: ${action.from}番 開発 ${before}P→${source.value}P`,
            effect: before < 3 && source.value >= 3 ? "city" : "",
            effectTitle: before < 3 && source.value >= 3 ? "3P CITY!" : "",
            effectDetail: before < 3 && source.value >= 3 ? `${action.player} ${action.from}番 都市化` : "",
            cells: [action.from],
            targets: [action.from],
            duration: before < 3 && source.value >= 3 ? 1450 : undefined
          });
        }

        if (type === "Fortify") {
          if (action.from === HOME[action.player] || source.owner !== action.player || source.fort || source.value < 1) {
            messages.push(`${actionName(action)}は要塞化条件を満たさず失敗。`);
            return;
          }
          source.fort = true;
          available[action.player][action.from] -= action.units;
          messages.push(`${action.player}は${action.from}番を${source.value}P要塞化。以後、防衛時+1、要塞からの侵攻時+1。`);
          addReplayEvent({
            kind: "fortify",
            player: action.player,
            label: `${action.player}: ${action.from}番 要塞化`,
            effect: "fortify",
            effectTitle: "FORTRESS!",
            effectDetail: `${action.player} ${action.from}番 要塞建築`,
            cells: [action.from],
            targets: [action.from],
            duration: 1350
          });
        }

        if (type === "Produce") {
          const canProduce = isProductionSite(action.player, action.from)
            && source.pieces[action.player] > 0
            && totalPieces(action.player) < MAX_PIECES
            && source.pieces[action.player] < MAX_PIECES;
          if (!canProduce) {
            messages.push(`${actionName(action)}は生産条件を満たさず失敗。生産は本拠地・中央・3P都市でのみ可能です。`);
            return;
          }
          state.players[action.player].pending.push({ cell: action.from });
          available[action.player][action.from] -= action.units;
          messages.push(`${action.player}は${action.from}番で生産予約。`);
          addReplayEvent({
            kind: "produce",
            player: action.player,
            label: `${action.player}: ${action.from}番 生産予約`,
            cells: [action.from],
            targets: [action.from]
          });
        }
      });
    });
  }

  function resolveBingo(messages) {
    PLAYERS.forEach((player) => {
      LINES.forEach((line) => {
        if (state.players[player].bingoUsed.includes(line.id)) {
          return;
        }
        const ownsLine = line.cells.every((id) => cell(id).owner === player);
        if (!ownsLine || !lineConnectedToHome(player, line.cells)) {
          return;
        }
        const bonusId = line.cells[1];
        const bonusCell = cell(bonusId);
        const before = bonusCell.value;
        bonusCell.value = Math.min(3, bonusCell.value + 1);
        state.players[player].bingoUsed.push(line.id);
        messages.push(`BINGO! ${player}の本拠接続ビンゴ${line.label}。中央マス${bonusId}番は${before}Pから${bonusCell.value}P。`);
        addReplayEvent({
          kind: "bingo",
          player,
          lineLabel: line.label,
          label: `${player}: ビンゴ ${line.label} / ${bonusId}番 ${before}P→${bonusCell.value}P`,
          cells: line.cells,
          targets: [bonusId],
          duration: 1700
        });
        if (before < 3 && bonusCell.value >= 3) {
          addReplayEvent({
            kind: "city",
            player,
            label: `${player}: ${bonusId}番 3P都市化`,
            effect: "city",
            effectTitle: "3P CITY!",
            effectDetail: `${player} ${bonusId}番 都市化`,
            cells: [bonusId],
            targets: [bonusId],
            duration: 1450
          });
        }
      });
    });
  }

  function lineConnectedToHome(player, lineCells) {
    const visited = new Set([HOME[player]]);
    const queue = [HOME[player]];
    while (queue.length > 0) {
      const current = queue.shift();
      ADJACENT[current].forEach((next) => {
        if (!visited.has(next) && cell(next).owner === player) {
          visited.add(next);
          queue.push(next);
        }
      });
    }
    return lineCells.some((id) => visited.has(id));
  }

  function startTurn(messages) {
    ensureCardUseState();
    state.turnModifiers = createTurnModifiers();
    state.awaitingCardUse = false;
    state.cardUseReservations = {};
    messages.push(`ターン${state.turn}開始。`);
    resolvePendingProduction(messages);
    resolveLandTraitEffects(messages);
    collectIncome(messages);
    beginCardUsePhase(messages);
  }

  function resolveLandTraitEffects(messages) {
    PLAYERS.forEach((player) => {
      activeTraitCells(player).forEach((current) => {
        const card = cardDefinition(current.traitCardId);
        if (!card) {
          return;
        }
        if (card.id === "CRD-001") {
          const targetId = ADJACENT[current.id]
            .filter((id) => cell(id).owner === null && cell(id).neutralCost > 0)
            .sort((left, right) => cell(right).neutralCost - cell(left).neutralCost)[0];
          if (targetId) {
            const target = cell(targetId);
            const before = target.neutralCost;
            target.neutralCost = Math.max(0, target.neutralCost - 1);
            messages.push(`${player}の${current.id}番「${card.name}」: ${targetId}番中立コスト${before}→${target.neutralCost}。`);
          }
        }

        if (card.id === "CRD-002" && current.pieces[player] > 0) {
          const gained = addAssets(player, 1);
          if (gained > 0) {
            messages.push(`${player}の${current.id}番「${card.name}」: 資産+${gained}。`);
          }
        }

        if (card.id === "CRD-005" && landConnectedToHome(player, current.id)) {
          const gained = addAssets(player, 1);
          if (gained > 0) {
            messages.push(`${player}の${current.id}番「${card.name}」: 本拠接続により資産+${gained}。`);
          }
        }

        if (card.id === "CRD-009") {
          const enemy = opponent(player);
          const targetId = ADJACENT[current.id]
            .filter((id) => cell(id).owner === enemy && cell(id).value >= 3)
            .sort((left, right) => cell(right).value - cell(left).value)[0];
          if (targetId) {
            const target = cell(targetId);
            const before = target.value;
            target.value = Math.max(2, target.value - 1);
            messages.push(`${player}の${current.id}番「${card.name}」: ${enemy}の${targetId}番${before}P→${target.value}P。`);
          }
        }

        if (card.id === "CRD-010"
          && current.pieces[player] <= 0
          && totalPieces(player) < MAX_PIECES) {
          current.pieces[player] += 1;
          messages.push(`${player}の${current.id}番「${card.name}」: 空いた土地に1駒配置。`);
        }
      });
      capAssets(player);
    });
  }

  function landConnectedToHome(player, landId) {
    if (cell(HOME[player]).owner !== player) {
      return false;
    }
    const visited = new Set([HOME[player]]);
    const queue = [HOME[player]];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === landId) {
        return true;
      }
      ADJACENT[current].forEach((next) => {
        if (!visited.has(next) && cell(next).owner === player) {
          visited.add(next);
          queue.push(next);
        }
      });
    }
    return false;
  }

  function resolvePendingProduction(messages) {
    PLAYERS.forEach((player) => {
      const pending = state.players[player].pending;
      if (pending.length === 0) {
        return;
      }
      pending.forEach((item) => {
        const source = cell(item.cell);
        const canCreate = isProductionSite(player, item.cell)
          && source.pieces[player] > 0
          && totalPieces(player) < MAX_PIECES
          && source.pieces[player] < MAX_PIECES;
        if (canCreate) {
          source.pieces[player] += 1;
          messages.push(`${player}の生産予約成功。${item.cell}番に1駒追加。`);
          addReplayEvent({
            kind: "produce-complete",
            player,
            label: `${player}: ${item.cell}番 生産完了`,
            effect: "produce",
            effectTitle: "UNIT +1",
            effectDetail: `${player} ${item.cell}番 生産成功`,
            cells: [item.cell],
            targets: [item.cell],
            duration: 1300
          });
        } else {
          messages.push(`${player}の${item.cell}番生産予約は失敗。`);
        }
      });
      state.players[player].pending = [];
    });
  }

  function collectIncome(messages) {
    PLAYERS.forEach((player) => {
      let income = 0;
      CELLS.forEach((id) => {
        const current = cell(id);
        if (current.owner !== player || current.fort || current.pieces[player] <= 0) {
          return;
        }
        if (id === HOME[player]) {
          income += current.value === 3 ? 3 : current.value === 2 ? 1 : 0;
          return;
        }
        if (id === 5) {
          income += current.value >= 2 ? 2 : 0;
          return;
        }
        income += current.value >= 2 ? 1 : 0;
      });
      if (income > 0) {
        const before = state.players[player].assets;
        state.players[player].assets = Math.min(MAX_ASSETS, before + income);
        messages.push(`${player}は${income}資産を回収。資産${before}→${state.players[player].assets}。`);
      }
      capAssets(player);
    });
  }

  function checkVictory() {
    const homeCapturers = PLAYERS.filter((player) => cell(HOME[opponent(player)]).owner === player);
    const eliminators = PLAYERS.filter((player) => totalPieces(opponent(player)) === 0);
    const scoreA = landScore("A");
    const scoreB = landScore("B");
    const civic = [];
    if (scoreA >= 11 && scoreB <= 10) civic.push("A");
    if (scoreB >= 11 && scoreA <= 10) civic.push("B");

    if (homeCapturers.length === 1) {
      return result(homeCapturers[0], `${homeCapturers[0]}が敵本拠地を占領。${homeCapturers[0]}の殲滅勝利。`);
    }
    if (homeCapturers.length > 1) {
      return finalJudgement("双方が敵本拠地を占領");
    }

    if (eliminators.length === 1) {
      return result(eliminators[0], `${eliminators[0]}が敵の盤上駒を全滅。${eliminators[0]}の殲滅勝利。`);
    }
    if (eliminators.length > 1) {
      return finalJudgement("双方の盤上駒が全滅");
    }

    if (civic.length === 1) {
      return result(civic[0], `${civic[0]}が${landScore(civic[0])}Pで単独条件達成。${civic[0]}の内政勝利。`);
    }
    if (civic.length > 1) {
      return { gameOver: false };
    }

    return { gameOver: false };
  }

  function result(winner, message) {
    return {
      gameOver: true,
      winner,
      message
    };
  }

  function finalJudgement(prefix) {
    const scoreA = landScore("A");
    const scoreB = landScore("B");
    if (scoreA > scoreB) {
      return result("A", `${prefix}。判定${scoreA}-${scoreB}でAの勝利。`);
    }
    if (scoreB > scoreA) {
      return result("B", `${prefix}。判定${scoreB}-${scoreA}でBの勝利。`);
    }
    if (cell(5).owner === "A") {
      return result("A", `${prefix}。同点だが中央5番支配によりAの勝利。`);
    }
    if (cell(5).owner === "B") {
      return result("B", `${prefix}。同点だが中央5番支配によりBの勝利。`);
    }
    return result(null, `${prefix}。判定同点、中央支配なしのため引き分け。`);
  }

  function newGame() {
    stopReplay({ renderBoardOnly: true });
    state = createInitialState();
    history = [];
    actionSerial = 1;
    lastVisualChanges = new Map();
    lastReplayEvents = [];
    currentReplayEvent = null;
    render();
  }

  function undo() {
    if (history.length === 0) {
      return;
    }
    stopReplay({ renderBoardOnly: true });
    state = history.pop();
    lastVisualChanges = new Map();
    lastReplayEvents = [];
    currentReplayEvent = null;
    render();
  }

  async function copyLog() {
    const text = state.log.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      els.validationMessage.textContent = "ログをコピーしました。";
    } catch {
      els.validationMessage.textContent = "クリップボードに書き込めませんでした。";
    }
  }

  function handlePlotInput(event) {
    if (event.target.matches("[data-card-use-field]")) {
      const cardElement = event.target.closest(".use-card");
      if (cardElement) {
        refreshCardUseDependentFields(cardElement);
      }
      updateCardUseAvailability();
      return;
    }
    if (event.target.matches('[data-cpu-mode]')) {
      const beforeState = cloneState(state);
      const player = event.target.dataset.cpuMode;
      controlModes[player] = event.target.value;
      if (hasPendingCardUse()) {
        const messages = [];
        turnReplayEvents = [];
        autoResolveCpuCardUses(messages);
        const finished = finishCardUsePhase(messages);
        const generatedReplay = turnReplayEvents || [];
        turnReplayEvents = null;
        lastVisualChanges = buildVisualChanges(beforeState, state);
        if (finished) {
          lastReplayEvents = generatedReplay;
        }
        pushLog(messages);
        render();
        if (finished && generatedReplay.length > 0) {
          window.setTimeout(() => playReplay(generatedReplay), 120);
        }
        return;
      }
      renderPlayers();
      updatePlotAvailability();
      updateCardUseAvailability();
      refreshValidationMessage();
      return;
    }
    if (event.target.matches('[data-field="from"], [data-field="type"], [data-field="target"], [data-field="units"], [data-field="priority"]')) {
      updatePlotAvailability();
      refreshValidationMessage();
    }
  }

  function handlePlayerClick(event) {
    const useCardButton = event.target.closest("[data-card-use-record]");
    const skipUseButton = event.target.closest("[data-card-use-skip]");
    if (useCardButton || skipUseButton) {
      const beforeState = cloneState(state);
      const messages = [];
      turnReplayEvents = [];
      let finished = false;
      if (skipUseButton) {
        reserveCardUse(skipUseButton.dataset.cardUseSkip, { kind: "skip" }, messages);
      }
      if (useCardButton) {
        const cardElement = useCardButton.closest(".use-card");
        if (cardElement) {
          const player = useCardButton.dataset.cardUsePlayer;
          reserveCardUse(player, cardUseReservationFromElement(cardElement), messages);
        }
      }
      autoResolveCpuCardUses(messages);
      finished = finishCardUsePhase(messages);
      const generatedReplay = turnReplayEvents || [];
      turnReplayEvents = null;
      lastVisualChanges = buildVisualChanges(beforeState, state);
      if (finished) {
        lastReplayEvents = generatedReplay;
      }
      pushLog(messages);
      render();
      if (finished && generatedReplay.length > 0) {
        window.setTimeout(() => playReplay(generatedReplay), 120);
      }
      return;
    }

    const keepButton = event.target.closest("[data-card-keep]");
    const choiceButton = event.target.closest("[data-card-choice]");
    const skipButton = event.target.closest("[data-card-skip]");
    if (!keepButton && !choiceButton && !skipButton) {
      return;
    }
    const beforeState = cloneState(state);
    const messages = [];
    if (keepButton) {
      reserveCardChoice(keepButton.dataset.cardKeep, { kind: "keep" }, messages);
    }
    if (choiceButton) {
      reserveCardChoice(choiceButton.dataset.cardChoice, { kind: "new", cardId: choiceButton.dataset.cardId }, messages);
    }
    if (skipButton) {
      reserveCardChoice(skipButton.dataset.cardSkip, { kind: "skip" }, messages);
    }
    autoResolveCpuCardChoices(messages);
    finishCardChoicePhase(messages);
    lastVisualChanges = buildVisualChanges(beforeState, state);
    pushLog(messages);
    render();
  }

  function ensureTutorialOverlay() {
    if (tutorialOverlay) {
      return tutorialOverlay;
    }
    tutorialOverlay = document.createElement("div");
    tutorialOverlay.className = "tutorial-overlay";
    tutorialOverlay.hidden = true;
    tutorialOverlay.innerHTML = `
      <section class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle">
        <div class="tutorial-progress" id="tutorialProgress"></div>
        <h2 id="tutorialTitle"></h2>
        <p id="tutorialBody"></p>
        <div class="tutorial-actions">
          <button type="button" data-tour-prev>戻る</button>
          <button type="button" data-tour-next class="primary">次へ</button>
          <button type="button" data-tour-close>閉じる</button>
        </div>
      </section>
    `;
    document.body.appendChild(tutorialOverlay);
    tutorialOverlay.querySelector("[data-tour-prev]").addEventListener("click", () => showTutorialStep(tutorialIndex - 1));
    tutorialOverlay.querySelector("[data-tour-next]").addEventListener("click", () => {
      if (tutorialIndex >= TUTORIAL_STEPS.length - 1) {
        closeTutorial();
        return;
      }
      showTutorialStep(tutorialIndex + 1);
    });
    tutorialOverlay.querySelector("[data-tour-close]").addEventListener("click", closeTutorial);
    return tutorialOverlay;
  }

  function startTutorial() {
    stopReplay({ renderBoardOnly: true });
    showTutorialStep(0);
  }

  function showTutorialStep(index) {
    tutorialIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, index));
    const overlay = ensureTutorialOverlay();
    const step = TUTORIAL_STEPS[tutorialIndex];
    clearTutorialFocus();
    const target = document.querySelector(step.target);
    if (target) {
      const parentDetails = target.closest("details");
      if (parentDetails) {
        parentDetails.open = true;
      }
      target.classList.add("tutorial-focus");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    overlay.hidden = false;
    overlay.querySelector("#tutorialProgress").textContent = `${tutorialIndex + 1} / ${TUTORIAL_STEPS.length}`;
    overlay.querySelector("#tutorialTitle").textContent = step.title;
    overlay.querySelector("#tutorialBody").textContent = step.body;
    overlay.querySelector("[data-tour-prev]").disabled = tutorialIndex === 0;
    overlay.querySelector("[data-tour-next]").textContent = tutorialIndex === TUTORIAL_STEPS.length - 1 ? "完了" : "次へ";
  }

  function clearTutorialFocus() {
    document.querySelectorAll(".tutorial-focus").forEach((element) => {
      element.classList.remove("tutorial-focus");
    });
  }

  function closeTutorial() {
    clearTutorialFocus();
    if (tutorialOverlay) {
      tutorialOverlay.hidden = true;
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && tutorialOverlay && !tutorialOverlay.hidden) {
      closeTutorial();
    }
  });

  els.resolveButton.addEventListener("click", resolveTurn);
  els.newGameButton.addEventListener("click", newGame);
  els.undoButton.addEventListener("click", undo);
  els.copyLogButton.addEventListener("click", copyLog);
  els.replayButton?.addEventListener("click", () => playReplay(lastReplayEvents));
  els.skipReplayButton?.addEventListener("click", () => stopReplay());
  els.tutorialButton?.addEventListener("click", startTutorial);
  els.players.addEventListener("click", handlePlayerClick);
  els.players.addEventListener("change", handlePlotInput);
  els.players.addEventListener("input", handlePlotInput);

  newGame();
  if (location.hash === "#tutorialButton") {
    requestAnimationFrame(startTutorial);
  }
})();
