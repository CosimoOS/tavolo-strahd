/* Test delle regole. Si lanciano dal Terminale con:  npm test
   Ogni test fa un conto che sappiamo fare a mano e controlla che l'app dia lo stesso numero. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mod, prof, calcola, attacchiOrdinati, normalizza, clone } from "../js/regole/base.js";
import rombosogliola from "../js/personaggi/rombosogliola.js";
import ireena from "../js/personaggi/ireena.js";

test("modificatori delle caratteristiche", () => {
  assert.equal(mod(10), 0);
  assert.equal(mod(11), 0);
  assert.equal(mod(9), -1);
  assert.equal(mod(14), 2);
  assert.equal(mod(20), 5);
  assert.equal(mod(1), -5);
});

test("bonus di competenza per livello", () => {
  assert.deepEqual([1, 4, 5, 8, 9, 13, 17, 20].map(prof), [2, 2, 3, 3, 4, 5, 6, 6]);
});

test("Rombosogliola al 6°: attacchi, iniziativa, tiri salvezza", () => {
  const X = calcola(rombosogliola, rombosogliola.def);
  const a = Object.fromEntries(X.atk.map(w => [w.n, w]));
  assert.equal(a["Ascia da battaglia"].hit, 8);   // For +5, competenza +3
  assert.equal(a["Ascia da battaglia"].mod, 5);
  assert.equal(a["Lancia"].hit, 7);                // correzione -1
  assert.equal(a["Lancia"].mod, 2);                // correzione -3
  assert.equal(a["Balestra leggera"].hit, 5);      // Des +2, competenza +3
  assert.equal(X.ini, 2);                          // niente Atleta straordinario prima del 7°
  assert.equal(X.saves.for, 8);
  assert.equal(X.saves.des, 2);
  assert.equal(X.pp, 10);
});

test("Rombosogliola al 7°: Atleta straordinario entra nell'iniziativa", () => {
  const S = { ...clone(rombosogliola.def), level: 7 };
  const X = calcola(rombosogliola, S);
  assert.equal(X.ini, 4);                                        // Des +2, metà di +3 per eccesso = +2
  assert.equal(X.skills.find(s => s.n === "Acrobazia").v, 4);
  assert.equal(X.skills.find(s => s.n === "Atletica").v, 8);     // con competenza: niente mezzo bonus
});

test("Ireena: il ruolo Attaccante aggiunge +2 per colpire", () => {
  const X = calcola(ireena, ireena.def);
  const a = Object.fromEntries(X.atk.map(w => [w.n, w]));
  assert.equal(a["Spada lunga"].hit, 7);   // For +2, competenza +3, Attaccante +2
  assert.equal(a["Spada lunga"].mod, 2);
  assert.equal(a["Arco lungo"].hit, 6);    // Des +1
  assert.equal(ireena.ready(6), false);
  assert.equal(ireena.ready(7), true);     // vantaggio all'iniziativa dal 7°
});

test("attacchi ordinati dal danno medio più alto", () => {
  const X = calcola(rombosogliola, rombosogliola.def);
  assert.deepEqual(attacchiOrdinati(X).map(a => a.n),
    ["Ascia da battaglia", "Ascia d'argento", "Balestra leggera", "Lancia"]);
});

test("normalizza: i campi mancanti prendono il valore di partenza", () => {
  const s = normalizza(ireena.def, { hp: 10, coins: { mo: 5 }, conds: ["Prono", "Inventata"] });
  assert.equal(s.hp, 10);
  assert.equal(s.coins.mo, 5);
  assert.equal(s.coins.ma, 0);
  assert.equal(s.scores.car, 16);
  assert.deepEqual(s.conds, ["Prono"]);
  assert.equal(s.weapons.length, 2);
});
