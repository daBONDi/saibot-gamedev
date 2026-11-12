// 🤖 ARAG – Automatische Roboter AufräumGruppe (3D, Ich-Perspektive)
// Du bist ein kleiner Aufräum-Roboter. Im dunklen Spukhaus liegen wertvolle Schätze herum.
// Hol sie mit deinem Greifstrahl und bring sie zum Transporter – aber vorsichtig!
// Jeder Stoß kostet Geld, und in den Gängen lauern Monster ...
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
const TUER_BREITE = 2.2;         // So breit sind die Türen
const TUER_HOEHE = 2.4;          // So hoch sind die Türen
const LAUF_TEMPO = 4;            // Normal laufen (Meter pro Sekunde)
const RENN_TEMPO = 6.5;          // Rennen mit Shift
const AUSDAUER_MAX = 100;        // So lange kannst du rennen
const SPRUNG = 5;                // Wie hoch du springst
const GREIF_WEITE = 3.5;         // So weit reicht dein Greifstrahl
const WURF_KRAFT = 12;           // So fest wirfst du
const STOSS_GRENZE = 3;          // Ab diesem Aufprall-Tempo bekommt ein Schatz Kratzer
const KAPUTT_BEI = 0.15;         // Fällt der Wert unter 15 %, geht der Schatz kaputt!
const MAUS_EMPFINDLICH = 0.0022; // Wie schnell du dich mit der Maus drehst
const AUGEN_HOEHE = 0.85;        // So weit über der Körpermitte ist die Kamera
const KOERPER_RADIUS = 0.45;     // So dick ist dein Roboter

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
    breit: Math.min(6, 3 + Math.floor(n / 2)),        // Räume nebeneinander
    tief: Math.min(4, 3 + Math.floor((n - 1) / 3)),    // Räume hintereinander
    ziel: 2000 + (n - 1) * 1500,                       // So viel Geld musst du abliefern
    geister: 1 + Math.floor((n - 1) / 2),              // 👻 Staubgeister
    lauscher: n >= 2 ? 1 + Math.floor((n - 2) / 3) : 0, // 👂 Lauscher (ab Level 2)
  };
}

// ===== Hilfsfunktionen =====
const zufall = (a, b) => a + Math.random() * (b - a);
const zufallGanz = (a, b) => Math.floor(zufall(a, b + 1));
const auswahl = arr => arr[Math.floor(Math.random() * arr.length)];
const begrenzt = (v, a, b) => Math.max(a, Math.min(b, v));
const abstand2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function gewichtetWaehlen(liste) {
  let summe = 0;
  for (const t of liste) summe += t.haeufig;
  let r = Math.random() * summe;
  for (const t of liste) { r -= t.haeufig; if (r <= 0) return t; }
  return liste[0];
}
function rr(x, y, w, h, r) {   // Rechteck mit runden Ecken
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  autsch() { if (!spiele('autsch', 0.8, 0.8)) ton(150, 0, 0.3, 'sawtooth', 0.15, 60); },
  strahl() { if (!spiele('strahl', 0.25, 1.4)) ton(600, 0, 0.15, 'sine', 0.05, 900); },
  abgabe() { if (!spiele('abgabe', 0.5)) ton(880, 0, 0.2, 'square', 0.08, 1320); },
  geschafft() { if (!spiele('geschafft', 0.6)) [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.12, 0.2, 'square', 0.08)); },
  herz(laut) { ton(55, 0, 0.12, 'sine', 0.3 * laut); ton(50, 0.16, 0.12, 'sine', 0.22 * laut); },
  schritt() { ton(90, 0, 0.06, 'sine', 0.05, 50); },
  sprung() { ton(300, 0, 0.15, 'sine', 0.05, 500); },
  piep() { ton(660, 0, 0.1, 'square', 0.06); },
};

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
const holzTextur = malTextur(256, 256, (g, b, h) => {   // Holzdielen
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
});
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
const holzMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.8 });
const dunkelHolzMat = new THREE.MeshStandardMaterial({ color: '#3d2a1d', roughness: 0.8 });
const stoffMat = new THREE.MeshStandardMaterial({ color: '#5b2a3a', roughness: 1 });
const goldMat = new THREE.MeshStandardMaterial({ color: '#d4a537', metalness: 0.9, roughness: 0.3, emissive: '#3a2a05' });
const metallMat = new THREE.MeshStandardMaterial({ color: '#b8c0cc', metalness: 0.9, roughness: 0.35, emissive: '#111418' });

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
const G_WAND = 1, G_SPIELER = 2, G_SCHATZ = 4;

// Boden und Decke (unendlich große Flächen)
const bodenKoerper = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: standardMat, collisionFilterGroup: G_WAND });
bodenKoerper.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
const deckenKoerper = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: standardMat, collisionFilterGroup: G_WAND });
deckenKoerper.quaternion.setFromEuler(Math.PI / 2, 0, 0);
deckenKoerper.position.y = WAND_HOEHE;
welt.addBody(bodenKoerper); welt.addBody(deckenKoerper);

