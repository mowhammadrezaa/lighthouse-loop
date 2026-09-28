# Reference — lighthouse-loop

## Category IDs (Lighthouse JSON)

| Score key | Category |
|-----------|----------|
| `categories.performance.score` | Performance (0–1 in JSON; scripts show 0–100) |
| `categories.accessibility.score` | Accessibility |
| `categories['best-practices'].score` | Best Practices |
| `categories.seo.score` | SEO |

Multiply by 100 and round for display.

## Useful audit IDs (fix priority)

**Performance:** `largest-contentful-paint`, `cumulative-layout-shift`, `total-blocking-time`, `first-contentful-paint`, `speed-index`, `render-blocking-resources`, `unused-javascript`, `unused-css-rules`, `bootup-time`, `font-display`

**Accessibility:** `color-contrast`, `button-name`, `link-name`, `image-alt`, `document-title`, `html-has-lang`, `aria-*`

**SEO:** `meta-description`, `is-crawlable`, `robots-txt`, `hreflang`, `canonical`

**Best Practices:** `errors-in-console`, `image-aspect-ratio`, `deprecations`, `third-party-cookies`

## Chrome discovery order (`ensure-tools` / `run-round`)

1. `LHLOOP_CHROME_PATH` or `CHROME_PATH` env
2. OS common paths (Google Chrome, Chromium, Edge)
3. Puppeteer cache from `@puppeteer/browsers` install under skill `.browser-cache/`
4. Fail with install instructions

## OS install fallbacks (when auto-install fails)

### Node.js ≥ 18

| OS | Command / link |
|----|----------------|
| macOS | `brew install node` |
| Windows | `winget install OpenJS.NodeJS.LTS` |
| Linux | `sudo apt-get install -y nodejs` (or NodeSource / nvm) |
| Any | https://nodejs.org/ |

### Chrome / Chromium

| OS | Command / link |
|----|----------------|
| macOS | `brew install --cask google-chrome` |
| Windows | `winget install Google.Chrome` |
| Linux | `sudo apt-get install -y chromium-browser` or Google’s `.deb` |
| Offline / CI | `ensure-tools.mjs` downloads Chrome for Testing via `@puppeteer/browsers` into `.browser-cache/` |

### Lighthouse

No global install required. `run-round.mjs` uses `npx --yes lighthouse@12`.

## Local URL tips

- Prefer `http://127.0.0.1:PORT` over `localhost` (IPv6 surprises).
- SPA: ensure the preview server falls back to `index.html`.
- Auth walls: use a public URL or a preview bypass the project already supports; do not bypass security controls the user did not authorize.

## CI notes

- Set `LHLOOP_CHROME_PATH` to the CI Chrome binary.
- Use `--chrome-flags="--no-sandbox --disable-dev-shm-usage"` in restricted containers (already defaulted in `run-round.mjs` when `CI=true`).

## Plateau guidance

If Performance sticks at mid-70s while others are 100, usual causes: third-party scripts (ads, analytics), unoptimized hero image, web font CLS, huge JS bundles. Document these as residual risk instead of endless micro-tuning past max rounds.
