/* Nemici e alleati del master: bestiario, scelta per lo scontro, scheda rapida di turno, PF.
   Gira solo sul profilo del master. I numeri veri stanno in dm/ (le regole di Firestore lo chiudono ai giocatori);
   nello scontro, che vedono tutti, finisce solo il nome per i giocatori e una parola sulle ferite.

     dm/bestiario → { creature:[...], gruppi:[...] }   i modelli, importati dal file privato o scritti a mano
     dm/campo     → { scontro, creature:[...], gruppi:[...] }   chi è in campo adesso, con i PF veri          */
import { ferite, danno, cura, schiera, togliDaOrdine, inserisciInOrdine, inserisciDopo, trasforma, leggiTratti, scriviTratti, chiaro, fonteChiara, incantesimi, media } from "./regole/nemici.js";
import { finestra } from "./passi.js";

const BEST = "dm/bestiario", CAMPO = "dm/campo", PNG = "dm/png";
/* dm/png → { <modello>: { pf, slotUsati } }: i compagni del master (alleati come Ezmerelda) e chi lancia incantesimi
   si portano dietro ferite e slot da uno scontro all'altro, finché il master non segna un riposo lungo. */
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, ridisegna = () => {}, toast = () => {}, ascolti = [];
let B = { creature: [], gruppi: [] }, C = { scontro: null, creature: [], gruppi: [] }, R = {};
let scelte = [], pannello = null, cerca = "", aperte = new Set(), daEliminare = null, apriRinforzi = false;
const perId = () => Object.fromEntries(B.creature.map(c => [c.id, c]));

export function avviaNemici({ archivio, aggiorna, avvisa }) {
  arch = archivio; ridisegna = aggiorna; toast = avvisa; scelte = []; pannello = null; aperte = new Set();
  ascolti = [
    arch.ascolta(BEST, d => { B = { creature: [], gruppi: [], ...(d || {}) }; ridisegna(); }, null, { anchePropri: true }),
    arch.ascolta(CAMPO, d => { C = { scontro: null, creature: [], gruppi: [], ...(d || {}) }; ridisegna(); }, null, { anchePropri: true }),
    arch.ascolta(PNG, d => { R = d || {}; }, null, { anchePropri: true }),
  ];
}
export function fermaNemici() { ascolti.forEach(s => s()); ascolti = []; }

/* ---------- preparazione: chi combatte dalla parte del master ---------- */
/** true quando il master sta guardando il bestiario o un modello: la vista dello scontro mostra solo quello. */
export const pannelloAperto = () => !!pannello;

