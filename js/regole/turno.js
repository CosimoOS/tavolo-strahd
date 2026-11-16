/* Le azioni di un turno, secondo il Manuale del giocatore. Funzioni pure, provate da test/turno.test.js.

   Ogni turno: un'Azione, un'Azione bonus (se qualcosa te la dà) e una Reazione per round.
   - Attacco extra: l'azione "Attacca" vale più attacchi con le armi (perAzione).
   - Incantesimi e oggetti costano un'azione intera: non si lanciano a metà di un'azione d'attacco.
   - Incantesimo con l'azione bonus: nello stesso turno, con l'azione solo trucchetti (puoIncantesimo).
   - Azione impetuosa: un'azione in più, una volta per turno. L'app la propone solo quando l'azione è finita.
   L'app conta da sola ma non blocca le eccezioni: il gettone "Azione" si può girare a mano (il master concede).

   Sulla scheda (St.az) resta solo il conto del turno in corso:
     { chiave: "idScontro:round:turno", azioni: azioni già cominciate o usate, restano: attacchi che restano
       dell'azione d'attacco in corso, extra: azioni in più (Azione impetuosa), bonus: azione bonus usata }
   Un conto con una chiave diversa è di un turno passato: vale come turno nuovo.
   La reazione si ricorda a parte (St.reazione = { scontro, round, turno }) e torna all'inizio del proprio turno. */

/** Il turno in corso, come stringa: cambia a ogni "Fine turno". */
export const chiaveTurno = SC => `${SC.id}:${SC.round}:${SC.turno}`;

/** Il conto del turno: se è di un altro turno (o di una versione vecchia dell'app) si riparte da zero. */
export function contoTurno(az, chiave) {
  return az && az.chiave === chiave && "restano" in az ? { extra: 0, bonus: false, ...az } : { chiave, azioni: 0, restano: 0, extra: 0, bonus: false };
}

/** Come sta il turno: quante azioni libere, se si può ancora attaccare, a che attacco si è. */
export function statoTurno(az, chiave, perAzione = 1) {
  const t = contoTurno(az, chiave), per = Math.max(1, perAzione), tot = 1 + (t.extra || 0);
  const libere = Math.max(0, tot - t.azioni);
  return {
    ...t, perAzione: per, totAzioni: tot, azioniLibere: libere,
    inAttacco: t.restano > 0,                       // un'azione d'attacco cominciata, con attacchi ancora da fare
    puoAttaccare: t.restano > 0 || libere > 0,      // un attacco con un'arma
    puoAzione: libere > 0,                          // un incantesimo, un oggetto: serve un'azione intera
    prossimoAttacco: t.restano > 0 ? per - t.restano + 1 : 1,
  };
}
/** L'Azione impetuosa si propone quando non resta più niente da fare con l'azione normale. */
export function impetuosaPronta(az, chiave, perAzione, usi) {
  const s = statoTurno(az, chiave, perAzione);
  return !!usi && usi.usate < usi.max && !s.extra && !s.puoAttaccare;
}

/** Un attacco con un'arma: continua l'azione d'attacco in corso, oppure ne comincia una (Attacco extra). */
export function dopoAttacco(az, chiave, perAzione = 1) {
  const t = contoTurno(az, chiave), per = Math.max(1, perAzione);
  if (t.restano > 0) return { ...t, restano: t.restano - 1 };
  return { ...t, azioni: t.azioni + 1, restano: per - 1 };
}
/** Un incantesimo o un oggetto: un'azione intera. */
export const dopoAzione = (az, chiave, { livello = null } = {}) => { const t = contoTurno(az, chiave); return { ...t, azioni: t.azioni + 1, ...(livello > 0 ? { incAzione: true } : {}) }; };
export const dopoBonus = (az, chiave, { incantesimo = false } = {}) => ({ ...contoTurno(az, chiave), bonus: true, ...(incantesimo ? { incBonus: true } : {}) });
/** Si può lanciare questo incantesimo adesso? Regola del manuale: se in un turno lanci un incantesimo con l'azione bonus,
    con l'azione puoi lanciare solo trucchetti; e dopo un incantesimo di livello con l'azione, niente incantesimi bonus. */
export function puoIncantesimo(az, chiave, { come, livello }) {
  const t = contoTurno(az, chiave);
  return come === "bonus" ? !t.incAzione : !(t.incBonus && livello > 0);
}
/** Azione impetuosa: un'azione in più in questo turno. */
export const conImpetuosa = (az, chiave) => { const t = contoTurno(az, chiave); return { ...t, extra: (t.extra || 0) + 1 }; };

/** Il gettone "Azione" toccato a mano: se resta qualcosa lo chiude, altrimenti ridà un'azione (eccezione concessa dal master). */
export function giraAzione(az, chiave) {
  const t = contoTurno(az, chiave), tot = 1 + (t.extra || 0);
  return t.restano > 0 || t.azioni < tot ? { ...t, azioni: tot, restano: 0 } : { ...t, azioni: Math.max(0, t.azioni - 1), restano: 0 };
}
export const giraBonus = (az, chiave) => { const t = contoTurno(az, chiave); return { ...t, bonus: !t.bonus }; };

/** La reazione usata al momento `usata` ({ round, turno }) è tornata? Torna quando ricomincia il turno di chi l'ha usata,
    che sta in posizione `i` nell'ordine. Fuori dall'ordine (i < 0) torna al round dopo. */
export function reazioneTornata(usata, ora, i) {
  if (!usata) return true;
  if (i < 0) return ora.round > usata.round;
  const inizio = i > usata.turno ? { round: usata.round, turno: i } : { round: usata.round + 1, turno: i };
  return ora.round > inizio.round || (ora.round === inizio.round && ora.turno >= inizio.turno);
}
/** La reazione di un personaggio o di una creatura nello scontro SC: true se può ancora reagire. */
export function reazioneLibera(usata, SC, idVoce) {
  if (!usata || !SC || usata.scontro !== SC.id) return true;
  const i = (SC.ordine || []).findIndex(v => v.id === idVoce);
  return reazioneTornata(usata, { round: SC.round, turno: SC.turno }, i);
}
