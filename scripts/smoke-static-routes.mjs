import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) {
  console.error('Usage: node scripts/smoke-static-routes.mjs http://127.0.0.1:4173');
  process.exit(2);
}

const root = process.cwd();
const app = path.join(root, 'app');
const pageNames = new Set(['page.tsx', 'page.ts', 'page.jsx', 'page.js']);
const skip = new Set(['/logout']);

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

function routeFor(file) {
  const relative = path.relative(app, path.dirname(file)).split(path.sep).join('/');
  if (!relative || relative === '.') return '/';
  const segments = relative.split('/').filter(Boolean).filter((segment) => {
    if (segment.startsWith('(') && segment.endsWith(')')) return false;
    if (segment.startsWith('@')) return false;
    return true;
  });
  return '/' + segments.join('/');
}

const routes = [...new Set(
  walk(app)
    .filter((file) => pageNames.has(path.basename(file)))
    .map(routeFor)
    .filter((route) => !route.includes('['))
    .filter((route) => !skip.has(route)),
)].sort();

const failures = [];
const results = [];
for (const route of routes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(new URL(route, base), {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    const ok = response.status >= 200 && response.status < 400;
    const location = response.headers.get('location') || '';
    results.push({ route, status: response.status, location });
    if (!ok) failures.push({ route, status: response.status, location });
  } catch (error) {
    failures.push({ route, status: 'network-error', location: '', error: error instanceof Error ? error.message : String(error) });
  } finally {
    clearTimeout(timer);
  }
}

console.log(`Static runtime pages checked: ${routes.length}`);
for (const item of results) {
  console.log(`OK ${item.status} ${item.route}${item.location ? ` -> ${item.location}` : ''}`);
}

if (failures.length) {
  console.error('Static runtime page failures:');
  for (const item of failures) console.error(JSON.stringify(item));
  process.exit(1);
}
