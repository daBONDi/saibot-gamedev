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
const SPIELER_WOLF_PAUSE = 12;        // Sekunden zwischen zwei Angriffen, wenn du der Wolf bist

const ORTE = [
  { name: 'Stall',        bei: 'beim Stall',         x: 320,  y: 300,  aufgabe: 'Heu fressen',     labelY: -225, spiel: 'heu' },
  { name: 'Mühle',        bei: 'bei der Mühle',      x: 900,  y: 300,  aufgabe: 'Korn mahlen',     labelY: -265, spiel: 'kurbel' },
  { name: 'Teich',        bei: 'beim Teich',         x: 1480, y: 320,  aufgabe: 'Wasser trinken',  labelY: -195, spiel: 'eimer' },
  { name: 'Scheune',      bei: 'bei der Scheune',    x: 320,  y: 1080, aufgabe: 'Wolle abgeben',   labelY: -215, spiel: 'wolle' },
  { name: 'Blumenwiese',  bei: 'auf der Blumenwiese', x: 900, y: 1120, aufgabe: 'Blumen gießen',   labelY: -145, spiel: 'blumen' },
  { name: 'Gemüsegarten', bei: 'im Gemüsegarten',    x: 1480, y: 1080, aufgabe: 'Zaun reparieren', labelY: -200, spiel: 'zaun' },
];
const GLOCKE = { name: 'Glocke', bei: 'bei der Glocke', x: 900, y: 680 };

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
let kamera = { x: 0, y: 0 };
let klickZiel = null;
let maus = { x: 0, y: 0 };
let zeit = 0;
const tasten = {};

// Blumen auf der Wiese (einmal zufällig verteilt)
const blumen = [];
for (let i = 0; i < 220; i++) {
  blumen.push({ x: Math.random() * WELT_B, y: Math.random() * WELT_H, f: zufall(['#fff', '#ffe066', '#ff9ecf', '#c9a0ff']) });
}

function macheSchaf(name, farbe, istSpieler) {
  return {
    name, farbe, istSpieler, istWolf: false, lebt: true,
    x: 0, y: 0, richtung: 1, phase: 0, laeuft: false,
    aufgaben: [], alleAufgaben: [], gesamt: 0, erledigt: 0,
    ziel: null, warte: 0, amOrt: null, letzterOrt: GLOCKE,
    verdacht: null, cooldown: 0, jagt: null,
    aufgabeAktiv: null, aufgabeT: 0,
  };
}

function neuesSpiel() {
  schafe = []; wolle = []; effekte = [];
  treffen = null; ende = null; klickZiel = null; miniSpiel = null;
  glockeGenutzt = false;

  // Bist du diesmal ein Schaf oder der Wolf?
  spielerIstWolf = Math.random() < WOLF_CHANCE;

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

function beende(sieger, grund) {   // sieger: 'schafe' oder 'wolf'
  zustand = 'ende';
  miniSpiel = null;
  ende = { gewonnen: (sieger === 'wolf') === spielerIstWolf, grund, seit: zeit };
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
  if (miniSpiel) { spieler.laeuft = false; return; }   // Beim Mini-Spiel steht man still
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
    spieler.x += dx / laenge * TEMPO_SPIELER * dt;
    spieler.y += dy / laenge * TEMPO_SPIELER * dt;
    if (dx) spieler.richtung = Math.sign(dx);
    spieler.phase += dt * 12;
  }
  spieler.x = begrenzt(spieler.x, 30, WELT_B - 30);
  spieler.y = begrenzt(spieler.y, 40, WELT_H - 30);

}

function bewegeBot(s, dt) {
  if (s.jagt) return;   // Der jagende Wolf wird in wolfLogik bewegt

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

  if (!s.ziel) {
    const ortNr = (s.aufgaben.length && Math.random() < 0.6)
      ? zufall(s.aufgaben)
      : Math.floor(Math.random() * ORTE.length);
    const o = ORTE[ortNr];
    s.ziel = { x: o.x + (Math.random() - 0.5) * 60, y: o.y + (Math.random() - 0.5) * 40, ort: ortNr };
  }
  if (laufeZu(s, s.ziel, TEMPO_SCHAF, dt)) {
    s.amOrt = s.ziel.ort;
    s.letzterOrt = ORTE[s.ziel.ort];
    s.warte = 3 + Math.random() * 3;
    s.ziel = null;
  }
}

// ===== Der Wolf =====
function istAllein(ziel) {
  return !schafe.some(s => s.lebt && s !== ziel && s !== wolf && dist(s, ziel) < 230);
}

