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
import { tiroPerColpire, esito, sommaDanni, danniFinali, partiFormula, conResistenze, balzaDardo } from "./regole/attacco.js";
import { partiDanno, curaDi, danniTs } from "./regole/magia.js";
import { quantita } from "./regole/base.js";
import { creaturaInCampo, ferisci, ferisciMolti, azioneDi, bersagliCreature, latoGruppo, segnaReazioneCreatura } from "./nemici.js";
import { finestra, finestraAperta, tastierino, caselleDadi, rivelazione, vibra } from "./passi.js";
import { chiaveTurno, statoTurno, impetuosaPronta, dopoAttacco, dopoAzione, dopoBonus, conImpetuosa, giraAzione, giraBonus, reazioneLibera, puoIncantesimo } from "./regole/turno.js";
import { extraAccesi, proponiMarchio, attiva, EFFETTI } from "./regole/effetti.js";
import { opzioni } from "./campagna.js";
import { icona } from "./icone.js";

const ATT = "scontro/attuale/attacchi";
const CAR = { for: "Forza", des: "Destrezza", cos: "Costituzione", int: "Intelligenza", sag: "Saggezza", car: "Carisma" };
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);
const vuoto = v => v == null || v === "";
const SPADE = icona("scontro", "az-icona"), BOCCETTA = icona("boccetta", "az-icona");

let arch = null, dm = false, toast = () => {}, ridisegna = () => {}, dati = () => null, spendi = () => {}, ascolto = null;
let bersaglioPg = () => null, colpisciPg = () => null, scriviScontro = async () => {};
let usaRisorsa = () => {}, consumaOggetto = () => {}, curaPg = () => null, modifica = () => {}, munizione = () => null;
let A = [], SC = null, risolti = new Set(), confermati = new Set(), rimandati = new Set();
let P = null;    // attacco del giocatore in corso
let O = null;    // oggetto che il giocatore sta usando
let MA = null;   // attacco del master in corso
let AB = null;   // azione bonus o reazione che il giocatore sta scegliendo

export function avviaAttacchi({ archivio, master, avvisa, aggiorna, datiAttacco, spendiSlot, bersaglio, colpisci, scrivi, usa, consuma, cura, modificaScheda, usaMunizione }) {
  munizione = usaMunizione || (() => null);
  modifica = modificaScheda || (() => {});
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
  if (SC && SC.stato !== "in corso") { const f = finestraAperta(); if (f && ["attacco", "mattacco", "oggetto", "bonus", "reazione"].includes(f.chiave)) f.chiudi(true); }
}

/* ======================================================================
   GIOCATORE
   ====================================================================== */
/** Il turno del giocatore: i gettoni Azione · Bonus · Reazione e i pulsanti grandi (li mette lo scontro sotto "tocca a te").
    Seguono le regole: finiti gli attacchi "Attacca" si spegne; l'Azione impetuosa compare quando l'azione è finita.
    Per un'eccezione concessa dal master si tocca il gettone "Azione" e l'azione torna. */
export function htmlGiocatore(pg) {
  if (!SC || SC.stato !== "in corso") return "";
  const d = dati(pg.id); if (!d) return "";
  const ch = chiaveTurno(SC), st = statoTurno(d.az, ch, d.perAzione), reaz = reazioneLibera(d.reazione, SC, pg.id);
  const fatti = A.filter(x => x.scontro === SC.id && x.pg === pg.id && x.round === SC.round && x.turno === SC.turno && x.tipo !== "cura" && !x.reazione);
  const ultimo = fatti[fatti.length - 1];
  const riassunto = ultimo ? `<p class="ultimo-att">${ultimo.stato === "applicato" ? `Ultimo attacco: ${esc(ultimo.bersaglioNome)} −${ultimo.applicati}` : ultimo.stato === "mancato" ? `Ultimo attacco: mancato` : `Attacco in corso…`}</p>` : "";
  const gettone = (k, nome, libero, conta = "") => `<button class="gettone${libero ? "" : " usato"}" data-at="g-${k}" data-pg="${pg.id}" aria-label="${nome}: ${libero ? "libera" : "usata, tocca per riaverla"}">${nome}${conta}</button>`;
  const sotto = !st.puoAttaccare ? "attacchi finiti in questo turno" : st.inAttacco || st.perAzione > 1 ? `attacco ${st.prossimoAttacco} di ${st.perAzione}` : "arma, incantesimo o oggetto";
  const pozioneBonus = opzioni().pozioniBonus && !st.bonus;
  const ogg = st.puoAzione ? "pozioni e altro" : pozioneBonus ? "una pozione con l'azione bonus" : "serve un'azione";
  const usi = d.impetuose ? d.impetuose.max - d.impetuose.usate : 0;
  const imp = impetuosaPronta(d.az, ch, d.perAzione, d.impetuose)
    ? `<button class="btn impetuosa pronta" data-at="impetuosa" data-pg="${pg.id}">Azione impetuosa<small>un'azione in più in questo turno · ${usi === 1 ? "1 uso" : `${usi} usi`}</small></button>` : "";
  return `<div class="gettoni" aria-label="Cosa ti resta in questo turno">
      ${gettone("azione", "Azione", st.puoAttaccare, st.azioniLibere > 1 ? ` <small>×${st.azioniLibere}</small>` : "")}${gettone("bonus", "Bonus", !st.bonus)}${gettone("reazione", "Reazione", reaz)}</div>
    <div class="azioni2">
      ${d.opzioni.length ? `<button class="az-grande prima" data-at="apri"${st.puoAttaccare ? "" : ` disabled data-perche="Hai già usato l'azione in questo turno"`}>${SPADE}<span><b>Attacca</b><small>${sotto}</small></span></button>` : ""}
      ${(d.usabili || []).length ? `<button class="az-grande seconda" data-at="oggetto"${st.puoAzione || pozioneBonus ? "" : ` disabled data-perche="Hai già usato l'azione in questo turno"`}>${BOCCETTA}<span><b>Oggetto</b><small>${ogg}</small></span></button>` : ""}
    </div>${imp}${riassunto}`;
}
/* Azione impetuosa: un uso in meno sulla scheda, un'azione in più in questo turno */
function usaImpetuosa(id) {
  modifica(id, St => { St.ai = (St.ai || 0) + 1; });
  segnaTurno(id, conImpetuosa);
  toast("Azione impetuosa: hai un'altra azione", 5000); vibra([60, 40, 120]);
}
/* il conto del turno sulla scheda di chi gioca (St.az); la reazione a parte (St.reazione) */
const segnaTurno = (k, fn) => { modifica(k, St => { St.az = fn(St.az, chiaveTurno(SC)); }); ridisegna(); };
const segnaReazione = k => { modifica(k, St => { St.reazione = { scontro: SC.id, round: SC.round, turno: SC.turno }; }); ridisegna(); };
const mioTurno = k => { const v = SC && SC.ordine && SC.ordine[SC.turno]; return !!(v && v.id === k); };

