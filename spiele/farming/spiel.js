// =====================================================================
// 🚜 Farming Game
// Pflügen -> Säen -> Wachsen lassen -> Ernten -> Verkaufen -> Felder und Gebäude kaufen
// =====================================================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

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
const TRAKTOR_TEMPO = 20;        // Höchstgeschwindigkeit vorwärts
const RUECKWAERTS_TEMPO = 8;     // Höchstgeschwindigkeit rückwärts
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
const GERAETE = {
  pflug: { name: 'Pflug', emoji: '🟫', taste: '1', breite: 3, hinten: true },
  saat: { name: 'Sämaschine', emoji: '🌱', taste: '2', breite: 3.5, hinten: true },
  ernte: { name: 'Erntevorsatz', emoji: '🌾', taste: '3', breite: 4.5, hinten: false },
};
// Was du im Baumodus bauen kannst (Taste 1, 2, 3)
const GEBAEUDE_ARTEN = {
  schuppen: { name: 'Schuppen', emoji: '🏠', preis: 10000, r: 5.5 },
  silo: { name: 'Silo', emoji: '🛢️', preis: 25000, r: 3 },
  baum: { name: 'Baum', emoji: '🌳', preis: 500, r: 1.5 },
};
const LADEN = { x: 60, z: 12, r: 8 };   // Der Landhandel: Hier verkaufst du Korn und kaufst Saat

