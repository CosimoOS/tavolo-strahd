/* Ireena: seguace di classe Guerriero (Calderone omnicomprensivo di Tasha), ruolo marziale Attaccante, dadi vita d8.
   Le regole della classe stanno in js/classi/seguace-guerriero.js. */
export default {
  id: "ireena", name: "Ireena", classe: "seguace-guerriero", sottoclasse: "attaccante", stemma: "I",
  femminile: true, tags: ["Umana", "Attaccante"], insp: false,
  skills: ["Atletica", "Inganno", "Intuizione", "Percezione", "Persuasione"],
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
