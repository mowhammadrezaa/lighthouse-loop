---
name: lighthouse-loop
description: >-
  Run a Lighthouse improve-and-recheck loop on any website until scores are fair,
  keeping every round for comparison. Installs Node/Chrome/Lighthouse tooling when
  missing (macOS, Windows, Linux). Use when the user asks to lighthouse a site,
  improve from the report, loop until fair results, score Performance Accessibility
  Best Practices SEO, or keep baseline comparison reports.
---

# Lighthouse Loop

Host- and stack-agnostic Lighthouse improve loop for any project (static, SPA,
SSR, any host: Vercel, Netlify, Cloudflare, nginx, local `file://` or localhost).

## Core loop (verbatim)

use lighthouse to check the website and improve the website based on the report it gives you then. get a second report and go to a loop of improvement and checking the new report until you get a fair result. keep previous one for comparison puposes

## When to use

- User wants Lighthouse audit + fixes in a loop
- User wants scores driven to a target (default: all categories ≥ 90, or 100 if they say “perfect” / “100”)
- User wants numbered reports kept for comparison

## Do not assume

- Not Vercel-only. Detect how *this* project is built and published; use that.
- Not one OS. Scripts are Node ESM; work on macOS, Windows, and Linux.
- Not “already installed.” Run `scripts/ensure-tools.mjs` first.

## Quick start

From the skill directory (or pass `--skill-root`):

```bash
node scripts/ensure-tools.mjs
node scripts/run-round.mjs --url "https://example.com" --out "./lighthouse-reports" --label "01-baseline"
node scripts/parse-scores.mjs --report "./lighthouse-reports/01-baseline.report.json"
node scripts/update-comparison.mjs --dir "./lighthouse-reports"
```

Agent: resolve the skill path from the installed skill location, then run those commands with the Shell tool. Prefer absolute paths on Windows.

## Workflow (agent checklist)

Copy and track:

```
Lighthouse Loop:
- [ ] 1. Resolve URL + report dir + fair target
- [ ] 2. ensure-tools.mjs (install missing deps)
- [ ] 3. Round 01-baseline (never overwrite)
- [ ] 4. Parse scores + top failing audits
- [ ] 5. Fix code for highest-impact failures
- [ ] 6. Publish or refresh the URL under test
- [ ] 7. Next numbered round (02-, 03-, …)
- [ ] 8. update-comparison.mjs
- [ ] 9. Stop when fair OR hit max rounds / plateau
```

### 1. Resolve inputs

| Input | Default | Notes |
|-------|---------|--------|
| `--url` | ask user | Live production URL preferred; else local preview URL |
| Report dir | `<project>/lighthouse-reports` | Create if missing; never delete old rounds |
| Fair target | all of Perf/A11y/BP/SEO ≥ **90** | Use **100** if user asks for 100 / perfect |
| Form factor | mobile | Pass `--desktop` only if user asks |
| Max rounds | **6** | Stop earlier on plateau (see below) |

### 2. Ensure tools

```bash
node "<skill>/scripts/ensure-tools.mjs"
```

Installs or verifies: Node ≥ 18, Google Chrome/Chromium (system or Puppeteer download), Lighthouse (via `npx`, no global required). See [reference.md](reference.md) for OS installers when auto-install cannot elevate.

### 3–4. Baseline + parse

```bash
node "<skill>/scripts/run-round.mjs" --url "$URL" --out "$OUT" --label "01-baseline"
node "<skill>/scripts/parse-scores.mjs" --report "$OUT/01-baseline.report.json" --top 15
```

Never overwrite an existing `NN-label.report.*`. If the label exists, bump the numeric prefix.

### 5. Fix from the report

Priority order:

1. Errors / failed audits that tank a category score
2. LCP, CLS, TBT, FCP (Performance)
3. Accessibility violations
4. SEO basics (meta description, crawlable, robots)
5. Best Practices (console errors, HTTPS, images)

Rules:

- Change the project’s real source; do not “game” Lighthouse with fake screenshots.
- Prefer one coherent fix batch per round (not dozens of unrelated micro-edits).
- Re-read failing audit `details` / `nodes` in the JSON before guessing.

### 6. Publish or refresh (host-agnostic)

Detect from the repo (do not hardcode Vercel):

| Signal | Typical refresh |
|--------|-----------------|
| `vercel.json` / `.vercel` | `npx vercel --prod` or their usual deploy |
| `netlify.toml` | `npx netlify deploy --prod` |
| Cloudflare Pages / Wrangler | project’s wrangler/pages deploy |
| GitHub Pages | build + push / `gh-pages` |
| Docker / VPS | rebuild image or `rsync` / their script |
| Local only | `npm run build && npm run preview` (or framework equivalent) and point `--url` at localhost |
| Static `dist/` | serve with `npx serve dist -p 4173` (or similar) |

Wait until the URL serves the new build (curl HTML fingerprint or deployment ready) before the next Lighthouse run.

### 7–8. Next round + comparison

Label rounds: `01-baseline`, `02-after-fixes`, `03-…` (short reason in the label).

```bash
node "<skill>/scripts/run-round.mjs" --url "$URL" --out "$OUT" --label "02-after-fixes"
node "<skill>/scripts/update-comparison.mjs" --dir "$OUT"
```

If `COMPARISON.md` already exists with hand-written notes, merge scores into it instead of blindly overwriting; or write `COMPARISON.generated.md` and leave human notes intact. Default script overwrites `COMPARISON.md` — prefer a dedicated report dir for automated runs.

Keep **all** previous HTML + JSON reports.

### 9. Stop conditions

Stop when **any** is true:

- All four category scores meet the fair target
- Max rounds reached (default 6)
- **Plateau**: after ≥ 3 rounds, the worst category has not improved by ≥ 2 points vs the previous round — report remaining audits as accepted debt

On stop: summarize the comparison table, list main fixes, list leftover low-weight warnings.

## Fair result

Default **fair** = Performance, Accessibility, Best Practices, and SEO each ≥ 90 (Lighthouse 0–100).

If the user said “100”, “perfect”, or “all green”, fair = all four **= 100**.

Variance: mobile Lighthouse is noisy (±1–3). If one category is 97–99 after a solid fix round, one confirmation re-run is allowed before more code changes.

## Outputs

In the report directory:

- `NN-label.report.html` — human report
- `NN-label.report.json` — machine report
- `COMPARISON.md` — table of all rounds (regenerated by `update-comparison.mjs`)

## Additional resources

- Tooling and OS notes: [reference.md](reference.md)
- Example session: [examples.md](examples.md)
- Open-source package docs: [README.md](README.md)
