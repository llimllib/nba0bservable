#!/usr/bin/env python3
"""Visitors to billmill.org/nba, from Caddy's access logs.

Appends /nba page requests from the logs to SQLite, then writes a static
HTML report from SQLite. Run hourly by cron; see README.md. Standard
library only, Python 3.8 (the server's).
"""

from __future__ import annotations

import argparse
import glob
import gzip
import html
import json
import os
import sqlite3
import sys
import time
from collections import defaultdict
from datetime import date, datetime, timedelta
from urllib.parse import urlsplit

HOST = "billmill.org"
PREFIX = "/nba"
TZ = "America/New_York"
CHART_DAYS = 60

SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
  ts REAL NOT NULL,
  day TEXT NOT NULL,
  ip TEXT NOT NULL,
  ua TEXT NOT NULL,
  path TEXT NOT NULL,
  query TEXT NOT NULL,
  referrer TEXT NOT NULL,
  status INTEGER NOT NULL,
  UNIQUE (ts, ip, path)
);
CREATE INDEX IF NOT EXISTS requests_ts ON requests (ts);
"""


def is_page(path: str) -> bool:
    if path != PREFIX and not path.startswith(PREFIX + "/"):
        return False
    if path.startswith((PREFIX + "/_astro/", PREFIX + "/fonts/")):
        return False
    return "." not in path.rsplit("/", 1)[-1]


def first(headers: dict, name: str) -> str:
    values = headers.get(name) or [""]
    return values[0]


def parse(line: str) -> tuple | None:
    """A row for the requests table, or None if the line isn't a page view."""
    # Most lines are other sites or assets; skip them before parsing JSON
    if '"' + PREFIX not in line:
        return None
    try:
        entry = json.loads(line)
        request = entry["request"]
        if request["host"] != HOST or request["method"] != "GET":
            return None
        if entry["status"] not in (200, 304):
            return None
        uri = request["uri"].split("#", 1)[0]
        path, _, query = uri.partition("?")
        if not is_page(path):
            return None
        ts = float(entry["ts"])
        headers = request.get("headers") or {}
        return (
            ts,
            datetime.fromtimestamp(ts).date().isoformat(),
            request.get("client_ip") or request["remote_ip"],
            first(headers, "User-Agent"),
            path,
            query,
            first(headers, "Referer"),
            entry["status"],
        )
    except (ValueError, KeyError, TypeError):
        return None


def ingest(db: sqlite3.Connection, paths: list[str]) -> int:
    before = db.total_changes
    for path in paths:
        opener = gzip.open if path.endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8", errors="replace") as f:
            rows = (row for row in map(parse, f) if row)
            db.executemany(
                "INSERT OR IGNORE INTO requests VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                rows,
            )
    db.commit()
    return db.total_changes - before


# Report


def referrer_domain(referrer: str) -> str:
    """The referrer's host without www., "internal", or "direct"."""
    if not referrer:
        return "direct"
    host = (urlsplit(referrer).hostname or referrer).lower()
    if host == HOST or host.endswith("." + HOST):
        return "internal"
    return host[4:] if host.startswith("www.") else host


def e(value) -> str:
    return html.escape(str(value), quote=True)


def num(n: int) -> str:
    return f"{n:,}" if n else '<span class="zero">·</span>'


