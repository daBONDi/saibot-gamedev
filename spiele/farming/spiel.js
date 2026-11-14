// =====================================================================
// 🚜 Farming Game
// Pflügen -> Säen -> Wachsen lassen -> Ernten -> Verkaufen -> Felder und Gebäude kaufen
// =====================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';   // Klebt viele kleine Teile zu einem zusammen (schneller!)

// ===== Einstellungen (hier kannst du alles ändern!) =====
const START_GELD = 250000;
const ZELLE = 2.5;               // So groß ist ein Feld-Stück (in Metern)
const WACHS_ZEIT = 120;          // So viele Sekunden braucht das Getreide, bis es reif ist
const SAAT_PRO_ZELLE = 16;       // So viel Saat (kg) braucht ein Feld-Stück (eine volle Sämaschine = ein halbes Feld)
const ERTRAG_PRO_ZELLE = 100;    // So viel Korn (kg) gibt ein reifes Feld-Stück
const SAAT_MAX = 2000;           // So viel Saat passt in die Sämaschine
const TANK_MAX = 8000;           // So viel Korn passt in den Korntank
const SAAT_PREIS = 0.5;          // Saat kostet so viel pro kg
const KORN_PREIS = 2.0;          // Korn bringt ungefähr so viel pro kg (der Preis schwankt!)
// Tempo in Metern pro Sekunde (mal 3,6 = km/h). Echte Traktoren fahren meistens höchstens 40 km/h.
const TRAKTOR_TEMPO = 11.1;      // Höchstgeschwindigkeit vorwärts (= 40 km/h)
const RUECKWAERTS_TEMPO = 4.2;   // Höchstgeschwindigkeit rückwärts (= 15 km/h)
const BESCHLEUNIGUNG = 5;        // Wie schnell der Traktor schneller wird
const DIESEL_MAX = 300;          // So viele Liter passen in den Tank
const DIESEL_PREIS = 1.5;        // Diesel kostet so viel pro Liter
const WIND = 1;                  // Wie stark Getreide und Gras im Wind wehen (0 = gar nicht)
const LAUF_TEMPO = 10;           // So schnell läufst du zu Fuß
const SPEICHER_NAME = 'farming-spielstand';

// Die Felder: x/z = Mitte, b/t = Breite/Tiefe, preis = so viel kostet es (0 = gehört dir schon)
const FELDER = [
  { x: 0, z: -35, b: 35, t: 45, preis: 0 },
  { x: -45, z: -35, b: 35, t: 45, preis: 50000 },
  { x: 45, z: -35, b: 35, t: 45, preis: 75000 },
  { x: -45, z: 32, b: 35, t: 35, preis: 100000 },
  { x: 0, z: -85, b: 35, t: 35, preis: 60000 },      // Hintere Reihe (hinter dem zweiten Weg)
  { x: -45, z: -85, b: 35, t: 35, preis: 80000 },
  { x: 45, z: -85, b: 35, t: 35, preis: 90000 },
  { x: -85, z: -35, b: 30, t: 45, preis: 120000 },   // Ganz links
  { x: 85, z: -35, b: 30, t: 45, preis: 130000 },    // Ganz rechts
];
// Die Anbaugeräte am Traktor (Taste 1, 2, 3)
// arbeitsTempo: So schnell darfst du beim Arbeiten auf dem Feld fahren (m/s). Pflügen ist schwer!
const GERAETE = {
  pflug: { name: 'Pflug', emoji: '🟫', taste: '1', breite: 3, hinten: true, arbeitsTempo: 4.5 },
  saat: { name: 'Sämaschine', emoji: '🌱', taste: '2', breite: 3.5, hinten: true, arbeitsTempo: 5.5 },
  ernte: { name: 'Erntevorsatz', emoji: '🌾', taste: '3', breite: 4.5, hinten: false, arbeitsTempo: 4 },
};
// Was du im Baumodus bauen kannst (Taste 1, 2, 3)
const GEBAEUDE_ARTEN = {
  schuppen: { name: 'Schuppen', emoji: '🏠', preis: 10000, r: 5.5 },
  silo: { name: 'Silo', emoji: '🛢️', preis: 25000, r: 3 },
  baum: { name: 'Baum', emoji: '🌳', preis: 500, r: 1.5 },
};
const LADEN = { x: 60, z: 12, r: 8 };   // Der Landhandel: Hier verkaufst du Korn und kaufst Saat
// Der Wald mit der Motorsäge 🌲🪚
const WALD = { x: 88, z: 60, r: 19 };   // Mitte und Größe vom Wald
const WALD_BAEUME = 40;          // So viele Fichten stehen im Wald
const SAEGEWERK = { x: 58, z: 53, platzX: 58, platzZ: 42, r: 6 };   // Hier verkaufst du das Holz
const SAEGE_ZEIT = 8;            // So viele Sekunden musst du sägen, bis ein Baum umfällt
const SCHNITT_HOEHE = 0.9;       // In dieser Höhe (Meter) sägst du den Stamm durch
const HOLZ_PRO_BAUM = 3;         // So viele Holzstämme gibt ein Baum
const HOLZ_TRAGEN_MAX = 4;       // So viele Stämme kannst du auf einmal tragen
const HOLZ_PREIS = 250;          // So viel bringt ein Stamm beim Sägewerk
const SPRIT_PREIS = 0.1;         // Sprit für die Motorsäge kostet so viel pro Prozent (voll = 10 €)
const NACHWACHS_ZEIT = 180;      // Nach so vielen Sekunden wächst aus dem Baumstumpf ein neuer Baum
const BAUM_WACHS_DAUER = 25;     // ... und so lange braucht er, bis er groß ist

