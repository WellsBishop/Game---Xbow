
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

window.addEventListener('resize', ()=>{
  W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H;
});

const keys = {};
const mouse = {x: W/2, y: H/2, down: false};
window.addEventListener('keydown', e=> keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e=> keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousemove', e=>{
  const rect = canvas.getBoundingClientRect(); mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', ()=> mouse.down = true);
canvas.addEventListener('mouseup', ()=> mouse.down = false);
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k]=false; mouse.down=false; });

function rand(min,max){ return Math.random()*(max-min)+min }

// Castle & gate
const castle = {x: ()=> W/2, y: 80, width: 420, height: 120, health: 100};

class Xbow{
  constructor(){ this.x = W/2; this.y = castle.y + castle.height - 18; this.r = 18; this.speed = 420; this.vx = 0; this.vy = 0; }
  update(dt){
    // keyboard input influences horizontal velocity
    let move = 0;
    if (keys['a']||keys['arrowleft']) move -= 1;
    if (keys['d']||keys['arrowright']) move += 1;
    if (move){ this.vx += move * this.speed * 0.8 * dt; }
    // integrate velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // damping
    const damp = Math.max(0, 1 - 6 * dt);
    this.vx *= damp; this.vy *= damp;
    // keep near castle top with some vertical allowance for recoil
    const minY = castle.y + castle.height - 48;
    const maxY = castle.y + castle.height - 6;
    this.y = Math.max(minY, Math.min(maxY, this.y));
    // clamp X to canvas
    this.x = Math.max(this.r, Math.min(W-this.r, this.x));
  }
  draw(){
    const ang = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(ang);
    // draw bow body (simple curved limb)
    ctx.lineWidth = 4; ctx.strokeStyle = '#6b3f1f'; ctx.beginPath(); ctx.moveTo(-10, -22); ctx.quadraticCurveTo(-18,0,-10,22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -18); ctx.quadraticCurveTo(18,0,10,18); ctx.stroke();
    // grip
    ctx.fillStyle = '#4a2b12'; ctx.fillRect(-4,-6,8,12);
    // string
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-10,-22); ctx.lineTo(10,-18); ctx.moveTo(-10,22); ctx.lineTo(10,18); ctx.stroke();
    ctx.restore();
  }
}

class Arrow{
  constructor(x,y,vx,vy,damage=1){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.r=5; this.life=2; this.damage=damage; }
  update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; this.life -= dt; }
  draw(){
    // draw an arrow (shaft + head + fletching)
    const ang = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(ang);
    // shaft
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(10,0); ctx.stroke();
    // head
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(6,-4); ctx.lineTo(6,4); ctx.closePath(); ctx.fill();
    // fletching
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-14,-4); ctx.lineTo(-14,4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

class Enemy{
  constructor(x,y,targetX,targetY,type='grunt'){
    this.x=x; this.y=y; this.targetX=targetX; this.targetY=targetY; this.type = type;
    const t = Enemy.types[type];
    this.speed = t.speed; this.maxHealth = t.health; this.health = t.health; this.r = t.r; this.color = t.color;
    const ang = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(ang)*this.speed; this.vy = Math.sin(ang)*this.speed;
  }
  update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; }
  draw(){ ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(this.x - this.r, this.y - this.r - 8, (this.health/this.maxHealth)*(this.r*2), 4); }
}
Enemy.types = {
  grunt: {health:1, speed: 70, r:14, color:'#ff7b7b'},
  heavy: {health:4, speed: 40, r:22, color:'#ffb27b'},
  runner: {health:1, speed:140, r:12, color:'#ffd27b'}
};

class Pickup{
  constructor(x,y,kind){ this.x=x; this.y=y; this.r=10; this.kind=kind; this.life=12; }
  update(dt){ this.life -= dt; }
  draw(){ ctx.fillStyle = this.kind === 'fire' ? '#9fe7a4' : this.kind === 'spread' ? '#9fd3ff' : this.kind === 'damage' ? '#ffd18a' : '#ffe9a8'; ctx.beginPath(); ctx.rect(this.x-8,this.y-8,16,16); ctx.fill(); }
}

const player = new Xbow();
const arrows = [];
const enemies = [];
const pickups = [];
const particles = [];

let lastTime = performance.now();
let lastShot = 0;
const weapon = {name:'Basic', damage:1, cooldown:0.45, spread:1};

let spawnTimer = 0;
let score = 0; let gameOver = false;

