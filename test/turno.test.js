/* Test delle azioni del turno (Manuale del giocatore): Attacco extra, incantesimi, Azione impetuosa, bonus e reazione. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { statoTurno, dopoAttacco, dopoAzione, dopoBonus, conImpetuosa, giraAzione, giraBonus, impetuosaPronta, reazioneTornata, reazioneLibera, chiaveTurno } from "../js/regole/turno.js";

const K = "s1:2:0", USI = { usate: 0, max: 1 };

test("Attacco extra: due attacchi, poi niente più attacchi", () => {
  let az = dopoAttacco(null, K, 2);
  let s = statoTurno(az, K, 2);
  assert.equal(s.prossimoAttacco, 2);
  assert.equal(s.puoAttaccare, true);
  assert.equal(s.puoAzione, false, "a metà dell'azione d'attacco non si lancia un incantesimo");
  az = dopoAttacco(az, K, 2);
  s = statoTurno(az, K, 2);
  assert.equal(s.puoAttaccare, false);
  assert.equal(s.puoAzione, false);
});

test("Azione impetuosa: solo quando gli attacchi sono finiti, poi altri due attacchi o un incantesimo", () => {
  let az = dopoAttacco(null, K, 2);
  assert.equal(impetuosaPronta(az, K, 2, USI), false, "resta ancora un attacco");
  az = dopoAttacco(az, K, 2);
  assert.equal(impetuosaPronta(az, K, 2, USI), true);
  az = conImpetuosa(az, K);
  assert.equal(impetuosaPronta(az, K, 2, USI), false, "una volta per turno");
  let s = statoTurno(az, K, 2);
  assert.equal(s.puoAttaccare, true);
  assert.equal(s.puoAzione, true);
  az = dopoAttacco(dopoAttacco(az, K, 2), K, 2);
  assert.equal(statoTurno(az, K, 2).puoAttaccare, false, "quattro attacchi e basta");
  assert.equal(impetuosaPronta(az, K, 2, { usate: 1, max: 1 }), false);
});

test("un incantesimo costa l'azione intera", () => {
  const az = dopoAzione(null, K);
  const s = statoTurno(az, K, 2);
  assert.equal(s.puoAttaccare, false);
  assert.equal(impetuosaPronta(az, K, 2, USI), true);
});

test("un turno nuovo riparte da zero", () => {
  const az = dopoBonus(dopoAzione(null, K), K);
  assert.equal(statoTurno(az, K).bonus, true);
  const nuovo = statoTurno(az, "s1:2:1");
  assert.equal(nuovo.bonus, false);
  assert.equal(nuovo.puoAttaccare, true);
  assert.equal(chiaveTurno({ id: "s1", round: 2, turno: 0 }), K);
  assert.equal(statoTurno({ chiave: K, azioni: 1, attacchi: 0 }, K).puoAttaccare, true, "conto della versione vecchia: si riparte");
});

test("i gettoni si girano a mano (eccezioni concesse dal master)", () => {
  let az = giraAzione(null, K);
  assert.equal(statoTurno(az, K).puoAttaccare, false);
  az = giraAzione(az, K);
  assert.equal(statoTurno(az, K).puoAttaccare, true);
  assert.equal(giraBonus(giraBonus(null, K), K).bonus, false);
});

test("la reazione torna all'inizio del proprio turno", () => {
  const usata = { scontro: "s1", round: 2, turno: 3 };
  assert.equal(reazioneTornata(usata, { round: 2, turno: 4 }, 1), false);
  assert.equal(reazioneTornata(usata, { round: 3, turno: 0 }, 1), false);
  assert.equal(reazioneTornata(usata, { round: 3, turno: 1 }, 1), true);
  assert.equal(reazioneTornata(usata, { round: 2, turno: 5 }, 5), true);
  assert.equal(reazioneLibera(usata, { id: "altro", round: 2, turno: 4, ordine: [] }, "x"), true);
  assert.equal(reazioneLibera(null, { id: "s1" }, "x"), true);
});

test("Azione impetuosa: un Dardo con l'azione e un altro Dardo con l'azione in più (regola del master)", () => {
  let az = dopoAzione(null, K);                                   // primo Dardo caotico: un'azione intera
  assert.equal(statoTurno(az, K, 2).puoAzione, false);
  assert.equal(impetuosaPronta(az, K, 2, USI), true);
  az = conImpetuosa(az, K);
  assert.equal(statoTurno(az, K, 2).puoAzione, true, "con l'azione in più si può lanciare di nuovo");
  az = dopoAzione(az, K);                                         // secondo Dardo
  assert.equal(statoTurno(az, K, 2).puoAzione, false);
});

test("incantesimo con l'azione bonus: con l'azione, nello stesso turno, solo trucchetti (Manuale del giocatore)", async () => {
  const { puoIncantesimo } = await import("../js/regole/turno.js");
  let az = dopoBonus(null, K, { incantesimo: true });
  assert.equal(puoIncantesimo(az, K, { come: "azione", livello: 1 }), false);
  assert.equal(puoIncantesimo(az, K, { come: "azione", livello: 0 }), true, "un trucchetto sì");
  assert.equal(puoIncantesimo(dopoBonus(null, K), K, { come: "azione", livello: 1 }), true, "Recuperare energie non è un incantesimo");
});

test("incantesimo di livello con l'azione: poi niente incantesimi con l'azione bonus", async () => {
  const { puoIncantesimo } = await import("../js/regole/turno.js");
  const az = dopoAzione(null, K, { livello: 1 });
  assert.equal(puoIncantesimo(az, K, { come: "bonus", livello: 1 }), false);
  assert.equal(puoIncantesimo(dopoAzione(null, K, { livello: 0 }), K, { come: "bonus", livello: 1 }), true, "dopo un trucchetto sì");
  assert.equal(puoIncantesimo(null, K, { come: "bonus", livello: 1 }), true);
});
