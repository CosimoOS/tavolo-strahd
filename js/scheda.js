/* La scheda del personaggio. È la logica della scheda originale, quasi riga per riga:
   cambia solo da dove arrivano i dati (archivio.js) e quali personaggi mostra (dipende dal profilo). */
import { AB, ABN, STYLES, CONDS, COINS, mod, prof, sg, clone, calcola, attacchiOrdinati, normalizza } from "./regole/base.js";
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
  $("dvName").textContent = `Dadi vita d${C.hitDie}`; $("dvTxt").textContent = `Durante un riposo breve · 1d${C.hitDie} ${sg(X.M.cos)} PF ciascuno`;
  $("dvPips").dataset.max = L;
  $("aiRow").hidden = !C.surge; $("aiPips").dataset.max = C.surges(L) || 1;
  $("inspRow").hidden = !C.insp; $("armorSec").hidden = !C.armor;
  $("indRow").hidden = !C.indom(L); $("indPips").dataset.max = C.indom(L) || 1; $("indName").textContent = C.indName;
  const cm = C.critMin(L);
  $("atkTxt").textContent = `Critico ${cm}–20 · ${["", "un attacco", "due attacchi", "tre attacchi", "quattro attacchi"][C.attacks(L)]}`;

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

  $("feats").innerHTML = C.feats(L, X, S).concat(S.asi.filter(a => a.feat).map(a => [`Talento (livello ${a.level})`, a.feat]))
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
  $("conds").innerHTML = CONDS.map(c => `<button class="chip${S.conds.includes(c) ? " on" : ""}" data-c="${c}" aria-pressed="${S.conds.includes(c)}">${c}</button>`).join("");
  $("exh").textContent = S.exh; $("ammo").textContent = S.ammo;
  COINS.forEach(([k]) => { const el = $("c_" + k); if (document.activeElement !== el) el.value = S.coins[k] || 0; });
  const full = S.attuned.length >= 3;
  $("attTxt").textContent = `Sintonia ${S.attuned.length}/3`;
  $("inv").innerHTML = S.inv.map((t, i) => {
    const on = S.attuned.includes(t);
    return `<li class="${C.magic.test(t) || on ? "magic" : ""}"><button class="att${on ? " on" : ""}" data-att="${i}" ${!on && full ? "disabled" : ""} aria-pressed="${on}" title="${on ? "In sintonia" : "Metti in sintonia"}">${on ? "◆" : "◇"}</button><span></span><button class="x" data-del="${i}" aria-label="Rimuovi">×</button></li>`;
  }).join("");
  $("inv").querySelectorAll("li span").forEach((s, i) => s.textContent = S.inv[i]);
  if (document.activeElement !== $("notes")) $("notes").value = S.notes;
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

