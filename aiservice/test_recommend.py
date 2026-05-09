"""Terminal-only smoke test for the recommendation service.

Run from aiservice:
    python test_recommend.py

Optional arguments:
    python test_recommend.py <user_id> [last_tour_name]
"""

from __future__ import annotations

import json
import urllib.request
import sys
from urllib.parse import quote


BASE_URL = "http://127.0.0.1:5000"


def pretty(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


def fetch_json(url: str):
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    user_id = sys.argv[1] if len(sys.argv) > 1 else "69f348080e53deae16278d67"
    last_tour_name = sys.argv[2] if len(
        sys.argv) > 2 else "Beach"

    health = fetch_json(f"{BASE_URL}/health")
    print("HEALTH")
    print(pretty(health))
    print()

    encoded_last_tour = quote(last_tour_name)
    recs = fetch_json(
        f"{BASE_URL}/recommend/{user_id}?last_tour_name={encoded_last_tour}")
    print("RECOMMENDATIONS")
    print(pretty(recs))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
