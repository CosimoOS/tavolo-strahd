/* Multiclasse (Manuale del Giocatore): per prendere una classe nuova serve almeno 13 nelle caratteristiche richieste
   dalla classe nuova E da quelle che si hanno già. Funzioni pure, provate da test/multiclasse.test.js.
   Ogni requisito è una lista di gruppi: dentro un gruppo basta una caratteristica, i gruppi servono tutti. */
const NOME = { for: "Forza", des: "Destrezza", cos: "Costituzione", int: "Intelligenza", sag: "Saggezza", car: "Carisma" };
export const CLASSI_MANUALE = {
  barbaro: ["Barbaro", [["for"]]], bardo: ["Bardo", [["car"]]], chierico: ["Chierico", [["sag"]]], druido: ["Druido", [["sag"]]],
  guerriero: ["Guerriero", [["for", "des"]]], ladro: ["Ladro", [["des"]]], mago: ["Mago", [["int"]]], monaco: ["Monaco", [["des"], ["sag"]]],
  paladino: ["Paladino", [["for"], ["car"]]], ranger: ["Ranger", [["des"], ["sag"]]], stregone: ["Stregone", [["car"]]], warlock: ["Warlock", [["car"]]],
};
/* i gruppi che non arrivano a 13, scritti per chi gioca: "Forza o Destrezza 13" */
const mancanti = (scores, id) => CLASSI_MANUALE[id][1].filter(g => !g.some(k => scores[k] >= 13)).map(g => g.map(k => NOME[k]).join(" o ") + " 13");

/** Le classi nuove per chi ha già le classi `attuali`: { id, nome, ok, manca, inArrivo }.
    `disponibili` sono quelle che l'app conosce; le altre restano segnaposto ("in arrivo"). */
export function classiPrendibili(scores, attuali, disponibili) {
  const proprie = attuali.filter(id => CLASSI_MANUALE[id]).map(id => [id, mancanti(scores, id)]).find(([, m]) => m.length);
  return Object.keys(CLASSI_MANUALE).filter(id => !attuali.includes(id)).map(id => {
    const nome = CLASSI_MANUALE[id][0], inArrivo = !disponibili.includes(id), m = mancanti(scores, id);
    const manca = proprie ? `${proprie[1].join(", ")} (per lasciare il ${CLASSI_MANUALE[proprie[0]][0]})` : m.join(", ");
    return { id, nome, ok: !inArrivo && !manca, manca, ...(inArrivo ? { inArrivo: true } : {}) };
  });
}
