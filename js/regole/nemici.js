/* Regole dei nemici e degli alleati del master. Funzioni pure, provate da test/nemici.test.js.
   I numeri veri (PF, CA, attacchi) li vede solo il master; ai giocatori arriva una parola. */

/** Come sta una creatura, detto a parole per i giocatori.
    illeso: PF pieni · ferito: sotto il massimo · a metà: metà o meno · in fin di vita: un quarto o meno · sconfitto: 0. */
export function ferite(pf, max) {
  if (pf <= 0) return "sconfitto";
  if (pf >= max) return "illeso";
  if (pf * 4 <= max) return "in fin di vita";
  return pf * 2 <= max ? "a metà" : "ferito";
}

/** Danno e cura: mai sotto 0, mai sopra il massimo. */
export const danno = (pf, n) => Math.max(0, pf - Math.max(0, n));
export const cura = (pf, max, n) => Math.min(max, pf + Math.max(0, n));

/** Nomi numerati: "Lupo 1", "Lupo 2"… Se ci sono già dei lupi nello scontro si continua da lì.
    Con uno solo resta "Lupo" (a meno che ce ne siano già altri). */
export function nomiNumerati(base, quanti, esistenti = []) {
  const re = new RegExp("^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?: (\\d+))?$");
  let gia = 0;
  for (const n of esistenti) { const m = n.match(re); if (m) gia = Math.max(gia, m[1] ? +m[1] : 1); }
  if (quanti === 1 && gia === 0) return [base];
  return Array.from({ length: quanti }, (_, i) => `${base} ${gia + i + 1}`);
}

/** Da una scelta del master ("4 lupi, in branco") alle creature in campo e ai gruppi d'iniziativa.
    scelte:   [{ creatura, quanti, modo }]  modo: "branco" (un tiro per tutti) · "uno" (un tiro a testa)
    bestiario: { id → creatura }  ·  gia: creature già in campo (per continuare la numerazione)
    Restituisce { creature: [...], gruppi: [{ id, nome, membri:[id], ini }] }. */
export function schiera(scelte, bestiario, gia = []) {
  const creature = [], gruppi = [];
  let n = gia.length;
  const nomiGia = () => [...gia, ...creature];
  for (const { creatura, quanti, modo, nascosto } of scelte) {
    const c = bestiario[creatura]; if (!c || !(quanti > 0)) continue;
    const nomi = nomiNumerati(c.nome, quanti, nomiGia().map(x => x.nome));
    const visti = nomiNumerati(c.giocatori || c.nome, quanti, nomiGia().map(x => x.giocatori));
    const nuove = nomi.map((nome, i) => ({
      id: `n${++n}`, creatura, nome, giocatori: visti[i], tipo: c.tipo || "nemico",
      pf: c.pf, max: c.pf, ca: c.ca, ini: c.ini ?? 0, pfVisibili: !!c.pfVisibili, ...(nascosto ? { nascosto: true } : {}),
    }));
    const extra = nascosto ? { nascosto: true } : {};
    creature.push(...nuove);
    if (modo === "branco" && nuove.length > 1) {
      const plurale = (c.giocatori || c.nome) + " ×" + nuove.length;
      gruppi.push({ id: "g" + nuove[0].id, nome: plurale, membri: nuove.map(x => x.id), ini: nuove[0].ini, tipo: nuove[0].tipo, ...extra });
    } else {
      nuove.forEach(x => gruppi.push({ id: "g" + x.id, nome: x.giocatori, membri: [x.id], ini: x.ini, tipo: x.tipo, ...extra }));
    }
  }
  return { creature, gruppi };
}

/** Toglie dall'ordine dei turni una voce (un nemico sconfitto) senza far saltare il turno a qualcuno.
    Se si toglie chi sta prima di quello di turno, il segno scende di uno; se si toglie l'ultimo e tocca a lui,
    si passa al primo del round dopo. */
