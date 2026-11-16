/* Salita di livello decisa dal master (regola del nostro tavolo). Funzioni pure, provate da test/livelli.test.js.
   In campagna/impostazioni:  salitaLibera = i giocatori salgono da soli (spenta);
                              salite = { petrus: 7, … } il livello a cui il master ha dato il via per ogni scheda. */

/** Questa scheda può salire adesso? Il master sempre; i giocatori con la salita libera o fino al livello concesso. */
export function puoSalire({ livello, concesso, libera, master }) {
  if (livello >= 20) return false;
  return !!master || !!libera || livello < (concesso || 0);
}
/** Il master dà il via: ogni scheda scelta può arrivare al suo livello più uno. */
export const concedi = (salite, schede) => ({ ...(salite || {}), ...Object.fromEntries(schede.map(s => [s.id, s.livello + 1])) });
/** Il master toglie il via a una scheda. */
export const revoca = (salite, id) => Object.fromEntries(Object.entries(salite || {}).filter(([k]) => k !== id));
/** Chi ha il via ma deve ancora salire. */
export const inAttesa = (salite, schede) => schede.filter(s => s.livello < ((salite || {})[s.id] || 0)).map(s => s.id);

/** Tornare indietro di un livello (un errore nel salire): i campi della scheda com'erano prima, presi dallo storico dei
    livelli (S.history). I PF scendono di quanto scende il massimo. null se non c'è niente da annullare.
    Si può ripetere: ogni volta toglie l'ultimo livello preso nell'app. */
export function livelloPrima(S) {
  const b = (S.history || [])[S.history ? S.history.length - 1 : 0]; if (!b) return null;
  const riduzione = S.riduzione || 0, perso = S.maxhp - b.maxhp;
  return { level: b.level, maxhp: b.maxhp, scores: b.scores, styles: b.styles, asi: b.asi, scelte: b.scelte || [], livelli: b.livelli || null,
    hp: Math.max(0, Math.min(Math.max(1, b.maxhp - riduzione), S.hp - perso)), dv: Math.min(S.dv || 0, b.level), history: S.history.slice(0, -1) };
}
