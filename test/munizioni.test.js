/* Test delle munizioni: regola della casa "munizioni comuni infinite", munizioni speciali per nome legate all'arma. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scorte, usaMunizione, munizioneDi, aggiungiScorta } from "../js/regole/munizioni.js";
import { impostaOpzioni, opzioni } from "../js/campagna.js";

const arco = { id: "w1", n: "Arco lungo", ranged: true, ammo: true };
const arcoArgento = { id: "w2", n: "Arco lungo", ranged: true, mun: "argento" };
const argento = { id: "argento", nome: "Frecce d'argento", n: 18 };

test("regola del tavolo: munizioni comuni infinite è accesa se il master non dice altro", () => {
  impostaOpzioni({});
  assert.equal(opzioni().munizioniInfinite, true);
  impostaOpzioni({ munizioniInfinite: false });
  assert.equal(opzioni().munizioniInfinite, false);
  impostaOpzioni({});
});

test("comuni infinite: non si contano e non si consumano", () => {
  const S = { weapons: [arco], ammo: 20, munizioni: [] };
  assert.deepEqual(scorte(S, true), []);
  assert.equal(usaMunizione(S, arco, true), null);
});

test("regola spenta: le comuni si contano e ogni tiro ne toglie una", () => {
  const S = { weapons: [arco], ammo: 20, munizioni: [] };
  assert.deepEqual(scorte(S, false), [{ id: "comuni", nome: "Munizioni", n: 20 }]);
  assert.deepEqual(usaMunizione(S, arco, false), { id: "comuni", nome: "Munizioni", restano: 19, cambia: { ammo: 19 } });
});

test("le munizioni speciali si contano sempre, ognuna con il suo nome", () => {
  const S = { weapons: [arcoArgento], ammo: 20, munizioni: [argento] };
  assert.deepEqual(scorte(S, true), [argento]);
  assert.deepEqual(usaMunizione(S, arcoArgento, true),
    { id: "argento", nome: "Frecce d'argento", restano: 17, cambia: { munizioni: [{ ...argento, n: 17 }] } });
});

test("finite le munizioni speciali: non si va sotto zero e l'app lo dice", () => {
  const S = { weapons: [arcoArgento], munizioni: [{ ...argento, n: 0 }] };
  assert.deepEqual(usaMunizione(S, arcoArgento, true), { id: "argento", nome: "Frecce d'argento", restano: 0, finite: true, cambia: {} });
});

test("ogni arma sa quale scorta usa e quante ne restano (per la scelta dell'arma nello scontro)", () => {
  const S = { weapons: [arco, arcoArgento], ammo: 20, munizioni: [argento] };
  assert.deepEqual(munizioneDi(S, arcoArgento, true), argento);
  assert.equal(munizioneDi(S, arco, true), null, "comuni infinite: niente da contare");
  assert.deepEqual(munizioneDi(S, arco, false), { id: "comuni", nome: "Munizioni", n: 20 });
  assert.equal(munizioneDi(S, { n: "Spada corta" }, false), null);
});

test("una scorta nuova prende un nome-chiave dal suo nome, senza doppioni", () => {
  const S = { munizioni: [{ id: "frecce-d-argento", nome: "Frecce d'argento", n: 3 }] };
  assert.deepEqual(aggiungiScorta(S, "Quadrelli +1", 6),
    { id: "quadrelli-1", munizioni: [...S.munizioni, { id: "quadrelli-1", nome: "Quadrelli +1", n: 6 }] });
  assert.equal(aggiungiScorta(S, "Frecce d'argento", 10).id, "frecce-d-argento-2");
  assert.equal(aggiungiScorta({}, "Frecce", -4).munizioni[0].n, 0, "mai sotto zero");
});
