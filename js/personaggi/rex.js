/* Rex: Paladino umano, Giuramento di Vendetta (Manuale del Giocatore 2014), livello 6.
   Dalla scheda di Cosimo, controllata: valori da point buy (15/10/13/8/10/15 + 1 umano, +2 For al 4°).
   Aggiunti due privilegi che la scheda non riportava: Salute divina (3°) e Abiura nemico (seconda opzione di Incanalare divinità). */

/* slot del paladino per livello: [1°, 2°, 3°, 4°, 5°] */
const SLOT = [[], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3],
  [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
export const slotPaladino = l => SLOT[Math.max(0, Math.min(20, l))];

export default {
  id: "rex", name: "Rex", sub: "Giuramento di Vendetta", classe: "Paladino", stemma: "R",
  femminile: false, tags: ["Umano", "Vendetta"],
  hitDie: 10, hpAvg: 6, saves: ["sag", "car"], skills: ["Atletica", "Intimidire", "Persuasione", "Religione"],
  asi: [4, 8, 12, 16, 19], roleHit: 0, armor: false, surge: false, insp: true, styleAt: 0, secondWind: false,
  attacks: l => l >= 5 ? 2 : 1, reUses: l => 0, surges: l => 0, indom: l => 0,
  critMin: l => 20, athlete: l => false, ready: l => false, caBonus: l => 0, indName: "",
  /* Aura di protezione: dal 6° livello +Car (minimo +1) a tutti i tiri salvezza, suoi e degli alleati entro 3 m (9 m dal 18°) */
  saveBonus: (l, M) => l >= 6 ? Math.max(1, M.car) : 0,

  /* risorse con le losanghe: si azzerano col riposo indicato */
  risorse(L, X) {
    const r = slotPaladino(L).map((n, i) => ({ k: "slot" + (i + 1), nome: `Slot di ${i + 1}° livello`, testo: "Incantesimi e Punizione divina · riposo lungo", max: n, riposo: "lungo" }));
    if (L >= 3) r.push({ k: "canale", nome: "Incanalare divinità", testo: "Voto di inimicizia o Abiura nemico · riposo breve", max: 1, riposo: "breve" });
    r.push({ k: "senso", nome: "Percezione del divino", testo: "Azione · celestiali, immondi e non morti entro 18 m · riposo lungo", max: 1 + Math.max(0, X.M.car), riposo: "lungo" });
    return r;
  },
  /* una riserva di punti da spendere un po' alla volta */
  riserva(L) { return { k: "mani", nome: "Imposizione delle mani", testo: "Azione · tocca e cura; 5 punti curano una malattia o un veleno · riposo lungo", max: 5 * L }; },

  /* sotto gli attacchi: il promemoria della punizione */
  atkNota: L => L >= 2 ? `Punizione divina: dopo un colpo in mischia spendi uno slot, +2d8 radianti con uno di 1°, +3d8 con uno di 2° (+1d8 contro non morti e immondi). Con un critico raddoppiano anche questi dadi.${L >= 11 ? " Punizione migliorata: +1d8 radianti a ogni colpo in mischia." : ""}` : "",
  magia: (L, X) => `CD ${8 + X.P + X.M.car} · ${X.P + X.M.car >= 0 ? "+" : ""}${X.P + X.M.car} per colpire · ${Math.max(1, X.M.car + Math.floor(L / 2))} incantesimi preparati più quelli del giuramento`,
  incantesimi: [
    { n: "Benedizione", liv: 1, conc: true, t: "Tu e fino a 3 alleati aggiungete 1d4 ai tiri per colpire e ai tiri salvezza." },
    { n: "Cura ferite", liv: 1, t: "Una creatura toccata recupera 1d8 + 3 PF (+1d8 per ogni livello di slot sopra il 1°)." },
    { n: "Protezione dal bene e dal male", liv: 1, conc: true, t: "Aberrazioni, celestiali, elementali, folletti, immondi e non morti hanno svantaggio contro il bersaglio, che non può essere affascinato, spaventato o posseduto da loro." },
    { n: "Scudo della fede", liv: 1, conc: true, t: "Azione bonus: +2 alla CA di una creatura entro 18 m (Rex sale a 21)." },
    { n: "Arma magica", liv: 2, conc: true, t: "Azione bonus: un'arma non magica diventa +1 ai tiri per colpire e ai danni." },
    { n: "Anatema", liv: 1, conc: true, giur: true, t: "Fino a 3 creature, tiro salvezza su Carisma CD 14: se falliscono sottraggono 1d4 ai tiri per colpire e ai tiri salvezza." },
    { n: "Marchio del cacciatore", liv: 1, conc: true, giur: true, t: "Azione bonus: +1d6 danni a ogni colpo con un'arma contro il bersaglio marchiato, vantaggio per seguirne le tracce." },
    { n: "Blocca persone", liv: 2, conc: true, giur: true, t: "Un umanoide, tiro salvezza su Saggezza CD 14 o paralizzato; i colpi in mischia entro 1,5 m sono critici automatici." },
    { n: "Passo velato", liv: 2, giur: true, t: "Azione bonus: teletrasporto fino a 9 m in uno spazio libero che vedi." },
  ],

  featuresAt(l) {
    const f = [];
    if (this.asi.includes(l)) f.push(["Aumento dei punteggi di caratteristica", "+2 a una caratteristica oppure +1 a due, massimo 20."]);
    if (l === 7) f.push(["Vendicatore implacabile", "Dopo un attacco di opportunità riuscito, si muove di metà velocità senza provocare attacchi di opportunità."]);
    if (l === 9) f.push(["Incantesimi del giuramento", "Paura e Velocità sempre preparati. Slot di 3° livello."]);
    if (l === 10) f.push(["Aura di coraggio", "Lui e gli alleati entro 3 m non possono essere spaventati mentre è cosciente."]);
    if (l === 11) f.push(["Punizione divina migliorata", "+1d8 danni radianti a ogni colpo in mischia."]);
    if (l === 14) f.push(["Tocco purificatore", "Azione: termina un incantesimo su sé o su una creatura consenziente, Car volte per riposo lungo."]);
    if (l === 15) f.push(["Anima della vendetta", "Reazione: attacco in mischia contro il bersaglio del Voto di inimicizia quando attacca."]);
    if (l === 18) f.push(["Aure migliorate", "Le aure arrivano a 9 m."]);
    if (l === 20) f.push(["Angelo vendicatore", "Ali e aura di terrore per 1 ora, una volta per riposo lungo."]);
    return f;
  },
  feats(L, X) {
    const car = Math.max(1, X.M.car), f = [];
    if (L >= 6) f.push(["Aura di protezione", `Lui e gli alleati entro 3 m aggiungono +${car} a tutti i tiri salvezza (già incluso nei suoi).`]);
    if (L >= 5) f.push(["Attacco extra", "Due attacchi quando usa l'azione di attacco."]);
    f.push(["Stile di combattimento: Difesa", "+1 alla CA con l'armatura, già incluso."]);
    if (L >= 3) f.push(["Voto di inimicizia", "Incanalare divinità, azione bonus: vantaggio ai tiri per colpire contro una creatura entro 3 m per 1 minuto."]);
    if (L >= 3) f.push(["Abiura nemico", "Incanalare divinità, azione: una creatura entro 18 m, tiro salvezza su Saggezza CD " + (8 + X.P + X.M.car) + " o spaventata per 1 minuto con velocità 0 (svantaggio al tiro per immondi e non morti). Se riesce, velocità dimezzata."]);
    if (L >= 3) f.push(["Salute divina", "Immune alle malattie."]);
    return f;
  },
  kv: [["Armature", "Tutte, scudi"], ["Armi", "Semplici e da guerra"], ["Giuramento", "Vendetta: punire chi minaccia gli innocenti"],
    ["Storia", "Ha giurato sul corpo del nano mago del gruppo di fare da scudo ai compagni"]],
  magic: /^$/,
  def: {
    level: 6, maxhp: 52, ca: 19, speed: "9 m", scores: { for: 18, des: 11, cos: 14, int: 9, sag: 11, car: 16 },
    styles: ["Difesa"], asi: [], history: [],
    weapons: [{ id: "w1", n: "Spada lunga", t: "Taglienti", note: "versatile, 1d10 a due mani", ab: "for", dice: [1, 8], magic: 0 }],
    hp: 52, temp: 0, re: 0, ai: 0, dv: 0, ind: 0, insp: 0, dardo: 0, fulmine: 0, ammo: 0, deathS: 0, deathF: 0, exh: 0, conds: [],
    slot1: 0, slot2: 0, slot3: 0, slot4: 0, slot5: 0, canale: 0, senso: 0, mani: 0,
    coins: { mr: 0, ma: 0, me: 0, mo: 0, mp: 0 }, res: [], attuned: [],
    inv: ["Cotta di maglia", "Scudo con simbolo sacro", "Spada lunga", "Zaino da esploratore", "Coperta", "Vestiti comuni",
      "Acciarino e pietra focaia", "Torce", "Razioni", "Otre", "15 metri di corda di canapa"], notes: "",
  },
};