function wolfLogik(dt) {
  wolf.cooldown -= dt;
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
  opfer.lebt = false;
  opfer.erledigt = opfer.gesamt;
  opfer.aufgaben = [];
  opfer.aufgabeAktiv = null;
  wolf.jagt = null; wolf.ziel = null;
  wolf.cooldown = spielerIstWolf ? SPIELER_WOLF_PAUSE : WOLF_PAUSE + Math.random() * 8;

  const ort = naechsterOrt(opfer);
  wolle.push({ x: opfer.x, y: opfer.y, opfer, ort });
  effekte.push({ x: opfer.x, y: opfer.y, t: 1.2 });
  if (spielerIstWolf || dist(opfer, spieler) < SICHT + 20) sound.haps();

  // Wer in der Nähe war, hat etwas gesehen!
  const zeugen = [];
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf) continue;
    const d = dist(s, wolf);
    if (d < 230 || (d < 420 && Math.random() < 0.6)) {
      s.verdacht = { wer: wolf, ort };
      zeugen.push(s);
    }
  }
  if (spielerIstWolf) {
    zeigeNachricht(zeugen.length
      ? `👀 Oh nein! ${zeugen.map(z => z.name).join(', ')} hat dich gesehen!`
      : 'HAPS! 😋 Niemand hat dich gesehen.', 3);
  }

  if (opfer.istSpieler) { beende('wolf', 'Der Wolf hat dich erwischt!'); return; }
  pruefeWolfSieg();
}

function pruefeWolfSieg() {
  const uebrig = schafe.filter(s => s.lebt && !s.istWolf).length;
  if (uebrig <= 1) { beende('wolf', spielerIstWolf ? 'Du hast fast alle Schafe gefressen! 😋' : 'Der Wolf hat zu viele Schafe gefressen!'); return true; }
  return false;
}

