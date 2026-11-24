#!/bin/sh
# Copies the runtime files of the Riemann Hypothesis talk deck (a reveal.js site kept in its own repo)
# into notes/riemann-hypothesis/, so the slides are served from this site. Re-run after editing the deck.
# The source is the short version of the deck (riemann-hypothesis-slides-short); pass the full deck's path to publish that instead.
#   usage: sh scripts/sync-riemann-slides.sh [path-to-deck-repo]
set -e
SRC="${1:-$HOME/Documents/Claude/Slides/riemann-hypothesis-slides-short}"
DST="$(cd "$(dirname "$0")/.." && pwd)/notes/riemann-hypothesis"
[ -f "$SRC/index.html" ] || { echo "deck not found at $SRC" >&2; exit 1; }
mkdir -p "$DST/figs"
cp "$SRC/index.html" "$DST/index.html"
rsync -a --delete --exclude .DS_Store "$SRC/assets/" "$DST/assets/"
rsync -a --delete --exclude .DS_Store "$SRC/vendor/" "$DST/vendor/"
# Only the figures the deck actually references (the deck repo also keeps sources and drafts).
grep -oh 'figs/[A-Za-z0-9_.-]*' "$SRC/index.html" "$SRC"/assets/css/*.css "$SRC"/assets/js/*.js | sort -u > "$DST/.figs.txt"
rsync -a --delete --files-from="$DST/.figs.txt" "$SRC/" "$DST/"
rm -f "$DST/.figs.txt"
echo "synced deck from $SRC to $DST"
