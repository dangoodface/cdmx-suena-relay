// Reads the CDMX mobility board (official per-line service status for Metro, Metrobús,
// Trolebús and Cablebús) and posts the parsed rows to CDMX Suena. The board blocks
// Cloudflare's network, so this runs on GitHub Actions instead.
// Env: RELAY_TOKEN (secret), ENDPOINT (default https://cdmx.thegoodface.ai/api/status-ingest)
import { fetchSystem, SYSTEMS } from "./status.js";

const UA = "CDMXSuena-relay/1.0 (+https://cdmx.thegoodface.ai; Goodface)";
const endpoint = process.env.ENDPOINT || "https://cdmx.thegoodface.ai/api/status-ingest";
const systems = {}, errors = [];

for (const id of Object.keys(SYSTEMS)) {
  for (let attempt = 1; attempt <= 2 && !systems[id]; attempt++) {
    try { systems[id] = await fetchSystem(id, UA); }
    catch (e) { if (attempt === 2) errors.push(`${id}: ${e.message}`); else await new Promise((r) => setTimeout(r, 3000)); }
  }
}

const rows = Object.values(systems).reduce((a, r) => a + r.length, 0);
console.log(`board: ${Object.keys(systems).join(", ") || "none"} (${rows} rows)${errors.length ? ` · errors: ${errors.join("; ")}` : ""}`);
if (!rows) process.exit(1);

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RELAY_TOKEN}`, "user-agent": UA },
  body: JSON.stringify({ systems, errors }),
});
console.log("ingest:", res.status, await res.text());
if (!res.ok) process.exit(1);