// Dein Roboter: eine Kugel, die nicht umkippen kann
const spielerKoerper = new CANNON.Body({
  mass: 60, shape: new CANNON.Sphere(KOERPER_RADIUS), material: spielerMat, fixedRotation: true,
  collisionFilterGroup: G_SPIELER, collisionFilterMask: G_WAND | G_SCHATZ,
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
let gegriffen = null, halteAbstand = 2.2, schwebend = null;
let nachricht = null, schwebeTexte = [], splitter = [];
let energie = 100, ausdauer = AUSDAUER_MAX, schadenBlitz = 0, schrittZeit = 0, herzZeit = 0, wackeln = 0;
let blick = { links: 0, hoch: 0 };
let amBoden = false, kaputtGrund = '', levelErgebnis = null;
const tasten = {};
function zeigeNachricht(t, dauer = 2.5, farbe = '#7cf5c6') { nachricht = { text: t, t: dauer, farbe }; }
function schwebeText(x, y, z, t, farbe) { schwebeTexte.push({ p: new THREE.Vector3(x, y, z), text: t, farbe, t: 1.5 }); }

// =====================================================================
// ===== Das Spukhaus bauen =====
// =====================================================================
// Das Haus ist ein Gitter aus Räumen. Zwischen manchen Räumen gibt es Türen.
// Es wird jedes Level neu und zufällig gebaut!
const hausGruppe = new THREE.Group();
szene.add(hausGruppe);
let wandKoerper = [], wandMeshes = [];

function raumVon(x, z) {   // In welchem Raum ist dieser Punkt?
  return {
    i: begrenzt(Math.floor(x / RAUM), 0, haus.breit - 1),
    j: begrenzt(Math.floor(z / RAUM), 0, haus.tief - 1),
  };
}
const raumNr = (i, j) => j * haus.breit + i;
const verbunden = (a, b) => haus.tueren.has(a < b ? `${a}-${b}` : `${b}-${a}`);
function tuerPunkt(a, b) {   // Die Mitte der Tür zwischen Raum a und b
  const ai = a % haus.breit, aj = Math.floor(a / haus.breit), bi = b % haus.breit, bj = Math.floor(b / haus.breit);
  if (aj === bj) return { x: Math.max(ai, bi) * RAUM, z: aj * RAUM + RAUM / 2 };
  return { x: ai * RAUM + RAUM / 2, z: Math.max(aj, bj) * RAUM };
}
function nachbarn(r) {
  const i = r % haus.breit, j = Math.floor(r / haus.breit), liste = [];
  if (i > 0) liste.push(r - 1);
  if (i < haus.breit - 1) liste.push(r + 1);
  if (j > 0) liste.push(r - haus.breit);
  if (j < haus.tief - 1) liste.push(r + haus.breit);
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

// Ein fester Klotz (Wand, Möbel): sieht man UND stößt man dagegen
function festerKlotz(x, y, z, b, h, t, mat, sichtBlock = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  hausGruppe.add(mesh);
  const k = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(b / 2, h / 2, t / 2)), material: standardMat, collisionFilterGroup: G_WAND });
  k.position.set(x, y, z);
  welt.addBody(k);
  wandKoerper.push(k);
  if (sichtBlock) wandMeshes.push(mesh);
  return mesh;
}
// Ein Wandstück von (x1,z1) nach (x2,z2), auf Wunsch mit Tür in der Mitte
function wandStueck(x1, z1, x2, z2, tuer, mat) {
  const D = 0.3, laenge = Math.hypot(x2 - x1, z2 - z1), entlangX = z1 === z2;
  const stueck = (von, bis, unten, oben) => {
    const mitte = (von + bis) / 2, l = bis - von;
    if (l <= 0.01) return;
    if (entlangX) festerKlotz(x1 + mitte, (unten + oben) / 2, z1, l, oben - unten, D, mat);
    else festerKlotz(x1, (unten + oben) / 2, z1 + mitte, D, oben - unten, l, mat);
  };
  if (!tuer) { stueck(0, laenge, 0, WAND_HOEHE); return; }
  const a = laenge / 2 - TUER_BREITE / 2, b = laenge / 2 + TUER_BREITE / 2;
  stueck(0, a, 0, WAND_HOEHE);
  stueck(b, laenge, 0, WAND_HOEHE);
  stueck(a, b, TUER_HOEHE, WAND_HOEHE);   // Über der Tür
  // Türrahmen
  for (const p of [a, b]) {
    if (entlangX) festerKlotz(x1 + p, TUER_HOEHE / 2, z1, 0.12, TUER_HOEHE, D + 0.08, dunkelHolzMat, false);
    else festerKlotz(x1, TUER_HOEHE / 2, z1 + p, D + 0.08, TUER_HOEHE, 0.12, dunkelHolzMat, false);
  }
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
  for (const s of splitter) szene.remove(s.mesh);
  wandKoerper = []; wandMeshes = []; schaetze = []; monster = []; splitter = []; schwebeTexte = [];
  gegriffen = null; schwebend = null;
}

