/* Nemici e alleati del master: bestiario, scelta per lo scontro, scheda rapida di turno, PF.
   Gira solo sul profilo del master. I numeri veri stanno in dm/ (le regole di Firestore lo chiudono ai giocatori);
   nello scontro, che vedono tutti, finisce solo il nome per i giocatori e una parola sulle ferite.

     dm/bestiario → { creature:[...], gruppi:[...] }   i modelli, importati dal file privato o scritti a mano
     dm/campo     → { scontro, creature:[...], gruppi:[...] }   chi è in campo adesso, con i PF veri          */
import { ferite, danno, cura, schiera, togliDaOrdine, leggiAzioni, scriviAzioni, leggiTratti, scriviTratti } from "./regole/nemici.js";

const BEST = "dm/bestiario", CAMPO = "dm/campo";
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, ridisegna = () => {}, toast = () => {}, ascolti = [];
let B = { creature: [], gruppi: [] }, C = { scontro: null, creature: [], gruppi: [] };
let scelte = [], pannello = null, cerca = "", aperte = new Set(), daEliminare = null;
const perId = () => Object.fromEntries(B.creature.map(c => [c.id, c]));

export function avviaNemici({ archivio, aggiorna, avvisa }) {
  arch = archivio; ridisegna = aggiorna; toast = avvisa; scelte = []; pannello = null; aperte = new Set();
  ascolti = [
    arch.ascolta(BEST, d => { B = { creature: [], gruppi: [], ...(d || {}) }; ridisegna(); }, null, { anchePropri: true }),
    arch.ascolta(CAMPO, d => { C = { scontro: null, creature: [], gruppi: [], ...(d || {}) }; ridisegna(); }, null, { anchePropri: true }),
  ];
}
export function fermaNemici() { ascolti.forEach(s => s()); ascolti = []; }

/* ---------- preparazione: chi combatte dalla parte del master ---------- */
/** true quando il master sta guardando il bestiario o un modello: la vista dello scontro mostra solo quello. */
export const pannelloAperto = () => !!pannello;

export function htmlPreparazione() {
  if (pannello === "bestiario") return htmlBestiario();
  if (pannello && pannello.modifica !== undefined) return htmlModifica(pannello.modifica);
  const P = perId();
  const ordinate = B.creature.slice().sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  const righe = scelte.map((s, i) => `<li><span class="nome">${s.quanti > 1 ? s.quanti + " × " : ""}${esc(P[s.creatura]?.nome || s.creatura)}</span>
      ${s.quanti > 1 ? `<button class="btn link" data-nz="modo" data-i="${i}">${s.modo === "branco" ? "in branco" : "uno per uno"}</button>` : ""}
      <button class="btn link" data-nz="togli" data-i="${i}" aria-label="Togli">Togli</button></li>`).join("");
  return `<section><h2>Nemici e alleati <button class="btn link" data-nz="bestiario">Bestiario</button></h2>
    ${!B.creature.length ? `<p class="vuoto">Il bestiario è vuoto: aprilo e importa il file, oppure crea un modello.</p>` : `
    ${B.gruppi.length ? `<p class="lbl-sez">Gruppi pronti</p><div class="gruppi">${B.gruppi.map(g =>
      `<button class="btn" data-nz="gruppo" data-id="${esc(g.id)}">${esc(g.nome)}<small>${g.membri.map(m => `${m.quanti} ${esc(P[m.id]?.nome || m.id)}`).join(", ")}</small></button>`).join("")}</div>` : ""}
    <p class="lbl-sez">Aggiungi una creatura</p>
    <div class="aggiungi">
      <select id="nzCreatura" aria-label="Creatura">${ordinate.map(c => `<option value="${esc(c.id)}">${esc(c.nome)}${c.tipo === "alleato" ? " (alleato)" : ""}</option>`).join("")}</select>
      <input id="nzQuanti" type="number" inputmode="numeric" min="1" max="30" value="1" aria-label="Quanti">
      <select id="nzModo" aria-label="Iniziativa"><option value="branco">in branco</option><option value="uno">uno per uno</option></select>
      <button class="btn gold" data-nz="aggiungi">Aggiungi</button>
    </div>`}
    ${scelte.length ? `<ul class="schierati">${righe}</ul>` : ""}
  </section>`;
}

