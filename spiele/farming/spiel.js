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
function kollidiert(x, z, r) {
  if (Math.abs(x) > 190 || Math.abs(z) > 190) return true;   // Ende der Welt
  for (const h of hindernisse) {
    if (h.r !== undefined) { if (Math.hypot(x - h.x, z - h.z) < r + h.r) return true; }
    else if (Math.abs(x - h.x) < h.hb + r && Math.abs(z - h.z) < h.ht + r) return true;
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

// ===== Der Traktor =====
const tractor = new THREE.Group();
scene.add(tractor);
kasten(tractor, 0, 1, 0, 2.3, 1.1, 3.5, 0x16852c);               // Körper
kasten(tractor, 0, 1.15, -1.55, 1.6, 0.9, 0.5, 0x0f5e1f);         // Motorhaube vorne
kasten(tractor, 0, 0.75, -2.0, 1.4, 0.5, 0.35, 0x333333);         // Frontgewicht
kasten(tractor, 0, 2.1, 0.45, 1.6, 0.12, 1.6, 0x16852c);          // Kabine: Boden ...
kasten(tractor, 0, 3.0, 0.45, 1.7, 0.12, 1.7, 0x233e39);          // ... Dach
for (const [x, z] of [[-0.75, -0.3], [0.75, -0.3], [-0.75, 1.2], [0.75, 1.2]]) kasten(tractor, x, 2.55, z, 0.1, 0.9, 0.1, 0x233e39);   // Säulen
kasten(tractor, 0, 2.55, 0.45, 1.45, 0.85, 1.45, new THREE.MeshStandardMaterial({ color: 0x83c9df, transparent: true, opacity: 0.45, roughness: 0.1 }), false);   // Glas
kasten(tractor, 0.75, 2.2, -1.3, 0.12, 1.4, 0.12, 0x222222);      // Auspuff
for (const x of [-0.6, 0.6]) kasten(tractor, x, 1.25, -1.82, 0.3, 0.2, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), false);   // Lichter
const raeder = [];
const reifenMat = mat(0x1b1b1b, { roughness: 1 }), felgenMat = mat(0xd9b400, { metalness: 0.3, roughness: 0.5 });
for (const x of [-1.25, 1.25]) {
  for (const z of [-1.15, 1.05]) {
    const vorne = z < 0, r = vorne ? 0.55 : 0.78, b = vorne ? 0.4 : 0.55;   // Vorne kleine, hinten große, breite Räder
    const lenker = new THREE.Group(); lenker.position.set(x * (vorne ? 0.95 : 1.05), r, z); tractor.add(lenker);   // Dreht sich beim Lenken
    const rad = new THREE.Group(); lenker.add(rad);
    // Reifen mit Stollen-Profil (die Klötze außen herum)
    const teile = [new THREE.CylinderGeometry(r * 0.92, r * 0.92, b, 24)];
    const stollen = vorne ? 14 : 18;
    for (let k = 0; k < stollen; k++) {
      const w = k / stollen * Math.PI * 2;
      // Der Reifen liegt erst noch "aufrecht" (Achse = y), darum verteilen wir die Klötze rund um die y-Achse
      teile.push(new THREE.BoxGeometry(r * 0.12, b * 0.45, 0.12).translate(r * 0.95, ((k % 2) - 0.5) * b * 0.4, 0).rotateY(w));
    }
    const reifenGeo = mergeGeometries(teile);
    reifenGeo.rotateZ(Math.PI / 2);
    const reifen = new THREE.Mesh(reifenGeo, reifenMat);
    reifen.castShadow = true; rad.add(reifen);
    const felge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, b + 0.02, 16), felgenMat);
    felge.rotation.z = Math.PI / 2; rad.add(felge);
    const nabe = new THREE.Mesh(new THREE.BoxGeometry(b + 0.06, r * 0.3, r * 0.3), mat(0x555555));   // Damit man sieht, wie es sich dreht
    rad.add(nabe);
    raeder.push({ rad, lenker, r, vorne, x: lenker.position.x, z });
    if (!vorne) {   // Kotflügel über den großen Hinterrädern
      const kotfluegel = kasten(tractor, x * 1.05, r * 2 + 0.05, z, b + 0.15, 0.08, r * 1.6, 0x16852c);
      kotfluegel.castShadow = true;
    }
  }
}
kasten(tractor, 0, 1.15, -1.83, 1.3, 0.6, 0.06, 0x1a1a1a);   // Kühlergrill
for (let k = 0; k < 5; k++) kasten(tractor, 0, 0.92 + k * 0.11, -1.87, 1.2, 0.03, 0.03, 0x666666, false);
kasten(tractor, 0, 2.1, 1.35, 0.7, 0.25, 0.25, 0x222222);   // Trittstufe/Anhängung hinten
for (const x of [-0.95, 0.95]) kasten(tractor, x, 2.75, -0.45, 0.06, 0.25, 0.04, 0x111111, false);   // Spiegel
tractor.position.set(0, 0, 10);

