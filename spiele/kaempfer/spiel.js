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
let botUngenau = BOT_UNGENAU;         // Im Storymodus kann das je nach Mission anders sein
const BOT_FEUER_LANGSAMER = 1.5;      // Bots schießen etwas langsamer als du
const MAUS_EMPFINDLICH = 0.0025;      // Wie schnell du dich mit der Maus drehst
const AUGEN_HOEHE = 64;               // Wie hoch das Cockpit ist
const SICHTFELD = 75;                 // Wie viel du siehst (in Grad)
const WAND_HOEHE = 110;               // Wie hoch die Wände sind
const KO_WUCHT = 230;                 // K.o.: So weit wird das Wrack weggeschleudert
const KO_HOCH = 520;                  // K.o.: So hoch fliegt das Wrack

// ===== Die Waffen =====
// Jede Waffe passt nur in einen Slot mit der gleichen Farbe:
//   🔵 laser  = Laser (Strahlen, treffen sofort)
//   🟣 kanone = Kanonen (Kugeln: MG, Minigun, Schrotflinte, Kanone, Railgun)
//   🟢 rakete = Raketen
// Werte: pause = Sekunden zwischen Schüssen, schaden, tempo = wie schnell der Schuss fliegt, weite, streuung = Ungenauigkeit
//   schrot: so viele Kugeln auf einmal    explodiert/radius: der Schuss explodiert    strahl: ein Strahl statt Kugel
//   anzahl: so viele Raketen auf einmal   salve: Raketenhagel (Ziel anvisieren, dann regnet es Raketen)
const SLOT_ARTEN = {
  laser:  { name: 'Laser',   farbe: '#3b82f6', hell: '#93c5fd', punkt: '🔵' },
  kanone: { name: 'Kanone',  farbe: '#a855f7', hell: '#d8b4fe', punkt: '🟣' },
  rakete: { name: 'Raketen', farbe: '#22c55e', hell: '#86efac', punkt: '🟢' },
};
const WAFFEN_LISTE = [
  // 🔵 Laser
  { id: 'laserK', art: 'laser', name: 'Kleiner Laser', text: 'Schnell und genau, macht aber wenig Schaden.',
    strahl: true, laser: true, pause: 0.3, schaden: 8, tempo: 2600, weite: 700, streuung: 0.01 },
  { id: 'puls', art: 'laser', name: 'Pulslaser', text: 'Der Allrounder unter den Lasern.',
    strahl: true, laser: true, pause: 0.45, schaden: 14, tempo: 2600, weite: 900, streuung: 0.01 },
  { id: 'laserG', art: 'laser', name: 'Großer Laser', text: 'Scharfschützen-Laser: trifft ganz weit und ganz hart, lädt aber lange.',
    strahl: true, laser: true, gross: true, pause: 1.1, schaden: 34, tempo: 2600, weite: 1300, streuung: 0 },
  // 🟣 Kanonen
  { id: 'mg', art: 'kanone', name: 'MG', text: 'Ratatat! Schießt schnell und ziemlich genau.',
    pause: 0.2, schaden: 6, tempo: 900, weite: 650, streuung: 0.05 },
  { id: 'minigun', art: 'kanone', name: 'Minigun', text: 'Superschnell, aber ungenau.',
    pause: 0.09, schaden: 3.5, tempo: 850, weite: 600, streuung: 0.1 },
  { id: 'schrot', art: 'kanone', name: 'Schrotflinte', text: '6 Kugeln auf einmal. Ganz nah ist sie super stark!',
    schrot: 6, pause: 0.8, schaden: 6, tempo: 800, weite: 400, streuung: 0.14 },
  { id: 'kanone', art: 'kanone', name: 'Kanone', text: 'Dicke Kugeln, die beim Treffer explodieren.',
    explodiert: true, radius: 50, pause: 1.2, schaden: 24, tempo: 750, weite: 850, streuung: 0.02 },
  { id: 'railgun', art: 'kanone', name: 'Railgun', text: 'Schießt ganz weit und ganz hart, lädt aber lange.',
    strahl: true, pause: 1.6, schaden: 45, tempo: 2600, weite: 1400, streuung: 0 },
  // 🟢 Raketen
  { id: 'rak1', art: 'rakete', name: 'Rakete', text: 'Eine Rakete mit großer Explosion.',
    anzahl: 1, pause: 3.5, schaden: 40, radius: 85 },
  { id: 'rak2', art: 'rakete', name: 'Doppel-Rakete', text: '2 Raketen auf einmal.',
    anzahl: 2, pause: 4.5, schaden: 32, radius: 80 },
  { id: 'rak4', art: 'rakete', name: 'Raketen-Vierer', text: '4 Raketen auf einmal! Lädt aber lange.',
    anzahl: 4, pause: 6, schaden: 26, radius: 75 },
  { id: 'hagel', art: 'rakete', name: 'Raketenhagel', text: 'Ziel anvisieren, dann regnen 10 Raketen vom Himmel! Hoch schauen = weiter weg.',
    salve: true, pause: 7, zielZeit: 0.5, anzahl: 10, abstand: 0.1, schaden: 18, radius: 60, streuRadius: 110, tempo: 750, weite: 1100, minWeite: 180 },
];
const WAFFEN = Object.fromEntries(WAFFEN_LISTE.map(w => [w.id, w]));
// Wo sitzt ein Slot am Mech? (Waffen an den Armen fallen ab, wenn der Arm abgeschossen wird!)
const ORTE = {
  armL:      { name: 'Linker Arm',      seite: -1 },
  armR:      { name: 'Rechter Arm',     seite: 1 },
  torsoL:    { name: 'Brust links',     seite: -0.5 },
  torsoR:    { name: 'Brust rechts',    seite: 0.5 },
  schulterL: { name: 'Schulter links',  seite: -0.6 },
  schulterR: { name: 'Schulter rechts', seite: 0.6 },
};

