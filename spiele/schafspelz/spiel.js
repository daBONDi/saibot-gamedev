// 🐺 Wolf im Schafspelz 🐑
// Einer der Schafe ist in Wirklichkeit ein Wolf! Finde ihn, bevor er alle frisst.
'use strict';

const canvas = document.getElementById('spiel');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// ===== Einstellungen (hier kannst du rumprobieren!) =====
const WELT_B = 1800, WELT_H = 1300;   // Größe vom Bauernhof
const SICHT = 290;                    // Wie weit du sehen kannst
const TEMPO_SPIELER = 170;            // Wie schnell du läufst
const TEMPO_SCHAF = 105;              // Wie schnell die anderen Schafe laufen
const TEMPO_WOLF = 135;               // Wie schnell der Wolf jagt
const WOLF_PAUSE = 22;                // Sekunden zwischen zwei Angriffen

const ORTE = [
  { name: 'Stall',        bei: 'beim Stall',         x: 320,  y: 300,  aufgabe: 'Heu fressen',     labelY: -225 },
  { name: 'Mühle',        bei: 'bei der Mühle',      x: 900,  y: 300,  aufgabe: 'Korn mahlen',     labelY: -265 },
  { name: 'Teich',        bei: 'beim Teich',         x: 1480, y: 320,  aufgabe: 'Wasser trinken',  labelY: -195 },
  { name: 'Scheune',      bei: 'bei der Scheune',    x: 320,  y: 1080, aufgabe: 'Wolle abgeben',   labelY: -215 },
  { name: 'Blumenwiese',  bei: 'auf der Blumenwiese', x: 900, y: 1120, aufgabe: 'Blumen gießen',   labelY: -145 },
  { name: 'Gemüsegarten', bei: 'im Gemüsegarten',    x: 1480, y: 1080, aufgabe: 'Zaun reparieren', labelY: -200 },
];
const GLOCKE = { name: 'Glocke', bei: 'bei der Glocke', x: 900, y: 680 };

const NAMEN  = ['Wolke', 'Flocke', 'Krümel', 'Bolle', 'Lotte', 'Muffin', 'Socke'];
const FARBEN = ['#ff9ecf', '#8fd3ff', '#ffe066', '#9be89b', '#c9a0ff', '#ffb36b', '#d9b38c'];

