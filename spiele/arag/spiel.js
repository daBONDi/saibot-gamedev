// 🤖 ARAG – Automatische Roboter AufräumGruppe (3D, Ich-Perspektive)
// Du bist ein kleiner Aufräum-Roboter. Im dunklen Spukhaus liegen wertvolle Schätze herum.
// Hol sie mit deinem Greifstrahl und bring sie zum Transporter – aber vorsichtig!
// Jeder Stoß kostet Geld, und in den Gängen lauern Monster ...
// Zum Glück hast du Kollegen: Die Helfer-Bots tragen auch Schätze zum Transporter (und reden dabei!).
//
// So ist das Spiel aufgebaut:
//   - Three.js zeichnet die 3D-Welt.
//   - cannon-es rechnet die Physik: Fallen, Anstoßen, Werfen.
//   - Vorne drauf liegt ein normales Canvas für die Anzeigen (HUD).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const canvas = document.getElementById('spiel');   // Das HUD-Canvas (vorne)
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ===== Einstellungen (hier kannst du rumprobieren!) =====
const RAUM = 10;                 // Ein Raum ist 10 x 10 Meter groß
const WAND_HOEHE = 3.2;          // So hoch sind die Wände
const ETAGE_HOEHE = 3.4;         // So hoch ist ein Stockwerk (Wand + Zwischendecke)
const TUER_BREITE = 2.2;         // So breit sind normale Türen
const DURCHGANG_BREITE = 5.5;    // So breit sind große offene Durchgänge
const TUER_HOEHE = 2.4;          // So hoch sind die Türen
const LAUF_TEMPO = 4;            // Normal laufen (Meter pro Sekunde)
const RENN_TEMPO = 6.5;          // Rennen mit Shift
const DUCK_TEMPO = 2;            // Geduckt laufen mit C
const AUSDAUER_MAX = 100;        // So lange kannst du rennen
const SPRUNG = 5;                // Wie hoch du springst
const GREIF_WEITE = 3.5;         // So weit reicht dein Greifstrahl
const WURF_KRAFT = 12;           // So fest wirfst du
const STOSS_GRENZE = 3;          // Ab diesem Aufprall-Tempo bekommt ein Schatz Kratzer
const KAPUTT_BEI = 0.15;         // Fällt der Wert unter 15 %, geht der Schatz kaputt!
const MAUS_EMPFINDLICH = 0.0022; // Wie schnell du dich mit der Maus drehst
const KOERPER_RADIUS = 0.45;     // So dick ist dein Roboter
const DUCK_RADIUS = 0.28;        // So klein bist du geduckt (passt unter Tische!)
const AUGEN_HOEHE = 0.85;        // So weit über der Körpermitte ist die Kamera
const DUCK_AUGEN = 0.35;         // ... und geduckt
const DUCK_SICHT = 0.55;         // Geduckt sehen dich Monster nur aus so viel der normalen Entfernung
const MAX_LAMPEN = 14;
const MONSTER_START_ABSTAND = 3;   // So viele Räume (Türen) weit weg vom Start tauchen Monster auf           // So viele Lichter gibt es höchstens (mehr wird langsam)

// Die Treppe steht in einem Raum an der Nordwand (Werte in Metern vom Raum-Rand)
const TREPPE = { von: 1.2, bis: 8.4, z1: 0.3, z2: 1.9 };     // Die Rampe mit den Stufen
const LOCH = { x1: 1.0, x2: 8.4, z1: 0.15, z2: 2.0 };          // Das Loch in der Decke darüber

// ===== Die Helfer-Bots =====
const HELFER_ANZAHL = 2;         // So viele Kollegen helfen dir (0 bis 3)
const HELFER = [
  { name: 'Bolzen', farbe: '#ffb347', stimme: 0.75 },   // stimme: wie hoch sie piepsen (1 = normal, kleiner = tiefer)
  { name: 'Funke', farbe: '#ff6fb5', stimme: 1.2 },
  { name: 'Schraubi', farbe: '#6fa8ff', stimme: 0.95 },
];
const HELFER_TEMPO = 3.2;        // So schnell fahren die Helfer
const HELFER_TRAGE_TEMPO = 2.2;  // ... und so schnell, wenn sie was tragen
const HELFER_PAUSE = 8;          // So lange ist ein Helfer kaputt, wenn er kein Leben mehr hat
const HELFER_LEBEN = 3;          // So viele Treffer hält ein Helfer aus, bevor er kaputt geht ❤️
const HELFER_HEILEN = 20;        // Alle 20 Sekunden bekommt ein Helfer ein Leben zurück (0 = nie)
// Was die Helfer sagen ({name}, {wert} und {monster} werden ersetzt)
const SAETZE = {
  start: ['ARAG-Einheit bereit!', 'Los geht\'s, Team!', 'Ich hab ein komisches Gefühl ...', 'Schätze suchen, Schätze finden!'],
  ziel: ['Ich hol die {name}!', 'Oh, eine {name}!', 'Die {name} gehört mir!', 'Da hinten ist was Glänzendes!'],
  greifen: ['Hab sie!', 'Greifstrahl an!', 'Ganz vorsichtig ...', 'Schwer, aber machbar!'],
  ups: ['Ups!', 'Hoppla!', 'Das war ich nicht!', 'Oh nein, Kratzer!', 'Uiuiui ...'],
  abgeliefert: ['Abgeliefert!', 'Ding! {wert}!', 'Ab in den Transporter!', 'Wieder eins geschafft!'],
  hilfe: ['Hilfe! Ein {monster}!', 'Waaah! Weg hier!', 'Ein {monster}! Ich hau ab!', 'Nicht beißen!'],
  kaputt: ['Systemfehler ...', 'Aua ...', 'Ich seh Sterne ...', 'Bitte neu starten ...'],
  neustart: ['Neustart fertig!', 'Bin wieder da!', 'Alle Schrauben noch dran!'],
  warten: ['Alles ruhig hier ...', 'Langweilig ...', 'Brauchst du Hilfe?', 'Ich hab keine Schätze mehr gefunden.'],
  teuer: ['Oh oh, das war teuer!', 'Das war mal wertvoll ...', 'Kaputt ist kaputt.'],
  aufpassen: ['Pass auf!', 'Bist du okay?', 'Lauf weg!'],
  genug: ['Wir haben genug! Ab zum Transporter!', 'Das Ziel ist voll! Drück E!'],
  volltreffer: ['Volltreffer!', 'Guter Wurf!', 'Ha! Erwischt!'],
};

// ===== Die Schätze =====
// wert: [von, bis] in Euro      zerbrechlich: wie leicht er Kratzer bekommt (1 = normal, 2 = superleicht)
// masse: wie schwer (schwere Sachen sind langsam zu tragen)      haeufig: wie oft er vorkommt
const SCHAETZE = [
  { id: 'vase',     name: 'Vase',          emoji: '🏺', wert: [300, 600],   zerbrechlich: 1.0,  masse: 2,   groesse: [0.35, 0.6, 0.35], haeufig: 3 },
  { id: 'bild',     name: 'Gemälde',       emoji: '🖼️', wert: [400, 900],   zerbrechlich: 0.6,  masse: 3,   groesse: [1.0, 0.7, 0.07],  haeufig: 2 },
  { id: 'uhr',      name: 'Kaminuhr',      emoji: '🕰️', wert: [250, 500],   zerbrechlich: 0.8,  masse: 2.5, groesse: [0.4, 0.5, 0.22],  haeufig: 2 },
  { id: 'pokal',    name: 'Goldpokal',     emoji: '🏆', wert: [500, 800],   zerbrechlich: 0.35, masse: 3,   groesse: [0.3, 0.5, 0.3],   haeufig: 1.5 },
  { id: 'globus',   name: 'Globus',        emoji: '🌍', wert: [200, 400],   zerbrechlich: 0.5,  masse: 2,   groesse: [0.5, 0.5, 0.5],   haeufig: 1.5, rund: true },
  { id: 'kristall', name: 'Kristallkugel', emoji: '🔮', wert: [1200, 1800], zerbrechlich: 1.6,  masse: 1.5, groesse: [0.36, 0.36, 0.36], haeufig: 0.6, rund: true },
  { id: 'kanne',    name: 'Teekanne',      emoji: '🫖', wert: [120, 260],   zerbrechlich: 0.9,  masse: 1,   groesse: [0.38, 0.3, 0.26], haeufig: 3 },
  { id: 'truhe',    name: 'Schatztruhe',   emoji: '🧰', wert: [800, 1200],  zerbrechlich: 0.3,  masse: 15,  groesse: [0.8, 0.55, 0.5],  haeufig: 0.8, boden: true },
  { id: 'ruestung', name: 'Ritterrüstung', emoji: '🛡️', wert: [1500, 2200], zerbrechlich: 0.15, masse: 35,  groesse: [0.6, 1.7, 0.45],  haeufig: 0.5, boden: true },
];

// ===== Die Level =====
// Jedes Level hat ein größeres Haus, ein höheres Ziel und mehr Monster
function levelDaten(n) {
  return {
    breit: Math.min(6, 3 + Math.floor(n / 2)),         // Räume nebeneinander
    tief: Math.min(4, 3 + Math.floor((n - 1) / 3)),     // Räume hintereinander
    etagen: n >= 4 ? 3 : 2,                             // Stockwerke
    ziel: 3000 + (n - 1) * 2000,                        // So viel Geld musst du abliefern
    // Monster: Hier kannst du einstellen, wie viele es gibt!
    geister: 1 + Math.floor((n - 1) / 3),               // 👻 Staubgeister (ab Level 4 zwei)
    lauscher: n >= 3 ? 1 + Math.floor((n - 3) / 4) : 0, // 👂 Lauscher (ab Level 3)
    starrer: n >= 5 ? 1 + Math.floor((n - 5) / 4) : 0,  // 🗿 Starrer (ab Level 5)
  };
}

// ===== Hilfsfunktionen =====
const zufall = (a, b) => a + Math.random() * (b - a);
const zufallGanz = (a, b) => Math.floor(zufall(a, b + 1));
const auswahl = arr => arr[Math.floor(Math.random() * arr.length)];
const begrenzt = (v, a, b) => Math.max(a, Math.min(b, v));
const abstand2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const abstand3D = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 2, a.z - b.z);   // Höhe zählt doppelt (anderes Stockwerk = weit weg)
const mischen = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const ETAGEN_NAMEN = ['Erdgeschoss', '1. Stock', '2. Stock'];
function gewichtetWaehlen(liste) {
  let summe = 0;
  for (const t of liste) summe += t.haeufig;
  let r = Math.random() * summe;
  for (const t of liste) { r -= t.haeufig; if (r <= 0) return t; }
  return liste[0];
}
function rr(x, y, w, h, r, g = ctx) {   // Rechteck mit runden Ecken
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function text(t, x, y, groesse, farbe = '#fff', ausrichtung = 'center', rand = true) {
  ctx.font = `bold ${groesse}px system-ui, sans-serif`;
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  if (rand) { ctx.lineWidth = Math.max(2, groesse / 6); ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t, x, y); }
  ctx.fillStyle = farbe;
  ctx.fillText(t, x, y);
}
function balken(x, y, b, h, anteil, farbe) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(x - 2, y - 2, b + 4, h + 4, 4); ctx.fill();
  ctx.fillStyle = farbe; rr(x, y, Math.max(0, b * begrenzt(anteil, 0, 1)), h, 3); ctx.fill();
}
const euro = n => `${Math.round(n).toLocaleString('de-DE')} €`;

// ===== Sound =====
// Echte Sound-Dateien liegen in assets/sounds/ (alle CC0, siehe LIZENZ.txt). Klappt eine nicht, gibt es einen Piep-Sound.
const SOUND_DATEIEN = {
  glas: ['glas_0.ogg', 'glas_1.ogg', 'glas_2.ogg'],
  stoss: ['stoss_0.ogg', 'stoss_1.ogg', 'stoss_2.ogg'],
  geist: ['geist.ogg'],
  lauscher: ['lauscher.ogg'],
  autsch: ['autsch.ogg'],
  strahl: ['strahl.ogg'],
  abgabe: ['abgabe.mp3'],
  geschafft: ['geschafft.mp3'],
};
const soundPuffer = {};
let audio = null, tonAn = true;
function tonStart() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      for (const [name, dateien] of Object.entries(SOUND_DATEIEN)) {
        soundPuffer[name] = [];
        for (const datei of dateien) {
          fetch('assets/sounds/' + datei)
            .then(r => r.arrayBuffer())
            .then(daten => new Promise((ok, fehler) => audio.decodeAudioData(daten, ok, fehler)))
            .then(p => soundPuffer[name].push(p))
            .catch(() => { /* egal, dann eben Piep */ });
        }
      }
    } catch (e) { audio = null; }
  }
  if (audio && audio.state === 'suspended') audio.resume();
}
function spiele(name, laut = 1, tempo = 1) {
  try {
    const liste = soundPuffer[name];
    if (!audio || !liste || liste.length === 0) return false;
    if (!tonAn || laut <= 0.01) return true;
    const q = audio.createBufferSource(), g = audio.createGain();
    q.buffer = auswahl(liste);
    q.playbackRate.value = tempo;
    g.gain.value = laut;
    q.connect(g).connect(audio.destination);
    q.start();
    return true;
  } catch (e) { return true; }
}
function ton(hoehe, start, dauer, klang = 'square', laut = 0.1, hoeheEnde = null) {
  try {
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
  } catch (e) { /* egal */ }
}
const sound = {
  glas(laut = 1) { if (!spiele('glas', 0.7 * laut, zufall(0.9, 1.1))) ton(1800, 0, 0.3, 'square', 0.08 * laut, 300); },
  stoss(laut = 1) { if (!spiele('stoss', 0.6 * laut, zufall(0.85, 1.15))) ton(200, 0, 0.1, 'square', 0.1 * laut, 80); },
  geist() { if (!spiele('geist', 0.6, 0.8)) ton(300, 0, 0.8, 'sine', 0.1, 150); },
  lauscher() { if (!spiele('lauscher', 0.7, 0.7)) ton(120, 0, 0.6, 'sawtooth', 0.1, 60); },
  knirsch() { if (!spiele('stoss', 0.8, 0.45)) ton(70, 0, 0.4, 'sawtooth', 0.12, 40); },   // Stein schabt über den Boden ...
  autsch() { if (!spiele('autsch', 0.8, 0.8)) ton(150, 0, 0.3, 'sawtooth', 0.15, 60); },
  strahl() { if (!spiele('strahl', 0.25, 1.4)) ton(600, 0, 0.15, 'sine', 0.05, 900); },
  abgabe() { if (!spiele('abgabe', 0.5)) ton(880, 0, 0.2, 'square', 0.08, 1320); },
  geschafft() { if (!spiele('geschafft', 0.6)) [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.12, 0.2, 'square', 0.08)); },
  herz(laut) { ton(55, 0, 0.12, 'sine', 0.3 * laut); ton(50, 0.16, 0.12, 'sine', 0.22 * laut); },
  schritt() { ton(90, 0, 0.06, 'sine', 0.05, 50); },
  sprung() { ton(300, 0, 0.15, 'sine', 0.05, 500); },
  ducken() { ton(200, 0, 0.08, 'sine', 0.04, 140); },
  piep() { ton(660, 0, 0.1, 'square', 0.06); },
  robo(hoehe, laut) {   // Roboter-Piepsen beim Reden (wie kleine Computer-Wörter)
    for (let k = 0; k < 4; k++) ton(hoehe * zufall(0.8, 1.5), k * 0.07, 0.06, 'square', 0.035 * laut);
  },
};

// ===== Monster-Geräusche =====
// Jedes Monster macht eigene Geräusche – je näher es ist, desto lauter. So hörst du sie, bevor du sie siehst!
const MONSTER_GERAEUSCH_LAUT = 1;   // Wie laut die Monster sind (0 = stumm, 2 = doppelt so laut)
const MONSTER_HOERWEITE = 22;       // Ab dieser Entfernung hörst du ein Monster nicht mehr
let rauschPuffer = null;
function rauschen(start, dauer, laut, filter = 'bandpass', frequenz = 1000, ziel = null, frequenzEnde = null) {
  try {
    if (!audio || !tonAn || laut <= 0.001) return;
    if (!rauschPuffer) {   // Einmal 1 Sekunde Rauschen bauen und immer wieder benutzen
      rauschPuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = rauschPuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = audio.currentTime + start;
    const q = audio.createBufferSource(), f = audio.createBiquadFilter(), g = audio.createGain();
    q.buffer = rauschPuffer; q.loop = true;
    f.type = filter; f.frequency.setValueAtTime(frequenz, t);
    if (frequenzEnde) f.frequency.exponentialRampToValueAtTime(frequenzEnde, t + dauer);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + Math.min(0.05, dauer / 3));
    g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
    q.connect(f).connect(g).connect(ziel || audio.destination);
    q.start(t); q.stop(t + dauer + 0.05);
  } catch (e) { /* egal */ }
}
// Ein Ton mit "Zittern" (Vibrato) – klingt gruselig
function gruselTon(hoehe, start, dauer, klang, laut, hoeheEnde, zittern = 6, ziel = null) {
  try {
    if (!audio || !tonAn || laut <= 0.001) return;
    const t = audio.currentTime + start;
    const o = audio.createOscillator(), g = audio.createGain(), lfo = audio.createOscillator(), lfoG = audio.createGain();
    o.type = klang;
    o.frequency.setValueAtTime(hoehe, t);
    if (hoeheEnde) o.frequency.exponentialRampToValueAtTime(hoeheEnde, t + dauer);
    lfo.frequency.value = zittern; lfoG.gain.value = hoehe * 0.04;
    lfo.connect(lfoG).connect(o.frequency);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + dauer * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
    o.connect(g).connect(ziel || audio.destination);
    o.start(t); lfo.start(t); o.stop(t + dauer + 0.05); lfo.stop(t + dauer + 0.05);
  } catch (e) { /* egal */ }
}
const monsterSound = {
  geist(laut, jagt) {   // 👻 Huuuuuu ... (beim Jagen höher und schriller)
    const h = jagt ? zufall(500, 650) : zufall(300, 420);
    gruselTon(h, 0, zufall(1.2, 2), 'sine', 0.09 * laut, h * zufall(0.6, 0.8), jagt ? 9 : 5);
    gruselTon(h * 1.5, 0.1, 1.4, 'triangle', 0.03 * laut, h, 7);
    rauschen(0, 1.5, 0.05 * laut, 'bandpass', 800, null, 300);   // Wind
  },
  lauscher(laut, jagt) {
    if (jagt) {   // 👂 Knurren und schnelle, schwere Schritte
      gruselTon(zufall(55, 70), 0, 0.7, 'sawtooth', 0.09 * laut, 45, 18);
      for (let k = 0; k < 3; k++) ton(70, 0.2 + k * 0.18, 0.1, 'sine', 0.2 * laut, 35);
    } else {      // Schnüffeln: schnf, schnf, schnf
      for (let k = 0; k < 3; k++) rauschen(k * 0.16, 0.1, 0.1 * laut, 'bandpass', zufall(1800, 2600));
    }
  },
  starrer(laut) {   // 🗿 Stein schabt über den Boden
    rauschen(0, 0.45, 0.12 * laut, 'lowpass', 400, null, 150);
    ton(48, 0, 0.4, 'sawtooth', 0.04 * laut, 40);
  },
};
function monsterLautstaerke(m) {
  const d = abstand3D(m, spielerKoerper.position);
  if (d > MONSTER_HOERWEITE) return 0;
  const n = 1 - d / MONSTER_HOERWEITE;
  return n * n * MONSTER_GERAEUSCH_LAUT;   // Mal-sich-selbst, damit es nah viel lauter ist als fern
}
function monsterGeraeusche(m, dt) {
  m.geraeuschZeit = (m.geraeuschZeit ?? zufall(0, 2)) - dt;
  if (m.geraeuschZeit > 0 || m.betaeubt > 0) return;
  const laut = monsterLautstaerke(m), jagt = m.modus === 'jagen';
  if (m.art === 'starrer') {
    // Der Starrer ist nur zu hören, wenn er sich bewegt (also wenn du NICHT hinschaust ...)
    m.geraeuschZeit = 0.5;
    if (!m.gesehen && m.laeuft && laut > 0) monsterSound.starrer(laut);
    return;
  }
  if (m.art === 'geist') m.geraeuschZeit = jagt ? zufall(1.2, 2) : zufall(3, 6);
  else m.geraeuschZeit = jagt ? zufall(0.7, 1) : zufall(2.5, 4.5);
  if (laut > 0) monsterSound[m.art](laut, jagt);
}

