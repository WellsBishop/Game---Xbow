
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

// Background generation - Medieval themed
function generateBackground(){
  // Medieval scene - no need for random elements
}
generateBackground();

window.addEventListener('resize', ()=>{
  W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; generateBackground();
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
    
    // Draw glow effect
    ctx.shadowColor = 'rgba(200,150,100,0.5)';
    ctx.shadowBlur = 15;
    
    // Crossbow stock (wooden handle)
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-2, -8, 20, 16);
    ctx.fillStyle = '#795548';
    ctx.fillRect(0, -6, 18, 12);
    
    // Trigger mechanism
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(8, -2); ctx.lineTo(10, -1); ctx.lineTo(10, 1); ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();
    
    // Crossbow arms (top and bottom curved limbs)
    ctx.strokeStyle = '#8b6f47';
    ctx.lineWidth = 3.5;
    // Top limb
    ctx.beginPath();
    ctx.moveTo(4, -18);
    ctx.quadraticCurveTo(0, -20, -8, -18);
    ctx.stroke();
    // Bottom limb
    ctx.beginPath();
    ctx.moveTo(4, 18);
    ctx.quadraticCurveTo(0, 20, -8, 18);
    ctx.stroke();
    
    // String/rope
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-8, -18); ctx.quadraticCurveTo(-2, 0, -8, 18);
    ctx.stroke();
    
    // Sight post
    ctx.fillStyle = '#c0a080';
    ctx.fillRect(14, -1.5, 4, 3);
    
    ctx.shadowColor = 'transparent';
    ctx.restore();
  }
}

class Arrow{
  constructor(x,y,vx,vy,damage=1){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.r=5; this.life=2; this.damage=damage; }
  update(dt){ this.x += this.vx*dt; this.y += this.vy*dt; this.life -= dt; }
  draw(){
    // draw a crossbow bolt
    const ang = Math.atan2(this.vy, this.vx);
    ctx.save(); ctx.translate(this.x,this.y); ctx.rotate(ang);
    
    // Bolt trail glow
    const trailGrad = ctx.createLinearGradient(-10,0,10,0);
    trailGrad.addColorStop(0,'rgba(200,150,80,0)');
    trailGrad.addColorStop(0.5,'rgba(200,150,80,0.3)');
    trailGrad.addColorStop(1,'rgba(200,150,80,0)');
    ctx.fillStyle = trailGrad;
    ctx.fillRect(-15,-1.5,20,3);
    
    // shaft with darker color (iron)
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(-12, -1, 22, 2);
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-12, -1, 22, 2);
    
    // Broad head (wider than arrow)
    ctx.fillStyle = '#8b7355';
    ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(8,-3.5); ctx.lineTo(8,3.5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 0.5; ctx.stroke();
    
    // fletching (smaller for bolt)
    ctx.fillStyle = '#c9a961';
    ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-10,-2.5); ctx.lineTo(-10,2.5); ctx.closePath(); ctx.fill();
    
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
  draw(){ 
    // Draw medieval enemy
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Shadow beneath
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, this.r+2, this.r*1.2, 3, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Enemy body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, -2, this.r, 0, Math.PI*2);
    ctx.fill();
    
    // Helmet/shield highlight
    ctx.fillStyle = this.type === 'heavy' ? '#a9a9a9' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(-this.r*0.3, -this.r*0.6, this.r*0.4, 0, Math.PI*2);
    ctx.fill();
    
    // Smiley face
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-this.r*0.25, -this.r*0.3, this.r*0.15, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.r*0.25, -this.r*0.3, this.r*0.15, 0, Math.PI*2);
    ctx.fill();
    
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, this.r*0.2, this.r*0.35, 0, Math.PI);
    ctx.stroke();
    
    // Weapon detail (spear)
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.r*0.7, -this.r*0.5);
    ctx.lineTo(this.r*0.7, this.r*1.2);
    ctx.stroke();
    
    ctx.restore();
    
    // Health bar with gradient (underneath)
    const barGrad = ctx.createLinearGradient(this.x-this.r, this.y+this.r+10, this.x+this.r, this.y+this.r+10);
    barGrad.addColorStop(0,'#d32f2f');
    barGrad.addColorStop(1,'#ff6e40');
    
    ctx.fillStyle='rgba(0,0,0,0.5)'; 
    ctx.fillRect(this.x - this.r, this.y + this.r + 10, this.r*2, 4);
    
    ctx.fillStyle=barGrad; 
    ctx.fillRect(this.x - this.r, this.y + this.r + 10, (this.health/this.maxHealth)*(this.r*2), 4);
  }
}
Enemy.types = {
  grunt: {health:1, speed: 70, r:14, color:'#8B4513'},  // Footsoldier (brown)
  heavy: {health:4, speed: 40, r:22, color:'#696969'},   // Knight (gray armor)
  runner: {health:1, speed:140, r:12, color:'#CD853F'}   // Archer (tan/bronze)
};

