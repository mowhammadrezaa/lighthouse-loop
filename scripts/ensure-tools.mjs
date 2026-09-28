#!/usr/bin/env node
/**
 * Cross-platform tool bootstrap for lighthouse-loop.
 * Verifies Node ≥ 18, resolves or installs Chrome, checks npx/lighthouse reachability.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const browserCache = path.join(skillRoot, '.browser-cache');
const stateFile = path.join(browserCache, 'chrome-path.txt');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg, code = 1) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(code);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: false,
    ...opts,
  });
  return r;
}

function which(bin) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = run(finder, [bin]);
  if (r.status !== 0) return null;
  const line = (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

function nodeMajor() {
  return Number(process.versions.node.split('.')[0]);
}

function existingChromeCandidates() {
  const env = process.env.LHLOOP_CHROME_PATH || process.env.CHROME_PATH;
  const list = [];
  if (env) list.push(env);

  if (process.platform === 'darwin') {
    list.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    );
  } else if (process.platform === 'win32') {
    const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
    const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const local = process.env.LOCALAPPDATA || '';
    list.push(
      path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(local, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else {
    list.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
    );
  }
  return list;
}

function findSystemChrome() {
  for (const p of existingChromeCandidates()) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function readCachedChrome() {
  try {
    if (!fs.existsSync(stateFile)) return null;
    const p = fs.readFileSync(stateFile, 'utf8').trim();
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCachedChrome(chromePath) {
  fs.mkdirSync(browserCache, { recursive: true });
  fs.writeFileSync(stateFile, `${chromePath}\n`, 'utf8');
}

function tryInstallNodeHint() {
  log('Node.js ≥ 18 is required.');
  if (process.platform === 'darwin') log('  Try: brew install node');
  else if (process.platform === 'win32') log('  Try: winget install OpenJS.NodeJS.LTS');
  else log('  Try: sudo apt-get install -y nodejs   (or install from https://nodejs.org/)');
}

function tryOsChromeInstall() {
  log('Attempting OS package install for Chrome (may require network / admin)…');
  if (process.platform === 'darwin' && which('brew')) {
    const r = run('brew', ['install', '--cask', 'google-chrome'], { stdio: 'inherit' });
    return r.status === 0;
  }
  if (process.platform === 'win32' && which('winget')) {
    const r = run('winget', ['install', '-e', '--id', 'Google.Chrome', '--accept-package-agreements', '--accept-source-agreements'], {
      stdio: 'inherit',
    });
    return r.status === 0;
  }
  if (process.platform === 'linux') {
    if (which('apt-get')) {
      const r = run('sudo', ['apt-get', 'install', '-y', 'chromium-browser'], { stdio: 'inherit' });
      if (r.status === 0) return true;
    }
  }
  return false;
}

function installChromeForTesting() {
  log('Downloading Chrome for Testing via @puppeteer/browsers (user-local cache)…');
  fs.mkdirSync(browserCache, { recursive: true });
  const r = run(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
      import { install, computeExecutablePath } from '@puppeteer/browsers';
      const cacheDir = ${JSON.stringify(browserCache)};
      const built = await install({ browser: 'chrome', buildId: 'stable', cacheDir });
      const exe = computeExecutablePath({ browser: 'chrome', buildId: built.buildId, cacheDir });
      process.stdout.write(exe);
      `,
    ],
    {
      cwd: skillRoot,
      env: { ...process.env, npm_config_yes: 'true' },
      encoding: 'utf8',
    },
  );

  // Prefer npx to fetch the package if bare import fails
  if (r.status !== 0 || !(r.stdout || '').trim()) {
    log('Bootstrapping @puppeteer/browsers with npx…');
    const npx = which('npx') || (process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const r2 = spawnSync(
      npx,
      [
        '--yes',
        '@puppeteer/browsers',
        'install',
        'chrome@stable',
        `--path=${browserCache}`,
      ],
      { encoding: 'utf8', shell: process.platform === 'win32', cwd: skillRoot },
    );
    if (r2.status !== 0) {
      process.stderr.write(r2.stderr || r2.stdout || '');
      return null;
    }
    // CLI prints path-ish output; scan cache for chrome binary
    return findChromeInCache(browserCache);
  }
  const exe = (r.stdout || '').trim();
  return exe && fs.existsSync(exe) ? exe : findChromeInCache(browserCache);
}

function findChromeInCache(dir) {
  if (!fs.existsSync(dir)) return null;
  const matches = [];
  const walk = (d, depth = 0) => {
    if (depth > 8) return;
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p, depth + 1);
      else if (/^(chrome|google-chrome|chromium)(\.exe)?$/i.test(ent.name)) matches.push(p);
      else if (ent.name === 'Google Chrome for Testing' || ent.name === 'chrome.exe') matches.push(p);
    }
  };
  walk(dir);
  // Prefer deeper chrome-headless-shell / chrome binaries that are executable-sized
  matches.sort((a, b) => b.length - a.length);
  for (const m of matches) {
    try {
      if (fs.statSync(m).size > 100000) return m;
    } catch {
      /* ignore */
    }
  }
  return matches[0] || null;
}

function ensureNpxLighthouse() {
  const npx = which('npx') || (process.platform === 'win32' ? 'npx.cmd' : 'npx');
  log('Checking lighthouse via npx…');
  const r = spawnSync(npx, ['--yes', 'lighthouse@12', '--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || r.stdout || '');
    fail('Could not run lighthouse via npx. Check network / npm registry access.');
  }
  log(`lighthouse ${(r.stdout || '').trim() || 'ok'}`);
}

function main() {
  log(`lighthouse-loop ensure-tools (${process.platform}/${os.arch()})`);
  log(`Node ${process.versions.node}`);

  if (nodeMajor() < 18) {
    tryInstallNodeHint();
    fail('Node 18+ required');
  }

  if (!which('npx') && process.platform !== 'win32') {
    fail('npx not found on PATH (should ship with Node)');
  }

  let chrome = findSystemChrome() || readCachedChrome();
  if (!chrome) {
    log('No system Chrome/Chromium found.');
    const osOk = tryOsChromeInstall();
    chrome = findSystemChrome();
    if (!chrome) {
      chrome = installChromeForTesting();
    }
    if (!chrome && osOk) chrome = findSystemChrome();
  }

  if (!chrome) {
    fail(
      'Chrome/Chromium not available. Install Google Chrome, set CHROME_PATH / LHLOOP_CHROME_PATH, or re-run with network for Puppeteer download.',
    );
  }

  writeCachedChrome(chrome);
  log(`Chrome: ${chrome}`);
  ensureNpxLighthouse();
  log('OK — tools ready');
  process.stdout.write(`LHLOOP_CHROME_PATH=${chrome}\n`);
}

main();