// ===== Verfolgungs-Musik =====
// Wenn ein Monster dich jagt, startet schnelle, BRUTALE Musik. Ist die Gefahr vorbei, wird sie leiser.
// Die Musik wird mit Web Audio "live" gespielt – Note für Note, ganz ohne Musikdatei.
const MUSIK_AN = true;       // false = keine Verfolgungs-Musik
const MUSIK_LAUT = 0.5;      // Wie laut die Musik ist
const MUSIK_TEMPO = 175;     // Schläge pro Minute (höher = hektischer)
const MUSIK_VERZERRUNG = 60; // Wie dreckig die E-Gitarre klingt (0 = sauber, 100 = ganz kaputt)
// Gitarren-Riff: Halbtöne über dem Ton A (0 = A, 1 = B, 3 = C, 6 = Teufelston!), eine Zahl pro Sechzehntel
// null = Pause (kurz Stille, das macht es härter). 4 Takte lang.
const MUSIK_RIFF = [
  0, 0, 0, null, 0, 0, 1, null,   0, 0, 0, null, 6, null, 5, null,
  0, 0, 0, null, 0, 0, 1, null,   0, 0, 3, 3, 1, 1, null, null,
  0, 0, 0, null, 0, 0, 1, null,   0, 0, 0, null, 6, null, 5, null,
  -2, -2, -2, null, -1, -1, -1, null,   1, 1, 1, 1, 6, 6, 6, 6,
];
// Doppel-Bassdrum: 1 = Bum. In den Takten 3 und 4 durchgehend (wie bei Metal!)
const MUSIK_KICK = [
  1, 0, 1, 0, 0, 0, 1, 0,   1, 0, 1, 0, 0, 0, 1, 1,
  1, 0, 1, 0, 0, 0, 1, 0,   1, 0, 1, 0, 0, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,
];
// Hohe kreischende Melodie: eine Note pro halben Takt (null = Pause)
const MUSIK_MELODIE = [12, 13, 12, 18, 12, 13, 15, 18];
let musik = null;
const halbton = (n, grund) => grund * Math.pow(2, n / 12);
function verzerrKurve(staerke) {   // Macht aus einem sauberen Ton einen dreckigen, kratzigen Ton
  const n = 1024, kurve = new Float32Array(n), k = staerke * 4 + 1;
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1) * 2 - 1;
    kurve[i] = (1 + k) * x / (1 + k * Math.abs(x));
  }
  return kurve;
}
function musikNote(schritt, t) {
  const ziel = musik.gain, s16 = 60 / MUSIK_TEMPO / 4, imTakt = schritt % 16;
  const i = schritt % MUSIK_RIFF.length, neuStart = t - audio.currentTime;
  try {
    // 🎸 Verzerrte Gitarre: zwei leicht verstimmte Töne + Quinte = Power-Akkord
    const n = MUSIK_RIFF[i];
    if (n !== null) {
      const f = halbton(n, 110), betont = imTakt % 4 === 0;
      const lang = (MUSIK_RIFF[(i + 1) % MUSIK_RIFF.length] === null ? 1.6 : 0.9) * s16;
      const fl = audio.createBiquadFilter(), g = audio.createGain();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(betont ? 3500 : 2200, t); fl.frequency.exponentialRampToValueAtTime(600, t + lang);
      g.gain.setValueAtTime(betont ? 0.5 : 0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + lang);
      fl.connect(g).connect(musik.dreck);
      for (const [mal, verstimmt] of [[1, -8], [1, 8], [1.5, 0], [0.5, 0]]) {
        const o = audio.createOscillator();
        o.type = mal === 0.5 ? 'square' : 'sawtooth';
        o.frequency.value = f * mal; o.detune.value = verstimmt;
        o.connect(fl); o.start(t); o.stop(t + lang + 0.02);
      }
    }
    // 🥁 Bassdrum (mit Klick, damit man sie gut hört)
    if (MUSIK_KICK[i % MUSIK_KICK.length]) {
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(ziel); o.start(t); o.stop(t + 0.2);
      rauschen(neuStart, 0.015, 0.3, 'highpass', 3000, ziel);
    }
  } catch (e) { /* egal */ }
  // Snare: KRACH auf 2 und 4 (Rauschen + ein tiefer Ton als "Körper")
  if (imTakt === 4 || imTakt === 12) {
    rauschen(neuStart, 0.2, 0.6, 'highpass', 1200, ziel);
    try {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(ziel); o.start(t); o.stop(t + 0.12);
    } catch (e) { /* egal */ }
  }
  // Becken: Ts-ts auf jedem Achtel, alle 4 Takte ein großes KSSSSHHH
  if (schritt % 2 === 0) rauschen(neuStart, 0.05, 0.15, 'highpass', 8000, ziel);
  if (schritt % 64 === 0) rauschen(neuStart, 1.6, 0.4, 'highpass', 4000, ziel, 2500);
  // Kreischende Melodie (schief und verstimmt = extra gruselig)
  if (imTakt % 8 === 0) {
    const m = MUSIK_MELODIE[Math.floor(schritt / 8) % MUSIK_MELODIE.length];
    if (m !== null) {
      gruselTon(halbton(m, 220), neuStart, s16 * 7, 'sawtooth', 0.07, null, 9, ziel);
      gruselTon(halbton(m + 0.3, 220), neuStart, s16 * 7, 'square', 0.04, null, 7, ziel);
    }
  }
}
function musikUpdate(aktiv) {
  if (!audio || !MUSIK_AN) return;
  const jetzt = audio.currentTime;
  if (!musik) {
    const g = audio.createGain();
    g.gain.value = 0;
    // Ein Kompressor am Ende passt auf, dass es nicht zu laut wird und kratzt
    const komp = audio.createDynamicsCompressor();
    komp.threshold.value = -14; komp.ratio.value = 6;
    g.connect(komp).connect(audio.destination);
    // Die Gitarre geht erst durch den Verzerrer
    const dreck = audio.createWaveShaper();
    dreck.curve = verzerrKurve(MUSIK_VERZERRUNG); dreck.oversample = '2x';
    const dreckLeiser = audio.createGain(); dreckLeiser.gain.value = 0.35;
    dreck.connect(dreckLeiser).connect(g);
    musik = { gain: g, dreck, naechste: 0, schritt: 0, war: false, aus: -99, ziel: 0 };
  }
  const ziel = aktiv && tonAn ? MUSIK_LAUT : 0;
  if (ziel !== musik.ziel) {
    musik.ziel = ziel;
    musik.gain.gain.cancelScheduledValues(jetzt);
    musik.gain.gain.setTargetAtTime(ziel, jetzt, ziel > 0 ? 0.1 : 0.8);   // Schnell an, langsam aus
  }
  if (aktiv && !musik.war) {
    // Die Jagd beginnt! Ein dramatischer Schlag ... DUNN!
    if (jetzt - musik.aus > 4) { musik.naechste = jetzt + 0.05; musik.schritt = 0; }
    gruselTon(55, 0, 1.5, 'sawtooth', 0.3, 30, 3);
    gruselTon(58.3, 0, 1.5, 'sawtooth', 0.25, 31, 4);
    gruselTon(77.8, 0, 1.5, 'sawtooth', 0.2, 40, 5);   // Teufelston dazu!
    ton(120, 0, 0.6, 'sine', 0.6, 30);                 // Tiefer Wumms
    rauschen(0, 1.2, 0.35, 'lowpass', 3000, null, 80);
  }
  if (!aktiv && musik.war) musik.aus = jetzt;
  musik.war = aktiv;
  if (!aktiv && jetzt - musik.aus > 4) return;   // Ausgeklungen – keine Noten mehr planen
  // Die nächsten Noten ein kleines Stück im Voraus planen (so klingt es nicht holprig)
  if (musik.naechste < jetzt) musik.naechste = jetzt + 0.02;
  while (musik.naechste < jetzt + 0.15) {
    musikNote(musik.schritt, musik.naechste);
    musik.naechste += 60 / MUSIK_TEMPO / 4;
    musik.schritt++;
  }
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
  renderer = null;   // Kein 3D möglich
}
function groesseAnpassen() {
  if (renderer) renderer.setSize(buehne.clientWidth || W, buehne.clientHeight || H, false);
}
addEventListener('resize', groesseAnpassen);
groesseAnpassen();

const szene = new THREE.Scene();
const DUNKEL = '#05060a';
szene.background = new THREE.Color(DUNKEL);
szene.fog = new THREE.FogExp2(DUNKEL, 0.06);
const kamera = new THREE.PerspectiveCamera(75, W / H, 0.05, 200);
kamera.rotation.order = 'YXZ';
szene.add(kamera);

// Licht: ganz schwaches Grundlicht + deine Taschenlampe
const grundLicht = new THREE.HemisphereLight('#6b7aa8', '#1a1410', 0.35);
szene.add(grundLicht);
const taschenlampe = new THREE.SpotLight('#fff3d6', 6, 26, 0.55, 0.45, 1);
taschenlampe.position.set(0.15, -0.15, 0);
taschenlampe.target.position.set(0, -0.3, -5);
taschenlampe.castShadow = true;
taschenlampe.shadow.mapSize.set(1024, 1024);
taschenlampe.shadow.camera.near = 0.2;
kamera.add(taschenlampe, taschenlampe.target);

// Kleine Bilder (Texturen) selbst malen
function malTextur(b, h, malen, wiederholen = true) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  malen(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// --- Böden ---
const BOEDEN = {
  holz: malTextur(256, 256, (g, b) => {   // Holzdielen
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ['#5a3d2b', '#4e3424', '#634431', '#553a29'][i];
      g.fillRect(0, i * 64, b, 64);
      g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(b, i * 64); g.stroke();
      const fuge = (i * 97) % b;
      g.beginPath(); g.moveTo(fuge, i * 64); g.lineTo(fuge, i * 64 + 64); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(0, i * 64 + 10 + k * 11); g.lineTo(b, i * 64 + 8 + k * 11); g.stroke(); }
    }
  }),
  fliesen: malTextur(128, 128, (g) => {   // Schachbrett-Fliesen
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#2b2b30' : '#b9b5aa'; g.fillRect(x * 64, y * 64, 64, 64);
    }
    g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128); g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64);
  }),
  teppich: malTextur(128, 128, (g) => {   // Teppichboden
    g.fillStyle = '#4a1f2a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,200,150,0.08)';
    for (let x = 0; x < 128; x += 16) for (let y = 0; y < 128; y += 16) if ((x + y) % 32 === 0) g.fillRect(x + 4, y + 4, 8, 8);
  }),
  beton: malTextur(128, 128, (g) => {   // Beton
    g.fillStyle = '#4a4c50'; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.06)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
  }),
};
const TAPETEN = ['#6b4f4f', '#4f5d6b', '#5d6b4f', '#6b604f', '#584f6b', '#4f6b66'].map(farbe => malTextur(128, 128, (g, b, h) => {
  g.fillStyle = farbe; g.fillRect(0, 0, b, h);
  g.fillStyle = 'rgba(255,255,255,0.07)';
  for (let x = 0; x < b; x += 32) g.fillRect(x, 0, 12, h);   // Streifen
  g.fillStyle = 'rgba(0,0,0,0.15)';
  for (let y = 0; y < h; y += 32) for (let x = 16; x < b; x += 32) { g.beginPath(); g.arc(x, y + 16, 4, 0, 7); g.fill(); }
}));
for (const t of TAPETEN) t.repeat.set(5, 2);   // Das Muster wiederholt sich auf der Wand
const deckenTextur = malTextur(64, 64, (g, b, h) => {
  g.fillStyle = '#2a2622'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#1f1c19'; g.lineWidth = 2; g.strokeRect(0, 0, b, h);
});
// --- Deko-Texturen ---
const buecherTextur = malTextur(256, 64, (g) => {   // Buchrücken in vielen Farben
  let x = 0;
  while (x < 256) {
    const b = zufallGanz(6, 14), h = zufallGanz(40, 62);
    g.fillStyle = auswahl(['#7f1d1d', '#1e3a8a', '#14532d', '#713f12', '#4c1d95', '#334155', '#9a3412']);
    g.fillRect(x, 64 - h, b, h);
    g.fillStyle = 'rgba(255,215,120,0.6)'; g.fillRect(x + 1, 64 - h + 6, b - 2, 2);
    x += b + 1;
  }
});
const teppichTextur = malTextur(256, 192, (g) => {   // Ein schöner alter Teppich
  g.fillStyle = '#5b1a1a'; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = '#c9a14a'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 172);
  g.lineWidth = 2; g.strokeRect(22, 22, 212, 148);
  g.fillStyle = '#1e3a5f'; g.beginPath(); g.ellipse(128, 96, 60, 40, 0, 0, 7); g.fill();
  g.strokeStyle = '#c9a14a'; g.beginPath(); g.ellipse(128, 96, 60, 40, 0, 0, 7); g.stroke();
  g.fillStyle = '#c9a14a';
  for (const [x, y] of [[40, 40], [216, 40], [40, 152], [216, 152]]) { g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); }
}, false);
const netzTextur = malTextur(128, 128, (g) => {   // Spinnennetz
  g.strokeStyle = 'rgba(230,230,230,0.55)'; g.lineWidth = 1;
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 128, Math.sin(a) * 128); g.stroke(); }
  for (let r = 15; r < 128; r += 15) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI / 2); g.stroke(); }
}, false);
const fensterTextur = malTextur(128, 128, (g) => {   // Ein Fenster mit Mondschein
  const v = g.createLinearGradient(0, 0, 0, 128);
  v.addColorStop(0, '#1d2b4f'); v.addColorStop(1, '#0b1020');
  g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e8f0ff'; g.beginPath(); g.arc(88, 34, 13, 0, 7); g.fill();
  g.fillStyle = '#1d2b4f'; g.beginPath(); g.arc(82, 30, 12, 0, 7); g.fill();   // Mondsichel
  g.fillStyle = 'rgba(255,255,255,0.7)';
  for (let k = 0; k < 14; k++) g.fillRect(Math.random() * 128, Math.random() * 70, 1.5, 1.5);
  g.fillStyle = '#0b0b0b'; g.fillRect(0, 100, 128, 28);   // Schwarze Bäume
  for (let x = 0; x < 128; x += 20) { g.beginPath(); g.moveTo(x, 100); g.lineTo(x + 10, 70 - Math.random() * 20); g.lineTo(x + 20, 100); g.fill(); }
  g.strokeStyle = '#2d1f14'; g.lineWidth = 8; g.strokeRect(0, 0, 128, 128);
  g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
}, false);
const glanzTextur = malTextur(64, 64, (g) => {   // Ein weicher Lichtpunkt (für Strahl und Funken)
  const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  v.addColorStop(0, 'rgba(255,255,255,1)'); v.addColorStop(0.35, 'rgba(255,255,255,0.5)'); v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v; g.fillRect(0, 0, 64, 64);
}, false);

// --- Materialien ---
const holzMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.8 });
const dunkelHolzMat = new THREE.MeshStandardMaterial({ color: '#3d2a1d', roughness: 0.8 });
const hellHolzMat = new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.7 });
const STOFFE = ['#5b2a3a', '#2a3b5b', '#3b5b2a', '#5b4a2a', '#4a2a5b'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
const steinMat = new THREE.MeshStandardMaterial({ color: '#6b6560', roughness: 0.95 });
const marmorMat = new THREE.MeshStandardMaterial({ color: '#d8d4cc', roughness: 0.3 });
const schwarzMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
const weissMat = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.6 });
const tuchMat = new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 1 });   // Weiße Tücher über alten Möbeln
const kistenMat = new THREE.MeshStandardMaterial({ color: '#9a7448', roughness: 0.9 });
const metallGrauMat = new THREE.MeshStandardMaterial({ color: '#5f646d', metalness: 0.6, roughness: 0.5 });
const goldMat = new THREE.MeshStandardMaterial({ color: '#d4a537', metalness: 0.9, roughness: 0.3, emissive: '#3a2a05' });
const metallMat = new THREE.MeshStandardMaterial({ color: '#b8c0cc', metalness: 0.9, roughness: 0.35, emissive: '#111418' });
const feuerMat = new THREE.MeshBasicMaterial({ color: '#ff8a2a' });
const buecherMat = new THREE.MeshStandardMaterial({ map: buecherTextur, roughness: 0.9 });
const deckenMat = new THREE.MeshStandardMaterial({ map: deckenTextur, roughness: 1 });

// Schrift als Bild (z. B. für das Transporter-Schild)
function schildMesh(t, b, h, farbe = '#7cf5c6') {
  const tex = malTextur(512, 128, (g) => {
    g.fillStyle = '#10141c'; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = farbe; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116);
    g.font = 'bold 56px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = farbe; g.fillText(t, 256, 68);
  }, false);
  return new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ map: tex }));
}
function namensSchild(t, farbe) {   // Ein Namensschild, das immer zu dir schaut
  const tex = malTextur(256, 64, (g) => {
    g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(t, 128, 34);
    g.fillStyle = farbe; g.fillText(t, 128, 34);
  }, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(0.9, 0.225, 1);
  return s;
}

// ===== Der Greifstrahl (sieht man bei dir und bei den Helfern) =====
// Ein geschwungener, leuchtender Energie-Strahl mit Funken, die zum Schatz fliegen
function neuerStrahl(farbe, dicke) {
  const g = new THREE.Group();
  const additiv = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
  const aussen = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: farbe, opacity: 0.35, ...additiv }));
  const innen = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: '#ffffff', opacity: 0.7, ...additiv }));
  g.add(aussen, innen);
  const funken = [];
  for (let k = 0; k < 8; k++) {
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTextur, color: farbe, ...additiv }));
    g.add(f); funken.push(f);
  }
  const leuchten = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTextur, color: farbe, opacity: 0.55, ...additiv }));
  g.add(leuchten);
  g.visible = false;
  g.renderOrder = 5;
  szene.add(g);
  return { g, aussen, innen, funken, leuchten, dicke };
}
function zeigeStrahl(s, von, nach, richtung, groesse) {
  s.g.visible = true;
  const d = von.distanceTo(nach);
  const kontroll = von.clone().addScaledVector(richtung, d * 0.55);
  kontroll.y += Math.sin(zeit * 7) * 0.04; kontroll.x += Math.cos(zeit * 5) * 0.03;   // Der Strahl wabert ein bisschen
  const kurve = new THREE.QuadraticBezierCurve3(von, kontroll, nach);
  s.aussen.geometry.dispose();
  s.aussen.geometry = new THREE.TubeGeometry(kurve, 20, s.dicke * (1 + Math.sin(zeit * 25) * 0.2), 6);
  s.innen.geometry.dispose();
  s.innen.geometry = new THREE.TubeGeometry(kurve, 20, s.dicke * 0.3, 5);
  s.funken.forEach((f, k) => {
    const t = (zeit * 1.6 + k / s.funken.length) % 1;
    f.position.copy(kurve.getPoint(t));
    f.scale.setScalar(s.dicke * (3 + Math.sin(zeit * 20 + k) * 1.5));
  });
  s.leuchten.position.copy(nach);
  s.leuchten.scale.setScalar(groesse * 1.7 * (1 + Math.sin(zeit * 8) * 0.08));
}

// =====================================================================
// ===== Physik mit cannon-es =====
// =====================================================================
const welt = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
welt.broadphase = new CANNON.SAPBroadphase(welt);
welt.allowSleep = true;
const standardMat = new CANNON.Material('standard'), spielerMat = new CANNON.Material('spieler');
welt.defaultContactMaterial.friction = 0.4;
welt.defaultContactMaterial.restitution = 0.15;
welt.addContactMaterial(new CANNON.ContactMaterial(spielerMat, standardMat, { friction: 0, restitution: 0 }));
// Gruppen: Wer stößt mit wem zusammen?
const G_WAND = 1, G_SPIELER = 2, G_SCHATZ = 4, G_HELFER = 8;
const SCHATZ_MASKE = G_WAND | G_SPIELER | G_SCHATZ | G_HELFER;

// Boden und Decke (unendlich große Flächen; die Decke wird je nach Stockwerken verschoben)
const bodenKoerper = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: standardMat, collisionFilterGroup: G_WAND });
bodenKoerper.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
const deckenKoerper = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: standardMat, collisionFilterGroup: G_WAND });
deckenKoerper.quaternion.setFromEuler(Math.PI / 2, 0, 0);
deckenKoerper.position.y = WAND_HOEHE;
welt.addBody(bodenKoerper); welt.addBody(deckenKoerper);

// Dein Roboter: eine Kugel, die nicht umkippen kann (geduckt wird sie kleiner)
const spielerForm = new CANNON.Sphere(KOERPER_RADIUS);
const spielerKoerper = new CANNON.Body({
  mass: 60, shape: spielerForm, material: spielerMat, fixedRotation: true,
  collisionFilterGroup: G_SPIELER, collisionFilterMask: G_WAND | G_SCHATZ | G_HELFER,
});
spielerKoerper.allowSleep = false;
welt.addBody(spielerKoerper);

// =====================================================================
// ===== Spielzustand =====
// =====================================================================
let zustand = 'titel';      // 'titel', 'spiel', 'geschafft', 'kaputt'
let pause = false, mausGefangen = false;
let zeit = 0, spielZeit = 0;
let level = 1, konto = 0, ld = levelDaten(1);
let rekord = 0;
try { rekord = Number(localStorage.getItem('arag-rekord')) || 0; } catch (e) { /* egal */ }
let haus = null;            // Das aktuelle Haus
let schaetze = [];          // Alle Schätze im Haus
let monster = [];           // Alle Monster
let helfer = [];            // Deine Helfer-Bots
let gegriffen = null, halteAbstand = 2.2, schwebend = null;
let nachricht = null, schwebeTexte = [], splitter = [], funk = [];
let energie = 100, ausdauer = AUSDAUER_MAX, schadenBlitz = 0, schrittZeit = 0, herzZeit = 0, wackeln = 0;
let geduckt = false, zielGemeldet = false;
let blick = { links: 0, hoch: 0 };
let amBoden = false, kaputtGrund = '', levelErgebnis = null;
const tasten = {};
function zeigeNachricht(t, dauer = 2.5, farbe = '#7cf5c6') { nachricht = { text: t, t: dauer, farbe }; }
function schwebeText(x, y, z, t, farbe) { schwebeTexte.push({ p: new THREE.Vector3(x, y, z), text: t, farbe, t: 1.5 }); }
function spielerPos() { const p = spielerKoerper.position; return { x: p.x, y: p.y, z: p.z }; }

// =====================================================================
// ===== Das Spukhaus bauen =====
// =====================================================================
// Das Haus hat mehrere Stockwerke. Jedes Stockwerk ist ein Gitter aus Räumen.
// Zwischen manchen Räumen gibt es Türen (oder große Durchgänge), und Treppen verbinden die Stockwerke.
// Jeder Raum hat ein Thema mit passenden Möbeln. Es wird jedes Level neu und zufällig gebaut!
//
// Damit Monster und Helfer immer durchkommen, bleibt in jedem Raum ein Kreuz in der Mitte frei
// (von Tür zu Tür). Die Möbel stehen in den vier Vierteln (Ecken) des Raumes.
const RAUM_ARTEN = [
  { id: 'wohnzimmer',   name: 'Wohnzimmer',    emoji: '🛋️', boden: 'holz',    haeufig: 3,   ecken: ['sofa', 'kamin', 'sessel', 'regal', 'standuhr'], teppich: true },
  { id: 'bibliothek',   name: 'Bibliothek',    emoji: '📚', boden: 'holz',    haeufig: 2,   ecken: ['regal', 'regal', 'regal', 'lesen', 'kamin'], teppich: true },
  { id: 'kueche',       name: 'Küche',         emoji: '🍳', boden: 'fliesen', haeufig: 1.5, ecken: ['kueche', 'kueche', 'kuechentisch', 'vorrat'] },
  { id: 'schlafzimmer', name: 'Schlafzimmer',  emoji: '🛏️', boden: 'teppich', haeufig: 2,   ecken: ['bett', 'schrank', 'kommode', 'sessel'] },
  { id: 'esszimmer',    name: 'Esszimmer',     emoji: '🍽️', boden: 'holz',    haeufig: 1.5, ecken: ['esstisch', 'esstisch', 'anrichte', 'standuhr', 'kamin'], kronleuchter: true },
  { id: 'abstellraum',  name: 'Abstellkammer', emoji: '📦', boden: 'beton',   haeufig: 1.2, ecken: ['kisten', 'kisten', 'metallregal', 'zugedeckt', 'zugedeckt'] },
];
const hausGruppe = new THREE.Group();
szene.add(hausGruppe);
let wandKoerper = [], sichtBlocker = [];   // sichtBlocker: Dadurch kann man nicht durchsehen (Wände, Decken, große Möbel)

