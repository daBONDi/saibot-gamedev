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
let WELT_B = 2400, WELT_H = 1400;     // Größe der Arena (bei Knockout ist sie größer, siehe GROSSE_KARTE)
const TEAM_GROESSE = 4;               // So viele Mechs pro Team
const MECH_RADIUS = 26;               // Wie dick ein Mech ist (zum Laufen)
const BOOST_TEMPO = 560;              // Wie schnell der Boost ist
const BOOST_DAUER = 0.25;             // Wie lange der Boost dauert (Sekunden)
const BOOST_AN = false;               // Boost an oder aus? (true = an, false = aus)
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
const KO_WUCHT = 230;                 // K.o.: So weit wird das Wrack weggeschleudert
const KO_HOCH = 520;                  // K.o.: So hoch fliegt das Wrack

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
  { id: 'blitz', name: 'Blitzschlag', emoji: '⚡', akzent: '#facc15', text: 'Superschnell, hält aber wenig aus.',
    leben: 80, tempo: 290, groesse: 0.85, boostPause: 1.2,
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
  { id: 'artillerie', name: 'Donnerhagel', emoji: '☄️', akzent: '#c084fc', text: 'Artillerie mit 2 Werfern an den Armen! Ziel anvisieren, dann regnen 10 Raketen runter. Hoch schauen = weiter!',
    leben: 95, tempo: 140, groesse: 1.15, boostPause: 3.5, keinBoost: true,   // keinBoost: kann nicht boosten
    // salve: Erst anvisieren (zielZeit), dann fliegen "anzahl" Raketen im Bogen und landen im Kreis (streuRadius) ums Ziel
    mg: { salve: true, pause: 5.5, zielZeit: 0.5, anzahl: 10, abstand: 0.1, schaden: 18, radius: 60, streuRadius: 110, tempo: 750, weite: 1100, minWeite: 180 },
    rakete: { pause: 5, schaden: 35, radius: 80, anzahl: 1 },
    sterne: { leben: 3, tempo: 2, schaden: 5, weite: 5 } },
];
let meinMech = MECH_TYPEN[0];   // Den Mech, den du ausgesucht hast
try { meinMech = MECH_TYPEN.find(t => t.id === localStorage.getItem('kaempfer-mech')) || meinMech; } catch (e) { /* egal */ }

const TEAMS = {
  blau: { name: 'Team Blau', farbe: '#3b82f6', dunkel: '#1e3a8a', hell: '#93c5fd' },
  rot:  { name: 'Team Rot',  farbe: '#ef4444', dunkel: '#7f1d1d', hell: '#fca5a5' },
};
// ===== Mech-Teile =====
// Jeder Mech besteht aus 6 Teilen, die man einzeln kaputt schießen kann!
// anteil: wie viel aushält im Vergleich zu "leben" vom Mech (1 = so viel wie leben)
// K.o. ist man, wenn die Mitte ODER das Visier ODER beide Beine kaputt sind.
const TEILE = {
  visier: { name: 'Visier',       anteil: 0.4 },
  mitte:  { name: 'Mitte',        anteil: 1.0 },
  armL:   { name: 'Linker Arm',   anteil: 0.5 },
  armR:   { name: 'Rechter Arm',  anteil: 0.5 },
  beinL:  { name: 'Linkes Bein',  anteil: 0.6 },
  beinR:  { name: 'Rechtes Bein', anteil: 0.6 },
};
// Eine Explosion trifft alle Teile ein bisschen (so viel vom Schaden bekommt jedes Teil)
const EXPLOSION_VERTEILUNG = { mitte: 0.6, visier: 0.15, armL: 0.3, armR: 0.3, beinL: 0.35, beinR: 0.35 };
const BEIN_AB_TEMPO = 0.55;   // Mit nur einem Bein humpelt man: so viel vom Tempo bleibt übrig
function neueTeile(typ) {
  const t = {};
  for (const [id, info] of Object.entries(TEILE)) t[id] = { hp: typ.leben * info.anteil, max: typ.leben * info.anteil };
  return t;
}
const hat = (m, teil) => m.teile[teil].hp > 0;   // Ist das Teil noch dran?
function teilAnteil(m, teil) { return Math.max(0, m.teile[teil].hp / m.teile[teil].max); }
// Wie gut geht es dem Mech? 1 = super, 0 = K.o. (zählt nur, was für K.o. wichtig ist)
function gesundheit(m) {
  return Math.min(teilAnteil(m, 'mitte'), teilAnteil(m, 'visier'), Math.max(teilAnteil(m, 'beinL'), teilAnteil(m, 'beinR')));
}
// Welches Teil trifft eine Kugel an der Stelle x, y in der Höhe h?
function trefferTeil(m, x, y, h) {
  const gr = m.typ.groesse, dx = x - m.x, dy = y - m.y, hoehe = (h - m.z) / gr;
  if (hoehe < 40) {   // Unten: die Beine (die zeigen in Laufrichtung)
    const seite = -Math.sin(m.laufWinkel) * dx + Math.cos(m.laufWinkel) * dy;
    return seite >= 0 ? 'beinR' : 'beinL';
  }
  // Oben: Arme an den Seiten, Visier vorne oben, sonst die Mitte (der Oberkörper zeigt in Zielrichtung)
  const seite = (-Math.sin(m.zielWinkel) * dx + Math.cos(m.zielWinkel) * dy) / gr;
  const vorne = (Math.cos(m.zielWinkel) * dx + Math.sin(m.zielWinkel) * dy) / gr;
  if (Math.abs(seite) > 13) return seite > 0 ? 'armR' : 'armL';
  if (hoehe > 62 && vorne > 0 && Math.abs(seite) < 9) return 'visier';
  return 'mitte';
}
// Wo ungefähr ist ein Teil? (für Funken und Trümmer)
function teilPos(m, teil) {
  const gr = m.typ.groesse;
  const w = teil.startsWith('bein') ? m.laufWinkel : m.zielWinkel;
  const seite = { armL: -22, armR: 22, beinL: -19, beinR: 19 }[teil] || 0;
  const h = { visier: 72, mitte: 60, armL: 56, armR: 56, beinL: 22, beinR: 22 }[teil];
  return { x: m.x - Math.sin(w) * seite * gr, y: m.y + Math.cos(w) * seite * gr, h: m.z + h * gr };
}

const NAMEN = { blau: ['DU', 'Blitz', 'Titan', 'Funke'], rot: ['Kralle', 'Donner', 'Rost', 'Viper'] };
const anderes = team => team === 'blau' ? 'rot' : 'blau';

// ===== Spielmodi =====
const MODI = [
  { id: 'punkt',        emoji: '🚩', name: 'Punkt halten', text: 'Erobere den Punkt in der Mitte und halte ihn! Wer zuerst 100 Punkte hat, gewinnt.' },
  { id: 'angriff',      emoji: '⚔️', name: 'Angriff',      text: 'Dein Team greift an: Erobere erst Punkt A, dann Punkt B, bevor die Zeit abläuft!' },
  { id: 'verteidigung', emoji: '🛡️', name: 'Verteidigung', text: 'Dein Team verteidigt: Halte die Angreifer von A und B fern, bis die Zeit abläuft!' },
  { id: 'team',         emoji: '💥', name: 'Team-Kampf',   text: 'Zerstöre die gegnerischen Mechs! Das erste Team mit 20 Abschüssen gewinnt.' },
  { id: 'knockout',     emoji: '🥊', name: 'Knockout',     text: 'Kein Neustart! Haut alle Gegner K.o., um die Runde zu gewinnen. Wer zuerst 2 Runden hat, siegt. Große Karte!' },
];
const KNOCKOUT_SIEGE = 2;     // Knockout: So viele Runden muss man gewinnen
const KNOCKOUT_ZEIT = 150;    // Knockout: So lange dauert eine Runde (Sekunden)
const GROSSE_KARTE = { b: 3600, h: 2000 };   // Knockout: So groß ist die Arena
const PUNKT_ZIEL = 100;       // Punkt halten: So viele Punkte zum Sieg
const ABSCHUSS_ZIEL = 20;     // Team-Kampf: So viele Abschüsse zum Sieg
const ANGRIFF_ZEIT = 150;     // Angriff: Startzeit in Sekunden
const ANGRIFF_BONUS = 90;     // Angriff: Extra-Zeit, wenn Punkt A erobert ist
const EROBERN_TEMPO = 4;      // Angriff: So schnell wird ein Punkt erobert (Prozent pro Sekunde)

// ===== Die Karten =====
// Jede Karte hat Blöcke. "links" sind die auf der linken Seite, die rechte Seite wird automatisch gespiegelt!
// Mit "auchUnten: true" gibt es den Block zusätzlich unten (oben/unten gespiegelt).
// "art" sagt, wie ein Block aussieht:
//   Fabrik: wand, kiste, plattform (zum Draufstehen), rampe, steg (Brücke), gelaender, saeule
//   Planet: fels, kristall, pilz, stein, huegel (zum Draufstehen), hang (Rampe)
// "oben" ist die Höhe der Oberkante, "unten" die Unterkante (bei Brücken kann man drunter durchlaufen!)
// "rampe" sagt, wo die hohe Seite einer Rampe ist: 'n' (oben), 's' (unten), 'w' (links), 'o' (rechts)
// Wichtig: Die Mitte (1200, 700) und die Punkte A und B (780 / 1620, 700) müssen frei bleiben!
const STUFE = 25;          // So hoch darf eine Stufe sein, die ein Mech einfach hochlaufen kann
const MECH_HOEHE = 70;     // So hoch ist ein normaler Mech
const KARTEN = [
  {
    id: 'fabrik', name: 'Stahlfabrik', emoji: '🏭',
    links: [
      { x: 320, y: 250, w: 40, h: 250, art: 'wand', auchUnten: true },
      { x: 430, y: 620, w: 120, h: 160, art: 'wand' },
      { x: 820, y: 400, w: 200, h: 50, art: 'wand', auchUnten: true },
      { x: 960, y: 600, w: 50, h: 200, art: 'wand' },
      { x: 1100, y: 560, w: 40, h: 40, art: 'kiste', auchUnten: true },
      // 1. Etage: Plattform mit Rampe und eine lange Brücke (Steg) zur anderen Seite
      { x: 580, y: 40, w: 280, h: 200, art: 'plattform', oben: 110, auchUnten: true },
      { x: 580, y: 240, w: 110, h: 240, art: 'rampe', rampe: 'n', oben: 110, auchUnten: true },
      { x: 860, y: 90, w: 340, h: 100, art: 'steg', unten: 100, oben: 110, auchUnten: true },
      { x: 860, y: 90, w: 340, h: 6, art: 'gelaender', unten: 110, oben: 140, auchUnten: true },
      { x: 860, y: 184, w: 340, h: 6, art: 'gelaender', unten: 110, oben: 140, auchUnten: true },
      { x: 930, y: 125, w: 30, h: 30, art: 'saeule', oben: 100, auchUnten: true },
      { x: 1110, y: 125, w: 30, h: 30, art: 'saeule', oben: 100, auchUnten: true },
    ],
    mitte: [{ x: 1170, y: 260, w: 60, h: 160, art: 'wand', auchUnten: true }],
    // Die große Version für Knockout (3600 x 2000, Mitte bei 1800 / 1000)
    grossLinks: [
      { x: 420, y: 300, w: 40, h: 300, art: 'wand', auchUnten: true },
      { x: 520, y: 860, w: 130, h: 280, art: 'wand' },
      { x: 700, y: 640, w: 50, h: 50, art: 'kiste', auchUnten: true },
      { x: 760, y: 700, w: 40, h: 40, art: 'kiste', auchUnten: true },
      { x: 740, y: 470, w: 220, h: 50, art: 'wand', auchUnten: true },
      { x: 1000, y: 880, w: 40, h: 40, art: 'kiste' },
      { x: 1040, y: 1080, w: 40, h: 40, art: 'kiste' },
      // 1. Etage: Plattform mit Rampe, und eine lange Brücke über die ganze Mitte
      { x: 1000, y: 60, w: 320, h: 220, art: 'plattform', oben: 110, auchUnten: true },
      { x: 1000, y: 280, w: 120, h: 240, art: 'rampe', rampe: 'n', oben: 110, auchUnten: true },
      { x: 1320, y: 120, w: 480, h: 100, art: 'steg', unten: 100, oben: 110, auchUnten: true },
      { x: 1320, y: 120, w: 480, h: 6, art: 'gelaender', unten: 110, oben: 140, auchUnten: true },
      { x: 1320, y: 214, w: 480, h: 6, art: 'gelaender', unten: 110, oben: 140, auchUnten: true },
      { x: 1450, y: 155, w: 30, h: 30, art: 'saeule', oben: 100, auchUnten: true },
      { x: 1650, y: 155, w: 30, h: 30, art: 'saeule', oben: 100, auchUnten: true },
      { x: 1260, y: 680, w: 60, h: 230, art: 'wand', auchUnten: true },
      { x: 1480, y: 560, w: 150, h: 40, art: 'wand', auchUnten: true },
      { x: 1500, y: 960, w: 40, h: 80, art: 'kiste' },
    ],
    grossMitte: [
      { x: 1760, y: 500, w: 80, h: 220, art: 'wand', auchUnten: true },
      { x: 1770, y: 970, w: 60, h: 60, art: 'kiste' },
    ],
  },
  {
    id: 'planet', name: 'Planet Xyloria', emoji: '🪐',
    links: [
      { x: 330, y: 300, w: 70, h: 160, art: 'fels', auchUnten: true },
      { x: 470, y: 640, w: 90, h: 120, art: 'fels' },
      { x: 990, y: 640, w: 40, h: 40, art: 'pilz' },
      { x: 1110, y: 590, w: 36, h: 36, art: 'stein', auchUnten: true },
      { x: 820, y: 330, w: 60, h: 60, art: 'kristall', auchUnten: true },
      { x: 980, y: 260, w: 70, h: 90, art: 'kristall', auchUnten: true },
      // Hügel zum Draufklettern, mit zwei Hängen
      { x: 640, y: 40, w: 260, h: 230, art: 'huegel', oben: 100, auchUnten: true },
      { x: 640, y: 270, w: 130, h: 230, art: 'hang', rampe: 'n', oben: 100, auchUnten: true },
      { x: 900, y: 40, w: 230, h: 150, art: 'hang', rampe: 'w', oben: 100, auchUnten: true },
    ],
    mitte: [{ x: 1160, y: 250, w: 80, h: 160, art: 'kristall', auchUnten: true }],
    // Die große Version für Knockout (3600 x 2000, Mitte bei 1800 / 1000)
    grossLinks: [
      { x: 420, y: 300, w: 90, h: 260, art: 'fels', auchUnten: true },
      { x: 520, y: 860, w: 120, h: 280, art: 'fels' },
      { x: 720, y: 680, w: 40, h: 40, art: 'stein', auchUnten: true },
      { x: 780, y: 740, w: 36, h: 36, art: 'stein', auchUnten: true },
      { x: 920, y: 460, w: 70, h: 70, art: 'kristall', auchUnten: true },
      { x: 1000, y: 900, w: 40, h: 40, art: 'pilz' },
      // Großer Hügel mit zwei Hängen
      { x: 1000, y: 60, w: 320, h: 240, art: 'huegel', oben: 100, auchUnten: true },
      { x: 1000, y: 300, w: 140, h: 240, art: 'hang', rampe: 'n', oben: 100, auchUnten: true },
      { x: 1320, y: 60, w: 220, h: 180, art: 'hang', rampe: 'w', oben: 100, auchUnten: true },
      { x: 1260, y: 680, w: 70, h: 200, art: 'kristall', auchUnten: true },
      { x: 1480, y: 560, w: 40, h: 40, art: 'pilz', auchUnten: true },
      { x: 1520, y: 940, w: 80, h: 120, art: 'fels' },
    ],
    grossMitte: [
      { x: 1760, y: 480, w: 80, h: 200, art: 'kristall', auchUnten: true },
      { x: 1780, y: 980, w: 40, h: 40, art: 'stein' },
    ],
  },
];
const STANDARD_HOEHE = { wand: 110, kiste: 40, fels: 100, kristall: 130, pilz: 150, stein: 40, saeule: 100 };
let karte = KARTEN[0];
try { karte = KARTEN.find(k => k.id === localStorage.getItem('kaempfer-karte')) || karte; } catch (e) { /* egal */ }
let WAENDE = [];
const GEGENUEBER = { n: 's', s: 'n', w: 'o', o: 'w' };
function spiegelX(r) { return { ...r, x: WELT_B - r.x - r.w, rampe: r.rampe && 'wo'.includes(r.rampe) ? GEGENUEBER[r.rampe] : r.rampe }; }
function spiegelY(r) { return { ...r, y: WELT_H - r.y - r.h, rampe: r.rampe && 'ns'.includes(r.rampe) ? GEGENUEBER[r.rampe] : r.rampe }; }
function waendeVon(k) {
  const liste = [];
  const dazu = r => {
    r = { unten: 0, oben: STANDARD_HOEHE[r.art] || 110, ...r };
    if (r.rampe) {   // Rampen werden für die Sicht in Stufen geteilt
      r.teile = [];
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = { unten: 0, oben: r.oben * (i + 1) / n };
        if (r.rampe === 'n') Object.assign(t, { x: r.x, w: r.w, y: r.y + r.h - (i + 1) * r.h / n, h: r.h / n });
        if (r.rampe === 's') Object.assign(t, { x: r.x, w: r.w, y: r.y + i * r.h / n, h: r.h / n });
        if (r.rampe === 'w') Object.assign(t, { y: r.y, h: r.h, x: r.x + r.w - (i + 1) * r.w / n, w: r.w / n });
        if (r.rampe === 'o') Object.assign(t, { y: r.y, h: r.h, x: r.x + i * r.w / n, w: r.w / n });
        r.teile.push(t);
      }
    }
    liste.push(r);
  };
  for (const r of k.mitte) { dazu(r); if (r.auchUnten) dazu(spiegelY(r)); }
  for (const r of k.links) {
    dazu(r); dazu(spiegelX(r));
    if (r.auchUnten) { dazu(spiegelY(r)); dazu(spiegelX(spiegelY(r))); }
  }
  return liste;
}