// ===== Die Mechs =====
// Jeder Mech hat eigene Werte. Hier kannst du sie ändern oder neue Mechs erfinden!
//   leben: Lebenspunkte        tempo: Lauftempo        groesse: wie groß er ist
//   klasse: leicht, medium, heavy oder schwer (siehe KLASSEN)
//   slots: die Waffen-Slots. [Ort, Slot-Art, Waffe, die am Anfang drin ist]
//   sterne: Leben und Tempo für die Anzeige im Menü (1 bis 5). Schaden und Weite rechnet das Spiel selbst aus.
const KLASSEN = [
  { id: 'leicht', name: 'Leicht', emoji: '🪶', text: 'Klein und flink' },
  { id: 'medium', name: 'Medium', emoji: '⚖️', text: 'Gute Mischung' },
  { id: 'heavy',  name: 'Heavy',  emoji: '🏋️', text: 'Groß und stark' },
  { id: 'schwer', name: 'Schwer', emoji: '🗿', text: 'Riesen-Mechs!' },
];
const MECH_TYPEN = [
  // ===== 🪶 Leicht =====
  { id: 'blitz', klasse: 'leicht', name: 'Blitzschlag', emoji: '⚡', akzent: '#facc15', text: 'Superschnell, hält aber wenig aus.',
    dick: 0.8, schulter: 0.8, leben: 80, tempo: 290, groesse: 0.85, boostPause: 1.2,
    slots: [['armL', 'laser', 'laserK'], ['armR', 'kanone', 'mg'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 1, tempo: 5 } },
  { id: 'adler', klasse: 'leicht', name: 'Adlerauge', emoji: '🎯', akzent: '#4ade80', text: 'Scharfschütze! Bleib weit weg und triff von oben.',
    leben: 80, tempo: 160, groesse: 1, boostPause: 2.5,
    slots: [['armR', 'laser', 'laserG'], ['armL', 'kanone', 'mg'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 2, tempo: 3 } },
  { id: 'hornisse', klasse: 'leicht', name: 'Hornisse', emoji: '🐝', akzent: '#fde047', text: 'Flitzt ran und ballert mit 2 Schrotflinten. Ganz nah ist sie gefährlich!',
    leben: 85, tempo: 270, groesse: 0.85, boostPause: 1.5,
    slots: [['armL', 'kanone', 'schrot'], ['armR', 'kanone', 'schrot'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 1, tempo: 5 } },
  // ===== ⚖️ Medium =====
  { id: 'waechter', klasse: 'medium', name: 'Wächter', emoji: '⚙️', akzent: '#e5e7eb', text: 'Der Allrounder. Kann alles ein bisschen!',
    leben: 100, tempo: 170, groesse: 1, boostPause: 2.5,
    slots: [['armL', 'kanone', 'mg'], ['armR', 'kanone', 'mg'], ['torsoR', 'laser', 'laserK'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 3, tempo: 3 } },
  { id: 'feuer', klasse: 'medium', name: 'Feuersturm', emoji: '🔥', akzent: '#fb923c', text: 'Raketen-Profi: 2 grüne Raketen-Slots auf den Schultern!',
    leben: 110, tempo: 150, groesse: 1.1, boostPause: 3,
    slots: [['armL', 'kanone', 'mg'], ['armR', 'laser', 'puls'], ['schulterL', 'rakete', 'rak2'], ['schulterR', 'rakete', 'rak2']],
    sterne: { leben: 3, tempo: 2 } },
  { id: 'rubin', klasse: 'medium', name: 'Rubin', emoji: '💎', akzent: '#f43f5e', text: 'Der Laser-Mech: 3 blaue Laser-Slots!',
    leben: 105, tempo: 175, groesse: 1.05, boostPause: 2.5,
    slots: [['armL', 'laser', 'puls'], ['armR', 'laser', 'puls'], ['torsoL', 'laser', 'laserK'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 3, tempo: 3 } },
  // ===== 🏋️ Heavy =====
  { id: 'koloss', klasse: 'heavy', name: 'Stahlkoloss', emoji: '🛡️', akzent: '#9ca3af', text: 'Riesig und langsam, aber hält extrem viel aus!',
    dick: 1.4, schulter: 1.35, leben: 150, tempo: 120, groesse: 1.3, boostPause: 4,
    slots: [['armL', 'kanone', 'minigun'], ['armR', 'kanone', 'minigun'], ['torsoL', 'laser', 'laserK'], ['torsoR', 'laser', 'laserK'], ['schulterL', 'rakete', 'rak1']],
    sterne: { leben: 5, tempo: 1 } },
  { id: 'artillerie', klasse: 'heavy', name: 'Donnerhagel', emoji: '☄️', akzent: '#c084fc', text: 'Artillerie! Mit dem Raketenhagel regnen 10 Raketen aufs Ziel.',
    leben: 95, tempo: 140, groesse: 1.15, boostPause: 3.5, keinBoost: true,
    slots: [['armL', 'laser', 'puls'], ['armR', 'kanone', 'mg'], ['schulterL', 'rakete', 'hagel'], ['schulterR', 'rakete', 'rak1']],
    sterne: { leben: 3, tempo: 2 } },
  { id: 'nashorn', klasse: 'heavy', name: 'Nashorn', emoji: '🦏', akzent: '#a3e635', text: 'Stürmt nach vorn mit 2 dicken Schrotflinten.',
    leben: 140, tempo: 145, groesse: 1.25, boostPause: 3.5,
    slots: [['armL', 'kanone', 'schrot'], ['armR', 'kanone', 'schrot'], ['torsoR', 'laser', 'laserK'], ['schulterL', 'rakete', 'rak2']],
    sterne: { leben: 4, tempo: 2 } },
  // ===== 🗿 Schwer: die Riesen! =====
  { id: 'titan', klasse: 'schwer', name: 'Titan', emoji: '🏔️', akzent: '#38bdf8', text: 'Gigantisch! 6 Waffen-Slots, aber sehr langsam.',
    leben: 220, tempo: 95, groesse: 1.5, boostPause: 5, keinBoost: true,
    slots: [['armL', 'kanone', 'minigun'], ['armR', 'kanone', 'minigun'], ['torsoL', 'laser', 'puls'], ['torsoR', 'laser', 'puls'], ['schulterL', 'rakete', 'rak2'], ['schulterR', 'rakete', 'rak2']],
    sterne: { leben: 5, tempo: 1 } },
  { id: 'bollwerk', klasse: 'schwer', name: 'Bollwerk', emoji: '🏰', akzent: '#f472b6', text: 'Eine wandelnde Festung mit 3 lila Kanonen-Slots!',
    leben: 260, tempo: 80, groesse: 1.5, boostPause: 5, keinBoost: true,
    slots: [['armL', 'kanone', 'kanone'], ['armR', 'kanone', 'kanone'], ['torsoL', 'kanone', 'mg'], ['torsoR', 'laser', 'laserK'], ['schulterL', 'rakete', 'rak4']],
    sterne: { leben: 5, tempo: 1 } },
  { id: 'vulkan', klasse: 'schwer', name: 'Vulkan', emoji: '🌋', akzent: '#ef4444', text: 'Der Laser-Riese! 4 Laser-Slots und 2 Raketen-Slots.',
    leben: 230, tempo: 90, groesse: 1.5, boostPause: 5, keinBoost: true,
    slots: [['armL', 'laser', 'puls'], ['armR', 'laser', 'laserG'], ['torsoL', 'laser', 'puls'], ['torsoR', 'laser', 'puls'], ['schulterL', 'rakete', 'rak4'], ['schulterR', 'rakete', 'rak2']],
    sterne: { leben: 5, tempo: 1 } },
];
// Aus den Slot-Listen werden Objekte: { ort, art, waffe }
for (const t of MECH_TYPEN) t.slots = t.slots.map(([ort, art, waffe]) => ({ ort, art, waffe }));
const BOT_MECHS = MECH_TYPEN;   // Aus diesen Mechs suchen sich die Bots einen aus

// ===== 🔧 Werkstatt: Deine Umbauten =====
// Für jeden Mech wird gespeichert, welche Waffe in welchem Slot steckt
let umbauten = {};
try { umbauten = JSON.parse(localStorage.getItem('kaempfer-umbauten')) || {}; } catch (e) { /* egal */ }
function umbautenSpeichern() { try { localStorage.setItem('kaempfer-umbauten', JSON.stringify(umbauten)); } catch (e) { /* egal */ } }
// Der Mech mit deinen Waffen drin (nur Waffen, die in den Slot passen!)
function umgebaut(typ) {
  const liste = umbauten[typ.id] || [];
  const slots = typ.slots.map((s, i) => {
    const w = WAFFEN[liste[i]];
    return { ...s, waffe: w && w.art === s.art ? w.id : s.waffe };
  });
  return { ...typ, slots, original: typ };
}
// Wie gut ist ein Mech? (für die Sterne im Menü)
function schadenProSekunde(w) {
  if (w.salve) return w.anzahl * w.schaden / w.pause;
  return (w.schaden * (w.schrot || w.anzahl || 1) * (w.explodiert ? 1.4 : 1)) / w.pause;
}
function mechSterne(typ) {
  const ws = typ.slots.map(s => WAFFEN[s.waffe]).filter(Boolean);
  const dps = ws.reduce((summe, w) => summe + schadenProSekunde(w), 0);
  const weite = Math.max(...ws.filter(w => w.art !== 'rakete').map(w => w.weite), 400);
  const r = n => Math.max(1, Math.min(5, Math.round(n)));
  return { leben: typ.sterne.leben, tempo: typ.sterne.tempo, schaden: r(dps / 28), weite: r(weite / 280) };
}

let meinMech = umgebaut(MECH_TYPEN[0]);   // Den Mech, den du ausgesucht hast (mit deinen Waffen)
try { const t = MECH_TYPEN.find(t => t.id === localStorage.getItem('kaempfer-mech')); if (t) meinMech = umgebaut(t); } catch (e) { /* egal */ }

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

const NAMEN = { blau: ['DU', 'Blitz', 'Titan', 'Funke', 'Komet', 'Nova', 'Falke', 'Pixel'], rot: ['Kralle', 'Donner', 'Rost', 'Viper', 'Schrott', 'Zange', 'Bolzen', 'Ruß'] };
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
const GROSSE_KARTE = { b: 3600, h: 2000 };   // Knockout (und immer große Karten): So groß ist die Arena
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
//   Eis: eisblock, schneehaufen, eiszacke, wrack (abgestürztes Raumschiff), schneehuegel (zum Draufstehen), schneehang (Rampe)
//   Dschungel: baum, busch, dschungelfels, ruine, tempel (zum Draufstehen), tempeltreppe (Rampe)
//   Strand: palme, strandfels, boot, huette
// "immerGross: true" heißt: Die Karte ist in jedem Modus groß (3600 x 2000). Dann gibt es nur "links" und "mitte".
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
  {
    id: 'eis', name: 'Eisplanet Frostheim', emoji: '❄️',
    links: [
      { x: 300, y: 280, w: 160, h: 60, art: 'eisblock', auchUnten: true },
      { x: 420, y: 600, w: 60, h: 200, art: 'wrack' },
      { x: 990, y: 650, w: 40, h: 100, art: 'schneehaufen' },
      { x: 1100, y: 250, w: 60, h: 60, art: 'schneehaufen', auchUnten: true },
      { x: 960, y: 470, w: 50, h: 50, art: 'eiszacke', auchUnten: true },
      // Schneehügel zum Draufklettern, mit zwei Hängen
      { x: 560, y: 160, w: 260, h: 200, art: 'schneehuegel', oben: 100, auchUnten: true },
      { x: 600, y: 360, w: 120, h: 160, art: 'schneehang', rampe: 'n', oben: 100, auchUnten: true },
      { x: 820, y: 160, w: 140, h: 200, art: 'schneehang', rampe: 'w', oben: 100, auchUnten: true },
    ],
    mitte: [{ x: 1150, y: 230, w: 100, h: 140, art: 'eisblock', auchUnten: true }],
    // Die große Version für Knockout (3600 x 2000, Mitte bei 1800 / 1000)
    grossLinks: [
      { x: 420, y: 320, w: 200, h: 70, art: 'eisblock', auchUnten: true },
      { x: 520, y: 880, w: 70, h: 240, art: 'wrack' },
      { x: 760, y: 640, w: 50, h: 50, art: 'schneehaufen', auchUnten: true },
      { x: 900, y: 480, w: 60, h: 60, art: 'eiszacke', auchUnten: true },
      { x: 1000, y: 60, w: 320, h: 240, art: 'schneehuegel', oben: 100, auchUnten: true },
      { x: 1000, y: 300, w: 140, h: 240, art: 'schneehang', rampe: 'n', oben: 100, auchUnten: true },
      { x: 1320, y: 60, w: 220, h: 200, art: 'schneehang', rampe: 'w', oben: 100, auchUnten: true },
      { x: 1260, y: 700, w: 70, h: 200, art: 'eisblock', auchUnten: true },
      { x: 1500, y: 560, w: 60, h: 60, art: 'eiszacke', auchUnten: true },
      { x: 1520, y: 940, w: 80, h: 120, art: 'wrack' },
    ],
    grossMitte: [
      { x: 1750, y: 480, w: 100, h: 200, art: 'eisblock', auchUnten: true },
      { x: 1780, y: 980, w: 40, h: 40, art: 'schneehaufen' },
    ],
  },
  {
    id: 'dschungel', name: 'Dschungel & Strand', emoji: '🌴', immerGross: true,
    // Oben dichter Dschungel, unten ab y = 1350 ein offener Sandstrand. Mitte: 1800 / 1000, Punkt B: 1170 / 1000
    links: [
      // Riesige Urwaldbäume
      { x: 330, y: 140, w: 60, h: 60, art: 'baum' }, { x: 520, y: 420, w: 60, h: 60, art: 'baum' },
      { x: 250, y: 640, w: 60, h: 60, art: 'baum' }, { x: 720, y: 230, w: 60, h: 60, art: 'baum' },
      { x: 880, y: 560, w: 60, h: 60, art: 'baum' }, { x: 1020, y: 170, w: 60, h: 60, art: 'baum' },
      { x: 1250, y: 430, w: 60, h: 60, art: 'baum' }, { x: 1480, y: 330, w: 60, h: 60, art: 'baum' },
      { x: 1580, y: 620, w: 60, h: 60, art: 'baum' }, { x: 560, y: 800, w: 60, h: 60, art: 'baum' },
      { x: 860, y: 1190, w: 60, h: 60, art: 'baum' }, { x: 1380, y: 760, w: 60, h: 60, art: 'baum' },
      { x: 420, y: 1060, w: 60, h: 60, art: 'baum' }, { x: 1560, y: 1200, w: 60, h: 60, art: 'baum' },
      // Dichte Büsche (Deckung)
      { x: 400, y: 290, w: 100, h: 60, art: 'busch' }, { x: 640, y: 600, w: 110, h: 60, art: 'busch' },
      { x: 900, y: 380, w: 100, h: 60, art: 'busch' }, { x: 1110, y: 620, w: 100, h: 60, art: 'busch' },
      { x: 1340, y: 540, w: 100, h: 60, art: 'busch' }, { x: 300, y: 430, w: 80, h: 70, art: 'busch' },
      { x: 740, y: 960, w: 100, h: 60, art: 'busch' }, { x: 520, y: 1220, w: 110, h: 60, art: 'busch' },
      { x: 1480, y: 880, w: 100, h: 60, art: 'busch' }, { x: 1200, y: 1220, w: 100, h: 60, art: 'busch' },
      // Moosige Felsen und alte Ruinen
      { x: 1150, y: 760, w: 80, h: 60, art: 'dschungelfels' }, { x: 600, y: 1090, w: 90, h: 70, art: 'dschungelfels' },
      { x: 990, y: 940, w: 40, h: 170, art: 'ruine' }, { x: 1440, y: 1040, w: 170, h: 40, art: 'ruine' },
      { x: 700, y: 700, w: 180, h: 40, art: 'ruine' },
      // Tempel zum Draufklettern (mit Treppe)
      { x: 1150, y: 60, w: 380, h: 220, art: 'tempel', oben: 110 },
      { x: 1150, y: 280, w: 140, h: 200, art: 'tempeltreppe', rampe: 'n', oben: 110 },
      // ===== Der Strand (offen, nur ein paar Sachen) =====
      { x: 300, y: 1500, w: 24, h: 24, art: 'palme' }, { x: 620, y: 1720, w: 24, h: 24, art: 'palme' },
      { x: 950, y: 1460, w: 24, h: 24, art: 'palme' }, { x: 1250, y: 1800, w: 24, h: 24, art: 'palme' },
      { x: 1550, y: 1560, w: 24, h: 24, art: 'palme' }, { x: 460, y: 1880, w: 24, h: 24, art: 'palme' },
      { x: 800, y: 1600, w: 70, h: 50, art: 'strandfels' }, { x: 1400, y: 1700, w: 80, h: 60, art: 'strandfels' },
      { x: 1050, y: 1640, w: 160, h: 60, art: 'boot' },
      { x: 180, y: 1700, w: 110, h: 100, art: 'huette' },
    ],
    mitte: [
      { x: 1700, y: 90, w: 200, h: 190, art: 'tempel', oben: 140 },
      { x: 1740, y: 280, w: 120, h: 220, art: 'tempeltreppe', rampe: 'n', oben: 140 },
      { x: 1760, y: 1240, w: 80, h: 60, art: 'dschungelfels' },
      { x: 1740, y: 1620, w: 120, h: 80, art: 'strandfels' },
    ],
  },
];
const STANDARD_HOEHE = { wand: 110, kiste: 40, fels: 100, kristall: 130, pilz: 150, stein: 40, saeule: 100, eisblock: 110, schneehaufen: 40, eiszacke: 130, wrack: 90,
  baum: 400, busch: 60, dschungelfels: 90, ruine: 110, palme: 220, strandfels: 55, boot: 50, huette: 120 };
const DRAUFSTEHEN = ['plattform', 'huegel', 'schneehuegel', 'tempel'];
const STRAND_AB = 1350;   // Dschungel-Karte: Ab hier (nach unten) ist Sandstrand   // Auf diesen Blöcken kann man oben stehen
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
  laser(laut = 1) { ton(1500, 0, 0.14, 'square', 0.05 * laut, 400); ton(2200, 0, 0.08, 'sine', 0.04 * laut, 900); },
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
let zustand = 'titel';   // 'titel', 'auswahl', 'werkstatt', 'spiel', 'ende'
let modus = 'punkt';
let mechs = [], spieler = null, schuesse = [], partikel = [], killfeed = [];
let ziele = [], aktivesZiel = 0, angreifer = 'blau', verteidiger = 'rot';
let punkte = { blau: 0, rot: 0 };
let restZeit = 0, countdown = 0, verlaengerung = false;
let nachricht = null, ende = null, pause = false;
let runde = 1, rundePause = 0, zuschauen = null;   // Für Knockout
let maus = { x: W / 2, y: H / 2, links: false, rechts: false };
let blick = { links: 0, hoch: 0 };   // Wohin du schaust (Drehung und Neigung)
let wackeln = 0, rueckstoss = 0, muendungsZeit = 0;
let letzterSchuss = { ort: 'armR', farbe: '#ffd166' };   // Für das Mündungsfeuer im Cockpit
// 🌐 Multiplayer-Zustand (siehe "Online-Multiplayer" weiter unten)
const mp = { aktiv: false, rolle: null, code: '', peer: null, conn: null, gaeste: new Map(), liste: [], meineId: null, verbinde: false, status: '',
  einst: { karte: 'fabrik', modus: 'team', bots: 2, gesperrt: [] }, ich: { team: 'blau', mech: 'waechter' },
  sendeT: 0, ereignisse: [], schussNr: 0, schuesse: new Map(), feuer: false, rakete: false };
let trefferAnzeige = 0, trefferRichtungen = [];
let zeit = 0;
const tasten = {};

function zeigeNachricht(t, dauer = 2.5, farbe = '#ffd166') { nachricht = { text: t, t: dauer, farbe }; }

// ===== Rückmeldungen für den Menschen, der einen Mech steuert =====
// Im Multiplayer schickt der Gastgeber sie an den richtigen Mitspieler weiter.
function fuerMensch(m, art, ...daten) {
  if (!m) return;
  if (m.istSpieler) persoenlich(art, daten);
  else if (m.mensch && mp.rolle === 'host') mpEreignis(['p', mechs.indexOf(m), art, ...daten]);
}
function persoenlich(art, d) {   // Passiert bei dir, an deinem Mech
  if (art === 'au') {   // Du wurdest getroffen
    wackeln = Math.max(wackeln, 4);
    sound.autsch();
    const von = mechs[d[0]];
    if (von) trefferRichtungen.push({ von: { x: von.x, y: von.y }, t: 1 });
  } else if (art === 'hit') { trefferAnzeige = 0.12; sound.treffer(); }   // Du hast getroffen
  else if (art === 'msg') zeigeNachricht(d[0], d[2] || 2, d[1]);
  else if (art === 'abschuss') { sound.abschuss(); zeigeNachricht(d[0], 1.5, '#4ade80'); }
  else if (art === 'ziel') { sound.anvisieren(); zeigeNachricht('🎯 Ziel erfasst!', 1.2, d[0]); }
  else if (art === 'rueck') {   // Rückstoß und Mündungsfeuer, wenn du schießt
    rueckstoss = Math.max(rueckstoss, d[0]);
    if (d[1]) { muendungsZeit = d[3] || 0.05; letzterSchuss = { ort: d[1], farbe: d[2] }; }
  }
}
// Meldungen, die für ein Team gut und für das andere schlecht sind
function teamMeldung(art, team, extra = 0) {
  if (mp.rolle === 'host') mpEreignis(['t', art, team, extra]);
  const gut = team === spieler.team;
  if (art === 'punkt') { sound.erobert(gut); zeigeNachricht(gut ? '🚩 Dein Team hat den Punkt erobert!' : '⚠️ Die Gegner haben den Punkt erobert!', 2.5, gut ? '#4ade80' : '#ff6b6b'); }
  else if (art === 'A') { sound.erobert(gut); zeigeNachricht(gut ? `✅ Punkt A erobert! Weiter zu B! (+${ANGRIFF_BONUS} s)` : '⚠️ Punkt A ist verloren! Verteidigt B!', 3, gut ? '#4ade80' : '#ff6b6b'); }
  else if (art === 'B') sound.erobert(gut);
  else if (art === 'verl') zeigeNachricht('⏰ VERLÄNGERUNG!', 2, '#ff9f43');
  else if (art === 'runde') {
    if (!team) zeigeNachricht('🤝 Unentschieden! Keiner kriegt einen Punkt.', 3.5, '#fff');
    else { zeigeNachricht(gut ? `🏆 Runde ${extra} gewonnen!` : `💀 Runde ${extra} verloren!`, 3.5, gut ? '#4ade80' : '#ff6b6b'); sound.erobert(gut); }
  }
}
// Warnung vor einem Raketenhagel (alle, die drunter stehen und im anderen Team sind)
function hagelWarnung(x, y, r, team) {
  if (mp.rolle === 'host') mpEreignis(['w', Math.round(x), Math.round(y), r, team]);
  if (spieler && !spieler.tot && team !== spieler.team && dist({ x, y }, spieler) < r + 150) {
    sound.warnung(); zeigeNachricht('⚠️ Raketenhagel! Lauf weg!', 1.5, '#ff6b6b');
  }
}

function neuerMech(team, nr, istSpieler, typ) {
  return {
    team, nr, istSpieler, typ, name: NAMEN[team][nr],
    x: 0, y: 0, z: 0, vz: 0, vx: 0, vy: 0, teile: neueTeile(typ), zielHoch: 0, tot: false, totZeit: 0, neustart: 0, schutz: 0,
    zielWinkel: team === 'blau' ? 0 : Math.PI, laufWinkel: 0, phase: 0, laeuft: false,
    waffen: neueWaffen(typ), boostPause: 0, boostZeit: 0, boostRichtung: 0,
    seitHit: 99, blitz: 0, lauf: 1, abschuesse: 0, tode: 0,
    // Für die Bots:
    weg: [], wegZeit: 0, gegner: null, suchZeit: 0, reaktion: 0, versatz: null, seed: Math.random() * 10, festT: 0, altPos: null,
  };
}

function spawnPunkt(m) {
  let x = m.team === 'blau' ? 130 : WELT_B - 130;
  // Angreifer starten weiter vorne, wenn Punkt A erobert ist
  if ((modus === 'angriff' || modus === 'verteidigung') && m.team === angreifer && aktivesZiel === 1) x = m.team === 'blau' ? WELT_B * 0.3 : WELT_B * 0.7;
  if (storyMission && storyMission.startX && m.team === 'blau') x = WELT_B * storyMission.startX;   // Im Prolog startest du mitten im Kampf
  const n = mechs.filter(o => o.team === m.team).length;
  return { x, y: WELT_H / 2 + (m.nr - (n - 1) / 2) * 85 };   // Nicht zu weit auseinander, sonst steht man hinter einer Wand
}
function spawnen(m) {
  m.spawnNr = (m.spawnNr || 0) + 1;   // Zählt mit, wie oft der Mech neu gestartet ist (für den Multiplayer)
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

// Wer spielt mit? Normal: Du + 3 Bots gegen 4 Bots. Storymodus und Multiplayer geben eine eigene Aufstellung mit.
//   aufstellung: Liste von { team, typ, name?, mensch? (Multiplayer-Spieler-ID), ich? (das bist du) }
function standardAufstellung() {
  const liste = [];
  for (const team of ['blau', 'rot']) for (let i = 0; i < TEAM_GROESSE; i++) {
    const ich = team === 'blau' && i === 0;
    liste.push({ team, typ: ich ? meinMech : zufall(BOT_MECHS), ich });
  }
  return liste;
}
function neuesSpiel(id, aufstellung = null) {
  modus = id;
  ladeKarte(karte, modus === 'knockout' || !!karte.immerGross);   // Knockout hat eine große Karte
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
    ziele = [{ x: WELT_B / 2, y: WELT_H / 2, r: 140, name: '🚩', besitzer: null, wer: null, fortschritt: 0 }];
    restZeit = 300;
  } else if (modus === 'team') {
    restZeit = 300;
  } else if (modus === 'boss') {
    restZeit = BOSS_ZEIT;
  } else if (modus === 'flucht') {   // 🏃 Flucht: Lauf zum Landeplatz (oben links)!
    ziele = [{ x: WELT_B * 0.07, y: WELT_H * 0.14, r: 110, name: '🛬 Landeplatz', fortschritt: 0, versteckt: true }];
    restZeit = 150;
  } else if (modus === 'knockout') {
    restZeit = KNOCKOUT_ZEIT;
    runde = 1; rundePause = 0; zuschauen = null;
  } else {
    angreifer = modus === 'angriff' ? 'blau' : 'rot';
    verteidiger = anderes(angreifer);
    ziele = [
      { x: WELT_B / 2, y: WELT_H / 2, r: 130, name: 'A', fortschritt: 0, erobert: false },
      { x: angreifer === 'blau' ? WELT_B * 0.675 : WELT_B * 0.325, y: WELT_H / 2, r: 120, name: 'B', fortschritt: 0, erobert: false },
    ];
    restZeit = ANGRIFF_ZEIT;
  }
  const nr = { blau: 0, rot: 0 };
  for (const a of aufstellung || standardAufstellung()) {
    const m = neuerMech(a.team, nr[a.team]++, !!a.ich, a.typ);
    if (a.name) m.name = a.name;
    if (a.ich) m.name = a.name || 'DU';
    m.mensch = a.mensch || null;   // Multiplayer: Ein Mensch steuert diesen Mech
    m.unverwundbar = !!a.unverwundbar;   // Storymodus: Manche Mechs kann man (noch) nicht kaputt machen
    m.keinNeustart = !!a.keinNeustart;
    m.boss = !!a.typ.boss;
    mechs.push(m);
  }
  spieler = mechs.find(m => m.istSpieler);
  for (const m of mechs) { spawnen(m); m.g3 = baueMech(m); szene.add(m.g3.gruppe); }
  baueZiele();
  baueWaffen(spieler.typ);
  countdown = 0;
  zustand = 'spiel';
  if (intro) for (const s of intro.schiffe) szene.remove(s.gruppe);   // Altes Intro wegräumen
  introStarten();   // 🎬 Erst das Intro, danach der Countdown
  mausFangen();
}

function beende(sieger, grund) {
  if (zustand !== 'spiel') return;
  zustand = 'ende';
  ende = { sieger, grund, seit: zeit };
  if (mp.rolle === 'host') { mpSchnappschussSenden(); mpAnAlle({ t: 'ende', s: sieger, g: grund }); }
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
  const hoehe = MECH_HOEHE * Math.min(m.typ.groesse, 1.4);   // Riesen ducken sich unter Brücken
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
// Jeder Mech hat eine Liste m.waffen: Jeder Slot hat seine Waffe und lädt selbst nach.
//   Linksklick = alle 🔵 Laser und 🟣 Kanonen    Rechtsklick / Q = alle 🟢 Raketen
function neueWaffen(typ) {
  return typ.slots.filter(s => WAFFEN[s.waffe]).map(s => ({ ort: s.ort, art: s.art, w: WAFFEN[s.waffe], pause: s.art === 'rakete' ? 1 : 0 }));   // Leere Slots schießen nicht
}
const slotGeht = (m, s) => !(s.ort === 'armL' || s.ort === 'armR') || hat(m, s.ort);   // Arm ab = Waffe weg
const hagelVon = m => m.waffen.find(s => s.w.salve);                                    // Hat der Mech einen Raketenhagel?
const hauptWaffe = m => (m.waffen.find(s => s.art !== 'rakete' && slotGeht(m, s)) || m.waffen[0]).w;   // Für die Bots
function feuern(m, gruppe = 'haupt') {
  if (m.tot) return;
  for (const s of m.waffen) {
    if (s.pause > 0 || !slotGeht(m, s)) continue;
    if ((s.art === 'rakete') !== (gruppe === 'rakete')) continue;
    if (s.w.salve && m.salve) continue;   // Es regnet schon Raketen
    s.pause = s.w.pause * (m.istSpieler || m.mensch || s.w.salve ? 1 : BOT_FEUER_LANGSAMER);   // Bots laden etwas langsamer
    if (s.w.salve) salveStarten(m, s.w);
    else if (s.art === 'rakete') rakete(m, s);
    else schiessen(m, s);
  }
}
// Wo kommt der Schuss raus? (seite: -1 = links, 1 = rechts)
function muendung(m, s, vorne = 40) {
  const gr = m.typ.groesse, seite = ORTE[s.ort].seite;
  const cos = Math.cos(m.zielWinkel), sin = Math.sin(m.zielWinkel);
  const oben = s.ort.startsWith('schulter') ? 30 : s.ort.startsWith('torso') ? 10 : 0;
  return {
    x: m.x + cos * vorne * gr - sin * 15 * gr * seite,
    y: m.y + sin * vorne * gr + cos * 15 * gr * seite,
    h: m.z + (m.istSpieler || m.mensch ? AUGEN_HOEHE - 8 : 52 + oben) * gr,   // Menschen schießen dahin, wo ihr Fadenkreuz ist
  };
}
function schiessen(m, s) {
  const w = s.w;
  const { x, y, h } = muendung(m, s);
  const art = w.strahl ? 'strahl' : w.explodiert ? 'granate' : 'kugel';   // Granaten explodieren beim Aufprall
  for (let i = 0; i < (w.schrot || 1); i++) {   // Schrotflinte: viele Kugeln auf einmal!
    const wi = m.zielWinkel + (Math.random() - 0.5) * 2 * w.streuung;
    const hoch = m.zielHoch + (Math.random() - 0.5) * 2 * w.streuung * 0.5;   // nach oben oder unten zielen
    const flach = Math.cos(hoch) * w.tempo;
    schuesse.push({ art, laser: w.laser, x, y, h, vx: Math.cos(wi) * flach, vy: Math.sin(wi) * flach, vh: Math.sin(hoch) * w.tempo, rest: w.weite, schaden: w.schaden, radius: w.radius, team: m.team, von: m });
  }
  const laut = m.istSpieler ? 1 : lautBei(m) * 0.6;
  if (w.laser) sound.laser(laut * (w.gross ? 1.5 : 1)); else if (w.strahl) sound.railgun(laut); else if (w.explodiert) sound.salve(laut * 1.5); else if (w.schrot) sound.boom(laut * 0.35); else sound.mg(laut);
  const dick = (w.strahl && w.gross) || w.id === 'railgun' || w.explodiert || w.schrot;
  if (m.istSpieler || m.mensch) fuerMensch(m, 'rueck', dick ? 10 : w.laser ? 4 : 3, s.ort, w.laser ? SLOT_ARTEN.laser.hell : w.strahl ? '#a7f3d0' : '#ffd166', dick ? 0.1 : 0.05);
  if (!m.istSpieler) partikel.push({ x, y, h, vh: 0, vx: 0, vy: 0, t: 0.05, max: 0.05, farbe: w.laser ? SLOT_ARTEN.laser.hell : w.strahl ? '#a7f3d0' : '#ffe08a' });   // Mündungsfeuer
}

// ☄️ Raketenhagel: Ziel anvisieren ... und dann regnet es Raketen!
function landePunkt(m) {
  const w = hagelVon(m).w;
  const weite = begrenzt(m.zielWeite || 500, w.minWeite, w.weite);
  return {
    x: begrenzt(m.x + Math.cos(m.zielWinkel) * weite, 10, WELT_B - 10),
    y: begrenzt(m.y + Math.sin(m.zielWinkel) * weite, 10, WELT_H - 10),
  };
}
function salveStarten(m, w) {
  m.salve = { w, ziel: landePunkt(m), warten: w.zielZeit, rest: w.anzahl, timer: 0, laengste: 0, bemerkt: new Map() };
  fuerMensch(m, 'ziel', m.typ.akzent);
  hagelWarnung(m.salve.ziel.x, m.salve.ziel.y, w.streuRadius, m.team);
}
function updateSalve(m, dt) {
  const sv = m.salve, w = sv.w;
  if (sv.warten > 0) { sv.warten -= dt; return; }   // Erst kurz anvisieren ...
  sv.timer -= dt;
  while (sv.timer <= 0 && sv.rest > 0) {             // ... dann eine Rakete nach der anderen!
    salvenRakete(m, sv.ziel);
    sv.rest--;
    sv.timer += w.abstand;
  }
  if (sv.rest <= 0) {   // Warten, bis die letzte Rakete gelandet ist
    sv.aus = (sv.aus === undefined ? sv.laengste : sv.aus) - dt;
    if (sv.aus <= 0) m.salve = null;
  }
}
let letzterPfiff = 0;
function salvenRakete(m, ziel) {
  const w = m.salve.w, gr = m.typ.groesse;
  const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * w.streuRadius;   // irgendwo im Kreis
  const zx = begrenzt(ziel.x + Math.cos(a) * r, 10, WELT_B - 10), zy = begrenzt(ziel.y + Math.sin(a) * r, 10, WELT_H - 10);
  const slot = m.waffen.find(s => s.w === w);
  const p = muendung(m, slot, 5);
  const x = p.x, y = p.y, h = m.z + 90 * gr;
  const weite = Math.hypot(zx - x, zy - y);
  const dauer = 0.6 + weite / w.tempo;
  const zh = standHoehe(zx, zy, 1e6);   // landet z. B. auf der Brücke, wenn sie drüber ist
  schuesse.push({
    art: 'salve', bogen: true, x, y, sx: x, sy: y, zx, zy, zh, h, startH: h,
    k: 0, dauer, scheitel: 220 + weite * 0.3,
    vx: 0, vy: 0, rest: 1e9, schaden: w.schaden, radius: w.radius, team: m.team, von: m,
  });
  m.salve.laengste = Math.max(m.salve.laengste, dauer + 0.1);
  partikel.push({ x, y, h, vh: 40, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 0.8, max: 0.8, farbe: '#999999', rauch: true });
  sound.salve(m.istSpieler ? 1 : lautBei(m));
  fuerMensch(m, 'rueck', 4);
}

function rakete(m, s) {
  const r = s.w, p = muendung(m, s, 20);
  for (let i = 0; i < r.anzahl; i++) {   // Mehrere Raketen fliegen im Fächer
    const w = m.zielWinkel + (i - (r.anzahl - 1) / 2) * 0.1;
    const flach = Math.cos(m.zielHoch) * RAKETE_TEMPO;
    schuesse.push({ art: 'rakete', x: p.x, y: p.y, h: m.z + 75 * m.typ.groesse, vx: Math.cos(w) * flach, vy: Math.sin(w) * flach, vh: Math.sin(m.zielHoch) * RAKETE_TEMPO, rest: RAKETE_WEITE, schaden: r.schaden, radius: r.radius, team: m.team, von: m });
  }
  sound.rakete(m.istSpieler ? 1 : lautBei(m));
  fuerMensch(m, 'rueck', 8);
}

function explosion(x, y, team, von, radius = 85, schadenMax = 40, h = 30) {
  explosionEffekt(x, y, h, radius);
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
function explosionEffekt(x, y, h, radius) {   // Nur das Aussehen und der Knall (keinen Schaden)
  if (mp.rolle === 'host') mpEreignis(['b', Math.round(x), Math.round(y), Math.round(h), Math.round(radius)]);
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
}

function funken(x, y, h, farbe) {
  if (mp.rolle === 'host') mpEreignis(['f', Math.round(x), Math.round(y), Math.round(h), farbe]);
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
    partikel.push({ x, y, h, vh: Math.random() * 150, g: 500, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.3, max: 0.3, farbe });
  }
}

// teil: welches Teil getroffen wurde ('explosion' = alle ein bisschen)
function schaden(m, menge, von, teil = 'mitte') {
  if (m.tot || m.schutz > 0 || m.unverwundbar || zustand !== 'spiel') return;
  if (teil === 'explosion') for (const [id, f] of Object.entries(EXPLOSION_VERTEILUNG)) teilSchaden(m, id, menge * f, von);
  else teilSchaden(m, teil, menge, von);
  m.blitz = 0.08;
  m.seitHit = 0;
  fuerMensch(m, 'au', von ? mechs.indexOf(von) : -1);   // Autsch!
  if (von) fuerMensch(von, 'hit');                       // Treffer-Kreuz für den Schützen
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
  fuerMensch(m, 'msg', `⚠️ ${TEILE[id].name} ab!`, '#ff6b6b', 2);
  if (von) fuerMensch(von, 'msg', `💥 ${TEILE[id].name} abgeschossen!`, '#4ade80', 1.5);
}

function zerstoert(m, von) {
  m.tot = true;
  m.totZeit = 0;
  m.salve = null;
  m.neustart = modus === 'knockout' || m.boss || m.keinNeustart ? Infinity : NEUSTART_ZEIT;   // Im Knockout (und der Boss) kommt man nicht wieder
  m.tode++;
  m.zerstoertVon = von;
  wrackStarten(m, von);
  if (von) {
    von.abschuesse++;
    if (modus === 'team') punkte[von.team]++;
    fuerMensch(von, 'abschuss', `💥 ${m.name} zerstört!`);
  }
  killfeedDazu(von, m);
  if (mp.rolle === 'host') mpEreignis(['k', mechs.indexOf(von), mechs.indexOf(m)]);
}
function wrackStarten(m, von, mitKnall = true) {
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
  if (mitKnall) explosion(m.x, m.y, null, null, 85, 0, m.z + 30);
  for (let i = 0; i < 8; i++) {   // Schrottteile fliegen weg
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    partikel.push({ x: m.x, y: m.y, h: m.z + 40, vh: 150 + Math.random() * 200, g: 600, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 1.2, max: 1.2, farbe: TEAMS[m.team].dunkel, rauch: true });
  }
}
function killfeedDazu(von, opfer) {
  killfeed.unshift({ von, opfer, t: 5 });
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
        if (s.art === 'rakete' || s.art === 'granate') explosion(zx, zy, s.team, s.von, s.radius, s.schaden, zh);
        else funken(zx, zy, zh, '#ffe08a');
        break;
      }
      for (const m of mechs) {
        if (m.tot || m.team === s.team || dist(m, s) > MECH_RADIUS * m.typ.groesse) continue;
        if (s.h < m.z - 5 || s.h > m.z + 80 * m.typ.groesse) continue;   // drüber oder drunter vorbei
        s.weg = true;
        if (s.art === 'rakete' || s.art === 'granate') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden, s.h);
        else { schaden(m, s.schaden, s.von, trefferTeil(m, s.x, s.y, s.h)); funken(s.x, s.y, s.h, m.schutz > 0 ? '#93c5fd' : '#ffffff'); }
        break;
      }
      if (!s.weg && s.rest <= 0) {
        s.weg = true;
        if (s.art === 'rakete' || s.art === 'granate') explosion(s.x, s.y, s.team, s.von, s.radius, s.schaden, s.h);
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
  const hagel = hagelVon(m);
  if (hagel) {   // Raketenhagel: Je höher du schaust, desto weiter weg ist das Ziel
    const w = hagel.w;
    m.zielWeite = w.minWeite + (blick.hoch + 0.5) / 0.9 * (w.weite - w.minWeite);
  }
  const linksFeuer = maus.links && !pause, raketenFeuer = (maus.rechts || tasten['q'] || tasten['e'] || touch.rakete) && !pause;
  if (mp.rolle === 'gast') { mp.feuer = linksFeuer; mp.rakete = raketenFeuer; return; }   // 🌐 Der Gastgeber schießt für dich
  if (linksFeuer) feuern(m, 'haupt');
  if (raketenFeuer) feuern(m, 'rakete');
}

// ===== Die Computer-Mechs (Bots) =====
function zaehleIn(team, z) { return mechs.filter(m => !m.tot && m.team === team && dist(m, z) < z.r).length; }

// Wohin will der Bot gerade?
function botZiel(m) {
  if (modus === 'team' || modus === 'knockout' || modus === 'boss' || modus === 'flucht') {
    const gegner = mechs.filter(o => !o.tot && o.team !== m.team).sort((a, b) => dist(a, m) - dist(b, m))[0];
    return gegner || { x: WELT_B / 2, y: WELT_H / 2 };
  }
  // Scharfschützen und Artillerie stellen sich manchmal auf eine Plattform oder einen Hügel
  if ((hauptWaffe(m).weite > 1000 || hagelVon(m)) && m.seed > 4) {
    const hoch = WAENDE.filter(b => DRAUFSTEHEN.includes(b.art) && (b.x + b.w / 2 < WELT_B / 2) === (m.team === 'blau'));
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
    let bester = null, besterD = begrenzt(hauptWaffe(m).weite, 600, 1000);   // Scharfschützen schauen weiter
    for (const o of mechs) {
      if (o.tot || o.team === m.team) continue;
      const d = dist(m, o);
      const sichtbar = sicht(m, o) || (hagelVon(m) && mechs.some(f => !f.tot && f.team === m.team && f !== m && dist(f, o) < 700 && sicht(f, o)));
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
    const hw = hauptWaffe(m);
    const abstand = hw.weite > 1000 || hagelVon(m) ? 450 : hw.schrot ? 120 : 220;   // Scharfschützen und Artillerie bleiben lieber weit weg
    if (d < abstand) { dx -= gx * 0.8; dy -= gy * 0.8; }   // Nicht zu nah ran
    // Zielen (mit Vorhalten, damit sie bewegte Ziele treffen)
    const flug = d / hw.tempo;   // Wo ist der Gegner, wenn der Schuss ankommt?
    const vorne = { x: g.x + g.vx * flug, y: g.y + g.vy * flug };   // Da wird der Gegner gleich sein
    const zielW = Math.atan2(vorne.y - m.y, vorne.x - m.x) + (Math.sin(zeit * 7 + m.seed * 3)) * botUngenau;
    m.zielWeite = dist(m, vorne);
    m.zielHoch = Math.atan2((g.z + 40 * g.typ.groesse) - (m.z + 52 * m.typ.groesse), Math.max(1, dist(m, vorne)));   // hoch oder runter zielen
    m.zielWinkel = drehe(m.zielWinkel, zielW, dt * 7);
    m.reaktion -= dt;
    if (m.reaktion <= 0 && Math.abs(winkelDiff(m.zielWinkel, zielW)) < 0.25) {
      if (d < hw.weite + 50) feuern(m, 'haupt');
      if (d < (hagelVon(m) ? 1000 : 550) && Math.random() < dt * 0.8) {
        if (hagelVon(m)) m.zielWeite = dist(m, { x: g.x + g.vx * 1.2, y: g.y + g.vy * 1.2 });   // Raketenhagel: dahin, wo er gleich ist
        feuern(m, 'rakete');
      }
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
    if (d > o.salve.w.streuRadius + 60) continue;
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
  if (storyMission && storyMission.skript) {   // 📖 Was in dieser Mission Besonderes passiert
    storyMission.skriptZeit = (storyMission.skriptZeit || 0) + dt;
    storyMission.skript(storyMission.skriptZeit, dt);
  }
  if (funk) { funk.t -= dt; if (funk.t <= 0) funk = null; }
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
        teamMeldung('punkt', allein);
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
  } else if (modus === 'flucht') {   // 🏃 Flucht: Erreiche den Landeplatz!
    const z = ziele[0];
    if (spieler.tot) beende(anderes(spieler.team), 'Sie haben dich erwischt ...');
    else if (!z.versteckt && dist(spieler, z) < z.r) beende(spieler.team, 'Du bist entkommen!');
    restZeit -= dt;
    if (restZeit <= 0) beende(anderes(spieler.team), 'Zu spät – der Landeplatz ist weg ...');
  } else if (modus === 'boss') {   // 👑 Bosskampf: Besiege den Boss, bevor die Zeit abläuft!
    const boss = mechs.find(m => m.boss);
    if (boss && boss.tot) beende(anderes(boss.team), `${boss.name} ist besiegt!`);
    restZeit -= dt;
    if (restZeit <= 0) beende(boss ? boss.team : 'rot', 'Die Zeit ist um – der Boss ist entkommen!');
  } else if (modus === 'team') {
    if (punkte.blau >= abschussZiel) beende('blau', `${TEAMS.blau.name} hat zuerst ${abschussZiel} Mechs zerstört!`);
    else if (punkte.rot >= abschussZiel) beende('rot', `${TEAMS.rot.name} hat zuerst ${abschussZiel} Mechs zerstört!`);
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
      if (aktivesZiel === 0) {
        aktivesZiel = 1;
        restZeit += ANGRIFF_BONUS;
        verlaengerung = false;
        teamMeldung('A', angreifer);
        for (const m of mechs) m.wegZeit = 0;
      } else {
        teamMeldung('B', angreifer);
        beende(angreifer, 'Die Angreifer haben beide Punkte erobert!');
        return;
      }
    }
    restZeit -= dt;
    if (restZeit <= 0) {
      restZeit = 0;
      if (a > 0) {   // Verlängerung: Solange Angreifer auf dem Punkt stehen, geht es weiter!
        if (!verlaengerung) teamMeldung('verl', null);
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
  teamMeldung('runde', sieger, runde);
  rundePause = 4;
}
function neueRunde() {
  runde++;
  for (const m of mechs) { spawnen(m); m.salve = null; m.waffen = neueWaffen(m.typ); m.boostPause = 0; }
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
  muendungsZeit -= dt;
  trefferAnzeige -= dt;
  for (const t of trefferRichtungen) t.t -= dt;
  trefferRichtungen = trefferRichtungen.filter(t => t.t > 0);
  if (zustand !== 'spiel' || (pause && !mp.aktiv)) return;   // (Im Multiplayer geht das Spiel auch in der Pause weiter)
  if (mp.aktiv) mpTick(dt);
  if (intro) { updateIntro(dt); return; }   // 🎬 Intro läuft
  if (mp.rolle === 'gast') { updateGast(dt); return; }   // 🌐 Beim Gast rechnet der Gastgeber

  if (countdown > 0) {   // 3 ... 2 ... 1 ... LOS!
    const vorher = Math.ceil(countdown);
    countdown -= dt;
    if (Math.ceil(countdown) !== vorher) { if (countdown > 0) sound.piep(); else sound.los(); }
    return;
  }

  for (const k of killfeed) k.t -= dt;
  killfeed = killfeed.filter(k => k.t > 0);

  for (const m of mechs) {
    for (const s of m.waffen) s.pause -= dt;
    m.boostPause -= dt; m.boostZeit -= dt;
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
  for (const m of mechs) if (!m.istSpieler && !m.mensch && !m.tot) botDenken(m, dt);
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
  if (k.id === 'planet') bauePlanet(kartenGruppe);
  else if (k.id === 'eis') baueEis(kartenGruppe);
  else if (k.id === 'dschungel') baueDschungel(kartenGruppe);
  else baueFabrik(kartenGruppe);
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

// ===== Karte 3: ❄️ Eisplanet Frostheim =====
const schneeTextur = malTextur(256, 256, (g, b, h) => {
  g.fillStyle = '#e8f1fa'; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(11);
  for (let i = 0; i < 70; i++) {   // Schneewehen und Spuren
    g.fillStyle = z() < 0.5 ? 'rgba(190,210,235,0.5)' : 'rgba(255,255,255,0.8)';
    g.beginPath(); g.ellipse(z() * b, z() * h, 8 + z() * 30, 3 + z() * 8, z() * 3, 0, 7); g.fill();
  }
  for (let i = 0; i < 40; i++) {   // Glitzern
    g.fillStyle = '#ffffff';
    g.fillRect(z() * b, z() * h, 2, 2);
  }
});
schneeTextur.repeat.set(WELT_B / 200, WELT_H / 200);
const eisTextur = malTextur(128, 128, (g, b, h) => {
  const v = g.createLinearGradient(0, 0, b, h);
  v.addColorStop(0, '#bfe6ff'); v.addColorStop(1, '#7cc4f2');
  g.fillStyle = v; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(5);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {   // Risse im Eis
    let x = z() * b, y = z() * h;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) { x += (z() - 0.5) * 40; y += (z() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
  }
});
const eisMat = new THREE.MeshStandardMaterial({ map: eisTextur, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, emissive: '#3b82c4', emissiveIntensity: 0.25 });
const schneeMat = new THREE.MeshStandardMaterial({ color: '#f4f8fc', roughness: 1, flatShading: true });
const eisZackenMats = ['#a5f3fc', '#bae6fd', '#c7d2fe'].map(f => new THREE.MeshStandardMaterial({ color: f, emissive: f, emissiveIntensity: 0.35, roughness: 0.1, transparent: true, opacity: 0.85, flatShading: true }));
const wrackMat = new THREE.MeshStandardMaterial({ color: '#4b5263', roughness: 0.6, metalness: 0.6 });
const tanneMat = new THREE.MeshStandardMaterial({ color: '#1f4d3a', roughness: 0.9, flatShading: true });

function schneeHaufen(g, x, z, b, h, t) {   // Ein runder Schneehaufen
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), schneeMat);
  s.scale.set(b, h, t);
  s.position.set(x, 0, z);
  s.castShadow = s.receiveShadow = true;
  g.add(s);
}
function eisZacken(g, r, z, nr) {   // Spitze Eiskristalle
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
  for (let i = 0; i < 4; i++) {
    const hoehe = 70 + z() * 80;
    const k = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), eisZackenMats[(nr + i) % eisZackenMats.length]);
    k.scale.set(10 + z() * 10, hoehe, 10 + z() * 10);
    k.position.set(cx + (z() - 0.5) * r.w * 0.6, hoehe / 2, cz + (z() - 0.5) * r.h * 0.6);
    k.rotation.set((z() - 0.5) * 0.4, z() * 3, (z() - 0.5) * 0.4);
    k.castShadow = true;
    g.add(k);
  }
  schneeHaufen(g, cx, cz, r.w * 0.7, 14, r.h * 0.7);
}
function tanne(g, x, z, groesse, boden = 0) {   // Tannenbaum mit Schnee (boden: steht er auf einem Hügel?)
  const stamm = new THREE.Mesh(new THREE.CylinderGeometry(4 * groesse, 5 * groesse, 20 * groesse, 6), new THREE.MeshStandardMaterial({ color: '#5b3a24' }));
  stamm.position.set(x, boden + 10 * groesse, z);
  g.add(stamm);
  for (let i = 0; i < 3; i++) {
    const r = (34 - i * 9) * groesse, h = 40 * groesse, y = boden + (26 + i * 26) * groesse;
    const ast = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), tanneMat);
    ast.position.set(x, y + h / 2, z);
    ast.castShadow = true;
    const schnee = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.45, 7), schneeMat);
    schnee.position.set(x, y + h * 0.78, z);
    g.add(ast, schnee);
  }
}
function wrackTeil(g, r, z) {   // Ein Stück von einem abgestürzten Raumschiff
  const cx = r.x + r.w / 2, cz = r.y + r.h / 2, lang = r.h > r.w;
  const rumpf = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(r.w, r.h) * 0.5, Math.min(r.w, r.h) * 0.6, Math.max(r.w, r.h), 8, 1, true), wrackMat);
  rumpf.material.side = THREE.DoubleSide;
  rumpf.rotation.set(lang ? Math.PI / 2 : 0, 0, lang ? 0 : Math.PI / 2);
  rumpf.rotation.y = (z() - 0.5) * 0.3;
  rumpf.position.set(cx, Math.min(r.w, r.h) * 0.45, cz);
  rumpf.castShadow = rumpf.receiveShadow = true;
  g.add(rumpf);
  // Flügel steckt schräg im Schnee, mit Warnstreifen
  const fluegel = kasten(g, { x: cx - 4, y: cz - r.h * 0.3, w: 8, h: r.h * 0.6 }, wrackMat, 0, 90);
  fluegel.rotation.x = 0.35;
  const st = streifenTextur.clone(); st.repeat.set(2, 1);
  const streifen = new THREE.Mesh(new THREE.BoxGeometry(9, 10, r.h * 0.6), new THREE.MeshStandardMaterial({ map: st }));
  streifen.position.set(cx, 80, cz - r.h * 0.03);
  streifen.rotation.x = 0.35;
  g.add(streifen);
  // Ein Lämpchen blinkt noch ...
  const lampe = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3b3b' }));
  lampe.position.set(cx, 96, cz + r.h * 0.2);
  g.add(lampe);
  schneeHaufen(g, cx, cz, r.w * 0.9, 18, r.h * 0.7);
  return lampe;
}

function baueEis(g) {
  const HIMMEL = '#0e1a33';   // Dunkler Polarhimmel
  szene.background = new THREE.Color(HIMMEL);
  szene.fog = new THREE.Fog('#5b7aa6', 600, 2600);
  himmelsLicht.color.set('#dbeafe'); himmelsLicht.groundColor.set('#93c5fd'); himmelsLicht.intensity = 1.25;
  sonne.color.set('#e0f2fe'); sonne.intensity = 1.4;
  const z = zufallsGenerator(77);

  // Boden aus Schnee
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(WELT_B, WELT_H), new THREE.MeshStandardMaterial({ map: schneeTextur, roughness: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(WELT_B / 2, 0, WELT_H / 2);
  boden.receiveShadow = true;
  g.add(boden);
  const aussen = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: '#c9d9ea', roughness: 1 }));
  aussen.rotation.x = -Math.PI / 2;
  aussen.position.set(WELT_B / 2, -1, WELT_H / 2);
  g.add(aussen);
  // Zugefrorener See in der Mitte
  const see = new THREE.Mesh(new THREE.CircleGeometry(260, 40), new THREE.MeshStandardMaterial({ map: eisTextur, roughness: 0.05, metalness: 0.3, color: '#cfeaff' }));
  see.rotation.x = -Math.PI / 2;
  see.scale.set(1.3, 1, 1);
  see.position.set(WELT_B / 2, 0.6, WELT_H / 2);
  see.receiveShadow = true;
  g.add(see);

  // Hindernisse
  const lampen = [];
  WAENDE.forEach((r, nr) => {
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.art === 'eisblock') {
      const t = eisTextur.clone(); t.repeat.set(Math.max(1, r.w / 80), 1);
      const block = kasten(g, r, new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, emissive: '#3b82c4', emissiveIntensity: 0.25 }), 0, r.oben);
      const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry), new THREE.LineBasicMaterial({ color: '#e0f2fe' }));
      kanten.position.copy(block.position);
      g.add(kanten);
      kasten(g, { x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 }, schneeMat, r.oben, r.oben + 8);   // Schnee oben drauf
    } else if (r.art === 'schneehaufen') {
      schneeHaufen(g, cx, cz, r.w * 0.75, 48, r.h * 0.75);
    } else if (r.art === 'eiszacke') {
      eisZacken(g, r, z, nr);
    } else if (r.art === 'wrack') {
      lampen.push(wrackTeil(g, r, z));
    } else if (r.art === 'schneehuegel') {
      kasten(g, r, eisMat, 0, r.oben - 8);
      kasten(g, r, schneeMat, r.oben - 8, r.oben);
      for (let i = 0; i < 2; i++) tanne(g, r.x + 40 + z() * (r.w - 80), r.y + 40 + z() * (r.h - 80), 0.8, r.oben);
    } else if (r.art === 'schneehang') {
      const m = new THREE.Mesh(rampenGeo(r), schneeMat);
      m.position.set(cx, 0, cz);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
  });

  // Rand der Arena: Schneewall
  for (let x = 0; x <= WELT_B; x += 90) for (const y of [-40, WELT_H + 40]) schneeHaufen(g, x, y, 60 + z() * 20, 40 + z() * 30, 40);
  for (let y = 0; y <= WELT_H; y += 90) for (const x of [-40, WELT_B + 40]) schneeHaufen(g, x, y, 40, 40 + z() * 30, 60 + z() * 20);

  // Draußen: Tannenwald und riesige Eisberge
  for (let i = 0; i < 70; i++) {
    const a = z() * Math.PI * 2, d = 250 + z() * 600;
    const x = WELT_B / 2 + Math.cos(a) * (WELT_B / 2 + d), y = WELT_H / 2 + Math.sin(a) * (WELT_H / 2 + d);
    tanne(g, x, y, 1 + z() * 1.5);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + z() * 0.3;
    const berg = new THREE.Mesh(new THREE.ConeGeometry(300 + z() * 250, 700 + z() * 600, 6), z() < 0.5 ? schneeMat : eisZackenMats[i % 3]);
    berg.position.set(WELT_B / 2 + Math.cos(a) * (WELT_B / 2 + 1500), 300, WELT_H / 2 + Math.sin(a) * (WELT_H / 2 + 1400));
    g.add(berg);
  }

  // Sterne und Polarlichter am Himmel
  const sternPos = [];
  for (let i = 0; i < 500; i++) {
    const a = z() * Math.PI * 2, b = 0.2 + z() * 1.2;
    sternPos.push(WELT_B / 2 + Math.cos(a) * Math.cos(b) * 4500, Math.sin(b) * 4500, WELT_H / 2 + Math.sin(a) * Math.cos(b) * 4500);
  }
  const sternGeo = new THREE.BufferGeometry();
  sternGeo.setAttribute('position', new THREE.Float32BufferAttribute(sternPos, 3));
  g.add(new THREE.Points(sternGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false })));
  const polarTextur = malTextur(256, 64, (c, b, h) => {
    const v = c.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, 'rgba(74,222,128,0)'); v.addColorStop(0.6, 'rgba(74,222,128,0.8)'); v.addColorStop(1, 'rgba(56,189,248,0)');
    c.fillStyle = v; c.fillRect(0, 0, b, h);
  });
  const polarlichter = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(5000, 900, 40, 1);
    const band = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: polarTextur, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: ['#ffffff', '#c4b5fd', '#99f6e4'][i] }));
    band.position.set(WELT_B / 2 + (i - 1) * 600, 1700 + i * 250, WELT_H / 2 - 2600 - i * 300);
    band.rotation.x = 0.25;
    g.add(band);
    polarlichter.push({ band, basis: Float32Array.from(geo.attributes.position.array), p: i * 2 });
  }

  // Schneefall
  const ANZ = 900, flockenPos = new Float32Array(ANZ * 3), flocken = [];
  for (let i = 0; i < ANZ; i++) flocken.push({ x: z() * WELT_B, y: z() * 500, z: z() * WELT_H, p: z() * 6, v: 25 + z() * 30 });
  const flockenGeo = new THREE.BufferGeometry();
  flockenGeo.setAttribute('position', new THREE.BufferAttribute(flockenPos, 3));
  const schnee = new THREE.Points(flockenGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 4, map: kreisTextur, transparent: true, depthWrite: false }));
  schnee.frustumCulled = false;
  g.add(schnee);
  let letzteZeit = zeit;
  kartenAnimation = () => {
    const dt = Math.min(0.05, Math.max(0, zeit - letzteZeit)); letzteZeit = zeit;
    flocken.forEach((f, i) => {
      f.y -= f.v * dt;
      if (f.y < 0) f.y = 500;
      flockenPos[i * 3] = f.x + Math.sin(zeit * 0.8 + f.p) * 20;
      flockenPos[i * 3 + 1] = f.y;
      flockenPos[i * 3 + 2] = f.z + Math.cos(zeit * 0.6 + f.p) * 20;
    });
    flockenGeo.attributes.position.needsUpdate = true;
    for (const l of polarlichter) {   // Die Polarlichter wabern langsam
      const pos = l.band.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(l.basis[i * 3] * 0.002 + zeit * 0.4 + l.p) * 180);
      pos.needsUpdate = true;
      l.band.material.opacity = 0.35 + Math.sin(zeit * 0.5 + l.p) * 0.15;
    }
    for (const lampe of lampen) lampe.visible = Math.sin(zeit * 5) > 0;   // Wrack-Lampen blinken
  };
}

