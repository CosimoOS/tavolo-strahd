/* Test dell'attacco: per colpire, vantaggio, critici, danni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { leggiDado, tiroPerColpire, esito, dadiDanno, sommaDanni, danniFinali } from "../js/regole/attacco.js";

test("per colpire: dado più bonus, con vantaggio il più alto, con svantaggio il più basso", () => {
  assert.equal(tiroPerColpire({ dadi: [12], bonus: 7 }).tot, 19);
  assert.equal(tiroPerColpire({ dadi: [4, 15], modo: "vantaggio", bonus: 7 }).tot, 22);
  assert.equal(tiroPerColpire({ dadi: [4, 15], modo: "svantaggio", bonus: 7 }).tot, 11);
  assert.equal(tiroPerColpire({ dadi: [12], modo: "vantaggio", bonus: 7 }), null);
  assert.equal(tiroPerColpire({ dadi: ["21"], bonus: 7 }), null);
});

test("critici e fallimenti naturali", () => {
  const venti = tiroPerColpire({ dadi: [20], bonus: 0 });
  assert.equal(venti.critico, true);
  assert.equal(esito(venti, 30), "colpito");
  const campione = tiroPerColpire({ dadi: [19], bonus: 5, critMin: 19 });
  assert.equal(campione.critico, true);
  const uno = tiroPerColpire({ dadi: [1], bonus: 30 });
  assert.equal(esito(uno, 5), "mancato");
  assert.equal(esito(tiroPerColpire({ dadi: [6], bonus: 7 }), 13), "colpito");   // 13 contro CA 13: colpisce
  assert.equal(esito(tiroPerColpire({ dadi: [5], bonus: 7 }), 13), "mancato");
});

test("danni: con il critico raddoppiano i dadi, non il modificatore", () => {
  assert.deepEqual(dadiDanno([1, 8], false), [1, 8]);
  assert.deepEqual(dadiDanno([2, 6], true), [4, 6]);
  const d = sommaDanni([{ valori: [5, 3], facce: 8, mod: 4, tipo: "taglienti" }, { valori: [6, 2, 7, 1], facce: 8, mod: 0, tipo: "radianti" }]);
  assert.deepEqual(d, { tot: 28, perTipo: { taglienti: 12, radianti: 16 } });
  assert.equal(sommaDanni([{ valori: [9], facce: 8, mod: 4, tipo: "taglienti" }]), null);
  assert.equal(sommaDanni([{ valori: [3], facce: 6, mod: 2, tipo: "perforanti" }], "4").tot, 9);
  assert.equal(leggiDado("0", 6), null);
});

test("il master sceglie: pieni, metà, doppi, nulli", () => {
  assert.equal(danniFinali(9, "pieni"), 9);
  assert.equal(danniFinali(9, "meta"), 4);
  assert.equal(danniFinali(9, "doppio"), 18);
  assert.equal(danniFinali(9, "nulla"), 0);
});