// ===== Höhen: Wie hoch ist ein Block an einer Stelle? =====
const innen = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
function obenBei(b, x, y) {
  if (!b.rampe) return b.oben;
  const px = Math.max(b.x, Math.min(b.x + b.w, x)), py = Math.max(b.y, Math.min(b.y + b.h, y));
  let t;
  if (b.rampe === 'n') t = (b.y + b.h - py) / b.h;
  else if (b.rampe === 's') t = (py - b.y) / b.h;
  else if (b.rampe === 'w') t = (b.x + b.w - px) / b.w;
  else t = (px - b.x) / b.w;
  return b.oben * t;
}
// Auf welcher Höhe steht man an (x, y), wenn man gerade auf Höhe z ist? (Man kann kleine Stufen hochlaufen)
function standHoehe(x, y, z) {
  let beste = 0;
  for (const b of WAENDE) {
    if (!innen(b, x, y)) continue;
    const t = obenBei(b, x, y);
    if (t <= z + STUFE && t > beste) beste = t;
  }
  return beste;
}
// Stört der Block einen Mech, der auf Höhe z steht und so hoch ist?
function blockiert(b, x, y, z, hoehe) {
  return obenBei(b, x, y) > z + STUFE && b.unten < z + hoehe;
}
// Ist an dieser Stelle (mit Höhe h) etwas Festes? (für Kugeln)
function imFesten(x, y, h) {
  if (h <= 0) return true;
  for (const b of WAENDE) if (b.art !== 'gelaender' && innen(b, x, y) && h >= b.unten && h <= obenBei(b, x, y)) return true;   // durchs Geländer kann man durchschießen
  return false;
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

// Trifft die Linie von a nach b (mit Höhe z) den Block? (Kästchen-Test in 3D)
function linieTrifft3D(a, b, r) {
  const d = [b.x - a.x, b.y - a.y, b.z - a.z];
  const start = [a.x, a.y, a.z], min = [r.x, r.y, r.unten], max = [r.x + r.w, r.y + r.h, r.oben];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (start[i] < min[i] || start[i] > max[i]) return false; continue; }
    let ta = (min[i] - start[i]) / d[i], tb = (max[i] - start[i]) / d[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
function sichtFrei3D(a, b) {
  for (const r of WAENDE) {
    if (r.art === 'gelaender') continue;   // durchs Geländer kann man durchschauen
    if (r.teile) { for (const t of r.teile) if (linieTrifft3D(a, b, t)) return false; }
    else if (linieTrifft3D(a, b, r)) return false;
  }
  return true;
}
const auge = m => ({ x: m.x, y: m.y, z: m.z + 55 * m.typ.groesse });
const sicht = (a, b) => sichtFrei3D(auge(a), auge(b));   // Kann Mech a Mech b sehen?

// ===== Wegfinden für die Bots (A*-Algorithmus) =====
// Die Arena wird in Kästchen aufgeteilt. In jedem Kästchen kann es mehrere "Knoten" geben:
// einen unten auf dem Boden und einen oben auf einer Plattform oder Brücke.
// Die Bots suchen den kürzesten Weg von Knoten zu Knoten (Rampen hoch, unter Brücken durch ...).
const ZELLE = 40;
let GX = WELT_B / ZELLE, GY = WELT_H / ZELLE;
const BOT_HOEHE = 95;   // So viel Platz nach oben braucht ein Mech (auch der große Koloss)
let knoten = [], zellenKnoten = [], nachbarn = [];
function platzFrei(x, y, z, radius) {
  if (x < MECH_RADIUS || y < MECH_RADIUS || x > WELT_B - MECH_RADIUS || y > WELT_H - MECH_RADIUS) return false;
  for (const b of WAENDE) {
    const cx = Math.max(b.x, Math.min(b.x + b.w, x)), cy = Math.max(b.y, Math.min(b.y + b.h, y));
    if ((x - cx) ** 2 + (y - cy) ** 2 < radius * radius && blockiert(b, cx, cy, z, BOT_HOEHE)) return false;
  }
  return true;
}
function baueGitter() {   // Muss bei jeder Karte neu gemacht werden
  GX = WELT_B / ZELLE; GY = WELT_H / ZELLE;
  knoten = []; zellenKnoten = []; nachbarn = [];
  for (let gy = 0; gy < GY; gy++) {
    for (let gx = 0; gx < GX; gx++) {
      const x = gx * ZELLE + ZELLE / 2, y = gy * ZELLE + ZELLE / 2;
      const liste = [];
      const hoehen = new Set([0]);
      for (const b of WAENDE) if (innen(b, x, y)) hoehen.add(Math.round(obenBei(b, x, y)));
      for (const z of hoehen) {
        if (Math.abs(standHoehe(x, y, z) - z) > 1) continue;   // Kann man da stehen?
        if (!platzFrei(x, y, z, MECH_RADIUS + 2)) continue;   // Ist genug Platz?
        liste.push(knoten.length);
        knoten.push({ x, y, z, gx, gy });
      }
      zellenKnoten.push(liste);
    }
  }
  const NACH = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  const passend = (gx, gy, z) => gx >= 0 && gy >= 0 && gx < GX && gy < GY && zellenKnoten[gy * GX + gx].some(n => Math.abs(knoten[n].z - z) <= STUFE);
  for (const k of knoten) {
    const liste = [];
    for (const [ox, oy, kosten] of NACH) {
      const nx = k.gx + ox, ny = k.gy + oy;
      if (nx < 0 || ny < 0 || nx >= GX || ny >= GY) continue;
      if (ox && oy && (!passend(k.gx + ox, k.gy, k.z) || !passend(k.gx, k.gy + oy, k.z))) continue;   // nicht um Ecken schneiden
      for (const n of zellenKnoten[ny * GX + nx]) if (Math.abs(knoten[n].z - k.z) <= STUFE) liste.push([n, kosten]);
    }
    nachbarn.push(liste);
  }
}
// Der Knoten, der am besten zu einer Stelle passt
function knotenBei(x, y, z = 0) {
  const gx = begrenzt(Math.floor(x / ZELLE), 0, GX - 1), gy = begrenzt(Math.floor(y / ZELLE), 0, GY - 1);
  let beste = -1, besteD = 1e9;
  for (let r = 0; r < 6; r++) {
    for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
      if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
      const nx = gx + ox, ny = gy + oy;
      if (nx < 0 || ny < 0 || nx >= GX || ny >= GY) continue;
      for (const n of zellenKnoten[ny * GX + nx]) {
        const k = knoten[n];
        const d = Math.hypot(k.x - x, k.y - y) + Math.abs(k.z - z) * 3;
        if (d < besteD) { besteD = d; beste = n; }
      }
    }
    if (beste >= 0) return beste;
  }
  return beste;
}
function wegFinden(von, nach) {
  const s = knotenBei(von.x, von.y, von.z || 0), z = knotenBei(nach.x, nach.y, nach.z || 0);
  if (s < 0 || z < 0) return [];
  const N = knoten.length;
  const g = new Float32Array(N).fill(1e9), f = new Float32Array(N).fill(1e9);
  const vor = new Int32Array(N).fill(-1), zu = new Uint8Array(N), istOffen = new Uint8Array(N);
  const ziel = knoten[z];
  const schaetzung = n => Math.hypot(knoten[n].x - ziel.x, knoten[n].y - ziel.y) / ZELLE;
  const offen = [s];
  g[s] = 0; f[s] = schaetzung(s); istOffen[s] = 1;
  while (offen.length) {
    let bi = 0;
    for (let i = 1; i < offen.length; i++) if (f[offen[i]] < f[offen[bi]]) bi = i;
    const c = offen[bi];
    offen[bi] = offen[offen.length - 1]; offen.pop(); istOffen[c] = 0;
    if (c === z) break;
    zu[c] = 1;
    for (const [n, kosten] of nachbarn[c]) {
      if (zu[n]) continue;
      const ng = g[c] + kosten;
      if (ng < g[n]) {
        g[n] = ng; f[n] = ng + schaetzung(n); vor[n] = c;
        if (!istOffen[n]) { offen.push(n); istOffen[n] = 1; }
      }
    }
  }
  if (z !== s && vor[z] < 0) return [];
  const weg = [];
  for (let c = z; c !== s && c >= 0; c = vor[c]) weg.push({ x: knoten[c].x, y: knoten[c].y, z: knoten[c].z });
  weg.reverse();
  return weg;
}
// Kann der Mech auf seiner Höhe geradeaus zu p laufen? (ohne Rampe, ohne runterzufallen, ohne Hindernis)
function kannDirekt(m, p) {
  if (Math.abs(p.z - m.z) > 8) return false;
  const d = dist(m, p), schritte = Math.ceil(d / 15);
  for (let i = 1; i <= schritte; i++) {
    const x = m.x + (p.x - m.x) * i / schritte, y = m.y + (p.y - m.y) * i / schritte;
    if (Math.abs(standHoehe(x, y, m.z) - m.z) > 8) return false;
    if (!platzFrei(x, y, m.z, MECH_RADIUS - 6)) return false;
  }
  return true;
}

// ===== Sound =====
// Echte Sound-Dateien liegen in assets/sounds/ (alle CC0, siehe LIZENZ.txt).
// Gibt es mehrere Dateien für einen Sound, wird jedes Mal zufällig eine ausgesucht – das klingt lebendiger!
// Klappt eine Datei nicht, spielt das Spiel einfach den alten selbst gebauten Piep-Sound.
const SOUND_DATEIEN = {
  mg:        ['mg_0.ogg', 'mg_1.ogg', 'mg_2.ogg', 'mg_3.ogg', 'mg_4.ogg'],
  boom:      ['boom_0.ogg', 'boom_1.ogg', 'boom_2.ogg', 'boom_3.ogg', 'boom_4.ogg'],
  boomGross: ['boom_gross.ogg'],
  treffer:   ['treffer_0.ogg', 'treffer_1.ogg', 'treffer_2.ogg', 'treffer_3.ogg', 'treffer_4.ogg'],
  railgun:   ['railgun.ogg'],
  rakete:    ['rakete.ogg'],
  boost:     ['boost.ogg'],
  abschuss:  ['abschuss.mp3'],
};
const soundPuffer = {};   // Hier landen die fertig geladenen Sounds
function soundsLaden() {
  for (const [name, dateien] of Object.entries(SOUND_DATEIEN)) {
    soundPuffer[name] = [];
    for (const datei of dateien) {
      fetch('assets/sounds/' + datei)
        .then(r => r.arrayBuffer())
        .then(daten => new Promise((ok, fehler) => audio.decodeAudioData(daten, ok, fehler)))
        .then(puffer => soundPuffer[name].push(puffer))
        .catch(() => { /* egal, dann kommt der Piep-Sound */ });
    }
  }
}
// Spielt eine Sound-Datei. tempo: 1 = normal, größer = höher und schneller. dauer: nach so vielen Sekunden ausblenden
function spiele(name, laut = 1, tempo = 1, dauer = 0) {
  try { return spieleSound(name, laut, tempo, dauer); }
  catch (e) { return true; }   // Wenn beim Sound was schiefgeht: einfach still sein, das Spiel läuft weiter
}
function spieleSound(name, laut, tempo, dauer) {
  const liste = soundPuffer[name];
  if (!audio || !liste || liste.length === 0) return false;   // noch nicht geladen -> Piep-Sound nehmen
  if (!tonAn || laut <= 0.001) return true;
  const q = audio.createBufferSource(), g = audio.createGain();
  q.buffer = liste[Math.floor(Math.random() * liste.length)];
  q.playbackRate.value = tempo;
  g.gain.value = laut;
  q.connect(g).connect(audio.destination);
  q.start();   // Wichtig: erst starten, dann darf man stop sagen – sonst gibt es einen Fehler!
  if (dauer > 0) {
    const t = audio.currentTime;
    g.gain.setValueAtTime(laut, t + dauer * 0.6);
    g.gain.linearRampToValueAtTime(0, t + dauer);
    q.stop(t + dauer + 0.05);
  }
  return true;
}
function zufallsTempo(von, bis) { return von + Math.random() * (bis - von); }

let audio = null, rauschPuffer = null, tonAn = true;
function tonStart() {
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      rauschPuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const d = rauschPuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      soundsLaden();
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
    if (spiele('mg', 0.35 * laut, zufallsTempo(0.9, 1.15))) return;
    ton(700, 0, 0.05, 'square', 0.035 * laut, 200);
    rauschen(0, 0.06, 0.08 * laut, 3000);
  },
  anvisieren() { [880, 1100, 1320].forEach((f, i) => ton(f, i * 0.12, 0.1, 'square', 0.07)); },
  warnung() { for (let i = 0; i < 3; i++) { ton(440, i * 0.25, 0.12, 'square', 0.09); ton(330, i * 0.25 + 0.12, 0.12, 'square', 0.09); } },
  salve(laut = 1) { if (spiele('rakete', 0.4 * laut, zufallsTempo(1.2, 1.4))) return; ton(260, 0, 0.25, 'sawtooth', 0.05 * laut, 900); rauschen(0, 0.2, 0.08 * laut, 3000); },
  pfeifen(laut = 1) { ton(1400, 0, 0.9, 'sine', 0.05 * laut, 500); },
  railgun(laut = 1) { if (spiele('railgun', 0.8 * laut, 0.8)) return; ton(1800, 0, 0.35, 'sawtooth', 0.08 * laut, 120); ton(3000, 0, 0.1, 'square', 0.04 * laut, 800); rauschen(0, 0.3, 0.15 * laut, 5000); },
  rakete(laut = 1) { if (spiele('rakete', 0.6 * laut, zufallsTempo(0.9, 1.1))) return; ton(180, 0, 0.45, 'sawtooth', 0.07 * laut, 700); rauschen(0, 0.4, 0.12 * laut, 2500); },
  boom(laut = 1) {
    if (spiele('boom', 0.9 * laut, zufallsTempo(0.8, 1.05))) { spiele('boomGross', 0.6 * laut, 0.9); return; }
    rauschen(0, 0.8, 0.45 * laut, 900); ton(90, 0, 0.6, 'sine', 0.35 * laut, 30); },
  treffer() { if (spiele('treffer', 0.25, zufallsTempo(1.3, 1.6))) return; ton(1600, 0, 0.04, 'square', 0.04); },
  autsch() { if (spiele('treffer', 0.5, zufallsTempo(0.6, 0.75))) return; ton(200, 0, 0.12, 'sawtooth', 0.08, 90); },
  abschuss() { if (spiele('abschuss', 0.5)) return; ton(880, 0, 0.08, 'square', 0.08); ton(1320, 0.08, 0.15, 'square', 0.08); },
  boost() { if (spiele('boost', 0.6, 1.2, 0.6)) return; ton(250, 0, 0.3, 'sawtooth', 0.06, 1000); rauschen(0, 0.25, 0.1, 4000); },
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
let runde = 1, rundePause = 0, zuschauen = null;   // Für Knockout
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
    x: 0, y: 0, z: 0, vz: 0, vx: 0, vy: 0, teile: neueTeile(typ), zielHoch: 0, tot: false, totZeit: 0, neustart: 0, schutz: 0,
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
  return { x, y: WELT_H / 2 + (m.nr - (TEAM_GROESSE - 1) / 2) * 85 };   // Nicht zu weit auseinander, sonst steht man hinter einer Wand
}
function spawnen(m) {
  const p = spawnPunkt(m);
  m.x = p.x; m.y = p.y; m.z = standHoehe(p.x, p.y, 0); m.vz = 0;
  m.teile = neueTeile(m.typ); m.tot = false; m.schutz = SCHUTZ_ZEIT; m.koGrund = null;
  m.zielWinkel = m.team === 'blau' ? 0 : Math.PI;
  m.laufWinkel = m.zielWinkel;
  m.weg = []; m.wegZeit = 0; m.gegner = null; m.boostZeit = 0; m.seitHit = 99;
  const a = Math.random() * Math.PI * 2;
  m.versatz = { x: Math.cos(a) * Math.random() * 0.6, y: Math.sin(a) * Math.random() * 0.6 };
  if (m.istSpieler) { blick.links = m.zielWinkel; blick.hoch = 0; }
}

