#!/usr/bin/env python3
"""Probe whether this machine can fetch the energycost.gr register past Incapsula.

Tries several fetch strategies, prints a summary and saves what each one got to ./probe-out/.
A strategy passes when it returns the raw register HTML (thousands of <tr data-invoice-id> rows).

Setup (Ubuntu / Oracle Linux, x86_64 or ARM):
    python3 -m venv .venv && . .venv/bin/activate
    pip install playwright
    playwright install --with-deps chromium        # bundled Chromium + headless shell
    playwright install --with-deps chrome          # Google Chrome, x86_64 only (skip on ARM)

Run:
    python probe_source.py                         # all strategies
    python probe_source.py --only chromium chrome  # a subset
    xvfb-run -a python probe_source.py --headed    # same, with a visible (virtual) window
"""

import argparse
import platform
import sys
import time
import urllib.request
from pathlib import Path

URL = (
    "https://energycost.gr/"
    "%ce%ba%ce%b1%cf%84%ce%b1%cf%87%cf%89%cf%81%ce%b7%ce%bc%ce%ad%ce%bd%ce%b1-"
    "%cf%84%ce%b9%ce%bc%ce%bf%ce%bb%cf%8c%ce%b3%ce%b9%ce%b1-"
    "%cf%80%cf%81%ce%bf%ce%bc%ce%ae%ce%b8%ce%b5%ce%b9%ce%b1%cf%82-%ce%b7-3/"
)
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"

# name -> Playwright launch channel (None = chrome-headless-shell, the old headless mode)
BROWSERS = {
    "chrome": "chrome",  # installed Google Chrome, new headless (passed from a home IP on Windows)
    "chromium": "chromium",  # Playwright's full Chromium, new headless
    "headless-shell": None,  # Playwright default; was blocked from a home IP on Windows
}


def verdict(html: str) -> str:
    rows = html.count("data-invoice-id")
    if rows > 1000:
        return f"PASS ({rows} tariff rows)"
    if "Request unsuccessful" in html or "incident_id" in html:
        return "BLOCKED (Incapsula incident page)"
    if "_Incapsula_Resource" in html:
        return "BLOCKED (Incapsula challenge not solved)"
    return f"UNKNOWN ({rows} tariff rows)"


def probe_plain(out: Path) -> str:
    req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept-Language": "el-GR,el;q=0.9,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=60) as r:
        html = r.read().decode("utf-8", "replace")
    (out / "plain.html").write_text(html, encoding="utf-8")
    return verdict(html)


def probe_browser(name: str, channel, headed: bool, out: Path) -> str:
    from playwright.sync_api import TimeoutError as PwTimeout, sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed, channel=channel)
        try:
            page = browser.new_context(locale="el-GR", viewport={"width": 1366, "height": 900}).new_page()
            page.goto(URL, wait_until="domcontentloaded", timeout=90_000)
            try:
                page.wait_for_function("document.querySelectorAll('table tr').length > 100", timeout=60_000)
            except PwTimeout:
                # Never got past the challenge: keep what the browser was showing
                html = page.content()
                (out / f"{name}.html").write_text(html, encoding="utf-8")
                page.screenshot(path=str(out / f"{name}.png"))
                return verdict(html)
            # The site's scripts rewrite the table after load, so re-request the raw server HTML
            # from inside the page (same cookies, TLS and fingerprint that passed the check)
            html = page.evaluate("fetch(location.href, { credentials: 'include' }).then(r => r.text())")
            (out / f"{name}.html").write_text(html, encoding="utf-8")
            return verdict(html)
        finally:
            browser.close()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", nargs="+", choices=["plain", *BROWSERS], help="strategies to run (default: all)")
    ap.add_argument("--headed", action="store_true", help="show the browser window (use with xvfb-run on a server)")
    ap.add_argument("--out", default="probe-out", help="where to save fetched pages (default: ./probe-out)")
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    print(f"{platform.system()} {platform.machine()}, Python {platform.python_version()}, headed={args.headed}\n")

    results = {}
    for name in args.only or ["plain", *BROWSERS]:
        t0 = time.monotonic()
        print(f"-> {name} ...", flush=True)
        try:
            res = probe_plain(out) if name == "plain" else probe_browser(name, BROWSERS[name], args.headed, out)
        except Exception as e:  # missing browser, network error, etc.
            res = f"ERROR {type(e).__name__}: {str(e).splitlines()[0][:160]}"
        results[name] = f"{res}  [{time.monotonic() - t0:.0f}s]"
        print(f"   {results[name]}", flush=True)

    print("\nSummary")
    for name, res in results.items():
        print(f"  {name:<15} {res}")
    print(f"\nPages saved in {out.resolve()}")
    return 0 if any(r.startswith("PASS") for r in results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
