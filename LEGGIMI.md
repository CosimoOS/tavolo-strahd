# Il tavolo

Schede e combattimento per la campagna di D&D del gruppo. L'app fa i conti; i dadi si tirano sempre al tavolo.

## Provarla sul computer

Apri il Terminale nella cartella del progetto e scrivi:

```bash
npm start
```

Poi apri <http://localhost:8080> nel browser. Per fermare il server premi `Ctrl+C` nel Terminale.

La prima volta, per caricare i dati della vecchia scheda, apri <http://localhost:8080/strumenti/importa.html>.

## Test delle regole

```bash
npm test
```

## Dove sta cosa

| Cartella / file | Cosa contiene |
|---|---|
| `index.html` | L'unica pagina dell'app: profili, PIN, scheda |
| `css/` | Tema Cremesi (`tema.css`), scheda, profili |
| `js/app.js` | Avvio: decide quale schermata mostrare |
| `js/config.js` | Prova locale o Firebase; PIN di prova |
| `js/archivio.js` | L'unico file che parla col database |
| `js/accesso.js` | Schermata dei profili e tastierino del PIN |
| `js/scheda.js` | La scheda del personaggio |
| `js/personaggi/` | Le regole di ogni personaggio e l'elenco dei profili |
| `js/regole/` | Conti della 5e, funzioni pure provate dai test |
| `js/stemmi.js` | Gli stemmi in SVG |
| `firestore.rules` | Chi può leggere e scrivere cosa su Firebase |
| `strumenti/` | Server locale e pagina di importazione |
| `originali/` | La vecchia scheda e i dati esportati, intatti |
