/* Test dello scontro a tutto schermo dei giocatori: quando c'è uno scontro il telefono mostra quello, e basta. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { schermoBattaglia, tornaAlloScontro } from "../js/regole/battaglia.js";

test("giocatore dentro lo scontro: niente barra delle sezioni, solo il pulsante per sbirciare la scheda", () => {
  assert.deepEqual(schermoBattaglia({ master: false, inScontro: true, vista: true }), { barra: false, voceScontro: false, sbircia: true });
});

test("giocatore che sbircia la scheda durante lo scontro: torna la barra, ma senza la voce Scontro", () => {
  assert.deepEqual(schermoBattaglia({ master: false, inScontro: true, vista: false }), { barra: true, voceScontro: false, sbircia: false });
});

test("giocatore senza scontro: la barra normale, senza la voce Scontro", () => {
  assert.deepEqual(schermoBattaglia({ master: false, inScontro: false, vista: false }), { barra: true, voceScontro: false, sbircia: false });
});

test("il master tiene sempre la sua barra con la voce Scontro", () => {
  assert.deepEqual(schermoBattaglia({ master: true, inScontro: true, vista: true }), { barra: true, voceScontro: true, sbircia: false });
});

test("quando comincia il mio turno e sto guardando la scheda, il telefono torna allo scontro", () => {
  assert.equal(tornaAlloScontro({ mioTurno: true, eraMioTurno: false, vista: false }), true);
});

test("a turno già iniziato sono libero di guardare la scheda: non mi riporta indietro di continuo", () => {
  assert.equal(tornaAlloScontro({ mioTurno: true, eraMioTurno: true, vista: false }), false);
});

test("se sono già nello scontro, o non tocca a me, non c'è niente da fare", () => {
  assert.equal(tornaAlloScontro({ mioTurno: true, eraMioTurno: false, vista: true }), false);
  assert.equal(tornaAlloScontro({ mioTurno: false, eraMioTurno: false, vista: false }), false);
});

import { testoColpito } from "../js/regole/battaglia.js";

test("colpito: il numero dei danni, chi ti ha colpito e quanti PF ti restano", () => {
  assert.deepEqual(testoColpito({ da: "Lupo 1", n: 18, restano: 34, massimo: 52 }),
    { numero: "−18", frase: "Lupo 1 ti ha colpito", sotto: "Ti restano 34 PF su 52" });
});

test("colpito: chi gioca due personaggi legge il nome di quello colpito", () => {
  assert.equal(testoColpito({ da: "Lupo 1", n: 7, restano: 38, massimo: 45, nome: "Ireena" }).frase, "Lupo 1 ha colpito Ireena");
});

test("colpito e a zero: la finestra dice che sei a terra", () => {
  assert.equal(testoColpito({ da: "Lupo 1", n: 40, restano: 0, massimo: 52 }).sotto, "Sei a terra: 0 PF");
});
