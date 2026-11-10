// 🐺 Wolf im Schafspelz 🐑
// Einer der Schafe ist in Wirklichkeit ein Wolf! Finde ihn, bevor er alle frisst.
'use strict';

const canvas = document.getElementById('spiel');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ===== Einstellungen (hier kannst du rumprobieren!) =====
const WELT_B = 1800, WELT_H = 1300;   // Größe vom Bauernhof
const SICHT = 290;                    // Wie weit du sehen kannst
const TEMPO_SPIELER = 170;            // Wie schnell du läufst
const TEMPO_SCHAF = 105;              // Wie schnell die anderen Schafe laufen
const TEMPO_WOLF = 135;               // Wie schnell der Wolf jagt
const WOLF_PAUSE = 22;                // Sekunden zwischen zwei Angriffen (Computer-Wolf)
const WOLF_CHANCE = 0.4;              // Wie oft DU der Wolf bist (0.4 = 40 %)
const ZIEGE_CHANCE = 0.2;             // Wie oft DU die Ziege bist, wenn du kein Wolf bist

// 🛠️ Entwickler-Modus: Funktioniert NUR auf deinem Computer (localhost), nie auf der Webseite!
// Rolle aussuchen mit der Adresse:  http://localhost:8080/spiele/schafspelz/?rolle=ziege
// Möglich: schaf, wolf, ziege, spuernase, flitzer, beschuetzer, bastler, schleicher, verkleider, turbo
const ENTWICKLER = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
function entwicklerRolle() {
  if (!ENTWICKLER) return null;
  try { return new URLSearchParams(location.search).get('rolle'); } catch (e) { return null; }
}
const SPIELER_WOLF_PAUSE = 12;        // Sekunden zwischen zwei Angriffen, wenn du der Wolf bist
const SABOTAGE_PAUSE = 40;            // Sekunden zwischen zwei Sabotagen
const GATTER_ZEIT = 45;               // So viele Sekunden hat die Herde, um das Gatter zu schließen

// Die Karten (Orte, Farben ...) stehen in karten.js
let KARTE, ORTE, GLOCKE;
let kartenNr = 0;
try { kartenNr = Number(localStorage.getItem('schafspelz-karte')) || 0; } catch (e) { /* egal */ }
if (!(kartenNr >= 0 && kartenNr < KARTEN.length)) kartenNr = 0;

// ===== Rollen =====
// "pause" = Sekunden, bis man die Fähigkeit wieder benutzen kann
const ROLLEN = {
  normal:      { name: 'Schaf',             emoji: '🐑', text: '' },
  spuernase:   { name: 'Spürnase',          emoji: '👃', knopf: 'Schnuppern', pause: 30, text: 'Schnupper an anderen Schafen: Riechen sie nach Wolf?' },
  flitzer:     { name: 'Flitzer',           emoji: '💨', knopf: 'Sprinten',   pause: 20, text: 'Du kannst kurz superschnell rennen!' },
  beschuetzer: { name: 'Beschützer',        emoji: '🛡️', knopf: 'Beschützen', pause: 30, text: 'Beschütze ein Schaf. Der Wolf kann es dann nicht fressen!' },
  bastler:     { name: 'Bastler',           emoji: '🔧', knopf: 'Reparieren', pause: 40, text: 'Du kannst Sabotagen von überall aus reparieren!' },
  schleicher:  { name: 'Schleich-Wolf',     emoji: '👻', knopf: 'Unsichtbar', pause: 30, text: 'Werde kurz unsichtbar. Dann sieht dich keiner beim Fressen!' },
  verkleider:  { name: 'Verkleidungs-Wolf', emoji: '🎭', knopf: 'Verkleiden', pause: 35, text: 'Verkleide dich als anderes Schaf. Dann wird DAS verdächtigt!' },
  ziege:       { name: 'Ziege',             emoji: '🐐', knopf: 'Meckern',    pause: 25, text: 'Lass dich beim Herden-Treffen verjagen, dann gewinnst DU!' },
  turbo:       { name: 'Turbo-Wolf',        emoji: '⚡', text: 'Du kannst viel öfter fressen als andere Wölfe!' },
};
const SCHAF_ROLLEN = ['spuernase', 'flitzer', 'beschuetzer', 'bastler'];
const WOLF_ROLLEN = ['schleicher', 'verkleider', 'turbo'];

const NAMEN  = ['Wolke', 'Flocke', 'Krümel', 'Bolle', 'Lotte', 'Muffin', 'Socke'];
const FARBEN = ['#ff9ecf', '#8fd3ff', '#ffe066', '#9be89b', '#c9a0ff', '#ffb36b', '#d9b38c'];

