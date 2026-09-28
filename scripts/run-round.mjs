#!/usr/bin/env node
/**
 * Run one Lighthouse round; write HTML + JSON without overwriting existing labels.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const stateFile = path.join(skillRoot, '.browser-cache', 'chrome-path.txt');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function fail(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function which(bin) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(finder, [bin], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || null;
}

function readChrome() {
  const env = process.env.LHLOOP_CHROME_PATH || process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  try {
    if (fs.existsSync(stateFile)) {
      const p = fs.readFileSync(stateFile, 'utf8').trim();
      if (p && fs.existsSync(p)) return p;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function uniqueBase(outDir, label) {
  let base = path.join(outDir, label);
  let n = 0;
  while (fs.existsSync(`${base}.report.json`) || fs.existsSync(`${base}.report.html`)) {
    n += 1;
    base = path.join(outDir, `${label}-v${n}`);
    process.stderr.write(`warn: label exists, using ${path.basename(base)}\n`);
  }
  return base;
}

function main() {
  const url = arg('--url');
  const outDir = path.resolve(arg('--out', './lighthouse-reports'));
  const label = arg('--label', '01-baseline');
  const desktop = hasFlag('--desktop');
  const onlyCats = arg('--only-categories', 'performance,accessibility,best-practices,seo');

  if (!url) fail('Required: --url <https://...>');

  fs.mkdirSync(outDir, { recursive: true });
  const base = uniqueBase(outDir, label);
  const chrome = readChrome();

  const chromeFlags = ['--headless=new', '--disable-gpu'];
  if (process.env.CI === 'true' || process.env.LHLOOP_NO_SANDBOX === '1') {
    chromeFlags.push('--no-sandbox', '--disable-dev-shm-usage');
  }

  const npx = which('npx') || (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  const args = [
    '--yes',
    'lighthouse@12',
    url,
    '--output=json',
    '--output=html',
    `--output-path=${base}`,
    `--only-categories=${onlyCats}`,
    '--quiet',
    `--chrome-flags=${chromeFlags.join(' ')}`,
  ];
  if (desktop) args.push('--preset=desktop');
  else args.push('--form-factor=mobile', '--screenEmulation.mobile');

  const env = { ...process.env };
  if (chrome) {
    env.CHROME_PATH = chrome;
    env.LHLOOP_CHROME_PATH = chrome;
  }

  process.stdout.write(`Running Lighthouse → ${path.basename(base)} (${url})\n`);
  const r = spawnSync(npx, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env,
    stdio: 'inherit',
  });

  if (r.status !== 0) fail(`Lighthouse exited with code ${r.status ?? 'unknown'}`);

  // lighthouse may write `${base}.report.json` or `${base}.json` depending on version
  const candidates = [
    `${base}.report.json`,
    `${base}.json`,
    `${base}.report.html`,
    `${base}.html`,
  ];
  const found = candidates.filter((p) => fs.existsSync(p));
  if (!found.length) fail('Lighthouse finished but report files were not found');

  // Normalize names to *.report.json / *.report.html
  const jsonSrc = found.find((p) => p.endsWith('.json'));
  const htmlSrc = found.find((p) => p.endsWith('.html'));
  const jsonDst = `${base}.report.json`;
  const htmlDst = `${base}.report.html`;
  if (jsonSrc && jsonSrc !== jsonDst) fs.renameSync(jsonSrc, jsonDst);
  if (htmlSrc && htmlSrc !== htmlDst) fs.renameSync(htmlSrc, htmlDst);

  process.stdout.write(`Wrote ${jsonDst}\n`);
  process.stdout.write(`Wrote ${htmlDst}\n`);
}

main();
