// 🤖 Kämpfer aus Stahl ⚔️
// Steuere deinen Mech, kämpfe mit deinem Team und gewinne in verschiedenen Spielmodi!
'use strict';

const canvas = document.getElementById('spiel');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ===== Einstellungen (hier kannst du rumprobieren!) =====
const WELT_B = 2400, WELT_H = 1400;   // Größe der Arena
const TEAM_GROESSE = 4;               // So viele Mechs pro Team
const MECH_RADIUS = 26;               // Wie dick ein Mech ist
const MECH_LEBEN = 100;               // Lebenspunkte
const TEMPO = 170;                    // Wie schnell Mechs laufen
const BOOST_TEMPO = 560;              // Wie schnell der Boost ist
const BOOST_DAUER = 0.25;             // Wie lange der Boost dauert (Sekunden)
const BOOST_PAUSE = 2.5;              // Sekunden bis zum nächsten Boost
const MG_PAUSE = 0.11;                // Zeit zwischen zwei MG-Schüssen
const MG_SCHADEN = 6;                 // Schaden pro MG-Kugel
const MG_TEMPO = 900;                 // Wie schnell die Kugeln fliegen
const MG_WEITE = 650;                 // Wie weit die Kugeln fliegen
const MG_STREUUNG = 0.05;             // Wie ungenau das MG ist
const RAKETE_PAUSE = 4;               // Sekunden bis zur nächsten Rakete
const RAKETE_SCHADEN = 40;            // Schaden in der Mitte der Explosion
const RAKETE_RADIUS = 85;             // Wie groß die Explosion ist
const RAKETE_TEMPO = 480;
const RAKETE_WEITE = 750;
const NEUSTART_ZEIT = 5;              // Sekunden, bis ein zerstörter Mech wiederkommt
const SCHUTZ_ZEIT = 2;                // Schutzschild nach dem Neustart
const HEILEN_NACH = 4;                // Nach so vielen Sekunden ohne Treffer ...
const HEILEN_TEMPO = 12;              // ... heilt man so viel pro Sekunde
const BOT_UNGENAU = 0.13;             // Wie schlecht die Bots zielen (größer = schlechter)
const BOT_FEUER_LANGSAMER = 1.5;      // Bots schießen etwas langsamer als du

const TEAMS = {
  blau: { name: 'Team Blau', farbe: '#3b82f6', dunkel: '#1e3a8a', hell: '#93c5fd' },
  rot:  { name: 'Team Rot',  farbe: '#ef4444', dunkel: '#7f1d1d', hell: '#fca5a5' },
};
const NAMEN = { blau: ['DU', 'Blitz', 'Titan', 'Funke'], rot: ['Kralle', 'Donner', 'Rost', 'Viper'] };
const anderes = team => team === 'blau' ? 'rot' : 'blau';

// ===== Spielmodi =====
const MODI = [
  { id: 'punkt',        emoji: '🚩', name: 'Punkt halten', text: 'Erobere den Punkt in der Mitte und halte ihn! Wer zuerst 100 Punkte hat, gewinnt.' },
  { id: 'angriff',      emoji: '⚔️', name: 'Angriff',      text: 'Dein Team greift an: Erobere erst Punkt A, dann Punkt B, bevor die Zeit abläuft!' },
  { id: 'verteidigung', emoji: '🛡️', name: 'Verteidigung', text: 'Dein Team verteidigt: Halte die Angreifer von A und B fern, bis die Zeit abläuft!' },
  { id: 'team',         emoji: '💥', name: 'Team-Kampf',   text: 'Zerstöre die gegnerischen Mechs! Das erste Team mit 20 Abschüssen gewinnt.' },
];
const PUNKT_ZIEL = 100;       // Punkt halten: So viele Punkte zum Sieg
const ABSCHUSS_ZIEL = 20;     // Team-Kampf: So viele Abschüsse zum Sieg
const ANGRIFF_ZEIT = 150;     // Angriff: Startzeit in Sekunden
const ANGRIFF_BONUS = 90;     // Angriff: Extra-Zeit, wenn Punkt A erobert ist
const EROBERN_TEMPO = 6;      // Angriff: So schnell wird ein Punkt erobert (Prozent pro Sekunde)

// ===== Die Arena =====
// Wände auf der linken Seite. Die rechte Seite wird automatisch gespiegelt!
const WAENDE_LINKS = [
  { x: 320, y: 250, w: 40, h: 250 }, { x: 320, y: 900, w: 40, h: 250 },
  { x: 430, y: 620, w: 120, h: 160 },
  { x: 600, y: 120, w: 60, h: 250 }, { x: 600, y: 1030, w: 60, h: 250 },
  { x: 820, y: 380, w: 200, h: 50 }, { x: 820, y: 970, w: 200, h: 50 },
  { x: 960, y: 600, w: 50, h: 200 },
  { x: 1000, y: 100, w: 60, h: 160 }, { x: 1000, y: 1140, w: 60, h: 160 },
  { x: 1100, y: 560, w: 40, h: 40 }, { x: 1100, y: 800, w: 40, h: 40 },   // Kisten am Punkt
];
const WAENDE_MITTE = [{ x: 1170, y: 200, w: 60, h: 220 }, { x: 1170, y: 980, w: 60, h: 220 }];
const WAENDE = [...WAENDE_MITTE];
for (const r of WAENDE_LINKS) WAENDE.push(r, { x: WELT_B - r.x - r.w, y: r.y, w: r.w, h: r.h });

// ===== Hilfsfunktionen =====
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const begrenzt = (v, min, max) => Math.max(min, Math.min(max, v));
const zufall = arr => arr[Math.floor(Math.random() * arr.length)];
const winkelDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function drehe(a, ziel, max) { return a + begrenzt(winkelDiff(a, ziel), -max, max); }

