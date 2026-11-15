/* Attacco dal telefono del giocatore, con l'ultima parola al master.

   1. Giocatore, nel suo turno: sceglie bersaglio e arma, scrive il d20 → l'app somma il bonus.
   2. Telefono del master (l'unico che conosce la CA): confronta e scrive "colpito" o "mancato".
   3. Giocatore, se colpito: scrive i dadi dei danni (doppi col critico) ed eventualmente la Punizione divina.
   4. Master: vede i danni e tocca Applica (o metà, doppio, nessuno per resistenze e immunità).

   Nell'archivio: scontro/attuale/attacchi/<id> → { scontro, pg, pgNome, bersaglio, bersaglioNome, arma, tipo,
     tiro, stato: "colpire" | "colpito" | "mancato" | "danni" | "applicato", danni?, applicati? }
   La CA non viene mai scritta lì: il giocatore vede solo "colpito" o "mancato". */
import { tiroPerColpire, esito, dadiDanno, sommaDanni, danniFinali } from "./regole/attacco.js";
import { creaturaInCampo, ferisci } from "./nemici.js";

const ATT = "scontro/attuale/attacchi";
const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const sg = n => (n >= 0 ? "+" : "−") + Math.abs(n);

let arch = null, dm = false, toast = () => {}, ridisegna = () => {}, dati = () => null, spendi = () => {}, ascolto = null;
let A = [], SC = null, risolti = new Set();
/* la bozza del giocatore: cosa ha scelto e scritto finora (resta anche se la vista si ridisegna) */
let B = nuovaBozza(), mio = null;
function nuovaBozza() { return { bersaglio: null, arma: 0, modo: "normale", d20: ["", ""], extraTiro: "", dadi: [], punizione: 0, nonMorto: false, extra: "" }; }

export function avviaAttacchi({ archivio, master, avvisa, aggiorna, datiAttacco, spendiSlot }) {
  arch = archivio; dm = master; toast = avvisa; ridisegna = aggiorna; dati = datiAttacco; spendi = spendiSlot;
  A = []; risolti = new Set(); B = nuovaBozza(); mio = null;
  ascolto = arch.ascoltaRaccolta(ATT, lista => {
    A = lista.map(x => ({ id: x.id, ...x.dati }));
    if (dm) A.filter(a => a.stato === "colpire" && SC && a.scontro === SC.id && !risolti.has(a.id)).forEach(risolvi);
    if (dm) { const nuovi = A.filter(a => a.stato === "danni" && !risolti.has(a.id + ":d")); nuovi.forEach(a => { risolti.add(a.id + ":d"); toast(`${a.pgNome}: danni a ${a.bersaglioNome}`); }); }
    ridisegna();
  });
}
export function fermaAttacchi() { if (ascolto) ascolto(); ascolto = null; }
/** Lo scontro è cambiato (nuovo turno, nuovo scontro…): la bozza vale solo per il turno in cui è nata. */
export function aggiornaScontro(nuovo) {
  const chiave = s => s ? `${s.id}:${s.round}:${s.turno}` : "";
  if (chiave(nuovo) !== chiave(SC)) { B = nuovaBozza(); mio = null; }
  SC = nuovo;
}

/* ---------- master: esito automatico ---------- */
async function risolvi(a) {
  risolti.add(a.id);
  const c = creaturaInCampo(a.bersaglio);
  if (!c) return;
  const e = esito(a.tiro, c.ca);
  try { await arch.aggiorna(`${ATT}/${a.id}`, { stato: e }); } catch (_) { risolti.delete(a.id); }
}