// ===== Grundgerüst: Szene, Kamera, Licht =====
const HORIZONT = 0xcfe3f0, ZENIT = 0x3f7fc8;
const scene = new THREE.Scene();
scene.background = new THREE.Color(HORIZONT);
scene.fog = new THREE.Fog(HORIZONT, 90, 300);   // Dunst in der Ferne – sieht echter aus und spart Rechenzeit

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // Nicht zu viele Pixel (sonst ruckelt es auf großen Bildschirmen)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // Farben wie bei einer Kamera (weichere Lichter)
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// Wind: Getreide und Gras wackeln ein bisschen hin und her (das macht ein kleines Extra-Stück im Shader)
const windZeit = { value: 0 };
function windMaterial(m, staerke) {
  if (WIND <= 0) return m;
  m.onBeforeCompile = sh => {
    sh.uniforms.uZeit = windZeit;
    sh.vertexShader = 'uniform float uZeit;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float wPhase = 0.0;
      #ifdef USE_INSTANCING
        wPhase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.27;
      #endif
      float wHoehe = max(position.y, 0.0);
      transformed.x += sin(uZeit * 1.7 + wPhase) * ${(0.08 * WIND * staerke).toFixed(3)} * wHoehe;
      transformed.z += cos(uZeit * 1.3 + wPhase * 1.3) * ${(0.05 * WIND * staerke).toFixed(3)} * wHoehe;`);
  };
  m.customProgramCacheKey = () => 'wind' + staerke;
  return m;
}

// Himmel: eine riesige Kugel um alles herum, oben dunkelblau, am Horizont hell
const himmelGeo = new THREE.SphereGeometry(450, 32, 16);
{
  const farben = [], unten = new THREE.Color(HORIZONT), oben = new THREE.Color(ZENIT), c = new THREE.Color();
  const pos = himmelGeo.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const h = Math.max(0, pos.getY(k) / 450);
    c.copy(unten).lerp(oben, Math.pow(h, 0.6));
    farben.push(c.r, c.g, c.b);
  }
  himmelGeo.setAttribute('color', new THREE.Float32BufferAttribute(farben, 3));
}
const himmel = new THREE.Mesh(himmelGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
himmel.renderOrder = -1;
scene.add(himmel);
// Die Sonne als leuchtender Punkt am Himmel
const SONNEN_RICHTUNG = new THREE.Vector3(30, 60, 20).normalize();
function glanzTextur(innen, aussen) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  v.addColorStop(0, innen); v.addColorStop(0.25, innen); v.addColorStop(1, aussen);
  g.fillStyle = v; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const sonne = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTextur('rgba(255,250,225,1)', 'rgba(255,240,200,0)'), fog: false, depthWrite: false, toneMapped: false }));
sonne.scale.set(90, 90, 1);
scene.add(sonne);
// Wolken: jede Wolke ist ein Haufen weißer Kugeln (zu einem Stück zusammengeklebt)
const wolkenMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8a96a8, fog: false, flatShading: true });
const wolken = [];
for (let k = 0; k < 16; k++) {
  const teile = [];
  const n = 5 + (k % 4);
  for (let i = 0; i < n; i++) {
    const r = 6 + ((k * 7 + i * 3) % 6);
    const kugel = new THREE.SphereGeometry(r, 9, 7);
    kugel.scale(1, 0.55, 1);
    kugel.translate((i - n / 2) * 7 + Math.sin(i * 3 + k) * 3, Math.cos(i * 5) * 2, Math.sin(i * 7 + k) * 5);
    teile.push(kugel);
  }
  const wolke = new THREE.Mesh(mergeGeometries(teile), wolkenMat);
  const w = k / 16 * Math.PI * 2;
  wolke.position.set(Math.cos(w) * (120 + (k % 3) * 60), 85 + (k % 5) * 6, Math.sin(w) * (120 + (k % 4) * 50));
  scene.add(wolke);
  wolken.push(wolke);
}

scene.add(new THREE.HemisphereLight(0xd8ecff, 0x4a6b35, 1.4));
const sun = new THREE.DirectionalLight(0xfff2d6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const mat = (farbe, extra = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.9, ...extra });
function kasten(eltern, x, y, z, sx, sy, sz, farbe, schatten = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof farbe === 'object' ? farbe : mat(farbe));
  m.position.set(x, y, z);
  m.castShadow = schatten; m.receiveShadow = true;
  eltern.add(m);
  return m;
}
const zufall = (a, b) => a + Math.random() * (b - a);
const begrenzt = (v, a, b) => Math.max(a, Math.min(b, v));
const euro = n => `${Math.round(n).toLocaleString('de-DE')} €`;
const kg = n => `${Math.round(n).toLocaleString('de-DE')} kg`;

// ===== Boden und Wege =====
// Ein selbst gemaltes Gras-Muster, das sich über die ganze Wiese wiederholt
function grasTextur() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4d8a35'; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 9000; k++) {
    const hell = 30 + Math.random() * 30;
    g.fillStyle = `hsl(${85 + Math.random() * 30}, ${40 + Math.random() * 25}%, ${hell}%)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 2 + Math.random() * 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 90);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: grasTextur(), roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const wegMat = new THREE.MeshStandardMaterial({ roughness: 1, map: (() => {   // Schotterweg mit Steinchen
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#9b8458'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 1500; k++) { g.fillStyle = `hsl(35, 20%, ${35 + Math.random() * 35}%)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 2); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})() });
function weg(x, z, b, t) { kasten(scene, x, 0.03, z, b, 0.06, t, wegMat, false); }
weg(0, -8, 200, 5);      // Weg an den Feldern entlang
weg(0, -62.5, 140, 5);   // Weg zwischen den Feld-Reihen
weg(-65, -35, 5, 55);    // Querweg links zur hinteren Reihe
weg(65, -35, 5, 55);     // Querweg rechts zur hinteren Reihe
weg(0, 8, 5, 28);        // Weg zum Hof
weg(32, 12, 60, 5);      // Weg zum Landhandel

// ===== Hindernisse (damit man nicht durch Scheune und Bäume fährt) =====
const hindernisse = [];   // { x, z, r } = rund   oder   { x, z, hb, ht } = eckig (halbe Breite/Tiefe)
const fahrzeuge = [];     // Alle deine Fahrzeuge (die sind auch im Weg!)
const anhaenger = [];     // Alle deine Anhänger
function kollidiert(x, z, r, ignorier = null) {   // ignorier = das Fahrzeug, das gerade fährt (stößt nicht an sich selbst)
  if (Math.abs(x) > 190 || Math.abs(z) > 190) return true;   // Ende der Welt
  for (const h of hindernisse) {
    if (h.r !== undefined) { if (Math.hypot(x - h.x, z - h.z) < r + h.r) return true; }
    else if (Math.abs(x - h.x) < h.hb + r && Math.abs(z - h.z) < h.ht + r) return true;
  }
  for (const fz of fahrzeuge) if (fz !== ignorier && Math.hypot(x - fz.g.position.x, z - fz.g.position.z) < r + fz.radius) return true;
  for (const a of anhaenger) {   // Abgestellte Anhänger (zwei Kreise: vorne und hinten)
    if (a.an) continue;
    const sx = -Math.sin(a.g.rotation.y) * a.typ.laenge / 3, sz = -Math.cos(a.g.rotation.y) * a.typ.laenge / 3;
    if (Math.hypot(x - a.g.position.x - sx, z - a.g.position.z - sz) < r + 1.5 || Math.hypot(x - a.g.position.x + sx, z - a.g.position.z + sz) < r + 1.5) return true;
  }
  return false;
}

// ===== Scheune und Landhandel =====
function bretterTextur(farbe) {   // Holzbretter (senkrechte Streifen mit Fugen)
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  for (let x = 0; x < 256; x += 16) {
    g.fillStyle = farbe; g.fillRect(x, 0, 16, 256);
    g.fillStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.12})`; g.fillRect(x, 0, 16, 256);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x, 0, 2, 256);
    for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + 3 + Math.random() * 11, Math.random() * 256, 1, 10 + Math.random() * 30); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Die Scheune ist hohl: 4 Wände, vorne ein großes offenes Tor, oben ein Spitzdach. Man kann reingehen und reinfahren!
const SCHEUNE = { x1: 17.5, x2: 32.5, z1: 19, z2: 31, hoehe: 7, torBreite: 6.5, torHoehe: 5.6 };
const TANKSTELLE = { x: 31.2, z: 21.6 };   // Die Hof-Tankstelle steht in der Scheune
{
  const S = SCHEUNE, d = 0.3, mx = (S.x1 + S.x2) / 2, mz = (S.z1 + S.z2) / 2, H = S.hoehe;
  const brett = new THREE.MeshStandardMaterial({ map: bretterTextur('#a83225'), roughness: 0.95 });
  const wand = (x, y, z, b, h, t, hb, ht) => { kasten(scene, x, y, z, b, h, t, brett); if (hb) hindernisse.push({ x, z, hb, ht }); };
  wand(mx, H / 2, S.z2 - d / 2, S.x2 - S.x1, H, d, (S.x2 - S.x1) / 2, d / 2);            // Hinten
  wand(S.x1 + d / 2, H / 2, mz, d, H, S.z2 - S.z1, d / 2, (S.z2 - S.z1) / 2);            // Links
  wand(S.x2 - d / 2, H / 2, mz, d, H, S.z2 - S.z1, d / 2, (S.z2 - S.z1) / 2);            // Rechts
  const seite = (S.x2 - S.x1 - S.torBreite) / 2;                                         // Vorne: links und rechts vom Tor
  wand(S.x1 + seite / 2, H / 2, S.z1 + d / 2, seite, H, d, seite / 2, d / 2);
  wand(S.x2 - seite / 2, H / 2, S.z1 + d / 2, seite, H, d, seite / 2, d / 2);
  wand(mx, (H + S.torHoehe) / 2, S.z1 + d / 2, S.torBreite, H - S.torHoehe, d);         // Über dem Tor
  // Die zwei Schiebetore stehen offen (zur Seite geschoben)
  const torMat = new THREE.MeshStandardMaterial({ map: bretterTextur('#f2e6c9'), roughness: 0.95 });
  for (const s of [-1, 1]) {
    kasten(scene, mx + s * (S.torBreite / 2 + 1.6), S.torHoehe / 2, S.z1 - 0.12, 3.2, S.torHoehe, 0.12, torMat);
    for (const y of [1.2, S.torHoehe - 1.2]) kasten(scene, mx + s * (S.torBreite / 2 + 1.6), y, S.z1 - 0.2, 3.2, 0.12, 0.05, 0xd8cba8, false);   // Querbalken
  }
  kasten(scene, mx, S.torHoehe + 0.25, S.z1 - 0.15, S.torBreite + 7, 0.15, 0.15, 0x333333, false);   // Laufschiene
  // Spitzdach (ein Dreieck, lang gezogen) – innen sieht man die Unterseite
  const form = new THREE.Shape([new THREE.Vector2(-6.6, 0), new THREE.Vector2(6.6, 0), new THREE.Vector2(0, 4.4)]);
  const dachGeo = new THREE.ExtrudeGeometry(form, { depth: 15.8, bevelEnabled: false });
  dachGeo.translate(0, 0, -7.9); dachGeo.rotateY(Math.PI / 2);
  const dach = new THREE.Mesh(dachGeo, [brett, mat(0x5b2a22, { side: THREE.DoubleSide })]);   // Giebel aus Brettern, Dach dunkelrot
  dach.position.set(mx, H, mz); dach.castShadow = dach.receiveShadow = true;
  scene.add(dach);
  // Innen: Strohboden
  const stroh = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#b89a52'; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 900; k++) {
      g.strokeStyle = `hsl(${40 + Math.random() * 12}, ${45 + Math.random() * 25}%, ${45 + Math.random() * 30}%)`;
      g.beginPath(); const x = Math.random() * 128, y = Math.random() * 128, w = Math.random() * Math.PI;
      g.moveTo(x, y); g.lineTo(x + Math.cos(w) * 8, y + Math.sin(w) * 8); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(S.x2 - S.x1 - 2 * d, S.z2 - S.z1 - 2 * d), new THREE.MeshStandardMaterial({ map: stroh, roughness: 1 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(mx, 0.04, mz); boden.receiveShadow = true;
  scene.add(boden);
  // Heuballen hinten links (gestapelt)
  const heuMat = new THREE.MeshStandardMaterial({ map: stroh, color: 0xe8d28a, roughness: 1 });
  for (let reihe = 0; reihe < 3; reihe++) for (let k = 0; k < 4 - reihe; k++) for (let t = 0; t < 2; t++) {
    const b = kasten(scene, S.x1 + 1.2 + k * 1.3 + reihe * 0.65, 0.38 + reihe * 0.74, S.z2 - 0.9 - t * 0.9, 1.25, 0.72, 0.85, heuMat);
    b.rotation.y = ((k + reihe + t) % 3 - 1) * 0.04;
  }
  hindernisse.push({ x: S.x1 + 2.9, z: S.z2 - 1.35, hb: 2.8, ht: 1.0 });
  // Runde Heuballen hinten rechts
  for (const [x, z] of [[S.x2 - 1.6, S.z2 - 1.6], [S.x2 - 3.5, S.z2 - 1.6]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.3, 20), heuMat);
    r.rotation.z = Math.PI / 2; r.position.set(x, 0.85, z); r.castShadow = true; scene.add(r);
    hindernisse.push({ x, z, r: 0.9 });
  }
  // Werkbank mit Werkzeug an der rechten Wand
  kasten(scene, S.x2 - 0.75, 0.9, mz + 2.5, 1.0, 0.1, 3.0, 0x7a5230);
  for (const z of [-1.3, 1.3]) for (const x of [-0.35, 0.35]) kasten(scene, S.x2 - 0.75 + x, 0.43, mz + 2.5 + z, 0.1, 0.86, 0.1, 0x5a3a20);
  kasten(scene, S.x2 - 0.5, 1.05, mz + 1.8, 0.3, 0.2, 0.5, 0xc23b22);       // Werkzeugkasten
  kasten(scene, S.x2 - 0.9, 1.0, mz + 3.2, 0.25, 0.1, 0.25, 0x888888);       // Schraubstock
  for (let k = 0; k < 4; k++) kasten(scene, S.x2 - d - 0.05, 2.0, mz + 1.6 + k * 0.5, 0.05, 0.9, 0.06, k % 2 ? 0x888888 : 0x5a3a20, false);   // Werkzeug an der Wand
  hindernisse.push({ x: S.x2 - 0.75, z: mz + 2.5, hb: 0.6, ht: 1.6 });
  // Mistgabel an der linken Wand
  kasten(scene, S.x1 + d + 0.1, 1.2, mz - 2, 0.05, 2.2, 0.05, 0x7a5230, false);
  for (const z of [-0.1, 0, 0.1]) kasten(scene, S.x1 + d + 0.1, 2.45, mz - 2 + z, 0.03, 0.35, 0.03, 0x999999, false);
  // Hof-Tankstelle: ein liegender Dieseltank mit Zapfsäule
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.2, 16), mat(0x2e6b3a, { metalness: 0.3, roughness: 0.5 }));
  tank.rotation.x = Math.PI / 2; tank.position.set(TANKSTELLE.x, 1.3, TANKSTELLE.z); tank.castShadow = true; scene.add(tank);
  for (const z of [-0.7, 0.7]) kasten(scene, TANKSTELLE.x, 0.3, TANKSTELLE.z + z, 0.9, 0.6, 0.15, 0x444444);
  kasten(scene, TANKSTELLE.x - 0.85, 0.9, TANKSTELLE.z - 1.0, 0.3, 1.8, 0.3, 0xd23c2a);   // Zapfsäule
  kasten(scene, TANKSTELLE.x - 1.0, 1.3, TANKSTELLE.z - 1.0, 0.1, 0.35, 0.1, 0x111111, false);   // Zapfhahn
  hindernisse.push({ x: TANKSTELLE.x, z: TANKSTELLE.z, r: 1.0 });
  const tankSchild = schild('⛽ Hof-Tankstelle', '#7cf5a0', 4);
  tankSchild.position.set(TANKSTELLE.x - 0.5, 3.2, TANKSTELLE.z); scene.add(tankSchild);
  // Lampe unter dem Dach (warmes Licht)
  const lampe = new THREE.PointLight(0xffcc88, 25, 16, 1.6);
  lampe.position.set(mx, 5.6, mz); scene.add(lampe);
  const birne = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c8 }));
  birne.position.copy(lampe.position); scene.add(birne);
  kasten(scene, mx, 6.6, mz, 0.03, 1.8, 0.03, 0x222222, false);   // Kabel
  const scheunenSchild = schild('🏚️ Scheune', '#ffd166', 5);
  scheunenSchild.position.set(mx, S.hoehe + 0.6, S.z1 - 0.6); scene.add(scheunenSchild);
}
const inScheune = (x, z, rand = 0) => x > SCHEUNE.x1 - rand && x < SCHEUNE.x2 + rand && z > SCHEUNE.z1 - rand && z < SCHEUNE.z2 + rand;

function schild(text, farbe = '#ffffff', breite = 8) {   // Ein Schild mit Text, das immer zu dir schaut
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(breite, breite / 4, 1);
  s.userData.malen = (t, f = farbe) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(23,37,29,0.85)'; g.beginPath(); g.roundRect(4, 14, 504, 100, 24); g.fill();
    g.fillStyle = f; g.font = 'bold 50px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, 256, 66);
    tex.needsUpdate = true;
  };
  s.userData.malen(text);
  return s;
}
// Landhandel (Verkaufsstelle)
kasten(scene, LADEN.x, 3, LADEN.z + 14, 12, 6, 8, 0xd9c27a);
kasten(scene, LADEN.x, 6.4, LADEN.z + 14, 12.6, 0.8, 8.6, 0x4a5a6a);
const ladenSilo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 13, 20), mat(0xc9ccd1, { metalness: 0.5, roughness: 0.4 }));
ladenSilo.position.set(LADEN.x + 9, 6.5, LADEN.z + 14); ladenSilo.castShadow = true; scene.add(ladenSilo);
hindernisse.push({ x: LADEN.x, z: LADEN.z + 14, hb: 6, ht: 4 }, { x: LADEN.x + 9, z: LADEN.z + 14, r: 2.4 });
const ladenSchild = schild('🏪 Landhandel', '#ffd166', 10);
ladenSchild.position.set(LADEN.x, 9, LADEN.z + 9.5); scene.add(ladenSchild);
const ladenPlatz = new THREE.Mesh(new THREE.CircleGeometry(LADEN.r, 32), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35 }));
ladenPlatz.rotation.x = -Math.PI / 2; ladenPlatz.position.set(LADEN.x, 0.07, LADEN.z); scene.add(ladenPlatz);

// ===== Bäume (alle mit einem einzigen "InstancedMesh" – das ist viel schneller als 100 einzelne Bäume) =====
const baumOrte = [];
for (let i = 0; i < 90; i++) {   // Ein Wald-Ring rundherum
  const w = i / 90 * Math.PI * 2 + Math.sin(i * 7) * 0.03, r = 115 + Math.sin(i * 13) * 12;
  const x = Math.cos(w) * r, z = Math.sin(w) * r;
  if (FELDER.some(F => Math.abs(x - F.x) < F.b / 2 + 4 && Math.abs(z - F.z) < F.t / 2 + 4)) continue;   // Keine Bäume auf den Feldern!
  if (Math.hypot(x - WALD.x, z - WALD.z) < WALD.r + 6) continue;   // Da ist jetzt der Fichtenwald
  baumOrte.push([x, z]);
}
for (const [x, z] of [[8, 30], [12, 38], [-10, 18], [40, 40], [-15, 5], [75, 0], [80, 35], [-80, 0]]) baumOrte.push([x, z]);
const stammGeo = new THREE.CylinderGeometry(0.35, 0.5, 3); stammGeo.translate(0, 1.5, 0);
const kroneGeo = mergeGeometries([   // Eine Krone aus 4 Kugeln sieht viel echter aus als eine einzige
  new THREE.IcosahedronGeometry(2.0, 1).translate(0, 4.2, 0),
  new THREE.IcosahedronGeometry(1.5, 1).translate(1.1, 3.6, 0.4),
  new THREE.IcosahedronGeometry(1.5, 1).translate(-1.0, 3.7, -0.5),
  new THREE.IcosahedronGeometry(1.3, 1).translate(0.2, 5.4, 0.3),
]);
const staemme = new THREE.InstancedMesh(stammGeo, mat(0x694020), baumOrte.length);
const kronen = new THREE.InstancedMesh(kroneGeo, windMaterial(mat(0xffffff, { flatShading: true }), 0.15), baumOrte.length);   // Weiß, weil jeder Baum seine eigene Grün-Farbe bekommt
{
  const d = new THREE.Object3D();
  baumOrte.forEach(([x, z], k) => {
    const s = 0.8 + ((k * 37) % 10) / 20;
    d.position.set(x, 0, z); d.scale.set(s, s, s); d.updateMatrix();
    staemme.setMatrixAt(k, d.matrix); kronen.setMatrixAt(k, d.matrix);
    kronen.setColorAt(k, new THREE.Color().setHSL(0.33 + ((k * 17) % 10) / 200, 0.65, 0.22 + ((k * 7) % 10) / 100));
    hindernisse.push({ x, z, r: 0.9 * s });
  });
}
for (const t of [staemme, kronen]) { t.castShadow = true; t.receiveShadow = true; scene.add(t); }

// ===== Der Fichtenwald (hier kannst du mit der Motorsäge Holz machen) =====
// Wege zum Wald: vom Landhandel nach Norden und dann zum Sägewerk  [x, z, Breite, Tiefe]
const WALDWEGE = [[68.5, 12, 13, 5], [75, 26, 5, 33], [66.5, 42, 22, 5]];
for (const [x, z, b, t] of WALDWEGE) weg(x, z, b, t);
const aufWaldweg = (x, z, rand = 0) => WALDWEGE.some(([wx, wz, b, t]) => Math.abs(x - wx) < b / 2 + rand && Math.abs(z - wz) < t / 2 + rand);
{   // Waldboden: dunkler, mit Nadeln
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4a2a'; g.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 1200; k++) { g.fillStyle = `hsl(${30 + Math.random() * 50}, 35%, ${18 + Math.random() * 20}%)`; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = THREE.SRGBColorSpace;
  const boden = new THREE.Mesh(new THREE.CircleGeometry(WALD.r + 3, 40), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(WALD.x, 0.02, WALD.z); boden.receiveShadow = true;
  scene.add(boden);
}
// Eine Fichte: Stamm + 3 Kegel übereinander (alle Fichten teilen sich die gleichen Formen – das spart Speicher)
const fichteStammGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 8).translate(0, 1.5, 0);
const fichteKroneGeo = mergeGeometries([
  new THREE.ConeGeometry(2.3, 4, 9).translate(0, 3.6, 0),
  new THREE.ConeGeometry(1.8, 3.6, 9).translate(0, 5.6, 0),
  new THREE.ConeGeometry(1.2, 3, 9).translate(0, 7.6, 0),
]);
const fichteStumpfGeo = new THREE.CylinderGeometry(0.33, 0.42, 0.5, 10).translate(0, 0.25, 0);
const rindeMat = mat(0x5a3a1e), nadelMat = windMaterial(mat(0x2a5a2c, { flatShading: true }), 0.12), schnittMat = mat(0xe0c48a);
const baeume = [];   // Alle Fichten: { nr, x, z, s, g, kipp, stumpf, h, zustand, hp, zeit, wachs }
{
  // "Zufall", der aber bei allen Spielern genau gleich ist (wichtig für Multiplayer!)
  let saat = 4711;
  const zz = () => { saat = (saat * 16807) % 2147483647; return (saat - 1) / 2147483646; };
  for (let versuch = 0; versuch < 3000 && baeume.length < WALD_BAEUME; versuch++) {
    const w = zz() * Math.PI * 2, r = Math.sqrt(zz()) * WALD.r;
    const x = WALD.x + Math.cos(w) * r, z = WALD.z + Math.sin(w) * r;
    if (aufWaldweg(x, z, 3) || baeume.some(b => Math.hypot(b.x - x, b.z - z) < 3.6)) continue;
    if (Math.hypot(x - SAEGEWERK.x - 9.5, z - SAEGEWERK.z - 1) < 5) continue;   // Nicht auf den Holzstapel
    const s = 0.85 + zz() * 0.35;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); g.rotation.y = zz() * 6;
    const kipp = new THREE.Group(); g.add(kipp);   // Der Teil, der umfällt
    for (const [geo, m] of [[fichteStammGeo, rindeMat], [fichteKroneGeo, nadelMat]]) {
      const t = new THREE.Mesh(geo, m); t.castShadow = true; t.receiveShadow = true; kipp.add(t);
    }
    const stumpf = new THREE.Mesh(fichteStumpfGeo, [rindeMat, schnittMat, rindeMat]);   // Oben sieht man das helle Holz
    stumpf.scale.y = SCHNITT_HOEHE / s / 0.5;   // Der Stumpf ist so hoch, wie du gesägt hast
    stumpf.castShadow = true; stumpf.visible = false; g.add(stumpf);
    scene.add(g);
    const h = { x, z, r: 0.7 * s };
    hindernisse.push(h);
    baeume.push({ nr: baeume.length, x, z, s, g, kipp, stumpf, h, zustand: 'steht', hp: 0, zeit: 0, wachs: 1 });
  }
}
// Das Sägewerk: hinten eine Halle, vorne ein Dach auf Pfosten mit der großen Kreissäge
{
  const S = SAEGEWERK;
  const holzWand = new THREE.MeshStandardMaterial({ map: bretterTextur('#8a5a32'), roughness: 0.95 });
  kasten(scene, S.x, 3, S.z + 2, 14, 6, 4, holzWand);                    // Halle
  kasten(scene, S.x, 6.2, S.z, 14.8, 0.4, 8.8, 0x4a3020);                // Dach
  for (const x of [-6.8, 0, 6.8]) {                                      // Pfosten vorne
    kasten(scene, S.x + x, 3, S.z - 4, 0.35, 6, 0.35, 0x6b4a2b);
    hindernisse.push({ x: S.x + x, z: S.z - 4, r: 0.3 });
  }
  hindernisse.push({ x: S.x, z: S.z + 2, hb: 7, ht: 2 });
  // Sägetisch mit Kreissägeblatt und einem Stamm drauf
  kasten(scene, S.x, 0.85, S.z - 1.2, 6, 0.25, 1.3, 0x6b4a2b);
  for (const x of [-2.7, 2.7]) kasten(scene, S.x + x, 0.4, S.z - 1.2, 0.25, 0.8, 1.1, 0x4a3020);
  const blatt = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 32), mat(0xcfd3d8, { metalness: 0.8, roughness: 0.3 }));
  blatt.rotation.x = Math.PI / 2; blatt.position.set(S.x + 1.2, 1.25, S.z - 1.2); scene.add(blatt);
  const tischStamm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 3.2, 12), [rindeMat, schnittMat, schnittMat]);
  tischStamm.rotation.z = Math.PI / 2; tischStamm.position.set(S.x - 1.2, 1.3, S.z - 1.2); tischStamm.castShadow = true; scene.add(tischStamm);
  hindernisse.push({ x: S.x, z: S.z - 1.2, hb: 3, ht: 0.65 });
  // Holzstapel rechts (Stämme) und Bretterstapel links
  for (let reihe = 0; reihe < 3; reihe++) for (let k = 0; k < 4 - reihe; k++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4, 12), [rindeMat, schnittMat, schnittMat]);
    st.rotation.x = Math.PI / 2; st.position.set(S.x + 8.3 + k * 0.72 + reihe * 0.36, 0.35 + reihe * 0.62, S.z + 1);
    st.castShadow = true; scene.add(st);
  }
  hindernisse.push({ x: S.x + 9.4, z: S.z + 1, hb: 1.6, ht: 2.1 });
  for (let k = 0; k < 6; k++) kasten(scene, S.x - 9.5, 0.1 + k * 0.18, S.z + 1, 2, 0.16, 4, k % 2 ? 0xd9b77a : 0xcda86a);
  hindernisse.push({ x: S.x - 9.5, z: S.z + 1, hb: 1.1, ht: 2.1 });
  const sw = schild('🪚 Sägewerk', '#f5b971', 9);
  sw.position.set(S.x, 8.2, S.z - 4); scene.add(sw);
  const platz = new THREE.Mesh(new THREE.CircleGeometry(S.r, 32), new THREE.MeshBasicMaterial({ color: 0xf5b971, transparent: true, opacity: 0.35 }));
  platz.rotation.x = -Math.PI / 2; platz.position.set(S.platzX, 0.08, S.platzZ); scene.add(platz);
}

// ===== Die Felder =====
// Jedes Feld besteht aus vielen kleinen Stücken (Zellen). Jede Zelle hat einen Zustand:
//   'wiese' -> pflügen -> 'gepfluegt' -> säen -> 'gesaet' (wächst, w geht von 0 bis 1) -> ernten -> 'stoppeln'
const PX = 16;   // So viele Pixel hat eine Zelle im Bild vom Feld
const FARBEN = { wiese: '#6f9a3c', stoppeln: '#c2ab6e', gepfluegt: '#4f331c', gesaet: '#6b4a2b' };
const erdeMat = mat(0x5e4024);
const pflanzenMat = windMaterial(mat(0xffffff, { roughness: 0.8 }), 1);
// Ein Getreide-Büschel: 6 dünne Halme mit Ähren oben drauf (alles zu einem Stück zusammengeklebt)
const pflanzenGeo = (() => {
  const teile = [];
  for (let k = 0; k < 6; k++) {
    const w = k / 6 * Math.PI * 2 + k, r = 0.12 + (k % 3) * 0.16, h = 0.8 + (k % 2) * 0.15;
    const x = Math.cos(w) * r, z = Math.sin(w) * r, neig = new THREE.Matrix4().makeRotationZ((k % 3 - 1) * 0.12);
    teile.push(new THREE.BoxGeometry(0.035, h, 0.035).translate(0, h / 2, 0).applyMatrix4(neig).translate(x, 0, z));         // Halm
    teile.push(new THREE.BoxGeometry(0.07, 0.22, 0.07).translate(0, h + 0.09, 0).applyMatrix4(neig).translate(x, 0, z));    // Ähre
  }
  return mergeGeometries(teile);
})();
const felder = FELDER.map((F, nr) => {
  const nx = Math.floor(F.b / ZELLE), nz = Math.floor(F.t / ZELLE);
  const f = { ...F, nr, nx, nz, x0: F.x - nx * ZELLE / 2, z0: F.z - nz * ZELLE / 2, gekauft: F.preis === 0, zellen: [] };
  kasten(scene, F.x, 0.075, F.z, nx * ZELLE + 0.4, 0.15, nz * ZELLE + 0.4, erdeMat, false);
  // Das Bild oben auf dem Feld (jede Zelle wird einzeln angemalt)
  const lein = document.createElement('canvas'); lein.width = nx * PX; lein.height = nz * PX;
  f.g = lein.getContext('2d');
  f.tex = new THREE.CanvasTexture(lein); f.tex.colorSpace = THREE.SRGBColorSpace;
  const oben = new THREE.Mesh(new THREE.PlaneGeometry(nx * ZELLE, nz * ZELLE), new THREE.MeshStandardMaterial({ map: f.tex, roughness: 1 }));
  oben.rotation.x = -Math.PI / 2; oben.position.set(F.x, 0.16, F.z); oben.receiveShadow = true;
  scene.add(oben);
  // Die Pflanzen: 4 kleine "Getreide-Büschel" pro Zelle, alle in einem InstancedMesh
  f.pflanzen = new THREE.InstancedMesh(pflanzenGeo, pflanzenMat, nx * nz * 4);
  f.pflanzen.castShadow = false; f.pflanzen.receiveShadow = true;   // (Schatten von tausenden Halmen wäre zu langsam)
  f.pflanzen.frustumCulled = false;   // Sonst verschwinden sie manchmal, wenn sie größer werden
  scene.add(f.pflanzen);
  // Das erste Feld ist am Anfang schon reif – dann kannst du gleich ernten!
  for (let k = 0; k < nx * nz; k++) f.zellen.push(f.gekauft ? { z: 'gesaet', w: 1 } : { z: 'wiese', w: 0 });
  f.schild = schild('', '#fff', 9);
  f.schild.position.set(F.x, 3.5, f.z0 + nz * ZELLE + 2.5);
  scene.add(f.schild);
  return f;
});
// Grasbüschel auf der Wiese (wieder ein InstancedMesh: 5000 Büschel, aber nur ein Zeichen-Befehl!)
{
  const halme = [];
  for (let k = 0; k < 5; k++) {
    const h = 0.25 + (k % 3) * 0.1;
    halme.push(new THREE.BoxGeometry(0.03, h, 0.012).translate(0, h / 2, 0).rotateZ((k - 2) * 0.25).rotateY(k * 1.3));
  }
  const grasGeo = mergeGeometries(halme);
  const anzahl = 5000, gras = new THREE.InstancedMesh(grasGeo, windMaterial(mat(0xffffff), 1.5), anzahl);
  const d = new THREE.Object3D(), c = new THREE.Color();
  let n = 0;
  for (let versuch = 0; versuch < anzahl * 3 && n < anzahl; versuch++) {
    const w = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 110;
    const x = Math.cos(w) * r, z = Math.sin(w) * r;
    if (feldBei(x, z, 1) || kollidiert(x, z, 1) || inScheune(x, z, 1.5) || Math.abs(z + 8) < 3 || (Math.abs(x) < 3 && z > -8 && z < 22) || (Math.abs(z - 12) < 3 && x > 0 && x < 62) || aufWaldweg(x, z, 0.5)) continue;
    d.position.set(x, 0, z); d.rotation.y = Math.random() * 6; d.scale.setScalar(0.7 + Math.random() * 0.9); d.updateMatrix();
    gras.setMatrixAt(n, d.matrix);
    gras.setColorAt(n, c.setHSL(0.22 + Math.random() * 0.08, 0.5, 0.25 + Math.random() * 0.15));
    n++;
  }
  gras.count = n;
  gras.receiveShadow = true;
  scene.add(gras);
}
function schildMalen(f) {
  if (f.gekauft) f.schild.userData.malen(`✅ Feld ${f.nr + 1}`, '#b9f5a0');
  else f.schild.userData.malen(`Feld ${f.nr + 1}: ${euro(f.preis)}`, '#ffd166');
}
const dummy = new THREE.Object3D(), gruen = new THREE.Color('#5aa531'), gold = new THREE.Color('#e3b341'), farbeTmp = new THREE.Color();
// Ein "Zufall", der für dieselbe Stelle immer gleich ist (sonst würde das Feld flackern)
const fester = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
function malBoden(f, i, j) {   // Den Boden einer Zelle anmalen (nur wenn sich der Zustand ändert)
  const c = f.zellen[j * f.nx + i], g = f.g, x = i * PX, y = j * PX;
  g.fillStyle = FARBEN[c.z];
  g.fillRect(x, y, PX, PX);
  // Erdklumpen und Steinchen
  for (let k = 0; k < 14; k++) {
    const r = fester(i * 31 + k, j * 17 + k);
    g.fillStyle = r < 0.5 ? `rgba(0,0,0,${0.08 + r * 0.2})` : `rgba(255,240,200,${(r - 0.5) * 0.12})`;
    g.fillRect(x + fester(k, i + j * 7) * PX, y + fester(j + k * 3, i) * PX, 1 + r * 3, 1 + r * 2);
  }
  if (c.z === 'gepfluegt' || c.z === 'gesaet') {   // Furchen (wie mit dem Pflug gezogen)
    for (let k = 1; k < PX; k += 4) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y + k, PX, 1.5); g.fillStyle = 'rgba(255,220,180,0.08)'; g.fillRect(x, y + k + 2, PX, 1); }
  }
  if (c.z === 'stoppeln') {   // Abgeschnittene Halme
    for (let k = 0; k < 22; k++) { g.fillStyle = `rgba(${150 + k * 3},${120 + k * 2},60,0.8)`; g.fillRect(x + fester(k, i) * PX, y + fester(j, k) * PX, 1, 2); }
  }
  if (c.z === 'wiese') {
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(40,${90 + k * 4},30,0.6)`; g.fillRect(x + fester(k + 3, i) * PX, y + fester(j, k + 5) * PX, 1, 3); }
  }
  f.tex.needsUpdate = true;
  malZelle(f, i, j);
}
function malZelle(f, i, j) {
  const c = f.zellen[j * f.nx + i];
  // Die Pflanzen in dieser Zelle: Größe je nach Wachstum, grün -> gold, wenn reif
  const h = c.z === 'gesaet' ? 0.12 + Math.min(1, c.w) * 1.1 : 0;
  const reife = c.w >= 1 ? 1 : Math.max(0, (c.w - 0.55) / 0.45) * 0.8;   // Erst grün, kurz vor der Ernte gelb, reif = golden
  farbeTmp.copy(gruen).lerp(gold, reife);
  for (let k = 0; k < 4; k++) {
    const idx = (j * f.nx + i) * 4 + k;
    dummy.position.set(f.x0 + (i + 0.25 + (k % 2) * 0.5) * ZELLE, 0.16, f.z0 + (j + 0.25 + Math.floor(k / 2) * 0.5) * ZELLE);
    dummy.rotation.y = (idx * 1.7) % 6;
    dummy.scale.set(h ? 1 : 0.0001, h || 0.0001, h ? 1 : 0.0001);
    dummy.updateMatrix();
    f.pflanzen.setMatrixAt(idx, dummy.matrix);
    f.pflanzen.setColorAt(idx, farbeTmp);
  }
  f.pflanzen.instanceMatrix.needsUpdate = true;
  f.pflanzen.instanceColor.needsUpdate = true;
}
function malFeld(f) {
  for (let j = 0; j < f.nz; j++) for (let i = 0; i < f.nx; i++) malBoden(f, i, j);
  schildMalen(f);
}
// Reifenspuren: Wo die Räder über ein Feld rollen, wird die Erde dunkler
function spurMalen(x, z) {
  const f = feldBei(x, z);
  if (!f) return;
  const px = (x - f.x0) / ZELLE * PX, py = (z - f.z0) / ZELLE * PX;
  f.g.fillStyle = 'rgba(35,22,10,0.18)';
  f.g.fillRect(px - 2, py - 2, 4, 4);
  f.tex.needsUpdate = true;
}
function feldBei(x, z, rand = 0) {
  return felder.find(f => x >= f.x0 - rand && x < f.x0 + f.nx * ZELLE + rand && z >= f.z0 - rand && z < f.z0 + f.nz * ZELLE + rand) || null;
}


// =====================================================================
// ===== Die Fahrzeuge =====
// =====================================================================
// Jedes Fahrzeug hat eigene Fähigkeiten! (Tempo in m/s, mal 3,6 = km/h)
//   arbeit = wie schnell es auf dem Feld arbeiten darf (1 = normal) · breite = wie breit die Geräte sind (1 = normal)
const FAHRZEUGE = {
  fendt: {
    name: 'Fendt', emoji: '🚜', preis: 0, farbe: 0x16852c, groesse: 1, tempo: 11.1, arbeit: 1, breite: 1,
    dieselMax: DIESEL_MAX, tankMax: TANK_MAX, saatMax: SAAT_MAX, geraete: ['pflug', 'saat', 'ernte'], motorTon: 1,
    faehigkeit: 'Allrounder – kann pflügen, säen und ernten',
  },
  flitzer: {
    name: 'Flitzer', emoji: '🏎️', preis: 40000, farbe: 0xd9442b, groesse: 0.8, tempo: 13.9, arbeit: 0.9, breite: 0.8,
    dieselMax: 150, tankMax: 4000, saatMax: 1000, geraete: ['pflug', 'saat', 'ernte'], motorTon: 1.4, turbo: true,
    faehigkeit: 'TURBO mit Shift (bis 70 km/h)! Klein, aber flink',
  },
  kraftprotz: {
    name: 'Kraftprotz', emoji: '💪', preis: 120000, farbe: 0x2457a6, groesse: 1.35, tempo: 9.7, arbeit: 1.5, breite: 1.6,
    dieselMax: 600, tankMax: 12000, saatMax: 4000, geraete: ['pflug', 'saat', 'ernte'], motorTon: 0.75, allrad: true,
    faehigkeit: 'Allrad: wird nie träge · extra breite Geräte · schnell auf dem Feld',
  },
  drescher: {
    name: 'Mähdrescher', emoji: '🌾', preis: 180000, farbe: 0xe0b000, art: 'drescher', groesse: 1, tempo: 6.9, arbeit: 1.8, breite: 1.5,
    dieselMax: 500, tankMax: 20000, saatMax: 0, geraete: ['ernte'], motorTon: 0.85,
    faehigkeit: 'Nur Ernten – aber 6,7 m breit und mit Riesen-Korntank!',
  },
};
let aktiv = null;       // In welchem Fahrzeug du gerade sitzt (null = zu Fuß)
let letztes = null;     // Das zuletzt gefahrene Fahrzeug (für die Anzeige)

const reifenMat = mat(0x1b1b1b, { roughness: 1 }), felgenMat = mat(0xd9b400, { metalness: 0.3, roughness: 0.5 });
const glasMat = new THREE.MeshStandardMaterial({ color: 0x83c9df, transparent: true, opacity: 0.4, roughness: 0.1 });
function baueRad(K, x, y, z, r, b, lenkt) {   // lenkt: 1 = lenkt mit, -1 = lenkt andersrum (Hinterradlenkung), 0 = gar nicht
  const lenker = new THREE.Group(); lenker.position.set(x, y, z); K.add(lenker);
  const rad = new THREE.Group(); lenker.add(rad);
  const teile = [new THREE.CylinderGeometry(r * 0.92, r * 0.92, b, 24)];
  const stollen = Math.round(12 + r * 8);
  for (let k = 0; k < stollen; k++) {   // Reifen mit Stollen-Profil
    teile.push(new THREE.BoxGeometry(r * 0.12, b * 0.45, 0.12).translate(r * 0.95, ((k % 2) - 0.5) * b * 0.4, 0).rotateY(k / stollen * Math.PI * 2));
  }
  const reifenGeo = mergeGeometries(teile); reifenGeo.rotateZ(Math.PI / 2);
  const reifen = new THREE.Mesh(reifenGeo, reifenMat); reifen.castShadow = true; rad.add(reifen);
  const felge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, b + 0.02, 16), felgenMat);
  felge.rotation.z = Math.PI / 2; rad.add(felge);
  rad.add(new THREE.Mesh(new THREE.BoxGeometry(b + 0.06, r * 0.3, r * 0.3), mat(0x555555)));   // Nabe (damit man das Drehen sieht)
  return { lenker, rad, r, lenkt };
}
// Die Traktor-Kabine: Rahmen, Scheiben, Dach mit Rundumleuchte, Türen – und innen Sitz, Lenkrad, Armaturenbrett mit Bildschirm!
// (Kabine: links/rechts x = ±0,8 · vorne z = -0,4 · hinten z = 1,3 · Boden y = 1,6 · Dach y = 3,15)
const scheibenMat = new THREE.MeshStandardMaterial({ color: 0x9fd4e6, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
function baueKabine(K, farbe, dunkler) {
  const rahmen = mat(0x1c1f22, { roughness: 0.6 }), gummi = mat(0x111111), grau = mat(0x55595e, { metalness: 0.4, roughness: 0.5 });
  const X = 0.8, Z1 = -0.4, Z2 = 1.3, Y1 = 1.6, Y2 = 3.1, mz = (Z1 + Z2) / 2, h = Y2 - Y1, my = (Y1 + Y2) / 2;
  // Boden (Gummimatte) und Unterbau
  kasten(K, 0, Y1 - 0.03, mz, 2 * X, 0.08, Z2 - Z1, gummi);
  // Rahmen: 4 Ecksäulen, 2 Türsäulen in der Mitte, oben und unten rundherum
  for (const x of [-X, X]) {
    for (const z of [Z1, Z2]) kasten(K, x, my, z, 0.07, h, 0.07, rahmen);
    kasten(K, x, my, 0.55, 0.06, h, 0.06, rahmen);                     // Türsäule
    kasten(K, x, Y1 + 0.35, mz, 0.06, 0.06, Z2 - Z1, rahmen);           // Querstrebe unten
  }
  for (const z of [Z1, Z2]) kasten(K, 0, Y1 + 0.35, z, 2 * X, 0.06, 0.06, rahmen);
  // Scheiben (durchsichtig, man sieht von innen und außen durch)
  const scheibe = (x, y, z, b, hh, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b, hh), scheibenMat); m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 2; K.add(m); };
  scheibe(0, my + 0.1, Z1, 2 * X - 0.05, h - 0.2, 0);                   // Frontscheibe (bis fast unten – gute Sicht!)
  scheibe(0, my + 0.15, Z2, 2 * X - 0.05, h - 0.3, 0);                  // Heckscheibe
  for (const x of [-X, X]) { scheibe(x, my + 0.1, (Z1 + 0.55) / 2, 0.92, h - 0.2, Math.PI / 2); scheibe(x, my + 0.1, (0.55 + Z2) / 2, 0.72, h - 0.2, Math.PI / 2); }
  // Türgriffe (links ist die Tür)
  kasten(K, -X - 0.04, Y1 + 0.75, 0.42, 0.04, 0.05, 0.16, grau, false);
  kasten(K, -X - 0.02, my, (Z1 + 0.55) / 2, 0.02, h - 0.1, 0.02, rahmen, false);   // Türdichtung
  // Dach: zweistufig, mit Lüftungsklappe, Arbeitsscheinwerfern, Antenne und Rundumleuchte
  kasten(K, 0, Y2 + 0.05, mz, 2 * X + 0.15, 0.1, Z2 - Z1 + 0.25, dunkler);
  kasten(K, 0, Y2 + 0.14, mz, 2 * X - 0.1, 0.08, Z2 - Z1 - 0.05, farbe);
  kasten(K, 0, Y2 + 0.21, mz + 0.15, 0.6, 0.06, 0.5, 0x222222);                                      // Lüftung
  const lichtMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.55, -0.2, 0.2, 0.55]) { kasten(K, x, Y2 + 0.05, Z1 - 0.13, 0.2, 0.12, 0.08, 0x222222, false); kasten(K, x, Y2 + 0.05, Z1 - 0.175, 0.15, 0.08, 0.01, lichtMat, false); }
  for (const x of [-0.5, 0.5]) { kasten(K, x, Y2 + 0.05, Z2 + 0.13, 0.2, 0.12, 0.08, 0x222222, false); kasten(K, x, Y2 + 0.05, Z2 + 0.175, 0.15, 0.08, 0.01, lichtMat, false); }
  const antenne = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.7, 6), gummi);
  antenne.position.set(-0.6, Y2 + 0.5, Z2 - 0.1); antenne.rotation.x = 0.15; K.add(antenne);
  const rundumMat = new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 });
  const rundum = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 12), rundumMat);
  rundum.position.set(0.55, Y2 + 0.32, Z2 - 0.15); K.add(rundum);
  kasten(K, 0.55, Y2 + 0.22, Z2 - 0.15, 0.18, 0.04, 0.18, 0x222222, false);
  // Scheibenwischer
  const wischer = new THREE.Group(); wischer.position.set(0.1, Y1 + 0.45, Z1 - 0.02); K.add(wischer);
  kasten(wischer, 0, 0.4, 0, 0.03, 0.8, 0.02, gummi, false);
  wischer.rotation.z = 0.9;
  // Spiegel an Armen
  for (const s of [-1, 1]) {
    kasten(K, s * (X + 0.15), Y2 - 0.25, Z1 + 0.05, 0.3, 0.04, 0.04, rahmen, false);
    kasten(K, s * (X + 0.32), Y2 - 0.38, Z1 + 0.05, 0.05, 0.32, 0.2, rahmen, false);
    kasten(K, s * (X + 0.32), Y2 - 0.38, Z1 + 0.1, 0.03, 0.28, 0.01, mat(0xbfd8e8, { metalness: 0.9, roughness: 0.05 }), false);
  }
  // Aufstieg: zwei Trittstufen und ein Haltegriff links
  for (const [y, z] of [[0.75, 0.0], [1.2, 0.0]]) kasten(K, -1.22, y, z, 0.3, 0.05, 0.4, grau, false);   // (vor dem Hinterrad)
  kasten(K, -X - 0.08, Y1 + 0.7, -0.05, 0.04, 0.9, 0.04, grau, false);

  // ===== Innen =====
  // Sitz mit Lehne, Kopfstütze und Armlehne
  kasten(K, 0, 2.0, 0.85, 0.52, 0.14, 0.5, 0x2a2a2a);                  // Sitzfläche
  kasten(K, 0, 1.8, 0.85, 0.2, 0.3, 0.2, grau);                        // Federung
  kasten(K, 0, 2.38, 1.12, 0.5, 0.65, 0.12, 0x2a2a2a);                 // Lehne
  kasten(K, 0, 2.8, 1.14, 0.3, 0.18, 0.1, 0x2a2a2a);                   // Kopfstütze
  kasten(K, 0.33, 2.15, 0.82, 0.12, 0.08, 0.5, 0x333333);              // Armlehne rechts ...
  kasten(K, 0.33, 2.21, 0.66, 0.1, 0.05, 0.14, 0x111111, false);       // ... mit Bedienfeld
  for (let k = 0; k < 3; k++) kasten(K, 0.31 + k * 0.025, 2.24, 0.62 + k * 0.03, 0.015, 0.01, 0.015, new THREE.MeshBasicMaterial({ color: [0x4ade80, 0xffd166, 0xff6b6b][k] }), false);
  const joystick = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat(0xd23c2a));
  joystick.position.set(0.34, 2.3, 0.75); K.add(joystick);
  kasten(K, 0.34, 2.24, 0.75, 0.02, 0.1, 0.02, gummi, false);
  // Armaturenbrett (vorne) mit zwei Rundinstrumenten und einem Bildschirm
  const armatur = kasten(K, 0, 2.12, -0.12, 0.9, 0.5, 0.3, 0x24282c);
  armatur.rotation.x = 0.25;
  kasten(K, 0, 1.75, -0.2, 0.4, 0.3, 0.25, 0x24282c);                  // Lenksäulen-Fuß
  // Lenkrad an der Lenksäule (dreht sich beim Lenken!)
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.55, 8), gummi);
  saeule.position.set(0, 2.2, 0.12); saeule.rotation.x = -0.75; K.add(saeule);
  const lenkHalter = new THREE.Group(); lenkHalter.position.set(0, 2.4, 0.32); lenkHalter.rotation.x = -0.85; K.add(lenkHalter);
  const lenkrad = new THREE.Group(); lenkHalter.add(lenkrad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 24), gummi); lenkrad.add(ring);
  for (const w of [0, 2.1, -2.1]) { const speiche = kasten(lenkrad, Math.sin(w) * 0.095, Math.cos(w) * -0.095, 0, 0.025, 0.19, 0.02, grau, false); speiche.rotation.z = -w; }
  kasten(lenkrad, 0, 0, 0, 0.07, 0.07, 0.04, farbe, false);                   // Hupe in der Mitte
  kasten(lenkrad, 0, 0.19, 0.01, 0.04, 0.03, 0.03, 0xffd166, false);          // Markierung oben (damit man das Drehen sieht)
  // Bildschirm (zeigt Tempo, Diesel, Korn – live!)
  const bildCanvas = document.createElement('canvas'); bildCanvas.width = 256; bildCanvas.height = 128;
  const bildTex = new THREE.CanvasTexture(bildCanvas); bildTex.colorSpace = THREE.SRGBColorSpace;
  const bild = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: bildTex, toneMapped: false }));
  bild.position.set(0.32, 2.47, -0.02); bild.rotation.set(-0.35, -0.25, 0); K.add(bild);
  kasten(K, 0.32, 2.47, -0.035, 0.37, 0.2, 0.02, 0x111111, false).rotation.set(-0.35, -0.25, 0);   // Bildschirm-Rahmen
  // Rundinstrumente: Tacho mit Nadel und Drehzahl
  const nadeln = [];
  for (const x of [-0.14, 0.14]) {
    const skala = new THREE.Mesh(new THREE.CircleGeometry(0.065, 24), new THREE.MeshBasicMaterial({ color: 0xeeeeee }));
    skala.position.set(x, 2.27, 0.11); skala.rotation.x = -0.5; K.add(skala);   // Schräg zum Fahrer hin
    const ringI = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 6, 24), grau); ringI.position.copy(skala.position); ringI.rotation.copy(skala.rotation); K.add(ringI);
    const nadelG = new THREE.Group(); nadelG.position.copy(skala.position); nadelG.rotation.copy(skala.rotation); nadelG.translateZ(0.003); K.add(nadelG);
    const nadel = kasten(nadelG, 0, 0.025, 0, 0.006, 0.05, 0.002, new THREE.MeshBasicMaterial({ color: 0xd23c2a }), false);
    nadeln.push(nadelG);
  }
  // Pedale, Schalthebel und Deckenkonsole mit Radio
  for (const x of [-0.18, 0.14, 0.24]) kasten(K, x, 1.72, -0.28, 0.08, 0.14, 0.04, grau, false);
  const hebel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), grau);
  hebel.position.set(-0.38, 2.0, 0.6); hebel.rotation.x = 0.3; K.add(hebel);
  const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), gummi); knauf.position.set(-0.38, 2.2, 0.66); K.add(knauf);
  kasten(K, 0, Y2 - 0.1, Z1 + 0.18, 0.9, 0.12, 0.3, 0x2a2e33, false);   // Deckenkonsole
  kasten(K, 0, Y2 - 0.16, Z1 + 0.28, 0.3, 0.06, 0.01, new THREE.MeshBasicMaterial({ color: 0x55c3ff }), false);   // Radio-Anzeige
  // Feuerlöscher hinter dem Sitz
  const loescher = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 10), mat(0xd23c2a)); loescher.position.set(0.55, 1.8, 1.15); K.add(loescher);
  return { lenkrad, nadeln, rundumMat, bildCanvas, bildTex, wischer };
}
function malBildschirm(fz) {   // Der Bildschirm in der Kabine
  if (!fz.bildCanvas) return;
  const g = fz.bildCanvas.getContext('2d'), W = 256, H = 128;
  g.fillStyle = '#0b1a14'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7cf5a0'; g.font = 'bold 44px Arial'; g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillText(`${Math.round(Math.abs(fz.speed) * 3.6)}`, 10, 6);
  g.font = 'bold 16px Arial'; g.fillText('km/h', 12, 52);
  g.font = '15px Arial'; g.fillStyle = '#ffffff';
  g.fillText(`${GERAETE[fz.werkzeug].emoji} ${GERAETE[fz.werkzeug].name}${fz.arbeitet ? ' ⬇' : ''}`, 110, 10);
  const balkenMalen = (y, anteil, farbe, text) => {
    g.fillStyle = '#ffffff22'; g.fillRect(110, y, 136, 12);
    g.fillStyle = farbe; g.fillRect(110, y, 136 * Math.max(0, Math.min(1, anteil)), 12);
    g.fillStyle = '#ffffff'; g.font = '12px Arial'; g.fillText(text, 110, y + 14);
  };
  balkenMalen(36, fz.diesel / fz.typ.dieselMax, fz.diesel < fz.typ.dieselMax * 0.15 ? '#ff6b6b' : '#5aa0e0', `⛽ ${Math.round(fz.diesel)} l`);
  balkenMalen(70, kornDrin(fz) / kornPlatz(fz), '#e3b341', `🌾 ${kg(kornDrin(fz))}`);
  g.fillStyle = '#ffffff'; g.font = '13px Arial';
  if (fz.typ.saatMax) g.fillText(`🌱 ${kg(fz.saat)}`, 10, 80);
  g.fillStyle = '#7cf5a0'; g.fillText(fz.typ.name, 10, 104);
  fz.bildTex.needsUpdate = true;
}
function baueTraktor(typ, K) {
  const farbe = typ.farbe, dunkler = new THREE.Color(farbe).multiplyScalar(0.65).getHex();
  kasten(K, 0, 1, 0, 2.3, 1.1, 3.5, farbe);                       // Körper
  kasten(K, 0, 1.15, -1.55, 1.6, 0.9, 0.5, dunkler);              // Motorhaube vorne
  kasten(K, 0, 0.75, -2.0, 1.4, 0.5, 0.35, 0x333333);             // Frontgewicht
  kasten(K, 0, 1.15, -1.83, 1.3, 0.6, 0.06, 0x1a1a1a);            // Kühlergrill
  for (let k = 0; k < 5; k++) kasten(K, 0, 0.92 + k * 0.11, -1.87, 1.2, 0.03, 0.03, 0x666666, false);
  kasten(K, 0.75, 2.2, -1.3, 0.12, 1.4, 0.12, 0x222222);          // Auspuff
  kasten(K, 0.75, 2.95, -1.3, 0.16, 0.1, 0.16, 0x111111);         // Auspuff-Klappe
  for (const x of [-0.6, 0.6]) kasten(K, x, 1.25, -1.82, 0.3, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);   // Lichter
  const kabine = baueKabine(K, farbe, dunkler);
  const raeder = [];
  for (const x of [-1.2, 1.2]) {
    raeder.push(baueRad(K, x, 0.55, -1.15, 0.55, 0.4, 1));        // Vorne: klein, lenkt
    raeder.push(baueRad(K, x * 1.1, 0.78, 1.05, 0.78, 0.55, 0));  // Hinten: groß und breit
    kasten(K, x * 1.1, 1.61, 1.05, 0.7, 0.08, 1.25, farbe);       // Kotflügel
  }
  if (typ.turbo) {   // Flitzer: Spoiler und Rennstreifen
    kasten(K, 0, 3.4, 1.5, 1.9, 0.08, 0.3, 0x111111);
    kasten(K, 0, 1.56, -0.2, 0.4, 0.02, 3.4, 0xffffff, false);
  }
  if (typ.allrad) {   // Kraftprotz: Zusatz-Scheinwerfer auf dem Dach und Zwillingsräder
    for (const x of [-0.5, -0.2, 0.2, 0.5]) kasten(K, x, 3.33, -0.42, 0.18, 0.14, 0.1, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);
    for (const x of [-1.85, 1.85]) raeder.push(baueRad(K, x, 0.78, 1.05, 0.78, 0.45, 0));
  }
  return { raeder, auspuff: [0.75, 3.05, -1.3], sitz: [0, 2.85, 0.8], radstand: 2.3, ...kabine };
}
function baueDrescher(typ, K) {
  const gelb = typ.farbe;
  kasten(K, 0, 2.5, 0.6, 3.0, 2.8, 6.0, gelb);                    // Großer Körper
  kasten(K, 0, 4.25, 1.4, 2.7, 0.9, 3.0, 0xc79a00);               // Korntank oben
  kasten(K, 0, 1.3, -2.2, 2.2, 1.2, 1.6, 0x444444);               // Einzugskanal
  kasten(K, 0, 3.75, -1.7, 1.9, 0.1, 1.9, gelb);                  // Kabine: Boden
  kasten(K, 0, 5.15, -1.7, 2.0, 0.12, 2.0, 0xc79a00);             // Dach
  for (const [x, z] of [[-0.9, -2.6], [0.9, -2.6], [-0.9, -0.8], [0.9, -0.8]]) kasten(K, x, 4.45, z, 0.1, 1.3, 0.1, 0x333333);
  kasten(K, 0, 4.45, -1.7, 1.75, 1.25, 1.75, glasMat, false);
  kasten(K, 0, 4.0, -1.3, 0.55, 0.12, 0.55, 0x222222, false);     // Sitz
  const rohr = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 4.5, 10), mat(0xc79a00));   // Abtankrohr
  rohr.rotation.z = Math.PI / 2; rohr.position.set(2.6, 4.2, 1.2); rohr.castShadow = true; K.add(rohr);
  kasten(K, 0.9, 5.4, 2.6, 0.2, 1.2, 0.2, 0x222222);              // Auspuff
  for (const x of [-0.5, 0.5]) kasten(K, x, 5.1, -2.71, 0.35, 0.15, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);
  const raeder = [];
  for (const x of [-1.6, 1.6]) {
    raeder.push(baueRad(K, x, 0.95, -1.4, 0.95, 0.7, 0));        // Vorne: riesig (der Mähdrescher trägt vorne das Schneidwerk)
    raeder.push(baueRad(K, x * 0.9, 0.6, 3.0, 0.6, 0.45, -1));    // Hinten: lenkt! (wie bei echten Mähdreschern)
  }
  return { raeder, auspuff: [0.9, 6.0, 2.6], sitz: [0, 4.75, -1.15], radstand: 4.4 };
}
// Anbaugeräte
function baueGeraet(art) {
  const g = new THREE.Group();
  if (art === 'pflug') {
    kasten(g, 0, 0.6, 0, 3, 0.2, 0.3, 0x8b1e1e);
    for (let k = 0; k < 4; k++) kasten(g, -1.1 + k * 0.73, 0.3, 0.35 + k * 0.15, 0.12, 0.6, 0.7, 0xb0b0b0).rotation.y = 0.5;
    kasten(g, 0, 0.6, -0.8, 0.25, 0.2, 1.4, 0x8b1e1e);
  } else if (art === 'saat') {
    kasten(g, 0, 1.0, 0.2, 3.4, 0.9, 1.0, 0x2457a6);
    kasten(g, 0, 0.35, 0.3, 3.5, 0.2, 0.3, 0x333333);
    for (let k = 0; k < 8; k++) kasten(g, -1.6 + k * 0.46, 0.2, 0.55, 0.06, 0.4, 0.06, 0xb0b0b0);
    kasten(g, 0, 0.6, -0.7, 0.25, 0.2, 1.2, 0x2457a6);
  } else {
    kasten(g, 0, 0.5, 0, 4.5, 0.5, 1.0, 0xe0b000);
    kasten(g, 0, 0.2, -0.45, 4.5, 0.1, 0.3, 0x777777);
    const haspel = new THREE.Group(); haspel.position.set(0, 1.0, -0.2); g.add(haspel);
    for (let k = 0; k < 5; k++) {
      const latte = kasten(haspel, 0, 0, 0, 4.4, 0.08, 0.08, 0xc23b22);
      latte.position.set(0, Math.sin(k / 5 * Math.PI * 2) * 0.45, Math.cos(k / 5 * Math.PI * 2) * 0.45);
    }
    g.userData.haspel = haspel;
  }
  return g;
}
function neuesFahrzeug(typName, x, z, rot = 0, daten = {}) {
  const typ = FAHRZEUGE[typName];
  const g = new THREE.Group(); scene.add(g);
  const K = new THREE.Group(); K.scale.setScalar(typ.groesse); g.add(K);   // Der Körper (größer oder kleiner je nach Fahrzeug)
  const teile = typ.art === 'drescher' ? baueDrescher(typ, K) : baueTraktor(typ, K);
  const fz = {
    typName, typ, g, K, ...teile, speed: 0, lenkWinkel: 0, arbeitet: false, geraete: {},
    id: daten.id || `${mp.ich}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`, fahrer: null, fahrerZeit: 0, ziel: null,
    radius: (typ.art === 'drescher' ? 2.8 : 1.8) * typ.groesse,
    werkzeug: typ.geraete.includes(daten.werkzeug) ? daten.werkzeug : typ.geraete[typ.geraete.length - 1],
    diesel: daten.diesel ?? typ.dieselMax, tank: daten.tank ?? 0, saat: daten.saat ?? typ.saatMax,
  };
  for (const art of typ.geraete) {
    const m = baueGeraet(art), G = GERAETE[art];
    m.scale.set(typ.breite, typ.groesse, typ.groesse);
    m.position.z = typ.art === 'drescher' ? -3.9 : (G.hinten ? 3.0 : -2.9) * typ.groesse;
    g.add(m);
    fz.geraete[art] = m;
  }
  fz.schild = schild(`${typ.emoji} ${typ.name}`, '#ffffff', 5);
  fz.schild.position.y = (typ.art === 'drescher' ? 6.8 : 4.2) * typ.groesse;
  g.add(fz.schild);
  g.position.set(x, 0, z); g.rotation.y = rot;
  fahrzeuge.push(fz);
  return fz;
}

