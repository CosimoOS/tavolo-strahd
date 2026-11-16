/* Test del multiclasse aperto a tutti: requisiti del manuale, classe nuova nel passaggio di livello. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAGGI } from "../js/personaggi/index.js";
import { normalizza } from "../js/regole/base.js";
import { classiPrendibili } from "../js/regole/multiclasse.js";

const R = PERSONAGGI.rombosogliola, stato = (P, extra = {}) => normalizza(P.def, extra);
const voce = (lista, id) => lista.find(c => c.id === id);

test("requisiti: 13 nelle caratteristiche della classe nuova (Rombosogliola: Paladino sì, Ranger e Druido no)", () => {
  const l = classiPrendibili({ for: 20, des: 14, cos: 14, int: 11, sag: 10, car: 14 }, ["guerriero"], ["guerriero", "paladino", "ranger", "druido"]);
  assert.equal(voce(l, "paladino").ok, true);
  assert.equal(voce(l, "ranger").ok, false);
  assert.equal(voce(l, "ranger").manca, "Saggezza 13");
  assert.equal(voce(l, "druido").ok, false);
  assert.equal(voce(l, "guerriero"), undefined, "la classe che ha già non è nuova");
});

test("requisiti: serve 13 anche nella propria classe, altrimenti niente multiclasse", () => {
  const l = classiPrendibili({ for: 10, des: 10, cos: 10, int: 10, sag: 16, car: 10 }, ["guerriero"], ["guerriero", "druido"]);
  assert.equal(voce(l, "druido").ok, false);
  assert.equal(voce(l, "druido").manca, "Forza o Destrezza 13 (per lasciare il Guerriero)");
});

test("le classi che l'app non conosce ancora compaiono come segnaposto", () => {
  const l = classiPrendibili({ for: 13, des: 13, cos: 13, int: 13, sag: 13, car: 13 }, ["guerriero"], ["guerriero", "druido"]);
  assert.equal(voce(l, "ladro").inArrivo, true);
  assert.equal(voce(l, "ladro").ok, false);
  assert.equal(l.length, 11, "le altre undici classi del manuale");
});

test("una classe sola: salire nella propria classe non crea livelli separati", () => {
  assert.equal(R.livelliDopo(stato(R), "guerriero"), null);
});

test("classe nuova: Rombosogliola Guerriero 6 prende un livello da Paladino", () => {
  const S = stato(R);
  assert.deepEqual(R.livelliDopo(S, "paladino"), { guerriero: 6, paladino: 1 });
  const p = R.passo(S, "paladino");
  assert.equal(p.nome, "Paladino"); assert.equal(p.livello, 1); assert.equal(p.dado, 10);
});

test("dopo il livello nuovo la scheda mostra le due classi e i dadi vita di entrambe", () => {
  const S = stato(R, { level: 7, livelli: { guerriero: 6, paladino: 1 } });
  R.vediStato(S);
  assert.equal(R.multiclasse, true);
  assert.equal(R.classe, "Guerriero 6 · Paladino 1");
  assert.equal(R.dadiVita(S), "6d10 + 1d10");
  assert.deepEqual(R.livelliDopo(S, "paladino"), { guerriero: 6, paladino: 2 });
  R.vediStato(stato(R));
  assert.equal(R.multiclasse, false, "con lo stato di prima torna a una classe sola");
});

test("le classi tra cui salire: le proprie, poi le nuove con i requisiti; i seguaci non fanno multiclasse", () => {
  const nuove = R.classiNuove(stato(R));
  assert.equal(voce(nuove, "paladino").ok, true);
  assert.equal(voce(nuove, "seguace-guerriero"), undefined);
  assert.deepEqual(PERSONAGGI.ireena.classiNuove(stato(PERSONAGGI.ireena)), []);
});

test("classe nuova: il passaggio di livello elenca i privilegi che si ricevono al 1° livello", async () => {
  const S = stato(R), p = R.passo(S, "paladino");
  assert.ok(p.novita.length > 0, "almeno un privilegio da mostrare");
  assert.ok(p.novita.every(([t, d]) => t && d), "ognuno con titolo e spiegazione");
});
