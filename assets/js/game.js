(function () {
  // ===== Canvas & scaling =====
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const c = canvas.getContext("2d");

  const BASE_W = 960, BASE_H = 540, RATIO = BASE_W / BASE_H;
  function resize() {
    const w = Math.min(canvas.parentElement?.clientWidth || BASE_W, BASE_W);
    const h = Math.round(w / RATIO);
    canvas.width = BASE_W;
    canvas.height = BASE_H;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }
  window.addEventListener("resize", resize);

  // ===== Game state (FSM) =====
  // states: 'ready', 'play', 'paused', 'dead'
  let state = "ready";
  let score = 0, wave = 1, lives = 3, time = 0;

  // Player
  const ship = { x: BASE_W / 2, y: BASE_H - 80, w: 44, h: 18, speed: 10, cooldown: 0 };
  const bullets = [];   // {x,y,v}
  const enemies = [];   // {x,y,w,h,hp,vy,pattern,t}
  const ebullets = [];  // enemy bullets
  const drops = [];     // powerups {x,y,t,vy,type}

  // Input
  let left = false, right = false, firing = false;

  // ===== Utility =====
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function rects(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  // ===== Spawning =====
  function spawnWave(n = 8 + wave * 2) {
    enemies.length = 0; ebullets.length = 0; bullets.length = 0; drops.length = 0;
    const lanes = 10, laneW = BASE_W / lanes;
    for (let i = 0; i < n; i++) {
      const lane = Math.floor(Math.random() * lanes);
      const x = lane * laneW + laneW / 2 - 18;
      const y = rr(-200, -40);
      const hp = Math.random() < 0.15 ? 3 : 2;
      const vy = rr(1.6, 2.8) + wave * 0.1;
      const pattern = Math.random() < 0.4 ? "sine" : "straight";
      enemies.push({ x, y, w: 36, h: 24, hp, vy, t: rr(0, 1000), pattern });
    }
  }

  function dropPower(x, y) {
    const types = ["WIDE", "RAPID", "BOMB"]; // paddle wide -> here wide shot; rapid fire; bomb clears bullets
    const type = types[Math.floor(Math.random() * types.length)];
    drops.push({ x, y, t: 0, vy: 2.2, type });
  }

  // ===== Player actions =====
  function shoot() {
    if (ship.cooldown > 0) return;
    ship.cooldown = rapidFire ? 6 : 12;
    // spread when wideShot is active
    const spread = wideShot ? [-0.18, 0, 0.18] : [0];
    spread.forEach((ang) => {
      bullets.push({ x: ship.x - 2, y: ship.y - 18, v: -9, ang });
    });
  }

  // Power states
  let wideShot = false, rapidFire = false;
  let powerTimers = { wide: 0, rapid: 0 };

  // ===== Enemy AI =====
  function enemyShoot(e) {
    if (Math.random() < 0.01 + wave * 0.0015) {
      ebullets.push({ x: e.x + e.w / 2 - 2, y: e.y + e.h, v: 4.0 + wave * 0.1 });
    }
  }

  // ===== Update =====
  function update() {
    time++;

    // input -> move
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    ship.x = clamp(ship.x + dx * ship.speed, 20, BASE_W - 20);
    if (firing && state === "play") shoot();
    if (ship.cooldown > 0) ship.cooldown--;

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += b.v;
      if (b.ang) b.x += Math.sin(time * 0.05) * b.ang * 9;
      if (b.y < -20) bullets.splice(i, 1);
    }

    // enemies
    let alive = 0;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += 0.05;
      if (e.pattern === "sine") e.x += Math.sin(e.t) * 1.6;
      e.y += e.vy;
      enemyShoot(e);
      if (e.y > BASE_H + 40) enemies.splice(i, 1);
      else alive++;
    }

    // enemy bullets
    for (let i = ebullets.length - 1; i >= 0; i--) {
      const b = ebullets[i];
      b.y += b.v;
      if (b.y > BASE_H + 20) ebullets.splice(i, 1);
    }

    // drops
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.y += d.vy;
      if (d.y > BASE_H + 30) drops.splice(i, 1);
    }

    // collisions: bullets -> enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        if (rects({ x: b.x - 3, y: b.y - 6, w: 6, h: 12 }, e)) {
          bullets.splice(j, 1);
          e.hp--;
          score += 5;
          if (e.hp <= 0) {
            // chance to drop
            if (Math.random() < 0.15) dropPower(e.x + e.w / 2, e.y + e.h / 2);
            enemies.splice(i, 1);
            score += 15;
          }
          break;
        }
      }
    }

    // collisions: player with enemy bullets / enemies / drops
    const shipBox = { x: ship.x - ship.w / 2, y: ship.y - ship.h / 2, w: ship.w, h: ship.h };
    for (let i = ebullets.length - 1; i >= 0; i--) {
      const b = ebullets[i];
      if (rects(shipBox, { x: b.x - 3, y: b.y - 6, w: 6, h: 12 })) {
        ebullets.splice(i, 1);
        hitPlayer();
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (rects(shipBox, e)) {
        enemies.splice(i, 1);
        hitPlayer();
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      if (rects(shipBox, { x: d.x - 9, y: d.y - 9, w: 18, h: 18 })) {
        if (d.type === "WIDE") { wideShot = true; powerTimers.wide = 900; }     // ~15s
        if (d.type === "RAPID") { rapidFire = true; powerTimers.rapid = 900; }  // ~15s
        if (d.type === "BOMB") { ebullets.length = 0; }                          // clear bullets
        drops.splice(i, 1);
      }
    }

    // power timers
    if (powerTimers.wide > 0) { powerTimers.wide--; if (powerTimers.wide === 0) wideShot = false; }
    if (powerTimers.rapid > 0) { powerTimers.rapid--; if (powerTimers.rapid === 0) rapidFire = false; }

    // wave cleared -> next wave
    if (alive === 0 && enemies.length === 0) {
      wave++;
      spawnWave();
      // small grace: refill a life every 3 waves
      if (wave % 3 === 0) lives = Math.min(5, lives + 1);
    }
  }

  function hitPlayer() {
    lives--;
    if (lives <= 0) {
      state = "dead";
      saveScore();
    } else {
      // small invuln reset
      ship.x = BASE_W / 2;
    }
  }

  // ===== Drawing =====
  function drawBG(now) {
    c.clearRect(0, 0, BASE_W, BASE_H);
    // parallax glow
    c.fillStyle = "rgba(167,139,250,.06)";
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(140 + i * 160, 100 + 18 * Math.sin(now * 0.001 + i), 60 + 10 * i, 0, Math.PI * 2);
      c.fill();
    }
    // top and bottom lines
    c.fillStyle = "rgba(255,255,255,.08)";
    c.fillRect(0, 60, BASE_W, 1);
    c.fillRect(0, BASE_H - 60, BASE_W, 1);
  }

  function drawShip() {
    // body
    c.save();
    c.translate(ship.x, ship.y);
    c.fillStyle = "#a78bfa";
    c.beginPath();
    c.moveTo(0, -18); c.lineTo(22, 16); c.lineTo(-22, 16); c.closePath();
    c.fill();
    // cockpit
    c.fillStyle = "#60a5fa";
    c.fillRect(-6, -2, 12, 8);
    c.restore();
  }

  function drawBullets() {
    c.fillStyle = "#93c5fd";
    bullets.forEach((b) => { c.fillRect(b.x - 2, b.y - 8, 4, 12); });
    c.fillStyle = "#fca5a5";
    ebullets.forEach((b) => { c.fillRect(b.x - 2, b.y - 8, 4, 12); });
  }

  function drawEnemies() {
    enemies.forEach((e) => {
      c.fillStyle = e.hp >= 3 ? "#fb7185" : "#f472b6";
      c.fillRect(e.x, e.y, e.w, e.h);
      c.fillStyle = "rgba(255,255,255,.2)";
      c.fillRect(e.x + 6, e.y + 4, e.w - 12, e.h - 8);
    });
  }

  function drawDrops() {
    drops.forEach((d) => {
      c.fillStyle = d.type === "WIDE" ? "#22d3ee" : d.type === "RAPID" ? "#fbbf24" : "#fb7185";
      c.beginPath(); c.arc(d.x, d.y, 9, 0, Math.PI * 2); c.fill();
    });
  }

  function drawHUD() {
    c.fillStyle = "rgba(255,255,255,.92)";
    c.font = "18px Inter, Arial";
    c.fillText(`Score: ${Math.floor(score)}`, 16, 30);
    c.fillText(`Lives: ${lives}`, 160, 30);
    c.fillText(`Wave: ${wave}`, 250, 30);
    if (state === "ready") {
      c.font = "22px Inter, Arial";
      c.fillText("Click/Space to START — Move with ←/→ or drag", 260, BASE_H - 24);
    } else if (state === "paused") {
      c.font = "26px Inter, Arial";
      c.fillText("Paused — press P / Resume", 360, BASE_H / 2);
    } else if (state === "dead") {
      c.font = "26px Inter, Arial";
      c.fillText("Game Over — R to Restart", 360, BASE_H / 2);
    }
    if (wideShot) { c.fillStyle = "#22d3ee"; c.fillText("Wide Shot", BASE_W - 140, 30); }
    if (rapidFire) { c.fillStyle = "#fbbf24"; c.fillText("Rapid Fire", BASE_W - 140, 52); }
  }

  // ===== Persistence (local leaderboard) =====
  function saveScore() {
    try {
      const name =
        (localStorage.getItem("nn_name") ||
          prompt("Nickname for leaderboard? (optional)") ||
          "Player").trim().slice(0, 20) || "Player";
      localStorage.setItem("nn_name", name);
      const entry = { name, score: Math.floor(score), at: Date.now() };
      const keyNew = "nn_leaderboard", keyOld = "ar_leaderboard";
      const arrNew = JSON.parse(localStorage.getItem(keyNew) || "[]");
      arrNew.push(entry); arrNew.sort((a, b) => b.score - a.score);
      localStorage.setItem(keyNew, JSON.stringify(arrNew.slice(0, 50)));
      const arrOld = JSON.parse(localStorage.getItem(keyOld) || "[]");
      arrOld.push(entry); arrOld.sort((a, b) => b.score - a.score);
      localStorage.setItem(keyOld, JSON.stringify(arrOld.slice(0, 50)));
    } catch (e) {}
  }

  // ===== Loop =====
  function loop(now) {
    drawBG(now);
    if (state === "play") update();
    drawEnemies();
    drawDrops();
    drawBullets();
    drawShip();
    drawHUD();
    requestAnimationFrame(loop);
  }

  // ===== Controls (keyboard/mouse/touch) =====
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") right = true;
    if (e.key === " " || e.key === "Enter") {
      if (state === "ready") state = "play";
      firing = true;
    }
    if (e.key === "p" || e.key === "P") {
      if (state === "play") state = "paused";
      else if (state === "paused") state = "play";
    }
    if (e.key === "r" || e.key === "R") {
      startGame(); // hard restart
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") right = false;
    if (e.key === " " || e.key === "Enter") firing = false;
  }, { passive: true });

  function pointerX(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const scale = BASE_W / r.width;
    return x * scale;
  }
  ["mousemove", "pointermove", "touchmove"].forEach(ev => {
    canvas.addEventListener(ev, (e) => {
      ship.x = clamp(pointerX(e), 20, BASE_W - 20);
    }, { passive: true });
  });
  ["mousedown", "pointerdown", "touchstart"].forEach(ev => {
    canvas.addEventListener(ev, (e) => {
      if (state === "ready") state = "play";
      firing = true;
    }, { passive: true });
  });
  ["mouseup", "pointerup", "touchend", "mouseleave"].forEach(ev => {
    canvas.addEventListener(ev, () => { firing = false; }, { passive: true });
  });

  // Buttons
  const bp = document.getElementById("btn-pause");
  if (bp) bp.addEventListener("click", () => {
    if (state === "play") { state = "paused"; bp.textContent = "Resume"; }
    else if (state === "paused") { state = "play"; bp.textContent = "Pause"; }
    else if (state === "ready") { state = "play"; bp.textContent = "Pause"; }
    else if (state === "dead") { startGame(); bp.textContent = "Pause"; }
  });
  const br = document.getElementById("btn-restart");
  if (br) br.addEventListener("click", () => { startGame(); });

  // ===== Start/reset =====
  function startGame() {
    state = "play";
    score = 0; wave = 1; lives = 3; time = 0;
    ship.x = BASE_W / 2; ship.y = BASE_H - 80; ship.cooldown = 0;
    bullets.length = 0; enemies.length = 0; ebullets.length = 0; drops.length = 0;
    wideShot = false; rapidFire = false; powerTimers = { wide: 0, rapid: 0 };
    spawnWave();
    const bp2 = document.getElementById("btn-pause"); if (bp2) bp2.textContent = "Pause";
  }

  // ===== Init =====
  resize();
  state = "ready";
  spawnWave();
  requestAnimationFrame(loop);
})();
