#!/bin/sh
# Builds the PDFs of the expository notes listed below from the private math-notes repo
# into notes/expository/, so they are served from this site. Re-run after editing a note.
# Each note is compiled in a temporary copy with \hwhidelabel added, which drops the
# "Math notes · Working draft" label from the title; the math-notes repo is left untouched.
#   usage: sh scripts/sync-expository-notes.sh [path-to-math-notes-repo]
set -e
NOTES="kummer-dedekind frobenius-density los-theorem"
SRC="${1:-$HOME/Documents/Claude/math-notes}"
DST="$(cd "$(dirname "$0")/.." && pwd)/notes/expository"
[ -f "$SRC/hwgenie.sty" ] || { echo "math-notes repo not found at $SRC" >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$SRC"/*.tex "$SRC"/*.sty "$SRC"/*.bib "$TMP"/
mkdir -p "$DST"
for n in $NOTES; do
  grep -q '^\\hwhidelabel' "$TMP/$n.tex" || sed -i '' 's/^\\usepackage{hwgenie}$/&\
\\hwhidelabel/' "$TMP/$n.tex"
  (cd "$TMP" && latexmk -pdf -interaction=nonstopmode -halt-on-error -silent "$n.tex") >/dev/null 2>&1 \
    || { echo "build failed: $n (log in $TMP/$n.log)" >&2; trap - EXIT; exit 1; }
  cp "$TMP/$n.pdf" "$DST/$n.pdf"
  echo "built $n.pdf"
done
echo "synced notes from $SRC to $DST"