// Anbaugeräte
function baueGeraet(art) {
  const g = new THREE.Group();
  if (art === 'pflug') {
    kasten(g, 0, 0.6, 0, 3, 0.2, 0.3, 0x8b1e1e);
    for (let k = 0; k < 4; k++) {
      const schar = kasten(g, -1.1 + k * 0.73, 0.3, 0.35 + k * 0.15, 0.12, 0.6, 0.7, 0xb0b0b0);
      schar.rotation.y = 0.5;
    }
    kasten(g, 0, 0.6, -0.8, 0.25, 0.2, 1.4, 0x8b1e1e);
    g.position.z = 3.0;
  } else if (art === 'saat') {
    kasten(g, 0, 1.0, 0.2, 3.4, 0.9, 1.0, 0x2457a6);    // Saat-Behälter
    kasten(g, 0, 0.35, 0.3, 3.5, 0.2, 0.3, 0x333333);
    for (let k = 0; k < 8; k++) kasten(g, -1.6 + k * 0.46, 0.2, 0.55, 0.06, 0.4, 0.06, 0xb0b0b0);
    kasten(g, 0, 0.6, -0.7, 0.25, 0.2, 1.2, 0x2457a6);
    g.position.z = 3.0;
  } else {
    kasten(g, 0, 0.5, 0, 4.5, 0.5, 1.0, 0xe0b000);      // Erntevorsatz vorne
    kasten(g, 0, 0.2, -0.45, 4.5, 0.1, 0.3, 0x777777);
    const haspel = new THREE.Group(); haspel.position.set(0, 1.0, -0.2); g.add(haspel);
    for (let k = 0; k < 5; k++) {
      const latte = kasten(haspel, 0, 0, 0, 4.4, 0.08, 0.08, 0xc23b22);
      latte.position.set(0, Math.sin(k / 5 * Math.PI * 2) * 0.45, Math.cos(k / 5 * Math.PI * 2) * 0.45);
    }
    g.userData.haspel = haspel;
    g.position.z = -2.9;
  }
  return g;
}
const geraetMeshes = {};
for (const art of Object.keys(GERAETE)) { geraetMeshes[art] = baueGeraet(art); tractor.add(geraetMeshes[art]); }

// ===== Du (zu Fuß) =====
const player = new THREE.Group();
kasten(player, -0.15, 0.45, 0, 0.22, 0.9, 0.25, 0x34495e);
kasten(player, 0.15, 0.45, 0, 0.22, 0.9, 0.25, 0x34495e);
kasten(player, 0, 1.25, 0, 0.6, 0.75, 0.35, 0x263caa);
kasten(player, 0, 1.8, 0, 0.35, 0.35, 0.35, 0xf0c9a0);
kasten(player, 0, 2.02, 0, 0.75, 0.06, 0.75, 0xe6c35c);   // Strohhut
kasten(player, 0, 2.12, 0, 0.4, 0.18, 0.4, 0xe6c35c);
scene.add(player);
player.visible = false;

// ===== Spielstand =====
let money = START_GELD, saat = SAAT_MAX, tank = 0, werkzeug = 'ernte', diesel = DIESEL_MAX;
let lenkWinkel = 0, arbeitet = false, rauchTakt = 0, spurTakt = 0;
let driving = true, building = false, bauArt = 'schuppen';
let speed = 0, rotation = 0, yaw = 0, pitch = 0.25, zoom = 1, kamOffset = 0, spielZeit = 0;
const keys = {};
const gebaute = [];   // Was du gebaut hast: { art, x, z, rot, mesh }

