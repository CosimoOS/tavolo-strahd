/* Lo scontro: iniziativa e turni, condivisi in tempo reale fra tutti i telefoni.

   Nell'archivio:
     scontro/attuale            → { stato, id, partecipanti, ordine, turno, round }   (lo scrive il master;
                                  un giocatore può solo far avanzare il turno quando tocca a lui)
     scontro/attuale/tiri/<id>  → il tiro di un personaggio (lo scrive il suo giocatore o il master)

   stato: "chiuso" → nessuno scontro · "tiri" → si tira l'iniziativa · "in corso" → si gioca a turni.
   Ogni scontro ha un id nuovo: i tiri rimasti da uno scontro vecchio non contano più. */
import { PERSONAGGI, PROFILI } from "./personaggi/index.js";
import { CONFIG } from "./config.js";
import { opzioni } from "./campagna.js";
import { avviaNemici, fermaNemici, htmlPreparazione, pannelloAperto, schieraScelte, infoGruppo, htmlTurniMaster, clic as clicNemici, input as inputNemici } from "./nemici.js";
import { avviaAttacchi, fermaAttacchi, aggiornaScontro, htmlGiocatore, htmlMaster, clic as clicAttacco, input as inputAttacco } from "./attacco.js";
import { sistemaEvocati } from "./regole/nemici.js";
import { totaleIniziativa, ordina, pariConPrecedente, avanza, indietro } from "./regole/combattimento.js";

const DOC = "scontro/attuale", TIRI = "scontro/attuale/tiri";
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, dm = false, miei = [], info = () => null, toast = () => {};
let ascolti = [], SC = null, TIRATI = {}, vista = false, rimandato = null, ultimoAvviso = "", inVolo = false;
let inizioTurno = () => [];
let chiSono = "", inviando = false, prec = null, congedo = null, visti = new Set();
const secondi = ms => (ms / 1000).toFixed(1).replace(".", ",") + " s";

/* ---------- avvio e arresto (li chiama app.js) ---------- */
export function avviaScontro({ archivio, profilo, datiIniziativa, datiAttacco, spendiSlot, inizioTurno: iniziaTurno, bersaglioPg, colpisciPg, avvisa }) {
  inizioTurno = iniziaTurno || (() => []);
  arch = archivio; dm = profilo.id === "dm"; miei = dm ? [] : profilo.personaggi.slice();
  info = datiIniziativa; toast = avvisa; SC = null; TIRATI = {}; rimandato = null; ultimoAvviso = "";
  chiSono = profilo.id; inviando = false; prec = null; clearTimeout(congedo); congedo = null; visti = new Set(); ultimoTimbro = 0;
  ascolti = [
    arch.ascolta(DOC, dati => { SC = dati || { stato: "chiuso" }; aggiornaScontro(SC); if (CONFIG.misura && !dm) misuraMaster(); aggiorna(); },
      () => toast("Scontro non raggiungibile", 5000), { anchePropri: true }),
    arch.ascoltaRaccolta(TIRI, lista => {
      TIRATI = Object.fromEntries(lista.map(t => [t.id, t.dati]));
      if (CONFIG.misura && dm) misuraArrivi(lista);
      aggiorna();
    }),
  ];
  if (dm) avviaNemici({ archivio, aggiorna: () => disegna(true), avvisa });
  avviaAttacchi({ archivio, master: dm, avvisa, aggiorna: () => disegna(true), datiAttacco, spendiSlot, bersaglio: bersaglioPg, colpisci: colpisciPg });
}
export function fermaScontro() {
  ascolti.forEach(stop => stop()); ascolti = [];
  if (dm) fermaNemici();
  fermaAttacchi();
  SC = null; mostraVista(false); $("iniVeil").hidden = true;
}