function rr(x, y, w, h, r) {   // Rechteck mit runden Ecken
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function kreis(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function text(t, x, y, groesse, farbe = '#fff', ausrichtung = 'center', rand = true) {
  ctx.font = `bold ${groesse}px system-ui, sans-serif`;
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  if (rand) {
    ctx.lineWidth = Math.max(2, groesse / 6);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = farbe;
  ctx.fillText(t, x, y);
}
function umbrechen(t, x, y, maxB, zeilenH, groesse, farbe) {
  ctx.font = `bold ${groesse}px system-ui, sans-serif`;
  let zeile = '';
  for (const wort of t.split(' ')) {
    const probe = zeile ? zeile + ' ' + wort : wort;
    if (ctx.measureText(probe).width > maxB && zeile) {
      text(zeile, x, y, groesse, farbe, 'left', false);
      zeile = wort; y += zeilenH;
    } else zeile = probe;
  }
  if (zeile) text(zeile, x, y, groesse, farbe, 'left', false);
}
function uhr(s) {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Trifft die Linie von (x1,y1) nach (x2,y2) das Rechteck? ("rand" macht das Rechteck dicker)
function linieTrifft(x1, y1, x2, y2, r, rand = 0) {
  const rx = r.x - rand, ry = r.y - rand, rw = r.w + 2 * rand, rh = r.h + 2 * rand;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy], q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function sichtFrei(a, b, rand = 0) {
  for (const r of WAENDE) if (linieTrifft(a.x, a.y, b.x, b.y, r, rand)) return false;
  return true;
}
const inWand = (x, y) => WAENDE.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);

// ===== Wegfinden für die Bots (A*-Algorithmus) =====
// Die Arena wird in Kästchen aufgeteilt. Die Bots suchen den kürzesten Weg durch die freien Kästchen.
const ZELLE = 40, GX = WELT_B / ZELLE, GY = WELT_H / ZELLE;
const frei = new Uint8Array(GX * GY);
for (let gy = 0; gy < GY; gy++) {
  for (let gx = 0; gx < GX; gx++) {
    const x = gx * ZELLE + ZELLE / 2, y = gy * ZELLE + ZELLE / 2;
    const rand = MECH_RADIUS + 2;
    const blockiert = WAENDE.some(r => x > r.x - rand && x < r.x + r.w + rand && y > r.y - rand && y < r.y + r.h + rand);
    const amRand = x < MECH_RADIUS || y < MECH_RADIUS || x > WELT_B - MECH_RADIUS || y > WELT_H - MECH_RADIUS;
    frei[gy * GX + gx] = blockiert || amRand ? 0 : 1;
  }
}
const NACHBARN = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
function zelleBei(x, y) {
  const gx = begrenzt(Math.floor(x / ZELLE), 0, GX - 1), gy = begrenzt(Math.floor(y / ZELLE), 0, GY - 1);
  if (frei[gy * GX + gx]) return gy * GX + gx;
  // Nächstes freies Kästchen suchen
  for (let r = 1; r < 6; r++) {
    for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
      const nx = gx + ox, ny = gy + oy;
      if (nx >= 0 && ny >= 0 && nx < GX && ny < GY && frei[ny * GX + nx]) return ny * GX + nx;
    }
  }
  return -1;
}
function wegFinden(von, nach) {
  const s = zelleBei(von.x, von.y), z = zelleBei(nach.x, nach.y);
  if (s < 0 || z < 0) return [];
  const N = GX * GY;
  const g = new Float32Array(N).fill(1e9), f = new Float32Array(N).fill(1e9);
  const vor = new Int32Array(N).fill(-1), zu = new Uint8Array(N), istOffen = new Uint8Array(N);
  const zx = z % GX, zy = (z / GX) | 0;
  const schaetzung = c => { const dx = Math.abs(c % GX - zx), dy = Math.abs(((c / GX) | 0) - zy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const offen = [s];
  g[s] = 0; f[s] = schaetzung(s); istOffen[s] = 1;
  while (offen.length) {
    let bi = 0;
    for (let i = 1; i < offen.length; i++) if (f[offen[i]] < f[offen[bi]]) bi = i;
    const c = offen[bi];
    offen[bi] = offen[offen.length - 1]; offen.pop(); istOffen[c] = 0;
    if (c === z) break;
    zu[c] = 1;
    const cx = c % GX, cy = (c / GX) | 0;
    for (const [ox, oy, k] of NACHBARN) {
      const nx = cx + ox, ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= GX || ny >= GY) continue;
      const n = ny * GX + nx;
      if (!frei[n] || zu[n]) continue;
      if (ox && oy && (!frei[cy * GX + nx] || !frei[ny * GX + cx])) continue;   // nicht um Ecken schneiden
      const ng = g[c] + k;
      if (ng < g[n]) {
        g[n] = ng; f[n] = ng + schaetzung(n); vor[n] = c;
        if (!istOffen[n]) { offen.push(n); istOffen[n] = 1; }
      }
    }
  }
  if (z !== s && vor[z] < 0) return [];
  const weg = [];
  for (let c = z; c !== s && c >= 0; c = vor[c]) weg.push({ x: (c % GX) * ZELLE + ZELLE / 2, y: ((c / GX) | 0) * ZELLE + ZELLE / 2 });
  weg.reverse();
  if (weg.length && !inWand(nach.x, nach.y) && sichtFrei(weg[weg.length - 1], nach, MECH_RADIUS - 2)) weg.push({ x: nach.x, y: nach.y });
  return weg;
}

// ===== Sound (wird direkt im Browser erzeugt) =====
let audio = null, rauschPuffer = null, tonAn = true;
function tonStart() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      rauschPuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = rauschPuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { audio = null; }
  }
  if (audio && audio.state === 'suspended') audio.resume();
}
function ton(hoehe, start, dauer, klang = 'square', laut = 0.1, hoeheEnde = null) {
  if (!audio || !tonAn) return;
  const t = audio.currentTime + start;
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = klang;
  o.frequency.setValueAtTime(hoehe, t);
  if (hoeheEnde) o.frequency.exponentialRampToValueAtTime(hoeheEnde, t + dauer);
  g.gain.setValueAtTime(laut, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  o.connect(g).connect(audio.destination);
  o.start(t); o.stop(t + dauer + 0.05);
}
function rauschen(start, dauer, laut, filter = 800) {
  if (!audio || !tonAn) return;
  const t = audio.currentTime + start;
  const q = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
  q.buffer = rauschPuffer;
  f.type = 'lowpass'; f.frequency.setValueAtTime(filter, t); f.frequency.exponentialRampToValueAtTime(60, t + dauer);
  g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  q.connect(f).connect(g).connect(audio.destination);
  q.start(t); q.stop(t + dauer + 0.05);
}
let letzterMgTon = 0;
const sound = {
  mg(laut = 1) {   // Ratatat
    if (zeit - letzterMgTon < 0.045) return;
    letzterMgTon = zeit;
    ton(700, 0, 0.05, 'square', 0.035 * laut, 200);
    rauschen(0, 0.06, 0.08 * laut, 3000);
  },
  rakete(laut = 1) { ton(180, 0, 0.45, 'sawtooth', 0.07 * laut, 700); rauschen(0, 0.4, 0.12 * laut, 2500); },
  boom(laut = 1) { rauschen(0, 0.8, 0.45 * laut, 900); ton(90, 0, 0.6, 'sine', 0.35 * laut, 30); },
  treffer() { ton(1600, 0, 0.04, 'square', 0.04); },
  autsch() { ton(200, 0, 0.12, 'sawtooth', 0.08, 90); },
  abschuss() { ton(880, 0, 0.08, 'square', 0.08); ton(1320, 0.08, 0.15, 'square', 0.08); },
  boost() { ton(250, 0, 0.3, 'sawtooth', 0.06, 1000); rauschen(0, 0.25, 0.1, 4000); },
  piep() { ton(660, 0, 0.12, 'square', 0.08); },
  los() { ton(990, 0, 0.4, 'square', 0.1); },
  erobert(gut) {
    const n = gut ? [523, 659, 784, 1047] : [440, 415, 392, 370];
    n.forEach((f, i) => ton(f, i * 0.12, i === 3 ? 0.5 : 0.15, 'square', 0.08));
  },
  sieg() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(f, i * 0.15, i === 5 ? 0.8 : 0.2, 'square', 0.09)); },
  niederlage() { [392, 370, 349, 330].forEach((f, i) => ton(f, i * 0.3, i === 3 ? 0.9 : 0.3, 'triangle', 0.15)); },
};
// Lautstärke je nach Entfernung zu dir
function lautBei(p) { return spieler ? Math.max(0, 1 - dist(p, spieler) / 900) : 0; }

// ===== Spielzustand =====
let zustand = 'titel';   // 'titel', 'spiel', 'ende'
let modus = 'punkt';
let mechs = [], spieler = null, schuesse = [], partikel = [], killfeed = [];
let ziele = [], aktivesZiel = 0, angreifer = 'blau', verteidiger = 'rot';
let punkte = { blau: 0, rot: 0 };
let restZeit = 0, countdown = 0, verlaengerung = false;
let nachricht = null, ende = null, pause = false;
let kamera = { x: 0, y: 0, wackeln: 0 };
let maus = { x: W / 2, y: H / 2, links: false, rechts: false };
let trefferAnzeige = 0;
let zeit = 0;
const tasten = {};

function zeigeNachricht(t, dauer = 2.5, farbe = '#ffd166') { nachricht = { text: t, t: dauer, farbe }; }

function neuerMech(team, nr, istSpieler) {
  return {
    team, nr, istSpieler, name: NAMEN[team][nr],
    x: 0, y: 0, vx: 0, vy: 0, leben: MECH_LEBEN, tot: false, neustart: 0, schutz: 0,
    zielWinkel: team === 'blau' ? 0 : Math.PI, laufWinkel: 0, phase: 0, laeuft: false,
    mgPause: 0, raketePause: 1, boostPause: 0, boostZeit: 0, boostRichtung: 0,
    seitHit: 99, blitz: 0, lauf: 1, abschuesse: 0, tode: 0,
    // Für die Bots:
    weg: [], wegZeit: 0, gegner: null, suchZeit: 0, reaktion: 0, versatz: null, seed: Math.random() * 10, festT: 0, altPos: null,
  };
}