// ===== Grundgerüst: Szene, Kamera, Licht =====
const HIMMEL = 0x87bce0;
const scene = new THREE.Scene();
scene.background = new THREE.Color(HIMMEL);
scene.fog = new THREE.Fog(HIMMEL, 90, 260);   // Nebel in der Ferne – sieht schöner aus und spart Rechenzeit

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // Nicht zu viele Pixel (sonst ruckelt es auf großen Bildschirmen)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x496b35, 1.6));
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
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat(0x39843b));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const wegMat = mat(0x9b8458);
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
const barn = kasten(scene, 25, 3.5, 25, 15, 7, 12, 0xa83225);
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
const kroneGeo = new THREE.SphereGeometry(2.1, 12, 10); kroneGeo.translate(0, 4, 0);
const staemme = new THREE.InstancedMesh(stammGeo, mat(0x694020), baumOrte.length);
const kronen = new THREE.InstancedMesh(kroneGeo, mat(0xffffff), baumOrte.length);   // Weiß, weil jeder Baum seine eigene Grün-Farbe bekommt
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
const PX = 8;   // So viele Pixel hat eine Zelle im Bild vom Feld
const FARBEN = { wiese: '#6f9a3c', stoppeln: '#c2ab6e', gepfluegt: '#4f331c', gesaet: '#6b4a2b' };
const erdeMat = mat(0x5e4024);
const pflanzenGeo = new THREE.ConeGeometry(0.55, 1, 5); pflanzenGeo.translate(0, 0.5, 0);
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
  f.pflanzen = new THREE.InstancedMesh(pflanzenGeo, mat(0xffffff), nx * nz * 4);
  f.pflanzen.castShadow = true; f.pflanzen.receiveShadow = true;
  f.pflanzen.frustumCulled = false;   // Sonst verschwinden sie manchmal, wenn sie größer werden
  scene.add(f.pflanzen);
  // Das erste Feld ist am Anfang schon reif – dann kannst du gleich ernten!
  for (let k = 0; k < nx * nz; k++) f.zellen.push(f.gekauft ? { z: 'gesaet', w: 1 } : { z: 'wiese', w: 0 });
  f.schild = schild('', '#fff', 9);
  f.schild.position.set(F.x, 3.5, f.z0 + nz * ZELLE + 2.5);
  scene.add(f.schild);
  return f;
});
function schildMalen(f) {
  if (f.gekauft) f.schild.userData.malen(`✅ Feld ${f.nr + 1}`, '#b9f5a0');
  else f.schild.userData.malen(`Feld ${f.nr + 1}: ${euro(f.preis)}`, '#ffd166');
}
const dummy = new THREE.Object3D(), gruen = new THREE.Color('#5aa531'), gold = new THREE.Color('#e3b341'), farbeTmp = new THREE.Color();
function malZelle(f, i, j) {
  const c = f.zellen[j * f.nx + i], g = f.g, x = i * PX, y = j * PX;
  g.fillStyle = FARBEN[c.z];
  g.fillRect(x, y, PX, PX);
  if (c.z === 'gepfluegt' || c.z === 'gesaet') { g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 1; k < PX; k += 3) g.fillRect(x, y + k, PX, 1); }   // Furchen
  if (c.z === 'stoppeln') { g.fillStyle = 'rgba(120,90,40,0.5)'; for (let k = 0; k < PX; k += 2) g.fillRect(x + k, y + (k * 3) % PX, 1, 2); }
  f.tex.needsUpdate = true;
  // Die Pflanzen in dieser Zelle: Größe je nach Wachstum, grün -> gold, wenn reif
  const h = c.z === 'gesaet' ? 0.12 + Math.min(1, c.w) * 1.1 : 0;
  farbeTmp.copy(gruen).lerp(gold, c.w >= 1 ? 1 : c.w * 0.3);
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
  for (let j = 0; j < f.nz; j++) for (let i = 0; i < f.nx; i++) malZelle(f, i, j);
  schildMalen(f);
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
for (const x of [-1.25, 1.25]) {
  for (const z of [-1.15, 1.05]) {
    const r = z < 0 ? 0.55 : 0.78;   // Vorne kleine, hinten große Räder
    const rad = new THREE.Group(); rad.position.set(x, r, z); tractor.add(rad);
    const reifen = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.45, 20), mat(0x171717));
    reifen.rotation.z = Math.PI / 2; reifen.castShadow = true; rad.add(reifen);
    const felge = new THREE.Mesh(new THREE.BoxGeometry(0.47, r * 1.1, 0.18), mat(0xd9b400));   // Damit man sieht, wie es sich dreht
    rad.add(felge);
    raeder.push({ rad, r });
  }
}
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
let money = START_GELD, saat = SAAT_MAX, tank = 0, werkzeug = 'ernte';
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
    const o = audio.createOscillator(), f = audio.createBiquadFilter(), g = audio.createGain();
    o.type = 'sawtooth'; o.frequency.value = 35;
    f.type = 'lowpass'; f.frequency.value = 280;
    g.gain.value = 0;
    o.connect(f).connect(g).connect(audio.destination);
    o.start();
    motor = { o, g };
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
for (let k = 0; k < 80; k++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0, depthWrite: false }));
  s.visible = false; scene.add(s);
  staubTeile.push({ s, t: 0, v: new THREE.Vector3() });
}
let staubNr = 0;
function staub(x, z, farbe) {
  const p = staubTeile[staubNr++ % staubTeile.length];
  p.s.position.set(x + zufall(-0.5, 0.5), 0.5, z + zufall(-0.5, 0.5));
  p.s.material.color.set(farbe);
  p.v.set(zufall(-0.5, 0.5), zufall(0.8, 1.6), zufall(-0.5, 0.5));
  p.t = 1; p.s.visible = true;
}
function staubUpdate(dt) {
  for (const p of staubTeile) {
    if (p.t <= 0) continue;
    p.t -= dt;
    p.s.position.addScaledVector(p.v, dt);
    p.s.scale.setScalar(0.6 + (1 - p.t) * 1.6);
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
  const steigt = Math.cos(spielZeit / 45) > 0;
  $('preis').textContent = `${kornPreis().toFixed(2).replace('.', ',')} €/kg ${steigt ? '📈' : '📉'}`;
  $('bauleiste').style.display = building ? 'block' : 'none';
  for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).classList.toggle('aktiv', art === bauArt);
}