/** Al momento di "Tirate l'iniziativa": mette in campo le creature scelte. Restituisce le voci per lo scontro. */
export async function schieraScelte(idScontro) {
  const { creature, gruppi } = schiera(scelte, perId());
  await arch.scrivi(CAMPO, { scontro: idScontro, creature, gruppi });
  scelte = [];
  return {
    partecipanti: gruppi.map(g => ({ id: g.id, nome: g.nome, tipo: g.tipo === "alleato" ? "alleato" : "nemico" })),
    campo: pubblico(creature, gruppi),
  };
}
/* quello che vedono i giocatori: nome per loro, gruppo, parola sulle ferite (e i PF, per gli alleati che lo prevedono) */
function pubblico(creature, gruppi) {
  const gruppoDi = id => (gruppi.find(g => g.membri.includes(id)) || {}).id;
  return creature.map(c => ({ id: c.id, gruppo: gruppoDi(c.id), nome: c.giocatori, tipo: c.tipo, ferite: ferite(c.pf, c.max),
    ...(c.pfVisibili ? { pf: c.pf, max: c.max } : {}) }));
}

/** Modificatore d'iniziativa di un gruppo del master (solo lui lo conosce). */
export function infoGruppo(id) {
  const g = C.gruppi.find(x => x.id === id);
  return g ? { mod: g.ini ?? 0, des: null, vantaggio: false } : null;
}

/* ---------- durante i turni: in campo e scheda rapida ---------- */
/** Vista del master durante i turni: la scheda di chi agisce ora (va in cima) e tutte le creature in campo con i PF (in fondo). */
export function htmlTurniMaster(SC) {
  if (!C.creature.length || C.scontro !== SC.id) return { rapida: "", campo: "" };
  const P = perId(), voce = SC.ordine && SC.ordine[SC.turno];
  const g = voce && C.gruppi.find(x => x.id === voce.id);
  let rapida = "";
  if (g) {
    const membri = C.creature.filter(c => g.membri.includes(c.id));
    const modello = P[membri[0]?.creatura];
    rapida = `<section class="rapida"><h2>Di turno: ${esc(membri.length > 1 ? `${modello?.nome || ""} ×${membri.filter(m => m.pf > 0).length}` : membri[0]?.nome)}</h2>
      ${modello ? schedaModello(modello) : ""}</section>`;
  }
  const righe = C.creature.map(c => {
    const st = ferite(c.pf, c.max), aperta = aperte.has(c.id), m = P[c.creatura];
    return `<li class="${c.pf <= 0 ? "giu" : ""}${c.tipo === "alleato" ? " alleato" : ""}" data-c="${c.id}">
      <div class="riga"><button class="nome-c" data-nz="apri" data-id="${c.id}" aria-expanded="${aperta}">${esc(c.nome)}</button>
        <span class="ca" title="Classe Armatura">CA ${c.ca}</span>
        <span class="pf"><b>${c.pf}</b>/${c.max}</span></div>
      <div class="hpbar" data-state="${c.pf * 2 > c.max ? "" : c.pf * 4 > c.max ? "mid" : "low"}"><i style="width:${Math.round(100 * c.pf / c.max)}%"></i></div>
      <div class="colpo"><span class="parola">${st}</span>
        <input type="number" inputmode="numeric" min="0" placeholder="0" data-qta="${c.id}" aria-label="Quantità per ${esc(c.nome)}">
        <button class="btn dmg" data-nz="danno" data-id="${c.id}">Danno</button>
        <button class="btn heal" data-nz="cura" data-id="${c.id}">Cura</button></div>
      ${aperta && m ? `<div class="dettaglio">${schedaModello(m)}</div>` : ""}</li>`;
  }).join("");
  return { rapida, campo: `<section><h2>In campo</h2><ul class="campo">${righe}</ul></section>` };
}

