# CDMX Suena relay

[CDMX Suena](https://cdmx.thegoodface.ai) turns Mexico City's live data into music and a map.
This tiny relay reads the official CDMX mobility board (per-line service status for Metro,
Metrobús, Trolebús and Cablebús, run by ADIP) every 5 minutes and posts it to the app, because
the board doesn't answer requests from Cloudflare's network.

- `status.js`: board reader (kept in sync with `websites/cdmx/src/status.js`).
- `relay.mjs`: fetches all systems and posts them with the `RELAY_TOKEN` secret.
- `.github/workflows/relay.yml`: every 5 minutes, plus manual runs.

Made by [Goodface](https://goodface.fogo-capital.com/).
