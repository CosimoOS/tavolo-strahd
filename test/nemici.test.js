/* Test dei nemici: parole delle ferite, nomi numerati, branco o uno per uno, sconfitti tolti dai turni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ferite, danno, cura, nomiNumerati, schiera, togliDaOrdine } from "../js/regole/nemici.js";

test("ai giocatori arriva una parola sola", () => {
  assert.equal(ferite(11, 11), "illeso");
  assert.equal(ferite(10, 11), "ferito");
  assert.equal(ferite(3, 12), "in fin di vita");   // esattamente un quarto
  assert.equal(ferite(4, 12), "ferito");
  assert.equal(ferite(0, 11), "sconfitto");
});

test("danno e cura restano tra 0 e il massimo", () => {
  assert.equal(danno(5, 9), 0);
  assert.equal(cura(9, 11, 5), 11);
  assert.equal(danno(5, -3), 5);
});

test("nomi numerati, anche continuando quelli già in campo", () => {
  assert.deepEqual(nomiNumerati("Lupo", 1), ["Lupo"]);
  assert.deepEqual(nomiNumerati("Lupo", 3), ["Lupo 1", "Lupo 2", "Lupo 3"]);
  assert.deepEqual(nomiNumerati("Lupo", 2, ["Lupo 1", "Lupo 2", "Strega"]), ["Lupo 3", "Lupo 4"]);
  assert.deepEqual(nomiNumerati("Lupo", 1, ["Lupo"]), ["Lupo 2"]);
});

const B = {
  lupo: { nome: "Lupo", giocatori: "Lupo", pf: 11, ca: 13, ini: 2 },
  strega: { nome: "Strega baroviana", giocatori: "Strega", pf: 16, ca: 10, ini: 0 },
  ezm: { nome: "Ezmerelda", tipo: "alleato", pf: 82, ca: 17, ini: 4, pfVisibili: true },
};

test("in branco: un solo tiro d'iniziativa per tutti", () => {
  const { creature, gruppi } = schiera([{ creatura: "lupo", quanti: 3, modo: "branco" }], B);
  assert.equal(creature.length, 3);
  assert.equal(gruppi.length, 1);
  assert.equal(gruppi[0].nome, "Lupo ×3");
  assert.deepEqual(gruppi[0].membri, creature.map(c => c.id));
  assert.equal(gruppi[0].ini, 2);
});

test("uno per uno: un tiro a testa; il nome per i giocatori resta separato", () => {
  const { creature, gruppi } = schiera([{ creatura: "strega", quanti: 2, modo: "uno" }, { creatura: "ezm", quanti: 1, modo: "uno" }], B);
  assert.deepEqual(gruppi.map(g => g.nome), ["Strega 1", "Strega 2", "Ezmerelda"]);
  assert.deepEqual(creature.map(c => c.nome), ["Strega baroviana 1", "Strega baroviana 2", "Ezmerelda"]);
  assert.equal(creature[2].tipo, "alleato");
  assert.equal(creature[2].pfVisibili, true);
  assert.equal(new Set(creature.map(c => c.id)).size, 3);
});

test("chi è sconfitto esce dall'ordine senza far saltare il turno", () => {
  const o = ["a", "b", "c", "d"].map(id => ({ id }));
  assert.deepEqual(togliDaOrdine({ ordine: o, turno: 2, round: 1 }, "a"), { ordine: o.slice(1), turno: 1, round: 1 });
  assert.equal(togliDaOrdine({ ordine: o, turno: 1, round: 1 }, "c").turno, 1);
  /* tocca all'ultimo e viene tolto: si riparte dal primo, round dopo */
  assert.deepEqual(togliDaOrdine({ ordine: o, turno: 3, round: 2 }, "d"), { ordine: o.slice(0, 3), turno: 0, round: 3 });
  /* tocca a lui ma non è l'ultimo: il turno passa a chi viene dopo, stesso indice */
  assert.equal(togliDaOrdine({ ordine: o, turno: 1, round: 1 }, "b").ordine[1].id, "c");
});

import { media, leggiAzioni, scriviAzioni, leggiTratti, scriviTratti } from "../js/regole/nemici.js";

test("danno medio come nel manuale", () => {
  assert.equal(media("2d4+2 perforanti"), 7);
  assert.equal(media("2d6+3 taglienti + 1d6 fulmine"), 13);
  assert.equal(media("1d6+4 contundenti (1d8+4 a due mani)"), 7);
  assert.equal(media("trattenuto"), null);
});

test("azioni scritte una per riga e rilette uguali", () => {
  const a = leggiAzioni("Morso | +4 | 2d4+2 perforanti | TS For CD 11 o prono\nMultiattacco | Due morsi");
  assert.deepEqual(a[0], { nome: "Morso", colpire: 4, danni: "2d4+2 perforanti", medio: 7, nota: "TS For CD 11 o prono" });
  assert.deepEqual(a[1], { nome: "Multiattacco", nota: "Due morsi" });
  assert.deepEqual(leggiAzioni(scriviAzioni(a)), a);
  const t = leggiTratti("Tattiche di branco: vantaggio se un alleato è vicino");
  assert.deepEqual(leggiTratti(scriviTratti(t)), t);
});
