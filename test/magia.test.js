/* Test di incantesimi d'attacco, extra ai danni e pozioni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { INCANTESIMI_ATTACCO, EXTRA_DANNI, moltTrucchetto, partiDanno, curaDi, danniTs } from "../js/regole/magia.js";

test("trucchetti: i dadi crescono col livello del personaggio", () => {
  assert.deepEqual([1, 4, 5, 10, 11, 17].map(moltTrucchetto), [1, 1, 2, 2, 3, 4]);
  const pf = INCANTESIMI_ATTACCO["Produrre fiamma"];
  assert.deepEqual(partiDanno(pf.parti, { molt: moltTrucchetto(6) }), [{ n: 2, f: 8, mod: 0, t: "fuoco" }]);
  assert.deepEqual(partiDanno(pf.parti, { molt: 2, critico: true }), [{ n: 4, f: 8, mod: 0, t: "fuoco" }]);
});

test("extra: prendono il tipo dell'arma e raddoppiano col critico", () => {
  const marchio = EXTRA_DANNI.find(e => e.id === "marchio");
  assert.deepEqual(partiDanno(marchio.parti, { tipoArma: "perforanti", critico: true }), [{ n: 2, f: 6, mod: 0, t: "perforanti" }]);
  assert.equal(EXTRA_DANNI.find(e => e.id === "accecante").slot, 3);
});

test("pozioni e tiri salvezza", () => {
  assert.equal(curaDi("Pozione di guarigione ×2").nome, "Pozione di guarigione");
  assert.equal(curaDi("pozione di guarigione superiore").parti[0].n, 4);
  assert.equal(curaDi("Corda"), null);
  assert.equal(danniTs(13, false, true), 13);
  assert.equal(danniTs(13, true, true), 6);
  assert.equal(danniTs(13, true, false), 0);
});
