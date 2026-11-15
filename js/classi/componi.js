/* Unisce un personaggio (chi è: nome, punteggi, equipaggiamento, storia) con la sua classe, o le sue classi
   se è un multiclasse (Petrus: Ranger 5 / Druido 1), e restituisce le "regole" che la scheda usa.
   Un personaggio nuovo è solo una riga di dati, non codice nuovo.

   Livelli: S.level è il livello totale; S.livelli = { ranger: 5, druido: 1 } quelli di ogni classe
   (per chi ha una sola classe può mancare: vale tutto per la prima).
   opzioni() dà le regole del tavolo, per ora { tasha: true/false } (opzioni del Calderone di Tasha). */
import { talento } from "../regole/talenti.js";
import { slotMezzo } from "./comune.js";

/* slot di un incantatore "pieno" per livello da incantatore (serve anche per sommare i multiclasse) */
const PIENO = [[], [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
export const slotPieno = l => PIENO[Math.max(0, Math.min(20, l))];

/** Livello da incantatore per gli slot: le classi "piene" contano intere, le "mezze" (paladino, ranger) metà per difetto.
    Con una sola classe che lancia incantesimi si usa la sua tabella; con più di una, quella del multiclasse. */
export function slotMulticlasse(parti) {
  const lancia = parti.filter(p => p.cl.incantatore && p.lv > 0 && p.cl.magia(p.lv));
  if (!lancia.length) return [];
  if (lancia.length === 1) { const p = lancia[0]; return p.cl.incantatore === "pieno" ? slotPieno(p.lv) : slotMezzo(p.lv); }
  return slotPieno(lancia.reduce((n, p) => n + (p.cl.incantatore === "pieno" ? p.lv : Math.floor(p.lv / 2)), 0));
}

export function componi(P, CLASSI, opzioni = () => ({ tasha: false })) {
  const voci = P.classi || [{ classe: P.classe, sottoclasse: P.sottoclasse }];
  const opz = () => opzioni() || {};
  const prima = CLASSI[voci[0].classe];
  let St = P.def;                                          // ultimo stato visto (lo aggiorna calcola)
  const livelli = S => (S && S.livelli) || { [voci[0].classe]: (S || St).level };
  /* le classi con il loro livello; L (se dato) vale per chi ha una sola classe, come nei calcoli "a quel livello" */
  const parti = (S = St, L = null) => voci.map(v => {
    const cl = CLASSI[v.classe];
    return { id: v.classe, cl, sub: (cl.sottoclassi || {})[v.sottoclasse] || {}, lv: L != null && voci.length === 1 ? L : (livelli(S)[v.classe] || 0) };
  }).filter(p => p.lv > 0);
  const tutte = () => voci.map(v => ({ id: v.classe, cl: CLASSI[v.classe], sub: (CLASSI[v.classe].sottoclassi || {})[v.sottoclasse] || {} }));
  const max = (f, d = 0, L = null) => parti(St, L).reduce((m, p) => Math.max(m, f(p) || 0), d);
  const prima1 = (f, L = null) => { for (const p of parti(St, L)) { const v = f(p); if (v) return v; } return null; };
  const talentiPresi = S => (S.asi || []).filter(a => a.feat).map(a => ({ a, t: talento(a.feat) }));
  const chiaveInc = (id, tipo) => id === "paladino" && tipo === "preparati" ? "preparati" : id === "ranger" && tipo === "conosciuti" ? "conosciuti" : `${tipo}_${id}`;

  const C = {
    /* chi è */
    id: P.id, name: P.name, stemma: P.stemma, femminile: !!P.femminile, tags: P.tags, kv: P.kv, magic: P.magic || /^$/,
    def: P.def, skills: P.skills, correggi: P.correggi, armor: !!P.armor, insp: P.insp !== false,
    classeId: voci[0].classe, sottoclasseId: voci[0].sottoclasse, multiclasse: voci.length > 1,
    vediStato(S) { St = S; },
    get classe() { const p = parti(); return p.length > 1 ? p.map(x => `${x.cl.nome} ${x.lv}`).join(" · ") : prima.nome; },
    get sub() { return parti().map(p => p.sub.nome).filter(Boolean).join(" · "); },
    /* numeri */
    hitDie: prima.dadoVita, hpAvg: prima.pfMedia, saves: prima.ts, asi: prima.asi,
    get armature() { return [...new Set(parti().flatMap(p => p.cl.armature || []))]; },
    styleAt: prima.stileAl || 0, stileExtraAl: 0,
    get roleHit() { return max(p => p.sub.bonusColpire); },
    get secondWind() { return parti().some(p => p.cl.secondWind); },
    get surge() { return parti().some(p => p.cl.surge); },
    attacks: L => max(p => p.cl.attacchi(p.lv), 1, L),
    reUses: L => max(p => p.cl.recuperi && p.cl.recuperi(p.lv), 0, L),
    surges: L => max(p => p.cl.impetuose && p.cl.impetuose(p.lv), 0, L),
    indom: L => max(p => p.cl.indomito && p.cl.indomito(p.lv), 0, L),
    get indName() { return prima1(p => p.cl.nomeIndomito) || ""; },
    critMin: L => parti(St, L).reduce((m, p) => Math.min(m, (p.sub.critMin || p.cl.critMin || (() => 20))(p.lv)), 20),
    athlete: L => parti(St, L).some(p => p.sub.atleta && p.sub.atleta(p.lv)),
    ready: L => parti(St, L).some(p => p.cl.prontezza && p.cl.prontezza(p.lv)),
    caBonus: L => max(p => p.cl.bonusCa && p.cl.bonusCa(p.lv), 0, L),
    saveBonus: (L, M) => max(p => p.cl.bonusTs && p.cl.bonusTs(p.lv, M), 0, L),
    magiaDa: L => parti(St, L).some(p => p.cl.magia(p.lv) && (p.cl.incantesimiClasse || p.cl.trucchettiClasse)),
    get punizione() { return parti().some(p => p.cl.punizione && p.lv >= 2); },

    /* risorse: gli slot (sommati se multiclasse) più le risorse di ogni classe al suo livello */
    risorse(L, X, S) {
      S = S || St; const pp = parti(S, L);
      const slot = slotMulticlasse(pp).map((n, i) => ({ k: "slot" + (i + 1), nome: `Slot di ${i + 1}° livello`, testo: `${C.punizione ? "Incantesimi e Punizione divina" : "Incantesimi"} · riposo lungo`, max: n, riposo: "lungo" }));
      const altre = pp.flatMap(p => p.cl.risorse ? p.cl.risorse(p.lv, X, S, opz()) : []).filter(r => !/^slot\d$/.test(r.k));
      return [...slot, ...altre];
    },
    riserva: L => prima1(p => p.cl.riserva && p.cl.riserva(p.lv), L),
    atkNota: L => prima1(p => p.cl.atkNota && p.cl.atkNota(p.lv), L) || "",

    /* incantesimi: una sezione per ogni classe che li lancia */
    magie(L, X, S) {
      S = S || St;
      return parti(S, L).filter(p => p.cl.magia(p.lv) && (p.cl.incantesimiClasse || p.cl.trucchettiClasse)).map(p => {
        const preparati = !!p.cl.quantiPreparati, tipo = preparati ? "preparati" : "conosciuti";
        return {
          id: p.id, nome: p.cl.nome, testo: p.cl.magiaTesto(p.lv, X), preparati,
          chiave: chiaveInc(p.id, tipo), limite: preparati ? p.cl.quantiPreparati(p.lv, X) : p.cl.quantiConosciuti(p.lv),
          max: p.cl.maxLivelloIncantesimi(p.lv), lista: p.cl.incantesimiClasse ? p.cl.incantesimiClasse(opz()) : [],
          fissi: p.cl.incantesimiSottoclasse ? p.cl.incantesimiSottoclasse(voci.find(v => v.classe === p.id).sottoclasse, p.lv) : [],
          trucchetti: p.cl.trucchettiClasse ? { chiave: `trucchetti_${p.id}`, limite: p.cl.quantiTrucchetti(p.lv), lista: p.cl.trucchettiClasse() } : null,
        };
      });
    },

    /* passaggio di livello: le classi tra cui scegliere e cosa porta un livello in più in quella scelta */
    classiPerLivello: S => tutte().map(t => ({ id: t.id, nome: t.cl.nome, livello: livelli(S)[t.id] || 0 })),
    passo(S, id) {
      const t = tutte().find(x => x.id === id) || tutte()[0], l = (livelli(S)[t.id] || 0) + 1;
      return {
        id: t.id, nome: t.cl.nome, livello: l, dado: t.cl.dadoVita, pfMedia: t.cl.pfMedia,
        asi: t.cl.asi.includes(l), stile: (t.cl.stileAl && l === t.cl.stileAl) || (t.sub.stileExtraAl && l === t.sub.stileExtraAl),
        novita: [...t.cl.novita(l, opz()), ...(t.sub.novita ? t.sub.novita(l, opz()) : [])],
        scelte: [...(t.cl.scelte ? t.cl.scelte(l, S, opz()) : []), ...(t.sub.scelte ? t.sub.scelte(l, S, opz()) : [])],
      };
    },
    /* compatibilità con il passaggio di livello a classe singola */
    featuresAt: L => { const t = tutte()[0]; return [...t.cl.novita(L, opz()), ...(t.sub.novita ? t.sub.novita(L, opz()) : [])]; },
    scelte: (L, S) => { const t = tutte()[0]; return [...(t.cl.scelte ? t.cl.scelte(L, S, opz()) : []), ...(t.sub.scelte ? t.sub.scelte(L, S, opz()) : [])]; },
    /* dadi vita: "5d10 + 1d8" per i multiclasse */
    dadiVita: S => parti(S).map(p => `${p.lv}d${p.cl.dadoVita}`).join(" + "),

    /* privilegi mostrati nella scheda */
    feats(L, X, S) {
      const f = parti(S, L).flatMap(p => [...(p.sub.privilegi ? p.sub.privilegi(p.lv, X, S, opz()) : []), ...p.cl.privilegi(p.lv, X, S, opz())]);
      talentiPresi(S).forEach(({ a, t }) => f.push(t ? [`Talento: ${t.nome}`, t.testo] : [`Talento (livello ${a.level})`, a.feat]));
      return f.concat(P.privilegi || []);
    },
    opzioni: opz,
  };
  return C;
}
