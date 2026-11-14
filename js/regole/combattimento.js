/* Regole dello scontro: iniziativa e turni. Funzioni pure (niente pagina, niente archivio),
   così i test le provano da sole con npm test. I dadi li tirano i giocatori: qui si fanno solo i conti. */

/** Un dado da 20 scritto a mano: intero tra 1 e 20, altrimenti null. */
export function leggiD20(v) {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 1 && n <= 20 ? n : null;
}

/** Totale dell'iniziativa.
    dadi: i d20 scritti dal giocatore (due se ha vantaggio) · mod: il modificatore della scheda.
    Con vantaggio conta il dado più alto. Restituisce null se manca un dado o non è valido. */
export function totaleIniziativa({ dadi, mod, vantaggio }) {
  const servono = vantaggio ? 2 : 1;
  const d = (dadi || []).slice(0, servono).map(leggiD20);
  if (d.length < servono || d.some(x => x === null)) return null;
  const usato = Math.max(...d);
  return { dadi: d, usato, mod, tot: usato + mod };
}

/** Ordine dei turni: totale più alto prima; a parità, Destrezza più alta.
    Se anche la Destrezza è uguale l'ordine resta quello d'ingresso e decide il master (vedi pariConPrecedente). */
export function ordina(voci) {
  return voci.map((v, i) => [v, i])
    .sort(([a, i], [b, j]) => (b.tot - a.tot) || ((b.des ?? 0) - (a.des ?? 0)) || (i - j))
    .map(([v]) => v);
}

/** true se la voce in posizione i è pari con quella prima e la Destrezza non basta a separarle
    (uguale, oppure sconosciuta perché il personaggio non ha la scheda): lì il master può scambiarle a mano. */
export function pariConPrecedente(ordine, i) {
  if (i <= 0 || i >= ordine.length) return false;
  const a = ordine[i - 1], b = ordine[i];
  if (a.tot !== b.tot) return false;
  return a.des == null || b.des == null || a.des === b.des;
}

/** Turno successivo: in fondo alla lista si torna in cima e il round sale di uno. */
export function avanza({ turno, round }, quanti) {
  if (!quanti) return { turno: 0, round };
  return turno + 1 >= quanti ? { turno: 0, round: round + 1 } : { turno: turno + 1, round };
}

/** Turno precedente (per correggere un "Fine turno" premuto per sbaglio). Non scende sotto il round 1. */
export function indietro({ turno, round }, quanti) {
  if (!quanti) return { turno: 0, round };
  if (turno > 0) return { turno: turno - 1, round };
  return round > 1 ? { turno: quanti - 1, round: round - 1 } : { turno: 0, round: 1 };
}
