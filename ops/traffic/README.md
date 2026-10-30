# traffic

Visitors to billmill.org/nba, at
<https://billmill.org/static/nba-traffic.html>. The design is
`docs/plans/2026-10-30-traffic-design.md`.

`traffic.py` reads Caddy's access logs, appends /nba page requests to
SQLite (the logs keep only about four days), and writes the report. It's
standard library only, for the server's Python 3.8.

## Install

```sh
mise run install-traffic
```

It runs `install.sh`, which copies `traffic.py` to
`root@billmill.org:/root/nba-traffic/`, runs it once, and adds this to
root's crontab if it isn't there, after goaccess's job at :01:

```
5 * * * * python3 /root/nba-traffic/traffic.py >> /tmp/nba-traffic.log 2>&1
```

Rerun it to update. The history is `/var/lib/nba-traffic/traffic.db`;
deleting it loses everything older than the logs.

## Run it locally

Copy the logs into an empty directory and point the script at it:

```sh
mkdir -p /tmp/nbalogs && scp 'root@billmill.org:/var/log/caddy/access*' /tmp/nbalogs/
python3 ops/traffic/traffic.py --logs '/tmp/nbalogs/access*.log*' \
  --db /tmp/traffic.db --out /tmp/traffic.html
```