/** Le richieste che aspettano il master, in cima alla sua vista. scrivi(campi) aggiorna lo scontro. */
export function htmlMaster() {
  if (!SC) return "";
  const aperte = A.filter(a => a.scontro === SC.id && (a.stato === "danni" || a.stato === "colpito" || a.stato === "colpire"));
  if (!aperte.length) return "";
  return `<section class="richieste"><h2>Attacchi dei giocatori</h2>${aperte.map(a => {
    const c = creaturaInCampo(a.bersaglio), t = a.tiro;
    const riga = `<p class="chi"><b>${esc(a.pgNome)}</b> → <b>${esc(c ? c.nome : a.bersaglioNome)}</b> · ${esc(a.arma)}</p>
      <p class="tiro-r">${t.tot} per colpire${c ? ` contro CA ${c.ca}` : ""}${t.critico ? " · <b>critico</b>" : ""}${t.fallimento ? " · 1 naturale" : ""}</p>`;
    if (a.stato !== "danni") return `<div class="richiesta">${riga}<p class="stato-r">${a.stato === "colpire" ? "Valuto…" : "Colpito: aspetto i danni"}</p>
      ${a.stato === "colpito" ? `<button class="btn link" data-at="m-manca" data-id="${a.id}">Segna mancato</button>` : ""}</div>`;
    const d = a.danni, parti = Object.entries(d.perTipo).map(([k, v]) => `${v} ${esc(k)}`).join(" + ");
    return `<div class="richiesta urgente">${riga}
      <p class="danni-r"><span class="tot-r">${d.tot}</span> danni · ${parti}</p>
      ${c && c.difese.length ? `<p class="difese">${c.difese.map(esc).join("<br>")}</p>` : ""}
      <div class="scelte-m">
        <button class="btn up" data-at="m-applica" data-id="${a.id}" data-come="pieni">Applica ${d.tot}</button>
        <button class="btn" data-at="m-applica" data-id="${a.id}" data-come="meta">Metà ${danniFinali(d.tot, "meta")}</button>
        <button class="btn" data-at="m-applica" data-id="${a.id}" data-come="doppio">Doppio ${danniFinali(d.tot, "doppio")}</button>
        <button class="btn link" data-at="m-applica" data-id="${a.id}" data-come="nulla">Nessuno</button>
      </div></div>`;
  }).join("")}</section>`;
}

/* ---------- giocatore ---------- */
const tiro = (d, arma) => tiroPerColpire({ dadi: B.d20, modo: B.modo, bonus: arma.hit + (parseInt(B.extraTiro, 10) || 0), critMin: d.critMin });
function partiDanno(d, a) {
  const arma = d.attacchi[a.armaI ?? B.arma], [n, f] = dadiDanno(arma.dice, a.tiro.critico);
  const pad = (v, k) => Array.from({ length: k }, (_, i) => (v || [])[i] ?? "");
  const parti = [{ chiave: "arma", nome: arma.n, valori: pad(B.dadi, n), n, facce: f, mod: arma.mod, tipo: (arma.t || "").toLowerCase() }];
  if (B.punizione) {
    const base = B.punizione + 1 + (B.nonMorto ? 1 : 0), k = a.tiro.critico ? base * 2 : base;
    parti.push({ chiave: "pun", nome: "Punizione divina", valori: pad(B.dadiPun, k), n: k, facce: 8, mod: 0, tipo: "radianti" });
  }
  return parti;
}

