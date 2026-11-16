/* Incantesimi e oggetti che si usano in combattimento: come si tirano e che danni fanno.
   Funzioni pure, provate da test/magia.test.js. I dadi li tirano i giocatori: qui ci sono solo le regole.

   parti dei danni: [{ n, f, mod, t }] = n dadi da f facce + mod, di tipo t ("arma" = lo stesso tipo dell'arma). */

/** Incantesimi che attaccano. tipo "attacco": tiro per colpire con incantesimo; "ts": il bersaglio fa un tiro salvezza.
    trucchetto: i dadi crescono col livello del personaggio (5°, 11°, 17°). meta: con il tiro salvezza riuscito, metà danni.
    area: può colpire più creature. slot: spende uno slot di quel livello quando lo lanci. */
export const INCANTESIMI_ATTACCO = {
  "Produrre fiamma": { tipo: "attacco", parti: [{ n: 1, f: 8, t: "fuoco" }], trucchetto: true, gittata: "9 m" },
  "Frusta di spine": { tipo: "attacco", parti: [{ n: 1, f: 6, t: "perforanti" }], trucchetto: true, gittata: "9 m", nota: "tira il bersaglio di 3 m verso di te" },
  "Spruzzo velenoso": { tipo: "ts", ts: "cos", parti: [{ n: 1, f: 12, t: "veleno" }], trucchetto: true, gittata: "3 m" },
  "Onda tonante": { tipo: "ts", ts: "cos", parti: [{ n: 2, f: 8, t: "tuono" }], meta: true, area: true, slot: 1, nota: "chi fallisce viene spinto via di 3 m" },
  "Lama infuocata": { tipo: "attacco", parti: [{ n: 3, f: 6, t: "fuoco" }], gittata: "mischia", nota: "dopo averla evocata, attacco a ogni turno" },
  "Sfera infuocata": { tipo: "ts", ts: "des", parti: [{ n: 2, f: 6, t: "fuoco" }], meta: true, nota: "chi finisce il turno accanto alla sfera" },
  "Raggio di luna": { tipo: "ts", ts: "cos", parti: [{ n: 2, f: 10, t: "radianti" }], meta: true, area: true, nota: "chi entra o inizia il turno nel raggio" },
};

/** Gli extra che si aggiungono ai danni di un colpo con un'arma. Si accendono nel passo dei danni.
    incantesimo: serve averlo tra i conosciuti o i preparati · scelta: [id, valore] serve quella scelta di classe
    slot: spende uno slot di quel livello (le punizioni) · volte: "turno" = una volta per turno. */
export const EXTRA_DANNI = [
  { id: "marchio", nome: "Marchio del cacciatore", parti: [{ n: 1, f: 6, t: "arma" }], incantesimo: "Marchio del cacciatore", nota: "se il bersaglio è marchiato" },
  { id: "colosso", nome: "Uccisore di colossi", parti: [{ n: 1, f: 8, t: "arma" }], scelta: ["preda", "colosso"], volte: "turno", nota: "una volta per turno, se il bersaglio era già ferito" },
  { id: "zefiro", nome: "Colpo di zefiro", parti: [{ n: 1, f: 8, t: "forza" }], incantesimo: "Colpo di zefiro", nota: "una volta, mentre l'incantesimo è attivo" },
  { id: "favore", nome: "Favore divino", parti: [{ n: 1, f: 4, t: "radianti" }], incantesimo: "Favore divino", nota: "mentre l'incantesimo è attivo" },
  { id: "ardente", nome: "Punizione ardente", parti: [{ n: 1, f: 6, t: "fuoco" }], incantesimo: "Punizione ardente", slot: 1 },
  { id: "tonante", nome: "Punizione tonante", parti: [{ n: 2, f: 6, t: "tuono" }], incantesimo: "Punizione tonante", slot: 1 },
  { id: "iraconda", nome: "Punizione iraconda", parti: [{ n: 1, f: 6, t: "psichici" }], incantesimo: "Punizione iraconda", slot: 1 },
  { id: "marchiante", nome: "Punizione marchiante", parti: [{ n: 2, f: 6, t: "radianti" }], incantesimo: "Punizione marchiante", slot: 2 },
  { id: "accecante", nome: "Punizione accecante", parti: [{ n: 3, f: 8, t: "radianti" }], incantesimo: "Punizione accecante", slot: 3 },
  { id: "sbilanciante", nome: "Punizione sbilanciante", parti: [{ n: 4, f: 6, t: "psichici" }], incantesimo: "Punizione sbilanciante", slot: 4 },
];

/** Dadi di un trucchetto al livello del personaggio: x2 dal 5°, x3 dall'11°, x4 dal 17°. */
export const moltTrucchetto = l => 1 + (l >= 5) + (l >= 11) + (l >= 17);

/** Con un critico raddoppiano i dadi (non i modificatori). t "arma" diventa il tipo dell'arma. */
export function partiDanno(parti, { critico = false, tipoArma = "", molt = 1 } = {}) {
  return parti.map(p => ({ n: p.n * molt * (critico ? 2 : 1), f: p.f, mod: p.mod || 0, t: p.t === "arma" ? tipoArma : p.t }));
}

/** Pozioni e oggetti che curano: quanti PF (formula da tirare). */
export const CURE = [
  { re: /pozione di guarigione suprema/i, nome: "Pozione di guarigione suprema", parti: [{ n: 10, f: 4, mod: 20, t: "cura" }] },
  { re: /pozione di guarigione maggiore/i, nome: "Pozione di guarigione maggiore", parti: [{ n: 8, f: 4, mod: 8, t: "cura" }] },
  { re: /pozione di guarigione superiore/i, nome: "Pozione di guarigione superiore", parti: [{ n: 4, f: 4, mod: 4, t: "cura" }] },
  { re: /pozione di guarigione|pozione curativa/i, nome: "Pozione di guarigione", parti: [{ n: 2, f: 4, mod: 2, t: "cura" }] },
];
export const curaDi = nome => CURE.find(c => c.re.test(nome)) || null;

/** Danni finali di un tiro salvezza: chi fallisce prende tutto, chi riesce metà (se l'incantesimo lo prevede) o niente. */
export const danniTs = (tot, riuscito, meta) => riuscito ? (meta ? Math.floor(tot / 2) : 0) : tot;
