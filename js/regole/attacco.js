/* Regole dell'attacco: per colpire, critico, danni. Funzioni pure, provate da test/attacco.test.js.
   L'app non tira mai i dadi: i numeri li scrive il giocatore, qui si fanno solo i conti. */
import { leggiD20 } from "./combattimento.js";

/** Un dado da f facce scritto a mano: intero tra 1 e f, altrimenti null. */
export function leggiDado(v, f) {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= f ? n : null;
}

/** Tiro per colpire. modo: "normale" (un d20), "vantaggio" (il più alto di due), "svantaggio" (il più basso).
    critMin: da che numero il d20 è critico (20, o 19 per il Campione). Restituisce null se mancano dadi. */
export function tiroPerColpire({ dadi, modo = "normale", bonus, critMin = 20 }) {
  const servono = modo === "normale" ? 1 : 2;
  const d = (dadi || []).slice(0, servono).map(leggiD20);
  if (d.length < servono || d.some(x => x === null)) return null;
  const usato = modo === "svantaggio" ? Math.min(...d) : Math.max(...d);
  return { dadi: d, modo, usato, bonus, tot: usato + bonus, critico: usato >= critMin, fallimento: usato === 1 };
}

/** Colpisce? Un 1 naturale manca sempre, un critico colpisce sempre; altrimenti il totale deve arrivare alla CA. */
export function esito(tiro, ca) {
  if (tiro.fallimento) return "mancato";
  if (tiro.critico) return "colpito";
  return tiro.tot >= ca ? "colpito" : "mancato";
}

/** Quanti dadi di danno tirare: con un critico il doppio. [1, 8] → [2, 8]. */
export const dadiDanno = ([n, f], critico) => [critico ? n * 2 : n, f];

/** Somma dei danni. parti: [{ valori:[…], facce, mod, tipo }]; extra: danni in più scritti a mano.
    Restituisce { tot, perTipo: { tipo: n } } oppure null se un dado manca o è fuori scala. */
export function sommaDanni(parti, extra = 0) {
  const perTipo = {};
  let tot = 0;
  for (const p of parti) {
    const v = (p.valori || []).map(x => leggiDado(x, p.facce));
    if (v.some(x => x === null)) return null;
    const s = v.reduce((a, b) => a + b, 0) + (p.mod || 0);
    perTipo[p.tipo] = (perTipo[p.tipo] || 0) + s;
    tot += s;
  }
  const e = Math.max(0, parseInt(extra, 10) || 0);
  if (e) { perTipo["altro"] = (perTipo["altro"] || 0) + e; tot += e; }
  return { tot: Math.max(0, tot), perTipo };
}

/** Il master decide come arrivano i danni: pieni, dimezzati (resistenza), doppi (vulnerabilità) o nulli (immunità). */
export function danniFinali(tot, come) {
  if (come === "meta") return Math.floor(tot / 2);
  if (come === "doppio") return tot * 2;
  if (come === "nulla") return 0;
  return tot;
}

/** Le parti di una formula di danno del bestiario: "2d6+3 taglienti + 1d6 fulmine" →
    [{ n: 2, f: 6, mod: 3, tipo: "taglienti" }, { n: 1, f: 6, mod: 0, tipo: "fulmine" }].
    Le alternative tra parentesi ("1d10+4 a due mani") non contano. */
export function partiFormula(danni) {
  const t = String(danni || "").replace(/\([^)]*\)/g, "");
  return [...t.matchAll(/(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+(?!\s*d))?\s*([a-zàèéìòù]+)?/gi)].map(m => ({
    n: +m[1], f: +m[2], mod: m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0, tipo: (m[4] || "").toLowerCase(),
  }));
}

/** Resistenze del personaggio (es. ["Fulmine"]): i danni di quel tipo si dimezzano, per difetto. */
export function conResistenze(perTipo, resistenze = []) {
  const r = resistenze.map(x => x.toLowerCase());
  let tot = 0; const dimezzati = [];
  for (const [tipo, n] of Object.entries(perTipo)) {
    if (r.includes(tipo)) { tot += Math.floor(n / 2); dimezzati.push(tipo); } else tot += n;
  }
  return { tot, dimezzati };
}
