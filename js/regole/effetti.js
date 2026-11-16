/* Effetti attivi in combattimento: incantesimi a concentrazione che cambiano gli attacchi finché durano.
   Funzioni pure, provate da test/effetti.test.js. Sulla scheda: St.effetto, valido finché St.conc è il suo incantesimo.
     marchio      Marchio del cacciatore: +1d6 a ogni colpo con un'arma sul bersaglio marchiato { bersaglio, nome };
                  se il bersaglio cade, si sposta su un altro con la sola azione bonus (niente slot)
     favore       Favore divino: +1d4 radianti a ogni colpo con un'arma
     arma-magica  Arma magica: +1 a colpire e ai danni con l'arma incantata { arma, nome } */
export const EFFETTI = {
  "Marchio del cacciatore": { id: "marchio", vuole: "bersaglio" },
  "Favore divino": { id: "favore" },
  "Arma magica": { id: "arma-magica", vuole: "arma" },
};
const incantesimoDi = id => Object.keys(EFFETTI).find(n => EFFETTI[n].id === id);

/** L'effetto in corso, o null se la concentrazione è finita o è passata a un altro incantesimo. */
export const effettoAttivo = St => St && St.effetto && St.conc && St.conc === incantesimoDi(St.effetto.id) ? St.effetto : null;

/** Lanciato l'incantesimo: l'effetto da ricordare sulla scheda (null se l'incantesimo non ne ha uno). */
export function attiva(incantesimo, { bersaglio, arma, nome } = {}) {
  const e = EFFETTI[incantesimo]; if (!e) return null;
  const tutto = { id: e.id, ...(e.vuole === "bersaglio" ? { bersaglio, nome } : e.vuole === "arma" ? { arma, nome } : {}) };
  return Object.fromEntries(Object.entries(tutto).filter(([, v]) => v !== undefined));   // niente campi vuoti: l'archivio non li accetta
}

/** I danni in più che si accendono da soli per questo attacco (gli id di EXTRA_DANNI). */
export function extraAccesi(effetto, { bersaglio, arma }) {
  if (!effetto || !arma) return [];
  if (effetto.id === "marchio") return effetto.bersaglio === bersaglio ? ["marchio"] : [];
  return effetto.id === "favore" ? ["favore"] : [];
}

/** Arma magica: +1 a colpire e ai danni con quell'arma. */
export const bonusColpire = (effetto, idArma) => effetto && effetto.id === "arma-magica" && effetto.arma === idArma ? 1 : 0;

/** Prima di un attacco con un'arma: proporre il Marchio? "lancia" (uno slot e l'azione bonus), "sposta" (il marchiato
    è caduto: solo l'azione bonus), o null. vivi: gli id delle creature ancora in piedi. */
export function proponiMarchio({ sa, effetto, bersaglio, bonusLibero, slotLiberi, vivi }) {
  if (!sa || !bonusLibero) return null;
  if (effetto && effetto.id === "marchio") return effetto.bersaglio !== bersaglio && !vivi.includes(effetto.bersaglio) ? "sposta" : null;
  return slotLiberi > 0 ? "lancia" : null;
}