// ===== Hilfsfunktionen =====
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const zufall = arr => arr[Math.floor(Math.random() * arr.length)];
const begrenzt = (v, min, max) => Math.max(min, Math.min(max, v));
function mischen(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function naechsterOrt(p) {
  let best = GLOCKE, bd = dist(p, GLOCKE);
  for (const o of ORTE) { const d = dist(p, o); if (d < bd) { bd = d; best = o; } }
  return best;
}
function rundesRechteck(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ellipse(x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function text(t, x, y, groesse, farbe = '#fff', ausrichtung = 'center', rand = true) {
  ctx.font = `bold ${groesse}px system-ui, sans-serif`;
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  if (rand) {
    ctx.lineWidth = Math.max(3, groesse / 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineJoin = 'round';
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = farbe;
  ctx.fillText(t, x, y);
}
function umbrechen(t, x, y, maxB, zeilenH, groesse, farbe) {
  ctx.font = `${groesse}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = farbe;
  let zeile = '';
  for (const wort of t.split(' ')) {
    const probe = zeile ? zeile + ' ' + wort : wort;
    if (ctx.measureText(probe).width > maxB && zeile) {
      ctx.fillText(zeile, x, y);
      zeile = wort;
      y += zeilenH;
    } else {
      zeile = probe;
    }
  }
  ctx.fillText(zeile, x, y);
}

// ===== Töne (mit Web Audio, ganz ohne Sound-Dateien!) =====
let audio = null;
let tonAn = true;

function tonStart() {
  // Browser erlauben Töne erst, nachdem man geklickt oder eine Taste gedrückt hat
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio = new AC();
  }
  if (audio && audio.state === 'suspended') audio.resume();
}

// Ein einzelner Ton: Höhe (Hz), wann (Sekunden), wie lange, Klang, Lautstärke, End-Höhe
function ton(hoehe, start, dauer, klang = 'sine', laut = 0.2, hoeheEnde = null) {
  if (!audio || !tonAn) return;
  const t0 = audio.currentTime + start;
  const osz = audio.createOscillator(), g = audio.createGain();
  osz.type = klang;
  osz.frequency.setValueAtTime(hoehe, t0);
  if (hoeheEnde) osz.frequency.exponentialRampToValueAtTime(hoeheEnde, t0 + dauer);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(laut, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dauer);
  osz.connect(g).connect(audio.destination);
  osz.start(t0);
  osz.stop(t0 + dauer + 0.05);
}

// Ton mit Wackeln (für Mäh und Geheul)
function wackelTon(punkte, start, dauer, klang, laut, wackelTempo, wackelStaerke) {
  if (!audio || !tonAn) return;
  const t0 = audio.currentTime + start;
  const osz = audio.createOscillator(), wackel = audio.createOscillator();
  const wg = audio.createGain(), g = audio.createGain(), filter = audio.createBiquadFilter();
  osz.type = klang;
  osz.frequency.setValueAtTime(punkte[0][1], t0);
  for (const [zeitpunkt, hoehe] of punkte.slice(1)) osz.frequency.linearRampToValueAtTime(hoehe, t0 + zeitpunkt);
  wackel.frequency.value = wackelTempo;
  wg.gain.value = wackelStaerke;
  wackel.connect(wg).connect(osz.frequency);
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(laut, t0 + dauer * 0.2);
  g.gain.linearRampToValueAtTime(laut * 0.8, t0 + dauer * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dauer);
  osz.connect(filter).connect(g).connect(audio.destination);
  osz.start(t0); wackel.start(t0);
  osz.stop(t0 + dauer + 0.05); wackel.stop(t0 + dauer + 0.05);
}

const sound = {
  // Trommelwirbel, wird immer lauter
  spannung() {
    for (let i = 0; i < 12; i++) ton(100 + i * 5, i * 0.1, 0.09, 'triangle', 0.1 + i * 0.015);
  },
  // Fröhliche Melodie + Mäh!
  schaf() {
    [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.12, 0.4, 'triangle', 0.2));
    wackelTon([[0, 430], [0.6, 370]], 0.6, 0.7, 'sawtooth', 0.15, 16, 30);
  },
  // Tiefer, gruseliger Akkord + Wolfsgeheul
  wolf() {
    [55, 65.4, 77.8].forEach(f => ton(f, 0, 1.8, 'sawtooth', 0.12));
    wackelTon([[0, 280], [0.6, 620], [1.4, 600], [2.1, 420]], 0.4, 2.1, 'sine', 0.22, 5, 12);
  },
  // Alarm! Wolle gefunden
  wolle() {
    for (let i = 0; i < 3; i++) {
      ton(600, i * 0.4, 0.2, 'square', 0.1, 950);
      ton(950, i * 0.4 + 0.2, 0.2, 'square', 0.1, 600);
    }
  },
  // Mampf (Heu fressen)
  mampf() { ton(180, 0, 0.07, 'square', 0.12, 90); ton(160, 0.1, 0.07, 'square', 0.12, 80); },
  // Klack (Kurbel)
  klack() { ton(900, 0, 0.04, 'square', 0.06); },
  // Plopp (Wolle in den Korb, Blume blüht)
  plopp() { ton(300, 0, 0.12, 'sine', 0.25, 700); },
  // Tock (Hammer)
  hammer() { ton(140, 0, 0.12, 'triangle', 0.3, 60); ton(1600, 0, 0.04, 'square', 0.05); },
  // Oh-oh (etwas falsch gemacht)
  fehler() { ton(300, 0, 0.18, 'sawtooth', 0.12); ton(200, 0.2, 0.3, 'sawtooth', 0.12); },
  // Mini-Spiel geschafft!
  geschafft() { [523, 659, 784].forEach((f, i) => ton(f, i * 0.08, 0.25, 'triangle', 0.18)); ton(1047, 0.24, 0.5, 'triangle', 0.2); },
  // HAPS! Der Wolf schlägt zu
  haps() { ton(220, 0, 0.25, 'sawtooth', 0.25, 60); ton(90, 0.05, 0.3, 'square', 0.15, 40); },
  // Tusch: Der Wolf wurde erwischt
  fanfare() { [392, 523, 659, 784].forEach((f, i) => ton(f, i * 0.14, i === 3 ? 0.8 : 0.18, 'square', 0.1)); },
  // Wah-wah: falsches Schaf rausgeworfen
  traurig() { [392, 370, 349, 330].forEach((f, i) => ton(f, i * 0.3, i === 3 ? 0.8 : 0.3, 'triangle', 0.18)); },
  // Hmm: Niemand fliegt raus
  hmm() { ton(330, 0, 0.25, 'sine', 0.15); ton(294, 0.3, 0.4, 'sine', 0.15); },
  // Nebel zieht auf: tiefes Wuuusch
  nebel() { ton(400, 0, 1.4, 'sine', 0.15, 70); ton(300, 0.15, 1.4, 'triangle', 0.1, 50); },
  // Alarm: Gatter offen!
  alarm() { for (let i = 0; i < 4; i++) { ton(880, i * 0.3, 0.15, 'square', 0.08); ton(660, i * 0.3 + 0.15, 0.15, 'square', 0.08); } },
  // Piep (Countdown)
  piep() { ton(1000, 0, 0.07, 'square', 0.04); },
  // Schnupper-schnupper
  schnuppern() { for (let i = 0; i < 4; i++) ton(2000, i * 0.12, 0.06, 'triangle', 0.05, 1200); },
  // Wuuusch
  sprint() { ton(200, 0, 0.4, 'sawtooth', 0.08, 900); },
  // Schutzschild: Pling!
  schild() { ton(1200, 0, 0.5, 'sine', 0.15); ton(1800, 0.05, 0.5, 'sine', 0.1); },
  // Trommelwirbel nach der Abstimmung
  trommel() { for (let i = 0; i < 10; i++) ton(110 + i * 4, i * 0.08, 0.07, 'triangle', 0.12); },
  // Trippel-trappel (Schaf rennt weg)
  trippel() { for (let i = 0; i < 12; i++) ton(i % 2 ? 500 : 420, i * 0.13, 0.05, 'triangle', 0.08); },
  // Grrrr
  knurren() { wackelTon([[0, 90], [0.8, 70]], 0, 0.9, 'sawtooth', 0.2, 25, 15); },
  // Määäck!
  meckern() { wackelTon([[0, 620], [0.6, 540]], 0, 0.7, 'sawtooth', 0.15, 24, 60); },
  // Plumps in die Grube
  plumps() { ton(320, 0, 0.3, 'sine', 0.3, 60); },
  // Bzzzt! (Blitz)
  zap() { ton(1500, 0, 0.15, 'sawtooth', 0.08, 300); ton(900, 0.08, 0.15, 'square', 0.05, 200); },
  // Bim-Bam der Glocke
  glocke() {
    [0, 0.5].forEach((st, i) => {
      const grund = i ? 660 : 880;
      ton(grund, st, 1.4, 'sine', 0.25);
      ton(grund * 2.4, st, 0.6, 'sine', 0.08);
      ton(grund * 4, st, 0.3, 'sine', 0.04);
    });
  },
};

// ===== Spielzustand =====
let zustand = 'titel';   // 'titel', 'intro', 'spiel', 'treffen', 'ende'
let intro = 0;           // Wie lange das Intro schon läuft
let schafe = [], spieler = null, wolf = null;
let wolle = [], effekte = [];
let treffen = null, ende = null, nachricht = null;
let glockeGenutzt = false;
let spielerIstWolf = false;
let miniSpiel = null;   // Das Mini-Spiel, das gerade offen ist
let sicht = SICHT;      // Wie weit du gerade siehst (im Nebel weniger)
let sabotage = null;    // { art: 'nebel' oder 'gatter', t: Restzeit }
let sabotagePause = 0;
let deko = [];          // Blumen, Tannen, Palmen ...
let partikel = [];      // Funken, Staub, Rauch ...
const schneeflocken = [];
for (let i = 0; i < 70; i++) schneeflocken.push({ x: Math.random() * W, y: Math.random() * H, v: 25 + Math.random() * 40, p: Math.random() * 6 });
let kamera = { x: 0, y: 0 };
let klickZiel = null;
let maus = { x: 0, y: 0 };
let zeit = 0;
const tasten = {};

// ===== Partikel (Funken, Staub, Rauch) =====
// x, y: wo  •  anzahl  •  farben  •  tempo  •  groesse  •  dauer (Sekunden)  •  schwerkraft (minus = steigt auf)
function funken(x, y, anzahl, farben, tempo = 120, groesse = 4, dauer = 0.7, schwerkraft = 0) {
  for (let i = 0; i < anzahl; i++) {
    const w = Math.random() * Math.PI * 2, v = tempo * (0.4 + Math.random() * 0.8);
    const t = dauer * (0.6 + Math.random() * 0.4);
    partikel.push({ x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v, t, max: t, farbe: zufall(farben), groesse: groesse * (0.6 + Math.random() * 0.8), g: schwerkraft });
  }
}
const RAUCH = ['#e5e5e5', '#c9c9c9', '#ffffff'];
const LILA = ['#c9a0ff', '#ffffff', '#8fd3ff'];
const GOLD = ['#ffd166', '#ffffff', '#ff9f43'];
const BLAU = ['#8fd3ff', '#ffffff', '#4aa8ff'];

// Ein Effekt, der an einem Schaf klebt
function effektAn(ziel, art, dauer, extra = {}) {
  effekte.push({ ziel, art, t: dauer, max: dauer, ...extra });
}

// ===== Karte laden =====
function ladeKarte(nr) {
  KARTE = KARTEN[nr];
  ORTE = KARTE.orte;
  GLOCKE = { name: 'Glocke', bei: 'bei der Glocke', x: KARTE.treffpunkt.x, y: KARTE.treffpunkt.y };
  deko = macheDeko();
}

function abstandZurLinie(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = begrenzt(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Ist hier Platz für einen Baum? (nicht auf Wegen und Orten)
function freierPlatz(p) {
  if (KARTE.gruben.some(g => dist(p, g) < 90)) return false;
  if (dist(p, GLOCKE) < 200 || dist(p, KARTE.laterne) < 110 || dist(p, KARTE.gatter) < 160) return false;
  for (const o of ORTE) {
    if (dist(p, { x: o.x, y: o.y - 90 }) < 220) return false;
    if (abstandZurLinie(p, GLOCKE, o) < 50) return false;
  }
  return true;
}

function macheDeko() {
  const d = [];
  const punkte = (anzahl, farben) => {
    for (let i = 0; i < anzahl; i++) d.push({ art: 'punkt', x: Math.random() * WELT_B, y: Math.random() * WELT_H, f: zufall(farben) });
  };
  if (KARTE.deko === 'blumen') punkte(220, ['#fff', '#ffe066', '#ff9ecf', '#c9a0ff']);
  if (KARTE.deko === 'tannen') punkte(80, ['#cfe0ee', '#b9cfe2']);
  if (KARTE.deko === 'palmen') punkte(100, ['#fff5e6', '#f7c6c6', '#fde2b8']);
  if (KARTE.deko === 'tannen' || KARTE.deko === 'palmen') {
    const baeume = [];
    for (let v = 0; v < 3000 && baeume.length < (KARTE.deko === 'tannen' ? 40 : 26); v++) {
      const p = { x: 90 + Math.random() * (WELT_B - 180), y: 140 + Math.random() * (WELT_H - 220) };
      if (freierPlatz(p) && baeume.every(b => dist(b, p) > 70)) baeume.push({ art: KARTE.deko, x: p.x, y: p.y, g: 0.8 + Math.random() * 0.5 });
    }
    baeume.sort((a, b) => a.y - b.y);
    d.push(...baeume);
  }
  return d;
}

function macheSchaf(name, farbe, istSpieler) {
  return {
    name, farbe, istSpieler, istWolf: false, lebt: true,
    x: 0, y: 0, richtung: 1, phase: 0, laeuft: false,
    aufgaben: [], alleAufgaben: [], gesamt: 0, erledigt: 0,
    ziel: null, warte: 0, amOrt: null, letzterOrt: GLOCKE,
    verdacht: null, cooldown: 0, jagt: null,
    aufgabeAktiv: null, aufgabeT: 0,
    rolle: 'normal', faehigkeit: 8, sprint: 0, unsichtbar: 0, verkleidet: null,
    inGrube: null, grubenPlan: null, meldet: false,
    geschuetzt: false, geruch: null, schnupperZeit: 20 + Math.random() * 20,
  };
}

function neuesSpiel() {
  partikel = [];
  ladeKarte(kartenNr);
  sabotage = null; sabotagePause = 30; sicht = SICHT;
  schafe = []; wolle = []; effekte = [];
  treffen = null; ende = null; klickZiel = null; miniSpiel = null;
  glockeGenutzt = false;

  // Bist du diesmal ein Schaf oder der Wolf?
  const test = entwicklerRolle();
  spielerIstWolf = test ? (test === 'wolf' || WOLF_ROLLEN.includes(test)) : Math.random() < WOLF_CHANCE;

  spieler = macheSchaf('Du', '#ffffff', true);
  if (!spielerIstWolf) {
    spieler.aufgaben = mischen([0, 1, 2, 3, 4, 5]).slice(0, 5);
    spieler.alleAufgaben = [...spieler.aufgaben];
    spieler.gesamt = 5;
  }
  schafe.push(spieler);

  NAMEN.forEach((n, i) => {
    const s = macheSchaf(n, FARBEN[i], false);
    const anzahl = spielerIstWolf ? 5 : 4;   // Gegen dich als Wolf haben die Schafe mehr zu tun
    s.aufgaben = mischen([0, 1, 2, 3, 4, 5]).slice(0, anzahl);
    s.gesamt = anzahl;
    schafe.push(s);
  });

  if (spielerIstWolf) {
    wolf = spieler;
    wolf.cooldown = 10;
  } else {
    // Ein zufälliges Schaf ist heimlich der Wolf!
    wolf = zufall(schafe.filter(s => !s.istSpieler));
    wolf.cooldown = 18;
  }
  wolf.istWolf = true;

  // Rollen verteilen
  const binZiege = test ? test === 'ziege' : !spielerIstWolf && Math.random() < ZIEGE_CHANCE;
  // Wenn du nicht die Ziege bist, ist manchmal ein anderes Schaf die Ziege
  const botRollen = mischen(['spuernase', 'flitzer', 'beschuetzer', 'bastler', 'normal', 'normal', !binZiege && Math.random() < 0.5 ? 'ziege' : 'normal']);
  schafe.filter(s => !s.istSpieler).forEach((s, i) => { s.rolle = botRollen[i]; });
  spieler.rolle = binZiege ? 'ziege' : (SCHAF_ROLLEN.includes(test) ? test : zufall(SCHAF_ROLLEN));
  wolf.rolle = spielerIstWolf && WOLF_ROLLEN.includes(test) ? test : zufall(WOLF_ROLLEN);
  // Die Ziege hat keine echten Aufgaben
  for (const s of schafe) {
    if (s.rolle === 'ziege') { s.aufgaben = []; s.alleAufgaben = []; s.gesamt = 0; }
  }
  botsBeschuetzen();

  alleZurGlocke();
  zustand = 'intro';
  intro = 0;
}

function introFertig() {
  zustand = 'spiel';
  zeigeNachricht('Los geht\'s! Pass gut auf! 🐺', 3);
}

function alleZurGlocke() {
  const lebende = schafe.filter(s => s.lebt);
  lebende.forEach((s, i) => {
    const w = i / lebende.length * Math.PI * 2;
    s.x = GLOCKE.x + Math.cos(w) * 110;
    s.y = GLOCKE.y + Math.sin(w) * 80;
    s.ziel = null; s.jagt = null; s.amOrt = null;
    s.warte = Math.random() * 2;
    s.aufgabeAktiv = null;
    s.inGrube = null; s.grubenPlan = null; s.meldet = false;
  });
  klickZiel = null;
}

function zeigeNachricht(t, dauer) { nachricht = { text: t, t: dauer }; }

function fortschritt() {
  let e = 0, g = 0;
  for (const s of schafe) {
    if (s.istWolf) continue;   // Der Wolf macht nur so, als ob er arbeitet!
    e += s.erledigt; g += s.gesamt;
  }
  return e / g;
}

function beende(sieger, grund) {   // sieger: 'schafe', 'wolf' oder 'ziege'
  zustand = 'ende';
  miniSpiel = null;
  const gewonnen = spieler.rolle === 'ziege'
    ? sieger === 'ziege'
    : sieger !== 'ziege' && (sieger === 'wolf') === spielerIstWolf;
  ende = { gewonnen, sieger, grund, seit: zeit };
}

// ===== Bewegung =====
function laufeZu(s, z, tempo, dt) {
  const dx = z.x - s.x, dy = z.y - s.y, d = Math.hypot(dx, dy);
  if (d < 5) { s.laeuft = false; return true; }
  const schritt = Math.min(d, tempo * dt);
  s.x += dx / d * schritt;
  s.y += dy / d * schritt;
  if (Math.abs(dx) > 1) s.richtung = Math.sign(dx);
  s.phase += dt * 12;
  s.laeuft = true;
  return false;
}

function bewegeSpieler(dt) {
  if (miniSpiel || spieler.inGrube != null) { spieler.laeuft = false; return; }   // Beim Mini-Spiel steht man still
  let dx = 0, dy = 0;
  if (tasten['arrowleft'] || tasten['a']) dx -= 1;
  if (tasten['arrowright'] || tasten['d']) dx += 1;
  if (tasten['arrowup'] || tasten['w']) dy -= 1;
  if (tasten['arrowdown'] || tasten['s']) dy += 1;

  if (dx || dy) klickZiel = null;
  else if (klickZiel) {
    const zx = klickZiel.x - spieler.x, zy = klickZiel.y - spieler.y, d = Math.hypot(zx, zy);
    if (d < 6) klickZiel = null; else { dx = zx / d; dy = zy / d; }
  }

  const laenge = Math.hypot(dx, dy);
  spieler.laeuft = laenge > 0;
  if (laenge > 0) {
    const tempo = TEMPO_SPIELER * (spieler.sprint > 0 ? 1.8 : 1);
    spieler.x += dx / laenge * tempo * dt;
    spieler.y += dy / laenge * tempo * dt;
    if (dx) spieler.richtung = Math.sign(dx);
    spieler.phase += dt * 12;
  }
  spieler.x = begrenzt(spieler.x, 50, WELT_B - 50);
  spieler.y = begrenzt(spieler.y, 60, WELT_H - 50);

}

function bewegeBot(s, dt) {
  if (s.jagt || s.grubenPlan || s.inGrube != null) return;   // Der Wolf wird dann in wolfLogik bewegt

  if (s.warte > 0) {
    s.warte -= dt;
    s.laeuft = false;
    if (s.warte <= 0 && s.amOrt !== null) {
      if (!s.istWolf && s.aufgaben.includes(s.amOrt)) {
        s.aufgaben = s.aufgaben.filter(i => i !== s.amOrt);
        s.erledigt++;
      }
      s.amOrt = null;
    }
    return;
  }

  if (!s.ziel && s.meldet) s.ziel = { x: GLOCKE.x, y: GLOCKE.y, ort: null };   // Schnell zur Glocke!
  if (!s.ziel) {
    const ortNr = (s.aufgaben.length && Math.random() < 0.6)
      ? zufall(s.aufgaben)
      : Math.floor(Math.random() * ORTE.length);
    const o = ORTE[ortNr];
    s.ziel = { x: o.x + (Math.random() - 0.5) * 60, y: o.y + (Math.random() - 0.5) * 40, ort: ortNr };
  }
  if (laufeZu(s, s.ziel, TEMPO_SCHAF * (s.rolle === 'flitzer' ? 1.25 : 1) * (s.meldet ? 1.4 : 1), dt)) {
    if (s.ziel.ort === null) {   // War unterwegs zum Reparieren
      s.warte = 1;
    } else {
      s.amOrt = s.ziel.ort;
      s.letzterOrt = ORTE[s.ziel.ort];
      s.warte = 3 + Math.random() * 3;
    }
    s.ziel = null;
  }
}

// ===== Der Wolf =====
function istAllein(ziel) {
  return !schafe.some(s => s.lebt && s !== ziel && s !== wolf && dist(s, ziel) < 230);
}

function wolfLogik(dt) {
  // Ab und zu macht der Wolf eine Sabotage
  if (!sabotage && sabotagePause <= 0 && !wolf.jagt && Math.random() < dt / 12) starteSabotage(zufall(['nebel', 'gatter']));
  wolf.cooldown -= dt;

  // Unterwegs durch die Gruben?
  if (wolf.grubenPlan) {
    const gp = wolf.grubenPlan, G = KARTE.gruben;
    if (gp.phase === 'hin') {
      if (laufeZu(wolf, G[gp.von], TEMPO_WOLF, dt)) { springeInGrube(wolf, gp.von); gp.phase = 'drin'; gp.t = 1.5; }
    } else {
      gp.t -= dt;
      if (gp.t <= 0) { wolf.grubenPlan = null; kletterRaus(wolf, gp.nach); }
    }
    return;
  }
  if (!wolf.jagt && Math.random() < dt / 30) planeGrube(220);

  if (wolf.cooldown > 0) return;

  if (wolf.jagt) {
    const z = wolf.jagt;
    // Aufgeben, wenn jemand anderes in der Nähe ist
    if (!z.lebt || !istAllein(z) || dist(wolf, z) > 450) {
      wolf.jagt = null; wolf.ziel = null;
      return;
    }
    if (dist(wolf, z) < 32) { fressen(z); return; }
    laufeZu(wolf, z, TEMPO_WOLF, dt);
    return;
  }

  // Ein Schaf suchen, das ganz allein ist ...
  const opfer = schafe.filter(s => s.lebt && !s.istWolf && dist(s, wolf) < 400 && istAllein(s));
  if (opfer.length) {
    wolf.jagt = zufall(opfer);
    wolf.warte = 0; wolf.amOrt = null;
  }
}

function fressen(opfer) {
  // Beschützt? Dann klappt es nicht!
  if (opfer.geschuetzt) {
    opfer.geschuetzt = false;
    wolf.jagt = null; wolf.ziel = null;
    wolf.cooldown = 10;
    effekte.push({ x: opfer.x, y: opfer.y, t: 1.2, max: 1.2, art: 'schild' });
    funken(opfer.x, opfer.y, 30, BLAU, 160, 5, 0.9);
    if (spielerIstWolf) zeigeNachricht(`🛡️ ${opfer.name} war beschützt! Das hat nicht geklappt.`, 3);
    else if (opfer.istSpieler) zeigeNachricht('🛡️ Puh! Ein Schutzschild hat dich gerettet!', 3);
    if (spielerIstWolf || dist(opfer, spieler) < sicht + 20) sound.schild();
    return;
  }
  opfer.lebt = false;
  opfer.erledigt = opfer.gesamt;
  opfer.aufgaben = [];
  opfer.aufgabeAktiv = null;
  wolf.jagt = null; wolf.ziel = null;
  const turbo = wolf.rolle === 'turbo' ? 0.6 : 1;
  wolf.cooldown = (spielerIstWolf ? SPIELER_WOLF_PAUSE : WOLF_PAUSE + Math.random() * 8) * turbo;

  const ort = naechsterOrt(opfer);
  wolle.push({ x: opfer.x, y: opfer.y, opfer, ort });
  effekte.push({ x: opfer.x, y: opfer.y, t: 1.2, max: 1.2 });
  funken(opfer.x, opfer.y, 25, [opfer.farbe, '#ffffff'], 140, 6, 0.9, 120);   // Wolle fliegt!
  if (spielerIstWolf || dist(opfer, spieler) < sicht + 20) sound.haps();

  // Computer-Wölfe benutzen auch ihre Fähigkeiten
  if (!spielerIstWolf && wolf.rolle === 'schleicher' && Math.random() < 0.5) wolf.unsichtbar = 3;
  if (!spielerIstWolf && wolf.rolle === 'verkleider' && Math.random() < 0.6) {
    const andere = schafe.filter(s => s.lebt && !s.istWolf && !s.istSpieler);
    if (andere.length) wolf.verkleidet = { als: zufall(andere), t: 4 };
  }
  if (wolf.rolle === 'turbo') funken(opfer.x, opfer.y, 20, GOLD, 170, 3, 0.6);
  if (!spielerIstWolf && wolf.unsichtbar > 0) funken(wolf.x, wolf.y, 20, LILA, 110, 4, 0.8, -40);
  if (!spielerIstWolf && wolf.verkleidet && wolf.verkleidet.t > 3.9) funken(wolf.x, wolf.y, 25, RAUCH, 90, 10, 0.9, -60);
  // Wen sehen die anderen? Den Wolf ... oder seine Verkleidung!
  const taeter = wolf.verkleidet ? wolf.verkleidet.als : wolf;

  // Wer in der Nähe war, hat etwas gesehen!
  const zeugen = [];
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf) continue;
    if (wolf.unsichtbar > 0 || s === taeter) continue;
    const d = dist(s, wolf);
    const nebel = sabotage && sabotage.art === 'nebel';   // Im Nebel sieht man schlechter
    if (d < (nebel ? 120 : 230) || (d < (nebel ? 200 : 420) && Math.random() < 0.6)) {
      s.verdacht = { wer: taeter, ort };
      zeugen.push(s);
    }
  }
  if (spielerIstWolf) {
    zeigeNachricht(zeugen.length
      ? `👀 Oh nein! ${zeugen.map(z => z.name).join(', ')} hat dich gesehen!`
      : 'HAPS! 😋 Niemand hat dich gesehen.', 3);
  }

  if (opfer.istSpieler) { beende('wolf', 'Der Wolf hat dich erwischt!'); return; }
  if (!spielerIstWolf && Math.random() < 0.6) planeGrube(350);   // Schnell weg durch eine Grube!
  pruefeWolfSieg();
}

function pruefeWolfSieg() {
  const uebrig = schafe.filter(s => s.lebt && !s.istWolf).length;
  if (uebrig <= 1) { beende('wolf', spielerIstWolf ? 'Du hast fast alle Schafe gefressen! 😋' : 'Der Wolf hat zu viele Schafe gefressen!'); return true; }
  return false;
}

// ===== Sabotage! =====
function sabotagePunkt() {
  return sabotage.art === 'nebel' ? KARTE.laterne : KARTE.gatter;
}

function starteSabotage(art) {
  if (sabotage || sabotagePause > 0 || zustand !== 'spiel') return;
  sabotage = {
    art,
    t: art === 'gatter' ? GATTER_ZEIT : 40,
    hilfe: art === 'gatter' ? 6 + Math.random() * 6 : 12 + Math.random() * 8,   // wann Schafe zum Reparieren loslaufen
  };
  sabotagePause = SABOTAGE_PAUSE;
  if (art === 'nebel') {
    sound.nebel();
    zeigeNachricht(spielerIstWolf ? '🌫️ Nebel! Die Schafe sehen jetzt fast nichts. 😈' : '🌫️ Nebel! Mach die Laterne an!', 3);
  } else {
    sound.alarm();
    zeigeNachricht(spielerIstWolf ? '🚪 Du hast das Gatter geöffnet! 😈' : '🚪 Das Gatter ist offen! Schnell zumachen!', 3);
  }
}

function wolfSabotage(art) {
  if (miniSpiel) return;
  if (sabotage) { zeigeNachricht('Es läuft schon eine Sabotage!', 2); return; }
  if (sabotagePause > 0) { zeigeNachricht(`Sabotage geht erst in ${Math.ceil(sabotagePause)} Sekunden wieder`, 2); return; }
  starteSabotage(art);
}

// Die nächsten Schafe laufen los und reparieren
function schickeHelfer() {
  const p = sabotagePunkt();
  const anzahl = sabotage.art === 'gatter' ? 2 : 1;
  schafe.filter(s => s.lebt && !s.istSpieler && !s.istWolf && !s.meldet)
    .sort((a, b) => dist(a, p) - dist(b, p))
    .slice(0, anzahl)
    .forEach(h => { h.ziel = { x: p.x, y: p.y, ort: null }; h.warte = 0; h.amOrt = null; });
}

function repariert(wer) {
  const art = sabotage.art;
  sabotage = null;
  sound.geschafft();
  const was = art === 'nebel' ? 'die Laterne angemacht' : 'das Gatter geschlossen';
  zeigeNachricht(wer.istSpieler ? `✅ Du hast ${was}!` : `✅ ${wer.name} hat ${was}!`, 2.5);
}

function updateSabotage(dt) {
  if (sabotagePause > 0) sabotagePause -= dt;
  // Sicht wird langsam kleiner oder größer
  const zielSicht = sabotage && sabotage.art === 'nebel' && !spielerIstWolf ? 130 : SICHT;
  sicht += (zielSicht - sicht) * Math.min(1, dt * 2);
  if (!sabotage) return;

  const vorher = sabotage.t;
  sabotage.t -= dt;
  if (sabotage.art === 'gatter' && Math.ceil(sabotage.t) < Math.ceil(vorher)) sound.piep();

  sabotage.hilfe -= dt;
  sabotage.alter = (sabotage.alter || 0) + dt;
  const bastler = schafe.find(s => !s.istSpieler && s.lebt && !s.istWolf && s.rolle === 'bastler');
  if (bastler && sabotage.alter > 14) { repariert(bastler); return; }
  if (sabotage.hilfe <= 0) { schickeHelfer(); sabotage.hilfe = 10; }

  const p = sabotagePunkt();
  for (const s of schafe) {
    if (!s.istSpieler && s.lebt && !s.istWolf && dist(s, p) < 45) { repariert(s); return; }
  }

  if (sabotage.t <= 0) {
    if (sabotage.art === 'gatter') {
      beende('wolf', 'Die Herde ist durchs offene Gatter weggelaufen! 🐑💨');
    } else {
      sabotage = null;
      zeigeNachricht('🌤️ Der Nebel ist von selbst verschwunden.', 2);
    }
  }
}

// ===== Gruben (nur für Wölfe!) =====
function naechsteGrube(p, max) {
  let best = null, bd = max;
  KARTE.gruben.forEach((g, i) => { const d = dist(p, g); if (d < bd) { bd = d; best = i; } });
  return best;
}

// Computer-Wolf plant einen Weg durch die Gruben
function planeGrube(max) {
  const von = naechsteGrube(wolf, max);
  if (von === null) return;
  const andere = KARTE.gruben.map((g, i) => i).filter(i => i !== von);
  wolf.grubenPlan = { phase: 'hin', von, nach: zufall(andere) };
  wolf.jagt = null; wolf.ziel = null; wolf.warte = 0; wolf.amOrt = null;
}

// Hat jemand gesehen, wie der Wolf in eine Grube springt?
function grubenZeugen(p) {
  if (wolf.unsichtbar > 0) return;
  const taeter = wolf.verkleidet ? wolf.verkleidet.als : wolf;
  const nebel = sabotage && sabotage.art === 'nebel';
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf || s === taeter || s.meldet) continue;
    if (dist(s, p) < (nebel ? 150 : 300)) {
      s.verdacht = { wer: taeter, ort: naechsterOrt(p), grube: true };
      s.meldet = true;
      s.ziel = { x: GLOCKE.x, y: GLOCKE.y, ort: null }; s.warte = 0; s.amOrt = null;
      if (spielerIstWolf) zeigeNachricht(`👀 Oh nein! ${s.name} hat dich gesehen und rennt zur Glocke!`, 3);
    }
  }
}

function springeInGrube(w, i) {
  const g = KARTE.gruben[i];
  w.inGrube = i; w.x = g.x; w.y = g.y;
  w.jagt = null; w.ziel = null;
  effekte.push({ x: g.x, y: g.y, t: 0.8, art: 'plumps' });
  if (w.istSpieler || dist(g, spieler) < sicht + 20) sound.plumps();
  grubenZeugen(g);
}

function kletterRaus(w, i) {
  const g = KARTE.gruben[i];
  w.inGrube = null; w.x = g.x; w.y = g.y + 28;
  effekte.push({ x: g.x, y: g.y, t: 0.8, art: 'plumps' });
  if (w.istSpieler || dist(g, spieler) < sicht + 20) sound.plumps();
  grubenZeugen(g);
}

function wechsleGrube(richtung) {
  const n = KARTE.gruben.length;
  const i = (spieler.inGrube + richtung + n) % n;
  spieler.inGrube = i;
  spieler.x = KARTE.gruben[i].x; spieler.y = KARTE.gruben[i].y;
  sound.klack();
}

function grubenTaste(k) {
  if (k === 'arrowleft' || k === 'a') wechsleGrube(-1);
  else if (k === 'arrowright' || k === 'd') wechsleGrube(1);
  else if (k === 'e' || k === ' ') kletterRaus(spieler, spieler.inGrube);
}

function grubenKlick(p) {
  if (imRechteck(p, GRUBE_LINKS)) wechsleGrube(-1);
  else if (imRechteck(p, GRUBE_RECHTS)) wechsleGrube(1);
  else if (imRechteck(p, GRUBE_RAUS)) kletterRaus(spieler, spieler.inGrube);
}

// ===== Aktion (E / Leertaste / Knopf) =====
function moeglicheAktion() {
  if (spieler.inGrube != null) return null;
  if (sabotage && !spielerIstWolf && dist(spieler, sabotagePunkt()) < 60) {
    return { text: sabotage.art === 'nebel' ? 'Laterne anmachen' : 'Gatter schließen', tun: () => repariert(spieler) };
  }
  if (spielerIstWolf && spieler.cooldown <= 0) {
    const opfer = schafe.find(s => s.lebt && !s.istSpieler && dist(s, spieler) < 50);
    if (opfer) return { text: 'Fressen!', tun: () => fressen(opfer) };
  }
  if (spielerIstWolf) {
    const g = naechsteGrube(spieler, 50);
    if (g !== null) return { text: 'In die Grube', tun: () => springeInGrube(spieler, g) };
  }
  for (const w of wolle) if (dist(spieler, w) < 80) return { text: 'Wolle melden!', tun: () => starteTreffen(spieler, w) };
  for (const i of spieler.aufgaben) {
    if (dist(spieler, ORTE[i]) < 55) {
      return { text: ORTE[i].aufgabe, tun: () => { miniSpiel = neuesMiniSpiel(i); klickZiel = null; } };
    }
  }
  if (dist(spieler, GLOCKE) < 70 && !glockeGenutzt) {
    return { text: 'Glocke läuten', tun: () => { glockeGenutzt = true; starteTreffen(spieler, null); } };
  }
  return null;
}

function aktion() {
  if (zustand !== 'spiel') return;
  const a = moeglicheAktion();
  if (a) a.tun();
}

// ===== Herden-Treffen =====
function starteTreffen(melder, fund) {
  zustand = 'treffen';
  miniSpiel = null;
  sabotage = null;
  for (const s of schafe) s.meldet = false;
  if (fund) sound.wolle(); else sound.glocke();
  const lebende = schafe.filter(s => s.lebt);
  const aussagen = new Map();
  const anklaeger = [];

  for (const s of lebende) {
    if (s.istSpieler) {
      const r = ROLLEN[s.rolle];
      aussagen.set(s, (spielerIstWolf ? 'Das bist du (der Wolf 🤫). Wen willst du verdächtigen?' : 'Das bist du! Wen hältst du für den Wolf?') + ` Deine Rolle: ${r.emoji} ${r.name}`);
      continue;
    }
    const teile = [];
    if (s === melder && fund) teile.push(`Ich hab Wolle von ${fund.opfer.name} ${fund.ort.bei} gefunden! 😱`);
    if (!s.istWolf && s.verdacht && s.verdacht.wer.lebt) {
      const v = s.verdacht;
      if (v.grube) {
        teile.push(v.wer.istSpieler
          ? 'Ich hab gesehen, wie DU in eine Grube gesprungen bist! Das können nur Wölfe! 🕳️'
          : `Ich hab gesehen, wie ${v.wer.name} ${v.ort.bei} in eine Grube gesprungen ist! Das können nur Wölfe! 🕳️`);
      } else if (v.komisch) {
        teile.push(v.wer.istSpieler
          ? `DU hast dich ${v.ort.bei} total komisch benommen! Verdächtig! 🤨`
          : `${v.wer.name} hat sich ${v.ort.bei} total komisch benommen! Verdächtig! 🤨`);
      } else if (v.nase) {
        teile.push(v.wer.istSpieler
          ? 'Ich hab an DIR geschnuppert: Du riechst nach WOLF! 👃'
          : `Ich hab an ${v.wer.name} geschnuppert: riecht nach WOLF! 👃`);
      } else {
        teile.push(v.wer.istSpieler
          ? `Ich hab gesehen, wie DU dich ${v.ort.bei} an jemanden rangeschlichen hast! 😨`
          : `Ich hab gesehen, wie ${v.wer.name} sich ${v.ort.bei} an jemanden rangeschlichen hat! 😨`);
      }
      anklaeger.push(s);
    }
    if (!teile.length && s.rolle === 'ziege') {
      teile.push(zufall(['Hihi, vielleicht war ich\'s ja ... 😏', 'Ich sag nicht, wo ich war! 🙊', 'Määäck ... äh, ich meine: Mäh! 🐑']));
    }
    if (!teile.length) {
      let ort = s.letzterOrt;
      // Der Wolf schwindelt oft!
      if (s.istWolf && Math.random() < 0.6) ort = zufall([...ORTE, GLOCKE].filter(o => o !== s.letzterOrt));
      teile.push(zufall([`Ich war ${ort.bei}.`, `Ich war gerade ${ort.bei}, ehrlich!`, `Ich hab ${ort.bei} gearbeitet.`]));
    }
    aussagen.set(s, teile.join(' '));
  }

  // Wer beschuldigt wird, wehrt sich
  for (const a of anklaeger) {
    const b = a.verdacht.wer;
    if (b.istSpieler || b === melder) continue;
    if (b.rolle === 'ziege') aussagen.set(b, 'Hihi ... vielleicht war ich\'s ja! 😏');
    else if (b.istWolf) aussagen.set(b, `Was?! ${a.name} lügt! Ich war die ganze Zeit ${zufall([...ORTE, GLOCKE]).bei}! 😤`);
    else aussagen.set(b, `Was?! Das war ich nicht! 😢 Ich war ${b.letzterOrt.bei}, ehrlich!`);
  }

  let grund;
  if (!fund) grund = melder.istSpieler ? 'Du hast die Glocke geläutet!' : `${melder.name} ist zur Glocke gerannt und hat geläutet! 🔔`;
  else if (melder.istSpieler) grund = `Du hast Wolle von ${fund.opfer.name} gefunden!`;
  else grund = `${melder.name} hat Wolle von ${fund.opfer.name} gefunden!`;

  wolle = [];
  treffen = { grund, lebende, aussagen, anklaeger, phase: 'waehlen', stimmen: null, raus: null, skip: 0, ergebnis: '' };
}

function abstimmen(wahl) {
  const t = treffen;
  const stimmen = new Map();
  stimmen.set(spieler, wahl);

  for (const s of t.lebende) {
    if (s.istSpieler) continue;
    const andere = t.lebende.filter(o => o !== s);
    let ziel;
    if (s.istWolf) {
      const gegenMich = t.anklaeger.filter(a => a.verdacht.wer === s);
      const beschuldigt = t.anklaeger.map(a => a.verdacht.wer).filter(b => b !== s && b.lebt);
      if (gegenMich.length) ziel = zufall(gegenMich);
      else if (beschuldigt.length) ziel = zufall(beschuldigt);
      else if (wahl && wahl !== s) ziel = wahl;
      else ziel = zufall(andere);
    } else if (s.verdacht && s.verdacht.wer.lebt) {
      ziel = s.verdacht.wer;
    } else {
      const r = Math.random();
      if (wahl && wahl !== s && r < (spielerIstWolf ? 0.4 : 0.55)) ziel = wahl;   // Folgt deiner Stimme
      else if (r < 0.8) ziel = null;                     // Überspringen
      else ziel = zufall(andere);
    }
    stimmen.set(s, ziel);
  }

  // Stimmen zählen
  const zaehler = new Map();
  let skip = 0;
  for (const z of stimmen.values()) {
    if (z) zaehler.set(z, (zaehler.get(z) || 0) + 1); else skip++;
  }
  let max = 0, raus = null, gleich = false;
  for (const [s, n] of zaehler) {
    if (n > max) { max = n; raus = s; gleich = false; }
    else if (n === max) gleich = true;
  }
  if (gleich || max <= skip) raus = null;

  t.stimmen = stimmen; t.raus = raus; t.skip = skip; t.phase = 'ergebnis';
  if (!raus) sound.hmm(); else sound.trommel();
  if (!raus) t.ergebnis = 'Niemand wurde vom Hof gejagt. 🤷';
  else if (raus.istSpieler) t.ergebnis = 'Die Herde jagt DICH vom Hof ... 😱';
  else t.ergebnis = `${raus.name} wird vom Hof gejagt ... 😱`;
}

function treffenWeiter() {
  const raus = treffen.raus;
  treffen = null;
  if (raus) {
    raus.lebt = false;
    raus.erledigt = raus.gesamt;
    raus.aufgaben = [];
    if (raus.rolle === 'ziege') { beende('ziege', raus.istSpieler ? 'Du wolltest verjagt werden – und es hat geklappt! 😏' : `${raus.name} war die Ziege und wollte verjagt werden!`); return; }
    if (raus.istWolf) { beende('schafe', spielerIstWolf ? 'Die Herde hat dich durchschaut!' : 'Ihr habt den Wolf erwischt!'); return; }
    if (raus.istSpieler) { beende('wolf', 'Die Herde hat dich rausgeworfen, obwohl du ein echtes Schaf bist!'); return; }
    if (pruefeWolfSieg()) return;
  }
  for (const s of schafe) {
    if (!(s.verdacht && s.verdacht.nase)) s.verdacht = null;   // Was die Nase weiß, bleibt!
    s.geschuetzt = false;
  }
  botsBeschuetzen();
  wolf.cooldown = 15;
  sabotagePause = Math.max(sabotagePause, 20);
  alleZurGlocke();
  zustand = 'spiel';
}

function kartenRechtecke() {
  const breite = 205, hoehe = 150, abstand = 12;
  const x0 = 30 + (900 - 4 * breite - 3 * abstand) / 2;
  return treffen.lebende.map((s, i) => ({
    s,
    x: x0 + (i % 4) * (breite + abstand),
    y: 115 + Math.floor(i / 4) * (hoehe + abstand),
    w: breite, h: hoehe,
  }));
}
const SKIP_KNOPF = { x: W / 2 - 100, y: 450, w: 200, h: 44 };
const WEITER_KNOPF = { x: W / 2 - 80, y: 510, w: 160, h: 44 };
const imRechteck = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function klickTreffen(p) {
  if (treffen.phase === 'waehlen') {
    for (const k of kartenRechtecke()) {
      if (!k.s.istSpieler && imRechteck(p, k)) { abstimmen(k.s); return; }
    }
    if (imRechteck(p, SKIP_KNOPF)) abstimmen(null);
  } else if (imRechteck(p, WEITER_KNOPF)) {
    weiterNachAbstimmung();
  }
}

// ===== Fähigkeiten der Rollen =====
function naechstesSchaf(max) {
  const z = schafe.filter(s => s.lebt && !s.istSpieler).sort((a, b) => dist(a, spieler) - dist(b, spieler))[0];
  return z && dist(z, spieler) < max ? z : null;
}

// Was kann deine Rolle gerade machen?
function rollenAktion() {
  const z = naechstesSchaf(70);
  switch (spieler.rolle) {
    case 'spuernase': return {
      text: z ? `Schnuppern (${z.name})` : 'Schnuppern', moeglich: !!z, hinweis: 'Geh näher an ein Schaf heran!',
      tun() {
        z.geruch = z.istWolf ? 'wolf' : 'schaf';
        effektAn(z, 'schnuppern', 1.8, { wolf: z.istWolf });
        zeigeNachricht(z.istWolf ? `👃 ${z.name} riecht nach WOLF! 🐺` : `👃 ${z.name} riecht nach Schaf. 🐑`, 3);
        sound.schnuppern();
      } };
    case 'flitzer': return {
      text: 'Sprinten', moeglich: true,
      tun() {
        spieler.sprint = 4; sound.sprint(); zeigeNachricht('💨 Wuuusch!', 1.5);
        funken(spieler.x, spieler.y + 15, 18, RAUCH, 140, 7, 0.6);
        effektAn(spieler, 'icon', 1, { text: '💨' });
      } };
    case 'beschuetzer': return {
      text: z ? `Beschützen (${z.name})` : 'Beschützen', moeglich: !!z, hinweis: 'Geh näher an ein Schaf heran!',
      tun() {
        for (const s of schafe) if (s.beschuetztVonDir) { s.geschuetzt = false; s.beschuetztVonDir = false; }
        z.geschuetzt = true; z.beschuetztVonDir = true;
        effektAn(z, 'schildAuf', 1);
        funken(z.x, z.y, 20, BLAU, 110, 4, 0.8);
        zeigeNachricht(`🛡️ Du beschützt jetzt ${z.name}!`, 3);
        sound.schild();
      } };
    case 'bastler': return {
      text: 'Reparieren', moeglich: !!sabotage, hinweis: 'Gerade ist nichts kaputt.',
      tun() {
        const p = sabotagePunkt();
        funken(p.x, p.y - 50, 30, GOLD, 170, 4, 0.9, 200);
        effektAn(spieler, 'werkzeug', 1.3);
        funken(spieler.x, spieler.y - 55, 15, GOLD, 120, 3, 0.6, 150);
        repariert(spieler);
      } };
    case 'ziege': {
      const hoerer = schafe.filter(s => s.lebt && !s.istSpieler && !s.istWolf && dist(s, spieler) < 220);
      return {
        text: 'Meckern', moeglich: hoerer.length > 0, hinweis: 'Niemand ist in der Nähe, der dich hören könnte!',
        tun() {
          for (const h of hoerer) {
            if (!h.verdacht) h.verdacht = { wer: spieler, ort: naechsterOrt(spieler), komisch: true };
            effektAn(h, 'icon', 1.6, { text: '🤨', warte: 0.3 });
          }
          effektAn(spieler, 'meckern', 1.3);
          sound.meckern();
          zeigeNachricht(`🐐 Määäck! ${hoerer.map(h => h.name).join(', ')} findet dich jetzt verdächtig!`, 3);
        } };
    }
    case 'schleicher': return {
      text: 'Unsichtbar', moeglich: true,
      tun() {
        spieler.unsichtbar = 6; sound.nebel(); zeigeNachricht('👻 Du bist 6 Sekunden unsichtbar!', 2);
        funken(spieler.x, spieler.y, 30, LILA, 130, 4, 0.9, -40);
        effekte.push({ x: spieler.x, y: spieler.y, art: 'geist', t: 1.2, max: 1.2 });
      } };
    case 'verkleider': {
      const v = naechstesSchaf(110);
      return {
        text: v ? `Verkleiden (als ${v.name})` : 'Verkleiden', moeglich: !!v, hinweis: 'Geh näher an das Schaf, als das du dich verkleiden willst!',
        tun() {
          spieler.verkleidet = { als: v, t: 15 }; sound.plopp(); zeigeNachricht(`🎭 Du siehst jetzt aus wie ${v.name}!`, 2.5);
          funken(spieler.x, spieler.y, 35, RAUCH, 100, 11, 1, -60);
          effektAn(spieler, 'maske', 1.2);
        } };
    }
  }
  return null;
}

function nutzeFaehigkeit() {
  if (zustand !== 'spiel' || miniSpiel) return;
  const a = rollenAktion();
  if (!a) return;
  if (spieler.faehigkeit > 0) { zeigeNachricht(`Noch ${Math.ceil(spieler.faehigkeit)} Sekunden warten ...`, 1.5); return; }
  if (!a.moeglich) { zeigeNachricht(a.hinweis, 2); return; }
  a.tun();
  spieler.faehigkeit = ROLLEN[spieler.rolle].pause;
}

function updateFaehigkeiten(dt) {
  for (const s of schafe) {
    const warUnsichtbar = s.unsichtbar > 0;
    s.faehigkeit -= dt; s.sprint -= dt; s.unsichtbar -= dt;
    if (warUnsichtbar && s.unsichtbar <= 0 && s.lebt && s.inGrube == null) funken(s.x, s.y, 20, LILA, 110, 4, 0.7, -40);   // wieder sichtbar!
    if (s.verkleidet) {
      s.verkleidet.t -= dt;
      if (s.verkleidet.t <= 0 || !s.verkleidet.als.lebt) {
        s.verkleidet = null;
        if (s.lebt && s.inGrube == null) funken(s.x, s.y, 25, RAUCH, 90, 10, 0.8, -60);   // Puff! Verkleidung weg
      }
    }
    // Staubwolken beim Sprinten
    if (s.sprint > 0 && s.laeuft && Math.random() < 0.6) {
      partikel.push({ x: s.x - s.richtung * 18, y: s.y + 18, vx: -s.richtung * 40 + (Math.random() - 0.5) * 30, vy: -20 * Math.random(), t: 0.45, max: 0.45, farbe: '#d6c7a8', groesse: 6 + Math.random() * 4, g: 0 });
    }
    // Computer-Ziegen benehmen sich komisch
    if (!s.istSpieler && s.lebt && s.rolle === 'ziege') {
      s.schnupperZeit -= dt;
      if (s.schnupperZeit <= 0) {
        s.schnupperZeit = 35;
        effektAn(s, 'meckern', 1.3);
        if (dist(s, spieler) < sicht + 20) sound.meckern();
        for (const o of schafe) {
          if (o.lebt && !o.istSpieler && !o.istWolf && o !== s && !o.verdacht && dist(o, s) < 200) o.verdacht = { wer: s, ort: naechsterOrt(s), komisch: true };
        }
      }
    }
    // Computer-Spürnasen schnuppern auch!
    if (!s.istSpieler && s.lebt && !s.istWolf && s.rolle === 'spuernase') {
      s.schnupperZeit -= dt;
      if (s.schnupperZeit <= 0) {
        const z = schafe.find(o => o.lebt && o !== s && dist(o, s) < 120 && !(o.unsichtbar > 0));
        if (z) {
          s.schnupperZeit = 40;
          if (z.istWolf) s.verdacht = { wer: z, ort: naechsterOrt(s), nase: true };
        }
      }
    }
  }
}

// Computer-Beschützer passen auf ein Schaf auf
function botsBeschuetzen() {
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf || s.rolle !== 'beschuetzer') continue;
    const andere = schafe.filter(o => o.lebt && o !== s && !o.istWolf);
    if (andere.length) zufall(andere).geschuetzt = true;
  }
}

// ===== Cutscene: Ein Schaf wird vom Hof gejagt =====
let cutscene = null;

function weiterNachAbstimmung() {
  if (treffen.raus) {
    zustand = 'cutscene';
    cutscene = { t: 0, raus: treffen.raus, herde: schafe.filter(s => s.lebt && s !== treffen.raus) };
  } else {
    treffenWeiter();
  }
}

function endeCutscene() {
  cutscene = null;
  zustand = 'treffen';
  treffenWeiter();
}

function updateCutscene(dt) {
  const c = cutscene, vorher = c.t;
  c.t += dt;
  const ab = z => vorher < z && c.t >= z;
  if (ab(0.8)) sound.trippel();
  if (ab(2.0) && c.raus.istWolf) sound.knurren();
  if (ab(2.0) && c.raus.rolle === 'ziege') sound.meckern();
  if (ab(4.0)) {
    const gut = c.raus.rolle === 'ziege' ? c.raus.istSpieler : (spieler.rolle !== 'ziege' && c.raus.istWolf !== spielerIstWolf);
    if (gut) sound.fanfare(); else sound.traurig();
  }
  if (c.t > 8) endeCutscene();
}

// Wo ist das verjagte Schaf gerade?
function cutPos(t) {
  if (t < 0.8) return { x: 330 + Math.sin(t * 40) * 2, y: 540, s: 1.5 };   // zittert
  if (t < 2) { const k = (t - 0.8) / 1.2; return { x: 330 + k * 350, y: 540 - k * 60, s: 1.5 - k * 0.3 }; }
  const k = Math.min(1, (t - 2) / 2.5);
  return { x: 680 + k * 220, y: 480 - k * 135, s: 1.2 - k * 1.05 };
}

function zeichneCutscene() {
  const c = cutscene, t = c.t, r = c.raus;
  const himmel = KARTE.himmel || ['#3b2a6b', '#ff9a62'];
  const g = ctx.createLinearGradient(0, 0, 0, 360);
  g.addColorStop(0, himmel[0]); g.addColorStop(1, himmel[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,220,120,0.8)'; ellipse(800, 300, 55, 55); ctx.fill();

  // Hügel und Weg in die Ferne
  ctx.fillStyle = KARTE.boden;
  ctx.beginPath(); ctx.moveTo(0, 360); ctx.quadraticCurveTo(480, 300, 960, 345); ctx.lineTo(960, 600); ctx.lineTo(0, 600); ctx.fill();
  ctx.fillStyle = KARTE.weg;
  ctx.beginPath(); ctx.moveTo(590, 600); ctx.lineTo(780, 600); ctx.lineTo(905, 342); ctx.lineTo(895, 342); ctx.fill();

  const p = cutPos(t);
  const zeichneVerjagtes = () => {
    if ((r.istWolf || r.rolle === 'ziege') && t > 2) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(-p.s, p.s);   // schaut nach rechts
      text(r.istWolf ? '🐺' : '🐐', 0, -5, 60, '#fff', 'center', false);
      ctx.restore();
    } else {
      zeichneSchafKoerper(p.x, p.y, r.farbe, 1, t * 14, t > 0.8, p.s);
    }
    if (t < 2) text(r.name, p.x, p.y - 50 * p.s, 18, r.istSpieler ? '#ffd166' : '#fff');
  };

  // Hinter dem Zaun? Dann zuerst zeichnen
  if (p.y < 470) zeichneVerjagtes();

  // Zaun mit offenem Tor
  ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 450); ctx.lineTo(610, 455); ctx.moveTo(0, 480); ctx.lineTo(610, 485);
  ctx.moveTo(760, 455); ctx.lineTo(960, 450); ctx.moveTo(760, 485); ctx.lineTo(960, 480);
  ctx.moveTo(610, 455); ctx.lineTo(560, 520); ctx.moveTo(610, 485); ctx.lineTo(560, 550);   // Tor steht offen
  ctx.stroke();
  ctx.fillStyle = '#6e4b2a';
  for (let x = 20; x < 960; x += 90) if (x < 610 || x > 750) ctx.fillRect(x, 435, 9, 60);
  ctx.fillRect(605, 430, 11, 70); ctx.fillRect(755, 430, 11, 70);

  // Wolle fliegt, wenn der Wolf enttarnt wird
  if ((r.istWolf || r.rolle === 'ziege') && t > 2 && t < 3.5) {
    const w = cutPos(2);
    for (let i = 0; i < 10; i++) {
      const k = t - 2;
      ctx.fillStyle = r.farbe;
      ellipse(w.x + Math.cos(i * 0.63) * k * 90, w.y - 20 + Math.sin(i * 0.63) * k * 40 + k * k * 80, 7, 7); ctx.fill();
    }
  }

  if (p.y >= 470) zeichneVerjagtes();

  // Die Herde schaut zu
  c.herde.slice(0, 8).forEach((s, i) => {
    const x = 50 + i * 62, y = 545 + (i % 2) * 22;
    zeichneSchafKoerper(x, y, s.farbe, 1, 0, false, 1);
    if (s.istSpieler) text('DU', x, y - 35, 13, '#ffd166');
  });

  // Text, Buchstabe für Buchstabe
  if (t > 4) {
    let zeile1;
    if (r.rolle === 'ziege') zeile1 = r.istSpieler ? 'Du warst die ZIEGE! 🐐' : `${r.name} war die ZIEGE! 🐐`;
    else if (r.istSpieler && r.istWolf) zeile1 = 'Du warst der Wolf ... und wurdest erwischt! 🐺';
    else if (r.istSpieler) zeile1 = 'Du warst KEIN Wolf ... 😢';
    else if (r.istWolf) zeile1 = `${r.name} war der Wolf! 🐺`;
    else zeile1 = `${r.name} war KEIN Wolf. 😢`;
    const buchstaben = [...zeile1];
    text(buchstaben.slice(0, Math.floor((t - 4) * 25)).join(''), W / 2, 110, 36, r.istWolf ? '#ff6b6b' : '#fff');
  }
  if (t > 5.2) {
    ctx.globalAlpha = Math.min(1, (t - 5.2) * 2);
    let zeile2;
    if (r.rolle === 'ziege') zeile2 = r.istSpieler ? 'Du wolltest verjagt werden ... DU GEWINNST! 🎉' : 'Sie wollte verjagt werden ... Die Ziege gewinnt! 😱';
    else if (r.istWolf) zeile2 = spielerIstWolf ? 'Die Schafe haben dich durchschaut!' : 'Die Herde ist gerettet! 🎉';
    else if (r.istSpieler) zeile2 = 'Die Herde hat sich geirrt ...';
    else zeile2 = spielerIstWolf ? 'Keiner ahnt, dass DU der Wolf bist ... 😈' : 'Der Wolf ist immer noch unter euch ... 🐺';
    text(zeile2, W / 2, 165, 22, '#ffd166');
    ctx.globalAlpha = 1;
  }
  if (t > 5.8) {
    const rr = ROLLEN[r.rolle];
    text(`Rolle: ${rr.emoji} ${rr.name}`, W / 2, 205, 18, '#ddd', 'center', false);
  }
  if (t > 1.5) text('Klicken zum Weiterspielen', W - 120, H - 18, 13, 'rgba(255,255,255,0.7)', 'center', false);
}

// ===== Mini-Spiele für die Aufgaben =====
const PX = 180, PY = 70, PB = 600, PH = 460;   // Fenster vom Mini-Spiel
const MX = PX + PB / 2;
const X_KNOPF = { x: PX + PB - 46, y: PY + 12, w: 34, h: 34 };
const KURBEL = { x: MX, y: PY + 260 };
const KORB = { x: PX + 370, y: PY + 150, w: 170, h: 220 };
const ANLEITUNG = {
  heu: 'Klicke auf das ganze Heu, um es zu fressen! 🌾',
  kurbel: 'Halte die Maus gedrückt und dreh die Kurbel im Kreis!',
  eimer: 'Halte gedrückt (Maus oder Leertaste) und lass im grünen Bereich los!',
  wolle: 'Zieh die Wollknäuel in den Korb!',
  blumen: 'Halte die Maus über jede Blume gedrückt, bis sie blüht!',
  zaun: 'Hau jeden Nagel 3-mal rein! 🔨',
};

function neuesMiniSpiel(ortNr) {
  const art = ORTE[ortNr].spiel;
  const m = { ortNr, art, fertig: false, fertigT: 0, halten: false, text: '' };
  if (art === 'heu') {
    m.heu = [];
    for (let i = 0; i < 6; i++) m.heu.push({ x: PX + 90 + Math.random() * (PB - 180), y: PY + 140 + Math.random() * (PH - 230), weg: false });
  }
  if (art === 'kurbel') { m.drehung = 0; m.letzterWinkel = null; }
  if (art === 'eimer') m.wasser = 0;
  if (art === 'wolle') {
    m.baelle = [0, 1, 2].map(i => ({ x: PX + 120, y: PY + 160 + i * 95, sx: PX + 120, sy: PY + 160 + i * 95, drin: false, f: FARBEN[i * 2] }));
    m.greift = null;
  }
  if (art === 'blumen') m.blumen = [0, 1, 2, 3].map(i => ({ x: PX + 120 + i * 120, wasser: 0, f: FARBEN[i] }));
  if (art === 'zaun') m.naegel = [0, 1, 2, 3].map(i => ({ x: PX + 130 + i * 115, schlaege: 0 }));
  return m;
}

function miniGeschafft() {
  if (miniSpiel.fertig) return;
  miniSpiel.fertig = true;
  sound.geschafft();
}

function aufgabeErledigt(nr) {
  spieler.aufgaben = spieler.aufgaben.filter(i => i !== nr);
  spieler.erledigt++;
  zeigeNachricht('✅ ' + ORTE[nr].aufgabe + ' geschafft!', 2);
  miniSpiel = null;
}

function kurbeln(m, menge) {
  const viertel = Math.PI / 2;
  const vorher = m.drehung;
  m.drehung += menge;
  if (Math.floor(m.drehung / viertel) > Math.floor(vorher / viertel)) sound.klack();
  if (m.drehung >= Math.PI * 6) miniGeschafft();   // 3 ganze Runden
}

function eimerLos(m) {
  if (m.wasser >= 0.7 && m.wasser <= 0.85) miniGeschafft();
  else if (m.wasser > 0.85) { m.wasser = 0; m.text = 'Zu viel! Nochmal von vorne 💦'; sound.fehler(); }
}

function miniDruck(p) {
  const m = miniSpiel;
  if (imRechteck(p, X_KNOPF)) { miniSpiel = null; return; }
  if (m.fertig) return;
  m.halten = true;
  if (m.art === 'heu') {
    const h = m.heu.find(h => !h.weg && dist(p, h) < 40);
    if (h) { h.weg = true; sound.mampf(); }
    if (m.heu.every(h => h.weg)) miniGeschafft();
  }
  if (m.art === 'kurbel') m.letzterWinkel = Math.atan2(p.y - KURBEL.y, p.x - KURBEL.x);
  if (m.art === 'wolle') m.greift = m.baelle.find(b => !b.drin && dist(p, b) < 35) || null;
  if (m.art === 'zaun') {
    const n = m.naegel.find(n => n.schlaege < 3 && Math.abs(p.x - n.x) < 35 && p.y > PY + 150 && p.y < PY + 340);
    if (n) { n.schlaege++; sound.hammer(); }
    if (m.naegel.every(n => n.schlaege >= 3)) miniGeschafft();
  }
}

function miniBewegt(p) {
  const m = miniSpiel;
  if (!m || m.fertig) return;
  if (m.art === 'kurbel' && m.halten && m.letzterWinkel !== null) {
    const w = Math.atan2(p.y - KURBEL.y, p.x - KURBEL.x);
    let d = w - m.letzterWinkel;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    m.letzterWinkel = w;
    kurbeln(m, Math.abs(d));
  }
  if (m.art === 'wolle' && m.greift) { m.greift.x = p.x; m.greift.y = p.y; }
}

function miniLos() {
  const m = miniSpiel;
  if (!m) return;
  const warGehalten = m.halten;
  m.halten = false;
  m.letzterWinkel = null;
  if (m.fertig) return;
  if (m.art === 'eimer' && warGehalten) eimerLos(m);
  if (m.art === 'wolle' && m.greift) {
    const b = m.greift;
    m.greift = null;
    if (imRechteck(b, KORB)) {
      b.drin = true;
      const n = m.baelle.filter(x => x.drin).length - 1;
      b.x = KORB.x + 40 + n * 45; b.y = KORB.y + KORB.h - 55;
      sound.plopp();
      if (m.baelle.every(x => x.drin)) miniGeschafft();
    } else {
      b.x = b.sx; b.y = b.sy;
    }
  }
}

function miniTaste(k) {
  const m = miniSpiel;
  if (k === 'escape') { miniSpiel = null; return; }
  if (m.fertig) return;
  if (m.art === 'kurbel' && (k === ' ' || k === 'e')) kurbeln(m, 0.5);
  if (m.art === 'eimer' && (k === ' ' || k === 'e')) m.halten = true;
}

function miniUpdate(dt) {
  const m = miniSpiel;
  if (m.fertig) {
    m.fertigT += dt;
    if (m.fertigT > 0.9) aufgabeErledigt(m.ortNr);
    return;
  }
  if (m.art === 'eimer' && m.halten) {
    m.wasser += dt * 0.4;
    m.text = '';
    if (m.wasser > 1.05) { m.wasser = 0; m.halten = false; m.text = 'Übergelaufen! Nochmal 💦'; sound.fehler(); }
  }
  if (m.art === 'blumen' && m.halten) {
    for (const b of m.blumen) {
      if (b.wasser < 1 && Math.abs(maus.x - b.x) < 50 && maus.y > PY + 110 && maus.y < PY + 400) {
        b.wasser += dt * 1.2;
        if (b.wasser >= 1) { b.wasser = 1; sound.plopp(); }
      }
    }
    if (m.blumen.every(b => b.wasser >= 1)) miniGeschafft();
  }
}

function zeichneMiniSpiel() {
  const m = miniSpiel;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fdf6e3';
  rundesRechteck(PX, PY, PB, PH, 20); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4; ctx.stroke();

  text(ORTE[m.ortNr].aufgabe, MX, PY + 32, 26, '#1b1f3a', 'center', false);
  text(ANLEITUNG[m.art], MX, PY + 66, 15, '#555', 'center', false);
  ctx.fillStyle = imRechteck(maus, X_KNOPF) ? '#ff6b6b' : '#e0c9a6';
  rundesRechteck(X_KNOPF.x, X_KNOPF.y, X_KNOPF.w, X_KNOPF.h, 8); ctx.fill();
  text('✕', X_KNOPF.x + 17, X_KNOPF.y + 18, 20, '#1b1f3a', 'center', false);

  if (m.art === 'heu') {
    ctx.fillStyle = '#9ccc65';
    rundesRechteck(PX + 30, PY + 95, PB - 60, PH - 145, 14); ctx.fill();
    for (const h of m.heu) {
      if (h.weg) continue;
      ctx.fillStyle = '#e9c46a';
      ellipse(h.x, h.y + 10, 32, 14); ctx.fill();
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(h.x + k * 6, h.y + 12); ctx.lineTo(h.x + k * 10, h.y - 18); ctx.stroke();
      }
    }
    text(`${m.heu.filter(h => h.weg).length} / ${m.heu.length} gefressen`, MX, PY + PH - 30, 16, '#1b1f3a', 'center', false);
  }

  if (m.art === 'kurbel') {
    const { x, y } = KURBEL;
    ctx.fillStyle = '#9e9e9e'; ellipse(x, y, 120, 120); ctx.fill();
    ctx.fillStyle = '#bdbdbd'; ellipse(x, y, 100, 100); ctx.fill();
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const w = m.drehung + i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(w) * 20, y + Math.sin(w) * 20); ctx.lineTo(x + Math.cos(w) * 95, y + Math.sin(w) * 95); ctx.stroke();
    }
    const gx = x + Math.cos(m.drehung) * 95, gy = y + Math.sin(m.drehung) * 95;
    ctx.strokeStyle = '#6e4b2a'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ellipse(gx, gy, 18, 18); ctx.fill();
    ctx.fillStyle = '#555'; ellipse(x, y, 12, 12); ctx.fill();
    // Mehl-Balken
    const anteil = Math.min(1, m.drehung / (Math.PI * 6));
    ctx.fillStyle = '#ddd'; rundesRechteck(PX + 100, PY + 400, PB - 200, 22, 8); ctx.fill();
    ctx.fillStyle = '#fff3c4'; rundesRechteck(PX + 100, PY + 400, (PB - 200) * anteil, 22, 8); ctx.fill();
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 2; rundesRechteck(PX + 100, PY + 400, PB - 200, 22, 8); ctx.stroke();
    text('Mehl 🌾', PX + 60, PY + 411, 14, '#1b1f3a', 'center', false);
  }

  if (m.art === 'eimer') {
    const oben = PY + 140, unten = PY + 390, hoehe = unten - oben;
    const eimer = () => {
      ctx.beginPath();
      ctx.moveTo(MX - 90, oben); ctx.lineTo(MX + 90, oben);
      ctx.lineTo(MX + 65, unten); ctx.lineTo(MX - 65, unten); ctx.closePath();
    };
    // Grüner Ziel-Bereich
    ctx.fillStyle = 'rgba(74,222,128,0.35)';
    ctx.fillRect(MX - 130, unten - hoehe * 0.85, 260, hoehe * 0.15);
    text('Hier loslassen! ➜', MX + 120, unten - hoehe * 0.775, 15, '#15803d', 'left', false);
    ctx.fillStyle = '#e8e8e8'; eimer(); ctx.fill();
    // Wasser
    ctx.save(); eimer(); ctx.clip();
    const w = Math.min(1, m.wasser);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(MX - 100, unten - hoehe * w, 200, hoehe * w);
    ctx.restore();
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 5; eimer(); ctx.stroke();
    // Wasserhahn
    ctx.fillStyle = '#6b7280'; ctx.fillRect(MX - 60, PY + 90, 70, 14); ctx.fillRect(MX - 4, PY + 90, 14, 30);
    if (m.halten) {
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(MX - 1, PY + 120, 8, unten - hoehe * w - (PY + 120));
    }
    if (m.text) text(m.text, MX, PY + 418, 17, '#dc2626', 'center', false);
  }

  if (m.art === 'wolle') {
    ctx.fillStyle = '#a0703c';
    rundesRechteck(KORB.x, KORB.y, KORB.w, KORB.h, 16); ctx.fill();
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(KORB.x, KORB.y + i * 36); ctx.lineTo(KORB.x + KORB.w, KORB.y + i * 36); ctx.stroke();
    }
    text('Korb', KORB.x + KORB.w / 2, KORB.y - 16, 16, '#1b1f3a', 'center', false);
    // Das gegriffene Knäuel zuletzt zeichnen, damit es oben liegt
    const reihe = [...m.baelle.filter(b => b !== m.greift), ...(m.greift ? [m.greift] : [])];
    for (const b of reihe) {
      ctx.fillStyle = b.f; ellipse(b.x, b.y, 28, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.ellipse(b.x + k * 8, b.y, 10, 26, 0.4, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  if (m.art === 'blumen') {
    const boden = PY + 360;
    ctx.fillStyle = '#7a5230'; ctx.fillRect(PX + 40, boden, PB - 80, 40);
    for (const b of m.blumen) {
      const welk = 1 - b.wasser;
      const kx = b.x + welk * 35, ky = boden - 150 + welk * 70;
      ctx.strokeStyle = welk > 0 ? '#8a9a3a' : '#2e7d32'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(b.x, boden); ctx.quadraticCurveTo(b.x, ky, kx, ky); ctx.stroke();
      if (b.wasser >= 1) {
        ctx.fillStyle = b.f;
        for (let i = 0; i < 6; i++) { const w = i * Math.PI / 3; ellipse(kx + Math.cos(w) * 18, ky + Math.sin(w) * 18, 13, 13); ctx.fill(); }
        ctx.fillStyle = '#ffd166'; ellipse(kx, ky, 12, 12); ctx.fill();
      } else {
        ctx.fillStyle = '#9a8a5a'; ellipse(kx, ky, 12, 9); ctx.fill();
      }
      ctx.fillStyle = '#ddd'; ctx.fillRect(b.x - 30, boden + 14, 60, 10);
      ctx.fillStyle = '#3b82f6'; ctx.fillRect(b.x - 30, boden + 14, 60 * b.wasser, 10);
    }
    if (m.halten) {
      for (let i = 0; i < 3; i++) text('💧', maus.x - 15 + i * 15, maus.y + 25 + ((zeit * 120 + i * 20) % 40), 16, '#fff', 'center', false);
    }
  }

  if (m.art === 'zaun') {
    const brett = PY + 280;
    ctx.fillStyle = '#c69c6d'; ctx.fillRect(PX + 60, brett, PB - 120, 60);
    ctx.strokeStyle = '#9c7448'; ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(PX + 60, brett + i * 20); ctx.lineTo(PX + PB - 60, brett + i * 20); ctx.stroke(); }
    for (const n of m.naegel) {
      const raus = (3 - n.schlaege) * 22;
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(n.x - 3, brett + 10 - raus, 6, raus);
      ctx.fillStyle = '#4b5563'; ellipse(n.x, brett + 10 - raus, 15, 6); ctx.fill();
    }
    if (!m.fertig) text('🔨', maus.x + 10, maus.y - 10, 40, '#fff', 'center', false);
  }

  if (m.fertig) {
    const pop = Math.min(1.2, 0.5 + m.fertigT * 2);
    ctx.save(); ctx.translate(MX, PY + PH / 2); ctx.scale(pop, pop);
    text('✅ Geschafft!', 0, 0, 52, '#4ade80');
    ctx.restore();
  }
  text('Pass auf: Die Zeit läuft weiter! 🐺', MX, PY + PH - 10, 13, '#b91c1c', 'center', false);
}

// ===== Spiel-Update =====
function update(dt) {
  for (const e of effekte) e.t -= dt;
  effekte = effekte.filter(e => e.t > 0);
  for (const p of partikel) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += p.g * dt;
    p.vx *= 0.97; p.vy *= 0.97;
    p.t -= dt;
  }
  partikel = partikel.filter(p => p.t > 0);
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  if (zustand === 'intro') {
    const vorher = intro;
    intro += dt;
    if (vorher < 0.2 && intro >= 0.2) sound.spannung();
    if (vorher < 1.5 && intro >= 1.5) { if (spieler.rolle === 'ziege') sound.meckern(); else if (spielerIstWolf) sound.wolf(); else sound.schaf(); }
    if (intro > 8) introFertig();
    return;
  }
  if (zustand === 'cutscene') { updateCutscene(dt); return; }
  if (zustand !== 'spiel') return;

  updateFaehigkeiten(dt);
  if (miniSpiel) miniUpdate(dt);
  bewegeSpieler(dt);
  for (const s of schafe) if (!s.istSpieler && s.lebt) bewegeBot(s, dt);
  if (spielerIstWolf) {
    const vorher = wolf.cooldown;
    wolf.cooldown -= dt;
    if (wolf.rolle === 'turbo' && vorher > 0 && wolf.cooldown <= 0) {
      funken(wolf.x, wolf.y - 10, 25, GOLD, 180, 3, 0.6);
      effektAn(wolf, 'icon', 1.2, { text: '⚡' });
      sound.zap();
    }
  }
  else if (wolf.lebt) wolfLogik(dt);
  if (zustand !== 'spiel') return;
  updateSabotage(dt);
  if (zustand !== 'spiel') return;

  // Ein Schaf hat den Wolf in einer Grube gesehen und läutet die Glocke
  for (const s of schafe) {
    if (!s.istSpieler && s.lebt && s.meldet && dist(s, GLOCKE) < 60) { sound.glocke(); starteTreffen(s, null); return; }
  }

  // Andere Schafe finden Wolle und rufen ein Treffen ein
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf) continue;
    for (const w of wolle) {
      if (dist(s, w) < 70) { starteTreffen(s, w); return; }
    }
  }

  if (fortschritt() >= 1) beende('schafe', spielerIstWolf ? 'Die Schafe haben alle Aufgaben geschafft!' : 'Alle Aufgaben sind erledigt! Der Hof ist sicher.');
}

// ===== Zeichnen =====
function zeichneSchafKoerper(x, y, farbe, richtung, phase, laeuft, groesse = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(groesse, groesse);
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(0, 21, 24, 6); ctx.fill();
  // Beine
  ctx.fillStyle = '#333';
  [-12, -5, 5, 12].forEach((bx, i) => {
    const h = laeuft ? Math.sin(phase + i * Math.PI / 2) * 3 : 0;
    ctx.fillRect(bx - 2, 6, 4, 13 + h);
  });
  // Wollkörper
  ctx.translate(0, laeuft ? -Math.abs(Math.sin(phase)) * 3 : 0);
  const wolken = [[-13, 0, 12], [0, -5, 14], [13, 0, 12], [-7, 6, 11], [7, 6, 11]];
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (const [wx, wy, r] of wolken) { ellipse(wx, wy, r + 2, r + 2); ctx.fill(); }
  ctx.fillStyle = farbe;
  for (const [wx, wy, r] of wolken) { ellipse(wx, wy, r, r); ctx.fill(); }
  // Kopf
  ctx.fillStyle = '#2b2b2b';
  ellipse(richtung * 21, -7, 10, 12); ctx.fill();
  ellipse(richtung * 13, -14, 7, 3); ctx.fill();   // Ohr
  // Auge
  ctx.fillStyle = '#fff';
  ellipse(richtung * 25, -10, 3.2, 3.2); ctx.fill();
  ctx.fillStyle = '#000';
  ellipse(richtung * 26, -10, 1.6, 1.6); ctx.fill();
  ctx.restore();
}

function zeichneSchaf(s) {
  if (s.inGrube != null) {   // Versteckt in der Grube
    if (s.istSpieler) text('👀', s.x, s.y, 20, '#fff', 'center', false);
    return;
  }
  let farbe = s.farbe, name = s.name;
  if (s.verkleidet) { farbe = s.verkleidet.als.farbe; name = s.verkleidet.als.name; }
  if (s.unsichtbar > 0) {
    if (!s.istSpieler) return;   // Unsichtbar!
    ctx.globalAlpha = 0.25 + Math.sin(zeit * 8) * 0.12;   // flimmert
  }
  // Speed-Linien beim Sprinten
  if (s.sprint > 0 && s.laeuft) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const l = 20 + ((zeit * 200 + i * 37) % 30);
      ctx.beginPath(); ctx.moveTo(s.x - s.richtung * 32, s.y - 12 + i * 11); ctx.lineTo(s.x - s.richtung * (32 + l), s.y - 12 + i * 11); ctx.stroke();
    }
  }
  zeichneSchafKoerper(s.x, s.y, farbe, s.richtung, s.phase, s.laeuft);
  // Schutzblase (nur der Beschützer sieht sie)
  if (s.beschuetztVonDir && s.geschuetzt) {
    const glanz = 0.45 + Math.sin(zeit * 4) * 0.25;
    ctx.fillStyle = 'rgba(143,211,255,0.12)';
    ellipse(s.x, s.y - 2, 38, 33); ctx.fill();
    ctx.strokeStyle = `rgba(143,211,255,${glanz})`; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${glanz})`;
    ellipse(s.x - 18, s.y - 18, 6, 3); ctx.fill();
  }
  text(name, s.x, s.y - 32, 13, s.istSpieler ? '#ffd166' : '#fff');
  ctx.globalAlpha = 1;
  // Kleine Symbole, die nur DU siehst
  let symbol = '';
  if (s.istSpieler && s.verkleidet) symbol += '🎭';
  if (s.istSpieler && s.unsichtbar > 0) symbol += '👻';
  if (s.istSpieler && s.sprint > 0) symbol += '💨';
  if (s.istSpieler && s.rolle === 'ziege') symbol += '🐐';
  if (spieler.rolle === 'spuernase' && s.geruch) symbol += s.geruch === 'wolf' ? '🐺' : '✅';
  if (s.beschuetztVonDir && s.geschuetzt) symbol += '🛡️';
  if (symbol) text(symbol, s.x, s.y - 52, 16, '#fff', 'center', false);
}

// ===== Animationen der Effekte =====
function zeichneEffekt(e, pos) {
  const k = e.max ? 1 - e.t / e.max : 0;   // Fortschritt: 0 = Anfang, 1 = Ende
  const { x, y } = pos;
  switch (e.art) {
    case 'plumps':
      ctx.globalAlpha = Math.min(1, e.t);
      text('💨', x, y - 10 - (0.8 - e.t) * 30, 34, '#fff', 'center', false);
      break;
    case 'schild': {
      ctx.globalAlpha = Math.min(1, e.t);
      ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 5;
      ellipse(x, y, 20 + k * 60, 16 + k * 50); ctx.stroke();
      text('🛡️', x, y - 20 - k * 30, 50, '#fff', 'center', false);
      text('GERETTET!', x, y + 34, 20, '#4ade80');
      break;
    }
    case 'schnuppern': {
      // Duftwolken schweben vom Schaf zur Nase
      const zu = spieler;
      for (let i = 0; i < 6; i++) {
        const f = (k - i * 0.07) / 0.5;
        if (f <= 0 || f >= 1) continue;
        const dx = zu.x - x, dy = zu.y - y, l = Math.hypot(dx, dy) || 1;
        const welle = Math.sin(f * Math.PI * 3 + i) * 12;
        const px = x + dx * f - dy / l * welle, py = y - 15 + (dy) * f + dx / l * welle;
        ctx.globalAlpha = Math.sin(f * Math.PI) * 0.9;
        ctx.fillStyle = e.wolf ? '#a3a36b' : '#9be89b';
        ellipse(px, py, 6, 6); ctx.fill();
        ellipse(px + 5, py - 4, 4, 4); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (k < 0.6) text('👃', zu.x + zu.richtung * 26, zu.y - 52 + Math.sin(zeit * 20) * 2, 22, '#fff', 'center', false);
      // Ergebnis springt hoch
      if (k > 0.5) {
        const pop = Math.min(1.3, (k - 0.5) / 0.1) - Math.max(0, Math.min(0.3, (k - 0.6) / 0.1 * 0.3));
        ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
        if (e.wolf) {
          ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 4;
          ellipse(x, y - 70, 26 * pop, 26 * pop); ctx.stroke();
        }
        text(e.wolf ? '🐺' : '✅', x, y - 70, 34 * pop, '#fff', 'center', false);
      }
      break;
    }
    case 'schildAuf': {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 6 * (1 - k) + 1;
      ellipse(x, y, 10 + k * 45, 8 + k * 40); ctx.stroke();
      ctx.globalAlpha = Math.min(1, (1 - k) * 2);
      text('🛡️', x, y - 45 - k * 25, 20 + k * 20, '#fff', 'center', false);
      break;
    }
    case 'werkzeug': {
      ctx.save();
      ctx.translate(x, y - 62);
      ctx.rotate(k * Math.PI * 4);
      ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      text('🔧', 0, 0, 30 + Math.sin(k * Math.PI) * 10, '#fff', 'center', false);
      ctx.restore();
      break;
    }
    case 'meckern': {
      // Schallwellen breiten sich aus
      for (let i = 0; i < 3; i++) {
        const kk = k * 1.4 - i * 0.2;
        if (kk <= 0 || kk >= 1) continue;
        ctx.globalAlpha = (1 - kk) * 0.7;
        ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 5;
        ellipse(x, y, 30 + kk * 190, 22 + kk * 150); ctx.stroke();
      }
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      const wackel = Math.sin(zeit * 60) * 3;
      text('MÄÄÄCK!', x + wackel, y - 62, 22 * Math.min(1, k * 6), '#ffb347');
      break;
    }
    case 'geist': {
      ctx.globalAlpha = 1 - k;
      text('👻', x + Math.sin(k * 10) * 10, y - 20 - k * 70, 40, '#fff', 'center', false);
      break;
    }
    case 'maske': {
      ctx.save();
      ctx.translate(x, y - 60);
      ctx.rotate(Math.sin(k * Math.PI * 3) * 0.6);
      const pop = Math.min(1.2, k * 5);
      ctx.scale(pop, pop);
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      text('🎭', 0, 0, 36, '#fff', 'center', false);
      ctx.restore();
      break;
    }
    case 'icon': {
      const kk = e.warte ? Math.max(0, (k - e.warte) / (1 - e.warte)) : k;
      if (kk <= 0) break;
      const pop = Math.min(1.25, kk * 8) - Math.max(0, Math.min(0.25, (kk - 0.15) * 2));
      ctx.globalAlpha = kk > 0.75 ? (1 - kk) / 0.25 : 1;
      text(e.text, x, y - 62 - kk * 12, 26 * pop, '#fff', 'center', false);
      break;
    }
    default: {   // HAPS!
      ctx.globalAlpha = Math.min(1, e.t);
      text('🐺', x, y - 20 - (1.2 - e.t) * 25, 60, '#fff', 'center', false);
      text('HAPS!', x, y + 30, 22, '#ff6b6b');
    }
  }
}

function zeichneWolle(w) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(w.x, w.y + 6, 26, 8); ctx.fill();
  const flocken = [[-14, 2, 8], [-3, -3, 10], [10, 1, 9], [3, 8, 7], [-10, 9, 6], [18, 8, 5]];
  for (const [fx, fy, r] of flocken) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(w.x + fx, w.y + fy, r + 2, r + 2); ctx.fill();
    ctx.fillStyle = w.opfer.farbe;
    ellipse(w.x + fx, w.y + fy, r, r); ctx.fill();
  }
  text('❗', w.x, w.y - 26 + Math.sin(zeit * 5) * 3, 22);
}

function dreieck(x1, y1, x2, y2, x3, y3) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill();
}

function zeichneOrt(o) {
  const { x, y } = o;
  const f = o.farben || [];
  switch (o.bild) {
    case 'stall':
      ctx.fillStyle = f[0] || '#c0392b'; ctx.fillRect(x - 80, y - 150, 160, 100);
      ctx.fillStyle = f[1] || '#7b241c'; dreieck(x - 95, y - 150, x + 95, y - 150, x, y - 210);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 22, y - 102, 44, 52);
      ctx.fillStyle = '#5d2e0c'; ctx.fillRect(x - 18, y - 98, 36, 48);
      ctx.fillStyle = '#f4d03f'; ctx.fillRect(x + 45, y - 30, 44, 28);
      ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 2; ctx.strokeRect(x + 45, y - 30, 44, 28);
      break;
    case 'muehle':
      ctx.fillStyle = '#e8d5b0';
      ctx.beginPath(); ctx.moveTo(x - 45, y - 50); ctx.lineTo(x + 45, y - 50); ctx.lineTo(x + 25, y - 190); ctx.lineTo(x - 25, y - 190); ctx.fill();
      ctx.fillStyle = '#6e4b2a'; ctx.fillRect(x - 12, y - 85, 24, 35);
      ctx.save(); ctx.translate(x, y - 180); ctx.rotate(zeit * 0.8);
      ctx.fillStyle = '#8d6e4c';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-6, 0, 12, 75); }
      ctx.restore();
      ctx.fillStyle = '#444'; ellipse(x, y - 180, 7, 7); ctx.fill();
      break;
    case 'teich':
      ctx.fillStyle = f[0] || '#2e86c1'; ellipse(x, y - 105, 150, 70); ctx.fill();
      ctx.fillStyle = f[1] || '#5dade2'; ellipse(x - 20, y - 115, 110, 45); ctx.fill();
      if (!o.farben) {
        ctx.fillStyle = '#27ae60';
        ellipse(x + 50, y - 120, 14, 9); ctx.fill();
        ellipse(x - 70, y - 90, 12, 8); ctx.fill();
      } else {
        ctx.fillStyle = '#2e5f7a'; ellipse(x + 10, y - 95, 30, 14); ctx.fill();   // Loch im Eis
      }
      break;
    case 'scheune':
      ctx.fillStyle = f[0] || '#8e3b2f'; ctx.fillRect(x - 110, y - 180, 220, 130);
      ctx.fillStyle = f[1] || '#5b231b'; dreieck(x - 125, y - 180, x + 125, y - 180, x, y - 240);
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, y - 130, 80, 80);
      ctx.strokeStyle = f[0] || '#8e3b2f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 36, y - 126); ctx.lineTo(x + 36, y - 54); ctx.moveTo(x + 36, y - 126); ctx.lineTo(x - 36, y - 54); ctx.stroke();
      break;
    case 'wiese':
      ctx.fillStyle = '#3d8b37'; ellipse(x, y - 80, 140, 45); ctx.fill();
      for (let i = 0; i < 30; i++) {
        const w = i * 2.4, r = 20 + (i * 37) % 100;
        ctx.fillStyle = ['#ff6fb5', '#ffd166', '#fff', '#c9a0ff'][i % 4];
        ellipse(x + Math.cos(w) * r * 1.2, y - 80 + Math.sin(w) * r * 0.35, 5, 5); ctx.fill();
      }
      text('🪣', x + 40, y - 10, 24, '#fff', 'center', false);
      break;
    case 'garten':
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 120, y - 180, 240, 120);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 7; k++) {
          const gx = x - 100 + k * 33, gy = y - 155 + r * 38;
          ctx.fillStyle = '#e67e22'; dreieck(gx - 5, gy, gx + 5, gy, gx, gy + 14);
          ctx.fillStyle = '#27ae60'; ctx.fillRect(gx - 4, gy - 7, 8, 7);
        }
      }
      ctx.strokeStyle = '#d4ac6e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 130, y - 50); ctx.lineTo(x - 20, y - 50); ctx.moveTo(x + 10, y - 40); ctx.lineTo(x + 130, y - 55); ctx.stroke();
      break;
    case 'krippe':
      ctx.fillStyle = '#6b4f3a';
      ctx.fillRect(x - 85, y - 150, 8, 100); ctx.fillRect(x + 77, y - 150, 8, 100);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 100, y - 160, 200, 18);   // Dach mit Schnee
      ctx.fillStyle = '#8d6e4c'; ctx.fillRect(x - 100, y - 145, 200, 6);
      ctx.fillStyle = '#8d6e4c'; ctx.fillRect(x - 65, y - 85, 130, 35);
      ctx.fillStyle = '#e9c46a'; ellipse(x, y - 88, 62, 12); ctx.fill();
      break;
    case 'iglu':
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y - 45, 95, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#c5d8e8'; ctx.lineWidth = 2;
      for (let r = 1; r < 4; r++) { ctx.beginPath(); ctx.arc(x, y - 45, 95, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 95, y - 45 - r * 25); ctx.lineTo(x + 95, y - 45 - r * 25); ctx.stroke(); }
      ctx.fillStyle = '#35556b';
      ctx.beginPath(); ctx.arc(x, y - 45, 30, Math.PI, 0); ctx.fill();
      break;
    case 'glashaus':
      ctx.fillStyle = '#3d8b37'; ctx.fillRect(x - 100, y - 100, 200, 40);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = ['#ff6fb5', '#ffd166', '#c9a0ff'][i % 3];
        ellipse(x - 85 + i * 15, y - 85 + (i % 2) * 12, 5, 5); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,240,255,0.45)';
      ctx.fillRect(x - 110, y - 190, 220, 130);
      dreieck(x - 120, y - 190, x + 120, y - 190, x, y - 210);
      ctx.strokeStyle = '#8fb3c7'; ctx.lineWidth = 3;
      ctx.strokeRect(x - 110, y - 190, 220, 130);
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 110 + i * 55, y - 190); ctx.lineTo(x - 110 + i * 55, y - 60); ctx.stroke(); }
      break;
    case 'brunnen':
      ctx.fillStyle = '#6e4b2a';
      ctx.fillRect(x - 55, y - 160, 8, 95); ctx.fillRect(x + 47, y - 160, 8, 95);
      ctx.fillStyle = '#c0392b'; dreieck(x - 70, y - 155, x + 70, y - 155, x, y - 195);
      ctx.fillStyle = '#9e9e9e'; ellipse(x, y - 65, 60, 26); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ellipse(x, y - 68, 45, 16); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y - 155); ctx.lineTo(x, y - 100); ctx.stroke();
      ctx.fillStyle = '#8d6e4c'; ctx.fillRect(x - 9, y - 105, 18, 14);
      break;
    case 'leuchtturm': {
      // Lichtstrahl
      ctx.save(); ctx.translate(x, y - 240); ctx.rotate(zeit);
      ctx.fillStyle = 'rgba(255,240,150,0.25)'; dreieck(0, 0, 420, -45, 420, 45);
      ctx.restore();
      for (let i = 0; i < 5; i++) {
        const y1 = y - 50 - i * 36, y2 = y1 - 36;
        const b1 = 38 - i * 3.5, b2 = 38 - (i + 1) * 3.5;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#e74c3c';
        ctx.beginPath(); ctx.moveTo(x - b1, y1); ctx.lineTo(x + b1, y1); ctx.lineTo(x + b2, y2); ctx.lineTo(x - b2, y2); ctx.fill();
      }
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x - 20, y - 258, 40, 28);
      ctx.fillStyle = '#c0392b'; dreieck(x - 26, y - 258, x + 26, y - 258, x, y - 282);
      break;
    }
    case 'boot':
      ctx.fillStyle = '#3a9ad9'; ellipse(x, y - 150, 160, 75); ctx.fill();
      ctx.fillStyle = '#a0703c'; ctx.fillRect(x - 35, y - 210, 70, 160);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 2;
      for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x - 35, y - 210 + i * 20); ctx.lineTo(x + 35, y - 210 + i * 20); ctx.stroke(); }
      ctx.fillStyle = '#8d4f2a';
      ctx.beginPath(); ctx.moveTo(x + 50, y - 180); ctx.lineTo(x + 130, y - 180); ctx.lineTo(x + 115, y - 150); ctx.lineTo(x + 62, y - 150); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 90, y - 180); ctx.lineTo(x + 90, y - 235); ctx.stroke();
      ctx.fillStyle = '#fff'; dreieck(x + 92, y - 232, x + 92, y - 185, x + 125, y - 190);
      break;
  }
  // Etwas Schnee auf Dächern im Winter
  if (KARTE.schnee && (o.bild === 'muehle')) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 27, y - 194, 54, 8); }
  text(o.name, x, y + o.labelY, 18, '#fff');
}