function spawnPunkt(m) {
  let x = m.team === 'blau' ? 130 : WELT_B - 130;
  // Angreifer starten weiter vorne, wenn Punkt A erobert ist
  if ((modus === 'angriff' || modus === 'verteidigung') && m.team === angreifer && aktivesZiel === 1) x = m.team === 'blau' ? 720 : WELT_B - 720;
  return { x, y: 700 + (m.nr - (TEAM_GROESSE - 1) / 2) * 120 };
}
function spawnen(m) {
  const p = spawnPunkt(m);
  m.x = p.x; m.y = p.y;
  m.leben = MECH_LEBEN; m.tot = false; m.schutz = SCHUTZ_ZEIT;
  m.zielWinkel = m.team === 'blau' ? 0 : Math.PI;
  m.weg = []; m.wegZeit = 0; m.gegner = null; m.boostZeit = 0; m.seitHit = 99;
  const a = Math.random() * Math.PI * 2;
  m.versatz = { x: Math.cos(a) * Math.random() * 0.6, y: Math.sin(a) * Math.random() * 0.6 };
}

function neuesSpiel(id) {
  modus = id;
  mechs = []; schuesse = []; partikel = []; killfeed = [];
  nachricht = null; ende = null; pause = false; verlaengerung = false;
  punkte = { blau: 0, rot: 0 };
  ziele = []; aktivesZiel = 0;
  if (modus === 'punkt') {
    ziele = [{ x: 1200, y: 700, r: 140, name: '🚩', besitzer: null, wer: null, fortschritt: 0 }];
    restZeit = 300;
  } else if (modus === 'team') {
    restZeit = 300;
  } else {
    angreifer = modus === 'angriff' ? 'blau' : 'rot';
    verteidiger = anderes(angreifer);
    ziele = [
      { x: 1200, y: 700, r: 130, name: 'A', fortschritt: 0, erobert: false },
      { x: angreifer === 'blau' ? WELT_B - 780 : 780, y: 700, r: 120, name: 'B', fortschritt: 0, erobert: false },
    ];
    restZeit = ANGRIFF_ZEIT;
  }
  for (const team of ['blau', 'rot']) {
    for (let i = 0; i < TEAM_GROESSE; i++) mechs.push(neuerMech(team, i, team === 'blau' && i === 0));
  }
  spieler = mechs[0];
  for (const m of mechs) spawnen(m);
  kamera.x = begrenzt(spieler.x - W / 2, 0, WELT_B - W);
  kamera.y = begrenzt(spieler.y - H / 2, 0, WELT_H - H);
  countdown = 3.99;
  zustand = 'spiel';
  canvas.style.cursor = 'none';
}

function beende(sieger, grund) {
  if (zustand !== 'spiel') return;
  zustand = 'ende';
  ende = { sieger, grund, seit: zeit };
  canvas.style.cursor = 'default';
  if (sieger === spieler.team) sound.sieg(); else sound.niederlage();
}

// ===== Bewegung =====
function bewege(m, dx, dy, dt) {
  let tempo = TEMPO;
  if (m.boostZeit > 0) {   // Boost: schnell in eine Richtung!
    dx = Math.cos(m.boostRichtung); dy = Math.sin(m.boostRichtung);
    tempo = BOOST_TEMPO;
    if (Math.random() < 0.8) partikel.push({ x: m.x - dx * 25, y: m.y - dy * 25, vx: -dx * 60 + (Math.random() - 0.5) * 60, vy: -dy * 60 + (Math.random() - 0.5) * 60, t: 0.35, max: 0.35, farbe: zufall(['#ffd166', '#ff9f43', '#fff']), groesse: 5 });
  }
  const l = Math.hypot(dx, dy);
  m.laeuft = l > 0.1;
  const altX = m.x, altY = m.y;
  if (m.laeuft) {
    m.x += dx / l * tempo * dt;
    m.y += dy / l * tempo * dt;
    m.laufWinkel = drehe(m.laufWinkel, Math.atan2(dy, dx), dt * 10);
    m.phase += dt * 10;
  }
  kollision(m);
  m.vx = (m.x - altX) / dt; m.vy = (m.y - altY) / dt;
}

function kollision(m) {
  for (const r of WAENDE) {
    const cx = begrenzt(m.x, r.x, r.x + r.w), cy = begrenzt(m.y, r.y, r.y + r.h);
    const dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy);
    if (d >= MECH_RADIUS) continue;
    if (d > 0) {
      m.x = cx + dx / d * MECH_RADIUS;
      m.y = cy + dy / d * MECH_RADIUS;
    } else {   // Mitte steckt in der Wand: zur nächsten Seite raus
      const raus = [[r.x - MECH_RADIUS - m.x, 0], [r.x + r.w + MECH_RADIUS - m.x, 0], [0, r.y - MECH_RADIUS - m.y], [0, r.y + r.h + MECH_RADIUS - m.y]];
      raus.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
      m.x += raus[0][0]; m.y += raus[0][1];
    }
  }
  m.x = begrenzt(m.x, MECH_RADIUS, WELT_B - MECH_RADIUS);
  m.y = begrenzt(m.y, MECH_RADIUS, WELT_H - MECH_RADIUS);
}

function mechsSchieben() {   // Mechs können nicht ineinander laufen
  const lebende = mechs.filter(m => !m.tot);
  for (let i = 0; i < lebende.length; i++) {
    for (let j = i + 1; j < lebende.length; j++) {
      const a = lebende[i], b = lebende[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < MECH_RADIUS * 2) {
        const p = (MECH_RADIUS * 2 - d) / 2;
        a.x -= dx / d * p; a.y -= dy / d * p;
        b.x += dx / d * p; b.y += dy / d * p;
        kollision(a); kollision(b);
      }
    }
  }
}

function boosten(m, richtung) {
  if (m.boostPause > 0 || m.tot) return;
  m.boostZeit = BOOST_DAUER;
  m.boostPause = BOOST_PAUSE;
  m.boostRichtung = richtung;
  if (m.istSpieler) sound.boost();
}

// ===== Waffen =====
function feuern(m) {
  if (m.mgPause > 0 || m.tot) return;
  m.mgPause = MG_PAUSE * (m.istSpieler ? 1 : BOT_FEUER_LANGSAMER);
  m.lauf = -m.lauf;   // Abwechselnd links und rechts schießen
  const w = m.zielWinkel + (Math.random() - 0.5) * 2 * MG_STREUUNG;
  const cos = Math.cos(m.zielWinkel), sin = Math.sin(m.zielWinkel);
  const x = m.x + cos * 40 - sin * 8 * m.lauf, y = m.y + sin * 40 + cos * 8 * m.lauf;
  schuesse.push({ art: 'kugel', x, y, vx: Math.cos(w) * MG_TEMPO, vy: Math.sin(w) * MG_TEMPO, rest: MG_WEITE, team: m.team, von: m });
  partikel.push({ x, y, vx: 0, vy: 0, t: 0.05, max: 0.05, farbe: '#ffe08a', groesse: 9 });   // Mündungsfeuer
  if (m.istSpieler) sound.mg(1); else sound.mg(lautBei(m) * 0.6);
}

function rakete(m) {
  if (m.raketePause > 0 || m.tot) return;
  m.raketePause = RAKETE_PAUSE;
  const w = m.zielWinkel;
  const x = m.x + Math.cos(w) * 30, y = m.y + Math.sin(w) * 30;
  schuesse.push({ art: 'rakete', x, y, vx: Math.cos(w) * RAKETE_TEMPO, vy: Math.sin(w) * RAKETE_TEMPO, rest: RAKETE_WEITE, team: m.team, von: m });
  sound.rakete(m.istSpieler ? 1 : lautBei(m));
}

