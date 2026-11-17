/* Nemici e alleati del master: bestiario, scelta per lo scontro, scheda rapida di turno, PF.
   Gira solo sul profilo del master. I numeri veri stanno in dm/ (le regole di Firestore lo chiudono ai giocatori);
   nello scontro, che vedono tutti, finisce solo il nome per i giocatori e una parola sulle ferite.

     dm/bestiario → { creature:[...], gruppi:[...] }   i modelli, importati dal file privato o scritti a mano
     dm/campo     → { scontro, creature:[...], gruppi:[...] }   chi è in campo adesso, con i PF veri          */
import { passoBranco, cercaCreature, soloItaliano, sezioneBestiario, caratteristiche, ordinaBestiario, ferite, danno, cura, schiera, togliDaOrdine, inserisciInOrdine, inserisciDopo, trasforma, leggiTratti, scriviTratti, chiaro, fonteChiara, incantesimi, media } from "./regole/nemici.js";
import { finestra } from "./passi.js";
import { reazioneLibera } from "./regole/turno.js";
import { versione } from "./copie.js";
import { icona } from "./icone.js";

const BEST = "dm/bestiario", CAMPO = "dm/campo", PNG = "dm/png";
/* dm/png → { <modello>: { pf, slotUsati } }: i compagni del master (alleati come Ezmerelda) e chi lancia incantesimi
   si portano dietro ferite e slot da uno scontro all'altro, finché il master non segna un riposo lungo. */
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, ridisegna = () => {}, toast = () => {}, ascolti = [];
let B = { creature: [], gruppi: [] }, C = { scontro: null, creature: [], gruppi: [] }, R = {};
let scelte = [], pannello = null, cerca = "", aperte = new Set(), daEliminare = null;
let qta = {}, schedeAperte = new Set();   // il numero scritto col tastierino di ogni creatura; le schede aperte nel pannello
const perId = () => Object.fromEntries(B.creature.map(c => [c.id, c]));

export function avviaNemici({ archivio, aggiorna, avvisa }) {
  arch = archivio; ridisegna = aggiorna; toast = avvisa; scelte = []; pannello = null; aperte = new Set();
  ascolti = [
    arch.ascolta(BEST, d => {
      B = { creature: [], gruppi: [], ...(d || {}) };
      /* solo i nomi italiani: le traduzioni inglesi tra parentesi dei manuali si tolgono, e il bestiario si risalva pulito */
      const puliti = B.creature.map(c => ({ ...c, nome: soloItaliano(c.nome), ...(c.giocatori ? { giocatori: soloItaliano(c.giocatori) } : {}) }));
      const cambiato = puliti.some((c, i) => c.nome !== B.creature[i].nome || c.giocatori !== B.creature[i].giocatori);
      B.creature = puliti;
      if (cambiato) salvaBestiario(puliti).catch(() => {});
      ridisegna();
    }, null, { anchePropri: true }),
    arch.ascolta(CAMPO, d => { C = { scontro: null, creature: [], gruppi: [], ...(d || {}) }; ridisegna(); }, null, { anchePropri: true }),
    arch.ascolta(PNG, d => { R = d || {}; }, null, { anchePropri: true }),
  ];
}
export function fermaNemici() { ascolti.forEach(s => s()); ascolti = []; }

/* ---------- preparazione: chi combatte dalla parte del master ---------- */
/** true quando il master sta guardando il bestiario o un modello: la vista dello scontro mostra solo quello. */
export const pannelloAperto = () => !!pannello;

/* Mostri e Persone: stessi dati, due schede. Le persone (paesani, guardie, PNG della campagna) possono stare
   dalla vostra parte o contro di voi: lo si sceglie quando le si mette in campo. */
const persona = c => c && c.categoria === "persona";
let catPrep = "mostri";
let cercaPrep = "", appena = { id: null, t: 0 };   // appena: l'ultima creatura messa in campo, per farla notare un attimo
/** Per la regola "niente scontro senza nemici": cosa è stato scelto finora e i modelli del bestiario. */
export const statoPreparazione = () => ({ scelte, modelli: perId() });
/* Secondo passo della preparazione: chi combatte. Si cerca per nome (niente lista da scorrere), oppure un gruppo pronto;
   sotto, chi è in campo, con quanti sono e da che parte stanno. */
