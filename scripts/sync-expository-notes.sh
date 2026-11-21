#!/bin/sh
# Builds the HTML and PDF versions of the expository notes listed below from the private
# math-notes repo into notes/expository/, so they are served from this site. Re-run after
# editing a note.
#
# Everything is built in a temporary copy of the repo, which is left untouched:
#   - \hwhidelabel is added to each note, dropping the "Math notes · Working draft" label;
#   - the HTML is math-notes' self-contained "share" page (math pre-rendered, KaTeX fonts
#     embedded), with a "← Notes" back link to this site's Notes page and a site-style title;
#   - ArithFlow's reference previews are copied in, so resting the pointer on a footnote mark,
#     a citation or a reference to a theorem shows what it refers to, as in ArithFlow.
# Needs the math-notes venv (make setup there), Node, latexmk, and the ArithFlow repo.
#   usage: sh scripts/sync-expository-notes.sh [path-to-math-notes-repo]
#   ARITHFLOW names the ArithFlow repo when it is not at ~/Documents/Claude/Arithflow.
set -e
NOTES="kummer-dedekind frobenius-density los-theorem simplicity-of-psln galois-index-p classifying-topos-groups"
SRC="${1:-$HOME/Documents/Claude/math-notes}"
DST="$(cd "$(dirname "$0")/.." && pwd)/notes/expository"
PY="$SRC/.venv/bin/python"
AF="${ARITHFLOW:-$HOME/Documents/Claude/Arithflow}"
[ -f "$SRC/hwgenie.sty" ] || { echo "math-notes repo not found at $SRC" >&2; exit 1; }
[ -x "$PY" ] || { echo "no venv at $SRC/.venv (run make setup there)" >&2; exit 1; }
[ -f "$AF/arithflow/static/peek.js" ] || { echo "ArithFlow repo not found at $AF" >&2; exit 1; }
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp "$SRC"/*.tex "$SRC"/*.sty "$SRC"/*.bib "$TMP"/
rsync -a --exclude __pycache__ "$SRC/scripts/" "$TMP/scripts/"
mkdir -p "$TMP/build"
[ -d "$SRC/build/katex" ] && cp -R "$SRC/build/katex" "$TMP/build/"
sed -i '' 's|build_note(source, draft, home=None)|build_note(source, draft, home=("/notes/#expository", "Notes"))|' \
  "$TMP/scripts/share_html.py"
grep -q '"/notes/#expository"' "$TMP/scripts/share_html.py" \
  || { echo "could not add the Notes back link (share_html.py changed?)" >&2; exit 1; }
mkdir -p "$DST"
for n in $NOTES; do
  grep -q '^\\hwhidelabel' "$TMP/$n.tex" || sed -i '' 's/^\\usepackage{hwgenie}$/&\
\\hwhidelabel/' "$TMP/$n.tex"
  (cd "$TMP" && latexmk -pdf -interaction=nonstopmode -halt-on-error -silent "$n.tex") >/dev/null 2>&1 \
    || { echo "PDF build failed: $n (log in $TMP/$n.log)" >&2; trap - EXIT; exit 1; }
  (cd "$TMP" && "$PY" scripts/share_html.py "$n") >"$TMP/$n.share.log" 2>&1 \
    || { echo "HTML build failed: $n (log in $TMP/$n.share.log)" >&2; trap - EXIT; exit 1; }
  cp "$TMP/$n.pdf" "$DST/$n.pdf"
  sed 's| — Math notes, Working draft</title>| · Trevor Hyde</title>|' "$TMP/build/share/$n.html" > "$TMP/$n.site.html"
  PYTHONPATH="$AF" "$PY" -c 'import sys
from arithflow import share
page = open(sys.argv[1], encoding="utf-8").read()
out = share.add_previews(page)
if out == page: sys.exit("no place for the previews")
open(sys.argv[2], "w", encoding="utf-8").write(out)' "$TMP/$n.site.html" "$DST/$n.html" \
    || { echo "could not add the reference previews: $n" >&2; exit 1; }
  echo "built $n.html and $n.pdf"
done
echo "synced notes from $SRC to $DST"