/** Apre o chiude la vista dello scontro al posto della scheda (la barra dei PF resta). */
export function mostraVista(si) {
  vista = !!si;
  if (!vista) { clearTimeout(congedo); congedo = null; }
  $("vistaScheda").classList.toggle("in-scontro", vista);
  /* al master, nello scontro, la barra con PF/Danno/Cura di una scheda non serve: la nasconde (resta per gli avvisi) */
  document.body.classList.toggle("master-scontro", dm && vista);
  $("vistaScontro").hidden = !vista;
  const b = document.querySelector(".switch [data-scontro]");
  if (b) b.setAttribute("aria-pressed", vista);
  if (vista) { document.querySelectorAll(".switch [data-char]").forEach(x => x.setAttribute("aria-pressed", "false")); window.scrollTo({ top: 0 }); }
  disegna();
}

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

  const b = document.querySelector(".switch [data-scontro]");
  if (b) {
    mostraPulsante(b, dm || SC.stato !== "chiuso");
    b.classList.toggle("avviso", daTirare().length > 0 || !!(attivo() && mio(attivo().id)));
  }
  if (!dm && SC.stato === "chiuso" && vista && !congedo) mostraVista(false);

  /* finestra del tiro: si apre da sola ai giocatori che devono ancora tirare */
  if (inviando) $("iniVeil").hidden = true;
  else if (daTirare().length && rimandato !== SC.id) apriTiro();
  else if (!daTirare().length) $("iniVeil").hidden = true;

  /* inizio dello scontro e "tocca a te" */
  const a = attivo();
  if (a) {
    const chiave = `${SC.id}:${SC.round}:${SC.turno}`;
    if (chiave !== ultimoAvviso) {
      const primo = !ultimoAvviso.startsWith(SC.id + ":");
      ultimoAvviso = chiave;
      if (primo && !vista) mostraVista(true);
      if (mio(a.id)) {
        /* sul telefono di chi gioca: le condizioni con durata scendono di un round */
        const finite = inizioTurno(a.id, chiave);
        toast(`Tocca a te: ${a.nome}${finite.length ? ` · finito: ${finite.join(", ").toLowerCase()}` : ""}`, 6000); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (_) {} }
    }
  }
  disegna();
}
/* Il pulsante "Scontro" compare e sparisce con un piccolo movimento: si restringe e sfuma (vedi .esce in scontro.css). */
function mostraPulsante(b, si) {
  clearTimeout(b._timer);
  if (si) { b.classList.remove("esce"); b.hidden = false; return; }
  if (b.hidden) return;
  const fermo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (fermo) { b.hidden = true; return; }
  b.classList.add("esce");
  b._timer = setTimeout(() => { b.hidden = true; b.classList.remove("esce"); }, 380);
}
/* Fine dello scontro per i giocatori: un riquadro "Scontro concluso" per qualche secondo, poi si torna alla scheda.
   Se il master lo annulla mentre si tirava l'iniziativa basta un avviso. */
function salutaFine() {
  $("iniVeil").hidden = true;
  const f = SC.fine || {};
  if (!f.giocato) { toast("Scontro annullato"); return; }
  const durata = `Durato ${f.round} round`;
  if (!vista) { toast(`Scontro concluso · ${durata.toLowerCase()}`, 5000); return; }
  $("vistaScontro").innerHTML = `<section class="concluso" role="status"><h2>Scontro concluso</h2><p>${durata}</p></section>`;
  clearTimeout(congedo);
  congedo = setTimeout(() => { congedo = null; if (SC && SC.stato === "chiuso") mostraVista(false); }, 2800);
}

