/* Talenti del Manuale del Giocatore (2014) e del Calderone omnicomprensivo di Tasha, riassunti.
   req: requisiti — car: { for: 13 } (basta uno dei punteggi elencati), magia: serve saper lanciare incantesimi,
        armatura: "leggera" | "media" | "pesante" (competenza già posseduta).
   piu1: le caratteristiche tra cui scegliere il +1 (una sola), se il talento lo dà.
   effetti che l'app applica da sola: ts (competenza nel tiro salvezza della caratteristica scelta),
        pfLivello (PF in più per livello), ini (iniziativa), pp (Percezione passiva), abilita (quante competenze sceglie). */

export const TALENTI = [
  /* ---------- Manuale del Giocatore ---------- */
  { id: "adepto-elementale", nome: "Adepto elementale", fonte: "PHB", req: { magia: true }, testo: "Scegli acido, freddo, fuoco, fulmine o tuono: i tuoi incantesimi ignorano la resistenza a quel danno e gli 1 sui dadi di danno contano come 2." },
  { id: "adepto-marziale", nome: "Adepto marziale", fonte: "PHB", testo: "Impari due manovre del Maestro di battaglia e ottieni un dado di superiorità (d6) per riposo; CD 8 + bonus di competenza + For o Des." },
  { id: "allerta", nome: "Allerta", fonte: "PHB", effetti: { ini: 5 }, testo: "+5 all'iniziativa; non puoi essere sorpreso finché sei cosciente; chi è nascosto non ha vantaggio ad attaccarti." },
  { id: "atleta", nome: "Atleta", fonte: "PHB", piu1: ["for", "des"], testo: "+1 a Forza o Destrezza. Rialzarti da prono costa solo 1,5 m, arrampicarti non ti rallenta, salto con rincorsa di soli 1,5 m." },
  { id: "attore", nome: "Attore", fonte: "PHB", piu1: ["car"], testo: "+1 a Carisma. Vantaggio a Inganno e Intrattenere quando ti spacci per un altro; imiti voci e suoni." },
  { id: "attaccabrighe", nome: "Attaccabrighe", fonte: "PHB", piu1: ["for", "cos"], testo: "+1 a Forza o Costituzione. Competenza con le armi improvvisate, colpo senz'armi 1d4; dopo un colpo senz'armi o improvvisato, azione bonus per afferrare." },
  { id: "attaccante-selvaggio", nome: "Attaccante selvaggio", fonte: "PHB", testo: "Una volta per turno puoi ritirare i dadi di danno di un attacco con arma in mischia e tenere il risultato che preferisci." },
  { id: "carica", nome: "Carica", fonte: "PHB", testo: "Dopo uno Scatto, azione bonus per attaccare in mischia (+5 danni) o spingere un bersaglio di 3 m, se ti sei mosso di almeno 3 m in linea retta." },
  { id: "cecchino-magico", nome: "Cecchino magico", fonte: "PHB", req: { magia: true }, testo: "Gli incantesimi con tiro per colpire raddoppiano la gittata e ignorano la copertura parziale; impari un trucchetto d'attacco." },
  { id: "combattente-due-armi", nome: "Combattente a due armi", fonte: "PHB", testo: "+1 alla CA impugnando un'arma in ciascuna mano; puoi usare due armi anche non leggere; estrai o riponi due armi insieme." },
  { id: "combattente-in-sella", nome: "Combattente in sella", fonte: "PHB", testo: "Vantaggio in mischia contro creature più piccole della cavalcatura; puoi deviare su di te gli attacchi alla cavalcatura; la cavalcatura schiva come con Eludere." },
  { id: "duellante-difensivo", nome: "Duellante difensivo", fonte: "PHB", req: { car: { des: 13 } }, testo: "Reazione: con un'arma accurata in mano aggiungi il bonus di competenza alla CA contro un attacco in mischia." },
  { id: "esperto-balestre", nome: "Esperto di balestre", fonte: "PHB", testo: "Ignori la proprietà ricarica delle balestre; niente svantaggio a distanza ravvicinata; dopo un attacco a una mano, azione bonus con una balestra a mano." },
  { id: "esploratore-dungeon", nome: "Esploratore di dungeon", fonte: "PHB", testo: "Vantaggio a trovare porte segrete e ai tiri salvezza contro le trappole; resistenza ai danni delle trappole; cerchi trappole a passo normale." },
  { id: "fortunato", nome: "Fortunato", fonte: "PHB", testo: "3 punti fortuna per riposo lungo: tiri un d20 in più per un tuo tiro (o per un attacco contro di te) e scegli quale usare." },
  { id: "furtivo", nome: "Furtivo", fonte: "PHB", req: { car: { des: 13 } }, testo: "Ti nascondi anche in penombra; se manchi da nascosto non ti riveli; la penombra non ti penalizza a Percezione." },
  { id: "guaritore", nome: "Guaritore", fonte: "PHB", testo: "Con una borsa del guaritore stabilizzi e dai 1 PF; azione per curare 1d6 + 4 + i dadi vita massimi della creatura, una volta per riposo per creatura." },
  { id: "incantatore-guerra", nome: "Incantatore da guerra", fonte: "PHB", req: { magia: true }, testo: "Vantaggio ai tiri salvezza per la concentrazione; incantesimi anche con armi e scudo in mano; attacco di opportunità sostituibile con un incantesimo." },
  { id: "incantatore-rituale", nome: "Incantatore rituale", fonte: "PHB", req: { car: { int: 13, sag: 13 } }, testo: "Un libro con due incantesimi rituali di 1° livello di una classe a scelta; puoi aggiungerne altri trovati in giro." },
  { id: "iniziato-magia", nome: "Iniziato alla magia", fonte: "PHB", testo: "Due trucchetti e un incantesimo di 1° livello (una volta per riposo lungo) dalla lista di una classe a scelta." },
  { id: "leader-ispiratore", nome: "Leader ispiratore", fonte: "PHB", req: { car: { car: 13 } }, testo: "Discorso di 10 minuti: fino a 6 creature ricevono PF temporanei pari al tuo livello + Carisma." },
  { id: "linguista", nome: "Linguista", fonte: "PHB", piu1: ["int"], testo: "+1 a Intelligenza, tre lingue nuove, crei cifrari segreti." },
  { id: "lottatore", nome: "Lottatore", fonte: "PHB", req: { car: { for: 13 } }, testo: "Vantaggio ad attaccare chi stai afferrando; puoi provare a trattenerlo." },
  { id: "maestro-armature-medie", nome: "Maestro delle armature medie", fonte: "PHB", req: { armatura: "media" }, testo: "Le armature medie non ti danno svantaggio a Furtività e ti fanno aggiungere fino a +3 di Destrezza alla CA." },
  { id: "maestro-armature-pesanti", nome: "Maestro delle armature pesanti", fonte: "PHB", req: { armatura: "pesante" }, piu1: ["for"], testo: "+1 a Forza. Con armatura pesante i danni contundenti, perforanti e taglienti non magici che subisci calano di 3." },
  { id: "maestro-armi", nome: "Maestro d'armi", fonte: "PHB", piu1: ["for", "des"], testo: "+1 a Forza o Destrezza e competenza in quattro armi a scelta." },
  { id: "maestro-armi-possenti", nome: "Maestro d'armi possenti", fonte: "PHB", testo: "Dopo un critico o un nemico abbattuto, attacco in mischia come azione bonus. Con un'arma pesante: −5 al tiro per colpire per +10 ai danni, se vuoi." },
  { id: "maestro-armi-asta", nome: "Maestro delle armi su asta", fonte: "PHB", testo: "Con alabarda, falcione, bastone o lancia: azione bonus per un colpo col manico (1d4); attacco di opportunità quando entrano nella tua portata." },
  { id: "maestro-scudi", nome: "Maestro degli scudi", fonte: "PHB", testo: "Dopo l'azione di attacco, azione bonus per spingere col scudo; aggiungi lo scudo ai tiri salvezza su Destrezza mirati a te; Eludere con la reazione." },
  { id: "mente-acuta", nome: "Mente acuta", fonte: "PHB", piu1: ["int"], testo: "+1 a Intelligenza; sai sempre dov'è il nord e che ora è; ricordi tutto dell'ultimo mese." },
  { id: "mobile", nome: "Mobile", fonte: "PHB", testo: "+3 m di velocità; lo Scatto ignora il terreno difficile; chi attacchi in mischia non può farti attacchi di opportunità per il resto del turno." },
  { id: "moderatamente-corazzato", nome: "Moderatamente corazzato", fonte: "PHB", req: { armatura: "leggera" }, piu1: ["for", "des"], testo: "+1 a Forza o Destrezza; competenza con armature medie e scudi." },
  { id: "osservatore", nome: "Osservatore", fonte: "PHB", piu1: ["int", "sag"], effetti: { pp: 5 }, testo: "+1 a Intelligenza o Saggezza; +5 a Percezione e Indagare passive; leggi le labbra." },
  { id: "leggermente-corazzato", nome: "Leggermente corazzato", fonte: "PHB", piu1: ["for", "des"], testo: "+1 a Forza o Destrezza; competenza con armature leggere." },
  { id: "pesantemente-corazzato", nome: "Pesantemente corazzato", fonte: "PHB", req: { armatura: "media" }, piu1: ["for"], testo: "+1 a Forza; competenza con armature pesanti." },
  { id: "resiliente", nome: "Resiliente", fonte: "PHB", piu1: ["for", "des", "cos", "int", "sag", "car"], effetti: { ts: true }, testo: "+1 a una caratteristica e competenza nel tiro salvezza di quella caratteristica." },
  { id: "abile", nome: "Abile", fonte: "PHB", effetti: { abilita: 3 }, testo: "Competenza in tre abilità o strumenti a scelta." },
  { id: "robusto", nome: "Robusto", fonte: "PHB", effetti: { pfLivello: 2 }, testo: "+2 PF massimi per ogni livello, anche quelli futuri." },
  { id: "sentinella", nome: "Sentinella", fonte: "PHB", testo: "Chi colpisci con un attacco di opportunità si ferma; Disimpegno non ti sfugge; reazione per attaccare chi colpisce un alleato vicino a te." },
  { id: "sterminatore-maghi", nome: "Sterminatore di maghi", fonte: "PHB", testo: "Reazione per attaccare chi lancia incantesimi vicino a te; chi colpisci ha svantaggio a mantenere la concentrazione; vantaggio ai tiri salvezza contro incantesimi lanciati vicino." },
  { id: "tenace", nome: "Tenace", fonte: "PHB", piu1: ["cos"], testo: "+1 a Costituzione; spendendo dadi vita recuperi almeno il doppio della Costituzione." },
  { id: "tiratore-scelto", nome: "Tiratore scelto", fonte: "PHB", testo: "Nessuno svantaggio a lunga gittata; ignori copertura parziale e tre quarti. A distanza: −5 al tiro per colpire per +10 ai danni, se vuoi." },
  /* ---------- Calderone omnicomprensivo di Tasha ---------- */
  { id: "iniziato-artefice", nome: "Iniziato artefice", fonte: "Tasha", testo: "Un trucchetto e un incantesimo di 1° livello da artefice; competenza con un attrezzo da artigiano." },
  { id: "chef", nome: "Chef", fonte: "Tasha", piu1: ["cos", "sag"], testo: "+1 a Costituzione o Saggezza. In un riposo breve chi mangia il tuo cibo recupera 1d8 PF in più; dolcetti che danno PF temporanei." },
  { id: "frantumatore", nome: "Frantumatore", fonte: "Tasha", piu1: ["for", "cos"], testo: "+1 a Forza o Costituzione. Con danni contundenti sposti il bersaglio di 1,5 m; con un critico gli altri hanno vantaggio contro di lui fino al tuo prossimo turno." },
  { id: "adepto-occulto", nome: "Adepto occulto", fonte: "Tasha", req: { magia: true }, testo: "Impari una supplica occulta da warlock senza prerequisiti." },
  { id: "tocco-fatato", nome: "Tocco fatato", fonte: "Tasha", piu1: ["int", "sag", "car"], testo: "+1 a Int, Sag o Car. Passo velato e un incantesimo di 1° livello di divinazione o ammaliamento, una volta gratis per riposo lungo." },
  { id: "iniziato-combattimento", nome: "Iniziato al combattimento", fonte: "Tasha", testo: "Uno stile di combattimento a scelta tra quelli del guerriero." },
  { id: "pistolero", nome: "Pistolero", fonte: "Tasha", piu1: ["des"], testo: "+1 a Destrezza; competenza con le armi da fuoco; nessuno svantaggio a sparare in mischia." },
  { id: "adepto-metamagico", nome: "Adepto metamagico", fonte: "Tasha", req: { magia: true }, testo: "Due opzioni di metamagia e 2 punti stregoneria per riposo lungo." },
  { id: "perforatore", nome: "Perforatore", fonte: "Tasha", piu1: ["for", "des"], testo: "+1 a Forza o Destrezza. Con danni perforanti ritiri un dado di danno per turno; col critico un dado in più." },
  { id: "avvelenatore", nome: "Avvelenatore", fonte: "Tasha", testo: "I tuoi danni da veleno ignorano la resistenza; veleno sulle armi come azione bonus (2d8 e avvelenato, CD 14)." },
  { id: "tocco-ombra", nome: "Tocco dell'ombra", fonte: "Tasha", piu1: ["int", "sag", "car"], testo: "+1 a Int, Sag o Car. Invisibilità e un incantesimo di 1° livello di illusione o necromanzia, una volta gratis per riposo lungo." },
  { id: "esperto-abilita", nome: "Esperto di abilità", fonte: "Tasha", piu1: ["for", "des", "cos", "int", "sag", "car"], effetti: { abilita: 1 }, testo: "+1 a una caratteristica, competenza in un'abilità e maestria (bonus doppio) in un'abilità in cui sei competente." },
  { id: "squartatore", nome: "Squartatore", fonte: "Tasha", piu1: ["for", "des"], testo: "+1 a Forza o Destrezza. Con danni taglienti rallenti il bersaglio di 3 m; col critico ha svantaggio agli attacchi fino al tuo prossimo turno." },
  { id: "telecinetico", nome: "Telecinetico", fonte: "Tasha", piu1: ["int", "sag", "car"], testo: "+1 a Int, Sag o Car. Mano magica invisibile; azione bonus per spingere una creatura di 1,5 m (tiro salvezza su Forza)." },
  { id: "telepatico", nome: "Telepatico", fonte: "Tasha", piu1: ["int", "sag", "car"], testo: "+1 a Int, Sag o Car. Parli mentalmente entro 18 m; Individuazione dei pensieri una volta gratis per riposo lungo." },
];

