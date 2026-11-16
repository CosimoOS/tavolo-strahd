/* Paladino (Manuale del Giocatore 2014) con i privilegi opzionali del Calderone di Tasha.
   Sottoclasse in uso: Giuramento di Vendetta. */
import { STYLES } from "../regole/stili.js";
import { slotMezzo, risorseSlot } from "./comune.js";

/* incantesimi da paladino, riassunti. tasha: aggiunti dal Calderone (solo se il master usa le opzioni di Tasha) */
export const INCANTESIMI_PALADINO = [
  { n: "Benedizione", liv: 1, conc: true, t: "Tu e fino a 3 alleati aggiungete 1d4 ai tiri per colpire e ai tiri salvezza." },
  { n: "Comando", liv: 1, t: "Una parola d'ordine (avvicinati, fuggi, cadi, fermati, lascia): tiro salvezza su Saggezza o obbedisce nel suo turno." },
  { n: "Duello obbligato", liv: 1, conc: true, t: "Azione bonus: un nemico ha svantaggio ad attaccare altri che te e fatica ad allontanarsi da te." },
  { n: "Cura ferite", liv: 1, t: "Una creatura toccata recupera 1d8 + Car PF (+1d8 per ogni livello di slot sopra il 1°)." },
  { n: "Individuazione del bene e del male", liv: 1, conc: true, t: "Per 10 minuti percepisci aberrazioni, celestiali, elementali, folletti, immondi e non morti entro 9 m." },
  { n: "Individuazione del magico", liv: 1, conc: true, rituale: true, t: "Per 10 minuti percepisci la magia entro 9 m e ne vedi l'aura." },
  { n: "Individuazione di malattie e veleni", liv: 1, conc: true, rituale: true, t: "Percepisci veleni, creature velenose e malattie entro 9 m." },
  { n: "Favore divino", liv: 1, conc: true, t: "Azione bonus: +1d4 danni radianti a ogni colpo con un'arma per 1 minuto." },
  { n: "Eroismo", liv: 1, conc: true, t: "Una creatura non può essere spaventata e riceve PF temporanei pari al tuo Carisma a ogni suo turno." },
  { n: "Protezione dal bene e dal male", liv: 1, conc: true, t: "Aberrazioni, celestiali, elementali, folletti, immondi e non morti hanno svantaggio contro il bersaglio, che non può essere affascinato, spaventato o posseduto da loro." },
  { n: "Purificare cibo e bevande", liv: 1, rituale: true, t: "Rende commestibili cibo e bevande avariati o avvelenati." },
  { n: "Punizione ardente", liv: 1, conc: true, t: "Azione bonus: il prossimo colpo fa +1d6 fuoco e incendia il bersaglio (1d6 a ogni turno finché non lo spegne)." },
  { n: "Scudo della fede", liv: 1, conc: true, t: "Azione bonus: +2 alla CA di una creatura entro 18 m." },
  { n: "Punizione tonante", liv: 1, conc: true, t: "Azione bonus: il prossimo colpo fa +2d6 tuono e spinge via il bersaglio di 3 m, che cade prono se fallisce il tiro su Forza." },
  { n: "Punizione iraconda", liv: 1, conc: true, t: "Azione bonus: il prossimo colpo fa +1d6 psichici e spaventa il bersaglio se fallisce il tiro su Saggezza." },
  { n: "Aiuto", liv: 2, t: "Fino a 3 creature: +5 PF massimi e attuali per 8 ore." },
  { n: "Punizione marchiante", liv: 2, conc: true, t: "Azione bonus: il prossimo colpo fa +2d6 radianti e rende il bersaglio visibile (niente invisibilità)." },
  { n: "Trova destriero", liv: 2, t: "Evochi un destriero spirituale fedele (cavallo da guerra, pony, cammello, alce o mastino)." },
  { n: "Ristorare inferiore", liv: 2, t: "Termina una malattia o una condizione: accecato, assordato, paralizzato o avvelenato." },
  { n: "Localizzare oggetto", liv: 2, conc: true, t: "Percepisci la direzione di un oggetto che conosci entro 300 m." },
  { n: "Arma magica", liv: 2, conc: true, t: "Azione bonus: un'arma non magica diventa +1 ai tiri per colpire e ai danni." },
  { n: "Protezione dal veleno", liv: 2, t: "Neutralizza un veleno; per 1 ora vantaggio ai tiri contro il veleno e resistenza ai suoi danni." },
  { n: "Zona di verità", liv: 2, t: "Per 10 minuti, in un raggio di 4,5 m, chi fallisce il tiro su Carisma non può mentire deliberatamente." },
  { n: "Riposo inviolato", liv: 2, rituale: true, tasha: true, t: "Un cadavere non si decompone e non può diventare non morto per 10 giorni." },
  { n: "Preghiera di guarigione", liv: 2, tasha: true, t: "In 10 minuti fino a 6 creature recuperano 2d8 + Car PF." },
  { n: "Legame protettivo", liv: 2, tasha: true, t: "Un alleato ha +1 CA e tiri salvezza e resistenza a tutti i danni; tu subisci gli stessi danni che subisce lui." },
  { n: "Aura di vitalità", liv: 3, conc: true, t: "Per 1 minuto, azione bonus: una creatura entro 9 m recupera 2d6 PF." },
  { n: "Punizione accecante", liv: 3, conc: true, t: "Azione bonus: il prossimo colpo fa +3d8 radianti e acceca il bersaglio se fallisce il tiro su Costituzione." },
  { n: "Creare cibo e acqua", liv: 3, t: "Cibo e acqua per 15 persone o 5 cavalcature per un giorno." },
  { n: "Manto del crociato", liv: 3, conc: true, t: "Tu e gli alleati entro 9 m: +1d4 radianti a ogni colpo con un'arma." },
  { n: "Luce diurna", liv: 3, t: "Una sfera di luce intensa di 18 m: la luce del sole che ferisce i vampiri." },
  { n: "Dissolvi magie", liv: 3, t: "Termina gli incantesimi di 3° livello o inferiori su un bersaglio; per i più alti prova di caratteristica." },
  { n: "Arma elementale", liv: 3, conc: true, t: "Un'arma diventa +1 e fa +1d4 danni di un tipo elementale a scelta." },
  { n: "Cerchio magico", liv: 3, t: "Un cilindro che tiene fuori (o dentro) celestiali, elementali, folletti, immondi o non morti." },
  { n: "Rimuovi maledizione", liv: 3, t: "Termina le maledizioni su una creatura o un oggetto." },
  { n: "Rinascita", liv: 3, t: "Riporta in vita una creatura morta da non più di 1 minuto, con 1 PF (serve un diamante da 300 mo)." },
  { n: "Mantello spirituale", liv: 3, conc: true, tasha: true, t: "Azione bonus: i tuoi colpi entro 3 m fanno +1d8 radianti (o necrotici o freddo) e impediscono di recuperare PF." },
  { n: "Aura di vita", liv: 4, conc: true, t: "Tu e gli alleati entro 9 m resistete ai danni necrotici, e chi è a 0 PF si rialza con 1 PF." },
  { n: "Aura di purezza", liv: 4, conc: true, t: "Entro 9 m: niente malattie, resistenza al veleno e vantaggio contro molte condizioni." },
  { n: "Esilio", liv: 4, conc: true, t: "Tiro salvezza su Carisma o la creatura viene mandata via (per sempre, se viene da un altro piano)." },
  { n: "Interdizione alla morte", liv: 4, t: "La prima volta che scenderebbe a 0 PF, il bersaglio resta a 1 PF." },
  { n: "Localizzare creatura", liv: 4, conc: true, t: "Percepisci la direzione di una creatura che conosci entro 300 m." },
  { n: "Punizione sbilanciante", liv: 4, conc: true, t: "Azione bonus: il prossimo colpo fa +4d6 psichici e il bersaglio, se fallisce il tiro su Saggezza, ha svantaggio e niente reazioni." },
  { n: "Punizione esiliante", liv: 5, conc: true, t: "Azione bonus: il prossimo colpo fa +5d10 forza e, se il bersaglio scende a 50 PF o meno, lo esilia." },
  { n: "Cerchio di potere", liv: 5, conc: true, t: "Entro 9 m gli alleati hanno vantaggio ai tiri contro la magia e dimezzano o annullano i danni magici." },
  { n: "Onda distruttiva", liv: 5, t: "Entro 9 m: 5d6 tuono + 5d6 radianti o necrotici ai nemici, che cadono proni se falliscono il tiro su Costituzione." },
  { n: "Dissolvi il bene e il male", liv: 5, conc: true, t: "Svantaggio agli attacchi delle creature extraplanari contro di te; puoi scacciarle o liberare chi possiedono." },
  { n: "Costrizione", liv: 5, t: "Un ordine che il bersaglio deve seguire per 30 giorni, pena 5d10 psichici." },
  { n: "Rianimare morti", liv: 5, t: "Riporta in vita una creatura morta da non più di 10 giorni (serve un diamante da 500 mo)." },
  { n: "Evoca celestiale", liv: 5, conc: true, tasha: true, t: "Evochi uno spirito celestiale che combatte al tuo fianco." },
];

