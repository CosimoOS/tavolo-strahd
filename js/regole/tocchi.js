/* I tocchi sui comandi spenti. Funzioni pure, provate da test/tocchi.test.js.
   Un pulsante spento, sul telefono, non risponde al tocco: chi lo tocca non capisce se l'app ha sentito.
   Per questo js/schermo.js controlla dove cade il dito e, se sotto c'è un comando spento, lo dice con un avviso. */

/** Il tocco (x, y) cade dentro uno di questi rettangoli ({ left, top, right, bottom, width, height })?
    Restituisce il posto del primo, o -1. Un comando nascosto non ha misure e non conta. */
export function toccato(rettangoli, x, y) {
  return rettangoli.findIndex(r => r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
}

/** Cosa dire quando si tocca un comando spento; null se non c'è niente da dire.
    perche: il motivo scritto sul comando · scelto: è l'opzione già scelta di un gruppo · conferma: è il pulsante in fondo a una finestra */
export function avvisoSpento({ perche, scelto, conferma }) {
  if (scelto) return null;
  if (perche) return perche;
  return conferma ? "Prima completa quello che manca qui sopra" : "Adesso non si può usare";
}
