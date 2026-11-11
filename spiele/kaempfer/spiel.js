// 🤖 Kämpfer aus Stahl ⚔️ (3D, Ich-Perspektive)
// Du sitzt im Cockpit deines Mechs, kämpfst mit deinem Team und gewinnst in verschiedenen Spielmodi!
//
// So ist das Spiel aufgebaut:
//   - Die Spiel-Logik (Laufen, Schießen, Bots) rechnet auf einer flachen Karte mit x und y.
//   - Three.js zeichnet daraus eine 3D-Welt: x bleibt x, y wird zu z, und die Höhe ist das 3D-y.
//   - Oben drüber liegt ein normales Canvas für Anzeigen wie Leben, Mini-Karte und Fadenkreuz (HUD).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('spiel');   // Das HUD-Canvas (vorne)
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ===== Einstellungen (hier kannst du rumprobieren!) =====
const WELT_B = 2400, WELT_H = 1400;   // Größe der Arena
const TEAM_GROESSE = 4;               // So viele Mechs pro Team
const MECH_RADIUS = 26;               // Wie dick ein Mech ist (zum Laufen)
const BOOST_TEMPO = 560;              // Wie schnell der Boost ist
const BOOST_DAUER = 0.25;             // Wie lange der Boost dauert (Sekunden)
const RAKETE_TEMPO = 480;
const RAKETE_WEITE = 750;
const NEUSTART_ZEIT = 5;              // Sekunden, bis ein zerstörter Mech wiederkommt
const SCHUTZ_ZEIT = 2;                // Schutzschild nach dem Neustart
const HEILEN_NACH = 4;                // Nach so vielen Sekunden ohne Treffer ...
const HEILEN_TEMPO = 12;              // ... heilt man so viel pro Sekunde
const BOT_UNGENAU = 0.13;             // Wie schlecht die Bots zielen (größer = schlechter)
const BOT_FEUER_LANGSAMER = 1.5;      // Bots schießen etwas langsamer als du
const MAUS_EMPFINDLICH = 0.0025;      // Wie schnell du dich mit der Maus drehst
const AUGEN_HOEHE = 64;               // Wie hoch das Cockpit ist
const SICHTFELD = 75;                 // Wie viel du siehst (in Grad)
const WAND_HOEHE = 110;               // Wie hoch die Wände sind

// ===== Die Mechs =====
// Jeder Mech hat eigene Werte. Hier kannst du sie ändern oder neue Mechs erfinden!
//   leben: Lebenspunkte        tempo: Lauftempo        groesse: wie groß er ist
//   boostPause: Sekunden bis zum nächsten Boost
//   mg: das Hauptgewehr (pause = Zeit zwischen Schüssen, schaden, tempo = Kugeltempo, weite, streuung = Ungenauigkeit)
//   rakete: pause, schaden, radius (wie groß die Explosion ist), anzahl (wie viele auf einmal)
//   sterne: nur für die Anzeige im Auswahl-Menü (1 bis 5)
const MECH_TYPEN = [
  { id: 'waechter', name: 'Wächter', emoji: '⚙️', akzent: '#e5e7eb', text: 'Der Allrounder. Kann alles ein bisschen!',
    leben: 100, tempo: 170, groesse: 1, boostPause: 2.5,
    mg: { pause: 0.11, schaden: 6, tempo: 900, weite: 650, streuung: 0.05 },
    rakete: { pause: 4, schaden: 40, radius: 85, anzahl: 1 },
    sterne: { leben: 3, tempo: 3, schaden: 3, weite: 3 } },
  { id: 'blitz', name: 'Blitzschlag', emoji: '⚡', akzent: '#facc15', text: 'Superschnell und boostet ständig, hält aber wenig aus.',
    leben: 80, tempo: 230, groesse: 0.85, boostPause: 1.2,
    mg: { pause: 0.075, schaden: 5, tempo: 950, weite: 550, streuung: 0.07 },
    rakete: { pause: 5, schaden: 30, radius: 70, anzahl: 1 },
    sterne: { leben: 1, tempo: 5, schaden: 2, weite: 2 } },
  { id: 'koloss', name: 'Stahlkoloss', emoji: '🛡️', akzent: '#9ca3af', text: 'Riesig und langsam, aber hält extrem viel aus!',
    leben: 150, tempo: 120, groesse: 1.3, boostPause: 4,
    mg: { pause: 0.14, schaden: 7, tempo: 850, weite: 600, streuung: 0.06 },
    rakete: { pause: 5, schaden: 55, radius: 110, anzahl: 1 },
    sterne: { leben: 5, tempo: 1, schaden: 4, weite: 3 } },
  { id: 'adler', name: 'Adlerauge', emoji: '🎯', akzent: '#4ade80', text: 'Scharfschütze! Die Railgun trifft ganz weit und ganz hart.',
    leben: 80, tempo: 160, groesse: 1, boostPause: 2.5,
    mg: { pause: 1.0, schaden: 34, tempo: 2600, weite: 1400, streuung: 0, strahl: true },
    rakete: { pause: 6, schaden: 30, radius: 70, anzahl: 1 },
    sterne: { leben: 2, tempo: 3, schaden: 5, weite: 5 } },
  { id: 'feuer', name: 'Feuersturm', emoji: '🔥', akzent: '#fb923c', text: 'Raketen-Profi: schießt 3 Raketen auf einmal!',
    leben: 110, tempo: 150, groesse: 1.1, boostPause: 3,
    mg: { pause: 0.13, schaden: 5, tempo: 900, weite: 600, streuung: 0.06 },
    rakete: { pause: 4.5, schaden: 28, radius: 80, anzahl: 3 },
    sterne: { leben: 3, tempo: 2, schaden: 5, weite: 3 } },
  { id: 'artillerie', name: 'Donnerhagel', emoji: '☄️', akzent: '#c084fc', text: 'Artillerie! Ziel anvisieren, dann regnen 10 Raketen runter. Hoch schauen = weiter!',
    leben: 95, tempo: 140, groesse: 1.15, boostPause: 3.5,
    // salve: Erst anvisieren (zielZeit), dann fliegen "anzahl" Raketen im Bogen und landen im Kreis (streuRadius) ums Ziel
    mg: { salve: true, pause: 7, zielZeit: 0.8, anzahl: 10, abstand: 0.12, schaden: 14, radius: 60, streuRadius: 110, tempo: 520, weite: 1100, minWeite: 180 },
    rakete: { pause: 5, schaden: 35, radius: 80, anzahl: 1 },
    sterne: { leben: 3, tempo: 2, schaden: 5, weite: 5 } },
];
let meinMech = MECH_TYPEN[0];   // Den Mech, den du ausgesucht hast
try { meinMech = MECH_TYPEN.find(t => t.id === localStorage.getItem('kaempfer-mech')) || meinMech; } catch (e) { /* egal */ }

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
const EROBERN_TEMPO = 4;      // Angriff: So schnell wird ein Punkt erobert (Prozent pro Sekunde)

// ===== Die Karten =====
// Jede Karte hat Hindernisse. "links" sind die auf der linken Seite, die rechte Seite wird automatisch gespiegelt!
// "art" sagt, wie ein Hindernis aussieht: wand, kiste (Fabrik) oder fels, kristall, pilz, stein (Planet)
// Wichtig: Die Mitte (1200, 700) und die Punkte A und B müssen frei bleiben!
const KARTEN = [
  {
    id: 'fabrik', name: 'Stahlfabrik', emoji: '🏭',
    links: [
      { x: 320, y: 250, w: 40, h: 250, art: 'wand' }, { x: 320, y: 900, w: 40, h: 250, art: 'wand' },
      { x: 430, y: 620, w: 120, h: 160, art: 'wand' },
      { x: 600, y: 120, w: 60, h: 250, art: 'wand' }, { x: 600, y: 1030, w: 60, h: 250, art: 'wand' },
      { x: 820, y: 380, w: 200, h: 50, art: 'wand' }, { x: 820, y: 970, w: 200, h: 50, art: 'wand' },
      { x: 960, y: 600, w: 50, h: 200, art: 'wand' },
      { x: 1000, y: 100, w: 60, h: 160, art: 'wand' }, { x: 1000, y: 1140, w: 60, h: 160, art: 'wand' },
      { x: 1100, y: 560, w: 40, h: 40, art: 'kiste' }, { x: 1100, y: 800, w: 40, h: 40, art: 'kiste' },
    ],
    mitte: [{ x: 1170, y: 200, w: 60, h: 220, art: 'wand' }, { x: 1170, y: 980, w: 60, h: 220, art: 'wand' }],
  },
  {
    id: 'planet', name: 'Planet Xyloria', emoji: '🪐',
    links: [
      { x: 330, y: 300, w: 70, h: 160, art: 'fels' }, { x: 330, y: 940, w: 70, h: 160, art: 'fels' },
      { x: 470, y: 640, w: 90, h: 120, art: 'fels' },
      { x: 640, y: 180, w: 80, h: 80, art: 'kristall' }, { x: 640, y: 1140, w: 80, h: 80, art: 'kristall' },
      { x: 820, y: 420, w: 180, h: 60, art: 'fels' }, { x: 820, y: 920, w: 180, h: 60, art: 'fels' },
      { x: 990, y: 640, w: 40, h: 40, art: 'pilz' },
      { x: 1000, y: 150, w: 70, h: 120, art: 'kristall' }, { x: 1000, y: 1130, w: 70, h: 120, art: 'kristall' },
      { x: 1110, y: 590, w: 36, h: 36, art: 'stein' }, { x: 1110, y: 775, w: 36, h: 36, art: 'stein' },
    ],
    mitte: [{ x: 1160, y: 250, w: 80, h: 160, art: 'kristall' }, { x: 1160, y: 990, w: 80, h: 160, art: 'kristall' }],
  },
];
let karte = KARTEN[0];
try { karte = KARTEN.find(k => k.id === localStorage.getItem('kaempfer-karte')) || karte; } catch (e) { /* egal */ }
let WAENDE = [];
function waendeVon(k) {
  const liste = [...k.mitte];
  for (const r of k.links) liste.push(r, { ...r, x: WELT_B - r.x - r.w });
  return liste;
}

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
function baueGitter() {   // Welche Kästchen sind frei? (Muss bei jeder Karte neu gemacht werden)
  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      const x = gx * ZELLE + ZELLE / 2, y = gy * ZELLE + ZELLE / 2;
      const rand = MECH_RADIUS + 2;
      const blockiert = WAENDE.some(r => x > r.x - rand && x < r.x + r.w + rand && y > r.y - rand && y < r.y + r.h + rand);
      const amRand = x < MECH_RADIUS || y < MECH_RADIUS || x > WELT_B - MECH_RADIUS || y > WELT_H - MECH_RADIUS;
      frei[gy * GX + gx] = blockiert || amRand ? 0 : 1;
    }
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
  if (!audio || !tonAn || laut <= 0.001) return;
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
  if (!audio || !tonAn || laut <= 0.001) return;
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
  anvisieren() { [880, 1100, 1320].forEach((f, i) => ton(f, i * 0.12, 0.1, 'square', 0.07)); },
  warnung() { for (let i = 0; i < 3; i++) { ton(440, i * 0.25, 0.12, 'square', 0.09); ton(330, i * 0.25 + 0.12, 0.12, 'square', 0.09); } },
  salve(laut = 1) { ton(260, 0, 0.25, 'sawtooth', 0.05 * laut, 900); rauschen(0, 0.2, 0.08 * laut, 3000); },
  pfeifen(laut = 1) { ton(1400, 0, 0.9, 'sine', 0.05 * laut, 500); },
  railgun(laut = 1) { ton(1800, 0, 0.35, 'sawtooth', 0.08 * laut, 120); ton(3000, 0, 0.1, 'square', 0.04 * laut, 800); rauschen(0, 0.3, 0.15 * laut, 5000); },
  rakete(laut = 1) { ton(180, 0, 0.45, 'sawtooth', 0.07 * laut, 700); rauschen(0, 0.4, 0.12 * laut, 2500); },
  boom(laut = 1) { rauschen(0, 0.8, 0.45 * laut, 900); ton(90, 0, 0.6, 'sine', 0.35 * laut, 30); },
  treffer() { ton(1600, 0, 0.04, 'square', 0.04); },
  autsch() { ton(200, 0, 0.12, 'sawtooth', 0.08, 90); },
  abschuss() { ton(880, 0, 0.08, 'square', 0.08); ton(1320, 0.08, 0.15, 'square', 0.08); },
  boost() { ton(250, 0, 0.3, 'sawtooth', 0.06, 1000); rauschen(0, 0.25, 0.1, 4000); },
  schritt(laut = 1) { ton(70, 0, 0.12, 'sine', 0.12 * laut, 40); },
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
let zustand = 'titel';   // 'titel', 'auswahl', 'spiel', 'ende'
let modus = 'punkt';
let mechs = [], spieler = null, schuesse = [], partikel = [], killfeed = [];
let ziele = [], aktivesZiel = 0, angreifer = 'blau', verteidiger = 'rot';
let punkte = { blau: 0, rot: 0 };
let restZeit = 0, countdown = 0, verlaengerung = false;
let nachricht = null, ende = null, pause = false;
let maus = { x: W / 2, y: H / 2, links: false, rechts: false };
let blick = { links: 0, hoch: 0 };   // Wohin du schaust (Drehung und Neigung)
let wackeln = 0, rueckstoss = 0, muendung = 0;
let trefferAnzeige = 0, trefferRichtungen = [];
let zeit = 0;
const tasten = {};

