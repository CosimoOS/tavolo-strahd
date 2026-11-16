/* Attacchi nello scontro, a passi: una domanda alla volta, numeri scelti da una griglia, risultato che si rivela.

   Giocatore:  bersaglio → arma → d20 → (il telefono del master confronta con la CA) → colpito/mancato → danni → conferma del master.
   Master:     riceve "12 danni a Lupo 2" e conferma con un tocco (o metà, doppio, nessuno).
               Attacca con le sue creature: bersaglio → d20 → esito → danni → applica.

   Nell'archivio: scontro/attuale/attacchi/<id> → { scontro, round, turno, pg, pgNome, bersaglio, bersaglioNome, arma, armaI,
     tipo, tiro, stato: "colpire" | "colpito" | "mancato" | "danni" | "applicato", danni?, applicati? }
   La CA non viene mai scritta lì: il giocatore vede solo "colpito" o "mancato". */
import { tiroPerColpire, esito, dadiDanno, sommaDanni, danniFinali, partiFormula, conResistenze } from "./regole/attacco.js";
import { creaturaInCampo, ferisci, azioneDi, bersagliCreature, latoGruppo } from "./nemici.js";
import { finestra, finestraAperta, tastierino, caselleDadi, rivelazione, vibra } from "./passi.js";

const ATT = "scontro/attuale/attacchi";
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);
const vuoto = v => v == null || v === "";

let arch = null, dm = false, toast = () => {}, ridisegna = () => {}, dati = () => null, spendi = () => {}, ascolto = null;
let bersaglioPg = () => null, colpisciPg = () => null, scriviScontro = async () => {};
let A = [], SC = null, risolti = new Set(), confermati = new Set(), rimandati = new Set();
let P = null;    // attacco del giocatore in corso
let MA = null;   // attacco del master in corso

export function avviaAttacchi({ archivio, master, avvisa, aggiorna, datiAttacco, spendiSlot, bersaglio, colpisci, scrivi }) {
  arch = archivio; dm = master; toast = avvisa; ridisegna = aggiorna; dati = datiAttacco; spendi = spendiSlot;
  bersaglioPg = bersaglio || (() => null); colpisciPg = colpisci || (() => null); scriviScontro = scrivi || (async () => {});
  A = []; risolti = new Set(); confermati = new Set(); P = null; MA = null;
  ascolto = arch.ascoltaRaccolta(ATT, lista => {
    A = lista.map(x => ({ id: x.id, ...x.dati }));
    if (P && P.id) seguiMio();
    if (dm) {
      A.filter(a => a.stato === "colpire" && SC && a.scontro === SC.id && !risolti.has(a.id)).forEach(risolvi);
      proponiConferma();
    }
    ridisegna();
  });
}
export function fermaAttacchi() { if (ascolto) ascolto(); ascolto = null; const f = finestraAperta(); if (f) f.chiudi(true); }
export function aggiornaScontro(nuovo) { SC = nuovo; if (P && P.fase === "fine" && P.f && P.f.aperta) disegnaGiocatore(false); if (SC && SC.stato !== "in corso") { const f = finestraAperta(); if (f && (f.chiave === "attacco" || f.chiave === "mattacco")) f.chiudi(true); } }

/* ======================================================================
   GIOCATORE
   ====================================================================== */
/** I pulsanti grandi del turno del giocatore (li mette lo scontro sotto "Tocca a te"). */
export function htmlGiocatore(pg) {
  if (!SC || SC.stato !== "in corso") return "";
  const d = dati(pg.id); if (!d || !d.attacchi.length) return "";
  const fatti = A.filter(x => x.scontro === SC.id && x.pg === pg.id && x.round === SC.round && x.turno === SC.turno);
  const ultimo = fatti[fatti.length - 1];
  const riassunto = ultimo ? `<p class="ultimo-att">${ultimo.stato === "applicato" ? `Ultimo attacco: ${esc(ultimo.bersaglioNome)} −${ultimo.applicati}` : ultimo.stato === "mancato" ? `Ultimo attacco: mancato` : `Attacco in corso…`}</p>` : "";
  return `<div class="azioni-turno">
    <button class="azione-grande" data-at="apri"><svg class="az-icona" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l10 10M4 5l1-1M13 16l3-3M15 18l3-3M17.5 17.5l2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 4L9 14M20 5l-1-1M11 16l-3-3M9 18l-3-3M6.5 17.5L4 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><b>Attacca</b><small>${fatti.length ? `${fatti.length} ${fatti.length === 1 ? "attacco" : "attacchi"} in questo turno` : "arma o incantesimo"}</small></button>
  </div>${riassunto}`;
}

