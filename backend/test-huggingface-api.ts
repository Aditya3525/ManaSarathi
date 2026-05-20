/**
 * HuggingFace API Key Test Script
 * Tests whether the HuggingFace API key is working correctly
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { HfInference } from '@huggingface/inference';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
console.log(`📂 Loading .env from: ${envPath}`);
console.log(`📂 File exists: ${fs.existsSync(envPath)}`);

dotenv.config({ path: envPath });

// Verify key is loaded
if (process.env.HUGGINGFACE_API_KEY_1) {
  console.log('✅ .env file loaded successfully\n');
} else {
  console.log('⚠️  .env file loaded but HUGGINGFACE_API_KEY_1 not found\n');
}

const apiKey = process.env.HUGGINGFACE_API_KEY_1;
const model = process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.2-1B-Instruct';
const maxTokens = parseInt(process.env.HUGGINGFACE_MAX_TOKENS || '600', 10);
const temperature = parseFloat(process.env.HUGGINGFACE_TEMPERATURE || '0.6');

console.log('\n🧪 HuggingFace API Key Test\n');
console.log('─'.repeat(50));
console.log('Configuration:');
console.log(`  API Key: ${apiKey ? `${apiKey.slice(0, 10)}...${apiKey.slice(-5)}` : '❌ NOT SET'}`);
console.log(`  Model: ${model}`);
console.log(`  Max Tokens: ${maxTokens}`);
console.log(`  Temperature: ${temperature}`);
console.log('─'.repeat(50) + '\n');

async function testConnection() {
  if (!apiKey) {
    console.error('❌ HUGGINGFACE_API_KEY_1 is not set in .env file');
    process.exit(1);
  }

  try {
    console.log('🔌 Initializing HuggingFace Inference client...');
    const hf = new HfInference(apiKey);

    console.log('📝 Sending test request to HuggingFace API...\n');
    
    const startTime = Date.now();
    
    const response = await hf.chatCompletion({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond briefly.'
        },
        {
          role: 'user',
          content: 'Say hello in one sentence.'
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const processingTime = Date.now() - startTime;

    console.log('✅ SUCCESS! API Key is working correctly\n');
    console.log('─'.repeat(50));
    console.log('Response:');
    console.log(`  Status: ✅ Connected`);
    console.log(`  Model: ${response.model || 'N/A'}`);
    console.log(`  Processing Time: ${processingTime}ms`);
    console.log(`  Output: "${response.choices[0]?.message?.content?.trim()}"`);
    
    if (response.usage) {
      console.log(`\n  Token Usage:`);
      console.log(`    Prompt: ${response.usage.prompt_tokens}`);
      console.log(`    Completion: ${response.usage.completion_tokens}`);
      console.log(`    Total: ${response.usage.total_tokens}`);
    }
    
    console.log('─'.repeat(50) + '\n');
    
    process.exit(0);

  } catch (error: any) {
    console.error('❌ FAILED! API Key is not working\n');
    console.log('─'.repeat(50));
    console.log('Error Details:');
    console.log(`  Code: ${error.code || 'N/A'}`);
    console.log(`  Status: ${error.status || 'N/A'}`);
    console.log(`  Message: ${error.message}`);
    
    if (error.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('unauthorized') || msg.includes('401')) {
        console.log('\n  ⚠️  Likely Issue: Invalid or expired API key');
        console.log('  💡 Solution: Check your HuggingFace API key in .env file');
      } else if (msg.includes('rate limit') || msg.includes('quota')) {
        console.log('\n  ⚠️  Likely Issue: Rate limit or quota exceeded');
        console.log('  💡 Solution: Wait a while before retrying or upgrade plan');
      } else if (msg.includes('model not found')) {
        console.log('\n  ⚠️  Likely Issue: Model does not exist or is not accessible');
        console.log(`  💡 Solution: Verify model "${model}" exists on HuggingFace`);
      } else if (msg.includes('connection') || msg.includes('timeout')) {
        console.log('\n  ⚠️  Likely Issue: Network/Connection problem');
        console.log('  💡 Solution: Check internet connection or HuggingFace service status');
      }
    }
    
    console.log('─'.repeat(50) + '\n');
    process.exit(1);
  }
}

// Run the test
testConnection();
