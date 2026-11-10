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
// "bild" sagt, wie der Ort aussieht:
//   'stall', 'muehle', 'teich', 'scheune', 'wiese', 'garten',
//   'krippe', 'iglu', 'glashaus', 'brunnen', 'leuchtturm', 'boot'
// Mit "farben" kannst du bei manchen Bildern die Farben ändern.
//
// Die Welt ist 1800 breit und 1300 hoch.

const KARTEN = [
  {
    name: 'Bauernhof', emoji: '🌾',
    boden: '#6abf4b', weg: '#c8a96b', platz: '#d6bb82', rand: 'zaun', deko: 'blumen',
    treffpunkt: { x: 900, y: 680 },
    laterne: { x: 160, y: 690 },
    gatter: { x: 1690, y: 690 },
    orte: [
      { name: 'Stall',        bei: 'beim Stall',          x: 320,  y: 300,  aufgabe: 'Heu fressen',     labelY: -225, spiel: 'heu',    bild: 'stall' },
      { name: 'Mühle',        bei: 'bei der Mühle',       x: 900,  y: 300,  aufgabe: 'Korn mahlen',     labelY: -265, spiel: 'kurbel', bild: 'muehle' },
      { name: 'Teich',        bei: 'beim Teich',          x: 1480, y: 320,  aufgabe: 'Wasser trinken',  labelY: -195, spiel: 'eimer',  bild: 'teich' },
      { name: 'Scheune',      bei: 'bei der Scheune',     x: 320,  y: 1080, aufgabe: 'Wolle abgeben',   labelY: -255, spiel: 'wolle',  bild: 'scheune' },
      { name: 'Blumenwiese',  bei: 'auf der Blumenwiese', x: 900,  y: 1120, aufgabe: 'Blumen gießen',   labelY: -145, spiel: 'blumen', bild: 'wiese' },
      { name: 'Gemüsegarten', bei: 'im Gemüsegarten',     x: 1480, y: 1080, aufgabe: 'Zaun reparieren', labelY: -200, spiel: 'zaun',   bild: 'garten' },
    ],
  },
  {
    name: 'Winterdorf', emoji: '❄️',
    boden: '#eef4fa', weg: '#b8c7d6', platz: '#d5e1ec', rand: 'zaun', deko: 'tannen', schnee: true,
    treffpunkt: { x: 880, y: 650 },
    laterne: { x: 560, y: 420 },
    gatter: { x: 1690, y: 640 },
    orte: [
      { name: 'Futterkrippe',      bei: 'bei der Futterkrippe',   x: 300,  y: 640,  aufgabe: 'Heu fressen',          labelY: -175, spiel: 'heu',    bild: 'krippe' },
      { name: 'Windrad',           bei: 'beim Windrad',           x: 900,  y: 290,  aufgabe: 'Korn mahlen',          labelY: -265, spiel: 'kurbel', bild: 'muehle' },
      { name: 'Eisloch',           bei: 'beim Eisloch',           x: 1450, y: 300,  aufgabe: 'Wasser holen',         labelY: -195, spiel: 'eimer',  bild: 'teich', farben: ['#7fb8d8', '#bfe3f5'] },
      { name: 'Iglu',              bei: 'beim Iglu',              x: 420,  y: 1080, aufgabe: 'Wolle abgeben',        labelY: -165, spiel: 'wolle',  bild: 'iglu' },
      { name: 'Gewächshaus',       bei: 'im Gewächshaus',         x: 1020, y: 1110, aufgabe: 'Blumen gießen',        labelY: -225, spiel: 'blumen', bild: 'glashaus' },
      { name: 'Schlittenschuppen', bei: 'beim Schlittenschuppen', x: 1500, y: 960,  aufgabe: 'Schlitten reparieren', labelY: -255, spiel: 'zaun',   bild: 'scheune', farben: ['#6b4f3a', '#ffffff'] },
    ],
  },
  {
    name: 'Schafsinsel', emoji: '🏝️',
    boden: '#f0d9a0', weg: '#dcc086', platz: '#e6cc90', rand: 'meer', deko: 'palmen',
    treffpunkt: { x: 900, y: 660 },
    laterne: { x: 1560, y: 640 },
    gatter: { x: 220, y: 660 },
    orte: [
      { name: 'Fischerhütte', bei: 'bei der Fischerhütte', x: 320,  y: 300,  aufgabe: 'Seegras fressen', labelY: -225, spiel: 'heu',    bild: 'stall', farben: ['#3a8fb7', '#1f5f7a'] },
      { name: 'Brunnen',      bei: 'beim Brunnen',         x: 900,  y: 300,  aufgabe: 'Wasser holen',    labelY: -205, spiel: 'eimer',  bild: 'brunnen' },
      { name: 'Leuchtturm',   bei: 'beim Leuchtturm',      x: 1480, y: 320,  aufgabe: 'Licht kurbeln',   labelY: -290, spiel: 'kurbel', bild: 'leuchtturm' },
      { name: 'Muschelmarkt', bei: 'auf dem Muschelmarkt', x: 330,  y: 1060, aufgabe: 'Wolle abgeben',   labelY: -255, spiel: 'wolle',  bild: 'scheune', farben: ['#e67e22', '#c0392b'] },
      { name: 'Palmengarten', bei: 'im Palmengarten',      x: 900,  y: 1100, aufgabe: 'Blumen gießen',   labelY: -145, spiel: 'blumen', bild: 'wiese' },
      { name: 'Bootssteg',    bei: 'am Bootssteg',         x: 1480, y: 1060, aufgabe: 'Boot reparieren', labelY: -245, spiel: 'zaun',   bild: 'boot' },
    ],
  },
];
