/* Attacchi nello scontro, a passi: una domanda alla volta, numeri scelti da una griglia, risultato che si rivela.

   Giocatore:  bersaglio → con cosa (arma, incantesimo, oggetto) → d20 → (il telefono del master confronta con la CA)
               → colpito/mancato → danni (con gli extra: Marchio, Uccisore di colossi, punizioni…) → conferma del master.
               Incantesimi con tiro salvezza: bersagli → il master dice chi riesce → danni (metà a chi riesce, se previsto).
               Usa oggetto: pozioni (su di sé o su un compagno) e altri oggetti.
   Master:     conferma i danni con un tocco; decide i tiri salvezza delle sue creature; attacca con le sue creature.

   Nell'archivio: scontro/attuale/attacchi/<id> → { scontro, round, turno, pg, pgNome, bersaglio, bersaglioNome, arma, tipo,
     tiro?, ts?, cd?, meta?, bersagli?, esiti?, stato, danni?, applicati?, dettaglio? }
     stato: "colpire" → "colpito" | "mancato" → "danni" → "applicato"   (attacchi)
            "ts" → "ts-fatto" → "danni" → "applicato"                     (tiri salvezza)
            "cura" → "applicato"                                           (pozione data a un compagno)
   La CA non viene mai scritta lì: il giocatore vede solo "colpito" o "mancato". */
import { tiroPerColpire, esito, sommaDanni, danniFinali, partiFormula, conResistenze } from "./regole/attacco.js";
import { partiDanno, curaDi, danniTs } from "./regole/magia.js";
import { quantita } from "./regole/base.js";
import { creaturaInCampo, ferisci, ferisciMolti, azioneDi, bersagliCreature, latoGruppo } from "./nemici.js";
import { finestra, finestraAperta, tastierino, caselleDadi, rivelazione, vibra } from "./passi.js";

const ATT = "scontro/attuale/attacchi";
const CAR = { for: "Forza", des: "Destrezza", cos: "Costituzione", int: "Intelligenza", sag: "Saggezza", car: "Carisma" };
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);
const vuoto = v => v == null || v === "";
const SPADE = `<svg class="az-icona" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l10 10M4 5l1-1M13 16l3-3M15 18l3-3M17.5 17.5l2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 4L9 14M20 5l-1-1M11 16l-3-3M9 18l-3-3M6.5 17.5L4 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const BOCCETTA = `<svg class="az-icona" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v5L5.5 16a4 4 0 003.5 6h6a4 4 0 003.5-6L14 8V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7.5 14h9" stroke="currentColor" stroke-width="2"/></svg>`;

let arch = null, dm = false, toast = () => {}, ridisegna = () => {}, dati = () => null, spendi = () => {}, ascolto = null;
let bersaglioPg = () => null, colpisciPg = () => null, scriviScontro = async () => {};
let usaRisorsa = () => {}, consumaOggetto = () => {}, curaPg = () => null;
let A = [], SC = null, risolti = new Set(), confermati = new Set(), rimandati = new Set();
let P = null;    // attacco del giocatore in corso
let O = null;    // oggetto che il giocatore sta usando
let MA = null;   // attacco del master in corso

export function avviaAttacchi({ archivio, master, avvisa, aggiorna, datiAttacco, spendiSlot, bersaglio, colpisci, scrivi, usa, consuma, cura }) {
  arch = archivio; dm = master; toast = avvisa; ridisegna = aggiorna; dati = datiAttacco; spendi = spendiSlot;
  bersaglioPg = bersaglio || (() => null); colpisciPg = colpisci || (() => null); scriviScontro = scrivi || (async () => {});
  usaRisorsa = usa || (() => {}); consumaOggetto = consuma || (() => {}); curaPg = cura || (() => null);
  A = []; risolti = new Set(); confermati = new Set(); rimandati = new Set(); P = null; O = null; MA = null;
  ascolto = arch.ascoltaRaccolta(ATT, lista => {
    A = lista.map(x => ({ id: x.id, ...x.dati }));
    if (P && P.id) seguiMio();
    if (dm && SC) {
      A.filter(a => a.stato === "colpire" && a.scontro === SC.id && !risolti.has(a.id)).forEach(risolvi);
      A.filter(a => a.stato === "cura" && a.scontro === SC.id && !risolti.has(a.id)).forEach(applicaCura);
      proponiConferma();
    }
    ridisegna();
  });
}
export function fermaAttacchi() { if (ascolto) ascolto(); ascolto = null; const f = finestraAperta(); if (f) f.chiudi(true); }
export function aggiornaScontro(nuovo) {
  SC = nuovo;
  if (P && P.fase === "fine" && P.f && P.f.aperta) disegnaGiocatore(false);
  if (SC && SC.stato !== "in corso") { const f = finestraAperta(); if (f && ["attacco", "mattacco", "oggetto"].includes(f.chiave)) f.chiudi(true); }
}

/* ======================================================================
   GIOCATORE
   ====================================================================== */
/** I pulsanti grandi del turno del giocatore (li mette lo scontro sotto "Tocca a te"). */
export function htmlGiocatore(pg) {
  if (!SC || SC.stato !== "in corso") return "";
  const d = dati(pg.id); if (!d) return "";
  const fatti = A.filter(x => x.scontro === SC.id && x.pg === pg.id && x.round === SC.round && x.turno === SC.turno && x.tipo !== "cura");
  const ultimo = fatti[fatti.length - 1];
  const riassunto = ultimo ? `<p class="ultimo-att">${ultimo.stato === "applicato" ? `Ultimo attacco: ${esc(ultimo.bersaglioNome)} −${ultimo.applicati}` : ultimo.stato === "mancato" ? `Ultimo attacco: mancato` : `Attacco in corso…`}</p>` : "";
  return `<div class="azioni-turno">
    ${d.opzioni.length ? `<button class="azione-grande" data-at="apri">${SPADE}<b>Attacca</b><small>${fatti.length ? `${fatti.length} ${fatti.length === 1 ? "attacco" : "attacchi"} in questo turno` : "arma, incantesimo o oggetto"}</small></button>` : ""}
    <button class="azione-grande secondaria" data-at="oggetto">${BOCCETTA}<b>Usa oggetto</b><small>pozioni e altro</small></button>
  </div>${riassunto}`;
}

