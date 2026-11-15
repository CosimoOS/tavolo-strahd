/* Unisce un personaggio (chi è: nome, punteggi, equipaggiamento, storia) con la sua classe (cosa sa fare a ogni livello)
   e restituisce le "regole" che la scheda usa. Così un personaggio nuovo è solo una riga in più, non codice nuovo.
   opzioni() dà le regole del tavolo, per ora { tasha: true/false } (privilegi opzionali del Calderone di Tasha). */
import { talento } from "../regole/talenti.js";

export function componi(P, classe, opzioni = () => ({ tasha: false })) {
  const sub = (classe.sottoclassi || {})[P.sottoclasse] || {};
  const opz = () => opzioni() || {};
  const talentiPresi = S => (S.asi || []).filter(a => a.feat).map(a => ({ a, t: talento(a.feat) }));
  return {
    /* chi è */
    id: P.id, name: P.name, stemma: P.stemma, femminile: !!P.femminile, tags: P.tags, kv: P.kv, magic: P.magic || /^$/,
    def: P.def, skills: P.skills, armor: !!P.armor, insp: P.insp !== false,
    classe: classe.nome, sub: sub.nome || "", classeId: classe.id, sottoclasseId: P.sottoclasse,
    /* numeri della classe */
    hitDie: classe.dadoVita, hpAvg: classe.pfMedia, saves: classe.ts, asi: classe.asi, armature: classe.armature,
    styleAt: classe.stileAl || 0, stileExtraAl: sub.stileExtraAl || 0,
    roleHit: sub.bonusColpire || 0, secondWind: !!classe.secondWind, surge: !!classe.surge,
    attacks: classe.attacchi, reUses: classe.recuperi || (() => 0), surges: classe.impetuose || (() => 0),
    indom: classe.indomito || (() => 0), indName: classe.nomeIndomito || "",
    critMin: L => (sub.critMin || classe.critMin || (() => 20))(L),
    athlete: L => !!(sub.atleta && sub.atleta(L)), ready: L => !!(classe.prontezza && classe.prontezza(L)),
    caBonus: L => classe.bonusCa ? classe.bonusCa(L) : 0,
    saveBonus: classe.bonusTs, magiaDa: classe.magia || (() => false),
    punizione: !!classe.punizione,
    risorse: classe.risorse ? (L, X, S) => classe.risorse(L, X, S || P.def, opz()) : undefined,
    riserva: classe.riserva,
    atkNota: classe.atkNota,
    /* incantesimi (paladino, ranger) */
    ...(classe.magiaTesto ? {
      magia: (L, X) => classe.magiaTesto(L, X),
      quantiPreparati: classe.quantiPreparati, quantiConosciuti: classe.quantiConosciuti,
      maxLivelloIncantesimi: classe.maxLivelloIncantesimi,
      incantesimiClasse: () => classe.incantesimiClasse(opz()),
      incantesimiSottoclasse: L => classe.incantesimiSottoclasse ? classe.incantesimiSottoclasse(P.sottoclasse, L) : [],
    } : {}),
    /* passaggio di livello: cosa arriva e cosa si sceglie */
    featuresAt: L => [...classe.novita(L, opz()), ...(sub.novita ? sub.novita(L, opz()) : [])],
    scelte: (L, S) => [...(classe.scelte ? classe.scelte(L, S, opz()) : []), ...(sub.scelte ? sub.scelte(L, S, opz()) : [])],
    /* privilegi mostrati nella scheda */
    feats(L, X, S) {
      const f = [...(sub.privilegi ? sub.privilegi(L, X, S, opz()) : []), ...classe.privilegi(L, X, S, opz())];
      talentiPresi(S).forEach(({ a, t }) => f.push(t ? [`Talento: ${t.nome}`, t.testo] : [`Talento (livello ${a.level})`, a.feat]));
      return f.concat(P.privilegi || []);
    },
    opzioni: opz,
  };
}
