/* Test dei nemici: parole delle ferite, nomi numerati, branco o uno per uno, sconfitti tolti dai turni. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ferite, danno, cura, nomiNumerati, schiera, togliDaOrdine } from "../js/regole/nemici.js";

test("ai giocatori arriva una parola sola", () => {
  assert.equal(ferite(11, 11), "illeso");
  assert.equal(ferite(10, 11), "ferito");
  assert.equal(ferite(3, 12), "in fin di vita");   // esattamente un quarto
  assert.equal(ferite(4, 12), "a metà");
  assert.equal(ferite(6, 12), "a metà");                // esattamente metà
  assert.equal(ferite(7, 12), "ferito");
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

import { chiaro, fonteChiara, incantesimi } from "../js/regole/nemici.js";

test("abbreviazioni sciolte per il master", () => {
  assert.equal(chiaro("TS Sag CD 14 o affascinato"), "tiro salvezza su Saggezza CD 14 o affascinato");
  assert.equal(chiaro("Fuga con For CD 12"), "Fuga con Forza CD 12");
  assert.equal(chiaro("Vantaggio ai TS contro incantesimi"), "Vantaggio ai tiri salvezza contro incantesimi");
  assert.equal(fonteChiara("CoS p.231"), "Maledizione di Strahd, pagina 231");
  assert.equal(fonteChiara("MM p.341 / PHB app. D"), "Manuale dei Mostri, pagina 341 · Manuale del Giocatore, appendice D");
});

test("incantesimi divisi per livello", () => {
  const r = incantesimi("Maga di 7° livello, CD 14, +6. Trucchetti: dardo di fuoco, luce. 1° (4): scudo, dardo incantato. 4° (1): invisibilità superiore.");
  assert.equal(r.intro, "Maga di 7° livello, CD 14, +6");
  assert.deepEqual(r.livelli.map(l => l.livello), [0, 1, 4]);
  assert.equal(r.livelli[1].elenco, "scudo, dardo incantato");
  assert.equal(incantesimi("1°: sonno. 2°: invisibilità").livelli[1].elenco, "invisibilità");
});

import { inserisciInOrdine, trasforma } from "../js/regole/nemici.js";

test("rinforzi a scontro iniziato: entrano al posto giusto e il turno resta a chi lo aveva", () => {
  const o = [{ id: "a", tot: 20 }, { id: "b", tot: 15 }, { id: "c", tot: 10 }];
  const r = inserisciInOrdine({ ordine: o, turno: 2 }, { id: "x", tot: 15 });
  assert.deepEqual(r.ordine.map(v => v.id), ["a", "b", "x", "c"]);
  assert.equal(r.turno, 3);                                   // tocca ancora a "c"
  assert.equal(inserisciInOrdine({ ordine: o, turno: 0 }, { id: "y", tot: 5 }).turno, 0);
  assert.deepEqual(inserisciInOrdine({ ordine: o, turno: 0 }, { id: "z", tot: 25 }).ordine[0].id, "z");
});

test("trasformazione: nuovo modello, ferite conservate", () => {
  const civile = { id: "n7", creatura: "popolano", nome: "Popolano", giocatori: "Popolano", tipo: "alleato", pf: 2, max: 4, ca: 10, ini: 0 };
  const lupo = { id: "lupo-mannaro", nome: "Lupo mannaro", giocatori: "Uomo lupo", pf: 58, ca: 12, ini: 1 };
  const t = trasforma(civile, lupo);
  assert.equal(t.pf, 56); assert.equal(t.max, 58); assert.equal(t.ca, 12);
  assert.equal(t.tipo, "alleato");                             // lo schieramento si cambia a parte
  assert.equal(t.id, "n7");
  assert.equal(trasforma({ ...civile, pf: 0, max: 100 }, lupo).pf, 1);
});

import { inserisciDopo, sistemaEvocati } from "../js/regole/nemici.js";

test("evocati: subito dopo l'evocatore, dal round dopo al posto della loro iniziativa", () => {
  const o = [{ id: "rombo", tot: 20 }, { id: "strahd", tot: 15 }, { id: "rex", tot: 10 }];
  const a = inserisciDopo({ ordine: o, turno: 1 }, { id: "lupi", tot: 22, evocati: 2 }, "strahd");
  assert.deepEqual(a.ordine.map(v => v.id), ["rombo", "strahd", "lupi", "rex"]);
  assert.equal(a.turno, 1);                                    // tocca ancora a Strahd
  assert.equal(sistemaEvocati({ ...a, round: 2 }), null);      // stesso round: restano lì
  const b = sistemaEvocati({ ordine: a.ordine, turno: 0, round: 3 });
  assert.deepEqual(b.ordine.map(v => v.id), ["lupi", "rombo", "strahd", "rex"]);
  assert.equal(b.turno, 0);                                    // nuovo round: si parte dai lupi, ora primi
  assert.equal(b.ordine[0].evocati, undefined);
  const c = sistemaEvocati({ ordine: a.ordine, turno: 3, round: 3 });   // a metà round: il turno resta a Rex
  assert.equal(c.ordine[c.turno].id, "rex");
});

test("mostri nascosti: il segno arriva a creature e gruppi", () => {
  const { creature, gruppi } = schiera([{ creatura: "lupo", quanti: 2, modo: "branco", nascosto: true }, { creatura: "strega", quanti: 1, modo: "uno" }], B);
  assert.deepEqual(creature.map(c => !!c.nascosto), [true, true, false]);
  assert.deepEqual(gruppi.map(g => !!g.nascosto), [true, false]);
});
