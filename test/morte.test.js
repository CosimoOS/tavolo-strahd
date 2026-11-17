/* Test dei tiri salvezza contro la morte (Manuale del giocatore): tiro a inizio turno, danni mentre si è a terra,
   morte sul colpo, stabilizzazione. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { statoMorte, tiroMorte, colpo, puoTirareMorte } from "../js/regole/morte.js";
import { testoColpito } from "../js/regole/battaglia.js";

const aTerra = (altro = {}) => ({ hp: 0, maxhp: 40, temp: 0, deathS: 0, deathF: 0, ...altro });

test("stato: in piedi, a terra, stabile (tre successi), morto (tre fallimenti)", () => {
  assert.equal(statoMorte({ hp: 12, maxhp: 40 }), "in-piedi");
  assert.equal(statoMorte(aTerra()), "a-terra");
  assert.equal(statoMorte(aTerra({ deathS: 3 })), "stabile");
  assert.equal(statoMorte(aTerra({ deathF: 3 })), "morto");
});

test("tiro da 10 in su: un successo", () => {
  assert.deepEqual(tiroMorte(aTerra({ deathS: 1 }), 10), { esito: "successo", cambia: { deathS: 2, deathF: 0 } });
});

test("tiro sotto 10: un fallimento", () => {
  assert.deepEqual(tiroMorte(aTerra({ deathF: 1 }), 9), { esito: "fallimento", cambia: { deathS: 0, deathF: 2 } });
});

test("1 naturale: due fallimenti", () => {
  assert.deepEqual(tiroMorte(aTerra(), 1), { esito: "due-fallimenti", cambia: { deathS: 0, deathF: 2 } });
});

test("20 naturale: ti rialzi con 1 PF e i tiri si azzerano", () => {
  assert.deepEqual(tiroMorte(aTerra({ deathS: 1, deathF: 2 }), 20), { esito: "in-piedi", cambia: { hp: 1, deathS: 0, deathF: 0 } });
});

test("terzo successo: stabile", () => {
  assert.equal(tiroMorte(aTerra({ deathS: 2 }), 15).esito, "stabile");
});

test("terzo fallimento: morto; i fallimenti non superano tre", () => {
  assert.deepEqual(tiroMorte(aTerra({ deathF: 2 }), 1), { esito: "morto", cambia: { deathS: 0, deathF: 3 } });
});

test("colpo a chi è in piedi: solo PF tolti, niente fallimenti", () => {
  assert.deepEqual(colpo({ hp: 30, maxhp: 40, temp: 5, deathS: 0, deathF: 0 }, 12), { cambia: { hp: 23, temp: 0 }, fallimenti: 0, morto: false });
});

test("colpo che porta a 0 PF: a terra, senza fallimenti", () => {
  assert.deepEqual(colpo({ hp: 8, maxhp: 40, temp: 0 }, 20), { cambia: { hp: 0, temp: 0, deathS: 0, deathF: 0 }, fallimenti: 0, morto: false });
});

test("morte sul colpo: i danni che avanzano dopo lo 0 arrivano al massimo dei PF", () => {
  const r = colpo({ hp: 8, maxhp: 40, temp: 0 }, 48);
  assert.equal(r.morto, true); assert.equal(r.cambia.deathF, 3);
  assert.equal(colpo({ hp: 8, maxhp: 40, temp: 0 }, 47).morto, false, "un danno in meno non basta");
});

test("morte sul colpo con il massimo ridotto da una maledizione: conta il massimo ridotto", () => {
  assert.equal(colpo({ hp: 5, maxhp: 40, riduzione: 10, temp: 0 }, 35).morto, true);
});

test("danni mentre sei a terra: un fallimento", () => {
  assert.deepEqual(colpo(aTerra({ deathS: 2, deathF: 1 }), 6), { cambia: { hp: 0, temp: 0, deathS: 2, deathF: 2 }, fallimenti: 1, morto: false });
});

test("colpo critico mentre sei a terra: due fallimenti", () => {
  const r = colpo(aTerra(), 6, { critico: true });
  assert.equal(r.fallimenti, 2); assert.equal(r.cambia.deathF, 2); assert.equal(r.morto, false);
});

test("danni a terra che portano al terzo fallimento: morto", () => {
  assert.equal(colpo(aTerra({ deathF: 2 }), 3).morto, true);
});

test("danni a terra pari al massimo dei PF: morte sul colpo", () => {
  const r = colpo(aTerra(), 40);
  assert.equal(r.morto, true); assert.equal(r.cambia.deathF, 3);
});

test("chi era stabile e subisce danni ricomincia i tiri: successi azzerati, un fallimento", () => {
  assert.deepEqual(colpo(aTerra({ deathS: 3 }), 4).cambia, { hp: 0, temp: 0, deathS: 0, deathF: 1 });
});

test("danni a terra assorbiti tutti dai PF temporanei: nessun fallimento", () => {
  assert.deepEqual(colpo(aTerra({ temp: 10 }), 6), { cambia: { hp: 0, temp: 4, deathS: 0, deathF: 0 }, fallimenti: 0, morto: false });
});

test("un tiro per turno: si tira solo a terra, e non due volte nello stesso turno", () => {
  assert.equal(puoTirareMorte(aTerra(), "s1:2:0"), true);
  assert.equal(puoTirareMorte(aTerra({ morteTurno: "s1:2:0" }), "s1:2:0"), false);
  assert.equal(puoTirareMorte(aTerra({ morteTurno: "s1:1:0" }), "s1:2:0"), true, "il turno dopo si tira di nuovo");
  assert.equal(puoTirareMorte(aTerra({ deathS: 3 }), "s1:2:0"), false, "stabile: niente tiro");
  assert.equal(puoTirareMorte({ hp: 5, maxhp: 40 }, "s1:2:0"), false);
});

test("finestra 'ti hanno colpito' a terra: dice i fallimenti presi e a quanti sei", () => {
  assert.equal(testoColpito({ da: "Lupo 1", n: 6, restano: 0, massimo: 40, fallimenti: 1, totFallimenti: 2 }).sotto, "Eri a terra: un fallimento contro la morte (2 su 3)");
  assert.equal(testoColpito({ da: "Lupo 1", n: 6, restano: 0, massimo: 40, fallimenti: 2, totFallimenti: 2 }).sotto, "Eri a terra, colpo critico: due fallimenti contro la morte (2 su 3)");
  assert.equal(testoColpito({ da: "Lupo 1", n: 60, restano: 0, massimo: 40, morto: true }).sotto, "Il colpo è mortale");
  assert.equal(testoColpito({ da: "Lupo 1", n: 6, restano: 0, massimo: 40 }).sotto, "Sei a terra: 0 PF");
});