function zeichneTanne(t) {
  const { x, y, g } = t;
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ellipse(x, y + 4, 28 * g, 8 * g); ctx.fill();
  ctx.fillStyle = '#6b4f3a'; ctx.fillRect(x - 5 * g, y - 12 * g, 10 * g, 16 * g);
  for (let i = 0; i < 3; i++) {
    const unten = y - 8 * g - i * 24 * g, b = (60 - i * 14) * g, h = 36 * g;
    ctx.fillStyle = '#2f6b45'; dreieck(x - b / 2, unten, x + b / 2, unten, x, unten - h);
    ctx.fillStyle = '#fff'; dreieck(x - b * 0.15, unten - h * 0.7, x + b * 0.15, unten - h * 0.7, x, unten - h);
  }
}

function zeichnePalme(p) {
  const { x, y, g } = p;
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ellipse(x + 10 * g, y + 3, 30 * g, 8 * g); ctx.fill();
  ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 9 * g; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 18 * g, y - 50 * g, x + 6 * g, y - 100 * g); ctx.stroke();
  ctx.fillStyle = '#2e8b57';
  for (let k = 0; k < 6; k++) {
    ctx.save(); ctx.translate(x + 6 * g, y - 100 * g); ctx.rotate(-Math.PI + k * Math.PI / 5 + 0.1);
    ellipse(30 * g, 0, 32 * g, 9 * g); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#6b4226';
  ellipse(x + 2 * g, y - 94 * g, 6 * g, 6 * g); ctx.fill();
  ellipse(x + 12 * g, y - 92 * g, 6 * g, 6 * g); ctx.fill();
}

