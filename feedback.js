// ⭐ Bewertungen & Vorschläge für Tobias' Spiele
//
// So baust du das in ein Spiel ein (ganz unten in die index.html, vor </body>):
//
//   <script src="../../feedback.js" data-spiel="schafspelz" data-ort=".leiste"></script>
//
//   data-spiel = Name vom Spiel (nur: schafspelz, arag, kaempfer, farming)
//   data-ort   = (optional) Wo der ⭐-Knopf hin soll, z. B. ".leiste".
//                Ohne data-ort schwebt der Knopf unten links in der Ecke.
//
// Die Bewertungen landen im Supabase-"Briefkasten". Lesen kann sie nur Tobias
// im Supabase-Dashboard. Hier im Code steht nur der öffentliche anon-Key –
// der darf nur Bewertungen EINWERFEN (so sind die Regeln in der Datenbank).
// Der geheime service_role-Key kommt NIEMALS hier rein!
(function () {
  'use strict';

  const SUPABASE_URL = 'https://awuuproqhbehkezaydxr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXVwcm9xaGJlaGtlemF5ZHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyNjE5MzIsImV4cCI6MjExMDgzNzkzMn0.ymBriST5weLSyJwo7_D4ram2zrkMTh6_FYaizyQ8Gl0';
  const SPIELE = ['schafspelz', 'arag', 'kaempfer', 'farming'];   // (Genau wie in der Datenbank erlaubt)
  const MAX_ZEICHEN = 500;
  const WARTEZEIT = 60 * 1000;   // Pro Spiel nur 1 Bewertung pro Minute

  const skript = document.currentScript;
  const spiel = skript && skript.dataset.spiel;
  if (!SPIELE.includes(spiel)) { console.warn('feedback.js: data-spiel fehlt oder ist unbekannt:', spiel); return; }
  const ort = skript.dataset.ort;

  // Text sicher machen, bevor er irgendwo als HTML landet (wir benutzen sonst immer textContent)
  function escapen(t) {
    return String(t).replace(/[&<>"']/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[z]));
  }

  // ----- Aussehen -----
  const stil = document.createElement('style');
  stil.textContent = `
    .fb-knopf { background: #ffd166; color: #1b1f3a; border: none; border-radius: 0.6rem; padding: 0.35rem 0.8rem;
      font: bold 0.95rem system-ui, sans-serif; cursor: pointer; }
    .fb-knopf.fb-schwebt { position: fixed; left: 0.8rem; bottom: 0.8rem; z-index: 50; box-shadow: 0 2px 10px #0006; }
    .fb-huelle { position: fixed; inset: 0; z-index: 1000; background: #0009; display: flex; align-items: center;
      justify-content: center; padding: 1rem; box-sizing: border-box; font-family: system-ui, sans-serif; }
    .fb-fenster { background: #1b1f3a; color: #fff; border: 2px solid #ffd166; border-radius: 1rem; padding: 1.2rem;
      width: 100%; max-width: 26rem; box-shadow: 0 0 30px #6fe3ff55; text-align: center; }
    .fb-fenster h2 { margin: 0 0 0.6rem; font-size: 1.3rem; color: #ffd166; }
    .fb-sterne { display: flex; justify-content: center; gap: 0.3rem; margin: 0.4rem 0 0.8rem; }
    .fb-stern { background: none; border: none; font-size: 2.2rem; cursor: pointer; padding: 0; line-height: 1;
      filter: grayscale(1) opacity(0.45); transition: transform 0.1s; }
    .fb-stern.fb-an { filter: none; }
    .fb-stern:hover, .fb-stern:focus-visible { transform: scale(1.2); }
    .fb-fenster textarea { width: 100%; box-sizing: border-box; min-height: 6rem; border-radius: 0.6rem; border: none;
      padding: 0.6rem; font: 1rem system-ui, sans-serif; resize: vertical; }
    .fb-klein { font-size: 0.8rem; color: #c9c3ff; margin: 0.3rem 0; }
    .fb-zeile { display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.8rem; }
    .fb-zeile button { border: none; border-radius: 0.6rem; padding: 0.5rem 1rem; font: bold 1rem system-ui, sans-serif; cursor: pointer; }
    .fb-senden { background: #4ade80; color: #10301c; }
    .fb-senden:disabled { opacity: 0.5; cursor: default; }
    .fb-abbrechen { background: #555a7a; color: #fff; }
    .fb-meldung { min-height: 1.3em; margin-top: 0.6rem; font-weight: bold; }
  `;
  document.head.appendChild(stil);

  // ----- Der ⭐-Knopf -----
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'fb-knopf';
  knopf.textContent = '⭐ Bewerten';
  const ziel = ort && document.querySelector(ort);
  if (ziel) ziel.appendChild(knopf);
  else { knopf.classList.add('fb-schwebt'); document.body.appendChild(knopf); }
  knopf.addEventListener('click', oeffnen);

  // ----- Das Fenster -----
  let huelle = null, sterne = 0;

  function letzteZeit() { try { return Number(localStorage.getItem('feedback-zeit-' + spiel)) || 0; } catch (e) { return 0; } }
  function merkeZeit() { try { localStorage.setItem('feedback-zeit-' + spiel, String(Date.now())); } catch (e) { /* egal */ } }

  function oeffnen() {
    if (huelle) return;
    if (document.pointerLockElement) document.exitPointerLock();   // (3D-Modus: Maus wieder freigeben)
    sterne = 0;
    huelle = document.createElement('div');
    huelle.className = 'fb-huelle';
    // Tasten und Klicks NICHT ans Spiel weitergeben (sonst läuft beim Tippen die Figur los!)
    for (const art of ['keydown', 'keyup', 'keypress', 'pointerdown', 'pointerup', 'pointermove', 'wheel', 'touchstart', 'touchmove']) {
      huelle.addEventListener(art, e => e.stopPropagation());
    }
    huelle.addEventListener('keydown', e => { if (e.key === 'Escape') schliessen(); });
    huelle.addEventListener('click', e => { if (e.target === huelle) schliessen(); });

    const fenster = document.createElement('div');
    fenster.className = 'fb-fenster';
    fenster.setAttribute('role', 'dialog');
    fenster.setAttribute('aria-modal', 'true');

    const titel = document.createElement('h2');
    titel.textContent = 'Wie gefällt dir das Spiel?';
    fenster.appendChild(titel);

    const reihe = document.createElement('div');
    reihe.className = 'fb-sterne';
    const sternKnoepfe = [];
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'fb-stern';
      s.textContent = '⭐';
      s.setAttribute('aria-label', i + (i === 1 ? ' Stern' : ' Sterne'));
      s.addEventListener('click', () => {
        sterne = i;
        sternKnoepfe.forEach((k, n) => k.classList.toggle('fb-an', n < i));
        senden.disabled = false;
        meldung.textContent = '';
      });
      sternKnoepfe.push(s);
      reihe.appendChild(s);
    }
    fenster.appendChild(reihe);

    const feld = document.createElement('textarea');
    feld.maxLength = MAX_ZEICHEN;
    feld.placeholder = 'Hast du eine Idee, was Tobias besser machen kann? (freiwillig)';
    fenster.appendChild(feld);

    const zaehler = document.createElement('div');
    zaehler.className = 'fb-klein';
    zaehler.textContent = `0 / ${MAX_ZEICHEN}`;
    feld.addEventListener('input', () => { zaehler.textContent = `${feld.value.length} / ${MAX_ZEICHEN}`; });
    fenster.appendChild(zaehler);

    const hinweis = document.createElement('div');
    hinweis.className = 'fb-klein';
    hinweis.textContent = '🔒 Bitte schreib keinen Namen, keine Adresse und keine Telefonnummer hinein.';
    fenster.appendChild(hinweis);

    const zeile = document.createElement('div');
    zeile.className = 'fb-zeile';
    const abbrechen = document.createElement('button');
    abbrechen.type = 'button';
    abbrechen.className = 'fb-abbrechen';
    abbrechen.textContent = 'Abbrechen';
    abbrechen.addEventListener('click', schliessen);
    const senden = document.createElement('button');
    senden.type = 'button';
    senden.className = 'fb-senden';
    senden.textContent = 'Abschicken 📬';
    senden.disabled = true;
    zeile.append(abbrechen, senden);
    fenster.appendChild(zeile);

    const meldung = document.createElement('div');
    meldung.className = 'fb-meldung';
    meldung.setAttribute('aria-live', 'polite');
    fenster.appendChild(meldung);

    senden.addEventListener('click', async () => {
      if (!(sterne >= 1 && sterne <= 5)) { meldung.textContent = 'Klick zuerst auf die Sterne ⭐'; return; }
      const warte = WARTEZEIT - (Date.now() - letzteZeit());
      if (warte > 0) { meldung.textContent = `⏳ Danke! Du kannst in ${Math.ceil(warte / 1000)} Sekunden wieder bewerten.`; return; }
      const text = feld.value.trim().slice(0, MAX_ZEICHEN);
      senden.disabled = true;
      meldung.textContent = '📮 Wird verschickt …';
      try {
        const stopp = new AbortController();
        const uhr = setTimeout(() => stopp.abort(), 10000);
        const antwort = await fetch(SUPABASE_URL + '/rest/v1/feedback', {
          method: 'POST',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',   // (Wir dürfen nichts zurücklesen – nur einwerfen)
          },
          body: JSON.stringify({ game: spiel, stars: sterne, suggestion: text || null }),
          signal: stopp.signal,
        });
        clearTimeout(uhr);
        if (!antwort.ok) throw new Error('HTTP ' + antwort.status);
        merkeZeit();
        meldung.textContent = '💛 Danke! Tobias freut sich über deine Bewertung!';
        feld.disabled = true;
        sternKnoepfe.forEach(k => { k.disabled = true; });
        abbrechen.textContent = 'Schließen';
      } catch (e) {
        senden.disabled = false;
        meldung.textContent = '😕 Das hat nicht geklappt. Bist du im Internet? Versuch es gleich nochmal.';
      }
    });

    huelle.appendChild(fenster);
    document.body.appendChild(huelle);
    sternKnoepfe[0].focus();
  }

  function schliessen() {
    if (!huelle) return;
    huelle.remove();
    huelle = null;
    knopf.focus();
  }

  // (Für Tests und für andere Spiele: Fenster auch per Code öffnen, z. B. nach dem Spielende)
  window.feedbackOeffnen = oeffnen;
  window.feedbackEscapen = escapen;
})();
