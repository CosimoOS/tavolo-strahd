/* Tiri salvezza contro la morte (Manuale del giocatore). Funzioni pure, provate da test/morte.test.js.
   A 0 PF, all'inizio di ogni tuo turno tiri un d20 senza modificatori: 10 o più è un successo, meno un fallimento.
   1 naturale: due fallimenti. 20 naturale: ti rialzi con 1 PF. Tre successi: stabile. Tre fallimenti: morto.
   Danni mentre sei a terra: un fallimento (due se il colpo è critico). Danni che, arrivati a 0, avanzano quanto
   il tuo massimo dei PF: morte sul colpo. Una cura riporta in piedi e azzera i tiri (lo fa la scheda).
     S.deathS, S.deathF = successi e fallimenti segnati · S.morteTurno = il turno in cui hai già tirato */
import { danno, massimo } from "./pf.js";

/** "in-piedi", "a-terra", "stabile" (tre successi) o "morto" (tre fallimenti). */
export function statoMorte(S) {
  if (S.hp > 0) return "in-piedi";
  if ((S.deathF || 0) >= 3) return "morto";
  return (S.deathS || 0) >= 3 ? "stabile" : "a-terra";
}

/** Il tiro contro la morte con il d20 uscito: { esito, cambia } dove cambia è ciò che va scritto sulla scheda. */
export function tiroMorte(S, d20) {
  const s = S.deathS || 0, f = S.deathF || 0;
  if (d20 === 20) return { esito: "in-piedi", cambia: { hp: 1, deathS: 0, deathF: 0 } };
  if (d20 >= 10) return { esito: s + 1 >= 3 ? "stabile" : "successo", cambia: { deathS: s + 1, deathF: f } };
  const nf = Math.min(3, f + (d20 === 1 ? 2 : 1));
  return { esito: nf >= 3 ? "morto" : d20 === 1 ? "due-fallimenti" : "fallimento", cambia: { deathS: s, deathF: nf } };
}

/** Un colpo da n danni: { cambia, fallimenti, morto }. In piedi toglie i PF (prima i temporanei); se si arriva a 0
    si va a terra, o si muore sul colpo. A terra ogni colpo che passa i temporanei è un fallimento (due se critico). */
export function colpo(S, n, { critico = false } = {}) {
  const dopo = danno(S, n), temp = S.temp || 0, max = massimo(S);
  if (S.hp > 0) {
    if (dopo.hp > 0) return { cambia: dopo, fallimenti: 0, morto: false };
    const morto = n - temp - S.hp >= max;
    return { cambia: { ...dopo, deathS: 0, deathF: morto ? 3 : 0 }, fallimenti: 0, morto };
  }
  const passa = n - temp, s = S.deathS || 0, f = S.deathF || 0;
  if (passa <= 0) return { cambia: { ...dopo, deathS: s, deathF: f }, fallimenti: 0, morto: f >= 3 };
  if (passa >= max) return { cambia: { ...dopo, deathS: 0, deathF: 3 }, fallimenti: 0, morto: true };
  const presi = critico ? 2 : 1, nf = Math.min(3, f + presi);
  return { cambia: { ...dopo, deathS: s >= 3 ? 0 : s, deathF: nf }, fallimenti: presi, morto: nf >= 3 };
}

/** Si può tirare contro la morte in questo turno? Solo a terra (non stabile, non morto) e una volta per turno. */
export const puoTirareMorte = (S, chiave) => statoMorte(S) === "a-terra" && S.morteTurno !== chiave;
