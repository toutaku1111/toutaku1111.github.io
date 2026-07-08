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
    centralSeed: document.getElementById("centralSeed")
  };

  let state;
  let history = [];
  let actionSerial = 1;
  let playerPanelOpen = { A: true, B: true };

  function opponent(player) {
    return player === "A" ? "B" : "A";
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

    return {
      turn: 1,
      gameOver: false,
      winner: null,
      result: "",
      cells,
      players: {
        A: { assets: 0, pending: [], bingoUsed: [] },
        B: { assets: 0, pending: [], bingoUsed: [] }
      },
      log: [
        "ゲーム開始。",
        centralText,
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
    els.resolveButton.disabled = state.gameOver;
    els.undoButton.disabled = history.length === 0;
    els.validationMessage.textContent = state.gameOver ? state.result : "";
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
      if (current.fort) {
        square.classList.add("fortified");
      }

      const tags = [];
      if (id === HOME.A) tags.push("A本拠");
      if (id === HOME.B) tags.push("B本拠");
      if (id === 5) tags.push("中央");
      if (current.fort) tags.push("要塞");

      const value = current.owner
        ? `${current.value}P`
        : `C${current.neutralCost}`;
      const ownerText = current.owner ? `${current.owner}支配` : "中立";
      const foot = current.owner
        ? current.fort ? `${current.value}P要塞` : "通常土地"
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
          </div>
        </summary>
        <div class="plot-grid" data-player="${player}">
          ${[0, 1, 2].map((index) => renderPlotRow(player, index)).join("")}
        </div>
      `;
      els.players.appendChild(card);
    });
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
      const slotEnabled = slot <= actionLimit(player);

      fromSelect.disabled = !slotEnabled;
      typeSelect.disabled = !slotEnabled;
      unitsInput.disabled = !slotEnabled;
      priorityInput.disabled = !slotEnabled;

      if (!slotEnabled) {
        targetSelect.disabled = true;
        row.classList.add("unavailable");
        row.title = `このターンの行動枠は${actionLimit(player)}枠です。`;
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
      : unavailable("要塞化できる自国土地ではありません。");
    result.Produce = canProduceNow(player, from)
      ? available
      : unavailable("生産予約条件または資産3を満たしていません。");
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
    const source = cell(from);
    return source.owner === player
      && source.pieces[player] > 0
      && !source.fort
      && source.value > 0
      && source.value < 3;
  }

  function canFortify(player, from) {
    const source = cell(from);
    return source.owner === player
      && source.pieces[player] > 0
      && !source.fort
      && source.value > 0;
  }

  function canProduceNow(player, from) {
    const source = cell(from);
    return source.owner === player
      && source.pieces[player] > 0
      && (from === HOME[player] || from === 5)
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

  function readActions() {
    const actions = [];
    document.querySelectorAll(".plot-row").forEach((row) => {
      const player = row.dataset.player;
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
        id: `${player}-${state.turn}-${actionSerial++}`,
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
        failed: false
      });
    });
    return actions;
  }

  function requiresPayment(type) {
    return type === "Explore" || type === "Exterminate" || type === "Produce";
  }

  function actionName(action) {
    const target = action.target ? ` -> ${action.target}` : "";
    return `${action.player}${action.row}: ${action.from}${target} ${ACTION_LABELS[action.type] ?? action.type} x${action.units}`;
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

      bySource.forEach((units, from) => {
        const available = cell(from).pieces[player];
        if (units > available) {
          errors.push(`${player}は${from}番の駒${available}個に対して${units}個分の行動を指定しています。`);
        }
      });
    });
    return errors;
  }

  function resolveTurn() {
    if (state.gameOver) {
      return;
    }

    const actions = readActions();
    const capacityErrors = validateActionCapacity(actions);
    if (capacityErrors.length > 0) {
      els.validationMessage.textContent = capacityErrors.join(" ");
      return;
    }

    history.push(cloneState(state));
    if (history.length > 40) {
      history = history.slice(-40);
    }

    const messages = [`ターン${state.turn}解決開始。`];
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

    pushLog(messages);
    render();
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

    if (action.type === "Produce") {
      const canPayForProduction = source.owner === action.player
        && source.pieces[action.player] > 0
        && (action.from === HOME[action.player] || action.from === 5)
        && totalPieces(action.player) < MAX_PIECES
        && source.pieces[action.player] < MAX_PIECES;
      if (!canPayForProduction) {
        messages.push(`${actionName(action)}は生産条件を満たさない。`);
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

      const defender = target.owner;
      const attackUnits = sumUnits(entries);
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
      if (attackUnits > defenseStrength) {
        const survivors = Math.max(1, attackUnits - defenseStrength);
        captureTarget(
          target,
          attacker,
          survivors,
          messages,
          `${attacker}が${targetId}番で${siegeText}戦闘勝利。${survivors}駒が残存。`
        );
      } else if (attackUnits < defenseStrength) {
        applyInvasionDamage(target);
        const defenderLoss = Math.min(defenderUnits, attackUnits);
        let survivors = defenderUnits - defenderLoss;
        if (survivors <= 0 && defenderUnits > 0) {
          survivors = 1;
        }
        target.pieces[defender] = Math.min(MAX_PIECES, survivors);
        messages.push(`${defender}が${targetId}番で${siegeText}防衛成功。${target.pieces[defender]}駒が残存。`);
      } else {
        applyInvasionDamage(target);
        target.pieces[defender] = 0;
        messages.push(`${targetId}番の戦闘は相打ち。土地所有者は${defender}のまま。`);
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
      pairIndexes.forEach((candidateIndex) => consumed.add(candidateIndex));
      battleCells.add(entry.from);
      battleCells.add(entry.target);

      if (unitsA === unitsB) {
        messages.push(`${entry.from}-${entry.target}間で正面衝突。双方${unitsA}駒で相打ち。`);
        return;
      }

      const winner = unitsA > unitsB ? entry.player : opponent(entry.player);
      const loser = opponent(winner);
      const loserSource = unitsA > unitsB ? sideB[0].from : sideA[0].from;
      const survivors = Math.abs(unitsA - unitsB);
      captureTarget(
        cell(loserSource),
        winner,
        survivors,
        messages,
        `${winner}が正面衝突に勝利し、${loser}の${loserSource}番を奪取。${survivors}駒が残存。`
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
        }

        if (type === "Fortify") {
          if (source.owner !== action.player || source.fort || source.value < 1) {
            messages.push(`${actionName(action)}は要塞化条件を満たさず失敗。`);
            return;
          }
          source.fort = true;
          available[action.player][action.from] -= action.units;
          messages.push(`${action.player}は${action.from}番を${source.value}P要塞化。`);
        }

        if (type === "Produce") {
          const canProduce = source.owner === action.player
            && source.pieces[action.player] > 0
            && (action.from === HOME[action.player] || action.from === 5)
            && totalPieces(action.player) < MAX_PIECES
            && source.pieces[action.player] < MAX_PIECES;
          if (!canProduce) {
            messages.push(`${actionName(action)}は生産条件を満たさず失敗。`);
            return;
          }
          state.players[action.player].pending.push({ cell: action.from });
          available[action.player][action.from] -= action.units;
          messages.push(`${action.player}は${action.from}番で生産予約。`);
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
        const canCreate = source.owner === player
          && source.pieces[player] > 0
          && totalPieces(player) < MAX_PIECES
          && source.pieces[player] < MAX_PIECES;
        if (canCreate) {
          source.pieces[player] += 1;
          messages.push(`${player}の生産予約成功。${item.cell}番に1駒追加。`);
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
    state = createInitialState();
    history = [];
    actionSerial = 1;
    render();
  }

  function undo() {
    if (history.length === 0) {
      return;
    }
    state = history.pop();
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
    if (event.target.matches('[data-field="from"], [data-field="type"], [data-field="target"], [data-field="units"]')) {
      updatePlotAvailability();
    }
  }

  els.resolveButton.addEventListener("click", resolveTurn);
  els.newGameButton.addEventListener("click", newGame);
  els.undoButton.addEventListener("click", undo);
  els.copyLogButton.addEventListener("click", copyLog);
  els.players.addEventListener("change", handlePlotInput);
  els.players.addEventListener("input", handlePlotInput);

  newGame();
})();