class Pickup{
  constructor(x,y,kind){ this.x=x; this.y=y; this.r=10; this.kind=kind; this.life=12; }
  update(dt){ this.life -= dt; }
  draw(){ 
    // Draw medieval pickups with glow and rotation
    const items = {
      'fire': {color: '#ff6b6b', glow: '#ff4444', symbol: '⚔'},   // Red sword - rapid fire
      'spread': {color: '#87ceeb', glow: '#4169e1', symbol: '◆'},   // Blue gem - spread
      'damage': {color: '#ffd700', glow: '#ff8c00', symbol: '✦'},   // Gold star - damage
      'heal': {color: '#90ee90', glow: '#228b22', symbol: '✚'}      // Green cross - heal
    };
    const data = items[this.kind] || items.fire;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((Date.now() * 0.003) % (Math.PI*2));
    
    // Glow
    ctx.shadowColor = data.glow;
    ctx.shadowBlur = 14;
    
    // Treasure chest shape
    ctx.fillStyle = data.color; 
    ctx.beginPath();
    ctx.moveTo(-8,-6);
    ctx.lineTo(8,-6);
    ctx.lineTo(8,4);
    ctx.lineTo(-8,4);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Lid
    ctx.fillStyle = data.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, -6, 8, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-6,-4,5,3);
    
    ctx.shadowColor = 'transparent';
    ctx.restore();
  }
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
class Particle{ 
  constructor(x,y,vx,vy,life,color,r=2){ 
    this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=life; this.color=color; this.r=r; this.maxLife=life;
  } 
  update(dt){ 
    this.x += this.vx*dt; this.y += this.vy*dt; this.vy += 40*dt; this.life -= dt; 
  } 
  draw(){ 
    const alpha = Math.max(0, this.life/this.maxLife);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = this.color; 
    ctx.beginPath(); 
    ctx.arc(this.x,this.y,this.r,0,Math.PI*2); 
    ctx.fill(); 
    ctx.globalAlpha = 1; 
  } 
}

function spawnParticles(x,y,color,count=10){ 
  for (let i=0;i<count;i++){ 
    const ang = Math.random()*Math.PI*2; 
    const sp = Math.random()*260 + 40; 
    const life = 0.6 + Math.random()*0.8;
    const size = 2+Math.random()*3;
    particles.push(new Particle(x,y, Math.cos(ang)*sp, Math.sin(ang)*sp, life, color, size)); 
  } 
}

const WAVE_MAX = 100;
function startWave(){
  wave++;
  spawnedCount = 0;
  // scale slowly early, ramp up toward later waves
  enemiesToSpawn = Math.min(400, Math.max(2, Math.floor(2 + wave * 1.5)));
  waveActive = true; spawnTimer = 0;
}

function spawnEnemy(){
  let x, y;
  const r = Math.random();
  
  // 85% spawn from bottom (the path), 15% from sides
  if (r < 0.85) {
    x = rand(W/2 - 80, W/2 + 80);  // Narrow path up middle
    y = H + 30;
  } else if (r < 0.925) {
    x = -30;
    y = rand(H/2, H-50);
  } else {
    x = W + 30;
    y = rand(H/2, H-50);
  }
  
  // choose type by wave
  const enemyRand = Math.random();
  const t = enemyRand < Math.min(0.6, 0.6 + wave*0.01) ? 'grunt' : enemyRand < 0.85 ? 'runner' : 'heavy';
  enemies.push(new Enemy(x, y, W/2, castle.y + castle.height/2, t));
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

function drawCastle(){ 
  // draw a stylized castle at top
  const cx = W/2; const cy = castle.y; const w = castle.width; const h = castle.height;
  
  // base shadow with gradient
  const shadowGrad = ctx.createLinearGradient(0, cy + h - 20, 0, cy + h + 10);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(cx - w/2 + 6, cy + 8, w, h);
  
  // main wall with gradient
  const grad = ctx.createLinearGradient(cx - w/2, cy, cx + w/2, cy + h);
  grad.addColorStop(0, '#5a7a94');
  grad.addColorStop(0.5, '#3f5a72');
  grad.addColorStop(1, '#2a3e52');
  ctx.fillStyle = grad; 
  ctx.fillRect(cx - w/2, cy, w, h);
  
  // Stone texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let i=0; i<8; i++){
    ctx.beginPath();
    ctx.moveTo(cx-w/2, cy+i*h/8);
    ctx.lineTo(cx+w/2, cy+i*h/8);
    ctx.stroke();
  }
  
  // battlements with glow
  ctx.shadowColor = 'rgba(100,150,200,0.4)';
  ctx.shadowBlur = 8;
  for (let i=-w/2;i<w/2;i+=40){ 
    const bgrad = ctx.createLinearGradient(cx+i+6, cy-22, cx+i+6, cy);
    bgrad.addColorStop(0, '#5a7a94');
    bgrad.addColorStop(1, '#3f5a72');
    ctx.fillStyle=bgrad; 
    ctx.fillRect(cx+i+6, cy-22, 30, 22); 
    ctx.fillStyle='#2f4b61'; 
    ctx.fillRect(cx+i+10, cy-18, 22, 16); 
  }
  ctx.shadowColor = 'transparent';
  
  // gate with stone arch
  const gateW = 120; const gateH = 68; const gx = cx - gateW/2; const gy = cy + h - gateH;
  
  // Gate glow based on health
  const healthGlow = castle.health > 50 ? '#00ff00' : castle.health > 25 ? '#ffaa00' : '#ff4444';
  ctx.shadowColor = healthGlow;
  ctx.shadowBlur = 20;
  
  ctx.fillStyle='#1a1a1a'; 
  ctx.fillRect(gx, gy, gateW, gateH);
  ctx.strokeStyle=healthGlow; 
  ctx.lineWidth=2; 
  ctx.strokeRect(gx, gy, gateW, gateH);
  
  // arch lines with glow
  ctx.strokeStyle='rgba(100,150,200,0.4)'; 
  ctx.lineWidth=2; 
  ctx.beginPath(); 
  ctx.moveTo(gx, gy+8); 
  ctx.quadraticCurveTo(cx, gy-22, gx+gateW, gy+8); 
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
}