export function htmlPreparazione() {
  if (pannello === "bestiario") return htmlBestiario();
  const P = perId();
  const ordinate = B.creature.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  const righe = scelte.map((s, i) => `<li><span class="nome">${s.quanti > 1 ? s.quanti + " × " : ""}${esc(P[s.creatura]?.nome || s.creatura)}</span>
      ${s.quanti > 1 ? `<button class="btn link" data-nz="modo" data-i="${i}">${s.modo === "branco" ? "in branco" : "uno per uno"}</button>` : ""}
      <button class="btn link${s.nascosto ? " acceso" : ""}" data-nz="nasc" data-i="${i}" aria-pressed="${!!s.nascosto}">${s.nascosto ? "nascosti" : "visibili"}</button>
      <button class="btn link" data-nz="togli" data-i="${i}" aria-label="Togli">Togli</button></li>`).join("");
  return `<section><h2>Nemici e alleati <span class="h2-azioni"><button class="btn link" data-nz="nuovo">Nuovo mostro</button><button class="btn link" data-nz="bestiario">Bestiario</button></span></h2>
    ${!B.creature.length ? `<p class="vuoto">Il bestiario è vuoto: aprilo e importa il file, oppure crea un modello.</p>` : `
    ${B.gruppi.length ? `<p class="lbl-sez">Gruppi pronti</p><div class="gruppi">${B.gruppi.map(g =>
      `<button class="btn" data-nz="gruppo" data-id="${esc(g.id)}">${esc(g.nome)}<small>${g.membri.map(m => `${m.quanti} ${esc(P[m.id]?.nome || m.id)}`).join(", ")}</small></button>`).join("")}</div>` : ""}
    <p class="lbl-sez">Aggiungi una creatura</p>
    <div class="aggiungi">
      <select id="nzCreatura" aria-label="Creatura">${ordinate.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}${c.tipo === "alleato" ? " (alleato)" : ""}</option>`).join("")}</select>
      <input id="nzQuanti" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" max="30" value="1" aria-label="Quanti">
      <select id="nzModo" aria-label="Iniziativa"><option value="branco">in branco</option><option value="uno">uno per uno</option></select>
      <button class="btn gold" data-nz="aggiungi">Aggiungi</button>
    </div>`}
    ${scelte.length ? `<ul class="schierati">${righe}</ul>` : ""}
  </section>`;
}

/** Al momento di "Tirate l'iniziativa": mette in campo le creature scelte. Restituisce le voci per lo scontro. */
/* chi si ricorda ferite e slot tra uno scontro e l'altro: gli alleati e chiunque abbia slot, se è l'unico del suo modello */
const persiste = (c, tutte) => (c.tipo === "alleato" || (perId()[c.creatura] || {}).slot) && tutte.filter(x => x.creatura === c.creatura).length === 1;
const conMemoria = creature => creature.map(c => {
  const m = persiste(c, creature) && R[c.creatura]; if (!m) return c;
  return { ...c, ...(m.slotUsati ? { slotUsati: m.slotUsati } : {}), ...(c.tipo === "alleato" && m.pf != null ? { pf: Math.min(c.max, m.pf) } : {}) };
});
async function ricorda(creature, id) {
  const c = creature.find(x => x.id === id); if (!c || !persiste(c, creature)) return;
  R = { ...R, [c.creatura]: { slotUsati: c.slotUsati || {}, ...(c.tipo === "alleato" ? { pf: c.pf } : {}) } };
  await arch.scrivi(PNG, R);
}
export async function schieraScelte(idScontro) {
  const s0 = schiera(scelte, perId()), gruppi = s0.gruppi, creature = conMemoria(s0.creature);
  await arch.scrivi(CAMPO, { scontro: idScontro, creature, gruppi });
  scelte = [];
  return {
    /* i nascosti: i giocatori non li vedono (nome "???"); il master sì, con il nome vero */
    partecipanti: gruppi.map(g => ({ id: g.id, nome: g.nascosto ? "???" : g.nome, tipo: g.tipo === "alleato" ? "alleato" : "nemico", ...(g.nascosto ? { nascosto: true } : {}) })),
    campo: pubblico(creature, gruppi),
  };
}
/* quello che vedono i giocatori: nome per loro, gruppo, parola sulle ferite (e i PF, per gli alleati che lo prevedono) */
function pubblico(creature, gruppi) {
  const gruppoDi = id => (gruppi.find(g => g.membri.includes(id)) || {}).id;
  return creature.filter(c => !c.nascosto).map(c => ({ id: c.id, gruppo: gruppoDi(c.id), nome: c.giocatori, tipo: c.tipo, ferite: ferite(c.pf, c.max), subiti: Math.max(0, c.max - c.pf),
    ...(c.pfVisibili ? { pf: c.pf, max: c.max } : {}) }));
}

/** Il nome vero di un gruppo del master (per le sue viste, anche quando è nascosto ai giocatori). */
export const nomeGruppo = id => { const g = C.gruppi.find(x => x.id === id); return g ? g.nome : null; };
/** Modificatore d'iniziativa di un gruppo del master (solo lui lo conosce). */
export function infoGruppo(id) {
  const g = C.gruppi.find(x => x.id === id);
  return g ? { mod: g.ini ?? 0, des: null, vantaggio: false } : null;
}

/* ---------- durante i turni: in campo e scheda rapida ---------- */
/** Vista del master durante i turni: sotto l'ordine dei turni la scheda di chi agisce ora, poi tutte le creature in campo con i PF. */
export function htmlTurniMaster(SC) {
  if (!C.creature.length || C.scontro !== SC.id) return { rapida: "", campo: "" };
  const P = perId(), voce = SC.ordine && SC.ordine[SC.turno];
  const g = voce && C.gruppi.find(x => x.id === voce.id);
  let rapida = "";
  if (g) {
    const membri = C.creature.filter(c => g.membri.includes(c.id));
    const modello = P[membri[0]?.creatura];
    rapida = `<section class="rapida"><h2>Di turno: ${esc(membri.length > 1 ? `${modello?.nome || ""} ×${membri.filter(m => m.pf > 0).length}` : membri[0]?.nome)}</h2>
      ${modello ? schedaModello(modello, membri.length === 1 ? membri[0] : null, g.id) : ""}</section>`;
  }
  const ordinate = B.creature.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  const righe = C.creature.map(c => {
    const st = ferite(c.pf, c.max), aperta = aperte.has(c.id), m = P[c.creatura];
    return `<li class="${c.pf <= 0 ? "giu" : ""}${c.tipo === "alleato" ? " alleato" : ""}" data-c="${c.id}">
      ${c.nascosto ? `<div class="nascosto-riga"><span>Nascosto ai giocatori</span><button class="btn gold" data-nz="rivela" data-id="${c.id}">Rivela</button></div>` : ""}
      <div class="riga"><button class="nome-c" data-nz="apri" data-id="${c.id}" aria-expanded="${aperta}">${esc(c.nome)}</button>
        <span class="ca" title="Classe Armatura">CA ${c.ca}</span>
        <span class="pf"><b>${c.pf}</b>/${c.max}</span></div>
      <div class="hpbar" data-state="${c.pf * 2 > c.max ? "" : c.pf * 4 > c.max ? "mid" : "low"}"><i style="width:${Math.round(100 * c.pf / c.max)}%"></i></div>
      <div class="colpo"><span class="parola">${st}</span>
        <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="0" placeholder="0" data-qta="${c.id}" data-foco="q-${c.id}" aria-label="Quantità per ${esc(c.nome)}">
        <button class="btn dmg" data-nz="danno" data-id="${c.id}">Danno</button>
        <button class="btn heal" data-nz="cura" data-id="${c.id}">Cura</button></div>
      ${aperta ? `<div class="dettaglio">
        <div class="cambi">
          <button class="btn" data-nz="lato" data-id="${c.id}">${c.tipo === "alleato" ? "Passa ai nemici" : "Passa agli alleati"}</button>
          ${persiste(c, C.creature) ? `<button class="btn" data-nz="riposo" data-id="${c.id}">Riposo lungo (PF e slot)</button>` : ""}
          <div class="aggiungi"><select data-trasf="${c.id}" aria-label="Nuovo modello per ${esc(c.nome)}">${ordinate.map(x => `<option value="${esc(x.id)}"${x.id === c.creatura ? " selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
            <button class="btn" data-nz="trasforma" data-id="${c.id}">Trasforma</button></div>
        </div>${m ? schedaModello(m, c) : ""}</div>` : ""}</li>`;
  }).join("");
  const rinforzi = `<details class="rinforzi"${apriRinforzi ? " open" : ""}><summary data-nz="rinf-apri">Arrivano rinforzi</summary>
    <div class="aggiungi">
      <select id="nzRCreatura" aria-label="Creatura">${ordinate.map(x => `<option value="${esc(x.id)}">${esc(x.nome)}${x.tipo === "alleato" ? " (alleato)" : ""}</option>`).join("")}</select>
      <input id="nzRQuanti" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" max="30" value="1" aria-label="Quanti">
      <select id="nzRModo" aria-label="Iniziativa"><option value="branco">in branco</option><option value="uno">uno per uno</option></select>
    </div>
    <label class="spunta"><input type="checkbox" id="nzRNasc"> Nascosti ai giocatori (li riveli quando si fanno vedere)</label>
    <div class="aggiungi"><select id="nzREvoca" aria-label="Chi li evoca"><option value="">Arrivano da soli: contano la loro iniziativa</option>
      ${(SC.ordine || []).filter(v => C.gruppi.some(g => g.id === v.id)).map(v => `<option value="${v.id}"${SC.ordine[SC.turno] && SC.ordine[SC.turno].id === v.id ? " selected" : ""}>Evocati da ${esc(C.gruppi.find(g => g.id === v.id).nome)}</option>`).join("")}</select></div>
    <div class="aggiungi"><label class="dado"><span class="lbl">d20 iniziativa</span><input id="nzRD20" data-foco="rd20" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="1" max="20" aria-label="d20 d'iniziativa dei rinforzi"></label>
      <button class="btn gold" data-nz="rinforzi">Entrano in campo</button></div>
    <button class="btn link" data-nz="nuovo">Non c'è nel bestiario? Crea un mostro nuovo</button>
    <p class="hint">Un d20 per tutti quelli che entrano. Se sono evocati, in questo round giocano subito dopo chi li ha evocati; dal round dopo prendono il posto della loro iniziativa.</p>
  </details>`;
  return { rapida, campo: `<section><h2>In campo</h2>${rinforzi}<ul class="campo">${righe}</ul></section>` };
}

