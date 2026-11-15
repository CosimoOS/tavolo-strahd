/* Pezzi in comune tra le classi. */

/* slot dei "mezzi incantatori" (paladino, ranger) per livello: [1°, 2°, 3°, 4°, 5°] */
const MEZZO = [[], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3],
  [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
export const slotMezzo = l => MEZZO[Math.max(0, Math.min(20, l))];

/** Righe "Slot di N° livello" per le risorse della scheda. */
export const risorseSlot = (L, testo = "riposo lungo") =>
  slotMezzo(L).map((n, i) => ({ k: "slot" + (i + 1), nome: `Slot di ${i + 1}° livello`, testo, max: n, riposo: "lungo" }));

/** L'ultima scelta fatta per una certa opzione (es. "preda" del Cacciatore), o null. */
export const scelta = (S, id) => {
  const v = (S.scelte || []).filter(x => x.id === id);
  return v.length ? v[v.length - 1].valore : null;
};
/** Tutte le scelte fatte per un'opzione che si ripete (es. i nemici prescelti). */
export const scelteTutte = (S, id) => (S.scelte || []).filter(x => x.id === id).map(x => x.valore);

/** Una scelta da proporre nel passaggio di livello. */
export const opzione = (id, titolo, opzioni, extra = {}) => ({ id, titolo, opzioni, ...extra });