function zeichneLaterneUndGatter() {
  // Laterne
  const l = KARTE.laterne;
  const aus = sabotage && sabotage.art === 'nebel';
  if (!aus) {
    const g = ctx.createRadialGradient(l.x, l.y - 98, 5, l.x, l.y - 98, 70);
    g.addColorStop(0, 'rgba(255,230,120,0.6)'); g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g; ellipse(l.x, l.y - 98, 70, 70); ctx.fill();
  }
  ctx.fillStyle = '#333'; ctx.fillRect(l.x - 4, l.y - 85, 8, 85);
  ctx.fillStyle = aus ? '#555' : '#ffe680'; ctx.fillRect(l.x - 13, l.y - 112, 26, 28);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.strokeRect(l.x - 13, l.y - 112, 26, 28);
  text('Laterne', l.x, l.y - 130, 15);

  // Gatter
  const t = KARTE.gatter;
  const offen = sabotage && sabotage.art === 'gatter';
  ctx.fillStyle = '#6e4b2a';
  ctx.fillRect(t.x - 110, t.y - 60, 8, 60); ctx.fillRect(t.x + 102, t.y - 60, 8, 60);
  ctx.fillRect(t.x - 50, t.y - 75, 10, 75); ctx.fillRect(t.x + 40, t.y - 75, 10, 75);
  ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(t.x - 106, t.y - 45); ctx.lineTo(t.x - 45, t.y - 45); ctx.moveTo(t.x - 106, t.y - 20); ctx.lineTo(t.x - 45, t.y - 20);
  ctx.moveTo(t.x + 45, t.y - 45); ctx.lineTo(t.x + 106, t.y - 45); ctx.moveTo(t.x + 45, t.y - 20); ctx.lineTo(t.x + 106, t.y - 20);
  ctx.stroke();
  ctx.strokeStyle = offen ? '#c0392b' : '#a0703c';
  ctx.beginPath();
  if (offen) {   // Gatter schwingt auf
    ctx.moveTo(t.x - 40, t.y - 55); ctx.lineTo(t.x - 15, t.y + 20);
    ctx.moveTo(t.x - 40, t.y - 25); ctx.lineTo(t.x - 15, t.y + 45);
  } else {
    ctx.moveTo(t.x - 40, t.y - 55); ctx.lineTo(t.x + 40, t.y - 55);
    ctx.moveTo(t.x - 40, t.y - 25); ctx.lineTo(t.x + 40, t.y - 25);
    ctx.moveTo(t.x - 40, t.y - 55); ctx.lineTo(t.x + 40, t.y - 25);
  }
  ctx.stroke();
  text(offen ? 'Gatter (OFFEN!)' : 'Gatter', t.x, t.y - 95, 15, offen ? '#ff6b6b' : '#fff');
}