function neuesSpiel(id) {
  modus = id;
  ladeKarte(karte, modus === 'knockout');   // Knockout hat eine große Karte
  // Alte 3D-Sachen aufräumen
  for (const m of mechs) if (m.g3) szene.remove(m.g3.gruppe);
  for (const s of schussMeshes) szene.remove(s.mesh);
  for (const p of explosionsKugeln) szene.remove(p.mesh);
  schussMeshes = []; explosionsKugeln = [];
  for (const t of truemmer) szene.remove(t.obj);
  truemmer = [];
  mechs = []; schuesse = []; partikel = []; killfeed = []; trefferRichtungen = [];
  nachricht = null; ende = null; pause = false; verlaengerung = false;
  punkte = { blau: 0, rot: 0 };
  ziele = []; aktivesZiel = 0;
  if (modus === 'punkt') {
    ziele = [{ x: 1200, y: 700, r: 140, name: '🚩', besitzer: null, wer: null, fortschritt: 0 }];
    restZeit = 300;
  } else if (modus === 'team') {
    restZeit = 300;
  } else if (modus === 'knockout') {
    restZeit = KNOCKOUT_ZEIT;
    runde = 1; rundePause = 0; zuschauen = null;
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
  if (!hat(m, 'beinL') || !hat(m, 'beinR')) tempo *= BEIN_AB_TEMPO;   // Humpeln mit einem Bein
  if (m.boostZeit > 0) {   // Boost: schnell in eine Richtung!
    dx = Math.cos(m.boostRichtung); dy = Math.sin(m.boostRichtung);
    tempo = BOOST_TEMPO;
    if (Math.random() < 0.8) partikel.push({ x: m.x - dx * 25, y: m.y - dy * 25, h: m.z + 30, vh: 20, vx: -dx * 60 + (Math.random() - 0.5) * 60, vy: -dy * 60 + (Math.random() - 0.5) * 60, t: 0.35, max: 0.35, farbe: zufall(['#ffd166', '#ff9f43', '#ffffff']) });
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
  hoeheAnpassen(m, dt);
  m.vx = (m.x - altX) / dt; m.vy = (m.y - altY) / dt;
}

// Rampe hoch? Runterfallen? Hier wird die Höhe vom Mech berechnet
function hoeheAnpassen(m, dt) {
  const boden = standHoehe(m.x, m.y, m.z);
  if (boden >= m.z) { m.z = boden; m.vz = 0; return; }   // Rampe hoch oder kleine Stufe
  m.vz -= 900 * dt;                                       // Fallen!
  m.z += m.vz * dt;
  if (m.z <= boden) {
    if (m.vz < -250) {   // Gelandet: RUMMS
      if (m.istSpieler) { wackeln = Math.max(wackeln, 6); sound.schritt(1.5); }
      else sound.schritt(lautBei(m));
    }
    m.z = boden; m.vz = 0;
  }
}

function kollision(m) {
  const hoehe = MECH_HOEHE * m.typ.groesse;
  for (const r of WAENDE) {
    const cx = begrenzt(m.x, r.x, r.x + r.w), cy = begrenzt(m.y, r.y, r.y + r.h);
    const dx = m.x - cx, dy = m.y - cy, d = Math.hypot(dx, dy);
    if (d >= MECH_RADIUS) continue;
    if (!blockiert(r, cx, cy, m.z, hoehe)) continue;   // Drüber (z. B. auf der Plattform) oder drunter (unter der Brücke)
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
      if (d > 0 && d < MECH_RADIUS * 2 && Math.abs(a.z - b.z) < MECH_HOEHE) {
        const p = (MECH_RADIUS * 2 - d) / 2;
        a.x -= dx / d * p; a.y -= dy / d * p;
        b.x += dx / d * p; b.y += dy / d * p;
        kollision(a); kollision(b);
      }
    }
  }
}

function boosten(m, richtung) {
  if (!BOOST_AN || m.boostPause > 0 || m.tot || m.typ.keinBoost) return;
  if (!hat(m, 'beinL') || !hat(m, 'beinR')) return;   // Mit einem Bein kann man nicht boosten
  m.boostZeit = BOOST_DAUER;
  m.boostPause = m.typ.boostPause;
  m.boostRichtung = richtung;
  if (m.istSpieler) sound.boost();
}

// ===== Waffen =====
function feuern(m) {
  if (m.mgPause > 0 || m.tot) return;
  const mg = m.typ.mg, gr = m.typ.groesse;
  const arme = (hat(m, 'armL') ? 1 : 0) + (hat(m, 'armR') ? 1 : 0);
  if (arme === 0) return;                          // Keine Arme mehr = keine Waffe mehr!
  if (mg.strahl && !hat(m, 'armR')) return;        // Die Railgun hängt am rechten Arm
  m.mgPause = mg.pause * (m.istSpieler || mg.salve ? 1 : BOT_FEUER_LANGSAMER);   // Der Raketenhagel lädt bei Bots nicht langsamer
  if (mg.salve) { if (!m.salve) salveStarten(m); return; }
  if (!mg.strahl) {
    m.lauf = -m.lauf;   // Abwechselnd links und rechts schießen (die Railgun hat nur ein Rohr)
    if (!hat(m, m.lauf > 0 ? 'armR' : 'armL')) m.lauf = -m.lauf;   // Arm ab? Dann mit dem anderen
    if (arme === 1) m.mgPause *= 2;                                 // Nur ein Gewehr = halb so schnell
  }
  const seite = mg.strahl ? 0.4 : m.lauf;
  const w = m.zielWinkel + (Math.random() - 0.5) * 2 * mg.streuung;
  const hoch = m.zielHoch + (Math.random() - 0.5) * 2 * mg.streuung * 0.5;   // nach oben oder unten zielen
  const cos = Math.cos(m.zielWinkel), sin = Math.sin(m.zielWinkel);
  const x = m.x + cos * 40 * gr - sin * 13 * gr * seite, y = m.y + sin * 40 * gr + cos * 13 * gr * seite;
  const h = m.z + (m.istSpieler ? AUGEN_HOEHE - 8 : 52) * gr;
  const flach = Math.cos(hoch) * mg.tempo;
  schuesse.push({ art: mg.strahl ? 'strahl' : 'kugel', x, y, h, vx: Math.cos(w) * flach, vy: Math.sin(w) * flach, vh: Math.sin(hoch) * mg.tempo, rest: mg.weite, schaden: mg.schaden, team: m.team, von: m });
  const laut = m.istSpieler ? 1 : lautBei(m) * 0.6;
  if (mg.strahl) sound.railgun(laut); else sound.mg(laut);
  if (m.istSpieler) { rueckstoss = mg.strahl ? 10 : 3; muendung = mg.strahl ? 0.1 : 0.05; }
  else partikel.push({ x, y, h, vh: 0, vx: 0, vy: 0, t: 0.05, max: 0.05, farbe: mg.strahl ? '#a7f3d0' : '#ffe08a' });   // Mündungsfeuer
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
  const arme = (hat(m, 'armL') ? 1 : 0) + (hat(m, 'armR') ? 1 : 0);   // Pro Arm ein Werfer = halbe Salve pro Arm
  m.salve = { ziel: landePunkt(m), warten: mg.zielZeit, rest: Math.round(mg.anzahl * arme / 2), timer: 0, laengste: 0, bemerkt: new Map() };
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
  // Abwechselnd aus dem linken und rechten Arm (wenn der noch dran ist)
  let seite = m.salve.rest % 2 ? 1 : -1;
  if (!hat(m, seite > 0 ? 'armR' : 'armL')) seite = -seite;
  const cos = Math.cos(m.zielWinkel), sin = Math.sin(m.zielWinkel);
  const x = m.x + cos * 14 * gr - sin * 25 * gr * seite, y = m.y + sin * 14 * gr + cos * 25 * gr * seite;
  const weite = Math.hypot(zx - x, zy - y);
  const dauer = 0.6 + weite / mg.tempo;
  const zh = standHoehe(zx, zy, 1e6);   // landet z. B. auf der Brücke, wenn sie drüber ist
  schuesse.push({
    art: 'salve', bogen: true, x, y, sx: x, sy: y, zx, zy, zh, h: m.z + 70 * gr, startH: m.z + 70 * gr,
    k: 0, dauer, scheitel: 220 + weite * 0.3,
    vx: 0, vy: 0, rest: 1e9, schaden: mg.schaden, radius: mg.radius, team: m.team, von: m,
  });
  m.salve.laengste = Math.max(m.salve.laengste, dauer + 0.1);
  partikel.push({ x, y, h: m.z + 70 * gr, vh: 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0.8, max: 0.8, farbe: '#999999', rauch: true });
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
    const flach = Math.cos(m.zielHoch) * RAKETE_TEMPO;
    schuesse.push({ art: 'rakete', x, y, h: m.z + 62 * m.typ.groesse, vx: Math.cos(w) * flach, vy: Math.sin(w) * flach, vh: Math.sin(m.zielHoch) * RAKETE_TEMPO, rest: RAKETE_WEITE, schaden: r.schaden, radius: r.radius, team: m.team, von: m });
  }
  sound.rakete(m.istSpieler ? 1 : lautBei(m));
  if (m.istSpieler) rueckstoss = 8;
}