// ===== Gebäude bauen =====
function baueGebaeudeMesh(art) {
  const g = new THREE.Group();
  if (art === 'schuppen') {
    kasten(g, 0, 2.5, 0, 8, 5, 8, 0xaaaaaa);
    const dach = kasten(g, 0, 5, 0, 8.4, 5.9, 5.9, 0x6b3a2a);
    dach.rotation.x = Math.PI / 4;
    kasten(g, 0, 1.8, 4.01, 3, 3.6, 0.05, 0x7a5230);
  } else if (art === 'silo') {
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 10, 20), mat(0xc9ccd1, { metalness: 0.5, roughness: 0.4 }));
    rohr.position.y = 5; rohr.castShadow = true; g.add(rohr);
    const kuppel = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2, 20), mat(0x8a8f96));
    kuppel.position.y = 11; kuppel.castShadow = true; g.add(kuppel);
  } else {
    const stamm = new THREE.Mesh(stammGeo, mat(0x694020)); stamm.castShadow = true; g.add(stamm);
    const krone = new THREE.Mesh(kroneGeo, mat(0x1f7a30)); krone.castShadow = true; g.add(krone);
  }
  return g;
}
function gebaeudeHinzu(art, x, z, rot) {
  const mesh = baueGebaeudeMesh(art);
  mesh.position.set(x, 0, z); mesh.rotation.y = rot;
  scene.add(mesh);
  const h = { x, z, r: GEBAEUDE_ARTEN[art].r };
  hindernisse.push(h);
  gebaute.push({ art, x, z, rot, mesh, h });
}
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
  const aufFeld = feldBei(punkt.x, punkt.z, A.r);
  const imWeg = kollidiert(punkt.x, punkt.z, A.r) || Math.hypot(punkt.x - tractor.position.x, punkt.z - tractor.position.z) < A.r + 2 ||
    Math.hypot(punkt.x - LADEN.x, punkt.z - LADEN.z) < A.r + LADEN.r;
  geistOk = !aufFeld && !imWeg && money >= A.preis;
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
};

