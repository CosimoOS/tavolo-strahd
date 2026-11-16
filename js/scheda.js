/* La scheda del personaggio. È la logica della scheda originale, quasi riga per riga:
   cambia solo da dove arrivano i dati (archivio.js) e quali personaggi mostra (dipende dal profilo). */
import { AB, ABN, STYLES, CONDS, COINS, mod, prof, sg, clone, calcola, attacchiOrdinati, normalizza, quantita, conQuantita, aggiungiOggetto } from "./regole/base.js";
import { talento, talentiDisponibili, requisiti } from "./regole/talenti.js";
import { stiliPer } from "./regole/stili.js";
import { INCANTESIMI_ATTACCO, EXTRA_DANNI, moltTrucchetto, partiDanno } from "./regole/magia.js";
import { opzioni, suOpzioni } from "./campagna.js";
import { PERSONAGGI } from "./personaggi/index.js";
import { stemma } from "./stemmi.js";

const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t; return e.innerHTML; }

/* ---------- stato ----------
   ids: i personaggi di questo profilo · cur: quello mostrato · C: le sue regole · S: il suo stato */
let arch = null, ids = [], cur = null, C = null, S = null;
const STATE = {}, LOADED = {};
let ascolti = [], canWrite = true, editW = false;
const saving = {}, pending = {}, timers = {};
let lastMove = null, floatTimer = null, chiediUscita = () => {}, onScontro = () => {}, onScheda = () => {};

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
  const inScontro = $("vistaScheda").classList.contains("in-scontro");
  document.querySelectorAll(".switch button[data-char]").forEach(b => b.setAttribute("aria-pressed", b.dataset.char === cur && !inScontro));
  $("charName").textContent = C.name; $("klassName").textContent = C.classe; $("subclass").textContent = C.sub;
  if ($("crest").dataset.tipo !== C.stemma) { $("crest").innerHTML = stemma(C.stemma, { piena: true }); $("crest").dataset.tipo = C.stemma; }
  $("tags").innerHTML = C.tags.map(t => `<span>${esc(t)}</span>`).join("");
  $("lvV").textContent = L; $("lvUp").hidden = L >= 20; $("undoLv").hidden = !S.history.length;
  $("caV").textContent = S.ca + C.caBonus(L); $("iniV").textContent = sg(X.ini); $("iniL").textContent = C.ready(L) ? "Iniz. vant." : "Iniz."; $("spdV").textContent = S.speed || "9 m";
  $("resist").hidden = !S.res.length && !S.temp;
  $("resist").innerHTML = (S.temp ? `<span class="tmp">+${S.temp} PF temporanei</span>` : "") + S.res.map(r => `<span>Resistenza: ${esc(r.toLowerCase())}</span>`).join("");
  $("bcV").textContent = "BC " + sg(X.P); $("ppV").textContent = "Percezione passiva " + X.pp;
  $("reTxt").textContent = `Azione bonus · 1d10 + ${L} PF · ${C.reUses(L) > 1 ? "2 usi per riposo" : "riposo breve"}`; $("rePips").dataset.max = C.reUses(L);
  $("dvName").textContent = C.multiclasse ? `Dadi vita ${C.dadiVita(S)}` : `Dadi vita d${C.hitDie}`;
  $("dvTxt").textContent = `Durante un riposo breve · ${C.multiclasse ? "ogni dado" : "1d" + C.hitDie} ${sg(X.M.cos)} PF ciascuno`;
  $("dvPips").dataset.max = L;
  $("reRow").hidden = C.secondWind === false;
  $("extraRes").innerHTML = (C.risorse ? C.risorse(L, X, S) : []).filter(r => r.max > 0).map(r => `<div class="res">
      <div class="what"><div>${esc(r.nome)}</div><small>${esc(r.testo)}</small></div>
      <div class="act"><div class="pips" data-res="${r.k}" data-max="${r.max}"></div></div></div>`).join("") + (C.riserva && C.riserva(L, X) ? (() => {
      const r = C.riserva(L, X), resto = Math.max(0, r.max - (S[r.k] || 0));
      return `<div class="res riserva"><div class="what"><div>${esc(r.nome)} <b class="num">${resto}</b><small class="di"> / ${r.max}</small></div><small>${esc(r.testo)}</small></div>
        <div class="act">${[-5, -1, 1].map(n => `<button class="btn step" data-pool="${r.k}" data-n="${n}" data-max="${r.max}" aria-label="${n < 0 ? "Spendi" : "Restituisci"} ${Math.abs(n)}">${n < 0 ? "−" : "+"}${Math.abs(n)}</button>`).join("")}</div></div>`;
    })() : "");
  $("atkNota").hidden = !(C.atkNota && C.atkNota(L)); $("atkNota").textContent = C.atkNota ? C.atkNota(L) : "";
  $("ammoRow").hidden = !S.weapons.some(w => w.ammo);
  renderIncantesimi(L, X);
  $("aiRow").hidden = !C.surge; $("aiPips").dataset.max = C.surges(L) || 1;
  $("inspRow").hidden = !C.insp; $("armorSec").hidden = !C.armor;
  $("indRow").hidden = !C.indom(L); $("indPips").dataset.max = C.indom(L) || 1; $("indName").textContent = C.indName;
  const cm = C.critMin(L);
  $("atkTxt").textContent = `${cm === 20 ? "Critico con 20" : `Critico ${cm}–20`} · ${["", "un attacco", "due attacchi", "tre attacchi", "quattro attacchi"][C.attacks(L)]}`;

  $("hpNow").textContent = S.hp; $("miniHp").textContent = S.hp; $("hpMax").textContent = S.maxhp; $("miniMax").textContent = " / " + S.maxhp;
  const pct = Math.max(0, Math.min(1, S.hp / S.maxhp));
  $("gFill").style.width = (pct * 100) + "%"; $("hpBar").setAttribute("aria-valuenow", S.hp); $("hpBar").setAttribute("aria-valuemax", S.maxhp);
  $("hpBar").dataset.state = pct <= .25 ? "low" : pct <= .5 ? "mid" : "ok";

  $("abil").innerHTML = AB.map(k => `<div class="ab"><div class="shield"><div class="lbl">${ABN[k]}</div><div class="mod">${sg(X.M[k])}</div><div class="sc">${S.scores[k]}</div></div><div class="ts${C.saves.includes(k) ? " p" : ""}">TS ${sg(X.saves[k])}</div></div>`).join("");
  $("skills").innerHTML = X.skills.map(s => `<div class="sk${s.p ? " p" : ""}"><span class="n">${s.n} <small>${ABN[s.a]}</small></span><span class="num">${sg(s.v)}</span></div>`).join("");
  document.querySelector(".atk .wcol").hidden = !editW;
  $("atkBody").innerHTML = attacchiOrdinati(X).map(a => `<tr><td class="nm">${esc(a.n)}${a.magic ? ` <span class="plus">+${a.magic}</span>` : ""}<small>${esc(a.d)}</small></td>
    <td><span class="val">${sg(a.hit)}</span></td>
    <td><span class="val">${a.dice[0]}d${a.dice[1]}${a.mod ? sg(a.mod) : ""}</span></td>${editW ? `<td><button class="x" data-wdel="${a.id}" aria-label="Togli ${esc(a.n)}">×</button></td>` : ""}</tr>`).join("");
  $("wEdit").textContent = editW ? "Fatto" : "Modifica"; $("wForm").hidden = !editW;

  $("feats").innerHTML = C.feats(L, X, S)
    .map(([t, p]) => `<div class="feat"><b>${esc(t)}</b><p>${esc(p)}</p></div>`).join("");
  $("kv").innerHTML = C.kv.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("");

  document.querySelectorAll(".pips[data-res]").forEach(el => {
    const k = el.dataset.res, max = +el.dataset.max; let h = "";
    for (let i = 0; i < max; i++) { const on = i < (S[k] || 0); h += `<button class="pip${on ? " on" : ""}" data-k="${k}" data-i="${i}" aria-label="${on ? "Segnata" : "Libera"}"></button>`; }
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
  $("concRiga").innerHTML = S.conc ? `<span class="conc-on">Concentrazione: <b>${esc(S.conc)}</b></span><button class="btn link" data-conc-fine>Termina</button>`
    : `<span class="hint">Nessuna concentrazione in corso${C.magie && C.magie(S.level, D(), S).length ? ": si attiva dal pulsante sull'incantesimo" : ""}.</span>`;
  $("exh").textContent = S.exh; $("ammo").textContent = S.ammo;
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
}

/* ---------- incantesimi ----------
   Una sezione per ogni classe che lancia incantesimi (Petrus: Ranger e Druido).
   Preparati (paladino, druido): si cambiano dopo un riposo lungo, scegliendo dalla lista completa; quelli della sottoclasse sono sempre pronti.
   Conosciuti (ranger): un numero fisso, che cresce salendo di livello. I trucchetti si scelgono a parte. "Cambia" apre la lista. */
let editInc = null;   // id della classe di cui si stanno cambiando gli incantesimi
function renderIncantesimi(L, X) {
  const magie = C.magie ? C.magie(L, X, S) : [];
  $("spellSec").hidden = !magie.length; if (!magie.length) return;
  $("spellTxt").textContent = magie.length === 1 ? magie[0].testo : "";
  const card = (i, extra = "") => `<div class="spell"><div class="top"><b>${esc(i.n)}</b>${extra || (i.conc ? `<button class="btn link conc-btn" data-conc="${esc(i.n)}"${S.conc === i.n ? " disabled" : ""}>${S.conc === i.n ? "In corso" : "Concentrati"}</button>` : "")}</div>
    <div class="meta"><span class="tag">${i.liv ? i.liv + "° livello" : "trucchetto"}</span>${i.conc ? `<span class="tag">concentrazione</span>` : ""}${i.rituale ? `<span class="tag">rituale</span>` : ""}${i.giur ? `<span class="tag">giuramento</span>` : ""}${i.tasha ? `<span class="tag">Tasha</span>` : ""}${i.xanathar ? `<span class="tag">Xanathar</span>` : ""}</div>
    <p>${esc(i.t)}</p></div>`;
  const scelti = (chiave, lista) => (S[chiave] || []).filter(n => lista.some(i => i.n === n));
  $("spellList").innerHTML = magie.map(m => {
    const lista = m.lista.filter(i => i.liv <= m.max), sc = scelti(m.chiave, lista);
    const tr = m.trucchetti, scT = tr ? scelti(tr.chiave, tr.lista) : [];
    const testa = `${magie.length > 1 ? `<h3 class="inc-classe">${esc(m.nome)} <small>${esc(m.testo)}</small></h3>` : ""}`;
    const conta = `${tr ? `${scT.length} su ${tr.limite} trucchetti · ` : ""}${sc.length} su ${m.limite} ${m.preparati ? "preparati" : "conosciuti"}${m.fissi.length ? ` · ${m.fissi.length} sempre pronti` : ""}`;
    if (editInc !== m.id) {
      return testa + `<div class="inc-testa"><p class="hint">${conta}</p><button class="btn link" data-inc="${m.id}">${m.preparati ? "Cambia i preparati" : "Cambia"}</button></div>` +
        (tr ? tr.lista.filter(i => scT.includes(i.n)).map(i => card(i)).join("") : "") +
        m.fissi.map(i => card(i)).join("") + lista.filter(i => sc.includes(i.n)).map(i => card(i)).join("");
    }
    const voce = (i, chiave, sel, limite) => { const on = sel.includes(i.n);
      return card(i, `<button class="pip${on ? " on" : ""}" data-inc-n="${esc(i.n)}" data-inc-k="${chiave}" data-inc-max="${limite}" aria-pressed="${on}" aria-label="${on ? "Togli" : "Aggiungi"} ${esc(i.n)}"${!on && sel.length >= limite ? " disabled" : ""}></button>`); };
    return testa + `<div class="inc-testa"><p class="hint">${conta}${m.preparati ? ". Si cambiano dopo un riposo lungo." : ""}</p><button class="btn gold" data-inc="">Fatto</button></div>` +
      (tr ? `<p class="lbl inc-liv">Trucchetti</p>` + tr.lista.map(i => voce(i, tr.chiave, scT, tr.limite)).join("") : "") +
      [...Array(m.max)].map((_, k) => `<p class="lbl inc-liv">${k + 1}° livello</p>` + lista.filter(i => i.liv === k + 1).map(i => voce(i, m.chiave, sc, m.limite)).join("")).join("");
  }).join("");
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
  try { await arch.scrivi("personaggi/" + k, clone(STATE[k])); setSync("ok", "Salvata"); }
  catch (e) {
    if (e && e.solaLettura) { canWrite = false; setSync("err", "Sola lettura"); toast("Questa scheda non è tua: puoi guardarla ma non modificarla", 5000); }
    else { setSync("err", "Non salvata"); toast("Modifica non salvata, riprovo alla prossima", 5000); }
  }
  saving[k] = false;
  if (pending[k]) { pending[k] = false; await flush(k); }
}

/* se il master cambia le regole del tavolo (Tasha), la scheda si ridisegna */
suOpzioni(() => { if (S) render(); });

const VISTO = {};   // prima lettura di ogni scheda: non è un colpo appena ricevuto

/* ---------- apertura e chiusura ---------- */
export function apriScheda({ archivio, personaggi, onEsci, scontro }) {
  arch = archivio; ids = personaggi.filter(k => PERSONAGGI[k]); chiediUscita = onEsci; canWrite = true;
  onScontro = (scontro && scontro.apri) || (() => {}); onScheda = (scontro && scontro.chiudi) || (() => {});
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
    if (k === cur) { S = STATE[k]; render(); setSync("ok", dati ? "Sincronizzata" : "Pronta"); }
  }, () => {
    clearTimeout(lento); canWrite = false; setSync("err", "Non salvata");
    toast("Archivio non raggiungibile: le modifiche non vengono salvate", 6000);
  }));
  swOpen(2200);
}