function zeichneWelt() {
  // Boden
  ctx.fillStyle = KARTE.boden;
  ctx.fillRect(0, 0, WELT_B, WELT_H);
  for (const d of deko) if (d.art === 'punkt') { ctx.fillStyle = d.f; ctx.fillRect(d.x, d.y, 3, 3); }
  // Wege
  ctx.strokeStyle = KARTE.weg; ctx.lineWidth = 34; ctx.lineCap = 'round';
  for (const o of ORTE) { ctx.beginPath(); ctx.moveTo(GLOCKE.x, GLOCKE.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
  ctx.fillStyle = KARTE.platz; ellipse(GLOCKE.x, GLOCKE.y, 150, 110); ctx.fill();
  // Rand: Zaun oder Meer
  if (KARTE.rand === 'meer') {
    ctx.strokeStyle = '#3a9ad9'; ctx.lineWidth = 80;
    ctx.strokeRect(0, 0, WELT_B, WELT_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
    const welle = Math.sin(zeit * 2) * 3;
    ctx.strokeRect(40 + welle, 40 + welle, WELT_B - 80 - welle * 2, WELT_H - 80 - welle * 2);
  } else {
    ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, WELT_B - 20, WELT_H - 20);
  }
  // Bäume
  for (const d of deko) {
    if (d.art === 'tannen') zeichneTanne(d);
    if (d.art === 'palmen') zeichnePalme(d);
  }
  // Gruben
  for (const g of KARTE.gruben) {
    ctx.fillStyle = '#6b4f3a'; ellipse(g.x, g.y, 40, 19); ctx.fill();
    ctx.fillStyle = '#140c06'; ellipse(g.x, g.y + 1, 32, 13); ctx.fill();
    ctx.fillStyle = '#8a8a8a';
    ellipse(g.x - 38, g.y + 6, 7, 5); ctx.fill(); ellipse(g.x + 36, g.y - 6, 6, 4); ctx.fill();
  }
  // Orte
  for (const o of ORTE) zeichneOrt(o);
  zeichneLaterneUndGatter();
  // Glocke
  ctx.fillStyle = '#6e4b2a'; ctx.fillRect(GLOCKE.x - 4, GLOCKE.y - 90, 8, 80);
  ctx.fillRect(GLOCKE.x - 30, GLOCKE.y - 92, 60, 8);
  ctx.fillStyle = glockeGenutzt ? '#999' : '#f1c40f';
  ctx.beginPath();
  ctx.moveTo(GLOCKE.x - 16, GLOCKE.y - 55);
  ctx.quadraticCurveTo(GLOCKE.x - 14, GLOCKE.y - 84, GLOCKE.x, GLOCKE.y - 84);
  ctx.quadraticCurveTo(GLOCKE.x + 14, GLOCKE.y - 84, GLOCKE.x + 16, GLOCKE.y - 55);
  ctx.fill();
  text('Glocke', GLOCKE.x, GLOCKE.y - 105, 16);
  // Deine Aufgaben-Markierungen
  for (const i of spieler.aufgaben) {
    const o = ORTE[i];
    const puls = 1 + Math.sin(zeit * 4) * 0.15;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
    ellipse(o.x, o.y, 30 * puls, 14 * puls); ctx.stroke();
    text('!', o.x, o.y - 40, 26, '#ffd166');
  }
}

function zeichneDunkel() {
  const sx = spieler.x - kamera.x, sy = spieler.y - kamera.y;
  const nebel = sabotage && sabotage.art === 'nebel';
  const farbe = nebel ? '90,95,110' : '10,15,40';
  const g = ctx.createRadialGradient(sx, sy, Math.max(10, sicht - 70), sx, sy, sicht + 10);
  g.addColorStop(0, `rgba(${farbe},0)`);
  g.addColorStop(1, `rgba(${farbe},${nebel ? 0.92 : 0.75})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Schnee, Pfeil zur Sabotage und roter Rand
function zeichneExtras() {
  if (KARTE.schnee) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const f of schneeflocken) {
      const x = (f.x + Math.sin(zeit + f.p) * 20 + W) % W;
      const y = (f.y + zeit * f.v) % H;
      ellipse(x, y, 2.5, 2.5); ctx.fill();
    }
  }
  if (!sabotage || zustand !== 'spiel') return;
  if (sabotage.art === 'gatter') {
    ctx.strokeStyle = `rgba(255,0,0,${0.35 + 0.3 * Math.sin(zeit * 8)})`;
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, W, H);
  }
  if (!spielerIstWolf) {
    const p = sabotagePunkt();
    const d = dist(p, spieler);
    if (d > 150) {
      const w = Math.atan2(p.y - spieler.y, p.x - spieler.x);
      const sx = spieler.x - kamera.x + Math.cos(w) * 75, sy = spieler.y - kamera.y + Math.sin(w) * 75;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(w);
      ctx.fillStyle = sabotage.art === 'gatter' ? '#ff4d4d' : '#ffe680';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
}

function zeichneHUD() {
  // Fortschritt der Herde
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(14, 12, 300, 60, 10); ctx.fill();
  text('Aufgaben der Herde', 26, 28, 14, '#fff', 'left', false);
  ctx.fillStyle = '#333'; ctx.fillRect(26, 42, 276, 18);
  ctx.fillStyle = '#4ade80'; ctx.fillRect(26, 42, 276 * fortschritt(), 18);

  if (spielerIstWolf) {
    ctx.fillStyle = 'rgba(70,10,20,0.85)';
    rundesRechteck(14, 80, 300, 96, 10); ctx.fill();
    text('🐺 Du bist der Wolf!', 26, 98, 16, '#ff6b6b', 'left', false);
    text('Friss die Schafe, bevor sie fertig sind!', 26, 122, 13, '#fff', 'left', false);
    if (spieler.cooldown > 0) text(`Fressen in ${Math.ceil(spieler.cooldown)} Sekunden ...`, 26, 150, 15, '#c9c3ff', 'left', false);
    else text('Fressen ist bereit! 😋', 26, 150, 15, '#4ade80', 'left', false);
  } else if (spieler.rolle === 'ziege') {
    ctx.fillStyle = 'rgba(120,70,10,0.85)';
    rundesRechteck(14, 80, 300, 96, 10); ctx.fill();
    text('🐐 Du bist die Ziege!', 26, 98, 16, '#ffb347', 'left', false);
    text('Lass dich beim Herden-Treffen verjagen!', 26, 122, 13, '#fff', 'left', false);
    text('Tipp: Benimm dich verdächtig! 😏', 26, 150, 14, '#ffd166', 'left', false);
  } else {
  // Deine Aufgaben
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(14, 80, 240, 30 + spieler.alleAufgaben.length * 22, 10); ctx.fill();
  text('Deine Aufgaben:', 26, 96, 14, '#ffd166', 'left', false);
  spieler.alleAufgaben.forEach((i, n) => {
    const fertig = !spieler.aufgaben.includes(i);
    text(`${fertig ? '✅' : '⬜'} ${ORTE[i].aufgabe}`, 26, 120 + n * 22, 13, fertig ? '#8f8' : '#fff', 'left', false);
  });
  }

  // Anzahl Schafe
  const lebend = schafe.filter(s => s.lebt).length;
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(W - 194, 12, 180, 36, 10); ctx.fill();
  text(`🐑 Noch ${lebend} Schafe`, W - 104, 30, 15, '#fff', 'center', false);

  // Sabotage-Knöpfe für den Wolf
  if (spielerIstWolf && zustand === 'spiel' && !miniSpiel) {
    const bereit = !sabotage && sabotagePause <= 0;
    [[SAB_NEBEL, '🌫️ Nebel [1]'], [SAB_GATTER, '🚪 Gatter [2]']].forEach(([r, t]) => {
      ctx.fillStyle = bereit ? (imRechteck(maus, r) ? '#ff8a8a' : 'rgba(200,40,60,0.9)') : 'rgba(80,60,70,0.8)';
      rundesRechteck(r.x, r.y, r.w, r.h, 10); ctx.fill();
      text(t, r.x + r.w / 2, r.y + r.h / 2, 15, bereit ? '#fff' : '#aaa', 'center', false);
    });
    if (!bereit && !sabotage) text(`Sabotage in ${Math.ceil(sabotagePause)} s`, W - 104, SAB_GATTER.y + 62, 13, '#c9c3ff', 'center', false);
  }

  // In der Grube
  if (spieler.inGrube != null && zustand === 'spiel') {
    ctx.fillStyle = 'rgba(20,12,6,0.9)';
    rundesRechteck(W / 2 - 200, H - 190, 400, 40, 10); ctx.fill();
    text('🕳️ Du bist in der Grube! ← → oder E', W / 2, H - 170, 16, '#fff', 'center', false);
    zeichneKnopf(GRUBE_LINKS, '◀ Grube', '#c9a27a');
    zeichneKnopf(GRUBE_RAUS, '⬆ Raus', '#ffd166');
    zeichneKnopf(GRUBE_RECHTS, 'Grube ▶', '#c9a27a');
  }

  // Deine Rolle (unten links)
  if (zustand === 'spiel' && !miniSpiel) {
    const r = ROLLEN[spieler.rolle];
    const a = rollenAktion();
    const bereit = a && spieler.faehigkeit <= 0 && a.moeglich;
    ctx.fillStyle = bereit ? (imRechteck(maus, ROLLE_KNOPF) ? '#8fd3ff' : 'rgba(40,110,170,0.9)') : 'rgba(20,20,50,0.85)';
    rundesRechteck(ROLLE_KNOPF.x, ROLLE_KNOPF.y, ROLLE_KNOPF.w, ROLLE_KNOPF.h, 10); ctx.fill();
    if (bereit) {   // Leuchtet, wenn die Fähigkeit bereit ist
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(zeit * 5) * 0.4})`; ctx.lineWidth = 3;
      rundesRechteck(ROLLE_KNOPF.x - 3, ROLLE_KNOPF.y - 3, ROLLE_KNOPF.w + 6, ROLLE_KNOPF.h + 6, 12); ctx.stroke();
    }
    text(`${r.emoji} ${r.name}`, ROLLE_KNOPF.x + 12, ROLLE_KNOPF.y + 16, 15, '#ffd166', 'left', false);
    let zeile;
    if (!a) zeile = r.text;
    else if (spieler.faehigkeit > 0) zeile = `${r.knopf} in ${Math.ceil(spieler.faehigkeit)} s`;
    else zeile = `[Q] ${a.text}`;
    text(zeile, ROLLE_KNOPF.x + 12, ROLLE_KNOPF.y + 37, a ? 14 : 11, bereit ? '#fff' : '#c9c3ff', 'left', false);
  }

  // Warnung bei Sabotage
  if (sabotage && zustand === 'spiel') {
    const blink = 0.75 + Math.sin(zeit * 6) * 0.25;
    ctx.fillStyle = `rgba(150,20,30,${0.85 * blink})`;
    rundesRechteck(W / 2 - 160, 12, 320, 52, 12); ctx.fill();
    if (sabotage.art === 'gatter') {
      text(spielerIstWolf ? '🚪 Gatter ist offen! 😈' : '🚪 Gatter offen! Schnell zumachen!', W / 2, 30, 16, '#fff', 'center', false);
      text(`Noch ${Math.ceil(sabotage.t)} Sekunden!`, W / 2, 52, 15, '#ffd166', 'center', false);
    } else {
      text(spielerIstWolf ? '🌫️ Nebel ist aktiv 😈' : '🌫️ Nebel! Mach die Laterne an!', W / 2, 30, 16, '#fff', 'center', false);
      text(`Noch ${Math.ceil(sabotage.t)} Sekunden`, W / 2, 52, 14, '#ddd', 'center', false);
    }
  }

  // Aktions-Knopf
  const a = zustand === 'spiel' && !miniSpiel ? moeglicheAktion() : null;
  if (a) {
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ellipse(W - 75, H - 75, 58, 58); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#1b1f3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const worte = a.text.split(' ');
    worte.forEach((w, i) => ctx.fillText(w, W - 75, H - 85 + i * 18 - (worte.length - 1) * 4));
    text('[E]', W - 75, H - 40, 12, '#1b1f3a', 'center', false);
  }

  if (nachricht) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    const b = ctx.measureText(nachricht.text).width + 40;
    ctx.fillStyle = 'rgba(20,20,50,0.9)';
    rundesRechteck(W / 2 - b / 2, H - 130, b, 44, 12); ctx.fill();
    text(nachricht.text, W / 2, H - 108, 18, '#fff', 'center', false);
  }
}