/** Il pannello dell'attacco, sotto "Tocca a te". pg = il personaggio di turno (mio). */
export function htmlGiocatore(pg) {
  if (!SC || SC.stato !== "in corso") return "";
  const d = dati(pg.id); if (!d || !d.attacchi.length) return "";
  const a = mio && A.find(x => x.id === mio);
  const fatti = A.filter(x => x.scontro === SC.id && x.pg === pg.id && x.round === SC.round && x.turno === SC.turno).length;
  const quanti = fatti ? `<small>${fatti === 1 ? "1 attacco" : `${fatti} attacchi`} in questo turno</small>` : "";

  if (a && a.stato === "colpire") return box(quanti, `<p class="attesa">${a.tiro.tot} per colpire contro ${esc(a.bersaglioNome)}. Aspetto il master…</p>`);
  if (a && a.stato === "mancato") return box(quanti, `<p class="esito mancato">Mancato</p><p class="attesa">${a.tiro.tot} non basta contro ${esc(a.bersaglioNome)}.</p>
    <div class="azioni"><button class="btn up" data-at="nuovo">Nuovo attacco</button></div>`);
  if (a && a.stato === "danni") return box(quanti, `<p class="attesa">${a.danni.tot} danni a ${esc(a.bersaglioNome)}. Il master li sta applicando…</p>`);
  if (a && a.stato === "applicato") return box(quanti, `<p class="esito colpito">${esc(a.bersaglioNome)}: ${a.applicati} danni</p>
    ${a.applicati !== a.danni.tot ? `<p class="attesa">Il master ne ha contati ${a.applicati} su ${a.danni.tot}.</p>` : ""}
    <div class="azioni"><button class="btn up" data-at="nuovo">Nuovo attacco</button></div>`);
  if (a && a.stato === "colpito") {
    const parti = partiDanno(d, a), somma = sommaDanni(parti, B.extra);
    const slot = d.punizione ? d.slot.filter(s => s.liberi > 0 && s.liv <= 4) : [];
    return box(quanti, `<p class="esito colpito">${a.tiro.critico ? "Critico! Raddoppia i dadi" : "Colpito!"}</p>
      ${slot.length ? `<div class="riga-tiro"><b>Aggiungi la Punizione divina?</b><div class="seg">
        <button data-at="pun" data-l="0" aria-pressed="${!B.punizione}">No</button>
        ${slot.map(s => `<button data-at="pun" data-l="${s.liv}" aria-pressed="${B.punizione === s.liv}">Slot ${s.liv}° (${s.liberi})</button>`).join("")}</div>
        ${B.punizione ? `<label class="spunta"><input type="checkbox" data-at="nm"${B.nonMorto ? " checked" : ""}> Contro un non morto o un immondo (+1d8)</label>` : ""}</div>` : ""}
      ${parti.map(p => `<div class="riga-tiro"><b>${esc(p.nome)}</b><div class="dadi">${Array.from({ length: p.n }, (_, i) =>
        `<label class="dado"><span class="lbl">d${p.facce}</span><input type="number" inputmode="numeric" min="1" max="${p.facce}" data-at-dado="${p.chiave}" data-i="${i}" data-foco="${p.chiave}${i}" value="${esc(p.valori[i] ?? "")}"></label>`).join("")}
        ${p.mod ? `<span class="somma">${sg(p.mod)}</span>` : ""}<small class="aiuto">${esc(p.tipo)}</small></div></div>`).join("")}
      <label class="campo-m extra"><span class="lbl">Altri danni (es. Marchio del cacciatore), già sommati</span>
        <input type="number" inputmode="numeric" min="0" data-at-campo="extra" data-foco="extra" value="${esc(B.extra)}"></label>
      <p class="somma-tot">${somma ? `Totale <b>${somma.tot}</b>` : "Scrivi tutti i dadi"}</p>
      <div class="azioni"><button class="btn up" data-at="invia"${somma ? "" : " disabled"}>Invia i danni</button></div>`);
  }
  /* scelta del bersaglio, dell'arma e tiro per colpire */
  const bers = (SC.campo || []).filter(c => c.tipo !== "alleato" && c.ferite !== "sconfitto");
  if (!bers.length) return "";
  const arma = d.attacchi[B.arma] || d.attacchi[0], t = tiro(d, arma), n = B.modo === "normale" ? 1 : 2;
  return box(quanti, `
    <p class="lbl-sez">Bersaglio</p><div class="scelte">${bers.map(c => `<button class="btn" data-at="bers" data-id="${c.id}" aria-pressed="${B.bersaglio === c.id}">${esc(c.nome)}<small>${esc(c.ferite)}</small></button>`).join("")}</div>
    <p class="lbl-sez">Arma</p><div class="scelte">${d.attacchi.map((w, i) => `<button class="btn" data-at="arma" data-i="${i}" aria-pressed="${B.arma === i}">${esc(w.n)}<small>${sg(w.hit)} · ${w.dice[0]}d${w.dice[1]}${w.mod ? sg(w.mod) : ""}</small></button>`).join("")}</div>
    <p class="lbl-sez">Tiro per colpire</p>
    <div class="seg modo">${["normale", "vantaggio", "svantaggio"].map(m => `<button data-at="modo" data-m="${m}" aria-pressed="${B.modo === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>
    <div class="dadi">${Array.from({ length: n }, (_, i) => `<label class="dado"><span class="lbl">d20${n > 1 ? " " + (i + 1) : ""}</span><input type="number" inputmode="numeric" min="1" max="20" data-at-d20="${i}" data-foco="d20-${i}" value="${esc(B.d20[i])}"></label>`).join("")}
      <span class="somma">${t ? `${t.usato} ${sg(t.bonus)} = <b>${t.tot}</b>` : sg(arma.hit)}</span>
      <label class="dado piccolo"><span class="lbl">Altro</span><input type="number" inputmode="numeric" data-at-campo="extraTiro" data-foco="xt" value="${esc(B.extraTiro)}" aria-label="Bonus in più al tiro, es. Benedizione"></label></div>
    <small class="aiuto">"Altro": bonus in più al tiro, per esempio il d4 di Benedizione.</small>
    <div class="azioni"><button class="btn up" data-at="attacca"${t && B.bersaglio ? "" : " disabled"}>Attacca</button></div>`);
}
const box = (quanti, h) => `<div class="attacco"><h3 class="sez-m">Attacco ${quanti}</h3>${h}</div>`;

/* ---------- tocchi e campi ---------- */
export async function clic(b, pg, scrivi) {
  const az = b.dataset.at; if (!az) return false;
  const d = pg && dati(pg.id);
  switch (az) {
    case "bers": B.bersaglio = b.dataset.id; break;
    case "arma": B.arma = +b.dataset.i; break;
    case "modo": B.modo = b.dataset.m; break;
    case "pun": B.punizione = +b.dataset.l; B.dadiPun = []; break;
    case "nm": B.nonMorto = b.checked; break;
    case "nuovo": mio = null; B = { ...nuovaBozza(), bersaglio: B.bersaglio, arma: B.arma }; break;
    case "attacca": {
      const arma = d.attacchi[B.arma], t = tiro(d, arma), c = (SC.campo || []).find(x => x.id === B.bersaglio);
      if (!t || !c) return true;
      const id = `${pg.id}-${Date.now()}`;
      mio = id;
      await arch.scrivi(`${ATT}/${id}`, { scontro: SC.id, round: SC.round, turno: SC.turno, pg: pg.id, pgNome: d.nome,
        bersaglio: c.id, bersaglioNome: c.nome, arma: arma.n, armaI: B.arma, tipo: (arma.t || "").toLowerCase(), tiro: t, stato: "colpire" });
      break;
    }
    case "invia": {
      const a = A.find(x => x.id === mio); if (!a) return true;
      const parti = partiDanno(d, a), somma = sommaDanni(parti, B.extra);
      if (!somma) return true;
      await arch.aggiorna(`${ATT}/${a.id}`, { stato: "danni", danni: { tot: somma.tot, perTipo: somma.perTipo } });
      if (B.punizione) spendi(pg.id, B.punizione);
      break;
    }
    /* master */
    case "m-manca": await arch.aggiorna(`${ATT}/${b.dataset.id}`, { stato: "mancato" }); break;
    case "m-applica": {
      const a = A.find(x => x.id === b.dataset.id); if (!a) return true;
      const n = danniFinali(a.danni.tot, b.dataset.come);
      const campi = n > 0 ? await ferisci(a.bersaglio, n, SC) : null;
      await arch.aggiorna(`${ATT}/${a.id}`, { stato: "applicato", applicati: n });
      if (campi) await scrivi(campi);
      break;
    }
    default: return false;
  }
  ridisegna();
  return true;
}
export function input(e) {
  const t = e.target;
  if (t.dataset.atD20 !== undefined) { B.d20[+t.dataset.atD20] = t.value; ridisegna(); return true; }
  if (t.dataset.atCampo) { B[t.dataset.atCampo] = t.value; ridisegna(); return true; }
  if (t.dataset.atDado) {
    const k = t.dataset.atDado === "pun" ? "dadiPun" : "dadi";
    B[k] = (B[k] || []).slice(); B[k][+t.dataset.i] = t.value; ridisegna(); return true;
  }
  if (t.dataset.at === "nm") { B.nonMorto = t.checked; ridisegna(); return true; }
  return false;
}