const GIURAMENTO = {
  vendetta: [[3, ["Anatema", "Marchio del cacciatore"]], [5, ["Blocca persone", "Passo velato"]], [9, ["Velocità", "Protezione dall'energia"]],
    [13, ["Esilio", "Porta dimensionale"]], [17, ["Blocca mostri", "Scrutare"]]],
};
/* gli incantesimi del giuramento non sono tutti da paladino: qui il loro riassunto */
const EXTRA = {
  "Anatema": { liv: 1, conc: true, t: "Fino a 3 creature, tiro salvezza su Carisma: se falliscono sottraggono 1d4 ai tiri per colpire e ai tiri salvezza." },
  "Marchio del cacciatore": { liv: 1, conc: true, t: "Azione bonus: +1d6 danni a ogni colpo con un'arma contro il bersaglio marchiato, vantaggio per seguirne le tracce." },
  "Blocca persone": { liv: 2, conc: true, t: "Un umanoide, tiro salvezza su Saggezza o paralizzato; i colpi in mischia entro 1,5 m sono critici automatici." },
  "Passo velato": { liv: 2, t: "Azione bonus: teletrasporto fino a 9 m in uno spazio libero che vedi." },
  "Velocità": { liv: 3, conc: true, t: "Una creatura raddoppia la velocità, +2 CA, vantaggio ai tiri su Destrezza e un'azione in più (limitata) per turno." },
  "Protezione dall'energia": { liv: 3, conc: true, t: "Resistenza a un tipo di danno: acido, freddo, fuoco, fulmine o tuono." },
  "Esilio": { liv: 4, conc: true, t: "Tiro salvezza su Carisma o la creatura viene mandata via." },
  "Porta dimensionale": { liv: 4, t: "Teletrasporto fino a 150 m, anche con un compagno." },
  "Blocca mostri": { liv: 5, conc: true, t: "Una creatura, tiro salvezza su Saggezza o paralizzata." },
  "Scrutare": { liv: 5, conc: true, t: "Spii una creatura a distanza attraverso un sensore invisibile." },
};