export function htmlPreparazione() {
  if (pannello === "bestiario") return htmlBestiario();
  const P = perId(), pers = catPrep === "persone", q = cercaPrep.trim();
  const gruppi = B.gruppi.filter(g => g.membri.every(m => persona(P[m.id]) === pers));
  const trovate = q ? cercaCreature(B.creature, q).slice(0, 8) : [];
  const lato = s => s.lato || (P[s.creatura] || {}).tipo || "nemico";
  /* una scelta tra due, con il suo titolo: si capisce cosa cambia e qual è quella accesa */
  const due = (titolo, az, i, primo, a, b, cls = "") => `<div class="due-scelte ${cls}"><span class="lbl">${titolo}</span><div class="seg">
    <button data-nz="${az}" data-i="${i}" data-v="1" aria-pressed="${primo}"${primo ? " disabled" : ""}>${a}</button><button data-nz="${az}" data-i="${i}" data-v="0" aria-pressed="${!primo}"${primo ? "" : " disabled"}>${b}</button></div></div>`;
  const fresca = Date.now() - appena.t < 1500 ? appena.id : null;
  const righe = scelte.map((s, i) => `<li${s.creatura === fresca ? ' class="appena"' : ""}><span class="nome"><i class="lato-${lato(s) === "alleato" ? "alleati" : "mostri"}" aria-hidden="true"></i>${esc(P[s.creatura]?.nome || s.creatura)}</span>
      <span class="stepper"><button class="btn step" data-nz="meno" data-i="${i}" aria-label="Uno in meno">−</button><b class="num">${s.quanti}</b><button class="btn step" data-nz="piu" data-i="${i}" aria-label="Uno in più">+</button></span>
      <button class="x" data-nz="togli" data-i="${i}" aria-label="Togli ${esc(P[s.creatura]?.nome || s.creatura)} dallo scontro">×</button>
      <div class="sch-opz">
        ${due("Da che parte", "lato-scelta", i, lato(s) !== "alleato", "Contro di voi", "Con voi", "lato")}
        ${s.quanti > 1 ? due("Il turno", "modo", i, s.modo === "branco", "Tutti insieme", "Uno per uno") : ""}
        ${due("I giocatori", "nasc", i, !s.nascosto, "Li vedono", "Nascosti")}
      </div></li>`).join("");
  return `<section class="prep-cerca"><h2>Aggiungi chi combatte <span class="h2-azioni"><button class="btn link" data-nz="nuovo">Crea un mostro</button><button class="btn link" data-nz="bestiario">Apri il bestiario</button></span></h2>
    ${!B.creature.length ? `<p class="vuoto">Il bestiario è vuoto: aprilo e importa il file, oppure crea un mostro.</p>` : `
    <input id="nzCercaPrep" type="search" value="${esc(cercaPrep)}" placeholder="Cerca per nome: lupo, guardia, zombi…" aria-label="Cerca una creatura nel bestiario" autocomplete="off">
    ${q ? (trovate.length ? `<ul class="trovate">${trovate.map(c => `<li><button data-nz="aggiungi-c" data-id="${esc(c.id)}" type="button">
        <i class="lato-${sezioneBestiario(c)}" aria-hidden="true"></i><span class="riga-t"><b>${esc(c.nome)}</b><small>${{ mostri: "Mostro", persone: "Persona", alleati: "Alleato del gruppo" }[sezioneBestiario(c)]}${c.gs != null && c.gs !== "" ? ` · GS ${esc(String(c.gs))}` : ""} · CA ${c.ca} · PF ${c.pf}</small></span><span class="piu">Aggiungi</span></button></li>`).join("")}</ul>`
        : `<p class="vuoto">Nessuna creatura con questo nome. <button class="btn link" data-nz="nuovo">Creala adesso</button></p>`)
      : `<details class="apribile gruppi-pronti" data-apri="gruppi-pronti"><summary>${rigaApribile("Gruppi pronti", "scontri già composti: un tocco e sono in campo", B.gruppi.length)}</summary>
      <div class="ap-corpo">
      <div class="seg schede-prep"><button data-nz="cat" data-cat="mostri" aria-pressed="${!pers}">Mostri</button><button data-nz="cat" data-cat="persone" aria-pressed="${pers}">Persone</button></div>
      ${gruppi.length ? `<div class="gruppi">${gruppi.map(g =>
        `<button class="btn" data-nz="gruppo" data-id="${esc(g.id)}">${esc(g.nome)}<small>${g.membri.map(m => `${m.quanti} ${esc(P[m.id]?.nome || m.id)}`).join(", ")}</small></button>`).join("")}</div>` : `<p class="hint">Nessun gruppo pronto di ${pers ? "persone" : "mostri"}.</p>`}
      </div></details>`}`}
  </section>
  <section class="prep-campo"><h2>In campo <span>${scelte.reduce((n, s) => n + s.quanti, 0)} ${scelte.reduce((n, s) => n + s.quanti, 0) === 1 ? "creatura" : "creature"}</span></h2>
    ${scelte.length ? `<ul class="schierati">${righe}</ul>` : `<p class="vuoto">Ancora nessuno. Cerca una creatura qui sopra o scegli un gruppo pronto.</p>`}
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
  scelte = []; cercaPrep = "";
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

/** Quanti nemici ci sono in campo e quanti sono ancora in piedi (anche i nascosti): serve per capire se lo scontro è vinto. */
export function statoNemici(idScontro) {
  if (C.scontro !== idScontro) return { totali: 0, inPiedi: 0 };
  const n = C.creature.filter(c => c.tipo !== "alleato");
  return { totali: n.length, inPiedi: n.filter(c => c.pf > 0).length };
}
/** Quante creature ha un gruppo e quante sono ancora in piedi (per le viste del master). */
export function contaGruppo(id) {
  const g = C.gruppi.find(x => x.id === id); if (!g) return null;
  const m = C.creature.filter(c => g.membri.includes(c.id)), vivi = m.filter(c => c.pf > 0);
  return { tot: m.length, vivi: vivi.length, nomeVivo: vivi.length === 1 ? vivi[0].nome : null };
}
/** Il nome vero di un gruppo del master (per le sue viste, anche quando è nascosto ai giocatori). */
export const nomeGruppo = id => { const g = C.gruppi.find(x => x.id === id); return g ? g.nome : null; };
/** Modificatore d'iniziativa di un gruppo del master (solo lui lo conosce). */
export function infoGruppo(id) {
  const g = C.gruppi.find(x => x.id === id);
  return g ? { mod: g.ini ?? 0, des: null, vantaggio: false } : null;
}

/* ---------- durante i turni: le creature dentro l'ordine dei turni ----------
   Il master non ha più una lista "In campo" a parte: ogni creatura sta nella sua riga dell'ordine, con CA e PF.
   Un tocco apre il pannello con il tastierino (Danno, Cura), la reazione e le altre azioni. */
const FRECCIA = `<svg class="apri" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/* la riga di un pannello che si apre: titolo, cosa c'è dentro, quanti (se serve) e la freccia.
   data-apri dà un nome al pannello: resta aperto anche quando lo scontro si ridisegna */
const rigaApribile = (titolo, sotto, n) => `<span class="ap-testo"><b>${titolo}</b>${sotto ? `<small>${sotto}</small>` : ""}</span>${n != null ? `<span class="ap-n">${n}</span>` : ""}${FRECCIA}`;
const sbarra = c => c.pf * 2 > c.max ? "" : c.pf * 4 > c.max ? "mid" : "low";
const reazioneUsata = (c, SC) => !reazioneLibera(c.reazione, SC, (C.gruppi.find(g => g.membri.includes(c.id)) || {}).id);

/** In cima, quando tocca a una creatura del master: la sua scheda con gli attacchi (pulsante Attacca). */
let passo = { chiave: "", i: 0 };
export function htmlTurniMaster(SC) {
  let branco = null;
  if (!C.creature.length || C.scontro !== SC.id) return { rapida: "", rinforzi: "", sconfitti: "" };
  const P = perId(), voce = SC.ordine && SC.ordine[SC.turno];
  const g = voce && C.gruppi.find(x => x.id === voce.id);
  let rapida = "";
  if (g) {
    const membri = C.creature.filter(c => g.membri.includes(c.id) && c.pf > 0);
    const modello = P[membri[0]?.creatura];
    /* un branco gioca un membro alla volta: "Lupo 1 → Lupo 2 → …"; il passo si ricorda finché dura il suo turno */
    const chiave = `${SC.id}:${SC.round}:${SC.turno}`; if (passo.chiave !== chiave) passo = { chiave, i: 0 };
    branco = passoBranco(membri, passo.i);
    const fila = branco ? `<ol class="branco-fila" aria-label="Il branco, uno alla volta">${membri.map((c, i) =>
      `<li class="${i + 1 < branco.n ? "fatto" : i + 1 === branco.n ? "ora" : ""}"${i + 1 === branco.n ? ' aria-current="step"' : ""}>${esc(c.nome)}</li>`).join("")}</ol>` : "";
    if (modello) rapida = `${fila}<div class="rapida">${schedaModello(modello, membri.length === 1 ? membri[0] : null, g.id)}</div>`;
  }
  return { rapida, branco, rinforzi: htmlRinforzi(SC), sconfitti: htmlSconfitti() };
}
/** Le creature di un gruppo, una riga ciascuna, per l'ordine dei turni del master.
    testa: per una creatura da sola nel suo gruppo, il posto del nome (losanga e nome del gruppo) · uscenti: appena sconfitte, ancora visibili mentre escono. */
export function righeCreature(gruppoId, SC, { testa = "", uscenti = new Map(), ritardo = () => 0 } = {}) {
  const g = C.gruppi.find(x => x.id === gruppoId); if (!g || C.scontro !== SC.id) return "";
  const lista = C.creature.filter(c => g.membri.includes(c.id) && (c.pf > 0 || uscenti.has(c.id)));
  if (!lista.length) return "";
  return `<ul class="q-membri m">${lista.map(c => {
    const aperta = aperte.has(c.id) && c.pf > 0, giu = c.pf <= 0;
    return `<li class="m-crea${aperta ? " aperta" : ""}${c.nascosto ? " nascosto" : ""}${giu ? " esce-presto" : ""}"${giu ? ` style="--d:${ritardo(c.id)}ms"` : ""} data-crea="${c.id}">
      <button class="m-testa" data-nz="apri" data-id="${c.id}" aria-expanded="${aperta}"${giu ? " disabled" : ""}>
        ${testa || `<span class="nome">${esc(c.nome)}${c.nascosto ? ` <small>nascosto</small>` : ""}</span>`}
        ${reazioneUsata(c, SC) ? `<span class="m-tag">reazione usata</span>` : ""}
        <span class="ca">CA ${c.ca}</span><span class="pf"><b>${c.pf}</b>/${c.max}</span>${FRECCIA}</button>
      <div class="m-barra" data-s="${sbarra(c)}"><i style="width:${Math.round(100 * Math.max(0, c.pf) / c.max)}%"></i></div>
      ${aperta ? pannelloCreatura(c, g, SC) : ""}</li>`;
  }).join("")}</ul>`;
}
function pannelloCreatura(c, g, SC) {
  const m = perId()[c.creatura], q = qta[c.id] || "";
  const attacchi = ((m && m.azioni) || []).map((a, i) => [a, i]).filter(([a]) => a.colpire != null);
  const usata = reazioneUsata(c, SC);
  const ordinate = B.creature.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  return `<div class="m-pannello">
    ${c.nascosto ? `<div class="nascosto-riga"><span>Nascosto ai giocatori</span><button class="btn gold" data-nz="rivela" data-id="${c.id}">Rivela</button></div>` : ""}
    <div class="m-qta"><span>Quanti PF</span><output aria-live="polite">${q || "0"}</output></div>
    <div class="tast5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button data-nz="cifra" data-id="${c.id}" data-v="${n}">${n}</button>`).join("")}<button class="canc" data-nz="canc" data-id="${c.id}">Cancella</button></div>
    <div class="m-bott"><button class="btn dmg" data-nz="danno" data-id="${c.id}"${q ? "" : ` disabled data-perche="Scrivi prima quanti PF"`}>Danno${q ? ` ${q}` : ""}</button><button class="btn heal" data-nz="cura" data-id="${c.id}"${q ? "" : ` disabled data-perche="Scrivi prima quanti PF"`}>Cura${q ? ` ${q}` : ""}</button></div>
    ${attacchi.length || (m && m.reazioni && m.reazioni.length) ? `<p class="lbl-sez">Reazione${usata ? " · già usata in questo round" : ""}</p>
      <div class="m-reaz">${attacchi.map(([a, i]) => `<button class="btn" data-at="m-nuovo" data-g="${g.id}" data-i="${i}" data-r="${c.id}">${esc(a.nome)}<small>attacco di opportunità</small></button>`).join("")}
      ${(m.reazioni || []).map((r, i) => `<button class="btn" data-nz="reaz-usa" data-id="${c.id}" data-k="${i}">${esc(r.nome)}<small>${esc(chiaro(r.testo || "").slice(0, 70))}${(r.testo || "").length > 70 ? "…" : ""}</small></button>`).join("")}</div>` : ""}
    <div class="m-altro">
      ${m ? `<button class="btn link" data-nz="scheda-c" data-id="${c.id}">${schedeAperte.has(c.id) ? "Nascondi la scheda" : `Scheda: ${esc(m.nome)}`}</button>` : ""}
      <button class="btn link" data-nz="lato" data-id="${c.id}">${c.tipo === "alleato" ? "Passa ai nemici" : "Passa agli alleati"}</button>
      ${persiste(c, C.creature) ? `<button class="btn link" data-nz="riposo" data-id="${c.id}">Riposo lungo</button>` : ""}
    </div>
    <details class="apribile piccola" data-apri="trasforma-${c.id}"><summary>${rigaApribile("Trasforma", "in un altro modello del bestiario")}</summary><div class="ap-corpo aggiungi"><select data-trasf="${c.id}" aria-label="Nuovo modello per ${esc(c.nome)}">${ordinate.map(x => `<option value="${esc(x.id)}"${x.id === c.creatura ? " selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
      <button class="btn" data-nz="trasforma" data-id="${c.id}">Trasforma</button></div></details>
    ${m && schedeAperte.has(c.id) ? schedaModello(m, c) : ""}
  </div>`;
}
/* chi è a terra: resta qui sotto, per rimediare a un errore */
function htmlSconfitti() {
  const giu = C.creature.filter(c => c.pf <= 0);
  if (!giu.length) return "";
  return `<details class="apribile m-sconfitti" data-apri="sconfitti"><summary>${rigaApribile("Sconfitti", "per rimediare a un errore: rimettili in campo", giu.length)}</summary>
    <ul class="ap-corpo">${giu.map(c => `<li><span class="riga-t"><b>${esc(c.nome)}</b><small>a terra · aveva ${c.max} PF</small></span><button class="btn" data-nz="rimetti" data-id="${c.id}">Rimetti in campo</button></li>`).join("")}</ul></details>`;
}
function htmlRinforzi(SC) {
  const per = k => cercaCreature(B.creature, "").filter(c => sezioneBestiario(c) === k).map(x => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join("");
  return `<details class="apribile rinforzi" data-apri="rinforzi"><summary>${rigaApribile("Arrivano rinforzi", "aggiungi creature a scontro iniziato")}</summary>
    <div class="ap-corpo">
    <label class="campo-m"><span class="lbl">Chi arriva</span><select id="nzRCreatura" aria-label="Creatura"><optgroup label="Mostri">${per("mostri")}</optgroup><optgroup label="Persone">${per("persone")}</optgroup><optgroup label="Alleati del gruppo">${per("alleati")}</optgroup></select></label>
    <div class="rinf-due">
      <label class="campo-m"><span class="lbl">Quanti</span><input id="nzRQuanti" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="1" aria-label="Quanti"></label>
      <label class="campo-m"><span class="lbl">Il turno</span><select id="nzRModo" aria-label="Il turno"><option value="branco">Tutti insieme</option><option value="uno">Uno per uno</option></select></label>
    </div>
    <label class="campo-m"><span class="lbl">Quando giocano</span><select id="nzREvoca" aria-label="Quando giocano"><option value="">Da soli, alla loro iniziativa</option>
      ${(SC.ordine || []).filter(v => C.gruppi.some(g => g.id === v.id)).map(v => `<option value="${v.id}"${SC.ordine[SC.turno] && SC.ordine[SC.turno].id === v.id ? " selected" : ""}>Subito dopo ${esc(C.gruppi.find(g => g.id === v.id).nome)} (evocati)</option>`).join("")}</select></label>
    <label class="spunta"><input type="checkbox" id="nzRNasc"> Nascosti ai giocatori (li riveli quando si fanno vedere)</label>
    <button class="btn up rinf-ok" data-nz="rinforzi">Entrano in campo</button>
    <p class="hint">L'iniziativa la tira l'app, come per gli altri mostri. Gli evocati in questo round giocano subito dopo chi li ha evocati; dal round dopo prendono il posto della loro iniziativa.</p>
    <button class="btn link" data-nz="nuovo">Non c'è nel bestiario? Crea un mostro nuovo</button>
  </div></details>`;
}
/** La reazione di una creatura è stata usata (attacco di opportunità o una reazione del manuale): torna al suo turno. */
export async function segnaReazioneCreatura(id, SC) {
  const creature = C.creature.map(c => c.id !== id ? c : { ...c, reazione: { scontro: SC.id, round: SC.round, turno: SC.turno } });
  await arch.aggiorna(CAMPO, { creature });
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
  const car = caratteristiche(m);
  const cifra = (v, l, cls = "") => v != null && v !== "" ? `<div class="stat${cls}"><b>${esc(String(v))}</b><span>${l}</span></div>` : "";
  return `<div class="modello">
    <div class="cifre">${cifra(m.ca, "CA", " ca")}${cifra(m.pf, "PF")}${cifra(sg(m.ini ?? 0), "Iniziativa")}${cifra(m.gs, "Sfida")}</div>
    ${m.vel || m.dadiPf ? `<p class="dati">${m.vel ? `Velocità ${esc(m.vel)}` : ""}${m.vel && m.dadiPf ? " · " : ""}${m.dadiPf ? `Dadi vita ${esc(m.dadiPf)}` : ""}</p>` : ""}
    ${car ? `<div class="car6" aria-label="Punteggi di caratteristica">${car.map(x => `<div><span>${x.sigla}</span><b>${x.valore}</b><i>${x.mod}</i></div>`).join("")}</div>` : ""}
    ${m.ts || m.abilita ? `<dl class="ts-ab">${m.ts ? `<div><dt>Tiri salvezza</dt><dd>${esc(m.ts)}</dd></div>` : ""}${m.abilita ? `<div><dt>Abilità</dt><dd>${esc(m.abilita)}</dd></div>` : ""}</dl>` : ""}
    ${m.tattica ? `<div class="tattica"><b>Cosa fa</b><p>${T(m.tattica)}</p></div>` : ""}
    ${blocco("Azioni", m.azioni)}${blocco("Azioni bonus", m.azioniBonus)}
    ${inc}
    ${testi("Reazioni", m.reazioni)}
    ${m.leggendarie ? testi(`Azioni leggendarie · ${m.leggendarie.quante} per round, alla fine del turno di un altro`, m.leggendarie.azioni) : ""}
    ${m.tana ? `<h3 class="sez-m">Azioni di tana</h3><p class="testo">${T(m.tana)}</p>` : ""}
    ${altri.length ? `<details class="apribile tratti-tutti" data-apri="tratti-${esc(m.id || m.nome)}${c ? "-" + c.id : ""}"><summary>${rigaApribile("Tratti e capacità", "difese, sensi e capacità speciali", altri.length)}</summary><div class="ap-corpo">${testi("", altri).replace('<h3 class="sez-m"></h3>', "")}</div></details>` : ""}
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
  if (!comeCura && c.pf <= 0 && g && SC.stato === "in corso" && creature.filter(x => g.membri.includes(x.id)).every(x => x.pf <= 0) && SC.ordine.some(v => v.id === g.id)) {
    await ricordaPosto(g.id, SC);
    Object.assign(campi, togliDaOrdine(SC, g.id));
  }
  return campi;
}

/* il totale d'iniziativa di un gruppo che esce dall'ordine: se il master lo rimette in campo, torna al suo posto */
async function ricordaPosto(gid, SC) {
  const v = (SC.ordine || []).find(x => x.id === gid); if (!v) return;
  C = { ...C, gruppi: C.gruppi.map(g => g.id === gid ? { ...g, tot: v.tot, des: v.des ?? null } : g) };
  await arch.aggiorna(CAMPO, { gruppi: C.gruppi });
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
    if (st.ordine.some(v => v.id === g.id) && creature.filter(x => g.membri.includes(x.id)).every(x => x.pf <= 0)) { await ricordaPosto(g.id, st); st = togliDaOrdine(st, g.id); cambiato = true; }
  }
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
/** Il Bestiario come sezione della barra in basso (master): stessa lista, con il titolo grande e senza "Fatto". */
/* Il bestiario in tre parti, perché "alleato" da solo non diceva niente:
   Mostri (partono contro il gruppo) · Persone (la parte si sceglie in campo) · Alleati (combattono con il gruppo). */
const PARTI = [["mostri", "Mostri", "Partono contro il gruppo."], ["persone", "Persone", "Abitanti e PNG: quando entrano in campo scegli se stanno con voi o contro."],
  ["alleati", "Alleati", "Combattono con il gruppo e ricordano ferite e slot tra uno scontro e l'altro."]];
let parteBest = "mostri", ordineBest = "nome";
export function htmlBestiarioSezione() {
  /* sul telefono "Nuovo" sta accanto al titolo e "Importa" in fondo alla lista: in cima restano solo cerca, parti e ordine */
  return `<header class="testa-pagina con-azione"><div><h1>Bestiario</h1><p>${B.creature.length === 1 ? "1 modello" : B.creature.length + " modelli"}<span class="solo-pc"> · tocca per modificarli</span></p></div>
    <button class="bv oro solo-telefono" data-nz="nuovo" type="button">${icona("piu")}Nuovo</button></header>` + htmlBestiario(true);
}
/* sezione: true nella pagina Bestiario del master (ha il suo titolo); false nel pannello aperto durante uno scontro */
function htmlBestiario(sezione = false) {
  const q = cerca.trim(), conta = k => B.creature.filter(c => sezioneBestiario(c) === k).length;
  const lista = ordinaBestiario(q ? cercaCreature(B.creature, q) : B.creature.filter(c => sezioneBestiario(c) === parteBest), ordineBest);
  const gs = c => c.gs != null && c.gs !== "" ? `<span class="gs" title="Grado di sfida"><small>GS</small>${esc(String(c.gs))}</span>` : "";
  const nomeParte = k => PARTI.find(p => p[0] === k)[1];
  const pc = sezione ? " solo-pc" : "";
  return `<section class="best${sezione ? " best-pagina" : ""}">${sezione ? "" : `<h2>Bestiario <small>${B.creature.length} modelli</small></h2>`}
    <div class="best-cima">
      <label class="best-cerca">${icona("cerca")}<input id="nzCerca" type="search" placeholder="Cerca in tutto il bestiario" value="${esc(cerca)}" aria-label="Cerca nel bestiario"></label>
      <button class="btn gold${pc}" data-nz="nuovo">Nuovo modello</button>
      <label class="btn${pc}">Importa dal file<input data-nz-file type="file" accept=".json,application/json" hidden></label>
    </div>
    ${q ? "" : `<div class="seg best-parti">${PARTI.map(([k, n]) => `<button data-nz="parte" data-parte="${k}" aria-pressed="${parteBest === k}">${n} <small>${conta(k)}</small></button>`).join("")}</div>`}
    <div class="best-riga">
      <p class="hint best-spiega${q ? " solo-telefono" : ""}">${q ? (lista.length === 1 ? "1 modello trovato in tutto il bestiario." : `${lista.length} modelli trovati in tutto il bestiario.`) : PARTI.find(p => p[0] === parteBest)[2]}</p>
      ${sezione ? `<button class="best-ordina solo-telefono" data-nz="ordine" data-o="${ordineBest === "nome" ? "gs" : "nome"}" type="button" aria-label="In ordine ${ordineBest === "nome" ? "di nome" : "di grado di sfida"}: tocca per cambiare">${icona("ordine")}<span>${ordineBest === "nome" ? "Per nome" : "Per grado di sfida"}</span></button>` : ""}
    </div>
    <div class="best-ordine${pc}"><span class="lbl">In ordine di</span><div class="seg"><button data-nz="ordine" data-o="nome" aria-pressed="${ordineBest === "nome"}">Nome</button><button data-nz="ordine" data-o="gs" aria-pressed="${ordineBest === "gs"}">Grado di sfida</button></div></div>
    ${lista.length ? `<ul class="bestiario">${lista.map(c => `<li><button data-nz="modifica" data-id="${esc(c.id)}"><span class="nome"><i class="lato-${sezioneBestiario(c)}" aria-hidden="true"></i>${esc(c.nome)}${gs(c)}</span>
      <small>${q ? nomeParte(sezioneBestiario(c)) + " · " : ""}CA ${c.ca} · PF ${c.pf}${(c.azioni || []).some(a => a.colpire != null) ? " · " + (c.azioni || []).filter(a => a.colpire != null).map(a => esc(a.nome)).join(", ") : ""}</small></button></li>`).join("")}</ul>`
      : `<p class="vuoto">${q ? "Nessun modello con questo nome." : "Ancora nessuno in questa parte."}</p>`}
    ${sezione ? `<div class="best-fondo solo-telefono"><label class="bv">${icona("file")}Importa dal file<input data-nz-file type="file" accept=".json,application/json" hidden></label>
      <p class="hint">Aggiunge i modelli del file e aggiorna quelli che ci sono già. Prima salva una copia del bestiario nello storico.</p></div>`
      : `<div class="azioni"><button class="btn up" data-nz="chiudi">Fatto</button></div>`}</section>`;
}

const slug = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "modello";
/* ---------- editor di un mostro, in una finestra (si apre anche a scontro iniziato) ---------- */
let ED = null;
function apriEditor(id, perScontro = false) {
  const c = B.creature.find(x => x.id === id);
  ED = { id: id || "", perScontro, elimina: false, bozza: structuredClone(c || { nome: "", giocatori: "", tipo: "nemico", ca: 12, pf: 10, ini: 0, vel: "9 m",
    azioni: [{ nome: "", colpire: 3, danni: "" }], tratti: [], tattica: "", ...(catPrep === "persone" ? { categoria: "persona" } : {}) }) };
  ED.f = finestra({ chiave: "editor", titolo: id ? "Modifica mostro" : "Nuovo mostro", onClick: clicEditor, onChiudi: () => { ED = null; ridisegna(); } });
  disegnaEditor();
}
function disegnaEditor(nuovo = true) {
  const c = ED.bozza, num = 'type="text" inputmode="numeric" pattern="-?[0-9]*" autocomplete="off"';
  const campo = (k, lbl, v, extra = "", ph = "") => `<label class="campo-m"><span class="lbl">${lbl}</span><input data-ed="${k}" value="${esc(v ?? "")}" ${extra} placeholder="${esc(ph)}"></label>`;
  ED.f.mostra(`<div class="modulo">
      ${ED.id ? "" : `<p class="hint ed-nota">Si salva nel Bestiario: lo ritrovi in ogni scontro${ED.perScontro ? ", ed entra subito in questo" : ""}.</p>`}
      ${campo("nome", "Nome (lo vedi solo tu)", c.nome, "", "es. Capo dei lupi")}
      ${campo("giocatori", "Nome per i giocatori", c.giocatori, "", "es. Lupo enorme")}
      <div class="tre quattro">${campo("ca", "CA", c.ca, num)}${campo("pf", "PF", c.pf, num)}${campo("ini", "Iniziativa", c.ini ?? 0, num)}${campo("vel", "Velocità", c.vel, "", "9 m")}</div>
      <div class="ed-car"><span class="lbl">Punteggi di caratteristica</span><div class="sei">${["for", "des", "cos", "int", "sag", "car"].map(k => campo(`car-${k}`, k.toUpperCase(), (c.car || {})[k] ?? "", num, "10")).join("")}</div></div>
      ${campo("gs", "Grado di sfida", c.gs ?? "", "", "es. 1/4")}
      ${campo("ts", "Tiri salvezza", c.ts || "", "", "es. Des +4, Sag +2")}
      ${campo("abilita", "Abilità", c.abilita || "", "", "es. Percezione +3, Furtività +4")}
      <div class="campo-m"><span class="lbl">Che cos'è</span><div class="seg"><button data-ed-cat="mostro" aria-pressed="${!persona(c)}">Mostro</button><button data-ed-cat="persona" aria-pressed="${persona(c)}">Persona</button></div></div>
      <div class="campo-m"><span class="lbl">Da che parte sta di solito</span><div class="seg"><button data-ed-tipo="nemico" aria-pressed="${c.tipo !== "alleato"}">Contro il gruppo</button><button data-ed-tipo="alleato" aria-pressed="${c.tipo === "alleato"}">Con il gruppo</button></div></div>
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
  /* grado di sfida, caratteristiche, tiri salvezza e abilità: facoltativi; i punteggi si tengono solo se ci sono tutti e sei */
  for (const k of ["gs", "ts", "abilita"]) { if (v(k)) c[k] = v(k); else delete c[k]; }
  const sei = Object.fromEntries(["for", "des", "cos", "int", "sag", "car"].map(k => [k, parseInt(v(`car-${k}`), 10)]));
  if (Object.values(sei).every(x => Number.isInteger(x) && x >= 1 && x <= 30)) c.car = sei; else delete c.car;
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
  if (b.dataset.edCat) { leggiEditor(); if (b.dataset.edCat === "persona") ED.bozza.categoria = "persona"; else delete ED.bozza.categoria; return disegnaEditor(false); }
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
    if (!ED.id && ED.perScontro) { scelte.push({ creatura: c.id, quanti: 1, modo: "branco" }); cercaPrep = ""; }
    toast(ED.id ? "Mostro salvato" : ED.perScontro ? `${c.nome}: salvato nel bestiario e aggiunto allo scontro` : `${c.nome}: salvato nel bestiario, lo ritrovi in ogni scontro`, 5000); ED.f.chiudi();
  }
}
async function salvaBestiario(creature, gruppi = B.gruppi) {
  await arch.scrivi(BEST, { versione: 1, creature, gruppi });
  versione("dm-bestiario", { versione: 1, creature, gruppi });   // nello storico al massimo ogni mezz'ora
}

/* il file privato (privato/bestiario.json): i modelli con lo stesso nome tecnico vengono sostituiti, gli altri restano */
async function importa(file) {
  let dati;
  try { dati = JSON.parse(await file.text()); } catch (_) { toast("Il file non è leggibile", 5000); return; }
  if (!dati || !Array.isArray(dati.creature)) { toast("Questo file non è un bestiario", 5000); return; }
  if (B.creature.length) await versione("dm-bestiario", { versione: 1, creature: B.creature, gruppi: B.gruppi }, "prima dell'importazione", true);
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
      appena = { id: g.membri[g.membri.length - 1].id, t: Date.now() };
      toast(`${g.nome}: in campo (${g.membri.map(m => `${m.quanti} ${perId()[m.id]?.nome || m.id}`).join(", ")})`, 4000);
      break;
    }
    case "aggiungi": {
      const q = Math.min(30, Math.max(1, parseInt($("nzQuanti").value, 10) || 1));
      scelte.push({ creatura: $("nzCreatura").value, quanti: q, modo: $("nzModo").value });
      break;
    }
    /* dalla ricerca: un tocco ne aggiunge uno; se c'è già, uno in più (da due in su giocano in branco, se non dici altro) */
    case "aggiungi-c": {
      const gia = scelte.find(x => x.creatura === b.dataset.id);
      if (gia) gia.quanti = Math.min(30, gia.quanti + 1); else scelte.push({ creatura: b.dataset.id, quanti: 1, modo: "branco" });
      appena = { id: b.dataset.id, t: Date.now() };
      { const nome = perId()[b.dataset.id]?.nome || "Creatura"; toast(gia ? `${nome}: ora sono ${gia.quanti}` : `${nome}: in campo`, 3000); }
      break;
    }
    case "piu": { const x = scelte[+b.dataset.i]; x.quanti = Math.min(30, x.quanti + 1); break; }
    case "meno": { const x = scelte[+b.dataset.i]; if (x.quanti > 1) x.quanti--; else scelte.splice(+b.dataset.i, 1); break; }
    case "togli": scelte.splice(+b.dataset.i, 1); break;
    case "modo": { const s = scelte[+b.dataset.i]; s.modo = s.modo === "branco" ? "uno" : "branco"; break; }
    case "nasc": { const s = scelte[+b.dataset.i]; s.nascosto = !s.nascosto; break; }
    case "cat": catPrep = b.dataset.cat; break;
    case "lato-scelta": { const s = scelte[+b.dataset.i], ora = s.lato || (perId()[s.creatura] || {}).tipo || "nemico"; s.lato = ora === "alleato" ? "nemico" : "alleato"; break; }
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
    case "parte": parteBest = b.dataset.parte; break;
    case "ordine": ordineBest = b.dataset.o; break;
    case "branco-avanti": passo.i++; window.scrollTo({ top: 0 }); break;
    case "branco-indietro": passo.i = Math.max(0, passo.i - 1); break;
    /* creato mentre si prepara uno scontro: oltre a finire nel bestiario entra subito tra chi combatte */
    case "nuovo": apriEditor("", SC.stato === "chiuso" && pannello !== "bestiario" && !$("vistaScontro").hidden); return true;
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
      break;
    }
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
      /* l'iniziativa dei rinforzi la tira l'app, come per gli altri mostri: niente dado da scrivere */
      const caso = new Uint32Array(1); crypto.getRandomValues(caso); const d20 = (caso[0] % 20) + 1;
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
      toast(`Rinforzi in campo · iniziativa: d20 ${d20}`, 5000);
      const pr = document.querySelector('details[data-apri="rinforzi"]'); if (pr) pr.open = false;   // entrati: il pannello si richiude
      toast(`In campo: ${nuovi.creature.length > 1 ? nuovi.creature.length + " " : ""}${nuovi.creature[0].nome.replace(/ \d+$/, "")}`);
      break;
    }
    case "apri": { const id = b.dataset.id; aperte = aperte.has(id) ? new Set() : new Set([id]); break; }
    case "cifra": { const id = b.dataset.id, ora = qta[id] || ""; qta[id] = (ora === "0" ? "" : ora).slice(0, 2) + b.dataset.v; if (qta[id] === "0") qta[id] = ""; break; }
    case "canc": qta[b.dataset.id] = ""; break;
    case "scheda-c": { const id = b.dataset.id; schedeAperte.has(id) ? schedeAperte.delete(id) : schedeAperte.add(id); break; }
    case "reaz-usa": {
      const c = C.creature.find(x => x.id === b.dataset.id), m = c && perId()[c.creatura], r = m && (m.reazioni || [])[+b.dataset.k];
      await segnaReazioneCreatura(b.dataset.id, SC);
      toast(`${c ? c.nome : ""}: ${r ? r.nome : "reazione"}`);
      break;
    }
    case "danno": case "cura": {
      const id = b.dataset.id, n = Math.max(0, parseInt(qta[id], 10) || 0);
      if (!n) { toast("Tocca quanti PF"); return true; }
      qta[id] = "";
      const campi = await colpisci(id, n, az === "cura", SC);
      if (az === "danno" && campi.campo.find(x => x.id === id)?.ferite === "sconfitto") aperte.delete(id);
      await scrivi(campi);
      break;
    }
    case "rimetti": {
      /* torna in piedi con 1 PF; se il suo gruppo era uscito dall'ordine, rientra al suo posto */
      const id = b.dataset.id;
      const creature = C.creature.map(c => c.id !== id ? c : { ...c, pf: Math.max(1, c.pf) });
      await arch.aggiorna(CAMPO, { creature });
      const g = C.gruppi.find(x => x.membri.includes(id)), campi = { campo: pubblico(creature, C.gruppi) };
      if (g && SC.stato === "in corso" && !(SC.ordine || []).some(v => v.id === g.id)) {
        const voce = { id: g.id, nome: g.nascosto ? "???" : g.nome, tot: g.tot ?? 0, des: g.des ?? null, ...(g.nascosto ? { nascosto: true } : {}) };
        Object.assign(campi, inserisciInOrdine({ ordine: SC.ordine || [], turno: SC.turno || 0 }, voce));
      }
      await scrivi(campi);
      aperte = new Set([id]);
      toast(`${creature.find(c => c.id === id).nome}: di nuovo in campo con 1 PF`);
      break;
    }
    default: return false;
  }
  ridisegna();
  return true;
}
/* la ricerca nel bestiario e il file da importare */
export function input(e) {
  if (e.target.id === "nzCercaPrep") {
    cercaPrep = e.target.value; const pos = e.target.selectionStart; ridisegna();
    const n = $("nzCercaPrep"); if (n) { n.focus({ preventScroll: true }); try { n.setSelectionRange(pos, pos); } catch (_) {} }
    return true;
  }
  if (e.target.id === "nzCerca") {
    cerca = e.target.value; const pos = e.target.selectionStart; ridisegna();
    const n = $("nzCerca"); if (n) { n.focus(); n.setSelectionRange(pos, pos); }
    return true;
  }
  if (e.target.matches?.("[data-nz-file]") && e.target.files[0]) { importa(e.target.files[0]); e.target.value = ""; return true; }
  return false;
}
