# CDMX Suena relay

[CDMX Suena](https://cdmx.thegoodface.ai) turns Mexico City's live data into music and a map.
This tiny relay reads the official CDMX mobility board (per-line service status for Metro,
Metrobús, Trolebús and Cablebús, run by ADIP) and posts it to the app. The board only answers
home/local connections (it times out from Cloudflare and from GitHub Actions), so it runs every
3 minutes as a systemd user timer on a machine in Mexico City. The workflow is kept, disabled,
for manual tests.

- `status.js`: board reader (kept in sync with `websites/cdmx/src/status.js`).
- `relay.mjs`: fetches all systems and posts them with the `RELAY_TOKEN` secret.
- `.github/workflows/relay.yml`: disabled (GitHub's runners are blocked by the board).
- Local timer: `~/.config/systemd/user/cdmx-relay.{service,timer}`, env in `~/.config/cdmx-suena/relay.env`.

Made by [Goodface](https://goodface.fogo-capital.com/).