// ----- Räume, Stockwerke und Wege -----
const proEtage = () => haus.breit * haus.tief;
const raumNr = (i, j, e) => e * proEtage() + j * haus.breit + i;
const etageVon = y => begrenzt(Math.floor((y + 1) / ETAGE_HOEHE), 0, haus.etagen - 1);
function raumNrVon(x, y, z) {   // In welchem Raum ist dieser Punkt?
  return raumNr(begrenzt(Math.floor(x / RAUM), 0, haus.breit - 1), begrenzt(Math.floor(z / RAUM), 0, haus.tief - 1), etageVon(y));
}
const tuerSchluessel = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
const verbunden = (a, b) => haus.tueren.has(tuerSchluessel(a, b));
function raumMitte(r) { const R = haus.raeume[r]; return { x: R.x0 + RAUM / 2, y: R.basis, z: R.z0 + RAUM / 2 }; }
function tuerPunkt(a, b) {   // Die Mitte der Tür zwischen Raum a und b (gleiches Stockwerk)
  const A = haus.raeume[a], B = haus.raeume[b];
  if (A.j === B.j) return { x: Math.max(A.i, B.i) * RAUM, y: A.basis, z: A.z0 + RAUM / 2 };
  return { x: A.x0 + RAUM / 2, y: A.basis, z: Math.max(A.j, B.j) * RAUM };
}
function nachbarn(r) {   // Räume daneben und (über Treppen) darüber/darunter
  const R = haus.raeume[r], liste = [];
  if (R.i > 0) liste.push(r - 1);
  if (R.i < haus.breit - 1) liste.push(r + 1);
  if (R.j > 0) liste.push(r - haus.breit);
  if (R.j < haus.tief - 1) liste.push(r + haus.breit);
  if (R.e > 0) liste.push(r - proEtage());
  if (R.e < haus.etagen - 1) liste.push(r + proEtage());
  return liste;
}
// Weg finden: Welcher Raum kommt als Nächstes, um von a nach b zu kommen? (Breitensuche)
function naechsterRaum(a, b) {
  if (a === b) return b;
  const vorher = new Map([[a, -1]]), schlange = [a];
  while (schlange.length) {
    const r = schlange.shift();
    if (r === b) break;
    for (const n of nachbarn(r)) if (!vorher.has(n) && verbunden(r, n)) { vorher.set(n, r); schlange.push(n); }
  }
  if (!vorher.has(b)) return a;
  let r = b;
  while (vorher.get(r) !== a) r = vorher.get(r);
  return r;
}
function raumAbstand(a, b) {   // Wie viele Türen liegen dazwischen?
  const tiefe = new Map([[a, 0]]), schlange = [a];
  while (schlange.length) {
    const r = schlange.shift();
    for (const n of nachbarn(r)) if (!tiefe.has(n) && verbunden(r, n)) { tiefe.set(n, tiefe.get(r) + 1); schlange.push(n); }
  }
  return tiefe.get(b) ?? 99;
}
// ----- Treppen -----
function treppenPunkte(t) {   // Wegpunkte, um die Treppe zu benutzen
  const b = t.basis, o = b + ETAGE_HOEHE;
  return {
    vor: { x: t.x0 + 0.6, y: b, z: t.z0 + 2.6 },     // vor der Treppe
    unten: { x: t.x0 + 0.6, y: b, z: t.z0 + 1.1 },   // unterste Stufe
    oben: { x: t.x0 + 8.9, y: o, z: t.z0 + 1.1 },    // oben angekommen
    absatz: { x: t.x0 + 9.2, y: o, z: t.z0 + 2.7 },  // weg vom Loch
  };
}
const aufRampe = (t, x, z) => x >= t.x0 + TREPPE.von && x <= t.x0 + TREPPE.bis && z >= t.z0 + TREPPE.z1 && z <= t.z0 + TREPPE.z2;
const rampenHoehe = (t, x) => t.basis + begrenzt((x - t.x0 - TREPPE.von) / (TREPPE.bis - TREPPE.von), 0, 1) * ETAGE_HOEHE;
const imLoch = (t, x, z) => x >= t.x0 + LOCH.x1 && x <= t.x0 + LOCH.x2 && z >= t.z0 + LOCH.z1 && z <= t.z0 + LOCH.z2;
// Auf welcher Höhe steht man hier? (für Monster, die keine Physik haben: die Fläche, die am nächsten an y ist)
function bodenHoeheBei(x, z, y) {
  let beste = 0, bestD = Infinity;
  const pruefe = h => { const d = Math.abs(h - y); if (d < bestD) { bestD = d; beste = h; } };
  for (let e = 0; e < haus.etagen; e++) {
    if (e > 0 && haus.treppen.some(t => t.e + 1 === e && imLoch(t, x, z))) continue;   // Da ist ein Loch
    pruefe(e * ETAGE_HOEHE);
  }
  // Auf der Rampe? Dann die Rampe nehmen, wenn sie nah genug ist (sonst läuft man unten durch)
  for (const t of haus.treppen) if (aufRampe(t, x, z) && Math.abs(rampenHoehe(t, x) - y) < 0.6) return rampenHoehe(t, x);
  return beste;
}
// Wohin muss jemand (Monster oder Helfer) jetzt laufen, um zum Ziel zu kommen? (durch Türen und über Treppen!)
// "wer" merkt sich, wie weit er auf einer Treppe schon ist (wer.tw)
function wegPunkt(wer, pos, ziel) {
  // Schon auf der Treppe? Dann erst fertig gehen!
  if (wer.tw) {
    const tw = wer.tw;
    while (tw.k < tw.reihe.length) {
      const q = tw.reihe[tw.k];
      if (abstand2D(pos.x, pos.z, q.x, q.z) < 0.6 && Math.abs(pos.y - q.y) < 1.6) tw.k++; else break;
    }
    if (tw.k < tw.reihe.length) return tw.reihe[tw.k];
    wer.tw = null;
  }
  const ra = raumNrVon(pos.x, pos.y, pos.z), rb = raumNrVon(ziel.x, ziel.y, ziel.z);
  if (ra === rb) return ziel;
  const n = naechsterRaum(ra, rb);
  if (n === ra) return ziel;
  if (haus.raeume[n].e !== haus.raeume[ra].e) {   // Treppe hoch oder runter
    const hoch = haus.raeume[n].e > haus.raeume[ra].e;
    const t = haus.treppeVon.get(hoch ? ra : n);
    const P = treppenPunkte(t);
    wer.tw = { k: 0, reihe: hoch ? [P.vor, P.unten, P.oben, P.absatz] : [P.absatz, P.oben, P.unten, P.vor] };
    return wer.tw.reihe[0];
  }
  const t = tuerPunkt(ra, n);
  if (abstand2D(pos.x, pos.z, t.x, t.z) < 0.7) return raumMitte(n);   // An der Tür: durch in den nächsten Raum!
  return t;
}

// ----- Bauklötze -----
// Nur Physik (unsichtbar): Dagegen stößt man
function festerKoerper(x, y, z, b, h, t, quaternion = null) {
  const k = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(b / 2, h / 2, t / 2)), material: standardMat, collisionFilterGroup: G_WAND });
  k.position.set(x, y, z);
  if (quaternion) k.quaternion.copy(quaternion);
  k.aabbNeedsUpdate = true;   // Wichtig: Sonst sucht der Physik-Strahl den Klotz an der falschen Stelle
  welt.addBody(k);
  wandKoerper.push(k);
}
// Ein fester Klotz (Wand): sieht man UND stößt man dagegen
function festerKlotz(x, y, z, b, h, t, mat, sicht = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  hausGruppe.add(mesh);
  festerKoerper(x, y, z, b, h, t);
  if (sicht) sichtBlocker.push(mesh);
  return mesh;
}
// Ein Wandstück von (x1,z1) nach (x2,z2) auf Höhe "basis", auf Wunsch mit Tür (tuer = Breite der Tür, 0 = keine)
function wandStueck(x1, z1, x2, z2, basis, tuer, mat) {
  const D = 0.3, laenge = Math.hypot(x2 - x1, z2 - z1), entlangX = z1 === z2;
  const stueck = (von, bis, unten, oben) => {
    const mitte = (von + bis) / 2, l = bis - von;
    if (l <= 0.01) return;
    if (entlangX) festerKlotz(x1 + mitte, basis + (unten + oben) / 2, z1, l, oben - unten, D, mat);
    else festerKlotz(x1, basis + (unten + oben) / 2, z1 + mitte, D, oben - unten, l, mat);
  };
  if (!tuer) { stueck(0, laenge, 0, WAND_HOEHE); return; }
  const a = laenge / 2 - tuer / 2, b = laenge / 2 + tuer / 2;
  stueck(0, a, 0, WAND_HOEHE);
  stueck(b, laenge, 0, WAND_HOEHE);
  stueck(a, b, TUER_HOEHE, WAND_HOEHE);   // Über der Tür
  for (const p of [a, b]) {   // Türrahmen
    if (entlangX) festerKlotz(x1 + p, basis + TUER_HOEHE / 2, z1, 0.12, TUER_HOEHE, D + 0.08, dunkelHolzMat, false);
    else festerKlotz(x1, basis + TUER_HOEHE / 2, z1 + p, D + 0.08, TUER_HOEHE, 0.12, dunkelHolzMat, false);
  }
}
// Eine Lampe (es gibt nur MAX_LAMPEN, sonst wird das Spiel langsam)
function lampeHinzu(x, y, z, farbe, staerke, weite, flackern) {
  if (haus.lampen >= MAX_LAMPEN) return false;
  haus.lampen++;
  const licht = new THREE.PointLight(farbe, staerke, weite, 1);
  licht.position.set(x, y, z);
  licht.userData.flackern = flackern;
  licht.userData.stark = staerke;
  hausGruppe.add(licht);
  return true;
}

// ----- Möbel bauen -----
// Jedes Möbel wird "lokal" gebaut: Der Rücken ist bei z = 0 (an der Wand), vorne ist +z, die Breite geht entlang x.
// Danach wird es an die richtige Stelle im Raum gedreht und geschoben.
function neuesMoebel() {
  const m = { g: new THREE.Group(), boxen: [], ablagen: [], blocker: [], lichter: [] };
  // b, h, t = Breite, Höhe, Tiefe   x, y, z = Mitte
  m.box = (b, h, t, x, y, z, mat, o = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = o.schatten !== false;
    mesh.receiveShadow = true;
    m.g.add(mesh);
    if (o.fest) m.boxen.push({ x, y, z, b, h, t });   // Dagegen stößt man
    if (o.blockt) m.blocker.push(mesh);               // Dadurch sieht man nicht
    return mesh;
  };
  m.teil = (geo, mat, x, y, z) => { const mesh = new THREE.Mesh(geo, mat); mesh.position.set(x, y, z); m.g.add(mesh); return mesh; };
  m.ablage = (x, z, b, t, y) => m.ablagen.push({ x, z, b, t, y });   // Hier können Schätze liegen
  // Ein Tisch, unter den man geduckt kriechen kann (nur Platte und Beine sind fest)
  m.tisch = (b, t, x, z, hoehe = 0.78, mat = holzMat) => {
    m.box(b, 0.06, t, x, hoehe, z, mat, { fest: true, blockt: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) m.box(0.08, hoehe, 0.08, x + sx * (b / 2 - 0.08), hoehe / 2, z + sz * (t / 2 - 0.08), mat, { fest: true });
    m.ablage(x, z, b - 0.25, t - 0.25, hoehe + 0.03);
  };
  m.stuhl = (x, z, dreh) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z); s.rotation.y = dreh;
    const teil = (b, h, t, px, py, pz) => { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), dunkelHolzMat); k.position.set(px, py, pz); k.castShadow = true; s.add(k); };
    teil(0.45, 0.05, 0.45, 0, 0.47, 0);
    teil(0.45, 0.55, 0.05, 0, 0.75, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) teil(0.05, 0.47, 0.05, sx * 0.19, 0.235, sz * 0.19);
    m.g.add(s);
    m.boxen.push({ x, y: 0.5, z, b: 0.45, h: 1.0, t: 0.45 });
  };
  m.sessel = (x, z, stoff) => {
    m.box(0.85, 0.45, 0.8, x, 0.225, z + 0.4, stoff, { fest: true });
    m.box(0.85, 0.6, 0.18, x, 0.75, z + 0.09, stoff, { fest: true });
    for (const s of [-1, 1]) m.box(0.15, 0.25, 0.8, x + s * 0.42, 0.55, z + 0.4, stoff);
  };
  return m;
}
const MOEBEL = {
  sofa() {   // Sofa mit Couchtisch davor
    const m = neuesMoebel(), stoff = auswahl(STOFFE);
    m.box(2.2, 0.45, 0.9, 0, 0.225, 0.45, stoff, { fest: true });
    m.box(2.2, 0.55, 0.2, 0, 0.72, 0.1, stoff, { fest: true });
    for (const s of [-1, 1]) m.box(0.2, 0.3, 0.9, s * 1.0, 0.6, 0.45, stoff);
    for (const s of [-0.5, 0.5]) m.box(0.9, 0.12, 0.6, s, 0.5, 0.5, stoff, { schatten: false });   // Kissen
    m.box(1.2, 0.42, 0.6, 0, 0.21, 1.6, dunkelHolzMat, { fest: true });                         // Couchtisch
    m.ablage(0, 1.6, 0.9, 0.4, 0.45);
    return m;
  },
  kamin() {   // Kamin mit flackerndem Feuer
    const m = neuesMoebel();
    m.box(1.8, 1.3, 0.55, 0, 0.65, 0.275, steinMat, { fest: true, blockt: true });
    m.box(0.9, 0.7, 0.05, 0, 0.4, 0.56, schwarzMat, { schatten: false });
    m.box(2.0, 0.08, 0.7, 0, 1.34, 0.35, dunkelHolzMat, { fest: true });   // Kaminsims
    m.ablage(0, 0.4, 1.6, 0.4, 1.4);
    for (const x of [-0.18, 0, 0.18]) {
      const f = m.teil(new THREE.ConeGeometry(0.12, 0.4, 6), feuerMat, x, 0.25, 0.45);
      f.userData.feuer = true;
    }
    m.lichter.push({ x: 0, y: 0.6, z: 1.0, farbe: '#ff8a3d', staerke: 1.8, weite: 8, flackern: 'feuer' });
    return m;
  },
  sessel() {   // Sessel, Beistelltisch und Stehlampe
    const m = neuesMoebel();
    m.sessel(-0.6, 0, auswahl(STOFFE));
    m.box(0.5, 0.6, 0.5, 0.45, 0.3, 0.45, dunkelHolzMat, { fest: true });
    m.ablage(0.45, 0.45, 0.3, 0.3, 0.63);
    m.teil(new THREE.CylinderGeometry(0.02, 0.02, 1.5), metallGrauMat, 1.0, 0.75, 0.3);
    m.teil(new THREE.ConeGeometry(0.22, 0.25, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#e8d9b5', emissive: '#6b5a30', side: THREE.DoubleSide }), 1.0, 1.55, 0.3);
    return m;
  },
  regal() {   // Bücherregal (bis fast an die Decke)
    const m = neuesMoebel();
    m.box(2.0, 2.4, 0.45, 0, 1.2, 0.225, dunkelHolzMat, { fest: true, blockt: true });
    for (let k = 0; k < 4; k++) m.teil(new THREE.PlaneGeometry(1.8, 0.45), buecherMat, 0, 0.35 + k * 0.55, 0.455);
    return m;
  },
  standuhr() {   // Große alte Standuhr
    const m = neuesMoebel();
    m.box(0.55, 2.1, 0.4, 0, 1.05, 0.2, dunkelHolzMat, { fest: true, blockt: true });
    m.teil(new THREE.CircleGeometry(0.2, 20), weissMat, 0, 1.75, 0.405);
    const pendel = m.teil(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14), goldMat, 0, 0.9, 0.41);
    pendel.rotation.x = Math.PI / 2;
    pendel.userData.pendel = true;
    return m;
  },
  lesen() {   // Leseecke: Sessel und runder Tisch
    const m = neuesMoebel();
    m.sessel(-0.7, 0.1, auswahl(STOFFE));
    m.teil(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), holzMat, 0.6, 0.72, 0.9).castShadow = true;
    m.teil(new THREE.CylinderGeometry(0.06, 0.1, 0.72, 8), holzMat, 0.6, 0.36, 0.9);
    m.boxen.push({ x: 0.6, y: 0.37, z: 0.9, b: 0.8, h: 0.74, t: 0.8 });
    m.ablage(0.6, 0.9, 0.5, 0.5, 0.76);
    return m;
  },
  kueche() {   // Küchenzeile mit Herd und Hängeschränken
    const m = neuesMoebel();
    m.box(3.2, 0.88, 0.65, 0, 0.44, 0.325, weissMat, { fest: true });
    m.box(3.25, 0.05, 0.7, 0, 0.9, 0.35, marmorMat, { fest: true });
    m.ablage(-0.6, 0.35, 1.8, 0.45, 0.93);
    for (let k = 0; k < 4; k++) m.box(0.02, 0.6, 0.01, -1.2 + k * 0.8, 0.45, 0.655, schwarzMat, { schatten: false });   // Schranktüren
    for (const [x, z] of [[1.0, 0.22], [1.3, 0.22], [1.0, 0.48], [1.3, 0.48]]) m.teil(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), schwarzMat, x, 0.935, z);   // Herdplatten
    m.box(3.2, 0.6, 0.35, 0, 1.9, 0.175, weissMat, { blockt: true });   // Hängeschränke
    return m;
  },
  kuechentisch() {   // Küchentisch mit Stühlen (frei im Raum)
    const m = neuesMoebel();
    m.tisch(1.4, 0.9, 0, 0, 0.78, hellHolzMat);
    m.stuhl(-0.4, -0.75, 0); m.stuhl(0.4, -0.75, 0); m.stuhl(-0.4, 0.75, Math.PI); m.stuhl(0.4, 0.75, Math.PI);
    m.mitte = true;
    return m;
  },
  vorrat() {   // Vorratsschrank
    const m = neuesMoebel();
    m.box(1.2, 2.1, 0.55, 0, 1.05, 0.275, hellHolzMat, { fest: true, blockt: true });
    m.box(0.02, 1.9, 0.01, 0, 1.05, 0.555, schwarzMat, { schatten: false });
    return m;
  },
  bett() {   // Bett mit Nachttisch
    const m = neuesMoebel(), decke = auswahl(STOFFE);
    m.box(1.6, 0.4, 2.1, -0.4, 0.2, 1.05, dunkelHolzMat, { fest: true });
    m.box(1.5, 0.2, 2.0, -0.4, 0.5, 1.05, weissMat, { fest: true });
    m.box(1.55, 0.08, 1.4, -0.4, 0.62, 1.35, decke, { schatten: false });
    m.box(0.6, 0.12, 0.35, -0.75, 0.66, 0.3, weissMat, { schatten: false });
    m.box(0.6, 0.12, 0.35, -0.05, 0.66, 0.3, weissMat, { schatten: false });
    m.box(1.6, 1.1, 0.08, -0.4, 0.55, 0.04, dunkelHolzMat, { fest: true });   // Kopfteil
    m.box(0.5, 0.6, 0.45, 0.8, 0.3, 0.25, dunkelHolzMat, { fest: true });     // Nachttisch
    m.ablage(0.8, 0.25, 0.3, 0.25, 0.63);
    return m;
  },
  schrank() {   // Kleiderschrank
    const m = neuesMoebel();
    m.box(1.6, 2.2, 0.6, 0, 1.1, 0.3, dunkelHolzMat, { fest: true, blockt: true });
    m.box(0.02, 2.0, 0.01, 0, 1.1, 0.605, schwarzMat, { schatten: false });
    for (const s of [-1, 1]) m.box(0.04, 0.15, 0.03, s * 0.08, 1.1, 0.62, goldMat, { schatten: false });
    return m;
  },
  kommode() {   // Kommode mit Spiegel
    const m = neuesMoebel();
    m.box(1.4, 0.9, 0.5, 0, 0.45, 0.25, holzMat, { fest: true });
    for (let k = 0; k < 3; k++) m.box(1.3, 0.02, 0.01, 0, 0.2 + k * 0.25, 0.505, schwarzMat, { schatten: false });
    m.ablage(0, 0.25, 1.1, 0.3, 0.93);
    m.box(0.9, 0.8, 0.04, 0, 1.6, 0.03, new THREE.MeshStandardMaterial({ color: '#9fb4c7', metalness: 0.9, roughness: 0.05 }), { schatten: false });
    return m;
  },
  esstisch() {   // Langer Esstisch mit 6 Stühlen (frei im Raum)
    const m = neuesMoebel();
    m.tisch(2.2, 1.0, 0, 0, 0.78, dunkelHolzMat);
    for (const x of [-0.7, 0, 0.7]) { m.stuhl(x, -0.8, 0); m.stuhl(x, 0.8, Math.PI); }
    m.teil(new THREE.CylinderGeometry(0.03, 0.05, 0.25), goldMat, 0, 0.93, 0);   // Kerzenständer
    m.teil(new THREE.ConeGeometry(0.025, 0.06, 6), feuerMat, 0, 1.08, 0);
    m.mitte = true;
    return m;
  },
  anrichte() {   // Anrichte (Sideboard)
    const m = neuesMoebel();
    m.box(1.8, 0.9, 0.5, 0, 0.45, 0.25, dunkelHolzMat, { fest: true });
    m.ablage(0, 0.25, 1.5, 0.3, 0.93);
    for (const x of [-0.45, 0.45]) m.box(0.8, 0.7, 0.01, x, 0.45, 0.505, holzMat, { schatten: false });
    return m;
  },
  kisten() {   // Ein Stapel alter Kisten
    const m = neuesMoebel();
    let x = -1.2;
    while (x < 0.7) {
      const g = zufall(0.6, 0.9);
      m.box(g, g, g, x + g / 2, g / 2, g / 2 + 0.05, kistenMat, { fest: true, blockt: g > 0.8 });
      if (Math.random() < 0.5) { const k = g * 0.7; m.box(k, k, k, x + g / 2, g + k / 2, g / 2 + 0.05, kistenMat, { fest: true }); }
      else m.ablage(x + g / 2, g / 2 + 0.05, g - 0.2, g - 0.2, g + 0.02);
      x += g + 0.1;
    }
    return m;
  },
  metallregal() {   // Metallregal mit Kartons
    const m = neuesMoebel();
    m.box(1.8, 2.0, 0.5, 0, 1.0, 0.25, metallGrauMat, { fest: true, blockt: true });
    for (let k = 0; k < 3; k++) for (let n = 0; n < 3; n++) if (Math.random() < 0.7) m.box(0.45, 0.35, 0.4, -0.6 + n * 0.6, 0.38 + k * 0.62, 0.28, kistenMat, { schatten: false });
    return m;
  },
  zugedeckt() {   // Alte Möbel unter weißen Tüchern (gruselig!)
    const m = neuesMoebel();
    m.box(1.4, 1.0, 0.8, -0.4, 0.5, 0.45, tuchMat, { fest: true });
    m.box(0.8, 1.5, 0.6, 0.8, 0.75, 0.35, tuchMat, { fest: true, blockt: true });
    return m;
  },
};

