/* Test delle correzioni ai dati già salvati di Petrus (decise dal master): nemico e terreno prescelti, munizioni speciali. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAGGI } from "../js/personaggi/index.js";
import { normalizza } from "../js/regole/base.js";
import { scelteTutte } from "../js/classi/comune.js";

const P = PERSONAGGI.petrus;
/* la scheda com'è salvata adesso su Firebase: un solo contatore (18 frecce d'argento), le armi senza munizioni per nome */
const salvata = (extra = {}) => normalizza(P.def, {
  level: 6, ammo: 18, scelte: [{ livello: 3, classe: "ranger", id: "preda", valore: "colosso" }],
  weapons: [
    { id: "w1", n: "Arco lungo", t: "Perforanti", note: "frecce d'argento", ab: "des", dice: [1, 8], magic: 0, ranged: true, ammo: true },
    { id: "w2", n: "Arco lungo · freccia +1", t: "Perforanti", note: "una freccia incantata", ab: "des", dice: [1, 8], magic: 1, ranged: true },
    { id: "w3", n: "Spada corta", t: "Perforanti", note: "", ab: "fin", dice: [1, 6], magic: 0 }],
  ...extra,
});

test("Petrus: nemico prescelto Bestie e terreno prescelto Foresta", () => {
  const S = salvata();
  assert.equal(P.correggi(S), true);
  assert.deepEqual(scelteTutte(S, "nemico-prescelto"), ["Bestie"]);
  assert.deepEqual(scelteTutte(S, "terreno"), ["Foresta"]);
});

test("Petrus: le frecce d'argento rimaste e la freccia +1 diventano munizioni speciali, legate ai due archi", () => {
  const S = salvata({ ammo: 15 });   // al tavolo ne ha già tirate 3
  P.correggi(S);
  assert.deepEqual(S.munizioni, [{ id: "frecce-argento", nome: "Frecce d'argento", n: 15 }, { id: "freccia-1", nome: "Freccia +1", n: 1 }]);
  assert.equal(S.weapons.find(w => w.id === "w1").mun, "frecce-argento");
  assert.equal(S.weapons.find(w => w.id === "w2").mun, "freccia-1");
  assert.equal(S.weapons.find(w => w.id === "w3").mun, undefined);
});

test("Petrus: le correzioni si fanno una volta sola", () => {
  const S = salvata();
  P.correggi(S);
  const dopo = structuredClone(S);
  assert.equal(P.correggi(S), false);
  assert.deepEqual(S, dopo);
});

test("Petrus: una scheda nuova nasce già sistemata", () => {
  const S = normalizza(P.def, {});
  assert.equal(P.correggi(S), false);
});