function zeigeNachricht(t, dauer = 2.5, farbe = '#ffd166') { nachricht = { text: t, t: dauer, farbe }; }

function neuerMech(team, nr, istSpieler, typ) {
  return {
    team, nr, istSpieler, typ, name: NAMEN[team][nr],
    x: 0, y: 0, vx: 0, vy: 0, leben: typ.leben, tot: false, neustart: 0, schutz: 0,
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
  return { x, y: 700 + (m.nr - (TEAM_GROESSE - 1) / 2) * 85 };   // Nicht zu weit auseinander, sonst steht man hinter einer Wand
}
function spawnen(m) {
  const p = spawnPunkt(m);
  m.x = p.x; m.y = p.y;
  m.leben = m.typ.leben; m.tot = false; m.schutz = SCHUTZ_ZEIT;
  m.zielWinkel = m.team === 'blau' ? 0 : Math.PI;
  m.laufWinkel = m.zielWinkel;
  m.weg = []; m.wegZeit = 0; m.gegner = null; m.boostZeit = 0; m.seitHit = 99;
  const a = Math.random() * Math.PI * 2;
  m.versatz = { x: Math.cos(a) * Math.random() * 0.6, y: Math.sin(a) * Math.random() * 0.6 };
  if (m.istSpieler) { blick.links = m.zielWinkel; blick.hoch = 0; }
}

function neuesSpiel(id) {
  modus = id;
  ladeKarte(karte);
  // Alte 3D-Sachen aufräumen
  for (const m of mechs) if (m.g3) szene.remove(m.g3.gruppe);
  for (const s of schussMeshes) szene.remove(s.mesh);
  for (const p of explosionsKugeln) szene.remove(p.mesh);
  schussMeshes = []; explosionsKugeln = [];
  mechs = []; schuesse = []; partikel = []; killfeed = []; trefferRichtungen = [];
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
    for (let i = 0; i < TEAM_GROESSE; i++) {
      const istSpieler = team === 'blau' && i === 0;
      mechs.push(neuerMech(team, i, istSpieler, istSpieler ? meinMech : zufall(MECH_TYPEN)));   // Bots bekommen zufällige Mechs
    }
  }
  spieler = mechs[0];
  for (const m of mechs) { spawnen(m); m.g3 = baueMech(m); szene.add(m.g3.gruppe); }
  baueZiele();
  baueWaffen(meinMech);
  countdown = 3.99;
  zustand = 'spiel';
  mausFangen();
}

function beende(sieger, grund) {
  if (zustand !== 'spiel') return;
  zustand = 'ende';
  ende = { sieger, grund, seit: zeit };
  maus.links = maus.rechts = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (sieger === spieler.team) sound.sieg(); else sound.niederlage();
}

// ===== Bewegung =====
function bewege(m, dx, dy, dt) {
  let tempo = m.typ.tempo;
  if (m.boostZeit > 0) {   // Boost: schnell in eine Richtung!
    dx = Math.cos(m.boostRichtung); dy = Math.sin(m.boostRichtung);
    tempo = BOOST_TEMPO;
    if (Math.random() < 0.8) partikel.push({ x: m.x - dx * 25, y: m.y - dy * 25, h: 30, vh: 20, vx: -dx * 60 + (Math.random() - 0.5) * 60, vy: -dy * 60 + (Math.random() - 0.5) * 60, t: 0.35, max: 0.35, farbe: zufall(['#ffd166', '#ff9f43', '#ffffff']) });
  }
  const l = Math.hypot(dx, dy);
  m.laeuft = l > 0.1;
  const altX = m.x, altY = m.y;
  if (m.laeuft) {
    m.x += dx / l * tempo * dt;
    m.y += dy / l * tempo * dt;
    m.laufWinkel = drehe(m.laufWinkel, Math.atan2(dy, dx), dt * 10);
    const vorher = Math.floor(m.phase / Math.PI);
    m.phase += dt * 10;
    if (Math.floor(m.phase / Math.PI) !== vorher) {   // Stampf!
      if (m.istSpieler) { sound.schritt(0.6); wackeln = Math.max(wackeln, 0.6); }
      else sound.schritt(lautBei(m) * 0.5);
    }
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
  m.boostPause = m.typ.boostPause;
  m.boostRichtung = richtung;
  if (m.istSpieler) sound.boost();
}

// ===== Waffen =====
function feuern(m) {
  if (m.mgPause > 0 || m.tot) return;
  const mg = m.typ.mg, gr = m.typ.groesse;
  m.mgPause = mg.pause * (m.istSpieler ? 1 : BOT_FEUER_LANGSAMER);
  if (mg.salve) { if (!m.salve) salveStarten(m); return; }
  if (!mg.strahl) m.lauf = -m.lauf;   // Abwechselnd links und rechts schießen (die Railgun hat nur ein Rohr)
  const seite = mg.strahl ? 0.4 : m.lauf;
  const w = m.zielWinkel + (Math.random() - 0.5) * 2 * mg.streuung;
  const cos = Math.cos(m.zielWinkel), sin = Math.sin(m.zielWinkel);
  const x = m.x + cos * 40 * gr - sin * 13 * gr * seite, y = m.y + sin * 40 * gr + cos * 13 * gr * seite;
  schuesse.push({ art: mg.strahl ? 'strahl' : 'kugel', x, y, h: 50 * gr, vx: Math.cos(w) * mg.tempo, vy: Math.sin(w) * mg.tempo, rest: mg.weite, schaden: mg.schaden, team: m.team, von: m });
  const laut = m.istSpieler ? 1 : lautBei(m) * 0.6;
  if (mg.strahl) sound.railgun(laut); else sound.mg(laut);
  if (m.istSpieler) { rueckstoss = mg.strahl ? 10 : 3; muendung = mg.strahl ? 0.1 : 0.05; }
  else partikel.push({ x, y, h: 52 * gr, vh: 0, vx: 0, vy: 0, t: 0.05, max: 0.05, farbe: mg.strahl ? '#a7f3d0' : '#ffe08a' });   // Mündungsfeuer
}

// ☄️ Artillerie: Ziel anvisieren ... und dann regnet es Raketen!
function landePunkt(m) {
  const mg = m.typ.mg;
  const weite = begrenzt(m.zielWeite || 500, mg.minWeite, mg.weite);
  return {
    x: begrenzt(m.x + Math.cos(m.zielWinkel) * weite, 10, WELT_B - 10),
    y: begrenzt(m.y + Math.sin(m.zielWinkel) * weite, 10, WELT_H - 10),
  };
}
function salveStarten(m) {
  const mg = m.typ.mg;
  m.salve = { ziel: landePunkt(m), warten: mg.zielZeit, rest: mg.anzahl, timer: 0, laengste: 0 };
  if (m.istSpieler) { sound.anvisieren(); zeigeNachricht('🎯 Ziel erfasst!', 1.2, m.typ.akzent); }
  else if (spieler && !spieler.tot && m.team !== spieler.team && dist(m.salve.ziel, spieler) < mg.streuRadius + 150) {
    sound.warnung(); zeigeNachricht('⚠️ Raketenhagel! Lauf weg!', 1.5, '#ff6b6b');
  }
}
function updateSalve(m, dt) {
  const sv = m.salve, mg = m.typ.mg;
  if (sv.warten > 0) { sv.warten -= dt; return; }   // Erst kurz anvisieren ...
  sv.timer -= dt;
  while (sv.timer <= 0 && sv.rest > 0) {             // ... dann eine Rakete nach der anderen!
    salvenRakete(m, sv.ziel);
    sv.rest--;
    sv.timer += mg.abstand;
  }
  if (sv.rest <= 0) {   // Warten, bis die letzte Rakete gelandet ist
    sv.aus = (sv.aus === undefined ? sv.laengste : sv.aus) - dt;
    if (sv.aus <= 0) m.salve = null;
  }
}
let letzterPfiff = 0;
function salvenRakete(m, ziel) {
  const mg = m.typ.mg, gr = m.typ.groesse;
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * mg.streuRadius;   // irgendwo im Kreis
  const zx = begrenzt(ziel.x + Math.cos(a) * r, 10, WELT_B - 10), zy = begrenzt(ziel.y + Math.sin(a) * r, 10, WELT_H - 10);
  const x = m.x - Math.cos(m.zielWinkel) * 8, y = m.y - Math.sin(m.zielWinkel) * 8;
  const weite = Math.hypot(zx - x, zy - y);
  const dauer = 0.9 + weite / mg.tempo;
  schuesse.push({
    art: 'salve', bogen: true, x, y, sx: x, sy: y, zx, zy, h: 100 * gr, startH: 100 * gr,
    k: 0, dauer, scheitel: 220 + weite * 0.3,
    vx: 0, vy: 0, rest: 1e9, schaden: mg.schaden, radius: mg.radius, team: m.team, von: m,
  });
  m.salve.laengste = Math.max(m.salve.laengste, dauer + 0.1);
  partikel.push({ x, y, h: 100 * gr, vh: 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0.8, max: 0.8, farbe: '#999999', rauch: true });
  sound.salve(m.istSpieler ? 1 : lautBei(m));
  if (m.istSpieler) { rueckstoss = 4; muendung = 0.06; }
}

function rakete(m) {
  if (m.raketePause > 0 || m.tot) return;
  const r = m.typ.rakete;
  m.raketePause = r.pause;
  for (let i = 0; i < r.anzahl; i++) {   // Feuersturm: mehrere Raketen im Fächer
    const w = m.zielWinkel + (i - (r.anzahl - 1) / 2) * 0.12;
    const x = m.x + Math.cos(w) * 30, y = m.y + Math.sin(w) * 30;
    schuesse.push({ art: 'rakete', x, y, h: 62 * m.typ.groesse, vx: Math.cos(w) * RAKETE_TEMPO, vy: Math.sin(w) * RAKETE_TEMPO, rest: RAKETE_WEITE, schaden: r.schaden, radius: r.radius, team: m.team, von: m });
  }
  sound.rakete(m.istSpieler ? 1 : lautBei(m));
  if (m.istSpieler) rueckstoss = 8;
}

function explosion(x, y, team, von, radius = 85, schadenMax = 40) {
  const menge = Math.min(1, radius / 85);
  for (let i = 0; i < 30 * menge; i++) {
    const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 200;
    partikel.push({ x, y, h: 30, vh: 50 + Math.random() * 250, g: 400, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.6, max: 0.6, farbe: zufall(['#ffd166', '#ff9f43', '#ff5e3a', '#ffffff']) });
  }
  for (let i = 0; i < 10 * menge; i++) {
    partikel.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, h: 20 + Math.random() * 30, vh: 30 + Math.random() * 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 1.4, max: 1.4, farbe: zufall(['#555555', '#444444', '#666666']), rauch: true });
  }
  partikel.push({ x, y, h: 40, vh: 0, vx: 0, vy: 0, t: 0.35, max: 0.35, kugel: radius, farbe: '#ffb347' });
  sound.boom(Math.max(0.15, lautBei({ x, y })) * menge);
  if (spieler && dist({ x, y }, spieler) < 400) wackeln = Math.max(wackeln, 8);
  if (team === null) return;
  for (const m of mechs) {
    if (m.tot || m.team === team) continue;
    const d = dist(m, { x, y });
    const groesse = radius + MECH_RADIUS * m.typ.groesse;
    if (d < groesse && sichtFrei({ x, y }, m)) {
      schaden(m, schadenMax * (1 - 0.5 * d / groesse), von);
    }
  }
}

