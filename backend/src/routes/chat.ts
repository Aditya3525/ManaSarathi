import express from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendMessageSchema, getChatHistorySchema } from '../api/validators/chat.validator';
import { conversationController } from '../controllers/conversationController';
import {
  sendMessage,
  getChatHistory,
  getChatInsights,
  getAIHealthCheck,
  testAIProviders,
  getConversationMemory,
  getConversationSummary,
  getConversationStarters,
  getProactiveCheckIn,
  getMoodBasedGreeting,
  getExerciseRecommendations,
  submitFeedback,
  submitMoodCheck,
  clearMemory,
  streamMessage
} from '../controllers/chatController';

const router = express.Router();

router.use(authenticate as any);
router.post('/message', validate(sendMessageSchema), sendMessage as any);
router.post('/stream', validate(sendMessageSchema), streamMessage as any);
router.get('/history', validate(getChatHistorySchema), getChatHistory as any);
router.get('/insights', getChatInsights as any);
router.get('/ai/health', getAIHealthCheck as any);
router.get('/ai/test', testAIProviders as any);
router.get('/memory/:userId', getConversationMemory as any);
router.get('/summary/:userId', getConversationSummary as any);
router.get('/starters', getConversationStarters as any);
router.get('/check-in', getProactiveCheckIn as any);
router.get('/greeting', getMoodBasedGreeting as any);
// Compatibility alias for clients expecting conversations under /api/chat.
router.get('/conversations', conversationController.getConversations as any);
router.post('/exercises', getExerciseRecommendations as any);
router.put('/message/:messageId/feedback', submitFeedback as any);
router.post('/mood-check', submitMoodCheck as any);
router.delete('/memory', clearMemory as any);

export default router;
