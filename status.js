// Official service status from the CDMX government's mobility board (ADIP), the same tray the
// Metrobús website embeds. It is an HTML (JSF/PrimeFaces) page, so we read the rows; Metro has
// 12 lines and the table pages at 10, so its second page needs the board's own ajax call.

export const BOARD = "https://incidentesmovilidad.cdmx.gob.mx/public/bandejaEstadoServicio.xhtml";
export const SYSTEMS = { stc: "Metro", mb: "Metrobús", ste: "Trolebús", cb: "Cablebús" };

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

// "stc1" → "1", "stca" → "A", "MB4" → "4", "TE9" → "9", "CB2" → "2"
export function lineOf(code) {
  const m = String(code || "").match(/^(stc|mb|te|cb)([a-z0-9]+)$/i);
  return m ? m[2].toUpperCase() : null;
}

export function parseRows(html) {
  const rows = [];
  for (const m of String(html).matchAll(/<tr data-ri="\d+"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const code = (m[1].match(/\/lineas\/([A-Za-z0-9]+)\.(?:png|svg)/) || [])[1] || null;
    const cells = [...m[1].matchAll(/<td role="gridcell" colspan="2"[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
    if (cells.length < 2) continue;
    rows.push({ code, line: lineOf(code), estado: cells[0] || "", estaciones: cells[1] || "", info: cells[2] || "" });
  }
  return rows;
}

export const isRegular = (r) => /^servicio regular$/i.test(r.estado) && (!r.estaciones || /^ninguna$/i.test(r.estaciones));

// Fetches every row for one system, following the pagination when needed.
export async function fetchSystem(id, ua, fetchFn = fetch) {
  const res = await fetchFn(`${BOARD}?idMedioTransporte=${id}`, { headers: { "user-agent": ua, accept: "text/html" } });
  if (!res.ok) throw new Error(`board ${id} ${res.status}`);
  const html = await res.text();
  const rows = parseRows(html);
  const total = Number((html.match(/ui-paginator-current[^>]*>\s*\(?\s*\d+\s*(?:de|of)\s*(\d+)/i) || [])[1]) || 0;
  const hasMore = rows.length >= 10 && (total > 1 || /ui-paginator-next(?![^"]*ui-state-disabled)/.test(html));
  if (!hasMore) return rows;
  const view = (html.match(/name="jakarta\.faces\.ViewState"[^>]*value="([^"]+)"/) || [])[1];
  const cookie = (res.headers.get("set-cookie") || "").split(/,(?=[^;]+=)/).map((c) => c.split(";")[0]).filter((c) => /JSESSIONID/i.test(c)).join("; ");
  if (!view) return rows;
  const body = new URLSearchParams({
    "jakarta.faces.partial.ajax": "true",
    "jakarta.faces.source": "frmEstadoServicio:tblEstadoServicio",
    "jakarta.faces.partial.execute": "frmEstadoServicio:tblEstadoServicio",
    "jakarta.faces.partial.render": "frmEstadoServicio:tblEstadoServicio",
    "frmEstadoServicio:tblEstadoServicio": "frmEstadoServicio:tblEstadoServicio",
    "frmEstadoServicio:tblEstadoServicio_pagination": "true",
    "frmEstadoServicio:tblEstadoServicio_first": "10",
    "frmEstadoServicio:tblEstadoServicio_rows": "10",
    "frmEstadoServicio:tblEstadoServicio_encodeFeature": "true",
    frmEstadoServicio: "frmEstadoServicio",
    "jakarta.faces.ViewState": view,
  });
  const page2 = await fetchFn(`${BOARD}?idMedioTransporte=${id}`, {
    method: "POST",
    headers: { "user-agent": ua, "content-type": "application/x-www-form-urlencoded; charset=UTF-8", "faces-request": "partial/ajax", "x-requested-with": "XMLHttpRequest", cookie },
    body,
  });
  if (!page2.ok) return rows;
  return rows.concat(parseRows(await page2.text()));
}

// Keeps "since when" for each incident across polls (the board only shows the current state).
export function track(prev, systems, now) {
  const seen = {};
  for (const r of prev || []) seen[`${r.sys}|${r.code}|${r.estado}|${r.estaciones}`] = r.since;
  const out = [];
  for (const [sys, rows] of Object.entries(systems)) {
    for (const r of rows) {
      const k = `${sys}|${r.code}|${r.estado}|${r.estaciones}`;
      out.push({ sys, ...r, regular: isRegular(r), since: seen[k] || now });
    }
  }
  return out;
}
