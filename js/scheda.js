/* La scheda del personaggio. È la logica della scheda originale, quasi riga per riga:
   cambia solo da dove arrivano i dati (archivio.js) e quali personaggi mostra (dipende dal profilo). */
import { AB, ABN, STYLES, CONDS, COINS, mod, prof, sg, clone, calcola, attacchiOrdinati, normalizza, quantita, conQuantita, aggiungiOggetto } from "./regole/base.js";
import { talento, talentiDisponibili, requisiti } from "./regole/talenti.js";
import { stiliPer } from "./regole/stili.js";
import { INCANTESIMI_ATTACCO, EXTRA_DANNI, moltTrucchetto, partiDanno, usabileInCombattimento } from "./regole/magia.js";
import { opzioni, suOpzioni } from "./campagna.js";
import { scorte, usaMunizione, munizioneDi, aggiungiScorta } from "./regole/munizioni.js";
import { massimo, danno, cura, riduci, dopoRiposoLungo, segmentiBarra } from "./regole/pf.js";
import { puoSalire, livelloPrima } from "./regole/livelli.js";
import { effettoAttivo, bonusColpire } from "./regole/effetti.js";
import { PERSONAGGI } from "./personaggi/index.js";
import { stemma, avatar } from "./stemmi.js";
import { icona } from "./icone.js";
import { versione } from "./copie.js";

const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t; return e.innerHTML; }

/* ---------- stato ----------
   ids: i personaggi di questo profilo · cur: quello mostrato · C: le sue regole · S: il suo stato */
let arch = null, ids = [], cur = null, C = null, S = null;
const STATE = {}, LOADED = {};
let ascolti = [], canWrite = true, editW = false;
const saving = {}, pending = {}, timers = {};
let lastMove = null, floatTimer = null, chiediUscita = () => {}, onScontro = () => {}, onScheda = () => {}, onAltro = () => {};

function D() { return calcola(C, S); }

function showFloat(t, undo, ms) {
  $("floatTxt").textContent = t; $("undoHp").hidden = !undo; $("float").classList.toggle("plain", !undo); $("float").hidden = false;
  clearTimeout(floatTimer); floatTimer = setTimeout(hideLast, ms || (undo ? 8000 : 3200));
}
export function toast(t, ms) { showFloat(t, false, ms); }
function setSync(state, txt) { const el = $("sync"); el.className = "dot " + state; el.title = txt; $("syncTxt").textContent = txt; }

$("purse").innerHTML = COINS.map(([k, name, steps]) => `<div class="coin${k === "mo" ? " big" : ""}">
  <span class="disc ${k}" title="${name}">${k.toUpperCase()}</span>
  <input id="c_${k}" type="number" inputmode="numeric" min="0" aria-label="Monete di ${name.toLowerCase()}">
  <div class="act">${steps.map(s => `<button class="btn" data-coin="${k}" data-step="${s}" aria-label="${s > 0 ? "Aggiungi" : "Togli"} ${Math.abs(s)} ${name.toLowerCase()}">${s > 0 ? "+" : "−"}${Math.abs(s)}</button>`).join("")}</div></div>`).join("");

