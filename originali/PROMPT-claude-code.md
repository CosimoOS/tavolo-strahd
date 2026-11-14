# Progetto: piattaforma di gioco per la nostra campagna di D&D

Ciao Claude. Voglio costruire con te una web app per il mio gruppo di Dungeons & Dragons. Non sono ancora un programmatore: è anche il mio primo progetto per imparare. Quindi lavora così:

- Parlami in italiano. L'interfaccia dell'app è in italiano.
- Prima di ogni fase dammi un piano breve e aspetta il mio ok. Spiegami il perché delle scelte, non solo il risultato.
- Se pensi che io stia sbagliando, dimmelo apertamente e argomenta.
- Chiedimi conferma prima di cancellare o sovrascrivere file, di creare account o servizi esterni e di spendere soldi.
- Spiega i passaggi tecnici in modo semplice, come a un principiante sveglio: cos'è un comando, dove si scrive, cosa fa.

## Cosa ti consegno

Nella cartella del progetto trovi:

- `scheda-attuale.html`: la dashboard che ho già, nata come artefatto di Claude. È un file unico con HTML, CSS e JS e contiene già due personaggi: Rombosogliola e Ireena. Riusala come base: grafica, regole e logica funzionano e mi piacciono.
- `dati-attuali.json`: lo stato attuale dei due personaggi (PF, risorse spuntate, inventario, monete, armi e così via), esportato dall'artefatto. Va importato nella nuova app.

Nell'HTML il salvataggio usa `window.claude.use("db")`, che esiste solo dentro gli artefatti di Claude. Va sostituito con un archivio vero (vedi sotto).

## Il gruppo

Giochiamo la campagna "La maledizione di Strahd", D&D 5e. I personaggi sono:

- **Rombosogliola**: il mio personaggio. Guerriero umano, sottoclasse Campione, livello 6, background nobile.
- **Ireena**: la controllo sempre io, insieme a Rombosogliola. È una seguace di classe Guerriero secondo le regole del "Calderone omnicomprensivo di Tasha", con ruolo marziale Attaccante, livello 6 e dadi vita d8.
- **Petrus**: ranger elfo, un altro giocatore. Ti darò la sua scheda.
- **Rex**: paladino, un altro giocatore. Ti darò la sua scheda.
- **DM**: il master, che conduce la sessione.

## L'idea

Ognuno apre l'app dal proprio telefono. All'ingresso c'è una schermata in stile Netflix con quattro profili: **DM**, **Rombosogliola** (con Ireena), **Petrus** e **Rex**. Si deve poter uscire e cambiare profilo.

Il problema che vogliamo risolvere: alcuni di noi sbagliano i conti, per esempio sui danni o sull'iniziativa. L'app fa i calcoli, ma **i dadi li tiriamo sempre al tavolo, dadi veri**. Regola fondamentale: **l'app non tira mai dadi al posto nostro.** Noi scriviamo il numero uscito e lei somma modificatori, bonus e il resto.

### Funzioni, in ordine di priorità

1. **Profili e schede.** Ogni profilo ha la sua scheda, come quella attuale. Ogni scheda riporta PF con barra orizzontale, Danno, Cura, PF temporanei e annulla, risorse da spuntare, attacchi con i valori calcolati, armatura e incantesimi degli oggetti, caratteristiche, abilità, condizioni, tiri contro morte, inventario con sintonia, monete, note e passaggio di livello automatico. Le regole di Ranger e Paladino vanno dal Manuale del Giocatore, come ho fatto per il Campione.
2. **Iniziativa e turni.** Il DM avvia un combattimento e su tutti i telefoni aperti compare "Tirate l'iniziativa". Ognuno scrive il d20 tirato al tavolo e l'app aggiunge il modificatore. Considera i casi speciali: Ireena ha vantaggio dal 7° livello, quindi si scrivono due dadi e si tiene il più alto. Poi l'app ordina tutti, giocatori e nemici; a parità vince la Destrezza più alta. Ne esce la scaletta dei turni, con il turno attivo evidenziato, il contatore dei round e il pulsante "Fine turno".
3. **Nemici del DM.** Preset di mostri con PF, CA e modificatore di iniziativa, creati e modificati dal DM. Per l'iniziativa il DM sceglie fra due logiche: **branco**, con un solo tiro per un gruppo uguale (per esempio i lupi), oppure **singoli**, con un tiro a testa (per esempio i licantropi che accompagnano i lupi). Il DM traccia i PF di ogni nemico. I giocatori vedono solo uno stato generico ("illeso", "ferito", "in fin di vita"), mai i numeri.
4. **Aiuto per colpire e per i danni.** Al proprio turno il giocatore scrive il d20 e l'app mostra il totale per colpire. Scrive la somma dei dadi di danno e l'app aggiunge i modificatori. Sul critico ricorda di raddoppiare i dadi, e quanti dadi in più tirare.

