// 🗺️ Die Karten für "Wolf im Schafspelz"
//
// Jede Karte hat 6 Orte. Jeder Ort hat ein Mini-Spiel:
//   'heu'    = auf Sachen klicken
//   'kurbel' = Kurbel im Kreis drehen
//   'eimer'  = Eimer füllen und im grünen Bereich loslassen
//   'wolle'  = Wollknäuel in den Korb ziehen
//   'blumen' = Blumen gießen
//   'zaun'   = Nägel reinhauen
//
// ✨ "beweis: true" = Beweis-Aufgabe! Wenn ein Schaf sie schafft, leuchtet es hell auf
//   und alle in der Nähe sehen: Das ist ein echtes Schaf! (Wölfe können sie nicht machen.)
//
// "bild" sagt, wie der Ort aussieht:
//   'stall', 'muehle', 'teich', 'scheune', 'wiese', 'garten',
//   'krippe', 'iglu', 'glashaus', 'brunnen', 'leuchtturm', 'boot',
//   Raumschiff: 'kantine', 'reaktor', 'tank', 'fracht', 'kuppel', 'cockpit'
// Mit "farben" kannst du bei manchen Bildern die Farben ändern.
//
// "gruben" sind die Löcher, durch die nur Wölfe schleichen können.
// Sie sind der Reihe nach verbunden (die letzte führt wieder zur ersten).
// "himmel" sind die Farben vom Himmel in der Cutscene (oben, unten).
// "weltall: true" = Raumschiff! Gruben sind dann Lüftungsschächte und
// wer rausgewählt wird, fliegt durch die Luftschleuse ins All.
// "rauswurf" = So wird ein Schaf beim Herden-Treffen rausgeworfen:
//   'katapult', 'schlitten', 'floss' oder 'schleuse' (ohne: einfach durchs Gatter weg)
// "woerter" tauscht Wörter im Spiel aus (z. B. 'Grube' → 'Schacht').
// "waende" sind Rechtecke, durch die keiner durchlaufen kann: { x, y, b (Breite), h (Höhe) }.
//   Damit baut man Räume und Gänge! (Die Computer-Schafe finden den Weg dann selbst.)
//
// Die Welt ist 1800 breit und 1300 hoch.

