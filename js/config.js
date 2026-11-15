/* Impostazioni dell'app. È l'unico file da toccare per passare dalla prova locale a Firebase.

   modalita "locale":   i dati restano in questo browser (localStorage). Serve per provare senza account.
                        Due schede del browser aperte sulla stessa pagina si aggiornano a vicenda,
                        così puoi simulare due telefoni.
   modalita "firebase": i dati stanno su Firestore e arrivano in tempo reale a tutti i telefoni.

   Nota sulla sicurezza: i valori "firebase" qui sotto NON sono segreti. Finiscono comunque nel
   browser di chiunque apra l'app. A proteggere i dati sono le regole in firestore.rules. */
/* Aggiungendo ?prova all'indirizzo (http://localhost:8080/?prova) l'app usa la modalità locale
   con i PIN di prova: comodo per provare senza toccare i dati veri su Firebase. */
/* Altri interruttori per le prove, da aggiungere all'indirizzo (anche insieme: ?misura&robusto):
     ?misura → mostra quanto ci mette un tiro d'iniziativa ad arrivare (solo per le prove)
     ?robusto → Firebase usa un collegamento più vecchio ma più robusto ("long polling"),
               utile se qualche browser o rete frena quello normale */
const indirizzo = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const prova = indirizzo.has("prova");

export const CONFIG = {
  modalita: prova ? "locale" : "firebase",
  misura: indirizzo.has("misura"),
  collegamentoRobusto: indirizzo.has("robusto"),

  firebase: {
    apiKey: "AIzaSyCa0xYAIHHvK3jRJPmABdwwWpddvxnrWgY",
    authDomain: "tavolo-strahd.firebaseapp.com",
    projectId: "tavolo-strahd",
    appId: "1:813054865415:web:69546c79f5760e1f567aa2",
  },

  /* Ogni profilo è un utente Firebase con email <profilo>@<dominio> e il PIN come password.
     example.com è un dominio riservato agli esempi: nessuna email parte davvero. */
  dominioEmail: "example.com",

  /* PIN di PROVA, validi solo in modalita "locale". In Firebase i PIN veri li sceglie chi crea gli utenti. */
  pinLocali: { dm: "111111", rombosogliola: "222222", petrus: "333333", rex: "444444" },
};
