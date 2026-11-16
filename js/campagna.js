/* Le regole del tavolo, decise dal master e uguali per tutti (nell'archivio: campagna/impostazioni).
   { tasha }            privilegi opzionali e aggiunte del Calderone di Tasha: spenta finché il master non la accende
   { pozioniBonus }     bere una pozione da soli costa l'azione bonus
   { salitaLibera, salite } i livelli li concede il master (vedi regole/livelli.js): spenta, è la regola del nostro tavolo
   { munizioniInfinite } le munizioni comuni non si contano, solo quelle speciali: accesa (è la regola del nostro tavolo) */
const BASE = { tasha: false, munizioniInfinite: true, salitaLibera: false };
let OPZ = { ...BASE };
const ascoltatori = new Set();
export const opzioni = () => OPZ;
export function impostaOpzioni(v) { OPZ = { ...BASE, ...(v || {}) }; ascoltatori.forEach(f => f(OPZ)); }
export const suOpzioni = f => { ascoltatori.add(f); return () => ascoltatori.delete(f); };
