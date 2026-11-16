/* La terza sezione della barra in basso: "Profilo" per i giocatori, "Campagna" per il master.
   Qui stanno le cose che non servono durante il gioco: uscire dal profilo, le copie di sicurezza,
   le regole del tavolo e gli ultimi accessi (solo il master). */
import { PERSONAGGI } from "./personaggi/index.js";
import { opzioni, suOpzioni } from "./campagna.js";
import { versioni, rimetti, scaricaCopia, leggiCopia, ripristinaCopia, elencoAccessi } from "./copie.js";
import { ricaricaScheda } from "./scheda.js";

const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const quando = t => new Date(t).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const MOTIVI = { uso: "durante il gioco" };

let arch = null, P = null, dm = false, esci = () => {}, toast = () => {};
let scheda = null, lista = null, conferma = null, copia = null, accessi = null, occupato = false;

export function avviaAltro({ archivio, profilo, onEsci, avvisa }) {
  arch = archivio; P = profilo; dm = profilo.id === "dm"; esci = onEsci; toast = avvisa;
  scheda = null; lista = null; conferma = null; copia = null; accessi = null;
  suOpzioni(() => { if (!$("vistaAltro").hidden) disegna(); });
}
/** Si apre dalla barra in basso. */
export function mostraAltro() {
  disegna();
  if (dm) elencoAccessi().then(a => { accessi = a; disegna(); }).catch(() => {});
}

function disegna() {
  const el = $("vistaAltro"); if (!el || !P) return;
  el.innerHTML = dm ? htmlMaster() : htmlGiocatore();
}
/* uscire non sta più qui: si cambia profilo dall'avatar in alto a destra, in ogni schermata */
const uscire = () => "";
function htmlGiocatore() {
  return `<header class="testa-pagina"><h1>${esc(P.nome)}</h1>${P.sotto ? `<p>${esc(P.sotto)}</p>` : ""}</header>
    <section class="al-sez"><h2>Copie di sicurezza</h2>
      <p>La tua scheda si copia da sola mentre giochi: ogni mezz'ora, prima di salire di livello e a fine scontro.
        Le copie non si possono cancellare, nemmeno con il tuo PIN. Se qualcosa va storto, il master rimette una versione precedente.</p></section>
    ${uscire()}`;
}

