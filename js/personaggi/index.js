/* Elenco dei personaggi e dei profili.
   Un profilo è "chi tiene il telefono"; un personaggio è una scheda. Il tuo profilo ne ha due.
   Ogni personaggio indica la sua classe: qui si uniscono (vedi js/classi/componi.js). */
import rombosogliola from "./rombosogliola.js";
import ireena from "./ireena.js";
import rex from "./rex.js";
import { CLASSI } from "../classi/index.js";
import { componi } from "../classi/componi.js";
import { opzioni } from "../campagna.js";

export const DATI = { rombosogliola, ireena, rex };
export const PERSONAGGI = Object.fromEntries(Object.entries(DATI).map(([k, p]) => [k, componi(p, CLASSI[p.classe], opzioni)]));

export const PROFILI = [
  { id: "dm", nome: "Master", sotto: "Dungeon Master", stemma: "dm", personaggi: Object.keys(PERSONAGGI) },
  { id: "rombosogliola", nome: "Rombosogliola", sotto: "con Ireena", stemma: "pesce", personaggi: ["rombosogliola", "ireena"] },
  { id: "petrus", nome: "Petrus", sotto: "Ranger", stemma: "P", personaggi: [] },
  { id: "rex", nome: "Rex", sotto: "Paladino", stemma: "R", personaggi: ["rex"] },
];

export const profilo = id => PROFILI.find(p => p.id === id) || null;