// Stellt ein Möbel an seinen Platz im Raum: px, pz = Position, winkel = Drehung (nur 0, 90, 180, 270 Grad)
function platziere(R, m, px, pz, winkel) {
  m.g.position.set(px, R.basis, pz);
  m.g.rotation.y = winkel;
  hausGruppe.add(m.g);
  const c = Math.round(Math.cos(winkel)), s = Math.round(Math.sin(winkel)), quer = s !== 0;
  const nachWelt = (lx, lz) => ({ x: px + lx * c + lz * s, z: pz - lx * s + lz * c });
  for (const k of m.boxen) {
    const w = nachWelt(k.x, k.z), b = quer ? k.t : k.b, t = quer ? k.b : k.t;
    festerKoerper(w.x, R.basis + k.y, w.z, b, k.h, t);
    R.belegt.push([w.x - b / 2, w.z - t / 2, w.x + b / 2, w.z + t / 2]);
  }
  for (const a of m.ablagen) { const w = nachWelt(a.x, a.z); R.ablagen.push({ x: w.x, z: w.z, b: quer ? a.t : a.b, t: quer ? a.b : a.t, y: R.basis + a.y }); }
  sichtBlocker.push(...m.blocker);
  for (const l of m.lichter) { const w = nachWelt(l.x, l.z); lampeHinzu(w.x, R.basis + l.y, w.z, l.farbe, l.staerke, l.weite, l.flackern); }
  m.g.traverse(o => { if (o.userData.feuer || o.userData.pendel) haus.bewegteDeko.push(o); });
}
// Stellt ein Möbel mit dem Rücken an eine Wand im Viertel q (0 bis 3) des Raumes
function inViertel(R, q, m) {
  const qx = q % 2, qz = q >> 1;
  if (m.mitte) {   // Frei stehend: in die Mitte vom Viertel
    platziere(R, m, R.x0 + (qx ? 7.95 : 2.05), R.z0 + (qz ? 7.95 : 2.05), auswahl([0, Math.PI / 2]));
    return;
  }
  // Nicht vor einen großen Durchgang stellen!
  const seiten = [qz === 0 ? 'n' : 's', qx === 0 ? 'w' : 'o'].filter(sd => (R.tuer[sd] || 0) <= TUER_BREITE);
  if (!seiten.length) return;
  const seite = auswahl(seiten);
  const a = qx === 0 ? 2.05 : 7.95, b = qz === 0 ? 2.05 : 7.95;   // Mitte vom Viertel entlang der Wand
  if (seite === 'n') platziere(R, m, R.x0 + a, R.z0 + 0.15, 0);
  if (seite === 's') platziere(R, m, R.x0 + a, R.z0 + RAUM - 0.15, Math.PI);
  if (seite === 'w') platziere(R, m, R.x0 + 0.15, R.z0 + b, Math.PI / 2);
  if (seite === 'o') platziere(R, m, R.x0 + RAUM - 0.15, R.z0 + b, -Math.PI / 2);
}

// ----- Die Treppe bauen -----
function baueTreppe(t) {
  const x1 = t.x0 + TREPPE.von, x2 = t.x0 + TREPPE.bis, z1 = t.z0 + TREPPE.z1, z2 = t.z0 + TREPPE.z2;
  const lauf = x2 - x1, breite = z2 - z1, winkel = Math.atan2(ETAGE_HOEHE, lauf), zm = (z1 + z2) / 2;
  // Physik: eine schräge Platte (darauf kann man hoch- und runterlaufen)
  const laenge = Math.hypot(lauf, ETAGE_HOEHE), dicke = 0.15;
  const q = new CANNON.Quaternion(); q.setFromEuler(0, 0, winkel);
  festerKoerper((x1 + x2) / 2 + Math.sin(winkel) * dicke / 2, t.basis + ETAGE_HOEHE / 2 - Math.cos(winkel) * dicke / 2, zm, laenge, dicke, breite, q);
  // Festes Geländer an der offenen Seite (damit niemand seitlich runterfällt)
  festerKoerper((x1 + x2) / 2 - Math.sin(winkel) * 0.5, t.basis + ETAGE_HOEHE / 2 + Math.cos(winkel) * 0.5, z2 + 0.04, laenge, 1.0, 0.08, q);
  // Unter der Treppe ist es fest (sonst könnte man in die Stufen hineinlaufen)
  festerKoerper(x1 + 3.6, t.basis + 0.5, zm, 2.0, 1.0, breite);
  festerKoerper((x1 + 4.6 + x2) / 2, t.basis + 1.0, zm, x2 - x1 - 4.6, 2.0, breite);
  // Aussehen: einzelne Stufen
  const stufen = 18, stufeX = lauf / stufen, stufeY = ETAGE_HOEHE / stufen;
  for (let k = 0; k < stufen; k++) {
    const stufe = new THREE.Mesh(new THREE.BoxGeometry(stufeX + 0.02, stufeY * (k + 1), breite), k % 2 ? holzMat : dunkelHolzMat);
    stufe.position.set(x1 + stufeX * (k + 0.5), t.basis + stufeY * (k + 1) / 2, zm);
    stufe.castShadow = stufe.receiveShadow = true;
    hausGruppe.add(stufe);
  }
  // Geländer an der offenen Seite (Pfosten und Handlauf)
  for (let k = 0; k <= 6; k++) {
    const x = x1 + lauf * k / 6, y = t.basis + ETAGE_HOEHE * k / 6;
    const pfosten = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), dunkelHolzMat);
    pfosten.position.set(x, y + 0.48, z2 - 0.05);
    hausGruppe.add(pfosten);
  }
  const lauf3 = new THREE.Mesh(new THREE.BoxGeometry(laenge, 0.06, 0.08), dunkelHolzMat);
  lauf3.position.set((x1 + x2) / 2, t.basis + ETAGE_HOEHE / 2 + 0.95, z2 - 0.05);
  lauf3.rotation.z = winkel;
  hausGruppe.add(lauf3);
  // Oben: Geländer um das Loch, damit man nicht runterfällt (die Ostseite bleibt offen – da kommt man an)
  const o = t.basis + ETAGE_HOEHE;
  festerKlotz((t.x0 + LOCH.x1 + t.x0 + LOCH.x2) / 2, o + 0.5, t.z0 + LOCH.z2 + 0.04, LOCH.x2 - LOCH.x1, 1.0, 0.08, dunkelHolzMat, false);
  festerKlotz(t.x0 + LOCH.x1 - 0.04, o + 0.5, t.z0 + (LOCH.z1 + LOCH.z2) / 2, 0.08, 1.0, LOCH.z2 - LOCH.z1, dunkelHolzMat, false);
}
// Boden/Decke zwischen zwei Stockwerken für einen Raum (mit Loch, wenn von unten eine Treppe hochkommt)
function baueZwischendecke(R, boden) {
  const y = R.basis - 0.1, x0 = R.x0, z0 = R.z0;
  const mats = [deckenMat, deckenMat, boden, deckenMat, deckenMat, deckenMat];   // oben Boden, unten Decke
  const platte = (xa, za, xb, zb) => {
    const b = xb - xa, t = zb - za;
    if (b <= 0.01 || t <= 0.01) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, 0.2, t), mats);
    mesh.position.set((xa + xb) / 2, y, (za + zb) / 2);
    mesh.receiveShadow = true;
    hausGruppe.add(mesh);
    sichtBlocker.push(mesh);
    festerKoerper((xa + xb) / 2, y, (za + zb) / 2, b, 0.2, t);
  };
  if (!R.treppeRunter) { platte(x0, z0, x0 + RAUM, z0 + RAUM); return; }
  platte(x0, z0 + LOCH.z2, x0 + RAUM, z0 + RAUM);             // Süden
  platte(x0, z0, x0 + LOCH.x1, z0 + LOCH.z2);                 // Westen
  platte(x0 + LOCH.x2, z0, x0 + RAUM, z0 + LOCH.z2);          // Osten
}

function hausAufraeumen() {
  while (hausGruppe.children.length) {
    const o = hausGruppe.children[0];
    hausGruppe.remove(o);
    o.traverse(k => { if (k.geometry) k.geometry.dispose(); });
  }
  for (const k of wandKoerper) welt.removeBody(k);
  for (const s of schaetze) { welt.removeBody(s.body); szene.remove(s.mesh); }
  for (const m of monster) szene.remove(m.mesh);
  for (const h of helfer) { welt.removeBody(h.body); szene.remove(h.teile.g); szene.remove(h.strahl.g); }
  for (const s of splitter) szene.remove(s.mesh);
  wandKoerper = []; sichtBlocker = []; schaetze = []; monster = []; helfer = []; splitter = []; schwebeTexte = []; funk = [];
  gegriffen = null; schwebend = null;
}

function baueHaus() {
  hausAufraeumen();
  ld = levelDaten(level);
  haus = { breit: ld.breit, tief: ld.tief, etagen: ld.etagen, tueren: new Map(), lampen: 0, raeume: [], bewegteDeko: [], treppen: [], treppeVon: new Map() };
  const FL = proEtage(), anzahl = FL * haus.etagen;
  for (let r = 0; r < anzahl; r++) {
    const e = Math.floor(r / FL), i = (r % FL) % haus.breit, j = Math.floor((r % FL) / haus.breit);
    haus.raeume.push({ nr: r, i, j, e, basis: e * ETAGE_HOEHE, x0: i * RAUM, z0: j * RAUM, belegt: [], ablagen: [], tuer: {}, treppeHoch: null, treppeRunter: null });
  }
  haus.start = raumNr(0, Math.floor(haus.tief / 2), 0);
  const startR = haus.raeume[haus.start];
  // 1. Treppen: Für jedes Stockwerk eine Stelle aussuchen (nicht über dem Transporter, jede an einer anderen Stelle)
  const benutzt = new Set([`${startR.i},${startR.j}`]);
  const gesperrt = new Set();   // Türen, die es wegen der Treppe nicht geben darf (an der Nordwand)
  for (let e = 0; e < haus.etagen - 1; e++) {
    let i, j;
    do { i = zufallGanz(0, haus.breit - 1); j = zufallGanz(0, haus.tief - 1); } while (benutzt.has(`${i},${j}`));
    benutzt.add(`${i},${j}`);
    const unten = raumNr(i, j, e), oben = raumNr(i, j, e + 1);
    const t = { e, i, j, unten, oben, x0: i * RAUM, z0: j * RAUM, basis: e * ETAGE_HOEHE };
    haus.treppen.push(t);
    haus.treppeVon.set(unten, t);
    haus.raeume[unten].treppeHoch = t;
    haus.raeume[oben].treppeRunter = t;
    if (j > 0) { gesperrt.add(tuerSchluessel(unten, unten - haus.breit)); gesperrt.add(tuerSchluessel(oben, oben - haus.breit)); }
  }
  // 2. Türen: Pro Stockwerk erst ein Weg zu jedem Raum (wie ein Labyrinth), dann noch ein paar Abkürzungen
  const verbinde = (a, b) => haus.tueren.set(tuerSchluessel(a, b), Math.random() < 0.2 ? DURCHGANG_BREITE : TUER_BREITE);
  const gleicheEtage = r => nachbarn(r).filter(n => haus.raeume[n].e === haus.raeume[r].e && !gesperrt.has(tuerSchluessel(r, n)));
  for (let e = 0; e < haus.etagen; e++) {
    const wurzel = e === 0 ? haus.start : haus.treppen[e - 1].oben;
    const besucht = new Set([wurzel]), stapel = [wurzel];
    while (stapel.length) {
      const r = stapel[stapel.length - 1];
      const frei = gleicheEtage(r).filter(n => !besucht.has(n));
      if (!frei.length) { stapel.pop(); continue; }
      const n = auswahl(frei);
      verbinde(r, n); besucht.add(n); stapel.push(n);
    }
  }
  for (let r = 0; r < anzahl; r++) for (const n of gleicheEtage(r)) if (n > r && !verbunden(r, n) && Math.random() < 0.3) verbinde(r, n);
  for (const t of haus.treppen) haus.tueren.set(tuerSchluessel(t.unten, t.oben), -1);   // Treppe = Verbindung nach oben
  // Wie breit sind die Türen an jeder Seite? (0 = keine Tür)
  for (const R of haus.raeume) {
    const breite = n => haus.tueren.get(tuerSchluessel(R.nr, n)) || 0;
    R.tuer = { n: R.j > 0 ? breite(R.nr - haus.breit) : 0, s: R.j < haus.tief - 1 ? breite(R.nr + haus.breit) : 0, w: R.i > 0 ? breite(R.nr - 1) : 0, o: R.i < haus.breit - 1 ? breite(R.nr + 1) : 0 };
  }

  // 3. Räume mit Thema: Böden und Zwischendecken
  for (const R of haus.raeume) {
    R.art = R.nr === haus.start ? { id: 'garage', name: 'Garage', emoji: '🚚', boden: 'beton', ecken: [] } : gewichtetWaehlen(RAUM_ARTEN);
    const t = BOEDEN[R.art.boden].clone(); t.needsUpdate = true;
    t.repeat.set(R.art.boden === 'holz' ? 3.3 : 5, R.art.boden === 'holz' ? 3.3 : 5);
    const bodenMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
    if (R.e === 0) {
      const boden = new THREE.Mesh(new THREE.PlaneGeometry(RAUM, RAUM), bodenMat);
      boden.rotation.x = -Math.PI / 2; boden.position.set(R.x0 + RAUM / 2, 0, R.z0 + RAUM / 2); boden.receiveShadow = true;
      hausGruppe.add(boden);
    } else baueZwischendecke(R, bodenMat);
  }
  const B = haus.breit * RAUM, T = haus.tief * RAUM, dach = (haus.etagen - 1) * ETAGE_HOEHE + WAND_HOEHE;
  const decke = deckenTextur.clone(); decke.needsUpdate = true; decke.repeat.set(B / 2, T / 2);
  const deckenMesh = new THREE.Mesh(new THREE.PlaneGeometry(B, T), new THREE.MeshStandardMaterial({ map: decke, roughness: 1 }));
  deckenMesh.rotation.x = Math.PI / 2; deckenMesh.position.set(B / 2, dach, T / 2);
  hausGruppe.add(deckenMesh);
  deckenKoerper.position.y = dach;
  deckenKoerper.aabbNeedsUpdate = true;

  // 4. Wände (mit Türen, wo Räume verbunden sind) – in jedem Stockwerk
  const tapete = () => new THREE.MeshStandardMaterial({ map: auswahl(TAPETEN), roughness: 0.9 });
  for (let e = 0; e < haus.etagen; e++) {
    const basis = e * ETAGE_HOEHE;
    for (let j = 0; j <= haus.tief; j++) for (let i = 0; i < haus.breit; i++) {   // Wände entlang x
      const tuer = j > 0 && j < haus.tief ? haus.tueren.get(tuerSchluessel(raumNr(i, j - 1, e), raumNr(i, j, e))) || 0 : 0;
      wandStueck(i * RAUM, j * RAUM, (i + 1) * RAUM, j * RAUM, basis, tuer, tapete());
    }
    for (let i = 0; i <= haus.breit; i++) for (let j = 0; j < haus.tief; j++) {   // Wände entlang z
      const tuer = i > 0 && i < haus.breit ? haus.tueren.get(tuerSchluessel(raumNr(i - 1, j, e), raumNr(i, j, e))) || 0 : 0;
      wandStueck(i * RAUM, j * RAUM, i * RAUM, (j + 1) * RAUM, basis, tuer, tapete());
    }
  }
  for (const t of haus.treppen) baueTreppe(t);

  // 5. Der Transporter (Abgabe-Zone) im Startraum, an der linken Wand
  const S = startR;
  haus.laster = { x1: 0.15, x2: 3.5, z1: S.z0 + 3.0, z2: S.z0 + 7.0 };
  const L = haus.laster;
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(L.x2 - L.x1, L.z2 - L.z1), new THREE.MeshBasicMaterial({ color: '#1f8a64', transparent: true, opacity: 0.35 }));
  zone.rotation.x = -Math.PI / 2; zone.position.set((L.x1 + L.x2) / 2, 0.02, (L.z1 + L.z2) / 2);
  hausGruppe.add(zone);
  const randMat = new THREE.MeshStandardMaterial({ color: '#7cf5c6', emissive: '#2aa77a', emissiveIntensity: 0.8 });
  festerKlotz((L.x1 + L.x2) / 2, 0.2, L.z1, L.x2 - L.x1, 0.4, 0.15, randMat, false);
  festerKlotz((L.x1 + L.x2) / 2, 0.2, L.z2, L.x2 - L.x1, 0.4, 0.15, randMat, false);
  const schild = schildMesh('🚚 ARAG-ABGABE', 2.6, 0.65);
  schild.position.set(0.17, 2.4, (L.z1 + L.z2) / 2); schild.rotation.y = Math.PI / 2;
  hausGruppe.add(schild);
  lampeHinzu(S.x0 + RAUM / 2, WAND_HOEHE - 0.4, S.z0 + RAUM / 2, '#c8ffe8', 2.2, 11, false);
  for (const [x, z] of [[8.6, 6.2], [8.9, 7.1], [8.6, 8.7]]) festerKlotz(S.x0 + x, 0.35, S.z0 + z, 0.7, 0.7, 0.7, kistenMat);   // Kisten (Deko)

  // 6. Möbel, Deko und Schätze in allen anderen Räumen
  for (const R of haus.raeume) if (R.nr !== haus.start) raumEinrichten(R);
  for (const R of haus.raeume) wandDeko(R);

  // 7. Monster in Räumen weit weg vom Start (auch in den oberen Stockwerken!)
  const weit = [];
  for (let r = 0; r < anzahl; r++) if (raumAbstand(haus.start, r) >= MONSTER_START_ABSTAND) weit.push(r);
  if (!weit.length) for (let r = 0; r < anzahl; r++) if (raumAbstand(haus.start, r) >= 2) weit.push(r);
  if (!weit.length) for (let r = 0; r < anzahl; r++) if (r !== haus.start) weit.push(r);
  for (let k = 0; k < ld.geister; k++) neuesMonster('geist', auswahl(weit));
  for (let k = 0; k < ld.lauscher; k++) neuesMonster('lauscher', auswahl(weit));
  for (let k = 0; k < ld.starrer; k++) neuesMonster('starrer', auswahl(weit));

  // 8. Du startest in der Mitte vom Startraum und schaust zum Transporter. Deine Helfer stehen neben dir.
  ducken(false);
  spielerKoerper.position.set(RAUM / 2, KOERPER_RADIUS + 0.05, S.z0 + RAUM / 2);
  spielerKoerper.velocity.set(0, 0, 0);
  blick.links = Math.PI / 2; blick.hoch = -0.1;
  for (let k = 0; k < Math.min(HELFER_ANZAHL, HELFER.length); k++) neuerHelfer(HELFER[k], RAUM / 2 + 1.2, S.z0 + 3.5 + k * 3);
}