function explosion(x, y, team, von, radius = 85, schadenMax = 40, h = 30) {
  const menge = Math.min(1, radius / 85);
  for (let i = 0; i < 30 * menge; i++) {
    const a = Math.random() * Math.PI * 2, v = 50 + Math.random() * 200;
    partikel.push({ x, y, h, vh: 50 + Math.random() * 250, g: 400, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.6, max: 0.6, farbe: zufall(['#ffd166', '#ff9f43', '#ff5e3a', '#ffffff']) });
  }
  for (let i = 0; i < 10 * menge; i++) {
    partikel.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, h: h - 10 + Math.random() * 30, vh: 30 + Math.random() * 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 1.4, max: 1.4, farbe: zufall(['#555555', '#444444', '#666666']), rauch: true });
  }
  partikel.push({ x, y, h: h + 10, vh: 0, vx: 0, vy: 0, t: 0.35, max: 0.35, kugel: radius, farbe: '#ffb347' });
  sound.boom(Math.max(0.15, lautBei({ x, y })) * menge);
  if (spieler && dist({ x, y }, spieler) < 400) wackeln = Math.max(wackeln, 8);
  if (team === null) return;
  for (const m of mechs) {
    if (m.tot || m.team === team) continue;
    const mitte = { x: m.x, y: m.y, z: m.z + 35 * m.typ.groesse };
    const d = Math.hypot(mitte.x - x, mitte.y - y, mitte.z - h);
    const groesse = radius + MECH_RADIUS * m.typ.groesse;
    if (d < groesse && sichtFrei3D({ x, y, z: h }, mitte)) {
      schaden(m, schadenMax * (1 - 0.5 * d / groesse), von, 'explosion');
    }
  }
}

function funken(x, y, h, farbe) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    partikel.push({ x, y, h, vh: Math.random() * 150, g: 500, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.3, max: 0.3, farbe });
  }
}

// teil: welches Teil getroffen wurde ('explosion' = alle ein bisschen)
function schaden(m, menge, von, teil = 'mitte') {
  if (m.tot || m.schutz > 0 || zustand !== 'spiel') return;
  if (teil === 'explosion') for (const [id, f] of Object.entries(EXPLOSION_VERTEILUNG)) teilSchaden(m, id, menge * f, von);
  else teilSchaden(m, teil, menge, von);
  m.blitz = 0.08;
  m.seitHit = 0;
  if (m.istSpieler) {
    wackeln = Math.max(wackeln, 4);
    sound.autsch();
    if (von) trefferRichtungen.push({ von: { x: von.x, y: von.y }, t: 1 });
  }
  if (von && von.istSpieler) { trefferAnzeige = 0.12; sound.treffer(); }
  // K.o.? Mitte kaputt, Visier kaputt oder beide Beine weg!
  if (!hat(m, 'mitte')) m.koGrund = 'Mitte zerstört';
  else if (!hat(m, 'visier')) m.koGrund = 'Visier zerschossen';
  else if (!hat(m, 'beinL') && !hat(m, 'beinR')) m.koGrund = 'Beide Beine ab';
  if (m.koGrund) zerstoert(m, von);
}
function teilSchaden(m, id, menge, von) {
  const t = m.teile[id];
  if (t.hp <= 0) {   // Schon ab? Dann fliegt die Kugel weiter in die Mitte (bei Beinen einfach vorbei)
    if (id.startsWith('arm')) teilSchaden(m, 'mitte', menge * 0.5, von);
    return;
  }
  t.hp -= menge;
  if (t.hp <= 0) { t.hp = 0; teilAb(m, id, von); }
}
function teilAb(m, id, von) {
  const p = teilPos(m, id);
  funken(p.x, p.y, p.h, '#ffd166');
  for (let i = 0; i < 12; i++) {   // Funkenregen und Rauch
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
    partikel.push({ x: p.x, y: p.y, h: p.h, vh: 80 + Math.random() * 150, g: 500, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.7, max: 0.7, farbe: zufall(['#ffd166', '#ff9f43', '#ffffff']) });
  }
  sound.boom((m.istSpieler ? 1 : lautBei(m)) * 0.4);
  if (id.startsWith('bein')) m.boostZeit = 0;
  if (id === 'mitte' || id === 'visier') return;   // Das gibt gleich sowieso K.o.
  if (m.istSpieler) zeigeNachricht(`⚠️ ${TEILE[id].name} ab!`, 2, '#ff6b6b');
  else if (von && von.istSpieler) zeigeNachricht(`💥 ${TEILE[id].name} abgeschossen!`, 1.5, '#4ade80');
}

function zerstoert(m, von) {
  m.tot = true;
  m.totZeit = 0;
  m.salve = null;
  m.neustart = modus === 'knockout' ? Infinity : NEUSTART_ZEIT;   // Knockout: Kein Neustart!
  m.tode++;
  m.zerstoertVon = von;
  // 💥 Das Wrack wird durch die Luft geschleudert – weg von dem, der dich zerstört hat!
  const wegRichtung = von ? Math.atan2(m.y - von.y, m.x - von.x) : Math.random() * Math.PI * 2;
  const wucht = KO_WUCHT * (0.8 + Math.random() * 0.4);
  m.wrack = {
    x: m.x, y: m.y, z: m.z,
    vx: Math.cos(wegRichtung) * wucht, vy: Math.sin(wegRichtung) * wucht, vz: KO_HOCH * (0.85 + Math.random() * 0.3),
    rx: 0, ry: -m.laufWinkel, rz: 0,                                                         // wie es gerade gedreht ist
    dx: (Math.random() - 0.5) * 12, dy: (Math.random() - 0.5) * 6, dz: (Math.random() - 0.5) * 12,   // wie schnell es sich dreht
    zielX: (Math.random() < 0.5 ? -1 : 1) * 1.45,   // so liegt es am Ende auf der Seite
    huepfer: 0, liegt: false, liegtK: 0, rauchT: 0,
  };
  explosion(m.x, m.y, null, null, 85, 0, m.z + 30);
  for (let i = 0; i < 8; i++) {   // Schrottteile fliegen weg
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    partikel.push({ x: m.x, y: m.y, h: m.z + 40, vh: 150 + Math.random() * 200, g: 600, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.2, max: 1.2, farbe: TEAMS[m.team].dunkel, rauch: true });
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
      s.h = s.startH * (1 - k) + s.zh * k + 4 * s.scheitel * k * (1 - k);
      s.dx = s.x - ax; s.dy = s.y - ay; s.dh = s.h - ah;   // Flugrichtung (damit die Rakete richtig zeigt)
      if (Math.random() < 0.6) partikel.push({ x: s.x, y: s.y, h: s.h, vh: 5, vx: 0, vy: 0, t: 0.5, max: 0.5, farbe: '#b9a7d6', rauch: true });
      if (k > 0.6 && zeit - letzterPfiff > 1 && spieler && dist({ x: s.zx, y: s.zy }, spieler) < 300) { letzterPfiff = zeit; sound.pfeifen(); }   // Fiiiiuuu ... gleich knallt's!
      if (k >= 1) { s.weg = true; explosion(s.zx, s.zy, s.team, s.von, s.radius, s.schaden, s.zh + 5); }
      continue;
    }
    const schritte = 3;
    for (let i = 0; i < schritte && !s.weg; i++) {
      s.x += s.vx * dt / schritte;
      s.y += s.vy * dt / schritte;
      s.h += (s.vh || 0) * dt / schritte;
      s.rest -= Math.hypot(s.vx, s.vy, s.vh || 0) * dt / schritte;
      if (imFesten(s.x, s.y, s.h) || s.x < 0 || s.y < 0 || s.x > WELT_B || s.y > WELT_H) {
        s.weg = true;
        const zx = s.x - s.vx * 0.02, zy = s.y - s.vy * 0.02, zh = Math.max(2, s.h - (s.vh || 0) * 0.02);
        if (s.art === 'rakete') explosion(zx, zy, s.team, s.von, s.radius, s.schaden, zh);
        else funken(zx, zy, zh, '#ffe08a');
        break;
      }
      for (const m of mechs) {
        if (m.tot || m.team === s.team || dist(m, s) > MECH_RADIUS * m.typ.groesse) continue;
        if (s.h < m.z - 5 || s.h > m.z + 80 * m.typ.groesse) continue;   // drüber oder drunter vorbei
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden, s.h);
        else { schaden(m, s.schaden, s.von, trefferTeil(m, s.x, s.y, s.h)); funken(s.x, s.y, s.h, m.schutz > 0 ? '#93c5fd' : '#ffffff'); }
        break;
      }
      if (!s.weg && s.rest <= 0) {
        s.weg = true;
        if (s.art === 'rakete') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden, s.h);
      }
    }
    if (s.art === 'rakete' && !s.weg) {   // Rauchspur
      partikel.push({ x: s.x, y: s.y, h: s.h, vh: 10, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, t: 0.6, max: 0.6, farbe: '#9a9a9a', rauch: true });
    }
  }
  schuesse = schuesse.filter(s => !s.weg);
}

// ===== K.o.: Das Wrack fliegt, hüpft und brennt =====
function updateWrack(m, dt) {
  const w = m.wrack;
  if (!w.liegt) {
    // Fliegen: Schwerkraft zieht nach unten, dabei dreht es sich wild
    w.vz -= 900 * dt;
    const nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
    const draussen = nx < 30 || ny < 30 || nx > WELT_B - 30 || ny > WELT_H - 30;
    if (draussen || imFesten(nx, ny, w.z + 30)) { w.vx *= -0.4; w.vy *= -0.4; sound.treffer(); }   // Gegen die Wand geknallt!
    else { w.x = nx; w.y = ny; }
    w.z += w.vz * dt;
    w.rx += w.dx * dt; w.ry += w.dy * dt; w.rz += w.dz * dt;
    // Rauchspur in der Luft
    if (Math.random() < 0.7) partikel.push({ x: w.x, y: w.y, h: w.z + 40, vh: 10, vx: 0, vy: 0, t: 0.9, max: 0.9, farbe: '#555555', rauch: true });
    const boden = standHoehe(w.x, w.y, w.z + STUFE);
    if (w.z <= boden && w.vz < 0) {   // Aufprall!
      w.z = boden;
      const laut = lautBei(w);
      if (w.vz < -200 && w.huepfer < 2) {   // Noch mal hochhüpfen
        w.vz = -w.vz * 0.35; w.vx *= 0.5; w.vy *= 0.5;
        w.dx *= 0.5; w.dy *= 0.5; w.dz *= 0.5;
        w.huepfer++;
        if (m.istSpieler) wackeln = Math.max(wackeln, 3);
      } else {   // Liegen bleiben
        w.liegt = true;
        w.vx = w.vy = w.vz = 0;
      }
      sound.boom(laut * 0.5);
      for (let i = 0; i < 12; i++) {   // Staubwolke
        const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 80;
        partikel.push({ x: w.x, y: w.y, h: boden + 10, vh: 30 + Math.random() * 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1, max: 1, farbe: '#8a7f70', rauch: true });
      }
    }
  } else {
    // Liegt am Boden: Langsam auf die Seite kippen ...
    const k = Math.min(1, dt * 6);
    w.rx += (w.zielX - w.rx) * k;
    w.rz += (0 - w.rz) * k;
    w.liegtK = Math.min(1, w.liegtK + dt * 3);
    // ... und brennen und qualmen
    w.rauchT -= dt;
    if (w.rauchT <= 0) {
      w.rauchT = 0.07;
      partikel.push({ x: w.x + (Math.random() - 0.5) * 30, y: w.y + (Math.random() - 0.5) * 30, h: w.z + 25, vh: 50 + Math.random() * 30, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, t: 1.4, max: 1.4, farbe: '#3a3a3a', rauch: true });
      if (Math.random() < 0.6) partikel.push({ x: w.x + (Math.random() - 0.5) * 25, y: w.y + (Math.random() - 0.5) * 25, h: w.z + 20, vh: 60, vx: 0, vy: 0, t: 0.4, max: 0.4, farbe: zufall(['#ff9f43', '#ffd166', '#ff6b35']) });
    }
  }
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
  vor += touch.vor; seite += touch.seite;   // Joystick auf dem Handy
  const dx = vx * vor + rx * seite, dy = vy * vor + ry * seite;
  if ((tasten['shift'] || tasten[' ']) && (dx || dy)) boosten(m, Math.atan2(dy, dx));
  if (touch.boost) boosten(m, (dx || dy) ? Math.atan2(dy, dx) : blick.links);   // Handy: ohne Richtung geht's nach vorne
  bewege(m, dx, dy, dt);
  m.zielWinkel = blick.links;
  m.zielHoch = blick.hoch;   // Kugeln fliegen dahin, wo du hinschaust (auch hoch und runter)
  if (m.typ.mg.salve) {   // Artillerie: Je höher du schaust, desto weiter weg ist das Ziel
    const mg = m.typ.mg;
    m.zielWeite = mg.minWeite + (blick.hoch + 0.5) / 0.9 * (mg.weite - mg.minWeite);
  }
  if (maus.links) feuern(m);
  if (maus.rechts || tasten['q'] || tasten['e'] || touch.rakete) rakete(m);
}

// ===== Die Computer-Mechs (Bots) =====
function zaehleIn(team, z) { return mechs.filter(m => !m.tot && m.team === team && dist(m, z) < z.r).length; }