// ===== Staub-Wolken beim Arbeiten =====
const staubTeile = [];
const wolkenTextur = glanzTextur('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
for (let k = 0; k < 140; k++) {
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
function updateHUD() {
  $('money').textContent = money.toLocaleString('de-DE');
  $('mode').textContent = building ? '🏗️ Baumodus' : driving ? '🚜 Fahren' : '🚶 Zu Fuß';
  const G = GERAETE[werkzeug];
  $('geraet').textContent = `${G.emoji} ${G.name}`;
  $('saat').style.width = `${saat / SAAT_MAX * 100}%`;
  $('saatText').textContent = kg(saat);
  $('tank').style.width = `${tank / TANK_MAX * 100}%`;
  $('tankText').textContent = kg(tank);
  $('tempo').textContent = Math.round(Math.abs(speed) * 3.6);
  $('diesel').style.width = `${diesel / DIESEL_MAX * 100}%`;
  $('diesel').style.background = diesel < DIESEL_MAX * 0.15 ? '#ff6b6b' : '#5aa0e0';
  $('dieselText').textContent = `${Math.round(diesel)} Liter`;
  const steigt = Math.cos(spielZeit / 45) > 0;
  $('preis').textContent = `${kornPreis().toFixed(2).replace('.', ',')} €/kg ${steigt ? '📈' : '📉'}`;
  $('bauleiste').style.display = building ? 'block' : 'none';
  for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).classList.toggle('aktiv', art === bauArt);
}

// ===== Arbeiten auf dem Feld =====
function arbeiten() {
  const G = GERAETE[werkzeug];
  tractor.updateMatrixWorld();
  const mitte = new THREE.Vector3(0, 0, G.hinten ? 3.2 : -3.2).applyMatrix4(tractor.matrixWorld);
  // Ist das Gerät über einem eigenen Feld? Dann wird es abgesenkt (und du musst langsamer fahren)
  const f = feldBei(mitte.x, mitte.z);
  arbeitet = driving && !!f && f.gekauft;
  if (!driving || speed < 0.5) return;   // Nur beim Vorwärtsfahren
  const rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(tractor.quaternion);
  for (let o = -G.breite / 2 + 0.35; o <= G.breite / 2 - 0.35 + 0.001; o += 0.7) bearbeite(mitte.x + rechts.x * o, mitte.z + rechts.z * o);
}
function bearbeite(x, z) {
  const f = feldBei(x, z);
  if (!f) return;
  if (!f.gekauft) { meldungSelten(`🚫 Feld ${f.nr + 1} gehört dir noch nicht! Fahr zum Schild und drück K.`); return; }
  const i = Math.floor((x - f.x0) / ZELLE), j = Math.floor((z - f.z0) / ZELLE);
  if (i < 0 || j < 0 || i >= f.nx || j >= f.nz) return;
  const c = f.zellen[j * f.nx + i];
  if (werkzeug === 'pflug') {
    if (c.z === 'wiese' || c.z === 'stoppeln') { c.z = 'gepfluegt'; c.w = 0; malBoden(f, i, j); if (Math.random() < 0.5) staub(x, z, 0x6b4a2b); }
    else if (c.z === 'gesaet') meldungSelten('🌾 Hier wächst schon was! Erst ernten (Taste 3), dann pflügen.');
  } else if (werkzeug === 'saat') {
    if (c.z === 'gepfluegt') {
      if (saat < SAAT_PRO_ZELLE) { meldungSelten('🌱 Die Saat ist leer! Fahr zum Landhandel 🏪 und drück G.'); return; }
      saat -= SAAT_PRO_ZELLE; c.z = 'gesaet'; c.w = 0; malBoden(f, i, j);
    } else if (c.z === 'wiese' || c.z === 'stoppeln') meldungSelten('🟫 Erst pflügen (Taste 1), dann säen!');
  } else if (werkzeug === 'ernte') {
    if (c.z === 'gesaet' && c.w >= 1) {
      if (tank + ERTRAG_PRO_ZELLE > TANK_MAX) { meldungSelten('🚛 Der Korntank ist voll! Fahr zum Landhandel 🏪 und verkauf mit V.'); return; }
      tank += ERTRAG_PRO_ZELLE; c.z = 'stoppeln'; c.w = 0; malBoden(f, i, j); staub(x, z, 0xe3c46a);
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

// ===== Kaufen und Verkaufen =====
function imLaden() { return Math.hypot(tractor.position.x - LADEN.x, tractor.position.z - LADEN.z) < LADEN.r; }
function verkaufen() {
  if (!imLaden()) { meldung('🏪 Fahr mit dem Traktor auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  if (tank <= 0) { meldung('Der Korntank ist leer. Ernte zuerst etwas! 🌾'); sound.nein(); return; }
  const erloes = Math.round(tank * kornPreis());
  money += erloes;
  meldung(`💶 ${kg(tank)} Korn verkauft für ${euro(erloes)}!`, 3.5);
  tank = 0;
  sound.kasse();
  speichern();
}
function saatKaufen() {
  if (!imLaden()) { meldung('🏪 Fahr mit dem Traktor auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  const menge = SAAT_MAX - saat, kosten = Math.round(menge * SAAT_PREIS);
  if (menge <= 0) { meldung('🌱 Die Sämaschine ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld!'); sound.nein(); return; }
  money -= kosten; saat = SAAT_MAX;
  meldung(`🌱 ${kg(menge)} Saat gekauft für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function tanken() {
  if (!imLaden()) { meldung('⛽ Tanken kannst du beim Landhandel 🏪 (gelber Platz)!'); sound.nein(); return; }
  const menge = DIESEL_MAX - diesel, kosten = Math.round(menge * DIESEL_PREIS);
  if (menge < 1) { meldung('⛽ Der Tank ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld zum Tanken!'); sound.nein(); return; }
  money -= kosten; diesel = DIESEL_MAX;
  meldung(`⛽ ${Math.round(menge)} Liter Diesel getankt für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function feldInDerNaehe() {   // Ein Feld, das dir noch nicht gehört und neben dem du stehst
  const p = driving ? tractor.position : player.position;
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

// ===== Speichern (im Browser) =====
const ZUSTAND_KURZ = { wiese: 'w', stoppeln: 's', gepfluegt: 'p', gesaet: 'g' };
const ZUSTAND_LANG = { w: 'wiese', s: 'stoppeln', p: 'gepfluegt', g: 'gesaet' };
function speichern() {
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify({
      v: 1, money, saat, tank, werkzeug, diesel,
      traktor: { x: tractor.position.x, z: tractor.position.z, r: tractor.rotation.y },
      felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(c => ZUSTAND_KURZ[c.z] + (c.z === 'gesaet' ? Math.round(c.w * 100) : '')) })),
      gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot })),
    }));
  } catch (e) { /* egal – dann eben nicht gespeichert */ }
}
function laden() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SPEICHER_NAME)); } catch (e) { d = null; }
  if (!d || d.v !== 1) return false;
  money = d.money; saat = d.saat; tank = d.tank; diesel = d.diesel ?? DIESEL_MAX; werkzeug = GERAETE[d.werkzeug] ? d.werkzeug : 'pflug';
  tractor.position.set(d.traktor.x, 0, d.traktor.z); tractor.rotation.y = d.traktor.r;
  d.felder.forEach((df, k) => {
    const f = felder[k];
    if (!f || !df || df.c.length !== f.zellen.length) return;
    f.gekauft = df.g;
    df.c.forEach((code, n) => { f.zellen[n] = { z: ZUSTAND_LANG[code[0]] || 'wiese', w: code[0] === 'g' ? Number(code.slice(1)) / 100 : 0 }; });
  });
  for (const b of d.gebaeude || []) if (GEBAEUDE_ARTEN[b.art]) gebaeudeHinzu(b.art, b.x, b.z, b.rot);
  return true;
}
function neuesSpiel() {
  if (!confirm('Wirklich ein neues Spiel anfangen? Dein Bauernhof wird dann gelöscht!')) return;
  try { localStorage.removeItem(SPEICHER_NAME); } catch (e) { /* egal */ }
  location.reload();
}

