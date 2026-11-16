/* Test degli effetti attivi in combattimento: Marchio del cacciatore sul bersaglio, Favore divino, Arma magica. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { effettoAttivo, extraAccesi, bonusColpire, proponiMarchio, attiva } from "../js/regole/effetti.js";

const marchio = { id: "marchio", bersaglio: "n3", nome: "Lupo 3" };

test("l'effetto vale solo finché dura la concentrazione sul suo incantesimo", () => {
  assert.deepEqual(effettoAttivo({ conc: "Marchio del cacciatore", effetto: marchio }), marchio);
  assert.equal(effettoAttivo({ conc: "", effetto: marchio }), null);
  assert.equal(effettoAttivo({ conc: "Favore divino", effetto: marchio }), null);
});

test("Marchio del cacciatore: il d6 in più si accende da solo sul bersaglio marchiato, con un'arma", () => {
  assert.deepEqual(extraAccesi(marchio, { bersaglio: "n3", arma: true }), ["marchio"]);
  assert.deepEqual(extraAccesi(marchio, { bersaglio: "n1", arma: true }), []);
  assert.deepEqual(extraAccesi(marchio, { bersaglio: "n3", arma: false }), [], "non con gli incantesimi");
});

test("Favore divino: il d4 radiante si accende da solo a ogni colpo con un'arma, su chiunque", () => {
  assert.deepEqual(extraAccesi({ id: "favore" }, { bersaglio: "n1", arma: true }), ["favore"]);
  assert.deepEqual(extraAccesi(null, { bersaglio: "n1", arma: true }), []);
});

test("Arma magica: +1 a colpire e ai danni solo con l'arma incantata", () => {
  const e = { id: "arma-magica", arma: "w1" };
  assert.equal(bonusColpire(e, "w1"), 1);
  assert.equal(bonusColpire(e, "w2"), 0);
  assert.equal(bonusColpire(marchio, "w1"), 0);
});

test("prima di attaccare: proporre il Marchio se lo sa, ha l'azione bonus e uno slot, e il bersaglio non è marchiato", () => {
  const base = { sa: true, effetto: null, bersaglio: "n1", bonusLibero: true, slotLiberi: 2, vivi: ["n1", "n3"] };
  assert.equal(proponiMarchio(base), "lancia");
  assert.equal(proponiMarchio({ ...base, sa: false }), null);
  assert.equal(proponiMarchio({ ...base, bonusLibero: false }), null);
  assert.equal(proponiMarchio({ ...base, slotLiberi: 0 }), null);
  assert.equal(proponiMarchio({ ...base, effetto: marchio, bersaglio: "n3" }), null, "già marchiato");
});

test("il bersaglio marchiato è caduto: spostare il Marchio costa solo l'azione bonus, niente slot", () => {
  const p = { sa: true, effetto: marchio, bersaglio: "n1", bonusLibero: true, slotLiberi: 0, vivi: ["n1"] };
  assert.equal(proponiMarchio(p), "sposta");
  assert.equal(proponiMarchio({ ...p, vivi: ["n1", "n3"] }), null, "il marchiato è ancora in piedi: non si sposta");
});

test("lanciare un effetto: quale incantesimo, e il Marchio ricorda il bersaglio", () => {
  assert.deepEqual(attiva("Marchio del cacciatore", { bersaglio: "n1", nome: "Lupo 1" }), { id: "marchio", bersaglio: "n1", nome: "Lupo 1" });
  assert.deepEqual(attiva("Favore divino", {}), { id: "favore" });
  assert.deepEqual(attiva("Arma magica", { arma: "w1", nome: "Spada lunga" }), { id: "arma-magica", arma: "w1", nome: "Spada lunga" });
  assert.equal(attiva("Benedizione", {}), null);
});