function funken(x, y, h, farbe) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    partikel.push({ x, y, h, vh: Math.random() * 150, g: 500, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.3, max: 0.3, farbe });
  }
}

function schaden(m, menge, von) {
  if (m.tot || m.schutz > 0 || zustand !== 'spiel') return;
  m.leben -= menge;
  m.blitz = 0.08;
  m.seitHit = 0;
  if (m.istSpieler) {
    wackeln = Math.max(wackeln, 4);
    sound.autsch();
    if (von) trefferRichtungen.push({ von: { x: von.x, y: von.y }, t: 1 });
  }
  if (von && von.istSpieler) { trefferAnzeige = 0.12; sound.treffer(); }
  if (m.leben <= 0) zerstoert(m, von);
}

function zerstoert(m, von) {
  m.tot = true;
  m.leben = 0;
  m.salve = null;
  m.neustart = NEUSTART_ZEIT;
  m.tode++;
  m.zerstoertVon = von;
  m.wrack = { x: m.x, y: m.y };
  explosion(m.x, m.y, null, null);
  for (let i = 0; i < 8; i++) {   // Schrottteile fliegen weg
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    partikel.push({ x: m.x, y: m.y, h: 40, vh: 150 + Math.random() * 200, g: 600, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.2, max: 1.2, farbe: TEAMS[m.team].dunkel, rauch: true });
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
    if (s.bogen) {   // Fliegt im Bogen über alles drüber
      s.k += dt / s.dauer;
      const k = Math.min(1, s.k);
      const ax = s.x, ay = s.y, ah = s.h;
      s.x = s.sx + (s.zx - s.sx) * k;
      s.y = s.sy + (s.zy - s.sy) * k;
      s.h = s.startH * (1 - k) + 4 * s.scheitel * k * (1 - k);
      s.dx = s.x - ax; s.dy = s.y - ay; s.dh = s.h - ah;   // Flugrichtung (damit die Rakete richtig zeigt)
      if (Math.random() < 0.6) partikel.push({ x: s.x, y: s.y, h: s.h, vh: 5, vx: 0, vy: 0, t: 0.5, max: 0.5, farbe: '#b9a7d6', rauch: true });
      if (k > 0.6 && zeit - letzterPfiff > 1 && spieler && dist({ x: s.zx, y: s.zy }, spieler) < 300) { letzterPfiff = zeit; sound.pfeifen(); }   // Fiiiiuuu ... gleich knallt's!
      if (k >= 1) { s.weg = true; explosion(s.zx, s.zy, s.team, s.von, s.radius, s.schaden); }
      continue;
    }
    const schritte = 3;
    for (let i = 0; i < schritte && !s.weg; i++) {
      s.x += s.vx * dt / schritte;
      s.y += s.vy * dt / schritte;
      s.rest -= Math.hypot(s.vx, s.vy) * dt / schritte;
      if (inWand(s.x, s.y) || s.x < 0 || s.y < 0 || s.x > WELT_B || s.y > WELT_H) {
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x - s.vx * 0.02, s.y - s.vy * 0.02, s.team, s.von, s.radius, s.schaden);
        else funken(s.x - s.vx * 0.01, s.y - s.vy * 0.01, s.h, '#ffe08a');
        break;
      }
      for (const m of mechs) {
        if (m.tot || m.team === s.team || dist(m, s) > MECH_RADIUS * m.typ.groesse) continue;
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden);
        else { schaden(m, s.schaden, s.von); funken(s.x, s.y, s.h, m.schutz > 0 ? '#93c5fd' : '#ffffff'); }
        break;
      }
      if (!s.weg && s.rest <= 0) {
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden);
      }
    }
    if (s.art === 'rakete' && !s.weg) {   // Rauchspur
      partikel.push({ x: s.x, y: s.y, h: s.h, vh: 10, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, t: 0.6, max: 0.6, farbe: '#9a9a9a', rauch: true });
    }
  }
  schuesse = schuesse.filter(s => !s.weg);
}

// ===== Dein Mech =====
function updateSpieler(dt) {
  const m = spieler;
  if (m.tot) return;
  // Vorwärts ist da, wo du hinschaust
  const vx = Math.cos(blick.links), vy = Math.sin(blick.links);   // vorwärts
  const rx = -vy, ry = vx;                                         // rechts
  let vor = 0, seite = 0;
  if (tasten['w'] || tasten['arrowup']) vor += 1;
  if (tasten['s'] || tasten['arrowdown']) vor -= 1;
  if (tasten['d'] || tasten['arrowright']) seite += 1;
  if (tasten['a'] || tasten['arrowleft']) seite -= 1;
  const dx = vx * vor + rx * seite, dy = vy * vor + ry * seite;
  if ((tasten['shift'] || tasten[' ']) && (dx || dy)) boosten(m, Math.atan2(dy, dx));
  bewege(m, dx, dy, dt);
  m.zielWinkel = blick.links;
  if (m.typ.mg.salve) {   // Artillerie: Je höher du schaust, desto weiter weg ist das Ziel
    const mg = m.typ.mg;
    m.zielWeite = mg.minWeite + (blick.hoch + 0.5) / 0.9 * (mg.weite - mg.minWeite);
  }
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
  if ((modus === 'angriff' || modus === 'verteidigung') && m.team === verteidiger) x += (m.team === 'blau' ? -1 : 1) * 30;
  return { x, y };
}

function botDenken(m, dt) {
  // 1. Gegner suchen, den man sehen kann
  m.suchZeit -= dt;
  if (m.suchZeit <= 0) {
    m.suchZeit = 0.25;
    let bester = null, besterD = begrenzt(m.typ.mg.weite, 600, 1000);   // Scharfschützen schauen weiter
    for (const o of mechs) {
      if (o.tot || o.team === m.team) continue;
      const d = dist(m, o);
      const sichtbar = sichtFrei(m, o) || (m.typ.mg.salve && mechs.some(f => !f.tot && f.team === m.team && f !== m && dist(f, o) < 700 && sichtFrei(f, o)));
      if (d < besterD && sichtbar) { bester = o; besterD = d; }
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
    const abstand = m.typ.mg.strahl || m.typ.mg.salve ? 450 : 220;   // Scharfschützen und Artillerie bleiben lieber weit weg
    if (d < abstand) { dx -= gx * 0.8; dy -= gy * 0.8; }   // Nicht zu nah ran
    // Zielen (mit Vorhalten, damit sie bewegte Ziele treffen)
    const mg = m.typ.mg;
    const flug = mg.salve ? (mg.zielZeit + 0.9 + d / mg.tempo) * 0.4 : d / mg.tempo;   // Artillerie: Wo ist er ungefähr, wenn die Raketen landen?
    const vorne = { x: g.x + g.vx * flug, y: g.y + g.vy * flug };   // Da wird der Gegner gleich sein
    const zielW = Math.atan2(vorne.y - m.y, vorne.x - m.x) + (Math.sin(zeit * 7 + m.seed * 3)) * BOT_UNGENAU;
    m.zielWeite = dist(m, vorne);
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

  // Raketenhagel von Gegnern? Schnell raus aus dem Kreis!
  for (const o of mechs) {
    if (!o.salve || o.team === m.team) continue;
    const z = o.salve.ziel, d = dist(m, z);
    if (d < o.typ.mg.streuRadius + 60) { dx += (m.x - z.x) / (d || 1) * 2; dy += (m.y - z.y) / (d || 1) * 2; }
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
    else if (a === 0) z.fortschritt = Math.max(0, z.fortschritt - dt * 2);   // Ohne Angreifer geht es langsam zurück
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
    p.h = Math.max(0, p.h + p.vh * dt);
    p.vh -= (p.g || 0) * dt;
    p.vx *= 0.94; p.vy *= 0.94;
    p.t -= dt;
  }
  partikel = partikel.filter(p => p.t > 0);
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  wackeln = Math.max(0, wackeln - dt * 30);
  rueckstoss = Math.max(0, rueckstoss - dt * 40);
  muendung -= dt;
  trefferAnzeige -= dt;
  for (const t of trefferRichtungen) t.t -= dt;
  trefferRichtungen = trefferRichtungen.filter(t => t.t > 0);
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
    if (m.seitHit > HEILEN_NACH) m.leben = Math.min(m.typ.leben, m.leben + HEILEN_TEMPO * dt);
    if (m.salve) updateSalve(m, dt);
  }
  updateSpieler(dt);
  for (const m of mechs) if (!m.istSpieler && !m.tot) botDenken(m, dt);
  mechsSchieben();
  updateSchuesse(dt);
  updateModus(dt);
}

// =====================================================================
// ===== 3D-Welt mit Three.js =====
// =====================================================================
const buehne = document.getElementById('buehne');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  buehne.insertBefore(renderer.domElement, canvas);   // 3D hinten, HUD vorne
} catch (e) {
  renderer = null;   // Kein 3D möglich (alter Computer?)
}
function groesseAnpassen() {
  if (renderer) renderer.setSize(buehne.clientWidth || W, buehne.clientHeight || H, false);
}
addEventListener('resize', groesseAnpassen);
groesseAnpassen();

const szene = new THREE.Scene();

const kamera = new THREE.PerspectiveCamera(SICHTFELD, W / H, 1, 6000);
kamera.rotation.order = 'YXZ';
szene.add(kamera);

// Licht: Himmel + Sonne mit Schatten (die Farben ändern sich je nach Karte)
const himmelsLicht = new THREE.HemisphereLight('#dfe8ff', '#4a4a55', 1.1);
szene.add(himmelsLicht);
const sonne = new THREE.DirectionalLight('#fff4e0', 1.6);
sonne.position.set(WELT_B / 2 - 600, 900, WELT_H / 2 - 400);
sonne.target.position.set(WELT_B / 2, 0, WELT_H / 2);
sonne.castShadow = true;
sonne.shadow.mapSize.set(2048, 2048);
Object.assign(sonne.shadow.camera, { left: -1400, right: 1400, top: 1000, bottom: -1000, near: 100, far: 2500 });
szene.add(sonne, sonne.target);

// Kleine Bilder (Texturen) selbst malen
function malTextur(b, h, malen) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  malen(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const kreisTextur = malTextur(64, 64, (g) => {
  const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.5, 'rgba(255,255,255,0.8)'); v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v; g.fillRect(0, 0, 64, 64);
});

// Zufall, der jedes Mal gleich ist (damit die Pflanzen immer am selben Platz stehen)
function zufallsGenerator(start) {
  let z = start;
  return () => { z = (z * 16807) % 2147483647; return (z - 1) / 2147483646; };
}

