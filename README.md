# tghyde.github.io

Personal site of Trevor Hyde, served by GitHub Pages at <https://tghyde.github.io/>.

Plain HTML and CSS, no build step. Edit a page, push to `main`, and it is live within a minute or two.

| Path | What it is |
| --- | --- |
| `index.html` | Home page |
| `research/` | Publications, thesis, invited talks |
| `teaching/` | Courses taught |
| `resources/` | Math graduate school resources for students |
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
