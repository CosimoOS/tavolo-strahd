# Il tavolo

Schede e combattimento per la campagna di D&D del gruppo. L'app fa i conti; i dadi si tirano sempre al tavolo.

## Provarla sul computer

Apri il Terminale nella cartella del progetto e scrivi:

```bash
npm start
```

Poi apri <http://localhost:8080> nel browser. Per fermare il server premi `Ctrl+C` nel Terminale.

L'app usa Firebase: entri con i PIN veri e i dati sono quelli condivisi col gruppo.

Per provare senza toccare i dati veri apri <http://localhost:8080/?prova>: i dati restano solo in quel browser
e i PIN sono quelli di prova scritti in `js/config.js`. Due schede del browser aperte con `?prova` si parlano,
così puoi fare il master in una e il giocatore nell'altra.

Altri interruttori da aggiungere all'indirizzo, anche insieme (`?misura&robusto`):

- `?misura`: quando un giocatore manda l'iniziativa, il master vede quanto ci ha messo ad arrivare.
- `?robusto`: Firebase usa un collegamento più vecchio ma più robusto, utile se un browser
  (per esempio Brave con gli scudi attivi) frena quello normale.

## Il bestiario del master

I modelli dei nemici (CA, PF, attacchi, cosa fanno in combattimento) e i gruppi pronti stanno in
`privato/bestiario.json`. Quel file non viene mai pubblicato. Per caricarlo:
entra come **Master**, apri lo Scontro, tocca **Bestiario** e poi **Importa dal file**, scegli `privato/bestiario.json`.
Da quel momento i modelli sono su Firebase, nella zona che solo il master può leggere, e li ritrova su ogni suo telefono.
Importarlo di nuovo aggiorna i modelli con lo stesso nome e lascia gli altri.

## Test delle regole

```bash
npm test
```

## Dove sta cosa

| Cartella / file | Cosa contiene |
|---|---|
| `index.html` | L'unica pagina dell'app: profili, PIN, scheda |
| `css/` | Tema Cremesi (`tema.css`), scheda, profili, scontro |
| `js/app.js` | Avvio: decide quale schermata mostrare |
| `js/config.js` | Prova locale o Firebase; PIN di prova |
| `js/archivio.js` | L'unico file che parla col database |
| `js/accesso.js` | Schermata dei profili e tastierino del PIN |
| `js/scheda.js` | La scheda del personaggio |
| `js/scontro.js` | Iniziativa e turni, condivisi fra i telefoni |
| `js/attacco.js` | Attacco dal telefono: bersaglio, d20, esito deciso dal telefono del master, danni da applicare |
| `js/nemici.js` | Nemici e alleati del master: bestiario, scheda rapida di turno, PF |
| `privato/` | Il bestiario preparato dai manuali. **Non va su git** (è in `.gitignore`): si carica nell'app dal profilo del master |
| `js/personaggi/` | Le regole di ogni personaggio e l'elenco dei profili |
| `js/regole/` | Conti della 5e, funzioni pure provate dai test |
| `js/stemmi.js` | Gli stemmi in SVG |
| `firestore.rules` | Chi può leggere e scrivere cosa su Firebase |
| `strumenti/` | Server locale e pagina di importazione |
| `originali/` | La vecchia scheda e i dati esportati, intatti |
