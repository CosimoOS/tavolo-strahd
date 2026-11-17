/* Test dei tocchi: ogni tocco deve avere una risposta, anche quello su un comando spento. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { toccato, avvisoSpento } from "../js/regole/tocchi.js";

const r = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });

test("il tocco dentro un comando lo trova", () => {
  assert.equal(toccato([r(10, 10, 100, 44), r(10, 80, 100, 44)], 50, 100), 1);
});

test("il tocco fuori da tutti i comandi non trova niente", () => {
  assert.equal(toccato([r(10, 10, 100, 44)], 200, 30), -1);
});

test("un comando nascosto (senza misure) non si può toccare", () => {
  assert.equal(toccato([r(0, 0, 0, 0)], 0, 0), -1);
});

test("un comando spento dice il suo perché, se ne ha uno", () => {
  assert.equal(avvisoSpento({ perche: "Scrivi prima il numero uscito sul d20" }), "Scrivi prima il numero uscito sul d20");
});

test("l'opzione già scelta non ha niente da dire: è accesa, non spenta", () => {
  assert.equal(avvisoSpento({ scelto: true }), null);
});

test("il pulsante di conferma in fondo a una finestra: manca qualcosa sopra", () => {
  assert.equal(avvisoSpento({ conferma: true }), "Prima completa quello che manca qui sopra");
});

test("senza altre notizie, almeno si dice che adesso non si può", () => {
  assert.equal(avvisoSpento({}), "Adesso non si può usare");
});