// Waves
let wave = 0; let enemiesToSpawn = 0; let spawnedCount = 0; let waveActive = false;

// Game states: 'menu', 'playing', 'gameover'
let gameState = 'menu';

// High score
const HS_KEY = 'xbow_highscore_v1';
let highScore = parseInt(localStorage.getItem(HS_KEY)) || 0;

// Audio (simple FX)
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioCtx ? new AudioCtx() : null;
function playSound(type){
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  if (type === 'shoot'){ o.type='sine'; o.frequency.value = 900; g.gain.value = 0.06; }
  else if (type === 'hit'){ o.type='triangle'; o.frequency.value = 420; g.gain.value = 0.08; }
  else if (type === 'death'){ o.type='sawtooth'; o.frequency.value = 160; g.gain.value = 0.14; }
  else if (type === 'start'){ o.type='sine'; o.frequency.value = 760; g.gain.value = 0.12; }
  const now = audioCtx.currentTime; g.gain.setValueAtTime(g.gain.value, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  o.start(now); o.stop(now + 0.13);
}

function resumeAudioOnGesture(){ if (!audioCtx) return; if (audioCtx.state === 'suspended') audioCtx.resume(); }

// Particles
class Particle{ constructor(x,y,vx,vy,life,color,r=2){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=life; this.color=color; this.r=r; } update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; this.vy += 40*dt; this.life -= dt; } draw(){ ctx.globalAlpha = Math.max(0, this.life/1.2); ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; } }
function spawnParticles(x,y,color,count=10){ for (let i=0;i<count;i++){ const ang = Math.random()*Math.PI*2; const sp = Math.random()*260 + 40; particles.push(new Particle(x,y, Math.cos(ang)*sp, Math.sin(ang)*sp, 0.6 + Math.random()*0.8, color, 2+Math.random()*2)); } }

const WAVE_MAX = 100;
function startWave(){
  wave++;
  spawnedCount = 0;
  // scale slowly early, ramp up toward later waves
  enemiesToSpawn = Math.min(400, Math.max(2, Math.floor(2 + wave * 1.5)));
  waveActive = true; spawnTimer = 0;
}

function spawnEnemy(){
  const side = Math.floor(rand(0,3));
  let x,y;
  if (side===0){ x = rand(20, W-20); y = H+30; }
  else if (side===1){ x = -30; y = rand(100,H-100); }
  else { x = W+30; y = rand(100,H-100); }
  // choose type by wave
  const r = Math.random();
  const t = r < Math.min(0.6,0.6+wave*0.01) ? 'grunt' : r < 0.85 ? 'runner' : 'heavy';
  enemies.push(new Enemy(x,y, W/2, castle.y + castle.height/2, t));
}

function dropPickup(x,y){ const r = Math.random(); if (r < 0.18){ const kinds = ['fire','spread','damage','heal']; pickups.push(new Pickup(x,y,kinds[Math.floor(Math.random()*kinds.length)])); } }

function reset(){
  // Reset to menu state (do not start waves)
  player.x = W/2; arrows.length=0; enemies.length=0; pickups.length=0; particles.length=0; score=0; gameOver=false; castle.health = 100; wave=0; weapon.name='Basic'; weapon.damage=1; weapon.cooldown=0.45; weapon.spread=1; waveActive=false; gameState = 'menu'; }

function startGame(){
  // Fresh start and begin waves
  player.x = W/2; arrows.length=0; enemies.length=0; pickups.length=0; particles.length=0; score=0; gameOver=false; castle.health = 100; wave=0; weapon.name='Basic'; weapon.damage=1; weapon.cooldown=0.45; weapon.spread=1; waveActive=false; gameState = 'playing'; startWave(); playSound('start'); }

