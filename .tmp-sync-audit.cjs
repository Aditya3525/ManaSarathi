const fs = require('fs');
const path = require('path');

const root = process.cwd();
const serverPath = path.join(root, 'backend/src/server.ts');
const apiClientPath = path.join(root, 'frontend/src/services/api.ts');
const frontendSrc = path.join(root, 'frontend/src');

const serverText = fs.readFileSync(serverPath, 'utf8');

const importMap = new Map();
for (const m of serverText.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"](\.\/routes\/[^'"]+)['"];/g)) {
  importMap.set(m[1], m[2]);
}

const mountPoints = [];
for (const m of serverText.matchAll(/app\.use\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_]+)\s*\)/g)) {
  const [, prefix, varName] = m;
  if (!importMap.has(varName)) continue;
  mountPoints.push({ prefix, varName, rel: importMap.get(varName) });
}

function normSlash(s) {
  return s.replace(/\\/g, '/').replace(/\/+/g, '/');
}

function toRouteRegex(routePattern) {
  const esc = routePattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:[A-Za-z0-9_]+/g, '[^/]+');
  return new RegExp(`^${esc}$`);
}

const backendRoutes = [];

// Recursively collect routes from a route file and any nested router.use imports
function collectRoutesFromFile(routeFilePath, mountPrefix) {
  const seen = new Set();

  function processFile(filePath, prefix) {
    const key = `${filePath}::${prefix}`;
    if (seen.has(key)) return;
    seen.add(key);

    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');

    // Collect direct route declarations in this file
    for (const m of content.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"]([^'\"]+)['"]/g)) {
      const method = m[1].toUpperCase();
      const localPath = m[2];
      const fullPath = normSlash(`${mountPrefix}${prefix}/${localPath}`);
      backendRoutes.push({ method, path: fullPath.replace(/\/$/, '') || '/' });
    }

    // Map imports in this file so we can resolve nested router.use(...) imports
    const localImportMap = new Map();
    for (const im of content.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"](\.\/[^'\"]+)['"];?/g)) {
      localImportMap.set(im[1], im[2]);
    }

    // Find nested router.use calls and recurse into imported route modules
    for (const u of content.matchAll(/router\.use\(\s*['"]([^'\"]+)['"]\s*,\s*([A-Za-z0-9_]+)\s*\)/g)) {
      const nestedPrefix = u[1];
      const varName = u[2];
      const rel = localImportMap.get(varName);
      if (!rel) continue;
      // Resolve nested file path relative to current file
      const nestedPath = path.join(path.dirname(filePath), rel.replace('./', '') + '.ts');
      processFile(nestedPath, normSlash(`${prefix}/${nestedPrefix}`));
    }
  }

  processFile(routeFilePath, '');
}

for (const mount of mountPoints) {
  const routeFile = path.join(root, 'backend/src', mount.rel.replace('./', '') + '.ts');
  collectRoutesFromFile(routeFile, mount.prefix);
}

const frontendRoutes = [];
const apiText = fs.readFileSync(apiClientPath, 'utf8');
for (const m of apiText.matchAll(/request(?:Blob)?(?:<[^>]+>)?\(\s*`([^`]+)`|request(?:Blob)?(?:<[^>]+>)?\(\s*['"]([^'\"]+)['"]/g)) {
  let raw = (m[1] || m[2] || '').trim();
  if (!raw.startsWith('/')) continue;
  // Strip query string for route-only comparison
  const pathOnly = raw.split('?')[0];
  // Normalize template placeholders like `${id}` or `{id}` into a param marker
  let paramNormalized = pathOnly.replace(/\$\{[^}]+\}/g, ':param').replace(/\{[^}]+\}/g, ':param');
  // Ensure a slash before a param token when missing (e.g. 'templates:param' -> 'templates/:param')
  paramNormalized = paramNormalized.replace(/([^\/])(:param)/g, '$1/:param');
  // Avoid double '/api' prefix: keep existing '/api' paths as-is, otherwise add it
  const normalized = normSlash((paramNormalized.startsWith('/api') ? paramNormalized : `/api${paramNormalized}`)).replace(/\/$/, '');
  frontendRoutes.push({ source: 'api.ts', path: normalized, raw });
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

for (const file of walk(frontendSrc)) {
  if (file.endsWith('services/api.ts')) continue;
  const t = fs.readFileSync(file, 'utf8');
    for (const m of t.matchAll(/\/api\/[A-Za-z0-9_:\/\-{}$?=&.]+/g)) {
    const raw = m[0];
    const pathOnly = raw.split('?')[0];
    let paramNormalized = pathOnly.replace(/\$\{[^}]+\}/g, ':param').replace(/\{[^}]+\}/g, ':param');
    paramNormalized = paramNormalized.replace(/([^\/])(:param)/g, '$1/:param');
    frontendRoutes.push({ source: path.relative(root, file), path: normSlash(paramNormalized).replace(/\/$/, ''), raw });
  }
}

const dedupe = (arr) => {
  const seen = new Set();
  const out = [];
  for (const r of arr) {
    const key = `${r.method || 'ANY'} ${r.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
};

const backend = dedupe(backendRoutes);
const frontend = dedupe(frontendRoutes.map(r => ({ method: 'ANY', ...r })));

function matches(fePath, bePath) {
  const regexMatch = toRouteRegex(bePath).test(fePath);
  if (regexMatch) return true;

  // Fallback: normalize param names to a canonical ':param' token and compare strings
  const norm = (p) => p.replace(/:[A-Za-z0-9_]+/g, ':param').replace(/\$\{[^}]+\}/g, ':param').replace(/\{[^}]+\}/g, ':param').replace(/\/+/g, '/').replace(/\/$/, '');
  try {
    return norm(fePath) === norm(bePath);
  } catch (e) {
    return false;
  }
}

// Also include any top-level app.* routes from server.ts (e.g., app.get('/api/health'))
for (const m of serverText.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'\"]+)['"]/g)) {
  const method = m[1].toUpperCase();
  const p = m[2];
  backend.push({ method, path: normSlash(p).replace(/\/$/, '') || '/' });
}

// If a frontend path exactly equals a mounted prefix (e.g., '/api/chat'), consider it matched
const mountPrefixes = mountPoints.map(mp => mp.prefix.replace(/\/$/, ''));

const unmatchedFrontend = [];
for (const fe of frontend) {
  let ok = backend.some(be => matches(fe.path, be.path));
  if (!ok) {
    const feNorm = fe.path.replace(/\/$/, '');
    for (const mp of mountPrefixes) {
      if (feNorm === mp || feNorm.startsWith(mp + '/')) {
        ok = true;
        break;
      }
    }
  }
  if (!ok) unmatchedFrontend.push(fe);
}

console.log(`backend_routes=${backend.length}`);
console.log(`frontend_paths=${frontend.length}`);
console.log(`unmatched_frontend_paths=${unmatchedFrontend.length}`);
for (const u of unmatchedFrontend.slice(0, 120)) {
  console.log(`UNMATCHED ${u.path} [${u.source}]`);
}