// Alles, was zur Karte gehört, kommt in diese Gruppe. Beim Kartenwechsel wird sie weggeworfen.
let kartenGruppe = null;
let kartenAnimation = null;   // Was sich auf der Karte bewegt (z. B. schwebende Sporen)
function baueKarte3D(k) {
  if (kartenGruppe) {
    szene.remove(kartenGruppe);
    kartenGruppe.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }
  kartenGruppe = new THREE.Group();
  szene.add(kartenGruppe);
  kartenAnimation = null;
  if (k.id === 'planet') bauePlanet(kartenGruppe); else baueFabrik(kartenGruppe);
  // Basen (farbiger Boden) gibt es überall
  for (const [team, x] of [['blau', 150], ['rot', WELT_B - 150]]) {
    const basis = new THREE.Mesh(new THREE.PlaneGeometry(300, WELT_H), new THREE.MeshBasicMaterial({ color: TEAMS[team].farbe, transparent: true, opacity: 0.18, depthWrite: false }));
    basis.rotation.x = -Math.PI / 2;
    basis.position.set(x, 0.5, WELT_H / 2);
    kartenGruppe.add(basis);
  }
}

// ===== Karte 1: 🏭 Stahlfabrik =====
const bodenTextur = malTextur(256, 256, (g, b, h) => {
  g.fillStyle = '#4d5360'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#3a3f4a'; g.lineWidth = 6; g.strokeRect(0, 0, b, h);
  g.strokeStyle = '#575e6c'; g.lineWidth = 2; g.strokeRect(10, 10, b - 20, h - 20);
  g.fillStyle = '#3a3f4a';
  for (const [x, y] of [[20, 20], [b - 20, 20], [20, h - 20], [b - 20, h - 20]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
});
bodenTextur.repeat.set(WELT_B / 100, WELT_H / 100);
const wandTextur = malTextur(128, 128, (g, b, h) => {
  g.fillStyle = '#7a8296'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#5b6375'; g.lineWidth = 6; g.strokeRect(0, 0, b, h);
  g.strokeStyle = '#6b7385'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(b, h / 2); g.stroke();
  g.fillStyle = '#4a5162';
  for (const [x, y] of [[10, 10], [b - 10, 10], [10, h - 10], [b - 10, h - 10], [10, h / 2 - 8], [b - 10, h / 2 - 8]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
});
const kistenTextur = malTextur(128, 128, (g, b, h) => {
  g.fillStyle = '#b07a3c'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#7a4f22'; g.lineWidth = 10; g.strokeRect(5, 5, b - 10, h - 10);
  g.beginPath(); g.moveTo(5, 5); g.lineTo(b - 5, h - 5); g.stroke();
});
const streifenTextur = malTextur(128, 32, (g, b, h) => {
  g.fillStyle = '#1b1b1b'; g.fillRect(0, 0, b, h);
  g.fillStyle = '#ffd166';
  for (let x = -h; x < b; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
});
const wandMat = new THREE.MeshStandardMaterial({ map: wandTextur, roughness: 0.6, metalness: 0.4 });
const kistenMat = new THREE.MeshStandardMaterial({ map: kistenTextur, roughness: 0.8 });
const kanteMat = new THREE.LineBasicMaterial({ color: '#2a2f3a' });

function baueFabrik(g) {
  const HIMMEL = '#8fa3c0';
  szene.background = new THREE.Color(HIMMEL);
  szene.fog = new THREE.Fog(HIMMEL, 700, 2600);
  himmelsLicht.color.set('#dfe8ff'); himmelsLicht.groundColor.set('#4a4a55'); himmelsLicht.intensity = 1.1;
  sonne.color.set('#fff4e0'); sonne.intensity = 1.6;
  // Boden
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(WELT_B, WELT_H), new THREE.MeshStandardMaterial({ map: bodenTextur, roughness: 0.9, metalness: 0.1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(WELT_B / 2, 0, WELT_H / 2);
  boden.receiveShadow = true;
  g.add(boden);
  const aussen = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: '#5d6470', roughness: 1 }));
  aussen.rotation.x = -Math.PI / 2;
  aussen.position.set(WELT_B / 2, -1, WELT_H / 2);
  g.add(aussen);
  // Wände und Kisten
  for (const r of WAENDE) {
    const kiste = r.art === 'kiste';
    const hoehe = kiste ? 40 : WAND_HOEHE;
    const geo = new THREE.BoxGeometry(r.w, hoehe, r.h);
    const wand = new THREE.Mesh(geo, kiste ? kistenMat : wandMat);
    wand.position.set(r.x + r.w / 2, hoehe / 2, r.y + r.h / 2);
    wand.castShadow = wand.receiveShadow = true;
    g.add(wand);
    const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(geo), kanteMat);
    kanten.position.copy(wand.position);
    g.add(kanten);
    if (!kiste) {   // Gelb-schwarzer Warnstreifen oben drauf
      const st = streifenTextur.clone();
      st.repeat.set(Math.max(r.w, r.h) / 64, 1);
      const streifen = new THREE.Mesh(new THREE.BoxGeometry(r.w + 2, 10, r.h + 2), new THREE.MeshStandardMaterial({ map: st }));
      streifen.position.set(r.x + r.w / 2, hoehe - 5, r.y + r.h / 2);
      g.add(streifen);
    }
  }
  // Rand der Arena: niedrige Mauer mit Warnstreifen
  for (const [x, y, b, t] of [[WELT_B / 2, -20, WELT_B + 80, 40], [WELT_B / 2, WELT_H + 20, WELT_B + 80, 40], [-20, WELT_H / 2, 40, WELT_H], [WELT_B + 20, WELT_H / 2, 40, WELT_H]]) {
    const st = streifenTextur.clone();
    st.repeat.set(Math.max(b, t) / 64, 2);
    const mauer = new THREE.Mesh(new THREE.BoxGeometry(b, 60, t), new THREE.MeshStandardMaterial({ map: st }));
    mauer.position.set(x, 30, y);
    mauer.receiveShadow = true;
    g.add(mauer);
  }
  // Große Fabriktürme draußen
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    const h = 300 + (i * 137) % 400;
    const turm = new THREE.Mesh(new THREE.BoxGeometry(160, h, 160), new THREE.MeshStandardMaterial({ color: '#6b7385', roughness: 0.8 }));
    turm.position.set(WELT_B / 2 + Math.cos(a) * 2100, h / 2, WELT_H / 2 + Math.sin(a) * 1500);
    g.add(turm);
  }
}

// ===== Karte 2: 🪐 Planet Xyloria =====
const alienBodenTextur = malTextur(256, 256, (g, b, h) => {
  g.fillStyle = '#3f2d5c'; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(7);
  for (let i = 0; i < 60; i++) {   // Flecken
    g.fillStyle = z() < 0.5 ? 'rgba(90,60,130,0.6)' : 'rgba(40,30,70,0.6)';
    g.beginPath(); g.ellipse(z() * b, z() * h, 6 + z() * 22, 4 + z() * 14, z() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 25; i++) {   // kleine leuchtende Punkte
    g.fillStyle = z() < 0.5 ? '#5eead4' : '#f0abfc';
    g.beginPath(); g.arc(z() * b, z() * h, 1.5 + z() * 1.5, 0, 7); g.fill();
  }
});
alienBodenTextur.repeat.set(WELT_B / 220, WELT_H / 220);
const felsTextur = malTextur(128, 128, (g, b, h) => {
  g.fillStyle = '#5a4876'; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(3);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = z() < 0.5 ? 'rgba(40,28,60,0.5)' : 'rgba(120,100,150,0.4)';
    g.beginPath(); g.arc(z() * b, z() * h, 3 + z() * 12, 0, 7); g.fill();
  }
  g.strokeStyle = 'rgba(30,20,45,0.8)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(z() * b, z() * h); g.lineTo(z() * b, z() * h); g.stroke(); }   // Risse
});
const felsMat = new THREE.MeshStandardMaterial({ map: felsTextur, roughness: 0.95, flatShading: true });
const kristallMats = ['#5eead4', '#f472b6', '#a78bfa'].map(f => new THREE.MeshStandardMaterial({ color: f, emissive: f, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.9, flatShading: true }));
const stielMat = new THREE.MeshStandardMaterial({ color: '#e9d5ff', roughness: 0.7 });
const hutMat = new THREE.MeshStandardMaterial({ color: '#9333ea', emissive: '#7e22ce', emissiveIntensity: 0.5, roughness: 0.6, side: THREE.DoubleSide });
const punktMat = new THREE.MeshBasicMaterial({ color: '#f0abfc' });
const leuchtMats = ['#5eead4', '#f0abfc', '#fde047', '#86efac'].map(f => new THREE.MeshStandardMaterial({ color: f, emissive: f, emissiveIntensity: 0.9 }));
const grasMat = new THREE.MeshStandardMaterial({ color: '#2dd4bf', emissive: '#0f766e', emissiveIntensity: 0.6, flatShading: true });

function fels(g, x, z, b, h, t, drehen = 0) {
  const f = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), felsMat);
  f.scale.set(b, h, t);
  f.position.set(x, h * 0.55, z);
  f.rotation.y = drehen;
  f.castShadow = f.receiveShadow = true;
  g.add(f);
  return f;
}
function kristalle(g, r, z, nr) {   // Ein Haufen leuchtender Kristalle
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
  const anzahl = 3 + Math.floor(z() * 3);
  for (let i = 0; i < anzahl; i++) {
    const hoehe = 60 + z() * 90;
    const k = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), kristallMats[(nr + i) % kristallMats.length]);
    k.scale.set(14 + z() * 12, hoehe, 14 + z() * 12);
    k.position.set(cx + (z() - 0.5) * r.w * 0.7, hoehe * 0.6, cz + (z() - 0.5) * r.h * 0.7);
    k.rotation.set((z() - 0.5) * 0.5, z() * 3, (z() - 0.5) * 0.5);
    k.castShadow = true;
    g.add(k);
  }
  fels(g, cx, cz, r.w * 0.55, 18, r.h * 0.55);   // Steinboden drunter
}
function riesenPilz(g, x, z, stielR, hoehe, hutR) {
  const stiel = new THREE.Mesh(new THREE.CylinderGeometry(stielR * 0.8, stielR, hoehe, 12), stielMat);
  stiel.position.set(x, hoehe / 2, z);
  stiel.castShadow = true;
  g.add(stiel);
  const hut = new THREE.Mesh(new THREE.SphereGeometry(hutR, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), hutMat);
  hut.scale.y = 0.55;
  hut.position.set(x, hoehe - 6, z);
  hut.castShadow = true;
  g.add(hut);
  for (let i = 0; i < 9; i++) {   // leuchtende Punkte auf dem Hut
    const a = i / 9 * Math.PI * 2, r = hutR * 0.6;
    const p = new THREE.Mesh(new THREE.SphereGeometry(hutR * 0.08, 8, 6), punktMat);
    p.position.set(x + Math.cos(a) * r, hoehe - 6 + hutR * 0.42, z + Math.sin(a) * r);
    g.add(p);
  }
}
function leuchtPflanze(g, x, z, zufall) {   // Kleine Pflanze mit leuchtender Kugel
  const h = 14 + zufall() * 22;
  const stiel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, h, 5), grasMat);
  stiel.position.set(x, h / 2, z);
  stiel.rotation.z = (zufall() - 0.5) * 0.4;
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(3 + zufall() * 3, 8, 6), leuchtMats[Math.floor(zufall() * leuchtMats.length)]);
  kugel.position.set(x, h + 2, z);
  g.add(stiel, kugel);
}
function grasBuschel(g, x, z, zufall) {   // Spitze Alien-Gräser
  for (let i = 0; i < 3; i++) {
    const h = 10 + zufall() * 16;
    const halm = new THREE.Mesh(new THREE.ConeGeometry(2, h, 4), grasMat);
    halm.position.set(x + (zufall() - 0.5) * 14, h / 2, z + (zufall() - 0.5) * 14);
    halm.rotation.set((zufall() - 0.5) * 0.6, 0, (zufall() - 0.5) * 0.6);
    g.add(halm);
  }
}