function apriAttacco(pg) {
  P = { pg, fase: "bersaglio", bersaglio: null, altri: [], opI: null, modo: "normale", d20: [], bonus: 0, dadi: {}, pun: 0, nonMorto: false, accesi: [], extra: 0, id: null, statoVisto: "" };
  P.f = finestra({ chiave: "attacco", titolo: "Attacco", onClick: clicFinestraGiocatore, onIndietro: indietroGiocatore, onChiudi: () => { P = null; ridisegna(); } });
  disegnaGiocatore();
}
const bersagliGiocatore = () => (SC.campo || []).filter(c => c.tipo !== "alleato" && c.ferite !== "sconfitto");
const opzione = d => d.opzioni[P.opI];
const nomeDi = id => { const c = (SC.campo || []).find(x => x.id === id); return c ? c.nome : ""; };
const nomeBersaglio = () => nomeDi(P.bersaglio);
const tiroCorrente = d => tiroPerColpire({ dadi: P.d20, modo: P.modo, bonus: opzione(d).hit + P.bonus, critMin: d.critMin });
const PASSI_G = ["bersaglio", "arma", "tiro", "esito", "danni", "fine"];
const passoDi = f => ({ area: 2, "attesa-ts": 4, "esito-ts": 4, attesa: 4, confermare: 6 }[f] || PASSI_G.indexOf(f) + 1);

