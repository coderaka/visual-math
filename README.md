# Visual Math

Interactive visualizations for core concepts in probability and stochastic processes.

Each demo is a standalone static page (HTML + CSS + JS) — no build tools, just open in a browser.

## Demos

| Demo | Description |
|------|-------------|
| [TV Distance](demos/tv-distance/) | Total Variation distance as the shaded area between two densities |

## Tech Stack

- **Charts**: D3.js v7
- **Math rendering**: MathJax 3
- **Styling**: Vanilla CSS, dark theme
- **Build tools**: None — pure static files

## Usage

```bash
# Option 1: just open the file
open demos/tv-distance/index.html

# Option 2: local server
python3 -m http.server 3456
```

## License

MIT