function bauePlanet(g) {
  const HIMMEL = '#2a1846';
  szene.background = new THREE.Color(HIMMEL);
  szene.fog = new THREE.Fog('#3b2363', 500, 2400);
  himmelsLicht.color.set('#c4b5fd'); himmelsLicht.groundColor.set('#134e4a'); himmelsLicht.intensity = 1.2;
  sonne.color.set('#a5f3fc'); sonne.intensity = 1.3;
  const z = zufallsGenerator(42);

  // Boden
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(WELT_B, WELT_H), new THREE.MeshStandardMaterial({ map: alienBodenTextur, roughness: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(WELT_B / 2, 0, WELT_H / 2);
  boden.receiveShadow = true;
  g.add(boden);
  const aussen = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: '#3a2754', roughness: 1 }));
  aussen.rotation.x = -Math.PI / 2;
  aussen.position.set(WELT_B / 2, -1, WELT_H / 2);
  g.add(aussen);

  // Hindernisse
  WAENDE.forEach((r, nr) => {
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.art === 'fels') {
      fels(g, cx, cz, r.w * 0.62, 95, r.h * 0.62, z());
      fels(g, cx + (z() - 0.5) * r.w * 0.4, cz + (z() - 0.5) * r.h * 0.4, r.w * 0.4, 130, r.h * 0.4, z());   // Spitze oben drauf
    } else if (r.art === 'kristall') {
      kristalle(g, r, z, nr);
    } else if (r.art === 'pilz') {
      riesenPilz(g, cx, cz, r.w / 2, 150, 120);
    } else {
      fels(g, cx, cz, r.w * 0.6, 40, r.h * 0.6, z());
    }
  });

  // Rand der Arena: eine Reihe Felsen
  for (let x = 0; x <= WELT_B; x += 110) {
    for (const y of [-45, WELT_H + 45]) fels(g, x, y, 50 + z() * 30, 50 + z() * 60, 40 + z() * 20, z() * 3);
  }
  for (let y = 0; y <= WELT_H; y += 110) {
    for (const x of [-45, WELT_B + 45]) fels(g, x, y, 40 + z() * 20, 50 + z() * 60, 50 + z() * 30, z() * 3);
  }

  // Pflanzen in der Arena (aber nicht in Felsen)
  for (let i = 0; i < 110; i++) {
    const x = z() * WELT_B, y = z() * WELT_H;
    if (WAENDE.some(r => x > r.x - 20 && x < r.x + r.w + 20 && y > r.y - 20 && y < r.y + r.h + 20)) continue;
    if (z() < 0.45) leuchtPflanze(g, x, y, z); else grasBuschel(g, x, y, z);
  }

  // Draußen: riesige Pilze und Felsnadeln
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + z() * 0.2;
    const x = WELT_B / 2 + Math.cos(a) * (1800 + z() * 500), y = WELT_H / 2 + Math.sin(a) * (1200 + z() * 400);
    if (i % 2) riesenPilz(g, x, y, 30 + z() * 20, 300 + z() * 300, 200 + z() * 120);
    else {
      const nadel = new THREE.Mesh(new THREE.ConeGeometry(70 + z() * 50, 400 + z() * 500, 6), felsMat);
      nadel.position.set(x, 200, y);
      g.add(nadel);
    }
  }

  // Am Himmel: ein großer Planet mit Ring und ein kleiner Mond
  const planet = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 24), new THREE.MeshBasicMaterial({ color: '#f472b6', fog: false }));
  planet.position.set(WELT_B / 2 + 2600, 1500, WELT_H / 2 - 3200);
  const ring = new THREE.Mesh(new THREE.RingGeometry(650, 900, 64), new THREE.MeshBasicMaterial({ color: '#fbcfe8', side: THREE.DoubleSide, transparent: true, opacity: 0.6, fog: false }));
  ring.position.copy(planet.position);
  ring.rotation.set(1.2, 0.3, 0.2);
  const mond = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16), new THREE.MeshBasicMaterial({ color: '#a5f3fc', fog: false }));
  mond.position.set(WELT_B / 2 - 2500, 1300, WELT_H / 2 - 2800);
  g.add(planet, ring, mond);
  // Sterne
  const sternPos = [];
  for (let i = 0; i < 400; i++) {
    const a = z() * Math.PI * 2, b = 0.15 + z() * 1.2;
    sternPos.push(WELT_B / 2 + Math.cos(a) * Math.cos(b) * 4500, Math.sin(b) * 4500, WELT_H / 2 + Math.sin(a) * Math.cos(b) * 4500);
  }
  const sternGeo = new THREE.BufferGeometry();
  sternGeo.setAttribute('position', new THREE.Float32BufferAttribute(sternPos, 3));
  g.add(new THREE.Points(sternGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false })));

  // Schwebende, leuchtende Sporen
  const ANZ = 300, sporenPos = new Float32Array(ANZ * 3), basis = [];
  for (let i = 0; i < ANZ; i++) basis.push({ x: z() * WELT_B, y: 20 + z() * 160, z: z() * WELT_H, p: z() * 6 });
  const sporenGeo = new THREE.BufferGeometry();
  sporenGeo.setAttribute('position', new THREE.BufferAttribute(sporenPos, 3));
  const sporen = new THREE.Points(sporenGeo, new THREE.PointsMaterial({ color: '#a7f3d0', size: 5, map: kreisTextur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sporen.frustumCulled = false;
  g.add(sporen);
  kartenAnimation = () => {
    basis.forEach((b, i) => {
      sporenPos[i * 3] = b.x + Math.sin(zeit * 0.3 + b.p) * 30;
      sporenPos[i * 3 + 1] = b.y + Math.sin(zeit * 0.7 + b.p) * 15;
      sporenPos[i * 3 + 2] = b.z + Math.cos(zeit * 0.25 + b.p) * 30;
    });
    sporenGeo.attributes.position.needsUpdate = true;
    ring.rotation.z += 0.0005;
  };
}

// Karte laden: Hindernisse, Wege für die Bots und die 3D-Welt
let geladeneKarte = null;
function ladeKarte(k) {
  if (geladeneKarte === k) return;
  geladeneKarte = k;
  WAENDE = waendeVon(k);
  baueGitter();
  baueKarte3D(k);
}
ladeKarte(karte);

// ----- Ein Mech aus Klötzen -----
const metall = farbe => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5, metalness: 0.5 });
const dunkelMat = metall('#2a2d36'), grauMat = metall('#4b5060');
function klotz(b, h, t, mat, x, y, z) {
  const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
  k.position.set(x, y, z);
  k.castShadow = true;
  return k;
}
function rohr(r, l, mat, x, y, z) {   // Ein Rohr, das nach vorne (x) zeigt
  const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), mat);
  k.rotation.z = Math.PI / 2;
  k.position.set(x, y, z);
  k.castShadow = true;
  return k;
}
// In der Logik zeigt Winkel 0 nach +x. Ein 3D-Objekt mit rotation.y = -winkel schaut dann in die richtige Richtung.
function baueMech(m) {
  const T = TEAMS[m.team], typ = m.typ;
  const koerperMat = new THREE.MeshStandardMaterial({ color: T.farbe, roughness: 0.45, metalness: 0.4, emissive: '#000000' });
  const teamDunkel = metall(T.dunkel), akzentMat = metall(typ.akzent);
  const gruppe = new THREE.Group();
  // Beine (drehen sich in Laufrichtung)
  const beine = new THREE.Group();
  const dick = typ.id === 'koloss' ? 1.5 : 1;   // Der Koloss hat dicke Beine
  beine.add(klotz(22, 10, 40, grauMat, 0, 38, 0));   // Hüfte
  const fuesse = [], schenkel = [];
  for (const s of [-1, 1]) {
    const sch = klotz(10 * dick, 32, 10 * dick, dunkelMat, 0, 22, s * 17);
    const fuss = klotz(28, 8, 14 * dick, dunkelMat, 0, 4, s * 19);
    beine.add(sch, fuss);
    schenkel.push(sch); fuesse.push(fuss);
  }
  gruppe.add(beine);
  // Oberkörper (dreht sich zum Ziel)
  const torso = new THREE.Group();
  torso.position.y = 48;
  torso.add(klotz(36, 28, 38, koerperMat, 0, 10, 0));            // Rumpf
  torso.add(klotz(37, 4, 39, akzentMat, 0, -2, 0));               // Streifen in der Mech-Farbe
  torso.add(klotz(16, 16, 22, dunkelMat, 16, 14, 0));             // Cockpit
  const visier = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 16), new THREE.MeshBasicMaterial({ color: T.hell }));
  visier.position.set(24.5, 16, 0);
  torso.add(visier);
  if (typ.mg.salve) {
    // ☄️ Donnerhagel: ein großer Raketenwerfer mit 9 Rohren auf dem Rücken, schräg nach oben
    const werfer = new THREE.Group();
    werfer.position.set(-4, 38, 6);
    werfer.rotation.z = 0.45;
    werfer.add(klotz(26, 24, 32, teamDunkel, 0, 0, 0));
    for (const y of [-7, 0, 7]) for (const z of [-10, 0, 10]) {
      const loch = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 2, 8), akzentMat);
      loch.rotation.z = Math.PI / 2;
      loch.position.set(13.5, y, z);
      werfer.add(loch);
    }
    torso.add(werfer);
    for (const s of [-1, 1]) torso.add(klotz(14, 8, 7, grauMat, 12, 3, s * 21));   // kleine Arme vorne
  } else if (typ.mg.strahl) {
    // 🎯 Adlerauge: eine lange Railgun mit Zielfernrohr
    torso.add(klotz(22, 12, 10, grauMat, 12, 4, 21));
    torso.add(rohr(4, 64, dunkelMat, 52, 4, 21));
    for (const x of [34, 50, 66]) torso.add(rohr(5, 3, akzentMat, x, 4, 21));   // leuchtende Ringe
    torso.add(klotz(16, 7, 7, dunkelMat, 10, 14, 21));               // Zielfernrohr
  } else {
    for (const s of [-1, 1]) {
      torso.add(klotz(18, 10, 9, grauMat, 10, 3, s * 21));          // Kanonen-Halter
      torso.add(rohr(3.5, 30, dunkelMat, 30, 3, s * 21));            // Kanonenrohr
    }
  }
  // Raketenwerfer: Der Feuersturm hat zwei große, alle anderen einen
  const raketenLicht = new THREE.MeshBasicMaterial({ color: '#ffd166' });
  const werfer = typ.rakete.anzahl > 1 ? [-1, 1] : [-1];
  for (const s of werfer) {
    const gross = typ.rakete.anzahl > 1;
    torso.add(klotz(24, gross ? 16 : 12, 16, teamDunkel, -6, gross ? 32 : 30, s * 12));
    const lichter = gross ? [-5, 0, 5] : [-4, 4];
    for (const z of lichter) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 2, 8), raketenLicht);
      l.rotation.z = Math.PI / 2; l.position.set(6.5, gross ? 32 : 30, s * 12 + z);
      torso.add(l);
    }
  }
  if (typ.id === 'koloss') {   // 🛡️ Dicke Panzerplatten an den Seiten
    for (const s of [-1, 1]) torso.add(klotz(30, 26, 6, koerperMat, 0, 12, s * 22));
  }
  if (typ.id === 'blitz') {    // ⚡ Flossen hinten, damit er schnell aussieht
    for (const s of [-1, 1]) {
      const flosse = klotz(18, 4, 4, akzentMat, -22, 22, s * 12);
      flosse.rotation.z = -0.5;
      torso.add(flosse);
    }
  }
  const antenne = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 22, 4), grauMat);
  antenne.position.set(-12, 34, typ.rakete.anzahl > 1 ? 0 : 12);
  torso.add(antenne);
  gruppe.add(torso);
  // Schutzschild
  const schild = new THREE.Mesh(new THREE.SphereGeometry(44, 20, 14), new THREE.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.25, depthWrite: false }));
  schild.position.y = 40;
  gruppe.add(schild);
  gruppe.scale.setScalar(typ.groesse);
  return { gruppe, beine, torso, fuesse, schenkel, koerperMat, raketenLicht, schild };
}