function disegnaGiocatore(nuovo = true) {
  if (!P) return;
  const d = dati(P.pg.id), a = P.id && A.find(x => x.id === P.id), op = P.opI != null ? opzione(d) : null;
  const opz = { passo: passoDi(P.fase), di: PASSI_G.length, nuovoPasso: nuovo, indietro: ["arma", "tiro", "area"].includes(P.fase) };
  let h = "";
  if (P.fase === "bersaglio") {
    const b = bersagliGiocatore();
    h = `<p class="domanda">Chi attacchi?</p>
      ${b.length ? `<div class="carte">${b.map(c => `<button class="carta nemico" data-bers="${c.id}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}${c.subiti ? ` · −${c.subiti}` : ""}</small></span></button>`).join("")}</div>`
        : `<p class="aiuto">Non c'è nessun nemico in piedi.</p>`}`;
  } else if (P.fase === "arma") {
    const voce = (o, i) => {
      const dadi = o.parti.map(p => `${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}`).join(" + ") + ` ${esc(o.parti[0].t || o.t || "")}`;
      const num = o.tipo === "ts" ? `TS ${CAR[o.ts].slice(0, 3)} ${o.cd}` : sg(o.hit);
      const nota = [o.usiRimasti != null ? `${o.usiRimasti} usi rimasti` : "", o.slot ? `slot di ${o.slot}° livello` : "", o.nota].filter(Boolean).join(" · ");
      return `<button class="carta" data-op="${i}"${o.disponibile === false ? " disabled" : ""}><span class="c-nome"><b>${esc(o.n)}${o.etichetta ? `<span class="tag-inc">${esc(o.etichetta)}</span>` : ""}</b><small>${dadi}${nota ? ` · ${esc(nota)}` : ""}</small></span><span class="c-num">${num}</span></button>`;
    };
    const gruppi = [["Armi", d.opzioni.map((o, i) => [o, i]).filter(([o]) => o.tipo === "arma")], ["Incantesimi e oggetti", d.opzioni.map((o, i) => [o, i]).filter(([o]) => o.tipo !== "arma")]];
    h = `<p class="domanda">Con cosa attacchi?</p><p class="aiuto">${esc(nomeBersaglio())}</p>
      ${gruppi.filter(([, v]) => v.length).map(([t, v]) => `<p class="lbl-sez">${t}</p><div class="carte">${v.map(([o, i]) => voce(o, i)).join("")}</div>`).join("")}`;
  } else if (P.fase === "area") {
    const b = bersagliGiocatore().filter(c => c.id !== P.bersaglio);
    h = `<p class="domanda">Chi altro è nell'area?</p><p class="aiuto">${esc(op.n)} colpisce ${esc(nomeBersaglio())}. Tocca le altre creature coinvolte, poi Lancia.</p>
      <div class="carte">${b.map(c => `<button class="carta nemico" data-altro="${c.id}" aria-pressed="${P.altri.includes(c.id)}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}</small></span></button>`).join("")}</div>
      <div class="fondo"><button class="btn up" data-att="lancia-ts">Lancia ${esc(op.n)}${P.altri.length ? ` su ${P.altri.length + 1}` : ""}</button></div>`;
  } else if (P.fase === "tiro") {
    const n = P.modo === "normale" ? 1 : 2, t = tiroCorrente(d);
    h = `<p class="domanda">Tira il d20</p><p class="aiuto">${esc(op.n)} contro ${esc(nomeBersaglio())}. Tocca il numero uscito.</p>
      <div class="seg">${[["normale", "Normale"], ["vantaggio", "Vantaggio"], ["svantaggio", "Svantaggio"]].map(([m, l]) => `<button data-modo="${m}" aria-pressed="${P.modo === m}">${l}</button>`).join("")}</div>
      ${caselleDadi(P.d20, n, 20, "d20")}
      ${tastierino(20, null, "data-d20")}
      <div class="bonus-riga"><span>Bonus in più <small>(es. il d4 di Benedizione)</small></span><span class="stepper"><button class="btn step" data-bonus="-1" aria-label="Bonus meno uno">−</button><b class="num">${sg(P.bonus)}</b><button class="btn step" data-bonus="1" aria-label="Bonus più uno">+</button></span></div>
      <div class="totale">${t ? `${t.usato} ${sg(t.bonus)} =<b>${t.tot}</b>` : `<span>${sg(op.hit + P.bonus)} al tiro</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-tiro"${t ? "" : " disabled"}>Attacca</button></div>`;
  } else if (P.fase === "attesa") {
    h = rivelazione("attesa", "Al master…", `${a ? a.tiro.tot : ""} per colpire contro ${esc(nomeBersaglio())}`) + `<p class="aiuto centrato">Il telefono del master confronta il tiro con la difesa del bersaglio.</p>`;
  } else if (P.fase === "attesa-ts") {
    h = rivelazione("attesa", "Tiri salvezza…", `${esc(op.n)}: tiro su ${CAR[op.ts]} CD ${op.cd}`) + `<p class="aiuto centrato">Il master tira per ${P.altri.length ? "le creature colpite" : esc(nomeBersaglio())} e ti dice chi resiste.</p>`;
  } else if (P.fase === "esito-ts") {
    const righe = a.bersagli.map(b => `<li class="${a.esiti[b.id] ? "riesce" : "fallisce"}"><span>${esc(b.nome)}</span><b>${a.esiti[b.id] ? (a.meta ? "resiste: metà danni" : "resiste: nessun danno") : "fallisce"}</b></li>`).join("");
    const nessuno = a.bersagli.every(b => a.esiti[b.id]) && !a.meta;
    h = rivelazione(nessuno ? "mancato" : "colpito", nessuno ? "Resistono" : "Colpiti!", `${esc(a.arma)} · tiro su ${CAR[a.ts]} CD ${a.cd}`) + `<ul class="esiti-ts">${righe}</ul>` +
      (nessuno ? `<div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn up" data-att="fine-turno">Fine turno</button></div>`
        : `<div class="fondo"><button class="btn up" data-att="vai-danni">Tira i danni</button></div>`);
  } else if (P.fase === "esito") {
    const crit = a.tiro.critico, preso = a.stato === "colpito";
    h = rivelazione(preso ? (crit ? "critico" : "colpito") : "mancato", preso ? (crit ? "Critico!" : "Colpito!") : "Mancato", `${a.tiro.tot} per colpire contro ${esc(a.bersaglioNome)}`) +
      (preso ? `<div class="fondo"><button class="btn up" data-att="vai-danni">Tira i danni${crit ? " (doppi)" : ""}</button></div>`
        : `<div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn" data-att="fine-turno">Fine turno</button><button class="btn up" data-att="ancora">Nuovo attacco</button></div>`);
  } else if (P.fase === "danni") {
    const parti = partiGiocatore(d, a, op), som = sommaDanni(parti, P.extra), attiva = parti.find(p => p.valori.some(vuoto));
    const crit = a.tiro && a.tiro.critico;
    const slot = op.tipo === "arma" && d.punizione ? d.slot.filter(s => s.liberi > 0 && s.liv <= 4) : [];
    const extra = op.tipo === "arma" ? d.extra : [];
    h = `<p class="domanda">Tira i danni</p><p class="aiuto">${crit ? "Critico: i dadi sono doppi. " : ""}${extra.length || slot.length ? "Accendi gli extra che valgono, poi " : ""}tocca il numero di ogni dado.</p>
      ${extra.length ? `<div class="extra-lista">${extra.map(e => `<button class="extra" data-acceso="${e.id}" aria-pressed="${P.accesi.includes(e.id)}"${e.disponibile ? "" : " disabled"}><span class="ex-spia"></span><span class="ex-testo">${esc(e.nome)}<small>${esc(e.nota || "")}${e.slot ? ` · slot di ${e.slot}°` : ""}</small></span><span class="ex-dadi">+${e.parti.map(p => `${p.n * (crit ? 2 : 1)}d${p.f}`).join("+")}</span></button>`).join("")}</div>` : ""}
      ${slot.length ? `<div class="riga-danni"><b>Punizione divina <small>spende uno slot</small></b><div class="seg">
        <button data-pun="0" aria-pressed="${!P.pun}">No</button>${slot.map(s => `<button data-pun="${s.liv}" aria-pressed="${P.pun === s.liv}">Slot ${s.liv}° · ${s.liv + 1}d8</button>`).join("")}</div>
        ${P.pun ? `<button class="extra" data-nm aria-pressed="${P.nonMorto}"><span class="ex-spia"></span><span class="ex-testo">Contro un non morto o un immondo<small>+1d8 radianti</small></span></button>` : ""}</div>` : ""}
      ${parti.map(p => `<div class="riga-danni"><b>${esc(p.nome)} <small>${p.n}d${p.facce}${p.mod ? sg(p.mod) : ""} ${esc(p.tipo)}</small></b>${caselleDadi(p.valori, p.n, p.facce, p.chiave)}</div>`).join("")}
      ${attiva ? tastierino(attiva.facce, null, "data-faccia") : ""}
      <div class="bonus-riga"><span>Altri danni <small>(se serve aggiungere qualcosa a mano)</small></span><span class="stepper"><button class="btn step" data-extra="-1" aria-label="Meno uno">−</button><b class="num">+${P.extra}</b><button class="btn step" data-extra="1" aria-label="Più uno">+</button></span></div>
      <div class="totale">${som ? `Totale<b>${som.tot}</b>` : `<span>Mancano dei dadi</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-danni"${som ? "" : " disabled"}>Invia ${som ? som.tot + " danni" : "i danni"}</button></div>`;
  } else if (P.fase === "confermare") {
    h = rivelazione("attesa", "Al master…", `${P.inviati} danni: li sta confermando`);
  } else if (P.fase === "fine") {
    if (a.tipo === "ts") {
      const det = a.dettaglio || {};
      h = rivelazione("danno", `−${a.applicati}`, `${esc(a.arma)}`) + `<ul class="esiti-ts">${a.bersagli.map(b => { const ora = (SC.campo || []).find(c => c.id === b.id);
        return `<li><span>${esc(b.nome)}</span><b>−${det[b.id] ?? 0}${ora ? ` · ${esc(ora.ferite)}` : ""}</b></li>`; }).join("")}</ul>`;
    } else {
      const ora = (SC.campo || []).find(c => c.id === a.bersaglio), giu = ora && ora.ferite === "sconfitto";
      h = rivelazione("danno", a.applicati ? `−${a.applicati}` : "Nessun danno", giu ? `<b>${esc(a.bersaglioNome)}</b> è a terra` : `<b>${esc(a.bersaglioNome)}</b>${ora ? ` ora è ${esc(ora.ferite)}` : ""}`) +
        (a.applicati !== a.danni.tot ? `<p class="aiuto centrato">Il master ne ha contati ${a.applicati} su ${a.danni.tot} (resistenze o immunità).</p>` : "");
    }
    h += `<div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn" data-att="fine-turno">Fine turno</button><button class="btn up" data-att="ancora">Nuovo attacco</button></div>`;
  }
  P.f.mostra(h, opz);
}
/* i dadi da tirare: quelli dell'arma o dell'incantesimo (doppi col critico) più gli extra accesi */
function partiGiocatore(d, a, op) {
  const crit = !!(a && a.tiro && a.tiro.critico), tipoArma = op.t || (op.parti[0] && op.parti[0].t) || "";
  const casella = (chiave, nome, p) => ({ chiave, nome, n: p.n, facce: p.f, mod: p.mod || 0, tipo: p.t, valori: Array.from({ length: p.n }, (_, i) => (P.dadi[chiave] || [])[i] ?? "") });
  const out = partiDanno(op.parti, { critico: op.tipo !== "ts" && crit, tipoArma }).map((p, k) => casella("p" + k, k ? `${op.n} (${p.t})` : op.n, p));
  if (op.tipo === "arma") {
    d.extra.filter(e => P.accesi.includes(e.id)).forEach(e => partiDanno(e.parti, { critico: crit, tipoArma }).forEach((p, k) => out.push(casella(`x-${e.id}-${k}`, e.nome, p))));
    if (P.pun) { const base = P.pun + 1 + (P.nonMorto ? 1 : 0); out.push(casella("pun", "Punizione divina", { n: crit ? base * 2 : base, f: 8, mod: 0, t: "radianti" })); }
  }
  return out;
}
/* il documento dell'attacco è cambiato: si passa al passo giusto, con un segnale */
function seguiMio() {
  const a = A.find(x => x.id === P.id); if (!a || a.stato === P.statoVisto) return;
  P.statoVisto = a.stato;
  if (a.stato === "colpito" || a.stato === "mancato") { P.fase = "esito"; vibra(a.stato === "mancato" ? 90 : [60, 40, 120]); }
  else if (a.stato === "ts-fatto") { P.fase = "esito-ts"; vibra([60, 40, 120]); }
  else if (a.stato === "applicato") { P.fase = "fine"; vibra([40, 30, 40]); }
  else return;
  if (P.f.aperta) disegnaGiocatore(); else toast(a.stato === "mancato" ? "Mancato" : a.stato === "applicato" ? `${a.bersaglioNome}: −${a.applicati}` : "Colpito! Tira i danni", 5000);
}
function indietroGiocatore() {
  if (P.fase === "arma") P.fase = "bersaglio"; else if (P.fase === "tiro" || P.fase === "area") { P.fase = "arma"; P.d20 = []; P.altri = []; }
  disegnaGiocatore();
}
/* quando parte il colpo: si spendono slot, usi dell'oggetto, l'oggetto lanciato */
function spendiPerLancio(op) {
  if (op.slot) spendi(P.pg.id, op.slot);
  if (op.uso) usaRisorsa(P.pg.id, op.uso);
  if (op.consuma) consumaOggetto(P.pg.id, op.consuma);
}
async function clicFinestraGiocatore(e) {
  if (!P) return;
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = dati(P.pg.id), a = P.id && A.find(x => x.id === P.id), op = P.opI != null ? opzione(d) : null;
  const ds = b.dataset;
  if (ds.bers) { P.bersaglio = ds.bers; P.fase = "arma"; return disegnaGiocatore(); }
  if (ds.op != null) {
    P.opI = +ds.op; P.d20 = []; P.altri = [];
    const o = opzione(d);
    if (o.tipo === "ts") { if (o.area) { P.fase = "area"; return disegnaGiocatore(); } return inviaTs(d, o); }
    P.fase = "tiro"; return disegnaGiocatore();
  }
  if (ds.altro) { P.altri = P.altri.includes(ds.altro) ? P.altri.filter(x => x !== ds.altro) : [...P.altri, ds.altro]; return disegnaGiocatore(false); }
  if (ds.modo) { P.modo = ds.modo; P.d20 = P.d20.slice(0, P.modo === "normale" ? 1 : 2); return disegnaGiocatore(false); }
  if (ds.d20) { const n = P.modo === "normale" ? 1 : 2, i = Array.from({ length: n }, (_, k) => P.d20[k]).findIndex(vuoto); if (i >= 0) P.d20[i] = +ds.d20; else P.d20[n - 1] = +ds.d20; return disegnaGiocatore(false); }
  if (ds.casella === "d20") { P.d20[+ds.i] = ""; return disegnaGiocatore(false); }
  if (ds.bonus) { P.bonus = Math.max(-5, Math.min(10, P.bonus + +ds.bonus)); return disegnaGiocatore(false); }
  if (ds.acceso) { P.accesi = P.accesi.includes(ds.acceso) ? P.accesi.filter(x => x !== ds.acceso) : [...P.accesi, ds.acceso]; return disegnaGiocatore(false); }
  if (ds.pun != null) { P.pun = +ds.pun; P.dadi.pun = []; return disegnaGiocatore(false); }
  if (b.hasAttribute("data-nm")) { P.nonMorto = !P.nonMorto; P.dadi.pun = []; return disegnaGiocatore(false); }
  if (ds.faccia) {
    const p = partiGiocatore(d, a, op).find(x => x.valori.some(vuoto)); if (!p) return;
    const v = (P.dadi[p.chiave] || []).slice(); v[p.valori.findIndex(vuoto)] = +ds.faccia; P.dadi[p.chiave] = v; return disegnaGiocatore(false);
  }
  if (ds.casella) { const v = (P.dadi[ds.casella] || []).slice(); v[+ds.i] = ""; P.dadi[ds.casella] = v; return disegnaGiocatore(false); }
  if (ds.extra) { P.extra = Math.max(0, P.extra + +ds.extra); return disegnaGiocatore(false); }
  switch (ds.att) {
    case "lancia-ts": return inviaTs(d, op);
    case "invia-tiro": {
      const t = tiroCorrente(d), c = (SC.campo || []).find(x => x.id === P.bersaglio); if (!t || !c) return;
      P.id = `${P.pg.id}-${Date.now()}`; P.statoVisto = "colpire"; P.fase = "attesa"; disegnaGiocatore();
      try {
        await arch.scrivi(`${ATT}/${P.id}`, { scontro: SC.id, round: SC.round, turno: SC.turno, pg: P.pg.id, pgNome: d.nome,
          bersaglio: c.id, bersaglioNome: c.nome, arma: op.n, tipo: op.tipo, tiro: t, stato: "colpire" });
        spendiPerLancio(op);
      } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "tiro"; P.id = null; disegnaGiocatore(); }
      return;
    }
    case "vai-danni": P.fase = "danni"; return disegnaGiocatore();
    case "invia-danni": {
      const som = sommaDanni(partiGiocatore(d, a, op), P.extra); if (!som) return;
      const perTipo = { ...som.perTipo }; if (perTipo.altro) { perTipo["extra"] = perTipo.altro; delete perTipo.altro; }
      P.inviati = som.tot; P.fase = "confermare"; disegnaGiocatore();
      try {
        await arch.aggiorna(`${ATT}/${P.id}`, { stato: "danni", danni: { tot: som.tot, perTipo } });
        if (P.pun) spendi(P.pg.id, P.pun);
        d.extra.filter(x => P.accesi.includes(x.id) && x.slot).forEach(x => spendi(P.pg.id, x.slot));
      } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "danni"; disegnaGiocatore(); }
      return;
    }
    case "ancora": { const pg = P.pg; P.f.chiudi(true); apriAttacco(pg); return; }
    case "fine-turno": P.f.chiudi(true); P = null; document.querySelector('#vistaScontro [data-az="fine"]')?.click(); return;
    case "chiudi": P.f.chiudi(); return;
  }
}
/* incantesimo con tiro salvezza: parte subito, il master dice chi resiste */
async function inviaTs(d, op) {
  const ids = [P.bersaglio, ...P.altri], bersagli = ids.map(id => ({ id, nome: nomeDi(id) }));
  P.id = `${P.pg.id}-${Date.now()}`; P.statoVisto = "ts"; P.fase = "attesa-ts"; disegnaGiocatore();
  try {
    await arch.scrivi(`${ATT}/${P.id}`, { scontro: SC.id, round: SC.round, turno: SC.turno, pg: P.pg.id, pgNome: d.nome,
      bersaglio: ids[0], bersaglioNome: bersagli.map(b => b.nome).join(", "), bersagli, arma: op.n, tipo: "ts", ts: op.ts, cd: op.cd, meta: !!op.meta, stato: "ts" });
    spendiPerLancio(op);
  } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "arma"; P.id = null; disegnaGiocatore(); }
}

