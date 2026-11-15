/* Rex: Paladino umano, Giuramento di Vendetta (Manuale del Giocatore 2014).
   Dalla scheda di Cosimo, controllata: valori da point buy (15/10/13/8/10/15 + 1 umano, +2 For al 4°).
   Le regole della classe stanno in js/classi/paladino.js. */
export default {
  id: "rex", name: "Rex", classe: "paladino", sottoclasse: "vendetta", stemma: "R",
  femminile: false, tags: ["Umano", "Vendetta"],
  skills: ["Atletica", "Intimidire", "Persuasione", "Religione"],
  kv: [["Armature", "Tutte, scudi"], ["Armi", "Semplici e da guerra"], ["Giuramento", "Vendetta: punire chi minaccia gli innocenti"],
    ["Storia", "Ha giurato sul corpo del nano mago del gruppo di fare da scudo ai compagni"]],
  magic: /^$/,
  def: {
    level: 6, maxhp: 52, ca: 19, speed: "9 m", scores: { for: 18, des: 11, cos: 14, int: 9, sag: 11, car: 16 },
    styles: ["Difesa"], asi: [], history: [], scelte: [],
    preparati: ["Benedizione", "Cura ferite", "Protezione dal bene e dal male", "Scudo della fede", "Arma magica"],
    weapons: [{ id: "w1", n: "Spada lunga", t: "Taglienti", note: "versatile, 1d10 a due mani", ab: "for", dice: [1, 8], magic: 0 }],
    hp: 52, temp: 0, re: 0, ai: 0, dv: 0, ind: 0, insp: 0, dardo: 0, fulmine: 0, ammo: 0, deathS: 0, deathF: 0, exh: 0, conds: [],
    slot1: 0, slot2: 0, slot3: 0, slot4: 0, slot5: 0, canale: 0, senso: 0, mani: 0,
    coins: { mr: 0, ma: 0, me: 0, mo: 0, mp: 0 }, res: [], attuned: [],
    inv: ["Cotta di maglia", "Scudo con simbolo sacro", "Spada lunga", "Zaino da esploratore", "Coperta", "Vestiti comuni",
      "Acciarino e pietra focaia", "Torce", "Razioni", "Otre", "15 metri di corda di canapa"], notes: "",
  },
};
