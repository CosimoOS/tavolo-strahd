/* Lo scontro: iniziativa e turni, condivisi in tempo reale fra tutti i telefoni.

   Nell'archivio:
     scontro/attuale            → { stato, id, partecipanti, ordine, turno, round }   (lo scrive il master;
                                  un giocatore può solo far avanzare il turno quando tocca a lui)
     scontro/attuale/tiri/<id>  → il tiro di un personaggio (lo scrive il suo giocatore o il master)

   stato: "chiuso" → nessuno scontro · "tiri" → si tira l'iniziativa · "in corso" → si gioca a turni.
   Ogni scontro ha un id nuovo: i tiri rimasti da uno scontro vecchio non contano più. */
import { PERSONAGGI, PROFILI } from "./personaggi/index.js";
import { CONFIG } from "./config.js";
import { stemma } from "./stemmi.js";
import { finestra, finestraAperta, tastierino, caselleDadi, vibra } from "./passi.js";
import { avviaNemici, fermaNemici, htmlPreparazione, statoPreparazione, htmlBestiarioSezione, pannelloAperto, schieraScelte, infoGruppo, htmlTurniMaster, righeCreature, contaGruppo, nomeGruppo, statoNemici, clic as clicNemici, input as inputNemici } from "./nemici.js";
import { avviaAttacchi, fermaAttacchi, aggiornaScontro, htmlGiocatore, htmlMaster, danniPerGiocatore, apriReazione, clic as clicAttacco, input as inputAttacco } from "./attacco.js";
import { sistemaEvocati, puoIniziare, tuttiHannoTirato } from "./regole/nemici.js";
import { icona } from "./icone.js";
import { schermoBattaglia, tornaAlloScontro } from "./regole/battaglia.js";
import { totaleIniziativa, ordina, pariConPrecedente, avanza, indietro } from "./regole/combattimento.js";

const DOC = "scontro/attuale", TIRI = "scontro/attuale/tiri";
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, dm = false, miei = [], info = () => null, toast = () => {};
let ascolti = [], SC = null, TIRATI = {}, vista = false, rimandato = null, ultimoAvviso = "", inVolo = false;
let inizioTurno = () => [], pfDi = () => null, copiaFine = () => {};
/* la scheda cambia (PF, nome…): la banda in alto si aggiorna */
document.addEventListener("scheda:aggiornata", () => { if (SC) modoScontro(); });
let chiSono = "", inviando = false, prec = null, congedo = null, visti = new Set(), apertoPer = "";
const secondi = ms => (ms / 1000).toFixed(1).replace(".", ",") + " s";

/* ---------- avvio e arresto (li chiama app.js) ---------- */
export function avviaScontro({ archivio, profilo, datiIniziativa, datiAttacco, spendiSlot, inizioTurno: iniziaTurno, bersaglioPg, colpisciPg, usaRisorsa, consumaOggetto, curaPg, pfDi: pf, modificaScheda, usaMunizionePg, copia, avvisa }) {
  pfDi = pf || (() => null); copiaFine = copia || (() => {}); modScheda = modificaScheda || (() => {});
  inizioTurno = iniziaTurno || (() => []);
  arch = archivio; dm = profilo.id === "dm"; miei = dm ? [] : profilo.personaggi.slice();
  info = datiIniziativa; toast = avvisa; SC = null; TIRATI = {}; rimandato = null; ultimoAvviso = "";
  chiSono = profilo.id; inviando = false; prec = null; apertoPer = ""; clearTimeout(congedo); congedo = null; visti = new Set(); ultimoTimbro = 0;
  ascolti = [
    arch.ascolta(DOC, dati => { SC = dati || { stato: "chiuso" }; aggiornaScontro(SC); if (CONFIG.misura && !dm) misuraMaster(); aggiorna(); },
      () => toast("Scontro non raggiungibile", 5000), { anchePropri: true }),
    arch.ascoltaRaccolta(TIRI, lista => {
      TIRATI = Object.fromEntries(lista.map(t => [t.id, t.dati]));
      if (CONFIG.misura && dm) misuraArrivi(lista);
      aggiorna();
    }),
  ];
  if (dm) avviaNemici({ archivio, aggiorna: () => { disegna(true); if (!$("vistaBestiario").hidden) mostraBestiario(); }, avvisa });
  avviaAttacchi({ archivio, master: dm, avvisa, aggiorna: () => disegna(true), datiAttacco, spendiSlot, bersaglio: bersaglioPg, colpisci: colpisciPg,
    scrivi: campi => arch.aggiorna(DOC, { ...campi, ...timbro() }), usa: usaRisorsa, consuma: consumaOggetto, cura: curaPg, modificaScheda, usaMunizione: usaMunizionePg });
}
export function fermaScontro() {
  ascolti.forEach(stop => stop()); ascolti = [];
  document.body.classList.remove("modo-scontro", "con-banda", "senza-barra"); { const sb = document.getElementById("sbirciaScheda"); if (sb) sb.hidden = true; } const banda = document.getElementById("bandaScontro"); if (banda) banda.hidden = true;
  if (dm) fermaNemici();
  fermaAttacchi();
  SC = null; mostraVista(false); if (TI) { TI.f.chiudi(true); TI = null; }
}

/** Apre o chiude la vista dello scontro al posto della scheda (la barra dei PF resta). */
export function mostraVista(si) {
  vista = !!si;
  if (!vista) { clearTimeout(congedo); congedo = null; }
  else {   // da Tavolo, Bestiario o Campagna si passa allo scontro
    $("vistaScheda").classList.remove("in-altro", "in-tavolo", "in-bestiario");
    $("vistaAltro").hidden = $("vistaTavolo").hidden = $("vistaBestiario").hidden = true;
  }
  $("vistaScheda").classList.toggle("in-scontro", vista);
  /* al master, nello scontro, la barra con PF/Danno/Cura di una scheda non serve: la nasconde (resta per gli avvisi) */
  document.body.classList.toggle("master-scontro", dm && vista);
  if (SC) modoScontro();
  $("vistaScontro").hidden = !vista;
  if (vista) window.scrollTo({ top: 0 });
  document.dispatchEvent(new Event("vista:cambiata"));   // la barra in basso accende la sezione giusta
  disegna();
}

/** Per il Tavolo del master: c'è uno scontro? a che round, e a chi tocca. */
export function statoScontroBreve() {
  if (!SC || SC.stato === "chiuso" || !SC.stato) return null;
  const a = attivo();
  return { stato: SC.stato, round: SC.round, chi: a ? (dm ? nomeConConta(a, true) : esc(a.nome)) : "" };
}
/* ---------- il Bestiario del master, come sezione a sé (barra in basso) ---------- */
export function mostraBestiario() {
  const el = $("vistaBestiario"); if (!el || !dm) return;
  const foco = document.activeElement && document.activeElement.id === "nzCerca" ? document.activeElement.selectionStart : null;
  el.innerHTML = htmlBestiarioSezione();
  if (foco != null) { const n = $("nzCerca"); if (n) { n.focus({ preventScroll: true }); n.setSelectionRange(foco, foco); } }
}
$("vistaBestiario").addEventListener("click", async e => {
  const n = dm && e.target.closest("[data-nz]"); if (!n) return;
  try { await clicNemici(n, SC || { stato: "chiuso" }, campi => arch.aggiorna(DOC, { ...campi, ...timbro() })); } catch (_) { toast("Non salvato: controlla la connessione", 4000); }
  mostraBestiario();
});
$("vistaBestiario").addEventListener("input", e => { if (dm && inputNemici(e)) mostraBestiario(); });
$("vistaBestiario").addEventListener("change", e => { if (dm && inputNemici(e)) mostraBestiario(); });

