/* Service worker: un piccolo programma che il telefono tiene accanto all'app.
   Fa due cose:
   1. permette di "installare" l'app sulla schermata Home (serve per avere l'icona e lo schermo intero);
   2. tiene una copia dei file, così l'app si apre anche con il segnale debole.

   Strategia: per i file dell'app prima la rete (così un aggiornamento arriva subito) e, se la rete manca,
   la copia salvata. Le librerie di Firebase e i caratteri di Google hanno l'indirizzo con la versione,
   quindi non cambiano mai: per quelli prima la copia. I dati (Firestore) non passano mai di qui. */
const VERSIONE = "tavolo-v24";
const FILE = [
  "./", "index.html", "manifest.webmanifest",
  "css/tema.css", "css/scheda.css", "css/profili.css", "css/scontro.css", "css/nemici.css", "css/attacco.css", "css/passi.css", "css/altro.css", "css/vetro.css",
  "js/app.js", "js/config.js", "js/archivio.js", "js/accesso.js", "js/scheda.js", "js/scontro.js", "js/nemici.js",
  "js/attacco.js", "js/passi.js", "js/stemmi.js", "js/campagna.js",
  "js/classi/index.js", "js/classi/componi.js", "js/classi/comune.js", "js/classi/guerriero.js", "js/classi/paladino.js",
  "js/classi/ranger.js", "js/classi/seguace-guerriero.js", "js/classi/druido.js", "js/personaggi/petrus.js", "js/regole/talenti.js", "js/regole/stili.js", "js/regole/magia.js", "js/regole/turno.js", "js/regole/pf.js", "js/regole/effetti.js", "js/regole/livelli.js", "js/regole/multiclasse.js", "js/regole/munizioni.js", "js/barrapf.js", "js/icone.js", "js/copie.js", "js/altro.js", "js/tavolo.js", "js/personaggi/index.js", "js/personaggi/rombosogliola.js", "js/personaggi/ireena.js",
  "js/personaggi/rex.js", "js/regole/base.js", "js/regole/combattimento.js", "js/regole/nemici.js", "js/regole/attacco.js",
  "icone/icona-192.png", "icone/icona-512.png", "icone/apple-touch-icon.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSIONE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  /* librerie e caratteri con la versione nell'indirizzo: prima la copia */
  if (u.hostname === "www.gstatic.com" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { const copia = res.clone(); caches.open(VERSIONE).then(x => x.put(r, copia)); return res; })));
    return;
  }
  if (u.origin !== self.location.origin) return;            // Firebase e il resto: direttamente in rete
  if (u.pathname.includes("/privato/")) return;             // il bestiario privato non si tiene in copia
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(VERSIONE).then(x => x.put(r, copia)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(c => c || caches.match("index.html"))));
});
