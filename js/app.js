/* Avvio dell'app: apre l'archivio, controlla se su questo telefono qualcuno è già entrato,
   e decide quale schermata mostrare. */
import { CONFIG } from "./config.js";
import { creaArchivio } from "./archivio.js";
import { mostraProfili, nascondiProfili } from "./accesso.js";
import { apriScheda, chiudiScheda, datiIniziativa, datiAttacco, spendiSlot, inizioTurno, bersaglioPg, colpisciPg, usaRisorsa, consumaOggetto, curaPg, pfDi, modificaScheda, usaMunizionePg, tornaIndietroPg, salvaVersioni, riepilogoPg, apriSchedaMaster, vaiSezione, toast } from "./scheda.js";
import { avviaTavolo, mostraTavolo } from "./tavolo.js";
import { avviaCopie, registraAccesso } from "./copie.js";
import { avviaAltro, mostraAltro } from "./altro.js";
import { avviaScontro, fermaScontro, mostraVista, statoScontroBreve, mostraBestiario } from "./scontro.js";
import { profilo } from "./personaggi/index.js";
import { stemma } from "./stemmi.js";
import { impostaOpzioni, opzioni } from "./campagna.js";

const $ = id => document.getElementById(id);
const arch = await creaArchivio(CONFIG);
/* sola lettura: una fascia sempre visibile, così non ci si dimentica che niente viene salvato */
if (CONFIG.solaLettura) {
  const f = document.createElement("div"); f.className = "fascia-lettura"; f.setAttribute("role", "status");
  f.textContent = "Sola lettura: l'app non salva niente. Serve solo per scaricare la copia.";
  document.body.appendChild(f);
}
let attivo = null;

let stopRegole = null;
function entraCome(id) {
  const p = profilo(id);
  if (!p) return mostraProfili(arch, entraCome);
  attivo = p; nascondiProfili();
  /* copie di sicurezza e registro degli accessi (il master li vede nella pagina Campagna) */
  avviaCopie({ archivio: arch, profilo: p });
  registraAccesso(p.id);
  /* regole del tavolo decise dal master (per ora: opzioni del Calderone di Tasha) */
  if (stopRegole) stopRegole();
  stopRegole = arch.ascolta("campagna/impostazioni", d => impostaOpzioni(d), null, { anchePropri: true });
  if (p.personaggi.length) {
    avviaAltro({ archivio: arch, profilo: p, onEsci: chiediUscita, avvisa: toast });
    avviaTavolo({ riepilogo: riepilogoPg, schede: () => p.personaggi, apriScheda: apriSchedaMaster, vai: vaiSezione, scontro: statoScontroBreve, tornaIndietro: k => { const l = tornaIndietroPg(k); if (l != null) toast(`Tornato al livello ${l}`); },
      salvaSalite: salite => arch.scrivi("campagna/impostazioni", { ...opzioni(), salite }).then(() => toast("Fatto: i giocatori vedono il passaggio di livello")).catch(() => toast("Non salvato: controlla la connessione", 4000)) });
    apriScheda({ archivio: arch, personaggi: p.personaggi, onEsci: chiediUscita, master: p.id === "dm", profilo: p,
      scontro: { apri: () => mostraVista(true), chiudi: () => mostraVista(false) }, altro: { apri: mostraAltro },
      tavolo: { apri: mostraTavolo }, bestiario: { apri: mostraBestiario } });
    avviaScontro({ archivio: arch, profilo: p, datiIniziativa, datiAttacco, spendiSlot, inizioTurno, bersaglioPg, colpisciPg, usaRisorsa, consumaOggetto, curaPg, pfDi, modificaScheda, usaMunizionePg,
      copia: () => salvaVersioni("fine scontro"), avvisa: toast });
  } else {
    $("aStemma").innerHTML = stemma(p.stemma, { piena: true });
    $("aNome").textContent = p.nome;
    $("aTesto").textContent = `La scheda di ${p.nome} arriverà presto.`;
    document.title = p.nome;
    $("vistaAttesa").hidden = false;
  }
}

function chiediUscita() {
  $("esciTxt").textContent = `Profilo attuale: ${attivo.nome}. Le modifiche sono già salvate; per rientrare servirà di nuovo il PIN.`;
  $("esciVeil").hidden = false; $("esciNo").focus();
}
async function esci() {
  $("esciVeil").hidden = true;
  fermaScontro();
  await chiudiScheda();
  $("vistaAttesa").hidden = true;
  await arch.esci(); attivo = null;
  mostraProfili(arch, entraCome);
}
$("esciNo").onclick = () => { $("esciVeil").hidden = true; };
$("esciSi").onclick = esci;
$("esciVeil").addEventListener("click", e => { if (e.target === $("esciVeil")) $("esciVeil").hidden = true; });
$("aEsci").onclick = esci;

/* service worker (sw.js): rende l'app installabile e la apre anche con poca rete */
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

const gia = await arch.profiloCorrente();
if (gia && profilo(gia)) entraCome(gia); else mostraProfili(arch, entraCome);