// =====================================================================
// ===== Anhänger =====
// =====================================================================
// Ein Anhänger hängt hinten am Traktor (Taste H) und fasst extra viel Korn.
// Der Mähdrescher kann sein Korn mit O in einen Anhänger (oder Traktor) daneben überladen.
const ANHAENGER = {
  kipper: { name: 'Kipper', emoji: '🛻', preis: 15000, max: 12000, farbe: 0x2a6fb0, laenge: 5 },
  grosskipper: { name: 'Großer Kipper', emoji: '🚛', preis: 30000, max: 25000, farbe: 0xb0302a, laenge: 7 },
};
const KUPPLUNG = 2.2;   // So weit hinter der Traktor-Mitte ist die Anhängerkupplung (mal Größe)
function neuerAnhaenger(typName, x, z, rot = 0, daten = {}) {
  const typ = ANHAENGER[typName], L = typ.laenge;
  const g = new THREE.Group(); scene.add(g);
  kasten(g, 0, 0.95, 0.3, 2.3, 0.25, L, 0x333333);                                  // Rahmen
  kasten(g, 0, 1.1, 0.3, 2.4, 0.1, L + 0.1, typ.farbe);                              // Boden
  for (const s of [-1, 1]) kasten(g, s * 1.17, 1.75, 0.3, 0.08, 1.2, L, typ.farbe);  // Seitenwände
  for (const s of [-1, 1]) kasten(g, 0, 1.75, 0.3 + s * L / 2, 2.4, 1.2, 0.08, typ.farbe);   // Vorne und hinten
  const korn = kasten(g, 0, 1.2, 0.3, 2.2, 1, L - 0.15, mat(0xe3c46a, { roughness: 1 }), false);   // Das Korn drin
  const deichsel = L / 2 + 1.4;   // Abstand von der Achse bis zur Kupplung vorne
  kasten(g, 0, 0.75, -(L / 2 + 1.4) / 2 - 0.1, 0.15, 0.15, deichsel - 0.4, 0x222222);   // Deichsel
  kasten(g, 0, 0.75, -deichsel + 0.1, 0.25, 0.2, 0.25, 0x555555);                   // Öse
  const raeder = [];
  const achsen = L > 6 ? [-0.7, 0.7] : [0];
  for (const az of achsen) for (const x of [-1.25, 1.25]) raeder.push(baueRad(g, x, 0.6, az, 0.6, 0.45, 0));
  for (const r of raeder) r.rad.parent.position.y = 0.6;
  const a = { id: daten.id || `${mp.ich}-a-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`, typName, typ, g, korn, raeder, deichsel,
    inhalt: daten.inhalt || 0, basis: daten.inhalt || 0, an: null };
  a.schild = schild(`${typ.emoji} ${typ.name}`, '#ffffff', 4.5);
  a.schild.position.y = 3.3; g.add(a.schild);
  g.position.set(x, 0, z); g.rotation.y = rot;
  anhaenger.push(a);
  return a;
}
const anhKupplung = (fz, ziel) => { fz.g.updateMatrixWorld(); return ziel.set(0, 0, KUPPLUNG * fz.typ.groesse).applyMatrix4(fz.g.matrixWorld); };
const anhOese = (a, ziel) => ziel.set(-Math.sin(a.g.rotation.y) * a.deichsel, 0, -Math.cos(a.g.rotation.y) * a.deichsel).add(a.g.position);
function ankuppeln(fz, a) {
  if (a.an) a.an.anh = null;
  fz.anh = a; a.an = fz;
  // Gerade hinter den Traktor stellen
  const h = anhKupplung(fz, new THREE.Vector3());
  a.g.rotation.y = fz.g.rotation.y;
  a.g.position.set(h.x + Math.sin(fz.g.rotation.y) * a.deichsel, 0, h.z + Math.cos(fz.g.rotation.y) * a.deichsel);
  if (GERAETE[fz.werkzeug].hinten) fz.werkzeug = 'ernte';   // Hinten ist jetzt der Anhänger, kein Pflug
}
function abkuppeln(fz) { if (fz.anh) { fz.anh.an = null; fz.anh = null; } }
// Der Anhänger rollt hinter dem Traktor her (die Deichsel zieht ihn)
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
function anhaengerFolgen(a) {
  const fz = a.an, h = anhKupplung(fz, tmpA);
  const p = a.g.position;
  let dx = h.x - p.x, dz = h.z - p.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l; dz /= l;
  const altX = p.x, altZ = p.z;
  p.set(h.x - dx * a.deichsel, 0, h.z - dz * a.deichsel);
  a.g.rotation.y = Math.atan2(-dx, -dz);
  const weg = Math.hypot(p.x - altX, p.z - altZ) * Math.sign(fz.speed || 1);
  for (const r of a.raeder) r.rad.rotation.x -= weg / r.r;
}
// Korn-Rechnung: Fahrzeug + angehängter Anhänger zusammen
const kornPlatz = fz => fz.typ.tankMax + (fz.anh ? fz.anh.typ.max : 0);
const kornDrin = fz => fz.tank + (fz.anh ? fz.anh.inhalt : 0);
function kornDazu(fz, menge) {   // Erst in den eigenen Tank, dann in den Anhänger
  const inTank = Math.min(menge, fz.typ.tankMax - fz.tank);
  fz.tank += inTank;
  if (fz.anh) fz.anh.inhalt += menge - inTank;
}
function kornWeg(fz, menge) {   // Erst aus dem Anhänger, dann aus dem Tank
  if (fz.anh) { const ausAnh = Math.min(menge, fz.anh.inhalt); fz.anh.inhalt -= ausAnh; menge -= ausAnh; }
  fz.tank -= menge;
}
function naheAnhaengerZumKuppeln(fz) {
  const h = anhKupplung(fz, tmpA);
  return anhaenger.find(a => !a.an && anhOese(a, tmpB).distanceTo(h) < 2.5) || null;
}
function kuppeln() {
  if (!aktiv) { meldung('🔗 Steig in einen Traktor, um einen Anhänger anzukuppeln!'); sound.nein(); return; }
  if (aktiv.typ.art === 'drescher') { meldung('🌾 Der Mähdrescher kann keinen Anhänger ziehen – lade mit O in einen Anhänger über!'); sound.nein(); return; }
  if (aktiv.anh) { const a = aktiv.anh; abkuppeln(aktiv); meldung(`🔓 ${a.typ.name} abgekuppelt.`); sound.klick(); return; }
  const a = naheAnhaengerZumKuppeln(aktiv);
  if (!a) { meldung('🔗 Fahr rückwärts mit der Kupplung an die Deichsel eines Anhängers (näher ran!)'); sound.nein(); return; }
  ankuppeln(aktiv, a);
  meldung(`🔗 ${a.typ.name} angekuppelt! Jetzt passen ${kg(kornPlatz(aktiv))} Korn rein.`, 3);
  sound.tuer();
}
function ueberladenZiel() {   // Wohin kann der Mähdrescher sein Korn laden? (Fahrzeug oder Anhänger in der Nähe)
  if (!aktiv || aktiv.typ.art !== 'drescher') return null;
  const p = aktiv.g.position;
  let bestes = null, bestD = 11;
  for (const fz of fahrzeuge) {
    if (fz === aktiv || fz.typ.art === 'drescher') continue;
    const d = Math.hypot(fz.g.position.x - p.x, fz.g.position.z - p.z);
    if (d < bestD && kornDrin(fz) < kornPlatz(fz)) { bestD = d; bestes = { fz }; }
  }
  for (const a of anhaenger) {
    if (a.an) continue;
    const d = Math.hypot(a.g.position.x - p.x, a.g.position.z - p.z);
    if (d < bestD && a.inhalt < a.typ.max) { bestD = d; bestes = { a }; }
  }
  return bestes;
}
function ueberladen() {
  const z = ueberladenZiel();
  if (!aktiv || aktiv.typ.art !== 'drescher') { meldung('🌾 Überladen geht mit dem Mähdrescher (Taste O)!'); sound.nein(); return; }
  if (!z) { meldung('🚛 Fahr mit dem Mähdrescher neben einen Traktor mit Anhänger (oder einen Anhänger)!'); sound.nein(); return; }
  if (aktiv.tank <= 0) { meldung('Der Korntank vom Mähdrescher ist leer!'); sound.nein(); return; }
  let menge;
  if (z.fz) { menge = Math.min(aktiv.tank, kornPlatz(z.fz) - kornDrin(z.fz)); kornDazu(z.fz, menge); mpEvent({ t: 'korn', id: z.fz.id, m: menge }); }
  else { menge = Math.min(aktiv.tank, z.a.typ.max - z.a.inhalt); z.a.inhalt += menge; }
  aktiv.tank -= menge;
  meldung(`🌾➡️🚛 ${kg(menge)} Korn übergeladen!`);
  sound.korn();
  const p = aktiv.g.position;
  for (let k = 0; k < 12; k++) staub(p.x + zufall(-3, 3), p.z + zufall(-3, 3), 0xe3c46a, 4, -0.5);
}
function anhaengerKaufen(name) {
  const typ = ANHAENGER[name];
  if (money < typ.preis) return;
  for (let k = 0; k < 20; k++) {
    const x = k < 10 ? 32 + k * 6 : -12 - (k - 10) * 6, z = 2;
    if (kollidiert(x, z, 4)) continue;
    money -= typ.preis;
    const a = neuerAnhaenger(name, x, z, 0);
    mpEvent({ t: 'neuerAnh', id: a.id, typ: name, x, z, r: 0 });
    meldung(`🎉 Dein ${typ.emoji} ${typ.name} steht beim Landhandel! Fahr mit dem Traktor rückwärts ran und drück H.`, 5);
    sound.kaufen();
    haendlerZeigen(true);
    speichern();
    return;
  }
  meldung('🚫 Kein Parkplatz mehr frei beim Landhandel!'); sound.nein();
}