/* La scheda di un modello: prima "cosa fa" (la tattica), poi le azioni con i numeri pronti, poi i tratti. */
function schedaModello(m) {
  const azione = a => `<li><b>${esc(a.nome)}</b>${a.colpire != null ? ` <span class="tiro">${sg(a.colpire)}</span>` : ""}
    ${a.danni ? `<span class="danni">${esc(a.danni)}${a.medio != null ? ` <small>(${a.medio})</small>` : ""}</span>` : ""}
    ${a.portata ? `<small class="portata">${esc(a.portata)}</small>` : ""}${a.nota ? `<p>${esc(a.nota)}</p>` : ""}</li>`;
  const lista = (t, v) => v && v.length ? `<p class="lbl-sez">${t}</p><ul class="azioni-m">${v.map(azione).join("")}</ul>` : "";
  const slot = m.slot ? Object.entries(m.slot).map(([l, n]) => `${l}° ×${n}`).join(" · ") : "";
  return `<div class="modello">
    <p class="dati">CA ${m.ca} · PF ${m.pf}${m.dadiPf ? ` (${esc(m.dadiPf)})` : ""} · Iniz. ${sg(m.ini ?? 0)} · ${esc(m.vel || "")}${m.gs ? ` · GS ${esc(m.gs)}` : ""}</p>
    ${m.tattica ? `<p class="tattica"><b>Cosa fa</b> ${esc(m.tattica)}</p>` : ""}
    ${lista("Azioni", m.azioni)}${lista("Azioni bonus", m.azioniBonus)}
    ${m.reazioni && m.reazioni.length ? `<p class="lbl-sez">Reazioni</p><ul class="tratti">${m.reazioni.map(r => `<li><b>${esc(r.nome)}</b> ${esc(r.testo || r.nota || "")}</li>`).join("")}</ul>` : ""}
    ${m.leggendarie ? `<p class="lbl-sez">Azioni leggendarie (${m.leggendarie.quante} per round)</p><ul class="tratti">${m.leggendarie.azioni.map(r => `<li><b>${esc(r.nome)}</b> ${esc(r.nota || "")}</li>`).join("")}</ul>` : ""}
    ${m.tana ? `<p class="lbl-sez">Azioni di tana</p><p class="testo">${esc(m.tana)}</p>` : ""}
    ${slot ? `<p class="lbl-sez">Slot incantesimo</p><p class="testo">${slot}</p>` : ""}
    ${m.tratti && m.tratti.length ? `<details><summary>Tratti</summary><ul class="tratti">${m.tratti.map(t => `<li><b>${esc(t.nome)}</b> ${esc(t.testo)}</li>`).join("")}</ul></details>` : ""}
    ${m.fonte ? `<p class="fonte">${esc(m.fonte)}</p>` : ""}</div>`;
}

/** Danno o cura a una creatura in campo. Aggiorna i PF veri (dm/campo) e la parola per i giocatori (scontro).
    Se un gruppo resta senza nessuno in piedi, esce dall'ordine dei turni. Restituisce i campi da scrivere nello scontro. */
