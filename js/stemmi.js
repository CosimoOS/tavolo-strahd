/* Stemmi araldici dei profili e dei personaggi, disegnati in SVG (grafica vettoriale: nitida a ogni dimensione).
   Ogni stemma ha una forma, due colori di fondo (chiaro e scuro) e un emblema.
   stemma("pesce", { piena: true }) → con sfumature e doppia cornice, per la testata e i profili.
   stemma("pesce")                  → versione piatta e leggera, per il selettore in basso. */

const ROMBO = "M50 3 L97 59 L50 115 L3 59 Z";
const ROMBO_INT = "M50 16 L86 59 L50 102 L14 59 Z";
const SCUDO = "M8 5 H92 V56 C92 84 72 103 50 114 C28 103 8 84 8 56 Z";
const SCUDO_INT = "M18 15 H82 V56 C82 78 66 93 50 102 C34 93 18 78 18 56 Z";

const lettera = (t, size = 46, y = 74) => oro =>
  `<text x="50" y="${y}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="900" font-size="${size}" fill="${oro}">${t}</text>`;

const STEMMI = {
  pesce: {
    forma: ROMBO, interna: ROMBO_INT, fondo: ["#c22d43", "#5c0f1c"], piatto: "#8e1a2c",
    emblema: (oro, piena) => `<g transform="translate(-3.5 -1)"><path d="M30 60 C36 44 58 42 68 54 L77 47 L75 60 L77 73 L68 66 C58 78 36 76 30 60 Z" fill="${oro}"/>` +
      (piena ? `<circle cx="38" cy="56" r="2.4" fill="#5c0f1c"/><path d="M44 60 C50 57 56 57 62 60 M44 64 C50 61 56 61 62 64" stroke="#7a5418" stroke-width="1.2" fill="none"/>` : "") + `</g>`,
  },
  I: { forma: ROMBO, interna: ROMBO_INT, fondo: ["#c22d43", "#5c0f1c"], piatto: "#8e1a2c", emblema: lettera("I", 42, 73) },
  P: { forma: SCUDO, interna: SCUDO_INT, fondo: ["#3f7a4d", "#173521"], piatto: "#24502f", emblema: lettera("P", 44, 70) },
  R: { forma: SCUDO, interna: SCUDO_INT, fondo: ["#3d5f9e", "#152645"], piatto: "#22396a", emblema: lettera("R", 44, 70) },
  dm: {
    forma: SCUDO, interna: SCUDO_INT, fondo: ["#3a3038", "#120e12"], piatto: "#231c23",
    /* un occhio aperto: il master vede tutto */
    emblema: oro => `<path d="M24 56 C34 40 66 40 76 56 C66 72 34 72 24 56 Z" fill="none" stroke="${oro}" stroke-width="4"/>` +
      `<circle cx="50" cy="56" r="8.5" fill="${oro}"/><circle cx="50" cy="56" r="3" fill="#120e12"/>`,
  },
};

let uid = 0;
export function stemma(tipo, { piena = false, classe = "" } = {}) {
  const s = STEMMI[tipo] || STEMMI.dm;
  const cls = classe ? ` class="${classe}"` : "";
  if (!piena) {
    return `<svg${cls} viewBox="0 0 100 118" aria-hidden="true"><path d="${s.forma}" fill="${s.piatto}" stroke="#d4ad5f" stroke-width="7"/>${s.emblema("#e8c77a", false)}</svg>`;
  }
  const n = ++uid, c = `sc${n}`, g = `sg${n}`;
  return `<svg${cls} viewBox="0 0 100 118" aria-hidden="true"><defs>` +
    `<linearGradient id="${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.fondo[0]}"/><stop offset="1" stop-color="${s.fondo[1]}"/></linearGradient>` +
    `<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d58e"/><stop offset="1" stop-color="#a47a2c"/></linearGradient></defs>` +
    `<path d="${s.forma}" fill="url(#${c})" stroke="url(#${g})" stroke-width="4"/>` +
    `<path d="${s.interna}" fill="none" stroke="url(#${g})" stroke-width="1.2" opacity=".7"/>` +
    s.emblema(`url(#${g})`, true) + `</svg>`;
}
