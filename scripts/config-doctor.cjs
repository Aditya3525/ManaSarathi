const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendEnvPath = path.join(rootDir, 'backend', '.env');
const frontendEnvPath = path.join(rootDir, 'frontend', '.env.local');

const PLACEHOLDER_RE = /(replace_with|your[_-]|placeholder|changeme|example|username:password@localhost|dev-fallback-secret)/i;

function readEnvMap(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  const map = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    const inlineCommentIndex = value.indexOf(' #');
    if (inlineCommentIndex >= 0) {
      value = value.slice(0, inlineCommentIndex).trim();
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }

    map[key] = value;
  }

  return map;
}

function isTruthy(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function isConfigured(value) {
  if (!value) return false;
  return !PLACEHOLDER_RE.test(value);
}

function hasAnyConfigured(envMap, keys) {
  return keys.some((key) => isConfigured(envMap[key]));
}

function printCheck(status, title, detail) {
  const icon = status === 'PASS' ? '[PASS]' : status === 'WARN' ? '[WARN]' : '[FAIL]';
  console.log(`${icon} ${title}`);
  if (detail) {
    console.log(`       ${detail}`);
  }
}

function run() {
  const checks = [];
  const backendEnv = readEnvMap(backendEnvPath);
  const frontendEnv = readEnvMap(frontendEnvPath);

  checks.push({
    status: backendEnv ? 'PASS' : 'FAIL',
    title: 'Backend environment file',
    detail: backendEnv ? 'backend/.env found.' : 'backend/.env is missing. Run: npm run setup:env'
  });

  checks.push({
    status: frontendEnv ? 'PASS' : 'FAIL',
    title: 'Frontend environment file',
    detail: frontendEnv ? 'frontend/.env.local found.' : 'frontend/.env.local is missing. Run: npm run setup:env'
  });

  if (backendEnv) {
    const jwtSecret = backendEnv.JWT_SECRET || '';
    const sessionSecret = backendEnv.SESSION_SECRET || '';
    const databaseUrl = backendEnv.DATABASE_URL || '';
    const frontendUrl = backendEnv.FRONTEND_URL || '';
    const backendUrl = backendEnv.BACKEND_URL || '';

    checks.push({
      status: isConfigured(jwtSecret) && jwtSecret.length >= 24 ? 'PASS' : 'FAIL',
      title: 'JWT secret',
      detail: isConfigured(jwtSecret) && jwtSecret.length >= 24
        ? 'JWT_SECRET is set.'
        : 'Set JWT_SECRET to a strong random value (24+ chars).'
    });

    checks.push({
      status: isConfigured(sessionSecret) && sessionSecret.length >= 24 ? 'PASS' : 'FAIL',
      title: 'Session secret',
      detail: isConfigured(sessionSecret) && sessionSecret.length >= 24
        ? 'SESSION_SECRET is set.'
        : 'Set SESSION_SECRET to a strong random value (24+ chars).'
    });

    checks.push({
      status: databaseUrl ? 'PASS' : 'FAIL',
      title: 'Database URL',
      detail: databaseUrl
        ? `DATABASE_URL configured (${databaseUrl.startsWith('file:') ? 'SQLite local mode' : 'network database mode'}).`
        : 'Set DATABASE_URL in backend/.env.'
    });

    checks.push({
      status: frontendUrl ? 'PASS' : 'WARN',
      title: 'Frontend URL',
      detail: frontendUrl
        ? `FRONTEND_URL=${frontendUrl}`
        : 'FRONTEND_URL is not set. OAuth callback fallback may be wrong.'
    });

    checks.push({
      status: backendUrl ? 'PASS' : 'WARN',
      title: 'Backend URL',
      detail: backendUrl
        ? `BACKEND_URL=${backendUrl}`
        : 'BACKEND_URL is not set. OAuth callback URL will rely on defaults.'
    });

    const googleClientId = backendEnv.GOOGLE_CLIENT_ID || '';
    const googleClientSecret = backendEnv.GOOGLE_CLIENT_SECRET || '';
    const googleConfigured = isConfigured(googleClientId) && isConfigured(googleClientSecret);

    checks.push({
      status: googleConfigured ? 'PASS' : 'WARN',
      title: 'Google OAuth credentials',
      detail: googleConfigured
        ? 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.'
        : 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for Google login.'
    });

    const openAiConfigured = hasAnyConfigured(backendEnv, ['OPENAI_API_KEY_1', 'OPENAI_API_KEY_2', 'OPENAI_API_KEY_3']);
    const geminiConfigured = hasAnyConfigured(backendEnv, ['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3']);
    const anthropicConfigured = hasAnyConfigured(backendEnv, ['ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2']);
    const huggingFaceConfigured = hasAnyConfigured(backendEnv, ['HUGGINGFACE_API_KEY_1', 'HUGGINGFACE_API_KEY_2', 'HUGGINGFACE_API_KEY', 'HF_TOKEN']);
    const ollamaEnabled = isTruthy(backendEnv.OLLAMA_ENABLED, false);
    const localFallback = isTruthy(backendEnv.AI_LOCAL_FALLBACK_ENABLED, true);

    const externalProviders = [
      openAiConfigured ? 'OpenAI' : null,
      geminiConfigured ? 'Gemini' : null,
      anthropicConfigured ? 'Anthropic' : null,
      huggingFaceConfigured ? 'HuggingFace' : null
    ].filter(Boolean);

    if (externalProviders.length > 0) {
      checks.push({
        status: 'PASS',
        title: 'AI provider keys',
        detail: `Configured: ${externalProviders.join(', ')}`
      });
    } else if (ollamaEnabled) {
      checks.push({
        status: 'PASS',
        title: 'AI provider keys',
        detail: 'No cloud keys found, but OLLAMA_ENABLED=true so local Ollama can serve chat responses.'
      });
    } else if (localFallback) {
      checks.push({
        status: 'PASS',
        title: 'AI provider keys',
        detail: 'No AI provider keys configured; local development fallback is enabled.'
      });
    } else {
      checks.push({
        status: 'FAIL',
        title: 'AI provider keys',
        detail: 'No AI providers configured and AI_LOCAL_FALLBACK_ENABLED is disabled.'
      });
    }
  }

  if (frontendEnv) {
    const apiUrl = frontendEnv.VITE_API_URL || '';
    checks.push({
      status: apiUrl ? 'PASS' : 'FAIL',
      title: 'Frontend API URL',
      detail: apiUrl ? `VITE_API_URL=${apiUrl}` : 'Set VITE_API_URL in frontend/.env.local.'
    });
  }

  console.log('ManaSarathi Configuration Doctor');
  console.log('--------------------------------');
  for (const check of checks) {
    printCheck(check.status, check.title, check.detail);
  }

  const failCount = checks.filter((check) => check.status === 'FAIL').length;
  const warnCount = checks.filter((check) => check.status === 'WARN').length;

  console.log('--------------------------------');
  console.log(`Summary: ${checks.length} checks, ${failCount} fail, ${warnCount} warn.`);

  if (failCount > 0) {
    process.exitCode = 1;
  }
}

run();