/** Talenti che il personaggio può prendere: requisiti rispettati, già presi esclusi (tranne Resiliente, che si ripete
    su caratteristiche diverse). tasha: se il master usa i talenti del Calderone di Tasha. */
export function talentiDisponibili({ scores, presi = [], magia = false, armature = [], tasha = true }) {
  return TALENTI.filter(t => {
    if (t.fonte === "Tasha" && !tasha) return false;
    if (presi.includes(t.id) && t.id !== "resiliente") return false;
    const r = t.req || {};
    if (r.magia && !magia) return false;
    if (r.car && !Object.entries(r.car).some(([k, v]) => (scores[k] || 0) >= v)) return false;
    if (r.armatura && !armature.includes(r.armatura)) return false;
    return true;
  });
}
export const talento = id => TALENTI.find(t => t.id === id) || null;

/** Requisiti scritti per esteso, da mostrare accanto al talento. */
export function requisiti(t) {
  const r = t.req || {}, N = { for: "Forza", des: "Destrezza", cos: "Costituzione", int: "Intelligenza", sag: "Saggezza", car: "Carisma" };
  const p = [];
  if (r.car) p.push(Object.entries(r.car).map(([k, v]) => `${N[k]} ${v}`).join(" o "));
  if (r.magia) p.push("saper lanciare incantesimi");
  if (r.armatura) p.push(`competenza con armature ${r.armatura === "leggera" ? "leggere" : r.armatura === "media" ? "medie" : "pesanti"}`);
  return p.join(", ");
}