// Einen Raum einrichten: Lampe, Möbel in den Ecken, Teppich, Spinnweben, Schätze
function raumEinrichten(R) {
  const art = R.art, cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2, b0 = R.basis;
  // Treppenräume: Der Streifen an der Nordwand gehört der Treppe
  const treppe = R.treppeHoch || R.treppeRunter;
  if (treppe) R.belegt.push([R.x0 + 0.1, R.z0 + 0.1, R.x0 + RAUM - 0.1, R.z0 + 2.8]);
  // Möbel: 3 oder 4 Viertel bekommen etwas aus der Liste des Raumes (bei Treppen nur die südlichen)
  const viertel = mischen(treppe ? [2, 3] : [0, 1, 2, 3]).slice(0, treppe ? 2 : zufallGanz(3, 4));
  const liste = mischen(art.ecken);
  viertel.forEach((q, k) => inViertel(R, q, MOEBEL[liste[k % liste.length]]()));
  // Teppich in der Mitte
  if (art.teppich && Math.random() < 0.7) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshStandardMaterial({ map: teppichTextur, roughness: 1 }));
    t.rotation.x = -Math.PI / 2; t.rotation.z = auswahl([0, Math.PI / 2]); t.position.set(cx, b0 + 0.006, cz + (treppe ? 1 : 0)); t.receiveShadow = true;
    hausGruppe.add(t);
  }
  // Licht: Kronleuchter oder einfache Glühbirne (nicht überall – manche Räume sind stockdunkel!)
  if (Math.random() < 0.5 && lampeHinzu(cx, b0 + WAND_HOEHE - 0.5, cz, art.kronleuchter ? '#ffd9a0' : '#ffcf8a', 1.4, 11, Math.random() < 0.4)) {
    if (art.kronleuchter) {
      const k = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 20), goldMat);
      ring.rotation.x = Math.PI / 2;
      k.add(ring);
      for (let n = 0; n < 6; n++) {
        const a = n / 6 * Math.PI * 2;
        const kerze = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: '#ffe2b0' }));
        kerze.position.set(Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45);
        k.add(kerze);
      }
      const kette = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5), goldMat);
      kette.position.y = 0.25;
      k.add(kette);
      k.position.set(cx, b0 + WAND_HOEHE - 0.6, cz);
      hausGruppe.add(k);
    } else {
      const birne = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe2b0' }));
      birne.position.set(cx, b0 + WAND_HOEHE - 0.5, cz);
      hausGruppe.add(birne);
    }
  }
  // Spinnweben in den oberen Ecken
  for (const [ex, ez, dreh] of [[0.16, 0.16, 0], [RAUM - 0.16, 0.16, -Math.PI / 2], [RAUM - 0.16, RAUM - 0.16, Math.PI], [0.16, RAUM - 0.16, Math.PI / 2]]) {
    if (Math.random() < 0.55) continue;
    const netz = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: netzTextur, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    netz.position.set(R.x0 + ex, b0 + WAND_HOEHE - 0.45, R.z0 + ez);
    netz.rotation.y = dreh + Math.PI / 4;
    netz.translateZ(0.5);   // Schräg in die Ecke
    hausGruppe.add(netz);
  }
  // Schätze: manche auf Möbeln, manche auf dem Boden
  const anzahl = zufallGanz(1, 3);
  const frei = (x1, z1, x2, z2) => R.belegt.every(b => x2 < b[0] || x1 > b[2] || z2 < b[1] || z1 > b[3]);
  for (let k = 0; k < anzahl; k++) {
    const typ = gewichtetWaehlen(SCHAETZE);
    const [sb, sh, st] = typ.groesse;
    if (!typ.boden && R.ablagen.length && Math.random() < 0.65) {
      const a = auswahl(R.ablagen);
      neuerSchatz(typ, a.x + zufall(-a.b / 2, a.b / 2) * 0.7, a.y + sh / 2 + 0.03, a.z + zufall(-a.t / 2, a.t / 2) * 0.7);
      continue;
    }
    for (let versuch = 0; versuch < 25; versuch++) {
      const x = R.x0 + zufall(0.9, RAUM - 0.9), z = R.z0 + zufall(0.9, RAUM - 0.9);
      const g = Math.max(sb, st) / 2 + 0.15;
      if (!frei(x - g, z - g, x + g, z + g)) continue;
      if (Math.abs(x - cx) < 1.3 + g || Math.abs(z - cz) < 1.3 + g) continue;   // Die Wege in der Mitte frei lassen
      neuerSchatz(typ, x, b0 + sh / 2 + 0.03, z);
      R.belegt.push([x - g, z - g, x + g, z + g]);
      break;
    }
  }
}
// Mitte jeder Wand: Ist da keine Tür, kommt ein Fenster (Außenwand) oder ein Bild (Innenwand) hin
function wandDeko(R) {
  const cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2, treppe = R.treppeHoch || R.treppeRunter;
  const seiten = [
    { aussen: R.j === 0, nachbar: R.j > 0 ? R.nr - haus.breit : -1, x: cx, z: R.z0 + 0.16, dreh: 0, nord: true },
    { aussen: R.j === haus.tief - 1, nachbar: R.j < haus.tief - 1 ? R.nr + haus.breit : -1, x: cx, z: R.z0 + RAUM - 0.16, dreh: Math.PI },
    { aussen: R.i === 0, nachbar: R.i > 0 ? R.nr - 1 : -1, x: R.x0 + 0.16, z: cz, dreh: Math.PI / 2 },
    { aussen: R.i === haus.breit - 1, nachbar: R.i < haus.breit - 1 ? R.nr + 1 : -1, x: R.x0 + RAUM - 0.16, z: cz, dreh: -Math.PI / 2 },
  ];
  for (const s of seiten) {
    if (s.nachbar >= 0 && verbunden(R.nr, s.nachbar)) continue;    // Da ist eine Tür
    if (R.nr === haus.start && s.dreh === Math.PI / 2) continue;  // Da ist der Transporter
    if (treppe && s.nord) continue;                               // Da ist die Treppe
    let deko;
    if (s.aussen) {
      deko = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: fensterTextur }));
      deko.position.set(s.x, R.basis + 1.7, s.z);
    } else {
      if (Math.random() < 0.4) continue;
      deko = new THREE.Group();
      const b = zufall(0.7, 1.2), h = zufall(0.6, 0.9);
      deko.add(new THREE.Mesh(new THREE.BoxGeometry(b + 0.1, h + 0.1, 0.04), goldMat));
      const bild = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ map: bildTextur() }));
      bild.position.z = 0.025;
      deko.add(bild);
      deko.position.set(s.x, R.basis + 1.65, s.z);
    }
    deko.rotation.y = s.dreh;
    hausGruppe.add(deko);
  }
}

// =====================================================================
// ===== Die Schätze =====
// =====================================================================
function glanz(farbe, rau = 0.4, metall = 0.1) {   // Schätze leuchten ganz leicht, damit man sie im Dunkeln findet
  return new THREE.MeshStandardMaterial({ color: farbe, roughness: rau, metalness: metall, emissive: farbe, emissiveIntensity: 0.12 });
}
function bildTextur() {   // Ein zufälliges Gemälde
  return malTextur(128, 96, (g, b, h) => {
    const himmel = g.createLinearGradient(0, 0, 0, h);
    himmel.addColorStop(0, auswahl(['#f4a261', '#8ecae6', '#cdb4db', '#ffb703']));
    himmel.addColorStop(1, auswahl(['#264653', '#023047', '#3d405b', '#6d597a']));
    g.fillStyle = himmel; g.fillRect(0, 0, b, h);
    g.fillStyle = auswahl(['#ffd166', '#ffffff', '#ef476f']);
    g.beginPath(); g.arc(zufall(20, 108), zufall(15, 40), zufall(8, 16), 0, 7); g.fill();   // Sonne / Mond
    g.fillStyle = auswahl(['#2a9d8f', '#3a5a40', '#1b263b']);
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= b; x += 16) g.lineTo(x, h - zufall(15, 45));
    g.lineTo(b, h); g.fill();   // Berge
  }, false);
}
function baueSchatzMesh(typ) {
  const g = new THREE.Group();
  const [b, h, t] = typ.groesse;
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  if (typ.id === 'vase') {
    const profil = [[0.08, -0.3], [0.15, -0.25], [0.17, -0.05], [0.12, 0.12], [0.07, 0.22], [0.1, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(profil, 16), glanz(auswahl(['#e8e4d8', '#4a7bd1', '#c94f4f', '#3aa38f']), 0.25));
    add(new THREE.TorusGeometry(0.165, 0.012, 6, 20), goldMat, 0, -0.08, 0).rotation.x = Math.PI / 2;
  } else if (typ.id === 'bild') {
    add(new THREE.BoxGeometry(b, h, t), goldMat);
    const bild = new THREE.MeshBasicMaterial({ map: bildTextur() });
    add(new THREE.PlaneGeometry(b - 0.12, h - 0.12), bild, 0, 0, t / 2 + 0.002);
    add(new THREE.PlaneGeometry(b - 0.12, h - 0.12), bild, 0, 0, -t / 2 - 0.002).rotation.y = Math.PI;
  } else if (typ.id === 'uhr') {
    add(new THREE.BoxGeometry(b, h, t), glanz('#5a3420', 0.6));
    const ziffer = malTextur(64, 64, (c) => {
      c.fillStyle = '#f5f0e1'; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill();
      c.strokeStyle = '#222'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 12); c.moveTo(32, 32); c.lineTo(46, 38); c.stroke();
    }, false);
    for (const s of [1, -1]) add(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ map: ziffer }), 0, 0.06, s * (t / 2 + 0.003)).rotation.y = s > 0 ? 0 : Math.PI;
    add(new THREE.BoxGeometry(b + 0.04, 0.04, t + 0.04), goldMat, 0, h / 2, 0);
  } else if (typ.id === 'pokal') {
    const profil = [[0.12, -0.25], [0.12, -0.22], [0.03, -0.18], [0.03, 0.0], [0.13, 0.08], [0.15, 0.25]].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(profil, 16), goldMat);
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), goldMat, s * 0.15, 0.13, 0).rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else if (typ.id === 'globus') {
    const erde = malTextur(128, 64, (c, w, hh) => {
      c.fillStyle = '#2563eb'; c.fillRect(0, 0, w, hh);
      c.fillStyle = '#4ade80';
      for (let k = 0; k < 9; k++) { c.beginPath(); c.ellipse(zufall(0, w), zufall(8, hh - 8), zufall(6, 18), zufall(4, 10), zufall(0, 3), 0, 7); c.fill(); }
    });
    add(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshStandardMaterial({ map: erde, roughness: 0.5, emissive: '#0b2a6b', emissiveIntensity: 0.3 }));
    add(new THREE.TorusGeometry(0.245, 0.01, 6, 24), goldMat).rotation.y = 0.4;
  } else if (typ.id === 'kristall') {
    add(new THREE.SphereGeometry(0.18, 20, 14), new THREE.MeshStandardMaterial({ color: '#a78bfa', emissive: '#7c3aed', emissiveIntensity: 0.7, transparent: true, opacity: 0.75, roughness: 0.05 }));
    add(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#f5d0fe' }));
  } else if (typ.id === 'kanne') {
    const kanneMat = glanz(auswahl(['#f1f5f9', '#fde68a', '#bfdbfe']), 0.2);
    add(new THREE.SphereGeometry(0.13, 16, 12), kanneMat).scale.set(1, 0.85, 1);
    add(new THREE.CylinderGeometry(0.015, 0.03, 0.14), kanneMat, 0.15, 0.03, 0).rotation.z = -0.9;   // Ausguss
    add(new THREE.TorusGeometry(0.06, 0.013, 6, 12), kanneMat, -0.14, 0.02, 0);                      // Henkel
    add(new THREE.SphereGeometry(0.03, 8, 6), goldMat, 0, 0.13, 0);
  } else if (typ.id === 'truhe') {
    add(new THREE.BoxGeometry(b, h * 0.65, t), glanz('#7a4a24', 0.7), 0, -h * 0.175, 0);
    add(new THREE.BoxGeometry(b + 0.02, h * 0.35, t + 0.02), glanz('#6b3f1d', 0.7), 0, h * 0.325, 0);
    for (const x of [-b / 2 + 0.08, b / 2 - 0.08]) add(new THREE.BoxGeometry(0.05, h + 0.02, t + 0.04), goldMat, x, 0, 0);
    add(new THREE.BoxGeometry(0.1, 0.12, 0.03), goldMat, 0, 0.05, t / 2 + 0.02);   // Schloss
  } else if (typ.id === 'ruestung') {
    add(new THREE.BoxGeometry(0.42, 0.55, 0.3), metallMat, 0, 0.25, 0);                  // Brustpanzer
    add(new THREE.SphereGeometry(0.15, 14, 10), metallMat, 0, 0.7, 0);                   // Helm
    add(new THREE.BoxGeometry(0.2, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: '#111' }), 0, 0.72, 0.14);   // Sehschlitz
    add(new THREE.ConeGeometry(0.04, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#b91c1c' }), 0, 0.92, 0); // Federbusch
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(0.1, 10, 8), metallMat, s * 0.27, 0.45, 0);           // Schultern
      add(new THREE.BoxGeometry(0.1, 0.5, 0.1), metallMat, s * 0.28, 0.12, 0);           // Arme
      add(new THREE.BoxGeometry(0.13, 0.75, 0.13), metallMat, s * 0.1, -0.45, 0);        // Beine
    }
    add(new THREE.BoxGeometry(0.06, 1.2, 0.02), metallMat, 0.36, -0.1, 0.1);            // Schwert
  }
  szene.add(g);
  return g;
}
function neuerSchatz(typ, x, y, z) {
  const [b, h, t] = typ.groesse;
  const wertMax = Math.round(zufall(typ.wert[0], typ.wert[1]) / 10) * 10;
  const mesh = baueSchatzMesh(typ);
  const form = typ.rund ? new CANNON.Sphere(b / 2) : new CANNON.Box(new CANNON.Vec3(b / 2, h / 2, t / 2));
  const body = new CANNON.Body({
    mass: typ.masse, shape: form, material: standardMat, linearDamping: 0.05, angularDamping: 0.3,
    collisionFilterGroup: G_SCHATZ, collisionFilterMask: SCHATZ_MASKE,
  });
  body.sleepSpeedLimit = 0.2;
  body.position.set(x, y, z);
  body.quaternion.setFromEuler(0, zufall(0, Math.PI * 2), 0);
  welt.addBody(body);
  const s = { typ, mesh, body, wert: wertMax, wertMax, letzterStoss: 0, kaputt: false, zerbrechen: false, geworfen: 0, reserviert: null, getragenVon: null };
  mesh.traverse(o => { o.userData.schatz = s; });
  body.addEventListener('collide', e => stoss(s, e));
  schaetze.push(s);
  return s;
}
// Aua! Ein Schatz ist irgendwo angestoßen
function stoss(s, e) {
  if (spielZeit < 3 || s.kaputt || zustand !== 'spiel') return;   // Am Anfang fällt alles noch kurz hin
  const tempo = Math.abs(e.contact.getImpactVelocityAlongNormal());
  if (tempo < STOSS_GRENZE || zeit - s.letzterStoss < 0.2) return;
  s.letzterStoss = zeit;
  const verlust = Math.round(s.wertMax * s.typ.zerbrechlich * (tempo - STOSS_GRENZE) * 0.05);
  if (verlust < 5) return;
  s.wert -= verlust;
  const p = s.body.position;
  schwebeText(p.x, p.y + 0.4, p.z, `-${euro(verlust)}`, '#ff6b6b');
  if (s.getragenVon) sagen(s.getragenVon, 'ups', {}, 1);
  sound.stoss(Math.min(1, tempo / 8) * lautBei(p));
  laerm(p.x, p.y, p.z, 2 + tempo);
  if (s.wert < s.wertMax * KAPUTT_BEI) s.zerbrechen = true;   // Kaputt machen wir nach dem Physik-Schritt
}
function zerbrechen(s) {
  s.kaputt = true;
  const vonDir = gegriffen === s;
  if (vonDir) loslassen();
  for (const h of helfer) if (h.auftrag === s) helferLoslassen(h);
  const p = s.body.position;
  welt.removeBody(s.body);
  szene.remove(s.mesh);
  // Splitter fliegen herum
  const farbe = s.mesh.children[0]?.material?.color || new THREE.Color('#ccc');
  for (let k = 0; k < 14; k++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(zufall(0.03, 0.08)), new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.4 }));
    m.position.set(p.x, p.y, p.z);
    szene.add(m);
    splitter.push({ mesh: m, v: new THREE.Vector3(zufall(-3, 3), zufall(1, 4), zufall(-3, 3)), t: zufall(1.5, 2.5) });
  }
  schwebeText(p.x, p.y + 0.5, p.z, `💔 ${s.typ.name} kaputt!`, '#ff6b6b');
  sound.glas(lautBei(p));
  laerm(p.x, p.y, p.z, 12);   // Das war laut! Der Lauscher hört das ...
  const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, p) < 15);
  if (zeuge && Math.random() < 0.6) sagen(zeuge, 'teuer', {}, 2);
  schaetze = schaetze.filter(x => x !== s);
}
function imLaster(s) {
  const p = s.body.position, L = haus.laster;
  return p.x > L.x1 && p.x < L.x2 && p.z > L.z1 && p.z < L.z2 && p.y < 2;
}
function lasterWert() {
  let summe = 0;
  for (const s of schaetze) if (!s.kaputt && imLaster(s)) summe += s.wert;
  return summe;
}

