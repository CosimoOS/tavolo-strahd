/* Munizioni. Funzioni pure, provate da test/munizioni.test.js.
   Regola della casa (Campagna → Regole del tavolo, "Munizioni comuni infinite", accesa di solito): le munizioni comuni
   non si contano; si contano solo quelle speciali (frecce d'argento, frecce magiche…), ognuna con il suo nome.
     S.munizioni = [{ id, nome, n }]   le scorte speciali
     arma.mun    = id della scorta che usa (un arco con le frecce d'argento)
     arma.ammo   = usa munizioni comuni; con la regola spenta si contano in S.ammo, come nel manuale */

const COMUNI = "comuni";

/** I contatori da mostrare nella scheda: le scorte speciali e, con la regola spenta, le comuni. */
export function scorte(S, infinite) {
  const speciali = S.munizioni || [];
  const comuni = !infinite && (S.weapons || []).some(w => w.ammo && !w.mun);
  return comuni ? [...speciali, { id: COMUNI, nome: "Munizioni", n: S.ammo || 0 }] : speciali;
}

/** La scorta che l'arma w usa, con quante ne restano ({ id, nome, n }); null se non ha munizioni da contare. */
export function munizioneDi(S, w, infinite) {
  if (w.mun) return (S.munizioni || []).find(x => x.id === w.mun) || null;
  return w.ammo && !infinite ? { id: COMUNI, nome: "Munizioni", n: S.ammo || 0 } : null;
}

/** Un tiro con l'arma w consuma una munizione? Restituisce cosa cambiare nella scheda (cambia), quante ne restano
    e finite: true se non ce n'erano più; null se l'arma non usa munizioni da contare. */
export function usaMunizione(S, w, infinite) {
  const m = munizioneDi(S, w, infinite);
  if (!m) return null;
  if (m.n <= 0) return { id: m.id, nome: m.nome, restano: 0, finite: true, cambia: {} };
  const cambia = m.id === COMUNI ? { ammo: m.n - 1 } : { munizioni: S.munizioni.map(x => x.id === m.id ? { ...x, n: x.n - 1 } : x) };
  return { id: m.id, nome: m.nome, restano: m.n - 1, cambia };
}

/** Una scorta speciale nuova (dal modulo "Nuova arma"): la chiave nasce dal nome, senza doppioni; mai sotto zero. */
export function aggiungiScorta(S, nome, n) {
  const base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "munizioni";
  const prese = new Set((S.munizioni || []).map(m => m.id));
  let id = base, k = 2; while (prese.has(id)) id = `${base}-${k++}`;
  return { id, munizioni: [...(S.munizioni || []), { id, nome, n: Math.max(0, n || 0) }] };
}
