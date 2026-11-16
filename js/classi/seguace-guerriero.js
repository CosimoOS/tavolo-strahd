/* Seguace di classe Guerriero (Calderone omnicomprensivo di Tasha): i compagni gestiti dai giocatori, come Ireena.
   Il ruolo marziale (Attaccante o Difensore) è la sottoclasse. */
export default {
  id: "seguace-guerriero", seguace: true, nome: "Guerriero", dadoVita: 8, pfMedia: 5, ts: ["cos"],
  armature: ["leggera", "media", "pesante"], magia: () => false,
  asi: [4, 8, 12, 14, 16, 19], stileAl: 0,
  attacchi: l => l >= 15 ? 3 : l >= 6 ? 2 : 1, recuperi: l => l >= 20 ? 2 : 1,
  indomito: l => l >= 18 ? 2 : l >= 11 ? 1 : 0, nomeIndomito: "Indomabile",
  critMin: () => 19, prontezza: l => l >= 7, bonusCa: l => l >= 10 ? 1 : 0, secondWind: true,

  novita(l) {
    const f = [];
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica, +1 a due, oppure un talento."]);
    if (l === 6) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco."]);
    if (l === 7) f.push(["Prontezza in battaglia", "Vantaggio ai tiri per l'iniziativa."]);
    if (l === 10) f.push(["Difesa migliorata", "+1 alla Classe Armatura."]);
    if (l === 11) f.push(["Indomabile", "Ripete un tiro salvezza fallito, una volta per riposo lungo."]);
    if (l === 15) f.push(["Attacco extra (2 extra)", "Tre attacchi quando usa l'azione di attacco."]);
    if (l === 18) f.push(["Indomabile (2 utilizzi)", "Due utilizzi per riposo lungo."]);
    if (l === 20) f.push(["Recuperare energie (2 utilizzi)", "Due utilizzi tra un riposo e l'altro."]);
    return f;
  },
  privilegi(L) {
    const f = [[L >= 20 ? "Recuperare energie (2 utilizzi)" : "Recuperare energie", "Azione bonus, 1d10 + livello PF, poi riposo breve o lungo."],
      ["Critico migliorato", "I tiri per colpire sono critici con 19 o 20."]];
    const a = this.attacchi(L);
    if (a > 1) f.push([a === 2 ? "Attacco extra" : "Attacco extra (2 extra)", `${["", "Un", "Due", "Tre"][a]} attacchi quando usa l'azione di attacco.`]);
    if (L >= 7) f.push(["Prontezza in battaglia", "Vantaggio ai tiri per l'iniziativa."]);
    if (L >= 10) f.push(["Difesa migliorata", "+1 alla Classe Armatura, già incluso."]);
    if (this.indomito(L)) f.push([this.indomito(L) > 1 ? "Indomabile (2 utilizzi)" : "Indomabile", "Ripete un tiro salvezza fallito, per riposo lungo."]);
    return f;
  },
  sottoclassi: {
    attaccante: {
      nome: "Attaccante", bonusColpire: 2,
      privilegi: () => [["Ruolo marziale: Attaccante", "+2 a tutti i tiri per colpire."],
        ["Parry", "Se viene colpita in mischia mentre impugna un'arma da mischia, può usare la reazione per +2 alla CA."]],
    },
    difensore: {
      nome: "Difensore",
      privilegi: () => [["Ruolo marziale: Difensore", "Reazione: impone svantaggio a un attacco contro una creatura entro 1,5 m."]],
    },
  },
};
