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
    def: { level: 3, styles: [], scelte: [], weapons: [], scores: { for: 12, des: 16, cos: 14, int: 10, sag: 14, car: 8 } } }, CLASSI);
  const S = petrus.def;
  assert.deepEqual(petrus.scelte(3, S).map(c => c.id), ["preda"]);
  assert.deepEqual(petrus.scelte(6, S).map(c => c.id), ["nemico-prescelto", "terreno"]);
  assert.deepEqual(petrus.scelte(7, S).map(c => c.id), ["tattiche"]);
  const conPreda = { ...S, scelte: [{ livello: 3, id: "preda", valore: "colosso" }] };
  assert.ok(petrus.feats(3, calcola(petrus, conPreda), conPreda).some(f => f[0] === "Uccisore di colossi"));
});

test("Tasha acceso: compaiono Versatilità marziale e Nemico favorito", () => {
  const conTasha = componi({ ...rombosogliola, classe: "guerriero", sottoclasse: "campione", def: rombosogliola.def }, CLASSI, () => ({ tasha: true }));
  assert.ok(conTasha.scelte(8, rombosogliola.def).some(c => c.tipo === "cambio-stile"));
  assert.equal(rombosogliola.scelte(8, rombosogliola.def).length, 0);
});

test("Petrus: Ranger 5 / Druido 1, i numeri della sua scheda", () => {
  const { petrus } = PERSONAGGI, X = calcola(petrus, petrus.def);
  assert.equal(petrus.classe, "Ranger 5 · Druido 1");
  assert.equal(X.P, 3);
  assert.equal(X.ini, 4);
  assert.equal(X.pp, 15);
  assert.deepEqual([X.saves.for, X.saves.des], [3, 7]);
  const sk = n => X.skills.find(s => s.n === n).v;
  assert.deepEqual([sk("Furtività"), sk("Natura"), sk("Percezione"), sk("Sopravvivenza")], [7, 4, 5, 5]);
  const a = Object.fromEntries(X.atk.map(w => [w.n, w]));
  assert.equal(a["Arco lungo"].hit, 9);            // Des +4, competenza +3, stile Tiro +2
  assert.equal(a["Arco lungo · freccia +1"].hit, 10);
  assert.equal(a["Spada corta"].hit, 7);
  assert.equal(a["Pugnale +1"].mod, 5);
  assert.equal(petrus.attacks(6), 2);
  /* slot del multiclasse: livello da incantatore 2 (ranger 5 / 2) + 1 (druido) = 3 → 4 e 2 */
  assert.deepEqual(petrus.risorse(6, X, petrus.def).filter(r => /^slot/.test(r.k)).map(r => r.max), [4, 2]);
  const [r, d] = petrus.magie(6, X, petrus.def);
  assert.deepEqual([r.nome, r.limite, r.max, r.chiave], ["Ranger", 4, 2, "conosciuti"]);
  assert.deepEqual([d.nome, d.limite, d.max, d.trucchetti.limite], ["Druido", 3, 1, 2]);
  assert.equal(d.testo, "CD 13 · +5 per colpire");
  assert.ok(petrus.feats(6, X, petrus.def).some(f => f[0] === "Uccisore di colossi"));
  assert.equal(petrus.dadiVita(petrus.def), "5d10 + 1d8");
});

test("multiclasse: si sceglie quale classe sale", () => {
  const { petrus } = PERSONAGGI;
  assert.deepEqual(petrus.classiPerLivello(petrus.def).map(c => [c.id, c.livello]), [["ranger", 5], ["druido", 1]]);
  const r6 = petrus.passo(petrus.def, "ranger"), d2 = petrus.passo(petrus.def, "druido");
  assert.equal(r6.livello, 6); assert.equal(r6.pfMedia, 6);
  assert.deepEqual(r6.scelte.map(c => c.id), ["nemico-prescelto", "terreno"]);
  assert.equal(d2.livello, 2); assert.equal(d2.pfMedia, 5);
  assert.deepEqual(d2.scelte.map(c => c.id), ["circolo"]);
});
