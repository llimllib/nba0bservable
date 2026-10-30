# Traffic: who reads /nba, and from where

Written 2026-10-30 from a design conversation. Update it when a decision
changes.

## What

A private-ish report of visitors to `billmill.org/nba`: a chart of
visitors and page views per day, the most-visited paths, and which
referrers sent people to which paths. It's a static page on the server,
`billmill.org/static/nba-traffic.html`, next to goaccess's
`access.html`, rebuilt hourly by cron. The code is `ops/traffic/` in this
repo; it isn't part of the Astro site.

## Decisions

- **Visitors, not hits.** Crawlers make hits nearly meaningless. A
  visitor is a distinct IP + user agent, goaccess's definition; in a
  window (7d, 30d) someone who comes back on three days counts once. No
  bot filtering beyond that: the volume is low.
- **Keep our own history.** Every site on the server shares
  `/var/log/caddy/access.log` (10MB × 10 rolls), which holds about four
  days. So an hourly script appends /nba page requests to SQLite
  (`/var/lib/nba-traffic/traffic.db`), and the report reads only that.
  A unique key on (ts, ip, path) makes rereading every log file each hour
  harmless: no state, no gaps when a log rolls.
- **No separate Caddy log.** Filtering the shared log is one `if`;
  splitting it would mean a Caddyfile change, and the repo copy of the
  Caddyfile (`~/code/Newsite/ops/Caddyfile`) has already drifted from the
  server's.
- **Pages only**: host `billmill.org`, path under `/nba`, status 200 or
  304, GET, no file extension, not `_astro/` or `fonts/`. The query string
  is stored but not reported.
- **Referrers** are reported by domain, expandable to full URLs.
  `billmill.org` is "internal", none is "direct"; both are summed into
  one line under the table rather than listed.
- **Days are US Eastern.** Python 3.8 on the server has no `zoneinfo`, so
  the script sets `TZ` and calls `time.tzset()`, and stores each
  request's day at ingest.
- **Standard library only**, one file, Python 3.8: nothing to install.
  The page is plain HTML with an inline SVG chart and no JS, in the
  site's spirit (rules, not boxes) without its fonts.

## Not doing

Bot filtering, sessions, query-string (team/season) breakdowns, a page
in the Astro site. Revisit if the numbers get noisy.