/* ---------- disegno della scheda ---------- */
function render() {
  if (!S) return;
  const X = D(), L = X.L;
  document.title = C.name;
  $("charName").textContent = C.name; $("klassName").textContent = C.classe; $("subclass").textContent = C.sub;
  $("subclass").hidden = !C.sub; $("subclass").previousSibling.textContent = C.sub ? " · " : "";
  if ($("crest").dataset.tipo !== C.stemma) { $("crest").innerHTML = stemma(C.stemma, { piena: true }); $("crest").dataset.tipo = C.stemma; }
  $("tags").innerHTML = C.tags.map(t => `<span>${esc(t)}</span>`).join("");
  /* i livelli li concede il master (Campagna): il pulsante c'è solo con il suo via, o se ha acceso la salita libera */
  const concesso = (opzioni().salite || {})[cur] || 0, viaDelMaster = !perMaster && !opzioni().salitaLibera && L < concesso;
  /* con il via del master non c'è il pulsantino: una fascia grande in cima alla scheda (e la finestra che si apre da sola) */
  $("lvV").textContent = L; $("lvUp").hidden = viaDelMaster || !puoSalire({ livello: L, concesso, libera: opzioni().salitaLibera, master: perMaster });
  $("salitaFascia").hidden = !viaDelMaster; $("salitaFasciaTxt").textContent = `Sali al livello ${L + 1}`;
  $("undoLv").hidden = !S.history.length || (!perMaster && !opzioni().salitaLibera && !concesso);
  $("caV").textContent = S.ca + C.caBonus(L); $("iniV").textContent = sg(X.ini); $("iniL").textContent = C.ready(L) ? "Iniz. vant." : "Iniziativa"; $("spdV").textContent = S.speed || "9 m";
  $("ppNum").textContent = X.pp;
  $("resist").hidden = !S.res.length && !S.temp && !S.riduzione;
  $("resist").innerHTML = (S.temp ? `<span class="tmp">+${S.temp} PF temporanei</span>` : "") +
    (S.riduzione ? `<span class="perso">Massimo ridotto di ${S.riduzione} (vero ${S.maxhp})</span>` : "") + S.res.map(r => `<span>Resiste: ${esc(r.toLowerCase())}</span>`).join("");
  $("bcV").textContent = sg(X.P); $("ppV").textContent = "Percezione passiva " + X.pp;
  $("reTxt").textContent = `Azione bonus · 1d10 + ${L} PF · ${C.reUses(L) > 1 ? "2 usi per riposo" : "riposo breve"}`; $("rePips").dataset.max = C.reUses(L);
  $("dvName").textContent = C.multiclasse ? `Dadi vita ${C.dadiVita(S)}` : `Dadi vita d${C.hitDie}`;
  $("dvTxt").textContent = `Durante un riposo breve · ${C.multiclasse ? "ogni dado" : "1d" + C.hitDie} ${sg(X.M.cos)} PF ciascuno`;
  $("dvPips").dataset.max = L;
  $("reRow").hidden = C.secondWind === false;
  /* gli slot degli incantesimi stanno nella pagina Incantesimi, accanto al loro livello */
  $("extraRes").innerHTML = (C.risorse ? C.risorse(L, X, S) : []).filter(r => r.max > 0 && !/^slot\d$/.test(r.k)).map(r => `<div class="res">
      <div class="what"><div>${esc(r.nome)}</div><small>${esc(r.testo)}</small></div>
      <div class="act"><div class="pips" data-res="${r.k}" data-max="${r.max}"></div></div></div>`).join("") + (C.riserva && C.riserva(L, X) ? (() => {
      const r = C.riserva(L, X), resto = Math.max(0, r.max - (S[r.k] || 0));
      return `<div class="res riserva"><div class="what"><div>${esc(r.nome)} <b class="num">${resto}</b><small class="di"> / ${r.max}</small></div><small>${esc(r.testo)}</small></div>
        <div class="act">${[-5, -1, 1].map(n => `<button class="btn step" data-pool="${r.k}" data-n="${n}" data-max="${r.max}" aria-label="${n < 0 ? "Spendi" : "Restituisci"} ${Math.abs(n)}">${n < 0 ? "−" : "+"}${Math.abs(n)}</button>`).join("")}</div></div>`;
    })() : "");
  $("atkNota").hidden = !(C.atkNota && C.atkNota(L)); $("atkNota").textContent = C.atkNota ? C.atkNota(L) : "";
  /* munizioni: le speciali per nome; le comuni solo se il master ha spento "Munizioni comuni infinite" */
  $("munRow").innerHTML = scorte(S, opzioni().munizioniInfinite).map(m => `<div class="ammo"><span>${esc(m.nome)}</span>
    <button class="btn step" data-mun="${m.id}" data-d="-1" aria-label="Togli una: ${esc(m.nome)}">−</button><b class="num">${m.n}</b>
    <button class="btn step" data-mun="${m.id}" data-d="1" aria-label="Aggiungi una: ${esc(m.nome)}">+</button>
    ${editW && m.id !== "comuni" ? `<button class="x" data-mundel="${m.id}" aria-label="Togli la scorta ${esc(m.nome)}">×</button>` : ""}</div>`).join("");
  renderIncantesimi(L, X);
  $("aiRow").hidden = !C.surge; $("aiPips").dataset.max = C.surges(L) || 1;
  $("inspRow").hidden = !C.insp; $("armorSec").hidden = !C.armor;
  $("indRow").hidden = !C.indom(L); $("indPips").dataset.max = C.indom(L) || 1; $("indName").textContent = C.indName;
  const cm = C.critMin(L);
  $("atkTxt").textContent = `${C.attacks(L) > 1 ? `${C.attacks(L)} per azione · ` : ""}${cm === 20 ? "critico con 20" : `critico ${cm}–20`}`;
  $("inspTxt").textContent = `${S.insp || 0} su 4 · vantaggio a un tiro`;
  $("morteSec").classList.toggle("a-terra", S.hp === 0 || !!S.deathS || !!S.deathF);

  /* PF: il massimo è quello ridotto (se c'è una riduzione); sulla barra i temporanei chiari e il massimo perso a righe */
  const mx = massimo(S), b = segmentiBarra(S), pct = Math.max(0, Math.min(1, S.hp / mx));
  $("hpNow").textContent = S.hp; $("hpMax").textContent = mx; $("hpTemp").hidden = !S.temp; $("hpTemp").textContent = "+" + (S.temp || 0);
  $("miniHp").textContent = S.hp + (S.temp ? "+" + S.temp : ""); $("miniMax").textContent = "/" + mx;
  $("gFill").style.width = b.vita + "%";
  $("gTemp").hidden = !b.temp; $("gTemp").style.left = b.vita + "%"; $("gTemp").style.width = b.temp + "%";
  $("gPerso").hidden = !b.perso; $("gPerso").style.width = b.perso + "%";
  $("hpBar").setAttribute("aria-valuenow", S.hp); $("hpBar").setAttribute("aria-valuemax", mx);
  $("hpBar").dataset.state = pct <= .25 ? "low" : pct <= .5 ? "mid" : "ok";
  /* il massimo ridotto (maledizioni, morsi) lo segna solo il master, dalla scheda del personaggio */
  $("bMax").hidden = !perMaster; $("bMax").textContent = S.riduzione ? `Massimo ridotto di ${S.riduzione}: cambia` : "Riduci il massimo dei PF";

  $("abil").innerHTML = AB.map(k => `<div class="ab"><div class="shield"><div class="lbl">${ABN[k]}</div><div class="mod">${sg(X.M[k])}</div><div class="sc">${S.scores[k]}</div></div><div class="ts${C.saves.includes(k) ? " p" : ""}">TS ${sg(X.saves[k])}</div></div>`).join("");
  $("skills").innerHTML = X.skills.map(s => `<div class="sk${s.p ? " p" : ""}"><span class="n">${s.n} <small>${ABN[s.a]}</small></span><span class="num">${sg(s.v)}</span></div>`).join("");
  $("atkBody").innerHTML = attacchiOrdinati(X).map(a => `<div class="att-riga"><span class="riga-t"><b>${esc(a.n)}${a.magic ? `<span class="plus">+${a.magic}</span>` : ""}</b><small>${esc(a.d)}</small></span>
    <span class="att-num"><span class="oro" title="Per colpire">${sg(a.hit)}</span><span title="Danni">${a.dice[0]}d${a.dice[1]}${a.mod ? sg(a.mod) : ""}</span></span>${editW ? `<button class="x" data-wdel="${a.id}" aria-label="Togli ${esc(a.n)}">×</button>` : ""}</div>`).join("");
  $("wEdit").textContent = editW ? "Fatto" : "Modifica le armi"; $("wForm").hidden = !editW;

  $("feats").innerHTML = C.feats(L, X, S)
    .map(([t, p]) => `<div class="feat"><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");
  $("kv").innerHTML = C.kv.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("");

  /* le losanghe: piene = ancora disponibili (per l'ispirazione: quelle che hai). Sulla scheda si contano gli usi spesi */
  document.querySelectorAll("#vistaScheda .pips[data-res]").forEach(el => {
    const k = el.dataset.res, max = +el.dataset.max, avere = el.hasAttribute("data-avere");
    const usati = Math.min(max, S[k] || 0), pieni = avere ? usati : max - usati; let h = "";
    for (let i = 0; i < max; i++) { const on = i < pieni; h += `<button class="pip${on ? " on" : ""}" data-k="${k}" data-i="${i}"${avere ? " data-avere" : ""} aria-label="${on ? (avere ? "Ce l'hai: tocca per usarla" : "Disponibile: tocca per spenderla") : (avere ? "Non ce l'hai" : "Già usata: tocca per riaverla")}"></button>`; }
    el.innerHTML = h;
  });
  document.querySelectorAll(".pips[data-death]").forEach(el => {
    const k = el.dataset.death === "s" ? "deathS" : "deathF"; let h = "";
    for (let i = 0; i < 3; i++) h += `<button class="pip${i < S[k] ? " mark" : ""}" data-dk="${k}" data-i="${i}" aria-label="Tiro contro morte ${i + 1}"></button>`;
    el.innerHTML = h;
  });
  const dur = S.durate || {};
  $("conds").innerHTML = CONDS.map(c => `<button class="chip${S.conds.includes(c) ? " on" : ""}" data-c="${c}" aria-pressed="${S.conds.includes(c)}">${c}${S.conds.includes(c) && dur[c] ? ` <small>${dur[c]} ${dur[c] === 1 ? "round" : "round"}</small>` : ""}</button>`).join("");
  $("durata").hidden = !scegliDurata;
  if (scegliDurata) $("durata").innerHTML = `<span>${esc(scegliDurata)}: per quanto?</span>` + [[0, "Senza durata"], [1, "Fino al suo prossimo turno"], [10, "1 minuto (10 round)"]]
    .map(([n, t]) => `<button class="btn" data-dur="${n}">${t}</button>`).join("");
  $("concRiga").innerHTML = S.conc ? `<span class="conc-on">Concentrazione: <b>${esc(S.conc)}</b></span><button class="btn link" data-conc-fine>Termina</button>` : "";
  $("exh").textContent = S.exh;
  COINS.forEach(([k]) => { const el = $("c_" + k); if (document.activeElement !== el) el.value = S.coins[k] || 0; });
  const full = S.attuned.length >= 3;
  $("attTxt").textContent = `Sintonia ${S.attuned.length}/3`;
  $("inv").innerHTML = S.inv.map((t, i) => {
    const on = S.attuned.includes(t);
    const q = quantita(t);
    return `<li class="${C.magic.test(t) || on ? "magic" : ""}"><button class="att${on ? " on" : ""}" data-att="${i}" ${!on && full ? "disabled" : ""} aria-pressed="${on}" title="${on ? "In sintonia" : "Metti in sintonia"}">${on ? "◆" : "◇"}</button><span class="nome-ogg"></span>
      <span class="qta${q.n > 1 ? " piu" : ""}">${q.n > 1 ? `<button class="btn step" data-qta-ogg="${i}" data-d="-1" aria-label="Uno in meno">−</button><b class="num">${q.n}</b>` : ""}<button class="btn step" data-qta-ogg="${i}" data-d="1" aria-label="Uno in più">+</button></span>
      <button class="x" data-del="${i}" aria-label="Rimuovi">×</button></li>`;
  }).join("");
  $("inv").querySelectorAll("li .nome-ogg").forEach((s, i) => { const n = quantita(S.inv[i]).nome; s.textContent = n.charAt(0).toUpperCase() + n.slice(1); });
  if (document.activeElement !== $("notes")) $("notes").value = S.notes;
  aggiornaNavPf();
  document.dispatchEvent(new Event("scheda:aggiornata"));
}

/* ---------- incantesimi ----------
   Una sezione per ogni classe che lancia incantesimi (Petrus: Ranger e Druido).
   Preparati (paladino, druido): si cambiano dopo un riposo lungo, scegliendo dalla lista completa; quelli della sottoclasse sono sempre pronti.
   Conosciuti (ranger): un numero fisso, che cresce salendo di livello. I trucchetti si scelgono a parte. "Cambia" apre la lista. */
let editInc = null;   // id della classe di cui si stanno cambiando gli incantesimi
const ICONA_CONC = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></svg>`;
/* gli slot di questo personaggio: [{ liv, max, usati }] */
const slotDi = (L, X) => (C.risorse ? C.risorse(L, X, S) : []).filter(r => /^slot\d$/.test(r.k) && r.max > 0).map(r => ({ liv: +r.k.slice(4), max: r.max, usati: Math.min(r.max, S[r.k] || 0) }));
/* come si lancia, in breve: azione bonus / reazione (dal testo), concentrazione, rituale */
const metaInc = (i, classe) => [/^azione bonus/i.test(i.t || "") ? "Azione bonus" : /^reazione/i.test(i.t || "") ? "Reazione" : "Azione",
  i.conc ? "concentrazione" : "", i.rituale ? "rituale" : "", i.giur ? "sempre pronto" : "", classe].filter(Boolean).join(" · ");
function renderIncantesimi(L, X) {
  const magie = C.magie ? C.magie(L, X, S) : [];
  $("spellSec").hidden = !magie.length;
  $("spellTxt").innerHTML = magie.map(m => `${magie.length > 1 ? `${esc(m.nome)}: ` : ""}<b>${sg(m.colpire)}</b> per colpire · <b>CD ${m.cd}</b>`).join(" · ") || (C.armor ? "Quelli dell'Armatura Cremesi" : "");
  $("concBanner").innerHTML = S.conc ? `<div class="conc-banner vetro"><span class="icona">${ICONA_CONC}</span><span class="riga-t"><b>${esc(S.conc)}</b><small>Concentrazione in corso</small></span><button class="bv piccolo" data-conc-fine type="button">Termina</button></div>` : "";
  if (!magie.length) { $("spellList").innerHTML = ""; return; }
  const scelti = (chiave, lista) => (S[chiave] || []).filter(n => lista.some(i => i.n === n));
  /* cambiare i preparati o i conosciuti: la lista completa della classe, come prima */
  const m = editInc && magie.find(x => x.id === editInc);
  if (m) {
    const lista = m.lista.filter(i => i.liv <= m.max), sc = scelti(m.chiave, lista), tr = m.trucchetti, scT = tr ? scelti(tr.chiave, tr.lista) : [];
    const voce = (i, chiave, sel, limite) => { const on = sel.includes(i.n);
      return `<div class="inc-riga"><span class="riga-t"><b>${esc(i.n)}</b><small>${esc(metaInc(i))}</small><p>${esc(i.t)}</p></span><span class="inc-az"><button class="pip${on ? " on" : ""}" data-inc-n="${esc(i.n)}" data-inc-k="${chiave}" data-inc-max="${limite}" aria-pressed="${on}" aria-label="${on ? "Togli" : "Aggiungi"} ${esc(i.n)}"${!on && sel.length >= limite ? " disabled" : ""}></button></span></div>`; };
    $("spellList").innerHTML = `<div class="inc-testa"><p class="hint">${esc(m.nome)} · ${tr ? `${scT.length} su ${tr.limite} trucchetti · ` : ""}${sc.length} su ${m.limite} ${m.preparati ? "preparati (si cambiano dopo un riposo lungo)" : "conosciuti"}</p><button class="bv oro piccolo" data-inc="" type="button">Fatto</button></div>` +
      (tr ? `<h2 class="sez">Trucchetti</h2><section class="lista">${tr.lista.map(i => voce(i, tr.chiave, scT, tr.limite)).join("")}</section>` : "") +
      [...Array(m.max)].map((_, k) => { const v = lista.filter(i => i.liv === k + 1); return v.length ? `<h2 class="sez">${k + 1}° livello</h2><section class="lista">${v.map(i => voce(i, m.chiave, sc, m.limite)).join("")}</section>` : ""; }).join("");
    return;
  }
  /* di tutte le classi insieme, divisi per livello: gli slot sono in comune */
  const voci = [], visti = new Set(), multi = magie.length > 1;
  magie.forEach(mm => {
    const lista = mm.lista.filter(i => i.liv <= mm.max), sc = scelti(mm.chiave, lista), tr = mm.trucchetti, scT = tr ? scelti(tr.chiave, tr.lista) : [];
    const metti = i => { if (!visti.has(i.n)) { visti.add(i.n); voci.push({ i, classe: multi ? mm.nome : "" }); } };
    if (tr) tr.lista.filter(i => scT.includes(i.n)).forEach(metti);
    mm.fissi.forEach(metti); lista.filter(i => sc.includes(i.n)).forEach(metti);
  });
  const slot = slotDi(L, X), livelli = [...new Set([...voci.map(v => v.i.liv || 0), ...slot.map(x => x.liv)])].sort((a, b) => a - b);
  const pips = x => `<span class="pips" data-res="slot${x.liv}" data-max="${x.max}"></span>`;
  const azione = (i, liv) => S.conc === i.n ? `<span class="inc-attivo">attivo</span>`
    : liv ? `<button class="bv piccolo" data-lancia="${esc(i.n)}" data-liv="${liv}"${i.conc ? " data-conc-l" : ""} type="button">Lancia</button>`
    : i.conc ? `<button class="bv piccolo" data-conc="${esc(i.n)}" type="button">Concentrati</button>` : "";
  $("spellList").innerHTML = livelli.map(liv => {
    const x = slot.find(s => s.liv === liv), v = voci.filter(e => (e.i.liv || 0) === liv);
    return `<h2 class="sez">${liv ? `${liv}° livello` : "Trucchetti"} <span class="inc-slot">${x ? `${pips(x)}${x.max - x.usati} su ${x.max}` : liv ? "" : "a volontà"}</span></h2>
      <section class="lista">${v.length ? v.map(({ i, classe }) => `<div class="inc-riga"><span class="riga-t"><b>${esc(i.n)}</b><small>${esc(metaInc(i, classe))}</small><p>${esc(i.t)}</p></span><span class="inc-az">${azione(i, liv)}</span></div>`).join("")
        : `<div class="inc-riga"><span class="riga-t"><small>Nessun incantesimo di questo livello: gli slot servono anche per le punizioni o per lanciare più in alto.</small></span></div>`}</section>`;
  }).join("") + `<div class="inc-cambia">${magie.map(mm => `<button class="btn link" data-inc="${mm.id}" type="button">${mm.preparati ? `Cambia i preparati${multi ? ` (${esc(mm.nome)})` : ""}` : `Cambia gli incantesimi${multi ? ` (${esc(mm.nome)})` : ""}`}</button>`).join("")}</div>`;
}

/* ---------- salvataggio ----------
   Ogni modifica ridisegna subito la scheda; il salvataggio parte mezzo secondo dopo l'ultimo tocco,
   così dieci tocchi veloci diventano una sola scrittura. */
function change() {
  render();
  const k = cur;
  if (!LOADED[k] || !canWrite) return;
  clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 500);
}
async function flush(k) {
  delete timers[k];
  if (saving[k]) { pending[k] = true; return; }
  saving[k] = true; setSync("busy", "Salvataggio");
  try { await arch.scrivi("personaggi/" + k, clone(STATE[k])); setSync("ok", "Salvata"); versione(k, STATE[k]); }
  catch (e) {
    if (e && e.solaLettura) { canWrite = false; setSync("err", "Sola lettura"); toast("Questa scheda non è tua: puoi guardarla ma non modificarla", 5000); }
    else { setSync("err", "Non salvata"); toast("Modifica non salvata, riprovo alla prossima", 5000); }
  }
  saving[k] = false;
  if (pending[k]) { pending[k] = false; await flush(k); }
}

/* se il master cambia le regole del tavolo (Tasha), la scheda si ridisegna */
suOpzioni(() => { if (S) { render(); avvisaSalita(); } });
/* il master ha dato il via: il passaggio di livello si apre da solo, una volta; poi resta il pulsante "Sali al livello N" */
function avvisaSalita() {
  if (perMaster || !S || !LOADED[cur]) return;
  const t = (opzioni().salite || {})[cur] || 0, chiave = "salita-vista:" + cur;
  /* niente via (o già salito): si dimentica l'avviso visto, così un nuovo via riapre la finestra */
  if (S.level >= t || S.level >= 20) { try { localStorage.removeItem(chiave); } catch (_) {} return; }
  let vista = 0; try { vista = +localStorage.getItem(chiave) || 0; } catch (_) {}
  if (vista >= t) return;
  if (!$("veil").hidden || !$("salitaVeil").hidden || document.body.classList.contains("passi-aperta")) return;   // sta facendo altro: riprova al prossimo cambiamento
  try { localStorage.setItem(chiave, t); } catch (_) {}
  $("salitaTit").textContent = `${C.name} sale al livello ${S.level + 1}`; $("salitaOk").textContent = `Sali al livello ${S.level + 1}`;
  $("salitaVeil").hidden = false; $("salitaOk").focus();
  try { navigator.vibrate && navigator.vibrate([80, 60, 160]); } catch (_) {}
}
$("salitaOk").onclick = () => { $("salitaVeil").hidden = true; openLevel(); };
$("salitaDopo").onclick = () => { $("salitaVeil").hidden = true; };
$("salitaFascia").onclick = openLevel;

const VISTO = {};   // prima lettura di ogni scheda: non è un colpo appena ricevuto

/* ---------- apertura e chiusura ---------- */
export function apriScheda({ archivio, personaggi, onEsci, scontro, altro, tavolo, bestiario, master = false, profilo = null }) {
  arch = archivio; ids = personaggi.filter(k => PERSONAGGI[k]); chiediUscita = onEsci; canWrite = true; perMaster = master; profiloAtt = profilo;
  onScontro = (scontro && scontro.apri) || (() => {}); onScheda = (scontro && scontro.chiudi) || (() => {}); onAltro = (altro && altro.apri) || (() => {});
  onTavolo = (tavolo && tavolo.apri) || (() => {}); onBestiario = (bestiario && bestiario.apri) || (() => {});
  document.body.classList.toggle("master", master);
  ids.forEach(k => { STATE[k] = clone(PERSONAGGI[k].def); LOADED[k] = false; VISTO[k] = false; });
  costruisciSelettore();
  document.body.classList.add("in-scheda");
  $("vistaScheda").hidden = false;
  const h = (location.hash || "").slice(1);
  go(ids.includes(h) ? h : ids[0]);
  setSync("busy", "Caricamento");
  const lento = setTimeout(() => { if (!LOADED[cur]) setSync("err", "Archivio lento"); }, 10000);
  ascolti = ids.map(k => arch.ascolta("personaggi/" + k, (dati, info) => {
    if (dati === null && info.daCache) return;            // cache vuota: aspetto il server prima di decidere
    LOADED[k] = true; if (k === cur) clearTimeout(lento);
    if (timers[k] || saving[k]) return;                    // ho modifiche mie in arrivo: non le sovrascrivo
    const prima = STATE[k] && STATE[k].colpito && STATE[k].colpito.t, primaVolta = !VISTO[k]; VISTO[k] = true;
    const prima2 = STATE[k] && STATE[k].curato && STATE[k].curato.t;
    if (dati) STATE[k] = normalizza(PERSONAGGI[k].def, dati);
    /* correzioni ai dati vecchi (es. un'arma sistemata): se cambiano qualcosa, la scheda si risalva da sola */
    if (PERSONAGGI[k].correggi && PERSONAGGI[k].correggi(STATE[k]) && canWrite) { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 800); }
    /* curato da un compagno (pozione data da un altro giocatore) */
    const cu = STATE[k].curato;
    if (!primaVolta && cu && cu.t !== (prima2 || 0) && Date.now() - cu.t < 60000) toast(`${PERSONAGGI[k].name}: +${cu.n} PF da ${cu.da}`, 6000);
    /* colpito da un attacco del master: avviso, e tiro di concentrazione se serve */
    const c = STATE[k].colpito;
    if (!primaVolta && c && c.t !== prima && Date.now() - c.t < 60000) {
      toast(`${PERSONAGGI[k].name}: −${c.n} PF da ${c.da}`, 6000);
      try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (_) {}
      if (k === cur) { S = STATE[k]; controllaConcentrazione(c.n); }
    }
    if (k === cur) { S = STATE[k]; render(); setSync("ok", dati ? "Sincronizzata" : "Pronta"); avvisaSalita(); }
    document.dispatchEvent(new Event("schede:cambiate"));   // il Tavolo del master si aggiorna
  }, () => {
    clearTimeout(lento); canWrite = false; setSync("err", "Non salvata");
    toast("Archivio non raggiungibile: le modifiche non vengono salvate", 6000);
  }));
  vaiA(perMaster ? "tavolo" : "scheda", false);   // il master parte dal suo Tavolo, i giocatori dalla scheda
}

