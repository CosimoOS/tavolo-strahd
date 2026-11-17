/* Lo scontro a tutto schermo dei giocatori. Funzioni pure, provate da test/battaglia.test.js.
   Quando il master apre uno scontro, il telefono di chi partecipa mostra lo scontro e basta: niente barra delle
   sezioni, niente giri tra le pagine. La scheda si può sbirciare con un pulsante, e da lì si torna con un tocco. */

/** Cosa c'è sullo schermo. master: è il master · inScontro: c'è uno scontro e partecipo · vista: sto guardando lo scontro
    → barra: la barra delle sezioni · voceScontro: la voce "Scontro" nella barra · sbircia: il pulsante "Guarda la scheda" */
export function schermoBattaglia({ master, inScontro, vista }) {
  if (master) return { barra: true, voceScontro: true, sbircia: false };
  const dentro = !!(inScontro && vista);
  return { barra: !dentro, voceScontro: false, sbircia: dentro };
}

/** Appena comincia il mio turno, se sto guardando la scheda, si torna allo scontro (una volta sola per turno). */
export function tornaAlloScontro({ mioTurno, eraMioTurno, vista }) {
  return !!(mioTurno && !eraMioTurno && !vista);
}