/* i miei personaggi in gara che non hanno ancora tirato (per il master: nessuno, tira dalla sua vista) */
function daTirare() {
  if (!SC || SC.stato !== "tiri" || dm) return [];
  return (SC.partecipanti || []).filter(p => mio(p.id) && !tiroDi(p.id));
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
function apriTiro() {
  const v = $("iniVeil"), lista = daTirare();
  const gia = v.hidden ? null : [...v.querySelectorAll("[data-tiro]")].map(i => [i.dataset.tiro + i.dataset.i, i.value]);
  $("iniCampi").innerHTML = lista.map(p => `<div class="riga-tiro" data-p="${p.id}"><b>${esc(p.nome)}</b><div class="dadi">${campi(p, "veil")}</div></div>`).join("");
  if (gia) gia.forEach(([k, val]) => { const i = $("iniCampi").querySelector(`[data-tiro="${k.slice(0, -1)}"][data-i="${k.slice(-1)}"]`); if (i) i.value = val; });
  lista.forEach(p => mostraSomma($("iniCampi"), p));
  $("iniMsg").textContent = "";
  const apri = v.hidden; v.hidden = false;
  if (apri) { const f = $("iniCampi").querySelector("[data-primo]"); if (f) f.focus(); }
}
$("iniCampi").addEventListener("input", e => {
  const id = e.target.dataset.tiro; if (!id) return;
  const p = (SC.partecipanti || []).find(x => x.id === id); if (p) mostraSomma($("iniCampi"), p);
});
/* Conferma: prima si controlla che ci siano tutti i dadi, poi i tiri partono INSIEME
   e la finestra si chiude subito, senza aspettare la risposta di Google. Se l'invio fallisce, riappare. */
$("iniOk").onclick = async () => {
  const lista = daTirare();
  if (!lista.length) { $("iniVeil").hidden = true; return; }
  const tiri = lista.map(p => [p, leggiCampi($("iniCampi"), p)]);
  const mancano = tiri.filter(([, r]) => !r).map(([p]) => p.nome);
  if (mancano.length) { $("iniMsg").textContent = `Manca il dado di ${mancano.join(" e ")} (un numero da 1 a 20)`; return; }
  inviando = true; $("iniVeil").hidden = true;
  const t0 = Date.now();
  try {
    await Promise.all(tiri.map(([p, r]) => salvaTiro(p, r)));
    toast(CONFIG.misura ? `Salvato in ${secondi(Date.now() - t0)}` : (tiri.length > 1 ? "Iniziative inviate" : "Iniziativa inviata"), CONFIG.misura ? 6000 : undefined);
  } catch (_) {
    inviando = false; apriTiro(); $("iniMsg").textContent = "Tiro non salvato: controlla la connessione e riprova";
    return;
  }
  inviando = false; aggiorna();
};
$("iniDopo").onclick = () => { rimandato = SC && SC.id; $("iniVeil").hidden = true; };

/* ---------- vista dello scontro ---------- */
function disegna(forza) {
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
  if (SC.stato === "chiuso") el.innerHTML = dm ? vistaPreparazione() : `<section><h2>Scontro</h2><p class="vuoto">Nessuno scontro in corso.</p></section>`;
  else if (SC.stato === "tiri") el.innerHTML = vistaTiri();
  else el.innerHTML = vistaTurni();
  campiLiberi.forEach(([sel, v]) => { const x = el.querySelector(sel); if (x) x.value = v; });
  scritti.forEach(([id, i, v]) => { const x = el.querySelector(`[data-tiro="${id}"][data-i="${i}"]`); if (x) x.value = v; });
  tolti.forEach(id => { const x = el.querySelector(`[data-part="${id}"]`); if (x) x.checked = false; });
  (SC.partecipanti || []).forEach(p => el.querySelector(`[data-somma="${p.id}"]`) && mostraSomma(el, p));
  /* chi stava scrivendo in un campo continua a scriverci anche dopo il ridisegno */
  if (foco) { const f = el.querySelector(`[data-foco="${foco}"]`); if (f) { f.focus({ preventScroll: true }); try { const n = f.value.length; f.setSelectionRange(n, n); } catch (_) {} } }
}

function vistaPreparazione() {
  if (pannelloAperto()) return htmlPreparazione();
  return `<section><h2>Nuovo scontro</h2>
    <p class="vuoto">Scegli chi partecipa, poi chiedi l'iniziativa: sui telefoni dei giocatori comparirà la richiesta.</p>
    <ul class="scelta">${catalogo().map(p => `<li><label><input type="checkbox" data-part="${p.id}" checked>
      <span>${esc(p.nome)}</span>${p.tipo === "manuale" ? `<small>senza scheda: scrivi tu il totale</small>` : ""}</label></li>`).join("")}</ul>
    </section>${htmlPreparazione()}
    <details class="regole-tavolo"><summary>Regole del tavolo</summary>
      <label class="spunta"><input type="checkbox" data-az="tasha"${opzioni().tasha ? " checked" : ""}> Privilegi opzionali e talenti del Calderone di Tasha</label>
      <p class="hint">Valgono per tutti: nel passaggio di livello compaiono anche le opzioni di Tasha (stili nuovi, Versatilità marziale, Nemico favorito…).</p>
    </details>
    <div class="azioni"><button class="btn up" data-az="chiedi">Tirate l'iniziativa</button></div>`;
}

function vistaTiri() {
  const parts = SC.partecipanti || [], fatti = parts.filter(p => tiroDi(p.id)).length;
  const righe = parts.map(p => {
    const t = tiroDi(p.id);
    let destra;
    if (t) destra = `<span class="tot">${t.tot}</span><small>${t.tipo === "manuale" ? "a mano" : `d20 ${t.usato} ${sg(t.mod)}`}</small>`;
    else if (dm) destra = `<div class="dadi">${campi(p, "dm")}</div><button class="btn" data-az="segna" data-id="${p.id}">Segna</button>`;
    else if (mio(p.id)) destra = `<button class="btn gold" data-az="tira">Tira</button>`;
    else if (nemico(p)) destra = `<small>tira il master</small>`;
    else destra = `<small>in attesa</small>`;
    return `<li class="${t ? "fatto" : ""}" data-p="${p.id}"><span class="nome">${esc(p.nome)}</span><span class="stato">${destra}</span></li>`;
  }).join("");
  const mancano = parts.filter(p => !tiroDi(p.id)).map(p => p.nome);
  return `<section><h2>Tirate l'iniziativa <small>${fatti} su ${parts.length}</small></h2>
    <ul class="tiri">${righe}</ul>
    ${dm ? `<div class="azioni"><button class="btn link" data-az="chiudi">Annulla lo scontro</button>
      <button class="btn up" data-az="inizia"${fatti ? "" : " disabled"}>Inizia il round 1</button></div>
      ${mancano.length && fatti ? `<p class="hint">Chi non ha tirato (${esc(mancano.join(", "))}) resta fuori dall'ordine.</p>` : ""}`
      : `<p class="hint">Quando avranno tirato tutti, il master avvierà lo scontro.</p>`}</section>`;
}

/* Come stanno le creature del master, per tutti: un'etichetta colorata con la parola
   (o i PF veri, per gli alleati che lo prevedono). Un gruppo mostra una riga per creatura. */
const etichetta = c => `<span class="stato-c" data-s="${c.ferite}">${c.pf != null && c.ferite !== "sconfitto" ? `${c.pf}/${c.max} PF` : c.ferite}${c.subiti && c.ferite !== "sconfitto" && c.pf == null ? ` <b>−${c.subiti}</b>` : ""}</span>`;
function membri(id) { return (SC.campo || []).filter(c => c.gruppo === id); }
function stato(id) {
  const m = membri(id);
  return m.length === 1 ? etichetta(m[0]) : "";
}
function righeMembri(id) {
  const m = membri(id); if (m.length < 2) return "";
  return `<ul class="membri">${m.map(c => `<li class="lato-${c.tipo === "alleato" ? "alleato" : "nemico"}${c.ferite === "sconfitto" ? " giu" : ""}"><span>${esc(c.nome)}</span>${etichetta(c)}</li>`).join("")}</ul>`;
}
/* da che parte sta una voce dei turni: il gruppo dei giocatori, gli alleati del master o i nemici */
function lato(id) {
  const m = membri(id); if (!m.length) return "gruppo";
  const tipi = new Set(m.filter(c => c.ferite !== "sconfitto").map(c => c.tipo === "alleato" ? "alleato" : "nemico"));
  return tipi.size === 1 ? [...tipi][0] : tipi.size ? "misto" : (m[0].tipo === "alleato" ? "alleato" : "nemico");
}
const legenda = () => (SC.campo || []).length ? `<p class="legenda"><span class="l-gruppo">Il gruppo</span><span class="l-alleato">Alleati</span><span class="l-nemico">Nemici</span></p>` : "";
function vistaTurni() {
  const a = attivo(), o = SC.ordine || [];
  const righe = o.map((v, i) => `<li class="lato-${lato(v.id)}${i === SC.turno ? " attivo" : ""}${mio(v.id) ? " mio" : ""}"${i === SC.turno ? ' aria-current="step"' : ""}>
      <span class="pos">${i + 1}</span><span class="nome">${esc(v.nome)}</span>${stato(v.id)}
      ${dm && pariConPrecedente(o, i) ? `<button class="btn link" data-az="scambia" data-i="${i}" aria-label="Metti ${esc(v.nome)} prima">Scambia</button>` : ""}
      <span class="tot">${v.tot}</span>${righeMembri(v.id)}</li>`).join("");
  const puo = dm || (a && mio(a.id));
  const M = dm ? htmlTurniMaster(SC) : { rapida: "", campo: "" };
  return `${dm ? htmlMaster() : ""}<section><h2>Round ${SC.round} <small>${a ? "di turno: " + esc(a.nome) : ""}</small></h2>
    ${a && mio(a.id) ? `<p class="tuo">Tocca a te: ${esc(a.nome)}</p>${htmlGiocatore(a)}` : ""}
    ${legenda()}<ol class="turni">${righe}</ol>
    <div class="azioni">
      ${dm ? `<button class="btn link" data-az="chiudi">Chiudi lo scontro</button><button class="btn" data-az="indietro"${SC.round <= 1 && SC.turno === 0 ? " disabled title=\"Siamo al primo turno\"" : ""}>Turno precedente</button>` : ""}
      ${puo ? `<button class="btn up fine" data-az="fine"${inVolo ? " disabled" : ""}>Fine turno</button>` : ""}
    </div></section>${M.rapida}${M.campo}`;
}

/* ---------- pulsanti della vista ---------- */
$("vistaScontro").addEventListener("change", e => { if (dm) inputNemici(e); });
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
    if (az === "chiedi") {
      const scelti = [...$("vistaScontro").querySelectorAll("[data-part]:checked")].map(i => i.dataset.part);
      const id = String(Date.now());
      const nem = await schieraScelte(id);
      const partecipanti = [...catalogo().filter(p => scelti.includes(p.id)), ...nem.partecipanti];
      if (!partecipanti.length) { toast("Scegli almeno un partecipante"); return; }
      await arch.scrivi(DOC, { stato: "tiri", id, partecipanti, campo: nem.campo, ordine: [], turno: 0, round: 1, ...timbro() });
    } else if (az === "tira") {
      rimandato = null; apriTiro();
    } else if (az === "segna") {
      const p = SC.partecipanti.find(x => x.id === b.dataset.id);
      const r = leggiCampi(b.closest("li"), p);
      if (!r) { toast(p.tipo === "manuale" ? "Scrivi il totale" : "Scrivi il d20 (da 1 a 20)"); return; }
      await salvaTiro(p, r);
    } else if (az === "inizia") {
      const voci = SC.partecipanti.filter(p => tiroDi(p.id)).map(p => { const t = tiroDi(p.id); return { id: p.id, nome: p.nome, tot: t.tot, des: t.des ?? null }; });
      await arch.aggiorna(DOC, { stato: "in corso", ordine: ordina(voci), turno: 0, round: 1, ...timbro() });
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
    } else if (az === "tasha") {
      await arch.scrivi("campagna/impostazioni", { ...opzioni(), tasha: b.checked });
      toast(b.checked ? "Opzioni di Tasha accese" : "Opzioni di Tasha spente");
    } else if (az === "chiudi") {
      /* "fine" serve ai giocatori per il messaggio "Scontro concluso · durato N round" */
      await arch.scrivi(DOC, { stato: "chiuso", fine: { round: SC.round || 1, giocato: SC.stato === "in corso" }, ...timbro() });
      toast("Scontro chiuso");
    }
  } catch (err) {
    toast(err && err.solaLettura ? "Non è il tuo turno" : "Non salvato: controlla la connessione", 4000);
  } finally {
    if (inVolo) { inVolo = false; disegna(); }
  }
});