/** Salva ciò che è in sospeso e smette di ascoltare l'archivio. */
export async function chiudiScheda() {
  for (const k of Object.keys(timers)) { clearTimeout(timers[k]); await flush(k); }
  ascolti.forEach(stop => stop()); ascolti = [];
  $("vistaScheda").hidden = true; document.body.classList.remove("in-scheda", "master", "scorso", "con-pf");
  chiudiConto(); $("navConto").innerHTML = ""; hideLast(); S = null; cur = null;
  try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
}

/** Quello che serve allo scontro per l'iniziativa di un personaggio di questo profilo. */
export function datiIniziativa(k) {
  if (!STATE[k] || !PERSONAGGI[k]) return null;
  const X = calcola(PERSONAGGI[k], STATE[k]);
  return { mod: X.ini, des: STATE[k].scores.des, vantaggio: !!PERSONAGGI[k].ready(X.L), insp: PERSONAGGI[k].insp ? (STATE[k].insp || 0) : 0 };
}

/** Quello che serve per attaccare dal telefono: armi con bonus e danni, da che numero è critico,
    e gli slot liberi per la Punizione divina (se il personaggio ce l'ha). */
export function datiAttacco(k) {
  if (!STATE[k] || !PERSONAGGI[k]) return null;
  const P = PERSONAGGI[k], St = STATE[k], X = calcola(P, St), L = X.L;
  const slot = (P.risorse ? P.risorse(L, X, St) : []).filter(r => /^slot\d$/.test(r.k))
    .map(r => ({ liv: +r.k.slice(4), max: r.max, liberi: Math.max(0, r.max - (St[r.k] || 0)) }));
  const liberi = liv => (slot.find(s => s.liv === liv) || {}).liberi || 0;
  /* 1. le armi */
  /* Arma magica attiva: +1 a colpire e ai danni con l'arma incantata */
  const eff = effettoAttivo(St), piu = a => bonusColpire(eff, a.id);
  const armi = attacchiOrdinati(X).map(a => ({ ...a, hit: a.hit + piu(a), mod: a.mod + piu(a) })).map(a => ({ n: a.n, tipo: "arma", wid: a.id, munizione: munizioneDi(St, a, opzioni().munizioniInfinite), hit: a.hit, t: (a.t || "").toLowerCase(), nota: a.note || "", distanza: !!a.ranged,
    parti: [{ n: a.dice[0], f: a.dice[1], mod: a.mod, t: (a.t || "").toLowerCase() }], dice: a.dice, mod: a.mod, magic: a.magic }));
  /* 2. gli incantesimi d'attacco che conosce o ha preparato (trucchetti compresi) */
  const magie = P.magie ? P.magie(L, X, St) : [], noti = new Set(), schede = {};
  const incantesimi = [];
  magie.forEach(m => {
    const nomi = [...(St[m.chiave] || []), ...m.fissi.map(i => i.n), ...(m.trucchetti ? St[m.trucchetti.chiave] || [] : [])];
    [...m.lista, ...m.fissi, ...(m.trucchetti ? m.trucchetti.lista : [])].forEach(i => { if (nomi.includes(i.n)) schede[i.n] = i; });
    nomi.forEach(n => {
      noti.add(n);
      const e = INCANTESIMI_ATTACCO[n]; if (!e || incantesimi.some(i => i.n === n)) return;
      incantesimi.push({ n, tipo: e.tipo, hit: m.colpire, cd: m.cd, ts: e.ts, meta: !!e.meta, area: !!e.area, slot: e.slot || 0,
        parti: partiDanno(e.parti, { molt: e.trucchetto ? moltTrucchetto(L) : 1 }), nota: [e.gittata, e.nota].filter(Boolean).join(" · "),
        etichetta: e.trucchetto ? "trucchetto" : "incantesimo", disponibile: !e.slot || liberi(e.slot) > 0 });
    });
  });
  /* 3. incantesimi di un oggetto (l'Armatura Cremesi), finché è in sintonia e ha usi */
  const oggetto = (P.incantesimiOggetto || []).filter(o => !o.richiede || St.attuned.some(a => o.richiede.test(a)))
    .map(o => ({ ...o, etichetta: "incantesimo", daOggetto: true, disponibile: !o.uso || (St[o.uso] || 0) < o.max, usiRimasti: o.uso ? o.max - (St[o.uso] || 0) : null }));
  /* 4. acqua santa da lanciare, se ce l'ha */
  const acqua = St.inv.some(t => /acqua santa/i.test(t)) ? [{ n: "Acqua santa", tipo: "attacco", hit: X.M.des, consuma: "Acqua santa", etichetta: "oggetto", armaImprovvisata: true,
    parti: [{ n: 2, f: 6, t: "radianti" }], nota: "lanciata a 6 m: solo contro non morti e immondi", disponibile: true }] : [];
  /* gli extra ai danni che può accendere quando colpisce con un'arma */
  const extra = EXTRA_DANNI.filter(e => (!e.incantesimo || noti.has(e.incantesimo)) && (!e.scelta || (St.scelte || []).some(c => c.id === e.scelta[0] && c.valore === e.scelta[1])))
    .map(e => ({ ...e, disponibile: !e.slot || liberi(e.slot) > 0 }));
  /* le azioni del turno: quanti attacchi per azione (Attacco extra), Azione impetuosa, azioni bonus e reazioni */
  const lancio = (i, come) => ({ n: i.n, liv: i.liv || 0, conc: !!i.conc, testo: i.t, tipo: "incantesimo", come,
    slot: i.liv ? slot.filter(x => x.liv >= i.liv) : [], disponibile: !i.liv || slot.some(x => x.liv >= i.liv && x.liberi > 0) });
  const incTesti = Object.values(schede);
  const bonus = [
    ...(P.secondWind ? [{ n: "Recuperare energie", tipo: "cura", testo: `Recuperi 1d10 + ${L} PF.`, dado: 10, piu: L, uso: "re",
      disponibile: (St.re || 0) < Math.max(1, P.reUses(L)), usiRimasti: Math.max(0, Math.max(1, P.reUses(L)) - (St.re || 0)) }] : []),
    ...incTesti.filter(i => /^azione bonus/i.test(i.t || "")).map(i => lancio(i, "bonus")),
  ];
  const reazioni = [
    ...(P.feats ? P.feats(L, X, St) : []).filter(([n, t]) => /\breazion/i.test(t || "")).map(([n, t]) => ({ n: n.replace(/^Talento: /, ""), testo: t, tipo: "privilegio" })),
    ...(St.styles || []).filter(n => /\breazion/i.test(STYLES[n] || "")).map(n => ({ n, testo: STYLES[n], tipo: "stile" })),
    ...incTesti.filter(i => /^reazione/i.test(i.t || "")).map(i => lancio(i, "reazione")),
  ];
  return { nome: P.name, livello: L, critMin: P.critMin(L), attacchi: armi, opzioni: [...armi, ...incantesimi, ...oggetto, ...acqua], extra,
    punizione: !!P.punizione && L >= 2, slot, inv: St.inv.slice(), usabili: St.inv.filter(usabileInCombattimento),
    perAzione: P.attacks(L), impetuose: P.surge ? { max: P.surges(L), usate: St.ai || 0 } : null,
    az: St.az || null, reazione: St.reazione || null, bonus, reazioni, conc: St.conc || "", effetto: eff, insp: P.insp ? (St.insp || 0) : 0 };
}
/** Una scheda rimessa da una copia (pagina Campagna): questo telefono la ricarica subito. Senza, la prossima modifica
    fatta qui sovrascriverebbe la copia appena rimessa con lo stato vecchio. */
