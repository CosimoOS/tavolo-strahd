/* La barra dei PF, uguale ovunque (Tavolo, scontro): vita colorata, PF temporanei come un pezzo chiaro subito dopo,
   massimo ridotto (maledizioni, morsi) come un pezzo grigio in fondo. I conti stanno in regole/pf.js. */
import { segmentiBarra, massimo } from "./regole/pf.js";

/** S: { hp, maxhp, temp, riduzione }. */
export function htmlBarraPf(S) {
  const b = segmentiBarra(S), pct = S.hp / massimo(S), stato = pct <= .25 ? "low" : pct <= .5 ? "mid" : "ok";
  return `<span class="hpbar" data-state="${stato}"><i style="width:${b.vita}%"></i>${b.temp ? `<i class="pf-temp" style="left:${b.vita}%;width:${b.temp}%"></i>` : ""}${b.perso ? `<i class="pf-perso" style="left:auto;right:0;width:${b.perso}%"></i>` : ""}</span>`;
}
