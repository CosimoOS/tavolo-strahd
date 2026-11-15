/* Le regole del tavolo, decise dal master e uguali per tutti (nell'archivio: campagna/impostazioni).
   Per ora una sola: { tasha } = privilegi opzionali e aggiunte del Calderone di Tasha. Spenta finché il master non la accende. */
let OPZ = { tasha: false };
const ascoltatori = new Set();
export const opzioni = () => OPZ;
export function impostaOpzioni(v) { OPZ = { tasha: false, ...(v || {}) }; ascoltatori.forEach(f => f(OPZ)); }
export const suOpzioni = f => { ascoltatori.add(f); return () => ascoltatori.delete(f); };