export function ricaricaScheda(k, dati) {
  if (!STATE[k] || !PERSONAGGI[k] || !dati) return;
  clearTimeout(timers[k]); delete timers[k];
  STATE[k] = normalizza(PERSONAGGI[k].def, clone(dati));
  if (k === cur) { S = STATE[k]; render(); }
}
/** Una copia nello storico di tutte le schede di questo telefono (a fine scontro, per esempio). */
export function salvaVersioni(motivo) { ids.forEach(k => { if (STATE[k] && LOADED[k]) versione(k, STATE[k], motivo, true); }); }
/** Cambia la scheda di un personaggio di questo telefono dallo scontro (azioni del turno, reazione, concentrazione…) e salva. */
export function modificaScheda(k, fn) {
  const St = STATE[k]; if (!St) return;
  fn(St); salvaDopo(k);
}
/** Segna un uso di una risorsa (es. il Dardo caotico dell'armatura) e salva. */
export function usaRisorsa(k, chiave) {
  const St = STATE[k]; if (!St || !chiave) return;
  St[chiave] = (St[chiave] || 0) + 1; salvaDopo(k);
}
/** Un oggetto in meno nell'equipaggiamento (pozione bevuta, acqua santa lanciata). */
export function consumaOggetto(k, nome) {
  const St = STATE[k]; if (!St) return;
  const i = St.inv.findIndex(t => quantita(t).nome.toLowerCase() === quantita(nome).nome.toLowerCase() || t.toLowerCase().includes(nome.toLowerCase()));
  if (i < 0) return;
  const q = quantita(St.inv[i]);
  St.inv = q.n > 1 ? St.inv.map((t, j) => j === i ? conQuantita(q.nome, q.n - 1) : t) : St.inv.filter((_, j) => j !== i);
  salvaDopo(k);
}
/** Un tiro con un'arma a distanza: toglie una munizione dalla sua scorta (se è da contare) e salva.
    Restituisce { nome, restano, finite } per l'avviso, o null se l'arma non usa munizioni da contare. */
export function usaMunizionePg(k, wid) {
  const St = STATE[k], w = St && St.weapons.find(x => x.id === wid); if (!w) return null;
  const r = usaMunizione(St, w, opzioni().munizioniInfinite); if (!r) return null;
  if (!r.finite) { Object.assign(St, r.cambia); salvaDopo(k); }
  return r;
}
/** Cura un personaggio (pozione): PF fino al massimo; da 0 PF si riparte e i tiri contro la morte si azzerano. */
export function curaPg(k, n, da) {
  const St = STATE[k]; if (!St) return null;
  if (St.hp === 0) { St.deathS = 0; St.deathF = 0; }
  St.hp = cura(St, n).hp; St.curato = { n, da, t: Date.now() };
  salvaDopo(k); return St.hp;
}
function salvaDopo(k) { if (k === cur) change(); else { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 300); } }
/** PF di un personaggio, per la banda in alto durante lo scontro. */
export function pfDi(k) { const St = STATE[k], P = PERSONAGGI[k]; return St && P ? { nome: P.name, hp: St.hp, max: massimo(St), temp: St.temp || 0, stemma: P.stemma } : null; }
/** Per gli attacchi del master: nome, CA e resistenze di un personaggio (il telefono del master ha tutte le schede). */
export function bersaglioPg(k) {
  const St = STATE[k], P = PERSONAGGI[k]; if (!St || !P) return null;
  if (P.vediStato) P.vediStato(St);
  return { id: k, nome: P.name, ca: St.ca + P.caBonus(St.level), res: St.res || [], hp: St.hp, maxhp: massimo(St) };
}
/** Il master colpisce un personaggio: tolti i PF (prima quelli temporanei) e salvato.
    "colpito" avvisa il telefono del giocatore, che mostra chi l'ha colpito e chiede la concentrazione. */
export function colpisciPg(k, n, da) {
  const St = STATE[k]; if (!St) return null;
  Object.assign(St, danno(St, n));
  St.colpito = { n, da, t: Date.now() };
  if (k === cur) change(); else { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 300); }
  return St.hp;
}
/** Segna uno slot usato (per la Punizione divina) e salva la scheda. */
export function spendiSlot(k, liv) {
  const St = STATE[k]; if (!St) return;
  St["slot" + liv] = (St["slot" + liv] || 0) + 1;
  if (k === cur) change();
  else { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 500); }
}

/* ---------- navigazione ----------
   In basso la barra delle sezioni, una capsula di vetro con le parole scritte.
   Giocatori: Scheda · Incantesimi · Abilità · Zaino (e Scontro quando il master chiama l'iniziativa).
   Master: Tavolo · Scontro · Bestiario · Campagna; le schede dei giocatori si aprono dal Tavolo.
   In alto a destra l'avatar di chi sei: si tocca per cambiare profilo (Rombosogliola ci trova anche Ireena). */
