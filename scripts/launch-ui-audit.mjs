import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'app');
const REPORT_DIR = path.join(ROOT, 'artifacts');
const REPORT_PATH = path.join(REPORT_DIR, 'launch-ui-audit.md');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const PAGE_FILES = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);
const SPECIAL_PUBLIC_ROUTES = new Set(['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/favicon.ico']);
const ASSET_PREFIXES = ['/api/', '/_next/', '/assets/', '/images/', '/icons/', '/uploads/', '/chakod-api/'];
const PLACEHOLDER_TEXT = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /coming\s+soon/i,
  /not\s+implemented/i,
  /به\s*زودی/,
  /در\s*دست\s*ساخت/,
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function routeFromPage(file) {
  const rel = toPosix(path.relative(APP, path.dirname(file)));
  if (!rel || rel === '.') return '/';
  const parts = rel.split('/').filter(Boolean).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });
  return '/' + parts.join('/');
}

function routeRegex(route) {
  if (route === '/') return /^\/$/;
  const escaped = route
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '(?:.*)?';
      if (/^\[\.\.\..+\]$/.test(segment)) return '.+';
      if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp('^/' + escaped + '/?$');
}

function normalizeTarget(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:') || value.startsWith('tel:')) return null;
  if (value.startsWith('//')) return null;
  if (!value.startsWith('/')) return null;
  return value.split('#')[0].split('?')[0] || '/';
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function routeExists(target, routeMatchers) {
  if (SPECIAL_PUBLIC_ROUTES.has(target)) return true;
  if (ASSET_PREFIXES.some((prefix) => target.startsWith(prefix))) return true;
  return routeMatchers.some(({ regex }) => regex.test(target));
}

function addMatch(list, file, source, regex, kind) {
  for (const match of source.matchAll(regex)) {
    const value = match[1] ?? match[2] ?? '';
    list.push({ file, line: lineOf(source, match.index ?? 0), value, kind });
  }
}

if (!fs.existsSync(APP)) {
  console.error('app/ directory not found');
  process.exit(2);
}

const allFiles = walk(APP);
const sourceFiles = allFiles.filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)));
const pageFiles = allFiles.filter((file) => PAGE_FILES.has(path.basename(file)));
const routes = pageFiles.map((file) => ({ route: routeFromPage(file), file }));
const routeMatchers = routes.map((entry) => ({ ...entry, regex: routeRegex(entry.route) }));