/* La scheda di un modello, per il master:
   cifre principali → "cosa fa" → azioni (ognuna con per colpire, danni e media ben separati) → incantesimi con gli slot
   → reazioni, leggendarie, tana → tratti. Le abbreviazioni dei manuali sono sciolte.
   c è la creatura in campo (se è una sola): serve per segnare gli slot usati. */
function schedaModello(m, c, gruppo) {
  const T = x => esc(chiaro(x));
  const azione = (a, i, lista) => `<li class="az">
      <div class="az-testa"><b>${esc(a.nome)}</b>${a.portata ? `<span class="portata">${esc(a.portata)}</span>` : ""}
        ${gruppo && a.colpire != null && lista === m.azioni ? `<button class="btn gold attacca-pg" data-at="m-nuovo" data-g="${gruppo}" data-i="${i}">Attacca</button>` : ""}</div>
      ${a.colpire != null || a.danni ? `<div class="az-numeri">
        ${a.colpire != null ? `<span class="num"><small>Per colpire</small><b class="oro">${sg(a.colpire)}</b></span>` : ""}
        ${a.medio != null ? `<span class="num"><small>Danno medio</small><b>${a.medio}</b></span>` : ""}
        ${a.danni ? `<span class="num danni"><small>Danni</small><b>${esc(a.danni)}</b></span>` : ""}</div>` : ""}
      ${a.nota ? `<p class="nota">${T(a.nota)}</p>` : ""}</li>`;
  const blocco = (titolo, voci) => voci && voci.length ? `<h3 class="sez-m">${titolo}</h3><ul class="azioni-m">${voci.map((a, i) => azione(a, i, voci)).join("")}</ul>` : "";
  const testi = (titolo, voci) => voci && voci.length ? `<h3 class="sez-m">${titolo}</h3><ul class="tratti">${voci.map(t =>
    `<li><b>${esc(t.nome)}</b><span>${T(t.testo || t.nota || "")}</span></li>`).join("")}</ul>` : "";
  /* incantesimi: il tratto che li elenca diventa una tabellina per livello, con le losanghe degli slot */
  const trInc = (m.tratti || []).find(t => /incantesimi/i.test(t.nome) && /Trucchetti|\d°/.test(t.testo));
  let inc = "";
  if (trInc) {
    const { intro, livelli } = incantesimi(trInc.testo), usati = (c && c.slotUsati) || {};
    inc = `<h3 class="sez-m">${esc(trInc.nome)}</h3>${intro ? `<p class="testo">${T(intro)}</p>` : ""}
      <ul class="inc">${livelli.map(l => {
        const n = (m.slot || {})[l.livello] || 0, u = usati[l.livello] || 0;
        const pips = n ? `<span class="pips">${Array.from({ length: n }, (_, i) =>
          c ? `<button class="pip${i < u ? " on" : ""}" data-nz="slot" data-id="${c.id}" data-l="${l.livello}" data-i="${i}" aria-label="Slot di ${l.livello}° livello ${i + 1}${i < u ? ", usato" : ""}"></button>`
            : `<span class="pip"></span>`).join("")}</span>` : "";
        return `<li><span class="liv">${l.livello ? `${l.livello}° livello` : "Trucchetti"}</span>${pips}<span class="elenco">${esc(l.elenco)}</span></li>`;
      }).join("")}</ul>`;
  }
  const altri = (m.tratti || []).filter(t => t !== trInc);
  const cifra = (v, l, cls = "") => v != null && v !== "" ? `<div class="stat${cls}"><b>${esc(String(v))}</b><span>${l}</span></div>` : "";
  return `<div class="modello">
    <div class="cifre">${cifra(m.ca, "CA", " ca")}${cifra(m.pf, "PF")}${cifra(sg(m.ini ?? 0), "Iniziativa")}${cifra(m.gs, "Sfida")}</div>
    ${m.vel || m.dadiPf ? `<p class="dati">${m.vel ? `Velocità ${esc(m.vel)}` : ""}${m.vel && m.dadiPf ? " · " : ""}${m.dadiPf ? `Dadi vita ${esc(m.dadiPf)}` : ""}</p>` : ""}
    ${m.tattica ? `<div class="tattica"><b>Cosa fa</b><p>${T(m.tattica)}</p></div>` : ""}
    ${blocco("Azioni", m.azioni)}${blocco("Azioni bonus", m.azioniBonus)}
    ${inc}
    ${testi("Reazioni", m.reazioni)}
    ${m.leggendarie ? testi(`Azioni leggendarie · ${m.leggendarie.quante} per round, alla fine del turno di un altro`, m.leggendarie.azioni) : ""}
    ${m.tana ? `<h3 class="sez-m">Azioni di tana</h3><p class="testo">${T(m.tana)}</p>` : ""}
    ${altri.length ? `<details class="tratti-tutti"><summary>Tratti e capacità <small>${altri.length}</small></summary>${testi("", altri).replace('<h3 class="sez-m"></h3>', "")}</details>` : ""}
    ${m.fonte ? `<p class="fonte">Dal manuale: ${esc(fonteChiara(m.fonte))}</p>` : ""}</div>`;
}

