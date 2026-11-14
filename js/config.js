/* Impostazioni dell'app. È l'unico file da toccare per passare dalla prova locale a Firebase.

   modalita "locale":   i dati restano in questo browser (localStorage). Serve per provare senza account.
                        Due schede del browser aperte sulla stessa pagina si aggiornano a vicenda,
                        così puoi simulare due telefoni.
   modalita "firebase": i dati stanno su Firestore e arrivano in tempo reale a tutti i telefoni.

   Nota sulla sicurezza: i valori "firebase" qui sotto NON sono segreti. Finiscono comunque nel
   browser di chiunque apra l'app. A proteggere i dati sono le regole in firestore.rules. */
export const CONFIG = {
  modalita: "firebase",

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
