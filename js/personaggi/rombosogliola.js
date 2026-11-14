/* Rombosogliola: Guerriero umano, sottoclasse Campione (Manuale del Giocatore 2014), background nobile.
   Qui stanno le REGOLE del personaggio, che non cambiano in gioco.
   Lo STATO (PF, monete, oggetti…) sta nell'archivio; "def" è solo il punto di partenza. */
import { STYLES } from "../regole/base.js";

export default {
  id: "rombosogliola", name: "Rombosogliola", sub: "Campione", classe: "Guerriero", stemma: "pesce",
  femminile: false, tags: ["Umano", "Nobile"],
  hitDie: 10, hpAvg: 6, saves: ["for", "cos"], skills: ["Addestrare animali", "Atletica", "Persuasione", "Storia"],
  asi: [4, 6, 8, 12, 14, 16, 19], roleHit: 0, armor: true, surge: true, insp: true, styleAt: 10,
  attacks: l => l >= 20 ? 4 : l >= 11 ? 3 : l >= 5 ? 2 : 1, reUses: l => 1, surges: l => l >= 17 ? 2 : 1,
  indom: l => l >= 17 ? 3 : l >= 13 ? 2 : l >= 9 ? 1 : 0,
  critMin: l => l >= 15 ? 18 : 19, athlete: l => l >= 7, ready: l => false, caBonus: l => 0, indName: "Indomito",
  featuresAt(l) {
    const f = [];
    if (l === 7) f.push(["Atleta straordinario", "Metà del bonus di competenza (per eccesso) alle prove di Forza, Destrezza e Costituzione senza competenza, iniziativa compresa."]);
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica oppure +1 a due, massimo 20."]);
    if (l === 9) f.push(["Indomito", "Ripeti un tiro salvezza fallito, una volta per riposo lungo."]);
    if (l === 10) f.push(["Stile di combattimento aggiuntivo", "Scegli un secondo stile."]);
    if (l === 11) f.push(["Attacco extra (2)", "Tre attacchi quando usa l'azione di attacco."]);
    if (l === 13) f.push(["Indomito (2 usi)", "Due usi per riposo lungo."]);
    if (l === 15) f.push(["Critico superiore", "Critico con 18, 19 o 20."]);
    if (l === 17) f.push(["Azione impetuosa (2 usi) e Indomito (3 usi)", "Due azioni impetuose per riposo, ma una sola per turno."]);
    if (l === 18) f.push(["Sopravvissuto", "Con al massimo metà dei PF, recupera 5 + Cos PF all'inizio di ogni turno."]);
    if (l === 20) f.push(["Attacco extra (3)", "Quattro attacchi quando usa l'azione di attacco."]);
    return f;
  },
  feats(L, X, S) {
    const C = this, f = S.styles.map(s => [`Stile di combattimento: ${s}`, STYLES[s] || ""]);
    f.push(["Recuperare energie", "Azione bonus, 1d10 + livello PF, una volta per riposo."]);
    f.push([C.surges(L) > 1 ? "Azione impetuosa (2 usi)" : "Azione impetuosa", "Un'azione in più nel turno, una volta per riposo."]);
    const cm = C.critMin(L);
    f.push([cm === 18 ? "Critico superiore" : "Critico migliorato", `Gli attacchi con arma sono critici con ${cm === 18 ? "18, 19 o 20" : "19 o 20"}.`]);
    if (C.attacks(L) > 1) f.push([C.attacks(L) === 2 ? "Attacco extra" : `Attacco extra (${C.attacks(L) - 1})`, `${["", "Un", "Due", "Tre", "Quattro"][C.attacks(L)]} attacchi quando usa l'azione di attacco.`]);
    if (C.athlete(L)) f.push(["Atleta straordinario", `+${Math.ceil(X.P / 2)} alle prove di For, Des e Cos senza competenza, iniziativa compresa.`]);
    if (C.indom(L)) f.push([C.indom(L) > 1 ? `Indomito (${C.indom(L)} usi)` : "Indomito", "Ripeti un tiro salvezza fallito, per riposo lungo."]);
    if (L >= 18) f.push(["Sopravvissuto", `Con al massimo metà dei PF, recupera ${5 + X.M.cos} PF all'inizio di ogni turno.`]);
    f.push(["Posizione privilegiata", "Accolto nell'alta società; i popolani fanno di tutto per compiacerlo."]);
    return f;
  },
  kv: [["Armature", "Leggere, medie, pesanti, scudi"], ["Armi", "Semplici e da guerra"], ["Strumenti", "Un tipo di gioco"],
    ["Lingue", "Comune, Elfico, Nanico"], ["Fazione", "Le Sogliole"], ["Aspetto", "27 anni, 189 cm, 107 kg"]],
  magic: /cremesi|spada del sole|inestinguibile/i,
  def: {
    level: 6, maxhp: 52, ca: 21, speed: "9 m", scores: { for: 20, des: 14, cos: 14, int: 11, sag: 10, car: 14 },
    styles: ["Difesa"], asi: [], history: [],
    weapons: [
      { id: "w1", n: "Ascia da battaglia", t: "Taglienti", note: "", ab: "for", dice: [1, 8], magic: 0 },
      { id: "w2", n: "Ascia d'argento", t: "Taglienti", note: "", ab: "for", dice: [1, 8], magic: 0 },
      { id: "w3", n: "Lancia", t: "Perforanti", note: "ne porta 2", ab: "for", dice: [1, 6], magic: 0, adjHit: -1, adjDmg: -3 },
      { id: "w4", n: "Balestra leggera", t: "Perforanti", note: "quadrelli", ab: "des", dice: [1, 8], magic: 0, ammo: true, ranged: true }],
    hp: 52, temp: 0, re: 0, ai: 0, dv: 0, ind: 0, insp: 0, dardo: 0, fulmine: 0, ammo: 20, deathS: 0, deathF: 0, exh: 0, conds: [],
    coins: { mr: 0, ma: 0, me: 0, mo: 151, mp: 0 }, res: ["Fulmine"], attuned: ["Armatura completa Cremesi"],
    inv: ["Zaino", "Piede di porco", "Martello", "10 chiodi da rocciatore", "10 torce", "Acciarino e pietra focaia", "10 razioni",
      "15 metri di corda di canapa", "Abito pregiato", "Armatura completa Cremesi", "Scudo", "Spada del sole (rotta)",
      "Torcia inestinguibile", "Bavero con catene d'argento", "Ascia d'argento"], notes: "",
  },
};