// ===== Karte 4: 🌴 Dschungel & Strand =====
const urwaldTextur = malTextur(256, 256, (g, b, h) => {   // Waldboden mit Laub
  g.fillStyle = '#3b4a24'; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(21);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = ['#4d5e2c', '#2f3b1c', '#5c4a2a', '#466b2a'][Math.floor(z() * 4)];
    g.beginPath(); g.ellipse(z() * b, z() * h, 3 + z() * 9, 2 + z() * 4, z() * 3, 0, 7); g.fill();
  }
});
const sandTextur = malTextur(256, 256, (g, b, h) => {
  g.fillStyle = '#f0d9a0'; g.fillRect(0, 0, b, h);
  const z = zufallsGenerator(31);
  for (let i = 0; i < 400; i++) { g.fillStyle = z() < 0.5 ? '#e2c486' : '#fbe9bd'; g.fillRect(z() * b, z() * h, 2, 2); }
  g.strokeStyle = 'rgba(200,170,110,0.4)'; g.lineWidth = 2;   // Wellen im Sand
  for (let y = 10; y < h; y += 22) { g.beginPath(); for (let x = 0; x <= b; x += 8) g.lineTo(x, y + Math.sin(x * 0.08) * 3); g.stroke(); }
});
const steinTextur = malTextur(128, 128, (g, b, h) => {   // Alte Tempelsteine mit Moos
  g.fillStyle = '#8a8471'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#5e5948'; g.lineWidth = 3;
  for (let y = 0; y < h; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(b, y); g.stroke();
    for (let x = (y / 32) % 2 * 32; x < b; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
  }
  const z = zufallsGenerator(9);
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(70,120,40,0.55)'; g.beginPath(); g.arc(z() * b, z() * h, 3 + z() * 9, 0, 7); g.fill(); }
});
const rindeMat = new THREE.MeshStandardMaterial({ color: '#5b4128', roughness: 1 });
const blattMats = ['#2f6b2a', '#3d8a34', '#25591f', '#4c9a3c'].map(f => new THREE.MeshStandardMaterial({ color: f, roughness: 0.9, flatShading: true }));
const lianenMat = new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 1 });
const tempelMat = new THREE.MeshStandardMaterial({ map: steinTextur, roughness: 0.95 });
const palmStammMat = new THREE.MeshStandardMaterial({ color: '#9c7a4f', roughness: 1 });
const palmBlattMat = new THREE.MeshStandardMaterial({ color: '#4caf50', roughness: 0.8, side: THREE.DoubleSide, flatShading: true });
const holzMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.9 });
const strohMat = new THREE.MeshStandardMaterial({ color: '#d8b56a', roughness: 1, flatShading: true });

function urwaldBaum(g, x, z, groesse, zufall) {   // Riesiger Baum mit Brettwurzeln, Krone und Lianen
  const hoch = 300 * groesse;
  const stamm = new THREE.Mesh(new THREE.CylinderGeometry(18 * groesse, 30 * groesse, hoch, 9), rindeMat);
  stamm.position.set(x, hoch / 2, z);
  stamm.castShadow = true;
  g.add(stamm);
  for (let i = 0; i < 4; i++) {   // Brettwurzeln
    const a = i / 4 * Math.PI * 2 + zufall();
    const w = new THREE.Mesh(new THREE.BoxGeometry(6 * groesse, 40 * groesse, 34 * groesse), rindeMat);
    w.position.set(x + Math.cos(a) * 26 * groesse, 18 * groesse, z + Math.sin(a) * 26 * groesse);
    w.rotation.y = -a;
    g.add(w);
  }
  for (let i = 0; i < 6; i++) {   // Blätterkrone aus vielen Kugeln
    const k = new THREE.Mesh(new THREE.IcosahedronGeometry((60 + zufall() * 40) * groesse, 0), blattMats[Math.floor(zufall() * blattMats.length)]);
    const a = zufall() * Math.PI * 2, r = zufall() * 70 * groesse;
    k.position.set(x + Math.cos(a) * r, hoch - 10 + zufall() * 50 * groesse, z + Math.sin(a) * r);
    k.scale.y = 0.6;
    k.castShadow = true;
    g.add(k);
  }
  for (let i = 0; i < 3; i++) {   // Lianen hängen runter
    const a = zufall() * Math.PI * 2, r = 40 + zufall() * 50;
    const l = 120 + zufall() * 120;
    const liane = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, l, 4), lianenMat);
    liane.position.set(x + Math.cos(a) * r * groesse, hoch - l / 2, z + Math.sin(a) * r * groesse);
    g.add(liane);
  }
}
function dschungelBusch(g, r, zufall) {
  const n = 4 + Math.floor(r.w * r.h / 2500);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(22 + zufall() * 16, 0), blattMats[Math.floor(zufall() * blattMats.length)]);
    b.position.set(r.x + 15 + zufall() * (r.w - 30), 20 + zufall() * 25, r.y + 12 + zufall() * (r.h - 24));
    b.scale.y = 0.8 + zufall() * 0.4;
    b.castShadow = true;
    g.add(b);
  }
}
function palme(g, x, z, zufall, groesse = 1) {   // Gebogene Palme mit Kokosnüssen
  const neigung = 0.15 + zufall() * 0.2, richtung = zufall() * Math.PI * 2;
  let px = x, py = 0, pz = z;
  const teile = 7;
  for (let i = 0; i < teile; i++) {
    const l = 30 * groesse, kipp = neigung * (i / teile) * 2;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(6 * groesse - i * 0.4, 7 * groesse - i * 0.4, l, 7), palmStammMat);
    const dx = Math.cos(richtung) * Math.sin(kipp) * l, dz = Math.sin(richtung) * Math.sin(kipp) * l, dy = Math.cos(kipp) * l;
    s.position.set(px + dx / 2, py + dy / 2, pz + dz / 2);
    s.rotation.set(Math.sin(richtung) * kipp, 0, -Math.cos(richtung) * kipp);
    s.castShadow = true;
    g.add(s);
    px += dx; py += dy; pz += dz;
  }
  for (let i = 0; i < 7; i++) {   // Palmwedel
    const a = i / 7 * Math.PI * 2;
    const blatt = new THREE.Mesh(new THREE.ConeGeometry(10 * groesse, 90 * groesse, 3), palmBlattMat);
    blatt.scale.set(1, 1, 0.25);
    blatt.position.set(px + Math.cos(a) * 38 * groesse, py - 12 * groesse, pz + Math.sin(a) * 38 * groesse);
    blatt.rotation.set(0, -a, 0);
    blatt.rotateZ(-1.9);
    blatt.castShadow = true;
    g.add(blatt);
  }
  for (let i = 0; i < 3; i++) {
    const nuss = new THREE.Mesh(new THREE.SphereGeometry(5 * groesse, 8, 6), rindeMat);
    nuss.position.set(px + Math.cos(i * 2.1) * 7, py - 8 * groesse, pz + Math.sin(i * 2.1) * 7);
    g.add(nuss);
  }
}
function baueDschungel(g) {
  const HIMMEL = '#86c9f0';
  szene.background = new THREE.Color(HIMMEL);
  szene.fog = new THREE.Fog('#9fd3c0', 900, 3600);
  himmelsLicht.color.set('#e6f6ff'); himmelsLicht.groundColor.set('#4a5a2a'); himmelsLicht.intensity = 1.15;
  sonne.color.set('#fff1cc'); sonne.intensity = 1.8;
  const z = zufallsGenerator(64);

  // Boden: Urwald oben, Sand unten
  urwaldTextur.repeat.set(WELT_B / 160, STRAND_AB / 160);
  const wald = new THREE.Mesh(new THREE.PlaneGeometry(WELT_B, STRAND_AB + 40), new THREE.MeshStandardMaterial({ map: urwaldTextur, roughness: 1 }));
  wald.rotation.x = -Math.PI / 2;
  wald.position.set(WELT_B / 2, 0, (STRAND_AB + 40) / 2);
  wald.receiveShadow = true;
  g.add(wald);
  const sandTiefe = WELT_H - STRAND_AB + 260;
  sandTextur.repeat.set(WELT_B / 200, sandTiefe / 200);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(WELT_B + 2000, sandTiefe), new THREE.MeshStandardMaterial({ map: sandTextur, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(WELT_B / 2, 0.3, STRAND_AB + sandTiefe / 2);
  sand.receiveShadow = true;
  g.add(sand);
  const aussen = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: '#2f4a1f', roughness: 1 }));
  aussen.rotation.x = -Math.PI / 2;
  aussen.position.set(WELT_B / 2, -1, WELT_H / 2 - 3000);
  g.add(aussen);
  // Das Meer (mit Wellen)
  const meerGeo = new THREE.PlaneGeometry(14000, 5000, 80, 30);
  const meer = new THREE.Mesh(meerGeo, new THREE.MeshStandardMaterial({ color: '#1e90c8', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 }));
  meer.rotation.x = -Math.PI / 2;
  meer.position.set(WELT_B / 2, -2, WELT_H + 160 + 2500);
  g.add(meer);
  const meerBasis = Float32Array.from(meerGeo.attributes.position.array);
  const schaum = new THREE.Mesh(new THREE.PlaneGeometry(14000, 30), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
  schaum.rotation.x = -Math.PI / 2;
  schaum.position.set(WELT_B / 2, 0.8, WELT_H + 170);
  g.add(schaum);

  // Hindernisse
  WAENDE.forEach(r => {
    const cx = r.x + r.w / 2, cz = r.y + r.h / 2;
    if (r.art === 'baum') urwaldBaum(g, cx, cz, 1 + z() * 0.3, z);
    else if (r.art === 'busch') dschungelBusch(g, r, z);
    else if (r.art === 'dschungelfels') {
      const f = fels(g, cx, cz, r.w * 0.6, 85, r.h * 0.6, z());
      f.material = new THREE.MeshStandardMaterial({ color: '#6b6b5a', roughness: 1, flatShading: true });
      dschungelBusch(g, { x: r.x + r.w * 0.2, y: r.y + r.h * 0.2, w: r.w * 0.6, h: r.h * 0.6 }, z);   // Moos und Farn oben drauf
    } else if (r.art === 'ruine') {
      const t = steinTextur.clone(); t.repeat.set(Math.max(r.w, r.h) / 64, 2);
      kasten(g, r, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 0, r.oben - 15 - z() * 20);
      kasten(g, { x: r.x + r.w * 0.1, y: r.y + r.h * 0.1, w: r.w * 0.5, h: r.h * 0.5 }, tempelMat, 0, r.oben);   // abgebrochene Ecke
    } else if (r.art === 'tempel') {
      // Stufenpyramide: jede Stufe etwas kleiner
      for (let i = 0; i < 3; i++) {
        const e = i * 14;
        kasten(g, { x: r.x + e, y: r.y + e, w: r.w - 2 * e, h: r.h - 2 * e }, tempelMat, i * r.oben / 3, i === 2 ? r.oben : (i + 1) * r.oben / 3);
      }
      for (const [px, pz] of [[r.x + 20, r.y + 20], [r.x + r.w - 20, r.y + 20]]) {   // Fackeln oben
        const f = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 6), new THREE.MeshBasicMaterial({ color: '#ff9f43' }));
        f.position.set(px, r.oben + 12, pz);
        g.add(f);
      }
    } else if (r.art === 'tempeltreppe') {
      const t = steinTextur.clone(); t.repeat.set(2, 6);
      const m = new THREE.Mesh(rampenGeo(r), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
      m.position.set(cx, 0, cz);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    } else if (r.art === 'palme') palme(g, cx, cz, z);
    else if (r.art === 'strandfels') {
      const f = fels(g, cx, cz, r.w * 0.6, 50, r.h * 0.6, z());
      f.material = new THREE.MeshStandardMaterial({ color: '#9a9488', roughness: 1, flatShading: true });
    } else if (r.art === 'boot') {   // Altes Holzboot, halb im Sand
      const rumpf = new THREE.Mesh(new THREE.CylinderGeometry(r.h * 0.5, r.h * 0.5, r.w, 10, 1, true, 0, Math.PI), holzMat);
      rumpf.material.side = THREE.DoubleSide;
      rumpf.rotation.z = -Math.PI / 2;   // Liegt längs, die offene Seite zeigt nach oben
      rumpf.position.set(cx, r.h * 0.5, cz);
      rumpf.castShadow = true;
      g.add(rumpf);
      kasten(g, { x: r.x + r.w * 0.3, y: r.y + 4, w: 6, h: r.h - 8 }, holzMat, 0, 36);   // Sitzbank
    } else if (r.art === 'huette') {   // Strandhütte mit Strohdach
      kasten(g, r, holzMat, 0, 80);
      const dach = new THREE.Mesh(new THREE.ConeGeometry(Math.max(r.w, r.h) * 0.85, 60, 4), strohMat);
      dach.position.set(cx, 110, cz);
      dach.rotation.y = Math.PI / 4;
      dach.castShadow = true;
      g.add(dach);
    }
  });

  // Farne und Pflanzen auf dem Waldboden (viele auf einmal, darum "Instanced")
  const farnGeo = new THREE.ConeGeometry(10, 26, 4);
  const farne = new THREE.InstancedMesh(farnGeo, blattMats[1], 700);
  const hilf = new THREE.Object3D();
  let n = 0;
  for (let i = 0; i < 2000 && n < 700; i++) {
    const x = z() * WELT_B, y = z() * (STRAND_AB + 30);
    if (WAENDE.some(r => x > r.x - 15 && x < r.x + r.w + 15 && y > r.y - 15 && y < r.y + r.h + 15)) continue;
    hilf.position.set(x, 10, y);
    hilf.rotation.set((z() - 0.5) * 0.6, z() * 3, (z() - 0.5) * 0.6);
    hilf.scale.setScalar(0.6 + z() * 1.2);
    hilf.updateMatrix();
    farne.setMatrixAt(n++, hilf.matrix);
  }
  farne.count = n;
  g.add(farne);
  // Büsche am Waldrand zum Strand
  for (let x = 40; x < WELT_B; x += 70 + z() * 60) {
    if (WAENDE.some(r => x > r.x - 40 && x < r.x + r.w + 40 && STRAND_AB > r.y - 40 && STRAND_AB < r.y + r.h + 40)) continue;
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(12 + z() * 10, 0), blattMats[Math.floor(z() * 4)]);
      b.position.set(x + (z() - 0.5) * 40, 8, STRAND_AB + (z() - 0.5) * 30);
      g.add(b);
    }
  }
  // Rand: Ringsum dichter Urwald (oben, links, rechts), unten das Meer
  for (let i = 0; i < 70; i++) {
    const seite = z();
    let x, y;
    if (seite < 0.5) { x = z() * (WELT_B + 600) - 300; y = -60 - z() * 400; }
    else { x = seite < 0.75 ? -60 - z() * 400 : WELT_B + 60 + z() * 400; y = z() * STRAND_AB; }
    urwaldBaum(g, x, y, 0.9 + z() * 0.6, z);
  }
  for (let i = 0; i < 14; i++) palme(g, z() < 0.5 ? -40 - z() * 200 : WELT_B + 40 + z() * 200, STRAND_AB + 80 + z() * 700, z, 1.2);
  // Unsichtbare Grenze unten ist das Wasser – ein paar Steine im Wasser zeigen das Ende
  for (let x = 60; x < WELT_B; x += 260) fels(g, x + z() * 80, WELT_H + 60, 30 + z() * 20, 20 + z() * 20, 25, z() * 3);

  // Glühwürmchen im Dschungel und Wellen im Meer
  const ANZ = 250, lichtPos = new Float32Array(ANZ * 3), basis = [];
  for (let i = 0; i < ANZ; i++) basis.push({ x: z() * WELT_B, y: 20 + z() * 120, z: z() * STRAND_AB, p: z() * 6 });
  const lichtGeo = new THREE.BufferGeometry();
  lichtGeo.setAttribute('position', new THREE.BufferAttribute(lichtPos, 3));
  const lichter = new THREE.Points(lichtGeo, new THREE.PointsMaterial({ color: '#fde047', size: 5, map: kreisTextur, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  lichter.frustumCulled = false;
  g.add(lichter);
  kartenAnimation = () => {
    basis.forEach((b, i) => {
      lichtPos[i * 3] = b.x + Math.sin(zeit * 0.5 + b.p) * 25;
      lichtPos[i * 3 + 1] = b.y + Math.sin(zeit * 1.1 + b.p) * 12;
      lichtPos[i * 3 + 2] = b.z + Math.cos(zeit * 0.4 + b.p) * 25;
    });
    lichtGeo.attributes.position.needsUpdate = true;
    const pos = meerGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(meerBasis[i * 3] * 0.004 + zeit * 1.2) * 6 + Math.cos(meerBasis[i * 3 + 1] * 0.006 + zeit) * 5);
    pos.needsUpdate = true;
    schaum.material.opacity = 0.45 + Math.sin(zeit * 1.5) * 0.25;
    schaum.position.z = WELT_H + 170 + Math.sin(zeit * 1.5) * 12;   // Die Wellen rollen an den Strand
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
  WAENDE = waendeVon(gross ? { links: k.grossLinks || k.links, mitte: k.grossMitte || k.mitte } : k);
  // Boden-Muster, Sonne und Schatten an die Größe anpassen
  bodenTextur.repeat.set(WELT_B / 100, WELT_H / 100);
  alienBodenTextur.repeat.set(WELT_B / 220, WELT_H / 220);
  schneeTextur.repeat.set(WELT_B / 200, WELT_H / 200);
  if (k.id === 'dschungel') Object.assign(sonne.shadow.mapSize, { x: 4096, y: 4096 });   // Große Karte: schärfere Schatten
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

// ===== Die 3D-Modelle der Waffen (zeigen nach vorne = +x) =====
const slotLichtMat = Object.fromEntries(Object.entries(SLOT_ARTEN).map(([id, a]) => [id, new THREE.MeshBasicMaterial({ color: a.farbe })]));
const laserLinseMat = new THREE.MeshBasicMaterial({ color: SLOT_ARTEN.laser.hell });
const railKernMat = new THREE.MeshBasicMaterial({ color: '#a7f3d0' });
function waffenModell(w, art, gehaeuseMat, streifenMat, raketenLicht, g = 1) {
  const m = new THREE.Group();
  if (art === 'rakete') {
    // 🟢 Raketenwerfer: ein Kasten mit Löchern vorne (so viele wie Raketen)
    const gross = w.salve || w.anzahl >= 4, b = gross ? 16 : w.anzahl > 1 ? 14 : 12;
    const kasten = new THREE.Group();
    if (w.salve) kasten.rotation.z = 0.45;   // Raketenhagel zeigt schräg nach oben
    kasten.add(klotz(22, b, 14, gehaeuseMat, 0, 0, 0));
    kasten.add(klotz(22.5, 2, 14.5, streifenMat, 0, b / 2, 0));
    kasten.add(klotz(6, 2.5, 3, slotLichtMat.rakete, -6, b / 2 + 1, 0));
    const reihen = w.salve ? [[-4, -4], [-4, 0], [-4, 4], [4, -4], [4, 0], [4, 4]]
      : w.anzahl >= 4 ? [[-3.5, -3.5], [-3.5, 3.5], [3.5, -3.5], [3.5, 3.5]]
      : w.anzahl === 2 ? [[0, -3.5], [0, 3.5]] : [[0, 0]];
    for (const [dy, dz] of reihen) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2, 8), raketenLicht);
      l.rotation.z = Math.PI / 2; l.position.set(11.5, dy, dz);
      kasten.add(l);
    }
    m.add(kasten);
  } else {
    // Gehäuse mit Licht in der Slot-Farbe
    const dick = w.explodiert ? 1.4 : 1;
    m.add(klotz(16 * g, 11 * dick * g, 11 * dick * g, gehaeuseMat, 6 * g, 0, 0));
    m.add(klotz(16 * g, 2, 11.5 * dick * g, streifenMat, 6 * g, 5.5 * dick * g, 0));
    m.add(klotz(4, 2.5, 4, slotLichtMat[art], 2 * g, 6.5 * dick * g, 0));
    if (w.laser) {         // 🔵 Laser: glattes Rohr mit Kühlrippen und blauer Linse
      const l = (w.gross ? 34 : w.id === 'laserK' ? 14 : 22) * g, r = (w.gross ? 2.6 : 2) * g;
      m.add(rohr(r, l, dunkelMat, 14 * g + l / 2, 0, 0));
      for (let x = 16 * g; x < 14 * g + l - 4; x += 5 * g) m.add(rohr(r + 1.2 * g, 1.2, stahlMat, x, 0, 0));
      m.add(rohr(r + 0.4, 2, laserLinseMat, 14 * g + l + 1, 0, 0));
    } else if (w.id === 'railgun') {   // Railgun: zwei Schienen mit leuchtendem Kern
      for (const y of [-4, 4]) m.add(klotz(46 * g, 2.5, 5, dunkelMat, 34 * g, y * g, 0));
      m.add(klotz(44 * g, 1.6, 1.6, railKernMat, 34 * g, 0, 0));
      for (const x of [22, 36, 50]) m.add(klotz(2.5, 11 * g, 6, streifenMat, x * g, 0, 0));
    } else if (w.explodiert) {         // Kanone: dickes Rohr mit Mündung
      m.add(rohr(5 * g, 26 * g, dunkelMat, 27 * g, 0, 0));
      m.add(rohr(6.5 * g, 5 * g, streifenMat, 41 * g, 0, 0));
    } else if (w.schrot) {             // Schrotflinte: zwei kurze dicke Läufe nebeneinander
      for (const z of [-2.8, 2.8]) m.add(rohr(2.6 * g, 14 * g, dunkelMat, 21 * g, 0, z * g));
      m.add(klotz(3, 9 * g, 12 * g, stahlMat, 20 * g, 0, 0));
    } else {                           // MG (3 Läufe) oder Minigun (6 Läufe und ein Munitions-Kasten)
      const n = w.id === 'minigun' ? 6 : 3, rad = w.id === 'minigun' ? 3.4 : 2.6;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        m.add(rohr(1.3 * g, 22 * g, dunkelMat, 25 * g, Math.sin(a) * rad * g, Math.cos(a) * rad * g));
      }
      m.add(rohr((rad + 2) * g, 3, grauMat, 34 * g, 0, 0));
      if (w.id === 'minigun') m.add(klotz(8 * g, 8 * g, 6 * g, stahlMat, 4 * g, -8 * g, 0));
    }
  }
  m.traverse(o => { o.castShadow = true; });
  return m;
}

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
  const dick = typ.dick || { leicht: 0.85, medium: 1, heavy: 1.25, schwer: 1.6 }[typ.klasse];   // Wie dick die Beine sind   // Wie dick die Beine sind

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
  const schulterGross = typ.schulter || { leicht: 0.85, medium: 1, heavy: 1.2, schwer: 1.5 }[typ.klasse];
  for (const s of [-1, 1]) {
    arm(s).add(gelenk(6, 6, grauMat, 0, 16, s * 19));
    arm(s).add(schraeg(klotz(20 * schulterGross, 9 * schulterGross, 12 * schulterGross, koerperMat, 0, 22, s * 22), 0.12));
    arm(s).add(schraeg(klotz(20 * schulterGross, 2, 12.5 * schulterGross, akzentMat, 0, 22 + 4.5 * schulterGross, s * 22), 0.12));
  }
  // ===== Waffen in den Slots =====
  // Jede Waffe bekommt ihr eigenes Modell. Ein kleines Licht zeigt die Slot-Farbe (🔵 Laser, 🟣 Kanone, 🟢 Raketen).
  const raketenLicht = new THREE.MeshBasicMaterial({ color: SLOT_ARTEN.rakete.hell });
  for (const slot of typ.slots) {
    const w = WAFFEN[slot.waffe], seite = ORTE[slot.ort].seite < 0 ? -1 : 1;
    let eltern = torso, pos;
    if (slot.ort === 'armL' || slot.ort === 'armR') {
      eltern = arm(seite);
      eltern.add(klotz(10, 10, 8, grauMat, 4, 8, seite * 22));   // Oberarm
      pos = [8, 7, seite * 22];
    } else if (slot.ort.startsWith('torso')) pos = [15, 10, seite * 13];
    else pos = [-4, 35, seite * 9];   // Schulter: oben auf dem Rücken
    if (!w) {   // Leerer Slot: nur eine Halterung mit Lämpchen in der Slot-Farbe
      const halter = klotz(8, 6, 8, dunkelMat, pos[0], pos[1], pos[2]);
      halter.add(klotz(3, 2, 3, slotLichtMat[slot.art], 0, 3.5, 0));
      eltern.add(halter);
      continue;
    }
    const modell = waffenModell(w, slot.art, teamDunkel, akzentMat, raketenLicht, slot.ort.startsWith('torso') ? 0.7 : 1);
    modell.position.set(...pos);
    eltern.add(modell);
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
  if (typ.klasse === 'schwer') {   // 🗿 Riesen: Panzerplatten, Rammschild und Lampen auf dem Dach
    for (const s of [-1, 1]) torso.add(klotz(32, 24, 6, teamDunkel, -2, 12, s * 18));
    torso.add(schraeg(klotz(6, 18, 34, akzentMat, 20, 4, 0), -0.2));
    for (const s of [-1, 1]) torso.add(klotz(3, 3, 3, akzentLeucht, 4, 30, s * 10));
  }
  if (typ.hoerner) {   // 😈 Kragan: zwei schwarze Hörner
    const schwarz = new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.6, roughness: 0.3 });
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(4, 22, 6), schwarz);
      horn.position.set(4, 36, s * 12);
      horn.rotation.x = s * 0.5;
      torso.add(horn);
    }
  }
  if (typ.boss) for (const s of [-1, 1]) torso.add(klotz(1, 3, 4, leucht('#ff2222'), 23.6, 22, s * 4));   // Böse rote Augen
  if (typ.krone) {   // 👑 Der Baron hat eine goldene Krone
    const gold = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.9, roughness: 0.25, emissive: '#a16207', emissiveIntensity: 0.3 });
    torso.add(klotz(26, 4, 26, gold, -2, 30, 0));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const zacke = new THREE.Mesh(new THREE.ConeGeometry(2.5, 9, 4), gold);
      zacke.position.set(-2 + Math.cos(a) * 11, 36, Math.sin(a) * 11);
      torso.add(zacke);
    }
  }
  if (typ.id === 'feuer') {    // 🔥 Heiße Lüftung am Bauch
    for (const s of [-1, 1]) torso.add(klotz(1, 6, 8, leucht('#ff6a00'), 12.6, 0, s * 7));
  }
  // Antenne mit leuchtender Spitze
  const antZ = typ.slots.some(sl => sl.ort === 'schulterR') ? 0 : 10;
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
  g.raketenLicht.color.set(m.waffen.some(s => s.art === 'rakete' && s.pause <= 0) ? SLOT_ARTEN.rakete.hell : '#222222');   // Raketen bereit = grünes Licht
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
const laserMat = new THREE.MeshBasicMaterial({ color: SLOT_ARTEN.laser.hell });   // 🔵 Laser sind blau
const salvenGeo = new THREE.CylinderGeometry(2.5, 3.5, 20, 8).rotateX(Math.PI / 2);   // zeigt nach vorne (z)
const salvenMat = new THREE.MeshStandardMaterial({ color: '#e5e7eb', emissive: '#c084fc', emissiveIntensity: 0.6 });
const raketenGeo = new THREE.BoxGeometry(6, 6, 18);
const granatenGeo = new THREE.SphereGeometry(5, 10, 8);   // 🏰 Kanonen-Kugel vom Bollwerk
const granatenMat = new THREE.MeshStandardMaterial({ color: '#333333', emissive: SLOT_ARTEN.kanone.farbe, emissiveIntensity: 0.8 });   // 🟣 lila Kanonenkugel
const raketenMat = new THREE.MeshStandardMaterial({ color: '#dddddd', emissive: '#ff9f43', emissiveIntensity: 0.4 });
let schussMeshes = [];
function zeigeSchuesse() {
  for (const s of schuesse) {
    if (!s.mesh) {
      if (s.art === 'kugel') s.mesh = new THREE.Mesh(kugelGeo, kugelMat[s.team]);
      else if (s.art === 'strahl') s.mesh = new THREE.Mesh(strahlGeo, s.laser ? laserMat : strahlMat);
      else if (s.art === 'salve') s.mesh = new THREE.Mesh(salvenGeo, salvenMat);
      else if (s.art === 'granate') s.mesh = new THREE.Mesh(granatenGeo, granatenMat);
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
  const licht = new THREE.MeshBasicMaterial({ color: SLOT_ARTEN.rakete.hell });
  waffen.userData.spitze = {};
  // Du siehst die Waffen an deinen Armen links und rechts unten im Bild
  for (const slot of typ.slots) {
    if (slot.ort !== 'armL' && slot.ort !== 'armR') continue;
    const s = slot.ort === 'armL' ? -1 : 1;
    if (!WAFFEN[slot.waffe]) continue;   // Leerer Slot
    const modell = waffenModell(WAFFEN[slot.waffe], slot.art, mat, akzent, licht, 0.9);
    modell.rotation.y = Math.PI / 2;   // Modelle zeigen nach +x, die Kamera schaut nach -z
    modell.position.set(s * 16, -15, -22);
    modell.traverse(o => { o.userData.teil = slot.ort; });
    waffen.add(modell);
    waffen.userData.spitze[slot.ort] = -22 - (slot.art === 'rakete' ? 14 : 44);
  }
  waffen.add(muendungsBlitz);
  waffen.traverse(o => { o.renderOrder = 10; });
}
baueWaffen(meinMech);

// =====================================================================
// ===== 🎬 Das Intro: Mech hochfahren und Abwurf aus dem Raumschiff =====
// =====================================================================
// Ablauf (in Sekunden):
//   0   bis 6.6   Der Pilot fährt den Mech hoch: Hauptschalter, Knöpfe drücken, Steuerknüppel testen
//   6.6 bis 7.4   Der Sichtschutz geht auf – du hängst unter einem Raumschiff hoch in der Luft!
//   7.4 bis 11.4  Das Raumschiff fliegt runter
//   11.4          RUMMS! Gelandet. Kurz danach gehen die Klammern auf
//   12.1 bis 14.8 Das Raumschiff fliegt weg
// Mit Klick oder Leertaste kann man das Intro überspringen.
const INTRO = { hochfahren: 6.6, aufgehen: 7.4, landen: 11.4, loslassen: 12.1, ende: 14.8 };
const ABWURF_HOEHE = 650;
let intro = null;
let funk = null;   // 📻 Ein Funkspruch während der Mission { wer, text, t }

// ===== Das Steuerpult: Knöpfe, die der Pilot drückt =====
// hand: -1 = linke Hand, 1 = rechte Hand.  lx / lz: Wo der Knopf auf dem Pult sitzt (lz größer = näher beim Piloten)
const PILOT_KNOEPFE = [
  { id: 'strom',     name: 'HAUPTSCHALTER', lx: 0,   lz: -4, farbe: '#ef4444', hand: 1,  zeit: 0.7, hebel: true },
  { id: 'reaktor',   name: 'REAKTOR',       lx: -14, lz: -1, farbe: '#facc15', hand: -1, zeit: 1.4 },
  { id: 'hydraulik', name: 'HYDRAULIK',     lx: 14,  lz: -1, farbe: '#38bdf8', hand: 1,  zeit: 2.0 },
  { id: 'waffen',    name: 'WAFFEN',        lx: -8,  lz: 4,  farbe: '#a855f7', hand: -1, zeit: 2.6 },
  { id: 'funk',      name: 'FUNK',          lx: 8,   lz: 4,  farbe: '#4ade80', hand: 1,  zeit: 3.2 },
];
// Der Steuerungstest: Wann macht der Pilot was mit den Steuerknüppeln?
const STEUER_TEST = { greifen: 3.7, beine: [3.9, 4.5], drehen: [4.5, 5.1], abzug: [5.25, 5.45], daumen: 5.75 };
const strombei = t => t < 0.7 ? 0 : Math.min(1, (t - 0.7) / 2.6);   // Wie viel Strom hat das Cockpit schon?
const glatt = k => k * k * (3 - 2 * k);   // Sanft losfahren und sanft ankommen

function bootAblauf(typ) {   // Was der Bordcomputer beim Hochfahren anzeigt (und wann)
  return [
    { t: 0.7, text: '⏻  Hauptschalter ......... AN', ton: 'schalter' },
    { t: 1.4, text: '⚡  Reaktor startet ....... OK', ton: 'knopf' },
    { t: 2.0, text: '🔧  Hydraulik ............. OK', ton: 'knopf' },
    { t: 2.6, text: `🎯  Waffen-Slots ${typ.slots.map(s => SLOT_ARTEN[s.art].punkt).join('')} ... OK`, ton: 'knopf' },
    { t: 3.2, text: '📡  Funk zum Team ......... OK', ton: 'knopf' },
    { t: 3.7, text: '🕹️  Steuerungstest ...', ton: 'piep' },
    { t: 4.5, text: '      🦿 Beine ............ ✓', ton: 'piep' },
    { t: 5.1, text: '      🔄 Drehen ........... ✓', ton: 'piep' },
    { t: 5.5, text: '      🔫 Abzug ............ ✓', ton: 'piep' },
    { t: 5.9, text: '      🚀 Raketen .......... ✓', ton: 'piep' },
    { t: 6.2, text: `✅  ${typ.name.toUpperCase()} IST BEREIT!`, ton: 'bereit' },
  ];
}

// =====================================================================
// ===== 🎬 Das 3D-Cockpit für das Intro =====
// =====================================================================
// Alles hängt an der Kamera (wie die Waffen). Die Kamera schaut nach -z, x ist rechts, y ist oben.
const kabine = new THREE.Group();
kamera.add(kabine);
kabine.visible = false;
const kMat = {
  pult: new THREE.MeshStandardMaterial({ color: '#3a404e', roughness: 0.6, metalness: 0.5 }),
  dunkel: new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.7, metalness: 0.3 }),
  metall: new THREE.MeshStandardMaterial({ color: '#8a90a0', roughness: 0.35, metalness: 0.8 }),
  gummi: new THREE.MeshStandardMaterial({ color: '#202228', roughness: 1 }),
  handschuh: new THREE.MeshStandardMaterial({ color: '#2a2c33', roughness: 0.75 }),
  aermel: new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.9 }),
  streifen: new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.8 }),
  bund: new THREE.MeshStandardMaterial({ color: '#d1d5db', roughness: 0.8 }),
  klappe: new THREE.MeshStandardMaterial({ color: '#ef4444', transparent: true, opacity: 0.45, roughness: 0.2 }),
};
function kKlotz(b, h, t, mat, x, y, z) { const k = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat); k.position.set(x, y, z); return k; }
function kZylinder(r1, r2, h, mat, x, y, z) { const k = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 14), mat); k.position.set(x, y, z); return k; }
// Ein Bildschirm, auf den wir jedes Bild neu malen können
function bildschirm(b, h, pxB, pxH) {
  const c = document.createElement('canvas');
  c.width = pxB; c.height = pxH;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(b, h), new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, c, g: c.getContext('2d'), tex };
}
function schild(t, b) {   // Ein kleines Namensschild unter einem Knopf
  const tex = malTextur(128, 24, (g, w, h) => {
    g.fillStyle = '#111318'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e5e7eb'; g.font = 'bold 15px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(t, w / 2, h / 2 + 1);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(b, b * 24 / 128), new THREE.MeshBasicMaterial({ map: tex }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ----- Der Sichtschutz (Metallplatten vor dem Fenster) mit dem Bildschirm des Bordcomputers -----
const sichtschutz = new THREE.Group();
sichtschutz.position.z = -55;
kabine.add(sichtschutz);
const plattenTextur = malTextur(512, 320, (g, b, h) => {
  const v = g.createLinearGradient(0, 0, 0, h);
  v.addColorStop(0, '#3a404c'); v.addColorStop(1, '#22262e');
  g.fillStyle = v; g.fillRect(0, 0, b, h);
  g.fillStyle = 'rgba(0,0,0,0.4)';
  for (let y = 64; y < h; y += 64) g.fillRect(0, y, b, 4);   // Fugen
  g.fillStyle = '#5b6274';
  for (let y = 64; y < h; y += 64) for (let x = 24; x < b; x += 64) { g.beginPath(); g.arc(x, y - 12, 4, 0, 7); g.fill(); }   // Nieten
  g.fillStyle = '#1b1b1b'; g.fillRect(0, h - 22, b, 22);   // Warnstreifen unten
  g.fillStyle = '#ffd166';
  for (let x = -22; x < b; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 38, h - 22); g.lineTo(x + 22, h - 22); g.fill(); }
});
plattenTextur.wrapS = plattenTextur.wrapT = THREE.ClampToEdgeWrapping;
sichtschutz.add(new THREE.Mesh(new THREE.PlaneGeometry(170, 106), new THREE.MeshBasicMaterial({ map: plattenTextur, color: '#cfd4de' })));
const terminal = bildschirm(58, 36, 580, 360);
terminal.mesh.position.set(0, 18, 0.5);
sichtschutz.add(terminal.mesh);
sichtschutz.add(kKlotz(61, 39, 1, kMat.dunkel, 0, 18, 0));   // Rahmen um den Bildschirm

// ----- Unten: Pult, Steuerknüppel und die Hände (das alles rutscht weg, wenn der Sichtschutz aufgeht) -----
const unten = new THREE.Group();
kabine.add(unten);
const pult = new THREE.Group();
pult.position.set(0, -9, -29);
pult.rotation.x = 0.6;   // Schräg, damit der Pilot gut drankommt
unten.add(pult);
pult.add(kKlotz(66, 3, 19, kMat.pult, 0, -1.5, 0));
pult.add(kKlotz(66.4, 0.6, 1, kMat.metall, 0, 0.1, -9.5));   // Metallkante hinten
pult.add(kKlotz(66.4, 0.6, 1, kMat.metall, 0, 0.1, 9.5));    // und vorne
for (let x = -30; x <= 30; x += 10) pult.add(kZylinder(0.35, 0.35, 0.3, kMat.metall, x, 0.15, -8.6));   // Nieten
// Lämpchen-Reihe hinten auf dem Pult
const pultLampen = [];
for (let i = 0; i < 14; i++) {
  const mat = new THREE.MeshBasicMaterial({ color: '#2a2f3a' });
  const l = kKlotz(1.6, 0.5, 0.8, mat, -26 + i * 4, 0.3, -7.3);
  pult.add(l); pultLampen.push({ mat, farbe: ['#4ade80', '#ffd166', '#38bdf8'][i % 3] });
}
// Die Knöpfe
const knopf3D = PILOT_KNOEPFE.map(k => {
  const teil = { k, mat: new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.4, emissive: '#000000' }) };
  if (k.hebel) {   // Kippschalter mit Schutzklappe
    pult.add(kKlotz(5, 1, 4, kMat.dunkel, k.lx, 0.5, k.lz));
    teil.hebel = new THREE.Group();
    teil.hebel.position.set(k.lx, 1, k.lz);
    teil.hebel.add(kZylinder(0.35, 0.35, 3, kMat.metall, 0, 1.5, 0));
    const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), teil.mat);
    knauf.position.y = 3;
    teil.hebel.add(knauf);
    pult.add(teil.hebel);
    const klappe = kKlotz(5.4, 0.3, 4.4, kMat.klappe, 0, 0, 0);   // Rote Schutzklappe – hochgeklappt
    klappe.position.set(k.lx, 3.2, k.lz - 2.6);
    klappe.rotation.x = -1.2;
    pult.add(klappe);
  } else {
    pult.add(kZylinder(1.9, 1.9, 0.6, kMat.dunkel, k.lx, 0.3, k.lz));   // Fassung
    teil.kappe = kZylinder(1.35, 1.35, 1, teil.mat, k.lx, 0.9, k.lz);
    pult.add(teil.kappe);
  }
  const s = schild(k.name, 6.4);
  s.position.set(k.lx, 0.05, k.lz + (k.hebel ? 3 : 2.6));
  pult.add(s);
  return teil;
});
// Test-Bildschirm in der Mitte: Der Punkt zeigt, wohin die Steuerknüppel drücken
const testSchirm = bildschirm(8, 5, 160, 100);
testSchirm.mesh.rotation.x = -Math.PI / 2;
testSchirm.mesh.position.set(0, 0.06, 4.6);
pult.add(testSchirm.mesh);
// Die zwei Steuerknüppel (links für die Beine, rechts zum Drehen und Schießen)
const knueppel3D = [-1, 1].map(seite => {
  const basis = new THREE.Group();
  basis.position.set(seite * 15, -19, -18);
  basis.add(kZylinder(3.2, 3.6, 1.2, kMat.dunkel, 0, 0, 0));
  basis.add(kZylinder(1.2, 2.4, 2.2, kMat.gummi, 0, 1.6, 0));   // Gummi-Manschette
  const kipp = new THREE.Group();
  kipp.position.y = 1;
  basis.add(kipp);
  kipp.add(kZylinder(0.45, 0.45, 6, kMat.metall, 0, 3, 0));
  kipp.add(kKlotz(2.2, 3.8, 2.4, kMat.gummi, 0, 7.2, 0));         // Griff
  const knopfMat = new THREE.MeshStandardMaterial({ color: seite < 0 ? SLOT_ARTEN.rakete.farbe : '#ef4444', emissive: '#000000' });
  const oben = kZylinder(0.7, 0.7, 0.5, knopfMat, 0, 9.3, 0);
  kipp.add(oben);
  const abzug = kKlotz(0.8, 1.4, 0.7, kMat.metall, 0, 7.6, -1.5);   // Abzug vorne
  kipp.add(abzug);
  unten.add(basis);
  return { seite, basis, kipp, knopfMat, oben, abzug };
});
// Wohin ist der Steuerknüppel gerade gekippt?
function knueppelKipp(seite, t) {
  const [b0, b1] = STEUER_TEST.beine, [d0, d1] = STEUER_TEST.drehen;
  let vor = 0, quer = 0;
  if (seite < 0 && t > b0 && t < b1) vor = Math.sin((t - b0) / (b1 - b0) * Math.PI * 2);    // Links: vor und zurück
  if (seite > 0 && t > d0 && t < d1) quer = Math.sin((t - d0) / (d1 - d0) * Math.PI * 2);   // Rechts: links und rechts
  return { vor, quer };
}
// Wo ist der Griff oben? (im Raum von "unten")
function griffPunkt(seite, t) {
  const k = knueppel3D[seite < 0 ? 0 : 1], kp = knueppelKipp(seite, t);
  const e = new THREE.Euler(-kp.vor * 0.45, 0, -kp.quer * 0.45);
  return new THREE.Vector3(0, 9.5, 0).applyEuler(e).add(new THREE.Vector3(0, 1, 0)).add(k.basis.position);
}
// Ein Punkt auf dem Pult (lx, hoehe, lz) im Raum von "unten"
const aufPult = (x, y, z) => new THREE.Vector3(x, y, z).applyEuler(pult.rotation).add(pult.position);

