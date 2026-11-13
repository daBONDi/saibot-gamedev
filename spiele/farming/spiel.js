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
const SAAT_PRO_ZELLE = 40;       // So viel Saat (kg) braucht ein Feld-Stück
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
weg(0, -8, 140, 5);      // Weg an den Feldern entlang
weg(0, 8, 5, 28);        // Weg zum Hof
weg(32, 12, 60, 5);      // Weg zum Landhandel

// ===== Hindernisse (damit man nicht durch Scheune und Bäume fährt) =====
const hindernisse = [];   // { x, z, r } = rund   oder   { x, z, hb, ht } = eckig (halbe Breite/Tiefe)
const fahrzeuge = [];     // Alle deine Fahrzeuge (die sind auch im Weg!)
function kollidiert(x, z, r, ignorier = null) {   // ignorier = das Fahrzeug, das gerade fährt (stößt nicht an sich selbst)
  if (Math.abs(x) > 190 || Math.abs(z) > 190) return true;   // Ende der Welt
  for (const h of hindernisse) {
    if (h.r !== undefined) { if (Math.hypot(x - h.x, z - h.z) < r + h.r) return true; }
    else if (Math.abs(x - h.x) < h.hb + r && Math.abs(z - h.z) < h.ht + r) return true;
  }
  for (const fz of fahrzeuge) if (fz !== ignorier && Math.hypot(x - fz.g.position.x, z - fz.g.position.z) < r + fz.radius) return true;
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
const barn = kasten(scene, 25, 3.5, 25, 15, 7, 12, new THREE.MeshStandardMaterial({ map: bretterTextur('#a83225'), roughness: 0.95 }));
const scheunenDach = kasten(scene, 25, 7, 25, 15.4, 8.5, 8.5, 0x5b2a22);
scheunenDach.rotation.x = Math.PI / 4;
kasten(scene, 25, 2.2, 18.95, 5, 4.4, 0.1, 0xf2e6c9);   // Tor
hindernisse.push({ x: 25, z: 25, hb: 7.5, ht: 6 });

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
  baumOrte.push([Math.cos(w) * r, Math.sin(w) * r]);
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
    if (feldBei(x, z, 1) || kollidiert(x, z, 1) || Math.abs(z + 8) < 3 || (Math.abs(x) < 3 && z > -8 && z < 22) || (Math.abs(z - 12) < 3 && x > 0 && x < 62)) continue;
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
function baueTraktor(typ, K) {
  const farbe = typ.farbe, dunkler = new THREE.Color(farbe).multiplyScalar(0.65).getHex();
  kasten(K, 0, 1, 0, 2.3, 1.1, 3.5, farbe);                       // Körper
  kasten(K, 0, 1.15, -1.55, 1.6, 0.9, 0.5, dunkler);              // Motorhaube vorne
  kasten(K, 0, 0.75, -2.0, 1.4, 0.5, 0.35, 0x333333);             // Frontgewicht
  kasten(K, 0, 1.15, -1.83, 1.3, 0.6, 0.06, 0x1a1a1a);            // Kühlergrill
  for (let k = 0; k < 5; k++) kasten(K, 0, 0.92 + k * 0.11, -1.87, 1.2, 0.03, 0.03, 0x666666, false);
  kasten(K, 0, 2.1, 0.45, 1.6, 0.12, 1.6, farbe);                 // Kabine: Boden ...
  kasten(K, 0, 3.0, 0.45, 1.7, 0.12, 1.7, dunkler);               // ... Dach
  for (const [x, z] of [[-0.75, -0.3], [0.75, -0.3], [-0.75, 1.2], [0.75, 1.2]]) kasten(K, x, 2.55, z, 0.1, 0.9, 0.1, 0x233e39);
  kasten(K, 0, 2.55, 0.45, 1.45, 0.85, 1.45, glasMat, false);     // Glas
  kasten(K, 0, 2.25, 0.85, 0.5, 0.12, 0.5, 0x222222, false);      // Sitz
  const lenkrad = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16), mat(0x111111));
  lenkrad.position.set(0, 2.55, 0.15); lenkrad.rotation.x = -1.0; K.add(lenkrad);
  kasten(K, 0.75, 2.2, -1.3, 0.12, 1.4, 0.12, 0x222222);          // Auspuff
  for (const x of [-0.6, 0.6]) kasten(K, x, 1.25, -1.82, 0.3, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);   // Lichter
  for (const x of [-0.95, 0.95]) kasten(K, x, 2.75, -0.45, 0.06, 0.25, 0.04, 0x111111, false);   // Spiegel
  const raeder = [];
  for (const x of [-1.2, 1.2]) {
    raeder.push(baueRad(K, x, 0.55, -1.15, 0.55, 0.4, 1));        // Vorne: klein, lenkt
    raeder.push(baueRad(K, x * 1.1, 0.78, 1.05, 0.78, 0.55, 0));  // Hinten: groß und breit
    kasten(K, x * 1.1, 1.61, 1.05, 0.7, 0.08, 1.25, farbe);       // Kotflügel
  }
  if (typ.turbo) {   // Flitzer: Spoiler und Rennstreifen
    kasten(K, 0, 3.15, 1.25, 1.9, 0.08, 0.35, 0x111111);
    kasten(K, 0, 1.56, -0.2, 0.4, 0.02, 3.4, 0xffffff, false);
  }
  if (typ.allrad) {   // Kraftprotz: Zusatz-Scheinwerfer auf dem Dach und Zwillingsräder
    for (const x of [-0.5, -0.2, 0.2, 0.5]) kasten(K, x, 3.12, -0.3, 0.18, 0.14, 0.1, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);
    for (const x of [-1.85, 1.85]) raeder.push(baueRad(K, x, 0.78, 1.05, 0.78, 0.45, 0));
  }
  return { raeder, auspuff: [0.75, 3.0, -1.3], sitz: [0, 2.85, 0.75], radstand: 2.3 };
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
// ===== Der Farmer =====
// =====================================================================
function karoTextur() {   // Kariertes Holzfäller-Hemd
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#b3261e'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(20,10,10,0.55)';
  for (let k = 0; k < 64; k += 16) { g.fillRect(k, 0, 6, 64); g.fillRect(0, k, 64, 6); }
  g.fillStyle = 'rgba(255,255,255,0.15)';
  for (let k = 8; k < 64; k += 16) { g.fillRect(k, 0, 1, 64); g.fillRect(0, k, 64, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
const player = new THREE.Group();
const farmer = {};
{
  const haut = mat(0xe8b896), jeans = mat(0x2f4f86), hemd = new THREE.MeshStandardMaterial({ map: karoTextur(), roughness: 0.9 });
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
}
player.visible = false;
scene.add(player);
let laufPhase = 0;
function farmerPose(sitzt, laeuft, dt) {
  if (sitzt) {
    farmer.beinL.rotation.x = farmer.beinR.rotation.x = Math.PI / 2;   // Beine nach vorne (sitzen)
    farmer.armL.rotation.x = farmer.armR.rotation.x = 0.9;             // Hände am Lenkrad
    return;
  }
  laufPhase = laeuft ? laufPhase + dt * 9 : laufPhase * Math.pow(0.001, dt);
  const s = Math.sin(laufPhase) * (laeuft ? 0.6 : 0);
  farmer.beinL.rotation.x = s; farmer.beinR.rotation.x = -s;
  farmer.armL.rotation.x = -s * 0.8; farmer.armR.rotation.x = s * 0.8;
}

// ===== Spielstand =====
let money = START_GELD;
let building = false, bauArt = 'schuppen';
let ansicht = 'dritte';   // 'dritte' = von hinten · 'ego' = First Person (mit den Augen des Farmers)
let rotation = 0, yaw = 0, pitch = 0.25, blickHoch = 0, zoom = 1, kamOffset = 0, spielZeit = 0;
let rauchTakt = 0, spurTakt = 0;
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
  const s = { x, z, inhalt, schild: schild('', '#fff', 7) };
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
  } catch (e) { audio = null; }
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
  $('mode').textContent = building ? '🏗️ Baumodus' : aktiv ? '🚜 Fahren' : '🚶 Zu Fuß';
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
    balken('tank', fz.tank, fz.typ.tankMax, kg(fz.tank));
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
    if (c.z === 'wiese' || c.z === 'stoppeln') { c.z = 'gepfluegt'; c.w = 0; malBoden(f, i, j); if (Math.random() < 0.5) staub(x, z, 0x6b4a2b); }
    else if (c.z === 'gesaet') meldungSelten('🌾 Hier wächst schon was! Erst ernten (Taste 3), dann pflügen.');
  } else if (fz.werkzeug === 'saat') {
    if (c.z === 'gepfluegt') {
      if (fz.saat < SAAT_PRO_ZELLE) { meldungSelten('🌱 Die Saat ist leer! Fahr zum Landhandel 🏪 und drück G.'); return; }
      fz.saat -= SAAT_PRO_ZELLE; c.z = 'gesaet'; c.w = 0; malBoden(f, i, j);
    } else if (c.z === 'wiese' || c.z === 'stoppeln') meldungSelten('🟫 Erst pflügen (Taste 1), dann säen!');
  } else if (fz.werkzeug === 'ernte') {
    if (c.z === 'gesaet' && c.w >= 1) {
      if (fz.tank + ERTRAG_PRO_ZELLE > fz.typ.tankMax) { meldungSelten('🚛 Der Korntank ist voll! Ab zum Silo 🛢️ (L) oder zum Landhandel 🏪 (V).'); return; }
      fz.tank += ERTRAG_PRO_ZELLE; c.z = 'stoppeln'; c.w = 0; malBoden(f, i, j); staub(x, z, 0xe3c46a);
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
  if (brauchtFahrzeug('Korn zu verkaufen')) return;
  if (!imLaden()) { meldung('🏪 Fahr auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  if (aktiv.tank <= 0) { meldung('Der Korntank ist leer. Ernte zuerst etwas – oder hol Korn aus dem Silo! 🌾'); sound.nein(); return; }
  const erloes = Math.round(aktiv.tank * kornPreis());
  money += erloes;
  meldung(`💶 ${kg(aktiv.tank)} Korn verkauft für ${euro(erloes)}!`, 3.5);
  aktiv.tank = 0;
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
function tanken() {
  if (brauchtFahrzeug('zu tanken')) return;
  if (!imLaden()) { meldung('⛽ Tanken kannst du beim Landhandel 🏪 (gelber Platz)!'); sound.nein(); return; }
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
  if (aktiv.tank <= 0) { meldung('Der Korntank ist leer!'); sound.nein(); return; }
  const menge = Math.min(aktiv.tank, SILO_MAX - s.inhalt);
  if (menge <= 0) { meldung('🛢️ Das Silo ist voll! Bau noch eins (Baumodus).'); sound.nein(); return; }
  aktiv.tank -= menge; s.inhalt += menge;
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
  const menge = Math.min(s.inhalt, aktiv.typ.tankMax - aktiv.tank);
  if (s.inhalt <= 0) { meldung('🛢️ Das Silo ist leer!'); sound.nein(); return; }
  if (menge <= 0) { meldung('Der Korntank ist schon voll!'); sound.nein(); return; }
  aktiv.tank += menge; s.inhalt -= menge;
  siloSchild(s);
  meldung(`🚜 ${kg(menge)} Korn aus dem Silo geholt. Ab zum Landhandel! 🏪`);
  sound.korn();
  speichern();
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
}
function fahrzeugKaufen(name) {
  const typ = FAHRZEUGE[name];
  if (money < typ.preis) return;
  // Einen freien Parkplatz neben dem Landhandel suchen
  for (let k = 0; k < 20; k++) {
    const x = k < 10 ? 32 + k * 6 : -12 - (k - 10) * 6, z = 1;   // Parkplätze am Weg (erst Richtung Landhandel, dann nach Westen)
    if (kollidiert(x, z, 3.2)) continue;
    money -= typ.preis;
    neuesFahrzeug(name, x, z, 0);
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
  farmerPose(true, false, 0);
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
  aktiv = null;
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
function speichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify({
      v: 2, money, hofSilo: hofSilo.inhalt,
      fahrzeuge: fahrzeuge.map(f => ({ typ: f.typName, x: f.g.position.x, z: f.g.position.z, r: f.g.rotation.y, saat: f.saat, tank: f.tank, diesel: f.diesel, werkzeug: f.werkzeug })),
      aktiv: fahrzeuge.indexOf(aktiv),
      spieler: { x: player.position.x, z: player.position.z, yaw },
      felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(c => ZUSTAND_KURZ[c.z] + (c.z === 'gesaet' ? Math.round(c.w * 100) : '')) })),
      gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot, inhalt: b.silo ? b.silo.inhalt : 0 })),
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
  for (const f of d.fahrzeuge || []) if (FAHRZEUGE[f.typ]) neuesFahrzeug(f.typ, f.x, f.z, f.r, f);
  if (!fahrzeuge.length) neuesFahrzeug('fendt', 0, 10, 0);
  if (d.aktiv >= 0 && fahrzeuge[d.aktiv]) einsteigen(fahrzeuge[d.aktiv]);
  else {
    player.position.set(d.spieler?.x ?? 3, 0, d.spieler?.z ?? 10); yaw = d.spieler?.yaw ?? 0;
    letztes = fahrzeuge[0];
  }
  return true;
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
    else { const fz = naechstesFahrzeug(); if (fz) einsteigen(fz); }
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
  gebaeudeHinzu(bauArt, mausPunkt.x, mausPunkt.z, rotation);
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
  const last = typ.allrad ? 1 : 1 - 0.45 * fz.tank / typ.tankMax;
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
  if (kollidiert(fz.g.position.x, fz.g.position.z, fz.radius, fz)) {
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
    farmerPose(false, player.position.distanceTo(alt) > 0.001, dt);
  }
  // Andere Fahrzeuge stehen still
  for (const fz of fahrzeuge) {
    if (fz !== aktiv) { fz.speed = 0; fz.arbeitet = false; }
    for (const [art, m] of Object.entries(fz.geraete)) {
      m.visible = art === fz.werkzeug;
      m.position.y += ((fz.arbeitet ? 0 : 0.45) - m.position.y) * Math.min(1, dt * 5);   // Abgesenkt auf dem Feld, sonst angehoben
      if (m.userData.haspel && fz === aktiv) m.userData.haspel.rotation.x -= dt * (3 + Math.max(0, fz.speed) * 0.4);
    }
    fz.schild.visible = fz !== aktiv;   // Namensschild nur bei geparkten Fahrzeugen
  }
  player.visible = !(ansicht === 'ego');   // In First Person siehst du dich nicht selbst
  wachsen(dt);
  staubUpdate(dt);
  windZeit.value = spielZeit;
  for (const w of wolken) { w.position.x += dt * 1.5; if (w.position.x > 260) w.position.x = -260; }   // Wolken ziehen vorbei
  geistAktualisieren(mausPunkt);

  // Hinweis unten in der Mitte
  const fn = feldInDerNaehe(), silo = nahesSilo();
  if (building) zeigeHinweis(`🏗️ ${GEBAEUDE_ARTEN[bauArt].name} (${euro(GEBAEUDE_ARTEN[bauArt].preis)}) · Klick = bauen · R = drehen · 1/2/3 = anderes Gebäude · B = fertig`);
  else if (imLaden()) zeigeHinweis(`🏪 Landhandel: V = Korn verkaufen (${kg(aktiv.tank)}) · G = Saat · T = Tanken · N = Fahrzeug-Händler`);
  else if (silo) zeigeHinweis(`🛢️ Silo (${kg(silo.inhalt)} drin): L = Korn einlagern · U = Korn holen`);
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
      camera.position.set(player.position.x, 1.68, player.position.z);
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
    kamPos.lerp(ziel, 1 - Math.pow(0.002, dt));
    camera.position.copy(kamPos);
    camera.lookAt(target.x, target.y + 1.4, target.z);
  }
  // Die Sonne (und ihr Schatten) wandert mit dir mit
  sun.position.set(target.x + 30, 60, target.z + 20);
  sun.target.position.set(target.x, 0, target.z);
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