function apriAttacco(pg, reazione = false) {
  P = { pg, reazione, fase: "bersaglio", bersaglio: null, altri: [], opI: null, modo: "normale", d20: [], bonus: 0, dadi: {}, pun: 0, nonMorto: false, accesi: [], extra: 0, id: null, statoVisto: "" };
  P.f = finestra({ chiave: "attacco", titolo: reazione ? "Attacco di opportunità" : "Attacco", onClick: clicFinestraGiocatore, onIndietro: indietroGiocatore, onChiudi: () => { P = null; ridisegna(); } });
  disegnaGiocatore();
}
const bersagliGiocatore = () => (SC.campo || []).filter(c => c.tipo !== "alleato" && c.ferite !== "sconfitto");
const opzione = d => d.opzioni[P.opI];
const nomeDi = id => { const c = (SC.campo || []).find(x => x.id === id); return c ? c.nome : ""; };
const nomeBersaglio = () => nomeDi(P.bersaglio);
/* Un 20 naturale è critico per ogni attacco; il Critico migliorato del Campione (19) vale solo per gli attacchi con un'arma */
const conArma = o => o.tipo === "arma" || !!o.armaImprovvisata;
const tiroCorrente = d => tiroPerColpire({ dadi: P.d20, modo: P.modo, bonus: opzione(d).hit + P.bonus, critMin: conArma(opzione(d)) ? d.critMin : 20 });
/* i pulsanti in fondo dopo un attacco: un altro attacco solo se resta; finiti, l'Azione impetuosa (se c'è) o la fine del turno */
function fondoDopo() {
  if (P.reazione) return `<div class="fondo"><button class="btn up" data-att="chiudi">Chiudi</button></div>`;
  const d = dati(P.pg.id), ch = chiaveTurno(SC), st = statoTurno(d.az, ch, d.perAzione), mio = mioTurno(P.pg.id);
  const balzo = P.doppio && bersagliGiocatore().some(c => !(P.colpiti || []).includes(c.id));
  let primo = "";
  if (balzo) primo = `<button class="btn up" data-att="balza">Il dardo balza</button>`;
  else if (mio && st.puoAttaccare) primo = `<button class="btn up" data-att="ancora">${st.inAttacco ? `Attacco ${st.prossimoAttacco} di ${st.perAzione}` : "Nuovo attacco"}</button>`;
  else if (mio && impetuosaPronta(d.az, ch, d.perAzione, d.impetuose)) primo = `<button class="btn up" data-att="impetuosa">Azione impetuosa</button>`;
  return `${P.doppio && !balzo ? `<p class="aiuto centrato">Due d8 sono uguali, ma non c'è un'altra creatura su cui balzare.</p>` : ""}
    <div class="fondo"><button class="btn" data-att="chiudi">Chiudi</button><button class="btn${primo ? "" : " up"}" data-att="fine-turno">Fine turno</button>${primo}</div>`;
}
const PASSI_G = ["bersaglio", "arma", "tiro", "esito", "danni", "fine"];
const passoDi = f => ({ marchio: 2, area: 2, "attesa-ts": 4, "esito-ts": 4, attesa: 4, confermare: 6 }[f] || PASSI_G.indexOf(f) + 1);