### Regola anti-spoiler

Non devo sapere niente della campagna che il master non ci abbia già detto. **Non leggere né usare il manuale della Maledizione di Strahd** per mostri, luoghi o trama. I mostri della campagna li inserisce il master dal suo profilo. Come esempio puoi usare solo creature generiche del Manuale del Giocatore, come il lupo dell'appendice D. I dati dei mostri del DM devono restare nascosti nell'interfaccia dei giocatori.

## Scelte tecniche (proponi tu, ma tieni conto di questo)

- **Nessun account Claude per gli altri.** I miei amici non hanno Claude, quindi l'app deve funzionare per tutti senza.
- **Archivio condiviso in tempo reale**, gratuito. Pensavo a Supabase (database con aggiornamenti in tempo reale) o a Firebase. Spiegami pro e contro e consigliamene uno.
- **Accesso semplice.** Un PIN per profilo basta, soprattutto per proteggere il profilo del DM. Siamo amici, non serve una sicurezza da banca, ma dimmi con chiarezza cosa protegge e cosa no.
- **Installabile sul telefono** come web app (PWA), con manifest, icona e service worker. Per l'icona userei lo stemma di Rombosogliola, o uno stemma del gruppo.
- **Pubblicazione gratuita** su Netlify, Vercel o GitHub Pages, con codice su GitHub.
- **Stack semplice da capire per un principiante.** Mantieni il più possibile il codice che già esiste. Se serve un framework, spiegami perché.
- Tutto deve funzionare bene **da telefono**, al tavolo, con una mano sola.

## Grafica

Il tema attuale mi piace molto e va mantenuto: l'armatura Cremesi, cioè rosso cremisi con finiture d'oro su fondo scuro da sala di pietra a lume di candela, con variante pergamena per il tema chiaro. Font: Cinzel per i titoli, Cormorant Garamond, Alegreya Sans per il testo, IBM Plex Mono per i numeri. Le caratteristiche sono scudi araldici e le risorse losanghe da spuntare.

Voglio che l'app sia funzionale e anche **bella da vedere**. Niente emoji. Ogni personaggio può avere il suo stemma e il suo accento di colore, dentro lo stesso stile.

Dettagli di interfaccia che ho già deciso e che vanno mantenuti:

- **Barra di comando.** Danno, Cura e PF temporanei stanno in una barra fissa in alto, a tutta larghezza, con i controlli allineati ai margini della pagina. Lo stato di salvataggio è un piccolo pallino colorato, non un testo sotto i pulsanti. L'annulla e i messaggi compaiono come un'etichetta che si appoggia sotto la barra.
- **Selettore di scheda.** È una pillola fissa in basso, sopra una sfumatura scura. Mostra i nomi e poi si riduce alle sole icone, con aree di tocco da 48 px.
- **Attacchi.** Sono ordinati dal danno medio più alto al più basso. Aggiungendo un oggetto all'equipaggiamento si può spuntare "è un'arma" e compilarla subito.
- **Barra dei PF.** È una fiala orizzontale di vetro: verde sopra la metà, ambra tra metà e un quarto, rossa e pulsante sotto un quarto.
- **Tiri contro la morte.** Cuori per i successi e teschi per i fallimenti.
- **Cose provate e scartate, da non riproporre.** Cornici ornate agli angoli, draghi araldici accanto allo stemma, bracieri, gemme al posto delle losanghe, icone nei titoli delle sezioni, note a pergamena, pulsante del livello a stendardo. Le risorse restano losanghe semplici, e la sintonia un piccolo rombo.

## Come procedere

1. **Prima di scrivere codice**: leggi `scheda-attuale.html` e `dati-attuali.json`, poi proponimi l'architettura (cartelle, stack, archivio, modello dei dati, accesso) e aspetta il mio ok.
2. **Fase 1**: profili, PIN e schede, con Rombosogliola e Ireena funzionanti e i dati importati. Petrus e Rex vengono quando ti mando le schede.
3. **Fase 2**: iniziativa e turni.
4. **Fase 3**: nemici del DM e preset.
5. **Fase 4**: aiuto per colpire e per i danni.
6. **Pubblicazione e installazione** sul telefono, spiegate passo passo.

Dopo ogni fase fammi provare l'app in locale, dimmi cosa controllare e fai i commit su git con messaggi chiari.