export function togliDaOrdine({ ordine, turno, round }, id) {
  const i = ordine.findIndex(v => v.id === id);
  if (i < 0) return { ordine, turno, round };
  const nuovo = ordine.filter((_, k) => k !== i);
  if (!nuovo.length) return { ordine: nuovo, turno: 0, round };
  if (i < turno) return { ordine: nuovo, turno: turno - 1, round };
  if (i === turno && turno >= nuovo.length) return { ordine: nuovo, turno: 0, round: round + 1 };
  return { ordine: nuovo, turno, round };
}

/** Danno medio di una formula come "2d6+3 taglienti + 1d6 fulmine" (le alternative tra parentesi non contano).
    null se non c'è nessun dado. */
export function media(danni) {
  const t = String(danni || "").replace(/\([^)]*\)/g, "");
  let tot = 0, dadi = false;
  for (const m of t.matchAll(/([+-]?)\s*(\d+)\s*d\s*(\d+)|([+-])\s*(\d+)(?!\s*d)/gi)) {
    if (m[2]) { dadi = true; tot += (m[1] === "-" ? -1 : 1) * (+m[2] * (+m[3] + 1)) / 2; }
    else tot += (m[4] === "-" ? -1 : 1) * +m[5];
  }
  return dadi ? Math.floor(tot) : null;
}

/* Le azioni nel modulo del bestiario si scrivono una per riga:
     Nome | +5 | 2d4+2 perforanti | nota      (attacco)
     Nome | nota                              (azione senza tiro per colpire)                       */
export function leggiAzioni(testo) {
  return String(testo || "").split("\n").map(r => r.trim()).filter(Boolean).map(r => {
    const p = r.split("|").map(x => x.trim());
    const bonus = p[1] && /^[+-]?\d+$/.test(p[1]) ? parseInt(p[1], 10) : null;
    if (bonus === null) return { nome: p[0], ...(p.slice(1).join(" | ") ? { nota: p.slice(1).join(" | ") } : {}) };
    const a = { nome: p[0], colpire: bonus, danni: p[2] || "" };
    const m = media(a.danni); if (m !== null) a.medio = m;
    if (p[3]) a.nota = p.slice(3).join(" | ");
    return a;
  });
}
export function scriviAzioni(azioni) {
  return (azioni || []).map(a => a.colpire != null
    ? [a.nome, (a.colpire >= 0 ? "+" : "") + a.colpire, a.danni || "", a.nota || ""].join(" | ").replace(/ \| $/, "")
    : [a.nome, a.nota || ""].filter(Boolean).join(" | ")).join("\n");
}
/* I tratti: "Nome: testo", uno per riga. */
export function leggiTratti(testo) {
  return String(testo || "").split("\n").map(r => r.trim()).filter(Boolean).map(r => {
    const i = r.indexOf(":");
    return i > 0 ? { nome: r.slice(0, i).trim(), testo: r.slice(i + 1).trim() } : { nome: r, testo: "" };
  });
}
export const scriviTratti = tratti => (tratti || []).map(t => t.testo ? `${t.nome}: ${t.testo}` : t.nome).join("\n");

/* ---------- testi più chiari per la scheda del master ---------- */
const CAR = { For: "Forza", Des: "Destrezza", Cos: "Costituzione", Int: "Intelligenza", Sag: "Saggezza", Car: "Carisma" };
/** Scioglie le abbreviazioni dei manuali: "TS Sag CD 14" → "tiro salvezza su Saggezza CD 14", "For CD 12" → "Forza CD 12". */
export function chiaro(testo) {
  return String(testo || "")
    .replace(/\bTS (For|Des|Cos|Int|Sag|Car)\b/g, (_, k) => "tiro salvezza su " + CAR[k])
    .replace(/\bTS\b/g, "tiri salvezza")
    .replace(/\b(For|Des|Cos|Int|Sag|Car)(?= CD\b)/g, k => CAR[k]);
}
const LIBRI = { CoS: "Maledizione di Strahd", MM: "Manuale dei Mostri", PHB: "Manuale del Giocatore" };
/** "CoS p.231" → "Maledizione di Strahd, pagina 231"; "PHB app. D" → "Manuale del Giocatore, appendice D". */
export function fonteChiara(f) {
  return String(f || "").split("/").map(x => x.trim()).filter(Boolean).map(x => x
    .replace(/^(CoS|MM|PHB)\b/, k => LIBRI[k] + ",")
    .replace(/\bp\.\s*(\d+)/, "pagina $1").replace(/\bapp\.\s*/, "appendice ")).join(" · ");
}
/** Separa il testo degli incantesimi in righe: { intro, livelli:[{ livello: 0 per i trucchetti o 1..9, elenco }] }.
    Accetta sia "1° (4): dardo incantato" sia "1°: dardo incantato" sia "Trucchetti: luce". */
