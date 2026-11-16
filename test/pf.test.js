/* Test dei punti ferita: massimo ridotto (maledizioni, morsi), temporanei, danni e cure, barra. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { massimo, danno, cura, riduci, dopoRiposoLungo, segmentiBarra } from "../js/regole/pf.js";

test("massimo ridotto: il massimo vero meno la riduzione, mai sotto 1", () => {
  assert.equal(massimo({ maxhp: 51 }), 51);
  assert.equal(massimo({ maxhp: 51, riduzione: 3 }), 48);
  assert.equal(massimo({ maxhp: 10, riduzione: 40 }), 1);
});

test("la cura non supera il massimo ridotto", () => {
  assert.deepEqual(cura({ maxhp: 51, riduzione: 3, hp: 40 }, 20), { hp: 48 });
  assert.deepEqual(cura({ maxhp: 51, hp: 40 }, 5), { hp: 45 });
});

test("il danno toglie prima i PF temporanei, poi quelli veri, mai sotto zero", () => {
  assert.deepEqual(danno({ hp: 40, temp: 5 }, 8), { hp: 37, temp: 0 });
  assert.deepEqual(danno({ hp: 40, temp: 5 }, 3), { hp: 40, temp: 2 });
  assert.deepEqual(danno({ hp: 4, temp: 0 }, 10), { hp: 0, temp: 0 });
});

test("ridurre il massimo abbassa i PF che lo superano; zero toglie la riduzione", () => {
  assert.deepEqual(riduci({ maxhp: 51, hp: 51 }, 3), { riduzione: 3, hp: 48 });
  assert.deepEqual(riduci({ maxhp: 51, hp: 30 }, 3), { riduzione: 3, hp: 30 });
  assert.deepEqual(riduci({ maxhp: 51, hp: 48, riduzione: 3 }, 0), { riduzione: 0, hp: 48 });
  assert.deepEqual(riduci({ maxhp: 51, hp: 51 }, 80), { riduzione: 50, hp: 1 }, "resta almeno 1 PF di massimo");
});

test("il riposo lungo riempie fino al massimo ridotto e non toglie la riduzione (es. una maledizione)", () => {
  const S = { maxhp: 51, riduzione: 3, hp: 10, temp: 4 };
  assert.deepEqual(dopoRiposoLungo(S), { hp: 48, temp: 0 });
  assert.equal(S.riduzione, 3);
});

test("barra: vita, temporanei, vuoto e massimo perso, in percentuale del massimo vero", () => {
  const b = segmentiBarra({ maxhp: 50, riduzione: 5, hp: 30, temp: 5 });
  assert.deepEqual(b, { vita: 60, temp: 10, vuoto: 20, perso: 10 });
});

test("barra: con i temporanei oltre il massimo la barra si allunga e tutto resta in proporzione", () => {
  const b = segmentiBarra({ maxhp: 40, hp: 40, temp: 10 });
  assert.deepEqual(b, { vita: 80, temp: 20, vuoto: 0, perso: 0 });
});
