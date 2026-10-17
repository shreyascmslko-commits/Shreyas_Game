(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (n) => Math.floor(Math.random()*n);
  const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
  const now = () => performance.now();

  const body = document.body;
  const canvas = $('#game');
  const logoCanvas = $('#logo-canvas');
  const mainMenu = $('#menu-panel');
  const gamePanel = $('#game-panel');
  const btnPlay = $('#btn-play');
  const btnTime = $('#btn-time');
  const btnEndless = $('#btn-endless');
  const btnDaily = $('#btn-daily');
  const btnLevels = $('#btn-levels');
  const btnHow = $('#btn-how');
  const howPanel = $('#how-panel');
  const levelsPanel = $('#levels-panel');
  const levelsList = $('#levels-list');
  const overlay = $('#overlay-panel');
  const overlayContent = $('#overlay-content');
  const overlayClose = $('#overlay-close');
  const hudLevel = $('#level-name');
  const hudTime = $('#time-left');
  const hudScore = $('#score');
  const hudKeys = $('#keys');
  const abilitiesDiv = $('#abilities');
  const dpadBtns = $$('.dbtn');
  const abilityButtons = $$('.ability');
  const btnPause = $('#btn-pause');
  const btnRestart = $('#btn-restart');
  const btnBack = $('#btn-back');
  const resultPanel = $('#result-panel');
  const resultTitle = $('#result-title');
  const resultStats = $('#result-stats');
  const btnNext = $('#btn-next');
  const btnReplay = $('#btn-replay');
  const btnToMenu = $('#btn-to-menu');
  const settingsPanel = $('#settings-panel');
  const btnSettings = $('#btn-settings');
  const btnSound = $('#btn-sound');
  const optMusic = $('#opt-music');
  const optSfx = $('#opt-sfx');
  const optReduce = $('#opt-reduce');
  const optContrast = $('#opt-contrast');

  let ctx, W, H, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resizeCanvas() {
    const targetW = Math.min(window.innerWidth - 40, 1080);
    const targetH = Math.min(window.innerHeight - 220, 720);
    canvas.width = Math.floor(targetW * DPR);
    canvas.height = Math.floor(targetH * DPR);
    canvas.style.width = targetW + 'px';
    canvas.style.height = targetH + 'px';
    W = canvas.width; H = canvas.height;
    ctx = canvas.getContext('2d');
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  window.addEventListener('resize', resizeCanvas);

  const AudioEngine = (() => {
    let ctxA = null;
    try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    function startIfNeeded() { if (ctxA && ctxA.state === 'suspended') ctxA.resume(); }
    function beep(freq = 440, time = 0.08, type = 'sine', vol = 0.06, when = 0) {
      if (!ctxA) return;
      startIfNeeded();
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctxA.destination);
      const t = ctxA.currentTime + when;
      o.start(t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + time);
      o.stop(t + time + 0.02);
    }
    function swoosh(vol = 0.06) {
      if (!ctxA) return;
      startIfNeeded();
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(800, ctxA.currentTime);
      o.frequency.exponentialRampToValueAtTime(200, ctxA.currentTime + 0.12);
      g.gain.value = vol;
      o.connect(g); g.connect(ctxA.destination);
      o.start(); o.stop(ctxA.currentTime + 0.14);
    }
    function pulse(freq = 1200, time = 0.12, vol = 0.12) {
      if (!ctxA) return;
      startIfNeeded();
      const o = ctxA.createOscillator();
      const g = ctxA.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctxA.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctxA.currentTime + time);
      o.stop(ctxA.currentTime + time + 0.02);
    }
    return { beep, swoosh, pulse, startIfNeeded };
  })();

  const Input = { dir: { x: 0, y: 0 }, keys: {}, touchStart: null };

  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    Input.keys[key] = true;
    if (['arrowup', 'w'].includes(key)) Input.dir = { x: 0, y: -1 };
    if (['arrowdown', 's'].includes(key)) Input.dir = { x: 0, y: 1 };
    if (['arrowleft', 'a'].includes(key)) Input.dir = { x: -1, y: 0 };
    if (['arrowright', 'd'].includes(key)) Input.dir = { x: 1, y: 0 };
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    Input.keys[key] = false;
    if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd'].includes(key)) {
      Input.dir = { x: 0, y: 0 };
    }
  });

  dpadBtns.forEach((b) => {
    const setDir = (dir) => {
      if (dir === 'up') Input.dir = { x: 0, y: -1 };
      if (dir === 'down') Input.dir = { x: 0, y: 1 };
      if (dir === 'left') Input.dir = { x: -1, y: 0 };
      if (dir === 'right') Input.dir = { x: 1, y: 0 };
    };
    b.addEventListener('touchstart', (ev) => { ev.preventDefault(); setDir(b.dataset.dir); }, { passive: false });
    b.addEventListener('touchend', (ev) => { ev.preventDefault(); Input.dir = { x: 0, y: 0 }; });
    b.addEventListener('mousedown', (ev) => { ev.preventDefault(); setDir(b.dataset.dir); });
    b.addEventListener('mouseup', () => { Input.dir = { x: 0, y: 0 }; });
  });

  let lastTouch = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    lastTouch = { x: t.clientX, y: t.clientY };
    AudioEngine.startIfNeeded();
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (!lastTouch) return;
    const t = e.touches[0];
    const dx = t.clientX - lastTouch.x;
    const dy = t.clientY - lastTouch.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 24) {
      if (Math.abs(dx) > Math.abs(dy)) Input.dir = { x: Math.sign(dx), y: 0 };
      else Input.dir = { x: 0, y: Math.sign(dy) };
      lastTouch = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => { Input.dir = { x: 0, y: 0 }; lastTouch = null; });

  const TILE = {
    EMPTY: 0, WALL: 1, ORB: 2, KEY: 3, DOOR: 4, SWITCH: 5, EXIT: 6, PORTAL: 7, HIDDEN: 8, ONEWAY: 9
  };

  const WORLDS = [
    { id: 'neon', name: 'NEON CITY', palette: ['#00f0ff', '#3ab3ff', '#ff3ad1', '#9b5cff', '#ffd76b'], hint: 'Learn basic movement and orbs' },
    { id: 'shadow', name: 'SHADOW LABYRINTH', palette: ['#35f0ff', '#8f7fff', '#ff6fd6', '#ffd76b'], hint:'Hidden passages and stealth' },
    { id: 'temple', name: 'CYBER TEMPLE', palette: ['#7fffd4', '#9b5cff', '#ff3ad1', '#ffd76b'], hint:'Switch puzzles and doors' },
    { id: 'fractured', name: 'FRACTURED DIMENSION', palette: ['#00f0ff', '#9b5cff', '#ffd76b'], hint:'Shifting walls and portals' },
    { id: 'core', name: 'INFINITE CORE', palette: ['#ffd76b', '#ff3ad1', '#00f0ff', '#9b5cff'], hint:'All mechanics combined' }
  ];

  const ADVENTURE_LEVELS = [
    { id: 'n1', world: 'neon', w: 21, h: 13, time: 90, orbs: 6, keys: 0, features: [] },
    { id: 'n2', world: 'neon', w: 21, h: 13, time: 110, orbs: 8, keys: 1, features: ['lock'] },
    { id: 's1', world: 'shadow', w: 23, h: 15, time: 120, orbs: 10, keys: 1, features: ['hidden'] },
    { id: 't1', world: 'temple', w: 25, h: 15, time: 140, orbs: 10, keys: 2, features: ['switches', 'doors'] },
    { id: 'f1', world: 'fractured', w: 25, h: 17, time: 160, orbs: 12, keys: 1, features: ['movingwalls', 'portals'] },
    { id: 'c1', world: 'core', w: 27, h: 19, time: 220, orbs: 16, keys: 3, features: ['everything'] }
  ];

  const SAVE_KEY = 'neon-nexus-save-v1';

  let Save = {
    data: {
      unlocked: ['n1'],
      best: {},
      settings: { music: true, sfx: true, reduce: false, contrast: false }
    },
    load() {
      try {
        const s = localStorage.getItem(SAVE_KEY);
        if (s) this.data = JSON.parse(s);
      } catch (e) {}
      optMusic.checked = this.data.settings.music;
      optSfx.checked = this.data.settings.sfx;
      optReduce.checked = this.data.settings.reduce;
      optContrast.checked = this.data.settings.contrast;
      document.body.classList.toggle('high-contrast', !!this.data.settings.contrast);
    },
    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (e) {}
    }
  };
  Save.load();

  let state = { mode: 'menu', run: null, seed: Math.floor(Math.random()*1000000) };

  function seeded(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function generateMaze(w, h, randfn = Math.random) {
    if (w % 2 === 0) w++;
    if (h % 2 === 0) h++;
    const grid = new Array(h).fill(0).map(() => new Array(w).fill(TILE.WALL));
    const stack = [{ x: 1, y: 1 }];
    grid[1][1] = TILE.EMPTY;
    const dirs = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const choices = dirs.filter((d) => {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) return false;
        return grid[ny][nx] === TILE.WALL;
      });
      if (!choices.length) { stack.pop(); continue; }
      const d = choices[Math.floor(randfn() * choices.length)];
      const nx = cur.x + d.x, ny = cur.y + d.y;
      grid[ny][nx] = TILE.EMPTY;
      grid[cur.y + d.y / 2][cur.x + d.x / 2] = TILE.EMPTY;
      stack.push({ x: nx, y: ny });
    }
    return grid;
  }

  function populateMaze(grid, opts, seed = Date.now()) {
    const randfn = seeded(seed);
    const h = grid.length, w = grid[0].length;
    const emptyCells = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x] === TILE.EMPTY) emptyCells.push({ x, y });
      }
    }
    for (let i = emptyCells.length - 1; i > 0; i--) {
      const j = Math.floor(randfn() * (i + 1));
      [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
    }

    const out = { grid, orbs: [], keys: [], switches: [], doors: [], portals: [], hidden: [] };

    const exitCell = emptyCells.find(c => c.x > w * 0.6 && c.y > h * 0.6) || emptyCells[0];
    grid[exitCell.y][exitCell.x] = TILE.EXIT;
    out.exit = exitCell;

    const startCell = emptyCells.find(c => c.x < w * 0.35 && c.y < h * 0.35) || emptyCells[0];
    out.start = startCell;

    let orbCount = opts.orbs || Math.max(6, Math.floor((w * h) / 80));
    for (let i = 0; i < orbCount && emptyCells.length; i++) {
      const c = emptyCells.pop();
      if (grid[c.y][c.x] === TILE.EMPTY) {
        grid[c.y][c.x] = TILE.ORB;
        out.orbs.push(c);
      }
    }

    for (let k = 0; k < (opts.keys || 0); k++) {
      if (!emptyCells.length) break;
      const c = emptyCells.pop();
      grid[c.y][c.x] = TILE.KEY;
      out.keys.push(c);
    }

    if (opts.features && (opts.features.includes('switches') || opts.features.includes('doors') || opts.features.includes('everything'))) {
      const switchCount = Math.min(3, Math.max(1, Math.floor((w * h) / 200)));
      for (let i = 0; i < switchCount && emptyCells.length; i++) {
        const s = emptyCells.pop();
        grid[s.y][s.x] = TILE.SWITCH;
        out.switches.push(s);
        if (emptyCells.length) {
          const d = emptyCells.pop();
          grid[d.y][d.x] = TILE.DOOR;
          out.doors.push({ ...d, open: false });
        }
      }
    }

    if (opts.features && (opts.features.includes('portals') || opts.features.includes('everything'))) {
      for (let i = 0; i < 2 && emptyCells.length > 1; i++) {
        const a = emptyCells.pop();
        const b = emptyCells.pop();
        grid[a.y][a.x] = TILE.PORTAL;
        grid[b.y][b.x] = TILE.PORTAL;
        out.portals.push({ a, b });
      }
    }

    if (opts.features && (opts.features.includes('hidden') || opts.features.includes('everything'))) {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          if (grid[y][x] === TILE.EMPTY) {
            const neigh = [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((s, d) => s + (grid[y + d[1]][x + d[0]] === TILE.WALL ? 1 : 0), 0);
            if (neigh >= 3 && Math.random() < 0.02) {
              grid[y][x] = TILE.HIDDEN;
              out.hidden.push({ x, y });
            }
          }
        }
      }
    }

    const moving = [];
    if (opts.features && (opts.features.includes('movingwalls') || opts.features.includes('everything'))) {
      for (let i = 0; i < Math.min(6, Math.floor((w * h) / 120)); i++) {
        const c = emptyCells.pop();
        if (!c) break;
        grid[c.y][c.x] = TILE.WALL;
        moving.push({ x: c.x, y: c.y, phase: Math.floor(randfn() * 4) });
      }
    }
    out.movingWalls = moving;

    return out;
  }

  function findPath(grid, start, goal) {
    const h = grid.length, w = grid[0].length;
    const q = [start];
    const seen = new Array(h).fill(0).map(() => new Array(w).fill(false));
    seen[start.y][start.x] = true;
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    while (q.length) {
      const cur = q.shift();
      if (cur.x === goal.x && cur.y === goal.y) return true;
      for (const d of dirs) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (seen[ny][nx]) continue;
        const t = grid[ny][nx];
        if (t === TILE.WALL || t === TILE.DOOR) continue;
        seen[ny][nx] = true;
        q.push({ x: nx, y: ny });
      }
    }
    return false;
  }

  function createRunFromTemplate(template, mode = 'adventure', seedOverride = null) {
    const seed = seedOverride !== null ? seedOverride : Math.floor(Math.random() * 0x7fffffff);
    const randfn = seeded(seed);
    let grid = generateMaze(template.w, template.h, randfn);
    let popped = populateMaze(grid, template, seed + 17);

    let attempts = 0;
    while (!findPath(popped.grid, popped.start, popped.exit) && attempts < 8) {
      attempts++;
      const s = Math.floor(randfn() * 0x7fffffff);
      const mg = generateMaze(template.w, template.h, seeded(s));
      popped = populateMaze(mg, template, s + 17);
    }

    const run = {
      id: 'run-' + Date.now(),
      seed,
      template,
      grid: popped.grid,
      start: popped.start,
      exit: popped.exit,
      orbs: popped.orbs.slice(),
      keys: popped.keys.slice(),
      switches: popped.switches.slice(),
      doors: popped.doors.slice(),
      portals: popped.portals.slice(),
      hidden: popped.hidden.slice(),
      movingWalls: popped.movingWalls.slice(),
      timeLeft: template.time,
      maxTime: template.time,
      score: 0,
      collectedOrbs: 0,
      collectedKeys: 0,
      player: { x: popped.start.x, y: popped.start.y, moveTimer: 0, alive: true },
      abilities: {
        dash: { cooldown: 0 },
        phase: { cooldown: 0, active: 0 },
        scan: { cooldown: 0 },
        slow: { cooldown: 0 },
        pulse: { cooldown: 0 }
      },
      mode,
      lastTick: now(),
      completed: false,
      failed: false,
      hiddenFound: 0,
      runningTime: 0,
      scanned: false
    };
    return run;
  }

  function startRun(run) {
    state.run = run;
    state.mode = 'playing';
    mainMenu.classList.add('hidden');
    gamePanel.classList.remove('hidden');
    resultPanel.classList.add('hidden');
    run.lastTick = now();
    canvas.focus();
    updateHUD();
    cancelAnimationFrame(rafID);
    loop();
  }

  function pauseRun() {
    if (!state.run) return;
    state.mode = 'paused';
    resultTitle.textContent = 'Paused';
    resultStats.innerHTML = `<p>Time left: ${Math.ceil(state.run.timeLeft)}s</p>`;
    resultPanel.classList.remove('hidden');
    cancelAnimationFrame(rafID);
  }

  function resumeRun() {
    if (!state.run) return;
    state.mode = 'playing';
    resultPanel.classList.add('hidden');
    state.run.lastTick = now();
    loop();
  }

  function stopAndBackToMenu() {
    cancelAnimationFrame(rafID);
    state.run = null;
    state.mode = 'menu';
    gamePanel.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    resultPanel.classList.add('hidden');
    levelsPanel.classList.add('hidden');
    howPanel.classList.add('hidden');
    settingsPanel.classList.add('hidden');
  }

  function endRun(success) {
    const run = state.run;
    if (!run) return;
    cancelAnimationFrame(rafID);
    run.completed = success;
    run.failed = !success;
    const timeBonus = Math.max(0, Math.floor(run.timeLeft) * 10);
    const orbBonus = run.collectedOrbs * 25;
    const hiddenBonus = run.hiddenFound * 80;
    const keyBonus = run.collectedKeys * 40;
    run.score += timeBonus + orbBonus + hiddenBonus + keyBonus;

    const tmplId = run.template.id;
    const prevBest = Save.data.best[tmplId] || 0;
    if (run.score > prevBest) Save.data.best[tmplId] = run.score;

    if (success && run.mode === 'adventure') {
      const idx = ADVENTURE_LEVELS.findIndex(l => l.id === tmplId);
      if (idx >= 0 && ADVENTURE_LEVELS[idx + 1]) {
        const nextId = ADVENTURE_LEVELS[idx + 1].id;
        if (!Save.data.unlocked.includes(nextId)) Save.data.unlocked.push(nextId);
      }
    }
    Save.save();

    resultTitle.textContent = success ? 'Level Complete' : 'Run Failed';
    resultStats.innerHTML = `
      <p>Score: ${run.score}</p>
      <p>Time: ${Math.ceil(run.maxTime - run.timeLeft)}s</p>
      <p>Collected Orbs: ${run.collectedOrbs}</p>
      <p>Collected Keys: ${run.collectedKeys}</p>
      <p>Hidden Rooms: ${run.hiddenFound}</p>
      <p>Best Personal Result: ${Save.data.best[tmplId] || 0}</p>
    `;
    resultPanel.classList.remove('hidden');

    state.mode = 'menu';
    state.run = null;
  }

  function updateHUD() {
    if (!state.run) {
      hudLevel.textContent = '';
      hudTime.textContent = '';
      hudScore.textContent = '';
      hudKeys.textContent = '';
      abilitiesDiv.innerHTML = '';
      return;
    }
    const run = state.run;
    const world = WORLDS.find(w => w.id === run.template.world) || WORLDS[0];
    hudLevel.textContent = `${world.name} • ${run.template.id.toUpperCase()}`;
    hudTime.textContent = `Time: ${Math.ceil(run.timeLeft)}s`;
    hudScore.textContent = `Score: ${run.score}`;
    hudKeys.textContent = `Keys: ${run.collectedKeys}`;
    abilitiesDiv.innerHTML = '';
    Object.keys(run.abilities).forEach((key) => {
      const a = run.abilities[key];
      const el = document.createElement('div');
      el.className = 'ability-mini';
      const cooldownLabel = a.cooldown > 0 ? ` (${Math.ceil(a.cooldown)}s)` : '';
      el.textContent = `${key.toUpperCase()}${cooldownLabel}`;
      abilitiesDiv.appendChild(el);
    });
    const bestAll = Object.values(Save.data.best || {});
    const best = bestAll.length ? Math.max(...bestAll) : 0;
    $('#best-display').textContent = `Best: ${best}`;
  }

  btnPause.addEventListener('click', () => {
    if (state.mode === 'playing') pauseRun();
    else if (state.mode === 'paused') resumeRun();
  });

  btnRestart.addEventListener('click', () => {
    if (!state.run) return;
    const template = state.run.template;
    const newRun = createRunFromTemplate(template, state.run.mode, Math.floor(Math.random() * 0x7fffffff));
    startRun(newRun);
  });

  btnBack.addEventListener('click', stopAndBackToMenu);

  btnPlay.addEventListener('click', () => {
    const firstUnlocked = Save.data.unlocked[0] || 'n1';
    const template = ADVENTURE_LEVELS.find(l => l.id === firstUnlocked) || ADVENTURE_LEVELS[0];
    const run = createRunFromTemplate(template, 'adventure');
    startRun(run);
  });

  btnTime.addEventListener('click', () => {
    const template = pick(ADVENTURE_LEVELS);
    const run = createRunFromTemplate(template, 'timetrial');
    startRun(run);
  });

  btnEndless.addEventListener('click', () => {
    const template = { id: 'endless', world: 'fractured', w: 19, h: 13, time: 9999, orbs: 5, keys: 1, features: ['movingwalls', 'portals'] };
    const run = createRunFromTemplate(template, 'endless');
    startRun(run);
  });

  btnDaily.addEventListener('click', () => {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const seed = Array.from(key).reduce((s, c) => s + c.charCodeAt(0), 0);
    const template = { id: 'daily-' + key, world: 'shadow', w: 23, h: 15, time: 140, orbs: 8, keys: 1, features: ['hidden'] };
    const run = createRunFromTemplate(template, 'daily', seed);
    startRun(run);
  });

  btnLevels.addEventListener('click', () => {
    populateLevelSelect();
    mainMenu.classList.add('hidden');
    levelsPanel.classList.remove('hidden');
  });

  $('#levels-back').addEventListener('click', () => {
    levelsPanel.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  btnHow.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    howPanel.classList.remove('hidden');
  });

  $('#how-back').addEventListener('click', () => {
    howPanel.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  btnSettings.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
  });

  $('#settings-back').addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    Save.data.settings.music = optMusic.checked;
    Save.data.settings.sfx = optSfx.checked;
    Save.data.settings.reduce = optReduce.checked;
    Save.data.settings.contrast = optContrast.checked;
    Save.save();
    document.body.classList.toggle('high-contrast', !!Save.data.settings.contrast);
  });

  btnSound.addEventListener('click', () => {
    Save.data.settings.sfx = !Save.data.settings.sfx;
    Save.save();
    btnSound.textContent = Save.data.settings.sfx ? '♪' : '🔇';
  });

  overlayClose.addEventListener('click', () => overlay.classList.add('hidden'));

  btnToMenu.addEventListener('click', stopAndBackToMenu);
  btnReplay.addEventListener('click', () => {
    if (!state.run) return;
    const template = state.run.template;
    const newRun = createRunFromTemplate(template, state.run.mode, Math.floor(Math.random() * 0x7fffffff));
    resultPanel.classList.add('hidden');
    startRun(newRun);
  });

  btnNext.addEventListener('click', () => {
    if (!state.run) return;
    const idx = ADVENTURE_LEVELS.findIndex(l => l.id === state.run.template.id);
    const next = ADVENTURE_LEVELS[idx + 1] || ADVENTURE_LEVELS[0];
    const newRun = createRunFromTemplate(next, 'adventure', Math.floor(Math.random() * 0x7fffffff));
    resultPanel.classList.add('hidden');
    startRun(newRun);
  });

  function populateLevelSelect() {
    levelsList.innerHTML = '';
    ADVENTURE_LEVELS.forEach((lvl) => {
      const el = document.createElement('div');
      el.className = 'level-item';
      const locked = !Save.data.unlocked.includes(lvl.id);
      el.innerHTML = `<strong>${lvl.id.toUpperCase()} — ${WORLDS.find(w => w.id === lvl.world).name}</strong><span> ${lvl.orbs} orbs • ${lvl.keys} keys</span>`;
      const btn = document.createElement('button');
      btn.textContent = locked ? 'Locked' : 'Play';
      btn.disabled = locked;
      btn.addEventListener('click', () => {
        const run = createRunFromTemplate(lvl, 'adventure');
        startRun(run);
      });
      el.appendChild(btn);
      levelsList.appendChild(el);
    });
  }

  function drawBackground(ctx, w, h, palette) {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#020216');
    grad.addColorStop(1, '#04031a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gl = ctx.createRadialGradient(w * 0.25, h * 0.12, 0, w * 0.25, h * 0.12, Math.min(w, h) * 0.9);
    gl.addColorStop(0, `${palette[0]}22`);
    gl.addColorStop(1, 'transparent');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function renderRun(run) {
    if (!ctx) return;
    const world = WORLDS.find(w => w.id === run.template.world) || WORLDS[0];
    const grid = run.grid;
    const h = grid.length, w = grid[0].length;

    const margin = 18;
    const availW = canvas.clientWidth - margin * 2;
    const availH = canvas.clientHeight - margin * 2;
    const tile = Math.floor(Math.min(availW / w, availH / h));
    const totalW = tile * w, totalH = tile * h;
    const startX = Math.round((canvas.clientWidth - totalW) / 2);
    const startY = Math.round((canvas.clientHeight - totalH) / 2 + 10);

    drawBackground(ctx, canvas.clientWidth, canvas.clientHeight, world.palette);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = startX + x * tile, gy = startY + y * tile;
        const t = grid[y][x];
        if (t === TILE.WALL) {
          ctx.fillStyle = '#070d1a';
          ctx.fillRect(gx, gy, tile, tile);
          ctx.strokeStyle = 'rgba(80,200,255,0.08)';
          ctx.strokeRect(gx + 1.5, gy + 1.5, tile - 3, tile - 3);
        } else {
          const floorGrad = ctx.createLinearGradient(gx, gy, gx + tile, gy + tile);
          floorGrad.addColorStop(0, 'rgba(12,18,30,0.8)');
          floorGrad.addColorStop(1, 'rgba(3,6,14,0.7)');
          ctx.fillStyle = floorGrad;
          ctx.fillRect(gx, gy, tile, tile);
        }

        if (t === TILE.ORB) {
          const alpha = 0.6 + 0.4 * Math.sin(run.runningTime * 0.01 + x + y);
          ctx.beginPath();
          ctx.fillStyle = `rgba(0,240,255,${alpha})`;
          ctx.arc(gx + tile / 2, gy + tile / 2, tile * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }

        if (t === TILE.KEY) {
          ctx.save();
          ctx.translate(gx + tile / 2, gy + tile / 2);
          ctx.fillStyle = 'rgba(255,215,107,0.95)';
          ctx.beginPath();
          ctx.arc(0, 0, tile * 0.14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(-tile * 0.02, tile * 0.05, tile * 0.24, tile * 0.08);
          ctx.restore();
        }

        if (t === TILE.SWITCH) {
          ctx.fillStyle = 'rgba(155,92,255,0.9)';
          ctx.fillRect(gx + tile * 0.18, gy + tile * 0.4, tile * 0.64, tile * 0.2);
        }

        if (t === TILE.DOOR) {
          ctx.fillStyle = 'rgba(120,120,255,0.9)';
          ctx.fillRect(gx + tile * 0.06, gy + tile * 0.06, tile * 0.88, tile * 0.88);
        }

        if (t === TILE.PORTAL) {
          const a = 0.6 + 0.4 * Math.sin(run.runningTime * 0.015 + x);
          const grad = ctx.createRadialGradient(gx + tile / 2, gy + tile / 2, tile * 0.05, gx + tile / 2, gy + tile / 2, tile * 0.45);
          grad.addColorStop(0, `rgba(255,150,200,${a})`);
          grad.addColorStop(1, 'rgba(30,10,40,0.0)');
          ctx.fillStyle = grad;
          ctx.fillRect(gx + tile * 0.06, gy + tile * 0.06, tile * 0.88, tile * 0.88);
        }

        if (t === TILE.HIDDEN) {
          if (run.scanned) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(gx + 1, gy + 1, tile - 2, tile - 2);
          }
        }

        if (t === TILE.EXIT) {
          const radius = tile * 0.28 + Math.sin(run.runningTime * 0.02 + x * y) * 3;
          const grd = ctx.createRadialGradient(gx + tile / 2, gy + tile / 2, radius * 0.2, gx + tile / 2, gy + tile / 2, radius * 1.3);
          grd.addColorStop(0, 'rgba(255,220,120,0.9)');
          grd.addColorStop(1, 'rgba(120,40,200,0.05)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(gx + tile / 2, gy + tile / 2, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const px = startX + run.player.x * tile + tile / 2;
    const py = startY + run.player.y * tile + tile / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,240,255,0.95)';
    ctx.beginPath();
    ctx.arc(px, py, tile * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(px, py, tile * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= w; i++) {
      const x = startX + i * tile;
      ctx.moveTo(x + 0.5, startY + 0.5);
      ctx.lineTo(x + 0.5, startY + totalH + 0.5);
    }
    for (let j = 0; j <= h; j++) {
      const y = startY + j * tile;
      ctx.moveTo(startX + 0.5, y + 0.5);
      ctx.lineTo(startX + totalW + 0.5, y + 0.5);
    }
    ctx.stroke();
  }

  function interactAt(run, x, y) {
    const t = run.grid[y][x];
    if (t === TILE.ORB) {
      run.grid[y][x] = TILE.EMPTY;
      run.collectedOrbs++;
      run.score += 50;
      if (Save.data.settings.sfx) AudioEngine.swoosh(0.06);
    }
    if (t === TILE.KEY) {
      run.grid[y][x] = TILE.EMPTY;
      run.collectedKeys++;
      run.score += 100;
      if (Save.data.settings.sfx) AudioEngine.pulse(900, 0.12, 0.08);
    }
    if (t === TILE.SWITCH) {
      run.grid[y][x] = TILE.EMPTY;
      run.score += 30;
      for (const d of run.doors) {
        run.grid[d.y][d.x] = TILE.EMPTY;
      }
      if (Save.data.settings.sfx) AudioEngine.beep(1200, 0.12, 'square', 0.06);
    }
    if (t === TILE.HIDDEN) {
      run.hiddenFound++;
      run.grid[y][x] = TILE.EMPTY;
      run.score += 150;
      if (Save.data.settings.sfx) AudioEngine.pulse(1200, 0.12, 0.08);
    }
    if (t === TILE.PORTAL) {
      if (run.portals && run.portals.length) {
        const pair = run.portals.find(p => (p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y));
        if (pair) {
          const dest = (pair.a.x === x && pair.a.y === y) ? pair.b : pair.a;
          run.player.x = dest.x; run.player.y = dest.y;
          if (Save.data.settings.sfx) AudioEngine.swoosh();
        }
      }
    }
    if (t === TILE.DOOR) {
      if (run.collectedKeys > 0) {
        run.grid[y][x] = TILE.EMPTY;
        run.collectedKeys--;
        run.score += 60;
        if (Save.data.settings.sfx) AudioEngine.beep(1300, 0.08, 'sine', 0.06);
      }
    }
  }

  function step(run, dt) {
    if (run.completed || run.failed) return;
    run.timeLeft -= dt / 1000;
    run.runningTime += dt;

    if (run.timeLeft <= 0) {
      endRun(false);
      return;
    }

    Object.keys(run.abilities).forEach((k) => {
      const a = run.abilities[k];
      if (a.cooldown > 0) a.cooldown = Math.max(0, a.cooldown - dt / 1000);
      if (a.active) a.active = Math.max(0, a.active - dt / 1000);
    });

    const inp = Input.dir;
    if ((inp.x !== 0 || inp.y !== 0) && run.player.moveTimer <= 0) {
      const nx = run.player.x + inp.x, ny = run.player.y + inp.y;
      const w = run.grid[0].length, h = run.grid.length;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const tile = run.grid[ny][nx];
        let passable = (tile !== TILE.WALL && tile !== TILE.DOOR);
        if (run.abilities.phase.active > 0) passable = true;
        if (passable) {
          run.player.x = nx; run.player.y = ny;
          interactAt(run, nx, ny);
          if (Save.data.settings.sfx) AudioEngine.beep(800, 0.06, 'sine', 0.04);
        } else if (Save.data.settings.sfx) {
          AudioEngine.beep(240, 0.04, 'sine', 0.02);
        }
      }
      run.player.moveTimer = 180;
    }
    run.player.moveTimer = Math.max(0, (run.player.moveTimer || 0) - dt);

    // moving walls
    for (const mw of run.movingWalls) {
      const phase = Math.floor((run.runningTime * 0.005 + mw.phase) % 4);
      run.grid[mw.y][mw.x] = phase === 0 ? TILE.WALL : TILE.EMPTY;
    }

    if (run.player.x === run.exit.x && run.player.y === run.exit.y) {
      endRun(true);
    }

    updateHUD();
  }

  function useAbility(name) {
    const run = state.run;
    if (!run) return;
    const ability = run.abilities[name];
    if (!ability || ability.cooldown > 0) return;
    if (name === 'dash') {
      const dx = Input.dir.x || 1;
      const dy = Input.dir.y || 0;
      for (let i = 0; i < 2; i++) {
        const nx = run.player.x + dx, ny = run.player.y + dy;
        if (nx >= 0 && ny >= 0 && nx < run.grid[0].length && ny < run.grid.length && run.grid[ny][nx] !== TILE.WALL) {
          run.player.x = nx; run.player.y = ny;
          interactAt(run, nx, ny);
        } else break;
      }
      ability.cooldown = 3;
      run.score += 5;
      if (Save.data.settings.sfx) AudioEngine.swoosh();
    } else if (name === 'phase') {
      ability.active = 0.8;
      ability.cooldown = 10;
      if (Save.data.settings.sfx) AudioEngine.pulse(1400, 0.12, 0.08);
    } else if (name === 'scan') {
      run.scanned = true;
      setTimeout(() => { if (state.run) state.run.scanned = false; }, 3000);
      ability.cooldown = 8;
      if (Save.data.settings.sfx) AudioEngine.beep(1400, 0.06, 'sine', 0.04);
    }
    updateHUD();
  }

  abilityButtons.forEach((b) => {
    b.addEventListener('click', () => useAbility(b.dataset.ability));
  });

  let rafID = null;
  let lastFrame = now();

  function loop() {
    const t = now();
    const dt = t - lastFrame;
    lastFrame = t;
    if (state.run && state.mode === 'playing') {
      step(state.run, dt);
      renderRun(state.run);
    }
    rafID = requestAnimationFrame(loop);
  }

  function drawLogo() {
    const c = logoCanvas;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, c.width, 0);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#ff3ad1');
    grad.addColorStop(1, '#ffd76b');
    g.fillStyle = '#020219';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = grad;
    g.font = '70px Inter, Arial';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,240,255,0.55)';
    g.shadowBlur = 26;
    g.fillText('NEON NEXUS', c.width / 2, c.height / 2 - 10);
    g.shadowBlur = 10;
    g.font = '18px Inter, Arial';
    g.fillText('THE INFINITE MAZE', c.width / 2, c.height / 2 + 40);
  }

  document.addEventListener('click', () => AudioEngine.startIfNeeded(), { once: true });

  function init() {
    resizeCanvas();
    drawLogo();
    populateLevelSelect();
    body.classList.remove('loading');
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') pauseRun();
  });

  init();
  lastFrame = now();
  rafID = requestAnimationFrame(loop);
})();