/* ---------- apertura e chiusura ---------- */
export function apriScheda({ archivio, personaggi, onEsci, scontro }) {
  arch = archivio; ids = personaggi.filter(k => PERSONAGGI[k]); chiediUscita = onEsci; canWrite = true;
  onScontro = (scontro && scontro.apri) || (() => {}); onScheda = (scontro && scontro.chiudi) || (() => {});
  ids.forEach(k => { STATE[k] = clone(PERSONAGGI[k].def); LOADED[k] = false; });
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
    if (dati) STATE[k] = normalizza(PERSONAGGI[k].def, dati);
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

/* ---------- riposi ---------- */
$("shortRest").onclick = () => { S.re = 0; S.ai = 0; change(); toast(C.surge ? "Riposo breve: risorse ricaricate" : "Riposo breve: Recuperare energie ricaricato"); };
$("longRest").onclick = () => {
  const back = Math.max(1, Math.floor(S.level / 2));
  S.hp = S.maxhp; S.temp = 0; S.re = 0; S.ai = 0; S.ind = 0; S.dv = Math.max(0, S.dv - back); S.dardo = 0; S.fulmine = 0; S.deathS = 0; S.deathF = 0; if (S.exh > 0) S.exh--;
  hideLast(); change(); toast(`Riposo lungo: PF pieni, ${back} dadi vita recuperati`);
};

/* ---------- passaggio di livello ---------- */
let pick = null;
function openLevel() {
  const L = S.level + 1, X = D(), P2 = prof(L);
  pick = { mode: C.asi.includes(L) ? "two" : null, sel: [], feat: "", style: null };
  $("lvTitle").textContent = `${C.name} · livello ${L}`;
  const rows = [["Punti ferita massimi", `${S.maxhp} → ${S.maxhp + C.hpAvg + X.M.cos}`], ["Dadi vita", `${S.level}d${C.hitDie} → ${L}d${C.hitDie}`]];
  if (P2 !== X.P) rows.push(["Bonus di competenza", `${sg(X.P)} → ${sg(P2)}`]);
  $("lvChanges").innerHTML = rows.map(([a, b]) => `<li><span>${a}</span><span>${b}</span></li>`).join("") +
    C.featuresAt(L).map(([a, b]) => `<li class="new"><span>${esc(a)}</span><span style="font-family:var(--f-body);color:var(--muted);max-width:60%">${esc(b)}</span></li>`).join("");
  renderChoice(); $("veil").hidden = false; $("lvOk").focus();
}
function renderChoice() {
  const L = S.level + 1; let h = "";
  if (C.asi.includes(L)) {
    h += `<div class="choice"><div class="lbl">Aumento dei punteggi</div><div class="seg">
      <button data-mode="two" aria-pressed="${pick.mode === "two"}">+1 a due</button>
      <button data-mode="one" aria-pressed="${pick.mode === "one"}">+2 a una</button>
      <button data-mode="feat" aria-pressed="${pick.mode === "feat"}">Talento</button></div>`;
    if (pick.mode === "feat") h += `<input id="featName" placeholder="Nome e effetto del talento" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel)" value="${esc(pick.feat)}"><div class="hint">Il talento finisce tra i privilegi; se cambia dei numeri dimmelo e li collego.</div>`;
    else {
      const need = pick.mode === "one" ? 1 : 2, step = pick.mode === "one" ? 2 : 1;
      h += `<div class="abpick">${AB.map(k => {
        const sc = S.scores[k], on = pick.sel.includes(k), dis = !on && (sc + step > 20 || pick.sel.length >= need);
        return `<button data-ab="${k}" aria-pressed="${on}" ${dis ? "disabled" : ""}>${ABN[k]} ${sc}${on ? " → " + (sc + step) : ""}</button>`;
      }).join("")}</div>
        <div class="hint">${pick.mode === "one" ? "Scegli una caratteristica." : "Scegli due caratteristiche diverse."} Massimo 20.</div>`;
    }
    h += `</div>`;
  }
  if (C.styleAt && L === C.styleAt) {
    h += `<div class="choice"><div class="lbl">Secondo stile di combattimento</div><div class="seg">${Object.keys(STYLES).filter(s => !S.styles.includes(s)).map(s => `<button data-style="${s}" aria-pressed="${pick.style === s}">${s}</button>`).join("")}</div>
      <div class="hint">${pick.style ? esc(STYLES[pick.style]) : "Scegline uno."}</div></div>`;
  }
  $("lvChoice").innerHTML = h; $("lvOk").disabled = !choiceDone();
  const fi = $("featName"); if (fi) fi.addEventListener("input", e => { pick.feat = e.target.value; $("lvOk").disabled = !choiceDone(); });
}
function choiceDone() {
  const L = S.level + 1;
  if (C.asi.includes(L)) { if (pick.mode === "feat") { if (!pick.feat.trim()) return false; } else if (pick.sel.length !== (pick.mode === "one" ? 1 : 2)) return false; }
  if (C.styleAt && L === C.styleAt && !pick.style) return false;
  return true;
}
function confirmLevel() {
  if (!choiceDone()) return;
  const before = { level: S.level, maxhp: S.maxhp, scores: clone(S.scores), styles: clone(S.styles), asi: clone(S.asi) };
  const L = S.level + 1, oldCon = mod(S.scores.cos);
  if (C.asi.includes(L)) {
    if (pick.mode === "feat") S.asi.push({ level: L, feat: pick.feat.trim() });
    else { const step = pick.mode === "one" ? 2 : 1; pick.sel.forEach(k => S.scores[k] = Math.min(20, S.scores[k] + step)); S.asi.push({ level: L, abil: pick.sel, step }); }
  }
  if (C.styleAt && L === C.styleAt && pick.style) S.styles.push(pick.style);
  const newCon = mod(S.scores.cos), gain = C.hpAvg + newCon + (newCon - oldCon) * S.level;
  S.level = L; S.maxhp += gain; S.hp += gain; S.history = [...S.history, before].slice(-10);
  $("veil").hidden = true; change(); toast(`Livello ${L}: +${gain} PF massimi`);
}
function undoLevel() {
  const b = S.history[S.history.length - 1]; if (!b) return; const lost = S.maxhp - b.maxhp;
  Object.assign(S, { level: b.level, maxhp: b.maxhp, scores: b.scores, styles: b.styles, asi: b.asi });
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
$("lvChoice").addEventListener("click", e => {
  const m = e.target.closest("[data-mode]"); if (m) { pick.mode = m.dataset.mode; pick.sel = []; renderChoice(); return; }
  const a = e.target.closest("[data-ab]"); if (a && !a.disabled) { const k = a.dataset.ab; pick.sel = pick.sel.includes(k) ? pick.sel.filter(x => x !== k) : [...pick.sel, k]; renderChoice(); return; }
  const s = e.target.closest("[data-style]"); if (s) { pick.style = s.dataset.style; renderChoice(); }
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
  if (c) { const n = c.dataset.c; S.conds = S.conds.includes(n) ? S.conds.filter(x => x !== n) : [...S.conds, n]; change(); return; }
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
  const del = e.target.closest("[data-del]");
  if (del) { const t = S.inv[+del.dataset.del]; S.inv.splice(+del.dataset.del, 1); if (!S.inv.includes(t)) S.attuned = S.attuned.filter(x => x !== t); change(); return; }
});
COINS.forEach(([k]) => $("c_" + k).addEventListener("input", e => { S.coins[k] = Math.max(0, parseInt(e.target.value, 10) || 0); change(); }));
$("addForm").addEventListener("submit", e => {
  e.preventDefault(); const v = $("newItem").value.trim(); if (!v) return; S.inv.push(v); $("newItem").value = "";
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