const GRUBE_LINKS = { x: W / 2 - 215, y: H - 140, w: 130, h: 44 };
const GRUBE_RAUS = { x: W / 2 - 65, y: H - 140, w: 130, h: 44 };
const GRUBE_RECHTS = { x: W / 2 + 85, y: H - 140, w: 130, h: 44 };
const ROLLE_KNOPF = { x: 14, y: H - 66, w: 300, h: 52 };
const SAB_NEBEL = { x: W - 194, y: 56, w: 180, h: 40 };
const SAB_GATTER = { x: W - 194, y: 102, w: 180, h: 40 };

function zeichneKnopf(r, beschriftung, farbe) {
  const hover = imRechteck(maus, r);
  ctx.fillStyle = hover ? '#fff' : farbe;
  rundesRechteck(r.x, r.y, r.w, r.h, 12); ctx.fill();
  text(beschriftung, r.x + r.w / 2, r.y + r.h / 2, 18, '#1b1f3a', 'center', false);
}

function zeichneTreffen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a2350';
  rundesRechteck(30, 20, 900, 560, 20); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke();

  text('🔔 Herden-Treffen!', W / 2, 55, 30, '#ffd166');
  text(treffen.grund, W / 2, 92, 17, '#fff', 'center', false);

  for (const k of kartenRechtecke()) {
    const s = k.s;
    const hover = treffen.phase === 'waehlen' && !s.istSpieler && imRechteck(maus, k);
    const istRaus = treffen.phase === 'ergebnis' && treffen.raus === s;
    ctx.fillStyle = hover ? '#4a3f8a' : '#3a3170';
    rundesRechteck(k.x, k.y, k.w, k.h, 12); ctx.fill();
    ctx.strokeStyle = istRaus ? '#ff4d4d' : (hover ? '#ffd166' : '#5a4fa0');
    ctx.lineWidth = istRaus ? 5 : 2; ctx.stroke();

    zeichneSchafKoerper(k.x + 32, k.y + 34, s.farbe, 1, 0, false, 0.8);
    text(s.name, k.x + 62, k.y + 30, 17, s.istSpieler ? '#ffd166' : '#fff', 'left', false);
    umbrechen(treffen.aussagen.get(s) || '', k.x + 10, k.y + 62, k.w - 20, 17, 13, '#ddd8ff');

    // Wer hat für dieses Schaf gestimmt?
    if (treffen.phase === 'ergebnis') {
      let n = 0;
      for (const [waehler, ziel] of treffen.stimmen) {
        if (ziel === s) {
          ctx.fillStyle = waehler.farbe;
          ellipse(k.x + k.w - 14 - n * 16, k.y + 16, 7, 7); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
          n++;
        }
      }
      if (istRaus) text('RAUS!', k.x + k.w - 40, k.y + k.h - 18, 18, '#ff4d4d');
    }
  }

  if (treffen.phase === 'waehlen') {
    text('Klicke auf das Schaf, das du für den Wolf hältst!', W / 2, 432, 15, '#ffd166', 'center', false);
    zeichneKnopf(SKIP_KNOPF, 'Überspringen ⏭', '#c9c3ff');
  } else {
    text(treffen.ergebnis, W / 2, 462, 20, '#fff');
    text(`(${treffen.skip} haben übersprungen)`, W / 2, 490, 13, '#c9c3ff', 'center', false);
    zeichneKnopf(WEITER_KNOPF, 'Weiter ▶', '#ffd166');
  }
}

