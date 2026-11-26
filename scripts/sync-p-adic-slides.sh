#!/bin/sh
# Copies the runtime files of the p-adic talk deck (a reveal.js site kept in its own private repo)
# into notes/p-adic-numbers/, so the slides are served from this site. Re-run after editing the deck.
#   usage: sh scripts/sync-p-adic-slides.sh [path-to-deck-repo]
set -e
SRC="${1:-$HOME/Documents/Claude/Slides/p-adic-number-slides}"
DST="$(cd "$(dirname "$0")/.." && pwd)/notes/p-adic-numbers"
[ -f "$SRC/index.html" ] || { echo "deck not found at $SRC" >&2; exit 1; }
mkdir -p "$DST/figs"
cp "$SRC/index.html" "$DST/index.html"
rsync -a --delete --exclude .DS_Store "$SRC/assets/" "$DST/assets/"
rsync -a --delete --exclude .DS_Store "$SRC/vendor/" "$DST/vendor/"
# Only the figures the deck actually references (the deck repo also keeps sources and drafts).
grep -oh 'figs/[A-Za-z0-9_.-]*' "$SRC/index.html" "$SRC"/assets/css/*.css "$SRC"/assets/js/*.js | sort -u > "$DST/.figs.txt"
rsync -a --delete --files-from="$DST/.figs.txt" "$SRC/" "$DST/"
rm -f "$DST/.figs.txt"
python3 "$(dirname "$0")/add-page-meta.py" "$DST/index.html" /notes/p-adic-numbers/ \
  "Slides from Trevor Hyde's talk introducing p-adic numbers: why 1 = 0.999... and -1 = ...999, and the strange world of p-adic numbers that this twisted logic leads to." \
  /notes/cheshire-cat.png
echo "synced deck from $SRC to $DST"
sh "$(dirname "$0")/build-sitemap.sh"
