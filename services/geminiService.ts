import { GoogleGenAI } from "@google/genai";
import { PlayerStats } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

export const generateGameCommentary = async (stats: PlayerStats, won: boolean): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return "GG! (Enable API Key for AI commentary)";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    
    const prompt = `
      You are a high-energy, retro 90s arcade announcer (like NBA Jam or Street Fighter).
      The player just finished a round of "PixelVoid.io".
      
      Stats:
      - Rank: ${stats.rank}
      - Score: ${stats.score}
      - Objects Consumed: ${Math.floor(stats.score / 10)}
      - Result: ${won ? "VICTORY" : "DEFEAT"}
      
      Give a SHORT, punchy, 1-2 sentence comment on their performance. 
      If they won, hype them up. If they lost, roast them gently but encourage a replay.
      Use arcade slang.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 60,
        temperature: 0.9,
      }
    });

    return response.text || "GAME OVER! INSERT COIN.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "CONNECTION LOST... BUT THE VOID REMAINS.";
  }
};
