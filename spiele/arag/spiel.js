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
// ===== Blitzlampe (Taste F): Ein superheller Blitz, der Monster blendet =====
const BLITZ_WEITE = 11;         // So weit reicht der Blitz (in Metern)
const BLITZ_WINKEL = 0.6;       // So breit ist der Blitz (größer = breiter)
const BLITZ_BETAEUBT = 4;       // So viele Sekunden sind geblendete Monster betäubt
const BLITZ_LADEN = 10;         // So viele Sekunden braucht die Blitzlampe zum Aufladen
// ===== Die Helfer-Bots haben auch eine Blitzlampe 📸 =====
const HELFER_BLITZ = true;       // false = Die Helfer blitzen nicht
const HELFER_BLITZ_WEITE = 7;    // So nah muss ein jagendes Monster sein, damit ein Helfer blitzt (Meter)
const HELFER_BLITZ_LADEN = 15;   // So viele Sekunden braucht die Blitzlampe eines Helfers zum Aufladen
// ===== Taschenlampen der anderen (Mitspieler und Helfer) 🔦 =====
const ANDERE_LAMPEN = true;      // false = Die anderen haben keine Taschenlampe
const ANDERE_LICHTER = 3;        // So viele von ihnen machen ECHTES Licht (die nächsten). Mehr = schöner, aber langsamer!
const LICHTKEGEL_LAENGE = 7;     // So lang ist der sichtbare Lichtstrahl (Meter)
const DUCK_SICHT = 0.55;         // Geduckt sehen dich Monster nur aus so viel der normalen Entfernung
const MAX_LAMPEN = 14;
const MONSTER_START_ABSTAND = 3;   // So viele Räume (Türen) weit weg vom Start tauchen Monster auf           // So viele Lichter gibt es höchstens (mehr wird langsam)

// Die Treppe steht in einem Raum an der Nordwand (Werte in Metern vom Raum-Rand)
const TREPPE = { von: 1.2, bis: 8.4, z1: 0.3, z2: 1.9 };     // Die Rampe mit den Stufen
const GELAENDER_AB = 2.2;         // Ab so vielen Metern nach dem Treppen-Anfang kommt das Geländer (unten ist es offen)
const LOCH = { x1: 1.0, x2: 8.4, z1: 0.15, z2: 2.0 };          // Das Loch in der Decke darüber
// 🐭 Mauselöcher: kleine Löcher unten in den Wänden. Geduckt (C) passt du durch – Monster und Helfer sind zu groß!
const MAUSELOCH_ANZAHL = 4;      // So viele Mauselöcher pro Stockwerk
const MAUSELOCH = { breit: 0.72, hoch: 0.62 };   // So groß ist ein Mauseloch (geduckt bist du 0.56 groß)
// 🕳️ Bodenlöcher: Oben fällst du ein Stockwerk tiefer, im Erdgeschoss landest du in einer Grube (rausspringen!)
const BODENLOCH_ANZAHL = 2;      // So viele Bodenlöcher pro Stockwerk
const BODENLOCH = 1.6;           // So groß ist ein Bodenloch (in Metern)
const GRUBE_TIEFE = 0.8;         // So tief ist eine Grube im Erdgeschoss
// 🚪 Türen: Mit E auf- und zumachen. Helfer machen sie selbst auf, Monster brechen sie auf (dauert kurz!)
const TUER_OFFEN_ANTEIL = 0.5;   // So viele Türen sind am Anfang offen (0.5 = die Hälfte)
const TUER_AUFBRECHEN = 0.8;     // So viele Sekunden braucht ein Monster, um eine zue Tür aufzubrechen
// 🌲 Draußen: ein dunkler Wald rund ums Haus, mit einem Zaun außen herum
const WALD_RAND = 22;            // So viele Meter Wald gibt es auf jeder Seite vom Haus
const BAUM_ANZAHL = 170;         // So viele Bäume stehen im Wald
const WALD_SCHAETZE = 8;         // So viele Schätze liegen am Anfang draußen im Wald
const GARTENHAUS_ANZAHL = 3;     // 🛖 So viele Gartenhäuschen stehen im Wald (mit wertvollen Schätzen drin!)
const GARTENHAUS_SCHAETZE = 2;   // So viele wertvolle Schätze liegen in jedem Gartenhäuschen
const GRAS_ANZAHL = 7000;        // 🌱 So viele Grasbüschel wachsen draußen (weniger = schneller)
const BLUMEN_WIESEN = 45;        // 🌼 So viele kleine Blumenwiesen gibt es im Wald
const BLUMEN_EINZELN = 300;      // ... und so viele Blumen wachsen einzeln irgendwo
const BLUMEN_FARBEN = ['#ffffff', '#fff3a0', '#ffd23f', '#e8323c', '#4f7dff', '#9b5cff', '#ff8ad8'];   // Margerite, Butterblume, Löwenzahn, Mohn, Kornblume, Glockenblume, Rosa
const WALD_NEU_ANTEIL = 0.25;    // So oft taucht ein neuer Schatz draußen auf statt im Haus (0.25 = jeder vierte)
const MONSTER_DRAUSSEN = true;   // true = Monster folgen dir nach draußen · false = sie bleiben im Haus und warten an der Tür
// ===== 🧪 Der Keller (unter dem Haus) – da wohnt der verrückte Chemiker! =====
const KELLER_AN = true;          // false = kein Keller (und kein Chemiker)
const KELLER = { i: 1, j: 0, breit: 4, tief: 3 };   // Wo der Keller liegt: Spalte i, Reihe j (wie bei den Sälen) · 4 × 3 Räume = 40 × 30 Meter
const KELLER_SCHAETZE = 10;      // So viele Schätze liegen am Anfang im Keller (in den Sackgassen vom Labyrinth!)
const LABYRINTH_ZELLE = 2.5;     // 🌀 So breit sind die Gänge im Labyrinth (Meter)
const LABYRINTH_ABKUERZUNGEN = 0.1;   // So oft gibt es extra Durchgänge (0 = nur ein einziger Weg überall hin, 0.3 = sehr viele Wege)
// ===== 🚌 Der ARAG-Einsatzbus: Intro, Lobby im Bus, und die Abgabe draußen auf dem Parkplatz =====
const INTRO_AN = true;           // false = kein Intro
const INTRO_DAUER = 14;          // So lange dauert das Intro (Sekunden) – Klick oder Leertaste überspringt es
const LOBBY_AN = true;           // false = keine Lobby (du stehst gleich draußen vor dem Bus)
// ===== 🎙️ Voice-Chat (nur im Mehrspieler) – von Papa erlaubt =====
const VOICE_AN = true;           // false = gar kein Voice-Chat
const VOICE_TASTE = 'v';         // Diese Taste GEDRÜCKT HALTEN = sprechen (sonst ist dein Mikro aus)
const VOICE_WEITE = 20;          // So weit hört man die anderen (Meter) – je näher, desto lauter
const VOICE_WAND_DUMPF = true;   // true = Durch Wände klingt die Stimme dumpf
const BUS_TEMPO = 14;            // So schnell fährt der Bus in der Lobby (Meter pro Sekunde – 14 sind etwa 50 km/h)
const LOBBY_ORT = { x: -400, z: 0 };   // Hier fährt der Lobby-Bus (weit weg vom Haus, damit man es nicht sieht)
const TRANK_RADIUS = 1.8;        // So weit spritzt ein Trank, wenn er zerplatzt (Meter)
// Die Tränke vom Chemiker: schaden = so viel Energie kostet ein Treffer · pfuetze = so viele Sekunden bleibt eine Pfütze liegen
//   gift = so viel Energie pro Sekunde in der Giftwolke · langsam = so schnell bist du im Schleim noch (0.35 = ein Drittel)
//   nebel = so viele Sekunden siehst du fast nichts · schubs = so weit fliegst du weg
const TRAENKE = {
  gift:    { name: 'Gifttrank',    emoji: '🟢', farbe: '#5dff4a', schaden: 10, pfuetze: 5, gift: 8 },
  schleim: { name: 'Klebeschleim', emoji: '🟣', farbe: '#c04dff', schaden: 5,  pfuetze: 7, langsam: 0.35 },
  nebel:   { name: 'Nebeltrank',   emoji: '🔵', farbe: '#4dc3ff', schaden: 5,  nebel: 5 },
  knall:   { name: 'Knalltrank',   emoji: '🟠', farbe: '#ff8a3d', schaden: 18, schubs: 13 },
};

// ===== Die Helfer-Bots =====
const HELFER_ANZAHL = 2;         // So viele Kollegen helfen dir (0 bis 3)
const HELFER = [
  { name: 'Bolzen', farbe: '#ffb347', stimme: 0.75 },   // stimme: wie hoch sie piepsen (1 = normal, kleiner = tiefer)
  { name: 'Funke', farbe: '#ff6fb5', stimme: 1.2 },
  { name: 'Schraubi', farbe: '#6fa8ff', stimme: 0.95 },
];
const HELFER_TEMPO = 3.2;        // So schnell fahren die Helfer
const HELFER_TRAGE_TEMPO = 2.2;  // ... und so schnell, wenn sie was tragen
const BEIN_LAENGE = 0.3;         // So weit fahren die Roboter-Beine aus (0 = keine Beine)
const HELFER_PAUSE = 8;          // So lange ist ein Helfer kaputt, wenn er kein Leben mehr hat (nur wenn HELFER_SOFORT_ZURUECK = false)
const HELFER_SOFORT_ZURUECK = true;   // true = Ein kaputter Helfer taucht SOFORT wieder am Start auf (mit vollen Leben) – nur wenn HELFER_KOPF = false
const BOT_BAUCH = 0.5;          // 🤖 So dick ist der Bauch der Roboter (1 = so dick wie früher, 0.5 = ganz schlank)
const HELFER_KOPF = true;        // 💀 true = Ein kaputter Helfer verliert seinen KOPF – bringt ihn zur Abgabe, dann ist er wieder da!
const HELFER_WIEDERBELEBEN_PREIS = 500;   // So viel kostet es, einen Helfer-Bot wiederzubeleben
const HEIL_PRO_SEKUNDE = 15;     // 🔧 So viel Energie bekommst du pro Sekunde an der Reparatur-Station im Bus zurück
const SCHROTT_ZEIT = 6;          // 💀 Sind ALLE Roboter Schrott (Spieler und Helfer), ist das Spiel aus – nach so vielen Sekunden geht's zurück in die Lobby
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
  blitz: ['Bitte lächeln! 📸', 'Augen zu! 📸', 'Nimm das! 📸', 'Cheese! 📸', 'BLITZ! 📸'],
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
  // Neue Schätze:
  { id: 'teddy',    name: 'Teddybär',      emoji: '🧸', wert: [80, 160],    zerbrechlich: 0.05, masse: 0.8, groesse: [0.35, 0.42, 0.28], haeufig: 2.5 },   // Fast unkaputtbar – aber billig
  { id: 'sanduhr',  name: 'Sanduhr',       emoji: '⏳', wert: [200, 400],   zerbrechlich: 1.1,  masse: 1.5, groesse: [0.2, 0.35, 0.2],   haeufig: 1.8 },
  { id: 'kerze',    name: 'Kerzenleuchter', emoji: '🕯️', wert: [300, 550],  zerbrechlich: 0.4,  masse: 2.5, groesse: [0.36, 0.5, 0.12],  haeufig: 2 },
  { id: 'spieluhr', name: 'Spieluhr',      emoji: '🎶', wert: [400, 700],   zerbrechlich: 1.2,  masse: 1,   groesse: [0.3, 0.32, 0.22],  haeufig: 1.5 },
  { id: 'geige',    name: 'Geige',         emoji: '🎻', wert: [500, 900],   zerbrechlich: 1.3,  masse: 1,   groesse: [0.22, 0.6, 0.08],  haeufig: 1.2 },
  { id: 'grammophon', name: 'Grammophon',  emoji: '📯', wert: [700, 1100],  zerbrechlich: 0.9,  masse: 6,   groesse: [0.45, 0.62, 0.45], haeufig: 1 },
  { id: 'goldbarren', name: 'Goldbarren',  emoji: '🪙', wert: [900, 1300],  zerbrechlich: 0.1,  masse: 8,   groesse: [0.3, 0.1, 0.15],   haeufig: 0.7 },   // Klein, aber schwer!
  { id: 'ei',       name: 'Juwelen-Ei',    emoji: '🥚', wert: [1400, 2000], zerbrechlich: 1.8,  masse: 0.8, groesse: [0.2, 0.28, 0.2],   haeufig: 0.35 },
  { id: 'krone',    name: 'Königskrone',   emoji: '👑', wert: [1600, 2400], zerbrechlich: 0.7,  masse: 2,   groesse: [0.3, 0.26, 0.3],   haeufig: 0.4 },
  { id: 'diamant',  name: 'Riesendiamant', emoji: '💎', wert: [2500, 3500], zerbrechlich: 2.0,  masse: 0.5, groesse: [0.2, 0.2, 0.2],    haeufig: 0.25, rund: true },   // Super zerbrechlich!
  // Noch wertvollere Schätze (die gibt es vor allem in den Gartenhäuschen!):
  { id: 'perlen',   name: 'Perlenkette',   emoji: '📿', wert: [1500, 2200], zerbrechlich: 0.4,  masse: 0.4, groesse: [0.3, 0.06, 0.3],   haeufig: 0.4 },
  { id: 'smaragd',  name: 'Smaragd',       emoji: '💚', wert: [1800, 2600], zerbrechlich: 1.5,  masse: 0.6, groesse: [0.18, 0.16, 0.18], haeufig: 0.3 },
  { id: 'rubin',    name: 'Riesenrubin',   emoji: '❤️', wert: [2200, 3200], zerbrechlich: 1.6,  masse: 0.5, groesse: [0.18, 0.22, 0.18], haeufig: 0.25 },
  { id: 'zepter',   name: 'Königszepter',  emoji: '🪄', wert: [2400, 3200], zerbrechlich: 0.5,  masse: 2,   groesse: [0.12, 0.75, 0.12], haeufig: 0.25 },
  { id: 'schaedel', name: 'Kristallschädel', emoji: '💀', wert: [2800, 4000], zerbrechlich: 1.7, masse: 2,  groesse: [0.24, 0.28, 0.3],  haeufig: 0.18 },
  { id: 'statue',   name: 'Goldene Statue', emoji: '🗽', wert: [3500, 4800], zerbrechlich: 0.2, masse: 22,  groesse: [0.4, 0.9, 0.4],    haeufig: 0.15, boden: true },   // Schwer!
  { id: 'goldkiste', name: 'Kiste voller Gold', emoji: '💰', wert: [4500, 6500], zerbrechlich: 0.25, masse: 28, groesse: [0.7, 0.5, 0.45], haeufig: 0.1, boden: true },   // Das Wertvollste von allem!
  // 📚 Schul-Schätze (die gibt es nur in der verfluchten Schule – schule: true):
  { id: 'mikroskop', name: 'Mikroskop',     emoji: '🔬', wert: [500, 900],   zerbrechlich: 1.2, masse: 3,   groesse: [0.25, 0.45, 0.3],  haeufig: 2, schule: true },
  { id: 'skelett',  name: 'Lern-Skelett',   emoji: '💀', wert: [900, 1400],  zerbrechlich: 0.8, masse: 12,  groesse: [0.45, 1.6, 0.3],   haeufig: 0.6, schule: true, boden: true },   // Groß!
  { id: 'schulglocke', name: 'Schulglocke', emoji: '🔔', wert: [400, 700],   zerbrechlich: 0.3, masse: 4,   groesse: [0.3, 0.34, 0.3],   haeufig: 1.5, schule: true },
  { id: 'medaille', name: 'Sport-Medaille', emoji: '🏅', wert: [300, 600],   zerbrechlich: 0.1, masse: 0.5, groesse: [0.2, 0.25, 0.04],  haeufig: 2.5, schule: true },
  { id: 'abakus',   name: 'Goldener Abakus', emoji: '🧮', wert: [700, 1100], zerbrechlich: 0.7, masse: 2,   groesse: [0.45, 0.35, 0.08], haeufig: 1.5, schule: true },
  { id: 'aquarium', name: 'Klassen-Aquarium', emoji: '🐠', wert: [800, 1200], zerbrechlich: 2.0, masse: 10, groesse: [0.6, 0.4, 0.35],  haeufig: 0.7, schule: true, boden: true },   // Super zerbrechlich!
  { id: 'schuluhr', name: 'Schuluhr',       emoji: '🕐', wert: [250, 450],   zerbrechlich: 1.0, masse: 1.5, groesse: [0.35, 0.35, 0.08], haeufig: 2, schule: true },
  { id: 'klassenbuch', name: 'Das verfluchte Klassenbuch', emoji: '📕', wert: [1800, 2800], zerbrechlich: 0.3, masse: 1, groesse: [0.3, 0.06, 0.22], haeufig: 0.35, schule: true },
];
const VILLA_SCHAETZE = SCHAETZE.filter(t => !t.schule);   // In der Spukvilla gibt es keine Schul-Schätze
const WERTVOLL_AB = 1400;   // Schätze, die mindestens so viel wert sind, gelten als "wertvoll" (die liegen in den Gartenhäuschen)

// ===== Die große Spukvilla (immer dieselbe Karte – keine Level mehr!) =====
const KARTE = {
  breit: 6, tief: 4, etagen: 3,   // 6 × 4 Räume, 3 Stockwerke = 72 Räume!
  startzahl: 20261114,            // Damit das Haus jedes Mal genau gleich gebaut wird (andere Zahl = anderes Haus)
};
// Große Säle: Zwischen diesen Räumen gibt es keine Wände – sie werden zu einem riesigen Saal!
//   etage: 0 = Erdgeschoss, 1 = 1. Stock, 2 = 2. Stock · i/j: Spalte/Reihe vom ersten Raum (0 = ganz links/ganz vorne)
//   breit/tief: wie viele Räume nebeneinander/hintereinander · frei: true = die Mitte bleibt frei (keine Möbel)
//   (Die Abgabe ist im Raum i: 0, j: 2 im Erdgeschoss – darum ist der Eingangssaal dort)
const SAELE = [
  { id: 'eingang', name: 'Eingangssaal', emoji: '🏛️', etage: 0, i: 0, j: 1, breit: 2, tief: 2, frei: true,
    boden: 'fliesen', ecken: ['standuhr', 'sessel', 'kamin', 'regal'], teppich: true, kronleuchter: true },
  { id: 'ballsaal', name: 'Ballsaal', emoji: '💃', etage: 0, i: 3, j: 1, breit: 2, tief: 2, frei: true,
    boden: 'holz', ecken: ['standuhr', 'sessel', 'anrichte', 'kamin'], kronleuchter: true },
  { id: 'bibliothek', name: 'Riesen-Bibliothek', emoji: '📚', etage: 1, i: 2, j: 0, breit: 3, tief: 1, frei: false,
    boden: 'holz', ecken: ['regal', 'regal', 'regal', 'lesen'], teppich: true },
];
const OFFEN = RAUM;   // "Tür" so breit wie die ganze Wand = keine Wand
const saalVon = (i, j, e) => SAELE.find(S => S.etage === e && i >= S.i && i < S.i + S.breit && j >= S.j && j < S.j + S.tief) || null;
// Jedes Monster gibt es genau EINMAL im Haus
const MONSTER_ANZAHL = { geister: 1, lauscher: 1, starrer: 0, jaeger: 1, schrank: 1, formwandler: 1, oma: 1, maulwurf: 1, chemiker: 1 };   // Starrer: 0 = gibt es nicht mehr
const WIEDERBELEBEN_PREIS = 1500;   // So viel kostet es, einen kaputten Roboter wiederzubeleben (Kopf zur Abgabe bringen!)
const GEWINN_PROZENT = 62;           // 🏆 Gewonnen, wenn so viel Prozent aller Schätze im Haus verkauft sind – und ALLE Spieler leben!
const NEUER_SCHATZ_ALLE = 30;       // Alle so viele Sekunden taucht irgendwo im Haus ein neuer Schatz auf
const ABGABE_ZEIT = 0.8;            // So lange muss ein Schatz in der Abgabe liegen, bis er verkauft ist
function levelDaten() {
  return { breit: KARTE.breit, tief: KARTE.tief, etagen: KARTE.etagen, ziel: 0, ...MONSTER_ANZAHL };
}
// Der Kopf eines kaputten Roboters (wird wie ein Schatz getragen – aber er ist unzerbrechlich und wertlos)
const KOPF_TYP = { id: 'kopf', name: 'Roboter-Kopf', emoji: '🤖', wert: [0, 0], zerbrechlich: 0, masse: 1.5, groesse: [0.44, 0.4, 0.44], haeufig: 0 };

// ===== Hilfsfunktionen =====
// Zufall: Normalerweise echter Zufall. Beim Haus-Bauen aber "Zufall mit Startzahl" (Seed):
// Gleiche Startzahl = gleiches Haus. So bekommen im Multiplayer alle genau dasselbe Haus!
let zufallsQuelle = Math.random;
const rnd = () => zufallsQuelle();
function mitStartzahl(zahl, machWas) {
  let a = zahl | 0;
  zufallsQuelle = () => {   // "Mulberry32" – ein kleiner Zufallsgenerator
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  try { machWas(); } finally { zufallsQuelle = Math.random; }
}
const zufall = (a, b) => a + rnd() * (b - a);
const zufallGanz = (a, b) => Math.floor(zufall(a, b + 1));
const auswahl = arr => arr[Math.floor(rnd() * arr.length)];
const begrenzt = (v, a, b) => Math.max(a, Math.min(b, v));
const abstand2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const abstand3D = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 2, a.z - b.z);   // Höhe zählt doppelt (anderes Stockwerk = weit weg)
const mischen = arr => arr.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const ETAGEN_NAMEN = ['Erdgeschoss', '1. Stock', '2. Stock'];
function gewichtetWaehlen(liste) {
  let summe = 0;
  for (const t of liste) summe += t.haeufig;
  let r = rnd() * summe;
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
function ton(hoehe, start, dauer, klang = 'square', laut = 0.1, hoeheEnde = null, ziel = null) {
  try {
    if (!audio || !tonAn || laut <= 0.001) return;
    const t = audio.currentTime + start;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = klang;
    o.frequency.setValueAtTime(hoehe, t);
    if (hoeheEnde) o.frequency.exponentialRampToValueAtTime(hoeheEnde, t + dauer);
    g.gain.setValueAtTime(laut, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
    o.connect(g).connect(ziel || audio.destination);
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
  blitz(laut = 1) { ton(2400, 0, 0.25, 'sine', 0.1 * laut, 600); rauschen(0, 0.2, 0.25 * laut, 'highpass', 3000); ton(4000, 0.25, 0.8, 'sine', 0.03 * laut, 3000); },   // PFFT! ... iiiiiii
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
  lehrer(laut, jagt) {   // 👨‍🏫 Schwere, steife Schritte (tock ... tock) – beim Jagen: Glocke und quietschende Kreide
    if (!LEHRER_HUEPFT) { ton(110, 0, 0.08, 'triangle', 0.09 * laut, 80); ton(104, 0.5, 0.08, 'triangle', 0.08 * laut, 75); }   // (Beim Hüpfen macht die Landung WUMM)
    if (jagt) { monsterSound.lehrerGlocke(laut * 0.7); if (Math.random() < 0.5) ton(2600, 0.3, 0.25, 'sine', 0.025 * laut, 3400); }
  },
  lehrerLandet(laut) {   // WUMM! (er landet nach einem Hüpfer)
    if (laut <= 0.02) return;
    ton(70, 0, 0.18, 'sine', 0.16 * laut, 40); rauschen(0, 0.12, 0.08 * laut, 'lowpass', 300);
  },
  lehrerGlocke(laut) {   // RRRING! Die Handglocke
    for (let k = 0; k < 6; k++) { ton(1320, k * 0.07, 0.25, 'triangle', 0.05 * laut, 1300); ton(1980, k * 0.07, 0.18, 'sine', 0.03 * laut); }
  },
  chemiker(laut, jagt) {   // 🐷 Grunz, grunz ... (und beim Jagen ein irres Oink-Lachen)
    monsterSound.grunzen(laut, 0); if (Math.random() < 0.6) monsterSound.grunzen(laut * 0.8, 0.3);
    if (jagt) monsterSound.chemikerLacht(laut * 0.7);
  },
  grunzen(laut, start) {   // Ein Schweine-Grunzer: tiefes, raues Brummen + Schnauben
    const h = zufall(95, 130);
    ton(h, start, 0.22, 'sawtooth', 0.12 * laut, h * 0.7); ton(h * 1.5, start, 0.2, 'square', 0.03 * laut, h);
    rauschen(start, 0.2, 0.12 * laut, 'bandpass', 600, null, 300);
  },
  chemikerLacht(laut) {   // OINK-HAHAHA! (ein quiekendes Lachen)
    ton(700, 0, 0.18, 'sawtooth', 0.07 * laut, 1100); ton(1050, 0, 0.18, 'square', 0.025 * laut, 1500);   // Quiiiek!
    for (let k = 0; k < 6; k++) { const h = 560 - k * 35 + (k % 2) * 110; ton(h, 0.22 + k * 0.1, 0.07, 'sawtooth', 0.05 * laut, h * 0.75); }
    monsterSound.grunzen(laut, 0.85);
  },
  trankWurf(laut) { rauschen(0, 0.3, 0.12 * laut, 'bandpass', 1500, null, 500); },   // Wusch!
  trankPlatsch(laut) { sound.glas(laut); rauschen(0.02, 0.6, 0.25 * laut, 'highpass', 2500, null, 6000); ton(160, 0, 0.2, 'sine', 0.2 * laut, 60); },   // KLIRR! Zischhh ...
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
  jaeger(laut, jagt) {
    if (jagt) {   // 🤠 Irres Lachen: HEHEHEHAHA!
      for (let k = 0; k < 6; k++) gruselTon(zufall(380, 480) * (1 - k * 0.06), k * 0.11, 0.1, 'square', 0.05 * laut, null, 25);
      for (let k = 0; k < 6; k++) rauschen(k * 0.11, 0.08, 0.04 * laut, 'bandpass', 1500);
    } else {      // Er pfeift ein schiefes Liedchen ...
      const lied = [0, 4, 7, 4, 9, 7];
      lied.forEach((n, k) => gruselTon(halbton(n, 880), k * 0.18, 0.16, 'sine', 0.05 * laut, null, 5));
    }
  },
  klickKlack(laut) {   // Durchladen: KLICK-KLACK!
    rauschen(0, 0.05, 0.35 * laut, 'highpass', 2500);
    ton(900, 0, 0.04, 'square', 0.08 * laut);
    rauschen(0.18, 0.06, 0.45 * laut, 'highpass', 1800);
    ton(600, 0.18, 0.05, 'square', 0.1 * laut);
  },
  schuss(laut) {   // KA-WUMM!
    rauschen(0, 0.5, 0.9 * laut, 'lowpass', 4000, null, 200);
    ton(110, 0, 0.35, 'sine', 0.7 * laut, 35);
    rauschen(0.05, 1.2, 0.15 * laut, 'bandpass', 600, null, 150);   // Echo im Haus
  },
  schrank(laut, jagt) {   // 👹 Knarzende Schranktür – und beim Jagen: RUMS, RUMS (schwere Holzfüße)
    if (jagt) { ton(65, 0, 0.18, 'sine', 0.5 * laut, 40); rauschen(0, 0.12, 0.25 * laut, 'lowpass', 900); }
    else { gruselTon(190, 0, 0.8, 'sawtooth', 0.05 * laut, 150, 25); rauschen(0, 0.8, 0.05 * laut, 'bandpass', 1200, null, 900); }
  },
  formwandler(laut, jagt) {   // 👾 Getarnt: kaputtes Piepsen (Hinweis!) · Jagd: metallisches Kreischen und Stampfen
    if (jagt) { gruselTon(700, 0, 0.5, 'sawtooth', 0.07 * laut, 300, 30); ton(120, 0, 0.12, 'square', 0.15 * laut, 60); }
    else { for (let k = 0; k < 4; k++) ton(400 + Math.random() * 900, k * 0.07, 0.05, 'square', 0.04 * laut); rauschen(0.3, 0.12, 0.08 * laut, 'highpass', 3000); }
  },
  formwandlerGlitch(laut) {   // BZZZRT – die Tarnung fällt!
    rauschen(0, 0.6, 0.35 * laut, 'highpass', 2500, null, 400);
    gruselTon(1200, 0, 0.7, 'square', 0.1 * laut, 80, 40);
  },
  schrankWach(laut) {   // KNAAARZ + Türen rütteln: Gleich springt er raus!
    gruselTon(140, 0, 0.9, 'sawtooth', 0.12 * laut, 260, 40);
    for (let k = 0; k < 6; k++) ton(300 + Math.random() * 200, k * 0.13, 0.05, 'square', 0.06 * laut);
  },
  oma(laut, jagt) {   // 👵 Gehstock: tock ... tock ... und ein Gemurmel · Jagd: schnelles TOCK-TOCK-TOCK und Keifen
    ton(jagt ? 1000 : 850, 0, 0.04, 'square', 0.12 * laut); rauschen(0, 0.05, 0.2 * laut, 'highpass', 2000);
    if (jagt) { if (Math.random() < 0.35) gruselTon(700, 0.05, 0.35, 'sawtooth', 0.07 * laut, 1100, 18); }
    else if (Math.random() < 0.4) gruselTon(210, 0.1, 0.9, 'triangle', 0.05 * laut, 170, 9);   // Mmmm-mmm-mmm ...
  },
  maulwurf(laut, jagt) {   // 🐾 Unter der Erde: Grummeln und Bröseln · Bei der Jagd: schnelles Wühlen
    rauschen(0, jagt ? 0.35 : 0.6, (jagt ? 0.3 : 0.15) * laut, 'lowpass', jagt ? 500 : 300);
    ton(45 + Math.random() * 15, 0, 0.3, 'sawtooth', 0.06 * laut, 35);
    if (Math.random() < 0.2) gruselTon(1300, 0.1, 0.2, 'triangle', 0.04 * laut, 1700, 30);   // Quiek!
  },
  maulwurfRaus(laut) {   // RUMMMS – der Boden bricht auf!
    rauschen(0, 1.0, 0.7 * laut, 'lowpass', 900, null, 200);
    ton(60, 0, 0.8, 'sine', 0.8 * laut, 30);
    gruselTon(300, 0.5, 0.6, 'sawtooth', 0.1 * laut, 120, 25);
  },
  omaGrummel(laut) {   // HMPF?! Was guckst du so?!
    gruselTon(160, 0, 0.45, 'sawtooth', 0.1 * laut, 320, 14);
    gruselTon(330, 0.45, 0.35, 'sawtooth', 0.08 * laut, 260, 14);
  },
  bonk() {   // 🦯 BONK! Der Gehstock trifft
    ton(520, 0, 0.12, 'square', 0.35, 180); ton(90, 0, 0.3, 'sine', 0.6, 40);
    rauschen(0, 0.08, 0.5, 'bandpass', 1500);
    for (let k = 0; k < 3; k++) ton(1800 + k * 400, 0.15 + k * 0.08, 0.1, 'sine', 0.06);   // Sternchen sehen ...
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
  if (m.art === 'formwandler') {
    if (m.modus === 'verwandeln' && !m.warnTon) { m.warnTon = true; monsterSound.formwandlerGlitch(Math.max(0.5, monsterLautstaerke(m))); }
    if (m.modus !== 'verwandeln') m.warnTon = false;
  }
  if (m.art === 'maulwurf') {   // Der Boden bebt! – Warnung kurz bevor er rausbricht (hört man immer)
    if (m.modus === 'auftauchen' && !m.warnTon) {
      m.warnTon = true; const laut = Math.max(0.5, monsterLautstaerke(m));
      monsterSound.maulwurfRaus(laut);
      if (abstand2D(m.x, m.z, spielerKoerper.position.x, spielerKoerper.position.z) < 8) wackeln = Math.max(wackeln, 0.8);
    }
    if (m.modus !== 'auftauchen') m.warnTon = false;
  }
  if (m.art === 'oma') {   // Hmpf?! – Warnung, wenn jemand sie anschaut
    if (m.modus === 'grummeln' && !m.warnTon) {
      m.warnTon = true; monsterSound.omaGrummel(Math.max(0.5, monsterLautstaerke(m)));
      if (!tot && ichSchaueHin(m, m.info.sichtWeite)) zeigeNachricht('👵 HMPF?! Was guckst du so?! SCHAU WEG!', 2, '#ffb36b');
    }
    if (m.modus !== 'grummeln') m.warnTon = false;
  }
  if (m.art === 'schrank') {   // Warnung: Das hört man immer (auch etwas weiter weg), damit du eine Chance hast
    if (m.modus === 'warnen' && !m.warnTon) { m.warnTon = true; monsterSound.schrankWach(Math.max(0.5, monsterLautstaerke(m))); }
    if (m.modus !== 'warnen') m.warnTon = false;
  }
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
  else if (m.art === 'jaeger') m.geraeuschZeit = jagt ? zufall(2.5, 4) : zufall(4, 7);
  else if (m.art === 'schrank') m.geraeuschZeit = jagt ? zufall(0.35, 0.5) : zufall(5, 9);
  else if (m.art === 'maulwurf') m.geraeuschZeit = jagt ? zufall(0.3, 0.45) : zufall(1.2, 2);
  else if (m.art === 'oma') { m.geraeuschZeit = jagt ? zufall(0.25, 0.35) : zufall(0.9, 1.3); if (!m.laeuft && !jagt) return; }   // Steht sie, klopft der Stock nicht
  else if (m.art === 'lehrer') m.geraeuschZeit = jagt ? zufall(1.6, 2.2) : zufall(1.0, 1.3);   // Regelmäßige Schritte
  else if (m.art === 'formwandler') { m.geraeuschZeit = jagt ? zufall(0.6, 1) : zufall(7, 13); if (m.modus === 'tarnSchatz' || m.modus === 'abhauen') return; }   // Als Schatz ist er still
  else m.geraeuschZeit = jagt ? zufall(0.7, 1) : zufall(2.5, 4.5);
  if (laut > 0) monsterSound[m.art](laut, jagt);
}

// ===== Verfolgungs-Musik =====
// Wenn ein Monster dich jagt, startet Musik – und JEDES Monster hat sein eigenes Lied!
// Ist die Gefahr vorbei, wird sie leiser. Die Musik wird mit Web Audio "live" gespielt, ganz ohne Musikdatei.
const MUSIK_AN = true;       // false = keine Verfolgungs-Musik
const MUSIK_LAUT = 0.5;      // Wie laut die Musik ist
// So funktionieren die Lieder:
//   tempo:     Schläge pro Minute (höher = hektischer)
//   riff:      Gitarren-Noten, eine Zahl pro Sechzehntel. Halbtöne über dem Grundton (6 = Teufelston!). null = Pause
//   kick:      Bassdrum, 1 = Bum, 0 = nichts
//   snare:     An welchen Stellen im Takt (0 bis 15) die Snare KRACHT
//   becken:    'achtel', 'sechzehntel', 'tick' (Uhr-Ticken) oder 'glocke' (Geisterglöckchen)
//   melodie:   Hohe Noten, eine pro halben Takt (null = Pause)
//   verzerrung: Wie dreckig die Gitarre klingt (0 = sauber, 100 = ganz kaputt)
//   takt:      (Wenn nicht 16) So viele Sechzehntel hat ein Takt – 12 ist ein Walzer (3/4-Takt)
//   stimme:    Eine ganze Melodie, eine Zahl pro Sechzehntel (statt "melodie") – siehe walzerNoten
const NOTEN_NAMEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };   // Halbtöne ab C
function notenZahl(name) {   // "F#5" -> Halbtöne über dem tiefen A (A3 = 220 Hz)
  const m = name.match(/^([A-G])(#|b)?(\d)$/);
  if (!m) return 0;
  return 12 * Number(m[3]) + NOTEN_NAMEN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) - (12 * 3 + 9);
}
function walzerNoten(text) {   // Eine Note pro Viertel: "D4" = spielen, "-" = weiterklingen, "." = Pause
  const liste = [];
  for (const w of text.split(/\s+/).filter(w => w && w !== '|')) liste.push(w === '-' ? null : w === '.' ? 'pause' : notenZahl(w), null, null, null);
  return liste;
}
function riffNoten(text) {   // Ein Riff aufschreiben: eine Zahl pro Sechzehntel, "." = Pause, "|" = Taktstrich (wird ignoriert)
  return text.split(/\s+/).filter(w => w && w !== '|').map(w => w === '.' ? null : Number(w));
}
function walzerBegleitung(akkorde) {   // Pro Takt: tiefer Grundton (BUM), dann zweimal der Akkord (tschak, tschak)
  const GRUND = { D: 0, E: 2, F: 3, G: 5, A: 7, B: 9, C: 10 };
  const liste = [];
  for (const a of akkorde.split(/\s+/).filter(Boolean)) {
    const g = GRUND[a[0]] ?? 0;
    liste.push(g, null, null, null, g + 12, null, null, null, g + 12, null, null, null);
  }
  return liste;
}
const MUSIK_LIEDER = {
  // 🐷 Doktor Schorsch: „Schweinchen-Lied“ – eine EIGENE fröhliche Kinderlied-Melodie zum Mitsummen ...
  // ... aber gespielt auf einer kaputten, verzerrten E-Gitarre. Und in der zweiten Hälfte wird sie schief und gruselig!
  chemiker: {
    tempo: 150, grund: 65.4, verzerrung: 85, gitarre: 0.35, becken: 'achtel', stimmeKlang: 'verzerrt',
    // Begleitung: hüpfender Bass (Hopsa-hopsa)
    riff: riffNoten(`   // Ein Takt pro Melodie-Takt: C F C C | F F G C – und in der gruseligen Hälfte schiefe Töne (Ab, Gb)
      0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |  5 . 17 .  12 . 17 .  5 . 17 .  12 . 17 .  |
      0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |  0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |
      5 . 17 .  12 . 17 .  5 . 17 .  12 . 17 .  |  5 . 17 .  12 . 17 .  5 . 17 .  12 . 17 .  |
      7 . 19 .  14 . 19 .  7 . 19 .  14 . 19 .  |  0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |
      0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |  5 . 17 .  12 . 17 .  5 . 17 .  12 . 17 .  |
      0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |  8 . 20 .  15 . 20 .  8 . 20 .  15 . 20 .  |
      5 . 17 .  12 . 17 .  5 . 17 .  12 . 17 .  |  6 . 18 .  13 . 18 .  6 . 18 .  13 . 18 .  |
      7 . 19 .  14 . 19 .  7 . 19 .  14 . 19 .  |  0 . 12 .  7 . 12 .  0 . 12 .  7 . 12 .  |`),
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    snare: [4, 12],
    // Die Melodie: eine Note pro Viertel. - = weiterklingen · . = Pause
    stimme: walzerNoten(`
      C5 E5 G5 E5 | F5 A5 G5 - | E5 G5 C6 G5 | A5 G5 E5 - |
      F5 E5 D5 E5 | F5 G5 A5 - | G5 E5 D5 B4 | C5 - . . |
      C5 E5 G5 E5 | F5 A5 G5 - | Eb5 G5 C6 Gb5 | Ab5 G5 Eb5 - |
      F5 Eb5 D5 Eb5 | F5 Gb5 Ab5 - | G5 Eb5 Db5 B4 | C5 - . . |`),
  },

  // 👨‍🏫 Herr Kreidemann: „Die Pausenglocke“ – eine EIGENE, schiefe Spieluhr-Melodie (wie ein Kinderlied, nur falsch ...)
  // mit tickender Schuluhr und dumpfen Schritten
  lehrer: {
    tempo: 150, grund: 87, verzerrung: 30, gitarre: 0.3, melodieKlang: 'orgel', becken: 'tick',
    riff: [
      0, null, null, 7,  null, null, 6, null,  0, null, null, 7,  null, 3, 2, null,
      0, null, null, 7,  null, null, 6, null,  1, null, 1, null,  0, null, null, null,
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [12],
    melodie: [12, 16, 19, 18, 12, 16, 13, null],
  },
  // 👻 Staubgeist: Spuk-Orgel mit Geisterchor und Glöckchen – unheimlich und schwebend
  geist: {
    tempo: 140, grund: 110, verzerrung: 15, gitarre: 0.25, melodieKlang: 'orgel', becken: 'glocke',
    riff: [
      0, 3, 7, 12,  7, 3, 0, 3,   1, 4, 8, 13,  8, 4, 1, 4,
      0, 3, 7, 12,  7, 3, 0, 3,  -2, 1, 5, 10,  6, 5, 1, null,
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [12],
    melodie: [12, 15, 13, 12, 10, 12, 11, null],
  },
  // 👂 Lauscher: BRUTALER Metal – er rennt, also rennen auch die Trommeln!
  lauscher: {
    tempo: 175, grund: 110, verzerrung: 60, gitarre: 0.5, melodieKlang: 'kreischen', becken: 'achtel',
    riff: [
      0, 0, 0, null, 0, 0, 1, null,   0, 0, 0, null, 6, null, 5, null,
      0, 0, 0, null, 0, 0, 1, null,   0, 0, 3, 3, 1, 1, null, null,
      0, 0, 0, null, 0, 0, 1, null,   0, 0, 0, null, 6, null, 5, null,
      -2, -2, -2, null, -1, -1, -1, null,   1, 1, 1, 1, 6, 6, 6, 6,
    ],
    kick: [
      1, 0, 1, 0, 0, 0, 1, 0,   1, 0, 1, 0, 0, 0, 1, 1,
      1, 0, 1, 0, 0, 0, 1, 0,   1, 0, 1, 0, 0, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,
    ],
    snare: [4, 12],
    melodie: [12, 13, 12, 18, 12, 13, 15, 18],
  },
  // 🤠 Jäger: Verrückter Banjo-Wahnsinn – schnell wie ein wildes Hoedown!
  jaeger: {
    tempo: 190, grund: 110, verzerrung: 8, gitarre: 0.3, melodieKlang: 'banjo', becken: 'achtel',
    riff: [
      0, null, 7, null,  0, null, 7, 7,   5, null, 12, null,  5, null, 12, 12,
      0, null, 7, null,  0, null, 7, 7,   7, null, 2, null,  7, 6, 5, 4,
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    snare: [4, 12],
    melodie: [12, 12, 17, 17, 12, 12, 19, 18],
  },
  // 👾 Formwandler: Kaputte Roboter-Elektro-Musik – alles zuckt und springt (Oktav-Sprünge!)
  formwandler: {
    tempo: 155, grund: 98, verzerrung: 70, gitarre: 0.4, melodieKlang: 'kreischen', becken: 'sechzehntel',
    riff: [
      0, 12, 0, null,  0, 12, 1, 13,   0, 12, 0, null,  6, 18, 5, 17,
      0, 12, 0, null,  0, 12, 3, 15,   1, 13, 1, null,  -1, 11, -2, null,
    ],
    kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    snare: [4, 12],
    melodie: [24, null, 25, 24, 30, null, 29, 25],
  },
  // 👹 Schrank-Monster: Polternder Gruselwalzer – wie eine kaputte Spieluhr in einem alten Schrank
  schrank: {
    tempo: 165, grund: 82, verzerrung: 45, gitarre: 0.4, melodieKlang: 'orgel', becken: 'tick',
    riff: [
      0, null, 1, null,  0, null, 6, null,   0, null, 1, null,  3, null, 1, null,
      0, null, 1, null,  0, null, 6, null,   5, 5, 4, 4,  3, 3, 1, null,
    ],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    snare: [4, 12],
    melodie: [12, 13, null, 12, 18, 17, null, 13],
  },
  // 👵 Böse Oma: Der Donauwalzer (Johann Strauss) – aber VERZERRT wie auf einer kaputten E-Gitarre! (3/4-Takt: 12 Sechzehntel pro Takt)
  oma: {
    tempo: 200, grund: 73.42, verzerrung: 75, gitarre: 0.3, becken: 'tick', takt: 12, stimmeKlang: 'verzerrt',
    // Begleitung: BUM-tschak-tschak (ein Akkord pro Takt)
    riff: walzerBegleitung('D D D D D D D A  A A A A A A A D'),
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    snare: [4, 8],
    // Die Melodie: eine Note pro Viertel (3 pro Takt). - = Note weiterklingen lassen · . = Pause
    stimme: walzerNoten(`
      D4 F#4 A4 | A4 - - | A5 A5 . | F#5 F#5 D4 |
      D4 F#4 A4 | A4 - - | A5 A5 . | G5 G5 C#4 |
      C#4 E4 B4 | B4 - - | B5 B5 . | G5 G5 C#4 |
      C#4 E4 B4 | B4 - - | B5 B5 . | F#5 F#5 D4 |`),
  },
  // 🐾 Achtarm-Maulwurf: „Unter der Erde“ – ein eigenes Modern-Metal-Lied: tief gestimmte Gitarren,
  // stotternde Riffs, ein Breakdown in der Mitte und eine kreischende Lead-Melodie obendrauf
  maulwurf: {
    tempo: 165, grund: 65.4, verzerrung: 100, gitarre: 0.55, becken: 'achtel',
    // Eine Zahl pro Sechzehntel (Halbtöne über dem tiefen C), . = Pause
    riff: riffNoten(`
      0 0 . 0  0 . 0 .  3 . 0 0  . 5 . 3  |  0 0 . 0  0 . 0 .  7 . 6 .  5 . 3 .  |
      0 0 . 0  0 . 0 .  3 . 0 0  . 5 . 3  |  0 0 . 0  0 . 10 .  8 . 7 .  3 . 5 .  |
      0 . . 0  . . 0 .  . . 0 .  0 . . .  |  0 . . 0  . . 1 .  . . 1 .  0 . . .  |
      12 . 10 .  8 . 7 .  8 . 7 .  3 . 5 .  |  0 0 0 0  0 0 0 0  0 0 0 0  7 6 5 3  |`),
    kick: [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
    snare: [4, 12],
    // Die Lead-Gitarre: eine Note pro Viertel (- = weiterklingen, . = Pause) – in der Mitte Pause für den Breakdown
    stimme: walzerNoten(`
      Eb5 D5 C5 G4 | Ab4 - G4 . | Eb5 D5 C5 Bb4 | C5 - - . |
      . . . .      | . . . .    | G5 F5 Eb5 D5  | C5 - - - |`),
  },
  // 🗿 Starrer: Langsamer, tonnenschwerer Stein-Doom – und eine Uhr tickt ... tick ... tack ...
  starrer: {
    tempo: 100, grund: 55, verzerrung: 95, gitarre: 0.6, melodieKlang: 'gong', becken: 'tick',
    riff: [
      0, null, null, null,  null, null, 0, null,   1, null, null, null,  null, null, null, null,
      0, null, null, null,  null, null, 0, null,   6, null, null, null,  5, null, null, null,
      0, null, null, null,  null, null, 0, null,   1, null, null, null,  null, null, 3, null,
      -2, null, null, null,  -1, null, null, null,   0, 0, 0, 0,  6, 6, 6, 6,
    ],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [8],
    melodie: [0, null, 1, null, 0, null, 6, null],
  },
};
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
function verzerrer(art) {   // Jedes Lied hat seinen eigenen Verzerrer (einmal bauen, dann wiederverwenden)
  if (!musik.dreck[art]) {
    const d = audio.createWaveShaper(), leiser = audio.createGain();
    d.curve = verzerrKurve(MUSIK_LIEDER[art].verzerrung); d.oversample = '2x';
    leiser.gain.value = 0.35;
    d.connect(leiser).connect(musik.gain);
    musik.dreck[art] = d;
  }
  return musik.dreck[art];
}
function musikNote(art, schritt, t) {
  const L = MUSIK_LIEDER[art], ziel = musik.gain, s16 = 60 / L.tempo / 4, takt = L.takt || 16, imTakt = schritt % takt;
  const i = schritt % L.riff.length, neuStart = t - audio.currentTime;
  try {
    // 🎸 Gitarre (bzw. Orgel beim Geist): Power-Akkord durch den Verzerrer
    const n = L.riff[i];
    if (n !== null) {
      const f = halbton(n, L.grund), betont = imTakt % 4 === 0;
      let pausen = 0;   // Wie lange danach Pause ist? So lange darf der Ton klingen
      while (pausen < 7 && L.riff[(i + 1 + pausen) % L.riff.length] === null) pausen++;
      const lang = (pausen ? pausen + 0.8 : 0.9) * s16;
      const fl = audio.createBiquadFilter(), g = audio.createGain();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(betont ? 3500 : 2200, t); fl.frequency.exponentialRampToValueAtTime(500, t + lang);
      g.gain.setValueAtTime((betont ? 1 : 0.7) * L.gitarre, t); g.gain.exponentialRampToValueAtTime(0.001, t + lang);
      fl.connect(g).connect(verzerrer(art));
      for (const [mal, verstimmt] of [[1, -8], [1, 8], [1.5, 0], [0.5, 0]]) {
        const o = audio.createOscillator();
        o.type = mal === 0.5 ? 'square' : 'sawtooth';
        o.frequency.value = f * mal; o.detune.value = verstimmt;
        o.connect(fl); o.start(t); o.stop(t + lang + 0.02);
      }
    }
    // 🥁 Bassdrum (beim Starrer extra tief und lang – wie ein riesiger Stein, der aufschlägt)
    if (L.kick[i % L.kick.length]) {
      const tief = art === 'starrer';
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.setValueAtTime(tief ? 120 : 180, t); o.frequency.exponentialRampToValueAtTime(tief ? 28 : 38, t + (tief ? 0.3 : 0.12));
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + (tief ? 0.5 : 0.18));
      o.connect(g).connect(ziel); o.start(t); o.stop(t + 0.55);
      rauschen(neuStart, 0.015, 0.3, 'highpass', 3000, ziel);
    }
  } catch (e) { /* egal */ }
  // Snare: KRACH (Rauschen + ein tiefer Ton als "Körper")
  if (L.snare.includes(imTakt)) {
    rauschen(neuStart, art === 'starrer' ? 0.5 : 0.2, 0.6, 'highpass', 1200, ziel);
    try {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(ziel); o.start(t); o.stop(t + 0.12);
    } catch (e) { /* egal */ }
  }
  // Becken & Co.
  if (L.becken === 'achtel' && schritt % 2 === 0) rauschen(neuStart, 0.05, 0.15, 'highpass', 8000, ziel);
  if (L.becken === 'sechzehntel') rauschen(neuStart, 0.04, 0.12, 'highpass', 8000, ziel);
  if (L.becken === 'tick' && schritt % 4 === 0) ton(schritt % 8 === 0 ? 1600 : 1200, neuStart, 0.04, 'square', 0.12, null, ziel);   // Tick ... tack ...
  if (L.becken === 'glocke' && schritt % 4 === 2) ton(halbton(L.riff[i] ?? 0, 1760), neuStart, 0.6, 'sine', 0.06, null, ziel);   // Geisterglöckchen
  if (schritt % (takt * 4) === 0) rauschen(neuStart, 1.6, 0.4, 'highpass', 4000, ziel, 2500);   // Großes Becken alle 4 Takte
  // Eine ganze Melodie ("stimme"): verzerrte Lead-Gitarre
  if (L.stimme) {
    const k = schritt % L.stimme.length, n = L.stimme[k];
    if (n === null || n === 'pause') return;
    let weiter = 0;   // Wie lange klingt die Note? Bis zur nächsten Note oder Pause
    while (weiter < 15 && L.stimme[(k + 1 + weiter) % L.stimme.length] === null) weiter++;
    const dauer = (weiter + 1) * s16 * 0.92, f = halbton(n, 220);
    try {
      const fl = audio.createBiquadFilter(), g = audio.createGain();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(4500, t); fl.frequency.exponentialRampToValueAtTime(1800, t + dauer);
      g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.setValueAtTime(0.5, t + dauer * 0.8); g.gain.exponentialRampToValueAtTime(0.001, t + dauer);
      fl.connect(g).connect(verzerrer(art));
      const zittern = audio.createOscillator(), zg = audio.createGain();   // Vibrato (wie eine jaulende Gitarre)
      zittern.frequency.value = 6; zg.gain.value = f * 0.012; zittern.connect(zg);
      for (const [mal, verstimmt, typ] of [[1, -7, 'sawtooth'], [1, 7, 'sawtooth'], [2, 0, 'square']]) {
        const o = audio.createOscillator();
        o.type = typ; o.frequency.value = f * mal; o.detune.value = verstimmt;
        zg.connect(o.frequency);
        o.connect(fl); o.start(t); o.stop(t + dauer + 0.02);
      }
      zittern.start(t); zittern.stop(t + dauer + 0.02);
    } catch (e) { /* egal */ }
    return;
  }
  // Melodie
  if (imTakt % 8 === 0) {
    const m = L.melodie[Math.floor(schritt / 8) % L.melodie.length];
    if (m === null || m === undefined) return;
    const dauer = s16 * 7;
    if (L.melodieKlang === 'kreischen') {   // Schief und verstimmt = extra gruselig
      gruselTon(halbton(m, 220), neuStart, dauer, 'sawtooth', 0.07, null, 9, ziel);
      gruselTon(halbton(m + 0.3, 220), neuStart, dauer, 'square', 0.04, null, 7, ziel);
    } else if (L.melodieKlang === 'orgel') {   // Spuk-Orgel + Geisterchor "Uuuuh"
      for (const mal of [1, 2, 3]) gruselTon(halbton(m, 220) * mal, neuStart, dauer, mal === 1 ? 'square' : 'sine', 0.06 / mal, null, 5, ziel);
      gruselTon(halbton(m, 440), neuStart, dauer * 1.2, 'sine', 0.05, halbton(m - 1, 440), 4, ziel);
      rauschen(neuStart, dauer, 0.04, 'bandpass', 900, ziel, 600);
    } else if (L.melodieKlang === 'banjo') {   // Schnelles Zupfen: pling-pling-pling-pling
      [0, 4, 7, 12, 7, 4].forEach((plus, k) => ton(halbton(m + plus, 220), neuStart + k * s16 * 1.15, 0.18, 'triangle', 0.1, null, ziel));
    } else if (L.melodieKlang === 'gong') {   // Tiefer Stein-Gong: BOOONG
      for (const [mal, laut] of [[1, 0.25], [2.76, 0.1], [5.4, 0.05]]) ton(halbton(m, 110) * mal, neuStart, s16 * 14, 'sine', laut, null, ziel);
    }
  }
}
function musikStart(art) {   // Die Jagd beginnt! Ein dramatischer Schlag – für jedes Monster ein anderer
  if (art === 'geist') {          // 👻 Schriller Geisterschrei
    gruselTon(900, 0, 1.4, 'sawtooth', 0.12, 300, 12);
    gruselTon(1350, 0, 1.4, 'sine', 0.1, 450, 10);
    rauschen(0, 1.5, 0.3, 'bandpass', 3000, null, 300);
  } else if (art === 'jaeger') {  // 🤠 Schuss in die Luft + JIIIIHAAA!
    monsterSound.schuss(0.6);
    gruselTon(300, 0.3, 0.5, 'sawtooth', 0.12, 900, 14);
    gruselTon(900, 0.8, 0.6, 'sawtooth', 0.1, 400, 14);
  } else if (art === 'formwandler') { // 👾 Glitch-Schrei
    rauschen(0, 0.5, 0.5, 'highpass', 2000, null, 300);
    gruselTon(1500, 0, 0.9, 'square', 0.12, 100, 50);
    gruselTon(100, 0.2, 1.0, 'sawtooth', 0.2, 50, 8);
  } else if (art === 'schrank') { // 👹 Türen knallen auf + Brüllen
    rauschen(0, 0.4, 0.8, 'lowpass', 2500, null, 100);
    ton(80, 0, 0.5, 'sine', 0.7, 40);
    gruselTon(500, 0.25, 1.0, 'sawtooth', 0.12, 150, 20);
  } else if (art === 'maulwurf') { // 🐾 Erde bricht auf + Quieken
    rauschen(0, 1.2, 0.8, 'lowpass', 1200, null, 100);
    ton(50, 0, 1.2, 'sine', 0.9, 25);
    gruselTon(1100, 0.3, 0.8, 'sawtooth', 0.12, 1600, 30);
  } else if (art === 'oma') {     // 👵 Wütendes Keifen + Stock auf den Boden: TOCK! TOCK!
    gruselTon(500, 0, 0.9, 'sawtooth', 0.14, 1300, 20);
    gruselTon(750, 0, 0.9, 'square', 0.06, 1600, 25);
    for (let k = 0; k < 2; k++) { ton(900, 0.2 + k * 0.25, 0.05, 'square', 0.3); ton(80, 0.2 + k * 0.25, 0.2, 'sine', 0.5, 40); }
  } else if (art === 'chemiker') { // 🐷 Glas klirrt + QUIIIEK + irres Lachen
    sound.glas(1);
    monsterSound.chemikerLacht(1.4);
    gruselTon(300, 0.1, 1.0, 'square', 0.08, 1200, 25);
  } else if (art === 'starrer') { // 🗿 Riesiger Steingong + Krachen
    for (const [f, laut] of [[55, 0.5], [151.8, 0.2], [297, 0.1]]) ton(f, 0, 3, 'sine', laut, f * 0.9);
    rauschen(0, 1.5, 0.5, 'lowpass', 1500, null, 60);
  } else {                        // 👂 DUNN!
    gruselTon(55, 0, 1.5, 'sawtooth', 0.3, 30, 3);
    gruselTon(58.3, 0, 1.5, 'sawtooth', 0.25, 31, 4);
    gruselTon(77.8, 0, 1.5, 'sawtooth', 0.2, 40, 5);   // Teufelston dazu!
    ton(120, 0, 0.6, 'sine', 0.6, 30);                 // Tiefer Wumms
    rauschen(0, 1.2, 0.35, 'lowpass', 3000, null, 80);
  }
}
// art = welches Monster dich jagt ('geist', 'lauscher', 'starrer') oder null, wenn keins
function musikUpdate(art) {
  if (!audio || !MUSIK_AN) return;
  const jetzt = audio.currentTime, aktiv = !!art;
  if (!musik) {
    const g = audio.createGain();
    g.gain.value = 0;
    // Ein Kompressor am Ende passt auf, dass es nicht zu laut wird und kratzt
    const komp = audio.createDynamicsCompressor();
    komp.threshold.value = -14; komp.ratio.value = 6;
    g.connect(komp).connect(audio.destination);
    musik = { gain: g, dreck: {}, art: null, naechste: 0, schritt: 0, war: false, aus: -99, ziel: 0 };
  }
  const ziel = aktiv && tonAn ? MUSIK_LAUT : 0;
  if (ziel !== musik.ziel) {
    musik.ziel = ziel;
    musik.gain.gain.cancelScheduledValues(jetzt);
    musik.gain.gain.setTargetAtTime(ziel, jetzt, ziel > 0 ? 0.1 : 0.8);   // Schnell an, langsam aus
  }
  if (aktiv && (art !== musik.art || !musik.war)) {
    // Neues Monster oder lange Pause? Dann das Lied von vorne
    if (art !== musik.art || jetzt - musik.aus > 4) {
      musik.naechste = jetzt + 0.05; musik.schritt = 0;
      musikStart(art);   // Der Start-Schlag nur, wenn es wirklich neu losgeht (nicht bei jedem Blick auf den Starrer)
    }
    musik.art = art;
  }
  if (!aktiv && musik.war) musik.aus = jetzt;
  musik.war = aktiv;
  if (!musik.art || (!aktiv && jetzt - musik.aus > 4)) return;   // Ausgeklungen – keine Noten mehr planen
  // Die nächsten Noten ein kleines Stück im Voraus planen (so klingt es nicht holprig)
  if (musik.naechste < jetzt) musik.naechste = jetzt + 0.02;
  while (musik.naechste < jetzt + 0.15) {
    musikNote(musik.art, musik.schritt, musik.naechste);
    musik.naechste += 60 / MUSIK_LIEDER[musik.art].tempo / 4;
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
// Echte Lichter für die Taschenlampen der anderen (immer gleich viele, sonst ruckelt das Spiel beim Umbauen)
const andereLichter = [];
for (let i = 0; i < (ANDERE_LAMPEN ? ANDERE_LICHTER : 0); i++) {
  const l = new THREE.SpotLight('#fff3d6', 0, 20, 0.5, 0.5, 1);
  szene.add(l, l.target);
  andereLichter.push(l);
}
// Der sichtbare Lichtstrahl: ein Kegel, der vorne hell ist und nach hinten verblasst
const KEGEL_GEO = new THREE.ConeGeometry(0.45, 1, 20, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 0.5);   // Spitze bei der Lampe, zeigt nach vorne
const KEGEL_TEX = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const g = c.getContext('2d'), v = g.createLinearGradient(0, 0, 0, 64);
  v.addColorStop(0, '#fff'); v.addColorStop(0.35, '#777'); v.addColorStop(1, '#000');
  g.fillStyle = v; g.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
})();

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
  const tex = malTextur(512, 64, (g) => {
    g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(t, 256, 34, 500);
    g.fillStyle = farbe; g.fillText(t, 256, 34, 500);
  }, false);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.8, 0.225, 1);
  return s;
}
function namensSchildNeu(T, name, farbe) {   // 🏷️ Neuer Name? Dann ein neues Schild malen
  const alt = T.schild, neu = namensSchild(`🤖 ${name}`, farbe);
  neu.position.copy(alt.position); alt.parent.add(neu); alt.parent.remove(alt);
  alt.material.map.dispose(); alt.material.dispose();
  T.schild = neu;
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
bodenKoerper.position.y = -ETAGE_HOEHE;   // Ganz unten: der Kellerboden (der echte Boden oben sind dicke Platten, siehe baueHaus)
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
let lobby = false, introZeit = -1, einblenden = 0, schrottZeit = -1;
let mitBots = true;   // 🤖 Spielen die Helfer-Bots mit? (Schalter in der Lobby – das Spiel merkt es sich)
// 🏷️ Dein eigener Roboter-Name (wird auf deinem Computer gespeichert)
const NAME_MAX = 14;           // So viele Zeichen darf ein Name höchstens haben
const nameSauber = t => String(t || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
let eigenerName = '';
try { eigenerName = nameSauber(localStorage.getItem('arag-name')); } catch (e) { /* egal */ }
// 🎨🎩 Dein Aussehen (in der Roboter-Werkstatt im Lobby-Bus aussuchen – wird auf deinem Computer gespeichert)
const LOOK_FARBEN = ['#7cf5c6', '#ffe66d', '#b388ff', '#ff8a65', '#ff6b9d', '#4dabf7', '#4ade80', '#ff4444', '#ffa94d', '#ffffff', '#3b3f4a', '#c9a227'];
const LOOK_HUETE = [
  { id: '', name: 'Kein Hut', emoji: '🚫' }, { id: 'cap', name: 'Cap', emoji: '🧢' }, { id: 'zylinder', name: 'Zylinder', emoji: '🎩' },
  { id: 'krone', name: 'Krone', emoji: '👑' }, { id: 'party', name: 'Partyhut', emoji: '🥳' }, { id: 'cowboy', name: 'Cowboyhut', emoji: '🤠' },
  { id: 'propeller', name: 'Propellermütze', emoji: '🚁' }, { id: 'helm', name: 'Bauhelm', emoji: '⛑️' }, { id: 'zauberer', name: 'Zauberhut', emoji: '🧙' },
  { id: 'wikinger', name: 'Wikingerhelm', emoji: '🐂' }, { id: 'koch', name: 'Kochmütze', emoji: '👨‍🍳' }, { id: 'pirat', name: 'Piratenhut', emoji: '🏴‍☠️' },
  { id: 'blumen', name: 'Blumenkranz', emoji: '🌼' }, { id: 'ohren', name: 'Hasenohren', emoji: '🐰' },
];
const LOOK_EXTRAS = [
  { id: '', name: 'Nichts', emoji: '🚫' }, { id: 'brille', name: 'Sonnenbrille', emoji: '🕶️' }, { id: 'bart', name: 'Schnurrbart', emoji: '🥸' },
  { id: 'fliege', name: 'Fliege', emoji: '🎀' }, { id: 'schal', name: 'Schal', emoji: '🧣' }, { id: 'umhang', name: 'Superhelden-Umhang', emoji: '🦸' },
  { id: 'jetpack', name: 'Raketen-Rucksack', emoji: '🚀' },
];
function lookSauber(l) {   // Nur erlaubte Sachen (auch wenn ein Mitspieler Quatsch schickt)
  l = l && typeof l === 'object' ? l : {};
  return { farbe: LOOK_FARBEN.includes(l.farbe) ? l.farbe : null, hut: LOOK_HUETE.some(h => h.id === l.hut) ? l.hut : '', extra: LOOK_EXTRAS.some(h => h.id === l.extra) ? l.extra : '' };
}
let aussehen = lookSauber(null);
try { aussehen = lookSauber(JSON.parse(localStorage.getItem('arag-aussehen') || 'null')); } catch (e) { /* egal */ }
let werkstattOffen = false;   // Ist gerade das Werkstatt-Menü offen?
const lookArray = l => [l.farbe || '', l.hut || '', l.extra || ''];   // (kurz zum Verschicken)
const lookAusArray = a => lookSauber(Array.isArray(a) ? { farbe: a[0], hut: a[1], extra: a[2] } : null);
try { mitBots = localStorage.getItem('arag-bots') !== '0'; } catch (e) { /* egal */ }   // schrottZeit >= 0: Alle sind Schrott!   // 🚌 Bist du noch in der Lobby? Läuft gerade das Intro? (-1 = nein)
let traenke = [], pfuetzen = [], trankNummer = 0, nebelZeit = 0, klebZeit = 0;   // 🧪 Fliegende Tränke, Pfützen, und wie lange du noch im Nebel bist / festklebst
let schaetze = [];          // Alle Schätze im Haus
let schatzNummer = 0;       // Jeder Schatz bekommt eine Nummer (für den Multiplayer)
let monster = [];           // Alle Monster
let helfer = [];            // Deine Helfer-Bots
let gegriffen = null, halteAbstand = 2.2, schwebend = null;
let gepackt = null, schwebendSpieler = null, packZeit = 0, freiZeit = 0;   // Multiplayer: andere Spieler mit dem Strahl anheben
let nachricht = null, schwebeTexte = [], splitter = [], funk = [];
let energie = 100, ausdauer = AUSDAUER_MAX, schadenBlitz = 0, schrittZeit = 0, herzZeit = 0, wackeln = 0;
let geduckt = false, zielGemeldet = false;
let blitzLadung = 1, blitzHell = 0;   // Blitzlampe: Ladung (0 bis 1) und wie hell es gerade blitzt
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
let wandKoerper = [], sichtBlocker = [], tuerListe = [];   // sichtBlocker: Dadurch kann man nicht durchsehen (Wände, Decken, große Möbel)

// ----- Räume, Stockwerke und Wege -----
const proEtage = () => haus.breit * haus.tief;
const raumNr = (i, j, e) => e * proEtage() + j * haus.breit + i;
const etageVon = y => begrenzt(Math.floor((y + 1) / ETAGE_HOEHE), 0, haus.etagen - 1);
function raumNrVon(x, y, z) {   // In welchem Raum ist dieser Punkt?
  return raumNr(begrenzt(Math.floor(x / RAUM), 0, haus.breit - 1), begrenzt(Math.floor(z / RAUM), 0, haus.tief - 1), etageVon(y));
}
const tuerSchluessel = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
// 🧪 Ist dieser Punkt unten im Keller?
const imKellerXZ = (x, z) => !!haus && !!haus.keller && x > haus.keller.x1 && x < haus.keller.x2 && z > haus.keller.z1 && z < haus.keller.z2;
const imKeller = p => imKellerXZ(p.x, p.z) && p.y < -1.2;
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
    if (haus.treppen.some(t => t.e + 1 === e && imLoch(t, x, z))) continue;   // Da ist ein Loch (im Erdgeschoss: das Loch über der Kellertreppe)
    pruefe(e * ETAGE_HOEHE);
  }
  if (imKellerXZ(x, z)) pruefe(haus.keller.boden);   // Der Kellerboden
  // Auf der Rampe? Dann die Rampe nehmen, wenn sie nah genug ist (sonst läuft man unten durch)
  for (const t of haus.treppen) if (aufRampe(t, x, z) && Math.abs(rampenHoehe(t, x) - y) < 0.6) return rampenHoehe(t, x);
  return beste;
}
// Steht das Ziel AUF einer Treppe? Dann nicht geradeaus (sonst läuft man unter der Treppe durch!),
// sondern erst zum Anfang der Treppe (unten oder oben) und dann die Treppe entlang.
function rampenUmweg(wer, pos, ziel) {
  for (const t of haus.treppen) {
    if (!aufRampe(t, ziel.x, ziel.z) || Math.abs(rampenHoehe(t, ziel.x) - ziel.y) > 1.0) continue;
    if (aufRampe(t, pos.x, pos.z) && Math.abs(rampenHoehe(t, pos.x) - pos.y) < 0.7) return ziel;   // Schon auf der Treppe: einfach weiter
    const P = treppenPunkte(t), vonOben = pos.y > t.basis + ETAGE_HOEHE * 0.5;
    const amAnfang = q => abstand2D(pos.x, pos.z, q.x, q.z) < 0.9 && Math.abs(pos.y - q.y) < 0.7;
    if (amAnfang(P.unten) || amAnfang(P.oben)) return ziel;   // Steht schon am Treppenanfang: jetzt rauf (oder runter)!
    wer.tw = { k: 0, reihe: vonOben ? [P.absatz, P.oben] : [P.vor, P.unten] };
    return wer.tw.reihe[0];
  }
  return null;
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
    const q = tw.reihe[tw.k];
    // Von der Treppe gefallen? (Das Ziel ist viel höher/tiefer, wir sind nicht auf der Treppe und auch nicht gerade am letzten Wegpunkt)
    // Dann den Weg nochmal ganz neu suchen – sonst läuft man ewig unter der Treppe gegen die Wand.
    if (q && tw.k > 0 && Math.abs(q.y - pos.y) > 1.6 && abstand2D(pos.x, pos.z, tw.reihe[tw.k - 1].x, tw.reihe[tw.k - 1].z) > 1.0 &&
      !haus.treppen.some(t => aufRampe(t, pos.x, pos.z) && Math.abs(rampenHoehe(t, pos.x) - pos.y) < 1.0)) wer.tw = null;
    else if (q) return q;
    else wer.tw = null;
  }
  // 🧪 Runter in den Keller oder rauf? Dann über die Kellertreppe!
  if (haus.keller) {
    const ka = imKeller(pos), kb = imKeller(ziel), P = treppenPunkte(haus.keller.treppe);
    if (ka && kb) return kellerWeg(pos, ziel);   // Beide im Keller: durchs Labyrinth
    if (ka) {   // Raus: erst durchs Labyrinth zur Treppe, dann hoch
      if (abstand2D(pos.x, pos.z, P.vor.x, P.vor.z) > 0.8) return kellerWeg(pos, P.vor);
      wer.tw = { k: 0, reihe: [P.vor, P.unten, P.oben, P.absatz] }; return wer.tw.reihe[0];
    }
    if (kb) {
      if (abstand2D(pos.x, pos.z, P.absatz.x, P.absatz.z) < 0.6 && Math.abs(pos.y - P.absatz.y) < 1.2) { wer.tw = { k: 0, reihe: [P.absatz, P.oben, P.unten, P.vor] }; return wer.tw.reihe[0]; }
      ziel = P.absatz;   // Erst mal oben zur Kellertreppe
    }
  }
  // Rein ins Gartenhäuschen oder raus? Dann durch seine Tür!
  const sa = schuppenBei(pos.x, pos.z), sb = schuppenBei(ziel.x, ziel.z);
  if (sa !== sb) {
    if (sa) { wer.tw = { k: 0, reihe: [sa.innen, sa.aussen] }; return sa.innen; }
    if (abstand2D(pos.x, pos.z, sb.aussen.x, sb.aussen.z) > 0.6) ziel = sb.aussen;
    else { wer.tw = { k: 0, reihe: [sb.innen] }; return sb.innen; }
  }
  // 📚 In der Schule: von Feld zu Feld durch Flure und Türen
  if (haus.schule) return schulWeg(pos, ziel);
  // Drinnen <-> draußen? Dann durch die nächste Haustür!
  const drinnen = imHaus(pos.x, pos.z);
  if (!drinnen && !imHaus(ziel.x, ziel.z)) return umsHaus(pos, ziel);   // Beide draußen: hin (ums Haus herum, wenn es im Weg ist)
  if (drinnen !== imHaus(ziel.x, ziel.z) && haus.aussenTuerListe.length) {
    if (!drinnen) {   // Draußen -> rein: erst zur Haustür (ums Haus herum), dann durch
      const a = naechsteHaustuer(ziel.y < 1.5 ? ziel : pos);
      if (abstand2D(pos.x, pos.z, a.aussen.x, a.aussen.z) > 0.6) return umsHaus(pos, a.aussen);
      wer.tw = { k: 0, reihe: [a.innen] }; return a.innen;
    }
    const a = naechsteHaustuer(ziel);
    if (raumNrVon(pos.x, pos.y, pos.z) === a.raum) { wer.tw = { k: 0, reihe: [a.innen, a.aussen] }; return a.innen; }
    ziel = a.innen;   // Erst mal zum Raum mit der Haustür
  }
  const ra = raumNrVon(pos.x, pos.y, pos.z), rb = raumNrVon(ziel.x, ziel.y, ziel.z);
  if (ra === rb) return rampenUmweg(wer, pos, ziel) || ziel;
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
function wandStueck(x1, z1, x2, z2, basis, tuer, mat, maus = 0, aussen = -1) {
  const D = 0.3, laenge = Math.hypot(x2 - x1, z2 - z1), entlangX = z1 === z2;
  if (aussen >= 0) { const innenMat = mat; mat = [0, 1, 2, 3, 4, 5].map(k => k === aussen ? fassadeMat : innenMat); }   // Außenwand: draußen Holzfassade, drinnen Tapete
  const stueck = (von, bis, unten, oben) => {
    const mitte = (von + bis) / 2, l = bis - von;
    if (l <= 0.01) return;
    if (entlangX) festerKlotz(x1 + mitte, basis + (unten + oben) / 2, z1, l, oben - unten, D, mat);
    else festerKlotz(x1, basis + (unten + oben) / 2, z1 + mitte, D, oben - unten, l, mat);
  };
  if (tuer >= OFFEN) return;   // Großer Saal: hier ist gar keine Wand
  if (!tuer && maus) {   // 🐭 Mauseloch: unten ein kleines Loch in der Wand
    const a = maus - MAUSELOCH.breit / 2, b = maus + MAUSELOCH.breit / 2;
    stueck(0, a, 0, WAND_HOEHE);
    stueck(b, laenge, 0, WAND_HOEHE);
    stueck(a, b, MAUSELOCH.hoch, WAND_HOEHE);
    mausLochDeko(entlangX ? x1 + maus : x1, basis, entlangX ? z1 : z1 + maus, entlangX, mat);
    return;
  }
  if (!tuer) { stueck(0, laenge, 0, WAND_HOEHE); return; }
  const a = laenge / 2 - tuer / 2, b = laenge / 2 + tuer / 2;
  stueck(0, a, 0, WAND_HOEHE);
  stueck(b, laenge, 0, WAND_HOEHE);
  stueck(a, b, TUER_HOEHE, WAND_HOEHE);   // Über der Tür
  for (const p of [a, b]) {   // Türrahmen
    if (entlangX) festerKlotz(x1 + p, basis + TUER_HOEHE / 2, z1, 0.12, TUER_HOEHE, D + 0.08, dunkelHolzMat, false);
    else festerKlotz(x1, basis + TUER_HOEHE / 2, z1 + p, D + 0.08, TUER_HOEHE, 0.12, dunkelHolzMat, false);
  }
  if (tuer <= TUER_BREITE) neueTuer(x1, z1, basis, entlangX, a, tuer);   // Eine echte Tür rein! (Große Durchgänge bleiben offen)
}
// ----- 🚪 Türen -----
const tuerHolzMat = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.75 });
const fassadeMat = new THREE.MeshStandardMaterial({ color: '#2e2620', roughness: 0.95 });
const TUER_AUF_WINKEL = Math.PI / 2 * 0.95;
function neueTuer(x1, z1, basis, entlangX, a, breite) {
  const b = breite - 0.06, h = TUER_HOEHE - 0.04;
  const angel = new THREE.Group();   // Das Scharnier: Um diesen Punkt dreht sich die Tür
  angel.position.set(entlangX ? x1 + a + 0.03 : x1, basis, entlangX ? z1 : z1 + a + 0.03);
  const grund = entlangX ? 0 : -Math.PI / 2;
  const blatt = new THREE.Mesh(new THREE.BoxGeometry(b, h, 0.07), tuerHolzMat);
  blatt.position.set(b / 2, h / 2 + 0.02, 0); blatt.castShadow = blatt.receiveShadow = true; angel.add(blatt);
  for (const y of [0.6, 1.65]) for (const s of [-1, 1]) {   // Verzierte Felder
    const f = new THREE.Mesh(new THREE.BoxGeometry(b * 0.7, 0.75, 0.02), dunkelHolzMat); f.position.set(b / 2, y, s * 0.042); angel.add(f);
  }
  for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), goldMat); k.position.set(b - 0.15, 1.05, s * 0.07); angel.add(k); }   // Türknauf
  hausGruppe.add(angel);
  const mitte = { x: entlangX ? x1 + a + breite / 2 : x1, z: entlangX ? z1 : z1 + a + breite / 2 };
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(entlangX ? breite / 2 : 0.05, TUER_HOEHE / 2, entlangX ? 0.05 : breite / 2)), material: standardMat, collisionFilterGroup: G_WAND });
  body.position.set(mitte.x, basis + TUER_HOEHE / 2, mitte.z);
  body.aabbNeedsUpdate = true;
  const d = { id: tuerListe.length, x: mitte.x, z: mitte.z, basis, angel, grund, blatt, body, auf: rnd() < TUER_OFFEN_ANTEIL, richtung: rnd() < 0.5 ? 1 : -1, winkel: 0 };
  if (d.auf) d.winkel = TUER_AUF_WINKEL; else { welt.addBody(body); sichtBlocker.push(blatt); }
  angel.rotation.y = grund + d.winkel * d.richtung;
  tuerListe.push(d);
}
// Tür auf oder zu machen. wer: 'spieler', 'helfer', 'monster' (KRACH!) oder 'sync' (still, nur abgleichen)
function tuerSetzen(d, auf, wer = 'spieler', vomHost = false) {
  if (!d || d.auf === auf) return;
  if (mp.rolle === 'gast' && !vomHost) { mpSende({ t: 'tuerE', id: d.id, auf }); return; }   // Gast: Der Gastgeber entscheidet
  d.auf = auf;
  if (auf) {   // Sofort durchlässig (beim Zumachen wird sie erst fest, wenn sie ganz zu ist)
    if (d.body.world) welt.removeBody(d.body);
    const i = sichtBlocker.indexOf(d.blatt); if (i >= 0) sichtBlocker.splice(i, 1);
  }
  const laut = lautBei({ x: d.x, y: d.basis + 1, z: d.z });
  if (wer === 'monster') {   // RUMMS! Aufgebrochen!
    rauschen(0, 0.3, 0.7 * laut, 'lowpass', 1800); ton(70, 0, 0.35, 'sine', 0.7 * laut, 35);
    wackeln = Math.max(wackeln, 0.12 * laut);
  } else if (wer !== 'sync') gruselTon(auf ? 260 : 210, 0, 0.5, 'sawtooth', 0.05 * laut, auf ? 170 : 300, 10);   // Knaaarz
  if (mp.rolle !== 'gast') {
    if (wer === 'spieler') laerm(d.x, d.basis, d.z, 4);   // Türen knarzen – das hört der Lauscher!
    if (mp.rolle === 'host') mpAnAlle({ t: 'tuer', id: d.id, auf, w: wer });
  }
}
function tuerenZeigen(dt) {   // Türen langsam auf- und zuschwingen lassen
  for (const d of tuerListe) {
    const ziel = d.auf ? TUER_AUF_WINKEL : 0;
    if (d.winkel === ziel) continue;
    d.winkel += begrenzt(ziel - d.winkel, -dt * 3.5, dt * 3.5);
    d.angel.rotation.y = d.grund + d.winkel * d.richtung;
    if (!d.auf && d.winkel === 0 && !d.body.world) {   // Ganz zu: Jetzt ist sie fest – RUMS
      welt.addBody(d.body); sichtBlocker.push(d.blatt);
      ton(90, 0, 0.15, 'sine', 0.4 * lautBei({ x: d.x, y: d.basis + 1, z: d.z }), 50);
    }
  }
}
function geschlosseneTuer(x, z, y, weite) {   // Ist hier in der Nähe eine zue Tür?
  for (const d of tuerListe) if (!d.auf && Math.abs(y - d.basis) < 1.2 && abstand2D(x, z, d.x, d.z) < weite) return d;
  return null;
}
function tuerBeiMir() {   // Die nächste Tür, die du mit E bedienen kannst
  const p = spielerKoerper.position;
  let beste = null, bestD = 2.1;
  for (const d of tuerListe) {
    const ab = abstand2D(p.x, p.z, d.x, d.z);
    if (ab < bestD && Math.abs(p.y - d.basis - 0.5) < 1.4) { beste = d; bestD = ab; }
  }
  return beste;
}

// ----- 🌲 Der Wald draußen -----
const grasTextur = malTextur(256, 256, (g, b, h) => {
  g.fillStyle = '#1b2716'; g.fillRect(0, 0, b, h);
  for (let k = 0; k < 2600; k++) { g.fillStyle = ['#283a1f', '#141f0e', '#30442a', '#22301a'][k % 4]; g.fillRect(Math.random() * b, Math.random() * h, 2, 4 + Math.random() * 6); }   // Grashalme
  for (let k = 0; k < 45; k++) { g.fillStyle = 'rgba(80,55,30,0.45)'; g.beginPath(); g.arc(Math.random() * b, Math.random() * h, 3 + Math.random() * 8, 0, 7); g.fill(); }   // Altes Laub
});
// 🌱🌼 Gras und Wildblumen draußen (nur zum Anschauen – darum mit Math.random, das ändert nichts am Haus)
const windZeit = { value: 0 };   // Damit sich das Gras im Wind wiegt (wird jedes Bild weitergezählt)
function windig(mat, staerke) {   // Bringt einem Material bei, im Wind hin und her zu schwingen (oben mehr als unten)
  mat.onBeforeCompile = sh => {
    sh.uniforms.wind = windZeit;
    // (Gerechnet in der Welt: Je höher über dem Boden, desto mehr schwingt es – so schwingen Stiel und Blüte genau gleich)
    sh.vertexShader = 'uniform float wind;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = instanceMatrix * vec4(transformed, 1.0);
      float h = max(mvPosition.y, 0.0);
      mvPosition.x += sin(wind * 1.6 + mvPosition.x * 0.35 + mvPosition.z * 0.21) * h * ${staerke.toFixed(2)};
      mvPosition.z += cos(wind * 1.2 + mvPosition.z * 0.3 + mvPosition.x * 0.1) * h * ${(staerke * 0.6).toFixed(2)};
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  mat.customProgramCacheKey = () => 'wind' + staerke;   // (Jede Wind-Stärke bekommt ihr eigenes Shader-Programm)
  return mat;
}
function grasBueschelGeo() {   // Ein Büschel aus 7 spitzen Halmen, unten dunkel, oben hellgrün
  const pos = [], farbe = [], unten = new THREE.Color('#132010'), oben = new THREE.Color('#4d7a2c');
  for (let k = 0; k < 7; k++) {
    const w = Math.random() * Math.PI * 2, r = Math.random() * 0.12, x = Math.cos(w) * r, z = Math.sin(w) * r;
    const b = 0.035, kipp = (Math.random() - 0.5) * 0.25, h = 0.6 + Math.random() * 0.5;
    const qx = Math.cos(w + 1.57) * b, qz = Math.sin(w + 1.57) * b;
    pos.push(x - qx, 0, z - qz, x + qx, 0, z + qz, x + Math.cos(w) * kipp, h, z + Math.sin(w) * kipp);
    const spitze = oben.clone().offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08);
    farbe.push(unten.r, unten.g, unten.b, unten.r, unten.g, unten.b, spitze.r, spitze.g, spitze.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farbe, 3));
  geo.computeVertexNormals();
  return geo;
}
function baueWiese(B, T, M) {
  const ok = (x, z) => {
    if (x > -0.4 && x < B + 0.4 && z > -0.4 && z < T + 0.4) return false;                      // Nicht im Haus
    if (x < -M + 0.4 || x > B + M - 0.4 || z < -M + 0.4 || z > T + M - 0.4) return false;     // Nicht hinterm Zaun
    if (schuppenBei(x, z, 0.3) || imParkplatz(x, z, 0.2)) return false;                         // Nicht im Gartenhäuschen, nicht auf dem Parkplatz
    return !(haus.baeume || []).some(b => abstand2D(x, z, b.x, b.z) < 0.4);                    // Nicht im Baumstamm
  };
  const platz = () => { for (let v = 0; v < 30; v++) { const x = -M + Math.random() * (B + 2 * M), z = -M + Math.random() * (T + 2 * M); if (ok(x, z)) return { x, z }; } return null; };
  const hilf = new THREE.Object3D();
  // 1) Gras
  const grasMat = windig(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), 0.12);
  const gras = new THREE.InstancedMesh(grasBueschelGeo(), grasMat, GRAS_ANZAHL);
  let n = 0;
  for (let k = 0; k < GRAS_ANZAHL; k++) {
    const p = platz(); if (!p) continue;
    const g = 0.45 + Math.random() * 0.6;
    hilf.position.set(p.x, 0, p.z); hilf.rotation.set(0, Math.random() * 6.3, 0); hilf.scale.set(g * 1.3, g, g * 1.3);
    hilf.updateMatrix(); gras.setMatrixAt(n++, hilf.matrix);
  }
  gras.count = n; gras.receiveShadow = true; hausGruppe.add(gras);
  // 2) Wildblumen: in kleinen Wiesen (immer ein paar Sorten zusammen) und einzeln
  const blumen = [];
  for (let w = 0; w < BLUMEN_WIESEN; w++) {
    const mitte = platz(); if (!mitte) continue;
    const sorten = [0, 1, 2].map(() => BLUMEN_FARBEN[Math.floor(Math.random() * BLUMEN_FARBEN.length)]), anzahl = 10 + Math.floor(Math.random() * 14);
    for (let k = 0; k < anzahl; k++) {
      const r = Math.sqrt(Math.random()) * 1.8, a = Math.random() * 6.3, x = mitte.x + Math.cos(a) * r, z = mitte.z + Math.sin(a) * r;
      if (ok(x, z)) blumen.push({ x, z, farbe: sorten[k % 3] });
    }
  }
  for (let k = 0; k < BLUMEN_EINZELN; k++) { const p = platz(); if (p) blumen.push({ ...p, farbe: BLUMEN_FARBEN[Math.floor(Math.random() * BLUMEN_FARBEN.length)] }); }
  const stielMat = windig(new THREE.MeshStandardMaterial({ color: '#2f5a22', roughness: 1 }), 0.25);
  const bluetenMat = windig(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, emissive: '#222222', side: THREE.DoubleSide }), 0.25);
  const mitteMat = windig(new THREE.MeshStandardMaterial({ color: '#ffcc33', roughness: 0.8 }), 0.25);
  const stielGeo = new THREE.CylinderGeometry(0.008, 0.012, 1, 4).translate(0, 0.5, 0);
  const bluetenGeo = new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2);   // 6 Blütenblätter (von oben ein Sechseck)
  const mitteGeo = new THREE.SphereGeometry(0.3, 6, 4).translate(0, 0.08, 0);
  const stiele = new THREE.InstancedMesh(stielGeo, stielMat, blumen.length);
  const blueten = new THREE.InstancedMesh(bluetenGeo, bluetenMat, blumen.length);
  const mitten = new THREE.InstancedMesh(mitteGeo, mitteMat, blumen.length);
  const farbe = new THREE.Color(), spitze = new THREE.Vector3();
  blumen.forEach((b, k) => {
    const h = 0.25 + Math.random() * 0.3, r = 0.045 + Math.random() * 0.035;
    hilf.position.set(b.x, 0, b.z); hilf.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * 6.3, (Math.random() - 0.5) * 0.25);
    hilf.scale.set(1, h, 1); hilf.updateMatrix(); stiele.setMatrixAt(k, hilf.matrix);
    spitze.set(0, 1, 0).applyMatrix4(hilf.matrix);   // Wo ist das obere Ende vom Stiel?
    hilf.position.copy(spitze); hilf.scale.setScalar(r); hilf.updateMatrix();
    blueten.setMatrixAt(k, hilf.matrix); mitten.setMatrixAt(k, hilf.matrix);   // Blüte oben auf den Stiel
    blueten.setColorAt(k, farbe.set(b.farbe));
  });
  for (const m of [stiele, blueten, mitten]) hausGruppe.add(m);
}
const imHaus = (x, z) => x > 0 && x < haus.breit * RAUM && z > 0 && z < haus.tief * RAUM;
// Schneidet die Strecke von a nach b das Rechteck? (Liang-Barsky – so prüft man das schnell)
function streckeSchneidet(a, b, x1, z1, x2, z2) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - x1], [dx, x2 - a.x], [-dz, a.z - z1], [dz, z2 - a.z]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
function umsHaus(pos, ziel) {   // Draußen: Steht das Haus im Weg? Dann außen um die Ecken herum laufen (der kürzeste Weg)
  const B = haus.breit * RAUM, T = haus.tief * RAUM, r = 1.8, k = 0.6;
  const frei = (a, b) => !streckeSchneidet(a, b, -k, -k, B + k, T + k);
  if (frei(pos, ziel)) return ziel;
  const ecken = [{ x: -r, z: -r }, { x: B + r, z: -r }, { x: B + r, z: T + r }, { x: -r, z: T + r }];
  const ab = (a, b) => abstand2D(a.x, a.z, b.x, b.z);
  let beste = null, bestW = Infinity;
  for (const e1 of ecken) {
    if (ab(pos, e1) < 0.6 || !frei(pos, e1)) continue;   // (An dieser Ecke sind wir schon)
    let w = Infinity;
    if (frei(e1, ziel)) w = ab(pos, e1) + ab(e1, ziel);
    else for (const e2 of ecken) if (e2 !== e1 && frei(e1, e2) && frei(e2, ziel)) w = Math.min(w, ab(pos, e1) + ab(e1, e2) + ab(e2, ziel));   // Zwei Ecken
    if (w < bestW) { bestW = w; beste = e1; }
  }
  return beste ? { x: beste.x, y: 0, z: beste.z } : ziel;
}
function naechsteHaustuer(p) {
  let beste = null, bestD = Infinity;
  for (const a of haus.aussenTuerListe || []) { const d = abstand2D(p.x, p.z, a.aussen.x, a.aussen.z); if (d < bestD) { bestD = d; beste = a; } }
  return beste;
}
function waldPlatz(zz = zufall, zr = rnd) {   // Ein freier Platz im Wald (nicht in einem Baum, nicht am Haus, nicht am Zaun)
  const B = haus.breit * RAUM, T = haus.tief * RAUM, M = WALD_RAND;
  for (let v = 0; v < 60; v++) {
    const x = zz(-M + 2, B + M - 2), z = zz(-M + 2, T + M - 2);
    if (x > -3 && x < B + 3 && z > -3 && z < T + 3) continue;
    if ((haus.schuppen || []).some(S => x > S.x1 - 1.5 && x < S.x2 + 1.5 && z > S.z1 - 1.5 && z < S.z2 + 1.5)) continue;   // Nicht im Gartenhäuschen
    if ((haus.baeume || []).some(b => abstand2D(x, z, b.x, b.z) < 1.4)) continue;
    if (schuppenBei(x, z, 1.5) || imParkplatz(x, z, 2)) continue;
    return { x, z };
  }
  return null;
}
const schuppenTextur = malTextur(128, 128, (g, b, h) => {   // Alte, verwitterte Holzbretter
  for (let k = 0; k < 8; k++) { g.fillStyle = ['#3d4a3a', '#36423a', '#414d3c', '#3a4536'][k % 4]; g.fillRect(k * 16, 0, 16, h); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(k * 16, 0, 2, h); }
  for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(20,15,10,0.25)'; g.fillRect(Math.random() * b, Math.random() * h, 1, 6 + Math.random() * 20); }
});
const schuppenMat = new THREE.MeshStandardMaterial({ map: schuppenTextur, roughness: 1 });
function schuppenBei(x, z, rand = 0) {   // In welchem Gartenhäuschen ist dieser Punkt? (oder null)
  for (const S of haus.schuppen || []) if (x > S.x1 - rand && x < S.x2 + rand && z > S.z1 - rand && z < S.z2 + rand) return S;
  return null;
}
function baueGartenhaus(S) {
  const { x1, z1, x2, z2, seite } = S, tb = 1.4;   // tb = Türbreite
  wandStueck(x1, z1, x2, z1, 0, seite === 'n' ? tb : 0, schuppenMat);
  wandStueck(x1, z2, x2, z2, 0, seite === 's' ? tb : 0, schuppenMat);
  wandStueck(x1, z1, x1, z2, 0, seite === 'w' ? tb : 0, schuppenMat);
  wandStueck(x2, z1, x2, z2, 0, seite === 'o' ? tb : 0, schuppenMat);
  const b = x2 - x1, t = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  bodenFlaeche({ x0: x1, z0: z1 }, x1, z1, x2, z2, 0.01, new THREE.MeshStandardMaterial({ map: BOEDEN.holz, roughness: 0.9 }));   // Holzboden
  // Spitzes Dach (eine Pyramide mit 4 Ecken)
  const dach = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 4), new THREE.MeshStandardMaterial({ color: '#4a1f1a', roughness: 0.9 }));
  dach.rotation.y = Math.PI / 4; dach.scale.set((b / 2 + 0.4) / 0.7071, 1, (t / 2 + 0.4) / 0.7071);
  dach.position.set(cx, WAND_HOEHE + 0.75, cz); dach.castShadow = true; hausGruppe.add(dach);
  // Fenster auf der Rückseite (innen und außen)
  const hinten = { n: 's', s: 'n', w: 'o', o: 'w' }[seite];
  const [fx, fz, dreh] = { n: [cx, z1, Math.PI], s: [cx, z2, 0], w: [x1, cz, -Math.PI / 2], o: [x2, cz, Math.PI / 2] }[hinten];
  for (const aus of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ map: fensterTextur }));
    f.position.set(fx + Math.sin(dreh) * 0.16 * aus, 1.7, fz + Math.cos(dreh) * 0.16 * aus); f.rotation.y = aus > 0 ? dreh : dreh + Math.PI; hausGruppe.add(f);
  }
  // Ein Regal an der Rückwand und die wertvollen Schätze
  const wertvoll = VILLA_SCHAETZE.filter(x => x.wert[0] >= WERTVOLL_AB);
  for (let k = 0; k < GARTENHAUS_SCHAETZE; k++) {
    const quer = (k - (GARTENHAUS_SCHAETZE - 1) / 2) * 1.5, typ = gewichtetWaehlen(wertvoll);
    const px = cx - S.nx * 0.9 + (S.nz ? quer : 0), pz = cz - S.nz * 0.9 + (S.nx ? quer : 0);
    neuerSchatz(typ, px, typ.groesse[1] / 2 + 0.05, pz);
  }
  const kiste = (x, z) => festerKlotz(x, 0.3, z, 0.6, 0.6, 0.6, kistenMat);   // Alte Kisten in den Ecken
  kiste(x1 + 0.55, z1 + 0.55); kiste(x2 - 0.55, z2 - 0.55);
}
// =====================================================================
// ===== 🧪 Der Keller: dunkle Steinmauern, Fässer, Weinregale – und das Labor vom Chemiker =====
// =====================================================================
const kellerSteinTextur = malTextur(128, 128, (g, b, h) => {   // Alte Backsteine mit Moos
  g.fillStyle = '#2e2a26'; g.fillRect(0, 0, b, h);
  for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) {
    const x = k * 32 + (r % 2) * 16, y = r * 16;
    g.fillStyle = ['#5a4a3e', '#4f4238', '#62513f', '#544a42'][(r * 3 + k) % 4];
    g.fillRect(x + 1, y + 1, 30, 14); g.fillRect(x - 127, y + 1, 30, 14);
  }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(60,90,40,${0.15 + Math.random() * 0.2})`; g.fillRect(Math.random() * b, Math.random() * h, 3 + Math.random() * 8, 2 + Math.random() * 4); }
});
// Das Labyrinth: Der Keller ist in Zellen eingeteilt (wie ein Schachbrett). Zwischen zwei Zellen ist eine Wand – oder ein Durchgang.
const kellerKante = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
function kellerZelle(x, z) {
  const K = haus.keller;
  return begrenzt(Math.floor((z - K.z1) / K.zelle), 0, K.nz - 1) * K.nx + begrenzt(Math.floor((x - K.x1) / K.zelle), 0, K.nx - 1);
}
function kellerZellMitte(c) {
  const K = haus.keller;
  return { x: K.x1 + (c % K.nx + 0.5) * K.zelle, y: K.boden, z: K.z1 + (Math.floor(c / K.nx) + 0.5) * K.zelle };
}
function kellerNachbarn(c) {   // Zellen daneben, zu denen ein Durchgang führt
  const K = haus.keller, x = c % K.nx, z = Math.floor(c / K.nx), liste = [];
  for (const [n, ok] of [[c - 1, x > 0], [c + 1, x < K.nx - 1], [c - K.nx, z > 0], [c + K.nx, z < K.nz - 1]]) if (ok && K.offen.has(kellerKante(c, n)) && !K.gesperrt.has(n)) liste.push(n);   // (Durch die Treppe kann man nicht laufen)
  return liste;
}
// Wohin im Labyrinth als Nächstes? (Breitensuche: der kürzeste Weg durch die Gänge)
function kellerWeg(pos, ziel) {
  const K = haus.keller, a = kellerZelle(pos.x, pos.z), b = kellerZelle(ziel.x, ziel.z);
  if (a === b || K.gesperrt.has(a) || K.gesperrt.has(b)) return ziel;
  const vorher = new Map([[a, -1]]), schlange = [a];
  for (let k = 0; k < schlange.length && !vorher.has(b); k++) for (const n of kellerNachbarn(schlange[k])) if (!vorher.has(n)) { vorher.set(n, schlange[k]); schlange.push(n); }
  if (!vorher.has(b)) return ziel;
  let n = b;
  while (vorher.get(n) !== a) n = vorher.get(n);
  // Steht man schräg zum Durchgang? Dann erst in die Mitte der eigenen Zelle (sonst bleibt man an der Mauerecke hängen)
  const am = kellerZellMitte(a), quer = Math.abs(n - a) === 1 ? Math.abs(pos.z - am.z) : Math.abs(pos.x - am.x);
  return quer > 0.45 ? am : kellerZellMitte(n);
}
function baueKeller() {
  const K = haus.keller, b = K.boden, d = K.decke, hoch = d - b, t = K.treppe;
  const P = treppenPunkte(t);
  const wandTex = kellerSteinTextur.clone(); wandTex.needsUpdate = true; wandTex.repeat.set(4, 1);
  const wandMat = new THREE.MeshStandardMaterial({ map: wandTex, roughness: 1 });
  // 1) Mauern rundherum und der Steinboden
  festerKlotz((K.x1 + K.x2) / 2, b + hoch / 2, K.z1, K.x2 - K.x1 + 0.3, hoch, 0.3, wandMat);
  festerKlotz((K.x1 + K.x2) / 2, b + hoch / 2, K.z2, K.x2 - K.x1 + 0.3, hoch, 0.3, wandMat);
  festerKlotz(K.x1, b + hoch / 2, (K.z1 + K.z2) / 2, 0.3, hoch, K.z2 - K.z1, wandMat);
  festerKlotz(K.x2, b + hoch / 2, (K.z1 + K.z2) / 2, 0.3, hoch, K.z2 - K.z1, wandMat);
  const bodenTex = BOEDEN.beton.clone(); bodenTex.needsUpdate = true; bodenTex.repeat.set((K.x2 - K.x1) / 2, (K.z2 - K.z1) / 2);
  bodenFlaeche({ x0: K.x1, z0: K.z1 }, K.x1, K.z1, K.x2, K.z2, b + 0.001, new THREE.MeshStandardMaterial({ map: bodenTex, color: '#8a8478', roughness: 1 }));
  // 2) 🌀 Das Labyrinth ausdenken
  const Z = LABYRINTH_ZELLE, nx = Math.round((K.x2 - K.x1) / Z), nz = Math.round((K.z2 - K.z1) / Z);
  Object.assign(K, { zelle: Z, nx, nz, offen: new Set(), gesperrt: new Set() });
  const nr = (cx, cz) => cz * nx + cx, mitte = c => kellerZellMitte(c);
  for (let c = 0; c < nx * nz; c++) {   // Zellen, in denen die Treppe steht, kann man nicht betreten
    const m = mitte(c);
    if (m.x > t.x0 + TREPPE.von && m.x < t.x0 + TREPPE.bis && m.z > t.z0 && m.z < t.z0 + 2.2) K.gesperrt.add(c);
  }
  const bereich = (cx0, cz0, w, h) => {   // Ein offener Bereich: alle Wände dazwischen fallen weg
    for (let x = cx0; x < cx0 + w; x++) for (let z = cz0; z < cz0 + h; z++) {
      if (x + 1 < cx0 + w) K.offen.add(kellerKante(nr(x, z), nr(x + 1, z)));
      if (z + 1 < cz0 + h) K.offen.add(kellerKante(nr(x, z), nr(x, z + 1)));
    }
  };
  // Vor der Treppe: ein kleiner Vorraum (so breit wie der Raum oben, 2 Zellen tief)
  const tcx = Math.round((t.x0 - K.x1) / Z), tcz = Math.round((t.z0 - K.z1) / Z), tw = Math.round(RAUM / Z);
  bereich(tcx, tcz, tw, 2);
  for (let x = tcx; x < tcx + tw; x++) for (const g of K.gesperrt) {   // Zwischen Treppe und Vorraum keine Wand (sonst kommt man nicht runter)
    if (g === nr(x, tcz)) K.offen.add(kellerKante(g, nr(x, tcz + 1)));
  }
  // Das Labor: 3 × 3 Zellen in der Ecke, die am weitesten von der Treppe weg ist
  const ecken = [[0, 0], [nx - 3, 0], [0, nz - 3], [nx - 3, nz - 3]];
  const [lcx, lcz] = ecken.reduce((a, e) => abstand2D(e[0] + 1.5, e[1] + 1.5, tcx + 1, tcz + 1) > abstand2D(a[0] + 1.5, a[1] + 1.5, tcx + 1, tcz + 1) ? e : a);
  bereich(lcx, lcz, 3, 3);
  const imLabor = c => { const x = c % nx, z = Math.floor(c / nx); return x >= lcx && x < lcx + 3 && z >= lcz && z < lcz + 3; };
  // Gänge graben: Von der Treppe aus kreuz und quer, bis jede Zelle erreicht ist (wie ein Maulwurf mit Rückwärtsgang)
  const start = kellerZelle(P.vor.x, P.vor.z), besucht = new Set([start]), stapel = [start];
  const daneben = c => { const x = c % nx, z = Math.floor(c / nx); return [[c - 1, x > 0], [c + 1, x < nx - 1], [c - nx, z > 0], [c + nx, z < nz - 1]].filter(([n, ok]) => ok && !K.gesperrt.has(n)).map(([n]) => n); };
  while (stapel.length) {
    const c = stapel[stapel.length - 1], frei = daneben(c).filter(n => !besucht.has(n));
    if (!frei.length) { stapel.pop(); continue; }
    const n = auswahl(frei);
    K.offen.add(kellerKante(c, n)); besucht.add(n); stapel.push(n);
  }
  // Ein paar Abkürzungen (dann gibt es mehrere Wege – wichtig, um Doktor Schorsch zu entkommen!)
  for (let c = 0; c < nx * nz; c++) for (const n of daneben(c)) if (n > c && !K.offen.has(kellerKante(c, n)) && rnd() < LABYRINTH_ABKUERZUNGEN) K.offen.add(kellerKante(c, n));
  // 3) Die Mauern bauen (nebeneinanderliegende Wandstücke werden zu einer langen Mauer zusammengefasst)
  const zu = (c, n) => !K.offen.has(kellerKante(c, n)) && !(K.gesperrt.has(c) && K.gesperrt.has(n));
  for (let z = 1; z < nz; z++) {   // Mauern entlang x
    let von = -1;
    for (let x = 0; x <= nx; x++) {
      const geschlossen = x < nx && zu(nr(x, z - 1), nr(x, z));
      if (geschlossen && von < 0) von = x;
      if (!geschlossen && von >= 0) { festerKlotz(K.x1 + (von + x) / 2 * Z, b + hoch / 2, K.z1 + z * Z, (x - von) * Z + 0.3, hoch, 0.3, wandMat); von = -1; }
    }
  }
  for (let x = 1; x < nx; x++) {   // Mauern entlang z
    let von = -1;
    for (let z = 0; z <= nz; z++) {
      const geschlossen = z < nz && zu(nr(x - 1, z), nr(x, z));
      if (geschlossen && von < 0) von = z;
      if (!geschlossen && von >= 0) { festerKlotz(K.x1 + x * Z, b + hoch / 2, K.z1 + (von + z) / 2 * Z, 0.3, hoch, (z - von) * Z + 0.3, wandMat); von = -1; }
    }
  }
  // 4) Das Labor von Doktor Schorsch
  const sx = lcx === 0 ? 1 : -1, sz = lcz === 0 ? 1 : -1, ex = sx > 0 ? K.x1 : K.x2, ez = sz > 0 ? K.z1 : K.z2;
  const lx = ex + sx * 3.6, lz = ez + sz * 3.6;   // Mitte vom Labor
  const tischMat = new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.7 });
  const tisch = (x, z, breit, tief) => {   // Ein langer Labortisch voller bunter Flaschen
    festerKlotz(x, b + 0.45, z, breit, 0.9, tief, tischMat, false);
    for (let k = 0; k < Math.max(breit, tief) * 2.2; k++) {
      const farbe = auswahl(['#5dff4a', '#c04dff', '#4dc3ff', '#ff8a3d', '#ff4d6d', '#fff36b']);
      const hoehe = zufall(0.12, 0.3), fx = x + (breit > tief ? zufall(-breit / 2 + 0.2, breit / 2 - 0.2) : zufall(-0.2, 0.2)), fz = z + (tief > breit ? zufall(-tief / 2 + 0.2, tief / 2 - 0.2) : zufall(-0.2, 0.2));
      const glas = new THREE.Mesh(rnd() < 0.5 ? new THREE.CylinderGeometry(0.05, 0.07, hoehe, 8) : new THREE.SphereGeometry(hoehe * 0.45, 8, 6), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.85 }));
      glas.position.set(fx, b + 0.9 + hoehe / 2, fz); hausGruppe.add(glas);
    }
  };
  tisch(ex + sx * 0.6, ez + sz * 3.2, 0.9, 4.6);
  tisch(ex + sx * 3.4, ez + sz * 0.6, 4.6, 0.9);
  const kx = lx + sx * 0.6, kz = lz + sz * 0.6;   // Der große blubbernde Kessel
  const kessel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 0.8, 18, 1, true), new THREE.MeshStandardMaterial({ color: '#1d1d1f', metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
  kessel.position.set(kx, b + 0.4, kz); kessel.castShadow = true; hausGruppe.add(kessel);
  festerKoerper(kx, b + 0.4, kz, 1.3, 0.8, 1.3);
  const brei = new THREE.Mesh(new THREE.CircleGeometry(0.72, 18), new THREE.MeshBasicMaterial({ color: '#4dff5e' }));
  brei.rotation.x = -Math.PI / 2; brei.position.set(kx, b + 0.7, kz); hausGruppe.add(brei);
  for (let k = 0; k < 6; k++) {   // Blasen steigen auf
    const blase = new THREE.Mesh(new THREE.SphereGeometry(zufall(0.05, 0.11), 8, 6), new THREE.MeshBasicMaterial({ color: '#9dff8a', transparent: true, opacity: 0.8 }));
    blase.userData.blubber = { x: kx + zufall(-0.45, 0.45), z: kz + zufall(-0.45, 0.45), y: b + 0.7, versatz: zufall(0, 3) };
    hausGruppe.add(blase); haus.bewegteDeko.push(blase);
  }
  for (let k = 0; k < 5; k++) {   // Feuer unter dem Kessel
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), new THREE.MeshBasicMaterial({ color: k % 2 ? '#ff8a3d' : '#ffd166' }));
    f.position.set(kx + Math.cos(k * 1.3) * 0.35, b + 0.12, kz + Math.sin(k * 1.3) * 0.35); f.userData.feuer = true;
    hausGruppe.add(f); haus.bewegteDeko.push(f);
  }
  lampeHinzu(kx, b + 1.6, kz, '#57ff7a', 2.2, 13, true);   // Grünes Leuchten aus dem Kessel
  const schild = schildMesh('🐷 LABOR VON DR. SCHORSCH – BETRETEN VERBOTEN!', 3.2, 0.5);
  schild.position.set(ex + sx * 0.17, b + 1.9, ez + sz * 3.2); schild.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; hausGruppe.add(schild);
  K.labor = { x: lx + sx * 1.6, z: lz - sz * 0.4, winkel: Math.atan2(kx - (lx + sx * 1.6), kz - (lz - sz * 0.4)) };
  K.laborMitte = { x: lx, z: lz };
  // 5) Sackgassen: Da liegen die Schätze (und alte Fässer)
  const sackgassen = mischen([...Array(nx * nz).keys()].filter(c => !K.gesperrt.has(c) && !imLabor(c) && kellerNachbarn(c).length === 1 && abstand2D(mitte(c).x, mitte(c).z, P.vor.x, P.vor.z) > 4));
  const fassMat = new THREE.MeshStandardMaterial({ color: '#5b3b22', roughness: 0.85 });
  const fass = (x, z) => {
    const g = new THREE.Group();
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 14), fassMat); koerper.castShadow = true; g.add(koerper);
    for (const y of [-0.35, 0.35]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 16), metallGrauMat); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
    g.position.set(x, b + 0.5, z); hausGruppe.add(g);
    festerKoerper(x, b + 0.5, z, 0.85, 1.0, 0.85);
  };
  sackgassen.forEach((c, k) => {
    const m = mitte(c), [n] = kellerNachbarn(c), o = mitte(n);
    const hx = Math.sign(m.x - o.x) * 0.55, hz = Math.sign(m.z - o.z) * 0.55;   // Ein Stück nach hinten (weg vom Eingang)
    if (k < KELLER_SCHAETZE) { const typ = gewichtetWaehlen(VILLA_SCHAETZE); neuerSchatz(typ, m.x + hx, b + typ.groesse[1] / 2 + 0.05, m.z + hz); }
    else if (rnd() < 0.6) fass(m.x + hx * 1.1 + (hz ? zufall(-0.5, 0.5) : 0), m.z + hz * 1.1 + (hx ? zufall(-0.5, 0.5) : 0));
  });
  // 6) Leuchtende Pilze an den Wänden (so findet man sich ein bisschen zurecht)
  const pilzFarben = ['#6bffb0', '#7fd8ff', '#c48bff'];
  for (let k = 0; k < 45; k++) {
    const c = zufallGanz(0, nx * nz - 1);
    if (K.gesperrt.has(c) || imLabor(c)) continue;
    const m = mitte(c), farbe = auswahl(pilzFarben), ecke = [zufall(-0.85, 0.85), auswahl([-0.95, 0.95])], quer = rnd() < 0.5;
    const px = m.x + (quer ? ecke[1] : ecke[0]), pz = m.z + (quer ? ecke[0] : ecke[1]);
    for (let p = 0; p < 3; p++) {
      const h = zufall(0.06, 0.16), stiel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, h, 5), new THREE.MeshBasicMaterial({ color: '#d8e6d0' }));
      const ox = px + zufall(-0.15, 0.15), oz = pz + zufall(-0.15, 0.15);
      stiel.position.set(ox, b + h / 2, oz); hausGruppe.add(stiel);
      const hut = new THREE.Mesh(new THREE.SphereGeometry(zufall(0.04, 0.07), 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: farbe }));
      hut.position.set(ox, b + h, oz); hausGruppe.add(hut);
    }
  }
  // Eine schwache, flackernde Glühbirne im Vorraum an der Treppe
  lampeHinzu(P.vor.x + 1.5, d - 0.3, P.vor.z + 1.5, '#ffb070', 0.9, 9, true);
}
// =====================================================================
// ===== 🚌 Der ARAG-Einsatzbus (die Lobby), die Abgabe und der Parkplatz =====
// =====================================================================
// Das Firmenlogo: ein Roboterkopf mit Bildschirm-Gesicht und daneben ARAG (s = Größe in Pixeln)
// =====================================================================
// ===== 📚 DIE VERFLUCHTE SCHULE (die zweite Map!) =====
// =====================================================================
// Im Lobby-Bus suchst du mit dem Karten-Schalter aus, wohin die Fahrt geht: 🏚️ Spukvilla oder 📚 Schule.
// Die Schule liegt weit weg von der Villa (bei x = SCHUL_ORT). Vorne ist der Schulhof mit Bus und Abgabe,
// dahinter das Schulhaus: lange Flure mit Spinden, Klassenzimmer, Bibliothek, Turnhalle, Lehrerzimmer ...
// Und Herr Kreidemann 👨‍🏫 ist IMMER NOCH DA. Erwischt er dich, musst du nachsitzen – und einen Test schreiben!
// Alles ist in Zellen eingeteilt (wie ein Schachbrett). Monster und Helfer finden ihren Weg von Zelle zu Zelle.
const SCHUL_ORT = 300;   // Hier fängt das Schulhaus an (weit weg von der Villa)
const SCHULE = {
  zelle: 3,             // So groß ist ein Feld (in Metern)
  hof: 7,               // So viele Felder breit ist der Schulhof vor dem Haus
  breit: 20, tief: 17,  // So viele Felder hat das Schulhaus (nach hinten / zur Seite) – NICHT ändern, der Plan passt genau!
  hoehe: 3.2,           // So hoch sind die Räume
  eingang: 8,           // In welcher Reihe der Eingang ist
  tuer: 1.6,            // So breit sind die Türen
  schaetze: 50,         // So viele Schätze liegen am Anfang in der Schule
  nebenTuer: 0.35,      // So oft hat ein Raum eine zweite Tür (0 bis 1) – gut zum Abhauen!
};
const SCHUL_MONSTER = { lehrer: 1, lauscher: 1, formwandler: 1 };   // Diese Monster sind in der Schule
const SCHUL_SCHATZ_ANTEIL = 0.7;   // So viele Schätze sind Schul-Schätze – der Rest sind andere
const SCHUL_ANDERE = ['globus', 'pokal', 'uhr', 'teddy', 'sanduhr', 'geige', 'spieluhr', 'bild', 'kristall'];
const TEST_FRAGEN = 3;   // 📝 So viele Fragen hat der Nachsitz-Test
const TEST_ZEIT = 20;    // So viele Sekunden hast du für jede Frage
const LEHRER_RUHE = 12;
const LEHRER_HUEPFT = true;        // 🦘 true = Herr Kreidemann hüpft (Sprung – Landung – kurz stehen – Sprung ...)
const LEHRER_SPRUNG = { hoehe: 0.35, takt: 0.95, jagdTakt: 0.6, inDerLuft: 0.5 };   // takt: so lange dauert ein Hüpfer (Sekunden) · inDerLuft: so viel davon ist er in der Luft  // So lange lässt der Lehrer alle in Ruhe, nachdem er jemanden erwischt hat
const KARTEN = {
  villa: { name: 'Spukvilla', emoji: '🏚️', farbe: '#c9c3ff' },
  schule: { name: 'Verfluchte Schule', emoji: '📚', farbe: '#7cc4ff' },
};
let kartenWahl = 'villa';   // Wohin fährt der Bus? (wird gespeichert)
try { if (localStorage.getItem('arag-karte') === 'schule') kartenWahl = 'schule'; } catch (e) { /* egal */ }

// ----- Felder, Wege -----
const schulKante = (a, b) => a < b ? a * 100000 + b : b * 100000 + a;
const imSchulGebiet = (x, z) => !!haus && !!haus.schule && x > haus.schule.x0 && x < haus.schule.x1 && z > haus.schule.z0 && z < haus.schule.z1;
const imSchulhaus = (x, z) => imSchulGebiet(x, z) && x > SCHUL_ORT;   // Drinnen (nicht auf dem Schulhof)
function schulZelle(x, z) {
  const M = haus.schule;
  return begrenzt(Math.floor((z - M.z0) / M.zelle), 0, M.nz - 1) * M.nx + begrenzt(Math.floor((x - M.x0) / M.zelle), 0, M.nx - 1);
}
function schulMitte(c) {
  const M = haus.schule;
  return { x: M.x0 + (c % M.nx + 0.5) * M.zelle, y: 0, z: M.z0 + (Math.floor(c / M.nx) + 0.5) * M.zelle };
}
function schulNachbarn(c, auchGesperrt = false) {   // Felder daneben, zu denen ein Durchgang führt
  const M = haus.schule, x = c % M.nx, z = Math.floor(c / M.nx), liste = [];
  for (const [n, ok] of [[c - 1, x > 0], [c + 1, x < M.nx - 1], [c - M.nx, z > 0], [c + M.nx, z < M.nz - 1]]) {
    if (ok && M.offen.has(schulKante(c, n)) && (auchGesperrt || !M.gesperrt.has(n))) liste.push(n);
  }
  return liste;
}
function schulAbstaende(start) {   // Wie viele Felder ist jedes Feld von start weg? (Breitensuche)
  const tiefe = new Map([[start, 0]]), schlange = [start];
  for (let k = 0; k < schlange.length; k++) for (const n of schulNachbarn(schlange[k])) if (!tiefe.has(n)) { tiefe.set(n, tiefe.get(schlange[k]) + 1); schlange.push(n); }
  return tiefe;
}
function schulWeg(pos, ziel) {   // Wohin als Nächstes? (der kürzeste Weg durch Flure und Türen)
  const M = haus.schule, a = schulZelle(pos.x, pos.z), b = schulZelle(ziel.x, ziel.z);
  if (a === b || M.gesperrt.has(a) || M.gesperrt.has(b)) return ziel;
  const vorher = new Map([[a, -1]]), schlange = [a];
  for (let k = 0; k < schlange.length && !vorher.has(b); k++) for (const n of schulNachbarn(schlange[k])) if (!vorher.has(n)) { vorher.set(n, schlange[k]); schlange.push(n); }
  if (!vorher.has(b)) return ziel;
  let n = b;
  while (vorher.get(n) !== a) n = vorher.get(n);
  // Nicht genau vor der Tür? Dann erst in die Mitte vom eigenen Feld (sonst bleibt man am Türrahmen hängen)
  const am = schulMitte(a), quer = Math.abs(n - a) === 1 ? Math.abs(pos.z - am.z) : Math.abs(pos.x - am.x);
  return quer > 0.3 ? am : schulMitte(n);
}
function schulZufallsZiel(m) {   // Monster wandern ein paar Felder weiter (meistens drinnen, selten auf den Hof)
  const M = haus.schule;
  let c = schulZelle(m.x, m.z);
  for (let k = 0, n = 2 + Math.floor(Math.random() * 6); k < n; k++) {
    const nb = schulNachbarn(c).filter(x => x % M.nx >= M.hof || Math.random() < 0.15);
    if (!nb.length) break;
    c = nb[Math.floor(Math.random() * nb.length)];
  }
  const p = schulMitte(c);
  return { x: p.x + zufall(-0.3, 0.3), y: 0, z: p.z + zufall(-0.3, 0.3) };
}
function schulWeitWeg(m) {   // Ein Feld im Schulhaus, weit weg (für den Formwandler, wenn er abhaut)
  const M = haus.schule;
  for (let v = 0; v < 60; v++) {
    const c = Math.floor(Math.random() * M.nx * M.nz);
    if (c % M.nx < M.hof || M.gesperrt.has(c)) continue;
    const p = schulMitte(c);
    if (abstand2D(p.x, p.z, m.x, m.z) > 18) return p;
  }
  return schulMitte(M.start);
}
function schulSchatzTyp() {   // Was für ein Schatz liegt in der Schule?
  return rnd() < SCHUL_SCHATZ_ANTEIL ? gewichtetWaehlen(SCHAETZE.filter(t => t.schule)) : gewichtetWaehlen(SCHAETZE.filter(t => SCHUL_ANDERE.includes(t.id)));
}
function schulSchatzPlatz(zz) {   // Ein Platz für einen Schatz: meistens in einem Raum, manchmal im Flur
  const M = haus.schule;
  for (let v = 0; v < 80; v++) {
    const c = Math.floor(zz() * M.nx * M.nz);
    if (c % M.nx < M.hof || M.gesperrt.has(c)) continue;
    if (M.flur.has(c) && zz() < 0.8) continue;
    const p = schulMitte(c), s = () => (zz() < 0.5 ? -1 : 1) * (0.45 + zz() * 0.4);
    return { x: p.x + s(), z: p.z + s() };
  }
  return null;
}
function schulRaumBei(x, z) {   // In welchem Raum bist du? (oder null = Flur/Hof)
  return imSchulhaus(x, z) ? haus.schule.raumVon.get(schulZelle(x, z)) || null : null;
}

// ----- Texturen -----
const schulWandTextur = malTextur(256, 256, (g, b, h) => {   // Oben alte beige Farbe mit Flecken, unten grüne Kacheln
  g.fillStyle = '#d6cba6'; g.fillRect(0, 0, b, h);
  for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(70,60,30,${Math.random() * 0.08})`; g.fillRect(Math.random() * b, Math.random() * h * 0.6, 4 + Math.random() * 14, 4 + Math.random() * 18); }
  const y0 = h * 0.6;
  g.fillStyle = '#5f8f7a'; g.fillRect(0, y0, b, h - y0);
  g.strokeStyle = 'rgba(20,40,30,0.55)'; g.lineWidth = 2;
  for (let x = 0; x <= b; x += 32) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, h); g.stroke(); }
  for (let y = y0; y <= h; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(b, y); g.stroke(); }
  g.fillStyle = '#2f4f45'; g.fillRect(0, y0 - 6, b, 8);
});
const linoTextur = malTextur(128, 128, (g, b, h) => {   // Schachbrett-Linoleum im Flur
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#c4bca8' : '#857c69'; g.fillRect(x * 32, y * 32, 32, 32); }
  for (let k = 0; k < 400; k++) { g.fillStyle = 'rgba(40,30,20,0.15)'; g.fillRect(Math.random() * b, Math.random() * h, 2, 2); }
});
const parkettTextur = malTextur(128, 128, (g, b, h) => {   // Holzboden in den Klassen
  for (let y = 0; y < 8; y++) for (let x = 0; x < 2; x++) { g.fillStyle = ['#8a6239', '#7a5530', '#946a3f'][(x + y * 2) % 3]; g.fillRect(x * 64 + (y % 2) * 32, y * 16, 64, 16); }
  g.strokeStyle = 'rgba(30,20,10,0.5)'; for (let y = 0; y <= 8; y++) { g.beginPath(); g.moveTo(0, y * 16); g.lineTo(b, y * 16); g.stroke(); }
});
const deckenPlattenTextur = malTextur(128, 128, (g, b, h) => {   // Weiße Deckenplatten (mit Wasserflecken ...)
  g.fillStyle = '#cfcbc0'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#8f8b80'; g.lineWidth = 3; g.strokeRect(0, 0, b, h); g.beginPath(); g.moveTo(b / 2, 0); g.lineTo(b / 2, h); g.moveTo(0, h / 2); g.lineTo(b, h / 2); g.stroke();
  for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(120,100,50,0.15)'; g.beginPath(); g.arc(Math.random() * b, Math.random() * h, 8 + Math.random() * 14, 0, 7); g.fill(); }
});
const ziegelTextur = malTextur(256, 128, (g, b, h) => {   // Rote Backsteine
  g.fillStyle = '#5a3a30'; g.fillRect(0, 0, b, h);
  for (let y = 0; y < 8; y++) for (let x = -1; x < 8; x++) { g.fillStyle = ['#8b4a3a', '#7d4033', '#95533f', '#6f3a2e'][(x * 3 + y) & 3]; g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14); }
});
const asphaltTextur = malTextur(128, 128, (g, b, h) => {
  g.fillStyle = '#3a3b3e'; g.fillRect(0, 0, b, h);
  for (let k = 0; k < 900; k++) { g.fillStyle = ['#47484c', '#2f3033', '#424347'][k % 3]; g.fillRect(Math.random() * b, Math.random() * h, 2, 2); }
});
const matCache = new Map();
function wiederholMat(tex, rx, ry, extra = {}) {   // Ein Material, dessen Muster rx × ry mal wiederholt wird (wird gemerkt)
  const k = `${tex.uuid}|${Math.round(rx * 2)}|${Math.round(ry * 2)}`;
  if (!matCache.has(k)) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(0.5, Math.round(rx * 2) / 2), Math.max(0.5, Math.round(ry * 2) / 2));
    matCache.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra }));
  }
  return matCache.get(k);
}
const schulWandMat = l => wiederholMat(schulWandTextur, l / 3, 1);
const holzMoebelMat = new THREE.MeshStandardMaterial({ color: '#a8794a', roughness: 0.8 });
const stuhlMat = new THREE.MeshStandardMaterial({ color: '#3d5a80', roughness: 0.7 });
const tafelRahmenMat = new THREE.MeshStandardMaterial({ color: '#6b4a2b', roughness: 0.8 });
const TAFEL_SPRUECHE = ['7 × 8 = ?', 'RUHE!!!', 'NIEMAND VERLÄSST DIE KLASSE', '12 − 5 = ?', 'HAUSAUFGABEN: ALLES', 'NACHSITZEN', 'ICH SEHE DICH', '9 + 6 = ?', 'LERNEN ODER SCHROTT', '3 × 3 × 3 = ?', 'WER SCHWÄTZT, BLEIBT HIER', '¿ 1 + 1 = 3 ?'];

// ----- Bauen -----
function baueSchulKarte() {   // Statt der Villa-Einrichtung: Schulhof, Schulhaus, Nachsitz-Zimmer ...
  const Z = SCHULE.zelle, mz = (SCHULE.eingang + 0.5) * Z;
  haus.parkplatz = []; haus.baeume = [];
  baueSchule();
  // Die Abgabe und der Bus (genau wie bei der Villa: Bus – Abgabe – Eingang)
  haus.laster = { x1: SCHUL_ORT - 8.5, x2: SCHUL_ORT - 4.0, z1: mz - 2.3, z2: mz + 2.2 };
  baueAbgabe();
  baueBus(mz, SCHUL_ORT);
  haus.schuppen = [haus.bus.schuppen];   // 🚌 Rein und raus nur durch die Bustür
  // Gesperrte Felder (da steht der Bus oder die Abgabe – da laufen Monster und Helfer nicht durch)
  const M = haus.schule, B = haus.bus, L = haus.laster;
  for (let c = 0; c < M.nx * M.nz; c++) {
    const p = schulMitte(c);
    if (p.x > B.x1 - 0.5 && p.x < B.x2 + 0.5 && p.z > B.z1 && p.z < B.z2) M.gesperrt.add(c);
    if (p.x > L.x1 - 0.5 && p.x < L.x2 + 0.5 && p.z > L.z1 - 0.8 && p.z < L.z2 + 0.8) M.gesperrt.add(c);
  }
  M.abstand = schulAbstaende(M.start);
  baueNachsitzZimmer();
  // Schätze
  for (let k = 0; k < SCHULE.schaetze; k++) {
    const pl = schulSchatzPlatz(rnd);
    if (!pl) continue;
    const typ = schulSchatzTyp();
    neuerSchatz(typ, pl.x, typ.groesse[1] / 2 + 0.05, pl.z);
  }
  // Monster – der Lehrer im Lehrerzimmer, die anderen weit weg vom Eingang
  const weit = [...M.abstand.entries()].filter(([c, d]) => d >= 8 && c % M.nx >= M.hof).map(([c]) => c);
  const lz = M.raeume.find(R => R.art === 'lehrerzimmer');
  for (const [art, anzahl] of Object.entries(SCHUL_MONSTER)) for (let k = 0; k < anzahl; k++) {
    neuesMonster(art, haus.start);
    const m = monster[monster.length - 1];
    const c = art === 'lehrer' && lz && k === 0 ? lz.mitte : weit.length ? weit[Math.floor(rnd() * weit.length)] : M.start;
    const p = schulMitte(c);
    Object.assign(m, { x: p.x + zufall(-0.3, 0.3), y: 0, z: p.z + zufall(-0.3, 0.3) });
    if (art === 'formwandler') { m.modus = rnd() < 0.5 ? 'tarnBot' : 'tarnSchatz'; m.tarnTyp = tarnSchatzWaehlen(); }
  }
}
const RAUM_INFOS = {
  klasse: { name: 'Klassenzimmer', emoji: '✏️' }, bibliothek: { name: 'Bibliothek', emoji: '📚' }, lehrerzimmer: { name: 'Lehrerzimmer', emoji: '☕' },
  toilette: { name: 'Toiletten', emoji: '🚽' }, musik: { name: 'Musikraum', emoji: '🎵' }, turnhalle: { name: 'Turnhalle', emoji: '🏀' },
};
function baueSchule() {
  const Z = SCHULE.zelle, H = SCHULE.hoehe, D = 0.3, B = SCHULE.breit, hof = SCHULE.hof, nx = hof + B, nz = SCHULE.tief;
  const x0 = SCHUL_ORT - hof * Z, z0 = 0;
  const M = haus.schule = { zelle: Z, nx, nz, x0, z0, x1: x0 + nx * Z, z1: z0 + nz * Z, hof, offen: new Set(), gesperrt: new Set(),
    raeume: [], raumVon: new Map(), flur: new Set(), flimmer: [] };
  const zelle = (lx, z) => z * nx + hof + lx;   // lx: Spalte IM Schulhaus (0 = gleich hinter dem Eingang)
  const imS = (x, z) => x >= hof && x < nx && z >= 0 && z < nz;   // (x = Spalte vom ganzen Plan)
  const auf = (a, b) => M.offen.add(schulKante(a, b)), istAuf = (a, b) => M.offen.has(schulKante(a, b));
  // 1) Der Schulhof: überall offen
  for (let z = 0; z < nz; z++) for (let x = 0; x < hof; x++) {
    if (x + 1 < hof) auf(z * nx + x, z * nx + x + 1);
    if (z + 1 < nz) auf(z * nx + x, (z + 1) * nx + x);
  }
  // 2) Die Flure: drei lange Gänge quer, vier Gänge längs
  const FLUR_REIHEN = [2, 8, 14], FLUR_SPALTEN = [0, 6, 13, 19];
  for (const z of FLUR_REIHEN) for (let lx = 0; lx < B; lx++) M.flur.add(zelle(lx, z));
  for (const lx of FLUR_SPALTEN) for (let z = 2; z <= 14; z++) M.flur.add(zelle(lx, z));
  for (const c of M.flur) {
    if (M.flur.has(c + 1) && (c % nx) + 1 < nx) auf(c, c + 1);
    if (M.flur.has(c + nx)) auf(c, c + nx);
  }
  // 3) Die Räume (zwischen den Fluren). Jeder Raum hat eine Tür zum Flur – manche noch eine zweite.
  const plan = [];
  for (const lx of [0, 5, 10, 15]) { plan.push([lx, 0, 5, 2, 's']); plan.push([lx, 15, 5, 2, 'n']); }
  for (const [lx, b] of [[1, 5], [7, 6], [14, 5]]) {
    plan.push([lx, 3, b, 2, 'n']); plan.push([lx, 5, b, 3, 's']);
    if (lx === 7) plan.push([lx, 9, b, 5, 'n', 'turnhalle']);
    else { plan.push([lx, 9, b, 3, 'n']); plan.push([lx, 12, b, 2, 's']); }
  }
  const arten = mischen(['lehrerzimmer', 'bibliothek', 'bibliothek', 'toilette', 'toilette', 'musik', ...Array(12).fill('klasse')]);
  let klassenNr = 0;
  for (const [lx1, z1, b, t, haupt, fest] of plan) {
    const art = fest || arten.pop() || 'klasse';
    const R = { art, lx1, z1, b, t, zellen: [], tueren: [], haupt, ...RAUM_INFOS[art] };
    if (art === 'klasse') { klassenNr++; R.name = `Klasse ${Math.ceil(klassenNr / 2)}${'ab'[klassenNr % 2]}`; }
    for (let z = z1; z < z1 + t; z++) for (let lx = lx1; lx < lx1 + b; lx++) {
      const c = zelle(lx, z); R.zellen.push(c); M.raumVon.set(c, R);
      if (lx + 1 < lx1 + b) auf(c, zelle(lx + 1, z));
      if (z + 1 < z1 + t) auf(c, zelle(lx, z + 1));
    }
    R.mitte = zelle(lx1 + Math.floor(b / 2), z1 + Math.floor(t / 2));
    const seiten = [haupt]; if (art === 'turnhalle') seiten.push(haupt, 's');
    for (const s of ['w', 'o']) if (rnd() < SCHULE.nebenTuer) seiten.push(s);
    for (const seite of seiten) {
      const kand = [];
      if (seite === 'n' || seite === 's') {
        const z = seite === 'n' ? z1 : z1 + t - 1, dz = seite === 'n' ? -1 : 1;
        for (let lx = lx1; lx < lx1 + b; lx++) if (M.flur.has(zelle(lx, z + dz)) && !R.tueren.some(T => T.innen === zelle(lx, z))) kand.push([zelle(lx, z), zelle(lx, z + dz)]);
      } else {
        const lx = seite === 'w' ? lx1 : lx1 + b - 1, dx = seite === 'w' ? -1 : 1;
        for (let z = z1; z < z1 + t; z++) if (lx + dx >= 0 && lx + dx < B && M.flur.has(zelle(lx + dx, z))) kand.push([zelle(lx, z), zelle(lx + dx, z)]);
      }
      if (!kand.length) continue;
      const [a, c] = kand[Math.floor(rnd() * kand.length)];
      auf(a, c); R.tueren.push({ innen: a, aussen: c, seite });
    }
    M.raeume.push(R);
  }
  // 4) Der Eingang: vom Schulhof in den Flur
  M.start = zelle(0, SCHULE.eingang);
  auf(zelle(-1, SCHULE.eingang), M.start);
  M.tueren = [{ innen: M.start, aussen: zelle(-1, SCHULE.eingang), seite: 'w', eingang: true }, ...M.raeume.flatMap(R => R.tueren.map(T => ({ ...T, raum: R })))];

  // ----- Jetzt bauen, was man sieht -----
  const gx = (x0 + M.x1) / 2, gz = (z0 + M.z1) / 2, hausB = B * Z, hausT = nz * Z;
  festerKoerper(gx, -0.25, gz, M.x1 - x0 + 4, 0.5, M.z1 - z0 + 4);   // Der Boden (fest)
  const flaeche = (x1, z1, b, t, mat, y = 0.005) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b, t), mat); m.rotation.x = -Math.PI / 2; m.position.set(x1 + b / 2, y, z1 + t / 2); m.receiveShadow = true; hausGruppe.add(m); return m; };
  flaeche(x0, z0, hof * Z, hausT, wiederholMat(asphaltTextur, hof * Z / 3, hausT / 3));    // Schulhof
  flaeche(SCHUL_ORT, z0, hausB, hausT, wiederholMat(linoTextur, hausB / 2.4, hausT / 2.4)); // Linoleum überall
  // Die Decke (und darüber das Dach)
  festerKoerper(SCHUL_ORT + hausB / 2, H + 0.5, gz, hausB, 1, hausT);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(hausB, hausT), wiederholMat(deckenPlattenTextur, hausB / 1.5, hausT / 1.5));
  decke.rotation.x = Math.PI / 2; decke.position.set(SCHUL_ORT + hausB / 2, H, gz); hausGruppe.add(decke);
  const dach = new THREE.Mesh(new THREE.BoxGeometry(hausB + 1, 4, hausT + 1), wiederholMat(ziegelTextur, hausB / 4, 1.5));
  dach.position.set(SCHUL_ORT + hausB / 2, H + 2, gz); hausGruppe.add(dach);
  const dachRand = new THREE.Mesh(new THREE.BoxGeometry(hausB + 1.6, 0.4, hausT + 1.6), new THREE.MeshStandardMaterial({ color: '#2b2522', roughness: 1 }));
  dachRand.position.set(SCHUL_ORT + hausB / 2, H + 4.1, gz); hausGruppe.add(dachRand);
  // Die Wände (nebeneinanderliegende Stücke werden zu einer langen Wand zusammengefasst)
  const wand = (xa, za, xb, zb) => {
    const l = Math.hypot(xb - xa, zb - za), entlangX = za === zb;
    festerKlotz((xa + xb) / 2, H / 2, (za + zb) / 2, entlangX ? l + D : D, H, entlangX ? D : l + D, schulWandMat(l), true);
  };
  for (let k = 0; k <= nz; k++) {   // Wände entlang x
    let anfang = -1;
    for (let x = 0; x <= nx; x++) {
      const brauch = x < nx && (imS(x, k - 1) || imS(x, k)) && !(k > 0 && k < nz && istAuf((k - 1) * nx + x, k * nx + x));
      if (brauch && anfang < 0) anfang = x;
      if (!brauch && anfang >= 0) { wand(x0 + anfang * Z, z0 + k * Z, x0 + x * Z, z0 + k * Z); anfang = -1; }
    }
  }
  for (let k = hof; k <= nx; k++) {   // Wände entlang z
    let anfang = -1;
    for (let z = 0; z <= nz; z++) {
      const brauch = z < nz && (imS(k - 1, z) || imS(k, z)) && !(k > 0 && k < nx && istAuf(z * nx + k - 1, z * nx + k));
      if (brauch && anfang < 0) anfang = z;
      if (!brauch && anfang >= 0) { wand(x0 + k * Z, z0 + anfang * Z, x0 + k * Z, z0 + z * Z); anfang = -1; }
    }
  }
  // Türrahmen: Die Öffnung zwischen zwei Feldern wird zu einer echten Tür (schmaler, mit Sturz und Schild)
  for (const T of M.tueren) {
    const a = schulMitte(T.innen), b = schulMitte(T.aussen), mx = (a.x + b.x) / 2, mzz = (a.z + b.z) / 2, entlangX = Math.abs(a.z - b.z) > 0.1;   // entlangX: Die Wand läuft entlang x
    const seitlich = (Z - SCHULE.tuer) / 2, mat = schulWandMat(seitlich);
    for (const s of [-1, 1]) {
      const off = s * (SCHULE.tuer / 2 + seitlich / 2);
      festerKlotz(mx + (entlangX ? off : 0), H / 2, mzz + (entlangX ? 0 : off), entlangX ? seitlich : D, H, entlangX ? D : seitlich, mat, true);
    }
    festerKlotz(mx, (2.4 + H) / 2, mzz, entlangX ? SCHULE.tuer : D, H - 2.4, entlangX ? D : SCHULE.tuer, schulWandMat(SCHULE.tuer), true);
    const rahmen = new THREE.Mesh(new THREE.BoxGeometry(entlangX ? SCHULE.tuer + 0.16 : D + 0.06, 0.1, entlangX ? D + 0.06 : SCHULE.tuer + 0.16), tafelRahmenMat);
    rahmen.position.set(mx, 2.42, mzz); hausGruppe.add(rahmen);
    if (T.raum) {   // Ein Schild über der Tür (zum Flur hin)
      const sch = schildMesh(`${T.raum.emoji} ${T.raum.name}`, 1.5, 0.32, '#f2e8c9');
      const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
      sch.position.set(mx + dx * (D / 2 + 0.02), 2.75, mzz + dz * (D / 2 + 0.02)); sch.rotation.y = Math.atan2(dx, dz); hausGruppe.add(sch);
    }
  }
  // Die Fassade (Backstein) vorne zum Schulhof, mit Eingang, Fenstern, Schild und einer stehengebliebenen Uhr
  const ez = z0 + (SCHULE.eingang + 0.5) * Z, fx = SCHUL_ORT - D / 2 - 0.12, fH = H + 4;
  const ziegel = (z1, z2, y1, y2) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, y2 - y1, z2 - z1), wiederholMat(ziegelTextur, (z2 - z1) / 4, (y2 - y1) / 2)); m.position.set(fx, (y1 + y2) / 2, (z1 + z2) / 2); hausGruppe.add(m); };
  ziegel(z0 - 0.3, ez - SCHULE.tuer / 2, 0, fH); ziegel(ez + SCHULE.tuer / 2, M.z1 + 0.3, 0, fH); ziegel(ez - SCHULE.tuer / 2, ez + SCHULE.tuer / 2, 2.4, fH);
  const fensterMat = new THREE.MeshBasicMaterial({ color: '#1a2a3a' }), fensterHell = new THREE.MeshBasicMaterial({ color: '#c8b46a' });
  for (let z = z0 + 2.5; z < M.z1 - 1.5; z += 4) {
    if (Math.abs(z - ez) < 3) continue;
    for (const y of [1.7, 5.2]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), rnd() < 0.12 ? fensterHell : fensterMat);   // Manchmal brennt in einem Fenster Licht ...
      f.position.set(fx - 0.12, y, z); f.rotation.y = -Math.PI / 2; hausGruppe.add(f);
    }
  }
  const schild = schildMesh('📚 SCHULE SCHATTENBERG', 4.2, 0.7, '#f2e8c9');
  schild.position.set(fx - 0.14, 3.1, ez); schild.rotation.y = -Math.PI / 2; hausGruppe.add(schild);
  const uhrTex = canvasTextur(128, 128, (g) => {   // Die Uhr ist um 13:13 stehen geblieben ...
    g.fillStyle = '#f4efe0'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke();
    g.lineWidth = 3; for (let k = 0; k < 12; k++) { const w = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.sin(w) * 48, 64 - Math.cos(w) * 48); g.lineTo(64 + Math.sin(w) * 56, 64 - Math.cos(w) * 56); g.stroke(); }
    const zeiger = (w, l, d) => { g.lineWidth = d; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.sin(w) * l, 64 - Math.cos(w) * l); g.stroke(); };
    zeiger((1 + 13 / 60) / 12 * Math.PI * 2, 30, 6); zeiger(13 / 60 * Math.PI * 2, 46, 4);
  }).tex;
  const uhr = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ map: uhrTex })); uhr.position.set(fx - 0.14, 5.4, ez); uhr.rotation.y = -Math.PI / 2; hausGruppe.add(uhr);
  lampeHinzu(SCHUL_ORT - 1.5, 2.8, ez, '#ffe6a8', 2.0, 12, true);   // Die Lampe über dem Eingang (flackert)
  // Der Schulhof: Mauer rundherum, Tor hinten (da kommt der Bus rein), Basketballkorb, Himmel-und-Hölle, Bänke
  const mauer = (x, z, b, t) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, 3, t), wiederholMat(ziegelTextur, Math.max(b, t) / 4, 1)); m.position.set(x, 1.5, z); hausGruppe.add(m); sichtBlocker.push(m);
    festerKoerper(x, 4.5, z, b, 9, t);   // (Unsichtbar höher – da kommt keiner drüber)
  };
  const zuX1 = x0 + 3.5, zuX2 = x0 + 10.5;   // Das Tor (da kommt der Bus rein)
  mauer((x0 + SCHUL_ORT) / 2, z0 - 0.3, SCHUL_ORT - x0 + 0.6, 0.6);
  mauer(x0 - 0.3, gz, 0.6, hausT + 0.6);
  mauer((x0 + zuX1) / 2, M.z1 + 0.3, zuX1 - x0, 0.6);
  mauer((zuX2 + SCHUL_ORT) / 2, M.z1 + 0.3, SCHUL_ORT - zuX2, 0.6);
  festerKoerper((zuX1 + zuX2) / 2, 3, M.z1 + 0.3, zuX2 - zuX1, 6, 0.4);   // Unsichtbare Sperre im Tor
  const gitter = new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.7, roughness: 0.5 });
  for (let x = zuX1; x <= zuX2 + 0.01; x += 0.25) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), gitter); st.position.set(x, 1.1, M.z1 + 0.5); hausGruppe.add(st); }
  for (const y of [0.2, 2.1]) { const q = new THREE.Mesh(new THREE.BoxGeometry(zuX2 - zuX1, 0.06, 0.06), gitter); q.position.set((zuX1 + zuX2) / 2, y, M.z1 + 0.5); hausGruppe.add(q); }
  const strasse = new THREE.Mesh(new THREE.PlaneGeometry(zuX2 - zuX1 + 2, 70), new THREE.MeshStandardMaterial({ map: asphaltTextur, roughness: 1 }));
  strasse.rotation.x = -Math.PI / 2; strasse.position.set((zuX1 + zuX2) / 2, 0.004, M.z1 + 35); hausGruppe.add(strasse);
  const hupf = canvasTextur(128, 256, (g) => {   // Himmel und Hölle (mit Kreide auf den Boden gemalt)
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 4; g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
    const kaestchen = [[44, 210, 1], [44, 170, 2], [24, 130, 3], [64, 130, 4], [44, 90, 5], [24, 50, 6], [64, 50, 7]];
    for (const [x, y, n] of kaestchen) { g.strokeRect(x, y, 40, 40); g.fillText(n, x + 20, y + 27); }
    g.beginPath(); g.arc(64, 30, 26, Math.PI, 0); g.stroke(); g.fillText('HIMMEL', 64, 24);
  }).tex;
  const hupfM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), new THREE.MeshBasicMaterial({ map: hupf, transparent: true, depthWrite: false }));
  hupfM.rotation.x = -Math.PI / 2; hupfM.position.set(x0 + 3.5, 0.012, z0 + 5); hausGruppe.add(hupfM);
  const korbStange = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 10), gitter); korbStange.position.set(x0 + 1, 1.6, z0 + 1.2); hausGruppe.add(korbStange);
  const brett = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: '#e8e8e8' })); brett.position.set(x0 + 1, 3.1, z0 + 1.4); hausGruppe.add(brett);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: '#e8590c' })); ring.rotation.x = Math.PI / 2; ring.position.set(x0 + 1, 2.85, z0 + 1.7); hausGruppe.add(ring);
  for (const z of [z0 + 12, M.z1 - 6]) { festerKlotz(x0 + 0.9, 0.25, z, 0.6, 0.08, 2.2, holzMoebelMat, false); festerKlotz(x0 + 0.65, 0.55, z, 0.08, 0.5, 2.2, holzMoebelMat, false); festerKoerper(x0 + 0.9, 0.2, z, 0.6, 0.4, 2.2); }   // Bänke
  lampeHinzu(x0 + hof * Z * 0.4, 4.5, z0 + 3, '#b9c8ff', 1.3, 18, false);   // Eine Laterne über dem Hof
  // Flure: Neonröhren an der Decke (manche flackern!) und Spinde an den Wänden
  const neon = new THREE.MeshBasicMaterial({ color: '#f2f6ff' }), neonA = new THREE.MeshBasicMaterial({ color: '#f2f6ff' }), neonB = new THREE.MeshBasicMaterial({ color: '#f2f6ff' });
  M.flimmer = [neonA, neonB];
  const spinde = [];
  for (const c of M.flur) {
    const p = schulMitte(c), lx = c % nx - hof, z = Math.floor(c / nx), quer = FLUR_SPALTEN.includes(lx) && !FLUR_REIHEN.includes(z);   // quer: Flur läuft entlang z
    const r = rnd(), m = r < 0.1 ? neonA : r < 0.18 ? neonB : neon;
    const roehre = new THREE.Mesh(new THREE.BoxGeometry(quer ? 0.25 : 1.3, 0.05, quer ? 1.3 : 0.25), m); roehre.position.set(p.x, H - 0.03, p.z); hausGruppe.add(roehre);
    if (FLUR_SPALTEN.includes(lx) && FLUR_REIHEN.includes(z)) continue;   // Kreuzung: keine Spinde
    if (rnd() < 0.25) continue;
    for (const s of [-1, 1]) {   // An welchen Seiten ist eine Wand? Da kommen Spinde hin
      const n = quer ? c + s : c + s * nx;
      if (istAuf(c, n)) continue;
      for (let k = -1.5; k <= 1.5; k++) spinde.push([quer ? p.x + s * (Z / 2 - D / 2 - 0.2) : p.x + k * 0.6, quer ? p.z + k * 0.6 : p.z + s * (Z / 2 - D / 2 - 0.2), quer ? (s > 0 ? -Math.PI / 2 : Math.PI / 2) : (s > 0 ? Math.PI : 0)]);
    }
  }
  const spindTex = canvasTextur(64, 192, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 192); g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let k = 0; k < 5; k++) g.fillRect(14, 14 + k * 8, 36, 3);   // Lüftungsschlitze
    g.fillRect(48, 96, 6, 18); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3; g.strokeRect(2, 2, 60, 188);
  }).tex;
  const spindM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.58, 1.9, 0.4), new THREE.MeshStandardMaterial({ map: spindTex, metalness: 0.4, roughness: 0.5 }), spinde.length);
  const hilf = new THREE.Object3D(), farben = ['#3d6fb0', '#b03d3d', '#3d9a5b', '#c9a227', '#7a7f87'].map(f => new THREE.Color(f));
  spinde.forEach(([x, z, w], k) => { hilf.position.set(x, 0.95, z); hilf.rotation.set(0, w, 0); hilf.updateMatrix(); spindM.setMatrixAt(k, hilf.matrix); spindM.setColorAt(k, farben[Math.floor(rnd() * farben.length)]); });
  hausGruppe.add(spindM);
  for (const [lx, z] of [[3, 8], [14, 8], [10, 2], [10, 14]]) { const p = schulMitte(zelle(lx, z)); lampeHinzu(p.x, H - 0.3, p.z, '#e6efff', 1.6, 12, true); }
  // Die Räume einrichten
  const tische = [];
  for (const R of M.raeume) raumEinrichtenSchule(R, tische);
  baueTische(tische);
}
function raumEinrichtenSchule(R, tische) {
  const M = haus.schule, Z = M.zelle, H = SCHULE.hoehe, D = 0.3;
  const X1 = M.x0 + (M.hof + R.lx1) * Z, Z1 = M.z0 + R.z1 * Z, X2 = X1 + R.b * Z, Z2 = Z1 + R.t * Z, cx = (X1 + X2) / 2, cz = (Z1 + Z2) / 2;
  const boden = (mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(X2 - X1, Z2 - Z1), mat); m.rotation.x = -Math.PI / 2; m.position.set(cx, 0.01, cz); m.receiveShadow = true; hausGruppe.add(m); };
  // Die Tafel kommt an die Wand gegenüber der Haupttür
  const tafelN = R.haupt === 's';   // Tafel an der Nordwand (kleines z)?
  const tz = tafelN ? Z1 + D / 2 + 0.03 : Z2 - D / 2 - 0.03, bz = tafelN ? 1 : -1;   // bz: von der Tafel aus ins Zimmer
  const tafel = (breite, text) => {
    const t = canvasTextur(512, 200, (g) => {
      g.fillStyle = '#1f3b2d'; g.fillRect(0, 0, 512, 200);
      for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(Math.random() * 512, Math.random() * 200, 30, 6); }   // Verwischte Kreide
      g.fillStyle = 'rgba(245,245,235,0.9)'; g.font = 'bold 44px "Comic Sans MS", Arial, sans-serif'; g.textAlign = 'center';
      g.fillText(text, 256, 115, 490);
    }).tex;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, breite * 0.39), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(cx, 1.65, tz + bz * 0.04); m.rotation.y = tafelN ? 0 : Math.PI; hausGruppe.add(m);
    const r = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.12, breite * 0.39 + 0.12, 0.04), tafelRahmenMat); r.position.set(cx, 1.65, tz + bz * 0.02); hausGruppe.add(r);
  };
  if (R.art === 'klasse') {
    boden(wiederholMat(parkettTextur, (X2 - X1) / 2, (Z2 - Z1) / 2));
    tafel(Math.min(3.6, R.b * Z * 0.45), TAFEL_SPRUECHE[Math.floor(rnd() * TAFEL_SPRUECHE.length)]);
    festerKlotz(cx + (R.b % 2 ? 1.4 : 0), 0.4, tz + bz * 0.8, 1.3, 0.8, 0.6, holzMoebelMat, false);   // Lehrerpult (nicht im Weg)
    for (const c of R.zellen) {   // Schülertische (nicht in der Reihe direkt an der Tafel)
      const p = schulMitte(c);
      if (Math.abs(p.z - tz) < Z * 0.9) continue;
      for (const s of [-1, 1]) tische.push([p.x + s * 0.8, p.z - bz * 0.72, bz]);
    }
  } else if (R.art === 'bibliothek') {
    boden(new THREE.MeshStandardMaterial({ color: '#5a1f24', roughness: 1 }));
    for (const c of R.zellen) {   // Bücherregale an allen Wänden ohne Tür
      const p = schulMitte(c);
      for (const [n, dx, dz] of [[c - 1, -1, 0], [c + 1, 1, 0], [c - M.nx, 0, -1], [c + M.nx, 0, 1]]) {
        if (M.raumVon.get(n) === R || M.offen.has(schulKante(c, n))) continue;
        const x = p.x + dx * (Z / 2 - D / 2 - 0.22), z = p.z + dz * (Z / 2 - D / 2 - 0.22);
        festerKlotz(x, 1.1, z, dx ? 0.42 : 2.6, 2.2, dx ? 2.6 : 0.42, buecherMat, false);
      }
    }
    lampeHinzu(cx, H - 0.4, cz, '#ffd9a0', 1.6, 10, false);
  } else if (R.art === 'lehrerzimmer') {
    boden(new THREE.MeshStandardMaterial({ color: '#3b4a5a', roughness: 1 }));
    tafel(2.6, 'ZUTRITT NUR FÜR LEHRER!');
    const mp0 = schulMitte(R.mitte);
    festerKlotz(mp0.x + 0.85, 0.4, mp0.z + 0.85, 0.9, 0.8, 0.8, holzMoebelMat, false);   // Tisch mit Kaffeetasse (schräg neben der Mitte, nicht im Weg)
    const tasse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 10), new THREE.MeshStandardMaterial({ color: '#ffffff' })); tasse.position.set(mp0.x + 0.7, 0.86, mp0.z + 0.8); hausGruppe.add(tasse);
    lampeHinzu(cx, H - 0.4, cz, '#ffb36b', 1.4, 10, true);
    M.kopfPlatz = { x: mp0.x - 0.3, z: mp0.z };   // Wer beim Test durchfällt, dessen Kopf landet HIER ...
  } else if (R.art === 'toilette') {
    boden(wiederholMat(malTextur(64, 64, (g) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#9aa'; g.strokeRect(0, 0, 32, 32); g.strokeRect(32, 32, 32, 32); }), (X2 - X1) / 1, (Z2 - Z1) / 1));
    const kabine = new THREE.MeshStandardMaterial({ color: '#6f8fa0', roughness: 0.6 });
    for (let x = X1 + 0.9; x < X2 - 0.5; x += 1.2) {   // Kabinen an der Wand gegenüber der Tür
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2, 1.1), kabine); w.position.set(x, 1.05, tz + bz * 0.6); hausGruppe.add(w);
      const kl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: '#f4f4f4' })); kl.position.set(x + 0.6, 0.2, tz + bz * 0.45); hausGruppe.add(kl);
    }
  } else if (R.art === 'musik') {
    boden(wiederholMat(parkettTextur, (X2 - X1) / 2, (Z2 - Z1) / 2));
    tafel(2.8, '♪ ♫ ♪   LA LA LAAA ♫');
    festerKlotz(X1 + 1.0, 0.6, tz + bz * 0.55, 1.6, 1.2, 0.6, new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.3 }), false);   // Klavier
    const tasten = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.2), new THREE.MeshStandardMaterial({ color: '#f4f4f4' })); tasten.position.set(X1 + 1.0, 0.82, tz + bz * 0.95); hausGruppe.add(tasten);
    const trommel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 16), new THREE.MeshStandardMaterial({ color: '#c92a2a' })); trommel.position.set(X2 - 0.8, 0.18, tz + bz * 0.8); hausGruppe.add(trommel);
  } else if (R.art === 'turnhalle') {
    const linien = canvasTextur(256, 192, (g) => {
      g.fillStyle = '#b07a43'; g.fillRect(0, 0, 256, 192);
      for (let y = 0; y < 192; y += 8) { g.fillStyle = y % 16 ? '#a87341' : '#b8824b'; g.fillRect(0, y, 256, 8); }
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 3; g.strokeRect(10, 10, 236, 172); g.beginPath(); g.moveTo(128, 10); g.lineTo(128, 182); g.stroke();
      g.beginPath(); g.arc(128, 96, 26, 0, 7); g.stroke(); g.strokeStyle = '#e03131'; g.beginPath(); g.arc(10, 96, 40, -1.4, 1.4); g.stroke(); g.beginPath(); g.arc(246, 96, 40, Math.PI - 1.4, Math.PI + 1.4); g.stroke();
    }).tex;
    boden(new THREE.MeshStandardMaterial({ map: linien, roughness: 0.6 }));
    for (const s of [-1, 1]) {   // Basketballkörbe an beiden Enden
      const x = s < 0 ? X1 + D / 2 + 0.1 : X2 - D / 2 - 0.1;
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: '#f4f4f4' })); br.position.set(x, 2.7, cz); hausGruppe.add(br);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: '#e8590c' })); rg.rotation.x = Math.PI / 2; rg.position.set(x - s * 0.3, 2.45, cz); hausGruppe.add(rg);
    }
    const sprosse = new THREE.MeshStandardMaterial({ color: '#c49a6c', roughness: 0.8 });   // Sprossenwand
    for (let k = 0; k < 8; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), sprosse); st.rotation.z = Math.PI / 2; st.position.set(cx, 0.3 + k * 0.33, tz + bz * 0.2); hausGruppe.add(st); }
    for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: '#e8590c' })); b.position.set(X1 + 1 + rnd() * (X2 - X1 - 2), 0.12, Z1 + 1 + rnd() * (Z2 - Z1 - 2)); hausGruppe.add(b); }
    lampeHinzu(cx, H - 0.4, cz, '#f0f4ff', 2.6, 18, false);
  }
}
function baueTische(tische) {   // Alle Schülertische und Stühle auf einmal (spart Rechenzeit)
  if (!tische.length) return;
  const n = tische.length, hilf = new THREE.Object3D();
  const platte = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.04, 0.5), holzMoebelMat, n);
  const sitz = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.04, 0.4), stuhlMat, n), lehne = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.38, 0.04), stuhlMat, n);
  const bein = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.72, 0.04), new THREE.MeshStandardMaterial({ color: '#555b63', metalness: 0.6, roughness: 0.4 }), n * 4);
  const setze = (im, k, x, y, z) => { hilf.position.set(x, y, z); hilf.rotation.set(0, 0, 0); hilf.updateMatrix(); im.setMatrixAt(k, hilf.matrix); };
  tische.forEach(([x, z, bz], k) => {
    setze(platte, k, x, 0.72, z);
    let i = 0; for (const sx of [-0.3, 0.3]) for (const sz of [-0.2, 0.2]) setze(bein, k * 4 + i++, x + sx, 0.36, z + sz);
    setze(sitz, k, x, 0.45, z - bz * 0.45); setze(lehne, k, x, 0.66, z - bz * 0.64);
    festerKoerper(x, 0.37, z, 0.7, 0.74, 0.5);
  });
  hausGruppe.add(platte, sitz, lehne, bein);
}
function baueNachsitzZimmer() {   // 📝 Das Nachsitz-Zimmer: ganz weit weg, eingesperrt, nur du, ein Tisch und die Tafel
  const M = haus.schule, x = SCHUL_ORT + 150, z = 25, H = SCHULE.hoehe, R = 2.2;
  festerKoerper(x, -0.25, z, R * 2 + 2, 0.5, R * 2 + 2);
  festerKoerper(x, H + 0.5, z, R * 2 + 2, 1, R * 2 + 2);
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), wiederholMat(parkettTextur, R, R)); boden.rotation.x = -Math.PI / 2; boden.position.set(x, 0.01, z); hausGruppe.add(boden);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), wiederholMat(deckenPlattenTextur, R, R)); decke.rotation.x = Math.PI / 2; decke.position.set(x, H, z); hausGruppe.add(decke);
  for (const [wx, wz, b, t] of [[x, z - R, R * 2 + 0.3, 0.3], [x, z + R, R * 2 + 0.3, 0.3], [x - R, z, 0.3, R * 2], [x + R, z, 0.3, R * 2]]) festerKlotz(wx, H / 2, wz, b, H, t, schulWandMat(R * 2), true);
  const t = canvasTextur(512, 200, (g) => {
    g.fillStyle = '#1f3b2d'; g.fillRect(0, 0, 512, 200); g.fillStyle = 'rgba(245,245,235,0.92)'; g.textAlign = 'center';
    g.font = 'bold 54px "Comic Sans MS", Arial'; g.fillText('NACHSITZEN', 256, 78);
    g.font = '28px "Comic Sans MS", Arial'; g.fillText('3 Fragen. Eine falsch = SCHROTT.', 256, 135); g.fillText('Viel Glück ... 👨‍🏫', 256, 175);
  }).tex;
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.02), new THREE.MeshBasicMaterial({ map: t })); tafel.position.set(x, 1.65, z - R + 0.17); hausGruppe.add(tafel);
  festerKlotz(x, 0.37, z - 0.2, 0.7, 0.74, 0.5, holzMoebelMat, false);
  lampeHinzu(x, H - 0.3, z, '#fff1c9', 1.5, 8, true);
  M.nachsitz = { x, z: z + 0.6 };
}

// ----- 📝 Nachsitzen: Herr Kreidemann gibt dir einen Test -----
let nachsitzen = null;   // null = kein Test. Sonst: { fragen, nr, zeit }
function neueFrage() {   // Eine Rechenaufgabe mit 4 Antworten (nur eine stimmt!)
  const art = Math.floor(Math.random() * 3);
  let a, b, text, loesung;
  if (art === 0) { a = 3 + Math.floor(Math.random() * 40); b = 2 + Math.floor(Math.random() * 30); text = `${a} + ${b}`; loesung = a + b; }
  else if (art === 1) { a = 10 + Math.floor(Math.random() * 50); b = 2 + Math.floor(Math.random() * (a - 2)); text = `${a} − ${b}`; loesung = a - b; }
  else { a = 2 + Math.floor(Math.random() * 9); b = 2 + Math.floor(Math.random() * 9); text = `${a} × ${b}`; loesung = a * b; }
  const antworten = new Set([loesung]);
  for (const d of [1, -1, 2, -2, 10, -10, 3, 5]) { if (antworten.size >= 4) break; if (loesung + d >= 0 && Math.random() < 0.7) antworten.add(loesung + d); }
  for (let d = 4; antworten.size < 4; d++) antworten.add(loesung + d);
  return { text, loesung, antworten: [...antworten].sort(() => Math.random() - 0.5) };
}
const testStil = document.createElement('style');
testStil.textContent = `
#test { position: absolute; z-index: 4; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92%, 30rem); display: none; flex-direction: column; gap: 0.6rem;
  padding: 1rem 1.2rem; box-sizing: border-box; border-radius: 1rem; background: #1f3b2d; border: 6px solid #6b4a2b; color: #f5f5eb;
  font: 1rem "Comic Sans MS", system-ui, sans-serif; box-shadow: 0 0 40px #000; text-align: center; }
#test .kopf { display: flex; justify-content: space-between; color: #ffd166; font-weight: bold; }
#test .frage { font-size: 2.4rem; font-weight: bold; margin: 0.3rem 0; }
#test .antworten { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
#test .antworten button { padding: 0.7rem; font: bold 1.5rem "Comic Sans MS", system-ui, sans-serif; border-radius: 0.6rem; border: 3px solid #f5f5eb88; background: #2f5a45; color: #fff; cursor: pointer; }
#test .antworten button:hover { background: #3d7559; }
#test .zeit { height: 10px; border-radius: 5px; background: #0d1f16; overflow: hidden; }
#test .zeit div { height: 100%; background: #ffd166; }
#test .tipp { font-size: 0.8rem; color: #c9e6d5; }
`;
document.head.appendChild(testStil);
const testBox = document.createElement('div');
testBox.id = 'test';
(document.getElementById('buehne') || document.body).appendChild(testBox);
function testMalen() {   // Die aktuelle Frage anzeigen
  const N = nachsitzen, F = N.fragen[N.nr];
  testBox.innerHTML = '';
  const neu = (tag, eltern, text, klasse) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (klasse) el.className = klasse; eltern.appendChild(el); return el; };
  const kopf = neu('div', testBox, undefined, 'kopf'); neu('span', kopf, '📝 TEST'); neu('span', kopf, `Frage ${N.nr + 1} von ${N.fragen.length}`);
  neu('div', testBox, `${F.text} = ?`, 'frage');
  const A = neu('div', testBox, undefined, 'antworten');
  F.antworten.forEach((x, k) => { const b = neu('button', A, `${k + 1})  ${x}`); b.addEventListener('click', () => testAntwort(k)); });
  N.balken = neu('div', neu('div', testBox, undefined, 'zeit'));
  neu('div', testBox, 'Klicken oder Taste 1–4 · Eine falsche Antwort = SCHROTT! 💀', 'tipp');
}
function nachsitzenStart() {   // 👨‍🏫 ERWISCHT! Ab ins Nachsitz-Zimmer!
  const M = haus && haus.schule;
  if (!M || nachsitzen || tot) return;
  loslassen(); gepackt = null; if (geduckt) ducken(false);
  for (const k in tasten) tasten[k] = false;
  spielerKoerper.position.set(M.nachsitz.x, KOERPER_RADIUS + 0.05, M.nachsitz.z); spielerKoerper.velocity.set(0, 0, 0);
  blick.links = 0; blick.hoch = 0;
  nachsitzen = { fragen: Array.from({ length: TEST_FRAGEN }, neueFrage), nr: 0, zeit: TEST_ZEIT };
  testMalen();
  testBox.style.display = 'flex';
  if (document.pointerLockElement) document.exitPointerLock();
  monsterSound.lehrerGlocke(1);
  zeigeNachricht('👨‍🏫 ERWISCHT! NACHSITZEN! Schreib den Test – eine Antwort falsch, und du bist SCHROTT!', 4, '#ff6b6b');
}
function testAntwort(k) {
  const N = nachsitzen;
  if (!N) return;
  const F = N.fragen[N.nr];
  if (F.antworten[k] !== F.loesung) { testEnde(false, `❌ FALSCH! ${F.text} = ${F.loesung}`); return; }
  ton(660, 0, 0.1, 'sine', 0.08); ton(880, 0.1, 0.15, 'sine', 0.08);   // Richtig!
  N.nr++; N.zeit = TEST_ZEIT;
  if (N.nr >= N.fragen.length) { testEnde(true); return; }
  testMalen();
}
function testEnde(bestanden, grund = '') {
  nachsitzen = null;
  testBox.style.display = 'none';
  const M = haus && haus.schule;
  if (bestanden) {   // ✅ Du darfst gehen – zurück zum Bus
    spielerKoerper.position.set(haus.spawn.x, KOERPER_RADIUS + 0.05, haus.spawn.z); spielerKoerper.velocity.set(0, 0, 0);
    blick.links = -Math.PI / 2;
    zeigeNachricht('✅ BESTANDEN! Alle 3 richtig – du darfst gehen. Diesmal ...', 3.5, '#4ade80');
    [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.12, 0.25, 'square', 0.06));
  } else {   // 💀 Durchgefallen: Schrott! Dein Kopf landet im Lehrerzimmer ...
    zeigeNachricht(`${grund} – DURCHGEFALLEN! 💀`, 4, '#ff6b6b');
    const K = M && M.kopfPlatz ? M.kopfPlatz : haus.spawn;
    spielerKoerper.position.set(K.x, 0.6, K.z);
    spielerStirbt('📝 Beim Test durchgefallen');
  }
  if (zustand === 'spiel') mausFangen();
}
function testUpdate(dt) {   // Die Zeit läuft ... (wird jedes Bild aufgerufen)
  if (!nachsitzen) return;
  if (zustand !== 'spiel' || !haus || !haus.schule) { nachsitzen = null; testBox.style.display = 'none'; return; }
  nachsitzen.zeit -= dt;
  if (nachsitzen.balken) { nachsitzen.balken.style.width = `${Math.max(0, nachsitzen.zeit / TEST_ZEIT * 100)}%`; nachsitzen.balken.style.background = nachsitzen.zeit < 5 ? '#ff6b6b' : '#ffd166'; }
  if (Math.floor(nachsitzen.zeit + dt) !== Math.floor(nachsitzen.zeit) && nachsitzen.zeit < 5) ton(1200, 0, 0.05, 'square', 0.05);   // Tick ... tick ...
  if (nachsitzen.zeit <= 0) { const F = nachsitzen.fragen[nachsitzen.nr]; testEnde(false, `⏰ ZEIT UM! ${F.text} = ${F.loesung}`); }
}
function lehrerFaengt(m) {   // 👨‍🏫 Hat er jemanden erwischt? Dann: Nachsitzen! (statt Energie abziehen)
  if (m.lehrerRuhe > 0 || m.betaeubt > 0) return;   // (Nach dem Erwischen ist er eine Weile zufrieden)
  const p = spielerKoerper.position, fuss = p.y - (geduckt ? DUCK_RADIUS : KOERPER_RADIUS), nah = (x, z, y) => abstand2D(m.x, m.z, x, z) < 1.1 && Math.abs(y - m.y) < 1.2;
  const zufrieden = () => { m.angriffPause = m.info.pause; m.lehrerRuhe = LEHRER_RUHE; m.modus = 'wandern'; m.ziel = null; };
  if (!tot && !nachsitzen && nah(p.x, p.z, fuss)) { zufrieden(); nachsitzenStart(); return; }
  for (const g of mpGaeste()) if (nah(g.x, g.z, g.y)) {
    zufrieden(); mpSendeAn(g, { t: 'nachsitzen' });
    const t = `📝 ${g.name} muss nachsitzen!`; zeigeNachricht(t, 3, '#ffd166'); mpAnAlle({ t: 'info', text: t, farbe: '#ffd166' });
    return;
  }
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt <= 0 && nah(hp.x, hp.z, hp.y - 0.35)) { zufrieden(); if (h.auftrag) helferLoslassen(h); helferAmStart(h); zeigeNachricht(`📝 ${h.name} musste nachsitzen – und ist jetzt wieder am Bus.`, 3, h.farbe); return; }
  }
}

// ----- Karte wählen (in der Lobby) -----
function karteSchildMalen() {
  const F = haus && haus.fahrBus;
  if (!F || !F.karteSchild) return;
  const g = F.karteSchild.g, K = KARTEN[kartenWahl];
  g.fillStyle = '#10202a'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = K.farbe; g.lineWidth = 6; g.strokeRect(3, 3, 250, 90);
  g.fillStyle = K.farbe; g.font = 'bold 24px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText(`${K.emoji} ${K.name.toUpperCase()}`, 128, 44, 240);
  g.fillStyle = '#ffffff'; g.font = '20px Arial, sans-serif'; g.fillText('E = andere Karte', 128, 78);
  F.karteSchild.tex.needsUpdate = true;
  F.karteLampe.material.color.set(K.farbe);
}
function karteSetzen(k) {   // 🗺️ Andere Karte: Die ganze Welt wird neu gebaut (nur in der Lobby)
  if (!lobby || !KARTEN[k] || k === kartenWahl) return;
  kartenWahl = k;
  try { localStorage.setItem('arag-karte', k); } catch (e) { /* egal */ }
  starteLevel(mp.aktiv && mp.startzahl ? mp.startzahl : KARTE.startzahl);
  ton(523, 0, 0.12, 'square', 0.06); ton(784, 0.12, 0.18, 'square', 0.06);
  zeigeNachricht(`🗺️ Neues Ziel: ${KARTEN[k].emoji} ${KARTEN[k].name}! Der Bus biegt ab ...`, 3.5, KARTEN[k].farbe);
}

function zeichneAragLogo(g, x, y, s, schriftFarbe = '#10202a') {
  g.save();
  g.strokeStyle = '#7cf5c6'; g.lineWidth = s * 0.06;
  g.beginPath(); g.moveTo(x + s * 0.5, y); g.lineTo(x + s * 0.5, y - s * 0.2); g.stroke();   // Antenne
  g.fillStyle = '#ff6b6b'; g.beginPath(); g.arc(x + s * 0.5, y - s * 0.24, s * 0.08, 0, 7); g.fill();
  g.fillStyle = '#7cf5c6'; g.beginPath(); g.roundRect(x, y, s, s * 0.8, s * 0.18); g.fill();     // Kopf
  g.fillStyle = '#10202a'; g.beginPath(); g.roundRect(x + s * 0.12, y + s * 0.16, s * 0.76, s * 0.46, s * 0.1); g.fill();   // Bildschirm
  g.fillStyle = '#7cf5c6';
  for (const ax of [0.33, 0.67]) { g.beginPath(); g.arc(x + s * ax, y + s * 0.36, s * 0.08, 0, 7); g.fill(); }   // Augen
  g.fillRect(x + s * 0.36, y + s * 0.5, s * 0.28, s * 0.04);   // Mund
  g.fillStyle = schriftFarbe; g.font = `900 ${Math.round(s * 0.9)}px "Arial Black", Arial, sans-serif`;
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText('ARAG', x + s * 1.18, y + s * 0.8);
  g.restore();
}
function canvasTextur(b, h, malen) {
  const c = document.createElement('canvas'); c.width = b; c.height = h;
  const g = c.getContext('2d'); malen(g, b, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, g, c };
}
function busSeite(laenge, logo) {   // Eine Seite vom Bus: oben Fenster, unten Logo und Spruch
  const b = Math.round(laenge / 2.85 * 320);
  return canvasTextur(b, 320, (g) => {
    g.fillStyle = '#eef3f1'; g.fillRect(0, 0, b, 320);
    const n = Math.max(2, Math.floor((b - 30) / 165));
    for (let k = 0; k < n; k++) {   // Fenster (nachts dunkel, mit einem kleinen Glanz)
      g.fillStyle = '#0e1a2b'; g.beginPath(); g.roundRect(25 + k * (b - 30) / n, 28, (b - 30) / n - 20, 95, 12); g.fill();
      g.fillStyle = 'rgba(124,245,198,0.1)'; g.fillRect(35 + k * (b - 30) / n, 36, 30, 80);
    }
    g.fillStyle = '#7cf5c6'; g.fillRect(0, 138, b, 16);   // Mint-Streifen
    g.fillStyle = '#10202a'; g.fillRect(0, 288, b, 32);   // Unten dunkel
    if (logo) {
      zeichneAragLogo(g, 40, 178, 92);
      g.fillStyle = '#10202a'; g.font = 'bold 30px Arial, sans-serif'; g.fillText('Schatz-Bergungsdienst', 450, 212);
      g.fillStyle = '#1f8a64'; g.font = 'italic bold 32px Arial, sans-serif'; g.fillText('Wir holen alles raus!', 450, 258);
      if (b > 1100) { g.fillStyle = '#10202a'; g.font = 'bold 24px Arial, sans-serif'; g.fillText('☎ 0800 · SPUK · WEG', b - 290, 258); }
    }
  }).tex;
}
function baueBus(mz, ox = 0) {   // ox: so weit nach rechts verschoben (bei der Schule)
  const X1 = -15.4 + ox, X2 = -12.0 + ox, Z1 = mz - 7, Z2 = mz + 5, H = 3.0, D = 0.15, cx = (X1 + X2) / 2, W = X2 - X1;
  const TZ1 = Z1 + 1.3, TZ2 = Z1 + 2.7, TZ = (TZ1 + TZ2) / 2;   // Die Tür (rechts vorne – zum Haus hin)
  const gruppe = new THREE.Group(); hausGruppe.add(gruppe);   // (Im Intro fährt die ganze Gruppe heran)
  const lack = new THREE.MeshStandardMaterial({ color: '#eef3f1', roughness: 0.5 });
  const innenTex = canvasTextur(512, 160, (g) => {   // Innen: graue Wand, dunkle Fenster
    g.fillStyle = '#b9c1c9'; g.fillRect(0, 0, 512, 160);
    for (let k = 0; k < 3; k++) { g.fillStyle = '#0b1422'; g.beginPath(); g.roundRect(15 + k * 168, 12, 150, 55, 8); g.fill(); }
    g.fillStyle = '#7cf5c6'; g.fillRect(0, 76, 512, 5);
  }).tex;
  innenTex.wrapS = THREE.RepeatWrapping;
  const innen = l => { const t = innenTex.clone(); t.needsUpdate = true; t.repeat.set(l / 4, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); };
  const decke = new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.9 });
  const teil = (x, y, z, b, h, t, mat, physik = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; gruppe.add(m);
    if (physik) { festerKoerper(x, y, z, b, h, t); sichtBlocker.push(m); }
    return m;
  };
  const L = Z2 - Z1, mat6 = (k, besonders, rest) => [0, 1, 2, 3, 4, 5].map(i => i === k ? besonders : rest);
  // Wände: außen Lack und Logo, innen grau mit Fenstern (Seiten vom Kasten: 0 = +x, 1 = -x, 2 = oben, 3 = unten, 4 = +z, 5 = -z)
  teil(X1 + D / 2, H / 2, (Z1 + Z2) / 2, D, H, L, mat6(1, new THREE.MeshStandardMaterial({ map: busSeite(L, true), roughness: 0.5 }), innen(L)));             // Links (Westen)
  teil(X2 - D / 2, H / 2, (Z1 + TZ1) / 2, D, H, TZ1 - Z1, mat6(0, lack, innen(TZ1 - Z1)));                                                                     // Rechts vor der Tür
  teil(X2 - D / 2, (2.2 + H) / 2, TZ, D, H - 2.2, TZ2 - TZ1, mat6(0, lack, decke));                                                                              // Über der Tür
  teil(X2 - D / 2, H / 2, (TZ2 + Z2) / 2, D, H, Z2 - TZ2, mat6(0, new THREE.MeshStandardMaterial({ map: busSeite(Z2 - TZ2, true), roughness: 0.5 }), innen(Z2 - TZ2)));   // Rechts mit Logo
  const front = canvasTextur(384, 336, (g, b, h) => {   // Vorne: Leuchtschrift, Windschutzscheibe, Scheinwerfer
    g.fillStyle = '#eef3f1'; g.fillRect(0, 0, b, h);
    g.fillStyle = '#111'; g.fillRect(30, 10, b - 60, 42); g.fillStyle = '#ffb02e'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText(kartenWahl === 'schule' ? 'SCHULE' : 'SPUKVILLA', b / 2, 42, b - 70);
    g.fillStyle = '#0e1a2b'; g.beginPath(); g.roundRect(14, 62, b - 28, 120, 14); g.fill();
    g.fillStyle = 'rgba(124,245,198,0.12)'; g.fillRect(30, 70, 60, 100);
    g.fillStyle = '#7cf5c6'; g.fillRect(0, 196, b, 12);
    zeichneAragLogo(g, 110, 225, 40);
    for (const sx of [40, b - 40]) { g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(sx, 280, 24, 0, 7); g.fill(); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(sx, 280, 13, 0, 7); g.fill(); }
    g.fillStyle = '#10202a'; g.fillRect(0, h - 26, b, 26);
  }).tex;
  const hinten = canvasTextur(384, 336, (g, b, h) => {
    g.fillStyle = '#eef3f1'; g.fillRect(0, 0, b, h);
    g.fillStyle = '#0e1a2b'; g.beginPath(); g.roundRect(30, 28, b - 60, 95, 12); g.fill();
    g.fillStyle = '#7cf5c6'; g.fillRect(0, 138, b, 14);
    zeichneAragLogo(g, 70, 190, 60);
    for (const sx of [34, b - 34]) { g.fillStyle = '#ff3030'; g.beginPath(); g.roundRect(sx - 18, 255, 36, 40, 6); g.fill(); }
    g.fillStyle = '#10202a'; g.fillRect(0, h - 26, b, 26);
  }).tex;
  teil(cx, H / 2, Z1 + D / 2, W, H, D, mat6(5, new THREE.MeshStandardMaterial({ map: front, roughness: 0.4 }), innen(W)));    // Vorne
  teil(cx, H / 2, Z2 - D / 2, W, H, D, mat6(4, new THREE.MeshStandardMaterial({ map: hinten, roughness: 0.5 }), innen(W)));   // Hinten
  teil(cx, H - D / 2, (Z1 + Z2) / 2, W, D, L, mat6(3, decke, lack));                                                             // Dach
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * D, L - 2 * D), new THREE.MeshStandardMaterial({ color: '#2b3038', roughness: 0.9 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(cx, 0.02, (Z1 + Z2) / 2); gruppe.add(boden);
  // Räder, Scheinwerfer-Strahlen und blinkende Dachlichter
  const reifen = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 }), felge = new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.7, roughness: 0.3 });
  for (const x of [X1 - 0.05, X2 + 0.05]) for (const z of [Z1 + 2.1, Z2 - 2.3]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.32, 18), reifen); r.rotation.z = Math.PI / 2; r.position.set(x, 0.45, z); gruppe.add(r);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.34, 12), felge); f.rotation.z = Math.PI / 2; f.position.set(x, 0.45, z); gruppe.add(f);
  }
  for (const sx of [X1 + 0.4, X2 - 0.4]) {
    const kegel = new THREE.Mesh(KEGEL_GEO, new THREE.MeshBasicMaterial({ color: '#fff3c0', alphaMap: KEGEL_TEX, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    kegel.raycast = () => {}; kegel.position.set(sx, 0.55, Z1 - 0.02); kegel.rotation.set(0.12, Math.PI, 0); kegel.scale.setScalar(9); gruppe.add(kegel);
  }
  const dachLichter = [-0.8, 0.8].map(dx => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.25), new THREE.MeshBasicMaterial({ color: '#ffae3d' })); l.position.set(cx + dx, H + 0.09, Z1 + 0.5); gruppe.add(l); return l; });
  // Die Schiebetür (geht auf, wenn's losgeht)
  const tuer = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, TZ2 - TZ1), [lack, lack, lack, lack, lack, lack]);
  tuer.position.set(X2 - D / 2, 1.1, TZ); gruppe.add(tuer); sichtBlocker.push(tuer);
  const fenster = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshBasicMaterial({ color: '#0e1a2b' }));
  fenster.position.set(0.035, 0.5, 0); fenster.rotation.y = Math.PI / 2; tuer.add(fenster);
  const tuerKoerper = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.08, 1.1, (TZ2 - TZ1) / 2)), material: standardMat, collisionFilterGroup: G_WAND });
  tuerKoerper.position.set(X2 - D / 2, 1.1, TZ); welt.addBody(tuerKoerper); wandKoerper.push(tuerKoerper);
  // Innen: Sitzbänke, der Lobby-Bildschirm und der große rote Knopf
  const bankMat = new THREE.MeshStandardMaterial({ color: '#2f6b5a', roughness: 0.8 });
  teil(X1 + 0.45, 0.22, (TZ2 + Z2) / 2 + 0.4, 0.6, 0.44, Z2 - TZ2 - 1.4, bankMat);
  teil(X1 + 0.2, 0.75, (TZ2 + Z2) / 2 + 0.4, 0.12, 0.65, Z2 - TZ2 - 1.4, bankMat, false);
  // 🔧💚 Die Reparatur-Station (hinten rechts): eine leuchtende Plattform + ein Gerät an der Wand
  const heil = { x: X2 - 0.95, z: Z2 - 1.05, r: 0.75 };
  const heilGruen = new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.5, depthWrite: false });
  const platte = new THREE.Mesh(new THREE.CircleGeometry(heil.r, 28), heilGruen); platte.rotation.x = -Math.PI / 2; platte.position.set(heil.x, 0.035, heil.z); gruppe.add(platte);
  const ring = new THREE.Mesh(new THREE.RingGeometry(heil.r - 0.06, heil.r, 32), new THREE.MeshBasicMaterial({ color: '#b6ffcf' })); ring.rotation.x = -Math.PI / 2; ring.position.set(heil.x, 0.04, heil.z); gruppe.add(ring);
  const geraet = canvasTextur(128, 160, (g) => {   // Das Gerät: weißer Kasten, grünes Kreuz, Blitz
    g.fillStyle = '#eef3f1'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#10202a'; g.fillRect(10, 10, 108, 70);
    g.fillStyle = '#4ade80'; g.fillRect(52, 18, 24, 54); g.fillRect(37, 33, 54, 24);
    g.fillStyle = '#10202a'; g.font = 'bold 22px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('REPARATUR', 64, 108);
    g.fillStyle = '#ffd166'; g.font = 'bold 30px Arial, sans-serif'; g.fillText('⚡', 64, 145);
  }).tex;
  teil(heil.x, 1.3, Z2 - D - 0.12, 0.6, 0.75, 0.22, [lack, lack, lack, lack, lack, new THREE.MeshBasicMaterial({ map: geraet })]);   // (Vorderseite = Richtung -z, zum Businneren)
  const heilStrahl = new THREE.Mesh(new THREE.CylinderGeometry(heil.r * 0.8, heil.r * 0.9, 2.6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  heilStrahl.position.set(heil.x, 1.3, heil.z); heilStrahl.visible = false; heilStrahl.raycast = () => {}; gruppe.add(heilStrahl);
  const plusTex = canvasTextur(64, 64, (g) => { g.fillStyle = '#7dffb0'; g.fillRect(24, 8, 16, 48); g.fillRect(8, 24, 48, 16); }).tex;
  const plusse = [0, 1, 2, 3, 4, 5].map(k => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: plusTex, transparent: true, depthWrite: false })); sp.scale.setScalar(0.18); sp.visible = false; gruppe.add(sp); return sp; });
  Object.assign(heil, { platte, heilGruen, heilStrahl, plusse });
  const licht = lampeHinzu(cx, H - 0.35, (Z1 + Z2) / 2 + 1, '#eaffff', 1.5, 10, false);
  haus.bus = { gruppe, heil, x1: X1, x2: X2, z1: Z1, z2: Z2, tuer, tuerKoerper, tuerX: X2 - D / 2, tuerZ: TZ, tuerAuf: false, tuerWeg: 0, dachLichter,
    licht, lichtPos: licht ? licht.position.clone() : null,
    schuppen: { bus: true, x1: X1, z1: Z1, x2: X2, z2: Z2, seite: 'o', tx: X2, tz: TZ, nx: 1, nz: 0, innen: { x: X2 - 1.2, y: 0, z: TZ }, aussen: { x: X2 + 1.3, y: 0, z: TZ } } };
  haus.spawn = { x: X2 + 1.6, z: TZ };   // Hier tauchst du wieder auf (vor der Bustür)
}
// 🚌💨 Der fahrende Bus (die Lobby): echte Fenster, ein Fahrer-Roboter – und draußen zieht die Landschaft vorbei
// (Der Bus steht in Wirklichkeit still – die Bäume, Laternen und Streifen bewegen sich. Wie im Kino!)
function baueFahrBus(ox, oz) {
  const X1 = ox, X2 = ox + 3.4, Z1 = oz, Z2 = oz + 12, H = 3.0, D = 0.15, cx = (X1 + X2) / 2, W = X2 - X1, L = Z2 - Z1, mz = (Z1 + Z2) / 2;
  const gruppe = new THREE.Group(); hausGruppe.add(gruppe);
  const wandMat = new THREE.MeshStandardMaterial({ color: '#b9c1c9', roughness: 0.8 }), streifen = new THREE.MeshBasicMaterial({ color: '#7cf5c6' });
  const glasMat = new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
  const teil = (x, y, z, b, h, t, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat); m.position.set(x, y, z); m.receiveShadow = true; gruppe.add(m); return m; };
  // Physik: Boden, Wände (ganz zu – raus kommt man erst an der Spukvilla) und Decke
  festerKoerper(cx, -0.1, mz, W + 2, 0.2, L + 2);
  festerKoerper(X1 + D / 2, H / 2, mz, D, H, L); festerKoerper(X2 - D / 2, H / 2, mz, D, H, L);
  festerKoerper(cx, H / 2, Z1 + D / 2, W, H, D); festerKoerper(cx, H / 2, Z2 - D / 2, W, H, D); festerKoerper(cx, H + 0.1, mz, W, 0.2, L);
  // Seitenwände mit ECHTEN Fenstern
  for (const x of [X1 + D / 2, X2 - D / 2]) {
    teil(x, 0.575, mz, D, 1.15, L, wandMat);
    teil(x, (2.15 + H) / 2, mz, D, H - 2.15, L, wandMat);
    teil(x, 1.15, mz, D + 0.02, 0.05, L, streifen);
    for (let z = Z1; z <= Z2 + 0.01; z += 2) teil(x, 1.65, z, D, 1.0, 0.22, wandMat);   // Fensterpfosten
    const glas = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.0), glasMat); glas.position.set(x, 1.65, mz); glas.rotation.y = Math.PI / 2; gruppe.add(glas);
  }
  // Vorne die große Windschutzscheibe, hinten eine Wand
  teil(cx, 0.6, Z1 + D / 2, W, 1.2, D, wandMat); teil(cx, (2.35 + H) / 2, Z1 + D / 2, W, H - 2.35, D, wandMat);
  const scheibe = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.15), glasMat); scheibe.position.set(cx, 1.77, Z1 + D / 2); gruppe.add(scheibe);
  teil(cx, H / 2, Z2 - D / 2, W, H, D, wandMat);
  teil(cx, H - D / 2, mz, W, D, L, new THREE.MeshStandardMaterial({ color: '#dfe5ea', roughness: 0.9 }));
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ color: '#2b3038', roughness: 0.9 }));
  boden.rotation.x = -Math.PI / 2; boden.position.set(cx, 0.02, mz); gruppe.add(boden);
  // Die Tür (zu, rechts vorne)
  const tuerMat = new THREE.MeshStandardMaterial({ color: '#eef3f1', roughness: 0.5 });
  teil(X2 - D / 2 - 0.02, 1.1, Z1 + 2, 0.06, 2.2, 1.4, tuerMat);
  // Der Fahrer-Roboter am Lenkrad (mit Armaturenbrett)
  teil(cx, 1.0, Z1 + 0.45, W - 0.3, 0.25, 0.6, new THREE.MeshStandardMaterial({ color: '#1d2228', roughness: 0.6 }));
  for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), new THREE.MeshBasicMaterial({ color: ['#4ade80', '#ffd166', '#ff6b6b', '#7cf5c6'][k] })); l.position.set(X1 + 1.3 + k * 0.15, 1.13, Z1 + 0.76); l.rotation.x = -1.2; gruppe.add(l); }
  const lenkrad = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), new THREE.MeshStandardMaterial({ color: '#111' }));
  lenkrad.position.set(X1 + 0.85, 1.25, Z1 + 0.85); lenkrad.rotation.x = -0.9; gruppe.add(lenkrad);
  teil(X1 + 0.85, 0.3, Z1 + 1.65, 0.6, 0.6, 0.6, new THREE.MeshStandardMaterial({ color: '#2f6b5a', roughness: 0.8 }));   // Fahrersitz
  const fahrer = baueHelferMesh({ name: 'Fahrer Kurt', farbe: '#ffd166' });
  if (fahrer.g.parent) fahrer.g.parent.remove(fahrer.g);
  gruppe.add(fahrer.g); fahrer.g.position.set(X1 + 0.85, 0.15, Z1 + 1.55); fahrer.g.rotation.y = Math.PI;
  fahrer.arme.forEach(a => { a.rotation.x = -0.9; });
  malGesicht({ gesicht: fahrer.gesicht, farbe: '#ffd166', kaputt: 0, angst: 0, froh: 1, redet: 0, blinzelVersatz: 0 });
  // Bänke, der Bildschirm und der große rote Knopf
  const bankMat = new THREE.MeshStandardMaterial({ color: '#2f6b5a', roughness: 0.8 });
  teil(X1 + 0.45, 0.22, mz + 2.2, 0.6, 0.44, 5.6, bankMat); festerKoerper(X1 + 0.45, 0.22, mz + 2.2, 0.6, 0.44, 5.6);
  teil(X1 + 0.2, 0.75, mz + 2.2, 0.12, 0.65, 5.6, bankMat);
  // 🎨🎩 Die Roboter-Werkstatt: ein Computer (links vorne) und daneben eine Drehscheibe mit deiner Anprobe-Puppe
  const pc = { x: X1 + 0.35, z: Z1 + 3.0 };
  teil(pc.x, 0.45, pc.z, 0.5, 0.9, 0.9, new THREE.MeshStandardMaterial({ color: '#3a4250', roughness: 0.6 })); festerKoerper(pc.x, 0.6, pc.z, 0.5, 1.2, 0.9);
  teil(pc.x - 0.05, 1.2, pc.z, 0.08, 0.6, 0.85, new THREE.MeshStandardMaterial({ color: '#15181e', roughness: 0.4 }));
  const pcBild = canvasTextur(320, 224, () => {});
  const pcSchirm = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.54), new THREE.MeshBasicMaterial({ map: pcBild.tex }));
  pcSchirm.position.set(pc.x - 0.005, 1.2, pc.z); pcSchirm.rotation.y = Math.PI / 2; gruppe.add(pcSchirm);
  teil(pc.x + 0.1, 0.92, pc.z, 0.22, 0.03, 0.55, new THREE.MeshStandardMaterial({ color: '#202530' }));   // Tastatur
  const puppe = { x: X1 + 0.6, z: Z1 + 4.45, T: null, schluessel: '' };
  const drehScheibe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 28), new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: 0.6, roughness: 0.4 }));
  drehScheibe.position.set(puppe.x, 0.04, puppe.z); gruppe.add(drehScheibe);
  const scheibenRing = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.015, 6, 32), new THREE.MeshBasicMaterial({ color: '#7cf5c6' }));
  scheibenRing.rotation.x = Math.PI / 2; scheibenRing.position.set(puppe.x, 0.085, puppe.z); gruppe.add(scheibenRing);
  festerKoerper(puppe.x, 0.7, puppe.z, 0.6, 1.4, 0.6);
  Object.assign(puppe, { gruppe, ring: scheibenRing });
  const monitor = canvasTextur(512, 288, () => {});
  const bild = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), new THREE.MeshBasicMaterial({ map: monitor.tex }));
  bild.position.set(cx, 1.75, Z2 - D - 0.02); bild.rotation.y = Math.PI; gruppe.add(bild);
  const knopf = { x: X2 - 0.5, z: Z1 + 3.6 };
  teil(knopf.x, 0.5, knopf.z, 0.35, 1.0, 0.35, metallGrauMat); festerKoerper(knopf.x, 0.5, knopf.z, 0.35, 1.0, 0.35);
  const knopfOben = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.1, 16), new THREE.MeshStandardMaterial({ color: '#ff2a2a', emissive: '#aa0000', emissiveIntensity: 1 }));
  knopfOben.position.set(knopf.x, 1.05, knopf.z); gruppe.add(knopfOben);
  const knopfSchild = schildMesh('🔴 E = LOS!', 0.9, 0.3); knopfSchild.position.set(knopf.x + 0.12, 2.0, knopf.z); knopfSchild.rotation.y = -Math.PI / 2; gruppe.add(knopfSchild);
  // 🤖 Der Bot-Schalter: Mit oder ohne Helfer-Bots? (Lampe grün = mit, grau = ohne)
  const botKnopf = { x: X2 - 0.5, z: Z1 + 6.0 };
  teil(botKnopf.x, 0.5, botKnopf.z, 0.35, 1.0, 0.35, metallGrauMat); festerKoerper(botKnopf.x, 0.5, botKnopf.z, 0.35, 1.0, 0.35);
  const botLampe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshBasicMaterial({ color: '#4ade80' }));
  botLampe.position.set(botKnopf.x, 1.08, botKnopf.z); gruppe.add(botLampe);
  const botSchild = canvasTextur(256, 96, () => {});
  const botSchildM = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ map: botSchild.tex }));
  botSchildM.position.set(botKnopf.x + 0.12, 2.0, botKnopf.z); botSchildM.rotation.y = -Math.PI / 2; gruppe.add(botSchildM);
  // 🗺️ Der Karten-Schalter: Wohin fährt der Bus? (Spukvilla oder Schule)
  const karteKnopf = { x: X2 - 0.5, z: Z1 + 7.3 };
  teil(karteKnopf.x, 0.5, karteKnopf.z, 0.35, 1.0, 0.35, metallGrauMat); festerKoerper(karteKnopf.x, 0.5, karteKnopf.z, 0.35, 1.0, 0.35);
  const karteLampe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshBasicMaterial({ color: '#7cc4ff' }));
  karteLampe.position.set(karteKnopf.x, 1.08, karteKnopf.z); gruppe.add(karteLampe);
  const karteSchild = canvasTextur(256, 96, () => {});
  const karteSchildM = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.36), new THREE.MeshBasicMaterial({ map: karteSchild.tex }));
  karteSchildM.position.set(karteKnopf.x + 0.12, 2.0, karteKnopf.z); karteSchildM.rotation.y = -Math.PI / 2; gruppe.add(karteSchildM);
  return { gruppe, x1: X1, x2: X2, z1: Z1, z2: Z2, knopf, knopfOben, monitor, pc, pcBild, puppe, karteKnopf, karteLampe, karteSchild, botKnopf, botLampe, botSchild, lobby: { x: cx, z: Z2 - 2.2 }, licht: { x: cx, y: H - 0.35, z: mz }, landschaft: baueLandschaft(cx, mz) };
}
function baueLandschaft(cx, mz) {   // Die Straße durch den nächtlichen Wald (alles bewegt sich nach hinten = der Bus fährt nach vorne)
  const g = new THREE.Group(); hausGruppe.add(g);
  const LANG = 200, hilf = new THREE.Object3D();
  const gras = grasTextur.clone(); gras.needsUpdate = true; gras.repeat.set(30, 50);
  const wiese = new THREE.Mesh(new THREE.PlaneGeometry(120, LANG), new THREE.MeshStandardMaterial({ map: gras, roughness: 1 }));
  wiese.rotation.x = -Math.PI / 2; wiese.position.set(cx, -0.02, mz); g.add(wiese);
  const strasse = new THREE.Mesh(new THREE.PlaneGeometry(7, LANG), new THREE.MeshStandardMaterial({ color: '#1a1b1e', roughness: 0.9 }));
  strasse.rotation.x = -Math.PI / 2; strasse.position.set(cx + 0.8, -0.01, mz); g.add(strasse);
  const dinge = [];   // Alles, was vorbeizieht: { art, x, z, ... }
  for (let k = 0; k < 34; k++) dinge.push({ art: 'streifen', x: cx + 0.8, z: mz - LANG / 2 + k * 6 });
  for (let k = 0; k < 8; k++) dinge.push({ art: 'laterne', x: cx + 5.2, z: mz - LANG / 2 + k * 25 });
  for (let k = 0; k < 90; k++) { const seite = k % 2 ? 1 : -1; dinge.push({ art: 'baum', x: cx + 0.8 + seite * (6 + Math.random() * 28), z: mz - LANG / 2 + Math.random() * LANG, h: 6 + Math.random() * 6, dreh: Math.random() * 6 }); }
  const anzahl = a => dinge.filter(d => d.art === a).length;
  const streifenM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.02, 3), new THREE.MeshBasicMaterial({ color: '#d8d8d0' }), anzahl('streifen'));
  const stammM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.28, 1, 7), new THREE.MeshStandardMaterial({ color: '#2a1e16', roughness: 1 }), anzahl('baum'));
  const kroneM = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), new THREE.MeshStandardMaterial({ color: '#13241a', roughness: 1 }), anzahl('baum'));
  const pfostenM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 4.5, 0.15), new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.7 }), anzahl('laterne'));
  const kopfM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: '#ffe2a8' }), anzahl('laterne'));
  const lichtM = new THREE.InstancedMesh(new THREE.CircleGeometry(3.2, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffcf8a', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending }), anzahl('laterne'));
  for (const m of [streifenM, stammM, kroneM, pfostenM, kopfM, lichtM]) { m.frustumCulled = false; g.add(m); }
  const mond = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: '#e9e6cf', fog: false }));
  mond.position.set(cx - 70, 60, mz - 140); g.add(mond);
  const L = { gruppe: g, dinge, LANG, mz, streifenM, stammM, kroneM, pfostenM, kopfM, lichtM, hilf };
  landschaftZeigen(L);
  return L;
}
function landschaftZeigen(L) {   // Alle Bäume, Laternen und Streifen an ihre (neue) Stelle setzen
  const z = { streifen: 0, baum: 0, laterne: 0 }, h = L.hilf;
  for (const d of L.dinge) {
    const k = z[d.art]++;
    h.rotation.set(0, 0, 0); h.scale.set(1, 1, 1);
    if (d.art === 'streifen') { h.position.set(d.x, 0.0, d.z); h.updateMatrix(); L.streifenM.setMatrixAt(k, h.matrix); }
    else if (d.art === 'laterne') {
      h.position.set(d.x, 2.25, d.z); h.updateMatrix(); L.pfostenM.setMatrixAt(k, h.matrix);
      h.position.set(d.x - 0.4, 4.45, d.z); h.updateMatrix(); L.kopfM.setMatrixAt(k, h.matrix);
      h.position.set(d.x - 1.5, 0.0, d.z); h.updateMatrix(); L.lichtM.setMatrixAt(k, h.matrix);
    } else {
      h.position.set(d.x, d.h / 2, d.z); h.rotation.set(0, d.dreh, 0); h.scale.set(1, d.h, 1); h.updateMatrix(); L.stammM.setMatrixAt(k, h.matrix);
      const r = 2.0 * d.h / 10; h.position.set(d.x, d.h * 0.65, d.z); h.scale.set(r, d.h * 0.7, r); h.updateMatrix(); L.kroneM.setMatrixAt(k, h.matrix);
    }
  }
  for (const m of [L.streifenM, L.stammM, L.kroneM, L.pfostenM, L.kopfM, L.lichtM]) m.instanceMatrix.needsUpdate = true;
}
function landschaftFahren(L, dt) {
  const weg = BUS_TEMPO * dt;
  for (const d of L.dinge) { d.z += weg; if (d.z > L.mz + L.LANG / 2) d.z -= L.LANG; }
  landschaftZeigen(L);
}
function baueAbgabe() {   // Die Abgabe: eine grüne Zone mit Rand (zum Haus hin offen), ein Schild und eine Laterne
  const L = haus.laster;
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(L.x2 - L.x1, L.z2 - L.z1), new THREE.MeshBasicMaterial({ color: '#1f8a64', transparent: true, opacity: 0.45 }));
  zone.rotation.x = -Math.PI / 2; zone.position.set((L.x1 + L.x2) / 2, 0.03, (L.z1 + L.z2) / 2);
  hausGruppe.add(zone);
  const randMat = new THREE.MeshStandardMaterial({ color: '#7cf5c6', emissive: '#2aa77a', emissiveIntensity: 0.8 });
  festerKlotz((L.x1 + L.x2) / 2, 0.2, L.z1, L.x2 - L.x1, 0.4, 0.15, randMat, false);
  festerKlotz((L.x1 + L.x2) / 2, 0.2, L.z2, L.x2 - L.x1, 0.4, 0.15, randMat, false);
  festerKlotz(L.x1, 0.2, (L.z1 + L.z2) / 2, 0.15, 0.4, L.z2 - L.z1, randMat, false);
  const pfosten = festerKlotz(L.x1 - 0.3, 1.4, (L.z1 + L.z2) / 2, 0.15, 2.8, 0.15, metallGrauMat, false);
  const schild = schildMesh('🚚 ARAG-ABGABE', 2.6, 0.65);
  schild.position.set(L.x1 - 0.2, 2.5, (L.z1 + L.z2) / 2); schild.rotation.y = Math.PI / 2;
  hausGruppe.add(schild);
  lampeHinzu((L.x1 + L.x2) / 2, 3.2, (L.z1 + L.z2) / 2, '#c8ffe8', 2.2, 11, false);
}
const imParkplatz = (x, z, rand = 0) => (haus && haus.parkplatz || []).some(P => x > P.x1 - rand && x < P.x2 + rand && z > P.z1 - rand && z < P.z2 + rand);
const kiesTextur = malTextur(128, 128, (g, b, h) => {   // Schotter
  g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, b, h);
  for (let k = 0; k < 900; k++) { g.fillStyle = ['#4a4a4e', '#2c2c2e', '#55524e', '#333336'][k % 4]; g.fillRect(Math.random() * b, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); }
});
function bauePlatzBoden() {   // Schotter auf dem Parkplatz und dem Waldweg (liegt knapp über dem Gras)
  for (const P of haus.parkplatz) {
    const t = kiesTextur.clone(); t.needsUpdate = true; t.repeat.set((P.x2 - P.x1) / 3, (P.z2 - P.z1) / 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(P.x2 - P.x1, P.z2 - P.z1), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set((P.x1 + P.x2) / 2, 0.006, (P.z1 + P.z2) / 2); m.receiveShadow = true; hausGruppe.add(m);
  }
}
function baueWald() {
  const B = haus.breit * RAUM, T = haus.tief * RAUM, M = WALD_RAND, dach = (haus.etagen - 1) * ETAGE_HOEHE + WAND_HOEHE;
  // 1) Boden: Waldboden rund ums Haus (dicke Platten, wie im Erdgeschoss)
  for (const [xa, za, xb, zb] of [[-M, -M, B + M, 0], [-M, T, B + M, T + M], [-M, 0, 0, T], [B, 0, B + M, T]]) {
    const b = xb - xa, t = zb - za;
    festerKoerper((xa + xb) / 2, -GRUBE_TIEFE / 2, (za + zb) / 2, b, GRUBE_TIEFE, t);
    const tex = grasTextur.clone(); tex.needsUpdate = true; tex.repeat.set(b / 4, t / 4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b, t), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set((xa + xb) / 2, 0, (za + zb) / 2); m.receiveShadow = true;
    hausGruppe.add(m);
  }
  // 2) Das Haus von außen: Gesimse zwischen den Stockwerken, Dach, Fenster, Laternen an den Haustüren
  const leiste = new THREE.MeshStandardMaterial({ color: '#1c1714', roughness: 0.9 });
  const ring = (y, h, dicke) => {
    for (const [x, z, b, t] of [[B / 2, -0.15 - dicke / 2, B + 0.3 + dicke * 2, dicke], [B / 2, T + 0.15 + dicke / 2, B + 0.3 + dicke * 2, dicke],
      [-0.15 - dicke / 2, T / 2, dicke, T + 0.3], [B + 0.15 + dicke / 2, T / 2, dicke, T + 0.3]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), leiste); m.position.set(x, y, z); hausGruppe.add(m);
    }
  };
  for (let e = 1; e < haus.etagen; e++) ring(e * ETAGE_HOEHE - 0.1, 0.35, 0.12);
  const dachM = new THREE.Mesh(new THREE.BoxGeometry(B + 1.2, 0.4, T + 1.2), leiste); dachM.position.set(B / 2, dach + 0.2, T / 2); hausGruppe.add(dachM);
  for (let k = 0; k < 6; k++) {   // Schornsteine
    const sch = new THREE.Mesh(new THREE.BoxGeometry(0.9, zufall(1.5, 3), 0.9), fassadeMat);
    sch.position.set(zufall(2, B - 2), dach + 1, zufall(2, T - 2)); hausGruppe.add(sch);
  }
  const fenster = new THREE.MeshBasicMaterial({ map: fensterTextur });
  for (const R of haus.raeume) {
    for (const [seite, ok, x, z, dreh] of [['n', R.j === 0, R.x0 + RAUM / 2, -0.16, Math.PI], ['s', R.j === haus.tief - 1, R.x0 + RAUM / 2, T + 0.16, 0],
      ['w', R.i === 0, -0.16, R.z0 + RAUM / 2, -Math.PI / 2], ['o', R.i === haus.breit - 1, B + 0.16, R.z0 + RAUM / 2, Math.PI / 2]]) {
      if (!ok || haus.aussenTueren.has(`${R.nr}|${seite}`)) continue;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), fenster); f.position.set(x, R.basis + 1.7, z); f.rotation.y = dreh; hausGruppe.add(f);
    }
  }
  for (const a of haus.aussenTuerListe) {   // Eine Laterne über jeder Haustür
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), new THREE.MeshBasicMaterial({ color: '#ffcf7a' }));
    l.position.set(a.x + a.nx * 0.35 + (a.nz ? 1.5 : 0), 2.7, a.z + a.nz * 0.35 + (a.nx ? 1.5 : 0)); hausGruppe.add(l);
    lampeHinzu(l.position.x + a.nx * 0.5, 2.6, l.position.z + a.nz * 0.5, '#ffb84d', 1.2, 9, true);
  }
  // 3) Der Zaun außen herum (unsichtbar höher, damit niemand drüberspringt)
  const holz = new THREE.MeshStandardMaterial({ color: '#3b2c20', roughness: 1 });
  const latten = [], pfosten = [];
  for (const [xa, za, xb, zb] of [[-M, -M, B + M, -M], [-M, T + M, B + M, T + M], [-M, -M, -M, T + M], [B + M, -M, B + M, T + M]]) {
    const l = Math.hypot(xb - xa, zb - za), entlangX = za === zb;
    festerKoerper((xa + xb) / 2, 2, (za + zb) / 2, entlangX ? l : 0.3, 4, entlangX ? 0.3 : l);
    for (const y of [0.45, 1.05]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(entlangX ? l : 0.06, 0.08, entlangX ? 0.06 : l), holz);
      r.position.set((xa + xb) / 2, y, (za + zb) / 2); hausGruppe.add(r);
    }
    for (let d = 0; d <= l; d += 0.28) latten.push([xa + (xb - xa) * d / l, za + (zb - za) * d / l, entlangX]);
    for (let d = 0; d <= l; d += 2.5) pfosten.push([xa + (xb - xa) * d / l, za + (zb - za) * d / l]);
  }
  const hilf = new THREE.Object3D();
  const lattenM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1, 0.03), holz, latten.length);
  latten.forEach(([x, z, entlangX], k) => {
    const h = 1.1 + Math.random() * 0.35;   // Schiefe, unterschiedlich hohe Latten – gruselig!
    hilf.position.set(x, h / 2, z); hilf.rotation.set(0, entlangX ? 0 : Math.PI / 2, (Math.random() - 0.5) * 0.12); hilf.scale.set(1, h, 1);
    hilf.updateMatrix(); lattenM.setMatrixAt(k, hilf.matrix);
  });
  hausGruppe.add(lattenM);
  const pfostenM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), holz, pfosten.length);
  pfosten.forEach(([x, z], k) => { hilf.position.set(x, 0.8, z); hilf.rotation.set(0, 0, 0); hilf.scale.set(1, 1, 1); hilf.updateMatrix(); pfostenM.setMatrixAt(k, hilf.matrix); });
  hausGruppe.add(pfostenM);
  // 4) 🛖 Gartenhäuschen (Tür zeigt zum Haus)
  haus.schuppen = [];
  for (let v = 0; haus.schuppen.length < GARTENHAUS_ANZAHL && v < 500; v++) {
    const b = 4.4, t = 3.6, x1 = zufall(-M + 3, B + M - 3 - b), z1 = zufall(-M + 3, T + M - 3 - t), x2 = x1 + b, z2 = z1 + t;
    if (x2 > -7 && x1 < B + 7 && z2 > -7 && z1 < T + 7) continue;                                                          // Nicht zu nah am Haus
    if (haus.schuppen.some(S => x2 > S.x1 - 7 && x1 < S.x2 + 7 && z2 > S.z1 - 7 && z1 < S.z2 + 7)) continue;              // Nicht zu nah aneinander
    if ((haus.parkplatz || []).some(P => x2 > P.x1 - 3 && x1 < P.x2 + 3 && z2 > P.z1 - 3 && z1 < P.z2 + 3)) continue;   // Nicht auf den Parkplatz oder den Waldweg
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    if (haus.aussenTuerListe.some(a => abstand2D(cx, cz, a.weit.x, a.weit.z) < 7)) continue;                                // Nicht vor eine Haustür
    const hx = B / 2 - cx, hz = T / 2 - cz;
    const seite = Math.abs(hx) / B > Math.abs(hz) / T ? (hx > 0 ? 'o' : 'w') : (hz > 0 ? 's' : 'n');
    const [tx, tz, nx, nz] = { n: [cx, z1, 0, -1], s: [cx, z2, 0, 1], w: [x1, cz, -1, 0], o: [x2, cz, 1, 0] }[seite];
    haus.schuppen.push({ x1, z1, x2, z2, seite, tx, tz, nx, nz, innen: { x: tx - nx * 1.2, y: 0, z: tz - nz * 1.2 }, aussen: { x: tx + nx * 1.3, y: 0, z: tz + nz * 1.3 } });
  }
  for (const S of haus.schuppen) baueGartenhaus(S);
  // 5) Bäume: dunkle Tannen und ein paar tote, kahle Bäume
  const baeume = [];
  const frei = (x, z) => {
    if (x > -3.5 && x < B + 3.5 && z > -3.5 && z < T + 3.5) return false;                       // Nicht zu nah ans Haus
    if (x < -M + 1.2 || x > B + M - 1.2 || z < -M + 1.2 || z > T + M - 1.2) return false;       // Nicht in den Zaun
    for (const a of haus.aussenTuerListe) if (abstand2D(x, z, a.weit.x, a.weit.z) < 3.5) return false;   // Weg vor der Haustür frei lassen
    for (const S of haus.schuppen) if ((x > S.x1 - 2.5 && x < S.x2 + 2.5 && z > S.z1 - 2.5 && z < S.z2 + 2.5) || abstand2D(x, z, S.tx + S.nx * 3, S.tz + S.nz * 3) < 3) return false;   // Platz ums Gartenhäuschen
    return baeume.every(b => abstand2D(x, z, b.x, b.z) > 2.2);
  };
  for (let v = 0; baeume.length < BAUM_ANZAHL && v < BAUM_ANZAHL * 30; v++) {
    const x = zufall(-M, B + M), z = zufall(-M, T + M);
    if (frei(x, z)) baeume.push({ x, z, h: zufall(6, 12), tot: rnd() < 0.25, dreh: zufall(0, 6.3) });
  }
  for (let k = baeume.length - 1; k >= 0; k--) if (imParkplatz(baeume[k].x, baeume[k].z, 1.8)) baeume.splice(k, 1);   // 🅿️ Auf dem Parkplatz und dem Waldweg stehen keine Bäume
  const stammMat = new THREE.MeshStandardMaterial({ color: '#2a1e16', roughness: 1 }), nadelMat = new THREE.MeshStandardMaterial({ color: '#13241a', roughness: 1 });
  const lebend = baeume.filter(b => !b.tot), kahl = baeume.filter(b => b.tot);
  const staemme = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.28, 1, 7), stammMat, baeume.length);
  const kronen = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), nadelMat, lebend.length * 3);
  const aeste = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.08, 1, 5), stammMat, kahl.length * 4);
  baeume.forEach((b, k) => {
    hilf.position.set(b.x, b.h * 0.5, b.z); hilf.rotation.set(0, b.dreh, b.tot ? 0.05 : 0); hilf.scale.set(1, b.h, 1);
    hilf.updateMatrix(); staemme.setMatrixAt(k, hilf.matrix);
    festerKoerper(b.x, 2, b.z, 0.45, 4, 0.45);
  });
  lebend.forEach((b, k) => {
    for (let s = 0; s < 3; s++) {   // Drei Lagen Nadeln, oben immer schmaler
      const r = (2.2 - s * 0.6) * (b.h / 10), hoehe = b.h * 0.38;
      hilf.position.set(b.x, b.h * (0.35 + s * 0.2) + hoehe / 2, b.z); hilf.rotation.set(0, b.dreh, 0); hilf.scale.set(r, hoehe, r);
      hilf.updateMatrix(); kronen.setMatrixAt(k * 3 + s, hilf.matrix);
    }
  });
  kahl.forEach((b, k) => {
    for (let s = 0; s < 4; s++) {   // Krumme, kahle Äste
      const l = zufall(1.2, 2.4), w = b.dreh + s * 1.6;
      hilf.position.set(b.x + Math.sin(w) * l * 0.4, b.h * (0.5 + s * 0.11), b.z + Math.cos(w) * l * 0.4);
      hilf.rotation.set(Math.cos(w) * 0.9, 0, -Math.sin(w) * 0.9); hilf.scale.set(1, l, 1);
      hilf.updateMatrix(); aeste.setMatrixAt(k * 4 + s, hilf.matrix);
    }
  });
  for (const m of [staemme, kronen, aeste]) { m.castShadow = true; hausGruppe.add(m); }
  haus.baeume = baeume;
  if (haus.bus) haus.schuppen.push(haus.bus.schuppen);   // 🚌 Der Bus funktioniert wie ein Gartenhäuschen: rein und raus nur durch die Tür
  if (haus.parkplatz) bauePlatzBoden();
  // 5) Schätze im Wald (im Laub versteckt ...)
  for (let k = 0; k < WALD_SCHAETZE; k++) { const pl = waldPlatz(zufall, rnd); if (pl) { const typ = gewichtetWaehlen(VILLA_SCHAETZE); neuerSchatz(typ, pl.x, typ.groesse[1] / 2 + 0.05, pl.z); } }
  baueWiese(B, T, M);   // 🌱🌼 Gras und Wildblumen
  // 6) Der Mond
  const mond = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12), new THREE.MeshBasicMaterial({ color: '#e9e6cf', fog: false }));
  mond.position.set(B / 2 + 40, 70, -110); hausGruppe.add(mond);
}

// Ein Mauseloch soll rund aussehen: Oben wird die Ecke mit Tapete zugemacht, dazu ein dunkler Holzrahmen
const mausDunkel = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
function mausLochDeko(x, basis, z, entlangX, mat) {
  const r = MAUSELOCH.breit / 2, h = MAUSELOCH.hoch, by = h - r - 0.02;   // by = Mitte vom runden Bogen
  const ecken = new THREE.Shape();
  ecken.moveTo(-r, h); ecken.lineTo(r, h); ecken.lineTo(r, by);
  ecken.absarc(0, by, r, 0, Math.PI, false);   // Der Bogen (von rechts über oben nach links)
  ecken.lineTo(-r, h);
  const eckenGeo = new THREE.ShapeGeometry(ecken, 10);
  const dunkel = new THREE.Shape();   // Drinnen ist es dunkel ...
  dunkel.moveTo(-r, 0); dunkel.lineTo(r, 0); dunkel.lineTo(r, by); dunkel.absarc(0, by, r, 0, Math.PI, false); dunkel.lineTo(-r, 0);
  const dunkelGeo = new THREE.ShapeGeometry(dunkel, 10);
  const g = new THREE.Group();
  for (const seite of [-1, 1]) {
    const e = new THREE.Mesh(eckenGeo, mat); e.position.z = seite * 0.152; if (seite < 0) e.rotation.y = Math.PI; g.add(e);
    const bogen = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 14, Math.PI), dunkelHolzMat);
    bogen.position.set(0, by, seite * 0.16); g.add(bogen);
    for (const sx of [-1, 1]) { const pfosten = new THREE.Mesh(new THREE.BoxGeometry(0.07, by, 0.05), dunkelHolzMat); pfosten.position.set(sx * r, by / 2, seite * 0.16); g.add(pfosten); }
  }
  const innen = new THREE.Mesh(dunkelGeo, mausDunkel); g.add(innen);   // (Ohne Physik: Da kriechst du einfach durch)
  g.position.set(x, basis, z);
  if (!entlangX) g.rotation.y = Math.PI / 2;
  hausGruppe.add(g);
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
  return licht;
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
      if (rnd() < 0.5) { const k = g * 0.7; m.box(k, k, k, x + g / 2, g + k / 2, g / 2 + 0.05, kistenMat, { fest: true }); }
      else m.ablage(x + g / 2, g / 2 + 0.05, g - 0.2, g - 0.2, g + 0.02);
      x += g + 0.1;
    }
    return m;
  },
  metallregal() {   // Metallregal mit Kartons
    const m = neuesMoebel();
    m.box(1.8, 2.0, 0.5, 0, 1.0, 0.25, metallGrauMat, { fest: true, blockt: true });
    for (let k = 0; k < 3; k++) for (let n = 0; n < 3; n++) if (rnd() < 0.7) m.box(0.45, 0.35, 0.4, -0.6 + n * 0.6, 0.38 + k * 0.62, 0.28, kistenMat, { schatten: false });
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
  // Festes Geländer an der offenen Seite (damit niemand seitlich runterfällt).
  // Es fängt erst weiter oben an (GELAENDER_AB) – sonst ragt es unten in den Gang und man bleibt daran hängen!
  const gA = x1 + GELAENDER_AB, gLauf = x2 - gA, gLaenge = gLauf / Math.cos(winkel);
  const gMitteX = (gA + x2) / 2, gMitteY = t.basis + ETAGE_HOEHE * ((gMitteX - x1) / lauf);
  festerKoerper(gMitteX - Math.sin(winkel) * 0.5, gMitteY + Math.cos(winkel) * 0.5, z2 + 0.04, gLaenge, 1.0, 0.08, q);
  // Unter der Treppe ist es fest (sonst könnte man in die Stufen hineinlaufen)
  festerKoerper(x1 + 2.05, t.basis + 0.3, zm, 1.1, 0.6, breite);
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
  for (let k = 0; k <= 5; k++) {
    const x = gA + gLauf * k / 5, y = t.basis + ETAGE_HOEHE * (x - x1) / lauf;
    const pfosten = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), dunkelHolzMat);
    pfosten.position.set(x, y + 0.48, z2 - 0.05);
    hausGruppe.add(pfosten);
  }
  const lauf3 = new THREE.Mesh(new THREE.BoxGeometry(gLaenge, 0.06, 0.08), dunkelHolzMat);
  lauf3.position.set(gMitteX, gMitteY + 0.95, z2 - 0.05);
  lauf3.rotation.z = winkel;
  hausGruppe.add(lauf3);
  // Oben: Geländer um das Loch, damit man nicht runterfällt (die Ostseite bleibt offen – da kommt man an)
  const o = t.basis + ETAGE_HOEHE;
  festerKlotz((t.x0 + LOCH.x1 + t.x0 + LOCH.x2) / 2, o + 0.5, t.z0 + LOCH.z2 + 0.04, LOCH.x2 - LOCH.x1, 1.0, 0.08, dunkelHolzMat, false);
  festerKlotz(t.x0 + LOCH.x1 - 0.04, o + 0.5, t.z0 + (LOCH.z1 + LOCH.z2) / 2, 0.08, 1.0, LOCH.z2 - LOCH.z1, dunkelHolzMat, false);
}
// Boden/Decke zwischen zwei Stockwerken für einen Raum (mit Loch, wenn von unten eine Treppe hochkommt)
// ----- Bodenlöcher -----
const erdeMat = new THREE.MeshStandardMaterial({ color: '#2a1d14', roughness: 1 });
function platteMitLoch(R, L, platte) {   // Den Boden eines Raumes in Platten bauen – um das Loch herum
  const x0 = R.x0, z0 = R.z0, x1 = x0 + RAUM, z1 = z0 + RAUM;
  if (!L) { platte(x0, z0, x1, z1); return; }
  platte(x0, z0, x1, L.z1);          // Norden
  platte(x0, L.z2, x1, z1);          // Süden
  platte(x0, L.z1, L.x1, L.z2);      // Westen
  platte(L.x2, L.z1, x1, L.z2);      // Osten
}
function bodenFlaeche(R, xa, za, xb, zb, y, mat) {   // Ein Stück Boden – das Muster passt genau zum Rest vom Raum
  const b = xb - xa, t = zb - za;
  if (b <= 0.01 || t <= 0.01) return;
  const geo = new THREE.PlaneGeometry(b, t), pos = geo.attributes.position, uv = geo.attributes.uv;
  const mx = (xa + xb) / 2, mz = (za + zb) / 2;
  for (let k = 0; k < pos.count; k++) uv.setXY(k, (mx + pos.getX(k) - R.x0) / RAUM, (R.z0 + RAUM - mz + pos.getY(k)) / RAUM);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2; m.position.set(mx, y, mz); m.receiveShadow = true;
  hausGruppe.add(m);
}
function lochRand(L) {   // Kaputte, abgebrochene Bretter rund ums Loch
  const y = L.basis + 0.015, b = L.x2 - L.x1, t = L.z2 - L.z1, mx = (L.x1 + L.x2) / 2, mz = (L.z1 + L.z2) / 2;
  for (const [x, z, lb, lt] of [[mx, L.z1, b + 0.1, 0.08], [mx, L.z2, b + 0.1, 0.08], [L.x1, mz, 0.08, t + 0.1], [L.x2, mz, 0.08, t + 0.1]]) {
    const brett = new THREE.Mesh(new THREE.BoxGeometry(lb, 0.03, lt), dunkelHolzMat);
    brett.position.set(x, y, z); hausGruppe.add(brett);
  }
  for (let k = 0; k < 5; k++) {   // Ein paar Splitter ragen ins Loch
    const seite = k % 4, laenge = zufall(0.15, 0.35);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(seite < 2 ? 0.07 : laenge, 0.025, seite < 2 ? laenge : 0.07), dunkelHolzMat);
    const x = seite === 2 ? L.x1 + laenge / 2 : seite === 3 ? L.x2 - laenge / 2 : zufall(L.x1 + 0.2, L.x2 - 0.2);
    const z = seite === 0 ? L.z1 + laenge / 2 : seite === 1 ? L.z2 - laenge / 2 : zufall(L.z1 + 0.2, L.z2 - 0.2);
    splitter.position.set(x, y - 0.02, z); splitter.rotation.set(zufall(-0.3, 0.3), zufall(-0.4, 0.4), zufall(-0.3, 0.3));
    hausGruppe.add(splitter);
  }
}
// Ist hier ein Bodenloch? (rand = so viel Abstand halten)
function bodenLochBei(x, z, y, rand = 0) {
  for (const L of haus.bodenloecher || []) {
    if (Math.abs(y - L.basis) < 0.7 && x > L.x1 - rand && x < L.x2 + rand && z > L.z1 - rand && z < L.z2 + rand) return L;
  }
  return null;
}
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
  if (R.bodenloch) {   // Mit Bodenloch: Platten rundherum, der Boden obendrauf (damit das Muster passt)
    mats[2] = deckenMat;
    platteMitLoch(R, R.bodenloch, (xa, za, xb, zb) => { platte(xa, za, xb, zb); bodenFlaeche(R, xa, za, xb, zb, R.basis + 0.001, boden); });
    return;
  }
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
  for (const s of schussSpuren) szene.remove(s.mesh);
  schussSpuren = [];
  traenkeAufraeumen();
  for (const d of tuerListe) if (d.body.world) welt.removeBody(d.body);
  tuerListe = [];
  wandKoerper = []; sichtBlocker = []; schaetze = []; monster = []; helfer = []; splitter = []; schwebeTexte = []; funk = [];
  gegriffen = null; schwebend = null; schatzNummer = 0;
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
    do { i = zufallGanz(0, haus.breit - 1); j = zufallGanz(0, haus.tief - 1); } while (benutzt.has(`${i},${j}`) || saalVon(i, j, e) || saalVon(i, j, e + 1));   // (keine Treppe mitten im Saal)
    benutzt.add(`${i},${j}`);
    const unten = raumNr(i, j, e), oben = raumNr(i, j, e + 1);
    const t = { e, i, j, unten, oben, x0: i * RAUM, z0: j * RAUM, basis: e * ETAGE_HOEHE };
    haus.treppen.push(t);
    haus.treppeVon.set(unten, t);
    haus.raeume[unten].treppeHoch = t;
    haus.raeume[oben].treppeRunter = t;
    if (j > 0) { gesperrt.add(tuerSchluessel(unten, unten - haus.breit)); gesperrt.add(tuerSchluessel(oben, oben - haus.breit)); }
  }
  // 1b. 🧪 Die Kellertreppe: Von einem Raum im Erdgeschoss geht es runter in den Keller
  //     (am liebsten in der vordersten Reihe vom Keller, damit die Treppe an der Kellerwand steht)
  haus.keller = null;
  if (KELLER_AN && (ld.chemiker || KELLER_SCHAETZE)) {
    const K = KELLER, kandidaten = [];
    for (let j = K.j; j < K.j + K.tief; j++) for (let i = K.i; i < K.i + K.breit; i++) kandidaten.push([i, j]);
    const passt = ([i, j]) => i < haus.breit && j < haus.tief && !benutzt.has(`${i},${j}`) && !saalVon(i, j, 0) && raumNr(i, j, 0) !== haus.start;
    const wahl = kandidaten.find(([i, j]) => j === K.j && passt([i, j])) || kandidaten.find(passt);
    if (wahl) {
      const [i, j] = wahl, oben = raumNr(i, j, 0);
      const t = { e: -1, i, j, unten: -1, oben, x0: i * RAUM, z0: j * RAUM, basis: -ETAGE_HOEHE, keller: true };
      haus.raeume[oben].treppeRunter = t;
      if (j > 0) gesperrt.add(tuerSchluessel(oben, oben - haus.breit));
      haus.keller = { x1: K.i * RAUM, x2: Math.min(haus.breit, K.i + K.breit) * RAUM, z1: K.j * RAUM, z2: Math.min(haus.tief, K.j + K.tief) * RAUM,
        boden: -ETAGE_HOEHE, decke: -GRUBE_TIEFE, treppe: t };
    }
  }
  // 2. Türen: Pro Stockwerk erst ein Weg zu jedem Raum (wie ein Labyrinth), dann noch ein paar Abkürzungen
  const verbinde = (a, b) => haus.tueren.set(tuerSchluessel(a, b), rnd() < 0.2 ? DURCHGANG_BREITE : TUER_BREITE);
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
  for (let r = 0; r < anzahl; r++) for (const n of gleicheEtage(r)) if (n > r && !verbunden(r, n) && rnd() < 0.3) verbinde(r, n);
  for (const R of haus.raeume) {   // Große Säle: Wände zwischen den Räumen eines Saals fallen weg
    const S = saalVon(R.i, R.j, R.e);
    if (!S) continue;
    if (R.i + 1 < S.i + S.breit) haus.tueren.set(tuerSchluessel(R.nr, R.nr + 1), OFFEN);
    if (R.j + 1 < S.j + S.tief) haus.tueren.set(tuerSchluessel(R.nr, R.nr + haus.breit), OFFEN);
  }
  for (const t of haus.treppen) haus.tueren.set(tuerSchluessel(t.unten, t.oben), -1);   // Treppe = Verbindung nach oben
  if (haus.keller) haus.treppen.push(haus.keller.treppe);   // (Die Kellertreppe kommt erst jetzt dazu – sie ist keine Verbindung zwischen zwei Räumen)
  // Wie breit sind die Türen an jeder Seite? (0 = keine Tür)
  for (const R of haus.raeume) {
    const breite = n => haus.tueren.get(tuerSchluessel(R.nr, n)) || 0;
    R.tuer = { n: R.j > 0 ? breite(R.nr - haus.breit) : 0, s: R.j < haus.tief - 1 ? breite(R.nr + haus.breit) : 0, w: R.i > 0 ? breite(R.nr - 1) : 0, o: R.i < haus.breit - 1 ? breite(R.nr + 1) : 0 };
  }

  // 2a. 🚪 Haustüren nach draußen: auf jeder Seite vom Haus eine (im Erdgeschoss)
  haus.aussenTueren = new Set(); haus.aussenTuerListe = [];
  // (Die Haustür im Westen ist immer im Startraum: Da geht's raus zum Parkplatz mit dem Bus)
  const kanten = { n: R => R.j === 0 && !R.treppeHoch && !R.treppeRunter, s: R => R.j === haus.tief - 1, w: R => R.nr === haus.start, o: R => R.i === haus.breit - 1 };
  for (const seite of ['n', 's', 'w', 'o']) {
    const liste = haus.raeume.filter(R => R.e === 0 && kanten[seite](R));
    if (!liste.length) continue;
    const R = auswahl(liste);
    haus.aussenTueren.add(`${R.nr}|${seite}`); R.tuer[seite] = TUER_BREITE;
    const cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2;
    const [tx, tz, nx, nz] = { n: [cx, R.z0, 0, -1], s: [cx, R.z0 + RAUM, 0, 1], w: [R.x0, cz, -1, 0], o: [R.x0 + RAUM, cz, 1, 0] }[seite];
    haus.aussenTuerListe.push({ raum: R.nr, seite, x: tx, z: tz, nx, nz,
      innen: { x: tx - nx * 1.3, y: 0, z: tz - nz * 1.3 }, aussen: { x: tx + nx * 1.3, y: 0, z: tz + nz * 1.3 }, weit: { x: tx + nx * 5, y: 0, z: tz + nz * 5 } });
  }

  // 2b. 🐭 Mauselöcher (in Wänden ohne Tür) und 🕳️ Bodenlöcher aussuchen
  haus.mauseloecher = new Map(); haus.bodenloecher = [];
  const ohneTreppe = R => !R.treppeHoch && !R.treppeRunter;
  for (let e = 0; e < haus.etagen; e++) {
    const kandidaten = [];
    for (const R of haus.raeume) if (R.e === e) {
      if (R.i + 1 < haus.breit && !verbunden(R.nr, R.nr + 1)) kandidaten.push([R.nr, R.nr + 1]);
      if (R.j + 1 < haus.tief && !verbunden(R.nr, R.nr + haus.breit) && ohneTreppe(haus.raeume[R.nr + haus.breit])) kandidaten.push([R.nr, R.nr + haus.breit]);   // (Nicht hinter der Treppe)
    }
    for (const [a, b] of mischen(kandidaten).slice(0, MAUSELOCH_ANZAHL)) haus.mauseloecher.set(tuerSchluessel(a, b), RAUM / 2 + (rnd() - 0.5) * 1.2);
    const raeume = mischen(haus.raeume.filter(R => R.e === e && R.nr !== haus.start && ohneTreppe(R)));
    for (const R of raeume.slice(0, BODENLOCH_ANZAHL)) {
      // Das Loch liegt zwischen Raummitte und einer Wand (am liebsten einer ohne Tür)
      const seiten = ['n', 's', 'w', 'o'].filter(w => !R.tuer[w]), seite = auswahl(seiten.length ? seiten : ['n', 's', 'w', 'o']);
      const cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2, a = 2.95, h = BODENLOCH / 2;
      const [mx, mz] = { n: [cx, cz - a], s: [cx, cz + a], w: [cx - a, cz], o: [cx + a, cz] }[seite];
      R.bodenloch = { e, nr: R.nr, basis: R.basis, x1: mx - h, x2: mx + h, z1: mz - h, z2: mz + h };
      haus.bodenloecher.push(R.bodenloch);
    }
  }

  // 3. Räume mit Thema: Böden und Zwischendecken
  for (const R of haus.raeume) {
    R.saal = saalVon(R.i, R.j, R.e);
    R.art = R.saal ? { ...R.saal, immerLicht: true } : gewichtetWaehlen(RAUM_ARTEN);
    if (R.nr === haus.start) R.art = { id: 'garage', name: R.saal ? R.saal.name : 'Garage', emoji: R.saal ? R.saal.emoji : '🚚', boden: R.saal ? R.saal.boden : 'beton', ecken: [] };
    const t = BOEDEN[R.art.boden].clone(); t.needsUpdate = true;
    t.repeat.set(R.art.boden === 'holz' ? 3.3 : 5, R.art.boden === 'holz' ? 3.3 : 5);
    const bodenMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
    if (R.e === 0) {   // Erdgeschoss: dicke Platten (so tief wie eine Grube), darauf der Boden
      const kt = R.treppeRunter, kellerLoch = kt ? { x1: kt.x0 + LOCH.x1, x2: kt.x0 + LOCH.x2, z1: kt.z0 + LOCH.z1, z2: kt.z0 + LOCH.z2 } : null;
      platteMitLoch(R, R.bodenloch || kellerLoch, (xa, za, xb, zb) => {
        const b = xb - xa, t = zb - za;
        if (b <= 0.01 || t <= 0.01) return;
        const klotz = new THREE.Mesh(new THREE.BoxGeometry(b, GRUBE_TIEFE, t), erdeMat);
        klotz.position.set((xa + xb) / 2, -GRUBE_TIEFE / 2 - 0.002, (za + zb) / 2);
        hausGruppe.add(klotz);
        if (imKellerXZ((xa + xb) / 2, (za + zb) / 2)) sichtBlocker.push(klotz);   // Aus dem Keller sieht man nicht durch die Decke
        festerKoerper((xa + xb) / 2, -GRUBE_TIEFE / 2, (za + zb) / 2, b, GRUBE_TIEFE, t);
        bodenFlaeche(R, xa, za, xb, zb, 0, bodenMat);
      });
      if (R.bodenloch) {   // Der Grund der Grube: dunkle Erde
        const L = R.bodenloch, grund = new THREE.Mesh(new THREE.PlaneGeometry(L.x2 - L.x1, L.z2 - L.z1), erdeMat);
        grund.rotation.x = -Math.PI / 2; grund.position.set((L.x1 + L.x2) / 2, -GRUBE_TIEFE + 0.002, (L.z1 + L.z2) / 2);
        hausGruppe.add(grund);
        // Unter der Grube: ein fester Boden (ganz unten liegt jetzt der Keller!)
        festerKlotz((L.x1 + L.x2) / 2, -GRUBE_TIEFE - 0.1, (L.z1 + L.z2) / 2, L.x2 - L.x1 + 0.02, 0.2, L.z2 - L.z1 + 0.02, erdeMat, imKellerXZ((L.x1 + L.x2) / 2, (L.z1 + L.z2) / 2));
      }
    } else baueZwischendecke(R, bodenMat);
    if (R.bodenloch) lochRand(R.bodenloch);
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
      const innen = j > 0 && j < haus.tief, schl = innen ? tuerSchluessel(raumNr(i, j - 1, e), raumNr(i, j, e)) : '';
      let tuer = innen ? haus.tueren.get(schl) || 0 : 0;
      if (!innen && haus.aussenTueren.has(`${raumNr(i, j === 0 ? 0 : haus.tief - 1, e)}|${j === 0 ? 'n' : 's'}`)) tuer = TUER_BREITE;   // Haustür!
      wandStueck(i * RAUM, j * RAUM, (i + 1) * RAUM, j * RAUM, basis, tuer, tapete(), innen ? haus.mauseloecher.get(schl) || 0 : 0, innen ? -1 : j === 0 ? 5 : 4);
    }
    for (let i = 0; i <= haus.breit; i++) for (let j = 0; j < haus.tief; j++) {   // Wände entlang z
      const innen = i > 0 && i < haus.breit, schl = innen ? tuerSchluessel(raumNr(i - 1, j, e), raumNr(i, j, e)) : '';
      let tuer = innen ? haus.tueren.get(schl) || 0 : 0;
      if (!innen && haus.aussenTueren.has(`${raumNr(i === 0 ? 0 : haus.breit - 1, j, e)}|${i === 0 ? 'w' : 'o'}`)) tuer = TUER_BREITE;   // Haustür!
      wandStueck(i * RAUM, j * RAUM, i * RAUM, (j + 1) * RAUM, basis, tuer, tapete(), innen ? haus.mauseloecher.get(schl) || 0 : 0, innen ? -1 : i === 0 ? 1 : 0);
    }
  }
  for (const t of haus.treppen) baueTreppe(t);

  if (kartenWahl === 'schule') {   // 📚 Die verfluchte Schule (das leere Villa-Gerüst steht weit weg – da kommt keiner hin)
    baueSchulKarte();
    haus.fahrBus = LOBBY_AN ? baueFahrBus(LOBBY_ORT.x, LOBBY_ORT.z) : null;   // 🚌💨 Die Lobby
  } else {
    // 5. 🅿️ Draußen vor der Haustür vom Startraum: der Parkplatz mit dem ARAG-Bus und der Abgabe
    const S = startR, mz = S.z0 + RAUM / 2;
    haus.parkplatz = [{ x1: -21, x2: -0.6, z1: mz - 11, z2: mz + 10 }, { x1: -17.5, x2: -10, z1: mz + 9, z2: haus.tief * RAUM + WALD_RAND }];   // Parkplatz + Waldweg (da kommt der Bus her)
    haus.laster = { x1: -8.5, x2: -4.0, z1: mz - 2.3, z2: mz + 2.2 };
    baueAbgabe();
    baueBus(mz);
    haus.fahrBus = LOBBY_AN ? baueFahrBus(LOBBY_ORT.x, LOBBY_ORT.z) : null;   // 🚌💨 Die Lobby: der Bus auf der Fahrt
    for (const [x, z] of [[8.6, 6.2], [8.9, 7.1], [8.6, 8.7]]) festerKlotz(S.x0 + x, 0.35, S.z0 + z, 0.7, 0.7, 0.7, kistenMat);   // Kisten (Deko)

    // 5b. 🧪 Der Keller mit dem Labor vom Chemiker
    if (haus.keller) baueKeller();

    // 6. Möbel, Deko und Schätze in allen anderen Räumen
    for (const R of haus.raeume) if (R.nr !== haus.start) raumEinrichten(R);
    for (const R of haus.raeume) wandDeko(R);
    for (const S of SAELE) lampeHinzu((S.i + S.breit / 2) * RAUM, S.etage * ETAGE_HOEHE + WAND_HOEHE - 0.4, (S.j + S.tief / 2) * RAUM, '#ffd9a0', 2.4, 9 + 5 * Math.max(S.breit, S.tief), false);   // Eine helle Lampe mitten im Saal
    baueWald();   // 🌲 Draußen (nach den Lampen drinnen – die sind wichtiger)

    // 7. Monster in Räumen weit weg vom Start (auch in den oberen Stockwerken!)
    const weit = [];
    for (let r = 0; r < anzahl; r++) if (raumAbstand(haus.start, r) >= MONSTER_START_ABSTAND) weit.push(r);
    if (!weit.length) for (let r = 0; r < anzahl; r++) if (raumAbstand(haus.start, r) >= 2) weit.push(r);
    if (!weit.length) for (let r = 0; r < anzahl; r++) if (r !== haus.start) weit.push(r);
    for (let k = 0; k < ld.geister; k++) neuesMonster('geist', auswahl(weit));
    for (let k = 0; k < ld.lauscher; k++) neuesMonster('lauscher', auswahl(weit));
    for (let k = 0; k < ld.starrer; k++) neuesMonster('starrer', auswahl(weit));
    for (let k = 0; k < ld.jaeger; k++) neuesMonster('jaeger', auswahl(weit));
    for (let k = 0; k < (ld.formwandler || 0); k++) { neuesMonster('formwandler', auswahl(weit)); const f = monster[monster.length - 1]; f.modus = rnd() < 0.5 ? 'tarnBot' : 'tarnSchatz'; f.tarnTyp = tarnSchatzWaehlen(); }
    for (let k = 0; k < (ld.schrank || 0); k++) { neuesMonster('schrank', auswahl(weit)); schrankNeuesVersteck(monster[monster.length - 1], true); }
    for (let k = 0; k < (ld.oma || 0); k++) neuesMonster('oma', auswahl(weit));
    for (let k = 0; k < (ld.maulwurf || 0) && haus.baeume; k++) {   // 🐾 Der Maulwurf wohnt draußen im Wald
      const pl = waldPlatz(); if (!pl) continue;
      neuesMonster('maulwurf', haus.start);
      Object.assign(monster[monster.length - 1], { x: pl.x, y: 0, z: pl.z, modus: 'graben' });
    }

    for (let k = 0; k < (ld.chemiker || 0) && haus.keller; k++) {   // 🧪 Der Chemiker wohnt in seinem Labor im Keller
      neuesMonster('chemiker', haus.start);
      const L = haus.keller.labor;
      Object.assign(monster[monster.length - 1], { x: L.x, y: haus.keller.boden, z: L.z, winkel: L.winkel });
    }
  }

  // 8. Du startest im ARAG-Bus (Lobby). Deine Helfer stehen neben dir.
  ducken(false);
  const BUS = haus.fahrBus;   // (Du startest im fahrenden Bus – in der Lobby. Ohne Lobby: draußen vor der Bustür)
  if (LOBBY_AN) { spielerKoerper.position.set(BUS.lobby.x, KOERPER_RADIUS + 0.05, BUS.lobby.z); blick.links = 0; }
  else { spielerKoerper.position.set(haus.spawn.x, KOERPER_RADIUS + 0.05, haus.spawn.z); blick.links = -Math.PI / 2; }
  spielerKoerper.velocity.set(0, 0, 0);
  blick.hoch = -0.1;
  for (let k = 0; k < (mitBots ? Math.min(HELFER_ANZAHL, HELFER.length) : 0); k++) neuerHelfer(HELFER[k], LOBBY_AN ? BUS.x2 - 0.7 : haus.spawn.x + 1.5, LOBBY_AN ? BUS.z2 - 1.2 - k * 1.3 : haus.spawn.z + 1.5 + k * 1.5);
}

// Einen Raum einrichten: Lampe, Möbel in den Ecken, Teppich, Spinnweben, Schätze
function raumEinrichten(R) {
  const art = R.art, cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2, b0 = R.basis;
  // Treppenräume: Der Streifen an der Nordwand gehört der Treppe
  const treppe = R.treppeHoch || R.treppeRunter;
  if (treppe) R.belegt.push([R.x0 + 0.1, R.z0 + 0.1, R.x0 + RAUM - 0.1, R.z0 + 2.8]);
  // Möbel: 3 oder 4 Viertel bekommen etwas aus der Liste des Raumes (bei Treppen nur die südlichen)
  const offen = w => (R.tuer[w] || 0) >= OFFEN;
  const beruehrtOffen = q => (q % 2 === 0 ? offen('w') : offen('o')) || ((q >> 1) === 0 ? offen('n') : offen('s'));
  const erlaubt = [0, 1, 2, 3].filter(q => !(treppe && q < 2) && !(R.saal && R.saal.frei && beruehrtOffen(q)));   // Im Saal bleibt die Mitte frei
  const viertel = mischen(erlaubt).slice(0, treppe ? 2 : R.saal ? erlaubt.length : zufallGanz(3, 4));
  const liste = mischen(art.ecken);
  viertel.forEach((q, k) => inViertel(R, q, MOEBEL[liste[k % liste.length]]()));
  // Teppich in der Mitte
  if (art.teppich && rnd() < 0.7) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshStandardMaterial({ map: teppichTextur, roughness: 1 }));
    t.rotation.x = -Math.PI / 2; t.rotation.z = auswahl([0, Math.PI / 2]); t.position.set(cx, b0 + 0.006, cz + (treppe ? 1 : 0)); t.receiveShadow = true;
    hausGruppe.add(t);
  }
  // Licht: Kronleuchter oder einfache Glühbirne (nicht überall – manche Räume sind stockdunkel!)
  if (R.saal || (rnd() < 0.5 && lampeHinzu(cx, b0 + WAND_HOEHE - 0.5, cz, art.kronleuchter ? '#ffd9a0' : '#ffcf8a', 1.4, 11, rnd() < 0.4))) {   // (Säle: eine große Lampe für den ganzen Saal, siehe baueHaus)
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
    if (rnd() < 0.55) continue;
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
    const typ = gewichtetWaehlen(VILLA_SCHAETZE);
    const [sb, sh, st] = typ.groesse;
    if (!typ.boden && R.ablagen.length && rnd() < 0.65) {
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
    if (s.aussen && R.e === 0 && haus.aussenTueren.has(`${R.nr}|${['n', 's', 'w', 'o'][seiten.indexOf(s)]}`)) continue;   // Da ist die Haustür
    let deko;
    if (s.aussen) {
      deko = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: fensterTextur }));
      deko.position.set(s.x, R.basis + 1.7, s.z);
    } else {
      if (rnd() < 0.4) continue;
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
  if (typ.id === 'kopf') {   // Roboter-Kopf mit dunklem Bildschirm und X-Augen
    add(new THREE.BoxGeometry(b, h, t), new THREE.MeshStandardMaterial({ color: typ.farbe || '#7cf5c6', roughness: 0.4, metalness: 0.3, emissive: typ.farbe || '#7cf5c6', emissiveIntensity: 0.25 }));
    add(new THREE.BoxGeometry(b * 0.8, h * 0.6, 0.02), new THREE.MeshBasicMaterial({ color: '#111' }), 0, 0, t / 2 + 0.01);
    const xMat = new THREE.MeshBasicMaterial({ color: '#ff5555' });
    for (const sx of [-1, 1]) for (const w of [0.7, -0.7]) { const strich = add(new THREE.BoxGeometry(0.1, 0.02, 0.01), xMat, sx * 0.09, 0.03, t / 2 + 0.025); strich.rotation.z = w; }
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), new THREE.MeshStandardMaterial({ color: '#888' }), 0, h / 2 + 0.11, 0);
    add(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5555' }), 0, h / 2 + 0.23, 0);
  } else if (typ.id === 'vase') {
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
  } else if (typ.id === 'teddy') {   // 🧸 Kuscheliger Teddy aus Kugeln
    const fell = new THREE.MeshStandardMaterial({ color: '#9a6a3a', roughness: 1 }), hell = new THREE.MeshStandardMaterial({ color: '#d9b48a', roughness: 1 });
    add(new THREE.SphereGeometry(0.13, 12, 10), fell, 0, -0.06, 0).scale.set(1, 1.15, 0.9);          // Bauch
    add(new THREE.SphereGeometry(0.07, 10, 8), hell, 0, -0.06, 0.1);
    add(new THREE.SphereGeometry(0.1, 12, 10), fell, 0, 0.12, 0);                                    // Kopf
    add(new THREE.SphereGeometry(0.045, 8, 6), hell, 0, 0.1, 0.09);                                  // Schnauze
    add(new THREE.SphereGeometry(0.015, 6, 5), schwarzMat, 0, 0.11, 0.135);
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.04, 8, 6), fell, sx * 0.08, 0.2, 0);                            // Ohren
      add(new THREE.SphereGeometry(0.014, 6, 5), schwarzMat, sx * 0.04, 0.15, 0.085);               // Augen
      add(new THREE.SphereGeometry(0.05, 8, 6), fell, sx * 0.13, -0.02, 0.03).scale.set(1, 1.4, 1);  // Arme
      add(new THREE.SphereGeometry(0.06, 8, 6), fell, sx * 0.08, -0.17, 0.05);                       // Beine
    }
  } else if (typ.id === 'sanduhr') {   // ⏳ Zwei Glaskegel zwischen Holzscheiben
    const glas = new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, roughness: 0.05 });
    const sand = new THREE.MeshStandardMaterial({ color: '#e3c27a', roughness: 1 });
    for (const sy of [-1, 1]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), holzMat, 0, sy * 0.16, 0);
    add(new THREE.ConeGeometry(0.08, 0.14, 16), glas, 0, 0.075, 0).rotation.x = Math.PI;
    add(new THREE.ConeGeometry(0.08, 0.14, 16), glas, 0, -0.075, 0);
    add(new THREE.ConeGeometry(0.06, 0.08, 16), sand, 0, -0.1, 0);
    for (const [x, z] of [[0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08]]) add(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), holzMat, x, 0, z);
  } else if (typ.id === 'kerze') {   // 🕯️ Goldener Leuchter mit drei Kerzen
    add(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 14), goldMat, 0, -0.235, 0);
    add(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 8), goldMat, 0, -0.08, 0);
    add(new THREE.BoxGeometry(0.3, 0.02, 0.02), goldMat, 0, 0.06, 0);
    const flamme = new THREE.MeshBasicMaterial({ color: '#ffb347' });
    for (const x of [-0.14, 0, 0.14]) {
      add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), goldMat, x, 0.08, 0);
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10), weissMat, x, 0.15, 0);
      add(new THREE.ConeGeometry(0.012, 0.035, 6), flamme, x, 0.23, 0);
    }
  } else if (typ.id === 'spieluhr') {   // 🎶 Holzkästchen mit kleiner Tänzerin obendrauf
    add(new THREE.BoxGeometry(b, 0.14, t), glanz('#7a3b2a', 0.4), 0, -0.09, 0);
    add(new THREE.BoxGeometry(b + 0.01, 0.015, t + 0.01), goldMat, 0, -0.015, 0);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), goldMat, 0, 0, 0);
    const rosa = new THREE.MeshStandardMaterial({ color: '#f4a6c8', roughness: 0.6 });
    add(new THREE.ConeGeometry(0.045, 0.07, 10), rosa, 0, 0.045, 0);                                // Tutu
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), weissMat, 0, 0.1, 0);
    add(new THREE.SphereGeometry(0.018, 8, 6), weissMat, 0, 0.14, 0);
    add(new THREE.BoxGeometry(0.015, 0.05, 0.015), goldMat, b / 2 + 0.01, -0.09, 0).rotation.z = 0.4;   // Aufzieh-Schlüssel
  } else if (typ.id === 'geige') {   // 🎻 Geige mit Hals und Schnecke
    const lack = glanz('#8a3d14', 0.35);
    add(new THREE.SphereGeometry(0.1, 14, 10), lack, 0, -0.15, 0).scale.set(1, 1.1, 0.3);
    add(new THREE.SphereGeometry(0.08, 14, 10), lack, 0, -0.01, 0).scale.set(1, 1, 0.3);
    add(new THREE.BoxGeometry(0.03, 0.22, 0.02), schwarzMat, 0, 0.18, 0.01);                          // Hals
    add(new THREE.TorusGeometry(0.02, 0.008, 6, 10), lack, 0, 0.29, 0.01);                            // Schnecke
    for (const x of [-0.01, 0, 0.01]) add(new THREE.BoxGeometry(0.002, 0.42, 0.002), weissMat, x, 0.04, 0.035);   // Saiten
  } else if (typ.id === 'grammophon') {   // 📯 Holzkasten, Schallplatte und großer Goldtrichter
    add(new THREE.BoxGeometry(0.4, 0.14, 0.4), holzMat, 0, -0.24, 0);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 24), schwarzMat, 0, -0.165, 0);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), goldMat, 0.12, -0.03, -0.1).rotation.z = 0.3;
    const trichter = add(new THREE.CylinderGeometry(0.2, 0.02, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#d4a537', metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }), -0.02, 0.15, 0.05);
    trichter.rotation.x = 0.6;
  } else if (typ.id === 'goldbarren') {   // 🪙 Glänzender Goldbarren
    add(new THREE.BoxGeometry(b, h, t), goldMat);
    add(new THREE.BoxGeometry(b * 0.8, 0.01, t * 0.7), new THREE.MeshStandardMaterial({ color: '#f2c94c', metalness: 1, roughness: 0.15 }), 0, h / 2, 0);
  } else if (typ.id === 'ei') {   // 🥚 Ein kostbares Juwelen-Ei mit Goldbändern
    add(new THREE.SphereGeometry(0.1, 18, 14), glanz(auswahl(['#1f6f8b', '#8b1f3a', '#2f7a3a']), 0.2, 0.3), 0, 0, 0).scale.set(1, 1.35, 1);
    for (const y of [-0.05, 0.03]) add(new THREE.TorusGeometry(0.098 - Math.abs(y) * 0.2, 0.008, 6, 24), goldMat, 0, y, 0).rotation.x = Math.PI / 2;
    add(new THREE.OctahedronGeometry(0.025), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#88ccff', emissiveIntensity: 0.8 }), 0, 0.14, 0);
  } else if (typ.id === 'krone') {   // 👑 Goldkrone mit Zacken und Edelsteinen
    add(new THREE.CylinderGeometry(0.14, 0.13, 0.1, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#d4a537', metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide, emissive: '#3a2a05' }), 0, -0.07, 0);
    for (let k = 0; k < 6; k++) {
      const w = k / 6 * Math.PI * 2;
      add(new THREE.ConeGeometry(0.03, 0.1, 6), goldMat, Math.cos(w) * 0.13, 0.03, Math.sin(w) * 0.13);
      add(new THREE.SphereGeometry(0.015, 8, 6), new THREE.MeshStandardMaterial({ color: k % 2 ? '#e0115f' : '#1e5bd8', emissive: k % 2 ? '#5a0020' : '#0a2060' }), Math.cos(w) * 0.14, -0.06, Math.sin(w) * 0.14);
    }
  } else if (typ.id === 'diamant') {   // 💎 Ein riesiger, funkelnder Diamant
    add(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: '#d8f4ff', emissive: '#4fb7ff', emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85, flatShading: true }));
  } else if (typ.id === 'perlen') {   // 📿 Eine Kette aus Perlen mit rotem Anhänger
    const perle = new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.15, metalness: 0.3, emissive: '#4a4640' });
    for (let k = 0; k < 16; k++) { const w = k / 16 * Math.PI * 2; add(new THREE.SphereGeometry(0.022, 8, 6), perle, Math.cos(w) * 0.12, 0, Math.sin(w) * 0.12); }
    add(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: '#e0115f', emissive: '#6a0020', flatShading: true }), 0, 0, 0.15);
  } else if (typ.id === 'smaragd') {   // 💚 Ein grüner, geschliffener Edelstein
    add(new THREE.CylinderGeometry(0.06, 0.09, 0.16, 6), new THREE.MeshStandardMaterial({ color: '#2ee07a', emissive: '#0d7a3a', emissiveIntensity: 0.7, roughness: 0.05, transparent: true, opacity: 0.85, flatShading: true }));
  } else if (typ.id === 'rubin') {   // ❤️ Ein riesiger roter Rubin
    add(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: '#ff2a4a', emissive: '#8a0018', emissiveIntensity: 0.7, roughness: 0.05, transparent: true, opacity: 0.85, flatShading: true })).scale.y = 1.25;
  } else if (typ.id === 'zepter') {   // 🪄 Goldener Stab mit Krone und blauem Edelstein
    add(new THREE.CylinderGeometry(0.018, 0.025, 0.62, 8), goldMat, 0, -0.05, 0);
    add(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#3a7bff', emissive: '#103a9a', emissiveIntensity: 0.8, roughness: 0.1 }), 0, 0.3, 0);
    for (let k = 0; k < 5; k++) { const w = k / 5 * Math.PI * 2; add(new THREE.ConeGeometry(0.012, 0.06, 4), goldMat, Math.cos(w) * 0.04, 0.27, Math.sin(w) * 0.04); }
  } else if (typ.id === 'schaedel') {   // 💀 Ein durchsichtiger, leuchtender Kristallschädel
    const kristall = new THREE.MeshStandardMaterial({ color: '#cfe9ff', emissive: '#4a90c8', emissiveIntensity: 0.5, roughness: 0.05, transparent: true, opacity: 0.7 });
    add(new THREE.SphereGeometry(0.12, 14, 10), kristall, 0, 0.03, -0.01).scale.set(1, 1, 1.15);
    add(new THREE.BoxGeometry(0.15, 0.08, 0.14), kristall, 0, -0.09, 0.06);
    for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#0a1a2a' }), sx * 0.045, 0.03, 0.11);
  } else if (typ.id === 'statue') {   // 🗽 Eine kleine goldene Statue auf einem Sockel
    add(new THREE.BoxGeometry(0.36, 0.1, 0.36), dunkelHolzMat, 0, -0.4, 0);
    add(new THREE.CylinderGeometry(0.1, 0.14, 0.45, 10), goldMat, 0, -0.12, 0);
    add(new THREE.SphereGeometry(0.09, 10, 8), goldMat, 0, 0.2, 0);
    add(new THREE.BoxGeometry(0.05, 0.3, 0.05), goldMat, 0.12, 0.2, 0).rotation.z = -0.3;   // Arm hoch (mit Fackel)
    add(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd166' }), 0.17, 0.37, 0);
    for (let k = 0; k < 5; k++) { const w = k / 5 * Math.PI * 2; add(new THREE.ConeGeometry(0.02, 0.07, 4), goldMat, Math.cos(w) * 0.08, 0.3, Math.sin(w) * 0.08); }   // Strahlenkrone
  } else if (typ.id === 'mikroskop') {   // 🔬 Fuß, Arm, Tisch und Rohr
    const schwarz = new THREE.MeshStandardMaterial({ color: '#202226', metalness: 0.5, roughness: 0.4 }), weiss = new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.4 });
    add(new THREE.BoxGeometry(0.2, 0.04, 0.26), schwarz, 0, -h / 2 + 0.02, 0);
    add(new THREE.BoxGeometry(0.05, 0.3, 0.06), weiss, 0, -h / 2 + 0.18, -0.09).rotation.x = 0.15;
    add(new THREE.BoxGeometry(0.14, 0.02, 0.12), schwarz, 0, -h / 2 + 0.14, 0.02);
    add(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 12), weiss, 0, h / 2 - 0.14, -0.02).rotation.x = -0.35;
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), schwarz, 0, h / 2 - 0.03, -0.06).rotation.x = -0.35;
  } else if (typ.id === 'skelett') {   // 💀 Ein Lern-Skelett auf einem Ständer
    const knochen = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.7 }), staender = new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.6 });
    add(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 14), staender, 0, -h / 2 + 0.02, 0);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 6), staender, 0, -h / 2 + 0.4, 0);
    add(new THREE.SphereGeometry(0.1, 12, 10), knochen, 0, h / 2 - 0.1, 0).scale.set(0.9, 1.1, 1);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), knochen, 0, h / 2 - 0.5, 0);   // Wirbelsäule
    for (let k = 0; k < 4; k++) add(new THREE.TorusGeometry(0.11 - k * 0.012, 0.012, 5, 14), knochen, 0, h / 2 - 0.32 - k * 0.07, 0).rotation.x = Math.PI / 2;   // Rippen
    add(new THREE.BoxGeometry(0.22, 0.08, 0.1), knochen, 0, h / 2 - 0.8, 0);   // Becken
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 6), knochen, s * 0.17, h / 2 - 0.5, 0).rotation.z = s * 0.12;   // Arme
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 6), knochen, s * 0.07, h / 2 - 1.2, 0);   // Beine
    }
  } else if (typ.id === 'schulglocke') {   // 🔔 Eine alte Messing-Glocke mit Holzgriff
    add(new THREE.CylinderGeometry(0.05, 0.15, 0.2, 18, 1, true), goldMat, 0, -h / 2 + 0.1, 0).material.side = THREE.DoubleSide;
    add(new THREE.SphereGeometry(0.05, 10, 8), goldMat, 0, -h / 2 + 0.2, 0);
    add(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 10), new THREE.MeshStandardMaterial({ color: '#6b4a2b' }), 0, h / 2 - 0.06, 0);
  } else if (typ.id === 'medaille') {   // 🏅 Goldmedaille am rot-blauen Band
    add(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), goldMat, 0, -h / 2 + 0.08, 0).rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.05, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: '#c92a2a' }), -0.03, h / 2 - 0.06, 0).rotation.z = 0.3;
    add(new THREE.BoxGeometry(0.05, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: '#1c4fa0' }), 0.03, h / 2 - 0.06, 0).rotation.z = -0.3;
  } else if (typ.id === 'abakus') {   // 🧮 Ein goldener Rechenrahmen mit bunten Perlen
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.03, h, 0.06), goldMat, s * (b / 2 - 0.015), 0, 0); add(new THREE.BoxGeometry(b, 0.03, 0.06), goldMat, 0, s * (h / 2 - 0.015), 0); }
    const farben = ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#9c36b5'];
    for (let r = 0; r < 5; r++) {
      const y = -h / 2 + 0.06 + r * 0.055;
      add(new THREE.CylinderGeometry(0.004, 0.004, b - 0.04, 4), goldMat, 0, y, 0).rotation.z = Math.PI / 2;
      for (let k = 0; k < 5; k++) add(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: farben[r] }), -0.15 + k * 0.045 + (k > 2 ? 0.12 : 0), y, 0);
    }
  } else if (typ.id === 'aquarium') {   // 🐠 Ein Glaskasten mit Wasser und Fischen
    add(new THREE.BoxGeometry(b, h, t), new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.25, roughness: 0.05 }));
    add(new THREE.BoxGeometry(b - 0.03, h * 0.75, t - 0.03), new THREE.MeshStandardMaterial({ color: '#2a7fb8', transparent: true, opacity: 0.45, emissive: '#0b3a5a' }), 0, -h * 0.1, 0);
    add(new THREE.BoxGeometry(b - 0.03, 0.04, t - 0.03), new THREE.MeshStandardMaterial({ color: '#c9a66b' }), 0, -h / 2 + 0.03, 0);
    for (let k = 0; k < 4; k++) add(new THREE.ConeGeometry(0.025, 0.07, 6), new THREE.MeshStandardMaterial({ color: ['#ff922b', '#fcc419', '#ff6b6b', '#ff922b'][k], emissive: '#552200' }), -0.18 + k * 0.12, -0.05 + (k % 2) * 0.08, (k % 3 - 1) * 0.08).rotation.z = Math.PI / 2 * (k % 2 ? 1 : -1);
  } else if (typ.id === 'schuluhr') {   // 🕐 Eine runde Wanduhr
    const zf = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g2 = c.getContext('2d'); g2.fillStyle = '#f4efe0'; g2.fillRect(0, 0, 64, 64); g2.strokeStyle = '#222'; g2.lineWidth = 4; g2.beginPath(); g2.moveTo(32, 32); g2.lineTo(32, 12); g2.moveTo(32, 32); g2.lineTo(46, 36); g2.stroke(); return c; })());
    add(new THREE.CylinderGeometry(b / 2, b / 2, t * 0.6, 24), new THREE.MeshStandardMaterial({ color: '#202226' })).rotation.x = Math.PI / 2;
    add(new THREE.CircleGeometry(b / 2 - 0.02, 24), new THREE.MeshBasicMaterial({ map: zf }), 0, 0, t * 0.31);
  } else if (typ.id === 'klassenbuch') {   // 📕 Das verfluchte Klassenbuch (es leuchtet unheimlich ...)
    add(new THREE.BoxGeometry(b, h, t), new THREE.MeshStandardMaterial({ color: '#8b0000', emissive: '#3a0000', emissiveIntensity: 0.8, roughness: 0.6 }));
    add(new THREE.BoxGeometry(b - 0.03, h * 0.7, t + 0.002), new THREE.MeshStandardMaterial({ color: '#f1e6cc' }), 0.012, 0, 0);
    add(new THREE.BoxGeometry(0.1, 0.005, 0.1), new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#aa7a00', emissiveIntensity: 1 }), 0, h / 2 + 0.003, 0).rotation.y = Math.PI / 4;
  } else if (typ.id === 'goldkiste') {   // 💰 Eine offene Holzkiste, randvoll mit Goldmünzen
    add(new THREE.BoxGeometry(0.7, 0.38, 0.45), new THREE.MeshStandardMaterial({ color: '#5a3a1f', roughness: 0.8 }), 0, -0.06, 0);
    for (const x of [-0.3, 0.3]) add(new THREE.BoxGeometry(0.05, 0.4, 0.47), goldMat, x, -0.06, 0);   // Goldbeschläge
    add(new THREE.CylinderGeometry(0.3, 0.33, 0.1, 16), goldMat, 0, 0.15, 0).scale.z = 0.62;            // Der Goldberg
    for (let k = 0; k < 10; k++) add(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10), goldMat, (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.03, (Math.random() - 0.5) * 0.28).rotation.set(Math.random(), 0, Math.random());
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
  const s = { id: schatzNummer++, typ, mesh, body, wert: wertMax, wertMax, letzterStoss: 0, kaputt: false, zerbrechen: false, geworfen: 0, reserviert: null, getragenVon: null };
  mesh.traverse(o => { o.userData.schatz = s; });
  body.addEventListener('collide', e => stoss(s, e));
  schaetze.push(s);
  return s;
}
// Aua! Ein Schatz ist irgendwo angestoßen
function stoss(s, e) {
  if (spielZeit < 3 || s.kaputt || zustand !== 'spiel' || mp.rolle === 'gast') return;   // (Gäste: rechnet der Gastgeber) Am Anfang fällt alles noch kurz hin
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
  if (mp.rolle === 'host') mpAnAlle({ t: 'kaputt', id: s.id });
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
  // 👨‍🏫 Herr Kreidemann (nur in der Schule): Erwischt er dich, musst du nachsitzen und einen Test schreiben (siehe TEST_FRAGEN)
  lehrer:   { name: 'Herr Kreidemann', emoji: '👨‍🏫', tempo: 1.6, jagdTempo: 3.9, schaden: 0, sicht: 15, augen: 1.95, pause: 3, betaeubbar: true },
  geist:    { name: 'Staubgeist', emoji: '👻', tempo: 1.6, jagdTempo: 3.3, schaden: 30, sicht: 14, augen: 1.3, pause: 2, betaeubbar: true },
  lauscher: { name: 'Lauscher',   emoji: '👂', tempo: 1.0, jagdTempo: 4.6, schaden: 45, hoeren: 2.5, pause: 2, betaeubbar: true },
  starrer:  { name: 'Starrer',    emoji: '🗿', tempo: 1.2, jagdTempo: 4.8, schaden: 50, pause: 3, betaeubbar: false },
  // Der verrückte Jäger ballert mit seiner Schrotflinte! schussWeite: so weit schießt er · schussSchaden: so viel Energie kostet ein Treffer aus nächster Nähe
  // zielen: so lange zielt er, bevor er schießt (dann hast du Zeit, dich zu verstecken!) · nachladen: so lange braucht er zum Nachladen
  jaeger:   { name: 'Jäger',      emoji: '🤠', tempo: 1.4, jagdTempo: 2.6, schaden: 20, sicht: 16, augen: 1.6, pause: 2, betaeubbar: true,
              schussWeite: 12, schussSchaden: 35, zielen: 0.8, nachladen: 2.5 },
  // 👹 Das Schrank-Monster versteckt sich als Kleiderschrank. lauerWeite: so nah darfst du ran, bevor es aufwacht
  // warnen: so lange knarzt und rüttelt es, bevor es rausspringt (deine Chance wegzurennen!) · jagdDauer: so lange jagt es dich
  schrank:  { name: 'Schrank-Monster', emoji: '👹', tempo: 2.0, jagdTempo: 4.3, schaden: 40, pause: 2, betaeubbar: true,
              lauerWeite: 3.5, warnen: 0.9, jagdDauer: 7 },
  // 🤖👾 Der Formwandler-Bot tarnt sich als Helfer-Bot oder als goldener Pokal. aufwachWeite: so nah darfst du ran
  // verwandeln: so lange glitcht er, bevor er losjagt · jagdDauer: so lange jagt er · tarnTempo: so schnell fährt er als falscher Bot herum
  formwandler: { name: 'Formwandler', emoji: '👾', tempo: 2.4, jagdTempo: 4.5, schaden: 35, pause: 2, betaeubbar: true,
              aufwachWeite: 2.3, verwandeln: 0.7, jagdDauer: 8, tarnTempo: 1.4 },
  // 👵🦯 Die Böse Oma: Schau sie NICHT an! Sonst wird sie wütend und zieht dir eine mit dem Gehstock drüber!
  // sichtWeite: ab so nah merkt sie, dass du sie anschaust · geduld: so viele Sekunden darfst du hinschauen, bevor sie losrennt
  // jagdDauer: so lange jagt sie dich · schubs: so weit fliegst du nach dem Gehstock-Schlag · ruhe: so lange ist sie danach zufrieden
  oma:      { name: 'Böse Oma',   emoji: '👵', tempo: 1.1, jagdTempo: 4.4, schaden: 35, pause: 2, betaeubbar: true,
              sichtWeite: 13, geduld: 1.0, jagdDauer: 7, schubs: 14, ruhe: 5 },
  // 🐾 Der Achtarm-Maulwurf lebt NUR draußen im Wald. Er gräbt unter der Erde und spürt deine Schritte!
  // Stillstehen oder Ducken (C) = er spürt dich nicht. fuehlWeite: so weit spürt er Schritte · auftauchWeite: so nah, dann bricht er raus
  // auftauchen: so lange bebt der Boden vorher (Warnung!) · obenZeit: so lange krabbelt er oben herum und jagt dich mit seinen 8 Armen
  // krabbelTempo: so schnell krabbelt er oben (du läufst 4, rennst 6.5) · krabbelWeite: so weit riecht er dich oben (auch wenn du stillstehst!)
  maulwurf: { name: 'Achtarm-Maulwurf', emoji: '🐾', tempo: 2.5, jagdTempo: 5.8, schaden: 40, pause: 1.2, betaeubbar: true,
              fuehlWeite: 15, auftauchWeite: 1.8, auftauchen: 0.8, obenZeit: 8, abtauchen: 0.6, schubs: 11, krabbelTempo: 5.2, krabbelWeite: 14 },
  // 🐷🧪 Doktor Schorsch, das verrückte Chemiker-Schwein, wohnt im Keller-Labyrinth und wirft mit Tränken (siehe TRAENKE oben)! Er verlässt seinen Keller nie.
  // wurfWeite: so weit wirft er · ausholen: so lange holt er aus, bevor er wirft (deine Chance auszuweichen!) · nachladen: so lange bis zum nächsten Trank
  chemiker: { name: 'Doktor Schorsch', emoji: '🐷', tempo: 1.2, jagdTempo: 2.6, schaden: 15, sicht: 15, augen: 1.6, pause: 2, betaeubbar: true,
              wurfWeite: 13, ausholen: 0.7, nachladen: 2.4 },
};
function baueMonsterMesh(art) {
  const g = new THREE.Group();
  if (art === 'formwandler') {
    // 1) Tarnung als Helfer-Bot (ein Bot, der in deiner Helfer-Liste gar nicht vorkommt ...)
    const falsch = HELFER[HELFER_ANZAHL % HELFER.length];
    const T = baueHelferMesh({ name: falsch.name, farbe: falsch.farbe });
    if (T.g.parent) T.g.parent.remove(T.g);
    g.add(T.g); T.blase.visible = false;
    g.userData.bot = T;
    g.userData.botGesicht = { gesicht: T.gesicht, farbe: falsch.farbe, kaputt: 0, angst: 0, froh: 0, redet: 0, blinzelVersatz: 1.3 };
    // 2) Tarnung als Schatz: JEDER Schatz geht! (wird erst gebaut, wenn er ihn braucht – siehe tarnSchatzMesh)
    g.userData.tarnSchaetze = {};
    // 3) Die echte Form: ein dunkles Roboter-Monster mit vielen roten Augen und Krallen
    const echt = new THREE.Group(); g.add(echt); g.userData.echt = echt;
    const metall = new THREE.MeshStandardMaterial({ color: '#1d1f26', metalness: 0.8, roughness: 0.35 });
    const glut = new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff1f3d', emissiveIntensity: 1.2 });
    const teil = (geo, mat, x, y, z, eltern = echt) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); eltern.add(m); return m; };
    teil(new THREE.CylinderGeometry(0.28, 0.4, 1.3, 8), metall, 0, 1.15, 0);                 // Körper
    for (let k = 0; k < 4; k++) teil(new THREE.BoxGeometry(0.62, 0.035, 0.62), glut, 0, 0.75 + k * 0.28, 0).rotation.y = k * 0.4;   // Glühende Ringe
    const kopf = teil(new THREE.BoxGeometry(0.62, 0.5, 0.55), metall, 0, 2.0, 0.05); kopf.rotation.z = 0.12;   // Schiefer Kopf
    const auge = new THREE.MeshBasicMaterial({ color: '#ff2a2a', fog: false });
    for (const [x, y, gr] of [[-0.17, 2.08, 0.07], [0.15, 2.1, 0.08], [0, 1.95, 0.05], [-0.06, 2.2, 0.04], [0.22, 1.92, 0.045]]) teil(new THREE.SphereGeometry(gr, 8, 6), auge, x, y, 0.33);
    for (let k = 0; k < 5; k++) teil(new THREE.ConeGeometry(0.06, 0.3, 5), metall, -0.24 + k * 0.12, 2.35, -0.05).rotation.z = (k - 2) * 0.25;   // Stacheln
    g.userData.arme = [];
    for (const sx of [-1, 1]) {   // Lange Arme mit Krallen
      const arm = new THREE.Group(); arm.position.set(sx * 0.42, 1.65, 0); echt.add(arm);
      teil(new THREE.BoxGeometry(0.1, 0.95, 0.1), metall, 0, -0.45, 0, arm);
      for (const kx of [-0.05, 0, 0.05]) teil(new THREE.ConeGeometry(0.025, 0.22, 4), glut, kx, -1.0, 0.04, arm).rotation.x = Math.PI;
      g.userData.arme.push(arm);
    }
    g.userData.beine = [];
    for (const sx of [-1, 1]) {
      const bein = new THREE.Group(); bein.position.set(sx * 0.2, 0.55, 0); echt.add(bein);
      teil(new THREE.BoxGeometry(0.12, 0.55, 0.12), metall, 0, -0.27, 0, bein);
      g.userData.beine.push(bein);
    }
  } else if (art === 'schrank') {   // 👹 Sieht aus wie ein Kleiderschrank ... bis die Türen aufgehen!
    const holz = new THREE.MeshStandardMaterial({ color: '#4a2e1c', roughness: 0.8 }), dunkel = new THREE.MeshStandardMaterial({ color: '#3a2214', roughness: 0.9 });
    const knauf = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.7, roughness: 0.3 });
    const kasten = (b, h, t, mat, x, y, z, eltern = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat); m.position.set(x, y, z); eltern.add(m); return m; };
    kasten(1.2, 2.0, 0.55, holz, 0, 1.0, -0.02);                 // Korpus
    kasten(1.32, 0.12, 0.66, dunkel, 0, 2.06, 0);                // Krone oben
    kasten(1.25, 0.08, 0.6, dunkel, 0, 0.04, 0);                 // Sockel
    kasten(1.12, 1.88, 0.02, new THREE.MeshBasicMaterial({ color: '#050203' }), 0, 1.0, 0.25);   // Innen: stockdunkel
    // Im Inneren: Augen und Zähne
    const auge = new THREE.MeshBasicMaterial({ color: '#ffd23a', fog: false });
    for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), auge); a.position.set(sx * 0.22, 1.45, 0.22); g.add(a); }
    const zahn = new THREE.MeshStandardMaterial({ color: '#f2efe2', roughness: 0.4 });
    for (let k = 0; k < 7; k++) {
      for (const [y, dreh] of [[1.08, Math.PI], [0.72, 0]]) {
        const z = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), zahn);
        z.position.set(-0.42 + k * 0.14, y, 0.2); z.rotation.z = dreh; g.add(z);
      }
    }
    // Zwei Türen (drehen sich an den Scharnieren außen)
    const spalt = new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff2a2a', emissiveIntensity: 0.4 });
    kasten(0.03, 1.8, 0.02, spalt, 0, 1.0, 0.29);                // Roter Schimmer im Türspalt
    const tuer = seite => {
      const scharnier = new THREE.Group(); scharnier.position.set(seite * 0.6, 0, 0.27); g.add(scharnier);
      kasten(0.59, 1.9, 0.05, holz, -seite * 0.295, 1.0, 0, scharnier);
      kasten(0.45, 0.6, 0.02, dunkel, -seite * 0.295, 1.45, 0.03, scharnier);   // Verzierung
      kasten(0.45, 0.6, 0.02, dunkel, -seite * 0.295, 0.65, 0.03, scharnier);
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), knauf); k.position.set(-seite * 0.53, 1.0, 0.05); scharnier.add(k);
      return scharnier;
    };
    g.userData.tuerL = tuer(-1); g.userData.tuerR = tuer(1);
    // Beine (sind eingefahren, solange er lauert)
    g.userData.beineG = [];
    const beinMat = new THREE.MeshStandardMaterial({ color: '#1c120c', roughness: 0.7 });
    for (const [x, z] of [[-0.48, -0.2], [0.48, -0.2], [-0.48, 0.18], [0.48, 0.18]]) {
      const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
      kasten(0.09, 0.4, 0.09, beinMat, 0, -0.2, 0, b);
      g.userData.beineG.push(b);
    }
    g.userData.beine = 0; g.userData.spalt = spalt;
  } else if (art === 'maulwurf') {   // 🐾 Samtfell, rosa Sternnase, rote Äuglein – und ACHT Arme mit Grabkrallen
    const fell = new THREE.MeshStandardMaterial({ color: '#2b2320', roughness: 1 }), rosa = new THREE.MeshStandardMaterial({ color: '#e88aa0', roughness: 0.6 });
    const kralle = new THREE.MeshStandardMaterial({ color: '#d9cfb8', roughness: 0.4 }), erde = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 });
    const koerper = new THREE.Group(); g.add(koerper);
    const teil = (geo, mat, x, y, z, el = koerper) => { const t = new THREE.Mesh(geo, mat); t.position.set(x, y, z); el.add(t); return t; };
    teil(new THREE.SphereGeometry(0.75, 16, 12), fell, 0, 0.75, -0.1).scale.set(1, 0.9, 1.35);   // Dicker Körper
    const kopf = new THREE.Group(); kopf.position.set(0, 0.95, 0.85); koerper.add(kopf);
    teil(new THREE.SphereGeometry(0.42, 14, 10), fell, 0, 0, 0, kopf).scale.set(1, 0.85, 1.2);
    teil(new THREE.CylinderGeometry(0.13, 0.18, 0.3, 10), rosa, 0, -0.05, 0.5, kopf).rotation.x = Math.PI / 2;   // Schnauze
    const tentakel = [];
    for (let k = 0; k < 11; k++) {   // Die Sternnase: viele kleine rosa Fühler
      const w = k / 11 * Math.PI * 2, t = teil(new THREE.ConeGeometry(0.035, 0.22, 5), rosa, Math.cos(w) * 0.12, -0.05 + Math.sin(w) * 0.12, 0.72, kopf);
      t.rotation.set(Math.PI / 2 + Math.sin(w) * 0.6, 0, -Math.cos(w) * 0.6); tentakel.push(t);
    }
    const augeMat = new THREE.MeshBasicMaterial({ color: '#ff3b3b', fog: false });
    for (const s of [-1, 1]) teil(new THREE.SphereGeometry(0.04, 6, 5), augeMat, s * 0.2, 0.12, 0.38, kopf);
    const arme = [];
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {   // Vier Arme auf jeder Seite
      const arm = new THREE.Group(); arm.position.set(s * 0.7, 0.75 + (k % 2) * 0.15, 0.55 - k * 0.4); koerper.add(arm);
      teil(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 7), fell, s * 0.35, 0, 0, arm).rotation.z = Math.PI / 2;   // Oberarm
      const unter = new THREE.Group(); unter.position.set(s * 0.7, 0, 0); arm.add(unter);
      teil(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 7), fell, 0, -0.3, 0, unter);                              // Unterarm
      teil(new THREE.SphereGeometry(0.13, 8, 6), rosa, 0, -0.62, 0, unter).scale.set(1.3, 0.6, 1);                  // Grabhand
      for (const f of [-1, 0, 1]) teil(new THREE.ConeGeometry(0.03, 0.2, 5), kralle, f * 0.07, -0.75, 0.05, unter).rotation.x = Math.PI + 0.3;
      arm.userData = { s, k, unter }; arme.push(arm);
    }
    const huegel = new THREE.Group(); g.add(huegel);   // Der Erdhügel (den sieht man, wenn er unter der Erde gräbt)
    teil(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), erde, 0, 0, 0, huegel).scale.set(1, 0.5, 1);
    for (let k = 0; k < 8; k++) teil(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.08), erde, (Math.random() - 0.5) * 1.6, 0.05, (Math.random() - 0.5) * 1.6, huegel);
    const brocken = [];
    for (let k = 0; k < 14; k++) { const b = teil(new THREE.DodecahedronGeometry(0.1), erde, 0, 0, 0, g); b.userData = { w: k / 14 * Math.PI * 2, v: 2 + Math.random() * 3 }; b.visible = false; brocken.push(b); }
    Object.assign(g.userData, { koerper, kopf, tentakel, arme, huegel, brocken, augeMat, hoch: -2.3 });
  } else if (art === 'oma') {   // 👵 Krumme alte Oma: lila Kleid, Strickjacke, Dutt, Brille, Handtasche – und der GEHSTOCK
    const mat = (f, rau = 0.9) => new THREE.MeshStandardMaterial({ color: f, roughness: rau });
    const kleid = mat('#5b2a6e'), jacke = mat('#7a6a4f'), haut = mat('#e8c4a8'), haar = mat('#d8d8dc'), holz = mat('#5a3517', 0.6), schuh = mat('#1a1414');
    const teil = (geo, m, x, y, z, eltern = g) => { const t = new THREE.Mesh(geo, m); t.position.set(x, y, z); eltern.add(t); return t; };
    for (const s of [-1, 1]) teil(new THREE.BoxGeometry(0.14, 0.08, 0.24), schuh, s * 0.1, 0.04, 0.04);
    teil(new THREE.CylinderGeometry(0.2, 0.42, 0.95, 12), kleid, 0, 0.5, 0);            // Langer Rock
    const oben = new THREE.Group(); oben.position.set(0, 0.95, 0); g.add(oben);           // Der Oberkörper ist krumm (Buckel!)
    oben.rotation.x = 0.35;
    teil(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 10), jacke, 0, 0.25, 0, oben);
    teil(new THREE.SphereGeometry(0.2, 10, 8), jacke, 0, 0.42, -0.09, oben).scale.set(1.1, 0.8, 1);   // Buckel
    const kopf = new THREE.Group(); kopf.position.set(0, 0.68, 0.06); oben.add(kopf);
    kopf.rotation.x = -0.35;   // Kopf wieder gerade nach vorne (sie schaut dich an ...)
    teil(new THREE.SphereGeometry(0.17, 12, 10), haut, 0, 0, 0, kopf);
    teil(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, 1.6), haar, 0, 0.03, -0.02, kopf);   // Graue Haare
    teil(new THREE.SphereGeometry(0.09, 10, 8), haar, 0, 0.12, -0.15, kopf);                 // Dutt
    teil(new THREE.ConeGeometry(0.03, 0.08, 6), haut, 0, -0.02, 0.18, kopf).rotation.x = Math.PI / 2;   // Spitze Nase
    // Brille mit Augen dahinter (die Augen leuchten: grau = ruhig, orange = sauer, rot = WÜTEND)
    const augeMat = new THREE.MeshBasicMaterial({ color: '#8899aa', fog: false });
    const brille = mat('#222', 0.4);
    for (const s of [-1, 1]) {
      teil(new THREE.SphereGeometry(0.03, 8, 6), augeMat, s * 0.065, 0.03, 0.15, kopf);
      teil(new THREE.TorusGeometry(0.05, 0.008, 6, 14), brille, s * 0.065, 0.03, 0.165, kopf);
    }
    teil(new THREE.BoxGeometry(0.1, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: '#2a0d0d' }), 0, -0.08, 0.16, kopf);   // Böser, schmaler Mund
    // Linker Arm mit Handtasche
    const armL = new THREE.Group(); armL.position.set(-0.24, 0.45, 0); oben.add(armL);
    teil(new THREE.BoxGeometry(0.09, 0.45, 0.09), jacke, 0, -0.2, 0, armL);
    teil(new THREE.BoxGeometry(0.22, 0.18, 0.08), mat('#2b1a10', 0.5), -0.02, -0.5, 0.02, armL);
    // Rechter Arm mit Gehstock (der dreht sich zum Zuschlagen!)
    const armR = new THREE.Group(); armR.position.set(0.24, 0.45, 0); oben.add(armR);
    teil(new THREE.BoxGeometry(0.09, 0.45, 0.09), jacke, 0, -0.2, 0, armR);
    const stock = new THREE.Group(); stock.position.set(0, -0.42, 0.05); armR.add(stock);
    teil(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), holz, 0, -0.45, 0, stock);
    teil(new THREE.TorusGeometry(0.07, 0.025, 6, 10, Math.PI), holz, 0, 0.07, 0.07, stock).rotation.y = Math.PI / 2;   // Gebogener Griff
    Object.assign(g.userData, { oben, kopf, armL, armR, augeMat, schlag: 0 });
  } else if (art === 'geist') {
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
  } else if (art === 'lehrer') {   // 👨‍🏫 Herr Kreidemann: groß, dünn, kreideweiß, rote Brille, langer Mantel, Zeigestock und Handglocke
    const mantel = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.8 }), haut = new THREE.MeshStandardMaterial({ color: '#e8e6dc', roughness: 0.9 }), dunkel = new THREE.MeshStandardMaterial({ color: '#151518', roughness: 0.6 });
    const teil = (geo, mat, x, y, z, eltern = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); eltern.add(m); return m; };
    g.userData.beine = [-1, 1].map(s => { const b = new THREE.Group(); b.position.set(s * 0.12, 1.0, 0); g.add(b); teil(new THREE.BoxGeometry(0.12, 1.0, 0.14), dunkel, 0, -0.5, 0, b); teil(new THREE.BoxGeometry(0.14, 0.08, 0.32), dunkel, 0, -0.98, 0.07, b); return b; });
    teil(new THREE.CylinderGeometry(0.24, 0.36, 1.05, 12), mantel, 0, 1.2, 0);                                      // Langer Mantel
    teil(new THREE.BoxGeometry(0.5, 0.45, 0.28), mantel, 0, 1.75, 0);                                                // Schultern
    teil(new THREE.BoxGeometry(0.16, 0.25, 0.02), new THREE.MeshStandardMaterial({ color: '#f4f4f4' }), 0, 1.82, 0.145);   // Hemd
    teil(new THREE.BoxGeometry(0.14, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: '#8b0000' }), 0, 1.92, 0.15);    // Fliege
    teil(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 8), haut, 0, 2.03, 0);                                          // Langer Hals
    const kopf = new THREE.Group(); kopf.position.set(0, 2.27, 0); g.add(kopf); g.userData.kopf = kopf;
    teil(new THREE.BoxGeometry(0.26, 0.34, 0.26), haut, 0, 0, 0, kopf);          // Eckiger, kreideweißer Kopf
    teil(new THREE.BoxGeometry(0.28, 0.08, 0.28), dunkel, 0, 0.18, -0.01, kopf); // Glatte schwarze Haare
    const glas = new THREE.MeshBasicMaterial({ color: '#ff2a2a', fog: false }); g.userData.brille = glas;
    for (const s of [-1, 1]) teil(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 14), glas, s * 0.065, 0.03, 0.135, kopf).rotation.x = Math.PI / 2;   // Runde, rot leuchtende Brille
    teil(new THREE.BoxGeometry(0.05, 0.012, 0.012), dunkel, 0, 0.03, 0.14, kopf);
    teil(new THREE.BoxGeometry(0.12, 0.015, 0.01), dunkel, 0, -0.09, 0.132, kopf);   // Schmaler, strenger Mund
    g.userData.arme = [-1, 1].map(s => { const a = new THREE.Group(); a.position.set(s * 0.28, 1.92, 0); g.add(a); teil(new THREE.BoxGeometry(0.1, 0.75, 0.12), mantel, 0, -0.36, 0, a); teil(new THREE.SphereGeometry(0.055, 8, 6), haut, 0, -0.76, 0, a); return a; });
    teil(new THREE.CylinderGeometry(0.012, 0.018, 1.1, 6), new THREE.MeshStandardMaterial({ color: '#8b5a2b' }), 0, -1.3, 0.03, g.userData.arme[1]);   // Rechts: der Zeigestock
    const gl = new THREE.Group(); gl.position.set(0, -0.82, 0.04); g.userData.arme[0].add(gl);                                              // Links: die Handglocke
    teil(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#4a2c17' }), 0, 0.04, 0, gl);
    teil(new THREE.CylinderGeometry(0.04, 0.09, 0.12, 14), goldMat, 0, -0.08, 0, gl);
  } else if (art === 'jaeger') {
    // 🤠 Der verrückte Jäger: Stiefel, grüne Jacke, Hut, wilder Bart und eine Schrotflinte
    const mat = f => new THREE.MeshStandardMaterial({ color: f, roughness: 0.9 });
    const hose = mat('#4a3b2a'), jacke = mat('#3f5a2e'), haut = mat('#e0b08a'), bart = mat('#b8b2a8'), hut = mat('#5a3f22'), holz = mat('#7a4a22');
    const metall = new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.8, roughness: 0.4 });
    for (const s of [-1, 1]) {
      const bein = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.2), hose); bein.position.set(s * 0.12, 0.4, 0); g.add(bein);
      const stiefel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), mat('#2a1d12')); stiefel.position.set(s * 0.12, 0.07, 0.04); g.add(stiefel);
      g.userData['bein' + s] = bein;
    }
    const koerper = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), jacke); koerper.position.y = 1.15; g.add(koerper);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), haut); kopf.position.y = 1.68; g.add(kopf);
    const bartM = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.35, 8), bart); bartM.position.set(0, 1.5, 0.08); bartM.rotation.x = Math.PI; g.add(bartM);
    const krempe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 14), hut); krempe.position.y = 1.82; g.add(krempe);
    const hutOben = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.2, 12), hut); hutOben.position.y = 1.93; g.add(hutOben);
    const augeMat = new THREE.MeshBasicMaterial({ color: '#ffdd33', fog: false });   // Irre, leuchtende Augen
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), augeMat); a.position.set(s * 0.07, 1.72, 0.17); g.add(a); }
    // Die Schrotflinte (zeigt nach vorne)
    const flinte = new THREE.Group();
    const kolben = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), holz); kolben.position.z = 0; flinte.add(kolben);
    for (const s of [-1, 1]) { const lauf = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), metall); lauf.rotation.x = Math.PI / 2; lauf.position.set(s * 0.026, 0.03, 0.5); flinte.add(lauf); }
    flinte.position.set(0.2, 1.25, 0.25);
    g.add(flinte);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), jacke); arm.position.set(s * 0.18, 1.3, 0.2); g.add(arm); }
    // Mündungsblitz (ein Licht, das nur beim Schuss kurz leuchtet)
    const blitz = new THREE.PointLight('#ffb347', 0, 8, 1.5); blitz.position.set(0.2, 1.3, 1.0); g.add(blitz);
    const feuer = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffd166', fog: false }));
    feuer.position.set(0.2, 1.28, 0.95); feuer.visible = false; g.add(feuer);
    // Ziel-Laser: Ein roter Strich zeigt, wohin er gleich schießt!
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.2, 1.28, 0.9), new THREE.Vector3(0, 1, 5)]);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: '#ff2020', fog: false, transparent: true, opacity: 0.8 }));
    laser.visible = false; laser.castShadow = false; g.add(laser);
    Object.assign(g.userData, { blitz, feuer, laser, flinte });
  } else if (art === 'chemiker') {
    // 🐷 Doktor Schorsch: ein Schwein, das auf zwei Beinen steht – mit fleckigem Labor-Kittel, runder Brille und Ringelschwanz
    const mat = f => new THREE.MeshStandardMaterial({ color: f, roughness: 0.75 });
    const kittelTex = malTextur(64, 64, (c, b, h) => {
      c.fillStyle = '#e8ece4'; c.fillRect(0, 0, b, h);
      for (let k = 0; k < 9; k++) { c.fillStyle = ['#5dff4a', '#c04dff', '#4dc3ff', '#ff8a3d', '#6b5a3a'][k % 5]; c.globalAlpha = 0.55; c.beginPath(); c.arc(Math.random() * b, Math.random() * h, 2 + Math.random() * 5, 0, 7); c.fill(); }
    }, false);
    const kittel = new THREE.MeshStandardMaterial({ map: kittelTex, roughness: 0.9 }), rosa = mat('#f2a7b5'), dunkelRosa = mat('#d9788c'), huf = mat('#3a2a2a');
    const beine = [];
    for (const s of [-1, 1]) {   // Kurze, dicke Schweinebeine mit Hufen
      const bein = new THREE.Group(); bein.position.set(s * 0.14, 0.62, 0); g.add(bein);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.56, 10), rosa); b.position.y = -0.28; bein.add(b);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.08, 10), huf); h.position.y = -0.58; bein.add(h);
      beine.push(bein);
    }
    // Dicker runder Schweinebauch, darüber der offene Kittel
    const bauch = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), rosa); bauch.scale.set(1, 1.25, 0.95); bauch.position.y = 1.05; g.add(bauch);
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 0.95, 14, 1, true, Math.PI * 0.62, Math.PI * 1.76), new THREE.MeshStandardMaterial({ map: kittelTex, roughness: 0.9, side: THREE.DoubleSide }));
    rock.position.y = 1.0; g.add(rock);   // (Vorne offen – da guckt der rosa Bauch raus)
    const schultern = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 14), kittel); schultern.position.y = 1.47; g.add(schultern);
    // Gürtel mit vier bunten Trank-Fläschchen
    Object.values(TRAENKE).forEach((T, k) => {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: T.farbe }));
      fl.position.set(-0.27 + k * 0.18, 0.78, 0.33); g.add(fl);
    });
    // Ringelschwanz (schaut hinten aus dem Kittel)
    const schwanz = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI * 1.6), rosa); schwanz.position.set(0, 0.72, -0.42); schwanz.rotation.y = Math.PI / 2; g.add(schwanz);
    // Kopf: runder Schweinekopf, Rüssel mit Nasenlöchern, Schlappohren und eine runde Brille
    const kopf = new THREE.Group(); kopf.position.y = 1.8; g.add(kopf);
    kopf.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), rosa));
    const ruessel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.14, 16), dunkelRosa); ruessel.rotation.x = Math.PI / 2; ruessel.position.set(0, -0.04, 0.27); kopf.add(ruessel);
    for (const s of [-1, 1]) {
      const loch = new THREE.Mesh(new THREE.CircleGeometry(0.022, 8), mat('#5a2030')); loch.position.set(s * 0.04, -0.04, 0.342); kopf.add(loch);   // Nasenloch
      const ohr = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), dunkelRosa); ohr.position.set(s * 0.16, 0.22, 0.02); ohr.rotation.set(0.5, 0, -s * 0.5); kopf.add(ohr);   // Schlappohr
      const auge = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#111')); auge.position.set(s * 0.085, 0.07, 0.22); kopf.add(auge);
    }
    const brilleMat = new THREE.MeshBasicMaterial({ color: '#5dff4a', fog: false, transparent: true, opacity: 0.45 });
    for (const s of [-1, 1]) {   // Runde Brille (die Gläser leuchten grün – irre!)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), mat('#2a2a2a')); ring.position.set(s * 0.085, 0.07, 0.235); kopf.add(ring);
      const glas = new THREE.Mesh(new THREE.CircleGeometry(0.066, 16), brilleMat); glas.position.set(s * 0.085, 0.07, 0.24); kopf.add(glas);
    }
    const steg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), mat('#2a2a2a')); steg.position.set(0, 0.08, 0.24); kopf.add(steg);
    const mund = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 10, Math.PI), mat('#5a2030')); mund.rotation.z = Math.PI; mund.position.set(0, -0.14, 0.2); kopf.add(mund);   // Fieses Grinsen
    // Arme im Kittel mit rosa Huf-Händen: Der rechte hält einen Trank (holt beim Werfen weit aus)
    const arme = [];
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * 0.38, 1.5, 0); g.add(arm);
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.5, 10), kittel); a.position.y = -0.24; arm.add(a);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), rosa); hand.position.y = -0.52; arm.add(hand);
      arme.push(arm);
    }
    const flasche = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#5dff4a' }));
    flasche.position.set(0, -0.64, 0.03); arme[1].add(flasche);
    Object.assign(g.userData, { beine, arme, kopf, brilleMat, flasche });
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
    opfer: null, opferZeit: -99, zielen: 0, nachladen: 1, blitzZeit: 0,   // (nur für den Jäger)
  });
}
// Jemand hat Krach gemacht! Monster in der Nähe hören das. (Ein Stockwerk dazwischen dämpft den Krach)
function laerm(x, y, z, staerke) {
  if (mp.rolle === 'gast') { mpSende({ t: 'l', x: r2(x), y: r2(y), z: r2(z), st: staerke }); return; }
  const quelle = { x, y, z };
  for (const m of monster) {
    if (m.betaeubt > 0 || m.art === 'starrer') continue;
    if (m.art === 'maulwurf') {   // Krach draußen? Da wühlt er hin!
      if (m.modus === 'graben' && !imHaus(x, z) && abstand2D(m.x, m.z, x, z) < staerke * 2) { m.modus = 'jagen'; m.ziel = { x, y: 0, z }; m.jagdZeit = 6; }
      continue;
    }
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
  for (const g of mpGaeste()) {   // Multiplayer: die anderen Spieler
    const d = abstand3D(m, g);
    if (d < m.info.sicht * (g.dk ? DUCK_SICHT : 1) && d < bestD && freieSicht(von, new THREE.Vector3(g.x, g.y + 0.4, g.z))) { bestes = { x: g.x, y: g.y, z: g.z, gast: g }; bestD = d; }
  }
  return bestes;
}
// Schaust du gerade auf den Starrer?
function starrerGesehen(m) {
  if (zustand !== 'spiel') return false;
  const kopf = new THREE.Vector3(m.x, m.y + 1.2, m.z);
  for (const g of mpGaeste()) {   // Schaut ein anderer Spieler hin? Dann bleibt er auch stehen!
    if (!g.k) continue;
    const auge = new THREE.Vector3(g.k[0], g.k[1], g.k[2]), zu = kopf.clone().sub(auge);
    if (zu.length() < 40 && zu.normalize().dot(new THREE.Vector3(g.r[0], g.r[1], g.r[2])) > 0.55 && freieSicht(auge, kopf)) return true;
  }
  if (kopf.distanceTo(kamera.position) > 40) return false;
  const p = kopf.clone().project(kamera);
  if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) return false;   // Nicht im Bild
  return freieSicht(kamera.position.clone(), kopf);
}
function zufallsZiel(m) {   // Irgendwo hin wandern (meist in einen Nachbarraum, auch mal die Treppe hoch)
  if (haus.schule) return schulZufallsZiel(m);   // 📚 In der Schule
  if (m.art === 'chemiker' && haus.keller) {   // 🧪 Der Chemiker bleibt in seinem Keller – meistens rührt er im Labor herum
    const K = haus.keller, L = Math.random() < 0.4 ? K.laborMitte : null;
    if (L) return { x: L.x + zufall(-1.5, 1.5), y: K.boden, z: L.z + zufall(-1.5, 1.5) };
    let c; do c = Math.floor(Math.random() * K.nx * K.nz); while (K.gesperrt.has(c));   // Irgendeine Zelle im Labyrinth
    return kellerZellMitte(c);
  }
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
  if (m.betaeubt > 0) { m.betaeubt -= dt; m.laeuft = false; m.zielen = 0; return; }
  let tempo;
  if (m.art === 'schrank') {
    tempo = schrankUpdate(m, dt);
  } else if (m.art === 'formwandler') {
    tempo = formwandlerUpdate(m, dt);
  } else if (m.art === 'oma') {
    tempo = omaUpdate(m, dt);
  } else if (m.art === 'maulwurf') {
    tempo = maulwurfUpdate(m, dt);
  } else if (m.art === 'starrer') {
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
    if (m.lehrerRuhe > 0) m.lehrerRuhe -= dt;   // (Der Lehrer ist gerade zufrieden und sieht niemanden)
    if (info.sicht && !(m.lehrerRuhe > 0)) {
      m.sichtCheck -= dt;
      if (m.sichtCheck <= 0) {
        m.sichtCheck = 0.2;
        const opfer = sichtbaresOpfer(m);
        if (opfer) {
          m.opfer = opfer; m.opferZeit = zeit;
          if (m.modus !== 'jagen') {
            if (opfer.spieler) {
              if (m.art === 'jaeger') { monsterSound.jaeger(1, true); zeigeNachricht('🤠 Der verrückte Jäger hat dich gesehen! IN DECKUNG!', 2, '#ff6b6b'); }
              else if (m.art === 'lehrer') { monsterSound.lehrerGlocke(1); zeigeNachricht('👨‍🏫 HERR KREIDEMANN hat dich gesehen! Lauf – sonst musst du NACHSITZEN!', 2.5, '#ff6b6b'); }
              else if (m.art === 'chemiker') { monsterSound.chemikerLacht(1); zeigeNachricht('🐷 OINK-HAHAHA! Doktor Schorsch hat dich gesehen! Pass auf seine Tränke auf!', 2.5, '#ff9ab0'); }
              else { sound.geist(); zeigeNachricht(`${info.emoji} Der ${info.name} hat dich gesehen! LAUF!`, 2, '#ff6b6b'); }
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
    if (m.art === 'lehrer' && LEHRER_HUEPFT) {   // 🦘 Hüpfen: nur in der Luft kommt er vorwärts (dafür schneller – im Schnitt gleich schnell)
      const takt = m.modus === 'jagen' ? LEHRER_SPRUNG.jagdTakt : LEHRER_SPRUNG.takt;
      m.hopZeit = ((m.hopZeit || 0) + dt) % takt;
      tempo = m.hopZeit < takt * LEHRER_SPRUNG.inDerLuft ? tempo / LEHRER_SPRUNG.inDerLuft : 0;
    }
    if (m.art === 'jaeger' && jaegerZielt(m, dt)) tempo = 0;   // Beim Zielen bleibt er stehen
    if (m.art === 'chemiker' && chemikerWirft(m, dt)) tempo = 0;   // Beim Ausholen bleibt er stehen
  }
  // Ist das Ziel draußen und MONSTER_DRAUSSEN aus, lauern sie an der Haustür ...
  if (!MONSTER_DRAUSSEN && m.ziel && !imHaus(m.ziel.x, m.ziel.z)) { const a = naechsteHaustuer(m.ziel); m.ziel = a ? { ...a.innen } : { x: m.x, y: m.y, z: m.z }; }
  // 🚪 Eine zue Tür im Weg? Aufbrechen! (Das dauert kurz – deine Chance!)
  if (tempo > 0 && m.art !== 'maulwurf') {
    const tu = geschlosseneTuer(m.x, m.z, m.y, 1.15);
    if (tu) { m.tuerZeit = (m.tuerZeit || 0) + dt; tempo = 0; if (m.tuerZeit > TUER_AUFBRECHEN) { m.tuerZeit = 0; tuerSetzen(tu, true, 'monster'); } }
    else m.tuerZeit = 0;
  }
  // Laufen (durch die Türen und über die Treppen) – ohne Ziel bleibt es kurz stehen
  const wp = m.ziel ? wegPunkt(m, m, m.ziel) : m;
  const dx = wp.x - m.x, dz = wp.z - m.z, d = Math.hypot(dx, dz);
  m.laeuft = d > 0.2 && tempo > 0;
  if (m.laeuft) {
    const schritt = Math.min(d, tempo * dt);
    const nx = m.x + dx / d * schritt, nz = m.z + dz / d * schritt;
    // Oben nicht ins Treppenloch laufen (sonst fällt das Monster durch und hängt hinter der Treppe fest)
    const schonDrin = bodenLochBei(m.x, m.z, m.y, 0.3);   // (Monster laufen um Bodenlöcher herum)
    const loch = (x, z) => (!m.tw && haus.treppen.some(t => imLoch(t, x, z) && m.y > t.basis + ETAGE_HOEHE - 0.3 && !(aufRampe(t, x, z) && Math.abs(rampenHoehe(t, x) - m.y) < 0.6))) ||
      (!schonDrin && !!bodenLochBei(x, z, m.y, 0.3)) ||
      (!imHaus(x, z) && !(m.art === 'maulwurf' && m.modus !== 'oben') && (haus.baeume || []).some(b => abstand2D(x, z, b.x, b.z) < 0.55)) ||   // Draußen: nicht durch Bäume (unter der Erde geht's!)
      (m.art === 'maulwurf' && x > -1.2 && x < haus.breit * RAUM + 1.2 && z > -1.2 && z < haus.tief * RAUM + 1.2) ||   // Der Maulwurf kommt nicht ins Haus
      (m.art === 'maulwurf' && imParkplatz(x, z, 0.5)) ||   // ... und nicht unter den Schotter-Parkplatz
      schuppenSperre(m, x, z);   // Gartenhäuschen: nur durch die Tür
    if (!loch(nx, nz)) { m.x = nx; m.z = nz; }
    else if (!loch(nx, m.z)) m.x = nx;   // Am Loch entlang rutschen
    else if (!loch(m.x, nz)) m.z = nz;
    else for (const w of [0.9, -0.9, 1.6, -1.6, 2.3, -2.3]) {   // Ganz verbaut (z. B. ein Baum)? Schräg daran vorbei!
      const c = Math.cos(w), si = Math.sin(w), ax = m.x + (dx * c - dz * si) / d * schritt, az = m.z + (dx * si + dz * c) / d * schritt;
      if (!loch(ax, az)) { m.x = ax; m.z = az; break; }
    }
    let diff = Math.atan2(dx, dz) - m.winkel;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.winkel += begrenzt(diff, -dt * 6, dt * 6);
  } else if ((m.modus === 'nachsehen' || (m.art === 'lauscher' && m.modus === 'jagen')) && !(m.art === 'lehrer' && d > 0.2)) {   // (Der Lehrer steht beim Hüpfen nur kurz – er ist noch nicht da!)
    m.zielZeit = Math.min(m.zielZeit, 1.5);   // Angekommen und nichts gefunden
  }
  if (haus.schule) { const M = haus.schule; m.x = begrenzt(m.x, M.x0 + 0.4, M.x1 - 0.4); m.z = begrenzt(m.z, M.z0 + 0.4, M.z1 - 0.4); }   // 📚 Nicht aus der Schule raus
  else {
    const zaun = MONSTER_DRAUSSEN ? WALD_RAND - 0.5 : -0.4;   // Nicht durch den Zaun (oder: nicht durch die Außenwand)
    m.x = begrenzt(m.x, -zaun, haus.breit * RAUM + zaun); m.z = begrenzt(m.z, -zaun, haus.tief * RAUM + zaun);
  }
  m.y = bodenHoeheBei(m.x, m.z, m.y);   // Auf dem Boden oder auf der Treppe bleiben
  if (m.art === 'lehrer') { lehrerFaengt(m); m.angriffPause = Math.max(m.angriffPause, 0.1); }   // 👨‍🏫 Er haut nicht – er lässt nachsitzen!
  // Angriff! Auf dich ... (Die Oma schlägt nur zu, wenn sie wütend ist)
  const reichweite = m.art === 'oma' ? 1.3 : m.art === 'maulwurf' ? 1.8 : 1.0, schubs = info.schubs || 9;
  if (m.art === 'maulwurf' && m.modus !== 'oben') m.angriffPause = Math.max(m.angriffPause, 0.1);   // Unter der Erde kann er nicht hauen
  const omaHautZu = () => { if (m.art === 'oma') { m.modus = 'wandern'; m.ziel = null; m.ruhe = info.ruhe; m.aerger = 0; m.mesh.userData.schlag = 0.45; } };
  if (m.art === 'oma' && m.modus !== 'jagen') m.angriffPause = Math.max(m.angriffPause, 0.1);
  const fuss = p.y - (geduckt ? DUCK_RADIUS : KOERPER_RADIUS);
  if (m.angriffPause <= 0 && abstand2D(m.x, m.z, p.x, p.z) < reichweite && Math.abs(fuss - m.y) < 1.2) {
    m.angriffPause = info.pause;
    getroffen(info.schaden, `${info.emoji} ${info.name}`);
    const weg = new CANNON.Vec3(p.x - m.x, 0, p.z - m.z);
    weg.normalize();
    spielerKoerper.velocity.set(weg.x * schubs, 3, weg.z * schubs);   // Wegschubsen
    omaHautZu();
  }
  // ... oder einen anderen Spieler (Multiplayer)
  for (const g of mpGaeste()) {
    if (m.angriffPause <= 0 && abstand2D(m.x, m.z, g.x, g.z) < reichweite && Math.abs(g.y - m.y) < 1.2) {
      m.angriffPause = info.pause;
      mpTreffer(g, info.schaden, `${info.emoji} ${info.name}`, m, schubs);
      omaHautZu();
    }
  }
  // ... oder auf einen Helfer
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt <= 0 && m.angriffPause <= 0 && abstand2D(m.x, m.z, hp.x, hp.z) < reichweite && Math.abs(hp.y - 0.35 - m.y) < 1.2) {
      m.angriffPause = info.pause;
      helferKaputt(h, info, m);
      omaHautZu();
    }
  }
  // Getroffen von einem geworfenen Schatz? Dann betäubt!
  if (!info.betaeubbar || (m.art === 'maulwurf' && m.modus !== 'oben')) return;
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
// 👹 Das Schrank-Monster: lauern → (jemand kommt nah) warnen → jagen → heimweg (zu einem neuen Versteck) → lauern
function schrankNeuesVersteck(m, sofortHin = false) {
  // Ein Raum ohne Treppe, mit einer Wand ohne Tür (da steht der Schrank, ohne den Weg zu versperren)
  const raeume = haus.raeume.filter(R => R.nr !== haus.start && !R.treppeHoch && !R.treppeRunter && raumAbstand(haus.start, R.nr) >= 2 &&
    ['n', 's', 'w', 'o'].some(w => !R.tuer[w]) && raumNrVon(m.x, m.y + 0.5, m.z) !== R.nr);
  if (!raeume.length) return;
  const R = auswahl(raeume), seite = auswahl(['n', 's', 'w', 'o'].filter(w => !R.tuer[w]));
  const cx = R.x0 + RAUM / 2, cz = R.z0 + RAUM / 2, rand = 0.45;
  const pos = { n: [cx, R.z0 + rand, 0], s: [cx, R.z0 + RAUM - rand, Math.PI], w: [R.x0 + rand, cz, Math.PI / 2], o: [R.x0 + RAUM - rand, cz, -Math.PI / 2] }[seite];
  m.heim = { x: pos[0], y: R.basis, z: pos[1], w: pos[2] };
  if (sofortHin) { m.x = m.heim.x; m.y = m.heim.y; m.z = m.heim.z; m.winkel = m.heim.w; m.modus = 'lauern'; m.ziel = { ...m.heim }; }
}
function schrankOpfer(m, weite) {   // Wer ist am nächsten dran? (du, ein Mitspieler oder ein Helfer – im gleichen Stockwerk)
  let bestes = null, bestD = weite;
  const p = spielerKoerper.position;
  if (!tot && Math.abs(p.y - KOERPER_RADIUS - m.y) < 1.5) { const d = abstand2D(m.x, m.z, p.x, p.z); if (d < bestD) { bestD = d; bestes = { x: p.x, y: p.y, z: p.z, spieler: true }; } }
  for (const g of mpGaeste()) if (Math.abs(g.y - m.y) < 1.5) { const d = abstand2D(m.x, m.z, g.x, g.z); if (d < bestD) { bestD = d; bestes = { x: g.x, y: g.y, z: g.z, gast: g }; } }
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt <= 0 && Math.abs(hp.y - 0.35 - m.y) < 1.5) { const d = abstand2D(m.x, m.z, hp.x, hp.z); if (d < bestD) { bestD = d; bestes = { x: hp.x, y: hp.y, z: hp.z, helfer: h }; } }
  }
  return bestes;
}
function schrankUpdate(m, dt) {
  const info = m.info;
  if (!m.heim) schrankNeuesVersteck(m);
  if (m.modus === 'wandern' || m.modus === 'nachsehen') m.modus = 'heimweg';   // (nach dem Betäuben)
  if (m.modus === 'lauern') {   // Ganz still an der Wand stehen ...
    m.x = m.heim.x; m.z = m.heim.z; m.winkel = m.heim.w; m.ziel = { ...m.heim };
    if (schrankOpfer(m, info.lauerWeite)) { m.modus = 'warnen'; m.warnZeit = info.warnen; }
    return 0;
  }
  if (m.modus === 'warnen') {   // Knaaarz! Rüttel, rüttel ...
    m.warnZeit -= dt;
    if (m.warnZeit <= 0) {
      const opfer = schrankOpfer(m, 12);
      m.modus = 'jagen'; m.jagdZeit = info.jagdDauer;
      if (opfer && opfer.spieler) zeigeNachricht('👹 DER SCHRANK LEBT! LAUF!', 2.5, '#ff6b6b');
      if (opfer && opfer.helfer) { opfer.helfer.angst = 3; sagen(opfer.helfer, 'hilfe', { monster: info.name }, 1); }
    }
    return 0;
  }
  if (m.modus === 'jagen') {
    m.jagdZeit -= dt;
    const opfer = schrankOpfer(m, 14);
    if (!opfer || m.jagdZeit <= 0) { m.modus = 'heimweg'; schrankNeuesVersteck(m); return info.tempo; }   // Genug gejagt: neues Versteck suchen
    m.ziel = { x: opfer.x, y: opfer.y, z: opfer.z };
    return info.jagdTempo;
  }
  // Heimweg: zum neuen Versteck laufen
  m.ziel = { x: m.heim.x, y: m.heim.y, z: m.heim.z };
  if (abstand2D(m.x, m.z, m.heim.x, m.heim.z) < 0.3 && Math.abs(m.y - m.heim.y) < 1) { m.modus = 'lauern'; return 0; }
  return info.tempo;
}
function schuppenSperre(m, x, z) {
  const S = schuppenBei(x, z, 0.4);
  if (!S) return false;
  if (m.art === 'maulwurf') return true;                                  // Der Maulwurf kommt da nicht rein
  if (schuppenBei(m.x, m.z, 0.4) === S) return false;                     // Schon drin: Weiterlaufen ist okay
  return abstand2D(x, z, S.tx, S.tz) > 1.0;                               // Rein nur durch die Tür
}
// 🐾 Der Achtarm-Maulwurf: graben → (spürt Schritte) jagen → (direkt drunter) auftauchen → oben (haut zu!) → abtauchen → graben
function maulwurfOpfer(m, weite, auchStill = false) {   // Wer läuft draußen herum? (Stillstehen oder Ducken = er spürt dich nicht!)
  let bestes = null, bestD = weite;
  const dranBleiben = (o, d) => { if (m.opferWer && o.wer === m.opferWer) d -= 4; return d; };   // Wen er schon jagt, den verfolgt er lieber weiter
  const p = spielerKoerper.position, v = spielerKoerper.velocity;
  if (!tot && !imHaus(p.x, p.z) && !schuppenBei(p.x, p.z) && !imParkplatz(p.x, p.z) && p.y < 1.5 && (auchStill || (!geduckt && Math.hypot(v.x, v.z) > 0.6))) {
    const o = { x: p.x, y: 0, z: p.z, spieler: true, wer: 'ich' }, d = dranBleiben(o, abstand2D(m.x, m.z, p.x, p.z)); if (d < bestD) { bestD = d; bestes = o; }
  }
  for (const g of mpGaeste()) {
    if (zeit - (g.mwT || 0) > 0.3) { g.mwBewegt = Math.hypot(g.x - (g.mwX ?? g.x), g.z - (g.mwZ ?? g.z)) > 0.15; g.mwX = g.x; g.mwZ = g.z; g.mwT = zeit; }
    if (imHaus(g.x, g.z) || schuppenBei(g.x, g.z) || imParkplatz(g.x, g.z) || g.y > 1.5 || !(auchStill || (g.mwBewegt && !g.dk))) continue;
    const o = { x: g.x, y: 0, z: g.z, gast: g, wer: g.id }, d = dranBleiben(o, abstand2D(m.x, m.z, g.x, g.z)); if (d < bestD) { bestD = d; bestes = o; }
  }
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt > 0 || imHaus(hp.x, hp.z) || schuppenBei(hp.x, hp.z) || hp.y > 1.5 || !(auchStill || Math.hypot(h.body.velocity.x, h.body.velocity.z) > 0.5)) continue;
    const o = { x: hp.x, y: 0, z: hp.z, helfer: h, wer: h.name }, d = dranBleiben(o, abstand2D(m.x, m.z, hp.x, hp.z)); if (d < bestD) { bestD = d; bestes = o; }
  }
  if (bestes) m.opferWer = bestes.wer;
  return bestes;
}
function maulwurfUpdate(m, dt) {
  const info = m.info;
  m.ruhe = Math.max(0, (m.ruhe || 0) - dt);
  if (m.modus === 'wandern' || m.modus === 'nachsehen') { m.modus = 'abtauchen'; m.warnZeit = info.abtauchen; }   // (nach dem Betäuben)
  if (m.modus === 'graben' || m.modus === 'jagen') {
    const o = m.ruhe > 0 ? null : maulwurfOpfer(m, info.fuehlWeite);
    if (o) {   // Schritte gespürt! Hinwühlen ...
      m.modus = 'jagen'; m.ziel = { x: o.x, y: 0, z: o.z }; m.jagdZeit = 4;
      if (abstand2D(m.x, m.z, o.x, o.z) < info.auftauchWeite) {   // Direkt drunter: RAUS!
        m.modus = 'auftauchen'; m.warnZeit = info.auftauchen; m.winkel = Math.atan2(o.x - m.x, o.z - m.z);
        if (o.spieler) zeigeNachricht('🐾 DER BODEN BEBT! Ein ACHTARMIGER MAULWURF bricht raus! WEG HIER!', 2.5, '#ff6b6b');
        if (o.helfer) { o.helfer.angst = 3; sagen(o.helfer, 'hilfe', { monster: info.name }, 1); }
        return 0;
      }
      return info.jagdTempo;
    }
    if (m.modus === 'jagen') {   // Niemand mehr zu spüren: Noch kurz zur letzten Stelle wühlen
      m.jagdZeit -= dt;
      if (m.jagdZeit > 0 && m.ziel) return abstand2D(m.x, m.z, m.ziel.x, m.ziel.z) < 0.5 ? 0 : info.jagdTempo * 0.8;
      m.modus = 'graben'; m.ziel = null;
    }
    m.zielZeit -= dt;   // Gemütlich durch den Waldboden graben
    if (!m.ziel || m.zielZeit <= 0 || abstand2D(m.x, m.z, m.ziel.x, m.ziel.z) < 0.6) {
      const pl = waldPlatz((a, b) => a + Math.random() * (b - a));
      m.ziel = pl ? { x: pl.x, y: 0, z: pl.z } : { x: m.x, y: 0, z: m.z }; m.zielZeit = 6 + Math.random() * 6;
    }
    return info.tempo;
  }
  if (m.modus === 'auftauchen') {
    m.warnZeit -= dt;
    if (m.warnZeit <= 0) {
      m.modus = 'oben'; m.obenZeit = info.obenZeit;
      if (m.opferWer === 'ich') zeigeNachricht('🐾🕷️ Er KRABBELT hinter dir her! RENN (Shift)!', 2.5, '#ff6b6b');
    }
    return 0;
  }
  if (m.modus === 'oben') {   // Oben! Er krabbelt auf seinen acht Armen hinter dir her und haut zu!
    m.obenZeit -= dt;
    const o = maulwurfOpfer(m, info.krabbelWeite, true);   // Oben riecht er dich – Stillstehen hilft jetzt nicht mehr!
    m.alleinZeit = o ? 0 : (m.alleinZeit || 0) + dt;
    if (m.obenZeit <= 0 || m.alleinZeit > 1.5) { m.modus = 'abtauchen'; m.warnZeit = info.abtauchen; m.alleinZeit = 0; return 0; }   // Müde (oder keiner mehr da): wieder runter
    if (!o) { m.ziel = { x: m.x, y: 0, z: m.z }; return 0; }
    m.ziel = { x: o.x, y: 0, z: o.z }; m.letzteSpur = { ...m.ziel };
    return abstand2D(m.x, m.z, o.x, o.z) < 1.0 ? 0 : info.krabbelTempo;
  }
  if (m.modus === 'abtauchen') {
    m.warnZeit -= dt;
    if (m.warnZeit <= 0) {   // Unten weiterjagen! Er wühlt zur letzten Stelle, wo er dich gerochen hat
      if (m.letzteSpur) { m.modus = 'jagen'; m.ziel = m.letzteSpur; m.jagdZeit = 4; m.letzteSpur = null; }
      else { m.modus = 'graben'; m.ziel = null; }
      m.ruhe = 0.8;   // (ganz kurz, sonst taucht er sofort wieder auf)
    }
    return 0;
  }
  m.modus = 'graben';
  return 0;
}
// 👵🦯 Die Böse Oma: wandern → (jemand schaut sie an) grummeln → (zu lange hingeschaut!) jagen → BONK → wieder wandern
// Schaust du gerade auf diese Stelle? (Nur die Mitte vom Bild zählt – aus dem Augenwinkel ist okay)
function ichSchaueHin(m, weite, hoehe = 1.3) {
  const kopf = new THREE.Vector3(m.x, m.y + hoehe, m.z);
  if (kopf.distanceTo(kamera.position) > weite) return false;
  const p = kopf.clone().project(kamera);
  if (p.z > 1 || Math.abs(p.x) > 0.55 || Math.abs(p.y) > 0.7) return false;
  return freieSicht(kamera.position.clone(), kopf);
}
function omaGucker(m) {   // Wer schaut die Oma gerade an? (du oder ein Mitspieler – Helfer-Bots sind zu höflich dafür)
  if (zustand !== 'spiel') return null;
  const weite = m.info.sichtWeite, p = spielerKoerper.position;
  if (!tot && ichSchaueHin(m, weite)) return { x: p.x, y: p.y, z: p.z, spieler: true };
  const kopf = new THREE.Vector3(m.x, m.y + 1.3, m.z);
  for (const g of mpGaeste()) {
    if (!g.k || !g.r) continue;
    const auge = new THREE.Vector3(g.k[0], g.k[1], g.k[2]), zu = kopf.clone().sub(auge);
    if (zu.length() < weite && zu.normalize().dot(new THREE.Vector3(g.r[0], g.r[1], g.r[2])) > 0.85 && freieSicht(auge, kopf)) return { x: g.x, y: g.y, z: g.z, gast: g };
  }
  return null;
}
function omaUpdate(m, dt) {
  const info = m.info;
  m.ruhe = Math.max(0, (m.ruhe || 0) - dt);
  if (m.modus === 'jagen') {   // WÜTEND! Sie rennt dem hinterher, der sie angeschaut hat
    m.jagdZeit -= dt;
    const o = m.opfer;
    const ziel = !o ? null : o.spieler ? (tot ? null : spielerKoerper.position) : o.gast && mp.andere.has(o.gast.id) && o.gast.y > -10 ? o.gast : null;
    if (!ziel || m.jagdZeit <= 0) { m.modus = 'wandern'; m.ziel = null; m.ruhe = 2; m.aerger = 0; return info.tempo; }
    m.ziel = { x: ziel.x, y: ziel.y, z: ziel.z };
    return info.jagdTempo;
  }
  const gucker = m.ruhe > 0 ? null : omaGucker(m);
  if (gucker) {   // Hmpf?! Sie bleibt stehen, starrt zurück und wird immer saurer ...
    m.modus = 'grummeln';
    m.aerger = (m.aerger || 0) + dt / info.geduld;
    m.winkel = Math.atan2(gucker.x - m.x, gucker.z - m.z);
    m.ziel = { x: m.x, y: m.y, z: m.z };
    if (m.aerger >= 1) {
      m.modus = 'jagen'; m.jagdZeit = info.jagdDauer; m.opfer = gucker; m.aerger = 0;
      if (gucker.spieler) zeigeNachricht('👵🦯 DU HAST DIE OMA ANGESCHAUT! LAUF!!!', 2.5, '#ff6b6b');
      const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, m) < 15);
      if (zeuge) { zeuge.angst = 3; sagen(zeuge, 'hilfe', { monster: info.name }, 1); }
    }
    return 0;
  }
  if (m.modus === 'grummeln') {   // Keiner schaut mehr hin: Sie beruhigt sich langsam wieder
    m.aerger -= dt / info.geduld * 0.6;
    if (m.aerger > 0) return 0;
    m.modus = 'wandern'; m.ziel = null;
  }
  m.aerger = 0;
  // Wandern (oder nachsehen, wenn sie Krach gehört hat)
  m.zielZeit -= dt;
  if (!m.ziel || m.zielZeit <= 0 || abstand3D(m, m.ziel) < 0.5) { m.modus = 'wandern'; m.ziel = zufallsZiel(m); m.zielZeit = zufall(5, 10); }
  return info.tempo;
}
// 👾 In welchen Schatz verwandelt er sich? (Nummer in SCHAETZE – irgendeiner!)
const tarnSchatzWaehlen = () => Math.floor(Math.random() * SCHAETZE.length);
function tarnSchatzMesh(U, nr) {   // Das Aussehen für Schatz Nummer nr (einmal bauen, dann merken)
  const typ = SCHAETZE[nr] || SCHAETZE[0];
  if (!U.tarnSchaetze[typ.id]) {
    const mesh = baueSchatzMesh(typ);
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.position.y = typ.groesse[1] / 2;
    U.echt.parent.add(mesh); U.tarnSchaetze[typ.id] = mesh;
  }
  return U.tarnSchaetze[typ.id];
}
// 🤖👾 Der Formwandler: tarnBot / tarnSchatz (irgendein Schatz!) → (jemand kommt nah) verwandeln → jagen → abhauen (in einen anderen Raum) → neue Tarnung
function formwandlerUpdate(m, dt) {
  const info = m.info;
  if (m.modus === 'wandern' || m.modus === 'nachsehen') { m.modus = 'abhauen'; m.ziel = null; }   // (nach dem Betäuben)
  if (m.modus === 'tarnBot' || m.modus === 'tarnSchatz') {
    if (schrankOpfer(m, info.aufwachWeite)) { m.modus = 'verwandeln'; m.warnZeit = info.verwandeln; return 0; }
    if (m.modus === 'tarnSchatz') { m.ziel = { x: m.x, y: m.y, z: m.z }; return 0; }   // Ein Schatz bewegt sich nicht ... meistens
    m.zielZeit -= dt;   // Als falscher Helfer-Bot langsam durchs Haus fahren
    if (!m.ziel || m.zielZeit <= 0 || abstand3D(m, m.ziel) < 0.5) { m.ziel = zufallsZiel(m); m.zielZeit = zufall(5, 10); }
    return info.tarnTempo;
  }
  if (m.modus === 'verwandeln') {   // Bzzzrt! Er glitcht ...
    m.warnZeit -= dt;
    if (m.warnZeit <= 0) {
      const opfer = schrankOpfer(m, 12);
      m.modus = 'jagen'; m.jagdZeit = info.jagdDauer;
      if (opfer && opfer.spieler) zeigeNachricht('👾 DAS WAR KEIN FREUND! Ein FORMWANDLER! LAUF!', 2.5, '#ff6b6b');
      if (opfer && opfer.helfer) { opfer.helfer.angst = 3; sagen(opfer.helfer, 'hilfe', { monster: info.name }, 1); }
    }
    return 0;
  }
  if (m.modus === 'jagen') {
    m.jagdZeit -= dt;
    const opfer = schrankOpfer(m, 14);
    if (!opfer || m.jagdZeit <= 0) { m.modus = 'abhauen'; m.ziel = null; return info.tempo; }
    m.ziel = { x: opfer.x, y: opfer.y, z: opfer.z };
    return info.jagdTempo;
  }
  // Abhauen: in einen anderen Raum (weit weg von allen), dort neu tarnen
  if (!m.ziel && haus.schule) m.ziel = schulWeitWeg(m);   // 📚 In der Schule: in einen anderen Flügel
  if (!m.ziel) {
    const raeume = haus.raeume.filter(R => R.nr !== haus.start && raumAbstand(haus.start, R.nr) >= 2 && raumNrVon(m.x, m.y + 0.5, m.z) !== R.nr);
    const R = raeume.length ? auswahl(raeume) : haus.raeume[0];
    m.ziel = { x: R.x0 + RAUM / 2 + zufall(-1.5, 1.5), y: R.basis, z: R.z0 + RAUM / 2 + zufall(-1.5, 1.5) };
  }
  if (abstand2D(m.x, m.z, m.ziel.x, m.ziel.z) < 0.4 && Math.abs(m.y - m.ziel.y) < 1) {
    m.modus = Math.random() < 0.5 ? 'tarnBot' : 'tarnSchatz'; m.ziel = null; m.zielZeit = 0;
    m.tarnTyp = tarnSchatzWaehlen();   // Jedes Mal ein ANDERER Schatz!
    return 0;
  }
  return info.tempo;
}
// 🤠 Der Jäger: Sieht er jemanden in Schussweite, bleibt er stehen, zielt (roter Laser!) und ballert los.
let schussSpuren = [];   // Die kurzen Striche der Schrotkugeln
function jaegerZielt(m, dt) {
  const info = m.info;
  m.nachladen -= dt;
  const o = m.opfer;
  if (!o || m.modus !== 'jagen' || zeit - m.opferZeit > 0.35 || m.nachladen > 0) { m.zielen = 0; return false; }
  const ziel = o.helfer ? o.helfer.body.position : o.gast ? { x: o.gast.x, y: o.gast.y + 0.4, z: o.gast.z } : spielerKoerper.position;
  if (o.helfer && o.helfer.kaputt > 0) { m.zielen = 0; return false; }
  if (o.gast && !mp.andere.has(o.gast.id)) { m.zielen = 0; return false; }
  m.laserZiel = { x: ziel.x, y: ziel.y, z: ziel.z };
  const d = abstand3D(m, ziel);
  if (d > info.schussWeite) { m.zielen = 0; return false; }
  m.winkel = Math.atan2(ziel.x - m.x, ziel.z - m.z);   // Zum Opfer drehen
  if (m.zielen === 0) monsterSound.klickKlack(Math.max(0.4, monsterLautstaerke(m)));
  m.zielen += dt;
  if (m.zielen >= info.zielen) schiessen(m, o, ziel, d);
  return true;
}
function schiessen(m, o, ziel, d) {
  const info = m.info;
  m.zielen = 0; m.nachladen = info.nachladen; m.blitzZeit = 0.1;
  monsterSound.schuss(Math.max(0.35, monsterLautstaerke(m)));
  laerm(m.x, m.y, m.z, 14);   // BUMM! Das hören alle Monster ...
  wackeln = Math.max(wackeln, 0.15);
  // Wo ist die Mündung?
  const mund = new THREE.Vector3(m.x + Math.sin(m.winkel) * 0.95 + Math.cos(m.winkel) * 0.2, m.y + 1.28, m.z + Math.cos(m.winkel) * 0.95 - Math.sin(m.winkel) * 0.2);
  const zielV = new THREE.Vector3(ziel.x, ziel.y + 0.1, ziel.z);
  // Trifft er? (Je weiter weg, desto öfter daneben. Geduckt bist du schwerer zu treffen.)
  let chance = begrenzt(1.15 - d / info.schussWeite, 0.25, 1);
  if (o.spieler && geduckt) chance *= 0.6;
  const trifft = freieSicht(mund, zielV) && Math.random() < chance;
  if (trifft) {
    const schaden = Math.round(info.schussSchaden * (1 - d / (info.schussWeite * 1.6)));
    if (o.spieler) {
      getroffen(schaden, '🤠 Jäger (Schrotflinte!)');
      const weg = new CANNON.Vec3(ziel.x - m.x, 0, ziel.z - m.z); weg.normalize();
      spielerKoerper.velocity.set(weg.x * 7, 2.5, weg.z * 7);
      zeigeNachricht(`💥 Getroffen! -${schaden} Energie`, 1.5, '#ff6b6b');
    } else if (o.helfer) helferKaputt(o.helfer, info, m);
    else if (o.gast) mpTreffer(o.gast, Math.max(5, schaden), '🤠 Jäger (Schrotflinte!)', m, 7);
  } else if (o.spieler) zeigeNachricht('💨 Knapp daneben!', 1.2, '#ffd166');
  if (mp.rolle === 'host') mpAnAlle({ t: 'schuss', m: monster.indexOf(m), z: [r2(zielV.x), r2(zielV.y), r2(zielV.z)], tr: trifft });
  schussEffekt(m, zielV, trifft);
}
function schussEffekt(m, zielV, trifft) {   // Was man sieht und hört, wenn der Jäger schießt
  m.blitzZeit = 0.1;
  if (mp.rolle === 'gast') { monsterSound.schuss(Math.max(0.35, monsterLautstaerke(m))); wackeln = Math.max(wackeln, 0.15); }
  const mund = new THREE.Vector3(m.x + Math.sin(m.winkel) * 0.95 + Math.cos(m.winkel) * 0.2, m.y + 1.28, m.z + Math.cos(m.winkel) * 0.95 - Math.sin(m.winkel) * 0.2);
  // Schrotkugeln als kurze leuchtende Striche
  for (let k = 0; k < 7; k++) {
    const streu = trifft ? 0.3 : 1.4;
    const ende = zielV.clone().add(new THREE.Vector3(zufall(-streu, streu), zufall(-streu, streu) * 0.6, zufall(-streu, streu)));
    ende.sub(mund).multiplyScalar(trifft ? 1 : 1.5).add(mund);
    const linie = new THREE.Line(new THREE.BufferGeometry().setFromPoints([mund, ende]),
      new THREE.LineBasicMaterial({ color: '#ffe08a', fog: false, transparent: true, opacity: 1 }));
    szene.add(linie);
    schussSpuren.push({ mesh: linie, t: 0.15 });
  }
}
function updateSchussSpuren(dt) {
  for (const sp of schussSpuren) {
    sp.t -= dt;
    sp.mesh.material.opacity = Math.max(0, sp.t / 0.15);
    if (sp.t <= 0) { szene.remove(sp.mesh); sp.mesh.geometry.dispose(); sp.mesh.material.dispose(); }
  }
  schussSpuren = schussSpuren.filter(sp => sp.t > 0);
}
// 🧪 Der Chemiker: Sieht er jemanden in Wurfweite, bleibt er stehen, holt aus – und WUSCH! fliegt ein Trank im Bogen
function chemikerWirft(m, dt) {
  const info = m.info;
  // Er verlässt seinen Keller nie: Ist sein Ziel oben, wartet er unten an der Treppe (und wirft hoch, wenn er dich sieht!)
  if (haus.keller && m.ziel && !imKeller(m.ziel)) { const P = treppenPunkte(haus.keller.treppe); m.ziel = { x: P.vor.x + 1.5, y: haus.keller.boden, z: P.vor.z + 1.5 }; }
  m.nachladen -= dt;
  const o = m.opfer;
  if (!o || m.modus !== 'jagen' || zeit - m.opferZeit > 0.35 || m.nachladen > 0) { m.zielen = 0; return false; }
  if (o.helfer && o.helfer.kaputt > 0) { m.zielen = 0; return false; }
  if (o.gast && !mp.andere.has(o.gast.id)) { m.zielen = 0; return false; }
  const ziel = o.helfer ? o.helfer.body.position : o.gast ? { x: o.gast.x, y: o.gast.y + 0.4, z: o.gast.z } : spielerKoerper.position;
  if (abstand3D(m, ziel) > info.wurfWeite) { m.zielen = 0; return false; }
  m.winkel = Math.atan2(ziel.x - m.x, ziel.z - m.z);   // Zum Opfer drehen
  if (m.zielen === 0) monsterSound.chemikerLacht(Math.max(0.4, monsterLautstaerke(m)));
  m.zielen += dt;
  if (m.zielen >= info.ausholen) { m.zielen = 0; m.nachladen = info.nachladen; trankWerfen(m, ziel); }
  return true;
}
const TRANK_SCHWERKRAFT = 9.8;
function trankWerfen(m, ziel) {
  const art = auswahl(Object.keys(TRAENKE));
  const hand = { x: m.x + Math.sin(m.winkel) * 0.3 + Math.cos(m.winkel) * 0.32, y: m.y + 2.0, z: m.z + Math.cos(m.winkel) * 0.3 - Math.sin(m.winkel) * 0.32 };
  const zx = ziel.x + zufall(-0.5, 0.5), zz = ziel.z + zufall(-0.5, 0.5);   // Ein bisschen ungenau (sonst wäre es unfair)
  const dx = zx - hand.x, dy = ziel.y - hand.y, dz = zz - hand.z;
  const T = begrenzt(Math.hypot(dx, dz) / 12, 0.35, 1.0);   // Flugzeit: ein flacher Bogen, damit er nicht an die Kellerdecke knallt
  const v = [dx / T, (dy + 0.5 * TRANK_SCHWERKRAFT * T * T) / T, dz / T];
  const id = ++trankNummer;
  trankStart(id, art, [hand.x, hand.y, hand.z], v);
  if (mp.rolle === 'host') mpAnAlle({ t: 'trank', id, art, p: [r2(hand.x), r2(hand.y), r2(hand.z)], v: v.map(r2) });
}
function trankStart(id, art, p, v) {   // Ein Trank fliegt los (das sehen alle)
  const T = TRAENKE[art];
  if (!T) return;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: T.farbe })));
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 8), new THREE.MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.6 }));
  hals.position.y = 0.13; g.add(hals);
  const korken = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#8a5a2b' }));
  korken.position.y = 0.21; g.add(korken);
  g.position.set(p[0], p[1], p[2]); szene.add(g);
  traenke.push({ id, art, mesh: g, pos: new THREE.Vector3(p[0], p[1], p[2]), v: new THREE.Vector3(v[0], v[1], v[2]), alter: 0 });
  monsterSound.trankWurf(lautBei({ x: p[0], y: p[1], z: p[2] }));
}
function trankWeg(t) { szene.remove(t.mesh); traenke = traenke.filter(q => q !== t); }
function trankBoden(x, z, y) { return imKellerXZ(x, z) && y < -0.7 ? haus.keller.boden : bodenHoeheBei(x, z, y); }
function trankTrifftJemanden(q) {
  const p = spielerKoerper.position;
  if (!tot && q.distanceTo(p) < 0.55) return true;
  for (const g of mpGaeste()) if (Math.hypot(q.x - g.x, q.y - g.y - 0.4, q.z - g.z) < 0.6) return true;
  return helfer.some(h => h.kaputt <= 0 && q.distanceTo(h.body.position) < 0.55);
}
const trankStrahl = new THREE.Raycaster(), trankRichtung = new THREE.Vector3();
function updateTraenke(dt) {
  for (const t of [...traenke]) {
    t.alter += dt;
    const alt = t.pos.clone();
    t.v.y -= TRANK_SCHWERKRAFT * dt;
    t.pos.addScaledVector(t.v, dt);
    t.mesh.position.copy(t.pos);
    t.mesh.rotation.x += dt * 9; t.mesh.rotation.z += dt * 5;   // Er wirbelt durch die Luft
    if (mp.rolle === 'gast') { if (t.alter > 4) trankWeg(t); continue; }   // Beim Gast: Wo er zerplatzt, sagt der Gastgeber
    // Trifft er eine Wand, die Decke, den Boden oder jemanden?
    let wo = null;
    trankRichtung.copy(t.pos).sub(alt);
    const l = trankRichtung.length();
    if (l > 0) {
      trankStrahl.set(alt, trankRichtung.normalize()); trankStrahl.far = l;
      const h = trankStrahl.intersectObjects(sichtBlocker, false)[0];
      if (h) wo = h.point.clone().addScaledVector(trankRichtung, -0.08);
    }
    if (!wo && t.pos.y <= trankBoden(t.pos.x, t.pos.z, alt.y) + 0.08) wo = t.pos.clone();
    if (!wo && (trankTrifftJemanden(t.pos) || t.alter > 4)) wo = t.pos.clone();
    if (!wo) continue;
    trankPlatsch(t.id, t.art, wo.x, wo.y, wo.z);
    if (mp.rolle === 'host') mpAnAlle({ t: 'platsch', id: t.id, art: t.art, p: [r2(wo.x), r2(wo.y), r2(wo.z)] });
  }
}
// KLIRR! Der Trank zerplatzt (passiert bei allen – jeder Computer kümmert sich um seinen eigenen Roboter)
function trankPlatsch(id, art, x, y, z) {
  const t = traenke.find(q => q.id === id);
  if (t) trankWeg(t);
  const T = TRAENKE[art];
  if (!T) return;
  monsterSound.trankPlatsch(lautBei({ x, y, z }));
  for (let k = 0; k < 16; k++) {   // Bunte Spritzer und Glassplitter
    const m = new THREE.Mesh(k % 4 ? new THREE.SphereGeometry(0.05, 6, 4) : new THREE.TetrahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: k % 4 ? T.farbe : '#cfe9ff' }));
    m.position.set(x, y + 0.05, z); szene.add(m);
    splitter.push({ mesh: m, v: new THREE.Vector3(zufall(-3, 3), zufall(1.5, 4.5), zufall(-3, 3)), t: 0.7 });
  }
  const boden = trankBoden(x, z, y + 0.3);
  if (T.pfuetze && y - boden < 1.5) neuePfuetze(art, x, boden, z);
  if (art === 'knall') { wackeln = Math.max(wackeln, 0.25 * lautBei({ x, y, z })); schwebeText(x, y + 0.8, z, '💥 BUMM!', T.farbe); }
  // Hat es dich erwischt?
  const p = spielerKoerper.position;
  if (!tot && zustand === 'spiel' && Math.hypot(p.x - x, p.y - y, p.z - z) < TRANK_RADIUS + 0.3) trankTrifftMich(T, art, x, z);
  // Die Helfer (um die kümmert sich nur der Gastgeber)
  if (mp.rolle === 'gast') return;
  for (const h of helfer) {
    const hp = h.body.position;
    if (h.kaputt > 0 || Math.hypot(hp.x - x, hp.y - y, hp.z - z) > TRANK_RADIUS + 0.3) continue;
    const m = monster.find(q => q.art === 'chemiker');
    if ((art === 'knall' || art === 'gift') && m) helferKaputt(h, m.info, m);
    else { h.wackelt = 1.5; h.angst = 3; }   // Schleim und Nebel: Er ist kurz ganz durcheinander
  }
}
function trankTrifftMich(T, art, x, z) {
  const p = spielerKoerper.position;
  if (T.schubs) { const dx = p.x - x, dz = p.z - z, l = Math.hypot(dx, dz) || 1; spielerKoerper.velocity.set(dx / l * T.schubs, 5, dz / l * T.schubs); wackeln = Math.max(wackeln, 0.6); }
  if (T.nebel) nebelZeit = T.nebel;
  if (T.langsam) klebZeit = Math.max(klebZeit, 1.5);
  zeigeNachricht({ gift: '🟢 GIFTTRANK! Raus aus der grünen Wolke!', schleim: '🟣 KLEBESCHLEIM! Du klebst fest ...', nebel: '🔵 NEBELTRANK! Du siehst fast nichts mehr!', knall: '🟠 KNALLTRANK! BUMM!' }[art], 2.5, T.farbe);
  getroffen(T.schaden, `🐷 Doktor Schorsch (${T.name})`);
}
function neuePfuetze(art, x, y, z) {
  const T = TRAENKE[art], g = new THREE.Group();
  const flaeche = new THREE.Mesh(new THREE.CircleGeometry(TRANK_RADIUS * 0.85, 20), new THREE.MeshBasicMaterial({ color: T.farbe, transparent: true, opacity: 0.5, depthWrite: false }));
  flaeche.rotation.x = -Math.PI / 2; flaeche.position.y = 0.03; g.add(flaeche);
  if (T.gift) for (let k = 0; k < 7; k++) {   // Giftwolke: grüne Nebelkugeln, die wabern
    const w = new THREE.Mesh(new THREE.SphereGeometry(zufall(0.35, 0.6), 10, 8), new THREE.MeshBasicMaterial({ color: T.farbe, transparent: true, opacity: 0.16, depthWrite: false }));
    w.position.set(zufall(-1, 1), 0.4, zufall(-1, 1)); g.add(w);
  }
  g.position.set(x, y, z); szene.add(g);
  pfuetzen.push({ art, x, y, z, t: T.pfuetze, mesh: g, tick: 0 });
}
function giftSchaden(menge) {   // Die Giftwolke kostet langsam Energie (ohne dass du alles fallen lässt)
  energie -= menge;
  schadenBlitz = Math.max(schadenBlitz, 0.2);
  ton(zufall(180, 240), 0, 0.12, 'sawtooth', 0.04, 140);   // *hust*
  if (energie <= 0) { energie = 1; getroffen(1, '🟢 Giftwolke von Doktor Schorsch'); }
}
function updatePfuetzen(dt) {
  nebelZeit = Math.max(0, nebelZeit - dt); klebZeit = Math.max(0, klebZeit - dt);
  const p = spielerKoerper.position, fuss = p.y - (geduckt ? DUCK_RADIUS : KOERPER_RADIUS);
  for (const q of pfuetzen) {
    q.t -= dt;
    const T = TRAENKE[q.art], sicht = begrenzt(q.t, 0, 1);   // In der letzten Sekunde verschwindet sie langsam
    q.mesh.children.forEach((k, i) => {
      k.material.opacity = (i === 0 ? 0.5 : 0.16) * sicht;
      if (i > 0) { k.position.y = 0.45 + Math.sin(zeit * 1.5 + i) * 0.25; k.scale.setScalar(1 + Math.sin(zeit * 2 + i * 2) * 0.15); }
    });
    if (tot || zustand !== 'spiel' || q.t <= 0) continue;
    if (abstand2D(p.x, p.z, q.x, q.z) > TRANK_RADIUS * 0.85 || Math.abs(fuss - q.y) > 1.2) continue;
    if (T.gift) { q.tick -= dt; if (q.tick <= 0) { q.tick = 0.5; giftSchaden(T.gift * 0.5); } }
    if (T.langsam) klebZeit = Math.max(klebZeit, 0.2);
  }
  for (const q of pfuetzen) if (q.t <= 0) szene.remove(q.mesh);
  pfuetzen = pfuetzen.filter(q => q.t > 0);
}
function traenkeAufraeumen() {
  for (const t of traenke) szene.remove(t.mesh);
  for (const q of pfuetzen) szene.remove(q.mesh);
  traenke = []; pfuetzen = []; nebelZeit = 0; klebZeit = 0;
}
// 🔵 Nebeltrank: Alles wird blau und neblig (der Nebel im Spiel wird ganz dick)
const nebelNormal = new THREE.Color(DUNKEL), nebelBlau = new THREE.Color('#1d3f5c');
function nebelAnpassen() {
  const n = begrenzt(nebelZeit / 1.5, 0, 1);   // In den letzten 1,5 Sekunden wird es langsam wieder klar
  szene.fog.density = 0.06 + n * 0.45;
  szene.fog.color.copy(nebelNormal).lerp(nebelBlau, n);
  szene.background.copy(szene.fog.color);
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
  } else if (m.art === 'lehrer') {
    const U = g.userData, jagt = m.modus === 'jagen', schritt = m.laeuft ? Math.sin(m.phase * (jagt ? 10 : 5)) : 0;
    const ruck = LEHRER_HUEPFT ? 0 : Math.round(schritt * 3) / 3;   // (Ohne Hüpfen: steif und ruckartig – wie eine Aufziehpuppe)
    // 🦘 Hüpfen: Solange er sich bewegt, ist er in der Luft. Bleibt er stehen, ist er gelandet: WUMM!
    const luft = (m.modus === 'jagen' ? LEHRER_SPRUNG.jagdTakt : LEHRER_SPRUNG.takt) * LEHRER_SPRUNG.inDerLuft;
    if (LEHRER_HUEPFT && m.laeuft) U.hopT = (U.hopT || 0) + 1 / 60;
    else { if (U.hopT > 0.12) monsterSound.lehrerLandet(monsterLautstaerke(m)); U.hopT = 0; }
    const bogen = LEHRER_HUEPFT && U.hopT > 0 ? Math.sin(Math.min(1, U.hopT / luft) * Math.PI) : 0;
    g.position.set(m.x, m.y + Math.abs(ruck) * 0.04 + bogen * LEHRER_SPRUNG.hoehe, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.25 : 0, m.winkel + (m.betaeubt > 0 ? Math.sin(zeit * 8) * 0.4 : 0), 0);
    U.beine[0].rotation.x = ruck * 0.45 - bogen * 0.25; U.beine[1].rotation.x = -ruck * 0.45 - bogen * 0.25;   // Beim Sprung: beide Beine zusammen nach vorne
    U.arme[1].rotation.x = jagt ? -1.4 + Math.sin(zeit * 6) * 0.15 : -0.1 - ruck * 0.2;   // Beim Jagen zeigt er mit dem Stock auf dich!
    U.arme[0].rotation.x = jagt ? -0.5 + Math.sin(zeit * 18) * 0.35 : ruck * 0.3;        // ... und läutet die Glocke
    U.kopf.rotation.z = jagt ? Math.sin(zeit * 3) * 0.08 : Math.sin(zeit * 0.7 + m.phase) > 0.95 ? 0.4 : 0;   // Manchmal legt er den Kopf schief ...
    U.brille.color.set(m.lehrerRuhe > 0 ? '#7a2020' : jagt && Math.sin(zeit * 20) > 0 ? '#ffffff' : '#ff2a2a');
  } else if (m.art === 'jaeger') {
    const schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 11 : 6)) : 0;
    g.position.set(m.x, m.y + Math.abs(schritt) * 0.05, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.25 : 0, m.winkel + (m.betaeubt > 0 ? Math.sin(zeit * 8) * 0.4 : 0), 0);
    g.userData.bein1.rotation.x = schritt * 0.5; g.userData['bein-1'].rotation.x = -schritt * 0.5;
    // Beim Nachladen zeigt die Flinte nach oben, beim Zielen gerade nach vorne
    g.userData.flinte.rotation.x = m.betaeubt > 0 ? 0.9 : m.zielen > 0 ? 0 : m.nachladen > 0 && m.modus === 'jagen' ? -0.7 : 0.35;
    m.blitzZeit -= 1 / 60;
    g.userData.blitz.intensity = m.blitzZeit > 0 ? 25 : 0;
    g.userData.feuer.visible = m.blitzZeit > 0;
    // Roter Ziel-Laser (blinkt schneller, kurz bevor er schießt!)
    const L = g.userData.laser;
    L.visible = m.zielen > 0 && (m.zielen < m.info.zielen * 0.6 || Math.sin(zeit * 40) > 0);
    if (L.visible && m.laserZiel) {
      const ziel = m.laserZiel;
      const pos = L.geometry.attributes.position;
      pos.setXYZ(1, 0, ziel.y + 0.1 - m.y, abstand2D(m.x, m.z, ziel.x, ziel.z));
      pos.needsUpdate = true;
    }
  } else if (m.art === 'chemiker') {
    const U = g.userData, schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 10 : 5)) : 0;
    g.position.set(m.x, m.y + Math.abs(schritt) * 0.04, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.2 : 0, m.winkel + (m.betaeubt > 0 ? Math.sin(zeit * 8) * 0.4 : 0), 0);
    U.beine[0].rotation.x = schritt * 0.5; U.beine[1].rotation.x = -schritt * 0.5;
    // Rechter Arm: beim Ausholen weit nach hinten-oben, sonst schwingt er beim Laufen. Linker Arm: rührt im Labor im Kessel
    const aus = m.zielen > 0 ? Math.min(1, m.zielen / m.info.ausholen) : 0;
    U.arme[1].rotation.x = aus > 0 ? -1.0 - aus * 2.0 : schritt * 0.4;
    U.arme[0].rotation.x = m.modus === 'jagen' ? -0.6 + Math.sin(zeit * 9) * 0.3 : -schritt * 0.4 + (m.laeuft ? 0 : Math.sin(zeit * 3) * 0.3 - 0.4);
    U.flasche.visible = m.nachladen < m.info.nachladen - 0.5 || aus > 0;   // Gleich nach dem Wurf ist die Hand leer
    U.kopf.rotation.z = m.modus === 'jagen' ? Math.sin(zeit * 12) * 0.12 : 0;   // Irres Kopfwackeln
    U.brilleMat.color.set(m.betaeubt > 0 ? '#444' : aus > 0 && Math.sin(zeit * 30) > 0 ? '#ffffff' : '#5dff4a');
  } else if (m.art === 'formwandler') {
    const U = g.userData, glitch = m.modus === 'verwandeln';
    // Welche Form sieht man? Beim Verwandeln flackert es zwischen allen Formen hin und her!
    const form = glitch ? ['bot', 'echt', 'schatz', 'echt'][Math.floor(zeit * 14) % 4]
      : m.modus === 'tarnBot' ? 'bot' : m.modus === 'tarnSchatz' ? 'schatz' : 'echt';
    const tarn = tarnSchatzMesh(U, m.tarnTyp ?? 0);
    for (const t of Object.values(U.tarnSchaetze)) t.visible = form === 'schatz' && t === tarn;
    U.bot.g.visible = form === 'bot'; U.echt.visible = form === 'echt';
    const zucken = glitch ? (Math.random() - 0.5) * 0.15 : 0;
    g.position.set(m.x + zucken, m.y, m.z - zucken);
    g.rotation.set(m.betaeubt > 0 ? 0.25 : 0, m.winkel, glitch ? zucken : 0);
    g.scale.setScalar(glitch ? 1 + Math.sin(zeit * 50) * 0.12 : 1);
    if (form === 'bot') {   // Sieht aus wie ein normaler Helfer ... aber manchmal flackert das Gesicht (X-Augen!)
      const F = U.botGesicht;
      F.kaputt = Math.sin(zeit * 1.7 + m.phase) > 0.985 ? 1 : 0;
      beineAnimieren(U.bot, BEIN_LAENGE, m.laeuft ? m.info.tarnTempo : 0, 1 / 60);
      U.bot.arme.forEach((a, k) => { a.rotation.x = 0.9 + U.bot.armSchwung * (k ? -1 : 1); });
      U.bot.antenne.visible = (zeit * 2) % 1.5 < 1.2;
      U.bot.lampen.forEach((l, k) => { l.visible = (zeit * 3 + k) % 3 > 0.6; });
      U.bot.g.visible = F.kaputt ? Math.random() < 0.5 : true;
      malGesicht(F);
    } else if (form === 'schatz') {   // Ein Schatz ... der ganz selten ein bisschen wackelt
      tarn.rotation.z = Math.sin(zeit * 1.3 + m.phase) > 0.97 ? Math.sin(zeit * 40) * 0.08 : 0;
    } else {
      const schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 13 : 7)) : 0;
      U.beine[0].rotation.x = schritt * 0.6; U.beine[1].rotation.x = -schritt * 0.6;
      U.arme.forEach((a, k) => { a.rotation.x = m.modus === 'jagen' ? -1.2 + Math.sin(m.phase * 9 + k) * 0.4 : -schritt * 0.5; });
      U.echt.position.y = Math.abs(schritt) * 0.05;
    }
  } else if (m.art === 'schrank') {
    const U = g.userData, versteckt = m.modus === 'lauern' || m.modus === 'warnen';
    U.beine += ((versteckt ? 0 : 0.4) - U.beine) * 0.12;   // Beine aus- oder einfahren
    const schritt = m.laeuft ? Math.sin(m.phase * (m.modus === 'jagen' ? 13 : 7)) : 0;
    const ruetteln = m.modus === 'warnen' ? Math.sin(zeit * 60) * 0.035 : 0;
    g.position.set(m.x + ruetteln, m.y + U.beine + Math.abs(schritt) * 0.06, m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.2 : 0, m.winkel, schritt * 0.05 + ruetteln);
    const auf = m.betaeubt > 0 ? 0.25 : m.modus === 'jagen' ? 1.5 + Math.sin(m.phase * 10) * 0.25 : m.modus === 'heimweg' ? 0.35 : m.modus === 'warnen' ? 0.1 + Math.abs(Math.sin(zeit * 25)) * 0.15 : 0;
    U.tuerL.rotation.y += (-auf - U.tuerL.rotation.y) * 0.25;
    U.tuerR.rotation.y += (auf - U.tuerR.rotation.y) * 0.25;
    U.beineG.forEach((b, k) => { b.scale.y = Math.max(0.01, U.beine / 0.4); b.rotation.x = schritt * 0.6 * (k % 2 ? 1 : -1); });
    U.spalt.emissiveIntensity = m.modus === 'lauern' ? 0.35 + Math.sin(zeit * 2 + m.phase) * 0.25 : 1.5;
  } else if (m.art === 'maulwurf') {
    const U = g.userData, unten = m.modus === 'graben' || m.modus === 'jagen';
    const zielH = unten || m.modus === 'abtauchen' ? -2.3 : m.modus === 'auftauchen' ? -1.0 : 0;
    U.hoch += (zielH - U.hoch) * (zielH > U.hoch ? 0.25 : 0.06);   // Schnell raus, langsam wieder rein
    g.position.set(m.x, m.y, m.z);
    g.rotation.set(0, m.winkel, m.betaeubt > 0 ? Math.sin(zeit * 6) * 0.15 : 0);
    U.koerper.position.y = U.hoch + (m.modus === 'auftauchen' ? Math.sin(zeit * 40) * 0.05 : 0);
    U.koerper.visible = U.hoch > -2.1;
    U.huegel.visible = U.hoch < -0.3;   // Der Erdhügel wackelt (bei der Jagd wild!)
    const wackel = m.modus === 'jagen' ? 1 : 0.3;
    U.huegel.scale.set(1 + Math.sin(zeit * 12) * 0.08 * wackel, (m.modus === 'auftauchen' ? 1.6 + Math.sin(zeit * 30) * 0.2 : 1) + Math.sin(m.phase * 8) * 0.1 * wackel, 1);
    const spritzt = m.modus === 'auftauchen' || m.modus === 'abtauchen' || (m.modus === 'oben' && U.hoch < -0.2);   // Erdbrocken fliegen!
    U.brocken.forEach((b, k) => {
      b.visible = spritzt;
      if (spritzt) { const t = (zeit * 1.5 + k * 0.137) % 1; b.position.set(Math.cos(b.userData.w) * t * 1.6, 0.2 + b.userData.v * t - 4.9 * t * t, Math.sin(b.userData.w) * t * 1.6); }
    });
    const krabbelt = m.modus === 'oben' && m.laeuft && m.betaeubt <= 0;
    if (krabbelt) U.koerper.position.y += Math.abs(Math.sin(m.phase * 9)) * 0.08;   // Beim Krabbeln wippt der Körper
    const wild = m.betaeubt > 0 ? 0.2 : m.modus === 'oben' ? 1 : 0.4;
    U.arme.forEach(a => {
      const { s, k, unter } = a.userData;
      if (krabbelt) {   // Krabbeln: Die Arme greifen abwechselnd nach vorne, stemmen sich in den Boden und ziehen ihn weiter (wie eine Spinne!)
        const ph = m.phase * 9 + (k % 2 ? Math.PI : 0) + (s > 0 ? Math.PI : 0);
        a.rotation.z = s * (0.15 + Math.max(0, Math.cos(ph)) * 0.35);   // Arm hochheben
        a.rotation.y = -s * Math.sin(ph) * 0.6;                         // Nach vorne und hinten
        unter.rotation.x = -0.2 + Math.max(0, Math.cos(ph)) * -0.5;
      } else {   // Stehen: Acht Arme fuchteln wild durcheinander
        const ph = zeit * 9 + k * 1.3 + (s > 0 ? 0.7 : 0);
        a.rotation.z = s * (0.3 + Math.sin(ph) * 0.5 * wild); a.rotation.y = Math.cos(ph * 0.8) * 0.4 * wild;
        unter.rotation.x = -0.6 + Math.sin(ph + 1) * 0.8 * wild;
      }
    });
    U.tentakel.forEach((t, k) => t.scale.setScalar(1 + Math.sin(zeit * 20 + k) * 0.25));   // Die Sternnase schnuppert
    U.augeMat.color.set(m.betaeubt > 0 ? '#555' : m.modus === 'oben' ? '#ff1a1a' : '#a33');
  } else if (m.art === 'oma') {
    const U = g.userData, jagt = m.modus === 'jagen', sauer = m.modus === 'grummeln';
    const schritt = m.laeuft ? Math.sin(m.phase * (jagt ? 14 : 5)) : 0;
    const zittern = sauer ? Math.sin(zeit * 45) * 0.02 : 0;
    g.position.set(m.x + zittern, m.y + Math.abs(schritt) * (jagt ? 0.08 : 0.02), m.z);
    g.rotation.set(m.betaeubt > 0 ? 0.25 : 0, m.winkel + (m.betaeubt > 0 ? Math.sin(zeit * 6) * 0.5 : 0), schritt * 0.06);
    U.oben.rotation.x = jagt ? 0.15 : 0.35;   // Wütend steht sie fast gerade!
    U.augeMat.color.set(m.betaeubt > 0 ? '#444' : jagt ? '#ff1a1a' : sauer ? '#ff9a2a' : '#8899aa');
    U.schlag = Math.max(0, U.schlag - 1 / 60);
    let arm;
    if (U.schlag > 0) arm = -2.6 + (1 - U.schlag / 0.45) * 2.0;               // BONK: von hoch oben nach unten
    else if (jagt) arm = -2.4 + Math.sin(m.phase * 12) * 0.5;                   // Stock hoch über dem Kopf, fuchtelt
    else if (sauer) arm = -0.9 + Math.sin(zeit * 18) * 0.35;                    // Droht mit dem Stock
    else arm = -0.15 + schritt * 0.25;                                           // Normal: stützt sich auf den Stock
    U.armR.rotation.x += (arm - U.armR.rotation.x) * (U.schlag > 0 ? 0.6 : 0.25);
    U.armL.rotation.x = -schritt * 0.2;
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
  if (mp.rolle === 'host') mpAnAlle({ t: 'sag', h: helfer.indexOf(h), satz });
  helferSpricht(h, satz);
}
function helferSpricht(h, satz) {
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
  // "oben" = alles über den Beinen. Fahren die Beine aus, wird "oben" hochgeschoben.
  const oben = new THREE.Group(); g.add(oben);
  const teil = (geo, mat, x, y, z, eltern = oben) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; eltern.add(m); return m; };
  // Teleskop-Beine: Hüfte (Gelenk) -> Hülse -> silberne Kolbenstange -> Fuß
  const beine = [];
  for (const s of [-1, 1]) {
    const huefte = new THREE.Group(); g.add(huefte);
    teil(new THREE.SphereGeometry(0.07, 10, 8), dunkel, 0, 0, 0, huefte);                       // Hüftgelenk
    teil(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), lack, 0, -0.07, 0, huefte);           // Hülse
    teil(new THREE.TorusGeometry(0.06, 0.012, 6, 14), leucht, 0, -0.14, 0, huefte).rotation.x = Math.PI / 2;   // Leuchtring
    const kolben = teil(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), metallGrauMat, 0, -0.5, 0, huefte);  // Wird je nach Länge gestreckt
    const fuss = new THREE.Group(); g.add(fuss);
    teil(new THREE.BoxGeometry(0.15, 0.07, 0.28), schwarzMat, 0, 0.035, 0.03, fuss);
    teil(new THREE.BoxGeometry(0.15, 0.03, 0.08), lack, 0, 0.08, 0.13, fuss);                    // Zehenkappe
    teil(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 10), metallGrauMat, 0, 0.035, -0.1, fuss).rotation.z = Math.PI / 2;   // Ferse/Rad
    beine.push({ s, huefte, kolben, fuss });
  }
  const b = BOT_BAUCH;   // (Wie dick der Bauch ist – alles am Bauch wird damit mal genommen)
  teil(new THREE.BoxGeometry(Math.max(0.3, 0.4 * b), 0.14, 0.5 * b), dunkel, 0, 0.2, 0);          // Fahrgestell
  // Körper mit Brustplatte, Lämpchen und Akku hinten
  teil(new THREE.BoxGeometry(0.46 * b, 0.38, 0.36 * b), lack, 0, 0.47, 0);
  teil(new THREE.BoxGeometry(0.3 * b, 0.2, 0.02), dunkel, 0, 0.5, 0.18 * b + 0.005);
  const lampen = ['#4ade80', '#ffd166', '#ff6b6b'].map((c, k) => teil(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: c }), (-0.07 + k * 0.07) * b, 0.55, 0.18 * b + 0.015));
  teil(new THREE.BoxGeometry(0.46 * b + 0.01, 0.04, 0.36 * b + 0.01), blech, 0, 0.3, 0);          // Streifen unten
  teil(new THREE.BoxGeometry(0.3 * b, 0.26, 0.1), dunkel, 0, 0.5, -0.18 * b - 0.05);              // Akku
  teil(new THREE.BoxGeometry(0.22 * b, 0.03, 0.01), leucht, 0, 0.55, -0.18 * b - 0.102);
  // Arme mit Ellbogen und Greifzange
  const arme = [];
  for (const s of [-1, 1]) {
    teil(new THREE.SphereGeometry(0.06, 10, 8), blech, s * (0.23 * b + 0.04), 0.6, 0);         // Schulter (direkt am Bauch)
    const arm = new THREE.Group(); arm.position.set(s * (0.23 * b + 0.06), 0.6, 0); oben.add(arm);
    teil(new THREE.BoxGeometry(0.06, 0.06, 0.2), blech, 0, 0, 0.1, arm);                        // Oberarm
    teil(new THREE.SphereGeometry(0.04, 8, 6), dunkel, 0, 0, 0.21, arm);                        // Ellbogen
    teil(new THREE.BoxGeometry(0.05, 0.05, 0.16), lack, 0, -0.02, 0.29, arm);                   // Unterarm
    for (const f of [-1, 1]) teil(new THREE.BoxGeometry(0.015, 0.05, 0.08), dunkel, f * 0.02, -0.02, 0.39, arm).rotation.y = f * 0.4;   // Zange
    arme.push(arm);
  }
  // Kopf mit Bildschirm-Gesicht, Ohren und Antenne
  teil(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), dunkel, 0, 0.7, 0);                     // Hals
  const kopf = new THREE.Group(); kopf.position.set(0, 0.88, 0); oben.add(kopf);
  teil(new THREE.BoxGeometry(0.42, 0.28, 0.32), blech, 0, 0, 0, kopf);
  teil(new THREE.BoxGeometry(0.44, 0.04, 0.34), lack, 0, 0.14, 0, kopf);
  const gesichtCanvas = document.createElement('canvas'); gesichtCanvas.width = 128; gesichtCanvas.height = 64;
  const gesichtTex = new THREE.CanvasTexture(gesichtCanvas); gesichtTex.colorSpace = THREE.SRGBColorSpace;
  teil(new THREE.PlaneGeometry(0.34, 0.19), new THREE.MeshBasicMaterial({ map: gesichtTex }), 0, -0.01, 0.161, kopf);
  for (const s of [-1, 1]) teil(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 14), lack, s * 0.23, 0, 0, kopf).rotation.z = Math.PI / 2;   // Ohren
  teil(new THREE.CylinderGeometry(0.008, 0.008, 0.2), blech, 0.1, 0.24, 0, kopf);               // Antenne
  const antenne = teil(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: info.farbe }), 0.1, 0.35, 0, kopf);
  // Kopflampe 🔦 (oben auf der Stirn) mit sichtbarem Lichtstrahl
  const lampenHalter = new THREE.Group(); lampenHalter.position.set(-0.08, 0.2, 0.1); kopf.add(lampenHalter);
  teil(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12), dunkel, 0, 0, -0.03, lampenHalter).rotation.x = Math.PI / 2;
  const linse = teil(new THREE.CircleGeometry(0.042, 14), new THREE.MeshBasicMaterial({ color: '#fff6d0' }), 0, 0, 0.012, lampenHalter);
  const kegel = new THREE.Mesh(KEGEL_GEO, new THREE.MeshBasicMaterial({ color: '#fff3d6', alphaMap: KEGEL_TEX, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  kegel.position.z = 0.012; kegel.scale.setScalar(LICHTKEGEL_LAENGE); kegel.visible = ANDERE_LAMPEN;
  kegel.raycast = () => {};   // Licht kann man nicht anfassen (der Greifstrahl geht durch)
  lampenHalter.add(kegel);
  const lampe = { halter: lampenHalter, linse, kegel, laenge: LICHTKEGEL_LAENGE, pruef: Math.random() * 6 };
  // Namensschild und Sprechblase
  const schild = namensSchild(`🤖 ${info.name}`, info.farbe);
  schild.position.y = 1.35; oben.add(schild);
  const blasenCanvas = document.createElement('canvas'); blasenCanvas.width = 512; blasenCanvas.height = 128;
  const blasenTex = new THREE.CanvasTexture(blasenCanvas); blasenTex.colorSpace = THREE.SRGBColorSpace;
  const blase = new THREE.Sprite(new THREE.SpriteMaterial({ map: blasenTex, transparent: true, depthWrite: false }));
  blase.scale.set(2.0, 0.5, 1); blase.position.y = 1.75; blase.visible = false; oben.add(blase);
  szene.add(g);
  const T = { g, oben, schild, beine, ausgefahren: BEIN_LAENGE, schrittPhase: Math.random() * 6, kopf, arme, antenne, lampen, lampe, blase, gesicht: { g: gesichtCanvas.getContext('2d'), tex: gesichtTex, alt: '' }, blasenG: blasenCanvas.getContext('2d'), blasenTex };
  if (info.hut || info.extra) lookAnbauen(T, info);   // 🎩 Hut und Extras drauf
  beineAnimieren(T, BEIN_LAENGE, false, 0);
  return T;
}
// 🎩🕶️ Hüte und Extras an einen Roboter bauen (Kopf: oben bei y = 0.16, vorne ist +z)
function lookAnbauen(T, info) {
  const mat = (farbe, extra = {}) => new THREE.MeshStandardMaterial({ color: farbe, roughness: 0.6, ...extra });
  const teil = (geo, m, x, y, z, eltern) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; eltern.add(k); return k; };
  const halbKugel = (r) => new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const K = new THREE.Group(), O = T.oben, b = BOT_BAUCH, oben = 0.16;   // K = der Hut (eigene Gruppe – beim Ducken wird er zusammengedrückt)
  T.kopf.add(K); T.hut = K;
  let hoch = 0;   // Wie hoch der Hut ist (dann muss das Namensschild höher)
  const gold = mat('#e8b923', { metalness: 0.8, roughness: 0.3, emissive: '#3a2a05' });
  switch (info.hut) {
    case 'cap': {
      const rot = mat('#e03131');
      teil(halbKugel(0.2), rot, 0, oben, -0.01, K).scale.set(1.1, 0.6, 0.85);
      teil(new THREE.BoxGeometry(0.32, 0.015, 0.17), mat('#f8f9fa'), 0, oben + 0.01, 0.22, K);
      teil(new THREE.SphereGeometry(0.02, 8, 6), mat('#f8f9fa'), 0, oben + 0.12, -0.01, K);
      hoch = 0.14; break;
    }
    case 'zylinder': {
      const schwarz = mat('#15161a');
      teil(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 24), schwarz, 0, oben + 0.01, 0, K);
      teil(new THREE.CylinderGeometry(0.15, 0.15, 0.32, 24), schwarz, 0, oben + 0.17, 0, K);
      teil(new THREE.CylinderGeometry(0.153, 0.153, 0.05, 24), mat('#c92a2a'), 0, oben + 0.05, 0, K);
      hoch = 0.34; break;
    }
    case 'krone': {
      teil(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 20, 1, true), gold, 0, oben + 0.05, 0, K).material.side = THREE.DoubleSide;
      for (let k = 0; k < 6; k++) { const w = k / 6 * Math.PI * 2; teil(new THREE.ConeGeometry(0.035, 0.1, 6), gold, Math.sin(w) * 0.17, oben + 0.14, Math.cos(w) * 0.17, K); }
      ['#ff2a4a', '#3b82f6', '#22c55e'].forEach((c, k) => { const w = (k - 1) * 0.7; teil(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: c }), Math.sin(w) * 0.172, oben + 0.05, Math.cos(w) * 0.172, K); });
      hoch = 0.2; break;
    }
    case 'party': {
      const huetchen = new THREE.Group(); huetchen.position.set(0.04, oben, 0); huetchen.rotation.z = -0.2; K.add(huetchen);
      const streifen = malTextur(64, 64, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffd43b' : '#f06595'; g.fillRect(0, k * 8, 64, 8); } }, false);
      teil(new THREE.ConeGeometry(0.12, 0.34, 18), new THREE.MeshStandardMaterial({ map: streifen }), 0, 0.17, 0, huetchen);
      teil(new THREE.SphereGeometry(0.04, 10, 8), mat('#4dabf7'), 0, 0.35, 0, huetchen);
      hoch = 0.38; break;
    }
    case 'cowboy': {
      const braun = mat('#8b5a2b');
      const krempe = teil(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 28), braun, 0, oben + 0.02, 0, K); krempe.scale.set(1, 1, 0.85);
      teil(new THREE.CylinderGeometry(0.15, 0.18, 0.17, 20), braun, 0, oben + 0.1, 0, K);
      teil(new THREE.CylinderGeometry(0.182, 0.182, 0.04, 20), mat('#3b2412'), 0, oben + 0.05, 0, K);
      hoch = 0.2; break;
    }
    case 'propeller': {
      const kappe = new THREE.Group(); kappe.position.y = oben; K.add(kappe);
      ['#e03131', '#ffd43b', '#4dabf7', '#40c057'].forEach((c, k) => teil(new THREE.SphereGeometry(0.2, 8, 8, k * Math.PI / 2, Math.PI / 2, 0, Math.PI / 2), mat(c), 0, 0, 0, kappe).scale.set(1.1, 0.6, 0.9));
      teil(new THREE.CylinderGeometry(0.012, 0.012, 0.08), mat('#adb5bd'), 0, 0.15, 0, kappe);
      const prop = new THREE.Group(); prop.position.y = 0.19; kappe.add(prop);
      teil(new THREE.BoxGeometry(0.4, 0.012, 0.06), mat('#e03131'), 0, 0, 0, prop).rotation.x = 0.25;
      teil(new THREE.BoxGeometry(0.06, 0.012, 0.4), mat('#4dabf7'), 0, 0, 0, prop).rotation.z = 0.25;
      T.propeller = prop;
      hoch = 0.22; break;
    }
    case 'helm': {
      const gelb = mat('#fcc419', { roughness: 0.35 });
      teil(halbKugel(0.22), gelb, 0, oben - 0.03, 0, K).scale.set(1.05, 0.75, 0.95);
      teil(new THREE.CylinderGeometry(0.26, 0.26, 0.015, 24), gelb, 0, oben - 0.01, 0.02, K).scale.set(1, 1, 1.05);
      teil(new THREE.BoxGeometry(0.04, 0.03, 0.4), gelb, 0, oben + 0.13, 0, K);
      hoch = 0.15; break;
    }
    case 'zauberer': {
      const blau = mat('#2b2d8f');
      teil(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), blau, 0, oben + 0.01, 0, K);
      const spitze = new THREE.Group(); spitze.position.y = oben; K.add(spitze);
      teil(new THREE.ConeGeometry(0.17, 0.55, 20), blau, 0, 0.27, 0, spitze);
      spitze.children[0].rotation.z = 0.15;
      const stern = new THREE.MeshBasicMaterial({ color: '#ffe066' });
      for (const [x, y, z] of [[0.08, 0.15, 0.12], [-0.07, 0.28, 0.09], [0.02, 0.4, 0.06], [-0.1, 0.1, -0.1]]) teil(new THREE.OctahedronGeometry(0.025), stern, x, y, z, spitze);
      hoch = 0.56; break;
    }
    case 'wikinger': {
      teil(halbKugel(0.21), mat('#868e96', { metalness: 0.7, roughness: 0.35 }), 0, oben - 0.03, 0, K).scale.set(1.05, 0.8, 0.95);
      teil(new THREE.CylinderGeometry(0.222, 0.222, 0.04, 22), mat('#8b5a2b'), 0, oben - 0.01, 0, K);
      for (const sx of [-1, 1]) {
        const horn = teil(new THREE.ConeGeometry(0.045, 0.24, 12), mat('#f1e3c0'), sx * 0.24, oben + 0.1, 0, K);
        horn.rotation.z = -sx * 0.9;
      }
      hoch = 0.2; break;
    }
    case 'koch': {
      const weiss = mat('#ffffff', { roughness: 0.9 });
      teil(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 20), weiss, 0, oben + 0.08, 0, K);
      for (const [x, z] of [[0, 0], [0.08, 0.06], [-0.08, 0.06], [0.08, -0.06], [-0.08, -0.06]]) teil(new THREE.SphereGeometry(0.11, 12, 10), weiss, x, oben + 0.22, z, K);
      hoch = 0.33; break;
    }
    case 'pirat': {
      const schwarz = mat('#1a1a1f');
      teil(new THREE.CylinderGeometry(0.18, 0.21, 0.1, 20), schwarz, 0, oben + 0.05, 0, K);
      const segel = teil(new THREE.CircleGeometry(0.27, 20, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#1a1a1f', side: THREE.DoubleSide }), 0, oben + 0.02, 0.03, K);
      segel.scale.y = 0.75;
      const schaedel = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      teil(new THREE.SphereGeometry(0.035, 10, 8), schaedel, 0, oben + 0.1, 0.035, K);
      for (const w of [0.7, -0.7]) teil(new THREE.BoxGeometry(0.1, 0.012, 0.005), schaedel, 0, oben + 0.05, 0.036, K).rotation.z = w;
      hoch = 0.22; break;
    }
    case 'blumen': {
      const farben = ['#ff6b9d', '#ffd43b', '#b388ff', '#ffffff', '#ff8a65', '#4dabf7'];
      for (let k = 0; k < 10; k++) {
        const w = k / 10 * Math.PI * 2, x = Math.sin(w) * 0.2, z = Math.cos(w) * 0.16;
        teil(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: farben[k % farben.length], roughness: 0.8 }), x, oben + 0.01, z, K).scale.y = 0.6;
        teil(new THREE.SphereGeometry(0.015, 6, 5), new THREE.MeshBasicMaterial({ color: '#f59f00' }), x, oben + 0.035, z, K);
      }
      hoch = 0.06; break;
    }
    case 'ohren': {
      const weiss = mat('#f8f9fa', { roughness: 0.9 }), rosa = mat('#ffa8c5', { roughness: 0.9 });
      for (const sx of [-1, 1]) {
        const ohr = new THREE.Group(); ohr.position.set(sx * 0.1, oben, 0); ohr.rotation.z = -sx * 0.2; K.add(ohr);
        teil(new THREE.SphereGeometry(0.06, 12, 10), weiss, 0, 0.17, 0, ohr).scale.set(0.8, 3, 0.4);
        teil(new THREE.SphereGeometry(0.04, 10, 8), rosa, 0, 0.17, 0.012, ohr).scale.set(0.7, 3, 0.3);
      }
      hoch = 0.36; break;
    }
  }
  switch (info.extra) {
    case 'brille': {
      const glas = new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.9, roughness: 0.1 });
      for (const sx of [-1, 1]) teil(new THREE.BoxGeometry(0.12, 0.07, 0.012), glas, sx * 0.08, 0.025, 0.172, T.kopf);
      teil(new THREE.BoxGeometry(0.06, 0.015, 0.012), glas, 0, 0.045, 0.172, T.kopf);
      for (const sx of [-1, 1]) teil(new THREE.BoxGeometry(0.012, 0.015, 0.16), glas, sx * 0.205, 0.045, 0.09, T.kopf);
      break;
    }
    case 'bart': {
      const braun = mat('#5c3b1e', { roughness: 0.9 });
      for (const sx of [-1, 1]) { const h = teil(new THREE.SphereGeometry(0.05, 10, 8), braun, sx * 0.045, -0.055, 0.17, T.kopf); h.scale.set(1.3, 0.45, 0.4); h.rotation.z = sx * 0.3; }
      break;
    }
    case 'fliege': {
      const rot = mat('#e03131');
      for (const sx of [-1, 1]) teil(new THREE.ConeGeometry(0.04, 0.08, 4), rot, sx * 0.045, 0.7, 0.07, O).rotation.z = sx * Math.PI / 2;
      teil(new THREE.SphereGeometry(0.022, 8, 6), rot, 0, 0.7, 0.075, O);
      break;
    }
    case 'schal': {
      const streifen = malTextur(64, 16, (g) => { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#e03131'; g.fillRect(k * 8, 0, 8, 16); } }, false);
      const sm = new THREE.MeshStandardMaterial({ map: streifen, roughness: 0.9 });
      teil(new THREE.TorusGeometry(0.075, 0.032, 8, 18), sm, 0, 0.69, 0, O).rotation.x = Math.PI / 2;
      const ende = teil(new THREE.BoxGeometry(0.06, 0.22, 0.02), sm, 0.05, 0.58, 0.1 + 0.18 * b * 0.3, O); ende.rotation.z = 0.15;
      break;
    }
    case 'umhang': {
      const umhang = teil(new THREE.PlaneGeometry(0.5, 0.62), new THREE.MeshStandardMaterial({ color: '#c92a2a', side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.38, -0.18 * b - 0.12, O);
      umhang.rotation.x = 0.12; T.umhang = umhang;
      break;
    }
    case 'jetpack': {
      const silber = mat('#ced4da', { metalness: 0.8, roughness: 0.3 }), z = -0.18 * b - 0.15;
      const flamme = new THREE.MeshBasicMaterial({ color: '#ff922b', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      T.flammen = [];
      for (const sx of [-1, 1]) {
        teil(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 14), silber, sx * 0.075, 0.52, z, O);
        teil(new THREE.ConeGeometry(0.06, 0.08, 14), mat('#e03131'), sx * 0.075, 0.72, z, O);
        const f = teil(new THREE.ConeGeometry(0.045, 0.16, 10), flamme, sx * 0.075, 0.28, z, O); f.rotation.x = Math.PI; f.castShadow = false;
        T.flammen.push(f);
      }
      break;
    }
  }
  if (T.schild) T.schild.position.y = 1.35 + hoch;   // Das Namensschild über den Hut schieben
}
// 🐭 Geduckt: Der Roboter schiebt sich zusammen wie eine Ziehharmonika – Kopf in den Körper, Hut platt –
// damit er (bei den anderen!) ganz durchs Mauseloch passt und nicht halb in der Wand steckt
const DUCK_KOPF_RUNTER = 0.3;   // So weit zieht sich der Kopf in den Körper ein
const DUCK_KLEINER = 0.75;      // So klein wird der Oberkörper (1 = gar nicht)
function duckForm(T, geduckt, dt) {
  T.duck = (T.duck || 0) + ((geduckt ? 1 : 0) - (T.duck || 0)) * Math.min(1, dt * 10);
  const d = T.duck;
  T.oben.scale.y = 1 - (1 - DUCK_KLEINER) * d;
  T.kopf.position.y = 0.88 - DUCK_KOPF_RUNTER * d;
  T.kopf.scale.y = 1 - 0.5 * d;
  if (T.hut) T.hut.scale.y = 1 - 0.6 * d;
  if (T.schild) T.schild.scale.y = 0.225 / T.oben.scale.y;   // (Das Namensschild soll nicht platt werden)
}
function lookAnimieren(T, dt) {   // Propeller drehen, Flammen flackern, Umhang wehen
  if (T.propeller) T.propeller.rotation.y += dt * 14;
  if (T.flammen) T.flammen.forEach((f, k) => { f.scale.y = 0.7 + Math.random() * 0.6; f.scale.x = f.scale.z = 0.85 + Math.sin(zeit * 30 + k) * 0.15; });
  if (T.umhang) T.umhang.rotation.x = 0.15 + Math.sin(zeit * 3) * 0.06 + (T.armSchwung ? Math.abs(T.armSchwung) * 0.4 : 0);
}
// Beine bewegen: ziel = wie weit ausgefahren (0 = ganz eingefahren, z. B. beim Ducken)
// laeuft: true = Schritte machen (wie schnell, misst der Roboter selbst) · eine Zahl = so schnell läuft er (Meter pro Sekunde) · false = steht
// Die Schritte passen zum Tempo: Die Füße bleiben auf dem Boden stehen, statt zu rutschen (wie bei echten Beinen!)
const SCHRITT_WEITE = 0.12;    // So weit gehen die Füße nach vorne und hinten (wird beim Rennen größer)
const SCHRITT_HOCH = 0.07;     // So hoch heben die Füße ab
function beineAnimieren(T, ziel, laeuft, dt) {
  // Wie viel Zeit ist seit dem letzten Bild vergangen? (Echte Zeit – dann passt es auch bei schnellen Bildschirmen)
  const t = T.letzteZeit === undefined ? 0 : begrenzt(zeit - T.letzteZeit, 0, 0.1);
  T.letzteZeit = zeit;
  if (dt === 0) T.tempo = T.gang = 0;
  // Wie schnell bewegt sich der Roboter wirklich? (Selbst gemessen)
  const pos = T.g.position;
  if (T.altX === undefined) { T.altX = pos.x; T.altZ = pos.z; }
  const gemessen = t > 0 ? Math.min(8, Math.hypot(pos.x - T.altX, pos.z - T.altZ) / t) : 0;
  T.altX = pos.x; T.altZ = pos.z;
  const ist = typeof laeuft === 'number' ? laeuft : laeuft ? gemessen : 0;
  T.tempo = (T.tempo || 0) + (ist - (T.tempo || 0)) * Math.min(1, t * 10);
  // gang: 0 = steht still, 1 = läuft richtig (weich überblenden, damit die Beine nicht springen)
  T.gang = (T.gang || 0) + ((ist > 0.15 ? Math.min(1, T.tempo / 1.2 + 0.25) : 0) - (T.gang || 0)) * Math.min(1, t * 8);
  T.ausgefahren += (ziel - T.ausgefahren) * Math.min(1, t * 10 || 1);   // Weich ein- und ausfahren (zischhh!)
  const hoch = T.ausgefahren, beinAnteil = Math.min(1, hoch / 0.15);
  // Größere Schritte, wenn er schneller ist – und die Schrittfrequenz passt genau dazu
  const weite = (SCHRITT_WEITE + Math.min(0.13, T.tempo * 0.035)) * beinAnteil;
  // Ein ganzer Schritt-Kreis = Fuß einmal ganz nach hinten (am Boden) und wieder nach vorne (in der Luft)
  if (T.gang > 0.01) T.schrittPhase += Math.PI * 2 * Math.min(3.6, Math.max(T.tempo, 0.6) / Math.max(0.05, 4 * weite)) * t;
  const ph = T.schrittPhase, g = T.gang;
  // Körper: hüpft bei jedem Schritt ein bisschen hoch, wackelt zur Seite und lehnt sich beim Rennen nach vorne
  const huepf = (0.5 - 0.5 * Math.cos(ph * 2)) * 0.035 * g * beinAnteil;
  T.oben.position.y = hoch + huepf;
  T.oben.rotation.z = Math.sin(ph) * 0.045 * g;
  T.oben.rotation.x = Math.min(0.12, T.tempo * 0.02) * g;
  if (T.kopf) T.kopf.rotation.z = -Math.sin(ph) * 0.03 * g;   // Kopf bleibt ruhiger (gleicht aus)
  T.armSchwung = Math.sin(ph) * 0.35 * g;   // Für die Arme: gegengleich zu den Beinen schwingen
  for (const b of T.beine) {
    const huefteY = hoch + 0.15 + huepf;
    // u = wo im Schritt der Fuß gerade ist (0 bis 1). Das zweite Bein ist genau einen halben Schritt versetzt.
    const u = ((ph / (Math.PI * 2) + (b.s > 0 ? 0.5 : 0)) % 1 + 1) % 1;
    let schritt, heben, kipp;
    if (u < 0.5) {   // Am Boden: Der Fuß steht still, der Roboter läuft über ihn drüber (darum wandert er gleichmäßig nach hinten)
      schritt = weite * (1 - 4 * u); heben = 0; kipp = u > 0.4 ? (u - 0.4) * 4 : 0;   // Am Ende: Ferse hoch zum Abdrücken
    } else {         // In der Luft: Fuß hochheben und nach vorne schwingen
      const w = (u - 0.5) / 0.5;
      schritt = -weite * Math.cos(Math.PI * w); heben = Math.sin(Math.PI * w) * SCHRITT_HOCH * beinAnteil; kipp = 0.4 - w * 0.8;
    }
    schritt *= g; heben *= g;
    b.fuss.position.set(b.s * 0.17, heben, schritt);
    b.fuss.rotation.x = kipp * 0.5 * g;
    b.huefte.position.set(b.s * 0.17, huefteY, 0);
    // Die Kolbenstange geht von der Hüfte bis zum Fuß (schräg, wenn der Fuß vorne oder hinten ist)
    const dy = huefteY - (heben + 0.07), dz = schritt;
    const laenge = Math.max(0.01, Math.hypot(dy, dz));
    b.huefte.rotation.x = -Math.atan2(dz, dy);
    b.kolben.scale.y = laenge;
    b.kolben.position.y = -laenge / 2;
  }
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
// 📸 Ein Helfer blitzt ein Monster an, das gerade jagt und nah genug ist
function helferBlitzPruefen(h, dt) {
  if (h.blitzLadung === undefined) h.blitzLadung = Math.random();   // Nicht alle Helfer gleichzeitig voll
  h.blitzLadung = Math.min(1, h.blitzLadung + dt / HELFER_BLITZ_LADEN);
  if (h.blitzLadung < 1) return;
  h.blitzSuchen = (h.blitzSuchen || 0) - dt;
  if (h.blitzSuchen > 0) return;
  h.blitzSuchen = 0.25;   // Nur 4 Mal pro Sekunde umschauen (spart Rechenzeit)
  const p = h.body.position;
  const von = new THREE.Vector3(p.x, p.y + 0.35 + h.teile.ausgefahren + 0.5, p.z);   // Ungefähr die Kopflampe
  let bestes = null, bestD = HELFER_BLITZ_WEITE;
  for (const m of monster) {
    if (m.betaeubt > 0 || !m.info.betaeubbar) continue;
    if (m.art === 'maulwurf' && m.modus !== 'oben') continue;   // Unter der Erde sieht er den Blitz nicht
    const gefaehrlich = m.modus === 'jagen' || m.modus === 'oben' || m.modus === 'verwandeln' || m.zielen > 0;
    if (!gefaehrlich) continue;
    const d = abstand3D({ x: m.x, y: m.y + 1, z: m.z }, von);
    if (d > bestD) continue;
    if (!freieSicht(von.clone(), new THREE.Vector3(m.x, m.y + 1.2, m.z))) continue;
    bestes = m; bestD = d;
  }
  if (!bestes) return;
  // Zum Monster drehen und PFFT!
  h.blitzLadung = 0;
  h.winkel = Math.atan2(bestes.x - p.x, bestes.z - p.z);
  const richtung = new THREE.Vector3(bestes.x, bestes.y + 1.2, bestes.z).sub(von).normalize();
  blitzVon(von, richtung, false);
  helferBlitzEffekt(h);
  if (mp.rolle === 'host') mpAnAlle({ t: 'blitzSicht', h: helfer.indexOf(h) });
  sagen(h, 'blitz', { name: bestes.info.name }, 2);
  if (abstand3D(p, spielerKoerper.position) < 15) zeigeNachricht(`📸 ${h.name} blitzt: ${bestes.info.emoji} ${bestes.info.name} ist geblendet!`, 2, '#ffd166');
}
function helferBlitzEffekt(h) {   // Die Lampe blitzt hell auf (das sehen alle)
  h.blitzHell = 1;
  sound.blitz(lautBei(h.body.position) * 0.8);
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
  if (abstand3D(p, spielerKoerper.position) < 15) zeigeNachricht(`${info.emoji} Der ${info.name} hat ${h.name} erwischt!`, 2, '#ffb347');
  if (HELFER_KOPF) {   // 💀 Kopf ab! Der Körper bleibt kopflos liegen, der Kopf muss zur Abgabe
    h.kaputt = 1e9;   // (So lange, bis jemand den Kopf abgibt)
    const kopf = neuerKopf(helferKopfId(h), h.farbe, p.x, p.y + 0.6, p.z);
    kopf.body.velocity.set(zufall(-2, 2), 4, zufall(-2, 2));   // Plopp – der Kopf fliegt ein Stück weg
    const t = `💀 ${h.name} hat seinen Kopf verloren! Bringt ihn zur Abgabe 🚚 (${euro(HELFER_WIEDERBELEBEN_PREIS)})`;
    zeigeNachricht(t, 4, '#ff6b6b'); if (mp.rolle === 'host') mpAnAlle({ t: 'info', text: t, farbe: '#ff6b6b' });
    return;
  }
  if (HELFER_SOFORT_ZURUECK) { helferAmStart(h); return; }
  sagen(h, 'kaputt', {}, 2);
}
const helferKopfId = h => `helfer-${helfer.indexOf(h)}`;   // So heißt der Besitzer vom Kopf eines Helfers
const istHelferKopf = s => String(s.besitzer).startsWith('helfer-');
function helferAmStart(h) {   // Zack – zurück am Start! (neben der Abgabe, jeder Helfer an seinem Platz)
  const k = Math.max(0, helfer.indexOf(h));
  h.kaputt = 0; h.leben = HELFER_LEBEN; h.heilZeit = HELFER_HEILEN; h.wackelt = 0; h.angst = 0; h.tw = null;
  h.body.position.set(haus.spawn.x + 1.5, 0.5, haus.spawn.z - 1.5 + k * 1.5);   // Vor der Bustür
  h.body.velocity.set(0, 0, 0);
  const p = h.body.position;
  schwebeText(p.x, p.y + 1.2, p.z, `🔧 ${h.name} ist zurück am Start!`, h.farbe);
  sagen(h, 'neustart', {}, 2);
}
// Welcher Schatz lohnt sich? (wertvoll und nah – ein anderes Stockwerk ist "weiter weg")
function waehleSchatz(h) {
  const p = h.body.position;
  let bester = null, punkte = 0;
  for (const s of schaetze) {
    if (s.kaputt || s.reserviert || s.getragenVon || gegriffen === s || s.gastHaelt || imLaster(s)) continue;
    const sp = s.body.position;
    if (sp.y - (etageVon(sp.y) * ETAGE_HOEHE) > 1.6) continue;   // Zu hoch (z. B. auf einem Schrank)
    const wertung = (s.typ.id === 'kopf' ? 5000 : s.wert) / (abstand3D(p, sp) * 1.5 + 8);   // Köpfe von kaputten Freunden zuerst!
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
  // Kommt ein Monster? Blitzen! 📸
  if (HELFER_BLITZ) helferBlitzPruefen(h, dt);
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
  else if (h.modus === 'tragen') {   // Zur Abgabe – immer von der offenen Seite rein (sonst bleibt der Schatz am grünen Rand hängen)
    const mz = (L.z1 + L.z2) / 2;
    ziel = p.x > L.x2 + 0.2 && Math.abs(p.z - mz) > 1.0 ? { x: L.x2 + 1.2, y: 0, z: mz } : { x: (L.x1 + L.x2) / 2 + 0.3, y: 0, z: mz };
  }
  else {   // Nichts zu tun: am Transporter warten (und sich ein bisschen langweilen)
    ziel = { x: L.x2 + 1.5, y: 0, z: (L.z1 + L.z2) / 2 + (h === helfer[0] ? -3 : 3) };   // (Draußen neben der Abgabe)
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
    if (h.auftrag.typ.id === 'kopf') helferSpricht(h, 'Kopf abgeliefert! Halt durch, Kollege! 🔧'); else sagen(h, 'abgeliefert', { wert: euro(h.auftrag.wert) }, 1);
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
  // 🕳️ Nicht ins Bodenloch fahren! (Außer der Schatz liegt genau da drin)
  const bl = !h.tw && bodenLochBei(p.x + dx * 0.8, p.z + dz * 0.8, p.y - 0.35, 0.35);
  if (bl && !bodenLochBei(ziel.x, ziel.z, ziel.y, 0.3)) {
    let ax = p.x - (bl.x1 + bl.x2) / 2, az = p.z - (bl.z1 + bl.z2) / 2;
    const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
    const seite = -az * dx + ax * dz >= 0 ? 1 : -1;   // Links oder rechts herum – wie es näher ist
    dx = -az * seite * 0.85 + ax * 0.5; dz = ax * seite * 0.85 + az * 0.5;
  }
  // 🚪 Zue Tür vor der Nase? Aufmachen!
  if (tempo > 0) { const tu = geschlosseneTuer(p.x, p.z, p.y - 0.35, 1.5); if (tu) tuerSetzen(tu, true, 'helfer'); }
  // In die Grube gefallen? Hopp, rausspringen!
  if (p.y < -0.1 && p.y > -1.5 && Math.abs(v.y) < 0.3 && !bodenLochBei(ziel.x, ziel.z, 0, 0.3)) v.y = 5.5;
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
  const faehrt = mp.rolle === 'gast' ? h.zx !== undefined && Math.hypot(h.zx - p.x, h.zz - p.z) > 0.05 : Math.hypot(h.body.velocity.x, h.body.velocity.z) > 0.3;
  beineAnimieren(T, h.kaputt > 0 ? 0 : BEIN_LAENGE, faehrt && h.kaputt <= 0, 1 / 60);   // Kaputt: Beine fahren ein
  T.arme.forEach((a, k) => { a.rotation.order = 'YXZ'; a.rotation.set(h.modus === 'tragen' && k === 1 ? -0.5 : 0.9 + T.armSchwung * (k ? -1 : 1), 0, 0); });
  if (h.modus === 'tragen' && h.kaputt <= 0 && h.auftrag) armZielt(T, T.arme[0], h.auftrag.body.position);   // Der Greifarm zielt auf den Schatz
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
  T.kopf.visible = !(h.kaputt > 1000);   // 💀 Kopf ab (der liegt woanders ...)
  T.lampen.forEach((l, k) => { l.visible = h.kaputt > 0 ? false : (zeit * 3 + k) % 3 > 0.6; });
  T.blase.visible = h.blasenZeit > 0;
  malGesicht(h);
  // Greifstrahl aus der Zange
  if (h.modus === 'tragen' && h.kaputt <= 0 && h.auftrag) {   // ⚡ Der Strahl kommt aus der Zange vom Greifarm
    const von = T.arme[0].localToWorld(new THREE.Vector3(0, -0.02, 0.42));
    const nach = new THREE.Vector3().copy(h.auftrag.body.position);
    const richtung = new THREE.Vector3(0, 0, 1).transformDirection(T.arme[0].matrixWorld);
    zeigeStrahl(h.strahl, von, nach, richtung, Math.max(...h.auftrag.typ.groesse) * 0.6);
  } else h.strahl.g.visible = false;
  // Kopflampe (Helfer schauen ein bisschen nach unten auf den Boden)
  h.blitzHell = Math.max(0, (h.blitzHell || 0) - 3 / 60);
  kopflampeZeigen(T, h.kaputt <= 0, -0.15, h.blitzHell);
  T.g.visible = introZeit < 0;   // (Im Intro sitzen sie schon im Bus – der kommt aber erst angefahren)
}
// 🔦 Kopflampe von einem Roboter: an/aus, nach oben/unten drehen, bei einer Wand kürzer machen, beim Blitzen hell
const lampenPos = new THREE.Vector3(), lampenRicht = new THREE.Vector3();
function kopflampeZeigen(T, an, hoch, hell) {
  const L = T.lampe;
  L.an = an && ANDERE_LAMPEN;
  L.hell = hell;
  L.kegel.visible = L.an;
  L.linse.material.color.set(L.an ? (hell > 0 ? '#ffffff' : '#fff6d0') : '#333333');
  if (!L.an) return;
  L.halter.rotation.x = -hoch;   // Positiv = nach oben schauen
  // Steht eine Wand im Weg? Dann den Strahl kürzer machen (nur alle paar Bilder prüfen, das spart Rechenzeit)
  L.pruef -= 1;
  if (L.pruef <= 0) {
    L.pruef = 6;
    L.halter.getWorldPosition(lampenPos);
    lampenRicht.set(0, 0, 1).transformDirection(L.halter.matrixWorld);
    sichtStrahl.set(lampenPos, lampenRicht);
    sichtStrahl.far = LICHTKEGEL_LAENGE;
    const treffer = sichtStrahl.intersectObjects(sichtBlocker, false);
    L.laenge = treffer.length ? Math.max(0.4, treffer[0].distance + 0.4) : LICHTKEGEL_LAENGE;
  }
  L.kegel.scale.setScalar(L.laenge);
  L.kegel.material.opacity = 0.12 + hell * 0.6;
}
// Die echten Lichter bekommen die Roboter, die am nächsten bei dir sind
function andereLampenLichter() {
  if (!andereLichter.length) return;
  const liste = [];
  const nimm = T => { if (T && T.g.visible && T.lampe.an) liste.push({ T, d: T.g.position.distanceToSquared(kamera.position) }); };
  for (const h of helfer) nimm(h.teile);
  for (const o of mp.andere.values()) nimm(o.teile);
  liste.sort((a, b) => a.d - b.d);
  andereLichter.forEach((l, i) => {
    const e = liste[i];
    if (!e) { l.intensity = 0; return; }
    const L = e.T.lampe;
    L.halter.updateWorldMatrix(true, false);
    L.halter.getWorldPosition(l.position);
    lampenRicht.set(0, 0, 1).transformDirection(L.halter.matrixWorld);
    l.target.position.copy(l.position).addScaledVector(lampenRicht, 5);
    l.intensity = 4 + L.hell * 70;
    l.angle = 0.5 + L.hell * 0.35;
  });
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
// 🔫 Der Greifer, den die ANDEREN Spieler in der Hand halten (wie deiner, nur klein – er zeigt nach vorne, +z)
function baueGreifGeraet(farbe) {
  const g = new THREE.Group(), leucht = new THREE.MeshBasicMaterial({ color: farbe });
  const t = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  t(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 12), greiferMat, 0, 0, 0.03).rotation.x = Math.PI / 2;        // Lauf
  for (const z of [-0.03, 0.03, 0.09]) t(new THREE.TorusGeometry(0.04, 0.007, 6, 14), leucht, 0, 0, z);           // Leuchtende Spulen
  t(new THREE.CylinderGeometry(0.05, 0.04, 0.04, 12), greiferDunkel, 0, 0, 0.15).rotation.x = Math.PI / 2;       // Kopf
  const zinken = new THREE.Group(); zinken.position.set(0, 0, 0.17); g.add(zinken);
  for (let k = 0; k < 3; k++) {
    const z = new THREE.Group(); z.rotation.z = k / 3 * Math.PI * 2;
    const zahn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.08), greiferMat); zahn.position.set(0, 0.045, 0.03);
    z.add(zahn); zinken.add(z);
  }
  const ring = t(new THREE.TorusGeometry(0.06, 0.005, 6, 20), leucht, 0, 0, 0.17);
  const spitze = t(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 0, 0.2);
  g.userData = { zinken, ring, spitze, leucht };
  return g;
}
const armZiel = new THREE.Vector3();
function armZielt(T, arm, ziel) {   // Den Arm so drehen, dass er genau auf "ziel" (Weltposition) zeigt
  arm.rotation.order = 'YXZ';
  T.g.updateMatrixWorld(true);
  armZiel.copy(ziel); arm.parent.worldToLocal(armZiel); armZiel.sub(arm.position);
  arm.rotation.set(-Math.atan2(armZiel.y, Math.hypot(armZiel.x, armZiel.z)), Math.atan2(armZiel.x, armZiel.z), 0);
  arm.updateMatrixWorld(true);
}

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
  gepackt = null;
  if (!gegriffen) return;
  gegriffen.body.collisionFilterMask = SCHATZ_MASKE;
  gegriffen = null;
}
function werfen() {
  if (gepackt) { spielerWerfen(); return; }
  if (!gegriffen) return;
  const s = gegriffen, r = new THREE.Vector3();
  kamera.getWorldDirection(r);
  const kraft = WURF_KRAFT / Math.sqrt(Math.max(1, s.typ.masse / 3));
  if (mp.rolle === 'gast') mpSende({ t: 'wurf', id: s.id, v: [r2(r.x * kraft), r2(r.y * kraft + 1.5), r2(r.z * kraft)] });
  else s.body.velocity.set(r.x * kraft, r.y * kraft + 1.5, r.z * kraft);
  s.geworfen = 1.5;
  loslassen();
  sound.sprung();
  const p = spielerKoerper.position;
  laerm(p.x, p.y, p.z, 3);
}
// Der Strahl zieht den Schatz zu der Stelle vor dir
function halteZiel() {   // Wo soll der gegriffene Schatz hin? (vor deine Nase)
  const r = new THREE.Vector3();
  kamera.getWorldDirection(r);
  const ziel = kamera.position.clone().addScaledVector(r, halteAbstand);
  if (gegriffen && gegriffen.typ.masse > 10) ziel.y -= 0.3;   // Schwere Sachen hängen ein bisschen durch
  return ziel;
}
function haltenPhysik() {
  if (!gegriffen || mp.rolle === 'gast') return;
  if (!zieheSchatz(gegriffen, halteZiel())) { loslassen(); zeigeNachricht('Der Strahl ist abgerissen!', 1.5, '#ffd166'); }
}
function zieheSchatz(s, ziel) {   // Zieht einen Schatz zum Ziel. false = zu weit weg, Strahl reißt ab
  const b = s.body;
  const diff = new CANNON.Vec3(ziel.x - b.position.x, ziel.y - b.position.y, ziel.z - b.position.z);
  if (diff.length() > 3) return false;
  const maxTempo = 9 / Math.sqrt(Math.max(1, s.typ.masse / 3));
  diff.scale(10, diff);
  if (diff.length() > maxTempo) diff.scale(maxTempo / diff.length(), diff);
  b.velocity.copy(diff);
  b.angularVelocity.scale(0.85, b.angularVelocity);   // Nicht so wild drehen
  b.wakeUp();
  return true;
}
function getroffen(menge, von) {
  if (zustand !== 'spiel' || tot) return;
  energie -= menge;
  schadenBlitz = 0.6;
  wackeln = 0.3;
  sound.autsch();
  if (String(von).includes('Oma')) { monsterSound.bonk(); zeigeNachricht('🦯 BONK! Die Böse Oma hat dir eine übergezogen!', 2, '#ff6b6b'); }
  loslassen();   // Vor Schreck lässt du alles fallen!
  const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, spielerKoerper.position) < 15);
  if (zeuge) sagen(zeuge, 'aufpassen', {}, 1);
  if (energie <= 0) {   // Nicht Schluss: Dein Kopf fällt runter – jemand muss ihn zur Abgabe bringen! (Allein ohne Bots: alle Schrott → zurück in die Lobby)
    spielerStirbt(von);
    return;
  }
  if (energie <= 0) {
    energie = 0;
    kaputtGrund = von;
    zustand = 'kaputt';
    if (document.pointerLockElement) document.exitPointerLock();
  }
}
// 📸 Blitzlampe: Ein superheller Blitz nach vorne. Alle Monster, die du anleuchtest, sind kurz geblendet!
function blitzen() {
  if (tot) return;
  if (zustand !== 'spiel' || pause) return;
  if (blitzLadung < 1) { zeigeNachricht(`🔦 Blitzlampe lädt noch ... (${Math.ceil((1 - blitzLadung) * BLITZ_LADEN)} s)`, 1, '#ffd166'); return; }
  blitzLadung = 0; blitzHell = 1;
  sound.blitz();
  const blickRichtung = new THREE.Vector3();
  kamera.getWorldDirection(blickRichtung);
  if (mp.rolle === 'host') mpAnAlle({ t: 'blitzSicht', id: mp.peer.id });   // Die anderen sehen deine Lampe aufblitzen
  if (mp.rolle === 'gast') {   // Die Monster sind beim Gastgeber – also dorthin schicken
    const k = kamera.position;
    mpSende({ t: 'blitz', p: [r2(k.x), r2(k.y), r2(k.z)], r: [r2(blickRichtung.x), r2(blickRichtung.y), r2(blickRichtung.z)] });
    zeigeNachricht('📸 BLITZ!', 1.5, '#ffd166');
    return;
  }
  blitzVon(kamera.position.clone(), blickRichtung, true);
}
function blitzVon(von, blickRichtung, meldung) {
  let geblendet = 0, starrerDa = false;
  for (const m of monster) {
    const kopf = new THREE.Vector3(m.x, m.y + 1.2, m.z);
    const zu = kopf.clone().sub(von), d = zu.length();
    if (d > BLITZ_WEITE || zu.normalize().dot(blickRichtung) < Math.cos(BLITZ_WINKEL)) continue;
    if (!freieSicht(von.clone(), kopf)) continue;
    if (m.art === 'maulwurf' && m.modus !== 'oben') continue;   // Unter der Erde sieht er den Blitz nicht
    if (!m.info.betaeubbar) { starrerDa = true; continue; }   // Steinaugen kann man nicht blenden ...
    m.betaeubt = Math.max(m.betaeubt, BLITZ_BETAEUBT);
    m.modus = 'wandern'; m.ziel = null; m.zielen = 0;
    schwebeText(m.x, m.y + 2.3, m.z, `💫 ${m.info.name} geblendet!`, '#ffd166');
    geblendet++;
  }
  if (!meldung) return;
  if (geblendet) {
    zeigeNachricht(`📸 BLITZ! ${geblendet === 1 ? 'Ein Monster ist' : geblendet + ' Monster sind'} geblendet!`, 2, '#ffd166');
    const zeuge = helfer.find(h => h.kaputt <= 0 && abstand3D(h.body.position, spielerKoerper.position) < 15);
    if (zeuge) sagen(zeuge, 'volltreffer', {}, 1);
  } else if (starrerDa) zeigeNachricht('🗿 Der Starrer hat Steinaugen – Blitzen hilft nicht! Schau ihn einfach an!', 2.5, '#c9c3ff');
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
  if (tot) { totParken(); return; }   // Kaputt: nur zuschauen
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
  if (klebZeit > 0) tempo *= TRAENKE.schleim.langsam;   // 🟣 Im Klebeschleim kommst du kaum vorwärts
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
  einblenden = Math.max(0, einblenden - dt);
  schadenBlitz = Math.max(0, schadenBlitz - dt);
  wackeln = Math.max(0, wackeln - dt);
  for (const f of funk) f.t -= dt;
  funk = funk.filter(f => f.t > 0);
  musikUpdate(zustand === 'spiel' && !pause ? jaeger()?.art ?? null : null);
  mpUpdate(dt);
  try { voiceUpdate(); } catch (e) { /* Voice-Chat darf nie das Spiel kaputt machen */ }
  if (mp.rolle === 'gast') { if (zustand === 'spiel') updateAlsGast(dt); return; }
  if (zustand !== 'spiel' || (pause && !mp.aktiv)) return;   // Im Multiplayer läuft das Spiel auch in der Pause weiter
  spielZeit += dt;
  busUpdate(dt);
  if (introZeit >= 0) introUpdate(dt);
  if (lobby || introZeit >= 0) {   // 🚌 In der Lobby (und im Intro) passiert im Haus noch nichts – die Monster warten
    if (introZeit < 0) { updateSpieler(dt); gehaltenWerden(dt); packenPruefen(); haltenPhysik(); }
    welt.step(1 / 60, dt, 3); pruefeBoden(); updateEffekte(dt);
    spielZeit = 0;
    return;
  }
  if (spielZeit > 1.5 && spielZeit - dt <= 1.5 && helfer.length) sagen(auswahl(helfer), 'start', {}, 2);

  updateSpieler(dt);
  gehaltenWerden(dt);
  packenPruefen();
  for (const h of helfer) updateHelfer(h, dt);
  haltenPhysik();
  mpGastSchaetzeHalten();
  welt.step(1 / 60, dt, 3);
  totParken();
  pruefeBoden();
  for (const s of [...schaetze]) {
    if (s.zerbrechen && !s.kaputt) zerbrechen(s);
    s.geworfen -= dt;
  }
  // Ist etwas aus dem Haus gefallen? (sollte nicht passieren, aber sicher ist sicher)
  for (const s of schaetze) if (s.body.position.y < -ETAGE_HOEHE - 1.5) { s.body.position.set(haus.spawn.x + 1, 1, haus.spawn.z); s.body.velocity.set(0, 0, 0); }
  for (const h of helfer) if (h.body.position.y < -ETAGE_HOEHE - 1.5) { h.body.position.set(haus.spawn.x + 1, 0.5, haus.spawn.z); h.body.velocity.set(0, 0, 0); }
  if (spielerKoerper.position.y < -ETAGE_HOEHE - 1.5) { spielerKoerper.position.set(haus.spawn.x, 0.6, haus.spawn.z); spielerKoerper.velocity.set(0, 0, 0); }
  for (const m of monster) updateMonster(m, dt);
  updateSchussSpuren(dt);
  updateTraenke(dt);
  updatePfuetzen(dt);
  blitzLadung = Math.min(1, blitzLadung + dt / BLITZ_LADEN);
  if (blitzHell > 0) { blitzHell = Math.max(0, blitzHell - dt * 3); taschenlampe.intensity = 6 + blitzHell * 80; taschenlampe.angle = 0.55 + blitzHell * 0.35; }

  // Schätze in der Abgabe werden verkauft (wenn sie kurz still drin liegen und keiner sie mehr festhält)
  for (const s of [...schaetze]) {
    const drin = imLaster(s) && !s.kaputt && gegriffen !== s && !s.gastHaelt && !s.getragenVon;
    s.drinZeit = drin ? (s.drinZeit || 0) + dt : 0;
    if (s.drinZeit > ABGABE_ZEIT) abgeben(s);
  }
  gewinnPruefen();
  schrottPruefen(dt);
  // Ab und zu taucht ein neuer Schatz im Haus auf
  neuerSchatzZeit -= dt;
  if (neuerSchatzZeit <= 0) { neuerSchatzZeit = NEUER_SCHATZ_ALLE; if (schaetze.filter(x => x.typ.id !== 'kopf').length < schatzStartAnzahl) neuerSchatzIrgendwo(); }
  // Herzklopfen, wenn ein Monster dich jagt
  herzZeit -= dt;
  if (gejagt() && herzZeit <= 0) { herzZeit = 0.7; sound.herz(0.8); }
  updateEffekte(dt);
}
function updateEffekte(dt) {
  // Splitter und Schwebetexte
  for (const sp of splitter) {
    sp.t -= dt;
    sp.v.y -= 9.8 * dt;
    sp.mesh.position.addScaledVector(sp.v, dt);
    const boden = (sp.mesh.position.y < -1.2 ? -ETAGE_HOEHE : etageVon(sp.mesh.position.y) * ETAGE_HOEHE) + 0.03;
    if (sp.mesh.position.y < boden && sp.v.y < 0) { sp.mesh.position.y = boden; sp.v.set(sp.v.x * 0.5, 0, sp.v.z * 0.5); }
    sp.mesh.rotation.x += dt * 5;
    if (sp.t <= 0) szene.remove(sp.mesh);
  }
  splitter = splitter.filter(sp => sp.t > 0);
  for (const t of schwebeTexte) { t.t -= dt; t.p.y += dt * 0.5; }
  schwebeTexte = schwebeTexte.filter(t => t.t > 0);
}
function gejagt() {
  return jaeger() !== null;
}
function jaeger() {   // Welches Monster jagt dich gerade? (das nächste, oder null)
  const p = spielerKoerper.position;
  let bestes = null, bestD = 12;
  for (const m of monster) {
    const d = abstand3D(m, p);
    if (m.betaeubt <= 0 && d < bestD && (m.art === 'starrer' ? m.bewegtSeit > 0.3 : m.art === 'maulwurf' ? ['auftauchen', 'oben', 'abtauchen'].includes(m.modus) : m.modus === 'jagen')) { bestes = m; bestD = d; }   // (Maulwurf: Musik erst, wenn er rausbricht!)
  }
  return bestes;
}
// ===== Abgabe, neue Schätze, Köpfe und Wiederbeleben =====
let tot = false, meinKopfId = null, neuerSchatzZeit = NEUER_SCHATZ_ALLE, schatzStartAnzahl = 0;
let verkauft = 0, gewinnHinweisZeit = -99;   // So viele Schätze wurden schon verkauft
const gewinnZiel = () => Math.max(1, Math.ceil(schatzStartAnzahl * GEWINN_PROZENT / 100));
function alleLeben() {   // Lebt jeder Spieler? (Liegt irgendwo noch ein Kopf herum, ist jemand kaputt)
  if (tot || schaetze.some(x => x.typ.id === 'kopf')) return false;
  for (const g of mp.andere.values()) if (g.y <= -10) return false;
  return true;
}
function gewinnPruefen() {   // Nur beim Gastgeber (oder allein)
  if (zustand !== 'spiel' || verkauft < gewinnZiel()) return;
  if (alleLeben()) { gewonnen(); return; }
  if (zeit - gewinnHinweisZeit > 6) {
    gewinnHinweisZeit = zeit;
    const t = '🏆 Genug Schätze verkauft! Aber erst gewinnt ihr, wenn ALLE wieder leben – bringt die Köpfe 🤖 zur Abgabe!';
    zeigeNachricht(t, 4, '#ffd166'); if (mp.rolle === 'host') mpAnAlle({ t: 'info', text: t, farbe: '#ffd166' });
  }
}
function schatzEntfernen(s) {   // Einen Schatz ganz aus dem Spiel nehmen
  for (const h of helfer) if (h.auftrag === s) helferLoslassen(h);
  mpSchatzWeg(s);
}
function abgeben(s) {
  const p = s.body.position;
  if (s.typ.id === 'kopf') {   // Ein Kopf! Genug Geld zum Wiederbeleben?
    const preis = istHelferKopf(s) ? HELFER_WIEDERBELEBEN_PREIS : WIEDERBELEBEN_PREIS;   // (Helfer-Bots sind billiger)
    if (konto < preis) {
      if (zeit - (s.hinweisZeit || -99) > 4) {
        s.hinweisZeit = zeit;
        const t = `🤖 Noch ${euro(preis - konto)} fürs Wiederbeleben! Bringt mehr Schätze!`;
        zeigeNachricht(t, 3, '#ffd166'); if (mp.rolle === 'host') mpAnAlle({ t: 'info', text: t, farbe: '#ffd166' });
      }
      return;
    }
    konto -= preis;
    schwebeText(p.x, p.y + 0.6, p.z, `🔧 Wiederbelebt! -${euro(preis)}`, '#7cf5c6');
    if (mp.rolle === 'host') mpAnAlle({ t: 'verkauft', id: s.id, text: `🔧 Wiederbelebt! -${euro(preis)}`, x: r2(p.x), y: r2(p.y), z: r2(p.z) });
    wiederbeleben(s.besitzer);
    schatzEntfernen(s);
    return;
  }
  konto += s.wert;
  verkauft++;
  if (konto > rekord) { rekord = konto; try { localStorage.setItem('arag-rekord', String(rekord)); } catch (e) { /* egal */ } }
  sound.abgabe();
  schwebeText(p.x, p.y + 0.6, p.z, `+${euro(s.wert)} 💰`, '#7cf5c6');
  if (mp.rolle === 'host') mpAnAlle({ t: 'verkauft', id: s.id, text: `+${euro(s.wert)} 💰`, x: r2(p.x), y: r2(p.y), z: r2(p.z) });
  schatzEntfernen(s);
}
function neuerSchatzIrgendwo() {   // Ein neuer Schatz in einem zufälligen Raum (nicht in der Garage) – oder draußen im Wald
  if (haus.schule) {   // 📚 In der Schule: irgendwo in einem Klassenzimmer
    const pl = schulSchatzPlatz(Math.random);
    if (pl) { const typ = schulSchatzTyp(); neuerSchatz(typ, pl.x, typ.groesse[1] / 2 + 0.05, pl.z); }
    return;
  }
  if (haus.baeume && Math.random() < WALD_NEU_ANTEIL) {
    const pl = waldPlatz((a, b) => a + Math.random() * (b - a));
    if (pl) { const typ = gewichtetWaehlen(VILLA_SCHAETZE); neuerSchatz(typ, pl.x, typ.groesse[1] / 2 + 0.05, pl.z); return; }
  }
  const raeume = haus.raeume.filter(R => R.nr !== haus.start);
  const R = raeume[Math.floor(Math.random() * raeume.length)];
  const typ = gewichtetWaehlen(VILLA_SCHAETZE), sh = typ.groesse[1];
  if (!typ.boden && R.ablagen.length && Math.random() < 0.6) {
    const a = R.ablagen[Math.floor(Math.random() * R.ablagen.length)];
    neuerSchatz(typ, a.x + zufall(-a.b / 2, a.b / 2) * 0.7, a.y + sh / 2 + 0.03, a.z + zufall(-a.t / 2, a.t / 2) * 0.7);
  } else neuerSchatz(typ, R.x0 + RAUM / 2 + zufall(-1.5, 1.5), R.basis + sh / 2 + 0.05, R.z0 + RAUM / 2 + zufall(-1.5, 1.5));
}
function neuerKopf(besitzer, farbe, x, y, z, id = null) {
  const s = neuerSchatz({ ...KOPF_TYP, farbe }, x, y, z);
  if (id !== null) s.id = id;
  s.besitzer = besitzer;
  if (besitzer === meineId()) meinKopfId = s.id;
  return s;
}
const meineId = () => mp.aktiv && mp.peer ? mp.peer.id : 'ich';
const meineFarbe = () => aussehen.farbe || (mp.aktiv ? MP_ROBOTER[mp.nr || 0].farbe : '#7cf5c6');
const TOT_PLATZ = { x: -60, y: 5, z: -60 };   // Hier "parkt" der Körper, solange du kaputt bist (außerhalb vom Haus)
function spielerStirbt(von) {
  const p = spielerKoerper.position, x = p.x, y = p.y, z = p.z;
  tot = true; energie = 0; kaputtGrund = von;
  loslassen(); gepackt = null;
  if (geduckt) ducken(false);
  if (mp.rolle === 'gast') mpSende({ t: 'tot', x: r2(x), y: r2(y), z: r2(z), von });
  else {
    neuerKopf(meineId(), meineFarbe(), x, y + 0.3, z);
    if (mp.rolle === 'host') mpAnAlle({ t: 'info', text: `💀 ${meinName()} ist kaputt! Bringt den Kopf 🤖 zur Abgabe 🚚`, farbe: '#ff6b6b' });
  }
  spielerKoerper.position.set(TOT_PLATZ.x, TOT_PLATZ.y, TOT_PLATZ.z); spielerKoerper.velocity.set(0, 0, 0);
  zeigeNachricht(`💀 Kaputt! (${von}) Dein Kopf 🤖 liegt im Haus ...`, 4, '#ff6b6b');
  verbindungWeg();
}
function wiederbeleben(besitzer) {   // Beim Gastgeber: Wer bekommt sein Leben zurück?
  if (besitzer === meineId()) { spielerWiederbeleben(); return; }
  if (String(besitzer).startsWith('helfer-')) {   // 🤖 Ein Helfer-Bot bekommt seinen Kopf zurück!
    const h = helfer[Number(besitzer.slice(7))];
    if (h) { helferAmStart(h); const t = `🔧 ${h.name} hat seinen Kopf wieder! Danke! 🤖💚`; zeigeNachricht(t, 3); if (mp.rolle === 'host') mpAnAlle({ t: 'info', text: t }); }
    return;
  }
  const g = mp.andere.get(besitzer);
  if (g) { mpSendeAn(g, { t: 'leben' }); const t = `🔧 ${g.name} ist wieder da!`; zeigeNachricht(t, 3); mpAnAlle({ t: 'info', text: t }); }
}
function spielerWiederbeleben() {
  tot = false; meinKopfId = null; energie = 100; ausdauer = AUSDAUER_MAX;
  spielerKoerper.position.set(haus.spawn.x + zufall(0, 1), KOERPER_RADIUS + 0.3, haus.spawn.z + zufall(-1, 1));   // Vor der Bustür
  spielerKoerper.velocity.set(0, 0, 0);
  sound.geschafft();
  zeigeNachricht('🔧 Du bist wiederbelebt! Danke, Team! 🤖💚', 4);
}
function totParken() {   // Solange du kaputt bist, bleibt dein Körper weit weg (dann sehen dich die Monster nicht)
  if (!tot) return;
  spielerKoerper.position.set(TOT_PLATZ.x, TOT_PLATZ.y, TOT_PLATZ.z); spielerKoerper.velocity.set(0, 0, 0);
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
// =====================================================================
// ===== 🎬 Intro und 🚌 Lobby =====
// =====================================================================
// Das Intro: Die Kamera fliegt durch den Wald, der Bus kommt angefahren, am Ende das Logo
const INTRO_TEXTE_SCHULE = [
  [0.8, 4.3, '🌙 Mitten in der Nacht, am Rand einer kleinen Stadt ...'],
  [4.5, 8.2, '📚 ... steht eine verlassene Schule. Und der Lehrer ist IMMER NOCH DA.'],
  [8.4, 10.3, '🚌 Zum Glück gibt es ...'],
];
const INTRO_TEXTE = [
  [0.8, 4.3, '🌲 Irgendwo, tief in einem dunklen Wald ...'],
  [4.5, 8.2, '🏚️ ... steht eine alte Spukvilla. Voller Schätze – und voller Monster.'],
  [8.4, 10.3, '🚌 Zum Glück gibt es ...'],
];
const busVersatz = t => { const u = begrenzt((t - 1.5) / 7.5, 0, 1); return 40 * Math.pow(1 - u, 2.2); };   // Wie weit der Bus noch weg ist (er bremst am Ende sanft)
function introStarten() {
  introZeit = 0;
  const B = haus.bus, cx = (B.x1 + B.x2) / 2, mz = (B.z1 + B.z2) / 2;
  const hx = haus.schule ? SCHUL_ORT + 12 : haus.breit * RAUM / 2, hz = haus.schule ? (haus.schule.z0 + haus.schule.z1) / 2 : haus.tief * RAUM / 2;   // Dahin schaut die Kamera am Anfang
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  B.introWeg = new THREE.CatmullRomCurve3([v(cx - 32, 30, B.z2 + 50), v(cx - 20, 12, B.z2 + 30), v(cx - 12, 4, mz + 10), v(B.x2 + 5.5, 1.9, mz + 1.5), v(B.x2 + 4, 1.7, B.tuerZ)]);
  B.introBlick = new THREE.CatmullRomCurve3([v(hx, 4, hz), v(cx, 1.5, B.z2 + 22), v(cx, 1.5, mz), v(B.x2, 1.6, mz + 1.5), v(B.x2, 1.3, B.tuerZ)]);
  rauschen(0, 6, 0.06, 'lowpass', 500, null, 200);   // Wind im Wald
}
function introUpdate(dt) {
  const vorher = introZeit;
  introZeit += dt;
  const ab = t => vorher < t && introZeit >= t;
  if (ab(1.6)) { ton(46, 0, 7.5, 'sawtooth', 0.05, 38); ton(92, 0, 7.5, 'sine', 0.05, 70); }   // Brummender Motor
  if (ab(8.8)) rauschen(0, 0.9, 0.25, 'highpass', 2500, null, 800);   // Pssssch! (Bremsen)
  if (ab(10.4)) [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.13, 0.35, 'square', 0.06));   // ARAG-Melodie
  if (introZeit >= INTRO_DAUER) introEnde();
}
function introEnde() {
  if (introZeit < 0) return;
  introZeit = -1; einblenden = 1;
  if (haus.bus) haus.bus.gruppe.position.z = 0;
  if (!lobby) ausTuer();   // Angekommen – Tür auf!
}
function introKamera() {
  const B = haus.bus, t = begrenzt(introZeit / INTRO_DAUER, 0, 1);
  kamera.position.copy(B.introWeg.getPoint(t));
  kamera.lookAt(B.introBlick.getPoint(t));
  kamera.updateMatrixWorld();
}
function zeichneIntro() {
  const t = introZeit, sicht = (a, b) => t >= a && t < b ? Math.min(1, (t - a) / 0.6, (b - t) / 0.6) : 0;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.1); ctx.fillRect(0, H * 0.9, W, H * 0.1);   // Kino-Balken
  for (const [a, b, txt] of kartenWahl === 'schule' ? INTRO_TEXTE_SCHULE : INTRO_TEXTE) { const s = sicht(a, b); if (s > 0) { ctx.globalAlpha = s; text(txt, W / 2, H * 0.84, 26, '#fff'); ctx.globalAlpha = 1; } }
  const s = sicht(10.4, INTRO_DAUER - 0.3);
  if (s > 0) {   // Das Logo!
    ctx.globalAlpha = s;
    ctx.fillStyle = 'rgba(5,8,12,0.75)'; rr(W / 2 - 290, H / 2 - 115, 580, 230, 22); ctx.fill();
    zeichneAragLogo(ctx, W / 2 - 205, H / 2 - 62, 105, '#ffffff');
    text('Schatz-Bergungsdienst · Wir holen alles raus!', W / 2, H / 2 + 85, 19, '#7cf5c6');
    ctx.globalAlpha = 1;
  }
  const schwarz = Math.max(t < 1 ? 1 - t : 0, t > INTRO_DAUER - 0.7 ? (t - (INTRO_DAUER - 0.7)) / 0.7 : 0);
  if (schwarz > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, schwarz)})`; ctx.fillRect(0, 0, W, H); }
  text('Klick oder Leertaste = überspringen', W - 20, H - 16, 13, '#8a8fb0', 'right', false);
}
// Die Lobby
function lobbyWillkommen() {
  zeigeNachricht(mp.aktiv ? '🚌 Willkommen im ARAG-Bus! Wenn alle da sind: roter Knopf 🔴 + E – dann sind wir da!' : '🚌 Willkommen im ARAG-Bus! Drück am roten Knopf 🔴 E – dann sind wir da!', 5);
}
function startNachricht() {
  if (kartenWahl === 'schule') { zeigeNachricht(`📚 Die verfluchte Schule! Holt ${gewinnZiel()} Schätze raus in die Abgabe 🚚 – und lasst euch NICHT von Herrn Kreidemann erwischen! 📝`, 6); return; }
  zeigeNachricht(`🏚️ Die große Spukvilla! Verkauft ${gewinnZiel()} Schätze in der Abgabe 🚚 – und bleibt alle am Leben!`, 5); 
}
function lobbyKnopf() {   // Vor welchem Knopf im Bus stehst du? ('los', 'bots', 'pc' oder null)
  const B = haus && haus.fahrBus, p = spielerKoerper.position;
  if (!B || tot) return null;
  let best = null, bestD = 1.4;
  for (const [was, q] of [['los', B.knopf], ['bots', B.botKnopf], ['karte', B.karteKnopf], ['pc', B.pc], ['pc', B.puppe]]) {
    const d = abstand2D(p.x, p.z, q.x, q.z);
    if (d < bestD) { bestD = d; best = was; }
  }
  return best;
}
const amKnopf = () => lobbyKnopf() === 'los';
function botSchildMalen() {
  const F = haus && haus.fahrBus;
  if (!F) return;
  const g = F.botSchild.g;
  g.fillStyle = '#10202a'; g.fillRect(0, 0, 256, 96);
  g.strokeStyle = mitBots ? '#4ade80' : '#8a8f9e'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 90);
  g.fillStyle = mitBots ? '#4ade80' : '#c9c3ff'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText(mitBots ? '🤖 MIT BOTS' : '🚫 OHNE BOTS', 128, 46);
  g.fillStyle = '#ffffff'; g.font = '20px Arial, sans-serif'; g.fillText('E = umschalten', 128, 78);
  F.botSchild.tex.needsUpdate = true;
  F.botLampe.material.color.set(mitBots ? '#4ade80' : '#555a63');
}
function botsSetzen(an) {   // 🤖 Bots mit- oder abmelden (nur in der Lobby)
  if (!lobby) return;
  mitBots = an;
  try { localStorage.setItem('arag-bots', an ? '1' : '0'); } catch (e) { /* egal */ }
  const F = haus.fahrBus;
  if (an && !helfer.length) {
    for (let k = 0; k < Math.min(HELFER_ANZAHL, HELFER.length); k++) neuerHelfer(HELFER[k], F.x2 - 0.7, F.z2 - 1.2 - k * 1.3);
    if (helfer.length) sagen(helfer[0], 'neustart', {}, 2);
  } else if (!an && helfer.length) {
    for (const h of helfer) { welt.removeBody(h.body); szene.remove(h.teile.g); szene.remove(h.strahl.g); }
    helfer = [];
  }
  botSchildMalen();
  ton(an ? 660 : 440, 0, 0.1, 'square', 0.07); ton(an ? 880 : 330, 0.1, 0.12, 'square', 0.07);   // Klick-klack
  zeigeNachricht(an ? '🤖 Mit Helfer-Bots! Bolzen und Funke kommen mit.' : '🚫 Ohne Bots! Jetzt seid ihr auf euch allein gestellt ...', 3);
  if (mp.rolle === 'host') mpAnAlle({ t: 'bots', an });
}
function losGehts() {   // 🔴 Der Knopf wurde gedrückt: Der Bus kommt an der Spukvilla an!
  if (!lobby) return;
  lobby = false; spielZeit = 0;
  ankommen();
  if (mp.rolle === 'host') mpAnAlle({ t: 'los' });
}
function ankommen() {   // Alle im Bus (und die Helfer) stehen jetzt im echten Bus auf dem Parkplatz – genau an derselben Stelle im Bus
  const F = haus.fahrBus, B = haus.bus;
  if (F) {
    const dx = B.x1 - F.x1, dz = B.z1 - F.z1, p = spielerKoerper.position;
    if (!tot) { p.x += dx; p.z += dz; spielerKoerper.velocity.set(0, 0, 0); }
    if (mp.rolle !== 'gast') for (const h of helfer) { h.body.position.x += dx; h.body.position.z += dz; h.body.velocity.set(0, 0, 0); h.tw = null; }
    F.gruppe.visible = false; F.landschaft.gruppe.visible = false;
  }
  rauschen(0, 0.9, 0.25, 'highpass', 2500, null, 800);   // Pssssch! (Bremsen)
  ton(880, 0.3, 0.12, 'sine', 0.1); ton(660, 0.45, 0.2, 'sine', 0.1);   // Ding-dong
  einblenden = 1;
  if (INTRO_AN) introStarten(); else ausTuer();
}
function ausTuer() { busTuerAuf(); startNachricht(); spielZeit = 0; }   // Tür auf – raus mit euch!
function busTuerAuf() {
  const B = haus && haus.bus;
  if (!B || B.tuerAuf) return;
  B.tuerAuf = true;
  welt.removeBody(B.tuerKoerper);
  const i = sichtBlocker.indexOf(B.tuer); if (i >= 0) sichtBlocker.splice(i, 1);
  rauschen(0, 0.7, 0.2, 'highpass', 2000, null, 500);   // Pschhh – die Tür geht auf
}
// 🔧💚 Reparieren: Wer auf der grünen Plattform im Bus steht, bekommt Energie zurück
const aufHeilplatte = (x, z, y) => { const H = haus.bus.heil; return abstand2D(x, z, H.x, H.z) < H.r && y < 1.5; };
function heilUpdate(B, dt) {
  const H = B.heil, p = spielerKoerper.position;
  const ichHeile = !lobby && introZeit < 0 && zustand === 'spiel' && !tot && !pause && aufHeilplatte(p.x, p.z, p.y) && energie < 100;
  if (ichHeile) {
    const vorher = energie;
    energie = Math.min(100, energie + HEIL_PRO_SEKUNDE * dt);
    if (zeit - (H.piepZeit || -9) > 0.45) { H.piepZeit = zeit; ton(500 + energie * 6, 0, 0.08, 'sine', 0.05, 700 + energie * 6); }   // Piep ... piep ... (immer höher)
    if (energie >= 100 && vorher < 100) { zeigeNachricht('✅ Voll repariert! 🔧💚', 2); ton(784, 0, 0.12, 'sine', 0.08); ton(1047, 0.12, 0.2, 'sine', 0.08); }
  }
  // Leuchtet, wenn irgendwer (du oder ein Mitspieler) gerade drauf steht
  let jemand = ichHeile;
  for (const o of mp.andere.values()) if (o.ax !== undefined && o.y > -10 && aufHeilplatte(o.ax, o.az, o.ay)) jemand = true;
  H.heilGruen.opacity = (jemand ? 0.7 : 0.35) + Math.sin(zeit * (jemand ? 8 : 2.5)) * 0.15;
  H.heilStrahl.visible = jemand;
  H.heilStrahl.rotation.y += dt * 2;
  H.plusse.forEach((sp, k) => {
    sp.visible = jemand;
    if (!jemand) return;
    const u = (zeit * 0.6 + k / H.plusse.length) % 1, w = k * 2.1 + zeit;
    sp.position.set(H.x + Math.cos(w) * 0.45, 0.2 + u * 2.2, H.z + Math.sin(w) * 0.45);
    sp.material.opacity = Math.sin(u * Math.PI);
  });
}
function busUpdate(dt) {
  const B = haus && haus.bus;
  if (!B) return;
  heilUpdate(B, dt);
  if (haus.schule) {   // 📚 Flackernde Neonröhren
    const [a, b] = haus.schule.flimmer;
    a.color.set(Math.random() < 0.08 ? '#2a2c30' : '#f2f6ff');
    b.color.set(Math.sin(zeit * 0.9) > 0.6 && Math.random() < 0.5 ? '#2a2c30' : '#e8eeff');
  }
  B.gruppe.position.z = introZeit >= 0 ? busVersatz(introZeit) : 0;   // Im Intro kommt der Bus angefahren
  const F = haus.fahrBus;
  if (B.licht) {   // Das Licht: in der Lobby im fahrenden Bus, danach im echten Bus (im Intro erst, wenn er angekommen ist)
    if (lobby && F) B.licht.position.set(F.licht.x, F.licht.y, F.licht.z); else B.licht.position.copy(B.lichtPos);
    B.licht.intensity = introZeit >= 0 && busVersatz(introZeit) > 1 ? 0 : 1.5;
  }
  if (lobby && F) {   // 🚌💨 Draußen zieht alles vorbei, der Motor brummt
    landschaftFahren(F.landschaft, dt);
    if (zeit - (F.motorZeit ?? -9) > 1) { F.motorZeit = zeit; ton(48, 0, 1.15, 'sawtooth', 0.02, 46); ton(96, 0, 1.15, 'sine', 0.015, 92); }
  }
  // Die Schiebetür: erst ein Stück raus, dann zur Seite
  B.tuerWeg += ((B.tuerAuf ? 1 : 0) - B.tuerWeg) * Math.min(1, dt * 2.5);
  B.tuer.position.x = B.tuerX + Math.min(1, B.tuerWeg * 3) * 0.13;
  B.tuer.position.z = B.tuerZ + Math.max(0, B.tuerWeg - 0.25) / 0.75 * 1.45;
  B.dachLichter.forEach((l, k) => l.material.color.set((zeit * 2 + k) % 2 < 1 ? '#ffae3d' : '#4a3010'));   // Blink, blink
  if (F && lobby) {
    F.knopfOben.material.emissiveIntensity = 0.6 + Math.sin(zeit * 6) * 0.4;
    if (zeit - (F.monitorZeit ?? -9) > 1) { F.monitorZeit = zeit; maleMonitor(); }   // Der Bildschirm (einmal pro Sekunde neu)
  }
}
function maleMonitor() {
  const M = haus.fahrBus.monitor, g = M.g, b = 512, h = 288;
  g.fillStyle = '#06121a'; g.fillRect(0, 0, b, h);
  g.strokeStyle = '#7cf5c6'; g.lineWidth = 6; g.strokeRect(3, 3, b - 6, h - 6);
  zeichneAragLogo(g, 22, 30, 42, '#ffffff');
  g.textAlign = 'left'; g.fillStyle = '#7cf5c6'; g.font = 'bold 20px Arial, sans-serif'; g.fillText('EINSATZ-BUS · LOBBY', 245, 52);
  g.fillStyle = '#ffffff'; g.font = '19px Arial, sans-serif';
  g.fillText(kartenWahl === 'schule' ? '📚 Auftrag: Die verfluchte Schule (wir sind unterwegs!)' : '🏚️ Auftrag: Die große Spukvilla (wir sind unterwegs!)', 22, 115);
  g.fillText(`🏆 Ziel: ${gewinnZiel()} Schätze verkaufen`, 22, 145);
  g.fillText(`💰 Rekord: ${euro(rekord)}`, 22, 175);
  const team = [meinName(), ...[...mp.andere.values()].map(o => o.name), ...helfer.map(x => x.name)];
  g.fillStyle = '#ffd166'; g.fillText(`🤖 Team: ${team.join(', ')}`, 22, 205);
  g.fillStyle = mitBots ? '#4ade80' : '#8a8f9e'; g.fillText(mitBots ? '🤖 Mit Helfer-Bots' : '🚫 Ohne Helfer-Bots', 300, 145);
  if (Math.floor(zeit) % 2 === 0) { g.fillStyle = '#ff6b6b'; g.font = 'bold 22px Arial, sans-serif'; g.fillText('🔴 Roter Knopf + E = LOS!', 22, 255); }
  M.tex.needsUpdate = true;
}
// =====================================================================
// ===== 🎨🎩 Die Roboter-Werkstatt im Lobby-Bus =====
// =====================================================================
// Am Computer (E) suchst du dir Farbe, Hut und ein Extra aus. Die Puppe auf der Drehscheibe zeigt, wie du aussiehst.
// Du selbst siehst dich ja nicht (du schaust aus deinen Augen) – aber deine Mitspieler sehen dich so!
const werkstattStil = document.createElement('style');
werkstattStil.textContent = `
#werkstatt { position: absolute; z-index: 3; top: 3%; right: 1.5%; bottom: 3%; width: min(42%, 25rem); display: none; flex-direction: column; gap: 0.5rem;
  padding: 0.8rem; box-sizing: border-box; overflow-y: auto; border-radius: 1rem; background: rgba(10, 12, 18, 0.9); border: 2px solid #ff6b9d88;
  color: #fff; font: 0.9rem system-ui, sans-serif; }
#werkstatt h2 { margin: 0; font-size: 1.15rem; color: #ff6b9d; }
#werkstatt h3 { margin: 0.2rem 0 0; font-size: 0.85rem; color: #c9c3ff; }
#werkstatt .reihe { display: flex; flex-wrap: wrap; gap: 0.3rem; }
#werkstatt .reihe button { min-width: 2.3rem; height: 2.3rem; padding: 0 0.3rem; border-radius: 0.55rem; border: 2px solid #ffffff22; background: #1d2230; color: #fff; font-size: 1.25rem; cursor: pointer; }
#werkstatt .reihe button.farbe { width: 2.1rem; min-width: 0; }
#werkstatt .reihe button.an { border-color: #fff; box-shadow: 0 0 0 2px #ff6b9d; }
#werkstatt .reihe button:hover { border-color: #ffffffaa; }
#werkstatt input { padding: 0.35rem 0.5rem; border-radius: 0.5rem; border: 1px solid #7cf5c6; background: #0d0f14; color: #fff; font: bold 0.95rem system-ui, sans-serif; }
#werkstatt .unten { display: flex; gap: 0.4rem; margin-top: auto; }
#werkstatt .unten button { flex: 1; padding: 0.5rem; border: none; border-radius: 0.6rem; font: bold 0.95rem system-ui, sans-serif; cursor: pointer; }
#werkstatt .gewaehlt { color: #ffd166; font-size: 0.8rem; min-height: 1em; }
`;
document.head.appendChild(werkstattStil);
const werkstattBox = document.createElement('div');
werkstattBox.id = 'werkstatt';
(document.getElementById('buehne') || document.body).appendChild(werkstattBox);
werkstattBox.addEventListener('keydown', e => e.stopPropagation());   // Tippen im Namensfeld ≠ Laufen
function werkstattBauen() {   // Das Menü (neu) malen – mit allen Knöpfen
  const D = werkstattBox, std = mp.aktiv ? MP_ROBOTER[mp.nr || 0].farbe : '#7cf5c6';
  D.innerHTML = '';
  const neu = (tag, eltern, text) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; eltern.appendChild(el); return el; };
  neu('h2', D, '🎨 Roboter-Werkstatt');
  neu('h3', D, '🏷️ Name');
  const name = neu('input', D); name.maxLength = NAME_MAX; name.placeholder = 'Dein Roboter-Name'; name.value = eigenerName; name.autocomplete = 'off';
  name.addEventListener('input', () => nameSetzen(name.value));
  const reihe = (titel, liste, aktiv, setzen) => {
    neu('h3', D, titel);
    const R = neu('div', D); R.className = 'reihe';
    for (const x of liste) {
      const k = neu('button', R, x.emoji); k.title = x.name;
      if (x.id === aktiv) k.className = 'an';
      k.addEventListener('click', () => setzen(x.id));
    }
  };
  neu('h3', D, '🎨 Farbe');
  const F = neu('div', D); F.className = 'reihe';
  for (const c of LOOK_FARBEN) {
    const k = neu('button', F); k.className = 'farbe' + ((aussehen.farbe || std) === c ? ' an' : ''); k.style.background = c; k.title = c;
    k.addEventListener('click', () => lookSetzen({ ...aussehen, farbe: c }));
  }
  reihe('🎩 Hut', LOOK_HUETE, aussehen.hut, id => lookSetzen({ ...aussehen, hut: id }));
  reihe('✨ Extra', LOOK_EXTRAS, aussehen.extra, id => lookSetzen({ ...aussehen, extra: id }));
  const hut = LOOK_HUETE.find(h => h.id === aussehen.hut), ex = LOOK_EXTRAS.find(h => h.id === aussehen.extra);
  neu('div', D, `Du trägst: ${aussehen.hut ? hut.emoji + ' ' + hut.name : 'keinen Hut'}${aussehen.extra ? ' + ' + ex.emoji + ' ' + ex.name : ''}`).className = 'gewaehlt';
  const U = neu('div', D); U.className = 'unten';
  const zufall = neu('button', U, '🎲 Zufall'); zufall.style.background = '#b388ff';
  zufall.addEventListener('click', () => lookSetzen({ farbe: irgendein(LOOK_FARBEN), hut: irgendein(LOOK_HUETE).id, extra: irgendein(LOOK_EXTRAS).id }));
  const fertig = neu('button', U, '✅ Fertig (E)'); fertig.style.background = '#4ade80';
  fertig.addEventListener('click', () => werkstattZu());
}
function nameSetzen(v) {   // 🏷️ (auch vom Feld auf dem Titelbild benutzt)
  eigenerName = nameSauber(v);
  try { localStorage.setItem('arag-name', eigenerName); } catch (e) { /* egal */ }
  if (mpEl.name && mpEl.name.value !== eigenerName && document.activeElement !== mpEl.name) mpEl.name.value = eigenerName;
  if (mp.aktiv && mp.rolle === 'gast') mpSende({ t: 'name', name: eigenerName });
}
const irgendein = arr => arr[Math.floor(Math.random() * arr.length)];   // (Math.random – damit der Zufall vom Haus gleich bleibt)
function lookSetzen(neu) {
  aussehen = lookSauber(neu);
  try { localStorage.setItem('arag-aussehen', JSON.stringify(aussehen)); } catch (e) { /* egal */ }
  if (mp.aktiv && mp.rolle === 'gast') mpSende({ t: 'look', lk: lookArray(aussehen) });
  const F = haus && haus.fahrBus;
  if (F) F.puppe.jubel = 1.2;   // Die Puppe freut sich und winkt!
  ton(700, 0, 0.06, 'square', 0.05); ton(1050, 0.06, 0.1, 'square', 0.05);   // Pling!
  if (werkstattOffen) werkstattBauen();
}
function werkstattAuf() {
  const F = haus && haus.fahrBus;
  if (!F || werkstattOffen) return;
  werkstattOffen = true;
  for (const k in tasten) tasten[k] = false;
  loslassen();
  // Zur Puppe schauen
  const p = spielerKoerper.position, dx = F.puppe.x - p.x, dz = F.puppe.z - p.z;
  blick.links = Math.atan2(-dx, -dz); blick.hoch = -0.12;
  werkstattBauen();
  werkstattBox.style.display = 'flex';
  if (document.pointerLockElement) document.exitPointerLock();   // Maus frei zum Klicken
  ton(520, 0, 0.08, 'sine', 0.06); ton(780, 0.08, 0.12, 'sine', 0.06);
}
function werkstattZu(mausWieder = true) {
  if (!werkstattOffen) return;
  werkstattOffen = false;
  werkstattBox.style.display = 'none';
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (mausWieder && zustand === 'spiel') mausFangen();
}
function pcSchirmMalen(F) {   // Der Bildschirm vom Werkstatt-Computer
  const g = F.pcBild.g, hut = LOOK_HUETE.find(h => h.id === aussehen.hut), ex = LOOK_EXTRAS.find(h => h.id === aussehen.extra);
  g.fillStyle = '#10141c'; g.fillRect(0, 0, 320, 224);
  g.strokeStyle = '#ff6b9d'; g.lineWidth = 6; g.strokeRect(3, 3, 314, 218);
  g.textAlign = 'center'; g.fillStyle = '#ff6b9d'; g.font = 'bold 26px Arial, sans-serif'; g.fillText('🎨 WERKSTATT', 160, 42);
  LOOK_FARBEN.forEach((c, k) => { g.fillStyle = c; g.fillRect(22 + k * 23, 62, 19, 19); });
  g.fillStyle = '#ffffff'; g.font = '40px Arial, sans-serif'; g.fillText(`${hut.emoji} ${ex.emoji}`, 160, 135);
  if (Math.floor(zeit * 2) % 2 === 0) { g.fillStyle = '#ffd166'; g.font = 'bold 24px Arial, sans-serif'; g.fillText('E drücken!', 160, 190); }
  F.pcBild.tex.needsUpdate = true;
}
function puppeUpdate(dt) {   // Die Anprobe-Puppe: zeigt immer DEIN Aussehen und dreht sich
  const F = haus && haus.fahrBus;
  if (werkstattOffen && (!F || !lobby || zustand !== 'spiel')) werkstattZu(false);   // Bus ist da – Menü zu!
  if (!F || !lobby) return;
  const P = F.puppe, farbe = meineFarbe(), schluessel = [meinName(), farbe, aussehen.hut, aussehen.extra].join('|');
  if (P.schluessel !== schluessel) {   // Neu bauen
    if (P.T) { P.gruppe.remove(P.T.g); }
    P.T = baueHelferMesh({ name: meinName(), farbe, hut: aussehen.hut, extra: aussehen.extra });
    if (P.T.g.parent) P.T.g.parent.remove(P.T.g);
    P.gruppe.add(P.T.g); P.T.g.position.set(P.x, 0.08, P.z); P.T.g.rotation.y = P.drehung || Math.PI / 2;
    P.T.lampe.kegel.visible = false;
    P.gesicht = { gesicht: P.T.gesicht, farbe, kaputt: 0, angst: 0, froh: 1, redet: 0, blinzelVersatz: 0.7 };
    P.ring.material.color.set(farbe);
    P.schluessel = schluessel;
  }
  const T = P.T;
  P.drehung = (P.drehung ?? Math.PI / 2) + dt * (werkstattOffen ? 0.6 : 0.35);
  T.g.rotation.y = P.drehung;
  P.jubel = Math.max(0, (P.jubel || 0) - dt);
  beineAnimieren(T, BEIN_LAENGE, 0, dt);
  T.arme[1].rotation.x = 0.9;
  T.arme[0].rotation.x = P.jubel > 0 ? -2.3 + Math.sin(zeit * 14) * 0.4 : 0.9;   // Winken!
  T.antenne.visible = (zeit * 2) % 1.5 < 1.2;
  T.lampen.forEach((l, k) => { l.visible = (zeit * 3 + k) % 3 > 0.6; });
  P.gesicht.froh = P.jubel > 0 ? 1 : 0;
  malGesicht(P.gesicht);
  lookAnimieren(T, dt);
  if (zeit - (F.pcZeit ?? -9) > 0.5) { F.pcZeit = zeit; pcSchirmMalen(F); }
}
function zeichneLobbyHUD() {   // Oben in der Mitte: Was muss ich in der Lobby tun?
  ctx.fillStyle = 'rgba(10,12,18,0.82)'; rr(W / 2 - 260, 14, 520, 62, 12); ctx.fill();
  text('🚌💨 LOBBY – Der ARAG-Bus fährt zur Spukvilla', W / 2, 38, 18, '#7cf5c6');
  text(mp.aktiv ? `${mp.andere.size + 1} Spieler im Bus · Alle bereit? Einer drückt den roten Knopf 🔴` : 'Bereit? Lauf zum roten Knopf 🔴 an der Tür!', W / 2, 62, 13, '#c9c3ff', 'center', false);
  if (amKnopf()) text('🔴 E: LOS GEHT\'S!', W / 2, H / 2 + 150, 22, '#ff6b6b');
  else if (lobbyKnopf() === 'bots') text(`🤖 E: ${mitBots ? 'OHNE' : 'MIT'} Bots spielen`, W / 2, H / 2 + 150, 20, mitBots ? '#c9c3ff' : '#4ade80');
  else if (lobbyKnopf() === 'karte') { const K = KARTEN[kartenWahl === 'schule' ? 'villa' : 'schule']; text(`🗺️ E: Lieber zur ${K.emoji} ${K.name} fahren`, W / 2, H / 2 + 150, 20, K.farbe); }
  else if (lobbyKnopf() === 'pc' && !werkstattOffen) text('🎨 E: Roboter-Werkstatt (Farbe, Hüte & mehr!)', W / 2, H / 2 + 150, 20, '#ff6b9d');
}
// ===== 💀 Alle Roboter Schrott = Spiel aus → zurück in den Bus (Lobby) =====
function alleSchrott() {
  if (!tot) return false;                                          // Du lebst noch
  for (const g of mp.andere.values()) if (g.y > -10) return false;  // Ein Mitspieler lebt noch
  return helfer.every(h => h.kaputt > 0);                          // ... und kein Helfer-Bot hat mehr einen Kopf
}
function schrottPruefen(dt) {   // (Beim Gastgeber, oder wenn du allein spielst)
  if (schrottZeit >= 0) {
    schrottZeit += dt;
    if (schrottZeit > SCHROTT_ZEIT) { schrottZeit = -1; neuesSpiel(); }   // Zurück in den Bus – alles von vorn!
    return;
  }
  if (!alleSchrott()) return;
  schrottZeit = 0;
  schrottSound();
  if (mp.rolle === 'host') mpAnAlle({ t: 'schrott' });
}
function schrottSound() {   // Trauriges Tröten: wah – wah – wah – waaaah
  [392, 370, 349, 330].forEach((f, i) => ton(f, i * 0.45, i === 3 ? 1.2 : 0.4, 'sawtooth', 0.07, i === 3 ? f * 0.85 : null));
}
function zeichneSchrott() {
  const t = schrottZeit, a = Math.min(1, t / 1.2);
  ctx.fillStyle = `rgba(30,0,0,${0.82 * a})`; ctx.fillRect(0, 0, W, H);
  if (t < 0.5) return;
  ctx.globalAlpha = Math.min(1, (t - 0.5) / 0.8);
  text('💀 ALLE ROBOTER SIND SCHROTT! 💀', W / 2, H / 2 - 70, 40, '#ff6b6b');
  text('Keiner mehr da, der die Köpfe zur Abgabe bringen kann ...', W / 2, H / 2 - 25, 18, '#fff', 'center', false);
  text(`🏆 ${verkauft} Schätze verkauft · 💰 ${euro(konto)}`, W / 2, H / 2 + 15, 18, '#ffd166', 'center', false);
  text(`🚌 Der ARAG-Bus holt euch ab ... zurück in die Lobby in ${Math.max(0, Math.ceil(SCHROTT_ZEIT - t))}`, W / 2, H / 2 + 60, 17, '#7cf5c6', 'center', false);
  ctx.globalAlpha = 1;
}
function neuesSpiel() {
  level = 1; konto = 0;
  starteLevel();
}
function starteLevel(startzahl = KARTE.startzahl) {
  mitStartzahl(startzahl, baueHaus);   // Gleiche Startzahl = gleiches Haus
  if (mp.rolle === 'host') { mp.startzahl = startzahl; mpAnAlle({ t: 'start', level, seed: startzahl, konto, bots: mitBots, karte: kartenWahl }); }
  if (mp.rolle === 'gast') mpGastVorbereiten();
  energie = 100; ausdauer = AUSDAUER_MAX;
  spielZeit = 0; pause = false; zielGemeldet = false; blitzLadung = 1;
  tot = false; meinKopfId = null; neuerSchatzZeit = NEUER_SCHATZ_ALLE; schatzStartAnzahl = schaetze.length; verkauft = 0; gewinnHinweisZeit = -99;
  zustand = 'spiel';
  lobby = LOBBY_AN; introZeit = -1; einblenden = 1; schrottZeit = -1;
  if (lobby) { lobbyWillkommen(); botSchildMalen(); karteSchildMalen(); }   // Erst fährt der Bus (Lobby) ...
  else if (INTRO_AN) introStarten();     // ... ohne Lobby gleich das Intro
  else ausTuer();
  mausFangen();
}
function gewonnen() {   // 🏆 GEWONNEN!
  levelErgebnis = { verkauft, ziel: gewinnZiel(), zeit: Math.round(spielZeit), helfer: helfer.map(h => `${h.name}: ${h.abgeliefert}`).join(' · ') };
  if (konto > rekord) { rekord = konto; try { localStorage.setItem('arag-rekord', String(rekord)); } catch (e) { /* egal */ } }
  zustand = 'geschafft';
  loslassen();
  sound.geschafft();
  if (mp.rolle === 'host') mpAnAlle({ t: 'geschafft', erg: levelErgebnis, konto });
  if (document.pointerLockElement) document.exitPointerLock();
}

// =====================================================================
// ===== Zeichnen =====
// =====================================================================
function zeichne3D() {
  nebelAnpassen();
  const p = spielerKoerper.position;
  const wippen = amBoden && Math.hypot(spielerKoerper.velocity.x, spielerKoerper.velocity.z) > 0.5 ? Math.sin(zeit * 11) * (geduckt ? 0.015 : 0.03) : 0;
  const ruckeln = wackeln > 0 ? (Math.random() - 0.5) * 0.08 : 0;
  kamera.position.set(p.x + ruckeln, p.y + (geduckt ? DUCK_AUGEN : AUGEN_HOEHE) + wippen, p.z);
  if (tot) {   // Kaputt: Du schaust aus deinem Kopf (so siehst du, wer dich trägt!)
    const kopf = meinKopfId !== null ? schatzMitId(meinKopfId) : null, L = haus.laster;
    if (kopf) kamera.position.set(kopf.body.position.x, kopf.body.position.y + 0.45, kopf.body.position.z);
    else kamera.position.set((L.x1 + L.x2) / 2 + 3, 2, (L.z1 + L.z2) / 2);
  }
  kamera.rotation.set(blick.hoch, blick.links, 0);
  kamera.updateMatrixWorld();
  if (introZeit >= 0) introKamera();   // 🎬 Im Intro fliegt die Kamera durch den Wald
  else if (lobby) {   // 🚌💨 Im fahrenden Bus ruckelt es ein bisschen
    kamera.position.y += Math.sin(zeit * 11) * 0.01 + (Math.sin(zeit * 1.3) > 0.985 ? 0.035 : 0);
    kamera.rotation.z = Math.sin(zeit * 0.8) * 0.01;
    kamera.updateMatrixWorld();
  }
  for (const s of schaetze) { s.mesh.position.copy(s.body.position); s.mesh.quaternion.copy(s.body.quaternion); }
  for (const m of monster) zeigeMonster(m);
  for (const h of helfer) zeigeHelfer(h);
  mpZeigeAndere();
  andereLampenLichter();
  tuerenZeigen(1 / 60);
  if (tot && zeit - totSeit >= VERBINDUNG_WEG_ZEIT) zuschauKamera();   // Kaputt: Du schaust bei einem anderen Roboter mit zu
  // Flackernde Lampen, Kaminfeuer und Pendel
  hausGruppe.children.forEach(o => {
    if (!o.isPointLight || !o.userData.flackern) return;
    if (o.userData.flackern === 'feuer') o.intensity = o.userData.stark * (0.75 + Math.random() * 0.35);
    else o.intensity = Math.random() < 0.06 ? 0.1 : o.userData.stark;
  });
  windZeit.value = zeit;   // 🌱 Wind fürs Gras und die Blumen
  for (const d of haus.bewegteDeko) {
    if (d.userData.feuer) d.scale.y = 0.8 + Math.random() * 0.5;
    if (d.userData.pendel) d.position.x = Math.sin(zeit * 2.5) * 0.12;
    if (d.userData.blubber) {   // 🧪 Blasen im Kessel: steigen hoch, werden groß und platzen
      const B = d.userData.blubber, u = (zeit * 0.7 + B.versatz) % 1;
      d.position.set(B.x, B.y + u * 0.25, B.z); d.scale.setScalar(0.3 + u);
    }
  }
  // Dein Greifer: Ring dreht sich, Zinken schließen sich beim Greifen, alles leuchtet heller
  greifer.visible = !tot && introZeit < 0;
  greifer.position.y = -0.27 + wippen * 0.5;
  const haeltWas = gegriffen || gepackt, siehtWas = schwebend || schwebendSpieler;
  greiferRing.rotation.z += haeltWas ? 0.3 : siehtWas ? 0.08 : 0.02;
  zinken.children.forEach(z => { z.children[0].rotation.x = haeltWas ? 0.35 : 0; });
  greiferLeucht.color.set(haeltWas ? '#b6fff0' : siehtWas ? '#7cf5c6' : '#2f6b5a');
  greiferGlanz.material.opacity = haeltWas ? 0.9 : siehtWas ? 0.5 : 0.15;
  greiferGlanz.scale.setScalar(haeltWas ? 0.16 + Math.sin(zeit * 20) * 0.02 : 0.1);
  if (gegriffen) {
    const von = new THREE.Vector3(); greiferSpitze.getWorldPosition(von);
    const nach = new THREE.Vector3().copy(gegriffen.body.position);
    const richtung = new THREE.Vector3(); kamera.getWorldDirection(richtung);
    zeigeStrahl(spielerStrahl, von, nach, richtung, Math.max(...gegriffen.typ.groesse) * 0.7);
  } else if (gepackt && mp.andere.get(gepackt)?.teile) {   // Strahl zum gepackten Mitspieler
    const o = mp.andere.get(gepackt);
    const von = new THREE.Vector3(); greiferSpitze.getWorldPosition(von);
    const richtung = new THREE.Vector3(); kamera.getWorldDirection(richtung);
    zeigeStrahl(spielerStrahl, von, new THREE.Vector3(o.ax, o.ay + 0.5 + o.teile.ausgefahren, o.az), richtung, 0.9);
  } else spielerStrahl.g.visible = false;
  if (renderer) renderer.render(szene, kamera);
  else szene.updateMatrixWorld();   // Ohne 3D trotzdem alle Positionen aktualisieren
}
function aufBildschirm(v) {
  const p = v.clone().project(kamera);
  return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, vorne: p.z < 1 };
}

function zeichneHUD() {
  // 🔵 Nebeltrank: blauer Schleier vor den Augen · 🟣 Klebeschleim: lila Rand
  if (nebelZeit > 0) {
    const n = begrenzt(nebelZeit / 1.5, 0, 1);
    ctx.fillStyle = `rgba(60,140,210,${0.35 * n})`; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) {   // Wabernde Nebelflecken
      const x = W * (0.5 + Math.sin(zeit * 0.7 + k * 1.7) * 0.4), y = H * (0.5 + Math.cos(zeit * 0.5 + k * 2.3) * 0.35);
      const v = ctx.createRadialGradient(x, y, 0, x, y, 260);
      v.addColorStop(0, `rgba(170,215,255,${0.3 * n})`); v.addColorStop(1, 'rgba(170,215,255,0)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }
  if (klebZeit > 0) { ctx.strokeStyle = 'rgba(192,77,255,0.55)'; ctx.lineWidth = 26; ctx.strokeRect(0, 0, W, H); text('🟣 Du klebst fest!', W / 2, H - 170, 16, '#e0a8ff'); }
  // Weiß blitzen bei der Blitzlampe
  if (blitzHell > 0) { ctx.fillStyle = `rgba(255,255,240,${blitzHell * 0.85})`; ctx.fillRect(0, 0, W, H); }
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
  const p = tot ? kamera.position : spielerKoerper.position;
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, 12, 280, 130, 12); ctx.fill();
  text('🏚️ SPUKVILLA', 24, 30, 16, '#7cf5c6', 'left');
  const genug = konto >= WIEDERBELEBEN_PREIS;
  text(`🔧 Wiederbeleben: ${euro(WIEDERBELEBEN_PREIS)}`, 280, 30, 12, genug ? '#4ade80' : '#c9c3ff', 'right', false);
  balken(24, 50, 256, 14, konto / WIEDERBELEBEN_PREIS, genug ? '#4ade80' : '#ffd166');
  const raum = haus.raeume[begrenzt(raumNrVon(p.x, p.y, p.z), 0, haus.raeume.length - 1)] || haus.raeume[haus.start];
  const sr = haus.schule ? schulRaumBei(p.x, p.z) : null;
  text(lobby ? '📍 🚌💨 Im ARAG-Bus – unterwegs' : nachsitzen ? '📍 📝 NACHSITZEN' : sr ? `📍 ${sr.emoji} ${sr.name}` : haus.schule && imSchulhaus(p.x, p.z) ? '📍 🚶 Im Flur' : haus.schule && !schuppenBei(p.x, p.z) ? '📍 🏫 Auf dem Schulhof' : imKeller(p) ? '📍 🧪 Im Keller' : imHaus(p.x, p.z) ? `📍 ${raum.art.emoji} ${raum.art.name} · ${ETAGEN_NAMEN[raum.e]}` : schuppenBei(p.x, p.z) ? (schuppenBei(p.x, p.z).bus ? '📍 🚌 Im ARAG-Bus' : '📍 🛖 Im Gartenhäuschen') : imParkplatz(p.x, p.z) ? '📍 🅿️ Auf dem Parkplatz' : '📍 🌲 Draußen im Wald', 24, 86, 13, '#c9c3ff', 'left', false);
  if (!tot) { const tu = tuerBeiMir(); if (tu) text(`🚪 E: Tür ${tu.auf ? 'zumachen' : 'aufmachen'}`, W / 2, H / 2 + 150, 15, '#ffd166'); }
  if (lobby) zeichneLobbyHUD();
  else if (haus.bus && !tot && aufHeilplatte(p.x, p.z, p.y)) text(energie < 100 ? `🔧 Reparatur ... ${Math.floor(energie)} %` : '✅ Voll repariert!', W / 2, H / 2 + 150, 18, '#4ade80');
  const zielN = gewinnZiel(), fertig = verkauft >= zielN;
  text(`🏆 Ziel: ${Math.min(verkauft, zielN)} / ${zielN} Schätze verkauft`, 24, 108, 13, fertig ? '#4ade80' : '#ffd166', 'left', false);
  balken(24, 120, 256, 10, verkauft / zielN, fertig ? '#4ade80' : '#ffd166');
  // Oben rechts: Konto und Helfer
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(W - 282, 12, 270, 40 + helfer.length * 22, 12); ctx.fill();
  text(`💰 ${euro(konto)}`, W - 147, 32, 17, '#ffd166');
  helfer.forEach((h, k) => {
    const wo = ETAGEN_NAMEN[etageVon(h.body.position.y)] === ETAGEN_NAMEN[raum.e] ? '' : ` (${ETAGEN_NAMEN[etageVon(h.body.position.y)]})`;
    const was = h.kaputt > 1000 ? '💀 Kopf ab! Zur Abgabe bringen' : h.kaputt > 0 ? `💤 kaputt (${Math.ceil(h.kaputt)} s)` : h.modus === 'tragen' ? `trägt ${h.auftrag.typ.emoji}${wo}` : h.modus === 'hinlaufen' ? `holt ${h.auftrag.typ.emoji}${wo}` : 'wartet';
    text(`🤖 ${h.name} ${h.kaputt > 0 ? '' : '❤️'.repeat(h.leben)}: ${was}`, W - 272, 60 + k * 22, 12, h.kaputt > 0 ? '#8a8f9e' : h.farbe, 'left', false);
  });
  text(tonAn ? '🔊 M' : '🔇 M', W - 30, 68 + helfer.length * 22, 13, '#fff', 'center', false);
  mpHUD();
  if (tot) {
    ctx.fillStyle = 'rgba(40,0,0,0.75)'; rr(W / 2 - 330, H - 150, 660, 112, 14); ctx.fill();
    text(`💀 KAPUTT! (${kaputtGrund})`, W / 2, H - 122, 24, '#ff6b6b');
    text(mp.aktiv ? 'Ein Mitspieler (oder Helfer-Bot) muss deinen Kopf 🤖 zur Abgabe 🚚 bringen!' : 'Deine Helfer-Bots bringen deinen Kopf 🤖 zur Abgabe 🚚!', W / 2, H - 92, 15, '#fff', 'center', false);
    text(konto >= WIEDERBELEBEN_PREIS ? `💰 Genug Geld da (${euro(konto)}) – sobald der Kopf in der Abgabe liegt, geht's weiter!` : `💰 Noch ${euro(WIEDERBELEBEN_PREIS - konto)} sammeln fürs Wiederbeleben (${euro(WIEDERBELEBEN_PREIS)})`, W / 2, H - 68, 14, '#ffd166', 'center', false);
    if (!mp.aktiv) text('Rechtsklick = aufgeben', W / 2, H - 48, 12, '#c9c3ff', 'center', false);
  }
  // Oben Mitte: Pfeil zum Transporter (oder zur Treppe, wenn du oben bist)
  const L = haus.laster;
  let zielX = (L.x1 + L.x2) / 2, zielZ = (L.z1 + L.z2) / 2, zielText = '🚚';
  if (lobby && haus.fahrBus) { zielX = haus.fahrBus.knopf.x; zielZ = haus.fahrBus.knopf.z; zielText = '🔴 Knopf'; }
  else if (imKeller(p)) {   // Im Keller: Der Pfeil zeigt zur Kellertreppe
    const pt = treppenPunkte(haus.keller.treppe);
    zielX = pt.unten.x; zielZ = pt.unten.z; zielText = '🪜 rauf';
  } else if (raum.e > 0) {
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
  // Blitzlampe-Ladung
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, H - 104, 250, 26, 10); ctx.fill();
  text('📸', 30, H - 91, 14, '#fff', 'center', false);
  balken(48, H - 97, 160, 12, blitzLadung, blitzLadung >= 1 ? '#fff6b0' : '#8a8f9e');
  text(blitzLadung >= 1 ? 'F: Blitz!' : 'lädt ...', 214, H - 91, 11, blitzLadung >= 1 ? '#fff6b0' : '#8a8f9e', 'left', false);
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
  ctx.strokeStyle = schwebend || schwebendSpieler ? '#7cf5c6' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, schwebend || gegriffen || schwebendSpieler || gepackt ? 10 : 3, 0, 7); ctx.stroke();
  // Infos zum Mitspieler, auf den du schaust oder den du hochhältst
  const mitspieler = gepackt ? mp.andere.get(gepackt) : schwebendSpieler;
  if (mitspieler && !gegriffen) {
    ctx.fillStyle = 'rgba(10,12,18,0.75)'; rr(W / 2 - 130, H / 2 + 24, 260, 46, 10); ctx.fill();
    text(`🤖 ${mitspieler.name}`, W / 2, H / 2 + 40, 15, mitspieler.farbe);
    text(gepackt ? 'Rechtsklick: WERFEN! 🚀 · Maus los: absetzen' : 'Linksklick halten: anheben 🧲', W / 2, H / 2 + 58, 12, '#c9c3ff', 'center', true);
  }
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
  if (verkauft >= gewinnZiel() && !alleLeben() && !tot) {
    ctx.fillStyle = 'rgba(10,12,18,0.85)'; rr(W / 2 - 230, H - 70, 460, 46, 12); ctx.fill();
    text('🏆 Genug verkauft! Belebt alle wieder, dann habt ihr gewonnen!', W / 2, H - 47, 15, '#ffd166');
  }
  // Ein Monster jagt dich!
  if (gejagt()) text('⚠️ GEJAGT!', W / 2, 95, 20 + Math.sin(zeit * 10) * 2, '#ff6b6b');
  // Nachricht
  if (nachricht) {
    ctx.globalAlpha = Math.min(1, nachricht.t);
    text(nachricht.text, W / 2, H / 2 - 90, 20, nachricht.farbe);
    ctx.globalAlpha = 1;
  }
  if (pause && !werkstattOffen && !nachsitzen) {
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
  for (const s of [-1, 1]) {                                                             // Teleskop-Beine
    const tritt = Math.sin(zeit * 3 + (s > 0 ? Math.PI : 0) + x) * 3;
    ctx.fillStyle = '#9aa1ab'; ctx.fillRect(s * 13 - 3, 36, 6, 20 - Math.max(0, tritt));  // Kolbenstange
    ctx.fillStyle = farbe; rr(s * 13 - 6, 34, 12, 10, 3); ctx.fill();                    // Hülse
    ctx.fillStyle = '#1a1d22'; rr(s * 13 - 9, 54 - Math.max(0, tritt), 18, 8, 3); ctx.fill();   // Fuß
  }
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
  text('Die große Spukvilla: 72 Räume, 3 Stockwerke – und jedes Monster gibt es nur EINMAL! 👻👂🤠👹👾', W / 2, 355, 17, '#fff', 'center', false);
  text(`Schätze zur Abgabe 🚚 = sofort Geld 💰 · Kaputt? Dein Kopf 🤖 muss zur Abgabe – Wiederbeleben kostet ${euro(WIEDERBELEBEN_PREIS)}`, W / 2, 380, 14, '#ffb4b4', 'center', false);
  text('WASD: Laufen · Maus: Umschauen · Shift: Rennen (laut!) · Leertaste: Springen · C: Ducken (leise, unter Tische, durch Mauselöcher 🐭!) · F: Blitzlampe 📸 · E: Tür auf/zu 🚪', W / 2, 425, 13, '#c9c3ff', 'center', false);
  text('Linksklick halten: Greifstrahl · Rechtsklick: Werfen · Mausrad: näher/weiter', W / 2, 446, 13, '#c9c3ff', 'center', false);
  text('Tipps: Das Haus hat Treppen 🪜 – auch oben liegen Schätze! Mit der Blitzlampe (F) blendest du Monster – deine Helfer blitzen auch! 📸 Im Keller-Labyrinth wohnt Doktor Schorsch 🐷🧪', W / 2, 468, 12, '#8a8fb0', 'center', false);
  const puls = 1 + Math.sin(zeit * 4) * 0.04;
  text('▶ Klicken zum Starten', W / 2, 525, 26 * puls, '#ffd166');
  text('🌐 Mit Freunden spielen? Oben rechts einen Raum erstellen oder einen Code eingeben!', W / 2, 548, 12, '#7cf5c6', 'center', false);
  if (rekord > 0) text(`🏆 Rekord: ${euro(rekord)}`, W / 2, 572, 15, '#ffd166', 'center', false);
  if (!renderer) text('⚠️ 3D geht auf diesem Computer leider nicht (kein WebGL).', W / 2, 588, 14, '#ff6b6b');
}
function zeichneGeschafft() {
  ctx.fillStyle = 'rgba(5,8,10,0.88)'; ctx.fillRect(0, 0, W, H);
  const E = levelErgebnis || {};
  text('🏆 GEWONNEN! 🏆', W / 2, 130, 52, '#ffd166');
  zeichneRoboter(W / 2, 240, 1.1);
  text(`🎉 ${E.verkauft} Schätze verkauft (Ziel: ${E.ziel}) – und ${mp.aktiv ? 'alle sind' : 'du bist'} am Leben!`, W / 2, 340, 22, '#fff');
  if (typeof E.zeit === 'number') text(`⏱️ Zeit: ${Math.floor(E.zeit / 60)} min ${E.zeit % 60} s`, W / 2, 375, 18, '#c9c3ff');
  if (E.helfer) text(`🤖 Von deinen Helfern gebracht: ${E.helfer}`, W / 2, 405, 15, '#c9c3ff', 'center', false);
  text(`💰 Auf dem Konto: ${euro(konto)}`, W / 2, 445, 24, '#ffd166');
  if (konto >= rekord) text('🏆 Neuer Rekord!', W / 2, 480, 20, '#ffd166');
  text(mp.rolle === 'gast' ? '⏳ Warte auf den Gastgeber ...' : '▶ Klicken für ein neues Spiel', W / 2, 545, 24, '#7cf5c6');
}
function zeichneKaputt() {
  ctx.fillStyle = 'rgba(25,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
  text('🔧 ROBOTER KAPUTT! 🔧', W / 2, 170, 46, '#ff6b6b');
  text(`Erwischt von: ${kaputtGrund}`, W / 2, 240, 20, '#fff');
  text(`💰 Gesammelt: ${euro(konto)}`, W / 2, 340, 24, '#ffd166');
  text(`🏆 Rekord: ${euro(rekord)}`, W / 2, 380, 18, '#ffd166');
  text('▶ Klicken für ein neues Spiel', W / 2, 470, 24, '#7cf5c6');
}
function zeichne() {
  mpMenueZeigen(zustand === 'titel');
  ctx.clearRect(0, 0, W, H);
  zuschauRauschen(tot && zustand === 'spiel' && !pause && zeit - totSeit >= VERBINDUNG_WEG_ZEIT);   // Beim Zuschauen rauscht es immer
  if (zustand === 'titel') { zeichneTitel(); return; }
  zeichne3D();
  if (introZeit >= 0) zeichneIntro(); else zeichneHUD();
  if (einblenden > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, einblenden)})`; ctx.fillRect(0, 0, W, H); }
  if (tot && zustand === 'spiel') zeichneSignal();
  if (zustand === 'geschafft') zeichneGeschafft();
  if (schrottZeit >= 0 && zustand === 'spiel') zeichneSchrott();
  if (zustand === 'kaputt') zeichneKaputt();
}

// =====================================================================
// ===== 📡 Verbindung verloren – und dann zuschauen =====
// =====================================================================
// Wirst du erwischt, bricht die Verbindung ab: Rauschen! Danach schaust du über die Kopf-Kamera
// eines anderen Roboters zu (links am Kopf festgemacht) – mit leichten Störungen im Bild.
const VERBINDUNG_WEG_ZEIT = 2.5;   // So viele Sekunden rauscht es, bevor du zuschauen kannst
const STOER_STAERKE = 1;           // Wie stark die Störungen beim Zuschauen sind (0 = gar keine, 2 = doppelt so stark)
const ZUSCHAU_RAUSCHEN = 0.07;     // So laut rauscht es die ganze Zeit, während du zuschaust (0 = still)
let dauerRauschen = null;          // Das Rauschen, das immer läuft (wird an- und ausgedreht)
function zuschauRauschen(an) {
  if (!audio) return;
  try {
    if (!dauerRauschen) {
      if (!rauschPuffer) rauschen(0, 0.01, 0.002);   // (baut den Rausch-Puffer, falls es ihn noch nicht gibt)
      if (!rauschPuffer) return;
      const q = audio.createBufferSource(), hoch = audio.createBiquadFilter(), tief = audio.createBiquadFilter(), g = audio.createGain();
      q.buffer = rauschPuffer; q.loop = true;
      hoch.type = 'highpass'; hoch.frequency.value = 700;    // Kein Brummen, nur KSSSHHH
      tief.type = 'lowpass'; tief.frequency.value = 6000;    // Nicht zu schrill
      g.gain.value = 0;
      q.connect(hoch).connect(tief).connect(g).connect(audio.destination);
      q.start();
      dauerRauschen = { g };
    }
    // Leise schwanken (wie ein echtes Funksignal), bei Störstreifen kurz lauter
    const laut = an && tonAn ? ZUSCHAU_RAUSCHEN * (0.8 + Math.sin(zeit * 1.7) * 0.2 + (stoerBalken > 0 ? 0.8 : 0)) : 0;
    dauerRauschen.g.gain.setTargetAtTime(laut, audio.currentTime, an ? 0.05 : 0.15);
  } catch (e) { /* egal */ }
}
let totSeit = -99, zuschauNr = 0, stoerBalken = 0, naechsteStoerung = 0, rauschBilder = null;
function verbindungWeg() {
  totSeit = zeit; zuschauNr = 0; stoerBalken = 0; naechsteStoerung = zeit + VERBINDUNG_WEG_ZEIT + 1;
  // Piiiu – KRRRRSCHHHH
  ton(1200, 0, 0.12, 'square', 0.12, 150);
  rauschen(0.08, VERBINDUNG_WEG_ZEIT, 0.3, 'highpass', 900);
  rauschen(0.08, VERBINDUNG_WEG_ZEIT, 0.15, 'bandpass', 3500, null, 500);
}
function rauschBild() {   // 4 fertige Rausch-Bilder (einmal malen, dann nur noch zufällig auswählen – das geht schnell)
  if (!rauschBilder) rauschBilder = [0, 1, 2, 3].map(() => {
    const c = document.createElement('canvas'); c.width = 240; c.height = 150;
    const g = c.getContext('2d'), bild = g.createImageData(c.width, c.height);
    for (let i = 0; i < bild.data.length; i += 4) { const v = Math.random() * 255; bild.data[i] = bild.data[i + 1] = bild.data[i + 2] = v; bild.data[i + 3] = 255; }
    g.putImageData(bild, 0, 0);
    return c;
  });
  return rauschBilder[Math.floor(Math.random() * 4)];
}
function zeichneRauschen(deckkraft, y = 0, h = H) {
  if (deckkraft <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, deckkraft); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(rauschBild(), Math.random() * 60, Math.random() * 40, 180, 110 * h / H, 0, y, W, h);
  ctx.restore();
}
function zeichneZeilen(deckkraft) {   // Streifen wie bei einem alten Fernseher
  ctx.fillStyle = `rgba(0,0,0,${deckkraft})`;
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
}
function zuschauZiel() {   // Wem schaust du gerade zu? (Erst die Mitspieler, dann die Helfer-Bots – nur die, die noch heil sind)
  const ziele = [];
  for (const o of mp.andere.values()) if (o.teile && o.teile.g.visible && o.y > -10) ziele.push({ name: o.name, farbe: o.farbe, T: o.teile });
  for (const h of helfer) if (h.kaputt <= 0) ziele.push({ name: h.name, farbe: h.farbe, T: h.teile });
  return ziele.length ? ziele[zuschauNr % ziele.length] : null;
}
function zuschauKamera() {   // Die Kamera klebt links am Kopf vom anderen Roboter und schaut nach vorne
  const z = zuschauZiel();
  if (!z) return;
  const T = z.T;
  T.g.updateMatrixWorld(true);
  const pos = T.kopf.localToWorld(new THREE.Vector3(0.33, 0.03, 0.02));   // +x = links vom Roboter (neben dem Ohr)
  const vor = new THREE.Vector3(0, 0, 1).transformDirection(T.kopf.matrixWorld);
  const zucken = stoerBalken > 0 ? (Math.random() - 0.5) * 0.05 * STOER_STAERKE : 0;   // Bei Störungen ruckelt das Bild
  kamera.position.set(pos.x + zucken, pos.y, pos.z);
  kamera.rotation.set(-0.08 + zucken, Math.atan2(-vor.x, -vor.z), zucken * 2);
  kamera.updateMatrixWorld();
}
function zeichneSignal() {
  const seit = zeit - totSeit;
  // 1) Verbindung verloren: alles rauscht!
  if (seit < VERBINDUNG_WEG_ZEIT) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    zeichneRauschen(seit < 0.15 ? 1 : 0.85);
    zeichneZeilen(0.3);
    const balkenY = (zeit * 260) % (H + 80) - 40;   // Ein heller Streifen läuft durchs Bild
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(0, balkenY, W, 40);
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; rr(W / 2 - 270, H / 2 - 75, 540, 140, 12); ctx.fill();
    if (Math.sin(zeit * 14) > -0.4) text('📡 VERBINDUNG VERLOREN', W / 2 + (Math.random() - 0.5) * 8, H / 2 - 28, 38, '#ff4d4d');
    text(`Erwischt von: ${kaputtGrund}`, W / 2, H / 2 + 14, 16, '#fff', 'center', false);
    text('Suche Signal' + '.'.repeat(1 + Math.floor(zeit * 3) % 3), W / 2, H / 2 + 42, 14, '#c9c3ff', 'center', false);
    return;
  }
  // 2) Zuschauen über die Kopf-Kamera eines anderen Roboters – mit leichten Störungen
  const z = zuschauZiel();
  if (!z) {   // Niemand mehr da ...
    zeichneRauschen(0.4); zeichneZeilen(0.2);
    text('📡 KEIN SIGNAL – keine Kamera mehr an', W / 2, 140, 20, '#ff6b6b');
    return;
  }
  const st = STOER_STAERKE;
  zeichneRauschen((0.08 + Math.random() * 0.04) * st);   // Es rauscht immer ein bisschen
  zeichneZeilen(0.1 * st);
  if (zeit > naechsteStoerung) {   // Ab und zu: KRZZT! Ein Störstreifen
    naechsteStoerung = zeit + 1.5 + Math.random() * 3;
    stoerBalken = 0.15 + Math.random() * 0.15;
    if (st > 0) rauschen(0, stoerBalken, 0.05 * st, 'highpass', 2000);
  }
  if (stoerBalken > 0) {
    stoerBalken -= 1 / 60;
    const by = Math.random() * H, bh = 20 + Math.random() * 60;
    zeichneRauschen(0.5 * st, by, bh);
    ctx.fillStyle = `rgba(124,245,198,${0.08 * st})`; ctx.fillRect(0, by + bh, W, 6);
  }
  // Dunkler Rand (wie bei einer kleinen Kamera)
  const rand = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  rand.addColorStop(0, 'rgba(0,0,0,0)'); rand.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = rand; ctx.fillRect(0, 0, W, H);
  // Kamera-Schild
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(W / 2 - 200, H - 214, 400, 56, 10); ctx.fill();
  if (Math.sin(zeit * 5) > 0) { ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(W / 2 - 180, H - 196, 6, 0, 7); ctx.fill(); }
  text(`LIVE · 📷 Kopf-Kamera: ${z.name}`, W / 2 + 8, H - 196, 16, z.farbe);
  text('🖱️ Klick = anderer Kamera zuschauen', W / 2, H - 172, 11, '#c9c3ff', 'center', false);
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
  if (werkstattOffen) { if ((k === 'e' || k === 'escape') && !e.repeat) werkstattZu(); return; }
  if (nachsitzen) { if (!e.repeat && ['1', '2', '3', '4'].includes(k)) testAntwort(Number(k) - 1); return; }   // 📝 Im Test: nur antworten!   // 🎨 In der Werkstatt läufst du nicht herum
  tasten[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (k === 'm') tonAn = !tonAn;
  if (k === 'f') blitzen();
  if (k === 'n' && mp.aktiv && VOICE_AN) { voice.aus = !voice.aus; zeigeNachricht(voice.aus ? '🔇 Voice-Chat AUS (du hörst niemanden, und keiner hört dich)' : '🎙️ Voice-Chat AN – halte V gedrückt zum Sprechen', 3); }
  if (introZeit >= 0 && [' ', 'enter', 'escape', 'e'].includes(k)) { introEnde(); return; }   // 🎬 Intro überspringen
  if (k === 'e' && zustand === 'spiel' && lobby && lobbyKnopf()) {   // 🔴 LOS! oder 🤖 Bots an/aus oder 🎨 Werkstatt
    if (lobbyKnopf() === 'pc') werkstattAuf();
    else if (lobbyKnopf() === 'karte') { if (mp.rolle === 'gast') mpSende({ t: 'karteBitte' }); else karteSetzen(kartenWahl === 'schule' ? 'villa' : 'schule'); }
    else if (lobbyKnopf() === 'los') { if (mp.rolle === 'gast') mpSende({ t: 'losBitte' }); else losGehts(); }
    else if (mp.rolle === 'gast') mpSende({ t: 'botsBitte' }); else botsSetzen(!mitBots);
    return;
  }
  if (k === 'e' && zustand === 'spiel' && !tot && !pause) { const d = tuerBeiMir(); if (d) tuerSetzen(d, !d.auf, 'spieler'); }   // 🚪 Tür auf/zu
});
addEventListener('keyup', e => { tasten[e.key.toLowerCase()] = false; });
addEventListener('keydown', e => { if (e.key.toLowerCase() === VOICE_TASTE && !e.repeat) voiceMikroHolen(); });   // (Beim ersten Mal fragt der Browser nach dem Mikro)
addEventListener('blur', () => { for (const k in tasten) tasten[k] = false; });
canvas.addEventListener('pointerdown', e => {
  tonStart();
  if (nachsitzen || werkstattOffen) return;   // (Da wird im Menü geklickt)
  if (zustand === 'titel') { if (mp.rolle !== 'gast') neuesSpiel(); return; }
  if (zustand === 'geschafft') { if (mp.rolle !== 'gast') neuesSpiel(); return; }
  if (zustand === 'kaputt') { zustand = 'titel'; return; }
  if (introZeit >= 0) { introEnde(); mausFangen(); return; }   // 🎬 Klick = Intro überspringen
  if (pause || !mausGefangen) { pause = false; mausFangen(); return; }
  if (tot) {
    if (!mp.aktiv && e.button === 2) { zustand = 'kaputt'; if (document.pointerLockElement) document.exitPointerLock(); }   // Allein: Rechtsklick = aufgeben
    else if (e.button === 0 && zeit - totSeit > VERBINDUNG_WEG_ZEIT) { zuschauNr++; stoerBalken = 0.3; rauschen(0, 0.3, 0.12, 'highpass', 1500); }   // Klick: anderer Kamera zuschauen
    return;
  }
  if (e.button === 0 && schwebend && !gegriffen && !(mp.aktiv && mpVonAnderemGehalten(schwebend))) greifen(schwebend);
  else if (e.button === 0 && schwebendSpieler && !gegriffen && !gepackt) spielerPacken(schwebendSpieler);
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

// =====================================================================
// ===== Multiplayer (mit PeerJS) =====
// =====================================================================
// So funktioniert's: Einer macht einen Raum auf (der Gastgeber) und bekommt einen Code, z. B. "K7PX".
// Die anderen geben den Code ein und sind dabei. Der Computer vom Gastgeber rechnet ALLES
// (Monster, Helfer, Schätze) und schickt es 15-mal pro Sekunde an alle. Die Gäste schicken zurück, wo sie gerade sind.
// Zum Finden benutzt PeerJS einen kostenlosen Vermittlungs-Server. Danach reden die Computer direkt miteinander.
// PeerJS wird erst geladen, wenn jemand auf "Raum erstellen" oder "Beitreten" klickt.
const MP_MAX_SPIELER = 4;      // So viele Spieler passen in einen Raum (mit Gastgeber)
const MP_SENDE_RATE = 15;      // So oft pro Sekunde wird verschickt, wo alles ist
const MP_PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const MP_VORSILBE = 'arag-spukhaus-';   // Damit unsere Raum-Codes nicht mit anderen Spielen zusammenstoßen
const MP_ROBOTER = [           // Namen und Farben der Spieler-Roboter
  { name: 'Chef', farbe: '#7cf5c6' },
  { name: 'Blitz', farbe: '#ffe66d' },
  { name: 'Kolben', farbe: '#b388ff' },
  { name: 'Zahnrad', farbe: '#ff8a65' },
];
const meinName = () => eigenerName || (mp.aktiv ? MP_ROBOTER[mp.nr || 0].name : 'Du');
const mp = { aktiv: false, rolle: null, code: '', peer: null, conn: null, andere: new Map(), sendeZeit: 0, nr: 0, zaehler: 0, startzahl: 0, abfahrZeit: 0 };
const r2 = v => Math.round(v * 100) / 100;   // Auf 2 Kommastellen runden (spart Daten)
const mpEl = {
  box: document.getElementById('mp'), erstellen: document.getElementById('mp-erstellen'),
  name: document.getElementById('mp-name'), code: document.getElementById('mp-code'), beitreten: document.getElementById('mp-beitreten'), status: document.getElementById('mp-status'),
};
function mpMenueZeigen(an) {
  if (!mpEl.box) return;
  const d = an ? 'flex' : 'none';
  if (mpEl.box.style.display !== d) mpEl.box.style.display = d;
}
function mpStatus(t) { if (mpEl.status) mpEl.status.textContent = t; }
function mpFehlerText(e) {
  if (e && e.type === 'network' || e && e.type === 'server-error') return 'Keine Verbindung zum Vermittlungs-Server (Internet?)';
  if (e && e.type === 'browser-incompatible') return 'Dein Browser kann das leider nicht';
  return (e && (e.type || e.message)) || 'unbekannt';
}
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
const schatzMitId = id => schaetze.find(s => s.id === id) || null;
function mpGaeste() {   // Nur beim Gastgeber: alle Gäste, die schon im Haus sind
  if (mp.rolle !== 'host') return [];
  const liste = [];
  for (const g of mp.andere.values()) if (g.y > -10) liste.push(g);
  return liste;
}
function mpVonAnderemGehalten(s) {
  if (s.gastHaelt) return true;
  for (const a of mp.andere.values()) if (a.hg === s.id) return true;
  return false;
}
function mpAnAlle(nachricht) {
  for (const g of mp.andere.values()) mpSendeAn(g, nachricht);
}
function mpSendeAn(g, nachricht) {
  try { if (g.conn && g.conn.open) g.conn.send(nachricht); } catch (e) { /* egal */ }
}
function mpSende(nachricht) {   // Gast -> Gastgeber
  try { if (mp.conn && mp.conn.open) mp.conn.send(nachricht); } catch (e) { /* egal */ }
}
function lookAnwenden(o, lk) {   // 🎨🎩 Farbe, Hut und Extra eines Mitspielers merken
  o.look = lk; o.hut = lk.hut; o.extra = lk.extra;
  o.farbe = lk.farbe || MP_ROBOTER[o.nr]?.farbe || '#7cf5c6';
}
function mpMeshWeg(o) {
  if (o.teile) szene.remove(o.teile.g);
  if (o.strahl) szene.remove(o.strahl.g);
  o.teile = null; o.strahl = null;
}
function mpBeenden() {
  for (const id of [...voice.anrufe.keys()]) voiceAuflegen(id);   // 🎙️ Alle Anrufe beenden
  voice.spricht = false;
  for (const o of mp.andere.values()) mpMeshWeg(o);
  mp.andere.clear();
  try { if (mp.peer) mp.peer.destroy(); } catch (e) { /* egal */ }
  Object.assign(mp, { aktiv: false, rolle: null, code: '', peer: null, conn: null, nr: 0 });
}
function mpVerbindungWeg(text) {
  const warImSpiel = mp.aktiv;
  mpBeenden();
  mpStatus('❌ ' + text);
  if (warImSpiel) {
    zustand = 'titel';
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

// ----- Gastgeber -----
async function mpRaumErstellen(versuch = 0) {
  if (mp.peer && versuch === 0) return;
  mpStatus('⏳ Raum wird erstellt ...');
  try { await mpLadePeerJS(); } catch (e) { mpStatus('❌ Multiplayer konnte nicht geladen werden (Internet?)'); return; }
  const code = mpNeuerCode();
  const peer = new window.Peer(MP_VORSILBE + code);
  mp.peer = peer; voicePeer(peer);
  peer.on('open', () => {
    Object.assign(mp, { aktiv: true, rolle: 'host', code, nr: 0 });
    mpStatus(`✅ Raum ${code} ist offen!`);
    neuesSpiel();
    zeigeNachricht(`🌐 Dein Raum-Code: ${code} – sag ihn deinen Freunden!`, 8, '#7cf5c6');
  });
  peer.on('connection', conn => mpNeuerGast(conn));
  peer.on('disconnected', () => { try { if (mp.peer === peer) peer.reconnect(); } catch (e) { /* egal */ } });
  peer.on('error', e => {
    if (e.type === 'unavailable-id' && versuch < 3) { peer.destroy(); mpRaumErstellen(versuch + 1); return; }   // Code schon vergeben? Neuer Code!
    if (!mp.aktiv) { peer.destroy(); mp.peer = null; mpStatus('❌ ' + mpFehlerText(e)); }
  });
}
function mpNeuerGast(conn) {
  conn.on('open', () => {
    const belegt = new Set([...mp.andere.values()].map(g => g.nr));
    let nr = 1;
    while (belegt.has(nr)) nr++;
    if (nr >= MP_MAX_SPIELER) { conn.send({ t: 'voll' }); setTimeout(() => conn.close(), 500); return; }
    const g = { id: conn.peer, conn, nr, ...MP_ROBOTER[nr], x: 0, y: -50, z: 0, w: 0, dk: false, hg: -1, hz: null, k: null, r: null };
    const wunsch = nameSauber(conn.metadata && conn.metadata.name);
    if (wunsch) g.name = wunsch;   // 🏷️ Der Gast hat sich einen eigenen Namen ausgesucht
    lookAnwenden(g, lookSauber(conn.metadata && conn.metadata.look));   // 🎨🎩 ... und sein Aussehen
    mp.andere.set(g.id, g);
    conn.send({ t: 'hallo', nr, code: mp.code });
    conn.send({ t: 'start', level, seed: mp.startzahl, konto, bots: helfer.length > 0, karte: kartenWahl });
    zeigeNachricht(`🤖 ${g.name} ist dem Raum beigetreten!`, 3);
    sound.abgabe();
  });
  conn.on('data', d => { const g = mp.andere.get(conn.peer); if (g) mpVomGast(g, d); });
  conn.on('close', () => mpGastWeg(conn.peer));
  conn.on('error', () => mpGastWeg(conn.peer));
}
function mpGastWeg(id) {
  const g = mp.andere.get(id);
  if (!g) return;
  mpMeshWeg(g);
  mp.andere.delete(id);
  zeigeNachricht(`👋 ${g.name} hat den Raum verlassen`, 3, '#c9c3ff');
}
function mpVomGast(g, d) {
  if (!d || !d.t) return;
  if (d.t === 'name') { const n = nameSauber(d.name); if (n) g.name = n; return; }
  if (d.t === 'look') { lookAnwenden(g, lookAusArray(d.lk)); return; }
  if (d.t === 'p') Object.assign(g, { x: d.x, y: d.y, z: d.z, w: d.w, n: d.n || 0, vo: d.vo || 0, dk: d.dk, hg: d.hg, pg: d.pg || null, hz: d.hz, k: d.k, r: d.r });
  else if (zustand !== 'spiel') return;
  else if (d.t === 'l') laerm(d.x, d.y, d.z, d.st);
  else if (d.t === 'tuerE') tuerSetzen(tuerListe[d.id], !!d.auf, 'spieler');   // Ein Gast hat E gedrückt
  else if (d.t === 'tot') {   // Ein Gast ist kaputt: Sein Kopf fällt hin
    neuerKopf(g.id, g.farbe, d.x, d.y + 0.3, d.z);
    const t = `💀 ${g.name} ist kaputt (${d.von})! Bringt den Kopf 🤖 zur Abgabe 🚚`;
    zeigeNachricht(t, 4, '#ff6b6b'); mpAnAlle({ t: 'info', text: t, farbe: '#ff6b6b' });
  }
  else if (d.t === 'wurf') {
    const s = schatzMitId(d.id);
    if (s) { s.body.velocity.set(d.v[0], d.v[1], d.v[2]); s.geworfen = 1.5; s.body.wakeUp(); }
    g.hg = -1;
  } else if (d.t === 'losBitte') losGehts();
  else if (d.t === 'karteBitte') karteSetzen(kartenWahl === 'schule' ? 'villa' : 'schule');   // 🗺️ Ein Gast will die andere Karte   // 🔴 Ein Gast hat im Bus den Knopf gedrückt
  else if (d.t === 'botsBitte') botsSetzen(!mitBots);   // 🤖 Ein Gast hat den Bot-Schalter gedrückt
  else if (d.t === 'blitz') {   // Ein Gast blitzt: Monster blenden, und alle sehen seine Lampe aufblitzen
    blitzVon(new THREE.Vector3(...d.p), new THREE.Vector3(...d.r).normalize(), false);
    g.blitzHell = 1;
    sound.blitz(lautBei({ x: d.p[0], y: d.p[1], z: d.p[2] }));
    mpAnAlle({ t: 'blitzSicht', id: g.id });
  }
  else if (d.t === 'wirf') {   // Ein Gast wirft jemanden: Bin ich das? Sonst weiterleiten
    if (d.ziel === mp.peer.id) geworfenWerden(d.v, g.name);
    else { const z = mp.andere.get(d.ziel); if (z) mpSendeAn(z, { t: 'wirf', v: d.v, von: g.name }); }
  }
}
// Gäste halten Schätze mit ihrem Greifstrahl – die Physik dafür rechnet der Gastgeber
function mpGastSchaetzeHalten() {
  if (mp.rolle !== 'host') return;
  for (const s of schaetze) s.gastHaelt = null;
  for (const g of mp.andere.values()) {
    if (g.hg < 0 || !g.hz) continue;
    const s = schatzMitId(g.hg);
    if (!s || s === gegriffen || s.gastHaelt) { mpSendeAn(g, { t: 'los' }); g.hg = -1; continue; }
    if (s.getragenVon) helferLoslassen(s.getragenVon);
    s.gastHaelt = g;
    if (!zieheSchatz(s, new THREE.Vector3(g.hz[0], g.hz[1], g.hz[2]))) { mpSendeAn(g, { t: 'los', abgerissen: true }); g.hg = -1; }
  }
}
function mpTreffer(g, schaden, von, m, schubs) {   // Ein Monster hat einen Gast erwischt
  mpSendeAn(g, { t: 'au', s: schaden, von, wx: r2(g.x - m.x), wz: r2(g.z - m.z), sb: schubs });
}
function mpHostSendet() {
  if (zustand !== 'spiel' || !mp.andere.size) return;
  mp.zaehler++;
  const p = spielerKoerper.position, rad = geduckt ? DUCK_RADIUS : KOERPER_RADIUS;
  const hz = gepackt ? halteZiel() : null;
  const sp = [{ id: mp.peer.id, nr: 0, na: meinName(), lk: lookArray(aussehen), x: r2(p.x), y: tot ? -50 : r2(p.y - rad), z: r2(p.z), w: r2(blick.links), n: r2(blick.hoch), vo: voice.spricht ? 1 : 0, dk: geduckt, hg: gegriffen ? gegriffen.id : -1,
    pg: gepackt, hz: hz ? [r2(hz.x), r2(hz.y), r2(hz.z)] : null }];
  for (const g of mp.andere.values()) if (g.y > -10) sp.push({ id: g.id, nr: g.nr, na: g.name, lk: lookArray(g.look || {}), x: g.x, y: g.y, z: g.z, w: g.w, n: g.n || 0, vo: g.vo || 0, dk: g.dk, hg: g.hg, pg: g.pg || null, hz: g.pg ? g.hz : null });
  const mo = monster.map(m => [r2(m.x), r2(m.y), r2(m.z), r2(m.winkel), m.modus, m.betaeubt > 0 ? 1 : 0, r2(m.zielen), m.laeuft ? 1 : 0,
    r2(m.bewegtSeit), m.gesehen ? 1 : 0, m.nachladen > 0 ? 1 : 0, m.laserZiel ? [r2(m.laserZiel.x), r2(m.laserZiel.y), r2(m.laserZiel.z)] : null, m.tarnTyp ?? -1]);
  const he = helfer.map(h => {
    const q = h.body.position;
    return [r2(q.x), r2(q.y), r2(q.z), r2(h.winkel), h.modus, Math.ceil(Math.max(0, h.kaputt)), h.leben, h.auftrag ? h.auftrag.id : -1, h.angst > 0 ? 1 : 0, h.wackelt > 0 ? 1 : 0, h.froh > 0 ? 1 : 0];
  });
  // Schätze: nur die, die sich bewegt haben (einmal pro Sekunde alle)
  const alle = mp.zaehler % MP_SENDE_RATE === 0, sc = [];
  for (const s of schaetze) {
    const b = s.body, q = b.quaternion;
    const a = [s.id, r2(b.position.x), r2(b.position.y), r2(b.position.z), r2(q.x), r2(q.y), r2(q.z), r2(q.w), s.wert];
    const alt = s.mpAlt;
    if (alle || !alt || a.some((v, i) => Math.abs(v - alt[i]) > 0.004)) { sc.push(a); s.mpAlt = a; }
  }
  mpAnAlle({ t: 's', sp, mo, he, sc, ko: konto, vk: verkauft, lb: lobby ? 1 : 0, tu: alle ? tuerListe.filter(x => x.auf).map(x => x.id) : null, ids: alle ? schaetze.map(x => x.id) : null,
    koepfe: alle ? schaetze.filter(x => x.typ.id === 'kopf').map(x => [x.id, x.besitzer, x.typ.farbe]) : null,
    neu: alle ? schaetze.filter(x => x.typ.id !== 'kopf').map(x => [x.id, x.typ.id]) : null });
}

// ----- Gast -----
async function mpBeitreten() {
  const code = (mpEl.code ? mpEl.code.value : '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { mpStatus('Der Code hat 4 Zeichen, z. B. K7PX'); return; }
  if (mp.peer) return;
  mpStatus('⏳ Verbinde ...');
  try { await mpLadePeerJS(); } catch (e) { mpStatus('❌ Multiplayer konnte nicht geladen werden (Internet?)'); return; }
  const peer = new window.Peer();
  mp.peer = peer; voicePeer(peer);
  peer.on('open', () => {
    const conn = peer.connect(MP_VORSILBE + code, { serialization: 'json', reliable: true, metadata: { name: eigenerName, look: aussehen } });
    mp.conn = conn;
    conn.on('open', () => { Object.assign(mp, { aktiv: true, rolle: 'gast', code }); mpStatus('✅ Verbunden! Das Haus wird gebaut ...'); });
    conn.on('data', d => mpVomHost(d));
    conn.on('close', () => { if (mp.conn === conn) mpVerbindungWeg('Die Verbindung zum Gastgeber ist weg.'); });
  });
  peer.on('error', e => {
    if (mp.peer !== peer) return;
    mpVerbindungWeg(e.type === 'peer-unavailable' ? 'Raum nicht gefunden – stimmt der Code?' : mpFehlerText(e));
  });
}
function mpGastVorbereiten() {
  // Beim Gast bewegt der Gastgeber die Schätze und Helfer – hier sind sie "kinematisch" (sie schubsen, werden aber nicht geschubst)
  for (const s of schaetze) { s.body.type = CANNON.Body.KINEMATIC; s.body.velocity.set(0, 0, 0); s.body.angularVelocity.set(0, 0, 0); s.body.wakeUp(); }
  for (const h of helfer) { h.body.type = CANNON.Body.KINEMATIC; h.body.velocity.set(0, 0, 0); }
  spielerKoerper.position.x += mp.nr * 0.9;   // Nicht alle auf denselben Fleck
}
function mpSchatzWeg(s) {
  s.kaputt = true;
  if (gegriffen === s) loslassen();
  welt.removeBody(s.body);
  szene.remove(s.mesh);
  schaetze = schaetze.filter(x => x !== s);
}
function mpVomHost(d) {
  if (!d || !d.t) return;
  if (d.t === 'hallo') { mp.nr = d.nr; return; }
  if (d.t === 'nachsitzen') { nachsitzenStart(); return; }   // 👨‍🏫 Der Lehrer hat MICH erwischt!
  if (d.t === 'voll') { mpVerbindungWeg('Der Raum ist voll (höchstens 4 Spieler).'); return; }
  if (d.t === 'start') {
    level = d.level; konto = d.konto;
    if (typeof d.bots === 'boolean') mitBots = d.bots;   // (Der Gastgeber bestimmt, ob Bots mitspielen)
    if (KARTEN[d.karte]) kartenWahl = d.karte;            // ... und wohin die Fahrt geht
    starteLevel(d.seed);
    zeigeNachricht(`🌐 Du bist ${meinName()}! Raum ${mp.code} – Level ${level}`, 4, MP_ROBOTER[mp.nr].farbe);
    return;
  }
  if (d.t === 'geschafft') {
    levelErgebnis = d.erg;
    konto = d.konto;
    if (konto > rekord) { rekord = konto; try { localStorage.setItem('arag-rekord', String(rekord)); } catch (e) { /* egal */ } }
    zustand = 'geschafft';
    loslassen();
    sound.geschafft();
    if (document.pointerLockElement) document.exitPointerLock();
    return;
  }
  if (zustand !== 'spiel') return;
  if (d.t === 's') mpSchnappschuss(d);
  else if (d.t === 'tuer') tuerSetzen(tuerListe[d.id], d.auf, d.w, true);
  else if (d.t === 'kaputt') { const s = schatzMitId(d.id); if (s && !s.kaputt) zerbrechen(s); }
  else if (d.t === 'sag') { const h = helfer[d.h]; if (h) helferSpricht(h, d.satz); }
  else if (d.t === 'blitzSicht') {   // Jemand hat geblitzt (ein Helfer oder ein Mitspieler)
    if (d.h !== undefined) { const h = helfer[d.h]; if (h) helferBlitzEffekt(h); }
    else if (d.id !== mp.peer.id) { const o = mp.andere.get(d.id); if (o) { o.blitzHell = 1; sound.blitz(lautBei({ x: o.x, y: o.y, z: o.z })); } }
  }
  else if (d.t === 'schuss') { const m = monster[d.m]; if (m) schussEffekt(m, new THREE.Vector3(...d.z), d.tr); }
  else if (d.t === 'los') losGehts();   // 🔴 Einer hat den Knopf gedrückt!
  else if (d.t === 'bots') botsSetzen(d.an);   // 🤖 Bots an/aus
  else if (d.t === 'schrott') { if (schrottZeit < 0) { schrottZeit = 0; schrottSound(); } }   // 💀 Alle sind Schrott! (Der Gastgeber startet gleich neu)
  else if (d.t === 'trank') trankStart(d.id, d.art, d.p, d.v);                  // 🧪 Der Chemiker wirft
  else if (d.t === 'platsch') trankPlatsch(d.id, d.art, d.p[0], d.p[1], d.p[2]);   // ... und der Trank zerplatzt
  else if (d.t === 'au') {
    getroffen(d.s, d.von);
    const l = Math.hypot(d.wx, d.wz) || 1;
    spielerKoerper.velocity.set(d.wx / l * d.sb, 3, d.wz / l * d.sb);
  } else if (d.t === 'wirf') geworfenWerden(d.v, d.von);
  else if (d.t === 'leben') spielerWiederbeleben();
  else if (d.t === 'info') { if (!(tot && d.text.startsWith('💀'))) zeigeNachricht(d.text, 4, d.farbe || '#7cf5c6'); }
  else if (d.t === 'verkauft') {
    sound.abgabe(); schwebeText(d.x, d.y + 0.6, d.z, d.text, '#7cf5c6');
    const s = schatzMitId(d.id); if (s) mpSchatzWeg(s);
  }
  else if (d.t === 'los') { loslassen(); if (d.abgerissen) zeigeNachricht('Der Strahl ist abgerissen!', 1.5, '#ffd166'); }
}
function mpSchnappschuss(d) {
  // Die anderen Spieler
  const da = new Set();
  for (const a of d.sp) {
    if (a.id === mp.peer.id) continue;
    da.add(a.id);
    let o = mp.andere.get(a.id);
    if (!o) { o = { id: a.id, nr: a.nr, ...MP_ROBOTER[a.nr] }; mp.andere.set(a.id, o); }
    if (a.na) o.name = nameSauber(a.na) || o.name;   // 🏷️ Sein Name
    if (a.lk) lookAnwenden(o, lookAusArray(a.lk));     // 🎨🎩 Sein Aussehen
    Object.assign(o, { x: a.x, y: a.y, z: a.z, w: a.w, n: a.n || 0, vo: a.vo || 0, dk: a.dk, hg: a.hg, pg: a.pg || null, hz: a.hz || null });
  }
  for (const [id, o] of mp.andere) if (!da.has(id)) { mpMeshWeg(o); mp.andere.delete(id); }
  // Monster
  d.mo.forEach((a, i) => {
    const m = monster[i];
    if (!m) return;
    Object.assign(m, { zx: a[0], zy: a[1], zz: a[2], zw: a[3], modus: a[4], betaeubt: a[5], zielen: a[6], laeuft: !!a[7], bewegtSeit: a[8], gesehen: !!a[9], nachladen: a[10] });
    m.laserZiel = a[11] ? { x: a[11][0], y: a[11][1], z: a[11][2] } : null;
    if (a[12] >= 0) m.tarnTyp = a[12];   // 👾 Als welcher Schatz ist der Formwandler getarnt?
  });
  // Helfer
  d.he.forEach((a, i) => {
    const h = helfer[i];
    if (!h) return;
    Object.assign(h, { zx: a[0], zy: a[1], zz: a[2], zw: a[3], modus: a[4], kaputt: a[5], leben: a[6], angst: a[8], wackelt: a[9], froh: a[10] });
    h.auftrag = a[7] >= 0 ? schatzMitId(a[7]) : null;
    if (!h.auftrag) h.modus = 'suchen';
  });
  if (d.lb === 0 && lobby) losGehts();   // Der Gastgeber hat schon losgelegt
  // Schätze
  if (typeof d.vk === 'number') verkauft = d.vk;
  if (d.tu) { const offen = new Set(d.tu); for (const t of tuerListe) if (t.auf !== offen.has(t.id)) tuerSetzen(t, offen.has(t.id), 'sync', true); }
  if (typeof d.ko === 'number') { konto = d.ko; if (konto > rekord) { rekord = konto; try { localStorage.setItem('arag-rekord', String(rekord)); } catch (e) { /* egal */ } } }
  // Neue Schätze und Köpfe, die der Gastgeber hat, ich aber noch nicht
  for (const [id, typId] of d.neu || []) if (!schatzMitId(id)) { const typ = SCHAETZE.find(t => t.id === typId); if (typ) neuerSchatz(typ, 0, -40, 0).id = id; }
  for (const [id, besitzer, farbe] of d.koepfe || []) if (!schatzMitId(id)) neuerKopf(besitzer, farbe, 0, -40, 0, id);
  for (const a of d.sc) { const s = schatzMitId(a[0]); if (s) { s.ziel = a; s.wert = a[8]; } }
  if (d.ids) { const gibt = new Set(d.ids); for (const s of [...schaetze]) if (!gibt.has(s.id)) mpSchatzWeg(s); }
}
const winkelHin = (von, nach, f) => {   // Einen Winkel weich zu einem anderen drehen (den kurzen Weg!)
  let diff = nach - von;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return von + diff * f;
};
const mpQuat = new CANNON.Quaternion();
function updateAlsGast(dt) {
  spielZeit += dt;
  if (schrottZeit >= 0) schrottZeit = Math.min(SCHROTT_ZEIT, schrottZeit + dt);   // (Nur fürs Anzeigen – neu starten tut der Gastgeber)
  busUpdate(dt);
  if (introZeit >= 0) introUpdate(dt);
  if (!pause && introZeit < 0) updateSpieler(dt);
  gehaltenWerden(dt);
  packenPruefen();
  const f = Math.min(1, dt * 12);
  // Alles weich dorthin schieben, wo der Gastgeber es hat
  for (const s of schaetze) {
    if (!s.ziel) continue;
    const a = s.ziel, b = s.body;
    if (Math.hypot(a[1] - b.position.x, a[2] - b.position.y, a[3] - b.position.z) > 3) b.position.set(a[1], a[2], a[3]);
    else b.position.set(b.position.x + (a[1] - b.position.x) * f, b.position.y + (a[2] - b.position.y) * f, b.position.z + (a[3] - b.position.z) * f);
    mpQuat.set(a[4], a[5], a[6], a[7]).normalize();
    b.quaternion.slerp(mpQuat, f, b.quaternion);
  }
  for (const h of helfer) {
    h.redePause -= dt; h.redet = Math.max(0, h.redet - dt); h.blasenZeit -= dt;
    if (h.zx === undefined) continue;
    const b = h.body.position;
    b.set(b.x + (h.zx - b.x) * f, b.y + (h.zy - b.y) * f, b.z + (h.zz - b.z) * f);
    h.winkel = winkelHin(h.winkel, h.zw, f);
  }
  for (const m of monster) {
    m.phase += dt;
    if (m.zx === undefined) continue;
    m.x += (m.zx - m.x) * f; m.y += (m.zy - m.y) * f; m.z += (m.zz - m.z) * f;
    m.winkel = winkelHin(m.winkel, m.zw, f);
    monsterGeraeusche(m, dt);
  }
  if (gegriffen && gegriffen.kaputt) loslassen();
  updateTraenke(dt);
  updatePfuetzen(dt);
  welt.step(1 / 60, dt, 3);
  totParken();
  pruefeBoden();
  if (spielerKoerper.position.y < -ETAGE_HOEHE - 1.5) { spielerKoerper.position.set(haus.spawn.x, 0.6, haus.spawn.z); spielerKoerper.velocity.set(0, 0, 0); }
  updateSchussSpuren(dt);
  blitzLadung = Math.min(1, blitzLadung + dt / BLITZ_LADEN);
  if (blitzHell > 0) { blitzHell = Math.max(0, blitzHell - dt * 3); taschenlampe.intensity = 6 + blitzHell * 80; taschenlampe.angle = 0.55 + blitzHell * 0.35; }
  herzZeit -= dt;
  if (gejagt() && herzZeit <= 0) { herzZeit = 0.7; sound.herz(0.8); }
  updateEffekte(dt);
}
function mpGastSendet() {
  if (zustand !== 'spiel') return;
  const p = spielerKoerper.position, rad = geduckt ? DUCK_RADIUS : KOERPER_RADIUS;
  const r = new THREE.Vector3(); kamera.getWorldDirection(r);
  const k = kamera.position, hz = gegriffen || gepackt ? halteZiel() : null;
  mpSende({ t: 'p', x: r2(p.x), y: tot ? -50 : r2(p.y - rad), z: r2(p.z), w: r2(blick.links), n: r2(blick.hoch), vo: voice.spricht ? 1 : 0, dk: geduckt, hg: gegriffen ? gegriffen.id : -1, pg: gepackt,
    hz: hz ? [r2(hz.x), r2(hz.y), r2(hz.z)] : null, k: [r2(k.x), r2(k.y), r2(k.z)], r: [r2(r.x), r2(r.y), r2(r.z)] });
}

// ----- Für beide -----
function mpUpdate(dt) {
  if (!mp.aktiv) return;
  mp.sendeZeit -= dt;
  if (mp.sendeZeit > 0) return;
  mp.sendeZeit = 1 / MP_SENDE_RATE;
  if (mp.rolle === 'host') mpHostSendet(); else mpGastSendet();
}
function mpZeigeAndere() {   // Die Roboter der anderen Spieler zeichnen
  for (const o of mp.andere.values()) {
    if (o.y === undefined || o.y < -10) { if (o.teile) { o.teile.g.visible = false; o.strahl.g.visible = false; } continue; }   // Kaputt oder noch nicht da
    const lookKey = [o.farbe, o.hut || '', o.extra || ''].join('|');
    if (o.teile && o.lookKey !== lookKey) mpMeshWeg(o);   // 🎨🎩 Neues Aussehen? Roboter neu bauen!
    if (!o.teile) {
      o.teile = baueHelferMesh({ name: o.name, farbe: o.farbe, hut: o.hut, extra: o.extra });
      o.lookKey = lookKey; o.schildName = o.name;
      o.strahl = neuerStrahl(o.farbe, 0.025);
      o.geraet = baueGreifGeraet(o.farbe); o.geraet.position.set(0, -0.02, 0.33); o.teile.arme[0].add(o.geraet);   // 🔫 Greifer in die rechte Hand
      o.teile.g.traverse(k => { k.userData.spielerId = o.id; });   // Damit der Greifstrahl weiß, wer das ist
      Object.assign(o, { gesicht: o.teile.gesicht, kaputt: 0, angst: 0, froh: 0, redet: 0, blinzelVersatz: Math.random() * 3, ax: o.x, ay: o.y, az: o.z, aw: o.w });
    }
    o.teile.g.visible = introZeit < 0;
    if (o.schildName !== o.name) { if (o.schildName !== undefined) namensSchildNeu(o.teile, o.name, o.farbe); o.schildName = o.name; }   // 🏷️ Name geändert?
    const f = 0.25;
    o.ax += (o.x - o.ax) * f; o.ay += (o.y - o.ay) * f; o.az += (o.z - o.az) * f;
    o.aw = winkelHin(o.aw, o.w, f);
    const T = o.teile, wink = o.aw + Math.PI;   // Die Kamera schaut nach -Z, die Roboter nach +Z
    T.g.position.set(o.ax, o.ay, o.az);
    T.g.rotation.set(0, wink, 0);
    beineAnimieren(T, o.dk ? 0 : BEIN_LAENGE, true, 1 / 60);   // (Wie schnell er läuft, misst der Roboter selbst)   // Geduckt: Beine einfahren!
    duckForm(T, o.dk, 1 / 60);   // 🐭 ... und Kopf + Körper einziehen
    const haelt = o.hg >= 0 ? schatzMitId(o.hg) : null;
    // Hält er einen Mitspieler hoch? (vielleicht sogar DICH!)
    const packtPos = !o.pg ? null : o.pg === mp.peer.id ? spielerKoerper.position : mp.andere.get(o.pg) ? (q => ({ x: q.ax, y: q.ay + 0.6, z: q.az }))(mp.andere.get(o.pg)) : null;
    T.arme[1].rotation.x = 0.9 - T.armSchwung;   // Linker Arm schwingt beim Laufen
    // Rechter Arm mit dem Greifer: zielt auf das, was er hält – sonst dahin, wohin der Spieler schaut
    const zielPunkt = haelt ? haelt.body.position : packtPos ? new THREE.Vector3(packtPos.x, packtPos.y, packtPos.z) : null;
    if (zielPunkt) armZielt(T, T.arme[0], zielPunkt);
    else { T.arme[0].rotation.order = 'YXZ'; T.arme[0].rotation.set(-(o.ahoch || 0) + 0.15 + T.armSchwung * 0.2, 0, 0); }
    const G = o.geraet.userData, haeltWas = !!zielPunkt;
    G.ring.rotation.z += haeltWas ? 0.3 : 0.03;
    G.zinken.children.forEach(z => { z.children[0].rotation.x = haeltWas ? -0.35 : 0; });   // Zinken zu beim Halten
    G.spitze.scale.setScalar(haeltWas ? 1.6 + Math.sin(zeit * 20) * 0.3 : 1);
    T.antenne.visible = (zeit * 2 + o.blinzelVersatz) % 1.5 < 1.2;
    T.lampen.forEach((l, k) => { l.visible = (zeit * 3 + k) % 3 > 0.6; });
    o.redet = o.vo ? 1 : 0;   // 🎙️ Spricht er gerade? Dann bewegt sich sein Bildschirm-Mund!
    malGesicht(o);
    o.ahoch = (o.ahoch || 0) + ((o.n || 0) - (o.ahoch || 0)) * f;   // Wohin schaut er hoch/runter? (weich)
    o.blitzHell = Math.max(0, (o.blitzHell || 0) - 3 / 60);
    kopflampeZeigen(T, true, o.ahoch, o.blitzHell);
    lookAnimieren(T, 1 / 60);
    if (zielPunkt) {   // ⚡ Der Strahl kommt aus der Spitze vom Greifer
      o.geraet.updateMatrixWorld(true);
      const von = G.spitze.getWorldPosition(new THREE.Vector3());
      const richtung = new THREE.Vector3(0, 0, 1).transformDirection(o.geraet.matrixWorld);
      zeigeStrahl(o.strahl, von, new THREE.Vector3().copy(zielPunkt), richtung, haelt ? Math.max(...haelt.typ.groesse) * 0.6 : 0.9);
    } else o.strahl.g.visible = false;
  }
}
// ----- Mitspieler mit dem Greifstrahl anheben 🧲 -----
// Wer packt, schickt seinen Strahl-Punkt mit. Der Gepackte wird auf SEINEM Computer dorthin gezogen.
const SPIELER_WURF = 10;   // So stark wirfst du einen Mitspieler
function schauAufSpieler() {   // Schaust du gerade auf einen Mitspieler?
  if (!mp.aktiv) return null;
  const ziele = [];
  for (const o of mp.andere.values()) if (o.teile) ziele.push(o.teile.g);
  if (!ziele.length) return null;
  greifStrahl.setFromCamera(MITTE, kamera);
  greifStrahl.far = GREIF_WEITE;
  const treffer = greifStrahl.intersectObjects([...ziele, ...sichtBlocker], true);
  if (!treffer.length) return null;
  let k = treffer[0].object;
  while (k && k.userData.spielerId === undefined) k = k.parent;
  return k ? mp.andere.get(k.userData.spielerId) || null : null;
}
function spielerPacken(o) {
  gepackt = o.id; packZeit = zeit;
  halteAbstand = begrenzt(kamera.position.distanceTo(new THREE.Vector3(o.x, o.y + 0.5, o.z)), 1.5, 3);
  sound.strahl();
}
function packenPruefen() {   // Hat sich der Gepackte losgerissen (zu weit weg)?
  if (!gepackt) return;
  const o = mp.andere.get(gepackt);
  if (!o) { gepackt = null; return; }
  if (zeit - packZeit < 1.5) return;   // Am Anfang hat er noch Zeit, herzufliegen
  const z = halteZiel();
  if (Math.hypot(o.x - z.x, o.y + 0.5 - z.y, o.z - z.z) > 3.5) { gepackt = null; zeigeNachricht(`💪 ${o.name} hat sich losgerissen!`, 2, o.farbe); }
}
function spielerWerfen() {
  const r = new THREE.Vector3();
  kamera.getWorldDirection(r);
  const v = [r2(r.x * SPIELER_WURF), r2(r.y * SPIELER_WURF + 4), r2(r.z * SPIELER_WURF)];
  const o = mp.andere.get(gepackt);
  if (mp.rolle === 'host') { if (o) mpSendeAn(o, { t: 'wirf', v, von: meinName() }); }
  else mpSende({ t: 'wirf', ziel: gepackt, v });
  if (o) zeigeNachricht(`🚀 ${o.name} fliegt!`, 1.5, o.farbe);
  gepackt = null;
  sound.sprung();
}
function geworfenWerden(v, von) {
  freiZeit = 1;   // Kurz nicht mehr festgehalten
  spielerKoerper.velocity.set(v[0], v[1], v[2]);
  zeigeNachricht(`🚀 ${von} hat dich geworfen! Wiiiiii!`, 2, '#ffd166');
  sound.sprung();
}
// 🚧 Niemand kommt über den Zaun – egal ob hochgehoben, geworfen oder gesprungen (der Zaun reicht unsichtbar bis zum Himmel)
const ZAUN_INNEN = 0.5;   // So weit bleibst du mindestens vom Zaun weg
function imZaun(x, z) {   // Den Punkt (x, z) zurück hinter den Zaun schieben
  if (haus.schule) { const M = haus.schule; return { x: begrenzt(x, M.x0 + 0.5, M.x1 - 0.5), z: begrenzt(z, M.z0 + 0.5, M.z1 - 0.5) }; }   // 📚 Die Schule
  const M = WALD_RAND - ZAUN_INNEN, B = haus.breit * RAUM, T = haus.tief * RAUM;
  return { x: begrenzt(x, -M, B + M), z: begrenzt(z, -M, T + M) };
}
function zaunHalten() {
  if (lobby || introZeit >= 0 || !haus || tot || nachsitzen) return;   // (Beim Nachsitzen bist du im Nachsitz-Zimmer – weit weg)   // (Die Lobby ist weit weg, und im Intro fährt der Bus erst rein – da gilt der Zaun nicht)
  const p = spielerKoerper.position, v = spielerKoerper.velocity, q = imZaun(p.x, p.z);
  if (q.x !== p.x) { p.x = q.x; v.x = 0; }
  if (q.z !== p.z) { p.z = q.z; v.z = 0; }
}
function gehaltenWerden(dt) {   // Hält mich gerade jemand mit seinem Strahl hoch?
  zaunHalten();
  if (!mp.aktiv || !mp.peer) return;
  freiZeit -= dt;
  let packer = null;
  for (const o of mp.andere.values()) if (o.pg === mp.peer.id && o.hz) { packer = o; break; }
  if (packer && packer !== mp.packer) { zeigeNachricht(`🧲 ${packer.name} hat dich gepackt! Leertaste = losreißen`, 2.5, packer.farbe); sound.strahl(); }
  mp.packer = packer;
  if (!packer || freiZeit > 0) return;
  if (tasten[' ']) {   // Zappeln und losreißen!
    freiZeit = 1.5;
    spielerKoerper.velocity.y = SPRUNG;
    zeigeNachricht('💪 Losgerissen!', 1.5, '#4ade80');
    return;
  }
  // Zum Strahl-Punkt ziehen (wie bei einem Schatz)
  const p = spielerKoerper.position, ziel = lobby ? { x: packer.hz[0], z: packer.hz[2] } : imZaun(packer.hz[0], packer.hz[2]);   // (Nicht hinter den Zaun ziehen!)
  let vx = (ziel.x - p.x) * 8, vy = (packer.hz[1] - p.y) * 8, vz = (ziel.z - p.z) * 8;
  const l = Math.hypot(vx, vy, vz);
  if (l > 9) { vx *= 9 / l; vy *= 9 / l; vz *= 9 / l; }
  spielerKoerper.velocity.set(vx, vy, vz);
}
// =====================================================================
// ===== 🎙️ Voice-Chat: Sprechen mit V (gedrückt halten), je näher, desto lauter =====
// =====================================================================
// So geht's: Jeder ruft jeden an (über PeerJS, wie der Mehrspieler). Was du schickst, ist erst mal STILLE.
// Nur solange du V gedrückt hältst, kommt dein Mikrofon dazu. Die Stimmen der anderen kommen "aus ihren Robotern".
const voice = { aus: false, spricht: false, mikro: null, mikroFehler: false, raus: null, mikroLaut: null, anrufe: new Map() };
function voiceRaus() {   // Das, was wir schicken: ein Strom aus dem Web-Audio (am Anfang still)
  if (voice.raus || !audio || !audio.createMediaStreamDestination) return voice.raus;
  voice.raus = audio.createMediaStreamDestination();
  voice.mikroLaut = audio.createGain(); voice.mikroLaut.gain.value = 0;
  voice.mikroLaut.connect(voice.raus);
  return voice.raus;
}
async function voiceMikroHolen() {   // Erst wenn du zum ersten Mal V drückst, fragt der Browser nach dem Mikrofon
  if (!VOICE_AN || !mp.aktiv || voice.aus || voice.mikro || voice.mikroFehler || voice.holt) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { voice.mikroFehler = true; return; }
  tonStart(); voiceRaus();
  voice.holt = true;
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    voice.mikro = audio.createMediaStreamSource(strom);
    voice.mikro.connect(voice.mikroLaut);
    zeigeNachricht('🎙️ Mikro bereit! Halte V gedrückt, um zu sprechen.', 3);
  } catch (e) {
    voice.mikroFehler = true;
    zeigeNachricht('🎙️ Kein Mikrofon erlaubt – du kannst die anderen trotzdem hören.', 4, '#ffd166');
  }
  voice.holt = false;
}
function voicePeer(peer) {   // Wenn jemand anruft: annehmen (wir schicken erst mal Stille)
  peer.on('call', call => {
    if (!VOICE_AN) { try { call.close(); } catch (e) { /* egal */ } return; }
    const raus = voiceRaus();
    if (!raus) { try { call.close(); } catch (e) { /* egal */ } return; }
    call.answer(raus.stream);
    voiceAnrufMerken(call.peer, call);
  });
}
function voiceAnrufMerken(id, call) {
  const alt = voice.anrufe.get(id);
  if (alt && alt.call !== call) voiceAuflegen(id);
  const A = { call, seit: zeit, verbunden: false };
  voice.anrufe.set(id, A);
  call.on('stream', strom => voiceAbspielen(A, strom));
  call.on('close', () => { if (voice.anrufe.get(id) === A) voiceAuflegen(id); });
  call.on('error', () => { if (voice.anrufe.get(id) === A) voiceAuflegen(id); });
}
function voiceAbspielen(A, strom) {   // Die Stimme kommt "aus dem Roboter": Lautstärke nach Abstand, Richtung (links/rechts) und dumpf durch Wände
  if (A.verbunden || !audio) return;
  A.verbunden = true;
  A.el = new Audio(); A.el.srcObject = strom; A.el.muted = true; A.el.play().catch(() => {});   // (Chrome braucht das, sonst bleibt es stumm)
  A.quelle = audio.createMediaStreamSource(strom);
  A.dumpf = audio.createBiquadFilter(); A.dumpf.type = 'lowpass'; A.dumpf.frequency.value = 18000;
  A.raum = audio.createPanner(); Object.assign(A.raum, { panningModel: 'HRTF', distanceModel: 'linear', refDistance: 2, maxDistance: VOICE_WEITE, rolloffFactor: 1 });
  A.laut = audio.createGain(); A.laut.gain.value = 1;
  A.quelle.connect(A.dumpf).connect(A.raum).connect(A.laut).connect(audio.destination);
}
function voiceAuflegen(id) {
  const A = voice.anrufe.get(id);
  if (!A) return;
  voice.anrufe.delete(id);
  try { A.call.close(); } catch (e) { /* egal */ }
  try { if (A.laut) A.laut.disconnect(); if (A.quelle) A.quelle.disconnect(); } catch (e) { /* egal */ }
  if (A.el) { A.el.srcObject = null; }
}
function setzePos(p, x, y, z) { if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z); }
function voiceUpdate() {   // Jedes Bild: anrufen, wen wir noch nicht hören · Lautstärke und Richtung anpassen
  if (!VOICE_AN || !mp.aktiv || !mp.peer || !audio) { voice.spricht = false; return; }
  // Sprechen nur, solange V gedrückt ist (und nicht im Menü/Pause, und nicht als Kaputter – die Toten schweigen 👻)
  voice.spricht = !!(voice.mikro && !voice.aus && tasten[VOICE_TASTE] && zustand === 'spiel' && !tot);
  if (voice.mikroLaut) voice.mikroLaut.gain.setTargetAtTime(voice.spricht ? 1 : 0, audio.currentTime, 0.03);
  // Wen müssen wir anrufen? (Damit nicht beide gleichzeitig anrufen: Wer die "kleinere" ID hat, ruft an)
  const raus = voiceRaus(), ich = mp.peer.id;
  for (const o of mp.andere.values()) {
    const A = voice.anrufe.get(o.id);
    if (A && !A.verbunden && zeit - A.seit > 10) voiceAuflegen(o.id);   // Hat nicht geklappt – nochmal versuchen
    if (!voice.anrufe.has(o.id) && raus && ich && ich < o.id && zeit - (o.voiceVersuch || -99) > 5) {
      o.voiceVersuch = zeit;
      try { voiceAnrufMerken(o.id, mp.peer.call(o.id, raus.stream)); } catch (e) { /* später nochmal */ }
    }
  }
  for (const id of [...voice.anrufe.keys()]) if (!mp.andere.has(id)) voiceAuflegen(id);   // Wer weg ist, wird aufgelegt
  // Du hörst mit den Ohren der Kamera
  const L = audio.listener, v = new THREE.Vector3(); kamera.getWorldDirection(v);
  setzePos(L, kamera.position.x, kamera.position.y, kamera.position.z);
  if (L.forwardX) { L.forwardX.value = v.x; L.forwardY.value = v.y; L.forwardZ.value = v.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else L.setOrientation(v.x, v.y, v.z, 0, 1, 0);
  for (const [id, A] of voice.anrufe) {
    if (!A.raum) continue;
    const o = mp.andere.get(id);
    if (!o || o.ax === undefined) continue;
    const mund = { x: o.ax, y: o.ay + 1.0, z: o.az };
    setzePos(A.raum, mund.x, mund.y, mund.z);
    A.laut.gain.setTargetAtTime(voice.aus || !tonAn ? 0 : 1, audio.currentTime, 0.05);
    if (VOICE_WAND_DUMPF && zeit - (A.wandZeit || 0) > 0.3) {   // Ist eine Wand dazwischen? Dann klingt es dumpf
      A.wandZeit = zeit;
      const frei = abstand3D(mund, kamera.position) > VOICE_WEITE || freieSicht(kamera.position.clone(), new THREE.Vector3(mund.x, mund.y, mund.z));
      A.dumpf.frequency.setTargetAtTime(frei ? 18000 : 700, audio.currentTime, 0.1);
    }
  }
}
function voiceHUD(zeilen) {   // Unter der Spielerliste: Wie funktioniert's? Wer spricht?
  if (!VOICE_AN) return;
  const y = 148 + zeilen * 18 + 6;
  if (voice.aus) { text('🔇 Voice-Chat aus (N = an)', 24, y, 12, '#8a8f9e', 'left', false); return; }
  if (voice.spricht) text('🔴 🎙️ Du sprichst ...', 24, y, 13, '#ff6b6b', 'left', false);
  else text(voice.mikroFehler ? '🎙️ Kein Mikro · N = Voice aus' : '🎙️ V halten = sprechen · N = aus', 24, y, 12, '#c9c3ff', 'left', false);
  const sprecher = [...mp.andere.values()].filter(o => o.vo).map(o => o.name);
  if (sprecher.length) text(`🔊 ${sprecher.join(', ')} spricht`, 24, y + 18, 12, '#7cf5c6', 'left', false);
}
function mpHUD() {
  if (!mp.aktiv) return;
  const namen = [{ name: meinName(), farbe: meineFarbe() }, ...[...mp.andere.values()].map(o => ({ name: o.name, farbe: o.farbe }))];
  ctx.fillStyle = 'rgba(10,12,18,0.8)'; rr(12, 112, 280, 30 + namen.length * 18 + (VOICE_AN ? 40 : 0), 12); ctx.fill();
  text(`🌐 Raum ${mp.code} · ${namen.length} Spieler${mp.rolle === 'host' ? ' · du bist Gastgeber' : ''}`, 24, 128, 13, '#7cf5c6', 'left', false);
  namen.forEach((n, k) => text(`🤖 ${n.name}${k === 0 ? ' (du)' : ''}`, 24, 148 + k * 18, 12, n.farbe, 'left', false));
  voiceHUD(namen.length);
}
if (mpEl.erstellen) mpEl.erstellen.addEventListener('click', () => { tonStart(); mpRaumErstellen(); });
if (mpEl.beitreten) mpEl.beitreten.addEventListener('click', () => { tonStart(); mpBeitreten(); });
if (mpEl.name) {   // 🏷️ Namensfeld: Was du eintippst, wird gespeichert
  mpEl.name.maxLength = NAME_MAX;
  mpEl.name.value = eigenerName;
  mpEl.name.addEventListener('keydown', e => e.stopPropagation());
  mpEl.name.addEventListener('input', () => nameSetzen(mpEl.name.value));
}
if (mpEl.code) mpEl.code.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { tonStart(); mpBeitreten(); } });
addEventListener('beforeunload', () => { try { if (mp.peer) mp.peer.destroy(); } catch (e) { /* egal */ } });

// ===== Spielschleife =====
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, Math.max(0, (jetzt - letzte) / 1000));
  letzte = jetzt;
  zeit += dt;
  // Wenn irgendwo ein Fehler passiert, soll das Spiel nicht einfrieren (der Fehler steht dann in der Konsole, F12)
  try {
    update(dt);
    if (zustand === 'spiel' && !pause) {
      schwebend = gegriffen || gepackt ? null : schauAuf();
      schwebendSpieler = gegriffen || gepackt || schwebend ? null : schauAufSpieler();
    }
  } catch (e) { console.error('Fehler in update:', e); }
  try { puppeUpdate(dt); testUpdate(dt); } catch (e) { console.error('Fehler bei der Puppe/beim Test:', e); }
  try { zeichne(); } catch (e) { console.error('Fehler beim Zeichnen:', e); }
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