function update(dt){ if (gameOver) return; player.update(dt);
  // shooting
  if (mouse.down && gameState === 'playing' && (performance.now()/1000 - lastShot) > weapon.cooldown){ lastShot = performance.now()/1000; const ang = Math.atan2(mouse.y-player.y, mouse.x-player.x); const speed = 900; const spreadCount = weapon.spread; for (let i=0;i<spreadCount;i++){ const off = (i - (spreadCount-1)/2) * 0.12; const a = ang + off; arrows.push(new Arrow(player.x + Math.cos(a)*player.r, player.y + Math.sin(a)*player.r, Math.cos(a)*speed, Math.sin(a)*speed, weapon.damage)); } playSound('shoot'); }

  for (let i=arrows.length-1;i>=0;i--){ arrows[i].update(dt); if (arrows[i].life<=0) arrows.splice(i,1); }
  for (let i=pickups.length-1;i>=0;i--){ pickups[i].update(dt); if (pickups[i].life<=0) pickups.splice(i,1); }

  // spawn logic for current wave (slower start, ramps up)
  if (waveActive){ spawnTimer += dt; const cadence = Math.max(0.25, 0.9 - wave*0.01); if (spawnTimer > cadence && spawnedCount < enemiesToSpawn){ spawnTimer = 0; spawnEnemy(); spawnedCount++; } if (spawnedCount >= enemiesToSpawn && enemies.length === 0){ waveActive = false; // if reached final wave, player wins
      if (wave >= WAVE_MAX){ gameOver = true; // victory
        // store high score
        if (score > highScore){ highScore = score; localStorage.setItem(HS_KEY, String(highScore)); }
      } else { setTimeout(startWave, 1200); } } }

  // update enemies and collisions
  for (let i=enemies.length-1;i>=0;i--){ const e = enemies[i]; e.update(dt);
    // reached gate?
    if (Math.hypot(e.x - W/2, e.y - (castle.y + castle.height/2)) < e.r + 24){ castle.health -= 6; spawnParticles(e.x,e.y,'#ffb27b',12); playSound('hit'); enemies.splice(i,1); if (castle.health <= 0){ gameOver = true; if (score > highScore){ highScore = score; localStorage.setItem(HS_KEY, String(highScore)); } } continue; }
    // arrow collisions
    for (let j=arrows.length-1;j>=0;j--){ const b = arrows[j]; if (Math.hypot(e.x-b.x,e.y-b.y) < e.r + b.r){ e.health -= b.damage; arrows.splice(j,1); spawnParticles(b.x,b.y,'#ffd98a',6); playSound('hit'); if (e.health <= 0){ score += Math.max(1, Math.floor(e.maxHealth)); spawnParticles(e.x,e.y,'#ff7b7b',16); playSound('death'); dropPickup(e.x,e.y); enemies.splice(i,1); if (score > highScore) { highScore = score; localStorage.setItem(HS_KEY, String(highScore)); } } break; } }
  }

  // pickup collection
  for (let i=pickups.length-1;i>=0;i--){ const p = pickups[i]; if (Math.hypot(p.x-player.x,p.y-player.y) < p.r + player.r){ // collect
      if (p.kind === 'fire'){ weapon.cooldown = Math.max(0.08, weapon.cooldown * 0.82); weapon.name = 'Rapid'; }
      else if (p.kind === 'spread'){ weapon.spread = Math.min(5, weapon.spread + 1); weapon.name = weapon.spread>1 ? 'Spread' : weapon.name; }
      else if (p.kind === 'damage'){ weapon.damage += 1; weapon.name = 'Strong'; }
      else if (p.kind === 'heal'){ castle.health = Math.min(100, castle.health + 18); }
      pickups.splice(i,1);
      playSound('start');
    } }

  // update particles
  for (let i=particles.length-1;i>=0;i--){ particles[i].update(dt); if (particles[i].life <= 0) particles.splice(i,1); }
}

function drawCastle(){ // draw a stylized castle at top
  const cx = W/2; const cy = castle.y; const w = castle.width; const h = castle.height;
  // base shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx - w/2 + 6, cy + 8, w, h);
  // main wall
  const grad = ctx.createLinearGradient(cx - w/2, cy, cx + w/2, cy + h);
  grad.addColorStop(0, '#36495f'); grad.addColorStop(1, '#2a3e52');
  ctx.fillStyle = grad; ctx.fillRect(cx - w/2, cy, w, h);
  // battlements
  for (let i=-w/2;i<w/2;i+=40){ ctx.fillStyle='#3f5a72'; ctx.fillRect(cx+i+6, cy-22, 30, 22); ctx.fillStyle='#2f4b61'; ctx.fillRect(cx+i+10, cy-18, 22, 16); }
  // gate with stone arch
  const gateW = 120; const gateH = 68; const gx = cx - gateW/2; const gy = cy + h - gateH;
  ctx.fillStyle='#2b2b2b'; ctx.fillRect(gx, gy, gateW, gateH);
  ctx.strokeStyle='rgba(255,255,255,0.03)'; ctx.lineWidth=2; ctx.strokeRect(gx, gy, gateW, gateH);
  // arch lines
  ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(gx, gy+8); ctx.quadraticCurveTo(cx, gy-22, gx+gateW, gy+8); ctx.stroke();
}

