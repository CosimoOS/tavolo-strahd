/* Test dello zaino: sintonia (al massimo tre oggetti), quantità, togliere un oggetto, cosa mostra una riga. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cambiaSintonia, cambiaQuantita, togliOggetto, rigaZaino } from "../js/regole/zaino.js";

test("mettere un oggetto in sintonia", () => {
  assert.deepEqual(cambiaSintonia([], "Armatura Cremesi"), { inSintonia: ["Armatura Cremesi"], esito: "messa" });
});

test("toccare di nuovo un oggetto in sintonia la toglie", () => {
  assert.deepEqual(cambiaSintonia(["Anello", "Armatura Cremesi"], "Anello"), { inSintonia: ["Armatura Cremesi"], esito: "tolta" });
});

test("con tre oggetti già in sintonia il quarto non entra, e l'esito lo dice", () => {
  const tre = ["Anello", "Mantello", "Spada"];
  assert.deepEqual(cambiaSintonia(tre, "Bastone"), { inSintonia: tre, esito: "piena" });
});

test("cambiare la quantità tiene la sintonia sullo stesso oggetto", () => {
  assert.deepEqual(cambiaQuantita({ inv: ["Torce ×10", "Scudo"], inSintonia: ["Torce ×10"] }, 0, -1),
    { inv: ["Torce ×9", "Scudo"], inSintonia: ["Torce ×9"] });
});

test("la quantità non scende sotto uno: per togliere l'oggetto c'è il suo comando", () => {
  assert.deepEqual(cambiaQuantita({ inv: ["Scudo"], inSintonia: [] }, 0, -1), { inv: ["Scudo"], inSintonia: [] });
});

test("da uno a due l'oggetto prende il numero", () => {
  assert.deepEqual(cambiaQuantita({ inv: ["Acciarino"], inSintonia: [] }, 0, 1), { inv: ["Acciarino ×2"], inSintonia: [] });
});

test("togliere un oggetto toglie anche la sua sintonia e dice che cosa è uscito", () => {
  assert.deepEqual(togliOggetto({ inv: ["Anello", "Scudo"], inSintonia: ["Anello"] }, 0),
    { inv: ["Scudo"], inSintonia: [], tolto: "Anello" });
});

test("due oggetti uguali: toglierne uno non tocca la sintonia dell'altro", () => {
  assert.deepEqual(togliOggetto({ inv: ["Anello", "Anello"], inSintonia: ["Anello"] }, 1),
    { inv: ["Anello"], inSintonia: ["Anello"], tolto: "Anello" });
});

test("riga dello zaino: nome con la maiuscola, quantità e sintonia", () => {
  assert.deepEqual(rigaZaino("torce ×10", ["torce ×10"]), { nome: "Torce", n: 10, sintonia: true });
  assert.deepEqual(rigaZaino("Acciarino e pietra focaia", []), { nome: "Acciarino e pietra focaia", n: 1, sintonia: false });
});
