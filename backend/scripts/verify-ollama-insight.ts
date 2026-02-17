
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { llmService } from '../src/services/llmProvider';
import { AIProviderType } from '../src/types/ai';

async function verifyOllamaInsight() {
    console.log('--- Verifying Ollama Insight Generation ---');

    // Check if Ollama is enabled in env
    const isOllamaEnabled = process.env.OLLAMA_ENABLED === 'true';
    console.log(`OLLAMA_ENABLED: ${isOllamaEnabled}`);

    const specificModel = 'gpt-oss:20b-cloud';
    console.log(`Testing with specific model: ${specificModel}`);

    try {
        const response = await llmService.generateResponse(
            [
                { role: 'system', content: 'You are a test assistant.' },
                { role: 'user', content: 'Say "Ollama is working" followed by the model name you are using.' }
            ],
            {
                model: specificModel,
                maxTokens: 50,
                temperature: 0.1
            }
        );

        console.log('\n--- Response Received ---');
        console.log(`Provider: ${response.provider}`);
        console.log(`Model Used: ${response.model}`);
        console.log(`Content: ${response.content}`);

        if (response.provider === 'Ollama' || response.provider.toLowerCase().includes('ollama')) {
            console.log('\n✅ SUCCESS: Request was handled by Ollama as expected.');
        } else {
            console.log('\n⚠️ PARTIAL SUCCESS: Request was handled, but by ' + response.provider);
            console.log('This means the Smart Fallback is working, but Ollama might not be the primary choice or failed.');
        }

    } catch (error: any) {
        console.error('\n❌ FAILED:', error.message);
        if (error.message.includes('connect')) {
            console.log('Hint: Is Ollama running? (run `ollama serve`)');
        }
    }
}

verifyOllamaInsight();
