/* Le classi disponibili. Per una classe nuova: un file qui accanto e una riga in questo elenco. */
import guerriero from "./guerriero.js";
import paladino from "./paladino.js";
import ranger from "./ranger.js";
import seguaceGuerriero from "./seguace-guerriero.js";
import druido from "./druido.js";

export const CLASSI = { guerriero, paladino, ranger, druido, "seguace-guerriero": seguaceGuerriero };
