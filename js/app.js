/* Avvio dell'app: apre l'archivio, controlla se su questo telefono qualcuno è già entrato,
   e decide quale schermata mostrare. */
import { CONFIG } from "./config.js";
import { creaArchivio } from "./archivio.js";
import { mostraProfili, nascondiProfili } from "./accesso.js";
import { apriScheda, chiudiScheda, datiIniziativa, datiAttacco, spendiSlot, inizioTurno, bersaglioPg, colpisciPg, usaRisorsa, consumaOggetto, curaPg, toast } from "./scheda.js";
import { avviaScontro, fermaScontro, mostraVista } from "./scontro.js";
import { profilo } from "./personaggi/index.js";
import { stemma } from "./stemmi.js";
import { impostaOpzioni } from "./campagna.js";

const $ = id => document.getElementById(id);
const arch = await creaArchivio(CONFIG);
let attivo = null;

let stopRegole = null;
function entraCome(id) {
  const p = profilo(id);
  if (!p) return mostraProfili(arch, entraCome);
  attivo = p; nascondiProfili();
  /* regole del tavolo decise dal master (per ora: opzioni del Calderone di Tasha) */
  if (stopRegole) stopRegole();
  stopRegole = arch.ascolta("campagna/impostazioni", d => impostaOpzioni(d), null, { anchePropri: true });
  if (p.personaggi.length) {
    apriScheda({ archivio: arch, personaggi: p.personaggi, onEsci: chiediUscita,
      scontro: { apri: () => mostraVista(true), chiudi: () => mostraVista(false) } });
    avviaScontro({ archivio: arch, profilo: p, datiIniziativa, datiAttacco, spendiSlot, inizioTurno, bersaglioPg, colpisciPg, usaRisorsa, consumaOggetto, curaPg, avvisa: toast });
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
