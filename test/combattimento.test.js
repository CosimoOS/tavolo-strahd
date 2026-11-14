/* Test dello scontro: iniziativa, pareggi, giro dei turni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { leggiD20, totaleIniziativa, ordina, pariConPrecedente, avanza, indietro } from "../js/regole/combattimento.js";

test("il d20 accetta solo numeri da 1 a 20", () => {
  assert.equal(leggiD20("14"), 14);
  assert.equal(leggiD20(" 20 "), 20);
  for (const no of ["0", "21", "", "abc", "3.5", null, undefined]) assert.equal(leggiD20(no), null);
});

test("totale: dado più modificatore", () => {
  assert.deepEqual(totaleIniziativa({ dadi: [14], mod: 1 }), { dadi: [14], usato: 14, mod: 1, tot: 15 });
  assert.equal(totaleIniziativa({ dadi: [3], mod: -1 }).tot, 2);
  assert.equal(totaleIniziativa({ dadi: [""], mod: 1 }), null);
});

test("con vantaggio (Ireena dal livello 7) servono due dadi e conta il più alto", () => {
  assert.equal(totaleIniziativa({ dadi: [4, 17], mod: 1, vantaggio: true }).tot, 18);
  assert.equal(totaleIniziativa({ dadi: [17, 4], mod: 1, vantaggio: true }).usato, 17);
  assert.equal(totaleIniziativa({ dadi: [12], mod: 1, vantaggio: true }), null);
  /* senza vantaggio un secondo dado viene ignorato */
  assert.equal(totaleIniziativa({ dadi: [4, 17], mod: 1 }).tot, 5);
});

test("ordine: totale più alto prima, a parità Destrezza più alta", () => {
  const o = ordina([
    { id: "a", tot: 12, des: 10 }, { id: "b", tot: 18, des: 8 },
    { id: "c", tot: 12, des: 16 }, { id: "d", tot: 5, des: 20 },
  ]);
  assert.deepEqual(o.map(v => v.id), ["b", "c", "a", "d"]);
});

test("pareggio completo: resta l'ordine d'ingresso e il master può scambiare", () => {
  const o = ordina([{ id: "x", tot: 10, des: 12 }, { id: "y", tot: 10, des: 12 }, { id: "z", tot: 9, des: 12 }]);
  assert.deepEqual(o.map(v => v.id), ["x", "y", "z"]);
  assert.equal(pariConPrecedente(o, 1), true);
  assert.equal(pariConPrecedente(o, 2), false);
  assert.equal(pariConPrecedente(o, 0), false);
});

test("chi non ha la scheda (Destrezza sconosciuta) a parità si può scambiare", () => {
  const o = ordina([{ id: "rombo", tot: 16, des: 14 }, { id: "petrus", tot: 16, des: null }]);
  assert.deepEqual(o.map(v => v.id), ["rombo", "petrus"]);
  assert.equal(pariConPrecedente(o, 1), true);
  assert.equal(pariConPrecedente([{ tot: 16, des: 14 }, { tot: 16, des: 12 }], 1), false);
});

test("fine turno: in fondo si torna in cima e sale il round", () => {
  assert.deepEqual(avanza({ turno: 0, round: 1 }, 3), { turno: 1, round: 1 });
  assert.deepEqual(avanza({ turno: 2, round: 1 }, 3), { turno: 0, round: 2 });
  assert.deepEqual(indietro({ turno: 0, round: 2 }, 3), { turno: 2, round: 1 });
  assert.deepEqual(indietro({ turno: 0, round: 1 }, 3), { turno: 0, round: 1 });
});
