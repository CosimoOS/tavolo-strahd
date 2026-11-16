/* Test della sola lettura: per scaricare una copia dei dati veri senza che l'app nuova cambi niente. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { soloLettura } from "../js/archivio.js";

test("in sola lettura non si scrive niente, ma si continua a leggere", async () => {
  const scritti = [];
  const vero = { modalita: "firebase", async leggi(p) { return { p }; }, async scrivi(p, d) { scritti.push(["scrivi", p]); }, async aggiorna(p, c) { scritti.push(["aggiorna", p]); } };
  const a = soloLettura(vero);
  await a.scrivi("personaggi/petrus", { hp: 1 });
  await a.aggiorna("campagna/impostazioni", { tasha: true });
  assert.deepEqual(scritti, []);
  assert.deepEqual(await a.leggi("personaggi/petrus"), { p: "personaggi/petrus" });
  assert.equal(a.solaLettura, true);
});