/* ---------- chi partecipa ---------- */
/* Tutti i personaggi con scheda; chi non ha ancora la scheda (Petrus, Rex) entra "a mano": il master scrive il totale. */
function catalogo() {
  const out = [];
  for (const p of PROFILI) {
    if (p.id === "dm") continue;
    if (p.personaggi.length) p.personaggi.forEach(k => PERSONAGGI[k] && out.push({ id: k, nome: PERSONAGGI[k].name, tipo: "scheda" }));
    else out.push({ id: p.id, nome: p.nome, tipo: "manuale" });
  }
  return out;
}
/* il modificatore d'iniziativa: dalla scheda per i personaggi, dal bestiario (solo il master) per nemici e alleati */
const nemico = p => p.tipo === "nemico" || p.tipo === "alleato";
const infoDi = p => nemico(p) ? infoGruppo(p.id) : info(p.id);
const tiroDi = id => { const t = TIRATI[id]; return t && SC && t.scontro === SC.id ? t : null; };
const mio = id => miei.includes(id);
const attivo = () => (SC && SC.stato === "in corso" && SC.ordine && SC.ordine[SC.turno]) || null;

/* ---------- reazioni ai cambiamenti ---------- */
function aggiorna() {
  if (!SC) return;
  /* nuovo round: il telefono del master sposta le creature evocate al posto della loro iniziativa */
  if (dm && SC.stato === "in corso" && (SC.ordine || []).some(v => v.evocati != null && v.evocati < SC.round)) {
    const r = sistemaEvocati(SC); if (r) arch.aggiorna(DOC, { ...r, ...timbro() }).catch(() => {});
  }
  /* lo scontro è appena finito? (prec è lo stato visto l'ultima volta; al primo caricamento non c'è) */
  const finito = !dm && prec && prec !== "chiuso" && SC.stato === "chiuso";
  prec = SC.stato;
  if (finito) salutaFine();
  else if (SC.stato !== "chiuso" && congedo) { clearTimeout(congedo); congedo = null; }   // ne è già iniziato un altro

  controllaSconfitti();
  modoScontro();
  controllaVittoria();
  document.dispatchEvent(new Event("scontro:cambiato"));   // il Tavolo del master si aggiorna
  const b = document.querySelector("#barra [data-scontro]");
  if (b) {
    mostraPulsante(b, dm);   // i giocatori non hanno mai la voce "Scontro": lo scontro prende tutto lo schermo
    b.classList.toggle("avviso", daTirare().length > 0 || !!(attivo() && mio(attivo().id)));
  }
  if (!dm && SC.stato === "chiuso" && vista && !congedo) mostraVista(false);
  /* "Tirate l'iniziativa" (o l'app riaperta a scontro in corso): a chi partecipa e al master si apre da sola
     la schermata dello scontro, una volta per scontro; poi ognuno è libero di guardare la scheda */
  if (SC.stato !== "chiuso" && apertoPer !== SC.id && (dm || (SC.partecipanti || []).some(p => mio(p.id)))) {
    apertoPer = SC.id; if (!vista) mostraVista(true);
  }

  /* finestra del tiro: si apre da sola ai giocatori che devono ancora tirare */
  if (daTirare().length && rimandato !== SC.id && !(TI && TI.f.aperta)) apriTiro();
  else if (!daTirare().length && TI && !TI.master && TI.f.aperta) { TI.f.chiudi(true); TI = null; }

  /* inizio dello scontro e "tocca a te" */
  const a = attivo();
  if (a) {
    const chiave = `${SC.id}:${SC.round}:${SC.turno}`;
    if (chiave !== ultimoAvviso) {
      const primo = !ultimoAvviso.startsWith(SC.id + ":");
      ultimoAvviso = chiave;
      if (primo && !vista) mostraVista(true);
      if (mio(a.id) && !vista) mostraVista(true);   // al tuo turno l'app torna da sola allo scontro
      if (mio(a.id)) {
        /* sul telefono di chi gioca: le condizioni con durata scendono di un round */
        const finite = inizioTurno(a.id, chiave);
        toast(`Tocca a te: ${a.nome}${finite.length ? ` · finito: ${finite.join(", ").toLowerCase()}` : ""}`, 6000); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (_) {} }
    }
  }
  disegna();
}
/* ---------- modalità scontro ----------
   Durante uno scontro l'app cambia aspetto: il selettore in basso mette in evidenza "Scontro", e quando si guarda
   la scheda una banda cremisi in alto ricorda round e turno (dorata se tocca a te), con un tocco per tornare allo scontro. */
let eraMioTurno = false;
function modoScontro() {
  const attivoOra = !!(SC && SC.stato !== "chiuso" && (dm || (SC.partecipanti || []).some(p => mio(p.id))));
  document.body.classList.toggle("modo-scontro", attivoOra);
  document.body.classList.toggle("scontro-vista", attivoOra && vista);
  let banda = $("bandaScontro");
  if (!banda) {
    banda = document.createElement("div");
    banda.id = "bandaScontro"; banda.className = "banda-scontro"; banda.hidden = true;
    banda.addEventListener("click", e => { const b = e.target.closest("[data-banda]"); if (b) { mostraVista(b.dataset.banda === "scontro"); window.scrollTo({ top: 0 }); } });
    document.body.appendChild(banda);
  }
  banda.hidden = !attivoOra; document.body.classList.toggle("con-banda", attivoOra);
  /* giocatori: dentro lo scontro la barra delle sezioni sparisce e resta un solo pulsante per sbirciare la scheda */
  const schermo = schermoBattaglia({ master: dm, inScontro: attivoOra, vista });
  document.body.classList.toggle("senza-barra", !schermo.barra);
  let sbircia = $("sbirciaScheda");
  if (!sbircia) {
    sbircia = document.createElement("button");
    sbircia.id = "sbirciaScheda"; sbircia.type = "button"; sbircia.className = "sbircia vetro"; sbircia.hidden = true;
    sbircia.innerHTML = `${icona("scheda")}<span>Guarda la scheda</span>`;
    sbircia.addEventListener("click", () => { mostraVista(false); window.scrollTo({ top: 0 }); });
    document.body.appendChild(sbircia);
  }
  sbircia.hidden = !schermo.sbircia;
  if (!attivoOra) { eraMioTurno = false; return; }
  const a = attivo(), tuo = !!(a && mio(a.id));
  /* comincia il mio turno mentre guardo la scheda: si torna allo scontro, una volta sola */
  const torna = tornaAlloScontro({ mioTurno: tuo, eraMioTurno, vista }); eraMioTurno = tuo;
  if (torna && !dm) { mostraVista(true); window.scrollTo({ top: 0 }); return; }
  const chi = SC.stato === "tiri" ? "tirate l'iniziativa" : `round ${SC.round}`;
  banda.classList.toggle("tuo", tuo && !vista);
  if (vista) {
    /* nello scontro: il round (chi agisce lo dice la schermata), i tuoi PF e il pulsante per aprire la scheda, come pagina a parte */
    /* nello scontro: in alto a sinistra il round; i tuoi PF stanno nella capsula in alto a destra */
    banda.innerHTML = `<span class="bs-segno" aria-hidden="true"></span><span class="bs-testo"><b>${SC.stato === "tiri" ? "Iniziativa" : `Round ${SC.round}`}</b></span>`;
  } else {
    banda.innerHTML = `<button class="bs-torna" data-banda="scontro" type="button"><svg class="ico-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span class="bs-testo"><b>${tuo ? "Tocca a te" : "Scontro"}</b></span></button>`;
  }
}