// ===== Arbeiten auf dem Feld =====
function arbeiten() {
  if (!driving || speed < 0.5) return;   // Nur beim Vorwärtsfahren
  const G = GERAETE[werkzeug];
  tractor.updateMatrixWorld();
  const mitte = new THREE.Vector3(0, 0, G.hinten ? 3.2 : -3.2).applyMatrix4(tractor.matrixWorld);
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
    if (c.z === 'wiese' || c.z === 'stoppeln') { c.z = 'gepfluegt'; c.w = 0; malZelle(f, i, j); staub(x, z, 0x6b4a2b); }
    else if (c.z === 'gesaet') meldungSelten('🌾 Hier wächst schon was! Erst ernten (Taste 3), dann pflügen.');
  } else if (werkzeug === 'saat') {
    if (c.z === 'gepfluegt') {
      if (saat < SAAT_PRO_ZELLE) { meldungSelten('🌱 Die Saat ist leer! Fahr zum Landhandel 🏪 und drück G.'); return; }
      saat -= SAAT_PRO_ZELLE; c.z = 'gesaet'; c.w = 0; malZelle(f, i, j);
    } else if (c.z === 'wiese' || c.z === 'stoppeln') meldungSelten('🟫 Erst pflügen (Taste 1), dann säen!');
  } else if (werkzeug === 'ernte') {
    if (c.z === 'gesaet' && c.w >= 1) {
      if (tank + ERTRAG_PRO_ZELLE > TANK_MAX) { meldungSelten('🚛 Der Korntank ist voll! Fahr zum Landhandel 🏪 und verkauf mit V.'); return; }
      tank += ERTRAG_PRO_ZELLE; c.z = 'stoppeln'; c.w = 0; malZelle(f, i, j); staub(x, z, 0xe3c46a);
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
      v: 1, money, saat, tank, werkzeug,
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
  money = d.money; saat = d.saat; tank = d.tank; werkzeug = GERAETE[d.werkzeug] ? d.werkzeug : 'pflug';
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
    if (keys.w || keys.arrowup) speed = Math.min(speed + 12 * dt, TRAKTOR_TEMPO);
    else if (keys.s || keys.arrowdown) speed = Math.max(speed - 12 * dt, -RUECKWAERTS_TEMPO);
    else speed *= Math.pow(0.3, dt);
    if (keys[' ']) speed *= Math.pow(0.001, dt);   // Bremsen
    // Lenken geht nur beim Fahren (wie bei einem echten Traktor). Rückwärts ist die Lenkung andersrum!
    const lenkKraft = Math.sign(speed) * Math.min(1, Math.abs(speed) / 3);
    if (keys.a || keys.arrowleft) tractor.rotation.y += 1.5 * dt * lenkKraft;
    if (keys.d || keys.arrowright) tractor.rotation.y -= 1.5 * dt * lenkKraft;
    const alt = tractor.position.clone();
    tractor.translateZ(-speed * dt);
    if (kollidiert(tractor.position.x, tractor.position.z, 1.8)) {
      tractor.position.copy(alt);
      if (Math.abs(speed) > 4) { sound.rumms(); meldungSelten('💥 Rumms!'); }
      speed = -speed * 0.3;
    }
    for (const r of raeder) r.rad.rotation.x -= speed * dt / r.r;   // Räder drehen sich
    arbeiten();
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
  }
  geraetMeshes.ernte.userData.haspel.rotation.x -= dt * (werkzeug === 'ernte' && driving ? 3 + Math.max(0, speed) * 0.4 : 0);
  for (const [art, m] of Object.entries(geraetMeshes)) m.visible = art === werkzeug;
  wachsen(dt);
  staubUpdate(dt);
  geistAktualisieren(mausPunkt);

  // Hinweis unten in der Mitte
  const fn = feldInDerNaehe();
  if (building) zeigeHinweis(`🏗️ ${GEBAEUDE_ARTEN[bauArt].name} (${euro(GEBAEUDE_ARTEN[bauArt].preis)}) · Klick = bauen · R = drehen · 1/2/3 = anderes Gebäude · B = fertig`);
  else if (imLaden() && driving) zeigeHinweis(`🏪 Landhandel: V = Korn verkaufen (${kg(tank)}) · G = Saat auffüllen`);
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
    motor.o.frequency.setTargetAtTime(driving ? 38 + Math.abs(speed) * 3.5 : 30, t, 0.1);
    motor.g.gain.setTargetAtTime(driving && tonAn ? 0.04 + Math.abs(speed) * 0.003 : 0, t, 0.2);
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
