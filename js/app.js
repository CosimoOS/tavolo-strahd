/* Avvio dell'app: apre l'archivio, controlla se su questo telefono qualcuno è già entrato,
   e decide quale schermata mostrare. */
import { CONFIG } from "./config.js";
import { creaArchivio } from "./archivio.js";
import { mostraProfili, nascondiProfili } from "./accesso.js";
import { apriScheda, chiudiScheda } from "./scheda.js";
import { profilo } from "./personaggi/index.js";
import { stemma } from "./stemmi.js";

const $ = id => document.getElementById(id);
const arch = await creaArchivio(CONFIG);
let attivo = null;

function entraCome(id) {
  const p = profilo(id);
  if (!p) return mostraProfili(arch, entraCome);
  attivo = p; nascondiProfili();
  if (p.personaggi.length) {
    apriScheda({ archivio: arch, personaggi: p.personaggi, onEsci: chiediUscita });
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
  await chiudiScheda();
  $("vistaAttesa").hidden = true;
  await arch.esci(); attivo = null;
  mostraProfili(arch, entraCome);
}
$("esciNo").onclick = () => { $("esciVeil").hidden = true; };
$("esciSi").onclick = esci;
$("esciVeil").addEventListener("click", e => { if (e.target === $("esciVeil")) $("esciVeil").hidden = true; });
$("aEsci").onclick = esci;

const gia = await arch.profiloCorrente();
if (gia && profilo(gia)) entraCome(gia); else mostraProfili(arch, entraCome);
