/* Guerriero (Manuale del Giocatore 2014) con il privilegio opzionale del Calderone di Tasha.
   Sottoclasse in uso: Campione. Le altre si aggiungono qui quando arriva un personaggio che le usa. */
import { STYLES } from "../regole/stili.js";

const nAtt = l => l >= 20 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1;
const nImp = l => l >= 17 ? 2 : 1;
const nInd = l => l >= 17 ? 3 : l >= 13 ? 2 : l >= 9 ? 1 : 0;
const parole = ["", "Un", "Due", "Tre", "Quattro"];

export default {
  id: "guerriero", nome: "Guerriero", dadoVita: 10, pfMedia: 6, ts: ["for", "cos"],
  armature: ["leggera", "media", "pesante"], magia: () => false,
  asi: [4, 6, 8, 12, 14, 16, 19], stileAl: 1,
  attacchi: nAtt, recuperi: () => 1, impetuose: nImp, indomito: nInd, nomeIndomito: "Indomito",
  secondWind: true, surge: true,

  novita(l, opz) {
    const f = [];
    if (l === 1) f.push(["Stile di combattimento", "Scegli uno stile, qui sotto."], ["Recuperare energie", "Azione bonus: recuperi 1d10 + livello da guerriero PF, una volta per riposo."]);
    if (l === 2) f.push(["Azione impetuosa", "Un'azione in più nel turno, una volta per riposo."]);
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica, +1 a due, oppure un talento."]);
    if (opz.tasha && this.asi.includes(l)) f.push(["Versatilità marziale (Tasha)", "Puoi cambiare uno stile di combattimento con un altro."]);
    if (l === 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco."]);
    if (l === 9) f.push(["Indomito", "Ripeti un tiro salvezza fallito, una volta per riposo lungo."]);
    if (l === 11) f.push(["Attacco extra (2)", "Tre attacchi quando usa l'azione di attacco."]);
    if (l === 13) f.push(["Indomito (2 usi)", "Due usi per riposo lungo."]);
    if (l === 17) f.push(["Azione impetuosa (2 usi) e Indomito (3 usi)", "Due azioni impetuose per riposo, ma una sola per turno."]);
    if (l === 20) f.push(["Attacco extra (3)", "Quattro attacchi quando usa l'azione di attacco."]);
    return f;
  },
  privilegi(L, X, S) {
    const f = S.styles.map(s => [`Stile di combattimento: ${s}`, STYLES[s] || ""]);
    f.push(["Recuperare energie", "Azione bonus, 1d10 + livello PF, una volta per riposo."]);
    if (L >= 2) f.push([nImp(L) > 1 ? "Azione impetuosa (2 usi)" : "Azione impetuosa", "Un'azione in più nel turno, una volta per riposo."]);
    if (nAtt(L) > 1) f.push([nAtt(L) === 2 ? "Attacco extra" : `Attacco extra (${nAtt(L) - 1})`, `${parole[nAtt(L)]} attacchi quando usa l'azione di attacco.`]);
    if (nInd(L)) f.push([nInd(L) > 1 ? `Indomito (${nInd(L)} usi)` : "Indomito", "Ripeti un tiro salvezza fallito, per riposo lungo."]);
    return f;
  },
  /* Versatilità marziale: nei livelli dei punteggi si può sostituire uno stile */
  scelte(l, S, opz) {
    if (!opz.tasha || !this.asi.includes(l) || !S.styles.length) return [];
    return [{ id: "versatilita", titolo: "Versatilità marziale: cambiare uno stile?", tipo: "cambio-stile" }];
  },

  sottoclassi: {
    campione: {
      nome: "Campione",
      critMin: l => l >= 15 ? 18 : l >= 3 ? 19 : 20,
      atleta: l => l >= 7,
      stileExtraAl: 10,
      novita(l) {
        const f = [];
        if (l === 3) f.push(["Critico migliorato", "Critico con 19 o 20."]);
        if (l === 7) f.push(["Atleta straordinario", "Metà del bonus di competenza (per eccesso) alle prove di Forza, Destrezza e Costituzione senza competenza, iniziativa compresa."]);
        if (l === 10) f.push(["Stile di combattimento aggiuntivo", "Scegli un secondo stile."]);
        if (l === 15) f.push(["Critico superiore", "Critico con 18, 19 o 20."]);
        if (l === 18) f.push(["Sopravvissuto", "Con al massimo metà dei PF, recupera 5 + Cos PF all'inizio di ogni turno."]);
        return f;
      },
      privilegi(L, X) {
        const f = [], cm = this.critMin(L);
        if (L >= 3) f.push([cm === 18 ? "Critico superiore" : "Critico migliorato", `Gli attacchi con arma sono critici con ${cm === 18 ? "18, 19 o 20" : "19 o 20"}.`]);
        if (L >= 7) f.push(["Atleta straordinario", `+${Math.ceil(X.P / 2)} alle prove di For, Des e Cos senza competenza, iniziativa compresa.`]);
        if (L >= 18) f.push(["Sopravvissuto", `Con al massimo metà dei PF, recupera ${5 + X.M.cos} PF all'inizio di ogni turno.`]);
        return f;
      },
    },
  },
};
