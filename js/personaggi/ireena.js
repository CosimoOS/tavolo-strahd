/* Ireena: seguace di classe Guerriero (Calderone omnicomprensivo di Tasha), ruolo marziale Attaccante, dadi vita d8. */
export default {
  id: "ireena", name: "Ireena", sub: "Seguace", classe: "Guerriero", stemma: "I",
  femminile: true, tags: ["Umana", "Attaccante"],
  hitDie: 8, hpAvg: 5, saves: ["cos"], skills: ["Atletica", "Inganno", "Intuizione", "Percezione", "Persuasione"],
  asi: [4, 8, 12, 14, 16, 19], roleHit: 2, armor: false, surge: false, insp: false, styleAt: 0,
  attacks: l => l >= 15 ? 3 : l >= 6 ? 2 : 1, reUses: l => l >= 20 ? 2 : 1, surges: l => 0, indom: l => l >= 18 ? 2 : l >= 11 ? 1 : 0,
  critMin: l => 19, athlete: l => false, ready: l => l >= 7, caBonus: l => l >= 10 ? 1 : 0, indName: "Indomabile",
  featuresAt(l) {
    const f = [];
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica oppure +1 a due, massimo 20."]);
    if (l === 7) f.push(["Prontezza in battaglia", "Vantaggio ai tiri per l'iniziativa."]);
    if (l === 10) f.push(["Difesa migliorata", "+1 alla Classe Armatura."]);
    if (l === 11) f.push(["Indomabile", "Ripete un tiro salvezza fallito, una volta per riposo lungo."]);
    if (l === 15) f.push(["Attacco extra (2 extra)", "Tre attacchi quando usa l'azione di attacco."]);
    if (l === 18) f.push(["Indomabile (2 utilizzi)", "Due utilizzi per riposo lungo."]);
    if (l === 20) f.push(["Recuperare energie (2 utilizzi)", "Due utilizzi tra un riposo e l'altro."]);
    return f;
  },
  feats(L, X, S) {
    const C = this, f = [["Ruolo marziale: Attaccante", "+2 a tutti i tiri per colpire."],
      ["Parry", "Se viene colpita in mischia mentre impugna un'arma da mischia, può usare la reazione per +2 alla CA."],
      [C.reUses(L) > 1 ? "Recuperare energie (2 utilizzi)" : "Recuperare energie", "Azione bonus, 1d10 + livello PF, poi riposo breve o lungo."],
      ["Critico migliorato", "I tiri per colpire sono critici con 19 o 20."]];
    if (C.attacks(L) > 1) f.push([C.attacks(L) === 2 ? "Attacco extra" : "Attacco extra (2 extra)", `${["", "Un", "Due", "Tre"][C.attacks(L)]} attacchi quando usa l'azione di attacco.`]);
    if (C.ready(L)) f.push(["Prontezza in battaglia", "Vantaggio ai tiri per l'iniziativa."]);
    if (C.caBonus(L)) f.push(["Difesa migliorata", "+1 alla Classe Armatura, già incluso."]);
    if (C.indom(L)) f.push([C.indom(L) > 1 ? "Indomabile (2 utilizzi)" : "Indomabile", "Ripete un tiro salvezza fallito, per riposo lungo."]);
    return f;
  },
  kv: [["Armature", "Tutte"], ["Armi", "Tutte"], ["Classe", "Guerriero seguace (Calderone di Tasha)"]],
  magic: /^$/,
  def: {
    level: 6, maxhp: 45, ca: 17, speed: "9 m", scores: { for: 14, des: 12, cos: 12, int: 12, sag: 14, car: 16 },
    styles: [], asi: [], history: [],
    weapons: [
      { id: "w1", n: "Spada lunga", t: "Taglienti", note: "versatile, 1d10 a due mani", ab: "for", dice: [1, 8], magic: 0 },
      { id: "w2", n: "Arco lungo", t: "Perforanti", note: "frecce", ab: "des", dice: [1, 8], magic: 0, ammo: true, ranged: true }],
    hp: 45, temp: 0, re: 0, ai: 0, dv: 0, ind: 0, insp: 0, dardo: 0, fulmine: 0, ammo: 30, deathS: 0, deathF: 0, exh: 0, conds: [],
    coins: { mr: 0, ma: 0, me: 0, mo: 0, mp: 0 }, res: [], attuned: [],
    inv: ["Spada lunga", "Arco lungo", "30 frecce", "Scudo legno di metallo"], notes: "",
  },
};