function disegnaGiocatore(nuovo = true) {
  if (!P) return;
  const d = dati(P.pg.id), a = P.id && A.find(x => x.id === P.id), op = P.opI != null ? opzione(d) : null;
  const opz = { passo: passoDi(P.fase), di: PASSI_G.length, nuovoPasso: nuovo, indietro: ["arma", "tiro", "area"].includes(P.fase) };
  let h = "";
  if (P.fase === "bersaglio") {
    const b = bersagliGiocatore().filter(c => !P.balzo || !(P.colpiti || []).includes(c.id));
    h = `<p class="domanda">${P.balzo ? "Il dardo balza: su chi?" : "Chi attacchi?"}</p>${P.balzo ? `<p class="aiuto">Una creatura entro 9 m da ${esc(P.daBalzo)}. Ognuna può essere colpita una volta sola per lancio; non spendi un altro uso.</p>` : ""}
      ${b.length ? `<div class="carte">${b.map(c => `<button class="carta nemico" data-bers="${c.id}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}${c.subiti ? ` · −${c.subiti}` : ""}</small></span></button>`).join("")}</div>`
        : `<p class="aiuto">Non c'è nessun nemico in piedi.</p>`}`;
  } else if (P.fase === "arma") {
    const st = mioTurno(P.pg.id) && !P.reazione ? statoTurno(d.az, chiaveTurno(SC), d.perAzione) : null;
    /* perché un'opzione non si può usare adesso (regole del turno); "" se si può */
    const blocco = o => !st ? "" : o.tipo === "arma" ? (st.puoAttaccare ? "" : "attacchi finiti in questo turno")
      : o.etichetta === "incantesimo" && !puoIncantesimo(d.az, chiaveTurno(SC), { come: "azione", livello: o.slot || 0 }) ? "hai già lanciato un incantesimo con l'azione bonus: ora solo trucchetti"
      : st.puoAzione ? "" : st.inAttacco ? "costa un'azione intera: hai già cominciato ad attaccare" : "costa un'azione: l'hai già usata";
    const voce = (o, i) => {
      const dadi = o.parti.map(p => `${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}`).join(" + ") + ` ${esc(o.parti[0].t || o.t || "")}`;
      const num = o.tipo === "ts" ? `TS ${CAR[o.ts].slice(0, 3)} ${o.cd}` : sg(o.hit);
      const s = o.slot ? d.slot.find(x => x.liv === o.slot) : null;
      const risorsa = o.usiRimasti != null ? { liberi: o.usiRimasti, max: o.max, testo: o.usiRimasti ? `${o.usiRimasti} ${o.usiRimasti === 1 ? "uso" : "usi"} su ${o.max}` : "usi finiti" }
        : s ? { liberi: s.liberi, max: s.max, testo: s.liberi ? `slot di ${o.slot}° livello: ${s.liberi} su ${s.max}` : `slot di ${o.slot}° livello finiti` } : null;
      const mun = o.munizione, motivo = blocco(o) || (mun && mun.n <= 0 ? `${mun.nome.toLowerCase()}: finite` : "");
      return `<button class="carta" data-op="${i}"${o.disponibile === false || motivo ? ` disabled data-perche="${esc(motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) : "Adesso non si può usare")}"` : ""}><span class="c-nome"><b>${esc(o.n)}${o.etichetta ? `<span class="tag-inc">${esc(o.etichetta)}</span>` : ""}</b>
        ${risorsa ? `<span class="c-risorsa">${pips(risorsa)}${risorsa.testo}</span>` : ""}${mun && mun.n > 0 ? `<span class="c-risorsa">${esc(mun.nome)}: ${mun.n}</span>` : ""}
        <small>${dadi}${o.nota ? ` · ${esc(o.nota)}` : ""}</small>${motivo ? `<small class="c-motivo">${motivo}</small>` : ""}</span><span class="c-num">${num}</span></button>`;
    };
    const gruppi = P.reazione
      ? [["Armi da mischia", d.opzioni.map((o, i) => [o, i]).filter(([o]) => o.tipo === "arma" && !o.distanza)]]
      : [["Armi", d.opzioni.map((o, i) => [o, i]).filter(([o]) => o.tipo === "arma")], ["Incantesimi e oggetti", d.opzioni.map((o, i) => [o, i]).filter(([o]) => o.tipo !== "arma")]];
    h = `<p class="domanda">Con cosa attacchi?</p><p class="aiuto">${esc(nomeBersaglio())}${P.reazione ? " · un solo attacco, con la reazione" : ""}</p>
      ${gruppi.filter(([, v]) => v.length).map(([t, v]) => `<p class="lbl-sez">${t}</p><div class="carte">${v.map(([o, i]) => voce(o, i)).join("")}</div>`).join("")}`;
  } else if (P.fase === "marchio") {
    const sposta = P.marchio === "sposta", liv = (d.slot.find(x => x.liberi > 0) || {}).liv;
    h = `<p class="domanda">${sposta ? "Sposti il Marchio?" : "Lanci prima il Marchio del cacciatore?"}</p>
      <p class="aiuto">${sposta ? `Il tuo Marchio era su <b>${esc(d.effetto.nome || "un bersaglio")}</b>, che è caduto. Puoi spostarlo su <b>${esc(nomeBersaglio())}</b> con la sola azione bonus, senza slot.`
        : `Su <b>${esc(nomeBersaglio())}</b>: +1d6 danni a ogni colpo con un'arma, finché ti concentri. Costa l'azione bonus e uno slot di ${liv}° livello.`}</p>
      <div class="carte">
        <button class="carta scelta-si" data-marchio="si"><span class="c-nome"><b>${sposta ? "Sì, spostalo" : "Sì, lancialo"}</b><small>${sposta ? "azione bonus" : `azione bonus · slot di ${liv}°`}</small></span></button>
        <button class="carta" data-marchio="no"><span class="c-nome"><b>No, attacco e basta</b><small>${esc(op.n)}</small></span></button></div>`;
  } else if (P.fase === "area") {
    const b = bersagliGiocatore().filter(c => c.id !== P.bersaglio);
    h = `<p class="domanda">Chi altro è nell'area?</p><p class="aiuto">${esc(op.n)} colpisce ${esc(nomeBersaglio())}. Tocca le altre creature coinvolte, poi Lancia.</p>
      <div class="carte">${b.map(c => `<button class="carta nemico" data-altro="${c.id}" aria-pressed="${P.altri.includes(c.id)}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}</small></span></button>`).join("")}</div>
      <div class="fondo"><button class="btn up" data-att="lancia-ts">Lancia ${esc(op.n)}${P.altri.length ? ` su ${P.altri.length + 1}` : ""}</button></div>`;
  } else if (P.fase === "tiro") {
    const n = P.modo === "normale" ? 1 : 2, t = tiroCorrente(d);
    h = `<p class="domanda">Tira il d20</p><p class="aiuto">${esc(op.n)} contro ${esc(nomeBersaglio())}. Tocca il numero uscito.</p>
      <div class="seg">${[["normale", "Normale"], ["vantaggio", "Vantaggio"], ["svantaggio", "Svantaggio"]].map(([m, l]) => `<button data-modo="${m}" aria-pressed="${P.modo === m}">${l}</button>`).join("")}</div>
      ${d.insp > 0 ? `<button class="extra" data-insp="1" aria-pressed="${!!P.insp}"><span class="ex-spia"></span><span class="ex-testo">Usa l'ispirazione<small>vantaggio a questo tiro · ne hai ${d.insp}</small></span></button>` : ""}
      ${caselleDadi(P.d20, n, 20, "d20")}
      ${tastierino(20, null, "data-d20")}
      <div class="bonus-riga"><span>Bonus in più <small>(es. il d4 di Benedizione)</small></span><span class="stepper"><button class="btn step" data-bonus="-1" aria-label="Bonus meno uno">−</button><b class="num">${sg(P.bonus)}</b><button class="btn step" data-bonus="1" aria-label="Bonus più uno">+</button></span></div>
      <div class="totale">${t ? `<span class="tot-come">Dado <i>${t.usato}</i> · bonus <i>${sg(t.bonus)}</i></span><b>${t.tot}</b>` : `<span>Il tuo bonus: ${sg(op.hit + P.bonus)}</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-tiro"${t ? "" : ` disabled data-perche="Scrivi prima il numero uscito sul d20"`}>Attacca</button></div>`;
  } else if (P.fase === "attesa") {
    h = rivelazione("attesa", "Al master…", `${a ? a.tiro.tot : ""} per colpire contro ${esc(nomeBersaglio())}`) + `<p class="aiuto centrato">Il telefono del master confronta il tiro con la difesa del bersaglio.</p>`;
  } else if (P.fase === "attesa-ts") {
    h = rivelazione("attesa", "Tiri salvezza…", `${esc(op.n)}: tiro su ${CAR[op.ts]} CD ${op.cd}`) + `<p class="aiuto centrato">Il master tira per ${P.altri.length ? "le creature colpite" : esc(nomeBersaglio())} e ti dice chi resiste.</p>`;
  } else if (P.fase === "esito-ts") {
    const righe = a.bersagli.map(b => `<li class="${a.esiti[b.id] ? "riesce" : "fallisce"}"><span>${esc(b.nome)}</span><b>${a.esiti[b.id] ? (a.meta ? "resiste: metà danni" : "resiste: nessun danno") : "fallisce"}</b></li>`).join("");
    const nessuno = a.bersagli.every(b => a.esiti[b.id]) && !a.meta;
    h = rivelazione(nessuno ? "mancato" : "colpito", nessuno ? "Resistono" : "Colpiti!", `${esc(a.arma)} · tiro su ${CAR[a.ts]} CD ${a.cd}`) + `<ul class="esiti-ts">${righe}</ul>` +
      (nessuno ? fondoDopo() : `<div class="fondo"><button class="btn up" data-att="vai-danni">Tira i danni</button></div>`);
  } else if (P.fase === "esito") {
    const crit = a.tiro.critico, preso = a.stato === "colpito";
    h = rivelazione(preso ? (crit ? "critico" : "colpito") : "mancato", preso ? (crit ? "Critico!" : "Colpito!") : "Mancato", `${a.tiro.tot} per colpire contro ${esc(a.bersaglioNome)}`) +
      (preso ? `<div class="fondo"><button class="btn up" data-att="vai-danni">Tira i danni${crit ? " (doppi)" : ""}</button></div>` : fondoDopo());
  } else if (P.fase === "danni") {
    const parti = partiGiocatore(d, a, op), som = sommaDanni(parti, P.extra), dadoOra = parti.find(p => p.valori.some(vuoto));
    const crit = a.tiro && a.tiro.critico;
    /* Punizione divina e le punizioni-incantesimo: solo con un attacco con un'arma da mischia (Manuale del giocatore) */
    const slot = op.tipo === "arma" && !op.distanza && d.punizione ? d.slot.filter(s => s.max > 0 && s.liv <= 4) : [];
    const slotDi = liv => d.slot.find(s => s.liv === liv);
    const extra = op.tipo === "arma" ? d.extra.filter(e => !e.mischia || !op.distanza) : [];
    const doppio = !!op.balzo && balzaDardo(P.dadi.p0);
    h = `<p class="domanda">Tira i danni</p><p class="aiuto">${crit ? "Critico: i dadi sono doppi. " : ""}${extra.length || slot.length ? "Accendi gli extra che valgono, poi " : ""}tocca il numero di ogni dado.</p>
      ${extra.length ? `<div class="extra-lista">${extra.map(e => `<button class="extra" data-acceso="${e.id}" aria-pressed="${P.accesi.includes(e.id)}"${e.disponibile ? "" : " disabled"}><span class="ex-spia"></span><span class="ex-testo">${esc(e.nome)}<small>${(P.auto || []).includes(e.id) ? "attivo: acceso da solo · " : ""}${esc(e.nota || "")}${e.slot ? ` · slot di ${e.slot}° ${slotDi(e.slot) ? pips(slotDi(e.slot)) : ""}` : ""}${e.slot ? " · azione bonus" : ""}</small></span><span class="ex-dadi">+${e.parti.map(p => `${p.n * (crit ? 2 : 1)}d${p.f}`).join("+")}</span></button>`).join("")}</div>` : ""}
      ${slot.length ? `<div class="riga-danni"><b>Punizione divina <small>spendi uno slot: più è alto, più dadi</small></b><div class="slot-scelta">
        <button data-pun="0" aria-pressed="${!P.pun}"><b>No</b></button>${slot.map(s => `<button data-pun="${s.liv}" aria-pressed="${P.pun === s.liv}"${s.liberi ? "" : ` disabled data-perche="Nessuno slot libero di questo livello"`}><b>${s.liv}° livello</b>${pips(s)}<small>${s.liberi ? `${s.liv + 1}d8` : "finiti"}</small></button>`).join("")}</div>
        ${P.pun ? `<button class="extra" data-nm aria-pressed="${P.nonMorto}"><span class="ex-spia"></span><span class="ex-testo">Contro un non morto o un immondo<small>+1d8 radianti</small></span></button>` : ""}</div>` : ""}
      ${parti.map(p => `<div class="riga-danni${p === dadoOra ? " ora" : ""}"><b>${esc(p.nome)} <small>${p.n}d${p.facce}${p.mod ? sg(p.mod) : ""} ${esc(p.tipo)}</small></b>${caselleDadi(p.valori, p.n, p.facce, p.chiave)}
        ${p === dadoOra ? tastierino(p.facce, null, "data-faccia") : ""}</div>`).join("")}
      <div class="bonus-riga"><span>Altri danni <small>(se serve aggiungere qualcosa a mano)</small></span><span class="stepper"><button class="btn step" data-extra="-1" aria-label="Meno uno">−</button><b class="num">+${P.extra}</b><button class="btn step" data-extra="1" aria-label="Più uno">+</button></span></div>
      ${doppio ? `<p class="avviso-balzo">${crit ? "Due d8 sono uguali" : "I due d8 sono uguali"}: dopo i danni il dardo balza su un'altra creatura entro 9 m.</p>` : ""}
      <div class="totale">${som ? `Totale<b>${som.tot}</b>` : `<span>Mancano dei dadi</span>`}</div>
      <div class="fondo"><button class="btn up" data-att="invia-danni"${som ? "" : ` disabled data-perche="Scrivi prima i dadi dei danni"`}>Invia ${som ? som.tot + " danni" : "i danni"}</button></div>`;
  } else if (P.fase === "confermare") {
    h = rivelazione("attesa", "Al master…", `${P.inviati} danni: li sta confermando`);
  } else if (P.fase === "fine") {
    if (a.tipo === "ts") {
      const det = a.dettaglio || {};
      h = rivelazione("danno", `−${a.applicati}`, `${esc(a.arma)}`) + `<ul class="esiti-ts">${a.bersagli.map(b => { const ora = (SC.campo || []).find(c => c.id === b.id);
        return `<li><span>${esc(b.nome)}</span><b>−${det[b.id] ?? 0}${ora ? ` · ${esc(ora.ferite)}` : ""}</b></li>`; }).join("")}</ul>`;
    } else {
      const ora = (SC.campo || []).find(c => c.id === a.bersaglio), giu = ora && ora.ferite === "sconfitto";
      /* il colpo che lo butta giù merita il suo momento: "Hai sconfitto Lupo 1!" */
      h = (giu ? rivelazione("sconfitto", `Hai sconfitto ${esc(a.bersaglioNome)}!`, `con ${esc(a.arma)} · −${a.applicati}`)
        : rivelazione("danno", a.applicati ? `−${a.applicati}` : "Nessun danno", `<b>${esc(a.bersaglioNome)}</b>${ora ? ` ora è ${esc(ora.ferite)}` : ""}`)) +
        (a.applicati !== a.danni.tot ? `<p class="aiuto centrato">Il master ne ha contati ${a.applicati} su ${a.danni.tot} (resistenze o immunità).</p>` : "");
    }
    h += fondoDopo();
  }
  P.f.mostra(h, opz);
}
/* i dadi da tirare: quelli dell'arma o dell'incantesimo (doppi col critico) più gli extra accesi */
function partiGiocatore(d, a, op) {
  const crit = !!(a && a.tiro && a.tiro.critico), tipoArma = op.t || (op.parti[0] && op.parti[0].t) || "";
  const casella = (chiave, nome, p) => ({ chiave, nome, n: p.n, facce: p.f, mod: p.mod || 0, tipo: p.t, valori: Array.from({ length: p.n }, (_, i) => (P.dadi[chiave] || [])[i] ?? "") });
  const out = partiDanno(op.parti, { critico: op.tipo !== "ts" && crit, tipoArma }).map((p, k) => casella("p" + k, k ? `${op.n} (${p.t})` : op.n, p));
  if (op.tipo === "arma") {
    d.extra.filter(e => P.accesi.includes(e.id) && (!e.mischia || !op.distanza)).forEach(e => partiDanno(e.parti, { critico: crit, tipoArma }).forEach((p, k) => out.push(casella(`x-${e.id}-${k}`, e.nome, p))));
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
  if (P.fase === "arma") P.fase = "bersaglio"; else if (P.fase === "tiro" || P.fase === "area") { P.fase = P.balzo ? "bersaglio" : "arma"; P.d20 = []; P.altri = []; }
  disegnaGiocatore();
}
/* quando parte il colpo: si spendono slot, usi dell'oggetto, l'oggetto lanciato */
const MARCHIO = "Marchio del cacciatore";
/* un incantesimo con l'azione: se è di livello (non un trucchetto) poi niente incantesimi con l'azione bonus */
const azioneCon = op => (az, k) => dopoAzione(az, k, { livello: op.etichetta === "incantesimo" ? (op.slot || 0) : 0 });
function propostaMarchio(d) {
  const st = statoTurno(d.az, chiaveTurno(SC), d.perAzione);
  return proponiMarchio({ sa: d.bonus.some(v => v.n === MARCHIO), effetto: d.effetto, bersaglio: P.bersaglio,
    bonusLibero: !st.bonus && puoIncantesimo(d.az, chiaveTurno(SC), { come: "bonus", livello: 1 }),
    slotLiberi: d.slot.reduce((n, x) => n + x.liberi, 0), vivi: bersagliGiocatore().map(c => c.id) });
}
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
  if (ds.bers) { P.bersaglio = ds.bers; P.fase = P.balzo ? "tiro" : "arma"; return disegnaGiocatore(); }
  if (ds.op != null) {
    P.opI = +ds.op; P.d20 = []; P.altri = [];
    const o = opzione(d);
    if (o.tipo === "ts") { if (o.area) { P.fase = "area"; return disegnaGiocatore(); } return inviaTs(d, o); }
    /* prima di un attacco con un'arma: "Lanci prima il Marchio del cacciatore?" (o lo sposti, se il marchiato è caduto) */
    P.marchio = o.tipo === "arma" && !P.reazione && mioTurno(P.pg.id) ? propostaMarchio(d) : null;
    P.fase = P.marchio ? "marchio" : "tiro"; return disegnaGiocatore();
  }
  if (ds.marchio) {
    if (ds.marchio === "si") {
      const nome = nomeBersaglio(), sposta = P.marchio === "sposta", liv = sposta ? 0 : (d.slot.find(x => x.liberi > 0) || {}).liv;
      if (liv) spendi(P.pg.id, liv);
      modifica(P.pg.id, St => { St.conc = MARCHIO; St.effetto = attiva(MARCHIO, { bersaglio: P.bersaglio, nome }); });
      segnaTurno(P.pg.id, (az, k) => dopoBonus(az, k, { incantesimo: !sposta }));
      toast(sposta ? `Marchio spostato su ${nome}` : `Marchio del cacciatore su ${nome} · slot di ${liv}° · concentrazione`, 5000); vibra([40, 30, 40]);
    }
    P.marchio = null; P.fase = "tiro"; return disegnaGiocatore();
  }
  if (ds.insp) { P.insp = !P.insp; P.modo = P.insp ? "vantaggio" : "normale"; P.d20 = P.d20.slice(0, P.insp ? 2 : 1); return disegnaGiocatore(false); }
  if (ds.altro) { P.altri = P.altri.includes(ds.altro) ? P.altri.filter(x => x !== ds.altro) : [...P.altri, ds.altro]; return disegnaGiocatore(false); }
  if (ds.modo) { if (ds.modo !== "vantaggio") P.insp = false; P.modo = ds.modo; P.d20 = P.d20.slice(0, P.modo === "normale" ? 1 : 2); return disegnaGiocatore(false); }
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
          bersaglio: c.id, bersaglioNome: c.nome, arma: op.n, tipo: op.tipo, tiro: t, stato: "colpire", ...(P.reazione ? { reazione: true } : {}), ...(P.balzo ? { balzo: true } : {}) });
        if (P.balzo) return;   // il balzo fa parte dello stesso incantesimo: niente uso in più, niente azione in più
        spendiPerLancio(op);
        if (P.insp) { modifica(P.pg.id, St => { St.insp = Math.max(0, (St.insp || 0) - 1); }); P.insp = false; }
        if (op.wid) { const m = munizione(P.pg.id, op.wid); if (m) toast(m.finite ? `${m.nome}: finite` : `${m.nome}: ne restano ${m.restano}`); }
        if (P.reazione) segnaReazione(P.pg.id);
        else if (mioTurno(P.pg.id)) segnaTurno(P.pg.id, op.tipo === "arma" ? (az, k) => dopoAttacco(az, k, d.perAzione) : azioneCon(op));
      } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "tiro"; P.id = null; disegnaGiocatore(); }
      return;
    }
    case "vai-danni":   /* gli effetti attivi (Marchio sul bersaglio, Favore divino) accendono da soli i loro dadi */
      P.auto = extraAccesi(d.effetto, { bersaglio: P.bersaglio, arma: op.tipo === "arma" });
      P.accesi = [...new Set([...P.accesi, ...P.auto])]; P.fase = "danni"; return disegnaGiocatore();
    case "invia-danni": {
      const som = sommaDanni(partiGiocatore(d, a, op), P.extra); if (!som) return;
      const perTipo = { ...som.perTipo }; if (perTipo.altro) { perTipo["extra"] = perTipo.altro; delete perTipo.altro; }
      /* Dardo caotico: se due d8 sono uguali (con il critico, una coppia tra i quattro), l'energia balza su un'altra creatura */
      P.doppio = !!op.balzo && balzaDardo(P.dadi.p0);
      P.colpiti = [...(P.colpiti || []), P.bersaglio];
      P.inviati = som.tot; P.fase = "confermare"; disegnaGiocatore();
      try {
        await arch.aggiorna(`${ATT}/${P.id}`, { stato: "danni", danni: { tot: som.tot, perTipo } });
        if (P.pun) spendi(P.pg.id, P.pun);
        const punizioni = d.extra.filter(x => P.accesi.includes(x.id) && x.slot);
        punizioni.forEach(x => spendi(P.pg.id, x.slot));
        if (punizioni.length && mioTurno(P.pg.id)) segnaTurno(P.pg.id, dopoBonus);   // le punizioni-incantesimo costano l'azione bonus
      } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "danni"; disegnaGiocatore(); }
      return;
    }
    case "ancora": { const pg = P.pg; P.f.chiudi(true); apriAttacco(pg); return; }
    case "impetuosa": usaImpetuosa(P.pg.id); return disegnaGiocatore(false);
    case "balza": {
      Object.assign(P, { fase: "bersaglio", balzo: true, daBalzo: nomeBersaglio(), bersaglio: null, d20: [], modo: "normale", bonus: 0, dadi: {}, accesi: [], extra: 0, pun: 0, id: null, statoVisto: "", doppio: false });
      return disegnaGiocatore();
    }
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
    if (mioTurno(P.pg.id)) segnaTurno(P.pg.id, azioneCon(op));
  } catch (_) { toast("Non inviato: controlla la connessione", 5000); P.fase = "arma"; P.id = null; disegnaGiocatore(); }
}

/* gli slot di un livello come losanghe: piene quelle libere, vuote quelle usate */
const pips = s => `<span class="pips-slot" role="img" aria-label="${s.liberi} su ${s.max} liberi">${Array.from({ length: s.max }, (_, i) => `<i${i < s.liberi ? ' class="pieno"' : ""}></i>`).join("")}</span>`;
const pgDi = id => ({ id, nome: (dati(id) || {}).nome || id });

/* ---------- azione bonus e reazione ----------
   Si aprono dai gettoni (Bonus, Reazione) o dal pulsante "Reazione" quando non è il tuo turno.
   Ogni voce spende quello che serve (slot, usi) e segna il gettone. Le voci vengono dalla scheda:
   privilegi, stili e talenti che parlano di reazione, incantesimi da azione bonus o da reazione. */
function apriScelta(tipo, pg, lista = []) {
  AB = { tipo, pg, lista, fase: pg ? "scegli" : "chi", voce: null, dado: [] };
  AB.f = finestra({ chiave: tipo, titolo: tipo === "bonus" ? "Azione bonus" : "Reazione", onClick: clicScelta, onChiudi: () => { AB = null; ridisegna(); },
    onIndietro: () => { if (AB.fase === "slot" || AB.fase === "dado") AB.fase = "scegli"; else if (AB.fase === "scegli" && AB.lista.length > 1) { AB.fase = "chi"; AB.pg = null; } disegnaScelta(); } });
  disegnaScelta();
}
/** Il pulsante "Reazione" fuori dal proprio turno: miei = i personaggi di questo telefono che sono nello scontro. */
export function apriReazione(miei) {
  const lista = miei.filter(p => dati(p.id));
  if (lista.length) apriScelta("reazione", lista.length === 1 ? lista[0] : null, lista);
}
const voceScelta = (r, i) => `<button class="carta" data-sc="${i}"${r.disponibile === false ? " disabled" : ""}><span class="c-nome"><b>${esc(r.n)}${r.liv ? `<span class="tag-inc">${r.liv}° livello</span>` : r.tipo === "incantesimo" ? `<span class="tag-inc">trucchetto</span>` : ""}</b><small>${esc(r.testo || "")}${r.usiRimasti != null ? ` · ${r.usiRimasti === 1 ? "1 uso" : `${r.usiRimasti} usi`}` : ""}</small></span></button>`;
function disegnaScelta(nuovo = true) {
  const opz = { nuovoPasso: nuovo, indietro: AB.fase === "slot" || AB.fase === "dado" || (AB.fase === "scegli" && AB.lista.length > 1) };
  let h = "";
  if (AB.fase === "chi") {
    h = `<p class="domanda">Chi reagisce?</p><div class="carte">${AB.lista.map(p => { const d = dati(p.id), libera = reazioneLibera(d.reazione, SC, p.id);
      return `<button class="carta gruppo" data-chi-r="${p.id}"><span class="c-nome"><b>${esc(p.nome)}</b><small>${libera ? "reazione libera" : "reazione già usata"}</small></span></button>`; }).join("")}</div>`;
  } else if (AB.fase === "scegli") {
    const d = dati(AB.pg.id);
    if (AB.tipo === "reazione") {
      const libera = reazioneLibera(d.reazione, SC, AB.pg.id), mischia = d.opzioni.some(o => o.tipo === "arma" && !o.distanza);
      h = `<p class="domanda">${esc(d.nome)} reagisce</p>
        <p class="aiuto">${libera ? "Una reazione per round: torna all'inizio del tuo turno." : "La reazione è già stata usata e torna all'inizio del tuo turno. Se il master è d'accordo puoi usarla lo stesso."}</p>
        <div class="carte">
          ${mischia ? `<button class="carta" data-sc="opportunita"><span class="c-nome"><b>Attacco di opportunità</b><small>un nemico esce dalla tua portata: un attacco in mischia</small></span></button>` : ""}
          ${d.reazioni.map(voceScelta).join("")}
          <button class="carta" data-sc="altro"><span class="c-nome"><b>Un'altra reazione</b><small>la racconti al master; qui si segna solo come usata</small></span></button>
        </div>`;
    } else {
      h = `<p class="domanda">Azione bonus di ${esc(d.nome)}</p><p class="aiuto">Una per turno.</p>
        <div class="carte">${d.bonus.map((v, i) => voceScelta(v.tipo === "incantesimo" && !puoIncantesimo(d.az, chiaveTurno(SC), { come: "bonus", livello: v.liv })
          ? { ...v, disponibile: false, testo: "Hai già lanciato un incantesimo di livello con l'azione: in questo turno niente incantesimi bonus." } : v, i)).join("")}
          <button class="carta" data-sc="altro"><span class="c-nome"><b>Un'altra azione bonus</b><small>la racconti al master; qui si segna solo come usata</small></span></button></div>`;
    }
  } else if (AB.fase === "slot") {
    const v = AB.voce;
    h = `<p class="domanda">${esc(v.n)}</p><p class="aiuto">${esc(v.testo || "")}</p><p class="lbl-sez">Con quale slot?</p>
      <div class="slot-scelta">${v.slot.map(s => `<button data-slot-l="${s.liv}"${s.liberi ? "" : ` disabled data-perche="Nessuno slot libero di questo livello"`}><b>${s.liv}° livello</b>${pips(s)}<small>${s.liberi ? (s.liberi === 1 ? "1 libero" : `${s.liberi} liberi`) : "finiti"}</small></button>`).join("")}</div>`;
  } else if (AB.fase === "bersaglio") {
    h = `<p class="domanda">${esc(AB.voce.n)}: su chi?</p><div class="carte">${bersagliGiocatore().map(c => `<button class="carta nemico" data-ef-bers="${c.id}"><span class="c-nome"><b>${esc(c.nome)}</b><small>${esc(c.ferite)}</small></span></button>`).join("")}</div>`;
  } else if (AB.fase === "arma") {
    const armi = dati(AB.pg.id).opzioni.filter(o => o.tipo === "arma" && o.wid && !o.magic);
    h = `<p class="domanda">${esc(AB.voce.n)}: quale arma?</p><p class="aiuto">Un'arma non magica: +1 a colpire e ai danni finché ti concentri.</p>
      <div class="carte">${armi.map(o => `<button class="carta" data-ef-arma="${esc(o.wid)}"><span class="c-nome"><b>${esc(o.n)}</b></span></button>`).join("")}</div>`;
  } else if (AB.fase === "dado") {
    const v = AB.voce, x = AB.dado[0];
    h = `<p class="domanda">Tira 1d${v.dado}</p><p class="aiuto">${esc(v.n)}: recuperi il dado + ${v.piu} PF</p>
      ${caselleDadi(AB.dado, 1, v.dado, "ab")}${tastierino(v.dado, null, "data-ab-f")}
      <div class="totale">${x ? `Recuperi<b>${x + v.piu}</b>` : `<span>Tocca il numero uscito</span>`}</div>
      <div class="fondo"><button class="btn up" data-ab-ok${x ? "" : ` disabled data-perche="Scrivi prima il numero uscito sul dado"`}>${x ? `Recupera ${x + v.piu} PF` : "Recupera"}</button></div>`;
  }
  AB.f.mostra(h, opz);
}
/* la scelta fatta: si segna il gettone, si avvisa e si chiude */
function segnaScelta(pg, nota, incantesimo = false) {
  if (AB.tipo === "bonus") segnaTurno(pg.id, (az, k) => dopoBonus(az, k, { incantesimo })); else segnaReazione(pg.id);
  toast(nota, 5000); vibra([40, 30, 40]);
  AB.f.chiudi();
}
function clicScelta(e) {
  const b = e.target.closest("button"); if (!b || b.disabled || !AB) return;
  const ds = b.dataset;
  if (ds.chiR) { AB.pg = AB.lista.find(p => p.id === ds.chiR); AB.fase = "scegli"; return disegnaScelta(); }
  const d = AB.pg && dati(AB.pg.id); if (!d) return;
  if (ds.sc === "opportunita") { const pg = AB.pg; AB.f.chiudi(true); AB = null; apriAttacco(pg, true); return; }
  if (ds.sc === "altro") return segnaScelta(AB.pg, AB.tipo === "bonus" ? "Azione bonus usata" : "Reazione usata: dillo al master");
  if (ds.sc != null) {
    const v = (AB.tipo === "bonus" ? d.bonus : d.reazioni)[+ds.sc]; if (!v) return;
    AB.voce = v;
    if (v.tipo === "cura") { AB.fase = "dado"; AB.dado = []; return disegnaScelta(); }
    if (v.tipo === "incantesimo" && v.liv) { AB.fase = "slot"; return disegnaScelta(); }
    return lancia(v, 0);
  }
  if (ds.slotL) {   /* Marchio del cacciatore vuole un bersaglio, Arma magica un'arma: un passo in più */
    const vuole = (EFFETTI[AB.voce.n] || {}).vuole;
    if (vuole && SC) { AB.liv = +ds.slotL; AB.fase = vuole; return disegnaScelta(); }
    return lancia(AB.voce, +ds.slotL);
  }
  if (ds.efBers) return lancia(AB.voce, AB.liv, { bersaglio: ds.efBers, nome: nomeDi(ds.efBers) });
  if (ds.efArma) return lancia(AB.voce, AB.liv, { arma: ds.efArma, nome: (d.opzioni.find(o => o.wid === ds.efArma) || {}).n });
  if (ds.abF) { AB.dado = [+ds.abF]; return disegnaScelta(false); }
  if (ds.casella === "ab") { AB.dado = []; return disegnaScelta(false); }
  if (b.hasAttribute("data-ab-ok")) {
    const v = AB.voce, n = AB.dado[0] + v.piu, pg = AB.pg;
    curaPg(pg.id, n, d.nome); usaRisorsa(pg.id, v.uso);
    return segnaScelta(pg, `${v.n}: +${n} PF`);
  }
}
/* una voce usata dal menu: lo slot si spende, la concentrazione si segna sulla scheda */
function lancia(v, liv, dove = {}) {
  const pg = AB.pg;
  if (liv) spendi(pg.id, liv);
  let nota = `${v.n}${liv ? ` (slot di ${liv}°)` : ""}`;
  if (v.conc) {
    const prima = dati(pg.id).conc;
    modifica(pg.id, St => { St.conc = v.n; St.effetto = attiva(v.n, dove); });
    if (dove.nome) nota += ` su ${dove.nome}`;
    nota += prima && prima !== v.n ? ` · concentrazione: finisce ${prima}` : " · concentrazione";
  }
  segnaScelta(pg, AB.tipo === "reazione" ? `Reazione: ${nota}. Dillo al master` : nota, v.tipo === "incantesimo");
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
    const voci = (d.usabili || []).map(t => ({ t, q: quantita(t), cura: curaDi(t) })).sort((x, y) => (y.cura ? 1 : 0) - (x.cura ? 1 : 0));
    const st = mioTurno(O.pg.id) ? statoTurno(d.az, chiaveTurno(SC), d.perAzione) : null, bonusPoz = opzioni().pozioniBonus && st && !st.bonus;
    const ferma = v => st && !st.puoAzione && !(v.cura && bonusPoz);
    h = `<p class="domanda">Cosa usi?</p><p class="aiuto">${st && !st.puoAzione ? "Hai già usato l'azione: resta solo una pozione da bere tu, con l'azione bonus." : "Le pozioni curano; gli altri oggetti si tolgono uno dall'equipaggiamento."}</p>
      <div class="carte">${voci.map(v => `<button class="carta${v.cura ? " gruppo" : ""}" data-ogg="${esc(v.t)}"${ferma(v) ? " disabled" : ""}><span class="c-nome"><b>${esc(v.q.nome.charAt(0).toUpperCase() + v.q.nome.slice(1))}</b>${v.cura ? `<small>cura ${v.cura.parti.map(p => `${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}`).join("")} PF</small>` : ""}</span>${v.q.n > 1 ? `<span class="c-num">×${v.q.n}</span>` : ""}</button>`).join("")}</div>`;
  } else if (O.fase === "conferma") {
    h = `<p class="domanda">Usare ${esc(quantita(O.item).nome)}?</p><p class="aiuto">Ne togli uno dall'equipaggiamento. L'effetto lo racconti al tavolo.</p>
      <div class="fondo"><button class="btn up" data-ogg-ok>Usa</button></div>`;
  } else if (O.fase === "chi") {
    const compagni = (SC.ordine || []).filter(v => (SC.partecipanti || []).some(p => p.id === v.id && p.tipo === "scheda"));
    h = `<p class="domanda">Chi beve ${esc(O.cura.nome.toLowerCase())}?</p><p class="aiuto">${opzioni().pozioniBonus ? "Berla tu costa l'azione bonus; darla a un compagno vicino costa un'azione." : "Berla o darla a un compagno vicino costa un'azione."}</p>
      <div class="carte">${compagni.map(v => { const no = v.id !== O.pg.id && mioTurno(O.pg.id) && !statoTurno(d.az, chiaveTurno(SC), d.perAzione).puoAzione;
        return `<button class="carta gruppo" data-chi="${v.id}"${no ? " disabled" : ""}><span class="c-nome"><b>${esc(v.nome)}</b><small>${v.id === O.pg.id ? "tu" : no ? "darla a un compagno costa un'azione" : "compagno"}</small></span></button>`; }).join("")}</div>`;
  } else if (O.fase === "dadi") {
    const p = O.cura.parti[0], vals = Array.from({ length: p.n }, (_, i) => O.dadi[i] ?? ""), tot = vals.every(v => !vuoto(v)) ? vals.reduce((x, y) => x + y, 0) + p.mod : null;
    h = `<p class="domanda">Tira ${p.n}d${p.f}${p.mod ? sg(p.mod) : ""}</p><p class="aiuto">${esc(O.cura.nome)} per ${esc((SC.ordine || []).find(v => v.id === O.bersaglio)?.nome || "")}</p>
      ${caselleDadi(vals, p.n, p.f, "cura")}${vals.some(vuoto) ? tastierino(p.f, null, "data-cura-f") : ""}
      <div class="totale">${tot != null ? `Cura<b>${tot}</b>` : `<span>Tocca il numero di ogni dado</span>`}</div>
      <div class="fondo"><button class="btn up" data-cura-ok${tot != null ? "" : ` disabled data-perche="Scrivi prima i dadi della cura"`}>${tot != null ? `Cura ${tot} PF` : "Cura"}</button></div>`;
  } else if (O.fase === "fine") {
    h = rivelazione("cura", `+${O.tot}`, `<b>${esc(O.nomeBersaglio)}</b>${O.ora != null ? ` ora ha ${O.ora} PF` : ""}`) + `<div class="fondo"><button class="btn up" data-ogg-chiudi>Fatto</button></div>`;
  }
  O.f.mostra(h, opz);
}
async function clicOggetto(e) {
  const b = e.target.closest("button"); if (!b || b.disabled || !O) return;
  const ds = b.dataset;
  if (ds.ogg) { O.item = ds.ogg; O.cura = curaDi(ds.ogg); O.fase = O.cura ? "chi" : "conferma"; return disegnaOggetto(); }
  if (b.hasAttribute("data-ogg-ok")) { consumaOggetto(O.pg.id, quantita(O.item).nome); toast(`Usato: ${quantita(O.item).nome}`); if (mioTurno(O.pg.id)) segnaTurno(O.pg.id, dopoAzione); O.f.chiudi(); return; }
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
    if (mioTurno(O.pg.id)) segnaTurno(O.pg.id, opzioni().pozioniBonus && O.bersaglio === O.pg.id ? dopoBonus : dopoAzione);
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
        <div class="fondo"><button class="btn up" data-ts-ok${tutti ? "" : ` disabled data-perche="Segna prima il tiro salvezza di tutti"`}>Fatto</button></div>`, { tono: "rosso", nuovoPasso: false });
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
/* reazione: l'id della creatura che fa l'attacco di opportunità (fuori dal suo turno) */
function apriAttaccoMaster(gruppo, i, reazione = null) {
  MA = { gruppo, i, reazione, fase: "bersaglio", bersaglio: null, modo: "normale", d20: [], dadi: {} };
  MA.f = finestra({ chiave: "mattacco", titolo: reazione ? "Attacco di opportunità" : "Attacco del master", onClick: clicFinestraMaster, onChiudi: () => { MA = null; setTimeout(proponiConferma, 50); },
    onIndietro: () => { if (MA.fase === "tiro") { MA.fase = "bersaglio"; MA.d20 = []; } else if (MA.fase === "danni") { MA.fase = "tiro"; } disegnaMaster(); } });
  disegnaMaster();
}
const PASSI_M = ["bersaglio", "tiro", "esito", "danni", "fine"];
function disegnaMaster(nuovo = true) {
  const az = azioneDi(MA.gruppo, MA.i); if (!az) return MA.f.chiudi();
  if (MA.reazione) az.chi = (creaturaInCampo(MA.reazione) || {}).nome || az.chi;
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
      <div class="totale">${t ? `<span class="tot-come">Dado <i>${t.usato}</i> · bonus <i>${sg(a.colpire)}</i> · contro CA ${b.ca}</span><b>${t.tot}</b>` : `<span>Bonus: ${sg(a.colpire)}</span>`}</div>
      <div class="fondo"><button class="btn up" data-mat="esito"${t ? "" : ` disabled data-perche="Scrivi prima il numero uscito sul d20"`}>Vedi se colpisce</button></div>`;
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
      <div class="fondo"><button class="btn up" data-mat="applica"${fin ? "" : ` disabled data-perche="Scrivi prima i danni"`}>Applica ${fin ? fin.tot : ""} a ${esc(b.nome)}</button></div>`;
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
  if (MA.reazione) az.chi = (creaturaInCampo(MA.reazione) || {}).nome || az.chi;
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
    case "esito": {
      const bb = bersagliMaster().find(x => x.id === MA.bersaglio); MA.fase = "esito"; vibra(esito(t, bb.ca) === "mancato" ? 90 : [60, 40, 120]);
      if (MA.reazione) segnaReazioneCreatura(MA.reazione, SC).catch(() => {});
      return disegnaMaster();
    }
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
    case "m-nuovo": apriAttaccoMaster(b.dataset.g, +b.dataset.i, b.dataset.r || null); return true;
    /* i gettoni del turno: Azione si gira a mano, Bonus e Reazione aprono il loro menu (o si riaccendono se già usati) */
    case "g-azione": segnaTurno(b.dataset.pg, giraAzione); return true;
    case "g-bonus": {
      const id = b.dataset.pg, d = dati(id); if (!d) return true;
      if (statoTurno(d.az, chiaveTurno(SC), d.perAzione).bonus) { segnaTurno(id, giraBonus); toast("Azione bonus di nuovo libera"); }
      else apriScelta("bonus", pgDi(id), [pgDi(id)]);
      return true;
    }
    case "g-reazione": {
      const id = b.dataset.pg, d = dati(id); if (!d) return true;
      if (reazioneLibera(d.reazione, SC, id)) apriScelta("reazione", pgDi(id), [pgDi(id)]);
      else { modifica(id, St => { St.reazione = null; }); ridisegna(); toast("Reazione di nuovo libera"); }
      return true;
    }
    case "impetuosa": usaImpetuosa(b.dataset.pg); return true;
    case "conferme": { const q = daConfermare(); if (q.length) { rimandati.delete(q[0].id + q[0].stato); apriConferma(q[0]); } return true; }
    default: return false;
  }
}
/** Non ci sono più caselle da scrivere: i numeri si scelgono dalla griglia. */
export function input() { return false; }