async function colpisci(id, n, comeCura, SC) {
  const creature = C.creature.map(c => c.id !== id ? c : { ...c, pf: comeCura ? cura(c.pf, c.max, n) : danno(c.pf, n) });
  await arch.aggiorna(CAMPO, { creature });
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

function htmlModifica(id) {
  const c = B.creature.find(x => x.id === id) || { id: "", nome: "", giocatori: "", tipo: "nemico", ca: 10, pf: 10, ini: 0, vel: "9 m", azioni: [], tratti: [], tattica: "" };
  const campo = (k, lbl, v, tipo = "text", extra = "") => `<label class="campo-m"><span class="lbl">${lbl}</span><input data-f="${k}" type="${tipo}" value="${esc(v)}" ${extra}></label>`;
  const elimina = daEliminare === id;
  return `<section><h2>${id ? "Modifica modello" : "Nuovo modello"}</h2>
    <div class="modulo">
      ${campo("nome", "Nome (lo vedi solo tu)", c.nome)}
      ${campo("giocatori", "Nome per i giocatori", c.giocatori || "")}
      <div class="tre">${campo("ca", "CA", c.ca, "number", 'inputmode="numeric"')}${campo("pf", "PF", c.pf, "number", 'inputmode="numeric"')}${campo("ini", "Iniziativa", c.ini ?? 0, "number", 'inputmode="numeric"')}</div>
      ${campo("vel", "Velocità", c.vel || "")}
      <label class="campo-m"><span class="lbl">Da che parte sta</span><select data-f="tipo"><option value="nemico"${c.tipo !== "alleato" ? " selected" : ""}>Nemico</option><option value="alleato"${c.tipo === "alleato" ? " selected" : ""}>Alleato controllato dal master</option></select></label>
      <label class="spunta"><input type="checkbox" data-f="pfVisibili"${c.pfVisibili ? " checked" : ""}> I giocatori vedono i PF veri (per gli alleati)</label>
      <label class="campo-m"><span class="lbl">Cosa fa in combattimento</span><textarea data-f="tattica" rows="3">${esc(c.tattica || "")}</textarea></label>
      <label class="campo-m"><span class="lbl">Azioni, una per riga: Nome | +colpire | danni | nota</span><textarea data-f="azioni" rows="5" spellcheck="false">${esc(scriviAzioni(c.azioni))}</textarea></label>
      <label class="campo-m"><span class="lbl">Tratti, uno per riga: Nome: testo</span><textarea data-f="tratti" rows="4">${esc(scriviTratti(c.tratti))}</textarea></label>
    </div>
    <div class="azioni">
      ${id ? `<button class="btn link${elimina ? " rosso" : ""}" data-nz="elimina" data-id="${esc(id)}">${elimina ? "Tocca di nuovo per eliminare" : "Elimina"}</button>
        <button class="btn" data-nz="duplica" data-id="${esc(id)}">Duplica</button>` : ""}
      <button class="btn" data-nz="annulla">Annulla</button>
      <button class="btn up" data-nz="salva" data-id="${esc(id)}">Salva</button></div></section>`;
}

const slug = t => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "modello";
function leggiModulo(radice, vecchio) {
  const f = k => radice.querySelector(`[data-f="${k}"]`);
  const num = (k, d) => { const n = parseInt(f(k).value, 10); return Number.isInteger(n) ? n : d; };
  return { ...(vecchio || {}),
    nome: f("nome").value.trim(), giocatori: f("giocatori").value.trim() || f("nome").value.trim(),
    ca: num("ca", 10), pf: Math.max(1, num("pf", 1)), ini: num("ini", 0), vel: f("vel").value.trim(),
    tipo: f("tipo").value, pfVisibili: f("pfVisibili").checked, tattica: f("tattica").value.trim(),
    azioni: leggiAzioni(f("azioni").value), tratti: leggiTratti(f("tratti").value) };
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
  if (az !== "elimina") daEliminare = null;
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
    case "bestiario": pannello = "bestiario"; window.scrollTo({ top: 0 }); break;
    case "chiudi": pannello = null; break;
    case "nuovo": pannello = { modifica: "" }; window.scrollTo({ top: 0 }); break;
    case "modifica": pannello = { modifica: b.dataset.id }; window.scrollTo({ top: 0 }); break;
    case "annulla": pannello = "bestiario"; break;
    case "duplica": {
      const c = B.creature.find(x => x.id === b.dataset.id); if (!c) break;
      let id = c.id + "-copia", n = 2; while (B.creature.some(x => x.id === id)) id = `${c.id}-copia-${n++}`;
      await salvaBestiario([...B.creature, { ...structuredClone(c), id, nome: c.nome + " (copia)" }]);
      pannello = { modifica: id }; toast("Copia creata: cambiale il nome"); break;
    }
    case "elimina": {
      const id = b.dataset.id;
      if (daEliminare !== id) { daEliminare = id; break; }
      daEliminare = null;
      await salvaBestiario(B.creature.filter(x => x.id !== id), B.gruppi.filter(g => !g.membri.some(m => m.id === id)));
      pannello = "bestiario"; toast("Modello eliminato"); break;
    }
    case "salva": {
      const vecchio = B.creature.find(x => x.id === b.dataset.id);
      const c = leggiModulo(vista, vecchio);
      if (!c.nome) { toast("Serve almeno il nome"); return true; }
      if (!vecchio) { let id = slug(c.nome), n = 2; while (B.creature.some(x => x.id === id)) id = `${slug(c.nome)}-${n++}`; c.id = id; }
      await salvaBestiario(vecchio ? B.creature.map(x => x.id === c.id ? c : x) : [...B.creature, c]);
      pannello = "bestiario"; toast("Modello salvato"); break;
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
