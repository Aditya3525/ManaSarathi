import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

const hf = new HfInference(process.env.HF_TOKEN);

export const generateChatResponse = async (userMessage: string) => {
  try {
    const response = await hf.chatCompletion({
      model: "meta-llama/Llama-3.2-1B-Instruct",
      messages: [
        { 
          role: "system", 
          content: "You are MaanaSarathi, a supportive and empathetic mental health companion. Provide helpful, non-diagnostic guidance." 
        },
        { role: "user", content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("Failed to fetch AI response");
  }
};