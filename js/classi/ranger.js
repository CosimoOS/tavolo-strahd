/* Ranger (Manuale del Giocatore 2014) con i privilegi opzionali del Calderone di Tasha.
   Sottoclassi: Cacciatore e Signore delle bestie. Pronta per Petrus: quando arriva la sua scheda si completa. */
import { STYLES } from "../regole/stili.js";
import { risorseSlot, slotMezzo, scelta, scelteTutte } from "./comune.js";

const NEMICI = ["Aberrazioni", "Bestie", "Celestiali", "Costrutti", "Draghi", "Elementali", "Folletti", "Giganti", "Immondi",
  "Melme", "Mostruosità", "Non morti", "Vegetali", "Due razze di umanoidi"].map(n => ({ id: n, nome: n }));
const TERRENI = ["Artico", "Costa", "Deserto", "Foresta", "Montagna", "Palude", "Prateria", "Underdark"].map(n => ({ id: n, nome: n }));

export const INCANTESIMI_RANGER = [
  { n: "Allarme", liv: 1, rituale: true, t: "Un'area di 6 m ti avvisa per 8 ore se qualcuno entra." },
  { n: "Amicizia con gli animali", liv: 1, t: "Una bestia, tiro salvezza su Saggezza o ti è amica per 24 ore." },
  { n: "Cura ferite", liv: 1, t: "Una creatura toccata recupera 1d8 + Sag PF." },
  { n: "Individuazione del magico", liv: 1, conc: true, rituale: true, t: "Per 10 minuti percepisci la magia entro 9 m." },
  { n: "Individuazione di malattie e veleni", liv: 1, conc: true, rituale: true, t: "Percepisci veleni e malattie entro 9 m." },
  { n: "Colpo intrappolante", liv: 1, conc: true, t: "Il prossimo colpo avvolge il bersaglio di rovi: trattenuto e 1d6 perforanti a ogni turno." },
  { n: "Nube di nebbia", liv: 1, conc: true, t: "Una sfera di nebbia di 6 m che oscura completamente la vista." },
  { n: "Bacche benefiche", liv: 1, t: "Dieci bacche: ognuna cura 1 PF e sfama per un giorno." },
  { n: "Grandine di spine", liv: 1, conc: true, t: "Il prossimo colpo a distanza esplode in spine: 1d10 perforanti a chi è entro 1,5 m dal bersaglio." },
  { n: "Marchio del cacciatore", liv: 1, conc: true, t: "Azione bonus: +1d6 danni a ogni colpo con un'arma contro il bersaglio marchiato." },
  { n: "Saltare", liv: 1, t: "Triplica la distanza di salto di una creatura per 1 minuto." },
  { n: "Passo veloce", liv: 1, t: "+3 m di velocità per 1 ora." },
  { n: "Parlare con gli animali", liv: 1, rituale: true, t: "Capisci e parli con le bestie per 10 minuti." },
  { n: "Messaggero animale", liv: 2, rituale: true, t: "Una bestia Minuscola porta un messaggio di 25 parole." },
  { n: "Pelle di corteccia", liv: 2, conc: true, t: "La CA di una creatura non può scendere sotto 16." },
  { n: "Sensi animali", liv: 2, conc: true, rituale: true, t: "Vedi e senti attraverso una bestia consenziente." },
  { n: "Cordone di frecce", liv: 2, t: "Quattro frecce a guardia di un punto: colpiscono chi si avvicina (1d6 ciascuna)." },
  { n: "Scurovisione", liv: 2, t: "Una creatura vede al buio entro 18 m per 8 ore." },
  { n: "Trova trappole", liv: 2, t: "Percepisci le trappole in vista entro 36 m." },
  { n: "Ristorare inferiore", liv: 2, t: "Termina una malattia o accecato, assordato, paralizzato, avvelenato." },
  { n: "Localizzare animali o piante", liv: 2, rituale: true, t: "Percepisci la direzione di un tipo di bestia o pianta entro 8 km." },
  { n: "Localizzare oggetto", liv: 2, conc: true, t: "Percepisci la direzione di un oggetto che conosci entro 300 m." },
  { n: "Passare senza tracce", liv: 2, conc: true, t: "Tu e gli alleati entro 9 m: +10 a Furtività e niente tracce." },
  { n: "Protezione dal veleno", liv: 2, t: "Neutralizza un veleno e protegge dai veleni per 1 ora." },
  { n: "Silenzio", liv: 2, conc: true, rituale: true, t: "Una sfera di 6 m in cui non passa alcun suono (niente incantesimi verbali)." },
  { n: "Crescita spinosa", liv: 2, conc: true, t: "Un'area di 6 m diventa terreno difficile che fa 2d4 perforanti ogni 1,5 m percorsi." },
  { n: "Evoca animali", liv: 3, conc: true, t: "Spiriti in forma di bestie che combattono al tuo fianco." },
  { n: "Raffica evocata", liv: 3, t: "Un cono di 18 m di proiettili: 3d8 danni, tiro salvezza su Destrezza per dimezzare." },
  { n: "Luce diurna", liv: 3, t: "Una sfera di luce intensa di 18 m, come luce del sole." },
  { n: "Freccia folgorante", liv: 3, conc: true, t: "Il prossimo attacco a distanza diventa un fulmine: 4d8 al bersaglio e 2d8 a chi è vicino." },
  { n: "Anti-individuazione", liv: 3, t: "Un bersaglio non può essere trovato con la divinazione per 8 ore." },
  { n: "Crescita vegetale", liv: 3, t: "Le piante diventano fittissime (terreno molto difficile) o più rigogliose per un anno." },
  { n: "Protezione dall'energia", liv: 3, conc: true, t: "Resistenza a un tipo di danno elementale." },
  { n: "Parlare con i vegetali", liv: 3, t: "Le piante ti parlano e ti obbediscono un po' per 10 minuti." },
  { n: "Respirare sott'acqua", liv: 3, rituale: true, t: "Fino a 10 creature respirano sott'acqua per 24 ore." },
  { n: "Camminare sull'acqua", liv: 3, rituale: true, t: "Fino a 10 creature camminano sui liquidi per 1 ora." },
  { n: "Muro di vento", liv: 3, conc: true, t: "Un muro di vento che devia frecce e creature piccole volanti." },
  { n: "Evoca creature silvane", liv: 4, conc: true, t: "Creature fatate che combattono al tuo fianco." },
  { n: "Libertà di movimento", liv: 4, t: "Per 1 ora niente terreno difficile, paralisi o trattenimento magico." },
  { n: "Vite afferrante", liv: 4, conc: true, t: "Una vite che afferra e trascina le creature." },
  { n: "Localizzare creatura", liv: 4, conc: true, t: "Percepisci la direzione di una creatura che conosci entro 300 m." },
  { n: "Pelle di pietra", liv: 4, conc: true, t: "Resistenza ai danni contundenti, perforanti e taglienti non magici." },
  { n: "Comunione con la natura", liv: 5, rituale: true, t: "Conosci il territorio intorno a te per 4,5 km." },
  { n: "Raffica di proiettili", liv: 5, t: "Una pioggia di proiettili in un cilindro di 12 m: 8d8 danni, Destrezza per dimezzare." },
  { n: "Faretra veloce", liv: 5, conc: true, t: "Azione bonus: due attacchi in più con un'arma a distanza a ogni turno." },
  { n: "Passo arboreo", liv: 5, conc: true, t: "Entri in un albero ed esci da un altro entro 150 m." },
];
const conosciuti = l => l < 2 ? 0 : 1 + Math.ceil(l / 2);   // 2 al 2°, 3 al 3°… 11 al 19°

