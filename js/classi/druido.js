/* Druido (Manuale del Giocatore 2014). Sottoclassi: Circolo della Terra e Circolo della Luna.
   Incantesimi: trucchetti, 1° e 2° livello (i successivi si aggiungono quando servono). */
import { scelta } from "./comune.js";

export const TRUCCHETTI_DRUIDO = [
  { n: "Arte druidica", liv: 0, t: "Piccoli effetti naturali: prevedi il tempo, fai sbocciare un fiore, accendi o spegni una piccola fiamma." },
  { n: "Guida", liv: 0, conc: true, t: "Una creatura toccata aggiunge 1d4 a una prova di caratteristica a sua scelta." },
  { n: "Riparare", liv: 0, t: "Ripari una rottura o uno strappo in un oggetto." },
  { n: "Spruzzo velenoso", liv: 0, t: "Una creatura entro 3 m, tiro salvezza su Costituzione o 1d12 veleno (2d12 dal 5° livello del personaggio)." },
  { n: "Produrre fiamma", liv: 0, t: "Una fiamma in mano fa luce; puoi lanciarla: attacco con incantesimo, 1d8 fuoco (2d8 dal 5° livello del personaggio)." },
  { n: "Resistenza", liv: 0, conc: true, t: "Una creatura toccata aggiunge 1d4 a un tiro salvezza a sua scelta." },
  { n: "Randello incantato", liv: 0, t: "Azione bonus: bastone o randello usa la Saggezza per colpire e fa 1d8." },
  { n: "Frusta di spine", liv: 0, t: "Attacco con incantesimo in mischia fino a 9 m: 1d6 perforanti e tiri il bersaglio di 3 m verso di te." },
];
export const INCANTESIMI_DRUIDO = [
  { n: "Amicizia con gli animali", liv: 1, t: "Una bestia, tiro salvezza su Saggezza o ti è amica per 24 ore." },
  { n: "Charme su persone", liv: 1, t: "Un umanoide, tiro salvezza su Saggezza o ti considera un amico per 1 ora." },
  { n: "Creare o distruggere acqua", liv: 1, t: "Crei fino a 40 litri d'acqua pulita o ne distruggi altrettanta." },
  { n: "Cura ferite", liv: 1, t: "Una creatura toccata recupera 1d8 + Sag PF." },
  { n: "Individuazione del magico", liv: 1, conc: true, rituale: true, t: "Per 10 minuti percepisci la magia entro 9 m." },
  { n: "Individuazione di malattie e veleni", liv: 1, conc: true, rituale: true, t: "Percepisci veleni e malattie entro 9 m." },
  { n: "Intralciare", liv: 1, conc: true, t: "Un quadrato di 6 m diventa terreno difficile; chi è dentro, tiro su Forza o trattenuto." },
  { n: "Luminescenza", liv: 1, conc: true, t: "Un cubo di 6 m: chi fallisce il tiro su Destrezza brilla, non può essere invisibile e gli attacchi contro di lui hanno vantaggio." },
  { n: "Nube di nebbia", liv: 1, conc: true, t: "Una sfera di nebbia di 6 m che oscura completamente la vista." },
  { n: "Bacche benefiche", liv: 1, t: "Dieci bacche: ognuna cura 1 PF e sfama per un giorno." },
  { n: "Parola guaritrice", liv: 1, t: "Azione bonus, fino a 18 m: una creatura recupera 1d4 + Sag PF." },
  { n: "Saltare", liv: 1, t: "Triplica la distanza di salto di una creatura per 1 minuto." },
  { n: "Passo veloce", liv: 1, t: "+3 m di velocità per 1 ora." },
  { n: "Purificare cibo e bevande", liv: 1, rituale: true, t: "Rende commestibili cibo e bevande avariati o avvelenati." },
  { n: "Parlare con gli animali", liv: 1, rituale: true, t: "Capisci e parli con le bestie per 10 minuti." },
  { n: "Onda tonante", liv: 1, t: "Cubo di 4,5 m davanti a te: 2d8 tuono e spinta di 3 m (tiro su Costituzione per dimezzare e restare)." },
  { n: "Messaggero animale", liv: 2, rituale: true, t: "Una bestia Minuscola porta un messaggio." },
  { n: "Pelle di corteccia", liv: 2, conc: true, t: "La CA di una creatura non può scendere sotto 16." },
  { n: "Scurovisione", liv: 2, t: "Una creatura vede al buio entro 18 m per 8 ore." },
  { n: "Potenziare caratteristica", liv: 2, conc: true, t: "Vantaggio alle prove di una caratteristica (e altri piccoli effetti) per 1 ora." },
  { n: "Trova trappole", liv: 2, t: "Percepisci le trappole in vista entro 36 m." },
  { n: "Lama infuocata", liv: 2, conc: true, t: "Azione bonus: una lama di fuoco, attacco con incantesimo in mischia da 3d6 fuoco." },
  { n: "Sfera infuocata", liv: 2, conc: true, t: "Una sfera di fuoco che muovi con l'azione bonus: 2d6 fuoco a chi le sta accanto." },
  { n: "Folata di vento", liv: 2, conc: true, t: "Una linea di vento lunga 18 m che spinge via le creature e spegne le fiamme." },
  { n: "Riscaldare il metallo", liv: 2, conc: true, t: "Un oggetto di metallo arroventato: 2d8 fuoco a chi lo tocca, ogni turno con l'azione bonus." },
  { n: "Blocca persone", liv: 2, conc: true, t: "Un umanoide, tiro salvezza su Saggezza o paralizzato." },
  { n: "Ristorare inferiore", liv: 2, t: "Termina una malattia o accecato, assordato, paralizzato, avvelenato." },
  { n: "Localizzare animali o piante", liv: 2, rituale: true, t: "Percepisci la direzione di un tipo di bestia o pianta." },
  { n: "Localizzare oggetto", liv: 2, conc: true, t: "Percepisci la direzione di un oggetto che conosci entro 300 m." },
  { n: "Raggio di luna", liv: 2, conc: true, t: "Un cilindro di luce: 2d10 radianti a chi c'è dentro (Costituzione per dimezzare); costringe i mutaforma a riprendere la loro forma." },
  { n: "Passare senza tracce", liv: 2, conc: true, t: "Tu e gli alleati entro 9 m: +10 a Furtività." },
  { n: "Protezione dal veleno", liv: 2, t: "Neutralizza un veleno e protegge dai veleni per 1 ora." },
  { n: "Crescita spinosa", liv: 2, conc: true, t: "Un'area di 6 m diventa terreno difficile che fa 2d4 perforanti ogni 1,5 m percorsi." },
];
const trucchetti = l => l >= 10 ? 4 : l >= 4 ? 3 : 2;