/** Danno o cura a una creatura in campo. Aggiorna i PF veri (dm/campo) e la parola per i giocatori (scontro).
    Se un gruppo resta senza nessuno in piedi, esce dall'ordine dei turni. Restituisce i campi da scrivere nello scontro. */
async function colpisci(id, n, comeCura, SC) {
  const creature = C.creature.map(c => c.id !== id ? c : { ...c, pf: comeCura ? cura(c.pf, c.max, n) : danno(c.pf, n) });
  await arch.aggiorna(CAMPO, { creature });
  await ricorda(creature, id);
  const c = creature.find(x => x.id === id);
  const campi = { campo: pubblico(creature, C.gruppi) };
  const g = C.gruppi.find(x => x.membri.includes(id));
  if (!comeCura && c.pf <= 0) {
    toast(`${c.nome}: sconfitto`);
    if (g && SC.stato === "in corso" && creature.filter(x => g.membri.includes(x.id)).every(x => x.pf <= 0) && SC.ordine.some(v => v.id === g.id))
      Object.assign(campi, togliDaOrdine(SC, g.id));
  }
  return campi;
}

/* ---------- per l'attacco dal telefono dei giocatori (attacco.js) ---------- */
/** La creatura in campo e il suo modello: CA vera, nome vero, difese da ricordare al master. */
export function creaturaInCampo(id) {
  const c = C.creature.find(x => x.id === id); if (!c) return null;
  const m = perId()[c.creatura] || {};
  const difese = (m.tratti || []).filter(t => /immun|resist|vulnerab|difese/i.test(t.nome + " " + t.testo)).map(t => chiaro(t.testo));
  return { ...c, difese };
}
/** Danni a più creature insieme (un incantesimo ad area): un solo salvataggio, così nessun danno va perso. */
export async function ferisciMolti(lista, SC) {
  let creature = C.creature.map(c => { const x = lista.find(l => l.id === c.id); return x ? { ...c, pf: danno(c.pf, x.n) } : c; });
  await arch.aggiorna(CAMPO, { creature });
  for (const { id } of lista) await ricorda(creature, id);
  let st = { ordine: SC.ordine || [], turno: SC.turno, round: SC.round }, cambiato = false;
  for (const g of C.gruppi) {
    if (st.ordine.some(v => v.id === g.id) && creature.filter(x => g.membri.includes(x.id)).every(x => x.pf <= 0)) { st = togliDaOrdine(st, g.id); cambiato = true; }
  }
  lista.forEach(({ id }) => { const c = creature.find(x => x.id === id); if (c && c.pf <= 0) toast(`${c.nome}: sconfitto`); });
  return { campo: pubblico(creature, C.gruppi), ...(cambiato ? st : {}) };
}
/** Un attacco del bestiario usato dal master: chi attacca (nome vero) e l'azione scelta. */
export function azioneDi(gruppoId, i) {
  const g = C.gruppi.find(x => x.id === gruppoId); if (!g) return null;
  const membri = C.creature.filter(c => g.membri.includes(c.id) && c.pf > 0), m = perId()[(membri[0] || {}).creatura];
  if (!m || !m.azioni || !m.azioni[i]) return null;
  return { chi: membri.length > 1 ? m.nome : membri[0].nome, azione: m.azioni[i] };
}
/** Le creature del master che un attaccante può colpire: un alleato colpisce i nemici, un nemico gli alleati del master. */
export function bersagliCreature(gruppoId) {
  const g = C.gruppi.find(x => x.id === gruppoId); if (!g) return [];
  const att = C.creature.find(c => g.membri.includes(c.id)), lato = att && att.tipo === "alleato" ? "alleato" : "nemico";
  return C.creature.filter(c => c.pf > 0 && !g.membri.includes(c.id) && (c.tipo === "alleato" ? "alleato" : "nemico") !== lato)
    .map(c => ({ id: c.id, nome: c.nome, ca: c.ca, hp: c.pf, maxhp: c.max, res: [], creatura: true }));
}
export const latoGruppo = gruppoId => {
  const g = C.gruppi.find(x => x.id === gruppoId), c = g && C.creature.find(x => g.membri.includes(x.id));
  return c && c.tipo === "alleato" ? "alleato" : "nemico";
};
/** Danno deciso dal master su una richiesta d'attacco: stessi effetti del pulsante Danno. */
export const ferisci = (id, n, SC) => colpisci(id, n, false, SC);

