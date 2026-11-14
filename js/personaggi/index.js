/* Elenco dei personaggi e dei profili.
   Un profilo è "chi tiene il telefono"; un personaggio è una scheda. Il tuo profilo ne ha due. */
import rombosogliola from "./rombosogliola.js";
import ireena from "./ireena.js";

export const PERSONAGGI = { rombosogliola, ireena };

export const PROFILI = [
  { id: "dm", nome: "Master", sotto: "Dungeon Master", stemma: "dm", personaggi: Object.keys(PERSONAGGI) },
  { id: "rombosogliola", nome: "Rombosogliola", sotto: "con Ireena", stemma: "pesce", personaggi: ["rombosogliola", "ireena"] },
  { id: "petrus", nome: "Petrus", sotto: "Ranger", stemma: "P", personaggi: [] },
  { id: "rex", nome: "Rex", sotto: "Paladino", stemma: "R", personaggi: [] },
];

export const profilo = id => PROFILI.find(p => p.id === id) || null;
