/* Schermata dei profili e tastierino del PIN. */
import { PROFILI, profilo } from "./personaggi/index.js";
import { stemma } from "./stemmi.js";

const $ = id => document.getElementById(id);
const LUNGHEZZA = 6;
let arch = null, scelto = null, cifre = "", dopoEntrata = () => {};

export function mostraProfili(archivio, onEntra) {
  arch = archivio; dopoEntrata = onEntra;
  document.title = "Il tavolo";
  $("pGriglia").innerHTML = PROFILI.map(p =>
    `<button class="pcard" data-profilo="${p.id}">${stemma(p.stemma, { piena: true })}<b>${p.nome}</b><small>${p.sotto}</small></button>`).join("");
  $("pModo").textContent = archivio.modalita === "locale"
    ? "Modalità di prova: i dati restano solo su questo dispositivo."
    : "";
  $("vistaProfili").hidden = false;
}
export function nascondiProfili() { $("vistaProfili").hidden = true; chiudiPin(); }

$("pGriglia").addEventListener("click", e => {
  const b = e.target.closest("[data-profilo]"); if (!b) return;
  apriPin(b.dataset.profilo);
});

/* ---------- PIN ---------- */
function apriPin(id) {
  scelto = profilo(id); cifre = "";
  $("pinNome").textContent = scelto.nome;
  $("pinStemma").innerHTML = stemma(scelto.stemma, { piena: true });
  messaggio("Scrivi il PIN a sei cifre");
  disegnaPallini(); $("pinVeil").hidden = false;
}
function chiudiPin() { $("pinVeil").hidden = true; cifre = ""; $("pinPad").removeAttribute("aria-busy"); }
function disegnaPallini() { [...$("pinDots").children].forEach((d, i) => d.classList.toggle("on", i < cifre.length)); }
function messaggio(t, errore) { $("pinMsg").textContent = t; $("pinMsg").classList.toggle("err", !!errore); }

async function prova() {
  $("pinPad").setAttribute("aria-busy", "true"); messaggio("Controllo…");
  try {
    await arch.entra(scelto.id, cifre);
    const id = scelto.id; chiudiPin(); dopoEntrata(id);
  } catch (e) {
    cifre = ""; disegnaPallini(); $("pinPad").removeAttribute("aria-busy");
    messaggio(e.message || "Non riesco a entrare", true);
    const d = $("pinDots"); d.classList.remove("err"); void d.offsetWidth; d.classList.add("err");
    if (navigator.vibrate) navigator.vibrate(120);
  }
}
function premi(n) {
  if (cifre.length >= LUNGHEZZA || $("pinPad").hasAttribute("aria-busy")) return;
  cifre += n; disegnaPallini();
  if (cifre.length === LUNGHEZZA) prova();
}
$("pinPad").addEventListener("click", e => { const b = e.target.closest("[data-n]"); if (b) premi(b.dataset.n); });
$("pinCanc").onclick = () => { cifre = cifre.slice(0, -1); disegnaPallini(); messaggio("Scrivi il PIN a sei cifre"); };
$("pinAnnulla").onclick = chiudiPin;
$("pinVeil").addEventListener("click", e => { if (e.target === $("pinVeil")) chiudiPin(); });
/* dal computer si può anche scrivere con la tastiera */
document.addEventListener("keydown", e => {
  if ($("pinVeil").hidden) return;
  if (/^[0-9]$/.test(e.key)) premi(e.key);
  else if (e.key === "Backspace") $("pinCanc").click();
  else if (e.key === "Escape") chiudiPin();
});
