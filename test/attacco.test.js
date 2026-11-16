/* Test dell'attacco: per colpire, vantaggio, critici, danni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { leggiDado, tiroPerColpire, esito, dadiDanno, sommaDanni, danniFinali, balzaDardo } from "../js/regole/attacco.js";

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

import { partiFormula, conResistenze } from "../js/regole/attacco.js";

test("formule di danno del bestiario lette a pezzi", () => {
  assert.deepEqual(partiFormula("2d4+2 perforanti"), [{ n: 2, f: 4, mod: 2, tipo: "perforanti" }]);
  assert.deepEqual(partiFormula("2d6+3 taglienti + 1d6 fulmine"), [{ n: 2, f: 6, mod: 3, tipo: "taglienti" }, { n: 1, f: 6, mod: 0, tipo: "fulmine" }]);
  assert.deepEqual(partiFormula("1d8+4 contundenti (1d10+4 a due mani)"), [{ n: 1, f: 8, mod: 4, tipo: "contundenti" }]);
  assert.deepEqual(partiFormula("trattenuto"), []);
});

test("resistenze del personaggio: quel tipo di danno si dimezza", () => {
  assert.deepEqual(conResistenze({ taglienti: 9, fulmine: 7 }, ["Fulmine"]), { tot: 12, dimezzati: ["fulmine"] });
  assert.deepEqual(conResistenze({ perforanti: 7 }, []), { tot: 7, dimezzati: [] });
});

test("Dardo caotico: balza se due d8 sono uguali; con il critico basta una coppia tra i quattro (regola del master)", () => {
  assert.equal(balzaDardo(["3", "3"]), true);
  assert.equal(balzaDardo(["3", "4"]), false);
  assert.equal(balzaDardo(["1", "5", "7", "5"]), true, "critico: il secondo e il quarto sono uguali");
  assert.equal(balzaDardo(["1", "2", "3", "4"]), false);
  assert.equal(balzaDardo(["6", ""]), false, "un dado ancora da scrivere non conta");
  assert.equal(balzaDardo(["9", "9"]), false, "9 non è un d8");
});
