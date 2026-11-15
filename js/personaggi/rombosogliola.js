/* Rombosogliola: Guerriero umano, sottoclasse Campione (Manuale del Giocatore 2014), background nobile.
   Qui c'è CHI È il personaggio; COSA SA FARE a ogni livello sta nella classe (js/classi/guerriero.js).
   Lo STATO (PF, monete, oggetti…) sta nell'archivio; "def" è solo il punto di partenza. */

export default {
  id: "rombosogliola", name: "Rombosogliola", classe: "guerriero", sottoclasse: "campione", stemma: "pesce",
  femminile: false, tags: ["Umano", "Nobile"], armor: true,
  skills: ["Addestrare animali", "Atletica", "Persuasione", "Storia"],
  privilegi: [["Posizione privilegiata", "Accolto nell'alta società; i popolani fanno di tutto per compiacerlo."]],
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