function zeichneEnde() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  let titel;
  if (ende.sieger === 'ziege') titel = spieler.rolle === 'ziege' ? '🐐 Du hast gewonnen, Ziege! 🐐' : '🐐 Die Ziege gewinnt! 🐐';
  else if (spieler.rolle === 'ziege') titel = '🐐 Schade, Ziege!';
  else if (spielerIstWolf) titel = ende.gewonnen ? '😈 Du hast gewonnen, Wolf! 😈' : '🐑 Die Schafe haben gewonnen!';
  else titel = ende.gewonnen ? '🎉 Die Schafe gewinnen! 🎉' : '🐺 Der Wolf gewinnt! 🐺';
  text(titel, W / 2, 150, 44, ende.gewonnen ? '#4ade80' : '#ff6b6b');
  text(ende.grund, W / 2, 215, 20, '#fff');
  text(spielerIstWolf ? 'Der Wolf warst: DU! 😈' : `Der Wolf war: ${wolf.name}`, W / 2, 300, 24, '#ffd166');
  zeichneSchafKoerper(W / 2 - 40, 370, wolf.farbe, 1, 0, false, 1.6);
  text('🐺', W / 2 + 50, 360, 56, '#fff', 'center', false);
  if (zeit - ende.seit > 1) {
    text('Enter: Nochmal auf dieser Karte', W / 2, 470, 20, '#c9c3ff', 'center', false);
    text('Klick: Zurück zur Karten-Auswahl', W / 2, 502, 18, '#c9c3ff', 'center', false);
  }
}