const navRefs = [];
const placeholders = [];
const suspiciousButtons = [];
const suspiciousAnchors = [];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const rel = toPosix(path.relative(ROOT, file));

  addMatch(navRefs, rel, source, /href\s*=\s*["']([^"']*)["']/g, 'href');
  addMatch(navRefs, rel, source, /href\s*=\s*\{\s*["']([^"']*)["']\s*\}/g, 'href');
  addMatch(navRefs, rel, source, /\bhref\s*:\s*["']([^"']*)["']/g, 'href-object');
  addMatch(navRefs, rel, source, /(?:router\.(?:push|replace)|redirect)\(\s*["']([^"']*)["']/g, 'navigation-call');

  for (const pattern of PLACEHOLDER_TEXT) {
    const match = source.match(pattern);
    if (match?.index != null) placeholders.push({ file: rel, line: lineOf(source, match.index), value: match[0] });
  }

  for (const match of source.matchAll(/<button\b([\s\S]*?)>/g)) {
    const attrs = match[1] || '';
    const isTypeButton = /type\s*=\s*["']button["']/.test(attrs);
    const hasHandler = /\bon(?:Click|PointerDown|MouseDown|KeyDown|Submit)\s*=/.test(attrs) || /formAction\s*=/.test(attrs);
    const disabled = /\bdisabled(?:\s|=|>)/.test(attrs);
    if (isTypeButton && !hasHandler && !disabled) {
      suspiciousButtons.push({ file: rel, line: lineOf(source, match.index ?? 0), snippet: attrs.replace(/\s+/g, ' ').trim().slice(0, 180) });
    }
  }

  for (const match of source.matchAll(/<a\b([\s\S]*?)>/g)) {
    const attrs = match[1] || '';
    if (!/\bhref\s*=/.test(attrs)) {
      suspiciousAnchors.push({ file: rel, line: lineOf(source, match.index ?? 0), snippet: attrs.replace(/\s+/g, ' ').trim().slice(0, 180) });
    }
  }
}

const hardPlaceholders = navRefs.filter((item) => {
  const value = String(item.value || '').trim().toLowerCase();
  return value === '#' || value === '' || value.startsWith('javascript:');
});

const checkedRefs = navRefs
  .map((item) => ({ ...item, target: normalizeTarget(item.value) }))
  .filter((item) => item.target !== null && item.target !== '');

const deadRefs = checkedRefs.filter((item) => !routeExists(item.target, routeMatchers));

const uniqueDead = [...new Map(deadRefs.map((x) => [`${x.file}:${x.line}:${x.target}`, x])).values()];
const uniquePlaceholders = [...new Map(hardPlaceholders.map((x) => [`${x.file}:${x.line}:${x.value}`, x])).values()];
const uniqueSuspiciousButtons = [...new Map(suspiciousButtons.map((x) => [`${x.file}:${x.line}`, x])).values()];
const uniqueSuspiciousAnchors = [...new Map(suspiciousAnchors.map((x) => [`${x.file}:${x.line}`, x])).values()];
const uniquePlaceholderText = [...new Map(placeholders.map((x) => [`${x.file}:${x.line}:${x.value}`, x])).values()];

const lines = [];
lines.push('# Launch UI audit');
lines.push('');
lines.push(`- Pages discovered: ${routes.length}`);
lines.push(`- Source files scanned: ${sourceFiles.length}`);
lines.push(`- Literal navigation references checked: ${checkedRefs.length}`);
lines.push(`- Dead literal internal destinations: ${uniqueDead.length}`);
lines.push(`- Empty/#/javascript navigation placeholders: ${uniquePlaceholders.length}`);
lines.push(`- Potential inert type=button controls: ${uniqueSuspiciousButtons.length}`);
lines.push(`- Anchor tags without href: ${uniqueSuspiciousAnchors.length}`);
lines.push(`- Placeholder/TODO wording hits in app source: ${uniquePlaceholderText.length}`);
lines.push('');

function section(title, items, render) {
  lines.push(`## ${title}`);
  lines.push('');
  if (!items.length) lines.push('- None');
  else for (const item of items) lines.push(`- ${render(item)}`);
  lines.push('');
}

section('Dead internal destinations', uniqueDead, (x) => `\`${x.file}:${x.line}\` → \`${x.target}\` (${x.kind})`);
section('Navigation placeholders', uniquePlaceholders, (x) => `\`${x.file}:${x.line}\` → \`${x.value || '(empty)'}\``);
section('Potential inert type=button controls', uniqueSuspiciousButtons, (x) => `\`${x.file}:${x.line}\` → \`${x.snippet}\``);
section('Anchor tags without href', uniqueSuspiciousAnchors, (x) => `\`${x.file}:${x.line}\` → \`${x.snippet}\``);
section('Placeholder wording', uniquePlaceholderText, (x) => `\`${x.file}:${x.line}\` → \`${x.value}\``);
section('Discovered page routes', routes.sort((a,b) => a.route.localeCompare(b.route)).map((x) => x), (x) => `\`${x.route}\` ← \`${toPosix(path.relative(ROOT, x.file))}\``);

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
console.log(lines.slice(0, 9).join('\n'));
console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);

if (uniqueDead.length || uniquePlaceholders.length) {
  console.error('Launch UI audit failed: dead destinations or navigation placeholders found.');
  process.exit(1);
}