// ===== Steuerung =====
function geraetWaehlen(art) {
  if (werkzeug === art) return;
  werkzeug = art;
  sound.klick();
  meldung(`${GERAETE[art].emoji} ${GERAETE[art].name} angebaut`, 1.5);
}
function buildMode() {
  building = !building;
  if (!building && geist) geist.visible = false;
  updateHUD();
}
$('btn-bau').addEventListener('click', buildMode);
$('btn-neu').addEventListener('click', neuesSpiel);
for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).addEventListener('click', () => { bauArt = art; updateHUD(); });

document.addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  if (e.repeat) return;   // Gedrückt halten soll nicht ständig ein- und aussteigen

  if (k === 'e') {
    if (driving) {
      driving = false; speed = 0;
      yaw = tractor.rotation.y;
      player.position.set(tractor.position.x + Math.cos(yaw) * 2.2, 0, tractor.position.z - Math.sin(yaw) * 2.2);
      player.visible = true;
    } else if (player.position.distanceTo(tractor.position) < 4) {
      driving = true; player.visible = false;
    }
  }
  if (k === 'b') buildMode();
  if (k === 'r') rotation += Math.PI / 4;
  if (k === 'm') tonAn = !tonAn;
  if (k === 'v') verkaufen();
  if (k === 'g') saatKaufen();
  if (k === 't') tanken();
  if (k === 'k') feldKaufen();
  if (['1', '2', '3'].includes(k)) {
    if (building) { bauArt = Object.keys(GEBAEUDE_ARTEN)[Number(k) - 1]; updateHUD(); }
    else if (driving) geraetWaehlen(Object.keys(GERAETE)[Number(k) - 1]);
  }
  updateHUD();
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Maus: gedrückt halten + ziehen = Kamera drehen, Mausrad = zoomen, Klick im Baumodus = bauen
let mouseDown = false, gezogen = 0;
const strahl = new THREE.Raycaster(), zeiger = new THREE.Vector2();
let mausPunkt = null;
renderer.domElement.addEventListener('mousedown', () => { mouseDown = true; gezogen = 0; tonStart(); });
document.addEventListener('mouseup', () => { mouseDown = false; });
document.addEventListener('mousemove', e => {
  if (mouseDown) {
    gezogen += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (driving) kamOffset -= e.movementX * 0.004; else yaw -= e.movementX * 0.004;
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
  updateHUD();
  speichern();
});

// ===== Spielschleife =====
const clock = new THREE.Clock();
const kamPos = new THREE.Vector3(0, 8, 20);
let hudTakt = 0, speicherTakt = 10;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  spielZeit += dt;

  if (driving) {
    // Ein voller Korntank macht den Traktor schwer und träge
    const last = 1 - 0.45 * tank / TANK_MAX;
    // Höchsttempo: beim Arbeiten langsam, ohne Diesel nur noch Schritttempo
    let maxVor = arbeitet ? GERAETE[werkzeug].arbeitsTempo : TRAKTOR_TEMPO;
    if (diesel <= 0) { maxVor = 1; meldungSelten('⛽ Der Diesel ist leer! Kriech zum Landhandel und tank mit T.'); }
    const gas = keys.w || keys.arrowup, rueck = keys.s || keys.arrowdown;
    if (gas && speed >= 0) speed = Math.min(speed + BESCHLEUNIGUNG * last * dt, maxVor);
    else if (rueck && speed <= 0.1) speed = Math.max(speed - BESCHLEUNIGUNG * 0.6 * dt, -RUECKWAERTS_TEMPO);
    else if (gas || rueck) speed *= Math.pow(0.02, dt);   // Gegen die Fahrtrichtung = Bremsen
    else speed *= Math.pow(0.5, dt);   // Ausrollen
    if (speed > maxVor) speed = Math.max(maxVor, speed - 6 * dt);   // Zu schnell fürs Feld? Langsam abbremsen
    if (keys[' ']) speed *= Math.pow(0.002, dt);   // Bremsen
    // Diesel verbrauchen (mehr bei Vollgas und beim Arbeiten)
    diesel = Math.max(0, diesel - dt * (0.03 + Math.abs(speed) * 0.006 + (arbeitet && Math.abs(speed) > 0.5 ? 0.04 : 0)));
    // Lenken: Die Vorderräder drehen sich ein, und der Traktor fährt eine Kurve (im Stand dreht er sich nicht)
    const lenkZiel = ((keys.a || keys.arrowleft) ? 1 : 0) - ((keys.d || keys.arrowright) ? 1 : 0);
    lenkWinkel += (lenkZiel * 0.55 - lenkWinkel) * Math.min(1, dt * 6);
    tractor.rotation.y += speed * Math.tan(lenkWinkel) / 2.3 * dt;   // 2,3 m = Abstand zwischen Vorder- und Hinterachse
    const alt = tractor.position.clone();
    tractor.translateZ(-speed * dt);
    if (kollidiert(tractor.position.x, tractor.position.z, 1.8)) {
      tractor.position.copy(alt);
      if (Math.abs(speed) > 4) { sound.rumms(); meldungSelten('💥 Rumms!'); }
      speed = -speed * 0.3;
    }
    for (const r of raeder) {
      r.rad.rotation.x -= speed * dt / r.r;   // Räder drehen sich
      if (r.vorne) r.lenker.rotation.y = lenkWinkel;
    }
    arbeiten();
    // Reifenspuren auf dem Feld
    spurTakt -= Math.abs(speed) * dt;
    if (spurTakt <= 0) {
      spurTakt = 0.25;
      for (const r of raeder) {
        const p = new THREE.Vector3(r.x, 0, r.z).applyMatrix4(tractor.matrixWorld);
        spurMalen(p.x, p.z);
      }
    }
    // Rauch aus dem Auspuff (mehr, wenn du Gas gibst)
    rauchTakt -= dt * (keys.w || keys.arrowup ? 14 : 4);
    if (rauchTakt <= 0 && diesel > 0) {
      rauchTakt = 1;
      const a = new THREE.Vector3(0.75, 3.0, -1.3).applyMatrix4(tractor.matrixWorld);
      staub(a.x, a.z, 0x555555, a.y, 0.8, 0.5);
    }
    // Staub hinter den Rädern auf dem Weg, wenn du schnell fährst
    if (Math.abs(speed) > 7 && Math.random() < 0.3) {
      const p = new THREE.Vector3(zufall(-1.2, 1.2), 0, 1.6).applyMatrix4(tractor.matrixWorld);
      staub(p.x, p.z, 0xb8a37a, 0.3, 0.5, 1.2);
    }
  } else {
    // "Vorne" ist weg von der Kamera
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const alt = player.position.clone();
    if (keys.w || keys.arrowup) player.position.addScaledVector(forward, LAUF_TEMPO * dt);
    if (keys.s || keys.arrowdown) player.position.addScaledVector(forward, -LAUF_TEMPO * dt);
    if (keys.a || keys.arrowleft) player.position.addScaledVector(right, -LAUF_TEMPO * dt);
    if (keys.d || keys.arrowright) player.position.addScaledVector(right, LAUF_TEMPO * dt);
    if (kollidiert(player.position.x, player.position.z, 0.4) || player.position.distanceTo(tractor.position) < 1.8) player.position.copy(alt);
    player.rotation.y = yaw;
    arbeitet = false;
  }
  geraetMeshes.ernte.userData.haspel.rotation.x -= dt * (werkzeug === 'ernte' && driving ? 3 + Math.max(0, speed) * 0.4 : 0);
  for (const [art, m] of Object.entries(geraetMeshes)) {
    m.visible = art === werkzeug;
    m.position.y += ((arbeitet ? 0 : 0.45) - m.position.y) * Math.min(1, dt * 5);   // Abgesenkt auf dem Feld, sonst angehoben
  }
  wachsen(dt);
  staubUpdate(dt);
  windZeit.value = spielZeit;
  for (const w of wolken) { w.position.x += dt * 1.5; if (w.position.x > 260) w.position.x = -260; }   // Wolken ziehen vorbei
  geistAktualisieren(mausPunkt);

  // Hinweis unten in der Mitte
  const fn = feldInDerNaehe();
  if (building) zeigeHinweis(`🏗️ ${GEBAEUDE_ARTEN[bauArt].name} (${euro(GEBAEUDE_ARTEN[bauArt].preis)}) · Klick = bauen · R = drehen · 1/2/3 = anderes Gebäude · B = fertig`);
  else if (imLaden() && driving) zeigeHinweis(`🏪 Landhandel: V = Korn verkaufen (${kg(tank)}) · G = Saat auffüllen · T = Tanken`);
  else if (fn) zeigeHinweis(`🌾 Feld ${fn.nr + 1} kaufen für ${euro(fn.preis)}? Drück K!`);
  else if (!driving && player.position.distanceTo(tractor.position) < 4) zeigeHinweis('🚜 E drücken zum Einsteigen');
  else zeigeHinweis('');

  // Meldung oben ausblenden
  if (meldungZeit > 0) { meldungZeit -= dt; if (meldungZeit <= 0) $('meldung').style.display = 'none'; }
  hudTakt -= dt;
  if (hudTakt <= 0) { hudTakt = 0.2; updateHUD(); }
  speicherTakt -= dt;
  if (speicherTakt <= 0) { speicherTakt = 10; speichern(); }

  // Motor-Brummen
  if (motor) {
    const t = audio.currentTime;
    const gasGeben = driving && (keys.w || keys.arrowup || keys.s || keys.arrowdown);
    const drehzahl = 32 + Math.abs(speed) * 4 + (gasGeben ? 10 : 0) + (arbeitet && Math.abs(speed) > 0.5 ? 6 : 0);
    motor.o.frequency.setTargetAtTime(driving && diesel > 0 ? drehzahl : 0.01, t, 0.15);
    motor.o2.frequency.setTargetAtTime(driving && diesel > 0 ? drehzahl * 0.5 : 0.01, t, 0.15);
    motor.g.gain.setTargetAtTime(driving && tonAn && diesel > 0 ? 0.05 + (gasGeben ? 0.03 : 0) : 0, t, 0.2);
  }

  // Kamera: weich hinterher fliegen (nicht ruckartig)
  if (!mouseDown && driving) kamOffset *= Math.pow(0.4, dt);   // Langsam wieder hinter den Traktor drehen
  const target = driving ? tractor.position : player.position;
  const angle = driving ? tractor.rotation.y + kamOffset : yaw;
  const distance = (driving ? 10 : 7) * zoom, height = (driving ? 5 : 4) * zoom;
  const ziel = new THREE.Vector3(target.x + Math.sin(angle) * distance, target.y + height + pitch * 3 * zoom, target.z + Math.cos(angle) * distance);
  kamPos.lerp(ziel, 1 - Math.pow(0.002, dt));
  camera.position.copy(kamPos);
  camera.lookAt(target.x, target.y + 1.2, target.z);
  // Die Sonne (und ihr Schatten) wandert mit dir mit
  sun.position.set(target.x + 30, 60, target.z + 20);
  sun.target.position.set(target.x, 0, target.z);
  himmel.position.copy(camera.position);   // Der Himmel ist immer gleich weit weg
  sonne.position.copy(camera.position).addScaledVector(SONNEN_RICHTUNG, 400);

  renderer.render(scene, camera);
}

// ===== Los geht's! =====
const geladen = laden();
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
