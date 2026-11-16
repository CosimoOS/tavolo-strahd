/* Il Tavolo: la casa del master. Lo scontro in corso, tutto il gruppo a colpo d'occhio
   (PF, CA, condizioni, concentrazione) e gli strumenti. Toccando un personaggio si apre la sua scheda,
   con in cima "vista del master" e "‹ Tavolo" per tornare. */
import { avatar } from "./stemmi.js";
import { htmlBarraPf } from "./barrapf.js";
import { opzioni, suOpzioni } from "./campagna.js";
import { concedi, revoca, inAttesa } from "./regole/livelli.js";

const $ = id => document.getElementById(id);
function esc(t) { const e = document.createElement("span"); e.textContent = t ?? ""; return e.innerHTML; }
const FRECCIA = `<svg class="freccia" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

let D = { riepilogo: () => null, schede: () => [], apriScheda: () => {}, vai: () => {}, scontro: () => null, salvaSalite: async () => {}, tornaIndietro: () => null };
let sal = null, armato = null;   // armato: il personaggio che al secondo tocco torna indietro di un livello
let tArmato = null;   // il master sta scegliendo chi sale di livello: gli id spuntati
export function avviaTavolo(dati) { D = { ...D, ...dati }; }
export function mostraTavolo() { disegna(); }

function cartaScontro(sc) {
  if (!sc) return `<section class="tav-scontro calmo"><span class="riga-t"><b>Nessuno scontro</b><small>Quando serve, scegli chi combatte e chiedi l'iniziativa</small></span>
    <button class="bv oro" data-tav="scontro" type="button">Prepara uno scontro</button></section>`;
  const sotto = sc.stato === "tiri" ? "Si sta tirando l'iniziativa" : `Round ${sc.round}${sc.chi ? ` · tocca a ${sc.chi}` : ""}`;
  return `<section class="tav-scontro"><span class="riga-t"><b>Scontro in corso</b><small>${sotto}</small></span>
    <button class="bv oro" data-tav="scontro" type="button">Apri lo scontro</button></section>`;
}
function cartaPg(r) {
  const classe = /\d/.test(r.classe) ? r.classe : `${r.classe} ${r.livello}`;
  const etichetta = r.hp === 0 ? `<span class="tav-stato male">a terra</span>`
    : r.conds.length ? `<span class="tav-stato male">${esc(r.conds.slice(0, 2).join(", ").toLowerCase())}</span>`
    : r.conc ? `<span class="tav-stato conc">concentrazione: ${esc(r.conc)}</span>` : `<span class="tav-stato">nessuna condizione</span>`;
  return `<button class="tav-pg" data-pg="${r.id}" type="button" aria-label="Apri la scheda di ${esc(r.nome)}">
    <span class="tav-pg-testa">${avatar(r.stemma)}<span><b>${esc(r.nome)}</b><small>${esc(classe)}</small></span></span>
    ${htmlBarraPf(r)}
    <span class="tav-pg-num"><span><b>${r.hp}</b>${r.temp ? `<em class="pf-piu">+${r.temp}</em>` : ""}/${r.max} PF</span><span>CA <b>${r.ca}</b></span></span>${etichetta}</button>`;
}
/* I livelli li concede il master: sceglie chi sale, sui loro telefoni si apre il passaggio di livello.
   Finché non hanno fatto le loro scelte restano "in attesa" e il via si può togliere. */
function cartaLivelli(gruppo) {
  if (opzioni().salitaLibera) return `<section class="tav-livelli"><p class="hint">I giocatori salgono di livello da soli: l'hai deciso in Campagna → Regole del tavolo.</p></section>`;
  const schede = gruppo.map(r => ({ id: r.id, livello: r.livello })), attesa = inAttesa(opzioni().salite, schede), nome = id => gruppo.find(r => r.id === id).nome;
  if (sal) return `<section class="tav-livelli"><p class="vuoto">Chi sale di livello? Sui loro telefoni si aprirà il passaggio di livello.</p>
    <ul class="scelta">${gruppo.map(r => `<li><label><input type="checkbox" data-sal="${r.id}"${sal.has(r.id) ? " checked" : ""}${r.livello >= 20 ? " disabled" : ""}>
      <span>${esc(r.nome)}</span><small>livello ${r.livello} → ${Math.min(20, r.livello + 1)}</small></label></li>`).join("")}</ul>
    <div class="tav-liv-azioni"><button class="bv" data-liv="no" type="button">Annulla</button><button class="bv oro" data-liv="ok" type="button">Dai il via</button></div></section>`;
  return `<section class="tav-livelli">${attesa.length ? `<p class="tav-attesa"><b>Devono ancora salire:</b> ${attesa.map(id => `<button class="chip on" data-liv-togli="${id}" type="button" aria-label="Togli il via a ${esc(nome(id))}">${esc(nome(id))} ×</button>`).join("")}</p>
      <p class="hint">Tocca un nome per togliergli il via.</p>` : `<p class="vuoto">Decidi tu quando il gruppo sale di livello.</p>`}
    <button class="bv oro" data-liv="apri" type="button">Fai salire di livello</button>
    ${gruppo.some(r => r.tornaA != null) ? `<p class="tav-torna"><b>Un errore?</b> ${gruppo.filter(r => r.tornaA != null).map(r => `<button class="chip${armato === r.id ? " on" : ""}" data-liv-indietro="${r.id}" type="button">${armato === r.id ? `Tocca di nuovo: ${esc(r.nome)} torna al ${r.tornaA}` : `${esc(r.nome)}: torna al ${r.tornaA}`}</button>`).join("")}</p>
      <p class="hint">Fa tornare indietro di un livello, anche più volte. Se deve risalire, ridagli il via.</p>` : ""}</section>`;
}
function disegna() {
  const el = $("vistaTavolo"); if (!el || el.hidden) return;
  const gruppo = D.schede().map(D.riepilogo).filter(Boolean);
  el.innerHTML = `<header class="testa-pagina"><h1>Tavolo</h1><p>La maledizione di Strahd · <b>sei il master</b></p></header>
    ${cartaScontro(D.scontro())}
    <h2 class="sez">Il gruppo <span>tocca per aprire la scheda</span></h2>
    <div class="tav-gruppo">${gruppo.map(cartaPg).join("")}</div>
    <h2 class="sez">Livelli</h2>
    ${cartaLivelli(gruppo)}
    <h2 class="sez">Strumenti</h2>
    <section class="lista tav-strumenti">
      <button class="riga" data-tav="bestiario" type="button"><span class="riga-t"><b>Bestiario</b><small>mostri e persone, per preparare gli scontri</small></span>${FRECCIA}</button>
      <button class="riga" data-tav="altro" type="button"><span class="riga-t"><b>Copie di sicurezza</b><small>storico delle schede e copia su file</small></span>${FRECCIA}</button>
      <button class="riga" data-tav="altro" type="button"><span class="riga-t"><b>Regole del tavolo e accessi</b><small>Tasha, pozioni, chi è entrato</small></span>${FRECCIA}</button>
    </section>`;
}
document.addEventListener("click", e => {
  const el = $("vistaTavolo"); if (!el || el.hidden || !el.contains(e.target)) return;
  const pg = e.target.closest("[data-pg]"); if (pg) { D.apriScheda(pg.dataset.pg); return; }
  const gruppo = () => D.schede().map(D.riepilogo).filter(Boolean);
  const liv = e.target.closest("[data-liv]");
  if (liv) {
    const cosa = liv.dataset.liv;
    if (cosa === "apri") sal = new Set(gruppo().filter(r => r.livello < 20).map(r => r.id));
    else if (cosa === "no") sal = null;
    else if (cosa === "ok") {
      const scelti = gruppo().filter(r => sal.has(r.id)).map(r => ({ id: r.id, livello: r.livello })); sal = null;
      if (scelti.length) D.salvaSalite(concedi(opzioni().salite, scelti));
    }
    disegna(); return;
  }
  const ind = e.target.closest("[data-liv-indietro]");
  if (ind) {   /* due tocchi, per non farlo per sbaglio */
    const id = ind.dataset.livIndietro; clearTimeout(tArmato);
    if (armato === id) { armato = null; D.tornaIndietro(id); }
    else { armato = id; tArmato = setTimeout(() => { armato = null; disegna(); }, 4000); }
    disegna(); return;
  }
  const togli = e.target.closest("[data-liv-togli]");
  if (togli) { D.salvaSalite(revoca(opzioni().salite, togli.dataset.livTogli)); return; }
  const t = e.target.closest("[data-tav]"); if (t) D.vai(t.dataset.tav);
});
/* le schede cambiano (PF, condizioni) o lo scontro va avanti: il Tavolo si aggiorna da solo */
document.addEventListener("schede:cambiate", disegna);
document.addEventListener("scontro:cambiato", disegna);
suOpzioni(disegna);
document.addEventListener("change", e => { const c = e.target.closest("#vistaTavolo [data-sal]"); if (c && sal) { c.checked ? sal.add(c.dataset.sal) : sal.delete(c.dataset.sal); } });