/** Salva ciò che è in sospeso e smette di ascoltare l'archivio. */
export async function chiudiScheda() {
  for (const k of Object.keys(timers)) { clearTimeout(timers[k]); await flush(k); }
  ascolti.forEach(stop => stop()); ascolti = [];
  $("vistaScheda").hidden = true; document.body.classList.remove("in-scheda");
  hideLast(); S = null; cur = null;
  try { history.replaceState(null, "", location.pathname + location.search); } catch (_) {}
}

/** Quello che serve allo scontro per l'iniziativa di un personaggio di questo profilo. */
export function datiIniziativa(k) {
  if (!STATE[k] || !PERSONAGGI[k]) return null;
  const X = calcola(PERSONAGGI[k], STATE[k]);
  return { mod: X.ini, des: STATE[k].scores.des, vantaggio: !!PERSONAGGI[k].ready(X.L) };
}

/** Quello che serve per attaccare dal telefono: armi con bonus e danni, da che numero è critico,
    e gli slot liberi per la Punizione divina (se il personaggio ce l'ha). */
export function datiAttacco(k) {
  if (!STATE[k] || !PERSONAGGI[k]) return null;
  const P = PERSONAGGI[k], St = STATE[k], X = calcola(P, St), L = X.L;
  const slot = (P.risorse ? P.risorse(L, X, St) : []).filter(r => /^slot\d$/.test(r.k))
    .map(r => ({ liv: +r.k.slice(4), liberi: Math.max(0, r.max - (St[r.k] || 0)) }));
  const liberi = liv => (slot.find(s => s.liv === liv) || {}).liberi || 0;
  /* 1. le armi */
  const armi = attacchiOrdinati(X).map(a => ({ n: a.n, tipo: "arma", hit: a.hit, t: (a.t || "").toLowerCase(), nota: a.note || "",
    parti: [{ n: a.dice[0], f: a.dice[1], mod: a.mod, t: (a.t || "").toLowerCase() }], dice: a.dice, mod: a.mod, magic: a.magic }));
  /* 2. gli incantesimi d'attacco che conosce o ha preparato (trucchetti compresi) */
  const magie = P.magie ? P.magie(L, X, St) : [], noti = new Set();
  const incantesimi = [];
  magie.forEach(m => {
    const nomi = [...(St[m.chiave] || []), ...m.fissi.map(i => i.n), ...(m.trucchetti ? St[m.trucchetti.chiave] || [] : [])];
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
    .map(o => ({ ...o, etichetta: "oggetto", disponibile: !o.uso || (St[o.uso] || 0) < o.max, usiRimasti: o.uso ? o.max - (St[o.uso] || 0) : null }));
  /* 4. acqua santa da lanciare, se ce l'ha */
  const acqua = St.inv.some(t => /acqua santa/i.test(t)) ? [{ n: "Acqua santa", tipo: "attacco", hit: X.M.des, consuma: "Acqua santa", etichetta: "oggetto",
    parti: [{ n: 2, f: 6, t: "radianti" }], nota: "lanciata a 6 m: solo contro non morti e immondi", disponibile: true }] : [];
  /* gli extra ai danni che può accendere quando colpisce con un'arma */
  const extra = EXTRA_DANNI.filter(e => (!e.incantesimo || noti.has(e.incantesimo)) && (!e.scelta || (St.scelte || []).some(c => c.id === e.scelta[0] && c.valore === e.scelta[1])))
    .map(e => ({ ...e, disponibile: !e.slot || liberi(e.slot) > 0 }));
  return { nome: P.name, livello: L, critMin: P.critMin(L), attacchi: armi, opzioni: [...armi, ...incantesimi, ...oggetto, ...acqua], extra,
    punizione: !!P.punizione && L >= 2, slot, inv: St.inv.slice() };
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
/** Cura un personaggio (pozione): PF fino al massimo; da 0 PF si riparte e i tiri contro la morte si azzerano. */
export function curaPg(k, n, da) {
  const St = STATE[k]; if (!St) return null;
  if (St.hp === 0) { St.deathS = 0; St.deathF = 0; }
  St.hp = Math.min(St.maxhp, St.hp + n); St.curato = { n, da, t: Date.now() };
  salvaDopo(k); return St.hp;
}
function salvaDopo(k) { if (k === cur) change(); else { clearTimeout(timers[k]); timers[k] = setTimeout(() => flush(k), 300); } }
/** Per gli attacchi del master: nome, CA e resistenze di un personaggio (il telefono del master ha tutte le schede). */
export function bersaglioPg(k) {
  const St = STATE[k], P = PERSONAGGI[k]; if (!St || !P) return null;
  if (P.vediStato) P.vediStato(St);
  return { id: k, nome: P.name, ca: St.ca + P.caBonus(St.level), res: St.res || [], hp: St.hp, maxhp: St.maxhp };
}
/** Il master colpisce un personaggio: tolti i PF (prima quelli temporanei) e salvato.
    "colpito" avvisa il telefono del giocatore, che mostra chi l'ha colpito e chiede la concentrazione. */
export function colpisciPg(k, n, da) {
  const St = STATE[k]; if (!St) return null;
  const t = Math.min(St.temp, n); St.temp -= t; St.hp = Math.max(0, St.hp - (n - t));
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

/* ---------- selettore delle schede ---------- */
function costruisciSelettore() {
  const esci = `<button class="esci" data-esci aria-label="Cambia profilo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 8l-4 4 4 4M6 12h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="nm">Profilo</span></button>`;
  /* "Scontro": due lame incrociate. Nascosto finché lo scontro non lo rende visibile (al master sempre) */
  const scontro = `<button class="scontro" data-scontro hidden aria-pressed="false" aria-label="Scontro"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4l10 10M4 5l1-1M13 16l3-3M15 18l3-3M17.5 17.5l2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 4L9 14M20 5l-1-1M11 16l-3-3M9 18l-3-3M6.5 17.5L4 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="nm">Scontro</span></button>`;
  $("switch").innerHTML = ids.map(k => `<button data-char="${k}" aria-pressed="false" aria-label="${esc(PERSONAGGI[k].name)}">${stemma(PERSONAGGI[k].stemma)}<span class="nm">${esc(PERSONAGGI[k].name)}</span></button>`).join("") + scontro + esci;
}
function go(k) {
  if (!ids.includes(k)) k = ids[0];
  cur = k; C = PERSONAGGI[k]; S = STATE[k]; editW = false; hideLast(); onScheda(); render();
  try { if (location.hash !== "#" + k) history.replaceState(null, "", "#" + k); } catch (_) {}
}
/* il selettore si apre coi nomi, poi si riduce alle sole icone */
let swTimer = null;
function swOpen(ms) { const w = $("switch"); w.classList.add("open"); clearTimeout(swTimer); swTimer = setTimeout(() => w.classList.remove("open"), ms || 1800); }
$("switch").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const w = $("switch");
  if (b.hasAttribute("data-esci")) {
    if (!w.classList.contains("open")) { swOpen(2500); return; }
    chiediUscita(); return;
  }
  if (b.hasAttribute("data-scontro")) { onScontro(); swOpen(1400); return; }
  const inScontro = $("vistaScheda").classList.contains("in-scontro");
  if (!w.classList.contains("open") && b.dataset.char === cur && !inScontro) { swOpen(2500); return; }
  if (b.dataset.char !== cur || inScontro) { go(b.dataset.char); window.scrollTo({ top: 0, behavior: "smooth" }); }
  swOpen(1400);
});
window.addEventListener("hashchange", () => { if (S) go(location.hash.slice(1)); });

/* ---------- PF e annulla ---------- */
function hideLast() { lastMove = null; $("float").hidden = true; }
const snap = () => ({ who: cur, hp: S.hp, temp: S.temp, deathS: S.deathS, deathF: S.deathF });
function remember(label, prima) { lastMove = prima; showFloat(label, true); }
const amt = () => Math.max(0, parseInt($("amt").value, 10) || 0);
$("bDmg").onclick = () => {
  const n = amt(); if (!n || !S) return; const prima = snap();
  const t = Math.min(S.temp, n); S.temp -= t; S.hp = Math.max(0, S.hp - (n - t)); $("amt").value = ""; change(); remember(`−${n} PF`, prima);
  controllaConcentrazione(n);
};
$("bHeal").onclick = () => {
  const n = amt(); if (!n || !S) return; const prima = snap();
  if (S.hp === 0) { S.deathS = 0; S.deathF = 0; } S.hp = Math.min(S.maxhp, S.hp + n); $("amt").value = ""; change(); remember(`+${n} PF`, prima);
};
$("bTemp").onclick = () => {
  if (!S) return; const prima = snap();
  S.temp = amt(); $("amt").value = ""; change(); remember(S.temp ? `+${S.temp} PF temporanei` : "PF temporanei tolti", prima);
};
$("undoHp").onclick = () => {
  if (!lastMove || lastMove.who !== cur) return hideLast();
  clearTimeout(floatTimer);
  Object.assign(S, { hp: lastMove.hp, temp: lastMove.temp, deathS: lastMove.deathS, deathF: lastMove.deathF }); hideLast(); change(); toast("Annullato");
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
  S.hp = S.maxhp; S.temp = 0; S.re = 0; S.ai = 0; S.ind = 0; S.dv = Math.max(0, S.dv - back); S.dardo = 0; S.fulmine = 0; S.deathS = 0; S.deathF = 0; if (S.exh > 0) S.exh--;
  hideLast(); change(); toast(`Riposo lungo: PF pieni, ${back} dadi vita recuperati`);
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
  const dadi = C.multiclasse ? [C.dadiVita(S), C.dadiVita({ ...S, livelli: { ...S.livelli, [st.id]: st.livello } })] : [`${S.level}d${st.dado}`, `${L}d${st.dado}`];
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
  /* multiclasse: prima si sceglie quale classe sale */
  if (C.multiclasse) h += `<div class="choice"><div class="lbl">Quale classe sale di livello?</div>` +
    seg("data-classe", C.classiPerLivello(S).map(c => [c.id, `${c.nome} ${c.livello} → ${c.livello + 1}`]), pick.classe) + `</div>`;
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
  if (C.multiclasse) S.livelli = { ...(S.livelli || {}), [st.id]: st.livello };
  /* PF: media del dado + Costituzione; se la Costituzione è salita conta anche per i livelli passati; Robusto idem */
  const newCon = mod(S.scores.cos), pfDopo = pfTalenti(S);
  const gain = st.pfMedia + newCon + (newCon - oldCon) * S.level + pfDopo + (pfDopo - pfPrima) * S.level;
  S.level = L; S.maxhp += gain; S.hp += gain; S.history = [...S.history, before].slice(-10);
  $("veil").hidden = true; change(); toast(`Livello ${L}: +${gain} PF massimi`);
}
function undoLevel() {
  const b = S.history[S.history.length - 1]; if (!b) return; const lost = S.maxhp - b.maxhp;
  Object.assign(S, { level: b.level, maxhp: b.maxhp, scores: b.scores, styles: b.styles, asi: b.asi, scelte: b.scelte || [] });
  if (b.livelli) S.livelli = b.livelli;
  S.hp = Math.max(0, Math.min(S.maxhp, S.hp - lost)); S.dv = Math.min(S.dv, S.level); S.history = S.history.slice(0, -1);
  change(); toast(`${C.femminile ? "Tornata" : "Tornato"} al livello ${S.level}`);
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
  if (e.target.id === "featSel") { pick.feat = e.target.value; pick.featAb = null; pick.abilita = []; renderChoice(); }
  if (e.target.id === "stTogli") { pick.togli = e.target.value; if (!pick.togli) pick.metti = ""; renderChoice(); }
  if (e.target.id === "stMetti") { pick.metti = e.target.value; renderChoice(); }
});
$("lvChoice").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  if (b.dataset.classe) { pick = { ...pick, classe: b.dataset.classe, style: null, scelte: {}, togli: "", metti: "" }; pick.mode = passo().asi ? (pick.mode || "two") : null; riepilogoLivello(); }
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
  const dice = $("wDice").value.split("d").map(Number), ranged = $("wRanged").checked;
  S.weapons = [...S.weapons, { id: "w" + Date.now().toString(36), n, t: $("wType").value, note: $("wNote").value.trim(), ab: $("wAb").value, dice, magic: +$("wMagic").value || 0, ranged, ammo: ranged && $("wAmmo").checked }];
  if (!S.inv.includes(n)) S.inv.push(n);
  $("wForm").reset(); $("wAmmoWrap").hidden = true; change(); toast(`${n}: aggiunta`);
});
$("wRanged").addEventListener("change", e => { $("wAmmoWrap").hidden = !e.target.checked; if (e.target.checked) $("wAb").value = "des"; });

/* ---------- tocchi sulla scheda ---------- */
$("vistaScheda").addEventListener("click", e => {
  if (!S) return;
  const p = e.target.closest(".pip[data-k]");
  if (p) { const k = p.dataset.k, i = +p.dataset.i; S[k] = (i < (S[k] || 0)) ? i : i + 1; change(); return; }
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
  const am = e.target.closest("[data-ammo]");
  if (am) { S.ammo = Math.max(0, S.ammo + +am.dataset.ammo); change(); return; }
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

/* la mini-barra dei PF compare quando la testata esce dallo schermo */
try { new IntersectionObserver(([en]) => document.querySelector(".dock").classList.toggle("scrolled", !en.isIntersecting), { threshold: 0 }).observe(document.querySelector(".ring")); }
catch (_) { document.querySelector(".dock").classList.add("scrolled"); }