// Wohin will der Bot gerade?
function botZiel(m) {
  if (modus === 'team' || modus === 'knockout') {
    const gegner = mechs.filter(o => !o.tot && o.team !== m.team).sort((a, b) => dist(a, m) - dist(b, m))[0];
    return gegner || { x: WELT_B / 2, y: WELT_H / 2 };
  }
  // Scharfschützen und Artillerie stellen sich manchmal auf eine Plattform oder einen Hügel
  if ((m.typ.mg.strahl || m.typ.mg.salve) && m.seed > 4) {
    const hoch = WAENDE.filter(b => (b.art === 'plattform' || b.art === 'huegel') && (b.x + b.w / 2 < WELT_B / 2) === (m.team === 'blau'));
    if (hoch.length) {
      const b = hoch[Math.floor(m.seed) % hoch.length];
      return { x: b.x + b.w / 2, y: b.y + b.h / 2, z: b.oben };
    }
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
      const sichtbar = sicht(m, o) || (m.typ.mg.salve && mechs.some(f => !f.tot && f.team === m.team && f !== m && dist(f, o) < 700 && sicht(f, o)));
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
  for (let i = 0; i < 3 && m.weg.length > 1 && kannDirekt(m, m.weg[1]); i++) m.weg.shift();   // Abkürzen, wenn frei
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
    const flug = mg.salve ? (mg.zielZeit + 0.6 + d / mg.tempo) * 0.4 : d / mg.tempo;   // Artillerie: Wo ist er ungefähr, wenn die Raketen landen?
    const vorne = { x: g.x + g.vx * flug, y: g.y + g.vy * flug };   // Da wird der Gegner gleich sein
    const zielW = Math.atan2(vorne.y - m.y, vorne.x - m.x) + (Math.sin(zeit * 7 + m.seed * 3)) * BOT_UNGENAU;
    m.zielWeite = dist(m, vorne);
    m.zielHoch = Math.atan2((g.z + 40 * g.typ.groesse) - (m.z + 52 * m.typ.groesse), Math.max(1, dist(m, vorne)));   // hoch oder runter zielen
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
    m.zielHoch = 0;
  }

  // Raketenhagel von Gegnern? Schnell raus aus dem Kreis! (Aber nur, wenn der Bot ihn bemerkt hat)
  for (const o of mechs) {
    if (!o.salve || o.team === m.team) continue;
    const z = o.salve.ziel, d = dist(m, z);
    if (d > o.typ.mg.streuRadius + 60) continue;
    if (!o.salve.bemerkt.has(m)) o.salve.bemerkt.set(m, Math.random() < 0.5 ? zeit + 0.4 + Math.random() * 0.6 : Infinity);
    if (zeit >= o.salve.bemerkt.get(m)) { dx += (m.x - z.x) / (d || 1) * 2; dy += (m.y - z.y) / (d || 1) * 2; }
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
  } else if (modus === 'knockout') {
    updateKnockout(dt);
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
// ----- Knockout -----
const lebend = team => mechs.filter(m => m.team === team && !m.tot).length;
function updateKnockout(dt) {
  if (rundePause > 0) {   // Kurze Pause zwischen den Runden
    rundePause -= dt;
    if (rundePause <= 0) neueRunde();
    return;
  }
  restZeit -= dt;
  const b = lebend('blau'), r = lebend('rot');
  if (b > 0 && r > 0 && restZeit > 0) return;
  let sieger = null;
  if (b === 0 && r > 0) sieger = 'rot';
  else if (r === 0 && b > 0) sieger = 'blau';
  else if (b !== r) sieger = b > r ? 'blau' : 'rot';   // Zeit um: Wer hat mehr Mechs übrig?
  else {                                               // Gleich viele? Wer ist weniger kaputt?
    const summe = team => mechs.filter(m => m.team === team && !m.tot).reduce((s, m) => s + gesundheit(m), 0);
    const sb = summe('blau'), sr = summe('rot');
    if (Math.abs(sb - sr) > 0.01) sieger = sb > sr ? 'blau' : 'rot';
  }
  rundeVorbei(sieger);
}
function rundeVorbei(sieger) {
  if (sieger) punkte[sieger]++;
  if (sieger && punkte[sieger] >= KNOCKOUT_SIEGE) {
    beende(sieger, `${TEAMS[sieger].name} hat ${KNOCKOUT_SIEGE} Runden gewonnen!`);
    return;
  }
  const gut = sieger === spieler.team;
  if (!sieger) zeigeNachricht('🤝 Unentschieden! Keiner kriegt einen Punkt.', 3.5, '#fff');
  else zeigeNachricht(gut ? `🏆 Runde ${runde} gewonnen!` : `💀 Runde ${runde} verloren!`, 3.5, gut ? '#4ade80' : '#ff6b6b');
  if (sieger) sound.erobert(gut);
  rundePause = 4;
}
function neueRunde() {
  runde++;
  for (const m of mechs) { spawnen(m); m.salve = null; m.mgPause = 0; m.raketePause = 1; m.boostPause = 0; }
  restZeit = KNOCKOUT_ZEIT;
  zuschauen = null;
  countdown = 3.99;
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
      m.neustart -= dt; m.totZeit += dt;
      if (m.wrack) updateWrack(m, dt);
      if (m.neustart <= 0) spawnen(m);
      continue;
    }
    if (m.seitHit > HEILEN_NACH) {   // Heilen: Nur Teile, die noch dran sind!
      for (const t of Object.values(m.teile)) if (t.hp > 0) t.hp = Math.min(t.max, t.hp + HEILEN_TEMPO * dt * t.max / m.typ.leben);
    }
    if (m.salve) updateSalve(m, dt);
  }
  updateSpieler(dt);
  for (const m of mechs) if (!m.istSpieler && !m.tot) botDenken(m, dt);
  mechsSchieben();
  updateSchuesse(dt);
  updateTruemmer(dt);
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
const gitterTextur = malTextur(128, 128, (g, b, h) => {   // Gitter-Boden für Brücken und Plattformen
  g.fillStyle = '#3a3f4a'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#6b7385'; g.lineWidth = 4;
  for (let i = 0; i <= b; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(b, i); g.stroke(); }
});
const rampenTextur = malTextur(128, 128, (g, b, h) => {   // Rampe mit Rillen, damit man nicht rutscht
  g.fillStyle = '#5b6375'; g.fillRect(0, 0, b, h);
  g.fillStyle = '#7a8296';
  for (let i = 0; i < h; i += 16) g.fillRect(0, i, b, 6);
});
const wandMat = new THREE.MeshStandardMaterial({ map: wandTextur, roughness: 0.6, metalness: 0.4 });
const kistenMat = new THREE.MeshStandardMaterial({ map: kistenTextur, roughness: 0.8 });
const kanteMat = new THREE.LineBasicMaterial({ color: '#2a2f3a' });

// Eine schräge Rampe (ein Kasten, dessen Oberseite schräg ist)
function rampenGeo(r) {
  const geo = new THREE.BoxGeometry(r.w, 1, r.h);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) <= 0) { pos.setY(i, 0); continue; }
    pos.setY(i, Math.max(2, obenBei(r, r.x + r.w / 2 + pos.getX(i), r.y + r.h / 2 + pos.getZ(i))));
  }
  geo.computeVertexNormals();
  return geo;
}
function kasten(g, r, mat, unten, oben, schatten = true) {
  const geo = new THREE.BoxGeometry(r.w, oben - unten, r.h);
  const k = new THREE.Mesh(geo, mat);
  k.position.set(r.x + r.w / 2, (unten + oben) / 2, r.y + r.h / 2);
  k.castShadow = schatten; k.receiveShadow = true;
  g.add(k);
  return k;
}
function warnstreifen(g, r, hoehe) {
  const st = streifenTextur.clone();
  st.repeat.set(Math.max(r.w, r.h) / 64, 1);
  kasten(g, { x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }, new THREE.MeshStandardMaterial({ map: st }), hoehe - 10, hoehe, false);
}
function baueFabrikBlock(g, r) {
  if (r.art === 'rampe') {
    const t = rampenTextur.clone();
    t.repeat.set(1, Math.max(r.w, r.h) / 64);
    if (r.rampe === 'w' || r.rampe === 'o') t.rotation = Math.PI / 2;
    const m = new THREE.Mesh(rampenGeo(r), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, metalness: 0.3 }));
    m.position.set(r.x + r.w / 2, 0, r.y + r.h / 2);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return;
  }
  if (r.art === 'steg' || r.art === 'plattform') {
    const t = gitterTextur.clone();
    t.repeat.set(r.w / 64, r.h / 64);
    if (r.art === 'plattform') kasten(g, r, wandMat, 0, r.oben - 4);          // Unterbau
    kasten(g, r, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.5 }), r.art === 'steg' ? r.unten : r.oben - 4, r.oben);
    if (r.art === 'plattform') warnstreifen(g, r, r.oben - 4);
    return;
  }
  if (r.art === 'gelaender') {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.5, metalness: 0.4 });
    kasten(g, { x: r.x, y: r.y + r.h / 2 - 2, w: r.w, h: 4 }, mat, r.oben - 6, r.oben, false);   // Handlauf
    const lang = r.w > r.h;
    for (let i = 0; i <= (lang ? r.w : r.h); i += 40) {   // Pfosten
      const px = lang ? r.x + i : r.x + r.w / 2, py = lang ? r.y + r.h / 2 : r.y + i;
      kasten(g, { x: px - 2, y: py - 2, w: 4, h: 4 }, mat, r.unten, r.oben, false);
    }
    return;
  }
  const kiste = r.art === 'kiste';
  const wand = kasten(g, r, kiste ? kistenMat : wandMat, r.unten, r.oben);
  const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(wand.geometry), kanteMat);
  kanten.position.copy(wand.position);
  g.add(kanten);
  if (!kiste) warnstreifen(g, r, r.oben);
}

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
  // Wände, Kisten, Plattformen, Rampen, Brücken ...
  for (const r of WAENDE) baueFabrikBlock(g, r);
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
    turm.position.set(WELT_B / 2 + Math.cos(a) * (WELT_B / 2 + 900), h / 2, WELT_H / 2 + Math.sin(a) * (WELT_H / 2 + 800));
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
function leuchtPflanze(g, x, z, zufall, boden = 0) {   // Kleine Pflanze mit leuchtender Kugel
  const h = 14 + zufall() * 22;
  const stiel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, h, 5), grasMat);
  stiel.position.set(x, boden + h / 2, z);
  stiel.rotation.z = (zufall() - 0.5) * 0.4;
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(3 + zufall() * 3, 8, 6), leuchtMats[Math.floor(zufall() * leuchtMats.length)]);
  kugel.position.set(x, boden + h + 2, z);
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

  // Hindernisse, Hügel und Hänge
  WAENDE.forEach((r, nr) => {
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.art === 'fels') {
      fels(g, cx, cz, r.w * 0.62, 95, r.h * 0.62, z());
      fels(g, cx + (z() - 0.5) * r.w * 0.4, cz + (z() - 0.5) * r.h * 0.4, r.w * 0.4, 130, r.h * 0.4, z());   // Spitze oben drauf
    } else if (r.art === 'kristall') {
      kristalle(g, r, z, nr);
    } else if (r.art === 'pilz') {
      riesenPilz(g, cx, cz, r.w / 2, 150, 120);
    } else if (r.art === 'huegel') {
      const t = alienBodenTextur.clone();
      t.repeat.set(r.w / 220, r.h / 220);
      kasten(g, r, felsMat, 0, r.oben - 3);
      kasten(g, r, new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), r.oben - 3, r.oben);   // Boden oben drauf
      for (let i = 0; i < 6; i++) leuchtPflanze(g, r.x + 20 + z() * (r.w - 40), r.y + 20 + z() * (r.h - 40), z, r.oben);
    } else if (r.art === 'hang') {
      const m = new THREE.Mesh(rampenGeo(r), felsMat);
      m.position.set(cx, 0, cz);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
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
    const x = WELT_B / 2 + Math.cos(a) * (WELT_B / 2 + 600 + z() * 500), y = WELT_H / 2 + Math.sin(a) * (WELT_H / 2 + 500 + z() * 400);
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
function ladeKarte(k, gross = false) {
  const schluessel = k.id + (gross ? '-gross' : '');
  if (geladeneKarte === schluessel) return;
  geladeneKarte = schluessel;
  WELT_B = gross ? GROSSE_KARTE.b : 2400;
  WELT_H = gross ? GROSSE_KARTE.h : 1400;
  WAENDE = waendeVon(gross ? { links: k.grossLinks, mitte: k.grossMitte } : k);
  // Boden-Muster, Sonne und Schatten an die Größe anpassen
  bodenTextur.repeat.set(WELT_B / 100, WELT_H / 100);
  alienBodenTextur.repeat.set(WELT_B / 220, WELT_H / 220);
  sonne.position.set(WELT_B / 2 - 600, 900, WELT_H / 2 - 400);
  sonne.target.position.set(WELT_B / 2, 0, WELT_H / 2);
  Object.assign(sonne.shadow.camera, { left: -WELT_B / 2 - 200, right: WELT_B / 2 + 200, top: WELT_H / 2 + 300, bottom: -WELT_H / 2 - 300, far: 3500 });
  sonne.shadow.camera.updateProjectionMatrix();
  baueGitter();
  baueKarte3D(k);
}
ladeKarte(karte);

// ----- Ein Mech aus Klötzen -----
const metall = farbe => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.5, metalness: 0.5 });
const leucht = farbe => new THREE.MeshBasicMaterial({ color: farbe });   // Leuchtet immer, auch im Schatten
const dunkelMat = metall('#2a2d36'), grauMat = metall('#4b5060'), stahlMat = metall('#8a90a0');
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
function gelenk(r, l, mat, x, y, z) {   // Ein rundes Gelenk, das zur Seite (z) zeigt
  const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 12), mat);
  k.rotation.x = Math.PI / 2;
  k.position.set(x, y, z);
  k.castShadow = true;
  return k;
}
function schraeg(k, winkel) { k.rotation.z = winkel; return k; }   // Ein Teil nach vorne/hinten kippen