const KARTEN = [
  {
    name: 'Bauernhof', himmel: ['#3b2a6b', '#ff9a62'], emoji: '🌾', rauswurf: 'katapult',
    boden: '#6abf4b', weg: '#c8a96b', platz: '#d6bb82', rand: 'zaun', deko: 'blumen',
    treffpunkt: { x: 900, y: 680 },
    laterne: { x: 160, y: 690 },
    gatter: { x: 1690, y: 690 },
    gruben: [{ x: 600, y: 470 }, { x: 1220, y: 470 }, { x: 1220, y: 900 }, { x: 600, y: 900 }],
    orte: [
      { name: 'Stall',        bei: 'beim Stall',          x: 320,  y: 300,  aufgabe: 'Heu fressen',     labelY: -225, spiel: 'heu',    bild: 'stall' },
      { name: 'Mühle',        bei: 'bei der Mühle',       x: 900,  y: 300,  aufgabe: 'Korn mahlen',     labelY: -265, spiel: 'kurbel', bild: 'muehle', beweis: true },
      { name: 'Teich',        bei: 'beim Teich',          x: 1480, y: 320,  aufgabe: 'Wasser trinken',  labelY: -195, spiel: 'eimer',  bild: 'teich' },
      { name: 'Scheune',      bei: 'bei der Scheune',     x: 320,  y: 1080, aufgabe: 'Wolle abgeben',   labelY: -255, spiel: 'wolle',  bild: 'scheune' },
      { name: 'Blumenwiese',  bei: 'auf der Blumenwiese', x: 900,  y: 1120, aufgabe: 'Blumen gießen',   labelY: -145, spiel: 'blumen', bild: 'wiese' },
      { name: 'Gemüsegarten', bei: 'im Gemüsegarten',     x: 1480, y: 1080, aufgabe: 'Zaun reparieren', labelY: -200, spiel: 'zaun',   bild: 'garten' },
    ],
  },
  {
    name: 'Winterdorf', himmel: ['#0f1a33', '#5a76a8'], emoji: '❄️', rauswurf: 'schlitten',
    boden: '#eef4fa', weg: '#b8c7d6', platz: '#d5e1ec', rand: 'zaun', deko: 'tannen', schnee: true,
    treffpunkt: { x: 880, y: 650 },
    laterne: { x: 560, y: 420 },
    gatter: { x: 1690, y: 640 },
    gruben: [{ x: 230, y: 300 }, { x: 1230, y: 560 }, { x: 1650, y: 1180 }, { x: 720, y: 900 }],
    orte: [
      { name: 'Futterkrippe',      bei: 'bei der Futterkrippe',   x: 300,  y: 640,  aufgabe: 'Heu fressen',          labelY: -175, spiel: 'heu',    bild: 'krippe' },
      { name: 'Windrad',           bei: 'beim Windrad',           x: 900,  y: 290,  aufgabe: 'Korn mahlen',          labelY: -265, spiel: 'kurbel', bild: 'muehle', beweis: true },
      { name: 'Eisloch',           bei: 'beim Eisloch',           x: 1450, y: 300,  aufgabe: 'Wasser holen',         labelY: -195, spiel: 'eimer',  bild: 'teich', farben: ['#7fb8d8', '#bfe3f5'] },
      { name: 'Iglu',              bei: 'beim Iglu',              x: 420,  y: 1080, aufgabe: 'Wolle abgeben',        labelY: -165, spiel: 'wolle',  bild: 'iglu' },
      { name: 'Gewächshaus',       bei: 'im Gewächshaus',         x: 1020, y: 1110, aufgabe: 'Blumen gießen',        labelY: -225, spiel: 'blumen', bild: 'glashaus' },
      { name: 'Schlittenschuppen', bei: 'beim Schlittenschuppen', x: 1500, y: 960,  aufgabe: 'Schlitten reparieren', labelY: -255, spiel: 'zaun',   bild: 'scheune', farben: ['#6b4f3a', '#ffffff'] },
    ],
  },
  {
    name: 'Schafsinsel', himmel: ['#2a3f7a', '#ffb36b'], emoji: '🏝️', rauswurf: 'floss',
    boden: '#f0d9a0', weg: '#dcc086', platz: '#e6cc90', rand: 'meer', deko: 'palmen',
    treffpunkt: { x: 900, y: 660 },
    laterne: { x: 1560, y: 640 },
    gatter: { x: 220, y: 660 },
    gruben: [{ x: 600, y: 480 }, { x: 1230, y: 470 }, { x: 1230, y: 880 }, { x: 600, y: 880 }],
    orte: [
      { name: 'Fischerhütte', bei: 'bei der Fischerhütte', x: 320,  y: 300,  aufgabe: 'Seegras fressen', labelY: -225, spiel: 'heu',    bild: 'stall', farben: ['#3a8fb7', '#1f5f7a'] },
      { name: 'Brunnen',      bei: 'beim Brunnen',         x: 900,  y: 300,  aufgabe: 'Wasser holen',    labelY: -205, spiel: 'eimer',  bild: 'brunnen' },
      { name: 'Leuchtturm',   bei: 'beim Leuchtturm',      x: 1480, y: 320,  aufgabe: 'Licht kurbeln',   labelY: -290, spiel: 'kurbel', bild: 'leuchtturm', beweis: true },
      { name: 'Muschelmarkt', bei: 'auf dem Muschelmarkt', x: 330,  y: 1060, aufgabe: 'Wolle abgeben',   labelY: -255, spiel: 'wolle',  bild: 'scheune', farben: ['#e67e22', '#c0392b'] },
      { name: 'Palmengarten', bei: 'im Palmengarten',      x: 900,  y: 1100, aufgabe: 'Blumen gießen',   labelY: -145, spiel: 'blumen', bild: 'wiese' },
      { name: 'Bootssteg',    bei: 'am Bootssteg',         x: 1480, y: 1060, aufgabe: 'Boot reparieren', labelY: -245, spiel: 'zaun',   bild: 'boot' },
    ],
  },
  {
    name: 'Spaceship Mäh', himmel: ['#05060f', '#1b2350'], emoji: '🚀', rauswurf: 'schleuse',
    boden: '#5b6474', weg: '#3a4150', platz: '#7c8798', rand: 'all', deko: 'raumschiff', weltall: true,
    treffpunkt: { x: 900, y: 660 },
    laterne: { x: 1560, y: 660 },
    gatter: { x: 240, y: 660 },
    // Lüftungsschächte: in den Ecken der vier äußeren Räume
    gruben: [{ x: 470, y: 400 }, { x: 1330, y: 400 }, { x: 1330, y: 1200 }, { x: 470, y: 1200 }],
    // 🧱 Oben 3 Räume, unten 3 Räume, in der Mitte der Hauptgang mit der Glocke.
    // Jeder Raum hat eine Tür zum Hauptgang und kleine Seitengänge zum Nachbarraum.
    waende: [
      // Wand zwischen den oberen Räumen und dem Hauptgang (Türen bei x 250–390, 830–970, 1410–1550)
      { x: 0, y: 470, b: 250, h: 90 }, { x: 390, y: 470, b: 440, h: 90 }, { x: 970, y: 470, b: 440, h: 90 }, { x: 1550, y: 470, b: 250, h: 90 },
      // Wand zwischen dem Hauptgang und den unteren Räumen
      { x: 0, y: 760, b: 250, h: 120 }, { x: 390, y: 760, b: 440, h: 120 }, { x: 970, y: 760, b: 440, h: 120 }, { x: 1550, y: 760, b: 250, h: 120 },
      // Dicke Wände zwischen den oberen Räumen (mit Seitengang bei y 230–350)
      { x: 540, y: 0, b: 160, h: 230 }, { x: 540, y: 350, b: 160, h: 120 }, { x: 1100, y: 0, b: 160, h: 230 }, { x: 1100, y: 350, b: 160, h: 120 },
      // Dicke Wände zwischen den unteren Räumen (mit Seitengang bei y 1000–1120)
      { x: 540, y: 880, b: 160, h: 120 }, { x: 540, y: 1120, b: 160, h: 180 }, { x: 1100, y: 880, b: 160, h: 120 }, { x: 1100, y: 1120, b: 160, h: 180 },
    ],
    woerter: [
      ['Die Herde ist durchs offene Gatter weggelaufen!', 'Die Herde ist durch die offene Luftschleuse ins All geflogen!'],
      ['vom Hof gejagt', 'aus dem Raumschiff geworfen'], ['den Hof verlassen', 'das Raumschiff verlassen'], ['Der Hof ist sicher', 'Das Raumschiff ist sicher'],
      ['in die Grube', 'in den Schacht'], ['In die Grube', 'In den Schacht'], ['in eine Grube', 'in einen Schacht'],
      ['in der Grube', 'im Schacht'], ['In der Grube', 'Im Schacht'], ['In Gruben', 'In Schächte'], ['in die 🕳️ Gruben', 'in die 🕳️ Schächte'],
      ['Grubensprünge', 'Schachtsprünge'], ['Gruben', 'Schächte'], ['Grube', 'Schacht'],
      ['die Laterne', 'das Licht'], ['Laterne', 'Licht'],
      ['Das Gatter ist offen', 'Die Luftschleuse ist offen'], ['das Gatter', 'die Luftschleuse'], ['Gatter', 'Luftschleuse'],
      ['Der Nebel', 'Der Rauch'], ['Nebel', 'Rauch'],
      ['PLUMPS!', 'KLONK!'],
    ],
    orte: [
      { name: 'Kantine',         bei: 'in der Kantine',       x: 320,  y: 300,  aufgabe: 'Weltraum-Heu fressen', labelY: -215, spiel: 'heu',    bild: 'kantine' },
      { name: 'Reaktor',         bei: 'beim Reaktor',         x: 900,  y: 300,  aufgabe: 'Reaktor ankurbeln',    labelY: -255, spiel: 'kurbel', bild: 'reaktor', beweis: true },
      { name: 'Wassertank',      bei: 'beim Wassertank',      x: 1480, y: 320,  aufgabe: 'Wasser tanken',        labelY: -225, spiel: 'eimer',  bild: 'tank' },
      { name: 'Frachtraum',      bei: 'im Frachtraum',        x: 320,  y: 1080, aufgabe: 'Wolle verladen',       labelY: -215, spiel: 'wolle',  bild: 'fracht' },
      { name: 'Weltraumgarten',  bei: 'im Weltraumgarten',    x: 900,  y: 1110, aufgabe: 'Blumen gießen',        labelY: -205, spiel: 'blumen', bild: 'kuppel' },
      { name: 'Cockpit',         bei: 'im Cockpit',           x: 1480, y: 1080, aufgabe: 'Steuerpult reparieren', labelY: -215, spiel: 'zaun',  bild: 'cockpit' },
    ],
  },
];