export function incantesimi(testo) {
  const t = String(testo || "");
  const re = /(Trucchetti|(\d)°(?:\s*\(\d+\))?)\s*:\s*/g;
  const pezzi = [...t.matchAll(re)];
  if (!pezzi.length) return { intro: t.trim(), livelli: [] };
  const intro = t.slice(0, pezzi[0].index).trim().replace(/[.\s]+$/, "");
  const livelli = pezzi.map((m, i) => ({
    livello: m[2] ? +m[2] : 0,
    elenco: t.slice(m.index + m[0].length, i + 1 < pezzi.length ? pezzi[i + 1].index : t.length).trim().replace(/[.\s]+$/, ""),
  }));
  return { intro, livelli };
}

/** Inserisce nell'ordine dei turni chi arriva a scontro iniziato (rinforzi), al posto giusto per iniziativa.
    A parità entra dopo chi c'era già. Se entra prima di chi sta giocando, il segno del turno scivola di uno
    così il turno resta a chi lo aveva. */
export function inserisciInOrdine({ ordine, turno }, voce) {
  let i = ordine.findIndex(v => v.tot < voce.tot);
  if (i < 0) i = ordine.length;
  const nuovo = [...ordine.slice(0, i), voce, ...ordine.slice(i)];
  return { ordine: nuovo, turno: i <= turno ? turno + 1 : turno };
}

/** Una creatura che cambia modello (il popolano che si rivela lupo mannaro): prende CA, PF massimi e nome
    del nuovo modello, ma conserva le ferite già subite (mai sotto 1 PF) e lo schieramento. */
export function trasforma(c, m) {
  const max = m.pf, persi = Math.max(0, c.max - c.pf);
  return { ...c, creatura: m.id, nome: m.nome, giocatori: m.giocatori || m.nome, ca: m.ca, ini: m.ini ?? c.ini,
    max, pf: Math.max(1, max - persi) };
}

/** Creature evocate: nel round in cui arrivano giocano subito dopo chi le ha evocate.
    La voce porta "evocati: round" per ricordarsi di spostarla dopo. */
export function inserisciDopo({ ordine, turno }, voce, idEvocatore) {
  let i = ordine.findIndex(v => v.id === idEvocatore);
  if (i < 0) i = turno;
  const nuovo = [...ordine.slice(0, i + 1), voce, ...ordine.slice(i + 1)];
  return { ordine: nuovo, turno: i + 1 <= turno ? turno + 1 : turno };
}
/** Dal round dopo l'evocazione le creature evocate prendono il posto della loro iniziativa (anche più in alto
    dell'evocatore). Il turno resta a chi lo aveva. null se non c'è niente da spostare. */
export function sistemaEvocati({ ordine, turno, round }) {
  const daSpostare = ordine.filter(v => v.evocati != null && v.evocati < round);
  if (!daSpostare.length) return null;
  const attivo = ordine[turno] && ordine[turno].id;
  let st = { ordine: ordine.filter(v => !daSpostare.includes(v)), turno: 0 };
  for (const v of daSpostare) { const { evocati, ...pulita } = v; st = inserisciInOrdine(st, pulita); }
  /* a inizio round (turno 0) si riparte dal nuovo primo, che può essere proprio un evocato; altrimenti il turno resta a chi lo aveva */
  const t = st.ordine.findIndex(v => v.id === attivo);
  return { ordine: st.ordine, turno: turno === 0 || t < 0 ? 0 : t };
}