export default {
  id: "ranger", nome: "Ranger", dadoVita: 10, pfMedia: 6, ts: ["for", "des"],
  armature: ["leggera", "media"], magia: l => l >= 2,
  asi: [4, 8, 12, 16, 19], stileAl: 2,
  attacchi: l => l >= 5 ? 2 : 1,

  risorse(L, X, S, opz) {
    const r = risorseSlot(L);
    if (opz.tasha && scelta(S, "nemico-favorito") === "si") r.push({ k: "favorito", nome: "Nemico favorito", testo: "Azione bonus: marchi un bersaglio, +1d4 danni per colpo · riposo lungo", max: X.P, riposo: "lungo" });
    return r;
  },
  magiaTesto: (L, X) => `CD ${8 + X.P + X.M.sag} · ${X.P + X.M.sag >= 0 ? "+" : ""}${X.P + X.M.sag} per colpire`,
  quantiConosciuti: conosciuti,
  maxLivelloIncantesimi: L => slotMezzo(L).length,
  incantesimiClasse: () => INCANTESIMI_RANGER,

  novita(l, opz) {
    const f = [];
    if (l === 2) f.push(["Incantesimi", "Slot di 1° livello e due incantesimi conosciuti."]);
    if (l === 3) f.push([opz.tasha ? "Consapevolezza primordiale (Tasha) o Consapevolezza primeva" : "Consapevolezza primeva", opz.tasha ? "Puoi sostituire la versione del manuale con quella di Tasha." : "Spendi uno slot per percepire certi tipi di creature entro 1,5 km."]);
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica, +1 a due, oppure un talento."]);
    if (l === 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco. Slot di 2° livello."]);
    if (l === 8) f.push(["Andatura sul territorio", "Il terreno difficile non magico non ti rallenta; vantaggio contro le piante magiche."]);
    if (l === 10) f.push([opz.tasha ? "Velo della natura (Tasha) o Nascondersi in piena vista" : "Nascondersi in piena vista", "Ti nascondi meglio nella natura."]);
    if (l === 14) f.push(["Svanire", "Ti nascondi come azione bonus e non lasci tracce non magiche."]);
    if (l === 18) f.push(["Sensi ferini", "Combatti senza svantaggio contro chi non vedi entro 9 m."]);
    if (l === 20) f.push(["Sterminatore di nemici", "Una volta per turno +Sag al tiro per colpire o ai danni contro un nemico prescelto."]);
    if (conosciuti(l) > conosciuti(l - 1)) f.push(["Un incantesimo conosciuto in più", "Lo scegli tra quelli dei livelli di slot che hai."]);
    return f;
  },
  privilegi(L, X, S, opz) {
    const f = [], usaFavorito = opz.tasha && scelta(S, "nemico-favorito") === "si", abile = opz.tasha && scelta(S, "esploratore-abile") === "si";
    const nemici = scelteTutte(S, "nemico-prescelto"), terreni = scelteTutte(S, "terreno");
    if (usaFavorito) f.push(["Nemico favorito", `Azione bonus quando colpisci: il bersaglio è marchiato per 1 minuto (concentrazione), +1d${L >= 14 ? 8 : L >= 6 ? 6 : 4} danni al primo colpo di ogni turno. ${X.P} usi per riposo lungo.`]);
    else f.push(["Nemico prescelto", `${nemici.length ? nemici.join(", ") : "da scegliere"}: vantaggio a seguirne le tracce e a ricordare informazioni su di loro.`]);
    if (abile) f.push(["Esploratore abile", `Maestria in un'abilità e due lingue${L >= 6 ? "; +1,5 m di velocità, scalare e nuotare" : ""}${L >= 10 ? "; PF temporanei e meno indebolimento col riposo breve" : ""}.`]);
    else f.push(["Esploratore naturale", `${terreni.length ? terreni.join(", ") : "da scegliere"}: nel terreno prescelto non ti perdi, viaggi più veloce e trovi il doppio del cibo.`]);
    S.styles.forEach(s => f.push([`Stile di combattimento: ${s}`, STYLES[s] || ""]));
    if (L >= 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco."]);
    if (L >= 8) f.push(["Andatura sul territorio", "Il terreno difficile non magico non ti rallenta."]);
    if (L >= 14) f.push(["Svanire", "Ti nascondi come azione bonus e non lasci tracce."]);
    return f;
  },
  scelte(l, S, opz) {
    const c = [];
    if (opz.tasha && l === 1) c.push({ id: "nemico-favorito", titolo: "Nemico favorito (Tasha) al posto di Nemico prescelto?", opzioni: [{ id: "no", nome: "Tieni Nemico prescelto" }, { id: "si", nome: "Usa Nemico favorito" }] });
    if (opz.tasha && l === 1) c.push({ id: "esploratore-abile", titolo: "Esploratore abile (Tasha) al posto di Esploratore naturale?", opzioni: [{ id: "no", nome: "Tieni Esploratore naturale" }, { id: "si", nome: "Usa Esploratore abile" }] });
    const favorito = opz.tasha && scelta(S, "nemico-favorito") === "si", abile = opz.tasha && scelta(S, "esploratore-abile") === "si";
    if ([1, 6, 14].includes(l) && !favorito) c.push({ id: "nemico-prescelto", titolo: "Nemico prescelto", opzioni: NEMICI.filter(n => !scelteTutte(S, "nemico-prescelto").includes(n.id)) });
    if ([1, 6, 10].includes(l) && !abile) c.push({ id: "terreno", titolo: "Terreno prescelto", opzioni: TERRENI.filter(n => !scelteTutte(S, "terreno").includes(n.id)) });
    if (opz.tasha && this.asi.includes(l) && S.styles.length) c.push({ id: "versatilita", titolo: "Versatilità marziale: cambiare lo stile?", tipo: "cambio-stile" });
    return c;
  },

  sottoclassi: {
    cacciatore: {
      nome: "Cacciatore",
      novita(l) {
        return { 3: [["Preda del cacciatore", "Scegli tra Uccisore di colossi, Sterminatore di giganti e Distruttore di orde."]],
          7: [["Tattiche difensive", "Scegli tra Sfuggire all'orda, Difesa dal multiattacco e Volontà d'acciaio."]],
          11: [["Multiattacco", "Scegli tra Raffica e Attacco turbinante."]],
          15: [["Difesa superiore del cacciatore", "Scegli tra Eludere, Resistere alla marea e Schivata prodigiosa."]] }[l] || [];
      },
      scelte(l) {
        const O = {
          3: ["preda", "Preda del cacciatore", [["colosso", "Uccisore di colossi", "+1d8 danni una volta per turno a chi è già ferito."], ["giganti", "Sterminatore di giganti", "Reazione: attacchi una creatura Grande o più grande che ti attacca."], ["orde", "Distruttore di orde", "Una volta per turno attacchi una seconda creatura vicina alla prima."]]],
          7: ["tattiche", "Tattiche difensive", [["orda", "Sfuggire all'orda", "Svantaggio agli attacchi di opportunità contro di te."], ["multi", "Difesa dal multiattacco", "+4 alla CA contro gli altri attacchi di una creatura che ti ha colpito."], ["volonta", "Volontà d'acciaio", "Vantaggio ai tiri salvezza contro la paura."]]],
          11: ["multiattacco", "Multiattacco", [["raffica", "Raffica", "Un attacco a distanza contro ogni creatura entro 3 m da un punto."], ["turbine", "Attacco turbinante", "Un attacco in mischia contro ogni creatura entro 1,5 m."]]],
          15: ["difesa", "Difesa superiore del cacciatore", [["eludere", "Eludere", "Nessun danno se superi un tiro su Destrezza per dimezzare."], ["marea", "Resistere alla marea", "Reazione: un attacco mancato contro di te colpisce un'altra creatura."], ["schivata", "Schivata prodigiosa", "Reazione: dimezzi i danni di un attacco."]]],
        }[l];
        return O ? [{ id: O[0], titolo: O[1], opzioni: O[2].map(([id, nome, testo]) => ({ id, nome, testo })) }] : [];
      },
      privilegi(L, X, S) {
        const nomi = { colosso: "Uccisore di colossi", giganti: "Sterminatore di giganti", orde: "Distruttore di orde", orda: "Sfuggire all'orda", multi: "Difesa dal multiattacco",
          volonta: "Volontà d'acciaio", raffica: "Raffica", turbine: "Attacco turbinante", eludere: "Eludere", marea: "Resistere alla marea", schivata: "Schivata prodigiosa" };
        return ["preda", "tattiche", "multiattacco", "difesa"].map(k => scelta(S, k)).filter(Boolean)
          .map(v => [nomi[v], this.scelte({ colosso: 3, giganti: 3, orde: 3, orda: 7, multi: 7, volonta: 7, raffica: 11, turbine: 11, eludere: 15, marea: 15, schivata: 15 }[v])[0].opzioni.find(o => o.id === v).testo]);
      },
    },
    "signore-bestie": {
      nome: "Signore delle bestie",
      novita(l) {
        return { 3: [["Compagno del ranger", "Una bestia Media o più piccola (GS 1/4 al massimo) combatte ai tuoi ordini."]],
          7: [["Addestramento eccezionale", "Il compagno può Scattare, Disimpegnarsi o Aiutare come azione bonus; i suoi attacchi sono magici."]],
          11: [["Furia bestiale", "Il compagno attacca due volte."]], 15: [["Condividere incantesimi", "I tuoi incantesimi su di te colpiscono anche il compagno entro 9 m."]] }[l] || [];
      },
      privilegi(L) {
        const f = [["Compagno del ranger", "Una bestia che agisce al tuo turno ai tuoi ordini e aggiunge il tuo bonus di competenza."]];
        if (L >= 7) f.push(["Addestramento eccezionale", "Azione bonus del compagno: Scatto, Disimpegno o Aiuto; attacchi magici."]);
        if (L >= 11) f.push(["Furia bestiale", "Il compagno attacca due volte."]);
        if (L >= 15) f.push(["Condividere incantesimi", "Gli incantesimi su di te valgono anche per il compagno vicino."]);
        return f;
      },
    },
  },
};