function baueHaus() {
  hausAufraeumen();
  ld = levelDaten(level);
  haus = { breit: ld.breit, tief: ld.tief, tueren: new Set(), ablagen: [], hindernisse: [] };
  const anzahl = haus.breit * haus.tief;
  haus.start = raumNr(0, Math.floor(haus.tief / 2));
  // 1. Türen: Erst ein Weg zu jedem Raum (wie ein Labyrinth), dann noch ein paar Abkürzungen
  const besucht = new Set([haus.start]), stapel = [haus.start];
  const verbinde = (a, b) => haus.tueren.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  while (stapel.length) {
    const r = stapel[stapel.length - 1];
    const frei = nachbarn(r).filter(n => !besucht.has(n));
    if (!frei.length) { stapel.pop(); continue; }
    const n = auswahl(frei);
    verbinde(r, n); besucht.add(n); stapel.push(n);
  }
  for (let r = 0; r < anzahl; r++) for (const n of nachbarn(r)) if (n > r && Math.random() < 0.3) verbinde(r, n);

  // 2. Boden und Decke
  const B = haus.breit * RAUM, T = haus.tief * RAUM;
  const boden = holzTextur.clone(); boden.needsUpdate = true; boden.repeat.set(B / 3, T / 3);
  const bodenMesh = new THREE.Mesh(new THREE.PlaneGeometry(B, T), new THREE.MeshStandardMaterial({ map: boden, roughness: 0.85 }));
  bodenMesh.rotation.x = -Math.PI / 2; bodenMesh.position.set(B / 2, 0, T / 2); bodenMesh.receiveShadow = true;
  const decke = deckenTextur.clone(); decke.needsUpdate = true; decke.repeat.set(B / 2, T / 2);
  const deckenMesh = new THREE.Mesh(new THREE.PlaneGeometry(B, T), new THREE.MeshStandardMaterial({ map: decke, roughness: 1 }));
  deckenMesh.rotation.x = Math.PI / 2; deckenMesh.position.set(B / 2, WAND_HOEHE, T / 2);
  hausGruppe.add(bodenMesh, deckenMesh);

  // 3. Wände (mit Türen, wo Räume verbunden sind)
  const tapete = () => new THREE.MeshStandardMaterial({ map: auswahl(TAPETEN), roughness: 0.9 });
  for (let j = 0; j <= haus.tief; j++) for (let i = 0; i < haus.breit; i++) {   // Wände entlang x
    const tuer = j > 0 && j < haus.tief && verbunden(raumNr(i, j - 1), raumNr(i, j));
    wandStueck(i * RAUM, j * RAUM, (i + 1) * RAUM, j * RAUM, tuer, tapete());
  }
  for (let i = 0; i <= haus.breit; i++) for (let j = 0; j < haus.tief; j++) {   // Wände entlang z
    const tuer = i > 0 && i < haus.breit && verbunden(raumNr(i - 1, j), raumNr(i, j));
    wandStueck(i * RAUM, j * RAUM, i * RAUM, (j + 1) * RAUM, tuer, tapete());
  }

  // 4. Lampen (nicht in jedem Raum – manche Räume sind stockdunkel!)
  let lampen = 0;
  for (let r = 0; r < anzahl; r++) {
    if (r !== haus.start && (Math.random() < 0.45 || lampen >= 9)) continue;
    lampen++;
    const cx = (r % haus.breit) * RAUM + RAUM / 2, cz = Math.floor(r / haus.breit) * RAUM + RAUM / 2;
    const licht = new THREE.PointLight(r === haus.start ? '#c8ffe8' : '#ffcf8a', r === haus.start ? 2.2 : 1.4, 11, 1);
    licht.position.set(cx, WAND_HOEHE - 0.4, cz);
    licht.userData.flackern = r !== haus.start && Math.random() < 0.4;
    licht.userData.stark = licht.intensity;
    const birne = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe2b0' }));
    birne.position.copy(licht.position);
    const kabel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3), dunkelHolzMat);
    kabel.position.set(cx, WAND_HOEHE - 0.17, cz);
    hausGruppe.add(licht, birne, kabel);
  }

  // 5. Der Transporter (Abgabe-Zone) im Startraum, an der linken Wand
  const sj = Math.floor(haus.start / haus.breit) * RAUM;
  haus.laster = { x1: 0.15, x2: 3.5, z1: sj + 3.0, z2: sj + 7.0 };
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

  // 6. Möbel und Schätze in allen anderen Räumen
  for (let r = 0; r < anzahl; r++) if (r !== haus.start) moebelUndSchaetze(r);

  // 7. Monster in Räumen weit weg vom Start
  const weit = [];
  for (let r = 0; r < anzahl; r++) if (raumAbstand(haus.start, r) >= 2) weit.push(r);
  if (!weit.length) for (let r = 0; r < anzahl; r++) if (r !== haus.start) weit.push(r);
  for (let k = 0; k < ld.geister; k++) neuesMonster('geist', auswahl(weit));
  for (let k = 0; k < ld.lauscher; k++) neuesMonster('lauscher', auswahl(weit));

  // 8. Du startest in der Mitte vom Startraum und schaust zum Transporter
  spielerKoerper.position.set(RAUM / 2, KOERPER_RADIUS + 0.05, sj + RAUM / 2);
  spielerKoerper.velocity.set(0, 0, 0);
  blick.links = Math.PI / 2; blick.hoch = -0.1;
}

