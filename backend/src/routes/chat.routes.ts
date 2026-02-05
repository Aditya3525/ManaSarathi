import { Router } from 'express';
import { generateChatResponse } from '../services/aiService';

const router = Router();

router.post('/message', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    const reply = await generateChatResponse(message);
    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;