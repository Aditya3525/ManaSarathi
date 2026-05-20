import assert from 'assert';

const originalEnv = {
  AI_PROVIDER_PRIORITY: process.env.AI_PROVIDER_PRIORITY,
  AI_ENABLE_FALLBACK: process.env.AI_ENABLE_FALLBACK,
  HUGGINGFACE_API_KEY_1: process.env.HUGGINGFACE_API_KEY_1,
  GEMINI_API_KEY_1: process.env.GEMINI_API_KEY_1,
  NVIDIA_API_KEY_1: process.env.NVIDIA_API_KEY_1,
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN: process.env.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN,
  AI_PROVIDER_COOLDOWN_MS: process.env.AI_PROVIDER_COOLDOWN_MS
};

try {
  process.env.HUGGINGFACE_API_KEY_1 = 'hf_test_key';
  process.env.GEMINI_API_KEY_1 = 'g_test_key';
  delete process.env.NVIDIA_API_KEY_1;
  delete process.env.NVIDIA_API_KEY;
  process.env.AI_PROVIDER_PRIORITY = 'huggingface,gemini,ollama';
  delete process.env.AI_ENABLE_FALLBACK;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { LLMService } = require('../services/llmProvider') as typeof import('../services/llmProvider');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AIProviderType } = require('../types/ai') as typeof import('../types/ai');

  const fallbackOnService = new LLMService();
  const fallbackOnConfig = fallbackOnService.debugConfig();
  const fallbackOnOrder = fallbackOnService.debugProvidersToTry();
  assert.strictEqual(fallbackOnConfig.fallbackEnabled, true, 'Fallback should be enabled by default');
  assert.ok(fallbackOnOrder.length >= 1, 'At least one provider should be available');
  if (fallbackOnOrder.length >= 2) {
    assert.deepStrictEqual(fallbackOnOrder.slice(0, 2), ['huggingface', 'gemini'], 'Provider priority should honor configured order');
  }

  process.env.AI_ENABLE_FALLBACK = 'false';
  const fallbackOffService = new LLMService();
  const fallbackOffOrder = fallbackOffService.debugProvidersToTry();
  assert.deepStrictEqual(fallbackOffOrder.length, 1, 'When fallback is disabled only one provider should be attempted');
  assert.strictEqual(fallbackOffOrder[0], fallbackOnOrder[0], 'Primary provider should remain the same when fallback disabled');
  assert.strictEqual(fallbackOffService.debugConfig().fallbackEnabled, false, 'Fallback config flag should be false');

  process.env.AI_ENABLE_FALLBACK = 'true';
  process.env.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN = '1';
  process.env.AI_PROVIDER_COOLDOWN_MS = '60000';
  const cooldownService = new LLMService();
  cooldownService.debugMarkProviderFailure(AIProviderType.HUGGINGFACE, { forceCooldown: true });
  const cooldownOrder = cooldownService.debugProvidersToTry();
  assert.ok(!cooldownOrder.includes(AIProviderType.HUGGINGFACE), 'Cooling down provider should be skipped in priority list');

  console.log('✅ LLM fallback configuration tests passed');
} finally {
  if (originalEnv.AI_PROVIDER_PRIORITY === undefined) {
    delete process.env.AI_PROVIDER_PRIORITY;
  } else {
    process.env.AI_PROVIDER_PRIORITY = originalEnv.AI_PROVIDER_PRIORITY;
  }
  if (originalEnv.AI_ENABLE_FALLBACK === undefined) {
    delete process.env.AI_ENABLE_FALLBACK;
  } else {
    process.env.AI_ENABLE_FALLBACK = originalEnv.AI_ENABLE_FALLBACK;
  }
  if (originalEnv.HUGGINGFACE_API_KEY_1 === undefined) {
    delete process.env.HUGGINGFACE_API_KEY_1;
  } else {
    process.env.HUGGINGFACE_API_KEY_1 = originalEnv.HUGGINGFACE_API_KEY_1;
  }
  if (originalEnv.GEMINI_API_KEY_1 === undefined) {
    delete process.env.GEMINI_API_KEY_1;
  } else {
    process.env.GEMINI_API_KEY_1 = originalEnv.GEMINI_API_KEY_1;
  }
  if (originalEnv.NVIDIA_API_KEY_1 === undefined) {
    delete process.env.NVIDIA_API_KEY_1;
  } else {
    process.env.NVIDIA_API_KEY_1 = originalEnv.NVIDIA_API_KEY_1;
  }
  if (originalEnv.NVIDIA_API_KEY === undefined) {
    delete process.env.NVIDIA_API_KEY;
  } else {
    process.env.NVIDIA_API_KEY = originalEnv.NVIDIA_API_KEY;
  }
  if (originalEnv.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN === undefined) {
    delete process.env.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN;
  } else {
    process.env.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN = originalEnv.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN;
  }
  if (originalEnv.AI_PROVIDER_COOLDOWN_MS === undefined) {
    delete process.env.AI_PROVIDER_COOLDOWN_MS;
  } else {
    process.env.AI_PROVIDER_COOLDOWN_MS = originalEnv.AI_PROVIDER_COOLDOWN_MS;
  }
}