// =====================================================================
// ===== Der Farmer =====
// =====================================================================
function karoTextur(farbe = '#b3261e') {   // Kariertes Holzfäller-Hemd
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = farbe; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(20,10,10,0.55)';
  for (let k = 0; k < 64; k += 16) { g.fillRect(k, 0, 6, 64); g.fillRect(0, k, 64, 6); }
  g.fillStyle = 'rgba(255,255,255,0.15)';
  for (let k = 8; k < 64; k += 16) { g.fillRect(k, 0, 1, 64); g.fillRect(0, k, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
function baueFarmer(hemdFarbe) {   // Baut einen Bauern (für dich und für die anderen Spieler im Multiplayer)
  const player = new THREE.Group(), farmer = { phase: 0 };
  const haut = mat(0xe8b896), jeans = mat(0x2f4f86), hemd = new THREE.MeshStandardMaterial({ map: karoTextur(hemdFarbe), roughness: 0.9 });
  farmer.hemd = hemd;
  const stiefel = mat(0x4a2e18), hut = mat(0xe6c35c), hutband = mat(0x7a3b1d), schwarz = mat(0x111111), bart = mat(0x6b4423);
  const teil = (eltern, geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); t.castShadow = true; eltern.add(t); return t; };
  // Beine (drehen sich an der Hüfte)
  for (const s of [-1, 1]) {
    const bein = new THREE.Group(); bein.position.set(s * 0.13, 0.92, 0); player.add(bein);
    teil(bein, new THREE.BoxGeometry(0.2, 0.8, 0.22), jeans, 0, -0.42, 0);
    teil(bein, new THREE.BoxGeometry(0.22, 0.16, 0.34), stiefel, 0, -0.84, -0.05);
    farmer[s < 0 ? 'beinL' : 'beinR'] = bein;
  }
  // Körper: Hemd + Latzhose
  teil(player, new THREE.BoxGeometry(0.5, 0.62, 0.3), hemd, 0, 1.24, 0);
  teil(player, new THREE.BoxGeometry(0.52, 0.42, 0.32), jeans, 0, 1.1, 0);                 // Latzhose unten
  teil(player, new THREE.BoxGeometry(0.34, 0.24, 0.02), jeans, 0, 1.38, -0.16);            // Latz vorne
  for (const s of [-1, 1]) teil(player, new THREE.BoxGeometry(0.06, 0.26, 0.33), jeans, s * 0.14, 1.45, 0);   // Träger
  for (const s of [-1, 1]) teil(player, new THREE.BoxGeometry(0.05, 0.05, 0.02), mat(0xd4af37), s * 0.13, 1.47, -0.175);   // Knöpfe
  // Arme (drehen sich an der Schulter)
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.33, 1.5, 0); player.add(arm);
    teil(arm, new THREE.BoxGeometry(0.15, 0.55, 0.17), hemd, 0, -0.27, 0);
    teil(arm, new THREE.BoxGeometry(0.12, 0.13, 0.13), haut, 0, -0.6, 0);                 // Hand
    farmer[s < 0 ? 'armL' : 'armR'] = arm;
  }
  // Kopf mit Gesicht
  const kopf = new THREE.Group(); kopf.position.set(0, 1.72, 0); player.add(kopf);
  teil(kopf, new THREE.BoxGeometry(0.12, 0.1, 0.12), haut, 0, -0.14, 0);                  // Hals
  teil(kopf, new THREE.BoxGeometry(0.3, 0.32, 0.3), haut, 0, 0.04, 0);
  for (const s of [-1, 1]) {
    teil(kopf, new THREE.BoxGeometry(0.06, 0.05, 0.02), schwarz, s * 0.07, 0.08, -0.155);   // Augen
    teil(kopf, new THREE.BoxGeometry(0.09, 0.02, 0.02), bart, s * 0.07, 0.13, -0.155);      // Augenbrauen
    teil(kopf, new THREE.BoxGeometry(0.03, 0.08, 0.06), haut, s * 0.16, 0.04, 0);           // Ohren
  }
  teil(kopf, new THREE.BoxGeometry(0.06, 0.07, 0.06), mat(0xd9a07e), 0, 0.02, -0.17);      // Nase
  teil(kopf, new THREE.BoxGeometry(0.2, 0.05, 0.03), bart, 0, -0.04, -0.16);               // Schnurrbart
  teil(kopf, new THREE.BoxGeometry(0.31, 0.06, 0.31), bart, 0, 0.19, 0.0);                 // Haare
  // Strohhut
  teil(kopf, new THREE.CylinderGeometry(0.36, 0.38, 0.03, 20), hut, 0, 0.22, 0);
  teil(kopf, new THREE.CylinderGeometry(0.17, 0.2, 0.16, 16), hut, 0, 0.31, 0);
  teil(kopf, new THREE.CylinderGeometry(0.205, 0.205, 0.04, 16), hutband, 0, 0.26, 0);
  farmer.kopf = kopf;
  // Motorsäge: wird mit beiden Händen vor dem Bauch gehalten (erst mal versteckt)
  const saege = new THREE.Group(); saege.position.set(0.12, 1.02, -0.45); saege.visible = false;
  player.add(saege);
  const orange = mat(0xf07f13);
  teil(saege, new THREE.BoxGeometry(0.2, 0.24, 0.36), orange, 0, 0, 0);                             // Motor (orange)
  teil(saege, new THREE.BoxGeometry(0.16, 0.06, 0.1), schwarz, 0, 0.05, 0.22);                      // Hinterer Griff (rechte Hand)
  teil(saege, new THREE.BoxGeometry(0.06, 0.1, 0.06), schwarz, 0.08, 0.02, 0.22);
  teil(saege, new THREE.BoxGeometry(0.5, 0.05, 0.05), schwarz, -0.25, 0.17, -0.12);                 // Vorderer Bügel (linke Hand)
  teil(saege, new THREE.BoxGeometry(0.05, 0.17, 0.05), schwarz, -0.02, 0.09, -0.12);
  teil(saege, new THREE.BoxGeometry(0.03, 0.06, 0.03), mat(0xd4af37), 0.11, 0.08, 0.05);           // Starter-Griff
  teil(saege, new THREE.BoxGeometry(0.035, 0.09, 0.8), mat(0xb5b9bf, { metalness: 0.6, roughness: 0.4 }), 0, -0.02, -0.58);   // Schwert
  teil(saege, new THREE.BoxGeometry(0.045, 0.02, 0.82), schwarz, 0, -0.07, -0.58);                  // Kette unten
  teil(saege, new THREE.BoxGeometry(0.045, 0.02, 0.82), schwarz, 0, 0.03, -0.58);                   // Kette oben
  farmer.saege = saege;
  // Holzstämme auf dem Rücken (erst mal versteckt)
  farmer.holz = [];
  for (let k = 0; k < HOLZ_TRAGEN_MAX; k++) {
    const st = teil(player, new THREE.CylinderGeometry(0.11, 0.11, 0.95, 8), mat(0x6b4a2b), 0, 1.12 + k * 0.2, 0.28);
    st.rotation.z = Math.PI / 2; st.visible = false;
    farmer.holz.push(st);
  }
  return { g: player, t: farmer };
}
// Motorsäge und Holz zeigen (und die Arme richtig halten)
function farmerWerkzeug(t, saege, saegt, holz) {
  t.saege.visible = saege;
  t.holz.forEach((h, k) => { h.visible = k < holz; });
  if (saege) {   // Beide Hände an der Säge
    const r = saegt ? Math.sin(spielZeit * 60) * 0.02 : 0;   // Beim Sägen rüttelt alles!
    t.armL.rotation.x = 0.85 + r; t.armR.rotation.x = 0.85 - r;
    t.saege.rotation.x = saegt ? -0.15 + r : -0.35;           // Beim Sägen waagerecht, sonst Spitze nach unten
    t.saege.position.y = 1.02 + r * 0.5;
  } else if (holz > 0) t.armL.rotation.x = -2.3;   // Mit links die Stämme auf dem Rücken festhalten
}
const meinFarmer = baueFarmer('#b3261e');
const player = meinFarmer.g, farmer = meinFarmer.t;
// ===== First-Person-Motorsäge: Säge und Hände direkt vor der Kamera (wie in Ego-Spielen) =====
scene.add(camera);   // Damit man Sachen an die Kamera hängen kann
const egoSaege = new THREE.Group();
egoSaege.visible = false; egoSaege.position.set(0.3, -0.24, -0.55);
camera.add(egoSaege);
const egoKette = [];   // Die Zähne der Kette (die laufen beim Sägen rundherum!)
{
  const E = egoSaege, haut = mat(0xe8b896), schwarz = mat(0x111111);
  const teil = (geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); E.add(t); return t; };
  teil(new THREE.BoxGeometry(0.16, 0.2, 0.3), mat(0xf07f13), 0, 0, 0);                          // Motor (orange)
  teil(new THREE.BoxGeometry(0.17, 0.04, 0.22), mat(0x222222), 0, 0.1, 0.02);                   // Deckel
  teil(new THREE.BoxGeometry(0.03, 0.05, 0.03), mat(0xd4af37), 0.09, 0.04, 0.06);              // Starter-Griff
  teil(new THREE.BoxGeometry(0.1, 0.05, 0.12), schwarz, 0, 0.06, 0.2);                          // Hinterer Griff
  teil(new THREE.BoxGeometry(0.2, 0.035, 0.035), schwarz, -0.1, 0.15, -0.1);                    // Vorderer Bügel
  teil(new THREE.BoxGeometry(0.035, 0.15, 0.035), schwarz, -0.01, 0.08, -0.1);
  teil(new THREE.BoxGeometry(0.03, 0.08, 0.75), mat(0xb5b9bf, { metalness: 0.6, roughness: 0.35 }), 0, -0.02, -0.52);   // Schwert
  // Hände und Ärmel (mit deinem karierten Hemd!)
  teil(new THREE.BoxGeometry(0.09, 0.08, 0.11), haut, 0.01, 0.1, 0.21);                         // Rechte Hand
  teil(new THREE.BoxGeometry(0.11, 0.11, 0.45), farmer.hemd, 0.05, -0.02, 0.4).rotation.x = 0.5;    // Ärmel geht schräg nach unten aus dem Bild
  teil(new THREE.BoxGeometry(0.09, 0.09, 0.09), haut, -0.17, 0.15, -0.1);                       // Linke Hand
  { const a = teil(new THREE.BoxGeometry(0.11, 0.11, 0.5), farmer.hemd, -0.22, -0.02, 0.12); a.rotation.set(0.6, -0.3, 0); }
  // Kette: kleine Zähne oben und unten am Schwert
  for (let k = 0; k < 28; k++) egoKette.push(teil(new THREE.BoxGeometry(0.042, 0.025, 0.022), schwarz, 0, 0, 0));
}
const KETTE_LANG = 0.72;
function egoSaegeUpdate(dt) {
  const zeigen = ansicht === 'ego' && saegeAn && !aktiv && !building;
  egoSaege.visible = zeigen;
  if (!zeigen) return;
  const r = saegt ? Math.sin(spielZeit * 55) * 0.006 : 0;                  // Rütteln beim Sägen
  const wackeln = mp.laeuft ? Math.sin(farmer.phase) * 0.015 : 0;         // Beim Laufen wippt die Säge
  const zielZ = saegt ? -0.7 : -0.55, zielKipp = saegt ? -0.05 : -0.15;  // Beim Sägen nach vorne in den Stamm drücken
  egoSaege.position.x = 0.3 + r;
  egoSaege.position.y = -0.24 + wackeln + r;
  egoSaege.position.z += (zielZ - egoSaege.position.z) * Math.min(1, dt * 8);
  egoSaege.rotation.x += (zielKipp - egoSaege.rotation.x) * Math.min(1, dt * 8);
  egoSaege.rotation.z = r * 3;
  if (saegt && baumVorMir()) blickHoch += (-0.45 - blickHoch) * Math.min(1, dt * 3);   // Beim Sägen auf den Schnitt runterschauen
  // Die Kette läuft rundherum: unten nach vorne, oben zurück
  egoSaege.userData.kette = ((egoSaege.userData.kette || 0) + dt * (saegt ? 3 : saegeSprit > 0 ? 0.25 : 0)) % (KETTE_LANG * 2);
  egoKette.forEach((z, k) => {
    const pos = (k / egoKette.length * KETTE_LANG * 2 + egoSaege.userData.kette) % (KETTE_LANG * 2);
    const unten = pos < KETTE_LANG;
    z.position.set(0, unten ? -0.065 : 0.025, unten ? -0.16 - pos : -0.16 - (KETTE_LANG * 2 - pos));
  });
}
player.visible = false;
scene.add(player);
let spielerVy = 0, amBoden = true;   // Hüpfen: Geschwindigkeit nach oben, und ob du gerade auf dem Boden stehst
const SPRUNG_KRAFT = 6.5, SCHWERKRAFT = 18;
function farmerPose(t, sitzt, laeuft, dt, inLuft = false) {
  if (sitzt) {
    t.beinL.rotation.x = t.beinR.rotation.x = 1.25;   // Beine nach vorne, Füße auf den Pedalen (sitzen)
    t.armL.rotation.x = t.armR.rotation.x = 0.9;             // Hände am Lenkrad
    return;
  }
  if (inLuft) {   // In der Luft: Beine angezogen, Arme hoch – Juhuu!
    t.beinL.rotation.x = 0.6; t.beinR.rotation.x = -0.3;
    t.armL.rotation.x = t.armR.rotation.x = -2.6;
    return;
  }
  t.phase = laeuft ? t.phase + dt * 9 : t.phase * Math.pow(0.001, dt);
  const s = Math.sin(t.phase) * (laeuft ? 0.6 : 0);
  t.beinL.rotation.x = s; t.beinR.rotation.x = -s;
  t.armL.rotation.x = -s * 0.8; t.armR.rotation.x = s * 0.8;
}