// ===== Hilfsfunktionen =====
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const zufall = arr => arr[Math.floor(Math.random() * arr.length)];
const begrenzt = (v, min, max) => Math.max(min, Math.min(max, v));
function mischen(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function naechsterOrt(p) {
  let best = GLOCKE, bd = dist(p, GLOCKE);
  for (const o of ORTE) { const d = dist(p, o); if (d < bd) { bd = d; best = o; } }
  return best;
}
function rundesRechteck(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function ellipse(x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}
function text(t, x, y, groesse, farbe = '#fff', ausrichtung = 'center', rand = true) {
  ctx.font = `bold ${groesse}px system-ui, sans-serif`;
  ctx.textAlign = ausrichtung;
  ctx.textBaseline = 'middle';
  if (rand) {
    ctx.lineWidth = Math.max(3, groesse / 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineJoin = 'round';
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = farbe;
  ctx.fillText(t, x, y);
}
function umbrechen(t, x, y, maxB, zeilenH, groesse, farbe) {
  ctx.font = `${groesse}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = farbe;
  let zeile = '';
  for (const wort of t.split(' ')) {
    const probe = zeile ? zeile + ' ' + wort : wort;
    if (ctx.measureText(probe).width > maxB && zeile) {
      ctx.fillText(zeile, x, y);
      zeile = wort;
      y += zeilenH;
    } else {
      zeile = probe;
    }
  }
  ctx.fillText(zeile, x, y);
}

// ===== Spielzustand =====
let zustand = 'titel';   // 'titel', 'spiel', 'treffen', 'ende'
let schafe = [], spieler = null, wolf = null;
let wolle = [], effekte = [];
let treffen = null, ende = null, nachricht = null;
let glockeGenutzt = false;
let kamera = { x: 0, y: 0 };
let klickZiel = null;
let maus = { x: 0, y: 0 };
let zeit = 0;
const tasten = {};

// Blumen auf der Wiese (einmal zufällig verteilt)
const blumen = [];
for (let i = 0; i < 220; i++) {
  blumen.push({ x: Math.random() * WELT_B, y: Math.random() * WELT_H, f: zufall(['#fff', '#ffe066', '#ff9ecf', '#c9a0ff']) });
}

function macheSchaf(name, farbe, istSpieler) {
  return {
    name, farbe, istSpieler, istWolf: false, lebt: true,
    x: 0, y: 0, richtung: 1, phase: 0, laeuft: false,
    aufgaben: [], alleAufgaben: [], gesamt: 0, erledigt: 0,
    ziel: null, warte: 0, amOrt: null, letzterOrt: GLOCKE,
    verdacht: null, cooldown: 0, jagt: null,
    aufgabeAktiv: null, aufgabeT: 0,
  };
}

function neuesSpiel() {
  schafe = []; wolle = []; effekte = [];
  treffen = null; ende = null; klickZiel = null;
  glockeGenutzt = false;

  spieler = macheSchaf('Du', '#ffffff', true);
  spieler.aufgaben = mischen([0, 1, 2, 3, 4, 5]).slice(0, 5);
  spieler.alleAufgaben = [...spieler.aufgaben];
  spieler.gesamt = 5;
  schafe.push(spieler);

  NAMEN.forEach((n, i) => {
    const s = macheSchaf(n, FARBEN[i], false);
    s.aufgaben = mischen([0, 1, 2, 3, 4, 5]).slice(0, 4);
    s.gesamt = 4;
    schafe.push(s);
  });

  // Ein zufälliges Schaf ist heimlich der Wolf!
  wolf = zufall(schafe.filter(s => !s.istSpieler));
  wolf.istWolf = true;
  wolf.cooldown = 18;

  alleZurGlocke();
  zustand = 'spiel';
  zeigeNachricht('Eines der Schafe ist ein Wolf im Schafspelz! Pass gut auf! 🐺', 4);
}

function alleZurGlocke() {
  const lebende = schafe.filter(s => s.lebt);
  lebende.forEach((s, i) => {
    const w = i / lebende.length * Math.PI * 2;
    s.x = GLOCKE.x + Math.cos(w) * 110;
    s.y = GLOCKE.y + Math.sin(w) * 80;
    s.ziel = null; s.jagt = null; s.amOrt = null;
    s.warte = Math.random() * 2;
    s.aufgabeAktiv = null;
  });
  klickZiel = null;
}

function zeigeNachricht(t, dauer) { nachricht = { text: t, t: dauer }; }

function fortschritt() {
  let e = 0, g = 0;
  for (const s of schafe) {
    if (s.istWolf) continue;   // Der Wolf macht nur so, als ob er arbeitet!
    e += s.erledigt; g += s.gesamt;
  }
  return e / g;
}

function beende(gewonnen, grund) {
  zustand = 'ende';
  ende = { gewonnen, grund, seit: zeit };
}

// ===== Bewegung =====
function laufeZu(s, z, tempo, dt) {
  const dx = z.x - s.x, dy = z.y - s.y, d = Math.hypot(dx, dy);
  if (d < 5) { s.laeuft = false; return true; }
  const schritt = Math.min(d, tempo * dt);
  s.x += dx / d * schritt;
  s.y += dy / d * schritt;
  if (Math.abs(dx) > 1) s.richtung = Math.sign(dx);
  s.phase += dt * 12;
  s.laeuft = true;
  return false;
}

function bewegeSpieler(dt) {
  let dx = 0, dy = 0;
  if (tasten['arrowleft'] || tasten['a']) dx -= 1;
  if (tasten['arrowright'] || tasten['d']) dx += 1;
  if (tasten['arrowup'] || tasten['w']) dy -= 1;
  if (tasten['arrowdown'] || tasten['s']) dy += 1;

  if (dx || dy) klickZiel = null;
  else if (klickZiel) {
    const zx = klickZiel.x - spieler.x, zy = klickZiel.y - spieler.y, d = Math.hypot(zx, zy);
    if (d < 6) klickZiel = null; else { dx = zx / d; dy = zy / d; }
  }

  const laenge = Math.hypot(dx, dy);
  spieler.laeuft = laenge > 0;
  if (laenge > 0) {
    spieler.x += dx / laenge * TEMPO_SPIELER * dt;
    spieler.y += dy / laenge * TEMPO_SPIELER * dt;
    if (dx) spieler.richtung = Math.sign(dx);
    spieler.phase += dt * 12;
  }
  spieler.x = begrenzt(spieler.x, 30, WELT_B - 30);
  spieler.y = begrenzt(spieler.y, 40, WELT_H - 30);

  // Aufgabe erledigen (2 Sekunden stehen bleiben)
  if (spieler.aufgabeAktiv !== null) {
    const o = ORTE[spieler.aufgabeAktiv];
    if (dist(spieler, o) > 55) {
      spieler.aufgabeAktiv = null;
    } else {
      spieler.aufgabeT += dt;
      if (spieler.aufgabeT >= 2) {
        spieler.aufgaben = spieler.aufgaben.filter(i => i !== spieler.aufgabeAktiv);
        spieler.erledigt++;
        zeigeNachricht('✅ ' + o.aufgabe + ' geschafft!', 2);
        spieler.aufgabeAktiv = null;
      }
    }
  }
}

function bewegeBot(s, dt) {
  if (s.jagt) return;   // Der jagende Wolf wird in wolfLogik bewegt

  if (s.warte > 0) {
    s.warte -= dt;
    s.laeuft = false;
    if (s.warte <= 0 && s.amOrt !== null) {
      if (!s.istWolf && s.aufgaben.includes(s.amOrt)) {
        s.aufgaben = s.aufgaben.filter(i => i !== s.amOrt);
        s.erledigt++;
      }
      s.amOrt = null;
    }
    return;
  }

  if (!s.ziel) {
    const ortNr = (s.aufgaben.length && Math.random() < 0.6)
      ? zufall(s.aufgaben)
      : Math.floor(Math.random() * ORTE.length);
    const o = ORTE[ortNr];
    s.ziel = { x: o.x + (Math.random() - 0.5) * 60, y: o.y + (Math.random() - 0.5) * 40, ort: ortNr };
  }
  if (laufeZu(s, s.ziel, TEMPO_SCHAF, dt)) {
    s.amOrt = s.ziel.ort;
    s.letzterOrt = ORTE[s.ziel.ort];
    s.warte = 3 + Math.random() * 3;
    s.ziel = null;
  }
}

// ===== Der Wolf =====
function istAllein(ziel) {
  return !schafe.some(s => s.lebt && s !== ziel && s !== wolf && dist(s, ziel) < 230);
}

function wolfLogik(dt) {
  wolf.cooldown -= dt;
  if (wolf.cooldown > 0) return;

  if (wolf.jagt) {
    const z = wolf.jagt;
    // Aufgeben, wenn jemand anderes in der Nähe ist
    if (!z.lebt || !istAllein(z) || dist(wolf, z) > 450) {
      wolf.jagt = null; wolf.ziel = null;
      return;
    }
    if (dist(wolf, z) < 32) { fressen(z); return; }
    laufeZu(wolf, z, TEMPO_WOLF, dt);
    return;
  }

  // Ein Schaf suchen, das ganz allein ist ...
  const opfer = schafe.filter(s => s.lebt && !s.istWolf && dist(s, wolf) < 400 && istAllein(s));
  if (opfer.length) {
    wolf.jagt = zufall(opfer);
    wolf.warte = 0; wolf.amOrt = null;
  }
}

function fressen(opfer) {
  opfer.lebt = false;
  opfer.erledigt = opfer.gesamt;
  opfer.aufgaben = [];
  opfer.aufgabeAktiv = null;
  wolf.jagt = null; wolf.ziel = null;
  wolf.cooldown = WOLF_PAUSE + Math.random() * 8;

  const ort = naechsterOrt(opfer);
  wolle.push({ x: opfer.x, y: opfer.y, opfer, ort });
  effekte.push({ x: opfer.x, y: opfer.y, t: 1.2 });

  // Schafe, die weiter weg waren, haben vielleicht etwas gesehen
  for (const s of schafe) {
    if (!s.istSpieler && s.lebt && !s.istWolf && dist(s, wolf) < 420 && Math.random() < 0.6) {
      s.verdacht = { wer: wolf, ort };
    }
  }

  if (opfer.istSpieler) { beende(false, 'Der Wolf hat dich erwischt!'); return; }
  pruefeWolfSieg();
}

function pruefeWolfSieg() {
  const uebrig = schafe.filter(s => s.lebt && !s.istWolf).length;
  if (uebrig <= 1) { beende(false, 'Der Wolf hat zu viele Schafe gefressen!'); return true; }
  return false;
}

// ===== Aktion (E / Leertaste / Knopf) =====
function moeglicheAktion() {
  for (const w of wolle) if (dist(spieler, w) < 80) return { text: 'Wolle melden!', tun: () => starteTreffen(spieler, w) };
  for (const i of spieler.aufgaben) {
    if (dist(spieler, ORTE[i]) < 55 && spieler.aufgabeAktiv === null) {
      return { text: ORTE[i].aufgabe, tun: () => { spieler.aufgabeAktiv = i; spieler.aufgabeT = 0; } };
    }
  }
  if (dist(spieler, GLOCKE) < 70 && !glockeGenutzt) {
    return { text: 'Glocke läuten', tun: () => { glockeGenutzt = true; starteTreffen(spieler, null); } };
  }
  return null;
}

function aktion() {
  if (zustand !== 'spiel') return;
  const a = moeglicheAktion();
  if (a) a.tun();
}

// ===== Herden-Treffen =====
function starteTreffen(melder, fund) {
  zustand = 'treffen';
  const lebende = schafe.filter(s => s.lebt);
  const aussagen = new Map();
  const anklaeger = [];

  for (const s of lebende) {
    if (s.istSpieler) { aussagen.set(s, 'Das bist du! Wen hältst du für den Wolf?'); continue; }
    const teile = [];
    if (s === melder && fund) teile.push(`Ich hab Wolle von ${fund.opfer.name} ${fund.ort.bei} gefunden! 😱`);
    if (!s.istWolf && s.verdacht && s.verdacht.wer.lebt) {
      teile.push(`Ich hab gesehen, wie ${s.verdacht.wer.name} sich ${s.verdacht.ort.bei} an jemanden rangeschlichen hat! 😨`);
      anklaeger.push(s);
    }
    if (!teile.length) {
      let ort = s.letzterOrt;
      // Der Wolf schwindelt oft!
      if (s.istWolf && Math.random() < 0.6) ort = zufall([...ORTE, GLOCKE].filter(o => o !== s.letzterOrt));
      teile.push(zufall([`Ich war ${ort.bei}.`, `Ich war gerade ${ort.bei}, ehrlich!`, `Ich hab ${ort.bei} gearbeitet.`]));
    }
    aussagen.set(s, teile.join(' '));
  }

  if (wolf.lebt && anklaeger.length) {
    const ort = zufall([...ORTE, GLOCKE]);
    aussagen.set(wolf, `Was?! ${anklaeger[0].name} lügt! Ich war die ganze Zeit ${ort.bei}! 😤`);
  }

  let grund;
  if (!fund) grund = 'Du hast die Glocke geläutet!';
  else if (melder.istSpieler) grund = `Du hast Wolle von ${fund.opfer.name} gefunden!`;
  else grund = `${melder.name} hat Wolle von ${fund.opfer.name} gefunden!`;

  wolle = [];
  treffen = { grund, lebende, aussagen, anklaeger, phase: 'waehlen', stimmen: null, raus: null, skip: 0, ergebnis: '' };
}

function abstimmen(wahl) {
  const t = treffen;
  const stimmen = new Map();
  stimmen.set(spieler, wahl);

  for (const s of t.lebende) {
    if (s.istSpieler) continue;
    const andere = t.lebende.filter(o => o !== s);
    let ziel;
    if (s.istWolf) {
      if (t.anklaeger.length) ziel = zufall(t.anklaeger);
      else if (wahl && wahl !== s) ziel = wahl;
      else ziel = zufall(andere);
    } else if (s.verdacht && s.verdacht.wer.lebt) {
      ziel = s.verdacht.wer;
    } else {
      const r = Math.random();
      if (wahl && wahl !== s && r < 0.55) ziel = wahl;   // Folgt deiner Stimme
      else if (r < 0.8) ziel = null;                     // Überspringen
      else ziel = zufall(andere);
    }
    stimmen.set(s, ziel);
  }

  // Stimmen zählen
  const zaehler = new Map();
  let skip = 0;
  for (const z of stimmen.values()) {
    if (z) zaehler.set(z, (zaehler.get(z) || 0) + 1); else skip++;
  }
  let max = 0, raus = null, gleich = false;
  for (const [s, n] of zaehler) {
    if (n > max) { max = n; raus = s; gleich = false; }
    else if (n === max) gleich = true;
  }
  if (gleich || max <= skip) raus = null;

  t.stimmen = stimmen; t.raus = raus; t.skip = skip; t.phase = 'ergebnis';
  if (!raus) t.ergebnis = 'Niemand wurde vom Hof gejagt. 🤷';
  else if (raus.istWolf) t.ergebnis = `${raus.name} wurde vom Hof gejagt ... und WAR der Wolf! 🐺🎉`;
  else if (raus.istSpieler) t.ergebnis = 'Die Herde hat DICH vom Hof gejagt! 😢';
  else t.ergebnis = `${raus.name} wurde vom Hof gejagt ... war aber KEIN Wolf. 😢`;
}

function treffenWeiter() {
  const raus = treffen.raus;
  treffen = null;
  if (raus) {
    raus.lebt = false;
    raus.erledigt = raus.gesamt;
    raus.aufgaben = [];
    if (raus.istWolf) { beende(true, 'Ihr habt den Wolf erwischt!'); return; }
    if (raus.istSpieler) { beende(false, 'Die Herde hat dich rausgeworfen, obwohl du ein echtes Schaf bist!'); return; }
    if (pruefeWolfSieg()) return;
  }
  for (const s of schafe) s.verdacht = null;
  wolf.cooldown = 15;
  alleZurGlocke();
  zustand = 'spiel';
}

function kartenRechtecke() {
  const breite = 205, hoehe = 150, abstand = 12;
  const x0 = 30 + (900 - 4 * breite - 3 * abstand) / 2;
  return treffen.lebende.map((s, i) => ({
    s,
    x: x0 + (i % 4) * (breite + abstand),
    y: 115 + Math.floor(i / 4) * (hoehe + abstand),
    w: breite, h: hoehe,
  }));
}
const SKIP_KNOPF = { x: W / 2 - 100, y: 450, w: 200, h: 44 };
const WEITER_KNOPF = { x: W / 2 - 80, y: 510, w: 160, h: 44 };
const imRechteck = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function klickTreffen(p) {
  if (treffen.phase === 'waehlen') {
    for (const k of kartenRechtecke()) {
      if (!k.s.istSpieler && imRechteck(p, k)) { abstimmen(k.s); return; }
    }
    if (imRechteck(p, SKIP_KNOPF)) abstimmen(null);
  } else if (imRechteck(p, WEITER_KNOPF)) {
    treffenWeiter();
  }
}

// ===== Spiel-Update =====
function update(dt) {
  for (const e of effekte) e.t -= dt;
  effekte = effekte.filter(e => e.t > 0);
  if (nachricht) { nachricht.t -= dt; if (nachricht.t <= 0) nachricht = null; }
  if (zustand !== 'spiel') return;

  bewegeSpieler(dt);
  for (const s of schafe) if (!s.istSpieler && s.lebt) bewegeBot(s, dt);
  if (wolf.lebt) wolfLogik(dt);
  if (zustand !== 'spiel') return;

  // Andere Schafe finden Wolle und rufen ein Treffen ein
  for (const s of schafe) {
    if (s.istSpieler || !s.lebt || s.istWolf) continue;
    for (const w of wolle) {
      if (dist(s, w) < 70) { starteTreffen(s, w); return; }
    }
  }

  if (fortschritt() >= 1) beende(true, 'Alle Aufgaben sind erledigt! Der Hof ist sicher.');
}

// ===== Zeichnen =====
function zeichneSchafKoerper(x, y, farbe, richtung, phase, laeuft, groesse = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(groesse, groesse);
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(0, 21, 24, 6); ctx.fill();
  // Beine
  ctx.fillStyle = '#333';
  [-12, -5, 5, 12].forEach((bx, i) => {
    const h = laeuft ? Math.sin(phase + i * Math.PI / 2) * 3 : 0;
    ctx.fillRect(bx - 2, 6, 4, 13 + h);
  });
  // Wollkörper
  ctx.translate(0, laeuft ? -Math.abs(Math.sin(phase)) * 3 : 0);
  const wolken = [[-13, 0, 12], [0, -5, 14], [13, 0, 12], [-7, 6, 11], [7, 6, 11]];
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (const [wx, wy, r] of wolken) { ellipse(wx, wy, r + 2, r + 2); ctx.fill(); }
  ctx.fillStyle = farbe;
  for (const [wx, wy, r] of wolken) { ellipse(wx, wy, r, r); ctx.fill(); }
  // Kopf
  ctx.fillStyle = '#2b2b2b';
  ellipse(richtung * 21, -7, 10, 12); ctx.fill();
  ellipse(richtung * 13, -14, 7, 3); ctx.fill();   // Ohr
  // Auge
  ctx.fillStyle = '#fff';
  ellipse(richtung * 25, -10, 3.2, 3.2); ctx.fill();
  ctx.fillStyle = '#000';
  ellipse(richtung * 26, -10, 1.6, 1.6); ctx.fill();
  ctx.restore();
}

function zeichneSchaf(s) {
  zeichneSchafKoerper(s.x, s.y, s.farbe, s.richtung, s.phase, s.laeuft);
  text(s.name, s.x, s.y - 32, 13, s.istSpieler ? '#ffd166' : '#fff');
  if (s.istSpieler && s.aufgabeAktiv !== null) {
    ctx.fillStyle = '#222';
    ctx.fillRect(s.x - 25, s.y - 52, 50, 8);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(s.x - 25, s.y - 52, 50 * Math.min(1, s.aufgabeT / 2), 8);
  }
}

function zeichneWolle(w) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ellipse(w.x, w.y + 6, 26, 8); ctx.fill();
  const flocken = [[-14, 2, 8], [-3, -3, 10], [10, 1, 9], [3, 8, 7], [-10, 9, 6], [18, 8, 5]];
  for (const [fx, fy, r] of flocken) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ellipse(w.x + fx, w.y + fy, r + 2, r + 2); ctx.fill();
    ctx.fillStyle = w.opfer.farbe;
    ellipse(w.x + fx, w.y + fy, r, r); ctx.fill();
  }
  text('❗', w.x, w.y - 26 + Math.sin(zeit * 5) * 3, 22);
}

function zeichneOrt(o) {
  const { x, y } = o;
  switch (o.name) {
    case 'Stall':
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x - 80, y - 150, 160, 100);
      ctx.fillStyle = '#7b241c';
      ctx.beginPath(); ctx.moveTo(x - 95, y - 150); ctx.lineTo(x + 95, y - 150); ctx.lineTo(x, y - 210); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 22, y - 102, 44, 52);
      ctx.fillStyle = '#5d2e0c'; ctx.fillRect(x - 18, y - 98, 36, 48);
      ctx.fillStyle = '#f4d03f'; ctx.fillRect(x + 45, y - 30, 44, 28);
      ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 2; ctx.strokeRect(x + 45, y - 30, 44, 28);
      break;
    case 'Mühle': {
      ctx.fillStyle = '#e8d5b0';
      ctx.beginPath(); ctx.moveTo(x - 45, y - 50); ctx.lineTo(x + 45, y - 50); ctx.lineTo(x + 25, y - 190); ctx.lineTo(x - 25, y - 190); ctx.fill();
      ctx.fillStyle = '#6e4b2a'; ctx.fillRect(x - 12, y - 85, 24, 35);
      ctx.save(); ctx.translate(x, y - 180); ctx.rotate(zeit * 0.8);
      ctx.fillStyle = '#8d6e4c';
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-6, 0, 12, 75); }
      ctx.restore();
      ctx.fillStyle = '#444'; ellipse(x, y - 180, 7, 7); ctx.fill();
      break;
    }
    case 'Teich':
      ctx.fillStyle = '#2e86c1'; ellipse(x, y - 105, 150, 70); ctx.fill();
      ctx.fillStyle = '#5dade2'; ellipse(x - 20, y - 115, 110, 45); ctx.fill();
      ctx.fillStyle = '#27ae60';
      ellipse(x + 50, y - 120, 14, 9); ctx.fill();
      ellipse(x - 70, y - 90, 12, 8); ctx.fill();
      break;
    case 'Scheune':
      ctx.fillStyle = '#8e3b2f'; ctx.fillRect(x - 110, y - 180, 220, 130);
      ctx.fillStyle = '#5b231b';
      ctx.beginPath(); ctx.moveTo(x - 125, y - 180); ctx.lineTo(x + 125, y - 180); ctx.lineTo(x, y - 240); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 40, y - 130, 80, 80);
      ctx.strokeStyle = '#8e3b2f'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x - 36, y - 126); ctx.lineTo(x + 36, y - 54); ctx.moveTo(x + 36, y - 126); ctx.lineTo(x - 36, y - 54); ctx.stroke();
      break;
    case 'Blumenwiese':
      ctx.fillStyle = '#3d8b37'; ellipse(x, y - 80, 140, 45); ctx.fill();
      for (let i = 0; i < 30; i++) {
        const w = i * 2.4, r = 20 + (i * 37) % 100;
        ctx.fillStyle = ['#ff6fb5', '#ffd166', '#fff', '#c9a0ff'][i % 4];
        ellipse(x + Math.cos(w) * r * 1.2, y - 80 + Math.sin(w) * r * 0.35, 5, 5); ctx.fill();
      }
      text('🪣', x + 40, y - 10, 24, '#fff', 'center', false);
      break;
    case 'Gemüsegarten':
      ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 120, y - 180, 240, 120);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 7; k++) {
          const gx = x - 100 + k * 33, gy = y - 155 + r * 38;
          ctx.fillStyle = '#e67e22';
          ctx.beginPath(); ctx.moveTo(gx - 5, gy); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 14); ctx.fill();
          ctx.fillStyle = '#27ae60'; ctx.fillRect(gx - 4, gy - 7, 8, 7);
        }
      }
      ctx.strokeStyle = '#d4ac6e'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x - 130, y - 50); ctx.lineTo(x - 20, y - 50); ctx.moveTo(x + 10, y - 40); ctx.lineTo(x + 130, y - 55); ctx.stroke();
      break;
  }
  text(o.name, x, y + o.labelY, 18, '#fff');
}

function zeichneWelt() {
  // Gras
  ctx.fillStyle = '#6abf4b';
  ctx.fillRect(0, 0, WELT_B, WELT_H);
  for (const b of blumen) { ctx.fillStyle = b.f; ctx.fillRect(b.x, b.y, 3, 3); }
  // Wege
  ctx.strokeStyle = '#c8a96b'; ctx.lineWidth = 34; ctx.lineCap = 'round';
  for (const o of ORTE) { ctx.beginPath(); ctx.moveTo(GLOCKE.x, GLOCKE.y); ctx.lineTo(o.x, o.y); ctx.stroke(); }
  ctx.fillStyle = '#d6bb82'; ellipse(GLOCKE.x, GLOCKE.y, 150, 110); ctx.fill();
  // Zaun rundherum
  ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, WELT_B - 20, WELT_H - 20);
  // Orte
  for (const o of ORTE) zeichneOrt(o);
  // Glocke
  ctx.fillStyle = '#6e4b2a'; ctx.fillRect(GLOCKE.x - 4, GLOCKE.y - 90, 8, 80);
  ctx.fillRect(GLOCKE.x - 30, GLOCKE.y - 92, 60, 8);
  ctx.fillStyle = glockeGenutzt ? '#999' : '#f1c40f';
  ctx.beginPath();
  ctx.moveTo(GLOCKE.x - 16, GLOCKE.y - 55);
  ctx.quadraticCurveTo(GLOCKE.x - 14, GLOCKE.y - 84, GLOCKE.x, GLOCKE.y - 84);
  ctx.quadraticCurveTo(GLOCKE.x + 14, GLOCKE.y - 84, GLOCKE.x + 16, GLOCKE.y - 55);
  ctx.fill();
  text('Glocke', GLOCKE.x, GLOCKE.y - 105, 16);
  // Deine Aufgaben-Markierungen
  for (const i of spieler.aufgaben) {
    const o = ORTE[i];
    const puls = 1 + Math.sin(zeit * 4) * 0.15;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
    ellipse(o.x, o.y, 30 * puls, 14 * puls); ctx.stroke();
    text('!', o.x, o.y - 40, 26, '#ffd166');
  }
}

function zeichneDunkel() {
  const sx = spieler.x - kamera.x, sy = spieler.y - kamera.y;
  const g = ctx.createRadialGradient(sx, sy, SICHT - 70, sx, sy, SICHT + 10);
  g.addColorStop(0, 'rgba(10,15,40,0)');
  g.addColorStop(1, 'rgba(10,15,40,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function zeichneHUD() {
  // Fortschritt der Herde
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(14, 12, 300, 60, 10); ctx.fill();
  text('Aufgaben der Herde', 26, 28, 14, '#fff', 'left', false);
  ctx.fillStyle = '#333'; ctx.fillRect(26, 42, 276, 18);
  ctx.fillStyle = '#4ade80'; ctx.fillRect(26, 42, 276 * fortschritt(), 18);

  // Deine Aufgaben
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(14, 80, 240, 30 + spieler.alleAufgaben.length * 22, 10); ctx.fill();
  text('Deine Aufgaben:', 26, 96, 14, '#ffd166', 'left', false);
  spieler.alleAufgaben.forEach((i, n) => {
    const fertig = !spieler.aufgaben.includes(i);
    text(`${fertig ? '✅' : '⬜'} ${ORTE[i].aufgabe}`, 26, 120 + n * 22, 13, fertig ? '#8f8' : '#fff', 'left', false);
  });

  // Anzahl Schafe
  const lebend = schafe.filter(s => s.lebt).length;
  ctx.fillStyle = 'rgba(20,20,50,0.8)';
  rundesRechteck(W - 194, 12, 180, 36, 10); ctx.fill();
  text(`🐑 Noch ${lebend} Schafe`, W - 104, 30, 15, '#fff', 'center', false);

  // Aktions-Knopf
  const a = zustand === 'spiel' ? moeglicheAktion() : null;
  if (a) {
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ellipse(W - 75, H - 75, 58, 58); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#1b1f3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const worte = a.text.split(' ');
    worte.forEach((w, i) => ctx.fillText(w, W - 75, H - 85 + i * 18 - (worte.length - 1) * 4));
    text('[E]', W - 75, H - 40, 12, '#1b1f3a', 'center', false);
  }

  if (nachricht) {
    ctx.font = 'bold 18px system-ui, sans-serif';
    const b = ctx.measureText(nachricht.text).width + 40;
    ctx.fillStyle = 'rgba(20,20,50,0.9)';
    rundesRechteck(W / 2 - b / 2, H - 70, b, 44, 12); ctx.fill();
    text(nachricht.text, W / 2, H - 48, 18, '#fff', 'center', false);
  }
}

function zeichneKnopf(r, beschriftung, farbe) {
  const hover = imRechteck(maus, r);
  ctx.fillStyle = hover ? '#fff' : farbe;
  rundesRechteck(r.x, r.y, r.w, r.h, 12); ctx.fill();
  text(beschriftung, r.x + r.w / 2, r.y + r.h / 2, 18, '#1b1f3a', 'center', false);
}

function zeichneTreffen() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a2350';
  rundesRechteck(30, 20, 900, 560, 20); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.stroke();

  text('🔔 Herden-Treffen!', W / 2, 55, 30, '#ffd166');
  text(treffen.grund, W / 2, 92, 17, '#fff', 'center', false);

  for (const k of kartenRechtecke()) {
    const s = k.s;
    const hover = treffen.phase === 'waehlen' && !s.istSpieler && imRechteck(maus, k);
    const istRaus = treffen.phase === 'ergebnis' && treffen.raus === s;
    ctx.fillStyle = hover ? '#4a3f8a' : '#3a3170';
    rundesRechteck(k.x, k.y, k.w, k.h, 12); ctx.fill();
    ctx.strokeStyle = istRaus ? '#ff4d4d' : (hover ? '#ffd166' : '#5a4fa0');
    ctx.lineWidth = istRaus ? 5 : 2; ctx.stroke();

    zeichneSchafKoerper(k.x + 32, k.y + 34, s.farbe, 1, 0, false, 0.8);
    text(s.name, k.x + 62, k.y + 30, 17, s.istSpieler ? '#ffd166' : '#fff', 'left', false);
    umbrechen(treffen.aussagen.get(s) || '', k.x + 10, k.y + 62, k.w - 20, 17, 13, '#ddd8ff');

    // Wer hat für dieses Schaf gestimmt?
    if (treffen.phase === 'ergebnis') {
      let n = 0;
      for (const [waehler, ziel] of treffen.stimmen) {
        if (ziel === s) {
          ctx.fillStyle = waehler.farbe;
          ellipse(k.x + k.w - 14 - n * 16, k.y + 16, 7, 7); ctx.fill();
          ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
          n++;
        }
      }
      if (istRaus) text('RAUS!', k.x + k.w - 40, k.y + k.h - 18, 18, '#ff4d4d');
    }
  }

  if (treffen.phase === 'waehlen') {
    text('Klicke auf das Schaf, das du für den Wolf hältst!', W / 2, 432, 15, '#ffd166', 'center', false);
    zeichneKnopf(SKIP_KNOPF, 'Überspringen ⏭', '#c9c3ff');
  } else {
    text(treffen.ergebnis, W / 2, 462, 20, '#fff');
    text(`(${treffen.skip} haben übersprungen)`, W / 2, 490, 13, '#c9c3ff', 'center', false);
    zeichneKnopf(WEITER_KNOPF, 'Weiter ▶', '#ffd166');
  }
}

function zeichneEnde() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);
  if (ende.gewonnen) text('🎉 Die Schafe gewinnen! 🎉', W / 2, 150, 44, '#4ade80');
  else text('🐺 Der Wolf gewinnt! 🐺', W / 2, 150, 44, '#ff6b6b');
  text(ende.grund, W / 2, 215, 20, '#fff');
  text(`Der Wolf war: ${wolf.name}`, W / 2, 300, 24, '#ffd166');
  zeichneSchafKoerper(W / 2 - 40, 370, wolf.farbe, 1, 0, false, 1.6);
  text('🐺', W / 2 + 50, 360, 56, '#fff', 'center', false);
  if (zeit - ende.seit > 1) {
    text('Klicke oder drücke Enter für eine neue Runde!', W / 2, 480, 20, '#c9c3ff', 'center', false);
  }
}

function zeichneTitel() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b1f3a'); g.addColorStop(1, '#3d8b37');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  text('🐺 Wolf im Schafspelz 🐑', W / 2, 80, 46, '#ffd166');
  for (let i = 0; i < 7; i++) {
    const x = 180 + i * 100, y = 175 + Math.sin(zeit * 3 + i) * 6;
    zeichneSchafKoerper(x, y, FARBEN[i], i % 2 ? -1 : 1, zeit * 6 + i, true);
  }
  const zeilen = [
    'Eines der Schafe ist in Wirklichkeit ein Wolf!',
    '🟡  Erledige deine Aufgaben auf dem Bauernhof (gelbe ! auf der Karte).',
    '🧶  Findest du Wolle von einem gefressenen Schaf? Melde sie!',
    '🔔  Beim Herden-Treffen stimmt ihr ab, wer der Wolf ist.',
    '🕵️  Merk dir, wo die Schafe waren! Der Wolf schwindelt oft.',
    '⌨️  Laufen: Pfeiltasten / WASD oder klicken  •  Aktion: E oder Leertaste',
  ];
  zeilen.forEach((z, i) => text(z, W / 2, 255 + i * 34, 17, i === 0 ? '#ffd166' : '#fff', 'center', false));
  const puls = 1 + Math.sin(zeit * 4) * 0.05;
  ctx.save(); ctx.translate(W / 2, 530); ctx.scale(puls, puls);
  text('Klicke oder drücke Enter zum Starten!', 0, 0, 24, '#4ade80');
  ctx.restore();
}

function zeichne() {
  ctx.clearRect(0, 0, W, H);
  if (zustand === 'titel') { zeichneTitel(); return; }

  kamera.x = begrenzt(spieler.x - W / 2, 0, WELT_B - W);
  kamera.y = begrenzt(spieler.y - H / 2, 0, WELT_H - H);
  const sichtbar = p => dist(p, spieler) < SICHT + 20;

  ctx.save();
  ctx.translate(-kamera.x, -kamera.y);
  zeichneWelt();
  for (const w of wolle) if (sichtbar(w)) zeichneWolle(w);
  const zuSehen = schafe.filter(s => s.lebt && (s.istSpieler || sichtbar(s))).sort((a, b) => a.y - b.y);
  for (const s of zuSehen) zeichneSchaf(s);
  // Der Wolf zeigt sich kurz, wenn er zuschlägt!
  for (const e of effekte) {
    if (!sichtbar(e)) continue;
    ctx.globalAlpha = Math.min(1, e.t);
    text('🐺', e.x, e.y - 20 - (1.2 - e.t) * 25, 60, '#fff', 'center', false);
    text('HAPS!', e.x, e.y + 30, 22, '#ff6b6b');
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  zeichneDunkel();
  zeichneHUD();
  if (zustand === 'treffen') zeichneTreffen();
  if (zustand === 'ende') zeichneEnde();
}

// ===== Eingabe =====
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  tasten[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (zustand === 'titel' && (k === 'enter' || k === ' ')) neuesSpiel();
  else if (zustand === 'ende' && (k === 'enter' || k === ' ') && zeit - ende.seit > 1) neuesSpiel();
  else if (zustand === 'spiel' && (k === 'e' || k === ' ')) aktion();
});
addEventListener('keyup', e => { tasten[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in tasten) tasten[k] = false; });

function punkt(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
canvas.addEventListener('pointerdown', e => {
  const p = punkt(e);
  maus = p;
  if (zustand === 'titel') { neuesSpiel(); return; }
  if (zustand === 'ende') { if (zeit - ende.seit > 1) neuesSpiel(); return; }
  if (zustand === 'treffen') { klickTreffen(p); return; }
  if (zustand === 'spiel') {
    if (moeglicheAktion() && dist(p, { x: W - 75, y: H - 75 }) < 60) { aktion(); return; }
    klickZiel = { x: p.x + kamera.x, y: p.y + kamera.y };
  }
});
canvas.addEventListener('pointermove', e => {
  maus = punkt(e);
  if (e.buttons && zustand === 'spiel' && klickZiel) {
    klickZiel = { x: maus.x + kamera.x, y: maus.y + kamera.y };
  }
});

// ===== Spielschleife =====
let letzte = performance.now();
function schleife(jetzt) {
  const dt = Math.min(0.05, (jetzt - letzte) / 1000);
  letzte = jetzt;
  zeit += dt;
  update(dt);
  zeichne();
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
