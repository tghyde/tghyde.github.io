#!/bin/sh
# Regenerates sitemap.xml from the HTML pages and PDFs tracked in this repo
# (vendored deck files excluded), so search engines can find every page.
# lastmod is each file's last commit date, or today if it has uncommitted changes.
set -eu
cd "$(dirname "$0")/.."

BASE=https://tghyde.github.io
TODAY=$(date +%Y-%m-%d)

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  { git ls-files '*.html' '*.pdf'; git ls-files --others --exclude-standard '*.html' '*.pdf'; } \
    | grep -v '/vendor/' | grep -v '^googl.*\.html$' | sort -u | while read -r f; do
    if [ -n "$(git status --porcelain -- "$f")" ]; then
      d=$TODAY
    else
      d=$(git log -1 --format=%as -- "$f")
    fi
    case "$f" in
      index.html) loc=$BASE/ ;;
      */index.html) loc=$BASE/${f%index.html} ;;
      *) loc=$BASE/$f ;;
    esac
    printf '  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' "$loc" "$d"
  done
  echo '</urlset>'
} > sitemap.xml

echo "wrote sitemap.xml ($(grep -c '<url>' sitemap.xml) URLs)"