function explosion(x, y, team, von) {
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 250;
    partikel.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.6, max: 0.6, farbe: zufall(['#ffd166', '#ff9f43', '#ff5e3a', '#fff']), groesse: 4 + Math.random() * 6 });
  }
  for (let i = 0; i < 8; i++) {
    partikel.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 1.2, max: 1.2, farbe: '#555', groesse: 14, rauch: true });
  }
  partikel.push({ x, y, vx: 0, vy: 0, t: 0.3, max: 0.3, ring: RAKETE_RADIUS, farbe: '#ffd166', groesse: 0 });
  sound.boom(Math.max(0.15, lautBei({ x, y })));
  if (spieler && dist({ x, y }, spieler) < 400) kamera.wackeln = Math.max(kamera.wackeln, 8);
  if (team === null) return;
  for (const m of mechs) {
    if (m.tot || m.team === team) continue;
    const d = dist(m, { x, y });
    if (d < RAKETE_RADIUS + MECH_RADIUS && sichtFrei({ x, y }, m)) {
      schaden(m, RAKETE_SCHADEN * (1 - 0.5 * d / (RAKETE_RADIUS + MECH_RADIUS)), von);
    }
  }
}

function funken(x, y, farbe) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    partikel.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.25, max: 0.25, farbe, groesse: 3 });
  }
}

function schaden(m, menge, von) {
  if (m.tot || m.schutz > 0 || zustand !== 'spiel') return;
  m.leben -= menge;
  m.blitz = 0.08;
  m.seitHit = 0;
  if (von && !von.tot) m.angreiferInfo = von;
  if (m.istSpieler) { kamera.wackeln = Math.max(kamera.wackeln, 4); sound.autsch(); }
  if (von && von.istSpieler) { trefferAnzeige = 0.12; sound.treffer(); }
  if (m.leben <= 0) zerstoert(m, von);
}

function zerstoert(m, von) {
  m.tot = true;
  m.leben = 0;
  m.neustart = NEUSTART_ZEIT;
  m.tode++;
  m.zerstoertVon = von;
  explosion(m.x, m.y, null, null);
  for (let i = 0; i < 6; i++) {   // Schrottteile fliegen weg
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    partikel.push({ x: m.x, y: m.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1, max: 1, farbe: TEAMS[m.team].dunkel, groesse: 7, eckig: true });
  }
  if (von) {
    von.abschuesse++;
    if (modus === 'team') punkte[von.team]++;
    if (von.istSpieler) { sound.abschuss(); zeigeNachricht(`💥 ${m.name} zerstört!`, 1.5, '#4ade80'); }
  }
  killfeed.unshift({ von, opfer: m, t: 5 });
  if (killfeed.length > 5) killfeed.pop();
}

function updateSchuesse(dt) {
  for (const s of schuesse) {
    const schritte = 3;
    for (let i = 0; i < schritte && !s.weg; i++) {
      s.x += s.vx * dt / schritte;
      s.y += s.vy * dt / schritte;
      s.rest -= Math.hypot(s.vx, s.vy) * dt / schritte;
      if (inWand(s.x, s.y) || s.x < 0 || s.y < 0 || s.x > WELT_B || s.y > WELT_H) {
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.team, s.von);
        else funken(s.x, s.y, '#ffe08a');
        break;
      }
      for (const m of mechs) {
        if (m.tot || m.team === s.team || dist(m, s) > MECH_RADIUS) continue;
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von);
        else { schaden(m, MG_SCHADEN, s.von); funken(s.x, s.y, m.schutz > 0 ? '#93c5fd' : '#fff'); }
        break;
      }
      if (!s.weg && s.rest <= 0) {
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von);
      }
    }
    if (s.art === 'rakete' && !s.weg) {   // Rauchspur
      partikel.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, t: 0.5, max: 0.5, farbe: '#aaa', groesse: 6, rauch: true });
    }
  }
  schuesse = schuesse.filter(s => !s.weg);
}

// ===== Dein Mech =====
function updateSpieler(dt) {
  const m = spieler;
  if (m.tot) return;
  let dx = 0, dy = 0;
  if (tasten['a'] || tasten['arrowleft']) dx -= 1;
  if (tasten['d'] || tasten['arrowright']) dx += 1;
  if (tasten['w'] || tasten['arrowup']) dy -= 1;
  if (tasten['s'] || tasten['arrowdown']) dy += 1;
  if ((tasten['shift'] || tasten[' ']) && (dx || dy)) boosten(m, Math.atan2(dy, dx));
  bewege(m, dx, dy, dt);
  m.zielWinkel = Math.atan2(maus.y + kamera.y - m.y, maus.x + kamera.x - m.x);
  if (maus.links) feuern(m);
  if (maus.rechts || tasten['q'] || tasten['e']) rakete(m);
}

// ===== Die Computer-Mechs (Bots) =====
function zaehleIn(team, z) { return mechs.filter(m => !m.tot && m.team === team && dist(m, z) < z.r).length; }

// Wohin will der Bot gerade?
function botZiel(m) {
  if (modus === 'team') {
    const gegner = mechs.filter(o => !o.tot && o.team !== m.team).sort((a, b) => dist(a, m) - dist(b, m))[0];
    return gegner || { x: WELT_B / 2, y: WELT_H / 2 };
  }
  const z = modus === 'punkt' ? ziele[0] : ziele[aktivesZiel];
  let x = z.x + m.versatz.x * z.r, y = z.y + m.versatz.y * z.r;
  // Verteidiger bleiben eher auf ihrer Seite vom Punkt
  if ((modus === 'angriff' || modus === 'verteidigung') && m.team === verteidiger) x += (m.team === 'blau' ? -1 : 1) * 70;
  return { x, y };
}

function botDenken(m, dt) {
  // 1. Gegner suchen, den man sehen kann
  m.suchZeit -= dt;
  if (m.suchZeit <= 0) {
    m.suchZeit = 0.25;
    let bester = null, besterD = 700;
    for (const o of mechs) {
      if (o.tot || o.team === m.team) continue;
      const d = dist(m, o);
      if (d < besterD && sichtFrei(m, o)) { bester = o; besterD = d; }
    }
    if (bester !== m.gegner) m.reaktion = 0.35 + Math.random() * 0.25;   // Bots brauchen kurz, bis sie reagieren
    m.gegner = bester;
  }
  if (m.gegner && m.gegner.tot) m.gegner = null;

  // 2. Weg zum Ziel berechnen (ab und zu neu)
  const ziel = botZiel(m);
  m.wegZeit -= dt;
  if (m.wegZeit <= 0) {
    m.weg = wegFinden(m, ziel);
    m.wegZeit = 0.8 + Math.random() * 0.6;
  }
  while (m.weg.length > 1 && sichtFrei(m, m.weg[1], MECH_RADIUS - 6)) m.weg.shift();   // Abkürzen, wenn frei
  if (m.weg.length && dist(m, m.weg[0]) < 18) m.weg.shift();

  let dx = 0, dy = 0;
  const amZiel = dist(m, ziel) < 30;
  if (m.weg.length && !amZiel) {
    const p = m.weg[0], d = dist(m, p);
    dx = (p.x - m.x) / d; dy = (p.y - m.y) / d;
  }

  // 3. Kämpfen
  if (m.gegner) {
    const g = m.gegner, d = dist(m, g);
    const gx = (g.x - m.x) / d, gy = (g.y - m.y) / d;
    // Hin und her ausweichen
    const seite = Math.sin(zeit * 1.3 + m.seed) > 0 ? 1 : -1;
    dx += -gy * seite * 0.7; dy += gx * seite * 0.7;
    if (d < 220) { dx -= gx * 0.8; dy -= gy * 0.8; }   // Nicht zu nah ran
    // Zielen (mit Vorhalten, damit sie bewegte Ziele treffen)
    const flug = d / MG_TEMPO;
    const zielW = Math.atan2(g.y + g.vy * flug - m.y, g.x + g.vx * flug - m.x) + (Math.sin(zeit * 7 + m.seed * 3)) * BOT_UNGENAU;
    m.zielWinkel = drehe(m.zielWinkel, zielW, dt * 7);
    m.reaktion -= dt;
    if (m.reaktion <= 0 && Math.abs(winkelDiff(m.zielWinkel, zielW)) < 0.25) {
      feuern(m);
      if (m.raketePause <= 0 && d < 550 && Math.random() < dt * 0.8) rakete(m);
    }
    // Ausweichen mit Boost, wenn getroffen
    if (m.seitHit < 0.05 && Math.random() < 0.25) boosten(m, Math.atan2(gx, -gy) + (Math.random() < 0.5 ? 0 : Math.PI));
  } else if (dx || dy) {
    m.zielWinkel = drehe(m.zielWinkel, Math.atan2(dy, dx), dt * 5);
  }

  // 4. Festgesteckt? Dann neuen Weg suchen und kurz zur Seite
  m.festT -= dt;
  if (m.festT <= 0) {
    if (m.altPos && dist(m, m.altPos) < 10 && (dx || dy) && !amZiel) {
      m.wegZeit = 0;
      m.versatz = { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 1.2 };
    }
    m.altPos = { x: m.x, y: m.y };
    m.festT = 1;
  }

  bewege(m, dx, dy, dt);
}