/* ---------- usa oggetto ---------- */
function apriOggetto(pg) {
  O = { pg, fase: "scegli", item: null, cura: null, bersaglio: null, dadi: [] };
  O.f = finestra({ chiave: "oggetto", titolo: "Usa oggetto", onClick: clicOggetto, onChiudi: () => { O = null; },
    onIndietro: () => { O.fase = O.fase === "dadi" ? "chi" : "scegli"; O.dadi = []; disegnaOggetto(); } });
  disegnaOggetto();
}
function disegnaOggetto(nuovo = true) {
  const d = dati(O.pg.id); let h = "";
  const opz = { nuovoPasso: nuovo, indietro: O.fase !== "scegli" && O.fase !== "fine" };
  if (O.fase === "scegli") {
    const voci = d.inv.map(t => ({ t, q: quantita(t), cura: curaDi(t) })).sort((x, y) => (y.cura ? 1 : 0) - (x.cura ? 1 : 0));
    h = `<p class="domanda">Cosa usi?</p><p class="aiuto">Le pozioni curano; gli altri oggetti si tolgono uno dall'equipaggiamento.</p>
      <div class="carte">${voci.map(v => `<button class="carta${v.cura ? " gruppo" : ""}" data-ogg="${esc(v.t)}"><span class="c-nome"><b>${esc(v.q.nome.charAt(0).toUpperCase() + v.q.nome.slice(1))}</b>${v.cura ? `<small>cura ${v.cura.parti.map(p => `${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}`).join("")} PF</small>` : ""}</span>${v.q.n > 1 ? `<span class="c-num">×${v.q.n}</span>` : ""}</button>`).join("")}</div>`;
  } else if (O.fase === "conferma") {
    h = `<p class="domanda">Usare ${esc(quantita(O.item).nome)}?</p><p class="aiuto">Ne togli uno dall'equipaggiamento. L'effetto lo racconti al tavolo.</p>
      <div class="fondo"><button class="btn up" data-ogg-ok>Usa</button></div>`;
  } else if (O.fase === "chi") {
    const compagni = (SC.ordine || []).filter(v => (SC.partecipanti || []).some(p => p.id === v.id && p.tipo === "scheda"));
    h = `<p class="domanda">Chi beve ${esc(O.cura.nome.toLowerCase())}?</p><p class="aiuto">Darla a un compagno vicino costa un'azione.</p>
      <div class="carte">${compagni.map(v => `<button class="carta gruppo" data-chi="${v.id}"><span class="c-nome"><b>${esc(v.nome)}</b><small>${v.id === O.pg.id ? "tu" : "compagno"}</small></span></button>`).join("")}</div>`;
  } else if (O.fase === "dadi") {
    const p = O.cura.parti[0], vals = Array.from({ length: p.n }, (_, i) => O.dadi[i] ?? ""), tot = vals.every(v => !vuoto(v)) ? vals.reduce((x, y) => x + y, 0) + p.mod : null;
    h = `<p class="domanda">Tira ${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}</p><p class="aiuto">${esc(O.cura.nome)} per ${esc((SC.ordine || []).find(v => v.id === O.bersaglio)?.nome || "")}</p>
      ${caselleDadi(vals, p.n, p.f, "cura")}${vals.some(vuoto) ? tastierino(p.f, null, "data-cura-f") : ""}
      <div class="totale">${tot != null ? `Cura<b>${tot}</b>` : `<span>Tocca il numero di ogni dado</span>`}</div>
      <div class="fondo"><button class="btn up" data-cura-ok${tot != null ? "" : " disabled"}>${tot != null ? `Cura ${tot} PF` : "Cura"}</button></div>`;
  } else if (O.fase === "fine") {
    h = rivelazione("colpito", `+${O.tot}`, `<b>${esc(O.nomeBersaglio)}</b>${O.ora != null ? ` ora ha ${O.ora} PF` : ""}`) + `<div class="fondo"><button class="btn up" data-ogg-chiudi>Fatto</button></div>`;
  }
  O.f.mostra(h, opz);
}
async function clicOggetto(e) {
  const b = e.target.closest("button"); if (!b || b.disabled || !O) return;
  const ds = b.dataset;
  if (ds.ogg) { O.item = ds.ogg; O.cura = curaDi(ds.ogg); O.fase = O.cura ? "chi" : "conferma"; return disegnaOggetto(); }
  if (b.hasAttribute("data-ogg-ok")) { consumaOggetto(O.pg.id, quantita(O.item).nome); toast(`Usato: ${quantita(O.item).nome}`); O.f.chiudi(); return; }
  if (ds.chi) { O.bersaglio = ds.chi; O.fase = "dadi"; O.dadi = []; return disegnaOggetto(); }
  if (ds.curaF) { const p = O.cura.parti[0], i = Array.from({ length: p.n }, (_, k) => O.dadi[k]).findIndex(vuoto); if (i >= 0) O.dadi[i] = +ds.curaF; return disegnaOggetto(false); }
  if (ds.casella === "cura") { O.dadi[+ds.i] = ""; return disegnaOggetto(false); }
  if (b.hasAttribute("data-cura-ok")) {
    const p = O.cura.parti[0], tot = O.dadi.slice(0, p.n).reduce((x, y) => x + y, 0) + p.mod;
    const d = dati(O.pg.id), nome = (SC.ordine || []).find(v => v.id === O.bersaglio)?.nome || "";
    O.tot = tot; O.nomeBersaglio = nome;
    if (dati(O.bersaglio)) O.ora = curaPg(O.bersaglio, tot, d.nome);                 // un personaggio di questo telefono
    else {                                                                               // un compagno: ci pensa il telefono del master
      try { await arch.scrivi(`${ATT}/${O.pg.id}-cura-${Date.now()}`, { scontro: SC.id, round: SC.round, turno: SC.turno, pg: O.pg.id, pgNome: d.nome,
        bersaglio: O.bersaglio, bersaglioNome: nome, arma: O.cura.nome, tipo: "cura", n: tot, stato: "cura" }); }
      catch (_) { toast("Non inviato: controlla la connessione", 5000); return; }
      O.ora = null;
    }
    consumaOggetto(O.pg.id, quantita(O.item).nome);
    O.fase = "fine"; vibra([40, 30, 40]); return disegnaOggetto();
  }
  if (b.hasAttribute("data-ogg-chiudi")) O.f.chiudi();
}