let perMaster = false, profiloAtt = null, onTavolo = () => {}, onBestiario = () => {};
const IC = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
/* le icone della barra: tutte dalla stessa raccolta a linea unica (js/icone.js) */
const ICONA = Object.fromEntries(["scheda", "magia", "abilita", "zaino", "scontro", "tavolo", "bestiario", "campagna"].map(k => [k, icona(k)]));
const SPUNTA = `<svg class="fc-spunta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const PAGINE = [["scheda", "Scheda"], ["magia", "Incantesimi"], ["abilita", "Abilità"], ["zaino", "Zaino"]];
const TITOLI = { scheda: "", magia: "Incantesimi", abilita: "Abilità", zaino: "Zaino", scontro: "Scontro", tavolo: "Tavolo", bestiario: "Bestiario", altro: "Campagna" };
/* la pagina Incantesimi serve a chi lancia incantesimi (o ha l'Armatura Cremesi) */
const haMagia = () => !!(C && (C.armor || (C.magie && C.magie(S.level, D(), S).length)));
const tab = (sez, nome, extra = "") => `<button class="tab" data-sez="${sez}" type="button"${extra}>${ICONA[sez === "altro" ? "campagna" : sez]}<span class="tab-nm">${nome}</span></button>`;
function costruisciSelettore() {
  $("barra").innerHTML = `<span class="lente" aria-hidden="true"></span>` + (perMaster
    ? tab("tavolo", "Tavolo") + tab("scontro", "Scontro", " data-scontro") + tab("bestiario", "Bestiario") + tab("altro", "Campagna")
    : tab("scontro", "Scontro", " data-scontro") + PAGINE.map(([k, n]) => tab(k, n)).join(""));
  /* le voci sono sempre le stesse e sempre allo stesso posto: quelle che non servono adesso sono solo spente */
  if (!perMaster) $("barra").querySelector("[data-scontro]").classList.add("spenta");
}
/** La sezione che si vede adesso. */
function sezione() {
  const v = $("vistaScheda");
  return v.classList.contains("in-altro") ? "altro" : v.classList.contains("in-tavolo") ? "tavolo" : v.classList.contains("in-bestiario") ? "bestiario"
    : v.classList.contains("in-scontro") ? "scontro" : v.dataset.pagina;
}
function go(k) {
  if (!ids.includes(k)) k = ids[0];
  cur = k; C = PERSONAGGI[k]; S = STATE[k]; editW = false; editInc = null; hideLast();
  render(); disegnaNav(); avvisaSalita();
  try { if (location.hash !== "#" + k) history.replaceState(null, "", "#" + k); } catch (_) {}
}
/** Passa a una sezione: le pagine della scheda ("scheda", "magia", "abilita", "zaino"), "scontro", "tavolo", "bestiario", "altro". */
function vaiA(sez, chiudiScontro = true) {
  const v = $("vistaScheda");
  if (sez === "magia" && !haMagia()) sez = "scheda";
  v.classList.remove("in-altro", "in-tavolo", "in-bestiario");
  $("vistaAltro").hidden = $("vistaTavolo").hidden = $("vistaBestiario").hidden = true;
  if (sez === "scontro") onScontro();
  else {
    if (chiudiScontro) onScheda();
    if (sez === "altro") { v.classList.add("in-altro"); $("vistaAltro").hidden = false; onAltro(); }
    else if (sez === "tavolo") { v.classList.add("in-tavolo"); $("vistaTavolo").hidden = false; onTavolo(); }
    else if (sez === "bestiario") { v.classList.add("in-bestiario"); $("vistaBestiario").hidden = false; onBestiario(); }
    else v.dataset.pagina = sez;
  }
  segnaBarra(); disegnaNav();
}
/* la voce accesa nella barra e la lente sotto di lei: una sola traslazione, misurata in voci (niente scatti) */
function segnaBarra() {
  const sez = sezione(), qui = perMaster && PAGINE.some(([k]) => k === sez) ? "tavolo" : sez;
  const voci = [...document.querySelectorAll("#barra .tab")].filter(b => !b.hidden);
  voci.forEach(b => b.dataset.sez === qui ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  const i = voci.findIndex(b => b.dataset.sez === qui), barra = $("barra");
  barra.style.setProperty("--n", voci.length); barra.style.setProperty("--i", Math.max(0, i));
  const magia = document.querySelector('#barra [data-sez="magia"]'); if (magia) magia.classList.toggle("spenta", !haMagia());
  /* il master che guarda una scheda: intestazione e pagine della scheda in alto */
  const inScheda = perMaster && PAGINE.some(([k]) => k === sez);
  $("vistaMaster").hidden = !inScheda; $("segScheda").hidden = !inScheda;
  if (inScheda) {
    $("vmNome").textContent = C.name;
    const pag = PAGINE.filter(([k]) => k !== "magia" || haMagia());
    $("segScheda").innerHTML = `<span class="lente" aria-hidden="true"></span>` + pag.map(([k, n]) => `<button data-pag="${k}" type="button"${k === sez ? ' aria-current="page"' : ""}>${n}</button>`).join("");
    $("segScheda").style.setProperty("--n", pag.length); $("segScheda").style.setProperty("--i", Math.max(0, pag.findIndex(([k]) => k === sez)));
  }
  $("navTit").textContent = TITOLI[sez] || (C ? C.name : "");
  aggiornaNavPf();
}
document.addEventListener("vista:cambiata", segnaBarra);
$("barra").addEventListener("click", e => {
  const b = e.target.closest("[data-sez]"); if (!b) return;
  if (b.classList.contains("spenta")) { toast(b.dataset.sez === "scontro" ? "Nessuno scontro in corso" : `${C.name} non lancia incantesimi`); return; }
  const prima = sezione(); vaiA(b.dataset.sez);
  if (prima !== sezione()) window.scrollTo({ top: 0 });
});
$("segScheda").addEventListener("click", e => { const b = e.target.closest("[data-pag]"); if (b) { vaiA(b.dataset.pag); window.scrollTo({ top: 0 }); } });
$("tornaTavolo").onclick = () => { vaiA("tavolo"); window.scrollTo({ top: 0 }); };
window.addEventListener("hashchange", () => { if (S) go(location.hash.slice(1)); });
/** Il master apre una scheda dal Tavolo. */
export function apriSchedaMaster(k) { go(k); vaiA("scheda"); window.scrollTo({ top: 0 }); }
/** Per il Tavolo e la pagina Campagna: andare a una sezione. */
export function vaiSezione(sez) { vaiA(sez); window.scrollTo({ top: 0 }); }
/** Per il Tavolo del master: come sta un personaggio (PF, CA, condizioni, concentrazione). */
export function riepilogoPg(k) {
  const St = STATE[k], P = PERSONAGGI[k]; if (!St || !P) return null;
  const X = calcola(P, St);
  return { id: k, nome: P.name, stemma: P.stemma, classe: P.classe, livello: X.L, hp: St.hp, max: massimo(St), maxhp: St.maxhp, tornaA: (St.history || []).length ? St.history[St.history.length - 1].level : null, riduzione: St.riduzione || 0, temp: St.temp || 0,
    ca: St.ca + P.caBonus(X.L), conds: (St.conds || []).slice(), conc: St.conc || "", pp: X.pp };
}

/* ---------- chi sei: avatar in alto a destra e pannello ---------- */
function disegnaNav() {
  if (!profiloAtt || !C) return;
  const multi = !perMaster && ids.length > 1, altro = multi && ids.find(k => k !== cur);
  const chiave = `${profiloAtt.id}:${cur}`;
  if ($("navConto").dataset.chiave === chiave) return;   // già disegnato: niente da rifare
  $("navConto").dataset.chiave = chiave;
  $("navConto").innerHTML = (multi ? `<button class="avatar-btn altro" data-passa="${altro}" type="button" aria-label="Passa alla scheda di ${esc(PERSONAGGI[altro].name)}">${avatar(PERSONAGGI[altro].stemma)}</button>` : "") +
    `<button class="avatar-btn" data-conto type="button" aria-label="Chi sei: ${esc(multi ? C.name : profiloAtt.nome)}. Cambia profilo">${avatar(multi ? C.stemma : profiloAtt.stemma)}</button>`;
}
function apriConto() {
  const f = $("contoFoglio"), multi = !perMaster && ids.length > 1;
  f.innerHTML = `<div class="maniglia" aria-hidden="true"></div>
    <div class="fc-chi">${avatar(profiloAtt.stemma)}<div><b>${esc(profiloAtt.nome)}</b><small>Sei entrato con questo profilo</small></div></div>
    ${multi ? `<p class="sez" style="margin:20px 6px 2px">Le tue schede</p><div class="fc-lista">${ids.map(k => `<button data-passa="${k}" type="button">${avatar(PERSONAGGI[k].stemma, { classe: "av" })}<span class="riga-t"><b>${esc(PERSONAGGI[k].name)}</b><small>Livello ${STATE[k].level}</small></span>${k === cur ? SPUNTA : ""}</button>`).join("")}</div>` : ""}
    <button class="bv largo" data-esci-conto type="button">Cambia profilo</button>
    <p class="nota">Per rientrare servirà di nuovo il PIN. Le schede si salvano da sole, anche nello storico delle copie.</p>`;
  f.classList.add("aperto"); f.setAttribute("aria-hidden", "false"); $("contoVeil").classList.add("aperto");
}
function chiudiConto() { $("contoFoglio").classList.remove("aperto"); $("contoFoglio").setAttribute("aria-hidden", "true"); $("contoVeil").classList.remove("aperto"); }
/* passare all'altra scheda (Rombosogliola ↔ Ireena) restando sulla stessa pagina */
function passaA(k) { if (k === cur) return; const sez = sezione(); go(k); if (PAGINE.some(([p]) => p === sez)) vaiA(sez, false); }
$("navConto").addEventListener("click", e => {
  const p = e.target.closest("[data-passa]"); if (p) { passaA(p.dataset.passa); return; }
  if (e.target.closest("[data-conto]")) apriConto();
});
$("contoFoglio").addEventListener("click", e => {
  const p = e.target.closest("[data-passa]"); if (p) { passaA(p.dataset.passa); chiudiConto(); return; }
  if (e.target.closest("[data-esci-conto]")) { chiudiConto(); chiediUscita(); }
});
$("contoVeil").addEventListener("click", chiudiConto);
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("contoFoglio").classList.contains("aperto")) chiudiConto(); });

/* scorrendo: il titolo compare in alto con la sfumatura che fa da bordo */
addEventListener("scroll", () => document.body.classList.toggle("scorso", scrollY > 60), { passive: true });
/* i PF in alto: quando la carta dei PF non si vede (altre pagine, scontro, scorrendo) */
let pfVisibile = true;
function aggiornaNavPf() {
  const el = $("navPf"); if (!el) return;
  el.hidden = perMaster || !S || (pfVisibile && sezione() === "scheda");
  /* con i PF in alto non c'è posto per il titolo piccolo: la pagina la dice già la barra in basso */
  document.body.classList.toggle("con-pf", !el.hidden);
}
try { new IntersectionObserver(([en]) => { pfVisibile = en.isIntersecting; aggiornaNavPf(); }, { threshold: 0 }).observe(document.querySelector(".pf")); }
catch (_) { pfVisibile = false; }

/* ---------- PF e annulla ---------- */
function hideLast() { lastMove = null; $("float").hidden = true; }
const snap = () => ({ who: cur, hp: S.hp, temp: S.temp, riduzione: S.riduzione || 0, deathS: S.deathS, deathF: S.deathF });
function remember(label, prima) { lastMove = prima; showFloat(label, true); }
/* Danno, Cura, Temporanei: si apre un tastierino grande (niente tastiera del telefono, niente numeri al contrario) */
let pfModo = null, pfVal = "";
const PF_TESTI = { danno: ["Danno", "Quanti PF perdi? Prima si tolgono i temporanei."], cura: ["Cura", "Quanti PF recuperi? Non si supera il massimo."], temp: ["Punti ferita temporanei", "Quanti PF temporanei hai adesso? Zero li toglie."],
  massimo: ["Massimo ridotto", "Di quanto è ridotto il tuo massimo dei PF (un morso, una maledizione)? Resta anche dopo il riposo lungo, finché l'effetto non finisce. Zero lo toglie."] };
function apriPf(modo) {
  if (!S) return;
  pfModo = modo; pfVal = "";
  $("pfTit").textContent = PF_TESTI[modo][0]; $("pfIntro").textContent = PF_TESTI[modo][1];
  $("pfOk").className = `btn ${modo === "danno" ? "dmg" : modo === "cura" ? "heal" : "up"}`;
  if (modo === "massimo" && S.riduzione) pfVal = String(S.riduzione);
  mostraPf(); $("pfVeil").hidden = false;
}
function mostraPf() { $("pfNum").textContent = pfVal || "0"; $("pfOk").disabled = !pfVal && pfModo !== "temp" && pfModo !== "massimo"; }
function applicaPf(modo, n) {
  const prima = snap();
  if (modo === "danno") {
    if (!n) return;
    Object.assign(S, danno(S, n)); change(); remember(`−${n} PF`, prima);
    controllaConcentrazione(n);
  } else if (modo === "cura") {
    if (!n) return;
    if (S.hp === 0) { S.deathS = 0; S.deathF = 0; } S.hp = cura(S, n).hp; change(); remember(`+${n} PF`, prima);
  } else if (modo === "massimo") {
    Object.assign(S, riduci(S, n)); change(); remember(S.riduzione ? `Massimo ridotto di ${S.riduzione}` : "Massimo tornato normale", prima);
  } else { S.temp = n; change(); remember(S.temp ? `+${S.temp} PF temporanei` : "PF temporanei tolti", prima); }
}
$("bDmg").onclick = () => apriPf("danno");
$("bHeal").onclick = () => apriPf("cura");
$("bTemp").onclick = () => apriPf("temp");
$("bMax").onclick = () => apriPf("massimo");
$("pfTasti").addEventListener("click", e => {
  const b = e.target.closest("[data-pf]"); if (!b) return;
  const v = b.dataset.pf;
  if (v === "c") pfVal = ""; else if (v === "x") pfVal = pfVal.slice(0, -1); else if (pfVal.length < 3) pfVal = (pfVal === "0" ? "" : pfVal) + v;
  mostraPf();
});
$("pfNo").onclick = () => { $("pfVeil").hidden = true; };
$("pfOk").onclick = () => { const n = parseInt(pfVal, 10) || 0; $("pfVeil").hidden = true; applicaPf(pfModo, n); };
$("pfVeil").addEventListener("click", e => { if (e.target === $("pfVeil")) $("pfVeil").hidden = true; });
/* dal computer si può anche scrivere con la tastiera */
document.addEventListener("keydown", e => {
  if ($("pfVeil").hidden) return;
  if (/^[0-9]$/.test(e.key) && pfVal.length < 3) { pfVal = (pfVal === "0" ? "" : pfVal) + e.key; mostraPf(); }
  else if (e.key === "Backspace") { pfVal = pfVal.slice(0, -1); mostraPf(); }
  else if (e.key === "Enter") $("pfOk").click();
  else if (e.key === "Escape") $("pfVeil").hidden = true;
});
$("undoHp").onclick = () => {
  if (!lastMove || lastMove.who !== cur) return hideLast();
  clearTimeout(floatTimer);
  Object.assign(S, { hp: lastMove.hp, temp: lastMove.temp, riduzione: lastMove.riduzione, deathS: lastMove.deathS, deathF: lastMove.deathF }); hideLast(); change(); toast("Annullato");
};

/* ---------- concentrazione ----------
   Chi si concentra su un incantesimo e subisce danni fa un tiro salvezza su Costituzione: CD 10 o metà dei danni, se di più.
   A 0 PF la concentrazione finisce da sola. */
let scegliDurata = null;
function controllaConcentrazione(n) {
  if (!S || !S.conc || n <= 0) return;
  if (S.hp === 0) { const era = S.conc; S.conc = ""; change(); toast(`A 0 PF: concentrazione su ${era} persa`, 5000); return; }
  const X = D(), cd = Math.max(10, Math.floor(n / 2));
  const guerra = (S.asi || []).some(a => a.feat === "incantatore-guerra");
  $("concTxt").textContent = `${C.name} ha subito ${n} danni mentre si concentra su ${S.conc}.`;
  $("concCd").textContent = `CD ${cd}`;
  $("concTs").textContent = `il tuo tiro: d20 ${sg(X.saves.cos)}${guerra ? ", con vantaggio (Incantatore da guerra)" : ""}`;
  $("concVeil").hidden = false; $("concTenuta").focus();
}
$("concTenuta").onclick = () => { $("concVeil").hidden = true; };
$("concPersa").onclick = () => { $("concVeil").hidden = true; const era = S.conc; S.conc = ""; change(); toast(`Concentrazione su ${era} persa`); };

/** Inizio del turno di un personaggio (lo chiama lo scontro sul telefono di chi lo gioca):
    le condizioni con una durata scendono di un round; quelle arrivate a zero finiscono. Restituisce i nomi finiti. */
export function inizioTurno(k, chiave) {
  const St = STATE[k]; if (!St || !St.durate || !Object.keys(St.durate).length) return [];
  if (chiave && St.turnoContato === chiave) return [];   // già contato (per esempio dopo aver ricaricato la pagina)
  St.turnoContato = chiave || "";
  const finite = [];
  const durate = {};
  for (const [c, n] of Object.entries(St.durate)) { if (n - 1 <= 0) finite.push(c); else durate[c] = n - 1; }
  St.durate = durate;
  if (finite.length) St.conds = St.conds.filter(c => !finite.includes(c));
  if (k === cur) change(); else { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 500); }
  return finite;
}

/* ---------- riposi ---------- */
/* le risorse dichiarate dal personaggio (slot, Incanalare divinità…) si ricaricano col riposo indicato */
const risorseDi = riposi => (C.risorse ? C.risorse(S.level, D(), S) : []).filter(r => riposi.includes(r.riposo));
$("shortRest").onclick = () => {
  S.re = 0; S.ai = 0; risorseDi(["breve"]).forEach(r => S[r.k] = 0); change();
  toast(C.surge || C.risorse ? "Riposo breve: risorse ricaricate" : "Riposo breve: Recuperare energie ricaricato");
};
$("longRest").onclick = () => {
  const back = Math.max(1, Math.floor(S.level / 2));
  risorseDi(["breve", "lungo"]).forEach(r => S[r.k] = 0); if (C.riserva && C.riserva(S.level)) S[C.riserva(S.level).k] = 0; S.conc = "";
  Object.assign(S, dopoRiposoLungo(S)); S.re = 0; S.ai = 0; S.ind = 0; S.dv = Math.max(0, S.dv - back); S.dardo = 0; S.fulmine = 0; S.deathS = 0; S.deathF = 0; if (S.exh > 0) S.exh--;
  hideLast(); change(); toast(`Riposo lungo: PF pieni, ${back} dadi vita recuperati${S.riduzione ? ` · il massimo resta ridotto di ${S.riduzione}` : ""}`, S.riduzione ? 5000 : undefined);
};

/* ---------- passaggio di livello ----------
   Cosa arriva al nuovo livello (dalla classe) e cosa si sceglie: punteggi o talento, stile di combattimento,
   opzioni della classe e della sottoclasse, e quelle del Calderone di Tasha se il master le usa. */
let pick = null;
const NC = { for: "Forza", des: "Destrezza", cos: "Costituzione", int: "Intelligenza", sag: "Saggezza", car: "Carisma" };
const pfTalenti = St => (St.asi || []).reduce((n, a) => n + (((talento(a.feat) || {}).effetti || {}).pfLivello || 0), 0);
/* cosa porta il livello in più nella classe scelta (per chi ha una sola classe, sempre quella) */
const passo = () => C.passo(S, pick.classe);
function openLevel() {
  pick = { classe: C.classiPerLivello(S)[0].id, sel: [], feat: "", featAb: null, abilita: [], style: null, scelte: {}, togli: "", metti: "" };
  pick.mode = passo().asi ? "two" : null;
  $("lvTitle").textContent = `${C.name} · livello ${S.level + 1}`;
  riepilogoLivello(); renderChoice(); $("veil").hidden = false; $("lvOk").focus();
}
function riepilogoLivello() {
  const L = S.level + 1, X = D(), P2 = prof(L), st = passo();
  const dopo = C.livelliDopo(S, st.id);
  const dadi = dopo ? [C.dadiVita(S), C.dadiVita({ ...S, livelli: dopo })] : [`${S.level}d${st.dado}`, `${L}d${st.dado}`];
  const rows = [["Punti ferita massimi", `${S.maxhp} → ${S.maxhp + st.pfMedia + X.M.cos + pfTalenti(S)}`], ["Dadi vita", `${dadi[0]} → ${dadi[1]}`]];
  if (P2 !== X.P) rows.push(["Bonus di competenza", `${sg(X.P)} → ${sg(P2)}`]);
  $("lvChanges").innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join("") +
    st.novita.map(([a, b]) => `<li class="new"><span>${esc(a)}</span><span class="nuovo-t">${esc(b)}</span></li>`).join("");
}
const seg = (attr, voci, attivo) => `<div class="seg">${voci.map(([v, t, dis]) => `<button ${attr}="${esc(v)}" aria-pressed="${attivo === v}"${dis ? " disabled" : ""}>${esc(t)}</button>`).join("")}</div>`;
function sezioneTalento(L) {
  const presi = S.asi.filter(a => a.feat).map(a => a.feat);
  const lista = talentiDisponibili({ scores: S.scores, presi, magia: C.magiaDa(L), armature: C.armature || [], tasha: opzioni().tasha });
  const t = talento(pick.feat);
  let h = `<select id="featSel" class="sel-talento" aria-label="Talento"><option value="">Scegli un talento…</option>
    ${["PHB", "Tasha"].map(f => { const v = lista.filter(x => x.fonte === f); return v.length ? `<optgroup label="${f === "PHB" ? "Manuale del Giocatore" : "Calderone di Tasha"}">${v.map(x => `<option value="${x.id}"${x.id === pick.feat ? " selected" : ""}>${esc(x.nome)}</option>`).join("")}</optgroup>` : ""; }).join("")}</select>`;
  if (t) {
    h += `<p class="desc-talento">${esc(t.testo)}${requisiti(t) ? `<small>Requisiti: ${esc(requisiti(t))}</small>` : ""}</p>`;
    if (t.piu1 && t.piu1.length > 1) h += `<div class="lbl">+1 a quale caratteristica?</div>` + seg("data-fab", t.piu1.map(k => [k, `${NC[k]} ${S.scores[k]}`, S.scores[k] >= 20]), pick.featAb);
    const nAb = (t.effetti || {}).abilita;
    if (nAb) {
      const X = D(), libere = X.skills.filter(x => !x.p).map(x => x.n);
      h += `<div class="lbl">Competenza in ${nAb === 1 ? "un'abilità" : nAb + " abilità"} (${pick.abilita.length}/${nAb})</div><div class="seg">${libere.map(n => `<button data-fsk="${esc(n)}" aria-pressed="${pick.abilita.includes(n)}"${!pick.abilita.includes(n) && pick.abilita.length >= nAb ? " disabled" : ""}>${esc(n)}</button>`).join("")}</div>`;
    }
  }
  return h;
}
function renderChoice() {
  const L = S.level + 1, opz = opzioni(), st = passo(); let h = "";
  /* prima si sceglie quale classe sale: una delle proprie, oppure una nuova (multiclasse, con i requisiti del manuale) */
  const nuove = C.classiNuove(S);
  if (C.multiclasse || nuove.length) {
    h += `<div class="choice"><div class="lbl">Quale classe sale di livello?</div>` +
      seg("data-classe", [...C.classiPerLivello(S).map(c => [c.id, `${c.nome} ${c.livello} → ${c.livello + 1}`]), ...(nuove.length ? [["+", "Nuova classe…"]] : [])], pick.nuova ? "+" : pick.classe);
    if (pick.nuova) h += `<select id="clNuova" class="sel-talento" aria-label="Classe nuova"><option value="">Scegli la classe…</option>${nuove.map(c =>
        `<option value="${c.id}"${c.ok ? "" : " disabled"}${c.id === pick.classe ? " selected" : ""}>${esc(c.nome)}${c.inArrivo ? " (in arrivo)" : c.manca ? ` (serve ${esc(c.manca)})` : ""}</option>`).join("")}</select>
      <div class="hint">Multiclasse: parti dal 1° livello della classe nuova. Serve almeno 13 nelle caratteristiche richieste, anche per la classe che hai già.</div>`;
    h += `</div>`;
  }
  if (st.asi) {
    h += `<div class="choice"><div class="lbl">Aumento dei punteggi o talento</div>` +
      seg("data-mode", [["two", "+1 a due"], ["one", "+2 a una"], ["feat", "Talento"]], pick.mode);
    if (pick.mode === "feat") h += sezioneTalento(L);
    else {
      const need = pick.mode === "one" ? 1 : 2, step = pick.mode === "one" ? 2 : 1;
      h += `<div class="abpick">${AB.map(k => {
        const sc = S.scores[k], on = pick.sel.includes(k), dis = !on && (sc + step > 20 || pick.sel.length >= need);
        return `<button data-ab="${k}" aria-pressed="${on}" ${dis ? "disabled" : ""}>${ABN[k]} ${sc}${on ? " → " + (sc + step) : ""}</button>`;
      }).join("")}</div><div class="hint">${pick.mode === "one" ? "Scegli una caratteristica." : "Scegli due caratteristiche diverse."} Massimo 20.</div>`;
    }
    h += `</div>`;
  }
  if (st.stile) {
    const v = stiliPer(st.id, S.styles, opz.tasha);
    h += `<div class="choice"><div class="lbl">${S.styles.length ? "Stile di combattimento aggiuntivo" : "Stile di combattimento"}</div>` +
      seg("data-style", v.map(x => [x.nome, x.nome + (x.fonte === "Tasha" ? " ·T" : "")]), pick.style) +
      `<div class="hint">${pick.style ? esc(STYLES[pick.style]) : "Scegline uno."}</div></div>`;
  }
  st.scelte.forEach(c => {
    if (c.tipo === "cambio-stile") {
      const nuovi = stiliPer(st.id, S.styles, opz.tasha);
      h += `<div class="choice"><div class="lbl">${esc(c.titolo)} <small>facoltativo</small></div>
        <div class="due-sel"><select id="stTogli" aria-label="Stile da togliere"><option value="">Non cambiare</option>${S.styles.map(x => `<option${pick.togli === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>
        <select id="stMetti" aria-label="Stile nuovo"${pick.togli ? "" : " disabled"}><option value="">…con</option>${nuovi.map(x => `<option${pick.metti === x.nome ? " selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></div></div>`;
      return;
    }
    const v = pick.scelte[c.id], o = c.opzioni.find(x => x.id === v);
    h += `<div class="choice"><div class="lbl">${esc(c.titolo)}</div>` + seg(`data-sc-${c.id}`, c.opzioni.map(x => [x.id, x.nome]), v) +
      (o && o.testo ? `<div class="hint">${esc(o.testo)}</div>` : "") + `</div>`;
  });
  if (opz.tasha === false && st.asi) h += `<p class="hint">Le opzioni del Calderone di Tasha sono spente: le accende il master.</p>`;
  $("lvChoice").innerHTML = h; $("lvOk").disabled = !choiceDone();
}
function choiceDone() {
  if (pick.nuova && !C.classiNuove(S).some(c => c.ok && c.id === pick.classe)) return false;
  const st = passo();
  if (st.asi) {
    if (pick.mode === "feat") {
      const t = talento(pick.feat); if (!t) return false;
      if (t.piu1 && t.piu1.length > 1 && !pick.featAb) return false;
      if ((t.effetti || {}).abilita && pick.abilita.length !== t.effetti.abilita) return false;
    } else if (pick.sel.length !== (pick.mode === "one" ? 1 : 2)) return false;
  }
  if (st.stile && !pick.style) return false;
  if (st.scelte.some(c => c.tipo !== "cambio-stile" && !pick.scelte[c.id])) return false;
  if (pick.togli && !pick.metti) return false;
  return true;
}
function confirmLevel() {
  if (!choiceDone()) return;
  versione(cur, clone(S), "prima di salire di livello", true);
  const before = { level: S.level, maxhp: S.maxhp, scores: clone(S.scores), styles: clone(S.styles), asi: clone(S.asi), scelte: clone(S.scelte || []), livelli: clone(S.livelli || null) };
  const L = S.level + 1, oldCon = mod(S.scores.cos), pfPrima = pfTalenti(S), st = passo();
  if (st.asi) {
    if (pick.mode === "feat") {
      const t = talento(pick.feat), ab = t.piu1 ? (t.piu1.length === 1 ? t.piu1[0] : pick.featAb) : null;
      if (ab) S.scores[ab] = Math.min(20, S.scores[ab] + 1);
      S.asi.push({ level: L, feat: t.id, ...(ab ? { scelta: ab } : {}), ...(pick.abilita.length ? { abilita: pick.abilita.slice() } : {}) });
    } else { const step = pick.mode === "one" ? 2 : 1; pick.sel.forEach(k => S.scores[k] = Math.min(20, S.scores[k] + step)); S.asi.push({ level: L, abil: pick.sel, step }); }
  }
  if (pick.style) S.styles.push(pick.style);
  if (pick.togli && pick.metti) S.styles = S.styles.map(x => x === pick.togli ? pick.metti : x);
  S.scelte = [...(S.scelte || []), ...Object.entries(pick.scelte).map(([id, valore]) => ({ livello: L, classe: st.id, id, valore }))];
  const livelliNuovi = C.livelliDopo(S, st.id); if (livelliNuovi) S.livelli = livelliNuovi;
  /* PF: media del dado + Costituzione; se la Costituzione è salita conta anche per i livelli passati; Robusto idem */
  const newCon = mod(S.scores.cos), pfDopo = pfTalenti(S);
  const gain = st.pfMedia + newCon + (newCon - oldCon) * S.level + pfDopo + (pfDopo - pfPrima) * S.level;
  S.level = L; S.maxhp += gain; S.hp += gain; S.history = [...S.history, before].slice(-10);
  $("veil").hidden = true; change(); toast(`Livello ${L}: +${gain} PF massimi`);
}
/* tornare indietro di un livello: i conti stanno in regole/livelli.js; vale per la scheda aperta e, dal Tavolo, per il master */
function applicaLivelloPrima(St) {
  const c = livelloPrima(St); if (!c) return false;
  const { livelli, ...resto } = c; Object.assign(St, resto);
  if (livelli) St.livelli = livelli; else delete St.livelli;
  return true;
}
function undoLevel() {
  if (!applicaLivelloPrima(S)) return;
  change(); toast(`${C.femminile ? "Tornata" : "Tornato"} al livello ${S.level}`);
}
/** Il master, dal Tavolo, fa tornare indietro di un livello un personaggio (un errore nel salire). Si può ripetere. */
export function tornaIndietroPg(k) {
  const St = STATE[k]; if (!St || !applicaLivelloPrima(St)) return null;
  salvaDopo(k); return St.level;
}
$("lvUp").onclick = openLevel;
$("lvCancel").onclick = () => { $("veil").hidden = true; };
$("veil").addEventListener("click", e => { if (e.target === $("veil")) $("veil").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("veil").hidden) $("veil").hidden = true; });
$("lvOk").onclick = confirmLevel;
$("undoLv").onclick = () => {
  const u = $("undoLv"), b = S.history[S.history.length - 1]; if (!b) return;
  if (u.dataset.armed) { delete u.dataset.armed; u.textContent = "Annulla l'ultimo"; undoLevel(); }
  else { u.dataset.armed = "1"; u.textContent = `Tocca di nuovo per tornare al ${b.level}`; setTimeout(() => { delete u.dataset.armed; u.textContent = "Annulla l'ultimo"; }, 4000); }
};
$("lvChoice").addEventListener("change", e => {
  if (e.target.id === "clNuova") { pick = { ...pick, classe: e.target.value, style: null, scelte: {}, togli: "", metti: "" }; pick.mode = passo().asi ? (pick.mode || "two") : null; riepilogoLivello(); renderChoice(); }
  if (e.target.id === "featSel") { pick.feat = e.target.value; pick.featAb = null; pick.abilita = []; renderChoice(); }
  if (e.target.id === "stTogli") { pick.togli = e.target.value; if (!pick.togli) pick.metti = ""; renderChoice(); }
  if (e.target.id === "stMetti") { pick.metti = e.target.value; renderChoice(); }
});
$("lvChoice").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.classe) { const nuova = b.dataset.classe === "+"; pick = { ...pick, nuova, classe: nuova ? "" : b.dataset.classe, style: null, scelte: {}, togli: "", metti: "" }; pick.mode = passo().asi ? (pick.mode || "two") : null; riepilogoLivello(); }
  else if (b.dataset.mode) { pick.mode = b.dataset.mode; pick.sel = []; }
  else if (b.dataset.ab) { const k = b.dataset.ab; pick.sel = pick.sel.includes(k) ? pick.sel.filter(x => x !== k) : [...pick.sel, k]; }
  else if (b.dataset.style) pick.style = b.dataset.style;
  else if (b.dataset.fab) pick.featAb = b.dataset.fab;
  else if (b.dataset.fsk) { const n = b.dataset.fsk; pick.abilita = pick.abilita.includes(n) ? pick.abilita.filter(x => x !== n) : [...pick.abilita, n]; }
  else { const a = [...b.attributes].find(x => x.name.startsWith("data-sc-")); if (!a) return; pick.scelte[a.name.slice(8)] = a.value; }
  renderChoice();
});