// Möbel in einen Raum stellen (an die Ecken, damit die Türen frei bleiben) und Schätze verteilen
function moebelUndSchaetze(r) {
  const x0 = (r % haus.breit) * RAUM, z0 = Math.floor(r / haus.breit) * RAUM;
  const belegt = [];   // Wo schon was steht: [x1, z1, x2, z2]
  const ablagen = [];  // Wo man Schätze draufstellen kann
  const frei = (x1, z1, x2, z2) => belegt.every(b => x2 < b[0] || x1 > b[2] || z2 < b[1] || z1 > b[3]);
  // Tische in der Nähe der Ecken
  const ecken = [[2.6, 2.6], [7.4, 2.6], [2.6, 7.4], [7.4, 7.4]].sort(() => Math.random() - 0.5);
  const tische = zufallGanz(1, 2);
  for (let k = 0; k < tische; k++) {
    const [ex, ez] = ecken[k], quer = Math.random() < 0.5;
    const b = quer ? 1.8 : 1.0, t = quer ? 1.0 : 1.8, x = x0 + ex, z = z0 + ez;
    festerKlotz(x, 0.39, z, b, 0.78, t, holzMat);
    festerKlotz(x, 0.8, z, b + 0.1, 0.05, t + 0.1, dunkelHolzMat, false);   // Tischplatte
    belegt.push([x - b / 2 - 0.4, z - t / 2 - 0.4, x + b / 2 + 0.4, z + t / 2 + 0.4]);
    ablagen.push({ x, z, b: b - 0.3, t: t - 0.3, y: 0.83 });
  }
  // Ein Schrank oder Sofa an einer Wand (in einer Ecke, wo noch nichts steht)
  for (const [ex, ez] of ecken.slice(tische)) {
    if (Math.random() < 0.5) continue;
    const art = Math.random() < 0.5 ? 'schrank' : 'sofa';
    const anWandX = ex < 5 ? 0.6 : RAUM - 0.6;   // Steht an der linken oder rechten Wand
    const x = x0 + anWandX, z = z0 + (ez < 5 ? 1.8 : RAUM - 1.8);
    if (art === 'schrank') {
      festerKlotz(x, 1.0, z, 0.6, 2.0, 1.6, dunkelHolzMat);
      for (const y of [0.5, 1.0, 1.5]) festerKlotz(x + (ex < 5 ? 0.31 : -0.31), y, z, 0.02, 0.04, 1.4, goldMat, false);
    } else {
      festerKlotz(x, 0.25, z, 0.9, 0.5, 2.0, stoffMat);
      festerKlotz(x + (ex < 5 ? -0.3 : 0.3), 0.6, z, 0.3, 0.7, 2.0, stoffMat);
    }
    belegt.push([x - 0.8, z - 1.4, x + 0.8, z + 1.4]);
  }
  // Schätze: manche auf Tischen, manche auf dem Boden
  const anzahl = zufallGanz(1, 3);
  for (let k = 0; k < anzahl; k++) {
    const typ = gewichtetWaehlen(SCHAETZE);
    const [sb, sh, st] = typ.groesse;
    if (!typ.boden && ablagen.length && Math.random() < 0.6) {
      const a = auswahl(ablagen);
      neuerSchatz(typ, a.x + zufall(-a.b / 2, a.b / 2) * 0.6, a.y + sh / 2 + 0.03, a.z + zufall(-a.t / 2, a.t / 2) * 0.6);
      continue;
    }
    for (let versuch = 0; versuch < 20; versuch++) {
      const x = x0 + zufall(1.2, RAUM - 1.2), z = z0 + zufall(1.2, RAUM - 1.2);
      const g = Math.max(sb, st) / 2 + 0.2;
      if (!frei(x - g, z - g, x + g, z + g)) continue;
      if (Math.abs(x - x0 - RAUM / 2) < 1.3 && Math.abs(z - z0 - RAUM / 2) < 1.3) continue;   // Mitte frei lassen
      neuerSchatz(typ, x, sh / 2 + 0.03, z);
      belegt.push([x - g, z - g, x + g, z + g]);
      break;
    }
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
    collisionFilterGroup: G_SCHATZ, collisionFilterMask: G_WAND | G_SPIELER | G_SCHATZ,
  });
  body.sleepSpeedLimit = 0.2;
  body.position.set(x, y, z);
  body.quaternion.setFromEuler(0, zufall(0, Math.PI * 2), 0);
  welt.addBody(body);
  const s = { typ, mesh, body, wert: wertMax, wertMax, letzterStoss: 0, kaputt: false, zerbrechen: false, geworfen: 0 };
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
  sound.stoss(Math.min(1, tempo / 8) * lautBei(p));
  laerm(p.x, p.z, 2 + tempo);
  if (s.wert < s.wertMax * KAPUTT_BEI) s.zerbrechen = true;   // Kaputt machen wir nach dem Physik-Schritt
}
function zerbrechen(s) {
  s.kaputt = true;
  if (gegriffen === s) loslassen();
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
  laerm(p.x, p.z, 12);   // Das war laut! Der Lauscher hört das ...
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
// 👻 Staubgeist: schwebt herum. Sieht er dich, jagt er dich! Wirf was auf ihn, dann ist er kurz betäubt.
// 👂 Lauscher: ist blind, hört aber alles! Lauter Krach (Rennen, Stöße, Zerbrechen) lockt ihn an. Steh still, dann findet er dich nicht.
const MONSTER_ARTEN = {
  geist:    { name: 'Staubgeist', tempo: 1.6, jagdTempo: 3.3, schaden: 30, sicht: 14 },
  lauscher: { name: 'Lauscher',   tempo: 1.0, jagdTempo: 4.6, schaden: 45, hoeren: 2.5 },
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
  } else {
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
  }
  g.traverse(o => { o.castShadow = true; });
  szene.add(g);
  return g;
}
function neuesMonster(art, raum) {
  const i = raum % haus.breit, j = Math.floor(raum / haus.breit);
  const m = {
    art, info: MONSTER_ARTEN[art], mesh: baueMonsterMesh(art),
    x: i * RAUM + RAUM / 2 + zufall(-2, 2), z: j * RAUM + RAUM / 2 + zufall(-2, 2), winkel: 0,
    modus: 'wandern', ziel: null, zielZeit: 0, angriffPause: 0, betaeubt: 0, siehtNicht: 0, sichtCheck: 0, lautZeit: 0, phase: zufall(0, 6),
  };
  monster.push(m);
}
// Jemand hat Krach gemacht! Monster in der Nähe hören das.
function laerm(x, z, staerke) {
  for (const m of monster) {
    if (m.betaeubt > 0) continue;
    const d = abstand2D(m.x, m.z, x, z);
    if (m.art === 'lauscher' && d < staerke * m.info.hoeren) {
      if (m.modus !== 'jagen' && zeit - m.lautZeit > 4) { m.lautZeit = zeit; sound.lauscher(); }
      m.modus = 'jagen'; m.ziel = { x, z }; m.zielZeit = 6;
    } else if (m.art === 'geist' && m.modus === 'wandern' && d < staerke * 1.2) {
      m.modus = 'nachsehen'; m.ziel = { x, z }; m.zielZeit = 8;   // Was war das? Mal nachsehen ...
    }
  }
}
const sichtStrahl = new THREE.Raycaster();
function siehtSpieler(m) {
  const p = spielerKoerper.position;
  const d = Math.hypot(m.x - p.x, m.z - p.z);
  if (d > m.info.sicht) return false;
  const von = new THREE.Vector3(m.x, 1.3, m.z), nach = new THREE.Vector3(p.x, p.y + AUGEN_HOEHE * 0.5, p.z);
  const richtung = nach.clone().sub(von);
  const l = richtung.length();
  sichtStrahl.set(von, richtung.normalize());
  sichtStrahl.far = l;
  return sichtStrahl.intersectObjects(wandMeshes, false).length === 0;
}
function zufallsZiel(m) {   // Irgendwo hin wandern (meist in einen Nachbarraum)
  const r = raumVon(m.x, m.z), jetzt = raumNr(r.i, r.j);
  const moeglich = nachbarn(jetzt).filter(n => verbunden(jetzt, n));
  const raum = Math.random() < 0.7 && moeglich.length ? auswahl(moeglich) : jetzt;
  const i = raum % haus.breit, j = Math.floor(raum / haus.breit);
  return { x: i * RAUM + zufall(2, RAUM - 2), z: j * RAUM + zufall(2, RAUM - 2) };
}
// Wohin muss das Monster jetzt laufen, um zum Ziel zu kommen? (durch die Türen!)
function wegPunkt(m, ziel) {
  const a = raumVon(m.x, m.z), b = raumVon(ziel.x, ziel.z);
  const ra = raumNr(a.i, a.j), rb = raumNr(b.i, b.j);
  if (ra === rb) return ziel;
  const n = naechsterRaum(ra, rb);
  if (n === ra) return ziel;
  const t = tuerPunkt(ra, n);
  if (abstand2D(m.x, m.z, t.x, t.z) < 0.7) {   // An der Tür: durch in den nächsten Raum!
    return { x: (n % haus.breit) * RAUM + RAUM / 2, z: Math.floor(n / haus.breit) * RAUM + RAUM / 2 };
  }
  return t;
}
function updateMonster(m, dt) {
  const p = spielerKoerper.position, info = m.info;
  m.phase += dt;
  m.angriffPause -= dt;
  if (m.betaeubt > 0) { m.betaeubt -= dt; return; }
  // Sehen (nur der Geist) – nicht jedes Bild, das spart Rechenzeit
  if (m.art === 'geist') {
    m.sichtCheck -= dt;
    if (m.sichtCheck <= 0) {
      m.sichtCheck = 0.2;
      if (siehtSpieler(m)) {
        if (m.modus !== 'jagen') { sound.geist(); zeigeNachricht('👻 Der Staubgeist hat dich gesehen! LAUF!', 2, '#ff6b6b'); }
        m.modus = 'jagen'; m.siehtNicht = 0; m.ziel = { x: p.x, z: p.z }; m.zielZeit = 5;
      } else if (m.modus === 'jagen') {
        m.siehtNicht += 0.2;
        if (m.siehtNicht > 4) { m.modus = 'wandern'; m.ziel = null; }   // Spur verloren
      }
    }
  }
  // Ziel aussuchen
  m.zielZeit -= dt;
  if (!m.ziel || m.zielZeit <= 0 || (m.modus === 'wandern' && abstand2D(m.x, m.z, m.ziel.x, m.ziel.z) < 0.5)) {
    if (m.modus !== 'wandern' && m.zielZeit <= 0) m.modus = 'wandern';
    if (m.modus === 'wandern') {
      // Der Lauscher bleibt oft stehen und lauscht
      m.ziel = m.art === 'lauscher' && Math.random() < 0.5 ? { x: m.x, z: m.z } : zufallsZiel(m);
      m.zielZeit = zufall(4, 9);
    }
  }
  // Laufen
  const wp = wegPunkt(m, m.ziel);
  const dx = wp.x - m.x, dz = wp.z - m.z, d = Math.hypot(dx, dz);
  const tempo = m.modus === 'wandern' ? info.tempo : info.jagdTempo;
  m.laeuft = d > 0.2;
  if (m.laeuft) {
    const schritt = Math.min(d, tempo * dt);
    m.x += dx / d * schritt; m.z += dz / d * schritt;
    const zielWinkel = Math.atan2(dx, dz);
    let diff = zielWinkel - m.winkel;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.winkel += begrenzt(diff, -dt * 5, dt * 5);
  } else if (m.modus === 'nachsehen' || (m.art === 'lauscher' && m.modus === 'jagen')) {
    m.zielZeit = Math.min(m.zielZeit, 1.5);   // Angekommen und nichts gefunden
  }
  // Angriff!
  const dSpieler = Math.hypot(m.x - p.x, m.z - p.z);
  if (dSpieler < 1.0 && m.angriffPause <= 0 && p.y < 2) {
    m.angriffPause = 2;
    getroffen(info.schaden, `${m.art === 'geist' ? '👻' : '👂'} ${info.name}`);
    const weg = new CANNON.Vec3(p.x - m.x, 0, p.z - m.z);
    weg.normalize();
    spielerKoerper.velocity.set(weg.x * 9, 3, weg.z * 9);   // Wegschubsen
  }
  // Getroffen von einem geworfenen Schatz? Dann betäubt!
  for (const s of schaetze) {
    if (s.geworfen <= 0) continue;
    const sp = s.body.position, v = s.body.velocity.length();
    if (v > 4 && Math.hypot(sp.x - m.x, sp.z - m.z) < 0.8 && sp.y > 0.2 && sp.y < 2.4) {
      m.betaeubt = 4; m.modus = 'wandern'; m.ziel = null;
      s.body.velocity.scale(-0.3, s.body.velocity);
      s.geworfen = 0;
      zeigeNachricht(`💫 Treffer! Der ${info.name} ist betäubt!`, 2, '#ffd166');
      sound.stoss(1);
    }
  }
}
function zeigeMonster(m) {
  const g = m.mesh;
  if (m.art === 'geist') {
    const wackel = m.betaeubt > 0 ? Math.sin(zeit * 20) * 0.3 : 0;
    g.position.set(m.x, 1.25 + Math.sin(m.phase * 2) * 0.12, m.z);
    g.rotation.set(0, m.winkel + wackel, m.betaeubt > 0 ? 0.4 : 0);
    g.children.forEach(k => {   // Der Staub wirbelt herum
      if (k.userData.kreisen === undefined) return;
      k.userData.kreisen += 0.02;
      k.position.x += Math.cos(k.userData.kreisen) * 0.003;
      k.position.y += Math.sin(k.userData.kreisen * 1.3) * 0.003;
    });
    g.userData.auge.color.set(m.betaeubt > 0 ? '#555' : m.modus === 'jagen' ? '#ff2a2a' : '#aa3333');
  } else {
    const schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 14 : 6)) : 0;
    g.position.set(m.x, Math.abs(schritt) * 0.08, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.3 : 0, m.winkel, schritt * 0.05);
    g.userData.ohrMat.emissive.set(m.modus === 'jagen' ? '#7a1f5a' : '#000000');   // Ohren glühen, wenn er was gehört hat
  }
}