/* ======================================================================
   MASTER: esito automatico, tiri salvezza, conferma dei danni con un tocco
   ====================================================================== */
async function risolvi(a) {
  risolti.add(a.id);
  const c = creaturaInCampo(a.bersaglio);
  if (!c) return;
  try { await arch.aggiorna(`${ATT}/${a.id}`, { stato: esito(a.tiro, c.ca) }); } catch (_) { risolti.delete(a.id); }
}
/* una pozione data a un compagno: il telefono del master la applica alla sua scheda */
async function applicaCura(a) {
  risolti.add(a.id);
  try { curaPg(a.bersaglio, a.n, a.pgNome); await arch.aggiorna(`${ATT}/${a.id}`, { stato: "applicato", applicati: a.n }); toast(`${a.bersaglioNome}: +${a.n} PF da ${a.pgNome}`); }
  catch (_) { risolti.delete(a.id); }
}
const daConfermare = () => SC ? A.filter(a => a.scontro === SC.id && (a.stato === "danni" || a.stato === "ts") && !confermati.has(a.id + a.stato)) : [];
/* se il master non sta facendo altro, la conferma si apre da sola (non quelle che ha già chiuso senza decidere) */
function proponiConferma() {
  const q = daConfermare().filter(a => !rimandati.has(a.id + a.stato)); if (!q.length) return;
  const f = finestraAperta();
  if (f && f.chiave !== "conferma") return;
  apriConferma(q[0]);
}
function apriConferma(a) {
  const chiave = a.id + a.stato;
  let deciso = false, esiti = {};
  const chiudiDopo = f => { deciso = true; confermati.add(chiave); f.chiudi(); };
  const f = finestra({ chiave: "conferma", titolo: a.stato === "ts" ? "Tiri salvezza" : "Danni da confermare",
    onChiudi: () => { if (!deciso) rimandati.add(chiave); setTimeout(proponiConferma, 50); },
    onClick: async e => {
      const b = e.target.closest("button"); if (!b) return;
      /* tiri salvezza: il master segna chi riesce e chi fallisce */
      if (b.dataset.esito) { esiti[b.dataset.id] = b.dataset.esito === "riesce"; return disegna(); }
      if (b.hasAttribute("data-ts-ok")) {
        try { await arch.aggiorna(`${ATT}/${a.id}`, { esiti, stato: "ts-fatto" }); } catch (_) { toast("Non salvato: controlla la connessione", 5000); return; }
        return chiudiDopo(f);
      }
      const come = b.dataset.come; if (!come) return;
      try {
        if (a.tipo === "ts") {
          const lista = a.bersagli.map(x => ({ id: x.id, n: danniFinali(danniTs(a.danni.tot, a.esiti[x.id], a.meta), come) }));
          const campi = await ferisciMolti(lista.filter(x => x.n > 0), SC);
          await scriviScontro(campi);
          await arch.aggiorna(`${ATT}/${a.id}`, { stato: "applicato", applicati: lista.reduce((s, x) => s + x.n, 0), dettaglio: Object.fromEntries(lista.map(x => [x.id, x.n])) });
        } else {
          /* prima lo stato della creatura nello scontro, poi "applicato": così il giocatore vede subito com'è rimasta */
          const n = danniFinali(a.danni.tot, come), campi = n > 0 ? await ferisci(a.bersaglio, n, SC) : null;
          if (campi) await scriviScontro(campi);
          await arch.aggiorna(`${ATT}/${a.id}`, { stato: "applicato", applicati: n });
          toast(`${a.bersaglioNome}: −${n}`);
        }
      } catch (_) { toast("Non salvato: controlla la connessione", 5000); return; }
      chiudiDopo(f);
    } });
  function disegna() {
    if (a.stato === "ts") {
      const tutti = a.bersagli.every(x => esiti[x.id] != null);
      return f.mostra(`<p class="domanda">${esc(a.pgNome)} lancia ${esc(a.arma)}</p>
        <p class="aiuto">Tira per ognuno un tiro salvezza su <b>${CAR[a.ts]}</b> contro <b>CD ${a.cd}</b>${a.meta ? ". Chi riesce prende metà danni." : ". Chi riesce non prende danni."}</p>
        <div class="carte">${a.bersagli.map(x => { const c = creaturaInCampo(x.id); return `<div class="carta ts-riga"><span class="c-nome"><b>${esc(c ? c.nome : x.nome)}</b></span>
          <span class="ts-btn"><button class="btn" data-esito="riesce" data-id="${x.id}" aria-pressed="${esiti[x.id] === true}">Riesce</button><button class="btn" data-esito="fallisce" data-id="${x.id}" aria-pressed="${esiti[x.id] === false}">Fallisce</button></span></div>`; }).join("")}</div>
        <div class="fondo"><button class="btn up" data-ts-ok${tutti ? "" : " disabled"}>Fatto</button></div>`, { tono: "rosso", nuovoPasso: false });
    }
    const d = a.danni, parti = Object.entries(d.perTipo).map(([k, v]) => `${v} ${esc(k)}`).join(" + ");
    if (a.tipo === "ts") {
      const righe = a.bersagli.map(x => { const c = creaturaInCampo(x.id), n = danniTs(d.tot, a.esiti[x.id], a.meta); return `<li><span>${esc(c ? c.nome : x.nome)} <small>${a.esiti[x.id] ? "riesce" : "fallisce"}</small></span><b>${n}</b></li>`; }).join("");
      return f.mostra(`<p class="domanda">${esc(a.pgNome)}: ${esc(a.arma)}</p><p class="aiuto">${d.tot} danni · ${parti}</p>
        <ul class="esiti-ts">${righe}</ul>
        <div class="fondo colonna"><button class="btn up grande" data-come="pieni">Applica</button>
        <div class="tre-btn"><button class="btn" data-come="meta"><small>Resistono</small>Metà</button><button class="btn" data-come="doppio"><small>Vulnerabili</small>Doppio</button><button class="btn" data-come="nulla"><small>Immuni</small>Nessuno</button></div></div>`, { tono: "rosso" });
    }
    const c = creaturaInCampo(a.bersaglio), t = a.tiro;
    f.mostra(`<p class="domanda">${esc(a.pgNome)} colpisce ${esc(c ? c.nome : a.bersaglioNome)}</p>
      <p class="aiuto">${esc(a.arma)} · ${t.tot} contro CA ${c ? c.ca : "?"}${t.critico ? " · critico" : ""}</p>
      ${rivelazione("danno", `${d.tot}`, `danni · ${parti}`)}
      ${c && c.difese.length ? `<p class="difese-nota">${c.difese.map(esc).join("<br>")}</p>` : ""}
      <div class="fondo colonna">
        <button class="btn up grande" data-come="pieni">Applica ${d.tot}</button>
        <div class="tre-btn"><button class="btn" data-come="meta"><small>Resiste</small>Metà ${danniFinali(d.tot, "meta")}</button><button class="btn" data-come="doppio"><small>Vulnerabile</small>Doppio ${danniFinali(d.tot, "doppio")}</button><button class="btn" data-come="nulla"><small>Immune</small>Nessuno</button></div>
      </div>`, { tono: "rosso" });
  }
  vibra(50);
  disegna();
}

