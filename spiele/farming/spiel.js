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
// 🌽 Mais, Häcksler und Silagesilo
const MAIS_WACHS_ZEIT = 180;     // Mais braucht länger als Getreide
const MAIS_SAAT_PREIS = 0.8;     // Mais-Saat kostet so viel pro kg
const MAIS_ERTRAG = 300;         // So viel Häckselgut (kg) gibt ein reifes Mais-Stück
const FAHRSILO_MAX = 150000;     // So viel passt in ein Silagesilo
const FS_BREIT = 7.4;            // Silagesilo: halbe Breite innen (Meter) – 7,4 = fast 15 m breit
const FS_LANG = 14;              // Silagesilo: halbe Länge (Meter) – 14 = 28 m lang
const FS_WAND = 3.4;             // Silagesilo: so hoch sind die Wände
const FS_RAMPE = 4;              // So lang ist die Schräge vorne und hinten am Haufen (da fährst du hoch)
const WALZ_ZEIT = 20;            // So viele Sekunden musst du über 40 Tonnen Häckselgut fahren, bis es fest ist
const GAER_ZEIT = 180;           // So lange gärt die Silage unter der Folie
const FOLIE_PREIS = 500;         // Die Silofolie kostet so viel
const SILAGE_PREIS = 0.9;        // Silage bringt so viel pro kg beim Landhandel
// Was in einem Tank oder Anhänger sein kann (immer nur eine Sorte auf einmal!)
const GUETER = {
  korn: { name: 'Korn', emoji: '🌾', farbe: 0xe3c46a },
  haeckselgut: { name: 'Häckselgut', emoji: '🌽', farbe: 0x7fae3a },
  silage: { name: 'Silage', emoji: '🟫', farbe: 0x9a8a3a },
  stroh: { name: 'Stroh', emoji: '🟨', farbe: 0xe8d27a },
};
// 🌾 Stroh: Nach der Weizen-Ernte bleibt Stroh liegen. Die Ballenpresse (Taste 4) macht daraus runde Ballen.
const ZELLEN_PRO_BALLEN = 1;     // So viele Feld-Stücke Stroh ergeben einen Ballen (1 = jedes Stück Strohspur gibt einen Ballen)
const BALLEN_KG = 250;           // So schwer ist ein Strohballen
const STROH_PREIS = 0.8;         // Stroh bringt so viel pro kg beim Landhandel (ein Ballen = 200 €)
const EINSTREU_PRO_BALLEN = 120; // Ein Ballen Einstreu im Gehege hält so viele Sekunden: Die Tiere geben dann 30 % mehr!

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
  presse: { name: 'Ballenpresse', emoji: '🟨', taste: '4', breite: 2.4, hinten: true, arbeitsTempo: 5 },
  maisgebiss: { name: 'Maisgebiss', emoji: '🌽', taste: '', breite: 4.5, hinten: false, arbeitsTempo: 4.5 },   // Nur am Häcksler
};
// Was du im Baumodus bauen kannst (Taste 1, 2, 3)
const GEBAEUDE_ARTEN = {
  schuppen: { name: 'Schuppen', emoji: '🏠', preis: 10000, r: 5.5 },
  silo: { name: 'Silo', emoji: '🛢️', preis: 25000, r: 3, silo: { max: 50000, gut: 'korn', hoch: 13.5 } },
  baum: { name: 'Baum', emoji: '🌳', preis: 500, r: 1.5 },
  gewaechshaus: { name: 'Gewächshaus', emoji: '🪴', preis: 15000, r: 5.6 },
  kuhweide: { name: 'Kuhweide', emoji: '🐄', preis: 8000, r: 10, tier: 'kuh' },
  schafweide: { name: 'Schafweide', emoji: '🐑', preis: 6000, r: 8, tier: 'schaf' },
  huehnerhof: { name: 'Hühnerhof', emoji: '🐔', preis: 4000, r: 6, tier: 'huhn' },
  apfelbaum: { name: 'Apfelbaum', emoji: '🍎', preis: 2000, r: 1.6 },
  birnbaum: { name: 'Birnbaum', emoji: '🍐', preis: 2500, r: 1.6 },
  kirschbaum: { name: 'Kirschbaum', emoji: '🍒', preis: 3000, r: 1.6 },
  teich: { name: 'Fischteich', emoji: '🎣', preis: 5000, r: 6 },   // (keine Zahl mehr frei: im Baumodus mit , und . auswählen oder Knopf)
  schweinestall: { name: 'Schweinestall', emoji: '🐖', preis: 7000, r: 8, tier: 'schwein' },
  buchenwald: { name: 'Buchenwald', emoji: '🌳', preis: 3000, r: 6, holz: 'buche' },
  eichenwald: { name: 'Eichenwald', emoji: '🌳', preis: 4000, r: 6, holz: 'eiche' },
  erlenwald: { name: 'Erlenwald', emoji: '🌲', preis: 3000, r: 6, holz: 'erle' },
  ahornwald: { name: 'Ahornwald', emoji: '🍁', preis: 4000, r: 6, holz: 'ahorn' },
  werkbank: { name: 'Werkbank', emoji: '🛠️', preis: 2500, r: 2.2 },
  fahrsilo: { name: 'Silagesilo', emoji: '🟩', preis: 20000, r: 15 },
  bienenstock: { name: 'Bienenstock', emoji: '🐝', preis: 1500, r: 1.3 },
  // 🛢️ Verschiedene Silos: max = so viel passt rein · gut = was reinkommt · hoch = wo das Schild hängt
  kleinsilo: { name: 'Kleines Silo', emoji: '🥫', preis: 12000, r: 2, silo: { max: 20000, gut: 'korn', hoch: 9 } },
  grosssilo: { name: 'Großsilo', emoji: '🏭', preis: 60000, r: 5, silo: { max: 150000, gut: 'korn', hoch: 19 } },
  hochsilo: { name: 'Silage-Hochsilo', emoji: '🗼', preis: 35000, r: 3.3, silo: { max: 40000, gut: 'silage', hoch: 20 } },
  garage3: { name: '3er-Garage', emoji: '🅿️', preis: 15000, r: 12 },
  futtersilo: { name: 'Futtersilo', emoji: '🐄', preis: 8000, r: 1.8, silo: { max: 15000, gut: 'futter', hoch: 9 } },
  hundehuette: { name: 'Hundehütte', emoji: '🐕', preis: 300, r: 1.2, haustier: 'hund' },
  katzenkorb: { name: 'Katzenkorb', emoji: '🐈', preis: 200, r: 0.8, haustier: 'katze' },
};
// 🐝 Bienen: So viel Honig (kg) macht ein Bienenstock pro Minute – doppelt so viel mit Obstbäumen oder Blumen in der Nähe!
const HONIG_PRO_MIN = 0.5;
const HONIG_MAX = 15;            // So viel Honig passt in einen Bienenstock
const BIENEN_BLUETEN_WEITE = 30; // So weit fliegen die Bienen zu den Obstbäumen
const GARAGE = { breite: 21, tief: 12, hoch: 5 };   // 3er-Garage: drei Plätze, je 7 m breit (da passt sogar der Mähdrescher rein!)
const HOCHSILO_GAER = 90;        // So ungefähr viele Sekunden gärt das Häckselgut im Hochsilo (ganz von allein, ohne Folie!)
const FUTTERSILO_WEITE = 30;     // Bis zu so weit weg füllt das Futtersilo die Futtertröge automatisch auf
// Gemüse fürs Gewächshaus: kosten = Saat, zeit = Sekunden bis reif, menge = so viel erntest du, preis = so viel bringt eins im Dorfladen
// (blatt/frucht = Farben, n = Früchte pro Pflanze, fy = wie hoch die Früchte hängen, fg = Fruchtgröße, hoehe = Pflanzenhöhe)
const GEMUESE = {
  salat: { name: 'Salat', emoji: '🥬', kosten: 200, zeit: 60, menge: 100, einheit: 'Köpfe', preis: 3, blatt: 0x6fbf3a, frucht: 0xb5e86a, n: 1, fy: 0.12, fg: 0.26, hoehe: 0.35 },
  karotte: { name: 'Karotten', emoji: '🥕', kosten: 150, zeit: 75, menge: 200, einheit: 'kg', preis: 2, blatt: 0x3f9a2a, frucht: 0xf07f13, n: 3, fy: 0.02, fg: 0.07, hoehe: 0.6 },
  gurke: { name: 'Gurken', emoji: '🥒', kosten: 250, zeit: 90, menge: 120, einheit: 'Stück', preis: 4, blatt: 0x2f7d2a, frucht: 0x3f8f2a, n: 4, fy: 0.45, fg: 0.09, hoehe: 1.3 },
  tomate: { name: 'Tomaten', emoji: '🍅', kosten: 300, zeit: 120, menge: 150, einheit: 'kg', preis: 5, blatt: 0x2f7d2a, frucht: 0xe0301e, n: 6, fy: 0.55, fg: 0.09, hoehe: 1.5 },
  erdbeere: { name: 'Erdbeeren', emoji: '🍓', kosten: 500, zeit: 150, menge: 100, einheit: 'kg', preis: 12, blatt: 0x3f9a2a, frucht: 0xe8202e, n: 5, fy: 0.1, fg: 0.06, hoehe: 0.35 },
  kuerbis: { name: 'Kürbisse', emoji: '🎃', kosten: 400, zeit: 180, menge: 40, einheit: 'Stück', preis: 30, blatt: 0x4a8f2a, frucht: 0xf08a1e, n: 1, fy: 0.22, fg: 0.3, hoehe: 0.5 },
};
// Nutztiere: brauchen ein Gehege! proMin = so viel geben sie pro Minute, frisst = so viel Futter (kg) pro Minute
const TIERE = {
  kuh: { name: 'Kühe', einzeln: 'Kuh', emoji: '🐄', preis: 1500, max: 6, produkt: 'milch', proMin: 30, frisst: 15, tempo: 0.7, baby: 'Kälbchen', babyEmoji: '🐮', zucht: 240, gross: 240 },
  schaf: { name: 'Schafe', einzeln: 'Schaf', emoji: '🐑', preis: 600, max: 8, produkt: 'wolle', proMin: 2, frisst: 6, tempo: 0.9, baby: 'Lämmchen', babyEmoji: '🐑', zucht: 150, gross: 180 },
  huhn: { name: 'Hühner', einzeln: 'Huhn', emoji: '🐔', preis: 50, max: 12, produkt: 'eier', proMin: 3, frisst: 1, tempo: 1.3, baby: 'Küken', babyEmoji: '🐤', zucht: 90, gross: 120 },
  schwein: { name: 'Schweine', einzeln: 'Schwein', emoji: '🐖', preis: 800, max: 8, produkt: 'trueffel', proMin: 0.5, frisst: 8, tempo: 0.8, baby: 'Ferkel', babyEmoji: '🐷', zucht: 150, gross: 180 },   // Schweine finden Trüffel!
};
// 🍼 Nachwuchs: zucht = so viele Sekunden, bis 2 erwachsene Tiere ein Baby bekommen (mit Futter!) · gross = so lange wächst das Baby
const ZUCHT_WINTER = 0.5;        // Im Winter gibt es nur halb so schnell Babys
// Zum Metzger bringen: So viel Fleisch (kg) gibt jedes Tier. preis = so viel ist 1 kg wert (roh kann man es nicht verkaufen – erst verarbeiten!)
const FLEISCH = {
  kuh: { k: 'rind', kurz: 'Rind', name: 'Rindfleisch', emoji: '🥩', kg: 60, preis: 8, grill: 'Steak vom Grill', poekel: 'Corned Beef' },
  schwein: { k: 'schwein', kurz: 'Schwein', name: 'Schweinefleisch', emoji: '🥓', kg: 40, preis: 5, grill: 'Kotelett vom Grill', poekel: 'Kasseler' },
  schaf: { k: 'lamm', kurz: 'Lamm', name: 'Lammfleisch', emoji: '🍖', kg: 20, preis: 9, grill: 'Lammspieß', poekel: 'Pökel-Lamm' },
  huhn: { k: 'huhn', kurz: 'Hähnchen', name: 'Hähnchenfleisch', emoji: '🍗', kg: 2, preis: 4, grill: 'Grillhähnchen', poekel: 'Pökel-Hähnchen' },
};
// Holzsorten zum Räuchern und Grillen (Fichte nimmt man nicht: Das Harz macht das Essen bitter!)
// stamm/krone = Farben der Bäume, form = so sieht die Krone aus
const HOLZARTEN = {
  buche: { name: 'Buchenholz', kurz: 'Buche', stamm: 0x9a9a8a, krone: 0x4f9a3a, form: 'rund' },     // Der Klassiker zum Räuchern
  eiche: { name: 'Eichenholz', kurz: 'Eiche', stamm: 0x4a3420, krone: 0x3f7a2a, form: 'breit' },    // Kräftiger Rauch
  erle: { name: 'Erlenholz', kurz: 'Erle', stamm: 0x3a3a35, krone: 0x2f6a2a, form: 'schmal' },      // Perfekt für Fisch
  ahorn: { name: 'Ahornholz', kurz: 'Ahorn', stamm: 0x7a6a5a, krone: 0xd8641e, form: 'rund' },      // Mild und süßlich
};
const WALD_BAEUME_PLOT = 5;      // So viele Bäume stehen in einem eigenen Wald
const WALD_NACHWACHSEN = 120;    // So viele Sekunden braucht ein Baum zum Nachwachsen
const WALD_HACK_ZEIT = 2;        // So lange musst du X halten, um einen Baum zu fällen
const WALD_SCHEITE = 3;          // So viele Holzscheite gibt ein Baum
// Würste: Welche Fleischsorten + welche Holzsorten ergeben welche Wurst? (fisch = irgendein Fisch). preis = pro Wurst
const WURST = [
  { id: 'bratwurst', name: 'Bratwurst', fleisch: ['schwein'], holz: ['buche'], preis: 12 },
  { id: 'mettwurst', name: 'Mettwurst', fleisch: ['schwein'], holz: ['erle'], preis: 14 },
  { id: 'schinkenwurst', name: 'Schinkenwurst', fleisch: ['schwein'], holz: ['eiche'], preis: 15 },
  { id: 'ahornwurst', name: 'Süße Ahorn-Würstchen', fleisch: ['schwein'], holz: ['ahorn'], preis: 16 },
  { id: 'salami', name: 'Salami', fleisch: ['schwein'], holz: ['buche', 'eiche'], preis: 22 },
  { id: 'wiener', name: 'Wiener Würstchen', fleisch: ['rind', 'schwein'], holz: ['buche'], preis: 18 },
  { id: 'landjaeger', name: 'Landjäger', fleisch: ['rind', 'schwein'], holz: ['eiche'], preis: 24 },
  { id: 'frankfurter', name: 'Frankfurter Würstchen', fleisch: ['rind', 'schwein'], holz: ['buche', 'erle'], preis: 26 },
  { id: 'rindswurst', name: 'Rindswurst', fleisch: ['rind'], holz: ['buche'], preis: 18 },
  { id: 'cabanossi', name: 'Cabanossi', fleisch: ['rind'], holz: ['eiche'], preis: 20 },
  { id: 'lammwurst', name: 'Lammwurst', fleisch: ['lamm'], holz: ['buche'], preis: 18 },
  { id: 'merguez', name: 'Merguez', fleisch: ['lamm'], holz: ['eiche'], preis: 22 },
  { id: 'gefluegelwurst', name: 'Geflügelwurst', fleisch: ['huhn'], holz: ['buche'], preis: 12 },
  { id: 'ahornhaehnchen', name: 'Ahorn-Hähnchenwurst', fleisch: ['huhn'], holz: ['ahorn'], preis: 15 },
  { id: 'fischwurst', name: 'Räucher-Fischwurst', fleisch: ['fisch'], holz: ['erle'], preis: 20 },
  { id: 'koenigswurst', name: 'Königswurst', fleisch: ['huhn', 'lamm', 'rind', 'schwein'], holz: ['ahorn', 'buche', 'eiche', 'erle'], preis: 150, emoji: '👑' },   // Geheim-Rezept!
  { id: 'hauswurst', name: 'Hauswurst', fleisch: null, holz: null, preis: 10 },   // Alles andere wird Hauswurst
];
// Alles, was du im Dorfladen verkaufen kannst (Preis pro Stück/kg/Liter)
const PRODUKTE = {
  milch: { name: 'Milch', emoji: '🥛', einheit: 'L', preis: 2 },
  wolle: { name: 'Wolle', emoji: '🧶', einheit: 'kg', preis: 15 },
  eier: { name: 'Eier', emoji: '🥚', einheit: 'Stück', preis: 2 },
  trueffel: { name: 'Trüffel', emoji: '🍄', einheit: 'Stück', preis: 60 },
  honig: { name: 'Honig', emoji: '🍯', einheit: 'kg', preis: 10 },
};
for (const [k, G] of Object.entries(GEMUESE)) PRODUKTE[k] = { name: G.name, emoji: G.emoji, einheit: G.einheit, preis: G.preis };
// Obstbäume: zeit = Sekunden bis die Früchte reif sind, menge = so viel pflückst du, preis = so viel bringt 1 kg im Dorfladen
// (bluete = Farbe der Blüten, farbe = Farbe der reifen Früchte, groesse = Fruchtgröße, laenglich = Birnen sind länglich)
const OBST = {
  apfelbaum: { frucht: 'apfel', name: 'Äpfel', emoji: '🍎', zeit: 120, menge: 100, preis: 3, bluete: 0xf6c6d6, farbe: 0xd8231e, groesse: 0.14, laenglich: 1, krone: 0x2f7d2a },
  birnbaum: { frucht: 'birne', name: 'Birnen', emoji: '🍐', zeit: 150, menge: 80, preis: 4, bluete: 0xffffff, farbe: 0xd2c63a, groesse: 0.13, laenglich: 1.4, krone: 0x3a8a2f },
  kirschbaum: { frucht: 'kirsche', name: 'Kirschen', emoji: '🍒', zeit: 90, menge: 50, preis: 8, bluete: 0xfff0f5, farbe: 0x8e0f1e, groesse: 0.07, laenglich: 1, krone: 0x2a6e2a },
};
for (const O of Object.values(OBST)) PRODUKTE[O.frucht] = { name: O.name, emoji: O.emoji, einheit: 'kg', preis: O.preis };
// Tag und Nacht
const TAG_DAUER = 720;           // So viele Sekunden dauert ein ganzer Tag (24 Stunden) im Spiel = 12 Minuten
const AUFSTEH_ZEIT = 7;          // Um diese Uhrzeit wachst du nach dem Schlafen auf
// 📅 Monate: Nach so vielen Tagen kommt der nächste Monat. wachsen = so schnell wachsen die Felder (im Winter langsam!)
const TAGE_PRO_MONAT = 2;
const MONATE = [
  { name: 'Januar', emoji: '❄️', zeit: 'winter' }, { name: 'Februar', emoji: '❄️', zeit: 'winter' }, { name: 'März', emoji: '🌱', zeit: 'fruehling' },
  { name: 'April', emoji: '🌷', zeit: 'fruehling' }, { name: 'Mai', emoji: '🌸', zeit: 'fruehling' }, { name: 'Juni', emoji: '☀️', zeit: 'sommer' },
  { name: 'Juli', emoji: '☀️', zeit: 'sommer' }, { name: 'August', emoji: '🌻', zeit: 'sommer' }, { name: 'September', emoji: '🍂', zeit: 'herbst' },
  { name: 'Oktober', emoji: '🍁', zeit: 'herbst' }, { name: 'November', emoji: '🌫️', zeit: 'herbst' }, { name: 'Dezember', emoji: '⛄', zeit: 'winter' },
];
const JAHRESZEITEN = {
  fruehling: { name: 'Frühling', wachsen: 1.2, honig: 1.5, gras: 0xffffff },
  sommer: { name: 'Sommer', wachsen: 1, honig: 1, gras: 0xf4f0c8 },
  herbst: { name: 'Herbst', wachsen: 0.8, honig: 0.5, gras: 0xe8c890 },
  winter: { name: 'Winter', wachsen: 0.4, honig: 0, gras: 0xffffff },
};
// Fischteich: Welche Fische gibt es? chance = wie oft (größer = öfter), schwer = wie wild der Fisch zappelt
// kg = so leicht/schwer kann er sein (von, bis) · cm = so kurz/lang kann er sein (von, bis)
const FISCHE = {
  rotauge: { name: 'Rotauge', emoji: '🐟', preis: 8, chance: 40, schwer: 0.6, kg: [0.1, 0.8], cm: [15, 35] },
  barsch: { name: 'Barsch', emoji: '🐡', preis: 12, chance: 34, schwer: 0.8, kg: [0.2, 2], cm: [15, 45] },
  schleie: { name: 'Schleie', emoji: '🐟', preis: 16, chance: 28, schwer: 0.9, kg: [0.5, 3], cm: [25, 55] },
  karpfen: { name: 'Karpfen', emoji: '🐟', preis: 20, chance: 30, schwer: 1.0, kg: [1, 20], cm: [30, 90] },
  forelle: { name: 'Forelle', emoji: '🐠', preis: 30, chance: 18, schwer: 1.3, kg: [0.3, 4], cm: [25, 65] },
  aal: { name: 'Aal', emoji: '🐍', preis: 45, chance: 12, schwer: 1.5, kg: [0.3, 4], cm: [40, 120] },
  zander: { name: 'Zander', emoji: '🐟', preis: 50, chance: 10, schwer: 1.6, kg: [1, 12], cm: [40, 100] },
  hecht: { name: 'Hecht', emoji: '🦈', preis: 60, chance: 9, schwer: 1.8, kg: [1, 18], cm: [50, 130] },
  wels: { name: 'Riesen-Wels', emoji: '🐋', preis: 120, chance: 5, schwer: 2.1, kg: [5, 80], cm: [80, 250] },
  stoer: { name: 'Stör', emoji: '🐊', preis: 160, chance: 4, schwer: 2.2, kg: [5, 60], cm: [80, 200] },
  goldfisch: { name: 'Goldener Fisch', emoji: '✨', preis: 250, chance: 3, schwer: 2.4, kg: [0.5, 5], cm: [20, 50] },
};
for (const [k, F] of Object.entries(FISCHE)) PRODUKTE['fisch_' + k] = { name: F.name, emoji: F.emoji, einheit: 'Stück', preis: F.preis };
// Zutaten für die Werkbank (roh = kann man im Dorfladen nicht verkaufen) und alles, was man daraus machen kann
for (const F of Object.values(FLEISCH)) {
  PRODUKTE['fleisch_' + F.k] = { name: F.name, emoji: F.emoji, einheit: 'kg', preis: F.preis, roh: true };
  PRODUKTE['grill_' + F.k] = { name: F.grill, emoji: '🍢', einheit: 'Stück', preis: F.preis * 3 };
  PRODUKTE['poekel_' + F.k] = { name: F.poekel, emoji: '🥫', einheit: 'Stück', preis: Math.round(F.preis * 2.5) };
}
for (const [k, F] of Object.entries(FISCHE)) {
  PRODUKTE['grill_fisch_' + k] = { name: F.name + ' vom Grill', emoji: '🍢', einheit: 'Stück', preis: F.preis * 2 };
  PRODUKTE['poekel_fisch_' + k] = { name: 'Gepökelt: ' + F.name, emoji: '🥫', einheit: 'Stück', preis: Math.round(F.preis * 1.8) };
}
for (const [k, H] of Object.entries(HOLZARTEN)) PRODUKTE['holz_' + k] = { name: H.name, emoji: '🪵', einheit: 'Scheite', preis: 0, roh: true };
for (const W of WURST) PRODUKTE['wurst_' + W.id] = { name: W.name, emoji: W.emoji || '🌭', einheit: 'Stück', preis: W.preis };
const TEICH_FISCHE_MAX = 8;
// So schwer ist das Angel-Minispiel: Ganz schnell E drücken! (Zahlen ändern = leichter/schwerer)
const ANGEL_DRUECKEN = 0.06;     // So viel füllt sich der Balken bei jedem E-Druck
const ANGEL_ZIEHEN = 0.12;       // So stark zieht jeder Fisch den Balken wieder runter (pro Sekunde)
const ANGEL_ZIEHEN_SCHWER = 0.12; // ... und so viel stärker ziehen schwere Fische (mal "schwer")
const ANGEL_START = 0.35;        // So voll ist der Balken am Anfang
const ANGEL_GRUEN = 0.66;        // Ab hier ist der Balken im grünen Bereich (0.66 = das rechte Drittel)
const ANGEL_ZEIT = 3;            // So viele Sekunden musst du im grünen Bereich sein, dann hast du den Fisch
// Salzmine: Salzsteine machen die Tiere glücklich – sie geben dann doppelt so viel!
const SALZMINE = { x: 122, z: 12, eingangX: 109.5, eingangZ: 12 };
const SALZ_MAX = 10;             // So viele Salzsteine kannst du tragen
const SALZ_ZEIT = 1.5;           // So viele Sekunden brauchst du für einen Salzstein
const SALZ_BOOST = 600;          // So viele Sekunden wirkt ein Salzstein (10 Minuten)
// Dein eigenes Haus (neben dem Hof, die Tür zeigt zur Straße)
const HAUS = { x1: -19, x2: -9, z1: 24, z2: 32, hoehe: 3.2, tuerZ: 28, tuerBreite: 2.4, tuerHoehe: 2.4, bett: { x: -17.4, z: 25.3 } };
const FUTTER_MAX = 5000;         // So viel Futter (kg) passt in einen Futtertrog
const FUTTER_PREIS = 0.5;        // Futter kaufen kostet so viel pro kg (Korn vom eigenen Feld ist gratis!)
const LADEN = { x: 60, z: 12, r: 8 };   // Der Landhandel: Hier verkaufst du Korn und kaufst Saat
// Der Wald mit der Motorsäge 🌲🪚
const WALD = { x: 88, z: 60, r: 19 };   // Mitte und Größe vom Wald
const WALD_BAEUME = 40;          // So viele Fichten stehen im Wald
const SAEGEWERK = { x: 58, z: 53, platzX: 58, platzZ: 42, r: 6 };   // Hier verkaufst du das Holz
const SAEGE_ZEIT = 8;            // So viele Sekunden musst du sägen, bis ein Baum umfällt
const SCHNITT_HOEHE = 0.9;       // In dieser Höhe (Meter) sägst du den Stamm durch
const HOLZ_PRO_BAUM = 3;         // So viele Holzstämme gibt ein Baum
const HOLZ_TRAGEN_MAX = 4;       // So viele Stämme kannst du auf einmal tragen
const HOLZ_PREIS = 1000;         // So viel bringt ein Stamm beim Sägewerk (gesägtes Holz ist wertvoll!)
const HARVESTER_ZEIT = 2;        // So viele Sekunden braucht der Harvester für einen Baum
const SPRIT_PREIS = 0.1;         // Sprit für die Motorsäge kostet so viel pro Prozent (voll = 10 €)
const NACHWACHS_ZEIT = 180;      // Nach so vielen Sekunden wächst aus dem Baumstumpf ein neuer Baum
const BAUM_WACHS_DAUER = 25;     // ... und so lange braucht er, bis er groß ist
// Das Dorf "Sonnenfeld": [x, z, Tür nach Norden? (0 = Süden, 1 = Norden), Wandfarbe, Fachwerk?, Schild]
const DORF_NAME = 'Sonnenfeld';
const DORF_HAEUSER = [
  [-44, 62, 0, '#f3e9d2', 1], [-32, 62, 0, '#f6d7b0', 0, '🥨 Bäckerei'], [-20, 62, 0, '#e8eef2', 1], [12, 62, 0, '#f2c9b8', 0], [24, 62, 0, '#fff4c4', 1], [36, 62, 0, '#f3e9d2', 0],
  [-44, 84, 1, '#f6d7b0', 0], [-32, 84, 1, '#f3e9d2', 1, '🍺 Gasthaus'], [-20, 84, 1, '#fff4c4', 0], [8, 84, 1, '#e8eef2', 1], [20, 84, 1, '#f2c9b8', 0, '🛒 Dorfladen'], [32, 84, 1, '#f3e9d2', 1],
];

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

const himmelLicht = new THREE.HemisphereLight(0xd8ecff, 0x4a6b35, 1.4);
scene.add(himmelLicht);
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
  if (x > -60 && x < 50 && z > 50 && z < 115) continue;             // Da ist das Dorf
  if (Math.hypot(x - SALZMINE.x, z - SALZMINE.z) < 20) continue;    // Da ist die Salzmine
  baumOrte.push([x, z]);
}
for (const [x, z] of [[8, 30], [12, 38], [-10, 18], [40, 40], [-15, 5], [75, 0], [80, 35], [-80, 0]]) baumOrte.push([x, z]);
for (const [x, z, r] of DORF_HAEUSER) baumOrte.push([x + 4.5, z + (r ? 9 : -9)]);   // Ein Baum im Garten hinter jedem Haus
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
const WALDWEGE = [[68.5, 12, 13, 5], [75, 26, 5, 33], [66.5, 42, 22, 5], [92, 12, 34, 5]];   // (der letzte führt zur Salzmine)
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

// ===== Das Dorf (Häuser, Kirche, Brunnen, Laternen und Dorfbewohner) =====
// Wege: vom Hof nach Süden ins Dorf, die Dorfstraße und der Dorfplatz  [x, z, Breite, Tiefe]
const DORFWEGE = [[0, 45, 5, 46], [-6, 72, 92, 6], [-8, 80, 14, 10]];
for (const [x, z, b, t] of DORFWEGE) weg(x, z, b, t);
const aufDorfweg = (x, z, rand = 0) => DORFWEGE.some(([wx, wz, b, t]) => Math.abs(x - wx) < b / 2 + rand && Math.abs(z - wz) < t / 2 + rand);
const fachwerkTex = (() => {   // Weiße Wand mit dunklen Holzbalken
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), B = 14;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#4a2e1a';
  for (const [x, y, w, h] of [[0, 0, 256, B], [0, 256 - B, 256, B], [0, 0, B, 256], [256 - B, 0, B, 256], [0, 121, 256, B], [80, 0, B, 256], [162, 0, B, 256]]) g.fillRect(x, y, w, h);
  g.strokeStyle = '#4a2e1a'; g.lineWidth = B;
  for (const [x1, y1, x2, y2] of [[B, 250, 84, 130], [250, 250, 170, 130]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const fensterMat = new THREE.MeshStandardMaterial({ roughness: 0.4, map: (() => {   // Fenster mit Rahmen, Kreuz und Vorhängen
  const c = document.createElement('canvas'); c.width = 64; c.height = 80;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 80);
  const v = g.createLinearGradient(0, 0, 64, 80); v.addColorStop(0, '#9cc8e8'); v.addColorStop(1, '#2d4f6e');
  g.fillStyle = v; g.fillRect(6, 6, 52, 68);
  g.fillStyle = '#f2e3c6'; g.fillRect(6, 6, 10, 68); g.fillRect(48, 6, 10, 68);   // Vorhänge
  g.fillStyle = '#ffffff'; g.fillRect(29, 6, 6, 68); g.fillRect(6, 34, 52, 5);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})() });
const dachMats = [mat(0x9c3b28), mat(0x6e3a2a), mat(0x4a4a52), mat(0xb5532e)];
function baueHaus([x, z, nord, farbe, fachwerk, name], nr) {
  const W = 7, D = 6, H = 4.6, DH = 3.2;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = nord ? Math.PI : 0; scene.add(g);   // Vorne (+z) ist die Tür
  const wandMat = new THREE.MeshStandardMaterial({ color: farbe, map: fachwerk ? fachwerkTex : null, roughness: 0.95 });
  kasten(g, 0, H / 2, 0, W, H, D, wandMat);
  kasten(g, 0, 0.2, 0, W + 0.2, 0.4, D + 0.2, 0x8a8a8a);                       // Sockel aus Stein
  const form = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.5, 0), new THREE.Vector2(W / 2 + 0.5, 0), new THREE.Vector2(0, DH)]);
  const dachGeo = new THREE.ExtrudeGeometry(form, { depth: D + 0.8, bevelEnabled: false }); dachGeo.translate(0, 0, -(D + 0.8) / 2);
  const dach = new THREE.Mesh(dachGeo, [mat(farbe), dachMats[nr % dachMats.length]]);   // Giebel in Wandfarbe, Dach in Ziegelfarbe
  dach.position.y = H; dach.castShadow = dach.receiveShadow = true; g.add(dach);
  kasten(g, W / 4, H + DH * 0.6, -D / 4, 0.6, 2.2, 0.6, 0x8b4a3a);              // Schornstein
  kasten(g, 0, 1.15, D / 2 + 0.04, 1.2, 2.3, 0.1, 0x6b3a1e);                   // Haustür
  kasten(g, 0.4, 1.15, D / 2 + 0.1, 0.08, 0.08, 0.06, 0xd4af37, false);         // Türklinke
  kasten(g, 0, 0.1, D / 2 + 0.5, 1.8, 0.2, 0.8, 0x9a9a9a);                     // Treppenstufe
  // Alle Fenster zu einem Stück zusammengeklebt (schneller!)
  const fe = [];
  const fenster = (fx, fy, fz, ry) => fe.push(new THREE.PlaneGeometry(1.0, 1.25).rotateY(ry).translate(fx, fy, fz));
  for (const fx of [-2.2, 2.2]) for (const fy of [1.8, 3.6]) fenster(fx, fy, D / 2 + 0.02, 0);
  fenster(0, H + 1.0, D / 2 + 0.42, 0);                                         // Giebelfenster
  for (const s of [-1, 1]) for (const fz of [-1.5, 1.5]) for (const fy of [1.8, 3.6]) fenster(s * (W / 2 + 0.02), fy, fz, s * Math.PI / 2);
  for (const fx of [-2, 2]) fenster(fx, 1.8, -D / 2 - 0.02, Math.PI);
  const fm = new THREE.Mesh(mergeGeometries(fe), fensterMat); g.add(fm);
  // Blumenkasten unter den unteren Fenstern vorne
  for (const fx of [-2.2, 2.2]) {
    kasten(g, fx, 1.1, D / 2 + 0.15, 1.1, 0.2, 0.25, 0x7a4a2a, false);
    kasten(g, fx, 1.27, D / 2 + 0.15, 1.0, 0.15, 0.2, nr % 2 ? 0xe64a5a : 0xffc93c, false);
  }
  hindernisse.push({ x, z, hb: W / 2 + 0.2, ht: D / 2 + 0.2 });
  if (name) { const sch = schild(name, '#ffd166', 6); sch.position.set(x, H + DH + 1.3, z); scene.add(sch); }
}
DORF_HAEUSER.forEach(baueHaus);
// Die Kirche mit Turm, Uhr und Kreuz
const KIRCHE = { x: -8, z: 88 };
{
  const K = KIRCHE, weiss = mat(0xf4f1ea);
  kasten(scene, K.x, 3.5, K.z + 8, 8, 7, 12, weiss);                           // Kirchenschiff
  const form = new THREE.Shape([new THREE.Vector2(-4.6, 0), new THREE.Vector2(4.6, 0), new THREE.Vector2(0, 4.5)]);
  const dachGeo = new THREE.ExtrudeGeometry(form, { depth: 12.6, bevelEnabled: false }); dachGeo.translate(0, 0, -6.3);
  const dach = new THREE.Mesh(dachGeo, [weiss, mat(0x5a3b33)]); dach.position.set(K.x, 7, K.z + 8); dach.castShadow = true; scene.add(dach);
  kasten(scene, K.x, 8, K.z, 4.2, 16, 4.2, weiss);                             // Turm
  const spitze = new THREE.Mesh(new THREE.ConeGeometry(3.1, 8, 4), mat(0x4f8f78, { metalness: 0.3, roughness: 0.6 }));   // Grünes Kupferdach
  spitze.rotation.y = Math.PI / 4; spitze.position.set(K.x, 20, K.z); spitze.castShadow = true; scene.add(spitze);
  const gold = mat(0xd4af37, { metalness: 0.7, roughness: 0.3 });
  kasten(scene, K.x, 24.8, K.z, 0.15, 1.6, 0.15, gold); kasten(scene, K.x, 25.1, K.z, 0.9, 0.15, 0.15, gold);   // Kreuz
  const uhr = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshStandardMaterial({ color: 0xffffff })); uhr.rotation.y = Math.PI; uhr.position.set(K.x, 12.5, K.z - 2.13); scene.add(uhr);
  kasten(scene, K.x, 12.8, K.z - 2.16, 0.1, 0.65, 0.03, 0x111111, false); kasten(scene, K.x + 0.25, 12.5, K.z - 2.16, 0.5, 0.08, 0.03, 0x111111, false);   // Zeiger
  kasten(scene, K.x, 1.5, K.z - 2.14, 1.6, 3.0, 0.1, 0x5a3218);                // Kirchentür
  const fe = [];
  for (const s of [-1, 1]) for (const fz of [4, 8, 12]) fe.push(new THREE.PlaneGeometry(1.0, 2.6).rotateY(s * Math.PI / 2).translate(K.x + s * 4.02, 4, K.z + fz));
  scene.add(new THREE.Mesh(mergeGeometries(fe), fensterMat));
  hindernisse.push({ x: K.x, z: K.z + 8, hb: 4.1, ht: 6.1 }, { x: K.x, z: K.z, hb: 2.2, ht: 2.2 });
}
// Brunnen auf dem Dorfplatz, Bänke, Laternen und das Ortsschild
let lampenMat = null;
{
  const stein = mat(0xa8a39a);
  const rand = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.7, 24), stein); rand.position.set(-8, 0.35, 80); rand.castShadow = true; scene.add(rand);
  const wasser = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshStandardMaterial({ color: 0x3f8fc8, roughness: 0.1, metalness: 0.2 }));
  wasser.rotation.x = -Math.PI / 2; wasser.position.set(-8, 0.72, 80); scene.add(wasser);
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.6, 10), stein); saeule.position.set(-8, 1.3, 80); scene.add(saeule);
  const schale = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.4, 0.3, 16), stein); schale.position.set(-8, 2.1, 80); scene.add(schale);
  hindernisse.push({ x: -8, z: 80, r: 1.9 });
  for (const s of [-1, 1]) {   // Bänke
    kasten(scene, -8 + s * 4.5, 0.45, 80, 0.5, 0.1, 1.8, 0x8a5a32);
    kasten(scene, -8 + s * 4.75, 0.75, 80, 0.08, 0.5, 1.8, 0x8a5a32);
    for (const z of [-0.7, 0.7]) kasten(scene, -8 + s * 4.5, 0.2, 80 + z, 0.4, 0.4, 0.08, 0x333333, false);
  }
  lampenMat = new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd88a, emissiveIntensity: 0.6 });
  for (const x of [-46, -34, -22, -12, 8, 20, 32]) {
    kasten(scene, x, 2, 68.4, 0.15, 4, 0.15, 0x2a2a2a);
    kasten(scene, x, 4.1, 68.4, 0.45, 0.4, 0.45, lampenMat, false);
    hindernisse.push({ x, z: 68.4, r: 0.25 });
  }
  kasten(scene, 3.6, 1.2, 55, 0.1, 2.4, 0.1, 0x777777);   // Ortsschild
  kasten(scene, 3.6, 2.3, 55, 0.08, 0.7, 1.8, 0xffd23c);
  const ort = schild(`🏡 ${DORF_NAME}`, '#ffd166', 8); ort.position.set(3.6, 4.2, 55); scene.add(ort);
}
// ===== Dein eigenes Haus: man kann reingehen, und im Bett kann man schlafen =====
const inHaus = (x, z, rand = 0) => x > HAUS.x1 - rand && x < HAUS.x2 + rand && z > HAUS.z1 - rand && z < HAUS.z2 + rand;
let hausLicht = null, kaminFeuer = null;
{
  const H = HAUS, d = 0.25, mx = (H.x1 + H.x2) / 2, mz = (H.z1 + H.z2) / 2, B = H.x2 - H.x1, T = H.z2 - H.z1, W = H.hoehe;
  const putz = new THREE.MeshStandardMaterial({ color: 0xf6ead2, map: fachwerkTex, roughness: 0.95 });
  const innen = mat(0xf3ecdc);
  const wand = (x, y, z, b, h, t, hindernis = true) => { kasten(scene, x, y, z, b, h, t, putz); if (hindernis) hindernisse.push({ x, z, hb: b / 2, ht: t / 2 }); };
  wand(mx, W / 2, H.z1 + d / 2, B, W, d);                      // Wand Norden
  wand(mx, W / 2, H.z2 - d / 2, B, W, d);                      // Wand Süden
  wand(H.x1 + d / 2, W / 2, mz, d, W, T);                      // Wand Westen
  const oben = H.tuerZ - H.tuerBreite / 2 - H.z1, unten = H.z2 - H.tuerZ - H.tuerBreite / 2;   // Ostwand mit Tür
  wand(H.x2 - d / 2, W / 2, H.z1 + oben / 2, d, W, oben);
  wand(H.x2 - d / 2, W / 2, H.z2 - unten / 2, d, W, unten);
  wand(H.x2 - d / 2, (W + H.tuerHoehe) / 2, H.tuerZ, d, W - H.tuerHoehe, H.tuerBreite, false);
  // Offene Haustür (zur Seite gedreht) und Türschild
  const tuer = kasten(scene, H.x2 + 0.55, H.tuerHoehe / 2, H.tuerZ - H.tuerBreite / 2 - 0.05, 1.1, H.tuerHoehe, 0.08, 0x7a3b1d);
  tuer.rotation.y = -0.2;
  const hs = schild('🏠 Mein Haus', '#ffd166', 5); hs.position.set(H.x2 + 0.4, W + 2.6, H.tuerZ); scene.add(hs);
  // Dach (innen sieht man die Decke)
  const form = new THREE.Shape([new THREE.Vector2(-T / 2 - 0.5, 0), new THREE.Vector2(T / 2 + 0.5, 0), new THREE.Vector2(0, 2.6)]);
  const dachGeo = new THREE.ExtrudeGeometry(form, { depth: B + 0.8, bevelEnabled: false }); dachGeo.translate(0, 0, -(B + 0.8) / 2); dachGeo.rotateY(Math.PI / 2);
  const dach = new THREE.Mesh(dachGeo, [mat(0xf6ead2), mat(0x9c3b28, { side: THREE.DoubleSide })]);
  dach.position.set(mx, W, mz); dach.castShadow = dach.receiveShadow = true; scene.add(dach);
  kasten(scene, H.x1 + 1.3, W + 1.6, H.z1 + 2, 0.7, 2.4, 0.7, 0x8b4a3a);   // Schornstein (über dem Kamin)
  // Fußboden aus Holzdielen und ein Teppich
  const dielen = bretterTextur('#b08a5a'); dielen.repeat.set(4, 3);
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(B - 2 * d, T - 2 * d), new THREE.MeshStandardMaterial({ map: dielen, roughness: 0.8 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(mx, 0.04, mz); boden.receiveShadow = true; scene.add(boden);
  const teppich = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.2), new THREE.MeshStandardMaterial({ map: karoTextur('#2457a6'), roughness: 1 }));
  teppich.rotation.x = -Math.PI / 2; teppich.position.set(mx + 0.5, 0.05, mz + 0.2); teppich.receiveShadow = true; scene.add(teppich);
  // Fenster (außen und innen)
  const fe = [];
  for (const fx of [H.x1 + 2.5, mx + 1.5]) for (const [fz, ry] of [[H.z1 - 0.01, Math.PI], [H.z1 + d + 0.01, 0], [H.z2 + 0.01, 0], [H.z2 - d - 0.01, Math.PI]]) fe.push(new THREE.PlaneGeometry(1.1, 1.2).rotateY(ry).translate(fx, 1.7, fz));
  for (const [fx, ry] of [[H.x1 - 0.01, -Math.PI / 2], [H.x1 + d + 0.01, Math.PI / 2]]) fe.push(new THREE.PlaneGeometry(1.1, 1.2).rotateY(ry).translate(fx, 1.7, mz + 1.5));
  scene.add(new THREE.Mesh(mergeGeometries(fe), fensterMat));
  // Das Bett: Holzrahmen, Matratze, Kissen und eine karierte Decke
  const Bt = H.bett;
  kasten(scene, Bt.x, 0.25, Bt.z, 2.3, 0.5, 1.5, 0x7a4a2a);
  kasten(scene, Bt.x - 1.15, 0.6, Bt.z, 0.12, 1.2, 1.5, 0x7a4a2a);                                  // Kopfteil
  kasten(scene, Bt.x, 0.58, Bt.z, 2.15, 0.18, 1.38, 0xf4f4f0);                                      // Matratze
  kasten(scene, Bt.x - 0.8, 0.75, Bt.z, 0.45, 0.14, 1.0, 0xffffff);                                 // Kissen
  kasten(scene, Bt.x + 0.3, 0.7, Bt.z, 1.4, 0.1, 1.44, new THREE.MeshStandardMaterial({ map: karoTextur('#b3261e'), roughness: 1 }));   // Bettdecke
  hindernisse.push({ x: Bt.x, z: Bt.z, hb: 1.15, ht: 0.75 });
  kasten(scene, Bt.x - 0.6, 0.3, Bt.z + 1.15, 0.5, 0.6, 0.5, 0x8a5a32);                             // Nachttisch ...
  kasten(scene, Bt.x - 0.6, 0.75, Bt.z + 1.15, 0.2, 0.3, 0.2, new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffd88a, emissiveIntensity: 0.8 }));   // ... mit Lampe
  // Kamin an der Westwand (mit Feuer!)
  kasten(scene, H.x1 + 0.6, 1.0, H.z1 + 4.2, 0.8, 2.0, 1.8, 0x9a8a7a);
  kasten(scene, H.x1 + 1.02, 0.55, H.z1 + 4.2, 0.05, 0.8, 1.0, 0x1a1a1a, false);
  kaminFeuer = kasten(scene, H.x1 + 1.0, 0.4, H.z1 + 4.2, 0.1, 0.45, 0.7, new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 2 }), false);
  hindernisse.push({ x: H.x1 + 0.6, z: H.z1 + 4.2, hb: 0.5, ht: 0.95 });
  // Tisch mit zwei Stühlen
  kasten(scene, mx + 0.8, 0.75, H.z2 - 2.3, 1.6, 0.08, 1.0, 0x8a5a32);
  for (const sx of [-0.65, 0.65]) for (const sz of [-0.4, 0.4]) kasten(scene, mx + 0.8 + sx, 0.37, H.z2 - 2.3 + sz, 0.08, 0.74, 0.08, 0x6b4a2b);
  for (const sx of [-1.3, 1.3]) { kasten(scene, mx + 0.8 + sx, 0.45, H.z2 - 2.3, 0.45, 0.06, 0.45, 0x6b4a2b); kasten(scene, mx + 0.8 + sx * 1.18, 0.75, H.z2 - 2.3, 0.06, 0.6, 0.45, 0x6b4a2b); }
  kasten(scene, mx + 0.8, 0.85, H.z2 - 2.3, 0.3, 0.12, 0.3, 0xd4af37);                             // Obstschale
  hindernisse.push({ x: mx + 0.8, z: H.z2 - 2.3, hb: 1.0, ht: 0.6 });
  // Küche an der Südwand: Schrank, Herd, Spüle
  kasten(scene, H.x1 + 2.2, 0.45, H.z2 - 0.6, 3.2, 0.9, 0.7, 0xe8e2d4);
  kasten(scene, H.x1 + 1.4, 0.92, H.z2 - 0.6, 0.8, 0.04, 0.6, 0x222222, false);                    // Herdplatte
  kasten(scene, H.x1 + 3.0, 0.91, H.z2 - 0.6, 0.7, 0.04, 0.5, 0xa8b4bf, false);                    // Spüle
  hindernisse.push({ x: H.x1 + 2.2, z: H.z2 - 0.6, hb: 1.6, ht: 0.4 });
  // Bücherregal an der Nordwand
  kasten(scene, mx + 2, 1.1, H.z1 + 0.45, 2, 2.2, 0.5, 0x6b4a2b);
  for (let k = 0; k < 14; k++) kasten(scene, mx + 1.15 + (k % 7) * 0.25, 0.7 + Math.floor(k / 7) * 0.8, H.z1 + 0.62, 0.16, 0.5, 0.05, [0xc23b22, 0x2457a6, 0x2f8f3a, 0xffd166][k % 4], false);
  hindernisse.push({ x: mx + 2, z: H.z1 + 0.45, hb: 1.0, ht: 0.3 });
  // Licht unter der Decke
  hausLicht = new THREE.PointLight(0xffd9a0, 12, 14, 1.6); hausLicht.position.set(mx, W - 0.4, mz); scene.add(hausLicht);
  weg((H.x2 + 2.5) / 2, H.tuerZ, 2.5 - H.x2, 2.5);   // Weg von der Haustür zur Straße
}
// ===== Die Salzmine: ein Felsen mit Stollen, Schienen und einer Lore voller rosa Salz =====
{
  const M = SALZMINE;
  const felsGeo = new THREE.IcosahedronGeometry(11, 1);
  felsGeo.scale(1, 0.6, 1.1);
  const fels = new THREE.Mesh(felsGeo, mat(0x8a7f74, { flatShading: true }));
  fels.position.set(M.x, 0, M.z); fels.castShadow = fels.receiveShadow = true; scene.add(fels);
  const salzMat = mat(0xf2b8c6, { flatShading: true, roughness: 0.4 });
  for (let k = 0; k < 9; k++) {   // Rosa Salzkristalle am Felsen
    const kr = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + (k % 3) * 0.3), salzMat);
    const w = Math.PI * 0.7 + k * 0.25;
    kr.position.set(M.x + Math.cos(w) * 10, 1 + (k % 4) * 0.8, M.z + Math.sin(w) * 9); kr.rotation.set(k, k * 2, 0); kr.castShadow = true; scene.add(kr);
  }
  hindernisse.push({ x: M.x, z: M.z, r: 10.5 });
  // Stolleneingang mit Holzrahmen
  const ex = M.eingangX + 1.2;
  kasten(scene, ex + 0.2, 1.4, M.z, 0.1, 2.8, 2.6, 0x0a0a0a, false);
  for (const s of [-1, 1]) kasten(scene, ex, 1.5, M.z + s * 1.45, 0.3, 3.0, 0.3, 0x6b4a2b);
  kasten(scene, ex, 3.1, M.z, 0.35, 0.3, 3.4, 0x6b4a2b);
  // Schienen und Lore
  for (const s of [-1, 1]) kasten(scene, M.eingangX - 3, 0.08, M.z + s * 0.45, 9, 0.08, 0.08, 0x555555, false);
  for (let k = 0; k < 9; k++) kasten(scene, M.eingangX - 7 + k, 0.04, M.z, 0.2, 0.06, 1.3, 0x5a3a20, false);
  kasten(scene, M.eingangX - 4, 0.75, M.z, 1.3, 0.75, 0.95, 0x666a70);
  for (let k = 0; k < 5; k++) { const kr = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), salzMat); kr.position.set(M.eingangX - 4.4 + k * 0.2, 1.25, M.z - 0.2 + (k % 2) * 0.4); scene.add(kr); }
  hindernisse.push({ x: M.eingangX - 4, z: M.z, r: 0.9 });
  const ms = schild('⛏️ Salzmine', '#f2b8c6', 7); ms.position.set(M.eingangX, 5.5, M.z); scene.add(ms);
}

// Dorfbewohner, die auf der Straße spazieren gehen
const dorfLeute = [];
{
  const farben = ['#2457a6', '#7b3fa6', '#d97a1e', '#2f8f3a', '#c23b6a'];
  const wege = [[-48, 69.4, 36, 69.4], [36, 74.6, -48, 74.6], [-14, 76.5, -2, 76.5], [-30, 74.6, 22, 74.6], [-46, 69.4, -6, 69.4]];
  wege.forEach((w, k) => {
    const f = baueFarmer(farben[k]);
    scene.add(f.g);
    dorfLeute.push({ f, w, s: (k * 0.37) % 1, v: 1.1 + k * 0.15, dir: k % 2 ? -1 : 1 });
  });
}
let glockenTakt = 20;
function dorfUpdate(dt) {
  for (const d of dorfLeute) {
    const [x1, z1, x2, z2] = d.w, L = Math.hypot(x2 - x1, z2 - z1);
    d.s += d.dir * d.v * dt / L;
    if (d.s > 1) { d.s = 1; d.dir = -1; }
    if (d.s < 0) { d.s = 0; d.dir = 1; }
    d.f.g.position.set(x1 + (x2 - x1) * d.s, 0, z1 + (z2 - z1) * d.s);
    d.f.g.rotation.y = Math.atan2(-(x2 - x1) * d.dir, -(z2 - z1) * d.dir);   // In Laufrichtung schauen
    farmerPose(d.f.t, false, true, dt * 0.6);
  }
  // Jede Minute läuten die Kirchenglocken (wenn du in der Nähe bist): Bim – Bam – Bim – Bam
  glockenTakt -= dt;
  if (glockenTakt <= 0) {
    glockenTakt = 60;
    const laut = lautstaerkeBei(KIRCHE.x, KIRCHE.z);
    if (laut > 0.15) for (let k = 0; k < 4; k++) { const f = k % 2 ? 392 : 523; ton(f, k * 1.1, 2.5, 'triangle', 0.09 * laut); ton(f * 2.76, k * 1.1, 1.2, 'sine', 0.03 * laut); }
  }
}

// =====================================================================
// ===== 🏙️ Die Stadt "Großfeld" mit dem Großmarkt (der Filiale) =====
// =====================================================================
// Fahr auf dem großen Weg ganz nach Westen (links). Der Großmarkt zahlt mehr als der Dorfladen!
const STADT_NAME = 'Großfeld';
const FILIALE = { x: -150, z: 9, r: 10 };   // Der Parkplatz vor dem Großmarkt: Hier verkaufst du (V)
const FILIALE_BONUS = 1.3;                  // Der Großmarkt zahlt 30 % mehr als der Dorfladen
const FILIALE_KORN_BONUS = 1.15;            // ... und für Korn und Silage 15 % mehr als der Landhandel
// Hohe Stadthäuser: [x, z, Breite, Tiefe, Stockwerke, Farbe, Schild]
const STADT_HAEUSER = [
  [-118, -24, 11, 10, 3, '#e8d8c0'], [-132, -26, 12, 12, 5, '#c8d8e8', '🏦 Bank'], [-147, -24, 11, 10, 4, '#f0c8b0'], [-161, -27, 12, 14, 7, '#d0d0d8', '🏢 Rathaus'],
  [-176, -24, 11, 10, 3, '#e8e0b0', '🍕 Pizzeria'], [-122, 24, 12, 12, 4, '#d8c8e8', '💊 Apotheke'], [-178, 22, 11, 10, 5, '#c8e8d0', '🏨 Hotel'],
];
weg(-140, -8, 82, 5);   // Die große Straße in die Stadt
kasten(scene, -147, 0.02, -8, 74, 0.04, 9, mat(0x6a6a70, { roughness: 0.9 }), false);   // Asphalt in der Stadt (breiter)
for (let x = -182; x <= -112; x += 6) kasten(scene, x, 0.045, -8, 2.5, 0.01, 0.18, 0xf2f2f2, false);   // Mittelstreifen
for (const z of [-14, -2]) kasten(scene, -147, 0.1, z, 74, 0.2, 2.6, mat(0xb8b4ac), false);   // Gehwege
const fassadeTex = (() => {   // Ein Stück Hauswand mit einem Fenster (wird für jedes Stockwerk wiederholt)
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 60, 64, 4);
  const v = g.createLinearGradient(0, 14, 0, 50); v.addColorStop(0, '#9cc8e8'); v.addColorStop(1, '#3a5a7a');
  g.fillStyle = '#555555'; g.fillRect(14, 12, 36, 40);
  g.fillStyle = v; g.fillRect(17, 15, 30, 34);
  g.fillStyle = '#555555'; g.fillRect(31, 15, 2, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
function stadtHaus([x, z, B, T, stock, farbe, name]) {
  const H = stock * 3.2;
  const tx = fassadeTex.clone(); tx.repeat.set(Math.round(B / 3), stock); tx.needsUpdate = true;
  const tz = fassadeTex.clone(); tz.repeat.set(Math.round(T / 3), stock); tz.needsUpdate = true;
  const mx = new THREE.MeshStandardMaterial({ color: farbe, map: tx, roughness: 0.9 }), mz = new THREE.MeshStandardMaterial({ color: farbe, map: tz, roughness: 0.9 });
  const dach = mat(0x5a5a5e);
  const m = new THREE.Mesh(new THREE.BoxGeometry(B, H, T), [mz, mz, dach, dach, mx, mx]);
  m.position.set(x, H / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  kasten(scene, x, H + 0.3, z, B + 0.3, 0.6, T + 0.3, 0x77777c);                  // Dachkante
  kasten(scene, x + B / 4, H + 1.2, z, 2, 1.6, 2, 0x8a8a90);                      // Aufzug-Häuschen auf dem Dach
  const vorne = z < -8 ? 1 : -1;                                                   // Die Tür zeigt zur Straße
  kasten(scene, x, 1.2, z + vorne * (T / 2 + 0.05), 2.2, 2.4, 0.1, 0x3a2a1e, false);
  kasten(scene, x, 2.7, z + vorne * (T / 2 + 0.6), 3.4, 0.12, 1.2, 0xc23b22, false);   // Vordach
  hindernisse.push({ x, z, hb: B / 2 + 0.2, ht: T / 2 + 0.2 });
  if (name) { const sch = schild(name, '#ffd166', 7); sch.position.set(x, H + 3.2, z); scene.add(sch); }
}
STADT_HAEUSER.forEach(stadtHaus);
// Der Großmarkt (die Filiale): großer flacher Bau mit Glas-Eingang, Schild und Parkplatz
const filialeSchild = schild('', '#ffd166', 14);
{
  const F = FILIALE, gx = F.x, gz = F.z + 15, B = 32, T = 16, H = 7;
  kasten(scene, gx, H / 2, gz, B, H, T, mat(0xf2f2ee));                            // Halle
  kasten(scene, gx, H - 0.6, gz - T / 2 - 0.05, B, 1.2, 0.1, 0x2457a6, false);      // Blauer Streifen
  kasten(scene, gx, H + 0.25, gz, B + 0.4, 0.5, T + 0.4, 0x2457a6);                 // Dach
  const glas = new THREE.MeshStandardMaterial({ color: 0x9fd4e6, transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.3 });
  kasten(scene, gx, 1.8, gz - T / 2 - 0.08, 10, 3.6, 0.1, glas, false);             // Glas-Front
  for (const sx of [-1, 1]) kasten(scene, gx + sx * 1.2, 1.5, gz - T / 2 - 0.15, 2.2, 3, 0.06, glas, false);   // Schiebetüren
  kasten(scene, gx, 4.2, gz - T / 2 - 1.5, 12, 0.2, 3, 0x2457a6);                  // Vordach über dem Eingang
  for (const sx of [-1, 1]) kasten(scene, gx + sx * 5.8, 2.1, gz - T / 2 - 2.8, 0.2, 4.2, 0.2, 0x888888);
  // Großes Schild an der Wand
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d'); g.fillStyle = '#ffd166'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#c23b22'; g.font = 'bold 60px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏬 GROSSMARKT', 256, 52);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), new THREE.MeshBasicMaterial({ map: tex }));
  tafel.position.set(gx, 5.6, gz - T / 2 - 0.12); tafel.rotation.y = Math.PI; scene.add(tafel);
  hindernisse.push({ x: gx, z: gz, hb: B / 2 + 0.2, ht: T / 2 + 0.2 });
  // Parkplatz mit weißen Linien, ein paar Autos und Einkaufswagen
  kasten(scene, F.x, 0.04, F.z, 34, 0.05, 11, mat(0x5a5a60), false);
  for (let k = -5; k <= 5; k++) kasten(scene, F.x + k * 3, 0.075, F.z + 2.5, 0.12, 0.01, 4.5, 0xf2f2f2, false);
  const platz = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.35 }));
  platz.rotation.x = -Math.PI / 2; platz.position.set(F.x, 0.09, F.z - 1); scene.add(platz);
  for (const [ax, farbe] of [[-13.5, 0xd23c2a], [-7.5, 0x2a6fb0], [10.5, 0xf2f2f2], [13.5, 0x2a2a2a]]) {   // Geparkte Autos
    const ag = new THREE.Group(); ag.position.set(F.x + ax, 0, F.z + 2.5); scene.add(ag);
    kasten(ag, 0, 0.6, 0, 1.7, 0.7, 4, farbe); kasten(ag, 0, 1.2, 0.3, 1.5, 0.55, 2.2, glas, false); kasten(ag, 0, 1.5, 0.3, 1.5, 0.06, 2.2, farbe);
    for (const sx of [-0.85, 0.85]) for (const sz of [-1.3, 1.3]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 12), mat(0x111111)); r.rotation.z = Math.PI / 2; r.position.set(sx, 0.33, sz); ag.add(r); }
    hindernisse.push({ x: F.x + ax, z: F.z + 2.5, hb: 0.9, ht: 2.1 });
  }
  for (let k = 0; k < 3; k++) {   // Einkaufswagen
    const w = new THREE.Group(); w.position.set(F.x - 3.2 + k * 0.5, 0, F.z + 4.6); scene.add(w);
    kasten(w, 0, 0.75, 0, 0.55, 0.45, 0.85, mat(0xc0c4c8, { metalness: 0.6, roughness: 0.3 }), false);
    kasten(w, 0, 0.15, 0, 0.5, 0.05, 0.8, 0x333333, false);
  }
  filialeSchild.position.set(gx, H + 3.2, gz); scene.add(filialeSchild);
  const ss = schild(`🏙️ ${STADT_NAME}`, '#ffffff', 9); ss.position.set(-108, 3.5, -12.5); scene.add(ss);   // Ortsschild
  kasten(scene, -108, 1.2, -12.5, 0.12, 2.4, 0.12, 0x777777);
}
// Laternen an der Straße und Bäume
for (let x = -116; x >= -180; x -= 16) for (const z of [-14.5, -1.5]) {
  kasten(scene, x, 2.5, z, 0.15, 5, 0.15, 0x444448);
  kasten(scene, x, 5, z + (z < -8 ? 0.6 : -0.6), 0.2, 0.15, 1.3, 0x444448, false);
  kasten(scene, x, 4.88, z + (z < -8 ? 1.1 : -1.1), 0.45, 0.12, 0.35, new THREE.MeshBasicMaterial({ color: 0xfff2c0 }), false);
  hindernisse.push({ x, z, r: 0.3 });
}
// Leute, die in der Stadt spazieren gehen
const stadtLeute = [];
[['#3a7fd8', -120, -14], ['#d83a7f', -170, -2], ['#7fd83a', -140, -14], ['#d8a03a', -155, -2], ['#8a3ad8', -130, -2]].forEach(([farbe, x, z], k) => {
  const f = baueFarmer(farbe); f.g.position.set(x, 0.2, z); scene.add(f.g);
  stadtLeute.push({ f, z, x, richtung: k % 2 ? 1 : -1, tempo: 1.2 + Math.random() * 0.6 });
});
function stadtUpdate(dt) {
  if (Math.hypot(wo().x - FILIALE.x, wo().z - FILIALE.z) > 140) return;   // Weit weg: Leute müssen nicht laufen
  for (const L of stadtLeute) {
    L.x += L.richtung * L.tempo * dt;
    if (L.x < -182 || L.x > -112) L.richtung *= -1;
    L.f.g.position.x = L.x; L.f.g.rotation.y = L.richtung > 0 ? -Math.PI / 2 : Math.PI / 2;
    farmerPose(L.f.t, false, true, dt);
  }
}
// ⭐ Angebot des Tages: Jeden Tag will der Großmarkt etwas anderes ganz dringend – und zahlt das Doppelte!
const ANGEBOT_LISTE = ['honig', 'milch', 'eier', 'wolle', 'apfel', 'birne', 'kirsche', 'salat', 'karotte', 'gurke', 'tomate', 'erdbeere', 'kuerbis', 'trueffel'];
const angebotHeute = () => ANGEBOT_LISTE[(tagNr * 5 + 3) % ANGEBOT_LISTE.length];
function angebotNeu() { const P = PRODUKTE[angebotHeute()]; filialeSchild.userData.malen(`⭐ Heute: ${P.emoji} ${P.name} ×2`, '#ffd166'); }
const beiDerFiliale = () => Math.hypot(wo().x - FILIALE.x, wo().z - FILIALE.z) < FILIALE.r;
const filialePreis = k => PRODUKTE[k].preis * FILIALE_BONUS * (k === angebotHeute() ? 2 : 1);
const filialeWert = () => Object.entries(vorrat).reduce((s, [k, m]) => s + (verkaufbar(k) ? Math.floor(m) * filialePreis(k) : 0), 0);
function filialeVerkaufen() {
  let wert = Math.round(filialeWert()), text = [];
  if (wert > 0) {
    text.push(vorratText(true));
    for (const k of Object.keys(vorrat)) if (verkaufbar(k)) { vorrat[k] -= Math.floor(vorrat[k]); if (vorrat[k] <= 0.001) delete vorrat[k]; }
  }
  const gut = aktiv ? gutVon(aktiv) : null;
  if (gut === 'korn' || gut === 'silage') {   // Korn oder Silage vom Anhänger
    const m = kornDrin(aktiv), e = Math.round(m * (gut === 'korn' ? kornPreis() : SILAGE_PREIS) * FILIALE_KORN_BONUS);
    kornWeg(aktiv, m); wert += e; text.push(`${GUETER[gut].emoji} ${kg(m)} ${GUETER[gut].name}`);
  }
  if (wert <= 0) { meldung(`🏬 Du hast nichts zum Verkaufen! Der Großmarkt kauft Honig, Milch, Eier, Gemüse, Obst, Wurst … und Korn oder Silage vom Anhänger. ⭐ Heute besonders gesucht: ${PRODUKTE[angebotHeute()].emoji} ${PRODUKTE[angebotHeute()].name}!`, 5); sound.nein(); return; }
  money += wert;
  meldung(`🏬💶 Im Großmarkt verkauft: ${text.join(' · ')} für ${euro(wert)}!`, 4.5);
  sound.kasse(); speichern();
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
// Eine Maispflanze: dicker Stängel, lange Blätter, ein Kolben und oben die Fahne (1 Meter hoch – sie wird beim Wachsen größer)
const maisGeo = (() => {
  const teile = [new THREE.BoxGeometry(0.07, 1, 0.07).translate(0, 0.5, 0)];                       // Stängel
  for (let k = 0; k < 5; k++) {                                                                      // Blätter (hängen schräg nach außen)
    const y = 0.25 + k * 0.15, l = 0.5 - k * 0.05;
    teile.push(new THREE.BoxGeometry(l, 0.012, 0.09).translate(l / 2, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ(0.45)).rotateY(k * 2.4).translate(0, y, 0));
  }
  teile.push(new THREE.BoxGeometry(0.09, 0.2, 0.09).translate(0.07, 0.55, 0));                       // Kolben
  for (let k = 0; k < 3; k++) teile.push(new THREE.BoxGeometry(0.015, 0.18, 0.015).translate(0, 0.09, 0).applyMatrix4(new THREE.Matrix4().makeRotationZ((k - 1) * 0.4)).translate(0, 1, 0));   // Fahne
  return mergeGeometries(teile);
})();
const maisMat = windMaterial(mat(0xffffff, { roughness: 0.8 }), 0.4);
const maisGruen = new THREE.Color('#3f8f2a'), maisReif = new THREE.Color('#9aa83a');
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
  // Der Mais: 2 große Pflanzen pro Zelle
  f.mais = new THREE.InstancedMesh(maisGeo, maisMat, nx * nz * 2);
  f.mais.castShadow = false; f.mais.receiveShadow = true; f.mais.frustumCulled = false;
  scene.add(f.mais);
  // Das erste Feld ist am Anfang schon reif – dann kannst du gleich ernten!
  for (let k = 0; k < nx * nz; k++) f.zellen.push(f.gekauft ? { z: 'gesaet', w: 1 } : { z: 'wiese', w: 0 });
  f.schild = schild('', '#fff', 9);
  f.schild.position.set(F.x, 3.5, f.z0 + nz * ZELLE + 2.5);
  scene.add(f.schild);
  return f;
});
let grasMesh = null;
function grasWeg(x, z, r) {   // Gras unter einem Gebäude wegmachen (z. B. damit es nicht durch den Teich wächst)
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), null0 = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < grasMesh.count; i++) {
    grasMesh.getMatrixAt(i, m); p.setFromMatrixPosition(m);
    if (Math.hypot(p.x - x, p.z - z) < r) grasMesh.setMatrixAt(i, null0);
  }
  grasMesh.instanceMatrix.needsUpdate = true;
}
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
    if (feldBei(x, z, 1) || kollidiert(x, z, 1) || inScheune(x, z, 1.5) || inHaus(x, z, 1) || Math.abs(z + 8) < 3 || (Math.abs(x) < 3 && z > -8 && z < 22) || (Math.abs(z - 12) < 3 && x > 0 && x < 62) || aufWaldweg(x, z, 0.5) || aufDorfweg(x, z, 0.5)) continue;
    d.position.set(x, 0, z); d.rotation.y = Math.random() * 6; d.scale.setScalar(0.7 + Math.random() * 0.9); d.updateMatrix();
    gras.setMatrixAt(n, d.matrix);
    gras.setColorAt(n, c.setHSL(0.22 + Math.random() * 0.08, 0.5, 0.25 + Math.random() * 0.15));
    n++;
  }
  gras.count = n;
  gras.receiveShadow = true;
  scene.add(gras);
  grasMesh = gras;
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
  if (c.stroh) {   // Liegendes Stroh (eine goldene Reihe = "Schwad")
    g.fillStyle = '#d8bd5a'; g.fillRect(x + 3, y, PX - 6, PX);
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? 'rgba(255,240,170,0.7)' : 'rgba(150,110,40,0.5)'; g.fillRect(x + 3 + fester(k, i + j) * (PX - 7), y + fester(j, k + i) * PX, 1, 3); }
  }
  if (c.z === 'wiese') {
    for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(40,${90 + k * 4},30,0.6)`; g.fillRect(x + fester(k + 3, i) * PX, y + fester(j, k + 5) * PX, 1, 3); }
  }
  f.tex.needsUpdate = true;
  malZelle(f, i, j);
}
function malZelle(f, i, j) {
  const c = f.zellen[j * f.nx + i];
  const mais = c.z === 'gesaet' && c.a === 'mais';
  // Mais: wird bis zu 2,8 Meter hoch, erst dunkelgrün, reif ein bisschen gelblich
  const mh = mais ? 0.15 + Math.min(1, c.w) * 2.65 : 0;
  farbeTmp.copy(maisGruen).lerp(maisReif, c.w >= 1 ? 1 : Math.max(0, (c.w - 0.6) / 0.4) * 0.6);
  for (let k = 0; k < 2; k++) {
    const idx = (j * f.nx + i) * 2 + k;
    dummy.position.set(f.x0 + (i + 0.3 + k * 0.4) * ZELLE, 0.16, f.z0 + (j + 0.3 + k * 0.4) * ZELLE);
    dummy.rotation.y = (idx * 2.3) % 6;
    dummy.scale.set(mh ? 0.6 + mh * 0.4 : 0.0001, mh || 0.0001, mh ? 0.6 + mh * 0.4 : 0.0001);
    dummy.updateMatrix();
    f.mais.setMatrixAt(idx, dummy.matrix);
    f.mais.setColorAt(idx, farbeTmp);
  }
  f.mais.instanceMatrix.needsUpdate = true;
  f.mais.instanceColor.needsUpdate = true;
  // Die Pflanzen in dieser Zelle: Größe je nach Wachstum, grün -> gold, wenn reif
  const h = c.z === 'gesaet' && !mais ? 0.12 + Math.min(1, c.w) * 1.1 : 0;
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
    name: 'Fendt', emoji: '🚜', preis: 0, farbe: 0x16852c, felge: 0xc8ccd0,  groesse: 1, tempo: 11.1, arbeit: 1, breite: 1,
    dieselMax: DIESEL_MAX, tankMax: TANK_MAX, saatMax: SAAT_MAX, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 1,
    faehigkeit: 'Allrounder – kann pflügen, säen und ernten',
  },
  flitzer: {
    name: 'Flitzer', emoji: '🏎️', preis: 40000, farbe: 0xd9442b, felge: 0x1a1a1a,  groesse: 0.8, tempo: 13.9, arbeit: 0.9, breite: 0.8,
    dieselMax: 150, tankMax: 4000, saatMax: 1000, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 1.4, turbo: true,
    faehigkeit: 'TURBO mit Shift (bis 70 km/h)! Klein, aber flink',
  },
  kraftprotz: {
    name: 'Kraftprotz', emoji: '💪', preis: 120000, farbe: 0x2457a6, felge: 0xf2c200,  groesse: 1.35, tempo: 9.7, arbeit: 1.5, breite: 1.6,
    dieselMax: 600, tankMax: 12000, saatMax: 4000, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 0.75, allrad: true,
    faehigkeit: 'Allrad: wird nie träge · extra breite Geräte · schnell auf dem Feld',
  },
  oldtimer: {
    name: 'Oldtimer', emoji: '🧓', preis: 15000, farbe: 0xc8321e, felge: 0xf2f2f2, groesse: 0.85, tempo: 7, arbeit: 0.8, breite: 0.8,
    dieselMax: 120, tankMax: 3000, saatMax: 800, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 0.6, oldtimer: true, sparsam: 0.35,
    faehigkeit: 'Superbillig und sparsam: braucht nur ein Drittel Diesel! Ohne Kabine – der Wind weht dir um die Nase',
  },
  elektro: {
    name: 'E-Traktor', emoji: '⚡', preis: 90000, farbe: 0x1e9aa8, felge: 0xf2f2f2, groesse: 1, tempo: 12.5, arbeit: 1.1, breite: 1,
    dieselMax: 100, tankMax: 8000, saatMax: 2500, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 3.2, elektro: true,
    faehigkeit: 'Fährt mit Strom: Das Solardach lädt den Akku in der Sonne von allein! Aufladen (T) kostet fast nichts – und kein Rauch',
  },
  gps: {
    name: 'GPS-Profi', emoji: '🛰️', preis: 140000, farbe: 0xe8741e, felge: 0x2a2a2a, groesse: 1.15, tempo: 11.1, arbeit: 1.3, breite: 1.3,
    dieselMax: 450, tankMax: 14000, saatMax: 6000, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 0.9, gps: true,
    faehigkeit: 'Autopilot: Auf dem Feld lenkt er von allein schnurgerade, wenn du nicht lenkst! Riesiger Saattank',
  },
  raupe: {
    name: 'Raupe', emoji: '🐛', preis: 200000, farbe: 0x6b8f2a, felge: 0xd9b400, groesse: 1.3, tempo: 8.3, arbeit: 1.4, breite: 2,
    dieselMax: 700, tankMax: 10000, saatMax: 6000, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 0.65, raupe: true, allrad: true,
    faehigkeit: 'Kettenfahrzeug: dreht sich auf der Stelle und hat die breitesten Geräte (fast 7 m)! Wird nie träge',
  },
  monster: {
    name: 'Monster-Traktor', emoji: '🦖', preis: 100000, farbe: 0x7a2ad8, felge: 0x9aff3a, groesse: 1, tempo: 15.3, arbeit: 0.9, breite: 1,
    dieselMax: 300, tankMax: 6000, saatMax: 1500, geraete: ['pflug', 'saat', 'ernte', 'presse'], motorTon: 0.55, monster: true, allrad: true,
    faehigkeit: 'Riesenräder und 55 km/h! Shift = SPRINGEN – sogar über Zäune und Bäume!',
  },
  drescher: {
    name: 'Mähdrescher', emoji: '🌾', preis: 180000, farbe: 0xe0b000, art: 'drescher', groesse: 1, tempo: 6.9, arbeit: 1.8, breite: 1.5,
    dieselMax: 500, tankMax: 20000, saatMax: 0, geraete: ['ernte'], motorTon: 0.85,
    faehigkeit: 'Nur Ernten – aber 6,7 m breit und mit Riesen-Korntank!',
  },
  harvester: {
    name: 'Harvester', emoji: '🦾', preis: 150000, farbe: 0xd9531e, art: 'harvester', groesse: 1, tempo: 6.9, arbeit: 1, breite: 1,
    dieselMax: 400, tankMax: 0, saatMax: 0, geraete: [], motorTon: 0.9, allrad: true,
    faehigkeit: 'Fällt mit dem Kran eine Fichte in 2 Sekunden (X)! Das Holz holst du mit dem Holzanhänger',
  },
  lkw: {
    name: 'Lastwagen', emoji: '🚚', preis: 80000, farbe: 0x2a6fb0, art: 'lkw', groesse: 1, tempo: 22.2, arbeit: 1, breite: 1,
    dieselMax: 400, tankMax: 20000, saatMax: 0, geraete: [], motorTon: 0.7, kupplung: 4.4, beifahrer: true,
    faehigkeit: 'Fährt 80 km/h und trägt 20.000 kg – Korn, Häckselgut oder Silage! Kippt beim Abladen die Mulde. Mähdrescher (O) und Häcksler laden direkt hinein',
  },
  haecksler: {
    name: 'Häcksler', emoji: '🌽', preis: 160000, farbe: 0x2f9a4a, art: 'haecksler', groesse: 1, tempo: 8.3, arbeit: 1.5, breite: 1.4,
    dieselMax: 500, tankMax: 0, saatMax: 0, geraete: ['maisgebiss'], motorTon: 0.8, allrad: true, kupplung: 3.7,
    faehigkeit: 'Häckselt Mais! Bläst das Häckselgut in einen Anhänger (hinten mit H ankuppeln – oder ein Freund fährt daneben)',
  },
};
let aktiv = null;       // In welchem Fahrzeug du gerade sitzt (null = zu Fuß)
let letztes = null;     // Das zuletzt gefahrene Fahrzeug (für die Anzeige)

const reifenMat = mat(0x1b1b1b, { roughness: 1 }), felgenMat = mat(0xd9b400, { metalness: 0.3, roughness: 0.5 });
const glasMat = new THREE.MeshStandardMaterial({ color: 0x83c9df, transparent: true, opacity: 0.4, roughness: 0.1 });
function baueRad(K, x, y, z, r, b, lenkt, felge = felgenMat) {   // lenkt: 1 = lenkt mit, -1 = lenkt andersrum (Hinterradlenkung), 0 = gar nicht
  const lenker = new THREE.Group(); lenker.position.set(x, y, z); K.add(lenker);
  const rad = new THREE.Group(); lenker.add(rad);
  const teile = [new THREE.CylinderGeometry(r * 0.92, r * 0.92, b, 24)];
  const stollen = Math.round(12 + r * 8);
  for (let k = 0; k < stollen; k++) {   // Reifen mit Stollen-Profil
    teile.push(new THREE.BoxGeometry(r * 0.12, b * 0.45, 0.12).translate(r * 0.95, ((k % 2) - 0.5) * b * 0.4, 0).rotateY(k / stollen * Math.PI * 2));
  }
  const reifenGeo = mergeGeometries(teile); reifenGeo.rotateZ(Math.PI / 2);
  const reifen = new THREE.Mesh(reifenGeo, reifenMat); reifen.castShadow = true; rad.add(reifen);
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, b + 0.02, 16), felge);
  fm.rotation.z = Math.PI / 2; rad.add(fm);
  for (let k = 0; k < 6; k++) { const bolzen = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.05, b + 0.06, 6), mat(0x888888)); bolzen.rotation.z = Math.PI / 2; bolzen.position.set(0, Math.cos(k / 6 * Math.PI * 2) * r * 0.3, Math.sin(k / 6 * Math.PI * 2) * r * 0.3); rad.add(bolzen); }   // Radmuttern
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
  balkenMalen(36, fz.diesel / fz.typ.dieselMax, fz.diesel < fz.typ.dieselMax * 0.15 ? '#ff6b6b' : '#5aa0e0', fz.typ.elektro ? `⚡ ${Math.round(fz.diesel)} %` : `⛽ ${Math.round(fz.diesel)} l`);
  balkenMalen(70, kornPlatz(fz) ? kornDrin(fz) / kornPlatz(fz) : 0, '#' + (GUETER[gutVon(fz)] || GUETER.korn).farbe.toString(16).padStart(6, '0'), gutText(fz));
  g.fillStyle = '#ffffff'; g.font = '13px Arial';
  if (fz.typ.saatMax) g.fillText(`${fz.saatArt === 'mais' ? '🌽' : '🌱'} ${kg(fz.saat)}`, 10, 80);
  g.fillStyle = '#7cf5a0'; g.fillText(fz.typ.name, 10, 104);
  fz.bildTex.needsUpdate = true;
}
// Der Traktor: runde Motorhaube mit Kühlergrill, Kotflügel (vorne lenken sie mit!), Tank, Auspuff, Frontgewicht und Hydraulik hinten
function huelle(p) {   // Die "Hülle" um viele Punkte (wie ein Gummiband, das man drumherum spannt)
  p = [...p].sort((a, b) => a.x - b.x || a.y - b.y);
  const kreuz = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const unten = [], oben = [];
  for (const q of p) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
  unten.pop(); oben.pop();
  return unten.concat(oben);
}
function baueTraktor(typ, K) {
  const farbe = typ.farbe, dunkler = new THREE.Color(farbe).multiplyScalar(0.65).getHex();
  const lack = mat(farbe, { roughness: 0.35, metalness: 0.25 }), lackDunkel = mat(dunkler, { roughness: 0.4, metalness: 0.2 });
  const schwarz = mat(0x1e1f22, { roughness: 0.6 }), chrom = mat(0xd8dde2, { metalness: 0.9, roughness: 0.15 }), grau = mat(0x4a4d52, { metalness: 0.4, roughness: 0.5 });
  const licht = new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), rot = new THREE.MeshBasicMaterial({ color: 0xe0201e }), orange = new THREE.MeshBasicMaterial({ color: 0xff9a1e });
  const felge = mat(typ.felge ?? 0xd9b400, { metalness: 0.4, roughness: 0.45 });
  // Rahmen und Getriebe unten
  kasten(K, 0, 0.78, -0.5, 0.9, 0.35, 3.0, schwarz);                    // Rahmen von vorne bis zur Kabine
  kasten(K, 0, 1.12, 0.55, 1.45, 0.95, 2.1, lackDunkel);                 // Unter der Kabine
  kasten(K, 0, 0.85, 1.55, 1.15, 0.7, 0.8, grau);                        // Getriebe hinten
  // Motorhaube: oben abgerundet (eine Form, die nach vorne "hinausgeschoben" wird)
  const hw = 0.66, hh = 0.95, hr = 0.3, form = new THREE.Shape();
  form.moveTo(-hw, 0); form.lineTo(hw, 0); form.lineTo(hw, hh - hr); form.quadraticCurveTo(hw, hh, hw - hr, hh);
  form.lineTo(-hw + hr, hh); form.quadraticCurveTo(-hw, hh, -hw, hh - hr); form.closePath();
  const haubeGeo = new THREE.ExtrudeGeometry(form, { depth: 1.8, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 8 });
  haubeGeo.translate(0, 0.9, -2.16);
  const haube = new THREE.Mesh(haubeGeo, lack); haube.castShadow = true; haube.receiveShadow = true; K.add(haube);
  for (const sx of [-1, 1]) {
    kasten(K, sx * 0.72, 1.25, -1.25, 0.02, 0.12, 1.7, mat(0xffffff, { roughness: 0.5 }), false);   // Weißer Zierstreifen
    for (let k = 0; k < 5; k++) kasten(K, sx * 0.715, 1.55, -1.95 + k * 0.13, 0.02, 0.28, 0.05, schwarz, false);   // Lüftungsschlitze
  }
  kasten(K, 0, 1.91, -1.3, 0.9, 0.02, 1.6, lackDunkel, false);           // Streifen oben auf der Haube
  // Kühlergrill vorne mit Chrom-Streifen, Wappen und Scheinwerfern
  kasten(K, 0, 1.3, -2.22, 1.12, 0.72, 0.04, schwarz, false);
  for (let k = 0; k < 6; k++) kasten(K, 0, 1.02 + k * 0.11, -2.25, 1.0, 0.035, 0.03, chrom, false);
  const wappen = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), chrom); wappen.rotation.x = Math.PI / 2; wappen.position.set(0, 1.72, -2.24); K.add(wappen);
  const wappenMitte = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 20), lack); wappenMitte.rotation.x = Math.PI / 2; wappenMitte.position.set(0, 1.72, -2.245); K.add(wappenMitte);
  for (const sx of [-1, 1]) {
    kasten(K, sx * 0.48, 1.6, -2.21, 0.26, 0.14, 0.06, grau, false);      // Scheinwerfer-Rahmen
    kasten(K, sx * 0.48, 1.6, -2.245, 0.21, 0.1, 0.01, licht, false);
    kasten(K, sx * 0.48, 1.42, -2.245, 0.14, 0.06, 0.01, orange, false); // Blinker
  }
  // Vorderachse und Frontgewicht
  kasten(K, 0, 0.55, typ.oldtimer ? -1.3 : -1.15, typ.oldtimer ? 1.4 : 2.0, 0.22, 0.28, schwarz);   // Vorderachse
  const gewichtB = typ.allrad ? 1.6 : 1.3;
  kasten(K, 0, 0.75, -2.35, 0.5, 0.3, 0.3, grau);                        // Fronthydraulik
  const front = new THREE.Group(); K.add(front);   // Frontgewicht (wird abgenommen, wenn vorne ein Gerät dran ist)
  for (let k = 0; k < 4; k++) kasten(front, 0, 0.62 + k * 0.17, -2.62, gewichtB, 0.14, 0.4, k % 2 ? grau : mat(0x2f3236));   // Gewichte (übereinander)
  if (typ.allrad && !typ.raupe && !typ.monster) for (let k = 0; k < 5; k++) kasten(front, -0.6 + k * 0.3, 0.97, -2.83, 0.15, 0.12, 0.01, new THREE.MeshBasicMaterial({ color: k % 2 ? 0x111111 : 0xf2c200 }), false);   // Warnstreifen
  // Tank rechts und Batteriekasten
  kasten(K, 0.9, 1.0, -0.25, 0.42, 0.6, 0.65, schwarz);
  const deckel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), chrom); deckel.position.set(0.9, 1.33, -0.25); K.add(deckel);
  // Auspuff: steht rechts vorne an der Kabine, mit Hitzeschutz und Klappe
  const ax = typ.turbo ? 0.42 : 0.5;
  const auspuffRohr = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.7, 10), typ.turbo ? chrom : schwarz);
  auspuffRohr.position.set(ax, 2.7, -0.62); auspuffRohr.castShadow = true;
  if (typ.oldtimer) {   // Oldtimer: Auspuff vorne auf der Haube, mit rundem Scheinwerfer davor
    auspuffRohr.position.set(0.3, 2.4, -1.75); auspuffRohr.scale.y = 0.6; K.add(auspuffRohr);
    const kappe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.12, 10), chrom); kappe.position.set(0.3, 2.95, -1.75); K.add(kappe);
  } else if (!typ.elektro) {   // (Der E-Traktor hat keinen Auspuff!)
    K.add(auspuffRohr);
    kasten(K, ax, 2.5, -0.62, 0.2, 0.7, 0.2, chrom, false);              // Hitzeschutz (glänzt)
    kasten(K, ax, 3.58, -0.62, 0.16, 0.05, 0.16, schwarz, false);        // Klappe
  }
  if (typ.turbo) {   // Flitzer: zweites Rohr, beide verchromt
    const zwei = auspuffRohr.clone(); zwei.position.x = -ax; K.add(zwei);
    kasten(K, -ax, 2.5, -0.62, 0.2, 0.7, 0.2, chrom, false);
  }
  let kabine = {};
  if (typ.oldtimer) {   // Oldtimer: offener Sitz mit Lenkrad und Überrollbügel (keine Kabine)
    kasten(K, 0, 1.65, 0.6, 1.3, 0.1, 1.5, lackDunkel);                    // Plattform
    kasten(K, 0, 2.0, 0.85, 0.55, 0.12, 0.5, mat(0x5a3a22));                // Sitz (Leder)
    kasten(K, 0, 2.35, 1.1, 0.5, 0.6, 0.1, mat(0x5a3a22));                  // Lehne
    const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), schwarz); saeule.position.set(0, 2.15, 0.05); saeule.rotation.x = -0.6; K.add(saeule);
    const rad = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 20), schwarz); rad.position.set(0, 2.45, 0.28); rad.rotation.x = -0.95; K.add(rad);
    // Früher hatten Traktoren oft einen Sonnenschirm statt einer Kabine!
    const stab = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), schwarz); stab.position.set(0.45, 2.6, 1.2); K.add(stab);
    const schirm = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 12, 1, true), new THREE.MeshStandardMaterial({ map: (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 8; const gg = c.getContext('2d');
      for (let k = 0; k < 12; k++) { gg.fillStyle = k % 2 ? '#ffffff' : '#c8231e'; gg.fillRect(k * 128 / 12, 0, 128 / 12 + 1, 8); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })(), side: THREE.DoubleSide, roughness: 0.9 }));
    schirm.position.set(0.45, 3.65, 1.2); schirm.castShadow = true; K.add(schirm);
    // Schalensitz aus Blech auf einer Blattfeder (mit Löchern)
    kasten(K, 0, 1.85, 1.0, 0.1, 0.3, 0.6, grau);
    for (let k = 0; k < 4; k++) kasten(K, (k % 2 - 0.5) * 0.2, 2.07, 0.75 + Math.floor(k / 2) * 0.22, 0.06, 0.01, 0.06, schwarz, false);
    // Zwei runde Scheinwerfer auf Stielen links und rechts an der Haube
    for (const sx of [-1, 1]) {
      kasten(K, sx * 0.78, 1.65, -1.75, 0.2, 0.05, 0.05, schwarz, false);
      const lampe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.2, 16), chrom); lampe.rotation.x = Math.PI / 2; lampe.position.set(sx * 0.9, 1.72, -1.8); K.add(lampe);
      const glasRund = new THREE.Mesh(new THREE.CircleGeometry(0.11, 16), licht); glasRund.rotation.y = Math.PI; glasRund.position.set(sx * 0.9, 1.72, -1.91); K.add(glasRund);
      for (let k = 0; k < 6; k++) kasten(K, sx * 0.72, 1.35, -1.55 + k * 0.12, 0.02, 0.35, 0.04, schwarz, false);   // Lüftungsschlitze (Kiemen)
      kasten(K, sx * 0.6, 1.05, 0.25, 0.3, 0.04, 0.5, mat(0x777777, { metalness: 0.6 }), false);   // Trittblech
    }
    // Runder Kühler vorne (Chromring mit senkrechten Stäben), Wappen und Werkzeugkiste
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), chrom); ring.position.set(0, 1.35, -2.28); K.add(ring);
    for (let k = -3; k <= 3; k++) kasten(K, k * 0.1, 1.35, -2.27, 0.03, Math.sqrt(Math.max(0, 0.16 - (k * 0.1) ** 2)) * 2, 0.02, chrom, false);
    kasten(K, -0.95, 1.2, 0.2, 0.25, 0.22, 0.45, mat(0xc8231e));                  // Werkzeugkiste
    const kappe2 = kasten(K, 0.3, 3.03, -1.75, 0.16, 0.02, 0.16, schwarz, false); kappe2.rotation.x = -0.5;   // Regenklappe auf dem Auspuff
  } else kabine = baueKabine(K, farbe, dunkler);
  // Räder mit Kotflügeln (vorne hängen die Kotflügel am Rad und lenken mit)
  const raeder = [];
  const bogen = (r, b, w) => { const geo = new THREE.CylinderGeometry(r, r, b, 18, 1, true, Math.PI / 2 - w, w * 2); geo.rotateZ(Math.PI / 2); return geo; };
  const fluegelMat = mat(farbe, { roughness: 0.35, metalness: 0.25, side: THREE.DoubleSide });
  if (typ.raupe) {   // Raupe: wie ein echtes Kettenlaufwerk – Antriebsrad mit Zähnen hinten (höher), Leitrad vorne, Laufrollen unten, Gummikette rundherum
    const kette = mat(0x1c1c1c, { roughness: 0.85 }), stollenMat = mat(0x2c2c2c, { roughness: 0.9 });
    const profil = innen => {   // Die Form der Kette von der Seite: eine "Hülle" um Leitrad, Antriebsrad und Boden
      const d = innen ? 0.11 : 0, pts = [];
      const kreis = (u, v, r) => { for (let k = 0; k < 28; k++) { const w = k / 28 * Math.PI * 2; pts.push(new THREE.Vector2(u + Math.cos(w) * (r - d), v + Math.sin(w) * (r - d))); } };
      kreis(1.5, 0.55, 0.48); kreis(-1.45, 0.9, 0.62);
      pts.push(new THREE.Vector2(1.15, 0.07 + d), new THREE.Vector2(-1.0, 0.07 + d));
      return huelle(pts);
    };
    const form = new THREE.Shape(profil(false)); form.holes.push(new THREE.Path(profil(true)));
    const ketteGeo = new THREE.ExtrudeGeometry(form, { depth: 0.62, bevelEnabled: false, curveSegments: 4 }); ketteGeo.translate(0, 0, -0.31); ketteGeo.rotateY(Math.PI / 2);
    const drehteil = (x, y, z, r, b, m, zaehne) => {   // Ein Rad, das sich beim Fahren dreht
      const lenker = new THREE.Group(); lenker.position.set(x, y, z); K.add(lenker);
      const rad = new THREE.Group(); lenker.add(rad);
      const scheibe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, b, 20), m); scheibe.rotation.z = Math.PI / 2; scheibe.castShadow = true; rad.add(scheibe);
      for (let k = 0; k < 6; k++) { const w = k / 6 * Math.PI * 2; const l = kasten(rad, 0, Math.cos(w) * r * 0.55, Math.sin(w) * r * 0.55, b + 0.04, r * 0.18, r * 0.18, mat(0x333333), false); l.rotation.x = -w; }   // Löcher/Speichen
      for (let k = 0; k < zaehne; k++) { const w = k / zaehne * Math.PI * 2; const t = kasten(rad, 0, Math.cos(w) * (r + 0.04), Math.sin(w) * (r + 0.04), b * 0.6, 0.1, 0.14, grau, false); t.rotation.x = -w; }   // Zähne
      raeder.push({ lenker, rad, r, lenkt: 0 });
    };
    for (const sx of [-1, 1]) {
      const x = sx * 1.25;
      const k = new THREE.Mesh(ketteGeo, kette); k.position.x = x; k.castShadow = true; k.receiveShadow = true; K.add(k);
      // Schräge Stollen außen auf der Kette (unten und oben)
      for (let n = 0; n < 12; n++) { const st = kasten(K, x, 0.065, -1.15 + n * 0.2, 0.6, 0.05, 0.07, stollenMat, false); st.rotation.y = sx * 0.25; }
      for (let n = 0; n < 13; n++) { const t = n / 12, st = kasten(K, x, 1.03 + t * 0.49 + 0.03, -1.5 + t * 2.95, 0.6, 0.05, 0.07, stollenMat, false); st.rotation.x = -0.165; st.rotation.y = sx * 0.25; }
      drehteil(x, 0.9, 1.45, 0.52, 0.5, mat(0xd9b400, { metalness: 0.4, roughness: 0.4 }), 14);   // Antriebsrad (gelb, mit Zähnen)
      drehteil(x, 0.55, -1.5, 0.37, 0.5, felge, 0);                                                  // Leitrad vorne
      for (const z of [-0.75, 0, 0.75]) drehteil(x, 0.27, z, 0.19, 0.48, grau, 0);                   // Laufrollen
      kasten(K, x, 0.5, -0.1, 0.3, 0.28, 2.4, grau);                                                 // Laufwerksträger
      const spann = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), chrom); spann.rotation.x = Math.PI / 2; spann.position.set(x, 0.6, -0.95); K.add(spann);   // Spannzylinder
      const kfl = new THREE.Mesh(bogen(0.78, 0.7, 1.2), fluegelMat); kfl.position.set(x, 0.9, 1.45); kfl.castShadow = true; K.add(kfl);   // Kotflügel über dem Antriebsrad
      kasten(K, x, 1.6, 1.0, 0.7, 0.05, 0.8, lack);
    }
  } else if (typ.monster) {   // Monster: riesige Räder mit Federbeinen – alle vier lenken
    for (const sx of [-1, 1]) for (const [z, lenkt] of [[-1.3, 1], [1.2, -1]]) {
      const r = baueRad(K, sx * 1.8, 1.25, z, 1.25, 0.9, lenkt, felge);
      raeder.push(r);
      for (let k = 0; k < 10; k++) { const w = k / 10 * Math.PI * 2; const st = kasten(r.rad, 0, Math.cos(w) * 1.22, Math.sin(w) * 1.22, 0.95, 0.12, 0.28, mat(0x151515), false); st.rotation.x = -w; st.rotation.y = (k % 2 ? 0.35 : -0.35); }   // Grobe Pfeil-Stollen
      for (const dz of [-0.28, 0.28]) {   // Federbeine mit Schraubenfedern (Spiralen)
        const bein = new THREE.Group(); bein.position.set(sx * 1.05, 1.55, z + dz); bein.rotation.z = sx * 0.6; K.add(bein);
        const stange = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), chrom); bein.add(stange);
        for (let k = 0; k < 7; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 14), mat(0xff3a3a)); ring.rotation.x = Math.PI / 2; ring.position.y = -0.4 + k * 0.12; bein.add(ring); }
      }
      const achse = kasten(K, sx * 1.2, 1.25, z, 1.1, 0.16, 0.16, grau); achse.castShadow = true;   // Achse zum Rad
    }
    kasten(K, 0, 0.75, -0.1, 1.6, 0.12, 3.2, grau);                              // Unterfahrschutz
    for (const sx of [-1, 1]) {
      const rohr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), chrom); rohr.rotation.x = Math.PI / 2; rohr.position.set(sx * 0.95, 1.0, -0.05); K.add(rohr);   // Trittrohre an der Seite
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 12), chrom); stack.position.set(sx * 0.95, 2.9, 1.45); K.add(stack);   // Zwei hohe Auspuffrohre hinten
      const kappe = kasten(K, sx * 0.95, 4.02, 1.48, 0.22, 0.03, 0.26, schwarz, false); kappe.rotation.x = -0.6;
    }
    kasten(K, 0, 3.32, -0.55, 1.8, 0.14, 0.18, schwarz);                          // Lichtleiste auf dem Dach
    for (let k = 0; k < 8; k++) kasten(K, -0.77 + k * 0.22, 3.32, -0.645, 0.16, 0.08, 0.01, licht, false);
    kasten(K, 0, 0.95, -2.95, 1.9, 0.3, 0.25, schwarz);                           // Dicke Stoßstange ...
    const winde = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 12), mat(0xd23c2a)); winde.rotation.z = Math.PI / 2; winde.position.set(0, 1.18, -2.98); K.add(winde);   // ... mit Seilwinde
    kasten(K, 0, 1.0, -3.1, 0.12, 0.12, 0.05, chrom, false);
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const flamme = kasten(K, sx * 0.73, 1.2 + k * 0.08, -1.9 + k * 0.25, 0.02, 0.12, 0.5 - k * 0.08, new THREE.MeshBasicMaterial({ color: [0xffe03a, 0xffa01e, 0xff5a1e, 0xd8201e][k] }), false); flamme.rotation.x = 0.3; }   // Flammen-Aufkleber
  } else for (const x of typ.oldtimer ? [-1, 1] : [-1.2, 1.2]) {
    if (typ.oldtimer) {   // Oldtimer: schmale Vorderräder, große Hinterräder mit runden Kotflügeln
      raeder.push(baueRad(K, x * 0.78, 0.45, -1.3, 0.45, 0.2, 1, felge));
      const hr = baueRad(K, x * 1.15, 0.85, 1.05, 0.85, 0.4, 0, felge); raeder.push(hr);
      for (let k = 0; k < 8; k++) { const sp = kasten(hr.rad, 0, 0, 0, 0.42, 0.06, 0.85 * 0.9, felge, false); sp.rotation.x = k / 8 * Math.PI; }   // Speichen wie früher
      const hf = new THREE.Mesh(bogen(0.98, 0.48, 1.4), fluegelMat); hf.position.set(x * 1.15, 0.85, 1.05); hf.castShadow = true; K.add(hf);
      continue;
    }
    const vorne = baueRad(K, x, 0.55, -1.15, 0.55, 0.4, 1, felge);
    raeder.push(vorne);
    const kf = new THREE.Mesh(bogen(0.68, 0.5, 1.05), fluegelMat); kf.castShadow = true; vorne.lenker.add(kf);
    const hinten = baueRad(K, x * 1.1, 0.78, 1.05, 0.78, 0.55, 0, felge);
    raeder.push(hinten);
    const hf = new THREE.Mesh(bogen(0.92, 0.66, 1.25), fluegelMat); hf.position.set(x * 1.1, 0.78, 1.05); hf.castShadow = true; K.add(hf);
    kasten(K, x * 1.1, 1.72, 1.05, 0.66, 0.05, 1.0, lack);                // Flacher Teil oben
    kasten(K, x * 1.1, 1.62, 1.86, 0.5, 0.12, 0.08, schwarz, false);      // Rücklicht-Halter
    kasten(K, x * 1.1 - Math.sign(x) * 0.1, 1.62, 1.905, 0.16, 0.08, 0.01, rot, false);
    kasten(K, x * 1.1 + Math.sign(x) * 0.12, 1.62, 1.905, 0.12, 0.08, 0.01, orange, false);
    kasten(K, x * 1.1, 1.82, 0.62, 0.2, 0.12, 0.12, grau, false);         // Arbeitsscheinwerfer auf dem Kotflügel
    kasten(K, x * 1.1, 1.82, 0.555, 0.15, 0.08, 0.01, licht, false);
  }
  // Hinten: Dreipunkt-Hydraulik, Zapfwelle und Anhängerkupplung
  for (const sx of [-1, 1]) { const arm = kasten(K, sx * 0.42, 0.62, 2.1, 0.09, 0.12, 0.9, grau); arm.rotation.y = -sx * 0.12; }   // Unterlenker
  const oberlenker = kasten(K, 0, 1.25, 2.05, 0.08, 0.08, 0.8, mat(0xd23c2a)); oberlenker.rotation.x = -0.25;
  const zapf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), chrom); zapf.rotation.x = Math.PI / 2; zapf.position.set(0, 0.9, 2.0); K.add(zapf);
  kasten(K, 0, 0.72, 2.15, 0.3, 0.12, 0.35, schwarz);                    // Kupplungsmaul
  if (typ.turbo) {   // Flitzer: Spoiler, Rennstreifen auf der Haube, Frontlippe und Seitenschweller
    kasten(K, 0, 3.4, 1.5, 1.9, 0.08, 0.3, 0x111111);
    for (const sx of [-0.18, 0.18]) kasten(K, sx, 1.925, -1.3, 0.12, 0.01, 1.65, 0xffffff, false);
    kasten(K, 0, 0.62, -2.45, 1.5, 0.06, 0.5, 0x111111, false);
    for (const sx of [-1, 1]) kasten(K, sx * 0.74, 0.72, -0.35, 0.06, 0.12, 0.9, 0x111111, false);
  }
  if (typ.allrad && !typ.raupe && !typ.monster) {   // Kraftprotz: Zusatz-Scheinwerfer auf dem Dach, Rammschutz vorne und Zwillingsräder
    for (const x of [-0.5, -0.2, 0.2, 0.5]) kasten(K, x, 3.33, -0.42, 0.18, 0.14, 0.1, licht, false);
    for (const sx of [-1, 1]) kasten(front, sx * 0.7, 1.05, -2.95, 0.1, 0.9, 0.1, chrom);
    kasten(front, 0, 1.45, -2.95, 1.5, 0.1, 0.1, chrom);
    for (const x of [-1.85, 1.85]) raeder.push(baueRad(K, x, 0.78, 1.05, 0.78, 0.45, 0, felge));
  }
  if (typ.elektro) {   // E-Traktor: Solardach, Blitz-Streifen und Ladestecker
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const gg = c.getContext('2d'); gg.fillStyle = '#1a2a5a'; gg.fillRect(0, 0, 64, 64); gg.strokeStyle = '#9ab0e0'; gg.lineWidth = 1.5;
    for (let k = 0; k <= 64; k += 16) { gg.beginPath(); gg.moveTo(k, 0); gg.lineTo(k, 64); gg.stroke(); gg.beginPath(); gg.moveTo(0, k); gg.lineTo(64, k); gg.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(3, 4);
    // Großes Solardach – gleichzeitig Sonnenschutz (wie beim echten Solar-Traktor), auf 4 Stützen, mit Rahmen
    const solar = kasten(K, 0, 3.55, 0.2, 2.6, 0.06, 3.4, new THREE.MeshStandardMaterial({ map: tx, metalness: 0.6, roughness: 0.2 }));
    solar.rotation.x = -0.06;
    kasten(K, 0, 3.5, 0.2, 2.7, 0.05, 3.5, mat(0xd8dde2, { metalness: 0.8, roughness: 0.3 }));
    for (const sx of [-1, 1]) for (const sz of [-0.4, 1.3]) kasten(K, sx * 0.85, 3.35, sz, 0.06, 0.3, 0.06, grau, false);
    // Vorne zu statt Kühlergrill (ein E-Motor braucht kaum Luft): glatte Front mit LED-Leiste und Kameras
    kasten(K, 0, 1.3, -2.285, 1.16, 0.78, 0.03, lack, false);
    kasten(K, 0, 1.62, -2.31, 1.0, 0.04, 0.01, new THREE.MeshBasicMaterial({ color: 0x6af0ff }), false);   // LED-Leiste
    for (const sx of [-0.25, 0.25]) { const cam = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0x111111, { metalness: 0.6, roughness: 0.1 })); cam.position.set(sx, 1.12, -2.3); K.add(cam); }
    // Batterie-Kästen an der Seite mit Kühlrippen und Blitz-Zeichen
    for (const sx of [-1, 1]) {
      kasten(K, sx * 0.72, 1.18, -1.15, 0.12, 0.45, 1.0, mat(0x2457a6, { metalness: 0.4, roughness: 0.4 }));
      for (let k = 0; k < 7; k++) kasten(K, sx * 0.79, 1.18, -1.55 + k * 0.13, 0.03, 0.4, 0.03, mat(0x9aa8c0), false);
      const blitz = kasten(K, sx * 0.725, 1.6, -1.3, 0.02, 0.4, 0.1, new THREE.MeshBasicMaterial({ color: 0xffe03a }), false); blitz.rotation.x = 0.5;
    }
    kasten(K, -0.72, 1.3, -0.45, 0.06, 0.2, 0.2, schwarz, false);                    // Ladeklappe ...
    kasten(K, -0.755, 1.3, -0.45, 0.02, 0.1, 0.1, new THREE.MeshBasicMaterial({ color: 0x3aff8a }), false);   // ... die Ladebuchse leuchtet grün
  }
  if (typ.gps) {   // GPS-Profi: Empfänger-Kuppel auf dem Dach und Antenne
    const kuppel = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xf2f2f2, { roughness: 0.3 }));
    kuppel.position.set(0, 3.32, -0.2); K.add(kuppel);
    kasten(K, 0, 3.28, -0.2, 0.5, 0.06, 0.4, schwarz, false);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.9, 6), schwarz); ant.position.set(0.5, 3.7, 0.9); K.add(ant);
    kasten(K, 0.5, 4.17, 0.9, 0.06, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0x3aff8a }), false);   // Lämpchen
    // Sensor vorne auf der Haube (sieht Hindernisse) und Kameras an den Dachecken
    const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), schwarz); sensor.position.set(0, 2.0, -2.0); K.add(sensor);
    kasten(K, 0, 2.03, -2.1, 0.12, 0.05, 0.01, new THREE.MeshBasicMaterial({ color: 0xff3a3a }), false);
    for (const sx of [-1, 1]) for (const sz of [-0.48, 1.38]) kasten(K, sx * 0.9, 3.15, sz, 0.1, 0.08, 0.1, schwarz, false);
    // Großer Bildschirm in der Kabine (zeigt die Spur) und Motor am Lenkrad
    kasten(K, 0.62, 2.7, -0.05, 0.03, 0.32, 0.42, schwarz, false);
    kasten(K, 0.6, 2.7, -0.05, 0.01, 0.26, 0.36, new THREE.MeshBasicMaterial({ color: 0x2a9a4a }), false);
    for (let k = 0; k < 3; k++) kasten(K, 0.595, 2.62 + k * 0.08, -0.05, 0.005, 0.015, 0.3, new THREE.MeshBasicMaterial({ color: 0xbfffcf }), false);   // Spur-Linien auf dem Bildschirm
    const motorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), mat(0xe8741e)); motorRing.position.set(0, 2.25, 0.08); motorRing.rotation.x = -0.75; K.add(motorRing);
    for (const sx of [-1, 1]) kasten(K, sx * 0.725, 1.25, -1.3, 0.02, 0.06, 1.6, schwarz, false);   // Schwarzer Streifen
  }
  const sitz = typ.oldtimer ? [0, 2.75, 0.85] : [0, 2.85, 0.8];
  const auspuff = typ.oldtimer ? [0.3, 3.05, -1.75] : [ax, 3.62, -0.62];
  return { raeder, auspuff, sitz, radstand: typ.monster ? 2.5 : 2.3, frontgewicht: front, ...kabine };
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
// Der Harvester: 8 Räder, Glas-Kabine, Motor hinten – und vorne ein langer Kran mit Fällkopf!
function baueHarvester(typ, K) {
  const farbe = typ.farbe, dunkel = 0x2a2a2a;
  kasten(K, 0, 1.25, 0.4, 2.3, 0.7, 7.2, dunkel);                 // Rahmen
  kasten(K, 0, 1.75, -1.6, 2.5, 0.35, 3.0, farbe);                // Vorderwagen
  kasten(K, 0, 2.3, 2.3, 2.5, 1.5, 2.8, farbe);                   // Motor hinten
  kasten(K, 0, 3.07, 2.3, 2.2, 0.06, 2.4, 0x222222, false);       // Lüftungsgitter
  kasten(K, 0, 1.8, 0.55, 1.0, 0.6, 0.7, 0x333333);               // Knick-Gelenk in der Mitte
  // Kabine (rundum Glas – man muss ja den Kran sehen!)
  kasten(K, 0, 1.97, -0.9, 1.9, 0.1, 1.9, farbe);
  for (const [x, z] of [[-0.9, -1.8], [0.9, -1.8], [-0.9, 0], [0.9, 0]]) kasten(K, x, 2.75, z, 0.09, 1.5, 0.09, 0x222222);
  kasten(K, 0, 2.75, -0.9, 1.8, 1.45, 1.8, glasMat, false);
  kasten(K, 0, 3.55, -0.9, 2.1, 0.14, 2.1, farbe);                 // Dach
  const licht = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.7, -0.25, 0.25, 0.7]) kasten(K, x, 3.7, -1.85, 0.25, 0.15, 0.12, licht, false);   // Arbeitsscheinwerfer
  kasten(K, 0, 2.08, -0.6, 0.55, 0.14, 0.55, 0x222222, false);     // Sitz
  kasten(K, 0, 2.45, -0.33, 0.5, 0.6, 0.1, 0x222222, false);       // Lehne
  kasten(K, 0.85, 3.5, 3.2, 0.14, 1.0, 0.14, 0x222222);            // Auspuff
  const raeder = [];
  for (const x of [-1.35, 1.35]) {
    for (const [z, lenkt] of [[-2.5, 1], [-1.3, 1], [1.7, 0], [2.9, 0]]) raeder.push(baueRad(K, x, 0.65, z, 0.65, 0.55, lenkt));
    for (const z of [-1.9, 2.3]) kasten(K, x * 0.85, 0.75, z, 0.2, 0.3, 1.5, dunkel);   // Schwingen (Bogie)
  }
  // Der Kran: dreht sich (turm), der Arm geht schräg runter, vorne hängt der Fällkopf
  const turm = new THREE.Group(); turm.position.set(0, 2.0, -2.7); K.add(turm);
  const sockel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 12), mat(farbe)); sockel.castShadow = true; turm.add(sockel);
  const armG = new THREE.Group(); armG.position.y = 0.3; turm.add(armG);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 1).translate(0, 0, -0.5), mat(farbe)); arm.castShadow = true; armG.add(arm);
  const kopf = new THREE.Group(); turm.add(kopf);
  kasten(kopf, 0, 0, 0, 0.75, 1.0, 0.6, 0xf0a020);                       // Fällkopf
  kasten(kopf, 0, 0.6, 0, 0.3, 0.25, 0.3, 0x333333);                     // Rotator
  for (const sx of [-1, 1]) kasten(kopf, sx * 0.45, 0.05, -0.3, 0.12, 0.75, 0.12, 0x222222);   // Greifarme
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 10), mat(0x222222)); w.position.set(sx * 0.3, -0.2, -0.35); kopf.add(w); }   // Vorschubwalzen
  kasten(kopf, 0, -0.45, -0.55, 0.06, 0.1, 0.9, 0xb5b9bf, false);        // Sägeschwert unten
  return { raeder, auspuff: [0.85, 4.05, 3.2], sitz: [0, 2.95, -0.65], radstand: 4.2, kran: { turm, armG, arm, kopf, phi: 0, d: 2.6, h: -0.2 } };
}
// Der Lastwagen: Fahrerhaus vorne, drei Achsen, hinten eine Kippmulde (kippt beim Abladen nach hinten)
function baueLKW(typ, K) {
  const lack = mat(typ.farbe, { roughness: 0.3, metalness: 0.3 }), dunkel = mat(0x1e1f22, { roughness: 0.6 }), grau = mat(0x4a4d52, { metalness: 0.4, roughness: 0.5 });
  const chrom = mat(0xd8dde2, { metalness: 0.9, roughness: 0.15 }), licht = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const rot = new THREE.MeshBasicMaterial({ color: 0xe0201e }), orange = new THREE.MeshBasicMaterial({ color: 0xff9a1e });
  const muldeMat = mat(0xd8a020, { roughness: 0.6, metalness: 0.3 });
  // Rahmen und Tank
  kasten(K, 0, 0.95, 0.2, 1.1, 0.35, 8.0, dunkel);
  kasten(K, -1.0, 1.05, -1.3, 0.5, 0.55, 1.1, chrom);                     // Tank (glänzt)
  kasten(K, 1.0, 1.05, -1.3, 0.5, 0.45, 0.8, dunkel);                     // Batteriekasten
  // ===== Fahrerhaus: unten Blech, oben rundherum Fenster vorne, hinten die Schlafkabine, oben ein Windabweiser =====
  const CZ1 = -4.3, CZ2 = -1.95, CY1 = 1.35, BR = 2.15, CY2 = 3.45, CB = 2.5, GL = 1.25;   // vorne, hinten, unten, Fensterkante, Dach, Breite, Länge vom Glas-Teil
  const lackDunkel = mat(new THREE.Color(typ.farbe).multiplyScalar(0.6).getHex(), { roughness: 0.35, metalness: 0.3 });
  kasten(K, 0, (CY1 + BR) / 2, (CZ1 + CZ2) / 2, CB, BR - CY1, CZ2 - CZ1, lack);          // Unterteil
  kasten(K, 0, (BR + CY2) / 2, (CZ1 + GL + CZ2) / 2, CB, CY2 - BR, CZ2 - CZ1 - GL, lack); // Schlafkabine hinten (oben)
  kasten(K, 0, CY2 - 0.06, CZ1 + GL / 2, CB, 0.12, GL, lack);                            // Dach über den Fenstern
  for (const sx of [-1, 1]) {
    kasten(K, sx * (CB / 2 - 0.07), (BR + CY2) / 2, CZ1 + 0.08, 0.14, CY2 - BR, 0.16, lack);   // A-Säule vorne
    kasten(K, sx * (CB / 2 - 0.05), (BR + CY2) / 2, CZ1 + GL - 0.05, 0.1, CY2 - BR, 0.1, lack); // B-Säule
    kasten(K, sx * (CB / 2 - 0.01), (BR + CY2) / 2 - 0.05, CZ1 + GL / 2 + 0.03, 0.02, CY2 - BR - 0.2, GL - 0.2, glasMat, false);   // Seitenfenster
    // Tür: Fugen, Griff, Haltegriff und zwei Trittstufen
    kasten(K, sx * (CB / 2 + 0.005), (CY1 + CY2) / 2, CZ1 + GL + 0.02, 0.01, CY2 - CY1 - 0.1, 0.025, dunkel, false);
    kasten(K, sx * (CB / 2 + 0.005), CY1 + 0.08, CZ1 + GL / 2, 0.01, 0.025, GL, dunkel, false);
    kasten(K, sx * (CB / 2 + 0.03), BR - 0.1, CZ1 + GL - 0.25, 0.04, 0.05, 0.22, chrom, false);
    kasten(K, sx * (CB / 2 + 0.06), 2.0, CZ1 + GL + 0.12, 0.04, 0.9, 0.04, chrom, false);
    for (const [y, t] of [[0.75, 0.35], [1.15, 0.3]]) kasten(K, sx * (CB / 2 - 0.1), y, CZ1 + 0.35, 0.45, 0.05, t, mat(0x3a3a3a, { metalness: 0.5 }), false);
    kasten(K, sx * (CB / 2 + 0.005), 1.72, (CZ1 + GL + CZ2) / 2, 0.01, 0.12, CZ2 - CZ1 - GL - 0.2, mat(0xffffff), false);   // Zierstreifen
    // Windabweiser an den Ecken vorne
    const ecke = kasten(K, sx * (CB / 2 + 0.03), 2.45, CZ1 + 0.22, 0.06, 1.7, 0.45, lackDunkel); ecke.rotation.y = sx * 0.35;
    // Großer Spiegel + kleiner Rampenspiegel
    kasten(K, sx * (CB / 2 + 0.25), 3.15, CZ1 + 0.2, 0.5, 0.05, 0.05, dunkel, false);
    kasten(K, sx * (CB / 2 + 0.5), 2.75, CZ1 + 0.25, 0.08, 0.75, 0.3, dunkel);
    kasten(K, sx * (CB / 2 + 0.5), 2.75, CZ1 + 0.4, 0.06, 0.68, 0.01, mat(0xbfd8e8, { metalness: 0.9, roughness: 0.05 }), false);
    kasten(K, sx * (CB / 2 + 0.42), 2.2, CZ1 + 0.25, 0.07, 0.28, 0.24, dunkel, false);
  }
  // Frontscheibe (leicht schräg) mit zwei Scheibenwischern und Sonnenblende
  const scheibe = kasten(K, 0, (BR + CY2) / 2 - 0.05, CZ1 + 0.06, CB - 0.25, CY2 - BR - 0.15, 0.03, glasMat, false); scheibe.rotation.x = -0.06;
  for (const sx of [-0.55, 0.3]) { const w = kasten(K, sx, BR + 0.35, CZ1 - 0.01, 0.03, 0.75, 0.02, dunkel, false); w.rotation.z = 1.1; }
  kasten(K, 0, CY2 + 0.02, CZ1 - 0.15, CB + 0.05, 0.08, 0.4, lackDunkel);
  for (let k = 0; k < 5; k++) kasten(K, -0.6 + k * 0.3, CY2 - 0.02, CZ1 - 0.36, 0.12, 0.05, 0.02, orange, false);   // Positionslichter
  // Windabweiser auf dem Dach (von der Seite schräg)
  const sp = new THREE.Shape([new THREE.Vector2(-(CZ1 + 0.5), 0), new THREE.Vector2(-CZ2, 0), new THREE.Vector2(-CZ2, 0.75), new THREE.Vector2(-(CZ1 + 1.5), 0.75)]);
  const spGeo = new THREE.ExtrudeGeometry(sp, { depth: CB - 0.1, bevelEnabled: false }); spGeo.translate(0, 0, -(CB - 0.1) / 2); spGeo.rotateY(Math.PI / 2);
  const spoiler = new THREE.Mesh(spGeo, lack); spoiler.position.y = CY2; spoiler.castShadow = true; K.add(spoiler);
  for (const sx of [-0.35, 0.35]) { const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.6, 10), chrom); horn.rotation.x = Math.PI / 2; horn.position.set(sx, CY2 + 0.1, CZ1 + 0.6); K.add(horn); }   // Drucklufthörner
  const rundum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 0.6 }));
  rundum.position.set(0, CY2 + 0.85, CZ2 - 0.3); K.add(rundum);
  for (const x of [-0.75, -0.25, 0.25, 0.75]) kasten(K, x, CY2 + 0.82, CZ1 + 1.55, 0.25, 0.15, 0.12, licht, false);   // Lampen auf dem Spoiler
  // Front: Kühlergrill mit Chrom und Wappen, Stoßstange mit Scheinwerfern, Nebelleuchten und Nummernschild
  kasten(K, 0, 1.8, CZ1 - 0.02, 1.9, 0.62, 0.04, dunkel, false);
  for (let k = 0; k < 5; k++) kasten(K, 0, 1.56 + k * 0.12, CZ1 - 0.05, 1.8, 0.04, 0.03, chrom, false);
  const wappen = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), chrom); wappen.rotation.x = Math.PI / 2; wappen.position.set(0, 1.8, CZ1 - 0.07); K.add(wappen);
  kasten(K, 0, 1.08, CZ1 - 0.08, CB + 0.05, 0.5, 0.3, grau);                             // Stoßstange
  for (const sx of [-1, 1]) {
    kasten(K, sx * 0.88, 1.18, CZ1 - 0.235, 0.5, 0.2, 0.02, licht, false);               // Scheinwerfer
    kasten(K, sx * 0.88, 1.18, CZ1 - 0.225, 0.56, 0.26, 0.02, dunkel, false);
    kasten(K, sx * 1.17, 1.18, CZ1 - 0.235, 0.1, 0.2, 0.02, orange, false);              // Blinker
    const nebel = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), licht); nebel.rotation.y = Math.PI; nebel.position.set(sx * 0.7, 0.93, CZ1 - 0.236); K.add(nebel);
  }
  kasten(K, 0, 0.95, CZ1 - 0.235, 0.52, 0.12, 0.01, mat(0xf2f2f2), false);              // Nummernschild
  kasten(K, -0.24, 0.95, CZ1 - 0.24, 0.04, 0.12, 0.01, new THREE.MeshBasicMaterial({ color: 0x2457a6 }), false);
  // Kotflügel über den Vorderrädern (lenken mit, wie beim Traktor) – kommen gleich bei den Rädern dazu
  // Innen: Armaturenbrett, Lenkrad links (der Fahrer sitzt links!), zwei Sitze, Schalthebel und Vorhang zur Schlafkabine
  const innen = mat(0x2a2c30, { roughness: 0.7 });
  kasten(K, 0, BR + 0.12, CZ1 + 0.35, CB - 0.3, 0.3, 0.45, innen);                       // Armaturenbrett
  kasten(K, -0.55, BR + 0.3, CZ1 + 0.4, 0.5, 0.12, 0.05, new THREE.MeshBasicMaterial({ color: 0x2a6fd8 }), false);   // Bildschirm
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), innen); saeule.position.set(-0.55, BR + 0.25, CZ1 + 0.6); saeule.rotation.x = -0.9; K.add(saeule);
  const lenkrad = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 22), innen); lenkrad.position.set(-0.55, BR + 0.45, CZ1 + 0.75); lenkrad.rotation.x = -1.0; K.add(lenkrad);
  for (const sx of [-0.55, 0.55]) {
    kasten(K, sx, BR + 0.05, CZ1 + 1.05, 0.55, 0.14, 0.5, mat(0x3a3a40));                 // Sitzfläche
    kasten(K, sx, BR + 0.45, CZ1 + 1.28, 0.55, 0.75, 0.12, mat(0x3a3a40));                // Lehne
    kasten(K, sx, BR + 0.95, CZ1 + 1.3, 0.3, 0.2, 0.1, mat(0x3a3a40));                    // Kopfstütze
  }
  kasten(K, 0, BR + 0.15, CZ1 + 0.9, 0.04, 0.3, 0.04, innen); const knauf = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0x111111)); knauf.position.set(0, BR + 0.32, CZ1 + 0.9); K.add(knauf);
  kasten(K, 0, (BR + CY2) / 2 + 0.1, CZ1 + GL + 0.04, CB - 0.3, CY2 - BR - 0.3, 0.03, mat(0x8a2a2a, { roughness: 1 }), false);   // Vorhang
  // Auspuff hinter dem Fahrerhaus
  const ap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10), chrom); ap.position.set(1.05, 2.4, -1.72); K.add(ap);
  // Räder: vorne lenken, hinten zwei Achsen – mit Kotflügeln
  const raeder = [];
  for (const sx of [-1, 1]) {
    const vr = baueRad(K, sx * 1.1, 0.6, -3.0, 0.6, 0.45, 1, mat(0xd8d8d8, { metalness: 0.5 }));
    raeder.push(vr);
    const kg2 = new THREE.CylinderGeometry(0.74, 0.74, 0.55, 18, 1, true, Math.PI / 2 - 1.0, 2.0); kg2.rotateZ(Math.PI / 2);
    const kf = new THREE.Mesh(kg2, mat(0x1e1f22, { side: THREE.DoubleSide })); kf.castShadow = true; vr.lenker.add(kf);   // Kotflügel vorne (lenkt mit)
    for (const z of [1.5, 2.8]) raeder.push(baueRad(K, sx * 1.1, 0.6, z, 0.6, 0.55, 0, mat(0xd8d8d8, { metalness: 0.5 })));
    kasten(K, sx * 1.1, 1.3, 2.15, 0.65, 0.08, 2.9, dunkel);               // Kotflügel hinten
    kasten(K, sx * 1.1, 0.6, 3.6, 0.6, 0.7, 0.04, dunkel, false);          // Schmutzfänger
    kasten(K, sx * 0.95, 1.05, 3.9, 0.4, 0.15, 0.06, rot, false);          // Rücklichter
  }
  // Die Kippmulde: dreht sich hinten unten (Gelenk), damit sie nach hinten kippen kann
  const mulde = new THREE.Group(); mulde.position.set(0, 1.25, 3.7); K.add(mulde);
  const L = 5.6, B = 2.4, H = 1.4;
  kasten(mulde, 0, 0.1, -L / 2, B, 0.2, L, muldeMat);                     // Boden
  for (const sx of [-1, 1]) kasten(mulde, sx * B / 2, 0.2 + H / 2, -L / 2, 0.08, H, L, muldeMat);   // Seitenwände
  kasten(mulde, 0, 0.2 + H / 2, -L, B, H + 0.3, 0.1, muldeMat);           // Stirnwand vorne
  kasten(mulde, 0, 0.2 + H / 2, -0.02, B, H, 0.08, muldeMat);             // Klappe hinten
  for (let k = 1; k < 6; k++) for (const sx of [-1, 1]) kasten(mulde, sx * (B / 2 + 0.05), 0.2 + H / 2, -k * L / 6, 0.05, H, 0.1, mat(0xb88010), false);   // Rippen
  const ladung = kasten(mulde, 0, 0.25, -L / 2, B - 0.15, 1, L - 0.15, mat(0xe3c46a, { roughness: 1 }), false);
  const zylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 10), chrom); zylinder.position.set(0, 1.2, -1.9); K.add(zylinder);   // Kipp-Zylinder
  return { raeder, auspuff: [1.05, 3.65, -1.72], sitz: [-0.55, 3.05, -3.3], beifahrerSitz: [0.55, 3.05, -3.3], radstand: 4.8, mulde: { g: mulde, ladung, zylinder, H } };
}
function lkwUpdate(fz, dt) {   // Ladung zeigen und beim Abladen die Mulde kippen
  const M = fz.mulde, voll = fz.typ.tankMax ? fz.tank / fz.typ.tankMax : 0;
  M.ladung.visible = voll > 0.005;
  M.ladung.scale.y = Math.max(0.01, voll * M.H);
  M.ladung.position.y = 0.2 + voll * M.H / 2;
  if (M.gut !== fz.gut) { M.gut = fz.gut; M.ladung.material.color.setHex((GUETER[fz.gut] || GUETER.korn).farbe); }
  if (fz.kipp > 0) fz.kipp -= dt;
  const ziel = fz.kipp > 0 ? 0.75 : 0;
  M.g.rotation.x += (ziel - M.g.rotation.x) * Math.min(1, dt * 2.5);
  M.zylinder.scale.y = 1 + M.g.rotation.x * 2.5; M.zylinder.position.y = 1.2 + M.g.rotation.x * 1.2;
  if (fz.kipp > 0.5 && Math.random() < dt * 12) { const p = new THREE.Vector3(0, 0.5, 4.2).applyMatrix4(fz.g.matrixWorld); staub(p.x, p.z, (GUETER[fz.gut] || GUETER.korn).farbe, 1.0, -0.4); }
}
// Der Häcksler (Feldhäcksler): großer Motor hinten, Kabine vorne – und oben das drehbare Auswurfrohr (der "Krümmer")
function baueHaecksler(typ, K) {
  const farbe = typ.farbe, dunkel = new THREE.Color(farbe).multiplyScalar(0.6).getHex();
  kasten(K, 0, 1.7, 0.6, 2.7, 1.9, 5.6, farbe);                   // Körper
  kasten(K, 0, 2.9, 1.8, 2.5, 0.6, 3.0, dunkel);                  // Motorhaube hinten
  for (let k = 0; k < 6; k++) kasten(K, 0, 3.22, 0.7 + k * 0.4, 2.2, 0.04, 0.12, 0x222222, false);   // Lüftungsschlitze
  kasten(K, 0, 1.2, -2.3, 2.3, 1.1, 1.0, 0x444444);               // Einzug (da kommt der Mais rein)
  kasten(K, 0, 2.7, -1.9, 2.0, 0.1, 1.8, farbe);                  // Kabine: Boden
  for (const [x, z] of [[-0.95, -2.75], [0.95, -2.75], [-0.95, -1.05], [0.95, -1.05]]) kasten(K, x, 3.4, z, 0.09, 1.3, 0.09, 0x222222);
  kasten(K, 0, 3.4, -1.9, 1.85, 1.25, 1.65, glasMat, false);      // Glas rundherum
  kasten(K, 0, 4.1, -1.9, 2.15, 0.14, 1.95, farbe);               // Dach
  const licht = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.7, -0.25, 0.25, 0.7]) kasten(K, x, 4.22, -2.82, 0.22, 0.12, 0.1, licht, false);
  kasten(K, 0, 3.0, -1.6, 0.55, 0.12, 0.55, 0x222222, false);     // Sitz
  kasten(K, 0, 3.35, -1.32, 0.5, 0.6, 0.1, 0x222222, false);      // Lehne
  kasten(K, 0.9, 3.9, 2.9, 0.16, 1.2, 0.16, 0x222222);            // Auspuff
  const raeder = [];
  for (const x of [-1.5, 1.5]) {
    raeder.push(baueRad(K, x, 0.95, -1.2, 0.95, 0.75, 0));        // Vorne: groß
    raeder.push(baueRad(K, x * 0.92, 0.7, 2.5, 0.7, 0.55, -1));   // Hinten: lenkt
  }
  // Der Krümmer: dreht sich um sich selbst (g), geht hoch und dann weit nach außen
  const g = new THREE.Group(); g.position.set(0, 3.25, 0.4); K.add(g);
  const rohrMat = mat(farbe, { metalness: 0.3, roughness: 0.5 });
  const fuss = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.0, 12), rohrMat); fuss.position.y = 0.5; fuss.castShadow = true; g.add(fuss);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.55), rohrMat); arm.position.set(1.8, 1.25, 0); arm.rotation.z = 0.18; arm.castShadow = true; g.add(arm);
  const klappe = kasten(g, 3.65, 1.45, 0, 0.6, 0.35, 0.5, dunkel); klappe.rotation.z = -0.5;   // Auswurfklappe vorne am Rohr
  const spitze = new THREE.Object3D(); spitze.position.set(3.9, 1.3, 0); g.add(spitze);
  g.rotation.y = -Math.PI / 2 - 0.6;
  return { raeder, auspuff: [0.9, 4.55, 2.9], sitz: [0, 3.65, -1.45], radstand: 3.7, kruemmer: { g, spitze } };
}
function kranStellen(fz, phi, d, h, dt) {   // Den Kran langsam zum Ziel bewegen (phi = Drehung, d = Weite, h = Höhe)
  const k = fz.kran, f = Math.min(1, dt * 4);
  let dp = phi - k.phi;
  while (dp > Math.PI) dp -= Math.PI * 2;
  while (dp < -Math.PI) dp += Math.PI * 2;
  k.phi += dp * f; k.d += (d - k.d) * f; k.h += (h - k.h) * f;
  k.turm.rotation.y = k.phi;
  const dy = k.h + 0.95 - 0.3, len = Math.hypot(k.d, dy);
  k.armG.rotation.x = Math.atan2(dy, k.d); k.arm.scale.z = len;
  k.kopf.position.set(0, k.h + 0.45, -k.d);
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
  } else if (art === 'presse') {   // Rundballenpresse: Pick-up vorne unten, runde Kammer hinten, zwei Räder
    const rotM = mat(0xc8231e, { roughness: 0.4, metalness: 0.2 });
    kasten(g, 0, 0.75, -1.25, 0.2, 0.15, 1.2, 0x333333);                         // Deichsel
    kasten(g, 0, 0.3, -0.45, 2.4, 0.3, 0.5, 0x444444);                           // Pick-up (sammelt das Stroh auf)
    for (let k = 0; k < 12; k++) kasten(g, -1.1 + k * 0.2, 0.18, -0.68, 0.03, 0.22, 0.03, 0xb0b0b0, false);   // Zinken
    const kammer = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 20), rotM); kammer.rotation.z = Math.PI / 2; kammer.position.set(0, 1.05, 0.35); kammer.castShadow = true; g.add(kammer);
    const klappe = new THREE.Mesh(new THREE.CylinderGeometry(0.87, 0.87, 1.72, 20, 1, false, 0, Math.PI), mat(0xf2f2f2)); klappe.rotation.z = Math.PI / 2; klappe.position.set(0, 1.05, 0.4); g.add(klappe);   // Heckklappe
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), mat(0x1b1b1b)); r.rotation.z = Math.PI / 2; r.position.set(sx * 1.0, 0.42, 0.2); g.add(r);
      kasten(g, sx * 0.86, 1.6, 0.9, 0.03, 0.18, 0.03, new THREE.MeshBasicMaterial({ color: 0xe0201e }), false);
    }
  } else if (art === 'maisgebiss') {   // Maisgebiss: viele grüne Spitzen, die zwischen die Maisreihen fahren
    kasten(g, 0, 0.55, 0.1, 4.5, 0.6, 1.1, 0x2f9a4a);
    kasten(g, 0, 0.3, -0.2, 4.5, 0.12, 1.2, 0x555555, false);
    for (let k = 0; k < 8; k++) {
      const spitze = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.2, 4), mat(k % 2 ? 0xf0c020 : 0x2f9a4a));
      spitze.rotation.x = -Math.PI / 2; spitze.position.set(-1.97 + k * 0.563, 0.45, -1.1); spitze.castShadow = true; g.add(spitze);
    }
    const trommel = new THREE.Group(); trommel.position.set(0, 0.75, -0.45); g.add(trommel);   // Dreht sich beim Häckseln (wie die Haspel)
    for (let k = 0; k < 4; k++) { const l = kasten(trommel, 0, 0, 0, 4.3, 0.07, 0.07, 0x222222, false); l.position.set(0, Math.sin(k / 4 * Math.PI * 2) * 0.22, Math.cos(k / 4 * Math.PI * 2) * 0.22); }
    g.userData.haspel = trommel;
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
  const teile = typ.art === 'drescher' ? baueDrescher(typ, K) : typ.art === 'harvester' ? baueHarvester(typ, K) : typ.art === 'haecksler' ? baueHaecksler(typ, K) : typ.art === 'lkw' ? baueLKW(typ, K) : baueTraktor(typ, K);
  const fz = {
    typName, typ, g, K, ...teile, speed: 0, lenkWinkel: 0, arbeitet: false, geraete: {},
    id: daten.id || `${mp.ich}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`, fahrer: null, fahrerZeit: 0, ziel: null,
    radius: (typ.art === 'drescher' ? 2.8 : typ.art === 'harvester' || typ.art === 'haecksler' ? 2.4 : typ.art === 'lkw' ? 2.6 : 1.8) * typ.groesse,
    werkzeug: typ.geraete.includes(daten.werkzeug) ? daten.werkzeug : typ.geraete[typ.geraete.length - 1],
    diesel: daten.diesel ?? typ.dieselMax, tank: daten.tank ?? 0, saat: daten.saat ?? typ.saatMax,
    gut: GUETER[daten.gut] ? daten.gut : 'korn', saatArt: daten.saatArt === 'mais' ? 'mais' : 'weizen',
  };
  for (const art of typ.geraete) {
    const m = baueGeraet(art), G = GERAETE[art];
    m.scale.set(typ.breite, typ.groesse, typ.groesse);
    m.position.z = typ.art === 'drescher' ? -3.9 : typ.art === 'haecksler' ? -3.4 : (G.hinten ? 3.0 : -2.9) * typ.groesse;
    g.add(m);
    fz.geraete[art] = m;
  }
  fz.schild = schild(`${typ.emoji} ${typ.name}`, '#ffffff', 5);
  if (fz.kran) kranStellen(fz, 0, 2.6, -0.2, 1);
  fz.schild.position.y = (typ.art === 'drescher' ? 6.8 : typ.art === 'haecksler' ? 5.6 : typ.art === 'lkw' ? 5 : 4.2) * typ.groesse;
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
  holz: { name: 'Holzanhänger', emoji: '🪵', preis: 25000, max: 24, farbe: 0x3d6b2a, laenge: 6, art: 'holz' },   // max = Holzstämme
};
const KUPPLUNG = 2.2;   // So weit hinter der Traktor-Mitte ist die Anhängerkupplung (mal Größe)
function neuerAnhaenger(typName, x, z, rot = 0, daten = {}) {
  const typ = ANHAENGER[typName], L = typ.laenge;
  const g = new THREE.Group(); scene.add(g);
  kasten(g, 0, 0.95, 0.3, 2.3, 0.25, L, 0x333333);                                  // Rahmen
  kasten(g, 0, 1.1, 0.3, 2.4, 0.1, L + 0.1, typ.farbe);                              // Boden
  let korn, holzTeile = null;
  if (typ.art === 'holz') {   // Holzanhänger: Rungen (senkrechte Stangen) statt Wänden, und Platz für Stämme
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) kasten(g, s * 1.12, 1.95, 0.3 - L / 2 + 0.4 + k * (L - 0.8) / 2, 0.1, 1.7, 0.1, 0x222222);
    kasten(g, 0, 1.95, 0.3 - L / 2, 2.4, 1.7, 0.12, typ.farbe);   // Stirnwand vorne (Schutzgitter)
    korn = new THREE.Group(); g.add(korn);   // (kein Korn)
    holzTeile = [];
    const stammGeo = new THREE.CylinderGeometry(0.26, 0.26, (L - 0.4) / 2 - 0.05, 10);
    for (let lage = 0; lage < 3; lage++) for (const hz of [-1, 1]) for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(stammGeo, [rindeMat, schnittMat, schnittMat]);
      st.rotation.x = Math.PI / 2; st.position.set(-0.81 + i * 0.54, 1.42 + lage * 0.48, 0.3 + hz * (L - 0.4) / 4);
      st.castShadow = true; st.visible = false; g.add(st); holzTeile.push(st);
    }
    holzTeile.sort((a, b) => a.position.y - b.position.y);   // Erst die unterste Lage füllen
  } else {
    for (const s of [-1, 1]) kasten(g, s * 1.17, 1.75, 0.3, 0.08, 1.2, L, typ.farbe);  // Seitenwände
    for (const s of [-1, 1]) kasten(g, 0, 1.75, 0.3 + s * L / 2, 2.4, 1.2, 0.08, typ.farbe);   // Vorne und hinten
    korn = kasten(g, 0, 1.2, 0.3, 2.2, 1, L - 0.15, mat(0xe3c46a, { roughness: 1 }), false);   // Das Korn drin (oder Häckselgut, Silage)
  }
  const deichsel = L / 2 + 1.4;   // Abstand von der Achse bis zur Kupplung vorne
  kasten(g, 0, 0.75, -(L / 2 + 1.4) / 2 - 0.1, 0.15, 0.15, deichsel - 0.4, 0x222222);   // Deichsel
  kasten(g, 0, 0.75, -deichsel + 0.1, 0.25, 0.2, 0.25, 0x555555);                   // Öse
  const raeder = [];
  const achsen = L > 6 ? [-0.7, 0.7] : [0];
  for (const az of achsen) for (const x of [-1.25, 1.25]) raeder.push(baueRad(g, x, 0.6, az, 0.6, 0.45, 0));
  for (const r of raeder) r.rad.parent.position.y = 0.6;
  const a = { id: daten.id || `${mp.ich}-a-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`, typName, typ, g, korn, holzTeile, raeder, deichsel,
    inhalt: daten.inhalt || 0, basis: daten.inhalt || 0, an: null, gut: GUETER[daten.gut] ? daten.gut : 'korn' };
  a.schild = schild(`${typ.emoji} ${typ.name}`, '#ffffff', 4.5);
  a.schild.position.y = 3.3; g.add(a.schild);
  g.position.set(x, 0, z); g.rotation.y = rot;
  anhaenger.push(a);
  return a;
}
const anhKupplung = (fz, ziel) => { fz.g.updateMatrixWorld(); return ziel.set(0, 0, (fz.typ.kupplung || KUPPLUNG) * fz.typ.groesse).applyMatrix4(fz.g.matrixWorld); };
const anhOese = (a, ziel) => ziel.set(-Math.sin(a.g.rotation.y) * a.deichsel, 0, -Math.cos(a.g.rotation.y) * a.deichsel).add(a.g.position);
function ankuppeln(fz, a) {
  if (a.an) a.an.anh = null;
  fz.anh = a; a.an = fz;
  // Gerade hinter den Traktor stellen
  const h = anhKupplung(fz, new THREE.Vector3());
  a.g.rotation.y = fz.g.rotation.y;
  a.g.position.set(h.x + Math.sin(fz.g.rotation.y) * a.deichsel, 0, h.z + Math.cos(fz.g.rotation.y) * a.deichsel);
  if (GERAETE[fz.werkzeug]?.hinten) fz.werkzeug = 'ernte';   // Hinten ist jetzt der Anhänger, kein Pflug
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
const kornAnh = fz => fz.anh && fz.anh.typ.art !== 'holz' ? fz.anh : null;   // Nur Kipper fassen Korn (kein Holzanhänger)
const holzAnh = fz => fz && fz.anh && fz.anh.typ.art === 'holz' ? fz.anh : null;
const kornPlatz = fz => fz.typ.tankMax + (kornAnh(fz) ? fz.anh.typ.max : 0);
const kornDrin = fz => fz.tank + (kornAnh(fz) ? fz.anh.inhalt : 0);
// Was ist gerade drin? (null = leer) – Korn, Häckselgut und Silage dürfen nicht gemischt werden!
const gutVon = fz => fz.tank > 0 ? (fz.gut || 'korn') : kornAnh(fz) && fz.anh.inhalt > 0 ? (fz.anh.gut || 'korn') : null;
const gutPasst = (fz, gut) => { const g = gutVon(fz); return !g || g === gut; };
const gutText = fz => { const g = gutVon(fz); return g ? `${GUETER[g].emoji} ${kg(kornDrin(fz))} ${GUETER[g].name}` : 'leer'; };
function kornDazu(fz, menge, gut = 'korn') {   // Erst in den eigenen Tank, dann in den Anhänger
  const inTank = Math.min(menge, fz.typ.tankMax - fz.tank);
  fz.tank += inTank;
  if (inTank > 0) fz.gut = gut;
  if (kornAnh(fz) && menge - inTank > 0) { fz.anh.inhalt += menge - inTank; fz.anh.gut = gut; }
}
function kornWeg(fz, menge) {   // Erst aus dem Anhänger, dann aus dem Tank
  if (fz.mulde && menge > 0 && fz.tank > 0) fz.kipp = 2.5;   // Lastwagen: Mulde kippen!
  if (kornAnh(fz)) { const ausAnh = Math.min(menge, fz.anh.inhalt); fz.anh.inhalt -= ausAnh; menge -= ausAnh; }
  fz.tank -= menge;
}
function naheAnhaengerZumKuppeln(fz) {
  const h = anhKupplung(fz, tmpA);
  return anhaenger.find(a => !a.an && anhOese(a, tmpB).distanceTo(h) < 2.5) || null;
}
function kuppeln() {
  if (!aktiv) { meldung('🔗 Steig in einen Traktor, um einen Anhänger anzukuppeln!'); sound.nein(); return; }
  if (aktiv.typ.art === 'drescher') { meldung('🌾 Der Mähdrescher kann keinen Anhänger ziehen – lade mit O in einen Anhänger über!'); sound.nein(); return; }
  if (aktiv.typ.art === 'harvester') { meldung('🦾 Der Harvester zieht keinen Anhänger – nimm einen Traktor!'); sound.nein(); return; }
  if (aktiv.typ.art === 'haecksler' && !aktiv.anh) { const a = naheAnhaengerZumKuppeln(aktiv); if (a && a.typ.art === 'holz') { meldung('🌽 In den Holzanhänger passt kein Häckselgut – nimm einen Kipper!'); sound.nein(); return; } }
  if (aktiv.anh) { const a = aktiv.anh; abkuppeln(aktiv); meldung(`🔓 ${a.typ.name} abgekuppelt.`); sound.klick(); return; }
  const a = naheAnhaengerZumKuppeln(aktiv);
  if (!a) { meldung('🔗 Fahr rückwärts mit der Kupplung an die Deichsel eines Anhängers (näher ran!)'); sound.nein(); return; }
  ankuppeln(aktiv, a);
  meldung(a.typ.art === 'holz' ? `🔗 ${a.typ.name} angekuppelt! Fahr zum Holz und drück L – der Kran lädt auf.` : aktiv.typ.art === 'haecksler' ? `🔗 ${a.typ.name} angekuppelt! Der Häcksler bläst den Mais jetzt hinten hinein. 🌽` : `🔗 ${a.typ.name} angekuppelt! Jetzt passen ${kg(kornPlatz(aktiv))} rein.`, 3);
  sound.tuer();
}
function ueberladenZiel() {   // Wohin kann der Mähdrescher sein Korn laden? (Fahrzeug oder Anhänger in der Nähe)
  if (!aktiv || aktiv.typ.art !== 'drescher') return null;
  const p = aktiv.g.position;
  let bestes = null, bestD = 11;
  for (const fz of fahrzeuge) {
    if (fz === aktiv || fz.typ.art === 'drescher') continue;
    const d = Math.hypot(fz.g.position.x - p.x, fz.g.position.z - p.z);
    if (d < bestD && kornDrin(fz) < kornPlatz(fz) && gutPasst(fz, 'korn')) { bestD = d; bestes = { fz }; }
  }
  for (const a of anhaenger) {
    if (a.an || a.typ.art === 'holz') continue;
    const d = Math.hypot(a.g.position.x - p.x, a.g.position.z - p.z);
    if (d < bestD && a.inhalt < a.typ.max && (a.inhalt <= 0 || (a.gut || 'korn') === 'korn')) { bestD = d; bestes = { a }; }
  }
  return bestes;
}
function ueberladen() {
  const z = ueberladenZiel();
  if (!aktiv || aktiv.typ.art !== 'drescher') { meldung('🌾 Überladen geht mit dem Mähdrescher (Taste O)!'); sound.nein(); return; }
  if (!z) { meldung('🚛 Fahr mit dem Mähdrescher neben einen Traktor mit Anhänger (oder einen Anhänger)!'); sound.nein(); return; }
  if (aktiv.tank <= 0) { meldung('Der Korntank vom Mähdrescher ist leer!'); sound.nein(); return; }
  let menge;
  if (z.fz) { menge = Math.min(aktiv.tank, kornPlatz(z.fz) - kornDrin(z.fz)); kornDazu(z.fz, menge); mpEvent({ t: 'korn', id: z.fz.id, m: menge, g: 'korn' }); }
  else { menge = Math.min(aktiv.tank, z.a.typ.max - z.a.inhalt); z.a.inhalt += menge; z.a.gut = 'korn'; }
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
function strohTextur() {   // Geflochtenes Stroh für den Hut
  if (strohTextur.t) return strohTextur.t;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#e6c35c'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
    g.fillStyle = ((x + y) / 8) % 2 ? 'rgba(150,100,30,0.35)' : 'rgba(255,240,180,0.35)';
    g.fillRect(x, y, 8, 4);
    g.fillStyle = 'rgba(120,80,20,0.3)'; g.fillRect(x, y + 7, 8, 1);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
  strohTextur.t = t;
  return t;
}
function baueFarmer(hemdFarbe) {   // Baut einen Bauern (für dich und für die anderen Spieler im Multiplayer)
  const player = new THREE.Group(), farmer = { phase: 0 };
  const haut = mat(0xe8b896), jeans = mat(0x2f4f86), hemd = new THREE.MeshStandardMaterial({ map: karoTextur(hemdFarbe), roughness: 0.9 });
  farmer.hemd = hemd;
  const schwarz = mat(0x111111), weiss = mat(0xffffff), bart = mat(0x6b4423);
  const stiefel = mat(0x2f5a2a, { roughness: 0.5 }), sohle = mat(0x1a1a1a), jeansHell = mat(0x3f62a0), naht = mat(0xd8a040);
  const handschuh = mat(0x9a6a3a), wange = mat(0xe89a8a), halstuch = mat(0xc8231e), messing = mat(0xd4af37, { metalness: 0.7, roughness: 0.3 });
  const hut = new THREE.MeshStandardMaterial({ map: strohTextur(), roughness: 1 }), hutband = mat(0xb3261e);
  const teil = (eltern, geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); t.castShadow = true; eltern.add(t); return t; };
  const B = (b, h, t) => new THREE.BoxGeometry(b, h, t);
  // Beine (drehen sich an der Hüfte): Latzhose mit Flicken am Knie, umgekrempelter Saum und grüne Gummistiefel
  for (const s of [-1, 1]) {
    const bein = new THREE.Group(); bein.position.set(s * 0.13, 0.92, 0); player.add(bein);
    teil(bein, B(0.2, 0.56, 0.22), jeans, 0, -0.3, 0);
    teil(bein, B(0.21, 0.06, 0.23), jeansHell, 0, -0.6, 0);                            // Umgekrempelter Saum
    if (s > 0) teil(bein, B(0.12, 0.12, 0.02), mat(0xb3261e), 0.01, -0.32, -0.115);   // Flicken am Knie (rot)
    teil(bein, B(0.21, 0.26, 0.23), stiefel, 0, -0.74, 0);                              // Gummistiefel
    teil(bein, B(0.21, 0.12, 0.14), stiefel, 0, -0.82, -0.15);                          // Stiefelspitze
    teil(bein, B(0.23, 0.05, 0.38), sohle, 0, -0.895, -0.06);                           // Sohle
    farmer[s < 0 ? 'beinL' : 'beinR'] = bein;
  }
  // Körper: kariertes Hemd mit Kragen, Latzhose mit Tasche, Trägern und Messingknöpfen
  teil(player, B(0.5, 0.62, 0.3), hemd, 0, 1.24, 0);
  for (const s of [-1, 1]) { const k = teil(player, B(0.13, 0.06, 0.12), hemd, s * 0.09, 1.56, -0.12); k.rotation.z = s * 0.35; }   // Kragen
  teil(player, B(0.52, 0.4, 0.32), jeans, 0, 1.08, 0);                                   // Latzhose unten
  teil(player, B(0.34, 0.26, 0.02), jeans, 0, 1.38, -0.16);                              // Latz vorne
  teil(player, B(0.18, 0.12, 0.01), jeansHell, 0, 1.38, -0.172);                         // Brusttasche
  teil(player, B(0.18, 0.01, 0.012), naht, 0, 1.44, -0.178);                             // Naht an der Tasche
  teil(player, B(0.03, 0.09, 0.01), mat(0xf2c200), 0.05, 1.42, -0.18);                   // Bleistift in der Tasche
  for (const s of [-1, 1]) {
    teil(player, B(0.07, 0.3, 0.33), jeans, s * 0.14, 1.44, 0);                          // Träger
    teil(player, B(0.06, 0.06, 0.02), messing, s * 0.13, 1.47, -0.18);                   // Knöpfe
    teil(player, B(0.1, 0.13, 0.01), jeansHell, s * 0.17, 1.02, -0.165);                 // Hosentaschen
  }
  teil(player, B(0.53, 0.012, 0.325), naht, 0, 1.28, 0);                                 // Naht oben an der Hose
  // Arme (drehen sich an der Schulter): hochgekrempelte Ärmel, braune Arbeitshandschuhe
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.33, 1.5, 0); player.add(arm);
    teil(arm, B(0.16, 0.32, 0.17), hemd, 0, -0.14, 0);                                   // Oberarm
    teil(arm, B(0.17, 0.07, 0.18), hemd, 0, -0.31, 0);                                   // Hochgekrempelter Ärmel
    teil(arm, B(0.13, 0.22, 0.14), haut, 0, -0.44, 0);                                   // Unterarm
    teil(arm, B(0.14, 0.13, 0.14), handschuh, 0, -0.6, 0);                               // Hand im Handschuh
    teil(arm, B(0.05, 0.08, 0.06), handschuh, -s * 0.07, -0.57, -0.05);                  // Daumen
    teil(arm, B(0.15, 0.04, 0.15), mat(0x7a4a22), 0, -0.535, 0);                         // Handschuh-Rand
    farmer[s < 0 ? 'armL' : 'armR'] = arm;
  }
  // Kopf mit freundlichem Gesicht
  const kopf = new THREE.Group(); kopf.position.set(0, 1.72, 0); player.add(kopf);
  teil(kopf, B(0.13, 0.1, 0.13), haut, 0, -0.14, 0);                                     // Hals
  const tuch = teil(kopf, B(0.2, 0.08, 0.2), halstuch, 0, -0.13, 0); tuch.rotation.y = Math.PI / 4;   // Halstuch
  const zipfel = teil(kopf, new THREE.ConeGeometry(0.06, 0.1, 4), halstuch, 0, -0.19, -0.1); zipfel.rotation.x = Math.PI;
  teil(kopf, B(0.3, 0.32, 0.3), haut, 0, 0.04, 0);
  teil(kopf, B(0.26, 0.05, 0.26), haut, 0, -0.13, 0);                                    // Kinn (etwas schmaler)
  for (const s of [-1, 1]) {
    teil(kopf, B(0.07, 0.06, 0.02), weiss, s * 0.07, 0.08, -0.152);                      // Augen: weiß ...
    teil(kopf, B(0.035, 0.045, 0.02), mat(0x3a2a1a), s * 0.065, 0.075, -0.158);         // ... mit Pupille
    teil(kopf, B(0.012, 0.012, 0.01), weiss, s * 0.055, 0.088, -0.166);                  // Glanzpunkt
    teil(kopf, B(0.09, 0.022, 0.02), bart, s * 0.07, 0.135, -0.155);                     // Augenbrauen
    teil(kopf, B(0.035, 0.09, 0.07), haut, s * 0.165, 0.04, 0);                          // Ohren
    teil(kopf, B(0.06, 0.035, 0.01), wange, s * 0.1, -0.01, -0.152);                     // Rote Bäckchen
    teil(kopf, B(0.035, 0.12, 0.08), bart, s * 0.152, 0.07, 0.04);                       // Koteletten
  }
  teil(kopf, B(0.06, 0.08, 0.07), mat(0xe0a585), 0, 0.02, -0.175);                       // Nase
  const schnurr = teil(kopf, B(0.2, 0.045, 0.035), bart, 0, -0.035, -0.16);              // Schnurrbart
  for (const s of [-1, 1]) { const e = teil(kopf, B(0.05, 0.035, 0.03), bart, s * 0.115, -0.05, -0.158); e.rotation.z = s * 0.5; }   // Gezwirbelte Enden
  teil(kopf, B(0.11, 0.02, 0.01), mat(0x8a3a2a), 0, -0.085, -0.152);                     // Lächelnder Mund ...
  for (const s of [-1, 1]) teil(kopf, B(0.02, 0.02, 0.01), mat(0x8a3a2a), s * 0.06, -0.075, -0.152);   // ... mit Mundwinkeln nach oben
  teil(kopf, B(0.31, 0.06, 0.31), bart, 0, 0.19, 0);                                     // Haare
  teil(kopf, B(0.31, 0.16, 0.04), bart, 0, 0.1, 0.15);                                   // Haare hinten
  // Strohhut mit geflochtener Struktur, gebogener Krempe und rotem Band
  const krempe = teil(kopf, new THREE.CylinderGeometry(0.4, 0.37, 0.05, 24, 1, true), hut, 0, 0.215, 0);
  krempe.material = hut.clone(); krempe.material.side = THREE.DoubleSide;
  teil(kopf, new THREE.CylinderGeometry(0.37, 0.37, 0.02, 24), hut, 0, 0.21, 0);
  teil(kopf, new THREE.CylinderGeometry(0.16, 0.2, 0.17, 18), hut, 0, 0.31, 0);
  teil(kopf, new THREE.CylinderGeometry(0.205, 0.205, 0.045, 18), hutband, 0, 0.255, 0);
  const delle = teil(kopf, B(0.2, 0.03, 0.04), mat(0xc9a44a), 0, 0.395, 0); delle.rotation.y = Math.PI / 2;   // Delle oben im Hut
  const halm = teil(kopf, B(0.012, 0.012, 0.16), mat(0xe8cf6a), 0.09, -0.05, -0.22); halm.rotation.y = -0.4; halm.rotation.x = -0.2;   // Strohhalm im Mund
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
  // Angel: hängt an der rechten Hand und zeigt schräg nach vorne-oben (erst mal versteckt)
  const angelG = new THREE.Group(); angelG.position.set(0, -0.6, 0); angelG.rotation.x = -0.43; angelG.visible = false;
  farmer.armR.add(angelG);
  const rutenFarbe = mat(0xffb020);   // Leuchtend gelb-orange, damit man sie gut sieht
  teil(angelG, new THREE.CylinderGeometry(0.07, 0.07, 0.35, 8), mat(0x222222), 0, 0, -0.05).rotation.x = Math.PI / 2;   // Griff
  teil(angelG, new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), mat(0xc0c4c8, { metalness: 0.6, roughness: 0.4 }), 0.12, -0.06, 0.02).rotation.z = Math.PI / 2;   // Rolle
  teil(angelG, new THREE.CylinderGeometry(0.035, 0.06, 2.2, 8), rutenFarbe, 0, 0, -1.2).rotation.x = Math.PI / 2;   // Rute
  const angelSpitze = new THREE.Object3D(); angelSpitze.position.set(0, 0, -2.3); angelG.add(angelSpitze);
  farmer.angel = angelG; farmer.angelSpitze = angelSpitze;
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
function farmerWerkzeug(t, saege, saegt, holz, angelt = 0) {
  t.saege.visible = saege;
  t.angel.visible = angelt > 0;
  if (angelt > 0) {   // Angel halten (angelt = 2: ein Fisch zappelt dran, die Rute wackelt!)
    t.armR.rotation.x = angelt === 3 ? 1.75 : 0.9; t.armL.rotation.x = angelt === 3 ? 1.2 : 0.6;   // 3 = Einholen: Angel hochreißen!
    t.angel.rotation.x = angelt === 2 ? -0.3 + Math.sin(spielZeit * 25) * 0.08 : -0.43;
    t.angel.rotation.z = angelt === 2 ? Math.sin(spielZeit * 11) * 0.12 : 0;
    return;
  }
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
egoSaege.visible = false; egoSaege.position.set(0.38, -0.32, -0.65);
camera.add(egoSaege);
const egoKette = [];   // Die Zähne der Kette (die laufen beim Sägen rundherum!)
{
  const E = egoSaege, haut = mat(0xe8b896), schwarz = mat(0x111111);
  const teil = (geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); E.add(t); return t; };
  teil(new THREE.BoxGeometry(0.16, 0.2, 0.3), mat(0xf07f13), 0, 0, 0);                          // Motor (orange)
  teil(new THREE.BoxGeometry(0.17, 0.04, 0.22), mat(0x222222), 0, 0.1, 0.02);                   // Deckel
  teil(new THREE.BoxGeometry(0.03, 0.05, 0.03), mat(0xd4af37), 0.09, 0.04, 0.06);              // Starter-Griff
  teil(new THREE.BoxGeometry(0.1, 0.05, 0.12), schwarz, 0, 0.06, 0.2);                          // Hinterer Griff
  teil(new THREE.BoxGeometry(0.15, 0.035, 0.035), schwarz, -0.075, 0.15, -0.1);                 // Vorderer Bügel
  teil(new THREE.BoxGeometry(0.035, 0.15, 0.035), schwarz, -0.01, 0.08, -0.1);
  teil(new THREE.BoxGeometry(0.03, 0.08, 0.75), mat(0xb5b9bf, { metalness: 0.6, roughness: 0.35 }), 0, -0.02, -0.52);   // Schwert
  // Hände und Ärmel (mit deinem karierten Hemd!)
  teil(new THREE.BoxGeometry(0.09, 0.08, 0.11), haut, 0.01, 0.1, 0.21);                         // Rechte Hand
  teil(new THREE.BoxGeometry(0.1, 0.1, 0.26), farmer.hemd, 0.02, -0.01, 0.33).rotation.x = 0.9;   // Kurzer Arm, geht schräg nach unten aus dem Bild
  teil(new THREE.BoxGeometry(0.09, 0.09, 0.09), haut, -0.13, 0.15, -0.1);                       // Linke Hand
  teil(new THREE.BoxGeometry(0.1, 0.1, 0.26), farmer.hemd, -0.15, 0.03, 0.0).rotation.x = 0.9;    // Linker Arm (kurz, damit er nicht vor der Kamera hängt)
  // Kette: kleine Zähne oben und unten am Schwert
  for (let k = 0; k < 28; k++) egoKette.push(teil(new THREE.BoxGeometry(0.042, 0.025, 0.022), schwarz, 0, 0, 0));
}
// ===== First-Person-Angel: Hand mit Angel unten rechts im Bild =====
const egoAngel = new THREE.Group();
egoAngel.visible = false; egoAngel.position.set(0.32, -0.36, -0.55);
camera.add(egoAngel);
const egoAngelSpitze = new THREE.Object3D();
{
  const E = egoAngel;
  const teil = (geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); E.add(t); return t; };
  teil(new THREE.BoxGeometry(0.09, 0.09, 0.12), mat(0xe8b896), 0, 0, 0.02);                                  // Hand
  teil(new THREE.BoxGeometry(0.1, 0.1, 0.26), farmer.hemd, 0.02, -0.08, 0.18).rotation.x = 0.9;              // Arm (kurz)
  teil(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8), mat(0x222222), 0, 0, 0).rotation.x = Math.PI / 2;  // Griff
  teil(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), mat(0xc0c4c8, { metalness: 0.6, roughness: 0.4 }), 0.05, -0.04, 0.05).rotation.z = Math.PI / 2;   // Rolle
  const rute = new THREE.Group(); rute.rotation.x = 0.55; E.add(rute);   // Rute zeigt schräg nach oben
  const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, 1.6, 8), mat(0xffb020)); r.rotation.x = Math.PI / 2; r.position.z = -0.85; rute.add(r);
  egoAngelSpitze.position.set(0, 0, -1.65); rute.add(egoAngelSpitze);
  egoAngel.userData.rute = rute;
}
// Die Angelschnur: eine dünne Linie von der Spitze der Rute bis zum Schwimmer
const angelSchnur = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff }));
angelSchnur.visible = false; angelSchnur.frustumCulled = false; scene.add(angelSchnur);
const schnurA = new THREE.Vector3();
function egoAngelUpdate(dt) {
  if (einholen && aktiv) einholenEnde();   // Ins Fahrzeug gestiegen: sofort fertig
  const zieht = !!einholen;
  const mitAngel = (!!angel || zieht) && !aktiv;
  const zeigen = mitAngel && ansicht === 'ego';
  egoAngel.visible = zeigen;
  const kampf = angel && angel.phase === 'kampf';
  if (zeigen) {
    const rute = egoAngel.userData.rute;
    const ziel = zieht ? 1.15 : kampf ? 0.75 + Math.sin(spielZeit * 25) * 0.06 : 0.55;   // Einholen: Rute hoch! · Fisch dran: Rute wackelt
    rute.rotation.x += (ziel - rute.rotation.x) * Math.min(1, dt * (zieht ? 10 : 30));
    rute.rotation.z = kampf ? Math.sin(spielZeit * 11) * 0.1 : 0;
  }
  angelSchnur.visible = mitAngel;
  if (!mitAngel) return;
  (zeigen ? egoAngelSpitze : farmer.angelSpitze).getWorldPosition(schnurA);
  if (zieht) einholenUpdate(dt, schnurA);
  if (!angel && !einholen) { angelSchnur.visible = false; return; }
  const sw = (angel || einholen).schwimmer.position;
  const pos = angelSchnur.geometry.attributes.position;
  pos.setXYZ(0, schnurA.x, schnurA.y, schnurA.z);
  pos.setXYZ(1, sw.x, sw.y, sw.z);
  pos.needsUpdate = true;
}
const KETTE_LANG = 0.72;
function egoSaegeUpdate(dt) {
  const zeigen = ansicht === 'ego' && saegeAn && !aktiv && !building;
  egoSaege.visible = zeigen;
  if (!zeigen) return;
  const r = saegt ? Math.sin(spielZeit * 55) * 0.006 : 0;                  // Rütteln beim Sägen
  const wackeln = mp.laeuft ? Math.sin(farmer.phase) * 0.015 : 0;         // Beim Laufen wippt die Säge
  const zielZ = saegt ? -0.8 : -0.65, zielKipp = saegt ? -0.05 : -0.15;  // Beim Sägen nach vorne in den Stamm drücken
  egoSaege.position.x = 0.38 + r;
  egoSaege.position.y = -0.32 + wackeln + r;
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
let harvSaegt = false;   // Sägt der Harvester gerade?
let saegeAn = false, saegt = false, saegeSprit = 100, getragen = 0;   // Motorsäge in der Hand? Sägst du gerade? Sprit in %, Holzstämme auf dem Rücken
const keys = {};
const gebaute = [];   // Was du gebaut hast: { art, x, z, rot, mesh, h, silo }
const silos = [];     // Alle Silos: { x, z, inhalt, schild }

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
  } else if (art === 'kleinsilo') {   // Kleines Silo: schmal und silbern
    const blech = mat(0xd6d9de, { metalness: 0.55, roughness: 0.35 });
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 6.5, 20), blech); rohr.position.y = 3.25; rohr.castShadow = true; g.add(rohr);
    for (let k = 1; k < 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.04, 6, 24), mat(0x9a9ea5)); ring.rotation.x = Math.PI / 2; ring.position.y = k * 1.6; g.add(ring); }
    const kuppel = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.3, 20), mat(0x8a8f96)); kuppel.position.y = 7.15; kuppel.castShadow = true; g.add(kuppel);
    kasten(g, 0, 3.6, 1.75, 0.4, 7, 0.06, 0x555555, false);                       // Leiter
  } else if (art === 'grosssilo') {   // Großsilo: riesig und breit, mit Wendeltreppe außen herum
    const blech = mat(0xc4c8ce, { metalness: 0.6, roughness: 0.3 });
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.8, 14, 32), blech); rohr.position.y = 7; rohr.castShadow = true; g.add(rohr);
    for (let k = 1; k < 7; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(4.83, 0.07, 6, 40), mat(0x8f949b)); ring.rotation.x = Math.PI / 2; ring.position.y = k * 2; g.add(ring); }
    const kuppel = new THREE.Mesh(new THREE.ConeGeometry(5.1, 3, 32), mat(0x7f858c)); kuppel.position.y = 15.5; kuppel.castShadow = true; g.add(kuppel);
    for (let k = 0; k < 28; k++) {   // Wendeltreppe
      const w = k * 0.42, st = kasten(g, Math.cos(w) * 5.25, 0.5 + k * 0.5, Math.sin(w) * 5.25, 0.9, 0.08, 0.5, 0x555555, false); st.rotation.y = -w;
    }
    kasten(g, 0, 17.2, 0, 1.4, 1, 1.4, 0x666a70);                                 // Häuschen oben
    kasten(g, 0, 1.6, 4.85, 2.6, 3.2, 0.1, 0x3a3f45, false);                       // Tor unten
  } else if (art === 'hochsilo') {   // Silage-Hochsilo: hoch, dunkelblau, mit runder Kuppel und Rohr an der Seite
    const blau = mat(0x1f3f8a, { metalness: 0.35, roughness: 0.3 });
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 16, 28), blau); rohr.position.y = 8; rohr.castShadow = true; g.add(rohr);
    const kuppel = new THREE.Mesh(new THREE.SphereGeometry(3.05, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8d8d8, { metalness: 0.4, roughness: 0.4 }));
    kuppel.position.y = 16; kuppel.castShadow = true; g.add(kuppel);
    const fuell = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 19, 10), mat(0xb0b4ba, { metalness: 0.5 })); fuell.position.set(3.25, 9.5, 0); g.add(fuell);   // Füllrohr
    const bogen = new THREE.Mesh(new THREE.TorusGeometry(1, 0.25, 8, 12, Math.PI / 2), mat(0xb0b4ba)); bogen.position.set(2.25, 19, 0); g.add(bogen);
    kasten(g, 3.25, 0.8, 0, 1.2, 1.6, 1.2, 0x5a5f66);                              // Gebläse unten
    for (let k = 0; k < 6; k++) kasten(g, 0, 1.5 + k * 2.5, 3.02, 0.7, 0.6, 0.06, 0xf2c200, false);   // Gelbe Luken
  } else if (art === 'futtersilo') {   // Futtersilo: steht auf 4 Beinen, unten spitz (ein Trichter)
    const gruen = mat(0x3f8f4a, { metalness: 0.3, roughness: 0.5 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kasten(g, sx * 1.05, 1.6, sz * 1.05, 0.15, 3.2, 0.15, 0x666666);
    const trichter = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.6, 16), gruen); trichter.rotation.x = Math.PI; trichter.position.y = 2.6; trichter.castShadow = true; g.add(trichter);
    const rohr = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 4, 16), gruen); rohr.position.y = 5.4; rohr.castShadow = true; g.add(rohr);
    const deckel = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 16), mat(0xd8d8d8)); deckel.position.y = 7.85; g.add(deckel);
    const schnecke = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), mat(0x999999)); schnecke.position.set(0, 1.2, 1.4); schnecke.rotation.x = 1.0; g.add(schnecke);   // Förderschnecke
  } else if (art === 'gewaechshaus') {   // Ein Glashaus mit weißem Rahmen und zwei Beeten drin
    const W = 7, L = 10, H = 2.6;
    const glas = new THREE.MeshStandardMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const rahmen = mat(0xf2f2f2, { metalness: 0.3, roughness: 0.4 });
    kasten(g, 0, 0.15, 0, W, 0.3, L, 0x9a9a9a);                                  // Sockel
    kasten(g, 0, 0.3 + H / 2, 0, W, H, L, glas, false);                         // Glaswände
    const form = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, 1.7)]);
    const dachGeo = new THREE.ExtrudeGeometry(form, { depth: L, bevelEnabled: false }); dachGeo.translate(0, 0, -L / 2);
    const dach = new THREE.Mesh(dachGeo, glas); dach.position.y = 0.3 + H; g.add(dach);
    for (const x of [-W / 2, W / 2]) for (let k = 0; k <= 4; k++) kasten(g, x, 0.3 + H / 2, -L / 2 + k * L / 4, 0.08, H, 0.08, rahmen);   // Pfosten
    kasten(g, 0, 0.3 + H + 1.7, 0, 0.1, 0.1, L, rahmen);                          // First
    for (const x of [-W / 2, W / 2]) kasten(g, x, 0.3 + H, 0, 0.1, 0.1, L, rahmen);
    for (let k = 0; k <= 4; k++) for (const sx of [-1, 1]) {                      // Dachsparren
      const sp = kasten(g, sx * W / 4, 0.3 + H + 0.85, -L / 2 + k * L / 4, W / 2 + 0.3, 0.07, 0.07, rahmen, false);
      sp.rotation.z = -sx * Math.atan2(1.7, W / 2);
    }
    kasten(g, 0, 1.3, L / 2 + 0.02, 1.4, 2.0, 0.06, 0x4f7f9f, false);            // Tür vorne
    for (const x of [-1.7, 1.7]) {                                               // Beete mit Erde
      kasten(g, x, 0.35, 0, 1.6, 0.3, L - 1, 0x7a5230);
      kasten(g, x, 0.42, 0, 1.4, 0.06, L - 1.2, 0x4f331c, false);
    }
  } else if (art === 'teich') {   // Fischteich: Wasser, Ufer aus Sand und Steinen, Schilf und Seerosen
    const ufer = new THREE.Mesh(new THREE.RingGeometry(4.9, 6, 40), mat(0xb8a47a)); ufer.rotation.x = -Math.PI / 2; ufer.position.y = 0.05; ufer.receiveShadow = true; g.add(ufer);
    const grund = new THREE.Mesh(new THREE.CircleGeometry(5, 40), mat(0x2a3f2a)); grund.rotation.x = -Math.PI / 2; grund.position.y = 0.02; g.add(grund);
    const wasser = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshStandardMaterial({ color: 0x2f7fb0, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.72, depthWrite: false }));
    wasser.rotation.x = -Math.PI / 2; wasser.position.y = 0.1; wasser.renderOrder = 1; g.add(wasser);
    for (let k = 0; k < 14; k++) {   // Steine am Ufer
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + (k % 3) * 0.12), mat(0x8a8a8a, { flatShading: true }));
      const w = k / 14 * Math.PI * 2 + 0.2; st.position.set(Math.cos(w) * 5.4, 0.1, Math.sin(w) * 5.4); st.castShadow = true; g.add(st);
    }
    const schilf = [];
    for (const w0 of [0.8, 2.6, 4.3]) for (let k = 0; k < 9; k++) {
      const w = w0 + (k - 4) * 0.05, rr = 4.7 + (k % 3) * 0.25, h = 1 + (k % 4) * 0.3;
      schilf.push(new THREE.BoxGeometry(0.04, h, 0.04).translate(Math.cos(w) * rr, h / 2, Math.sin(w) * rr));
      if (k % 3 === 0) schilf.push(new THREE.BoxGeometry(0.09, 0.3, 0.09).translate(Math.cos(w) * rr, h, Math.sin(w) * rr));   // Rohrkolben
    }
    g.add(new THREE.Mesh(mergeGeometries(schilf), windMaterial(mat(0x6b7a2a), 1)));
    for (const [x, z] of [[1.5, -2], [-2.2, 1], [2.5, 1.8]]) {   // Seerosen
      const blatt = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), mat(0x3f8f2a)); blatt.rotation.x = -Math.PI / 2; blatt.position.set(x, 0.12, z); g.add(blatt);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xffd6e8)); bl.position.set(x + 0.1, 0.17, z); g.add(bl);
    }
  } else if (OBST[art]) {   // Obstbaum: Stamm + Krone (die Früchte kommen später dazu)
    const stamm = new THREE.Mesh(stammGeo, mat(0x6b4423)); stamm.castShadow = true; g.add(stamm);
    const krone = new THREE.Mesh(kroneGeo, windMaterial(mat(OBST[art].krone, { flatShading: true }), 0.15)); krone.castShadow = true; g.add(krone);
  } else if (GEBAEUDE_ARTEN[art].holz) {   // Eigener kleiner Wald: 5 Bäume einer Holzsorte
    const H = HOLZARTEN[GEBAEUDE_ARTEN[art].holz], R = GEBAEUDE_ARTEN[art].r - 0.5;
    const boden = new THREE.Mesh(new THREE.CircleGeometry(R, 24), mat(0x4a5a2a));
    boden.rotation.x = -Math.PI / 2; boden.position.y = 0.03; boden.receiveShadow = true; g.add(boden);
    const stammMat = mat(H.stamm), kroneMat = windMaterial(mat(H.krone, { flatShading: true }), 0.15);
    g.userData.baeume = [];
    for (let k = 0; k < WALD_BAEUME_PLOT; k++) {
      const w = k / (WALD_BAEUME_PLOT - 1) * Math.PI * 2, rr = k === 0 ? 0 : R * 0.62;
      const x = Math.cos(w) * rr, z = Math.sin(w) * rr;
      const baum = new THREE.Group(); baum.position.set(x, 0, z); baum.rotation.y = k * 1.7; g.add(baum);
      const stamm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 4, 8), stammMat); stamm.position.y = 2; stamm.castShadow = true; baum.add(stamm);
      const krone = new THREE.Mesh(new THREE.IcosahedronGeometry(H.form === 'schmal' ? 1.4 : H.form === 'breit' ? 2.3 : 1.9, 1), kroneMat);
      krone.castShadow = true; krone.position.y = H.form === 'schmal' ? 5.4 : 4.9;
      if (H.form === 'schmal') krone.scale.set(1, 1.8, 1); else if (H.form === 'breit') krone.scale.set(1.25, 0.8, 1.25);
      baum.add(krone);
      const stumpf = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.45, 8), stammMat); stumpf.position.set(x, 0.22, z); g.add(stumpf);
      g.userData.baeume.push(baum);
    }
  } else if (art === 'werkbank') {   // Werkbank mit Grill, Schneidebrett und Würsten zum Räuchern
    const brett = new THREE.MeshStandardMaterial({ map: bretterTextur('#9a6a3a'), roughness: 0.9 });
    kasten(g, 0, 0.95, 0, 2.6, 0.12, 1.1, brett);                                                      // Tischplatte
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kasten(g, sx * 1.15, 0.45, sz * 0.45, 0.12, 0.9, 0.12, 0x6b4423);   // Beine
    kasten(g, 0, 0.3, 0, 2.3, 0.06, 0.9, 0x6b4423);                                                    // Ablage unten
    kasten(g, -0.65, 1.16, 0, 0.95, 0.3, 0.75, 0x222222);                                              // Grill
    kasten(g, -0.65, 1.21, 0, 0.85, 0.04, 0.65, mat(0xff5a1e, { emissive: 0xff3300, emissiveIntensity: 0.9 }), false);   // Glut
    for (let k = 0; k < 6; k++) kasten(g, -0.65, 1.32, -0.3 + k * 0.12, 0.9, 0.02, 0.02, 0x999999, false);   // Grillrost
    kasten(g, 0.35, 1.03, 0.1, 0.55, 0.04, 0.38, 0xd8b07a);                                            // Schneidebrett
    const schale = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.1, 12), mat(0xeeeeee)); schale.position.set(0.35, 1.06, -0.32); g.add(schale);   // Salzschale
    for (const sz of [-0.42, 0.42]) kasten(g, 1.0, 1.55, sz, 0.06, 1.1, 0.06, 0x6b4423);              // Räucher-Gestell
    kasten(g, 1.0, 2.08, 0, 0.06, 0.06, 0.9, 0x6b4423);
    for (let k = 0; k < 4; k++) {   // Würste hängen zum Räuchern
      const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.35, 4, 8), mat(0x9a3a24)); w.position.set(1.0, 1.82, -0.3 + k * 0.2); w.castShadow = true; g.add(w);
    }
  } else if (art === 'bienenstock') {   // Bienenstock: weiße Kisten übereinander auf einem Holzgestell, mit Flugloch
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kasten(g, sx * 0.35, 0.2, sz * 0.3, 0.08, 0.4, 0.08, 0x6b4423);   // Beine
    kasten(g, 0, 0.42, 0, 0.9, 0.06, 0.75, 0x8a5a32);                               // Brett
    const farben = [0xf6f1e0, 0xf2d36b, 0xf6f1e0];
    for (let k = 0; k < 3; k++) kasten(g, 0, 0.66 + k * 0.42, 0, 0.8, 0.4, 0.65, farben[k]);   // Drei Kisten (Zargen)
    kasten(g, 0, 1.94, 0, 0.92, 0.1, 0.77, 0x8a8f96);                               // Blechdeckel
    kasten(g, 0, 0.5, 0.33, 0.4, 0.06, 0.03, 0x222222, false);                       // Flugloch
    kasten(g, 0, 0.47, 0.42, 0.5, 0.03, 0.18, 0xd8b07a, false);                       // Landebrett
  } else if (GEBAEUDE_ARTEN[art].haustier) {   // Hundehütte oder Katzenkorb
    if (GEBAEUDE_ARTEN[art].haustier === 'hund') {
      kasten(g, 0, 0.55, 0, 1.3, 1.1, 1.5, new THREE.MeshStandardMaterial({ map: bretterTextur('#b5743a'), roughness: 0.95 }));
      for (const s of [-1, 1]) { const d = kasten(g, s * 0.42, 1.3, 0, 0.95, 0.08, 1.7, 0xa8322a); d.rotation.z = -s * 0.65; }
      kasten(g, 0, 0.45, 0.76, 0.6, 0.7, 0.03, 0x1a1a1a, false);                    // Eingang
      kasten(g, 0.9, 0.08, 0.6, 0.4, 0.12, 0.4, 0xc23b22);                           // Napf
    } else {
      const korb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.25, 16, 1, true), mat(0xc8a060, { side: THREE.DoubleSide }));
      korb.position.y = 0.13; korb.castShadow = true; g.add(korb);
      const kissen = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16), mat(0xd85a8a)); kissen.position.y = 0.06; g.add(kissen);
      kasten(g, 0.7, 0.05, 0.2, 0.3, 0.08, 0.3, 0x4a8fd8);                            // Napf
    }
  } else if (art === 'garage3') {   // 3er-Garage: drei Stellplätze nebeneinander, vorne Rolltore, die von allein aufgehen
    const W = GARAGE.breite, T = GARAGE.tief, H = GARAGE.hoch, P = W / 3;
    const wand = new THREE.MeshStandardMaterial({ map: bretterTextur('#c8b89a'), roughness: 0.95 }), beton = mat(0x9a968e, { roughness: 1 });
    kasten(g, 0, 0.04, 0, W, 0.08, T, beton);                                       // Betonboden
    kasten(g, 0, H / 2, -T / 2, W + 0.3, H, 0.3, wand);                             // Rückwand
    for (const sx of [-1, 1]) kasten(g, sx * W / 2, H / 2, 0, 0.3, H, T, wand);     // Seitenwände
    for (const sx of [-1, 1]) kasten(g, sx * P / 2, H / 2, -0.25, 0.25, H, T - 0.5, wand);   // Trennwände zwischen den Plätzen
    kasten(g, 0, H - 0.3, T / 2, W + 0.3, 0.6, 0.3, mat(0x8a6a4a));                 // Balken über den Toren
    const dach = kasten(g, 0, H + 0.45, 0, W + 1.2, 0.25, T + 1.4, mat(0x7a3a2a)); dach.rotation.x = 0.06;   // Dach (leicht schräg)
    for (let k = 0; k < 3; k++) for (const lz of [-2, 2]) kasten(g, (k - 1) * P, H - 0.08, lz, 1.2, 0.08, 0.25, new THREE.MeshBasicMaterial({ color: 0xfff6d0 }), false);   // Lampen an der Decke
    g.userData.tore = [];
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * P;
      // Rolltor mit Rillen
      const tor = new THREE.Group(); tor.position.set(x, 0, T / 2 + 0.05); g.add(tor);
      const blatt = kasten(tor, 0, (H - 0.6) / 2, 0, P - 0.45, H - 0.6, 0.08, mat(0xe8e8e8, { metalness: 0.3, roughness: 0.5 }));
      for (let r = 1; r < 9; r++) kasten(blatt, 0, -(H - 0.6) / 2 + r * (H - 0.6) / 9, 0.05, P - 0.5, 0.03, 0.02, mat(0xaaaaaa), false);   // Rillen
      g.userData.tore.push({ tor, blatt, auf: 0 });
      // Nummer über dem Tor
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const gg = c.getContext('2d'); gg.fillStyle = '#ffd166'; gg.beginPath(); gg.arc(32, 32, 30, 0, 7); gg.fill();
      gg.fillStyle = '#17251d'; gg.font = 'bold 44px Arial'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(String(k + 1), 32, 35);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const nr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); nr.position.set(x, H - 0.3, T / 2 + 0.17); g.add(nr);
    }
  } else if (art === 'fahrsilo') {   // Silagesilo: Betonboden, zwei hohe Wände, vorne und hinten offen (zum Durchfahren!)
    const beton = mat(0xa8a49a, { roughness: 1 });
    const L = FS_LANG * 2, W = FS_BREIT + 0.2;
    kasten(g, 0, 0.08, 0, W * 2 + 0.4, 0.16, L, beton);                            // Boden
    for (const sx of [-1, 1]) {
      kasten(g, sx * W, FS_WAND / 2, 0, 0.4, FS_WAND, L, beton);                   // Wand
      for (let z = -FS_LANG + 3; z < FS_LANG; z += 3) kasten(g, sx * (W + 0.21), FS_WAND / 2, z, 0.04, FS_WAND, 0.06, 0x8a867c, false);   // Fugen zwischen den Betonteilen
      kasten(g, sx * W, FS_WAND + 0.03, 0, 0.42, 0.06, L, 0xffd166, false);         // Gelbe Kante oben
    }
    // Der Haufen: von der Seite ein Trapez (vorne und hinten schräg – da fährst du hoch!), 1 Meter hoch – wird mit scale.y größer
    const hl = FS_LANG - 0.6, ol = hl - FS_RAMPE;
    const form = new THREE.Shape([new THREE.Vector2(-hl, 0), new THREE.Vector2(hl, 0), new THREE.Vector2(ol, 1), new THREE.Vector2(-ol, 1)]);
    const haufenGeo = new THREE.ExtrudeGeometry(form, { depth: FS_BREIT * 2 - 0.4, bevelEnabled: false });
    haufenGeo.translate(0, 0, -(FS_BREIT - 0.2)); haufenGeo.rotateY(Math.PI / 2);
    const haufen = new THREE.Mesh(haufenGeo, mat(GUETER.haeckselgut.farbe, { roughness: 1, flatShading: true }));
    haufen.position.y = 0.16; haufen.receiveShadow = true; haufen.castShadow = true; haufen.visible = false; g.add(haufen);
    const folie = new THREE.Mesh(haufenGeo, mat(0x1a1a1a, { roughness: 0.35, metalness: 0.1 }));   // Schwarze Silofolie
    folie.position.y = 0.16; folie.scale.set(1.02, 1, 1.02); folie.visible = false; g.add(folie);
    const reifen = new THREE.Group(); reifen.visible = false; g.add(reifen);       // Alte Autoreifen halten die Folie fest
    const reifenGeo = new THREE.TorusGeometry(0.32, 0.13, 6, 14);
    for (let rx = -FS_BREIT + 1.5; rx < FS_BREIT - 1; rx += 3) for (let rz = -FS_LANG + FS_RAMPE + 1.5; rz < FS_LANG - FS_RAMPE - 1; rz += 3) {
      const r = new THREE.Mesh(reifenGeo, mat(0x161616)); r.rotation.x = Math.PI / 2;
      r.position.set(rx, 0.1, rz); r.castShadow = true; reifen.add(r);
    }
    g.userData.fs = { haufen, folie, reifen };
  } else if (GEBAEUDE_ARTEN[art].tier) {   // Ein rundes Gehege mit Holzzaun, Unterstand und Futtertrog
    const R = GEBAEUDE_ARTEN[art].r - 0.3, huhn = art === 'huehnerhof';
    const boden = new THREE.Mesh(new THREE.CircleGeometry(R, 32), mat(huhn ? 0x9b7b4a : 0x5f8f3a));
    boden.rotation.x = -Math.PI / 2; boden.position.y = 0.03; boden.receiveShadow = true; g.add(boden);
    const teile = [], n = Math.max(14, Math.round(Math.PI * 2 * R / 2.2)), schritt = Math.PI * 2 / n;
    for (let k = 0; k < n; k++) {
      const a = k * schritt, m = a + schritt / 2, laenge = 2 * R * Math.sin(schritt / 2);
      teile.push(new THREE.BoxGeometry(0.16, 1.4, 0.16).translate(Math.cos(a) * R, 0.7, Math.sin(a) * R));                 // Pfosten
      for (const y of huhn ? [0.25, 0.55, 0.85, 1.15] : [0.55, 1.1]) {                                                       // Latten
        teile.push(new THREE.BoxGeometry(laenge, 0.1, 0.05).rotateY(-m - Math.PI / 2).translate(Math.cos(m) * R * Math.cos(schritt / 2), y, Math.sin(m) * R * Math.cos(schritt / 2)));
      }
    }
    const zaun = new THREE.Mesh(mergeGeometries(teile), mat(0x8a5a32)); zaun.castShadow = true; g.add(zaun);
    if (huhn) {   // Hühnerstall: kleines rotes Häuschen mit Rampe
      kasten(g, 0, 0.9, -R + 1.6, 2.4, 1.2, 1.8, 0xc23b22);
      const d = kasten(g, 0, 1.75, -R + 1.6, 2.7, 0.12, 2.1, 0x5b2a22); d.rotation.x = 0.2;
      const rampe = kasten(g, 0, 0.35, -R + 3.0, 0.5, 0.05, 1.2, 0x8a5a32, false); rampe.rotation.x = 0.55;
    } else {      // Unterstand mit Dach
      kasten(g, 0, 1.25, -R + 0.9, 4.6, 2.5, 0.15, new THREE.MeshStandardMaterial({ map: bretterTextur('#8a5a32'), roughness: 0.95 }));
      kasten(g, 0, 2.55, -R + 2.0, 4.9, 0.15, 2.6, 0x6b3a2a);
      for (const x of [-2.2, 2.2]) kasten(g, x, 1.25, -R + 3.1, 0.15, 2.5, 0.15, 0x6b4a2b);
    }
    // Futtertrog mit Futter drin (das Futter wird weniger, wenn die Tiere fressen)
    kasten(g, R * 0.55, 0.3, R * 0.35, 2.2, 0.5, 0.7, 0x7a5230);
    const futter = kasten(g, R * 0.55, 0.52, R * 0.35, 2.0, 0.06, 0.5, 0xe3c46a, false);
    g.userData.trog = futter;
    const salz = kasten(g, -R * 0.55, 0.25, R * 0.35, 0.5, 0.45, 0.5, mat(0xf2b8c6, { roughness: 0.4 })); salz.visible = false;   // Salz-Leckstein
    g.userData.salz = salz;
  } else {
    const stamm = new THREE.Mesh(stammGeo, mat(0x694020)); stamm.castShadow = true; g.add(stamm);
    const krone = new THREE.Mesh(kroneGeo, mat(0x1f7a30, { flatShading: true })); krone.castShadow = true; g.add(krone);
  }
  return g;
}
function neuesSilo(x, z, inhalt = 0, art = 'silo') {
  const A = GEBAEUDE_ARTEN[art];
  const s = { x, z, inhalt, basis: inhalt, art, max: A.silo.max, gut: A.silo.gut, r: A.r, roh: 0, rohBasis: 0, takt: 0, schild: schild('', '#fff', 7) };
  s.schild.position.set(x, A.silo.hoch, z);
  scene.add(s.schild);
  silos.push(s);
  siloSchild(s);
  return s;
}
function siloSchild(s) {
  const voll = s.inhalt >= s.max ? '#ff9a6b' : '#ffd166';
  if (s.gut === 'silage') s.schild.userData.malen(`🟫 ${kg(s.inhalt - s.roh)}${s.roh > 0 ? ` · ⏳ ${kg(s.roh)}` : ''}`, voll);
  else if (s.gut === 'futter') s.schild.userData.malen(`🐄 Futter ${kg(s.inhalt)}`, voll);
  else s.schild.userData.malen(`${GEBAEUDE_ARTEN[s.art].emoji} ${kg(s.inhalt)}`, voll);
}
const siloName = s => GEBAEUDE_ARTEN[s.art].name;
function siloUpdate(dt) {   // Hochsilo: Häckselgut gärt von allein · Futtersilo: füllt die Futtertröge in der Nähe
  for (const s of silos) {
    s.takt -= dt;
    if (s.gut === 'silage' && s.roh > 0) {
      s.roh = Math.max(0, s.roh - Math.max(60, s.roh / HOCHSILO_GAER) * dt);
      if (s.takt <= 0 || s.roh <= 0) { s.takt = 1; siloSchild(s); }
    }
    if (s.gut === 'futter' && s.takt <= 0) {
      s.takt = 2;
      if (mp.aktiv && mp.rolle !== 'host') continue;   // Das macht nur der Gastgeber
      for (const b of gebaute) {
        if (!b.geh || !b.geh.tiere.length || s.inhalt <= 0 || Math.hypot(b.x - s.x, b.z - s.z) > FUTTERSILO_WEITE) continue;
        const m = Math.min(s.inhalt, FUTTER_MAX - b.geh.futter);
        if (m < 50) continue;
        s.inhalt -= m; b.geh.futter += m; gebSenden(b); siloSchild(s);
      }
    }
  }
}
// Was passt in welches Silo?
const siloNimmt = (s, gut) => s.gut === 'korn' ? gut === 'korn' : s.gut === 'silage' ? gut === 'haeckselgut' || gut === 'silage' : gut !== 'stroh';
function gebaeudeHinzu(art, x, z, rot, inhalt = 0, daten = null) {
  const mesh = baueGebaeudeMesh(art);
  mesh.position.set(x, 0, z); mesh.rotation.y = rot;
  scene.add(mesh);
  const h = { x, z, r: GEBAEUDE_ARTEN[art].r };
  hindernisse.push(h);
  const b = { art, x, z, rot, mesh, h, silo: GEBAEUDE_ARTEN[art].silo ? neuesSilo(x, z, inhalt, art) : null, extra: [] };
  if (art === 'gewaechshaus') ghEinrichten(b);
  if (GEBAEUDE_ARTEN[art].tier) gehegeEinrichten(b);
  if (OBST[art]) obstEinrichten(b);
  if (art === 'teich') teichEinrichten(b);
  if (GEBAEUDE_ARTEN[art].holz) waldPlotEinrichten(b);
  if (art === 'fahrsilo') fahrsiloEinrichten(b);
  if (art === 'garage3') garageEinrichten(b);
  if (art === 'bienenstock') bienenEinrichten(b);
  if (GEBAEUDE_ARTEN[art].haustier) { b.h.r = 0.5; b.tier = haustierNeu(GEBAEUDE_ARTEN[art].haustier, x, z, rot, null); b.extra.push(b.tier.g, b.tier.schild); }
  if (art === 'werkbank') { b.werkbank = true; b.schild = schild('🛠️ Werkbank · P', '#ffd166', 5); b.schild.position.set(x, 2.9, z); scene.add(b.schild); b.extra.push(b.schild); }
  if (art === 'teich' || art === 'gewaechshaus') grasWeg(x, z, GEBAEUDE_ARTEN[art].r + 0.3);
  if (daten) gebDatenSetzen(b, daten);
  gebaute.push(b);
}

// ===== 🐝 Bienen und Honig =====
const bienenGeo = new THREE.SphereGeometry(0.06, 6, 4), bienenMat = new THREE.MeshBasicMaterial({ color: 0xf2c200 });
const fluegelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
function bienenEinrichten(b) {
  b.biene = { lager: 0, takt: 0, g: new THREE.Group(), summTakt: 0 };
  for (let k = 0; k < 14; k++) {   // Kleine Bienen, die um den Stock fliegen (gelb mit schwarzem Streifen und Flügeln)
    const biene = new THREE.Group();
    const koerper = new THREE.Mesh(bienenGeo, bienenMat); koerper.scale.set(1, 0.8, 1.5); biene.add(koerper);
    kasten(biene, 0, 0, 0, 0.125, 0.1, 0.04, 0x111111, false);
    for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), fluegelMat); f.position.set(s * 0.06, 0.05, 0); f.rotation.x = -Math.PI / 2; biene.add(f); }
    biene.userData = { ph: Math.random() * 6.28, r: 1 + Math.random() * 3.5, h: 0.6 + Math.random() * 1.8, v: 0.6 + Math.random() * 0.9 };
    b.biene.g.add(biene);
  }
  b.biene.g.position.set(b.x, 0, b.z); scene.add(b.biene.g); b.extra.push(b.biene.g);
  b.schild = schild('', '#fff', 5); b.schild.position.set(b.x, 3, b.z); scene.add(b.schild); b.extra.push(b.schild);
  bienenSchild(b);
}
const bluetenNah = b => gebaute.some(o => (OBST[o.art] || o.gh) && Math.hypot(o.x - b.x, o.z - b.z) < BIENEN_BLUETEN_WEITE);
const honigProMin = b => HONIG_PRO_MIN * (bluetenNah(b) ? 2 : 1) * jahreszeit().honig;
function bienenSchild(b) {
  const B = b.biene, J = jahreszeit();
  b.schild.userData.malen(J.honig <= 0 ? '🐝 Winterruhe 💤' : B.lager >= HONIG_MAX ? `🍯 Voll! ${HONIG_MAX} kg · P` : `🍯 ${B.lager.toFixed(1).replace('.', ',')} kg Honig`, B.lager >= 1 ? '#ffd166' : '#ffffff');
}
function bienenUpdate(dt) {
  const nacht = tagHell < 0.3, winter = jahreszeit().honig <= 0;
  for (const b of gebaute) {
    if (!b.biene) continue;
    const B = b.biene;
    B.lager = Math.min(HONIG_MAX, B.lager + honigProMin(b) * dt / 60);
    B.takt -= dt;
    if (B.takt <= 0) { B.takt = 1; bienenSchild(b); }
    // Bienen fliegen (nachts und im Winter bleiben sie im Stock)
    B.g.visible = !nacht && !winter;
    if (B.g.visible && Math.hypot(wo().x - b.x, wo().z - b.z) < 60) {
      B.g.children.forEach((biene, k) => {
        const u = biene.userData, t = spielZeit * u.v + u.ph;
        biene.position.set(Math.cos(t) * u.r + Math.sin(t * 2.3) * 0.4, u.h + Math.sin(t * 3.1) * 0.3, Math.sin(t * 1.3) * u.r);
        biene.rotation.y = -t + Math.PI / 2;
        biene.children[2].rotation.y = biene.children[3].rotation.y = Math.sin(spielZeit * 60 + k) * 0.6;   // Flügel schlagen
      });
      // Summ-summ, wenn du nah dran bist
      B.summTakt -= dt;
      if (B.summTakt <= 0 && Math.hypot(wo().x - b.x, wo().z - b.z) < 6) { B.summTakt = 1.2; tonGleiten(210, 230, 0, 1, 'sawtooth', 0.012); }
    }
  }
}
function honigErnten(b) {
  const B = b.biene, m = Math.floor(B.lager * 10) / 10;
  if (aktiv) { meldung('🐝 Steig aus (E), um Honig zu ernten!'); sound.nein(); return; }
  if (m < 1) { meldung(jahreszeit().honig <= 0 ? '🐝 Im Winter schlafen die Bienen – kein neuer Honig!' : `🐝 Noch zu wenig Honig (${m.toFixed(1).replace('.', ',')} kg) – die Bienen arbeiten noch!`); sound.nein(); return; }
  vorrat.honig = (vorrat.honig || 0) + m; B.lager -= m;
  bienenSchild(b); gebSenden(b);
  const stich = Math.random() < 0.15;
  meldung(`🍯 ${m.toFixed(1).replace('.', ',')} kg Honig geerntet!${stich ? ' 🐝 Autsch! Eine Biene hat dich gestochen! 😖' : ''} Verkaufen im Dorfladen oder in der Stadt.`, 4);
  if (stich) tonGleiten(900, 300, 0, 0.3, 'square', 0.05);
  sound.korn(); speichern();
}

// ===== 🐕🐈 Hofhunde und Hofkatzen (P = streicheln!) =====
const HUNDE_NAMEN = ['Bello', 'Rex', 'Luna', 'Balu', 'Sammy', 'Bruno', 'Nala', 'Rocky'];
const KATZEN_NAMEN = ['Mimi', 'Felix', 'Minka', 'Tiger', 'Lilly', 'Garfield', 'Mohrle', 'Kitty'];
const HUND_FARBEN = [0x8a5a2a, 0x2a2420, 0xd8b07a, 0xf2efe8], KATZEN_FARBEN = [0xe08a30, 0x6a6a6a, 0x1e1e1e, 0xf2efe8];
const haustiere = [];
function haustierNeu(art, x, z, rot, name) {
  const hund = art === 'hund', nr = haustiere.length;
  const fell = mat((hund ? HUND_FARBEN : KATZEN_FARBEN)[(Math.floor(x * 7 + z * 3) % 4 + 4) % 4]), dunkel = mat(0x222222), rosa = mat(0xf2a0b0);
  const S = hund ? 1 : 0.62;   // Katzen sind kleiner
  const g = new THREE.Group(); scene.add(g);
  const k = new THREE.Group(); k.scale.setScalar(S); g.add(k);
  kasten(k, 0, 0.55, 0, 0.42, 0.38, 0.95, fell);                            // Körper (vorne = -z)
  const kopf = new THREE.Group(); kopf.position.set(0, 0.85, -0.5); k.add(kopf);
  kasten(kopf, 0, 0, 0, 0.36, 0.34, 0.34, fell);
  if (hund) {
    kasten(kopf, 0, -0.06, -0.24, 0.22, 0.18, 0.2, fell);                   // Schnauze
    kasten(kopf, 0, -0.01, -0.35, 0.08, 0.07, 0.04, dunkel, false);         // Nase
    for (const sx of [-1, 1]) { const o = kasten(kopf, sx * 0.2, 0.05, 0.02, 0.06, 0.26, 0.16, dunkel); o.rotation.z = sx * 0.25; }   // Schlappohren
    kasten(kopf, 0, -0.17, -0.3, 0.07, 0.03, 0.08, rosa, false);            // Zunge
  } else {
    for (const sx of [-1, 1]) { const o = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.17, 4), fell); o.position.set(sx * 0.11, 0.24, 0); kopf.add(o); }   // Spitze Ohren
    kasten(kopf, 0, -0.06, -0.18, 0.06, 0.04, 0.02, rosa, false);           // Näschen
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const b = kasten(kopf, sx * 0.24, -0.06 + sy * 0.03, -0.16, 0.18, 0.008, 0.008, mat(0xffffff), false); b.rotation.z = sx * sy * 0.15; }   // Schnurrhaare
  }
  for (const sx of [-1, 1]) kasten(kopf, sx * 0.09, 0.06, -0.175, 0.06, 0.06, 0.02, hund ? dunkel : mat(0x7cd84a), false);   // Augen
  const beine = [];
  for (const [bx, bz] of [[-0.14, -0.35], [0.14, -0.35], [-0.14, 0.35], [0.14, 0.35]]) {
    const b = new THREE.Group(); b.position.set(bx, 0.4, bz); k.add(b);
    kasten(b, 0, -0.2, 0, 0.11, 0.4, 0.11, fell); beine.push(b);
  }
  const schwanz = new THREE.Group(); schwanz.position.set(0, 0.68, 0.47); k.add(schwanz);
  const sl = hund ? 0.4 : 0.6;
  kasten(schwanz, 0, sl / 2, 0, 0.07, sl, 0.07, fell); schwanz.rotation.x = hund ? 0.6 : 0.3;
  const namen = hund ? HUNDE_NAMEN : KATZEN_NAMEN;
  const t = { art, hund, name: name || namen[(nr + Math.floor(Math.abs(x + z))) % namen.length], g, kopf, beine, schwanz, k,
    hx: x, hz: z, ziel: null, warte: Math.random() * 3, speed: 0, streichel: 0, liebe: 0, phase: Math.random() * 6 };
  g.position.set(x + Math.sin(rot) * 1.6, 0, z + Math.cos(rot) * 1.6);
  t.schild = schild(`${hund ? '🐕' : '🐈'} ${t.name}`, '#ffd166', 2.8); scene.add(t.schild);
  haustiere.push(t);
  return t;
}
// Die zwei Haustiere, die von Anfang an auf dem Hof wohnen: Hund Bello (mit Hütte) und Katze Mimi (Körbchen vor der Haustür)
{
  const huette = baueGebaeudeMesh('hundehuette'); huette.position.set(-5.5, 0, 37); huette.rotation.y = Math.PI / 2; scene.add(huette);
  hindernisse.push({ x: -5.5, z: 37, r: 0.8 });
  haustierNeu('hund', -5.5, 37, Math.PI / 2, 'Bello');
  const korb = baueGebaeudeMesh('katzenkorb'); korb.position.set(-7, 0, 31.5); scene.add(korb);
  haustierNeu('katze', -7, 31.5, 0, 'Mimi');
}
const herzMat = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.font = '52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💕', 32, 36);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({ map: tx, depthWrite: false, transparent: true });
})();
const herzen = [];
function herzchen(x, y, z) {
  const h = new THREE.Sprite(herzMat.clone()); h.scale.setScalar(0.5); h.position.set(x + zufall(-0.3, 0.3), y, z + zufall(-0.3, 0.3)); scene.add(h);
  herzen.push({ h, t: 1.5 });
}
function naechstesHaustier(weite = 2.6) {
  if (aktiv) return null;
  let bestes = null, bestD = weite;
  for (const t of haustiere) { const d = Math.hypot(t.g.position.x - player.position.x, t.g.position.z - player.position.z); if (d < bestD) { bestD = d; bestes = t; } }
  return bestes;
}
function streicheln(t) {
  t.streichel = 3; t.liebe = Math.min(100, t.liebe + 10); t.ziel = null; t.speed = 0;
  for (let k = 0; k < 4; k++) herzchen(t.g.position.x, 1.1 + k * 0.15, t.g.position.z);
  if (t.hund) { tonGleiten(420, 300, 0, 0.12, 'square', 0.05); tonGleiten(460, 320, 0.2, 0.14, 'square', 0.05); }   // Wuff wuff!
  else { tonGleiten(650, 900, 0, 0.25, 'sine', 0.05); tonGleiten(900, 600, 0.25, 0.35, 'sine', 0.05); for (let k = 0; k < 8; k++) ton(70, 0.7 + k * 0.12, 0.08, 'sawtooth', 0.02); }   // Miau ... schnurr
  const texte = t.hund ? ['wedelt mit dem Schwanz!', 'leckt deine Hand ab! 👅', 'rollt sich auf den Rücken – Bauch kraulen!', 'bellt fröhlich: Wuff!'] : ['schnurrt ganz laut!', 'reibt den Kopf an deiner Hand.', 'macht einen Buckel und miaut.', 'blinzelt dich zufrieden an.'];
  meldung(`💕 ${t.name} ${texte[Math.floor(Math.random() * texte.length)]} (Liebe: ${'❤️'.repeat(Math.ceil(t.liebe / 20))})`, 3);
}
function haustierUpdate(dt) {
  for (let k = herzen.length - 1; k >= 0; k--) {
    const H = herzen[k]; H.t -= dt; H.h.position.y += dt * 0.8; H.h.material.opacity = Math.min(1, H.t);
    if (H.t <= 0) { scene.remove(H.h); H.h.material.dispose(); herzen.splice(k, 1); }
  }
  const p = player.position, zuFuss = !aktiv && !mitfahrt;
  for (const t of haustiere) {
    const g = t.g, pos = g.position;
    const dSpieler = Math.hypot(p.x - pos.x, p.z - pos.z);
    if (t.streichel > 0) {   // Wird gestreichelt: sitzen bleiben und zu dir schauen
      t.streichel -= dt; t.speed = 0;
      g.rotation.y = Math.atan2(-(p.x - pos.x), -(p.z - pos.z));
      if (t.hund && t.streichel > 1.5) t.k.rotation.z = Math.sin(spielZeit * 3) * 0.05 + 0.15;
    } else {
      t.k.rotation.z = 0;
      // Der Hund kommt zu dir gelaufen, wenn du in der Nähe bist (Katzen manchmal auch)
      const folgt = zuFuss && dSpieler < (t.hund ? 14 : 6) && Math.hypot(p.x - t.hx, p.z - t.hz) < 30 && (t.hund || t.liebe > 20);
      if (folgt && dSpieler > 2.2) t.ziel = { x: p.x, z: p.z };
      else if (folgt) t.ziel = null;
      else if (!t.ziel) { t.warte -= dt; if (t.warte <= 0) { const w = Math.random() * 6.28, r = 1.5 + Math.random() * (t.hund ? 8 : 5); t.ziel = { x: t.hx + Math.cos(w) * r, z: t.hz + Math.sin(w) * r }; } }
      if (t.ziel) {
        const dx = t.ziel.x - pos.x, dz = t.ziel.z - pos.z, d = Math.hypot(dx, dz);
        const tempo = folgt ? (t.hund ? 5 : 3) : (t.hund ? 1.8 : 1.2);
        if (d < 0.3) { t.ziel = null; t.warte = 2 + Math.random() * 5; t.speed = 0; }
        else {
          t.speed = tempo;
          const zielW = Math.atan2(-dx, -dz);
          let dw = zielW - g.rotation.y; while (dw > Math.PI) dw -= Math.PI * 2; while (dw < -Math.PI) dw += Math.PI * 2;
          g.rotation.y += dw * Math.min(1, dt * 6);
          const nx = pos.x - Math.sin(g.rotation.y) * tempo * dt, nz = pos.z - Math.cos(g.rotation.y) * tempo * dt;
          if (!kollidiert(nx, nz, 0.3)) { pos.x = nx; pos.z = nz; } else { t.ziel = null; t.warte = 1; }
        }
      } else t.speed = 0;
    }
    // Beine laufen, Schwanz wedelt, Kopf wackelt
    t.phase += dt * t.speed * 4;
    t.beine.forEach((b, i) => { b.rotation.x = t.speed > 0 ? Math.sin(t.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 : 0; });
    const freude = t.streichel > 0 || (t.hund && dSpieler < 4 && zuFuss);
    if (t.hund) t.schwanz.rotation.z = Math.sin(spielZeit * (freude ? 22 : 5)) * (freude ? 0.7 : 0.25);
    else t.schwanz.rotation.z = Math.sin(spielZeit * 1.5 + t.phase) * 0.35;
    t.kopf.rotation.x = t.speed > 0 ? Math.sin(t.phase * 2) * 0.05 : (t.streichel > 0 ? -0.25 : 0);
    if (!t.hund && t.speed === 0 && t.streichel <= 0) t.k.position.y = -0.03; else t.k.position.y = 0;
    t.schild.position.set(pos.x, t.hund ? 1.8 : 1.25, pos.z);
    t.schild.visible = dSpieler < 12;
  }
}

// ===== 🅿️ 3er-Garage: Man kann hineinfahren, nur die Wände sind im Weg. Die Tore gehen auf, wenn jemand kommt =====
function garageEinrichten(b) {
  b.garage = true; b.h.r = -100; b.hx = [];
  const W = GARAGE.breite, T = GARAGE.tief, c = Math.cos(b.rot), sn = Math.sin(b.rot);
  const punkt = (lx, lz) => { const h = { x: b.x + lx * c + lz * sn, z: b.z - lx * sn + lz * c, r: 0.35 }; hindernisse.push(h); b.hx.push(h); };
  for (let lx = -W / 2; lx <= W / 2 + 0.01; lx += 1) punkt(lx, -T / 2);                   // Rückwand
  for (let lz = -T / 2; lz <= T / 2 + 0.01; lz += 1) { punkt(-W / 2, lz); punkt(W / 2, lz); punkt(-W / 6, Math.min(lz, T / 2 - 0.5)); punkt(W / 6, Math.min(lz, T / 2 - 0.5)); }   // Seiten- und Trennwände
}
function garageUpdate(dt) {
  for (const b of gebaute) {
    if (!b.garage) continue;
    const tore = b.mesh.userData.tore, c = Math.cos(b.rot), sn = Math.sin(b.rot);
    tore.forEach((T, k) => {
      const lx = (k - 1) * GARAGE.breite / 3, lz = GARAGE.tief / 2 + 2;
      const px = b.x + lx * c + lz * sn, pz = b.z - lx * sn + lz * c;
      const nah = fahrzeuge.some(fz => Math.hypot(fz.g.position.x - px, fz.g.position.z - pz) < 9 && (fz === aktiv || fremdGefahren(fz) || fz.helfer)) || Math.hypot(player.position.x - px, player.position.z - pz) < 5;
      const vorher = T.auf;
      T.auf = begrenzt(T.auf + (nah ? 1 : -1) * dt * 0.8, 0, 1);
      if (vorher === 0 && T.auf > 0 && Math.hypot(wo().x - px, wo().z - pz) < 30) tonGleiten(160, 220, 0, 1.2, 'square', 0.02);   // Surrr ...
      const H = GARAGE.hoch - 0.6;
      T.blatt.scale.y = Math.max(0.05, 1 - T.auf);
      T.blatt.position.y = H - H * T.blatt.scale.y / 2;   // Rollt sich oben auf
    });
  }
}

// ===== Silagesilo: Häckselgut abladen (L) → festfahren → abdecken (P) → gären lassen → Silage! =====
function fahrsiloEinrichten(b) {
  b.fs = { inhalt: 0, fest: 0, zu: false, gaer: 0, fertig: false, takt: 0, geaendert: false };
  b.h.r = -100;   // Man kann hineinfahren! Nur die Wände sind im Weg:
  b.hx = [];
  const c = Math.cos(b.rot), sn = Math.sin(b.rot);
  for (const lx of [-FS_BREIT - 0.2, FS_BREIT + 0.2]) for (let lz = -FS_LANG; lz <= FS_LANG + 0.01; lz += 1.5) {
    const h = { x: b.x + lx * c + lz * sn, z: b.z - lx * sn + lz * c, r: 0.45 };
    hindernisse.push(h); b.hx.push(h);
  }
  b.schild = schild('', '#fff', 9); b.schild.position.set(b.x, FS_WAND + 3.5, b.z); scene.add(b.schild); b.extra.push(b.schild);
  fahrsiloMalen(b);
}
function fahrsiloLokal(b, x, z, v = { x: 0, z: 0 }) {   // Wo ist dieser Punkt im Silo? (x = quer, z = längs)
  const dx = x - b.x, dz = z - b.z, c = Math.cos(b.rot), sn = Math.sin(b.rot);
  v.x = dx * c - dz * sn; v.z = dx * sn + dz * c;
  return v;
}
const fahrsiloHoehe = b => b.fs.inhalt > 0 ? (0.15 + (FS_WAND - 0.6) * b.fs.inhalt / FAHRSILO_MAX) * (1 - 0.15 * b.fs.fest) : 0;   // Festgefahren = etwas flacher
function fahrsiloBoden(b, x, z) {   // Wie hoch ist der Haufen an dieser Stelle? (null = nicht im Silo)
  const l = fahrsiloLokal(b, x, z);
  if (Math.abs(l.x) > FS_BREIT || Math.abs(l.z) > FS_LANG) return null;
  return 0.16 + fahrsiloHoehe(b) * begrenzt((FS_LANG - 0.6 - Math.abs(l.z)) / FS_RAMPE, 0, 1);
}
function fahrsiloMalen(b) {
  const F = b.fs, u = b.mesh.userData.fs, H = fahrsiloHoehe(b);
  u.haufen.visible = F.inhalt > 0; u.haufen.scale.y = Math.max(0.01, H);
  u.haufen.material.color.setHex(F.fertig ? GUETER.silage.farbe : GUETER.haeckselgut.farbe);
  u.folie.visible = u.reifen.visible = F.zu && F.inhalt > 0;
  u.folie.scale.y = H + 0.06; u.reifen.position.y = 0.16 + H + 0.06;
  let text;
  if (F.inhalt <= 0) text = '🟩 Silagesilo: leer';
  else if (F.fertig) text = `🟫 Silage: ${kg(F.inhalt)}`;
  else if (F.zu) text = F.gaer >= 1 ? '🟫 Silage fertig! P = Folie ab' : `⏳ Gärt … ${Math.floor(F.gaer * 100)} %`;
  else text = `🌽 ${kg(F.inhalt)} · festgefahren ${Math.floor(F.fest * 100)} %`;
  b.schild.userData.malen(text, F.fertig || F.gaer >= 1 ? '#ffd166' : '#b9f5a0');
}
function nahesFahrsilo() {   // Bist du mit einem Fahrzeug im (oder direkt vor dem) Silagesilo?
  if (!aktiv) return null;
  const p = aktiv.g.position;
  return gebaute.find(b => { if (!b.fs) return false; const l = fahrsiloLokal(b, p.x, p.z); return Math.abs(l.x) < FS_BREIT + 1.2 && Math.abs(l.z) < FS_LANG + 4; }) || null;
}
function fahrsiloAbladen(b) {   // L: Häckselgut vom Anhänger in das Silo kippen
  const F = b.fs, gut = gutVon(aktiv);
  if (!gut) { meldung('🌽 Du hast nichts dabei! Häcksel erst Mais mit dem Häcksler.'); sound.nein(); return; }
  if (gut !== 'haeckselgut') { meldung(`🟩 Ins Silagesilo kommt nur Häckselgut (Mais)! ${gut === 'korn' ? 'Korn gehört ins Korn-Silo 🛢️.' : ''}`); sound.nein(); return; }
  if (F.zu) { meldung('🟩 Das Silo ist schon zugedeckt und gärt!'); sound.nein(); return; }
  if (F.fertig && F.inhalt > 0) { meldung('🟫 Da liegt noch fertige Silage! Hol sie erst raus (U).'); sound.nein(); return; }
  const menge = Math.min(kornDrin(aktiv), FAHRSILO_MAX - F.inhalt);
  if (menge <= 0) { meldung('🟩 Das Silagesilo ist voll! Fahr drüber (festfahren) und deck es dann zu (P).'); sound.nein(); return; }
  kornWeg(aktiv, menge);
  F.fest = F.inhalt > 0 ? F.fest * F.inhalt / (F.inhalt + menge) : 0;   // Neues lockeres Häckselgut obendrauf
  F.inhalt += menge; F.fertig = false; F.gaer = 0;
  fahrsiloMalen(b); gebSenden(b);
  meldung(`🌽➡️🟩 ${kg(menge)} Häckselgut abgeladen! Jetzt mit einem Fahrzeug drüberfahren, bis es festgefahren ist.`, 4);
  sound.korn();
  for (let k = 0; k < 14; k++) staub(b.x + zufall(-3, 3), b.z + zufall(-3, 3), GUETER.haeckselgut.farbe, 1.5, -0.3);
  speichern();
}
function fahrsiloP(b) {   // P: zudecken, Folie abnehmen
  const F = b.fs;
  if (F.inhalt <= 0) { meldung('🟩 Das Silagesilo ist leer. Häcksel Mais und kipp das Häckselgut hier ab (L)!'); sound.nein(); return; }
  if (F.fertig) { meldung('🟫 Die Silage ist fertig! Fahr mit einem Anhänger rein und drück U zum Aufladen.'); return; }
  if (F.zu) {
    if (F.gaer < 1) { meldung(`⏳ Die Silage gärt noch (${Math.floor(F.gaer * 100)} %). Geduld!`); return; }
    F.zu = false; F.fertig = true;
    meldung('🎉🟫 Folie ab – die Silage ist fertig! Lade sie mit U auf und verkauf sie beim Landhandel (V) – oder füttere die Tiere damit (L).', 5);
    sound.kasse();
  } else {
    if (F.fest < 1) { meldung(`🚜 Erst festfahren! Fahr mit einem Fahrzeug über den Haufen (${Math.floor(F.fest * 100)} %). Sonst schimmelt es!`, 3.5); sound.nein(); return; }
    if (money < FOLIE_PREIS) { meldung(`💸 Die Silofolie kostet ${euro(FOLIE_PREIS)}!`); sound.nein(); return; }
    money -= FOLIE_PREIS; F.zu = true; F.gaer = 0;
    meldung(`⬛ Folie drauf und Reifen obendrauf (${euro(FOLIE_PREIS)})! Jetzt gärt das Häckselgut zu Silage.`, 4);
    sound.bauen();
  }
  fahrsiloMalen(b); gebSenden(b); speichern();
}
function silageHolen(b) {   // U: fertige Silage auf den Anhänger laden
  const F = b.fs;
  if (!F.fertig || F.inhalt <= 0) { meldung(F.zu ? '⏳ Die Silage ist noch unter der Folie!' : '🟩 Hier ist noch keine fertige Silage!'); sound.nein(); return; }
  if (!kornPlatz(aktiv)) { meldung('🚛 Da passt nichts rein – kuppel einen Kipper an (H)!'); sound.nein(); return; }
  if (!gutPasst(aktiv, 'silage')) { meldung(`🚛 Da ist noch ${GUETER[gutVon(aktiv)].name} drin – erst leer machen!`); sound.nein(); return; }
  const menge = Math.min(F.inhalt, kornPlatz(aktiv) - kornDrin(aktiv));
  if (menge <= 0) { meldung('🚛 Schon voll!'); sound.nein(); return; }
  kornDazu(aktiv, menge, 'silage'); F.inhalt -= menge;
  if (F.inhalt <= 0) { F.inhalt = 0; F.fertig = false; F.fest = 0; F.gaer = 0; }
  fahrsiloMalen(b); gebSenden(b);
  meldung(`🟫 ${kg(menge)} Silage aufgeladen! Verkaufen beim Landhandel 🏪 (V) oder an die Tiere verfüttern (L).`, 4);
  sound.korn(); speichern();
}
function fahrsiloHinweis(b) {
  const F = b.fs;
  if (F.inhalt <= 0) return aktiv && gutVon(aktiv) === 'haeckselgut' ? `🟩 L = Häckselgut abladen (${kg(kornDrin(aktiv))})` : '🟩 Silagesilo: Bring Häckselgut vom Häcksler und drück L!';
  if (F.fertig) return aktiv ? '🟫 U = Silage aufladen' : `🟫 Fertige Silage: ${kg(F.inhalt)} – hol sie mit einem Anhänger (U)`;
  if (F.zu) return F.gaer >= 1 ? '🟫 P = Folie abnehmen – die Silage ist fertig!' : `⏳ Unter der Folie gärt die Silage … ${Math.floor(F.gaer * 100)} %`;
  if (aktiv && gutVon(aktiv) === 'haeckselgut' && F.inhalt < FAHRSILO_MAX) return `🟩 L = Häckselgut abladen · Festgefahren: ${Math.floor(F.fest * 100)} %`;
  return F.fest >= 1 ? `⬛ P = Mit Folie zudecken (${euro(FOLIE_PREIS)})` : `🚜 Fahr über den Haufen zum Festfahren: ${Math.floor(F.fest * 100)} %`;
}
const fsTmp = { x: 0, z: 0 };
function fahrsiloUpdate(dt) {
  for (const b of gebaute) {
    if (!b.fs) continue;
    const F = b.fs;
    if (F.zu && F.gaer < 1) {   // Gären
      F.gaer = Math.min(1, F.gaer + dt / GAER_ZEIT);
      F.takt -= dt;
      if (F.takt <= 0 || F.gaer >= 1) { F.takt = 1; fahrsiloMalen(b); if (F.gaer >= 1) meldung('🟫 Die Silage ist fertig gegoren! Geh zum Silagesilo und drück P.', 4); }
    }
    // Festfahren: Mit einem Fahrzeug über den Haufen fahren
    if (aktiv && F.inhalt > 0 && !F.zu && !F.fertig && F.fest < 1 && Math.abs(aktiv.speed) > 1) {
      const l = fahrsiloLokal(b, aktiv.g.position.x, aktiv.g.position.z, fsTmp);
      if (Math.abs(l.x) < FS_BREIT && Math.abs(l.z) < FS_LANG - 0.6) {
        F.fest = Math.min(1, F.fest + dt * aktiv.typ.groesse / (WALZ_ZEIT * Math.max(0.5, F.inhalt / 40000)));
        F.geaendert = true;
        if (F.fest >= 1) { meldung('✅ Festgefahren! Jetzt P drücken und mit Folie zudecken.', 4); sound.klick(); }
        if (Math.random() < dt * 6) staub(aktiv.g.position.x + zufall(-1, 1), aktiv.g.position.z + zufall(-1, 1), GUETER.haeckselgut.farbe, fahrsiloHoehe(b) + 0.3, 0.4);
      }
    }
    F.takt2 = (F.takt2 || 0) - dt;
    if (F.geaendert && F.takt2 <= 0) { F.takt2 = 0.5; F.geaendert = false; fahrsiloMalen(b); gebSenden(b); }
  }
  // Fahrzeuge und Anhänger fahren auf den Haufen hinauf
  for (const fz of fahrzeuge) {
    let h = 0;
    for (const b of gebaute) if (b.fs) { const y = fahrsiloBoden(b, fz.g.position.x, fz.g.position.z); if (y !== null) { h = Math.max(h, y - 0.16); } }
    if (fz.hopp > 0) fz.g.position.y = h + fz.hopp;   // Monster-Sprung
    else fz.g.position.y += (h - fz.g.position.y) * Math.min(1, dt * 6);
    if (fz.typ.elektro && fz.diesel < fz.typ.dieselMax) fz.diesel = Math.min(fz.typ.dieselMax, fz.diesel + dt * 0.12 * tagHell * (jahreszeit().zeit === 'winter' ? 0.4 : 1));   // ☀️ Solar laden
  }
  for (const a of anhaenger) {
    let h = 0;
    for (const b of gebaute) if (b.fs) { const y = fahrsiloBoden(b, a.g.position.x, a.g.position.z); if (y !== null) { h = Math.max(h, y - 0.16); } }
    a.g.position.y = a.an ? h : a.g.position.y + (h - a.g.position.y) * Math.min(1, dt * 6);
  }
}

// ===== Eigene Wälder: Holz hacken (X halten) – die Bäume wachsen nach =====
function waldPlotEinrichten(b) {
  b.wald = { holz: GEBAEUDE_ARTEN[b.art].holz, w: new Array(WALD_BAEUME_PLOT).fill(1), takt: 0 };
  b.schild = schild('', '#fff', 7); b.schild.position.set(b.x, 8.2, b.z); scene.add(b.schild); b.extra.push(b.schild);
  waldPlotMalen(b);
}
function waldPlotMalen(b) {
  const W = b.wald, H = HOLZARTEN[W.holz];
  b.mesh.userData.baeume.forEach((baum, k) => {
    const w = W.w[k];
    baum.visible = w > 0.03;
    baum.scale.setScalar(w >= 1 ? 1 : 0.15 + w * 0.75);   // Junge Bäume sind klein
  });
  const n = W.w.filter(w => w >= 1).length;
  b.schild.userData.malen(n ? `🪵 ${H.kurz}: ${n} Bäume · X halten = Holz` : `🌱 ${H.kurz}: wächst nach ...`, n ? '#ffd166' : '#b9f5a0');
}
let waldHackFort = 0, waldHackTon = 0;
function naherWaldPlot() {
  if (aktiv) return null;
  for (const b of gebaute) if (b.wald && Math.hypot(player.position.x - b.x, player.position.z - b.z) < GEBAEUDE_ARTEN[b.art].r + 2.5) return b;
  return null;
}
function waldPlotHacken(dt) {
  const b = naherWaldPlot();
  if (!b || building || angel || !(mouseDown || keys.x)) return;
  const W = b.wald, H = HOLZARTEN[W.holz], nr = W.w.findIndex(w => w >= 1);
  if (nr < 0) { meldungSelten(`🌱 Alle ${H.kurz}n sind gefällt! Warte, bis sie nachwachsen.`); return; }
  hackt = true;
  yaw = Math.atan2(player.position.x - b.x, player.position.z - b.z);   // Zum Wald schauen
  waldHackFort += dt / WALD_HACK_ZEIT;
  waldHackTon -= dt;
  if (waldHackTon <= 0) {   // Tock! Tock!
    waldHackTon = 0.4;
    ton(220 + Math.random() * 60, 0, 0.08, 'triangle', 0.12); ton(120, 0, 0.06, 'square', 0.04);
    staub(player.position.x - Math.sin(yaw) * 1.2, player.position.z - Math.cos(yaw) * 1.2, 0xc8a060, 1, 0.6, 0.4);
  }
  if (waldHackFort >= 1) {
    waldHackFort = 0;
    W.w[nr] = 0;
    vorrat['holz_' + W.holz] = (vorrat['holz_' + W.holz] || 0) + WALD_SCHEITE;
    meldung(`🪵 ${WALD_SCHEITE} Scheite ${H.name}! (du hast ${Math.floor(vorrat['holz_' + W.holz])}) Ab zur Werkbank 🛠️`, 2.5);
    sound.knarren(0.4); waldPlotMalen(b); gebSenden(b); speichern();
  }
}
// ===== Gewächshaus: Gemüse anbauen =====
// 16 Pflanzen (2 Beete × 8), alle Blätter in einem InstancedMesh und alle Früchte in einem zweiten (schnell!)
const GH_PLAETZE = [];
for (const x of [-1.7, 1.7]) for (let k = 0; k < 8; k++) GH_PLAETZE.push([x + (k % 2 ? 0.25 : -0.25), -3.85 + k * 1.1]);
const ghBlattGeo = new THREE.IcosahedronGeometry(0.5, 1), ghFruchtGeo = new THREE.SphereGeometry(1, 10, 8);
function ghEinrichten(b) {
  b.gh = { art: null, w: 0, takt: 0 };
  b.gh.blaetter = new THREE.InstancedMesh(ghBlattGeo, windMaterial(mat(0xffffff, { flatShading: true }), 0.4), GH_PLAETZE.length);
  b.gh.fruechte = new THREE.InstancedMesh(ghFruchtGeo, mat(0xffffff, { roughness: 0.5 }), GH_PLAETZE.length * 6);
  for (const m of [b.gh.blaetter, b.gh.fruechte]) { m.castShadow = true; m.frustumCulled = false; b.mesh.add(m); }
  b.schild = schild('', '#fff', 7); b.schild.position.set(b.x, 6.2, b.z); scene.add(b.schild); b.extra.push(b.schild);
  ghMalen(b);
}
function ghMalen(b) {   // Die Pflanzen so groß zeichnen, wie sie gerade sind
  const gh = b.gh, G = GEMUESE[gh.art], d = new THREE.Object3D(), c = new THREE.Color(), unreif = new THREE.Color(0x7ab33a);
  if (!G) {
    gh.blaetter.count = 0; gh.fruechte.count = 0;
    b.schild.userData.malen('🪴 Leer – P drücken', '#b9f5a0');
    return;
  }
  const w = gh.w, h = G.hoehe;
  let nf = 0;
  GH_PLAETZE.forEach(([px, pz], k) => {
    const gr = 0.25 + 0.75 * w;
    d.position.set(px, 0.45 + h * gr * 0.45, pz); d.rotation.set(0, k * 1.7, 0); d.scale.set(0.8 * gr, h * gr, 0.8 * gr); d.updateMatrix();
    gh.blaetter.setMatrixAt(k, d.matrix); gh.blaetter.setColorAt(k, c.set(G.blatt));
    if (w > 0.55) {   // Früchte wachsen erst in der zweiten Hälfte (erst grün, dann bunt)
      const reif = (w - 0.55) / 0.45;
      for (let i = 0; i < G.n; i++) {
        const a = i / G.n * Math.PI * 2 + k, rr = G.n > 1 ? 0.28 : 0;
        d.position.set(px + Math.cos(a) * rr, 0.45 + G.fy * (G.n > 1 ? 0.6 + 0.8 * i / G.n : 1), pz + Math.sin(a) * rr);
        d.rotation.set(0, 0, 0);
        const fg = G.fg * (0.3 + 0.7 * reif);
        d.scale.set(fg, gh.art === 'gurke' || gh.art === 'karotte' ? fg * 2.2 : fg, fg); d.updateMatrix();   // Gurken und Karotten sind länglich
        gh.fruechte.setMatrixAt(nf, d.matrix); gh.fruechte.setColorAt(nf, c.copy(unreif).lerp(new THREE.Color(G.frucht), reif));
        nf++;
      }
    }
  });
  gh.blaetter.count = GH_PLAETZE.length; gh.fruechte.count = nf;
  for (const m of [gh.blaetter, gh.fruechte]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  b.schild.userData.malen(w >= 1 ? `${G.emoji} ${G.name} reif! P = ernten` : `${G.emoji} ${G.name}: ${Math.floor(w * 100)} %`, w >= 1 ? '#7cf5a0' : '#ffd166');
}

// ===== Obstbäume: erst Blüten, dann grüne Früchte, dann reif und bunt =====
const OBST_PLAETZE = [];   // Wo die Früchte in der Krone hängen (gleichmäßig verteilt, wie bei einer Sonnenblume)
for (let k = 0; k < 40; k++) {
  const y = 1 - (k + 0.5) / 40 * 2, rr = Math.sqrt(1 - y * y), w = k * 2.39996;
  if (y < -0.55) continue;   // Ganz unten in der Krone hängt nichts
  OBST_PLAETZE.push([Math.cos(w) * rr * 1.95, 4.2 + y * 1.7, Math.sin(w) * rr * 1.95]);
}
function obstEinrichten(b) {
  b.obst = { w: 0, takt: 0 };
  b.obst.fruechte = new THREE.InstancedMesh(ghFruchtGeo, mat(0xffffff, { roughness: 0.4 }), OBST_PLAETZE.length);
  b.obst.fruechte.castShadow = true; b.obst.fruechte.frustumCulled = false;
  b.mesh.add(b.obst.fruechte);
  b.schild = schild('', '#fff', 5); b.schild.position.set(b.x, 7.6, b.z); scene.add(b.schild); b.extra.push(b.schild);
  obstMalen(b);
}
function obstMalen(b) {
  const O = OBST[b.art], w = b.obst.w, m = b.obst.fruechte, d = new THREE.Object3D(), c = new THREE.Color(), gruen = new THREE.Color(0x7ab33a);
  OBST_PLAETZE.forEach(([x, y, z], k) => {
    d.position.set(x, y, z);
    if (w < 0.25) {   // Blütezeit
      d.position.y += 0.05; d.scale.setScalar(w < 0.02 ? 0.001 : 0.09);
      c.set(O.bluete);
    } else {          // Früchte wachsen: erst klein und grün, dann groß und bunt
      const reif = (w - 0.25) / 0.75, g = O.groesse * (0.35 + 0.65 * reif);
      d.position.y -= 0.12; d.scale.set(g, g * O.laenglich, g);
      c.copy(gruen).lerp(new THREE.Color(O.farbe), Math.min(1, reif * 1.3));
    }
    d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, c);
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  b.schild.userData.malen(w >= 1 ? `${O.emoji} Reif! P = pflücken` : w < 0.25 ? `🌸 Blüht ... ${Math.floor(w * 100)} %` : `${O.emoji} ${Math.floor(w * 100)} %`, w >= 1 ? '#7cf5a0' : '#ffd166');
}
function obstPfluecken(b) {
  const O = OBST[b.art];
  if (b.obst.w < 1) { meldung(`${O.emoji} Die ${O.name} sind noch nicht reif (${Math.floor(b.obst.w * 100)} %)!`); sound.nein(); return; }
  vorrat[O.frucht] = (vorrat[O.frucht] || 0) + O.menge;
  b.obst.w = 0;
  obstMalen(b); gebSenden(b);
  for (let k = 0; k < 12; k++) staub(b.x + zufall(-1.8, 1.8), b.z + zufall(-1.8, 1.8), O.krone, 3.5, -0.6, 0.6);   // Blätter rieseln runter
  meldung(`${O.emoji} ${O.menge} kg ${O.name} gepflückt! Verkaufen im Dorfladen 🛒 (V).`, 3.5);
  sound.korn(); speichern();
}

// ===== Fischteich und Angeln =====
function teichEinrichten(b) {
  b.teich = { fische: TEICH_FISCHE_MAX, takt: 0, fischG: new THREE.Group() };
  for (let k = 0; k < 5; k++) {   // Fische, die unter Wasser im Kreis schwimmen
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat(k === 0 ? 0xf0a020 : 0x4a5a5a));
    f.scale.set(0.12, 0.08, 0.35); const w = k * 1.3, rr = 1.2 + k * 0.6;
    f.position.set(Math.cos(w) * rr, 0.05, Math.sin(w) * rr); f.rotation.y = -w;
    b.teich.fischG.add(f);
  }
  b.mesh.add(b.teich.fischG);
  b.schild = schild('', '#fff', 6); b.schild.position.set(b.x, 3.2, b.z); scene.add(b.schild); b.extra.push(b.schild);
  teichSchild(b);
}
function teichSchild(b) {
  const n = Math.floor(b.teich.fische);
  b.schild.userData.malen(n > 0 ? `🎣 ${n} Fische · P = Angeln` : '🎣 Leer – warte ein bisschen', n > 0 ? '#9fd8ff' : '#ff9a6b');
  b.teich.fischG.children.forEach((f, k) => { f.visible = k < n; });
}
let angel = null;   // Gerade am Angeln? { b, phase: 'warten' | 'kampf', ... }
const schwimmerMat = mat(0xd8221e);
function angeln(b) {
  if (angel) return;
  if (einholen) einholenEnde();
  if (aktiv) { meldung('🎣 Steig erst aus (E), dann kannst du angeln!'); sound.nein(); return; }
  if (Math.floor(b.teich.fische) < 1) { meldung('🎣 Im Teich sind gerade keine Fische. Alle 30 Sekunden kommt einer dazu!'); sound.nein(); return; }
  if (saegeAn) { saegeAn = false; }
  // Die Angel auswerfen: Der Schwimmer landet im Wasser zwischen dir und der Teich-Mitte
  const dx = player.position.x - b.x, dz = player.position.z - b.z, l = Math.hypot(dx, dz) || 1;
  const schwimmer = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), schwimmerMat);
  schwimmer.position.set(b.x + dx / l * 2.5, 0.15, b.z + dz / l * 2.5); scene.add(schwimmer);
  yaw = Math.atan2(dx, dz);   // Zum Wasser schauen
  angel = { b, phase: 'warten', t: 1.5 + Math.random() * 3, schwimmer };
  tonGleiten(900, 300, 0, 0.25, 'sine', 0.06); ton(180, 0.3, 0.15, 'sine', 0.08);   // Wuuusch – plopp!
  meldung('🎣 Angel ausgeworfen! Warte auf einen Biss ...', 2);
}
function angelEnde(gefangen) {
  const a = angel;
  $('angeln').style.display = 'none';
  angel = null;
  // Angel einholen: Schwimmer (und vielleicht der Fisch) fliegt zurück zur Angel. Bei null (abgebrochen) einfach weg.
  if (gefangen === null || aktiv) scene.remove(a.schwimmer);
  else einholenStarten(a.schwimmer, gefangen ? a.fisch : null);
  if (gefangen) {
    const F = FISCHE[a.fisch], k = 'fisch_' + a.fisch;
    vorrat[k] = (vorrat[k] || 0) + 1;
    a.b.teich.fische = Math.max(0, a.b.teich.fische - 1);
    teichSchild(a.b); gebSenden(a.b);
    fangAuswerten(a.fisch);
    sound.kaufen(); speichern();
  } else if (gefangen === false) { meldung('💨 Oh nein, der Fisch ist entwischt!', 2.5); sound.nein(); }
}
// ===== Fisch-Album und Rekorde =====
// fischAlbum = deine eigenen Fänge (bleibt immer bei dir) · fischRekorde = die Rekorde von ALLEN Bauern auf dem Hof (Server)
const ALBUM_SPEICHER = 'farming-fischalbum';
let fischAlbum = {};      // { karpfen: { n: 3, kg: 12.4, cm: 71 }, ... }
let fischRekorde = {};    // { karpfen: { kg: 15.2, cm: 80, wer: 'Bauer Blau' }, ... }
try { fischAlbum = JSON.parse(localStorage.getItem(ALBUM_SPEICHER)) || {}; } catch (e) { fischAlbum = {}; }
function albumSpeichern() { try { localStorage.setItem(ALBUM_SPEICHER, JSON.stringify(fischAlbum)); } catch (e) { /* egal */ } }
const kgText = kg => kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(2).replace('.', ',')} kg`;
function meinBauerName() { return mp.aktiv ? (MP_BAUERN[mp.nr] || MP_BAUERN[0]).name : 'Du'; }
function fangAuswerten(fisch) {
  const F = FISCHE[fisch];
  // Wie groß ist er? Kleine Fische gibt es oft, riesige ganz selten!
  const k = Math.pow(Math.random(), 2.2);
  const kg = Math.round((F.kg[0] + (F.kg[1] - F.kg[0]) * k) * 100) / 100;
  const cm = Math.round(F.cm[0] + (F.cm[1] - F.cm[0]) * begrenzt(Math.cbrt(k) * 0.9 + Math.random() * 0.1, 0, 1));
  // Ins Album eintragen (dein eigener bester Fang)
  const A = fischAlbum[fisch] || (fischAlbum[fisch] = { n: 0, kg: 0, cm: 0 });
  A.n++;
  const persoenlich = kg > A.kg;
  if (persoenlich) { A.kg = kg; A.cm = cm; }
  albumSpeichern();
  // Rekord? Nur wenn er schwerer ist als der beste Fisch von ALLEN Bauern auf dem Hof
  const alt = fischRekorde[fisch];
  const rekord = !alt || kg > alt.kg;
  if (rekord) {
    fischRekorde[fisch] = { kg, cm, wer: meinBauerName() };
    mpEvent({ t: 'rekord', f: fisch, kg, cm, wer: meinBauerName() });
    speichern();
  }
  fangFenster(fisch, kg, cm, rekord, persoenlich && !rekord, alt);
}
let fangZu = 0;
function fangFenster(fisch, kg, cm, rekord, persoenlich, alt) {
  const F = FISCHE[fisch];
  $('fangFisch').textContent = F.emoji;
  $('fangName').textContent = `${F.name} gefangen!`;
  $('fangGroesse').innerHTML = `⚖️ <b>${kgText(kg)}</b> &nbsp; 📏 <b>${cm} cm</b><br><span class="klein">${euro(F.preis)} im Dorfladen</span>`;
  const r = $('fangRekord');
  if (rekord) {
    r.innerHTML = alt ? `🏆 NEUER REKORD! 🏆<br><span class="klein">Der alte Rekord war ${kgText(alt.kg)} von ${alt.wer}</span>` : '🏆 NEUER REKORD! 🏆<br><span class="klein">Der erste ' + F.name + ' auf dem Hof!</span>';
    r.className = 'rekord';
    tonGleiten(500, 1000, 0.2, 0.3, 'square', 0.04); ton(1000, 0.55, 0.15, 'square', 0.05); ton(1300, 0.7, 0.35, 'square', 0.05);   // Tatää!
  } else {
    r.innerHTML = (persoenlich ? '⭐ Dein schwerster ' + F.name + ' bisher!<br>' : '') + `<span class="klein">🏆 Rekord: ${kgText(alt.kg)} (${alt.cm} cm) von ${alt.wer}</span>`;
    r.className = '';
  }
  $('fang').style.display = 'block';
  fangZu = rekord ? 7 : 4.5;   // So viele Sekunden bleibt das Fenster offen
}
function fangUpdate(dt) {
  if (fangZu <= 0) return;
  fangZu -= dt;
  if (fangZu <= 0) $('fang').style.display = 'none';
}
document.getElementById('fang').addEventListener('pointerdown', () => { fangZu = 0; $('fang').style.display = 'none'; });
function albumZeigen(an) {
  $('album').style.display = an ? 'block' : 'none';
  if (!an) return;
  if (document.pointerLockElement) document.exitPointerLock();
  const arten = Object.keys(FISCHE), gefangen = arten.filter(k => fischAlbum[k]).length;
  $('albumZahl').textContent = `${gefangen} von ${arten.length} Fischarten gefangen`;
  $('albumListe').innerHTML = arten.map(k => {
    const F = FISCHE[k], A = fischAlbum[k], R = fischRekorde[k];
    const rekordZeile = R ? `🏆 Hof-Rekord: ${kgText(R.kg)} · ${R.cm} cm · ${R.wer}` : '🏆 Noch kein Rekord';
    if (!A) return `<div class="albumKarte unbekannt"><div class="albumEmoji">❓</div><div><b>???</b><br><span class="klein">Noch nicht gefangen · ${rekordZeile}</span></div></div>`;
    return `<div class="albumKarte"><div class="albumEmoji">${F.emoji}</div><div><b>${F.name}</b> <span class="klein">× ${A.n}</span><br>`
      + `⭐ Dein Bester: ${kgText(A.kg)} · ${A.cm} cm<br><span class="klein">${rekordZeile}</span></div></div>`;
  }).join('');
}
document.getElementById('album-zu').addEventListener('click', () => albumZeigen(false));
document.getElementById('btn-album').addEventListener('click', e => { albumZeigen($('album').style.display !== 'block'); e.currentTarget.blur(); });
// ===== Werkbank: 4×4 Fächer wie beim Craften =====
// 🔥 Grillen = 1 Fleisch- oder Fischsorte + Holz · 🧂 Pökeln = 1 Fleisch- oder Fischsorte + Salz
// 🌭 Wurst = mindestens 2 Fleisch + Salz + Holz – andere Fleisch- und Holzsorten ergeben andere Würste!
const REZEPT_SPEICHER = 'farming-rezepte';
let wbFaecher = new Array(16).fill(null);   // Was liegt in welchem Fach? z. B. 'fleisch_schwein', 'holz_buche', 'salz', 'fisch_karpfen'
let werkbankOffen = false;
let entdeckt = {};   // Welche Rezepte hast du schon entdeckt?
try { entdeckt = JSON.parse(localStorage.getItem(REZEPT_SPEICHER)) || {}; } catch (e) { entdeckt = {}; }
function zutatInfo(k) {   // Name und Bild einer Zutat
  if (k === 'salz') return { name: 'Salz', emoji: '🧂', kurz: 'Salz' };
  const P = PRODUKTE[k];
  if (k.startsWith('holz_')) return { name: P.name, emoji: '🪵', kurz: HOLZARTEN[k.slice(5)].kurz };
  if (k.startsWith('fleisch_')) return { name: P.name, emoji: P.emoji, kurz: Object.values(FLEISCH).find(F => F.k === k.slice(8)).kurz };
  return { name: P.name, emoji: P.emoji, kurz: P.name };
}
const zutatHabe = k => k === 'salz' ? salzsteine : Math.floor(vorrat[k] || 0);   // So viel hast du davon
function zutatNehmen(k, n) { if (k === 'salz') salzsteine -= n; else { vorrat[k] -= n; if (vorrat[k] <= 0) delete vorrat[k]; } }
function zutatenListe() {   // Alles, was man in die Werkbank legen kann
  const l = [];
  for (const F of Object.values(FLEISCH)) l.push('fleisch_' + F.k);
  for (const k of Object.keys(FISCHE)) l.push('fisch_' + k);
  for (const k of Object.keys(HOLZARTEN)) l.push('holz_' + k);
  l.push('salz');
  return l;
}
const imGitter = k => wbFaecher.filter(f => f === k).length;
function rezeptFinden() {   // Was kommt aus den Fächern raus? (Die Reihenfolge ist egal)
  const z = {};
  for (const f of wbFaecher) if (f) z[f] = (z[f] || 0) + 1;
  const essen = Object.keys(z).filter(k => k.startsWith('fleisch_') || k.startsWith('fisch_'));
  const hoelzer = Object.keys(z).filter(k => k.startsWith('holz_')).map(k => k.slice(5)).sort();
  const salz = z.salz || 0, essenN = essen.reduce((s, k) => s + z[k], 0);
  if (!essenN) return null;
  if (salz && hoelzer.length && essenN >= 2) {   // 🌭 Wurst!
    const sorten = [...new Set(essen.map(k => k.startsWith('fisch_') ? 'fisch' : k.slice(8)))].sort();
    const gleich = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    const W = WURST.find(w => w.fleisch && gleich(w.fleisch, sorten) && gleich(w.holz, hoelzer)) || WURST.find(w => !w.fleisch);
    return { art: 'wurst', produkt: 'wurst_' + W.id, menge: essenN * 2, z };
  }
  if (essen.length !== 1) return null;   // Grillen und Pökeln geht nur mit EINER Sorte
  const roh = essen[0].startsWith('fisch_') ? essen[0] : essen[0].slice(8);
  if (salz && !hoelzer.length) return { art: 'poekel', produkt: 'poekel_' + roh, menge: essenN, z };
  if (hoelzer.length && !salz) return { art: 'grill', produkt: 'grill_' + roh, menge: essenN, z };
  return null;
}
function wieOft(r) {   // So oft kannst du das Rezept mit deinen Zutaten machen
  let n = Infinity;
  for (const [k, m] of Object.entries(r.z)) n = Math.min(n, Math.floor(zutatHabe(k) / m));
  return n === Infinity ? 0 : n;
}
function werkbankZeigen(an) {
  werkbankOffen = an;
  $('werkbank').style.display = an ? 'block' : 'none';
  if (!an) return;
  if (document.pointerLockElement) document.exitPointerLock();
  werkbankMalen();
}
function werkbankMalen() {
  // Fächer, die du nicht mehr hast (z. B. Holz verbraucht), werden leer
  for (let k = 0; k < 16; k++) { const f = wbFaecher[k]; if (f && imGitter(f) > zutatHabe(f)) wbFaecher[k] = null; }
  const gitter = $('wbGitter');
  gitter.innerHTML = '';
  wbFaecher.forEach((f, k) => {
    const d = document.createElement('div'); d.className = 'wbFach' + (f ? ' voll' : '');
    if (f) { const I = zutatInfo(f); d.innerHTML = `<span class="wbEmoji">${I.emoji}</span><span class="wbKurz">${I.kurz}</span>`; d.title = `${I.name} – klick zum Rausnehmen`; }
    d.addEventListener('click', () => { if (wbFaecher[k]) { wbFaecher[k] = null; sound.klick(); werkbankMalen(); } });
    gitter.appendChild(d);
  });
  // Ergebnis
  const r = rezeptFinden(), erg = $('wbErgebnis'), n = r ? wieOft(r) : 0;
  if (r) {
    const P = PRODUKTE[r.produkt], neu = !entdeckt[r.produkt];
    erg.innerHTML = `<span class="wbEmoji">${P.emoji}</span><span class="wbKurz">${r.menge}× ${neu ? '???' : P.name}</span>`;
    erg.title = neu ? 'Ein neues Rezept! Stell es her, um es zu entdecken.' : P.name;
    erg.className = 'wbFach voll ergebnis';
  } else { erg.innerHTML = '<span class="wbEmoji">❔</span>'; erg.className = 'wbFach ergebnis'; erg.title = ''; }
  $('wbMachen').disabled = !r || n < 1;
  $('wbAlles').disabled = !r || n < 2;
  $('wbAlles').textContent = r && n >= 2 ? `🔥 Alles machen (${n}×)` : '🔥 Alles machen';
  $('wbInfo').textContent = !wbFaecher.some(Boolean) ? 'Klick unten auf Zutaten, um sie in die Fächer zu legen!'
    : !r ? '❌ Daraus wird nichts. Tipp: 🔥 Grillen = 1 Sorte + Holz · 🧂 Pökeln = 1 Sorte + Salz · 🌭 Wurst = 2+ Fleisch + Salz + Holz'
    : r.art === 'wurst' ? '🌭 Wurst! Andere Fleisch- und Holzsorten geben andere Würste.' : r.art === 'grill' ? '🔥 Ab auf den Grill!' : '🧂 Einpökeln mit Salz!';
  // Zutaten (unten)
  const inv = $('wbInventar');
  inv.innerHTML = '';
  for (const k of zutatenListe()) {
    const frei = zutatHabe(k) - imGitter(k);
    if (zutatHabe(k) < 1) continue;
    const I = zutatInfo(k), d = document.createElement('button'); d.className = 'wbZutat';
    d.innerHTML = `${I.emoji} ${I.kurz} <b>${frei}</b>`; d.disabled = frei < 1;
    d.addEventListener('click', () => {   // In das nächste freie Fach legen
      const leer = wbFaecher.indexOf(null);
      if (leer < 0 || zutatHabe(k) - imGitter(k) < 1) { sound.nein(); return; }
      wbFaecher[leer] = k; sound.klick(); werkbankMalen();
    });
    inv.appendChild(d);
  }
  if (!inv.children.length) inv.innerHTML = '<span class="klein">Du hast keine Zutaten! 🔪 Tiere zum Metzger bringen (P im Gehege), 🎣 Fische angeln, 🪓 Holz in deinen Wäldern hacken (X), ⛏️ Salz in der Salzmine.</span>';
  // Rezeptbuch
  const liste = [];
  for (const W of WURST) liste.push(['wurst_' + W.id, W.fleisch ? `${W.fleisch.map(f => f === 'fisch' ? 'Fisch' : Object.values(FLEISCH).find(F => F.k === f).kurz).join(' + ')} · ${W.holz.map(h => HOLZARTEN[h].kurz).join(' + ')} · Salz` : 'andere Mischungen']);
  const bekannt = liste.filter(([k]) => entdeckt[k]).length;
  $('wbBuch').innerHTML = `<b>📜 Wurst-Rezeptbuch: ${bekannt} von ${liste.length} entdeckt</b><br>` + liste.map(([k, z]) => entdeckt[k]
    ? `<div>${PRODUKTE[k].emoji} <b>${PRODUKTE[k].name}</b> <span class="klein">= ${z} · ${euro(PRODUKTE[k].preis)}</span></div>`
    : '<div class="klein">❓ ??? (noch geheim)</div>').join('');
}
function herstellen(alle) {
  const r = rezeptFinden();
  if (!r) return;
  const n = alle ? wieOft(r) : Math.min(1, wieOft(r));
  if (n < 1) { sound.nein(); return; }
  for (const [k, m] of Object.entries(r.z)) zutatNehmen(k, m * n);
  vorrat[r.produkt] = (vorrat[r.produkt] || 0) + r.menge * n;
  const P = PRODUKTE[r.produkt], neu = !entdeckt[r.produkt];
  entdeckt[r.produkt] = true;
  try { localStorage.setItem(REZEPT_SPEICHER, JSON.stringify(entdeckt)); } catch (e) { /* egal */ }
  meldung(`${neu ? '✨ NEUES REZEPT! ' : ''}${P.emoji} ${r.menge * n}× ${P.name} hergestellt! (${euro(P.preis)} pro Stück im Dorfladen)`, 4);
  if (neu) { [523, 659, 784, 1047, 1319].forEach((f, k) => ton(f, k * 0.09, 0.2, 'triangle', 0.06)); } else sound.kaufen();
  if (r.art !== 'poekel') tonGleiten(2000, 300, 0, 0.6, 'sawtooth', 0.02);   // Zischhh auf dem Grill
  const wb = gebaute.find(b => b.werkbank && Math.hypot(wo().x - b.x, wo().z - b.z) < 7);
  if (wb) for (let k = 0; k < 8; k++) staub(wb.x + zufall(-0.5, 0.5), wb.z + zufall(-0.5, 0.5), 0xbbbbbb, 1.5, 1.5, 0.7);
  speichern(); werkbankMalen();
}
document.getElementById('wbMachen').addEventListener('click', () => { tonStart(); herstellen(false); });
document.getElementById('wbAlles').addEventListener('click', () => { tonStart(); herstellen(true); });
document.getElementById('wbLeeren').addEventListener('click', () => { wbFaecher.fill(null); sound.klick(); werkbankMalen(); });
document.getElementById('werkbank-zu').addEventListener('click', () => werkbankZeigen(false));
function werkbankUpdate() {   // Weggegangen? Werkbank zu
  if (!werkbankOffen) return;
  const wb = gebaute.find(b => b.werkbank && Math.hypot(wo().x - b.x, wo().z - b.z) < GEBAEUDE_ARTEN.werkbank.r + 5);
  if (!wb || aktiv) werkbankZeigen(false);
}
// ===== Angel einholen: mit Fisch dran (geschafft!) oder ohne (entwischt) =====
const EINHOLEN_DAUER = 0.9;      // So lange fliegt der Schwimmer zurück (Sekunden)
const FISCH_ZEIGEN_DAUER = 1.8;  // So lange zappelt der gefangene Fisch an der Angel, bevor du ihn einpackst
let einholen = null;
function angelZustand() { return angel ? (angel.phase === 'kampf' ? 2 : 1) : einholen ? 3 : 0; }   // 0 = keine Angel · 1 = warten · 2 = Fisch dran · 3 = einholen   // { schwimmer, fisch, sprite, t, start }
const fischBilder = {};   // Für jeden Fisch ein Bild mit seinem Emoji (wird nur einmal gemalt)
function fischBild(fisch) {
  if (!fischBilder[fisch]) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); g.font = '100px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(FISCHE[fisch].emoji, 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    fischBilder[fisch] = new THREE.SpriteMaterial({ map: t, depthTest: true });
  }
  return fischBilder[fisch];
}
function einholenStarten(schwimmer, fisch) {
  if (einholen) einholenEnde();
  einholen = { schwimmer, fisch, t: 0, start: schwimmer.position.clone(), sprite: null };
  if (fisch) {
    const groesse = 0.5 + FISCHE[fisch].schwer * 0.2;   // Schwere Fische sind größer!
    einholen.sprite = new THREE.Sprite(fischBild(fisch));
    einholen.sprite.scale.set(groesse, groesse, 1);
    einholen.sprite.position.copy(schwimmer.position);
    scene.add(einholen.sprite);
    tonGleiten(400, 1300, 0, 0.7, 'square', 0.03);   // Rrrrrr – die Rolle dreht sich schnell
  } else tonGleiten(700, 250, 0, 0.6, 'sine', 0.05);   // Wuuusch – leer zurück
}
function einholenEnde() {
  if (!einholen) return;
  scene.remove(einholen.schwimmer);
  if (einholen.sprite) scene.remove(einholen.sprite);
  einholen = null;
}
const einholenZiel = new THREE.Vector3();
function einholenUpdate(dt, spitze) {
  const e = einholen;
  e.t += dt;
  const sw = e.schwimmer.position;
  einholenZiel.set(spitze.x, spitze.y - (e.fisch ? 0.7 : 0.4), spitze.z);   // Unter der Spitze baumeln
  if (e.t < EINHOLEN_DAUER) {   // Im Bogen aus dem Wasser zur Angel fliegen
    const k = e.t / EINHOLEN_DAUER;
    sw.lerpVectors(e.start, einholenZiel, k);
    sw.y += Math.sin(Math.PI * k) * 1.0;
  } else {   // An der Angel hin und her baumeln
    sw.copy(einholenZiel);
    sw.x += Math.sin(e.t * 5) * 0.12;
  }
  if (e.sprite) {   // Der Fisch hängt am Haken und zappelt
    e.sprite.position.set(sw.x, sw.y - 0.1 - e.sprite.scale.y * 0.45, sw.z);
    e.sprite.material.rotation = Math.sin(e.t * 18) * 0.35;
  }
  if (e.t > EINHOLEN_DAUER + (e.fisch ? FISCH_ZEIGEN_DAUER : 0.15)) einholenEnde();
}
// Ein E-Druck (oder Klick auf das Angel-Fenster) beim Drillen: Der Fisch kommt ein Stück näher!
function angelKurbeln() {
  if (!angel || angel.phase !== 'kampf') return;
  angel.fort = Math.min(1, angel.fort + ANGEL_DRUECKEN);
  angel.wackeln = 1;
  ton(1600 + angel.fort * 900, 0, 0.04, 'square', 0.03);   // Klick-klick, die Rolle dreht sich
}
document.getElementById('angeln').addEventListener('pointerdown', e => { angelKurbeln(); e.preventDefault(); });
function angelUpdate(dt) {
  if (!angel) return;
  const a = angel;
  if (aktiv || Math.hypot(player.position.x - a.b.x, player.position.z - a.b.z) > GEBAEUDE_ARTEN.teich.r + 5 || !gebaute.includes(a.b)) { angelEnde(null); return; }
  if (a.phase === 'warten') {
    a.schwimmer.position.y = 0.15 + Math.sin(spielZeit * 3) * 0.03;   // Der Schwimmer wippt
    a.t -= dt;
    if (a.t <= 0) {   // Biss! Welcher Fisch? (seltene Fische kommen seltener)
      let summe = 0; for (const F of Object.values(FISCHE)) summe += F.chance;
      let z = Math.random() * summe;
      a.fisch = Object.keys(FISCHE).find(k => (z -= FISCHE[k].chance) < 0) || 'rotauge';
      Object.assign(a, { phase: 'kampf', fort: ANGEL_START, wackeln: 0, gruenZeit: 0 });
      const F = FISCHE[a.fisch];
      $('angelFisch').textContent = F.emoji;
      $('angelName').textContent = `${F.name} · ${'⭐'.repeat(Math.max(1, Math.round(F.schwer * 2)))}`;   // Mehr Sterne = schwerer
      $('angeln').style.display = 'block';
      if (document.pointerLockElement) document.exitPointerLock();
      ton(1200, 0, 0.08, 'square', 0.06); ton(1500, 0.1, 0.08, 'square', 0.06);
      meldung('❗ Biss! Drück ganz schnell E!', 2);
    }
    return;
  }
  // Das Minispiel: Der Fisch zieht den Balken runter, jedes E zieht ihn wieder hoch
  const F = FISCHE[a.fisch];
  a.schwimmer.position.y = 0.05 + Math.sin(spielZeit * 20) * 0.04;
  a.fort -= (ANGEL_ZIEHEN + F.schwer * ANGEL_ZIEHEN_SCHWER) * dt;
  a.wackeln = Math.max(0, a.wackeln - dt * 6);
  const zappeln = Math.sin(spielZeit * (8 + F.schwer * 6)) * (8 + F.schwer * 4);   // Der Fisch zappelt hin und her
  $('angelFisch').style.transform = `rotate(${zappeln}deg) scale(${1 + a.wackeln * 0.3})`;
  $('angelBalken').style.width = `${Math.max(0, a.fort) * 100}%`;
  const gruen = a.fort >= ANGEL_GRUEN;
  if (gruen) a.gruenZeit += dt;   // Im grünen Bereich läuft die Uhr
  $('angelBalken').style.background = gruen ? '#3ddc6e' : a.fort > 0.33 ? '#ffd166' : '#ff7a6b';
  $('angelUhr').textContent = `⏱️ ${Math.min(ANGEL_ZEIT, a.gruenZeit).toFixed(1)} / ${ANGEL_ZEIT} Sekunden im Grünen`;
  $('angelUhr').style.color = gruen ? '#7cf5a0' : '#fff';
  $('angelTaste').style.transform = `scale(${1 + a.wackeln * 0.25})`;
  if (a.gruenZeit >= ANGEL_ZEIT) angelEnde(true);   // 5 Sekunden im Grünen = gefangen!
  else if (a.fort <= 0) angelEnde(false);
}
// ===== Salzmine: Salzsteine abbauen =====
let salzsteine = 0, hackt = false, hackFort = 0, hackTon = 0;
const beiDerMine = () => !aktiv && Math.hypot(player.position.x - SALZMINE.eingangX, player.position.z - SALZMINE.eingangZ) < 3.5;
function salzUpdate(dt) {
  hackt = false;
  if (!beiDerMine() || saegeAn || building || angel || !(mouseDown || keys.x)) return;
  if (salzsteine >= SALZ_MAX) { meldungSelten(`🧂 Du kannst nur ${SALZ_MAX} Salzsteine tragen! Leg sie in ein Tiergehege (P).`); return; }
  hackt = true;
  yaw = Math.atan2(player.position.x - SALZMINE.x, player.position.z - SALZMINE.z);   // Zum Felsen schauen
  hackFort += dt / SALZ_ZEIT;
  hackTon -= dt;
  if (hackTon <= 0) {   // Tink! Tink!
    hackTon = 0.35;
    ton(1900 + Math.random() * 400, 0, 0.06, 'triangle', 0.08); ton(140, 0, 0.08, 'square', 0.04);
    for (let k = 0; k < 3; k++) staub(SALZMINE.eingangX + 1, SALZMINE.eingangZ + zufall(-1, 1), k ? 0xf2b8c6 : 0xbbbbbb, 1.2, 0.8, 0.4);
  }
  if (hackFort >= 1) {
    hackFort = 0; salzsteine++;
    meldung(`🧂 Salzstein abgebaut! (${salzsteine} von ${SALZ_MAX}) Leg ihn ins Tiergehege: P → Salzstein.`, 2.5);
    sound.holz(); speichern();
  }
}
function salzHinlegen(b) {
  if (salzsteine < 1) return;
  salzsteine--;
  b.geh.salz = Math.min(SALZ_BOOST * 3, (b.geh.salz || 0) + SALZ_BOOST);
  gebSenden(b); gehegeSchild(b);
  meldung(`🧂 Salzstein hingelegt! Die ${TIERE[b.geh.tier].name} geben jetzt ${Math.round(b.geh.salz / 60)} Minuten lang DOPPELT so viel! 🎉`, 4);
  tierLaute[b.geh.tier](1); speichern(); panelMalen();
}
const minSek = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ===== Nutztiere im Gehege =====
const fleckTex = (() => {   // Weißes Fell mit schwarzen Flecken (für Kühe)
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1e1e1e';
  for (const [x, y, r] of [[14, 18, 10], [44, 12, 7], [38, 44, 12], [10, 50, 6], [56, 34, 5]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.8, x, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function baueTier(art) {
  const g = new THREE.Group(), beine = [];
  const teil = (geo, m, x, y, z) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); t.castShadow = true; g.add(t); return t; };
  const bein = (x, z, h, dicke, m) => {   // Beine drehen sich an der Hüfte (zum Laufen)
    const p = new THREE.Group(); p.position.set(x, h, z); g.add(p);
    const t = new THREE.Mesh(new THREE.BoxGeometry(dicke, h, dicke), m); t.position.y = -h / 2; t.castShadow = true; p.add(t);
    beine.push(p);
  };
  const B = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  if (art === 'kuh') {
    const fell = new THREE.MeshStandardMaterial({ map: fleckTex, roughness: 0.9 }), rosa = mat(0xf0a8a8), schwarz = mat(0x1e1e1e), horn = mat(0xe8e0c8);
    teil(B(0.85, 0.8, 1.7), fell, 0, 1.05, 0);                 // Körper
    teil(B(0.45, 0.5, 0.55), fell, 0, 1.3, -1.05);             // Kopf
    teil(B(0.4, 0.25, 0.15), rosa, 0, 1.13, -1.36);            // Maul
    for (const sx of [-1, 1]) {
      teil(B(0.06, 0.18, 0.06), horn, sx * 0.17, 1.62, -1.0);   // Hörner
      teil(B(0.18, 0.08, 0.08), fell, sx * 0.31, 1.42, -0.98);   // Ohren
      teil(B(0.06, 0.06, 0.02), schwarz, sx * 0.12, 1.4, -1.33); // Augen
    }
    teil(B(0.3, 0.18, 0.3), rosa, 0, 0.6, 0.35);               // Euter
    teil(B(0.05, 0.6, 0.05), schwarz, 0, 1.0, 0.87);           // Schwanz
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bein(sx * 0.3, sz * 0.6, 0.65, 0.18, fell);
  } else if (art === 'schaf') {
    const wolle = mat(0xf3efe6, { flatShading: true }), schwarz = mat(0x2a2a2a);
    teil(new THREE.IcosahedronGeometry(0.55, 1), wolle, 0, 0.85, 0).scale.set(0.9, 0.8, 1.25);   // Flauschiger Körper
    teil(B(0.3, 0.35, 0.42), schwarz, 0, 1.0, -0.75);          // Kopf
    teil(new THREE.IcosahedronGeometry(0.17, 1), wolle, 0, 1.2, -0.66);   // Wolle auf dem Kopf
    for (const sx of [-1, 1]) teil(B(0.2, 0.06, 0.1), schwarz, sx * 0.2, 1.08, -0.68);   // Ohren
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bein(sx * 0.22, sz * 0.4, 0.5, 0.1, schwarz);
  } else if (art === 'schwein') {
    const rosa = mat(0xf2a6ae), dunkel = mat(0xd07080), schwarz = mat(0x1e1e1e);
    teil(B(0.6, 0.55, 1.1), rosa, 0, 0.62, 0);                 // Körper
    teil(B(0.44, 0.42, 0.36), rosa, 0, 0.72, -0.68);           // Kopf
    teil(B(0.24, 0.17, 0.08), dunkel, 0, 0.66, -0.9);          // Rüssel
    for (const sx of [-1, 1]) {
      teil(B(0.04, 0.05, 0.02), schwarz, sx * 0.05, 0.66, -0.945);   // Nasenlöcher
      teil(B(0.05, 0.05, 0.02), schwarz, sx * 0.12, 0.8, -0.865);    // Augen
      teil(B(0.13, 0.15, 0.04), rosa, sx * 0.16, 0.97, -0.62).rotation.x = 0.5;   // Ohren
    }
    teil(B(0.05, 0.05, 0.2), dunkel, 0, 0.78, 0.62).rotation.x = -0.8;   // Ringelschwanz
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bein(sx * 0.2, sz * 0.38, 0.36, 0.14, rosa);
  } else {
    const feder = mat(Math.random() < 0.5 ? 0xf6f2ea : 0xa0602a), rot = mat(0xd8221e), gelb = mat(0xf2b81e);
    teil(B(0.32, 0.32, 0.42), feder, 0, 0.38, 0);              // Körper
    teil(B(0.08, 0.25, 0.15), feder, 0, 0.55, 0.22);           // Schwanz
    teil(B(0.18, 0.2, 0.18), feder, 0, 0.62, -0.22);           // Kopf
    teil(B(0.04, 0.1, 0.14), rot, 0, 0.76, -0.22);             // Kamm
    teil(B(0.06, 0.05, 0.08), gelb, 0, 0.6, -0.34);            // Schnabel
    teil(B(0.04, 0.07, 0.03), rot, 0, 0.53, -0.32);            // Kehllappen
    for (const sx of [-1, 1]) bein(sx * 0.08, 0, 0.22, 0.04, gelb);
  }
  return { g, beine };
}
function gehegeEinrichten(b) {
  const A = GEBAEUDE_ARTEN[b.art];
  b.geh = { tier: A.tier, R: A.r - 1.6, futter: 0, lager: 0, tiere: [], takt: 0, salz: 0, zucht: 0, zuchtAus: false };
  b.schild = schild('', '#fff', 8); b.schild.position.set(b.x, 4.2, b.z); scene.add(b.schild); b.extra.push(b.schild);
  gehegeSchild(b);
}
function tierZahl(b, n) {   // So viele Tiere sollen im Gehege sein
  const geh = b.geh;
  while (geh.tiere.length < n) {
    const t = baueTier(geh.tier), w = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * geh.R;
    t.x = b.x + Math.cos(w) * rr; t.z = b.z + Math.sin(w) * rr; t.zx = t.x; t.zz = t.z; t.warte = Math.random() * 3; t.phase = 0;
    t.g.position.set(t.x, 0, t.z); t.g.rotation.y = Math.random() * 6; t.jung = 1;   // jung: 1 = erwachsen, kleiner = Baby
    scene.add(t.g); geh.tiere.push(t); b.extra.push(t.g);
  }
  while (geh.tiere.length > n) { const t = geh.tiere.pop(); scene.remove(t.g); }
}
const babyZahl = geh => geh.tiere.filter(t => t.jung < 1).length;
const erwachsenZahl = geh => geh.tiere.length - babyZahl(geh);
function gehegeSchild(b) {
  const geh = b.geh, T = TIERE[geh.tier], P = PRODUKTE[T.produkt], n = geh.tiere.length, babys = babyZahl(geh);
  if (!n) { b.schild.userData.malen(`${T.emoji} Leer – P drücken`, '#b9f5a0'); return; }
  const hunger = geh.futter <= 0;
  b.schild.userData.malen(`${T.emoji} ${n - babys}${babys ? ` ${T.babyEmoji} ${babys}` : ''} · ${P.emoji} ${Math.floor(geh.lager)} ${P.einheit}${hunger ? ' · ⚠️ Hunger!' : geh.salz > 0 ? ' · 🧂×2' : ''}${geh.einstreu > 0 ? ' · 🟨' : ''}`, hunger ? '#ff9a6b' : '#ffd166');
}
const tierLaute = {
  kuh: l => tonGleiten(150, 105, 0, 1.3, 'sawtooth', 0.05 * l),
  schaf: l => { for (let k = 0; k < 4; k++) ton(470 - k * 10, k * 0.08, 0.1, 'square', 0.025 * l); },
  huhn: l => { for (let k = 0; k < 4; k++) ton(850 + Math.random() * 400, k * 0.13, 0.07, 'square', 0.025 * l); },
  schwein: l => { tonGleiten(330, 210, 0, 0.16, 'sawtooth', 0.045 * l); tonGleiten(310, 190, 0.22, 0.18, 'sawtooth', 0.045 * l); },   // Oink oink!
};
const rauchPos = new THREE.Vector3();
function gebUpdate(dt) {
  for (const b of gebaute) {
    if (b.wald && b.wald.w.some(w => w < 1)) {   // Gefällte Bäume wachsen nach
      for (let k = 0; k < b.wald.w.length; k++) if (b.wald.w[k] < 1) b.wald.w[k] = Math.min(1, b.wald.w[k] + dt / WALD_NACHWACHSEN);
      b.wald.takt -= dt;
      if (b.wald.takt <= 0) { b.wald.takt = 1; waldPlotMalen(b); }
    }
    if (b.werkbank && Math.random() < dt * 2.5) {   // Der Grill qualmt ein bisschen
      b.mesh.localToWorld(rauchPos.set(-0.65, 1.4, 0));
      staub(rauchPos.x, rauchPos.z, 0x9a9a9a, rauchPos.y, 1.2, 0.5);
    }
    if (b.teich) {
      b.teich.fischG.rotation.y += dt * 0.25;
      if (b.teich.fische < TEICH_FISCHE_MAX) {
        const vorher = Math.floor(b.teich.fische);
        b.teich.fische = Math.min(TEICH_FISCHE_MAX, b.teich.fische + dt / 30);
        if (Math.floor(b.teich.fische) !== vorher) teichSchild(b);
      }
    }
    if (b.obst && b.obst.w < 1) {   // Obst wächst
      b.obst.w = Math.min(1, b.obst.w + dt / OBST[b.art].zeit);
      b.obst.takt -= dt;
      if (b.obst.takt <= 0 || b.obst.w >= 1) { b.obst.takt = 0.5; obstMalen(b); }
    }
    if (b.gh) {   // Gemüse wächst
      const G = GEMUESE[b.gh.art];
      if (!G || b.gh.w >= 1) continue;
      b.gh.w = Math.min(1, b.gh.w + dt / G.zeit);
      b.gh.takt -= dt;
      if (b.gh.takt <= 0 || b.gh.w >= 1) { b.gh.takt = 0.5; ghMalen(b); }
    }
    if (b.geh) {
      const geh = b.geh, T = TIERE[geh.tier], n = geh.tiere.length, gross = erwachsenZahl(geh);
      // Fressen und Milch/Wolle/Eier geben (nur wenn Futter da ist!). Das Lager fasst so viel wie 10 Minuten. Babys fressen nur halb so viel und geben noch nichts.
      const boost = (geh.salz > 0 ? 2 : 1) * (geh.einstreu > 0 ? 1.3 : 1);   // Mit Salzstein: doppelt so viel! Mit Stroh-Einstreu: 30 % mehr
      if (geh.einstreu > 0) geh.einstreu = Math.max(0, geh.einstreu - dt);
      if (geh.salz > 0) geh.salz = Math.max(0, geh.salz - dt);
      b.mesh.userData.salz.visible = geh.salz > 0;
      if (n && geh.futter > 0) {
        geh.futter = Math.max(0, geh.futter - (gross + (n - gross) * 0.5) * T.frisst * dt / 60);
        geh.lager = Math.min(Math.max(1, gross) * T.proMin * 20, geh.lager + gross * T.proMin * boost * dt / 60);
        // Babys wachsen (nur mit Futter)
        for (const t of geh.tiere) if (t.jung < 1) {
          t.jung = Math.min(1, t.jung + dt / T.gross);
          if (t.jung >= 1 && Math.hypot(wo().x - b.x, wo().z - b.z) < 40) meldung(`${T.emoji} Ein ${T.baby} ist groß geworden! Jetzt gibt es auch ${PRODUKTE[T.produkt].name}.`, 3);
        }
        // Nachwuchs: mindestens 2 erwachsene Tiere, noch Platz im Gehege, Futter da (macht nur der Gastgeber)
        if (gross >= 2 && n < T.max && !geh.zuchtAus && (!mp.aktiv || mp.rolle === 'host')) {
          geh.zucht += dt * (jahreszeit().zeit === 'winter' ? ZUCHT_WINTER : 1) * (geh.salz > 0 ? 1.5 : 1) * Math.min(2, gross / 2);
          if (geh.zucht >= T.zucht) {
            geh.zucht = 0;
            tierZahl(b, n + 1);
            const baby = geh.tiere[geh.tiere.length - 1]; baby.jung = 0.02;
            gebSenden(b); gehegeSchild(b); speichern();
            const nah = Math.max(0, 1 - Math.hypot(wo().x - b.x, wo().z - b.z) / 60);
            meldung(`🍼 Juhu! In der ${GEBAEUDE_ARTEN[b.art].name} ist ein ${T.baby} ${T.babyEmoji} geboren!`, 4);
            [784, 988, 1175, 1568].forEach((f, k) => ton(f, k * 0.1, 0.18, 'triangle', 0.05));
            if (nah > 0.05) tierLaute[geh.tier](nah);
            for (let k = 0; k < 3; k++) herzchen(baby.x, 1 + k * 0.2, baby.z);
          }
        }
      }
      const trog = b.mesh.userData.trog;
      trog.visible = geh.futter > 0; trog.scale.y = 0.3 + 2 * geh.futter / FUTTER_MAX;
      // Die Tiere laufen im Gehege herum
      for (const t of geh.tiere) {
        if (t.warte > 0) { t.warte -= dt; t.phase *= Math.pow(0.01, dt); }
        else {
          const dx = t.zx - t.x, dz = t.zz - t.z, l = Math.hypot(dx, dz);
          if (l < 0.2) {   // Angekommen: kurz stehen bleiben (grasen), dann ein neues Ziel
            t.warte = 1 + Math.random() * 5;
            const w = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * geh.R;
            t.zx = b.x + Math.cos(w) * rr; t.zz = b.z + Math.sin(w) * rr;
          } else {
            const v = Math.min(l, T.tempo * (t.jung < 1 ? 1.3 : 1) * dt);
            t.x += dx / l * v; t.z += dz / l * v;
            t.g.rotation.y = Math.atan2(-dx, -dz);
            t.phase += dt * 8;
          }
        }
        t.g.position.set(t.x, 0, t.z);
        t.g.scale.setScalar(0.45 + 0.55 * t.jung);   // Babys sind klein
        t.beine.forEach((bn, k) => { bn.rotation.x = Math.sin(t.phase + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI : 0)) * 0.45 * Math.min(1, t.phase); });
      }
      // Ab und zu macht ein Tier "Muh", "Mäh" oder "Gack" (wenn du in der Nähe bist)
      if (n && Math.random() < dt / 10) { const l = Math.max(0, 1 - Math.hypot(wo().x - b.x, wo().z - b.z) / 35); if (l > 0.05) tierLaute[geh.tier](l); }
      geh.takt -= dt;
      if (geh.takt <= 0) { geh.takt = 0.5; gehegeSchild(b); }
    }
  }
}
// Zustand eines Gewächshauses/Geheges (zum Speichern und für den Multiplayer)
function gebDaten(b) {
  if (b.obst) return { o: Math.round(b.obst.w * 1000) / 1000 };
  if (b.gh) return { a: b.gh.art, w: Math.round(b.gh.w * 1000) / 1000 };
  if (b.geh) return { n: b.geh.tiere.length, f: Math.round(b.geh.futter), l: Math.round(b.geh.lager * 10) / 10, s: Math.round(b.geh.salz),
    j: b.geh.tiere.map(t => Math.round(t.jung * 100) / 100), z: Math.round(b.geh.zucht), za: b.geh.zuchtAus ? 1 : 0, e: Math.round(b.geh.einstreu || 0) };
  if (b.teich) return { t: Math.round(b.teich.fische * 100) / 100 };
  if (b.wald) return { wa: b.wald.w.map(w => Math.round(w * 100) / 100) };
  if (b.biene) return { hn: Math.round(b.biene.lager * 10) / 10 };
  if (b.silo) return b.silo.roh > 0 ? { roh: Math.round(b.silo.roh) } : null;
  if (b.fs) { const F = b.fs; return { fs: [Math.round(F.inhalt), Math.round(F.fest * 1000) / 1000, F.zu ? 1 : 0, Math.round(F.gaer * 1000) / 1000, F.fertig ? 1 : 0] }; }
  return null;
}
function gebDatenSetzen(b, d) {
  if (!d) return;
  if (b.obst) { b.obst.w = d.o || 0; obstMalen(b); }
  if (b.gh) { b.gh.art = GEMUESE[d.a] ? d.a : null; b.gh.w = d.w || 0; ghMalen(b); }
  if (b.geh) {
    tierZahl(b, Math.min(d.n || 0, TIERE[b.geh.tier].max)); b.geh.futter = d.f || 0; b.geh.lager = d.l || 0; b.geh.salz = d.s || 0;
    if (Array.isArray(d.j)) b.geh.tiere.forEach((t, k) => { if (typeof d.j[k] === 'number') t.jung = d.j[k]; });
    if (typeof d.z === 'number') b.geh.zucht = d.z;
    b.geh.zuchtAus = !!d.za;
    b.geh.einstreu = d.e || 0;
    gehegeSchild(b);
  }
  if (b.teich) { b.teich.fische = d.t ?? TEICH_FISCHE_MAX; teichSchild(b); }
  if (b.silo && typeof d.roh === 'number') { b.silo.roh = Math.min(d.roh, b.silo.inhalt); b.silo.rohBasis = b.silo.roh; siloSchild(b.silo); }
  if (b.biene && typeof d.hn === 'number') { b.biene.lager = d.hn; bienenSchild(b); }
  if (b.fs && Array.isArray(d.fs)) { const F = b.fs; F.inhalt = d.fs[0] || 0; F.fest = d.fs[1] || 0; F.zu = !!d.fs[2]; F.gaer = d.fs[3] || 0; F.fertig = !!d.fs[4]; fahrsiloMalen(b); }
  if (b.wald && Array.isArray(d.wa)) { d.wa.forEach((w, k) => { if (k < b.wald.w.length) b.wald.w[k] = w; }); waldPlotMalen(b); }
}
const gebSchluessel = b => `${b.x.toFixed(1)},${b.z.toFixed(1)}`;
function gebSenden(b) { mpEvent({ t: 'geb', k: gebSchluessel(b), d: gebDaten(b) }); }
// Was du geerntet und eingesammelt hast (verkaufen im Dorfladen)
let vorrat = {};
const DORFLADEN = { x: 20, z: 78 };   // Vor der Tür vom Dorfladen
const beimDorfladen = () => Math.hypot(wo().x - DORFLADEN.x, wo().z - DORFLADEN.z) < 7;
const verkaufbar = k => PRODUKTE[k] && !PRODUKTE[k].roh;   // Rohes Fleisch und Holz kauft der Dorfladen nicht
const vorratWert = () => Object.entries(vorrat).reduce((s, [k, m]) => s + (verkaufbar(k) ? m * PRODUKTE[k].preis : 0), 0);
function vorratVerkaufen() {
  const wert = Math.round(vorratWert());
  if (wert <= 0) { meldung('🛒 Du hast nichts zum Verkaufen! Ernte Gemüse im Gewächshaus 🪴 oder sammel Milch, Eier und Wolle bei den Tieren 🐄 (P).', 4); sound.nein(); return; }
  money += wert;
  meldung(`🛒💶 Im Dorfladen verkauft: ${vorratText(true)} für ${euro(wert)}!`, 4);
  for (const k of Object.keys(vorrat)) if (verkaufbar(k)) delete vorrat[k];   // Fleisch und Holz bleiben für die Werkbank
  sound.kasse();
  speichern();
}
const vorratText = (nurVerkaufbar = false) => Object.entries(vorrat).filter(([k, m]) => m >= 1 && PRODUKTE[k] && (!nurVerkaufbar || verkaufbar(k))).map(([k, m]) => `${PRODUKTE[k].emoji} ${Math.floor(m)}`).join(' ') || 'leer';
function nahesHofGebaeude() {
  const p = wo();
  let bestes = null, bestD = Infinity;
  for (const b of gebaute) {
    if (!b.gh && !b.geh && !b.obst && !b.teich && !b.werkbank && !b.fs && !b.biene) continue;
    const d = Math.hypot(p.x - b.x, p.z - b.z) - GEBAEUDE_ARTEN[b.art].r;
    if (d < 3.5 && d < bestD) { bestD = d; bestes = b; }
  }
  return bestes;
}
// Das Menü beim Gewächshaus oder Gehege (Taste P)
let panelGeb = null, panelZustand = '';
function panelZeigen(b) {
  panelGeb = b;
  $('hofpanel').style.display = b ? 'block' : 'none';
  if (!b) return;
  if (document.pointerLockElement) document.exitPointerLock();
  panelMalen();
}
function knopf(eltern, text, geht, aktion) {
  const k = document.createElement('button');
  k.textContent = text; k.disabled = !geht;
  k.addEventListener('click', () => { tonStart(); aktion(); });
  eltern.appendChild(k);
}
function panelStatus() {   // Der Text oben im Menü (wird ständig neu geschrieben)
  const b = panelGeb;
  if (b.gh) { const G = GEMUESE[b.gh.art]; return G ? (b.gh.w >= 1 ? `${G.emoji} ${G.name} sind reif!` : `${G.emoji} ${G.name} wachsen: ${Math.floor(b.gh.w * 100)} %`) : 'Das Gewächshaus ist leer. Was willst du anbauen?'; }
  const geh = b.geh, T = TIERE[geh.tier], P = PRODUKTE[T.produkt];
  const babys = babyZahl(geh), gross = geh.tiere.length - babys;
  const zucht = geh.zuchtAus ? '🍼 Nachwuchs: aus' : geh.tiere.length >= T.max ? '🍼 Gehege voll – kein Platz für Babys' : gross < 2 ? `🍼 Für Babys brauchst du 2 erwachsene ${T.name}` : geh.futter <= 0 ? '🍼 Ohne Futter keine Babys' : `🍼 Nächstes ${T.baby}: ${Math.floor(geh.zucht / T.zucht * 100)} %`;
  return `${T.emoji} ${gross} ${T.name}${babys ? ` + ${T.babyEmoji} ${babys} ${T.baby}` : ''} (Platz für ${T.max}) · ${zucht} · 🌾 Futter: ${kg(geh.futter)} · ${P.emoji} ${P.name}: ${Math.floor(geh.lager)} ${P.einheit}${geh.salz > 0 ? ` · 🧂 Salz-Boost ×2 noch ${minSek(geh.salz)}` : ''}${geh.futter <= 0 && geh.tiere.length ? ' · ⚠️ Die Tiere haben Hunger!' : ''}`;
}
const panelZustandJetzt = b => b.gh ? `${b.gh.art}-${b.gh.w >= 1}` : `${b.geh.tiere.length}-${b.geh.zuchtAus}-${Math.floor(b.geh.lager) > 0}-${Math.round(b.geh.futter / 50)}-${money}-${salzsteine}`;
function panelMalen() {
  const b = panelGeb, A = GEBAEUDE_ARTEN[b.art], box = $('hofpanelInhalt');
  $('hofpanelTitel').textContent = `${A.emoji} ${A.name}`;
  box.innerHTML = '';
  const st = document.createElement('div'); st.id = 'panelStatus'; st.style.marginBottom = '8px'; st.textContent = panelStatus(); box.appendChild(st);
  panelZustand = panelZustandJetzt(b);
  if (b.gh) {
    const G = GEMUESE[b.gh.art];
    if (!G) {
      for (const [art, S] of Object.entries(GEMUESE)) {
        const z = document.createElement('div'); z.className = 'angebot';
        z.innerHTML = `<b>${S.emoji} ${S.name}</b> – Saat ${euro(S.kosten)}<br><span class="klein">⏳ ${S.zeit} Sekunden · 🧺 ${S.menge} ${S.einheit} · 💶 bringt ${euro(S.menge * S.preis)} im Dorfladen</span><br>`;
        knopf(z, money >= S.kosten ? '🌱 Pflanzen' : '💸 Zu teuer', money >= S.kosten, () => pflanzen(b, art));
        box.appendChild(z);
      }
    } else if (b.gh.w >= 1) knopf(box, `🧺 Ernten: ${G.menge} ${G.einheit} ${G.name}`, true, () => ghErnten(b));
  } else {
    const geh = b.geh, T = TIERE[geh.tier], P = PRODUKTE[T.produkt], n = geh.tiere.length;
    knopf(box, n >= T.max ? `${T.emoji} Gehege ist voll` : `➕ 1 ${T.einzeln} kaufen (${euro(T.preis)})`, n < T.max && money >= T.preis, () => tierKaufen(b));
    knopf(box, `🧺 Einsammeln: ${Math.floor(geh.lager)} ${P.einheit} ${P.name}`, geh.lager >= 1, () => einsammeln(b));
    const FL = FLEISCH[geh.tier];
    if (FL) knopf(box, `🔪 1 ${T.einzeln} zum Metzger bringen → ${FL.kg} kg ${FL.emoji} ${FL.name}`, n > 0, () => zumMetzger(b));
    knopf(box, geh.zuchtAus ? `🍼 Nachwuchs ist AUS – wieder anschalten` : `🍼 Nachwuchs ist AN – ausschalten (keine Babys mehr)`, true, () => { geh.zuchtAus = !geh.zuchtAus; gebSenden(b); speichern(); panelMalen(); });
    knopf(box, `🧂 Salzstein hinlegen → ×2 für 10 Min. (du hast ${salzsteine})`, salzsteine > 0, () => salzHinlegen(b));
    knopf(box, `🌾 1.000 kg Futter kaufen (${euro(1000 * FUTTER_PREIS)})`, geh.futter < FUTTER_MAX - 1 && money >= 1000 * FUTTER_PREIS, () => futterKaufen(b));
    const tipp = document.createElement('div'); tipp.className = 'klein'; tipp.style.marginTop = '6px';
    tipp.textContent = `💡 Jedes ${T.einzeln} gibt ${T.proMin} ${P.einheit} ${P.name} pro Minute (${euro(T.proMin * P.preis)}) – aber nur mit Futter! Gratis-Futter: Fahr mit Korn im Tank her und drück L.`;
    box.appendChild(tipp);
  }
}
function panelUpdate() {
  if (!panelGeb) return;
  if (!gebaute.includes(panelGeb) || Math.hypot(wo().x - panelGeb.x, wo().z - panelGeb.z) > GEBAEUDE_ARTEN[panelGeb.art].r + 5) { panelZeigen(null); return; }   // Weggegangen? Menü zu
  if (panelZustandJetzt(panelGeb) !== panelZustand) panelMalen();
  else $('panelStatus').textContent = panelStatus();
}
function pflanzen(b, art) {
  const G = GEMUESE[art];
  if (b.gh.art || money < G.kosten) return;
  money -= G.kosten; b.gh.art = art; b.gh.w = 0;
  ghMalen(b); gebSenden(b);
  meldung(`🌱 ${G.name} gepflanzt! In ${G.zeit} Sekunden ist alles reif.`, 3);
  sound.kaufen(); speichern(); panelMalen();
}
function ghErnten(b) {
  const G = GEMUESE[b.gh.art];
  if (!G || b.gh.w < 1) return;
  vorrat[b.gh.art] = (vorrat[b.gh.art] || 0) + G.menge;
  b.gh.art = null; b.gh.w = 0;
  ghMalen(b); gebSenden(b);
  meldung(`🧺 ${G.menge} ${G.einheit} ${G.name} geerntet! Verkaufen im Dorfladen 🛒 (V).`, 3.5);
  sound.korn(); speichern(); panelMalen();
}
function tierKaufen(b) {
  const T = TIERE[b.geh.tier];
  if (b.geh.tiere.length >= T.max || money < T.preis) return;
  money -= T.preis; tierZahl(b, b.geh.tiere.length + 1);
  gebSenden(b); gehegeSchild(b);
  meldung(`${T.emoji} Neues ${T.einzeln} im Gehege!${b.geh.futter <= 0 ? ' Vergiss das Futter nicht! 🌾' : ''}`, 3);
  tierLaute[b.geh.tier](1); speichern(); panelMalen();
}
function einsammeln(b) {
  const T = TIERE[b.geh.tier], P = PRODUKTE[T.produkt], m = Math.floor(b.geh.lager);
  if (m < 1) return;
  vorrat[T.produkt] = (vorrat[T.produkt] || 0) + m; b.geh.lager -= m;
  gebSenden(b); gehegeSchild(b);
  meldung(`🧺 ${m} ${P.einheit} ${P.name} eingesammelt! Verkaufen im Dorfladen 🛒 (V).`, 3.5);
  sound.holz(); speichern(); panelMalen();
}
function zumMetzger(b) {   // Ein Tier zum Metzger bringen: Du bekommst Fleisch für die Werkbank
  const T = TIERE[b.geh.tier], FL = FLEISCH[b.geh.tier], n = b.geh.tiere.length;
  if (!FL || n < 1) return;
  tierZahl(b, n - 1);
  vorrat['fleisch_' + FL.k] = (vorrat['fleisch_' + FL.k] || 0) + FL.kg;
  gebSenden(b); gehegeSchild(b);
  meldung(`🔪 Der Metzger hat ${FL.kg} kg ${FL.emoji} ${FL.name} für dich! Mach daraus an der Werkbank 🛠️ Wurst, Grillsachen oder Gepökeltes.`, 4.5);
  sound.holz(); speichern(); panelMalen();
}
function futterKaufen(b) {
  const menge = Math.min(1000, FUTTER_MAX - b.geh.futter), kosten = Math.round(menge * FUTTER_PREIS);
  if (menge <= 0 || money < kosten) return;
  money -= kosten; b.geh.futter += menge;
  gebSenden(b);
  meldung(`🌾 ${kg(menge)} Futter in den Trog geschüttet für ${euro(kosten)}`);
  sound.korn(); speichern(); panelMalen();
}
function futterAbladen(b) {   // Korn vom Fahrzeug als Futter in den Trog
  const menge = Math.min(kornDrin(aktiv), FUTTER_MAX - b.geh.futter);
  if (kornDrin(aktiv) <= 0) { meldung('🌾 Du hast kein Korn dabei! Ernte erst ein Feld – oder kauf Futter im Menü (P).'); sound.nein(); return; }
  if (menge <= 0 && gutVon(aktiv) !== 'stroh') { meldung('🌾 Der Futtertrog ist schon voll!'); sound.nein(); return; }
  const G = GUETER[gutVon(aktiv)];
  if (G === GUETER.stroh) {   // Stroh ist kein Futter, sondern Einstreu: weich und warm – die Tiere geben mehr!
    const n = Math.max(1, Math.floor(kornDrin(aktiv) / BALLEN_KG));
    kornWeg(aktiv, n * BALLEN_KG); b.geh.einstreu = (b.geh.einstreu || 0) + n * EINSTREU_PRO_BALLEN;
    gebSenden(b); gehegeSchild(b);
    meldung(`🟨 ${n} Strohballen als Einstreu verteilt! Die Tiere fühlen sich wohl und geben ${minSek(b.geh.einstreu)} lang 30 % mehr. 😊`, 4);
    sound.holz(); speichern(); return;
  }
  kornWeg(aktiv, menge); b.geh.futter += menge;
  gebSenden(b);
  meldung(`${G.emoji} ${kg(menge)} ${G.name} als Futter abgeladen! (${kg(b.geh.futter)} im Trog)${G === GUETER.silage ? ' Lecker! 😋' : ''}`, 3);
  sound.korn(); speichern();
}
function hofHinweis() {   // Hinweis unten in der Mitte beim Dorfladen, Gewächshaus und Gehege
  if (inHaus(wo().x, wo().z) && !aktiv && Math.hypot(player.position.x - HAUS.bett.x, player.position.z - HAUS.bett.z) < 2.6) return `🛏️ Z = Schlafen (bis morgen ${AUFSTEH_ZEIT}:00 Uhr)`;
  if (beiDerMine()) return saegeAn ? '⛏️ Pack erst die Motorsäge weg (Q)!' : `⛏️ Salzmine: X oder Maus halten = Salzstein abbauen (${salzsteine} von ${SALZ_MAX}${hackt ? ` · ${Math.round(hackFort * 100)} %` : ''})`;
  if (beimDorfladen()) return `🛒 Dorfladen: V = alles verkaufen (${vorratText(true)} = ${euro(vorratWert())})`;
  if (beiDerFiliale()) { const P = PRODUKTE[angebotHeute()]; return `🏬 Großmarkt: V = verkaufen (${euro(filialeWert())}${aktiv && ['korn', 'silage'].includes(gutVon(aktiv)) ? ` + ${gutText(aktiv)}` : ''}) · 30 % mehr als im Dorf! · ⭐ Heute ${P.emoji} ${P.name} ×2`; }
  { const t = naechstesHaustier(); if (t) return `${t.hund ? '🐕' : '🐈'} P = ${t.name} streicheln 💕`; }
  const wp = naherWaldPlot();
  if (wp) { const H = HOLZARTEN[wp.wald.holz]; return `🪓 ${GEBAEUDE_ARTEN[wp.art].name}: X oder Maus halten = Holz hacken (${Math.floor(vorrat['holz_' + wp.wald.holz] || 0)} Scheite ${H.name}${hackt ? ` · ${Math.round(waldHackFort * 100)} %` : ''})`; }
  const b = nahesHofGebaeude();
  if (!b) return '';
  if (b.werkbank) return werkbankOffen ? '' : aktiv ? '🛠️ Steig aus (E), dann P = Werkbank' : '🛠️ P = Werkbank öffnen (Wurst machen, Grillen, Pökeln)';
  if (b.teich) return angel ? (angel.phase === 'warten' ? '🎣 Warte auf einen Biss ...' : '') : aktiv ? '🎣 Zum Angeln aussteigen (E)' : `🎣 P = Angeln (${Math.floor(b.teich.fische)} Fische im Teich)`;
  if (b.obst) { const O = OBST[b.art]; return b.obst.w >= 1 ? `${O.emoji} P = ${O.menge} kg ${O.name} pflücken` : `${O.emoji} ${GEBAEUDE_ARTEN[b.art].name}: ${b.obst.w < 0.25 ? 'blüht' : 'Früchte wachsen'} (${Math.floor(b.obst.w * 100)} %)`; }
  if (aktiv && b.geh) return kornDrin(aktiv) > 0 ? (gutVon(aktiv) === 'stroh' ? '🟨 L = Stroh als Einstreu verteilen (die Tiere geben 30 % mehr!)' : `${GUETER[gutVon(aktiv)].emoji} L = ${GUETER[gutVon(aktiv)].name} als Futter abladen (${kg(kornDrin(aktiv))})`) : '';
  if (b.fs) return fahrsiloHinweis(b);
  if (b.biene) return jahreszeit().honig <= 0 ? `🐝 Die Bienen halten Winterruhe 💤 (${Math.floor(b.biene.lager)} kg Honig drin)` : `🐝 Bienenstock: ${b.biene.lager >= 1 ? 'P = Honig ernten' : 'Die Bienen sammeln Honig …'} (${b.biene.lager.toFixed(1).replace('.', ',')} kg · ${bluetenNah(b) ? '🌸 Blüten in der Nähe: doppelt so schnell!' : 'Tipp: Obstbäume in der Nähe = doppelt so viel Honig'})`;
  return panelGeb ? '' : `${GEBAEUDE_ARTEN[b.art].emoji} P = ${GEBAEUDE_ARTEN[b.art].name}-Menü öffnen`;
}
// Das Hof-Silo: gehört dir von Anfang an
const HOF_SILO = { x: 41, z: 23 };
{
  const m = baueGebaeudeMesh('silo'); m.position.set(HOF_SILO.x, 0, HOF_SILO.z); scene.add(m);
  hindernisse.push({ x: HOF_SILO.x, z: HOF_SILO.z, r: 2.6 });
}
const hofSilo = neuesSilo(HOF_SILO.x, HOF_SILO.z);
// ===== 🗑️ Entfernen-Modus: Gebäude, Bäume, Fahrzeuge und Anhänger wieder wegmachen (du bekommst die Hälfte vom Preis zurück) =====
let entfernen = false, entfernenZiel = null;
const markierung = new THREE.BoxHelper(new THREE.Object3D(), 0xff3333); markierung.visible = false; scene.add(markierung);
function entfernenUmschalten(an = !entfernen) {
  entfernen = an;
  if (entfernen && !building) buildMode();
  if (!entfernen) { entfernenZiel = null; markierung.visible = false; }
  if (entfernen) meldung('🗑️ Entfernen: Zeig mit der Maus auf ein Gebäude, einen Baum, ein Fahrzeug oder einen Anhänger und klick drauf!', 3.5);
  updateHUD();
}
function zielInfo(z) {   // Name und Geld zurück
  if (z.b) { const A = GEBAEUDE_ARTEN[z.b.art]; return { name: `${A.emoji} ${A.name}`, geld: Math.round(A.preis / 2) }; }
  if (z.fz) return { name: `${z.fz.typ.emoji} ${z.fz.typ.name}`, geld: Math.round(z.fz.typ.preis / 2) };
  return { name: `${z.a.typ.emoji} ${z.a.typ.name}`, geld: Math.round(z.a.typ.preis / 2) };
}
function entfernenSuchen() {   // Was ist unter der Maus?
  strahl.setFromCamera(zeiger, camera);
  const besitzer = new Map();
  for (const b of gebaute) besitzer.set(b.mesh, { b });
  for (const fz of fahrzeuge) besitzer.set(fz.g, { fz });
  for (const a of anhaenger) besitzer.set(a.g, { a });
  const treffer = strahl.intersectObjects([...besitzer.keys()], true);
  entfernenZiel = null;
  for (const t of treffer) {
    let o = t.object;
    while (o && !besitzer.has(o)) o = o.parent;
    if (o) { entfernenZiel = besitzer.get(o); markierung.setFromObject(o); break; }
  }
  markierung.visible = !!entfernenZiel;
}
function gebaeudeEntfernen(b) {
  scene.remove(b.mesh);
  const k = hindernisse.indexOf(b.h); if (k >= 0) hindernisse.splice(k, 1);
  for (const h of b.hx || []) { const n = hindernisse.indexOf(h); if (n >= 0) hindernisse.splice(n, 1); }
  if (b.silo) { scene.remove(b.silo.schild); silos.splice(silos.indexOf(b.silo), 1); }
  for (const o of b.extra || []) scene.remove(o);
  if (b.tier) { const n = haustiere.indexOf(b.tier); if (n >= 0) haustiere.splice(n, 1); }
  if (panelGeb === b) panelZeigen(null);
  const n = gebaute.indexOf(b); if (n >= 0) gebaute.splice(n, 1);
}
function fahrzeugEntfernen(fz) {
  if (mitfahrt === fz) beifahrerAus();
  if (fz.anh) abkuppeln(fz);
  scene.remove(fz.g);
  const n = fahrzeuge.indexOf(fz); if (n >= 0) fahrzeuge.splice(n, 1);
  if (letztes === fz) letztes = fahrzeuge[0] || null;
}
function anhaengerEntfernen(a) {
  if (a.an) abkuppeln(a.an);
  scene.remove(a.g);
  const n = anhaenger.indexOf(a); if (n >= 0) anhaenger.splice(n, 1);
}
function entfernenKlick() {
  const z = entfernenZiel;
  if (!z) { meldung('🗑️ Da ist nichts zum Entfernen. Zeig genau auf ein Gebäude, einen Baum oder ein Fahrzeug!'); sound.nein(); return; }
  if (z.fz && z.fz === aktiv) { meldung('🚜 Da sitzt du gerade drin! Steig erst aus (E).'); sound.nein(); return; }
  if (z.fz && (fremdGefahren(z.fz) || z.fz.helfer)) { meldung(z.fz.helfer ? `👷 Damit arbeitet gerade ${z.fz.helfer.name}!` : '🚫 Damit fährt gerade ein anderer Bauer!'); sound.nein(); return; }
  if (z.a && z.a.an && (z.a.an === aktiv || fremdGefahren(z.a.an))) { meldung('🔗 Der Anhänger hängt gerade an einem Fahrzeug, das fährt!'); sound.nein(); return; }
  const I = zielInfo(z);
  const inhalt = z.b && z.b.silo && z.b.silo.inhalt > 0 ? `\n⚠️ Da sind noch ${kg(z.b.silo.inhalt)} drin – die sind dann weg!` : z.b && z.b.geh && z.b.geh.tiere.length ? `\n⚠️ Die ${z.b.geh.tiere.length} Tiere werden verkauft (zählt zum Geld dazu).` : '';
  const tierGeld = z.b && z.b.geh ? Math.round(z.b.geh.tiere.length * TIERE[z.b.geh.tier].preis / 2) : 0;
  if (!confirm(`${I.name} wirklich entfernen?\nDu bekommst ${euro(I.geld + tierGeld)} zurück.${inhalt}`)) return;
  if (z.b) { mpEvent({ t: 'gebWeg', k: gebSchluessel(z.b) }); gebaeudeEntfernen(z.b); }
  else if (z.fz) { mpEvent({ t: 'fzWeg', id: z.fz.id }); fahrzeugEntfernen(z.fz); }
  else { mpEvent({ t: 'anhWeg', id: z.a.id }); anhaengerEntfernen(z.a); }
  money += I.geld + tierGeld;
  entfernenZiel = null; markierung.visible = false;
  meldung(`🗑️ ${I.name} entfernt! +${euro(I.geld + tierGeld)} zurück.`, 3);
  sound.bauen(); updateHUD(); speichern();
}
// Vorschau ("Geist") im Baumodus: grün = hier geht's, rot = geht nicht
const geistMat = new THREE.MeshBasicMaterial({ color: 0x55ff77, transparent: true, opacity: 0.45, depthWrite: false });
let geist = null, geistArt = null, geistOk = false;
function geistAktualisieren(punkt) {
  if (!building || !punkt || entfernen) { if (geist) geist.visible = false; return; }
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
  if (stumm) return;   // (Ein Helfer arbeitet gerade)
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
  $('vorrat').textContent = vorratText() + (salzsteine ? ` · 🧂 ${salzsteine}` : '');
  $('uhr').textContent = uhrText();
  $('datum').textContent = datumText();
  const ha = holzAnh(aktiv);
  $('holz').textContent = `${getragen} von ${HOLZ_TRAGEN_MAX} Stämmen${ha ? ` · Anhänger ${ha.inhalt}/${ha.typ.max}` : ''} · 🪚 Sprit ${Math.round(saegeSprit)} %`;
  $('ansicht').textContent = ansicht === 'ego' ? '👁️ First Person' : '🎥 Von hinten';
  const fz = aktiv || letztes;
  if (fz) {
    const G = GERAETE[fz.werkzeug];
    $('fahrzeug').textContent = `${fz.typ.emoji} ${fz.typ.name}${aktiv ? '' : ' (geparkt)'}`;
    $('geraet').textContent = G ? `${G.emoji} ${G.name}` : fz.mulde ? '🚚 Kippmulde (20 t)' : '🦾 Kran mit Fällkopf';
    $('tempo').textContent = Math.round(Math.abs(fz.speed) * 3.6);
    balken('diesel', fz.diesel, fz.typ.dieselMax, fz.typ.elektro ? `⚡ ${Math.round(fz.diesel)} % Akku${tagHell > 0.5 ? ' ☀️ lädt' : ''}` : `${Math.round(fz.diesel)} Liter`);
    $('diesel').style.background = fz.diesel < fz.typ.dieselMax * 0.15 ? '#ff6b6b' : '#5aa0e0';
    balken('saat', fz.saat, fz.typ.saatMax, fz.typ.saatMax ? `${fz.saatArt === 'mais' ? '🌽' : '🌾'} ${kg(fz.saat)}` : '– (kann nicht säen)');
    balken('tank', kornDrin(fz), kornPlatz(fz), kornPlatz(fz) ? `${gutText(fz)}${kornAnh(fz) ? ` (mit ${fz.anh.typ.name})` : ''}` : fz.typ.art === 'haecksler' ? '– Anhänger ankuppeln (H)!' : '– (kein Korntank)');
    $('tank').style.background = '#' + (GUETER[gutVon(fz)] || GUETER.korn).farbe.toString(16).padStart(6, '0');
  }
  const steigt = Math.cos(spielZeit / 45) > 0;
  $('preis').textContent = `${kornPreis().toFixed(2).replace('.', ',')} €/kg ${steigt ? '📈' : '📉'}`;
  $('bauleiste').style.display = building ? 'block' : 'none';
  for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).classList.toggle('aktiv', art === bauArt && !entfernen);
  $('bau-entfernen').classList.toggle('aktiv', entfernen);
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
  if (fz.helferFeld && f !== fz.helferFeld) return;   // Ein Helfer arbeitet nur auf seinem Feld
  if (!f.gekauft) { meldungSelten(`🚫 Feld ${f.nr + 1} gehört dir noch nicht! Fahr zum Schild und drück K.`); return; }
  const i = Math.floor((x - f.x0) / ZELLE), j = Math.floor((z - f.z0) / ZELLE);
  if (i < 0 || j < 0 || i >= f.nx || j >= f.nz) return;
  const c = f.zellen[j * f.nx + i];
  if (fz.werkzeug === 'pflug') {
    if (c.z === 'wiese' || c.z === 'stoppeln') { c.z = 'gepfluegt'; c.w = 0; delete c.stroh; malBoden(f, i, j); mpZelle(f, i, j); if (Math.random() < 0.5) staub(x, z, 0x6b4a2b); }
    else if (c.z === 'gesaet') meldungSelten('🌾 Hier wächst schon was! Erst ernten (Taste 3), dann pflügen.');
  } else if (fz.werkzeug === 'saat') {
    if (c.z === 'gepfluegt') {
      if (fz.saat < SAAT_PRO_ZELLE) { meldungSelten('🌱 Die Saat ist leer! Fahr zum Landhandel 🏪 und drück G.'); return; }
      fz.saat -= SAAT_PRO_ZELLE; c.z = 'gesaet'; c.w = 0;
      if (fz.saatArt === 'mais') c.a = 'mais'; else delete c.a;
      malBoden(f, i, j); mpZelle(f, i, j);
    } else if (c.z === 'wiese' || c.z === 'stoppeln') meldungSelten('🟫 Erst pflügen (Taste 1), dann säen!');
  } else if (fz.werkzeug === 'presse') {   // Ballenpresse: Stroh einsammeln, alle paar Stücke kommt ein Ballen raus
    if (c.stroh) {
      delete c.stroh; malBoden(f, i, j); mpZelle(f, i, j);
      if (Math.random() < 0.4) staub(x, z, 0xe8d27a, 0.4, 0.6);
      fz.strohSammel = (fz.strohSammel || 0) + 1;
      if (fz.strohSammel >= ZELLEN_PRO_BALLEN) { fz.strohSammel = 0; ballenAuswerfen(fz, f.x0 + (i + 0.5) * ZELLE, f.z0 + (j + 0.5) * ZELLE); }   // Der Ballen liegt mitten auf dem Stück
    } else if (c.z === 'gesaet') meldungSelten('🟨 Hier liegt kein Stroh! Stroh gibt es nach der Weizen-Ernte.');
  } else if (fz.werkzeug === 'maisgebiss') {   // Der Häcksler: Mais klein häckseln und in den Anhänger blasen
    if (c.z === 'gesaet' && c.a === 'mais' && c.w >= 1) {
      const ziel = haeckselZiel(fz);
      if (!ziel) { meldungSelten(!kornAnh(fz) ? '🚛 Wohin mit dem Häckselgut? Kuppel einen Kipper an (H) – oder ein Freund fährt mit Anhänger neben dir!' : !gutPasst(fz, 'haeckselgut') ? '🚛 Im Anhänger ist noch was anderes drin – erst leer machen!' : '🚛 Der Anhänger ist voll! Ab zum Silagesilo 🟩 und mit L abladen.'); return; }
      if (ziel.fsB) { const F = ziel.fsB.fs; F.fest = F.inhalt > 0 ? F.fest * F.inhalt / (F.inhalt + MAIS_ERTRAG) : 0; F.inhalt += MAIS_ERTRAG; F.fertig = false; F.geaendert = true; }
      else if (ziel.a) { ziel.a.inhalt += MAIS_ERTRAG; ziel.a.gut = 'haeckselgut'; }
      else { kornDazu(ziel.fz, MAIS_ERTRAG, 'haeckselgut'); if (ziel.fz !== fz) mpEvent({ t: 'korn', id: ziel.fz.id, m: MAIS_ERTRAG, g: 'haeckselgut' }); }
      c.z = 'stoppeln'; c.w = 0; delete c.a; malBoden(f, i, j); mpZelle(f, i, j); staub(x, z, 0x7fae3a);
      if (!ziel.fsB) haeckselStrahl(fz, ziel);
    } else if (c.z === 'gesaet' && c.a === 'mais') meldungSelten('⏳ Der Mais ist noch nicht reif – warte, bis er groß und gelblich ist!');
    else if (c.z === 'gesaet' && c.w >= 1) meldungSelten('🌾 Getreide erntest du mit dem Erntevorsatz (Traktor) oder dem Mähdrescher – der Häcksler ist für Mais!');
  } else if (fz.werkzeug === 'ernte') {
    if (c.z === 'gesaet' && c.a === 'mais') { if (c.w >= 1) meldungSelten('🌽 Der Mais ist zu groß für das Schneidwerk – dafür brauchst du den Häcksler! (N = Händler)'); return; }
    if (c.z === 'gesaet' && c.w >= 1 && !gutPasst(fz, 'korn')) { meldungSelten(`🚛 Da ist schon ${GUETER[gutVon(fz)].name} drin – Korn passt da nicht dazu!`); return; }
    if (c.z === 'gesaet' && c.w >= 1) {
      if (kornDrin(fz) + ERTRAG_PRO_ZELLE > kornPlatz(fz)) { meldungSelten(fz.typ.art === 'drescher' ? '🚛 Der Korntank ist voll! Lade mit O in einen Anhänger über – oder ab zum Silo (L)!' : '🚛 Alles voll! Ab zum Silo 🛢️ (L) oder zum Landhandel 🏪 (V).'); return; }
      kornDazu(fz, ERTRAG_PRO_ZELLE); c.z = 'stoppeln'; c.w = 0; c.stroh = true; malBoden(f, i, j); mpZelle(f, i, j); staub(x, z, 0xe3c46a);
    } else if (c.z === 'gesaet') meldungSelten('⏳ Das Getreide ist noch nicht reif – warte, bis es golden ist!');
  }
}
// Wohin bläst der Häcksler? 1. in den eigenen Anhänger, 2. in ein Fahrzeug/einen Anhänger daneben (bis 12 m)
function haeckselZiel(fz) {
  if (fz.helfer) { const b = gebaute.find(b => b.fs && !b.fs.zu && !(b.fs.fertig && b.fs.inhalt > 0) && b.fs.inhalt + MAIS_ERTRAG <= FAHRSILO_MAX); return b ? { fsB: b } : null; }
  if (kornAnh(fz)) return gutPasst(fz, 'haeckselgut') && kornDrin(fz) + MAIS_ERTRAG <= kornPlatz(fz) ? { fz } : null;
  const p = fz.g.position;
  let bestes = null, bestD = 12;
  for (const o of fahrzeuge) {
    if (o === fz || o.typ.art === 'drescher' || o.typ.art === 'haecksler' || !kornPlatz(o)) continue;
    const d = Math.hypot(o.g.position.x - p.x, o.g.position.z - p.z);
    if (d < bestD && gutPasst(o, 'haeckselgut') && kornDrin(o) + MAIS_ERTRAG <= kornPlatz(o)) { bestD = d; bestes = { fz: o, ...(kornAnh(o) ? { zielA: o.anh } : {}) }; }
  }
  for (const a of anhaenger) {
    if (a.an || a.typ.art === 'holz') continue;
    const d = Math.hypot(a.g.position.x - p.x, a.g.position.z - p.z);
    if (d < bestD && a.inhalt + MAIS_ERTRAG <= a.typ.max && (a.inhalt <= 0 || a.gut === 'haeckselgut')) { bestD = d; bestes = { a }; }
  }
  return bestes;
}
// Häckselgut fliegt im Bogen aus dem Auswurfrohr in den Anhänger
const haeckselTeile = [];
const haeckselGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12), haeckselMat = new THREE.MeshBasicMaterial({ color: 0x8fbf3a });
function zielPunkt(ziel, v) {   // Wo genau soll es hin? (Mitte vom Anhänger oder vom Fahrzeug)
  const o = ziel.a || ziel.zielA || (ziel.fz && ziel.fz.anh) || ziel.fz;
  return v.set(o.g.position.x, 2.2, o.g.position.z);
}
function kruemmerSpitze(fz, v) { return fz.kruemmer ? fz.kruemmer.spitze.getWorldPosition(v) : v.copy(fz.g.position).setY(4); }
function haeckselStrahl(fz, ziel) {
  const von = kruemmerSpitze(fz, new THREE.Vector3()), nach = zielPunkt(ziel, new THREE.Vector3());
  for (let k = 0; k < 6; k++) {
    let m = haeckselTeile.find(t => !t.visible);
    if (!m) { if (haeckselTeile.length > 200) return; m = new THREE.Mesh(haeckselGeo, haeckselMat); scene.add(m); haeckselTeile.push(m); }
    const T = 0.45 + Math.random() * 0.15;
    m.visible = true; m.position.copy(von);
    m.userData.v = new THREE.Vector3((nach.x - von.x) / T + zufall(-0.8, 0.8), (nach.y - von.y) / T + 9.81 * T / 2, (nach.z - von.z) / T + zufall(-0.8, 0.8));
    m.userData.t = T; m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  }
}
function haeckselUpdate(dt) {
  for (const m of haeckselTeile) {
    if (!m.visible) continue;
    m.userData.t -= dt;
    if (m.userData.t <= 0) { m.visible = false; continue; }
    m.userData.v.y -= 9.81 * dt;
    m.position.addScaledVector(m.userData.v, dt);
    m.rotation.x += dt * 8;
  }
  // Das Auswurfrohr dreht sich zum Anhänger
  for (const fz of fahrzeuge) {
    if (!fz.kruemmer) continue;
    let ziel = -Math.PI / 2 - 0.6;   // In Ruhe: schräg nach hinten links
    if (fz === aktiv) {
      const z = haeckselZiel(fz);
      if (z && !z.fsB) { zielPunkt(z, tmpA); fz.g.worldToLocal(tmpA); ziel = Math.atan2(-tmpA.z, tmpA.x); }
    }
    let d = ziel - fz.kruemmer.g.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    fz.kruemmer.g.rotation.y += d * Math.min(1, dt * 3);
  }
}
// ===== 🟨 Strohballen =====
const ballen = [];   // { id, x, z, r, g }
const ballenGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.2, 20).rotateZ(Math.PI / 2);
let ballenMat = null;
const netzGeo = mergeGeometries([-0.35, 0, 0.35].map(dx => new THREE.TorusGeometry(0.76, 0.012, 4, 24).rotateY(Math.PI / 2).translate(dx, 0, 0)));
const netzMat = mat(0xf2f2f2);
function ballenNeu(id, x, z, r) {
  if (ballen.some(b => b.id === id)) return;
  if (!ballenMat) ballenMat = [new THREE.MeshStandardMaterial({ map: strohTextur(), color: 0xf2dc8a, roughness: 1 }), mat(0xe0c46a), mat(0xe0c46a)];
  const g = new THREE.Mesh(ballenGeo, ballenMat); g.position.set(x, 0.9, z); g.rotation.y = r; g.castShadow = true; g.receiveShadow = true; scene.add(g);
  g.add(new THREE.Mesh(netzGeo, netzMat));   // Netz drumherum
  ballen.push({ id, x, z, r, g });
}
function ballenWeg(id) { const k = ballen.findIndex(b => b.id === id); if (k >= 0) { scene.remove(ballen[k].g); ballen.splice(k, 1); } }
function ballenAuswerfen(fz, x, z) {   // Ein fertiger Ballen kommt aus der Presse (x/z = wo er liegen soll)
  const m = fz.geraete.presse; if (!m) return;
  const p = x === undefined ? new THREE.Vector3(0, 0, 1.6).applyMatrix4(m.matrixWorld) : new THREE.Vector3(x, 0, z);
  const id = `${mp.ich}-b-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
  ballenNeu(id, p.x, p.z, fz.g.rotation.y);
  mpEvent({ t: 'ballen', id, x: r2(p.x), z: r2(p.z), r: r2(fz.g.rotation.y) });
  ton(90, 0, 0.12, 'sine', 0.12); meldungSelten('🟨 Strohballen! Aufladen mit L (Anhänger oder Lastwagen) · Ein Ballen bringt 200 €');
}
function naheBallen(fz) {   // Ballen in der Nähe vom Fahrzeug oder seinem Anhänger
  const punkte = [fz.g.position]; if (fz.anh) punkte.push(fz.anh.g.position);
  return ballen.filter(b => punkte.some(p => Math.hypot(b.x - p.x, b.z - p.z) < 9));
}
function ballenAufladen() {
  const liste = naheBallen(aktiv);
  if (!kornPlatz(aktiv)) { meldung('🚛 Da passt nichts rein – kuppel einen Kipper an (H) oder nimm den Lastwagen!'); sound.nein(); return; }
  if (!gutPasst(aktiv, 'stroh')) { meldung(`🚛 Da ist noch ${GUETER[gutVon(aktiv)].name} drin – erst leer machen!`); sound.nein(); return; }
  const n = Math.min(liste.length, Math.floor((kornPlatz(aktiv) - kornDrin(aktiv)) / BALLEN_KG));
  if (n <= 0) { meldung('🚛 Voll! Ab zum Landhandel (V) – oder zu den Tieren als Einstreu (L).'); sound.nein(); return; }
  for (const b of liste.slice(0, n)) { mpEvent({ t: 'ballenWeg', id: b.id }); ballenWeg(b.id); }
  kornDazu(aktiv, n * BALLEN_KG, 'stroh');
  meldung(`🟨 ${n} Strohballen aufgeladen (${kg(kornDrin(aktiv))} = ${euro(kornDrin(aktiv) * STROH_PREIS)})! Verkaufen beim Landhandel (V) oder als Einstreu ins Gehege (L) – dann geben die Tiere mehr.`, 4);
  sound.holz(); speichern();
}
const ballenDaten = () => ballen.map(b => ({ id: b.id, x: r2(b.x), z: r2(b.z), r: r2(b.r) }));
function ballenAusDaten(liste) { for (const b of [...ballen]) ballenWeg(b.id); for (const b of liste || []) ballenNeu(b.id, b.x, b.z, b.r); }
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
      c.w = Math.min(1, c.w + 0.5 * jahreszeit().wachsen / (c.a === 'mais' ? MAIS_WACHS_ZEIT : WACHS_ZEIT));
      malZelle(f, i, j);
    }
  }
}

// ===== Kaufen, Verkaufen, Silo =====
function wo() { return aktiv ? aktiv.g.position : mitfahrt ? mitfahrt.g.position : player.position; }
function imLaden() { return !!aktiv && Math.hypot(aktiv.g.position.x - LADEN.x, aktiv.g.position.z - LADEN.z) < LADEN.r + 1; }
function beimHaendler() { const p = wo(); return Math.hypot(p.x - LADEN.x, p.z - LADEN.z) < LADEN.r + 10; }
function nahesSilo() {
  if (!aktiv) return null;
  const p = aktiv.g.position;
  return silos.find(s => Math.hypot(p.x - s.x, p.z - s.z) < s.r + 4.5 + aktiv.radius) || null;
}
function brauchtFahrzeug(text) {
  if (aktiv) return false;
  meldung(`🚜 Steig zuerst in ein Fahrzeug (E), um ${text}!`); sound.nein();
  return true;
}
function verkaufen() {
  if (beiDerFiliale()) { filialeVerkaufen(); return; }
  if (beimDorfladen()) { vorratVerkaufen(); return; }
  if (beimSaegewerk()) { holzVerkaufen(); return; }
  if (holzAnh(aktiv) && anhBeimSaegewerk(aktiv)) { holzVomAnhaengerVerkaufen(); return; }
  if (brauchtFahrzeug('Korn zu verkaufen')) return;
  if (!imLaden()) { meldung('🏪 Fahr auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  const drin = kornDrin(aktiv), gut = gutVon(aktiv);
  if (drin <= 0) { meldung('Der Korntank ist leer. Ernte zuerst etwas – oder hol Korn aus dem Silo! 🌾'); sound.nein(); return; }
  if (gut === 'haeckselgut') { meldung('🌽 Frisches Häckselgut kauft keiner! Fahr es ins Silagesilo 🟩 (L) und mach Silage daraus.', 4); sound.nein(); return; }
  const erloes = Math.round(drin * (gut === 'silage' ? SILAGE_PREIS : gut === 'stroh' ? STROH_PREIS : kornPreis()));
  money += erloes;
  meldung(`💶 ${kg(drin)} ${GUETER[gut].name} verkauft für ${euro(erloes)}!`, 3.5);
  kornWeg(aktiv, drin);
  sound.kasse();
  speichern();
}
function saatKaufen(art = 'weizen') {   // G = Getreide-Saat, Y = Mais-Saat
  if (brauchtFahrzeug('Saat zu laden')) return;
  if (!imLaden()) { meldung('🏪 Fahr auf den gelben Platz beim Landhandel!'); sound.nein(); return; }
  if (!aktiv.typ.saatMax) { meldung(`🌱 Der ${aktiv.typ.name} kann nicht säen!`); sound.nein(); return; }
  const preis = art === 'mais' ? MAIS_SAAT_PREIS : SAAT_PREIS, name = art === 'mais' ? '🌽 Mais-Saat' : '🌾 Getreide-Saat';
  let rueck = 0;
  if (aktiv.saatArt !== art) {   // Andere Saat? Die alte gibst du zurück und bekommst das Geld wieder
    rueck = Math.round(aktiv.saat * (aktiv.saatArt === 'mais' ? MAIS_SAAT_PREIS : SAAT_PREIS));
    money += rueck; aktiv.saat = 0; aktiv.saatArt = art;
  }
  const menge = aktiv.typ.saatMax - aktiv.saat, kosten = Math.round(menge * preis);
  if (menge <= 0) { meldung(`${name} ist schon voll!`); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld!'); sound.nein(); return; }
  money -= kosten; aktiv.saat = aktiv.typ.saatMax;
  meldung(`${name}: ${kg(menge)} gekauft für ${euro(kosten)}${rueck ? ` (alte Saat zurückgegeben: +${euro(rueck)})` : ''}`, 3);
  sound.kasse();
  speichern();
}
function anHofTankstelle() { return !!aktiv && Math.hypot(aktiv.g.position.x - TANKSTELLE.x, aktiv.g.position.z - TANKSTELLE.z) < aktiv.radius + 3.5; }
function tanken() {
  if (!aktiv) { saegeTanken(); return; }   // Zu Fuß: die Motorsäge tanken
  if (!imLaden() && !anHofTankstelle()) { meldung('⛽ Tanken kannst du beim Landhandel 🏪 oder an der Hof-Tankstelle in der Scheune 🏚️!'); sound.nein(); return; }
  const E = aktiv.typ.elektro, menge = aktiv.typ.dieselMax - aktiv.diesel, kosten = Math.round(menge * (E ? 0.25 : DIESEL_PREIS));
  if (menge < 1) { meldung(E ? '🔋 Der Akku ist schon voll!' : '⛽ Der Tank ist schon voll!'); return; }
  if (money < kosten) { meldung('💸 Nicht genug Geld zum Tanken!'); sound.nein(); return; }
  money -= kosten; aktiv.diesel = aktiv.typ.dieselMax;
  meldung(E ? `⚡ Akku aufgeladen (${Math.round(menge)} %) für nur ${euro(kosten)}!` : `⛽ ${Math.round(menge)} Liter Diesel getankt für ${euro(kosten)}`);
  sound.kasse();
  speichern();
}
function einlagern() {   // Korn vom Fahrzeug ins Silo
  if (!aktiv) { holzAufAnhaenger(); return; }               // Zu Fuß: Holz auf den Holzanhänger legen
  if (holzAnh(aktiv) && !nahesSilo()) { holzKran(); return; }   // Mit Holzanhänger: Kran lädt Holz auf
  if (naheBallen(aktiv).length && !nahesSilo() && (!gutVon(aktiv) || gutVon(aktiv) === 'stroh') && kornPlatz(aktiv) - kornDrin(aktiv) >= BALLEN_KG) { ballenAufladen(); return; }   // Strohballen
  { const b = nahesHofGebaeude(); if (b && b.geh && !nahesSilo()) { futterAbladen(b); return; } }   // Beim Gehege: Korn als Futter
  { const b = nahesFahrsilo(); if (b && !nahesSilo()) { fahrsiloAbladen(b); return; } }        // Beim Silagesilo: Häckselgut abladen
  if (brauchtFahrzeug('Korn einzulagern')) return;
  const s = nahesSilo();
  if (!s) { meldung('🛢️ Fahr näher an ein Silo!'); sound.nein(); return; }
  if (kornDrin(aktiv) <= 0) { meldung('Der Korntank ist leer!'); sound.nein(); return; }
  const gut = gutVon(aktiv), G = GUETER[gut];
  if (!siloNimmt(s, gut)) {
    meldung(s.gut === 'korn' ? `🛢️ Ins ${siloName(s)} kommt nur Korn! ${gut === 'haeckselgut' ? 'Häckselgut gehört ins Silagesilo 🟩 oder ins Silage-Hochsilo 🗼.' : 'Silage gehört ins Silage-Hochsilo 🗼 – oder verkaufen/verfüttern.'}` : `🗼 Ins Silage-Hochsilo kommt nur Häckselgut oder Silage!`, 4);
    sound.nein(); return;
  }
  const menge = Math.min(kornDrin(aktiv), s.max - s.inhalt);
  if (menge <= 0) { meldung(`${GEBAEUDE_ARTEN[s.art].emoji} Das ${siloName(s)} ist voll! Bau noch eins (Baumodus).`); sound.nein(); return; }
  kornWeg(aktiv, menge); s.inhalt += menge;
  if (s.gut === 'silage' && gut === 'haeckselgut') s.roh += menge;   // Gärt jetzt von allein zu Silage
  siloSchild(s);
  meldung(s.gut === 'futter' ? `🐄 ${kg(menge)} ${G.name} ins Futtersilo! Es füllt die Futtertröge in der Nähe (bis ${FUTTERSILO_WEITE} m) ganz von allein.`
    : s.gut === 'silage' && gut === 'haeckselgut' ? `🗼 ${kg(menge)} Häckselgut eingefüllt! Im Hochsilo gärt es ganz von allein zu Silage ⏳ – dann mit U abholen.`
    : `${GEBAEUDE_ARTEN[s.art].emoji} ${kg(menge)} ${G.name} eingelagert. Im ${siloName(s)}: ${kg(s.inhalt)}`, 4);
  sound.korn();
  for (let k = 0; k < 10; k++) staub(s.x + zufall(-1, 1), s.z + zufall(-1, 1), G.farbe, GEBAEUDE_ARTEN[s.art].silo.hoch - 3, -0.5);
  speichern();
}
function ausSiloHolen() {   // Korn aus dem Silo aufs Fahrzeug (zum Verkaufen, wenn der Preis gut ist!)
  if (brauchtFahrzeug('Korn zu holen')) return;
  const s = nahesSilo();
  { const b = nahesFahrsilo(); if (b && !s) { silageHolen(b); return; } }
  if (!s) { meldung('🛢️ Fahr näher an ein Silo!'); sound.nein(); return; }
  if (s.gut === 'futter') { meldung('🐄 Das Futtersilo füttert die Tiere in der Nähe von allein – da holst du nichts raus.'); sound.nein(); return; }
  const gut = s.gut === 'silage' ? 'silage' : 'korn', da = s.inhalt - s.roh;
  if (!gutPasst(aktiv, gut)) { meldung(`🚛 Da ist noch ${GUETER[gutVon(aktiv)].name} drin – erst leer machen!`); sound.nein(); return; }
  if (!kornPlatz(aktiv)) { meldung('🚛 Da passt nichts rein – kuppel einen Kipper an (H)!'); sound.nein(); return; }
  const menge = Math.min(da, kornPlatz(aktiv) - kornDrin(aktiv));
  if (s.inhalt <= 0) { meldung(`${GEBAEUDE_ARTEN[s.art].emoji} Das ${siloName(s)} ist leer!`); sound.nein(); return; }
  if (da <= 0) { meldung(`⏳ Die Silage gärt noch! Noch ${kg(s.roh)} – gleich fertig.`); sound.nein(); return; }
  if (menge <= 0) { meldung('Der Tank ist schon voll!'); sound.nein(); return; }
  kornDazu(aktiv, menge, gut); s.inhalt -= menge;
  siloSchild(s);
  meldung(`🚜 ${kg(menge)} ${GUETER[gut].name} aus dem ${siloName(s)} geholt. Verkaufen beim Landhandel 🏪 oder im Großmarkt 🏬!`, 3.5);
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
    b.kipp.visible = false; b.stumpf.visible = true; b.h.r = -100;   // Über Stümpfe kann man drüberfahren
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
  b.stumpf.visible = true; b.h.r = -100;
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
const tmpH = new THREE.Vector3();
function harvesterZiel(fz) {   // Die nächste große Fichte, die der Kran erreicht
  fz.g.updateMatrixWorld();
  let bester = null, bestD = 9.5;
  for (const b of baeume) {
    if (b.zustand !== 'steht' || Math.abs(b.x - fz.g.position.x) > 14 || Math.abs(b.z - fz.g.position.z) > 14) continue;
    const l = fz.g.worldToLocal(tmpH.set(b.x, 0, b.z)), rz = l.z + 2.7, d = Math.hypot(l.x, rz);
    if (rz < 1.5 && d > 1.5 && d < bestD) { bestD = d; bester = b; }   // Nur vorne und seitlich, nicht hinten
  }
  return bester;
}
function harvesterUpdate(fz, dt) {
  const b = harvesterZiel(fz);
  if (!b) { kranStellen(fz, 0, 2.6, -0.2, dt); return; }   // Kran einklappen
  const l = fz.g.worldToLocal(tmpH.set(b.x, 0, b.z)), rx = l.x, rz = l.z + 2.7;
  const greift = !building && (mouseDown || keys.x);
  kranStellen(fz, Math.atan2(-rx, -rz), Math.max(1.5, Math.hypot(rx, rz) - 0.35), greift || b.hp > 0 ? SCHNITT_HOEHE - 2.0 : 0.2, dt);
  if (!greift) return;
  if (fz.diesel <= 0) { meldungSelten('⛽ Der Harvester hat keinen Diesel mehr! Tanken mit T beim Landhandel oder an der Hof-Tankstelle.'); return; }
  harvSaegt = true;
  fz.diesel = Math.max(0, fz.diesel - dt * 0.4);
  if (b.hp === 0) b.schnittW = Math.atan2(b.x - fz.g.position.x, b.z - fz.g.position.z);   // Fällt vom Harvester weg
  b.hp = Math.min(1, b.hp + dt / HARVESTER_ZEIT);
  b.g.rotation.y = b.schnittW + Math.PI;
  b.kipp.rotation.z = Math.sin(spielZeit * 70) * 0.006;
  b.kipp.rotation.x = -Math.max(0, b.hp - 0.8) * 0.25;
  schnittZeigen(b);
  if (Math.random() < 0.7) staub(b.x - Math.sin(b.schnittW) * 0.5, b.z - Math.cos(b.schnittW) * 0.5, 0xe8cf94, 0.9, 0.7, 0.45);
  if (b.hp >= 1) baumFaellen(b, b.schnittW, Math.random().toString(36).slice(2, 8), true);
}
// Holzanhänger: mit dem Kran Holz aufladen (L), zu Fuß Holz drauflegen (L), beim Sägewerk verkaufen (V)
const holzInKranNaehe = a => holzStuecke.filter(h => h.bereit && Math.hypot(h.x - a.g.position.x, h.z - a.g.position.z) < 10);
const naherHolzAnhaenger = () => anhaenger.find(a => a.typ.art === 'holz' && Math.hypot(a.g.position.x - player.position.x, a.g.position.z - player.position.z) < a.typ.laenge / 2 + 2.5) || null;
function anhBeimSaegewerk(fz) {
  const P = SAEGEWERK, a = fz.anh.g.position, f = fz.g.position;
  return Math.min(Math.hypot(a.x - P.platzX, a.z - P.platzZ), Math.hypot(f.x - P.platzX, f.z - P.platzZ)) < P.r + 8;
}
function holzKran() {
  const a = holzAnh(aktiv), liste = holzInKranNaehe(a);
  if (a.inhalt >= a.typ.max) { meldung('🪵 Der Holzanhänger ist voll! Ab zum Sägewerk 🪚 und drück V.'); sound.nein(); return; }
  if (!liste.length) { meldung('🏗️ Keine Holzstämme in der Nähe! Fahr mit dem Anhänger näher ans Holz.'); sound.nein(); return; }
  const stuecke = liste.slice(0, a.typ.max - a.inhalt);
  for (const h of stuecke) { staub(h.x, h.z, 0x8a7a5a, 0.5, 1, 1.2); holzWeg(h.id); mpEvent({ t: 'holzWeg', id: h.id }); }
  a.inhalt += stuecke.length;
  meldung(`🏗️ Der Kran hat ${stuecke.length} Holzstämme aufgeladen! (${a.inhalt} von ${a.typ.max})`, 3);
  sound.holz(); setTimeout(() => sound.holz(), 200);
  speichern();
}
function holzAufAnhaenger() {
  const a = naherHolzAnhaenger();
  if (!a) { meldung('🪵 Geh näher an einen Holzanhänger! (Den gibt es beim Händler 🛒)'); sound.nein(); return; }
  if (getragen <= 0) { meldung('🪵 Du trägst kein Holz! Fäll einen Baum und heb die Stämme auf.'); sound.nein(); return; }
  const n = Math.min(getragen, a.typ.max - a.inhalt);
  if (n <= 0) { meldung('🪵 Der Holzanhänger ist voll!'); sound.nein(); return; }
  a.inhalt += n; getragen -= n;
  meldung(`🪵 ${n} Stämme auf den Anhänger gelegt (${a.inhalt} von ${a.typ.max})`);
  sound.holz();
  speichern();
}
function holzVomAnhaengerVerkaufen() {
  const a = holzAnh(aktiv);
  if (a.inhalt <= 0) { meldung('🪵 Der Holzanhänger ist leer!'); sound.nein(); return; }
  const erloes = a.inhalt * HOLZ_PREIS;
  money += erloes;
  meldung(`🪚💶 ${a.inhalt} Holzstämme verkauft für ${euro(erloes)}!`, 4);
  a.inhalt = 0;
  sound.kasse();
  speichern();
}
function waldUpdate(dt) {
  harvSaegt = false;
  if (aktiv && aktiv.kran) harvesterUpdate(aktiv, dt);
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
    } else if (b.kipp.rotation.z !== 0 && !saegt && !harvSaegt) b.kipp.rotation.z = 0;
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
function waldHinweis() {   // Was steht unten in der Mitte, wenn du zu Fuß im Wald bist (oder mit Harvester/Holzanhänger)?
  if (aktiv) {
    if (aktiv.kran) {
      const b = harvesterZiel(aktiv);
      if (b) return `🦾 X oder Maus gedrückt halten = Baum fällen! (${Math.round(b.hp * 100)} %)`;
      return Math.hypot(aktiv.g.position.x - WALD.x, aktiv.g.position.z - WALD.z) < WALD.r + 15 ? '🌲 Fahr mit dem Harvester nah an eine große Fichte!' : '';
    }
    const a = holzAnh(aktiv);
    if (!a) return '';
    if (anhBeimSaegewerk(aktiv)) return a.inhalt > 0 ? `🪚 Sägewerk: V = Holz verkaufen (${a.inhalt} Stämme = ${euro(a.inhalt * HOLZ_PREIS)})` : '🪚 Sägewerk: Der Holzanhänger ist noch leer!';
    const n = holzInKranNaehe(a).length;
    if (n && a.inhalt < a.typ.max) return `🏗️ L = ${n} Holzstämme mit dem Kran aufladen (${a.inhalt} von ${a.typ.max})`;
    return '';
  }
  if (beimSaegewerk()) return getragen > 0 ? `🪚 Sägewerk: V = Holz verkaufen (${getragen} Stämme = ${euro(getragen * HOLZ_PREIS)})` : '🪚 Sägewerk: Bring Holzstämme 🪵 her und drück V!';
  if (getragen > 0 && naherHolzAnhaenger()) return '🪵 L = Holz auf den Holzanhänger legen';
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
      <span class="klein">⭐ ${typ.faehigkeit}<br>🏁 ${Math.round(typ.tempo * 3.6)} km/h${typ.tankMax ? ` · 🌾 Tank ${kg(typ.tankMax)}` : ''} · ${typ.elektro ? '⚡ Akku mit Solardach' : `⛽ ${typ.dieselMax} l`}</span><br>`;
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
      <span class="klein">${typ.art === 'holz' ? `🪵 Fasst ${typ.max} Holzstämme · Ankuppeln mit H · L = Kran lädt Holz auf · V beim Sägewerk = verkaufen` : `🌾 Fasst ${kg(typ.max)} Korn · Ankuppeln mit H · Der Mähdrescher kann mit O hineinladen`}</span><br>`;
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
// ===== 🪑 Beifahrer: Im Lastwagen (2 Sitze) kann ein zweiter Bauer mitfahren, wenn ein anderer fährt =====
let mitfahrt = null;   // In welchem Fahrzeug du gerade Beifahrer bist
const beifahrerBesetzt = fz => [...mp.andere.values()].some(o => o.fz === fz.id && o.bf);
function beifahrerEin(fz) {
  mitfahrt = fz;
  kamOffset = 0; blickHoch = 0;
  saegeAn = false; saegt = false;
  fz.K.add(player);
  const gr = fz.typ.groesse, S = fz.beifahrerSitz;
  player.position.set(S[0], S[1] - 1.65 / gr, S[2] + 0.05);
  player.rotation.set(0, 0, 0); player.scale.setScalar(1 / gr);
  farmerPose(farmer, true, false, 0);
  farmerWerkzeug(farmer, false, false, 0);
  meldung(`🪑 Du sitzt auf dem Beifahrersitz im ${fz.typ.name}! Lehn dich zurück und genieß die Fahrt. (E = aussteigen)`, 3.5);
  sound.tuer();
}
function beifahrerAus() {
  const fz = mitfahrt;
  mitfahrt = null;
  scene.add(player);
  player.scale.setScalar(1);
  yaw = fz.g.rotation.y;
  const seite = fz.radius + 0.6;   // Rechts aussteigen (die Beifahrertür)
  player.position.set(fz.g.position.x + Math.cos(yaw) * seite, 0, fz.g.position.z - Math.sin(yaw) * seite);
  if (kollidiert(player.position.x, player.position.z, 0.4, fz)) player.position.set(fz.g.position.x - Math.cos(yaw) * seite, 0, fz.g.position.z + Math.sin(yaw) * seite);
  player.rotation.set(0, yaw, 0);
  spielerVy = 0; amBoden = true; blickHoch = 0;
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
const ZUSTAND_LANG = { w: 'wiese', s: 'stoppeln', p: 'gepfluegt', g: 'gesaet', m: 'gesaet', h: 'stoppeln' };   // m = Mais gesät · h = Stoppeln mit Stroh
const zellCode = c => (c.z === 'gesaet' && c.a === 'mais' ? 'm' : c.z === 'stoppeln' && c.stroh ? 'h' : ZUSTAND_KURZ[c.z]) + (c.z === 'gesaet' ? Math.round(c.w * 100) : '');
const zelleAusCode = code => {
  const z = ZUSTAND_LANG[code[0]] || 'wiese', c = { z, w: z === 'gesaet' ? Number(code.slice(1)) / 100 : 0 };
  if (code[0] === 'm') c.a = 'mais';
  if (code[0] === 'h') c.stroh = true;
  return c;
};
function speichern() {
  if (mp.rolle === 'gast') return;   // Beim Freund mitspielen überschreibt nicht deinen eigenen Hof!
  try {
    localStorage.setItem(SPEICHER_NAME, JSON.stringify({
      v: 2, money, hofSilo: hofSilo.inhalt,
      fahrzeuge: fahrzeuge.map(f => ({ id: f.id, typ: f.typName, x: f.g.position.x, z: f.g.position.z, r: f.g.rotation.y, saat: f.saat, tank: f.tank, diesel: f.diesel, werkzeug: f.werkzeug, gut: f.gut, saatArt: f.saatArt })),
      aktiv: fahrzeuge.indexOf(aktiv),
      anhaenger: anhaenger.map(a => ({ id: a.id, typ: a.typName, x: a.g.position.x, z: a.g.position.z, r: a.g.rotation.y, inhalt: a.inhalt, gut: a.gut, an: a.an ? a.an.id : null })),
      spieler: { x: player.position.x, z: player.position.z, yaw },
      felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(zellCode) })),
      gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot, inhalt: b.silo ? b.silo.inhalt : 0, d: gebDaten(b) })), vorrat, tageszeit, salzsteine, fischRekorde, tagNr, helfer: helferDaten(), ballen: ballenDaten(),
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
    df.c.forEach((code, n) => { f.zellen[n] = zelleAusCode(code); });
  });
  for (const b of d.gebaeude || []) if (GEBAEUDE_ARTEN[b.art]) gebaeudeHinzu(b.art, b.x, b.z, b.rot, b.inhalt || 0, b.d);
  if (d.vorrat) vorrat = d.vorrat;
  if (typeof d.tageszeit === 'number') tageszeit = d.tageszeit;
  if (typeof d.tagNr === 'number') tagNr = d.tagNr;
  if (Array.isArray(d.helfer)) helferLaden(d.helfer);
  salzsteine = d.salzsteine || 0;
  fischRekorde = d.fischRekorde || {};
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
  ballenAusDaten(d.ballen);
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
  if (aktiv.kran) { meldung('🦾 Der Harvester hat einen Kran mit Fällkopf – fahr an eine Fichte und halt X!'); sound.nein(); return; }
  if (aktiv.mulde) { meldung('🚚 Der Lastwagen hat keine Anbaugeräte – er transportiert nur!'); sound.nein(); return; }
  if (!aktiv.typ.geraete.includes(art)) { meldung(aktiv.typ.art === 'haecksler' ? '🌽 Der Häcksler hat nur das Maisgebiss!' : `🌾 Der ${aktiv.typ.name} kann nur ernten!`); sound.nein(); return; }
  if (aktiv.anh && GERAETE[art].hinten) { meldung('🔗 Hinten hängt der Anhänger! Erst abkuppeln (H), dann geht der Pflug/die Sämaschine.'); sound.nein(); return; }
  aktiv.werkzeug = art;
  sound.klick();
  meldung(`${GERAETE[art].emoji} ${GERAETE[art].name} angebaut`, 1.5);
}
function buildMode() {
  building = !building;
  if (!building && entfernen) { entfernen = false; entfernenZiel = null; markierung.visible = false; }
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
$('hofpanel-zu').addEventListener('click', () => panelZeigen(null));

// ===== Die Anleitung: verschieben (oben an der Leiste ziehen) und einklappen (➖ oder Taste I) =====
const ANLEITUNG_SPEICHER = 'farming-anleitung';
function anleitungZu(zu) {
  $('help').classList.toggle('zu', zu);
  $('help-zu').textContent = zu ? '➕' : '➖';
  anleitungInsBild();
  anleitungMerken();
}
function anleitungMerken() {
  const h = $('help');
  try { localStorage.setItem(ANLEITUNG_SPEICHER, JSON.stringify({ zu: h.classList.contains('zu'), x: h.style.left ? parseFloat(h.style.left) : null, y: h.style.top ? parseFloat(h.style.top) : null })); } catch (e) { /* egal */ }
}
function anleitungInsBild() {   // Nicht aus dem Bildschirm rausschieben!
  const h = $('help');
  if (!h.style.top) return;   // Noch nie verschoben: bleibt unten links
  h.style.left = `${begrenzt(parseFloat(h.style.left), 0, Math.max(0, innerWidth - h.offsetWidth))}px`;
  h.style.top = `${begrenzt(parseFloat(h.style.top), 0, Math.max(0, innerHeight - h.offsetHeight))}px`;
}
{
  const h = $('help'), kopf = $('help-kopf');
  let zieht = null;
  kopf.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const box = h.getBoundingClientRect();
    zieht = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    h.style.left = `${box.left}px`; h.style.top = `${box.top}px`; h.style.bottom = 'auto';
    kopf.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  kopf.addEventListener('pointermove', e => {
    if (!zieht) return;
    h.style.left = `${e.clientX - zieht.dx}px`; h.style.top = `${e.clientY - zieht.dy}px`;
    anleitungInsBild();
  });
  const loslassen = () => { if (zieht) { zieht = null; anleitungMerken(); } };
  kopf.addEventListener('pointerup', loslassen);
  kopf.addEventListener('pointercancel', loslassen);
  $('help-zu').addEventListener('click', e => { anleitungZu(!h.classList.contains('zu')); e.currentTarget.blur(); });   // blur: sonst klappt die Leertaste sie wieder auf
  // Wo war die Anleitung beim letzten Mal?
  let alt = null;
  try { alt = JSON.parse(localStorage.getItem(ANLEITUNG_SPEICHER)); } catch (e) { alt = null; }
  if (alt) {
    if (alt.x !== null && alt.y !== null) { h.style.left = `${alt.x}px`; h.style.top = `${alt.y}px`; h.style.bottom = 'auto'; }
    anleitungZu(!!alt.zu);
  }
  addEventListener('resize', anleitungInsBild);
}
for (const art of Object.keys(GEBAEUDE_ARTEN)) $('bau-' + art).addEventListener('click', () => { bauArt = art; if (entfernen) entfernenUmschalten(false); updateHUD(); });
$('bau-entfernen').addEventListener('click', e => { entfernenUmschalten(); e.currentTarget.blur(); });

document.addEventListener('keydown', e => {
  tonStart();
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'tab'].includes(k)) e.preventDefault();
  if (e.repeat) return;   // Gedrückt halten soll nicht ständig ein- und aussteigen

  if (k === 'e' && angel && angel.phase === 'kampf') { angelKurbeln(); return; }   // Beim Angeln: E = kurbeln!
  if (mitfahrt && !['e', 'f', 'm', 'j', 'i', 'c', 'tab', 'escape'].includes(k)) { if (k.length === 1) meldungSelten('🪑 Du bist Beifahrer – nur der Fahrer kann fahren. E = aussteigen'); return; }
  if (k === 'e') {
    if (aktiv) aussteigen();
    else if (mitfahrt) beifahrerAus();
    else {
      const fz = naechstesFahrzeug();
      if (fz && fremdGefahren(fz) && fz.typ.beifahrer && !beifahrerBesetzt(fz)) beifahrerEin(fz);   // Lastwagen: Es gibt noch einen Sitz!
      else if (fz && fremdGefahren(fz)) { meldung(fz.typ.beifahrer ? '🚫 Beide Sitze sind schon besetzt!' : '🚫 Da sitzt schon ein anderer Bauer drin!'); sound.nein(); }
      else if (fz && fz.helfer) { meldung(`👷 Da arbeitet gerade ${fz.helfer.name}! Stoppen kannst du im Helfer-Menü (Tab).`, 3); sound.nein(); }
      else if (fz) einsteigen(fz);
    }
  }
  if (k === 'b') buildMode();
  if (k === 'f') ansichtWechseln();
  if (k === 'r') rotation += Math.PI / 4;
  if (k === 'm') tonAn = !tonAn;
  if (k === 'j') { musikAn = !musikAn; meldung(musikAn ? '🎵 Musik an' : '🔇 Musik aus', 1.5); }
  if (k === 'v') verkaufen();
  if (k === 'g') saatKaufen('weizen');
  if (k === 'y') saatKaufen('mais');
  if (k === 't') tanken();
  if (k === 'l') einlagern();
  if (k === 'u') ausSiloHolen();
  if (k === 'k') feldKaufen();
  if (k === 'n') haendlerZeigen($('haendler').style.display !== 'block');
  if (k === 'h') kuppeln();
  if (k === 'q') saegeNehmen();
  if (k === 'z') schlafen();
  if (building && (k === '.' || k === ',')) { const arten = Object.keys(GEBAEUDE_ARTEN), n = arten.length; bauArt = arten[(arten.indexOf(bauArt) + (k === '.' ? 1 : n - 1)) % n]; updateHUD(); }
  if (k === 'i') anleitungZu(!$('help').classList.contains('zu'));
  if (k === 'p' && werkbankOffen) werkbankZeigen(false);
  else if (k === 'p' && naechstesHaustier()) streicheln(naechstesHaustier());
  else if (k === 'p') { const nb = nahesHofGebaeude(); if (nb && nb.werkbank) { if (aktiv) { meldung('🛠️ Steig erst aus (E)!'); sound.nein(); } else werkbankZeigen(true); } else if (nb && nb.obst) obstPfluecken(nb); else if (nb && nb.teich) angeln(nb); else if (nb && nb.fs) fahrsiloP(nb); else if (nb && nb.biene) honigErnten(nb); else if (panelGeb) panelZeigen(null); else { const b = nb; if (b) panelZeigen(b); else { meldung('🪴 Geh zu einem Gewächshaus, Tiergehege oder deiner Werkbank! (Bauen im Baumodus: B)'); sound.nein(); } } }
  if (k === 'o') ueberladen();
  if (k === 'tab') helferZeigen($('helferpanel').style.display !== 'block');
  if (k === 'c') albumZeigen($('album').style.display !== 'block');   // C = Fisch-Album
  if (k === 'escape') { helferZeigen(false); haendlerZeigen(false); panelZeigen(null); albumZeigen(false); werkbankZeigen(false); if (angel) angelEnde(angel.phase === 'kampf' ? false : null); }
  const bauTaste = '1234567890'.indexOf(k);   // Im Baumodus: 1 bis 9 und 0 (= Nummer 10)
  if (building && k.length === 1 && bauTaste >= 0 && bauTaste < Object.keys(GEBAEUDE_ARTEN).length) { bauArt = Object.keys(GEBAEUDE_ARTEN)[bauTaste]; if (entfernen) entfernenUmschalten(false); updateHUD(); }
  if (k === 'delete') entfernenUmschalten();   // Entf-Taste
  else if (['1', '2', '3', '4'].includes(k) && aktiv) geraetWaehlen(Object.keys(GERAETE)[Number(k) - 1]);
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
  if (building && entfernen) entfernenSuchen();
});
renderer.domElement.addEventListener('wheel', e => { zoom = begrenzt(zoom + e.deltaY * 0.001, 0.5, 2.5); e.preventDefault(); }, { passive: false });
renderer.domElement.addEventListener('click', () => {
  if (building && entfernen && gezogen <= 6) { entfernenSuchen(); entfernenKlick(); return; }
  if (!building || gezogen > 6 || !mausPunkt) return;   // Nach Kamera-Drehen nicht aus Versehen bauen
  geistAktualisieren(mausPunkt);
  const A = GEBAEUDE_ARTEN[bauArt];
  if (!geistOk) { meldung(money < A.preis ? `💸 ${A.name} kostet ${euro(A.preis)}!` : '🚫 Hier kannst du nicht bauen (Feld, Weg oder zu nah an etwas).'); sound.nein(); return; }
  const bx = r2(mausPunkt.x), bz = r2(mausPunkt.z);   // Gerundet, damit es bei allen Spielern genau gleich steht
  gebaeudeHinzu(bauArt, bx, bz, rotation);
  mpEvent({ t: 'bau', art: bauArt, x: bx, z: bz, rot: rotation });
  money -= A.preis;
  sound.bauen();
  if (bauArt === 'silo' || bauArt === 'kleinsilo' || bauArt === 'grosssilo') meldung(`${GEBAEUDE_ARTEN[bauArt].emoji} Neues ${GEBAEUDE_ARTEN[bauArt].name} für ${kg(GEBAEUDE_ARTEN[bauArt].silo.max)} Korn! Fahr mit vollem Korntank hin und drück L zum Einlagern.`, 4);
  if (bauArt === 'hochsilo') meldung('🗼 Neues Silage-Hochsilo! Bring Häckselgut vom Häcksler (L) – es gärt ganz von allein zu Silage. Ohne Festfahren und ohne Folie! U = Silage holen.', 5);
  if (bauArt === 'futtersilo') meldung(`🐄 Neues Futtersilo! Füll Korn oder Silage ein (L) – es füllt die Futtertröge aller Gehege in der Nähe (${FUTTERSILO_WEITE} m) automatisch auf.`, 5);
  if (OBST[bauArt]) meldung(`${GEBAEUDE_ARTEN[bauArt].emoji} ${GEBAEUDE_ARTEN[bauArt].name} gepflanzt! Erst blüht er, dann wachsen die ${OBST[bauArt].name}. Wenn sie reif sind: P = pflücken.`, 4);
  if (bauArt === 'bienenstock') meldung('🐝 Neuer Bienenstock! Die Bienen machen Honig – mit Obstbäumen in der Nähe doppelt so viel. P = Honig ernten.', 4.5);
  if (GEBAEUDE_ARTEN[bauArt].haustier) meldung(`${GEBAEUDE_ARTEN[bauArt].emoji} Ein neues Haustier ist eingezogen! Geh hin und drück P zum Streicheln. 💕`, 4.5);
  if (bauArt === 'garage3') meldung('🅿️ Neue 3er-Garage! Fahr einfach hinein – die Rolltore gehen von allein auf.', 4);
  if (bauArt === 'fahrsilo') meldung('🟩 Neues Silagesilo! Häcksel Mais 🌽, kipp das Häckselgut hier ab (L), fahr drüber, deck es zu (P) – dann wird Silage daraus.', 5);
  if (bauArt === 'teich') meldung('🎣 Neuer Fischteich! Geh ans Ufer und drück P zum Angeln.', 4);
  if (bauArt === 'gewaechshaus') meldung('🪴 Neues Gewächshaus! Geh hin und drück P, um Gemüse zu pflanzen.', 4);
  if (GEBAEUDE_ARTEN[bauArt].tier) meldung(`${GEBAEUDE_ARTEN[bauArt].emoji} ${GEBAEUDE_ARTEN[bauArt].name} gebaut! Geh hin und drück P, um ${TIERE[GEBAEUDE_ARTEN[bauArt].tier].name} zu kaufen.`, 4);
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
  if (fz.diesel <= 0) { maxVor = 1; meldungSelten(typ.elektro ? '🔋 Der Akku ist leer! Warte in der Sonne ☀️ oder lade beim Landhandel (T).' : '⛽ Der Diesel ist leer! Kriech zum Landhandel und tank mit T.'); }
  const gas = keys.w || keys.arrowup, rueck = keys.s || keys.arrowdown;
  if (gas && fz.speed >= 0) fz.speed = Math.min(fz.speed + BESCHLEUNIGUNG * last * (turbo ? 1.8 : 1) * dt, maxVor);
  else if (rueck && fz.speed <= 0.1) fz.speed = Math.max(fz.speed - BESCHLEUNIGUNG * 0.6 * dt, -RUECKWAERTS_TEMPO);
  else if (gas || rueck) fz.speed *= Math.pow(0.02, dt);   // Gegen die Fahrtrichtung = Bremsen
  else fz.speed *= Math.pow(0.5, dt);   // Ausrollen
  if (fz.speed > maxVor) fz.speed = Math.max(maxVor, fz.speed - 6 * dt);   // Zu schnell fürs Feld? Langsam abbremsen
  if (keys[' ']) fz.speed *= Math.pow(0.002, dt);   // Bremsen
  // Diesel verbrauchen (mehr bei Vollgas, Turbo und beim Arbeiten; große Fahrzeuge brauchen mehr)
  fz.diesel = Math.max(0, fz.diesel - dt * typ.groesse * (typ.sparsam || 1) * (typ.elektro ? 0.6 : 1) * (0.03 + Math.abs(fz.speed) * 0.006 * (turbo ? 2 : 1) + (fz.arbeitet && Math.abs(fz.speed) > 0.5 ? 0.04 : 0)));
  // Lenken: Die Räder drehen sich ein, und das Fahrzeug fährt eine Kurve (im Stand dreht es sich nicht)
  const lenkZiel = ((keys.a || keys.arrowleft) ? 1 : 0) - ((keys.d || keys.arrowright) ? 1 : 0);
  fz.lenkWinkel += (lenkZiel * 0.55 - fz.lenkWinkel) * Math.min(1, dt * 6);
  fz.g.rotation.y += fz.speed * Math.tan(fz.lenkWinkel) / (fz.radstand * typ.groesse) * dt;
  if (typ.raupe) fz.g.rotation.y += lenkZiel * 0.9 * dt * Math.max(0, 1 - Math.abs(fz.speed) / 3);   // Raupe: dreht sich auf der Stelle
  if (typ.gps && fz.arbeitet && lenkZiel === 0 && Math.abs(fz.speed) > 0.5) {   // GPS-Autopilot: schnurgerade auf dem Feld
    const gerade = Math.round(fz.g.rotation.y / (Math.PI / 2)) * (Math.PI / 2), d = gerade - fz.g.rotation.y;
    fz.g.rotation.y += begrenzt(d, -0.8 * dt, 0.8 * dt);
    if (!fz.gpsAn) { fz.gpsAn = true; meldung('🛰️ GPS-Autopilot: Ich halte die Spur – du musst nur Gas geben!', 2.5); }
  } else if (lenkZiel !== 0 || !fz.arbeitet) fz.gpsAn = false;
  if (typ.monster) {   // Monster: Shift = Springen!
    if (keys.shift && !fz.hopp && fz.diesel > 0) { fz.hoppV = 7; fz.hopp = 0.01; tonGleiten(120, 260, 0, 0.3, 'sawtooth', 0.06); }
    if (fz.hopp) {
      fz.hopp += fz.hoppV * dt; fz.hoppV -= 16 * dt;
      if (fz.hopp <= 0) { fz.hopp = 0; sound.rumms(); for (let k = 0; k < 10; k++) staub(fz.g.position.x + zufall(-2, 2), fz.g.position.z + zufall(-2, 2), 0xb8a37a, 0.3, 0.8, 1.5); }
    }
  }
  const alt = fz.g.position.clone();
  fz.g.translateZ(-fz.speed * dt);
  // Nur blockieren, wenn wir NEU irgendwo reinfahren (steckt man schon fest, darf man raus fahren) – im Sprung fliegt der Monster-Traktor drüber!
  if (!(fz.hopp > 0.8) && kollidiert(fz.g.position.x, fz.g.position.z, fz.radius, fz) && !kollidiert(alt.x, alt.z, fz.radius, fz)) {
    fz.g.position.copy(alt);
    if (Math.abs(fz.speed) > 4) { sound.rumms(); meldungSelten('💥 Rumms!'); }
    fz.speed = -fz.speed * 0.3;
  }
  for (const r of fz.raeder) {
    r.rad.rotation.x -= fz.speed * dt / (r.r * typ.groesse);   // Räder drehen sich
    if (r.lenkt) r.lenker.rotation.y = fz.lenkWinkel * r.lenkt;
  }
  if (typ.geraete.length) arbeiten(fz);
  // Reifenspuren auf dem Feld
  spurTakt -= Math.abs(fz.speed) * dt;
  if (spurTakt <= 0) {
    spurTakt = 0.25;
    for (const r of fz.raeder) { r.lenker.getWorldPosition(tmp); spurMalen(tmp.x, tmp.z); }
  }
  // Rauch aus dem Auspuff (mehr, wenn du Gas gibst – und beim Turbo richtig viel!)
  rauchTakt -= dt * (turbo ? 30 : gas ? 14 : 4);
  if (rauchTakt <= 0 && fz.diesel > 0 && !typ.elektro) {
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
// Die Spiel-Version kommt automatisch aus der index.html (spiel.js?v=...). Alle Spieler brauchen die gleiche!
const SPIEL_VERSION = new URL(import.meta.url).searchParams.get('v') || '?';
if (document.getElementById('version')) document.getElementById('version').textContent = `Version ${SPIEL_VERSION}`;
const ALTE_VERSION = '⚠️ Ihr habt verschiedene Spiel-Versionen! Wer das alte Spiel hat: Strg + F5 drücken (am Handy/Tablet: Seite neu laden).';
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
    wz: fz.werkzeug, ab: fz.arbeitet, di: Math.round(fz.diesel), ta: fz.tank, sa: fz.saat, an: fz.anh ? fz.anh.id : null, ai: fz.anh ? fz.anh.inhalt : 0, gu: fz.gut, agu: fz.anh ? fz.anh.gut : null, sart: fz.saatArt });
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
    t: 'welt', money, spielZeit, tageszeit, tagNr, ballen: ballenDaten(), hofSilo: hofSilo.inhalt, fischRekorde,
    felder: felder.map(f => ({ g: f.gekauft, c: f.zellen.map(zellCode) })),
    gebaeude: gebaute.map(b => ({ art: b.art, x: b.x, z: b.z, rot: b.rot, inhalt: b.silo ? b.silo.inhalt : 0, d: gebDaten(b) })),
    fahrzeuge: fahrzeuge.map(f => ({ id: f.id, typ: f.typName, x: f.g.position.x, z: f.g.position.z, r: f.g.rotation.y, saat: f.saat, tank: f.tank, diesel: f.diesel, gut: f.gut, saatArt: f.saatArt,
      werkzeug: f.werkzeug, fahrer: f === aktiv ? mp.ich : f.fahrer })),
    spieler: [{ id: mp.ich, nr: mp.nr }, ...[...mp.andere.values()].map(o => ({ id: o.id, nr: o.nr }))],
    anhaenger: anhaenger.map(a => ({ id: a.id, typ: a.typName, x: a.g.position.x, z: a.g.position.z, r: a.g.rotation.y, inhalt: a.inhalt, gut: a.gut, an: a.an ? a.an.id : null })),
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
    conn.send({ t: 'hallo', nr, code: mp.code, v: SPIEL_VERSION });
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
  fischRekorde = d.fischRekorde || {};
  if (aktiv) aussteigen();
  if (mitfahrt) beifahrerAus();
  for (const fz of fahrzeuge) scene.remove(fz.g);
  fahrzeuge.length = 0; letztes = null;
  for (const a of anhaenger) scene.remove(a.g);
  anhaenger.length = 0;
  for (const b of gebaute) {
    scene.remove(b.mesh);
    const k = hindernisse.indexOf(b.h); if (k >= 0) hindernisse.splice(k, 1);
    for (const h of b.hx || []) { const n = hindernisse.indexOf(h); if (n >= 0) hindernisse.splice(n, 1); }
    if (b.tier) { const n = haustiere.indexOf(b.tier); if (n >= 0) haustiere.splice(n, 1); }
    if (b.silo) { scene.remove(b.silo.schild); silos.splice(silos.indexOf(b.silo), 1); }
    for (const o of b.extra || []) scene.remove(o);   // Schilder und Tiere
  }
  panelZeigen(null);
  gebaute.length = 0;
  money = d.money; mp.geldBasis = money; spielZeit = d.spielZeit;
  if (typeof d.tageszeit === 'number') tageszeit = d.tageszeit;
  if (typeof d.tagNr === 'number') { tagNr = d.tagNr; jahreszeitZeigen(); }
  hofSilo.inhalt = d.hofSilo; hofSilo.basis = d.hofSilo; siloSchild(hofSilo);
  d.felder.forEach((df, k) => {
    const f = felder[k];
    if (!f || df.c.length !== f.zellen.length) return;
    f.gekauft = df.g;
    df.c.forEach((code, n) => { f.zellen[n] = zelleAusCode(code); });
    malFeld(f);
  });
  for (const b of d.gebaeude) if (GEBAEUDE_ARTEN[b.art]) gebaeudeHinzu(b.art, b.x, b.z, b.rot, b.inhalt || 0, b.d);
  for (const f of d.fahrzeuge) {
    if (!FAHRZEUGE[f.typ]) continue;
    const fz = neuesFahrzeug(f.typ, f.x, f.z, f.r, f);
    fz.fahrer = f.fahrer; fz.fahrerZeit = spielZeit;
  }
  anhaengerLaden(d.anhaenger);
  ballenAusDaten(d.ballen);
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
      if (d.v !== SPIEL_VERSION) meldung(ALTE_VERSION, 12);
      mp.nr = d.nr;
      farmer.hemd.map = karoTextur(MP_BAUERN[d.nr].farbe); farmer.hemd.needsUpdate = true;   // Dein Hemd bekommt deine Farbe
      return;
    case 'voll': mpVerbindungWeg('Der Raum ist voll (höchstens 4 Bauern).'); return;
    case 'welt': weltLaden(d); return;
    case 'weg': mpSpielerWeg(d.id, false); return;
    // Geld und Silos rechnet der Gastgeber: Gäste schicken nur, wie viel sich geändert hat
    case 'geldStand': money = d.m; mp.geldBasis = d.m; return;
    case 'geld': if (host) money += d.d; return;
    case 'siloStand': { const s = silos.find(x => siloSchluessel(x) === d.s); if (s) { s.inhalt = d.i; s.basis = d.i; if (typeof d.r === 'number') { s.roh = d.r; s.rohBasis = d.r; } siloSchild(s); } return; }
    case 'silo': if (host) { const s = silos.find(x => siloSchluessel(x) === d.s); if (s) { s.inhalt = begrenzt(s.inhalt + d.d, 0, s.max); if (d.dr) s.roh = begrenzt(s.roh + d.dr, 0, s.inhalt); siloSchild(s); } } return;
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
    case 'sp':
      if (host && vonGast && !vonGast.versionOk) {   // Hat der Gast die gleiche Version? (Alte Versionen schicken gar keine mit)
        vonGast.versionOk = true;
        if (d.v !== SPIEL_VERSION) meldung(`${ALTE_VERSION} (${vonGast.name})`, 12);
      }
      if (d.id !== mp.ich) { const o = mp.andere.get(d.id) || mpSpielerNeu(d.id, d.nr); Object.assign(o, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, fz: d.fz, bf: d.bf, lf: d.lf, sa: d.sa, sg: d.sg, ho: d.ho, ag: d.ag }); } break;
    case 'fz': {
      const fz = fahrzeuge.find(f => f.id === d.id);
      if (fz && fz !== aktiv) {
        fz.ziel = d; fz.fahrer = d.fa; fz.fahrerZeit = spielZeit;
        fz.werkzeug = fz.typ.geraete.includes(d.wz) ? d.wz : fz.werkzeug;
        fz.diesel = d.di; fz.tank = d.ta; fz.saat = d.sa;
        if (GUETER[d.gu]) fz.gut = d.gu;
        if (d.sart) fz.saatArt = d.sart;
        // Anhänger: an- oder abgekuppelt?
        if ((fz.anh ? fz.anh.id : null) !== (d.an || null)) {
          abkuppeln(fz);
          const a = d.an ? anhaenger.find(x => x.id === d.an) : null;
          if (a) ankuppeln(fz, a);
        }
        if (fz.anh) { fz.anh.inhalt = d.ai; fz.anh.basis = d.ai; if (GUETER[d.agu]) fz.anh.gut = d.agu; }
      }
      break;
    }
    case 'zelle': { const f = felder[d.f]; if (f) { f.zellen[d.j * f.nx + d.i] = zelleAusCode(d.c); malBoden(f, d.i, d.j); } break; }
    case 'feld': { const f = felder[d.nr]; if (f && !f.gekauft) { f.gekauft = true; malFeld(f); meldung(`🎉 Feld ${d.nr + 1} wurde gekauft!`); } break; }
    case 'bau': gebaeudeHinzu(d.art, d.x, d.z, d.rot, 0); sound.bauen(); break;
    case 'korn': { const fz = fahrzeuge.find(x => x.id === d.id); if (fz) kornDazu(fz, d.m, GUETER[d.g] ? d.g : 'korn'); break; }   // Der Mähdrescher (oder Häcksler) hat übergeladen
    case 'ballen': ballenNeu(d.id, d.x, d.z, d.r); break;
    case 'gebWeg': { const b = gebaute.find(x => gebSchluessel(x) === d.k); if (b) gebaeudeEntfernen(b); break; }
    case 'fzWeg': { const fz = fahrzeuge.find(x => x.id === d.id); if (fz && fz !== aktiv) fahrzeugEntfernen(fz); break; }
    case 'anhWeg': { const a = anhaenger.find(x => x.id === d.id); if (a) anhaengerEntfernen(a); break; }
    case 'ballenWeg': ballenWeg(d.id); break;
    case 'neuerAnh': if (!anhaenger.some(a => a.id === d.id) && ANHAENGER[d.typ]) neuerAnhaenger(d.typ, d.x, d.z, d.r, { id: d.id }); break;
    case 'anh': {   // Ein abgestellter Anhänger hat jetzt anderen Inhalt (Mähdrescher hat übergeladen)
      const a = anhaenger.find(x => x.id === d.id);
      if (a && !a.an) { a.inhalt = d.i; a.basis = d.i; if (GUETER[d.g]) a.gut = d.g; }
      break;
    }
    case 'faellt': { const b = baeume[d.nr]; if (b && (b.zustand === 'steht' || b.zustand === 'waechst')) baumFaellen(b, d.w, d.id, false); break; }
    case 'holzWeg': holzWeg(d.id); break;
    case 'rekord': {   // Ein anderer Bauer hat einen neuen Fisch-Rekord!
      const alt = fischRekorde[d.f];
      if (FISCHE[d.f] && (!alt || d.kg > alt.kg)) {
        fischRekorde[d.f] = { kg: d.kg, cm: d.cm, wer: d.wer };
        meldung(`🏆 ${d.wer} hat einen neuen Rekord: ${FISCHE[d.f].emoji} ${FISCHE[d.f].name} mit ${kgText(d.kg)}!`, 5);
        if (host) speichern();
        if ($('album').style.display === 'block') albumZeigen(true);
      }
      break;
    }
    case 'zeit': if (Math.abs(tageszeit - d.z) > 0.1) tageszeit = d.z; if (typeof d.tag === 'number' && d.tag !== tagNr) { tagNr = d.tag; jahreszeitZeigen(); } return;
    case 'schlaf': zeitVorspulen(d.s); tageszeit = d.z; if (typeof d.tag === 'number') { tagNr = d.tag; jahreszeitZeigen(); } meldung(`💤 Jemand hat geschlafen – es ist jetzt ${d.z}:00 Uhr morgens! ☀️`, 4); break;
    case 'geb': { const b = gebaute.find(x => gebSchluessel(x) === d.k); if (b) gebDatenSetzen(b, d.d); break; }
    case 'gebStand': for (const e of d.l || []) { const b = gebaute.find(x => gebSchluessel(x) === e.k); if (b) gebDatenSetzen(b, e.d); } return;
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
    if (host) mpAnAlle({ t: 'siloStand', s: siloSchluessel(s), i: s.inhalt, r: Math.round(s.roh) });
    else mpEvent({ t: 'silo', s: siloSchluessel(s), d: s.inhalt - (s.basis || 0), dr: Math.max(0, s.roh - (s.rohBasis || 0)) });
    s.rohBasis = s.roh;
    s.basis = s.inhalt;
  }
  for (const a of anhaenger) if (!a.an && a.inhalt !== a.basis) { a.basis = a.inhalt; mpEvent({ t: 'anh', id: a.id, i: a.inhalt, g: a.gut }); }
  // Wo bin ich?
  mpEvent({ t: 'sp', id: mp.ich, nr: mp.nr, x: r2(player.position.x), y: r2(player.position.y), z: r2(player.position.z), yaw: r2(yaw), fz: aktiv ? aktiv.id : mitfahrt ? mitfahrt.id : null, bf: mitfahrt ? 1 : 0, lf: mp.laeuft, sa: saegeAn, sg: saegt, ho: getragen, ag: aktiv ? 0 : angelZustand(), v: SPIEL_VERSION });
  if (aktiv) mpFzSenden(aktiv, mp.ich);
  if (host) for (const fz of fahrzeuge) if (fz.helfer) mpFzSenden(fz, 'helfer');
  if (host) {
    mp.felderTakt -= 1 / MP_RATE;
    if (mp.felderTakt <= 0) { mp.felderTakt = 15; mpAnAlle({ t: 'felder', felder: felder.map(f => f.zellen.map(zellCode)) }); mpAnAlle({ t: 'zeit', z: tageszeit, tag: tagNr }); mpAnAlle({ t: 'gebStand', l: gebaute.filter(b => b.gh || b.geh || b.obst || b.teich || b.fs || b.biene).map(b => ({ k: gebSchluessel(b), d: gebDaten(b) })) }); }
  }
}
const weltDa = () => mp.geldBasis !== null;
// Die anderen Bauern zeichnen (zu Fuß oder sitzend im Fahrzeug)
function mpAndereZeigen(dt) {
  for (const o of mp.andere.values()) {
    const G = o.farmer.g;
    const fzO = o.fz ? fahrzeuge.find(f => f.id === o.fz) : null;
    if (fzO) {
      const S = o.bf && fzO.beifahrerSitz ? fzO.beifahrerSitz : fzO.sitz;   // Fahrer- oder Beifahrersitz
      if (G.parent !== fzO.K || o.sitzBf !== !!o.bf) {
        fzO.K.add(G); o.sitzBf = !!o.bf;
        const gr = fzO.typ.groesse;
        G.position.set(S[0], S[1] - 1.65 / gr, S[2] + 0.05);
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
    farmerWerkzeug(o.farmer.t, !!o.sa, !!o.sg, o.ho || 0, o.ag || 0);
    if (o.sg && Math.random() < 0.4) staub(o.ax - Math.sin(o.ayaw) * 1.3, o.az - Math.cos(o.ayaw) * 1.3, 0xe8cf94, 0.8, 0.6, 0.35);   // Sägespäne
  }
}
$('mp-erstellen').addEventListener('click', () => { tonStart(); mpRaumErstellen(); });
$('mp-beitreten').addEventListener('click', () => { tonStart(); mpBeitreten(); });
$('mp-code').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { tonStart(); mpBeitreten(); } });
$('mp-code').addEventListener('keyup', e => e.stopPropagation());

// ===== Tag und Nacht =====
let tageszeit = 8;   // Uhrzeit (0 bis 24). Das Spiel fängt morgens um 8 an.
const mond = new THREE.Sprite(new THREE.SpriteMaterial({ map: glanzTextur('rgba(235,240,255,1)', 'rgba(200,215,255,0)'), fog: false, depthWrite: false, toneMapped: false }));
mond.scale.set(40, 40, 1); scene.add(mond);
const sterne = (() => {   // 700 Sterne am Himmel (nur nachts zu sehen)
  const pos = [];
  for (let k = 0; k < 700; k++) {
    const w = Math.random() * Math.PI * 2, h = 0.05 + Math.random() * 0.95, rr = Math.sqrt(1 - h * h);
    pos.push(Math.cos(w) * rr * 420, h * 420, Math.sin(w) * rr * 420);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(p);
  return p;
})();
// Licht in der Nacht: eine Laterne, wenn du zu Fuß bist, Scheinwerfer am Fahrzeug, eine Lampe auf dem Dorfplatz
const laterne = new THREE.PointLight(0xffd9a0, 0, 16, 1.5); scene.add(laterne);
const scheinwerfer = new THREE.SpotLight(0xfff4d6, 0, 60, 0.55, 0.5, 1.2); scene.add(scheinwerfer, scheinwerfer.target);
const dorfLicht = new THREE.PointLight(0xffd88a, 0, 30, 1.4); dorfLicht.position.set(-8, 4.5, 76); scene.add(dorfLicht);
const sonnenRichtung = new THREE.Vector3(), lichtRichtung = new THREE.Vector3();
const nachtFarbe = new THREE.Color(0x101a3a), abendFarbe = new THREE.Color(0xffa070), weiss = new THREE.Color(0xffffff), himmelMal = new THREE.Color();
const glatt = (a, b, x) => { const t = begrenzt((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let tagHell = 1;   // 1 = heller Tag, 0 = dunkle Nacht
// ===== 📅 Kalender: Tage, Monate und Jahreszeiten =====
let tagNr = 0;   // Tag 0 = 1. März im Jahr 1
const monatNr = () => (2 + Math.floor(tagNr / TAGE_PRO_MONAT)) % 12;
const jahrNr = () => 1 + Math.floor((2 + Math.floor(tagNr / TAGE_PRO_MONAT)) / 12);
const jahreszeit = () => JAHRESZEITEN[MONATE[monatNr()].zeit];
const datumText = () => { const M = MONATE[monatNr()]; return `${M.emoji} ${1 + tagNr % TAGE_PRO_MONAT}. Tag im ${M.name} · Jahr ${jahrNr()}`; };
function neuerTag() {
  const alterMonat = monatNr();
  tagNr++;
  angebotNeu();
  if (monatNr() !== alterMonat) {
    const M = MONATE[monatNr()], J = jahreszeit();
    meldung(`📅 Ein neuer Monat: ${M.emoji} ${M.name}! (${J.name}${J.wachsen < 1 ? ' – die Felder wachsen langsamer' : J.wachsen > 1 ? ' – alles wächst schneller!' : ''})`, 5);
    jahreszeitZeigen();
  }
  speichern();
}
// Schnee im Winter: eine weiße Schicht auf der Wiese und Schneeflocken um dich herum
const schneeDecke = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0xf4f8ff, transparent: true, opacity: 0.72, roughness: 1, depthWrite: false }));
schneeDecke.rotation.x = -Math.PI / 2; schneeDecke.position.y = 0.015; schneeDecke.visible = false; scene.add(schneeDecke);
const schneeFlocken = (() => {
  const pos = [];
  for (let k = 0; k < 1500; k++) pos.push(zufall(-40, 40), zufall(0, 30), zufall(-40, 40));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false }));
  p.visible = false; p.frustumCulled = false; scene.add(p);
  return p;
})();
function jahreszeitZeigen() {   // Wiese, Schnee und Bäume passend zur Jahreszeit
  const z = MONATE[monatNr()].zeit, J = JAHRESZEITEN[z];
  schneeDecke.visible = schneeFlocken.visible = z === 'winter';
  if (grasMesh) { grasMesh.visible = z !== 'winter'; grasMesh.material.color.setHex(J.gras); }
  ground.material.color.setHex(J.gras);
}
function schneeUpdate(dt, ziel) {
  if (!schneeFlocken.visible) return;
  schneeFlocken.position.set(ziel.x, 0, ziel.z);
  const a = schneeFlocken.geometry.attributes.position;
  for (let k = 0; k < a.count; k++) {
    let y = a.getY(k) - dt * (1.2 + (k % 5) * 0.2);
    if (y < 0) y += 30;
    a.setY(k, y); a.setX(k, a.getX(k) + Math.sin(spielZeit + k) * dt * 0.3);
  }
  a.needsUpdate = true;
}
function tagNachtUpdate(dt, ziel) {
  const vorher = tageszeit;
  tageszeit = (tageszeit + dt * 24 / TAG_DAUER) % 24;
  if (tageszeit < vorher) neuerTag();   // Mitternacht!
  const w = (tageszeit - 6) / 12 * Math.PI;   // 6 Uhr = Sonnenaufgang (Osten), 12 Uhr = oben, 18 Uhr = Untergang (Westen)
  sonnenRichtung.set(Math.cos(w), Math.sin(w), 0.35).normalize();
  const hoch = sonnenRichtung.y;
  tagHell = glatt(-0.12, 0.25, hoch);
  const abend = (1 - Math.min(1, Math.abs(hoch) / 0.3)) * 0.6;   // Morgen- und Abendrot
  // Himmel, Nebel und Wolken
  himmelMal.copy(nachtFarbe).lerp(weiss, tagHell).lerp(abendFarbe, abend);
  himmel.material.color.copy(himmelMal);
  scene.background.setHex(HORIZONT).multiply(himmelMal); scene.fog.color.copy(scene.background);
  wolkenMat.color.copy(himmelMal); wolkenMat.emissive.setHex(0x8a96a8).multiplyScalar(0.15 + 0.85 * tagHell);
  sterne.material.opacity = glatt(0.05, -0.15, hoch);
  sterne.position.copy(camera.position);
  // Sonne oder Mond geben das Licht (und die Schatten)
  if (hoch > -0.05) {
    lichtRichtung.copy(sonnenRichtung);
    sun.intensity = 2.4 * glatt(-0.05, 0.2, hoch);
    sun.color.setHex(0xff9a50).lerp(new THREE.Color(0xfff2d6), glatt(0, 0.4, hoch));
  } else {
    lichtRichtung.copy(sonnenRichtung).negate(); lichtRichtung.y = Math.abs(lichtRichtung.y);
    sun.intensity = 0.5 * glatt(0, 0.2, -hoch);
    sun.color.setHex(0x9fb4ff);
  }
  himmelLicht.intensity = 0.3 + 1.1 * tagHell;
  himmelLicht.color.setHex(0x5566aa).lerp(new THREE.Color(0xd8ecff), tagHell);
  himmelLicht.groundColor.setHex(0x1a2230).lerp(new THREE.Color(0x4a6b35), tagHell);
  sonne.visible = hoch > -0.15; sonne.material.color.setHex(0xffb070).lerp(weiss, glatt(0, 0.3, hoch));
  mond.visible = hoch < 0.1;
  // Lampen und Fenster leuchten nachts
  const nacht = 1 - tagHell;
  fensterMat.emissive.setHex(0xffc070); fensterMat.emissiveIntensity = nacht * 0.9;
  if (lampenMat) lampenMat.emissiveIntensity = 0.3 + nacht * 3;
  dorfLicht.intensity = nacht * 40;
  hausLicht.intensity = 10 + nacht * 14 + Math.sin(spielZeit * 13) * 1.5;   // flackert ein bisschen (Kaminfeuer)
  kaminFeuer.material.emissiveIntensity = 1.6 + Math.sin(spielZeit * 17) * 0.4;
  if (aktiv) {   // Scheinwerfer vorne am Fahrzeug
    laterne.intensity = 0;
    aktiv.g.updateMatrixWorld();
    scheinwerfer.position.set(0, 2.2 * aktiv.typ.groesse, -2.5 * aktiv.typ.groesse).applyMatrix4(aktiv.g.matrixWorld);
    scheinwerfer.target.position.set(0, 0, -20).applyMatrix4(aktiv.g.matrixWorld);
    scheinwerfer.intensity = nacht * 120;
  } else {
    scheinwerfer.intensity = 0;
    laterne.position.set(player.position.x, player.position.y + 2.6, player.position.z);
    laterne.intensity = nacht * 10;
  }
  // Sonne und Mond am Himmel, Schatten-Licht wandert mit dir mit
  sun.position.copy(ziel).addScaledVector(lichtRichtung, 70);
  sun.target.position.set(ziel.x, 0, ziel.z);
  sonne.position.copy(camera.position).addScaledVector(sonnenRichtung, 400);
  mond.position.copy(camera.position).addScaledVector(tmp.copy(sonnenRichtung).negate().setY(Math.abs(sonnenRichtung.y) * 0.8 + 0.2).normalize(), 400);
}
const uhrText = () => `${String(Math.floor(tageszeit)).padStart(2, '0')}:${String(Math.floor(tageszeit % 1 * 60)).padStart(2, '0')} ${tagHell > 0.5 ? '☀️' : '🌙'}`;
// Schlafen: Bildschirm wird schwarz, die Zeit springt auf den nächsten Morgen – und alles wächst weiter!
let schlaeft = false;
function zeitVorspulen(sek) {
  for (const f of felder) {
    for (const c of f.zellen) if (c.z === 'gesaet' && c.w < 1) c.w = Math.min(1, c.w + sek * jahreszeit().wachsen / (c.a === 'mais' ? MAIS_WACHS_ZEIT : WACHS_ZEIT));
    malFeld(f);
  }
  for (const b of gebaute) {
    if (b.obst) { b.obst.w = Math.min(1, b.obst.w + sek / OBST[b.art].zeit); obstMalen(b); }
    if (b.gh && GEMUESE[b.gh.art]) { b.gh.w = Math.min(1, b.gh.w + sek / GEMUESE[b.gh.art].zeit); ghMalen(b); }
    if (b.teich) { b.teich.fische = Math.min(TEICH_FISCHE_MAX, b.teich.fische + sek / 30); teichSchild(b); }
    if (b.silo && b.silo.roh > 0) { b.silo.roh = 0; siloSchild(b.silo); }   // Über Nacht ist alles fertig gegoren
    if (b.biene) { b.biene.lager = Math.min(HONIG_MAX, b.biene.lager + honigProMin(b) * sek / 60); bienenSchild(b); }
    if (b.fs && b.fs.zu) { b.fs.gaer = Math.min(1, b.fs.gaer + sek / GAER_ZEIT); fahrsiloMalen(b); }
    if (b.geh) {
      const geh = b.geh, T = TIERE[geh.tier], n = geh.tiere.length;
      if (n) {
        const brauch = n * T.frisst * sek / 60, anteil = brauch > 0 ? Math.min(1, geh.futter / brauch) : 0;   // So lange reicht das Futter
        const boostSek = Math.min(geh.salz, sek * anteil);
        geh.futter = Math.max(0, geh.futter - brauch);
        geh.lager = Math.min(n * T.proMin * 20, geh.lager + n * T.proMin * (sek * anteil + boostSek) / 60);
      }
      geh.salz = Math.max(0, geh.salz - sek);
      gehegeSchild(b);
    }
  }
  for (const b of baeume) {   // Bäume im Wald wachsen nach
    if (b.zustand === 'stumpf') { b.zeit -= sek; if (b.zeit <= -BAUM_WACHS_DAUER) baumZustand(b, 'steht'); else if (b.zeit <= 0) baumZustand(b, 'waechst', Math.min(1, -b.zeit / BAUM_WACHS_DAUER)); }
    else if (b.zustand === 'waechst') { b.wachs += sek / BAUM_WACHS_DAUER; if (b.wachs >= 1) baumZustand(b, 'steht'); else b.kipp.scale.setScalar(0.15 + 0.85 * b.wachs); }
  }
}
function bisMorgenSekunden() { return ((AUFSTEH_ZEIT - tageszeit + 24) % 24 || 24) / 24 * TAG_DAUER; }
function schlafen() {
  if (schlaeft) return;
  if (aktiv || !inHaus(player.position.x, player.position.z) || Math.hypot(player.position.x - HAUS.bett.x, player.position.z - HAUS.bett.z) > 2.6) { meldung('🛏️ Schlafen kannst du in deinem Haus 🏠 – stell dich ans Bett und drück Z!'); sound.nein(); return; }
  schlaeft = true;
  const sek = bisMorgenSekunden();
  $('schlaf').style.display = 'flex';
  requestAnimationFrame(() => { $('schlaf').style.opacity = '1'; });
  for (let k = 0; k < 3; k++) ton(400 - k * 60, k * 0.5, 0.6, 'sine', 0.05);   // Gute-Nacht-Melodie
  setTimeout(() => {
    zeitVorspulen(sek);
    if (tageszeit > AUFSTEH_ZEIT) neuerTag();   // Über Mitternacht geschlafen
    tageszeit = AUFSTEH_ZEIT;
    mpEvent({ t: 'schlaf', s: sek, z: AUFSTEH_ZEIT, tag: tagNr });
    speichern();
    setTimeout(() => {
      $('schlaf').style.opacity = '0';
      setTimeout(() => { $('schlaf').style.display = 'none'; schlaeft = false; }, 1000);
      meldung(`☀️ Guten Morgen! Es ist ${AUFSTEH_ZEIT}:00 Uhr. Während du geschlafen hast, ist alles weitergewachsen! 🌱`, 5);
      [523, 659, 784].forEach((f, k) => ton(f, k * 0.15, 0.4, 'triangle', 0.06));   // Hahn? Fast! 🐓
    }, 1500);
  }, 1300);
}

// ===== Hintergrundmusik (selbst gespielt mit Web Audio – keine Datei nötig!) =====
// Tagsüber: fröhliche Bauernhof-Musik (Gitarre, Bass, Flöte). Nachts: ruhige Schlaflied-Musik.
const MUSIK_LAUT = 0.35;         // Wie laut die Musik ist (0 = aus, 1 = sehr laut)
let musikAn = true, musik = null;
const note = m => 440 * Math.pow(2, (m - 69) / 12);   // Notennummer -> Tonhöhe (60 = das C in der Mitte vom Klavier)
// Akkorde: [Bass, Akkord-Töne] · Tag: C – G – a – F · Nacht: a – F – C – G
const MUSIK_TAG = { tempo: 0.28, akkorde: [[48, [60, 64, 67]], [43, [59, 62, 67]], [45, [60, 64, 69]], [41, [60, 65, 69]]],
  melodie: [72, 74, 76, 79, 76, 74, 72, -1,  74, 71, 74, 79, 77, 76, 74, -1,  76, 72, 76, 81, 79, 76, 72, -1,  77, 76, 74, 72, 74, 72, 69, -1,
            79, -1, 76, 79, 81, 79, 76, -1,  79, 77, 76, 74, 71, 74, 79, -1,  76, 74, 72, 76, 81, 76, 72, -1,  72, 74, 76, 72, 69, 72, 72, -1] };
const MUSIK_NACHT = { tempo: 0.42, akkorde: [[45, [57, 60, 64]], [41, [57, 60, 65]], [48, [55, 60, 64]], [43, [55, 59, 62]]],
  melodie: [76, -1, 72, -1, 74, -1, 72, -1,  77, -1, 76, -1, 72, -1, -1, -1,  76, -1, 79, -1, 76, -1, 72, -1,  74, -1, 71, -1, 74, -1, -1, -1] };
function musikTon(f, t, dauer, klang, laut, ziel) {   // Einen Ton genau zur Zeit t spielen
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = klang; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(laut, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g).connect(ziel); o.start(t); o.stop(t + dauer + 0.05);
}
function musikUpdate() {
  if (!audio) return;
  if (!musik) {   // Beim ersten Mal: eigener Lautstärke-Regler für die Musik
    const g = audio.createGain(); g.gain.value = 0; g.connect(audio.destination);
    musik = { g, zeit: audio.currentTime + 0.3, schritt: 0 };
  }
  const nacht = tagHell < 0.4;
  musik.g.gain.setTargetAtTime(musikAn && tonAn ? MUSIK_LAUT * (nacht ? 0.8 : 1) : 0, audio.currentTime, 0.3);
  if (!musikAn || !tonAn) { musik.zeit = audio.currentTime + 0.3; return; }
  if (musik.zeit < audio.currentTime - 0.1) musik.zeit = audio.currentTime + 0.05;   // War das Spiel im Hintergrund? Nicht alles nachholen!
  // Immer ein kleines Stück im Voraus planen (dann klingt es gleichmäßig, auch wenn das Spiel kurz ruckelt)
  while (musik.zeit < audio.currentTime + 0.4) {
    const M = nacht ? MUSIK_NACHT : MUSIK_TAG, t = musik.zeit, k = musik.schritt;
    const takt = Math.floor(k / 8) % M.akkorde.length, im = k % 8, [bass, akkord] = M.akkorde[takt];
    if (nacht) {   // Nachts: weiche Harfe (Akkord-Töne nacheinander) und leiser Bass
      if (im % 2 === 0) musikTon(note(akkord[(im / 2) % 3] + 12), t, 1.6, 'sine', 0.05, musik.g);
      if (im === 0) musikTon(note(bass), t, 3, 'sine', 0.09, musik.g);
    } else {        // Tagsüber: Bass auf 1 und 5, Gitarre schrummt, Flöte spielt die Melodie
      if (im === 0 || im === 4) musikTon(note(bass + (im === 4 ? 7 : 0)), t, 0.5, 'triangle', 0.11, musik.g);
      if (im === 2 || im === 6) for (const n of akkord) musikTon(note(n), t + (n % 3) * 0.012, 0.35, 'triangle', 0.03, musik.g);
    }
    const m = M.melodie[k % M.melodie.length];
    if (m > 0) {
      musikTon(note(m), t, nacht ? 0.9 : 0.32, 'sine', nacht ? 0.045 : 0.06, musik.g);
      if (!nacht) musikTon(note(m) * 2, t, 0.15, 'sine', 0.01, musik.g);   // Etwas "Luft" wie bei einer Flöte
    }
    musik.zeit += M.tempo; musik.schritt++;
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
  } else if (mitfahrt) {
    if (!fahrzeuge.includes(mitfahrt)) { mitfahrt = null; scene.add(player); player.scale.setScalar(1); player.position.set(0, 0, 10); }
    else farmerPose(farmer, true, false, dt);
  } else {
    // Zu Fuß: "Vorne" ist da, wo du hinschaust
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const alt = player.position.clone();
    const K = (angel && angel.phase === 'kampf') || schlaeft ? {} : keys;   // Beim Angeln und Schlafen nicht laufen
    const tempo = LAUF_TEMPO * (K.shift ? 1.6 : 1) * dt;
    if (K.w || K.arrowup) player.position.addScaledVector(forward, tempo);
    if (K.s || K.arrowdown) player.position.addScaledVector(forward, -tempo);
    if (K.a || K.arrowleft) player.position.addScaledVector(right, -tempo);
    if (K.d || K.arrowright) player.position.addScaledVector(right, tempo);
    if (kollidiert(player.position.x, player.position.z, 0.4)) player.position.copy(alt);
    player.rotation.y = yaw;
    // Hüpfen mit der Leertaste
    if (K[' '] && amBoden) { spielerVy = SPRUNG_KRAFT; amBoden = false; sound.hupf(); }
    spielerVy -= SCHWERKRAFT * dt;
    player.position.y += spielerVy * dt;
    if (player.position.y <= 0) { player.position.y = 0; spielerVy = 0; amBoden = true; }
    mp.laeuft = Math.hypot(player.position.x - alt.x, player.position.z - alt.z) > 0.001;
    farmerPose(farmer, false, mp.laeuft, dt, !amBoden);
  }
  waldUpdate(dt);
  dorfUpdate(dt);
  angelUpdate(dt);
  fangUpdate(dt);
  musikUpdate();
  salzUpdate(dt);
  waldPlotHacken(dt);
  werkbankUpdate();
  gebUpdate(dt);
  panelUpdate();
  if (!aktiv) farmerWerkzeug(farmer, saegeAn, saegt, getragen, angelZustand());
  if (hackt) { farmer.armR.rotation.x = 1.6 + Math.sin(spielZeit * 12) * 1.0; farmer.armL.rotation.x = 1.2 + Math.sin(spielZeit * 12) * 0.6; }   // Hacken!
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
    } else if (fz !== aktiv && !fz.helfer) { fz.speed = 0; fz.arbeitet = false; }
    if (fz.mulde) lkwUpdate(fz, dt);
    if (fz.frontgewicht) fz.frontgewicht.visible = !(GERAETE[fz.werkzeug] && !GERAETE[fz.werkzeug].hinten);
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
    if (a.korn.material && a.korn.material.color && a.zeigtGut !== a.gut) { a.zeigtGut = a.gut; a.korn.material.color.setHex((GUETER[a.gut] || GUETER.korn).farbe); }
    a.schild.visible = !a.an;
    if (a.holzTeile) a.holzTeile.forEach((h, k) => { h.visible = k < a.inhalt; });
  }
  mpAndereZeigen(dt);
  mpTick(dt);
  wachsen(dt);
  staubUpdate(dt);
  haeckselUpdate(dt);
  fahrsiloUpdate(dt);
  bienenUpdate(dt);
  siloUpdate(dt);
  garageUpdate(dt);
  haustierUpdate(dt);
  stadtUpdate(dt);
  helferUpdate(dt);
  windZeit.value = spielZeit;
  for (const w of wolken) { w.position.x += dt * 1.5; if (w.position.x > 260) w.position.x = -260; }   // Wolken ziehen vorbei
  geistAktualisieren(mausPunkt);

  // Hinweis unten in der Mitte
  const fn = feldInDerNaehe(), silo = nahesSilo(), wh = waldHinweis(), hh = hofHinweis();
  if (mitfahrt) zeigeHinweis(`🪑 Beifahrer im ${mitfahrt.typ.emoji} ${mitfahrt.typ.name} · E = aussteigen · F = Ansicht wechseln`);
  else if (building && entfernen) zeigeHinweis(entfernenZiel ? `🗑️ Klick = ${zielInfo(entfernenZiel).name} entfernen (+${euro(zielInfo(entfernenZiel).geld)} zurück)` : '🗑️ Entfernen: Zeig mit der Maus auf etwas und klick · Entf = zurück zum Bauen · B = fertig');
  else if (building) zeigeHinweis(`🏗️ ${GEBAEUDE_ARTEN[bauArt].name} (${euro(GEBAEUDE_ARTEN[bauArt].preis)}) · Klick = bauen · R = drehen · 1–9, 0 oder , . = anderes Gebäude · B = fertig`);
  else if (wh) zeigeHinweis(wh);
  else if (hh) zeigeHinweis(hh);
  else if (anHofTankstelle()) zeigeHinweis(`⛽ Hof-Tankstelle: T = Tanken (${Math.round(aktiv.diesel)} von ${aktiv.typ.dieselMax} Liter)`);
  else if (imLaden()) zeigeHinweis(`🏪 Landhandel: V = verkaufen (${gutText(aktiv)}) · G = Getreide-Saat · Y = Mais-Saat · T = Tanken · N = Händler`);
  else if (aktiv && naheBallen(aktiv).length && (!gutVon(aktiv) || gutVon(aktiv) === 'stroh') && kornPlatz(aktiv) - kornDrin(aktiv) >= BALLEN_KG) zeigeHinweis(`🟨 L = ${Math.min(naheBallen(aktiv).length, Math.floor((kornPlatz(aktiv) - kornDrin(aktiv)) / BALLEN_KG))} Strohballen aufladen`);
  else if (silo) zeigeHinweis(silo.gut === 'futter' ? `🐄 Futtersilo (${kg(silo.inhalt)}): L = Korn oder Silage einfüllen – füttert die Tiere in der Nähe automatisch`
    : silo.gut === 'silage' ? `🗼 Silage-Hochsilo (${kg(silo.inhalt - silo.roh)} fertig${silo.roh > 0 ? `, ${kg(silo.roh)} gärt noch` : ''}): L = Häckselgut einfüllen · U = Silage holen`
    : `${GEBAEUDE_ARTEN[silo.art].emoji} ${siloName(silo)} (${kg(silo.inhalt)} von ${kg(silo.max)}): L = Korn einlagern · U = Korn holen`);
  else if (aktiv && aktiv.typ.art === 'haecksler' && !aktiv.anh && naheAnhaengerZumKuppeln(aktiv)) zeigeHinweis('🔗 H = Anhänger ankuppeln (dann bläst der Häcksler hinein)');
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
    motor.g.gain.setTargetAtTime(an && tonAn ? (0.05 + (gasGeben ? 0.03 : 0)) * (ansicht === 'ego' ? 1.3 : 1) * (fz.typ.elektro ? 0.35 : 1) : 0, t, 0.2);
  }
  if (saegeTon) {   // Motorsäge: im Leerlauf blubbern, beim Sägen laut kreischen
    const t = audio.currentTime, an = ((saegeAn && !aktiv && saegeSprit > 0) || harvSaegt) && tonAn;
    const f = saegt || harvSaegt ? 175 + Math.random() * 20 : 92 + Math.sin(spielZeit * 9) * 6;
    saegeTon.o.frequency.setTargetAtTime(f, t, 0.08);
    saegeTon.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    saegeTon.f.frequency.setTargetAtTime(saegt || harvSaegt ? 1400 : 700, t, 0.1);
    saegeTon.g.gain.setTargetAtTime(an ? (saegt || harvSaegt ? 0.09 : 0.03) : 0, t, 0.1);
  }

  // Kamera
  const kamFz = aktiv || mitfahrt;   // Im Fahrzeug (als Fahrer oder Beifahrer)
  const target = kamFz ? kamFz.g.position : player.position;
  if (ansicht === 'ego') {
    // First Person: mit den Augen des Farmers (im Fahrzeug: aus der Kabine)
    if (kamFz) {
      const S = mitfahrt ? kamFz.beifahrerSitz : kamFz.sitz;
      kamFz.K.updateMatrixWorld();
      kamFz.K.localToWorld(tmp.set(S[0], S[1], S[2]));
      camera.position.copy(tmp);
      camera.rotation.set(blickHoch, kamFz.g.rotation.y + kamOffset, 0);
    } else {
      camera.position.set(player.position.x, player.position.y + 1.68, player.position.z);
      camera.rotation.set(blickHoch, yaw, 0);
    }
    kamPos.copy(camera.position);
  } else {
    // Von hinten: weich hinterher fliegen
    if (!mouseDown && kamFz) kamOffset *= Math.pow(0.4, dt);   // Langsam wieder hinter das Fahrzeug drehen
    const angle = kamFz ? kamFz.g.rotation.y + kamOffset : yaw;
    const g = kamFz ? kamFz.typ.groesse * (kamFz.typ.art === 'drescher' ? 1.4 : 1) : 1;
    const distance = (kamFz ? 10 : 6) * zoom * g, height = (kamFz ? 5 : 3.2) * zoom * g;
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
    if (inHaus(target.x, target.z)) {   // Im Haus: Kamera bleibt drinnen und unter der Decke
      ziel.x = begrenzt(ziel.x, HAUS.x1 + 0.6, HAUS.x2 - 0.6);
      ziel.z = begrenzt(ziel.z, HAUS.z1 + 0.6, HAUS.z2 - 0.6);
      ziel.y = Math.min(ziel.y, HAUS.hoehe - 0.3);
    }
    kamPos.lerp(ziel, 1 - Math.pow(0.002, dt));
    camera.position.copy(kamPos);
    camera.lookAt(target.x, target.y + 1.4, target.z);
  }
  // Die Sonne (und ihr Schatten) wandert mit dir mit
  tagNachtUpdate(dt, target);
  schneeUpdate(dt, target);
  egoSaegeUpdate(dt);
  egoAngelUpdate(dt);
  himmel.position.copy(camera.position);   // Der Himmel ist immer gleich weit weg

  renderer.render(scene, camera);
}

// =====================================================================
// ===== 👷 Helfer: arbeiten auf dem Feld oder auf dem Hof – und werden immer besser (Level 1 bis 5) =====
// =====================================================================
const HELFER_MAX = 4;            // So viele Helfer kannst du haben
const HELFER_PREIS = 200;        // Einstellen kostet so viel
const HELFER_LOHN = 2;           // Lohn pro Minute beim Arbeiten (mal Level): Level 1 = 2 €, Level 5 = 10 €
const HELFER_XP = [0, 60, 180, 400, 800];   // So viele Erfahrungspunkte braucht man für Level 1, 2, 3, 4, 5
const HELFER_NAMEN = ['Paul', 'Lena', 'Ali', 'Mia', 'Tom', 'Sophie', 'Jonas', 'Emma'];
const HELFER_FARBEN = ['#d8a03a', '#3a7fd8', '#7fd83a', '#d83a7f', '#8a3ad8', '#3ad8c8'];
const HELFER_HEIM = { x: 10, z: 34 };   // Hier warten die Hof-Helfer, wenn es nichts zu tun gibt
const HELFER_AUFGABEN = {
  pflug: { name: 'Pflügen', emoji: '🟫', geraet: 'pflug', zelle: c => c.z === 'wiese' || c.z === 'stoppeln' },
  saat: { name: 'Getreide säen', emoji: '🌱', geraet: 'saat', saatArt: 'weizen', zelle: c => c.z === 'gepfluegt' },
  mais: { name: 'Mais säen', emoji: '🌽', geraet: 'saat', saatArt: 'mais', zelle: c => c.z === 'gepfluegt' },
  ernte: { name: 'Getreide ernten', emoji: '🌾', geraet: 'ernte', zelle: c => c.z === 'gesaet' && c.a !== 'mais' && c.w >= 1 },
  presse: { name: 'Stroh pressen', emoji: '🟨', geraet: 'presse', zelle: c => !!c.stroh },
  haecksel: { name: 'Mais häckseln', emoji: '🚜', geraet: 'maisgebiss', zelle: c => c.z === 'gesaet' && c.a === 'mais' && c.w >= 1 },
};
const helfer = [];
const helferLevel = h => HELFER_XP.filter(x => h.xp >= x).length;
let stumm = false;   // Wenn ein Helfer arbeitet, sollen seine Meldungen dich nicht stören
function helferNeu(name, farbe, xp = 0) {
  const h = { name, farbe, xp, job: null, wahl: null, wahlFeld: null, lohnZeit: 0, status: 'Wartet auf Arbeit', figur: null, schild: schild('', '#ffd166', 4) };
  h.schild.visible = false; scene.add(h.schild);
  helfer.push(h);
  return h;
}
const helferDaten = () => helfer.map(h => ({ n: h.name, f: h.farbe, xp: Math.round(h.xp) }));
function helferLaden(liste) { for (const d of liste) if (helfer.length < HELFER_MAX) helferNeu(d.n, d.f, d.xp || 0); }
function helferEinstellen() {
  if (helfer.length >= HELFER_MAX) return;
  if (money < HELFER_PREIS) { meldung(`💸 Ein Helfer kostet ${euro(HELFER_PREIS)}!`); sound.nein(); return; }
  money -= HELFER_PREIS;
  const name = HELFER_NAMEN.find(n => !helfer.some(h => h.name === n)) || 'Helfer';
  helferNeu(name, HELFER_FARBEN[helfer.length % HELFER_FARBEN.length]);
  meldung(`👷 ${name} hilft jetzt auf deinem Hof! Gib ${name} im Helfer-Menü eine Aufgabe.`, 3.5);
  sound.kaufen(); speichern();
}
function xpDazu(h, n) {
  const alt = helferLevel(h);
  h.xp += n;
  if (helferLevel(h) > alt) { meldung(`⭐ ${h.name} ist jetzt Level ${helferLevel(h)}! ${h.name} arbeitet jetzt schneller.`, 4); [523, 659, 784, 1047].forEach((f, k) => ton(f, k * 0.1, 0.2, 'triangle', 0.06)); helferMalen(); }
}
const zuTun = (f, A) => f.zellen.filter(A.zelle).length;
// ----- Feldarbeit: Der Helfer nimmt sich ein passendes Fahrzeug und fährt das Feld in Bahnen ab -----
function fahrzeugFuer(A, f) {
  let bestes = null, bestD = Infinity;
  for (const fz of fahrzeuge) {
    if (fz === aktiv || fz.helfer || fremdGefahren(fz) || !fz.typ.geraete.includes(A.geraet)) continue;
    if (GERAETE[A.geraet].hinten && fz.anh) continue;   // Pflug und Sämaschine gehen nicht mit Anhänger
    if (A.geraet === 'ernte' && !gutPasst(fz, 'korn')) continue;   // Da ist noch Silage oder Häckselgut drin
    let d = Math.hypot(fz.g.position.x - f.x, fz.g.position.z - f.z);
    if (A.geraet === 'ernte' && fz.typ.art === 'drescher') d -= 1000;   // Zum Ernten am liebsten den Mähdrescher
    if (d < bestD) { bestD = d; bestes = fz; }
  }
  return bestes;
}
function feldJobStarten(h, feldNr, aufgabe) {
  const f = felder[feldNr], A = HELFER_AUFGABEN[aufgabe];
  if (!f || !f.gekauft || h.job) return;
  if (!zuTun(f, A)) { meldung(`👷 Auf Feld ${f.nr + 1} gibt es nichts zu ${A.name.toLowerCase()}!`); sound.nein(); return; }
  const fz = fahrzeugFuer(A, f);
  if (!fz) {
    meldung(aufgabe === 'haecksel' ? '👷 Dafür braucht der Helfer einen Häcksler (beim Händler)!' : aufgabe === 'ernte' ? '👷 Kein freies Fahrzeug zum Ernten da!' : '👷 Kein freier Traktor da! (Ohne Anhänger – und du darfst nicht selbst drinsitzen.)', 4);
    sound.nein(); return;
  }
  if (aufgabe === 'haecksel' && !gebaute.some(b => b.fs && !b.fs.zu && !(b.fs.fertig && b.fs.inhalt > 0) && b.fs.inhalt < FAHRSILO_MAX)) { meldung('👷 Wohin mit dem Häckselgut? Bau erst ein Silagesilo 🟩 (Baumodus) – der Helfer bringt alles dorthin.', 4.5); sound.nein(); return; }
  // Die Bahnen über das Feld (hin und her)
  const G = GERAETE[A.geraet], W = G.breite * fz.typ.breite, schritt = W * 0.85, breite = f.nx * ZELLE;
  const bahnen = [];
  for (let lx = W / 2 - 0.3; lx - W / 2 < breite; lx += schritt) {
    const i0 = Math.max(0, Math.floor((lx - W / 2) / ZELLE)), i1 = Math.min(f.nx - 1, Math.floor((lx + W / 2) / ZELLE));
    let noetig = false;
    for (let j = 0; j < f.nz && !noetig; j++) for (let i = i0; i <= i1; i++) if (A.zelle(f.zellen[j * f.nx + i])) { noetig = true; break; }
    if (noetig) bahnen.push(f.x0 + Math.min(lx, breite - 0.5));
  }
  const za = f.z0 - 4.5, zb = f.z0 + f.nz * ZELLE + 4.5, wege = [];
  const p = fz.g.position, start = { x: p.x, z: p.z, r: fz.g.rotation.y };
  const zuerstUnten = Math.abs(p.z - za) < Math.abs(p.z - zb);
  const anfahrt = [{ x: p.x, z: -8 }, { x: bahnen[0], z: -8 }];
  bahnen.forEach((bx, k) => { const runter = (k % 2 === 0) === zuerstUnten; wege.push({ x: bx, z: runter ? za : zb, a: 1 }, { x: bx, z: runter ? zb : za, a: 1 }); });
  const letzte = wege[wege.length - 1];
  const rueck = [{ x: letzte.x, z: -8 }, { x: start.x, z: -8 }, { x: start.x, z: start.z }];
  if (fz.werkzeug !== A.geraet) fz.werkzeug = A.geraet;
  fz.helfer = h; fz.helferFeld = f; fz.ziel = null;
  h.job = { art: 'feld', aufgabe, feld: f, fz, wege: [...anfahrt, ...wege, ...rueck], n: 0, start, gesamt: zuTun(f, A), fertig: false };
  h.wahl = null;
  // Der Helfer setzt sich hinein
  const fig = baueFarmer(h.farbe), gr = fz.typ.groesse;
  fig.g.position.set(fz.sitz[0], fz.sitz[1] - 1.65 / gr, fz.sitz[2] + 0.05); fig.g.scale.setScalar(1 / gr);
  farmerPose(fig.t, true, false, 0); fz.K.add(fig.g); h.figur = fig;
  meldung(`👷 ${h.name} fährt mit dem ${fz.typ.name} los: ${A.emoji} ${A.name} auf Feld ${f.nr + 1}!`, 3.5);
  sound.tuer(); helferMalen();
}
function helferAbliefern(h, fz) {   // Tank voll: Der Helfer bringt das Korn ins Silo (oder verkauft es, wenn alle Silos voll sind)
  let m = kornDrin(fz);
  for (const s of silos) { if (s.gut !== 'korn') continue; const rein = Math.min(m, s.max - s.inhalt); if (rein > 0) { s.inhalt += rein; m -= rein; siloSchild(s); } }
  let text = `${kg(kornDrin(fz) - m)} Korn ins Silo gebracht`;
  if (m > 0) { const e = Math.round(m * kornPreis()); money += e; text = `${kg(m)} Korn verkauft (${euro(e)}) – die Silos sind voll`; }
  kornWeg(fz, kornDrin(fz));
  h.status = `📦 Hat ${text}`;
  meldung(`👷 ${h.name} hat ${text}!`, 3);
}
function feldJobUpdate(h, dt) {
  const J = h.job, fz = J.fz, A = HELFER_AUFGABEN[J.aufgabe], lv = helferLevel(h);
  if (!fahrzeuge.includes(fz) || fz === aktiv) { jobEnde(h, '🛑 Das Fahrzeug ist weg!'); return; }
  // Diesel und Saat holt der Helfer automatisch (das kostet Geld!)
  if (fz.diesel < 20) { const k = Math.round((fz.typ.dieselMax - fz.diesel) * DIESEL_PREIS); if (money < k) { jobEnde(h, '💸 Kein Geld für Diesel!'); return; } money -= k; fz.diesel = fz.typ.dieselMax; }
  if (A.saatArt) {
    if (fz.saatArt !== A.saatArt) { money += Math.round(fz.saat * (fz.saatArt === 'mais' ? MAIS_SAAT_PREIS : SAAT_PREIS)); fz.saat = 0; fz.saatArt = A.saatArt; }
    if (fz.saat < SAAT_PRO_ZELLE * 8) { const k = Math.round((fz.typ.saatMax - fz.saat) * (A.saatArt === 'mais' ? MAIS_SAAT_PREIS : SAAT_PREIS)); if (money < k) { jobEnde(h, '💸 Kein Geld für Saat!'); return; } money -= k; fz.saat = fz.typ.saatMax; }
  }
  if (A.geraet === 'ernte' && kornDrin(fz) + ERTRAG_PRO_ZELLE * 12 > kornPlatz(fz)) helferAbliefern(h, fz);
  const wp = J.wege[J.n];
  if (!wp) { jobEnde(h, `✅ Fertig mit Feld ${J.feld.nr + 1}!`, true); return; }
  const p = fz.g.position, dx = wp.x - p.x, dz = wp.z - p.z, d = Math.hypot(dx, dz);
  if (d < 1.6) {
    J.n++;
    if (J.n === J.wege.length - 1) fz.helferFeld = null;   // Auf dem Heimweg nicht mehr arbeiten
    if (!J.fertig && !zuTun(J.feld, A) && wp.a) {           // Alles erledigt? Dann gleich nach Hause
      J.fertig = true;
      J.n = J.wege.findIndex((w, k) => k > J.n && !w.a && w.z === -8);
      if (J.n < 0) J.n = J.wege.length;
    }
    return;
  }
  // Lenken und fahren
  let dw = Math.atan2(-dx, -dz) - fz.g.rotation.y;
  while (dw > Math.PI) dw -= Math.PI * 2;
  while (dw < -Math.PI) dw += Math.PI * 2;
  const amArbeiten = !!wp.a && !J.fertig && J.n > 1;
  const tempo = (amArbeiten ? GERAETE[A.geraet].arbeitsTempo * fz.typ.arbeit * (0.6 + 0.12 * lv) : Math.min(8, fz.typ.tempo)) * begrenzt(Math.cos(dw), 0.3, 1);
  const dreh = (0.9 + 0.1 * lv) * dt;
  fz.g.rotation.y += begrenzt(dw, -dreh, dreh);
  fz.lenkWinkel = begrenzt(dw, -0.55, 0.55);
  fz.g.translateZ(-tempo * dt);
  fz.speed = tempo;
  for (const r of fz.raeder) { r.rad.rotation.x -= tempo * dt / (r.r * fz.typ.groesse); if (r.lenkt) r.lenker.rotation.y = fz.lenkWinkel * r.lenkt; }
  if (fz.geraete[A.geraet] && fz.geraete[A.geraet].userData.haspel) fz.geraete[A.geraet].userData.haspel.rotation.x -= dt * 4;
  fz.diesel = Math.max(0, fz.diesel - dt * 0.08 * fz.typ.groesse);
  // Arbeiten (nur auf dem Ziel-Feld)
  const vorher = zuTun(J.feld, A);
  if (amArbeiten) { stumm = true; try { arbeiten(fz); } finally { stumm = false; } } else fz.arbeitet = false;
  const geschafft = vorher - zuTun(J.feld, A);
  if (geschafft > 0) xpDazu(h, geschafft * 0.5);
  h.status = J.fertig ? `🏠 Fährt zurück zum Parkplatz` : amArbeiten ? `${A.emoji} ${A.name} auf Feld ${J.feld.nr + 1}: ${Math.floor(100 - 100 * zuTun(J.feld, A) / Math.max(1, J.gesamt))} %` : `🚜 Fährt zu Feld ${J.feld.nr + 1}`;
  if (A.geraet === 'maisgebiss' && amArbeiten && !gebaute.some(b => b.fs && !b.fs.zu && !(b.fs.fertig && b.fs.inhalt > 0) && b.fs.inhalt + MAIS_ERTRAG <= FAHRSILO_MAX)) { J.fertig = true; J.n = J.wege.length - 3; meldung(`👷 ${h.name}: Das Silagesilo ist voll! Ich fahre zurück.`, 4); }
}
// ----- Hofarbeit: Der Helfer läuft von Gebäude zu Gebäude und kümmert sich um alles -----
function hofAufgabeSuchen(h) {
  const p = h.figur.g.position, besetzt = helfer.filter(o => o !== h && o.job && o.job.ziel).map(o => o.job.ziel);
  let bestes = null, bestD = Infinity;
  for (const b of gebaute) {
    if (besetzt.includes(b)) continue;
    let was = null;
    if (b.geh && b.geh.lager >= 1) was = 'sammeln';
    else if (b.geh && b.geh.tiere.length && b.geh.futter < FUTTER_MAX * 0.3) was = 'futter';
    else if (b.gh && b.gh.art && b.gh.w >= 1) was = 'gemuese';
    else if (b.obst && b.obst.w >= 1) was = 'obst';
    else if (b.biene && b.biene.lager >= 3) was = 'honig';
    if (!was) continue;
    const d = Math.hypot(b.x - p.x, b.z - p.z);
    if (d < bestD) { bestD = d; bestes = { b, was }; }
  }
  return bestes;
}
function hofArbeitMachen(h, b, was) {
  let text = '';
  if (was === 'sammeln') {
    const T = TIERE[b.geh.tier], P = PRODUKTE[T.produkt], m = Math.floor(b.geh.lager);
    vorrat[T.produkt] = (vorrat[T.produkt] || 0) + m; b.geh.lager -= m; gehegeSchild(b);
    text = `${P.emoji} ${m} ${P.einheit} ${P.name} eingesammelt`;
  } else if (was === 'futter') {
    let m = FUTTER_MAX - b.geh.futter;
    const ausSilo = Math.min(m, hofSilo.inhalt); hofSilo.inhalt -= ausSilo; siloSchild(hofSilo);   // Erst gratis Korn aus dem Hof-Silo
    let gekauft = Math.min(m - ausSilo, Math.floor(money / FUTTER_PREIS));
    money -= Math.round(gekauft * FUTTER_PREIS);
    b.geh.futter += ausSilo + gekauft;
    text = `🌾 ${kg(ausSilo + gekauft)} Futter in den Trog${ausSilo ? ' (aus dem Hof-Silo)' : ''}`;
  } else if (was === 'gemuese') {
    const art = b.gh.art, G = GEMUESE[art];
    vorrat[art] = (vorrat[art] || 0) + G.menge; b.gh.art = null; b.gh.w = 0;
    text = `${G.emoji} ${G.menge} ${G.einheit} ${G.name} geerntet`;
    if (money >= G.kosten) { money -= G.kosten; b.gh.art = art; text += ' und neu gepflanzt'; }
    ghMalen(b);
  } else if (was === 'obst') {
    const O = OBST[b.art];
    vorrat[O.frucht] = (vorrat[O.frucht] || 0) + O.menge; b.obst.w = 0; obstMalen(b);
    text = `${O.emoji} ${O.menge} kg ${O.name} gepflückt`;
  } else if (was === 'honig') {
    const m = Math.floor(b.biene.lager * 10) / 10;
    vorrat.honig = (vorrat.honig || 0) + m; b.biene.lager -= m; bienenSchild(b);
    text = `🍯 ${m.toFixed(1).replace('.', ',')} kg Honig geerntet`;
  }
  gebSenden(b);
  h.status = `✅ Hat ${text}`;
  h.schild.userData.malen(`✅ ${text}`, '#b9f5a0');
  xpDazu(h, 5);
  sound.klick();
}
function hofJobUpdate(h, dt) {
  const J = h.job, fig = h.figur, p = fig.g.position, lv = helferLevel(h);
  if (J.pause > 0) { J.pause -= dt; farmerPose(fig.t, false, false, dt); return; }
  if (!J.ziel || !gebaute.includes(J.ziel)) {
    const a = hofAufgabeSuchen(h);
    if (a) { J.ziel = a.b; J.was = a.was; }
    else { J.ziel = null; }
  }
  const zx = J.ziel ? J.ziel.x : HELFER_HEIM.x + (helfer.indexOf(h) - 1.5) * 1.5, zz = J.ziel ? J.ziel.z : HELFER_HEIM.z;
  const rand = J.ziel ? GEBAEUDE_ARTEN[J.ziel.art].r + 0.8 : 0.3;
  const dx = zx - p.x, dz = zz - p.z, d = Math.hypot(dx, dz);
  if (d > rand) {
    const tempo = (2.5 + 0.5 * lv) * dt;
    p.x += dx / d * Math.min(tempo, d - rand + 0.01); p.z += dz / d * Math.min(tempo, d - rand + 0.01);
    fig.g.rotation.y = Math.atan2(-dx, -dz);
    farmerPose(fig.t, false, true, dt);
    h.status = J.ziel ? `🚶 Geht zum ${GEBAEUDE_ARTEN[J.ziel.art].name}` : '😴 Alles erledigt – wartet beim Hof';
  } else {
    farmerPose(fig.t, false, false, dt);
    if (J.ziel) { hofArbeitMachen(h, J.ziel, J.was); J.ziel = null; J.pause = Math.max(1.5, 9 - 1.5 * lv); }
    else J.pause = 2;
  }
  h.schild.position.set(p.x, 2.6, p.z);
}
function hofJobStarten(h) {
  if (h.job) return;
  const fig = baueFarmer(h.farbe);
  fig.g.position.set(HELFER_HEIM.x + zufall(-2, 2), 0, HELFER_HEIM.z + zufall(-2, 2)); scene.add(fig.g);
  h.figur = fig; h.job = { art: 'hof', ziel: null, was: null, pause: 0 }; h.wahl = null;
  h.schild.visible = true; h.schild.userData.malen(`👷 ${h.name}`, '#ffd166');
  meldung(`👷 ${h.name} kümmert sich jetzt um den Hof: Tiere füttern, Eier und Milch einsammeln, Gemüse, Obst und Honig ernten!`, 4);
  sound.klick(); helferMalen();
}
function jobEnde(h, text, gut = false) {
  const J = h.job;
  if (!J) return;
  if (J.art === 'feld') {
    J.fz.helfer = null; J.fz.helferFeld = null; J.fz.speed = 0; J.fz.arbeitet = false;
    if (h.figur) J.fz.K.remove(h.figur.g);
  } else if (h.figur) scene.remove(h.figur.g);
  h.figur = null; h.job = null; h.schild.visible = false;
  h.status = text;
  meldung(`👷 ${h.name}: ${text}`, 3.5);
  if (gut) sound.kasse();
  helferMalen(); speichern();
}
function helferUpdate(dt) {
  if (mp.aktiv && mp.rolle !== 'host') return;   // Im Multiplayer arbeiten die Helfer nur beim Gastgeber
  for (const h of helfer) {
    if (!h.job) continue;
    // Lohn: jede Minute ein bisschen Geld
    h.lohnZeit += dt;
    if (h.lohnZeit >= 60) { h.lohnZeit -= 60; money -= HELFER_LOHN * helferLevel(h); }
    if (h.job.art === 'feld') feldJobUpdate(h, dt); else hofJobUpdate(h, dt);
  }
  if ($('helferpanel').style.display === 'block') {
    helferTakt -= dt;
    if (helferTakt <= 0) { helferTakt = 0.5; helfer.forEach((h, i) => { const e = document.getElementById('hstat-' + i); if (e) e.textContent = h.status; }); }
  }
}
let helferTakt = 0;
// ----- Das Helfer-Menü (Taste Tab oder Knopf) -----
function helferZeigen(an) {
  $('helferpanel').style.display = an ? 'block' : 'none';
  if (!an) return;
  if (document.pointerLockElement) document.exitPointerLock();
  helferMalen();
}
function helferMalen() {
  if ($('helferpanel').style.display !== 'block') return;
  if (mp.aktiv && mp.rolle !== 'host') { $('helferInhalt').innerHTML = '<p>🌐 Im Multiplayer gibt es die Helfer nur beim Gastgeber.</p>'; return; }
  let html = '';
  helfer.forEach((h, i) => {
    const lv = helferLevel(h), naechste = HELFER_XP[lv], vorige = HELFER_XP[lv - 1];
    const anteil = naechste === undefined ? 100 : Math.floor((h.xp - vorige) / (naechste - vorige) * 100);
    html += `<div class="angebot"><b>👷 ${h.name}</b> · Level ${lv} ${'⭐'.repeat(lv)}<br>
      <div class="balken"><div style="width:${anteil}%;background:#ffd166"></div></div>
      <span class="klein">${naechste === undefined ? '🏆 Höchstes Level!' : `Erfahrung ${Math.floor(h.xp)} / ${naechste}`} · Lohn beim Arbeiten: ${euro(HELFER_LOHN * lv)} pro Minute · Tempo ×${(0.6 + 0.12 * lv).toFixed(2).replace('.', ',')}</span><br>
      <span id="hstat-${i}">${h.status}</span><br>`;
    if (h.job) html += `<button data-a="stopp" data-h="${i}">⏹️ Aufhören</button>`;
    else {
      html += `<button data-a="feld" data-h="${i}" class="${h.wahl === 'feld' ? 'aktiv' : ''}">🚜 Feldarbeit</button><button data-a="hof" data-h="${i}">🐄 Hofarbeit</button><button data-a="weg" data-h="${i}">👋 Entlassen</button>`;
      if (h.wahl === 'feld') {
        html += '<br><span class="klein">Welches Feld?</span><br>';
        for (const f of felder) if (f.gekauft) html += `<button data-a="wf" data-h="${i}" data-f="${f.nr}" class="${h.wahlFeld === f.nr ? 'aktiv' : ''}">Feld ${f.nr + 1}</button>`;
        const f = felder[h.wahlFeld];
        if (f && f.gekauft) {
          html += '<br><span class="klein">Was soll gemacht werden?</span><br>';
          for (const [k, A] of Object.entries(HELFER_AUFGABEN)) { const n = zuTun(f, A); html += `<button data-a="job" data-h="${i}" data-j="${k}" ${n ? '' : 'disabled'}>${A.emoji} ${A.name} (${n})</button>`; }
        }
      }
    }
    html += '</div>';
  });
  if (!helfer.length) html += '<p>Du hast noch keine Helfer. Helfer arbeiten auf dem Feld (pflügen, säen, ernten) oder auf dem Hof (Tiere, Gemüse, Obst, Honig) – und werden mit der Zeit immer besser!</p>';
  if (helfer.length < HELFER_MAX) html += `<button data-a="neu" ${money >= HELFER_PREIS ? '' : 'disabled'}>➕ Helfer einstellen (${euro(HELFER_PREIS)})</button>`;
  html += `<p class="klein">💡 Feld-Helfer nehmen sich ein freies Fahrzeug, kaufen selbst Saat und Diesel und bringen das Korn ins Silo. Häckseln geht nur mit Häcksler + Silagesilo.</p>`;
  $('helferInhalt').innerHTML = html;
}
document.getElementById('helferInhalt').addEventListener('click', e => {
  const k = e.target.closest('button');
  if (!k) return;
  const h = helfer[Number(k.dataset.h)], a = k.dataset.a;
  if (a === 'neu') helferEinstellen();
  else if (!h) return;
  else if (a === 'stopp') jobEnde(h, '⏹️ Hat aufgehört.');
  else if (a === 'feld') { h.wahl = h.wahl === 'feld' ? null : 'feld'; if (h.wahlFeld === null) h.wahlFeld = felder.find(f => f.gekauft).nr; }
  else if (a === 'wf') h.wahlFeld = Number(k.dataset.f);
  else if (a === 'job') feldJobStarten(h, h.wahlFeld, k.dataset.j);
  else if (a === 'hof') hofJobStarten(h);
  else if (a === 'weg') { if (confirm(`${h.name} wirklich entlassen?`)) { helfer.splice(helfer.indexOf(h), 1); scene.remove(h.schild); meldung(`👋 Tschüss, ${h.name}!`); speichern(); } }
  helferMalen();
  k.blur();
});
document.getElementById('btn-helfer').addEventListener('click', e => { helferZeigen($('helferpanel').style.display !== 'block'); e.currentTarget.blur(); });
document.getElementById('helfer-zu').addEventListener('click', () => helferZeigen(false));

// ===== Los geht's! =====
const geladen = laden();
jahreszeitZeigen();
angebotNeu();
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
