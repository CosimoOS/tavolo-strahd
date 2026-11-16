/* Punti ferita: danni, cure, PF temporanei e massimo ridotto. Funzioni pure, provate da test/pf.test.js.
   S.maxhp è il massimo vero (sale con i livelli). S.riduzione è quanto ne toglie un effetto (un morso, una maledizione):
   la cura arriva solo fino al massimo ridotto e il riposo lungo NON la toglie, perché certe maledizioni durano finché
   qualcuno non le spezza. Si toglie a mano dal tastierino dei PF (tasto "Massimo", zero). */

/** Il massimo che si può avere adesso: il vero meno la riduzione, mai sotto 1. */
export const massimo = S => Math.max(1, S.maxhp - (S.riduzione || 0));

/** Danno: prima si consumano i PF temporanei, poi quelli veri; mai sotto zero. */
export function danno(S, n) {
  const temp = S.temp || 0, t = Math.min(temp, n);
  return { hp: Math.max(0, S.hp - (n - t)), temp: temp - t };
}

/** Cura: fino al massimo (ridotto, se c'è una riduzione). */
export const cura = (S, n) => ({ hp: Math.min(massimo(S), S.hp + n) });

/** Il massimo si riduce di n (zero toglie la riduzione); resta almeno 1 PF di massimo e i PF non lo superano. */
export function riduci(S, n) {
  const riduzione = Math.max(0, Math.min(n, S.maxhp - 1));
  return { riduzione, hp: Math.min(S.hp, S.maxhp - riduzione) };
}

/** Riposo lungo: PF fino al massimo ridotto, temporanei a zero; la riduzione resta. */
export const dopoRiposoLungo = S => ({ hp: massimo(S), temp: 0 });

/** I pezzi della barra dei PF, in percentuale: vita, temporanei, vuoto (PF che mancano) e perso (il massimo ridotto, in grigio).
    La barra misura il massimo vero; se i temporanei vanno oltre, si allunga e tutto resta in proporzione. */
export function segmentiBarra(S) {
  const hp = Math.max(0, S.hp), temp = S.temp || 0, perso = S.riduzione || 0;
  const vuoto = Math.max(0, massimo(S) - hp - temp), tot = hp + temp + vuoto + perso || 1;
  const p = v => Math.round(v / tot * 1000) / 10;
  return { vita: p(hp), temp: p(temp), vuoto: p(vuoto), perso: p(perso) };
}