def chart(days: list[tuple[date, int, int]]) -> str:
    """Bars per day: page views light, visitors dark in front of them."""
    width, height = 960, 240
    top, bottom, left, right = 24, 28, 36, 8
    plot_h = height - top - bottom
    slot = (width - left - right) / len(days)
    bar = max(slot - 2, 1)
    peak = max([views for _, _, views in days] + [1])
    step = nice_step(peak)
    ymax = step * -(-peak // step)

    def y(v: float) -> float:
        return top + plot_h - v / ymax * plot_h

    out = [
        (
            f'<svg viewBox="0 0 {width} {height}" role="img" '
            'aria-label="Visitors and page views per day">'
        )
    ]
    for tick in range(0, ymax + 1, step):
        cls = "zero-line" if tick == 0 else "grid"
        out.append(
            f'<line class="{cls}" x1="{left}" x2="{width - right}" '
            f'y1="{y(tick):.1f}" y2="{y(tick):.1f}"/>'
            f'<text class="tick" x="{left - 6}" y="{y(tick) + 4:.1f}" '
            f'text-anchor="end">{tick:,}</text>'
        )
    for i, (day, visitors, views) in enumerate(days):
        x = left + i * slot + (slot - bar) / 2
        label = f"{day:%a %b %-d}: {visitors:,} visitors, {views:,} page views"
        out.append(f"<g><title>{e(label)}</title>")
        if views:
            out.append(
                f'<rect class="views" x="{x:.1f}" y="{y(views):.1f}" '
                f'width="{bar:.1f}" height="{y(0) - y(views):.1f}"/>'
            )
        if visitors:
            out.append(
                f'<rect class="visitors" x="{x:.1f}" y="{y(visitors):.1f}" '
                f'width="{bar:.1f}" height="{y(0) - y(visitors):.1f}"/>'
            )
        if visitors and slot >= 16:
            out.append(
                f'<text class="count" x="{x + bar / 2:.1f}" '
                f'y="{y(views) - 4:.1f}" text-anchor="middle">{visitors}</text>'
            )
        out.append("</g>")
        if day.weekday() == 0 or len(days) <= 14:
            out.append(
                f'<text class="tick" x="{x:.1f}" y="{height - 8}">{day:%b %-d}</text>'
            )
    out.append("</svg>")
    return "".join(out)


def nice_step(peak: int) -> int:
    """A round gridline step giving about four lines up to peak."""
    raw = max(peak / 4, 1)
    magnitude = 10 ** (len(str(int(raw))) - 1)
    for m in (1, 2, 5, 10):
        if m * magnitude >= raw:
            return m * magnitude
    return 10 * magnitude


def daily(db: sqlite3.Connection, today: date) -> list[tuple[date, int, int]]:
    counts = {
        day: (visitors, views)
        for day, visitors, views in db.execute(
            "SELECT day, COUNT(DISTINCT ip || ' ' || ua), COUNT(*) "
            "FROM requests GROUP BY day"
        )
    }
    first_day = date.fromisoformat(min(counts)) if counts else today
    n = min(CHART_DAYS, max(14, (today - first_day).days + 1))
    days = [today - timedelta(days=i) for i in range(n - 1, -1, -1)]
    return [(d, *counts.get(d.isoformat(), (0, 0))) for d in days]


def paths_table(db: sqlite3.Connection, now: float) -> str:
    rows = db.execute(
        """
        SELECT path,
          COUNT(DISTINCT CASE WHEN ts >= :d1 THEN ip || ' ' || ua END),
          COUNT(DISTINCT CASE WHEN ts >= :d7 THEN ip || ' ' || ua END),
          COUNT(DISTINCT CASE WHEN ts >= :d30 THEN ip || ' ' || ua END),
          COUNT(DISTINCT ip || ' ' || ua),
          SUM(ts >= :d7)
        FROM requests GROUP BY path
        ORDER BY 3 DESC, 5 DESC, path
        """,
        {"d1": now - 86400, "d7": now - 7 * 86400, "d30": now - 30 * 86400},
    ).fetchall()
    body = "".join(
        f'<tr><td><a href="https://{HOST}{e(path)}">{e(path)}</a></td>'
        f"<td>{num(d1)}</td><td>{num(d7)}</td><td>{num(d30)}</td>"
        f'<td>{num(total)}</td><td class="aside">{num(views7)}</td></tr>'
        for path, d1, d7, d30, total, views7 in rows
    )
    return (
        "<table><thead><tr><th>Path</th><th>24h</th><th>7d</th><th>30d</th>"
        '<th>All</th><th class="aside">Views 7d</th></tr></thead>'
        f"<tbody>{body}</tbody></table>"
    )


def referrers_table(db: sqlite3.Connection, now: float) -> str:
    d7, d30 = now - 7 * 86400, now - 30 * 86400
    # Visitors in 30d and 7d, per domain and per (domain, path); and the
    # full referrer URLs per domain
    month, week = defaultdict(set), defaultdict(set)
    urls = defaultdict(lambda: defaultdict(set))
    for ts, ip, ua, path, referrer in db.execute(
        "SELECT ts, ip, ua, path, referrer FROM requests WHERE ts >= ?", (d30,)
    ):
        visitor = (ip, ua)
        domain = referrer_domain(referrer)
        for key in (domain, (domain, path)):
            month[key].add(visitor)
            if ts >= d7:
                week[key].add(visitor)
        urls[domain][referrer].add(visitor)

    def by_visitors(key) -> tuple:
        return (-len(month[key]), -len(week[key]), str(key))

    domains = [
        k for k in month if isinstance(k, str) and k not in ("internal", "direct")
    ]
    body = []
    for domain in sorted(domains, key=by_visitors):
        body.append(
            f'<tr class="domain"><td colspan="2">{e(domain)}'
            f"{url_list(urls[domain])}</td>"
            f"<td>{num(len(week[domain]))}</td><td>{num(len(month[domain]))}</td></tr>"
        )
        paths = [k for k in month if isinstance(k, tuple) and k[0] == domain]
        for key in sorted(paths, key=by_visitors):
            body.append(
                f'<tr><td></td><td class="text">{e(key[1])}</td>'
                f"<td>{num(len(week[key]))}</td><td>{num(len(month[key]))}</td></tr>"
            )
    if not body:
        body.append('<tr><td colspan="4" class="aside">None yet</td></tr>')
    note = (
        f"Not listed, 30d: {len(month['direct']):,} direct visitors (no "
        f"referrer), {len(month['internal']):,} internal (from another "
        "/nba page)."
    )
    return (
        '<table class="referrers"><thead><tr><th>Referrer</th>'
        '<th class="text">Path</th><th>7d</th><th>30d</th></tr></thead>'
        f"<tbody>{''.join(body)}</tbody></table>"
        f'<p class="aside">{note}</p>'
    )


def url_list(urls: dict) -> str:
    """The full referrer URLs, if any says more than the bare domain."""
    if all(urlsplit(url).path in ("", "/") for url in urls):
        return ""
    items = "".join(
        f'<li>{link(url)} <span class="aside">{len(v)}</span></li>'
        for url, v in sorted(urls.items(), key=lambda u: (-len(u[1]), u[0]))
    )
    return f"<details><summary>URLs</summary><ul>{items}</ul></details>"


def link(url: str) -> str:
    """A link for a referrer URL; it's request data, so only http(s)."""
    if urlsplit(url).scheme in ("http", "https"):
        return f'<a href="{e(url)}" rel="noreferrer nofollow">{e(url)}</a>'
    return e(url)


def report(db: sqlite3.Connection) -> str:
    now = time.time()
    today = datetime.fromtimestamp(now).date()
    days = daily(db, today)
    since = db.execute("SELECT MIN(ts) FROM requests").fetchone()[0]
    since_text = (
        f"{datetime.fromtimestamp(since):%b %-d, %Y}" if since else "nothing yet"
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Step Back Club traffic</title>
<style>{CSS}</style>
</head>
<body>
<header>
<h1>Step Back Club traffic</h1>
<p class="aside">billmill.org/nba · history since {e(since_text)} ·
generated {datetime.fromtimestamp(now):%a %b %-d, %-I:%M %p} Eastern ·
a visitor is a distinct IP and user agent</p>
</header>
<h2>Per day</h2>
<p class="legend"><span class="swatch visitors"></span> visitors
<span class="swatch views"></span> page views
<span class="aside">(numbers are visitors)</span></p>
{chart(days)}
<h2>Paths <span class="aside">visitors</span></h2>
{paths_table(db, now)}
<h2>Referrers <span class="aside">visitors, last 30 days</span></h2>
{referrers_table(db, now)}
</body>
</html>
"""


CSS = """
:root { --ink: #111; --muted: #6b6b6b; --light: #c8c8c8; --rule: #ddd; }
body { color: var(--ink); background: #fff; margin: 2rem auto;
  max-width: 960px; padding: 0 1rem;
  font: 15px/1.4 system-ui, -apple-system, sans-serif; }
header { border-bottom: 3px solid var(--ink); margin-bottom: 1rem; }
h1 { font-size: 2rem; text-transform: uppercase; letter-spacing: .02em;
  margin: 0 0 .25rem; }
h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid var(--ink); padding-bottom: .25rem;
  margin: 2rem 0 .5rem; }
.aside { color: var(--muted); font-weight: normal; text-transform: none;
  letter-spacing: 0; }
a { color: inherit; }
svg { width: 100%; height: auto; display: block; }
svg .views { fill: var(--light); }
svg .visitors { fill: var(--ink); }
svg .grid { stroke: var(--rule); }
svg .zero-line { stroke: var(--ink); stroke-width: 1.5; }
svg text { font: 11px system-ui, sans-serif; fill: var(--muted); }
svg .count { fill: var(--ink); font-size: 10px;
  font-variant-numeric: tabular-nums; }
.legend { margin: 0 0 .5rem; }
.swatch { display: inline-block; width: .8em; height: .8em;
  vertical-align: -.05em; margin-left: .5em; }
.swatch.visitors { background: var(--ink); }
.swatch.views { background: var(--light); }
table { border-collapse: collapse; width: 100%;
  font-variant-numeric: tabular-nums; }
th, td { text-align: right; padding: .3rem .5rem;
  border-bottom: 1px solid var(--rule); vertical-align: top; }
th { border-bottom: 1px solid var(--ink); font-weight: 600; }
td:first-child, th:first-child { text-align: left; padding-left: 0; }
th.text, td.text { text-align: left; }
.zero { color: var(--light); }
summary { cursor: pointer; color: var(--muted); font-size: 13px; }
.referrers .domain td { font-weight: 600; border-top: 1px solid var(--ink); }
.referrers td:first-child { width: 45%; }
.referrers details { font-weight: normal; }
details ul { margin: .25rem 0; padding-left: 1rem; font-size: 13px;
  word-break: break-all; }
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--logs", default="/var/log/caddy/access*.log*")
    parser.add_argument("--db", default="/var/lib/nba-traffic/traffic.db")
    parser.add_argument("--out", default="/var/www/html/static/nba-traffic.html")
    args = parser.parse_args()

    # Python 3.8 has no zoneinfo; this makes fromtimestamp() Eastern
    os.environ["TZ"] = TZ
    time.tzset()

    os.makedirs(os.path.dirname(os.path.abspath(args.db)), exist_ok=True)
    db = sqlite3.connect(args.db)
    db.executescript(SCHEMA)
    added = ingest(db, sorted(glob.glob(args.logs)))

    tmp = args.out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(report(db))
    os.replace(tmp, args.out)
    print(f"{datetime.now():%Y-%m-%d %H:%M} added {added} requests", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
