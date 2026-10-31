# tghyde.github.io

Personal site of Trevor Hyde, served by GitHub Pages at <https://tghyde.github.io/>.

Plain HTML and CSS, no build step. Edit a page, push to `main`, and it is live within a minute or two.

| Path | What it is |
| --- | --- |
| `index.html` | Home page |
| `research/` | Publications, thesis, invited talks |
| `teaching/` | Courses taught |
| `resources/` | Math graduate school resources for students |
| `notes/` | Notes page: slides and expository notes. `notes/p-adic-numbers/` is the p-adic talk deck, copied from its own repo (see below) |
| `cv/` | Curriculum vitae: HTML version (`index.html`), LaTeX source (`CV.tex`), and PDF (`CV.pdf`) |
| `assets/` | Stylesheet and photo |

## Editing the CV

`cv/CV.tex` is the source of truth for the PDF. It is set up to be edited in Overleaf via
GitHub sync (Overleaf menu → GitHub → link this repository, then set `cv/CV.tex` as the main document).

When `cv/CV.tex` changes on `main`, the workflow in `.github/workflows/build-cv.yml` recompiles it and
commits a fresh `cv/CV.pdf`. If you edit in Overleaf, pull that commit back into Overleaf afterwards
(GitHub → Pull) so the two stay in sync.

The HTML version at `cv/index.html` is maintained by hand. After changing the LaTeX, make the same
change there, or ask Claude to reconcile the two.

## Updating the p-adic slides

`notes/p-adic-numbers/` is a copy of the runtime files of the reveal.js deck in the private repo
`tghyde/p-adic-number-slides` (locally `~/Documents/Claude/Slides/p-adic-number-slides`). Edit the deck
there, then re-copy it here and commit:

```bash
sh scripts/sync-p-adic-slides.sh
```

## Cache busting

GitHub Pages lets browsers cache files for 10 minutes. Every page links the stylesheet and script with a
version query (`/assets/style.css?v=…`, `/assets/site.js?v=…`); bump that value on all pages whenever
`assets/style.css` or `assets/site.js` changes so visitors get the new copy right away.
