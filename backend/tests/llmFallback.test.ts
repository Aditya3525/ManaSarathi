import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIProviderType } from '../src/types/ai';

const ORIGINAL_ENV = { ...process.env };

function clearProviderEnv() {
  // Ensure tests are deterministic regardless of developer machine env vars.
  const keysToClear = [
    'GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
    'NVIDIA_API_KEY', 'NVIDIA_API_KEY_1', 'NVIDIA_API_KEY_2', 'NVIDIA_API_KEY_3',
    'HUGGINGFACE_API_KEY_1', 'HUGGINGFACE_API_KEY_2', 'HUGGINGFACE_API_KEY', 'HF_TOKEN',
    'OPENAI_API_KEY_1', 'OPENAI_API_KEY_2', 'OPENAI_API_KEY_3',
    'ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2',
    'OLLAMA_ENABLED',
  ];
  for (const key of keysToClear) {
    // Use empty string instead of delete to reliably override any inherited env.
    (process.env as any)[key] = '';
  }
}

async function createService() {
  // Reload the module so environment updates apply.
  const module = await import('../src/services/llmProvider');
  return new module.LLMService();
}

const enableHuggingFace = () => {
  process.env.HUGGINGFACE_API_KEY_1 = 'hf_test_key';
};

const enableGemini = () => {
  process.env.GEMINI_API_KEY_1 = 'gm_test_key';
};

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  clearProviderEnv();
  delete (process.env as any).AI_PROVIDER_PRIORITY;
});

describe('LLMService fallback priority', () => {
  it('prefers providers that are both enabled and healthy', async () => {
    process.env.AI_PROVIDER_PRIORITY = `${AIProviderType.GEMINI},${AIProviderType.HUGGINGFACE}`;
    enableGemini();
    enableHuggingFace();

    const service = await createService();
    const providersToTry = service.debugProvidersToTry();

    expect(providersToTry).toEqual([
      AIProviderType.GEMINI,
      AIProviderType.HUGGINGFACE
    ]);
  }, { timeout: 20000 });

  it('skips providers without API credentials even if prioritised', async () => {
    process.env.AI_PROVIDER_PRIORITY = `${AIProviderType.HUGGINGFACE},${AIProviderType.GEMINI}`;
    enableGemini();

    const service = await createService();
    const providersToTry = service.debugProvidersToTry();

    expect(providersToTry).toEqual([AIProviderType.GEMINI]);
  }, { timeout: 20000 });

  it('drops providers that enter cooldown windows', async () => {
    process.env.AI_PROVIDER_PRIORITY = `${AIProviderType.HUGGINGFACE}`;
    enableHuggingFace();
    process.env.AI_PROVIDER_MAX_FAILURES_BEFORE_COOLDOWN = '1';
    process.env.AI_PROVIDER_COOLDOWN_MS = '1';

    const service = await createService();

    expect(service.debugProvidersToTry()).toEqual([AIProviderType.HUGGINGFACE]);

    service.debugMarkProviderFailure(AIProviderType.HUGGINGFACE, { forceCooldown: true });

    expect(service.debugProvidersToTry()).toEqual([]);
  });

  it('returns local fallback when all providers are cooling down in dev mode', async () => {
    process.env.AI_PROVIDER_PRIORITY = `${AIProviderType.HUGGINGFACE}`;
    process.env.AI_LOCAL_FALLBACK_ENABLED = 'true';
    enableHuggingFace();

    const service = await createService();

    service.debugMarkProviderFailure(AIProviderType.HUGGINGFACE, { forceCooldown: true });
    expect(service.debugProvidersToTry()).toEqual([]);

    const response = await service.generateResponse([
      { role: 'user', content: 'Hello there' }
    ]);

    expect(response.provider).toBe('local-dev-fallback');
    expect(response.model).toBe('local-dev-fallback');
    expect(response.content).toContain('Local development mode is active');
  });

  it('returns local fallback when all eligible providers fail at runtime in dev mode', async () => {
    process.env.AI_LOCAL_FALLBACK_ENABLED = 'true';

    const service = await createService();
    const fakeProvider = {
      name: 'fake-provider',
      isAvailable: vi.fn().mockResolvedValue(true),
      generateResponse: vi.fn().mockRejectedValue(new Error('simulated provider failure')),
      testConnection: vi.fn().mockResolvedValue(true)
    };

    const svc = service as any;
    svc.providers = new Map([[AIProviderType.GEMINI, fakeProvider]]);
    svc.providerPriority = [AIProviderType.GEMINI];
    svc.providerState = new Map([
      [AIProviderType.GEMINI, { failureCount: 0, cooldownUntil: null }]
    ]);

    const response = await service.generateResponse([
      { role: 'user', content: 'Can you help me with stress?' }
    ]);

    expect(fakeProvider.isAvailable).toHaveBeenCalledTimes(1);
    expect(fakeProvider.generateResponse).toHaveBeenCalledTimes(1);
    expect(response.provider).toBe('local-dev-fallback');
    expect(response.model).toBe('local-dev-fallback');
  });

  it('caches provider availability checks between consecutive responses', async () => {
    process.env.AI_PROVIDER_AVAILABILITY_CACHE_MS = '600000';

    const service = await createService();
    const fakeProvider = {
      name: 'fake-provider',
      isAvailable: vi.fn().mockResolvedValue(true),
      generateResponse: vi.fn().mockResolvedValue({
        content: 'steady response',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        model: 'fake-model',
        provider: 'fake-provider',
        success: true,
        processingTime: 1,
      }),
      testConnection: vi.fn().mockResolvedValue(true)
    };

    const svc = service as any;
    svc.providers = new Map([[AIProviderType.GEMINI, fakeProvider]]);
    svc.providerPriority = [AIProviderType.GEMINI];
    svc.providerState = new Map([
      [AIProviderType.GEMINI, { failureCount: 0, cooldownUntil: null }]
    ]);

    const first = await service.generateResponse([{ role: 'user', content: 'first' }]);
    const second = await service.generateResponse([{ role: 'user', content: 'second' }]);

    expect(first.content).toBeTruthy();
    expect(second.content).toBeTruthy();
    expect(fakeProvider.isAvailable).toHaveBeenCalledTimes(1);
    expect(fakeProvider.generateResponse).toHaveBeenCalledTimes(2);
  });
});

afterAll(() => {
  process.env = { ...ORIGINAL_ENV };
});
