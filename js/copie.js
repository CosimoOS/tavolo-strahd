/* Copie di sicurezza: perché non si perda niente.

   1. Storico automatico (storico/<scheda>/versioni/<ora>): ogni scheda si copia da sola al massimo ogni mezz'ora
      mentre la si usa, e sempre prima di salire di livello, a fine scontro e prima di un ripristino.
      Le regole di Firestore permettono solo di aggiungere copie: nessuno le può modificare o cancellare,
      nemmeno con il PIN giusto. Il master può rimettere una versione vecchia.
   2. Copia su file: il master scarica un file con tutto (schede, bestiario, regole) e lo può ripristinare.
   3. Ultimi accessi (accessi/<profilo>): ogni telefono lascia scritto quando è entrato; il master li vede. */
import { PERSONAGGI, PROFILI } from "./personaggi/index.js";

const OGNI = 30 * 60 * 1000;
const STORICO = id => `storico/${id}/versioni`;
let arch = null, chi = "";

export function avviaCopie({ archivio, profilo }) { arch = archivio; chi = profilo.id; }

/** Una copia nello storico. forza: subito; altrimenti solo se l'ultima di questo telefono ha più di mezz'ora. */
export async function versione(id, dati, motivo = "uso", forza = false) {
  if (!arch || !dati) return;
  const k = `dnd-versione:${id}`;
  let ultima = 0;
  try { ultima = +localStorage.getItem(k) || 0; } catch (_) {}
  if (!forza && Date.now() - ultima < OGNI) return;
  const t = Date.now();
  try {
    await arch.scrivi(`${STORICO(id)}/${t}`, { t, motivo, da: chi, dati: JSON.parse(JSON.stringify(dati)) });
    try { localStorage.setItem(k, String(t)); } catch (_) {}
  } catch (_) { /* senza rete riprova alla prossima occasione */ }
}

/** Le copie di una scheda (o del bestiario: "dm-bestiario"), dalla più recente. */
export async function versioni(id) {
  const l = await arch.leggiRaccolta(STORICO(id));
  return l.map(x => x.dati).filter(v => v && v.t).sort((a, b) => b.t - a.t);
}
const percorsoDi = id => id === "dm-bestiario" ? "dm/bestiario" : `personaggi/${id}`;
/** Rimette una versione: prima copia lo stato di adesso, così anche il ripristino si può annullare. */
export async function rimetti(id, v) {
  const p = percorsoDi(id), ora = await arch.leggi(p);
  if (ora) await versione(id, ora, "prima del ripristino", true);
  await arch.scrivi(p, v.dati);
}

/* ---------- copia su file ---------- */
const SCHEDE = () => Object.keys(PERSONAGGI);
const DA_COPIARE = () => [...SCHEDE().map(k => `personaggi/${k}`), "dm/bestiario", "dm/png", "campagna/impostazioni", "dm/campo", "scontro/attuale"];
/* nel ripristino lo scontro non si rimette: tornerebbe uno scontro vecchio */
const DA_RIPRISTINARE = p => !["dm/campo", "scontro/attuale"].includes(p);

/** Scarica sul telefono o sul computer un file con tutti i dati. */
export async function scaricaCopia() {
  const documenti = {};
  for (const p of DA_COPIARE()) { const d = await arch.leggi(p); if (d) documenti[p] = d; }
  const ora = new Date(), due = n => String(n).padStart(2, "0");
  const nome = `tavolo-copia-${ora.getFullYear()}-${due(ora.getMonth() + 1)}-${due(ora.getDate())}-${due(ora.getHours())}${due(ora.getMinutes())}.json`;
  const testo = JSON.stringify({ app: "tavolo", versione: 1, creata: ora.toISOString(), documenti }, null, 1);
  const url = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  return { nome, quanti: Object.keys(documenti).length };
}
/** Legge un file di copia: restituisce { creata, percorsi } oppure lancia un errore con un messaggio chiaro. */
export async function leggiCopia(file) {
  let c;
  try { c = JSON.parse(await file.text()); } catch (_) { throw new Error("Questo file non è una copia del tavolo"); }
  if (!c || c.app !== "tavolo" || !c.documenti) throw new Error("Questo file non è una copia del tavolo");
  return { creata: c.creata, documenti: c.documenti, percorsi: Object.keys(c.documenti).filter(DA_RIPRISTINARE) };
}
/** Ripristina una copia letta da file. Prima copia nello storico ogni scheda com'è adesso. */
export async function ripristinaCopia(copia) {
  for (const p of copia.percorsi) {
    const id = p.startsWith("personaggi/") ? p.slice(11) : p === "dm/bestiario" ? "dm-bestiario" : null;
    if (id) { const ora = await arch.leggi(p); if (ora) await versione(id, ora, "prima del ripristino da file", true); }
    await arch.scrivi(p, copia.documenti[p]);
  }
  return copia.percorsi.length;
}

/* ---------- ultimi accessi ---------- */
function dispositivo() {
  const u = navigator.userAgent || "";
  const cosa = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "altro";
  const browser = /CriOS|Chrome/.test(u) ? "Chrome" : /FxiOS|Firefox/.test(u) ? "Firefox" : /Safari/.test(u) ? "Safari" : "browser";
  const app = matchMedia("(display-mode: standalone)").matches || navigator.standalone ? " · app" : "";
  return `${cosa} · ${browser}${app}`;
}
/** All'ingresso: chi è entrato, quando e da cosa (gli ultimi 8). */
export async function registraAccesso(profiloId) {
  if (!arch) return;
  try {
    const prima = (await arch.leggi(`accessi/${profiloId}`)) || {};
    const lista = [{ t: Date.now(), da: dispositivo() }, ...(prima.lista || [])].slice(0, 8);
    await arch.scrivi(`accessi/${profiloId}`, { lista });
  } catch (_) {}
}
/** Per il master: gli accessi di ogni profilo. */
export async function elencoAccessi() {
  const out = [];
  for (const p of PROFILI) {
    let d = null;
    try { d = await arch.leggi(`accessi/${p.id}`); } catch (_) {}
    out.push({ id: p.id, nome: p.nome, lista: (d && d.lista) || [] });
  }
  return out;
}
