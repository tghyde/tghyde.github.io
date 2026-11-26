"""Adds search and link-preview metadata to a page copied in from another repo (the slide decks).

Appends " · Trevor Hyde" to the <title> and inserts a meta description plus Open Graph tags
(site name, title, description, URL, preferred image) right after it. Does nothing if the page
already has them, so it is safe to run on every sync.

  usage: python3 scripts/add-page-meta.py FILE URL-PATH DESCRIPTION IMAGE-PATH
  e.g.   python3 scripts/add-page-meta.py notes/riemann-hypothesis/index.html \
             /notes/riemann-hypothesis/ "Slides for ..." /notes/riemann-zeta.png
"""
import html
import re
import sys

BASE = "https://tghyde.github.io"
SUFFIX = " · Trevor Hyde"

path, url, desc, image = sys.argv[1:5]
page = open(path, encoding="utf-8").read()
if 'property="og:site_name"' in page:
    sys.exit(0)

m = re.search(r"([ \t]*)<title>(.*?)</title>", page, re.S)
if not m:
    sys.exit(f"{path}: no <title>")
indent, title = m.group(1), m.group(2).strip()
if title.endswith(SUFFIX):
    title = title[: -len(SUFFIX)]
d = html.escape(desc, quote=True)
tags = [
    f"<title>{title}{SUFFIX}</title>",
    f'<meta name="description" content="{d}">',
    '<meta property="og:site_name" content="Trevor Hyde">',
    '<meta property="og:type" content="website">',
    f'<meta property="og:title" content="{title}">',
    f'<meta property="og:description" content="{d}">',
    f'<meta property="og:url" content="{BASE}{url}">',
    f'<meta property="og:image" content="{BASE}{image}">',
]
page = page[: m.start()] + "\n".join(indent + t for t in tags) + page[m.end():]
open(path, "w", encoding="utf-8").write(page)
print(f"added page metadata to {path}")