function mostraPulsante(b, si) {
  /* giocatori: senza scontro la voce "Scontro" non c'è proprio (il master ce l'ha sempre) */
  const era = b.hidden;
  b.classList.remove("esce", "spenta"); b.hidden = !si;
  if (era === si) document.dispatchEvent(new Event("vista:cambiata"));
}
/* Fine dello scontro per i giocatori: un riquadro "Scontro concluso" per qualche secondo, poi si torna alla scheda.
   Se il master lo annulla mentre si tirava l'iniziativa basta un avviso. */
function salutaFine() {
  if (TI) { TI.f.chiudi(true); TI = null; }
  copiaFine();   // a fine scontro ogni scheda di questo telefono finisce nello storico
  const f = SC.fine || {};
  if (!f.giocato) { toast("Scontro annullato"); return; }
  mostraFine(f);
}
/* ---------- fine dello scontro ----------
   Quando cade l'ultimo nemico (nascosti compresi) il telefono del master propone di chiudere: dopo qualche secondo
   lo scontro si chiude da solo, a meno che il master tocchi "Non è finito". A tutti compare il pannello di fine. */
let vittoriaRifiutata = "", vittoriaTimer = null;
function controllaVittoria() {
  if (!dm || !SC || SC.stato !== "in corso") return;
  const st = statoNemici(SC.id), chiave = `${SC.id}:${st.totali}`;
  if (!st.totali || st.inPiedi > 0 || vittoriaRifiutata === chiave || vittoriaTimer) return;
  const fa = finestraAperta(); if (fa && fa.chiave === "conferma") return;   // prima la conferma dei danni in corso
  let resta = 8;
  const f = finestra({ chiave: "vittoria", titolo: "Fine dello scontro", onChiudi: () => { clearInterval(vittoriaTimer); vittoriaTimer = null; },
    onClick: async e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-non-finito")) { vittoriaRifiutata = chiave; f.chiudi(); toast("Lo scontro continua"); }
      if (b.hasAttribute("data-chiudi-ora")) { f.chiudi(); await chiudiScontro(true); }
    } });
  f.mostra(`<p class="domanda">Tutti i nemici sono a terra</p>
    <p class="aiuto">Lo scontro si chiude da solo tra <b class="conto">${resta}</b> secondi. Se stanno per arrivare rinforzi, tocca "Non è finito".</p>
    <div class="fondo colonna"><button class="btn up grande" data-chiudi-ora>Chiudi ora</button><button class="btn" data-non-finito>Non è finito</button></div>`, { tono: "rosso" });
  vittoriaTimer = setInterval(async () => {
    resta--; f.pezzo(".conto", String(resta));
    if (resta <= 0) { clearInterval(vittoriaTimer); vittoriaTimer = null; f.chiudi(true); await chiudiScontro(true); }
  }, 1000);
}
async function chiudiScontro(vittoria) {
  const fine = { round: SC.round || 1, giocato: SC.stato === "in corso", vittoria: !!vittoria,
    sconfitti: statoNemici(SC.id).totali, danni: danniPerGiocatore(SC.id) };
  await arch.scrivi(DOC, { stato: "chiuso", fine, ...timbro() });
  if (fine.giocato) copiaFine();
  if (fine.giocato) mostraFine(fine);
}
/* il pannello di fine: vittoria con un po' di festa, oppure semplicemente "scontro concluso" */
function mostraFine(f) {
  const danni = Object.entries(f.danni || {}).sort((a, b) => b[1] - a[1]);
  const fin = finestra({ chiave: "fine", titolo: f.vittoria ? "Vittoria" : "Fine dello scontro", onChiudi: () => { if (!dm && SC && SC.stato === "chiuso") mostraVista(false); },   // il master resta nella sua pagina Scontro, non finisce su una scheda
    onClick: e => { if (e.target.closest("[data-fine-ok]")) fin.chiudi(); } });
  vibra(f.vittoria ? [80, 60, 80, 60, 160] : 60);
  fin.mostra(`<div class="fine-centro"><div class="vittoria${f.vittoria ? "" : " semplice"}" role="status">
      ${f.vittoria ? `<div class="v-losanghe" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>` : ""}
      <b>${f.vittoria ? "Vittoria!" : "Scontro concluso"}</b>
      <span>${f.round} ${f.round === 1 ? "round" : "round"}${f.sconfitti ? ` · ${f.sconfitti} ${f.sconfitti === 1 ? "nemico sconfitto" : "nemici sconfitti"}` : ""}</span>
    </div>
    ${danni.length ? `<p class="lbl-sez">Danni inflitti</p><ul class="v-danni">${danni.map(([n, d], i) => `<li style="--i:${i}"><span>${esc(n)}</span><b>${d}</b></li>`).join("")}</ul>` : ""}</div>
    <div class="fondo"><button class="btn up" data-fine-ok>Torna alle schede</button></div>`);
}

/* i miei personaggi in gara che non hanno ancora tirato (per il master: nessuno, tira dalla sua vista) */
function daTirare() {
  if (!SC || SC.stato !== "tiri" || dm) return [];
  return (SC.partecipanti || []).filter(p => mio(p.id) && !tiroDi(p.id) && !png(p));
}

/* ---------- campi per scrivere un tiro ---------- */
/* Per un personaggio con scheda: uno o due d20 (due con vantaggio) e l'app aggiunge il modificatore.
   Per uno "a mano": il master scrive direttamente il totale. */
function campi(p, dove) {
  if (p.tipo === "manuale")
    return `<label class="dado tot"><span class="lbl">Totale</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-tiro="${p.id}" data-i="0" data-foco="t-${p.id}-0" aria-label="Totale di iniziativa di ${esc(p.nome)}"></label>
      <output class="somma" data-somma="${p.id}"></output>`;
  const d = infoDi(p); if (!d) return "";
  const n = d.vantaggio ? 2 : 1, aiuto = d.vantaggio ? "vantaggio: conta il più alto" : "";
  let h = "";
  for (let i = 0; i < n; i++) h += `<label class="dado"><span class="lbl">d20${n > 1 ? " " + (i + 1) : ""}</span><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" max="20" data-tiro="${p.id}" data-i="${i}" data-foco="t-${dove}-${p.id}-${i}" aria-label="Dado ${i + 1} di ${esc(p.nome)}"${dove === "veil" && i === 0 ? " data-primo" : ""}></label>`;
  return h + `<output class="somma" data-somma="${p.id}">${sg(d.mod)}</output>${aiuto ? `<small class="aiuto">${aiuto}</small>` : ""}`;
}
function leggiCampi(radice, p) {
  const vals = [...radice.querySelectorAll(`[data-tiro="${p.id}"]`)].map(i => i.value);
  if (p.tipo === "manuale") {
    const t = parseInt(vals[0], 10);
    return Number.isInteger(t) ? { dadi: [], mod: 0, tot: t, des: null } : null;   // Destrezza sconosciuta
  }
  const d = infoDi(p);
  const r = totaleIniziativa({ dadi: vals, mod: d.mod, vantaggio: d.vantaggio });
  return r && { dadi: r.dadi, usato: r.usato, mod: r.mod, tot: r.tot, des: d.des };
}
/* mentre si scrive, mostra il conto: "14 + 1 = 15" */
function mostraSomma(radice, p) {
  const out = radice.querySelector(`[data-somma="${p.id}"]`); if (!out) return;
  const r = leggiCampi(radice, p);
  if (p.tipo === "manuale") { out.textContent = ""; return; }
  const d = infoDi(p);
  out.innerHTML = r ? `${r.usato} ${d.mod >= 0 ? "+" : "−"} ${Math.abs(d.mod)} = <b>${r.tot}</b>` : sg(d.mod);
}
/* ---------- iniziativa automatica dei PNG ----------
   Le creature del master e i seguaci come Ireena non tirano a mano: tira il telefono del master, appena si chiede l'iniziativa.
   È l'unico tiro che fa l'app; attacchi e danni restano dei giocatori e del master. */