// ----- Die Hände des Piloten: Handschuh mit Fingern, die sich einzeln beugen können -----
// Im Modell zeigen die Finger nach +z, der Handrücken nach +y.
function baueHand3D(seite) {
  const hand = new THREE.Group();
  hand.add(kKlotz(3.6, 1.4, 3.4, kMat.handschuh, 0, 0, 0));                 // Handfläche
  hand.add(kKlotz(3.0, 0.3, 2.4, kMat.bund, 0, 0.75, -0.3));               // Klettverschluss oben
  const bund = kZylinder(2.0, 2.1, 1.6, kMat.bund, 0, 0, -2.3);
  bund.rotation.x = Math.PI / 2;
  hand.add(bund);
  const finger = [];
  for (let i = 0; i < 4; i++) {   // i = 0 ist der Zeigefinger (auf der Daumenseite)
    const x = -seite * (1.25 - i * 0.82);
    const glied1 = new THREE.Group(); glied1.position.set(x, 0, 1.6);
    glied1.add(kKlotz(0.72, 0.75, 1.5, kMat.handschuh, 0, 0, 0.7));
    const glied2 = new THREE.Group(); glied2.position.z = 1.45;
    glied2.add(kKlotz(0.68, 0.7, 1.3 - (i === 3 ? 0.3 : 0), kMat.handschuh, 0, 0, 0.6));
    glied1.add(glied2);
    hand.add(glied1);
    finger.push({ glied1, glied2, biege: 0.2 });
  }
  const daumenGlied1 = new THREE.Group();
  daumenGlied1.position.set(-seite * 1.9, -0.2, 0.3);
  daumenGlied1.rotation.y = -seite * 0.7;
  daumenGlied1.add(kKlotz(0.85, 0.85, 1.6, kMat.handschuh, 0, 0, 0.75));
  const daumenGlied2 = new THREE.Group(); daumenGlied2.position.z = 1.5;
  daumenGlied2.add(kKlotz(0.8, 0.8, 1.2, kMat.handschuh, 0, 0, 0.55));
  daumenGlied1.add(daumenGlied2);
  hand.add(daumenGlied1);
  // Ärmel vom Pilotenanzug (wird jedes Bild zwischen Schulter und Handgelenk gespannt)
  const aermel = new THREE.Group();
  aermel.add(new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 1, 12), kMat.aermel));
  const streifen = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.65, 0.12, 12), kMat.streifen);
  streifen.position.y = 0.38;
  aermel.add(streifen);
  unten.add(hand, aermel);
  return { seite, hand, finger, daumen: { glied1: daumenGlied1, glied2: daumenGlied2, biege: 0.3 }, aermel };
}
const haende3D = [baueHand3D(-1), baueHand3D(1)];
// Wie stark sind die Finger gebeugt? [Zeigefinger, Mittelfinger, Ringfinger, kleiner Finger, Daumen]
const HAND_POSEN = {
  offen:   [0.15, 0.15, 0.2, 0.25, 0.2],
  zeigen:  [0.05, 1.5, 1.5, 1.5, 0.9],
  greifen: [1.0, 1.45, 1.45, 1.45, 0.5],
  abzug:   [1.7, 1.45, 1.45, 1.45, 0.5],
  daumen:  [1.0, 1.45, 1.45, 1.45, 1.3],
};
// Wo will die Hand gerade hin, und was macht sie?
function handZiel3D(seite, t) {
  const ruhe = { p: new THREE.Vector3(seite * 15, -32, -10), pose: 'offen' };
  if (t >= STEUER_TEST.greifen) {
    let pose = 'greifen';
    if (seite > 0 && ((t > 5.25 && t < 5.35) || (t > 5.45 && t < 5.55))) pose = 'abzug';
    if (seite < 0 && t > STEUER_TEST.daumen && t < STEUER_TEST.daumen + 0.3) pose = 'daumen';
    return { p: griffPunkt(seite, t), pose, griff: true };
  }
  const punkte = [{ t: 0, ...ruhe }];
  const meine = PILOT_KNOEPFE.filter(k => k.hand === seite);
  punkte.push({ t: meine[0].zeit - 0.55, ...ruhe });
  for (const k of meine) {
    const hoch = k.hebel ? 4.2 : 1.4;   // Fingerspitze: über dem Knopf, drücken, wieder hoch
    punkte.push({ t: k.zeit - 0.12, p: aufPult(k.lx, hoch + 1.2, k.lz + (k.hebel ? 0.8 : 0)), pose: 'zeigen' });
    punkte.push({ t: k.zeit, p: aufPult(k.lx, hoch - 0.2, k.lz - (k.hebel ? 0.8 : 0)), pose: 'zeigen' });
    punkte.push({ t: k.zeit + 0.15, p: aufPult(k.lx, hoch + 1.6, k.lz), pose: 'zeigen' });
  }
  punkte.push({ t: STEUER_TEST.greifen, p: griffPunkt(seite, STEUER_TEST.greifen), pose: 'greifen', griff: true });
  for (let i = 0; i < punkte.length - 1; i++) {
    const a = punkte[i], b = punkte[i + 1];
    if (t >= a.t && t < b.t) {
      const f = glatt((t - a.t) / Math.max(0.001, b.t - a.t));
      return { p: a.p.clone().lerp(b.p, f), pose: f > 0.5 ? b.pose : a.pose, griff: f > 0.7 && b.griff };
    }
  }
  return punkte[punkte.length - 1];
}
const OBEN = new THREE.Vector3(0, 1, 0), drehMatrix = new THREE.Matrix4();
function stelleHand(h, t) {
  const ziel = handZiel3D(h.seite, t);
  const schulter = new THREE.Vector3(h.seite * 18, -30, 4);
  let mitte, richtung;
  if (ziel.griff) {   // Die Faust liegt oben auf dem Griff, die Finger umfassen ihn vorne
    richtung = new THREE.Vector3(0, -0.45, -1).normalize();
    mitte = ziel.p.clone().add(new THREE.Vector3(0, 1.5, 1.3));
  } else {            // Der Zeigefinger zeigt auf den Punkt
    richtung = ziel.p.clone().sub(schulter).normalize();
    mitte = ziel.p.clone().sub(richtung.clone().multiplyScalar(4.4));
  }
  drehMatrix.lookAt(mitte.clone().add(richtung), mitte, OBEN);   // Finger (+z) zeigen in die Richtung
  h.hand.quaternion.setFromRotationMatrix(drehMatrix);
  if (!ziel.griff) mitte.sub(new THREE.Vector3(-h.seite * 1.25, -0.3, 0).applyQuaternion(h.hand.quaternion));   // Genau der Zeigefinger soll auf den Knopf
  h.hand.position.copy(mitte);
  // Finger langsam in die neue Haltung bringen
  const pose = HAND_POSEN[ziel.pose];
  h.finger.forEach((f, i) => {
    f.biege += (pose[i] - f.biege) * 0.3;
    f.glied1.rotation.x = f.biege * 0.75;
    f.glied2.rotation.x = f.biege * 0.9;
  });
  h.daumen.biege += (pose[4] - h.daumen.biege) * 0.3;
  h.daumen.glied1.rotation.x = h.daumen.biege * 0.6;
  h.daumen.glied2.rotation.x = h.daumen.biege * 0.7;
  // Ärmel von der Schulter bis zum Handgelenk
  const gelenk = mitte.clone().sub(richtung.clone().multiplyScalar(2.6));
  const arm = gelenk.clone().sub(schulter);
  h.aermel.position.copy(schulter).add(gelenk).multiplyScalar(0.5);
  h.aermel.scale.set(1, arm.length(), 1);
  h.aermel.quaternion.setFromUnitVectors(OBEN, arm.normalize());
}

// ----- Jedes Bild: Cockpit an die Intro-Zeit anpassen -----
function zeigeKabine(t) {
  const offen = begrenzt((t - INTRO.hochfahren) / (INTRO.aufgehen - INTRO.hochfahren), 0, 1);
  kabine.visible = offen < 1;
  if (!kabine.visible) return;
  const strom = strombei(t), typ = spieler.typ;
  sichtschutz.position.y = offen * offen * 115;   // Sichtschutz fährt hoch ...
  unten.position.y = -offen * offen * 45;         // ... und das Pult rutscht nach unten weg
  pultLampen.forEach((l, i) => l.mat.color.set(strom > i / 14 ? l.farbe : '#2a2f3a'));
  for (const teil of knopf3D) {
    const an = t >= teil.k.zeit, gedrueckt = t >= teil.k.zeit - 0.03 && t < teil.k.zeit + 0.15;
    teil.mat.emissive.set(an ? teil.k.farbe : '#000000');
    teil.mat.emissiveIntensity = an ? 0.9 : 0;
    teil.mat.color.set(an ? teil.k.farbe : teil.k.hebel ? '#7f1d1d' : '#2b2f38');
    if (teil.kappe) teil.kappe.position.y = gedrueckt ? 0.45 : 0.9;
    if (teil.hebel) teil.hebel.rotation.x = an ? -0.6 : t > teil.k.zeit - 0.12 ? 0 : 0.6;   // Klack: Hebel nach vorne
  }
  for (const k of knueppel3D) {
    const kp = knueppelKipp(k.seite, t);
    k.kipp.rotation.set(-kp.vor * 0.45, 0, -kp.quer * 0.45);
    const daumen = k.seite < 0 && t > STEUER_TEST.daumen && t < STEUER_TEST.daumen + 0.3;
    k.knopfMat.emissive.set(daumen ? SLOT_ARTEN.rakete.farbe : '#000000');
    k.oben.position.y = daumen ? 9.1 : 9.3;
    const zieht = k.seite > 0 && ((t > 5.25 && t < 5.35) || (t > 5.45 && t < 5.55));
    k.abzug.position.z = zieht ? -1.1 : -1.5;
  }
  for (const h of haende3D) stelleHand(h, t);

  // Bordcomputer-Bildschirm neu malen
  const g = terminal.g, b = terminal.c.width, hh = terminal.c.height;
  g.fillStyle = '#050a07'; g.fillRect(0, 0, b, hh);
  if (strom > 0) {
    g.textBaseline = 'middle';
    g.fillStyle = '#4ade80'; g.font = 'bold 24px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(`${typ.emoji} ${typ.name} · Bordcomputer`, b / 2, 26);
    g.fillStyle = '#1f3d2a'; g.fillRect(20, 46, b - 40, 3);
    g.textAlign = 'left'; g.font = 'bold 20px system-ui, sans-serif';
    for (let i = 0; i <= intro.zeile; i++) {
      g.fillStyle = i === intro.zeilen.length - 1 ? '#ffd166' : '#4ade80';
      g.fillText(intro.zeilen[i].text, 26, 66 + i * 24);
    }
    if (Math.sin(t * 12) > 0 && intro.zeile < intro.zeilen.length - 1) { g.fillStyle = '#4ade80'; g.fillRect(26, 56 + (intro.zeile + 1) * 24, 12, 18); }
    g.fillStyle = '#10261a'; g.fillRect(26, hh - 20, b - 52, 10);
    g.fillStyle = '#4ade80'; g.fillRect(26, hh - 20, (b - 52) * begrenzt(t / (INTRO.hochfahren - 0.3), 0, 1), 10);
  }
  terminal.tex.needsUpdate = true;
  // Test-Bildschirm neu malen
  const s = testSchirm.g, sb = testSchirm.c.width, sh = testSchirm.c.height;
  s.fillStyle = '#050a07'; s.fillRect(0, 0, sb, sh);
  if (strom > 0.5) {
    s.strokeStyle = '#1f3d2a'; s.lineWidth = 2;
    s.beginPath(); s.moveTo(10, sh / 2); s.lineTo(sb - 10, sh / 2); s.moveTo(sb / 2, 8); s.lineTo(sb / 2, sh - 8); s.stroke();
    const l = knueppelKipp(-1, t), r = knueppelKipp(1, t);
    s.fillStyle = '#4ade80'; s.beginPath(); s.arc(sb / 2 + r.quer * 55, sh / 2 - l.vor * 35, 7, 0, 7); s.fill();
    s.textAlign = 'center'; s.font = 'bold 13px system-ui, sans-serif';
    s.fillText(t > STEUER_TEST.greifen ? 'STEUERUNGSTEST' : 'BEREIT', sb / 2, 14);
    if (t > STEUER_TEST.abzug[0] && t < STEUER_TEST.abzug[1] + 0.15) { s.fillStyle = '#ffd166'; s.fillText('PENG!', sb / 2, sh - 12); }
    if (t > STEUER_TEST.daumen && t < STEUER_TEST.daumen + 0.4) { s.fillStyle = '#4ade80'; s.fillText('WUSCH!', sb / 2, sh - 12); }
  }
  testSchirm.tex.needsUpdate = true;
}

// Das Raumschiff (vorne ist +x, wie beim Mech). Unten hängen zwei Klammern, die den Mech festhalten.
const flammenMat = new THREE.MeshBasicMaterial({ color: '#ff9f43', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const glasMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#0ea5e9', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3 });
function baueLandeschiff(m) {
  const T = TEAMS[m.team];
  const rumpfMat = metall('#9aa3b5'), teamMat = metall(T.farbe), dunkel = metall(T.dunkel);
  const g = new THREE.Group();
  // Rumpf, Nase und Cockpit-Fenster
  g.add(klotz(140, 26, 54, rumpfMat, 0, 13, 0));
  g.add(klotz(141, 5, 55, teamMat, 0, 18, 0));                        // Streifen in der Team-Farbe
  g.add(schraeg(klotz(46, 20, 44, rumpfMat, 84, 10, 0), 0.25));      // Nase
  g.add(schraeg(klotz(28, 6, 34, glasMat, 64, 26, 0), -0.15));       // Cockpit-Fenster
  g.add(klotz(70, 12, 36, dunkel, -14, 32, 0));                      // Buckel oben
  g.add(klotz(32, 34, 4, teamMat, -56, 44, 0));                      // Heckflosse
  // Flügel mit Lichtern an den Spitzen (links rot, rechts grün – wie bei echten Flugzeugen)
  const lichter = [];
  for (const s of [-1, 1]) {
    g.add(klotz(60, 5, 72, rumpfMat, -12, 14, s * 62));
    g.add(klotz(61, 2, 30, teamMat, -12, 17, s * 80));
    const l = klotz(7, 5, 7, leucht(s < 0 ? '#ff3b3b' : '#4ade80'), -12, 14, s * 99);
    g.add(l); lichter.push(l);
  }
  // Düsen: zwei zeigen nach unten (zum Schweben), zwei nach hinten (zum Wegfliegen)
  const flammenUnten = [], flammenHinten = [];
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 14, 12), dunkel);
    d.position.set(-12, 5, s * 62);
    g.add(d);
    const f = new THREE.Mesh(new THREE.ConeGeometry(8, 36, 10), flammenMat);
    f.rotation.x = Math.PI;   // Spitze zeigt nach unten
    f.position.set(-12, -20, s * 62);
    g.add(f); flammenUnten.push(f);
    g.add(rohr(9, 18, dunkel, -78, 14, s * 16));
    const fh = new THREE.Mesh(new THREE.ConeGeometry(8, 40, 10), flammenMat);
    fh.rotation.z = Math.PI / 2;   // Spitze zeigt nach hinten
    fh.position.set(-107, 14, s * 16);
    g.add(fh); flammenHinten.push(fh);
  }
  // Die Klammern, die den Mech halten
  const klammern = [];
  for (const s of [-1, 1]) {
    const k = new THREE.Group();
    k.position.set(0, 0, s * 20);
    k.add(klotz(7, 36, 7, dunkel, 0, -18, 0));
    k.add(klotz(18, 6, 12, teamMat, 0, -36, -s * 3));
    k.add(klotz(4, 4, 4, leucht('#ffd166'), 0, -8, s * 4));
    g.add(k); klammern.push({ k, s });
  }
  g.traverse(o => { if (o.isMesh && o.material !== flammenMat) o.castShadow = true; });
  g.scale.setScalar(m.typ.groesse);
  g.rotation.y = -m.zielWinkel;
  return { gruppe: g, klammern, flammenUnten, flammenHinten, lichter };
}

function introStarten() {
  intro = { t: 0, zeile: -1, schiffe: [], gelandet: false, losgelassen: false, rumpel: 0, zeilen: bootAblauf(spieler.typ) };
  for (const m of mechs) {
    const s = baueLandeschiff(m);
    szene.add(s.gruppe);
    intro.schiffe.push({ m, ...s, weg: { x: 0, h: 0, v: 0 } });
  }
  blick.hoch = 0;
  introPositionen();
}
// Wo sind Mechs und Raumschiffe gerade?
function introPositionen() {
  const t = intro.t;
  const k = begrenzt((t - INTRO.aufgehen) / (INTRO.landen - INTRO.aufgehen), 0, 1);
  const runter = 1 - Math.pow(1 - k, 3);   // Am Anfang schnell, zum Schluss ganz sanft
  for (const s of intro.schiffe) {
    const m = s.m, gr = m.typ.groesse;
    const boden = standHoehe(m.x, m.y, 0);
    const schwanken = (1 - k) * Math.sin(t * 1.3 + m.nr) * 6;
    m.z = boden + ABWURF_HOEHE * (1 - runter);
    m.vz = 0;
    // Das Raumschiff: erst direkt über dem Mech, dann fliegt es nach vorne oben weg
    const vx = Math.cos(m.zielWinkel), vy = Math.sin(m.zielWinkel);
    const ueber = m.z + 125 * gr + s.weg.h;
    s.gruppe.position.set(m.x + vx * s.weg.x + schwanken, ueber, m.y + vy * s.weg.x);
    s.gruppe.rotation.z = Math.min(0.35, s.weg.h / 300);   // Nase hoch beim Wegfliegen
    // Flammen flackern
    const flacker = 0.8 + Math.random() * 0.4;
    for (const f of s.flammenUnten) f.scale.set(1, flacker * (s.weg.v > 0 ? 0.6 : 1.2), 1);
    for (const f of s.flammenHinten) f.scale.set(1, flacker * (s.weg.v > 0 ? 1.6 : 0.3), 1);
    for (const l of s.lichter) l.visible = Math.sin(zeit * 6 + m.nr) > 0;
    // Klammern gehen auf
    const auf = begrenzt((t - INTRO.landen - 0.3) / 0.4, 0, 1);
    for (const { k: kl, s: seite } of s.klammern) kl.rotation.x = -seite * auf * 0.9;
  }
}
function updateIntro(dt) {
  const t0 = intro.t;
  intro.t += dt;
  const t = intro.t;
  // Hochfahren: Was passiert gerade? (Knöpfe, Steuerknüppel, Bordcomputer)
  const passiert = z => t0 < z && t >= z;
  intro.zeile = intro.zeilen.filter(e => e.t <= t).length - 1;
  for (const e of intro.zeilen) if (passiert(e.t)) {
    if (e.ton === 'schalter') { ton(90, 0, 0.08, 'square', 0.15); ton(60, 0.05, 1.6, 'sawtooth', 0.05, 320); }   // Klack ... Wuuuuumm
    else if (e.ton === 'knopf') ton(1300, 0, 0.05, 'square', 0.06);
    else if (e.ton === 'bereit') { ton(660, 0, 0.12, 'square', 0.07); ton(990, 0.13, 0.25, 'square', 0.07); }
    else ton(880, 0, 0.06, 'square', 0.04);
  }
  for (const k of PILOT_KNOEPFE) if (passiert(k.zeit - 0.02)) ton(180, 0, 0.04, 'square', 0.08);   // Klick!
  if (passiert(STEUER_TEST.greifen)) ton(140, 0, 0.06, 'square', 0.05);
  if (passiert(STEUER_TEST.beine[0])) { ton(240, 0, 0.6, 'sawtooth', 0.03, 420); wackeln = 2; }   // Servomotoren surren
  if (passiert(STEUER_TEST.drehen[0])) { ton(300, 0, 0.6, 'sawtooth', 0.03, 520); wackeln = 2; }
  if (passiert(STEUER_TEST.abzug[0]) || passiert(STEUER_TEST.abzug[1])) sound.mg(0.5);
  if (passiert(STEUER_TEST.daumen)) ton(700, 0, 0.08, 'square', 0.06);
  if (passiert(INTRO.hochfahren)) { rauschen(0, 0.8, 0.08, 1200); ton(200, 0, 0.8, 'sawtooth', 0.04, 90); }   // Sichtschutz fährt hoch
  // Triebwerke brummen
  intro.rumpel -= dt;
  if (intro.rumpel <= 0 && t > INTRO.hochfahren && t < INTRO.ende - 0.5) {
    intro.rumpel = 0.4;
    rauschen(0, 0.5, t < INTRO.loslassen ? 0.06 : 0.1, 500);
  }
  // Gelandet: RUMMS!
  if (!intro.gelandet && t >= INTRO.landen) {
    intro.gelandet = true;
    wackeln = 9;
    sound.boom(0.6); sound.schritt(2);
    const staub = karte.id === 'eis' ? '#ffffff' : karte.id === 'planet' ? '#b9a7d6' : '#9a9a9a';
    for (const m of mechs) for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      partikel.push({ x: m.x + Math.cos(a) * 20, y: m.y + Math.sin(a) * 20, h: m.z + 5, vh: 30 + Math.random() * 40, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, t: 1.2, max: 1.2, farbe: staub, rauch: true });
    }
  }
  if (!intro.losgelassen && t >= INTRO.landen + 0.3) {   // Klack-klack: die Klammern gehen auf
    intro.losgelassen = true;
    ton(300, 0, 0.05, 'square', 0.08); ton(220, 0.12, 0.05, 'square', 0.08);
  }
  // Das Raumschiff fliegt weg
  if (t >= INTRO.loslassen) {
    if (intro.schiffe[0] && intro.schiffe[0].weg.v === 0) { ton(120, 0, 1.6, 'sawtooth', 0.06, 600); rauschen(0, 1.5, 0.12, 2500); }
    for (const s of intro.schiffe) {
      s.weg.v += 500 * dt;
      s.weg.h += s.weg.v * 0.7 * dt;
      s.weg.x += s.weg.v * dt;
    }
  }
  // Wohin schaut der Pilot? Erst geradeaus, beim Runterfliegen etwas nach unten, dann dem Raumschiff hinterher
  const zielHoch = t < INTRO.aufgehen ? 0 : t < INTRO.landen ? -0.22 : t < INTRO.ende - 0.8 ? 0.32 : 0;
  blick.hoch += (zielHoch - blick.hoch) * Math.min(1, dt * 2.5);
  blick.links = spieler.zielWinkel;
  introPositionen();
  if (t >= INTRO.ende) introBeenden();
}
function introWeg() {   // Intro ganz wegräumen (z. B. wenn man den Raum verlässt)
  if (!intro) return;
  for (const s of intro.schiffe) szene.remove(s.gruppe);
  intro = null;
}
function introBeenden() {
  if (!intro) return;
  for (const s of intro.schiffe) szene.remove(s.gruppe);
  for (const m of mechs) { m.z = standHoehe(m.x, m.y, 0); m.vz = 0; }
  intro = null;
  blick.hoch = 0;
  countdown = 3.99;
}

