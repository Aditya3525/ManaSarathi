const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const backendEnvPath = path.join(rootDir, 'backend', '.env');
const backendExamplePath = path.join(rootDir, 'backend', '.env.example');
const frontendEnvPath = path.join(rootDir, 'frontend', '.env.local');
const frontendExamplePath = path.join(rootDir, 'frontend', '.env.example');

const PLACEHOLDER_RE = /(replace_with|your[_-]|placeholder|changeme|example|username:password@localhost|localhost:5432\/mental_wellbeing_db|dev-fallback-secret)/i;

function createSecret(label) {
  return `${label}_${crypto.randomBytes(32).toString('hex')}`;
}

function stripInlineComment(value) {
  const hashIndex = value.indexOf(' #');
  if (hashIndex >= 0) {
    return value.slice(0, hashIndex).trim();
  }
  return value.trim();
}

function unquote(value) {
  const trimmed = stripInlineComment(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function shouldTreatAsPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_RE.test(value);
}

function ensureFileFromExample(targetPath, examplePath) {
  if (fs.existsSync(targetPath)) return;

  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, targetPath);
    return;
  }

  fs.writeFileSync(targetPath, '', 'utf8');
}

function updateEnvFile(filePath, entries) {
  const original = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.length > 0 ? original.split(/\r?\n/) : [];

  const keyToIndex = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) {
      keyToIndex.set(match[1], i);
    }
  }

  let added = 0;
  let updated = 0;

  for (const entry of entries) {
    const { key, value, shouldReplace } = entry;
    const index = keyToIndex.get(key);

    if (typeof index === 'number') {
      const rawValue = lines[index].split('=').slice(1).join('=');
      const currentValue = unquote(rawValue);

      if (shouldReplace(currentValue)) {
        lines[index] = `${key}=${value}`;
        updated += 1;
      }

      continue;
    }

    lines.push(`${key}=${value}`);
    keyToIndex.set(key, lines.length - 1);
    added += 1;
  }

  const normalized = `${lines.join(newline).replace(/[\r\n]+$/, '')}${newline}`;
  if (normalized !== original) {
    fs.writeFileSync(filePath, normalized, 'utf8');
  }

  return { added, updated };
}

function backendEntry(key, value, options = {}) {
  const shouldReplace = options.shouldReplace || ((current) => shouldTreatAsPlaceholder(current));
  return { key, value, shouldReplace };
}

function frontendEntry(key, value) {
  return {
    key,
    value,
    shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current)
  };
}

function run() {
  ensureFileFromExample(backendEnvPath, backendExamplePath);
  ensureFileFromExample(frontendEnvPath, frontendExamplePath);

  const backendDefaults = [
    backendEntry('NODE_ENV', 'development', { shouldReplace: (current) => !current || /^(development|dev)$/i.test(current) }),
    backendEntry('PORT', '5000', { shouldReplace: (current) => !current || current === '5000' }),
    backendEntry('BACKEND_URL', 'http://localhost:5000'),
    backendEntry('FRONTEND_URL', 'http://localhost:5173', { shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) || /^https?:\/\/localhost:3000$/i.test(current) }),
    backendEntry('MOBILE_URL', 'http://localhost:8081'),
    backendEntry('LOG_LEVEL', 'info'),
    backendEntry('DATABASE_URL', 'file:./prisma/dev.db'),
    backendEntry('JWT_SECRET', createSecret('jwt'), {
      shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) || current.length < 24 || /dev|local/i.test(current)
    }),
    backendEntry('SESSION_SECRET', createSecret('session'), {
      shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) || current.length < 24 || /dev|local/i.test(current)
    }),
    backendEntry('JWT_EXPIRE', '7d'),
    backendEntry('RATE_LIMIT_WINDOW_MS', '900000'),
    backendEntry('RATE_LIMIT_MAX_REQUESTS', '100'),
    backendEntry('AI_LOCAL_FALLBACK_ENABLED', 'true', { shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) }),
    backendEntry('AI_ENABLE_FALLBACK', 'true', { shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) }),
    backendEntry('AI_PROVIDER_PRIORITY', 'gemini,huggingface,openai,anthropic,ollama', { shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) }),
    backendEntry('OLLAMA_BASE_URL', 'http://localhost:11434'),
    backendEntry('OLLAMA_MODEL', 'llama3'),
    backendEntry('OLLAMA_ENABLED', 'false', { shouldReplace: (current) => !current || shouldTreatAsPlaceholder(current) })
  ];

  const frontendDefaults = [
    frontendEntry('VITE_API_URL', 'http://localhost:5000/api')
  ];

  const backendResult = updateEnvFile(backendEnvPath, backendDefaults);
  const frontendResult = updateEnvFile(frontendEnvPath, frontendDefaults);

  console.log('Local environment bootstrap complete.');
  console.log(`- backend/.env: added ${backendResult.added}, updated ${backendResult.updated}`);
  console.log(`- frontend/.env.local: added ${frontendResult.added}, updated ${frontendResult.updated}`);
  console.log('Note: add real GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET and at least one AI provider key for live integrations.');
}

run();