function drawBackground(){
  // Medieval outdoor background - sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#87ceeb');      // Light blue sky
  skyGrad.addColorStop(0.6, '#b0d4f1');    // Lighter at horizon
  skyGrad.addColorStop(1, '#8b7355');      // Ground (dirt)
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);
  
  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 5; i++){
    const cloudX = ((Date.now() * 0.00003 + i * 0.2) % 1.5) * W - W*0.25;
    const cloudY = 60 + i * 40;
    ctx.beginPath();
    ctx.arc(cloudX, cloudY, 30, 0, Math.PI*2);
    ctx.arc(cloudX+35, cloudY, 40, 0, Math.PI*2);
    ctx.arc(cloudX+70, cloudY, 30, 0, Math.PI*2);
    ctx.fill();
  }
  
  // Stone path leading up to castle
  const pathStartX = W/2;
  const pathEndX = W/2;
  const pathStartY = H;
  const pathEndY = castle.y + castle.height + 40;
  const pathWidth = 140;
  
  // Path gradient (stone/dirt)
  const pathGrad = ctx.createLinearGradient(pathStartX - pathWidth/2, pathStartY, pathEndX - pathWidth/2, pathEndY);
  pathGrad.addColorStop(0, '#9b8b7e');  // Lighter at bottom
  pathGrad.addColorStop(1, '#7a6a5d');  // Darker at top
  ctx.fillStyle = pathGrad;
  ctx.beginPath();
  ctx.moveTo(pathStartX - pathWidth/2, pathStartY);
  ctx.lineTo(pathStartX + pathWidth/2, pathStartY);
  ctx.lineTo(pathEndX + pathWidth/2, pathEndY);
  ctx.lineTo(pathEndX - pathWidth/2, pathEndY);
  ctx.closePath();
  ctx.fill();
  
  // Path edges (stone)
  ctx.strokeStyle = '#5a4a3d';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Stone pavers on path
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 15; i++){
    const y = pathStartY - (i / 14) * (pathStartY - pathEndY);
    const width = pathWidth * (1 - (i / 14) * 0.3);
    const offsetX = pathStartX - width/2;
    
    ctx.beginPath();
    ctx.moveTo(offsetX, y);
    ctx.lineTo(offsetX + width, y);
    ctx.stroke();
  }
  
  // Grass along path edges
  ctx.fillStyle = '#4a7c2c';
  ctx.beginPath();
  ctx.moveTo(0, pathStartY);
  ctx.lineTo(pathStartX - pathWidth/2, pathStartY);
  ctx.lineTo(pathStartX - pathWidth/2, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(pathStartX + pathWidth/2, pathStartY);
  ctx.lineTo(W, pathStartY);
  ctx.lineTo(W, H);
  ctx.lineTo(pathStartX + pathWidth/2, H);
  ctx.closePath();
  ctx.fill();
}

function draw(){ 
  drawBackground();
  drawCastle(); 
  player.draw(); 
  for (const a of arrows) a.draw(); 
  for (const e of enemies) e.draw(); 
  for (const p of pickups) p.draw(); 
  for (const t of particles) t.draw();

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