/* ---------- armi ---------- */
$("wEdit").onclick = () => { editW = !editW; render(); };
$("wForm").addEventListener("submit", e => {
  e.preventDefault();
  const n = $("wName").value.trim(); if (!n) { $("wName").focus(); return; }
  const dice = $("wDice").value.split("d").map(Number), ranged = $("wRanged").checked, mun = ranged ? $("wMun").value : "";
  const arma = { id: "w" + Date.now().toString(36), n, t: $("wType").value, note: $("wNote").value.trim(), ab: $("wAb").value, dice, magic: +$("wMagic").value || 0, ranged };
  if (mun === "+") {   /* munizioni speciali nuove, con il loro nome e quante sono */
    const nome = $("wMunNome").value.trim(); if (!nome) { $("wMunNome").focus(); return; }
    const sc = aggiungiScorta(S, nome, parseInt($("wMunN").value, 10)); S.munizioni = sc.munizioni; arma.mun = sc.id;
  } else if (mun) arma.mun = mun;
  else if (ranged) arma.ammo = true;
  S.weapons = [...S.weapons, arma];
  if (!S.inv.includes(n)) S.inv.push(n);
  $("wForm").reset(); $("wMunWrap").hidden = true; $("wMunNuove").hidden = true; change(); toast(`${n}: aggiunta`);
});
/* un'arma a distanza: con quali munizioni? comuni (con la nostra regola non si contano) o speciali, anche nuove */
$("wRanged").addEventListener("change", e => {
  $("wMunWrap").hidden = !e.target.checked; if (!e.target.checked) return;
  $("wAb").value = "des";
  $("wMun").innerHTML = `<option value="">Comuni${opzioni().munizioniInfinite ? " (infinite, non si contano)" : ""}</option>` +
    (S.munizioni || []).map(m => `<option value="${esc(m.id)}">${esc(m.nome)} (${m.n})</option>`).join("") + `<option value="+">Nuove munizioni speciali…</option>`;
  $("wMunNuove").hidden = true;
});
$("wMun").addEventListener("change", e => { $("wMunNuove").hidden = e.target.value !== "+"; if (e.target.value === "+") $("wMunNome").focus(); });