function nuovoAttacco(pg) {
  return { pg, fase: "bersaglio", bersaglio: null, armaI: null, modo: "normale", d20: [], bonus: 0, dadi: {}, pun: 0, nonMorto: false, extra: 0, id: null, statoVisto: "" };
}
function apriAttacco(pg) {
  P = nuovoAttacco(pg);
  P.f = finestra({ chiave: "attacco", titolo: "Attacco", onClick: clicFinestraGiocatore, onIndietro: indietroGiocatore, onChiudi: () => { P = null; ridisegna(); } });
  disegnaGiocatore();
}
const bersagliGiocatore = () => (SC.campo || []).filter(c => c.tipo !== "alleato" && c.ferite !== "sconfitto");
const PASSI_G = ["bersaglio", "arma", "tiro", "esito", "danni", "fine"];
function disegnaGiocatore(nuovo = true) {
  if (!P) return;
  const d = dati(P.pg.id), a = P.id && A.find(x => x.id === P.id);
  const opz = { passo: PASSI_G.indexOf(P.fase === "attesa" ? "esito" : P.fase === "confermare" ? "fine" : P.fase) + 1, di: PASSI_G.length, nuovoPasso: nuovo,
    indietro: ["arma", "tiro"].includes(P.fase) || (P.fase === "danni" && false) };
  let h = "";
  if (P.fase === "bersaglio") {
    const b = bersagliGiocatore();
    h = `<p class="domanda">Chi attacchi?</p>
      ${b.length ? `<div class="carte">${b.map(c => `<button class="carta nemico" data-bers="${c.id}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}${c.subiti ? ` · −${c.subiti}` : ""}</small></span></button>`).join("")}</div>`
        : `<p class="aiuto">Non c'è nessun nemico in piedi.</p>`}`;
  } else if (P.fase === "arma") {
    h = `<p class="domanda">Con cosa attacchi?</p><p class="aiuto">${esc(nomeBersaglio())}</p>
      <div class="carte">${d.attacchi.map((w, i) => `<button class="carta" data-arma="${i}"><span class="c-nome"><b>${esc(w.n)}</b><small>${w.dice[0]}d${w.dice[1]}${w.mod ? sg(w.mod) : ""} ${esc((w.t || "").toLowerCase())}${w.note ? ` · ${esc(w.note)}` : ""}</small></span><span class="c-num">${sg(w.hit)}</span></button>`).join("")}</div>`;
  } else if (P.fase === "tiro") {
    const w = d.attacchi[P.armaI], n = P.modo === "normale" ? 1 : 2, t = tiroCorrente(d);
    h = `<p class="domanda">Tira il d20</p><p class="aiuto">${esc(w.n)} contro ${esc(nomeBersaglio())}. Tocca il numero uscito.</p>
      <div class="seg">${[["normale", "Normale"], ["vantaggio", "Vantaggio"], ["svantaggio", "Svantaggio"]].map(([m, l]) => `<button data-modo="${m}" aria-pressed="${P.modo === m}">${l}</button>`).join("")}</div>
      ${caselleDadi(P.d20, n, 20, "d20")}
      ${tastierino(20, null, "data-d20")}
      <div class="bonus-riga"><span>Bonus in più <small>(es. il d4 di Benedizione)</small></span><span class="stepper"><button class="btn step" data-bonus="-1" aria-label="Bonus meno uno">−</button><b class="num">${sg(P.bonus)}</b><button class="btn step" data-bonus="1" aria-label="Bonus più uno">+</button></span></div>
      <div class="totale">${t ? `${t.usato} ${sg(t.bonus)} =<b>${t.tot}</b>` : `<span>${sg(w.hit + P.bonus)} al tiro</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-tiro"${t ? "" : " disabled"}>Attacca</button></div>`;
  } else if (P.fase === "attesa") {
    h = rivelazione("attesa", "Al master…", `${a ? a.tiro.tot : ""} per colpire contro ${esc(nomeBersaglio())}`) + `<p class="aiuto centrato">Il telefono del master confronta il tiro con la difesa del bersaglio.</p>`;
  } else if (P.fase === "esito") {
    const crit = a.tiro.critico, preso = a.stato === "colpito";
    h = rivelazione(preso ? (crit ? "critico" : "colpito") : "mancato", preso ? (crit ? "Critico!" : "Colpito!") : "Mancato", `${a.tiro.tot} per colpire contro ${esc(a.bersaglioNome)}`) +
      (preso ? `<div class="fondo"><button class="btn up" data-att="vai-danni">Tira i danni${crit ? " (doppi)" : ""}</button></div>`
        : `<div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn" data-att="fine-turno">Fine turno</button><button class="btn up" data-att="ancora">Nuovo attacco</button></div>`);
  } else if (P.fase === "danni") {
    const parti = partiGiocatore(d, a), som = sommaDanni(parti, P.extra), attiva = parti.find(p => p.valori.some(vuoto));
    const slot = d.punizione ? d.slot.filter(s => s.liberi > 0 && s.liv <= 4) : [];
    h = `<p class="domanda">Tira i danni</p><p class="aiuto">${a.tiro.critico ? "Critico: i dadi sono doppi. " : ""}Tocca il numero di ogni dado.</p>
      ${slot.length ? `<div class="riga-danni"><b>Punizione divina <small>spende uno slot</small></b><div class="seg">
        <button data-pun="0" aria-pressed="${!P.pun}">No</button>${slot.map(s => `<button data-pun="${s.liv}" aria-pressed="${P.pun === s.liv}">Slot ${s.liv}° · ${s.liv + 1}d8</button>`).join("")}</div>
        ${P.pun ? `<button class="extra" data-nm aria-pressed="${P.nonMorto}"><span class="ex-spia"></span><span class="ex-testo">Contro un non morto o un immondo<small>+1d8 radianti</small></span></button>` : ""}</div>` : ""}
      ${parti.map(p => `<div class="riga-danni"><b>${esc(p.nome)} <small>${p.n}d${p.facce}${p.mod ? sg(p.mod) : ""} ${esc(p.tipo)}</small></b>${caselleDadi(p.valori, p.n, p.facce, p.chiave)}</div>`).join("")}
      ${attiva ? tastierino(attiva.facce, null, "data-faccia") : ""}
      <div class="bonus-riga"><span>Altri danni <small>(Marchio del cacciatore, Uccisore di colossi…)</small></span><span class="stepper"><button class="btn step" data-extra="-1" aria-label="Meno uno">−</button><b class="num">+${P.extra}</b><button class="btn step" data-extra="1" aria-label="Più uno">+</button></span></div>
      <div class="totale">${som ? `Totale<b>${som.tot}</b>` : `<span>Mancano dei dadi</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-danni"${som ? "" : " disabled"}>Invia ${som ? som.tot + " danni" : "i danni"}</button></div>`;
  } else if (P.fase === "confermare") {
    h = rivelazione("attesa", "Al master…", `${P.inviati} danni a ${esc(a.bersaglioNome)}: li sta confermando`);
  } else if (P.fase === "fine") {
    const ora = (SC.campo || []).find(c => c.id === a.bersaglio), giu = ora && ora.ferite === "sconfitto";
    h = rivelazione("danno", a.applicati ? `−${a.applicati}` : "Nessun danno", giu ? `<b>${esc(a.bersaglioNome)}</b> è a terra` : `<b>${esc(a.bersaglioNome)}</b>${ora ? ` ora è ${esc(ora.ferite)}` : ""}`) +
      (a.applicati !== a.danni.tot ? `<p class="aiuto centrato">Il master ne ha contati ${a.applicati} su ${a.danni.tot} (resistenze o immunità).</p>` : "") +
      `<div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn" data-att="fine-turno">Fine turno</button><button class="btn up" data-att="ancora">Nuovo attacco</button></div>`;
  }
  P.f.mostra(h, opz);
}
const nomeBersaglio = () => { const c = (SC.campo || []).find(x => x.id === P.bersaglio); return c ? c.nome : ""; };
const tiroCorrente = d => tiroPerColpire({ dadi: P.d20, modo: P.modo, bonus: d.attacchi[P.armaI].hit + P.bonus, critMin: d.critMin });
function partiGiocatore(d, a) {
  const w = d.attacchi[a.armaI ?? P.armaI], [n, f] = dadiDanno(w.dice, a.tiro.critico);
  const parti = [{ chiave: "arma", nome: w.n, valori: Array.from({ length: n }, (_, i) => (P.dadi.arma || [])[i] ?? ""), n, facce: f, mod: w.mod, tipo: (w.t || "").toLowerCase() }];
  if (P.pun) {
    const base = P.pun + 1 + (P.nonMorto ? 1 : 0), k = a.tiro.critico ? base * 2 : base;
    parti.push({ chiave: "pun", nome: "Punizione divina", valori: Array.from({ length: k }, (_, i) => (P.dadi.pun || [])[i] ?? ""), n: k, facce: 8, mod: 0, tipo: "radianti" });
  }
  return parti;
}
/* il documento dell'attacco è cambiato: si passa al passo giusto, con un segnale */
function seguiMio() {
  const a = A.find(x => x.id === P.id); if (!a || a.stato === P.statoVisto) return;
  P.statoVisto = a.stato;
  if (a.stato === "colpito" || a.stato === "mancato") { P.fase = "esito"; vibra(a.stato === "mancato" ? 90 : [60, 40, 120]); }
  else if (a.stato === "applicato") { P.fase = "fine"; vibra([40, 30, 40]); }
  else return;
  if (P.f.aperta) disegnaGiocatore(); else toast(a.stato === "mancato" ? "Mancato" : a.stato === "applicato" ? `${a.bersaglioNome}: −${a.applicati}` : "Colpito! Tira i danni", 5000);
}
function indietroGiocatore() {
  if (P.fase === "arma") P.fase = "bersaglio"; else if (P.fase === "tiro") { P.fase = "arma"; P.d20 = []; }
  disegnaGiocatore();
}
async function clicFinestraGiocatore(e) {
  if (!P) return;
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = dati(P.pg.id), a = P.id && A.find(x => x.id === P.id);
  const ds = b.dataset;
  if (ds.bers) { P.bersaglio = ds.bers; P.fase = "arma"; return disegnaGiocatore(); }
  if (ds.arma != null) { P.armaI = +ds.arma; P.fase = "tiro"; P.d20 = []; return disegnaGiocatore(); }
  if (ds.modo) { P.modo = ds.modo; P.d20 = P.d20.slice(0, P.modo === "normale" ? 1 : 2); return disegnaGiocatore(false); }
  if (ds.d20) { const n = P.modo === "normale" ? 1 : 2, i = Array.from({ length: n }, (_, k) => P.d20[k]).findIndex(vuoto); if (i >= 0) P.d20[i] = +ds.d20; else P.d20[n - 1] = +ds.d20; return disegnaGiocatore(false); }
  if (ds.casella === "d20") { P.d20[+ds.i] = ""; return disegnaGiocatore(false); }
  if (ds.bonus) { P.bonus = Math.max(-5, Math.min(10, P.bonus + +ds.bonus)); return disegnaGiocatore(false); }
  if (ds.pun != null) { P.pun = +ds.pun; P.dadi.pun = []; return disegnaGiocatore(false); }
  if (b.hasAttribute("data-nm")) { P.nonMorto = !P.nonMorto; P.dadi.pun = []; return disegnaGiocatore(false); }
  if (ds.faccia) {
    const parti = partiGiocatore(d, a), p = parti.find(x => x.valori.some(vuoto)); if (!p) return;
    const v = (P.dadi[p.chiave] || []).slice(); v[p.valori.findIndex(vuoto)] = +ds.faccia; P.dadi[p.chiave] = v; return disegnaGiocatore(false);
  }
  if (ds.casella) { const v = (P.dadi[ds.casella] || []).slice(); v[+ds.i] = ""; P.dadi[ds.casella] = v; return disegnaGiocatore(false); }
  if (ds.extra) { P.extra = Math.max(0, P.extra + +ds.extra); return disegnaGiocatore(false); }
  switch (ds.att) {
    case "invia-tiro": {
      const w = d.attacchi[P.armaI], t = tiroCorrente(d), c = (SC.campo || []).find(x => x.id === P.bersaglio); if (!t || !c) return;
      P.id = `${P.pg.id}-${Date.now()}`; P.statoVisto = "colpire"; P.fase = "attesa"; disegnaGiocatore();
      try {
        await arch.scrivi(`${ATT}/${P.id}`, { scontro: SC.id, round: SC.round, turno: SC.turno, pg: P.pg.id, pgNome: d.nome,
          bersaglio: c.id, bersaglioNome: c.nome, arma: w.n, armaI: P.armaI, tipo: (w.t || "").toLowerCase(), tiro: t, stato: "colpire" });
      } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "tiro"; P.id = null; disegnaGiocatore(); }
      return;
    }
    case "vai-danni": P.fase = "danni"; return disegnaGiocatore();
    case "invia-danni": {
      const som = sommaDanni(partiGiocatore(d, a), P.extra); if (!som) return;
      const perTipo = { ...som.perTipo }; if (perTipo.altro) { perTipo["extra"] = perTipo.altro; delete perTipo.altro; }
      P.inviati = som.tot; P.fase = "confermare"; disegnaGiocatore();
      try { await arch.aggiorna(`${ATT}/${P.id}`, { stato: "danni", danni: { tot: som.tot, perTipo } }); if (P.pun) spendi(P.pg.id, P.pun); }
      catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "danni"; disegnaGiocatore(); }
      return;
    }
    case "ancora": { const pg = P.pg; P.f.chiudi(true); apriAttacco(pg); return; }
    case "fine-turno": P.f.chiudi(true); P = null; document.querySelector('#vistaScontro [data-az="fine"]')?.click(); return;
    case "chiudi": P.f.chiudi(); return;
  }
}