// ===== Spielstand =====
let money = START_GELD;
let building = false, bauArt = 'schuppen';
let ansicht = 'dritte';   // 'dritte' = von hinten · 'ego' = First Person (mit den Augen des Farmers)
let rotation = 0, yaw = 0, pitch = 0.25, blickHoch = 0, zoom = 1, kamOffset = 0, spielZeit = 0;
let rauchTakt = 0, spurTakt = 0;
let saegeAn = false, saegt = false, saegeSprit = 100, getragen = 0;   // Motorsäge in der Hand? Sägst du gerade? Sprit in %, Holzstämme auf dem Rücken
const keys = {};
const gebaute = [];   // Was du gebaut hast: { art, x, z, rot, mesh, h, silo }
const silos = [];     // Alle Silos: { x, z, inhalt, schild }
const SILO_MAX = 50000;   // So viel Korn passt in ein Silo

// ===== Gebäude bauen =====
function baueGebaeudeMesh(art) {
  const g = new THREE.Group();
  if (art === 'schuppen') {
    kasten(g, 0, 2.5, 0, 8, 5, 8, new THREE.MeshStandardMaterial({ map: bretterTextur('#9a9a9a'), roughness: 0.95 }));
    const dach = kasten(g, 0, 5, 0, 8.4, 5.9, 5.9, 0x6b3a2a);
    dach.rotation.x = Math.PI / 4;
    kasten(g, 0, 1.8, 4.01, 3, 3.6, 0.05, 0x7a5230);
  } else if (art === 'silo') {
    const blech = mat(0xc9ccd1, { metalness: 0.55, roughness: 0.35 });
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 10, 24), blech);
    rohr.position.y = 5; rohr.castShadow = true; g.add(rohr);
    for (let k = 1; k < 5; k++) {   // Ringe aus Wellblech
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.52, 0.05, 6, 32), mat(0x9a9ea5));
      ring.rotation.x = Math.PI / 2; ring.position.y = k * 2; g.add(ring);
    }
    const kuppel = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2, 24), mat(0x8a8f96));
    kuppel.position.y = 11; kuppel.castShadow = true; g.add(kuppel);
    kasten(g, 0, 5.5, 2.55, 0.5, 11, 0.08, 0x555555, false);   // Leiter
  } else {
    const stamm = new THREE.Mesh(stammGeo, mat(0x694020)); stamm.castShadow = true; g.add(stamm);
    const krone = new THREE.Mesh(kroneGeo, mat(0x1f7a30, { flatShading: true })); krone.castShadow = true; g.add(krone);
  }
  return g;
}
function neuesSilo(x, z, inhalt = 0) {
  const s = { x, z, inhalt, basis: inhalt, schild: schild('', '#fff', 7) };
  s.schild.position.set(x, 13.5, z);
  scene.add(s.schild);
  silos.push(s);
  siloSchild(s);
  return s;
}
function siloSchild(s) { s.schild.userData.malen(`🛢️ ${kg(s.inhalt)}`, s.inhalt >= SILO_MAX ? '#ff9a6b' : '#ffd166'); }
function gebaeudeHinzu(art, x, z, rot, inhalt = 0) {
  const mesh = baueGebaeudeMesh(art);
  mesh.position.set(x, 0, z); mesh.rotation.y = rot;
  scene.add(mesh);
  const h = { x, z, r: GEBAEUDE_ARTEN[art].r };
  hindernisse.push(h);
  gebaute.push({ art, x, z, rot, mesh, h, silo: art === 'silo' ? neuesSilo(x, z, inhalt) : null });
}
// Das Hof-Silo: gehört dir von Anfang an
const HOF_SILO = { x: 41, z: 23 };
{
  const m = baueGebaeudeMesh('silo'); m.position.set(HOF_SILO.x, 0, HOF_SILO.z); scene.add(m);
  hindernisse.push({ x: HOF_SILO.x, z: HOF_SILO.z, r: 2.6 });
}
const hofSilo = neuesSilo(HOF_SILO.x, HOF_SILO.z);
// Vorschau ("Geist") im Baumodus: grün = hier geht's, rot = geht nicht
const geistMat = new THREE.MeshBasicMaterial({ color: 0x55ff77, transparent: true, opacity: 0.45, depthWrite: false });
let geist = null, geistArt = null, geistOk = false;
function geistAktualisieren(punkt) {
  if (!building || !punkt) { if (geist) geist.visible = false; return; }
  if (geistArt !== bauArt) {
    if (geist) scene.remove(geist);
    geist = baueGebaeudeMesh(bauArt);
    geist.traverse(o => { if (o.isMesh) { o.material = geistMat; o.castShadow = false; } });
    scene.add(geist);
    geistArt = bauArt;
  }
  geist.visible = true;
  geist.position.set(punkt.x, 0, punkt.z);
  geist.rotation.y = rotation;
  const A = GEBAEUDE_ARTEN[bauArt];
  const imWeg = kollidiert(punkt.x, punkt.z, A.r) || Math.hypot(punkt.x - LADEN.x, punkt.z - LADEN.z) < A.r + LADEN.r ||
    (!aktiv && Math.hypot(punkt.x - player.position.x, punkt.z - player.position.z) < A.r + 1);
  geistOk = !feldBei(punkt.x, punkt.z, A.r) && !imWeg && money >= A.preis;
  geistMat.color.set(geistOk ? 0x55ff77 : 0xff5555);
}

// ===== Sound (Motor-Brummen und Kassen-Klingeln, alles mit Web Audio) =====
let audio = null, motor = null, tonAn = true;
function tonStart() {
  if (audio) { if (audio.state === 'suspended') audio.resume(); return; }
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
    // Diesel-Motor: zwei tiefe Töne (Grundton + halber Ton für das "Tuckern"), durch einen Filter gedämpft
    const o = audio.createOscillator(), o2 = audio.createOscillator(), f = audio.createBiquadFilter(), g = audio.createGain();
    o.type = 'sawtooth'; o.frequency.value = 35;
    o2.type = 'square'; o2.frequency.value = 17;
    f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 4;
    g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g).connect(audio.destination);
    o.start(); o2.start();
    motor = { o, o2, g };
    // Motorsäge: ein schnelles, kreischendes Knattern
    const so = audio.createOscillator(), so2 = audio.createOscillator(), sf = audio.createBiquadFilter(), sg = audio.createGain();
    so.type = 'sawtooth'; so.frequency.value = 100;
    so2.type = 'square'; so2.frequency.value = 50;
    sf.type = 'bandpass'; sf.frequency.value = 900; sf.Q.value = 0.7;
    sg.gain.value = 0;
    so.connect(sf); so2.connect(sf); sf.connect(sg).connect(audio.destination);
    so.start(); so2.start();
    saegeTon = { o: so, o2: so2, f: sf, g: sg };
  } catch (e) { audio = null; }
}
let saegeTon = null;
function tonGleiten(von, bis, start, dauer, klang = 'sawtooth', laut = 0.05) {   // Ein Ton, der höher oder tiefer rutscht
  if (!audio || !tonAn || laut < 0.002) return;
  const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
  o.type = klang;
  o.frequency.setValueAtTime(von, t); o.frequency.exponentialRampToValueAtTime(bis, t + dauer);
  g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(laut, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dauer + 0.05);
}
function ton(hoehe, start, dauer, klang = 'sine', laut = 0.1) {
  if (!audio || !tonAn) return;
  const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
  o.type = klang; o.frequency.value = hoehe;
  g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
  o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dauer + 0.05);
}
const sound = {
  kasse() { [1319, 1760, 2093].forEach((f, k) => ton(f, k * 0.08, 0.3, 'triangle', 0.08)); },
  kaufen() { [523, 659, 784, 1047].forEach((f, k) => ton(f, k * 0.1, 0.25, 'square', 0.05)); },
  bauen() { ton(140, 0, 0.15, 'square', 0.12); ton(110, 0.15, 0.2, 'square', 0.1); },
  rumms() { ton(70, 0, 0.25, 'sine', 0.3); },
  klick() { ton(900, 0, 0.05, 'square', 0.04); },
  nein() { ton(200, 0, 0.2, 'sawtooth', 0.06); },
  korn() { for (let k = 0; k < 12; k++) ton(2000 + Math.random() * 3000, k * 0.04, 0.05, 'square', 0.015); },   // Rieseln
  tuer() { ton(300, 0, 0.08, 'square', 0.05); ton(220, 0.08, 0.1, 'square', 0.05); },
  hupf() { ton(330, 0, 0.12, 'sine', 0.06); ton(520, 0.05, 0.1, 'sine', 0.05); },
  anwerfen() { tonGleiten(60, 170, 0, 0.25, 'sawtooth', 0.06); tonGleiten(60, 190, 0.3, 0.3, 'sawtooth', 0.07); },   // Motorsäge: ritsch, ratsch!
  knarren(laut = 1) {   // Der Baum knarzt und kracht, wenn er umfällt
    ton(1800, 0, 0.04, 'square', 0.05 * laut);
    tonGleiten(150, 90, 0.05, 0.5, 'sawtooth', 0.05 * laut);
    tonGleiten(120, 55, 0.5, 0.7, 'sawtooth', 0.05 * laut);
  },
  aufprall(laut = 1) {   // Rumms! Der Baum liegt
    ton(48, 0, 0.8, 'sine', 0.45 * laut); ton(85, 0, 0.35, 'triangle', 0.25 * laut);
    for (let k = 0; k < 10; k++) ton(1500 + Math.random() * 2500, 0.05 + k * 0.03, 0.06, 'square', 0.012 * laut);   // Äste rascheln
  },
  holz() { ton(260, 0, 0.08, 'triangle', 0.12); ton(180, 0.06, 0.1, 'triangle', 0.1); },
};

// ===== Staub- und Rauch-Wolken =====
const staubTeile = [];
const wolkenTextur = glanzTextur('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
for (let k = 0; k < 160; k++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wolkenTextur, color: 0x8a6a3a, transparent: true, opacity: 0, depthWrite: false }));
  s.visible = false; scene.add(s);
  staubTeile.push({ s, t: 0, v: new THREE.Vector3() });
}
let staubNr = 0;
function staub(x, z, farbe, y = 0.5, hoch = 1, groesse = 1) {
  const p = staubTeile[staubNr++ % staubTeile.length];
  p.s.position.set(x + zufall(-0.4, 0.4), y, z + zufall(-0.4, 0.4));
  p.s.material.color.set(farbe);
  p.v.set(zufall(-0.5, 0.5), zufall(0.8, 1.6) * hoch, zufall(-0.5, 0.5));
  p.t = 1; p.g = groesse; p.s.visible = true;
}
function staubUpdate(dt) {
  for (const p of staubTeile) {
    if (p.t <= 0) continue;
    p.t -= dt;
    p.s.position.addScaledVector(p.v, dt);
    p.s.scale.setScalar((0.6 + (1 - p.t) * 1.8) * (p.g || 1));
    p.s.material.opacity = Math.max(0, p.t) * 0.6;
    if (p.t <= 0) p.s.visible = false;
  }
}

// ===== Anzeigen (HUD) =====
const $ = id => document.getElementById(id);
let meldungZeit = 0;
function meldung(text, dauer = 2.5) { $('meldung').textContent = text; $('meldung').style.display = 'block'; meldungZeit = dauer; }
let letzteMeldung = '', letzteMeldungZeit = 0;
function meldungSelten(text) {   // Gleiche Meldung nicht dauernd wiederholen
  if (text === letzteMeldung && spielZeit - letzteMeldungZeit < 3) return;
  letzteMeldung = text; letzteMeldungZeit = spielZeit;
  meldung(text);
}
function zeigeHinweis(text) {
  const h = $('hinweis');
  if (h.textContent !== text) h.textContent = text;
  h.style.display = text ? 'block' : 'none';
}
function kornPreis() { return KORN_PREIS * (0.85 + 0.3 * (0.5 + 0.5 * Math.sin(spielZeit / 45))); }
function balken(id, wert, max, text) {
  $(id).style.width = `${max > 0 ? wert / max * 100 : 0}%`;
  $(id + 'Text').textContent = text;
}
function updateHUD() {
  $('money').textContent = money.toLocaleString('de-DE');
  $('mode').textContent = building ? '🏗️ Baumodus' : aktiv ? '🚜 Fahren' : saegeAn ? '🪚 Motorsäge' : '🚶 Zu Fuß';
  $('holz').textContent = `${getragen} von ${HOLZ_TRAGEN_MAX} Stämmen · 🪚 Sprit ${Math.round(saegeSprit)} %`;
  $('ansicht').textContent = ansicht === 'ego' ? '👁️ First Person' : '🎥 Von hinten';
  const fz = aktiv || letztes;
  if (fz) {
    const G = GERAETE[fz.werkzeug];
    $('fahrzeug').textContent = `${fz.typ.emoji} ${fz.typ.name}${aktiv ? '' : ' (geparkt)'}`;
    $('geraet').textContent = `${G.emoji} ${G.name}`;
    $('tempo').textContent = Math.round(Math.abs(fz.speed) * 3.6);
    balken('diesel', fz.diesel, fz.typ.dieselMax, `${Math.round(fz.diesel)} Liter`);
    $('diesel').style.background = fz.diesel < fz.typ.dieselMax * 0.15 ? '#ff6b6b' : '#5aa0e0';
    balken('saat', fz.saat, fz.typ.saatMax, fz.typ.saatMax ? kg(fz.saat) : '– (kann nicht säen)');
    balken('tank', kornDrin(fz), kornPlatz(fz), fz.anh ? `${kg(kornDrin(fz))} (mit ${fz.anh.typ.name})` : kg(fz.tank));
  }
  const steigt = Math.cos(spielZeit / 45) > 0;
  $('preis').textContent = `${kornPreis().toFixed(2).replace('.', ',')} €/kg ${steigt ? '📈' : '📉'}`;
  $('bauleiste').style.display = building ? 'block' : 'none';
  for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).classList.toggle('aktiv', art === bauArt);
  $('fadenkreuz').style.display = ansicht === 'ego' ? 'block' : 'none';
}

// ===== Arbeiten auf dem Feld =====
function arbeiten(fz) {
  const G = GERAETE[fz.werkzeug], m = fz.geraete[fz.werkzeug];
  fz.g.updateMatrixWorld();
  const mitte = new THREE.Vector3(0, 0, m.position.z + (G.hinten ? 0.2 : -0.3)).applyMatrix4(fz.g.matrixWorld);
  // Ist das Gerät über einem eigenen Feld? Dann wird es abgesenkt (und du musst langsamer fahren)
  const f = feldBei(mitte.x, mitte.z);
  fz.arbeitet = !!f && f.gekauft;
  if (fz.speed < 0.5) return;   // Nur beim Vorwärtsfahren
  const rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(fz.g.quaternion);
  const breite = G.breite * fz.typ.breite;
  for (let o = -breite / 2 + 0.35; o <= breite / 2 - 0.35 + 0.001; o += 0.7) bearbeite(fz, mitte.x + rechts.x * o, mitte.z + rechts.z * o);
}
function bearbeite(fz, x, z) {
  const f = feldBei(x, z);
  if (!f) return;
  if (!f.gekauft) { meldungSelten(`🚫 Feld ${f.nr + 1} gehört dir noch nicht! Fahr zum Schild und drück K.`); return; }
  const i = Math.floor((x - f.x0) / ZELLE), j = Math.floor((z - f.z0) / ZELLE);
  if (i < 0 || j < 0 || i >= f.nx || j >= f.nz) return;
  const c = f.zellen[j * f.nx + i];
  if (fz.werkzeug === 'pflug') {
    if (c.z === 'wiese' || c.z === 'stoppeln') { c.z = 'gepfluegt'; c.w = 0; malBoden(f, i, j); mpZelle(f, i, j); if (Math.random() < 0.5) staub(x, z, 0x6b4a2b); }
    else if (c.z === 'gesaet') meldungSelten('🌾 Hier wächst schon was! Erst ernten (Taste 3), dann pflügen.');
  } else if (fz.werkzeug === 'saat') {
    if (c.z === 'gepfluegt') {
      if (fz.saat < SAAT_PRO_ZELLE) { meldungSelten('🌱 Die Saat ist leer! Fahr zum Landhandel 🏪 und drück G.'); return; }
      fz.saat -= SAAT_PRO_ZELLE; c.z = 'gesaet'; c.w = 0; malBoden(f, i, j); mpZelle(f, i, j);
    } else if (c.z === 'wiese' || c.z === 'stoppeln') meldungSelten('🟫 Erst pflügen (Taste 1), dann säen!');
  } else if (fz.werkzeug === 'ernte') {
    if (c.z === 'gesaet' && c.w >= 1) {
      if (kornDrin(fz) + ERTRAG_PRO_ZELLE > kornPlatz(fz)) { meldungSelten(fz.typ.art === 'drescher' ? '🚛 Der Korntank ist voll! Lade mit O in einen Anhänger über – oder ab zum Silo (L)!' : '🚛 Alles voll! Ab zum Silo 🛢️ (L) oder zum Landhandel 🏪 (V).'); return; }
      kornDazu(fz, ERTRAG_PRO_ZELLE); c.z = 'stoppeln'; c.w = 0; malBoden(f, i, j); mpZelle(f, i, j); staub(x, z, 0xe3c46a);
    } else if (c.z === 'gesaet') meldungSelten('⏳ Das Getreide ist noch nicht reif – warte, bis es golden ist!');
  }
}
// Wachsen: alle halbe Sekunde wachsen alle gesäten Felder ein Stück
let wachsTakt = 0;
function wachsen(dt) {
  wachsTakt -= dt;
  if (wachsTakt > 0) return;
  wachsTakt = 0.5;
  for (const f of felder) {
    for (let j = 0; j < f.nz; j++) for (let i = 0; i < f.nx; i++) {
      const c = f.zellen[j * f.nx + i];
      if (c.z !== 'gesaet' || c.w >= 1) continue;
      c.w = Math.min(1, c.w + 0.5 / WACHS_ZEIT);
      malZelle(f, i, j);
    }
  }
}

