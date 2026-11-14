/* L'archivio: l'UNICO file che sa dove stanno i dati.
   Il resto dell'app usa solo queste cinque funzioni, uguali in entrambe le modalità:

     profiloCorrente()        → chi è già entrato su questo telefono (o null)
     entra(profilo, pin)      → controlla il PIN; se è sbagliato lancia un ErroreAccesso
     esci()
     ascolta(percorso, cb)    → chiama cb(dati, info) ora e a ogni cambiamento; restituisce la funzione per smettere
     ascoltaRaccolta(p, cb)   → come ascolta, ma per tutti i documenti di una raccolta: cb([{id, dati}])
     scrivi(percorso, dati)   → salva un documento intero
     aggiorna(percorso, campi)→ cambia solo alcuni campi di un documento che esiste già

   Opzione {anchePropri:true} di ascolta: avvisa anche delle modifiche fatte da questo telefono.
   La scheda non la usa (si aggiorna da sola), lo scontro sì (aspetta la conferma dall'archivio).

   Un "percorso" è tipo "personaggi/ireena": raccolta/documento, come cartella/file. */

export class ErroreAccesso extends Error {}

export async function creaArchivio(cfg) {
  return cfg.modalita === "firebase" ? archivioFirebase(cfg) : archivioLocale(cfg);
}

/* ---------------- modalità locale ---------------- */
function archivioLocale(cfg) {
  const PREF = "dnd:", CHIAVE_PROFILO = "dnd-profilo";
  const ascoltatori = new Map(), raccolte = new Map();
  const leggi = p => { try { const v = localStorage.getItem(PREF + p); return v ? JSON.parse(v) : null; } catch (_) { return null; } };
  /* l'evento "storage" arriva alle ALTRE schede del browser quando questa scrive: è il nostro "tempo reale" */
  const elenco = r => {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k.startsWith(PREF + r + "/")) continue;
      const id = k.slice(PREF.length + r.length + 1);
      if (!id.includes("/")) out.push({ id, dati: leggi(r + "/" + id) });
    }
    return out;
  };
  /* avvisa chi ascolta il documento p e chi ascolta la sua raccolta; propri=true se la modifica è di questa scheda */
  const avvisa = (p, propri) => {
    (ascoltatori.get(p) || []).forEach(a => { if (!propri || a.anchePropri) a.cb(leggi(p), { daCache: false }); });
    const r = p.slice(0, p.lastIndexOf("/"));
    (raccolte.get(r) || []).forEach(cb => cb(elenco(r)));
  };
  window.addEventListener("storage", e => {
    if (!e.key || !e.key.startsWith(PREF)) return;
    avvisa(e.key.slice(PREF.length), false);
  });
  return {
    modalita: "locale",
    async profiloCorrente() { try { return localStorage.getItem(CHIAVE_PROFILO); } catch (_) { return null; } },
    async entra(profilo, pin) {
      await new Promise(r => setTimeout(r, 200));
      if (cfg.pinLocali[profilo] !== pin) throw new ErroreAccesso("PIN errato");
      localStorage.setItem(CHIAVE_PROFILO, profilo);
    },
    async esci() { localStorage.removeItem(CHIAVE_PROFILO); },
    ascolta(p, cb, errore, { anchePropri = false } = {}) {
      if (!ascoltatori.has(p)) ascoltatori.set(p, new Set());
      const a = { cb, anchePropri };
      ascoltatori.get(p).add(a);
      setTimeout(() => cb(leggi(p), { daCache: false }), 0);
      return () => ascoltatori.get(p).delete(a);
    },
    ascoltaRaccolta(r, cb) {
      if (!raccolte.has(r)) raccolte.set(r, new Set());
      raccolte.get(r).add(cb);
      setTimeout(() => cb(elenco(r)), 0);
      return () => raccolte.get(r).delete(cb);
    },
    async scrivi(p, dati) { localStorage.setItem(PREF + p, JSON.stringify(dati)); avvisa(p, true); },
    async aggiorna(p, campi) {
      const v = leggi(p); if (!v) throw new Error("Documento assente: " + p);
      localStorage.setItem(PREF + p, JSON.stringify({ ...v, ...campi })); avvisa(p, true);
    },
  };
}

/* ---------------- modalità Firebase ----------------
   Le librerie di Firebase si scaricano da Google al momento, con import(): niente da installare. */
const V = "10.14.1", BASE = `https://www.gstatic.com/firebasejs/${V}/`;

async function archivioFirebase(cfg) {
  const [{ initializeApp }, A, F] = await Promise.all([
    import(BASE + "firebase-app.js"), import(BASE + "firebase-auth.js"), import(BASE + "firebase-firestore.js")]);
  const app = initializeApp(cfg.firebase);
  const auth = A.getAuth(app);
  /* cache sul telefono: la scheda si apre anche con rete scarsa, e si risincronizza quando torna */
  const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  const email = profilo => `${profilo}@${cfg.dominioEmail}`;
  const profiloDi = u => (u && u.email ? u.email.split("@")[0] : null);

  return {
    modalita: "firebase",
    profiloCorrente: () => new Promise(r => { const stop = A.onAuthStateChanged(auth, u => { stop(); r(profiloDi(u)); }); }),
    async entra(profilo, pin) {
      try { await A.signInWithEmailAndPassword(auth, email(profilo), pin); }
      catch (e) {
        const c = e && e.code;
        if (c === "auth/too-many-requests") throw new ErroreAccesso("Troppi tentativi: riprova tra qualche minuto");
        if (c === "auth/network-request-failed") throw new ErroreAccesso("Nessuna connessione");
        throw new ErroreAccesso("PIN errato");
      }
    },
    esci: () => A.signOut(auth),
    ascolta(p, cb, errore, { anchePropri = false } = {}) {
      return F.onSnapshot(F.doc(db, p), { includeMetadataChanges: false }, s => {
        if (s.metadata.hasPendingWrites && !anchePropri) return;   // eco di una modifica appena fatta da questo telefono
        cb(s.exists() ? s.data() : null, { daCache: s.metadata.fromCache });
      }, e => errore && errore(e));
    },
    ascoltaRaccolta(r, cb, errore) {
      return F.onSnapshot(F.collection(db, r), s => cb(s.docs.map(d => ({ id: d.id, dati: d.data() }))),
        e => errore && errore(e));
    },
    async scrivi(p, dati) {
      try { await F.setDoc(F.doc(db, p), dati); }
      catch (e) { if (e && e.code === "permission-denied") e.solaLettura = true; throw e; }
    },
    async aggiorna(p, campi) {
      try { await F.updateDoc(F.doc(db, p), campi); }
      catch (e) { if (e && e.code === "permission-denied") e.solaLettura = true; throw e; }
    },
  };
}
