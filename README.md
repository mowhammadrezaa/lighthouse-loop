# lighthouse-loop

Cursor Agent Skill (and standalone scripts) that runs a **Lighthouse improve-and-recheck loop** on any website until scores are fair, **keeping every round for comparison**.

Works on **macOS, Windows, and Linux**. Host-agnostic (Vercel, Netlify, Cloudflare, VPS, localhost, static). Installs or downloads Chrome / Lighthouse tooling when missing.

## Core loop

> use lighthouse to check the website and improve the website based on the report it gives you then. get a second report and go to a loop of improvement and checking the new report until you get a fair result. keep previous one for comparison puposes

## Install as a Cursor skill

```bash
# Option A — clone into personal skills
git clone https://github.com/<you>/lighthouse-loop.git ~/.cursor/skills/lighthouse-loop

# Option B — Skills CLI (when published)
npx skills add <you>/lighthouse-loop
```

Then ask the agent: “run a lighthouse loop on https://example.com until fair”.

## Requirements

- **Node.js 18+** (scripts install hints per OS if missing)
- Network for first-time `npx lighthouse` / optional Chrome-for-Testing download
- Or a system install of Google Chrome / Chromium / Edge

## CLI (no Cursor required)

```bash
node scripts/ensure-tools.mjs
node scripts/run-round.mjs --url "https://example.com" --out "./lighthouse-reports" --label "01-baseline"
node scripts/parse-scores.mjs --report "./lighthouse-reports/01-baseline.report.json"
# …fix site, redeploy or refresh local preview…
node scripts/run-round.mjs --url "https://example.com" --out "./lighthouse-reports" --label "02-after-fixes"
node scripts/update-comparison.mjs --dir "./lighthouse-reports"
```

Environment:

| Variable | Purpose |
|----------|---------|
| `LHLOOP_CHROME_PATH` / `CHROME_PATH` | Force Chrome binary |
| `LHLOOP_NO_SANDBOX=1` | Add `--no-sandbox` (CI/containers) |
| `CI=true` | Same sandbox flags |

## Fair target

Default: Performance, Accessibility, Best Practices, SEO each **≥ 90**.  
User asks for 100 / perfect → all four **= 100**.  
Max rounds default **6**, with plateau stop (see `SKILL.md`).

## Layout

```
lighthouse-loop/
├── SKILL.md              # Agent instructions
├── README.md
├── LICENSE
├── package.json
├── reference.md
├── examples.md
└── scripts/
    ├── ensure-tools.mjs
    ├── run-round.mjs
    ├── parse-scores.mjs
    └── update-comparison.mjs
```

## Open source

MIT licensed. PRs welcome for Windows path edge cases, additional hosts in docs, and CI recipes.

## Disclaimer

Lighthouse scores vary by network and machine. This tool does not guarantee a score; it structures an evidence-based fix loop with durable artifacts.