// =====================================================================
// ===== Dein Roboter und der Greifstrahl =====
// =====================================================================
// Der Greifer unten rechts im Bild
const greifer = new THREE.Group();
greifer.position.set(0.28, -0.24, -0.5);
const greiferMat = new THREE.MeshStandardMaterial({ color: '#d7dde6', metalness: 0.6, roughness: 0.35 });
greifer.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.32), greiferMat));
const greiferStreifen = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.2), new THREE.MeshBasicMaterial({ color: '#7cf5c6' }));
greiferStreifen.position.set(0, 0.04, 0);
greifer.add(greiferStreifen);
const greiferSpitze = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#7cf5c6' }));
greiferSpitze.position.set(0, 0, -0.18);
greifer.add(greiferSpitze);
greifer.traverse(o => { o.renderOrder = 10; });
kamera.add(greifer);
// Der Strahl selbst (ein dünner leuchtender Zylinder)
const strahl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: '#7cf5c6', transparent: true, opacity: 0.7 }));
strahl.visible = false;
szene.add(strahl);

const greifStrahl = new THREE.Raycaster();
const MITTE = new THREE.Vector2(0, 0);
function schauAuf() {   // Auf welchen Schatz schaust du gerade?
  greifStrahl.setFromCamera(MITTE, kamera);
  greifStrahl.far = GREIF_WEITE;
  const treffer = greifStrahl.intersectObjects([...schaetze.map(s => s.mesh), ...wandMeshes], true);
  if (!treffer.length) return null;
  return treffer[0].object.userData.schatz || null;
}
function greifen(s) {
  gegriffen = s;
  const p = s.body.position;
  halteAbstand = begrenzt(kamera.position.distanceTo(new THREE.Vector3(p.x, p.y, p.z)), 1.3, 3);
  s.body.collisionFilterMask = G_WAND | G_SCHATZ;   // Was du hältst, stößt nicht an dich selbst
  s.body.wakeUp();
  sound.strahl();
}
function loslassen() {
  if (!gegriffen) return;
  gegriffen.body.collisionFilterMask = G_WAND | G_SPIELER | G_SCHATZ;
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
  laerm(spielerKoerper.position.x, spielerKoerper.position.z, 3);
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
  if (energie <= 0) {
    energie = 0;
    kaputtGrund = von;
    zustand = 'kaputt';
    if (document.pointerLockElement) document.exitPointerLock();
  }
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
  const vor = (tasten['w'] || tasten['arrowup'] ? 1 : 0) - (tasten['s'] || tasten['arrowdown'] ? 1 : 0);
  const seite = (tasten['d'] || tasten['arrowright'] ? 1 : 0) - (tasten['a'] || tasten['arrowleft'] ? 1 : 0);
  const sinY = Math.sin(blick.links), cosY = Math.cos(blick.links);
  let dx = -sinY * vor + cosY * seite, dz = -cosY * vor - sinY * seite;
  const l = Math.hypot(dx, dz);
  const laeuft = l > 0;
  if (laeuft) { dx /= l; dz /= l; }
  const rennt = laeuft && tasten['shift'] && ausdauer > 0;
  if (rennt) ausdauer = Math.max(0, ausdauer - 30 * dt);
  else ausdauer = Math.min(AUSDAUER_MAX, ausdauer + (laeuft ? 10 : 20) * dt);
  let tempo = rennt ? RENN_TEMPO : LAUF_TEMPO;
  if (gegriffen) tempo *= 1 - Math.min(0.55, gegriffen.typ.masse / 60);   // Schweres tragen macht langsam
  const v = spielerKoerper.velocity, k = Math.min(1, dt * (amBoden ? 12 : 3));
  v.x += (dx * tempo - v.x) * k;
  v.z += (dz * tempo - v.z) * k;
  if (tasten[' '] && amBoden && v.y < 1) { v.y = SPRUNG; sound.sprung(); }
  // Schritte: Rennen ist laut, Gehen ist leise
  if (laeuft && amBoden) {
    schrittZeit -= dt * (rennt ? 1.6 : 1);
    if (schrittZeit <= 0) {
      schrittZeit = 0.45;
      sound.schritt();
      const p = spielerKoerper.position;
      laerm(p.x, p.z, rennt ? 4 : 1.2);
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
  if (zustand !== 'spiel' || pause) return;
  spielZeit += dt;

  updateSpieler(dt);
  haltenPhysik();
  welt.step(1 / 60, dt, 3);
  pruefeBoden();
  for (const s of [...schaetze]) {
    if (s.zerbrechen && !s.kaputt) zerbrechen(s);
    s.geworfen -= dt;
  }
  // Ist ein Schatz aus dem Haus gefallen? (sollte nicht passieren, aber sicher ist sicher)
  for (const s of schaetze) if (s.body.position.y < -2) { s.body.position.set(RAUM / 2, 1, haus.laster.z1 + 2); s.body.velocity.set(0, 0, 0); }
  for (const m of monster) updateMonster(m, dt);

  // Neue Schätze im Transporter?
  for (const s of schaetze) {
    const drin = imLaster(s);
    if (drin && !s.warDrin) { sound.abgabe(); schwebeText(s.body.position.x, s.body.position.y + 0.6, s.body.position.z, `+${euro(s.wert)} 🚚`, '#7cf5c6'); }
    s.warDrin = drin;
  }
  // Herzklopfen, wenn ein Monster dich jagt
  const jaeger = monster.filter(m => m.modus === 'jagen' && m.betaeubt <= 0 && Math.hypot(m.x - spielerKoerper.position.x, m.z - spielerKoerper.position.z) < 12);
  herzZeit -= dt;
  if (jaeger.length && herzZeit <= 0) { herzZeit = 0.7; sound.herz(0.8); }
  // Abfahren!
  if (tasten['e'] && spielerImLaster() && lasterWert() >= ld.ziel) levelGeschafft();
  // Splitter und Schwebetexte
  for (const sp of splitter) {
    sp.t -= dt;
    sp.v.y -= 9.8 * dt;
    sp.mesh.position.addScaledVector(sp.v, dt);
    if (sp.mesh.position.y < 0.03) { sp.mesh.position.y = 0.03; sp.v.set(sp.v.x * 0.5, 0, sp.v.z * 0.5); }
    sp.mesh.rotation.x += dt * 5;
    if (sp.t <= 0) szene.remove(sp.mesh);
  }
  splitter = splitter.filter(sp => sp.t > 0);
  for (const t of schwebeTexte) { t.t -= dt; t.p.y += dt * 0.5; }
  schwebeTexte = schwebeTexte.filter(t => t.t > 0);
}
function spielerImLaster() {
  const p = spielerKoerper.position, L = haus.laster;
  return p.x > L.x1 - 1 && p.x < L.x2 + 1.5 && p.z > L.z1 && p.z < L.z2;
}
function lautBei(p) {
  const s = spielerKoerper.position;
  return Math.max(0.1, 1 - Math.hypot(p.x - s.x, p.z - s.z) / 25);
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
  spielZeit = 0; pause = false;
  zustand = 'spiel';
  zeigeNachricht(`Level ${level}: Bring Schätze für ${euro(ld.ziel)} zum Transporter! 🚚`, 4);
  mausFangen();
}
function levelGeschafft() {
  const wert = lasterWert();
  konto += wert;
  levelErgebnis = { wert, kaputt: 0 };
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
  const wippen = amBoden && Math.hypot(spielerKoerper.velocity.x, spielerKoerper.velocity.z) > 0.5 ? Math.sin(zeit * 11) * 0.03 : 0;
  const ruckeln = wackeln > 0 ? (Math.random() - 0.5) * 0.08 : 0;
  kamera.position.set(p.x + ruckeln, p.y + AUGEN_HOEHE + wippen, p.z);
  kamera.rotation.set(blick.hoch, blick.links, 0);
  kamera.updateMatrixWorld();
  for (const s of schaetze) { s.mesh.position.copy(s.body.position); s.mesh.quaternion.copy(s.body.quaternion); }
  for (const m of monster) zeigeMonster(m);
  // Flackernde Lampen
  hausGruppe.children.forEach(o => { if (o.isPointLight && o.userData.flackern) o.intensity = Math.random() < 0.06 ? 0.1 : o.userData.stark; });
  // Greifstrahl
  greifer.position.y = -0.24 + wippen * 0.5;
  strahl.visible = !!gegriffen;
  greiferSpitze.material.color.set(gegriffen ? '#ffffff' : schwebend ? '#7cf5c6' : '#3a6b5c');
  if (gegriffen) {
    const von = new THREE.Vector3(); greiferSpitze.getWorldPosition(von);
    const nach = new THREE.Vector3().copy(gegriffen.body.position);
    const mitte = von.clone().add(nach).multiplyScalar(0.5);
    const richtung = nach.clone().sub(von);
    strahl.position.copy(mitte);
    strahl.scale.set(1, richtung.length(), 1);
    strahl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), richtung.normalize());
    strahl.material.opacity = 0.5 + Math.sin(zeit * 30) * 0.2;
  }
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
  // Schwebende Texte (z. B. "-120 €")
  for (const t of schwebeTexte) {
    const s = aufBildschirm(t.p);
    if (!s.vorne || t.p.distanceTo(kamera.position) > 15) continue;
    ctx.globalAlpha = Math.min(1, t.t);
    text(t.text, s.x, s.y, 18, t.farbe);
    ctx.globalAlpha = 1;
  }
  // Oben links: Level und Ziel
  const imLasterJetzt = lasterWert();
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, 12, 280, 70, 12); ctx.fill();
  text(`LEVEL ${level}`, 24, 30, 16, '#7cf5c6', 'left');
  text(`🚚 ${euro(imLasterJetzt)} / ${euro(ld.ziel)}`, 280, 30, 15, imLasterJetzt >= ld.ziel ? '#4ade80' : '#fff', 'right');
  balken(24, 50, 256, 14, imLasterJetzt / ld.ziel, imLasterJetzt >= ld.ziel ? '#4ade80' : '#7cf5c6');
  // Oben rechts: Konto
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(W - 212, 12, 200, 40, 12); ctx.fill();
  text(`💰 ${euro(konto)}`, W - 112, 32, 17, '#ffd166');
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 68, 13, '#fff', 'center', false);
  // Oben Mitte: Pfeil zum Transporter
  const p = spielerKoerper.position, L = haus.laster;
  const zx = (L.x1 + L.x2) / 2 - p.x, zz = (L.z1 + L.z2) / 2 - p.z;
  const vorne = zx * -Math.sin(blick.links) + zz * -Math.cos(blick.links);
  const rechts = zx * Math.cos(blick.links) + zz * -Math.sin(blick.links);
  const w = Math.atan2(rechts, vorne);
  ctx.save(); ctx.translate(W / 2, 34); ctx.rotate(w);
  ctx.fillStyle = '#7cf5c6'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, 10); ctx.lineTo(0, 4); ctx.lineTo(-11, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  text(`🚚 ${Math.round(Math.hypot(zx, zz))} m`, W / 2, 62, 13, '#7cf5c6');
  // Unten links: Energie und Ausdauer
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, H - 72, 250, 60, 12); ctx.fill();
  text('🔋', 30, H - 52, 16, '#fff', 'center', false);
  balken(48, H - 60, 200, 14, energie / 100, energie > 35 ? '#4ade80' : '#ff6b6b');
  text('⚡', 30, H - 26, 14, '#fff', 'center', false);
  balken(48, H - 32, 200, 10, ausdauer / AUSDAUER_MAX, '#ffd166');
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
  }
  // Abfahren?
  if (lasterWert() >= ld.ziel) {
    const da = spielerImLaster();
    ctx.fillStyle = 'rgba(10,12,18,0.85)'; rr(W / 2 - 200, H - 70, 400, 46, 12); ctx.fill();
    text(da ? '✅ Ziel erreicht! Drück E zum Abfahren!' : '✅ Ziel erreicht! Geh zum Transporter und drück E', W / 2, H - 47, 16, '#4ade80');
  }
  // Ein Monster jagt dich!
  if (monster.some(m => m.modus === 'jagen' && m.betaeubt <= 0 && Math.hypot(m.x - p.x, m.z - p.z) < 12)) {
    text('⚠️ GEJAGT!', W / 2, 95, 20 + Math.sin(zeit * 10) * 2, '#ff6b6b');
  }
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

