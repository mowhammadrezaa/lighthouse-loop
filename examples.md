# Examples — lighthouse-loop

## Example 1: Live marketing site → all 100

**User:** use lighthouse to check https://example.com and improve until fair; keep reports for comparison

**Agent:**

1. `node ensure-tools.mjs`
2. Baseline → `01-baseline` (Perf 59, A11y 95, BP 96, SEO 91)
3. Fixes: favicon, meta description, defer third-party, CLS from fonts
4. Deploy with the project’s normal host CLI
5. Rounds `02`–`04` until 100/100/100/100
6. `COMPARISON.md` lists every round; HTML/JSON retained

## Example 2: Local Vite app, fair = ≥ 90

**User:** lighthouse loop on local preview, fair is 90+

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
node scripts/run-round.mjs --url "http://127.0.0.1:4173" --out "./lighthouse-reports" --label "01-baseline"
```

Stop when all categories ≥ 90 or plateau.

## Example 3: Desktop form factor

```bash
node scripts/run-round.mjs --url "https://example.com" --out "./lighthouse-reports" --label "01-baseline" --desktop
```

## Example 4: Parse only

```bash
node scripts/parse-scores.mjs --report "./lighthouse-reports/02-after-fixes.report.json" --top 20
```