// ===== Aktion (E / Leertaste / Knopf) =====
function moeglicheAktion() {
  if (spielerIstWolf && spieler.cooldown <= 0) {
    const opfer = schafe.find(s => s.lebt && !s.istSpieler && dist(s, spieler) < 50);
    if (opfer) return { text: 'Fressen!', tun: () => fressen(opfer) };
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
  if (fund) sound.wolle(); else sound.glocke();
  const lebende = schafe.filter(s => s.lebt);
  const aussagen = new Map();
  const anklaeger = [];

  for (const s of lebende) {
    if (s.istSpieler) {
      aussagen.set(s, spielerIstWolf ? 'Das bist du (der Wolf 🤫). Wen willst du verdächtigen?' : 'Das bist du! Wen hältst du für den Wolf?');
      continue;
    }
    const teile = [];
    if (s === melder && fund) teile.push(`Ich hab Wolle von ${fund.opfer.name} ${fund.ort.bei} gefunden! 😱`);
    if (!s.istWolf && s.verdacht && s.verdacht.wer.lebt) {
      teile.push(s.verdacht.wer.istSpieler
        ? `Ich hab gesehen, wie DU dich ${s.verdacht.ort.bei} an jemanden rangeschlichen hast! 😨`
        : `Ich hab gesehen, wie ${s.verdacht.wer.name} sich ${s.verdacht.ort.bei} an jemanden rangeschlichen hat! 😨`);
      anklaeger.push(s);
    }
    if (!teile.length) {
      let ort = s.letzterOrt;
      // Der Wolf schwindelt oft!
      if (s.istWolf && Math.random() < 0.6) ort = zufall([...ORTE, GLOCKE].filter(o => o !== s.letzterOrt));
      teile.push(zufall([`Ich war ${ort.bei}.`, `Ich war gerade ${ort.bei}, ehrlich!`, `Ich hab ${ort.bei} gearbeitet.`]));
    }
    aussagen.set(s, teile.join(' '));
  }

  if (wolf.lebt && !wolf.istSpieler && anklaeger.length) {
    const ort = zufall([...ORTE, GLOCKE]);
    aussagen.set(wolf, `Was?! ${anklaeger[0].name} lügt! Ich war die ganze Zeit ${ort.bei}! 😤`);
  }

  let grund;
  if (!fund) grund = 'Du hast die Glocke geläutet!';
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
      if (t.anklaeger.length) ziel = zufall(t.anklaeger);
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
  if (!raus) sound.hmm(); else if (raus.istWolf) sound.fanfare(); else sound.traurig();
  if (!raus) t.ergebnis = 'Niemand wurde vom Hof gejagt. 🤷';
  else if (raus.istSpieler && raus.istWolf) t.ergebnis = 'Die Herde hat DICH vom Hof gejagt ... du WARST der Wolf! 😱';
  else if (raus.istWolf) t.ergebnis = `${raus.name} wurde vom Hof gejagt ... und WAR der Wolf! 🐺🎉`;
  else if (raus.istSpieler) t.ergebnis = 'Die Herde hat DICH vom Hof gejagt! 😢';
  else t.ergebnis = `${raus.name} wurde vom Hof gejagt ... war aber KEIN Wolf. ${spielerIstWolf ? '😈' : '😢'}`;
}

function treffenWeiter() {
  const raus = treffen.raus;
  treffen = null;
  if (raus) {
    raus.lebt = false;
    raus.erledigt = raus.gesamt;
    raus.aufgaben = [];
    if (raus.istWolf) { beende('schafe', spielerIstWolf ? 'Die Herde hat dich durchschaut!' : 'Ihr habt den Wolf erwischt!'); return; }
    if (raus.istSpieler) { beende('wolf', 'Die Herde hat dich rausgeworfen, obwohl du ein echtes Schaf bist!'); return; }
    if (pruefeWolfSieg()) return;
  }
  for (const s of schafe) s.verdacht = null;
  wolf.cooldown = 15;
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
    treffenWeiter();
  }
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
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  if (zustand === 'intro') {
    const vorher = intro;
    intro += dt;
    if (vorher < 0.2 && intro >= 0.2) sound.spannung();
    if (vorher < 1.5 && intro >= 1.5) { if (spielerIstWolf) sound.wolf(); else sound.schaf(); }
    if (intro > 8) introFertig();
    return;
  }
  if (zustand !== 'spiel') return;

  if (miniSpiel) miniUpdate(dt);
  bewegeSpieler(dt);
  for (const s of schafe) if (!s.istSpieler && s.lebt) bewegeBot(s, dt);
  if (spielerIstWolf) wolf.cooldown -= dt;
  else if (wolf.lebt) wolfLogik(dt);
  if (zustand !== 'spiel') return;

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
  zeichneSchafKoerper(s.x, s.y, s.farbe, s.richtung, s.phase, s.laeuft);
  text(s.name, s.x, s.y - 32, 13, s.istSpieler ? '#ffd166' : '#fff');
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

function zeichneOrt(o) {
  const { x, y } = o;
  switch (o.name) {
    case 'Stall':
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 80, y - 150, 160, 100);
      ctx.fillStyle = '#7b241c';
      ctx.beginPath(); ctx.moveTo(x - 95, y - 150); ctx.lineTo(x + 95, y - 150); ctx.lineTo(x, y - 210); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 22, y - 102, 44, 52);
      ctx.fillStyle = '#5d2e0c'; ctx.fillRect(x - 18, y - 98, 36, 48);
      ctx.fillStyle = '#f4d03f'; ctx.fillRect(x + 45, y - 30, 44, 28);
      ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 2; ctx.strokeRect(x + 45, y - 30, 44, 28);
      break;
    case 'Mühle': {
      ctx.fillStyle = '#e8d5b0';
      ctx.beginPath(); ctx.moveTo(x - 45, y - 50); ctx.lineTo(x + 45, y - 50); ctx.lineTo(x + 25, y - 190); ctx.lineTo(x - 25, y - 190); ctx.fill();
      ctx.fillStyle = '#6e4b2a'; ctx.fillRect(x - 12, y - 85, 24, 35);
      ctx.save(); ctx.translate(x, y - 180); ctx.rotate(zeit * 0.8);
      ctx.fillStyle = '#8d6e4c';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-6, 0, 12, 75); }
      ctx.restore();
      ctx.fillStyle = '#444'; ellipse(x, y - 180, 7, 7); ctx.fill();
      break;
    }
    case 'Teich':
      ctx.fillStyle = '#2e86c1'; ellipse(x, y - 105, 150, 70); ctx.fill();
      ctx.fillStyle = '#5dade2'; ellipse(x - 20, y - 115, 110, 45); ctx.fill();
      ctx.fillStyle = '#27ae60';
      ellipse(x + 50, y - 120, 14, 9); ctx.fill();
      ellipse(x - 70, y - 90, 12, 8); ctx.fill();
      break;
    case 'Scheune':
      ctx.fillStyle = '#8e3b2f'; ctx.fillRect(x - 110, y - 180, 220, 130);
      ctx.fillStyle = '#5b231b';
      ctx.beginPath(); ctx.moveTo(x - 125, y - 180); ctx.lineTo(x + 125, y - 180); ctx.lineTo(x, y - 240); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, y - 130, 80, 80);
      ctx.strokeStyle = '#8e3b2f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 36, y - 126); ctx.lineTo(x + 36, y - 54); ctx.moveTo(x + 36, y - 126); ctx.lineTo(x - 36, y - 54); ctx.stroke();
      break;
    case 'Blumenwiese':
      ctx.fillStyle = '#3d8b37'; ellipse(x, y - 80, 140, 45); ctx.fill();
      for (let i = 0; i < 30; i++) {
        const w = i * 2.4, r = 20 + (i * 37) % 100;
        ctx.fillStyle = ['#ff6fb5', '#ffd166', '#fff', '#c9a0ff'][i % 4];
        ellipse(x + Math.cos(w) * r * 1.2, y - 80 + Math.sin(w) * r * 0.35, 5, 5); ctx.fill();
      }
      text('🪣', x + 40, y - 10, 24, '#fff', 'center', false);
      break;
    case 'Gemüsegarten':
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 120, y - 180, 240, 120);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 7; k++) {
          const gx = x - 100 + k * 33, gy = y - 155 + r * 38;
          ctx.fillStyle = '#e67e22';
          ctx.beginPath(); ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 14); ctx.fill();
          ctx.fillStyle = '#27ae60'; ctx.fillRect(gx - 4, gy - 7, 8, 7);
        }
      }
      ctx.strokeStyle = '#d4ac6e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 130, y - 50); ctx.lineTo(x - 20, y - 50); ctx.moveTo(x + 10, y - 40); ctx.lineTo(x + 130, y - 55); ctx.stroke();
      break;
  }
  text(o.name, x, y + o.labelY, 18, '#fff');
}

