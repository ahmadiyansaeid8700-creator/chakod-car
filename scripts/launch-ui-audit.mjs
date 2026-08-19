import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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
  /(?:این\s*(?:بخش|صفحه|قابلیت|امکان)|بخش|صفحه)\s+در\s*حال\s*ساخت/,
  />\s*در\s*حال\s*ساخت\s*</,
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

function scriptKind(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (file.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function jsxNameText(name) {
  if (ts.isIdentifier(name)) return name.text;
  return name.getText();
}

function jsxAttributeMap(attributes) {
  const map = new Map();
  for (const property of attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    map.set(property.name.getText(), property);
  }
  return map;
}

function staticJsxString(attribute) {
  if (!attribute?.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    ts.isStringLiteral(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return null;
}

function scanJsxControls(file, source, suspiciousButtons, suspiciousAnchors) {
  const rel = toPosix(path.relative(ROOT, file));
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = jsxNameText(node.tagName);
      const attrs = jsxAttributeMap(node.attributes);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

      if (tagName === 'button') {
        const type = staticJsxString(attrs.get('type'));
        const hasHandler = ['onClick', 'onPointerDown', 'onMouseDown', 'onKeyDown', 'onSubmit', 'formAction']
          .some((name) => attrs.has(name));
        const disabled = attrs.has('disabled');
        if (type === 'button' && !hasHandler && !disabled) {
          suspiciousButtons.push({
            file: rel,
            line,
            snippet: node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 220),
          });
        }
      }

      if ((tagName === 'a' || tagName === 'Link') && !attrs.has('href')) {
        suspiciousAnchors.push({
          file: rel,
          line,
          snippet: node.getText(sourceFile).replace(/\s+/g, ' ').slice(0, 220),
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
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
  addMatch(navRefs, rel, source, /(?:router\.(?:push|replace)|redirect|permanentRedirect)\(\s*["']([^"']*)["']/g, 'navigation-call');

  for (const pattern of PLACEHOLDER_TEXT) {
    const match = source.match(pattern);
    if (match?.index != null) placeholders.push({ file: rel, line: lineOf(source, match.index), value: match[0] });
  }

  scanJsxControls(file, source, suspiciousButtons, suspiciousAnchors);
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
lines.push(`- Anchor/Link tags without href: ${uniqueSuspiciousAnchors.length}`);
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
section('Anchor/Link tags without href', uniqueSuspiciousAnchors, (x) => `\`${x.file}:${x.line}\` → \`${x.snippet}\``);
section('Placeholder wording', uniquePlaceholderText, (x) => `\`${x.file}:${x.line}\` → \`${x.value}\``);
section('Discovered page routes', routes.sort((a,b) => a.route.localeCompare(b.route)).map((x) => x), (x) => `\`${x.route}\` ← \`${toPosix(path.relative(ROOT, x.file))}\``);

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
console.log(lines.slice(0, 10).join('\n'));
console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);

if (
  uniqueDead.length ||
  uniquePlaceholders.length ||
  uniqueSuspiciousButtons.length ||
  uniqueSuspiciousAnchors.length ||
  uniquePlaceholderText.length
) {
  console.error('Launch UI audit failed: unresolved navigation, controls, or placeholder wording found.');
  process.exit(1);
}