// ===== Spielmodus-Regeln =====
function updateModus(dt) {
  if (modus === 'punkt') {
    const z = ziele[0];
    const b = zaehleIn('blau', z), r = zaehleIn('rot', z);
    z.umkaempft = b > 0 && r > 0;
    const allein = b > 0 && r === 0 ? 'blau' : (r > 0 && b === 0 ? 'rot' : null);
    if (allein && allein !== z.besitzer) {
      if (z.wer !== allein) { z.wer = allein; z.fortschritt = 0; }
      z.fortschritt += dt * (14 + 4 * (Math.max(b, r) - 1));
      if (z.fortschritt >= 100) {
        z.besitzer = allein; z.wer = null; z.fortschritt = 0;
        const gut = allein === spieler.team;
        sound.erobert(gut);
        zeigeNachricht(gut ? '🚩 Dein Team hat den Punkt erobert!' : '⚠️ Die Gegner haben den Punkt erobert!', 2.5, gut ? '#4ade80' : '#ff6b6b');
      }
    } else if (!z.umkaempft) {
      z.fortschritt = Math.max(0, z.fortschritt - dt * 10);
    }
    if (z.besitzer && !z.umkaempft) punkte[z.besitzer] = Math.min(PUNKT_ZIEL, punkte[z.besitzer] + dt);
    if (punkte.blau >= PUNKT_ZIEL) beende('blau', 'Team Blau hat den Punkt lange genug gehalten!');
    else if (punkte.rot >= PUNKT_ZIEL) beende('rot', 'Team Rot hat den Punkt lange genug gehalten!');
    restZeit -= dt;
    if (restZeit <= 0) zeitUm(punkte.blau, punkte.rot);
  } else if (modus === 'team') {
    if (punkte.blau >= ABSCHUSS_ZIEL) beende('blau', `Team Blau hat zuerst ${ABSCHUSS_ZIEL} Mechs zerstört!`);
    else if (punkte.rot >= ABSCHUSS_ZIEL) beende('rot', `Team Rot hat zuerst ${ABSCHUSS_ZIEL} Mechs zerstört!`);
    restZeit -= dt;
    if (restZeit <= 0) zeitUm(punkte.blau, punkte.rot);
  } else {
    const z = ziele[aktivesZiel];
    const a = zaehleIn(angreifer, z), v = zaehleIn(verteidiger, z);
    z.umkaempft = a > 0 && v > 0;
    if (a > 0 && v === 0) z.fortschritt += dt * (EROBERN_TEMPO + 2 * Math.min(3, a - 1));
    if (z.fortschritt >= 100) {
      z.fortschritt = 100; z.erobert = true;
      const gut = angreifer === spieler.team;
      sound.erobert(gut);
      if (aktivesZiel === 0) {
        aktivesZiel = 1;
        restZeit += ANGRIFF_BONUS;
        verlaengerung = false;
        zeigeNachricht(gut ? `✅ Punkt A erobert! Weiter zu B! (+${ANGRIFF_BONUS} s)` : '⚠️ Punkt A ist verloren! Verteidigt B!', 3, gut ? '#4ade80' : '#ff6b6b');
        for (const m of mechs) m.wegZeit = 0;
      } else {
        beende(angreifer, 'Die Angreifer haben beide Punkte erobert!');
        return;
      }
    }
    restZeit -= dt;
    if (restZeit <= 0) {
      restZeit = 0;
      if (a > 0) {   // Verlängerung: Solange Angreifer auf dem Punkt stehen, geht es weiter!
        if (!verlaengerung) zeigeNachricht('⏰ VERLÄNGERUNG!', 2, '#ff9f43');
        verlaengerung = true;
      } else {
        beende(verteidiger, 'Die Verteidiger haben durchgehalten!');
      }
    }
  }
}
function zeitUm(blau, rot) {
  if (blau > rot) beende('blau', 'Die Zeit ist um! Team Blau hat mehr Punkte.');
  else if (rot > blau) beende('rot', 'Die Zeit ist um! Team Rot hat mehr Punkte.');
  else beende(null, 'Die Zeit ist um! Gleichstand!');
}

// ===== Update =====
function update(dt) {
  for (const p of partikel) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy *= 0.94;
    p.t -= dt;
  }
  partikel = partikel.filter(p => p.t > 0);
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  kamera.wackeln = Math.max(0, kamera.wackeln - dt * 30);
  trefferAnzeige -= dt;
  if (zustand !== 'spiel' || pause) return;

  if (countdown > 0) {   // 3 ... 2 ... 1 ... LOS!
    const vorher = Math.ceil(countdown);
    countdown -= dt;
    if (Math.ceil(countdown) !== vorher) { if (countdown > 0) sound.piep(); else sound.los(); }
    return;
  }

  for (const k of killfeed) k.t -= dt;
  killfeed = killfeed.filter(k => k.t > 0);

  for (const m of mechs) {
    m.mgPause -= dt; m.raketePause -= dt; m.boostPause -= dt; m.boostZeit -= dt;
    m.schutz -= dt; m.blitz -= dt; m.seitHit += dt;
    if (m.tot) {
      m.neustart -= dt;
      if (m.neustart <= 0) spawnen(m);
      continue;
    }
    if (m.seitHit > HEILEN_NACH) m.leben = Math.min(MECH_LEBEN, m.leben + HEILEN_TEMPO * dt);
  }
  updateSpieler(dt);
  for (const m of mechs) if (!m.istSpieler && !m.tot) botDenken(m, dt);
  mechsSchieben();
  updateSchuesse(dt);
  updateModus(dt);
}