function zeigeMech(m) {
  const g = m.g3;
  g.gruppe.visible = !m.tot && !m.istSpieler;   // Dich selbst siehst du nicht, du sitzt ja drin!
  if (!g.gruppe.visible) return;
  g.gruppe.position.set(m.x, 0, m.y);
  g.beine.rotation.y = -m.laufWinkel;
  g.torso.rotation.y = -m.zielWinkel;
  [-1, 1].forEach((s, i) => {
    const vor = m.laeuft ? Math.sin(m.phase) * 11 * s : 0;
    const heben = m.laeuft ? Math.max(0, Math.cos(m.phase) * s) * 9 : 0;
    g.fuesse[i].position.set(vor, 4 + heben, s * 19);
    g.schenkel[i].position.set(vor / 2, 22 + heben / 2, s * 17);
  });
  g.torso.position.y = 48 + (m.laeuft ? Math.abs(Math.sin(m.phase)) * 2.5 : 0);
  g.koerperMat.emissive.set(m.blitz > 0 ? '#ffffff' : '#000000');
  g.raketenLicht.color.set(m.raketePause <= 0 ? '#ffd166' : '#222222');
  g.schild.visible = m.schutz > 0;
  g.schild.material.opacity = 0.18 + Math.sin(zeit * 10) * 0.08;
}