// =====================================================================
// ===== Die Monster =====
// =====================================================================
// 👻 Staubgeist: schwebt herum. Sieht er dich (oder einen Helfer), jagt er! Wirf was auf ihn, dann ist er kurz betäubt.
// 👂 Lauscher: ist blind, hört aber alles! Lauter Krach lockt ihn an. Steh still oder duck dich, dann findet er dich nicht.
// 🗿 Starrer: eine Steinstatue. Sie bewegt sich NUR, wenn du nicht hinschaust! Lass sie nicht aus den Augen ...
const MONSTER_ARTEN = {
  geist:    { name: 'Staubgeist', emoji: '👻', tempo: 1.6, jagdTempo: 3.3, schaden: 30, sicht: 14, augen: 1.3, pause: 2, betaeubbar: true },
  lauscher: { name: 'Lauscher',   emoji: '👂', tempo: 1.0, jagdTempo: 4.6, schaden: 45, hoeren: 2.5, pause: 2, betaeubbar: true },
  starrer:  { name: 'Starrer',    emoji: '🗿', tempo: 1.2, jagdTempo: 4.8, schaden: 50, pause: 3, betaeubbar: false },
};
function baueMonsterMesh(art) {
  const g = new THREE.Group();
  if (art === 'geist') {
    const staub = new THREE.MeshStandardMaterial({ color: '#8d8a86', transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
    for (let k = 0; k < 7; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(zufall(0.25, 0.45), 12, 10), staub);
      m.position.set(zufall(-0.25, 0.25), zufall(-0.4, 0.3), zufall(-0.25, 0.15));
      m.userData.kreisen = zufall(0, 6);
      g.add(m);
    }
    const auge = new THREE.MeshBasicMaterial({ color: '#ff2a2a', fog: false });   // Die Augen sieht man auch im Nebel!
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), auge); a.position.set(s * 0.13, 0.12, 0.38); g.add(a); }
    g.userData.auge = auge;
  } else if (art === 'lauscher') {
    const haut = new THREE.MeshStandardMaterial({ color: '#2a2530', roughness: 0.9 });
    const ohrMat = new THREE.MeshStandardMaterial({ color: '#b06a8a', roughness: 0.6, emissive: '#000000' });
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.6, 10), haut); koerper.position.y = 1.0; g.add(koerper);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), haut); kopf.position.y = 2.0; kopf.scale.set(1, 1.2, 1); g.add(kopf);
    for (const s of [-1, 1]) {
      const ohr = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20), ohrMat);
      ohr.rotation.z = Math.PI / 2; ohr.position.set(s * 0.45, 2.15, 0);
      g.add(ohr);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 0.07), haut);
      arm.position.set(s * 0.25, 1.1, 0.05); arm.rotation.z = s * 0.12;
      g.add(arm);
      const bein = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.5, 0.09), haut);
      bein.position.set(s * 0.1, 0.25, 0); g.add(bein);
    }
    const mund = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: '#000' }));
    mund.position.set(0, 1.9, 0.27); g.add(mund);
    g.userData.ohrMat = ohrMat;
  } else {   // starrer
    const stein = new THREE.MeshStandardMaterial({ color: '#8a8780', roughness: 1 });
    const sockel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 12), stein); sockel.position.y = 0.1; g.add(sockel);
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.3, 10), stein); koerper.position.y = 0.85; g.add(koerper);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), stein); kopf.position.y = 1.7; g.add(kopf);
    for (const s of [-1, 1]) {   // Arme nach vorne gestreckt ...
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.65), stein);
      arm.position.set(s * 0.25, 1.35, 0.3); arm.rotation.x = -0.3;
      g.add(arm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.14), stein);
      hand.position.set(s * 0.25, 1.48, 0.62); g.add(hand);
    }
    const auge = new THREE.MeshBasicMaterial({ color: '#6fd3ff', fog: false, transparent: true, opacity: 0.5 });
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), auge); a.position.set(s * 0.07, 1.73, 0.18); g.add(a); }
  }
  g.traverse(o => { o.castShadow = true; });
  szene.add(g);
  return g;
}
function neuesMonster(art, raum) {
  const m = raumMitte(raum);
  monster.push({
    art, info: MONSTER_ARTEN[art], mesh: baueMonsterMesh(art),
    x: m.x + zufall(-1, 1), y: m.y, z: m.z + zufall(-1, 1), winkel: 0, tw: null,
    modus: 'wandern', ziel: null, zielZeit: 0, angriffPause: 0, betaeubt: 0, siehtNicht: 0, sichtCheck: zufall(0, 0.2),
    lautZeit: 0, phase: zufall(0, 6), laeuft: false, gesehen: false, bewegtSeit: 0,
  });
}
// Jemand hat Krach gemacht! Monster in der Nähe hören das. (Ein Stockwerk dazwischen dämpft den Krach)
function laerm(x, y, z, staerke) {
  const quelle = { x, y, z };
  for (const m of monster) {
    if (m.betaeubt > 0 || m.art === 'starrer') continue;
    const d = abstand3D(m, quelle);
    if (m.art === 'lauscher' && d < staerke * m.info.hoeren) {
      if (m.modus !== 'jagen' && zeit - m.lautZeit > 4) { m.lautZeit = zeit; sound.lauscher(); }
      m.modus = 'jagen'; m.ziel = { x, y, z }; m.zielZeit = 6;
    } else if (m.art !== 'lauscher' && m.modus === 'wandern' && d < staerke * 1.2) {
      m.modus = 'nachsehen'; m.ziel = { x, y, z }; m.zielZeit = 8;   // Was war das? Mal nachsehen ...
    }
  }
}
const sichtStrahl = new THREE.Raycaster();
function freieSicht(von, nach) {   // Ist zwischen zwei Punkten keine Wand, keine Decke und kein großes Möbel?
  const richtung = nach.clone().sub(von);
  const l = richtung.length();
  sichtStrahl.set(von, richtung.normalize());
  sichtStrahl.far = l;
  return sichtStrahl.intersectObjects(sichtBlocker, false).length === 0;
}
// Wen kann das Monster gerade sehen? (Dich oder einen Helfer – den nächsten nimmt es)
function sichtbaresOpfer(m) {
  const von = new THREE.Vector3(m.x, m.y + m.info.augen, m.z);
  let bestes = null, bestD = Infinity;
  const p = spielerKoerper.position;
  const reichweite = m.info.sicht * (geduckt ? DUCK_SICHT : 1);
  const dS = abstand3D(m, p);
  if (dS < reichweite && freieSicht(von, new THREE.Vector3(p.x, p.y + 0.2, p.z))) { bestes = { x: p.x, y: p.y, z: p.z, spieler: true }; bestD = dS; }
  for (const h of helfer) {
    if (h.kaputt > 0) continue;
    const hp = h.body.position, d = abstand3D(m, hp);
    if (d < m.info.sicht && d < bestD && freieSicht(von, new THREE.Vector3(hp.x, hp.y + 0.3, hp.z))) { bestes = { x: hp.x, y: hp.y, z: hp.z, helfer: h }; bestD = d; }
  }
  return bestes;
}
// Schaust du gerade auf den Starrer?
function starrerGesehen(m) {
  if (zustand !== 'spiel') return false;
  const kopf = new THREE.Vector3(m.x, m.y + 1.2, m.z);
  if (kopf.distanceTo(kamera.position) > 40) return false;
  const p = kopf.clone().project(kamera);
  if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) return false;   // Nicht im Bild
  return freieSicht(kamera.position.clone(), kopf);
}
function zufallsZiel(m) {   // Irgendwo hin wandern (meist in einen Nachbarraum, auch mal die Treppe hoch)
  const jetzt = raumNrVon(m.x, m.y, m.z);
  const moeglich = nachbarn(jetzt).filter(n => verbunden(jetzt, n));
  const raum = Math.random() < 0.7 && moeglich.length ? auswahl(moeglich) : jetzt;
  const R = haus.raeume[raum], treppe = R.treppeHoch || R.treppeRunter;
  return { x: R.x0 + zufall(2, RAUM - 2), y: R.basis, z: R.z0 + zufall(treppe ? 3.2 : 2, RAUM - 2) };
}
function updateMonster(m, dt) {
  const p = spielerKoerper.position, info = m.info;
  monsterGeraeusche(m, dt);
  m.phase += dt;
  m.angriffPause -= dt;
  if (m.betaeubt > 0) { m.betaeubt -= dt; m.laeuft = false; return; }
  let tempo;
  if (m.art === 'starrer') {
    // 🗿 Der Starrer friert ein, sobald du hinschaust
    m.gesehen = starrerGesehen(m);
    if (m.gesehen) {
      if (m.bewegtSeit > 0.5 && abstand3D(m, p) < 9) sound.knirsch();   // Hat er sich gerade bewegt?!
      m.bewegtSeit = 0; m.laeuft = false;
      return;
    }
    m.bewegtSeit += dt;
    m.ziel = { x: p.x, y: p.y, z: p.z };
    tempo = abstand3D(m, p) < 22 ? info.jagdTempo : info.tempo;
    m.modus = 'jagen';
  } else {
    // Sehen (nicht jedes Bild, das spart Rechenzeit)
    if (info.sicht) {
      m.sichtCheck -= dt;
      if (m.sichtCheck <= 0) {
        m.sichtCheck = 0.2;
        const opfer = sichtbaresOpfer(m);
        if (opfer) {
          if (m.modus !== 'jagen') {
            if (opfer.spieler) {
              sound.geist(); zeigeNachricht('👻 Der Staubgeist hat dich gesehen! LAUF!', 2, '#ff6b6b');
            } else if (opfer.helfer) {
              opfer.helfer.angst = 3;
              sagen(opfer.helfer, 'hilfe', { monster: info.name }, 1);
            }
          }
          m.modus = 'jagen'; m.siehtNicht = 0; m.ziel = { x: opfer.x, y: opfer.y, z: opfer.z }; m.zielZeit = 5;
        } else if (m.modus === 'jagen') {
          m.siehtNicht += 0.2;
          if (m.siehtNicht > 4) { m.modus = 'wandern'; m.ziel = null; }   // Spur verloren
        }
      }
    }
    // Ziel aussuchen
    m.zielZeit -= dt;
    if (!m.ziel || m.zielZeit <= 0 || (m.modus === 'wandern' && abstand3D(m, m.ziel) < 0.5)) {
      if (m.modus !== 'wandern' && m.zielZeit <= 0) m.modus = 'wandern';
      if (m.modus === 'wandern') {
        m.ziel = m.art === 'lauscher' && Math.random() < 0.5 ? { x: m.x, y: m.y, z: m.z } : zufallsZiel(m);   // Der Lauscher bleibt oft stehen
        m.zielZeit = zufall(4, 9);
      }
    }
    tempo = m.modus === 'wandern' ? info.tempo : info.jagdTempo;
  }
  // Laufen (durch die Türen und über die Treppen)
  const wp = wegPunkt(m, m, m.ziel);
  const dx = wp.x - m.x, dz = wp.z - m.z, d = Math.hypot(dx, dz);
  m.laeuft = d > 0.2;
  if (m.laeuft) {
    const schritt = Math.min(d, tempo * dt);
    m.x += dx / d * schritt; m.z += dz / d * schritt;
    let diff = Math.atan2(dx, dz) - m.winkel;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.winkel += begrenzt(diff, -dt * 6, dt * 6);
  } else if (m.modus === 'nachsehen' || (m.art === 'lauscher' && m.modus === 'jagen')) {
    m.zielZeit = Math.min(m.zielZeit, 1.5);   // Angekommen und nichts gefunden
  }
  m.y = bodenHoeheBei(m.x, m.z, m.y);   // Auf dem Boden oder auf der Treppe bleiben
  // Angriff! Auf dich ...
  const reichweite = 1.0;
  const fuss = p.y - (geduckt ? DUCK_RADIUS : KOERPER_RADIUS);
  if (m.angriffPause <= 0 && abstand2D(m.x, m.z, p.x, p.z) < reichweite && Math.abs(fuss - m.y) < 1.2) {
    m.angriffPause = info.pause;
    getroffen(info.schaden, `${info.emoji} ${info.name}`);
    const weg = new CANNON.Vec3(p.x - m.x, 0, p.z - m.z);
    weg.normalize();
    spielerKoerper.velocity.set(weg.x * 9, 3, weg.z * 9);   // Wegschubsen
  }
  // ... oder auf einen Helfer
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt <= 0 && m.angriffPause <= 0 && abstand2D(m.x, m.z, hp.x, hp.z) < reichweite && Math.abs(hp.y - 0.35 - m.y) < 1.2) {
      m.angriffPause = info.pause;
      helferKaputt(h, info, m);
    }
  }
  // Getroffen von einem geworfenen Schatz? Dann betäubt!
  if (!info.betaeubbar) return;
  for (const s of schaetze) {
    if (s.geworfen <= 0) continue;
    const sp = s.body.position, v = s.body.velocity.length();
    if (v > 4 && abstand2D(sp.x, sp.z, m.x, m.z) < 0.8 && sp.y > m.y - 0.2 && sp.y < m.y + 2.4) {
      m.betaeubt = 4; m.modus = 'wandern'; m.ziel = null;
      s.body.velocity.scale(-0.3, s.body.velocity);
      s.geworfen = 0;
      zeigeNachricht(`💫 Treffer! Der ${info.name} ist betäubt!`, 2, '#ffd166');
      sound.stoss(1);
      const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, m) < 15);
      if (zeuge) sagen(zeuge, 'volltreffer', {}, 1);
    }
  }
}
function zeigeMonster(m) {
  const g = m.mesh;
  if (m.art === 'geist') {
    const wackel = m.betaeubt > 0 ? Math.sin(zeit * 20) * 0.3 : 0;
    g.position.set(m.x, m.y + 1.25 + Math.sin(m.phase * 2) * 0.12, m.z);
    g.rotation.set(0, m.winkel + wackel, m.betaeubt > 0 ? 0.4 : 0);
    g.children.forEach(k => {   // Der Staub wirbelt herum
      if (k.userData.kreisen === undefined) return;
      k.userData.kreisen += 0.02;
      k.position.x += Math.cos(k.userData.kreisen) * 0.003;
      k.position.y += Math.sin(k.userData.kreisen * 1.3) * 0.003;
    });
    g.userData.auge.color.set(m.betaeubt > 0 ? '#555' : m.modus === 'jagen' ? '#ff2a2a' : '#aa3333');
  } else if (m.art === 'lauscher') {
    const schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 14 : 6)) : 0;
    g.position.set(m.x, m.y + Math.abs(schritt) * 0.08, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.3 : 0, m.winkel, schritt * 0.05);
    g.userData.ohrMat.emissive.set(m.modus === 'jagen' ? '#7a1f5a' : '#000000');   // Ohren glühen, wenn er was gehört hat
  } else {
    g.position.set(m.x, m.y, m.z);
    g.rotation.set(0, m.winkel, 0);   // Eine Statue wackelt nicht ...
  }
}

// =====================================================================
// ===== Die Helfer-Bots =====
// =====================================================================
// Die Helfer suchen sich selbst Schätze, tragen sie zum Transporter und legen sie dort ab. Dabei reden sie!
// Monster können sie kurz kaputt machen – dann starten sie nach ein paar Sekunden neu.
function malGesicht(h) {   // Das Bildschirm-Gesicht (Augen und Mund ändern sich je nach Laune)
  const g = h.gesicht.g, farbe = h.farbe;
  const ausdruck = h.kaputt > 0 ? 'kaputt' : h.angst > 0 ? 'angst' : h.froh > 0 ? 'froh' : 'normal';
  const blinzeln = ausdruck === 'normal' && (zeit + h.blinzelVersatz) % 3.5 < 0.12;
  const mundAuf = h.redet > 0 && Math.sin(zeit * 22) > 0;
  const schluessel = `${ausdruck}${blinzeln}${mundAuf}`;
  if (schluessel === h.gesicht.alt) return;
  h.gesicht.alt = schluessel;
  g.fillStyle = '#071018'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = farbe; g.fillStyle = farbe; g.lineWidth = 6; g.lineCap = 'round';
  for (const x of [38, 90]) {
    g.beginPath();
    if (ausdruck === 'kaputt') { g.moveTo(x - 9, 14); g.lineTo(x + 9, 32); g.moveTo(x + 9, 14); g.lineTo(x - 9, 32); g.stroke(); }
    else if (ausdruck === 'froh') { g.arc(x, 30, 10, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (ausdruck === 'angst') { g.arc(x, 23, 11, 0, 7); g.stroke(); g.beginPath(); g.arc(x, 23, 3, 0, 7); g.fill(); }
    else if (blinzeln) { g.moveTo(x - 9, 24); g.lineTo(x + 9, 24); g.stroke(); }
    else { rr(x - 8, 13, 16, 20, 6, g); g.fill(); }
  }
  g.beginPath();
  if (mundAuf) { g.ellipse(64, 50, 10, 7, 0, 0, 7); g.fill(); }
  else if (ausdruck === 'froh') { g.arc(64, 42, 12, 0.2, Math.PI - 0.2); g.stroke(); }
  else if (ausdruck === 'angst' || ausdruck === 'kaputt') { g.moveTo(50, 52); for (let x = 50; x <= 78; x += 7) g.lineTo(x, x % 14 ? 48 : 54); g.stroke(); }
  else { g.moveTo(54, 50); g.lineTo(74, 50); g.stroke(); }
  h.gesicht.tex.needsUpdate = true;
}
function malBlase(h, satz) {   // Sprechblase über dem Kopf
  const g = h.blase.g;
  g.clearRect(0, 0, 512, 128);
  g.font = 'bold 40px system-ui, sans-serif';
  const b = Math.min(490, g.measureText(satz).width + 50);
  const x = (512 - b) / 2;
  g.fillStyle = 'rgba(255,255,255,0.95)'; rr(x, 8, b, 82, 24, g); g.fill();
  g.beginPath(); g.moveTo(240, 88); g.lineTo(256, 118); g.lineTo(272, 88); g.fill();   // Spitze
  g.strokeStyle = h.farbe; g.lineWidth = 6; rr(x, 8, b, 82, 24, g); g.stroke();
  g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(satz, 256, 50, 470);
  h.blase.tex.needsUpdate = true;
}
// Ein Helfer sagt etwas. art = welche Liste aus SAETZE, wichtig = 0 (egal), 1 (wichtig), 2 (sehr wichtig)
function sagen(h, art, werte = {}, wichtig = 0) {
  if (!h || zustand !== 'spiel') return;
  if (h.redePause > 0 && wichtig < 2 && !(wichtig === 1 && h.redePause < 2)) return;
  let satz = auswahl(SAETZE[art]);
  for (const [k, v] of Object.entries(werte)) satz = satz.replace(`{${k}}`, v);
  h.redePause = 4; h.redet = 1.2 + satz.length * 0.05; h.blasenZeit = 2.8;
  malBlase(h, satz);
  const p = h.body.position, lautstaerke = lautBei(p);
  funk.unshift({ name: h.name, farbe: h.farbe, satz, t: 4 });   // Untertitel unten im Bild
  if (funk.length > 3) funk.pop();
  sound.robo(500 * h.stimme, lautstaerke);   // Kurzes Roboter-Piepsen
}
function baueHelferMesh(info) {
  const g = new THREE.Group();
  const blech = new THREE.MeshStandardMaterial({ color: '#d7dde6', metalness: 0.6, roughness: 0.35 });
  const dunkel = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.5, roughness: 0.6 });
  const lack = new THREE.MeshStandardMaterial({ color: info.farbe, metalness: 0.4, roughness: 0.4 });
  const leucht = new THREE.MeshBasicMaterial({ color: info.farbe });
  const teil = (geo, mat, x, y, z, eltern = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; eltern.add(m); return m; };
  // Kettenantrieb mit Rädern
  for (const s of [-1, 1]) {
    teil(new THREE.BoxGeometry(0.13, 0.2, 0.6), schwarzMat, s * 0.25, 0.1, 0);
    for (const z of [-0.22, 0, 0.22]) teil(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 12), metallGrauMat, s * 0.25, 0.1, z).rotation.z = Math.PI / 2;
  }
  teil(new THREE.BoxGeometry(0.4, 0.14, 0.5), dunkel, 0, 0.2, 0);                               // Fahrgestell
  // Körper mit Brustplatte, Lämpchen und Akku hinten
  teil(new THREE.BoxGeometry(0.46, 0.38, 0.36), lack, 0, 0.47, 0);
  teil(new THREE.BoxGeometry(0.3, 0.2, 0.02), dunkel, 0, 0.5, 0.185);
  const lampen = ['#4ade80', '#ffd166', '#ff6b6b'].map((c, k) => teil(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: c }), -0.07 + k * 0.07, 0.55, 0.2));
  teil(new THREE.BoxGeometry(0.47, 0.04, 0.37), blech, 0, 0.3, 0);                              // Streifen unten
  teil(new THREE.BoxGeometry(0.3, 0.26, 0.1), dunkel, 0, 0.5, -0.22);                           // Akku
  teil(new THREE.BoxGeometry(0.22, 0.03, 0.01), leucht, 0, 0.55, -0.272);
  // Arme mit Ellbogen und Greifzange
  const arme = [];
  for (const s of [-1, 1]) {
    teil(new THREE.SphereGeometry(0.06, 10, 8), blech, s * 0.27, 0.6, 0);                       // Schulter
    const arm = new THREE.Group(); arm.position.set(s * 0.29, 0.6, 0); g.add(arm);
    teil(new THREE.BoxGeometry(0.06, 0.06, 0.2), blech, 0, 0, 0.1, arm);                        // Oberarm
    teil(new THREE.SphereGeometry(0.04, 8, 6), dunkel, 0, 0, 0.21, arm);                        // Ellbogen
    teil(new THREE.BoxGeometry(0.05, 0.05, 0.16), lack, 0, -0.02, 0.29, arm);                   // Unterarm
    for (const f of [-1, 1]) teil(new THREE.BoxGeometry(0.015, 0.05, 0.08), dunkel, f * 0.02, -0.02, 0.39, arm).rotation.y = f * 0.4;   // Zange
    arme.push(arm);
  }
  // Kopf mit Bildschirm-Gesicht, Ohren und Antenne
  teil(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), dunkel, 0, 0.7, 0);                     // Hals
  const kopf = new THREE.Group(); kopf.position.set(0, 0.88, 0); g.add(kopf);
  teil(new THREE.BoxGeometry(0.42, 0.28, 0.32), blech, 0, 0, 0, kopf);
  teil(new THREE.BoxGeometry(0.44, 0.04, 0.34), lack, 0, 0.14, 0, kopf);
  const gesichtCanvas = document.createElement('canvas'); gesichtCanvas.width = 128; gesichtCanvas.height = 64;
  const gesichtTex = new THREE.CanvasTexture(gesichtCanvas); gesichtTex.colorSpace = THREE.SRGBColorSpace;
  teil(new THREE.PlaneGeometry(0.34, 0.19), new THREE.MeshBasicMaterial({ map: gesichtTex }), 0, -0.01, 0.161, kopf);
  for (const s of [-1, 1]) teil(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), lack, s * 0.23, 0, 0, kopf).rotation.z = Math.PI / 2;   // Ohren
  teil(new THREE.CylinderGeometry(0.008, 0.008, 0.2), blech, 0.1, 0.24, 0, kopf);               // Antenne
  const antenne = teil(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: info.farbe }), 0.1, 0.35, 0, kopf);
  // Namensschild und Sprechblase
  const schild = namensSchild(`🤖 ${info.name}`, info.farbe);
  schild.position.y = 1.35; g.add(schild);
  const blasenCanvas = document.createElement('canvas'); blasenCanvas.width = 512; blasenCanvas.height = 128;
  const blasenTex = new THREE.CanvasTexture(blasenCanvas); blasenTex.colorSpace = THREE.SRGBColorSpace;
  const blase = new THREE.Sprite(new THREE.SpriteMaterial({ map: blasenTex, transparent: true, depthWrite: false }));
  blase.scale.set(2.0, 0.5, 1); blase.position.y = 1.75; blase.visible = false; g.add(blase);
  szene.add(g);
  return { g, kopf, arme, antenne, lampen, blase, gesicht: { g: gesichtCanvas.getContext('2d'), tex: gesichtTex, alt: '' }, blasenG: blasenCanvas.getContext('2d'), blasenTex };
}
function neuerHelfer(info, x, z) {
  const body = new CANNON.Body({
    mass: 40, shape: new CANNON.Sphere(0.35), material: spielerMat, fixedRotation: true,
    collisionFilterGroup: G_HELFER, collisionFilterMask: G_WAND | G_SCHATZ | G_SPIELER | G_HELFER,
  });
  body.allowSleep = false;
  body.position.set(x, 0.4, z);
  welt.addBody(body);
  const teile = baueHelferMesh(info);
  const h = { ...info, body, teile, strahl: neuerStrahl(info.farbe, 0.018), auftrag: null, modus: 'suchen', kaputt: 0, leben: HELFER_LEBEN, heilZeit: 0, wackelt: 0, denkZeit: 0, winkel: Math.PI / 2,
    pruefZeit: 1, altX: x, altZ: z, ausweichen: 0, ausweichSeite: 1, abgeliefert: 0, tw: null,
    redePause: zufall(1, 3), redet: 0, blasenZeit: 0, angst: 0, froh: 0, wartenZeit: 0, blinzelVersatz: zufall(0, 3),
    gesicht: teile.gesicht, blase: { g: teile.blasenG, tex: teile.blasenTex } };
  helfer.push(h);
}
function helferLoslassen(h) {
  const s = h.auftrag;
  if (s) {
    s.reserviert = null;
    if (s.getragenVon === h) { s.getragenVon = null; s.body.collisionFilterMask = SCHATZ_MASKE; }
  }
  h.auftrag = null;
  h.modus = 'suchen';
  h.tw = null;
}
function helferKaputt(h, info, monster) {
  helferLoslassen(h);
  const p = h.body.position;
  h.leben -= 1;
  h.heilZeit = HELFER_HEILEN;
  if (h.leben > 0) {
    // Noch Leben übrig: Er wird nur weggeschubst und ist kurz durcheinander
    h.wackelt = 1.2;
    h.angst = 4;
    if (monster) {
      const dx = p.x - monster.x, dz = p.z - monster.z, d = Math.hypot(dx, dz) || 1;
      h.body.velocity.set(dx / d * 7, 3, dz / d * 7);
    }
    schwebeText(p.x, p.y + 1.2, p.z, `💔 ${h.name}: noch ${'❤️'.repeat(h.leben)}`, h.farbe);
    sound.autsch();
    sagen(h, 'hilfe', { monster: info.name }, 2);
    return;
  }
  h.kaputt = HELFER_PAUSE;
  schwebeText(p.x, p.y + 1.2, p.z, `💥 ${h.name} wurde erwischt!`, h.farbe);
  for (let k = 0; k < 10; k++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
    m.position.set(p.x, p.y + 0.5, p.z);
    szene.add(m);
    splitter.push({ mesh: m, v: new THREE.Vector3(zufall(-3, 3), zufall(2, 5), zufall(-3, 3)), t: 0.8 });
  }
  sound.autsch();
  sagen(h, 'kaputt', {}, 2);
  if (abstand3D(p, spielerKoerper.position) < 15) zeigeNachricht(`${info.emoji} Der ${info.name} hat ${h.name} erwischt!`, 2, '#ffb347');
}
// Welcher Schatz lohnt sich? (wertvoll und nah – ein anderes Stockwerk ist "weiter weg")
function waehleSchatz(h) {
  const p = h.body.position;
  let bester = null, punkte = 0;
  for (const s of schaetze) {
    if (s.kaputt || s.reserviert || s.getragenVon || gegriffen === s || imLaster(s)) continue;
    const sp = s.body.position;
    if (sp.y - (etageVon(sp.y) * ETAGE_HOEHE) > 1.6) continue;   // Zu hoch (z. B. auf einem Schrank)
    const wertung = s.wert / (abstand3D(p, sp) * 1.5 + 8);
    if (wertung > punkte) { punkte = wertung; bester = s; }
  }
  return bester;
}
function updateHelfer(h, dt) {
  const b = h.body, p = b.position, v = b.velocity;
  h.redePause -= dt; h.redet = Math.max(0, h.redet - dt); h.blasenZeit -= dt; h.angst -= dt; h.froh -= dt;
  if (h.kaputt > 0) {
    h.kaputt -= dt;
    v.x *= 0.85; v.z *= 0.85;
    if (h.kaputt <= 0) { h.leben = HELFER_LEBEN; schwebeText(p.x, p.y + 1.2, p.z, `🔧 ${h.name} ist wieder an!`, h.farbe); sagen(h, 'neustart', {}, 2); }
    return;
  }
  // Langsam wieder heilen
  if (HELFER_HEILEN > 0 && h.leben < HELFER_LEBEN) {
    h.heilZeit -= dt;
    if (h.heilZeit <= 0) { h.leben++; h.heilZeit = HELFER_HEILEN; schwebeText(p.x, p.y + 1.2, p.z, `💚 ${h.name} +1 ❤️`, h.farbe); }
  }
  // Gerade getroffen? Dann kurz durcheinander
  if (h.wackelt > 0) { h.wackelt -= dt; return; }
  // Ist der Auftrag noch gültig?
  const s = h.auftrag;
  if (s && (s.kaputt || gegriffen === s || (h.modus === 'hinlaufen' && (imLaster(s) || s.getragenVon)))) helferLoslassen(h);
  if (!h.auftrag) {
    h.denkZeit -= dt;
    if (h.denkZeit <= 0) {
      h.denkZeit = 0.6;
      const neu = waehleSchatz(h);
      if (neu) {
        h.auftrag = neu; neu.reserviert = h; h.modus = 'hinlaufen'; h.wartenZeit = 0;
        if (Math.random() < 0.4) sagen(h, 'ziel', { name: neu.typ.name });
      }
    }
  }
  // Wohin?
  const L = haus.laster;
  let ziel;
  if (h.modus === 'hinlaufen') ziel = { x: h.auftrag.body.position.x, y: h.auftrag.body.position.y, z: h.auftrag.body.position.z };
  else if (h.modus === 'tragen') ziel = { x: (L.x1 + L.x2) / 2 + 0.3, y: 0, z: (L.z1 + L.z2) / 2 };
  else {   // Nichts zu tun: am Transporter warten (und sich ein bisschen langweilen)
    ziel = { x: RAUM / 2 + 1.5, y: 0, z: (L.z1 + L.z2) / 2 + (h === helfer[0] ? -2 : 2) };
    h.wartenZeit += dt;
    if (h.wartenZeit > 25) { h.wartenZeit = 0; sagen(h, 'warten'); }
  }
  const zielD = abstand2D(p.x, p.z, ziel.x, ziel.z);
  // Angekommen beim Schatz? Greifen!
  if (h.modus === 'hinlaufen' && zielD < 1.3 && Math.abs(ziel.y - p.y) < 1.8) {
    h.modus = 'tragen';
    h.auftrag.getragenVon = h;
    h.auftrag.body.collisionFilterMask = G_WAND | G_SCHATZ | G_SPIELER;   // Stößt nicht an den eigenen Träger
    h.auftrag.body.wakeUp();
    if (Math.random() < 0.5) sagen(h, 'greifen');
  }
  // Im Transporter? Ablegen!
  if (h.modus === 'tragen' && imLaster(h.auftrag)) {
    h.abgeliefert++;
    h.froh = 2.5;
    sagen(h, 'abgeliefert', { wert: euro(h.auftrag.wert) }, 1);
    helferLoslassen(h);
  }
  // Fahren (durch Türen und über Treppen), mit Ausweichen, falls er irgendwo festhängt
  const wp = wegPunkt(h, p, ziel);
  let dx = wp.x - p.x, dz = wp.z - p.z;
  const d = Math.hypot(dx, dz);
  let tempo = h.modus === 'tragen' ? HELFER_TRAGE_TEMPO * (1 - Math.min(0.5, h.auftrag.typ.masse / 60)) : HELFER_TEMPO;
  if (h.angst > 0) tempo *= 1.3;   // Angst macht schnell!
  if (d < 0.25 || (h.modus === 'suchen' && zielD < 0.6 && !h.tw)) tempo = 0;
  if (d > 0) { dx /= d; dz /= d; }
  if (h.ausweichen > 0) {   // Seitlich ausweichen
    h.ausweichen -= dt;
    [dx, dz] = [-dz * h.ausweichSeite, dx * h.ausweichSeite];
  }
  const k = Math.min(1, dt * 8);
  v.x += (dx * tempo - v.x) * k;
  v.z += (dz * tempo - v.z) * k;
  if (tempo > 0) {
    let diff = Math.atan2(dx, dz) - h.winkel;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    h.winkel += begrenzt(diff, -dt * 6, dt * 6);
  }
  // Hängt er fest?
  h.pruefZeit -= dt;
  if (h.pruefZeit <= 0) {
    if (tempo > 0 && abstand2D(p.x, p.z, h.altX, h.altZ) < 0.3) { h.ausweichen = 0.8; h.ausweichSeite = Math.random() < 0.5 ? 1 : -1; }
    h.pruefZeit = 1; h.altX = p.x; h.altZ = p.z;
  }
  // Den Schatz vor sich her tragen (tief, damit beim Ablegen nichts kaputtgeht)
  if (h.modus === 'tragen') {
    const sb = h.auftrag.body;
    const zx = p.x + Math.sin(h.winkel) * 0.95, zz = p.z + Math.cos(h.winkel) * 0.95, zy = p.y + 0.05 + h.auftrag.typ.groesse[1] / 2;
    const diff = new CANNON.Vec3(zx - sb.position.x, zy - sb.position.y, zz - sb.position.z);
    if (diff.length() > 3) { helferLoslassen(h); return; }
    diff.scale(8, diff);
    const max = 6 / Math.sqrt(Math.max(1, h.auftrag.typ.masse / 3));
    if (diff.length() > max) diff.scale(max / diff.length(), diff);
    sb.velocity.copy(diff);
    sb.angularVelocity.scale(0.8, sb.angularVelocity);
    sb.wakeUp();
  }
  // Pass auf! (wenn dich ein Monster jagt und ein Helfer in der Nähe ist)
  if (gejagt() && abstand3D(p, spielerKoerper.position) < 12 && Math.random() < dt * 0.3) sagen(h, 'aufpassen');
}
function zeigeHelfer(h) {
  const p = h.body.position, T = h.teile;
  T.g.position.set(p.x, p.y - 0.35, p.z);
  T.g.rotation.set(h.kaputt > 0 ? 1.3 : 0, h.winkel, h.wackelt > 0 ? Math.sin(zeit * 25) * 0.35 : 0);   // Kaputt: kippt um · Getroffen: wackelt
  if (h.kaputt > 0) T.g.position.y = p.y - 0.25;
  const faehrt = Math.hypot(h.body.velocity.x, h.body.velocity.z) > 0.3;
  T.arme.forEach((a, k) => { a.rotation.x = h.modus === 'tragen' ? -0.5 : 0.9 + (faehrt ? Math.sin(zeit * 8 + k * Math.PI) * 0.15 : 0); });
  // Beim Reden zu dir schauen, sonst nach vorne
  let kopfDreh = 0;
  if (h.redet > 0) {
    const sp = spielerKoerper.position;
    kopfDreh = Math.atan2(sp.x - p.x, sp.z - p.z) - h.winkel;
    while (kopfDreh > Math.PI) kopfDreh -= Math.PI * 2;
    while (kopfDreh < -Math.PI) kopfDreh += Math.PI * 2;
    kopfDreh = begrenzt(kopfDreh, -1, 1);
  }
  T.kopf.rotation.y += (kopfDreh - T.kopf.rotation.y) * 0.15;
  T.kopf.rotation.z = h.angst > 0 ? Math.sin(zeit * 30) * 0.06 : 0;   // Zittern vor Angst
  T.antenne.visible = h.kaputt > 0 ? Math.sin(zeit * 20) > 0 : (zeit * 2 + h.blinzelVersatz) % 1.5 < 1.2;
  T.lampen.forEach((l, k) => { l.visible = h.kaputt > 0 ? false : (zeit * 3 + k) % 3 > 0.6; });
  T.blase.visible = h.blasenZeit > 0;
  malGesicht(h);
  // Greifstrahl aus der Zange
  if (h.modus === 'tragen' && h.kaputt <= 0) {
    const von = new THREE.Vector3(p.x + Math.sin(h.winkel) * 0.45, p.y + 0.2, p.z + Math.cos(h.winkel) * 0.45);
    const nach = new THREE.Vector3().copy(h.auftrag.body.position);
    zeigeStrahl(h.strahl, von, nach, new THREE.Vector3(Math.sin(h.winkel), 0.3, Math.cos(h.winkel)).normalize(), Math.max(...h.auftrag.typ.groesse) * 0.6);
  } else h.strahl.g.visible = false;
}

