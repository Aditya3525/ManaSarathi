/**
 * Chatbot Response Test
 * Tests whether the chatbot is generating responses correctly
 */

import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { chatService } from './src/services/chatService';
import { logger } from './src/utils/logger';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();
const testLogger = logger.child({ module: 'ChatbotTest' });

interface TestUser {
  id: string;
  email: string;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
}

async function createTestUser(): Promise<TestResult> {
  try {
    testLogger.info('Creating test user...');
    
    const testUser = await prisma.user.findUnique({
      where: { email: 'test-chatbot@example.com' }
    });

    if (testUser) {
      testLogger.info('Using existing test user');
      return {
        success: true,
        message: 'Test user found',
        data: testUser
      };
    }

    const newUser = await prisma.user.create({
      data: {
        email: 'test-chatbot@example.com',
        name: 'Test Chatbot User',
        password: 'test-password-hash',
        isEmailVerified: true,
        approach: 'hybrid',
        language: 'en'
      }
    });

    testLogger.info('Test user created successfully');
    return {
      success: true,
      message: 'Test user created',
      data: newUser
    };
  } catch (error: any) {
    testLogger.error({ err: error }, 'Failed to create/find test user');
    return {
      success: false,
      message: `Failed to create test user: ${error.message}`
    };
  }
}

async function testChatbotResponse(userId: string): Promise<TestResult> {
  try {
    testLogger.info('Testing chatbot response generation...');
    
    const testMessage = 'I am feeling anxious about my upcoming presentation tomorrow.';
    
    console.log('\n📝 Test Message:', testMessage);
    console.log('⏱️  Processing...\n');
    
    const startTime = Date.now();
    
    // Generate response using chatService
    const response = await chatService.generateAIResponse(
      userId,
      testMessage,
      undefined,
      undefined,
      { simpleLanguage: false }
    );

    const processingTime = Date.now() - startTime;

    if (!response || !response.botMessage) {
      return {
        success: false,
        message: 'No response generated from chatbot'
      };
    }

    const botReply = response.botMessage?.content || response.response || '';
    
    return {
      success: true,
      message: 'Chatbot response generated successfully',
      data: {
        userMessage: testMessage,
        botReply: botReply,
        provider: response.provider || 'unknown',
        model: response.model || 'unknown',
        processingTime: `${processingTime}ms`,
        tokens: response.usage,
        recommendations: response.recommendations?.items?.length ?? 0,
        context: {
          conversationId: response.conversationId,
          approach: response.context,
          sentiment: response.botMessage?.metadata?.sentiment
        }
      }
    };

  } catch (error: any) {
    testLogger.error({ err: error }, 'Chatbot response generation failed');
    return {
      success: false,
      message: `Chatbot test failed: ${error.message}`,
      data: {
        errorStack: error.stack
      }
    };
  }
}

async function runTests() {
  console.log('\n🤖 Chatbot Response Test Suite\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Create/Find test user
    console.log('\n[1/2] Setting up test user...');
    const userResult = await createTestUser();
    
    if (!userResult.success) {
      console.error('❌ User setup failed:', userResult.message);
      process.exit(1);
    }

    const testUser = userResult.data as TestUser;
    console.log('✅ User ready:', testUser.email);
    console.log('   ID:', testUser.id);

    // Step 2: Test chatbot response
    console.log('\n[2/2] Testing chatbot response generation...');
    const chatResult = await testChatbotResponse(testUser.id);

    console.log('\n' + '═'.repeat(60));
    
    if (chatResult.success) {
      console.log('\n✅ SUCCESS! Chatbot is responding correctly\n');
      console.log('─'.repeat(60));
      console.log('Response Details:');
      console.log(`  User Message: "${chatResult.data?.userMessage}"`);
      console.log(`\n  Bot Response: "${chatResult.data?.botReply}"`);
      console.log(`\n  Provider: ${chatResult.data?.provider}`);
      console.log(`  Model: ${chatResult.data?.model}`);
      console.log(`  Processing Time: ${chatResult.data?.processingTime}`);
      
      if (chatResult.data?.tokens) {
        console.log(`\n  Token Usage:`);
        console.log(`    Prompt: ${chatResult.data.tokens.prompt_tokens}`);
        console.log(`    Completion: ${chatResult.data.tokens.completion_tokens}`);
        console.log(`    Total: ${chatResult.data.tokens.total_tokens}`);
      }

      if (chatResult.data?.recommendations > 0) {
        console.log(`\n  Recommendations Generated: ${chatResult.data.recommendations}`);
      }

      console.log(`\n  Context:`);
      console.log(`    Conversation ID: ${chatResult.data?.context?.conversationId || 'N/A'}`);
      console.log(`    Approach: ${chatResult.data?.context?.approach || 'N/A'}`);
      console.log(`    Sentiment: ${chatResult.data?.context?.sentiment || 'N/A'}`);
      
      console.log('─'.repeat(60) + '\n');
      
    } else {
      console.log('\n❌ FAILED! Chatbot is not responding\n');
      console.log('─'.repeat(60));
      console.log('Error:', chatResult.message);
      
      if (chatResult.data?.errorStack) {
        console.log('\nStack Trace:');
        console.log(chatResult.data.errorStack);
      }
      
      console.log('─'.repeat(60) + '\n');
      
      // Provide troubleshooting steps
      console.log('💡 Troubleshooting steps:');
      console.log('  1. Check if LLM providers are configured in .env');
      console.log('  2. Verify AI_PROVIDER_PRIORITY setting');
      console.log('  3. Check database connectivity (PostgreSQL/SQLite)');
      console.log('  4. Review backend logs for detailed errors\n');
      
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the tests
runTests();
