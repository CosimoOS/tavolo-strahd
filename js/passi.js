/* Finestra a passi per lo scontro: una domanda alla volta, a tutto schermo, senza scorrere la pagina sotto.
   Ogni flusso (attacco, iniziativa, oggetto…) tiene il suo stato e chiede alla finestra di mostrare il passo giusto.

     const d = finestra({ chiave: "attacco", titolo: "Attacco", onChiudi });
     d.mostra(html, { passo: 2, di: 4, indietro: true });   // ridisegna solo il contenuto, con un piccolo scorrimento
     d.chiudi();

   Tastierini: al posto della tastiera del telefono, una griglia con tutte le facce del dado: un tocco e basta. */

import { icona } from "./icone.js";

const $ = id => document.getElementById(id);
let aperta = null;   // la finestra aperta adesso (una alla volta)

export function finestra({ chiave, titolo, onChiudi = () => {}, onClick = () => {}, onIndietro = null }) {
  if (aperta && aperta.chiave !== chiave) aperta.chiudi(true);
  let el = $("passi");
  if (!el) {
    el = document.createElement("div");
    el.id = "passi"; el.className = "passi"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
    el.innerHTML = `<div class="passi-scheda"><header class="passi-testa"><button class="passi-ind" aria-label="Passo precedente" hidden>‹</button>
      <div class="passi-tit"><b></b><span class="passi-pallini"></span></div><button class="passi-x" aria-label="Chiudi">×</button></header>
      <div class="passi-corpo"></div></div>`;
    document.body.appendChild(el);
  }
  const corpo = el.querySelector(".passi-corpo");
  const d = {
    chiave,
    mostra(html, { passo = 0, di = 0, indietro = false, nuovoPasso = true, tono = "" } = {}) {
      el.querySelector(".passi-tit b").textContent = titolo;
      el.querySelector(".passi-pallini").innerHTML = di ? Array.from({ length: di }, (_, i) => `<i class="${i < passo ? "fatto" : ""}${i === passo - 1 ? " ora" : ""}"></i>`).join("") : "";
      el.querySelector(".passi-ind").hidden = !indietro;
      el.dataset.tono = tono; el.dataset.chiave = chiave;   // lo stile può allargare una finestra precisa (l'editor dei mostri su PC)
      corpo.innerHTML = `<div class="passo${nuovoPasso ? " entra" : ""}">${html}</div>`;
      if (nuovoPasso) corpo.scrollTop = 0;
      el.hidden = false; document.body.classList.add("passi-aperta");
    },
    /* aggiorna solo un pezzo del passo (es. il totale), senza ridisegnare tutto: niente salti, niente fuoco perso */
    pezzo(sel, html) { const x = corpo.querySelector(sel); if (x) x.innerHTML = html; },
    chiudi(silenzioso) {
      el.hidden = true; document.body.classList.remove("passi-aperta"); corpo.innerHTML = "";
      if (aperta === d) aperta = null;
      if (!silenzioso) onChiudi();
    },
    get aperta() { return aperta === d && !el.hidden; },
  };
  el.querySelector(".passi-x").onclick = () => d.chiudi();
  el.querySelector(".passi-ind").onclick = () => onIndietro && onIndietro();
  corpo.onclick = e => onClick(e);
  aperta = d;
  return d;
}
export const finestraAperta = () => aperta;

/** Griglia con le facce di un dado: data-tasto = valore. scelto: il valore già scelto (evidenziato). */
export function tastierino(facce, scelto = null, attr = "data-tasto") {
  const col = facce >= 20 ? 5 : facce >= 10 ? 5 : facce >= 6 ? 4 : facce;
  return `<div class="tasti" style="--col:${col}">${Array.from({ length: facce }, (_, i) => i + 1)
    .map(n => `<button class="tasto${n === scelto ? " su" : ""}${n === facce ? " max" : ""}${n === 1 && facce === 20 ? " min" : ""}" ${attr}="${n}">${n}</button>`).join("")}</div>`;
}

/** Riga dei dadi da riempire: [5][3][ ] — il primo vuoto è quello che riceve il prossimo tocco. */
export function caselleDadi(valori, n, facce, chiave) {
  const primoVuoto = Array.from({ length: n }, (_, i) => valori[i]).findIndex(v => v == null || v === "");
  return `<div class="caselle">${Array.from({ length: n }, (_, i) => {
    const v = valori[i]; const vuoto = v == null || v === "";
    return `<button class="casella${vuoto ? "" : " piena"}${i === primoVuoto ? " ora" : ""}" data-casella="${chiave}" data-i="${i}" aria-label="Dado ${i + 1}${vuoto ? "" : `: ${v}`}"><small>d${facce}</small><b>${vuoto ? "" : v}</b></button>`;
  }).join("")}</div>`;
}

/** Il risultato che si rivela: colpito, critico, mancato, danno, cura, attesa, ognuno con la sua icona (js/icone.js).
    L'animazione la fa il CSS (e si spegne con "riduci movimento"). */
export function rivelazione(tipo, titolo, sotto = "") {
  return `<div class="rivela ${tipo}" role="status"><div class="rivela-segno" aria-hidden="true">${icona(tipo)}</div><b>${titolo}</b>${sotto ? `<span>${sotto}</span>` : ""}</div>`;
}

/** Vibrazione breve, se il telefono la permette. */
export function vibra(schema) { try { navigator.vibrate && navigator.vibrate(schema); } catch (_) {} }