/* ---------- tocchi sulla scheda ---------- */
$("vistaScheda").addEventListener("click", e => {
  if (!S) return;
  /* losanghe: si tocca una piena per spenderla (con quelle dopo), una vuota per riaverla */
  const p = e.target.closest(".pip[data-k]");
  if (p) {
    const k = p.dataset.k, i = +p.dataset.i, max = +p.closest(".pips").dataset.max, avere = p.hasAttribute("data-avere");
    const pieni = avere ? (S[k] || 0) : max - (S[k] || 0), nuovi = i < pieni ? i : i + 1;
    S[k] = avere ? nuovi : max - nuovi; change(); return;
  }
  /* "Lancia": lo slot si spende da solo (il più basso libero, dal livello dell'incantesimo in su) e la concentrazione si segna */
  const la = e.target.closest("[data-lancia]");
  if (la) {
    const X = D(), liv = +la.dataset.liv, slot = slotDi(X.L, X).find(x => x.liv >= liv && x.usati < x.max);
    if (!slot) { toast("Slot finiti per questo livello: tornano col riposo lungo", 4000); return; }
    S["slot" + slot.liv] = (S["slot" + slot.liv] || 0) + 1;
    const conc = la.hasAttribute("data-conc-l"), prima = S.conc;
    if (conc) S.conc = la.dataset.lancia;
    change();
    toast(`${la.dataset.lancia} · slot di ${slot.liv}°${conc ? (prima && prima !== S.conc ? ` · finisce ${prima}` : " · concentrazione") : ""}`, 4000);
    return;
  }
  const dp = e.target.closest(".pip[data-dk]");
  if (dp) { const k = dp.dataset.dk, i = +dp.dataset.i; S[k] = (i < S[k]) ? i : i + 1; change(); return; }
  const c = e.target.closest(".chip[data-c]");
  if (c) {
    const n = c.dataset.c;
    if (S.conds.includes(n)) { S.conds = S.conds.filter(x => x !== n); if (S.durate) delete S.durate[n]; scegliDurata = null; change(); }
    else { S.conds = [...S.conds, n]; scegliDurata = n; change(); }
    return;
  }
  const du = e.target.closest("[data-dur]");
  if (du && scegliDurata) { const n = +du.dataset.dur; S.durate = { ...(S.durate || {}) }; if (n) S.durate[scegliDurata] = n; else delete S.durate[scegliDurata]; scegliDurata = null; change(); return; }
  if (e.target.closest("[data-conc-fine]")) { S.conc = ""; change(); toast("Concentrazione terminata"); return; }
  const cc = e.target.closest("[data-conc]");
  if (cc) { S.conc = cc.dataset.conc; change(); toast(`Concentrazione: ${S.conc}`); return; }
  const ic = e.target.closest("[data-inc]");
  if (ic) { editInc = ic.dataset.inc || null; render(); return; }
  const icn = e.target.closest("[data-inc-n]");
  if (icn && !icn.disabled) {
    const k = icn.dataset.incK, n = icn.dataset.incN, lim = +icn.dataset.incMax, v = S[k] || [];
    S[k] = v.includes(n) ? v.filter(x => x !== n) : [...v, n].slice(0, lim); change(); return;
  }
  const po = e.target.closest("[data-pool]");
  if (po) { const k = po.dataset.pool; S[k] = Math.max(0, Math.min(+po.dataset.max, (S[k] || 0) - +po.dataset.n)); change(); return; }
  const ex = e.target.closest("[data-exh]");
  if (ex) { S.exh = Math.max(0, Math.min(6, S.exh + +ex.dataset.exh)); change(); return; }
  const mu = e.target.closest("[data-mun]");
  if (mu) {
    const id = mu.dataset.mun, d = +mu.dataset.d;
    if (id === "comuni") S.ammo = Math.max(0, (S.ammo || 0) + d);
    else S.munizioni = (S.munizioni || []).map(m => m.id === id ? { ...m, n: Math.max(0, m.n + d) } : m);
    change(); return;
  }
  const md = e.target.closest("[data-mundel]");
  if (md) {   /* una scorta tolta: le armi che la usavano tornano alle munizioni comuni */
    const id = md.dataset.mundel;
    S.munizioni = (S.munizioni || []).filter(m => m.id !== id);
    S.weapons = S.weapons.map(w => w.mun === id ? (({ mun, ...resto }) => ({ ...resto, ammo: true }))(w) : w);
    change(); return;
  }
  const co = e.target.closest("[data-coin]");
  if (co) { const k = co.dataset.coin; S.coins[k] = Math.max(0, (S.coins[k] || 0) + +co.dataset.step); change(); return; }
  const at = e.target.closest("[data-att]");
  if (at && !at.disabled) { const t = S.inv[+at.dataset.att]; S.attuned = S.attuned.includes(t) ? S.attuned.filter(x => x !== t) : [...S.attuned, t].slice(0, 3); change(); return; }
  const wd = e.target.closest("[data-wdel]");
  if (wd) {
    const id = wd.dataset.wdel;
    if (wd.dataset.armed) { S.weapons = S.weapons.filter(w => w.id !== id); change(); }
    else { wd.dataset.armed = "1"; wd.textContent = "Togli?"; wd.classList.add("armed"); setTimeout(() => { if (wd.isConnected) { delete wd.dataset.armed; wd.textContent = "×"; wd.classList.remove("armed"); } }, 3500); }
    return;
  }
  const qo = e.target.closest("[data-qta-ogg]");
  if (qo && !qo.disabled) {
    const i = +qo.dataset.qtaOgg, vecchio = S.inv[i], q = quantita(vecchio), nuovo = conQuantita(q.nome, Math.max(1, q.n + +qo.dataset.d));
    S.inv = S.inv.map((t, k) => k === i ? nuovo : t); S.attuned = S.attuned.map(t => t === vecchio ? nuovo : t); change(); return;
  }
  const del = e.target.closest("[data-del]");
  if (del) { const t = S.inv[+del.dataset.del]; S.inv.splice(+del.dataset.del, 1); if (!S.inv.includes(t)) S.attuned = S.attuned.filter(x => x !== t); change(); return; }
});
COINS.forEach(([k]) => $("c_" + k).addEventListener("input", e => { S.coins[k] = Math.max(0, parseInt(e.target.value, 10) || 0); change(); }));
$("addForm").addEventListener("submit", e => {
  e.preventDefault(); const v = $("newItem").value.trim(); if (!v) return; S.inv = aggiungiOggetto(S.inv, v); $("newItem").value = "";
  const w = $("isWeapon").checked; $("isWeapon").checked = false; change();
  if (w) {
    editW = true; render(); $("wName").value = v; $("wForm").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => $("wDice").focus({ preventScroll: true }), 350);
    toast(`${v}: completa i dati dell'arma`, 4000);
  }
});
$("notes").addEventListener("input", e => { S.notes = e.target.value; change(); });