// So ist ein Mech aufgebaut (vorne ist +x):
//   Beine: Hüfte -> Oberschenkel -> Knie -> Unterschenkel -> Fuß. Jedes Gelenk kann sich drehen, damit er richtig läuft!
//   Oberkörper: Rumpf mit Cockpit, Schultern, Waffen und Düsen hinten.
// In der Logik zeigt Winkel 0 nach +x. Ein 3D-Objekt mit rotation.y = -winkel schaut dann in die richtige Richtung.
function baueMech(m) {
  const T = TEAMS[m.team], typ = m.typ;
  const koerperMat = new THREE.MeshStandardMaterial({ color: T.farbe, roughness: 0.35, metalness: 0.55, emissive: '#000000' });
  const teamDunkel = metall(T.dunkel), akzentMat = metall(typ.akzent);
  const akzentLeucht = leucht(typ.akzent), augeMat = leucht(T.hell);
  const dueseMat = new THREE.MeshBasicMaterial({ color: '#ff8c1a', transparent: true, opacity: 0.5 });
  const gruppe = new THREE.Group();
  const dick = typ.id === 'koloss' ? 1.4 : typ.id === 'blitz' ? 0.8 : 1;   // Wie dick die Beine sind

  // ===== Beine (drehen sich in Laufrichtung) =====
  const beine = new THREE.Group();
  beine.add(klotz(20, 10, 26, grauMat, 0, 42, 0));             // Becken
  beine.add(klotz(14, 6, 18, dunkelMat, 0, 48, 0));            // Drehkranz zum Oberkörper
  const huefte = [], knie = [], fuesse = [];
  for (const s of [-1, 1]) {
    beine.add(gelenk(6 * dick, 8, dunkelMat, 0, 42, s * 15));  // Hüftgelenk
    const h = new THREE.Group();                                // Oberschenkel (dreht sich an der Hüfte)
    h.position.set(0, 42, s * 19);
    h.add(klotz(11 * dick, 20, 9 * dick, koerperMat, 0, -10, 0));
    h.add(klotz(3, 14, 9.5 * dick, akzentMat, 5.5 * dick, -10, 0));   // Streifen vorne am Bein
    const k = new THREE.Group();                                // Unterschenkel (dreht sich am Knie)
    k.position.set(0, -20, 0);
    k.add(gelenk(5 * dick, 10 * dick, dunkelMat, 0, 0, 0));    // Kniegelenk
    k.add(klotz(8 * dick, 6, 10 * dick, teamDunkel, 4, 1, 0)); // Knieschoner
    k.add(klotz(8 * dick, 18, 8 * dick, grauMat, -1, -9, 0));  // Schienbein
    k.add(klotz(2.5, 14, 2.5, stahlMat, -5.5, -9, 0));          // Kolben hinten
    const f = new THREE.Group();                                // Fuß (bleibt flach auf dem Boden)
    f.position.set(0, -18, 0);
    f.add(klotz(26 * Math.min(dick, 1.2), 5, 13 * dick, dunkelMat, 2, -2, 0));
    f.add(schraeg(klotz(8, 4, 13 * dick, grauMat, 13, -1.5, 0), -0.4));   // Zehe vorne
    f.add(klotz(6, 4, 9 * dick, grauMat, -12, -2, 0));         // Ferse
    k.add(f); h.add(k); beine.add(h);
    huefte.push(h); knie.push(k); fuesse.push(f);
  }
  gruppe.add(beine);

  // ===== Oberkörper (dreht sich zum Ziel) =====
  const torso = new THREE.Group();
  torso.position.y = 50;
  torso.add(klotz(30, 10, 28, dunkelMat, -2, 0, 0));                       // Bauch
  torso.add(klotz(34, 22, 34, koerperMat, -2, 14, 0));                     // Rumpf
  torso.add(schraeg(klotz(6, 20, 28, koerperMat, 16, 11, 0), -0.35));      // Brustpanzer (schräg)
  torso.add(klotz(30, 4, 30, teamDunkel, -3, 27, 0));                      // Dach
  torso.add(klotz(35, 3, 35, akzentMat, -2, 4, 0));                        // Streifen in der Mech-Farbe
  for (const s of [-1, 1]) torso.add(klotz(18, 2, 1, akzentLeucht, -2, 14, s * 17.2));   // Leuchtstreifen an der Seite
  // Cockpit mit leuchtendem Visier
  torso.add(klotz(14, 12, 20, dunkelMat, 16, 21, 0));
  const visier = schraeg(new THREE.Mesh(new THREE.BoxGeometry(2, 6, 16), augeMat), -0.3);
  visier.position.set(23.5, 22, 0);
  torso.add(visier);
  for (const s of [-1, 1]) torso.add(klotz(2, 2, 2, akzentLeucht, 23, 16, s * 8));   // kleine Lampen
  // Rücken: Antrieb mit zwei Düsen (leuchten beim Boosten)
  torso.add(klotz(10, 18, 22, grauMat, -22, 14, 0));
  const duesen = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 6, 10), dunkelMat);
    d.rotation.z = Math.PI / 2; d.position.set(-29, 10, s * 6); d.castShadow = true;
    torso.add(d);
    const flamme = new THREE.Group();   // Die Flamme wächst von der Düse aus nach hinten
    flamme.position.set(-32, 10, s * 6);
    const kegel = new THREE.Mesh(new THREE.ConeGeometry(3.5, 14, 10), dueseMat);
    kegel.rotation.z = Math.PI / 2; kegel.position.x = -7;
    flamme.add(kegel);
    torso.add(flamme);
    duesen.push(flamme);
  }
  for (const y of [9, 13, 17]) torso.add(klotz(1, 1.5, 16, dunkelMat, -27.5, y + 4, 0));   // Lüftungsschlitze
  // ===== Arme (eigene Gruppen, damit man sie abschießen kann!) =====
  // Links ist -z, rechts ist +z
  const arme = { armL: new THREE.Group(), armR: new THREE.Group() };
  torso.add(arme.armL, arme.armR);
  const arm = s => arme[s < 0 ? 'armL' : 'armR'];
  const schulterGross = typ.id === 'koloss' ? 1.35 : typ.id === 'blitz' ? 0.8 : 1;
  for (const s of [-1, 1]) {
    arm(s).add(gelenk(6, 6, grauMat, 0, 16, s * 19));
    arm(s).add(schraeg(klotz(20 * schulterGross, 9 * schulterGross, 12 * schulterGross, koerperMat, 0, 22, s * 22), 0.12));
    arm(s).add(schraeg(klotz(20 * schulterGross, 2, 12.5 * schulterGross, akzentMat, 0, 22 + 4.5 * schulterGross, s * 22), 0.12));
  }
  if (typ.mg.salve) {
    // ☄️ Donnerhagel: an jedem Arm ein Raketenwerfer, schräg nach oben
    for (const s of [-1, 1]) {
      arm(s).add(klotz(12, 10, 8, grauMat, 4, 8, s * 22));          // Oberarm
      const werfer = new THREE.Group();
      werfer.position.set(12, 12, s * 25);
      werfer.rotation.z = 0.5;
      werfer.add(klotz(24, 16, 14, teamDunkel, 0, 0, 0));
      werfer.add(klotz(24.5, 2.5, 14.5, akzentMat, 0, 8, 0));
      for (const y of [-4, 4]) for (const z of [-4, 0, 4]) {
        const loch = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2, 8), akzentLeucht);
        loch.rotation.z = Math.PI / 2;
        loch.position.set(12.5, y, z);
        werfer.add(loch);
      }
      werfer.traverse(o => { o.castShadow = true; });
      arm(s).add(werfer);
    }
  } else if (typ.mg.strahl) {
    // 🎯 Adlerauge: eine lange Railgun mit zwei Schienen und leuchtendem Kern (rechter Arm)
    const z = 22, r = arm(1);
    r.add(klotz(22, 12, 10, grauMat, 10, 8, z));
    for (const y of [3, 13]) r.add(klotz(60, 3, 6, dunkelMat, 48, y, z));     // die zwei Schienen
    r.add(klotz(58, 2, 2, akzentLeucht, 48, 8, z));                           // leuchtender Kern
    for (const x of [30, 46, 62]) r.add(klotz(3, 14, 8, akzentMat, x, 8, z)); // Klammern
    r.add(rohr(3, 12, stahlMat, 12, 19, z));                                  // Zielfernrohr
    r.add(klotz(1, 4, 4, akzentLeucht, 18.5, 19, z));
    arm(-1).add(klotz(12, 8, 8, grauMat, 8, 8, -22));                          // Kleiner Arm links
  } else {
    // Zwei Maschinengewehre mit je drei Läufen (wie eine Gatling)
    for (const s of [-1, 1]) {
      const a = arm(s);
      a.add(klotz(10, 10, 8, grauMat, 4, 8, s * 22));            // Oberarm
      a.add(klotz(16, 11, 11, teamDunkel, 14, 6, s * 22));       // Waffengehäuse
      a.add(klotz(16, 2, 11.5, akzentMat, 14, 11, s * 22));
      for (let i = 0; i < 3; i++) {
        const w = i / 3 * Math.PI * 2;
        a.add(rohr(1.3, 22, dunkelMat, 32, 6 + Math.sin(w) * 2.6, s * 22 + Math.cos(w) * 2.6));
      }
      a.add(rohr(4, 3, grauMat, 40, 6, s * 22));                  // Mündung
    }
  }
  // Raketenwerfer oben auf dem Rücken: Der Feuersturm hat zwei große, alle anderen einen
  const raketenLicht = new THREE.MeshBasicMaterial({ color: '#ffd166' });
  const gross = typ.rakete.anzahl > 1;
  for (const s of gross ? [-1, 1] : [-1]) {
    const y = gross ? 36 : 34, b = gross ? 16 : 12, z = gross ? s * 9 : -8;
    torso.add(klotz(22, b, 14, teamDunkel, -4, y, z));
    torso.add(klotz(22.5, 2, 14.5, akzentMat, -4, y + b / 2, z));
    const lichter = gross ? [[-3.5, -3.5], [-3.5, 3.5], [3.5, -3.5], [3.5, 3.5]] : [[0, -3], [0, 3]];
    for (const [dy, dz] of lichter) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2, 8), raketenLicht);
      l.rotation.z = Math.PI / 2; l.position.set(7.5, y + dy, z + dz);
      torso.add(l);
    }
  }
  // Besonderheiten der Mechs
  if (typ.id === 'koloss') {   // 🛡️ Dicke Panzerplatten an den Seiten und ein Rammschild vorne
    for (const s of [-1, 1]) torso.add(klotz(30, 22, 5, koerperMat, -2, 12, s * 17.5));
    torso.add(schraeg(klotz(5, 14, 30, teamDunkel, 19, 3, 0), -0.2));
  }
  if (typ.id === 'blitz') {    // ⚡ Flossen hinten, damit er schnell aussieht
    for (const s of [-1, 1]) {
      torso.add(schraeg(klotz(22, 3, 3, akzentMat, -22, 30, s * 10), -0.5));
      torso.add(schraeg(klotz(14, 1.5, 3.5, akzentLeucht, -20, 31.5, s * 10), -0.5));
    }
  }
  if (typ.id === 'adler') {    // 🎯 Großes Sensor-Auge oben auf dem Cockpit
    torso.add(gelenk(4, 6, dunkelMat, 12, 30, 0));
    torso.add(rohr(2.5, 4, akzentLeucht, 15, 30, 0));
  }
  if (typ.id === 'feuer') {    // 🔥 Heiße Lüftung am Bauch
    for (const s of [-1, 1]) torso.add(klotz(1, 6, 8, leucht('#ff6a00'), 12.6, 0, s * 7));
  }
  // Antenne mit leuchtender Spitze
  const antZ = gross ? 0 : 10;
  const antenne = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 22, 4), grauMat);
  antenne.position.set(-14, 38, antZ);
  torso.add(antenne);
  torso.add(klotz(2, 2, 2, augeMat, -14, 49, antZ));
  gruppe.add(torso);

  // Schutzschild
  const schild = new THREE.Mesh(new THREE.SphereGeometry(48, 20, 14), new THREE.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.25, depthWrite: false }));
  schild.position.y = 44;
  gruppe.add(schild);
  gruppe.scale.setScalar(typ.groesse);
  // Welche 3D-Gruppe gehört zu welchem Teil? (zum Abschießen)
  const teile = { armL: arme.armL, armR: arme.armR, beinL: huefte[0], beinR: huefte[1], visier };
  return { gruppe, beine, torso, huefte, knie, fuesse, duesen, dueseMat, koerperMat, raketenLicht, schild, teile };
}

