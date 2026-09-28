#!/usr/bin/env node
/**
 * Print category scores and top failing audits from a Lighthouse JSON report.
 */
import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function fail(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function score100(v) {
  if (v == null || Number.isNaN(v)) return null;
  return Math.round(Number(v) * 100);
}

function main() {
  const reportPath = arg('--report');
  const topN = Number(arg('--top', '15'));
  if (!reportPath) fail('Required: --report <file.report.json>');
  if (!fs.existsSync(reportPath)) fail(`Not found: ${reportPath}`);

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const cats = report.categories || {};
  const rows = [
    ['performance', score100(cats.performance?.score)],
    ['accessibility', score100(cats.accessibility?.score)],
    ['best-practices', score100(cats['best-practices']?.score)],
    ['seo', score100(cats.seo?.score)],
  ];

  process.stdout.write(`Report: ${reportPath}\n`);
  process.stdout.write(`URL: ${report.finalDisplayedUrl || report.requestedUrl || '?'}\n`);
  process.stdout.write('Scores:\n');
  for (const [k, v] of rows) {
    process.stdout.write(`  ${k}: ${v == null ? 'n/a' : v}\n`);
  }

  const audits = report.audits || {};
  const failed = Object.values(audits)
    .filter((a) => a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative')
    .map((a) => ({
      id: a.id,
      title: a.title,
      score: a.score,
      display: a.displayValue || '',
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, topN);

  process.stdout.write(`\nTop ${failed.length} failing / partial audits:\n`);
  for (const a of failed) {
    process.stdout.write(
      `  [${Math.round(a.score * 100)}] ${a.id} — ${a.title}${a.display ? ` (${a.display})` : ''}\n`,
    );
  }

  // Machine-readable trailer for agents
  process.stdout.write(
    `\nJSON_SCORES ${JSON.stringify(Object.fromEntries(rows.filter(([, v]) => v != null)))}\n`,
  );
}

main();