// ----- Eroberungs-Punkte -----
let zielObjekte = [];
function textSprite(t, farbe = '#ffffff', groesse = 80) {
  const tex = malTextur(128, 128, (g) => {
    g.font = `bold ${groesse}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(t, 64, 68);
    g.fillStyle = farbe; g.fillText(t, 64, 68);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(70, 70, 1);
  return s;
}
function baueZiele() {
  for (const o of zielObjekte) szene.remove(o.gruppe);
  zielObjekte = ziele.map(z => {
    const gruppe = new THREE.Group();
    gruppe.position.set(z.x, 0, z.y);
    const randMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 });
    const rand = new THREE.Mesh(new THREE.RingGeometry(z.r - 6, z.r, 64), randMat);
    rand.rotation.x = -Math.PI / 2; rand.position.y = 1;
    const flaecheMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false });
    const flaeche = new THREE.Mesh(new THREE.CircleGeometry(z.r, 64), flaecheMat);
    flaeche.rotation.x = -Math.PI / 2; flaeche.position.y = 0.8;
    const saeuleMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
    const saeule = new THREE.Mesh(new THREE.CylinderGeometry(z.r, z.r, 260, 48, 1, true), saeuleMat);
    saeule.position.y = 130;
    const fortschritt = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
    fortschritt.rotation.x = -Math.PI / 2; fortschritt.position.y = 1.5;
    const schild = textSprite(z.name);
    schild.position.y = 190;
    gruppe.add(rand, flaeche, saeule, fortschritt, schild);
    szene.add(gruppe);
    return { gruppe, randMat, flaecheMat, saeuleMat, fortschritt, schild, alterWert: -1 };
  });
}
function zeigeZiele() {
  ziele.forEach((z, i) => {
    const o = zielObjekte[i];
    let farbe = '#ffffff', aktiv = true;
    if (modus === 'punkt') farbe = z.besitzer ? TEAMS[z.besitzer].farbe : '#ffffff';
    else {
      aktiv = i === aktivesZiel;
      farbe = z.erobert ? TEAMS[angreifer].farbe : TEAMS[verteidiger].farbe;
    }
    o.randMat.color.set(farbe); o.flaecheMat.color.set(farbe); o.saeuleMat.color.set(farbe);
    o.randMat.opacity = aktiv ? 0.9 : 0.3;
    o.saeuleMat.opacity = aktiv ? 0.06 + (z.umkaempft ? Math.abs(Math.sin(zeit * 6)) * 0.08 : 0) : 0.02;
    o.schild.visible = aktiv;
    // Fortschritts-Ring neu bauen, wenn sich etwas geändert hat
    const wer = modus === 'punkt' ? z.wer : angreifer;
    const wert = z.erobert || !wer ? 0 : Math.round(z.fortschritt);
    if (wert !== o.alterWert) {
      o.alterWert = wert;
      o.fortschritt.geometry.dispose();
      o.fortschritt.geometry = wert > 0 ? new THREE.RingGeometry(z.r - 22, z.r - 8, 64, 1, Math.PI / 2, -Math.PI * 2 * wert / 100) : new THREE.BufferGeometry();
      if (wer) o.fortschritt.material.color.set(TEAMS[wer].farbe);
    }
  });
}

// ----- Schüsse -----
const kugelGeo = new THREE.BoxGeometry(26, 2.5, 2.5);
const kugelMat = { blau: new THREE.MeshBasicMaterial({ color: '#bfdbfe' }), rot: new THREE.MeshBasicMaterial({ color: '#fecaca' }) };
const strahlGeo = new THREE.BoxGeometry(90, 3, 3);
const strahlMat = new THREE.MeshBasicMaterial({ color: '#a7f3d0' });
const salvenGeo = new THREE.CylinderGeometry(2.5, 3.5, 20, 8).rotateX(Math.PI / 2);   // zeigt nach vorne (z)
const salvenMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#c084fc', emissiveIntensity: 0.6 });
const raketenGeo = new THREE.BoxGeometry(18, 6, 6);
const raketenMat = new THREE.MeshStandardMaterial({ color: '#dddddd', emissive: '#ff9f43', emissiveIntensity: 0.4 });
let schussMeshes = [];
function zeigeSchuesse() {
  for (const s of schuesse) {
    if (!s.mesh) {
      if (s.art === 'kugel') s.mesh = new THREE.Mesh(kugelGeo, kugelMat[s.team]);
      else if (s.art === 'strahl') s.mesh = new THREE.Mesh(strahlGeo, strahlMat);
      else if (s.art === 'salve') s.mesh = new THREE.Mesh(salvenGeo, salvenMat);
      else s.mesh = new THREE.Mesh(raketenGeo, raketenMat);
      s.mesh.rotation.y = -Math.atan2(s.vy, s.vx);
      szene.add(s.mesh);
      schussMeshes.push(s);
    }
    s.mesh.position.set(s.x, s.h, s.y);
    if (s.bogen && s.dx !== undefined) s.mesh.lookAt(s.x + s.dx, s.h + s.dh, s.y + s.dy);   // Rakete zeigt in Flugrichtung
  }
  schussMeshes = schussMeshes.filter(s => {
    if (s.weg) { szene.remove(s.mesh); return false; }
    return true;
  });
}

// ----- Funken, Feuer und Rauch -----
const MAX_PARTIKEL = 2500;
function partikelSystem(groesse, mischen) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PARTIKEL * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_PARTIKEL * 3), 3));
  const mat = new THREE.PointsMaterial({ size: groesse, map: kreisTextur, vertexColors: true, transparent: true, depthWrite: false, blending: mischen });
  const punkte = new THREE.Points(geo, mat);
  punkte.frustumCulled = false;
  szene.add(punkte);
  return punkte;
}
const feuerPunkte = partikelSystem(10, THREE.AdditiveBlending);
const rauchPunkte = partikelSystem(28, THREE.NormalBlending);
const farbe3 = new THREE.Color();
let explosionsKugeln = [];
function zeigePartikel() {
  const zaehler = { feuer: 0, rauch: 0 };
  for (const p of partikel) {
    if (p.kugel) {   // Feuerball der Explosion
      if (!p.mesh) {
        p.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: p.farbe, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        szene.add(p.mesh);
        explosionsKugeln.push(p);
      }
      const k = p.t / p.max;
      p.mesh.position.set(p.x, p.h, p.y);
      p.mesh.scale.setScalar(p.kugel * (1 - k * 0.6));
      p.mesh.material.opacity = k;
      continue;
    }
    const sys = p.rauch ? rauchPunkte : feuerPunkte;
    const n = p.rauch ? zaehler.rauch++ : zaehler.feuer++;
    if (n >= MAX_PARTIKEL) continue;
    const pos = sys.geometry.attributes.position.array, col = sys.geometry.attributes.color.array;
    pos[n * 3] = p.x; pos[n * 3 + 1] = p.h; pos[n * 3 + 2] = p.y;
    farbe3.set(p.farbe);
    const k = p.rauch ? 1 : Math.min(1, p.t / p.max * 1.5);   // Feuer wird dunkler = verschwindet
    col[n * 3] = farbe3.r * k; col[n * 3 + 1] = farbe3.g * k; col[n * 3 + 2] = farbe3.b * k;
  }
  for (const [sys, n] of [[feuerPunkte, zaehler.feuer], [rauchPunkte, zaehler.rauch]]) {
    sys.geometry.setDrawRange(0, Math.min(n, MAX_PARTIKEL));
    sys.geometry.attributes.position.needsUpdate = true;
    sys.geometry.attributes.color.needsUpdate = true;
  }
  explosionsKugeln = explosionsKugeln.filter(p => {
    if (p.t > 0) return true;
    szene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
    return false;
  });
}

// ----- Deine Waffen im Bild (unten) -----
const waffen = new THREE.Group();
kamera.add(waffen);
const blitzMat = new THREE.SpriteMaterial({ map: kreisTextur, color: '#ffd166', blending: THREE.AdditiveBlending, transparent: true, depthTest: false });
const muendungsBlitz = new THREE.Sprite(blitzMat);
muendungsBlitz.scale.set(14, 14, 1);
function baueWaffen(typ) {
  while (waffen.children.length) waffen.remove(waffen.children[0]);
  const mat = metall(TEAMS.blau.farbe), akzent = metall(typ.akzent);
  if (typ.mg.salve) {   // ☄️ Raketenwerfer rechts, schräg nach oben
    const werfer = new THREE.Group();
    werfer.position.set(17, -14, -34);
    werfer.rotation.x = 0.35;
    werfer.add(new THREE.Mesh(new THREE.BoxGeometry(18, 14, 26), mat));
    for (const x of [-5, 0, 5]) for (const y of [-3.5, 3.5]) {
      const loch = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.5, 8), akzent);
      loch.rotation.x = Math.PI / 2;
      loch.position.set(x, y, -13.2);
      werfer.add(loch);
    }
    waffen.add(werfer);
    blitzMat.color.set('#ffb347');
    waffen.add(muendungsBlitz);
    waffen.userData.muendungZ = -50;
    waffen.userData.muendungY = -6;
    waffen.traverse(o => { o.renderOrder = 10; });
    return;
  }
  waffen.userData.muendungY = -13;
  const laenge = typ.mg.strahl ? 46 : 24;
  for (const s of typ.mg.strahl ? [1] : [-1, 1]) {   // Railgun: nur ein langes Rohr rechts
    const halter = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 16), mat);
    halter.position.set(s * 15, -14, -22);
    const streifen = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2, 10), akzent);
    streifen.position.set(s * 15, -10.4, -22);
    const lauf = new THREE.Mesh(new THREE.CylinderGeometry(typ.mg.strahl ? 2.4 : 1.8, 2.2, laenge, 10), dunkelMat);
    lauf.rotation.x = Math.PI / 2;
    lauf.position.set(s * 15, -13, -30 - laenge / 2);
    waffen.add(halter, streifen, lauf);
  }
  if (typ.mg.strahl) {
    for (const z of [-40, -52, -64]) {   // leuchtende Ringe an der Railgun
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.5, 12), akzent);
      ring.rotation.x = Math.PI / 2; ring.position.set(15, -13, z);
      waffen.add(ring);
    }
  }
  blitzMat.color.set(typ.mg.strahl ? '#a7f3d0' : '#ffd166');
  waffen.add(muendungsBlitz);
  waffen.userData.muendungZ = -34 - laenge;
  waffen.traverse(o => { o.renderOrder = 10; });
}
baueWaffen(meinMech);

// ----- Zielkreise der Artillerie -----
// Dein Zielring (zum Anvisieren) und die Kreise, wo gerade Raketen runterkommen
const zielRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
zielRing.rotation.x = -Math.PI / 2;
szene.add(zielRing);
const salvenKreise = new Map();   // Mech -> Kreis auf dem Boden
function zeigeSalvenKreise() {
  for (const m of mechs) {
    if (!m.salve) continue;
    let k = salvenKreise.get(m);
    if (!k) {
      const freund = m.team === spieler.team;
      const farbe = freund ? '#c084fc' : '#ef4444';
      k = new THREE.Group();
      const rand = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      const flaeche = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      const kreuz = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.14, 24), rand.material);
      for (const t of [rand, flaeche, kreuz]) { t.rotation.x = -Math.PI / 2; k.add(t); }
      k.userData.rand = rand;
      szene.add(k);
      salvenKreise.set(m, k);
    }
    k.position.set(m.salve.ziel.x, 2.5, m.salve.ziel.y);
    k.scale.setScalar(m.typ.mg.streuRadius + m.typ.mg.radius * 0.5);
    k.userData.rand.material.opacity = 0.5 + Math.abs(Math.sin(zeit * 8)) * 0.5;   // blinkt
  }
  for (const [m, k] of salvenKreise) {   // Kreise ohne Salve wegräumen
    if (m.salve && mechs.includes(m)) continue;
    szene.remove(k);
    salvenKreise.delete(m);
  }
}

// ----- Kamera und Zeichnen der 3D-Welt -----
function zeichne3D() {
  if (kartenAnimation) kartenAnimation();
  zeigeSalvenKreise();
  zielRing.visible = !spieler.tot && !!spieler.typ.mg.salve && !spieler.salve && zustand === 'spiel';
  if (zielRing.visible) {
    const p = landePunkt(spieler);
    zielRing.position.set(p.x, 2, p.y);
    zielRing.scale.setScalar(spieler.typ.mg.streuRadius + spieler.typ.mg.radius * 0.5);
    zielRing.material.opacity = spieler.mgPause > 0 ? 0.25 : 0.85;
  }
  for (const m of mechs) zeigeMech(m);
  zeigeZiele();
  zeigeSchuesse();
  zeigePartikel();
  const m = spieler;
  if (!m.tot) {
    const wippen = m.laeuft ? Math.abs(Math.sin(m.phase)) * 2.5 : 0;   // Cockpit wackelt beim Laufen
    kamera.position.set(m.x + (Math.random() - 0.5) * wackeln, AUGEN_HOEHE * m.typ.groesse + wippen + (Math.random() - 0.5) * wackeln, m.y);
    kamera.rotation.set(blick.hoch, -blick.links - Math.PI / 2, 0);
    waffen.visible = true;
    waffen.position.set(0, m.laeuft ? Math.sin(m.phase) * 0.8 : 0, rueckstoss);
    muendungsBlitz.visible = muendung > 0;
    muendungsBlitz.position.set(m.typ.mg.strahl ? 15 : (m.typ.mg.salve ? 17 : m.lauf * 15), waffen.userData.muendungY, waffen.userData.muendungZ);
  } else {
    // Zerstört: Die Kamera fliegt hoch und schaut auf dein Wrack
    const w = m.wrack;
    const k = Math.min(1, (NEUSTART_ZEIT - m.neustart) / 1.5);
    kamera.position.set(w.x - Math.cos(blick.links) * 160 * k, AUGEN_HOEHE + 200 * k, w.y - Math.sin(blick.links) * 160 * k);
    kamera.lookAt(w.x, 0, w.y);
    waffen.visible = false;
  }
  kamera.updateMatrixWorld();
  if (renderer) renderer.render(szene, kamera);
}

// Wo auf dem Bildschirm ist ein Punkt aus der 3D-Welt?
const hilfsVektor = new THREE.Vector3();
function aufBildschirm(x, h, y) {
  hilfsVektor.set(x, h, y).project(kamera);
  return { x: (hilfsVektor.x + 1) / 2 * W, y: (1 - hilfsVektor.y) / 2 * H, vorne: hilfsVektor.z < 1 };
}

// =====================================================================
// ===== HUD (die Anzeigen vorne drauf) =====
// =====================================================================
function balken(x, y, b, h, anteil, farbe, hinten = 'rgba(0,0,0,0.6)') {
  ctx.fillStyle = hinten; rr(x, y, b, h, h / 2); ctx.fill();
  if (anteil > 0) { ctx.fillStyle = farbe; rr(x, y, Math.max(h, b * Math.min(1, anteil)), h, h / 2); ctx.fill(); }
}

// Namen und Lebensbalken über den anderen Mechs
function zeichneNamen() {
  for (const m of mechs) {
    if (m.tot || m.istSpieler) continue;
    const freund = m.team === spieler.team;
    const d = dist(m, spieler);
    if (!freund && (d > 900 || !sichtFrei(spieler, m))) continue;   // Gegner nur, wenn du sie siehst
    const p = aufBildschirm(m.x, 100 * m.typ.groesse, m.y);
    if (!p.vorne || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
    const T = TEAMS[m.team];
    const s = begrenzt(1.4 - d / 1200, 0.6, 1.2);
    text(`${m.typ.emoji} ${m.name}`, p.x, p.y - 12 * s, 13 * s, T.hell);
    const b = 50 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - b / 2 - 1, p.y - 2, b + 2, 6);
    ctx.fillStyle = m.leben > 35 ? (freund ? '#4ade80' : '#ff6b6b') : '#ffd166';
    ctx.fillRect(p.x - b / 2, p.y - 1, b * m.leben / m.typ.leben, 4);
  }
}

// Wo ist das Ziel? Zeichen über dem Punkt oder Pfeil am Rand
function zeichneZielZeichen() {
  if (modus === 'team' || spieler.tot) return;
  const z = modus === 'punkt' ? ziele[0] : ziele[aktivesZiel];
  const w = winkelDiff(blick.links, Math.atan2(z.y - spieler.y, z.x - spieler.x));
  const meter = Math.round(dist(z, spieler) / 10);
  if (Math.abs(w) < 0.8) {
    const p = aufBildschirm(z.x, 120, z.y);
    if (!p.vorne) return;
    const y = begrenzt(p.y, 90, H - 120);
    if (dist(z, spieler) > z.r) text(`${z.name} ${meter} m`, p.x, y, 16, '#ffd166');
  } else {
    const rechts = w > 0;
    const x = rechts ? W - 40 : 40, y = H / 2;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    if (rechts) { ctx.moveTo(x + 16, y); ctx.lineTo(x - 8, y - 16); ctx.lineTo(x - 8, y + 16); }
    else { ctx.moveTo(x - 16, y); ctx.lineTo(x + 8, y - 16); ctx.lineTo(x + 8, y + 16); }
    ctx.fill();
    text(`${z.name} ${meter} m`, x + (rechts ? -10 : 10), y + 32, 14, '#ffd166');
  }
}

// Cockpit-Rahmen am Bildrand
function zeichneCockpit() {
  ctx.fillStyle = 'rgba(20,24,32,0.85)';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(120, 0); ctx.lineTo(0, 70); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W - 120, 0); ctx.lineTo(W, 70); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 60); ctx.lineTo(60, H); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W, H); ctx.lineTo(W, H - 60); ctx.lineTo(W - 60, H); ctx.fill();
  // Rote Ränder, wenn du wenig Leben hast
  if (spieler.leben < 35 && !spieler.tot) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, `rgba(255,0,0,${0.25 + Math.sin(zeit * 6) * 0.1})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function zeichneHUD() {
  zeichneCockpit();
  zeichneNamen();
  zeichneZielZeichen();

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
  text(`${m.typ.emoji} ${m.typ.name}`, 22, H - 106, 16, m.typ.akzent, 'left');
  text('❤️', 32, H - 72, 18, '#fff', 'center', false);
  balken(50, H - 80, 236, 16, m.leben / m.typ.leben, m.leben > 35 ? '#4ade80' : '#ff6b6b');
  text(`${Math.ceil(m.leben)}`, 168, H - 72, 13, '#fff');
  const rBereit = m.raketePause <= 0;
  text('🚀', 32, H - 44, 16, '#fff', 'center', false);
  balken(50, H - 50, 100, 12, rBereit ? 1 : 1 - m.raketePause / m.typ.rakete.pause, rBereit ? '#ffd166' : '#8a8f9e');
  text(rBereit ? 'Rechtsklick' : '', 100, H - 30, 10, '#c9c3ff', 'center', false);
  const bBereit = m.boostPause <= 0;
  text('💨', 170, H - 44, 16, '#fff', 'center', false);
  balken(186, H - 50, 100, 12, bBereit ? 1 : 1 - m.boostPause / m.typ.boostPause, bBereit ? '#6fe3ff' : '#8a8f9e');
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
    if (o.tot || o.istSpieler) continue;
    if (o.team !== spieler.team && !sichtFrei(spieler, o)) continue;   // Gegner nur, wenn du sie siehst
    ctx.fillStyle = TEAMS[o.team].farbe;
    kreis(mx + o.x * mk, my + o.y * mk, 3); ctx.fill();
  }
  if (!m.tot) {   // Du: ein gelber Pfeil, der zeigt, wohin du schaust
    ctx.save();
    ctx.translate(mx + m.x * mk, my + m.y * mk); ctx.rotate(blick.links);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ----- Nachricht -----
  if (nachricht) {
    ctx.globalAlpha = Math.min(1, nachricht.t * 2);
    text(nachricht.text, W / 2, 110, 24, nachricht.farbe);
    ctx.globalAlpha = 1;
  }

  // ----- Von wo wirst du getroffen? (rote Bögen) -----
  for (const t of trefferRichtungen) {
    const w = winkelDiff(blick.links, Math.atan2(t.von.y - m.y, t.von.x - m.x)) - Math.PI / 2;
    ctx.strokeStyle = `rgba(255,60,60,${t.t * 0.8})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 110, w - 0.3, w + 0.3); ctx.stroke();
  }

  // ----- Zerstört? -----
  if (m.tot && zustand === 'spiel') {
    ctx.fillStyle = 'rgba(80,0,0,0.3)'; ctx.fillRect(0, 0, W, H);
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

  // ----- Artillerie: Wie weit ist das Ziel, und ist der Raketenhagel bereit? -----
  if (zustand === 'spiel' && !m.tot && m.typ.mg.salve) {
    if (m.salve) text(m.salve.warten > 0 ? '🎯 Ziel erfasst ...' : `☄️ Raketenhagel! ${m.salve.rest}`, W / 2, H / 2 + 40, 16, m.typ.akzent);
    else {
      const weite = Math.round(dist(m, landePunkt(m)) / 10);
      text(`🎯 ${weite} m`, W / 2 + 30, H / 2 + 34, 15, m.typ.akzent, 'left');
      if (m.mgPause > 0) {
        balken(W / 2 - 25, H / 2 + 50, 50, 5, 1 - m.mgPause / m.typ.mg.pause, m.typ.akzent);
        text(`Nachladen ${Math.ceil(m.mgPause)} s`, W / 2, H / 2 + 64, 11, '#c9c3ff', 'center', false);
      } else text('Linksklick: anvisieren!', W / 2, H / 2 + 58, 12, '#fff', 'center', false);
    }
  }

  // ----- Fadenkreuz in der Mitte -----
  if (zustand === 'spiel' && !m.tot) {
    const t = trefferAnzeige > 0;
    const cx = W / 2, cy = H / 2;
    ctx.strokeStyle = t ? '#ff6b6b' : '#ffffff'; ctx.lineWidth = 2;
    kreis(cx, cy, 12); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 6, cy);
    ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 18, cy);
    ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy - 6);
    ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 18);
    ctx.stroke();
    if (t) {   // Treffer-X
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8);
      ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8);
      ctx.stroke();
    }
  }

  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 20, 14, '#fff', 'center', false);

  if (pause && zustand === 'spiel') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    text('⏸️ PAUSE', W / 2, H / 2 - 30, 50, '#ffd166');
    text('Klicken: Weiterspielen  ·  Enter: Zurück zum Menü', W / 2, H / 2 + 30, 18, '#fff');
  }
}

// ===== Titelbild (2D) =====
function modusKarten() {
  return MODI.map((m, i) => ({ m, x: 60 + (i % 2) * 430, y: 160 + Math.floor(i / 2) * 135, w: 410, h: 120 }));
}
const imRechteck = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

// Ein Mech von oben gemalt (nur fürs Titelbild)
function zeichneMech2D(team, x, y, groesse, laufWinkel, zielWinkel, phase, typ = MECH_TYPEN[0]) {
  const T = TEAMS[team];
  groesse *= typ.groesse;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(groesse, groesse);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  kreis(5, 7, 28); ctx.fill();
  ctx.save();
  ctx.rotate(laufWinkel);
  const schritt = Math.sin(phase) * 10;
  for (const s of [-1, 1]) {
    const vor = schritt * s;
    ctx.fillStyle = '#3a3e4a';
    ctx.fillRect(-4 + vor / 2, s * 10 - 4, 8, 8);
    ctx.fillStyle = '#2a2d36'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    rr(-12 + vor, s * 19 - 6, 24, 12, 4); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.rotate(zielWinkel);
  ctx.fillStyle = '#4b5060'; ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 2;
  if (typ.mg.salve) {   // Raketenwerfer mit 9 Rohren
    ctx.fillStyle = T.dunkel; rr(-22, 2, 28, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = typ.akzent;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { kreis(-16 + i * 8, 8 + j * 7, 2.5); ctx.fill(); }
    ctx.fillStyle = '#4b5060';
  }
  else if (typ.mg.strahl) { rr(8, 15, 70, 9, 2); ctx.fill(); ctx.stroke(); }   // lange Railgun
  else { rr(8, -13, 34, 7, 2); ctx.fill(); ctx.stroke(); rr(8, 6, 34, 7, 2); ctx.fill(); ctx.stroke(); }
  for (const s of typ.rakete.anzahl > 1 ? [-1, 1] : [-1]) {   // Raketenwerfer
    ctx.fillStyle = T.dunkel; ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 2;
    rr(-16, s > 0 ? 17 : -28, 24, 11, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    kreis(-9, s > 0 ? 22.5 : -22.5, 2.5); ctx.fill(); kreis(0, s > 0 ? 22.5 : -22.5, 2.5); ctx.fill();
  }
  ctx.fillStyle = T.farbe; ctx.strokeStyle = T.dunkel; ctx.lineWidth = 3;
  rr(-19, -17, 36, 34, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = typ.akzent; ctx.fillRect(-17, -2, 12, 4);   // Streifen in der Mech-Farbe
  ctx.fillStyle = '#1b1f2a';
  rr(-1, -10, 15, 20, 5); ctx.fill();
  ctx.fillStyle = T.hell;
  rr(6, -7, 6, 14, 3); ctx.fill();
  ctx.restore();
}

function kartenKnoepfe() {
  return KARTEN.map((k, i) => ({ k, x: W / 2 - KARTEN.length * 105 + i * 210 + 5, y: 510, w: 200, h: 48 }));
}
function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  zeichneMech2D('blau', 90, 515, 2, 0, Math.atan2(maus.y - 515, maus.x - 90), zeit * 6, meinMech);
  zeichneMech2D('rot', W - 90, 515, 2, Math.PI, Math.PI + Math.sin(zeit) * 0.3, zeit * 6, MECH_TYPEN[2]);

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

  text('🎮 WASD: Laufen  ·  Maus: Umschauen  ·  Linksklick: MG  ·  Rechtsklick / Q: Rakete  ·  Shift: Boost  ·  Esc: Pause', W / 2, 455, 13, '#c9c3ff', 'center', false);
  text(`Du (blau) + 3 Computer-Mechs gegen ${TEAM_GROESSE} Gegner (rot)  ·  ${MECH_TYPEN.length} verschiedene Mechs!`, W / 2, 478, 13, '#8a8fb0', 'center', false);
  text('Karte:', W / 2, 498, 13, '#8a8fb0', 'center', false);
  for (const b of kartenKnoepfe()) {
    const an = b.k === karte, hover = imRechteck(maus, b);
    ctx.fillStyle = an ? '#3a4256' : 'rgba(30,34,46,0.9)';
    rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = an ? '#ffd166' : (hover ? '#8a8fb0' : '#4a5266'); ctx.lineWidth = an ? 3 : 2; ctx.stroke();
    text(`${b.k.emoji} ${b.k.name}`, b.x + b.w / 2, b.y + b.h / 2, 17, an ? '#ffd166' : '#fff', 'center', false);
  }
  if (!renderer) text('⚠️ 3D geht auf diesem Computer leider nicht (kein WebGL).', W / 2, 580, 16, '#ff6b6b');
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 20, 14, '#fff', 'center', false);
}

// ===== Mech-Auswahl =====
let gewaehlterModus = 'punkt';
const ZURUECK_KNOPF = { x: 30, y: 540, w: 150, h: 40 };
function mechKarten() {
  const b = Math.floor((900 - (MECH_TYPEN.length - 1) * 10) / MECH_TYPEN.length);
  return MECH_TYPEN.map((t, i) => ({ t, x: 30 + i * (b + 10), y: 105, w: b, h: 415 }));
}
function zeichneAuswahl() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const modusInfo = MODI.find(x => x.id === gewaehlterModus);
  text('Wähle deinen Mech!', W / 2, 45, 38, '#ffd166');
  text(`Spielmodus: ${modusInfo.emoji} ${modusInfo.name}  ·  Karte: ${karte.emoji} ${karte.name}`, W / 2, 82, 16, '#c9c3ff', 'center', false);

  for (const k of mechKarten()) {
    const t = k.t, hover = imRechteck(maus, k), meiner = t === meinMech;
    ctx.fillStyle = hover ? '#3a4256' : 'rgba(30,34,46,0.92)';
    rr(k.x, k.y, k.w, k.h, 14); ctx.fill();
    ctx.strokeStyle = hover ? '#ffd166' : (meiner ? t.akzent : '#4a5266'); ctx.lineWidth = hover || meiner ? 4 : 2; ctx.stroke();
    const mx = k.x + k.w / 2;
    // Der Mech dreht sich langsam
    zeichneMech2D('blau', mx - 8, k.y + 85, 1.1, zeit * 0.8, zeit * 0.8 + Math.sin(zeit * 2) * 0.3, hover ? zeit * 8 : 0, t);
    text(t.emoji, k.x + 22, k.y + 24, 22, '#fff', 'center', false);
    if (meiner) text('✓', k.x + k.w - 20, k.y + 24, 20, t.akzent, 'center', false);
    text(t.name, mx, k.y + 165, 20, t.akzent);
    umbrechen(t.text, k.x + 12, k.y + 195, k.w - 24, 17, 12, '#c9c3ff');
    // Sterne für die Werte
    [['❤️', 'Leben', t.sterne.leben], ['💨', 'Tempo', t.sterne.tempo], ['💥', 'Schaden', t.sterne.schaden], ['🎯', 'Weite', t.sterne.weite]].forEach(([e, name, n], i) => {
      const y = k.y + 280 + i * 30;
      text(e, k.x + 18, y, 14, '#fff', 'center', false);
      for (let j = 0; j < 5; j++) {
        ctx.fillStyle = j < n ? t.akzent : 'rgba(255,255,255,0.12)';
        rr(k.x + 36 + j * 18, y - 6, 14, 12, 3); ctx.fill();
      }
    });
    text(t.mg.salve ? '☄️ Raketenhagel' : (t.rakete.anzahl > 1 ? `🚀 ${t.rakete.anzahl} Raketen` : (t.mg.strahl ? '⚡ Railgun' : '🔫 Doppel-MG')), mx, k.y + 395, 13, '#fff', 'center', false);
  }
  const zh = imRechteck(maus, ZURUECK_KNOPF);
  ctx.fillStyle = zh ? '#3a4256' : 'rgba(30,34,46,0.92)';
  rr(ZURUECK_KNOPF.x, ZURUECK_KNOPF.y, ZURUECK_KNOPF.w, ZURUECK_KNOPF.h, 10); ctx.fill();
  text('← Zurück', ZURUECK_KNOPF.x + ZURUECK_KNOPF.w / 2, ZURUECK_KNOPF.y + 20, 16, zh ? '#ffd166' : '#fff', 'center', false);
  text('Klick auf einen Mech, um zu starten!', W / 2 + 60, 560, 16, '#8a8fb0', 'center', false);
}
function waehleMech(t) {
  meinMech = t;
  try { localStorage.setItem('kaempfer-mech', t.id); } catch (e) { /* egal */ }
  neuesSpiel(gewaehlterModus);
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
      text(`${m.typ.emoji} ${m.name}`, x + 15, y, 16, m.istSpieler ? '#ffd166' : '#fff', 'left', false);
      text(String(m.abschuesse), x + 215, y, 16, '#fff', 'center', false);
      text(String(m.tode), x + 265, y, 16, '#fff', 'center', false);
    });
  });
  if (zeit - ende.seit > 1) text('Klicken: Zurück zum Menü  ·  Enter: Nochmal', W / 2, 500, 20, '#c9c3ff', 'center', false);
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  if (zustand === 'auswahl') { zeichneAuswahl(); return; }
  zeichne3D();
  zeichneHUD();
  if (zustand === 'ende') zeichneEnde();
}

// ===== Eingabe =====
// Die Maus wird "gefangen", damit du dich frei umschauen kannst (Esc lässt sie wieder los)
let mausGefangen = false;
function mausFangen() {
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* geht nicht? Dann eben ohne */ }
}
document.addEventListener('pointerlockchange', () => {
  const jetzt = document.pointerLockElement === canvas;
  if (mausGefangen && !jetzt && zustand === 'spiel') { pause = true; maus.links = maus.rechts = false; }   // Esc gedrückt
  if (jetzt) pause = false;
  mausGefangen = jetzt;
});

addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  tasten[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (k === 'm') tonAn = !tonAn;
  if (zustand === 'spiel' && k === 'escape' && !pause) { pause = true; if (document.pointerLockElement) document.exitPointerLock(); }
  else if (zustand === 'spiel' && pause && k === 'enter') { zustand = 'titel'; pause = false; if (document.pointerLockElement) document.exitPointerLock(); }
  else if (zustand === 'ende' && k === 'enter' && zeit - ende.seit > 1) neuesSpiel(modus);
  else if (zustand === 'auswahl' && k === 'escape') zustand = 'titel';
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
  if (!mausGefangen) { const p = punkt(e); maus.x = p.x; maus.y = p.y; }
  if (zustand === 'titel') {
    for (const k of modusKarten()) if (imRechteck(maus, k)) { gewaehlterModus = k.m.id; zustand = 'auswahl'; return; }
    for (const b of kartenKnoepfe()) if (imRechteck(maus, b)) {
      karte = b.k;
      try { localStorage.setItem('kaempfer-karte', karte.id); } catch (e) { /* egal */ }
    }
    return;
  }
  if (zustand === 'auswahl') {
    for (const k of mechKarten()) if (imRechteck(maus, k)) { waehleMech(k.t); return; }
    if (imRechteck(maus, ZURUECK_KNOPF)) zustand = 'titel';
    return;
  }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) zustand = 'titel'; return; }
  if (pause) { pause = false; mausFangen(); return; }
  if (!mausGefangen) mausFangen();
  if (e.button === 0) maus.links = true;
  if (e.button === 2) maus.rechts = true;
});
addEventListener('pointermove', e => {
  if (zustand === 'spiel' && !pause && (mausGefangen || e.buttons)) {
    blick.links += (e.movementX || 0) * MAUS_EMPFINDLICH;
    blick.hoch = begrenzt(blick.hoch - (e.movementY || 0) * MAUS_EMPFINDLICH, -0.5, 0.4);
  }
  if (!mausGefangen) { const p = punkt(e); maus.x = p.x; maus.y = p.y; }
});
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