// ===== Zeichnen =====
function zeichneMech(m, x = m.x, y = m.y, groesse = 1) {
  const T = TEAMS[m.team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(groesse, groesse);
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  kreis(5, 7, 28); ctx.fill();
  // Beine und Füße (zeigen in Laufrichtung)
  ctx.save();
  ctx.rotate(m.laufWinkel);
  const schritt = m.laeuft ? Math.sin(m.phase) * 10 : 0;
  for (const s of [-1, 1]) {
    const vor = schritt * s;
    ctx.fillStyle = '#3a3e4a';
    ctx.fillRect(-4 + vor / 2, s * 10 - 4, 8, 8);
    ctx.fillStyle = '#2a2d36'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    rr(-12 + vor, s * 19 - 6, 24, 12, 4); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // Oberkörper (zeigt dahin, wo er hinzielt)
  ctx.rotate(m.zielWinkel);
  ctx.fillStyle = '#4b5060'; ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 2;
  rr(8, -13, 34, 7, 2); ctx.fill(); ctx.stroke();   // Kanone links
  rr(8, 6, 34, 7, 2); ctx.fill(); ctx.stroke();     // Kanone rechts
  ctx.fillStyle = T.dunkel;
  rr(-16, -28, 24, 11, 3); ctx.fill(); ctx.stroke();   // Raketenwerfer auf der Schulter
  ctx.fillStyle = m.raketePause <= 0 ? '#ffd166' : '#111';
  kreis(-9, -22.5, 2.5); ctx.fill(); kreis(0, -22.5, 2.5); ctx.fill();
  ctx.fillStyle = T.farbe; ctx.strokeStyle = T.dunkel; ctx.lineWidth = 3;
  rr(-19, -17, 36, 34, 9); ctx.fill(); ctx.stroke();   // Rumpf
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(-5, 0); ctx.stroke();
  ctx.fillStyle = '#1b1f2a';
  rr(-1, -10, 15, 20, 5); ctx.fill();                  // Cockpit
  ctx.fillStyle = T.hell;
  rr(6, -7, 6, 14, 3); ctx.fill();                     // Leuchtendes Visier
  // Weißes Aufblitzen bei Treffern
  if (m.blitz > 0) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; kreis(0, 0, 22); ctx.fill(); }
  ctx.restore();
  // Schutzschild nach dem Neustart
  if (m.schutz > 0) {
    ctx.strokeStyle = `rgba(147,197,253,${0.4 + Math.sin(zeit * 10) * 0.3})`; ctx.lineWidth = 3;
    kreis(x, y, 36 * groesse); ctx.stroke();
  }
}

function zeichneMechInfo(m) {
  const T = TEAMS[m.team];
  text(m.name, m.x, m.y - 50, 13, m.istSpieler ? '#ffd166' : T.hell);
  const b = 50;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - b / 2 - 1, m.y - 41, b + 2, 7);
  ctx.fillStyle = m.leben > 35 ? (m.team === spieler.team ? '#4ade80' : '#ff6b6b') : '#ffd166';
  ctx.fillRect(m.x - b / 2, m.y - 40, b * m.leben / MECH_LEBEN, 5);
}

function zeichneBoden() {
  ctx.fillStyle = '#2b2f3a';
  ctx.fillRect(0, 0, WELT_B, WELT_H);
  // Basen
  ctx.fillStyle = 'rgba(59,130,246,0.12)'; ctx.fillRect(0, 0, 300, WELT_H);
  ctx.fillStyle = 'rgba(239,68,68,0.12)'; ctx.fillRect(WELT_B - 300, 0, 300, WELT_H);
  // Bodenplatten
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= WELT_B; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, WELT_H); }
  for (let y = 0; y <= WELT_H; y += 100) { ctx.moveTo(0, y); ctx.lineTo(WELT_B, y); }
  ctx.stroke();
  // Rand der Arena
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 6;
  ctx.setLineDash([30, 20]); ctx.strokeRect(3, 3, WELT_B - 6, WELT_H - 6); ctx.setLineDash([]);
}

function zeichneZiele() {
  ziele.forEach((z, i) => {
    let farbe = '#ffffff', aktiv = true;
    if (modus === 'punkt') farbe = z.besitzer ? TEAMS[z.besitzer].farbe : '#ffffff';
    else {
      aktiv = i === aktivesZiel;
      farbe = z.erobert ? TEAMS[angreifer].farbe : TEAMS[verteidiger].farbe;
    }
    ctx.globalAlpha = aktiv ? 1 : 0.35;
    ctx.fillStyle = farbe + '22';
    kreis(z.x, z.y, z.r); ctx.fill();
    ctx.strokeStyle = farbe; ctx.lineWidth = 4;
    ctx.setLineDash([16, 10]); ctx.lineDashOffset = -zeit * 30;
    kreis(z.x, z.y, z.r); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // Fortschritts-Ring
    const wer = modus === 'punkt' ? z.wer : angreifer;
    if (z.fortschritt > 0 && wer && !z.erobert) {
      ctx.strokeStyle = TEAMS[wer].farbe; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * z.fortschritt / 100); ctx.stroke();
    }
    text(z.name, z.x, z.y, 44, farbe);
    if (z.umkaempft && aktiv) text('⚔️ Umkämpft!', z.x, z.y + 40, 16, '#ffd166');
    ctx.globalAlpha = 1;
  });
}

function zeichneWaende() {
  for (const r of WAENDE) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(r.x + 8, r.y + 8, r.w, r.h);   // Schatten
    ctx.fillStyle = '#5b6375';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#737d93';
    ctx.fillRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 3;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    // Nieten
    ctx.fillStyle = '#4a5162';
    for (const [nx, ny] of [[r.x + 10, r.y + 10], [r.x + r.w - 10, r.y + 10], [r.x + 10, r.y + r.h - 10], [r.x + r.w - 10, r.y + r.h - 10]]) {
      kreis(nx, ny, 3); ctx.fill();
    }
  }
}

function zeichneSchuesse() {
  for (const s of schuesse) {
    if (s.art === 'kugel') {
      ctx.strokeStyle = s.team === 'blau' ? '#bfdbfe' : '#fecaca'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025); ctx.lineTo(s.x, s.y); ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
      ctx.fillStyle = '#ffd166'; kreis(-12, 0, 5 + Math.random() * 3); ctx.fill();   // Flamme
      ctx.fillStyle = '#ddd'; rr(-9, -4, 18, 8, 3); ctx.fill();
      ctx.fillStyle = TEAMS[s.team].farbe; ctx.fillRect(4, -4, 5, 8);
      ctx.restore();
    }
  }
}