// =====================================================================
// ===== Dein Roboter und der Greifstrahl =====
// =====================================================================
// Der Greifer unten rechts im Bild: Griff, Lauf mit Spulen, drei Zinken und ein leuchtender Kern
const greifer = new THREE.Group();
greifer.position.set(0.3, -0.27, -0.55);
const greiferMat = new THREE.MeshStandardMaterial({ color: '#d7dde6', metalness: 0.7, roughness: 0.3 });
const greiferDunkel = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.5, roughness: 0.5 });
const greiferLeucht = new THREE.MeshBasicMaterial({ color: '#7cf5c6' });
const gTeil = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); greifer.add(m); return m; };
gTeil(new THREE.BoxGeometry(0.05, 0.12, 0.07), greiferDunkel, 0, -0.08, 0.08).rotation.x = 0.3;                // Griff
gTeil(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 14), greiferMat, 0, 0, 0).rotation.x = Math.PI / 2;        // Lauf
for (const z of [-0.06, 0, 0.06]) gTeil(new THREE.TorusGeometry(0.05, 0.008, 6, 16), greiferLeucht, 0, 0, z);  // Leuchtende Spulen
gTeil(new THREE.CylinderGeometry(0.065, 0.05, 0.05, 14), greiferDunkel, 0, 0, -0.17).rotation.x = Math.PI / 2; // Kopf
const zinken = new THREE.Group(); zinken.position.set(0, 0, -0.2); greifer.add(zinken);
for (let k = 0; k < 3; k++) {   // Drei Zinken, die sich beim Greifen schließen
  const z = new THREE.Group(); z.rotation.z = k / 3 * Math.PI * 2;
  const zahn = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.1), greiferMat);
  zahn.position.set(0, 0.055, -0.04);
  z.add(zahn); zinken.add(z);
}
const greiferRing = gTeil(new THREE.TorusGeometry(0.075, 0.006, 6, 24), greiferLeucht, 0, 0, -0.2);
const greiferSpitze = gTeil(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 0, -0.22);
const greiferGlanz = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTextur, color: '#7cf5c6', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
greiferGlanz.position.set(0, 0, -0.22); greiferGlanz.scale.setScalar(0.12); greifer.add(greiferGlanz);
greifer.traverse(o => { o.renderOrder = 10; });
kamera.add(greifer);
const spielerStrahl = neuerStrahl('#7cf5c6', 0.03);

