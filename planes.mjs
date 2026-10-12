// Aircraft around Mexico City's airport (AICM) for CDMX Suena. The public ADS-B feeds refuse
// Cloudflare's network, so this runs every 30 s from the same machine as the status relay.
// Env: RELAY_TOKEN, PLANES_ENDPOINT (default https://cdmx.thegoodface.ai/api/planes-ingest)
const UA = "CDMXSuena-relay/1.0 (+https://cdmx.thegoodface.ai; Goodface)";
const endpoint = process.env.PLANES_ENDPOINT || "https://cdmx.thegoodface.ai/api/planes-ingest";
const sources = [
  ["adsb.lol", "https://api.adsb.lol/v2/point/19.436/-99.072/40"],
  ["airplanes.live", "https://api.airplanes.live/v2/point/19.436/-99.072/40"],
];
let feed = null, src = null;
for (const [name, url] of sources) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    if (res.ok) { feed = await res.json(); src = name; break; }
  } catch { /* next source */ }
}
if (!feed) { console.log("planes: no source answered"); process.exit(1); }
const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.RELAY_TOKEN}`, "user-agent": UA }, body: JSON.stringify({ src, feed }) });
console.log(`planes: ${src} ${(feed.ac || []).length} → ${res.status} ${await res.text()}`);