const wrackMitte = new THREE.Vector3(), wrackDreh = new THREE.Vector3();
function zeigeWrack(m, g) {
  const w = m.wrack, gr = m.typ.groesse;
  g.istWrack = true;
  for (const [id, obj] of Object.entries(g.teile)) {   // Kaputte Teile fliegen weg
    const dran = hat(m, id);
    if (!dran && obj.visible && id !== 'visier') truemmerAbwerfen(m, obj);
    obj.visible = dran;
  }
  g.gruppe.rotation.set(w.rx, w.ry, w.rz);
  // Der Mech dreht sich um seine Mitte (nicht um die Füße). Liegt er, ist die Mitte näher am Boden.
  const mitteH = (45 - 27 * w.liegtK) * gr;
  wrackDreh.set(0, 45 * gr, 0).applyEuler(g.gruppe.rotation);
  const sinken = Math.max(0, 0.8 - m.neustart) * 90;   // Kurz vor dem Neustart versinkt das Wrack im Boden
  wrackMitte.set(w.x, w.z + mitteH - sinken, w.y);
  g.gruppe.position.set(wrackMitte.x - wrackDreh.x, wrackMitte.y - wrackDreh.y, wrackMitte.z - wrackDreh.z);
  // Verbrannt: dunkel und ohne Lichter
  g.koerperMat.color.set('#3b2f2b');
  g.koerperMat.emissive.set('#000000');
  g.raketenLicht.color.set('#222222');
  for (const d of g.duesen) d.scale.set(0.01, 1, 1);
  g.schild.visible = false;
  // Schlappe Beine
  g.huefte.forEach((h, i) => { h.rotation.z = 0.6 + i * 0.3; });
  g.knie.forEach((k, i) => { k.rotation.z = -1 + i * 0.4; });
  g.torso.position.y = 47;
}
// ----- Trümmer: abgeschossene Arme und Beine fliegen durch die Gegend -----
let truemmer = [];
function truemmerAbwerfen(m, obj) {
  obj.updateWorldMatrix(true, true);
  const kopie = obj.clone();
  obj.matrixWorld.decompose(kopie.position, kopie.quaternion, kopie.scale);
  szene.add(kopie);
  const a = Math.random() * Math.PI * 2;
  truemmer.push({ obj: kopie, vx: Math.cos(a) * 120, vy: 200 + Math.random() * 150, vz: Math.sin(a) * 120,
    dreh: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12), t: 4 });
}
function updateTruemmer(dt) {
  for (const t of truemmer) {
    t.t -= dt;
    const o = t.obj;
    if (o.position.y > 5) {   // Fliegt noch
      t.vy -= 900 * dt;
      o.position.x += t.vx * dt; o.position.y += t.vy * dt; o.position.z += t.vz * dt;
      o.rotation.x += t.dreh.x * dt; o.rotation.y += t.dreh.y * dt; o.rotation.z += t.dreh.z * dt;
      if (Math.random() < 0.5) partikel.push({ x: o.position.x, y: o.position.z, h: o.position.y, vh: 10, vx: 0, vy: 0, t: 0.6, max: 0.6, farbe: '#555555', rauch: true });
    } else if (t.vy < 0) { t.vy = 0; o.position.y = 5; }   // Liegt am Boden
    if (t.t < 1) o.position.y -= dt * 30;                   // Versinkt langsam
    if (t.t <= 0) szene.remove(o);
  }
  truemmer = truemmer.filter(t => t.t > 0);
}
function zeigeMech(m) {
  const g = m.g3;
  if (m.tot) {   // K.o.: Das Wrack fliegt (auch deins – du siehst es von oben!)
    g.gruppe.visible = !!m.wrack;
    if (m.wrack) zeigeWrack(m, g);
    return;
  }
  if (g.istWrack) {   // Wieder da: alles zurücksetzen
    g.istWrack = false;
    g.gruppe.rotation.set(0, 0, 0);
    g.koerperMat.color.set(TEAMS[m.team].farbe);
  }
  g.gruppe.visible = !m.istSpieler;   // Dich selbst siehst du nicht, du sitzt ja drin!
  if (!g.gruppe.visible) return;
  for (const [id, obj] of Object.entries(g.teile)) {
    const dran = hat(m, id);
    if (!dran && obj.visible) truemmerAbwerfen(m, obj);   // Gerade abgeschossen: Es fliegt weg!
    obj.visible = dran;
  }
  g.gruppe.position.set(m.x, m.z, m.y);
  g.beine.rotation.y = -m.laufWinkel;
  g.torso.rotation.y = -m.zielWinkel;
  // Laufen: Die Beine schwingen vor und zurück, das Knie knickt ein, wenn das Bein nach vorne kommt
  [-1, 1].forEach((s, i) => {
    const schwung = m.laeuft ? Math.sin(m.phase) * 0.45 * s : 0;
    const knick = m.laeuft ? Math.max(0, Math.cos(m.phase) * s) * 0.8 : 0;
    g.huefte[i].rotation.z = schwung + knick * 0.5;
    g.knie[i].rotation.z = -knick;
    g.fuesse[i].rotation.z = -(schwung + knick * 0.5 - knick);   // Fuß bleibt flach
  });
  const wippen = m.laeuft ? Math.abs(Math.sin(m.phase)) * 2.5 : 0;
  g.torso.position.y = 50 - (m.laeuft ? 1.5 : 0) + wippen;
  g.beine.position.y = m.laeuft ? -1.5 + wippen * 0.4 : 0;
  g.koerperMat.emissive.set(m.blitz > 0 ? '#ffffff' : '#000000');
  g.raketenLicht.color.set(m.raketePause <= 0 ? '#ffd166' : '#222222');
  // Düsen: kleine Flamme beim Laufen, große beim Boosten
  const flamme = m.boostZeit > 0 ? 1.6 + Math.random() * 0.5 : m.laeuft ? 0.35 + Math.random() * 0.15 : 0.15;
  for (const d of g.duesen) d.scale.set(flamme, 1, 1);
  g.dueseMat.opacity = m.boostZeit > 0 ? 0.9 : 0.5;
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
// Alle Schüsse zeigen in z-Richtung, damit sie mit lookAt in Flugrichtung gedreht werden können
const kugelGeo = new THREE.BoxGeometry(2.5, 2.5, 26);
const kugelMat = { blau: new THREE.MeshBasicMaterial({ color: '#bfdbfe' }), rot: new THREE.MeshBasicMaterial({ color: '#fecaca' }) };
const strahlGeo = new THREE.BoxGeometry(3, 3, 90);
const strahlMat = new THREE.MeshBasicMaterial({ color: '#a7f3d0' });
const salvenGeo = new THREE.CylinderGeometry(2.5, 3.5, 20, 8).rotateX(Math.PI / 2);   // zeigt nach vorne (z)
const salvenMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#c084fc', emissiveIntensity: 0.6 });
const raketenGeo = new THREE.BoxGeometry(6, 6, 18);
const raketenMat = new THREE.MeshStandardMaterial({ color: '#dddddd', emissive: '#ff9f43', emissiveIntensity: 0.4 });
let schussMeshes = [];
function zeigeSchuesse() {
  for (const s of schuesse) {
    if (!s.mesh) {
      if (s.art === 'kugel') s.mesh = new THREE.Mesh(kugelGeo, kugelMat[s.team]);
      else if (s.art === 'strahl') s.mesh = new THREE.Mesh(strahlGeo, strahlMat);
      else if (s.art === 'salve') s.mesh = new THREE.Mesh(salvenGeo, salvenMat);
      else s.mesh = new THREE.Mesh(raketenGeo, raketenMat);
      szene.add(s.mesh);
      schussMeshes.push(s);
    }
    s.mesh.position.set(s.x, s.h, s.y);
    if (s.bogen) { if (s.dx !== undefined) s.mesh.lookAt(s.x + s.dx, s.h + s.dh, s.y + s.dy); }   // Rakete zeigt in Flugrichtung
    else s.mesh.lookAt(s.x + s.vx, s.h + (s.vh || 0), s.y + s.vy);
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
  if (typ.mg.salve) {   // ☄️ Zwei Raketenwerfer, links und rechts, schräg nach oben
    for (const s of [-1, 1]) {
      const werfer = new THREE.Group();
      werfer.position.set(s * 18, -14, -34);
      werfer.rotation.x = 0.35;
      werfer.add(new THREE.Mesh(new THREE.BoxGeometry(14, 12, 26), mat));
      for (const x of [-3.5, 3.5]) for (const y of [-3, 3]) {
        const loch = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.5, 8), akzent);
        loch.rotation.x = Math.PI / 2;
        loch.position.set(x, y, -13.2);
        werfer.add(loch);
      }
      werfer.userData.teil = s < 0 ? 'armL' : 'armR';
      waffen.add(werfer);
    }
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
    for (const o of [halter, streifen, lauf]) o.userData.teil = s < 0 ? 'armL' : 'armR';
    waffen.add(halter, streifen, lauf);
  }
  if (typ.mg.strahl) {
    for (const z of [-40, -52, -64]) {   // leuchtende Ringe an der Railgun
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.5, 12), akzent);
      ring.rotation.x = Math.PI / 2; ring.position.set(15, -13, z);
      ring.userData.teil = 'armR';
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
    k.position.set(m.salve.ziel.x, standHoehe(m.salve.ziel.x, m.salve.ziel.y, 1e6) + 2.5, m.salve.ziel.y);
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
    zielRing.position.set(p.x, standHoehe(p.x, p.y, 1e6) + 2, p.y);
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
    kamera.position.set(m.x + (Math.random() - 0.5) * wackeln, m.z + AUGEN_HOEHE * m.typ.groesse + wippen + (Math.random() - 0.5) * wackeln, m.y);
    kamera.rotation.set(blick.hoch, -blick.links - Math.PI / 2, 0);
    waffen.visible = true;
    for (const o of waffen.children) if (o.userData.teil) o.visible = hat(m, o.userData.teil);   // Arm ab = Waffe weg
    waffen.position.set(0, m.laeuft ? Math.sin(m.phase) * 0.8 : 0, rueckstoss);
    muendungsBlitz.visible = muendung > 0;
    muendungsBlitz.position.set(m.typ.mg.strahl ? 15 : (m.typ.mg.salve ? 17 : m.lauf * 15), waffen.userData.muendungY, waffen.userData.muendungZ);
  } else if (modus === 'knockout' && m.totZeit > 3 && mechs.some(o => o.team === m.team && !o.tot)) {
    // Knockout: Du bist raus – die Kamera fliegt hinter einem Teamkollegen her
    if (!zuschauen || zuschauen.tot) zuschauen = mechs.find(o => o.team === m.team && !o.tot);
    const o = zuschauen, gr = o.typ.groesse;
    const ziel = new THREE.Vector3(o.x - Math.cos(o.zielWinkel) * 170 * gr, o.z + 120 * gr, o.y - Math.sin(o.zielWinkel) * 170 * gr);
    kamera.position.lerp(ziel, 0.08);
    kamera.lookAt(o.x + Math.cos(o.zielWinkel) * 80, o.z + 50 * gr, o.y + Math.sin(o.zielWinkel) * 80);
    waffen.visible = false;
  } else {
    // Zerstört: Die Kamera fliegt hoch und schaut auf dein Wrack
    if (modus === 'knockout') zuschauen = null;
    const w = m.wrack;
    const k = Math.min(1, m.totZeit / 1.5);
    kamera.position.set(w.x - Math.cos(blick.links) * 160 * k, w.z + AUGEN_HOEHE + 200 * k, w.y - Math.sin(blick.links) * 160 * k);
    kamera.lookAt(w.x, w.z, w.y);
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
    if (!freund && (d > 900 || !sicht(spieler, m))) continue;   // Gegner nur, wenn du sie siehst
    const p = aufBildschirm(m.x, m.z + 100 * m.typ.groesse, m.y);
    if (!p.vorne || p.x < -50 || p.x > W + 50 || p.y < -50 || p.y > H + 50) continue;
    const T = TEAMS[m.team];
    const s = begrenzt(1.4 - d / 1200, 0.6, 1.2);
    text(`${m.typ.emoji} ${m.name}`, p.x, p.y - 12 * s, 13 * s, T.hell);
    const b = 50 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - b / 2 - 1, p.y - 2, b + 2, 6);
    const gesund = gesundheit(m);
    ctx.fillStyle = gesund > 0.35 ? (freund ? '#4ade80' : '#ff6b6b') : '#ffd166';
    ctx.fillRect(p.x - b / 2, p.y - 1, b * gesund, 4);
  }
}

