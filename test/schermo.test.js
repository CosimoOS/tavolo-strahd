/* Test dell'altezza dello schermo: sull'iPhone, quando l'app è installata nella schermata Home, la pagina può
   risultare più corta dello schermo (di quanto è alta la fascia con l'orologio) e la barra in basso resta sollevata. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { altezzaPiena } from "../js/regole/schermo.js";

const iphone = { w: 402, h: 874 };

test("app installata sull'iPhone, pagina sotto l'orologio ma contata più corta di quella fascia: va coperta l'altezza dello schermo", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: iphone, finestra: { w: 402, h: 812 }, sopra: 62 }), 874);
});

test("iPhone che tiene la pagina sotto una fascia nera (non ci passa sotto): la finestra è davvero più corta, non si tocca niente", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: { w: 393, h: 852 }, finestra: { w: 393, h: 793 }, sopra: 0 }), null);
});

test("app installata e pagina già alta quanto lo schermo: resta l'altezza dello schermo (niente salti)", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: iphone, finestra: { w: 402, h: 874 }, sopra: 62 }), 874);
});

test("nel browser (non installata) non si tocca niente: lì le barre del browser occupano spazio vero", () => {
  assert.equal(altezzaPiena({ installata: false, schermo: iphone, finestra: { w: 402, h: 690 }, sopra: 0 }), null);
});

test("telefono girato: l'altezza da coprire è il lato corto dello schermo", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: iphone, finestra: { w: 874, h: 402 }, sopra: 0 }), 402);
});

test("finestra che non occupa tutto lo schermo (iPad diviso in due): non si tocca niente", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: { w: 1024, h: 1366 }, finestra: { w: 507, h: 1366 }, sopra: 24 }), null);
});

test("se manca più della fascia in alto non è questo difetto: non si tocca niente", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: iphone, finestra: { w: 402, h: 560 }, sopra: 62 }), null);
});

test("la pagina è contata più corta solo in parte (meno di una fascia intera): è lo stesso difetto, si copre lo schermo", () => {
  assert.equal(altezzaPiena({ installata: true, schermo: iphone, finestra: { w: 402, h: 832 }, sopra: 62 }), 874);
});