/* ---------- bestiario ---------- */
function htmlBestiario() {
  const q = cerca.trim().toLowerCase();
  const lista = B.creature.filter(c => !q || c.nome.toLowerCase().includes(q) || (c.giocatori || "").toLowerCase().includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return `<section><h2>Bestiario <small>${B.creature.length} modelli</small></h2>
    <div class="aggiungi">
      <input id="nzCerca" type="search" placeholder="Cerca" value="${esc(cerca)}" aria-label="Cerca nel bestiario">
      <button class="btn gold" data-nz="nuovo">Nuovo modello</button>
      <label class="btn">Importa dal file<input id="nzFile" type="file" accept=".json,application/json" hidden></label>
    </div>
    <ul class="bestiario">${lista.map(c => `<li><button data-nz="modifica" data-id="${esc(c.id)}"><span class="nome">${esc(c.nome)}</span>
      <small>${c.tipo === "alleato" ? "alleato · " : ""}CA ${c.ca} · PF ${c.pf} · ${(c.azioni || []).filter(a => a.colpire != null).map(a => esc(a.nome)).join(", ")}</small></button></li>`).join("")}</ul>
    <div class="azioni"><button class="btn up" data-nz="chiudi">Fatto</button></div></section>`;
}

const slug = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "modello";
/* ---------- editor di un mostro, in una finestra (si apre anche a scontro iniziato) ---------- */
let ED = null;
function apriEditor(id) {
  const c = B.creature.find(x => x.id === id);
  ED = { id: id || "", elimina: false, bozza: structuredClone(c || { nome: "", giocatori: "", tipo: "nemico", ca: 12, pf: 10, ini: 0, vel: "9 m",
    azioni: [{ nome: "", colpire: 3, danni: "" }], tratti: [], tattica: "" }) };
  ED.f = finestra({ chiave: "editor", titolo: id ? "Modifica mostro" : "Nuovo mostro", onClick: clicEditor, onChiudi: () => { ED = null; ridisegna(); } });
  disegnaEditor();
}
function disegnaEditor(nuovo = true) {
  const c = ED.bozza, num = 'type="text" inputmode="numeric" pattern="-?[0-9]*" autocomplete="off"';
  const campo = (k, lbl, v, extra = "", ph = "") => `<label class="campo-m"><span class="lbl">${lbl}</span><input data-ed="${k}" value="${esc(v ?? "")}" ${extra} placeholder="${esc(ph)}"></label>`;
  ED.f.mostra(`<div class="modulo">
      ${campo("nome", "Nome (lo vedi solo tu)", c.nome, "", "es. Capo dei lupi")}
      ${campo("giocatori", "Nome per i giocatori", c.giocatori, "", "es. Lupo enorme")}
      <div class="tre">${campo("ca", "CA", c.ca, num)}${campo("pf", "PF", c.pf, num)}${campo("ini", "Iniziativa", c.ini ?? 0, num)}</div>
      ${campo("vel", "Velocità", c.vel, "", "9 m")}
      <div class="campo-m"><span class="lbl">Da che parte sta</span><div class="seg"><button data-ed-tipo="nemico" aria-pressed="${c.tipo !== "alleato"}">Nemico</button><button data-ed-tipo="alleato" aria-pressed="${c.tipo === "alleato"}">Alleato del master</button></div></div>
      ${c.tipo === "alleato" ? `<label class="spunta"><input type="checkbox" data-ed="pfVisibili"${c.pfVisibili ? " checked" : ""}> I giocatori vedono i suoi PF veri</label>` : ""}
      <p class="lbl-sez">Attacchi</p>
      <div class="ed-attacchi">${(c.azioni || []).map((a, i) => `<div class="ed-att">
        ${campo(`a${i}-nome`, "Nome", a.nome, "", "es. Morso")}
        <div class="due">${campo(`a${i}-colpire`, "Per colpire", a.colpire ?? "", num, "+4")}${campo(`a${i}-danni`, "Danni", a.danni || "", "", "2d4+2 perforanti")}</div>
        ${campo(`a${i}-nota`, "Nota (facoltativa)", a.nota || "", "", "es. il bersaglio cade prono")}
        <button class="btn link" data-ed-togli="${i}">Togli questo attacco</button></div>`).join("")}</div>
      <button class="btn" data-ed-aggiungi>+ Aggiungi un attacco</button>
      <label class="campo-m"><span class="lbl">Cosa fa in combattimento</span><textarea data-ed="tattica" rows="3" placeholder="es. Attacca chi è isolato, fugge se perde metà dei PF">${esc(c.tattica || "")}</textarea></label>
      <label class="campo-m"><span class="lbl">Tratti e difese (uno per riga, "Nome: testo")</span><textarea data-ed="tratti" rows="3" placeholder="Difese: resiste al fuoco">${esc(scriviTratti(c.tratti))}</textarea></label>
    </div>
    <div class="fondo">
      ${ED.id ? `<button class="btn${ED.elimina ? " rosso" : ""}" data-ed-elimina>${ED.elimina ? "Tocca di nuovo per eliminare" : "Elimina"}</button><button class="btn" data-ed-duplica>Duplica</button>` : ""}
      <button class="btn up" data-ed-salva>Salva</button></div>`, { nuovoPasso: nuovo });
}
/* legge i campi della finestra nella bozza (prima di ridisegnare o salvare, così non si perde niente) */
function leggiEditor() {
  const radice = document.querySelector("#passi .passi-corpo"), v = k => { const x = radice.querySelector(`[data-ed="${k}"]`); return x ? (x.type === "checkbox" ? x.checked : x.value.trim()) : undefined; };
  const n = (k, d) => { const x = parseInt(v(k), 10); return Number.isInteger(x) ? x : d; }, c = ED.bozza;
  c.nome = v("nome"); c.giocatori = v("giocatori"); c.ca = n("ca", 10); c.pf = Math.max(1, n("pf", 1)); c.ini = n("ini", 0); c.vel = v("vel");
  if (v("pfVisibili") !== undefined) c.pfVisibili = v("pfVisibili");
  c.tattica = v("tattica"); c.tratti = leggiTratti(v("tratti"));
  c.azioni = (c.azioni || []).map((a, i) => {
    const colpire = parseInt(v(`a${i}-colpire`), 10), danni = v(`a${i}-danni`) || "";
    const x = { nome: v(`a${i}-nome`) || "", ...(Number.isInteger(colpire) ? { colpire, danni } : {}), ...(v(`a${i}-nota`) ? { nota: v(`a${i}-nota`) } : {}) };
    const m = media(danni); if (Number.isInteger(colpire) && m != null) x.medio = m;
    return x;
  });
}
async function clicEditor(e) {
  const b = e.target.closest("button"); if (!b || !ED) return;
  if (!b.hasAttribute("data-ed-elimina")) ED.elimina = false;
  if (b.dataset.edTipo) { leggiEditor(); ED.bozza.tipo = b.dataset.edTipo; return disegnaEditor(false); }
  if (b.hasAttribute("data-ed-aggiungi")) { leggiEditor(); ED.bozza.azioni = [...(ED.bozza.azioni || []), { nome: "", colpire: 3, danni: "" }]; return disegnaEditor(false); }
  if (b.dataset.edTogli != null) { leggiEditor(); ED.bozza.azioni = ED.bozza.azioni.filter((_, i) => i !== +b.dataset.edTogli); return disegnaEditor(false); }
  if (b.hasAttribute("data-ed-elimina")) {
    if (!ED.elimina) { ED.elimina = true; return disegnaEditor(false); }
    await salvaBestiario(B.creature.filter(x => x.id !== ED.id), B.gruppi.filter(g => !g.membri.some(m => m.id === ED.id)));
    toast("Mostro eliminato"); return ED.f.chiudi();
  }
  if (b.hasAttribute("data-ed-duplica")) {
    leggiEditor(); let id = ED.id + "-copia", k = 2; while (B.creature.some(x => x.id === id)) id = `${ED.id}-copia-${k++}`;
    await salvaBestiario([...B.creature, { ...structuredClone(ED.bozza), id, nome: ED.bozza.nome + " (copia)" }]);
    toast("Copia creata"); ED.f.chiudi(true); return apriEditor(id);
  }
  if (b.hasAttribute("data-ed-salva")) {
    leggiEditor(); const c = ED.bozza;
    if (!c.nome) { toast("Serve almeno il nome"); return; }
    c.azioni = c.azioni.filter(a => a.nome);
    if (!c.giocatori) c.giocatori = c.nome;
    if (!ED.id) { let id = slug(c.nome), k = 2; while (B.creature.some(x => x.id === id)) id = `${slug(c.nome)}-${k++}`; c.id = id; }
    await salvaBestiario(ED.id ? B.creature.map(x => x.id === c.id ? c : x) : [...B.creature, c]);
    toast(ED.id ? "Mostro salvato" : `${c.nome}: aggiunto al bestiario`); ED.f.chiudi();
  }
}
async function salvaBestiario(creature, gruppi = B.gruppi) { await arch.scrivi(BEST, { versione: 1, creature, gruppi }); }

/* il file privato (privato/bestiario.json): i modelli con lo stesso nome tecnico vengono sostituiti, gli altri restano */
async function importa(file) {
  let dati;
  try { dati = JSON.parse(await file.text()); } catch (_) { toast("Il file non è leggibile", 5000); return; }
  if (!dati || !Array.isArray(dati.creature)) { toast("Questo file non è un bestiario", 5000); return; }
  const nuove = new Map(B.creature.map(c => [c.id, c])), gruppi = new Map(B.gruppi.map(g => [g.id, g]));
  dati.creature.forEach(c => c && c.id && c.nome && nuove.set(c.id, c));
  (dati.gruppi || []).forEach(g => g && g.id && gruppi.set(g.id, g));
  await salvaBestiario([...nuove.values()], [...gruppi.values()]);
  toast(`Importati ${dati.creature.length} modelli e ${(dati.gruppi || []).length} gruppi`, 5000);
}

/* ---------- pulsanti ---------- */
/** Gestisce i pulsanti con data-nz. Restituisce true se il clic era suo; se serve aggiornare lo scontro chiama scrivi(campi). */
export async function clic(b, SC, scrivi) {
  const az = b.dataset.nz; if (!az) return false;
  const vista = $("vistaScontro");
  switch (az) {
    case "gruppo": {
      const g = B.gruppi.find(x => x.id === b.dataset.id); if (!g) break;
      g.membri.forEach(m => scelte.push({ creatura: m.id, quanti: m.quanti, modo: g.iniziativa === "uno" ? "uno" : "branco" }));
      break;
    }
    case "aggiungi": {
      const q = Math.min(30, Math.max(1, parseInt($("nzQuanti").value, 10) || 1));
      scelte.push({ creatura: $("nzCreatura").value, quanti: q, modo: $("nzModo").value });
      break;
    }
    case "togli": scelte.splice(+b.dataset.i, 1); break;
    case "modo": { const s = scelte[+b.dataset.i]; s.modo = s.modo === "branco" ? "uno" : "branco"; break; }
    case "nasc": { const s = scelte[+b.dataset.i]; s.nascosto = !s.nascosto; break; }
    case "rivela": {
      /* il gruppo intero si fa vedere: nome vero nell'ordine dei turni e stato visibile ai giocatori */
      const g = C.gruppi.find(x => x.membri.includes(b.dataset.id)); if (!g) break;
      const creature = C.creature.map(c => g.membri.includes(c.id) ? { ...c, nascosto: false } : c);
      const gruppi = C.gruppi.map(x => x.id === g.id ? { ...x, nascosto: false } : x);
      await arch.aggiorna(CAMPO, { creature, gruppi });
      const via = v => v.id === g.id ? { ...v, nome: g.nome, nascosto: false } : v;
      await scrivi({ campo: pubblico(creature, gruppi), ordine: (SC.ordine || []).map(via), partecipanti: (SC.partecipanti || []).map(via) });
      toast(`${g.nome}: ora i giocatori lo vedono`);
      break;
    }
    case "bestiario": pannello = "bestiario"; window.scrollTo({ top: 0 }); break;
    case "chiudi": pannello = null; break;
    case "nuovo": apriEditor(""); return true;
    case "modifica": apriEditor(b.dataset.id); return true;
    case "slot": {
      /* tocco su una losanga: piena = slot usato. Toccare l'ultima piena la libera, una vuota la riempie fin lì */
      const id = b.dataset.id, l = b.dataset.l, i = +b.dataset.i;
      const creature = C.creature.map(c => {
        if (c.id !== id) return c;
        const u = (c.slotUsati || {})[l] || 0;
        return { ...c, slotUsati: { ...(c.slotUsati || {}), [l]: i < u ? i : i + 1 } };
      });
      await arch.aggiorna(CAMPO, { creature });
      await ricorda(creature, id);
      break;
    }
    case "riposo": {
      /* riposo lungo di un compagno del master: PF pieni e slot liberi, anche per gli scontri futuri */
      const creature = C.creature.map(c => c.id !== b.dataset.id ? c : { ...c, pf: c.max, slotUsati: {} });
      await arch.aggiorna(CAMPO, { creature });
      await ricorda(creature, b.dataset.id);
      await scrivi({ campo: pubblico(creature, C.gruppi) });
      toast("Riposo lungo: PF pieni e slot liberi");
    }
    case "rinf-apri": apriRinforzi = !apriRinforzi; break;
    case "lato": {
      const creature = C.creature.map(c => c.id !== b.dataset.id ? c : { ...c, tipo: c.tipo === "alleato" ? "nemico" : "alleato" });
      await arch.aggiorna(CAMPO, { creature });
      const c = creature.find(x => x.id === b.dataset.id);
      toast(`${c.nome}: ora ${c.tipo === "alleato" ? "alleato" : "nemico"}`);
      await scrivi({ campo: pubblico(creature, C.gruppi) });
      break;
    }
    case "trasforma": {
      const sel = $("vistaScontro").querySelector(`[data-trasf="${b.dataset.id}"]`), m = perId()[sel && sel.value];
      if (!m) break;
      const creature = C.creature.map(c => c.id !== b.dataset.id ? c : trasforma(c, m));
      const nuova = creature.find(c => c.id === b.dataset.id);
      /* se era da sola nel suo gruppo, cambia nome anche nell'ordine dei turni */
      const gruppi = C.gruppi.map(g => g.membri.length === 1 && g.membri[0] === nuova.id ? { ...g, nome: nuova.giocatori, ini: nuova.ini } : g);
      const g = gruppi.find(x => x.membri.includes(nuova.id));
      await arch.aggiorna(CAMPO, { creature, gruppi });
      toast(`Trasformato: ${m.nome}`);
      await scrivi({ campo: pubblico(creature, gruppi),
        ...(g && g.membri.length === 1 ? { ordine: (SC.ordine || []).map(v => v.id === g.id ? { ...v, nome: g.nome } : v) } : {}) });
      break;
    }
    case "rinforzi": {
      const d20 = parseInt($("nzRD20").value, 10);
      if (!(d20 >= 1 && d20 <= 20)) { toast("Scrivi il d20 d'iniziativa (da 1 a 20)"); return true; }
      const q = Math.min(30, Math.max(1, parseInt($("nzRQuanti").value, 10) || 1));
      const nasc = $("nzRNasc").checked;
      const nuovi = schiera([{ creatura: $("nzRCreatura").value, quanti: q, modo: $("nzRModo").value, nascosto: nasc }], perId(), C.creature);
      if (!nuovi.creature.length) break;
      const creature = [...C.creature, ...nuovi.creature], gruppi = [...C.gruppi, ...nuovi.gruppi];
      await arch.aggiorna(CAMPO, { creature, gruppi });
      let st = { ordine: SC.ordine || [], turno: SC.turno || 0 };
      const evocatore = $("nzREvoca").value;
      for (const g of [...nuovi.gruppi].reverse()) {
        const voce = { id: g.id, nome: g.nascosto ? "???" : g.nome, tot: d20 + (g.ini ?? 0), des: null, ...(g.nascosto ? { nascosto: true } : {}) };
        st = evocatore ? inserisciDopo(st, { ...voce, evocati: SC.round }, evocatore) : inserisciInOrdine(st, voce);
      }
      await scrivi({ ...st, campo: pubblico(creature, gruppi),
        partecipanti: [...(SC.partecipanti || []), ...nuovi.gruppi.map(g => ({ id: g.id, nome: g.nascosto ? "???" : g.nome, tipo: g.tipo === "alleato" ? "alleato" : "nemico", ...(g.nascosto ? { nascosto: true } : {}) }))] });
      $("nzRD20").value = ""; apriRinforzi = false;
      toast(`In campo: ${nuovi.creature.length > 1 ? nuovi.creature.length + " " : ""}${nuovi.creature[0].nome.replace(/ \d+$/, "")}`);
      break;
    }
    case "apri": { const id = b.dataset.id; aperte.has(id) ? aperte.delete(id) : aperte.add(id); break; }
    case "danno": case "cura": {
      const id = b.dataset.id, inp = vista.querySelector(`[data-qta="${id}"]`);
      const n = Math.max(0, parseInt(inp && inp.value, 10) || 0);
      if (!n) { toast("Scrivi quanti PF"); return true; }
      const campi = await colpisci(id, n, az === "cura", SC);
      if (inp) inp.value = "";
      await scrivi(campi);
      break;
    }
    default: return false;
  }
  ridisegna();
  return true;
}
/* la ricerca nel bestiario e il file da importare */
export function input(e) {
  if (e.target.id === "nzCerca") {
    cerca = e.target.value; const pos = e.target.selectionStart; ridisegna();
    const n = $("nzCerca"); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    return true;
  }
  if (e.target.id === "nzFile" && e.target.files[0]) { importa(e.target.files[0]); e.target.value = ""; return true; }
  return false;
}