// Wo ist das Ziel? Zeichen über dem Punkt oder Pfeil am Rand
function zeichneZielZeichen() {
  if (modus === 'team' || modus === 'knockout' || spieler.tot) return;
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
  if (gesundheit(spieler) < 0.35 && !spieler.tot) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, `rgba(255,0,0,${0.25 + Math.sin(zeit * 6) * 0.1})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

// Dein Mech von hinten: Jedes Teil hat eine Farbe (grün = gut, gelb = angeschlagen, rot = fast kaputt, grau = ab!)
function zeichneMechTeile(m, x, y, s) {
  const teile = {   // [links, oben, breite, höhe] – von hinten gesehen, also links = links
    visier: [-11, 0, 22, 14],
    mitte:  [-20, 17, 40, 40],
    armL:   [-37, 17, 14, 38],
    armR:   [23, 17, 14, 38],
    beinL:  [-18, 60, 15, 42],
    beinR:  [3, 60, 15, 42],
  };
  for (const [id, [lx, ly, b, h]] of Object.entries(teile)) {
    const a = teilAnteil(m, id);
    const px = x + lx * s, py = y + ly * s, pb = b * s, ph = h * s;
    const getroffen = m.seitHit < 0.15 && a > 0;
    ctx.fillStyle = a <= 0 ? 'rgba(60,64,76,0.6)' : getroffen ? '#ffffff' : a > 0.6 ? '#4ade80' : a > 0.3 ? '#ffd166' : '#ff6b6b';
    rr(px, py, pb, ph, 4 * s); ctx.fill();
    // Wichtige Teile (die K.o. machen) bekommen einen weißen Rand
    const wichtig = id === 'mitte' || id === 'visier';
    ctx.strokeStyle = a <= 0 ? '#ff6b6b' : wichtig ? '#ffffff' : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = wichtig ? 2 : 1.5; ctx.stroke();
    if (a <= 0) {   // Kaputt: rotes X
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + pb - 3, py + ph - 3);
      ctx.moveTo(px + pb - 3, py + 3); ctx.lineTo(px + 3, py + ph - 3);
      ctx.stroke();
    } else if (pb > 20 && ph > 20) {
      text(`${Math.ceil(a * 100)}`, px + pb / 2, py + ph / 2 + 1, 11 * s, '#1b1f3a', 'center', false);
    }
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
  } else if (modus === 'knockout') {
    text(`${punkte.blau}`, W / 2 - 172, 36, 30, TEAMS.blau.hell);
    text(`${punkte.rot}`, W / 2 + 172, 36, 30, TEAMS.rot.hell);
    text(`🥊 Runde ${runde}`, W / 2, 24, 17, '#ffd166');
    text(`${uhr(Math.max(0, restZeit))} · ${KNOCKOUT_SIEGE} Siege gewinnen`, W / 2, 58, 12, '#c9c3ff', 'center', false);
    for (const team of ['blau', 'rot']) {   // Ein Punkt pro Mech: voll = noch dabei, leer = K.o.
      mechs.filter(o => o.team === team).forEach((o, i) => {
        const x = team === 'blau' ? W / 2 - 136 + i * 22 : W / 2 + 70 + i * 22;
        ctx.fillStyle = o.tot ? 'rgba(80,80,90,0.7)' : TEAMS[team].farbe;
        kreis(x, 38, 8); ctx.fill();
        ctx.strokeStyle = o.istSpieler ? '#ffd166' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      });
    }
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
  rr(12, H - 150, 290, 138, 12); ctx.fill();
  text(`${m.typ.emoji} ${m.typ.name}`, 22, H - 164, 16, m.typ.akzent, 'left');
  zeichneMechTeile(m, 66, H - 140, 1.2);
  const rBereit = m.raketePause <= 0;
  text('🚀', 140, H - 122, 16, '#fff', 'center', false);
  balken(158, H - 128, 128, 12, rBereit ? 1 : 1 - m.raketePause / m.typ.rakete.pause, rBereit ? '#ffd166' : '#8a8f9e');
  text(rBereit && !touchModus ? 'Rechtsklick' : '', 222, H - 106, 10, '#c9c3ff', 'center', false);
  const humpelt = !hat(m, 'beinL') || !hat(m, 'beinR');
  if (BOOST_AN) text('💨', 140, H - 84, 16, '#fff', 'center', false);
  if (!BOOST_AN) { if (humpelt) text('🦵 Bein ab – du humpelst!', 222, H - 84, 12, '#ff6b6b', 'center', false); }
  else if (m.typ.keinBoost) text('kein Boost', 222, H - 84, 12, '#8a8f9e', 'center', false);
  else if (humpelt) text('Bein ab!', 222, H - 84, 12, '#ff6b6b', 'center', false);
  else {
    const bBereit = m.boostPause <= 0;
    balken(158, H - 90, 128, 12, bBereit ? 1 : 1 - m.boostPause / m.typ.boostPause, bBereit ? '#6fe3ff' : '#8a8f9e');
    text(bBereit && !touchModus ? 'Shift' : '', 222, H - 68, 10, '#c9c3ff', 'center', false);
  }
  text('K.o., wenn Mitte, Visier', 222, H - 44, 11, '#c9c3ff', 'center', false);
  text('oder beide Beine kaputt!', 222, H - 29, 11, '#c9c3ff', 'center', false);

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
  const mk = 180 / WELT_B;   // Die Mini-Karte ist immer 180 breit
  const mx = touchModus ? 12 : W - 12 - WELT_B * mk, my = touchModus ? 12 : H - 12 - WELT_H * mk;   // Auf dem Handy oben links, damit unten Platz für die Knöpfe ist
  ctx.fillStyle = 'rgba(15,17,24,0.85)'; ctx.fillRect(mx - 3, my - 3, WELT_B * mk + 6, WELT_H * mk + 6);
  for (const r of WAENDE) {   // Wände grau, Plattformen und Brücken hell, Rampen dazwischen
    ctx.fillStyle = ['plattform', 'huegel', 'steg'].includes(r.art) ? '#4b5a7a' : (r.rampe ? '#3d4863' : (r.art === 'gelaender' ? '#ffd166' : '#737d93'));
    ctx.fillRect(mx + r.x * mk, my + r.y * mk, Math.max(1, r.w * mk), Math.max(1, r.h * mk));
  }
  ziele.forEach((z, i) => {
    if (modus !== 'punkt' && i !== aktivesZiel) return;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; kreis(mx + z.x * mk, my + z.y * mk, z.r * mk); ctx.stroke();
  });
  for (const o of mechs) {
    if (o.tot || o.istSpieler) continue;
    if (o.team !== spieler.team && !sicht(spieler, o)) continue;   // Gegner nur, wenn du sie siehst
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
    text(modus === 'knockout' ? '💥 DU BIST RAUS! 💥' : '💥 ZERSTÖRT! 💥', W / 2, H / 2 - 40, 48, '#ff6b6b');
    if (m.zerstoertVon) text(`von ${m.zerstoertVon.name}${m.koGrund ? ' · ' + m.koGrund : ''}`, W / 2, H / 2 + 5, 20, TEAMS[m.zerstoertVon.team].hell);
    else if (m.koGrund) text(m.koGrund, W / 2, H / 2 + 5, 20, '#fff');
    if (modus === 'knockout') {
      text(zuschauen ? `👀 Du schaust ${zuschauen.name} zu` : 'Warte auf die nächste Runde ...', W / 2, H / 2 + 45, 22, '#fff');
    } else text(`Neustart in ${Math.ceil(m.neustart)} ...`, W / 2, H / 2 + 45, 22, '#fff');
  }

  // ----- Countdown -----
  if (countdown > 0 && zustand === 'spiel') {
    const n = Math.ceil(countdown) - 1;
    const pop = 1 + (countdown % 1) * 0.5;
    const modusInfo = MODI.find(x => x.id === modus);
    text(`${modusInfo.emoji} ${modusInfo.name}${modus === 'knockout' ? ' · Runde ' + runde : ''}`, W / 2, H / 2 - 110, 34, '#ffd166');
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
      } else text(touchModus ? 'Feuer-Knopf: anvisieren!' : 'Linksklick: anvisieren!', W / 2, H / 2 + 58, 12, '#fff', 'center', false);
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

  if (zustand === 'spiel' && touchModus && !pause) zeichneTouch();

  if (pause && zustand === 'spiel') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    text('⏸️ PAUSE', W / 2, H / 2 - 30, 50, '#ffd166');
    text(touchModus ? 'Tippen: Weiterspielen' : 'Klicken: Weiterspielen  ·  Enter: Zurück zum Menü', W / 2, H / 2 + 30, 18, '#fff');
    const b = MENUE_KNOPF;
    ctx.fillStyle = '#ffd166'; rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    text('🏠 Zum Menü', b.x + b.w / 2, b.y + b.h / 2 + 1, 18, '#1b1f3a', 'center', false);
  }
  if (touchModus && innerHeight > innerWidth) {   // Handy hochkant? Dann ist alles winzig!
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
    text('📱↪️', W / 2, H / 2 - 40, 70, '#fff', 'center', false);
    text('Dreh dein Handy quer!', W / 2, H / 2 + 40, 40, '#ffd166');
  }
}

// ===== Titelbild (2D) =====
function modusKarten() {   // 3 pro Reihe, die letzte Reihe wird in die Mitte gerückt
  const b = 290, abst = 15, proReihe = 3;
  return MODI.map((m, i) => {
    const reihe = Math.floor(i / proReihe), inReihe = Math.min(proReihe, MODI.length - reihe * proReihe);
    const start = (W - inReihe * b - (inReihe - 1) * abst) / 2;
    return { m, x: start + (i % proReihe) * (b + abst), y: 145 + reihe * 142, w: b, h: 130 };
  });
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
  if (typ.mg.salve) {   // Zwei Raketenwerfer an den Armen
    for (const s of [-1, 1]) {
      ctx.fillStyle = T.dunkel; rr(4, s > 0 ? 14 : -28, 26, 14, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = typ.akzent;
      for (let i = 0; i < 3; i++) { kreis(10 + i * 8, s > 0 ? 21 : -21, 2.3); ctx.fill(); }
    }
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
    text(k.m.emoji, k.x + 30, k.y + 30, 28, '#fff', 'center', false);
    text(k.m.name, k.x + 56, k.y + 31, 21, hover ? '#ffd166' : '#fff', 'left', false);
    umbrechen(k.m.text, k.x + 16, k.y + 62, k.w - 32, 17, 13, '#c9c3ff');
  }

  text(`🎮 WASD: Laufen  ·  Maus: Umschauen  ·  Linksklick: MG  ·  Rechtsklick / Q: Rakete${BOOST_AN ? '  ·  Shift: Boost' : ''}  ·  Esc: Pause`, W / 2, 455, 13, '#c9c3ff', 'center', false);
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
  if (e.pointerType === 'touch') touchModus = true;
  if (!mausGefangen) { const p = punkt(e); maus.x = p.x; maus.y = p.y; }
  if (zustand === 'spiel' && pause && imRechteck(punkt(e), MENUE_KNOPF)) { zustand = 'titel'; pause = false; if (document.pointerLockElement) document.exitPointerLock(); return; }
  if (e.pointerType === 'touch' && zustand === 'spiel') { touchRunter(e); return; }
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
  if (e.pointerType === 'touch') { touchBewegt(e); return; }
  if (zustand === 'spiel' && !pause && (mausGefangen || e.buttons)) {
    blick.links += (e.movementX || 0) * MAUS_EMPFINDLICH;
    blick.hoch = begrenzt(blick.hoch - (e.movementY || 0) * MAUS_EMPFINDLICH, -0.5, 0.4);
  }
  if (!mausGefangen) { const p = punkt(e); maus.x = p.x; maus.y = p.y; }
});
addEventListener('pointercancel', e => touchHoch(e));
addEventListener('pointerup', e => {
  if (e.pointerType === 'touch') { touchHoch(e); return; }
  if (e.button === 0) maus.links = false;
  if (e.button === 2) maus.rechts = false;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());   // Kein Menü bei Rechtsklick

// ===== Handy & Tablet: Touch-Steuerung =====
// Linke Seite: Finger hinlegen und ziehen = Joystick zum Laufen
// Rechte Seite: Wischen = Umschauen
// Knöpfe rechts: Feuer (gedrückt halten, dabei kann man auch zielen!), Rakete, Boost. Oben: Pause
let touchModus = false;   // Wird an, sobald jemand mit dem Finger tippt
const touch = { vor: 0, seite: 0, boost: false, rakete: false, stick: null };
const TOUCH_EMPFINDLICH = 0.006;   // Wie schnell du dich beim Wischen drehst
const STICK_RADIUS = 65;           // Wie weit man den Joystick ziehen kann
const TOUCH_KNOEPFE = {
  feuer:  { x: 855, y: 465, r: 62 },
  rakete: { x: 725, y: 535, r: 42 },
  boost:  { x: 880, y: 330, r: 42 },
  pause:  { x: 222, y: 36,  r: 24 },
};
const MENUE_KNOPF = { x: W / 2 - 90, y: H / 2 + 65, w: 180, h: 46 };
const finger = new Map();   // Welcher Finger macht gerade was?
function knopfBei(p) {
  for (const [name, k] of Object.entries(TOUCH_KNOEPFE)) if ((name !== 'boost' || BOOST_AN) && Math.hypot(p.x - k.x, p.y - k.y) < k.r + 12) return name;
  return null;
}
function touchRunter(e) {
  const p = punkt(e);
  if (pause) { pause = false; return; }
  const knopf = knopfBei(p);
  if (knopf === 'pause') { pause = true; return; }
  if (knopf === 'feuer') maus.links = true;
  if (knopf === 'rakete') touch.rakete = true;
  if (knopf === 'boost') touch.boost = true;
  if (knopf) { finger.set(e.pointerId, { art: knopf, lx: p.x, ly: p.y }); return; }
  if (p.x < W * 0.45 && !touch.stick) {   // Joystick
    touch.stick = { x: p.x, y: p.y, kx: p.x, ky: p.y };
    finger.set(e.pointerId, { art: 'stick' });
  } else finger.set(e.pointerId, { art: 'blick', lx: p.x, ly: p.y });   // Umschauen
}
function touchBewegt(e) {
  const f = finger.get(e.pointerId);
  if (!f || zustand !== 'spiel' || pause) return;
  const p = punkt(e);
  if (f.art === 'stick') {
    const s = touch.stick;
    let dx = p.x - s.x, dy = p.y - s.y;
    const l = Math.hypot(dx, dy);
    if (l > STICK_RADIUS) { dx *= STICK_RADIUS / l; dy *= STICK_RADIUS / l; }
    s.kx = s.x + dx; s.ky = s.y + dy;
    const tot = l < 12;   // Ein bisschen Spielraum in der Mitte
    touch.seite = tot ? 0 : dx / STICK_RADIUS;
    touch.vor = tot ? 0 : -dy / STICK_RADIUS;
  } else if (f.art === 'blick' || f.art === 'feuer') {
    blick.links += (p.x - f.lx) * TOUCH_EMPFINDLICH;
    blick.hoch = begrenzt(blick.hoch - (p.y - f.ly) * TOUCH_EMPFINDLICH, -0.5, 0.4);
    f.lx = p.x; f.ly = p.y;
  }
}
function touchHoch(e) {
  const f = finger.get(e.pointerId);
  if (!f) return;
  finger.delete(e.pointerId);
  if (f.art === 'stick') { touch.stick = null; touch.vor = touch.seite = 0; }
  if (f.art === 'feuer') maus.links = false;
  if (f.art === 'rakete') touch.rakete = false;
  if (f.art === 'boost') touch.boost = false;
}
function zeichneTouch() {
  const m = spieler;
  if (m.tot) return;
  // Joystick
  const s = touch.stick || { x: 150, y: 350, kx: 150, ky: 350 };
  ctx.globalAlpha = touch.stick ? 0.8 : 0.35;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  kreis(s.x, s.y, STICK_RADIUS); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  kreis(s.kx, s.ky, 28); ctx.fill();
  ctx.globalAlpha = 1;
  // Knöpfe (mit Lade-Ring, wenn sie noch nicht bereit sind)
  const gedrueckt = name => [...finger.values()].some(f => f.art === name);
  const knopf = (name, emoji, laden, farbe) => {
    const k = TOUCH_KNOEPFE[name];
    ctx.fillStyle = gedrueckt(name) ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)';
    kreis(k.x, k.y, k.r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    if (laden < 1) {
      ctx.strokeStyle = farbe; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(k.x, k.y, k.r - 4, -Math.PI / 2, -Math.PI / 2 + laden * Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = laden < 1 ? 0.45 : 1;
    text(emoji, k.x, k.y + 2, k.r * 0.75, '#fff', 'center', false);
    ctx.globalAlpha = 1;
  };
  const mg = m.typ.mg;
  knopf('feuer', mg.salve ? '☄️' : mg.strahl ? '🎯' : '🔫', mg.salve || mg.strahl ? Math.max(0, 1 - m.mgPause / mg.pause) : 1, m.typ.akzent);
  knopf('rakete', '🚀', Math.max(0, 1 - m.raketePause / m.typ.rakete.pause), '#ffd166');
  if (BOOST_AN) knopf('boost', '💨', Math.max(0, 1 - m.boostPause / m.typ.boostPause), '#6fe3ff');
  knopf('pause', '⏸️', 1, '#fff');
}

// ===== Spielschleife =====
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  zeit += dt;
  // Wenn irgendwo ein Fehler passiert, soll das Spiel nicht einfrieren, sondern einfach weiterlaufen.
  // Der Fehler steht dann in der Browser-Konsole (F12), damit man ihn finden kann.
  try { update(dt); } catch (e) { console.error('Fehler in update:', e); }
  try { zeichne(); } catch (e) { console.error('Fehler beim Zeichnen:', e); }
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
