/* Petrus: elfo dei boschi, Ranger 5 (Cacciatore) / Druido 1. Dati dati da Cosimo il 15/11/2026.
   PF calcolati con la media dei dadi (ranger come prima classe): 12 + 4×8 + 7 = 51. CA 16 col cuoio borchiato.
   Le regole delle classi stanno in js/classi/ranger.js e js/classi/druido.js. */
export default {
  id: "petrus", name: "Petrus",
  classi: [{ classe: "ranger", sottoclasse: "cacciatore" }, { classe: "druido" }],
  stemma: "P", femminile: false, tags: ["Elfo dei boschi", "Cacciatore"],
  skills: ["Furtività", "Natura", "Percezione", "Sopravvivenza"],
  privilegi: [
    ["Scurovisione", "Vede al buio come in penombra entro 18 m."],
    ["Retaggio fatato", "Vantaggio ai tiri salvezza contro l'essere affascinato; la magia non può farlo addormentare."],
    ["Trance", "Medita 4 ore invece di dormirne 8."],
    ["Maschera della natura", "Può nascondersi anche se è solo leggermente oscurato da fogliame, pioggia, neve o nebbia."],
  ],
  /* correzioni ai dati già salvati, decise dal master (16/11/2026): nemico prescelto Bestie, terreno prescelto Foresta;
     le munizioni comuni sono infinite, quindi il vecchio contatore unico (le frecce d'argento) e la freccia +1
     diventano munizioni speciali legate ai due archi. Restituisce true se ha cambiato qualcosa (la scheda si risalva). */
  correggi(S) {
    let cambiato = false;
    S.scelte = S.scelte || [];
    for (const [id, valore] of [["nemico-prescelto", "Bestie"], ["terreno", "Foresta"]]) {
      if (S.scelte.some(x => x.id === id)) continue;
      S.scelte.push({ livello: 1, classe: "ranger", id, valore }); cambiato = true;
    }
    const arma = re => S.weapons.find(w => w.ranged && !w.mun && re.test(`${w.n} ${w.note || ""}`));
    const lega = (w, id, nome, n) => {
      const m = S.munizioni || [];
      S.munizioni = m.some(x => x.id === id) ? m.map(x => x.id === id ? { id, nome, n } : x) : [...m, { id, nome, n }];
      w.mun = id; delete w.ammo; cambiato = true;
    };
    const argento = arma(/argent/i), piu1 = arma(/\+1/);
    if (argento) lega(argento, "frecce-argento", "Frecce d'argento", argento.ammo ? (S.ammo ?? 18) : 18);
    if (piu1) lega(piu1, "freccia-1", "Freccia +1", 1);
    return cambiato;
  },
  kv: [["Armature", "Leggere, medie, scudi"], ["Armi", "Semplici e da guerra"], ["Lingue", "Comune, Elfico, Druidico"],
    ["Sensi", "Scurovisione 18 m"], ["Razza", "Elfo dei boschi: velocità 10,5 m"]],
  def: {
    level: 6, livelli: { ranger: 5, druido: 1 }, maxhp: 51, ca: 16, speed: "10,5 m",
    scores: { for: 10, des: 18, cos: 14, int: 12, sag: 14, car: 10 },
    styles: ["Tiro"], asi: [], history: [],
    scelte: [{ livello: 1, classe: "ranger", id: "nemico-prescelto", valore: "Bestie" }, { livello: 1, classe: "ranger", id: "terreno", valore: "Foresta" },
      { livello: 3, classe: "ranger", id: "preda", valore: "colosso" }],
    conosciuti: ["Marchio del cacciatore", "Parlare con gli animali", "Colpo di zefiro", "Passare senza tracce"],
    trucchetti_druido: ["Produrre fiamma", "Guida"], preparati_druido: [],
    weapons: [
      { id: "w1", n: "Arco lungo", t: "Perforanti", note: "frecce d'argento", ab: "des", dice: [1, 8], magic: 0, ranged: true, mun: "frecce-argento" },
      { id: "w2", n: "Arco lungo · freccia +1", t: "Perforanti", note: "una freccia incantata", ab: "des", dice: [1, 8], magic: 1, ranged: true, mun: "freccia-1" },
      { id: "w3", n: "Spada corta", t: "Perforanti", note: "ne porta 2: con l'altra, azione bonus senza modificatore al danno", ab: "fin", dice: [1, 6], magic: 0 },
      { id: "w4", n: "Pugnale +1", t: "Perforanti", note: "lancio 6/18 m", ab: "fin", dice: [1, 4], magic: 1 }],
    hp: 51, temp: 0, re: 0, ai: 0, dv: 0, ind: 0, insp: 0, dardo: 0, fulmine: 0, ammo: 0, deathS: 0, deathF: 0, exh: 0, conds: [],
    munizioni: [{ id: "frecce-argento", nome: "Frecce d'argento", n: 18 }, { id: "freccia-1", nome: "Freccia +1", n: 1 }],
    slot1: 0, slot2: 0, coins: { mr: 0, ma: 0, me: 0, mo: 0, mp: 0 }, res: [], attuned: [],
    inv: ["Armatura di cuoio borchiato", "Arco lungo", "18 frecce d'argento", "Freccia incantata +1", "Spada corta", "Spada corta",
      "Pugnale +1", "Focus druidico"], notes: "",
  },
};