// ===== Intro: Wer bist du? =====
function zeichneIntro() {
  const t = intro;
  // Dunkler Hintergrund mit Scheinwerfer
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  const licht = ctx.createRadialGradient(W / 2, 380, 20, W / 2, 380, 420);
  const lf = spielerIstWolf ? '255,60,60' : (spieler.rolle === 'ziege' ? '255,170,60' : '111,227,255');
  licht.addColorStop(0, `rgba(${lf},${Math.min(0.35, t * 0.15)})`);
  licht.addColorStop(1, `rgba(${lf},0)`);
  ctx.fillStyle = licht;
  ctx.fillRect(0, 0, W, H);

  // 1. "Du bist ..."
  ctx.globalAlpha = Math.min(1, t / 0.8);
  text('Du bist ...', W / 2, t < 1.5 ? H / 2 - 40 : 70, 34, '#c9c3ff', 'center', false);
  ctx.globalAlpha = 1;

  // 2. "EIN SCHAF!" springt rein
  if (t > 1.5) {
    const k = Math.min(1, (t - 1.5) / 0.4);
    const pop = k < 1 ? k * 1.3 : 1 + Math.sin(zeit * 3) * 0.03;
    ctx.save();
    ctx.translate(W / 2, 140);
    ctx.scale(pop, pop);
    if (spieler.rolle === 'ziege') text('🐐 DIE ZIEGE! 🐐', 0, 0, 64, '#ffb347');
    else if (spielerIstWolf) text('🐺 DER WOLF! 🐺', 0, 0, 64, '#ff4d4d');
    else text('🐑 EIN SCHAF! 🐑', 0, 0, 64, '#6fe3ff');
    ctx.restore();
  }

  // Deine Rolle
  if (t > 2.0) {
    ctx.globalAlpha = Math.min(1, (t - 2.0) / 0.5);
    const r = ROLLEN[spieler.rolle];
    text(`Deine Rolle: ${r.emoji} ${r.name}`, W / 2, 200, 26, '#ffd166');
    text(r.text, W / 2, 232, 16, '#ddd', 'center', false);
    ctx.globalAlpha = 1;
  }

  // 3. Die Herde taucht auf, du stehst vorne in der Mitte
  if (t > 2.4) {
    const andere = schafe.filter(s => !s.istSpieler);
    andere.forEach((s, i) => {
      const k = Math.min(1, Math.max(0, (t - 2.4 - i * 0.12) / 0.4));
      if (k <= 0) return;
      ctx.globalAlpha = k * 0.85;
      const seite = i < 4 ? -1 : 1;
      const nr = i < 4 ? i : i - 4;
      const x = W / 2 + seite * (150 + nr * 85);
      const y = 330 + nr * 12 - (1 - k) * 20;
      zeichneSchafKoerper(x, y, s.farbe, -seite, 0, false, 1.3);
      text(s.name, x, y - 45, 14, '#fff', 'center', false);
    });
    ctx.globalAlpha = 1;
    const hopp = Math.abs(Math.sin(zeit * 4)) * 8;
    zeichneSchafKoerper(W / 2, 360 - hopp, spieler.farbe, 1, 0, false, 2.4);
    text(spielerIstWolf ? 'DU 😈' : (spieler.rolle === 'ziege' ? 'DU 🐐' : 'DU'), W / 2, 290 - hopp, 22, '#ffd166');
  }

  // 4. Die Warnung
  if (t > 3.8) {
    ctx.globalAlpha = Math.min(1, (t - 3.8) / 0.6);
    const blink = 0.6 + Math.sin(zeit * 6) * 0.4;
    if (spieler.rolle === 'ziege') {
      text('Du gehörst zu niemandem! Lass dich beim Herden-Treffen verjagen!', W / 2, 455, 20, '#fff', 'center', false);
      ctx.globalAlpha *= blink;
      text('😏 Benimm dich verdächtig, aber nicht zu sehr!', W / 2, 495, 20, '#ffb347');
    } else if (spielerIstWolf) {
      text('Friss die Schafe, wenn sie allein sind. Psst, niemand darf es sehen!', W / 2, 455, 20, '#fff', 'center', false);
      ctx.globalAlpha *= blink;
      text('🤫 Lass dich beim Herden-Treffen nicht erwischen!', W / 2, 495, 20, '#ff6b6b');
    } else {
      text('Erledige deine Aufgaben und finde den Wolf!', W / 2, 455, 22, '#fff', 'center', false);
      ctx.globalAlpha *= blink;
      text('⚠️ Achtung: Einer von ihnen ist ein Wolf im Schafspelz! 🐺', W / 2, 495, 20, '#ff6b6b');
    }
    ctx.globalAlpha = 1;
  }

  if (t > 4.8) text('Klicke oder drücke Enter zum Losspielen!', W / 2, 560, 17, '#4ade80', 'center', false);
}

function titelKarten() {
  const b = 250, h = 120, abstand = 25;
  const x0 = (W - KARTEN.length * b - (KARTEN.length - 1) * abstand) / 2;
  return KARTEN.map((k, i) => ({ nr: i, x: x0 + i * (b + abstand), y: 400, w: b, h }));
}
function titelKarteBei(p) {
  const r = titelKarten().find(r => imRechteck(p, r));
  return r ? r.nr : null;
}
function starteMitKarte(nr) {
  kartenNr = nr;
  try { localStorage.setItem('schafspelz-karte', String(nr)); } catch (e) { /* egal */ }
  neuesSpiel();
}

function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1f3a'); g.addColorStop(1, '#3d8b37');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  text('🐺 Wolf im Schafspelz 🐑', W / 2, 50, 44, '#ffd166');
  for (let i = 0; i < 7; i++) {
    const x = 180 + i * 100, y = 118 + Math.sin(zeit * 3 + i) * 6;
    zeichneSchafKoerper(x, y, FARBEN[i], i % 2 ? -1 : 1, zeit * 6 + i, true);
  }
  const zeilen = [
    'Eines der Schafe ist ein Wolf! Und manchmal ... bist DU der Wolf! 😈',
    '🟡  Erledige deine Aufgaben: kleine Mini-Spiele bei den gelben !',
    '🧶  Findest du Wolle von einem gefressenen Schaf? Melde sie!',
    '🔔  Beim Herden-Treffen stimmt ihr ab, wer der Wolf ist.',
    '🎭  Jeder bekommt eine Rolle (Taste Q). Und manchmal gibt es eine 🐐 Ziege!',
    '🌫️  Der Wolf kann sabotieren und durch 🕳️ Gruben schleichen!',
    '⌨️  Laufen: Pfeiltasten / WASD  •  Aktion: E  •  Sabotage: 1 / 2  •  Ton: M',
  ];
  zeilen.forEach((z, i) => text(z, W / 2, 168 + i * 27, 16, i === 0 ? '#ffd166' : '#fff', 'center', false));

  text('Wähle eine Karte:', W / 2, 377, 20, '#ffd166', 'center', false);
  for (const r of titelKarten()) {
    const k = KARTEN[r.nr];
    const gewaehlt = r.nr === kartenNr;
    const hover = imRechteck(maus, r);
    ctx.fillStyle = k.boden;
    rundesRechteck(r.x, r.y, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = gewaehlt ? '#ffd166' : (hover ? '#fff' : 'rgba(0,0,0,0.3)');
    ctx.lineWidth = gewaehlt ? 6 : 3; ctx.stroke();
    const hopp = gewaehlt ? Math.sin(zeit * 5) * 4 : 0;
    text(k.emoji, r.x + r.w / 2, r.y + 45 + hopp, 44, '#fff', 'center', false);
    text(k.name, r.x + r.w / 2, r.y + 95, 22, '#fff');
  }
  const puls = 1 + Math.sin(zeit * 4) * 0.04;
  ctx.save(); ctx.translate(W / 2, 562); ctx.scale(puls, puls);
  text('Klicke auf eine Karte!  (oder ← → und Enter)', 0, 0, 20, '#4ade80');
  ctx.restore();
  if (ENTWICKLER) {
    const test = entwicklerRolle();
    text(`🛠️ Entwickler-Modus${test ? ' • Rolle: ' + test : ''}`, 12, H - 14, 13, '#ffb347', 'left', false);
  }
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  if (zustand === 'intro') { zeichneIntro(); return; }
  if (zustand === 'cutscene') { zeichneCutscene(); return; }

  kamera.x = begrenzt(spieler.x - W / 2, 0, WELT_B - W);
  kamera.y = begrenzt(spieler.y - H / 2, 0, WELT_H - H);
  const sichtbar = p => dist(p, spieler) < sicht + 20;

  ctx.save();
  ctx.translate(-kamera.x, -kamera.y);
  zeichneWelt();
  for (const w of wolle) if (sichtbar(w)) zeichneWolle(w);
  const zuSehen = schafe.filter(s => s.lebt && (s.istSpieler || sichtbar(s))).sort((a, b) => a.y - b.y);
  for (const s of zuSehen) zeichneSchaf(s);
  // Partikel
  for (const p of partikel) {
    if (!sichtbar(p)) continue;
    const a = p.t / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.farbe;
    ellipse(p.x, p.y, p.groesse * (0.4 + a * 0.6), p.groesse * (0.4 + a * 0.6)); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Effekte
  for (const e of effekte) {
    const pos = e.ziel || e;
    if (!sichtbar(pos)) continue;
    zeichneEffekt(e, pos);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  zeichneDunkel();
  zeichneExtras();
  zeichneHUD();
  if (zustand === 'spiel' && miniSpiel) zeichneMiniSpiel();
  if (zustand === 'treffen') zeichneTreffen();
  if (zustand === 'ende') zeichneEnde();
}

// ===== Eingabe =====
addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  tasten[k] = true;
  if (k === 'm' && !e.repeat) { tonAn = !tonAn; zeigeNachricht(tonAn ? '🔊 Ton an' : '🔇 Ton aus', 1.5); }
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (zustand === 'titel' && (k === 'arrowleft' || k === 'arrowright')) kartenNr = (kartenNr + (k === 'arrowright' ? 1 : KARTEN.length - 1)) % KARTEN.length;
  else if (zustand === 'titel' && (k === 'enter' || k === ' ')) starteMitKarte(kartenNr);
  else if (zustand === 'intro' && (k === 'enter' || k === ' ') && intro > 1.5) introFertig();
  else if (zustand === 'cutscene' && (k === 'enter' || k === ' ') && cutscene.t > 1) endeCutscene();
  else if (zustand === 'spiel' && !miniSpiel && k === 'q') nutzeFaehigkeit();
  else if (zustand === 'ende' && (k === 'enter' || k === ' ') && zeit - ende.seit > 1) neuesSpiel();
  else if (zustand === 'spiel' && spieler.inGrube != null && ['arrowleft', 'a', 'arrowright', 'd', 'e', ' '].includes(k)) grubenTaste(k);
  else if (zustand === 'spiel' && miniSpiel) miniTaste(k);
  else if (zustand === 'spiel' && (k === 'e' || k === ' ')) aktion();
  else if (zustand === 'spiel' && spielerIstWolf && (k === '1' || k === '2')) wolfSabotage(k === '1' ? 'nebel' : 'gatter');
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  tasten[k] = false;
  if (miniSpiel && miniSpiel.art === 'eimer' && (k === ' ' || k === 'e')) miniLos();
});
addEventListener('blur', () => { for (const k in tasten) tasten[k] = false; });

function punkt(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', e => {
  tonStart();
  const p = punkt(e);
  maus = p;
  if (zustand === 'titel') { const nr = titelKarteBei(p); if (nr !== null) starteMitKarte(nr); return; }
  if (zustand === 'intro') { if (intro > 1.5) introFertig(); return; }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) zustand = 'titel'; return; }
  if (zustand === 'cutscene') { if (cutscene.t > 1) endeCutscene(); return; }
  if (zustand === 'treffen') { klickTreffen(p); return; }
  if (zustand === 'spiel' && miniSpiel) { miniDruck(p); return; }
  if (zustand === 'spiel') {
    if (imRechteck(p, ROLLE_KNOPF)) { nutzeFaehigkeit(); return; }
    if (spielerIstWolf && imRechteck(p, SAB_NEBEL)) { wolfSabotage('nebel'); return; }
    if (spielerIstWolf && imRechteck(p, SAB_GATTER)) { wolfSabotage('gatter'); return; }
    if (spieler.inGrube != null) { grubenKlick(p); return; }
    if (moeglicheAktion() && dist(p, { x: W - 75, y: H - 75 }) < 60) { aktion(); return; }
    klickZiel = { x: p.x + kamera.x, y: p.y + kamera.y };
  }
});
canvas.addEventListener('pointermove', e => {
  maus = punkt(e);
  if (miniSpiel) { miniBewegt(maus); return; }
  if (e.buttons && zustand === 'spiel' && klickZiel) {
    klickZiel = { x: maus.x + kamera.x, y: maus.y + kamera.y };
  }
});

addEventListener('pointerup', () => { if (miniSpiel) miniLos(); });

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