function zeichneRoboter(x, y, s) {   // Ein kleiner ARAG-Roboter fürs Titelbild
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const schweben = Math.sin(zeit * 2) * 4;
  ctx.translate(0, schweben);
  ctx.fillStyle = '#7cf5c6'; ctx.beginPath(); ctx.arc(0, -62, 5, 0, 7); ctx.fill();   // Antenne
  ctx.strokeStyle = '#d7dde6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -57); ctx.lineTo(0, -44); ctx.stroke();
  ctx.fillStyle = '#d7dde6'; rr(-30, -45, 60, 44, 12); ctx.fill();                      // Kopf
  ctx.fillStyle = '#10141c'; rr(-22, -36, 44, 20, 8); ctx.fill();                        // Visier
  ctx.fillStyle = '#7cf5c6';
  const blinzeln = (zeit % 4) < 0.15 ? 2 : 7;
  ctx.fillRect(-14, -26 - blinzeln / 2, 9, blinzeln); ctx.fillRect(5, -26 - blinzeln / 2, 9, blinzeln);
  ctx.fillStyle = '#b8c0cc'; rr(-24, 2, 48, 36, 10); ctx.fill();                        // Körper
  ctx.fillStyle = '#7cf5c6'; ctx.fillRect(-16, 14, 32, 5);                                // Streifen
  ctx.fillStyle = '#5b6575'; ctx.beginPath(); ctx.arc(-14, 46, 8, 0, 7); ctx.arc(14, 46, 8, 0, 7); ctx.fill();   // Räder
  ctx.restore();
}
function zeichneTitel() {
  ctx.fillStyle = '#07080c'; ctx.fillRect(0, 0, W, H);
  const licht = ctx.createRadialGradient(W / 2, 250, 30, W / 2, 250, 420);
  licht.addColorStop(0, 'rgba(124,245,198,0.12)'); licht.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = licht; ctx.fillRect(0, 0, W, H);
  text('ARAG', W / 2, 80, 84, '#7cf5c6');
  text('Automatische Roboter AufräumGruppe', W / 2, 140, 20, '#c9c3ff', 'center', false);
  zeichneRoboter(W / 2, 270, 1.6);
  text('Hol die Schätze aus dem Spukhaus und bring sie zum Transporter 🚚', W / 2, 375, 17, '#fff', 'center', false);
  text('Aber Vorsicht: Jeder Stoß kostet Geld! Und pass auf die Monster auf ... 👻👂', W / 2, 400, 15, '#ffb4b4', 'center', false);
  text('WASD: Laufen · Maus: Umschauen · Shift: Rennen (laut!) · Leertaste: Springen', W / 2, 445, 13, '#c9c3ff', 'center', false);
  text('Linksklick halten: Greifstrahl · Rechtsklick: Werfen · Mausrad: näher/weiter · E: Abfahren', W / 2, 466, 13, '#c9c3ff', 'center', false);
  text('Tipp: Der Lauscher ist blind – bleib still stehen! Wirf Sachen auf den Staubgeist, dann ist er betäubt.', W / 2, 487, 12, '#8a8fb0', 'center', false);
  const puls = 1 + Math.sin(zeit * 4) * 0.04;
  text('▶ Klicken zum Starten', W / 2, 535, 26 * puls, '#ffd166');
  if (rekord > 0) text(`🏆 Rekord: ${euro(rekord)}`, W / 2, 575, 15, '#ffd166', 'center', false);
  if (!renderer) text('⚠️ 3D geht auf diesem Computer leider nicht (kein WebGL).', W / 2, 590, 14, '#ff6b6b');
}
function zeichneGeschafft() {
  ctx.fillStyle = 'rgba(5,8,10,0.88)'; ctx.fillRect(0, 0, W, H);
  text(`✅ LEVEL ${level} GESCHAFFT!`, W / 2, 150, 46, '#4ade80');
  zeichneRoboter(W / 2, 270, 1.1);
  text(`Abgeliefert: ${euro(levelErgebnis.wert)}`, W / 2, 360, 24, '#fff');
  text(`💰 Auf dem Konto: ${euro(konto)}`, W / 2, 400, 24, '#ffd166');
  if (konto >= rekord) text('🏆 Neuer Rekord!', W / 2, 440, 20, '#ffd166');
  const n = levelDaten(level + 1);
  text(`Nächstes Level: größeres Haus, Ziel ${euro(n.ziel)}, ${n.geister} 👻 ${n.lauscher ? '+ ' + n.lauscher + ' 👂' : ''}`, W / 2, 485, 16, '#c9c3ff', 'center', false);
  text('▶ Klicken für das nächste Level', W / 2, 540, 24, '#7cf5c6');
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