/** Per il riepilogo di fine scontro: quanti danni ha fatto ciascun giocatore. */
export function danniPerGiocatore(idScontro) {
  const out = {};
  A.filter(a => a.scontro === idScontro && a.stato === "applicato" && a.tipo !== "cura").forEach(a => { out[a.pgNome] = (out[a.pgNome] || 0) + (a.applicati || 0); });
  return out;
}
/** Nella vista del master: quanti attacchi aspettano una sua decisione (se ha chiuso la finestra senza decidere). */
export function htmlMaster() {
  const q = daConfermare();
  return q.length ? `<button class="avviso-conferma" data-at="conferme"><b>${q.length}</b> ${q.length === 1 ? "attacco aspetta te" : "attacchi aspettano te"}</button>` : "";
}

/* ======================================================================
   MASTER: una sua creatura attacca
   ====================================================================== */
function bersagliMaster() {
  const pgs = latoGruppo(MA.gruppo) === "alleato" ? [] : (SC.ordine || []).map(v => bersaglioPg(v.id)).filter(Boolean);
  return [...pgs, ...bersagliCreature(MA.gruppo)];
}
function apriAttaccoMaster(gruppo, i) {
  MA = { gruppo, i, fase: "bersaglio", bersaglio: null, modo: "normale", d20: [], dadi: {} };
  MA.f = finestra({ chiave: "mattacco", titolo: "Attacco del master", onClick: clicFinestraMaster, onChiudi: () => { MA = null; setTimeout(proponiConferma, 50); },
    onIndietro: () => { if (MA.fase === "tiro") { MA.fase = "bersaglio"; MA.d20 = []; } else if (MA.fase === "danni") { MA.fase = "tiro"; } disegnaMaster(); } });
  disegnaMaster();
}
const PASSI_M = ["bersaglio", "tiro", "esito", "danni", "fine"];
function disegnaMaster(nuovo = true) {
  const az = azioneDi(MA.gruppo, MA.i); if (!az) return MA.f.chiudi();
  const a = az.azione, bs = bersagliMaster(), b = bs.find(x => x.id === MA.bersaglio);
  const t = tiroPerColpire({ dadi: MA.d20, modo: MA.modo, bonus: a.colpire });
  const opz = { passo: PASSI_M.indexOf(MA.fase) + 1, di: PASSI_M.length, nuovoPasso: nuovo, indietro: MA.fase === "tiro" || MA.fase === "danni", tono: "rosso" };
  const testa = `<p class="aiuto">${esc(az.chi)} · ${esc(a.nome)} ${sg(a.colpire)} · ${esc(a.danni || "")}</p>`;
  let h = "";
  if (MA.fase === "bersaglio") {
    h = `<p class="domanda">Chi è il bersaglio?</p>${testa}<div class="carte">${bs.map(x => `<button class="carta ${x.creatura ? "alleato" : "gruppo"}" data-mb="${x.id}"><span class="c-nome"><b>${esc(x.nome)}</b><small>${x.hp}/${x.maxhp} PF</small></span><span class="c-num">CA ${x.ca}</span></button>`).join("")}</div>`;
  } else if (MA.fase === "tiro") {
    const n = MA.modo === "normale" ? 1 : 2;
    h = `<p class="domanda">Tira il d20</p><p class="aiuto">${esc(az.chi)} contro ${esc(b.nome)} (CA ${b.ca})</p>
      <div class="seg">${[["normale", "Normale"], ["vantaggio", "Vantaggio"], ["svantaggio", "Svantaggio"]].map(([m, l]) => `<button data-mmodo="${m}" aria-pressed="${MA.modo === m}">${l}</button>`).join("")}</div>
      ${caselleDadi(MA.d20, n, 20, "md20")}${tastierino(20, null, "data-md20")}
      <div class="totale">${t ? `${t.usato} ${sg(a.colpire)} =<b>${t.tot}</b><span>contro CA ${b.ca}</span>` : `<span>${sg(a.colpire)} al tiro</span>`}</div>
      <div class="fondo"><button class="btn up" data-mat="esito"${t ? "" : " disabled"}>Vedi se colpisce</button></div>`;
  } else if (MA.fase === "esito") {
    const es = esito(t, b.ca);
    h = rivelazione(es === "mancato" ? "mancato" : t.critico ? "critico" : "colpito", es === "mancato" ? "Mancato" : t.critico ? "Critico!" : "Colpito!", `${t.tot} contro CA ${b.ca} · ${esc(b.nome)}`) +
      (es === "mancato" ? `<div class="fondo"><button class="btn up" data-mat="chiudi">Chiudi</button></div>` : `<div class="fondo"><button class="btn up" data-mat="danni">Tira i danni${t.critico ? " (doppi)" : ""}</button></div>`);
  } else if (MA.fase === "danni") {
    const parti = partiMaster(a, t), som = sommaDanni(parti), fin = som ? conResistenze(som.perTipo, b.res) : null, attiva = parti.find(p => p.valori.some(vuoto));
    h = `<p class="domanda">Tira i danni</p><p class="aiuto">${t.critico ? "Critico: i dadi sono doppi. " : ""}${esc(a.danni || "")}</p>
      ${parti.length ? parti.map(p => `<div class="riga-danni"><b>${p.n}d${p.facce}${p.mod ? sg(p.mod) : ""} <small>${esc(p.tipo)}</small></b>${caselleDadi(p.valori, p.n, p.facce, "m" + p.k)}</div>`).join("") : `<p class="aiuto">Questa azione non ha dadi di danno: applica l'effetto a voce.</p>`}
      ${attiva ? tastierino(attiva.facce, null, "data-mfaccia") : ""}
      <div class="totale">${fin ? `Totale<b>${fin.tot}</b>${fin.dimezzati.length ? `<span>${esc(b.nome)} resiste: ${fin.dimezzati.join(", ")}</span>` : ""}` : `<span>Mancano dei dadi</span>`}</div>
      <div class="fondo"><button class="btn up" data-mat="applica"${fin ? "" : " disabled"}>Applica ${fin ? fin.tot : ""} a ${esc(b.nome)}</button></div>`;
  } else if (MA.fase === "fine") {
    h = rivelazione("danno", `−${MA.applicati}`, `<b>${esc(b ? b.nome : "")}</b> colpito da ${esc(az.chi)}`) + `<div class="fondo"><button class="btn up" data-mat="chiudi">Fatto</button></div>`;
  }
  MA.f.mostra(h, opz);
}
function partiMaster(a, t) {
  return partiFormula(a.danni).map((p, k) => {
    const n = t && t.critico ? p.n * 2 : p.n;
    return { k, n, facce: p.f, mod: p.mod, tipo: p.tipo || "danni", valori: Array.from({ length: n }, (_, i) => (MA.dadi[k] || [])[i] ?? "") };
  });
}
async function clicFinestraMaster(e) {
  if (!MA) return;
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const ds = b.dataset, az = azioneDi(MA.gruppo, MA.i); if (!az) return;
  const a = az.azione, t = tiroPerColpire({ dadi: MA.d20, modo: MA.modo, bonus: a.colpire });
  if (ds.mb) { MA.bersaglio = ds.mb; MA.fase = "tiro"; return disegnaMaster(); }
  if (ds.mmodo) { MA.modo = ds.mmodo; MA.d20 = MA.d20.slice(0, MA.modo === "normale" ? 1 : 2); return disegnaMaster(false); }
  if (ds.md20) { const n = MA.modo === "normale" ? 1 : 2, i = Array.from({ length: n }, (_, k) => MA.d20[k]).findIndex(vuoto); if (i >= 0) MA.d20[i] = +ds.md20; else MA.d20[n - 1] = +ds.md20; return disegnaMaster(false); }
  if (ds.casella === "md20") { MA.d20[+ds.i] = ""; return disegnaMaster(false); }
  if (ds.mfaccia) {
    const p = partiMaster(a, t).find(x => x.valori.some(vuoto)); if (!p) return;
    const v = (MA.dadi[p.k] || []).slice(); v[p.valori.findIndex(vuoto)] = +ds.mfaccia; MA.dadi[p.k] = v; return disegnaMaster(false);
  }
  if (ds.casella && ds.casella.startsWith("m")) { const k = +ds.casella.slice(1), v = (MA.dadi[k] || []).slice(); v[+ds.i] = ""; MA.dadi[k] = v; return disegnaMaster(false); }
  switch (ds.mat) {
    case "esito": { const bb = bersagliMaster().find(x => x.id === MA.bersaglio); MA.fase = "esito"; vibra(esito(t, bb.ca) === "mancato" ? 90 : [60, 40, 120]); return disegnaMaster(); }
    case "danni": MA.fase = "danni"; return disegnaMaster();
    case "applica": {
      const bb = bersagliMaster().find(x => x.id === MA.bersaglio), som = sommaDanni(partiMaster(a, t)); if (!som) return;
      const fin = conResistenze(som.perTipo, bb.res);
      try {
        if (bb.creatura) { const campi = await ferisci(bb.id, fin.tot, SC); await scriviScontro(campi); }
        else colpisciPg(bb.id, fin.tot, az.chi);
      } catch (_) { toast("Non salvato: controlla la connessione", 5000); return; }
      MA.applicati = fin.tot; MA.fase = "fine"; return disegnaMaster();
    }
    case "chiudi": MA.f.chiudi(); return;
  }
}

/* ======================================================================
   Tocchi che arrivano dalla vista dello scontro (pulsanti con data-at)
   ====================================================================== */
export async function clic(b, pg, scrivi) {
  if (scrivi) scriviScontro = scrivi;
  switch (b.dataset.at) {
    case "apri": if (pg) apriAttacco(pg); return true;
    case "oggetto": if (pg) apriOggetto(pg); return true;
    case "m-nuovo": apriAttaccoMaster(b.dataset.g, +b.dataset.i); return true;
    case "conferme": { const q = daConfermare(); if (q.length) { rimandati.delete(q[0].id + q[0].stato); apriConferma(q[0]); } return true; }
    default: return false;
  }
}
/** Non ci sono più caselle da scrivere: i numeri si scelgono dalla griglia. */
export function input() { return false; }
