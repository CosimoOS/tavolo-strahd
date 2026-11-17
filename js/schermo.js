/* Lo schermo dell'iPhone: tiene la pagina alta quanto lo schermo vero (vedi js/regole/schermo.js) e sa leggere
   le misure, per capire da una foto perché qualcosa finisce nel posto sbagliato. */
import { altezzaPiena } from "./regole/schermo.js";
import { toccato, avvisoSpento } from "./regole/tocchi.js";

const radice = document.documentElement;

/** Rifà il conto: all'avvio, quando il telefono gira, quando l'app torna in primo piano. */
export function correggiAltezza() {
  const alto = altezzaPiena({ installata: navigator.standalone === true,
    schermo: { w: screen.width, h: screen.height }, finestra: { w: innerWidth, h: innerHeight }, sopra: marginiSicuri().sopra });
  if (alto) radice.style.setProperty("--alto", alto + "px"); else radice.style.removeProperty("--alto");
  radice.classList.toggle("alto-pieno", !!alto);
  return alto;
}
export function avviaSchermo() {
  correggiAltezza();
  ["resize", "orientationchange", "pageshow"].forEach(ev => addEventListener(ev, correggiAltezza));
  /* sull'iPhone lo stato "premuto" dei pulsanti (:active) si accende solo se la pagina ascolta i tocchi */
  document.addEventListener("touchstart", () => {}, { passive: true });
}

/** I margini che il telefono chiede di lasciare liberi (la fascia con l'orologio, la riga di casa). */
function marginiSicuri() {
  const s = document.createElement("div");
  s.style.cssText = "position:fixed;visibility:hidden;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)";
  document.body.appendChild(s);
  const c = getComputedStyle(s), m = { sopra: parseFloat(c.paddingTop) || 0, sotto: parseFloat(c.paddingBottom) || 0 };
  s.remove();
  return m;
}

/** Le misure dello schermo, una riga per voce: si leggono da una foto. */
export function misure() {
  const n = v => Math.round(v * 10) / 10, vv = window.visualViewport, m = marginiSicuri();
  const barra = document.getElementById("barra")?.getBoundingClientRect();
  const sistema = (navigator.userAgent.match(/(iPhone|iPad|Android|Mac OS X)[^;)]*/) || ["?"])[0];
  return [
    `Schermo ${screen.width} × ${screen.height}`,
    `Finestra ${innerWidth} × ${innerHeight}`,
    `Pagina ${radice.clientWidth} × ${radice.clientHeight}, contenuto alto ${radice.scrollHeight}`,
    vv ? `Vista ${n(vv.width)} × ${n(vv.height)}, spostata di ${n(vv.offsetTop)}, scorsa di ${n(scrollY)}` : "Vista: non disponibile",
    `Margini liberi: sopra ${n(m.sopra)}, sotto ${n(m.sotto)}`,
    barra ? `Barra: da ${n(barra.top)} a ${n(barra.bottom)}` : "Barra: non c'è",
    `Installata: ${navigator.standalone === true ? "sì" : "no"} · altezza corretta: ${radice.style.getPropertyValue("--alto") || "no"}`,
    sistema,
  ];
}

/** Sul telefono un comando spento non sente il tocco: qui si guarda dove cade il dito e, se sotto c'è un comando
    spento, si dice perché (il motivo è scritto sul comando, in data-perche). Così ogni tocco ha una risposta.
    Il CSS toglie ai comandi spenti i tocchi (pointer-events:none): il tocco arriva a quello che c'è sotto e passa di qui. */
export function avviaTocchi(avvisa) {
  if (!matchMedia("(hover:none) and (pointer:coarse)").matches) return;
  document.addEventListener("click", e => {
    const spenti = [...document.querySelectorAll("button:disabled")];
    const i = toccato(spenti.map(b => b.getBoundingClientRect()), e.clientX, e.clientY);
    if (i < 0) return;
    /* se sopra c'è una finestra, il comando spento non è quello che si vede: il tocco è per la finestra */
    const b = spenti[i], sotto = document.elementFromPoint(e.clientX, e.clientY);
    if (!sotto || !sotto.contains(b)) return;
    e.stopPropagation(); e.preventDefault();
    const testo = avvisoSpento({ perche: b.dataset.perche, scelto: b.getAttribute("aria-pressed") === "true", conferma: !!b.closest(".fondo, .foot") });
    if (testo) avvisa(testo);
  }, true);
}
