# Contributing

1. Keep scripts **Node ESM**, no Bash-only flows (Windows must work).
2. Do not add Vercel-only assumptions to `SKILL.md`; host detection stays generic.
3. Prefer `npx` over global installs.
4. After script changes, run:

```bash
node scripts/ensure-tools.mjs
node scripts/run-round.mjs --url "https://example.com" --out "./lighthouse-reports" --label "00-smoke"
node scripts/parse-scores.mjs --report "./lighthouse-reports/00-smoke.report.json"
node scripts/update-comparison.mjs --dir "./lighthouse-reports"
```

5. Keep `SKILL.md` under ~500 lines; put deep notes in `reference.md`.