function zeichneWelt() {
  // Gras
  ctx.fillStyle = '#6abf4b';
  ctx.fillRect(0, 0, WELT_B, WELT_H);
  for (const b of blumen) { ctx.fillStyle = b.f; ctx.fillRect(b.x, b.y, 3, 3); }
  // Wege
  ctx.strokeStyle = '#c8a96b'; ctx.lineWidth = 34; ctx.lineCap = 'round';
  for (const o of ORTE) { ctx.beginPath(); ctx.moveTo(GLOCKE.x, GLOCKE.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
  ctx.fillStyle = '#d6bb82'; ellipse(GLOCKE.x, GLOCKE.y, 150, 110); ctx.fill();
  // Zaun rundherum
  ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, WELT_B - 20, WELT_H - 20);
  // Orte
  for (const o of ORTE) zeichneOrt(o);
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
  const g = ctx.createRadialGradient(sx, sy, SICHT - 70, sx, sy, SICHT + 10);
  g.addColorStop(0, 'rgba(10,15,40,0)');
  g.addColorStop(1, 'rgba(10,15,40,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
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
    rundesRechteck(W / 2 - b / 2, H - 70, b, 44, 12); ctx.fill();
    text(nachricht.text, W / 2, H - 48, 18, '#fff', 'center', false);
  }
}

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
  if (spielerIstWolf) titel = ende.gewonnen ? '😈 Du hast gewonnen, Wolf! 😈' : '🐑 Die Schafe haben gewonnen!';
  else titel = ende.gewonnen ? '🎉 Die Schafe gewinnen! 🎉' : '🐺 Der Wolf gewinnt! 🐺';
  text(titel, W / 2, 150, 44, ende.gewonnen ? '#4ade80' : '#ff6b6b');
  text(ende.grund, W / 2, 215, 20, '#fff');
  text(spielerIstWolf ? 'Der Wolf warst: DU! 😈' : `Der Wolf war: ${wolf.name}`, W / 2, 300, 24, '#ffd166');
  zeichneSchafKoerper(W / 2 - 40, 370, wolf.farbe, 1, 0, false, 1.6);
  text('🐺', W / 2 + 50, 360, 56, '#fff', 'center', false);
  if (zeit - ende.seit > 1) {
    text('Klicke oder drücke Enter für eine neue Runde!', W / 2, 480, 20, '#c9c3ff', 'center', false);
  }
}

