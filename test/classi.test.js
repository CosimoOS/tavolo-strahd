/* Test delle classi come dati e dei talenti. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERSONAGGI } from "../js/personaggi/index.js";
import { CLASSI } from "../js/classi/index.js";
import { componi } from "../js/classi/componi.js";
import { talentiDisponibili, talento } from "../js/regole/talenti.js";
import { stiliPer } from "../js/regole/stili.js";
import { calcola, clone } from "../js/regole/base.js";

const { rombosogliola, rex } = PERSONAGGI;

test("talenti: i requisiti escludono chi non li ha, Tasha solo se acceso", () => {
  const scoresRombo = rombosogliola.def.scores;
  const lista = talentiDisponibili({ scores: scoresRombo, magia: false, armature: ["leggera", "media", "pesante"], tasha: false }).map(t => t.id);
  assert.ok(lista.includes("robusto"));
  assert.ok(!lista.includes("cecchino-magico"));          // serve saper lanciare incantesimi
  assert.ok(!lista.includes("tocco-fatato"));             // Tasha spento
  assert.ok(!lista.includes("incantatore-rituale"));      // Int o Sag 13
  const conTasha = talentiDisponibili({ scores: scoresRombo, armature: ["pesante"], tasha: true }).map(t => t.id);
  assert.ok(conTasha.includes("tocco-fatato"));
  assert.ok(conTasha.includes("maestro-armature-pesanti"));
  assert.ok(!talentiDisponibili({ scores: scoresRombo, presi: ["robusto"] }).some(t => t.id === "robusto"));
});

test("talenti: gli effetti entrano nei numeri della scheda", () => {
  const S = clone(rombosogliola.def);
  S.asi = [{ level: 8, feat: "allerta" }, { level: 8, feat: "resiliente", scelta: "sag" }, { level: 8, feat: "osservatore", scelta: "sag" }];
  const X = calcola(rombosogliola, S), X0 = calcola(rombosogliola, rombosogliola.def);
  assert.equal(X.ini, X0.ini + 5);
  assert.equal(X.saves.sag, X0.saves.sag + X.P);
  assert.equal(X.pp, X0.pp + 5);
  assert.equal(talento("robusto").effetti.pfLivello, 2);
});

test("cosa arriva salendo di livello", () => {
  assert.deepEqual(rombosogliola.featuresAt(7).map(f => f[0]), ["Atleta straordinario"]);
  assert.ok(rombosogliola.featuresAt(8).some(f => /talento/.test(f[1])));
  assert.deepEqual(rex.featuresAt(7).map(f => f[0]), ["Vendicatore implacabile"]);
  assert.ok(rex.featuresAt(9).some(f => f[0] === "Slot di 3° livello"));
});

test("stili: per classe, quelli di Tasha solo se accesi", () => {
  assert.ok(stiliPer("paladino", ["Difesa"]).every(s => s.nome !== "Tiro" && s.nome !== "Difesa"));
  assert.ok(stiliPer("paladino", [], true).some(s => s.nome === "Guerriero benedetto"));
  assert.ok(!stiliPer("paladino", [], false).some(s => s.nome === "Guerriero benedetto"));
});

test("ranger cacciatore: le scelte arrivano ai livelli giusti", () => {
  const petrus = componi({ id: "petrus", name: "Petrus", classe: "ranger", sottoclasse: "cacciatore", tags: [], kv: [], skills: [],
    def: { level: 3, styles: [], scelte: [], weapons: [], scores: { for: 12, des: 16, cos: 14, int: 10, sag: 14, car: 8 } } }, CLASSI.ranger);
  const S = petrus.def;
  assert.deepEqual(petrus.scelte(3, S).map(c => c.id), ["preda"]);
  assert.deepEqual(petrus.scelte(6, S).map(c => c.id), ["nemico-prescelto", "terreno"]);
  assert.deepEqual(petrus.scelte(7, S).map(c => c.id), ["tattiche"]);
  const conPreda = { ...S, scelte: [{ livello: 3, id: "preda", valore: "colosso" }] };
  assert.ok(petrus.feats(3, calcola(petrus, conPreda), conPreda).some(f => f[0] === "Uccisore di colossi"));
});

test("Tasha acceso: compaiono Versatilità marziale e Nemico favorito", () => {
  const conTasha = componi({ ...rombosogliola, classe: "guerriero", sottoclasse: "campione", def: rombosogliola.def }, CLASSI.guerriero, () => ({ tasha: true }));
  assert.ok(conTasha.scelte(8, rombosogliola.def).some(c => c.tipo === "cambio-stile"));
  assert.equal(rombosogliola.scelte(8, rombosogliola.def).length, 0);
});