export default {
  id: "paladino", nome: "Paladino", dadoVita: 10, pfMedia: 6, ts: ["sag", "car"],
  armature: ["leggera", "media", "pesante"], magia: l => l >= 2, incantatore: "mezzo",
  asi: [4, 8, 12, 16, 19], stileAl: 2,
  attacchi: l => l >= 5 ? 2 : 1, punizione: true,
  /* Aura di protezione: dal 6° livello +Car (minimo +1) a tutti i tiri salvezza */
  bonusTs: (l, M) => l >= 6 ? Math.max(1, M.car) : 0,

  risorse(L, X, S, opz) {
    const r = risorseSlot(L, "Incantesimi e Punizione divina · riposo lungo");
    if (L >= 3) r.push({ k: "canale", nome: "Incanalare divinità", testo: `Le opzioni del giuramento${opz.tasha ? " o Potere divino" : ""} · riposo breve`, max: 1, riposo: "breve" });
    r.push({ k: "senso", nome: "Percezione del divino", testo: "Azione · celestiali, immondi e non morti entro 18 m · riposo lungo", max: 1 + Math.max(0, X.M.car), riposo: "lungo" });
    return r;
  },
  riserva: L => ({ k: "mani", nome: "Imposizione delle mani", testo: "Azione · tocca e cura; 5 punti curano una malattia o un veleno · riposo lungo", max: 5 * L }),
  atkNota: L => L >= 2 ? `Punizione divina: dopo un colpo in mischia spendi uno slot, +2d8 radianti con uno di 1°, +1d8 per ogni livello in più (+1d8 contro non morti e immondi). Con un critico raddoppiano anche questi dadi.${L >= 11 ? " Punizione migliorata: +1d8 radianti a ogni colpo in mischia." : ""}` : "",

  /* incantesimi: CD, preparati (Car + metà livello) e quelli del giuramento sempre pronti */
  carMagia: "car",
  magiaTesto: (L, X) => `CD ${8 + X.P + X.M.car} · ${X.P + X.M.car >= 0 ? "+" : ""}${X.P + X.M.car} per colpire`,
  quantiPreparati: (L, X) => Math.max(1, X.M.car + Math.floor(L / 2)),
  maxLivelloIncantesimi: L => slotMezzo(L).length,
  incantesimiClasse: (opz) => INCANTESIMI_PALADINO.filter(i => opz.tasha || !i.tasha),
  incantesimiSottoclasse(sotto, L) {
    return (GIURAMENTO[sotto] || []).filter(([l]) => l <= L).flatMap(([, v]) => v)
      .map(n => ({ n, ...(EXTRA[n] || INCANTESIMI_PALADINO.find(i => i.n === n) || { liv: 1, t: "" }), giur: true }));
  },

  novita(l, opz) {
    const f = [];
    if (l === 2) f.push(["Incantesimi e Punizione divina", "Slot di 1° livello; dopo un colpo in mischia uno slot diventa +2d8 radianti."]);
    if (l === 3) f.push(["Salute divina", "Immune alle malattie."]);
    if (l === 3 && opz.tasha) f.push(["Potere divino (Tasha)", "Incanalare divinità: recuperi uno slot di livello pari a metà del bonus di competenza."]);
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica, +1 a due, oppure un talento."]);
    if (opz.tasha && this.asi.includes(l)) f.push(["Versatilità marziale (Tasha)", "Puoi cambiare lo stile di combattimento."]);
    if (l === 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco. Slot di 2° livello."]);
    if (l === 6) f.push(["Aura di protezione", "Lui e gli alleati entro 3 m aggiungono il Carisma ai tiri salvezza."]);
    if (l === 9) f.push(["Slot di 3° livello", "Nuovi incantesimi tra cui scegliere i preparati."]);
    if (l === 10) f.push(["Aura di coraggio", "Lui e gli alleati entro 3 m non possono essere spaventati."]);
    if (l === 11) f.push(["Punizione divina migliorata", "+1d8 danni radianti a ogni colpo in mischia."]);
    if (l === 13) f.push(["Slot di 4° livello", "Nuovi incantesimi tra cui scegliere i preparati."]);
    if (l === 14) f.push(["Tocco purificatore", "Azione: termina un incantesimo su sé o su una creatura consenziente, Car volte per riposo lungo."]);
    if (l === 17) f.push(["Slot di 5° livello", "Nuovi incantesimi tra cui scegliere i preparati."]);
    if (l === 18) f.push(["Aure migliorate", "Le aure arrivano a 9 m."]);
    return f;
  },
  privilegi(L, X, S, opz) {
    const car = Math.max(1, X.M.car), f = [];
    if (L >= 6) f.push(["Aura di protezione", `Lui e gli alleati entro ${L >= 18 ? 9 : 3} m aggiungono +${car} a tutti i tiri salvezza (già incluso nei suoi).`]);
    if (L >= 10) f.push(["Aura di coraggio", `Lui e gli alleati entro ${L >= 18 ? 9 : 3} m non possono essere spaventati.`]);
    if (L >= 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco."]);
    S.styles.forEach(s => f.push([`Stile di combattimento: ${s}`, `${STYLES[s] || ""}${s === "Difesa" ? " Già incluso." : ""}`]));
    if (L >= 3) f.push(["Salute divina", "Immune alle malattie."]);
    if (L >= 3 && opz.tasha) f.push(["Potere divino", `Incanalare divinità, azione bonus: recuperi uno slot fino al ${Math.ceil(X.P / 2)}° livello.`]);
    if (L >= 14) f.push(["Tocco purificatore", `Azione: termina un incantesimo, ${car} volte per riposo lungo.`]);
    return f;
  },
  scelte(l, S, opz) {
    if (!opz.tasha || !this.asi.includes(l) || !S.styles.length) return [];
    return [{ id: "versatilita", titolo: "Versatilità marziale: cambiare lo stile?", tipo: "cambio-stile" }];
  },

  sottoclassi: {
    vendetta: {
      nome: "Giuramento di Vendetta",
      novita(l) {
        const f = [];
        if (l === 3) f.push(["Giuramento di Vendetta", "Voto di inimicizia e Abiura nemico; Anatema e Marchio del cacciatore sempre preparati."]);
        if (l === 5) f.push(["Incantesimi del giuramento", "Blocca persone e Passo velato sempre preparati."]);
        if (l === 7) f.push(["Vendicatore implacabile", "Dopo un attacco di opportunità riuscito, si muove di metà velocità senza provocare attacchi di opportunità."]);
        if (l === 9) f.push(["Incantesimi del giuramento", "Velocità e Protezione dall'energia sempre preparati."]);
        if (l === 13) f.push(["Incantesimi del giuramento", "Esilio e Porta dimensionale sempre preparati."]);
        if (l === 15) f.push(["Anima della vendetta", "Reazione: attacco in mischia contro il bersaglio del Voto di inimicizia quando attacca."]);
        if (l === 17) f.push(["Incantesimi del giuramento", "Blocca mostri e Scrutare sempre preparati."]);
        if (l === 20) f.push(["Angelo vendicatore", "Ali e aura di terrore per 1 ora, una volta per riposo lungo."]);
        return f;
      },
      privilegi(L, X) {
        const f = [];
        if (L >= 3) f.push(["Voto di inimicizia", "Incanalare divinità, azione bonus: vantaggio ai tiri per colpire contro una creatura entro 3 m per 1 minuto."]);
        if (L >= 3) f.push(["Abiura nemico", `Incanalare divinità, azione: una creatura entro 18 m, tiro salvezza su Saggezza CD ${8 + X.P + X.M.car} o spaventata per 1 minuto con velocità 0 (svantaggio al tiro per immondi e non morti). Se riesce, velocità dimezzata.`]);
        if (L >= 7) f.push(["Vendicatore implacabile", "Dopo un attacco di opportunità riuscito, si muove di metà velocità senza provocare attacchi di opportunità."]);
        if (L >= 15) f.push(["Anima della vendetta", "Reazione: attacca in mischia il bersaglio del Voto quando questo attacca."]);
        if (L >= 20) f.push(["Angelo vendicatore", "Ali (volo 18 m) e aura di terrore per 1 ora, una volta per riposo lungo."]);
        return f;
      },
    },
  },
};
