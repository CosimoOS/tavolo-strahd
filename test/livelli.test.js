/* Test della salita di livello decisa dal master (regola del nostro tavolo). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { puoSalire, concedi, revoca, inAttesa } from "../js/regole/livelli.js";
import { impostaOpzioni, opzioni } from "../js/campagna.js";

test("regola del tavolo: i giocatori NON salgono di livello da soli, se il master non dice altro", () => {
  impostaOpzioni({});
  assert.equal(opzioni().salitaLibera, false);
});

test("senza il via del master il giocatore non può salire; con il via sì, fino al livello concesso", () => {
  assert.equal(puoSalire({ livello: 6, concesso: undefined, libera: false }), false);
  assert.equal(puoSalire({ livello: 6, concesso: 7, libera: false }), true);
  assert.equal(puoSalire({ livello: 7, concesso: 7, libera: false }), false, "già salito");
});

test("il master può sempre far salire una scheda; con la salita libera possono tutti; mai oltre il 20", () => {
  assert.equal(puoSalire({ livello: 6, libera: false, master: true }), true);
  assert.equal(puoSalire({ livello: 6, libera: true }), true);
  assert.equal(puoSalire({ livello: 20, libera: true, master: true, concesso: 21 }), false);
});

test("il master concede un livello a chi sceglie: ognuno al suo livello più uno", () => {
  const s = concedi({ rex: 5 }, [{ id: "petrus", livello: 6 }, { id: "rex", livello: 6 }]);
  assert.deepEqual(s, { petrus: 7, rex: 7 });
});

test("chi deve ancora salire resta in attesa; la revoca toglie il via", () => {
  const schede = [{ id: "petrus", livello: 7 }, { id: "rex", livello: 6 }, { id: "ireena", livello: 6 }];
  assert.deepEqual(inAttesa({ petrus: 7, rex: 7 }, schede), ["rex"]);
  assert.deepEqual(revoca({ petrus: 7, rex: 7 }, "rex"), { petrus: 7 });
});

test("tornare indietro di un livello: tutto come prima di salire, i PF non superano il massimo di prima", async () => {
  const { livelloPrima } = await import("../js/regole/livelli.js");
  const prima = { level: 6, maxhp: 52, scores: { for: 20 }, styles: ["Difesa"], asi: [], scelte: [], livelli: null };
  const S = { level: 7, maxhp: 60, hp: 58, dv: 7, scores: { for: 20 }, styles: ["Difesa"], asi: [], scelte: [], livelli: { guerriero: 6, paladino: 1 }, history: [prima] };
  const c = livelloPrima(S);
  assert.equal(c.level, 6); assert.equal(c.maxhp, 52); assert.equal(c.hp, 50); assert.equal(c.dv, 6);
  assert.equal(c.livelli, null, "torna a una classe sola");
  assert.deepEqual(c.history, []);
  assert.equal(livelloPrima({ ...S, history: [] }), null, "niente da annullare");
});

test("si può tornare indietro più volte, un livello alla volta", async () => {
  const { livelloPrima } = await import("../js/regole/livelli.js");
  const a = { level: 5, maxhp: 44, scores: {}, styles: [], asi: [], scelte: [] }, b = { level: 6, maxhp: 52, scores: {}, styles: [], asi: [], scelte: [] };
  const S = { level: 7, maxhp: 60, hp: 60, dv: 0, history: [a, b] };
  const uno = livelloPrima(S), due = livelloPrima({ ...S, ...uno });
  assert.equal(uno.level, 6); assert.equal(due.level, 5); assert.equal(due.hp, 44);
});
