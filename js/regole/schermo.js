/* L'altezza vera dello schermo. Funzione pura, provata da test/schermo.test.js.

   Sull'iPhone, quando l'app è installata nella schermata Home, la pagina passa sotto la fascia con l'orologio ma
   Safari continua a contarla alta "schermo meno fascia". Finché una pagina è corta, gli elementi fissati in basso
   (la barra delle sezioni, gli avvisi, le finestre) si agganciano a quel fondo sbagliato e restano sollevati;
   nelle pagine lunghe tornano al posto giusto. Per questo la barra sembrava spostarsi da una scheda all'altra.
   Il rimedio: dire alla pagina di essere alta sempre almeno quanto lo schermo vero. */

/** L'altezza che la pagina deve coprire, in punti; null se non c'è niente da correggere.
    installata: l'app gira dalla schermata Home dell'iPhone · schermo, finestra: { w, h }
    sopra: quanto è alta la fascia con l'orologio quando la pagina ci passa sotto (0 se non ci passa) */
export function altezzaPiena({ installata, schermo, finestra, sopra = 0 }) {
  if (!installata) return null;
  /* lo schermo dell'iPhone dà sempre le misure "in piedi": girato, il lato da coprire è quello corto */
  const alto = finestra.w === schermo.w ? schermo.h : finestra.w === schermo.h ? schermo.w : null;
  if (alto == null) return null;
  /* il difetto ha una firma: la pagina passa sotto la fascia in alto e manca al massimo quella fascia.
     Se la pagina non ci passa sotto (un iPhone che la tiene sotto una fascia nera) o manca di più (una finestra
     ridotta), la finestra è davvero più corta e non c'è niente da correggere. */
  const manca = alto - finestra.h;
  return manca === 0 || (sopra > 0 && manca > 0 && manca <= sopra + 2) ? alto : null;
}