function zeichnePartikel() {
  for (const p of partikel) {
    const k = p.t / p.max;
    ctx.globalAlpha = Math.min(1, k * 1.5) * (p.rauch ? 0.5 : 1);
    if (p.ring) {
      ctx.strokeStyle = p.farbe; ctx.lineWidth = 6 * k;
      kreis(p.x, p.y, p.ring * (1 - k * 0.6)); ctx.stroke();
    } else if (p.eckig) {
      ctx.fillStyle = p.farbe; ctx.fillRect(p.x - p.groesse / 2, p.y - p.groesse / 2, p.groesse, p.groesse);
    } else {
      ctx.fillStyle = p.farbe;
      kreis(p.x, p.y, p.rauch ? p.groesse * (2 - k) : p.groesse * k); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Pfeil am Bildschirmrand, wenn das Ziel nicht zu sehen ist
function zeichneZielPfeil() {
  if (modus === 'team') return;
  const z = modus === 'punkt' ? ziele[0] : ziele[aktivesZiel];
  const sx = z.x - kamera.x, sy = z.y - kamera.y;
  if (sx > -z.r * 0.5 && sx < W + z.r * 0.5 && sy > -z.r * 0.5 && sy < H + z.r * 0.5) return;
  const w = Math.atan2(sy - H / 2, sx - W / 2);
  const px = begrenzt(W / 2 + Math.cos(w) * 1000, 40, W - 40), py = begrenzt(H / 2 + Math.sin(w) * 1000, 90, H - 40);
  ctx.save();
  ctx.translate(px, py); ctx.rotate(w);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
  ctx.restore();
  text(z.name, px - Math.cos(w) * 28, py - Math.sin(w) * 28, 18, '#ffd166');
}

function balken(x, y, b, h, anteil, farbe, hinten = 'rgba(0,0,0,0.6)') {
  ctx.fillStyle = hinten; rr(x, y, b, h, h / 2); ctx.fill();
  if (anteil > 0) { ctx.fillStyle = farbe; rr(x, y, Math.max(h, b * Math.min(1, anteil)), h, h / 2); ctx.fill(); }
}

function zeichneHUD() {
  // ----- Oben in der Mitte: Spielstand -----
  ctx.fillStyle = 'rgba(15,17,24,0.85)';
  rr(W / 2 - 200, 8, 400, 64, 12); ctx.fill();
  if (modus === 'punkt') {
    const z = ziele[0];
    text(`${Math.floor(punkte.blau)}`, W / 2 - 170, 30, 22, TEAMS.blau.hell);
    text(`${Math.floor(punkte.rot)}`, W / 2 + 170, 30, 22, TEAMS.rot.hell);
    balken(W / 2 - 145, 22, 120, 14, punkte.blau / PUNKT_ZIEL, TEAMS.blau.farbe);
    balken(W / 2 + 25, 22, 120, 14, punkte.rot / PUNKT_ZIEL, TEAMS.rot.farbe);
    text(uhr(restZeit), W / 2, 29, 16, '#fff');
    let status = z.besitzer ? `🚩 Punkt gehört ${TEAMS[z.besitzer].name}` : '🚩 Punkt ist frei';
    if (z.umkaempft) status = '⚔️ Punkt ist umkämpft!';
    text(status, W / 2, 55, 14, z.besitzer ? TEAMS[z.besitzer].hell : '#fff', 'center', false);
  } else if (modus === 'team') {
    text(`${punkte.blau}`, W / 2 - 70, 34, 30, TEAMS.blau.hell);
    text(':', W / 2, 32, 26, '#fff');
    text(`${punkte.rot}`, W / 2 + 70, 34, 30, TEAMS.rot.hell);
    text(`Zuerst ${ABSCHUSS_ZIEL} gewinnt · ${uhr(restZeit)}`, W / 2, 58, 13, '#c9c3ff', 'center', false);
  } else {
    const z = ziele[aktivesZiel];
    const wirGreifenAn = spieler.team === angreifer;
    text(`${wirGreifenAn ? '⚔️ Erobert' : '🛡️ Verteidigt'} Punkt ${z.name}!`, W / 2 - 60, 28, 16, wirGreifenAn ? '#ffd166' : '#93c5fd');
    text(verlaengerung ? 'VERL.' : uhr(restZeit), W / 2 + 150, 28, 20, restZeit < 20 ? '#ff6b6b' : '#fff');
    ['A', 'B'].forEach((n, i) => {
      const zz = ziele[i];
      text(n, W / 2 - 180 + i * 190, 54, 14, '#fff');
      balken(W / 2 - 165 + i * 190, 48, 150, 12, zz.fortschritt / 100, TEAMS[angreifer].farbe);
    });
  }

  // ----- Unten links: Dein Mech -----
  const m = spieler;
  ctx.fillStyle = 'rgba(15,17,24,0.85)';
  rr(12, H - 92, 290, 80, 12); ctx.fill();
  text('❤️', 32, H - 72, 18, '#fff', 'center', false);
  balken(50, H - 80, 236, 16, m.leben / MECH_LEBEN, m.leben > 35 ? '#4ade80' : '#ff6b6b');
  text(`${Math.ceil(m.leben)}`, 168, H - 72, 13, '#fff');
  // Rakete
  const rBereit = m.raketePause <= 0;
  text('🚀', 32, H - 44, 16, '#fff', 'center', false);
  balken(50, H - 50, 100, 12, rBereit ? 1 : 1 - m.raketePause / RAKETE_PAUSE, rBereit ? '#ffd166' : '#8a8f9e');
  text(rBereit ? 'Rechtsklick' : '', 100, H - 30, 10, '#c9c3ff', 'center', false);
  // Boost
  const bBereit = m.boostPause <= 0;
  text('💨', 170, H - 44, 16, '#fff', 'center', false);
  balken(186, H - 50, 100, 12, bBereit ? 1 : 1 - m.boostPause / BOOST_PAUSE, bBereit ? '#6fe3ff' : '#8a8f9e');
  text(bBereit ? 'Shift' : '', 236, H - 30, 10, '#c9c3ff', 'center', false);

  // ----- Oben rechts: Wer hat wen zerstört? -----
  killfeed.forEach((k, i) => {
    const y = 90 + i * 26;
    ctx.globalAlpha = Math.min(1, k.t);
    ctx.fillStyle = 'rgba(15,17,24,0.75)';
    rr(W - 250, y - 11, 238, 22, 6); ctx.fill();
    const vonName = k.von ? k.von.name : '???';
    text(vonName, W - 140, y, 13, k.von ? TEAMS[k.von.team].hell : '#fff', 'right', false);
    text('💥', W - 126, y, 13, '#fff', 'center', false);
    text(k.opfer.name, W - 112, y, 13, TEAMS[k.opfer.team].hell, 'left', false);
    ctx.globalAlpha = 1;
  });

  // ----- Unten rechts: Mini-Karte -----
  const mk = 0.075, mx = W - 12 - WELT_B * mk, my = H - 12 - WELT_H * mk;
  ctx.fillStyle = 'rgba(15,17,24,0.85)'; ctx.fillRect(mx - 3, my - 3, WELT_B * mk + 6, WELT_H * mk + 6);
  ctx.fillStyle = '#737d93';
  for (const r of WAENDE) ctx.fillRect(mx + r.x * mk, my + r.y * mk, Math.max(2, r.w * mk), Math.max(2, r.h * mk));
  ziele.forEach((z, i) => {
    if (modus !== 'punkt' && i !== aktivesZiel) return;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; kreis(mx + z.x * mk, my + z.y * mk, z.r * mk); ctx.stroke();
  });
  for (const o of mechs) {
    if (o.tot) continue;
    ctx.fillStyle = TEAMS[o.team].farbe;
    kreis(mx + o.x * mk, my + o.y * mk, o.istSpieler ? 4 : 3); ctx.fill();
    if (o.istSpieler) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.strokeRect(mx + kamera.x * mk, my + kamera.y * mk, W * mk, H * mk);

  // ----- Nachricht -----
  if (nachricht) {
    ctx.globalAlpha = Math.min(1, nachricht.t * 2);
    text(nachricht.text, W / 2, 110, 24, nachricht.farbe);
    ctx.globalAlpha = 1;
  }

  // ----- Zerstört? -----
  if (m.tot && zustand === 'spiel') {
    ctx.fillStyle = 'rgba(80,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    text('💥 ZERSTÖRT! 💥', W / 2, H / 2 - 40, 48, '#ff6b6b');
    if (m.zerstoertVon) text(`von ${m.zerstoertVon.name}`, W / 2, H / 2 + 5, 20, TEAMS[m.zerstoertVon.team].hell);
    text(`Neustart in ${Math.ceil(m.neustart)} ...`, W / 2, H / 2 + 45, 22, '#fff');
  }

  // ----- Countdown -----
  if (countdown > 0 && zustand === 'spiel') {
    const n = Math.ceil(countdown) - 1;
    const pop = 1 + (countdown % 1) * 0.5;
    const modusInfo = MODI.find(x => x.id === modus);
    text(`${modusInfo.emoji} ${modusInfo.name}`, W / 2, H / 2 - 110, 34, '#ffd166');
    text(n > 0 ? String(n) : 'LOS!', W / 2, H / 2 - 20, 90 * pop, n > 0 ? '#fff' : '#4ade80');
    if (modus === 'angriff' || modus === 'verteidigung') {
      text(spieler.team === angreifer ? 'Dein Team greift an!' : 'Dein Team verteidigt!', W / 2, H / 2 + 60, 22, '#fff');
    }
  }

  // ----- Fadenkreuz -----
  if (zustand === 'spiel') {
    const t = trefferAnzeige > 0;
    ctx.strokeStyle = t ? '#ff6b6b' : '#fff'; ctx.lineWidth = 2;
    kreis(maus.x, maus.y, 12); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(maus.x - 18, maus.y); ctx.lineTo(maus.x - 6, maus.y);
    ctx.moveTo(maus.x + 6, maus.y); ctx.lineTo(maus.x + 18, maus.y);
    ctx.moveTo(maus.x, maus.y - 18); ctx.lineTo(maus.x, maus.y - 6);
    ctx.moveTo(maus.x, maus.y + 6); ctx.lineTo(maus.x, maus.y + 18);
    ctx.stroke();
    if (t) {   // Treffer-X
      ctx.beginPath();
      ctx.moveTo(maus.x - 8, maus.y - 8); ctx.lineTo(maus.x + 8, maus.y + 8);
      ctx.moveTo(maus.x + 8, maus.y - 8); ctx.lineTo(maus.x - 8, maus.y + 8);
      ctx.stroke();
    }
  }

  // Ton-Knopf
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 20, 14, '#fff', 'center', false);

  if (pause) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    text('⏸️ PAUSE', W / 2, H / 2 - 30, 50, '#ffd166');
    text('Esc: Weiterspielen  ·  Enter: Zurück zum Menü', W / 2, H / 2 + 30, 18, '#fff');
  }
}

function zeichneSpiel() {
  // Kamera folgt dir (und schaut ein bisschen in Richtung Maus)
  const zx = begrenzt(spieler.x - W / 2 + (maus.x - W / 2) * 0.25, 0, WELT_B - W);
  const zy = begrenzt(spieler.y - H / 2 + (maus.y - H / 2) * 0.25, 0, WELT_H - H);
  kamera.x += (zx - kamera.x) * 0.15;
  kamera.y += (zy - kamera.y) * 0.15;
  const wx = (Math.random() - 0.5) * kamera.wackeln, wy = (Math.random() - 0.5) * kamera.wackeln;

  ctx.save();
  ctx.translate(-Math.round(kamera.x) + wx, -Math.round(kamera.y) + wy);
  zeichneBoden();
  zeichneZiele();
  for (const m of mechs) if (!m.tot) zeichneMech(m);
  zeichneSchuesse();
  zeichneWaende();
  zeichnePartikel();
  for (const m of mechs) if (!m.tot) zeichneMechInfo(m);
  ctx.restore();
  zeichneZielPfeil();
  zeichneHUD();
}

// ===== Titelbild =====
function modusKarten() {
  return MODI.map((m, i) => ({ m, x: 60 + (i % 2) * 430, y: 160 + Math.floor(i / 2) * 135, w: 410, h: 120 }));
}
const imRechteck = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

const TITEL_MECHS = [neuerMech('blau', 1, false), neuerMech('rot', 0, false)];
function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  // Zwei Mechs schauen sich an
  const [a, b] = TITEL_MECHS;
  a.laufWinkel = 0; b.laufWinkel = Math.PI; a.laeuft = b.laeuft = true;
  a.phase = b.phase = zeit * 6;
  a.zielWinkel = Math.atan2(maus.y - 515, maus.x - 90);
  b.zielWinkel = Math.PI + Math.sin(zeit) * 0.3;
  zeichneMech(a, 90, 515, 2.2);
  zeichneMech(b, W - 90, 515, 2.2);

  const titelG = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  titelG.addColorStop(0, '#93c5fd'); titelG.addColorStop(0.5, '#ffffff'); titelG.addColorStop(1, '#fca5a5');
  text('KÄMPFER AUS STAHL', W / 2, 70, 58, titelG);
  text('Wähle einen Spielmodus!', W / 2, 125, 18, '#c9c3ff', 'center', false);

  for (const k of modusKarten()) {
    const hover = imRechteck(maus, k);
    ctx.fillStyle = hover ? '#3a4256' : 'rgba(30,34,46,0.9)';
    rr(k.x, k.y, k.w, k.h, 14); ctx.fill();
    ctx.strokeStyle = hover ? '#ffd166' : '#4a5266'; ctx.lineWidth = hover ? 4 : 2; ctx.stroke();
    text(k.m.emoji, k.x + 42, k.y + 60, 40, '#fff', 'center', false);
    text(k.m.name, k.x + 82, k.y + 30, 24, hover ? '#ffd166' : '#fff', 'left', false);
    umbrechen(k.m.text, k.x + 82, k.y + 60, k.w - 100, 19, 14, '#c9c3ff');
  }

  text('🎮 WASD: Laufen  ·  Maus: Zielen  ·  Linksklick: MG  ·  Rechtsklick / Q: Rakete  ·  Shift: Boost  ·  Esc: Pause', W / 2, 455, 13, '#c9c3ff', 'center', false);
  text(`Du (blau) + 3 Computer-Mechs gegen ${TEAM_GROESSE} Gegner (rot)`, W / 2, 478, 13, '#8a8fb0', 'center', false);
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 20, 14, '#fff', 'center', false);
}