// Die Anzeige während des Intros (vorne auf dem HUD)
function zeichneIntro() {
  const t = intro.t, typ = spieler.typ;
  // Der Sichtschutz, das Pult und die Hände sind jetzt 3D (siehe zeigeKabine)
  const offen = begrenzt((t - INTRO.hochfahren) / (INTRO.aufgehen - INTRO.hochfahren), 0, 1);
  if (offen >= 1) zeichneCockpit(strombei(t));   // Danach: das normale Cockpit
  else if (t > INTRO.hochfahren) text('⚠️ SICHTSCHUTZ ÖFFNET', W / 2, 60, 20, '#ffd166');
  // Am Anfang ist es dunkel (nur ein rotes Notlicht blinkt)
  const dunkel = t < 0.7 ? 0.65 : Math.max(0, 0.65 - (t - 0.7) * 1.5);
  if (dunkel > 0) {
    ctx.fillStyle = `rgba(0,0,0,${dunkel})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,40,40,${dunkel * 0.15 * (1 + Math.sin(zeit * 4))})`; ctx.fillRect(0, 0, W, H);
  }
  // Texte während des Abwurfs
  if (t > INTRO.aufgehen) {
    let info;
    if (t < INTRO.landen) info = `🚀 Landeanflug ...  Höhe: ${Math.round((spieler.z - standHoehe(spieler.x, spieler.y, 0)) / 10)} m`;
    else if (t < INTRO.loslassen) info = '🦶 Gelandet! Klammern lösen ...';
    else info = '👋 Das Raumschiff fliegt weg. Viel Glück, Pilot!';
    ctx.fillStyle = 'rgba(15,17,24,0.8)'; rr(W / 2 - 230, 40, 460, 58, 12); ctx.fill();
    text(info, W / 2, 60, 18, '#ffd166', 'center', false);
    const modusInfo = modusInfoVon(modus);
    text(`${karte.emoji} ${karte.name}  ·  ${modusInfo.emoji} ${modusInfo.name}`, W / 2, 84, 13, '#c9c3ff', 'center', false);
  }
  text(touchModus ? 'Tippen: Intro überspringen' : 'Klick oder Leertaste: Intro überspringen', W / 2, H - 100, 13, 'rgba(255,255,255,0.7)', 'center', false);
}

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
    k.scale.setScalar(m.salve.w.streuRadius + m.salve.w.radius * 0.5);
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
  zielRing.visible = !spieler.tot && !!hagelVon(spieler) && !spieler.salve && zustand === 'spiel';
  if (zielRing.visible) {
    const p = landePunkt(spieler);
    zielRing.position.set(p.x, standHoehe(p.x, p.y, 1e6) + 2, p.y);
    const hw = hagelVon(spieler).w;
    zielRing.scale.setScalar(hw.streuRadius + hw.radius * 0.5);
    zielRing.material.opacity = hagelVon(spieler).pause > 0 ? 0.25 : 0.85;
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
    muendungsBlitz.visible = muendungsZeit > 0;
    const ort = letzterSchuss.ort, amArm = ort === 'armL' || ort === 'armR';   // Mündungsfeuer an der Waffe, die zuletzt geschossen hat
    muendungsBlitz.position.set(ORTE[ort].seite * (amArm ? 16 : 10), amArm ? -15 : -20, (amArm && waffen.userData.spitze[ort]) || -40);
    blitzMat.color.set(letzterSchuss.farbe);
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
  if (intro) zeigeKabine(intro.t); else kabine.visible = false;   // 🎬 3D-Cockpit im Intro
  if (intro && intro.t < INTRO.aufgehen) waffen.visible = false;   // Beim Hochfahren sieht man die Waffen noch nicht
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
  if (modus === 'team' || modus === 'knockout' || modus === 'boss' || spieler.tot) return;
  const z = modus === 'punkt' ? ziele[0] : ziele[aktivesZiel];
  if (z.versteckt) return;
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
// ===== Das Cockpit (die Kabine, in der du sitzt) =====
// Große Mechs haben dickere Rahmen. Unten ist das Armaturenbrett mit Kompass, Waffen-Lämpchen und Tempo-Anzeige.
const RAHMEN_DICKE = { leicht: 0.75, medium: 1, heavy: 1.25, schwer: 1.5 };
const RISSE = Array.from({ length: 7 }, (_, i) => {   // Risse in der Scheibe (wenn das Visier kaputt geht)
  const x = 160 + ((i * 337) % 640), y = 90 + ((i * 211) % 300);
  const linien = [];
  for (let j = 0; j < 5; j++) {
    const a = j / 5 * Math.PI * 2 + i, l = 30 + ((i * 7 + j * 13) % 40);
    linien.push([x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, x + Math.cos(a + 0.3) * l * 1.6, y + Math.sin(a + 0.3) * l * 1.6]);
  }
  return linien;
});
let anhaenger = { winkel: 0, tempo: 0, letzterBlick: 0 };   // Der Glücksbringer, der vom Dach baumelt
function niete(x, y) {
  ctx.fillStyle = '#5b6274'; kreis(x, y, 2.6); ctx.fill();
  ctx.fillStyle = '#9aa3b8'; kreis(x - 0.8, y - 0.8, 1); ctx.fill();
}
function zeichneCockpit(strom = 1) {   // strom: beim Hochfahren gehen die Lämpchen nach und nach an (0 bis 1)
  const m = spieler, typ = m.typ, k = RAHMEN_DICKE[typ.klasse] || 1;
  const wipp = m.laeuft && !m.tot ? Math.abs(Math.sin(m.phase)) * 3 : 0;   // Beim Laufen wackelt alles ein bisschen
  const rahmen = '#232833', rahmenHell = '#353c4b';

  // ----- Risse in der Scheibe -----
  const visier = teilAnteil(m, 'visier');
  if (!m.tot && visier < 0.7) {
    const n = visier < 0.3 ? RISSE.length : visier < 0.5 ? 4 : 2;
    ctx.strokeStyle = 'rgba(230,240,255,0.55)'; ctx.lineWidth = 1.2;
    for (const riss of RISSE.slice(0, n)) for (const [x1, y1, x2, y2, x3, y3] of riss) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
    }
  }
  // ----- Spiegelungen auf der Scheibe -----
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.beginPath(); ctx.moveTo(W * 0.62, 0); ctx.lineTo(W * 0.7, 0); ctx.lineTo(W * 0.5, H * 0.6); ctx.lineTo(W * 0.46, H * 0.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W * 0.73, 0); ctx.lineTo(W * 0.75, 0); ctx.lineTo(W * 0.56, H * 0.6); ctx.lineTo(W * 0.55, H * 0.6); ctx.fill();

  ctx.save();
  ctx.translate(0, wipp);
  // ----- Fensterrahmen oben und an den Seiten -----
  const oben = 12 * k, saeule = 26 * k, ecke = 110 * k;
  const yDash = H - (46 + 16 * k);   // Oberkante vom Armaturenbrett
  ctx.fillStyle = rahmen;
  ctx.beginPath();
  ctx.moveTo(0, -10); ctx.lineTo(W, -10); ctx.lineTo(W, oben);
  ctx.lineTo(W - ecke, oben); ctx.lineTo(W - saeule, ecke * 0.6); ctx.lineTo(W - saeule * 0.7, yDash - 20); ctx.lineTo(W, yDash - 20);
  ctx.lineTo(W, H + 10); ctx.lineTo(0, H + 10); ctx.lineTo(0, yDash - 20); ctx.lineTo(saeule * 0.7, yDash - 20);
  ctx.lineTo(saeule, ecke * 0.6); ctx.lineTo(ecke, oben); ctx.lineTo(0, oben);
  ctx.closePath();
  // Innen ist das Fenster: nur den Rahmen füllen (Fenster = Loch)
  ctx.moveTo(ecke, oben); ctx.lineTo(W - ecke, oben); ctx.lineTo(W - saeule, ecke * 0.6); ctx.lineTo(W - saeule * 0.7, yDash - 20);
  ctx.lineTo(saeule * 0.7, yDash - 20); ctx.lineTo(saeule, ecke * 0.6); ctx.closePath();
  ctx.fill('evenodd');
  // Kante vom Fenster in der Mech-Farbe
  ctx.strokeStyle = typ.akzent; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(saeule * 0.7, yDash - 20); ctx.lineTo(saeule, ecke * 0.6); ctx.lineTo(ecke, oben); ctx.lineTo(W - ecke, oben);
  ctx.lineTo(W - saeule, ecke * 0.6); ctx.lineTo(W - saeule * 0.7, yDash - 20);
  ctx.stroke(); ctx.globalAlpha = 1;
  // Nieten
  for (let x = ecke + 20; x < W - ecke - 10; x += 60) niete(x, oben / 2);
  for (const s of [0, 1]) for (let y = ecke * 0.6 + 20; y < yDash - 30; y += 55) niete(s ? W - saeule * 0.45 : saeule * 0.45, y);
  // Schwere Mechs: extra Strebe in der Mitte oben
  if (k >= 1.25) {
    ctx.fillStyle = rahmen;
    ctx.beginPath(); ctx.moveTo(W / 2 - 18, oben - 1); ctx.lineTo(W / 2 + 18, oben - 1); ctx.lineTo(W / 2 + 6, oben + 22); ctx.lineTo(W / 2 - 6, oben + 22); ctx.fill();
    niete(W / 2, oben + 8);
  }
  // Warnlampen oben in den Ecken (blinken rot, wenn du wenig Leben hast)
  const gefahr = !m.tot && gesundheit(m) < 0.35;
  for (const s of [0, 1]) {
    const x = s ? W - ecke * 0.55 : ecke * 0.55, y = oben + 14 * k;
    ctx.fillStyle = '#11141b'; kreis(x, y, 8); ctx.fill();
    ctx.fillStyle = gefahr && Math.sin(zeit * 10) > 0 ? '#ff3b3b' : '#4a1d1d'; kreis(x, y, 5.5); ctx.fill();
  }

  // ----- Der Glücksbringer (baumelt, wenn du dich drehst oder läufst) -----
  const dreh = winkelDiff(anhaenger.letzterBlick, blick.links);
  anhaenger.letzterBlick = blick.links;
  anhaenger.tempo += (-anhaenger.winkel * 0.02 + dreh * 0.6 + (m.laeuft ? Math.sin(m.phase) * 0.004 : 0));
  anhaenger.tempo *= 0.94;
  anhaenger.winkel = begrenzt(anhaenger.winkel + anhaenger.tempo, -1, 1);
  const ax = W * 0.28, ay = oben, laenge = 46;
  const bx = ax + Math.sin(anhaenger.winkel) * laenge, by = ay + Math.cos(anhaenger.winkel) * laenge;
  ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  text(typ.emoji, bx, by + 9, 18, '#fff', 'center', false);

  // ----- Armaturenbrett -----
  const g = ctx.createLinearGradient(0, yDash - 20, 0, H);
  g.addColorStop(0, rahmenHell); g.addColorStop(1, '#151820');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H + 10); ctx.lineTo(0, yDash - 20); ctx.lineTo(240, yDash); ctx.lineTo(W - 240, yDash); ctx.lineTo(W, yDash - 20); ctx.lineTo(W, H + 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = typ.akzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
  ctx.beginPath(); ctx.moveTo(0, yDash - 20); ctx.lineTo(240, yDash); ctx.lineTo(W - 240, yDash); ctx.lineTo(W, yDash - 20); ctx.stroke();
  ctx.globalAlpha = 1;

  // Mittlerer Bildschirm: Kompass oben, Waffen-Lämpchen unten
  const bx0 = W / 2 - 150, by0 = yDash + 6, bw = 300, bh = H - yDash - 10;
  ctx.fillStyle = '#0b0f17'; rr(bx0, by0, bw, bh, 8); ctx.fill();
  ctx.strokeStyle = '#3d4558'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.rect(bx0 + 4, by0 + 2, bw - 8, 18); ctx.clip();
  if (strom < 0.3) ctx.globalAlpha = 0;   // Kompass geht erst später an
  const richtungen = ['O', 'SO', 'S', 'SW', 'W', 'NW', 'N', 'NO'];
  for (let i = -12; i <= 12; i++) {   // Striche alle 15 Grad, Buchstaben alle 45 Grad
    const grad = Math.round(blick.links / (Math.PI / 12)) + i;
    const x = W / 2 + (grad * Math.PI / 12 - blick.links) * 160;
    const gross = ((grad % 3) + 3) % 3 === 0;
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(x - 0.5, by0 + 14, 1, gross ? 6 : 3);
    if (gross) text(richtungen[(((grad / 3) % 8) + 8) % 8], x, by0 + 8, 10, '#4ade80', 'center', false);
  }
  ctx.restore();
  if (strom >= 0.3) { ctx.fillStyle = '#ffd166'; ctx.fillRect(W / 2 - 1, by0 + 2, 2, 18); }
  // Ein Lämpchen pro Waffen-Slot: hell = bereit, dunkel = lädt, X = Arm ab
  const n = m.waffen.length, abstand = Math.min(44, (bw - 20) / n);
  m.waffen.forEach((s, i) => {
    const x = W / 2 + (i - (n - 1) / 2) * abstand, y = by0 + 22 + (bh - 22) / 2;
    const farbe = SLOT_ARTEN[s.art];
    const geht = slotGeht(m, s), bereit = geht && s.pause <= 0;
    ctx.fillStyle = '#1a1f2b'; kreis(x, y, 12); ctx.fill();
    if (strom < (i + 1) / (n + 2)) return;   // Beim Hochfahren: noch aus
    if (geht) {
      const fertig = bereit ? 1 : 1 - Math.max(0, s.pause) / (s.w.pause * (m.istSpieler ? 1 : BOT_FEUER_LANGSAMER));
      ctx.strokeStyle = farbe.farbe; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 10, -Math.PI / 2, -Math.PI / 2 + fertig * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = bereit ? farbe.hell : farbe.farbe; ctx.globalAlpha = bereit ? 1 : 0.35;
      kreis(x, y, 6); ctx.fill(); ctx.globalAlpha = 1;
    } else text('✖', x, y, 12, '#ff6b6b', 'center', false);
  });

  // Rechts daneben: Tempo-Anzeige mit Zeiger
  const tx = W / 2 + 215, ty = H - 22, tr = 30;
  const tempo = Math.min(1, Math.hypot(m.vx || 0, m.vy || 0) / (typ.tempo || 1));
  ctx.fillStyle = '#0b0f17'; ctx.beginPath(); ctx.arc(tx, ty, tr, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#3d4558'; ctx.lineWidth = 2; ctx.stroke();
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + i / 6 * Math.PI;
    ctx.strokeStyle = i >= 5 ? '#ff6b6b' : '#8a8f9e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * (tr - 7), ty + Math.sin(a) * (tr - 7)); ctx.lineTo(tx + Math.cos(a) * (tr - 2), ty + Math.sin(a) * (tr - 2)); ctx.stroke();
  }
  const za = Math.PI + tempo * Math.PI * Math.min(1, strom * 1.5);
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + Math.cos(za) * (tr - 6), ty + Math.sin(za) * (tr - 6)); ctx.stroke();
  text('TEMPO', tx, ty + 10, 8, '#8a8f9e', 'center', false);
  // Links daneben: kleine Knöpfe, die blinken
  for (let i = 0; i < 6; i++) {
    const x = W / 2 - 200 + (i % 3) * 16, y = H - 36 + Math.floor(i / 3) * 16;
    const an = strom > 0.1 + i * 0.12 && Math.sin(zeit * (1.5 + i * 0.7) + i * 2) > 0.2;
    ctx.fillStyle = ['#4ade80', '#ffd166', '#38bdf8', '#f472b6', '#4ade80', '#fb923c'][i];
    ctx.globalAlpha = an ? 1 : 0.2; rr(x - 5, y - 5, 10, 10, 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Rote Ränder, wenn du wenig Leben hast
  if (gefahr) {
    const g2 = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g2.addColorStop(0, 'rgba(255,0,0,0)');
    g2.addColorStop(1, `rgba(255,0,0,${0.25 + Math.sin(zeit * 6) * 0.1})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
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
function funkspruch(wer, t, dauer = 4.5) { funk = { wer, text: t, t: dauer }; sound.piep(); }
function zeichneFunk() {   // 📻 Funkspruch oben links mit Bild vom Sprecher
  if (!funk) return;
  const wer = SPRECHER[funk.wer];
  ctx.globalAlpha = Math.min(1, funk.t * 2);
  ctx.fillStyle = 'rgba(10,14,28,0.9)'; rr(16, 84, 430, 86, 12); ctx.fill();
  ctx.strokeStyle = wer.farbe; ctx.lineWidth = 2; ctx.stroke();
  text(wer.emoji, 56, 127 + Math.sin(zeit * 25) * 2, 40, '#fff', 'center', false);
  text(`📻 ${wer.name}`, 98, 102, 13, wer.farbe, 'left', false);
  umbrechen(funk.text, 98, 126, 336, 19, 15, '#fff');
  ctx.globalAlpha = 1;
}
function zeichneHUD() {
  if (intro) { zeichneIntro(); return; }   // 🎬 Während des Intros nur das Cockpit
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
    text(`Zuerst ${abschussZiel} gewinnt · ${uhr(restZeit)}`, W / 2, 58, 13, '#c9c3ff', 'center', false);
  } else if (modus === 'flucht') {   // 🏃 Flucht
    const z = ziele[0];
    text(z.versteckt ? '⚔️ Bleib bei Papa!' : '🏃 LAUF ZUM LANDEPLATZ!', W / 2 - 40, 30, 18, z.versteckt ? '#93c5fd' : '#ff6b6b');
    text(uhr(restZeit), W / 2 + 150, 30, 18, '#fff');
    if (!z.versteckt) text(`noch ${Math.round(dist(spieler, z) / 10)} m`, W / 2, 56, 14, '#ffd166', 'center', false);
  } else if (modus === 'boss') {   // 👑 Großer Lebensbalken vom Boss
    const boss = mechs.find(o => o.boss);
    if (boss) {
      const anteil = boss.tot ? 0 : Math.min(...['mitte', 'visier'].map(t => teilAnteil(boss, t)));
      text(`👑 ${boss.name}`, W / 2 - 60, 26, 17, '#facc15');
      text(uhr(restZeit), W / 2 + 150, 26, 18, restZeit < 30 ? '#ff6b6b' : '#fff');
      balken(W / 2 - 180, 42, 360, 16, anteil, anteil < 0.3 ? '#ef4444' : '#facc15');
    }
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
  // Deine Waffen: Farbe = Slot-Art, der Balken zeigt das Nachladen
  const zeilenH = Math.min(20, 118 / m.waffen.length);
  m.waffen.forEach((s, i) => {
    const y = H - 136 + i * zeilenH + zeilenH / 2, farbe = SLOT_ARTEN[s.art], geht = slotGeht(m, s);
    ctx.fillStyle = geht ? farbe.farbe : '#3a3e4a'; rr(126, y - 6, 6, 12, 2); ctx.fill();
    text(s.w.name, 138, y, 11, geht ? '#fff' : '#6b7080', 'left', false);
    if (!geht) { text('Arm ab!', 290, y, 10, '#ff6b6b', 'right', false); return; }
    const bereit = s.pause <= 0;
    balken(222, y - 4, 68, 8, bereit ? 1 : 1 - s.pause / s.w.pause, bereit ? farbe.hell : '#5a6070');
  });
  text(touchModus ? '' : 'Linksklick: 🔵🟣  ·  Rechtsklick: 🟢', 157, H - 6, 10, '#8a8fb0', 'center', false);
  if (!hat(m, 'beinL') || !hat(m, 'beinR')) text('🦵 Bein ab – du humpelst!', 157, H - 192, 13, '#ff6b6b', 'center');

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
    ctx.fillStyle = [...DRAUFSTEHEN, 'steg'].includes(r.art) ? '#4b5a7a' : (r.rampe ? '#3d4863' : (r.art === 'gelaender' ? '#ffd166' : '#737d93'));
    ctx.fillRect(mx + r.x * mk, my + r.y * mk, Math.max(1, r.w * mk), Math.max(1, r.h * mk));
  }
  ziele.forEach((z, i) => {
    if ((modus !== 'punkt' && i !== aktivesZiel) || z.versteckt) return;
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

  zeichneFunk();
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
    const modusInfo = modusInfoVon(modus);
    text(`${modusInfo.emoji} ${modusInfo.name}${modus === 'knockout' ? ' · Runde ' + runde : ''}`, W / 2, H / 2 - 110, 34, '#ffd166');
    text(n > 0 ? String(n) : 'LOS!', W / 2, H / 2 - 20, 90 * pop, n > 0 ? '#fff' : '#4ade80');
    if (modus === 'angriff' || modus === 'verteidigung') {
      text(spieler.team === angreifer ? 'Dein Team greift an!' : 'Dein Team verteidigt!', W / 2, H / 2 + 60, 22, '#fff');
    }
  }

  // ----- Artillerie: Wie weit ist das Ziel, und ist der Raketenhagel bereit? -----
  const hagel = hagelVon(m);
  if (zustand === 'spiel' && !m.tot && hagel) {
    if (m.salve) text(m.salve.warten > 0 ? '🎯 Ziel erfasst ...' : `☄️ Raketenhagel! ${m.salve.rest}`, W / 2, H / 2 + 40, 16, m.typ.akzent);
    else {
      const weite = Math.round(dist(m, landePunkt(m)) / 10);
      text(`🎯 ${weite} m`, W / 2 + 30, H / 2 + 34, 15, m.typ.akzent, 'left');
      if (hagel.pause > 0) {
        balken(W / 2 - 25, H / 2 + 50, 50, 5, 1 - hagel.pause / hagel.w.pause, SLOT_ARTEN.rakete.hell);
        text(`Raketenhagel lädt ${Math.ceil(hagel.pause)} s`, W / 2, H / 2 + 64, 11, '#c9c3ff', 'center', false);
      } else text(touchModus ? '🚀-Knopf: Raketenhagel!' : 'Rechtsklick: Raketenhagel!', W / 2, H / 2 + 58, 12, '#fff', 'center', false);
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

  text(tonAn ? '🔊 M' : '🔇 M', W - 30, H - 14, 14, '#fff', 'center', false);

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
  // Die Waffen in den Slots (von oben gesehen), mit einem Streifen in der Slot-Farbe
  for (const slot of typ.slots) {
    const w = WAFFEN[slot.waffe], seite = ORTE[slot.ort].seite < 0 ? -1 : 1, farbe = SLOT_ARTEN[slot.art].farbe;
    if (!w) continue;   // Leerer Slot
    ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 2;
    if (slot.art === 'rakete') {   // Raketenwerfer
      const y = slot.ort.startsWith('schulter') ? seite * 22.5 : seite * 14;
      const b = w.salve || w.anzahl >= 4 ? 14 : 11;
      ctx.fillStyle = T.dunkel; rr(-16, y - b / 2, 24, b, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = farbe;
      const n = w.salve ? 3 : Math.min(w.anzahl, 2);
      for (let i = 0; i < n; i++) { kreis(-10 + i * 7, y, 2.5); ctx.fill(); }
      continue;
    }
    const torso = slot.ort.startsWith('torso');
    const y = torso ? seite * 7 : seite * 13;
    const lang = (w.id === 'railgun' ? 62 : w.gross ? 50 : w.explodiert ? 40 : w.schrot ? 24 : w.laser ? 30 : 34) * (torso ? 0.6 : 1);
    const dick = (w.explodiert ? 11 : w.schrot || w.id === 'minigun' ? 9 : 7) * (torso ? 0.7 : 1);
    ctx.fillStyle = '#4b5060'; rr(torso ? 14 : 8, y - dick / 2, lang, dick, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = farbe; ctx.fillRect((torso ? 14 : 8) + lang - 5, y - dick / 2 + 1, 4, dick - 2);
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
  return KARTEN.map((k, i) => ({ k, x: W / 2 - KARTEN.length * 92 + i * 184 + 4, y: 510, w: 176, h: 48 }));
}
const STORY_KNOPF = { x: 16, y: 16, w: 160, h: 44 };
const ONLINE_KNOPF = { x: W - 176, y: 16, w: 160, h: 44 };
function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 60) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 60) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();

  zeichneMech2D('blau', 70, 530, 1.6, 0, Math.atan2(maus.y - 530, maus.x - 70), zeit * 6, meinMech);
  zeichneMech2D('rot', W - 70, 530, 1.6, Math.PI, Math.PI + Math.sin(zeit) * 0.3, zeit * 6, MECH_TYPEN[2]);
  // Großer Knopf für den Storymodus (oben links)
  const sh = imRechteck(maus, STORY_KNOPF);
  ctx.fillStyle = sh ? '#ffd166' : 'rgba(30,34,46,0.9)'; rr(STORY_KNOPF.x, STORY_KNOPF.y, STORY_KNOPF.w, STORY_KNOPF.h, 12); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
  text('📖 Storymodus', STORY_KNOPF.x + STORY_KNOPF.w / 2, STORY_KNOPF.y + 23, 18, sh ? '#1b1f3a' : '#ffd166', 'center', false);
  const oh = imRechteck(maus, ONLINE_KNOPF);   // ... und für Online (oben rechts)
  ctx.fillStyle = oh ? '#93c5fd' : 'rgba(30,34,46,0.9)'; rr(ONLINE_KNOPF.x, ONLINE_KNOPF.y, ONLINE_KNOPF.w, ONLINE_KNOPF.h, 12); ctx.fill();
  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 2; ctx.stroke();
  text('🌐 Online', ONLINE_KNOPF.x + ONLINE_KNOPF.w / 2, ONLINE_KNOPF.y + 23, 18, oh ? '#1b1f3a' : '#93c5fd', 'center', false);

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
  text(`Du (blau) + 3 Computer-Mechs gegen ${TEAM_GROESSE} Gegner (rot)  ·  ${BOT_MECHS.length} verschiedene Mechs!`, W / 2, 478, 13, '#8a8fb0', 'center', false);
  text('Karte:', W / 2, 498, 13, '#8a8fb0', 'center', false);
  for (const b of kartenKnoepfe()) {
    const an = b.k === karte, hover = imRechteck(maus, b);
    ctx.fillStyle = an ? '#3a4256' : 'rgba(30,34,46,0.9)';
    rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = an ? '#ffd166' : (hover ? '#8a8fb0' : '#4a5266'); ctx.lineWidth = an ? 3 : 2; ctx.stroke();
    text(`${b.k.emoji} ${b.k.name}`, b.x + b.w / 2, b.y + b.h / 2, 14, an ? '#ffd166' : '#fff', 'center', false);
  }
  if (!renderer) text('⚠️ 3D geht auf diesem Computer leider nicht (kein WebGL).', W / 2, 580, 16, '#ff6b6b');
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, H - 14, 14, '#fff', 'center', false);
}

// =====================================================================
// ===== 📖 Storymodus: Die Sternenwacht =====
// =====================================================================
// Die Geschichte: Du bist ein neuer Pilot der Sternenwacht. Baron Eisenzahn und seine Rostbande
// klauen überall in der Galaxis Sternkristalle. 5 Missionen – und am Ende wartet der Baron in seinem Riesen-Mech!
const SPRECHER = {
  vega:  { name: 'Kommandantin Vega', emoji: '👩‍🚀', farbe: '#93c5fd' },
  bolle: { name: 'Funker Bolle',      emoji: '🧑‍🔧', farbe: '#fde68a' },
  baron: { name: 'Baron Eisenzahn',   emoji: '🦹',   farbe: '#fca5a5' },
};
// Der Boss: Baron Eisenzahns Riesen-Mech (kann man nicht selbst auswählen)
const BOSS_BARON = {
  id: 'baron', klasse: 'schwer', boss: true, krone: true, name: 'Eiserner Koloss', emoji: '👑', akzent: '#facc15', text: 'Der Riesen-Mech von Baron Eisenzahn.',
  dick: 1.8, schulter: 1.7, leben: 1300, tempo: 85, groesse: 1.75, boostPause: 9, keinBoost: true,
  slots: [['armL', 'kanone', 'kanone'], ['armR', 'kanone', 'kanone'], ['torsoL', 'laser', 'puls'], ['torsoR', 'laser', 'puls'], ['schulterL', 'rakete', 'hagel'], ['schulterR', 'rakete', 'rak4']]
    .map(([ort, art, waffe]) => ({ ort, art, waffe })),
  sterne: { leben: 5, tempo: 1 },
};
const typVon = id => MECH_TYPEN.find(t => t.id === id);
// Die Missionen. gegner / freunde: Welche Mechs mitspielen. ungenau: Wie schlecht die Gegner zielen.
const MISSIONEN = [
  { id: 'pruefung', name: 'Die Prüfung', karte: 'fabrik', modus: 'team', abschussZiel: 8, ungenau: 0.26, pos: [140, 380],
    ziel: 'Zerstöre 8 Übungs-Mechs!',
    freunde: ['waechter', 'blitz', 'rubin'], gegner: ['blitz', 'hornisse', 'adler', 'blitz'],
    vorher: [
      ['vega', 'Willkommen bei der Sternenwacht, Rekrut! Ich bin Kommandantin Vega.'],
      ['vega', 'Die Rostbande klaut überall in der Galaxis Sternkristalle. Ohne die Kristalle gehen auf vielen Planeten die Lichter aus!'],
      ['vega', 'Bevor du in den Einsatz darfst, musst du die Prüfung bestehen: Zerstöre 8 Übungs-Mechs in der alten Stahlfabrik.'],
      ['bolle', 'Keine Sorge, die Übungs-Mechs zielen ziemlich schlecht. Hehe.'],
    ],
    nachher: [
      ['vega', 'Stark! Du hast bestanden. Ab heute bist du Pilot der Sternenwacht!'],
      ['bolle', 'Kommandantin! Ein Notruf von Planet Xyloria!'],
    ] },
  { id: 'signal', name: 'Das Kristall-Signal', karte: 'planet', modus: 'punkt', ungenau: 0.19, pos: [320, 230],
    ziel: 'Halte den Punkt, bis ihr 100 Punkte habt!',
    freunde: ['waechter', 'feuer', 'rubin'], gegner: ['waechter', 'feuer', 'rubin', 'hornisse'],
    vorher: [
      ['vega', 'Auf Xyloria sendet ein Kristallfeld ein seltsames Signal. Die Rostbande will es sich schnappen.'],
      ['baron', '*knister* Hahaha! Die Kristalle gehören bald mir, Baron Eisenzahn! Schnappt sie euch, Jungs!'],
      ['bolle', 'Uff, wir haben gerade den Funk vom Baron abgehört. Der klingt ja fies.'],
      ['vega', 'Halte den Punkt in der Mitte, bis wir 100 Punkte haben. Los geht\'s!'],
    ],
    nachher: [
      ['vega', 'Das Kristallfeld ist sicher. Gute Arbeit, Pilot!'],
      ['bolle', 'Ich hab ihre Spur! Die Rostbande versteckt geklaute Kristalle auf dem Eisplaneten Frostheim.'],
    ] },
  { id: 'eiskalt', name: 'Eiskalter Angriff', karte: 'eis', modus: 'angriff', ungenau: 0.16, pos: [490, 390],
    ziel: 'Erobere Punkt A und dann Punkt B!',
    freunde: ['koloss', 'feuer', 'waechter'], gegner: ['koloss', 'nashorn', 'artillerie', 'adler'],
    vorher: [
      ['vega', 'Die Rostbande hat auf Frostheim zwei Lager: A und B. Dort liegen die geklauten Kristalle.'],
      ['vega', 'Wir greifen an! Erobere erst Punkt A, dann Punkt B, bevor die Zeit abläuft.'],
      ['bolle', 'Achtung, da unten schneit es. Die Mechs haben aber eine Heizung. Glaube ich.'],
    ],
    nachher: [
      ['vega', 'Beide Lager erobert! Wir haben ganz viele Kristalle zurück.'],
      ['baron', '*knister* WAS?! Das werdet ihr bereuen! Ich komme euch holen!'],
    ] },
  { id: 'hinterhalt', name: 'Hinterhalt am Strand', karte: 'dschungel', modus: 'verteidigung', ungenau: 0.14, pos: [670, 240],
    ziel: 'Verteidige A und B, bis die Zeit um ist!',
    freunde: ['nashorn', 'rubin', 'koloss'], gegner: ['nashorn', 'titan', 'hornisse', 'feuer', 'adler'],
    vorher: [
      ['bolle', 'Alarm! Die Rostbande hat uns im Dschungel eingekreist!'],
      ['vega', 'Sie wollen den alten Tempel, in dem wir die Kristalle versteckt haben. Wir verteidigen!'],
      ['vega', 'Halte sie von Punkt A und B fern, bis die Zeit um ist. Vorsicht: Diesmal sind sie zu fünft!'],
    ],
    nachher: [
      ['vega', 'Sie hauen ab! Und jetzt weiß ich, wo der Baron sich versteckt: in der Stahlfabrik!'],
      ['baron', '*knister* Kommt nur her ... mein Riesen-Mech wartet schon auf euch!'],
    ] },
  { id: 'baron', name: 'Baron Eisenzahn', karte: 'fabrik', modus: 'boss', ungenau: 0.12, pos: [840, 370],
    ziel: 'Besiege den Eisernen Koloss!',
    freunde: ['titan', 'rubin', 'nashorn'], gegner: ['baron', 'koloss', 'feuer', 'adler'],
    vorher: [
      ['vega', 'Das ist der letzte Einsatz, Pilot. Baron Eisenzahn sitzt in seinem Riesen-Mech: dem Eisernen Koloss.'],
      ['vega', `Er hat ${BOSS_BARON.leben} Leben, einen Raketenhagel und zwei Kanonen. Aber wenn er einmal kaputt ist, kommt er nicht wieder!`],
      ['baron', 'Ihr kleinen Blechdosen! Ich mache Schrott aus euch!'],
      ['bolle', 'Tipp: Schieß auf sein Visier oder auf seine Beine! Dann geht er schneller K.o.'],
      ['vega', 'Besiege den Baron, bevor die Zeit abläuft. Viel Glück!'],
    ],
    nachher: [
      ['baron', 'Neeeein! Mein schöner Koloss! ... Na gut, ihr habt gewonnen. Ihr kriegt die Kristalle zurück.'],
      ['vega', 'Geschafft! Die Galaxis ist gerettet – dank dir!'],
      ['bolle', 'Überall gehen die Lichter wieder an! PARTY! 🎉'],
      ['vega', 'Ab heute bist du kein Rekrut mehr. Du bist ein Held der Sternenwacht! 🏅'],
    ] },
];
const BOSS_ZEIT = 300;   // So lange hat man Zeit, den Baron zu besiegen
let storyFortschritt = 0;   // So viele Missionen sind geschafft
try { storyFortschritt = Math.min(MISSIONEN.length, parseInt(localStorage.getItem('kaempfer-story')) || 0); } catch (e) { /* egal */ }
let storyMission = null;    // Welche Mission läuft gerade? (null = kein Storymodus)
let abschussZiel = ABSCHUSS_ZIEL;
const MODUS_EXTRA = { boss: { id: 'boss', emoji: '👑', name: 'Bosskampf' }, flucht: { id: 'flucht', emoji: '🏃', name: 'Flucht' } };
const modusInfoVon = id => MODI.find(x => x.id === id) || MODUS_EXTRA[id];

function teamNamen(story) {
  TEAMS.blau.name = story ? 'Sternenwacht' : 'Team Blau';
  TEAMS.rot.name = story ? 'Rostbande' : 'Team Rot';
}
function starteMission(mission) {
  storyMission = mission;
  karte = KARTEN.find(k => k.id === mission.karte);
  botUngenau = mission.ungenau;
  abschussZiel = mission.abschussZiel || ABSCHUSS_ZIEL;
  teamNamen(true);
  const aufstellung = [{ team: 'blau', typ: meinMech, ich: true }];
  mission.freunde.forEach(id => aufstellung.push({ team: 'blau', typ: typVon(id) }));
  mission.gegner.forEach(id => aufstellung.push(id === 'baron' ? { team: 'rot', typ: BOSS_BARON, name: 'Baron Eisenzahn' } : { team: 'rot', typ: typVon(id) }));
  neuesSpiel(mission.modus, aufstellung);
}
function normalesSpiel() {   // Zurück zu den normalen Einstellungen (ohne Story)
  storyMission = null;
  botUngenau = BOT_UNGENAU;
  abschussZiel = ABSCHUSS_ZIEL;
  teamNamen(false);
}
function storyNachMission() {   // Wird aufgerufen, wenn man nach einer Mission klickt
  if (storyMission && storyMission.kampagne === 'rache') { racheNachMission(); return; }
  const m = storyMission, gewonnen = ende && ende.sieger === spieler.team;
  normalesSpiel();
  try { karte = KARTEN.find(k => k.id === localStorage.getItem('kaempfer-karte')) || KARTEN[0]; } catch (e) { karte = KARTEN[0]; }
  if (!gewonnen) { zustand = 'story'; return; }
  const nr = MISSIONEN.indexOf(m);
  if (nr + 1 > storyFortschritt) {
    storyFortschritt = nr + 1;
    try { localStorage.setItem('kaempfer-story', String(storyFortschritt)); } catch (e) { /* egal */ }
  }
  dialogStarten(m.nachher, () => { zustand = 'story'; });
}

// ----- Gespräche (Dialoge) mit Schreibmaschinen-Text -----
let dialog = null;
function dialogStarten(zeilen, danach) {
  dialog = { zeilen, i: 0, start: zeit, danach };
  zustand = 'dialog';
}
function dialogWeiter() {
  const z = dialog.zeilen[dialog.i];
  const fertig = (zeit - dialog.start) * 45 >= z[1].length;
  if (!fertig) { dialog.start = -1e9; return; }   // Erst mal den ganzen Text zeigen
  dialog.i++;
  dialog.start = zeit;
  sound.piep();
  if (dialog.i >= dialog.zeilen.length) { const d = dialog.danach; dialog = null; d(); }
}
function sterneMalenHimmel() {   // Hintergrund: Weltraum mit Sternen
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#05070f'); g.addColorStop(1, '#141a33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    const x = (i * 197) % W, y = (i * 113) % H, f = 0.4 + 0.6 * Math.abs(Math.sin(zeit * 0.8 + i));
    ctx.fillStyle = `rgba(255,255,255,${f * 0.8})`;
    ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
}
function zeichneDialog() {
  sterneMalenHimmel();
  const z = dialog.zeilen[dialog.i], wer = SPRECHER[z[0]];
  const mission = MISSIONEN.find(m => m.vorher === dialog.zeilen || m.nachher === dialog.zeilen);
  if (mission) {
    text(`📖 Mission ${MISSIONEN.indexOf(mission) + 1}: ${mission.name}`, W / 2, 50, 30, '#ffd166');
    if (mission.vorher === dialog.zeilen) text(`🎯 ${mission.ziel}`, W / 2, 88, 17, '#c9c3ff', 'center', false);
  }
  // Das Bild vom Sprecher (wie auf einem Funk-Bildschirm)
  const px = 70, py = 170, ps = 200;
  ctx.fillStyle = '#0b1020'; rr(px, py, ps, ps, 16); ctx.fill();
  ctx.strokeStyle = wer.farbe; ctx.lineWidth = 4; ctx.stroke();
  ctx.save(); ctx.beginPath(); rr(px, py, ps, ps, 16); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let y = py; y < py + ps; y += 4) ctx.fillRect(px, y + (zeit * 30) % 4, ps, 1);   // Bildschirm-Streifen
  const reden = (zeit - dialog.start) * 45 < z[1].length;
  text(wer.emoji, px + ps / 2, py + ps / 2 + (reden ? Math.sin(zeit * 25) * 3 : 0), 110, '#fff', 'center', false);
  ctx.restore();
  text(wer.name, px + ps / 2, py + ps + 26, 18, wer.farbe);
  // Die Sprechblase mit Schreibmaschinen-Text
  const bx = 300, by = 170, bw = 600, bh = 200;
  ctx.fillStyle = 'rgba(20,26,46,0.95)'; rr(bx, by, bw, bh, 16); ctx.fill();
  ctx.strokeStyle = wer.farbe; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(20,26,46,0.95)';
  ctx.beginPath(); ctx.moveTo(bx, by + 60); ctx.lineTo(bx - 24, by + 80); ctx.lineTo(bx, by + 100); ctx.fill();
  const zeichen = Math.floor((zeit - dialog.start) * 45);
  umbrechen(z[1].slice(0, Math.max(0, zeichen)), bx + 26, by + 36, bw - 52, 30, 21, '#ffffff');
  if (!reden && Math.sin(zeit * 6) > 0) text('▼', bx + bw - 30, by + bh - 24, 18, wer.farbe, 'center', false);
  text(`${dialog.i + 1} / ${dialog.zeilen.length}  ·  Klick oder Leertaste: weiter`, W / 2, 470, 15, '#8a8fb0', 'center', false);
}

// ----- Die Sternenkarte mit allen Missionen -----
const STORY_ZURUECK = { x: 30, y: 540, w: 150, h: 40 };
const missionKnopf = m => ({ x: m.pos[0] - 60, y: m.pos[1] - 60, w: 120, h: 120 });
function zeichneStory() {
  sterneMalenHimmel();
  text('📖 Die Sternenwacht', W / 2, 50, 38, '#ffd166');
  text(storyFortschritt >= MISSIONEN.length ? '🏅 Du hast alle Missionen geschafft! Du bist ein Held der Sternenwacht!' : 'Rette die Galaxis vor Baron Eisenzahn und seiner Rostbande!', W / 2, 92, 16, '#c9c3ff', 'center', false);
  // Weg zwischen den Missionen
  ctx.setLineDash([8, 8]); ctx.lineWidth = 3;
  for (let i = 0; i < MISSIONEN.length - 1; i++) {
    const a = MISSIONEN[i].pos, b = MISSIONEN[i + 1].pos;
    ctx.strokeStyle = i < storyFortschritt ? '#ffd166' : '#3a4256';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  ctx.setLineDash([]);
  MISSIONEN.forEach((m, i) => {
    const offen = i <= storyFortschritt, geschafft = i < storyFortschritt, naechste = i === storyFortschritt;
    const k = missionKnopf(m), hover = offen && imRechteck(maus, k);
    const r = 46 + (naechste ? Math.sin(zeit * 3) * 4 : 0) + (hover ? 6 : 0);
    const kk = KARTEN.find(x => x.id === m.karte);
    ctx.fillStyle = offen ? (m.modus === 'boss' ? '#7f1d1d' : '#1e3a5f') : '#1a1d24';
    kreis(m.pos[0], m.pos[1], r); ctx.fill();
    ctx.strokeStyle = geschafft ? '#ffd166' : naechste ? '#4ade80' : '#3a4256'; ctx.lineWidth = hover ? 5 : 3; ctx.stroke();
    text(offen ? (m.modus === 'boss' ? '👑' : kk.emoji) : '🔒', m.pos[0], m.pos[1] - 4, 36, '#fff', 'center', false);
    if (geschafft) text('⭐', m.pos[0] + 36, m.pos[1] - 36, 22, '#fff', 'center', false);
    text(`${i + 1}. ${m.name}`, m.pos[0], m.pos[1] + r + 18, 15, offen ? '#fff' : '#5a6070', 'center', false);
    if (offen) text(modusInfoVon(m.modus).emoji + ' ' + modusInfoVon(m.modus).name, m.pos[0], m.pos[1] + r + 36, 12, '#8a8fb0', 'center', false);
  });
  knopfMalen(STORY_ZURUECK, '← Zurück');
  text('Klick auf eine Mission!', W / 2 + 60, 560, 16, '#8a8fb0', 'center', false);
}
function storyKlick() {
  if (imRechteck(maus, STORY_ZURUECK)) { zustand = 'kampagnen'; return; }
  MISSIONEN.forEach((m, i) => {
    if (i > storyFortschritt || !imRechteck(maus, missionKnopf(m))) return;
    dialogStarten(m.vorher, () => {   // Nach dem Gespräch: Mech aussuchen, dann geht's los
      storyMission = m;
      gewaehlterModus = m.modus;
      karte = KARTEN.find(k => k.id === m.karte);
      zustand = 'auswahl';
    });
  });
}

// =====================================================================
// ===== ⚔️ Karriere: Rache für Papa =====
// =====================================================================
// Die Geschichte: General Kragan und seine Schwarze Legion greifen an. Dein Papa beschützt dich – und wird dabei zerstört.
// Du flüchtest zu Mila, einer alten Freundin deines Vaters. In ihrem Hangar verdienst du mit Aufträgen Geld,
// kaufst neue Mechs (die kommen OHNE Waffen!) und Waffen, baust sie ein – und holst dir am Ende Kragan.
Object.assign(SPRECHER, {
  vater:  { name: 'Papa (Kommandant Falk)', emoji: '👨‍✈️', farbe: '#93c5fd' },
  kragan: { name: 'General Kragan',         emoji: '😈',   farbe: '#f87171' },
  mila:   { name: 'Mechanikerin Mila',      emoji: '👩‍🔧', farbe: '#fde68a' },
  du:     { name: 'Du',                     emoji: '🧑‍🚀', farbe: '#4ade80' },
});
// Kragans Riesen-Mech: der Schwarze Koloss
const BOSS_KRAGAN = {
  id: 'kragan', klasse: 'schwer', boss: true, hoerner: true, name: 'Schwarzer Koloss', emoji: '😈', akzent: '#111827', text: 'Der Riesen-Mech von General Kragan.',
  dick: 1.8, schulter: 1.7, leben: 1500, tempo: 85, groesse: 1.8, boostPause: 9, keinBoost: true,
  slots: [['armL', 'kanone', 'railgun'], ['armR', 'kanone', 'kanone'], ['torsoL', 'laser', 'puls'], ['torsoR', 'laser', 'puls'], ['schulterL', 'rakete', 'hagel'], ['schulterR', 'rakete', 'rak4']]
    .map(([ort, art, waffe]) => ({ ort, art, waffe })),
  sterne: { leben: 5, tempo: 1 },
};
// ----- Preise (in Credits) -----
const MECH_PREISE = { blitz: 1500, hornisse: 1800, adler: 2200, waechter: 4000, rubin: 4500, feuer: 4800, nashorn: 8000, koloss: 8500, artillerie: 9000, titan: 15000, bollwerk: 16000, vulkan: 16500 };
const WAFFEN_PREISE = { laserK: 400, puls: 900, laserG: 1800, mg: 300, minigun: 800, schrot: 700, kanone: 1500, railgun: 2200, rak1: 500, rak2: 1000, rak4: 2000, hagel: 3000 };
const VERKAUF_ANTEIL = 0.5;    // Beim Verkaufen bekommt man die Hälfte zurück
const ABSCHUSS_BONUS = 150;    // So viele Credits gibt es extra für jeden Abschuss
const geldText = n => `${Math.round(n).toLocaleString('de-DE')} 💰`;

// ----- Dein Spielstand (wird im Browser gespeichert) -----
function neueKarriere() {
  return {
    geld: 0, fortschritt: 0, prolog: false, naechsteNr: 2, aktiv: 1, auftraege: [],
    mechs: [{ nr: 1, typ: 'blitz', slots: [null, 'mg', 'rak1'] }],   // Papas alter Blitzschlag: nur MG und eine Rakete
    lager: {},                                                        // Waffen, die du gekauft (oder ausgebaut) hast
  };
}
let karriere = neueKarriere();
try { const k = JSON.parse(localStorage.getItem('kaempfer-karriere')); if (k && Array.isArray(k.mechs) && k.mechs.length) karriere = { ...neueKarriere(), ...k }; } catch (e) { /* egal */ }
function karriereSpeichern() { try { localStorage.setItem('kaempfer-karriere', JSON.stringify(karriere)); } catch (e) { /* egal */ } }
const aktiverMech = () => karriere.mechs.find(m => m.nr === karriere.aktiv) || karriere.mechs[0];
function karriereTyp(km) {   // Aus deinem Mech im Hangar wird ein richtiger Mech-Typ (leere Slots bleiben leer)
  const basis = typVon(km.typ);
  return { ...basis, slots: basis.slots.map((s, i) => ({ ...s, waffe: WAFFEN[km.slots[i]] && WAFFEN[km.slots[i]].art === s.art ? km.slots[i] : null })) };
}

// ----- Die Story-Missionen -----
const PAPA_NAME = 'Papa';
const RACHE = [
  { id: 'schwarzerTag', name: 'Der schwarze Tag', karte: 'fabrik', modus: 'flucht', ungenau: 0.22, prolog: true, startX: 0.42, belohnung: 0,
    ziel: 'Bleib bei Papa ... und wenn er „Lauf!“ sagt: Lauf zum Landeplatz!',
    spielerTyp: 'blitz', spielerSlots: [null, 'mg', 'rak1'],
    freunde: [{ typ: 'koloss', name: PAPA_NAME, unverwundbar: true }],
    gegner: [{ typ: 'kragan', name: 'General Kragan', unverwundbar: true }, { typ: 'waechter' }, { typ: 'feuer' }, { typ: 'blitz' }],
    vorher: [
      ['vater', 'Na, bereit für deine erste Übungsrunde im Mech? Bleib einfach dicht bei mir.'],
      ['du', 'Klar, Papa! Ich bin bereit!'],
      ['vater', 'Moment ... da ist was auf dem Radar. Das sind Mechs der Schwarzen Legion!'],
      ['kragan', '*knister* Falk! Endlich habe ich dich gefunden. Heute rechnen wir ab!'],
      ['vater', 'Das ist General Kragan. Hör gut zu: Wenn ich „Lauf!“ sage, dann rennst du zum Landeplatz. Versprochen?'],
      ['du', 'Versprochen ...'],
    ],
    skript(t) {   // Was im Kampf passiert
      const papa = mechs.find(m => m.name === PAPA_NAME), kragan = mechs.find(m => m.boss);
      const einmal = (n, f) => { this.schritte = this.schritte || {}; if (t >= n && !this.schritte[n]) { this.schritte[n] = true; f(); } };
      einmal(1, () => funkspruch('vater', 'Feuer frei! Bleib hinter mir!'));
      einmal(9, () => funkspruch('kragan', 'Gib auf, Falk! Gegen meinen Schwarzen Koloss hast du keine Chance!'));
      einmal(13, () => { if (papa && kragan && !papa.tot && dist(papa, kragan) > 450) { kragan.x = papa.x + 330; kragan.y = papa.y; kragan.z = standHoehe(kragan.x, kragan.y, 0); kragan.gegner = papa; } });   // Kragan stürmt heran
      einmal(16, () => {
        if (papa && !papa.tot) { papa.unverwundbar = false; explosionEffekt(papa.x, papa.y, papa.z + 60, 140); zerstoert(papa, kragan); }
        funkspruch('vater', 'LAUF! Lauf zum Landeplatz! Bring dich in Sicherheit!', 5);
        ziele[0].versteckt = false;
      });
      einmal(21.5, () => { funkspruch('du', 'PAPA!!! ... Ich komme wieder, Kragan. Das verspreche ich dir!', 5); zeigeNachricht('📍 Lauf zum Landeplatz – folge dem Pfeil!', 4, '#ffd166'); });
      if (papa && papa.tot) papa.neustart = Infinity;   // Papa kommt nicht wieder ...
    },
    nachher: [
      ['mila', 'Du hast es bis zu meinem Hangar geschafft! Ich bin Mila – eine alte Freundin von deinem Papa.'],
      ['mila', 'Es tut mir so leid. Dein Papa war der beste Pilot, den ich kannte.'],
      ['du', 'Kragan wird dafür bezahlen. Ich will mich rächen!'],
      ['mila', 'Dann brauchst du bessere Mechs. Und die kosten Geld. Viel Geld.'],
      ['mila', 'Nimm Söldner-Aufträge an und verdiene Credits. Neue Mechs bekommst du OHNE Waffen – die musst du extra kaufen und im Hangar einbauen.'],
      ['mila', 'Behalte den alten Blitzschlag von deinem Papa. Hier sind 1.000 Credits für den Anfang. Viel Glück!'],
    ],
    startGeld: 1000 },
  { id: 'spur', name: 'Die Spur der Legion', karte: 'planet', modus: 'team', abschussZiel: 8, ungenau: 0.2, belohnung: 2500, empfohlen: 'Medium',
    ziel: 'Zerstöre 8 Legion-Mechs! Zwei Söldner helfen dir.',
    freunde: [{ typ: 'waechter', name: 'Söldner Ole' }, { typ: 'blitz', name: 'Söldnerin Ida' }], gegner: ['waechter', 'feuer', 'hornisse', 'adler'],
    vorher: [
      ['mila', 'Ich habe etwas gehört: Ein Trupp der Schwarzen Legion sucht auf Xyloria nach Kristallen.'],
      ['du', 'Dann fange ich da an. Vielleicht wissen die, wo Kragan ist.'],
      ['mila', 'Zerstöre 8 Legion-Mechs. Ich schicke dir zwei Söldner mit.'],
    ],
    nachher: [
      ['du', 'Einer von ihnen hat geredet: Kragan bekommt seinen Nachschub vom Eisplaneten Frostheim.'],
      ['mila', 'Gut gemacht! Hier ist deine Belohnung. Kauf dir was Ordentliches davon!'],
    ] },
  { id: 'nachschub', name: 'Kragans Nachschub', karte: 'eis', modus: 'angriff', ungenau: 0.17, belohnung: 3500, empfohlen: 'Medium oder Heavy',
    ziel: 'Erobere die Nachschub-Lager A und B!',
    freunde: [{ typ: 'waechter', name: 'Söldner Ole' }, { typ: 'feuer', name: 'Söldnerin Ida' }, { typ: 'hornisse', name: 'Söldner Pit' }], gegner: ['koloss', 'nashorn', 'feuer', 'adler'],
    vorher: [
      ['mila', 'Auf Frostheim hat die Legion zwei Nachschub-Lager. Ohne Nachschub wird Kragan schwach!'],
      ['du', 'Dann nehme ich ihm beide Lager weg.'],
      ['mila', 'Erobere erst Punkt A und dann B. Pass auf – die haben schwere Mechs!'],
    ],
    nachher: [
      ['kragan', '*knister* Du bist also das Kind von Falk. Du bist genauso lästig wie er!'],
      ['du', 'Ich komme dich holen, Kragan.'],
    ] },
  { id: 'falle', name: 'Die Falle im Dschungel', karte: 'dschungel', modus: 'verteidigung', ungenau: 0.14, belohnung: 4500, empfohlen: 'Heavy',
    ziel: 'Verteidige A und B, bis die Zeit um ist!',
    freunde: [{ typ: 'nashorn', name: 'Söldner Ole' }, { typ: 'rubin', name: 'Söldnerin Ida' }, { typ: 'koloss', name: 'Söldner Pit' }], gegner: ['nashorn', 'titan', 'hornisse', 'feuer', 'adler'],
    vorher: [
      ['mila', 'Achtung! Kragan hat uns eine Falle gestellt. Die Legion greift unser Versteck im Dschungel an!'],
      ['mila', 'Halte sie von Punkt A und B fern, bis die Zeit um ist. Sie sind zu fünft!'],
      ['du', 'Diesmal laufe ich nicht weg.'],
    ],
    nachher: [
      ['mila', 'Sie hauen ab! Und ich habe Kragans Versteck gefunden: die alte Stahlfabrik – da, wo alles angefangen hat.'],
      ['du', 'Dann beenden wir es dort.'],
    ] },
  { id: 'rache', name: 'Die Rache', karte: 'fabrik', modus: 'boss', ungenau: 0.12, belohnung: 10000, empfohlen: 'Schwer',
    ziel: 'Besiege General Kragan in seinem Schwarzen Koloss!',
    freunde: [{ typ: 'titan', name: 'Söldner Ole' }, { typ: 'rubin', name: 'Söldnerin Ida' }, { typ: 'nashorn', name: 'Söldner Pit' }],
    gegner: [{ typ: 'kragan', name: 'General Kragan' }, { typ: 'koloss' }, { typ: 'feuer' }, { typ: 'adler' }],
    vorher: [
      ['mila', `Das ist der letzte Kampf. Kragan sitzt in seinem Schwarzen Koloss. Der hat ${BOSS_KRAGAN.leben} Leben!`],
      ['mila', 'Tipp: Schieß auf sein Visier oder auf seine Beine!'],
      ['kragan', 'Kleines Falk-Kind! Ich mache aus dir Schrott – genau wie aus deinem Vater!'],
      ['du', 'Das ist für Papa.'],
    ],
    nachher: [
      ['kragan', 'Nein ... NEIN! Mein Koloss! ... Du ... du bist ein besserer Pilot als dein Vater ...'],
      ['du', 'Das war für dich, Papa.'],
      ['mila', 'Die Sternenpolizei hat Kragan festgenommen. Die Schwarze Legion gibt es nicht mehr!'],
      ['mila', 'Dein Papa wäre so stolz auf dich. Mein Hangar steht dir immer offen – es gibt noch viele Aufträge!'],
    ] },
];
RACHE.forEach(m => { m.kampagne = 'rache'; });
MISSIONEN.forEach(m => { m.kampagne = 'sternenwacht'; });

// ----- Nebenaufträge (zum Geld verdienen, immer wieder neu) -----
const AUFTRAG_NAMEN = ['Konvoi-Schutz', 'Piraten verjagen', 'Kristallmine sichern', 'Schrottplatz-Streit', 'Grenzpatrouille', 'Wettkampf der Söldner', 'Banditen am Strand', 'Funkturm retten'];
const AUFTRAG_GEGNER = [   // Je weiter du in der Story bist, desto stärker die Gegner
  ['blitz', 'hornisse', 'adler'], ['blitz', 'hornisse', 'waechter', 'rubin'], ['waechter', 'feuer', 'rubin', 'nashorn'],
  ['feuer', 'nashorn', 'koloss', 'artillerie'], ['koloss', 'artillerie', 'titan', 'bollwerk', 'vulkan'],
];
function neuerAuftrag() {
  const stufe = Math.min(AUFTRAG_GEGNER.length - 1, Math.max(0, karriere.fortschritt - 1));
  const anzahl = 3 + Math.floor(Math.random() * 2) + (stufe >= 3 ? 1 : 0);
  const modus = zufall(['team', 'team', 'punkt', 'knockout']);
  const k = zufall(KARTEN);
  return {
    nr: Math.floor(Math.random() * 1e9), name: zufall(AUFTRAG_NAMEN), karte: k.id, modus, nebenjob: true, kampagne: 'rache',
    abschussZiel: 6 + anzahl, ungenau: 0.24 - stufe * 0.025,
    gegner: Array.from({ length: anzahl }, () => zufall(AUFTRAG_GEGNER[stufe])),
    freunde: Array.from({ length: anzahl - 1 }, (_, i) => ({ typ: zufall(AUFTRAG_GEGNER[Math.max(0, stufe - 1)]), name: ['Söldner Ole', 'Söldnerin Ida', 'Söldner Pit', 'Söldnerin Bea'][i] })),
    belohnung: 700 + stufe * 450 + anzahl * 120,
    ziel: modus === 'team' ? `Zerstöre ${6 + anzahl} Gegner!` : modus === 'punkt' ? 'Halte den Punkt!' : 'Gewinne 2 Knockout-Runden!',
  };
}
function auftraegeAuffuellen() {
  while (karriere.auftraege.length < 3) karriere.auftraege.push(neuerAuftrag());
  karriereSpeichern();
}
const naechsteStory = () => RACHE[karriere.fortschritt] || null;   // fortschritt 0 = Prolog

// ----- Mission starten (für beide Kampagnen) -----
function aufstellungEintrag(team, e) {   // e ist eine Mech-ID oder { typ, name, unverwundbar }
  const o = typeof e === 'string' ? { typ: e } : e;
  const typ = o.typ === 'baron' ? BOSS_BARON : o.typ === 'kragan' ? BOSS_KRAGAN : typVon(o.typ);
  return { team, typ, name: o.name || (o.typ === 'baron' ? 'Baron Eisenzahn' : undefined), unverwundbar: o.unverwundbar };
}
function racheStarten(mission) {
  if (!mission.prolog && !aktiverMech().slots.some(Boolean)) { karriereMeldung = '⚠️ Dein Mech hat keine Waffen! Kauf welche im Waffen-Laden und bau sie im Hangar ein.'; return; }
  const ablauf = () => {
    mission.skriptZeit = 0; mission.schritte = null;
    storyMission = mission;
    karte = KARTEN.find(k => k.id === mission.karte);
    botUngenau = mission.ungenau;
    abschussZiel = mission.abschussZiel || ABSCHUSS_ZIEL;
    teamNamen(false);
    TEAMS.blau.name = 'Deine Truppe'; TEAMS.rot.name = 'Schwarze Legion';
    const ichTyp = mission.prolog ? karriereTyp({ typ: mission.spielerTyp, slots: mission.spielerSlots }) : karriereTyp(aktiverMech());
    const aufstellung = [{ team: 'blau', typ: ichTyp, ich: true, keinNeustart: mission.modus === 'flucht' }];
    for (const f of mission.freunde) aufstellung.push(aufstellungEintrag('blau', f));
    for (const g of mission.gegner) aufstellung.push(aufstellungEintrag('rot', g));
    neuesSpiel(mission.modus, aufstellung);
  };
  if (mission.vorher && !mission.nebenjob) dialogStarten(mission.vorher, ablauf); else ablauf();
}
function racheBelohnung(gewonnen) {   // Wie viele Credits gibt es?
  const m = storyMission, kills = spieler ? spieler.abschuesse : 0;
  const basis = gewonnen ? m.belohnung : Math.round(m.belohnung * 0.1);   // Verloren: nur ein kleines Trostgeld
  return { basis, kills, summe: basis + kills * ABSCHUSS_BONUS };
}
function racheNachMission() {
  const m = storyMission, gewonnen = ende && ende.sieger === spieler.team;
  const b = racheBelohnung(gewonnen);
  normalesSpiel();
  try { karte = KARTEN.find(k => k.id === localStorage.getItem('kaempfer-karte')) || KARTEN[0]; } catch (e) { karte = KARTEN[0]; }
  if (m.prolog) {
    if (!gewonnen) { zustand = 'kampagnen'; return; }
    karriere.prolog = true; karriere.fortschritt = Math.max(karriere.fortschritt, 1); karriere.geld += m.startGeld;
    auftraegeAuffuellen();
    dialogStarten(m.nachher, () => { zustand = 'karriere'; karriereTab = 'auftraege'; });
    return;
  }
  karriere.geld += b.summe;
  let danach = null;
  if (gewonnen && m.nebenjob) karriere.auftraege = karriere.auftraege.filter(a => a.nr !== m.nr);
  if (gewonnen && !m.nebenjob && RACHE.indexOf(m) === karriere.fortschritt) { karriere.fortschritt++; danach = m.nachher; }
  auftraegeAuffuellen();
  karriereMeldung = `${gewonnen ? '✅ Auftrag erledigt' : '❌ Verloren'}: +${geldText(b.summe)}`;
  if (danach) dialogStarten(danach, () => { zustand = 'karriere'; }); else zustand = 'karriere';
}

// ===== Kampagne auswählen =====
const KAMPAGNE_KARTEN = [
  { id: 'rache', x: 90, y: 150, w: 370, h: 300 },
  { id: 'sternenwacht', x: 500, y: 150, w: 370, h: 300 },
];
function zeichneKampagnen() {
  sterneMalenHimmel();
  text('📖 Storymodus', W / 2, 60, 40, '#ffd166');
  text('Welche Geschichte willst du spielen?', W / 2, 105, 17, '#c9c3ff', 'center', false);
  for (const k of KAMPAGNE_KARTEN) {
    const hover = imRechteck(maus, k), rache = k.id === 'rache';
    ctx.fillStyle = hover ? '#2a3350' : 'rgba(20,26,46,0.92)'; rr(k.x, k.y, k.w, k.h, 16); ctx.fill();
    ctx.strokeStyle = hover ? '#ffd166' : rache ? '#f87171' : '#93c5fd'; ctx.lineWidth = hover ? 4 : 2; ctx.stroke();
    text(rache ? '⚔️' : '🌟', k.x + k.w / 2, k.y + 56, 54, '#fff', 'center', false);
    text(rache ? 'Rache für Papa' : 'Die Sternenwacht', k.x + k.w / 2, k.y + 120, 26, rache ? '#f87171' : '#93c5fd');
    if (rache) text('NEU!', k.x + k.w - 40, k.y + 26, 16, '#ffd166', 'center', false);
    umbrechen(rache
      ? 'General Kragan hat deinen Papa besiegt. Verdiene Geld mit Aufträgen, kauf dir Mechs und Waffen – und hol dir deine Rache!'
      : 'Rette mit Kommandantin Vega die Galaxis vor Baron Eisenzahn. 5 Missionen mit fertigen Mechs.', k.x + 26, k.y + 162, k.w - 52, 21, 15, '#c9c3ff');
    const stand = rache ? (karriere.prolog ? `Kapitel ${Math.min(karriere.fortschritt, RACHE.length - 1)} von ${RACHE.length - 1}  ·  ${geldText(karriere.geld)}` : 'Noch nicht angefangen')
      : `${storyFortschritt} von ${MISSIONEN.length} Missionen geschafft`;
    text(stand, k.x + k.w / 2, k.y + k.h - 30, 14, '#ffd166', 'center', false);
  }
  knopfMalen(STORY_ZURUECK, '← Zurück');
}
function kampagnenKlick() {
  if (imRechteck(maus, STORY_ZURUECK)) { zustand = 'titel'; return; }
  if (imRechteck(maus, KAMPAGNE_KARTEN[1])) { zustand = 'story'; return; }
  if (imRechteck(maus, KAMPAGNE_KARTEN[0])) {
    if (!karriere.prolog) racheStarten(RACHE[0]);   // Zuerst der Prolog
    else { auftraegeAuffuellen(); karriereMeldung = ''; zustand = 'karriere'; }
  }
}

// ===== Milas Hangar (Aufträge, Hangar, Mech-Laden, Waffen-Laden) =====
let karriereTab = 'auftraege', karriereMeldung = '';
const KARRIERE_TABS = [
  { id: 'auftraege', name: '📜 Aufträge' }, { id: 'hangar', name: '🏠 Hangar' },
  { id: 'mechladen', name: '🤖 Mech-Laden' }, { id: 'waffenladen', name: '🔫 Waffen-Laden' },
];
const tabKnopf = i => ({ x: 30 + i * 228, y: 66, w: 216, h: 42 });
const auftragKnopf = i => ({ x: 490, y: 126 + i * 132, w: 440, h: 120 });
const STORY_START = { x: 30, y: 126, w: 440, h: 384 };
const hangarZeile = i => ({ x: 30, y: 124 + i * 48, w: 300, h: 42 });
const hangarSlotY = i => 300 + i * 38;
const hangarPfeil = (i, r) => ({ x: r < 0 ? 470 : 860, y: hangarSlotY(i) - 16, w: 32, h: 32 });
const VERKAUF_MECH = { x: 700, y: 128, w: 230, h: 38 };
const mechLadenKarte = i => ({ x: 30 + (i % 4) * 228, y: 122 + Math.floor(i / 4) * 134, w: 216, h: 124 });
const waffenZeileY = i => 136 + i * 30;
const waffeKaufen = i => ({ x: 690, y: waffenZeileY(i) - 13, w: 110, h: 26 });
const waffeVerkaufen = i => ({ x: 810, y: waffenZeileY(i) - 13, w: 120, h: 26 });
const KARRIERE_ZURUECK = { x: 30, y: 548, w: 150, h: 38 };

function zeichneKarriere() {
  sterneMalenHimmel();
  text('⚔️ Rache für Papa  ·  Milas Hangar', 30, 34, 24, '#f87171', 'left');
  text(geldText(karriere.geld), W - 30, 34, 24, '#ffd166', 'right');
  KARRIERE_TABS.forEach((t, i) => {
    const k = tabKnopf(i), an = karriereTab === t.id, hover = imRechteck(maus, k);
    ctx.fillStyle = an ? '#ffd166' : hover ? '#3a4256' : 'rgba(30,34,46,0.92)'; rr(k.x, k.y, k.w, k.h, 10); ctx.fill();
    text(t.name, k.x + k.w / 2, k.y + k.h / 2, 17, an ? '#1b1f3a' : '#fff', 'center', false);
  });
  if (karriereTab === 'auftraege') zeichneAuftraege();
  else if (karriereTab === 'hangar') zeichneHangar();
  else if (karriereTab === 'mechladen') zeichneMechLaden();
  else zeichneWaffenLaden();
  knopfMalen(KARRIERE_ZURUECK, '← Menü');
  const am = aktiverMech(), at = typVon(am.typ);
  text(`Dein Mech: ${at.emoji} ${at.name}  ${karriereTyp(am).slots.map(s => s.waffe ? SLOT_ARTEN[s.art].punkt : '⚪').join('')}`, 200, 567, 14, '#c9c3ff', 'left', false);
  if (karriereMeldung) text(karriereMeldung, W - 30, 567, 14, karriereMeldung.startsWith('⚠️') || karriereMeldung.startsWith('❌') ? '#ff6b6b' : '#4ade80', 'right', false);
}
function zeichneAuftraege() {
  // Links: die nächste Story-Mission
  const m = naechsteStory(), k = STORY_START, hover = m && imRechteck(maus, k);
  ctx.fillStyle = hover ? '#3a2430' : 'rgba(40,20,28,0.92)'; rr(k.x, k.y, k.w, k.h, 14); ctx.fill();
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = hover ? 4 : 2; ctx.stroke();
  if (m) {
    const kk = KARTEN.find(x => x.id === m.karte), mi = modusInfoVon(m.modus);
    text(`⭐ Kapitel ${karriere.fortschritt}: ${m.name}`, k.x + 20, k.y + 30, 20, '#f87171', 'left');
    text(`${kk.emoji} ${kk.name}  ·  ${mi.emoji} ${mi.name}`, k.x + 20, k.y + 62, 15, '#c9c3ff', 'left', false);
    umbrechen(`🎯 ${m.ziel}`, k.x + 20, k.y + 100, k.w - 40, 20, 15, '#fff');
    text(`👥 Mit dir: ${m.freunde.length} Söldner  ·  Gegner: ${m.gegner.length}`, k.x + 20, k.y + 170, 14, '#c9c3ff', 'left', false);
    if (m.empfohlen) text(`💡 Empfohlen: ${m.empfohlen}-Mech`, k.x + 20, k.y + 198, 14, '#fde68a', 'left', false);
    text(`💰 Belohnung: ${geldText(m.belohnung)}  (+${ABSCHUSS_BONUS} pro Abschuss)`, k.x + 20, k.y + 226, 14, '#ffd166', 'left', false);
    zeichneMech2D('rot', k.x + k.w / 2, k.y + 290, 1.2, Math.PI, Math.PI + Math.sin(zeit) * 0.3, zeit * 4, m.modus === 'boss' ? BOSS_KRAGAN : typVon(typeof m.gegner[0] === 'string' ? m.gegner[0] : m.gegner[0].typ) || BOSS_KRAGAN);
    text(hover ? '▶ MISSION STARTEN' : '▶ Klick zum Starten', k.x + k.w / 2, k.y + k.h - 24, 18, hover ? '#ffd166' : '#fff', 'center');
  } else {
    text('🏆 Kragan ist besiegt!', k.x + k.w / 2, k.y + 120, 26, '#ffd166');
    umbrechen('Du hast deinen Papa gerächt. Aber Söldner-Aufträge gibt es immer – verdiene weiter Credits und sammle alle Mechs!', k.x + 30, k.y + 170, k.w - 60, 22, 16, '#c9c3ff');
  }
  // Rechts: Nebenaufträge
  text('💼 Nebenaufträge (zum Geld verdienen)', 490, 116, 13, '#8a8fb0', 'left', false);
  karriere.auftraege.forEach((a, i) => {
    const b = auftragKnopf(i), h = imRechteck(maus, b), kk = KARTEN.find(x => x.id === a.karte), mi = modusInfoVon(a.modus);
    ctx.fillStyle = h ? '#2a3350' : 'rgba(20,26,46,0.92)'; rr(b.x, b.y + 6, b.w, b.h - 6, 12); ctx.fill();
    ctx.strokeStyle = h ? '#ffd166' : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
    text(a.name, b.x + 16, b.y + 30, 18, '#fff', 'left', false);
    text(geldText(a.belohnung), b.x + b.w - 16, b.y + 30, 17, '#ffd166', 'right', false);
    text(`${kk.emoji} ${kk.name}  ·  ${mi.emoji} ${mi.name}`, b.x + 16, b.y + 58, 13, '#c9c3ff', 'left', false);
    text(`🎯 ${a.ziel}  ·  ${a.gegner.length} Gegner: ${a.gegner.map(id => typVon(id).emoji).join('')}`, b.x + 16, b.y + 84, 13, '#c9c3ff', 'left', false);
    text(h ? '▶ Starten' : '', b.x + b.w - 16, b.y + 100, 14, '#ffd166', 'right', false);
  });
}
function zeichneHangar() {
  text('Deine Mechs (anklicken = nehmen):', 30, 116, 13, '#8a8fb0', 'left', false);
  karriere.mechs.slice(0, 8).forEach((km, i) => {
    const k = hangarZeile(i), t = typVon(km.typ), an = km.nr === karriere.aktiv, h = imRechteck(maus, k);
    ctx.fillStyle = an ? '#3a4256' : h ? '#2a3350' : 'rgba(20,26,46,0.92)'; rr(k.x, k.y, k.w, k.h, 10); ctx.fill();
    if (an) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke(); }
    text(`${t.emoji} ${t.name}`, k.x + 14, k.y + k.h / 2, 16, an ? '#ffd166' : '#fff', 'left', false);
    text(karriereTyp(km).slots.map(s => s.waffe ? SLOT_ARTEN[s.art].punkt : '⚪').join(''), k.x + k.w - 12, k.y + k.h / 2, 12, '#fff', 'right', false);
  });
  // Rechts: Waffen einbauen
  const km = aktiverMech(), typ = karriereTyp(km);
  ctx.fillStyle = 'rgba(20,26,46,0.92)'; rr(350, 120, 580, 412, 14); ctx.fill();
  zeichneMech2D('blau', 470, 205, 1.3, zeit * 0.6, zeit * 0.6 + Math.sin(zeit * 2) * 0.3, zeit * 5, typ);
  text(`${typ.emoji} ${typ.name}`, 560, 180, 22, typ.akzent, 'left');
  text(`${KLASSEN.find(k => k.id === typ.klasse).name}  ·  ❤️ ${typ.leben}  ·  💨 ${typ.tempo}`, 560, 210, 14, '#c9c3ff', 'left', false);
  if (karriere.mechs.length > 1) knopfMalen(VERKAUF_MECH, `Verkaufen (+${geldText(MECH_PREISE[km.typ] * VERKAUF_ANTEIL)})`, '#ff6b6b');
  text('🔧 Waffen einbauen: Klick auf ◀ ▶ (nur Waffen aus deinem Lager mit der gleichen Farbe)', 370, 272, 12, '#8a8fb0', 'left', false);
  typ.slots.forEach((s, i) => {
    const y = hangarSlotY(i), a = SLOT_ARTEN[s.art];
    ctx.fillStyle = a.farbe; rr(370, y - 16, 90, 32, 8); ctx.fill();
    text(`${a.punkt} ${ORTE[s.ort].name.replace('Schulter ', 'Schult. ')}`, 415, y, 10, '#fff', 'center', false);
    knopfMalen(hangarPfeil(i, -1), '◀'); knopfMalen(hangarPfeil(i, 1), '▶');
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(508, y - 16, 346, 32, 8); ctx.fill();
    const w = WAFFEN[s.waffe];
    text(w ? w.name : '— leer —', 681, y, 15, w ? '#fff' : '#6b7080', 'center', false);
  });
  const lager = Object.entries(karriere.lager).filter(([, n]) => n > 0);
  text(`📦 Lager: ${lager.length ? lager.map(([id, n]) => `${SLOT_ARTEN[WAFFEN[id].art].punkt}${WAFFEN[id].name} ×${n}`).join(', ') : 'leer – kauf Waffen im Waffen-Laden!'}`, 370, 520, 12, '#c9c3ff', 'left', false);
}
function zeichneMechLaden() {
  MECH_TYPEN.forEach((t, i) => {
    const k = mechLadenKarte(i), preis = MECH_PREISE[t.id], genug = karriere.geld >= preis, h = imRechteck(maus, k);
    const besitzt = karriere.mechs.filter(m => m.typ === t.id).length;
    ctx.fillStyle = h ? '#2a3350' : 'rgba(20,26,46,0.92)'; rr(k.x, k.y, k.w, k.h, 12); ctx.fill();
    ctx.strokeStyle = h && genug ? '#ffd166' : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
    zeichneMech2D('blau', k.x + 44, k.y + 52, 0.75, zeit * 0.5 + i, zeit * 0.5 + i, h ? zeit * 6 : 0, { ...t, slots: t.slots.map(s => ({ ...s, waffe: null })) });
    text(`${t.emoji} ${t.name}`, k.x + 84, k.y + 22, 15, t.akzent, 'left', false);
    text(KLASSEN.find(x => x.id === t.klasse).name, k.x + 84, k.y + 44, 12, '#8a8fb0', 'left', false);
    slotPunkte(t, k.x + 140, k.y + 66, 5);
    text(geldText(preis), k.x + k.w / 2, k.y + 94, 16, genug ? '#ffd166' : '#ff6b6b', 'center', false);
    text(besitzt ? `✓ hast du ${besitzt > 1 ? besitzt + '×' : ''}` : h ? (genug ? 'Klick = kaufen' : 'zu teuer') : 'ohne Waffen', k.x + k.w / 2, k.y + 112, 11, besitzt ? '#4ade80' : '#8a8fb0', 'center', false);
  });
  text('Neue Mechs kommen OHNE Waffen. Die kaufst du im Waffen-Laden und baust sie im Hangar ein.', W / 2, 532, 13, '#8a8fb0', 'center', false);
}
function zeichneWaffenLaden() {
  text('Waffe', 40, 118, 12, '#8a8fb0', 'left', false);
  text('Preis', 590, 118, 12, '#8a8fb0', 'center', false);
  text('Lager', 650, 118, 12, '#8a8fb0', 'center', false);
  WAFFEN_LISTE.forEach((w, i) => {
    const y = waffenZeileY(i), a = SLOT_ARTEN[w.art], preis = WAFFEN_PREISE[w.id], n = karriere.lager[w.id] || 0;
    ctx.fillStyle = i % 2 ? 'rgba(20,26,46,0.6)' : 'rgba(30,38,60,0.6)'; ctx.fillRect(30, y - 14, 900, 28);
    ctx.fillStyle = a.farbe; rr(36, y - 8, 6, 16, 2); ctx.fill();
    text(w.name, 52, y, 15, '#fff', 'left', false);
    text(w.text, 190, y, 11, '#8a8fb0', 'left', false);
    text(geldText(preis), 590, y, 13, karriere.geld >= preis ? '#ffd166' : '#ff6b6b', 'center', false);
    text(String(n), 650, y, 14, n ? '#4ade80' : '#6b7080', 'center', false);
    knopfMalen(waffeKaufen(i), 'Kaufen', karriere.geld >= preis ? '#4ade80' : '#6b7080');
    if (n) knopfMalen(waffeVerkaufen(i), `+${Math.round(preis * VERKAUF_ANTEIL)}`, '#ff6b6b');
  });
}
function karriereKlick() {
  if (imRechteck(maus, KARRIERE_ZURUECK)) { zustand = 'kampagnen'; return; }
  KARRIERE_TABS.forEach((t, i) => { if (imRechteck(maus, tabKnopf(i))) { karriereTab = t.id; karriereMeldung = ''; sound.piep(); } });
  if (karriereTab === 'auftraege') {
    const m = naechsteStory();
    if (m && imRechteck(maus, STORY_START)) { racheStarten(m); return; }
    karriere.auftraege.forEach((a, i) => { if (imRechteck(maus, auftragKnopf(i))) racheStarten(a); });
  } else if (karriereTab === 'hangar') {
    karriere.mechs.slice(0, 8).forEach((km, i) => { if (imRechteck(maus, hangarZeile(i))) { karriere.aktiv = km.nr; sound.piep(); karriereSpeichern(); } });
    const km = aktiverMech(), basis = typVon(km.typ);
    if (karriere.mechs.length > 1 && imRechteck(maus, VERKAUF_MECH)) {
      if (!confirm(`${basis.name} wirklich verkaufen? Die eingebauten Waffen kommen zurück ins Lager.`)) return;
      for (const w of km.slots) if (w) karriere.lager[w] = (karriere.lager[w] || 0) + 1;
      karriere.geld += MECH_PREISE[km.typ] * VERKAUF_ANTEIL;
      karriere.mechs = karriere.mechs.filter(m => m !== km);
      karriere.aktiv = karriere.mechs[0].nr;
      sound.abschuss(); karriereSpeichern();
      return;
    }
    basis.slots.forEach((s, i) => {
      for (const r of [-1, 1]) if (imRechteck(maus, hangarPfeil(i, r))) {
        // Möglich: leer, die Waffe, die gerade drin ist, und alle passenden Waffen aus dem Lager
        const jetzt = WAFFEN[km.slots[i]] ? km.slots[i] : null;
        const moeglich = [null, ...WAFFEN_LISTE.filter(w => w.art === s.art && (w.id === jetzt || (karriere.lager[w.id] || 0) > 0)).map(w => w.id)];
        const j = Math.max(0, moeglich.indexOf(jetzt));
        const neu = moeglich[(j + r + moeglich.length) % moeglich.length];
        if (neu === jetzt) return;
        if (jetzt) karriere.lager[jetzt] = (karriere.lager[jetzt] || 0) + 1;   // Alte Waffe zurück ins Lager
        if (neu) karriere.lager[neu]--;                                        // Neue Waffe aus dem Lager nehmen
        while (km.slots.length < basis.slots.length) km.slots.push(null);
        km.slots[i] = neu;
        sound.piep(); karriereSpeichern();
      }
    });
  } else if (karriereTab === 'mechladen') {
    MECH_TYPEN.forEach((t, i) => {
      if (!imRechteck(maus, mechLadenKarte(i))) return;
      const preis = MECH_PREISE[t.id];
      if (karriere.geld < preis) { karriereMeldung = `❌ Dafür fehlen dir noch ${geldText(preis - karriere.geld)}`; sound.autsch(); return; }
      if (!confirm(`${t.name} für ${preis} Credits kaufen? (ohne Waffen)`)) return;
      karriere.geld -= preis;
      const nr = karriere.naechsteNr++;
      karriere.mechs.push({ nr, typ: t.id, slots: t.slots.map(() => null) });
      karriere.aktiv = nr;
      karriereMeldung = `✅ ${t.name} gekauft! Bau im Hangar Waffen ein.`;
      sound.los(); karriereSpeichern();
    });
  } else {
    WAFFEN_LISTE.forEach((w, i) => {
      const preis = WAFFEN_PREISE[w.id];
      if (imRechteck(maus, waffeKaufen(i))) {
        if (karriere.geld < preis) { karriereMeldung = `❌ Dafür fehlen dir noch ${geldText(preis - karriere.geld)}`; sound.autsch(); return; }
        karriere.geld -= preis; karriere.lager[w.id] = (karriere.lager[w.id] || 0) + 1;
        karriereMeldung = `✅ ${w.name} gekauft – bau sie im Hangar ein!`;
        sound.piep(); karriereSpeichern();
      } else if ((karriere.lager[w.id] || 0) > 0 && imRechteck(maus, waffeVerkaufen(i))) {
        karriere.lager[w.id]--; karriere.geld += Math.round(preis * VERKAUF_ANTEIL);
        sound.piep(); karriereSpeichern();
      }
    });
  }
}

// =====================================================================
// ===== 🌐 Online-Multiplayer (mit PeerJS) =====
// =====================================================================
// So funktioniert es:
//   - Einer erstellt einen Raum (der Gastgeber) und bekommt einen Code mit 4 Zeichen.
//   - Die Freunde geben den Code ein und kommen in die Lobby.
//   - Der Gastgeber stellt Karte, Modus, Bots und gesperrte Mechs ein und startet.
//   - Im Spiel rechnet der Gastgeber alles (Bots, Treffer, Punkte) und schickt 15-mal pro Sekunde, wo alles ist.
//     Jeder Gast steuert seinen eigenen Mech selbst und schickt, wo er ist und ob er schießt.
// Zum Finden benutzt PeerJS einen kostenlosen Vermittlungs-Server. Danach reden die Computer direkt miteinander.
// PeerJS wird erst geladen, wenn jemand auf "Raum erstellen" oder "Beitreten" klickt.
const MP_MAX_SPIELER = 8;       // So viele Menschen passen in einen Raum (mit Gastgeber)
const MP_SENDE_RATE = 15;       // So oft pro Sekunde schickt der Gastgeber, wo alles ist
const MP_EINGABE_RATE = 20;     // So oft pro Sekunde schickt ein Gast, was er macht
const MP_PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const MP_VORSILBE = 'kaempfer-stahl-';   // Damit unsere Raum-Codes nicht mit anderen Spielen zusammenstoßen
const MP_MAX_BOTS = 4;          // So viele Bots pro Team kann man einstellen
const TEIL_IDS = Object.keys(TEILE);
const SCHUSS_ARTEN = ['kugel', 'strahl', 'granate', 'rakete', 'salve'];
const r0 = v => Math.round(v), r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
let mpName = '';
try { mpName = localStorage.getItem('kaempfer-name') || ''; } catch (e) { /* egal */ }
if (!mpName) mpName = 'Pilot' + Math.floor(10 + Math.random() * 90);
const nameSauber = n => String(n || '').replace(/[<>]/g, '').trim().slice(0, 14);

function mpLadePeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((ok, fehler) => {
    const sc = document.createElement('script');
    sc.src = MP_PEERJS; sc.onload = ok; sc.onerror = () => fehler(new Error('PeerJS nicht geladen'));
    document.head.appendChild(sc);
  });
}
function mpNeuerCode() {   // 4 Zeichen, ohne verwechselbare wie 0/O und 1/I
  const z = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let k = 0; k < 4; k++) c += z[Math.floor(Math.random() * z.length)];
  return c;
}
function mpFehlerText(e) {
  if (e && (e.type === 'network' || e.type === 'server-error')) return 'Keine Verbindung zum Vermittlungs-Server (Internet?)';
  if (e && e.type === 'browser-incompatible') return 'Dein Browser kann das leider nicht';
  if (e && e.type === 'peer-unavailable') return 'Raum nicht gefunden – stimmt der Code?';
  return (e && (e.type || e.message)) || 'unbekannt';
}
function mpSendeAn(g, n) { try { if (g.conn && g.conn.open) g.conn.send(n); } catch (e) { /* egal */ } }
function mpAnAlle(n) { for (const g of mp.gaeste.values()) mpSendeAn(g, n); }
function mpSende(n) { try { if (mp.conn && mp.conn.open) mp.conn.send(n); } catch (e) { /* egal */ } }
function mpEreignis(e) { if (mp.ereignisse.length < 300) mp.ereignisse.push(e); }
const mpErlaubt = () => MECH_TYPEN.filter(t => !mp.einst.gesperrt.includes(t.id));
function mpSlotsVon(typId) { const t = typVon(typId); return t ? umgebaut(t).slots.map(s => s.waffe) : []; }
function mpMeinEintrag() { return { id: mp.meineId, name: mpName, team: mp.ich.team, mech: mp.ich.mech }; }

function mpBeenden() {
  try { if (mp.peer) mp.peer.destroy(); } catch (e) { /* egal */ }
  mp.gaeste.clear();
  Object.assign(mp, { aktiv: false, rolle: null, code: '', peer: null, conn: null, liste: [], ereignisse: [], meineId: null, verbinde: false });
}
function mpVerbindungWeg(text) {
  const warImSpiel = zustand === 'spiel' || zustand === 'ende';
  mpBeenden();
  mp.status = '❌ ' + text;
  introWeg();
  zustand = 'mpLobby';
  if (warImSpiel && document.pointerLockElement) document.exitPointerLock();
}

// ----- Gastgeber -----
async function mpRaumErstellen(versuch = 0) {
  if ((mp.peer || mp.verbinde) && versuch === 0) return;
  mp.verbinde = true;
  mp.status = '⏳ Raum wird erstellt ...';
  try { await mpLadePeerJS(); } catch (e) { mp.verbinde = false; mp.status = '❌ Multiplayer konnte nicht geladen werden (Internet?)'; return; }
  const code = mpNeuerCode();
  const peer = new window.Peer(MP_VORSILBE + code);
  mp.peer = peer;
  peer.on('open', () => {
    Object.assign(mp, { aktiv: true, rolle: 'host', code, meineId: 'host', verbinde: false });
    mp.ich = { team: 'blau', mech: meinMech.id };
    mp.status = '';
    mpLobbySenden();
  });
  peer.on('connection', conn => mpNeuerGast(conn));
  peer.on('disconnected', () => { try { if (mp.peer === peer) peer.reconnect(); } catch (e) { /* egal */ } });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && versuch < 3) { peer.destroy(); mp.peer = null; mpRaumErstellen(versuch + 1); return; }   // Code schon vergeben? Neuer Code!
    if (!mp.aktiv) { peer.destroy(); mp.peer = null; mp.verbinde = false; mp.status = '❌ ' + mpFehlerText(e); }
  });
}
function mpNeuerGast(conn) {
  conn.on('open', () => {
    if (mp.gaeste.size + 1 >= MP_MAX_SPIELER) { conn.send({ t: 'nein', grund: 'Der Raum ist voll.' }); setTimeout(() => conn.close(), 500); return; }
    if (zustand !== 'mpLobby') { conn.send({ t: 'nein', grund: 'Dort läuft gerade ein Spiel. Versuch es gleich nochmal!' }); setTimeout(() => conn.close(), 500); return; }
    const md = conn.metadata || {};
    const zaehle = t => mp.liste.filter(s => s.team === t).length;
    const g = {
      id: conn.peer, conn, name: nameSauber(md.name) || 'Gast',
      team: zaehle('blau') <= zaehle('rot') ? 'blau' : 'rot',   // Ins kleinere Team
      mech: mpErlaubt().some(t => t.id === md.mech) ? md.mech : mpErlaubt()[0].id,
      slots: Array.isArray(md.slots) ? md.slots : [], e: null,
    };
    mp.gaeste.set(g.id, g);
    sound.piep();
    mpLobbySenden();
  });
  conn.on('data', d => { const g = mp.gaeste.get(conn.peer); if (g) mpVomGast(g, d); });
  conn.on('close', () => mpGastWeg(conn.peer));
  conn.on('error', () => mpGastWeg(conn.peer));
}
function mpGastWeg(id) {
  const g = mp.gaeste.get(id);
  if (!g) return;
  mp.gaeste.delete(id);
  const m = mechs.find(o => o.mensch === id);
  if (m && (zustand === 'spiel' || zustand === 'ende')) {   // Ein Bot übernimmt seinen Mech
    m.mensch = null;
    m.name += ' 🤖';
    zeigeNachricht(`👋 ${g.name} ist weg – ein Bot übernimmt.`, 3, '#c9c3ff');
  }
  mpLobbySenden();
}
function mpLobbySenden() {   // Alle bekommen die neue Spielerliste und die Einstellungen
  if (mp.rolle !== 'host') return;
  if (mp.einst.gesperrt.includes(mp.ich.mech)) mp.ich.mech = mpErlaubt()[0].id;
  for (const g of mp.gaeste.values()) if (mp.einst.gesperrt.includes(g.mech)) g.mech = mpErlaubt()[0].id;
  mp.liste = [mpMeinEintrag(), ...[...mp.gaeste.values()].map(g => ({ id: g.id, name: g.name, team: g.team, mech: g.mech }))];
  for (const g of mp.gaeste.values()) mpSendeAn(g, { t: 'lobby', einst: mp.einst, liste: mp.liste, du: g.id, code: mp.code });
}
function mpVomGast(g, d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'wahl') {   // Der Gast hat Team, Mech oder Namen geändert
    if (d.team === 'blau' || d.team === 'rot') g.team = d.team;
    if (typVon(d.mech) && !mp.einst.gesperrt.includes(d.mech)) g.mech = d.mech;
    if (Array.isArray(d.slots)) g.slots = d.slots;
    if (d.name) g.name = nameSauber(d.name) || g.name;
    mpLobbySenden();
  } else if (d.t === 'e') g.e = d;   // Was der Gast gerade macht (Position, Blick, Schießen)
}
function mpStarten() {   // Der Gastgeber startet das Spiel
  if (mp.rolle !== 'host') return;
  mpLobbySenden();
  const erlaubt = mpErlaubt();
  const auf = [];
  for (const team of ['blau', 'rot']) {
    const menschen = mp.liste.filter(s => s.team === team);
    for (const s of menschen) {
      const g = mp.gaeste.get(s.id);
      auf.push({ team, typ: s.mech, slots: s.id === 'host' ? mpSlotsVon(s.mech) : (g ? g.slots : []), name: s.name, mensch: s.id });
    }
    const bots = Math.max(mp.einst.bots, menschen.length === 0 ? 1 : 0);   // Jedes Team braucht mindestens einen Mech
    for (let i = 0; i < bots; i++) auf.push({ team, typ: zufall(erlaubt).id, slots: [], name: null, mensch: null });
  }
  const start = { t: 'start', karte: mp.einst.karte, modus: mp.einst.modus, auf };
  mpAnAlle(start);
  mpSpielStarten(start);
}

// ----- Gast -----
async function mpBeitreten(code) {
  code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { mp.status = 'Der Code hat 4 Zeichen, z. B. K7PX'; return; }
  if (mp.peer || mp.verbinde) return;
  mp.verbinde = true;
  mp.status = '⏳ Verbinde ...';
  try { await mpLadePeerJS(); } catch (e) { mp.verbinde = false; mp.status = '❌ Multiplayer konnte nicht geladen werden (Internet?)'; return; }
  const peer = new window.Peer();
  mp.peer = peer;
  peer.on('open', id => {
    mp.ich = { team: 'blau', mech: meinMech.id };
    const conn = peer.connect(MP_VORSILBE + code, { serialization: 'json', reliable: true, metadata: { name: mpName, mech: meinMech.id, slots: mpSlotsVon(meinMech.id) } });
    mp.conn = conn;
    conn.on('open', () => { Object.assign(mp, { aktiv: true, rolle: 'gast', code, meineId: id, verbinde: false }); mp.status = ''; });
    conn.on('data', d => mpVomHost(d));
    conn.on('close', () => { if (mp.conn === conn) mpVerbindungWeg('Die Verbindung zum Gastgeber ist weg.'); });
  });
  peer.on('error', e => { if (mp.peer === peer) mpVerbindungWeg(mpFehlerText(e)); });
}
function mpWahlSenden() {   // Gast: Team, Mech und Namen an den Gastgeber schicken
  if (mp.rolle === 'gast') mpSende({ t: 'wahl', team: mp.ich.team, mech: mp.ich.mech, slots: mpSlotsVon(mp.ich.mech), name: mpName });
  else mpLobbySenden();
}
function mpVomHost(d) {
  if (!d || typeof d !== 'object') return;
  if (d.t === 'lobby') {
    mp.einst = d.einst; mp.liste = d.liste; mp.code = d.code || mp.code;
    const ich = d.liste.find(s => s.id === d.du);
    if (ich) mp.ich = { team: ich.team, mech: ich.mech };
  } else if (d.t === 'start') mpSpielStarten(d);
  else if (d.t === 's') mpSchnappschuss(d);
  else if (d.t === 'ende') {
    if (zustand !== 'spiel') return;
    zustand = 'ende';
    ende = { sieger: d.s, grund: d.g, seit: zeit };
    maus.links = maus.rechts = false;
    if (document.pointerLockElement) document.exitPointerLock();
    if (d.s === spieler.team) sound.sieg(); else sound.niederlage();
  } else if (d.t === 'lobbyZurueck') { introWeg(); zustand = 'mpLobby'; if (document.pointerLockElement) document.exitPointerLock(); }
  else if (d.t === 'nein') { const grund = d.grund; mpBeenden(); mp.status = '❌ ' + grund; }
}

// ----- Spiel starten (beim Gastgeber und bei allen Gästen gleich) -----
function mpSpielStarten(d) {
  karte = KARTEN.find(k => k.id === d.karte) || KARTEN[0];
  normalesSpiel();
  const aufstellung = d.auf.map(a => {
    const basis = typVon(a.typ) || MECH_TYPEN[0];
    const typ = { ...basis, slots: basis.slots.map((s, i) => { const w = WAFFEN[a.slots && a.slots[i]]; return { ...s, waffe: w && w.art === s.art ? w.id : s.waffe }; }) };
    const ich = a.mensch === mp.meineId;
    return { team: a.team, typ, name: a.name || undefined, mensch: ich ? null : a.mensch, ich };
  });
  mp.ereignisse = [];
  mp.schuesse = new Map();
  neuesSpiel(d.modus, aufstellung);
}
function mpZurLobby() {   // Gastgeber: Nach dem Spiel alle zurück in die Lobby
  mpAnAlle({ t: 'lobbyZurueck' });
  introWeg();
  zustand = 'mpLobby';
  mpLobbySenden();
}

// ----- Jedes Bild: Daten verschicken -----
function mpTick(dt) {
  mp.sendeT -= dt;
  if (mp.rolle === 'host') {
    // Was die Gäste machen, auf ihre Mechs übertragen
    for (const m of mechs) {
      if (!m.mensch || m.tot) continue;
      const g = mp.gaeste.get(m.mensch);
      if (!g || !g.e || !g.e.p) continue;
      const [x, y, z, zw, zh, lw, lf] = g.e.p;
      m.vx = (x - m.x) / Math.max(dt, 0.001); m.vy = (y - m.y) / Math.max(dt, 0.001);
      Object.assign(m, { x, y, z, zielWinkel: zw, zielHoch: zh, laufWinkel: lw, laeuft: !!lf });
      if (m.laeuft) m.phase += dt * 10;
      if (typeof g.e.zw2 === 'number') m.zielWeite = g.e.zw2;
      if (!intro && countdown <= 0) {
        if (g.e.f & 1) feuern(m, 'haupt');
        if (g.e.f & 2) feuern(m, 'rakete');
      }
    }
    if (mp.sendeT <= 0) { mp.sendeT = 1 / MP_SENDE_RATE; mpSchnappschussSenden(); }
  } else if (mp.rolle === 'gast' && spieler) {
    if (mp.sendeT <= 0) {
      mp.sendeT = 1 / MP_EINGABE_RATE;
      const m = spieler;
      mpSende({ t: 'e', p: [r0(m.x), r0(m.y), r1(m.z), r2(m.zielWinkel), r2(m.zielHoch), r2(m.laufWinkel), m.laeuft ? 1 : 0],
        f: (mp.feuer ? 1 : 0) | (mp.rakete ? 2 : 0), zw2: r0(m.zielWeite || 500) });
    }
  }
}
function mpSchnappschussSenden() {
  const ms = mechs.map(m => [
    r0(m.x), r0(m.y), r1(m.z), r2(m.zielWinkel), r2(m.zielHoch), r2(m.laufWinkel), m.laeuft ? 1 : 0, m.tot ? 1 : 0, m.schutz > 0 ? 1 : 0,
    TEIL_IDS.map(id => r0(m.teile[id].hp)), m.spawnNr || 0, m.abschuesse, m.tode, m.neustart === Infinity ? -1 : r1(m.neustart),
    m.salve ? [r0(m.salve.ziel.x), r0(m.salve.ziel.y), r1(m.salve.warten), m.salve.rest] : 0,
    m.mensch || m.istSpieler ? m.waffen.map(s => r2(Math.max(0, s.pause))) : 0,
    m.blitz > 0 ? 1 : 0, m.zerstoertVon ? mechs.indexOf(m.zerstoertVon) : -1, m.koGrund || 0,
  ]);
  const sc = [];
  for (const s of schuesse) {
    if (s.weg) continue;
    if (!s.id) s.id = ++mp.schussNr;
    const v = s.bogen ? [(s.dx || 0) * 60, (s.dy || 0) * 60, (s.dh || 0) * 60] : [s.vx, s.vy, s.vh || 0];
    sc.push([s.id, SCHUSS_ARTEN.indexOf(s.art), r0(s.x), r0(s.y), r0(s.h), r0(v[0]), r0(v[1]), r0(v[2]), s.laser ? 1 : 0]);
  }
  const sp = {
    p: [r1(punkte.blau), r1(punkte.rot)], rz: r1(restZeit), cd: r2(countdown), az: aktivesZiel,
    zi: ziele.map(z => [r1(z.fortschritt || 0), z.besitzer || 0, z.erobert ? 1 : 0, z.umkaempft ? 1 : 0, z.wer || 0]),
    ru: runde, rp: r1(rundePause), vl: verlaengerung ? 1 : 0, in: intro ? 1 : 0,
  };
  mpAnAlle({ t: 's', ms, sc, sp, ev: mp.ereignisse });
  mp.ereignisse = [];
}

// ----- Gast: Was der Gastgeber schickt, übernehmen -----
function mpSchnappschuss(d) {
  if (zustand !== 'spiel' && zustand !== 'ende') return;
  d.ms.forEach((e, i) => {
    const m = mechs[i];
    if (!m) return;
    const [x, y, z, zw, zh, lw, lf, tot, schutz, hp, sn, ab, td, ns, sv, wp, bl, von, ko] = e;
    TEIL_IDS.forEach((id, k) => { m.teile[id].hp = hp[k]; });
    m.schutz = schutz ? 1 : 0;
    m.abschuesse = ab; m.tode = td;
    m.neustart = ns < 0 ? Infinity : ns;
    if (bl) m.blitz = 0.08;
    m.koGrund = ko || null;
    if (tot && !m.tot) {   // Gerade zerstört: Das Wrack fliegt!
      m.tot = true; m.totZeit = 0; m.salve = null;
      m.zerstoertVon = mechs[von] || null;
      wrackStarten(m, m.zerstoertVon, false);
    } else if (!tot && m.tot) { m.tot = false; m.wrack = null; }
    if (m === spieler) {
      if (sn !== m.spawnNr) {   // Neu gestartet: an den Startplatz springen
        m.spawnNr = sn;
        Object.assign(m, { x, y, z, vz: 0, zielWinkel: zw, laufWinkel: zw });
        blick.links = zw; blick.hoch = 0;
      }
      if (wp) wp.forEach((p, k) => { if (m.waffen[k]) m.waffen[k].pause = p; });
    } else {
      m.netz = { x, y, z, zw, zh, lw };
      m.laeuft = !!lf;
    }
    if (sv) {
      const h = hagelVon(m);
      m.salve = { w: h ? h.w : WAFFEN.hagel, ziel: { x: sv[0], y: sv[1] }, warten: sv[2], rest: sv[3], bemerkt: new Map() };
    } else m.salve = null;
  });
  // Schüsse
  const da = new Set();
  for (const [id, art, x, y, h, vx, vy, vh, laser] of d.sc) {
    da.add(id);
    let s = mp.schuesse.get(id);
    if (!s) {
      s = { id, art: SCHUSS_ARTEN[art], laser: !!laser, x, y, h, vx, vy, vh, rest: 1e9 };
      mp.schuesse.set(id, s);
      schuesse.push(s);
      const laut = Math.max(0.1, lautBei(s));
      if (s.art === 'kugel') sound.mg(laut * 0.6); else if (s.art === 'strahl') { if (s.laser) sound.laser(laut); else sound.railgun(laut); }
      else if (s.art === 'rakete') sound.rakete(laut); else sound.salve(laut);
    }
    Object.assign(s, { x, y, h, vx, vy, vh, alter: 0 });
  }
  for (const [id, s] of mp.schuesse) if (!da.has(id)) { s.weg = true; mp.schuesse.delete(id); }
  // Spielstand
  const sp = d.sp;
  const vorher = Math.ceil(countdown);
  punkte.blau = sp.p[0]; punkte.rot = sp.p[1];
  restZeit = sp.rz; countdown = sp.cd; aktivesZiel = sp.az;
  sp.zi.forEach((w, i) => { const z = ziele[i]; if (z) Object.assign(z, { fortschritt: w[0], besitzer: w[1] || null, erobert: !!w[2], umkaempft: !!w[3], wer: w[4] || null }); });
  runde = sp.ru; rundePause = sp.rp; verlaengerung = !!sp.vl;
  mp.hostIntro = !!sp.in;
  if (!intro && countdown > 0 && Math.ceil(countdown) !== vorher) sound.piep();
  if (!intro && vorher > 0 && countdown <= 0) sound.los();
  if (!sp.in && intro && intro.t > 1) introBeenden();   // Der Gastgeber ist mit dem Intro fertig
  // Ereignisse
  for (const e of d.ev) mpEreignisAusfuehren(e);
}
function mpEreignisAusfuehren(e) {
  const art = e[0];
  if (art === 'b') explosionEffekt(e[1], e[2], e[3], e[4]);
  else if (art === 'f') funken(e[1], e[2], e[3], e[4]);
  else if (art === 'k') killfeedDazu(mechs[e[1]] || null, mechs[e[2]]);
  else if (art === 't') teamMeldung(e[1], e[2], e[3]);
  else if (art === 'w') hagelWarnung(e[1], e[2], e[3], e[4]);
  else if (art === 'p' && mechs[e[1]] === spieler) persoenlich(e[2], e.slice(3));
}
// Gast: alle anderen Mechs weich zur Position vom Gastgeber gleiten lassen
function updateGast(dt) {
  for (const k of killfeed) k.t -= dt;
  killfeed = killfeed.filter(k => k.t > 0);
  mp.feuer = mp.rakete = false;
  if (countdown <= 0 && !mp.hostIntro && !spieler.tot) updateSpieler(dt);   // Erst los, wenn auch der Gastgeber fertig ist
  if (pause) mp.feuer = mp.rakete = false;
  const k = Math.min(1, dt * 12);
  for (const m of mechs) {
    m.blitz -= dt;
    if (m.tot) { m.totZeit += dt; if (m.wrack) updateWrack(m, dt); continue; }
    if (m === spieler || !m.netz) continue;
    const n = m.netz;
    m.vx = (n.x - m.x) * 12; m.vy = (n.y - m.y) * 12;
    m.x += (n.x - m.x) * k; m.y += (n.y - m.y) * k; m.z += (n.z - m.z) * k;
    m.zielWinkel = drehe(m.zielWinkel, n.zw, dt * 12);
    m.laufWinkel = drehe(m.laufWinkel, n.lw, dt * 12);
    m.zielHoch += (n.zh - m.zielHoch) * k;
    if (m.laeuft) m.phase += dt * 10;
  }
  for (const s of schuesse) {   // Schüsse fliegen weiter, bis der nächste Schnappschuss kommt
    s.alter = (s.alter || 0) + dt;
    if (s.alter > 0.4) { s.weg = true; mp.schuesse.delete(s.id); continue; }
    s.x += s.vx * dt; s.y += s.vy * dt; s.h += (s.vh || 0) * dt;
    if ((s.art === 'rakete' || s.art === 'salve') && Math.random() < 0.7) partikel.push({ x: s.x, y: s.y, h: s.h, vh: 10, vx: 0, vy: 0, t: 0.6, max: 0.6, farbe: s.art === 'salve' ? '#b9a7d6' : '#9a9a9a', rauch: true });
  }
  schuesse = schuesse.filter(s => !s.weg);
}

// ===== Die Lobby (auf dem Bildschirm) =====
const MPK = {   // Knöpfe
  erstellen: { x: W / 2 - 250, y: 210, w: 230, h: 76 },
  beitreten: { x: W / 2 + 20, y: 210, w: 230, h: 76 },
  name: { x: W / 2 - 160, y: 316, w: 320, h: 44 },
  zurueck: { x: 30, y: 540, w: 170, h: 40 },
  verlassen: { x: 30, y: 540, w: 200, h: 40 },
  starten: { x: W - 260, y: 532, w: 230, h: 52 },
  blau: { x: 600, y: 410, w: 140, h: 36 },
  rot: { x: 750, y: 410, w: 140, h: 36 },
  mechL: { x: 600, y: 462, w: 40, h: 40 },
  mechR: { x: 850, y: 462, w: 40, h: 40 },
};
const mpZeile = i => 132 + i * 52;
const mpPfeil = (i, r) => ({ x: r < 0 ? 170 : 420, y: mpZeile(i) - 18, w: 36, h: 36 });
const mpMechKachel = i => ({ x: 30 + (i % 4) * 108, y: 296 + Math.floor(i / 4) * 60, w: 100, h: 52 });
const MP_EINST_ZEILEN = [
  { name: 'Karte', werte: () => KARTEN.map(k => k.id), feld: 'karte', zeige: v => { const k = KARTEN.find(x => x.id === v); return `${k.emoji} ${k.name}`; } },
  { name: 'Modus', werte: () => MODI.map(x => x.id), feld: 'modus', zeige: v => { const x = modusInfoVon(v); return `${x.emoji} ${x.name}`; } },
  { name: 'Bots/Team', werte: () => Array.from({ length: MP_MAX_BOTS + 1 }, (_, i) => i), feld: 'bots', zeige: v => v === 0 ? 'keine Bots' : `${v} Bot${v > 1 ? 's' : ''} pro Team` },
];
function zeichneMpLobby() {
  sterneMalenHimmel();
  if (!mp.aktiv) {   // Noch in keinem Raum
    text('🌐 Online spielen', W / 2, 60, 40, '#ffd166');
    text('Spiel mit deinen Freunden auf ihren eigenen Computern!', W / 2, 108, 17, '#c9c3ff', 'center', false);
    text('Einer erstellt einen Raum und sagt den anderen den Code.', W / 2, 136, 15, '#8a8fb0', 'center', false);
    knopfMalen(MPK.erstellen, '🏠 Raum erstellen', '#4ade80');
    knopfMalen(MPK.beitreten, '🔑 Raum beitreten', '#93c5fd');
    knopfMalen(MPK.name, `✏️ Dein Name: ${mpName}`);
    text('Tipp: Nimm einen Spitznamen, nicht deinen echten Namen!', W / 2, 380, 13, '#8a8fb0', 'center', false);
    if (mp.status) text(mp.status, W / 2, 440, 18, mp.status.startsWith('❌') ? '#ff6b6b' : '#ffd166', 'center', false);
    knopfMalen(MPK.zurueck, '← Zurück');
    return;
  }
  const host = mp.rolle === 'host';
  text(`🌐 Raum-Code: ${mp.code}`, W / 2, 34, 32, '#ffd166');
  text('Sag den Code deinen Freunden! Sie klicken auf „Raum beitreten“.', W / 2, 64, 14, '#c9c3ff', 'center', false);
  // Links: Einstellungen
  ctx.fillStyle = 'rgba(20,26,46,0.9)'; rr(20, 82, 452, 444, 14); ctx.fill();
  text('⚙️ Einstellungen', 36, 104, 18, '#fff', 'left', false);
  if (!host) text('(stellt der Gastgeber ein)', 456, 104, 12, '#8a8fb0', 'right', false);
  MP_EINST_ZEILEN.forEach((z, i) => {
    const y = mpZeile(i);
    text(z.name, 36, y, 15, '#c9c3ff', 'left', false);
    if (host) { knopfMalen(mpPfeil(i, -1), '◀'); knopfMalen(mpPfeil(i, 1), '▶'); }
    text(z.zeige(mp.einst[z.feld]), 313, y, 15, '#fff', 'center', false);
  });
  text(host ? '🚫 Mechs sperren (anklicken):' : '🚫 Gesperrte Mechs:', 36, 280, 14, '#c9c3ff', 'left', false);
  MECH_TYPEN.forEach((t, i) => {
    const k = mpMechKachel(i), weg = mp.einst.gesperrt.includes(t.id), hover = host && imRechteck(maus, k);
    ctx.fillStyle = weg ? 'rgba(60,20,20,0.9)' : hover ? '#3a4256' : 'rgba(40,46,62,0.95)'; rr(k.x, k.y, k.w, k.h, 8); ctx.fill();
    ctx.strokeStyle = weg ? '#ef4444' : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = weg ? 0.35 : 1;
    text(t.emoji, k.x + 16, k.y + 18, 16, '#fff', 'center', false);
    text(t.name, k.x + k.w / 2 + 8, k.y + 38, 11, '#fff', 'center', false);
    ctx.globalAlpha = 1;
    if (weg) text('✖', k.x + k.w - 14, k.y + 15, 16, '#ef4444', 'center', false);
  });
  // Rechts: Spieler
  ctx.fillStyle = 'rgba(20,26,46,0.9)'; rr(488, 82, 452, 444, 14); ctx.fill();
  text(`👥 Spieler (${mp.liste.length}/${MP_MAX_SPIELER})`, 504, 104, 18, '#fff', 'left', false);
  mp.liste.forEach((s, i) => {
    const y = 132 + i * 32, t = typVon(s.mech) || MECH_TYPEN[0];
    ctx.fillStyle = TEAMS[s.team].farbe; kreis(514, y, 7); ctx.fill();
    text(`${s.name}${s.id === 'host' ? ' 👑' : ''}${s.id === mp.meineId ? ' (du)' : ''}`, 530, y, 15, s.id === mp.meineId ? '#ffd166' : '#fff', 'left', false);
    text(`${t.emoji} ${t.name}`, 924, y, 13, '#c9c3ff', 'right', false);
  });
  const bots = mp.einst.bots;
  if (bots) text(`+ ${bots} Bot${bots > 1 ? 's' : ''} in jedem Team 🤖`, 504, 132 + mp.liste.length * 32, 13, '#8a8fb0', 'left', false);
  text('Dein Team:', 504, 428, 14, '#c9c3ff', 'left', false);
  for (const team of ['blau', 'rot']) {
    const k = MPK[team], an = mp.ich.team === team;
    ctx.fillStyle = an ? TEAMS[team].farbe : 'rgba(40,46,62,0.95)'; rr(k.x, k.y, k.w, k.h, 8); ctx.fill();
    ctx.strokeStyle = TEAMS[team].farbe; ctx.lineWidth = 2; ctx.stroke();
    text(team === 'blau' ? '🔵 Blau' : '🔴 Rot', k.x + k.w / 2, k.y + k.h / 2, 15, '#fff', 'center', false);
  }
  text('Dein Mech:', 504, 482, 14, '#c9c3ff', 'left', false);
  knopfMalen(MPK.mechL, '◀'); knopfMalen(MPK.mechR, '▶');
  const mt = typVon(mp.ich.mech) || MECH_TYPEN[0];
  text(`${mt.emoji} ${mt.name}`, 745, 474, 15, mt.akzent, 'center', false);
  slotPunkte(umgebaut(mt), 745, 494, 5);
  // Unten
  knopfMalen(MPK.verlassen, '🚪 Raum verlassen', '#ff6b6b');
  if (host) knopfMalen(MPK.starten, '▶ Spiel starten', '#4ade80');
  else text('⏳ Warte, bis der Gastgeber startet ...', W - 150, 558, 15, '#c9c3ff', 'center', false);
}
function mpLobbyKlick() {
  if (!mp.aktiv) {
    if (imRechteck(maus, MPK.zurueck)) { if (!mp.verbinde) { mpBeenden(); mp.status = ''; } zustand = 'titel'; return; }
    if (imRechteck(maus, MPK.erstellen)) { mpRaumErstellen(); return; }
    if (imRechteck(maus, MPK.beitreten)) { const c = prompt('Raum-Code (4 Zeichen):'); if (c) mpBeitreten(c); return; }
    if (imRechteck(maus, MPK.name)) {
      const n = nameSauber(prompt('Dein Spitzname (bitte nicht dein echter Name):', mpName));
      if (n) { mpName = n; try { localStorage.setItem('kaempfer-name', n); } catch (e) { /* egal */ } }
    }
    return;
  }
  const host = mp.rolle === 'host';
  if (imRechteck(maus, MPK.verlassen)) { mpBeenden(); mp.status = ''; zustand = 'titel'; return; }
  if (host && imRechteck(maus, MPK.starten)) { mpStarten(); return; }
  if (host) {
    MP_EINST_ZEILEN.forEach((z, i) => {
      for (const r of [-1, 1]) if (imRechteck(maus, mpPfeil(i, r))) {
        const liste = z.werte(), j = Math.max(0, liste.indexOf(mp.einst[z.feld]));
        mp.einst[z.feld] = liste[(j + r + liste.length) % liste.length];
        sound.piep(); mpLobbySenden();
      }
    });
    MECH_TYPEN.forEach((t, i) => {
      if (!imRechteck(maus, mpMechKachel(i))) return;
      const g = mp.einst.gesperrt;
      if (g.includes(t.id)) mp.einst.gesperrt = g.filter(x => x !== t.id);
      else if (g.length < MECH_TYPEN.length - 1) mp.einst.gesperrt = [...g, t.id];   // Einer muss erlaubt bleiben
      sound.piep(); mpLobbySenden();
    });
  }
  for (const team of ['blau', 'rot']) if (imRechteck(maus, MPK[team])) { mp.ich.team = team; mpWahlSenden(); }
  for (const r of [-1, 1]) if (imRechteck(maus, r < 0 ? MPK.mechL : MPK.mechR)) {
    const liste = mpErlaubt(), j = Math.max(0, liste.findIndex(t => t.id === mp.ich.mech));
    mp.ich.mech = liste[(j + r + liste.length) % liste.length].id;
    sound.piep(); mpWahlSenden();
  }
}

// ===== Mech-Auswahl =====
let gewaehlterModus = 'punkt';
const ZURUECK_KNOPF = { x: 30, y: 540, w: 150, h: 40 };
let gewaehlteKlasse = meinMech.klasse;   // Welche Klasse ist im Menü gerade offen?
function klassenKnoepfe() {   // Oben: ein Knopf pro Klasse
  return KLASSEN.map((k, i) => ({ k, x: W / 2 - KLASSEN.length * 110 + i * 220 + 5, y: 98, w: 210, h: 48 }));
}
function mechKarten() {       // Darunter: die Mechs der gewählten Klasse
  const liste = MECH_TYPEN.filter(t => t.klasse === gewaehlteKlasse);
  const b = Math.min(280, Math.floor((900 - (liste.length - 1) * 16) / liste.length));
  const start = W / 2 - (liste.length * b + (liste.length - 1) * 16) / 2;
  return liste.map((t, i) => ({ t, x: start + i * (b + 16), y: 158, w: b, h: 370 }));
}
const umbauKnopf = k => ({ x: k.x + 16, y: k.y + k.h - 44, w: k.w - 32, h: 34 });   // 🔧 auf jeder Karte
// Kleine bunte Punkte: welche Slots hat der Mech?
function slotPunkte(typ, mx, y, r = 7) {
  const n = typ.slots.length, ab = r * 2.8;
  typ.slots.forEach((s, i) => {
    const x = mx + (i - (n - 1) / 2) * ab;
    ctx.fillStyle = SLOT_ARTEN[s.art].farbe; kreis(x, y, r); ctx.fill();
    ctx.strokeStyle = SLOT_ARTEN[s.art].hell; ctx.lineWidth = 1.5; ctx.stroke();
  });
}
function sterneMalen(sterne, farbe, mx, y0, abstand = 20) {
  [['❤️', sterne.leben], ['💨', sterne.tempo], ['💥', sterne.schaden], ['🎯', sterne.weite]].forEach(([e, n], i) => {
    const y = y0 + i * abstand;
    text(e, mx - 70, y, 14, '#fff', 'center', false);
    for (let j = 0; j < 5; j++) {
      ctx.fillStyle = j < n ? farbe : 'rgba(255,255,255,0.12)';
      rr(mx - 52 + j * 24, y - 6, 20, 12, 3); ctx.fill();
    }
  });
}
function zeichneAuswahl() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const modusInfo = modusInfoVon(gewaehlterModus);
  text('Wähle deinen Mech!', W / 2, 45, 38, '#ffd166');
  text(`Spielmodus: ${modusInfo.emoji} ${modusInfo.name}  ·  Karte: ${karte.emoji} ${karte.name}`, W / 2, 78, 16, '#c9c3ff', 'center', false);

  // Klassen-Knöpfe: Leicht, Medium, Heavy, Schwer
  for (const b of klassenKnoepfe()) {
    const an = b.k.id === gewaehlteKlasse, hover = imRechteck(maus, b);
    ctx.fillStyle = an ? '#ffd166' : hover ? '#3a4256' : 'rgba(30,34,46,0.92)';
    rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = an ? '#ffd166' : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
    text(`${b.k.emoji} ${b.k.name}`, b.x + b.w / 2, b.y + 18, 18, an ? '#1b1f3a' : '#fff', 'center', false);
    text(b.k.text, b.x + b.w / 2, b.y + 37, 11, an ? '#1b1f3a' : '#8a8fb0', 'center', false);
    if (meinMech.klasse === b.k.id) text('✓', b.x + b.w - 16, b.y + 18, 16, an ? '#1b1f3a' : meinMech.akzent, 'center', false);
  }

  for (const k of mechKarten()) {
    const t = umgebaut(k.t), hover = imRechteck(maus, k), meiner = t.id === meinMech.id;
    ctx.fillStyle = hover ? '#3a4256' : 'rgba(30,34,46,0.92)';
    rr(k.x, k.y, k.w, k.h, 14); ctx.fill();
    ctx.strokeStyle = hover ? '#ffd166' : (meiner ? t.akzent : '#4a5266'); ctx.lineWidth = hover || meiner ? 4 : 2; ctx.stroke();
    const mx = k.x + k.w / 2;
    // Der Mech dreht sich langsam
    zeichneMech2D('blau', mx - 8, k.y + 80, 1.1, zeit * 0.8, zeit * 0.8 + Math.sin(zeit * 2) * 0.3, hover ? zeit * 8 : 0, t);
    text(t.emoji, k.x + 22, k.y + 24, 22, '#fff', 'center', false);
    if (meiner) text('✓', k.x + k.w - 20, k.y + 24, 20, t.akzent, 'center', false);
    if (umbauten[t.id]) text('🔧 umgebaut', k.x + k.w - 16, k.y + 46, 11, '#ffd166', 'right', false);
    text(t.name, mx, k.y + 158, 22, t.akzent);
    umbrechen(t.text, k.x + 16, k.y + 184, k.w - 32, 16, 12, '#c9c3ff');
    slotPunkte(t, mx, k.y + 236);
    sterneMalen(mechSterne(t), t.akzent, mx, k.y + 262);
    // 🔧 Umbauen-Knopf
    const u = umbauKnopf(k), uh = imRechteck(maus, u);
    ctx.fillStyle = uh ? '#ffd166' : '#2f3647'; rr(u.x, u.y, u.w, u.h, 8); ctx.fill();
    text('🔧 Umbauen', u.x + u.w / 2, u.y + u.h / 2, 15, uh ? '#1b1f3a' : '#fff', 'center', false);
  }
  const zh = imRechteck(maus, ZURUECK_KNOPF);
  ctx.fillStyle = zh ? '#3a4256' : 'rgba(30,34,46,0.92)';
  rr(ZURUECK_KNOPF.x, ZURUECK_KNOPF.y, ZURUECK_KNOPF.w, ZURUECK_KNOPF.h, 10); ctx.fill();
  text('← Zurück', ZURUECK_KNOPF.x + ZURUECK_KNOPF.w / 2, ZURUECK_KNOPF.y + 20, 16, zh ? '#ffd166' : '#fff', 'center', false);
  text('Klick auf einen Mech zum Starten  ·  🔵 Laser  🟣 Kanone  🟢 Raketen', W / 2 + 80, 560, 15, '#8a8fb0', 'center', false);
}
function waehleMech(t) {
  meinMech = umgebaut(t);
  try { localStorage.setItem('kaempfer-mech', t.id); } catch (e) { /* egal */ }
  if (storyMission) starteMission(storyMission);   // 📖 Storymodus
  else neuesSpiel(gewaehlterModus);
}

// ===== 🔧 Die Werkstatt: Waffen in die Slots stecken =====
// Jeder Slot hat eine Farbe. Du kannst nur Waffen mit der gleichen Farbe hineinstecken!
let bauTyp = null, bauListe = [], bauAktiv = 0;   // Welcher Mech, welche Waffen, welcher Slot ist ausgewählt
function werkstattOeffnen(typ) {
  bauTyp = typ;
  bauListe = umgebaut(typ).slots.map(s => s.waffe);
  bauAktiv = 0;
  zustand = 'werkstatt';
}
const bauZeileY = i => 128 + i * 62;
const pfeilKnopf = (i, r) => ({ x: r < 0 ? 196 : 512, y: bauZeileY(i) - 22, w: 44, h: 44 });
const SPEICHERN_KNOPF = { x: W - 210, y: 540, w: 180, h: 40 };
const STANDARD_KNOPF = { x: W - 410, y: 540, w: 180, h: 40 };
function bauWechseln(i, richtung) {
  const art = bauTyp.slots[i].art;
  const passende = WAFFEN_LISTE.filter(w => w.art === art);   // Nur Waffen mit der richtigen Farbe!
  const j = Math.max(0, passende.findIndex(w => w.id === bauListe[i]));
  bauListe[i] = passende[(j + richtung + passende.length) % passende.length].id;
  bauAktiv = i;
  sound.piep();
}
function bauSpeichern() {
  const standard = bauTyp.slots.map(s => s.waffe);
  if (bauListe.every((w, i) => w === standard[i])) delete umbauten[bauTyp.id];   // Alles wie am Anfang
  else umbauten[bauTyp.id] = [...bauListe];
  umbautenSpeichern();
  meinMech = umgebaut(bauTyp);
  try { localStorage.setItem('kaempfer-mech', bauTyp.id); } catch (e) { /* egal */ }
  sound.los();
  gewaehlteKlasse = bauTyp.klasse;
  zustand = 'auswahl';
}
function knopfMalen(k, beschriftung, farbe = '#fff') {
  const hover = imRechteck(maus, k);
  ctx.fillStyle = hover ? '#3a4256' : 'rgba(30,34,46,0.92)';
  rr(k.x, k.y, k.w, k.h, 10); ctx.fill();
  ctx.strokeStyle = hover ? '#ffd166' : '#4a5266'; ctx.lineWidth = 2; ctx.stroke();
  text(beschriftung, k.x + k.w / 2, k.y + k.h / 2, 17, hover ? '#ffd166' : farbe, 'center', false);
}
function zeichneWerkstatt() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#14161c'); g.addColorStop(1, '#2b3140');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Ein Gitter wie in einer Werkstatt-Halle
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  text(`🔧 Werkstatt: ${bauTyp.emoji} ${bauTyp.name}`, W / 2, 38, 32, '#ffd166');
  text('Stecke Waffen in die Slots! Nur gleiche Farben passen:  🔵 Laser   🟣 Kanone   🟢 Raketen', W / 2, 74, 15, '#c9c3ff', 'center', false);

  // Links: die Slots
  bauTyp.slots.forEach((slot, i) => {
    const y = bauZeileY(i), a = SLOT_ARTEN[slot.art], w = WAFFEN[bauListe[i]], aktiv = i === bauAktiv;
    // Der Slot: farbiges Schild mit Art und Ort
    ctx.fillStyle = a.farbe; rr(30, y - 22, 156, 44, 10); ctx.fill();
    if (aktiv) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke(); }
    text(`${a.punkt} ${a.name}`, 108, y - 7, 15, '#fff', 'center', false);
    text(ORTE[slot.ort].name, 108, y + 11, 11, '#ffffffcc', 'center', false);
    knopfMalen(pfeilKnopf(i, -1), '◀');
    knopfMalen(pfeilKnopf(i, 1), '▶');
    ctx.fillStyle = aktiv ? '#2f3647' : 'rgba(30,34,46,0.92)'; rr(246, y - 22, 260, 44, 10); ctx.fill();
    ctx.strokeStyle = a.farbe; ctx.lineWidth = 2; ctx.stroke();
    text(w.name, 376, y - 6, 17, '#fff', 'center', false);
    const geaendert = w.id !== slot.waffe;
    text(geaendert ? '🔧 umgebaut' : 'Standard', 376, y + 12, 10, geaendert ? '#ffd166' : '#8a8fb0', 'center', false);
  });

  // Rechts: So sieht dein Mech aus
  const typ = { ...bauTyp, slots: bauTyp.slots.map((s, i) => ({ ...s, waffe: bauListe[i] })) };
  const px = 580, pw = 350;
  ctx.fillStyle = 'rgba(30,34,46,0.92)'; rr(px, 96, pw, 428, 14); ctx.fill();
  ctx.strokeStyle = bauTyp.akzent; ctx.lineWidth = 3; ctx.stroke();
  zeichneMech2D('blau', px + pw / 2 - 8, 175, 1.5, zeit * 0.6, zeit * 0.6 + Math.sin(zeit * 2) * 0.3, zeit * 6, typ);
  slotPunkte(typ, px + pw / 2, 262);
  sterneMalen(mechSterne(typ), bauTyp.akzent, px + pw / 2, 292, 22);
  // Infos zur Waffe im ausgewählten Slot
  const w = WAFFEN[bauListe[bauAktiv]], a = SLOT_ARTEN[w.art];
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(px + 14, 384, pw - 28, 128, 10); ctx.fill();
  ctx.fillStyle = a.farbe; rr(px + 14, 384, 6, 128, 3); ctx.fill();
  text(`${a.punkt} ${w.name}`, px + 32, 402, 17, a.hell, 'left', false);
  umbrechen(w.text, px + 32, 426, pw - 60, 16, 12, '#c9c3ff');
  const schuss = w.salve ? `${w.anzahl} × ${w.schaden}` : w.anzahl > 1 ? `${w.anzahl} × ${w.schaden}` : w.schrot ? `${w.schrot} × ${w.schaden}` : `${w.schaden}`;
  text(`💥 Schaden ${schuss}   ⏱️ lädt ${w.pause} s   🎯 Weite ${w.art === 'rakete' && !w.salve ? Math.round(RAKETE_WEITE / 10) : Math.round(w.weite / 10)} m`, px + 32, 492, 12, '#fff', 'left', false);

  // Unten: Knöpfe
  knopfMalen(ZURUECK_KNOPF, '← Zurück');
  knopfMalen(STANDARD_KNOPF, '↺ Standard', '#c9c3ff');
  knopfMalen(SPEICHERN_KNOPF, '💾 Speichern', '#4ade80');
}
function werkstattKlick() {
  for (let i = 0; i < bauTyp.slots.length; i++) {
    for (const r of [-1, 1]) if (imRechteck(maus, pfeilKnopf(i, r))) { bauWechseln(i, r); return; }
    const y = bauZeileY(i);
    if (maus.x > 30 && maus.x < 560 && maus.y > y - 22 && maus.y < y + 22) { bauAktiv = i; return; }   // Slot anklicken = Infos zeigen
  }
  if (imRechteck(maus, ZURUECK_KNOPF)) { zustand = 'auswahl'; return; }
  if (imRechteck(maus, STANDARD_KNOPF)) { bauListe = bauTyp.slots.map(s => s.waffe); sound.piep(); return; }
  if (imRechteck(maus, SPEICHERN_KNOPF)) bauSpeichern();
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
    rr(x, 170, 300, 50 + Math.max(...['blau', 'rot'].map(t => mechs.filter(o => o.team === t).length)) * 34, 12); ctx.fill();
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
  if (storyMission && storyMission.kampagne === 'rache' && !storyMission.prolog) {   // 💰 Wie viel Geld gibt es?
    const b = racheBelohnung(ende.sieger === spieler.team);
    text(`💰 +${geldText(b.summe)}`, W / 2, 440, 30, '#ffd166');
    text(`${ende.sieger === spieler.team ? 'Belohnung' : 'Trostgeld'} ${b.basis} + ${b.kills} Abschüsse × ${ABSCHUSS_BONUS}`, W / 2, 470, 14, '#c9c3ff', 'center', false);
  }
  if (zeit - ende.seit > 1) text(mp.aktiv ? (mp.rolle === 'host' ? 'Klicken: Zurück in die Lobby' : '⏳ Warte auf den Gastgeber ...') : storyMission ? (storyMission.kampagne === 'rache' ? 'Klicken: Weiter ▶' : ende.sieger === spieler.team ? 'Klicken: Weiter ▶  ·  Enter: Nochmal' : 'Klicken: Zur Sternenkarte  ·  Enter: Nochmal versuchen') : 'Klicken: Zurück zum Menü  ·  Enter: Nochmal', W / 2, 500, 20, '#c9c3ff', 'center', false);
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }
  if (zustand === 'auswahl') { zeichneAuswahl(); return; }
  if (zustand === 'story') { zeichneStory(); return; }
  if (zustand === 'kampagnen') { zeichneKampagnen(); return; }
  if (zustand === 'karriere') { zeichneKarriere(); return; }
  if (zustand === 'mpLobby') { zeichneMpLobby(); return; }
  if (zustand === 'dialog') { zeichneDialog(); return; }
  if (zustand === 'werkstatt') { zeichneWerkstatt(); return; }
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
  else if (zustand === 'spiel' && pause && k === 'enter') { if (mp.aktiv) mpBeenden(); zustand = 'titel'; pause = false; if (document.pointerLockElement) document.exitPointerLock(); }
  else if (zustand === 'spiel' && intro && !pause && (k === ' ' || k === 'enter')) introBeenden();   // Intro überspringen
  else if (zustand === 'ende' && k === 'enter' && zeit - ende.seit > 1) { if (mp.aktiv) { if (mp.rolle === 'host') mpZurLobby(); } else if (storyMission && storyMission.kampagne === 'rache') storyNachMission(); else if (storyMission) starteMission(storyMission); else neuesSpiel(modus); }
  else if (zustand === 'mpLobby' && k === 'escape' && !mp.aktiv) zustand = 'titel';
  else if (zustand === 'dialog' && (k === ' ' || k === 'enter')) dialogWeiter();
  else if (zustand === 'dialog' && k === 'escape') { const d = dialog.danach; dialog = null; d(); }   // Gespräch überspringen
  else if (zustand === 'story' && k === 'escape') zustand = 'kampagnen';
  else if (zustand === 'kampagnen' && k === 'escape') zustand = 'titel';
  else if (zustand === 'karriere' && k === 'escape') zustand = 'kampagnen';
  else if (zustand === 'auswahl' && k === 'escape') zustand = 'titel';
  else if (zustand === 'werkstatt' && k === 'escape') zustand = 'auswahl';
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
  if (zustand === 'spiel' && pause && imRechteck(punkt(e), MENUE_KNOPF)) { if (mp.aktiv) mpBeenden(); zustand = 'titel'; pause = false; if (document.pointerLockElement) document.exitPointerLock(); return; }
  if (zustand === 'spiel' && intro && !pause) { introBeenden(); if (!mausGefangen && e.pointerType !== 'touch') mausFangen(); return; }   // Intro überspringen
  if (e.pointerType === 'touch' && zustand === 'spiel') { touchRunter(e); return; }
  if (zustand === 'titel') {
    for (const k of modusKarten()) if (imRechteck(maus, k)) { normalesSpiel(); gewaehlterModus = k.m.id; zustand = 'auswahl'; return; }
    if (imRechteck(maus, STORY_KNOPF)) { normalesSpiel(); zustand = 'kampagnen'; return; }
    if (imRechteck(maus, ONLINE_KNOPF)) { normalesSpiel(); zustand = 'mpLobby'; return; }
    for (const b of kartenKnoepfe()) if (imRechteck(maus, b)) {
      karte = b.k;
      try { localStorage.setItem('kaempfer-karte', karte.id); } catch (e) { /* egal */ }
    }
    return;
  }
  if (zustand === 'auswahl') {
    for (const b of klassenKnoepfe()) if (imRechteck(maus, b)) { gewaehlteKlasse = b.k.id; return; }
    for (const k of mechKarten()) if (imRechteck(maus, k)) {
      if (imRechteck(maus, umbauKnopf(k))) werkstattOeffnen(k.t);   // 🔧 Umbauen
      else waehleMech(k.t);
      return;
    }
    if (imRechteck(maus, ZURUECK_KNOPF)) zustand = storyMission ? 'story' : 'titel';
    return;
  }
  if (zustand === 'werkstatt') { werkstattKlick(); return; }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) { if (mp.aktiv) { if (mp.rolle === 'host') mpZurLobby(); } else if (storyMission) storyNachMission(); else zustand = 'titel'; } return; }
  if (zustand === 'mpLobby') { mpLobbyKlick(); return; }
  if (zustand === 'story') { storyKlick(); return; }
  if (zustand === 'kampagnen') { kampagnenKlick(); return; }
  if (zustand === 'karriere') { karriereKlick(); return; }
  if (zustand === 'dialog') { dialogWeiter(); return; }
  if (pause) { pause = false; mausFangen(); return; }
  if (!mausGefangen) mausFangen();
  if (e.button === 0) maus.links = true;
  if (e.button === 2) maus.rechts = true;
});
addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') { touchBewegt(e); return; }
  if (zustand === 'spiel' && !pause && !intro && (mausGefangen || e.buttons)) {
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
  } else if ((f.art === 'blick' || f.art === 'feuer') && !intro) {
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
  const bereit = art => {   // Wie weit ist die am weitesten geladene Waffe dieser Gruppe?
    const ws = m.waffen.filter(s => (s.art === 'rakete') === (art === 'rakete') && slotGeht(m, s));
    return ws.length ? Math.max(...ws.map(s => 1 - Math.max(0, s.pause) / s.w.pause)) : 0;
  };
  knopf('feuer', '🔫', bereit('haupt'), SLOT_ARTEN.laser.farbe);
  knopf('rakete', '🚀', bereit('rakete'), SLOT_ARTEN.rakete.farbe);
  if (BOOST_AN) knopf('boost', '💨', Math.max(0, 1 - m.boostPause / m.typ.boostPause), '#6fe3ff');
  knopf('pause', '⏸️', 1, '#fff');
}

// ===== Spielschleife =====
function fehlerMelden(wo, e) {   // Zeigt den Fehler in der roten Box (siehe index.html)
  const stelle = ((e.stack || '').split('\n').find(z => z.includes('spiel.js')) || '').trim();
  if (window.zeigeFehler) window.zeigeFehler(`${wo}: ${e.message}  ${stelle}`);
}
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  zeit += dt;
  // Wenn irgendwo ein Fehler passiert, soll das Spiel nicht einfrieren, sondern einfach weiterlaufen.
  // Der Fehler steht dann in der Browser-Konsole (F12), damit man ihn finden kann.
  try { update(dt); } catch (e) { console.error('Fehler in update:', e); fehlerMelden('update', e); }
  try { zeichne(); } catch (e) { console.error('Fehler beim Zeichnen:', e); fehlerMelden('zeichnen', e); }
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
