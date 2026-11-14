/* Un piccolo server web per provare l'app sul computer: npm start
   Serve i file della cartella del progetto su http://localhost:8080
   Perché serve: i moduli JavaScript (import/export) e, più avanti, il service worker
   non funzionano aprendo index.html con un doppio clic. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, resolve } from "node:path";
import { networkInterfaces } from "node:os";

const RADICE = resolve(import.meta.dirname, "..");
const PORTA = Number(process.env.PORT) || 8080;
const TIPI = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    let percorso = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = normalize(join(RADICE, percorso));
    if (!file.startsWith(RADICE)) { res.writeHead(403).end(); return; }   // niente uscite dalla cartella
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const corpo = await readFile(file);
    res.writeHead(200, { "Content-Type": TIPI[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(corpo);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Non trovato");
  }
}).listen(PORTA, () => {
  console.log(`App avviata: http://localhost:${PORTA}`);
  /* indirizzo per aprirla dal telefono, se è sulla stessa rete Wi-Fi */
  for (const reti of Object.values(networkInterfaces()))
    for (const r of reti || []) if (r.family === "IPv4" && !r.internal) console.log(`Dal telefono (stessa Wi-Fi): http://${r.address}:${PORTA}`);
  console.log("Per fermarla: Ctrl+C");
});