function zeichneEnde() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  let titel, farbe;
  if (ende.sieger === null) { titel = '🤝 UNENTSCHIEDEN'; farbe = '#ffd166'; }
  else if (ende.sieger === spieler.team) { titel = '🏆 SIEG! 🏆'; farbe = '#4ade80'; }
  else { titel = '💀 NIEDERLAGE'; farbe = '#ff6b6b'; }
  text(titel, W / 2, 80, 56, farbe);
  text(ende.grund, W / 2, 135, 20, '#fff');

  // Tabelle: Wer hat wie viele zerstört?
  ['blau', 'rot'].forEach((team, ti) => {
    const x = W / 2 - 330 + ti * 360;
    ctx.fillStyle = 'rgba(30,34,46,0.95)';
    rr(x, 170, 300, 50 + TEAM_GROESSE * 34, 12); ctx.fill();
    ctx.strokeStyle = TEAMS[team].farbe; ctx.lineWidth = 3; ctx.stroke();
    text(TEAMS[team].name, x + 15, 192, 18, TEAMS[team].hell, 'left', false);
    text('💥', x + 215, 192, 16, '#fff', 'center', false);
    text('☠️', x + 265, 192, 16, '#fff', 'center', false);
    mechs.filter(m => m.team === team).sort((a, b) => b.abschuesse - a.abschuesse).forEach((m, i) => {
      const y = 228 + i * 34;
      text(m.name, x + 15, y, 16, m.istSpieler ? '#ffd166' : '#fff', 'left', false);
      text(String(m.abschuesse), x + 215, y, 16, '#fff', 'center', false);
      text(String(m.tode), x + 265, y, 16, '#fff', 'center', false);
    });
  });
  if (zeit - ende.seit > 1) text('Klicken: Zurück zum Menü  ·  Enter: Nochmal', W / 2, 500, 20, '#c9c3ff', 'center', false);
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  zeichneSpiel();
  if (zustand === 'ende') zeichneEnde();
}

// ===== Eingabe =====
addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  tasten[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (k === 'm') tonAn = !tonAn;
  if (zustand === 'spiel' && k === 'escape') pause = !pause;
  else if (zustand === 'spiel' && pause && k === 'enter') { zustand = 'titel'; pause = false; canvas.style.cursor = 'default'; }
  else if (zustand === 'ende' && k === 'enter' && zeit - ende.seit > 1) neuesSpiel(modus);
});
addEventListener('keyup', e => { tasten[e.key.toLowerCase()] = false; });
addEventListener('blur', () => {
  for (const k in tasten) tasten[k] = false;
  maus.links = maus.rechts = false;
  if (zustand === 'spiel') pause = true;
});

function punkt(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', e => {
  tonStart();
  const p = punkt(e);
  maus.x = p.x; maus.y = p.y;
  if (zustand === 'titel') {
    for (const k of modusKarten()) if (imRechteck(p, k)) { neuesSpiel(k.m.id); return; }
    return;
  }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) zustand = 'titel'; return; }
  if (pause) { pause = false; return; }
  if (e.button === 0) maus.links = true;
  if (e.button === 2) maus.rechts = true;
});
addEventListener('pointermove', e => { const p = punkt(e); maus.x = p.x; maus.y = p.y; });
addEventListener('pointerup', e => {
  if (e.button === 0) maus.links = false;
  if (e.button === 2) maus.rechts = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());   // Kein Menü bei Rechtsklick

// ===== Spielschleife =====
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  zeit += dt;
  update(dt);
  zeichne();
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
