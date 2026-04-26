const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const backendRoot = path.join(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

dotenv.config({ path: envPath });

const localSchemaPath = path.join(backendRoot, 'prisma', 'schema.local.prisma');
const baseSchemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');

const ensureLocalSchema = () => {
  if (fs.existsSync(localSchemaPath)) return;
  const base = fs.readFileSync(baseSchemaPath, 'utf8');
  const local = base.replace('provider = "postgresql"', 'provider = "sqlite"');
  fs.writeFileSync(localSchemaPath, local, 'utf8');
};

const databaseUrl = (process.env.DATABASE_URL || '').trim();
const isSqlite = databaseUrl.startsWith('file:') || databaseUrl.includes('sqlite');

if (databaseUrl.startsWith('file:')) {
  const rawPath = databaseUrl.slice('file:'.length);
  if (rawPath.startsWith('./') || rawPath.startsWith('../')) {
    const absolute = path.resolve(backendRoot, rawPath).replace(/\\/g, '/');
    process.env.DATABASE_URL = `file:${absolute}`;
  }
}

if (isSqlite) {
  ensureLocalSchema();
}

const schema = isSqlite ? 'prisma/schema.local.prisma' : 'prisma/schema.prisma';
const modeLabel = isSqlite ? 'local-sqlite' : 'postgresql';

const resolveGeneratedSchemaPath = () => {
  const candidates = [
    path.join(backendRoot, 'node_modules', '.prisma', 'client', 'schema.prisma'),
    path.join(backendRoot, '..', 'node_modules', '.prisma', 'client', 'schema.prisma')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};

const resolveGeneratedWasmPath = () => {
  const candidates = [
    path.join(backendRoot, 'node_modules', '.prisma', 'client', 'wasm.js'),
    path.join(backendRoot, '..', 'node_modules', '.prisma', 'client', 'wasm.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};

const parseSchemaProvider = (schemaText) => {
  const providerMatch = schemaText.match(/datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"/);
  return providerMatch ? providerMatch[1] : null;
};

const parseWasmActiveProvider = (wasmText) => {
  const activeProviderMatch = wasmText.match(/"activeProvider"\s*:\s*"([^"]+)"/);
  return activeProviderMatch ? activeProviderMatch[1] : null;
};

const normalizeForCompare = (value) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

const shouldGenerateClient = () => {
  const sourceSchemaPath = path.join(backendRoot, schema);
  const generatedSchemaPath = resolveGeneratedSchemaPath();
  const generatedWasmPath = resolveGeneratedWasmPath();

  if (!fs.existsSync(sourceSchemaPath)) return true;
  if (!generatedSchemaPath) return true;
  if (!generatedWasmPath) return true;

  const sourceSchemaRaw = fs.readFileSync(sourceSchemaPath, 'utf8');
  const sourceSchema = normalizeForCompare(sourceSchemaRaw);
  const generatedSchema = normalizeForCompare(fs.readFileSync(generatedSchemaPath, 'utf8'));
  const generatedWasm = fs.readFileSync(generatedWasmPath, 'utf8');

  const sourceProvider = parseSchemaProvider(sourceSchemaRaw);
  const generatedWasmProvider = parseWasmActiveProvider(generatedWasm);

  if (!sourceProvider || !generatedWasmProvider) {
    return true;
  }

  if (sourceProvider !== generatedWasmProvider) {
    return true;
  }

  return sourceSchema !== generatedSchema;
};

const action = process.argv[2];
const actionMap = {
  generate: ['generate', '--schema', schema],
  generateIfNeeded: ['generate', '--schema', schema],
  push: ['db', 'push', '--skip-generate', '--schema', schema],
  migrateDev: ['migrate', 'dev', '--schema', schema],
  migrateDeploy: ['migrate', 'deploy', '--schema', schema]
};

if (!action || !actionMap[action]) {
  console.error('Usage: node scripts/prisma-auto.cjs <generate|generateIfNeeded|push|migrateDev|migrateDeploy>');
  process.exit(1);
}

console.log(`[prisma-auto] mode=${modeLabel} schema=${schema}`);

const resolvePrismaCliScript = () => {
  const candidates = [
    path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js'),
    path.join(backendRoot, '..', 'node_modules', 'prisma', 'build', 'index.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};

const prismaCliScript = resolvePrismaCliScript();
if (!prismaCliScript) {
  console.error('[prisma-auto] Prisma CLI script not found. Run npm install first.');
  process.exit(1);
}

console.log(`[prisma-auto] cli=${prismaCliScript}`);

if (action === 'generateIfNeeded') {
  const needsGenerate = shouldGenerateClient();
  if (!needsGenerate) {
    console.log('[prisma-auto] generate skipped (client schema already up to date).');
    process.exit(0);
  }

  console.log('[prisma-auto] generate required (schema changed or client missing).');
}

const args = actionMap[action];

const result = spawnSync(process.execPath, [prismaCliScript, ...args], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'inherit',
  shell: false
});

if (result.error) {
  console.error(`[prisma-auto] failed to execute: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
