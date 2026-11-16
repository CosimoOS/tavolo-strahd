/* Regole di base della 5e: funzioni pure, cioè ricevono dati e restituiscono numeri.
   Non toccano lo schermo né l'archivio, così si possono provare con i test (cartella test/). */

export const AB = ["for", "des", "cos", "int", "sag", "car"];
export const ABN = { for: "For", des: "Des", cos: "Cos", int: "Int", sag: "Sag", car: "Car" };

export { STYLES } from "./stili.js";
import { talento } from "./talenti.js";

export const CONDS = ["Accecato", "Affascinato", "Afferrato", "Assordato", "Avvelenato", "Incapacitato", "Invisibile",
  "Paralizzato", "Pietrificato", "Prono", "Spaventato", "Stordito", "Trattenuto"];

export const COINS = [["mo", "Oro", [-10, -1, 1, 10]], ["ma", "Argento", [-1, 1]], ["mr", "Rame", [-1, 1]],
  ["me", "Electrum", [-1, 1]], ["mp", "Platino", [-1, 1]]];

export const SK = ["Acrobazia:des", "Addestrare animali:sag", "Arcano:int", "Atletica:for", "Furtività:des", "Indagare:int",
  "Inganno:car", "Intimidire:car", "Intrattenere:car", "Intuizione:sag", "Medicina:sag", "Natura:int", "Percezione:sag",
  "Persuasione:car", "Rapidità di mano:des", "Religione:int", "Sopravvivenza:sag", "Storia:int"].map(s => s.split(":"));

/** Modificatore di una caratteristica: 10-11 → 0, 14 → +2, 20 → +5. */
export const mod = sc => Math.floor((sc - 10) / 2);
/** Bonus di competenza per livello: +2 ai livelli 1-4, +3 ai 5-8, e così via. */
export const prof = l => 2 + Math.floor((l - 1) / 4);
/** Numero con segno: 3 → "+3", -1 → "-1". */
export const sg = n => (n >= 0 ? "+" : "") + n;
export const clone = o => JSON.parse(JSON.stringify(o));

/** Danno medio di un attacco: serve solo per ordinare la lista. 1d8+5 → 9,5. */
export const dannoMedio = a => a.dice[0] * (a.dice[1] + 1) / 2 + a.mod;

/**
 * Tutti i valori derivati di una scheda.
 * C = regole del personaggio (js/personaggi/…), S = stato salvato (PF, punteggi, armi…).
 */
export function calcola(C, S) {
  if (C.vediStato) C.vediStato(S);                     // le regole dei multiclasse leggono i livelli di ogni classe
  const L = S.level, P = prof(L), M = {};
  /* effetti dei talenti presi: competenze nei tiri salvezza e nelle abilità, iniziativa, Percezione passiva */
  const tal = (S.asi || []).filter(a => a.feat).map(a => ({ a, t: talento(a.feat) })).filter(x => x.t);
  const tsExtra = tal.filter(x => x.t.effetti && x.t.effetti.ts && x.a.scelta).map(x => x.a.scelta);
  const abExtra = tal.flatMap(x => x.a.abilita || []);
  const somma = k => tal.reduce((n, x) => n + ((x.t.effetti || {})[k] || 0), 0);
  AB.forEach(k => M[k] = mod(S.scores[k]));
  const half = Math.ceil(P / 2), ath = C.athlete(L);
  const saves = {};
  const aura = C.saveBonus ? C.saveBonus(L, M) : 0;   // es. Aura di protezione del paladino
  AB.forEach(k => saves[k] = M[k] + (C.saves.includes(k) || tsExtra.includes(k) ? P : 0) + aura);
  const skills = SK.map(([n, a]) => {
    const p = C.skills.includes(n) || abExtra.includes(n);
    let v = M[a] + (p ? P : 0);
    if (!p && ath && ["for", "des", "cos"].includes(a)) v += half;
    return { n, a, p, v };
  });
  const ini = M.des + (ath ? half : 0) + somma("ini");
  const pp = 10 + M.sag + (C.skills.includes("Percezione") || abExtra.includes("Percezione") ? P : 0) + somma("pp");
  const atk = S.weapons.map(a => {
    const m = a.ab === "fin" ? Math.max(M.for, M.des) : M[a.ab], g = +a.magic || 0;
    return {
      ...a,
      d: [a.t, a.note].filter(Boolean).join(" · "),
      hit: m + P + g + C.roleHit + (a.adjHit || 0) + (a.ranged && S.styles.includes("Tiro") ? 2 : 0),
      mod: m + g + (a.adjDmg || 0),
    };
  });
  return { L, P, M, saves, skills, ini, pp, atk };
}

/** Attacchi in ordine dal danno medio più alto al più basso; a parità, chi colpisce meglio. */
export const attacchiOrdinati = X => [...X.atk].sort((a, b) => dannoMedio(b) - dannoMedio(a) || b.hit - a.hit);

/**
 * Unisce i dati salvati con i valori di partenza del personaggio,
 * così un campo mancante (scheda vecchia) non rompe niente.
 */
export function normalizza(def, v) {
  const s = Object.assign(clone(def), clone(v));
  s.coins = Object.assign({}, def.coins, v.coins || {});
  s.scores = Object.assign({}, def.scores, v.scores || {});
  if (!Array.isArray(s.weapons)) s.weapons = clone(def.weapons);
  if (!Array.isArray(s.attuned)) s.attuned = clone(def.attuned);
  if (!Array.isArray(s.res)) s.res = clone(def.res);
  if (!Array.isArray(s.inv)) s.inv = clone(def.inv);
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.asi)) s.asi = [];
  if (!Array.isArray(s.styles)) s.styles = [];
  s.conds = (s.conds || []).filter(c => CONDS.includes(c));
  return s;
}

/* ---------- quantità degli oggetti ----------
   Un oggetto si scrive "Lancia ×3" (o "10 torce", come nei dati vecchi). Le misure non sono quantità: "15 metri di corda" resta com'è. */
const MISURE = /^(metri|m|cm|kg|g|litri|l|piedi|libbre)\b/i;
export function quantita(t) {
  const s = String(t || "").trim();
  let m = s.match(/^(.+?)\s*[×x]\s*(\d+)$/);
  if (m) return { nome: m[1].trim(), n: +m[2] };
  m = s.match(/^(\d+)\s+(.+)$/);
  if (m && !MISURE.test(m[2])) return { nome: m[2].trim(), n: +m[1] };
  return { nome: s, n: 1 };
}
export const conQuantita = (nome, n) => n > 1 ? `${nome} ×${n}` : nome;
/** Aggiunge un oggetto all'equipaggiamento: se c'è già (stesso nome), ne aumenta il numero. Restituisce il nuovo elenco. */
export function aggiungiOggetto(inv, testo) {
  const nuovo = quantita(testo), i = inv.findIndex(t => quantita(t).nome.toLowerCase() === nuovo.nome.toLowerCase());
  if (i < 0) return [...inv, conQuantita(nuovo.nome, nuovo.n)];
  const q = quantita(inv[i]);
  return inv.map((t, k) => k === i ? conQuantita(q.nome, q.n + nuovo.n) : t);
}