/* ======================================================================
   MASTER: esito automatico e conferma dei danni con un tocco
   ====================================================================== */
async function risolvi(a) {
  risolti.add(a.id);
  const c = creaturaInCampo(a.bersaglio);
  if (!c) return;
  try { await arch.aggiorna(`${ATT}/${a.id}`, { stato: esito(a.tiro, c.ca) }); } catch (_) { risolti.delete(a.id); }
}
const daConfermare = () => SC ? A.filter(a => a.scontro === SC.id && a.stato === "danni" && !confermati.has(a.id)) : [];
/* se il master non sta facendo altro, la conferma si apre da sola (non quelle che ha già chiuso senza decidere) */
function proponiConferma() {
  const q = daConfermare().filter(a => !rimandati.has(a.id)); if (!q.length) return;
  const f = finestraAperta();
  if (f && f.chiave !== "conferma") return;
  apriConferma(q[0]);
}
function apriConferma(a) {
  const c = creaturaInCampo(a.bersaglio), t = a.tiro, d = a.danni;
  const parti = Object.entries(d.perTipo).map(([k, v]) => `${v} ${esc(k)}`).join(" + ");
  let deciso = false;
  const f = finestra({ chiave: "conferma", titolo: "Danni da confermare", onChiudi: () => { if (!deciso) rimandati.add(a.id); setTimeout(proponiConferma, 50); }, onClick: async e => {
    const b = e.target.closest("[data-come]"); if (!b) return;
    deciso = true; confermati.add(a.id);
    const n = danniFinali(d.tot, b.dataset.come);
    try {
      /* prima lo stato della creatura nello scontro, poi "applicato": così il giocatore vede subito com'è rimasta */
      const campi = n > 0 ? await ferisci(a.bersaglio, n, SC) : null;
      if (campi) await scriviScontro(campi);
      await arch.aggiorna(`${ATT}/${a.id}`, { stato: "applicato", applicati: n });
      toast(`${c ? c.nome : a.bersaglioNome}: −${n}`);
    } catch (_) { confermati.delete(a.id); toast("Non salvato: controlla la connessione", 5000); }
    f.chiudi();
  } });
  vibra(50);
  f.mostra(`<p class="domanda">${esc(a.pgNome)} colpisce ${esc(c ? c.nome : a.bersaglioNome)}</p>
    <p class="aiuto">${esc(a.arma)} · ${t.tot} contro CA ${c ? c.ca : "?"}${t.critico ? " · critico" : ""}</p>
    ${rivelazione("danno", `${d.tot}`, `danni · ${parti}`)}
    ${c && c.difese.length ? `<p class="difese-nota">${c.difese.map(esc).join("<br>")}</p>` : ""}
    <div class="fondo colonna">
      <button class="btn up grande" data-come="pieni">Applica ${d.tot}</button>
      <div class="tre-btn"><button class="btn" data-come="meta"><small>Resiste</small>Metà ${danniFinali(d.tot, "meta")}</button><button class="btn" data-come="doppio"><small>Vulnerabile</small>Doppio ${danniFinali(d.tot, "doppio")}</button><button class="btn" data-come="nulla"><small>Immune</small>Nessuno</button></div>
    </div>`, { tono: "rosso" });
}

/** Nella vista del master: quanti danni aspettano conferma (se ha chiuso la finestra senza decidere). */
export function htmlMaster() {
  const q = daConfermare();
  return q.length ? `<button class="avviso-conferma" data-at="conferme"><b>${q.length}</b> ${q.length === 1 ? "attacco da confermare" : "attacchi da confermare"}</button>` : "";
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
    case "m-nuovo": apriAttaccoMaster(b.dataset.g, +b.dataset.i); return true;
    case "conferme": { const q = daConfermare(); if (q.length) apriConferma(q[0]); return true; }
    default: return false;
  }
}
/** Non ci sono più caselle da scrivere: i numeri si scelgono dalla griglia. */
export function input() { return false; }
