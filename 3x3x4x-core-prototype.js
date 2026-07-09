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


  const els = {
    board: document.getElementById("board"),
    players: document.getElementById("players"),
    turnSummary: document.getElementById("turnSummary"),
    resolveButton: document.getElementById("resolveButton"),
    newGameButton: document.getElementById("newGameButton"),
    undoButton: document.getElementById("undoButton"),
    copyLogButton: document.getElementById("copyLogButton"),
    logList: document.getElementById("logList"),
    validationMessage: document.getElementById("validationMessage"),
    centralSeed: document.getElementById("centralSeed"),
    replayButton: document.getElementById("replayButton"),
    skipReplayButton: document.getElementById("skipReplayButton"),
    replayStatus: document.getElementById("replayStatus")
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
        A: { assets: 0, pending: [], bingoUsed: [], personality: personalityA },
        B: { assets: 0, pending: [], bingoUsed: [], personality: personalityB }
      },
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

  function render() {
    renderSummary();
    renderBoard();
    renderPlayers();
    updatePlotAvailability();
    renderLog();
    updateReplayControls();
    els.resolveButton.disabled = state.gameOver || replayBusy;
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
      applyVisualClasses(square, id);

      const tags = [];
      if (id === HOME.A) tags.push("A本拠");
      if (id === HOME.B) tags.push("B本拠");
      if (id === 5) tags.push("中央");
      if (current.owner && id !== HOME.A && id !== HOME.B && id !== 5 && current.value >= 3) tags.push("3P都市");
      if (productionLabel) tags.push("生産可");
      if (current.fort) tags.push("要塞");
      if (current.fort) tags.push("攻防+1");

      const value = current.owner
        ? `${current.value}P`
        : `C${current.neutralCost}`;
      const ownerText = current.owner ? `${current.owner}支配` : "中立";
      const foot = current.owner
        ? productionLabel || (current.fort ? `${current.value}P要塞・攻防+1` : "通常土地")
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
  }

  function renderArrowOverlay() {
    const arrows = currentReplayEvent?.arrows || [];
    if (arrows.length === 0) {
      return `<svg class="board-arrow-layer" viewBox="0 0 100 100" aria-hidden="true"></svg>`;
    }
    const arrowMarkup = arrows.map((arrow) => renderArrow(arrow)).join("");
    return `<svg class="board-arrow-layer active" viewBox="0 0 100 100" aria-hidden="true">${arrowMarkup}</svg>`;
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
    const dots = Array.from({ length: count }, () => `<i class="piece-dot ${player}"></i>`).join("");
    return `<span class="piece-stack">${dots}<span>${player}x${count}</span></span>`;
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
        <div class="plot-grid ${controlModes[player] !== "human" ? "cpu-controlled-grid" : ""}" data-player="${player}">
          ${[0, 1, 2].map((index) => renderPlotRow(player, index)).join("")}
        </div>
      `;
      els.players.appendChild(card);
    });
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
      const slotEnabled = slot <= actionLimit(player) && !cpuControlled && !replayBusy;

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
      option.textContent = targetLabel(target);
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

  function targetLabel(id) {
    const current = cell(id);
    if (!current.owner) {
      return `${id} C${current.neutralCost}`;
    }
    const fort = current.fort ? "要塞" : "";
    return `${id} ${current.owner}${current.value}P${fort}`;
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
      && state.players[player].assets >= targetCell.neutralCost;
  }

  function canExterminateTarget(player, from, target) {
    const targetCell = cell(target);
    return isAdjacent(from, target)
      && targetCell.owner === opponent(player)
      && state.players[player].assets >= invasionCost(targetCell);
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
      || source.value >= 3;
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
        updateReplayControls(`リプレイ完了：${events.length}件`);
        return;
      }
      currentReplayEvent = events[index];
      renderBoard();
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
      els.resolveButton.disabled = state.gameOver || replayBusy;
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
        cost: target.neutralCost,
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
        cost: invasionCost(target),
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
      return cell(action.target).neutralCost;
    }
    if (action.type === "Exterminate" && CELLS.includes(action.target)) {
      return invasionCost(cell(action.target));
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
      const targetDefense = target.pieces[enemy] + (target.fort && target.pieces[enemy] > 0 ? 1 : 0);
      const sourceAttackBonus = source.fort ? 1 : 0;
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
      score += 34 + action.units * 4;
      if (action.target === 5) score += 62 - target.neutralCost * 14;
      if (lineWouldComplete(player, action.target)) score += 80;
      if (ADJACENT[action.target].includes(5)) score += 14;
      score -= target.neutralCost * 8;
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
    state = cloneState(baseState);
    turnReplayEvents = null;
    replayBusy = false;
    currentReplayEvent = null;
    lastVisualChanges = new Map();
    lastReplayEvents = [];

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
    const simulated = cloneState(state);

    state = savedState;
    turnReplayEvents = savedReplay;
    replayBusy = savedReplayBusy;
    currentReplayEvent = savedCurrentReplayEvent;
    lastVisualChanges = savedVisualChanges;
    lastReplayEvents = savedReplayEvents;
    actionSerial = savedSerial;
    return simulated;
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

  function resolveTurn() {
    if (state.gameOver) {
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
      messages.push(result.message);
    }

    if (!state.gameOver) {
      if (state.turn >= MAX_TURN) {
        const final = finalJudgement("10ターン終了");
        state.gameOver = true;
        state.winner = final.winner;
        state.result = final.message;
        messages.push(final.message);
      } else {
        state.turn += 1;
        startTurn(messages);
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
        cost: target.neutralCost,
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
        cost: invasionCost(target),
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
    if (state.turn <= 2) {
      return isAdjacent(from, target);
    }

    const queue = [{ id: from, distance: 0 }];
    const visited = new Set([from]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.id === target && current.distance <= 2) {
        return true;
      }
      if (current.distance >= 2) {
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
      messages.push(`${winner}が${targetId}番探索に成功。${sumUnits(winningEntries)}駒が進入。`);
      addReplayEvent({
        kind: "explore",
        player: winner,
        label: `${winner}: ${targetId}番 探索成功`,
        cells: [Number(targetId), ...winningEntries.map((entry) => entry.from)],
        sources: winningEntries.map((entry) => entry.from),
        targets: [Number(targetId)],
        arrows: arrowsFromEntries(winningEntries, "explore")
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
    return entries.some((entry) => cell(entry.from)?.fort) ? 1 : 0;
  }

  function attackStrength(entries) {
    return sumUnits(entries) + fortressAttackBonus(entries);
  }

  function fortressAttackText(bonus) {
    return bonus > 0 ? "要塞攻撃補正+1、" : "";
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

    reserves.forEach((entry) => {
      cell(entry.from).pieces[entry.player] -= entry.units;
    });

    const consumed = new Set();
    resolveFrontCollisions(reserves, consumed, messages, battleCells);

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
        cells: [Number(targetId), ...entries.map((entry) => entry.from)],
        sources: entries.map((entry) => entry.from),
        targets: [Number(targetId)],
        arrows: arrowsFromEntries(entries, "attack")
      });

      const defender = target.owner;
      const attackUnits = sumUnits(entries);
      const attackBonus = fortressAttackBonus(entries);
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

      if (defenderUnits === 0) {
        captureTarget(target, attacker, attackUnits, messages, `${attacker}が${targetId}番を無血占領。`);
        return;
      }

      const siegeText = siege ? "包囲攻撃、" : "";
      const fortText = fortressAttackText(attackBonus);
      if (attackerStrength > defenseStrength) {
        const survivors = Math.max(1, Math.min(attackUnits, attackerStrength - defenseStrength));
        captureTarget(
          target,
          attacker,
          survivors,
          messages,
          `${attacker}が${targetId}番で${siegeText}${fortText}戦闘勝利。${survivors}駒が残存。`
        );
      } else if (attackerStrength < defenseStrength) {
        applyInvasionDamage(target);
        const defenderLoss = Math.min(defenderUnits, attackerStrength);
        let survivors = defenderUnits - defenderLoss;
        if (survivors <= 0 && defenderUnits > 0) {
          survivors = 1;
        }
        target.pieces[defender] = Math.min(MAX_PIECES, survivors);
        messages.push(`${defender}が${targetId}番で${siegeText}${fortText}防衛成功。${target.pieces[defender]}駒が残存。`);
      } else {
        applyInvasionDamage(target);
        target.pieces[defender] = 0;
        messages.push(`${targetId}番の戦闘は${siegeText}${fortText}相打ち。土地所有者は${defender}のまま。`);
      }
    });
  }

  function resolveFrontCollisions(reserves, consumed, messages, battleCells) {
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
      const bonusA = fortressAttackBonus(sideA);
      const bonusB = fortressAttackBonus(sideB);
      const strengthA = unitsA + bonusA;
      const strengthB = unitsB + bonusB;
      pairIndexes.forEach((candidateIndex) => consumed.add(candidateIndex));
      battleCells.add(entry.from);
      battleCells.add(entry.target);
      addReplayEvent({
        kind: "front-collision",
        label: `${entry.from}-${entry.target} 正面衝突`,
        cells: [entry.from, entry.target],
        sources: [entry.from, entry.target],
        targets: [entry.target, entry.from],
        arrows: arrowsFromEntries([...sideA, ...sideB], "attack")
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
    applyInvasionDamage(target);
    target.owner = attacker;
    target.neutralCost = 0;
    target.pieces[defender] = 0;
    target.pieces[attacker] = Math.min(MAX_PIECES, survivors);
    messages.push(message);
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
            cells: [action.from],
            targets: [action.from]
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
            cells: [action.from],
            targets: [action.from]
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
        messages.push(`${player}の本拠接続ビンゴ${line.label}。中央マス${bonusId}番は${before}Pから${bonusCell.value}P。`);
        addReplayEvent({
          kind: "bingo",
          player,
          label: `${player}: ビンゴ ${line.label} / ${bonusId}番 ${before}P→${bonusCell.value}P`,
          cells: line.cells,
          targets: [bonusId]
        });
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
    messages.push(`ターン${state.turn}開始。`);
    resolvePendingProduction(messages);
    collectIncome(messages);
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
            cells: [item.cell],
            targets: [item.cell]
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
    if (event.target.matches('[data-cpu-mode]')) {
      const player = event.target.dataset.cpuMode;
      controlModes[player] = event.target.value;
      renderPlayers();
      updatePlotAvailability();
      refreshValidationMessage();
      return;
    }
    if (event.target.matches('[data-field="from"], [data-field="type"], [data-field="target"], [data-field="units"], [data-field="priority"]')) {
      updatePlotAvailability();
      refreshValidationMessage();
    }
  }

  els.resolveButton.addEventListener("click", resolveTurn);
  els.newGameButton.addEventListener("click", newGame);
  els.undoButton.addEventListener("click", undo);
  els.copyLogButton.addEventListener("click", copyLog);
  els.replayButton?.addEventListener("click", () => playReplay(lastReplayEvents));
  els.skipReplayButton?.addEventListener("click", () => stopReplay());
  els.players.addEventListener("change", handlePlotInput);
  els.players.addEventListener("input", handlePlotInput);

  newGame();
})();