function draw(){ ctx.clearRect(0,0,W,H); drawCastle(); player.draw(); for (const a of arrows) a.draw(); for (const e of enemies) e.draw(); for (const p of pickups) p.draw(); for (const t of particles) t.draw();

  // Draw top-left HUD box (clear, consistent, no overlap)
  const hudX = 16, hudY = 16, hudW = 300, hudH = 120;
  ctx.fillStyle = 'rgba(6,10,16,0.64)'; ctx.fillRect(hudX-4, hudY-6, hudW, hudH);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.strokeRect(hudX-4, hudY-6, hudW, hudH);

  ctx.fillStyle='#e6eef8'; ctx.font='16px system-ui,Arial'; ctx.textAlign='left';
  ctx.fillText('Score: '+score, hudX+8, hudY+20);
  ctx.fillText('Wave: '+wave + (waveActive ? ' (active)' : ' (preparing)'), hudX+8, hudY+44);
  ctx.fillText('Weapon: '+weapon.name, hudX+8, hudY+68);
  ctx.fillText('Dmg:'+weapon.damage+'  Spd:'+weapon.cooldown.toFixed(2)+'  Spread:'+weapon.spread, hudX+8, hudY+92);
  ctx.fillText('High: '+highScore, hudX+180, hudY+20);

  // If in menu show title
  if (gameState === 'menu'){
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font='64px system-ui,Arial'; ctx.textAlign='center'; ctx.fillText('Xbow — Castle Defense', W/2, H/2 - 40);
    ctx.font='20px system-ui,Arial'; ctx.fillText('Click or press Enter to begin — defend the gate!', W/2, H/2 + 8);
    ctx.font='16px system-ui,Arial'; ctx.fillText('High Score: '+highScore, W/2, H/2 + 46);
  }

  // Castle health bar inside HUD
  const barX = hudX + 8; const barY = hudY + hudH - 26; const barW = hudW - 24; const barH = 12;
  ctx.fillStyle = '#222'; ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = '#4be37b'; ctx.fillRect(barX+2, barY+2, Math.max(0, (castle.health/100) * (barW-4)), barH-4);

  if (gameOver){ ctx.fillStyle='rgba(2,6,12,0.7)'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font='48px system-ui,Arial'; ctx.textAlign='center'; if (wave >= WAVE_MAX) ctx.fillText('Victory!', W/2, H/2 - 10); else ctx.fillText('Castle Falls', W/2, H/2 - 10); ctx.font='20px system-ui,Arial'; ctx.fillText('R to Restart — Click to restart', W/2, H/2 + 28); ctx.textAlign='start'; }
}

function loop(now){ const dt = Math.min(0.05,(now - lastTime)/1000); lastTime = now; update(dt); draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

// Start / restart controls
window.addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if (k === 'r') { reset(); }
  if (k === 'enter' || k === ' ') { if (gameState === 'menu' || gameOver) { resumeAudioOnGesture(); startGame(); } }
});

canvas.addEventListener('click', (e)=>{
  // compute click coords relative to canvas
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
  // If menu or game over, start game
  if (gameState === 'menu' || gameOver){ resumeAudioOnGesture(); startGame(); return; }
  // If playing, allow clicking pickups to collect
  if (gameState === 'playing'){
    for (let i=pickups.length-1;i>=0;i--){ const p = pickups[i]; if (Math.hypot(p.x - mx, p.y - my) < p.r + 6){ // collect
          // apply pickup effects (reuse logic)
          if (p.kind === 'fire'){ weapon.cooldown = Math.max(0.08, weapon.cooldown * 0.82); weapon.name = 'Rapid'; }
          else if (p.kind === 'spread'){ weapon.spread = Math.min(5, weapon.spread + 1); weapon.name = weapon.spread>1 ? 'Spread' : weapon.name; }
          else if (p.kind === 'damage'){ weapon.damage += 1; weapon.name = 'Strong'; }
          else if (p.kind === 'heal'){ castle.health = Math.min(100, castle.health + 18); }
          spawnParticles(p.x,p.y,'#9fe7a4',8); playSound('start'); pickups.splice(i,1);
          break;
        } }
  }
});

// start
reset();