const greifStrahl = new THREE.Raycaster();
const MITTE = new THREE.Vector2(0, 0);
function schauAuf() {   // Auf welchen Schatz schaust du gerade?
  greifStrahl.setFromCamera(MITTE, kamera);
  greifStrahl.far = GREIF_WEITE;
  const treffer = greifStrahl.intersectObjects([...schaetze.map(s => s.mesh), ...sichtBlocker], true);
  if (!treffer.length) return null;
  return treffer[0].object.userData.schatz || null;
}
function greifen(s) {
  if (s.getragenVon) helferLoslassen(s.getragenVon);   // Du nimmst ihn dem Helfer weg
  gegriffen = s;
  const p = s.body.position;
  halteAbstand = begrenzt(kamera.position.distanceTo(new THREE.Vector3(p.x, p.y, p.z)), 1.3, 3);
  s.body.collisionFilterMask = G_WAND | G_SCHATZ | G_HELFER;   // Was du hältst, stößt nicht an dich selbst
  s.body.wakeUp();
  sound.strahl();
}
function loslassen() {
  if (!gegriffen) return;
  gegriffen.body.collisionFilterMask = SCHATZ_MASKE;
  gegriffen = null;
}
function werfen() {
  if (!gegriffen) return;
  const s = gegriffen, r = new THREE.Vector3();
  kamera.getWorldDirection(r);
  const kraft = WURF_KRAFT / Math.sqrt(Math.max(1, s.typ.masse / 3));
  s.body.velocity.set(r.x * kraft, r.y * kraft + 1.5, r.z * kraft);
  s.geworfen = 1.5;
  loslassen();
  sound.sprung();
  const p = spielerKoerper.position;
  laerm(p.x, p.y, p.z, 3);
}
// Der Strahl zieht den Schatz zu der Stelle vor dir
function haltenPhysik() {
  if (!gegriffen) return;
  const s = gegriffen, b = s.body;
  const r = new THREE.Vector3();
  kamera.getWorldDirection(r);
  const ziel = kamera.position.clone().addScaledVector(r, halteAbstand);
  if (s.typ.masse > 10) ziel.y -= 0.3;   // Schwere Sachen hängen ein bisschen durch
  const diff = new CANNON.Vec3(ziel.x - b.position.x, ziel.y - b.position.y, ziel.z - b.position.z);
  if (diff.length() > 3) { loslassen(); zeigeNachricht('Der Strahl ist abgerissen!', 1.5, '#ffd166'); return; }
  const maxTempo = 9 / Math.sqrt(Math.max(1, s.typ.masse / 3));
  diff.scale(10, diff);
  if (diff.length() > maxTempo) diff.scale(maxTempo / diff.length(), diff);
  b.velocity.copy(diff);
  b.angularVelocity.scale(0.85, b.angularVelocity);   // Nicht so wild drehen
  b.wakeUp();
}
function getroffen(menge, von) {
  if (zustand !== 'spiel') return;
  energie -= menge;
  schadenBlitz = 0.6;
  wackeln = 0.3;
  sound.autsch();
  loslassen();   // Vor Schreck lässt du alles fallen!
  const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, spielerKoerper.position) < 15);
  if (zeuge) sagen(zeuge, 'aufpassen', {}, 1);
  if (energie <= 0) {
    energie = 0;
    kaputtGrund = von;
    zustand = 'kaputt';
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
// Ducken: Der Roboter wird kleiner (passt unter Tische), leiser und schwerer zu sehen
function ducken(an) {
  if (an === geduckt) return;
  geduckt = an;
  spielerForm.radius = an ? DUCK_RADIUS : KOERPER_RADIUS;
  spielerForm.updateBoundingSphereRadius();
  spielerKoerper.updateBoundingRadius();
  if (!an) spielerKoerper.position.y += KOERPER_RADIUS - DUCK_RADIUS;   // Beim Aufstehen nicht im Boden stecken
  sound.ducken();
}
function kannAufstehen() {   // Ist über dir Platz? (Unter einem Tisch kannst du nicht aufstehen)
  const p = spielerKoerper.position, ergebnis = new CANNON.RaycastResult();
  const von = new CANNON.Vec3(), nach = new CANNON.Vec3();
  for (const [ox, oz] of [[0, 0], [0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
    von.set(p.x + ox, p.y, p.z + oz); nach.set(p.x + ox, p.y + KOERPER_RADIUS * 2 + 0.05, p.z + oz);
    ergebnis.reset();
    welt.raycastClosest(von, nach, { collisionFilterMask: G_WAND, skipBackfaces: true }, ergebnis);
    if (ergebnis.hasHit) return false;
  }
  return true;
}
// Ist der Roboter auf dem Boden? (für Springen)
function pruefeBoden() {
  amBoden = false;
  for (const c of welt.contacts) {
    if (c.bi !== spielerKoerper && c.bj !== spielerKoerper) continue;
    const ny = c.bi === spielerKoerper ? -c.ni.y : c.ni.y;
    if (ny > 0.5) { amBoden = true; return; }
  }
}
function updateSpieler(dt) {
  // Ducken mit C (aufstehen nur, wenn über dir Platz ist)
  if (tasten['c'] && !geduckt) ducken(true);
  if (!tasten['c'] && geduckt && kannAufstehen()) ducken(false);
  const vor = (tasten['w'] || tasten['arrowup'] ? 1 : 0) - (tasten['s'] || tasten['arrowdown'] ? 1 : 0);
  const seite = (tasten['d'] || tasten['arrowright'] ? 1 : 0) - (tasten['a'] || tasten['arrowleft'] ? 1 : 0);
  const sinY = Math.sin(blick.links), cosY = Math.cos(blick.links);
  let dx = -sinY * vor + cosY * seite, dz = -cosY * vor - sinY * seite;
  const l = Math.hypot(dx, dz);
  const laeuft = l > 0;
  if (laeuft) { dx /= l; dz /= l; }
  const rennt = laeuft && tasten['shift'] && ausdauer > 0 && !geduckt;
  if (rennt) ausdauer = Math.max(0, ausdauer - 30 * dt);
  else ausdauer = Math.min(AUSDAUER_MAX, ausdauer + (laeuft ? 10 : 20) * dt);
  let tempo = geduckt ? DUCK_TEMPO : rennt ? RENN_TEMPO : LAUF_TEMPO;
  if (gegriffen) tempo *= 1 - Math.min(0.55, gegriffen.typ.masse / 60);   // Schweres tragen macht langsam
  const v = spielerKoerper.velocity, k = Math.min(1, dt * (amBoden ? 12 : 3));
  v.x += (dx * tempo - v.x) * k;
  v.z += (dz * tempo - v.z) * k;
  if (!laeuft && amBoden && v.y < 0.5) v.y *= 0.5;   // Auf der Treppe nicht runterrutschen
  if (tasten[' '] && amBoden && v.y < 1 && !geduckt) { v.y = SPRUNG; sound.sprung(); }
  // Schritte: Rennen ist laut, Gehen ist leise, geduckt hört dich fast niemand
  if (laeuft && amBoden) {
    schrittZeit -= dt * (rennt ? 1.6 : 1);
    if (schrittZeit <= 0) {
      schrittZeit = 0.45;
      if (!geduckt) sound.schritt();
      const p = spielerKoerper.position;
      laerm(p.x, p.y, p.z, geduckt ? 0.3 : rennt ? 4 : 1.2);
    }
  }
}

// =====================================================================
// ===== Update =====
// =====================================================================
function update(dt) {
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  schadenBlitz = Math.max(0, schadenBlitz - dt);
  wackeln = Math.max(0, wackeln - dt);
  for (const f of funk) f.t -= dt;
  funk = funk.filter(f => f.t > 0);
  musikUpdate(zustand === 'spiel' && !pause && gejagt());
  if (zustand !== 'spiel' || pause) return;
  spielZeit += dt;
  if (spielZeit > 1.5 && spielZeit - dt <= 1.5 && helfer.length) sagen(auswahl(helfer), 'start', {}, 2);

  updateSpieler(dt);
  for (const h of helfer) updateHelfer(h, dt);
  haltenPhysik();
  welt.step(1 / 60, dt, 3);
  pruefeBoden();
  for (const s of [...schaetze]) {
    if (s.zerbrechen && !s.kaputt) zerbrechen(s);
    s.geworfen -= dt;
  }
  // Ist etwas aus dem Haus gefallen? (sollte nicht passieren, aber sicher ist sicher)
  for (const s of schaetze) if (s.body.position.y < -2) { s.body.position.set(RAUM / 2, 1, haus.laster.z1 + 2); s.body.velocity.set(0, 0, 0); }
  for (const h of helfer) if (h.body.position.y < -2) { h.body.position.set(RAUM / 2, 0.5, haus.laster.z1 + 2); h.body.velocity.set(0, 0, 0); }
  if (spielerKoerper.position.y < -2) { spielerKoerper.position.set(RAUM / 2, 0.6, haus.laster.z1 + 2); spielerKoerper.velocity.set(0, 0, 0); }
  for (const m of monster) updateMonster(m, dt);

  // Neue Schätze im Transporter?
  for (const s of schaetze) {
    const drin = imLaster(s);
    if (drin && !s.warDrin) {
      sound.abgabe();
      const wer = s.getragenVon ? ` (${s.getragenVon.name})` : '';
      schwebeText(s.body.position.x, s.body.position.y + 0.6, s.body.position.z, `+${euro(s.wert)} 🚚${wer}`, '#7cf5c6');
    }
    s.warDrin = drin;
  }
  if (!zielGemeldet && lasterWert() >= ld.ziel) { zielGemeldet = true; if (helfer.length) sagen(auswahl(helfer), 'genug', {}, 2); }
  // Herzklopfen, wenn ein Monster dich jagt
  herzZeit -= dt;
  if (gejagt() && herzZeit <= 0) { herzZeit = 0.7; sound.herz(0.8); }
  // Abfahren!
  if (tasten['e'] && spielerImLaster() && lasterWert() >= ld.ziel) levelGeschafft();
  // Splitter und Schwebetexte
  for (const sp of splitter) {
    sp.t -= dt;
    sp.v.y -= 9.8 * dt;
    sp.mesh.position.addScaledVector(sp.v, dt);
    const boden = etageVon(sp.mesh.position.y) * ETAGE_HOEHE + 0.03;
    if (sp.mesh.position.y < boden && sp.v.y < 0) { sp.mesh.position.y = boden; sp.v.set(sp.v.x * 0.5, 0, sp.v.z * 0.5); }
    sp.mesh.rotation.x += dt * 5;
    if (sp.t <= 0) szene.remove(sp.mesh);
  }
  splitter = splitter.filter(sp => sp.t > 0);
  for (const t of schwebeTexte) { t.t -= dt; t.p.y += dt * 0.5; }
  schwebeTexte = schwebeTexte.filter(t => t.t > 0);
}
function gejagt() {
  const p = spielerKoerper.position;
  return monster.some(m => m.betaeubt <= 0 && abstand3D(m, p) < 12 &&
    (m.art === 'starrer' ? m.bewegtSeit > 0.3 : m.modus === 'jagen'));
}
function spielerImLaster() {
  const p = spielerKoerper.position, L = haus.laster;
  return p.x > L.x1 - 1 && p.x < L.x2 + 1.5 && p.z > L.z1 && p.z < L.z2 && p.y < 1.5;
}
function lautBei(p) {
  return Math.max(0.1, 1 - abstand3D(p, spielerKoerper.position) / 25);
}

// =====================================================================
// ===== Level starten und beenden =====
// =====================================================================
function neuesSpiel() {
  level = 1; konto = 0;
  starteLevel();
}
function starteLevel() {
  baueHaus();
  energie = 100; ausdauer = AUSDAUER_MAX;
  spielZeit = 0; pause = false; zielGemeldet = false;
  zustand = 'spiel';
  zeigeNachricht(`Level ${level}: Bring Schätze für ${euro(ld.ziel)} zum Transporter! 🚚`, 4);
  mausFangen();
}
function levelGeschafft() {
  const wert = lasterWert();
  konto += wert;
  levelErgebnis = { wert, helfer: helfer.map(h => `${h.name}: ${h.abgeliefert}`).join(' · ') };
  if (konto > rekord) { rekord = konto; try { localStorage.setItem('arag-rekord', String(rekord)); } catch (e) { /* egal */ } }
  zustand = 'geschafft';
  loslassen();
  sound.geschafft();
  if (document.pointerLockElement) document.exitPointerLock();
}

// =====================================================================
// ===== Zeichnen =====
// =====================================================================
function zeichne3D() {
  const p = spielerKoerper.position;
  const wippen = amBoden && Math.hypot(spielerKoerper.velocity.x, spielerKoerper.velocity.z) > 0.5 ? Math.sin(zeit * 11) * (geduckt ? 0.015 : 0.03) : 0;
  const ruckeln = wackeln > 0 ? (Math.random() - 0.5) * 0.08 : 0;
  kamera.position.set(p.x + ruckeln, p.y + (geduckt ? DUCK_AUGEN : AUGEN_HOEHE) + wippen, p.z);
  kamera.rotation.set(blick.hoch, blick.links, 0);
  kamera.updateMatrixWorld();
  for (const s of schaetze) { s.mesh.position.copy(s.body.position); s.mesh.quaternion.copy(s.body.quaternion); }
  for (const m of monster) zeigeMonster(m);
  for (const h of helfer) zeigeHelfer(h);
  // Flackernde Lampen, Kaminfeuer und Pendel
  hausGruppe.children.forEach(o => {
    if (!o.isPointLight || !o.userData.flackern) return;
    if (o.userData.flackern === 'feuer') o.intensity = o.userData.stark * (0.75 + Math.random() * 0.35);
    else o.intensity = Math.random() < 0.06 ? 0.1 : o.userData.stark;
  });
  for (const d of haus.bewegteDeko) {
    if (d.userData.feuer) d.scale.y = 0.8 + Math.random() * 0.5;
    if (d.userData.pendel) d.position.x = Math.sin(zeit * 2.5) * 0.12;
  }
  // Dein Greifer: Ring dreht sich, Zinken schließen sich beim Greifen, alles leuchtet heller
  greifer.position.y = -0.27 + wippen * 0.5;
  greiferRing.rotation.z += gegriffen ? 0.3 : schwebend ? 0.08 : 0.02;
  zinken.children.forEach(z => { z.children[0].rotation.x = gegriffen ? 0.35 : 0; });
  greiferLeucht.color.set(gegriffen ? '#b6fff0' : schwebend ? '#7cf5c6' : '#2f6b5a');
  greiferGlanz.material.opacity = gegriffen ? 0.9 : schwebend ? 0.5 : 0.15;
  greiferGlanz.scale.setScalar(gegriffen ? 0.16 + Math.sin(zeit * 20) * 0.02 : 0.1);
  if (gegriffen) {
    const von = new THREE.Vector3(); greiferSpitze.getWorldPosition(von);
    const nach = new THREE.Vector3().copy(gegriffen.body.position);
    const richtung = new THREE.Vector3(); kamera.getWorldDirection(richtung);
    zeigeStrahl(spielerStrahl, von, nach, richtung, Math.max(...gegriffen.typ.groesse) * 0.7);
  } else spielerStrahl.g.visible = false;
  if (renderer) renderer.render(szene, kamera);
  else szene.updateMatrixWorld();   // Ohne 3D trotzdem alle Positionen aktualisieren
}
function aufBildschirm(v) {
  const p = v.clone().project(kamera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, vorne: p.z < 1 };
}

function zeichneHUD() {
  // Rot blitzen, wenn du getroffen wurdest
  if (schadenBlitz > 0) { ctx.fillStyle = `rgba(255,0,0,${schadenBlitz * 0.5})`; ctx.fillRect(0, 0, W, H); }
  if (energie < 35) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,0,0,${0.25 + Math.sin(zeit * 6) * 0.1})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // Geduckt: dunkler Rand oben und unten
  if (geduckt) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, 40); ctx.fillRect(0, H - 40, W, 40);
  }
  // Schwebende Texte (z. B. "-120 €")
  for (const t of schwebeTexte) {
    const s = aufBildschirm(t.p);
    if (!s.vorne || t.p.distanceTo(kamera.position) > 15) continue;
    ctx.globalAlpha = Math.min(1, t.t);
    text(t.text, s.x, s.y, 18, t.farbe);
    ctx.globalAlpha = 1;
  }
  // Oben links: Level, Ziel, Raum und Stockwerk
  const imLasterJetzt = lasterWert();
  const p = spielerKoerper.position;
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, 12, 280, 92, 12); ctx.fill();
  text(`LEVEL ${level}`, 24, 30, 16, '#7cf5c6', 'left');
  text(`🚚 ${euro(imLasterJetzt)} / ${euro(ld.ziel)}`, 280, 30, 15, imLasterJetzt >= ld.ziel ? '#4ade80' : '#fff', 'right');
  balken(24, 50, 256, 14, imLasterJetzt / ld.ziel, imLasterJetzt >= ld.ziel ? '#4ade80' : '#7cf5c6');
  const raum = haus.raeume[raumNrVon(p.x, p.y, p.z)];
  text(`📍 ${raum.art.emoji} ${raum.art.name} · ${ETAGEN_NAMEN[raum.e]}`, 24, 86, 13, '#c9c3ff', 'left', false);
  // Oben rechts: Konto und Helfer
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(W - 282, 12, 270, 40 + helfer.length * 22, 12); ctx.fill();
  text(`💰 ${euro(konto)}`, W - 147, 32, 17, '#ffd166');
  helfer.forEach((h, k) => {
    const wo = ETAGEN_NAMEN[etageVon(h.body.position.y)] === ETAGEN_NAMEN[raum.e] ? '' : ` (${ETAGEN_NAMEN[etageVon(h.body.position.y)]})`;
    const was = h.kaputt > 0 ? `💤 kaputt (${Math.ceil(h.kaputt)} s)` : h.modus === 'tragen' ? `trägt ${h.auftrag.typ.emoji}${wo}` : h.modus === 'hinlaufen' ? `holt ${h.auftrag.typ.emoji}${wo}` : 'wartet';
    text(`🤖 ${h.name} ${h.kaputt > 0 ? '' : '❤️'.repeat(h.leben)}: ${was}`, W - 272, 60 + k * 22, 12, h.kaputt > 0 ? '#8a8f9e' : h.farbe, 'left', false);
  });
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 68 + helfer.length * 22, 13, '#fff', 'center', false);
  // Oben Mitte: Pfeil zum Transporter (oder zur Treppe, wenn du oben bist)
  const L = haus.laster;
  let zielX = (L.x1 + L.x2) / 2, zielZ = (L.z1 + L.z2) / 2, zielText = '🚚';
  if (raum.e > 0) {
    const pt = treppenPunkte(raum.treppeRunter || haus.treppen[raum.e - 1]);
    zielX = pt.oben.x; zielZ = pt.oben.z; zielText = '🪜 runter';
  }
  const zx = zielX - p.x, zz = zielZ - p.z;
  const vorne = zx * -Math.sin(blick.links) + zz * -Math.cos(blick.links);
  const rechts = zx * Math.cos(blick.links) + zz * -Math.sin(blick.links);
  const w = Math.atan2(rechts, vorne);
  ctx.save(); ctx.translate(W / 2, 34); ctx.rotate(w);
  ctx.fillStyle = '#7cf5c6'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, 10); ctx.lineTo(0, 4); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  text(`${zielText} ${Math.round(Math.hypot(zx, zz))} m`, W / 2, 62, 13, '#7cf5c6');
  // Unten links: Energie und Ausdauer
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, H - 72, 250, 60, 12); ctx.fill();
  text('🔋', 30, H - 52, 16, '#fff', 'center', false);
  balken(48, H - 60, 200, 14, energie / 100, energie > 35 ? '#4ade80' : '#ff6b6b');
  text('⚡', 30, H - 26, 14, '#fff', 'center', false);
  balken(48, H - 32, 200, 10, ausdauer / AUSDAUER_MAX, '#ffd166');
  if (geduckt) text('🦆 Geduckt – leise und schwer zu sehen', 272, H - 30, 13, '#c9c3ff', 'left');
  // Funk: Was die Helfer gerade sagen (Untertitel)
  funk.forEach((f, k) => {
    ctx.globalAlpha = Math.min(1, f.t);
    const y = H - 112 - k * 24;
    ctx.font = 'bold 14px system-ui, sans-serif';
    const b = ctx.measureText(`🤖 ${f.name}: ${f.satz}`).width + 24;
    ctx.fillStyle = 'rgba(10,12,18,0.7)'; rr(W / 2 - b / 2, y - 11, b, 22, 8); ctx.fill();
    text(`🤖 ${f.name}:`, W / 2 - b / 2 + 12, y, 14, f.farbe, 'left', false);
    text(f.satz, W / 2 - b / 2 + 12 + ctx.measureText(`🤖 ${f.name}: `).width, y, 14, '#fff', 'left', false);
    ctx.globalAlpha = 1;
  });
  // Fadenkreuz
  ctx.strokeStyle = schwebend ? '#7cf5c6' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, schwebend || gegriffen ? 10 : 3, 0, 7); ctx.stroke();
  // Infos zum Schatz, auf den du schaust oder den du hältst
  const s = gegriffen || schwebend;
  if (s) {
    const anteil = s.wert / s.wertMax;
    ctx.fillStyle = 'rgba(10,12,18,0.75)'; rr(W / 2 - 110, H / 2 + 24, 220, 62, 10); ctx.fill();
    text(`${s.typ.emoji} ${s.typ.name}`, W / 2, H / 2 + 38, 15, '#fff');
    text(euro(s.wert), W / 2, H / 2 + 57, 15, anteil > 0.6 ? '#4ade80' : anteil > 0.3 ? '#ffd166' : '#ff6b6b');
    balken(W / 2 - 90, H / 2 + 70, 180, 6, anteil, anteil > 0.6 ? '#4ade80' : anteil > 0.3 ? '#ffd166' : '#ff6b6b');
    text(gegriffen ? 'Loslassen: Maus los · Rechtsklick: werfen · Mausrad: näher/weiter' : 'Linksklick halten: greifen', W / 2, H / 2 + 100, 12, '#c9c3ff', 'center', true);
    if (s.typ.masse > 10 && !gegriffen) text('🏋️ Schwer!', W / 2, H / 2 + 118, 12, '#ffd166');
    if (s.getragenVon && !gegriffen) text(`🤖 ${s.getragenVon.name} trägt das gerade`, W / 2, H / 2 + 118, 12, s.getragenVon.farbe);
  }
  // Abfahren?
  if (lasterWert() >= ld.ziel) {
    const da = spielerImLaster();
    ctx.fillStyle = 'rgba(10,12,18,0.85)'; rr(W / 2 - 200, H - 70, 400, 46, 12); ctx.fill();
    text(da ? '✅ Ziel erreicht! Drück E zum Abfahren!' : '✅ Ziel erreicht! Geh zum Transporter und drück E', W / 2, H - 47, 16, '#4ade80');
  }
  // Ein Monster jagt dich!
  if (gejagt()) text('⚠️ GEJAGT!', W / 2, 95, 20 + Math.sin(zeit * 10) * 2, '#ff6b6b');
  // Nachricht
  if (nachricht) {
    ctx.globalAlpha = Math.min(1, nachricht.t);
    text(nachricht.text, W / 2, H / 2 - 90, 20, nachricht.farbe);
    ctx.globalAlpha = 1;
  }
  if (pause) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
    text('⏸️ PAUSE', W / 2, H / 2 - 20, 48, '#7cf5c6');
    text('Klicken: Weiterspielen', W / 2, H / 2 + 30, 18, '#fff');
  }
}

function zeichneRoboter(x, y, s, farbe = '#7cf5c6') {   // Ein kleiner ARAG-Roboter fürs Titelbild
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const schweben = Math.sin(zeit * 2 + x) * 4;
  ctx.translate(0, schweben);
  ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(10, -66, 5, 0, 7); ctx.fill();   // Antenne
  ctx.strokeStyle = '#d7dde6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(10, -61); ctx.lineTo(10, -45); ctx.stroke();
  ctx.fillStyle = farbe; rr(-38, -34, 10, 18, 4); ctx.fill(); rr(28, -34, 10, 18, 4); ctx.fill();   // Ohren
  ctx.fillStyle = '#d7dde6'; rr(-30, -45, 60, 44, 12); ctx.fill();                      // Kopf
  ctx.fillStyle = farbe; ctx.fillRect(-30, -45, 60, 6);
  ctx.fillStyle = '#071018'; rr(-22, -34, 44, 26, 7); ctx.fill();                        // Bildschirm
  ctx.fillStyle = farbe;
  const blinzeln = ((zeit + x / 100) % 4) < 0.15 ? 2 : 9;
  rr(-14, -26 - blinzeln / 2, 8, blinzeln, 3); ctx.fill(); rr(6, -26 - blinzeln / 2, 8, blinzeln, 3); ctx.fill();
  ctx.fillRect(-6, -15, 12, 2);
  ctx.fillStyle = farbe; rr(-24, 2, 48, 34, 10); ctx.fill();                            // Körper
  ctx.fillStyle = '#2b3038'; rr(-14, 8, 28, 16, 4); ctx.fill();
  ['#4ade80', '#ffd166', '#ff6b6b'].forEach((c, k) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-7 + k * 7, 16, 2.5, 0, 7); ctx.fill(); });
  ctx.strokeStyle = '#d7dde6'; ctx.lineWidth = 5; ctx.lineCap = 'round';                // Arme
  ctx.beginPath(); ctx.moveTo(-26, 10); ctx.lineTo(-36, 24); ctx.moveTo(26, 10); ctx.lineTo(36, 24); ctx.stroke();
  ctx.fillStyle = '#1a1d22'; rr(-30, 36, 60, 14, 7); ctx.fill();                         // Kette
  ctx.fillStyle = '#5f646d'; for (const k of [-18, 0, 18]) { ctx.beginPath(); ctx.arc(k, 43, 5, 0, 7); ctx.fill(); }
  ctx.restore();
}
function zeichneTitel() {
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, W, H);
  const licht = ctx.createRadialGradient(W / 2, 250, 30, W / 2, 250, 420);
  licht.addColorStop(0, 'rgba(124,245,198,0.12)'); licht.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = licht; ctx.fillRect(0, 0, W, H);
  text('ARAG', W / 2, 75, 84, '#7cf5c6');
  text('Automatische Roboter AufräumGruppe', W / 2, 132, 20, '#c9c3ff', 'center', false);
  zeichneRoboter(W / 2, 250, 1.5);
  HELFER.slice(0, HELFER_ANZAHL).forEach((h, k) => zeichneRoboter(W / 2 + (k === 0 ? -150 : 150), 275, 1.0, h.farbe));
  text('Hol die Schätze aus dem Spukhaus und bring sie zum Transporter 🚚', W / 2, 355, 17, '#fff', 'center', false);
  text('Deine Kollegen helfen mit 🤖 – aber jeder Stoß kostet Geld! Und pass auf die Monster auf ... 👻👂🗿', W / 2, 380, 14, '#ffb4b4', 'center', false);
  text('WASD: Laufen · Maus: Umschauen · Shift: Rennen (laut!) · Leertaste: Springen · C: Ducken (leise, unter Tische!)', W / 2, 425, 13, '#c9c3ff', 'center', false);
  text('Linksklick halten: Greifstrahl · Rechtsklick: Werfen · Mausrad: näher/weiter · E: Abfahren', W / 2, 446, 13, '#c9c3ff', 'center', false);
  text('Tipps: Das Haus hat Treppen 🪜 – auch oben liegen Schätze! Den Starrer nicht aus den Augen lassen!', W / 2, 468, 12, '#8a8fb0', 'center', false);
  const puls = 1 + Math.sin(zeit * 4) * 0.04;
  text('▶ Klicken zum Starten', W / 2, 525, 26 * puls, '#ffd166');
  if (rekord > 0) text(`🏆 Rekord: ${euro(rekord)}`, W / 2, 565, 15, '#ffd166', 'center', false);
  if (!renderer) text('⚠️ 3D geht auf diesem Computer leider nicht (kein WebGL).', W / 2, 588, 14, '#ff6b6b');
}
function zeichneGeschafft() {
  ctx.fillStyle = 'rgba(5,8,10,0.88)'; ctx.fillRect(0, 0, W, H);
  text(`✅ LEVEL ${level} GESCHAFFT!`, W / 2, 140, 46, '#4ade80');
  zeichneRoboter(W / 2, 250, 1.1);
  text(`Abgeliefert: ${euro(levelErgebnis.wert)}`, W / 2, 345, 24, '#fff');
  if (levelErgebnis.helfer) text(`🤖 Von deinen Helfern gebracht: ${levelErgebnis.helfer}`, W / 2, 378, 15, '#c9c3ff', 'center', false);
  text(`💰 Auf dem Konto: ${euro(konto)}`, W / 2, 415, 24, '#ffd166');
  if (konto >= rekord) text('🏆 Neuer Rekord!', W / 2, 452, 20, '#ffd166');
  const n = levelDaten(level + 1);
  const monsterText = [`${n.geister} 👻`, n.lauscher ? `${n.lauscher} 👂` : '', n.starrer ? `${n.starrer} 🗿` : ''].filter(Boolean).join(' ');
  text(`Nächstes Level: ${n.etagen} Stockwerke mit je ${n.breit}×${n.tief} Räumen, Ziel ${euro(n.ziel)}, Monster: ${monsterText}`, W / 2, 492, 15, '#c9c3ff', 'center', false);
  text('▶ Klicken für das nächste Level', W / 2, 545, 24, '#7cf5c6');
}
function zeichneKaputt() {
  ctx.fillStyle = 'rgba(25,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  text('🔧 ROBOTER KAPUTT! 🔧', W / 2, 170, 46, '#ff6b6b');
  text(`Erwischt von: ${kaputtGrund}`, W / 2, 240, 20, '#fff');
  text(`Du hast Level ${level} erreicht`, W / 2, 300, 22, '#fff');
  text(`💰 Gesammelt: ${euro(konto)}`, W / 2, 340, 24, '#ffd166');
  text(`🏆 Rekord: ${euro(rekord)}`, W / 2, 380, 18, '#ffd166');
  text('▶ Klicken für ein neues Spiel', W / 2, 470, 24, '#7cf5c6');
}
function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  zeichne3D();
  zeichneHUD();
  if (zustand === 'geschafft') zeichneGeschafft();
  if (zustand === 'kaputt') zeichneKaputt();
}

// =====================================================================
// ===== Steuerung =====
// =====================================================================
function mausFangen() {
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* geht nicht? Dann eben ohne */ }
}
document.addEventListener('pointerlockchange', () => {
  const jetzt = document.pointerLockElement === canvas;
  if (mausGefangen && !jetzt && zustand === 'spiel') { pause = true; loslassen(); }   // Esc gedrückt
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
});
addEventListener('keyup', e => { tasten[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in tasten) tasten[k] = false; });
canvas.addEventListener('pointerdown', e => {
  tonStart();
  if (zustand === 'titel') { neuesSpiel(); return; }
  if (zustand === 'geschafft') { level++; starteLevel(); return; }
  if (zustand === 'kaputt') { zustand = 'titel'; return; }
  if (pause || !mausGefangen) { pause = false; mausFangen(); return; }
  if (e.button === 0 && schwebend && !gegriffen) greifen(schwebend);
  if (e.button === 2) werfen();
});
addEventListener('pointerup', e => { if (e.button === 0) loslassen(); });
addEventListener('pointermove', e => {
  if (zustand !== 'spiel' || pause || !mausGefangen) return;
  blick.links -= (e.movementX || 0) * MAUS_EMPFINDLICH;
  blick.hoch = begrenzt(blick.hoch - (e.movementY || 0) * MAUS_EMPFINDLICH, -1.4, 1.4);
});
canvas.addEventListener('wheel', e => {
  if (gegriffen) { halteAbstand = begrenzt(halteAbstand - e.deltaY * 0.002, 1.2, 3.2); e.preventDefault(); }
}, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());   // Kein Menü bei Rechtsklick

// ===== Spielschleife =====
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, Math.max(0, (jetzt - letzte) / 1000));
  letzte = jetzt;
  zeit += dt;
  // Wenn irgendwo ein Fehler passiert, soll das Spiel nicht einfrieren (der Fehler steht dann in der Konsole, F12)
  try {
    update(dt);
    if (zustand === 'spiel' && !pause) schwebend = gegriffen ? null : schauAuf();
  } catch (e) { console.error('Fehler in update:', e); }
  try { zeichne(); } catch (e) { console.error('Fehler beim Zeichnen:', e); }
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
