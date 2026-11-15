/* Stili di combattimento. classi: chi può sceglierli. fonte "Tasha": opzionali, solo se il master li usa. */
export const STILI = [
  { nome: "Difesa", testo: "+1 alla CA quando indossa un'armatura.", classi: ["guerriero", "paladino", "ranger"], fonte: "PHB" },
  { nome: "Tiro", testo: "+2 ai tiri per colpire con armi a distanza.", classi: ["guerriero", "ranger"], fonte: "PHB" },
  { nome: "Duellare", testo: "+2 ai danni con un'arma da mischia in una mano e nessun'altra arma.", classi: ["guerriero", "paladino", "ranger"], fonte: "PHB" },
  { nome: "Combattere con armi grandi", testo: "Ritira 1 e 2 sui dadi del danno con armi a due mani o versatili impugnate a due mani.", classi: ["guerriero", "paladino"], fonte: "PHB" },
  { nome: "Protezione", testo: "Con uno scudo, reazione per dare svantaggio a un attacco contro un alleato entro 1,5 m.", classi: ["guerriero", "paladino"], fonte: "PHB" },
  { nome: "Combattere con due armi", testo: "Aggiunge il modificatore al danno del secondo attacco.", classi: ["guerriero", "ranger"], fonte: "PHB" },
  { nome: "Combattere alla cieca", testo: "Vista cieca entro 3 m: vedi ciò che è invisibile o nascosto nel buio, se non si nasconde da te.", classi: ["guerriero", "paladino", "ranger"], fonte: "Tasha" },
  { nome: "Intercettare", testo: "Reazione: riduci di 1d10 + bonus di competenza i danni a una creatura entro 1,5 m (serve scudo o arma).", classi: ["guerriero", "paladino"], fonte: "Tasha" },
  { nome: "Tecnica superiore", testo: "Una manovra del Maestro di battaglia e un dado di superiorità d6 per riposo.", classi: ["guerriero"], fonte: "Tasha" },
  { nome: "Combattere con armi da lancio", testo: "Estrai un'arma da lancio come parte dell'attacco; +2 ai danni con le armi lanciate.", classi: ["guerriero", "ranger"], fonte: "Tasha" },
  { nome: "Combattere senz'armi", testo: "Colpi senz'armi 1d6 + For (1d8 a mani libere); 1d4 danni a chi afferri a inizio turno.", classi: ["guerriero"], fonte: "Tasha" },
  { nome: "Guerriero benedetto", testo: "Due trucchetti da chierico, che contano come incantesimi da paladino.", classi: ["paladino"], fonte: "Tasha" },
  { nome: "Guerriero druidico", testo: "Due trucchetti da druido, che contano come incantesimi da ranger.", classi: ["ranger"], fonte: "Tasha" },
];
export const STYLES = Object.fromEntries(STILI.map(s => [s.nome, s.testo]));
/** Gli stili tra cui può scegliere una classe, esclusi quelli che ha già. */
export const stiliPer = (classe, gia = [], tasha = false) =>
  STILI.filter(s => s.classi.includes(classe) && !gia.includes(s.nome) && (tasha || s.fonte !== "Tasha"));
