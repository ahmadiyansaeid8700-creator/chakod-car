import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'app');
const SITEMAP = path.join(ROOT, 'docs', 'MASTER-SITEMAP-FA.md');
const REPORT = path.join(ROOT, 'artifacts', 'master-route-audit.md');
const PAGE_NAMES = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function posix(value) {
  return value.split(path.sep).join('/');
}

function routeFromPage(file) {
  const rel = posix(path.relative(APP, path.dirname(file)));
  if (!rel || rel === '.') return '/';
  const parts = rel.split('/').filter(Boolean).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });
  return '/' + parts.join('/');
}

function toRegex(route) {
  if (route === '/') return /^\/$/;
  const body = route.split('/').filter(Boolean).map((segment) => {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '(?:.*)?';
    if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
    if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return new RegExp('^/' + body + '/?$');
}

const pages = walk(APP).filter((file) => PAGE_NAMES.has(path.basename(file)));
const actualRoutes = pages.map((file) => ({ route: routeFromPage(file), file: posix(path.relative(ROOT, file)) }));
const actualMatchers = actualRoutes.map((x) => ({ ...x, regex: toRegex(x.route) }));

const doc = fs.readFileSync(SITEMAP, 'utf8');
const raw = doc.split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.startsWith('/'))
  .map((line) => line.replace(/`/g, '').trim())
  .filter(Boolean);

const required = [...new Set(raw.map((route) => route.split('?')[0]).filter((route) => {
  if (!route.startsWith('/')) return false;
  if (route.endsWith('/*')) return false;
  if (route.includes('*')) return false;
  return true;
}))].sort();

function exists(requiredRoute) {
  if (requiredRoute.includes('[')) {
    const reqRegex = toRegex(requiredRoute);
    return actualRoutes.some((x) => reqRegex.test(x.route) || toRegex(x.route).test(requiredRoute.replace(/\[[^\]]+\]/g, 'sample')));
  }
  return actualMatchers.some((x) => x.regex.test(requiredRoute));
}

const missing = required.filter((route) => !exists(route));
const lines = [
  '# Master sitemap route audit',
  '',
  `- Required routes extracted: ${required.length}`,
  `- Actual page routes discovered: ${actualRoutes.length}`,
  `- Missing required routes: ${missing.length}`,
  '',
  '## Missing required routes',
  '',
  ...(missing.length ? missing.map((route) => `- \`${route}\``) : ['- None']),
  '',
  '## Required routes',
  '',
  ...required.map((route) => `- ${exists(route) ? '✅' : '❌'} \`${route}\``),
  '',
];

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, lines.join('\n'));
console.log(lines.slice(0, Math.min(lines.length, 30)).join('\n'));
console.log(`Report: ${path.relative(ROOT, REPORT)}`);
if (missing.length) process.exit(1);