export default {
  id: "druido", nome: "Druido", dadoVita: 8, pfMedia: 5, ts: ["int", "sag"],
  armature: ["leggera", "media"], magia: () => true, incantatore: "pieno",
  asi: [4, 8, 12, 16, 19], stileAl: 0,
  attacchi: () => 1,

  risorse(L) {
    return L >= 2 ? [{ k: "forma", nome: "Forma selvatica", testo: `Azione: ti trasformi in una bestia (GS ${L >= 8 ? 1 : L >= 4 ? "1/2" : "1/4"}) · riposo breve`, max: 2, riposo: "breve" }] : [];
  },
  magiaTesto: (L, X) => `CD ${8 + X.P + X.M.sag} · ${X.P + X.M.sag >= 0 ? "+" : ""}${X.P + X.M.sag} per colpire`,
  quantiPreparati: (L, X) => Math.max(1, X.M.sag + L),
  quantiTrucchetti: trucchetti,
  maxLivelloIncantesimi: L => Math.min(9, Math.ceil(L / 2)),
  incantesimiClasse: () => INCANTESIMI_DRUIDO,
  trucchettiClasse: () => TRUCCHETTI_DRUIDO,

  novita(l) {
    const f = [];
    if (l === 1) f.push(["Druidico e incantesimi", "La lingua segreta dei druidi; due trucchetti e incantesimi preparati ogni giorno (Saggezza + livello da druido)."]);
    if (l === 2) f.push(["Forma selvatica e Circolo druidico", "Due trasformazioni in bestia per riposo breve; scegli il circolo."]);
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica, +1 a due, oppure un talento."]);
    if (l === 4) f.push(["Trucchetto in più", "Un terzo trucchetto da druido."]);
    if (l === 18) f.push(["Corpo senza tempo e Incantesimi bestiali", "Invecchi molto lentamente; lanci incantesimi anche in forma selvatica."]);
    if (l === 20) f.push(["Arcidruido", "Forma selvatica senza limiti."]);
    return f;
  },
  privilegi(L) {
    const f = [["Druidico", "Conosce la lingua segreta dei druidi e lascia messaggi nascosti che solo un druido riconosce."]];
    if (L >= 2) f.push(["Forma selvatica", "Azione: diventa una bestia già vista, per metà del livello da druido in ore; due volte per riposo breve."]);
    return f;
  },
  scelte(l) {
    return l === 2 ? [{ id: "circolo", titolo: "Circolo druidico", opzioni: [{ id: "terra", nome: "Circolo della Terra", testo: "Incantesimi del circolo legati a un terreno e Recupero naturale degli slot." }, { id: "luna", nome: "Circolo della Luna", testo: "Forma selvatica da combattimento, come azione bonus e con bestie più forti." }] }] : [];
  },
  sottoclassi: {},
  /* il circolo si sceglie al 2° livello: per ora resta nei privilegi come scelta fatta */
  circolo: S => scelta(S, "circolo"),
};
