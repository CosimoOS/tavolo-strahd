/* Lo zaino: sintonia, quantità, togliere un oggetto. Funzioni pure, provate da test/zaino.test.js.
   Un oggetto è il testo scritto nello zaino ("Torce ×10"); la sintonia ricorda quel testo, quindi quando
   la quantità cambia va aggiornata insieme. */
import { quantita, conQuantita } from "./base.js";

/** Quanti oggetti magici si possono tenere in sintonia (regola del manuale). */
export const SINTONIA_MAX = 3;

/** Mette o toglie la sintonia. esito: "messa", "tolta", oppure "piena" se ce ne sono già tre (e non cambia niente). */
export function cambiaSintonia(inSintonia, oggetto) {
  if (inSintonia.includes(oggetto)) return { inSintonia: inSintonia.filter(t => t !== oggetto), esito: "tolta" };
  if (inSintonia.length >= SINTONIA_MAX) return { inSintonia, esito: "piena" };
  return { inSintonia: [...inSintonia, oggetto], esito: "messa" };
}

/** Uno in più o uno in meno dell'oggetto al posto i; mai sotto uno (per toglierlo c'è togliOggetto). */
export function cambiaQuantita({ inv, inSintonia }, i, d) {
  const vecchio = inv[i], q = quantita(vecchio), nuovo = conQuantita(q.nome, Math.max(1, q.n + d));
  return { inv: inv.map((t, k) => k === i ? nuovo : t), inSintonia: inSintonia.map(t => t === vecchio ? nuovo : t) };
}

/** Toglie l'oggetto al posto i; la sua sintonia va via solo se non ne resta un altro uguale. tolto: il suo nome. */
export function togliOggetto({ inv, inSintonia }, i) {
  const t = inv[i], resto = inv.filter((_, k) => k !== i);
  return { inv: resto, inSintonia: resto.includes(t) ? inSintonia : inSintonia.filter(x => x !== t), tolto: rigaZaino(t, []).nome };
}

/** Cosa mostra la riga di un oggetto: il nome con la maiuscola, quanti sono, se è in sintonia. */
export function rigaZaino(t, inSintonia) {
  const q = quantita(t);
  return { nome: q.nome.charAt(0).toUpperCase() + q.nome.slice(1), n: q.n, sintonia: inSintonia.includes(t) };
}