const png = p => nemico(p) || !!(PERSONAGGI[p.id] && PERSONAGGI[p.id].png);
const d20 = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % 20) + 1; };
async function tiraPng(idScontro, partecipanti) {
  for (const p of partecipanti.filter(png)) {
    const d = infoDi(p); if (!d) continue;
    const dadi = d.vantaggio ? [d20(), d20()] : [d20()];
    const r = totaleIniziativa({ dadi, mod: d.mod, vantaggio: d.vantaggio });
    await arch.scrivi(`${TIRI}/${p.id}`, { scontro: idScontro, nome: p.nome, tipo: p.tipo, dadi: r.dadi, usato: r.usato, mod: r.mod, tot: r.tot, des: d.des ?? null, auto: true, da: chiSono, inviato: Date.now() });
    await new Promise(ok => setTimeout(ok, 350));   // uno dopo l'altro: si vedono rotolare in fila
  }
}
/* "inviato" è l'ora d'invio: serve solo a misurare il ritardo con ?misura */
async function salvaTiro(p, r) {
  await arch.scrivi(`${TIRI}/${p.id}`, { scontro: SC.id, nome: p.nome, tipo: p.tipo, ...r, da: chiSono, inviato: Date.now() });
}
/* Le modifiche del master portano l'ora d'invio ("inviato"): con ?misura il giocatore vede quanto ci hanno messo.
   Quelle del giocatore (Fine turno) no: le regole gli permettono di cambiare solo turno e round. */
const timbro = () => (dm ? { inviato: Date.now() } : {});
let ultimoTimbro = 0;
function misuraMaster() {
  const primo = !ultimoTimbro, t = SC.inviato || -1;   // al primo caricamento si prende solo nota
  if (t === ultimoTimbro) return;
  ultimoTimbro = t;
  if (!primo && SC.inviato) toast(`Dal master in ${secondi(Date.now() - SC.inviato)}`, 6000);   // al primo caricamento non conta
}
/* Solo per le prove (?misura): il master vede quanto ci ha messo il tiro di un giocatore ad arrivare.
   Le due finestre stanno sullo stesso computer, quindi l'orologio è lo stesso e il conto è esatto. */
function misuraArrivi(lista) {
  const ora = Date.now(), nuovi = [];
  for (const { id, dati } of lista) {
    const k = `${id}:${dati.inviato}`;
    if (!dati.inviato || visti.has(k)) continue;
    visti.add(k);
    if (dati.da !== chiSono && SC && dati.scontro === SC.id) nuovi.push(`${dati.nome} in ${secondi(ora - dati.inviato)}`);
  }
  if (nuovi.length) toast(`Arrivato: ${nuovi.join(" · ")}`, 8000);
}

/* ---------- finestra "Tirate l'iniziativa" (giocatori) ---------- */
/* ---------- tiro d'iniziativa con la griglia dei numeri ----------
   Giocatore: un personaggio alla volta (Rombosogliola, poi Ireena). Master: un tocco su "Tira" per chi gestisce lui. */