// ===== Kaufen, Verkaufen, Silo =====
function wo() { return aktiv ? aktiv.g.position : player.position; }
function imLaden() { return !!aktiv && Math.hypot(aktiv.g.position.x - LADEN.x, aktiv.g.position.z - LADEN.z) < LADEN.r + 1; }
function beimHaendler() { const p = wo(); return Math.hypot(p.x - LADEN.x, p.z - LADEN.z) < LADEN.r + 10; }
function nahesSilo() {
  if (!aktiv) return null;
  const p = aktiv.g.position;
  return silos.find(s => Math.hypot(p.x - s.x, p.z - s.z) < 7 + aktiv.radius) || null;
}
function brauchtFahrzeug(text) {
  if (aktiv) return false;
  meldung(`🚜 Steig zuerst in ein Fahrzeug (E), um ${text}!`); sound.nein();
  return true;
}
function verkaufen() {
  if (beimSaegewerk()) { holzVerkaufen(); return; }
  if (brauchtFahrzeug('Korn zu verkaufen')) return;
  if (!imLaden()) { meldung('🏪 Fahr auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  const drin = kornDrin(aktiv);
  if (drin <= 0) { meldung('Der Korntank ist leer. Ernte zuerst etwas – oder hol Korn aus dem Silo! 🌾'); sound.nein(); return; }
  const erloes = Math.round(drin * kornPreis());
  money += erloes;
  meldung(`💶 ${kg(drin)} Korn verkauft für ${euro(erloes)}!`, 3.5);
  kornWeg(aktiv, drin);
  sound.kasse();
  speichern();
}
function saatKaufen() {
  if (brauchtFahrzeug('Saat zu laden')) return;
  if (!imLaden()) { meldung('🏪 Fahr auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  if (!aktiv.typ.saatMax) { meldung(`🌱 Der ${aktiv.typ.name} kann nicht säen!`); sound.nein(); return; }
  const menge = aktiv.typ.saatMax - aktiv.saat, kosten = Math.round(menge * SAAT_PREIS);
  if (menge <= 0) { meldung('🌱 Die Saat ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld!'); sound.nein(); return; }
  money -= kosten; aktiv.saat = aktiv.typ.saatMax;
  meldung(`🌱 ${kg(menge)} Saat gekauft für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function anHofTankstelle() { return !!aktiv && Math.hypot(aktiv.g.position.x - TANKSTELLE.x, aktiv.g.position.z - TANKSTELLE.z) < aktiv.radius + 3.5; }
function tanken() {
  if (!aktiv) { saegeTanken(); return; }   // Zu Fuß: die Motorsäge tanken
  if (!imLaden() && !anHofTankstelle()) { meldung('⛽ Tanken kannst du beim Landhandel 🏪 oder an der Hof-Tankstelle in der Scheune 🏚️!'); sound.nein(); return; }
  const menge = aktiv.typ.dieselMax - aktiv.diesel, kosten = Math.round(menge * DIESEL_PREIS);
  if (menge < 1) { meldung('⛽ Der Tank ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld zum Tanken!'); sound.nein(); return; }
  money -= kosten; aktiv.diesel = aktiv.typ.dieselMax;
  meldung(`⛽ ${Math.round(menge)} Liter Diesel getankt für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function einlagern() {   // Korn vom Fahrzeug ins Silo
  if (brauchtFahrzeug('Korn einzulagern')) return;
  const s = nahesSilo();
  if (!s) { meldung('🛢️ Fahr näher an ein Silo!'); sound.nein(); return; }
  if (kornDrin(aktiv) <= 0) { meldung('Der Korntank ist leer!'); sound.nein(); return; }
  const menge = Math.min(kornDrin(aktiv), SILO_MAX - s.inhalt);
  if (menge <= 0) { meldung('🛢️ Das Silo ist voll! Bau noch eins (Baumodus).'); sound.nein(); return; }
  kornWeg(aktiv, menge); s.inhalt += menge;
  siloSchild(s);
  meldung(`🛢️ ${kg(menge)} Korn eingelagert. Im Silo: ${kg(s.inhalt)}`);
  sound.korn();
  for (let k = 0; k < 10; k++) staub(s.x + zufall(-1, 1), s.z + zufall(-1, 1), 0xe3c46a, 10, -0.5);
  speichern();
}
function ausSiloHolen() {   // Korn aus dem Silo aufs Fahrzeug (zum Verkaufen, wenn der Preis gut ist!)
  if (brauchtFahrzeug('Korn zu holen')) return;
  const s = nahesSilo();
  if (!s) { meldung('🛢️ Fahr näher an ein Silo!'); sound.nein(); return; }
  const menge = Math.min(s.inhalt, kornPlatz(aktiv) - kornDrin(aktiv));
  if (s.inhalt <= 0) { meldung('🛢️ Das Silo ist leer!'); sound.nein(); return; }
  if (menge <= 0) { meldung('Der Korntank ist schon voll!'); sound.nein(); return; }
  kornDazu(aktiv, menge); s.inhalt -= menge;
  siloSchild(s);
  meldung(`🚜 ${kg(menge)} Korn aus dem Silo geholt. Ab zum Landhandel! 🏪`);
  sound.korn();
  speichern();
}
// ===== Wald: Bäume fällen, Holz sammeln und verkaufen =====
const holzStuecke = [];   // Holzstämme, die auf dem Boden liegen: { id, x, z, r, g, bereit }
function neuesHolz(id, x, z, r, bereit) {
  const g = new THREE.Group();
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.6, 10), [rindeMat, schnittMat, schnittMat]);
  st.rotation.x = Math.PI / 2; st.castShadow = true; st.receiveShadow = true; g.add(st);
  g.position.set(x, 0.3, z); g.rotation.y = r; g.visible = bereit;
  scene.add(g);
  const h = { id, x, z, r, g, bereit };
  holzStuecke.push(h);
  return h;
}
function holzWeg(id) {
  const k = holzStuecke.findIndex(h => h.id === id);
  if (k < 0) return;
  scene.remove(holzStuecke[k].g);
  holzStuecke.splice(k, 1);
}
function baumZustand(b, zustand, wert) {   // Einen Baum stehen, liegen oder wachsen lassen
  b.zustand = zustand; b.hp = 0; b.knackt = false;
  if (b.schnitt) b.schnitt.visible = false;
  b.kipp.rotation.set(0, 0, 0);
  if (zustand === 'stumpf') {
    b.kipp.visible = false; b.stumpf.visible = true; b.h.r = 0.45;
    b.zeit = wert ?? NACHWACHS_ZEIT;
  } else {
    b.kipp.visible = true; b.stumpf.visible = false; b.h.r = 0.7 * b.s;
    b.wachs = zustand === 'waechst' ? (wert ?? 0) : 1;
    b.kipp.scale.setScalar(0.15 + 0.85 * b.wachs);
  }
}
const lautstaerkeBei = (x, z) => { const p = wo(); return Math.max(0, 1 - Math.hypot(x - p.x, z - p.z) / 90); };   // Weit weg = leiser
function baumFaellen(b, w, id, ich) {   // w = Richtung, in die der Baum fällt
  b.zustand = 'faellt'; b.hp = 0; b.fallW = 0; b.fallV = 0.15; b.kipp.rotation.z = 0;
  if (b.schnitt) b.schnitt.visible = false;
  b.g.rotation.y = w + Math.PI;   // So kippt er von dir weg
  b.stumpf.visible = true; b.h.r = 0.45;
  // Die Holzstämme liegen schon bereit – man sieht sie aber erst, wenn der Baum unten ist
  b.holz = [];
  for (let k = 0; k < HOLZ_PRO_BAUM; k++) {
    const d = (2.2 + k * 2.8) * b.s;
    b.holz.push(neuesHolz(`${id}-${k}`, r2(b.x + Math.sin(w) * d), r2(b.z + Math.cos(w) * d), w, false));
  }
  sound.knarren(lautstaerkeBei(b.x, b.z));
  if (ich) {
    meldung('🌲 Baum fällt! Achtung! 🪵', 2.5);
    mpEvent({ t: 'faellt', nr: b.nr, w, id });
  }
}
function baumAufgeschlagen(b) {
  baumZustand(b, 'stumpf');
  for (const h of b.holz || []) { h.bereit = true; h.g.visible = true; }
  b.holz = null;
  sound.aufprall(lautstaerkeBei(b.x, b.z));
  const w = b.g.rotation.y - Math.PI;
  for (let k = 0; k < 14; k++) {   // Staub und Nadeln wirbeln hoch
    const d = (1 + k * 0.6) * b.s;
    staub(b.x + Math.sin(w) * d, b.z + Math.cos(w) * d, k % 2 ? 0x8a7a5a : 0x3f6a32, 0.4, 1.2, 1.8);
  }
}
const schnittMat2 = mat(0x2a1a0e);
function schnittZeigen(b) {   // Der Sägeschnitt im Stamm: ein dunkler Spalt, der langsam durch den Stamm wandert
  if (!b.schnitt) {
    b.schnitt = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), schnittMat2);
    scene.add(b.schnitt);
  }
  const r = (0.4 - 0.15 * (SCHNITT_HOEHE / b.s) / 3) * b.s + 0.01;   // So dick ist der Stamm an der Schnitt-Stelle
  const tief = Math.max(0.02, b.hp * 2 * r);
  b.schnitt.visible = true;
  b.schnitt.scale.set(2 * r + 0.02, 0.05, tief);
  b.schnitt.rotation.y = b.schnittW;   // Die Box zeigt in Säge-Richtung
  // Von deiner Seite aus in den Stamm hinein
  const mitte = -r + tief / 2;
  b.schnitt.position.set(b.x + Math.sin(b.schnittW) * mitte, SCHNITT_HOEHE, b.z + Math.cos(b.schnittW) * mitte);
}
function baumVorMir() {   // Der Baum, vor dem du stehst (zum Sägen)
  const p = player.position, vx = -Math.sin(yaw), vz = -Math.cos(yaw);
  let bester = null, bestD = 1.8;
  for (const b of baeume) {
    if (b.zustand !== 'steht') continue;
    const d = Math.hypot(b.x - p.x, b.z - p.z);
    if (d < bestD && ((b.x - p.x) * vx + (b.z - p.z) * vz) / d > 0.4) { bestD = d; bester = b; }
  }
  return bester;
}
function baumInDerNaehe(abstand = 4) {
  const p = player.position;
  return baeume.find(b => Math.hypot(b.x - p.x, b.z - p.z) < abstand) || null;
}
const beimSaegewerk = () => !aktiv && Math.hypot(player.position.x - SAEGEWERK.platzX, player.position.z - SAEGEWERK.platzZ) < SAEGEWERK.r + 3;
const beimSpritHolen = () => !aktiv && (Math.hypot(player.position.x - LADEN.x, player.position.z - LADEN.z) < LADEN.r + 10 ||
  Math.hypot(player.position.x - TANKSTELLE.x, player.position.z - TANKSTELLE.z) < 3.5);
function saegeNehmen() {
  if (aktiv) { meldung('🪚 Steig erst aus (E), dann kannst du die Motorsäge nehmen!'); sound.nein(); return; }
  saegeAn = !saegeAn;
  if (saegeAn) {
    sound.anwerfen();
    meldung(saegeSprit > 0 ? `🪚 Motorsäge an! Geh zu einer Fichte 🌲 und halt die Maus gedrückt (oder X). Sprit: ${Math.round(saegeSprit)} %`
      : '🪚 Der Sprit ist leer! Tanken (T) beim Landhandel 🏪 oder an der Hof-Tankstelle 🏚️.', 3.5);
  } else { sound.klick(); meldung('🪚 Motorsäge weggepackt.', 1.5); }
}
function saegeTanken() {
  if (!beimSpritHolen()) { meldung('⛽ Fahrzeuge und die 🪚 Motorsäge tankst du beim Landhandel 🏪 oder an der Hof-Tankstelle 🏚️!'); sound.nein(); return; }
  const menge = 100 - saegeSprit, kosten = Math.max(1, Math.round(menge * SPRIT_PREIS));
  if (menge < 1) { meldung('🪚 Die Motorsäge ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld zum Tanken!'); sound.nein(); return; }
  money -= kosten; saegeSprit = 100;
  meldung(`🪚⛽ Motorsäge vollgetankt für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function holzVerkaufen() {
  if (getragen <= 0) { meldung('🪵 Du hast kein Holz dabei! Fäll Bäume im Wald 🌲 und heb die Stämme auf.'); sound.nein(); return; }
  const erloes = getragen * HOLZ_PREIS;
  money += erloes;
  meldung(`🪚💶 ${getragen} Holzstämme verkauft für ${euro(erloes)}!`, 3.5);
  getragen = 0;
  sound.kasse();
  speichern();
}
function waldUpdate(dt) {
  // Sägen: Motorsäge in der Hand + Maus gedrückt (oder X)
  saegt = false;
  if (saegeAn && !aktiv) {
    if (!building && (mouseDown || keys.x)) {
      if (saegeSprit <= 0) meldungSelten('⛽ Die Motorsäge hat keinen Sprit mehr! Drück T beim Landhandel 🏪 oder an der Hof-Tankstelle 🏚️.');
      else {
        saegt = true;
        saegeSprit = Math.max(0, saegeSprit - dt * 1.5);
        const b = baumVorMir();
        if (b) {
          if (b.hp === 0) b.schnittW = Math.atan2(b.x - player.position.x, b.z - player.position.z);   // Von hier aus sägst du
          b.hp = Math.min(1, b.hp + dt / SAEGE_ZEIT);
          b.g.rotation.y = b.schnittW + Math.PI;
          b.kipp.rotation.z = Math.sin(spielZeit * 70) * 0.006;   // Der Baum zittert
          b.kipp.rotation.x = -Math.max(0, b.hp - 0.8) * 0.25;     // Kurz vor Schluss neigt er sich schon ...
          schnittZeigen(b);
          if (b.hp > 0.8 && !b.knackt) { b.knackt = true; ton(1500, 0, 0.05, 'square', 0.05); ton(900, 0.15, 0.05, 'square', 0.04); }   // Knack!
          const nx = (player.position.x - b.x), nz = (player.position.z - b.z), l = Math.hypot(nx, nz) || 1;
          if (Math.random() < 0.6) staub(b.x + nx / l * 0.5, b.z + nz / l * 0.5, 0xe8cf94, 0.8, 0.6, 0.35);   // Sägespäne
          if (b.hp >= 1) baumFaellen(b, b.schnittW, Math.random().toString(36).slice(2, 8), true);
        }
      }
    } else saegeSprit = Math.max(0, saegeSprit - dt * 0.15);   // Im Leerlauf braucht sie nur ein bisschen
  }
  // Bäume fallen um, Stümpfe wachsen nach
  for (const b of baeume) {
    if (b.zustand === 'faellt') {
      b.fallV += dt * 2.4;   // Erst langsam, dann immer schneller
      b.fallW = Math.min(Math.PI / 2 - 0.05, b.fallW + b.fallV * dt);
      b.kipp.rotation.x = -b.fallW;
      if (b.fallW >= Math.PI / 2 - 0.05) baumAufgeschlagen(b);
    } else if (b.zustand === 'stumpf') {
      b.zeit -= dt;
      if (b.zeit <= 0) {
        // Nicht nachwachsen, wenn gerade jemand drauf steht (sonst steckst du im Baum fest!)
        const imWeg = (!aktiv && Math.hypot(player.position.x - b.x, player.position.z - b.z) < 1.8) ||
          fahrzeuge.some(fz => Math.hypot(fz.g.position.x - b.x, fz.g.position.z - b.z) < fz.radius + 1.5);
        if (imWeg) b.zeit = 5; else baumZustand(b, 'waechst', 0);
      }
    } else if (b.zustand === 'waechst') {
      b.wachs = Math.min(1, b.wachs + dt / BAUM_WACHS_DAUER);
      b.kipp.scale.setScalar(0.15 + 0.85 * b.wachs);
      if (b.wachs >= 1) b.zustand = 'steht';
    } else if (b.kipp.rotation.z !== 0 && !saegt) b.kipp.rotation.z = 0;
  }
  // Holz aufheben: einfach drüberlaufen
  if (!aktiv) {
    for (const h of [...holzStuecke]) {
      if (!h.bereit || Math.hypot(h.x - player.position.x, h.z - player.position.z) > 1.8) continue;
      if (getragen >= HOLZ_TRAGEN_MAX) { meldungSelten(`🪵 Du kannst nur ${HOLZ_TRAGEN_MAX} Stämme tragen! Bring sie zum Sägewerk 🪚 und drück V.`); break; }
      getragen++;
      holzWeg(h.id);
      mpEvent({ t: 'holzWeg', id: h.id });
      sound.holz();
      meldungSelten(`🪵 Holzstamm aufgehoben! (${getragen} von ${HOLZ_TRAGEN_MAX})`);
    }
  }
}
function waldHinweis() {   // Was steht unten in der Mitte, wenn du zu Fuß im Wald bist?
  if (aktiv) return '';
  if (beimSaegewerk()) return getragen > 0 ? `🪚 Sägewerk: V = Holz verkaufen (${getragen} Stämme = ${euro(getragen * HOLZ_PREIS)})` : '🪚 Sägewerk: Bring Holzstämme 🪵 her und drück V!';
  if (beimSpritHolen() && saegeAn && saegeSprit < 99) return `⛽ T = Motorsäge tanken (${Math.round(saegeSprit)} %)`;
  if (saegeAn) {
    const b = baumVorMir();
    if (b) return `🌲 Maus gedrückt halten oder X = Sägen! (${Math.round(b.hp * 100)} %)`;
    const n = baumInDerNaehe();
    if (n && n.zustand === 'waechst') return '🌱 Dieser Baum wächst noch – such dir einen großen!';
    if (n && n.zustand === 'steht') return '🌲 Dreh dich zum Baum und geh ganz nah ran!';
    return '';
  }
  const n = baumInDerNaehe();
  if (n && n.zustand === 'steht') return '🪚 Q = Motorsäge nehmen';
  return '';
}
const waldDaten = () => baeume.map(b => b.zustand === 'steht' ? 's' : b.zustand === 'waechst' ? 'w' + Math.round(b.wachs * 100) : 'x' + Math.round(b.zustand === 'faellt' ? NACHWACHS_ZEIT : b.zeit));
const holzDaten = () => holzStuecke.map(h => ({ id: h.id, x: h.x, z: h.z, r: r2(h.r) }));
function waldLaden(codes, liste) {
  (codes || []).forEach((c, k) => {
    const b = baeume[k];
    if (!b || typeof c !== 'string') return;
    if (c[0] === 'x') baumZustand(b, 'stumpf', Number(c.slice(1)) || 0);
    else if (c[0] === 'w') baumZustand(b, 'waechst', (Number(c.slice(1)) || 0) / 100);
    else baumZustand(b, 'steht');
    b.holz = null;
  });
  for (const h of holzStuecke) scene.remove(h.g);
  holzStuecke.length = 0;
  for (const h of liste || []) neuesHolz(h.id, h.x, h.z, h.r, true);
}

function feldInDerNaehe() {   // Ein Feld, das dir noch nicht gehört und neben dem du stehst
  const p = wo();
  const f = feldBei(p.x, p.z, 5);
  return f && !f.gekauft ? f : null;
}
function feldKaufen() {
  const f = feldInDerNaehe();
  if (!f) return;
  if (money < f.preis) { meldung(`💸 Feld ${f.nr + 1} kostet ${euro(f.preis)} – du hast nur ${euro(money)}.`); sound.nein(); return; }
  money -= f.preis; f.gekauft = true;
  malFeld(f);
  mpEvent({ t: 'feld', nr: f.nr });
  meldung(`🎉 Feld ${f.nr + 1} gehört jetzt dir! Pflüg es mit Taste 1.`, 3.5);
  sound.kaufen();
  speichern();
}
// Fahrzeug-Händler
function haendlerZeigen(an) {
  if (an && !beimHaendler()) { meldung('🚜 Der Fahrzeug-Händler ist beim Landhandel 🏪!'); sound.nein(); return; }
  $('haendler').style.display = an ? 'block' : 'none';
  if (!an) return;
  if (document.pointerLockElement) document.exitPointerLock();
  const liste = $('haendlerListe');
  liste.innerHTML = '';
  for (const [name, typ] of Object.entries(FAHRZEUGE)) {
    if (!typ.preis) continue;
    const anzahl = fahrzeuge.filter(f => f.typName === name).length;
    const zeile = document.createElement('div');
    zeile.className = 'angebot';
    zeile.innerHTML = `<b>${typ.emoji} ${typ.name}</b> – ${euro(typ.preis)}${anzahl ? ` <span class="klein">(du hast ${anzahl})</span>` : ''}<br>
      <span class="klein">⭐ ${typ.faehigkeit}<br>🏁 ${Math.round(typ.tempo * 3.6)} km/h · 🌾 Tank ${kg(typ.tankMax)} · ⛽ ${typ.dieselMax} l</span><br>`;
    const knopf = document.createElement('button');
    knopf.textContent = money >= typ.preis ? '🛒 Kaufen' : '💸 Zu teuer';
    knopf.disabled = money < typ.preis;
    knopf.addEventListener('click', () => fahrzeugKaufen(name));
    zeile.appendChild(knopf);
    liste.appendChild(zeile);
  }
  for (const [name, typ] of Object.entries(ANHAENGER)) {
    const anzahl = anhaenger.filter(a => a.typName === name).length;
    const zeile = document.createElement('div');
    zeile.className = 'angebot';
    zeile.innerHTML = `<b>${typ.emoji} ${typ.name}</b> (Anhänger) – ${euro(typ.preis)}${anzahl ? ` <span class="klein">(du hast ${anzahl})</span>` : ''}<br>
      <span class="klein">🌾 Fasst ${kg(typ.max)} Korn · Ankuppeln mit H · Der Mähdrescher kann mit O hineinladen</span><br>`;
    const knopf = document.createElement('button');
    knopf.textContent = money >= typ.preis ? '🛒 Kaufen' : '💸 Zu teuer';
    knopf.disabled = money < typ.preis;
    knopf.addEventListener('click', () => anhaengerKaufen(name));
    zeile.appendChild(knopf);
    liste.appendChild(zeile);
  }
}
function fahrzeugKaufen(name) {
  const typ = FAHRZEUGE[name];
  if (money < typ.preis) return;
  // Einen freien Parkplatz neben dem Landhandel suchen
  for (let k = 0; k < 20; k++) {
    const x = k < 10 ? 32 + k * 6 : -12 - (k - 10) * 6, z = 1;   // Parkplätze am Weg (erst Richtung Landhandel, dann nach Westen)
    if (kollidiert(x, z, 3.2)) continue;
    money -= typ.preis;
    const fz = neuesFahrzeug(name, x, z, 0);
    mpEvent({ t: 'neuesFz', id: fz.id, typ: name, x, z, r: 0 });
    meldung(`🎉 Dein neuer ${typ.emoji} ${typ.name} steht beim Landhandel! Steig mit E ein.`, 4);
    sound.kaufen();
    haendlerZeigen(true);
    speichern();
    return;
  }
  meldung('🚫 Kein Parkplatz mehr frei beim Landhandel!'); sound.nein();
}

// ===== Ein- und Aussteigen =====
function einsteigen(fz) {
  aktiv = fz; letztes = fz;
  kamOffset = 0; blickHoch = 0;
  // Der Farmer setzt sich in die Kabine
  fz.K.add(player);
  const g = fz.typ.groesse;   // Das Fahrzeug ist größer/kleiner – der Farmer aber nicht!
  player.position.set(fz.sitz[0], fz.sitz[1] - 1.65 / g, fz.sitz[2] + 0.05);
  player.rotation.set(0, 0, 0);
  player.scale.setScalar(1 / g);
  farmerPose(farmer, true, false, 0);
  fz.ziel = null;   // Jetzt fahre ICH es
  saegeAn = false; saegt = false;   // Die Motorsäge kommt in die Kabine
  farmerWerkzeug(farmer, false, false, 0);
  sound.tuer();
}
function aussteigen() {
  const fz = aktiv;
  fz.speed = 0;
  scene.add(player);
  player.scale.setScalar(1);
  yaw = fz.g.rotation.y;
  const seite = fz.radius + 0.6;
  player.position.set(fz.g.position.x + Math.cos(yaw) * seite, 0, fz.g.position.z - Math.sin(yaw) * seite);
  if (kollidiert(player.position.x, player.position.z, 0.4, fz)) player.position.set(fz.g.position.x - Math.cos(yaw) * seite, 0, fz.g.position.z + Math.sin(yaw) * seite);
  player.rotation.set(0, yaw, 0);
  spielerVy = 0; amBoden = true;
  aktiv = null;
  if (mp.aktiv) mpFzSenden(fz, null);   // Allen sagen: Das Fahrzeug ist wieder frei
  blickHoch = 0;
  sound.tuer();
}
function naechstesFahrzeug() {
  let bestes = null, bestD = Infinity;
  for (const fz of fahrzeuge) {
    const d = Math.hypot(fz.g.position.x - player.position.x, fz.g.position.z - player.position.z) - fz.radius;
    if (d < bestD) { bestD = d; bestes = fz; }
  }
  return bestD < 2.5 ? bestes : null;
}

// ===== Speichern (im Browser) =====
const ZUSTAND_KURZ = { wiese: 'w', stoppeln: 's', gepfluegt: 'p', gesaet: 'g' };
const ZUSTAND_LANG = { w: 'wiese', s: 'stoppeln', p: 'gepfluegt', g: 'gesaet' };
const zellCode = c => ZUSTAND_KURZ[c.z] + (c.z === 'gesaet' ? Math.round(c.w * 100) : '');
const zelleAusCode = code => ({ z: ZUSTAND_LANG[code[0]] || 'wiese', w: code[0] === 'g' ? Number(code.slice(1)) / 100 : 0 });
function speichern() {
  if (mp.rolle === 'gast') return;   // Beim Freund mitspielen überschreibt nicht deinen eigenen Hof!
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify({
      v: 2, money, hofSilo: hofSilo.inhalt,
      fahrzeuge: fahrzeuge.map(f => ({ id: f.id, typ: f.typName, x: f.g.position.x, z: f.g.position.z, r: f.g.rotation.y, saat: f.saat, tank: f.tank, diesel: f.diesel, werkzeug: f.werkzeug })),
      aktiv: fahrzeuge.indexOf(aktiv),
      anhaenger: anhaenger.map(a => ({ id: a.id, typ: a.typName, x: a.g.position.x, z: a.g.position.z, r: a.g.rotation.y, inhalt: a.inhalt, an: a.an ? a.an.id : null })),
      spieler: { x: player.position.x, z: player.position.z, yaw },
      felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(c => ZUSTAND_KURZ[c.z] + (c.z === 'gesaet' ? Math.round(c.w * 100) : '')) })),
      gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot, inhalt: b.silo ? b.silo.inhalt : 0 })),
      wald: waldDaten(), holz: holzDaten(), saege: { sprit: saegeSprit, getragen },
    }));
  } catch (e) { /* egal – dann eben nicht gespeichert */ }
}
function laden() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SPEICHER_NAME)); } catch (e) { d = null; }
  if (!d || (d.v !== 1 && d.v !== 2)) return false;
  money = d.money;
  d.felder.forEach((df, k) => {
    const f = felder[k];
    if (!f || !df || df.c.length !== f.zellen.length) return;
    f.gekauft = df.g;
    df.c.forEach((code, n) => { f.zellen[n] = { z: ZUSTAND_LANG[code[0]] || 'wiese', w: code[0] === 'g' ? Number(code.slice(1)) / 100 : 0 }; });
  });
  for (const b of d.gebaeude || []) if (GEBAEUDE_ARTEN[b.art]) gebaeudeHinzu(b.art, b.x, b.z, b.rot, b.inhalt || 0);
  if (d.v === 1) {   // Alter Spielstand (nur ein Traktor)
    neuesFahrzeug('fendt', d.traktor.x, d.traktor.z, d.traktor.r, { saat: d.saat, tank: d.tank, diesel: d.diesel, werkzeug: d.werkzeug });
    einsteigen(fahrzeuge[0]);
    return true;
  }
  hofSilo.inhalt = d.hofSilo || 0; siloSchild(hofSilo);
  if (d.wald) waldLaden(d.wald, d.holz);
  if (d.saege) { saegeSprit = d.saege.sprit ?? 100; getragen = d.saege.getragen || 0; }
  for (const f of d.fahrzeuge || []) if (FAHRZEUGE[f.typ]) neuesFahrzeug(f.typ, f.x, f.z, f.r, f);
  anhaengerLaden(d.anhaenger);
  if (!fahrzeuge.length) neuesFahrzeug('fendt', 0, 10, 0);
  if (d.aktiv >= 0 && fahrzeuge[d.aktiv]) einsteigen(fahrzeuge[d.aktiv]);
  else {
    player.position.set(d.spieler?.x ?? 3, 0, d.spieler?.z ?? 10); yaw = d.spieler?.yaw ?? 0;
    letztes = fahrzeuge[0];
  }
  return true;
}
function anhaengerLaden(liste) {
  for (const da of liste || []) {
    if (!ANHAENGER[da.typ]) continue;
    const a = neuerAnhaenger(da.typ, da.x, da.z, da.r, da);
    const fz = da.an ? fahrzeuge.find(f => f.id === da.an) : null;
    if (fz) { fz.anh = a; a.an = fz; }
  }
}
function neuesSpiel() {
  if (!confirm('Wirklich ein neues Spiel anfangen? Dein Bauernhof wird dann gelöscht!')) return;
  try { localStorage.removeItem(SPEICHER_NAME); } catch (e) { /* egal */ }
  location.reload();
}

// ===== Steuerung =====
function geraetWaehlen(art) {
  if (!aktiv || aktiv.werkzeug === art) return;
  if (!aktiv.typ.geraete.includes(art)) { meldung(`🌾 Der ${aktiv.typ.name} kann nur ernten!`); sound.nein(); return; }
  if (aktiv.anh && GERAETE[art].hinten) { meldung('🔗 Hinten hängt der Anhänger! Erst abkuppeln (H), dann geht der Pflug/die Sämaschine.'); sound.nein(); return; }
  aktiv.werkzeug = art;
  sound.klick();
  meldung(`${GERAETE[art].emoji} ${GERAETE[art].name} angebaut`, 1.5);
}
function buildMode() {
  building = !building;
  if (building && ansicht === 'ego') ansichtWechseln();   // Zum Bauen brauchst du die Maus
  if (!building && geist) geist.visible = false;
  updateHUD();
}
function ansichtWechseln() {
  ansicht = ansicht === 'ego' ? 'dritte' : 'ego';
  blickHoch = 0;
  if (ansicht === 'ego') {
    if (building) { building = false; if (geist) geist.visible = false; }
    try { renderer.domElement.requestPointerLock(); } catch (e) { /* egal */ }
    meldung('👁️ First Person! Maus = umschauen · Klick = Maus fangen · Esc = Maus frei · F = zurück', 3);
  } else if (document.pointerLockElement) document.exitPointerLock();
  updateHUD();
}
$('btn-bau').addEventListener('click', buildMode);
$('btn-neu').addEventListener('click', neuesSpiel);
$('btn-haendler').addEventListener('click', () => haendlerZeigen(true));
$('haendler-zu').addEventListener('click', () => haendlerZeigen(false));
for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).addEventListener('click', () => { bauArt = art; updateHUD(); });

document.addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  if (e.repeat) return;   // Gedrückt halten soll nicht ständig ein- und aussteigen

  if (k === 'e') {
    if (aktiv) aussteigen();
    else {
      const fz = naechstesFahrzeug();
      if (fz && fremdGefahren(fz)) { meldung('🚫 Da sitzt schon ein anderer Bauer drin!'); sound.nein(); }
      else if (fz) einsteigen(fz);
    }
  }
  if (k === 'b') buildMode();
  if (k === 'f') ansichtWechseln();
  if (k === 'r') rotation += Math.PI / 4;
  if (k === 'm') tonAn = !tonAn;
  if (k === 'v') verkaufen();
  if (k === 'g') saatKaufen();
  if (k === 't') tanken();
  if (k === 'l') einlagern();
  if (k === 'u') ausSiloHolen();
  if (k === 'k') feldKaufen();
  if (k === 'n') haendlerZeigen($('haendler').style.display !== 'block');
  if (k === 'h') kuppeln();
  if (k === 'q') saegeNehmen();
  if (k === 'o') ueberladen();
  if (k === 'escape') haendlerZeigen(false);
  if (['1', '2', '3'].includes(k)) {
    if (building) { bauArt = Object.keys(GEBAEUDE_ARTEN)[Number(k) - 1]; updateHUD(); }
    else if (aktiv) geraetWaehlen(Object.keys(GERAETE)[Number(k) - 1]);
  }
  updateHUD();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Maus: ziehen = Kamera drehen (First Person: Maus fangen und einfach bewegen), Mausrad = zoomen, Klick im Baumodus = bauen
let mouseDown = false, gezogen = 0;
const strahl = new THREE.Raycaster(), zeiger = new THREE.Vector2();
let mausPunkt = null;
renderer.domElement.addEventListener('mousedown', () => {
  mouseDown = true; gezogen = 0; tonStart();
  if (ansicht === 'ego' && !document.pointerLockElement) { try { renderer.domElement.requestPointerLock(); } catch (e) { /* egal */ } }
});
document.addEventListener('mouseup', () => { mouseDown = false; });
document.addEventListener('mousemove', e => {
  const gefangen = document.pointerLockElement === renderer.domElement;
  if (ansicht === 'ego' && (gefangen || mouseDown)) {
    if (aktiv) kamOffset -= e.movementX * 0.0025; else yaw -= e.movementX * 0.0025;
    blickHoch = begrenzt(blickHoch - e.movementY * 0.0025, -1.2, 1.0);
    return;
  }
  if (mouseDown) {
    gezogen += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (aktiv) kamOffset -= e.movementX * 0.004; else yaw -= e.movementX * 0.004;
    pitch = begrenzt(pitch + e.movementY * 0.003, -0.2, 0.9);
  }
  zeiger.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  strahl.setFromCamera(zeiger, camera);
  const hit = strahl.intersectObject(ground);
  mausPunkt = hit.length ? hit[0].point : null;
});
renderer.domElement.addEventListener('wheel', e => { zoom = begrenzt(zoom + e.deltaY * 0.001, 0.5, 2.5); e.preventDefault(); }, { passive: false });
renderer.domElement.addEventListener('click', () => {
  if (!building || gezogen > 6 || !mausPunkt) return;   // Nach Kamera-Drehen nicht aus Versehen bauen
  geistAktualisieren(mausPunkt);
  const A = GEBAEUDE_ARTEN[bauArt];
  if (!geistOk) { meldung(money < A.preis ? `💸 ${A.name} kostet ${euro(A.preis)}!` : '🚫 Hier kannst du nicht bauen (Feld, Weg oder zu nah an etwas).'); sound.nein(); return; }
  const bx = r2(mausPunkt.x), bz = r2(mausPunkt.z);   // Gerundet, damit es bei allen Spielern genau gleich steht
  gebaeudeHinzu(bauArt, bx, bz, rotation);
  mpEvent({ t: 'bau', art: bauArt, x: bx, z: bz, rot: rotation });
  money -= A.preis;
  sound.bauen();
  if (bauArt === 'silo') meldung('🛢️ Neues Silo! Fahr mit vollem Korntank hin und drück L zum Einlagern.', 3.5);
  updateHUD();
  speichern();
});

// ===== Fahren =====
const tmp = new THREE.Vector3();
function fahren(fz, dt) {
  const typ = fz.typ;
  // Ein voller Korntank macht träge (außer mit Allrad)
  const last = typ.allrad ? 1 : 1 - 0.45 * kornDrin(fz) / kornPlatz(fz);
  // Höchsttempo: beim Arbeiten langsam, ohne Diesel nur noch Schritttempo, mit Turbo schneller!
  const turbo = typ.turbo && keys.shift && fz.diesel > 0 && !fz.arbeitet;
  let maxVor = fz.arbeitet ? GERAETE[fz.werkzeug].arbeitsTempo * typ.arbeit : typ.tempo * (turbo ? 1.4 : 1);
  if (fz.diesel <= 0) { maxVor = 1; meldungSelten('⛽ Der Diesel ist leer! Kriech zum Landhandel und tank mit T.'); }
  const gas = keys.w || keys.arrowup, rueck = keys.s || keys.arrowdown;
  if (gas && fz.speed >= 0) fz.speed = Math.min(fz.speed + BESCHLEUNIGUNG * last * (turbo ? 1.8 : 1) * dt, maxVor);
  else if (rueck && fz.speed <= 0.1) fz.speed = Math.max(fz.speed - BESCHLEUNIGUNG * 0.6 * dt, -RUECKWAERTS_TEMPO);
  else if (gas || rueck) fz.speed *= Math.pow(0.02, dt);   // Gegen die Fahrtrichtung = Bremsen
  else fz.speed *= Math.pow(0.5, dt);   // Ausrollen
  if (fz.speed > maxVor) fz.speed = Math.max(maxVor, fz.speed - 6 * dt);   // Zu schnell fürs Feld? Langsam abbremsen
  if (keys[' ']) fz.speed *= Math.pow(0.002, dt);   // Bremsen
  // Diesel verbrauchen (mehr bei Vollgas, Turbo und beim Arbeiten; große Fahrzeuge brauchen mehr)
  fz.diesel = Math.max(0, fz.diesel - dt * typ.groesse * (0.03 + Math.abs(fz.speed) * 0.006 * (turbo ? 2 : 1) + (fz.arbeitet && Math.abs(fz.speed) > 0.5 ? 0.04 : 0)));
  // Lenken: Die Räder drehen sich ein, und das Fahrzeug fährt eine Kurve (im Stand dreht es sich nicht)
  const lenkZiel = ((keys.a || keys.arrowleft) ? 1 : 0) - ((keys.d || keys.arrowright) ? 1 : 0);
  fz.lenkWinkel += (lenkZiel * 0.55 - fz.lenkWinkel) * Math.min(1, dt * 6);
  fz.g.rotation.y += fz.speed * Math.tan(fz.lenkWinkel) / (fz.radstand * typ.groesse) * dt;
  const alt = fz.g.position.clone();
  fz.g.translateZ(-fz.speed * dt);
  // Nur blockieren, wenn wir NEU irgendwo reinfahren (steckt man schon fest, darf man raus fahren)
  if (kollidiert(fz.g.position.x, fz.g.position.z, fz.radius, fz) && !kollidiert(alt.x, alt.z, fz.radius, fz)) {
    fz.g.position.copy(alt);
    if (Math.abs(fz.speed) > 4) { sound.rumms(); meldungSelten('💥 Rumms!'); }
    fz.speed = -fz.speed * 0.3;
  }
  for (const r of fz.raeder) {
    r.rad.rotation.x -= fz.speed * dt / (r.r * typ.groesse);   // Räder drehen sich
    if (r.lenkt) r.lenker.rotation.y = fz.lenkWinkel * r.lenkt;
  }
  arbeiten(fz);
  // Reifenspuren auf dem Feld
  spurTakt -= Math.abs(fz.speed) * dt;
  if (spurTakt <= 0) {
    spurTakt = 0.25;
    for (const r of fz.raeder) { r.lenker.getWorldPosition(tmp); spurMalen(tmp.x, tmp.z); }
  }
  // Rauch aus dem Auspuff (mehr, wenn du Gas gibst – und beim Turbo richtig viel!)
  rauchTakt -= dt * (turbo ? 30 : gas ? 14 : 4);
  if (rauchTakt <= 0 && fz.diesel > 0) {
    rauchTakt = 1;
    fz.K.localToWorld(tmp.set(...fz.auspuff));
    staub(tmp.x, tmp.z, turbo ? 0x333333 : 0x555555, tmp.y, 0.8, 0.5 * typ.groesse);
  }
  // Staub hinter den Rädern auf dem Weg, wenn du schnell fährst
  if (Math.abs(fz.speed) > 7 && Math.random() < 0.3) {
    tmp.set(zufall(-1.2, 1.2), 0, 1.6 * typ.groesse).applyMatrix4(fz.g.matrixWorld);
    staub(tmp.x, tmp.z, 0xb8a37a, 0.3, 0.5, 1.2);
  }
}

// =====================================================================
// ===== Multiplayer (mit PeerJS – wie bei ARAG) =====
// =====================================================================
// Einer macht einen Raum auf (der Gastgeber). SEIN Hof wird gespielt, alle helfen zusammen und teilen das Geld.
// Die Gäste geben den Code ein. Jeder schickt 15-mal pro Sekunde, wo er ist und was er fährt.
// Änderungen (gepflügt, gekauft, gebaut ...) gehen über den Gastgeber an alle.
const MP_PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const MP_VORSILBE = 'farming-hof-';   // Damit sich die Codes nicht mit ARAG mischen
const MP_MAX = 4, MP_RATE = 15;
const MP_BAUERN = [
  { name: 'Bauer Rot', farbe: '#b3261e' },
  { name: 'Bauer Blau', farbe: '#2457a6' },
  { name: 'Bauer Grün', farbe: '#2f8f3a' },
  { name: 'Bauer Lila', farbe: '#7b3fa6' },
];
const mp = { aktiv: false, rolle: null, code: '', peer: null, conn: null, ich: 'lokal', nr: 0, andere: new Map(), takt: 0, geldBasis: null, felderTakt: 15, laeuft: false };
const r2 = v => Math.round(v * 100) / 100;
const siloSchluessel = s => `${s.x.toFixed(1)},${s.z.toFixed(1)}`;
function fremdGefahren(fz) { return !!fz.fahrer && fz.fahrer !== mp.ich && fz !== aktiv && spielZeit - fz.fahrerZeit < 2; }
function mpStatus(t) { $('mp-status').textContent = t; }
function mpUI() {
  const drin = mp.aktiv;
  for (const id of ['mp-erstellen', 'mp-code', 'mp-beitreten']) $(id).style.display = drin ? 'none' : '';
  if (drin) mpStatus(`🌐 Raum ${mp.code} · ${mp.andere.size + 1} Bauern · du: ${MP_BAUERN[mp.nr].name}${mp.rolle === 'host' ? ' (Gastgeber)' : ''}`);
}
function mpFehlerText(e) {
  if (e && (e.type === 'network' || e.type === 'server-error')) return 'Keine Verbindung zum Vermittlungs-Server (Internet?)';
  return (e && (e.type || e.message)) || 'unbekannter Fehler';
}
function mpLadePeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((ok, fehler) => {
    const sc = document.createElement('script');
    sc.src = MP_PEERJS; sc.onload = ok; sc.onerror = () => fehler(new Error('PeerJS nicht geladen'));
    document.head.appendChild(sc);
  });
}
function mpNeuerCode() {
  const z = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let k = 0; k < 4; k++) c += z[Math.floor(Math.random() * z.length)];
  return c;
}
function mpSendeAn(g, n) { try { if (g.conn && g.conn.open) g.conn.send(n); } catch (e) { /* egal */ } }
function mpAnAlle(n, ausser = null) { for (const g of mp.andere.values()) if (g !== ausser) mpSendeAn(g, n); }
function mpEvent(n) {   // Etwas an alle schicken (Gast: an den Gastgeber, der leitet es weiter)
  if (!mp.aktiv) return;
  if (mp.rolle === 'host') mpAnAlle(n);
  else try { if (mp.conn && mp.conn.open) mp.conn.send(n); } catch (e) { /* egal */ }
}
function mpZelle(f, i, j) { if (mp.aktiv) mpEvent({ t: 'zelle', f: f.nr, i, j, c: zellCode(f.zellen[j * f.nx + i]) }); }
function mpFzSenden(fz, fahrer) {
  mpEvent({ t: 'fz', id: fz.id, fa: fahrer, x: r2(fz.g.position.x), z: r2(fz.g.position.z), r: r2(fz.g.rotation.y), sp: r2(fz.speed), lw: r2(fz.lenkWinkel),
    wz: fz.werkzeug, ab: fz.arbeitet, di: Math.round(fz.diesel), ta: fz.tank, sa: fz.saat, an: fz.anh ? fz.anh.id : null, ai: fz.anh ? fz.anh.inhalt : 0 });
}
function mpSpielerNeu(id, nr) {
  const info = MP_BAUERN[nr] || MP_BAUERN[0];
  const o = { id, nr, ...info, x: 0, y: 0, z: 0, yaw: 0, fz: null, lf: false, farmer: baueFarmer(info.farbe) };
  o.schild = schild(`👨‍🌾 ${info.name}`, info.farbe, 3.2);
  o.schild.position.y = 2.75; o.farmer.g.add(o.schild);
  o.ax = o.ay = o.az = 0; o.ayaw = 0;
  scene.add(o.farmer.g);
  mp.andere.set(id, o);
  mpUI();
  return o;
}
function mpSpielerWeg(id, verbreiten) {
  const o = mp.andere.get(id);
  if (!o) return;
  if (o.farmer.g.parent) o.farmer.g.parent.remove(o.farmer.g);
  mp.andere.delete(id);
  if (verbreiten && mp.rolle === 'host') mpAnAlle({ t: 'weg', id });
  meldung(`👋 ${o.name} hat den Hof verlassen.`);
  mpUI();
}
function weltSchnappschuss() {
  return {
    t: 'welt', money, spielZeit, hofSilo: hofSilo.inhalt,
    felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(zellCode) })),
    gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot, inhalt: b.silo ? b.silo.inhalt : 0 })),
    fahrzeuge: fahrzeuge.map(f => ({ id: f.id, typ: f.typName, x: f.g.position.x, z: f.g.position.z, r: f.g.rotation.y, saat: f.saat, tank: f.tank, diesel: f.diesel,
      werkzeug: f.werkzeug, fahrer: f === aktiv ? mp.ich : f.fahrer })),
    spieler: [{ id: mp.ich, nr: mp.nr }, ...[...mp.andere.values()].map(o => ({ id: o.id, nr: o.nr }))],
    anhaenger: anhaenger.map(a => ({ id: a.id, typ: a.typName, x: a.g.position.x, z: a.g.position.z, r: a.g.rotation.y, inhalt: a.inhalt, an: a.an ? a.an.id : null })),
    wald: waldDaten(), holz: holzDaten(),
  };
}

// ----- Gastgeber -----
async function mpRaumErstellen(versuch = 0) {
  if (mp.peer && versuch === 0) return;
  mpStatus('⏳ Raum wird erstellt ...');
  try { await mpLadePeerJS(); } catch (e) { mpStatus('❌ Multiplayer konnte nicht geladen werden (Internet?)'); return; }
  const code = mpNeuerCode();
  const peer = new window.Peer(MP_VORSILBE + code);
  mp.peer = peer;
  peer.on('open', id => {
    Object.assign(mp, { aktiv: true, rolle: 'host', code, ich: id, nr: 0, geldBasis: money });
    mpUI();
    meldung(`🌐 Dein Raum-Code: ${code} – sag ihn deinen Freunden!`, 8);
  });
  peer.on('connection', conn => mpNeuerGast(conn));
  peer.on('disconnected', () => { try { if (mp.peer === peer) peer.reconnect(); } catch (e) { /* egal */ } });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && versuch < 3) { peer.destroy(); mp.peer = null; mpRaumErstellen(versuch + 1); return; }
    if (!mp.aktiv) { peer.destroy(); mp.peer = null; mpStatus('❌ ' + mpFehlerText(e)); }
  });
}
function mpNeuerGast(conn) {
  conn.on('open', () => {
    const belegt = new Set([0, ...[...mp.andere.values()].map(g => g.nr)]);
    let nr = 1;
    while (belegt.has(nr)) nr++;
    if (nr >= MP_MAX) { conn.send({ t: 'voll' }); setTimeout(() => conn.close(), 500); return; }
    const g = mpSpielerNeu(conn.peer, nr);
    g.conn = conn;
    conn.send({ t: 'hallo', nr, code: mp.code });
    conn.send(weltSchnappschuss());
    meldung(`👋 ${g.name} ist auf deinem Hof!`, 3);
    sound.kaufen();
  });
  conn.on('data', d => { const g = mp.andere.get(conn.peer); if (g) mpEmpfangen(d, g); });
  conn.on('close', () => mpSpielerWeg(conn.peer, true));
  conn.on('error', () => mpSpielerWeg(conn.peer, true));
}

// ----- Gast -----
async function mpBeitreten() {
  const code = $('mp-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { mpStatus('Der Code hat 4 Zeichen, z. B. K7PX'); return; }
  if (mp.peer) return;
  mpStatus('⏳ Verbinde ...');
  try { await mpLadePeerJS(); } catch (e) { mpStatus('❌ Multiplayer konnte nicht geladen werden (Internet?)'); return; }
  const peer = new window.Peer();
  mp.peer = peer;
  peer.on('open', id => {
    mp.ich = id;
    const conn = peer.connect(MP_VORSILBE + code, { serialization: 'json', reliable: true });
    mp.conn = conn;
    conn.on('open', () => { Object.assign(mp, { aktiv: true, rolle: 'gast', code }); mpStatus('✅ Verbunden! Der Hof wird geladen ...'); });
    conn.on('data', d => mpEmpfangen(d, null));
    conn.on('close', () => { if (mp.conn === conn) mpVerbindungWeg('Die Verbindung zum Gastgeber ist weg.'); });
  });
  peer.on('error', e => {
    if (mp.peer !== peer) return;
    mpVerbindungWeg(e.type === 'peer-unavailable' ? 'Raum nicht gefunden – stimmt der Code?' : mpFehlerText(e));
  });
}
function mpVerbindungWeg(text) {
  const warGast = mp.rolle === 'gast' && mp.aktiv;
  try { if (mp.peer) mp.peer.destroy(); } catch (e) { /* egal */ }
  Object.assign(mp, { aktiv: false, peer: null, conn: null });
  mpStatus('❌ ' + text);
  for (const id of ['mp-erstellen', 'mp-code', 'mp-beitreten']) $(id).style.display = '';
  if (warGast) {   // Zurück auf den eigenen Hof (Seite neu laden – dein Spielstand ist ja nicht verändert worden)
    meldung(`❌ ${text} Gleich bist du wieder auf deinem eigenen Hof ...`, 4);
    setTimeout(() => location.reload(), 3500);
  }
  mp.rolle = null;
}
function weltLaden(d) {   // Der Gast bekommt den Hof vom Gastgeber
  if (aktiv) aussteigen();
  for (const fz of fahrzeuge) scene.remove(fz.g);
  fahrzeuge.length = 0; letztes = null;
  for (const a of anhaenger) scene.remove(a.g);
  anhaenger.length = 0;
  for (const b of gebaute) {
    scene.remove(b.mesh);
    const k = hindernisse.indexOf(b.h); if (k >= 0) hindernisse.splice(k, 1);
    if (b.silo) { scene.remove(b.silo.schild); silos.splice(silos.indexOf(b.silo), 1); }
  }
  gebaute.length = 0;
  money = d.money; mp.geldBasis = money; spielZeit = d.spielZeit;
  hofSilo.inhalt = d.hofSilo; hofSilo.basis = d.hofSilo; siloSchild(hofSilo);
  d.felder.forEach((df, k) => {
    const f = felder[k];
    if (!f || df.c.length !== f.zellen.length) return;
    f.gekauft = df.g;
    df.c.forEach((code, n) => { f.zellen[n] = zelleAusCode(code); });
    malFeld(f);
  });
  for (const b of d.gebaeude) gebaeudeHinzu(b.art, b.x, b.z, b.rot, b.inhalt || 0);
  for (const f of d.fahrzeuge) {
    if (!FAHRZEUGE[f.typ]) continue;
    const fz = neuesFahrzeug(f.typ, f.x, f.z, f.r, f);
    fz.fahrer = f.fahrer; fz.fahrerZeit = spielZeit;
  }
  anhaengerLaden(d.anhaenger);
  if (d.wald) waldLaden(d.wald, d.holz);
  letztes = fahrzeuge[0] || null;
  player.position.set(4 + mp.nr * 2, 0, 15); yaw = 0;
  for (const sp of d.spieler) if (sp.id !== mp.ich && !mp.andere.has(sp.id)) mpSpielerNeu(sp.id, sp.nr);
  mpUI();
  meldung(`🌐 Willkommen auf dem Hof! Du bist ${MP_BAUERN[mp.nr].name}. Das Geld gehört allen zusammen!`, 5);
}

// ----- Nachrichten empfangen -----
function mpEmpfangen(d, vonGast) {
  if (!d || !d.t) return;
  const host = mp.rolle === 'host';
  switch (d.t) {
    case 'hallo':
      mp.nr = d.nr;
      farmer.hemd.map = karoTextur(MP_BAUERN[d.nr].farbe); farmer.hemd.needsUpdate = true;   // Dein Hemd bekommt deine Farbe
      return;
    case 'voll': mpVerbindungWeg('Der Raum ist voll (höchstens 4 Bauern).'); return;
    case 'welt': weltLaden(d); return;
    case 'weg': mpSpielerWeg(d.id, false); return;
    // Geld und Silos rechnet der Gastgeber: Gäste schicken nur, wie viel sich geändert hat
    case 'geldStand': money = d.m; mp.geldBasis = d.m; return;
    case 'geld': if (host) money += d.d; return;
    case 'siloStand': { const s = silos.find(x => siloSchluessel(x) === d.s); if (s) { s.inhalt = d.i; s.basis = d.i; siloSchild(s); } return; }
    case 'silo': if (host) { const s = silos.find(x => siloSchluessel(x) === d.s); if (s) { s.inhalt = begrenzt(s.inhalt + d.d, 0, SILO_MAX); siloSchild(s); } } return;
    case 'felder':   // Alle 15 Sekunden: Felder abgleichen (falls etwas verloren ging)
      d.felder.forEach((codes, k) => {
        const f = felder[k];
        if (!f) return;
        codes.forEach((code, n) => {
          const c = f.zellen[n], neu = zelleAusCode(code);
          if (c.z !== neu.z || Math.abs(c.w - neu.w) > 0.05) { f.zellen[n] = neu; malBoden(f, n % f.nx, Math.floor(n / f.nx)); }
        });
      });
      return;
    case 'sp': if (d.id !== mp.ich) { const o = mp.andere.get(d.id) || mpSpielerNeu(d.id, d.nr); Object.assign(o, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, fz: d.fz, lf: d.lf, sa: d.sa, sg: d.sg, ho: d.ho }); } break;
    case 'fz': {
      const fz = fahrzeuge.find(f => f.id === d.id);
      if (fz && fz !== aktiv) {
        fz.ziel = d; fz.fahrer = d.fa; fz.fahrerZeit = spielZeit;
        fz.werkzeug = fz.typ.geraete.includes(d.wz) ? d.wz : fz.werkzeug;
        fz.diesel = d.di; fz.tank = d.ta; fz.saat = d.sa;
        // Anhänger: an- oder abgekuppelt?
        if ((fz.anh ? fz.anh.id : null) !== (d.an || null)) {
          abkuppeln(fz);
          const a = d.an ? anhaenger.find(x => x.id === d.an) : null;
          if (a) ankuppeln(fz, a);
        }
        if (fz.anh) { fz.anh.inhalt = d.ai; fz.anh.basis = d.ai; }
      }
      break;
    }
    case 'zelle': { const f = felder[d.f]; if (f) { f.zellen[d.j * f.nx + d.i] = zelleAusCode(d.c); malBoden(f, d.i, d.j); } break; }
    case 'feld': { const f = felder[d.nr]; if (f && !f.gekauft) { f.gekauft = true; malFeld(f); meldung(`🎉 Feld ${d.nr + 1} wurde gekauft!`); } break; }
    case 'bau': gebaeudeHinzu(d.art, d.x, d.z, d.rot, 0); sound.bauen(); break;
    case 'korn': { const fz = fahrzeuge.find(x => x.id === d.id); if (fz) kornDazu(fz, d.m); break; }   // Der Mähdrescher hat übergeladen
    case 'neuerAnh': if (!anhaenger.some(a => a.id === d.id) && ANHAENGER[d.typ]) neuerAnhaenger(d.typ, d.x, d.z, d.r, { id: d.id }); break;
    case 'anh': {   // Ein abgestellter Anhänger hat jetzt anderen Inhalt (Mähdrescher hat übergeladen)
      const a = anhaenger.find(x => x.id === d.id);
      if (a && !a.an) { a.inhalt = d.i; a.basis = d.i; }
      break;
    }
    case 'faellt': { const b = baeume[d.nr]; if (b && (b.zustand === 'steht' || b.zustand === 'waechst')) baumFaellen(b, d.w, d.id, false); break; }
    case 'holzWeg': holzWeg(d.id); break;
    case 'neuesFz': if (!fahrzeuge.some(f => f.id === d.id) && FAHRZEUGE[d.typ]) { neuesFahrzeug(d.typ, d.x, d.z, d.r, { id: d.id }); meldung(`🚜 Neues Fahrzeug auf dem Hof: ${FAHRZEUGE[d.typ].name}!`); } break;
    default: return;
  }
  if (host && vonGast) mpAnAlle(d, vonGast);   // Der Gastgeber leitet es an die anderen Gäste weiter
}

// ----- Jeden Takt: eigene Sachen verschicken -----
function mpTick(dt) {
  if (!mp.aktiv) return;
  mp.takt -= dt;
  if (mp.takt > 0) return;
  mp.takt = 1 / MP_RATE;
  const host = mp.rolle === 'host';
  if (!host && !weltDa()) return;
  // Geld: Gastgeber sagt allen den Stand, Gäste schicken ihre Änderung
  if (host) { if (money !== mp.geldBasis) { mp.geldBasis = money; mpAnAlle({ t: 'geldStand', m: money }); } }
  else if (mp.geldBasis !== null && money !== mp.geldBasis) { mpEvent({ t: 'geld', d: money - mp.geldBasis }); mp.geldBasis = money; }
  for (const s of silos) {
    if (s.inhalt === s.basis) continue;
    if (host) mpAnAlle({ t: 'siloStand', s: siloSchluessel(s), i: s.inhalt });
    else mpEvent({ t: 'silo', s: siloSchluessel(s), d: s.inhalt - (s.basis || 0) });
    s.basis = s.inhalt;
  }
  for (const a of anhaenger) if (!a.an && a.inhalt !== a.basis) { a.basis = a.inhalt; mpEvent({ t: 'anh', id: a.id, i: a.inhalt }); }
  // Wo bin ich?
  mpEvent({ t: 'sp', id: mp.ich, nr: mp.nr, x: r2(player.position.x), y: r2(player.position.y), z: r2(player.position.z), yaw: r2(yaw), fz: aktiv ? aktiv.id : null, lf: mp.laeuft, sa: saegeAn, sg: saegt, ho: getragen });
  if (aktiv) mpFzSenden(aktiv, mp.ich);
  if (host) {
    mp.felderTakt -= 1 / MP_RATE;
    if (mp.felderTakt <= 0) { mp.felderTakt = 15; mpAnAlle({ t: 'felder', felder: felder.map(f => f.zellen.map(zellCode)) }); }
  }
}
const weltDa = () => mp.geldBasis !== null;
// Die anderen Bauern zeichnen (zu Fuß oder sitzend im Fahrzeug)
function mpAndereZeigen(dt) {
  for (const o of mp.andere.values()) {
    const G = o.farmer.g;
    const fzO = o.fz ? fahrzeuge.find(f => f.id === o.fz) : null;
    if (fzO) {
      if (G.parent !== fzO.K) {
        fzO.K.add(G);
        const gr = fzO.typ.groesse;
        G.position.set(fzO.sitz[0], fzO.sitz[1] - 1.65 / gr, fzO.sitz[2] + 0.05);
        G.rotation.set(0, 0, 0); G.scale.setScalar(1 / gr);
        o.schild.visible = false;
      }
      farmerPose(o.farmer.t, true, false, dt);
      farmerWerkzeug(o.farmer.t, false, false, 0);
      continue;
    }
    if (G.parent !== scene) { scene.add(G); G.scale.setScalar(1); o.ax = o.x; o.ay = o.y; o.az = o.z; o.ayaw = o.yaw; o.schild.visible = true; }
    const f = Math.min(1, dt * 12);
    o.ax += (o.x - o.ax) * f; o.ay += (o.y - o.ay) * f; o.az += (o.z - o.az) * f;
    let d = o.yaw - o.ayaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    o.ayaw += d * f;
    G.position.set(o.ax, o.ay, o.az);
    G.rotation.set(0, o.ayaw, 0);
    farmerPose(o.farmer.t, false, o.lf, dt, o.y > 0.05);
    farmerWerkzeug(o.farmer.t, !!o.sa, !!o.sg, o.ho || 0);
    if (o.sg && Math.random() < 0.4) staub(o.ax - Math.sin(o.ayaw) * 1.3, o.az - Math.cos(o.ayaw) * 1.3, 0xe8cf94, 0.8, 0.6, 0.35);   // Sägespäne
  }
}
$('mp-erstellen').addEventListener('click', () => { tonStart(); mpRaumErstellen(); });
$('mp-beitreten').addEventListener('click', () => { tonStart(); mpBeitreten(); });
$('mp-code').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { tonStart(); mpBeitreten(); } });
$('mp-code').addEventListener('keyup', e => e.stopPropagation());

// ===== Spielschleife =====
const clock = new THREE.Clock();
const kamPos = new THREE.Vector3(0, 8, 20);
camera.rotation.order = 'YXZ';
let hudTakt = 0, speicherTakt = 10;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  spielZeit += dt;

  if (aktiv) {
    fahren(aktiv, dt);
  } else {
    // Zu Fuß: "Vorne" ist da, wo du hinschaust
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const alt = player.position.clone();
    const tempo = LAUF_TEMPO * (keys.shift ? 1.6 : 1) * dt;
    if (keys.w || keys.arrowup) player.position.addScaledVector(forward, tempo);
    if (keys.s || keys.arrowdown) player.position.addScaledVector(forward, -tempo);
    if (keys.a || keys.arrowleft) player.position.addScaledVector(right, -tempo);
    if (keys.d || keys.arrowright) player.position.addScaledVector(right, tempo);
    if (kollidiert(player.position.x, player.position.z, 0.4)) player.position.copy(alt);
    player.rotation.y = yaw;
    // Hüpfen mit der Leertaste
    if (keys[' '] && amBoden) { spielerVy = SPRUNG_KRAFT; amBoden = false; sound.hupf(); }
    spielerVy -= SCHWERKRAFT * dt;
    player.position.y += spielerVy * dt;
    if (player.position.y <= 0) { player.position.y = 0; spielerVy = 0; amBoden = true; }
    mp.laeuft = Math.hypot(player.position.x - alt.x, player.position.z - alt.z) > 0.001;
    farmerPose(farmer, false, mp.laeuft, dt, !amBoden);
  }
  waldUpdate(dt);
  if (!aktiv) farmerWerkzeug(farmer, saegeAn, saegt, getragen);
  // Andere Fahrzeuge stehen still
  for (const fz of fahrzeuge) {
    const fremd = fremdGefahren(fz);
    if (fz !== aktiv && fz.ziel) {   // Ein anderer Spieler fährt (oder hat es geparkt): weich dorthin schieben
      const f = Math.min(1, dt * 10);
      fz.g.position.x += (fz.ziel.x - fz.g.position.x) * f;
      fz.g.position.z += (fz.ziel.z - fz.g.position.z) * f;
      let d = fz.ziel.r - fz.g.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      fz.g.rotation.y += d * f;
    }
    if (fz !== aktiv && fremd && fz.ziel) {
      fz.speed = fz.ziel.sp; fz.lenkWinkel = fz.ziel.lw; fz.arbeitet = fz.ziel.ab;
      for (const r of fz.raeder) { r.rad.rotation.x -= fz.speed * dt / (r.r * fz.typ.groesse); if (r.lenkt) r.lenker.rotation.y = fz.lenkWinkel * r.lenkt; }
    } else if (fz !== aktiv) { fz.speed = 0; fz.arbeitet = false; }
    for (const [art, m] of Object.entries(fz.geraete)) {
      m.visible = art === fz.werkzeug;
      m.position.y += ((fz.arbeitet ? 0 : 0.45) - m.position.y) * Math.min(1, dt * 5);   // Abgesenkt auf dem Feld, sonst angehoben
      if (m.userData.haspel && (fz === aktiv || fremd)) m.userData.haspel.rotation.x -= dt * (3 + Math.max(0, fz.speed) * 0.4);
    }
    fz.schild.visible = fz !== aktiv && !fremd;   // Namensschild nur bei geparkten Fahrzeugen
    if (fz.lenkrad) {   // Kabine lebendig machen
      const faehrt = fz === aktiv || fremd;
      fz.lenkrad.rotation.z = fz.lenkWinkel * 4;   // Lenkrad dreht sich mit
      fz.nadeln[0].rotation.z = 2.2 - Math.min(4.4, Math.abs(fz.speed) * 0.25);   // Tacho
      fz.nadeln[1].rotation.z = faehrt ? 1.6 - Math.min(3.2, 0.6 + Math.abs(fz.speed) * 0.15 + (fz.arbeitet ? 0.6 : 0)) + Math.sin(spielZeit * 30) * 0.03 : 2.2;   // Drehzahl (zittert ein bisschen)
      fz.rundumMat.emissiveIntensity = faehrt && fz.arbeitet ? (Math.sin(spielZeit * 12) > 0 ? 3 : 0.2) : 0.2;   // Rundumleuchte blinkt beim Arbeiten
      if (fz === aktiv) { fz.bildTakt = (fz.bildTakt || 0) - dt; if (fz.bildTakt <= 0) { fz.bildTakt = 0.25; malBildschirm(fz); } }
    }
  }
  player.visible = !(ansicht === 'ego');   // In First Person siehst du dich nicht selbst
  for (const a of anhaenger) {
    if (a.an) anhaengerFolgen(a);
    const voll = a.inhalt / a.typ.max;
    a.korn.visible = voll > 0.005;
    a.korn.scale.y = Math.max(0.01, voll * 1.15);
    a.korn.position.y = 1.15 + voll * 0.575;
    a.schild.visible = !a.an;
  }
  mpAndereZeigen(dt);
  mpTick(dt);
  wachsen(dt);
  staubUpdate(dt);
  windZeit.value = spielZeit;
  for (const w of wolken) { w.position.x += dt * 1.5; if (w.position.x > 260) w.position.x = -260; }   // Wolken ziehen vorbei
  geistAktualisieren(mausPunkt);

  // Hinweis unten in der Mitte
  const fn = feldInDerNaehe(), silo = nahesSilo(), wh = waldHinweis();
  if (building) zeigeHinweis(`🏗️ ${GEBAEUDE_ARTEN[bauArt].name} (${euro(GEBAEUDE_ARTEN[bauArt].preis)}) · Klick = bauen · R = drehen · 1/2/3 = anderes Gebäude · B = fertig`);
  else if (wh) zeigeHinweis(wh);
  else if (anHofTankstelle()) zeigeHinweis(`⛽ Hof-Tankstelle: T = Tanken (${Math.round(aktiv.diesel)} von ${aktiv.typ.dieselMax} Liter)`);
  else if (imLaden()) zeigeHinweis(`🏪 Landhandel: V = Korn verkaufen (${kg(kornDrin(aktiv))}) · G = Saat · T = Tanken · N = Fahrzeug-Händler`);
  else if (silo) zeigeHinweis(`🛢️ Silo (${kg(silo.inhalt)} drin): L = Korn einlagern · U = Korn holen`);
  else if (aktiv && aktiv.typ.art === 'drescher' && aktiv.tank > 0 && ueberladenZiel()) zeigeHinweis('🌾➡️🚛 O = Korn überladen');
  else if (aktiv && !aktiv.anh && aktiv.typ.art !== 'drescher' && naheAnhaengerZumKuppeln(aktiv)) zeigeHinweis('🔗 H = Anhänger ankuppeln');
  else if (fn) zeigeHinweis(`🌾 Feld ${fn.nr + 1} kaufen für ${euro(fn.preis)}? Drück K!`);
  else if (!aktiv && beimHaendler()) zeigeHinweis('🚜 N = Fahrzeug-Händler');
  else if (!aktiv) { const fz = naechstesFahrzeug(); zeigeHinweis(fz ? `${fz.typ.emoji} E drücken: in den ${fz.typ.name} einsteigen` : ''); }
  else zeigeHinweis('');

  // Meldung oben ausblenden
  if (meldungZeit > 0) { meldungZeit -= dt; if (meldungZeit <= 0) $('meldung').style.display = 'none'; }
  hudTakt -= dt;
  if (hudTakt <= 0) { hudTakt = 0.2; updateHUD(); }
  speicherTakt -= dt;
  if (speicherTakt <= 0) { speicherTakt = 10; speichern(); }

  // Motor-Brummen (jedes Fahrzeug klingt anders)
  if (motor) {
    const t = audio.currentTime, fz = aktiv;
    const gasGeben = !!fz && (keys.w || keys.arrowup || keys.s || keys.arrowdown);
    const an = !!fz && fz.diesel > 0;
    const drehzahl = fz ? (32 + Math.abs(fz.speed) * 4 + (gasGeben ? 10 : 0) + (fz.arbeitet && Math.abs(fz.speed) > 0.5 ? 6 : 0)) * fz.typ.motorTon : 30;
    motor.o.frequency.setTargetAtTime(an ? drehzahl : 0.01, t, 0.15);
    motor.o2.frequency.setTargetAtTime(an ? drehzahl * 0.5 : 0.01, t, 0.15);
    motor.g.gain.setTargetAtTime(an && tonAn ? (0.05 + (gasGeben ? 0.03 : 0)) * (ansicht === 'ego' ? 1.3 : 1) : 0, t, 0.2);
  }
  if (saegeTon) {   // Motorsäge: im Leerlauf blubbern, beim Sägen laut kreischen
    const t = audio.currentTime, an = saegeAn && !aktiv && saegeSprit > 0 && tonAn;
    const f = saegt ? 175 + Math.random() * 20 : 92 + Math.sin(spielZeit * 9) * 6;
    saegeTon.o.frequency.setTargetAtTime(f, t, 0.08);
    saegeTon.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    saegeTon.f.frequency.setTargetAtTime(saegt ? 1400 : 700, t, 0.1);
    saegeTon.g.gain.setTargetAtTime(an ? (saegt ? 0.09 : 0.03) : 0, t, 0.1);
  }

  // Kamera
  const target = aktiv ? aktiv.g.position : player.position;
  if (ansicht === 'ego') {
    // First Person: mit den Augen des Farmers (im Fahrzeug: aus der Kabine)
    if (aktiv) {
      aktiv.K.updateMatrixWorld();
      aktiv.K.localToWorld(tmp.set(aktiv.sitz[0], aktiv.sitz[1], aktiv.sitz[2]));
      camera.position.copy(tmp);
      camera.rotation.set(blickHoch, aktiv.g.rotation.y + kamOffset, 0);
    } else {
      camera.position.set(player.position.x, player.position.y + 1.68, player.position.z);
      camera.rotation.set(blickHoch, yaw, 0);
    }
    kamPos.copy(camera.position);
  } else {
    // Von hinten: weich hinterher fliegen
    if (!mouseDown && aktiv) kamOffset *= Math.pow(0.4, dt);   // Langsam wieder hinter das Fahrzeug drehen
    const angle = aktiv ? aktiv.g.rotation.y + kamOffset : yaw;
    const g = aktiv ? aktiv.typ.groesse * (aktiv.typ.art === 'drescher' ? 1.4 : 1) : 1;
    const distance = (aktiv ? 10 : 6) * zoom * g, height = (aktiv ? 5 : 3.2) * zoom * g;
    const ziel = new THREE.Vector3(target.x + Math.sin(angle) * distance, target.y + height + pitch * 3 * zoom, target.z + Math.cos(angle) * distance);
    if (inScheune(target.x, target.z)) {   // Drinnen: Kamera bleibt in der Scheune – oder schaut von draußen durchs Tor
      const S = SCHEUNE, mx = (S.x1 + S.x2) / 2;
      ziel.z = begrenzt(ziel.z, S.z1 - 6, S.z2 - 0.8);
      if (ziel.z < S.z1 + 0.5) {   // Vor dem Tor: nur so weit seitlich und so hoch, dass man durchs Tor schaut
        ziel.x = begrenzt(ziel.x, mx - S.torBreite / 2 + 0.7, mx + S.torBreite / 2 - 0.7);
        ziel.y = Math.min(ziel.y, S.torHoehe - 0.6);
      } else {
        ziel.x = begrenzt(ziel.x, S.x1 + 0.8, S.x2 - 0.8);
        ziel.y = Math.min(ziel.y, S.hoehe + 1.2);
      }
    }
    kamPos.lerp(ziel, 1 - Math.pow(0.002, dt));
    camera.position.copy(kamPos);
    camera.lookAt(target.x, target.y + 1.4, target.z);
  }
  // Die Sonne (und ihr Schatten) wandert mit dir mit
  sun.position.set(target.x + 30, 60, target.z + 20);
  sun.target.position.set(target.x, 0, target.z);
  egoSaegeUpdate(dt);
  himmel.position.copy(camera.position);   // Der Himmel ist immer gleich weit weg
  sonne.position.copy(camera.position).addScaledVector(SONNEN_RICHTUNG, 400);

  renderer.render(scene, camera);
}

// ===== Los geht's! =====
const geladen = laden();
if (!geladen) {
  einsteigen(neuesFahrzeug('fendt', 0, 10, 0, { werkzeug: 'ernte' }));
}
for (const f of felder) malFeld(f);
updateHUD();
meldung(geladen ? '💾 Willkommen zurück auf deinem Hof!' : '🌾 Feld 1 ist schon reif! Fahr hin und ernte es (Taste 3 = Erntevorsatz).', 5);
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener('beforeunload', speichern);