function htmlMaster() {
  const voci = [...Object.keys(PERSONAGGI).map(k => [k, PERSONAGGI[k].name]), ["dm-bestiario", "Bestiario"]];
  return `<header class="testa-pagina"><h1>Campagna</h1><p>Copie di sicurezza, regole del tavolo, accessi</p></header>
    <section class="al-sez"><h2>Copie di sicurezza</h2>
      <p>Ogni scheda si copia da sola: ogni mezz'ora mentre si gioca, prima di salire di livello e a fine scontro. Nessuno può cancellare le copie, nemmeno con il PIN giusto.</p>
      <div class="al-azioni">
        <button class="btn up" data-al="scarica"${occupato ? " disabled" : ""}>Scarica una copia su file</button>
        <label class="btn">Ripristina da un file<input type="file" accept=".json,application/json" data-al-file hidden></label>
      </div>
      <p class="hint">Il file tienilo sul computer o su iCloud: contiene schede, bestiario e regole del tavolo. Fallo ogni tanto, per esempio a fine sessione.</p>
      ${copia ? `<div class="al-conferma" role="alert"><p><b>Ripristinare la copia del ${esc(quando(copia.creata))}?</b><br>
        Rimette ${copia.percorsi.length} documenti (schede, bestiario, regole). Lo scontro in corso non cambia. Prima di sovrascrivere, ogni scheda di adesso finisce nello storico.</p>
        <div class="al-azioni"><button class="btn" data-al="annulla-copia">Annulla</button><button class="btn up" data-al="ripristina"${occupato ? " disabled" : ""}>Ripristina</button></div></div>` : ""}
      <p class="lbl-sez">Versioni salvate</p>
      <div class="al-chips">${voci.map(([k, n]) => `<button class="chip${scheda === k ? " on" : ""}" data-al="scheda" data-k="${k}" aria-pressed="${scheda === k}">${esc(n)}</button>`).join("")}</div>
      ${scheda == null ? `<p class="hint">Tocca una scheda per vedere le sue copie.</p>`
        : lista == null ? `<p class="hint">Carico le copie…</p>`
        : !lista.length ? `<p class="hint">Ancora nessuna copia: si creano da sole mentre si gioca.</p>`
        : `<ul class="al-versioni">${lista.slice(0, 25).map((v, i) => `<li><span><b>${esc(quando(v.t))}</b><small>${esc(MOTIVI[v.motivo] || v.motivo)}${v.da ? ` · dal telefono di ${esc(v.da === "dm" ? "master" : v.da)}` : ""}${v.dati && v.dati.level ? ` · livello ${v.dati.level}` : ""}${v.dati && v.dati.hp != null ? ` · ${v.dati.hp} PF` : ""}</small></span>
            <button class="btn${conferma === i ? " rosso" : ""}" data-al="rimetti" data-i="${i}">${conferma === i ? "Tocca di nuovo per rimetterla" : "Rimetti"}</button></li>`).join("")}</ul>`}
    </section>
    <section class="al-sez"><h2>Regole del tavolo</h2>
      <label class="spunta"><input type="checkbox" data-al-reg="salitaLibera"${opzioni().salitaLibera ? " checked" : ""}> I giocatori salgono di livello da soli</label>
      <p class="hint">Spenta (la regola del vostro tavolo): il livello lo concedi tu dal Tavolo, e sui loro telefoni si apre il passaggio di livello. Accesa: il pulsante "Sali di livello" è sempre sulle loro schede.</p>
      <label class="spunta"><input type="checkbox" data-al-reg="tasha"${opzioni().tasha ? " checked" : ""}> Privilegi opzionali e talenti del Calderone di Tasha</label>
      <p class="hint">Valgono per tutti: nel passaggio di livello compaiono anche le opzioni di Tasha.</p>
      <label class="spunta"><input type="checkbox" data-al-reg="pozioniBonus"${opzioni().pozioniBonus ? " checked" : ""}> Bere una pozione da soli costa l'azione bonus</label>
      <p class="hint">Regola della casa molto usata. Spenta: bere una pozione costa un'azione, come nel Manuale del giocatore. Darla a un compagno costa sempre un'azione.</p>
      <label class="spunta"><input type="checkbox" data-al-reg="munizioniInfinite"${opzioni().munizioniInfinite ? " checked" : ""}> Munizioni comuni infinite</label>
      <p class="hint">La regola del vostro tavolo: frecce e quadrelli normali non si contano, si contano solo le munizioni speciali (d'argento, magiche…), ognuna con il suo nome. Spenta: si conta ogni munizione, come nel Manuale del giocatore.</p>
    </section>
    <section class="al-sez"><h2>Ultimi accessi</h2>
      ${!accessi ? `<p class="hint">Carico…</p>` : `<ul class="al-accessi">${accessi.map(a => `<li><b>${esc(a.nome)}</b>${a.lista.length
        ? `<span>${esc(quando(a.lista[0].t))} · ${esc(a.lista[0].da)}</span>${a.lista.length > 1 ? `<small>prima: ${a.lista.slice(1, 4).map(x => esc(quando(x.t))).join(", ")}</small>` : ""}`
        : `<span>mai entrato con questa versione dell'app</span>`}</li>`).join("")}</ul>
        <p class="hint">Se vedi un accesso che non torna, cambia il PIN di quel profilo dalla console di Firebase.</p>`}
    </section>
    ${uscire()}`;
}

/* ---------- tocchi ---------- */
document.addEventListener("click", async e => {
  const b = e.target.closest("#vistaAltro [data-al]"); if (!b || b.disabled) return;
  const az = b.dataset.al;
  try {
    if (az === "esci") return esci();
    if (az === "scheda") { scheda = b.dataset.k; lista = null; conferma = null; disegna(); lista = await versioni(scheda); return disegna(); }
    if (az === "rimetti") {
      const i = +b.dataset.i;
      if (conferma !== i) { conferma = i; return disegna(); }
      occupato = true; disegna();
      await rimetti(scheda, lista[i]);
      if (scheda !== "dm-bestiario") ricaricaScheda(scheda, lista[i].dati);   // anche questo telefono mostra subito la versione rimessa
      toast(`Rimessa la versione del ${quando(lista[i].t)}`, 5000);
      conferma = null; lista = await versioni(scheda);
    }
    if (az === "scarica") {
      occupato = true; disegna();
      const r = await scaricaCopia();
      toast(`Copia scaricata: ${r.nome}`, 6000);
    }
    if (az === "annulla-copia") copia = null;
    if (az === "ripristina" && copia) {
      occupato = true; disegna();
      const n = await ripristinaCopia(copia);
      Object.entries(copia.documenti).forEach(([p, d]) => { if (p.startsWith("personaggi/")) ricaricaScheda(p.slice(11), d); });
      copia = null; toast(`Ripristinati ${n} documenti`, 5000);
    }
  } catch (err) {
    toast(err && err.message && !/permission/i.test(err.message) ? err.message : "Non riuscito: controlla la connessione", 5000);
  } finally {
    occupato = false; disegna();
  }
});
document.addEventListener("change", async e => {
  const f = e.target.closest("#vistaAltro [data-al-file]");
  if (f && f.files[0]) {
    try { copia = await leggiCopia(f.files[0]); } catch (err) { toast(err.message, 5000); }
    f.value = ""; return disegna();
  }
  const r = e.target.closest("#vistaAltro [data-al-reg]");
  if (r) {
    try { await arch.scrivi("campagna/impostazioni", { ...opzioni(), [r.dataset.alReg]: r.checked }); toast("Regola del tavolo salvata"); }
    catch (_) { toast("Non salvato: controlla la connessione", 4000); r.checked = !r.checked; }
  }
});