let TI = null, modScheda = () => {};
const SPADE_INC = icona("scontro");
function apriTiro(soloPer = null) {
  const lista = soloPer ? [soloPer] : daTirare(); if (!lista.length) return;
  if (TI && TI.f.aperta && !soloPer) { TI.lista = lista; return disegnaTiro(false); }
  TI = { lista, dadi: [], master: !!soloPer };
  TI.f = finestra({ chiave: "iniziativa", titolo: soloPer ? "Iniziativa" : "Scontro!", onClick: clicTiro, onChiudi: () => { if (!TI || !TI.master) rimandato = SC && SC.id; TI = null; aggiorna(); } });
  disegnaTiro();
}
function tiroDiTI(p) {
  if (p.tipo === "manuale") { const t = TI.dadi[0]; return t ? { dadi: [], mod: 0, tot: t, des: null } : null; }
  const d = infoDi(p); if (!d) return null;
  const r = totaleIniziativa({ dadi: TI.dadi, mod: d.mod, vantaggio: d.vantaggio || TI.insp });
  return r && { dadi: r.dadi, usato: r.usato, mod: r.mod, tot: r.tot, des: d.des };
}
function disegnaTiro(nuovo = true) {
  const p = TI.lista[0]; if (!p) { TI.f.chiudi(true); TI = null; return; }
  const manuale = p.tipo === "manuale", d = manuale ? null : infoDi(p), n = manuale ? 1 : (d && (d.vantaggio || TI.insp) ? 2 : 1), r = tiroDiTI(p);
  const dopo = TI.lista[1];
  /* ai giocatori si dice cosa sta succedendo, non solo "tira il d20" */
  const annuncio = TI.master ? "" : `<div class="inizio-scontro" role="status">${SPADE_INC}<b>È iniziato uno scontro!</b><span>${esc(p.nome)}, tira l'iniziativa</span></div>`;
  TI.f.mostra(`${annuncio}<p class="domanda">${manuale ? "Totale d'iniziativa" : TI.master ? "Tira il d20" : "Lancia il d20 e tocca il numero uscito"}</p>
    <p class="aiuto">${TI.master ? `<b>${esc(p.nome)}</b> · ` : ""}${manuale ? "senza scheda: scrivi il totale" : `${TI.master ? "iniziativa" : "L'app aggiunge la tua iniziativa:"} ${sg(d.mod)}${d.vantaggio ? " · con vantaggio: tira due dadi, conta il più alto" : ""}`}</p>
    ${!manuale && d && d.insp > 0 && !d.vantaggio && !TI.master ? `<button class="extra" data-ini-insp aria-pressed="${!!TI.insp}"><span class="ex-spia"></span><span class="ex-testo">Usa l'ispirazione<small>vantaggio a questo tiro · ne hai ${d.insp}</small></span></button>` : ""}
    ${caselleDadi(TI.dadi, n, manuale ? 30 : 20, "ini")}
    ${tastierino(manuale ? 30 : 20, null, "data-ini")}
    <div class="totale">${r ? (manuale ? `Totale<b>${r.tot}</b>` : `<span class="tot-come">Dado <i>${r.usato}</i> · iniziativa <i>${sg(r.mod)}</i></span><b>${r.tot}</b>`) : `<span>${manuale ? "Tocca il totale" : "Tocca il numero uscito"}</span>`}</div>
    <div class="fondo"><button class="btn up" data-ini-ok${r ? "" : ` disabled data-perche="Scrivi prima il numero uscito sul d20"`}>${dopo ? `Avanti: ${esc(dopo.nome)}` : "Conferma"}</button></div>`,
    { passo: TI.master ? 0 : 1, di: 0, nuovoPasso: nuovo });
}
async function clicTiro(e) {
  const b = e.target.closest("button"); if (!b || b.disabled || !TI) return;
  const p = TI.lista[0], manuale = p.tipo === "manuale", n = manuale ? 1 : (infoDi(p) && (infoDi(p).vantaggio || TI.insp) ? 2 : 1);
  if (b.hasAttribute("data-ini-insp")) { TI.insp = !TI.insp; TI.dadi = TI.dadi.slice(0, TI.insp ? 2 : 1); return disegnaTiro(false); }
  if (b.dataset.ini) { const i = Array.from({ length: n }, (_, k) => TI.dadi[k]).findIndex(v => v == null || v === ""); TI.dadi[i >= 0 ? i : n - 1] = +b.dataset.ini; return disegnaTiro(false); }
  if (b.dataset.casella === "ini") { TI.dadi[+b.dataset.i] = ""; return disegnaTiro(false); }
  if (b.hasAttribute("data-ini-ok")) {
    const r = tiroDiTI(p); if (!r) return;
    if (TI.insp) { modScheda(p.id, St => { St.insp = Math.max(0, (St.insp || 0) - 1); }); TI.insp = false; }
    TI.lista = TI.lista.slice(1); TI.dadi = [];
    try { await salvaTiro(p, r); toast(`${p.nome}: ${r.tot}`); }
    catch (_) { toast("Tiro non salvato: controlla la connessione e riprova", 5000); TI.lista.unshift(p); }
    if (TI) disegnaTiro();
  }
}

/* ---------- vista dello scontro ---------- */
function disegna(forza) {
  partenzaAutomatica();
  if (dm) setTimeout(controllaVittoria, 0);   // anche dopo una conferma dei danni: forse era l'ultimo nemico
  if (!vista || !SC || congedo) return;   // durante "Scontro concluso" il riquadro resta fermo
  const el = $("vistaScontro");
  /* mentre il master scrive un modello del bestiario, gli aggiornamenti dall'archivio non devono cancellarlo */
  if (!forza && el.querySelector(".modulo")) return;
  /* ridisegnare non deve cancellare quello che il master sta scrivendo o le spunte già tolte */
  const scritti = [...el.querySelectorAll("[data-tiro]")].map(i => [i.dataset.tiro, i.dataset.i, i.value]);
  const tolti = [...el.querySelectorAll("[data-part]:not(:checked)")].map(i => i.dataset.part);
  const foco = document.activeElement && el.contains(document.activeElement) && document.activeElement.dataset.foco;
  const campiLiberi = [...el.querySelectorAll("[data-qta], [data-trasf], #nzCreatura, #nzQuanti, #nzModo, #nzRCreatura, #nzRQuanti, #nzRModo, #nzRD20, #nzREvoca")]
    .map(i => [i.dataset.qta ? `[data-qta="${i.dataset.qta}"]` : i.dataset.trasf ? `[data-trasf="${i.dataset.trasf}"]` : "#" + i.id, i.value]);
  const aperti = [...el.querySelectorAll("details[data-apri][open]")].map(d => d.dataset.apri);   // i pannelli aperti restano aperti
  if (SC.stato === "chiuso") el.innerHTML = dm ? vistaPreparazione() : `<header class="testa-pagina"><h1>Scontro</h1><p>Nessuno scontro in corso.</p></header>`;
  else if (SC.stato === "tiri") el.innerHTML = vistaTiri();
  else el.innerHTML = vistaTurni();
  aperti.forEach(k => { const d = [...el.querySelectorAll("details[data-apri]")].find(x => x.dataset.apri === k); if (d) d.open = true; });
  campiLiberi.forEach(([sel, v]) => { const x = el.querySelector(sel); if (x) x.value = v; });
  scritti.forEach(([id, i, v]) => { const x = el.querySelector(`[data-tiro="${id}"][data-i="${i}"]`); if (x) x.value = v; });
  tolti.forEach(id => { const x = el.querySelector(`[data-part="${id}"]`); if (x) x.checked = false; });
  (SC.partecipanti || []).forEach(p => el.querySelector(`[data-somma="${p.id}"]`) && mostraSomma(el, p));
  /* chi stava scrivendo in un campo continua a scriverci anche dopo il ridisegno */
  if (foco) { const f = el.querySelector(`[data-foco="${foco}"]`); if (f) { f.focus({ preventScroll: true }); try { const n = f.value.length; f.setSelectionRange(n, n); } catch (_) {} } }
}

/* Nuovo scontro in due passi, per non partire per sbaglio senza nemici: 1) chi del gruppo partecipa, 2) chi combatte.
   "Tirate l'iniziativa" si accende solo con almeno un nemico in campo. */
let passoPrep = 1;
const fuori = new Set();   // chi del gruppo NON partecipa (di solito nessuno)
const nelGruppo = () => catalogo().filter(p => !fuori.has(p.id));
function vistaPreparazione() {
  if (pannelloAperto()) return htmlPreparazione();
  const tutti = catalogo(), dentro = nelGruppo();
  const passi = `<ol class="prep-passi" aria-label="Passi della preparazione"><li class="${passoPrep === 1 ? "ora" : "fatto"}"><button data-az="prep-1" type="button"><i>1</i>Il gruppo</button></li>
    <li class="${passoPrep === 2 ? "ora" : ""}"><button data-az="prep-2" type="button"${dentro.length ? "" : ` disabled data-perche="Scegli almeno un personaggio del gruppo"`}><i>2</i>Chi combatte</button></li></ol>`;
  if (passoPrep === 1) return `<header class="testa-pagina"><h1>Nuovo scontro</h1><p>Primo passo: chi del gruppo partecipa.</p></header>${passi}
    <section><h2>Il gruppo <span>${dentro.length} su ${tutti.length}</span></h2>
    <ul class="scelta">${tutti.map(p => `<li><label><input type="checkbox" data-part="${p.id}"${fuori.has(p.id) ? "" : " checked"}>
      <span>${esc(p.nome)}</span>${p.tipo === "manuale" ? `<small>senza scheda: scrivi tu il totale</small>` : ""}</label></li>`).join("")}</ul></section>
    <div class="azioni prep-fine"><button class="btn up" data-az="prep-2"${dentro.length ? "" : ` disabled data-perche="Scegli almeno un personaggio del gruppo"`}>Avanti: chi combatte</button></div>`;
  const st = statoPreparazione(), v = puoIniziare({ gruppo: dentro.length, scelte: st.scelte, modelli: st.modelli });
  return `<header class="testa-pagina"><h1>Chi combatte</h1><p>Secondo passo: i nemici e chi altro c'è. Del gruppo partecipano <b>${dentro.map(p => esc(p.nome)).join(", ")}</b>.</p></header>${passi}
    ${htmlPreparazione()}
    <div class="azioni prep-fine">${v.ok ? `<p class="hint">Sui telefoni dei giocatori comparirà la richiesta dell'iniziativa.</p>` : `<p class="hint prep-manca">${v.perche}</p>`}
      <button class="btn" data-az="prep-1">Indietro</button><button class="btn up" data-az="chiedi"${v.ok ? "" : ` disabled data-perche="${esc(v.perche)}"`}>Tirate l'iniziativa</button></div>`;
}

/* il d20 che rotola: la prima volta che questo telefono vede il tiro parte l'animazione; se la lista si ridisegna
   a metà, riprende da dove era arrivata (ritardo negativo), così non si interrompe */
const visto = new Map();
const D20_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7l4.5 7.5h-9z M12 2v5M20.66 7L16.5 14.5M3.34 7L7.5 14.5M7.5 14.5L3.34 17M16.5 14.5L20.66 17M7.5 14.5L12 22l4.5-7.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
function tiroAnimato(p, t) {
  const k = `${SC.id}:${p.id}`;
  if (!visto.has(k)) visto.set(k, Date.now());
  const trascorso = Date.now() - visto.get(k), fresco = trascorso < 2000;
  return `<span class="tiro-auto${fresco ? " rotola" : ""}" style="--d:${-trascorso}ms">${D20_SVG}<span class="tot">${t.tot}</span><small>d20 ${t.usato}${t.dadi && t.dadi.length > 1 ? ` (${t.dadi.join(", ")})` : ""} ${sg(t.mod)}</small></span>`;
}
function vistaTiri() {
  const parts = (SC.partecipanti || []).filter(visibile), fatti = parts.filter(p => tiroDi(p.id)).length;
  const righe = parts.map(p => {
    const t = tiroDi(p.id);
    let destra;
    if (t && t.auto) destra = tiroAnimato(p, t);
    else if (t) destra = `<span class="tot">${t.tot}</span><small>${t.tipo === "manuale" ? "a mano" : `d20 ${t.usato} ${sg(t.mod)}`}</small>`;
    else if (dm) destra = `<button class="btn gold" data-az="mtira" data-id="${p.id}">Tira</button>`;
    else if (mio(p.id) && !png(p)) destra = `<button class="btn gold" data-az="tira">Tira</button>`;
    else if (png(p)) destra = `<small>tira l'app…</small>`;
    else destra = `<small>in attesa</small>`;
    return `<li class="${t ? "fatto" : ""}" data-p="${p.id}"><span class="nome">${esc(nomeVoce(p))}</span><span class="stato">${destra}</span></li>`;
  }).join("");
  const mancano = parts.filter(p => !tiroDi(p.id)).map(p => p.nome);
  return `<section><h2>Tirate l'iniziativa <small>${fatti} su ${parts.length}</small></h2>
    <ul class="tiri">${righe}</ul>
    ${dm ? `<p class="hint">${mancano.length ? `Mancano ${esc(mancano.join(", "))}. Quando avranno tirato tutti lo scontro parte da solo.` : "Hanno tirato tutti: lo scontro parte adesso."}</p>
      <div class="azioni tiri-az"><button class="btn rosso" data-az="chiudi">Annulla lo scontro</button>
      ${mancano.length ? `<button class="btn up" data-az="inizia"${fatti ? "" : ` disabled data-perche="Non ha ancora tirato nessuno"`}>Inizia senza chi manca</button>` : ""}</div>`
      : `<p class="hint">Quando avranno tirato tutti, lo scontro parte da solo.</p>`}</section>`;
}

/* ---------- la coda dei turni ----------
   L'ordine si legge come una coda: in cima chi agisce adesso, sotto chi viene dopo; chi ha già giocato in questo
   round va sotto la riga "Round N+1". A sinistra di ogni riga il totale d'iniziativa (è lui a decidere l'ordine).
   Lo stato di una creatura compare solo se è cambiato; chi è sconfitto esce dalla coda con un annuncio per tutti. */
const etichetta = c => c.ferite === "illeso" ? "" : `<span class="stato-c" data-s="${c.ferite}">${c.pf != null && c.ferite !== "sconfitto" ? `${c.pf}/${c.max} PF` : c.ferite}${c.subiti && c.ferite !== "sconfitto" && c.pf == null ? ` <b>−${c.subiti}</b>` : ""}</span>`;
function membri(id) { return (SC.campo || []).filter(c => c.gruppo === id); }
/* da che parte sta una voce dei turni: il gruppo dei giocatori, gli alleati del master o i nemici */
/* il nome da mostrare: al master quello vero anche per i nascosti (i giocatori i nascosti non li vedono proprio) */
const nomeVoce = v => dm && v.nascosto ? `${nomeGruppo(v.id) || v.nome}` : v.nome;
const visibile = v => dm || !v.nascosto;
function lato(id) {
  const m = membri(id);
  if (!m.length) { const p = (SC.partecipanti || []).find(x => x.id === id); return p && (p.tipo === "nemico" || p.tipo === "alleato") ? p.tipo : "gruppo"; }
  const tipi = new Set(m.filter(c => c.ferite !== "sconfitto").map(c => c.tipo === "alleato" ? "alleato" : "nemico"));
  return tipi.size === 1 ? [...tipi][0] : tipi.size ? "misto" : (m[0].tipo === "alleato" ? "alleato" : "nemico");
}
const creature = v => nemico((SC.partecipanti || []).find(p => p.id === v.id) || {}) || membri(v.id).length > 0;

/* sconfitti appena caduti: restano visibili un attimo (con l'annuncio) e poi la riga si chiude */
const DURATA_USCITA = 1500, ATTESA_USCITA = 900;
let feriteViste = { scontro: null, mappa: {} }, uscenti = new Map(), fantasmi = new Map(), ordinePrima = [], conteViste = new Map();
const ritardoUscita = id => ATTESA_USCITA - (Date.now() - (uscenti.get(id) || Date.now()));
function controllaSconfitti() {
  if (!SC || SC.stato !== "in corso") { feriteViste = { scontro: null, mappa: {} }; ordinePrima = []; return; }
  const campo = SC.campo || [], ora = Date.now();
  if (feriteViste.scontro !== SC.id) { feriteViste = { scontro: SC.id, mappa: Object.fromEntries(campo.map(c => [c.id, c.ferite])) }; ordinePrima = (SC.ordine || []).slice(); return; }
  const caduti = campo.filter(c => c.ferite === "sconfitto" && feriteViste.mappa[c.id] && feriteViste.mappa[c.id] !== "sconfitto");
  feriteViste.mappa = Object.fromEntries(campo.map(c => [c.id, c.ferite]));
  /* un gruppo intero a terra esce dall'ordine: la sua riga resta come "fantasma" mentre si chiude */
  const ids = new Set((SC.ordine || []).map(v => v.id));
  ordinePrima.forEach((v, i) => {
    if (ids.has(v.id) || !caduti.some(c => c.gruppo === v.id)) return;
    const dopo = ordinePrima.slice(i + 1).concat(ordinePrima.slice(0, i)).find(x => ids.has(x.id));
    fantasmi.set(v.id, { voce: v, dopo: dopo ? dopo.id : null, t: ora });
  });
  ordinePrima = (SC.ordine || []).slice();
  if (!caduti.length) return;
  caduti.forEach(c => uscenti.set(c.id, ora));
  annuncia(caduti);
  setTimeout(() => {
    const ora2 = Date.now();
    for (const [k, t] of uscenti) if (ora2 - t >= DURATA_USCITA) uscenti.delete(k);
    for (const [k, f] of fantasmi) if (ora2 - f.t >= DURATA_USCITA) fantasmi.delete(k);
    disegna();
  }, DURATA_USCITA + 50);
}
/* l'annuncio in alto, su tutti i telefoni: la losanga si spezza, poi sparisce da solo */
function annuncia(caduti) {
  let el = $("annuncio");
  if (!el) { el = document.createElement("div"); el.id = "annuncio"; el.className = "annuncio"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
  const nomi = caduti.map(c => c.nome), alleati = caduti.every(c => c.tipo === "alleato");
  const testo = nomi.length === 1 ? `${nomi[0]} ${alleati ? "a terra" : "sconfitto"}` : `${nomi.slice(0, -1).join(", ")} e ${nomi[nomi.length - 1]} ${alleati ? "a terra" : "sconfitti"}`;
  el.innerHTML = `<span class="spezza" aria-hidden="true"><i></i><i></i></span><div><b>${esc(testo)}</b><small>${nomi.length === 1 ? "Esce" : "Escono"} dall'ordine dei turni</small></div>`;
  el.classList.remove("vede"); void el.offsetWidth; el.classList.add("vede");
  vibra([40, 30, 90]);
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("vede"), 2800);
}

/* il nome di un gruppo con quanti ne restano in piedi: "Lupo ×3". Il numero gira quando cambia
   (conteViste: com'era al disegno precedente; conteOra: come è adesso). */
let conteOra = new Map();
function contaDi(v) {
  if (dm) return contaGruppo(v.id);
  const m = membri(v.id); if (!m.length) return null;
  const vivi = m.filter(c => c.ferite !== "sconfitto");
  return { tot: m.length, vivi: vivi.length, nomeVivo: vivi.length === 1 ? vivi[0].nome : null };
}
/* semplice: solo testo (per i pulsanti); con un solo superstite si usa il suo nome ("Lupo 2", non "Lupo ×1") */
function nomeConConta(v, semplice = false) {
  const nome = nomeVoce(v), base = nome.replace(/\s*×\d+$/, ""), c = contaDi(v);
  if (!c || c.tot < 2) return esc(nome);
  if (c.vivi === 1 && c.nomeVivo) return esc(c.nomeVivo);
  if (semplice) return esc(`${base} ×${c.vivi}`);
  const prima = conteViste.get(v.id); conteOra.set(v.id, c.vivi);
  return `${esc(base)} <span class="conta${prima != null && prima !== c.vivi ? " cambia" : ""}">×${c.vivi}</span>`;
}
function rigaVoce(v, i, fantasma = null) {
  const ora = i === SC.turno && !fantasma, lt = lato(v.id), crea = creature(v);
  const ms = !dm && crea ? membri(v.id).filter(c => c.ferite !== "sconfitto" || uscenti.has(c.id)) : [];
  const gruppo = !dm && ms.length > 1;
  const stato = !dm && crea && ms.length === 1 ? etichetta(ms[0]) : "";
  /* master, creatura da sola nel suo gruppo: la riga stessa ha CA, PF e si apre col tocco */
  const solo = dm && crea && (contaGruppo(v.id) || {}).tot === 1;
  if (solo) {
    const testa = `<span class="segno" aria-hidden="true"></span><span class="nome">${esc(nomeVoce(v))}</span>${v.nascosto ? `<span class="m-tag">nascosto</span>` : ""}`;
    return `<li class="lato-${lt}${ora ? " ora" : ""}${v.nascosto ? " nascosto" : ""}${fantasma ? " esce-presto" : ""}"${fantasma ? ` style="--d:${ATTESA_USCITA - (Date.now() - fantasma.t)}ms"` : ""}${ora ? ' aria-current="step"' : ""}>
      <span class="q-ini">${v.tot}</span><div class="q-solo">${righeCreature(v.id, SC, { testa, uscenti, ritardo: ritardoUscita })}</div></li>`;
  }
  const membriHtml = dm ? (crea ? righeCreature(v.id, SC, { uscenti, ritardo: ritardoUscita }) : "")
    : gruppo ? `<ul class="q-membri">${ms.map(c => `<li${c.ferite === "sconfitto" ? ` class="esce-presto" style="--d:${ritardoUscita(c.id)}ms"` : ""}><span>${esc(c.nome)}</span>${etichetta(c)}</li>`).join("")}</ul>` : "";
  const pf = dm && !crea ? pfDi(v.id) : null;
  return `<li class="lato-${lt}${ora ? " ora" : ""}${mio(v.id) ? " mio" : ""}${v.nascosto ? " nascosto" : ""}${fantasma ? " esce-presto" : ""}"${fantasma ? ` style="--d:${ATTESA_USCITA - (Date.now() - fantasma.t)}ms"` : ""}${ora ? ' aria-current="step"' : ""}>
      <span class="q-ini">${v.tot}</span>
      <div class="q-riga"><span class="segno" aria-hidden="true"></span><span class="q-nome">${nomeConConta(v)}</span>
        ${dm && v.nascosto ? `<span class="m-tag">nascosto</span>` : ""}${stato}
        ${pf ? `<span class="q-pf"><b>${pf.hp}</b>${pf.temp ? `<em class="pf-piu">+${pf.temp}</em>` : ""}/${pf.max}</span>` : ""}
        ${ora ? `<span class="q-adesso">adesso</span>` : mio(v.id) ? `<span class="q-tu">tu</span>` : ""}
        ${dm && pariConPrecedente(SC.ordine || [], i) && !fantasma ? `<button class="btn link scambia" data-az="scambia" data-i="${i}" aria-label="Metti ${esc(v.nome)} prima">Scambia</button>` : ""}</div>
      ${membriHtml}</li>`;
}
/* la coda: da chi agisce fino in fondo, poi "Round N+1" e chi ha già giocato */
function coda(daDove = SC.turno, senzaPrimo = false) {
  const o = SC.ordine || [], n = o.length; if (!n) return "";
  const giro = [];
  for (let k = 0; k < n; k++) {
    const i = (daDove + k) % n;
    if (k > 0 && i === 0) giro.push(`<li class="giro" role="presentation">Round ${SC.round + 1}</li>`);
    if (k === 0 && senzaPrimo) continue;
    const v = o[i]; if (!visibile(v)) continue;
    for (const [id, f] of fantasmi) if (f.dopo === v.id) giro.push(rigaVoce(f.voce, -1, f));
    giro.push(rigaVoce(v, i));
  }
  for (const [id, f] of fantasmi) if (!f.dopo || !o.some(v => v.id === f.dopo)) giro.push(rigaVoce(f.voce, -1, f));
  return giro.join("");
}
const legenda = () => (SC.campo || []).length || dm ? `<p class="legenda-mini"><span><i class="segno lato-gruppo"></i>gruppo</span><span><i class="segno lato-alleato"></i>alleati</span><span><i class="segno lato-nemico"></i>nemici</span></p>` : "";
/* "Ireena tra 2 turni · Rombosogliola tra 3": quando tocca ai miei, contando solo le righe che vedo */
function quandoTocca() {
  const o = SC.ordine || [], n = o.length, out = [];
  let passi = 0;
  for (let k = 1; k <= n; k++) {
    const v = o[(SC.turno + k) % n]; if (!visibile(v)) continue;
    passi++;
    if (mio(v.id) && !out.some(x => x.id === v.id)) out.push({ id: v.id, nome: v.nome, passi });
  }
  return out.map(x => `<b>${esc(x.nome)}</b> ${x.passi === 1 ? "è il prossimo" : `tra ${x.passi} turni`}`).join(" · ");
}
const SPADE_R = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function vistaTurni() {
  const a = attivo(), mioTurno = !!(a && mio(a.id));
  const M = dm ? htmlTurniMaster(SC) : { rapida: "", rinforzi: "", sconfitti: "" };
  conteOra = new Map();
  const latoA = a ? lato(a.id) : "gruppo";
  const nomeA = a ? (visibile(a) ? nomeConConta(a) : "del master") : "…";
  const miei = (SC.ordine || []).filter(v => mio(v.id));
  let testa;
  if (mioTurno) {
    testa = `<div class="mio-turno"><h2>${esc(a.nome)}, tocca a te</h2>${htmlGiocatore(a)}
      <button class="btn fine-t" data-az="fine"${inVolo ? ` disabled data-perche="Un attimo: sto passando il turno"` : ""}>Fine turno</button></div>`;
  } else if (dm) {
    /* un branco gioca un membro alla volta: "Avanti: Lupo 2", e solo l'ultimo chiude il turno del branco */
    const br = M.branco;
    testa = `<div class="ora-testa lato-${latoA}"><h2><span class="segno" aria-hidden="true"></span>Turno di ${br ? `${esc(br.membro.nome)} <span class="conta">${br.n} di ${br.tot}</span>` : nomeA}</h2>${M.rapida}
      <div class="riga-az${br && !br.ultimo ? " branco-az" : ""}">${br && !br.ultimo
        ? `<button class="btn up" data-nz="branco-avanti">Avanti: ${esc(br.prossimo)}</button><button class="btn link" data-az="fine"${inVolo ? ` disabled data-perche="Un attimo: sto passando il turno"` : ""}>Fine turno del branco</button>`
        : `<button class="btn up" data-az="fine"${inVolo ? ` disabled data-perche="Un attimo: sto passando il turno"` : ""}>${br ? "Fine turno del branco" : `Fine turno${a ? ` di ${nomeConConta(a, true)}` : ""}`}</button>`}</div></div>`;
  } else {
    const quando = quandoTocca();
    testa = `<div class="ora-testa lato-${a && visibile(a) ? latoA : "nemico"}"><h2><span class="segno" aria-hidden="true"></span>${a && !visibile(a) ? "Turno del master" : `Turno di ${nomeA}`}</h2>
      ${quando ? `<p>${quando}</p>` : ""}
      ${miei.length ? `<div class="riga-az"><button class="btn reazione-btn" data-az="reazione"><span class="rz-testo"><b>Reazione</b><small>attacco di opportunità e altro</small></span>${icona("giu", "rz-freccia")}</button></div>` : ""}</div>`;
  }
  /* quando tocca a me il mio riquadro sta in cima: la coda parte da chi viene dopo */
  const lista = mioTurno ? coda(SC.turno, true) : coda();
  conteViste = conteOra;
  return `${dm ? htmlMaster() : ""}${testa}
    <div class="coda-blocco">${mioTurno ? `<h3>Dopo di te</h3>` : ""}<ol class="coda">${lista}</ol>${legenda()}</div>
    ${dm ? `<div class="in-fondo">${M.sconfitti}${M.rinforzi}
      <div class="chiudi-m"><button class="btn rosso" data-az="chiudi">Chiudi lo scontro</button><button class="btn" data-az="indietro"${SC.round <= 1 && SC.turno === 0 ? ` disabled data-perche="È il primo turno: prima non c'è niente"` : ""}>Turno precedente</button></div></div>` : ""}`;
}

/* dall'iniziativa al round 1: chi ha tirato entra nell'ordine dei turni */
async function iniziaRound1() {
  const voci = SC.partecipanti.filter(p => tiroDi(p.id)).map(p => { const t = tiroDi(p.id); return { id: p.id, nome: p.nome, tot: t.tot, des: t.des ?? null, ...(p.nascosto ? { nascosto: true } : {}) }; });
  if (voci.length) await arch.aggiorna(DOC, { stato: "in corso", ordine: ordina(voci), turno: 0, round: 1, ...timbro() });
}
/* lo scontro parte da solo quando tutti hanno tirato: lo fa il telefono del master, dopo un attimo per vedere l'ultimo tiro */
let tPartenza = null;
function partenzaAutomatica() {
  if (!dm || !SC || SC.stato !== "tiri" || tPartenza) return;
  if (!tuttiHannoTirato(SC.partecipanti || [], id => !!tiroDi(id))) return;
  const id = SC.id;
  tPartenza = setTimeout(async () => {
    tPartenza = null;
    if (!SC || SC.id !== id || SC.stato !== "tiri" || !tuttiHannoTirato(SC.partecipanti || [], x => !!tiroDi(x))) return;
    try { await iniziaRound1(); } catch (_) { toast("Lo scontro non è partito: controlla la connessione", 5000); }
  }, 1800);
}

/* ---------- pulsanti della vista ---------- */
$("vistaScontro").addEventListener("change", e => {
  const part = dm && e.target.closest("[data-part]");
  if (part) { part.checked ? fuori.delete(part.dataset.part) : fuori.add(part.dataset.part); disegna(); return; }
  if (dm) inputNemici(e);
});
$("vistaScontro").addEventListener("input", e => {
  if (inputAttacco(e)) return;
  if (dm && inputNemici(e)) return;
  const id = e.target.dataset.tiro; if (!id) return;
  const p = (SC.partecipanti || []).find(x => x.id === id); if (p) mostraSomma($("vistaScontro"), p);
});
$("vistaScontro").addEventListener("click", async e => {
  const at = e.target.closest("[data-at]");
  if (at && !at.disabled) {
    try { await clicAttacco(at, attivo(), campi => arch.aggiorna(DOC, { ...campi, ...timbro() })); }
    catch (_) { toast("Non salvato: controlla la connessione", 4000); }
    return;
  }
  const n = dm && e.target.closest("[data-nz]");
  if (n) {
    try { await clicNemici(n, SC, campi => arch.aggiorna(DOC, { ...campi, ...timbro() })); }
    catch (_) { toast("Non salvato: controlla la connessione", 4000); }
    return;
  }
  const b = e.target.closest("[data-az]"); if (!b || b.disabled) return;
  const az = b.dataset.az;
  try {
    if (az === "prep-1" || az === "prep-2") { passoPrep = az === "prep-2" && nelGruppo().length ? 2 : 1; window.scrollTo({ top: 0 }); disegna(); return; }
    if (az === "chiedi") {
      const scelti = nelGruppo().map(p => p.id), st = statoPreparazione(), v = puoIniziare({ gruppo: scelti.length, scelte: st.scelte, modelli: st.modelli });
      if (!v.ok) { toast(v.perche, 5000); return; }
      const id = String(Date.now());
      const nem = await schieraScelte(id);
      const partecipanti = [...catalogo().filter(p => scelti.includes(p.id)), ...nem.partecipanti];
      if (!partecipanti.length) { toast("Scegli almeno un partecipante"); return; }
      await arch.scrivi(DOC, { stato: "tiri", id, partecipanti, campo: nem.campo, ordine: [], turno: 0, round: 1, ...timbro() });
      passoPrep = 1;
      tiraPng(id, partecipanti);
    } else if (az === "reazione") {
      apriReazione((SC.ordine || []).filter(v => mio(v.id)).map(v => ({ id: v.id, nome: v.nome })));
    } else if (az === "tira") {
      rimandato = null; apriTiro();
    } else if (az === "mtira") {
      const p = SC.partecipanti.find(x => x.id === b.dataset.id); if (p) apriTiro(p);
    } else if (az === "segna") {
      const p = SC.partecipanti.find(x => x.id === b.dataset.id);
      const r = leggiCampi(b.closest("li"), p);
      if (!r) { toast(p.tipo === "manuale" ? "Scrivi il totale" : "Scrivi il d20 (da 1 a 20)"); return; }
      await salvaTiro(p, r);
    } else if (az === "inizia") {
      await iniziaRound1();
    } else if (az === "fine" || az === "indietro") {
      inVolo = true; disegna();
      const n = (SC.ordine || []).length;
      const dopo = az === "fine" ? avanza(SC, n) : indietro(SC, n);
      await arch.aggiorna(DOC, { ...dopo, ...timbro() });
      if (az === "indietro") toast(`Di nuovo il turno di ${(SC.ordine[dopo.turno] || {}).nome || "…"} (round ${dopo.round})`);
    } else if (az === "scambia") {
      const i = +b.dataset.i, o = SC.ordine.slice();
      [o[i - 1], o[i]] = [o[i], o[i - 1]];
      await arch.aggiorna(DOC, { ordine: o, ...timbro() });
    } else if (az === "chiudi") {
      /* "fine" serve a tutti per il pannello di fine: round, nemici sconfitti, danni di ciascuno */
      await chiudiScontro(false);
      toast("Scontro chiuso");
    }
  } catch (err) {
    toast(err && err.solaLettura ? "Non è il tuo turno" : "Non salvato: controlla la connessione", 4000);
  } finally {
    if (inVolo) { inVolo = false; disegna(); }
  }
});
