"""Fetch Cal-ICOR hub usage for the homepage map into data/hub_stats.json.

The deploy workflow runs this before every build (including nightly); the
output is gitignored. Run it locally to preview the map:

    python3 scripts/fetch_hub_stats.py                      # term + all-time
    GRAFANA_TOKEN=... python3 scripts/fetch_hub_stats.py    # + yesterday

Sources:

  users.csv  users per term for each Cal-ICOR hub, by college name, written
             nightly by sean-morris/cloudbank-pilot-hub-users (public).
  Grafana    users active yesterday on each production hub, sampled at 23:59 PT
             like cal-icor/hub-users-page's daily.csv, so the totals match
             (jupyterhub_active_users from the cluster's Prometheus), read
             with a Viewer service-account token. Without a token, or if the
             query fails, this is left out and the map hides that view.

Only per-hub totals are written: the output is published on the site.
"""

import csv
import datetime
import io
import json
import os
import sys
import urllib.parse
import urllib.request
import zoneinfo
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "hub_stats.json"
USERS_CSV = "https://raw.githubusercontent.com/sean-morris/cloudbank-pilot-hub-users/main/users.csv"
PT = zoneinfo.ZoneInfo("America/Los_Angeles")
GRAFANA = "https://grafana.jupyter.cal-icor.org"
DATASOURCE = "P1809F7CD0C75ACF3"  # the cluster's Prometheus, as Grafana names it
QUERY = 'sum by (namespace) (jupyterhub_active_users{namespace=~".*-prod", period="24h"})'


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def colleges():
    """({college: {"term", "allTime"}}, current term label) for the Cal-ICOR hubs."""
    rows = [
        r for r in csv.DictReader(io.StringIO(get(USERS_CSV)))
        if r["where"] == "icor" and not r["college"].startswith("Total")
    ]
    terms = [c for c in rows[0] if c.split("_")[0] in ("spring", "summer", "fall", "winter")]
    current = next(t for t in reversed(terms) if sum(int(r[t] or 0) for r in rows) > 0)
    season, year = current.split("_")
    return {
        r["college"]: {"term": int(r[current] or 0), "allTime": int(r["all-users"] or 0)}
        for r in rows
    }, f"{season.title()} {year}"


def day_users(day):
    """{hub: users active on `day`}, keyed by hub name (namespace minus -prod).

    jupyterhub_active_users{period="24h"} at 23:59 PT counts that whole day.
    """
    token = os.environ.get("GRAFANA_TOKEN")
    if not token:
        print("GRAFANA_TOKEN is not set; skipping daily counts")
        return None
    at = datetime.datetime.combine(day, datetime.time(23, 59), PT).timestamp()
    url = f"{GRAFANA}/api/datasources/proxy/uid/{DATASOURCE}/api/v1/query?" + urllib.parse.urlencode(
        {"query": QUERY, "time": at}
    )
    try:
        result = json.loads(get(url, {"Authorization": f"Bearer {token}"}))["data"]["result"]
    except Exception as e:  # keep the term and all-time counts if Grafana is down
        warn(f"Grafana query failed, skipping daily counts: {e}")
        return None
    return {
        r["metric"]["namespace"].removesuffix("-prod"): int(float(r["value"][1]))
        for r in result
    }


def warn(message):
    print(f"::warning::{message}" if os.environ.get("GITHUB_ACTIONS") else f"warning: {message}")


def main():
    stats, term = colleges()
    out = {
        "updated": datetime.datetime.now(PT).isoformat(timespec="seconds"),
        "term": term,
        "colleges": stats,
    }
    # Totals cover every Cal-ICOR hub, not only those on the partner map.
    # All time is users.csv's all-users, as Sean's pages report it.
    out["totals"] = {
        "term": sum(c["term"] for c in stats.values()),
        "allTime": sum(c["allTime"] for c in stats.values()),
    }
    yesterday = datetime.datetime.now(PT).date() - datetime.timedelta(days=1)
    hubs = day_users(yesterday)
    if hubs is not None:
        out["hubs"] = hubs
        out["day"] = yesterday.isoformat()
        out["totals"]["day"] = sum(hubs.values())
    OUT.write_text(json.dumps(out, indent=2, sort_keys=True) + "\n")

    print(f"{OUT.name}: {term}, {len(stats)} colleges, {out['totals']['term']} users this term, {out['totals']['allTime']} all time")
    if hubs is not None:
        print(f"  {yesterday}: {sum(hubs.values())} users on {len(hubs)} hubs")
        for hub, users in sorted(hubs.items(), key=lambda kv: -kv[1]):
            print(f"    {hub}: {users}")


if __name__ == "__main__":
    sys.exit(main())