// ===== Intro: Wer bist du? =====
function zeichneIntro() {
  const t = intro;
  // Dunkler Hintergrund mit Scheinwerfer
  ctx.fillStyle = '#05060f';
  ctx.fillRect(0, 0, W, H);
  const licht = ctx.createRadialGradient(W / 2, 380, 20, W / 2, 380, 420);
  const lf = spielerIstWolf ? '255,60,60' : '111,227,255';
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
    if (spielerIstWolf) text('🐺 DER WOLF! 🐺', 0, 0, 64, '#ff4d4d');
    else text('🐑 EIN SCHAF! 🐑', 0, 0, 64, '#6fe3ff');
    ctx.restore();
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
    text(spielerIstWolf ? 'DU 😈' : 'DU', W / 2, 290 - hopp, 22, '#ffd166');
  }

  // 4. Die Warnung
  if (t > 3.8) {
    ctx.globalAlpha = Math.min(1, (t - 3.8) / 0.6);
    const blink = 0.6 + Math.sin(zeit * 6) * 0.4;
    if (spielerIstWolf) {
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

function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1f3a'); g.addColorStop(1, '#3d8b37');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  text('🐺 Wolf im Schafspelz 🐑', W / 2, 80, 46, '#ffd166');
  for (let i = 0; i < 7; i++) {
    const x = 180 + i * 100, y = 175 + Math.sin(zeit * 3 + i) * 6;
    zeichneSchafKoerper(x, y, FARBEN[i], i % 2 ? -1 : 1, zeit * 6 + i, true);
  }
  const zeilen = [
    'Eines der Schafe ist ein Wolf! Und manchmal ... bist DU der Wolf! 😈',
    '🟡  Erledige deine Aufgaben auf dem Bauernhof: kleine Mini-Spiele bei den gelben !',
    '🧶  Findest du Wolle von einem gefressenen Schaf? Melde sie!',
    '🔔  Beim Herden-Treffen stimmt ihr ab, wer der Wolf ist.',
    '🕵️  Merk dir, wo die Schafe waren! Der Wolf schwindelt oft.',
    '⌨️  Laufen: Pfeiltasten / WASD oder klicken  •  Aktion: E oder Leertaste  •  Ton: M',
  ];
  zeilen.forEach((z, i) => text(z, W / 2, 255 + i * 34, 17, i === 0 ? '#ffd166' : '#fff', 'center', false));
  const puls = 1 + Math.sin(zeit * 4) * 0.05;
  ctx.save(); ctx.translate(W / 2, 530); ctx.scale(puls, puls);
  text('Klicke oder drücke Enter zum Starten!', 0, 0, 24, '#4ade80');
  ctx.restore();
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  if (zustand === 'intro') { zeichneIntro(); return; }

  kamera.x = begrenzt(spieler.x - W / 2, 0, WELT_B - W);
  kamera.y = begrenzt(spieler.y - H / 2, 0, WELT_H - H);
  const sichtbar = p => dist(p, spieler) < SICHT + 20;

  ctx.save();
  ctx.translate(-kamera.x, -kamera.y);
  zeichneWelt();
  for (const w of wolle) if (sichtbar(w)) zeichneWolle(w);
  const zuSehen = schafe.filter(s => s.lebt && (s.istSpieler || sichtbar(s))).sort((a, b) => a.y - b.y);
  for (const s of zuSehen) zeichneSchaf(s);
  // Der Wolf zeigt sich kurz, wenn er zuschlägt!
  for (const e of effekte) {
    if (!sichtbar(e)) continue;
    ctx.globalAlpha = Math.min(1, e.t);
    text('🐺', e.x, e.y - 20 - (1.2 - e.t) * 25, 60, '#fff', 'center', false);
    text('HAPS!', e.x, e.y + 30, 22, '#ff6b6b');
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  zeichneDunkel();
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
  if (zustand === 'titel' && (k === 'enter' || k === ' ')) neuesSpiel();
  else if (zustand === 'intro' && (k === 'enter' || k === ' ') && intro > 1.5) introFertig();
  else if (zustand === 'ende' && (k === 'enter' || k === ' ') && zeit - ende.seit > 1) neuesSpiel();
  else if (zustand === 'spiel' && miniSpiel) miniTaste(k);
  else if (zustand === 'spiel' && (k === 'e' || k === ' ')) aktion();
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
  if (zustand === 'titel') { neuesSpiel(); return; }
  if (zustand === 'intro') { if (intro > 1.5) introFertig(); return; }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) neuesSpiel(); return; }
  if (zustand === 'treffen') { klickTreffen(p); return; }
  if (zustand === 'spiel' && miniSpiel) { miniDruck(p); return; }
  if (zustand === 'spiel') {
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
